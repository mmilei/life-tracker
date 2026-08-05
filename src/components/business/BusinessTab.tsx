import { useMemo, useState } from "react";
import { useAppStore } from "@/store/AppStore";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AddNoteDialog } from "./AddNoteDialog";
import { NoteList } from "./NoteList";
import { LeadBoard } from "./LeadBoard";
import { LeadListsDialog } from "./LeadListsDialog";

export function BusinessTab() {
  const { notes, t } = useAppStore();
  const { notes: allNotes, noteTypes, leads, addNote, updateNote, removeNote } = notes;
  // Leads open the tab: it is the view the owner works in every day, notes are
  // the occasional one.
  const [view, setView] = useState<"notes" | "leads">("leads");

  const plainNotes = useMemo(() => allNotes.filter((n) => n.typeId !== "lead"), [allNotes]);
  // Dialog preselects: first non-lead type in the Notas view, 'lead' in Leads.
  const firstNoteTypeId = noteTypes.find((nt) => nt.id !== "lead")?.id ?? "";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("business.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {view === "notes"
            ? t("business.notesCount", { n: plainNotes.length })
            : t("business.leadsCount", { n: leads.length })}
        </p>
      </header>

      <ToggleGroup
        value={[view]}
        onValueChange={(v) => v[0] && setView(v[0] as "notes" | "leads")}
        variant="outline"
        className="w-full"
      >
        <ToggleGroupItem value="leads" className="flex-1">
          {t("business.leads")}
        </ToggleGroupItem>
        <ToggleGroupItem value="notes" className="flex-1">
          {t("business.notes")}
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Actions sit on one row and take only the width of their labels: at full
          width the add button read as a grey bar competing with the board.
          Managing stages and sources belongs to the pipeline, so it only shows
          in the Leads view. */}
      <div className="flex flex-wrap items-center gap-2">
        <AddNoteDialog
          noteTypes={noteTypes}
          defaultTypeId={view === "leads" ? "lead" : firstNoteTypeId}
          onAdd={addNote}
        />
        {view === "leads" && <LeadListsDialog />}
      </div>

      {view === "notes" ? (
        <NoteList notes={plainNotes} noteTypes={noteTypes} onRemove={removeNote} />
      ) : (
        <LeadBoard leads={leads} onUpdate={updateNote} onRemove={removeNote} />
      )}
    </div>
  );
}
