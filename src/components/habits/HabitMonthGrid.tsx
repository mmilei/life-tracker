import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Habit } from "@/types";
import { Card } from "@/components/ui/card";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HabitRow } from "./HabitRow";

interface HabitMonthGridProps {
  habits: Habit[];
  days: string[]; // current month's ISO days
  prevMonthDays: string[]; // previous calendar month's ISO days, for the D3 delta badge
  streaks: Record<string, number>;
  isDone: (habitId: string, date: string) => boolean;
  toggleLog: (habitId: string, date: string) => void;
  completionRate: (habitId: string, days: string[]) => number;
  removeHabit: (id: string) => void;
}

// Narrow-container behaviour lives on the `habits` container declared below and
// is written as `@max-[640px]/habits:` in this file and in HabitRow. It is a
// CONTAINER query, never a viewport one: the sidebar collapses, so the same
// window gives this card two very different widths and a viewport breakpoint
// would be wrong in one of the two states.
//
// Why 640px of container: a full month wants roughly a thousand pixels (224
// label + 31 cells + 30 gaps). Between 640 and that, the grid scrolls, which is
// the accepted design now that the name column is pinned and the view lands on
// today. Below 640 fewer than about sixteen days are on screen at once, the
// month stops reading as a month, and seven days you can see beat thirty-one
// you have to hunt for.
export function HabitMonthGrid({
  habits,
  days,
  prevMonthDays,
  streaks,
  isDone,
  toggleLog,
  completionRate,
  removeHabit,
}: HabitMonthGridProps) {
  const today = todayISO();
  const lastPrevDay = prevMonthDays[prevMonthDays.length - 1] ?? "";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLSpanElement>(null);
  const [moreRight, setMoreRight] = useState(false);

  // The narrow strip is the 7 days up to today, or the last 7 of the month when
  // today is not in it. ISO dates compare correctly as strings, so the window
  // travels to HabitRow as two bounds instead of a second array.
  const todayIdx = days.indexOf(today);
  const end = todayIdx >= 0 ? todayIdx + 1 : days.length;
  const compactFrom = days[Math.max(0, end - 7)] ?? "";
  const compactTo = days[end - 1] ?? "";
  const inCompact = (d: string) => d >= compactFrom && d <= compactTo;
  const monthKey = days[0] ?? "";

  const syncFade = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 1px of slack: fractional layout leaves a sub-pixel remainder at the end.
    setMoreRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // Land on today instead of on the 1st. Scrolling was never the complaint:
    // not seeing today was. On the 25th, mounting at scrollLeft 0 leaves the
    // only cell you came to tap off screen. Measured against the live boxes
    // rather than the cell constants so it cannot drift out of sync with them,
    // and clamped by the browser when today is near either end.
    // No animation on purpose, so prefers-reduced-motion has nothing to object
    // to: an instant starting position is not motion.
    const cell = todayRef.current;
    if (cell) {
      const delta = cell.getBoundingClientRect().left - el.getBoundingClientRect().left;
      el.scrollLeft += delta - el.clientWidth / 2;
    }

    // The scroller resizes without the window doing so (the sidebar collapses),
    // so the fade follows the element. ResizeObserver also fires on observe,
    // which covers the initial measure.
    const ro = new ResizeObserver(syncFade);
    ro.observe(el);
    return () => ro.disconnect();
    // Keyed on the month, NOT on `days`: HabitsTab rebuilds that array on every
    // render, so depending on it would re-center the scroll after every tap on
    // a cell and yank the view back from wherever the user had scrolled to.
  }, [monthKey, syncFade]);

  return (
    <Card className="@container/habits p-0">
      <div
        ref={scrollerRef}
        onScroll={syncFade}
        className={cn(
          // Thin, border-coloured scrollbar instead of the OS default: a thick
          // grey bar with arrow buttons read as a raw browser widget dropped
          // into a soft, editorial page. scrollbar-color/-width are the CSS
          // standard now (Firefox and Chromium both ship them), no plugin.
          "overflow-x-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
          // The only hint that the month continues past the edge. Applied while
          // there is something left to scroll and not before, so a grid that
          // fits does not pretend to be cut off.
          moreRight &&
            "[mask-image:linear-gradient(to_right,#000_calc(100%_-_2rem),transparent)]",
        )}
      >
        <div className="min-w-max">
          {/* Day-number header, aligned with the cells below: width, gap and
              left pad stay in px and match HabitRow's cell exactly. The label is
              the only rem-sized part left, and both rows use the same widths so
              they line up in either container size. The font is px too, so two
              digits keep fitting the 21px box if the root size ever changes. */}
          <div className="flex items-center">
            <div className="sticky left-0 z-10 w-56 shrink-0 bg-card py-1.5 @max-[640px]/habits:w-32" />
            <div className="flex gap-[4px] py-1.5 pl-[4px]">
              {days.map((d) => (
                <span
                  key={d}
                  ref={d === today ? todayRef : undefined}
                  className={cn(
                    "w-[21px] shrink-0 text-center text-[11px] tabular-nums",
                    // Today is marked here and only here: this is the calendar
                    // half of the row, so the date signal belongs on the date.
                    d === today ? "font-semibold text-iris" : "text-muted-foreground",
                    !inCompact(d) && "@max-[640px]/habits:hidden",
                  )}
                >
                  {Number(d.slice(8, 10))}
                </span>
              ))}
            </div>
          </div>

          {habits.map((h) => {
            const completion = completionRate(h.id, days);
            // No badge unless the habit already existed for the whole previous
            // month: comparing a partial or nonexistent history would just be a
            // low number wearing a delta's clothes, not a real trend.
            const hasPriorMonth = h.createdAt <= lastPrevDay;
            const delta = hasPriorMonth
              ? Math.round(completion * 100) - Math.round(completionRate(h.id, prevMonthDays) * 100)
              : null;
            return (
              <HabitRow
                key={h.id}
                habit={h}
                days={days}
                streak={streaks[h.id] ?? 0}
                completion={completion}
                delta={delta}
                isDone={(d) => isDone(h.id, d)}
                onToggle={(d) => toggleLog(h.id, d)}
                onDelete={() => removeHabit(h.id)}
                compactFrom={compactFrom}
                compactTo={compactTo}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
