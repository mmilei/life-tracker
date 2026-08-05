// GitHub Contents API backup — config, encoding, and the two HTTP calls.
//
// No imports on purpose: scripts/check-sync.mjs imports this file directly
// (Node strips the types), so anything that pulls in React or `@/` aliases has
// to live in src/lib/sync-engine.ts instead.
//
// The remote state is one JSON file per domain, inside a folder of a private
// repo of the user:
//   { "updatedAt": "<ISO>", "data": { "lt.habits": …, "lt.habitLogs": … } }
// Each `data` is the slice of exportBackup() that belongs to that domain, so a
// synced file is still a valid (partial) manual import. One file per domain
// means two devices editing different tabs never write the same file, and each
// tab gets its own commit history.

// cfg.path is the FOLDER the domain files live in. "" is the repo root, which
// is also where the pre-split single file lived, so nothing has to move.
export const DEFAULT_FOLDER = "";

// The single file this app used before the split. Still read (once, to migrate)
// and never written or deleted: removing it is a separate, manual decision.
export const LEGACY_FILE = "life-tracker-state.json";

// Which storage keys travel in which file. Position of the map is the push
// order; the grouping is by tab, because that is the unit a device edits at a
// time. lt.lang and lt.homePins belong to no single tab, so they share home.json.
//
// TRADEOFF: a key that is not listed here does not sync at all. That is a step
// back from isBackupKey()'s prefix rule (storage.ts), which exists so an older
// build forwards keys it does not understand instead of deleting them. The
// guard is the coverage assert in scripts/check-sync.mjs: adding a backup key
// without a home here breaks the check at dev time, loudly, before it ships.
// Upgrade path if that is ever not enough: a catch-all file for unmapped keys.
export const DOMAIN_FILES: Record<string, readonly string[]> = {
  "habits.json": ["lt.habits", "lt.habitLogs"],
  "week.json": ["lt.lifeAreas", "lt.weeklyRatings"],
  "training.json": ["lt.muscleGroups", "lt.workouts"],
  "business.json": ["lt.noteTypes", "lt.notes", "lt.leadStages", "lt.leadSources"],
  "home.json": ["lt.lang", "lt.homePins"],
};

export const DOMAIN_FILE_NAMES = Object.keys(DOMAIN_FILES);

const KEY_TO_FILE = new Map<string, string>(
  Object.entries(DOMAIN_FILES).flatMap(([file, keys]) => keys.map((k) => [k, file] as const)),
);

// null = this key does not travel: a device preference, a secret, or a backup
// key nobody mapped (see the TRADEOFF above).
export function domainOf(storageKey: string): string | null {
  return KEY_TO_FILE.get(storageKey) ?? null;
}

// One backup object in, one object per domain file out. Every file is present
// even when empty, so a push always writes a complete, self-describing file.
export function splitBackup(data: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const file of DOMAIN_FILE_NAMES) out[file] = {};
  for (const [key, value] of Object.entries(data)) {
    const file = domainOf(key);
    if (file) out[file][key] = value;
  }
  return out;
}

// These two keys live under lt.sync on purpose. The backup no longer ships a
// fixed list of keys, it ships every lt.* key except the excluded prefixes, so
// what keeps the token out of the file we push is isBackupKey() in
// src/lib/storage.ts. Read the SECURITY note there before renaming either of
// these: a key that stops matching lt.sync starts getting committed to the
// user's repo.
const CONFIG_KEY = "lt.sync.config";
const LAST_SYNCED_KEY = "lt.sync.lastSyncedAt";

export interface SyncConfig {
  token: string;
  repo: string; // "owner/repo"
  path: string; // folder the domain files live in, "" for the repo root
}

export interface SyncPayload {
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface RemoteFile {
  payload: SyncPayload;
  // Required by the API to overwrite a file. null when the payload did not come
  // from a file of its own: the migration reads the old single file and hands
  // each domain its slice, and those slices still have to be created.
  sha: string | null;
}

export type SyncErrorCode = "auth" | "notFound" | "conflict" | "corrupt" | "network" | "unknown";

export class SyncError extends Error {
  code: SyncErrorCode;
  constructor(code: SyncErrorCode, message?: string) {
    super(message ?? code);
    this.name = "SyncError";
    this.code = code;
  }
}

export function statusToCode(status: number): SyncErrorCode {
  if (status === 401 || status === 403) return "auth"; // bad/expired token, or missing scope
  if (status === 404) return "notFound"; // GitHub also 404s a private repo you can't read
  if (status === 409 || status === 422) return "conflict"; // stale sha
  return "unknown";
}

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

// A folder, from whatever the user typed or whatever an older build saved. A
// value ending in .json is a file path from before the split, so it resolves to
// the folder that file was in: an existing config keeps pointing at the same
// place in the repo without the user re-entering anything.
export function normalizeFolder(input: string): string {
  const clean = input.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!/\.json$/i.test(clean)) return clean;
  const cut = clean.lastIndexOf("/");
  return cut === -1 ? DEFAULT_FOLDER : clean.slice(0, cut);
}

// Accepts what a human actually pastes (a full GitHub URL, a leading slash on
// the path) and returns null when the result still isn't usable.
export function normalizeConfig(input: Partial<SyncConfig> | null | undefined): SyncConfig | null {
  const token = (input?.token ?? "").trim();
  const repo = (input?.repo ?? "")
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const path = normalizeFolder(input?.path ?? "");
  if (!token || !REPO_RE.test(repo)) return null;
  return { token, repo, path };
}

export function loadConfig(): SyncConfig | null {
  try {
    return normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveConfig(cfg: SyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(LAST_SYNCED_KEY);
}

// One marker per domain file, in one storage key. A device can be up to date on
// habits.json and behind on business.json, and each file decides on its own.
function readSyncedMap(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_SYNCED_KEY) ?? "null") as unknown;
    // Anything else (including the bare ISO string this key held before the
    // split) reads as "never synced": every file then adopts once, and adopting
    // is a merge, so no data rides on getting this back.
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function getLastSyncedAt(file: string): string | null {
  const value = readSyncedMap()[file];
  return typeof value === "string" ? value : null;
}

export function setLastSyncedAt(file: string, iso: string): void {
  localStorage.setItem(LAST_SYNCED_KEY, JSON.stringify({ ...readSyncedMap(), [file]: iso }));
}

// Newest marker across the files. The status line shows one time, not five.
export function latestSyncedAt(): string | null {
  const all = Object.values(readSyncedMap()).filter((v) => typeof v === "string");
  return all.length ? all.reduce((a, b) => (a > b ? a : b)) : null; // ISO sorts chronologically
}

// btoa() throws on anything above U+00FF and this app is full of "hábitos" and
// "ñ", so go through UTF-8 bytes both ways. This is the classic bug of the
// GitHub contents integration — check-sync.mjs guards the round trip.
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\s/g, "")); // the API returns base64 wrapped in newlines
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePayload(payload: SyncPayload): string {
  return toBase64(JSON.stringify(payload));
}

export function decodePayload(b64: string): SyncPayload {
  const payload = JSON.parse(fromBase64(b64)) as SyncPayload | null;
  if (
    !payload ||
    typeof payload.updatedAt !== "string" ||
    typeof payload.data !== "object" ||
    payload.data === null
  ) {
    throw new SyncError("corrupt", "remote file is not a life-tracker payload");
  }
  return payload;
}

// Local wins on a tie or on an unparsable remote timestamp: never clobber real
// data because of a malformed file.
export function isRemoteNewer(remoteUpdatedAt: string, localLastSyncedAt: string | null): boolean {
  const remote = Date.parse(remoteUpdatedAt);
  if (Number.isNaN(remote)) return false;
  if (!localLastSyncedAt) return true;
  const local = Date.parse(localLastSyncedAt);
  return Number.isNaN(local) || remote > local;
}

export type SyncDecision = "adopt" | "push" | "noop";

export interface SyncDecisionInput {
  remoteUpdatedAt: string | null; // null = the remote file doesn't exist yet
  lastSyncedAt: string | null;
  dirty: boolean; // this device has local writes that never reached the remote
}

// The whole point of this function is the `dirty` row. A newer remote used to be
// adopted unconditionally, which meant a device that had just been edited threw
// those edits away the moment another device pushed. Local edits win the file:
// what the remote had that we don't is recovered by mergeBackups() on the next
// adopt, in whichever direction it happens.
export function decideSync({
  remoteUpdatedAt,
  lastSyncedAt,
  dirty,
}: SyncDecisionInput): SyncDecision {
  if (remoteUpdatedAt === null) return "push"; // nothing up there: this device creates the file
  if (isRemoteNewer(remoteUpdatedAt, lastSyncedAt)) return dirty ? "push" : "adopt";
  return dirty ? "push" : "noop";
}

// Identity of an entry inside an array-valued backup key. Almost everything has
// an `id`; habit logs and weekly ratings never did, their identity is composite.
const ENTITY_IDENTITY: Record<string, string[]> = {
  "lt.habitLogs": ["habitId", "date"],
  "lt.weeklyRatings": ["weekStart", "areaId"],
};

const SEP = "\u0000"; // no id or date can smuggle a NUL in, so composite keys can't collide

function identity(storageKey: string, entry: unknown): string {
  const fields = ENTITY_IDENTITY[storageKey] ?? ["id"];
  if (typeof entry === "object" && entry !== null) {
    const parts = fields.map((f) => (entry as Record<string, unknown>)[f]);
    if (parts.every((p) => typeof p === "string" || typeof p === "number")) {
      return `k:${parts.join(SEP)}`;
    }
  }
  // A primitive, or an entity shape this build doesn't know: fall back to the
  // whole value, so it gets deduped but is never dropped.
  return `v:${JSON.stringify(entry)}`;
}

// Same rule as isRemoteNewer, per entity instead of per file. An entity with no
// (or an unparsable) updatedAt counts as maximally old, so it never wins a
// conflict it shouldn't: ties go to local, see mergeEntities.
function entityUpdatedAt(entry: unknown): number {
  const raw =
    typeof entry === "object" && entry !== null
      ? (entry as { updatedAt?: unknown }).updatedAt
      : undefined;
  const t = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

function mergeEntities(storageKey: string, local: unknown[], remote: unknown[]): unknown[] {
  const out = new Map<string, unknown>();
  for (const entry of remote) out.set(identity(storageKey, entry), entry);
  for (const entry of local) {
    const key = identity(storageKey, entry);
    const rival = out.get(key);
    // >= : on a tie (and today every tie is -Infinity vs -Infinity, since no
    // entity carries updatedAt yet) local wins, because local is the copy the
    // adopting device is about to overwrite.
    if (rival === undefined || entityUpdatedAt(entry) >= entityUpdatedAt(rival)) {
      out.set(key, entry); // Map.set keeps the original position, so remote order holds
    }
  }
  return [...out.values()];
}

// leadStages and leadSources are excluded from the entity merge below on
// purpose. They are the one array in this app where POSITION is meaning, not
// just membership: Nuevo/Cerrado must stay first/last (src/lib/leads.ts).
// Entity-by-entity union has no notion of that, and a stage that exists only
// on the merging device lands at the end, past Cerrado. Seen live 2026-08-05.
// Plain replace is safe here specifically because `dirty` (sync-engine.ts)
// gates every adopt: this only runs when the device has no unpushed writes,
// so there is nothing local-only to lose by taking the remote array whole,
// same as any non-array value.
const NO_ENTITY_MERGE = new Set(["lt.leadStages", "lt.leadSources"]);

// Union of two backups, entity by entity, used when adopting a remote file.
// Replacing the whole file used to delete anything this device had and the
// remote didn't: a habit created offline, a log ticked on the phone.
//
// NOTE: union with a per-entity updatedAt tiebreak, no tombstones. A delete on
// device A comes back the first time it merges with a device B that still has
// the entity. Upgrade path when that bites: a deletedAt marker per entity plus a
// sweep, which is also what would make a real last-writer-wins possible. No
// domain hook stamps updatedAt on write yet (see entityUpdatedAt), so today's
// conflicts resolve as local-wins in practice; the moment a caller starts
// setting it, the newer side starts winning without any change here.
export function mergeBackups(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...local, ...remote }; // non-arrays: remote wins
  for (const key of Object.keys(merged)) {
    const l = local[key];
    const r = remote[key];
    if (Array.isArray(l) && Array.isArray(r) && !NO_ENTITY_MERGE.has(key)) merged[key] = mergeEntities(key, l, r);
  }
  return merged;
}

// Contents API path = the configured folder plus the file name. Empty segments
// are dropped so a root folder ("") does not produce a double slash.
export function contentsUrl(cfg: SyncConfig, file: string): string {
  const path = [...cfg.path.split("/"), file]
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `https://api.github.com/repos/${cfg.repo}/contents/${path}`;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new SyncError("network"); // offline, DNS, CORS — same user-facing answer
  }
}

// null = that file doesn't exist yet (first sync ever, or a domain never used).
export async function fetchRemote(cfg: SyncConfig, file: string): Promise<RemoteFile | null> {
  const res = await request(contentsUrl(cfg, file), { headers: headers(cfg.token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError(statusToCode(res.status));
  const json = (await res.json()) as { content?: string; sha?: string } | unknown[];
  if (Array.isArray(json) || !json.sha || typeof json.content !== "string") {
    throw new SyncError("corrupt", "expected a file, got something else");
  }
  return { payload: decodePayload(json.content), sha: json.sha };
}

// sha is required to overwrite; omitting it only works for a create.
export async function pushRemote(
  cfg: SyncConfig,
  file: string,
  payload: SyncPayload,
  sha: string | null,
): Promise<string | null> {
  const res = await request(contentsUrl(cfg, file), {
    method: "PUT",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `life-tracker sync ${file} ${payload.updatedAt}`,
      content: encodePayload(payload),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new SyncError(statusToCode(res.status));
  const json = (await res.json()) as { content?: { sha?: string } };
  return json.content?.sha ?? null; // null → next push re-fetches the sha
}
