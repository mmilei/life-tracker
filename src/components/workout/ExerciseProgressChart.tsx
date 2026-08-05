import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Workout } from "@/types";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDayLong } from "@/lib/dates";
import { useT } from "@/store/AppStore";

type Metric = "weight" | "reps";

interface ExerciseProgressChartProps {
  workouts: Workout[];
  exercises: string[]; // distinct names, already sorted
}

export function ExerciseProgressChart({ workouts, exercises }: ExerciseProgressChartProps) {
  const t = useT();
  const [exercise, setExercise] = useState(exercises[0] ?? "");
  const [metric, setMetric] = useState<Metric>("weight");

  // One point per day (best set of the day) so repeated same-day entries
  // don't stack on the same x. Sorted ascending for a left-to-right trend.
  const data = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const w of workouts) {
      if (w.exercise !== exercise) continue;
      byDate[w.date] = Math.max(byDate[w.date] ?? 0, w[metric]);
    }
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));
  }, [workouts, exercise, metric]);

  const unit = metric === "weight" ? "kg" : "reps";

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("workout.chartExercise")}
        >
          {exercises.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ToggleGroup
          value={[metric]}
          onValueChange={(v) => v[0] && setMetric(v[0] as Metric)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="weight">{t("workout.metricWeight")}</ToggleGroupItem>
          <ToggleGroupItem value="reps">{t("workout.metricReps")}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {data.length < 2 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("workout.chartEmpty")}
        </p>
      ) : (
        // NOTE: recharts takes plain numbers, so nothing here follows the root
        // font size. Height, tick sizes and the axis gutter were bumped 12.5% by
        // hand to match the rem-sized card and controls around them.
        <ResponsiveContainer width="100%" height={248}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLong}
              tick={{ fontSize: 12, fill: "var(--color-muted-text)" }}
              stroke="var(--border)"
            />
            <YAxis
              width={50}
              tick={{ fontSize: 12, fill: "var(--color-muted-text)" }}
              stroke="var(--border)"
              unit={unit === "kg" ? "kg" : ""}
            />
            <Tooltip
              labelFormatter={(l) => formatDayLong(String(l))}
              formatter={(v) => [
                `${v} ${unit === "kg" ? "kg" : t("workout.metricReps").toLowerCase()}`,
                exercise,
              ]}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-ember)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-ember)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
