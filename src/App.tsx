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
        {/* Sticky positioning lives inside Sidebar now: when it opens as an
            overlay on a narrow window it has to switch to `fixed`, and a
            position class coming down as a prop would fight that. */}
        <Sidebar items={TABS} value={tab} onChange={setTab} />
        {/* No overflow-x-hidden here. With a window that gets resized across a
            wide range, hiding the overflow amputates whatever does not fit
            without a scrollbar and without any other symptom, which is exactly
            how a layout bug ships unnoticed. The two elements that are
            legitimately wider than the viewport, the lead board and the habit
            grid, scroll inside themselves. Anything else that overflows is a
            bug, and now it says so. */}
        <main className="min-w-0 flex-1 px-8 py-8 lg:px-12">
          {/* NOTE: rem, not px, so the reading column scales with the root font
              size like everything inside it. 93.75rem is a 1500px cap at the
              16px root. The cap follows the scale, it does not pin a pixel
              width.

              `@container` sits here and not on <main> on purpose: this element
              is the real content box (main's width ignores the max-width cap,
              so past 1500px it would report room that does not exist). It is
              what makes the sidebar collapse legible to the lead board and the
              habit grid, which size themselves against their container instead
              of the viewport: collapsing the rail widens this box, and their
              container queries re-evaluate. A viewport-only change would leave
              them unaware. Unnamed, so plain `@md:`-style queries anywhere
              below resolve to it. */}
          <div className="@container mx-auto w-full max-w-[93.75rem]">
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
