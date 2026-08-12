// lib/chartTheme.js
//
// The bridge between CSS design tokens and Chart.js.
//
// Chart.js paints to a <canvas>. Canvas has no CSS cascade, so a dataset given
// `borderColor: 'var(--color-accent)'` does not resolve it — @kurkle/color
// reports the string as invalid and the series renders with no colour at all.
// (Verified: new Color('var(--color-accent)').valid === false.)
//
// So the tokens have to be resolved to concrete rgb() strings in JS, at render
// time, and re-resolved whenever the theme changes. getComputedStyle is what
// does the resolving — it returns the *computed* value of a custom property,
// i.e. exactly what the active [data-theme] block put there.

import { useEffect, useState } from 'react';

/** Resolve one custom property to a concrete colour string. */
function token(styles, name, fallback) {
  const v = styles.getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Read the current theme's chart palette.
 *
 * Must run in the browser and after first paint — before that, custom
 * properties resolve to empty strings. Every value has a literal fallback so a
 * chart still renders if this is called too early or outside a themed tree.
 */
export function readChartColors() {
  if (typeof document === 'undefined') return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  return {
    accent:    token(s, '--color-accent', '#19c6d3'),
    accent2:   token(s, '--color-accent-2', '#12a8b5'),
    success:   token(s, '--color-success', '#24b47e'),
    warning:   token(s, '--color-warning', '#d79a1e'),
    danger:    token(s, '--color-danger', '#ef6b6b'),

    // Translucent fills for area charts.
    accentFill:  token(s, '--color-accent-a12', 'rgb(25 198 211 / 0.12)'),
    successFill: token(s, '--color-success-a12', 'rgb(36 180 126 / 0.12)'),
    dangerFill:  token(s, '--color-danger-a12', 'rgb(239 107 107 / 0.12)'),

    // Chart chrome.
    text:  token(s, '--color-text-muted', '#9ca3af'),
    grid:  token(s, '--color-white-a07', 'rgb(255 255 255 / 0.07)'),
    surface: token(s, '--color-surface', '#151515'),

    /**
     * Categorical series colours, in order. Accent first so a single-series
     * chart matches the rest of the page, then hues that stay distinguishable
     * from it in every one of the six themes.
     */
    series: [
      token(s, '--color-accent', '#19c6d3'),
      token(s, '--color-success', '#24b47e'),
      token(s, '--color-warning', '#d79a1e'),
      token(s, '--color-accent-2', '#12a8b5'),
      token(s, '--color-danger', '#ef6b6b'),
    ],
  };
}

const FALLBACK = {
  accent: '#19c6d3', accent2: '#12a8b5', success: '#24b47e',
  warning: '#d79a1e', danger: '#ef6b6b',
  accentFill: 'rgb(25 198 211 / 0.12)',
  successFill: 'rgb(36 180 126 / 0.12)',
  dangerFill: 'rgb(239 107 107 / 0.12)',
  text: '#9ca3af', grid: 'rgb(255 255 255 / 0.07)', surface: '#151515',
  series: ['#19c6d3', '#24b47e', '#d79a1e', '#12a8b5', '#ef6b6b'],
};

/**
 * Chart colours for the active theme, re-read when the theme changes.
 *
 * Watches the `data-theme` attribute with a MutationObserver rather than
 * subscribing to UiThemeContext, so a chart can live anywhere — including
 * outside the provider — and still recolour. The returned object is a NEW
 * object on every theme change, which is what makes react-chartjs-2 notice:
 * it re-renders on data/options identity change, so a value memoised on `[]`
 * would freeze the palette at whatever it was on mount.
 */
export function useChartTheme() {
  const [colors, setColors] = useState(() => readChartColors());

  useEffect(() => {
    // Re-read after mount: on the very first render the stylesheet may not have
    // been applied yet, so the initial useState value can be the fallback.
    setColors(readChartColors());

    const obs = new MutationObserver(() => setColors(readChartColors()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  return colors;
}

/**
 * Baseline Chart.js options for this app's dark themes.
 *
 * Chart.js defaults assume a light background: near-black text and grey
 * gridlines, both of which vanish on our surfaces. Spreading this into a
 * chart's options fixes the axes, legend and tooltip in one line.
 */
export function chartBaseOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: c.text, usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        backgroundColor: c.surface,
        titleColor: c.accent,
        bodyColor: c.text,
        borderColor: c.grid,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: { ticks: { color: c.text }, grid: { color: c.grid } },
      y: { ticks: { color: c.text }, grid: { color: c.grid } },
    },
  };
}
