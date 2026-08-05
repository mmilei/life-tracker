// i18n — hand-rolled, two languages, no dependency.
//
// KEY CONVENTION (mandatory): `<domain>.<element>`
// The domain is the folder the component lives in:
//
//   nav       -> src/App.tsx + src/components/common/Sidebar.tsx (shell & navigation)
//   week      -> src/components/week/*
//   habits    -> src/components/habits/*
//   workout   -> src/components/workout/*
//   business  -> src/components/business/*
//   home      -> src/components/home/*
//   common    -> src/components/common/* + anything shared (save, cancel, delete, add…)
//
// One domain is not a folder: `sync` covers the GitHub backup
// (src/components/home/GitHubSyncPanel.tsx + src/lib/sync*.ts). It lives under
// home/ but has its own vocabulary, and it would drown the home domain.
//
// Cross-domain use is allowed when a component renders another domain's vocabulary.
// The only cases in this app:
//   - home/WeeklySummaryCard.tsx uses `week.weekOf` and `week.deletedArea`.
//   - home/TodayChecklist.tsx, habits/HabitRow.tsx use `common.completed`.
//   - common/StreakFlame.tsx uses `common.streak`.
// Do NOT duplicate a string under two keys — reuse the existing one.
//
// INTERPOLATION: `{name}` placeholders, substituted by `t(lang, key, { name })`.
// No plurals, no formatting, no nesting. If a string needs more than that, split it.
//
// NOT IN HERE (on purpose):
//   - Seed data (habit/area/note-type/muscle-group names) lives in src/lib/seed.ts,
//     per language. It's user data after the first run, not UI copy.
//   - Lead pipeline stages are STORED verbatim in Note.status, so LEAD_STATUSES keeps
//     its Spanish values as stable ids; only the label is translated
//     (`business.leadNew` … `business.leadClosed`).
//   - Date formatting: src/lib/dates.ts holds the active locale (`setDateLocale`,
//     `getLocale`), set by AppStore. Use `getLocale()` for ad-hoc toLocaleDateString.

export type Lang = "es" | "en";

export const LANGS: Lang[] = ["es", "en"];

const dict: Record<Lang, Record<string, string>> = {
  es: {
    // nav — shell & navigation
    "nav.appTitle": "Mi Vida",
    "nav.sections": "Secciones",
    "nav.home": "Home",
    "nav.habits": "Hábitos",
    "nav.week": "Semana",
    "nav.workout": "Entreno",
    "nav.business": "Negocio",
    "nav.language": "Idioma",
    "nav.comingSoon": "Próximamente",

    // common — shared controls and copy
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.add": "Agregar",
    "common.edit": "Editar",
    "common.done": "Listo",
    "common.completed": "hecho",
    "common.deleteTitle": "¿Eliminar?",
    "common.deleteAria": "Eliminar {name}",
    "common.deleteUndone": "Esta acción no se puede deshacer.",
    "common.deleteConfirm": "Se eliminará \"{name}\". Esta acción no se puede deshacer.",
    "common.pin": "Fijar {name}",
    "common.unpin": "Quitar {name}",
    "common.color": "Color {color}",
    "common.streak": "Racha de {n} días",

    // home
    "home.title": "Inicio",
    "home.todayHabits": "Hábitos de hoy",
    "home.todayHabitsAria": "Hábitos de hoy: {pct}%",
    "home.noHabits": "No hay hábitos todavía.",
    "home.noHabitsShort": "sin hábitos",
    "home.doneToday": "{done}/{total} hoy",
    "home.indicators": "Indicadores",
    "home.noPins": "No hay indicadores fijados. Tocá “Editar” para elegir hasta 4.",
    "home.kpiHighestStreak": "Racha más alta",
    "home.kpiWeekAvg": "Promedio semanal",
    "home.kpiWorkoutsWeek": "Entrenos semana",
    "home.kpiActiveLeads": "Leads activos",
    "home.kpiTodayHabits": "Hábitos hoy",
    "home.kpiActiveHabits": "Hábitos activos",
    "home.unitDays": "días",
    "home.unitThisWeek": "esta semana",
    "home.unitLeads": "leads",
    "home.unitToday": "hoy",
    "home.unitHabits": "hábitos",
    "home.notRated": "Todavía no puntuaste esta semana. Andá a Semana para empezar.",
    "home.backup": "Respaldo",
    "home.exportBackup": "Exportar backup",
    "home.importBackup": "Importar backup",
    "home.backupExported": "Backup exportado.",
    "home.importError": "Archivo inválido. No se pudo importar.",
    "home.importWarning": "Importar reemplaza todos los datos actuales con los del archivo.",

    // sync — respaldo automático en GitHub (home/GitHubSyncPanel.tsx)
    "sync.title": "Sync con GitHub",
    "sync.description":
      "Guarda una copia de tus datos en un repo privado tuyo y la baja al abrir la app. Si no hay conexión, la app funciona igual.",
    "sync.configure": "Configurar",
    "sync.syncNow": "Sincronizar ahora",
    "sync.disconnect": "Desconectar",
    "sync.settingsTitle": "Sync con GitHub",
    "sync.settingsDescription": "Un repo privado tuyo como respaldo. Nada sale de tu máquina sin esto.",
    "sync.token": "Token de acceso",
    "sync.tokenPlaceholder": "github_pat_…",
    "sync.tokenHint":
      "Token fine-grained con permiso de Contents (lectura y escritura) sobre ese repo. Se guarda solo en este navegador.",
    "sync.repo": "Repositorio",
    "sync.repoPlaceholder": "usuario/repo",
    "sync.path": "Ruta del archivo",
    "sync.invalidConfig": "Falta el token o el repo no tiene formato usuario/repo.",
    "sync.stateOff": "Sin configurar. Tus datos viven solo en este navegador.",
    "sync.stateSyncing": "Sincronizando…",
    "sync.stateSynced": "Sincronizado — {time}",
    "sync.errorAuth": "GitHub rechazó el token. Puede estar vencido o sin permiso sobre el repo.",
    "sync.errorNotFound": "No se encontró el repo o la ruta.",
    "sync.errorConflict": "El archivo remoto cambió mientras se guardaba.",
    "sync.errorCorrupt": "El archivo remoto no tiene el formato esperado.",
    "sync.errorNetwork": "No se pudo contactar a GitHub.",
    "sync.errorUnknown": "Falló la sincronización.",
    "sync.errorHint": "Tus datos locales están intactos. Revisá la configuración y probá de nuevo.",

    // week
    "week.title": "Semana",
    "week.weekOf": "Semana del {date}",
    "week.empty": "Todavía no hay áreas. Agregá la primera para empezar a puntuar tu semana.",
    "week.history": "Historial",
    "week.deletedArea": "(área eliminada)",
    "week.rateArea": "Puntuar {name}",
    "week.addArea": "Agregar área",
    "week.newAreaTitle": "Nueva área de vida",
    "week.newAreaDescription": "Un aspecto que querés puntuar cada semana.",
    "week.areaPlaceholder": "Ej: Finanzas, Sueño, Amistades…",

    // habits
    "habits.title": "Hábitos",
    "habits.empty": "Todavía no hay hábitos. Agregá el primero para empezar a marcar tus días.",
    "habits.add": "Agregar hábito",
    "habits.newTitle": "Nuevo hábito",
    "habits.newDescription": "Algo que querés sostener todos los días.",
    "habits.namePlaceholder": "Ej: Entrenar, Leer, Meditar…",
    "habits.dayAria": "{name} — {date}",

    // workout
    "workout.title": "Entreno",
    "workout.empty":
      "Todavía no registraste entrenos. Agregá el primero para empezar a seguir tu progreso.",
    "workout.firstSession": "Registrá tu primera sesión",
    "workout.entries": "{n} registros",
    "workout.add": "Registrar entreno",
    "workout.newTitle": "Nuevo registro",
    "workout.newDescription": "Un ejercicio de tu sesión de hoy.",
    "workout.muscleGroup": "Grupo muscular",
    "workout.exercise": "Ejercicio",
    "workout.exercisePlaceholder": "Ej: Press banca, Sentadilla…",
    "workout.sets": "Series",
    "workout.reps": "Reps",
    "workout.weight": "Peso (kg)",
    "workout.date": "Fecha",
    "workout.chartExercise": "Ejercicio a graficar",
    "workout.metricWeight": "Peso",
    "workout.metricReps": "Reps",
    "workout.chartEmpty": "Registrá al menos 2 sesiones de este ejercicio para ver el progreso.",

    // business
    "business.title": "Negocio",
    "business.notes": "Notas",
    "business.leads": "Leads",
    "business.notesCount": "{n} notas",
    "business.leadsCount": "{n} leads",
    "business.addNote": "Agregar nota",
    "business.addLead": "Agregar lead",
    "business.newTitle": "Nueva entrada",
    "business.newDescription": "Una nota o un lead de tu negocio.",
    "business.type": "Tipo",
    "business.note": "Nota",
    "business.notePlaceholder": "Escribí tu nota…",
    "business.leadName": "Nombre",
    "business.leadNamePlaceholder": "Ej: Juan Pérez",
    "business.leadContact": "Contacto",
    "business.leadContactPlaceholder": "Teléfono, mail o WhatsApp",
    "business.leadSource": "Origen",
    "business.leadSourcePlaceholder": "¿De dónde salió?",
    "business.sourceReferral": "Referido",
    "business.sourceShowroom": "Showroom",
    "business.sourceInstagram": "Instagram",
    "business.sourceWeb": "Web",
    "business.sourceArchitect": "Arquitecto o estudio",
    "business.sourceSite": "Obra en curso",
    "business.leadNextStep": "Próximo paso",
    "business.leadNextStepPlaceholder": "¿Qué falta para que avance?",
    "business.leadNextStepDate": "Fecha del próximo paso",
    "business.leadDetail": "Detalle",
    "business.leadPlaceholder": "m2, dirección de la obra, producto que miró…",
    "business.leadNoNextStep": "Sin próximo paso",
    "business.leadOverdue": "Vencido",
    "business.editLeadTitle": "Editar lead",
    "business.editLeadDescription": "Actualizá los datos y el próximo paso.",
    "business.editLeadAria": "Editar {name}",
    "business.stage": "Etapa",
    "business.stageOf": "Etapa de {name}",
    "business.notesEmpty": "Todavía no hay notas. Agregá la primera para empezar a registrar tus ideas.",
    "business.leadsEmpty": "Todavía no hay leads. Agregá el primero para empezar a seguir tu pipeline.",
    "business.leadNew": "Nuevo",
    "business.leadContacted": "Contactado",
    "business.leadNegotiating": "Negociando",
    "business.leadClosed": "Cerrado",
  },

  en: {
    // nav — shell & navigation
    "nav.appTitle": "My Life",
    "nav.sections": "Sections",
    "nav.home": "Home",
    "nav.habits": "Habits",
    "nav.week": "Week",
    "nav.workout": "Workout",
    "nav.business": "Business",
    "nav.language": "Language",
    "nav.comingSoon": "Coming soon",

    // common — shared controls and copy
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.add": "Add",
    "common.edit": "Edit",
    "common.done": "Done",
    "common.completed": "completed",
    "common.deleteTitle": "Delete?",
    "common.deleteAria": "Delete {name}",
    "common.deleteUndone": "This can't be undone.",
    "common.deleteConfirm": "This will delete \"{name}\". This can't be undone.",
    "common.pin": "Pin {name}",
    "common.unpin": "Unpin {name}",
    "common.color": "Color {color}",
    "common.streak": "{n}-day streak",

    // home
    "home.title": "Home",
    "home.todayHabits": "Today's habits",
    "home.todayHabitsAria": "Today's habits: {pct}%",
    "home.noHabits": "No habits yet.",
    "home.noHabitsShort": "no habits",
    "home.doneToday": "{done}/{total} today",
    "home.indicators": "Indicators",
    "home.noPins": "No indicators pinned. Tap “Edit” to choose up to 4.",
    "home.kpiHighestStreak": "Longest streak",
    "home.kpiWeekAvg": "Weekly average",
    "home.kpiWorkoutsWeek": "Workouts this week",
    "home.kpiActiveLeads": "Active leads",
    "home.kpiTodayHabits": "Habits today",
    "home.kpiActiveHabits": "Active habits",
    "home.unitDays": "days",
    "home.unitThisWeek": "this week",
    "home.unitLeads": "leads",
    "home.unitToday": "today",
    "home.unitHabits": "habits",
    "home.notRated": "You haven't rated this week yet. Head to Week to start.",
    "home.backup": "Backup",
    "home.exportBackup": "Export backup",
    "home.importBackup": "Import backup",
    "home.backupExported": "Backup exported.",
    "home.importError": "Invalid file. Nothing was imported.",
    "home.importWarning": "Importing replaces all of your current data with the file's.",

    // sync — automatic GitHub backup (home/GitHubSyncPanel.tsx)
    "sync.title": "GitHub sync",
    "sync.description":
      "Keeps a copy of your data in a private repo of yours and pulls it back when you open the app. With no connection, the app works the same.",
    "sync.configure": "Configure",
    "sync.syncNow": "Sync now",
    "sync.disconnect": "Disconnect",
    "sync.settingsTitle": "GitHub sync",
    "sync.settingsDescription": "A private repo of yours as backup. Nothing leaves your machine without this.",
    "sync.token": "Access token",
    "sync.tokenPlaceholder": "github_pat_…",
    "sync.tokenHint":
      "Fine-grained token with Contents (read and write) permission on that repo. Stored in this browser only.",
    "sync.repo": "Repository",
    "sync.repoPlaceholder": "owner/repo",
    "sync.path": "File path",
    "sync.invalidConfig": "Missing token, or the repo isn't in owner/repo form.",
    "sync.stateOff": "Not configured. Your data lives only in this browser.",
    "sync.stateSyncing": "Syncing…",
    "sync.stateSynced": "Synced — {time}",
    "sync.errorAuth": "GitHub rejected the token. It may be expired or lack access to the repo.",
    "sync.errorNotFound": "Repo or path not found.",
    "sync.errorConflict": "The remote file changed while saving.",
    "sync.errorCorrupt": "The remote file isn't in the expected format.",
    "sync.errorNetwork": "Couldn't reach GitHub.",
    "sync.errorUnknown": "Sync failed.",
    "sync.errorHint": "Your local data is intact. Check the settings and try again.",

    // week
    "week.title": "Week",
    "week.weekOf": "Week of {date}",
    "week.empty": "No life areas yet. Add your first one to start rating your week.",
    "week.history": "History",
    "week.deletedArea": "(deleted area)",
    "week.rateArea": "Rate {name}",
    "week.addArea": "Add area",
    "week.newAreaTitle": "New life area",
    "week.newAreaDescription": "Something you want to rate every week.",
    "week.areaPlaceholder": "e.g. Finances, Sleep, Friendships…",

    // habits
    "habits.title": "Habits",
    "habits.empty": "No habits yet. Add your first one to start checking off days.",
    "habits.add": "Add habit",
    "habits.newTitle": "New habit",
    "habits.newDescription": "Something you want to keep up every day.",
    "habits.namePlaceholder": "e.g. Workout, Read, Meditate…",
    "habits.dayAria": "{name} — {date}",

    // workout
    "workout.title": "Workout",
    "workout.empty": "No workouts logged yet. Add your first one to start tracking progress.",
    "workout.firstSession": "Log your first session",
    "workout.entries": "{n} entries",
    "workout.add": "Log workout",
    "workout.newTitle": "New entry",
    "workout.newDescription": "One exercise from today's session.",
    "workout.muscleGroup": "Muscle group",
    "workout.exercise": "Exercise",
    "workout.exercisePlaceholder": "e.g. Bench press, Squat…",
    "workout.sets": "Sets",
    "workout.reps": "Reps",
    "workout.weight": "Weight (kg)",
    "workout.date": "Date",
    "workout.chartExercise": "Exercise to chart",
    "workout.metricWeight": "Weight",
    "workout.metricReps": "Reps",
    "workout.chartEmpty": "Log at least 2 sessions of this exercise to see your progress.",

    // business
    "business.title": "Business",
    "business.notes": "Notes",
    "business.leads": "Leads",
    "business.notesCount": "{n} notes",
    "business.leadsCount": "{n} leads",
    "business.addNote": "Add note",
    "business.addLead": "Add lead",
    "business.newTitle": "New entry",
    "business.newDescription": "A note or a lead for your business.",
    "business.type": "Type",
    "business.note": "Note",
    "business.notePlaceholder": "Write your note…",
    "business.leadName": "Name",
    "business.leadNamePlaceholder": "e.g. Jane Doe",
    "business.leadContact": "Contact",
    "business.leadContactPlaceholder": "Phone, email or WhatsApp",
    "business.leadSource": "Source",
    "business.leadSourcePlaceholder": "Where did it come from?",
    "business.sourceReferral": "Referral",
    "business.sourceShowroom": "Showroom",
    "business.sourceInstagram": "Instagram",
    "business.sourceWeb": "Website",
    "business.sourceArchitect": "Architect or studio",
    "business.sourceSite": "Job site",
    "business.leadNextStep": "Next step",
    "business.leadNextStepPlaceholder": "What has to happen for this to move?",
    "business.leadNextStepDate": "Next step date",
    "business.leadDetail": "Detail",
    "business.leadPlaceholder": "sqm, job address, product they looked at…",
    "business.leadNoNextStep": "No next step",
    "business.leadOverdue": "Overdue",
    "business.editLeadTitle": "Edit lead",
    "business.editLeadDescription": "Update the details and the next step.",
    "business.editLeadAria": "Edit {name}",
    "business.stage": "Stage",
    "business.stageOf": "Stage of {name}",
    "business.notesEmpty": "No notes yet. Add your first one to start capturing your ideas.",
    "business.leadsEmpty": "No leads yet. Add your first one to start tracking your pipeline.",
    "business.leadNew": "New",
    "business.leadContacted": "Contacted",
    "business.leadNegotiating": "Negotiating",
    "business.leadClosed": "Closed",
  },
};

export const DEFAULT_LANG: Lang = "es";

export type Vars = Record<string, string | number>;

// Missing key = warn in dev, render the key itself. Never throws: a typo in one
// label must not blank the app.
export function t(lang: Lang, key: string, vars?: Vars): string {
  const str = dict[lang][key];
  if (str === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}" for lang "${lang}"`);
    return key;
  }
  return vars ? str.replace(/\{(\w+)\}/g, (m, name) => String(vars[name] ?? m)) : str;
}

export function isLang(v: unknown): v is Lang {
  return v === "es" || v === "en";
}
