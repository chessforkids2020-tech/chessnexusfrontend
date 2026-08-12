import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import stockfishService from '../services/stockfishService';

// ─── helpers ───────────────────────────────────────────────────────────────

/** Convert centipawns to an 0-100 "white advantage" percentage for the eval bar */
function cpToPercent(cp) {
  // sigmoid: 50 + 50 * tanh(cp / 400)
  return 50 + 50 * Math.tanh(cp / 400);
}

/** Parse solution array or string into a clean array of move tokens */
function parseSolution(solution) {
  if (Array.isArray(solution)) return solution.filter(Boolean);
  if (typeof solution === 'string')
    return solution.split(/[, ]+/).filter(Boolean);
  return [];
}

/** Determine orientation from FEN (side to move gets the bottom) */
function fenOrientation(fen) {
  try {
    const parts = fen.split(' ');
    return parts[1] === 'b' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}

/** Apply N moves from a solution onto a Chess object starting at puzzleFen */
function applyMoves(puzzleFen, moves, count) {
  const game = new Chess(puzzleFen);
  for (let i = 0; i < count && i < moves.length; i++) {
    try {
      game.move(moves[i]);
    } catch {
      // try UCI
      if (moves[i] && moves[i].length >= 4) {
        try {
          game.move({
            from: moves[i].slice(0, 2),
            to: moves[i].slice(2, 4),
            promotion: moves[i][4] || 'q',
          });
        } catch {}
      }
    }
  }
  return game;
}

/** Format a score (centipawns or mate) for display */
function formatScore(line, forWhite) {
  if (!line) return '?';
  const { type, score } = line;
  if (type === 'mate') {
    const m = forWhite ? score : -score;
    return m > 0 ? `#${m}` : `-#${Math.abs(m)}`;
  }
  const cp = forWhite ? score : -score;
  return cp >= 0 ? `+${(cp / 100).toFixed(2)}` : (cp / 100).toFixed(2);
}

// ─── EvalBar ───────────────────────────────────────────────────────────────

function EvalBar({ cp, isMate, mateIn, forWhite, height = 300 }) {
  let whitePct;
  if (isMate) {
    whitePct = forWhite ? (mateIn > 0 ? 95 : 5) : (mateIn > 0 ? 5 : 95);
  } else {
    whitePct = cpToPercent(forWhite ? cp : -cp);
  }
  whitePct = Math.max(5, Math.min(95, whitePct));
  const blackPct = 100 - whitePct;

  return (
    <div style={{
      width: 20,
      height,
      borderRadius: 4,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--color-white-a20)',
      flexShrink: 0,
    }}>
      {/* black side on top */}
      <div style={{ flex: blackPct, background: '#1a1a2e', transition: 'flex 0.4s ease' }} />
      {/* white side on bottom */}
      <div style={{ flex: whitePct, background: '#f0f0f0', transition: 'flex 0.4s ease' }} />
    </div>
  );
}

// ─── MiniPuzzleCard ────────────────────────────────────────────────────────

function MiniPuzzleCard({ puzzle, index, onClick }) {
  const orientation = fenOrientation(puzzle.fen || 'start');

  const resultColor = puzzle.isSolved
    ? puzzle.isCorrect
      ? 'var(--color-success)'
      : 'var(--color-danger)'
    : 'var(--color-text-faint)';
  const resultLabel = puzzle.isSolved
    ? puzzle.isCorrect
      ? '✓ Correct'
      : '✗ Wrong'
    : 'Not done';

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: 'var(--color-white-a07)',
        border: `2px solid ${resultColor}40`,
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'transform 0.18s, box-shadow 0.18s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.04)';
        e.currentTarget.style.boxShadow = `0 0 18px ${resultColor}55`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      title="Click to study this puzzle"
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
        PUZZLE #{index + 1}
      </div>

      {/* mini board wrapper — pointer events disabled so the card click fires */}
      <div style={{ pointerEvents: 'none', borderRadius: 6, overflow: 'hidden' }}>
        <Chessboard
          position={puzzle.fen || 'start'}
          boardWidth={130}
          orientation={orientation}
          draggable={false} resizable={false}
          showCoordinates={false}
          mute
        />
      </div>

      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: resultColor,
        background: `${resultColor}20`,
        padding: '2px 8px',
        borderRadius: 20,
      }}>
        {resultLabel}
      </div>

      {puzzle.rating && (
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Rating {puzzle.rating}</div>
      )}

      <div style={{ fontSize: 10, color: 'var(--color-accent-2)', marginTop: -2 }}>
        🔍 Tap to study
      </div>
    </div>
  );
}

// ─── PuzzleAnalysisModal ───────────────────────────────────────────────────

function PuzzleAnalysisModal({ puzzle, index, onClose }) {
  const puzzleFen = puzzle.fen || 'start';
  const solution = parseSolution(puzzle.solution);
  const startOrientation = fenOrientation(puzzleFen);

  // board state
  const [fen, setFen] = useState(puzzleFen);
  const [orientation, setOrientation] = useState(startOrientation);
  const [moveIdx, setMoveIdx] = useState(-1);
  const [arrows, setArrows] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const chessRef = useRef(new Chess(puzzleFen));

  // analysis state
  const [analysisLines, setAnalysisLines] = useState([]);
  const [evalInfo, setEvalInfo] = useState(null);
  const [analysisDepth, setAnalysisDepth] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeEnabled, setAnalyzeEnabled] = useState(false);
  const [targetDepth, setTargetDepth] = useState(18);

  // board size — capped conservatively so nav buttons always fit
  const [boardSize, setBoardSize] = useState(380);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // On mobile, board fills most of width; on desktop cap at 380px so there's always room below
      if (vw <= 480) setBoardSize(Math.min(vw - 48, 300));
      else if (vw <= 768) setBoardSize(Math.min(vw - 320, 340));
      else setBoardSize(Math.min(380, Math.floor(vh * 0.45)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── navigation ──────────────────────────────────────────────────────────

  const goTo = useCallback((idx) => {
    const targetIdx = Math.max(-1, Math.min(idx, solution.length - 1));
    const count = targetIdx + 1;
    const game = applyMoves(puzzleFen, solution, count);
    chessRef.current = game;
    setFen(game.fen());
    setMoveIdx(targetIdx);
    setArrows([]);
    setAnalysisLines([]);
    setEvalInfo(null);
    setAnalysisDepth(0);

    if (targetIdx >= 0 && solution[targetIdx]) {
      const prevGame = applyMoves(puzzleFen, solution, count - 1);
      try {
        const m = prevGame.move(solution[targetIdx]);
        if (m) setLastMove({ from: m.from, to: m.to });
      } catch {
        const mv = solution[targetIdx];
        if (mv && mv.length >= 4) setLastMove({ from: mv.slice(0, 2), to: mv.slice(2, 4) });
      }
    } else {
      setLastMove(null);
    }
  }, [puzzleFen, solution]);

  useEffect(() => { goTo(-1); }, []);

  useEffect(() => {
    if (analyzeEnabled) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, analyzeEnabled, targetDepth]);

  // ── Stockfish ───────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisDepth(0);
    setAnalysisLines([]);
    try {
      if (!stockfishService.isReady()) await stockfishService.init();
      const result = await stockfishService.getBestMove(fen, {
        depth: targetDepth,
        moveTime: 2000,
        multipv: 3,
      });
      const lines = Object.values(result.lines || {}).sort((a, b) => a.k - b.k);
      const newArrows = [];
      lines.forEach((line, i) => {
        if (line.move && line.move.length >= 4) {
          newArrows.push({
            from: line.move.slice(0, 2),
            to: line.move.slice(2, 4),
            color: i === 0 ? 'var(--color-success)' : i === 1 ? 'var(--color-warning)' : 'var(--color-text-muted)',
          });
        }
      });
      setArrows(newArrows);
      setAnalysisLines(lines);
      if (result.evaluation) setEvalInfo(result.evaluation);
      if (lines[0]) setAnalysisDepth(lines[0].depth || targetDepth);
    } catch (err) {
      // silent
    } finally {
      setAnalyzing(false);
    }
  }, [fen, targetDepth]);

  // ── free-play ───────────────────────────────────────────────────────────

  const onDrop = useCallback((from, to) => {
    const game = new Chess(fen);
    try {
      const m = game.move({ from, to, promotion: 'q' });
      if (m) {
        chessRef.current = game;
        setFen(game.fen());
        setMoveIdx(-999);
        setArrows([]);
        setLastMove({ from: m.from, to: m.to });
        setAnalysisLines([]);
        setEvalInfo(null);
        setAnalysisDepth(0);
        return true;
      }
    } catch {}
    return false;
  }, [fen]);

  // ── eval helpers ────────────────────────────────────────────────────────

  const evalCp = evalInfo?.type === 'centipawns' ? evalInfo.value : 0;
  const isMate = evalInfo?.type === 'mate';
  const mateIn = isMate ? evalInfo.value : 0;
  const currentChess = new Chess(fen);
  const sideToMove = currentChess.turn() === 'w' ? 'White' : 'Black';

  const evalLabel = (() => {
    if (!evalInfo) return '—';
    const forWhite = currentChess.turn() === 'w';
    if (isMate) return formatScore({ type: 'mate', score: mateIn }, forWhite);
    return formatScore({ type: 'cp', score: evalCp }, forWhite);
  })();

  // ── render ──────────────────────────────────────────────────────────────
  // KEY FIX: backdrop scrolls; modal is natural height (no overflow:hidden clipping)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-black-a65)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        overflowY: 'auto',           /* backdrop scrolls — nothing gets clipped */
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface) 100%)',
        borderRadius: 20,
        border: '1px solid var(--color-white-a10)',
        boxShadow: '0 40px 80px var(--color-black-a65)',
        width: '100%',
        maxWidth: 900,
        margin: 'auto',             /* centers vertically when shorter than viewport */
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        /* NO overflow:hidden — let content breathe */
      }}>

        {/* ── Left column: board + controls ── */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '18px 16px 20px',
        }}>

          {/* title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: 16 }}>
              Puzzle #{index + 1} — Review
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
                title="Flip board"
                style={{
                  background: 'var(--color-white-a07)', border: '1px solid var(--color-white-a13)',
                  borderRadius: 8, color: 'var(--color-text-muted)', padding: '5px 12px', cursor: 'pointer', fontSize: 15,
                }}
              >⇅ Flip</button>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--color-danger-a20)', border: '1px solid var(--color-danger-a30)',
                  borderRadius: 8, color: 'var(--color-danger)', padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                }}
              >✕ Close</button>
            </div>
          </div>

          {/* eval bar + board */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EvalBar cp={evalCp} isMate={isMate} mateIn={mateIn} forWhite={currentChess.turn() === 'w'} height={boardSize} />
            <div style={{ borderRadius: 6, overflow: 'hidden', boxShadow: '0 8px 30px var(--color-black-a50)' }}>
              <Chessboard
                position={fen}
                onDrop={onDrop}
                boardWidth={boardSize}
                orientation={orientation}
                draggable={true}
                arrows={arrows}
                lastMove={lastMove}
                mute={false}
              />
            </div>
          </div>

          {/* side to move + analysing indicator */}
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{sideToMove} to move</span>
            {analyzing && (
              <span style={{ color: 'var(--color-accent-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-2)', display: 'inline-block', animation: 'pulseDot 1s infinite' }} />
                Analysing depth {targetDepth}…
              </span>
            )}
            {evalInfo && !analyzing && (
              <span style={{
                background: 'var(--color-white-a07)',
                border: '1px solid var(--color-white-a13)',
                borderRadius: 20,
                padding: '2px 10px',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: 13,
              }}>
                {evalLabel} {analysisDepth > 0 && <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>d{analysisDepth}</span>}
              </span>
            )}
          </div>

          {/* ── nav buttons — ALWAYS VISIBLE ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-white-a04)',
            borderRadius: 12,
            padding: '8px 12px',
            width: '100%',
            justifyContent: 'center',
          }}>
            <NavBtn onClick={() => goTo(-1)} disabled={moveIdx <= -1} title="Go to start">⏮</NavBtn>
            <NavBtn onClick={() => goTo(moveIdx - 1)} disabled={moveIdx < 0} title="Previous">◀</NavBtn>
            <div style={{
              background: 'var(--color-white-a07)',
              borderRadius: 8, padding: '4px 14px',
              color: 'var(--color-text-muted)', fontSize: 12, minWidth: 100, textAlign: 'center',
            }}>
              {moveIdx === -999 ? 'Free play'
                : moveIdx < 0 ? 'Start position'
                : `Move ${moveIdx + 1} / ${solution.length}`}
            </div>
            <NavBtn onClick={() => goTo(moveIdx + 1)} disabled={moveIdx >= solution.length - 1} title="Next">▶</NavBtn>
            <NavBtn onClick={() => goTo(solution.length - 1)} disabled={moveIdx >= solution.length - 1} title="Go to end">⏭</NavBtn>
          </div>

          {/* reset */}
          <button
            onClick={() => goTo(-1)}
            style={{
              background: 'var(--color-accent-2-a15)', border: '1px solid var(--color-accent-2-a30)',
              borderRadius: 8, color: '#93c5fd', padding: '7px 20px',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%',
            }}
          >↩ Reset to starting position</button>
        </div>

        {/* ── Right column: analysis ── */}
        <div style={{
          flex: '0 0 270px',
          minWidth: 240,
          borderLeft: '1px solid var(--color-white-a07)',
          padding: '18px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>

          {/* puzzle result */}
          <div style={{
            background: puzzle.isCorrect ? 'var(--color-success-a12)' : 'var(--color-danger-a12)',
            border: `1px solid ${puzzle.isCorrect ? 'var(--color-success-a30)' : 'var(--color-danger-a30)'}`,
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ color: 'var(--color-text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Puzzle Info
            </div>
            <div style={{ color: 'var(--color-text)', fontSize: 13 }}>
              Rating: <strong style={{ color: 'var(--color-warning)' }}>{puzzle.rating || '—'}</strong>
            </div>
            <div style={{ color: puzzle.isCorrect ? 'var(--color-success)' : 'var(--color-danger)', fontSize: 13, fontWeight: 700, marginTop: 3 }}>
              {puzzle.isCorrect ? '✓ Solved correctly!' : '✗ Got this wrong'}
            </div>
            {puzzle.pointsEarned !== undefined && (
              <div style={{ fontSize: 12, color: puzzle.pointsEarned >= 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: 2 }}>
                {puzzle.pointsEarned >= 0 ? `+${puzzle.pointsEarned}` : puzzle.pointsEarned} pts
              </div>
            )}
          </div>

          {/* solution moves */}
          <div style={{ background: 'var(--color-white-a04)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ color: 'var(--color-text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Solution
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {solution.length === 0 && <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>No solution recorded</span>}
              {solution.map((move, i) => (
                <button key={i} onClick={() => goTo(i)} style={{
                  background: moveIdx === i ? 'rgba(59,130,246,0.4)' : 'var(--color-white-a07)',
                  border: moveIdx === i ? '1px solid var(--color-accent-2)' : '1px solid var(--color-white-a13)',
                  borderRadius: 6, color: moveIdx === i ? '#bfdbfe' : 'var(--color-text-muted)',
                  padding: '3px 8px', cursor: 'pointer', fontSize: 12,
                  fontWeight: moveIdx === i ? 700 : 400, fontFamily: 'monospace',
                }}>
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{move}
                </button>
              ))}
            </div>
          </div>

          {/* ── STOCKFISH ANALYSE BUTTON — prominent, always visible ── */}
          <div style={{ background: 'var(--color-white-a04)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ color: 'var(--color-text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Stockfish Analysis
            </div>

            {/* depth */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Depth</span>
                <span style={{ color: 'var(--color-accent-2)', fontSize: 12, fontWeight: 700 }}>{targetDepth}</span>
              </div>
              <input
                type="range" min={8} max={25} value={targetDepth}
                onChange={e => setTargetDepth(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-accent-2)' }}
              />
            </div>

            {/* BIG analyse button */}
            <button
              onClick={() => {
                const next = !analyzeEnabled;
                setAnalyzeEnabled(next);
                if (next) runAnalysis();
              }}
              style={{
                width: '100%',
                padding: '12px 8px',
                background: analyzeEnabled
                  ? 'linear-gradient(135deg, var(--color-danger-a30), var(--color-danger-a12))'
                  : 'linear-gradient(135deg, rgba(34,197,94,0.35), rgba(34,197,94,0.15))',
                border: `2px solid ${analyzeEnabled ? 'var(--color-danger)' : 'var(--color-success)'}`,
                borderRadius: 10,
                color: analyzeEnabled ? 'var(--color-danger)' : '#86efac',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
            >
              {analyzing ? '⏳ Analysing…' : analyzeEnabled ? '⏹ Stop Analysis' : '▶ Analyse with Stockfish'}
            </button>
          </div>

          {/* evaluation + best lines (shown after analysis) */}
          {(evalInfo || analysisLines.length > 0) && (
            <div style={{ background: 'var(--color-white-a04)', borderRadius: 12, padding: '10px 14px' }}>
              {evalInfo && (
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{evalLabel}</div>
                  {analysisDepth > 0 && <div style={{ color: 'var(--color-text-faint)', fontSize: 11, marginTop: 2 }}>depth {analysisDepth}</div>}
                </div>
              )}
              {analysisLines.length > 0 && (
                <>
                  <div style={{ color: 'var(--color-text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Best Lines
                  </div>
                  {analysisLines.slice(0, 3).map((line, i) => {
                    const forWhite = currentChess.turn() === 'w';
                    const label = formatScore(line, forWhite);
                    const dotColors = ['var(--color-success)', 'var(--color-warning)', 'var(--color-text-muted)'];
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5,
                        padding: '4px 6px', borderRadius: 6,
                        background: i === 0 ? 'rgba(34,197,94,0.08)' : 'transparent',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColors[i], flexShrink: 0 }} />
                        <div style={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: 12, minWidth: 46 }}>{label}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {line.move}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* tips */}
          <div style={{
            background: 'var(--color-accent-2-a15)', borderRadius: 12, padding: '8px 14px',
            color: 'var(--color-text-faint)', fontSize: 11, lineHeight: 1.7,
          }}>
            <strong style={{ color: 'var(--color-text-faint)' }}>Tips</strong><br />
            • ▶ / ◀ steps through the solution<br />
            • Drag pieces to explore freely<br />
            • Green arrow = best move<br />
            • Yellow arrow = 2nd best
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ─── Small nav button helper ───────────────────────────────────────────────

function NavBtn({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled ? 'var(--color-white-a04)' : 'var(--color-white-a07)',
        border: '1px solid var(--color-white-a10)',
        borderRadius: 8,
        color: disabled ? '#334155' : 'var(--color-text-muted)',
        width: 32,
        height: 32,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── PuzzleReviewPanel (the exported panel) ────────────────────────────────

export default function PuzzleReviewPanel({ dailyBatch }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!dailyBatch || dailyBatch.length === 0) return null;

  return (
    <div style={{ width: '100%', marginTop: 24 }}>
      {/* section header */}
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-accent-2-a15)',
          border: '1px solid var(--color-accent-2-a15)',
          borderRadius: 24,
          padding: '6px 20px',
          color: '#93c5fd',
          fontSize: 13,
          fontWeight: 700,
        }}>
          🔍 Study Today's Puzzles
        </div>
        <div style={{ color: 'var(--color-text-faint)', fontSize: 11, marginTop: 6 }}>
          Tap any board to study the position with Stockfish analysis
        </div>
      </div>

      {/* mini board grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        padding: '0 4px',
      }}>
        {dailyBatch.map((puzzle, i) => (
          <MiniPuzzleCard
            key={puzzle._id || i}
            puzzle={puzzle}
            index={i}
            onClick={() => setOpenIndex(i)}
          />
        ))}
      </div>

      {/* analysis modal */}
      {openIndex !== null && (
        <PuzzleAnalysisModal
          puzzle={dailyBatch[openIndex]}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
