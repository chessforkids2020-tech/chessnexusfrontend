// contexts/UiThemeContext.jsx
//
// The APP's colour theme — the nine palettes in styles/tokens/themes.css.
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
import api from '../api';
import { applyPairedBoard } from './BoardThemeContext';

// The nine palettes. `id` MUST match a [data-theme="..."] block in
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
  {
    id: 'obsidianEmerald',
    name: 'Obsidian Emerald',
    description: 'Deep black with rich emerald. Serious and premium.',
    swatch: { bg: '#0B0F0E', surface: '#121817', accent: '#10b981', text: '#e6edeb' },
  },
  {
    id: 'royalViolet',
    name: 'Royal Violet',
    description: 'Very dark violet with refined purple. Luxury and gaming.',
    swatch: { bg: '#0F0A1F', surface: '#1A1133', accent: '#8b5cf6', text: '#f0ecff' },
  },
  {
    id: 'goldSovereign',
    name: 'Gold Sovereign',
    description: 'Black with muted gold. Prestigious and chess-like.',
    swatch: { bg: '#0A0A0C', surface: '#111114', accent: '#c6a87c', text: '#edebe6' },
  },
];

export const DEFAULT_UI_THEME_ID = 'obsidianGlass';

// The chessboard each theme suggests, by BOARD_THEMES id in BoardThemeContext.
//
// Picking a theme should dress the whole app, and a board left on Classic Green
// under a gold or violet UI was the one piece that stayed behind. These are
// SUGGESTIONS, not part of the theme: the board remains a separate setting the
// user can change at any time, and once they do, themes never touch it again
// (see applyPairedBoard below).
//
// Chosen by comparing each board's dark square to the theme accent in OKLCH
// hue — perceptual, so a pale board still counts as matching a vivid accent if
// the hue agrees. Every pairing here is within 24° except Obsidian Glass, which
// deliberately keeps the app default: it is the default theme, and changing the
// board out from under a user who never chose either would be a surprise.
export const THEME_BOARD_PAIRS = Object.freeze({
  obsidianGlass:   'green',        // Classic Green — the app default, unchanged
  midnightCyan:    'ocean',        // Blue Ocean
  slateBlueSteel:  'blue',         // Blue Board      (3° — near exact)
  deepEmber:       'wood',         // Wood Tournament (24°)
  purpleHaze:      'purple',       // Purple Royal    (17°)
  obsidianRose:    'mahogany',     // Red Mahogany    (33°)
  obsidianEmerald: 'emerald',      // Emerald Green   (13°)
  royalViolet:     'violetroyale', // Violet Royale   — added for this theme
  goldSovereign:   'wood1',        // Wood Board      (20°)
});

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

  // RECONCILE LOCAL AND SERVER, once per signed-in user.
  //
  // Two different problems, one exchange:
  //
  //  1. NEW DEVICE (localStorage cold). Without this the user signs in on a
  //     phone or a second browser, sees the default theme, and reasonably
  //     concludes the app forgot their settings. Pull the server value down.
  //
  //  2. EXISTING USER (server null). User.uiTheme was added after themes
  //     shipped, so long-standing users have their only real choice sitting in
  //     this browser. No migration can fix that — the answer exists nowhere
  //     else — so push the local value up.
  //
  // Local wins when both exist: it is what the user is looking at right now,
  // and on a shared machine it is the more recent action.
  //
  // The order matters. Pushing unconditionally would let a cold browser
  // overwrite a real server choice with the default, which would break the
  // public profile too — so the push only happens when something is stored
  // locally, and the pull only when nothing is.
  const didSyncTheme = useRef(null);
  useEffect(() => {
    if (!userId || didSyncTheme.current === userId) return;
    didSyncTheme.current = userId;

    const saved = readSavedThemeId(userId);
    if (saved) {
      api.post('/api/auth/themes/active', { themeId: saved })
        .catch(() => { /* offline — retried next session */ });
      return;
    }

    // Nothing stored here: adopt whatever the account says.
    api.get('/api/auth/themes')
      .then(res => {
        const serverId = res?.data?.activeThemeId;
        if (!serverId || !VALID_IDS.has(serverId)) return;
        // Re-check that nothing was chosen while the request was in flight, so
        // a user who picked a theme meanwhile is not yanked back.
        if (readSavedThemeId(userId)) return;
        setThemeIdState(serverId);
        applyThemeToDocument(serverId);
        try {
          localStorage.setItem(uiThemeStorageKey(userId), serverId);
        } catch { /* private mode — applies for this session anyway */ }
      })
      .catch(() => { /* offline — default theme stands for this session */ });
  }, [userId]);

  const setThemeId = useCallback((id) => {
    if (!VALID_IDS.has(id)) return;
    setThemeIdState(id);
    applyThemeToDocument(id);          // immediate, before React re-renders
    try {
      localStorage.setItem(uiThemeStorageKey(userId), id);
    } catch { /* private mode — theme still applies for this session */ }

    // Dress the board to match — but only for a user who has never picked one.
    // applyPairedBoard enforces that rule; anyone who has chosen a board keeps
    // it through every future theme change. The board stays a separate setting
    // they can change whenever they like without touching their theme.
    applyPairedBoard(userId, THEME_BOARD_PAIRS[id]);

    // Mirror the choice to the server so OTHER people see this profile in it.
    // localStorage stays the source of truth for this user's own session (it is
    // readable before auth resolves, which is what prevents a flash on load);
    // the server copy exists purely so a visitor, who cannot read this
    // browser's storage, can paint the profile in its owner's colours.
    //
    // Deliberately fire-and-forget. Changing a theme must feel instant and must
    // keep working when signed out or offline — a failed write only means the
    // public profile lags a session behind, never that the picker breaks. The
    // server re-checks ownership, so nothing here is trusted anyway.
    if (userId) {
      api.post('/api/auth/themes/active', { themeId: id })
        .catch(() => { /* offline or signed out — local choice already applied */ });
    }
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
