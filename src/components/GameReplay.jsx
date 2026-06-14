import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLASS_META = {
  brilliant:   { icon: '✨', color: '#10b981', label: 'Brilliant!' },
  blunder:     { icon: '⁉️', color: '#ef4444', label: 'Blunder' },
  mistake:     { icon: '?!', color: '#f59e0b', label: 'Mistake' },
  inaccuracy:  { icon: '?!', color: '#eab308', label: 'Inaccuracy' },
  good:        { icon: '',   color: '#10b981', label: '' },
};

function buildFenHistory(pgn) {
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { return []; }
  const moves = chess.history({ verbose: true });
  const fens = [];
  const temp = new Chess();
  fens.push({ fen: temp.fen(), san: null, from: null, to: null });
  for (const m of moves) {
    temp.move(m);
    fens.push({ fen: temp.fen(), san: m.san, from: m.from, to: m.to });
  }
  return fens;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameReplay({ game, totalGames, onClose, onNext, onPrev }) {
  const { pgn, playerSide, moveAnalysis = [], accuracy, totalBlunders, gameThemes = [], opening, result, gameNumber, coachAnalysis, turningPoint } = game;

  // Resolve the turning point ply index for the player's side
  const turningPointPly = useMemo(() => {
    if (!turningPoint) return null;
    const tp = turningPoint[playerSide];
    if (!tp || tp.plyIndex == null) return null;
    return tp.plyIndex;
  }, [turningPoint, playerSide]);

  const fenHistory = useMemo(() => buildFenHistory(pgn), [pgn]);
  const [plyIndex, setPlyIndex] = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [activeTab, setActiveTab] = useState('moves'); // 'moves' | 'coach'
  const timerRef = useRef(null);
  const commentRef = useRef(null);

  // Reset on game change
  useEffect(() => {
    setPlyIndex(0);
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [pgn]);

  // Auto-play
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setPlyIndex(prev => {
          if (prev >= fenHistory.length - 1) {
            setPlaying(false);
            clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, fenHistory.length]);

  // Scroll commentary into view
  useEffect(() => {
    if (commentRef.current) {
      commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [plyIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setPlyIndex(p => Math.min(p + 1, fenHistory.length - 1)); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); setPlyIndex(p => Math.max(p - 1, 0)); }
      else if (e.key === ' ')          { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'Escape')     { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fenHistory.length, onClose]);

  const goFirst = useCallback(() => setPlyIndex(0), []);
  const goPrev  = useCallback(() => setPlyIndex(p => Math.max(p - 1, 0)), []);
  const goNext  = useCallback(() => setPlyIndex(p => Math.min(p + 1, fenHistory.length - 1)), [fenHistory.length]);
  const goLast  = useCallback(() => setPlyIndex(fenHistory.length - 1), [fenHistory.length]);

  // Current position
  const currentFen  = fenHistory[plyIndex]?.fen || 'start';
  const currentMove = plyIndex > 0 ? { from: fenHistory[plyIndex].from, to: fenHistory[plyIndex].to } : null;

  // Map ply → moveAnalysis entry
  // moveAnalysis is indexed by move order (0 = first move of the game).
  // plyIndex 1 → moveAnalysis[0], plyIndex 2 → moveAnalysis[1], etc.
  const currentAnalysis = plyIndex > 0 ? moveAnalysis[plyIndex - 1] : null;
  const meta = currentAnalysis ? CLASS_META[currentAnalysis.classification] || CLASS_META.good : null;

  // Move arrows: green bestMove for blunders/mistakes, gold for brilliant
  const arrows = useMemo(() => {
    if (!currentAnalysis) return [];
    // Brilliant: show the actual move as a gold arrow
    if (currentAnalysis.classification === 'brilliant') {
      const cur = fenHistory[plyIndex];
      if (cur?.from && cur?.to) return [{ from: cur.from, to: cur.to, color: '#10b981' }];
      return [];
    }
    if (!currentAnalysis.bestMove || currentAnalysis.classification === 'good' || currentAnalysis.classification === 'inaccuracy') return [];
    // Best move arrow for blunders/mistakes
    if (plyIndex < 1) return [];
    const prevFen = fenHistory[plyIndex - 1]?.fen;
    if (!prevFen) return [];
    try {
      const c = new Chess(prevFen);
      const m = c.move(currentAnalysis.bestMove);
      if (m) return [{ from: m.from, to: m.to, color: '#10b981' }];
    } catch {}
    return [];
  }, [currentAnalysis, plyIndex, fenHistory]);

  // Win chance bar (white's perspective)
  const whiteWinPct = useMemo(() => {
    if (!currentAnalysis) return 50;
    // winChanceBefore/After are from the moving player's perspective
    // Convert to white's perspective for the bar
    const val = currentAnalysis.winChanceAfter;
    return currentAnalysis.side === 'white' ? val : 100 - val;
  }, [currentAnalysis]);

  const atEnd = plyIndex >= fenHistory.length - 1;

  // Summary stats for end screen
  const totalBrilliant    = moveAnalysis.filter(m => m.classification === 'brilliant').length;
  const totalMistakes     = moveAnalysis.filter(m => m.classification === 'mistake').length;
  const totalInaccuracies = moveAnalysis.filter(m => m.classification === 'inaccuracy').length;

  return (
    <div className="gr-container">
      {/* Header */}
      <div className="gr-header">
        <button className="gr-back-btn" onClick={onClose}>← Back to Overview</button>
        <div className="gr-header-info">
          <span className="gr-game-num">Game {gameNumber}</span>
          <span className="gr-opening">{opening || 'Unknown'}</span>
        </div>
      </div>

      <div className="gr-layout">
        {/* Board */}
        <div className="gr-board-col">
          <Chessboard
            position={currentFen}
            orientation={playerSide || 'white'}
            draggable={false}
            lastMove={currentMove}
            arrows={arrows}
            boardWidth={420}
            coordinateSides={['left', 'bottom']}
          />

          {/* Win Chance Bar */}
          <div className="gr-winbar-wrap">
            <div className="gr-winbar">
              <div className="gr-winbar-white" style={{ width: `${whiteWinPct}%` }} />
            </div>
            <div className="gr-winbar-labels">
              <span>White {whiteWinPct}%</span>
              <span>Black {100 - whiteWinPct}%</span>
            </div>
          </div>

          {/* Controls */}
          <div className="gr-controls">
            <button className="gr-ctrl-btn" onClick={goFirst} disabled={plyIndex <= 0}>⏮</button>
            <button className="gr-ctrl-btn" onClick={goPrev} disabled={plyIndex <= 0}>◀</button>
            <button className="gr-ctrl-btn gr-play-btn" onClick={() => setPlaying(p => !p)}>
              {playing ? '⏸' : '▶'}
            </button>
            <button className="gr-ctrl-btn" onClick={goNext} disabled={atEnd}>▶</button>
            <button className="gr-ctrl-btn" onClick={goLast} disabled={atEnd}>⏭</button>
          </div>
          <div className="gr-controls-hint">
            Use ← → arrow keys · Space to play/pause · Esc to close
          </div>
        </div>

        {/* Commentary + Move List */}
        <div className="gr-info-col">
          {/* Tab bar */}
          <div className="gr-tabs">
            <button
              className={`gr-tab${activeTab === 'moves' ? ' active' : ''}`}
              onClick={() => setActiveTab('moves')}
            >
              Move Analysis
            </button>
          </div>
          {/* TODO: Re-add Chess Nexus Coach tab here when AI commentary is re-enabled */}

          {/* ── MOVES TAB ── */}
          {activeTab === 'moves' && (<>
          {/* Move list */}
          <div className="gr-move-list">
            <div className="gr-move-list-inner">
              {moveAnalysis.map((m, i) => {
                const pi = i + 1; // ply index
                const isWhite = m.side === 'white';
                const cls = m.classification;
                const isTurning = turningPointPly != null && pi === turningPointPly;
                return (
                  <span
                    key={i}
                    className={`gr-move-chip ${cls}${pi === plyIndex ? ' current' : ''}${isTurning ? ' turning-point' : ''}`}
                    title={isTurning ? '⚡ Critical turning point — win chance dropped here' : undefined}
                    onClick={() => setPlyIndex(pi)}
                  >
                    {isWhite ? `${m.moveNumber}. ` : ''}{m.move}
                    {isTurning && <span className="gr-tp-marker">⚡</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Commentary */}
          <div className="gr-commentary">
            {plyIndex === 0 && (
              <div className="gr-comment-bubble gr-comment-info">
                <div className="gr-comment-text">
                  Starting position. Press ▶ or → to step through moves.
                </div>
              </div>
            )}

            {plyIndex > 0 && currentAnalysis && (
              <div
                ref={commentRef}
                className={`gr-comment-bubble gr-comment-${currentAnalysis.classification}`}
              >
                {meta && meta.icon && (
                  <span className="gr-comment-icon">{meta.icon}</span>
                )}
                <div className="gr-comment-body">
                  <div className="gr-comment-move">
                    {currentAnalysis.moveNumber}. {currentAnalysis.side === 'black' ? '…' : ''}{currentAnalysis.move}
                    {meta && meta.label && (
                      <span className="gr-comment-badge" style={{ background: meta.color + '22', color: meta.color }}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <div className="gr-comment-text">
                    {currentAnalysis.explanation
                      ? currentAnalysis.explanation
                      : 'Good move. No significant advantage lost.'
                    }
                  </div>
                  {currentAnalysis.classification === 'brilliant' && currentAnalysis.winChanceGain > 0 && (
                    <div className="gr-comment-best" style={{ color: '#10b981' }}>
                      Win chance gained: <strong>+{currentAnalysis.winChanceGain}%</strong>
                    </div>
                  )}
                  {currentAnalysis.bestMove && currentAnalysis.classification !== 'good' && currentAnalysis.classification !== 'brilliant' && (
                    <div className="gr-comment-best">
                      Best move was <strong>{currentAnalysis.bestMove}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* End-of-game summary */}
            {atEnd && plyIndex > 0 && (
              <div className="gr-summary">
                <h4 className="gr-summary-title">Game Summary</h4>
                <div className="gr-summary-stats">
                  {totalBrilliant > 0 && (
                    <div className="gr-summary-stat">
                      <span className="gr-stat-val" style={{ color: '#10b981' }}>✨ {totalBrilliant}</span>
                      <span className="gr-stat-lbl">Brilliant</span>
                    </div>
                  )}
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val">{accuracy}%</span>
                    <span className="gr-stat-lbl">Accuracy</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: '#ef4444' }}>{totalBlunders}</span>
                    <span className="gr-stat-lbl">Blunders</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: '#f59e0b' }}>{totalMistakes}</span>
                    <span className="gr-stat-lbl">Mistakes</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: '#eab308' }}>{totalInaccuracies}</span>
                    <span className="gr-stat-lbl">Inaccuracies</span>
                  </div>
                </div>

                {gameThemes.length > 0 && (
                  <div className="gr-summary-focus">
                    <div className="gr-focus-title">Tactics to focus on:</div>
                    {gameThemes.map((t, i) => (
                      <div key={i} className="gr-focus-item">• {t.description}</div>
                    ))}
                  </div>
                )}

                <div className="gr-summary-nav">
                  {gameNumber > 1 && (
                    <button className="gr-nav-btn" onClick={onPrev}>← Previous Game</button>
                  )}
                  {gameNumber < totalGames && (
                    <button className="gr-nav-btn gr-nav-next" onClick={onNext}>Next Game →</button>
                  )}
                  <button className="gr-nav-btn gr-nav-back" onClick={onClose}>Back to Overview</button>
                </div>
              </div>
            )}
          </div>
          </>)}

          {/* ── COACH TAB ── (disabled for performance — re-enable when AI commentary is re-added) */}
        </div>
      </div>
    </div>
  );
}
