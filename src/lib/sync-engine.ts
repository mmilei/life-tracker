import { exportBackup, importBackup, onLocalWrite } from "@/lib/storage";
import {
  SyncError,
  clearConfig,
  decideSync,
  fetchRemote,
  getLastSyncedAt,
  loadConfig,
  mergeBackups,
  pushRemote,
  saveConfig,
  setLastSyncedAt,
  type SyncConfig,
  type SyncErrorCode,
} from "@/lib/sync";

// Background sync between localStorage and one JSON file on GitHub.
//
// Local-first: nothing here is on the write path of the app. localStorage stays
// instant and authoritative for the session; this only mirrors it. No config,
// no network, no throw — the app behaves exactly as it did before.

const PUSH_DEBOUNCE_MS = 4000; // one commit per burst of edits, not one per keystroke

export type SyncStatus =
  | { state: "off" }
  | { state: "syncing" }
  | { state: "synced"; at: string }
  | { state: "error"; code: SyncErrorCode };

let status: SyncStatus = { state: "off" };
const listeners = new Set<() => void>();

export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSyncStatus(): SyncStatus {
  return status;
}

function setStatus(next: SyncStatus): void {
  status = next;
  for (const fn of listeners) fn();
}

let sha: string | null = null; // sha of the remote file as we last saw it
let syncedJson: string | null = null; // the data we know is already up there
let timer: ReturnType<typeof setTimeout> | undefined;
let busy = false;
let pending = false; // a sync was asked for while one was already running
let dirty = false; // local writes this device still owes the remote
let listening = false;

// TRADEOFF: single tab assumed. Two tabs racing can push with a stale sha; the
// retry below covers it. Real multi-writer merging would need the git history,
// and this is one person on one Mac.
async function pull(cfg: SyncConfig): Promise<boolean> {
  const remote = await fetchRemote(cfg);
  sha = remote?.sha ?? null;
  const decision = decideSync({
    remoteUpdatedAt: remote?.payload.updatedAt ?? null,
    lastSyncedAt: getLastSyncedAt(),
    dirty,
  });
  if (decision === "adopt" && remote) {
    setLastSyncedAt(remote.payload.updatedAt); // written before the reload, so it survives it
    // Merge instead of replace: whatever this device has and the remote doesn't
    // (a habit created offline, a log ticked before the other device pushed)
    // survives the adopt.
    const merged = mergeBackups(JSON.parse(exportBackup()), remote.payload.data);
    importBackup(JSON.stringify(merged)); // writes localStorage, then reloads
    return true; // page is going away; skip the push
  }
  // "push" and "noop" both fall through to push(), which compares the exported
  // content against what we just read from the remote and stays quiet when they
  // match. Returning early on "noop" would drop an edit made in a previous
  // session: `dirty` is a module flag, so it starts false on every page load.
  if (remote) syncedJson = JSON.stringify(remote.payload.data);
  return false;
}

async function push(cfg: SyncConfig): Promise<void> {
  const data = JSON.parse(exportBackup()) as Record<string, unknown>;
  const json = JSON.stringify(data);
  dirty = false; // cleared before any await, so a write landing mid-push re-arms it
  if (json === syncedJson) return; // nothing changed: don't commit noise
  const payload = { updatedAt: new Date().toISOString(), data };
  try {
    try {
      sha = await pushRemote(cfg, payload, sha);
    } catch (e) {
      if (!(e instanceof SyncError) || e.code !== "conflict") throw e;
      const remote = await fetchRemote(cfg); // stale sha: refresh it and retry once
      sha = remote?.sha ?? null;
      sha = await pushRemote(cfg, payload, sha);
    }
  } catch (e) {
    dirty = true; // nothing reached the remote: this device still owes the push
    throw e;
  }
  syncedJson = json;
  setLastSyncedAt(payload.updatedAt);
}

// Pull, then push if the local state differs. Safe to call any time; never throws.
export async function syncNow(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    setStatus({ state: "off" }); // not configured → no request is ever made
    return;
  }
  if (busy) {
    pending = true; // queue one re-run instead of dropping this request on the floor
    return;
  }
  busy = true;
  setStatus({ state: "syncing" });
  try {
    if (!(await pull(cfg))) await push(cfg);
    setStatus({ state: "synced", at: getLastSyncedAt() ?? new Date().toISOString() });
  } catch (e) {
    // Loud on purpose: a dead token has to be visible in the UI now, not three
    // months from now when the user goes looking for the backup.
    setStatus({ state: "error", code: e instanceof SyncError ? e.code : "unknown" });
  } finally {
    busy = false;
    if (pending) {
      pending = false; // cleared first: the re-run can queue its own follow-up
      void syncNow();
    }
  }
}

function onLocalChange(): void {
  dirty = true; // set even with sync off, so configuring it later still pushes
  if (!loadConfig()) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS);
}

// Called once from AppStoreProvider. The listener is attached after the first
// sync settles, so the initial writes of the domain hooks don't schedule a push
// before we know what's on the remote.
export function startSync(): void {
  void syncNow().finally(() => {
    if (listening) return;
    listening = true;
    onLocalWrite(onLocalChange);
    // Coming back to the tab (or unlocking the phone) is when the remote is most
    // likely to have moved, and on mobile it is often the only moment a
    // backgrounded tab gets to run at all. There is no integration test for this
    // without a browser: it is verified by reading it.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void syncNow();
    });
  });
}

// Save (or clear) the settings and re-sync with the new target.
export function applySyncConfig(cfg: SyncConfig | null): void {
  if (cfg) saveConfig(cfg);
  else clearConfig();
  sha = null;
  syncedJson = null;
  clearTimeout(timer);
  startSync();
}
