import { motion } from "motion/react";
import { useAppStore } from "@/store/AppStore";
import { StreakFlame } from "@/components/common/StreakFlame";
import { getHighestStreak } from "@/lib/streaks";
import { todayISO } from "@/lib/dates";

// Adapted from KokonutUI's Apple Activity Card: its hardcoded MOVE/EXERCISE/STAND
// rings are replaced by a single ring of today's habit-completion %, Ember to Amber
// (the "heat" metaphor), with StreakFlame at the center. Reuses only the SVG ring math.
// NOTE: these numbers are viewBox units, not pixels. The ring keeps the dominant
// size Home was designed around, but it gets it from a rem cap on its box instead
// of a hardcoded px width: rem because the number and caption stacked inside are
// rem-sized too, so ring and type keep the same ratio at any root font size, and
// w-full because the window is resized down to phone widths, where a fixed 225px
// ring plus padding is the entire screen. Stroke and radius are relative to VIEWBOX,
// so both stay in proportion at every rendered size without a second knob.
const VIEWBOX = 225;
const STROKE = 18;
const RADIUS = (VIEWBOX - STROKE) / 2;
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
    <div className="relative mx-auto grid aspect-square w-full max-w-[15rem] place-items-center">
      <svg
        className="size-full -rotate-90"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        aria-label={t("home.todayHabitsAria", { pct })}
      >
        <defs>
          {/* Owner preference (2026-08-05): back to the original bright pair over
              the darkened theme tokens, on this ring specifically. */}
          <linearGradient id="streak-hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6A3D" />
            <stop offset="100%" stopColor="#FFB020" />
          </linearGradient>
        </defs>
        <circle
          className="text-muted/40"
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
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
