import { useCallback } from "react";
import type { LifeArea } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { seedLifeAreas } from "@/lib/seed";
import type { Lang } from "@/lib/i18n";

export function useLifeAreas(lang: Lang) {
  const [areas, setAreas] = useLocalStorage<LifeArea[]>(STORAGE_KEYS.lifeAreas, seedLifeAreas(lang));

  const addArea = useCallback(
    (name: string) => setAreas((prev) => [...prev, { id: crypto.randomUUID(), name }]),
    [setAreas],
  );

  const removeArea = useCallback(
    (id: string) => setAreas((prev) => prev.filter((a) => a.id !== id)),
    [setAreas],
  );

  return { areas, addArea, removeArea };
}
