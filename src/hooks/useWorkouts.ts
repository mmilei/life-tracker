import { useCallback, useMemo } from "react";
import type { MuscleGroup, Workout } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { seedMuscleGroups } from "@/lib/seed";
import type { Lang } from "@/lib/i18n";

export function useWorkouts(lang: Lang) {
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>(STORAGE_KEYS.workouts, []);
  const [muscleGroups, setMuscleGroups] = useLocalStorage<MuscleGroup[]>(
    STORAGE_KEYS.muscleGroups,
    seedMuscleGroups(lang),
  );

  const addWorkout = useCallback(
    (w: Omit<Workout, "id">) =>
      setWorkouts((prev) => [...prev, { ...w, id: crypto.randomUUID() }]),
    [setWorkouts],
  );

  const removeWorkout = useCallback(
    (id: string) => setWorkouts((prev) => prev.filter((w) => w.id !== id)),
    [setWorkouts],
  );

  const addMuscleGroup = useCallback(
    (name: string) =>
      setMuscleGroups((prev) => [...prev, { id: crypto.randomUUID(), name }]),
    [setMuscleGroups],
  );

  // Distinct exercise names for the <datalist> autocomplete.
  const exercises = useMemo(
    () => [...new Set(workouts.map((w) => w.exercise))].sort(),
    [workouts],
  );

  return {
    workouts,
    muscleGroups,
    addWorkout,
    removeWorkout,
    addMuscleGroup,
    exercises,
  };
}
