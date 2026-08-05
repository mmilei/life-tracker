import type { Habit } from "@/types";
import { Card } from "@/components/ui/card";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HabitRow } from "./HabitRow";

interface HabitMonthGridProps {
  habits: Habit[];
  days: string[]; // current month's ISO days
  streaks: Record<string, number>;
  isDone: (habitId: string, date: string) => boolean;
  toggleLog: (habitId: string, date: string) => void;
  completionRate: (habitId: string, days: string[]) => number;
  removeHabit: (id: string) => void;
}

export function HabitMonthGrid({
  habits,
  days,
  streaks,
  isDone,
  toggleLog,
  completionRate,
  removeHabit,
}: HabitMonthGridProps) {
  const today = todayISO();

  return (
    <Card className="overflow-x-auto p-0">
      <div className="min-w-max">
        {/* Day-number header, aligned with the cells below: width, gap and left
            pad must stay in px and match HabitRow's cell exactly (see the width
            budget documented there). The label is the only rem-sized part left,
            and both rows use w-56 so they still line up. The font is px too, so
            two digits keep fitting the 21px box if the root size ever changes. */}
        <div className="flex items-center">
          <div className="sticky left-0 z-10 w-56 shrink-0 bg-card py-1.5" />
          <div className="flex gap-[4px] py-1.5 pl-[4px]">
            {days.map((d) => (
              <span
                key={d}
                className={cn(
                  "w-[21px] shrink-0 text-center text-[11px] tabular-nums",
                  d === today ? "font-semibold text-iris" : "text-muted-foreground",
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
            ))}
          </div>
        </div>

        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            days={days}
            streak={streaks[h.id] ?? 0}
            completion={completionRate(h.id, days)}
            isDone={(d) => isDone(h.id, d)}
            onToggle={(d) => toggleLog(h.id, d)}
            onDelete={() => removeHabit(h.id)}
          />
        ))}
      </div>
    </Card>
  );
}
