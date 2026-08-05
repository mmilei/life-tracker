import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEYS = {
  habits: "lt.habits",
  habitLogs: "lt.habitLogs",
  lifeAreas: "lt.lifeAreas",
  weeklyRatings: "lt.weeklyRatings",
  muscleGroups: "lt.muscleGroups",
  workouts: "lt.workouts",
  noteTypes: "lt.noteTypes",
  notes: "lt.notes",
  leadStages: "lt.leadStages",
  leadSources: "lt.leadSources",
  homePins: "lt.homePins",
  lang: "lt.lang",
  // lt.device.* is this machine's own preference, not the user's data. It stays
  // out of the backup on purpose: collapsing the sidebar on a 1440p screen says
  // nothing about a phone, and syncing it would make one device rearrange the
  // other. See isBackupKey below for the rule.
  sidebarCollapsed: "lt.device.sidebarCollapsed",
} as const;

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

// One listener, because there is exactly one sync engine (src/lib/sync-engine.ts).
// Every domain hook writes through useLocalStorage, so this is the single place
// that knows "something changed" without every hook opting in. It gets the key
// that changed: the engine maps it to one domain file and pushes only that one.
let writeListener: ((key: string) => void) | null = null;

export function onLocalWrite(fn: (key: string) => void): void {
  writeListener = fn;
}

// localStorage-backed useState. Lazy init reads once; every change persists.
export function useLocalStorage<T>(key: string, initial: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Only a key that travels is worth waking the sync engine for. Without
      // this test, collapsing the sidebar scheduled a push and committed to the
      // user's repo, and the file it pushed was byte for byte the previous one.
      if (isBackupKey(key)) writeListener?.(key);
    } catch {
      // TRADEOFF: swallow quota/serialization errors — single-user local app, no recovery path worth writing
    }
  }, [key, value]);

  const set = useCallback<SetValue<T>>((v) => setValue(v), []);
  return [value, set];
}

// Which keys travel inside the backup file. Both directions use this: the manual
// export/import and the GitHub sync push/pull (src/lib/sync-engine.ts).
//
// Prefix, not whitelist. A whitelist means each device only forwards the keys its
// own build knows about, so an older build silently strips newer keys out of the
// shared file: that is how an iPhone running an old build kept deleting
// lt.leadStages and lt.leadSources from the remote state (2026-08-05), wiping
// stages and sources the user had typed on another device. With a prefix, a build
// transports what it does not understand instead of destroying it. STORAGE_KEYS
// stays the source of truth for the hooks; it is no longer the one for the backup.
//
// SECURITY, read this before editing the line below. lt.sync.config holds the
// user's GitHub personal access token, and the backup file is committed to a repo.
// The only thing keeping that token out of the pushed file is this exclusion: it
// used to be the whitelist, and moving to a prefix moved the guarantee here. So:
//   - secrets live under lt.sync and nowhere else in lt.*;
//   - the exclusion is "lt.sync" with NO trailing dot, deliberately. A future key
//     named lt.syncSomething is far more likely to be another sync internal than
//     user data, so this fails closed: an unrelated key that happens to start with
//     "sync" just never gets backed up, which costs a rename, while the dotted
//     form would happily ship a secret whose name missed the dot by one character;
//   - importBackup runs the same test, so a remote file cannot inject a token into
//     this device either.
// The assert that guards all of this lives in scripts/check-sync.mjs.
//
// lt.device is the second exclusion and it is not about secrets: it is where a
// preference that belongs to THIS machine lives, like whether the sidebar is
// collapsed. Those are excluded for the same reason the token is, that they are
// not the user's data, and the same fail-closed shape is used: no trailing dot,
// so lt.deviceSomething stays home too.
export function isBackupKey(key: string): boolean {
  return key.startsWith("lt.") && !key.startsWith("lt.sync") && !key.startsWith("lt.device");
}

// Backup = every backup-eligible key as one JSON object. Pretty string for download.
export function exportBackup(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null || !isBackupKey(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // NOTE: one corrupt entry must not take the whole backup down with it.
      // Skipping is the only option here: a non-JSON string cannot be nested in
      // the payload, and the alternative is exporting nothing at all.
    }
  }
  return JSON.stringify(data, null, 2);
}

// Overwrites storage from a backup string, then reloads so all hooks re-read.
export function importBackup(json: string): void {
  const data = JSON.parse(json) as Record<string, unknown>;
  for (const [key, val] of Object.entries(data)) {
    if (isBackupKey(key)) localStorage.setItem(key, JSON.stringify(val));
  }
  location.reload();
}
