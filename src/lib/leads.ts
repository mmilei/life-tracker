// Lead card logic: how a contact string becomes a link, and when a next step is
// late. Pure functions only: scripts/check-leads.mjs imports this file directly
// (Node strips the types), so nothing here may pull in React. The one import is
// type-only, which Node erases before it ever tries to resolve the `@/` alias.

import type { LeadDetails, LeadSource, LeadStage } from "@/types";

export type ContactKind = "email" | "phone" | "text";

export interface ContactLink {
  kind: ContactKind;
  href?: string; // absent for "text": a plain span, never a broken link
}

// Deliberately strict: a wrong guess ships a dead link, and the owner only finds
// out when a client doesn't answer. Anything ambiguous stays plain text.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]+$/; // the separators people actually type
const MIN_PHONE_DIGITS = 7; // shortest real local number; below that it's a note

// wa.me wants digits only: no "+", no spaces, dashes or parentheses.
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function contactLink(raw: string | undefined): ContactLink {
  const value = (raw ?? "").trim();
  if (!value) return { kind: "text" };
  if (EMAIL_RE.test(value)) return { kind: "email", href: `mailto:${value}` };
  const digits = phoneDigits(value);
  if (PHONE_RE.test(value) && digits.length >= MIN_PHONE_DIGITS)
    // TRADEOFF: phones link to WhatsApp, not tel:. It is how this business talks
    // to its clients, and wa.me degrades to a web chat when there is no app.
    return { kind: "phone", href: `https://wa.me/${digits}` };
  return { kind: "text" };
}

// ISO day strings sort lexicographically, so no Date parsing is needed. Today is
// NOT overdue, the user still has the whole day. No date means nothing to miss.
// `today` is a parameter so the check script can pin the clock.
export function isOverdue(date: string | undefined, today: string): boolean {
  return !!date && date < today;
}

// Trims the form values and drops the empty ones, so a lead the user filled
// halfway doesn't store five empty strings in every backup. All-empty -> nothing.
export function cleanLead(details: LeadDetails): LeadDetails | undefined {
  const cleaned: LeadDetails = {};
  for (const [key, value] of Object.entries(details)) {
    const trimmed = (value ?? "").trim();
    if (trimmed) cleaned[key as keyof LeadDetails] = trimmed;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

// ---------------------------------------------------------------------- stages
//
// The pipeline is the user's, with two exceptions the app owns: it always opens
// with a "new lead" column and always ends with a "closed" one. Those two are
// fixed: never renamed, never deleted, never moved, so every board has a
// place for a lead that just arrived and one for a deal that ended, and the
// stage picker always has at least two options.
//
// Ids are stored verbatim in Note.status. They are the seeded Spanish strings
// because that is what already sits in every existing note: changing them would
// orphan real data. Labels are what the user sees, and only the user's own
// stages carry one.

export const FIXED_FIRST_STAGE = "Nuevo";
export const FIXED_LAST_STAGE = "Cerrado";

// The owner asked for a cap: the board scrolls sideways and a pipeline wider
// than this stops being scannable on the 1440p screen it is used on.
// Two fixed + four of the user's own.
export const MAX_STAGES = 6;

// The i18n keys for the two fixed stages. Everything else renders `label`.
export const FIXED_STAGE_KEYS: Record<string, string> = {
  [FIXED_FIRST_STAGE]: "business.leadNew",
  [FIXED_LAST_STAGE]: "business.leadClosed",
};

export function isFixedStage(id: string): boolean {
  return id === FIXED_FIRST_STAGE || id === FIXED_LAST_STAGE;
}

// Whether a name is already on a list, comparing what the user SEES. It takes
// the rendered labels, not the entities: the two fixed stages are stored under
// Spanish ids and rendered from the dictionary, so an English user looking at
// "New" would otherwise be allowed to create a second stage called "New" and
// end up with two columns they cannot tell apart. Serves stages and sources.
export function nameTaken(existingNames: string[], label: string): boolean {
  const wanted = label.trim().toLowerCase();
  return existingNames.some((name) => name.trim().toLowerCase() === wanted);
}

export function canAddStage(stages: LeadStage[]): boolean {
  return stages.length < MAX_STAGES;
}

// New stages land at the end of the user's own, just before the closing one:
// a pipeline grows towards the close, and there is no reordering to undo a
// mistake, so the only sane insertion point is the last editable slot.
export function addStage(stages: LeadStage[], label: string): LeadStage[] {
  const name = label.trim();
  if (!name || !canAddStage(stages)) return stages;
  const next = stages.slice();
  next.splice(next.length - 1, 0, { id: crypto.randomUUID(), label: name });
  return next;
}

// Renaming touches the label only. Leads store the id, so every card that sits
// in this stage follows along with no migration at all.
export function renameStage(stages: LeadStage[], id: string, label: string): LeadStage[] {
  const name = label.trim();
  if (!name || isFixedStage(id)) return stages;
  return stages.map((s) => (s.id === id ? { ...s, label: name } : s));
}

export function removeStage(stages: LeadStage[], id: string): LeadStage[] {
  if (isFixedStage(id)) return stages;
  return stages.filter((s) => s.id !== id);
}

// Where the leads of a deleted stage go: back to the first one. Not the closing
// stage, which would silently mark live deals as finished, and not "no stage",
// which the board has no column for.
export function reassignStage(status: string | undefined, stages: LeadStage[]): string {
  const first = stages[0]?.id ?? FIXED_FIRST_STAGE;
  if (!status) return first;
  return stages.some((s) => s.id === status) ? status : first;
}

export function stageLabel(stage: LeadStage, t: (key: string) => string): string {
  const key = FIXED_STAGE_KEYS[stage.id];
  return key ? t(key) : (stage.label ?? stage.id);
}

// --------------------------------------------------------------------- sources
//
// Same shape, one less rule: no fixed entries and no cap. The seeded six are
// translated once, at seed time, and are the user's data from then on.

export function sourceLabel(sources: LeadSource[], id: string | undefined): string | undefined {
  const value = (id ?? "").trim();
  if (!value) return undefined;
  // A lead whose source was typed before this list existed keeps showing that
  // text, even if migration has not run yet in this browser.
  return sources.find((s) => s.id === value)?.label ?? value;
}

// NOTE: there is no pure addSource here. Adding one has to return the new id
// (the lead form selects what it just created), and that means resolving the
// dedupe outside a state updater, so it lives in useLeadConfig instead.

export function renameSource(sources: LeadSource[], id: string, label: string): LeadSource[] {
  const name = label.trim();
  if (!name) return sources;
  return sources.map((s) => (s.id === id ? { ...s, label: name } : s));
}

export function removeSource(sources: LeadSource[], id: string): LeadSource[] {
  return sources.filter((s) => s.id !== id);
}

// `source` used to be free text, so whatever the owner typed is already sitting
// in real leads. Anything that doesn't match a seeded source becomes a source of
// its own instead of being dropped: the ids are the seeded labels precisely so
// that "Referido" typed last month lands on the seeded "Referido" and not on a
// duplicate. Idempotent, so it can run on every load.
export function migrateSources(
  sources: LeadSource[],
  leadSourceValues: (string | undefined)[],
): LeadSource[] {
  const known = new Set(sources.map((s) => s.id));
  const merged = sources.slice();
  for (const raw of leadSourceValues) {
    const value = (raw ?? "").trim();
    if (!value || known.has(value)) continue;
    known.add(value);
    merged.push({ id: value, label: value });
  }
  return merged;
}
