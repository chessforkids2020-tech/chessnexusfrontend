import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import stockfishService from '../services/stockfishService';
import {
  buildTreeFromPgn, loadTreeInto, saveTree, getMainlinePath,
  nodeAtPath, addMove, deleteNode, isMainlinePath,
  hasAnyVariations, clearAllVariations, treeStorageKey,
} from './gameTree';

const ENGINE_LABEL = 'Stockfish 18';
const ENGINE_DEPTH = 18;
// Depth for the per-square evaluations. Lower than ENGINE_DEPTH on purpose:
// this runs ONE SEARCH PER DESTINATION, so a queen with 20 moves is 20 searches.
// At 12 that is roughly two seconds for a rook and four for a queen, which still
// ranks squares correctly and catches a piece that simply hangs. Depth 18 here
// would be accurate but leave a queen thinking for the best part of a minute.
const SQUARE_EVAL_DEPTH = 12;
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
  // Never fall back to raw UCI — if a move can't be converted we stop and return
  // only the SAN converted so far. Raw UCI (e.g. "g1f3") in the UI is confusing,
  // especially when it's a move that has effectively already happened.
  const out = [];
  try {
    // 'start'/'startpos'/'' would make `new Chess()` throw — normalize to the
    // real starting FEN so the opening position converts correctly.
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const c = new Chess(!fen || fen === 'start' || fen === 'startpos' ? startFen : fen);
    for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
      const uci = pv[i];
      if (!uci || uci.length < 4) break;
      // moveNumber() is the full-move number of the position BEFORE the move.
      const moveNo = c.moveNumber();
      const whiteToMove = c.turn() === 'w';
      let mv = null;
      try {
        mv = c.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
      } catch { mv = null; }
      if (!mv) break; // illegal here — stop rather than print UCI
      if (whiteToMove) out.push(`${moveNo}.${mv.san}`);
      else if (out.length === 0) out.push(`${moveNo}...${mv.san}`);
      else out.push(mv.san);
    }
  } catch { /* return whatever SAN we managed */ }
  return out.join(' ');
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
// `enabled` lets the user switch the engine off (stops it thinking, hides lines).
// `onToggle` flips that state from the panel's header switch.
function EnginePanel({ fen, numLines = ENGINE_LINES, enabled = true, onToggle }) {
  // Keep the lines together with the EXACT fen they were computed for. The PV is
  // a list of UCI moves relative to that position; converting it to SAN against a
  // different (newer) fen makes the first move illegal — which previously caused
  // raw UCI like "g1f3" to leak into the display. Pairing them guarantees we only
  // ever render a PV against its own position.
  const [result, setResult] = useState({ fen: null, lines: [] });
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState('init'); // init | thinking | done | error
  const reqIdRef = useRef(0);

  // Only render lines that belong to the current fen (drop stale ones instantly).
  const lines = result.fen === fen ? result.lines : [];
  const sideToMove = (fen || '').split(' ')[1] === 'b' ? 'b' : 'w';

  useEffect(() => {
    let cancelled = false;
    const myReq = ++reqIdRef.current;

    // Engine switched off — make sure it isn't thinking and show nothing.
    if (!enabled) {
      stockfishService.stop();
      setResult({ fen: null, lines: [] });
      setDepth(0);
      setStatus('off');
      return () => { cancelled = true; };
    }

    async function run() {
      try {
        if (!stockfishService.isReady()) {
          setStatus('init');
          await stockfishService.init();
        }
        if (cancelled || myReq !== reqIdRef.current) return;
        // Small debounce so React 18 StrictMode's double-mount (and rapid move
        // stepping) collapses to a single analysis. Without this, the first run's
        // cleanup calls stockfishService.stop() — which, since the engine is a
        // shared singleton, also kills the second run, leaving it stuck on
        // "Analysing…" until the next position change.
        await new Promise((r) => setTimeout(r, 60));
        if (cancelled || myReq !== reqIdRef.current) return;
        setResult({ fen, lines: [] });
        setDepth(0);
        setStatus('thinking');
        await stockfishService.analyzePosition(fen, {
          depth: ENGINE_DEPTH,
          multipv: numLines,
          onUpdate: ({ depth: d, lines: ls }) => {
            if (cancelled || myReq !== reqIdRef.current) return;
            setDepth(d);
            setResult({ fen, lines: ls });
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
      // Only stop the engine if no newer request has superseded us. A stale
      // cleanup must NOT stop the engine that a newer run just started.
      if (myReq === reqIdRef.current) stockfishService.stop();
    };
  }, [fen, numLines, enabled]);

  return (
    <div className={`gr-engine${enabled ? '' : ' gr-engine-off'}`}>
      <div className="gr-engine-head">
        <span className="gr-engine-name">🐟 {ENGINE_LABEL}</span>
        <div className="gr-engine-head-right">
          {enabled && (
            <span className="gr-engine-depth">
              {status === 'error' ? 'unavailable'
                : status === 'init' ? 'loading…'
                : `depth ${depth}/${ENGINE_DEPTH}`}
            </span>
          )}
          {/* On/off switch — lets the user stop the live engine entirely. */}
          <button
            type="button"
            className={`gr-engine-toggle${enabled ? ' on' : ''}`}
            onClick={onToggle}
            title={enabled ? 'Turn the engine off' : 'Turn the engine on'}
            aria-pressed={enabled}
          >
            <span className="gr-engine-toggle-knob" />
            <span className="gr-engine-toggle-text">{enabled ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
      {!enabled ? (
        <div className="gr-engine-empty">Engine off — turn it on to see Stockfish lines.</div>
      ) : status === 'error' ? (
        <div className="gr-engine-empty">Engine could not start in this browser.</div>
      ) : lines.length === 0 ? (
        <div className="gr-engine-empty">Analysing…</div>
      ) : (
        <table className="gr-engine-table">
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
  brilliant:   { icon: '✨', color: 'var(--color-success)', label: 'Brilliant!' },
  blunder:     { icon: '⁉️', color: 'var(--color-danger)', label: 'Blunder' },
  mistake:     { icon: '?!', color: 'var(--color-warning)', label: 'Mistake' },
  inaccuracy:  { icon: '?!', color: 'var(--color-warning)', label: 'Inaccuracy' },
  good:        { icon: '',   color: 'var(--color-success)', label: '' },
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
  // Live Stockfish on/off — user preference, persisted across games & sessions.
  const [engineOn, setEngineOn] = useState(() => {
    try { return localStorage.getItem('gaEngineOn') !== 'false'; } catch { return true; }
  });
  const toggleEngine = useCallback(() => {
    setEngineOn(prev => {
      const next = !prev;
      try { localStorage.setItem('gaEngineOn', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // ── Square evaluations ────────────────────────────────────────────────────
  // Click a piece and every square it can reach shows the eval AFTER moving
  // there, so a learner can see which squares are good and which hang material
  // instead of only which are legal.
  //
  // Each destination is a separate short search (the resulting position, at
  // SQUARE_EVAL_DEPTH). MultiPV was the obvious alternative and is wrong here:
  // it ranks the best moves in the WHOLE position, so covering one rook's ten
  // squares would need MultiPV ≈ every legal move — far more work, and still no
  // guarantee a particular quiet square is included.
  const [squareEvalsOn, setSquareEvalsOn] = useState(() => {
    try { return localStorage.getItem('gaSquareEvals') === 'true'; } catch { return false; }
  });
  const toggleSquareEvals = useCallback(() => {
    setSquareEvalsOn(prev => {
      const next = !prev;
      try { localStorage.setItem('gaSquareEvals', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const [selection, setSelection] = useState(null);   // { from, targets }
  const [squareEvals, setSquareEvals] = useState({});
  const [evalBusy, setEvalBusy] = useState(false);
  const evalRunRef = useRef(0);

  const activeTab = 'moves'; // single view (Stockfish + moves); tabs removed
  const timerRef = useRef(null);
  const commentRef = useRef(null);

  // ── Variation tree (persistent, per-game in localStorage; never the DB) ──
  // The game's mainline is the children[0] chain; user variations are extra
  // children, nested to any depth. `path` = ids from root to the current node.
  const [tree, setTree] = useState(() => loadTreeInto(pgn, buildTreeFromPgn(pgn)));
  const [path, setPath] = useState([]); // [] = starting position
  const [moveMenu, setMoveMenu] = useState(null); // {x,y} right-click menu on move list, or null

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

  // Analysis board size.
  //
  // 520, not 380: inside the 900px .ga-page there is 860px of usable width, and
  // 520 + the 8px grid gap still leaves 332px for the move list and engine
  // lines beside it. Going further starves that column — at 560 it drops under
  // 300px and the Stockfish lines start wrapping.
  //
  // Deliberately a fixed number rather than a container-measuring hook: the
  // board sits in a `grid-template-columns: auto 1fr` track, so a hook that
  // measures the column and a column that sizes to the board feed each other.
  const [boardSize, setBoardSize] = useState(520);

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

  // Evaluate every square the selected piece can reach.
  //
  // Runs one search per destination, sequentially. Sequential is deliberate:
  // stockfishService is a shared SINGLETON with one worker, so firing these in
  // parallel would have each call `stop()` the previous one and return garbage.
  // Results are written as they arrive, so numbers fill in progressively rather
  // than the board sitting blank until the last square finishes.
  useEffect(() => {
    if (!squareEvalsOn || !selection || selection.targets.length === 0) {
      setSquareEvals({});
      setEvalBusy(false);
      return undefined;
    }

    const run = ++evalRunRef.current;
    let cancelled = false;

    // Show every target as pending immediately, so the user sees the board
    // respond to the click instead of nothing happening for a second.
    setSquareEvals(
      Object.fromEntries(selection.targets.map((sq) => [sq, { pending: true }]))
    );
    setEvalBusy(true);

    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (cancelled || run !== evalRunRef.current) return;

        for (const target of selection.targets) {
          if (cancelled || run !== evalRunRef.current) return;

          // Play the candidate move to get the position to evaluate.
          let afterFen = null;
          let mated = false;
          try {
            const probe = new Chess(currentFen === 'start' ? undefined : currentFen);
            // promotion: 'q' — a promotion square would otherwise be illegal
            // here and the square would silently get no number.
            const mv = probe.move({ from: selection.from, to: target, promotion: 'q' });
            if (!mv) continue;
            afterFen = probe.fen();
            mated = probe.isCheckmate();
          } catch { continue; }

          // Mate needs no search, and the engine would report it oddly anyway.
          if (mated) {
            if (!cancelled && run === evalRunRef.current) {
              setSquareEvals((prev) => ({ ...prev, [target]: { text: '#', score: 99 } }));
            }
            continue;
          }

          let res = null;
          try {
            res = await stockfishService.analyzePosition(afterFen, {
              depth: SQUARE_EVAL_DEPTH,
              multipv: 1,
            });
          } catch { /* leave this square unlabelled */ }

          if (cancelled || run !== evalRunRef.current) return;

          const line = res?.lines?.[0];
          if (!line) {
            setSquareEvals((prev) => {
              const next = { ...prev };
              delete next[target];
              return next;
            });
            continue;
          }

          // SIGN: the engine scores the position from the side to move, and
          // after our candidate move that is the OPPONENT. Negating gives the
          // number from the mover's point of view — without this, good squares
          // would be labelled bad and vice versa.
          let text, score;
          if (line.scoreType === 'mate') {
            const m = -line.score;
            text = (m > 0 ? '#' : '-#') + Math.abs(m);
            score = m > 0 ? 99 : -99;
          } else {
            score = -line.score / 100;
            text = (score > 0 ? '+' : '') + score.toFixed(1);
          }

          setSquareEvals((prev) => ({ ...prev, [target]: { text, score } }));
        }
      } finally {
        if (!cancelled && run === evalRunRef.current) setEvalBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      // Only stop if a newer run has not already taken over the shared engine.
      if (run === evalRunRef.current) stockfishService.stop();
    };
  }, [squareEvalsOn, selection, currentFen]);
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

  // Whether the user has added any variations at all (controls show/hide of the
  // "delete all" affordance).
  const hasVars = useMemo(() => hasAnyVariations(tree), [tree]);

  // Lichess-style "delete all variations": wipe every user line, keep only the
  // game mainline, drop the saved tree, and return to the start position. Used
  // by the toolbar button and the right-click context menu on the move list.
  const clearVariations = useCallback(() => {
    if (!hasVars) return;
    clearAllVariations(tree);
    setPath([]);
    setTree({ ...tree }); // new ref so memos recompute
    try { localStorage.removeItem(treeStorageKey(pgn)); } catch { /* ignore */ }
  }, [tree, pgn, hasVars]);

  // Detailed move analysis only applies on the GAME mainline. The mainline ply
  // equals path length when we're on the mainline; in a variation there's none.
  const mainlinePly = onMainline ? path.length : 0;
  const currentAnalysis = (onMainline && mainlinePly > 0) ? moveAnalysis[mainlinePly - 1] : null;
  const meta = currentAnalysis ? CLASS_META[currentAnalysis.classification] || CLASS_META.good : null;

  // Move arrows: green bestMove for blunders/mistakes, gold for brilliant.
  const arrows = useMemo(() => {
    if (!currentAnalysis || !onMainline) return [];
    if (currentAnalysis.classification === 'brilliant') {
      if (curNode.from && curNode.to) return [{ from: curNode.from, to: curNode.to, color: 'var(--color-success)' }];
      return [];
    }
    if (!currentAnalysis.bestMove || currentAnalysis.classification === 'good' || currentAnalysis.classification === 'inaccuracy') return [];
    const prevFen = nodeAtPath(tree, path.slice(0, -1))?.fen;
    if (!prevFen) return [];
    try {
      const c = new Chess(prevFen);
      const m = c.move(currentAnalysis.bestMove);
      if (m) return [{ from: m.from, to: m.to, color: 'var(--color-success)' }];
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
    <div className={`gr-container${quick ? ' gr-quick' : ''}`}>
      {/* Header. In Quick Analyze there's no "game" to label (it's a pasted FEN/
          PGN), so drop the "Game N" + opening info and keep just a Back button. */}
      <div className="gr-header">
        <button className="gr-back-btn" onClick={onClose}>{quick ? '← Back' : '← Back to Overview'}</button>
        {!quick && (
          <div className="gr-header-info">
            <span className="gr-game-num">Game {gameNumber}</span>
            <span className="gr-opening">{opening || 'Unknown'}</span>
          </div>
        )}
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
              onSelectionChange={squareEvalsOn ? setSelection : undefined}
              squareEvals={squareEvalsOn ? squareEvals : undefined}
            />
            {/* Shared grip — positions itself from the board's exported geometry. */}
          </div>

          {exploring ? (
            <div className="gr-study-banner">
              <span>🔬 In your variation — saved on this device</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="gr-study-return" onClick={deleteCurrentVariation}>🗑 Delete line</button>
                {hasVars && <button className="gr-study-return" onClick={clearVariations} title="Remove every variation and return to the game line">🧹 Delete all</button>}
              </span>
            </div>
          ) : hasVars ? (
            /* The instructional sentence was removed — it repeated under every
               game and the behaviour is self-evident. "Delete all variations"
               was nested INSIDE that line, so this row still renders whenever
               there are variations to clear; with none, nothing shows at all. */
            <div className="gr-study-hint">
              <button className="gr-link-btn" onClick={clearVariations} title="Remove every variation and return to the game line">🧹 Delete all variations</button>
            </div>
          ) : null}

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
          {/* Square evaluations toggle. Sits BESIDE the board rather than under
              it: it belongs with the other engine controls, and below the board
              it pushed the win bar and playback controls further down.
              Off by default — it takes over the shared engine for a second or
              two per click, which should be the user's choice. */}
          <div className="gr-sqeval-bar">
            <label className="gr-sqeval-toggle">
              <input
                type="checkbox"
                checked={squareEvalsOn}
                onChange={toggleSquareEvals}
              />
              <span>🎯 Show evaluation on each square</span>
            </label>
            <span className="gr-sqeval-note">
              {squareEvalsOn
                ? (evalBusy
                    ? 'Checking each square…'
                    : 'Click a piece to see how good each of its squares is.')
                : 'Click a piece and every square it can reach shows the eval after moving there.'}
            </span>
          </div>

          {/* Live Stockfish engine lines for the current position */}
          {/* `enabled` also goes false while the square evaluations are running.
              stockfishService is a single shared worker: if the panel kept its
              own search going, the two would call stop() on each other and both
              would return nothing. The panel resumes automatically the moment
              the squares finish. */}
          <EnginePanel
            fen={currentFen}
            numLines={quick ? 4 : 3}
            enabled={engineOn && !evalBusy}
            onToggle={toggleEngine}
          />

          {/* Move list — full variation tree. Mainline inline; user variations
              shown nested in ( … ), persisted on this device. Right-click for a
              Lichess-style menu (delete all variations). */}
          <div
            className="gr-move-list"
            onContextMenu={(e) => {
              if (!hasVars) return; // nothing to act on → let the native menu show
              e.preventDefault();
              setMoveMenu({ x: e.clientX, y: e.clientY });
            }}
          >
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

          {/* Right-click context menu for the move list */}
          {moveMenu && (
            <>
              {/* click-away / scroll catcher */}
              <div
                className="gr-ctx-overlay"
                onClick={() => setMoveMenu(null)}
                onContextMenu={(e) => { e.preventDefault(); setMoveMenu(null); }}
              />
              <div className="gr-ctx-menu" style={{ top: moveMenu.y, left: moveMenu.x }}>
                <button
                  className="gr-ctx-item"
                  onClick={() => { clearVariations(); setMoveMenu(null); }}
                >
                  🧹 Delete all variations
                </button>
                {exploring && (
                  <button
                    className="gr-ctx-item"
                    onClick={() => { deleteCurrentVariation(); setMoveMenu(null); }}
                  >
                    🗑 Delete this line
                  </button>
                )}
              </div>
            </>
          )}

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
                    <div className="gr-comment-best" style={{ color: 'var(--color-success)' }}>
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
                      <span className="gr-stat-val" style={{ color: 'var(--color-success)' }}>✨ {totalBrilliant}</span>
                      <span className="gr-stat-lbl">Brilliant</span>
                    </div>
                  )}
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val">{accuracy}%</span>
                    <span className="gr-stat-lbl">Accuracy</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: 'var(--color-danger)' }}>{totalBlunders}</span>
                    <span className="gr-stat-lbl">Blunders</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: 'var(--color-warning)' }}>{totalMistakes}</span>
                    <span className="gr-stat-lbl">Mistakes</span>
                  </div>
                  <div className="gr-summary-stat">
                    <span className="gr-stat-val" style={{ color: 'var(--color-warning)' }}>{totalInaccuracies}</span>
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
