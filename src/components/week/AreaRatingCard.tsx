import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { DeleteButton } from "@/components/common/DeleteButton";
import { cn } from "@/lib/utils";
import { useT } from "@/store/AppStore";
import type { LifeArea } from "@/types";

// Where the slider sits before the area has ever been rated this week.
const DEFAULT_SCORE = 5;

// Ember palette as motivation: low = ember (cold/needs heat), high = mint (done).
function scoreTone(score: number): string {
  if (score >= 8) return "text-mint";
  if (score >= 5) return "text-amber";
  return "text-ember";
}

interface AreaRatingCardProps {
  area: LifeArea;
  score?: number; // undefined = not rated yet this week
  onRate: (score: number) => void;
  onDelete: () => void;
}

export function AreaRatingCard({ area, score, onRate, onDelete }: AreaRatingCardProps) {
  const t = useT();
  const rated = score !== undefined;
  const value = score ?? DEFAULT_SCORE;

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{area.name}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-display text-lg leading-none tabular-nums",
              rated ? scoreTone(value) : "text-muted-foreground",
            )}
          >
            {rated ? value : "—"}
          </span>
          <DeleteButton itemName={area.name} onConfirm={onDelete} />
        </div>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(v) => onRate(Array.isArray(v) ? v[0] : v)}
        aria-label={t("week.rateArea", { name: area.name })}
      />
    </Card>
  );
}
