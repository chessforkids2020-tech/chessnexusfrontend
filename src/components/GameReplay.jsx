import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import stockfishService from '../services/stockfishService';
import {
  buildTreeFromPgn, loadTreeInto, saveTree, getMainlinePath,
  nodeAtPath, addMove, deleteNode, isMainlinePath,
} from './gameTree';

const ENGINE_LABEL = 'Stockfish 17.1';
const ENGINE_DEPTH = 18;
const ENGINE_LINES = 3;

// Convert an engine line (score relative to side-to-move) to a White-perspective
// display string, e.g. "+1.2", "-0.4", "M3", "-M2".
function formatEval(line, sideToMove) {
  const sign = sideToMove === 'w' ? 1 : -1; // flip to White's perspective
  if (line.scoreType === 'mate') {
    const m = line.score * sign;
    return (m > 0 ? '+' : '') + 'M' + Math.abs(m);
  }
  const cp = (line.score * sign) / 100;
  return (cp > 0 ? '+' : '') + cp.toFixed(2);
}

// Convert a UCI principal variation into a readable SAN string with move numbers,
// starting from `fen`. Caps the length so the line stays short.
function pvToSan(fen, pv, maxPlies = 8) {
  try {
    const c = new Chess(fen);
    const out = [];
    for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
      const uci = pv[i];
      // moveNumber() is the full-move number of the position BEFORE the move.
      const moveNo = c.moveNumber();
      const whiteToMove = c.turn() === 'w';
      const mv = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      if (!mv) break;
      if (whiteToMove) out.push(`${moveNo}.${mv.san}`);
      else if (out.length === 0) out.push(`${moveNo}...${mv.san}`);
      else out.push(mv.san);
    }
    return out.join(' ');
  } catch {
    return pv.slice(0, maxPlies).join(' ');
  }
}

// Ply (full-move number, whose turn) for a node given its FEN.
function fenMeta(fen) {
  const parts = (fen || '').split(' ');
  return { moveNo: parseInt(parts[5] || '1', 10), whiteToMove: (parts[1] || 'w') === 'w' };
}

// Recursive move-tree renderer (Lichess/ChessBase style). Renders the mainline
// inline; each variation (children[1..]) is shown nested in ( … ). The current
// node is highlighted; clicking any move jumps to it.
//   root, path: from GameReplay state
//   moveAnalysis, turningPointPly: mainline annotations (variations have none)
//   onGoTo(path): navigate to a node
function MoveTree({ root, path, moveAnalysis, turningPointPly, onGoTo }) {
  const curId = path[path.length - 1] || 'root';

  // Render a chain starting at `node` along children[0], emitting any sibling
  // variations after each move. `nodePath` = path to `node` (excluding root).
  // `mainline` = whether this chain is the game mainline (for annotations).
  const renderChain = (node, nodePath, mainline) => {
    const out = [];
    let cur = node;
    let curPath = nodePath;
    let ply = nodePath.length; // mainline ply index of `cur`
    while (cur.children.length > 0) {
      const child = cur.children[0];
      const childPath = [...curPath, child.id];
      const childPly = ply + 1;
      const { moveNo, whiteToMove } = fenMeta(cur.fen);
      const ann = mainline ? moveAnalysis[childPly - 1] : null;
      const cls = ann?.classification || '';
      const isTurning = mainline && turningPointPly != null && childPly === turningPointPly;
      const numText = whiteToMove ? `${moveNo}.` : (out.length === 0 ? `${moveNo}…` : '');
      out.push(
        <span
          key={child.id}
          className={`gr-move-chip ${cls}${child.id === curId ? ' current' : ''}${isTurning ? ' turning-point' : ''}`}
          onClick={() => onGoTo(childPath)}
        >
          {numText}{child.san}{isTurning && <span className="gr-tp-marker">⚡</span>}
        </span>
      );
      // Variations branching from `cur` (siblings of child beyond index 0).
      for (let i = 1; i < cur.children.length; i++) {
        const v = cur.children[i];
        out.push(
          <span key={`var-${v.id}`} className="gr-var">
            <span className="gr-var-paren"> (</span>
            {renderVariation(v, [...curPath, v.id])}
            <span className="gr-var-paren">) </span>
          </span>
        );
      }
      cur = child;
      curPath = childPath;
      ply = childPly;
    }
    return out;
  };

  // A variation chain (never mainline) starting at its first node `v`.
  const renderVariation = (v, vPath) => {
    const out = [];
    let cur = v;
    let curPath = vPath;
    let first = true;
    // First, render `v` itself.
    const emit = (node, nodePath, isFirst) => {
      const parentFen = nodeFenBefore(root, nodePath);
      const { moveNo, whiteToMove } = fenMeta(parentFen);
      const numText = whiteToMove ? `${moveNo}.` : (isFirst ? `${moveNo}…` : '');
      out.push(
        <span
          key={node.id}
          className={`gr-var-move${node.id === curId ? ' current' : ''}`}
          onClick={() => onGoTo(nodePath)}
        >
          {numText}{node.san}
        </span>
      );
    };
    emit(cur, curPath, true);
    // Then follow its mainline + nested variations.
    while (cur.children.length > 0) {
      const child = cur.children[0];
      const childPath = [...curPath, child.id];
      emit(child, childPath, false);
      for (let i = 1; i < cur.children.length; i++) {
        const sub = cur.children[i];
        out.push(
          <span key={`subvar-${sub.id}`} className="gr-var">
            <span className="gr-var-paren"> (</span>
            {renderVariation(sub, [...curPath, sub.id])}
            <span className="gr-var-paren">) </span>
          </span>
        );
      }
      cur = child;
      curPath = childPath;
      first = false;
    }
    void first;
    return out;
  };

  return <>{renderChain(root, [], true)}</>;
}

// FEN of the position BEFORE the node at `nodePath` (i.e. its parent's fen).
function nodeFenBefore(root, nodePath) {
  let cur = root;
  for (let i = 0; i < nodePath.length - 1; i++) {
    const next = cur.children.find(c => c.id === nodePath[i]);
    if (!next) break;
    cur = next;
  }
  return cur.fen;
}

// Live Stockfish panel — shows the top-3 lines for the current position with
// White-perspective evals and the best continuation for each line.
function EnginePanel({ fen, numLines = ENGINE_LINES }) {
  const [lines, setLines] = useState([]);
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState('init'); // init | thinking | done | error
  const reqIdRef = useRef(0);

  const sideToMove = (fen || '').split(' ')[1] === 'b' ? 'b' : 'w';

  useEffect(() => {
    let cancelled = false;
    const myReq = ++reqIdRef.current;

    async function run() {
      try {
        if (!stockfishService.isReady()) {
          setStatus('init');
          await stockfishService.init();
        }
        if (cancelled || myReq !== reqIdRef.current) return;
        setLines([]);
        setDepth(0);
        setStatus('thinking');
        await stockfishService.analyzePosition(fen, {
          depth: ENGINE_DEPTH,
          multipv: numLines,
          onUpdate: ({ depth: d, lines: ls }) => {
            if (cancelled || myReq !== reqIdRef.current) return;
            setDepth(d);
            setLines(ls);
          },
        });
        if (cancelled || myReq !== reqIdRef.current) return;
        setStatus('done');
      } catch {
        if (!cancelled && myReq === reqIdRef.current) setStatus('error');
      }
    }
    run();

    return () => {
      cancelled = true;
      stockfishService.stop();
    };
  }, [fen, numLines]);

  return (
    <div className="gr-engine">
      <div className="gr-engine-head">
        <span className="gr-engine-name">🐟 {ENGINE_LABEL}</span>
        <span className="gr-engine-depth">
          {status === 'error' ? 'unavailable'
            : status === 'init' ? 'loading…'
            : `depth ${depth}/${ENGINE_DEPTH}`}
        </span>
      </div>
      {status === 'error' ? (
        <div className="gr-engine-empty">Engine could not start in this browser.</div>
      ) : lines.length === 0 ? (
        <div className="gr-engine-empty">Analysing…</div>
      ) : (
        <table className="gr-engine-table">
          <thead>
            <tr>
              <th className="gr-engine-th-eval">Eval</th>
              <th className="gr-engine-th-line">Best line</th>
            </tr>
          </thead>
          <tbody>
            {lines.slice(0, numLines).map((ln) => {
              const ev = formatEval(ln, sideToMove);
              const positive = !ev.startsWith('-');
              return (
                <tr key={ln.k} className="gr-engine-tr">
                  <td className={`gr-engine-eval ${positive ? 'pos' : 'neg'}`}>{ev}</td>
                  <td className="gr-engine-pv">{pvToSan(fen, ln.pv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLASS_META = {
  brilliant:   { icon: '✨', color: '#10b981', label: 'Brilliant!' },
  blunder:     { icon: '⁉️', color: '#ef4444', label: 'Blunder' },
  mistake:     { icon: '?!', color: '#f59e0b', label: 'Mistake' },
  inaccuracy:  { icon: '?!', color: '#eab308', label: 'Inaccuracy' },
  good:        { icon: '',   color: '#10b981', label: '' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameReplay({ game, totalGames, onClose, onNext, onPrev, quick = false }) {
  const { pgn, playerSide, moveAnalysis = [], accuracy, totalBlunders, gameThemes = [], opening, result, gameNumber, coachAnalysis, turningPoint } = game;

  // Resolve the turning point ply index for the player's side
  const turningPointPly = useMemo(() => {
    if (!turningPoint) return null;
    const tp = turningPoint[playerSide];
    if (!tp || tp.plyIndex == null) return null;
    return tp.plyIndex;
  }, [turningPoint, playerSide]);

  const [playing, setPlaying]   = useState(false);
  const activeTab = 'moves'; // single view (Stockfish + moves); tabs removed
  const timerRef = useRef(null);
  const commentRef = useRef(null);

  // ── Variation tree (persistent, per-game in localStorage; never the DB) ──
  // The game's mainline is the children[0] chain; user variations are extra
  // children, nested to any depth. `path` = ids from root to the current node.
  const [tree, setTree] = useState(() => loadTreeInto(pgn, buildTreeFromPgn(pgn)));
  const [path, setPath] = useState([]); // [] = starting position

  // Rebuild the tree when the game changes.
  useEffect(() => {
    const t = loadTreeInto(pgn, buildTreeFromPgn(pgn));
    setTree(t);
    setPath([]);
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [pgn]);

  const mainlinePath = useMemo(() => getMainlinePath(tree), [tree]);
  const curNode  = useMemo(() => nodeAtPath(tree, path), [tree, path]);
  const onMainline = useMemo(() => isMainlinePath(tree, path), [tree, path]);
  const exploring = path.length > 0 && !onMainline;

  // Step one move forward on the CURRENT line (follows children[0] of curNode,
  // i.e. stays on whatever variation/mainline you're in).
  const goForwardOne = useCallback(() => {
    const n = nodeAtPath(tree, path);
    if (n.children.length > 0) setPath(p => [...p, n.children[0].id]);
  }, [tree, path]);
  const goBackOne = useCallback(() => setPath(p => p.slice(0, -1)), []);
  const goToStart = useCallback(() => setPath([]), []);
  const goToEndOfLine = useCallback(() => {
    let n = nodeAtPath(tree, path);
    const extra = [];
    while (n.children.length > 0) { n = n.children[0]; extra.push(n.id); }
    if (extra.length) setPath(p => [...p, ...extra]);
  }, [tree, path]);
  // Jump to an arbitrary node by its full path (clicking a move in the list).
  const goToPath = useCallback((p) => setPath(p), []);

  // Resizable board — user drags the corner handle. Persisted across games.
  const BOARD_MIN = 300;
  const BOARD_MAX = 640;
  const [boardSize, setBoardSize] = useState(() => {
    const saved = parseInt(localStorage.getItem('gaBoardSize') || '', 10);
    return Number.isFinite(saved) ? Math.min(BOARD_MAX, Math.max(BOARD_MIN, saved)) : 380;
  });
  const resizeRef = useRef(null); // { startX, startSize }

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    resizeRef.current = { startX, startSize: boardSize };

    const onMove = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const delta = x - resizeRef.current.startX;
      const next = Math.min(BOARD_MAX, Math.max(BOARD_MIN, Math.round(resizeRef.current.startSize + delta)));
      setBoardSize(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      try { localStorage.setItem('gaBoardSize', String(boardSizeRef.current)); } catch { /* ignore */ }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [boardSize]);

  // Keep a ref of the latest size so the resize-end handler persists the final value.
  const boardSizeRef = useRef(boardSize);
  useEffect(() => { boardSizeRef.current = boardSize; }, [boardSize]);

  // Auto-play — steps forward along the current line.
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        const n = nodeAtPath(tree, path);
        if (n.children.length === 0) { setPlaying(false); return; }
        setPath(p => [...p, n.children[0].id]);
      }, 1800);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, tree, path]);

  // Scroll commentary into view
  useEffect(() => {
    if (commentRef.current) {
      commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [path]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goForwardOne(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); goBackOne(); }
      else if (e.key === ' ')          { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'Escape')     { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goForwardOne, goBackOne, onClose]);

  // Control-bar aliases (kept names from the old API).
  const goFirst = goToStart;
  const goPrev  = goBackOne;
  const goNext  = goForwardOne;
  const goLast  = goToEndOfLine;

  // Current board position from the tree path.
  const currentFen  = curNode.fen || 'start';
  const currentMove = curNode.from ? { from: curNode.from, to: curNode.to } : null;

  // Drag-to-study: play any legal move from the current board. Adds it to the
  // tree at the current path (re-using an existing branch if you've tried that
  // move before), persists, and steps into it.
  const handleStudyMove = useCallback((from, to, promotion) => {
    try {
      const c = new Chess(currentFen);
      const mv = c.move({ from, to, promotion: promotion || 'q' });
      if (!mv) return false;
      setPlaying(false);
      const { path: newPath } = addMove(tree, path, {
        san: mv.san, fen: c.fen(), from: mv.from, to: mv.to,
      });
      setPath(newPath);
      setTree({ ...tree }); // new ref so memos recompute (tree mutated in place)
      saveTree(pgn, tree);
      return true;
    } catch {
      return false;
    }
  }, [currentFen, tree, path, pgn]);

  // Delete the variation that the current node belongs to (the node + subtree).
  const deleteCurrentVariation = useCallback(() => {
    if (path.length === 0 || onMainline) return;
    // Walk up to the first node that is NOT on the mainline (the branch root).
    let cut = path.length;
    while (cut > 0 && !isMainlinePath(tree, path.slice(0, cut))) cut -= 1;
    const branchPath = path.slice(0, cut + 1); // include first off-mainline node
    const parentP = deleteNode(tree, branchPath);
    setPath(parentP);
    setTree({ ...tree }); // new ref so memos recompute
    saveTree(pgn, tree);
  }, [tree, path, onMainline, pgn]);

  // Detailed move analysis only applies on the GAME mainline. The mainline ply
  // equals path length when we're on the mainline; in a variation there's none.
  const mainlinePly = onMainline ? path.length : 0;
  const currentAnalysis = (onMainline && mainlinePly > 0) ? moveAnalysis[mainlinePly - 1] : null;
  const meta = currentAnalysis ? CLASS_META[currentAnalysis.classification] || CLASS_META.good : null;

  // Move arrows: green bestMove for blunders/mistakes, gold for brilliant.
  const arrows = useMemo(() => {
    if (!currentAnalysis || !onMainline) return [];
    if (currentAnalysis.classification === 'brilliant') {
      if (curNode.from && curNode.to) return [{ from: curNode.from, to: curNode.to, color: '#10b981' }];
      return [];
    }
    if (!currentAnalysis.bestMove || currentAnalysis.classification === 'good' || currentAnalysis.classification === 'inaccuracy') return [];
    const prevFen = nodeAtPath(tree, path.slice(0, -1))?.fen;
    if (!prevFen) return [];
    try {
      const c = new Chess(prevFen);
      const m = c.move(currentAnalysis.bestMove);
      if (m) return [{ from: m.from, to: m.to, color: '#10b981' }];
    } catch {}
    return [];
  }, [currentAnalysis, onMainline, curNode, tree, path]);

  // Win chance bar (white's perspective)
  const whiteWinPct = useMemo(() => {
    if (!currentAnalysis) return 50;
    const val = currentAnalysis.winChanceAfter;
    return currentAnalysis.side === 'white' ? val : 100 - val;
  }, [currentAnalysis]);

  const atEnd = curNode.children.length === 0;

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
          <div className="gr-board-wrap">
            <Chessboard
              position={currentFen}
              orientation={playerSide || 'white'}
              draggable={true}
              onDrop={(from, to, promotion) => handleStudyMove(from, to, promotion)}
              lastMove={currentMove}
              arrows={exploring ? [] : arrows}
              boardWidth={boardSize}
              coordinateSides={['left', 'bottom']}
            />
            {/* Drag this corner to resize the board. The Chessboard centres an
                8×8 grid inside a container padded by the coordinate gutter, so we
                inset the handle by that gutter to land on the h1 square. */}
            <div
              className="gr-resize-handle"
              onMouseDown={onResizeStart}
              onTouchStart={onResizeStart}
              title="Drag to resize the board"
              style={{
                right: (boardSize < 400 ? 20 : 32) + 3,
                bottom: (boardSize < 400 ? 20 : 32) + 3,
              }}
            />
          </div>

          {exploring ? (
            <div className="gr-study-banner">
              <span>🔬 In your variation — saved on this device</span>
              <button className="gr-study-return" onClick={deleteCurrentVariation}>🗑 Delete line</button>
            </div>
          ) : (
            <div className="gr-study-hint">💡 Drag a piece to try your own moves · they're saved here · drag ⤡ to resize</div>
          )}

          {/* Win Chance Bar */}
          <div className="gr-winbar-wrap" style={{ maxWidth: boardSize }}>
            <div className="gr-winbar">
              <div className="gr-winbar-white" style={{ width: `${whiteWinPct}%` }} />
            </div>
            <div className="gr-winbar-labels">
              <span>White {whiteWinPct}%</span>
              <span>Black {100 - whiteWinPct}%</span>
            </div>
          </div>

          {/* Controls — walk the current line (mainline or the variation you're in) */}
          <div className="gr-controls">
            <button className="gr-ctrl-btn" onClick={goFirst} disabled={path.length <= 0}>⏮</button>
            <button className="gr-ctrl-btn" onClick={goPrev} disabled={path.length <= 0}>◀</button>
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
          {/* ── MOVES TAB ── */}
          {activeTab === 'moves' && (<>
          {/* Live Stockfish engine lines for the current position */}
          <EnginePanel fen={currentFen} numLines={quick ? 4 : 3} />

          {/* Move list — full variation tree. Mainline inline; user variations
              shown nested in ( … ), persisted on this device. */}
          <div className="gr-move-list">
            <div className="gr-move-list-inner">
              <MoveTree
                root={tree}
                path={path}
                moveAnalysis={moveAnalysis}
                turningPointPly={turningPointPly}
                onGoTo={goToPath}
              />
            </div>
          </div>

          {/* Commentary */}
          <div className="gr-commentary">
            {path.length === 0 && (
              <div className="gr-comment-bubble gr-comment-info">
                <div className="gr-comment-text">
                  Starting position. Press ▶ or → to step through moves.
                </div>
              </div>
            )}

            {path.length > 0 && currentAnalysis && (
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

            {/* End-of-game summary (only at the end of the real mainline) */}
            {onMainline && path.length > 0 && path.length === mainlinePath.length && (
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
