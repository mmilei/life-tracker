import type { Habit } from "@/types";
import { DeleteButton } from "@/components/common/DeleteButton";
import { StreakFlame } from "@/components/common/StreakFlame";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/store/AppStore";

interface HabitRowProps {
  habit: Habit;
  days: string[]; // the month's ISO days, in order
  streak: number;
  completion: number; // 0..1 over the month's elapsed days, see useHabits.completionRate
  isDone: (date: string) => boolean;
  onToggle: (date: string) => void;
  onDelete: () => void;
  compactFrom: string; // first day kept in a narrow container, see HabitMonthGrid
  compactTo: string; // last day kept in a narrow container (today, or month end)
}

// One habit: a sticky left label (dot + name + flame + % + delete) followed by
// a binary toggle cell per day. The label stays put while the days scroll.
//
// Day cells and their gap are hard px, NOT rem: they are a fixed-count grid (31
// columns), so scaling them with the root font size made the widest month grow
// past whatever room it had. Everything else in the app still scales, and
// HabitMonthGrid's header numbers reuse the same two constants so the columns
// line up.
//
// There is deliberately NO pixel budget written down here any more. The window
// is variable and there is no target width to compute against: the two earlier
// attempts each picked a number (1440, then 1085) and each was wrong on the
// real screen. What the grid does instead is degrade: it scrolls with the name
// column pinned and lands on today, and under a narrow container it drops to
// the last 7 days.
export function HabitRow({
  habit,
  days,
  streak,
  completion,
  isDone,
  onToggle,
  onDelete,
  compactFrom,
  compactTo,
}: HabitRowProps) {
  const t = useT();
  const today = todayISO();

  return (
    <div className="group/habit flex items-center border-t border-border/50">
      {/* Narrow container: the label drops to w-32 and gives up the streak
          flame and the percentage. Both are context, not identity, and at 224px
          the label was eating more than half of a phone-sized screen. Name and
          colour dot stay because without them the row is anonymous. */}
      <div className="sticky left-0 z-10 flex w-56 shrink-0 items-center gap-2 bg-card py-1.5 pr-3 pl-3 @max-[640px]/habits:w-32 @max-[640px]/habits:pr-1 @max-[640px]/habits:pl-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-medium">{habit.name}</span>
        <StreakFlame count={streak} className="shrink-0 @max-[640px]/habits:hidden" />
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground @max-[640px]/habits:hidden">
          {Math.round(completion * 100)}%
        </span>
        {/* Same treatment destructive actions already get in LeadBoard: hidden
            by opacity, never by display, so the button keeps its slot in the tab
            order and the row does not reflow on hover. Coarse pointers have no
            hover at all, so there it stays visible. */}
        <DeleteButton
          itemName={habit.name}
          onConfirm={onDelete}
          className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/habit:opacity-100 pointer-coarse:opacity-100 @max-[640px]/habits:ml-auto"
        />
      </div>

      <div className="flex gap-[4px] py-1.5 pl-[4px]">
        {days.map((d) => {
          const done = isDone(d);
          const future = d > today;
          const inCompact = d >= compactFrom && d <= compactTo;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggle(d)}
              aria-pressed={done}
              aria-label={
                t("habits.dayAria", { name: habit.name, date: d }) +
                (done ? ` (${t("common.completed")})` : "")
              }
              className={cn(
                // rounded-full on purpose, not rounded-md. The reference the
                // owner approved shows circles, and until now they were an
                // accident: rounded-md resolved to a radius larger than half
                // the 21px cell at the old 18px root, so the browser clamped it
                // into a circle. At 16px that same class draws a squircle. The
                // shape is a decision, so it says so.
                "size-[21px] shrink-0 rounded-full border transition-colors",
                done
                  ? "border-transparent bg-mint hover:bg-mint/90"
                  : "border-border/60 bg-muted hover:bg-accent",
                // No ring on today. A thick empty ring and a filled circle both
                // read as state, but one of them is a date and the other is
                // data. The header number already marks today in iris and
                // semibold, which is a calendar signal in a calendar place.
                future && "opacity-40",
                // Hidden, not absent: display:none drops the cell from the
                // a11y tree and collapses its flex gap, so the strip needs no
                // second array and no second DOM tree.
                !inCompact && "@max-[640px]/habits:hidden",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
