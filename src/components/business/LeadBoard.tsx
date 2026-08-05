import { useMemo } from "react";
import { CircleDashed, TriangleAlert } from "lucide-react";
import type { Note } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { EditLeadDialog } from "./EditLeadDialog";
import { isOverdue } from "@/lib/leads";
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

// Column width for a stage that has leads in it. Empty stages get no width and
// collapse to their own header.
// NOTE: rem, so it follows the 18px root in index.css. w-80 is 20rem = 360px
// there, the top of the 340-360px the owner asked for. Do not restate it in px:
// the scale is already applied by the root font size.
const COLUMN_WIDTH = "w-80";

interface LeadBoardProps {
  leads: Note[];
  onUpdate: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  onRemove: (id: string) => void;
}

// One card per lead. The board is for scanning, the dialog is for reading: at
// rest a card shows only who the lead is, what is blocking it, where it came
// from, which stage it sits in and when it arrived. Contact and free text live
// in EditLeadDialog, one click away.
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
  const nextStep = details?.nextStep?.trim();
  const date = details?.nextStepDate;
  const overdue = isOverdue(date, today);
  const source = details?.source?.trim();

  return (
    <li
      className={cn(
        "group/lead rounded-r-md border-l-2 py-1 pl-2.5",
        overdue
          ? "border-solid border-destructive"
          : nextStep
            ? "border-transparent"
            : "border-dashed border-amber",
      )}
    >
      <div className="flex items-start gap-1">
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>

        {/* Edit and delete are hidden by opacity, never by display, so they keep
            their place in the tab order and come back on keyboard focus.
            pointer-coarse keeps them visible where hover cannot happen. */}
        <div className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/lead:opacity-100 pointer-coarse:opacity-100">
          <EditLeadDialog lead={lead} label={title} onUpdate={onUpdate} />
          <DeleteButton itemName={title} onConfirm={() => onRemove(lead.id)} />
        </div>
      </div>

      {nextStep ? (
        <p className="mt-0.5 text-xs">
          {nextStep}
          {date &&
            // TRADEOFF: only an overdue date gets the filled badge. A date four
            // months out in an alert badge reads as urgent when it is not.
            (overdue ? (
              <Badge
                variant="destructive"
                title={t("business.leadOverdue")}
                className="ml-1.5 align-text-bottom font-normal tabular-nums"
              >
                <TriangleAlert aria-label={t("business.leadOverdue")} />
                {formatDayLong(date)}
              </Badge>
            ) : (
              <span className="ml-1.5 whitespace-nowrap text-muted-foreground tabular-nums">
                {formatDayLong(date)}
              </span>
            ))}
        </p>
      ) : (
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber">
          <CircleDashed className="size-3.5 shrink-0" />
          {t("business.leadNoNextStep")}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* Native select to move stage, same choice as the workout chart picker.
            Keeps the board editable without a heavy per-row ToggleGroup. */}
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
        {source && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {source}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {formatDayLong(lead.createdAt)}
        </span>
      </div>
    </li>
  );
}

// Leads grouped by pipeline stage, one column per stage. A leftover or unknown
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
    // The board scrolls sideways, the cards never compress. Every column is
    // shrink-0, so the row overflows instead of squeezing, and overflow-x-auto
    // puts the scrollbar on this container rather than on the page body.
    // Nothing here counts the stages: two of them or nine lay out the same way.
    <div className="flex items-start gap-4 overflow-x-auto pb-2">
      {LEAD_STATUSES.map((status) => {
        const items = byStatus[status];
        return (
          <Card
            key={status}
            size="sm"
            // NOTE: an empty stage gets no width, so it collapses to its header
            // and stops spending board space on nothing.
            className={cn("shrink-0 gap-3 px-4", items.length > 0 && COLUMN_WIDTH)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium whitespace-nowrap">{t(LEAD_STATUS_KEYS[status])}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            {items.length > 0 && (
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
