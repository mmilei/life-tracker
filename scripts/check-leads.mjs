// Checks for src/lib/leads.ts: the pure logic behind the lead card. No deps, no
// framework: Node strips the types and imports the real module, so this exercises
// the shipped code, not a copy. Same shape as scripts/check-sync.mjs.
//   node scripts/check-leads.mjs
import assert from "node:assert/strict";

const {
  cleanLead,
  contactLink,
  isOverdue,
  phoneDigits,
  FIXED_FIRST_STAGE,
  FIXED_LAST_STAGE,
  MAX_STAGES,
  addStage,
  canAddStage,
  migrateSources,
  nameTaken,
  normalizeStages,
  reassignStage,
  removeStage,
  renameStage,
  sourceLabel,
} = await import("../src/lib/leads.ts");

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

// -------------------------------------------------------------------- stages
// A board is always the two fixed stages plus whatever the user added between
// them. Every check below builds one with `pipeline(n)` middles.
const FIXED_ONLY = [{ id: FIXED_FIRST_STAGE }, { id: FIXED_LAST_STAGE }];
const pipeline = (middles) =>
  Array.from({ length: middles }).reduce((stages, _, i) => addStage(stages, `Etapa ${i + 1}`), FIXED_ONLY);
const ids = (stages) => stages.map((s) => s.id);

check("the fixed stages stay at both ends no matter how many are in between", () => {
  for (const middles of [0, 1, 4]) {
    const stages = pipeline(middles);
    assert.equal(stages.length, middles + 2, `lost a stage with ${middles} middles`);
    assert.equal(stages[0].id, FIXED_FIRST_STAGE, `first stage moved with ${middles} middles`);
    assert.equal(
      stages[stages.length - 1].id,
      FIXED_LAST_STAGE,
      `closing stage moved with ${middles} middles`,
    );
  }
});

check("a new stage lands before the closing one, never at the end", () => {
  const stages = addStage(pipeline(2), "Presupuesto");
  assert.equal(stages[stages.length - 1].id, FIXED_LAST_STAGE, "the new stage was appended after Cerrado");
  assert.equal(stages[stages.length - 2].label, "Presupuesto", "the new stage is not the last editable slot");
});

// Regression for 2026-08-05: a sync merge (see check-sync.mjs) could leave
// Cerrado in the middle of the array. There is no reorder UI, so this is the
// only thing that puts it back.
check("normalizeStages repairs Nuevo/Cerrado to first/last without touching the rest", () => {
  const scrambled = [
    { id: "Contactado", label: "Contactadisimo" },
    { id: FIXED_LAST_STAGE },
    { id: "Negociando", label: "Presupuestadisimo" },
    { id: FIXED_FIRST_STAGE },
  ];
  const fixed = normalizeStages(scrambled);
  assert.equal(fixed[0].id, FIXED_FIRST_STAGE, "Nuevo is not first");
  assert.equal(fixed.at(-1).id, FIXED_LAST_STAGE, "Cerrado is not last");
  assert.deepEqual(
    fixed.slice(1, -1).map((s) => s.id),
    ["Contactado", "Negociando"],
    "the relative order of the user's own stages changed",
  );
});

check("normalizeStages returns the exact same array when the order is already correct", () => {
  const ok = pipeline(2);
  assert.equal(normalizeStages(ok), ok, "reordered an array that needed no repair");
});

check("normalizeStages leaves an array with no fixed stages alone", () => {
  const noFixed = [{ id: "a" }, { id: "b" }];
  assert.equal(normalizeStages(noFixed), noFixed, "touched an array it has nothing safe to anchor on");
});

check("deleting a stage sends its leads to the FIRST stage, not the closing one", () => {
  const stages = pipeline(2);
  const doomed = stages[1].id;
  const survivor = stages[2].id;
  const left = removeStage(stages, doomed);
  assert.equal(left.length, stages.length - 1, "the stage was not removed");
  assert.equal(reassignStage(doomed, left), FIXED_FIRST_STAGE, "an orphaned lead did not go back to the first stage");
  assert.equal(reassignStage(survivor, left), survivor, "a lead in a surviving stage was moved anyway");
  assert.equal(reassignStage(undefined, left), FIXED_FIRST_STAGE, "a lead with no stage did not get one");
});

check("renaming a stage keeps its id, so no lead has to be rewritten", () => {
  const stages = pipeline(2);
  const target = stages[1].id;
  const renamed = renameStage(stages, target, "Visita a obra");
  assert.deepEqual(ids(renamed), ids(stages), "renaming changed an id: every lead in that stage is now orphaned");
  assert.equal(renamed[1].label, "Visita a obra", "the label was not updated");
  assert.equal(reassignStage(target, renamed), target, "a lead in the renamed stage was moved");
});

check("the fixed stages refuse both deletion and renaming", () => {
  const stages = pipeline(2);
  for (const fixed of [FIXED_FIRST_STAGE, FIXED_LAST_STAGE]) {
    assert.deepEqual(removeStage(stages, fixed), stages, `${fixed} was deleted`);
    assert.deepEqual(renameStage(stages, fixed, "Otra cosa"), stages, `${fixed} was renamed`);
  }
});

check("the board stops at six stages", () => {
  const full = pipeline(MAX_STAGES - 2);
  assert.equal(full.length, MAX_STAGES, "could not fill the board up to the cap");
  assert.equal(canAddStage(full), false, "the cap is not reported as reached");
  assert.deepEqual(addStage(full, "Una más"), full, "a seventh stage got in");
  assert.equal(canAddStage(pipeline(MAX_STAGES - 3)), true, "one slot short of the cap should still accept a stage");
});

// The fixed stages are stored under Spanish ids but rendered from the
// dictionary, so the duplicate check has to run on what is on screen. In
// English "New" is a free id and a taken label at the same time.
check("a name already on screen is taken, whatever the stored id says", () => {
  const onScreen = ["New", "Contacted", "Closed"];
  assert.equal(nameTaken(onScreen, "New"), true, "the visible label of a fixed stage was allowed twice");
  assert.equal(nameTaken(onScreen, "  contacted  "), true, "case and padding should not smuggle a duplicate in");
  assert.equal(nameTaken(onScreen, "Nuevo"), false, "the stored id is not what the user sees, so it is free");
  assert.equal(nameTaken([], "Anything"), false, "nothing is taken on an empty list");
});

// ------------------------------------------------------------------- sources
const SEEDED = ["Referido", "Showroom", "Instagram"].map((label) => ({ id: label, label }));

check("migrating free-text sources adopts the unknown ones and duplicates nothing", () => {
  const once = migrateSources(SEEDED, ["Referido", "Feria de la construcción", undefined, "  ", "Referido"]);
  assert.deepEqual(
    once.map((s) => s.id),
    [...SEEDED.map((s) => s.id), "Feria de la construcción"],
    "a seeded source was duplicated, or the typed one was dropped",
  );
  const twice = migrateSources(once, ["Referido", "Feria de la construcción"]);
  assert.deepEqual(twice, once, "migration is not idempotent: it grows on every load");
});

check("a source id that is not in the list still renders as its own text", () => {
  assert.equal(sourceLabel(SEEDED, "Referido"), "Referido");
  assert.equal(sourceLabel(SEEDED, "Un vecino"), "Un vecino", "an old free-text lead lost its source on screen");
  assert.equal(sourceLabel(SEEDED, undefined), undefined, "a lead with no source should render nothing");
  assert.equal(sourceLabel(SEEDED, "   "), undefined);
});

console.log(`check-leads: OK, ${checks} checks`);
