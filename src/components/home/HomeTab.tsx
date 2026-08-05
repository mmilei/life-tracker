import { formatDayLong, todayISO } from "@/lib/dates";
import { useT } from "@/store/AppStore";
import { StreakHero } from "./StreakHero";
import { KpiPinGrid } from "./KpiPinGrid";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import { TodayChecklist } from "./TodayChecklist";
import { LeadSourcesCard } from "./LeadSourcesCard";
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

      {/* Three summary panels in one band. Last on purpose: the week rating and
          today's habits are what the owner opens the app for, the lead mix is
          context. At two columns it would leave a hole in the second row, so it
          takes the full width there and only becomes a third column at lg. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WeeklySummaryCard />
        <TodayChecklist />
        <LeadSourcesCard />
      </div>

      <BackupControls />
      <GitHubSyncPanel />
    </div>
  );
}
