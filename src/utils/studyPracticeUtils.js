import { Chess } from 'chess.js';

/**
 * Parse a space-separated SAN solution PGN string into a move array.
 * Handles leading move numbers like "1. e4 e5 2. Nf3" or just "e4 e5 Nf3".
 */
export function parseSolutionMoves(pgn) {
  if (!pgn || typeof pgn !== 'string') return [];
  // Remove move numbers: "1." "1..." "1. " etc.
  const cleaned = pgn
    .replace(/\d+\.\.\./g, '')
    .replace(/\d+\./g, '')
    .trim();
  return cleaned.split(/\s+/).filter(Boolean);
}

/**
 * Given a Chess instance at the current position, returns the next SAN move
 * from the solution line at moveIndex — or null if out of range or invalid.
 */
export function getBookMove(chess, solutionMoves, moveIndex) {
  if (!solutionMoves || moveIndex >= solutionMoves.length) return null;
  const sanMove = solutionMoves[moveIndex];
  if (!sanMove) return null;
  // Validate the move is legal in the current position
  try {
    const clone = new Chess(chess.fen());
    const m = clone.move(sanMove);
    return m ? m.san : null;
  } catch {
    return null;
  }
}

/**
 * Check if the user's moves so far exactly match the solution line prefix.
 */
export function isOnBookLine(userMoves, solutionMoves) {
  if (!solutionMoves || solutionMoves.length === 0) return false;
  const norm = s => (s || '').replace(/[+#!?]/g, '');
  for (let i = 0; i < userMoves.length; i++) {
    if (i >= solutionMoves.length) return false;
    if (norm(userMoves[i]) !== norm(solutionMoves[i])) return false;
  }
  return true;
}

/**
 * Convert UCI move string to arrow object for the Chessboard arrows prop.
 * uci: "e2e4" → { from: "e2", to: "e4", color }
 */
export function uciToArrow(uci, color = 'blue') {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), color };
}

/**
 * Convert an array of UCI moves to arrow objects for hint display.
 */
export function uciLinesToArrows(lines) {
  const colors = ['blue', 'green', 'yellow'];
  return (lines || [])
    .slice(0, 3)
    .map((line, i) => line?.move ? uciToArrow(line.move, colors[i] || 'blue') : null)
    .filter(Boolean);
}
