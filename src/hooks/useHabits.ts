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
    (name: string, color: string, emoji?: string) =>
      setHabits((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, color, emoji: emoji || undefined, createdAt: todayISO() },
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

  // Completion rate over the ELAPSED days of the given range, not all of them:
  // dividing by the whole month makes every habit read ~6% on the 5th, which
  // says more about the calendar than about the user. ISO days sort
  // lexicographically, so one compare against today covers the three cases:
  // past month (all days elapsed), current month (up to today inclusive),
  // future month (none elapsed, hence the guard instead of a 0/0).
  const completionRate = useCallback(
    (habitId: string, days: string[]) => {
      const today = todayISO();
      const elapsed = days.filter((d) => d <= today);
      if (elapsed.length === 0) return 0;
      return elapsed.filter((d) => isDone(habitId, d)).length / elapsed.length;
    },
    [isDone],
  );

  const streaks = useMemo(() => getAllStreaks(logs), [logs]);

  return { habits, logs, addHabit, removeHabit, toggleLog, isDone, completionRate, streaks };
}
