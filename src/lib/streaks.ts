import type { HabitLog } from "@/types";
import { addDays, todayISO } from "@/lib/dates";

// Consecutive-day streak for one habit, counting back from today.
// Still "alive" if today isn't logged yet but yesterday was.
export function computeStreak(logs: HabitLog[], habitId: string): number {
  const done = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
  const today = todayISO();
  let cursor = done.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// habitId -> current streak, for every habit that has logs.
export function getAllStreaks(logs: HabitLog[]): Record<string, number> {
  const ids = new Set(logs.map((l) => l.habitId));
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = computeStreak(logs, id);
  return out;
}

export function getHighestStreak(logs: HabitLog[]): number {
  const streaks = Object.values(getAllStreaks(logs));
  return streaks.length ? Math.max(...streaks) : 0;
}

// Badge (StreakFlame) only from 5 consecutive days — product rule.
export function shouldShowBadge(count: number): boolean {
  return count >= 5;
}
