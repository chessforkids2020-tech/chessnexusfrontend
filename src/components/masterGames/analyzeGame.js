// analyzeGame.js
//
// Lazy, browser-side game analysis for Master Games. Runs the shared Stockfish
// worker over a game's main line, classifies each move as blunder / mistake /
// inaccuracy using the win-chance-drop method (the same idea ChessNexus shows:
// "win chance dropped from 80% to 37%"), and returns a per-ply analysis array
// ready to POST to /api/master-games/:id/analysis.
//
// No best-move/PV is stored — only the classification + eval, matching the
// agreed UI (symbols + cards, no engine suggestions).

import { Chess } from 'chess.js';
import stockfish from '../../services/stockfishService';

// Convert a centipawn eval (from the side-to-move's perspective is normalized to
// White below) into a 0..100 win chance for White. Lichess-style logistic curve.
function winChance(cpWhite) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cpWhite)) - 1);
}

// Classify by how much White's win chance dropped because of the move that was
// actually played (vs. the best available before it). Thresholds match the
// common Lichess/ChessNexus bands.
function classify(dropPct) {
  if (dropPct >= 30) return 'blunder';
  if (dropPct >= 20) return 'mistake';
  if (dropPct >= 10) return 'inaccuracy';
  return null;
}

// Normalize an engine evaluation (always reported from side-to-move POV) into a
// White-centric centipawn number. mate => large signed value.
function toWhiteCp(evaluation, sideToMove) {
  if (!evaluation) return 0;
  let cp;
  if (evaluation.type === 'mate') {
    // mate > 0: side-to-move delivers mate. mate <= 0 (incl. "mate 0" = already
    // checkmated): side-to-move is getting mated. Treat 0 as a loss, not a win.
    cp = evaluation.value > 0 ? 100000 : -100000; // side-to-move mates / gets mated
  } else {
    cp = evaluation.value; // centipawns, side-to-move POV
  }
  return sideToMove === 'w' ? cp : -cp;
}

/**
 * Analyze a game.
 * @param {string[]} sanMoves  main-line moves in SAN
 * @param {object} opts        { depth=14, onProgress(doneCount,total) }
 * @returns {Promise<{analysis: Array, depth: number}>}
 */
export async function analyzeGame(sanMoves, opts = {}) {
  const depth = opts.depth || 14;
  const onProgress = opts.onProgress || (() => {});

  if (!stockfish.isReady()) {
    await stockfish.init();
  }

  const chess = new Chess();
  // Pre-build the list of positions: fen BEFORE each move + the move + fen AFTER.
  const steps = [];
  for (const san of sanMoves) {
    const fenBefore = chess.fen();
    const sideToMove = chess.turn();
    let mv;
    try { mv = chess.move(san); } catch { mv = null; }
    if (!mv) break;
    // A move that ends the game (checkmate / stalemate / draw) leaves no legal
    // reply, so the engine can't be queried on fenAfter — flag it as terminal
    // and skip classification (a mating move is the best possible move, never
    // a blunder).
    const terminal = chess.isGameOver();
    steps.push({ san: mv.san, fenBefore, sideToMove, fenAfter: chess.fen(), terminal });
  }

  const total = steps.length;
  const analysis = [];

  // For each ply: eval the position BEFORE the move (best the mover could do) and
  // the position AFTER (what they got). The win-chance delta = how much the played
  // move cost the mover.
  let prevAfterWhiteCp = 0; // eval after previous move (= before current, from White POV)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Game-ending move (checkmate/stalemate/draw): no legal reply exists, so the
    // engine can't evaluate fenAfter. A checkmating move is the best possible
    // move — never a blunder. Record it as terminal with no classification.
    if (step.terminal) {
      const isMate = step.san.endsWith('#');
      // Decisive mate: the side that just moved is fully winning. Stalemate/draw: 0.
      const finalWhiteCp = isMate
        ? (step.sideToMove === 'w' ? 100000 : -100000)
        : 0;
      analysis.push({
        ply: i + 1,
        san: step.san,
        fenAfter: step.fenAfter,
        classification: null,
        eval: Math.round(finalWhiteCp) / 100
      });
      prevAfterWhiteCp = finalWhiteCp;
      onProgress(i + 1, total);
      continue;
    }

    // Best eval available before the move (side-to-move POV -> White POV).
    const before = await stockfish.getBestMove(step.fenBefore, { depth, moveTime: 1500 });
    const bestWhiteCp = toWhiteCp(before.evaluation, step.sideToMove);

    // Eval after the move actually played.
    const after = await stockfish.getBestMove(step.fenAfter, { depth, moveTime: 1500 });
    const afterSide = step.sideToMove === 'w' ? 'b' : 'w';
    const playedWhiteCp = toWhiteCp(after.evaluation, afterSide);

    // Win-chance drop FOR THE MOVER. If white moved, a fall in White win% is bad;
    // if black moved, a rise in White win% is bad for black.
    const wBest = winChance(bestWhiteCp);
    const wPlayed = winChance(playedWhiteCp);
    const dropForMover = step.sideToMove === 'w' ? (wBest - wPlayed) : (wPlayed - wBest);

    analysis.push({
      ply: i + 1,
      san: step.san,
      fenAfter: step.fenAfter,
      classification: classify(dropForMover),
      eval: Math.round(playedWhiteCp) / 100 // store White-POV pawns
    });

    prevAfterWhiteCp = playedWhiteCp;
    onProgress(i + 1, total);
  }

  return { analysis, depth };
}
