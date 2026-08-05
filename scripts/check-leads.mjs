// Checks for src/lib/leads.ts: the pure logic behind the lead card. No deps, no
// framework: Node strips the types and imports the real module, so this exercises
// the shipped code, not a copy. Same shape as scripts/check-sync.mjs.
//   node scripts/check-leads.mjs
import assert from "node:assert/strict";

const { cleanLead, contactLink, isOverdue, phoneDigits } = await import("../src/lib/leads.ts");

let checks = 0;
const check = (name, fn) => {
  fn();
  checks++;
  console.log(`  ok  ${name}`);
};

// ------------------------------------------------------------------- contact
check("an email address becomes a mailto: link", () => {
  for (const value of ["juan@obra.com", "JUAN.PEREZ@estudio.com.ar", "  ana@x.io  "]) {
    const link = contactLink(value);
    assert.equal(link.kind, "email", `not read as email: ${value}`);
    assert.equal(link.href, `mailto:${value.trim()}`);
  }
});

check("a phone number becomes a wa.me link", () => {
  for (const value of ["+54 9 11 5555-4444", "1155554444", "(011) 4555-4444", "011.4555.4444"]) {
    const link = contactLink(value);
    assert.equal(link.kind, "phone", `not read as phone: ${value}`);
    assert.match(link.href, /^https:\/\/wa\.me\/\d+$/, `not a clean wa.me url: ${value}`);
  }
});

check("anything unparseable stays plain text with no href", () => {
  for (const value of [
    "el hijo de Marta", // a note, not a contact
    "@juanpisos", // an Instagram handle: has no dotted domain
    "juan@obra", // no TLD
    "1234", // too few digits to dial
    "11 5555 4444 preguntar por Ana", // digits, but not a number you can dial
    "",
    "   ",
    undefined,
  ]) {
    const link = contactLink(value);
    assert.equal(link.kind, "text", `should not have been linked: ${value}`);
    assert.equal(link.href, undefined, `emitted a broken link for: ${value}`);
  }
});

// --------------------------------------------------------------- wa.me digits
check("phone normalization strips spaces, dashes, parens, dots and the +", () => {
  assert.equal(phoneDigits("+54 9 11 5555-4444"), "5491155554444");
  assert.equal(phoneDigits("(011) 4555-4444"), "01145554444");
  assert.equal(phoneDigits("+54.11.5555.4444"), "541155554444");
  assert.equal(phoneDigits("5491155554444"), "5491155554444", "already clean, left alone");
  assert.equal(phoneDigits("+++"), "");
});

check("the same number in five formats yields one wa.me url", () => {
  const urls = new Set(
    ["+5491155554444", "+54 9 11 5555 4444", "+54-9-11-5555-4444", "+54 (9) 11 5555.4444", "5491155554444"].map(
      (v) => contactLink(v).href,
    ),
  );
  assert.deepEqual([...urls], ["https://wa.me/5491155554444"]);
});

// ------------------------------------------------------------------- overdue
check("a next step dated before today is overdue", () => {
  const today = "2026-08-04";
  assert.equal(isOverdue("2026-08-03", today), true, "yesterday is overdue");
  assert.equal(isOverdue("2026-07-31", today), true, "crossing a month still compares right");
  assert.equal(isOverdue("2025-12-31", today), true, "crossing a year still compares right");
});

check("today is NOT overdue, the user still has the day", () => {
  assert.equal(isOverdue("2026-08-04", "2026-08-04"), false);
  assert.equal(isOverdue("2026-01-01", "2026-01-01"), false);
});

check("a future date is not overdue", () => {
  const today = "2026-08-04";
  assert.equal(isOverdue("2026-08-05", today), false);
  assert.equal(isOverdue("2026-09-01", today), false);
});

check("no date means nothing to miss", () => {
  assert.equal(isOverdue(undefined, "2026-08-04"), false, "a lead with no date is not late");
  assert.equal(isOverdue("", "2026-08-04"), false, "an empty date is not late either");
});

// ------------------------------------------------------------------ cleanLead
check("cleanLead trims values and drops the empty ones", () => {
  assert.deepEqual(cleanLead({ name: "  Juan Pérez ", contact: "", source: "  ", nextStep: "Mandar muestras" }), {
    name: "Juan Pérez",
    nextStep: "Mandar muestras",
  });
});

check("an all-empty form stores nothing at all", () => {
  assert.equal(cleanLead({}), undefined);
  assert.equal(cleanLead({ name: "", contact: "   ", nextStepDate: undefined }), undefined);
});

console.log(`check-leads: OK, ${checks} checks`);
