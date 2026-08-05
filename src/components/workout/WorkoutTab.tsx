import { useAppStore, useT } from "@/store/AppStore";
import { AddWorkoutDialog } from "./AddWorkoutDialog";
import { WorkoutSessionList } from "./WorkoutSessionList";
import { ExerciseProgressChart } from "./ExerciseProgressChart";

export function WorkoutTab() {
  const t = useT();
  const { workouts } = useAppStore();
  const { workouts: list, muscleGroups, exercises, addWorkout, removeWorkout } = workouts;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("workout.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {list.length === 0 ? t("workout.firstSession") : t("workout.entries", { n: list.length })}
        </p>
      </header>

      <AddWorkoutDialog muscleGroups={muscleGroups} exercises={exercises} onAdd={addWorkout} />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("workout.empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <WorkoutSessionList
            workouts={list}
            muscleGroups={muscleGroups}
            onRemove={removeWorkout}
          />
          <ExerciseProgressChart workouts={list} exercises={exercises} />
        </div>
      )}
    </div>
  );
}
