// Checks for the pure logic of the GitHub backup: src/lib/sync.ts (config,
// encoding, newer-wins) plus the key selection in src/lib/storage.ts. No network,
// no test framework: Node strips the types and imports the real modules, so this
// exercises the shipped code, not a copy.
//   node scripts/check-sync.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// loadConfig/saveConfig and the backup functions touch localStorage; importBackup
// reloads the page. A Map and a no-op beat a dependency.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (i) => [...store.keys()][i] ?? null,
};
globalThis.location = { reload: () => {} };

const {
  DEFAULT_PATH,
  clearConfig,
  decideSync,
  decodePayload,
  encodePayload,
  fromBase64,
  getLastSyncedAt,
  isRemoteNewer,
  loadConfig,
  mergeBackups,
  normalizeConfig,
  saveConfig,
  setLastSyncedAt,
  statusToCode,
  toBase64,
} = await import("../src/lib/sync.ts");

// storage.ts also exports useLocalStorage, so this drags React in. Node resolves
// it from node_modules without complaining, and it is worth it: the token
// exclusion has to be asserted against the function the app really ships.
const { STORAGE_KEYS, exportBackup, importBackup, isBackupKey } = await import(
  "../src/lib/storage.ts"
);

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

// ----------------------------------------------------------- the sync decision
// isRemoteNewer above is only half the answer. The bug lived in the caller: it
// adopted a newer remote even when this device had edits that never got pushed,
// so those edits died. sync-engine's pull() now routes through decideSync, so
// this table is the real control flow and not a parallel copy of it.
check("decideSync: a newer remote never wins over unpushed local edits", () => {
  const at = (hhmm) => `2026-08-05T${hhmm}:00.000Z`;
  const table = [
    // remote,     lastSynced,  dirty,  expected
    [at("15:30"), at("15:00"), true, "push"], // the case that was broken
    [at("15:30"), at("15:00"), false, "adopt"],
    [at("15:00"), at("15:30"), true, "push"],
    [at("15:00"), at("15:30"), false, "noop"],
    [at("15:00"), at("15:00"), false, "noop"], // tie is not newer
    [at("15:00"), at("15:00"), true, "push"],
    [at("15:00"), null, false, "adopt"], // never synced: take what's up there
    [at("15:00"), null, true, "push"], // never synced but already edited here
    [null, at("15:00"), false, "push"], // no remote file yet: create it
    [null, null, false, "push"],
    ["not a date", null, false, "noop"], // garbage timestamp must not trigger an adopt
  ];
  for (const [remoteUpdatedAt, lastSyncedAt, dirty, expected] of table) {
    assert.equal(
      decideSync({ remoteUpdatedAt, lastSyncedAt, dirty }),
      expected,
      `remote=${remoteUpdatedAt} lastSynced=${lastSyncedAt} dirty=${dirty}`,
    );
  }
});

// ------------------------------------------------------------- merge on adopt
// Adopting used to replace localStorage wholesale, so anything this device had
// and the remote didn't was gone. These asserts are the guarantee that an adopt
// cannot delete data on either side.
check("mergeBackups keeps entities that live on only one side", () => {
  const merged = mergeBackups(
    { "lt.habits": [{ id: "a", name: "Entrenar" }, { id: "local-only", name: "Leer" }] },
    { "lt.habits": [{ id: "a", name: "Entrenar" }, { id: "remote-only", name: "Meditar" }] },
  );
  assert.deepEqual(
    merged["lt.habits"].map((h) => h.id).sort(),
    ["a", "local-only", "remote-only"],
    "an adopt must not delete a habit that only one device knows about",
  );
});

check("mergeBackups: on a conflict neither side disappears and local wins the id", () => {
  const merged = mergeBackups(
    { "lt.notes": [{ id: "n1", text: "escrito acá" }, { id: "n2", text: "solo local" }] },
    { "lt.notes": [{ id: "n1", text: "escrito allá" }, { id: "n3", text: "solo remoto" }] },
  );
  const byId = Object.fromEntries(merged["lt.notes"].map((n) => [n.id, n.text]));
  assert.deepEqual(Object.keys(byId).sort(), ["n1", "n2", "n3"], "every entity survived");
  assert.equal(byId.n1, "escrito acá", "no per-entity updatedAt: the conflict goes to local");
});

check("mergeBackups: a per-entity updatedAt decides the conflict when it exists", () => {
  const merged = mergeBackups(
    { "lt.notes": [{ id: "n1", text: "viejo", updatedAt: "2026-08-05T10:00:00.000Z" }] },
    { "lt.notes": [{ id: "n1", text: "nuevo", updatedAt: "2026-08-05T11:00:00.000Z" }] },
  );
  assert.equal(merged["lt.notes"][0].text, "nuevo", "the newer entity wins, whichever side it is on");

  const noStamp = mergeBackups(
    { "lt.notes": [{ id: "n1", text: "local sin fecha" }] },
    { "lt.notes": [{ id: "n1", text: "remoto con fecha", updatedAt: "2026-08-05T11:00:00.000Z" }] },
  );
  assert.equal(
    noStamp["lt.notes"][0].text,
    "remoto con fecha",
    "no updatedAt counts as maximally old",
  );
});

check("mergeBackups identifies logs and ratings by their composite key", () => {
  // Neither of these has an id: habitId+date and weekStart+areaId ARE the identity.
  const merged = mergeBackups(
    {
      "lt.habitLogs": [
        { habitId: "h1", date: "2026-08-01" },
        { habitId: "h1", date: "2026-08-02" },
      ],
      "lt.weeklyRatings": [{ weekStart: "2026-08-02", areaId: "gym", score: 7 }],
    },
    {
      "lt.habitLogs": [
        { habitId: "h1", date: "2026-08-01" }, // same entity: must not duplicate
        { habitId: "h2", date: "2026-08-01" },
      ],
      "lt.weeklyRatings": [
        { weekStart: "2026-08-02", areaId: "gym", score: 3 }, // conflict on the same week
        { weekStart: "2026-08-02", areaId: "mente", score: 9 },
      ],
    },
  );
  assert.deepEqual(
    merged["lt.habitLogs"].map((l) => `${l.habitId} ${l.date}`).sort(),
    ["h1 2026-08-01", "h1 2026-08-02", "h2 2026-08-01"],
    "logs must be unioned by habitId+date, with no duplicate of the shared one",
  );
  assert.equal(merged["lt.weeklyRatings"].length, 2, "ratings unioned by weekStart+areaId");
  assert.equal(
    merged["lt.weeklyRatings"].find((r) => r.areaId === "gym").score,
    7,
    "the rating typed on this device wins its own week",
  );
});

check("mergeBackups handles keys only one side has, and non-array values", () => {
  const merged = mergeBackups(
    { "lt.lang": "es", "lt.onlyLocal": [{ id: "x" }] },
    { "lt.lang": "en", "lt.onlyRemote": [{ id: "y" }] },
  );
  assert.equal(merged["lt.lang"], "en", "a scalar follows the whole-file rule: newer remote wins");
  assert.deepEqual(merged["lt.onlyLocal"], [{ id: "x" }], "a key the remote lacks stays");
  assert.deepEqual(merged["lt.onlyRemote"], [{ id: "y" }], "a key this build may not know still arrives");
});

check("mergeBackups never drops an entry it cannot identify", () => {
  const merged = mergeBackups(
    { "lt.homePins": ["habit-streak", { weird: true }] },
    { "lt.homePins": ["habit-streak", "area"] },
  );
  assert.deepEqual(
    merged["lt.homePins"],
    ["habit-streak", "area", { weird: true }],
    "identity-less entries are deduped by value instead of being thrown away",
  );
});

// Regression for 2026-08-05: a stage that existed only on the merging device
// used to land after Cerrado, because the entity merge has no notion that
// this array has fixed endpoints. leadStages/leadSources are excluded from it
// entirely, so the whole-file rule (remote wins) applies instead.
check("mergeBackups does not reorder leadStages or leadSources: whole-file rule applies", () => {
  const local = {
    "lt.leadStages": [{ id: "Nuevo" }, { id: "Negociando", label: "Presupuestadisimo" }, { id: "Cerrado" }],
  };
  const remote = {
    "lt.leadStages": [{ id: "Nuevo" }, { id: "Contactado", label: "Contactadisimo" }, { id: "Cerrado" }],
  };
  const merged = mergeBackups(local, remote);
  assert.deepEqual(merged["lt.leadStages"], remote["lt.leadStages"], "remote array wins whole, not entity by entity");
  assert.equal(merged["lt.leadStages"].at(-1).id, "Cerrado", "Cerrado is still last");
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

// ------------------------------------------------------- backup key selection
// The backup file gets committed to a repo, and the GitHub token lives in
// localStorage under lt.sync.config. Since the selection stopped being a closed
// whitelist, these asserts are the guarantee that the token stays home.
check("the GitHub token never leaves inside a backup", () => {
  store.clear();
  saveConfig(normalizeConfig({ token: "ghp_secret", repo: "me/tracker" }));
  setLastSyncedAt("2026-08-05T10:00:00.000Z");
  localStorage.setItem("lt.notes", JSON.stringify([{ id: "1", title: "maxi" }]));

  const backup = exportBackup();
  assert.deepEqual(Object.keys(JSON.parse(backup)), ["lt.notes"], "only non-sync lt.* keys may be exported");
  assert.ok(!backup.includes("ghp_secret"), "the token ended up inside the file we push to the repo");
  assert.ok(!backup.includes("lt.sync"), "no lt.sync key may show up in the backup, not even an empty one");
  store.clear();
});

check("a key this build does not know still travels in both directions", () => {
  store.clear();
  localStorage.setItem("lt.futureFeature", JSON.stringify({ id: "x" }));
  localStorage.setItem("lt.corrupt", "{not json");
  const exported = JSON.parse(exportBackup());
  assert.deepEqual(exported["lt.futureFeature"], { id: "x" }, "an unknown lt.* key must be forwarded, not dropped");
  assert.ok(!("lt.corrupt" in exported), "an unparseable entry is skipped instead of killing the whole backup");

  store.clear();
  importBackup(JSON.stringify({ "lt.futureFeature": [1, 2] }));
  assert.equal(localStorage.getItem("lt.futureFeature"), "[1,2]", "an unknown lt.* key must be imported, not discarded");
  store.clear();
});

check("importBackup ignores sync keys arriving from the remote file", () => {
  store.clear();
  saveConfig(normalizeConfig({ token: "mine", repo: "me/tracker" }));
  importBackup(
    JSON.stringify({
      "lt.sync.config": { token: "theirs", repo: "them/tracker", path: "x.json" },
      "lt.leadStages": [{ id: "Nuevo" }],
    }),
  );
  assert.equal(loadConfig().token, "mine", "a backup file must not be able to swap this device's token");
  assert.equal(localStorage.getItem("lt.leadStages"), JSON.stringify([{ id: "Nuevo" }]));
  store.clear();
});

check("isBackupKey excludes the whole lt.sync prefix, dot or no dot", () => {
  assert.equal(isBackupKey("lt.notes"), true);
  assert.equal(isBackupKey("lt.sync.config"), false);
  assert.equal(isBackupKey("lt.sync.lastSyncedAt"), false);
  // Deliberate: the exclusion carries no trailing dot, so it fails closed. A
  // future key named lt.syncSomething stays home instead of gambling that nobody
  // ever puts a secret one character short of the dotted namespace.
  assert.equal(isBackupKey("lt.syncSomething"), false);
  assert.equal(isBackupKey("theme"), false, "keys outside the lt. namespace are not ours to ship");
  assert.equal(isBackupKey("other.lt.notes"), false);
});

check("this machine's own preferences stay on this machine", () => {
  // lt.device is not about secrets, it is about scope: whether the sidebar is
  // collapsed on a 1440p screen says nothing about a phone, and syncing it would
  // let one device rearrange the other.
  assert.equal(isBackupKey(STORAGE_KEYS.sidebarCollapsed), false, "a device preference got into the backup");
  assert.equal(isBackupKey("lt.device.anythingElse"), false);
  // Same fail-closed shape as the sync exclusion: no trailing dot.
  assert.equal(isBackupKey("lt.deviceSomething"), false);

  store.clear();
  localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, "true");
  localStorage.setItem("lt.notes", JSON.stringify([{ id: "n1" }]));
  const backup = JSON.parse(exportBackup());
  assert.equal(STORAGE_KEYS.sidebarCollapsed in backup, false, "the sidebar preference was exported");
  assert.deepEqual(backup["lt.notes"], [{ id: "n1" }], "real data must still travel");
  store.clear();
});

// ------------------------------------------------------------ seeded note ids
// Two devices that seed before ever syncing have to produce the SAME note type
// ids, or the notes of whichever device adopts the other's backup end up
// pointing at type ids that no longer exist and lose their badge.
//
// NOTE: asserted against the source text, not by calling seedNoteTypes().
// seed.ts imports @/types and @/lib/i18n, and Node has no resolver for the `@/`
// alias here. Upgrade when this file needs a second seed assert: add an import
// map (node --experimental-import-map or a small resolve hook) and call the real
// function twice.
check("seedNoteTypes gives every device the same ids", () => {
  const src = readFileSync(new URL("../src/lib/seed.ts", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export const seedNoteTypes"));
  const fn = body.slice(0, body.indexOf("];") + 2);
  assert.ok(!fn.includes("randomUUID"), "note type ids must not be minted per device");
  assert.match(fn, /NOTE_TYPE_IDS\.map/, "ids come from the fixed slug list");
  assert.match(src, /const NOTE_TYPE_IDS = \[[^\]]+\]/, "the slug list is a literal");
  const ids = /const NOTE_TYPE_IDS = \[([^\]]+)\]/.exec(src)[1].split(",").length;
  const labels = /es: \["Quiero mejorar[^\]]+\]/.exec(src)[0].split(",").length;
  assert.equal(ids, labels, "one fixed id per label, or the seed pairs them wrong");
  assert.match(fn, /id: "lead"/, "the Business tab still filters leads on this literal");
});

console.log(`check-sync: OK, ${checks} checks`);
