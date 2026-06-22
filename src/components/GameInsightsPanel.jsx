import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import api from '../api';
import './GameInsightsPanel.css';

// Friendly labels for the extractor's snake_case themes.
const THEME_LABEL = {
  mate: '🏁 Checkmate', fork: '⑂ Fork', pin: '📌 Pin', skewer: '🍢 Skewer',
  hanging_piece: '🪝 Hanging Piece', queen_win: '👑 Win the Queen',
  discovered_attack: '💥 Discovered Attack', sacrifice: '🎯 Sacrifice',
  long_combination: '🧩 Combination', tactic: '⚡ Tactic',
};
const themeLabel = (t) => THEME_LABEL[t] || '⚡ Tactic';

/**
 * NEXUS GUIDE — a personal-coach persona on the dashboard. Speaks to the player
 * using real data from their own tournament games, points out their weaknesses,
 * lets them drill the weakest theme, and review the exact mistakes they made.
 * Separate from the human "My Coach" feature.
 */
export default function GameInsightsPanel() {
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);       // spoken advice + weakness
  const [puzzles, setPuzzles] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unsolved: 0 });
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState({ running: false });
  const [genError, setGenError] = useState('');
  const pollRef = useRef(null);

  const [active, setActive] = useState(null);
  const [fen, setFen] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [playedMove, setPlayedMove] = useState(null); // the correct move the user found
  const [revealed, setRevealed] = useState(false);
  const [explainText, setExplainText] = useState('');     // current explanation shown
  const [explainAI, setExplainAI] = useState(false);      // is it the AI one?
  const [explaining, setExplaining] = useState(false);

  const loadAll = async () => {
    try {
      const [g, p] = await Promise.all([
        api.get('/api/game-insights/guide'),
        api.get('/api/game-insights/puzzles?solved=false'),
      ]);
      setGuide(g.data);
      setPuzzles(p.data.puzzles || []);
      setCounts({ total: p.data.total || 0, unsolved: p.data.unsolved || 0 });
    } catch (e) {
      setGuide(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); return () => clearInterval(pollRef.current); }, []);

  const startGenerate = async () => {
    setGenError('');
    try {
      const res = await api.post('/api/game-insights/generate', { maxGames: 8 });
      if (res.data.status === 'started' || res.data.status === 'running') {
        setGen({ running: true, current: 0, total: res.data.total || 0, found: 0 });
        pollStatus();
      }
    } catch (e) {
      setGenError(e.response?.data?.message || "I couldn't find tournament games to analyse yet. Play a few arena games first!");
    }
  };

  const pollStatus = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get('/api/game-insights/status');
        setGen(res.data);
        if (!res.data.running) {
          clearInterval(pollRef.current);
          if (res.data.error) setGenError(res.data.error);
          loadAll();
        }
      } catch (e) { clearInterval(pollRef.current); }
    }, 2000);
  };

  const trainWeakness = (themeKey) => {
    const key = themeKey || guide?.trainThemeKey;
    if (key) navigate(`/training/healthy-mix?theme=${encodeURIComponent(key)}`);
  };

  const openPuzzle = (p) => {
    setActive(p); setFen(p.fen); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(p.explanation || ''); setExplainAI(!!p.explanationIsAI); setExplaining(false);
  };
  const closePuzzle = () => {
    setActive(null); setFen(null); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(''); setExplainAI(false); setExplaining(false);
  };

  // Lazily fetch a richer AI explanation (quota-guarded server-side, cached).
  const explainMore = async () => {
    if (!active || explaining || explainAI) return;
    setExplaining(true);
    try {
      const res = await api.post(`/api/game-insights/${active._id}/explain`);
      if (res.data?.explanation) {
        setExplainText(res.data.explanation);
        setExplainAI(!!res.data.ai);
      }
    } catch (e) { /* keep the rule-based text */ }
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

    // Accept any near-best move, not just the engine's #1 (positions often have
    // several equally good answers).
    const accepted = (active.acceptableMoves && active.acceptableMoves.length)
      ? active.acceptableMoves
      : [active.bestMove];
    const correct = accepted.includes(move.san);
    setFen(chess.fen());
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setPlayedMove(move.san);
    api.post(`/api/game-insights/${active._id}/solve`, { solved: correct }).catch(() => {});

    if (correct) { setRevealed(true); setTimeout(loadAll, 1200); }
    else { setTimeout(() => setFen(active.fen), 700); }
    return true;
  };

  // Play the engine's best move ON the board so the player SEES it, then reveal.
  const showBestMove = () => {
    if (!active) return;
    try {
      const chess = new Chess(active.fen);
      const moved = chess.move(active.bestMove, { sloppy: true });
      if (moved) setFen(chess.fen());
    } catch (e) { /* keep current fen */ }
    setRevealed(true);
    setFeedback('wrong');
    // Count it as an attempt (seen the answer, not solved).
    api.post(`/api/game-insights/${active._id}/solve`, { solved: false }).catch(() => {});
  };

  if (loading) return null;

  const hasData = guide?.hasData;

  return (
    <div className="gip">
      {/* ── Coach persona header ── */}
      <div className="gip-coach">
        <div className="gip-avatar">🧙</div>
        <div className="gip-speech">
          <div className="gip-coach-name">Nexus Guide <span className="gip-coach-tag">your training buddy</span></div>
          <p className="gip-coach-msg">
            {gen.running
              ? "Give me a moment — I'm studying your recent games…"
              : (guide?.message || "Hi! I'm your Nexus Guide. Let me look at your games and help you improve.")}
          </p>
          <div className="gip-coach-actions">
            <button className="gip-analyze-btn" onClick={startGenerate} disabled={gen.running}>
              {gen.running ? 'Analyzing…' : (hasData ? '🔄 Re-check my games' : '🔎 Analyze my games')}
            </button>
          </div>

          {/* One "train" chip per weakness — the player is usually weak at several. */}
          {hasData && guide?.weaknesses?.length > 0 && (
            <div className="gip-weak-train">
              <span className="gip-weak-label">🎯 Train a weakness:</span>
              {guide.weaknesses.slice(0, 5).map((w) => (
                <button key={w.trainKey} className="gip-weak-chip" onClick={() => trainWeakness(w.trainKey)}>
                  {w.noun}{w.count > 1 ? ` ×${w.count}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {gen.running && (
        <div className="gip-progress">
          <div className="gip-progress-bar">
            <div className="gip-progress-fill"
              style={{ width: `${gen.total ? Math.round((gen.current / gen.total) * 100) : 10}%` }} />
          </div>
          <span className="gip-progress-text">
            Studying game {gen.current || 0}/{gen.total || '…'} · {gen.found || 0} moments found
          </span>
        </div>
      )}

      {genError && <div className="gip-error">{genError}</div>}

      {/* ── Critical weakness alert (same mistake 3+ times) ── */}
      {hasData && guide?.critical && (
        <div className="gip-critical">
          <span className="gip-critical-icon">🚨</span>
          <div className="gip-critical-body">
            <div className="gip-critical-title">Weakest part: {guide.weaknessNoun}</div>
            <div className="gip-critical-text">
              You've lost to {guide.weaknessNoun} <strong>{guide.weaknessCount} times</strong> — immediate practice needed.
            </div>
          </div>
          <button className="gip-critical-btn" onClick={trainWeakness}>Train now →</button>
        </div>
      )}

      {/* ── Mistakes from your games ── */}
      {hasData && puzzles.length > 0 && (
        <>
          <div className="gip-count">{counts.unsolved} moment{counts.unsolved === 1 ? '' : 's'} from your games to learn from</div>
          <div className="gip-grid">
            {puzzles.map((p) => (
              <button key={p._id} className="gip-card" onClick={() => openPuzzle(p)}>
                <div className="gip-card-board">
                  <Chessboard position={p.fen} boardWidth={150} draggable={false} orientation={p.sideToMove} />
                </div>
                <div className="gip-card-info">
                  <span className="gip-card-theme">{themeLabel(p.theme)}</span>
                  <span className="gip-card-meta">
                    {p.opponentName ? `vs ${p.opponentName} · ` : ''}move {p.moveNumber}
                  </span>
                  <span className="gip-card-cta">Find the better move →</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Solving modal */}
      {active && (
        <div className="gip-modal-overlay" onClick={closePuzzle}>
          <div className="gip-modal" onClick={(e) => e.stopPropagation()}>
            <button className="gip-modal-close" onClick={closePuzzle}>✕</button>
            <div className="gip-modal-body">
              <div className="gip-modal-board">
                <Chessboard position={fen} boardWidth={420} draggable={feedback !== 'correct'}
                  onDrop={handleDrop} orientation={active.sideToMove} />
              </div>
              <div className="gip-modal-side">
                <h3>{themeLabel(active.theme)}</h3>
                <p className="gip-modal-context">
                  {active.opponentName ? `vs ${active.opponentName} · ` : ''}move {active.moveNumber}
                </p>
                <p className="gip-modal-prompt">
                  You played <strong className="gip-bad">{active.blunderMove}</strong> here.
                  <br />Can you find a better move? ({active.sideToMove} to move)
                </p>

                {feedback === 'wrong' && <div className="gip-fb gip-fb-wrong">Not quite — try again.</div>}
                {feedback === 'correct' && (
                  <div className="gip-fb gip-fb-correct">
                    ✓ Yes! <strong>{playedMove || active.bestMove}</strong> is a great move.
                    {playedMove && playedMove !== active.bestMove && (
                      <span className="gip-alt"> (engine's top pick was {active.bestMove})</span>
                    )}
                  </div>
                )}

                {!revealed && feedback !== 'correct' && (
                  <button className="gip-reveal" onClick={showBestMove}>
                    💡 Show best move
                  </button>
                )}

                {revealed && (
                  <div className="gip-answer">
                    {explainText && (
                      <div className="gip-why">
                        <span className="gip-why-avatar">🧙</span>
                        <div>
                          <p className="gip-why-text">{explainText}</p>
                          {!explainAI && (
                            <button className="gip-explain-more" onClick={explainMore} disabled={explaining}>
                              {explaining ? 'Thinking…' : '💡 Explain in more detail'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <p>You should have played:</p>
                    <div className="gip-line">
                      {active.solution.map((m, i) => (
                        <span key={i} className={`gip-move ${i === 0 ? 'gip-move-best' : ''}`}>{m}</span>
                      ))}
                    </div>
                    <p className="gip-swing">
                      Your move lost about <strong>{Math.abs(active.evalSwing)}</strong> points of advantage.
                    </p>
                    <button className="gip-next" onClick={closePuzzle}>Done</button>
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
