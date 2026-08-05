import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEYS = {
  habits: "lt.habits",
  habitLogs: "lt.habitLogs",
  lifeAreas: "lt.lifeAreas",
  weeklyRatings: "lt.weeklyRatings",
  muscleGroups: "lt.muscleGroups",
  workouts: "lt.workouts",
  noteTypes: "lt.noteTypes",
  notes: "lt.notes",
  homePins: "lt.homePins",
  lang: "lt.lang",
} as const;

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

// One listener, because there is exactly one sync engine (src/lib/sync-engine.ts).
// Every domain hook writes through useLocalStorage, so this is the single place
// that knows "something changed" without every hook opting in.
let writeListener: (() => void) | null = null;

export function onLocalWrite(fn: () => void): void {
  writeListener = fn;
}

// localStorage-backed useState. Lazy init reads once; every change persists.
export function useLocalStorage<T>(key: string, initial: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      writeListener?.();
    } catch {
      // TRADEOFF: swallow quota/serialization errors — single-user local app, no recovery path worth writing
    }
  }, [key, value]);

  const set = useCallback<SetValue<T>>((v) => setValue(v), []);
  return [value, set];
}

// Backup = every lt.* key as one JSON object. Returns a pretty string for download.
export function exportBackup(): string {
  const data: Record<string, unknown> = {};
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw);
  }
  return JSON.stringify(data, null, 2);
}

// Overwrites storage from a backup string, then reloads so all hooks re-read.
export function importBackup(json: string): void {
  const data = JSON.parse(json) as Record<string, unknown>;
  const valid = new Set<string>(Object.values(STORAGE_KEYS));
  for (const [key, val] of Object.entries(data)) {
    if (valid.has(key)) localStorage.setItem(key, JSON.stringify(val));
  }
  location.reload();
}
