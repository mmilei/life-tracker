import { formatDayLong, todayISO } from "@/lib/dates";
import { useT } from "@/store/AppStore";
import { StreakHero } from "./StreakHero";
import { KpiPinGrid } from "./KpiPinGrid";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import { TodayChecklist } from "./TodayChecklist";
import { BackupControls } from "./BackupControls";
import { GitHubSyncPanel } from "./GitHubSyncPanel";

// Home dashboard: summary of the other 4 tabs — today's streak, pinned
// indicators (≤4), week snapshot, and today's habit checklist.
export function HomeTab() {
  const t = useT();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="text-sm capitalize text-muted-foreground">{formatDayLong(todayISO())}</p>
      </header>

      <StreakHero />
      <KpiPinGrid />

      <div className="grid gap-4 sm:grid-cols-2">
        <WeeklySummaryCard />
        <TodayChecklist />
      </div>

      <BackupControls />
      <GitHubSyncPanel />
    </div>
  );
}
