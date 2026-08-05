// Checks for src/lib/sync.ts — the pure logic of the GitHub backup. No deps, no
// framework, no network: Node strips the types and imports the real module, so
// this exercises the shipped code, not a copy.
//   node scripts/check-sync.mjs
import assert from "node:assert/strict";

// loadConfig/saveConfig touch localStorage. Six lines of Map beats a dependency.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  DEFAULT_PATH,
  clearConfig,
  decodePayload,
  encodePayload,
  fromBase64,
  getLastSyncedAt,
  isRemoteNewer,
  loadConfig,
  normalizeConfig,
  saveConfig,
  setLastSyncedAt,
  statusToCode,
  toBase64,
} = await import("../src/lib/sync.ts");

let checks = 0;
const check = (name, fn) => {
  fn();
  checks++;
  console.log(`  ok  ${name}`);
};

// ---------------------------------------------------------------- base64 utf8
// The bug this whole file exists for: btoa() on a non-ASCII string throws, and
// the app is full of Spanish.
check("base64 round trip survives accents, ñ and emoji", () => {
  for (const text of [
    "Hábitos",
    "ñandú café — “comillas”",
    'Entrené 3 días… ¿y vos? ✅🔥',
    JSON.stringify({ "lt.habits": [{ name: "Meditación", note: "más días" }] }),
    "", // empty
  ]) {
    assert.equal(fromBase64(toBase64(text)), text, `round trip failed for: ${text}`);
  }
});

check("toBase64 output is plain ASCII base64", () => {
  const b64 = toBase64("Hábitos ✅");
  assert.match(b64, /^[A-Za-z0-9+/]+=*$/);
  assert.notEqual(b64, Buffer.from("Hábitos ✅", "latin1").toString("base64"));
  assert.equal(b64, Buffer.from("Hábitos ✅", "utf8").toString("base64")); // real UTF-8 bytes
});

check("fromBase64 tolerates the newlines the GitHub API returns", () => {
  const wrapped = Buffer.from("Días de hábitos", "utf8").toString("base64").replace(/(.{4})/g, "$1\n");
  assert.equal(fromBase64(wrapped), "Días de hábitos");
});

// --------------------------------------------------------------------- payload
check("payload round trips through base64 with accented data", () => {
  const payload = {
    updatedAt: "2026-08-04T12:00:00.000Z",
    data: { "lt.habits": [{ id: "1", name: "Leer más" }], "lt.lang": "es" },
  };
  assert.deepEqual(decodePayload(encodePayload(payload)), payload);
});

check("decodePayload rejects anything that isn't a payload", () => {
  for (const bad of [toBase64("null"), toBase64('{"data":{}}'), toBase64('{"updatedAt":"x"}')]) {
    assert.throws(() => decodePayload(bad), { code: "corrupt" });
  }
});

// ------------------------------------------------------------ newer-wins logic
check("isRemoteNewer: adopt a newer remote, keep local otherwise", () => {
  const older = "2026-08-01T00:00:00.000Z";
  const newer = "2026-08-02T00:00:00.000Z";
  assert.equal(isRemoteNewer(newer, null), true, "never synced → take the remote");
  assert.equal(isRemoteNewer(newer, older), true);
  assert.equal(isRemoteNewer(older, newer), false);
  assert.equal(isRemoteNewer(older, older), false, "tie → local wins, no pointless reload");
  assert.equal(isRemoteNewer("not a date", null), false, "garbage must not clobber local data");
});

// ------------------------------------------------------------------ HTTP codes
check("statusToCode maps the statuses the UI has copy for", () => {
  assert.equal(statusToCode(401), "auth");
  assert.equal(statusToCode(403), "auth");
  assert.equal(statusToCode(404), "notFound");
  assert.equal(statusToCode(409), "conflict");
  assert.equal(statusToCode(422), "conflict");
  assert.equal(statusToCode(500), "unknown");
});

// --------------------------------------------------------------------- config
check("normalizeConfig cleans what a human pastes", () => {
  assert.deepEqual(normalizeConfig({ token: " t ", repo: " me/tracker ", path: "" }), {
    token: "t",
    repo: "me/tracker",
    path: DEFAULT_PATH,
  });
  assert.deepEqual(normalizeConfig({ token: "t", repo: "https://github.com/me/tracker.git" }), {
    token: "t",
    repo: "me/tracker",
    path: DEFAULT_PATH,
  });
  assert.equal(normalizeConfig({ token: "t", repo: "me" }), null, "repo needs owner/name");
  assert.equal(normalizeConfig({ token: "", repo: "me/tracker" }), null, "token required");
  assert.equal(normalizeConfig(null), null);
});

check("config and last-sync marker round trip through storage", () => {
  store.clear();
  assert.equal(loadConfig(), null, "nothing configured → null, never a throw");
  saveConfig(normalizeConfig({ token: "tok", repo: "me/tracker", path: "state.json" }));
  assert.deepEqual(loadConfig(), { token: "tok", repo: "me/tracker", path: "state.json" });
  setLastSyncedAt("2026-08-04T10:00:00.000Z");
  assert.equal(getLastSyncedAt(), "2026-08-04T10:00:00.000Z");
  clearConfig();
  assert.equal(loadConfig(), null);
  assert.equal(getLastSyncedAt(), null, "disconnect must forget the marker too");
});

check("a corrupt config entry reads as 'not configured'", () => {
  store.set("lt.sync.config", "{not json");
  assert.equal(loadConfig(), null);
  store.clear();
});

console.log(`check-sync: OK — ${checks} checks`);
