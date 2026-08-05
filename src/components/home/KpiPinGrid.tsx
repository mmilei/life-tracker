import { useEffect, useRef, useState } from "react";
import { Flame, Star, Dumbbell, Briefcase, ListChecks, Target, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PinButton } from "@/components/common/PinButton";
import { useAppStore } from "@/store/AppStore";
import { getHighestStreak } from "@/lib/streaks";
import { todayISO, weekStart } from "@/lib/dates";

type Store = ReturnType<typeof useAppStore>;

interface Kpi {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  compute: (s: Store) => { value: string; sub?: string };
}

// Fixed KPI catalog. Each KPI derives from the store — nothing extra persisted.
const CATALOG: Kpi[] = [
  {
    id: "highest-streak",
    labelKey: "home.kpiHighestStreak",
    icon: Flame,
    compute: (s) => ({
      value: String(getHighestStreak(s.habits.logs)),
      sub: s.t("home.unitDays"),
    }),
  },
  {
    id: "week-avg",
    labelKey: "home.kpiWeekAvg",
    icon: Star,
    compute: (s) => {
      const r = s.weeklyRatings.getWeek(s.weeklyRatings.currentWeekStart);
      if (r.length === 0) return { value: "—", sub: "/10" };
      return { value: (r.reduce((a, b) => a + b.score, 0) / r.length).toFixed(1), sub: "/10" };
    },
  },
  {
    id: "workouts-week",
    labelKey: "home.kpiWorkoutsWeek",
    icon: Dumbbell,
    compute: (s) => {
      const ws = weekStart();
      return {
        value: String(s.workouts.workouts.filter((w) => w.date >= ws).length),
        sub: s.t("home.unitThisWeek"),
      };
    },
  },
  {
    id: "active-leads",
    labelKey: "home.kpiActiveLeads",
    icon: Briefcase,
    compute: (s) => ({ value: String(s.notes.leads.length), sub: s.t("home.unitLeads") }),
  },
  {
    id: "today-habits",
    labelKey: "home.kpiTodayHabits",
    icon: ListChecks,
    compute: (s) => {
      const t = todayISO();
      const done = s.habits.habits.filter((h) => s.habits.isDone(h.id, t)).length;
      return { value: `${done}/${s.habits.habits.length}`, sub: s.t("home.unitToday") };
    },
  },
  {
    id: "active-habits",
    labelKey: "home.kpiActiveHabits",
    icon: Target,
    compute: (s) => ({ value: String(s.habits.habits.length), sub: s.t("home.unitHabits") }),
  },
];

// Default board: one KPI per domain tab, so Home resume las 4 tabs de un vistazo.
const DEFAULT_IDS = ["highest-streak", "week-avg", "workouts-week", "active-leads"];
const kpiById = (id: string) => CATALOG.find((k) => k.id === id);

export function KpiPinGrid() {
  const store = useAppStore();
  const { t } = store;
  const { pins, addPin, removePin, canPin } = store.homePins;
  const [editing, setEditing] = useState(false);

  // Seed the default board once on first run (empty selection) — same pattern as
  // useWeeklyRatings' Sunday pre-fill. NOTE: re-seeds if the user clears all
  // pins; acceptable for an MVP dashboard that should never be blank.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (pins.length === 0) {
      DEFAULT_IDS.forEach((id) => {
        const k = kpiById(id);
        if (k) addPin({ type: k.id, refId: k.id, label: t(k.labelKey) });
      });
    }
  }, [pins.length, addPin, t]);

  const pinned = pins
    .map((p) => ({ pin: p, kpi: kpiById(p.type) }))
    .filter((x): x is { pin: (typeof pins)[number]; kpi: Kpi } => x.kpi !== undefined);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.indicators")}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? t("common.done") : t("common.edit")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {pinned.map(({ pin, kpi }) => {
          const { value, sub } = kpi.compute(store);
          const Icon = kpi.icon;
          return (
            <Card key={pin.id} size="sm" className="gap-1 px-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-4" />
                <span className="truncate text-xs font-medium">{t(kpi.labelKey)}</span>
                {editing && (
                  <PinButton
                    pinned
                    label={t(kpi.labelKey)}
                    onToggle={() => removePin(pin.id)}
                    className="ml-auto"
                  />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
                {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
              </div>
            </Card>
          );
        })}
        {pinned.length === 0 && !editing && (
          <p className="col-span-2 text-sm text-muted-foreground lg:col-span-4">
            {t("home.noPins")}
          </p>
        )}
      </div>

      {editing && (
        <ul className="flex flex-col gap-1">
          {CATALOG.map((kpi) => {
            const isPinned = pins.some((p) => p.type === kpi.id);
            const Icon = kpi.icon;
            return (
              <li
                key={kpi.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm ring-1 ring-border/50"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="truncate">{t(kpi.labelKey)}</span>
                <PinButton
                  pinned={isPinned}
                  disabled={!canPin}
                  label={t(kpi.labelKey)}
                  onToggle={() => {
                    if (isPinned) {
                      const p = pins.find((x) => x.type === kpi.id);
                      if (p) removePin(p.id);
                    } else {
                      addPin({ type: kpi.id, refId: kpi.id, label: t(kpi.labelKey) });
                    }
                  }}
                  className="ml-auto"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
