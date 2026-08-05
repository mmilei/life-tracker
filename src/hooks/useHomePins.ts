import { useCallback } from "react";
import type { HomePin } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";

export const MAX_PINS = 4;

export function useHomePins() {
  const [pins, setPins] = useLocalStorage<HomePin[]>(STORAGE_KEYS.homePins, []);

  // Returns false (no-op) if already at MAX_PINS — the 5th is rejected.
  const addPin = useCallback(
    (pin: Omit<HomePin, "id">): boolean => {
      if (pins.length >= MAX_PINS) return false;
      setPins((prev) =>
        prev.length >= MAX_PINS ? prev : [...prev, { ...pin, id: crypto.randomUUID() }],
      );
      return true;
    },
    [pins.length, setPins],
  );

  const removePin = useCallback(
    (id: string) => setPins((prev) => prev.filter((p) => p.id !== id)),
    [setPins],
  );

  return { pins, addPin, removePin, canPin: pins.length < MAX_PINS };
}
