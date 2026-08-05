// GitHub Contents API backup — config, encoding, and the two HTTP calls.
//
// No imports on purpose: scripts/check-sync.mjs imports this file directly
// (Node strips the types), so anything that pulls in React or `@/` aliases has
// to live in src/lib/sync-engine.ts instead.
//
// The remote file is a single JSON object in a private repo of the user:
//   { "updatedAt": "<ISO>", "data": { "lt.habits": …, "lt.notes": … } }
// `data` is exactly what exportBackup() produces, so a synced file can also be
// fed to the existing manual import.

export const DEFAULT_PATH = "life-tracker-state.json";

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
  path: string; // path of the JSON file inside the repo
}

export interface SyncPayload {
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface RemoteFile {
  payload: SyncPayload;
  sha: string; // required by the API to overwrite the file
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

// Accepts what a human actually pastes (a full GitHub URL, a leading slash on
// the path) and returns null when the result still isn't usable.
export function normalizeConfig(input: Partial<SyncConfig> | null | undefined): SyncConfig | null {
  const token = (input?.token ?? "").trim();
  const repo = (input?.repo ?? "")
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const path = (input?.path ?? "").trim().replace(/^\/+/, "") || DEFAULT_PATH;
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

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY);
}

export function setLastSyncedAt(iso: string): void {
  localStorage.setItem(LAST_SYNCED_KEY, iso);
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

function contentsUrl(cfg: SyncConfig): string {
  const path = cfg.path.split("/").map(encodeURIComponent).join("/");
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

// null = the file doesn't exist yet (first sync ever).
export async function fetchRemote(cfg: SyncConfig): Promise<RemoteFile | null> {
  const res = await request(contentsUrl(cfg), { headers: headers(cfg.token) });
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
  payload: SyncPayload,
  sha: string | null,
): Promise<string | null> {
  const res = await request(contentsUrl(cfg), {
    method: "PUT",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `life-tracker sync ${payload.updatedAt}`,
      content: encodePayload(payload),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new SyncError(statusToCode(res.status));
  const json = (await res.json()) as { content?: { sha?: string } };
  return json.content?.sha ?? null; // null → next push re-fetches the sha
}
