import { exportBackup, importBackup, onLocalWrite } from "@/lib/storage";
import {
  DOMAIN_FILE_NAMES,
  LEGACY_FILE,
  SyncError,
  clearConfig,
  decideSync,
  domainOf,
  fetchRemote,
  getLastSyncedAt,
  latestSyncedAt,
  loadConfig,
  mergeBackups,
  pushRemote,
  saveConfig,
  setLastSyncedAt,
  splitBackup,
  type RemoteFile,
  type SyncConfig,
  type SyncErrorCode,
} from "@/lib/sync";

// Background sync between localStorage and one JSON file per domain on GitHub.
//
// Local-first: nothing here is on the write path of the app. localStorage stays
// instant and authoritative for the session; this only mirrors it. No config,
// no network, no throw — the app behaves exactly as it did before.
//
// Every piece of per-file state below is keyed by domain file name, so editing
// a habit cannot schedule a push of the leads file, and a stale sha on one file
// cannot stall the other four.

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

const sha = new Map<string, string | null>(); // sha of each remote file as we last saw it
const syncedJson = new Map<string, string>(); // the data we know is already up there, per file
const dirty = new Set<string>(); // files this device has local writes for
let timer: ReturnType<typeof setTimeout> | undefined;
let busy = false;
let pending = false; // a sync was asked for while one was already running
let listening = false;

// Read all five files. When none of them exists yet, the state may still be in
// the single file this app used before the split: read it once and hand each
// domain its slice, as if the five files were already there. The next push
// creates them for real (sha null = create). Nothing deletes the old file, and
// once the five exist this branch never runs again.
async function readRemotes(cfg: SyncConfig): Promise<Map<string, RemoteFile | null>> {
  const found = await Promise.all(DOMAIN_FILE_NAMES.map((file) => fetchRemote(cfg, file)));
  const remotes = new Map(DOMAIN_FILE_NAMES.map((file, i) => [file, found[i]]));
  if (found.some((r) => r !== null)) return remotes;

  const legacy = await fetchRemote(cfg, LEGACY_FILE);
  if (!legacy) return remotes;
  const split = splitBackup(legacy.payload.data);
  for (const file of DOMAIN_FILE_NAMES) {
    remotes.set(file, { payload: { updatedAt: legacy.payload.updatedAt, data: split[file] }, sha: null });
  }
  return remotes;
}

// TRADEOFF: single tab assumed. Two tabs racing can push with a stale sha; the
// retry below covers it. Real multi-writer merging would need the git history,
// and this is one person on one Mac.
//
// Returns the files that still have to be pushed, or null when the page is
// about to reload because something was adopted.
async function pull(cfg: SyncConfig): Promise<string[] | null> {
  const remotes = await readRemotes(cfg);
  const adopted: Record<string, unknown> = {};
  const toPush: string[] = [];

  for (const [file, remote] of remotes) {
    sha.set(file, remote?.sha ?? null);
    const decision = decideSync({
      remoteUpdatedAt: remote?.payload.updatedAt ?? null,
      lastSyncedAt: getLastSyncedAt(file),
      dirty: dirty.has(file),
    });
    if (decision === "adopt" && remote) {
      setLastSyncedAt(file, remote.payload.updatedAt); // written before the reload, so it survives it
      Object.assign(adopted, remote.payload.data);
      continue;
    }
    // "push" and "noop" both fall through to push(), which compares the exported
    // content against what we just read from the remote and stays quiet when they
    // match. Returning early on "noop" would drop an edit made in a previous
    // session: `dirty` is a module Set, so it starts empty on every page load.
    //
    // Only a file that really exists counts as "already up there". A migrated
    // slice has no sha because no such file was ever written, and recording its
    // content here would make push() decide it had nothing to do: the five files
    // would never get created and the app would read the old one forever.
    if (remote?.sha) syncedJson.set(file, JSON.stringify(remote.payload.data));
    toPush.push(file);
  }

  if (Object.keys(adopted).length === 0) return toPush;
  // One import for however many files were adopted: importBackup reloads, so
  // doing it per file would throw away the rest of the round. Merge instead of
  // replace, so whatever this device has and the remote doesn't (a habit created
  // offline, a log ticked before the other device pushed) survives the adopt.
  importBackup(JSON.stringify(mergeBackups(JSON.parse(exportBackup()), adopted)));
  return null; // page is going away; the files left over push after the reload
}

// Sequential on purpose: each PUT is a commit on the same branch, and parallel
// writes would race for the branch head and 409 against each other.
async function push(cfg: SyncConfig, files: string[]): Promise<void> {
  const split = splitBackup(JSON.parse(exportBackup()) as Record<string, unknown>);
  for (const file of files) {
    const data = split[file];
    const json = JSON.stringify(data);
    dirty.delete(file); // cleared before any await, so a write landing mid-push re-arms it
    if (json === syncedJson.get(file)) continue; // nothing changed: don't commit noise
    const payload = { updatedAt: new Date().toISOString(), data };
    try {
      try {
        sha.set(file, await pushRemote(cfg, file, payload, sha.get(file) ?? null));
      } catch (e) {
        if (!(e instanceof SyncError) || e.code !== "conflict") throw e;
        const remote = await fetchRemote(cfg, file); // stale sha: refresh it and retry once
        sha.set(file, await pushRemote(cfg, file, payload, remote?.sha ?? null));
      }
    } catch (e) {
      dirty.add(file); // nothing reached the remote: this device still owes the push
      throw e;
    }
    syncedJson.set(file, json);
    setLastSyncedAt(file, payload.updatedAt);
  }
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
    const toPush = await pull(cfg);
    if (toPush) await push(cfg, toPush);
    setStatus({ state: "synced", at: latestSyncedAt() ?? new Date().toISOString() });
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

// Only the file that owns the key that changed. Ticking a habit must not make
// the leads file look edited, or every write would commit all five.
function onLocalChange(key: string): void {
  const file = domainOf(key);
  if (!file) return; // a backup key with no domain does not sync (see DOMAIN_FILES)
  dirty.add(file); // set even with sync off, so configuring it later still pushes
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
  sha.clear();
  syncedJson.clear();
  clearTimeout(timer);
  startSync();
}
