import type { Habit, LifeArea, MuscleGroup, NoteType } from "@/types";
import { todayISO } from "@/lib/dates";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

// Seed data, per language. Deliberately NOT in the i18n dictionary: the moment it's
// written to localStorage it stops being UI copy and becomes the user's own data.
// Switching language later never retranslates it — names the user owns stay theirs.

// Fixed color cycle so seeded habits get distinct, intentional-looking colors out of the box.
const HABIT_COLORS = ["#FF6A3D", "#FFB020", "#3ECF8E", "#6E7BFF", "#9AA0B4"];

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
