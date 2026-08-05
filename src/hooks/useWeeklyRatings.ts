import { useCallback, useEffect, useMemo } from "react";
import type { WeeklyRating } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { addDays, isSunday, weekStart } from "@/lib/dates";

export function useWeeklyRatings() {
  const [ratings, setRatings] = useLocalStorage<WeeklyRating[]>(STORAGE_KEYS.weeklyRatings, []);

  const setRating = useCallback(
    (ws: string, areaId: string, score: number) =>
      setRatings((prev) => {
        const rest = prev.filter((r) => !(r.weekStart === ws && r.areaId === areaId));
        return [...rest, { weekStart: ws, areaId, score }];
      }),
    [setRatings],
  );

  const getWeek = useCallback(
    (ws: string) => ratings.filter((r) => r.weekStart === ws),
    [ratings],
  );

  // Distinct weeks, newest first — WeekHistory list.
  const weeks = useMemo(
    () => [...new Set(ratings.map((r) => r.weekStart))].sort().reverse(),
    [ratings],
  );

  // Auto-precarga dominical: on Sunday, if this week has no ratings yet,
  // seed it from last week's so the user tweaks instead of starting blank.
  useEffect(() => {
    if (!isSunday()) return;
    const ws = weekStart();
    setRatings((prev) => {
      if (prev.some((r) => r.weekStart === ws)) return prev;
      const prevWeek = addDays(ws, -7);
      const carry = prev.filter((r) => r.weekStart === prevWeek);
      if (carry.length === 0) return prev;
      return [...prev, ...carry.map((r) => ({ ...r, weekStart: ws }))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ratings, setRating, getWeek, weeks, currentWeekStart: weekStart() };
}
