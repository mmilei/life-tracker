// Key-parity check for src/lib/i18n.ts. No deps: reads the file as text and pulls
// the keys out of each language block. Exits 1 on any drift.
//   node scripts/check-i18n.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "i18n.ts");
const LANGS = ["es", "en"];

const src = readFileSync(FILE, "utf8");

// Each block is `\n  <lang>: {` … up to the closing `\n  },`. Values are single-line
// strings, so the closing marker is unambiguous (brace counting would trip on `{n}`).
function keysOf(lang) {
  const start = src.indexOf(`\n  ${lang}: {`);
  if (start === -1) throw new Error(`no "${lang}" block in ${FILE}`);
  const end = src.indexOf("\n  },", start);
  if (end === -1) throw new Error(`unterminated "${lang}" block in ${FILE}`);
  return [...src.slice(start, end).matchAll(/^\s{4}"([^"]+)":/gm)].map((m) => m[1]);
}

const problems = [];
const sets = {};

for (const lang of LANGS) {
  const keys = keysOf(lang);
  if (keys.length === 0) problems.push(`${lang}: no keys found — did the file layout change?`);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  for (const d of new Set(dupes)) problems.push(`${lang}: duplicate key "${d}"`);
  sets[lang] = new Set(keys);
}

const [a, b] = LANGS;
for (const k of sets[a]) if (!sets[b].has(k)) problems.push(`missing in ${b}: ${k}`);
for (const k of sets[b]) if (!sets[a].has(k)) problems.push(`missing in ${a}: ${k}`);

// Every {placeholder} must exist in both languages, or interpolation silently no-ops.
const placeholders = (lang, key) => {
  const re = new RegExp(`^\\s{4}"${key.replace(/\./g, "\\.")}":\\s*\\n?\\s*"(.*)"`, "m");
  const m = src.slice(src.indexOf(`\n  ${lang}: {`)).match(re);
  return new Set([...(m?.[1] ?? "").matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
};
for (const k of sets[a]) {
  if (!sets[b].has(k)) continue;
  const pa = placeholders(a, k);
  const pb = placeholders(b, k);
  if ([...pa].join() !== [...pb].join())
    problems.push(`placeholder mismatch on "${k}": ${a}={${[...pa]}} ${b}={${[...pb]}}`);
}

if (problems.length > 0) {
  console.error(`check-i18n: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`check-i18n: OK — ${sets[a].size} keys x ${LANGS.length} languages (${LANGS.join(", ")})`);
