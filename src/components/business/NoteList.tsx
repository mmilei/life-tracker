import { useMemo } from "react";
import type { Note, NoteType } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatDayLong } from "@/lib/dates";
import { useT } from "@/store/AppStore";

interface NoteListProps {
  notes: Note[]; // already filtered to non-lead notes by BusinessTab
  noteTypes: NoteType[];
  onRemove: (id: string) => void;
}

// Flat list of notes, most recent first. Each row shows its type as a badge.
export function NoteList({ notes, noteTypes, onRemove }: NoteListProps) {
  const t = useT();
  const typeLabel = (id: string) => noteTypes.find((nt) => nt.id === id)?.label ?? "—";

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("business.notesEmpty")}</p>
    );
  }

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {sorted.map((note) => (
        <Card key={note.id} size="sm" className="flex-row items-center gap-2 px-4">
          <Badge variant="outline" className="shrink-0">
            {typeLabel(note.typeId)}
          </Badge>
          <span className="min-w-0 flex-1 truncate">{note.text}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDayLong(note.createdAt)}
          </span>
          <DeleteButton itemName={note.text} onConfirm={() => onRemove(note.id)} />
        </Card>
      ))}
    </div>
  );
}
