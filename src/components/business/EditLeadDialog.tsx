import { useState } from "react";
import { Mail, MessageCircle, Pencil } from "lucide-react";
import type { LeadDetails, Note } from "@/types";
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
import { cleanLead, contactLink, reassignStage, stageLabel } from "@/lib/leads";
import { useAppStore, useT } from "@/store/AppStore";

interface EditLeadDialogProps {
  lead: Note;
  label: string; // the card title, for the trigger's aria-label
  onUpdate: (id: string, patch: Partial<Omit<Note, "id">>) => void;
}

// Editing a lead is the whole point of the board: a next step gets set after the
// first call, not while typing the lead in. Same fields and same stage picker as
// the add dialog, so both forms read alike.
//
// The stage lives here now. The card only offers "move to the next stage", which
// walks the pipeline forward one step at a time and cannot send a lead back or
// skip ahead, so this dialog is the single place where any stage can be picked
// freely. Take it out and the stage stops being editable in the whole app.
export function EditLeadDialog({ lead, label, onUpdate }: EditLeadDialogProps) {
  const t = useT();
  const { leadConfig } = useAppStore();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<LeadDetails>(lead.lead ?? {});
  const [text, setText] = useState(lead.text);
  const [status, setStatus] = useState(lead.status);
  // Resolved against the live stage list on every render: a stage deleted from
  // the lists dialog while this form is open falls back to the first one instead
  // of leaving a dangling id selected.
  const stage = reassignStage(status, leadConfig.stages);
  // The contact is off the board card now, so this dialog is the one place where
  // it can be dialled. Recomputed while typing, which is what makes it verifiable.
  const link = contactLink(details.contact);

  function submit() {
    onUpdate(lead.id, { text: text.trim(), status: stage, lead: cleanLead(details) });
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
          setStatus(lead.status);
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
      {/* Flex column with a capped height: the header and the footer stay put and
          only the form scrolls, so the save button is never pushed off screen and
          the scrollbar sits inside the padding instead of over the rounded corner.
          The -mx-1/px-1 keeps the focus ring of the first and last field from
          being clipped by that scroll container. */}
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("business.editLeadTitle")}</DialogTitle>
          <DialogDescription>{t("business.editLeadDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t("business.stage")}</span>
            <ToggleGroup
              value={[stage]}
              onValueChange={(v) => v[0] && setStatus(v[0])}
              variant="outline"
              className="flex-wrap"
            >
              {leadConfig.stages.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id} className="px-3">
                  {stageLabel(s, t)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <LeadFields
            lead={details}
            onLeadChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
            text={text}
            onTextChange={setText}
          />

          {link.href && (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit min-w-0 items-center gap-1.5 text-sm text-iris underline-offset-2 hover:underline"
            >
              {link.kind === "email" ? (
                <Mail className="size-3.5 shrink-0" />
              ) : (
                <MessageCircle className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{details.contact}</span>
            </a>
          )}
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={submit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
