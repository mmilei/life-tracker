import { useMemo } from "react";
import type { MuscleGroup, Workout } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatDayLong } from "@/lib/dates";

interface WorkoutSessionListProps {
  workouts: Workout[];
  muscleGroups: MuscleGroup[];
  onRemove: (id: string) => void;
}

// Workouts grouped by day, most recent first. Each day is one "session".
export function WorkoutSessionList({ workouts, muscleGroups, onRemove }: WorkoutSessionListProps) {
  const groupName = (id: string) => muscleGroups.find((g) => g.id === id)?.name ?? "—";

  const sessions = useMemo(() => {
    const byDate: Record<string, Workout[]> = {};
    for (const w of workouts) (byDate[w.date] ??= []).push(w);
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));
  }, [workouts]);

  return (
    <div className="flex flex-col gap-4">
      {sessions.map(([date, items]) => (
        <Card key={date} size="sm" className="gap-3 px-4">
          <h3 className="font-medium capitalize">{formatDayLong(date)}</h3>
          <ul className="flex flex-col gap-1.5">
            {items.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0">
                  {groupName(w.muscleGroupId)}
                </Badge>
                <span className="min-w-0 flex-1 truncate">{w.exercise}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {w.sets}×{w.reps} · {w.weight}kg
                </span>
                <DeleteButton itemName={w.exercise} onConfirm={() => onRemove(w.id)} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
