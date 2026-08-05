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
import { LEAD_STATUSES, LEAD_STATUS_KEYS } from "./LeadBoard";
import { LeadFields } from "./LeadFields";
import { cleanLead } from "@/lib/leads";
import { useT } from "@/store/AppStore";

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
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(defaultTypeId);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string>(LEAD_STATUSES[0]);
  const [lead, setLead] = useState<LeadDetails>({});

  const isLead = typeId === "lead";
  // A lead is identified by its name, a note by its text, either one is enough.
  const canSave = Boolean(typeId) && Boolean(text.trim() || (isLead && lead.name?.trim()));

  function submit() {
    if (!canSave) return;
    onAdd(typeId, text.trim(), isLead ? status : undefined, isLead ? cleanLead(lead) : undefined);
    setText("");
    setStatus(LEAD_STATUSES[0]);
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
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <Plus />
        {defaultTypeId === "lead" ? t("business.addLead") : t("business.addNote")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("business.newTitle")}</DialogTitle>
          <DialogDescription>{t("business.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
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
                  value={[status]}
                  onValueChange={(v) => v[0] && setStatus(v[0])}
                  variant="outline"
                  className="flex-wrap"
                >
                  {LEAD_STATUSES.map((s) => (
                    <ToggleGroupItem key={s} value={s} className="px-3">
                      {t(LEAD_STATUS_KEYS[s])}
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
