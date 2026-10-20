// tempoAnalysis.js — "lost tempo" detection for one analysed game, in all three
// phases. Runs after the Lichess-rule game review and reuses its rows (the
// mover's win % before/after every move and the engine's best move).
//
// TRUST RULES that apply everywhere:
//   • Every flag must be CONFIRMED by the engine — the move cost win % (≥ 5,
//     Lichess's inaccuracy line). A move the engine likes is never flagged,
//     which is what protects good piece activation and regrouping.
//   • A blunder is not a tempo loss — it keeps its ?? label instead.
//   • When unsure (no data, explorer unreachable, odd position): don't flag.
//
// OPENING (moves 1–10, standard start only)
//   Never flags a move that is opening theory (played in ≥ 3 master games from
//   the same move order — the app's master-games explorer). After the player
//   leaves theory, flags (engine-confirmed):
//     sameAgain — a piece moves again while 2+ other minor pieces sit at home,
//                 and it wasn't escaping an attack
//     chased    — you put a piece where the opponent attacks it WHILE
//                 developing (Qh5 … Nf6), and you have to move it again
//     flankPawn — an a/h pawn (or a non-fianchetto b/g push) while 2+ minors
//                 are undeveloped, that attacks nothing (h3/h6/a3/a6 are
//                 allowed while the opponent has a bishop — they stop pins)
//
// MIDDLEGAME + ENDGAME — the NULL-MOVE rule (agreed 2026-10-18)
//   A quiet move lost a tempo when it was barely better than skipping the turn
//   while the turn was valuable, and the engine's better move was a TEMPO move
//   (check, or a new attack on an undefended / more valuable piece):
//     pass = same position, opponent to move (one extra engine search)
//     turn value = best − pass ≥ 8,  move used = played − pass ≤ 25% of it,
//     played − pass ≥ −3 (no damage), best − played ≥ 5.
//   Zugzwang (passing would be BETTER) has a negative turn value, so it is
//   never judged — important in endgames.
//
// ENDGAME patterns (no extra engine time)
//     lostOpposition — king & pawn ending: the engine's king move kept the
//                      opposition, yours gave it away, and the result dropped
//     pawnRace       — both sides have passed pawns; pushing yours was best,
//                      you did something else, and the result dropped
//   "Result dropped" = win → draw/loss, or draw → loss (win ≥ 65%, loss ≤ 35%).

import { Chess } from 'chess.js';

export const TEMPO_RULES = {
  minCost: 5,           // best − played, every rule (= Lichess inaccuracy line)
  minTurnValue: 8,      // null-move: the turn must be worth at least this much
  maxUsedShare: 0.25,   // null-move: the move used at most this share of it
  maxDamage: 3,         // null-move: played may be at most this much worse than passing
  bookMinGames: 3,      // opening: a move in ≥ this many master games is theory
  minUndeveloped: 2,    // opening: other minor pieces still at home
  winAt: 65, lossAt: 35 // endgame: result categories (mover's win %)
};

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PHASE_MATERIAL = { q: 9, r: 5, b: 3, n: 3 };
const HOME = { w: { b1: 'n', g1: 'n', c1: 'b', f1: 'b' }, b: { b8: 'n', g8: 'n', c8: 'b', f8: 'b' } };

// Same phase rule as GameReport / the server's gamePhaseAnalyzer:
// moves 1–10 opening; endgame once queens/rooks/minors total ≤ 13.
// `moveNumber` is the REAL move number (from the FEN), not a count from the
// first recorded move — a game set up at move 25 is not in its opening.
export function phaseOf(moveNumber, chess) {
  if (moveNumber <= 10) return 'opening';
  let total = 0;
  for (const row of chess.board()) for (const sq of row) if (sq) total += PHASE_MATERIAL[sq.type] || 0;
  return total <= 13 ? 'endgame' : 'middlegame';
}

const winPct = (cp) => {
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
};
const stmWin = (evaluation) => {
  if (!evaluation) return 50;
  if (evaluation.type === 'mate') return evaluation.value > 0 ? winPct(1000) : winPct(-1000);
  return winPct(evaluation.value);
};
const category = (w) => (w >= TEMPO_RULES.winAt ? 2 : w <= TEMPO_RULES.lossAt ? 0 : 1);

// The null-move position: same pieces, the OTHER side to move, no en passant.
// Null when that position is illegal (the player is in check).
export function passFen(fen) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const flipped = parts.join(' ');
  try {
    const c = new Chess(flipped);
    // chess.js does NOT reject a FEN where the side not to move is in check
    // (verified), so check it here: is the passer's king attacked?
    const passer = parts[1] === 'w' ? 'b' : 'w';
    for (const row of c.board()) for (const sq of row) {
      if (sq && sq.type === 'k' && sq.color === passer && c.isAttacked(sq.square, parts[1])) return null;
    }
    return c.fen();
  } catch { return null; }
}

const playUci = (fen, uci) => {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv ? { c, mv } : null;
  } catch { return null; }
};

/**
 * Is `uci` (played from `fen`) a tempo-gaining move — one the opponent must
 * answer? Returns { kind:'check'|'attack', san, piece?, square?, undefended? } or null.
 */
export function tempoMoveInfo(fen, uci) {
  if (!uci) return null;
  const before = (() => { try { return new Chess(fen); } catch { return null; } })();
  const res = before && playUci(fen, uci);
  if (!res) return null;
  const { c: after, mv } = res;
  // A capture wins material — a missed capture (already a ?!/?/??), not a
  // missed TEMPO. Conservative on purpose.
  if (mv.captured) return null;
  if (after.inCheck()) return { kind: 'check', san: mv.san };
  const me = mv.color;
  const them = me === 'w' ? 'b' : 'w';
  let best = null;
  for (const row of after.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== them || sq.type === 'k') continue;
      const attackers = after.attackers(sq.square, me);
      if (!attackers.length) continue;
      const wasAttacked = before.get(sq.square)?.type === sq.type && before.attackers(sq.square, me).length > 0;
      if (wasAttacked) continue;                                   // only NEW attacks
      const cheapest = Math.min(...attackers.map(a => VALUE[after.get(a).type]));
      const defended = after.attackers(sq.square, them).length > 0;
      const target = VALUE[sq.type];
      if (target > cheapest || !defended) {
        if (!best || target > best.target) best = { target, square: sq.square, type: sq.type, defended };
      }
    }
  }
  if (!best) return null;
  return { kind: 'attack', san: mv.san, piece: NAME[best.type], square: best.square, undefended: !best.defended };
}

// Minor pieces of `color` still on their home squares, excluding `except`.
function undevelopedMinors(chess, color, except) {
  let n = 0;
  for (const [sq, type] of Object.entries(HOME[color])) {
    if (sq === except) continue;
    const p = chess.get(sq);
    if (p && p.color === color && p.type === type) n++;
  }
  return n;
}

// Opposition: after the move the OPPONENT is to move, so the mover has the
// opposition when the kings stand on a line with an ODD number of squares
// between them (file, rank, or diagonal).
export function moverHasOpposition(chess, mover) {
  let wk, bk;
  for (const row of chess.board()) for (const sq of row) {
    if (sq?.type === 'k') (sq.color === 'w' ? (wk = sq.square) : (bk = sq.square));
  }
  if (!wk || !bk || chess.turn() === mover) return false;
  const df = Math.abs(wk.charCodeAt(0) - bk.charCodeAt(0));
  const dr = Math.abs(Number(wk[1]) - Number(bk[1]));
  const odd = (gap) => gap > 0 && gap % 2 === 1;
  if (df === 0) return odd(dr - 1);
  if (dr === 0) return odd(df - 1);
  if (df === dr) return odd(df - 1);
  return false;
}
const onlyKingsAndPawns = (chess) => chess.board().every(row => row.every(sq => !sq || sq.type === 'k' || sq.type === 'p'));

// Passed pawn: no enemy pawn ahead of it on its own or the neighbouring files.
function isPassed(chess, square, color) {
  const f = square.charCodeAt(0), r = Number(square[1]);
  const dir = color === 'w' ? 1 : -1;
  for (let df = -1; df <= 1; df++) {
    const file = String.fromCharCode(f + df);
    if (file < 'a' || file > 'h') continue;
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) {
      const p = chess.get(`${file}${rr}`);
      if (p && p.type === 'p' && p.color !== color) return false;
    }
  }
  return true;
}
function hasPassedPawn(chess, color) {
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type === 'p' && sq.color === color && isPassed(chess, sq.square, color)) return true;
  }
  return false;
}

// The engine's better move, described for the opening messages.
function engineBetter(st) {
  const res = st.r.bestUci && playUci(st.r.fenBefore, st.r.bestUci);
  if (!res) return null;
  const { mv } = res;
  const develops = (HOME[mv.color][mv.from] === mv.piece) || /[kq]/.test(mv.flags);
  return { kind: 'engine', san: mv.san, develops, castles: /[kq]/.test(mv.flags) };
}

// Why a null-move flag's move achieved nothing (middlegame/endgame).
function wasteReason(steps, i) {
  const cur = steps[i];
  for (let k = i - 2, n = 0; k >= 0 && n < 3; k -= 2, n += 1) {
    if (steps[k].to === cur.from && steps[k].from === cur.to) {
      return { kind: 'backForth', piece: NAME[cur.piece], square: cur.to };
    }
  }
  if (i >= 2 && steps[i - 2].to === cur.from) return { kind: 'samePiece', piece: NAME[cur.piece], square: cur.to };
  return { kind: 'nothing', piece: NAME[cur.piece], square: cur.to };
}

/**
 * Find the moves that lost a tempo, in every phase.
 * @param {Array}  rows  game-review rows (analyzeGame judge:'lichess'):
 *                       { san, side, classification, bestUci, fenBefore, winBefore, winAfter }
 * @param {object} opts  { startFen, engine, depth=18, moveTime=10000, isCancelled(),
 *                         onTick({done,total}), onFunnel(funnel),
 *                         isBookMove(prefixSans, san) → Promise<boolean> }
 * @returns {Promise<Array<{ply, san, side, phase, tempi, confidence, cost,
 *                          turnValue?, used?, better, reason}>>}
 */
export async function findLostTempi(rows, opts = {}) {
  const { startFen, engine, depth = 18, moveTime = 10000 } = opts;
  const isCancelled = opts.isCancelled || (() => false);
  const onTick = opts.onTick || (() => {});

  // Replay once: each move's piece, squares, phase, and the board before it.
  const chess = startFen ? new Chess(startFen) : new Chess();
  const steps = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const before = new Chess(chess.fen());
    const inCheck = chess.inCheck();
    const moveNumber = chess.moveNumber();
    let mv;
    try { mv = chess.move(r.san); } catch { mv = null; }
    if (!mv) break;
    const mine = (w) => (mv.color === 'w' ? w : 100 - w);
    steps.push({
      i, r, before, after: new Chess(chess.fen()), inCheck,
      from: mv.from, to: mv.to, piece: mv.piece, color: mv.color, san: mv.san,
      captured: !!mv.captured, check: /[+#]/.test(mv.san),
      uci: mv.from + mv.to + (mv.promotion || ''),
      quiet: !mv.captured && !/[+#]/.test(mv.san),
      phase: phaseOf(moveNumber, chess),
      best: mine(r.winBefore), played: mine(r.winAfter),
      cost: mine(r.winBefore) - mine(r.winAfter),
    });
  }
  const events = [];
  const flagged = new Set();
  const push = (st, e) => { if (flagged.has(st.i)) return; flagged.add(st.i); events.push({ ply: st.i + 1, san: st.san, side: st.color === 'w' ? 'white' : 'black', phase: st.phase, tempi: 1, cost: Math.round(st.cost), ...e }); };
  const engineMove = (st) => st.r.bestUci && st.r.bestUci === st.uci;
  const eligible = (st) => !engineMove(st) && st.r.classification !== 'blunder';

  // ── OPENING ──────────────────────────────────────────────────────────────
  // Theory first: walk the game while it stays in master games. The first move
  // that isn't theory ends the book; nothing before it can be flagged. No
  // explorer (or it fails) → treat the whole opening as theory: flag nothing.
  let bookEnd = steps.length;
  const opening = steps.filter(s => s.phase === 'opening');
  if (!startFen && opts.isBookMove && opening.length) {
    bookEnd = opening.length;
    try {
      for (const st of opening) {
        if (isCancelled()) throw new Error('cancelled');
        const prefix = steps.slice(0, st.i).map(s => s.san);
        if (!(await opts.isBookMove(prefix, st.san))) { bookEnd = st.i; break; }
      }
    } catch (e) {
      if (e?.message === 'cancelled') throw e;
      bookEnd = steps.length;
    }
  }
  for (const st of opening) {
    if (st.i < bookEnd || st.captured || st.check || st.inCheck || !eligible(st)) continue;
    const them = st.color === 'w' ? 'b' : 'w';
    const undeveloped = undevelopedMinors(st.before, st.color, st.from);

    // chased — this move puts a piece on a square where, while it stays there
    // (up to 3 opponent moves), the opponent attacks it WHILE DEVELOPING (a
    // minor piece leaving home, or a pawn move) and it then has to move again.
    // e.g. 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 — …g6 gained a tempo on the queen.
    if (st.piece !== 'p' && st.piece !== 'k' && !st.after.attackers(st.to, them).length) {
      let chase = null;
      for (let k = st.i + 1; k < steps.length && k <= st.i + 5; k += 2) {
        const reply = steps[k], again = steps[k + 1];
        if (!reply || !again) break;
        // An own move in between that moved the piece ends the search.
        if (k > st.i + 1 && steps[k - 1].from === st.to) break;
        const attackers = reply.after.attackers(st.to, them);
        const developing = reply.piece === 'p' || (HOME[them][reply.from] && reply.piece !== 'p');
        if (!reply.captured && developing && attackers.length) {
          const cheapest = Math.min(...attackers.map(a => VALUE[reply.after.get(a).type]));
          const undefended = reply.after.attackers(st.to, st.color).length === 0;
          if ((cheapest < VALUE[st.piece] || undefended) && again.from === st.to) chase = { reply, again };
          break;   // the first attack decides — later ones are a different story
        }
        if (attackers.length) break;
      }
      if (chase && st.cost + Math.max(0, chase.again.cost) >= TEMPO_RULES.minCost) {
        push(st, { confidence: 'high', cost: Math.round(st.cost + Math.max(0, chase.again.cost)),
          reason: { kind: 'chased', piece: NAME[st.piece], square: st.to, by: chase.reply.san },
          better: engineBetter(st) });
        continue;
      }
    }
    if (st.cost < TEMPO_RULES.minCost || undeveloped < TEMPO_RULES.minUndeveloped) continue;

    // sameAgain — a piece that already moved moves again, not escaping attack.
    const movedBefore = steps.slice(0, st.i).some(s => s.color === st.color && s.to === st.from);
    if (movedBefore && st.piece !== 'p' && st.piece !== 'k') {
      const attackers = st.before.attackers(st.from, them);
      const escaping = attackers.length > 0 && (st.before.attackers(st.from, st.color).length === 0
        || Math.min(...attackers.map(a => VALUE[st.before.get(a).type])) < VALUE[st.piece]);
      const bestRes = st.r.bestUci && playUci(st.r.fenBefore, st.r.bestUci);
      const bestSamePiece = bestRes && bestRes.mv.from === st.from;
      if (!escaping && !bestSamePiece) {
        push(st, { confidence: st.cost >= 10 ? 'high' : 'medium',
          reason: { kind: 'sameAgain', piece: NAME[st.piece], square: st.to, undeveloped },
          better: engineBetter(st) });
        continue;
      }
    }

    // flankPawn — an edge pawn push that develops nothing and attacks nothing.
    if (st.piece === 'p') {
      const file = st.to[0];
      const twoStep = Math.abs(Number(st.to[1]) - Number(st.from[1])) === 2;
      const fianchetto = !twoStep && (file === 'b' || file === 'g');
      const flank = file === 'a' || file === 'h' || ((file === 'b' || file === 'g') && !fianchetto);
      const antiPin = !twoStep && ['a3', 'h3', 'a6', 'h6'].includes(st.to)
        && st.before.board().some(row => row.some(sq => sq && sq.type === 'b' && sq.color === them));
      const attacksPiece = st.after.board().some(row => row.some(sq => sq && sq.color === them && sq.type !== 'p'
        && st.after.attackers(sq.square, st.color).includes(st.to)));
      if (flank && !antiPin && !attacksPiece) {
        push(st, { confidence: st.cost >= 10 ? 'high' : 'medium',
          reason: { kind: 'flankPawn', piece: 'pawn', square: st.to, undeveloped },
          better: engineBetter(st) });
      }
    }
  }

  // ── ENDGAME patterns (no engine needed) ──────────────────────────────────
  for (const st of steps) {
    if (st.phase !== 'endgame' || !st.quiet || st.inCheck || !eligible(st)) continue;
    if (st.cost < TEMPO_RULES.minCost || category(st.played) >= category(st.best)) continue;
    const bestRes = st.r.bestUci && playUci(st.r.fenBefore, st.r.bestUci);
    if (!bestRes) continue;
    if (onlyKingsAndPawns(st.before) && st.piece === 'k' && bestRes.mv.piece === 'k'
        && moverHasOpposition(bestRes.c, st.color) && !moverHasOpposition(st.after, st.color)) {
      push(st, { confidence: 'high', reason: { kind: 'lostOpposition', piece: 'king', square: st.to },
        better: { kind: 'opposition', san: bestRes.mv.san } });
      continue;
    }
    const them = st.color === 'w' ? 'b' : 'w';
    if (bestRes.mv.piece === 'p' && !bestRes.mv.captured && st.piece !== 'p'
        && isPassed(st.before, bestRes.mv.from, st.color) && hasPassedPawn(st.before, them)) {
      push(st, { confidence: 'high', reason: { kind: 'pawnRace', piece: 'pawn', square: bestRes.mv.from },
        better: { kind: 'pushPassed', san: bestRes.mv.san } });
    }
  }

  // ── MIDDLEGAME + ENDGAME: the null-move rule ─────────────────────────────
  const funnel = { quiet: 0, notEngineMove: 0, notBlunder: 0, costEnough: 0,
    betterIsTempoMove: 0, passLegal: 0, turnValuable: 0, noDamage: 0, usedLittle: 0 };
  const candidates = [];
  for (const st of steps) {
    if (st.phase === 'opening' || !st.quiet || st.inCheck || flagged.has(st.i)) continue;
    funnel.quiet++;
    if (!st.r.fenBefore || !st.r.bestUci || engineMove(st)) continue;
    funnel.notEngineMove++;
    if (st.r.classification === 'blunder') continue;
    funnel.notBlunder++;
    if (st.cost < TEMPO_RULES.minCost) continue;
    funnel.costEnough++;
    const tempoMove = tempoMoveInfo(st.r.fenBefore, st.r.bestUci);
    if (!tempoMove) continue;
    funnel.betterIsTempoMove++;
    const pf = passFen(st.r.fenBefore);
    if (!pf) continue;
    funnel.passLegal++;
    candidates.push({ st, tempoMove, pf });
  }
  for (let k = 0; k < candidates.length; k++) {
    if (isCancelled()) throw new Error('cancelled');
    onTick({ done: k, total: candidates.length });
    const { st, tempoMove, pf } = candidates[k];
    const res = await engine.getBestMove(pf, { depth, moveTime });
    const pass = 100 - stmWin(res?.evaluation);        // opponent to move → flip to the player
    const turnValue = st.best - pass;
    const used = st.played - pass;
    if (turnValue < TEMPO_RULES.minTurnValue) continue;
    funnel.turnValuable++;
    if (used < -TEMPO_RULES.maxDamage) continue;
    funnel.noDamage++;
    if (used > TEMPO_RULES.maxUsedShare * turnValue) continue;
    funnel.usedLittle++;
    const share = Math.max(0, used) / turnValue;
    push(st, {
      confidence: turnValue >= 15 && share <= 0.1 ? 'high' : 'medium',
      turnValue: Math.round(turnValue), used: Math.round(used),
      better: tempoMove, reason: wasteReason(steps, st.i),
    });
  }
  onTick({ done: candidates.length, total: candidates.length });
  opts.onFunnel?.(funnel);
  return events.sort((a, b) => a.ply - b.ply);
}
