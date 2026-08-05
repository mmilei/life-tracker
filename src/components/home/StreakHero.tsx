import { motion } from "motion/react";
import { useAppStore } from "@/store/AppStore";
import { StreakFlame } from "@/components/common/StreakFlame";
import { getHighestStreak } from "@/lib/streaks";
import { todayISO } from "@/lib/dates";

// Adapted from KokonutUI's Apple Activity Card: its hardcoded MOVE/EXERCISE/STAND
// rings are replaced by a single ring of today's habit-completion %, Ember→Amber
// (the "heat" metaphor), with StreakFlame at the center. Reuses only the SVG ring math.
const SIZE = 200;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

export function StreakHero() {
  const { habits, t } = useAppStore();
  const today = todayISO();

  const total = habits.habits.length;
  const done = habits.habits.filter((h) => habits.isDone(h.id, today)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const highest = getHighestStreak(habits.logs);

  const offset = ((100 - pct) / 100) * CIRCUMFERENCE;

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: SIZE, height: SIZE }}>
      <svg
        className="-rotate-90"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label={t("home.todayHabitsAria", { pct })}
      >
        <defs>
          <linearGradient id="streak-hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6A3D" />
            <stop offset="100%" stopColor="#FFB020" />
          </linearGradient>
        </defs>
        <circle
          className="text-muted/40"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#streak-hero-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,106,61,0.35))" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <StreakFlame count={highest} />
        <span className="font-display text-4xl font-semibold tabular-nums leading-none">
          {pct}%
        </span>
        <span className="text-xs text-muted-foreground">
          {total === 0 ? t("home.noHabitsShort") : t("home.doneToday", { done, total })}
        </span>
      </div>
    </div>
  );
}
