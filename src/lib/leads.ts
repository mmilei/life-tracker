// Lead card logic: how a contact string becomes a link, and when a next step is
// late. Pure functions only: scripts/check-leads.mjs imports this file directly
// (Node strips the types), so nothing here may pull in React. The one import is
// type-only, which Node erases before it ever tries to resolve the `@/` alias.

import type { LeadDetails } from "@/types";

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
