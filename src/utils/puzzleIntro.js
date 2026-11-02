// utils/puzzleIntro.js
//
// Lichess puzzles start with the OPPONENT's move. We store the position after
// it (`fen`, the solver's turn) and, when known, the position before it
// (`startFen`) plus the move itself (`setupMove`). With both, a page opens on
// startFen and lets the board play the bot's move, so the solver sees what was
// just played instead of a position that appears out of nowhere.
//
// Puzzles without the fields (not yet backfilled) simply start on `fen`.
import { Chess } from 'chess.js';

// How long the starting position is shown before the bot plays.
export const INTRO_HOLD_MS = 450;
// How long the bot's move takes to land (board animation) before the solver may move.
export const INTRO_MOVE_MS = 300;

// Run fn after `ms`; returns a cancel function.
export function later(fn, ms) {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}

// Run fn once the starting position has been ON SCREEN for INTRO_HOLD_MS.
// The hold starts after the next paint (two animation frames), not when the
// puzzle arrives: on a busy first load the board can paint hundreds of ms late,
// and a plain timer then left the start position visible for almost no time.
// Returns a cancel function.
export function holdThen(fn) {
  let r2 = 0;
  let cancelTimer = () => {};
  const r1 = requestAnimationFrame(() => {
    r2 = requestAnimationFrame(() => { cancelTimer = later(fn, INTRO_HOLD_MS); });
  });
  return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); cancelTimer(); };
}

const samePosition =(a, b) => String(a).split(' ').slice(0, 4).join(' ') === String(b).split(' ').slice(0, 4).join(' ');

// { startFen, from, to } when this puzzle can open with the bot's move, else null.
// Checked here too: the move must lead exactly to `fen`, or the intro is skipped.
export function introOf(puzzle) {
  const sm = puzzle?.setupMove;
  if (!puzzle?.startFen || !sm?.from || !sm?.to || !puzzle.fen) return null;
  try {
    const g = new Chess(puzzle.startFen);
    // A promoting setup move names its piece in the SAN ("c1=N"); default queen.
    const promo = (/=([QRBN])/.exec(sm.san || '') || [])[1];
    const m = g.move({ from: sm.from, to: sm.to, promotion: promo ? promo.toLowerCase() : 'q' });
    if (!m || !samePosition(g.fen(), puzzle.fen)) return null;
  } catch {
    return null;
  }
  return { startFen: puzzle.startFen, from: sm.from, to: sm.to };
}
