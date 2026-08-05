import { useCallback, useMemo } from "react";
import type { LeadDetails, Note, NoteType } from "@/types";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { seedNoteTypes } from "@/lib/seed";
import type { Lang } from "@/lib/i18n";
import { todayISO } from "@/lib/dates";

export function useNotes(lang: Lang) {
  const [notes, setNotes] = useLocalStorage<Note[]>(STORAGE_KEYS.notes, []);
  const [noteTypes] = useLocalStorage<NoteType[]>(STORAGE_KEYS.noteTypes, seedNoteTypes(lang));

  const addNote = useCallback(
    (typeId: string, text: string, status?: string, lead?: LeadDetails) =>
      setNotes((prev) => [
        ...prev,
        { id: crypto.randomUUID(), typeId, text, createdAt: todayISO(), status, lead },
      ]),
    [setNotes],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<Note, "id">>) =>
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    [setNotes],
  );

  const removeNote = useCallback(
    (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id)),
    [setNotes],
  );

  const leads = useMemo(() => notes.filter((n) => n.typeId === "lead"), [notes]);

  return { notes, noteTypes, addNote, updateNote, removeNote, leads };
}
