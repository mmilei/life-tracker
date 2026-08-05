import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore, useT } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { monthDays, getLocale } from "@/lib/dates";
import { HabitMonthGrid } from "./HabitMonthGrid";
import { HabitHeatmap } from "./HabitHeatmap";
import { AddHabitDialog } from "./AddHabitDialog";

export function HabitsTab() {
  const { habits } = useAppStore();
  const t = useT();

  // The visible month, navigable independently of "today". Defaults to the
  // current month; today's own cell keeps its ring only when this IS the
  // current month (see HabitRow/HabitMonthGrid, unaffected by navigation).
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const shiftMonth = (delta: number) =>
    setVisibleMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const days = monthDays(visibleMonth.year, visibleMonth.month);
  const prevDate = new Date(visibleMonth.year, visibleMonth.month - 1, 1);
  const prevMonthDays = monthDays(prevDate.getFullYear(), prevDate.getMonth());
  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1).toLocaleDateString(getLocale(), {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("habits.title")}</h1>
          {/* first-letter, not capitalize: toLocaleDateString returns "agosto de
              2026" and capitalize would title-case the preposition too, printing
              "Agosto De 2026". English months come back capitalised already, so
              this is a no-op there. */}
          <p className="text-sm text-muted-foreground first-letter:uppercase">{monthLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t("habits.prevMonth")} onClick={() => shiftMonth(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("habits.nextMonth")} onClick={() => shiftMonth(1)}>
            <ChevronRight />
          </Button>
        </div>
      </header>

      {habits.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("habits.empty")}</p>
      ) : (
        <HabitMonthGrid
          habits={habits.habits}
          days={days}
          prevMonthDays={prevMonthDays}
          streaks={habits.streaks}
          isDone={habits.isDone}
          toggleLog={habits.toggleLog}
          completionRate={habits.completionRate}
          removeHabit={habits.removeHabit}
        />
      )}

      <HabitHeatmap
        habits={habits.habits}
        isDone={habits.isDone}
        weeksToShow={53}
        picker
        title={t("habits.heatmapTitle")}
      />

      <AddHabitDialog onAdd={habits.addHabit} />
    </div>
  );
}
