import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/store/AppStore";
import { cn } from "@/lib/utils";

// Shared pin toggle (parallels DeleteButton): the explicit affordance that
// replaced the mobile long-press-to-pin gesture. Pinned = ember + filled.
// Disabled when the board is full (MAX_PINS) and this KPI isn't pinned.
export function PinButton({
  pinned,
  onToggle,
  disabled,
  label,
  className,
}: {
  pinned: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      disabled={disabled && !pinned}
      aria-pressed={pinned}
      aria-label={pinned ? t("common.unpin", { name: label }) : t("common.pin", { name: label })}
      className={cn(
        pinned ? "text-ember" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Pin className={cn(pinned && "fill-current")} />
    </Button>
  );
}
