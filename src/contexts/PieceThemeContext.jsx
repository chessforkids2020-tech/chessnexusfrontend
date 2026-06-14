import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 12 piece themes — index 0 is the default (mpchess-pieces)
// Piece files follow the convention: {prefix}/{piece}.svg
// where piece is one of: bP bR bN bB bQ bK wP wR wN wB wQ wK
export const PIECE_THEMES = [
  {
    id: 'mpchess',
    name: 'MPChess',
    // Default pieces live at /mpchess-pieces-main/svg/
    pathFn: (piece) => `/mpchess-pieces-main/svg/${piece}.svg`,
    previewPiece: 'wN', // show white knight in settings preview
    isDefault: true,
  },
  {
    id: 'alpha',
    name: 'Alpha',
    pathFn: (piece) => `/pieces/alpha/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'cardinal',
    name: 'Cardinal',
    pathFn: (piece) => `/pieces/cardinal/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'cburnett',
    name: 'CBurnett',
    pathFn: (piece) => `/pieces/cburnett/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'cooke',
    name: 'Cooke',
    pathFn: (piece) => `/pieces/cooke/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'fresca',
    name: 'Fresca',
    pathFn: (piece) => `/pieces/fresca/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'gioco',
    name: 'Gioco',
    pathFn: (piece) => `/pieces/gioco/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'icpieces',
    name: 'IC Pieces',
    pathFn: (piece) => `/pieces/icpieces/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'maestro',
    name: 'Maestro',
    pathFn: (piece) => `/pieces/maestro/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'merida',
    name: 'Merida',
    pathFn: (piece) => `/pieces/merida/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'staunty',
    name: 'Staunty',
    pathFn: (piece) => `/pieces/staunty/${piece}.svg`,
    previewPiece: 'wN',
  },
  {
    id: 'tatiana',
    name: 'Tatiana',
    pathFn: (piece) => `/pieces/tatiana/${piece}.svg`,
    previewPiece: 'wN',
  },
];

export const DEFAULT_PIECE_THEME = PIECE_THEMES[0];

const PieceThemeContext = createContext({
  pieceTheme: DEFAULT_PIECE_THEME,
  setPieceThemeById: () => {},
  getPieceSrc: (piece) => `/mpchess-pieces-main/svg/${piece}.svg`,
});

function storageKey(userId) {
  return userId ? `pieceTheme_${userId}` : 'pieceTheme_guest';
}

export function PieceThemeProvider({ children, userId }) {
  const [pieceTheme, setPieceTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const found = PIECE_THEMES.find(t => t.id === saved);
        if (found) return found;
      }
    } catch { /* ignore */ }
    return DEFAULT_PIECE_THEME;
  });

  // Reload preference when userId changes (login / logout)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const found = PIECE_THEMES.find(t => t.id === saved);
        if (found) { setPieceTheme(found); return; }
      }
    } catch { /* ignore */ }
    setPieceTheme(DEFAULT_PIECE_THEME);
  }, [userId]);

  const setPieceThemeById = useCallback((id) => {
    const found = PIECE_THEMES.find(t => t.id === id);
    if (!found) return;
    setPieceTheme(found);
    try { localStorage.setItem(storageKey(userId), id); } catch { /* ignore */ }
  }, [userId]);

  // Convenience: returns the full path for a given piece code (e.g. 'wN', 'bK')
  const getPieceSrc = useCallback((piece) => pieceTheme.pathFn(piece), [pieceTheme]);

  return (
    <PieceThemeContext.Provider value={{ pieceTheme, setPieceThemeById, getPieceSrc }}>
      {children}
    </PieceThemeContext.Provider>
  );
}

export function usePieceTheme() {
  return useContext(PieceThemeContext);
}
