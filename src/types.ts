// Data model.
// Dates are ISO day strings "YYYY-MM-DD" unless noted. IDs are crypto.randomUUID().

export interface Habit {
  id: string;
  name: string;
  color: string; // hex, chosen from ColorPicker
  createdAt: string; // ISO day
}

// Presence of a log == habit done that day. Toggling off deletes the entry.
export interface HabitLog {
  habitId: string;
  date: string; // ISO day
}

export interface LifeArea {
  id: string;
  name: string;
}

export interface WeeklyRating {
  weekStart: string; // ISO day, Sunday
  areaId: string;
  score: number; // 1-10
}

export interface MuscleGroup {
  id: string;
  name: string;
}

export interface Workout {
  id: string;
  date: string; // ISO day
  muscleGroupId: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number; // kg
}

export interface NoteType {
  id: string; // 'lead' is the special id the Business tab filters on
  label: string;
}

// Everything the owner wants to know about a lead beyond the free text. Kept as
// a sub-object so plain notes never carry these fields. Every field is optional:
// leads created before this existed have none of them and still render.
export interface LeadDetails {
  name?: string; // who the lead is, the card title when present
  contact?: string; // phone, mail or WhatsApp, free text (see src/lib/leads.ts)
  source?: string; // where the lead came from, free text with suggestions
  nextStep?: string; // what has to happen for the deal to move
  nextStepDate?: string; // ISO day
}

export interface Note {
  id: string;
  typeId: string; // references NoteType.id
  text: string; // free field: sqm, job address, product they looked at…
  createdAt: string; // ISO day
  status?: string; // only used when typeId === 'lead' (LeadBoard column)
  lead?: LeadDetails; // only used when typeId === 'lead'
}

export interface HomePin {
  id: string;
  type: string; // e.g. 'habit-streak' | 'area' | 'workout' — free string
  refId: string; // id of the referenced entity
  label: string;
}
