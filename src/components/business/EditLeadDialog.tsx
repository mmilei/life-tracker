import { useState } from "react";
import { Pencil } from "lucide-react";
import type { LeadDetails, Note } from "@/types";
import { Button } from "@/components/ui/button";
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
import { cleanLead } from "@/lib/leads";
import { useT } from "@/store/AppStore";

interface EditLeadDialogProps {
  lead: Note;
  label: string; // the card title, for the trigger's aria-label
  onUpdate: (id: string, patch: Partial<Omit<Note, "id">>) => void;
}

// Editing a lead is the whole point of the board: a next step gets set after the
// first call, not while typing the lead in. Same fields as the add dialog, same
// Dialog primitive, and only the stage stays out: the column select already owns it.
export function EditLeadDialog({ lead, label, onUpdate }: EditLeadDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<LeadDetails>(lead.lead ?? {});
  const [text, setText] = useState(lead.text);

  function submit() {
    onUpdate(lead.id, { text: text.trim(), lead: cleanLead(details) });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Re-seed from the stored lead on every open, so a cancelled edit or an
        // external change (an import, a sync pull) never leaves stale form state.
        if (o) {
          setDetails(lead.lead ?? {});
          setText(lead.text);
        }
        setOpen(o);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("business.editLeadAria", { name: label })}
            className="text-muted-foreground"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("business.editLeadTitle")}</DialogTitle>
          <DialogDescription>{t("business.editLeadDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <LeadFields
            lead={details}
            onLeadChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
            text={text}
            onTextChange={setText}
          />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={submit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
