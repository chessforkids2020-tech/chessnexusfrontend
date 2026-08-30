#!/usr/bin/env node
/**
 * Harvest every FAQ answer already written across the marketing pages into one
 * searchable bank for the Help Center chat.
 *
 * WHY EXTRACT RATHER THAN RE-WRITE
 * ~142 questions are already answered on the landing pages, in the product's
 * own voice and kept current with the features. Re-typing them by hand would
 * fork the wording and guarantee the two drift apart. This reads them at build
 * time, so re-running it picks up any edits made to a marketing page.
 *
 * Answers come in two shapes:
 *   a: "plain string"      -> used directly
 *   a: (<>JSX…</>)          -> paired with a `plain:` field, which we use
 *
 * Output: src/data/helpAnswers.generated.js
 *
 * Usage:  node scripts/buildHelpAnswers.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src', 'pages', 'marketing');
const OUT = path.join(__dirname, '..', 'src', 'data', 'helpAnswers.generated.js');

// Which audience a page's questions belong to, so the chat can route them.
// Anything not listed is treated as a player question.
const COACH_PAGES = /coach|academy|classroom|founding|referral|pricing/i;

/** Pull `q:` / `a:` / `plain:` string literals out of a source file. */
function extract(source) {
  const out = [];
  // Match a q: followed by either a string `a:` or a `plain:` further down.
  // Deliberately line-based rather than a JS parser: these files are hand-
  // written in one consistent shape, and a parser would be far more machinery
  // than the job needs.
  const lines = source.split('\n');
  let q = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mq = line.match(/^\s*q:\s*(["'`])([\s\S]*?)\1\s*,\s*$/);
    if (mq) { q = mq[2]; continue; }
    if (!q) continue;

    // Plain-string answer on one line.
    const ma = line.match(/^\s*(?:a|plain):\s*(["'`])([\s\S]*?)\1\s*,\s*$/);
    if (ma) { out.push({ q, a: ma[2] }); q = null; continue; }

    // Multi-line string answer: join until the closing quote.
    const open = line.match(/^\s*(?:a|plain):\s*(["'`])(.*)$/);
    if (open) {
      const quote = open[1];
      let buf = open[2];
      while (i + 1 < lines.length && !buf.trimEnd().endsWith(quote)) {
        i += 1;
        buf += ' ' + lines[i].trim();
      }
      const text = buf.replace(new RegExp(`${quote}\\s*,?\\s*$`), '').trim();
      if (text) { out.push({ q, a: text }); q = null; }
      continue;
    }

    // A JSX answer with no `plain:` — skip it rather than shipping markup.
    if (/^\s*a:\s*\(/.test(line)) { /* wait for plain: */ }
  }
  return out;
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.jsx'));
const seen = new Set();
const entries = [];

for (const file of files) {
  const source = fs.readFileSync(path.join(SRC, file), 'utf8');
  const audience = COACH_PAGES.test(file) ? 'coach' : 'player';
  for (const { q, a } of extract(source)) {
    // Reject answers that still carry an unresolved template expression: those
    // are interpolated at render time on the marketing page, and lifting the raw
    // string would show a user "${REWARD_PCT}% of the subscription".
    if (/\$\{/.test(a) || /[<>]/.test(a)) continue;

    // Deduplicate on the question: several landing pages answer "is it free?"
    // and the chat should offer one answer, not five near-identical ones.
    const key = q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ q, a, audience, source: file.replace('.jsx', '') });
  }
}

entries.sort((x, y) => x.q.localeCompare(y.q));

const banner = `// GENERATED — do not edit by hand.
//
// Built by scripts/buildHelpAnswers.mjs from the FAQ blocks already written on
// the marketing pages, so the Help Center chat answers in the same words the
// site uses elsewhere. Re-run the script after editing any marketing FAQ:
//
//   node scripts/buildHelpAnswers.mjs
//
// ${entries.length} answers from ${files.length} pages.
`;

fs.writeFileSync(
  OUT,
  `${banner}\nexport const GENERATED_ANSWERS = ${JSON.stringify(entries, null, 2)};\n`,
);

console.log(`scanned ${files.length} pages`);
console.log(`extracted ${entries.length} unique answers`);
console.log(`  coach : ${entries.filter(e => e.audience === 'coach').length}`);
console.log(`  player: ${entries.filter(e => e.audience === 'player').length}`);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
