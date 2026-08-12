#!/usr/bin/env node
/**
 * check-colors.mjs — a RATCHET on hardcoded colour literals.
 *
 *   node scripts/check-colors.mjs              # check against the baseline
 *   node scripts/check-colors.mjs --update     # accept the current count
 *
 * Why a ratchet and not a ban:
 *
 * ~6,500 colour literals survive the token migration — a genuine long tail of
 * ~900 distinct values, nearly all used once or twice. Failing the build on any
 * hardcoded colour would mean fixing all of them before anything else could
 * merge, so in practice it would be switched off within a week.
 *
 * Instead this fails only when the count goes UP. Existing colours are
 * tolerated; new ones are not. The number can only fall, and every migration
 * that lowers it also lowers the bar for the next one. Run it in CI.
 *
 * Not a substitute for stylelint/eslint rules, which give better in-editor
 * feedback — but it needs no per-file config and tolerates the tail, which is
 * what makes it survivable.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_FILE = join(ROOT, 'scripts/color-baseline.json');

// Scope matches the migration: admin, coach and marketing were deliberately
// left out, and chess CONTENT (board/piece colours) must never be tokenised.
const SKIP = /[\\/](Admin|coach|marketing)|BoardTheme|PieceTheme|UiThemeContext|CustomBoardColors|Chessboard|PositionEditor|arenarace-puzzletournament/i;
const EXT = new Set(['.jsx', '.js', '.css', '.tsx']);

// A var() fallback (`var(--x, #06b6d4)`) is a safety net, not a hardcoded
// colour — the token wins whenever it is defined. Not counted.
const FALLBACK = /var\(--[^)]*,\s*(#[0-9a-fA-F]{3,8}|rgba?\()/;

function count(dir, acc = { n: 0, files: 0 }) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (SKIP.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) { count(p, acc); continue; }
    if (!EXT.has(extname(p))) continue;
    acc.files++;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (FALLBACK.test(line)) continue;
      const m = line.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|rgba?\(\s*\d+/g);
      if (m) acc.n += m.length;
    }
  }
  return acc;
}

const { n, files } = count(join(ROOT, 'src'));
const update = process.argv.includes('--update');

if (update || !existsSync(BASELINE_FILE)) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ colors: n, updated: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
  console.log(`baseline set: ${n} colour literals across ${files} files`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).colors;
const delta = n - baseline;

if (delta > 0) {
  console.error(`\n  FAIL  ${n} hardcoded colour literals — ${delta} MORE than the baseline of ${baseline}.\n`);
  console.error('  New colours must use a design token from src/styles/tokens/themes.css:');
  console.error('    colour   -> var(--color-accent) / --color-text / --color-danger …');
  console.error('    surface  -> var(--color-surface) / --color-bg');
  console.error('    border   -> var(--color-border)\n');
  console.error('  Charts are the exception: Chart.js paints to canvas and cannot read');
  console.error('  var(), so use useChartTheme() from src/lib/chartTheme.js.\n');
  console.error('  If the increase is genuinely justified, run with --update.\n');
  process.exit(1);
}

console.log(`OK  ${n} colour literals (baseline ${baseline}${delta < 0 ? `, ${-delta} fewer — nice` : ''})`);
