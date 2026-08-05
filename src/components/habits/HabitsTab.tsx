import { useAppStore, useT } from "@/store/AppStore";
import { monthDays, getLocale } from "@/lib/dates";
import { HabitMonthGrid } from "./HabitMonthGrid";
import { AddHabitDialog } from "./AddHabitDialog";

export function HabitsTab() {
  const { habits } = useAppStore();
  const t = useT();

  const now = new Date();
  const days = monthDays(now.getFullYear(), now.getMonth());
  const monthLabel = now.toLocaleDateString(getLocale(), { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("habits.title")}</h1>
        {/* first-letter, not capitalize: toLocaleDateString returns "agosto de
            2026" and capitalize would title-case the preposition too, printing
            "Agosto De 2026". English months come back capitalised already, so
            this is a no-op there. */}
        <p className="text-sm text-muted-foreground first-letter:uppercase">{monthLabel}</p>
      </header>

      {habits.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("habits.empty")}</p>
      ) : (
        <HabitMonthGrid
          habits={habits.habits}
          days={days}
          streaks={habits.streaks}
          isDone={habits.isDone}
          toggleLog={habits.toggleLog}
          completionRate={habits.completionRate}
          removeHabit={habits.removeHabit}
        />
      )}

      <AddHabitDialog onAdd={habits.addHabit} />
    </div>
  );
}
