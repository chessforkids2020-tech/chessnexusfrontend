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

// ── Lichess judgement ─────────────────────────────────────────────────────
// A faithful port of lila's Advice / CpAdvice / MateAdvice (modules/analyse).
// Used when analyzeGame is called with { judge: 'lichess' } — the single-game
// analysis page. Master Games keep the original rules above, because their
// results are already stored on the server.
//
//  • Winning chances are on lila's −1…+1 scale with the eval CEILED at ±1000cp.
//  • Inaccuracy / mistake / blunder = the mover's winning chances fell by
//    ≥ 0.1 / 0.2 / 0.3 (= 5 / 10 / 15 win-% points).
//  • Mates have their own rules: walking into a forced mate ("Checkmate is now
//    unavoidable") or throwing away your own forced mate ("Lost forced
//    checkmate sequence") is graded by how good the position still was.
const LICHESS_CEIL = 1000;
const lichessWc = (cp) => {
  const c = Math.max(-LICHESS_CEIL, Math.min(LICHESS_CEIL, cp));
  return 2 / (1 + Math.exp(-0.00368208 * c)) - 1;
};
const lichessWinPct = (cp) => 50 + 50 * lichessWc(cp);

// Engine eval (side-to-move POV) → { cp, mate } from White's POV.
// cp is null for a mate; mate is a signed move count (+ = White mates).
function whiteEvalOf(evaluation, sideToMove) {
  const s = sideToMove === 'w' ? 1 : -1;
  if (!evaluation) return { cp: 0, mate: null };
  if (evaluation.type === 'mate') {
    const v = evaluation.value;
    // "mate 0" = the side to move is already mated → the other side won.
    const winnerSign = v > 0 ? s : -s;
    return { cp: null, mate: winnerSign * Math.max(1, Math.abs(v)) };
  }
  return { cp: s * evaluation.value, mate: null };
}
// For win % / accuracy lila forces a mate to a (ceiled) centipawn value.
const forceCp = (e) => (e.mate != null ? Math.sign(e.mate) * LICHESS_CEIL : e.cp);

const JUDGEMENTS = [[0.3, 'blunder'], [0.2, 'mistake'], [0.1, 'inaccuracy']];

// prev/next are White-POV evals of the positions before/after the move.
function lichessAdvice(prev, next, mover) {
  const m = mover === 'w' ? 1 : -1;
  // CpAdvice — both positions have a centipawn score.
  if (prev.cp != null && next.cp != null) {
    const drop = lichessWc(m * prev.cp) - lichessWc(m * next.cp);
    const hit = JUDGEMENTS.find(([t]) => drop >= t);
    return hit ? { classification: hit[1], mateNote: null } : null;
  }
  // MateAdvice — from the mover's POV.
  const pMate = prev.mate != null ? m * prev.mate : null;
  const nMate = next.mate != null ? m * next.mate : null;
  const pCp = prev.cp != null ? m * prev.cp : 0;
  const nCp = next.cp != null ? m * next.cp : 0;
  let seq = null;
  if (pMate == null && nMate != null && nMate < 0) seq = 'mateCreated';
  else if (pMate != null && pMate > 0 && (nMate == null || nMate < 0)) seq = 'mateLost';
  if (seq === 'mateCreated') {
    return { classification: pCp < -999 ? 'inaccuracy' : pCp < -700 ? 'mistake' : 'blunder', mateNote: seq };
  }
  if (seq === 'mateLost') {
    return { classification: nCp > 999 ? 'inaccuracy' : nCp > 700 ? 'mistake' : 'blunder', mateNote: seq };
  }
  return null;
}

async function analyzeGameLichess(sanMoves, opts, engine) {
  const depth = opts.depth || 20;
  const moveTime = opts.moveTime || 15000;     // safety cap per position (slow phones)
  const isCancelled = opts.isCancelled || (() => false);
  const onTick = opts.onTick || (() => {});
  const onProgress = opts.onProgress || (() => {});

  const chess = opts.startFen ? new Chess(opts.startFen) : new Chess();
  const steps = [];
  for (const san of sanMoves) {
    const fenBefore = chess.fen();
    const sideToMove = chess.turn();
    let mv;
    try { mv = chess.move(san); } catch { mv = null; }
    if (!mv) break;
    steps.push({
      san: mv.san, fenBefore, sideToMove, fenAfter: chess.fen(),
      terminal: chess.isGameOver(), mate: chess.isCheckmate(),
    });
  }

  // Every position the engine must search, once each (a position is "after"
  // one move and "before" the next). Game-over positions have no legal move,
  // so they are scored directly instead.
  const toSearch = [];
  const seen = new Set();
  const add = (fen) => { if (!seen.has(fen)) { seen.add(fen); toSearch.push(fen); } };
  steps.forEach((st) => { add(st.fenBefore); if (!st.terminal) add(st.fenAfter); });
  const total = toSearch.length;

  const cache = new Map();
  let done = 0;
  const searchOf = async (fen) => {
    if (cache.has(fen)) return cache.get(fen);
    if (isCancelled()) throw new Error('cancelled');
    onTick({ done, total, depth: 0, targetDepth: depth });
    const res = await engine.getBestMove(fen, {
      depth, moveTime,
      onInfo: ({ depth: d }) => onTick({ done, total, depth: Math.min(d, depth), targetDepth: depth }),
    });
    cache.set(fen, res);
    done += 1;
    onTick({ done, total, depth, targetDepth: depth });
    return res;
  };

  const analysis = [];
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const before = await searchOf(st.fenBefore);
    const prev = whiteEvalOf(before.evaluation, st.sideToMove);
    let next;
    if (st.terminal) {
      // Checkmate: the mover delivered mate. Stalemate / draw: level.
      next = st.mate ? { cp: null, mate: st.sideToMove === 'w' ? 1 : -1 } : { cp: 0, mate: null };
    } else {
      const after = await searchOf(st.fenAfter);
      next = whiteEvalOf(after.evaluation, st.sideToMove === 'w' ? 'b' : 'w');
    }
    const advice = lichessAdvice(prev, next, st.sideToMove);
    const winBefore = lichessWinPct(forceCp(prev));
    const winAfter = lichessWinPct(forceCp(next));
    const dropForMover = st.sideToMove === 'w' ? winBefore - winAfter : winAfter - winBefore;
    analysis.push({
      ply: i + 1,
      san: st.san,
      fenAfter: st.fenAfter,
      classification: advice?.classification || null,
      mateNote: advice?.mateNote || null,          // 'mateLost' | 'mateCreated' | null
      eval: next.mate != null ? (next.mate > 0 ? 1000 : -1000) : Math.round(next.cp) / 100,
      evalMate: next.mate,                          // White-POV mate count, or null
      side: st.sideToMove,
      bestUci: before.bestMove || null,
      fenBefore: st.fenBefore,
      winBefore,
      winAfter,
      drop: Math.max(0, dropForMover),
    });
    onProgress(i + 1, steps.length);
  }
  return { analysis, depth };
}

/**
 * Analyze a game.
 * @param {string[]} sanMoves  main-line moves in SAN
 * @param {object} opts        { depth=14, startFen, onProgress(doneCount,total), isCancelled(),
 *                               engine — a StockfishService to use instead of the shared one,
 *                               judge — 'lichess' for lila's exact rules (single-game page),
 *                               onTick({done,total,depth,targetDepth}) — lichess mode only,
 *                               fine-grained progress for a 1–100% bar }
 * @returns {Promise<{analysis: Array, depth: number}>}
 */
export async function analyzeGame(sanMoves, opts = {}) {
  if (opts.judge === 'lichess') {
    const eng = opts.engine || stockfish;
    if (!eng.isReady()) await eng.init();
    return analyzeGameLichess(sanMoves, opts, eng);
  }
  const depth = opts.depth || 14;
  const onProgress = opts.onProgress || (() => {});
  const isCancelled = opts.isCancelled || (() => false);
  const engine = opts.engine || stockfish;

  if (!engine.isReady()) {
    await engine.init();
  }

  // Each position is both "after" one move and "before" the next — search it once.
  const evalCache = new Map();
  const evalOf = async (fen) => {
    if (!evalCache.has(fen)) evalCache.set(fen, await engine.getBestMove(fen, { depth, moveTime: 1500 }));
    return evalCache.get(fen);
  };

  const chess = opts.startFen ? new Chess(opts.startFen) : new Chess();
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
        eval: Math.round(finalWhiteCp) / 100,
        side: step.sideToMove,
        bestUci: null,
        fenBefore: step.fenBefore,
        winBefore: winChance(finalWhiteCp),
        winAfter: winChance(finalWhiteCp),
        drop: 0,
      });
      prevAfterWhiteCp = finalWhiteCp;
      onProgress(i + 1, total);
      continue;
    }

    // Best eval available before the move (side-to-move POV -> White POV).
    if (isCancelled()) throw new Error('cancelled');
    const before = await evalOf(step.fenBefore);
    const bestWhiteCp = toWhiteCp(before.evaluation, step.sideToMove);

    // Eval after the move actually played.
    const after = await evalOf(step.fenAfter);
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
      eval: Math.round(playedWhiteCp) / 100, // store White-POV pawns
      // Extra detail for the single-game analysis page. Callers that POST the
      // rows (Master Games) pick their own fields, so these are never stored.
      side: step.sideToMove,                  // 'w' | 'b' — who played this move
      bestUci: before.bestMove || null,       // engine's choice in fenBefore
      fenBefore: step.fenBefore,
      winBefore: wBest,                       // White win % with the best move
      winAfter: wPlayed,                      // White win % after the move played
      drop: Math.max(0, dropForMover),        // win % the mover gave away
    });

    prevAfterWhiteCp = playedWhiteCp;
    onProgress(i + 1, total);
  }

  return { analysis, depth };
}
