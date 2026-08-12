// contexts/UiThemeContext.jsx
//
// The APP's colour theme — the six palettes in styles/tokens/themes.css.
//
// Deliberately separate from BoardThemeContext and PieceThemeContext. Those pick
// the colours of the chessboard squares and the piece set: chess CONTENT, which a
// player may well want to keep constant while changing the surrounding UI (and
// which, for board colours, is a paid feature stored server-side). This context
// only ever sets one thing: the `data-theme` attribute on <html>. All the actual
// colour lives in CSS.
//
// Storage mirrors BoardThemeContext exactly, including the per-user key. That is
// not incidental — coaches sign into many student accounts from one browser, and
// a single global `uiTheme` key would drag one student's theme onto the next
// student who logs in on that machine.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// The six palettes. `id` MUST match a [data-theme="..."] block in
// styles/tokens/themes.css. `swatch` is only for the picker UI — it is a
// duplicate of the CSS values, kept small on purpose: enough to render a
// preview chip, never the source of truth for what the app actually looks like.
export const UI_THEMES = [
  {
    id: 'obsidianGlass',
    name: 'Obsidian Glass',
    description: 'Pure obsidian dark with a cyan accent.',
    swatch: { bg: '#050505', surface: '#151515', accent: '#19c6d3', text: '#f2f2f2' },
  },
  {
    id: 'midnightCyan',
    name: 'Midnight Cyan',
    description: 'Cool dark base with cyan glow; modern and focused.',
    swatch: { bg: '#0B0C0C', surface: '#151922', accent: '#22d3ee', text: '#e5e7eb' },
  },
  {
    id: 'slateBlueSteel',
    name: 'Slate Blue Steel',
    description: 'Neutral, professional, easy on the eyes.',
    swatch: { bg: '#0B0C0C', surface: '#151820', accent: '#60a5fa', text: '#e5e7eb' },
  },
  {
    id: 'deepEmber',
    name: 'Deep Ember',
    description: 'Warm, energetic, inviting dark mode.',
    swatch: { bg: '#0B0C0C', surface: '#1a1612', accent: '#fbbf24', text: '#e5e7eb' },
  },
  {
    id: 'purpleHaze',
    name: 'Purple Haze',
    description: 'Premium, slightly gaming, memorable.',
    swatch: { bg: '#0B0C0C', surface: '#161320', accent: '#a78bfa', text: '#e5e7eb' },
  },
  {
    id: 'obsidianRose',
    name: 'Obsidian Rose',
    description: 'Bold and playful; stands out from the usual blue-grey.',
    swatch: { bg: '#0B0C0C', surface: '#1a1318', accent: '#f472b6', text: '#e5e7eb' },
  },
];

export const DEFAULT_UI_THEME_ID = 'obsidianGlass';

const VALID_IDS = new Set(UI_THEMES.map(t => t.id));

// Exported so the blocking script in index.html and this module cannot drift
// apart on the key format. If you change this, change index.html too.
export function uiThemeStorageKey(userId) {
  return userId ? `uiTheme_${userId}` : 'uiTheme_guest';
}

const UiThemeContext = createContext({
  themeId: DEFAULT_UI_THEME_ID,
  themes: UI_THEMES,
  setThemeId: () => {},
});

// Read a saved id, ignoring anything that is not one of ours. A stale id from an
// older build, or a hand-edited localStorage value, must not put the app into a
// state with no palette at all.
//
// Returns null when nothing valid is stored, rather than the default. The
// difference matters: "this user has no saved theme" and "this user chose the
// default" need different handling while auth is still resolving — see the
// mount-time note in the provider.
function readSavedThemeId(userId) {
  try {
    const saved = localStorage.getItem(uiThemeStorageKey(userId));
    if (saved && VALID_IDS.has(saved)) return saved;
  } catch { /* private mode / storage disabled */ }
  return null;
}

// What the blocking script in index.html already put on <html>, if it is one of
// ours. On first mount this is a better starting value than anything we can read
// ourselves: that script had access to `lastUserId` and so resolved the SIGNED-IN
// user's key, whereas React mounts with userId still null while the auth request
// is in flight.
function readAppliedThemeId() {
  try {
    const applied = document.documentElement.dataset.theme;
    if (applied && VALID_IDS.has(applied)) return applied;
  } catch { /* no document */ }
  return null;
}

// The single side effect of this whole module.
function applyThemeToDocument(id) {
  try {
    document.documentElement.dataset.theme = id;
  } catch { /* SSR / prerender — no document */ }
}

export function UiThemeProvider({ children, userId }) {
  // Start from whatever the blocking script already applied. Reading storage
  // ourselves here would be WRONG: React mounts before the auth request
  // resolves, so userId is null on the first render and we would look up
  // `uiTheme_guest`, find nothing, and overwrite the signed-in user's correct
  // theme with the default — a visible flash back to cyan a moment after load.
  const [themeId, setThemeIdState] = useState(
    () => readAppliedThemeId() || readSavedThemeId(userId) || DEFAULT_UI_THEME_ID
  );

  // Re-read when the signed-in user actually changes (login, logout, or a coach
  // switching between student accounts). Without this the previous user's theme
  // would persist visually for the rest of the session.
  //
  // `didResolveUser` guards the null->id transition that happens on every load
  // as auth resolves. Treating that as a "user change" would apply the guest
  // theme for a beat before the real one, reintroducing the flash.
  const didResolveUser = useRef(false);
  useEffect(() => {
    if (!didResolveUser.current) {
      didResolveUser.current = true;
      // First run. Only correct the theme if this user has an explicit saved
      // choice that differs from what the blocking script guessed.
      const saved = readSavedThemeId(userId);
      if (saved && saved !== themeId) {
        setThemeIdState(saved);
        applyThemeToDocument(saved);
      }
      return;
    }
    const next = readSavedThemeId(userId) || DEFAULT_UI_THEME_ID;
    setThemeIdState(next);
    applyThemeToDocument(next);
    // themeId is deliberately not a dependency: this effect reacts to the USER
    // changing, and including it would re-run on every theme change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Keep <html data-theme> in step with state.
  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  const setThemeId = useCallback((id) => {
    if (!VALID_IDS.has(id)) return;
    setThemeIdState(id);
    applyThemeToDocument(id);          // immediate, before React re-renders
    try {
      localStorage.setItem(uiThemeStorageKey(userId), id);
    } catch { /* private mode — theme still applies for this session */ }
  }, [userId]);

  return (
    <UiThemeContext.Provider value={{ themeId, themes: UI_THEMES, setThemeId }}>
      {children}
    </UiThemeContext.Provider>
  );
}

export function useUiTheme() {
  return useContext(UiThemeContext);
}
