import { useCallback, useMemo } from "react";
import type { Habit, HabitLog } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { seedHabits } from "@/lib/seed";
import type { Lang } from "@/lib/i18n";
import { getAllStreaks } from "@/lib/streaks";
import { todayISO } from "@/lib/dates";

export function useHabits(lang: Lang) {
  const [habits, setHabits] = useLocalStorage<Habit[]>(STORAGE_KEYS.habits, seedHabits(lang));
  const [logs, setLogs] = useLocalStorage<HabitLog[]>(STORAGE_KEYS.habitLogs, []);

  const addHabit = useCallback(
    (name: string, color: string) =>
      setHabits((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, color, createdAt: todayISO() },
      ]),
    [setHabits],
  );

  const removeHabit = useCallback(
    (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setLogs((prev) => prev.filter((l) => l.habitId !== id));
    },
    [setHabits, setLogs],
  );

  const isDone = useCallback(
    (habitId: string, date: string) => logs.some((l) => l.habitId === habitId && l.date === date),
    [logs],
  );

  const toggleLog = useCallback(
    (habitId: string, date: string) =>
      setLogs((prev) =>
        prev.some((l) => l.habitId === habitId && l.date === date)
          ? prev.filter((l) => !(l.habitId === habitId && l.date === date))
          : [...prev, { habitId, date }],
      ),
    [setLogs],
  );

  // Completion rate over a set of days (e.g. the current month grid).
  const completionRate = useCallback(
    (habitId: string, days: string[]) => {
      if (days.length === 0) return 0;
      const hit = days.filter((d) => isDone(habitId, d)).length;
      return hit / days.length;
    },
    [isDone],
  );

  const streaks = useMemo(() => getAllStreaks(logs), [logs]);

  return { habits, logs, addHabit, removeHabit, toggleLog, isDone, completionRate, streaks };
}
