import { useState } from "react";
import { Home, ListChecks, CalendarDays, Dumbbell, Briefcase } from "lucide-react";
import { AppStoreProvider, useT } from "@/store/AppStore";
import { Sidebar, type NavItem } from "@/components/common/Sidebar";
import { HomeTab } from "@/components/home/HomeTab";
import { WeekTab } from "@/components/week/WeekTab";
import { HabitsTab } from "@/components/habits/HabitsTab";
import { WorkoutTab } from "@/components/workout/WorkoutTab";
import { BusinessTab } from "@/components/business/BusinessTab";

const TABS: NavItem[] = [
  { id: "home", titleKey: "nav.home", icon: Home },
  { id: "habits", titleKey: "nav.habits", icon: ListChecks },
  { id: "week", titleKey: "nav.week", icon: CalendarDays },
  { id: "workout", titleKey: "nav.workout", icon: Dumbbell },
  { id: "business", titleKey: "nav.business", icon: Briefcase },
];

// Fallback for any tab id that doesn't match a known tab below.
// Rendered inside AppStoreProvider, so it can translate on its own.
function TabPlaceholder({ titleKey }: { titleKey: string }) {
  const t = useT();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="text-sm text-muted-foreground">{t("nav.comingSoon")}</p>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("home");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <AppStoreProvider>
      <div className="flex min-h-dvh">
        <Sidebar items={TABS} value={tab} onChange={setTab} className="sticky top-0" />
        <main className="flex-1 overflow-x-hidden px-8 py-8 lg:px-12">
          <div className="mx-auto w-full max-w-[1500px]">
            {tab === "week" ? (
              <WeekTab />
            ) : tab === "habits" ? (
              <HabitsTab />
            ) : tab === "workout" ? (
              <WorkoutTab />
            ) : tab === "business" ? (
              <BusinessTab />
            ) : tab === "home" ? (
              <HomeTab />
            ) : (
              <TabPlaceholder titleKey={active.titleKey} />
            )}
          </div>
        </main>
      </div>
    </AppStoreProvider>
  );
}

export default App;
