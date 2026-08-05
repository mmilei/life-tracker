import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useHabits } from "@/hooks/useHabits";
import { useLifeAreas } from "@/hooks/useLifeAreas";
import { useWeeklyRatings } from "@/hooks/useWeeklyRatings";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useNotes } from "@/hooks/useNotes";
import { useLeadConfig } from "@/hooks/useLeadConfig";
import { useHomePins } from "@/hooks/useHomePins";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { DEFAULT_LANG, t, type Lang, type Vars } from "@/lib/i18n";
import { setDateLocale } from "@/lib/dates";
import { startSync } from "@/lib/sync-engine";

// Single source of truth: the 6 domain hooks are instantiated exactly once here.
// localStorage doesn't notify the writing tab, so every component reads the same
// in-memory state through this context instead of its own hook instance.
interface AppStore {
  habits: ReturnType<typeof useHabits>;
  lifeAreas: ReturnType<typeof useLifeAreas>;
  weeklyRatings: ReturnType<typeof useWeeklyRatings>;
  workouts: ReturnType<typeof useWorkouts>;
  notes: ReturnType<typeof useNotes>;
  leadConfig: ReturnType<typeof useLeadConfig>;
  homePins: ReturnType<typeof useHomePins>;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const AppStoreContext = createContext<AppStore | null>(null);

const DATE_LOCALES: Record<Lang, string> = { es: "es-AR", en: "en-US" };

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useLocalStorage<Lang>(STORAGE_KEYS.lang, DEFAULT_LANG);

  // Set before the domain hooks run: they seed in this language on first run, and
  // date formatting follows it. Idempotent, so a StrictMode double render is fine.
  setDateLocale(DATE_LOCALES[lang]);
  document.documentElement.lang = lang; // screen readers read the page in the right language

  const translate = useCallback((key: string, vars?: Vars) => t(lang, key, vars), [lang]);

  // Background GitHub backup. Without config it does nothing at all — no
  // request, no error — so the app is unchanged for anyone who never sets it up.
  useEffect(startSync, []);

  const notes = useNotes(lang);
  // Stable identity while the leads don't change, so the source migration inside
  // useLeadConfig doesn't re-run on every render of the whole app.
  const leadSourceValues = useMemo(() => notes.leads.map((l) => l.lead?.source), [notes.leads]);

  const store: AppStore = {
    habits: useHabits(lang),
    lifeAreas: useLifeAreas(lang),
    weeklyRatings: useWeeklyRatings(),
    workouts: useWorkouts(lang),
    notes,
    leadConfig: useLeadConfig(lang, leadSourceValues),
    homePins: useHomePins(),
    lang,
    setLang,
    t: translate,
  };
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

// Components do: const t = useT(); ... t("habits.add")
export function useT(): (key: string, vars?: Vars) => string {
  return useAppStore().t;
}
