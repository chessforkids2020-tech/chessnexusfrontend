#!/usr/bin/env node
/**
 * fix-chart-colors.mjs — one-shot repair for Chart.js colour props.
 *
 * The global token sweep rewrote every colour literal to `var(--token)`, which
 * is correct for CSS and inline styles but WRONG inside a Chart.js config:
 * charts paint to <canvas>, which has no CSS cascade, so @kurkle/color reports
 * `var(--color-accent)` as invalid and the series renders with no colour.
 *
 * This swaps those strings for references to the resolved palette returned by
 * useChartTheme() in src/lib/chartTheme.js.
 *
 * Kept in scripts/ rather than run inline because it is worth being able to
 * re-run it if a new chart is added with the same mistake.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MAP = {
  '--color-accent': 'chartColors.accent',
  '--color-accent-2': 'chartColors.accent2',
  '--color-success': 'chartColors.success',
  '--color-warning': 'chartColors.warning',
  '--color-danger': 'chartColors.danger',
  '--color-accent-a06': 'chartColors.accentFill',
  '--color-accent-a08': 'chartColors.accentFill',
  '--color-accent-a12': 'chartColors.accentFill',
  '--color-accent-a15': 'chartColors.accentFill',
  '--color-accent-a20': 'chartColors.accentFill',
  '--color-accent-a30': 'chartColors.accentFill',
  '--color-accent-a40': 'chartColors.accentFill',
  '--color-accent-2-a15': 'chartColors.accentFill',
  '--color-accent-2-a30': 'chartColors.accentFill',
  '--color-success-a12': 'chartColors.successFill',
  '--color-success-a20': 'chartColors.successFill',
  '--color-success-a30': 'chartColors.successFill',
  '--color-danger-a12': 'chartColors.dangerFill',
  '--color-danger-a20': 'chartColors.dangerFill',
  '--color-danger-a30': 'chartColors.dangerFill',
  '--color-warning-a12': 'chartColors.warning',
  '--color-warning-a20': 'chartColors.warning',
  '--color-warning-a30': 'chartColors.warning',
  '--color-text': 'chartColors.text',
  '--color-text-muted': 'chartColors.text',
  '--color-text-faint': 'chartColors.text',
  '--color-white-a04': 'chartColors.grid',
  '--color-white-a07': 'chartColors.grid',
  '--color-white-a10': 'chartColors.grid',
  '--color-white-a13': 'chartColors.grid',
  '--color-surface': 'chartColors.surface',
  '--color-surface-2': 'chartColors.surface',
  '--color-bg': 'chartColors.surface',
};

// Chart.js colour properties only. Deliberately narrow: the same file also has
// ordinary inline styles, and `var()` is correct there.
const PROPS = [
  'borderColor', 'backgroundColor', 'pointBackgroundColor', 'pointBorderColor',
  'pointHoverBackgroundColor', 'pointHoverBorderColor', 'hoverBackgroundColor',
  'hoverBorderColor', 'titleColor', 'bodyColor',
].join('|');

const RE = new RegExp(`(${PROPS})(\\s*:\\s*)'var\\((--[a-z0-9-]+)\\)'`, 'g');

let total = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let n = 0;
  const out = src.replace(RE, (m, prop, sep, tokenName) => {
    const target = MAP[tokenName];
    if (!target) return m;
    n++;
    return `${prop}${sep}${target}`;
  });
  if (n) {
    writeFileSync(file, out, 'utf8');
    total += n;
    console.log(`  ${file.replace(/.*[\\/]src[\\/]/, 'src/')}  (${n})`);
  }
}
console.log(`\nrewired ${total} chart colour(s)`);
