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
      </header>

      {/* One row for everything above the content: view switch, add, and list
          management. Three stacked rows ate ~150px of height on a screen where
          the board itself did not fit. flex-wrap lets them fall onto a second
          row on their own when the window gets narrow, which is the only width
          this app can count on.
          Nothing here is w-full: the toggle is w-fit by default and forcing it
          full width turned two labels into two huge grey bars. */}
      <div className="flex flex-col gap-2">
        <ToggleGroup
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as "notes" | "leads")}
          variant="outline"
        >
          {/* The count rides the toggle, same shape as the source chips on the
              board. As a header subtitle it needed a plural rule the dictionary
              does not have, and printed "1 leads". */}
          <ToggleGroupItem value="leads">
            {t("business.leads")}
            <span className="text-muted-foreground tabular-nums">{leads.length}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="notes">
            {t("business.notes")}
            <span className="text-muted-foreground tabular-nums">{plainNotes.length}</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-center gap-2">
          <AddNoteDialog
            noteTypes={noteTypes}
            defaultTypeId={view === "leads" ? "lead" : firstNoteTypeId}
            onAdd={addNote}
          />
          {view === "leads" && <LeadListsDialog />}
        </div>
      </div>

      {view === "notes" ? (
        <NoteList notes={plainNotes} noteTypes={noteTypes} onRemove={removeNote} />
      ) : (
        <LeadBoard leads={leads} onUpdate={updateNote} onRemove={removeNote} />
      )}
    </div>
  );
}
