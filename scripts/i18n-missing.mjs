// scripts/i18n-missing.mjs
//
// Lists English strings passed to t(...) / tr(...) that have no Spanish entry
// in src/i18n/es yet. Run after adding or changing user-facing text:
//
//   npm run i18n:missing            → missing keys, grouped by file
//   npm run i18n:missing -- --json  → the same as JSON (for tooling)
//
// Only literal string arguments can be checked; t(variable) is skipped.
// Admin pages never call t(), so they never show up here.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

const { default: ES } = await import(pathToFileURL(join(SRC, 'i18n', 'es', 'index.js')).href);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'i18n') walk(p, out); }
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

// t('…') / t("…") / tr('…') / tr("…") — literal first argument only.
const CALL = /\btr?\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
const unescape = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

const missing = new Map();   // key -> Set(files)
let total = 0;
for (const file of walk(SRC)) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(CALL)) {
    const key = unescape(m[1] ?? m[2] ?? '');
    if (!/[A-Za-z]{2,}/.test(key)) continue;
    total++;
    if (ES[key] === undefined) {
      if (!missing.has(key)) missing.set(key, new Set());
      missing.get(key).add(relative(SRC, file).replace(/\\/g, '/'));
    }
  }
}

if (process.argv.includes('--json')) {
  const byFile = {};
  for (const [k, files] of missing) for (const f of files) (byFile[f] ||= []).push(k);
  console.log(JSON.stringify(byFile, null, 2));
} else {
  const byFile = new Map();
  for (const [k, files] of missing) for (const f of files) {
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(k);
  }
  for (const [f, keys] of [...byFile].sort()) {
    console.log(`\n${f} (${keys.length})`);
    for (const k of keys) console.log('  ' + JSON.stringify(k));
  }
  console.log(`\n${missing.size} missing of ${total} translated calls checked.`);
}
