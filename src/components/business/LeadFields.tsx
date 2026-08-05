import { useId } from "react";
import type { LeadDetails } from "@/types";
import { Input } from "@/components/ui/input";
import { useT } from "@/store/AppStore";

// The lead form, shared by AddNoteDialog (new) and EditLeadDialog (existing).
// Field order is the order the owner thinks in: who, how to reach them, where
// they came from, what's next, and only then the free text.

// Suggestions for the source input. Translated labels, but whatever the user
// types is what gets stored: a datalist never restricts the value, so this
// stays free text and needs no parametrizable entity behind it.
const SOURCE_KEYS = [
  "business.sourceReferral",
  "business.sourceShowroom",
  "business.sourceInstagram",
  "business.sourceWeb",
  "business.sourceArchitect",
  "business.sourceSite",
];

interface LeadFieldsProps {
  lead: LeadDetails;
  onLeadChange: (patch: Partial<LeadDetails>) => void;
  text: string;
  onTextChange: (text: string) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function LeadFields({ lead, onLeadChange, text, onTextChange }: LeadFieldsProps) {
  const t = useT();
  const sourceListId = useId(); // two dialogs can be mounted at once

  return (
    <>
      <Field label={t("business.leadName")}>
        <Input
          autoFocus
          value={lead.name ?? ""}
          onChange={(e) => onLeadChange({ name: e.target.value })}
          placeholder={t("business.leadNamePlaceholder")}
        />
      </Field>

      <Field label={t("business.leadContact")}>
        <Input
          value={lead.contact ?? ""}
          onChange={(e) => onLeadChange({ contact: e.target.value })}
          placeholder={t("business.leadContactPlaceholder")}
        />
      </Field>

      <Field label={t("business.leadSource")}>
        <Input
          list={sourceListId}
          value={lead.source ?? ""}
          onChange={(e) => onLeadChange({ source: e.target.value })}
          placeholder={t("business.leadSourcePlaceholder")}
        />
      </Field>
      <datalist id={sourceListId}>
        {SOURCE_KEYS.map((key) => (
          <option key={key} value={t(key)} />
        ))}
      </datalist>

      <Field label={t("business.leadNextStep")}>
        <Input
          value={lead.nextStep ?? ""}
          onChange={(e) => onLeadChange({ nextStep: e.target.value })}
          placeholder={t("business.leadNextStepPlaceholder")}
        />
      </Field>

      <Field label={t("business.leadNextStepDate")}>
        {/* Native date input: the OS picker is already localized and accessible. */}
        <Input
          type="date"
          value={lead.nextStepDate ?? ""}
          onChange={(e) => onLeadChange({ nextStepDate: e.target.value })}
        />
      </Field>

      <Field label={t("business.leadDetail")}>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t("business.leadPlaceholder")}
          className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </Field>
    </>
  );
}
