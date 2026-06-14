import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
];

export const DEFAULT_THEME = BOARD_THEMES[0];

const BoardThemeContext = createContext({
  theme: DEFAULT_THEME,
  setThemeById: () => {},
});

function storageKey(userId) {
  return userId ? `boardTheme_${userId}` : 'boardTheme_guest';
}

export function BoardThemeProvider({ children, userId }) {
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

  const setThemeById = useCallback((id) => {
    const found = BOARD_THEMES.find(t => t.id === id);
    if (!found) return;
    setTheme(found);
    try { localStorage.setItem(storageKey(userId), id); } catch { /* ignore */ }
  }, [userId]);

  return (
    <BoardThemeContext.Provider value={{ theme, setThemeById }}>
      {children}
    </BoardThemeContext.Provider>
  );
}

export function useBoardTheme() {
  return useContext(BoardThemeContext);
}
