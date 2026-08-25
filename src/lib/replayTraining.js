// Replay Training — scoring + question-selection rules.
//
// Pure functions, no React and no engine calls, so the rules can be unit-tested
// and are stated in exactly one place.

/** Full value of one question. best=10, played=8.5→9, second=7, third=5. */
export const BASE_POINTS = 10;

/** Points as a fraction of the question's full value. */
export const SCORE = {
  BEST: 1.00,     // Stockfish's #1 move (or the player's move when it IS #1)
  PLAYED: 0.85,   // the move actually played in the game (when it isn't #1)
  SECOND: 0.70,   // Stockfish's #2 — only if still winning
  THIRD: 0.50,    // Stockfish's #3 — only if still winning
  WRONG: 0,
};

// An alternative only earns points if it KEEPS THE WIN. A move that merely
// preserves a small edge is not "also winning".
export const WINNING_CP = 200;      // +2.00 pawns, from the mover's side

/**
 * Is this line still winning for the side to move?
 * Engine scores are relative to the side to move, which is what we want.
 */
export function isWinning(line) {
  if (!line) return false;
  if (line.scoreType === 'mate' || line.type === 'mate') {
    const m = line.score ?? line.value ?? 0;
    return m > 0;                    // mating, not getting mated
  }
  const cp = line.score ?? line.value ?? 0;
  return cp >= WINNING_CP;
}

/**
 * Grade a user's move.
 *
 * @param {string} userUci   e.g. "e2e4" / "e7e8q"
 * @param {Array}  lines     top-N engine lines, ranked; each { move (uci), score, scoreType }
 * @param {string} playedUci the move actually played in the real game
 * @returns {{ key, fraction, label }}
 */
/** Whole points awarded for a graded answer (fractions rounded to the nearest). */
export function pointsFor(fraction, base = BASE_POINTS) {
  return Math.round(fraction * base);
}

export function gradeMove(userUci, lines, playedUci) {
  const norm = (u) => String(u || '').toLowerCase();
  const u = norm(userUci);
  const eq = (a, b) => {
    a = norm(a); b = norm(b);
    // Tolerate a missing promotion suffix on either side.
    return a === b || a === b.replace(/[qrbn]$/, '') || a.replace(/[qrbn]$/, '') === b;
  };

  // analyzePosition returns lines as { k, depth, scoreType, score, pv[] } — the
  // move is the FIRST PV entry, not a `move` field.
  const mv = (line) => line?.move || line?.pv?.[0] || '';

  const best = lines?.[0];
  const second = lines?.[1];
  const third = lines?.[2];

  // Best move wins outright — including when the master played it. Finding the
  // engine's top move must never score LESS because the game happened to
  // contain it.
  if (best && eq(u, mv(best))) {
    return { key: 'best', fraction: SCORE.BEST, label: "Best move — exactly what the engine plays" };
  }
  if (playedUci && eq(u, playedUci)) {
    return { key: 'played', fraction: SCORE.PLAYED, label: "You found the move played in the game" };
  }
  if (second && eq(u, mv(second)) && isWinning(second)) {
    return { key: 'second', fraction: SCORE.SECOND, label: "Second-best move — still winning" };
  }
  if (third && eq(u, mv(third)) && isWinning(third)) {
    return { key: 'third', fraction: SCORE.THIRD, label: "Third-best move — still winning" };
  }
  return { key: 'wrong', fraction: SCORE.WRONG, label: 'Not the move — try the next position' };
}

/**
 * Should this position be asked as a question?
 *
 * ASK FROM MOVE 11 ONWARD, not "once someone is winning".
 *
 * The old rule required the side to move to be at least +2.00. In a real game
 * between strong players that often does not happen until an endgame, so the
 * trainer sat replaying 30 moves before it asked anything — the student watched
 * far more chess than they played. Openings are also the wrong thing to quiz:
 * the first ten moves are memorised theory, so a "best move" there tests
 * recall, not calculation.
 *
 * So the gate is now positional: skip the book, then ask wherever there is a
 * single clearly-best move. That is what makes a question answerable — if the
 * top two moves are equally good, "the best move" is arbitrary.
 *
 * HOW STRICT: 50 centipawns (half a pawn). At 80 the trainer skipped most of a
 * balanced middlegame — a student who expected a question on move 11 got one on
 * move 15, because two moves are often both reasonable and neither is "the"
 * answer. 50 roughly halves that wait while still refusing coin-flip positions,
 * where marking one of two equally good moves wrong would be unfair.
 *
 * @param {Array}  lines   top-N engine lines for the position (mover's view)
 * @param {Object} opts    minGapCp — how much better the best move must be
 */
export function isQuestionPosition(lines, { minGapCp = 50 } = {}) {
  const best = lines?.[0];
  if (!best) return false;

  const second = lines?.[1];
  if (!second) return true;                    // only one legal/decent move

  const bestMate = best.scoreType === 'mate' || best.type === 'mate';
  const secondMate = second.scoreType === 'mate' || second.type === 'mate';

  if (bestMate) {
    // Mate is only a real question when the alternative is NOT also mate.
    if (secondMate) return false;
    // Getting mated is not a question worth asking.
    return (best.score ?? best.value ?? 0) > 0;
  }
  // A mate for second but not best should not happen; treat as no question.
  if (secondMate) return false;

  const gap = (best.score ?? 0) - (second.score ?? 0);
  return gap >= minGapCp;
}
