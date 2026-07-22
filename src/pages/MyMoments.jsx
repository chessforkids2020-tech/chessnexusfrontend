import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import api from '../api';
import './MyMoments.css';

// Friendly labels for the extractor's snake_case themes (mirrors GameInsightsPanel).
const THEME_LABEL = {
  mate: '🏁 Checkmate', fork: '⑂ Fork', pin: '📌 Pin', skewer: '🍢 Skewer',
  hanging_piece: '🪝 Hanging Piece', queen_win: '👑 Win the Queen',
  discovered_attack: '💥 Discovered Attack', sacrifice: '🎯 Sacrifice',
  long_combination: '🧩 Combination', tactic: '♟️ Tactic',
};
const themeLabel = (t) => THEME_LABEL[t] || '♟️ Tactic';

/**
 * MY MOMENTS — a standalone training destination showing the user's OWN mistakes
 * (blunder-moments) from their real games as a personal collection of puzzles.
 * Fed by the same UserGamePuzzle store as Nexus Guide; solving is RATING-NEUTRAL
 * (the /api/game-insights/:id/solve endpoint never touches liveRating).
 */
export default function MyMoments() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('false'); // 'false' unsolved | 'true' solved | 'all'
  const [puzzles, setPuzzles] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unsolved: 0 });
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState(null);
  const [fen, setFen] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [playedMove, setPlayedMove] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [explainAI, setExplainAI] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const reloadRef = useRef(null);

  const load = async (which = filter) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/game-insights/puzzles?solved=${which}`);
      setPuzzles(res.data.puzzles || []);
      setCounts({ total: res.data.total || 0, unsolved: res.data.unsolved || 0 });
    } catch (e) {
      setPuzzles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => () => clearTimeout(reloadRef.current), []);

  const openPuzzle = (p) => {
    setActive(p); setFen(p.fen); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(p.explanation || ''); setExplainAI(!!p.explanationIsAI); setExplaining(false);
  };
  const closePuzzle = () => {
    setActive(null); setFen(null); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(''); setExplainAI(false); setExplaining(false);
  };

  const explainMore = async () => {
    if (!active || explaining || explainAI) return;
    setExplaining(true);
    try {
      const res = await api.post(`/api/game-insights/${active._id}/explain`);
      if (res.data?.explanation) {
        setExplainText(res.data.explanation);
        setExplainAI(!!res.data.ai);
      }
    } catch (e) { /* keep rule-based text */ }
    finally { setExplaining(false); }
  };

  const handleDrop = (from, to) => {
    if (!active || feedback === 'correct') return false;
    const chess = new Chess(active.fen);
    let move;
    try {
      const piece = chess.get(from);
      const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
      move = chess.move({ from, to, promotion });
    } catch (e) { return false; }
    if (!move) return false;

    const accepted = (active.acceptableMoves && active.acceptableMoves.length)
      ? active.acceptableMoves : [active.bestMove];
    const correct = accepted.includes(move.san);
    setFen(chess.fen());
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setPlayedMove(move.san);
    // Rating-neutral solve — this endpoint never changes liveRating.
    api.post(`/api/game-insights/${active._id}/solve`, { solved: correct }).catch(() => {});

    if (correct) { setRevealed(true); reloadRef.current = setTimeout(() => load(filter), 1200); }
    else { setTimeout(() => setFen(active.fen), 700); }
    return true;
  };

  const showBestMove = () => {
    if (!active) return;
    try {
      const chess = new Chess(active.fen);
      const moved = chess.move(active.bestMove, { sloppy: true });
      if (moved) setFen(chess.fen());
    } catch (e) { /* keep fen */ }
    setRevealed(true);
    setFeedback('wrong');
    api.post(`/api/game-insights/${active._id}/solve`, { solved: false }).catch(() => {});
  };

  return (
    <div className="mm-page">
      <div className="mm-header">
        <div className="mm-header-icon">🎯</div>
        <div style={{ flex: 1 }}>
          <h1 className="mm-title">My Moments</h1>
          <p className="mm-subtitle">
            The exact mistakes from your own games — solve them to lock in the lesson.
            <strong> Practice only: no rating change.</strong>
          </p>
        </div>
      </div>

      <div className="mm-tabs">
        <button className={`mm-tab${filter === 'false' ? ' active' : ''}`} onClick={() => setFilter('false')}>
          To practise{counts.unsolved ? ` (${counts.unsolved})` : ''}
        </button>
        <button className={`mm-tab${filter === 'true' ? ' active' : ''}`} onClick={() => setFilter('true')}>
          Solved
        </button>
        <button className={`mm-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          All{counts.total ? ` (${counts.total})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="mm-empty">Loading your moments…</div>
      ) : puzzles.length === 0 ? (
        <div className="mm-empty">
          {counts.total === 0 ? (
            <>
              <p>You haven't collected any moments yet.</p>
              <p className="mm-empty-sub">Analyse your games and the Nexus Guide will turn your mistakes into puzzles here.</p>
              <button className="mm-cta" onClick={() => navigate('/game-analysis')}>🔎 Analyse my games</button>
            </>
          ) : (
            <p>Nothing here in this view. Try another tab.</p>
          )}
        </div>
      ) : (
        <div className="mm-grid">
          {puzzles.map((p) => (
            <button key={p._id} className={`mm-card${p.solved ? ' solved' : ''}`} onClick={() => openPuzzle(p)}>
              <div className="mm-card-board">
                <Chessboard position={p.fen} boardWidth={160} draggable={false} resizable={false} orientation={p.sideToMove} />
              </div>
              <div className="mm-card-info">
                <span className="mm-card-theme">{themeLabel(p.theme)}</span>
                <span className="mm-card-meta">
                  {p.opponentName ? `vs ${p.opponentName} · ` : ''}move {p.moveNumber}
                </span>
                <span className="mm-card-cta">{p.solved ? '✓ Solved · review' : 'Find the better move →'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Solving modal (mirrors GameInsightsPanel) */}
      {active && (
        <div className="mm-modal-overlay" onClick={closePuzzle}>
          <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mm-modal-close" onClick={closePuzzle}>✕</button>
            <div className="mm-modal-body">
              <div className="mm-modal-board">
                <Chessboard position={fen} boardWidth={420} draggable={feedback !== 'correct'}
                  onDrop={handleDrop} orientation={active.sideToMove} />
              </div>
              <div className="mm-modal-side">
                <h3>{themeLabel(active.theme)}</h3>
                <p className="mm-modal-context">
                  {active.opponentName ? `vs ${active.opponentName} · ` : ''}move {active.moveNumber}
                </p>
                <p className="mm-modal-prompt">
                  You played <strong className="mm-bad">{active.blunderMove}</strong> here.
                  <br />Can you find a better move? ({active.sideToMove} to move)
                </p>

                {feedback === 'wrong' && <div className="mm-fb mm-fb-wrong">Not quite — try again.</div>}
                {feedback === 'correct' && (
                  <div className="mm-fb mm-fb-correct">
                    ✓ Yes! <strong>{playedMove || active.bestMove}</strong> is a great move.
                    {playedMove && playedMove !== active.bestMove && (
                      <span className="mm-alt"> (engine's top pick was {active.bestMove})</span>
                    )}
                  </div>
                )}

                {!revealed && feedback !== 'correct' && (
                  <button className="mm-reveal" onClick={showBestMove}>💡 Show best move</button>
                )}

                {revealed && (
                  <div className="mm-answer">
                    {explainText && (
                      <div className="mm-why">
                        <span className="mm-why-avatar">🧙</span>
                        <div>
                          <p className="mm-why-text">{explainText}</p>
                          {!explainAI && (
                            <button className="mm-explain-more" onClick={explainMore} disabled={explaining}>
                              {explaining ? 'Thinking…' : '💡 Explain in more detail'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <p>You should have played:</p>
                    <div className="mm-line">
                      {active.solution.map((m, i) => (
                        <span key={i} className={`mm-move ${i === 0 ? 'mm-move-best' : ''}`}>{m}</span>
                      ))}
                    </div>
                    <p className="mm-swing">
                      Your move lost about <strong>{Math.abs(active.evalSwing)}</strong> points of advantage.
                    </p>
                    <button className="mm-next" onClick={closePuzzle}>Done</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
