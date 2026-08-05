import { useState } from "react";
import type { LeadDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore, useT } from "@/store/AppStore";

// The lead form, shared by AddNoteDialog (new) and EditLeadDialog (existing).
// Field order is the order the owner thinks in: who, how to reach them, where
// they came from, what's next, and only then the free text.

// Sentinel option value. Not a uuid and not a seeded label, so it can never
// collide with a real source id.
const ADD_SOURCE = "__add__";

// Same native select as the stage picker on the board, sized like Input so the
// form reads as one column of controls.
const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

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
  const { leadConfig } = useAppStore();
  // null = the picker is showing, a string = the user is typing a new source.
  // A source that shows up mid-form is the common case, and sending the owner
  // to another screen to add it loses the half-typed lead.
  const [draft, setDraft] = useState<string | null>(null);

  function addSource() {
    const name = (draft ?? "").trim();
    if (!name) return;
    // addSource hands back the id, so the new source can be selected in the
    // same click. A label that already exists returns the existing id, which is
    // the right outcome: the owner meant that one.
    onLeadChange({ source: leadConfig.addSource(name) });
    setDraft(null);
  }

  const source = lead.source ?? "";
  const known = leadConfig.sources.some((s) => s.id === source);

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
        {draft === null ? (
          <select
            value={source}
            onChange={(e) =>
              e.target.value === ADD_SOURCE
                ? setDraft("")
                : onLeadChange({ source: e.target.value })
            }
            className={SELECT_CLASS}
          >
            <option value="">{t("business.leadSourceNone")}</option>
            {/* A lead whose source was typed while this was free text keeps its
                value on screen until the migration adopts it as a source. */}
            {source && !known ? <option value={source}>{source}</option> : null}
            {leadConfig.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
            <option value={ADD_SOURCE}>{t("business.sourceAdd")}</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("business.sourcePlaceholder")}
              // Enter here would submit the whole lead form, saving a lead the
              // user was still filling in.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addSource();
              }}
            />
            <Button type="button" size="sm" onClick={addSource} disabled={!draft.trim()}>
              {t("common.add")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </Field>

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
