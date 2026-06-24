import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import './MasterMoveBoard.css';

/**
 * "Guess the Master's Move" — an inline daily widget.
 *
 * Renders a large, directly-playable board (no popup): the player drags a piece
 * to guess the move the master played, then we reveal the move + which masters
 * played the game. The position rotates every 24h (IST) — handled server-side
 * by /api/master-games/daily-move, so everyone sees the same one each day.
 *
 * The board sizes to its container (capped by `maxBoard`) so it fills the space
 * available on laptop/desktop and shrinks gracefully on mobile.
 *
 * The "already played today" flag is PER ACCOUNT (scoped by user id, falling
 * back to 'guest') so a shared browser doesn't block the next student.
 */
export default function MasterMoveBoard({ maxBoard = 360 }) {
  const { user } = useAuth();

  const attemptKey = useCallback(
    () => `masterMoveAttempt_${(user && (user._id || user.id)) || 'guest'}`,
    [user]
  );

  const [daily, setDaily] = useState(null);   // { date, gameId, ply, fen, sideToMove }
  const [fen, setFen] = useState(null);        // current board fen (updates on reveal)
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);   // 'correct' | 'wrong' | null
  const [reveal, setReveal] = useState(null);       // { masterMove, bestMove, bestLine, comment, context }
  const [lastMove, setLastMove] = useState(null);
  const [done, setDone] = useState(false);          // attempted today (locks the board)

  // Responsive board sizing — measure the card's rendered width.
  const boardWrapRef = useRef(null);
  const [boardSize, setBoardSize] = useState(maxBoard);
  useEffect(() => {
    if (!boardWrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 0) setBoardSize(Math.max(220, Math.min(Math.floor(w), maxBoard)));
      }
    });
    obs.observe(boardWrapRef.current);
    return () => obs.disconnect();
  }, [maxBoard, loading]);

  // Load today's position once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/master-games/daily-move');
        if (!alive) return;
        setDaily(res.data);
        setFen(res.data.fen);
        if (localStorage.getItem(attemptKey()) === res.data.date) setDone(true);
      } catch {
        if (alive) setDaily(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [attemptKey]);

  const lockToday = () => {
    if (daily?.date) localStorage.setItem(attemptKey(), daily.date);
    setDone(true);
  };

  const submitGuess = async (san) => {
    try {
      const res = await api.post('/api/master-games/daily-move/guess', {
        gameId: daily.gameId,
        ply: daily.ply,
        move: san,
      });
      const r = res.data;
      setReveal(r);
      setFeedback(r.correct ? 'correct' : 'wrong');
      // Play the master's actual move on the board so the player SEES it.
      try {
        const chess = new Chess(daily.fen);
        const moved = chess.move(r.masterMove, { sloppy: true });
        if (moved) { setFen(chess.fen()); setLastMove({ from: moved.from, to: moved.to }); }
      } catch { /* keep current board */ }
      lockToday();
    } catch { /* ignore — let them retry */ }
  };

  const handleDrop = (from, to) => {
    if (done || reveal) return false;
    const chess = new Chess(daily.fen);
    let move;
    try {
      const piece = chess.get(from);
      const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
      move = chess.move({ from, to, promotion });
    } catch { return false; }
    if (!move) return false;
    submitGuess(move.san);
    return true;
  };

  if (loading) {
    return (
      <div className="mmb-card mmb-card--loading">
        <div className="mmb-skeleton" />
        <div className="mmb-caption-sub">Loading today’s master move…</div>
      </div>
    );
  }
  if (!daily) return null; // no data — render nothing rather than a broken widget

  const sideLabel = daily.sideToMove === 'black' ? 'Black' : 'White';

  return (
    <div className="mmb-card">
      <div className="mmb-head">
        <span className="mmb-badge">👑 Daily</span>
        <h3 className="mmb-title">Guess the Master’s Move</h3>
        <p className="mmb-sub">
          {reveal
            ? 'Here’s what the master played:'
            : done
              ? 'You’ve already played today — come back tomorrow!'
              : `${sideLabel} to move — drag a piece to guess.`}
        </p>
      </div>

      {feedback === 'correct' && <div className="mmb-fb mmb-fb-correct">✓ Brilliant — you found the master’s move!</div>}
      {feedback === 'wrong' && <div className="mmb-fb mmb-fb-wrong">Not this time — here’s what the master played.</div>}

      {reveal && (
        <div className="mmb-reveal">
          <div className="mmb-move">
            The master played <strong>{reveal.masterMove}</strong>
            {reveal.bestMove && reveal.bestMove !== reveal.masterMove && (
              <span className="mmb-best"> (engine prefers {reveal.bestMove})</span>
            )}
          </div>
          {reveal.comment && <p className="mmb-comment">{reveal.comment}</p>}
          {reveal.bestLine?.length > 0 && (
            <div className="mmb-line">
              <span className="mmb-line-label">Line:</span>
              {reveal.bestLine.map((m, i) => <span key={i} className="mmb-line-move">{m}</span>)}
            </div>
          )}
          <div className="mmb-context">
            <span className="mmb-context-players">{reveal.context.white} vs {reveal.context.black}</span>
            <span className="mmb-context-meta">
              {[reveal.context.event, reveal.context.year].filter(Boolean).join(' · ')}
              {reveal.context.result ? ` · ${reveal.context.result}` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="mmb-board" ref={boardWrapRef}>
        <Chessboard
          position={fen}
          orientation={daily.sideToMove === 'black' ? 'black' : 'white'}
          boardWidth={boardSize}
          draggable={!done && !reveal}
          onDrop={handleDrop}
          lastMove={lastMove}
        />
      </div>
    </div>
  );
}
