// Frontend tablebase service — Lichess 7-piece Syzygy tablebase.
//
// Used by the Endgame Mastery Trainer so the opponent plays PERFECT defense and
// we can tell, after every move, whether the position is still winning/drawn from
// the trainee's point of view. Only ≤7-piece positions are trainer-eligible, so
// every query is guaranteed in range.
//
// API: GET https://tablebase.lichess.ovh/standard?fen=<FEN>
//   → { category: 'win'|'draw'|'loss'|'cursed-win'|'blessed-loss', dtz, dtm,
//       moves: [{ uci, san, category, dtz, dtm, ... }, ... ] }
//   `category` and each move's `category` are from the SIDE-TO-MOVE's point of view.

const TB_BASE = 'https://tablebase.lichess.ovh/standard';

// Cache per-FEN — positions recur a lot across attempts/retries.
const cache = new Map();

async function probe(fen) {
  if (cache.has(fen)) return cache.get(fen);
  const url = `${TB_BASE}?fen=${encodeURIComponent(fen)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tablebase ${res.status}`);
  const data = await res.json();
  cache.set(fen, data);
  return data;
}

// Normalise a category (treat cursed-win as win, blessed-loss as loss for UX).
function normCategory(cat) {
  if (cat === 'cursed-win') return 'win';
  if (cat === 'blessed-loss') return 'loss';
  return cat; // 'win' | 'draw' | 'loss'
}

// Rank a move's resistance for the SIDE TO MOVE (the opponent choosing its reply):
// prefer the best outcome for itself (win > draw > loss), then drag the game out
// (largest DTZ magnitude) so a losing defender resists as long as possible.
function outcomeRank(cat) {
  const c = normCategory(cat);
  if (c === 'win') return 2;
  if (c === 'draw') return 1;
  return 0; // loss
}

/**
 * The tablebase-perfect reply for the side to move in `fen`.
 * Returns { uci, san, category } or null if no moves / out of range.
 */
export async function bestDefense(fen) {
  const data = await probe(fen);
  const moves = Array.isArray(data.moves) ? data.moves : [];
  if (moves.length === 0) return null;

  // Best for the mover: maximise own outcome, then maximise resistance length.
  let best = null;
  let bestKey = null;
  for (const m of moves) {
    const rank = outcomeRank(m.category);
    // dtz magnitude — longer is more resistant when losing; when winning, smaller
    // dtz converts faster, but for a *defender* we just maximise dtz magnitude to
    // drag it out. Guard against null dtz.
    const dtzMag = Math.abs(Number(m.dtz) || 0);
    const key = rank * 1000 + Math.min(dtzMag, 999);
    if (bestKey === null || key > bestKey) { bestKey = key; best = m; }
  }
  return best ? { uci: best.uci, san: best.san, category: normCategory(best.category) } : null;
}

/**
 * The tablebase-perfect move for whoever is to move in `fen`, playing to WIN
 * rather than to resist.
 *
 * bestDefense() is a *defender's* heuristic: it maximises its own outcome and
 * then maximises |dtz| to drag the game out. That is right for the losing side
 * and actively wrong for the winning side — dragging a win out is how you let
 * the 50-move rule turn it into a draw, and the "best outcome" tie-break can
 * even prefer a move that hands the opponent a win.
 *
 * Each move's `category` is reported from the OPPONENT's point of view (the
 * position after the move), so for the mover:
 *     opponent 'loss'  → we win   (best)
 *     opponent 'draw'  → we draw
 *     opponent 'win'   → we lose  (worst)
 * Among winning moves, the SMALLEST |dtz| converts fastest.
 *
 * Returns { uci, san, category } (category = ours, not the opponent's) or null.
 */
export async function bestWinningMove(fen) {
  const data = await probe(fen);
  const moves = Array.isArray(data.moves) ? data.moves : [];
  if (moves.length === 0) return null;

  // Our outcome is the inverse of the opponent's category after the move.
  const ourRank = (cat) => {
    const c = normCategory(cat);
    if (c === 'loss') return 2;  // opponent loses → we win
    if (c === 'draw') return 1;
    return 0;                    // opponent wins → we lose
  };

  let best = null;
  let bestRank = -1;
  let bestDtz = Infinity;
  for (const m of moves) {
    const rank = ourRank(m.category);
    const dtzMag = Math.abs(Number(m.dtz) || 0);
    // Higher rank always wins. Within the same rank, convert (or hold) FASTEST
    // when we're winning; when we're losing this still prefers the shortest
    // path, so fall back to bestDefense for genuinely lost positions.
    if (rank > bestRank || (rank === bestRank && dtzMag < bestDtz)) {
      bestRank = rank; bestDtz = dtzMag; best = m;
    }
  }
  if (!best) return null;

  // Convert the opponent-POV category into ours for the caller.
  const oppCat = normCategory(best.category);
  const ours = oppCat === 'loss' ? 'win' : oppCat === 'win' ? 'loss' : 'draw';
  return { uci: best.uci, san: best.san, category: ours };
}

/**
 * The result category of `fen` from the SIDE-TO-MOVE's point of view
 * ('win' | 'draw' | 'loss'), plus dtz/dtm. Used to detect a technique slip.
 * Returns { category, dtz, dtm } or null if out of range / error.
 */
export async function positionCategory(fen) {
  const data = await probe(fen);
  if (!data || typeof data.category === 'undefined') return null;
  return {
    category: normCategory(data.category),
    dtz: data.dtz ?? null,
    dtm: data.dtm ?? null,
  };
}

/**
 * Category from a specific SIDE's point of view (not necessarily the mover).
 * `fen` is the position; `side` is 'white'|'black'. Flips loss/win if it's the
 * other side to move.
 */
export async function categoryForSide(fen, side) {
  const pc = await positionCategory(fen);
  if (!pc) return null;
  const mover = fen.split(' ')[1] === 'b' ? 'black' : 'white';
  if (mover === side) return pc.category;
  // From the other side's POV, win<->loss swap, draw stays draw.
  if (pc.category === 'win') return 'loss';
  if (pc.category === 'loss') return 'win';
  return 'draw';
}

/**
 * Build the tablebase-PERFECT principal line from `fen`: at every ply we play the
 * best move for whoever is to move (bestDefense picks the optimal move for the
 * mover), so the result is the ideal line both sides — the "study this technique"
 * line for the Endgame Trainer. Needs a Chess ctor to advance the position.
 *
 * @param {string} fen          starting position
 * @param {Function} ChessCtor  chess.js Chess constructor (passed in to avoid a dep here)
 * @param {number} maxPlies     safety cap on line length (default 24)
 * @returns {Promise<Array<{ san, uci, fenAfter }>>} the moves of the perfect line
 */
/**
 * The tablebase-perfect line from `fen`, `maxPlies` deep.
 *
 * `heroSide` ('w' | 'b') is the side trying to WIN — normally the trainee. Its
 * moves are chosen with bestWinningMove (convert fastest); the opponent's with
 * bestDefense (resist longest). Omit it and the whole line is played as defence,
 * which is what this used to do for BOTH sides: the "perfect line" then showed
 * the winner dawdling, and the tie-break could even pick a move handing the
 * opponent the win — so a won position looked drawn. That is the bug behind
 * "the tablebase line basically makes this position a draw, not a win".
 */
export async function bestLine(fen, ChessCtor, maxPlies = 24, heroSide = null) {
  const out = [];
  let cur = fen;
  for (let i = 0; i < maxPlies; i++) {
    let move;
    const toMove = cur.split(' ')[1];              // 'w' | 'b'
    const heroToMove = heroSide && toMove === heroSide;
    try {
      move = heroToMove ? await bestWinningMove(cur) : await bestDefense(cur);
    } catch { break; }
    if (!move || !move.uci) break;
    let game;
    try {
      game = new ChessCtor(cur);
      const mv = game.move({ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4), promotion: move.uci.length > 4 ? move.uci[4] : undefined });
      if (!mv) break;
      out.push({ san: mv.san, uci: move.uci, fenAfter: game.fen() });
      if (game.isGameOver()) break;
      cur = game.fen();
    } catch { break; }
  }
  return out;
}

export default { bestDefense, positionCategory, categoryForSide, bestLine };
