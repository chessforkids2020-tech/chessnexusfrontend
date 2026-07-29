import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import stockfishService from '../services/stockfishService';
import api from '../api';
import './BlunderAssignmentPlayer.css';
import './FenAssignmentPlayer.css';

// Map a Stockfish eval (cp or mate, from the side-to-move's perspective) to a
// single comparable centipawn number. Mate → a large bounded value. (Mirrors the
// same helper Monthly Focus uses so the grading is identical.)
function evalToCp(evaluation) {
  if (!evaluation) return 0;
  if (evaluation.type === 'mate') {
    const m = evaluation.value;
    const big = 100000 - Math.min(Math.abs(m), 50) * 1000;
    return m >= 0 ? big : -big;
  }
  return evaluation.value;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MATE_THRESHOLD = 40000;

// Student player for a coach "play vs Stockfish" (fen_solution) assignment. Each
// position is played out against Stockfish, which grades every move within a
// centipawn tolerance and plays a reply. When the student has played `userMoveCount`
// accepted moves (or checkmates), the position PASSES. Same engine-judged mechanic
// as Monthly Focus puzzles; the reference solution is never sent to the client.
export default function FenAssignmentPlayer({ assignment, onClose, onGraded }) {
  const positions = useMemo(() => assignment.fenTask?.positions || [], [assignment]);
  const tolerance = assignment.fenTask?.engineToleranceCp || 80;
  const depth = assignment.fenTask?.engineDepth || 12;

  const [engineReady, setEngineReady] = useState(false);
  const [idx, setIdx] = useState(0);              // current position index
  const [fen, setFen] = useState(positions[0]?.fen || START_FEN);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [feedback, setFeedback] = useState('');   // transient per-move message
  const [result, setResult] = useState(null);     // { solved, total, accuracy, passed }
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Per-position running state (refs so async engine callbacks read fresh values).
  const chessRef = useRef(new Chess(positions[0]?.fen || START_FEN));
  const userMovesRef = useRef(positions.map(() => []));      // accepted SAN by the student
  const verdictsRef = useRef(positions.map(() => null));     // 'pass' | 'fail' | null (unattempted)
  const bestHintRef = useRef(positions.map(() => ''));       // engine's best SAN when a move is rejected
  const [verdicts, setVerdicts] = useState(positions.map(() => null));

  const cur = positions[idx];
  const orientation = useMemo(() => {
    try { return new Chess(cur?.fen || START_FEN).turn() === 'w' ? 'white' : 'black'; }
    catch { return 'white'; }
  }, [cur]);
  // userMoveCount === 0 means PLAY TO THE END: keep playing vs Stockfish until
  // checkmate/stalemate/draw. Used for endgames, where "N good moves" is
  // meaningless — the coach wants the position converted, not counted.
  const playToEnd = cur?.userMoveCount === 0;
  const requiredMoves = playToEnd ? Infinity : (cur?.userMoveCount || 1);
  const done = verdicts[idx] != null;

  // Boot Stockfish once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (alive) setEngineReady(true);
      } catch {
        if (alive) setErr('Could not start the engine. Refresh and try again.');
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load a position into the live board.
  const loadPosition = (i) => {
    const p = positions[i];
    if (!p) return;
    const start = p.fen || START_FEN;
    try { chessRef.current = new Chess(start); } catch { chessRef.current = new Chess(START_FEN); }
    setIdx(i);
    setFen(chessRef.current.fen());
    setLastMove(null);
    setFeedback('');
    setErr('');
  };

  // Grade one student move (engine-judged), then play the engine's reply. Same
  // logic as Monthly Focus judgeEngineMove, adapted to per-position local state.
  const judge = async (fenBefore, chessAfter, userSan) => {
    userMovesRef.current[idx] = [...(userMovesRef.current[idx] || []), userSan];
    const played = userMovesRef.current[idx].length;

    const finish = (passed) => {
      verdictsRef.current[idx] = passed ? 'pass' : 'fail';
      setVerdicts(prev => { const n = [...prev]; n[idx] = passed ? 'pass' : 'fail'; return n; });
      setThinking(false);
      setFeedback(passed ? '✅ Solved!' : `❌ That gives up the advantage. Best was ${bestHintRef.current[idx] || '—'}.`);
    };

    try {
      setThinking(true);
      if (chessAfter.isCheckmate()) { finish(true); return; }

      const pre = await stockfishService.getBestMove(fenBefore, { depth, moveTime: 1200 });
      const bestCp = evalToCp(pre.evaluation);

      const userUci = (chessAfter.history({ verbose: true }).slice(-1)[0]) || null;
      const userMoveUci = userUci ? (userUci.from + userUci.to + (userUci.promotion || '')) : '';
      const bestUci = (pre.bestMove || '').toLowerCase();
      const matchedBest = bestUci && userMoveUci &&
        (userMoveUci === bestUci || userMoveUci === bestUci.replace(/[qrbn]$/, ''));

      let userCpAfter, reply = null;
      if (chessAfter.isGameOver()) {
        userCpAfter = chessAfter.isDraw() ? 0 : evalToCp(pre.evaluation);
      } else {
        const post = await stockfishService.getBestMove(chessAfter.fen(), { depth, moveTime: 1200 });
        userCpAfter = -evalToCp(post.evaluation);
        reply = post.bestMove;
      }

      const mateInvolved = Math.abs(bestCp) >= MATE_THRESHOLD || Math.abs(userCpAfter) >= MATE_THRESHOLD;
      const loss = bestCp - userCpAfter;
      const accepted = matchedBest || (mateInvolved ? loss <= 0 : loss <= tolerance);

      if (!accepted) {
        // Record the engine's best (as SAN) so the student learns the right idea.
        try {
          if (pre.bestMove && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(pre.bestMove)) {
            const probe = new Chess(fenBefore);
            const bm = probe.move({ from: pre.bestMove.slice(0, 2), to: pre.bestMove.slice(2, 4), promotion: pre.bestMove[4] || 'q' });
            if (bm) bestHintRef.current[idx] = bm.san;
          }
        } catch { /* hint optional */ }
        finish(false);
        return;
      }

      // Accepted. All required moves played → solved.
      if (played >= requiredMoves) { finish(true); return; }

      // Engine plays its reply so the student can continue the line.
      if (reply && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(reply)) {
        const rm = chessAfter.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] || 'q' });
        if (rm) {
          setFen(chessAfter.fen());
          setLastMove({ from: rm.from, to: rm.to });
          if (chessAfter.isGameOver()) {
            // The ENGINE's reply ended the game. If it just mated the student,
            // that's a loss — only a draw or the student's own mate is a pass.
            const lost = chessAfter.isCheckmate();
            finish(!lost);
            return;
          }
        }
      }
      // In play-to-the-end mode there's no countdown to report — every move has
      // already been engine-checked, so just tell them to keep converting.
      setFeedback(playToEnd
        ? 'Good — keep going until the game ends.'
        : `Good — ${requiredMoves - played} more good move${requiredMoves - played > 1 ? 's' : ''} to go.`);
      setThinking(false);
    } catch {
      // Never block the student on an engine glitch. In play-to-the-end mode
      // `requiredMoves` is Infinity, so this check can never pass — let them
      // carry on playing rather than freezing the position.
      if (!playToEnd && played >= requiredMoves) { finish(true); return; }
      setThinking(false);
    }
  };

  const onDrop = (src, tgt, promo) => {
    if (!engineReady || thinking || done) return false;
    const chess = chessRef.current;
    const fenBefore = chess.fen();
    const move = chess.move({ from: src, to: tgt, promotion: promo || 'q' });
    if (!move) return false;
    setFen(chess.fen());
    setLastMove({ from: move.from, to: move.to });
    setFeedback('');
    judge(fenBefore, chess, move.san);
    return true;
  };

  const retry = () => {
    userMovesRef.current[idx] = [];
    verdictsRef.current[idx] = null;
    bestHintRef.current[idx] = '';
    setVerdicts(prev => { const n = [...prev]; n[idx] = null; return n; });
    loadPosition(idx);
  };

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const results = positions.map((_, i) => ({
        passed: verdictsRef.current[i] === 'pass',
        moves: userMovesRef.current[i] || [],
        engineBestMove: bestHintRef.current[i] || '',
      }));
      const res = await api.post(`/api/coach/my-assignments/${assignment._id}/submit-fen`, { results });
      setResult(res.data);
      onGraded?.(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const solvedCount = verdicts.filter(v => v === 'pass').length;
  const attempted = verdicts.filter(v => v != null).length;

  return (
    <div className="bap-overlay">
      <div className="bap-modal">
        <div className="bap-head">
          <div>
            <div className="bap-title">♟️ {assignment.title}</div>
            <div className="bap-sub">
              Play vs Stockfish · {positions.length} position{positions.length > 1 ? 's' : ''} · Stockfish scores your moves
            </div>
          </div>
          <button className="bap-x" onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div className="bap-result">
            <div className="bap-result-icon">{result.passed ? '🎉' : '♟️'}</div>
            <h2>{result.passed ? 'Assignment complete!' : 'Submitted'}</h2>
            <p>You solved <strong>{result.solved}</strong> of {result.total} positions ({result.accuracy}% accuracy).</p>
            <button className="bap-btn" onClick={onClose}>Back to assignments</button>
          </div>
        ) : (
          <div className="bap-body">
            <div className="bap-board">
              <Chessboard
                position={fen}
                boardWidth={Math.min(window.innerWidth - 48, 420)}
                draggable={engineReady && !thinking && !done}
                orientation={orientation}
                onDrop={onDrop}
                lastMove={lastMove}
              />
              <div className="fap-status">
                {!engineReady ? '⏳ Loading engine…'
                  : thinking ? '🤔 Stockfish is checking…'
                  : cur?.tag ? `🎯 ${cur.tag}`
                  : playToEnd
                    ? `Play this position out to the end as ${orientation === 'white' ? 'White' : 'Black'} — win it, or hold the draw.`
                    : `Find ${requiredMoves} good move${requiredMoves > 1 ? 's' : ''} for ${orientation === 'white' ? 'White' : 'Black'}.`}
              </div>
              {feedback && <div className={`fap-feedback ${verdicts[idx] === 'pass' ? 'ok' : verdicts[idx] === 'fail' ? 'bad' : ''}`}>{feedback}</div>}
              {done && (
                <button className="fap-retry" onClick={retry}>↻ Try this position again</button>
              )}
            </div>

            <div className="fap-side">
              <div className="fap-progress-label">Positions</div>
              <div className="fap-dots">
                {positions.map((_, i) => (
                  <button
                    key={i}
                    className={`fap-dot ${i === idx ? 'cur' : ''} ${verdicts[i] === 'pass' ? 'pass' : verdicts[i] === 'fail' ? 'fail' : ''}`}
                    onClick={() => loadPosition(i)}
                    title={`Position ${i + 1}`}
                  >{i + 1}</button>
                ))}
              </div>
              <div className="fap-nav">
                <button disabled={idx === 0} onClick={() => loadPosition(idx - 1)}>◀ Prev</button>
                <button disabled={idx >= positions.length - 1} onClick={() => loadPosition(idx + 1)}>Next ▶</button>
              </div>

              <div className="fap-tally">✅ {solvedCount} solved · {attempted}/{positions.length} attempted</div>
              {err && <div className="bap-err">{err}</div>}
              <button
                className="bap-btn"
                disabled={submitting || attempted === 0}
                onClick={submit}
              >
                {submitting ? 'Submitting…' : 'Submit to coach'}
              </button>
              <div className="fap-hint">Solve every position, then submit. Your best result is sent to your coach.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
