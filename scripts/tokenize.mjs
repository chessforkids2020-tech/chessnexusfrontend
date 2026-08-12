#!/usr/bin/env node
/**
 * tokenize.mjs — replace hardcoded colour literals with design tokens.
 *
 *   node scripts/tokenize.mjs <paths...>            # dry run, prints a report
 *   node scripts/tokenize.mjs <paths...> --write    # actually edit the files
 *
 * WHY A STRING SUBSTITUTION AND NOT AN AST CODEMOD
 *
 * Colours in this codebase live in two places: CSS declarations, and quoted
 * string values inside inline `style={{ }}` objects. In both, the colour IS the
 * whole token — there is no syntax to understand and no scope to resolve. An AST
 * pass would give the same result with far more machinery.
 *
 * It is safe here for a reason specific to this codebase: each hex is used for
 * essentially one semantic role. `#9ca3af` appears as `color:` 661 times and as
 * `borderColor:` twice. So mapping it to --color-text-muted is right ~99.7% of
 * the time with no context analysis at all.
 *
 * WHY NOT CONVERT INLINE STYLES TO CLASSES
 *
 * Inline styles read `var(--x)` perfectly well. Converting ~6,500 style objects
 * to CSS classes would mean inventing ~6,500 class names and rewriting every
 * conditional style (`color: isActive ? '#06b6d4' : '#94a3b8'`) into a className
 * ternary — a months-long rewrite with a high regression rate and no
 * user-visible benefit over substitution.
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MAP = JSON.parse(readFileSync(join(ROOT, 'scripts/token-map.json'), 'utf8'));

/* ── Exclusions ────────────────────────────────────────────────────────────
 *
 * These are correctness rules, not preferences.
 *
 * BoardThemeContext / PieceThemeContext / CustomBoardColors hold the chessboard
 * square colours and piece-set definitions. Those are chess CONTENT, not UI
 * chrome — and board colours are a PAID feature whose values are also stored
 * server-side. Rewriting them to theme tokens would corrupt what users bought.
 *
 * Admin, coach and marketing routes are out of scope for this migration by
 * decision, not by accident: admin is internal, coach is a separate audience,
 * and marketing keeps a fixed brand look independent of the user's theme.
 */
const EXCLUDE_PATTERNS = [
  /BoardThemeContext/i,
  /PieceThemeContext/i,
  /CustomBoardColors/i,
  // The theme registry itself. Its `swatch` hexes are DATA: each one previews a
  // theme in that theme's OWN colours so all six can be compared side by side in
  // the picker. Rewriting them to var(--color-accent) would make every swatch
  // render in the currently-active theme — six identical chips.
  /UiThemeContext/i,
  /Chessboard/i,
  /PositionEditor/,
  /[\\/]pages[\\/]Admin/,
  /[\\/]pages[\\/]coach[\\/]/,
  /[\\/]components[\\/]coach[\\/]/,
  /[\\/]pages[\\/]marketing[\\/]/,
  /[\\/]components[\\/]marketing[\\/]/,
  /[\\/]arenarace-puzzletournament[\\/]/,
  /[\\/]node_modules[\\/]/,
  /[\\/]dist[\\/]/,
  /nul\.css$/,
];

const EXTS = new Set(['.jsx', '.js', '.css', '.tsx', '.ts']);

/* ── Normalisation ────────────────────────────────────────────────────────
 * The same colour is written many ways. These collapse the variants onto one
 * lookup key so the map does not need an entry per spelling.
 */
const normHex = (h) => {
  let v = h.toLowerCase();
  // #abc -> #aabbcc, so shorthand and longhand share a key.
  if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  return v;
};

const normRgba = (s) => {
  const inner = s.replace(/\s+/g, '').replace(/^rgba?\(/i, '').replace(/\)$/, '');
  const parts = inner.split(',');
  if (parts.length < 3) return null;
  const [r, g, b] = parts;
  let a = parts[3] ?? '1';
  // '.15' and '0.15' must be one key.
  if (a.startsWith('.')) a = '0' + a;
  // Trailing zeros: '0.30' -> '0.3'
  if (a.includes('.')) a = a.replace(/0+$/, '').replace(/\.$/, '');
  return a === '1' ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
};

// Flatten the map, dropping the "_comment" keys used for readability.
const flat = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([k]) => !k.startsWith('_'))
);
const HEX_MAP = flat(MAP.hex);
const RGBA_MAP = flat(MAP.rgba);

/* ── Alpha snapping ───────────────────────────────────────────────────────
 *
 * The codebase contains ~1,000 distinct rgba() strings, but only because the
 * same handful of colours appear at dozens of hand-picked alphas: 0.06, 0.07,
 * 0.08, 0.1, 0.12, 0.18, 0.22, 0.25… Listing every one in token-map.json would
 * bloat it past the point of being reviewable, which would defeat its purpose.
 *
 * Instead, an unmapped rgba is retried against the SAME base colour at the
 * nearest mapped alpha, within a tolerance. rgba(6,182,212,0.22) becomes
 * --color-accent-a20: a 0.02 shift no one can see, and the colour now follows
 * the theme instead of staying cyan forever.
 *
 * The tolerance is deliberately tight. Beyond it the difference is a design
 * decision someone made on purpose (a 0.5 scrim is not a 0.3 scrim), so the
 * literal is left alone and reported rather than quietly flattened.
 */
const ALPHA_TOLERANCE = 0.06;

// Pre-index the map by base colour so snapping is a lookup, not a scan.
const BY_BASE = new Map();
for (const [key, token] of Object.entries(RGBA_MAP)) {
  const m = key.match(/^rgba?\((\d+,\d+,\d+)(?:,([\d.]+))?\)$/);
  if (!m) continue;
  const base = m[1];
  const alpha = m[2] === undefined ? 1 : parseFloat(m[2]);
  if (!BY_BASE.has(base)) BY_BASE.set(base, []);
  BY_BASE.get(base).push({ alpha, token });
}

function snapRgba(key) {
  const m = key.match(/^rgba?\((\d+,\d+,\d+)(?:,([\d.]+))?\)$/);
  if (!m) return null;
  const rungs = BY_BASE.get(m[1]);
  if (!rungs) return null;                     // base colour not in the map at all
  const alpha = m[2] === undefined ? 1 : parseFloat(m[2]);
  let best = null;
  for (const r of rungs) {
    const d = Math.abs(r.alpha - alpha);
    if (d <= ALPHA_TOLERANCE && (!best || d < best.d)) best = { d, token: r.token };
  }
  return best ? best.token : null;
}

/* ── Skip rules ───────────────────────────────────────────────────────────
 * Lines that must keep their literal colour even inside an in-scope file.
 */
const shouldSkipLine = (line) => (
  // An existing var() fallback — rewriting the fallback defeats its purpose.
  /var\(--[^)]*,\s*#/.test(line) ||
  // SVG path/stop data and canvas fills, where a token would not resolve.
  /stopColor|stop-color/.test(line) ||
  // Anything already carrying an explicit opt-out.
  /tokenize-ignore/.test(line)
);

/* HTML NUMERIC ENTITIES ARE NOT COLOURS.
 *
 * `&#128202;` is the bar-chart emoji. It contains the substring "#128202",
 * which is indistinguishable from a six-digit hex colour to a naive regex — so
 * the first version of this script rewrote it to `&var(--color-success);`, and
 * the emoji rendered as that literal text on the dashboard.
 *
 * Entities are matched and masked out before the colour pass, then restored
 * afterwards. Masking rather than skipping the whole line, because a line can
 * legitimately contain both an entity and a real colour. */
const ENTITY = /&#\d+;|&#x[0-9a-fA-F]+;/g;

function maskEntities(line) {
  const found = [];
  const masked = line.replace(ENTITY, (m) => {
    found.push(m);
    return ` ENT${found.length - 1} `;
  });
  return { masked, found };
}

function unmaskEntities(line, found) {
  return line.replace(/ ENT(\d+) /g, (_, i) => found[+i]);
}

function processText(text, stats) {
  return text.split('\n').map((rawLine) => {
    if (shouldSkipLine(rawLine)) return rawLine;

    // Hide HTML entities from the colour regexes — see the note above.
    const { masked, found } = maskEntities(rawLine);
    let line = masked;

    // rgb/rgba first: a naive hex pass cannot match inside these anyway, but
    // doing them first keeps the two passes independent.
    line = line.replace(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/gi, (m) => {
      const key = normRgba(m);
      if (!key) return m;
      const exact = RGBA_MAP[key];
      if (exact) { stats.rgba++; return exact; }
      const snapped = snapRgba(key);
      if (snapped) { stats.rgba++; stats.snapped++; return snapped; }
      stats.unmapped.set(key, (stats.unmapped.get(key) || 0) + 1);
      return m;
    });

    // Hex. The trailing boundary stops #06b6d4ff (8-digit) being half-matched.
    line = line.replace(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b(?![0-9a-fA-F])/g, (m) => {
      const key = normHex(m);
      const hit = HEX_MAP[key];
      if (hit) { stats.hex++; return hit; }
      stats.unmapped.set(key, (stats.unmapped.get(key) || 0) + 1);
      return m;
    });

    return unmaskEntities(line, found);
  }).join('\n');
}

function collect(target, out = []) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const entry of readdirSync(target)) collect(join(target, entry), out);
  } else if (EXTS.has(extname(target))) {
    out.push(target);
  }
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const write = args.includes('--write');
const targets = args.filter((a) => !a.startsWith('--'));

if (!targets.length) {
  console.error('usage: node scripts/tokenize.mjs <paths...> [--write]');
  process.exit(1);
}

const files = targets.flatMap((t) => collect(t));
const totals = { hex: 0, rgba: 0, files: 0, skipped: 0 };
const allUnmapped = new Map();

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (EXCLUDE_PATTERNS.some((re) => re.test(file))) { totals.skipped++; continue; }

  const original = readFileSync(file, 'utf8');
  const stats = { hex: 0, rgba: 0, snapped: 0, unmapped: new Map() };
  const updated = processText(original, stats);

  for (const [k, n] of stats.unmapped) allUnmapped.set(k, (allUnmapped.get(k) || 0) + n);
  if (!stats.hex && !stats.rgba) continue;

  totals.hex += stats.hex;
  totals.rgba += stats.rgba;
  totals.files++;
  const snapNote = stats.snapped ? `, ${stats.snapped} alpha-snapped` : '';
  console.log(`${write ? 'WROTE' : 'would'}  ${rel}  (${stats.hex} hex, ${stats.rgba} rgba${snapNote})`);

  // Preserve a leading BOM if the file had one — Sidebar.jsx does, and some
  // toolchains care.
  if (write) writeFileSync(file, updated, 'utf8');
}

console.log(`\n${write ? 'Wrote' : 'Would change'} ${totals.files} file(s): ` +
            `${totals.hex} hex, ${totals.rgba} rgba  (${totals.skipped} excluded)`);

if (allUnmapped.size) {
  const top = [...allUnmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log(`\nUnmapped colours (${allUnmapped.size} distinct) — top ${top.length}:`);
  for (const [c, n] of top) console.log(`  ${String(n).padStart(4)}  ${c}`);
  console.log('\nThese keep their literal value. Add entries to token-map.json for any that matter.');
}

if (!write) console.log('\nDry run. Re-run with --write to apply.');
