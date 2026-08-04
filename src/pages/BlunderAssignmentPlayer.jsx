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
  // ONE ANSWER LIST PER GAME. This used to be a single flat array sized to the
  // set-wide findTarget, so a 2-game set with 1 blunder each showed "find 2"
  // and TWO boxes on every game. Each game now gets exactly its own count.
  const [foundByGame, setFoundByGame] = useState(
    () => games.map(g => Array(Math.max(1, g.blunderCount || 1)).fill(''))
  );
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

  const gameTarget = Math.max(1, games[gi]?.blunderCount || 1);
  const found = foundByGame[gi] || [];

  // A game counts as answered once EVERY one of its boxes is filled — a partial
  // answer must not let the student move on, or they'd submit an incomplete game.
  const isAnswered = (arr) => (arr || []).length > 0 && arr.every(m => m.trim());
  const thisGameAnswered = isAnswered(foundByGame[gi]);
  const allAnswered = games.length > 0 && foundByGame.every(isAnswered);
  const remainingGames = foundByGame.filter(arr => !isAnswered(arr)).length;
  const setSlot = (i, v) => setFoundByGame(prev => prev.map(
    (arr, g) => (g === gi ? arr.map((x, j) => (j === i ? v : x)) : arr)
  ));

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const res = await api.post(`/api/coach/my-assignments/${assignment._id}/submit-pgn`, {
        // Per game now, so the server can grade each game on its own blunders.
        foundMoves: foundByGame.map(arr => arr.filter(m => m.trim())),
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
            <div className="bap-sub">{games.length} game{games.length > 1 ? 's' : ''} · solve every game to finish</div>
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
              {/* Game switcher moved ABOVE the board — under it a student had to
                  scroll past the board to find it, so a 2-game assignment looked
                  like a 1-game one. A tick marks games already answered. */}
              {games.length > 1 && (
                <div className="bap-games">
                  {games.map((_, i) => {
                    const answered = isAnswered(foundByGame[i]);
                    return (
                      <button
                        key={i}
                        className={i === gi ? 'bap-game-active' : ''}
                        onClick={() => { setGi(i); setPly(0); }}
                      >{answered ? '✓ ' : ''}Game {i + 1}</button>
                    );
                  })}
                </div>
              )}
              {/* No onDrop handler → display-only board. */}
              <Chessboard position={fen} />
              <div className="bap-nav">
                <button onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
                <button onClick={() => setPly(p => Math.max(0, p - 1))} disabled={ply === 0}>◀</button>
                <span className="bap-ply">{ply}/{maxPly}{lastSan ? ` · ${lastSan}` : ''}</span>
                <button onClick={() => setPly(p => Math.min(maxPly, p + 1))} disabled={ply >= maxPly}>▶</button>
                <button onClick={() => setPly(maxPly)} disabled={ply >= maxPly}>⏭</button>
              </div>
            </div>

            <div className="bap-finds">
              <div className="bap-finds-label">
                Game {gi + 1}: find {gameTarget} blunder{gameTarget > 1 ? 's' : ''}
              </div>
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

              {/* NEXT GAME until every game has an answer, then Submit.
                  Previously a student saw "Submit answers" on game 1 of 2, so
                  they submitted after one game and the whole assignment was
                  graded — game 2 never opened. Submit only appears once there
                  is nothing left to fill in. */}
              {!allAnswered ? (
                <>
                  <button
                    className="bap-btn"
                    disabled={!thisGameAnswered}
                    onClick={() => {
                      // Jump to the first game still missing an answer, so the
                      // student is never dropped on one they've already done.
                      const next = foundByGame.findIndex(arr => !arr.some(m => m.trim()));
                      setGi(next === -1 ? Math.min(gi + 1, games.length - 1) : next);
                      setPly(0);
                    }}
                  >
                    Next game ▶
                  </button>
                  <div className="bap-finds-hint">
                    {thisGameAnswered
                      ? `${remainingGames} game${remainingGames > 1 ? 's' : ''} left`
                      : 'Fill in this game to continue'}
                  </div>
                </>
              ) : (
                <button className="bap-btn" disabled={submitting} onClick={submit}>
                  {submitting ? 'Submitting…' : 'Submit assignment'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
