/**
 * Move quality evaluation for Study Sparring Blitz Sprint.
 * Classifies each move against the book line.
 */

export const QUALITY = {
  BRILLIANT: 'brilliant',  // Matches book move exactly
  GOOD: 'good',            // Legal alternative move
  INACCURACY: 'inaccuracy',// Slightly off
  MISTAKE: 'mistake',      // Clear deviation from line
  BLUNDER: 'blunder',      // Very wrong (e.g. hanging pieces — requires eval, simplified here)
};

export const QUALITY_COLORS = {
  brilliant: '#a855f7',   // purple
  good: '#22c55e',        // green
  inaccuracy: '#eab308',  // yellow
  mistake: '#f97316',     // orange
  blunder: '#ef4444',     // red
};

export const QUALITY_SYMBOLS = {
  brilliant: '!!',
  good: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/**
 * Calculate move quality based on whether it matches the book line.
 * In a full implementation this would use centipawn eval from Stockfish.
 * Here we use book-line-vs-played comparison.
 */
export function getMoveQuality(playedSan, bookSan) {
  if (!bookSan) return QUALITY.GOOD; // No book move expected — any move is ok
  const norm = s => (s || '').replace(/[+#!?]/g, '');
  if (norm(playedSan) === norm(bookSan)) return QUALITY.BRILLIANT;
  // Any legal move that isn't the book move is a mistake in study context
  return QUALITY.MISTAKE;
}

/**
 * Calculate accuracy percentage from an array of move quality strings.
 * brilliant = 100, good = 85, inaccuracy = 60, mistake = 30, blunder = 0
 */
export function calculateAccuracy(qualities) {
  if (!qualities || qualities.length === 0) return 100;
  const weights = {
    brilliant: 100,
    good: 85,
    inaccuracy: 60,
    mistake: 30,
    blunder: 0,
  };
  const total = qualities.reduce((sum, q) => sum + (weights[q] ?? 50), 0);
  return Math.round(total / qualities.length);
}

/**
 * Calculate score: brilliant = 3pts, good = 2pts, inaccuracy = 1pt, else 0
 */
export function calculateScore(qualities) {
  const pts = { brilliant: 3, good: 2, inaccuracy: 1, mistake: 0, blunder: 0 };
  return qualities.reduce((sum, q) => sum + (pts[q] ?? 0), 0);
}
