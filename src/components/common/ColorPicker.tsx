import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/store/AppStore";
import { cn } from "@/lib/utils";

// Swatches: warm accent first, then a few extras so habits look distinct.
const SWATCHES = [
  "#FF6A3D", // ember
  "#FFB020", // amber
  "#3ECF8E", // mint
  "#6E7BFF", // iris
  "#E5484D", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#9AA0B4", // muted
];

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
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0])}
      spacing={2}
      className={cn("flex-wrap", className)}
    >
      {SWATCHES.map((c) => (
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
