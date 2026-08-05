import type { Habit } from "@/types";
import { DeleteButton } from "@/components/common/DeleteButton";
import { StreakFlame } from "@/components/common/StreakFlame";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/store/AppStore";

interface HabitRowProps {
  habit: Habit;
  days: string[]; // the month's ISO days, in order
  streak: number;
  completion: number; // 0..1 over the month
  isDone: (date: string) => boolean;
  onToggle: (date: string) => void;
  onDelete: () => void;
}

// One habit: a sticky left label (dot + name + flame + % + delete) followed by
// a binary toggle cell per day. The label stays put while the days scroll.
export function HabitRow({
  habit,
  days,
  streak,
  completion,
  isDone,
  onToggle,
  onDelete,
}: HabitRowProps) {
  const t = useT();
  const today = todayISO();

  return (
    <div className="flex items-center border-t border-border/50">
      <div className="sticky left-0 z-10 flex w-56 shrink-0 items-center gap-2 bg-card py-1.5 pr-3">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-medium">{habit.name}</span>
        <StreakFlame count={streak} className="shrink-0" />
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {Math.round(completion * 100)}%
        </span>
        <DeleteButton itemName={habit.name} onConfirm={onDelete} className="shrink-0" />
      </div>

      <div className="flex gap-1 py-1.5 pl-1">
        {days.map((d) => {
          const done = isDone(d);
          const future = d > today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggle(d)}
              aria-pressed={done}
              aria-label={
                t("habits.dayAria", { name: habit.name, date: d }) +
                (done ? ` (${t("common.completed")})` : "")
              }
              className={cn(
                "size-7 shrink-0 rounded-md border transition-colors",
                done
                  ? "border-transparent bg-mint hover:bg-mint/90"
                  : "border-border/60 bg-transparent hover:bg-muted",
                d === today && "ring-2 ring-iris ring-offset-1 ring-offset-card",
                future && "opacity-40",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
