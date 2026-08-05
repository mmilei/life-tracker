import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/types";
import { Card } from "@/components/ui/card";
import { addDays, getLocale, todayISO, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/store/AppStore";

interface HabitHeatmapProps {
  habits: Habit[];
  isDone: (habitId: string, date: string) => boolean;
  weeksToShow: number; // week-columns to render, always ending on the current week
  picker?: boolean; // "total" vs one habit selector (D2, full year); D4's compact view omits it
  title: string;
}

// GitHub-contributions-style: one square per day, grouped into week columns,
// a 5-step color ramp from empty to fully done. Settled visual reference, not
// reinterpreted here. Shared by the full-year view (habits tab) and the
// compact last-N-weeks view (home tab) via `weeksToShow` and `picker`.
const LEVELS = ["bg-muted", "bg-mint/25", "bg-mint/50", "bg-mint/75", "bg-mint"];

function levelFor(done: number, total: number): number {
  if (total === 0 || done === 0) return 0;
  const ratio = done / total;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function buildWeeks(weeksToShow: number): string[][] {
  const endWeekStart = weekStart(); // Sunday of the current week
  const cols: string[][] = [];
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const colStart = addDays(endWeekStart, -7 * w);
    cols.push(Array.from({ length: 7 }, (_, i) => addDays(colStart, i)));
  }
  return cols;
}

export function HabitHeatmap({ habits, isDone, weeksToShow, picker = false, title }: HabitHeatmapProps) {
  const t = useT();
  const [filter, setFilter] = useState("total");
  const today = todayISO();

  // Guard against a filter pointing at a habit that got deleted since it was
  // picked: isDone would just return false for it forever (a flat, misleading
  // empty grid) instead of crashing, but falling back to "total" is honest.
  useEffect(() => {
    if (filter !== "total" && !habits.some((h) => h.id === filter)) setFilter("total");
  }, [habits, filter]);

  const weeks = useMemo(() => buildWeeks(weeksToShow), [weeksToShow]);

  // Month label above the first week-column of each new month, GitHub style.
  const monthLabels = useMemo(
    () =>
      weeks.map((col, i) => {
        const d = new Date(col[0] + "T00:00:00");
        if (i === 0) return d.toLocaleDateString(getLocale(), { month: "short" });
        const prev = new Date(weeks[i - 1][0] + "T00:00:00");
        return d.getMonth() !== prev.getMonth()
          ? d.toLocaleDateString(getLocale(), { month: "short" })
          : "";
      }),
    [weeks],
  );

  if (habits.length === 0) return null;

  function countFor(date: string): { done: number; total: number } {
    if (filter === "total") return { done: habits.filter((h) => isDone(h.id, date)).length, total: habits.length };
    return { done: isDone(filter, date) ? 1 : 0, total: 1 };
  }

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {picker && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t("habits.heatmapFilterAria")}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="total">{t("habits.heatmapTotal")}</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((col, i) => (
          <div key={col[0]} className="flex flex-col gap-[3px]">
            <span className="block h-3 text-[9px] leading-3 text-muted-foreground">{monthLabels[i]}</span>
            {col.map((d) => {
              const { done, total } = countFor(d);
              const future = d > today;
              return (
                <div
                  key={d}
                  title={future ? undefined : `${d}: ${done}/${total}`}
                  className={cn("size-[10px] rounded-[2px]", future ? "invisible" : LEVELS[levelFor(done, total)])}
                />
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
