import { formatDayLong, todayISO } from "@/lib/dates";
import { useAppStore } from "@/store/AppStore";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { StreakHero } from "./StreakHero";
import { KpiPinGrid } from "./KpiPinGrid";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import { TodayChecklist } from "./TodayChecklist";
import { LeadSourcesCard } from "./LeadSourcesCard";
import { BackupControls } from "./BackupControls";
import { GitHubSyncPanel } from "./GitHubSyncPanel";

// Home dashboard: summary of the other 4 tabs. Today's streak, pinned
// indicators (up to 4), week snapshot, and today's habit checklist.
export function HomeTab() {
  const { habits, t } = useAppStore();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
        {/* first-letter, not capitalize: CSS capitalize uppercases every word, so
            a Spanish date came out "5 De Agosto" instead of "5 de agosto". */}
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatDayLong(todayISO())}
        </p>
      </header>

      <StreakHero />
      <KpiPinGrid />

      {/* Three summary panels in one band. Last on purpose: the week rating and
          today's habits are what the owner opens the app for, the lead mix is
          context. At two columns it would leave a hole in the second row, so it
          takes the full width there and only becomes a third column at lg. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WeeklySummaryCard />
        <TodayChecklist />
        <LeadSourcesCard />
      </div>

      {/* Last ~14 weeks, no picker: a glance at total daily completion, not
          the full-year per-habit breakdown that lives on the Habits tab. */}
      <HabitHeatmap
        habits={habits.habits}
        isDone={habits.isDone}
        weeksToShow={14}
        title={t("home.heatmapTitle")}
      />

      <BackupControls />
      <GitHubSyncPanel />
    </div>
  );
}
