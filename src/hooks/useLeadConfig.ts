import { useCallback, useEffect } from "react";
import type { LeadSource, LeadStage } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { seedLeadSources, seedLeadStages } from "@/lib/seed";
import type { Lang } from "@/lib/i18n";
import * as leads from "@/lib/leads";

// The shape of the lead board: which stages exist and which sources a lead can
// come from. One hook for both, because they are the same domain with the same
// two operations, and splitting them would only add a file.
//
// Deleting a stage does NOT rewrite the leads that sat in it. The board already
// falls back to the first stage for any status it doesn't recognise
// (leads.reassignStage), so the move happens on read and the next edit persists
// it. That keeps deletion a one-line state change instead of a data migration
// that has to run on every device.
export function useLeadConfig(lang: Lang, leadSourceValues: (string | undefined)[]) {
  const [stages, setStages] = useLocalStorage<LeadStage[]>(
    STORAGE_KEYS.leadStages,
    seedLeadStages(lang),
  );
  const [sources, setSources] = useLocalStorage<LeadSource[]>(
    STORAGE_KEYS.leadSources,
    seedLeadSources(lang),
  );

  // Sources used to be free text. Anything typed before this list existed is
  // adopted as a source of its own rather than lost. Idempotent: once every
  // value is known this returns the same array and the state never changes.
  useEffect(() => {
    setSources((prev) => {
      const merged = leads.migrateSources(prev, leadSourceValues);
      return merged.length === prev.length ? prev : merged;
    });
  }, [leadSourceValues, setSources]);

  // A sync merge can bring Cerrado back from the end of the array instead of
  // the end where it belongs (see leads.normalizeStages). Repairs itself once
  // per load; a no-op when the order was already fine.
  useEffect(() => {
    setStages((prev) => leads.normalizeStages(prev));
  }, [setStages]);

  const addStage = useCallback(
    (label: string) => setStages((prev) => leads.addStage(prev, label)),
    [setStages],
  );
  const renameStage = useCallback(
    (id: string, label: string) => setStages((prev) => leads.renameStage(prev, id, label)),
    [setStages],
  );
  const removeStage = useCallback(
    (id: string) => setStages((prev) => leads.removeStage(prev, id)),
    [setStages],
  );

  // Returns the id, because the caller almost always needs to select what it
  // just created (the lead form adds a source mid-entry). Resolving it here
  // instead of inside the state updater is what makes that possible: an updater
  // runs later and can't hand anything back. An existing label returns the
  // existing id rather than a duplicate, so "add" is really "add or find".
  const addSource = useCallback(
    (label: string): string => {
      const name = label.trim();
      const existing = sources.find((s) => s.label.trim().toLowerCase() === name.toLowerCase());
      if (existing) return existing.id;
      const created: LeadSource = { id: crypto.randomUUID(), label: name };
      setSources((prev) => [...prev, created]);
      return created.id;
    },
    [sources, setSources],
  );
  const renameSource = useCallback(
    (id: string, label: string) => setSources((prev) => leads.renameSource(prev, id, label)),
    [setSources],
  );
  const removeSource = useCallback(
    (id: string) => setSources((prev) => leads.removeSource(prev, id)),
    [setSources],
  );

  return {
    stages,
    sources,
    addStage,
    renameStage,
    removeStage,
    addSource,
    renameSource,
    removeSource,
  };
}
