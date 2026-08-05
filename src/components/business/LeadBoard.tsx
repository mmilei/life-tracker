import { useMemo } from "react";
import { ChevronRight, CircleDashed, Mail, MessageCircle, TriangleAlert } from "lucide-react";
import type { Note } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { EditLeadDialog } from "./EditLeadDialog";
import { contactLink, isOverdue } from "@/lib/leads";
import { formatDayLong, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/store/AppStore";

// Fixed 4-stage sales pipeline for the app's owner, who works in sales. Not
// spelled out in the original spec, chosen as the simplest pipeline that fits
// the app's "leads" note type. Stored verbatim in Note.status; the first
// stage is the default.
export const LEAD_STATUSES = ["Nuevo", "Contactado", "Negociando", "Cerrado"] as const;

// The stored values above are stable ids, never translated. This maps each id to
// the i18n key used for its visible label.
export const LEAD_STATUS_KEYS: Record<(typeof LEAD_STATUSES)[number], string> = {
  Nuevo: "business.leadNew",
  Contactado: "business.leadContacted",
  Negociando: "business.leadNegotiating",
  Cerrado: "business.leadClosed",
};

interface LeadBoardProps {
  leads: Note[];
  onUpdate: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  onRemove: (id: string) => void;
}

// One card per lead. The hierarchy is the point: the name says who, the next step
// says what is blocking the deal, everything else is supporting detail.
//
// Two problems, two different signals, both readable without reading:
//   no next step -> dashed amber edge + hollow circle. Nothing is scheduled.
//   next step overdue -> solid red edge + filled red date. It was scheduled and missed.
// Dashed/hollow vs solid/filled keeps them apart without relying on colour alone.
function LeadCard({
  lead,
  status,
  today,
  onUpdate,
  onRemove,
}: {
  lead: Note;
  status: string;
  today: string;
  onUpdate: LeadBoardProps["onUpdate"];
  onRemove: LeadBoardProps["onRemove"];
}) {
  const t = useT();
  const details = lead.lead;
  const name = details?.name?.trim();
  // Leads created before LeadDetails existed have no name: their text is the title.
  const title = name || lead.text;
  const detail = name ? lead.text : "";
  const nextStep = details?.nextStep?.trim();
  const date = details?.nextStepDate;
  const overdue = isOverdue(date, today);
  const source = details?.source?.trim();
  const contact = details?.contact?.trim();
  const link = contactLink(contact);

  return (
    <li
      className={cn(
        "rounded-r-md border-l-2 py-1 pl-2.5",
        overdue
          ? "border-solid border-destructive"
          : nextStep
            ? "border-transparent"
            : "border-dashed border-amber",
      )}
    >
      <div className="flex items-start gap-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>

          {nextStep ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm font-medium">
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">{nextStep}</span>
              {date && (
                <Badge
                  variant={overdue ? "destructive" : "outline"}
                  title={overdue ? t("business.leadOverdue") : undefined}
                  className="mt-px shrink-0 font-normal tabular-nums"
                >
                  {overdue && <TriangleAlert aria-label={t("business.leadOverdue")} />}
                  {formatDayLong(date)}
                </Badge>
              )}
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-amber">
              <CircleDashed className="size-3.5 shrink-0" />
              {t("business.leadNoNextStep")}
            </p>
          )}

          {(source || contact) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {source && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {source}
                </Badge>
              )}
              {contact &&
                (link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 text-xs text-iris underline-offset-2 hover:underline"
                  >
                    {link.kind === "email" ? (
                      <Mail className="size-3 shrink-0" />
                    ) : (
                      <MessageCircle className="size-3 shrink-0" />
                    )}
                    <span className="truncate">{contact}</span>
                  </a>
                ) : (
                  // Unrecognised contact: shown as-is. A dead link is worse.
                  <span className="truncate text-xs text-muted-foreground">{contact}</span>
                ))}
            </div>
          )}

          {detail && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>}
        </div>

        <EditLeadDialog lead={lead} label={title} onUpdate={onUpdate} />
        <DeleteButton itemName={title} onConfirm={() => onRemove(lead.id)} />
      </div>

      <div className="mt-1 flex items-center gap-2">
        {/* Native select to move stage — same choice as the workout chart picker,
            keeps the board editable without a heavy per-row ToggleGroup. */}
        <select
          value={status}
          onChange={(e) => onUpdate(lead.id, { status: e.target.value })}
          aria-label={t("business.stageOf", { name: title })}
          className="h-7 rounded-lg border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(LEAD_STATUS_KEYS[s])}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{formatDayLong(lead.createdAt)}</span>
      </div>
    </li>
  );
}

// Leads grouped by pipeline stage — one card per stage, laid out as side-by-side
// kanban columns on desktop and stacked on narrower widths. A leftover/unknown
// status falls back into the first stage.
export function LeadBoard({ leads, onUpdate, onRemove }: LeadBoardProps) {
  const t = useT();
  const today = todayISO();
  const byStatus = useMemo(() => {
    const groups: Record<string, Note[]> = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, [] as Note[]]),
    );
    for (const lead of leads) {
      const status =
        lead.status && (LEAD_STATUSES as readonly string[]).includes(lead.status)
          ? lead.status
          : LEAD_STATUSES[0];
      groups[status].push(lead);
    }
    return groups;
  }, [leads]);

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("business.leadsEmpty")}</p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4 lg:items-start">
      {LEAD_STATUSES.map((status) => {
        const items = byStatus[status];
        return (
          <Card key={status} size="sm" className="gap-3 px-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t(LEAD_STATUS_KEYS[status])}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("business.stageEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    status={status}
                    today={today}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
