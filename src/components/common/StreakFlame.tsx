import { shouldShowBadge } from "@/lib/streaks";
import { useT } from "@/store/AppStore";
import { cn } from "@/lib/utils";

// Signature element: the streak drawn as a flame with an Ember to Amber gradient
// whose glow scales with consecutive days. Only shown from 5 days (product rule),
// so it gates itself on shouldShowBadge and renders nothing below the threshold.
export function StreakFlame({ count, className }: { count: number; className?: string }) {
  const t = useT();
  if (!shouldShowBadge(count)) return null;

  // Glow gets warmer/wider as the streak grows; caps so long streaks don't blow out.
  const blur = Math.min(2 + count / 6, 8);
  const alpha = Math.min(0.4 + count / 40, 0.9);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      title={t("common.streak", { n: count })}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        style={{
          filter: `drop-shadow(0 0 ${blur}px color-mix(in srgb, var(--color-ember) ${alpha * 100}%, transparent))`,
        }}
        aria-hidden="true"
      >
        <defs>
          {/* Same tokens as the ring on Home: the two used to be the old bright
              hex pair while every bar and label beside them used the darkened
              theme colors, which is what made Home look like two palettes. */}
          <linearGradient id="streak-flame-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-ember)" />
            <stop offset="100%" stopColor="var(--color-amber)" />
          </linearGradient>
        </defs>
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="url(#streak-flame-grad)"
        />
      </svg>
      <span className="text-xs font-semibold tabular-nums text-amber">{count}</span>
    </span>
  );
}
