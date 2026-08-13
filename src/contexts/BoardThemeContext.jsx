import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

// 16 board themes — index 0 is the default (current green)
export const BOARD_THEMES = [
  { id: 'green',        name: 'Classic Green',    light: '#EEEED2', dark: '#769656' },
  { id: 'brown',        name: 'Standard Brown',    light: '#F0D9B5', dark: '#B58863' },
  { id: 'ocean',        name: 'Blue Ocean',       light: '#C8D4E3', dark: '#6E8BAA' },
  { id: 'slate',        name: 'Gray Slate',       light: '#D0D3D6', dark: '#7A8288' },
  { id: 'wood',         name: 'Wood Tournament',  light: '#E2C39B', dark: '#A66D3B' },
  { id: 'purple',       name: 'Purple Royal',     light: '#C9B7D6', dark: '#6D537F' },
  { id: 'mahogany',     name: 'Red Mahogany',     light: '#D7B08A', dark: '#8B3A3A' },
  { id: 'dark',         name: 'Dark Tournament',  light: '#645F58', dark: '#3F3A33' },
  { id: 'marble',       name: 'Marble Stone',     light: '#E8E8E8', dark: '#B8B8BB' },
  { id: 'darkgold',     name: 'Dark Gold',        light: '#A2895B', dark: '#3F3A33' },
  { id: 'tan',          name: 'Tan Coral',        light: '#EBCFAC', dark: '#9D6756' },
  { id: 'gray',         name: 'Gray Board',       light: '#8B8A89', dark: '#696867' },
  { id: 'blue',         name: 'Blue Board',       light: '#F2F6FA', dark: '#5596F2' },
  { id: 'wood1',        name: 'Wood Board',       light: '#BC9E7B', dark: '#73533C' },
  { id: 'emerald',      name: 'Emerald Green',    light: '#DCE8D8', dark: '#4C8C5A' },
  { id: 'hunter',       name: 'Hunter Green',     light: '#D7E0D0', dark: '#355E3B' },
  // Added for the Royal Violet app theme. Purple Royal was the closest existing
  // board (18° of hue away) but is a soft lilac, where Royal Violet is a deep
  // saturated violet — pairing them left the board looking washed out beside
  // the UI. Contrast is 5.25:1, inside the range the other 16 already span.
  { id: 'violetroyale', name: 'Violet Royale',    light: '#D6CCEB', dark: '#5B4485' },
];

export const DEFAULT_THEME = BOARD_THEMES[0];

const BoardThemeContext = createContext({
  theme: DEFAULT_THEME,
  setThemeById: () => {},
  setCustomTheme: () => {},
  customTheme: null,
});

// Id used for a user's own colours, so it never collides with a preset.
export const CUSTOM_THEME_ID = 'custom';

function storageKey(userId) {
  return userId ? `boardTheme_${userId}` : 'boardTheme_guest';
}

// Write the selection to this browser only. Used when RESTORING a board from
// the account, where posting it back to the server would be a pointless
// round-trip for a value that came from there.
function persistLocal(userId, boardId) {
  try { localStorage.setItem(storageKey(userId), boardId); } catch { /* ignore */ }
}

// Whether the account's stored board has been fetched yet, per user id.
//
// On a NEW DEVICE localStorage is empty, so hasExplicitBoardChoice() answers
// "never picked one" until /board-colors comes back — a window in which a theme
// change would apply its paired board over the user's real one, on this device
// AND on the server. Themes therefore wait for this to be true before touching
// the board. Nothing else is delayed by it.
const boardLoaded = new Set();
function markBoardLoaded(userId) {
  boardLoaded.add(userId || 'guest');
}
function isBoardLoaded(userId) {
  // Signed-out users have no account board to wait for.
  return !userId || boardLoaded.has(userId);
}

// Has this user ever chosen a board themselves?
//
// The key is written ONLY as a result of the user picking one, or of a paired
// board being applied — after which they count as having one either way. So its
// presence is exactly "there is a board to preserve", and its absence is "still
// on the untouched default". That is the signal app themes use to decide
// whether they may suggest a board: an explicit choice is never overwritten.
//
// Deliberately not a separate "hasChosen" flag. A second key could drift out of
// step with the real one, and this needs no migration for existing users —
// anyone who ever picked a board already has it set.
export function hasExplicitBoardChoice(userId) {
  try {
    return !!localStorage.getItem(storageKey(userId));
  } catch {
    // Storage unavailable: treat as "has chosen" so we never override a board
    // we simply cannot read. Doing nothing is the safe failure here.
    return true;
  }
}

// Apply a theme's suggested board, but ONLY for a user who has never picked one.
// Returns true if the board was actually changed, so callers can tell the user.
export function applyPairedBoard(userId, boardId) {
  // Not yet known whether the account has a board — see boardLoaded above.
  // Skipping is safe: the pairing is a nicety, overwriting a real choice is not.
  if (!isBoardLoaded(userId)) return false;
  if (!boardId || hasExplicitBoardChoice(userId)) return false;
  const found = BOARD_THEMES.find(t => t.id === boardId);
  if (!found) return false;
  try {
    // Written under the SAME key a manual pick uses. That is intended: from
    // here on the user counts as having a board, so later theme changes leave
    // it alone. The pairing applies once, on the first theme they choose.
    localStorage.setItem(storageKey(userId), boardId);
  } catch {
    return false;
  }

  // Persist to the account as well, so the paired board follows the user to
  // another device instead of that device re-deriving it (or not, once its own
  // localStorage has a theme but no board).
  if (userId) {
    api.post('/api/auth/appearance', { boardTheme: boardId })
      .catch(() => { /* offline — applied locally regardless */ });
  }
  // Tell any mounted provider to re-read, so boards on screen update without a
  // reload. A plain localStorage write fires no event in the writing tab.
  try {
    window.dispatchEvent(new CustomEvent('boardtheme:changed', { detail: { userId, boardId } }));
  } catch { /* no window — nothing to update */ }
  return true;
}

export function BoardThemeProvider({ children, userId }) {
  // The user's own colours, bought with XP and stored SERVER-side (the presets
  // below are free and stay in localStorage). Null until loaded / if unbought.
  const [customTheme, setCustomThemeState] = useState(null);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const found = BOARD_THEMES.find(t => t.id === saved);
        if (found) return found;
      }
    } catch { /* ignore */ }
    return DEFAULT_THEME;
  });

  // When userId changes (login/logout), reload from that user's saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const found = BOARD_THEMES.find(t => t.id === saved);
        if (found) { setTheme(found); return; }
      }
    } catch { /* ignore */ }
    setTheme(DEFAULT_THEME);
  }, [userId]);

  // Re-read when applyPairedBoard() writes a board on our behalf — picking an
  // app theme can set the paired board, and every board on screen should follow
  // immediately. localStorage writes fire no storage event in the writing tab,
  // hence the explicit custom event.
  useEffect(() => {
    const onChanged = () => {
      try {
        const saved = localStorage.getItem(storageKey(userId));
        const found = BOARD_THEMES.find(t => t.id === saved);
        if (found) setTheme(found);
      } catch { /* ignore */ }
    };
    window.addEventListener('boardtheme:changed', onChanged);
    return () => window.removeEventListener('boardtheme:changed', onChanged);
  }, [userId]);

  // Load the user's purchased colours from the server. They must be server-side
  // to survive a cache clear or another device — localStorage would also let
  // anyone hand themselves the paid feature from DevTools.
  useEffect(() => {
    let alive = true;
    if (!userId) { setCustomThemeState(null); return undefined; }
    api.get('/api/auth/board-colors')
      .then(res => {
        // Marked before the `alive` bail-out: the answer has arrived for this
        // user regardless of whether this particular effect is still mounted.
        markBoardLoaded(userId);
        if (!alive) return;
        const { unlocked, light, dark, boardTheme: serverBoard } = res.data || {};
        const custom = unlocked && light && dark
          ? { id: CUSTOM_THEME_ID, name: 'My colours', light, dark }
          : null;
        setCustomThemeState(custom);

        let localChoice = null;
        try { localChoice = localStorage.getItem(storageKey(userId)); } catch { /* ignore */ }

        // If custom was the last selection, apply it now that we have the hexes.
        if (custom && localChoice === CUSTOM_THEME_ID) {
          setTheme(custom);
          return;
        }

        // RECONCILE, same rule as the app theme (see UiThemeContext).
        //
        // Nothing stored locally means either a new device or a browser whose
        // storage was cleared. Restoring the account's board here is what stops
        // a user signing in on their phone, seeing Classic Green, and thinking
        // the app forgot their settings.
        if (!localChoice) {
          if (!serverBoard) return;                       // never picked one anywhere
          if (serverBoard === CUSTOM_THEME_ID) {
            if (custom) { setTheme(custom); persistLocal(userId, CUSTOM_THEME_ID); }
            return;                                       // bought colours missing — leave default
          }
          const found = BOARD_THEMES.find(t => t.id === serverBoard);
          if (found) { setTheme(found); persistLocal(userId, serverBoard); }
          return;
        }

        // Local choice exists but the account has none (a user from before the
        // board was stored server-side). Push it up so the NEXT device has it.
        if (!serverBoard) {
          api.post('/api/auth/appearance', { boardTheme: localChoice })
            .catch(() => { /* offline — retried next session */ });
        }
      })
      .catch(() => {
        // Also mark loaded on failure. Otherwise one offline request would
        // disable theme/board pairing for the rest of the session — and a user
        // with no stored board would be stuck on the default with no way to
        // discover the pairing. Falling back to the localStorage answer is the
        // pre-existing behaviour and is correct here.
        markBoardLoaded(userId);
        if (alive) setCustomThemeState(null);
      });
    return () => { alive = false; };
  }, [userId]);

  // Mirror the selection to the account so another device restores it.
  // Fire-and-forget: the board must change instantly and keep working when
  // signed out or offline, where the only cost of a failure is that this
  // device knows the choice and the next one does not.
  const pushBoard = useCallback((boardId) => {
    if (!userId) return;
    api.post('/api/auth/appearance', { boardTheme: boardId })
      .catch(() => { /* offline — local choice already applied */ });
  }, [userId]);

  const setThemeById = useCallback((id) => {
    if (id === CUSTOM_THEME_ID) {
      if (!customTheme) return;              // not bought / not set yet
      setTheme(customTheme);
      persistLocal(userId, CUSTOM_THEME_ID);
      pushBoard(CUSTOM_THEME_ID);
      return;
    }
    const found = BOARD_THEMES.find(t => t.id === id);
    if (!found) return;
    setTheme(found);
    persistLocal(userId, id);
    pushBoard(id);
  }, [userId, customTheme, pushBoard]);

  // Called by the picker after a successful save, so every board on screen
  // updates immediately without a reload.
  const setCustomTheme = useCallback(({ light, dark }) => {
    const custom = { id: CUSTOM_THEME_ID, name: 'My colours', light, dark };
    setCustomThemeState(custom);
    setTheme(custom);
    persistLocal(userId, CUSTOM_THEME_ID);
    pushBoard(CUSTOM_THEME_ID);
  }, [userId, pushBoard]);

  return (
    <BoardThemeContext.Provider value={{ theme, setThemeById, setCustomTheme, customTheme }}>
      {children}
    </BoardThemeContext.Provider>
  );
}

export function useBoardTheme() {
  return useContext(BoardThemeContext);
}
