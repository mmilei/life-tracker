import type { Habit, LeadSource, LeadStage, LifeArea, MuscleGroup, NoteType } from "@/types";
import { FIXED_FIRST_STAGE, FIXED_LAST_STAGE } from "@/lib/leads";
import { todayISO } from "@/lib/dates";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

// Seed data, per language. Deliberately NOT in the i18n dictionary: the moment it's
// written to localStorage it stops being UI copy and becomes the user's own data.
// Switching language later never retranslates it — names the user owns stay theirs.

// The palette a habit can be painted with: seeded habits cycle through it, and
// ColorPicker offers exactly these (it re-exports the list, so there is one array
// and not two that drift). It lives here, in a module with no React imports, so a
// component can depend on it without the dependency pointing the wrong way.
//
// The first four ARE the theme tokens of index.css (ember, amber, mint, iris) and
// the last is its muted text grey. Until now this list and ColorPicker's carried
// the old bright palette from the dark design (#FF6A3D, #FFB020, #3ECF8E), so Home
// showed a bright orange ring twenty centimeters from a burnt orange bar and read
// as two apps. Those bright values also failed on the cream ground: as swatches
// they are non-text UI, which asks for 3:1 against #faf9f5, and #FFB020 reached
// 1.7:1, #3ECF8E 1.9:1, #9AA0B4 2.4:1, #FF6A3D 2.7:1. Every value below clears 3:1.
//
// Colors already chosen by the user are stored per habit and are NOT touched: this
// only changes what is on offer from here on. ColorPicker keeps showing a legacy
// color as its own swatch so an old habit still reads as selected.
export const HABIT_COLORS = [
  "#dd5528", // ember   3.7:1 - the accent token
  "#b57611", // amber   3.6:1
  "#1f9d63", // mint    3.3:1
  "#5159d6", // iris    5.3:1
  "#6f6d64", // grey    4.9:1 - the muted text token
  "#c62f45", // crimson 5.1:1 - red kept apart from ember by hue, not by brightness
  "#6d28d9", // violet  6.7:1
  "#b83280", // magenta 5.2:1
];

const habit = (name: string, i: number): Habit => ({
  id: crypto.randomUUID(),
  name,
  color: HABIT_COLORS[i % HABIT_COLORS.length],
  createdAt: todayISO(),
});

const HABITS: Record<Lang, string[]> = {
  es: ["Entrenar", "Leer", "Meditar", "Escribir", "Skin care"],
  en: ["Workout", "Read", "Meditate", "Write", "Skin care"],
};

const AREAS: Record<Lang, string[]> = {
  es: ["Negocios", "Marca personal", "Gimnasio", "Belleza", "Relación", "Mentalidad", "Resultados"],
  en: ["Business", "Personal brand", "Gym", "Looks", "Relationship", "Mindset", "Results"],
};

const NOTE_TYPES: Record<Lang, string[]> = {
  es: ["Quiero mejorar", "Logré", "Reflexión", "Otro"],
  en: ["Want to improve", "Achieved", "Reflection", "Other"],
};

const MUSCLE_GROUPS: Record<Lang, string[]> = {
  es: ["Pierna", "Pecho", "Espalda", "Hombro", "Brazo", "Core"],
  en: ["Legs", "Chest", "Back", "Shoulders", "Arms", "Core"],
};

export const seedHabits = (lang: Lang = DEFAULT_LANG): Habit[] => HABITS[lang].map(habit);

export const seedLifeAreas = (lang: Lang = DEFAULT_LANG): LifeArea[] =>
  AREAS[lang].map((name) => ({ id: crypto.randomUUID(), name }));

// 'lead' id is fixed — the Business tab filters Leads on typeId === 'lead'.
export const seedNoteTypes = (lang: Lang = DEFAULT_LANG): NoteType[] => [
  ...NOTE_TYPES[lang].map((label) => ({ id: crypto.randomUUID(), label })),
  { id: "lead", label: "Lead" },
];

export const seedMuscleGroups = (lang: Lang = DEFAULT_LANG): MuscleGroup[] =>
  MUSCLE_GROUPS[lang].map((name) => ({ id: crypto.randomUUID(), name }));

// The two stages the app owns get no label: they are translated at render time
// from the dictionary. The middle two are seeded in the chosen language and are
// the user's from then on: renaming them is a rename, not a translation.
//
// Their ids are the Spanish strings in EVERY language on purpose: Note.status
// has been storing exactly those since before stages were configurable, so any
// other id would orphan the leads already on the board.
const MIDDLE_STAGES: Record<Lang, string[]> = {
  es: ["Contactado", "Negociando"],
  en: ["Contacted", "Negotiating"],
};
const MIDDLE_STAGE_IDS = ["Contactado", "Negociando"];

export const seedLeadStages = (lang: Lang = DEFAULT_LANG): LeadStage[] => [
  { id: FIXED_FIRST_STAGE },
  ...MIDDLE_STAGE_IDS.map((id, i) => ({ id, label: MIDDLE_STAGES[lang][i] })),
  { id: FIXED_LAST_STAGE },
];

// Sources seed as id === label for the same reason: leads created while `source`
// was free text stored the visible string, so seeding by label makes those leads
// match the seeded source instead of spawning a duplicate.
const SOURCES: Record<Lang, string[]> = {
  es: ["Referido", "Showroom", "Instagram", "Web", "Arquitecto o estudio", "Obra en curso"],
  en: ["Referral", "Showroom", "Instagram", "Website", "Architect or studio", "Job site"],
};

export const seedLeadSources = (lang: Lang = DEFAULT_LANG): LeadSource[] =>
  SOURCES[lang].map((label) => ({ id: label, label }));
