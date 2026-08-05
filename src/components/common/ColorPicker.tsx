import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/store/AppStore";
import { HABIT_COLORS } from "@/lib/seed";
import { cn } from "@/lib/utils";

// The offered swatches are the seed palette itself: one array, so what a habit is
// born with and what the user can repaint it with can never drift apart. Why those
// eight values and what they replaced is documented where they are declared.
const SWATCHES = HABIT_COLORS;

// Chip-picker for a single hex color, per the plan (ToggleGroup type single).
// Base UI ToggleGroup is always array-valued; single-select == guard the empty case.
export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  const t = useT();
  // A habit painted before this palette existed keeps its color: appending it
  // instead of dropping it means the picker still shows something selected, and
  // the user is the one who decides whether to move to a current swatch.
  const swatches = !value || SWATCHES.includes(value) ? SWATCHES : [...SWATCHES, value];
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0])}
      spacing={2}
      className={cn("flex-wrap", className)}
    >
      {swatches.map((c) => (
        <ToggleGroupItem
          key={c}
          value={c}
          aria-label={t("common.color", { color: c })}
          style={{ backgroundColor: c }}
          className="size-8 rounded-full border border-white/10 p-0 aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
        />
      ))}
    </ToggleGroup>
  );
}

export { SWATCHES };
