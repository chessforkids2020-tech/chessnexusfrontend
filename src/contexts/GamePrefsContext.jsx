import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Piece animation length per speed setting (ms). 'normal' is the smooth default.
export const MOVE_SPEEDS = { slow: 500, normal: 250, fast: 120 };
// Races keep their quick feel regardless of the user's setting.
export const RACE_MOVE_MS = MOVE_SPEEDS.fast;

const DEFAULTS = { moveSpeed: 'normal', autoQueen: false };

const GamePrefsContext = createContext({
  ...DEFAULTS,
  moveMs: MOVE_SPEEDS.normal,
  setGamePref: () => {},
});

// Per-user key: coaches log into many student accounts on one browser.
const storageKey = (userId) => (userId ? `gamePrefs_${userId}` : 'gamePrefs_guest');

function load(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}');
    return {
      moveSpeed: MOVE_SPEEDS[raw.moveSpeed] ? raw.moveSpeed : DEFAULTS.moveSpeed,
      autoQueen: typeof raw.autoQueen === 'boolean' ? raw.autoQueen : DEFAULTS.autoQueen,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function GamePrefsProvider({ children, userId }) {
  const [prefs, setPrefs] = useState(() => load(userId));

  useEffect(() => { setPrefs(load(userId)); }, [userId]);

  const setGamePref = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [userId]);

  return (
    <GamePrefsContext.Provider value={{ ...prefs, moveMs: MOVE_SPEEDS[prefs.moveSpeed], setGamePref }}>
      {children}
    </GamePrefsContext.Provider>
  );
}

export function useGamePrefs() {
  return useContext(GamePrefsContext);
}
