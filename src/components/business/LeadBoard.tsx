import { useMemo, useState } from "react";
import { ChevronRight, CircleDashed, TriangleAlert } from "lucide-react";
import type { LeadStage, Note } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DeleteButton } from "@/components/common/DeleteButton";
import { EditLeadDialog } from "./EditLeadDialog";
import { isOverdue, reassignStage, sourceLabel, stageLabel } from "@/lib/leads";
import { formatDayLong, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";

// Column width for a stage that has leads in it, while the board is a board.
// Empty stages get no width and collapse to their own header, and stacked
// nobody has a width at all.
// NOTE: written out in full, variant included: Tailwind scans source text, so a
// class built by interpolation is a class that never gets generated.
// rem, so it follows the root font size in index.css. w-80 is 20rem.
const COLUMN_WIDTH = "@lg/board:w-80";

// Below this container width the board stops being a board (see BOARD_LAYOUT).
// It is a CONTAINER query, not a viewport one: the sidebar collapses without the
// viewport changing a pixel, so a viewport breakpoint would be wrong in one of
// the two states. 32rem fits one full column plus a glimpse of the next; under
// that you would see a single column at a time, which is everything the kanban
// gave you, gone. So it becomes a vertical list grouped by stage instead.
const BOARD_LAYOUT =
  "flex flex-col gap-6 @lg/board:flex-row @lg/board:items-start @lg/board:gap-4 @lg/board:overflow-x-auto @lg/board:pb-2";

// The "no filter" chip value. It has to be non-empty: ToggleGroup already uses
// the empty string to mean "nothing selected", so an empty sentinel made the
// All chip impossible to re-select, and the board filtered by a source that
// does not exist. Checking it could not collide with a real source id was the
// wrong check; what mattered was the component hosting it.
const ALL_SOURCES = "__all__";

interface LeadBoardProps {
  leads: Note[];
  onUpdate: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  onRemove: (id: string) => void;
}

// One card per lead. The board is for scanning, the dialog is for reading: at
// rest a card shows only who the lead is, what is blocking it, where it came
// from and when it arrived. Contact and free text live in EditLeadDialog, one
// click away. The stage is not on the card at all: the column already says it.
//
// The card owns the surface, the column does not. The other way around, two
// leads in one column read as a single block, because the only thing drawing an
// edge around a card was a border that is transparent in the healthy case.
//
// Two problems, two different signals, both readable without reading:
//   no next step -> dashed amber edge + hollow circle. Nothing is scheduled.
//   next step overdue -> solid red edge + filled red date. It was scheduled and missed.
// Dashed/hollow vs solid/filled keeps them apart without relying on colour alone.
function LeadCard({
  lead,
  nextStage,
  today,
  onUpdate,
  onRemove,
}: {
  lead: Note;
  // The stage after this one, or undefined in the last one: a lead that closed
  // has nowhere else to go, so it gets no button rather than a disabled one.
  nextStage: LeadStage | undefined;
  today: string;
  onUpdate: LeadBoardProps["onUpdate"];
  onRemove: LeadBoardProps["onRemove"];
}) {
  const { t, leadConfig } = useAppStore();
  const details = lead.lead;
  const name = details?.name?.trim();
  // Leads created before LeadDetails existed have no name: their text is the title.
  const title = name || lead.text;
  const nextStep = details?.nextStep?.trim();
  const date = details?.nextStepDate;
  const overdue = isOverdue(date, today);
  // Free text typed before the source list existed still shows itself: that
  // fallback lives in sourceLabel, not here.
  const source = sourceLabel(leadConfig.sources, details?.source);

  return (
    <li
      className={cn(
        "group/lead rounded-lg border-l-2 bg-card p-2.5 ring-1 ring-foreground/10",
        overdue
          ? "border-solid border-destructive"
          : nextStep
            ? // Transparent, not absent: a 2px jump when a lead goes overdue
              // would shift every card under it.
              "border-transparent"
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
        {/* One tap forward instead of a stage picker. The board already groups
            by stage, so a picker on the card spent the heaviest control on the
            one thing the owner can already see. Moving backwards or skipping a
            stage is rare and lives in EditLeadDialog.
            Pill radius and xs height to sit level with the source badge. */}
        {nextStage && (
          <Button
            variant="outline"
            size="xs"
            className="rounded-full"
            onClick={() => onUpdate(lead.id, { status: nextStage.id })}
            aria-label={t("business.leadMoveTo", { name: stageLabel(nextStage, t) })}
          >
            <ChevronRight />
            {stageLabel(nextStage, t)}
          </Button>
        )}
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

// Leads grouped by pipeline stage, one column per stage. A leftover status, or
// one of a stage the user deleted, falls back into the first stage.
export function LeadBoard({ leads, onUpdate, onRemove }: LeadBoardProps) {
  const { t, leadConfig } = useAppStore();
  const { stages, sources } = leadConfig;
  const today = todayISO();
  // Board-local on purpose: a filter that survived a reload would hide leads
  // from an owner who no longer remembers turning it on.
  const [sourceFilter, setSourceFilter] = useState(ALL_SOURCES);

  // Only sources that actually have leads get a chip: an empty chip is a dead
  // button, and the seeded list is longer than what any single owner uses.
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const id = lead.lead?.source?.trim();
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return sources
      .filter((s) => counts.has(s.id))
      .map((s) => ({ id: s.id, label: s.label, count: counts.get(s.id)! }));
  }, [leads, sources]);

  const visible = useMemo(
    () =>
      sourceFilter === ALL_SOURCES
        ? leads
        : leads.filter((lead) => lead.lead?.source?.trim() === sourceFilter),
    [leads, sourceFilter],
  );

  const byStage = useMemo(() => {
    const groups: Record<string, Note[]> = Object.fromEntries(
      stages.map((s) => [s.id, [] as Note[]]),
    );
    for (const lead of visible) groups[reassignStage(lead.status, stages)].push(lead);
    return groups;
  }, [visible, stages]);

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("business.leadsEmpty")}</p>
    );
  }

  return (
    <div className="@container/board flex flex-col gap-4">
      {/* One source means one chip next to "All", a whole row that filters
          nothing. The row only earns its vertical space with two or more. */}
      {chips.length >= 2 && (
        <ToggleGroup
          value={[sourceFilter]}
          onValueChange={(v) => v.length > 0 && setSourceFilter(v[0] as string)}
          variant="outline"
          size="sm"
          className="max-w-full flex-wrap"
        >
          <ToggleGroupItem
            value={ALL_SOURCES}
            aria-label={t("business.sourceFilterAria", {
              name: t("business.sourceFilterAll"),
            })}
            // Bold on the active chip, so the selection survives a screen where
            // the muted background is hard to tell apart from the card.
            className="aria-pressed:font-semibold"
          >
            {t("business.sourceFilterAll")}
          </ToggleGroupItem>
          {chips.map((chip) => (
            <ToggleGroupItem
              key={chip.id}
              value={chip.id}
              aria-label={t("business.sourceFilterAria", { name: chip.label })}
              className="aria-pressed:font-semibold"
            >
              {chip.label}
              <span className="text-muted-foreground tabular-nums">{chip.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Wide: columns side by side, every one shrink-0 so the row overflows
          instead of squeezing the cards, with the scrollbar on this container
          rather than on the page body. Narrow: the same markup stacks into a
          vertical list, each stage its own titled section.
          Nothing here counts the stages: two of them or six lay out the same. */}
      <div className={BOARD_LAYOUT}>
        {stages.map((stage, i) => {
          const items = byStage[stage.id];
          return (
            <section
              key={stage.id}
              // The column is a region with a title, not a surface: the cards
              // are the surfaces, and a card inside a card muddies both.
              // NOTE: an empty stage gets no width in board layout, so it
              // collapses to its header and stops spending board space on
              // nothing. Stacked it is a one-line header saying "0", which is
              // worth keeping: it tells the owner the stage exists and is empty.
              className={cn(
                "flex flex-col gap-3 @lg/board:shrink-0",
                items.length > 0 && COLUMN_WIDTH,
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-foreground/10 pb-1.5">
                <h3 className="font-medium whitespace-nowrap">{stageLabel(stage, t)}</h3>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              {items.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      nextStage={stages[i + 1]}
                      today={today}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
