import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import api from '../api';
import './BlunderAssignmentPlayer.css';

// Student player for a coach "find the blunders" assignment. Steps through each
// game's moves; the student types the blunder moves they spot into slots, then
// submits. The backend grades (the answers are never sent to the client).
export default function BlunderAssignmentPlayer({ assignment, onClose, onGraded }) {
  const games = assignment.pgnTask?.games || [];
  const findTarget = assignment.pgnTask?.findTarget || 1;

  const [gi, setGi] = useState(0);            // current game index
  const [ply, setPly] = useState(0);          // current half-move index within the game
  const [found, setFound] = useState(Array(findTarget).fill(''));
  const [result, setResult] = useState(null); // { foundCount, findTarget, passed, correctMoves }
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Parse the current game's PGN into a list of FENs + SAN moves.
  const parsed = useMemo(() => {
    const g = games[gi];
    if (!g) return { fens: [], sans: [] };
    try {
      const chess = new Chess();
      chess.loadPgn(g.pgn);
      const history = chess.history();      // SAN moves
      const replay = new Chess();
      const fens = [replay.fen()];
      const sans = [];
      for (const san of history) {
        replay.move(san);
        sans.push(san);
        fens.push(replay.fen());
      }
      return { fens, sans };
    } catch {
      return { fens: [], sans: [] };
    }
  }, [games, gi]);

  const maxPly = parsed.sans.length;
  const fen = parsed.fens[ply] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const lastSan = ply > 0 ? parsed.sans[ply - 1] : null;

  const setSlot = (i, v) => setFound(prev => prev.map((x, j) => (j === i ? v : x)));

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const res = await api.post(`/api/coach/my-assignments/${assignment._id}/submit-pgn`, {
        foundMoves: found.filter(m => m.trim()),
      });
      setResult(res.data);
      if (onGraded) onGraded(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bap-overlay">
      <div className="bap-modal">
        <div className="bap-head">
          <div>
            <div className="bap-title">🔍 {assignment.title}</div>
            <div className="bap-sub">Find {findTarget} blunder{findTarget > 1 ? 's' : ''} · {games.length} game{games.length > 1 ? 's' : ''}</div>
          </div>
          <button className="bap-x" onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div className="bap-result">
            <div className="bap-result-icon">{result.passed ? '🎉' : '🔍'}</div>
            <h2>{result.passed ? 'Assignment complete!' : 'Keep looking'}</h2>
            <p>You found <strong>{result.foundCount}</strong> of the {result.findTarget} blunders needed.</p>
            {result.correctMoves?.length > 0 && (
              <div className="bap-correct">Correct: {result.correctMoves.join(', ')}</div>
            )}
            <button className="bap-btn" onClick={onClose}>Back to assignments</button>
          </div>
        ) : (
          <div className="bap-body">
            <div className="bap-board">
              {/* No onDrop handler → display-only board. */}
              <Chessboard position={fen} />
              <div className="bap-nav">
                <button onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
                <button onClick={() => setPly(p => Math.max(0, p - 1))} disabled={ply === 0}>◀</button>
                <span className="bap-ply">{ply}/{maxPly}{lastSan ? ` · ${lastSan}` : ''}</span>
                <button onClick={() => setPly(p => Math.min(maxPly, p + 1))} disabled={ply >= maxPly}>▶</button>
                <button onClick={() => setPly(maxPly)} disabled={ply >= maxPly}>⏭</button>
              </div>
              {games.length > 1 && (
                <div className="bap-games">
                  {games.map((_, i) => (
                    <button
                      key={i}
                      className={i === gi ? 'bap-game-active' : ''}
                      onClick={() => { setGi(i); setPly(0); }}
                    >Game {i + 1}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="bap-finds">
              <div className="bap-finds-label">Type the blunder moves you spot</div>
              {found.map((v, i) => (
                <input
                  key={i}
                  className="bap-find-input"
                  placeholder={`Blunder ${i + 1} (e.g. Qh5)`}
                  value={v}
                  onChange={e => setSlot(i, e.target.value)}
                />
              ))}
              {err && <div className="bap-err">{err}</div>}
              <button className="bap-btn" disabled={submitting || found.every(m => !m.trim())} onClick={submit}>
                {submitting ? 'Submitting…' : 'Submit answers'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
