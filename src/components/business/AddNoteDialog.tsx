import { useState } from "react";
import { Plus } from "lucide-react";
import type { LeadDetails, NoteType } from "@/types";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeadFields } from "./LeadFields";
import { cleanLead, reassignStage, stageLabel } from "@/lib/leads";
import { useAppStore, useT } from "@/store/AppStore";

interface AddNoteDialogProps {
  noteTypes: NoteType[];
  defaultTypeId: string; // preselects the type matching the active view (note vs lead)
  onAdd: (typeId: string, text: string, status?: string, lead?: LeadDetails) => void;
}

// One dialog for both notes and leads — the note type is a ToggleGroup over the
// (parametrizable) noteTypes. When the chosen type is 'lead', a second
// ToggleGroup picks the initial pipeline stage and the lead fields replace the
// plain note textarea.
export function AddNoteDialog({ noteTypes, defaultTypeId, onAdd }: AddNoteDialogProps) {
  const t = useT();
  const { leadConfig } = useAppStore();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(defaultTypeId);
  const [text, setText] = useState("");
  // "" means "whatever the first stage is". The picked value is resolved against
  // the live stage list on every render, so an empty start and a stage deleted
  // from the lists dialog while this form is open both fall back to the first
  // stage instead of leaving a dangling id selected.
  const [status, setStatus] = useState("");
  const [lead, setLead] = useState<LeadDetails>({});

  const stages = leadConfig.stages;
  const stage = reassignStage(status, stages);
  const isLead = typeId === "lead";
  // A lead is identified by its name, a note by its text, either one is enough.
  const canSave = Boolean(typeId) && Boolean(text.trim() || (isLead && lead.name?.trim()));

  function submit() {
    if (!canSave) return;
    onAdd(typeId, text.trim(), isLead ? stage : undefined, isLead ? cleanLead(lead) : undefined);
    setText("");
    setStatus("");
    setLead({});
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Reset the type to the active view's default each time it opens.
        if (o) setTypeId(defaultTypeId);
        setOpen(o);
      }}
    >
      {/* Secondary, not outline nor ghost: the coloured outline competed with
          the board for attention, and ghost went so quiet it could not be
          found. A soft filled surface with no coloured border sits between.
          No w-full: stretched edge to edge it read as a grey bar across the
          screen rather than as a button. */}
      <DialogTrigger render={<Button variant="secondary" />}>
        <Plus />
        {defaultTypeId === "lead" ? t("business.addLead") : t("business.addNote")}
      </DialogTrigger>
      {/* Same shape as the edit dialog: capped height, header and footer fixed,
          and the form is the only thing that scrolls. This is the longest form in
          the app (type, stage and six lead fields), so on a short window the save
          button was the first thing to fall off the bottom. */}
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("business.newTitle")}</DialogTitle>
          <DialogDescription>{t("business.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Note type — single-select ToggleGroup (base-ui is array-valued) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t("business.type")}</span>
            <ToggleGroup
              value={typeId ? [typeId] : []}
              onValueChange={(v) => v[0] && setTypeId(v[0])}
              variant="outline"
              className="flex-wrap"
            >
              {noteTypes.map((nt) => (
                <ToggleGroupItem key={nt.id} value={nt.id} className="px-3">
                  {nt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {isLead ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">{t("business.stage")}</span>
                <ToggleGroup
                  value={[stage]}
                  onValueChange={(v) => v[0] && setStatus(v[0])}
                  variant="outline"
                  className="flex-wrap"
                >
                  {stages.map((s) => (
                    <ToggleGroupItem key={s.id} value={s.id} className="px-3">
                      {stageLabel(s, t)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <LeadFields
                lead={lead}
                onLeadChange={(patch) => setLead((prev) => ({ ...prev, ...patch }))}
                text={text}
                onTextChange={setText}
              />
            </>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{t("business.note")}</span>
              <textarea
                autoFocus
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("business.notePlaceholder")}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              />
            </label>
          )}
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={submit} disabled={!canSave}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
