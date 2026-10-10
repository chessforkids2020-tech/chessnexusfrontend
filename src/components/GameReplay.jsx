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

// Move-tree renderer. The mainline is a 2-column table (move no. | White |
// Black); each variation (children[1..]) is an indented block under the row it
// branches from — nested sub-variations stay inline in ( … ) inside that block.
// When a variation replaces White's move, the row splits Lichess-style: the
// Black reply continues on a "…" row after the block. The current node is
// highlighted; clicking any move jumps to it.
//   root, path: from GameReplay state
//   moveAnalysis, turningPointPly: mainline annotations (variations have none)
//   onGoTo(path): navigate to a node
function MoveTree({ root, path, moveAnalysis, turningPointPly, onGoTo }) {
  const curId = path[path.length - 1] || 'root';

  const renderMainline = () => {
    const out = [];
    let row = null; // { no, w, b } — cells are elements, null = empty
    const flush = () => {
      if (row && (row.w || row.b)) {
        out.push(
          <div key={`r${out.length}`} className="gr-mrow">
            <span className="gr-mno">{row.no}.</span>
            {row.w || <span className="gr-mv gr-mv-empty">…</span>}
            {row.b || <span className="gr-mv gr-mv-empty" />}
          </div>
        );
      }
      row = null;
    };

    let cur = root;
    let curPath = [];
    let ply = 0;
    while (cur.children.length > 0) {
      const child = cur.children[0];
      const childPath = [...curPath, child.id];
      const childPly = ply + 1;
      const { moveNo, whiteToMove } = fenMeta(cur.fen);
      const cls = moveAnalysis[childPly - 1]?.classification || '';
      const isTurning = turningPointPly != null && childPly === turningPointPly;
      const cell = (
        <button
          key={child.id}
          type="button"
          className={`gr-mv ${cls}${child.id === curId ? ' current' : ''}${isTurning ? ' turning-point' : ''}`}
          onClick={() => onGoTo(childPath)}
        >
          {child.san}{isTurning && <span className="gr-tp-marker">⚡</span>}
        </button>
      );
      if (whiteToMove) { flush(); row = { no: moveNo, w: cell, b: null }; }
      else { if (!row) row = { no: moveNo, w: null, b: null }; row.b = cell; }

      // Variations branching from `cur` (alternatives to `child`).
      if (cur.children.length > 1) {
        flush();
        out.push(
          <div key={`v${child.id}`} className="gr-var-block">
            {cur.children.slice(1).map(v => (
              <div key={v.id} className="gr-var-line">
                {renderVariation(v, [...curPath, v.id])}
              </div>
            ))}
          </div>
        );
        // Black's reply to this White move continues on a "…" row.
        if (whiteToMove) row = { no: moveNo, w: null, b: null };
      }
      cur = child;
      curPath = childPath;
      ply = childPly;
    }
    flush();
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

  return <>{renderMainline()}</>;
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
      {/* Off: just the header (name + switch) — no message line. */}
      {!enabled ? null : status === 'error' ? (
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

// Glyph on the square the current move landed on. Solid colours, not theme
// vars: the badge sits on the board, whose colours don't follow the app theme.
// "good" moves get no badge — marking every move would drown out the ones that
// matter.
const MOVE_BADGE = {
  brilliant:  { text: '!!', color: '#1baca6', title: 'Brilliant' },
  best:       { text: '★',  color: '#3f9f4a', title: 'Best move' },
  inaccuracy: { text: '?!', color: '#c99a06', title: 'Inaccuracy' },
  mistake:    { text: '?',  color: '#e07b22', title: 'Mistake' },
  blunder:    { text: '??', color: '#d63b3b', title: 'Blunder' },
};

// ── Learn from your mistakes ──
// A tried move counts as right when it is the engine's move, or when it keeps
// the win chance within this many points of the position before the mistake —
// i.e. it would NOT itself have been flagged (analyzeGame flags a 10%+ drop as
// an inaccuracy). Intermediate players often find a different good move; it
// should not be marked wrong just because it isn't the engine's first choice.
const PRACTICE_OK_DROP = 10;
const PRACTICE_DEPTH = 12; // same depth the game was reviewed at
const winChanceCp = (cp) => 100 / (1 + Math.exp(-0.00368208 * cp));
const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// ─── Component ────────────────────────────────────────────────────────────────

// Optional props for hosts other than the bulk "Analyze My Games" report (the
// single-game page uses them): `headerTitle`/`headerSub` replace "Game N ·
// opening", `backLabel` renames the back buttons, `seekPly` + `seekNonce` jump
// to a mainline ply from outside (eval graph clicks), and `onPlyChange(ply)`
// reports the mainline ply being shown (null inside a variation).
// `belowBoard` renders under the playback controls (board width);
// `belowMoves` renders in the right column, under the moves + commentary cards.
// `belowAll` renders full width under both columns.
// `hideHeader` drops the Back button + title row entirely.
// `practiceEnabled` offers "Learn from your mistakes" — needs moveAnalysis
// entries carrying `bestUci` (the single-game page provides it).
export default function GameReplay({
  game, totalGames, onClose, onNext, onPrev, quick = false,
  headerTitle, headerSub, backLabel, seekPly, seekNonce, onPlyChange, belowBoard, belowMoves, belowAll,
  hideHeader = false, practiceEnabled = false,
}) {
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
  // "Learn from your mistakes" session, or null. See the practice block below.
  const [practice, setPractice] = useState(null);

  // Rebuild the tree when the game changes. Not on mount: useState above already
  // built it from this pgn, and node ids come from a global counter, so a second
  // build would orphan any path set on mount (e.g. a ?ply= deep-link seek).
  const treeBuiltForRef = useRef(pgn);
  useEffect(() => {
    if (treeBuiltForRef.current === pgn) return;
    treeBuiltForRef.current = pgn;
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

  // External seek (eval graph). Keyed on the nonce so clicking the same ply
  // twice still jumps back after the user has moved away from it.
  useEffect(() => {
    if (seekPly == null) return;
    setPlaying(false);
    setPath(mainlinePath.slice(0, Math.max(0, Math.min(seekPly, mainlinePath.length))));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [seekNonce]);

  useEffect(() => {
    if (onPlyChange) onPlyChange(onMainline ? path.length : null);
  }, [onPlyChange, onMainline, path.length]);

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

  // The board resizes itself (drag grip, viewport cap), so `boardSize` is only
  // what we ASK for. The vertical win bar follows the squares actually drawn:
  // measure the square grid (parent of the [data-square] cells) and keep the
  // bar at its exact top offset + height.
  const boardWrapRef = useRef(null);
  const [gridBox, setGridBox] = useState(null); // { top, h } relative to the wrap
  useEffect(() => {
    const wrap = boardWrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const grid = wrap.querySelector('[data-square]')?.parentElement;
      if (!grid) return;
      const top = Math.round(grid.getBoundingClientRect().top - wrap.getBoundingClientRect().top);
      const h = Math.round(grid.getBoundingClientRect().height);
      setGridBox(prev => (prev && prev.top === top && prev.h === h ? prev : { top, h }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    const grid = wrap.querySelector('[data-square]')?.parentElement;
    if (grid) ro.observe(grid);
    measure();
    return () => ro.disconnect();
  }, []);
  // Width for everything lined up under the board (tools, graph, phone win bar).
  const drawnBoardSize = gridBox?.h ?? boardSize;

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

  // Keep the current move visible inside the moves list (scrolls the list only,
  // never the page). The ref is the scrolling rows area, between the MOVES
  // header and the controls footer.
  const moveListRef = useRef(null);
  useEffect(() => {
    const box = moveListRef.current;
    const el = box?.querySelector('.gr-mv.current, .gr-var-move.current');
    if (!box || !el) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop -= b.top - r.top + 4;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 4;
  }, [path]);

  // Keyboard navigation
  // While practising, the keys must not walk the game (that would leave the
  // position being solved); Escape ends practice instead of leaving the page.
  useEffect(() => {
    const handler = (e) => {
      if (practice) {
        if (e.key === 'Escape') { e.preventDefault(); setPractice(null); }
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); goForwardOne(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); goBackOne(); }
      else if (e.key === ' ')          { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'Escape')     { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goForwardOne, goBackOne, onClose, practice]);

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

  // ── Board tools: Copy FEN / Copy game / Export PGN ──
  // The game's PGN normalised by chess.js (headers + mainline + result). Falls
  // back to the raw string if chess.js can't parse it.
  const gamePgn = useMemo(() => {
    try {
      const c = new Chess();
      c.loadPgn(pgn || '');
      const full = c.pgn();
      const parts = full.split(/\r?\n\r?\n/);
      return { full, moves: parts[parts.length - 1].trim(), headers: c.getHeaders() };
    } catch {
      return { full: pgn || '', moves: (pgn || '').replace(/^\[.*\]\s*$/gm, '').trim(), headers: {} };
    }
  }, [pgn]);
  const [copied, setCopied] = useState(null); // 'fen' | 'game' | null
  const copiedTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);
  const copyText = useCallback(async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / non-secure contexts: hidden textarea + execCommand.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(key);
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(null), 1500);
  }, []);
  const copyFen = useCallback(() => {
    copyText(currentFen === 'start' ? new Chess().fen() : currentFen, 'fen');
  }, [copyText, currentFen]);
  const copyGame = useCallback(() => copyText(gamePgn.moves, 'game'), [copyText, gamePgn]);
  const exportPgn = useCallback(() => {
    const { White = 'White', Black = 'Black' } = gamePgn.headers;
    const safe = (s) => String(s).replace(/[^\w-]+/g, '_').slice(0, 40) || 'player';
    const blob = new Blob([`${gamePgn.full}\n`], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe(White)}_vs_${safe(Black)}.pgn`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [gamePgn]);

  // Detailed move analysis only applies on the GAME mainline. The mainline ply
  // equals path length when we're on the mainline; in a variation there's none.
  const mainlinePly = onMainline ? path.length : 0;
  const currentAnalysis = (onMainline && mainlinePly > 0) ? moveAnalysis[mainlinePly - 1] : null;
  const meta = currentAnalysis ? CLASS_META[currentAnalysis.classification] || CLASS_META.good : null;
  // End-of-game summary: only at the end of the real mainline, and only with
  // analysis (without it every stat would be blank).
  const showSummary = moveAnalysis.length > 0 && onMainline && path.length > 0 && path.length === mainlinePath.length;

  // ── Learn from your mistakes ──────────────────────────────────────────────
  // Steps through the player's own ?!/?/?? moves. Each one puts the board back
  // on the position BEFORE the mistake and asks for a better move. The tried
  // move is shown as a board override (`practice.fen`) — never added to the
  // variation tree, so practising leaves no clutter in the move list.
  const practiceList = useMemo(() => {
    if (!practiceEnabled) return [];
    const side = playerSide || 'white';
    return moveAnalysis
      .map((m, i) => ({ m, ply: i + 1 }))
      .filter(({ m, ply }) => m.side === side && m.bestUci && m.bestMove && ply <= mainlinePath.length
        && (m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder'));
  }, [practiceEnabled, playerSide, moveAnalysis, mainlinePath.length]);

  const practiceItem = practice && practice.idx < practiceList.length ? practiceList[practice.idx] : null;
  const practiceRunRef = useRef(0);
  const practiceTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(practiceTimerRef.current), []);

  const openPracticeItem = useCallback((idx, results) => {
    clearTimeout(practiceTimerRef.current);
    practiceRunRef.current++;
    setPlaying(false);
    setSelection(null);
    const item = practiceList[idx];
    if (item) setPath(mainlinePath.slice(0, item.ply - 1));
    setPractice({ idx, status: item ? 'ask' : 'done', fen: null, hint: false, note: null, results });
  }, [practiceList, mainlinePath]);
  const startPractice = useCallback(() => openPracticeItem(0, {}), [openPracticeItem]);
  const nextPractice = useCallback(() => {
    if (practice) openPracticeItem(practice.idx + 1, practice.results);
  }, [practice, openPracticeItem]);
  const stopPractice = useCallback(() => {
    clearTimeout(practiceTimerRef.current);
    practiceRunRef.current++;
    setPractice(null);
  }, []);

  // Any navigation away from the position being solved (move list, eval graph,
  // the playback buttons) ends the session — the panel would otherwise be
  // asking about a position that is no longer on the board.
  useEffect(() => {
    if (!practiceItem) return;
    if (!onMainline || path.length !== practiceItem.ply - 1) stopPractice();
  }, [path, onMainline, practiceItem, stopPractice]);

  const showPracticeSolution = useCallback(() => {
    if (!practiceItem) return;
    clearTimeout(practiceTimerRef.current);
    practiceRunRef.current++;
    const { bestUci, bestMove } = practiceItem.m;
    let fen = null;
    let san = bestMove;
    try {
      const c = new Chess(currentFen);
      const mv = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] || undefined });
      if (mv) { fen = c.fen(); san = mv.san; }
    } catch { /* leave the board as is — the arrow still shows it */ }
    setPractice(p => ({
      ...p, status: 'shown', fen, note: { san },
      results: { ...p.results, [practiceItem.ply]: p.results[practiceItem.ply] || 'shown' },
    }));
  }, [practiceItem, currentFen]);

  const handlePracticeMove = useCallback((from, to, promotion) => {
    if (!practiceItem || practice.status !== 'ask') return false;
    let c, mv;
    try {
      c = new Chess(currentFen);
      mv = c.move({ from, to, promotion: promotion || 'q' });
    } catch { return false; }
    if (!mv) return false;

    const { m, ply } = practiceItem;
    const uci = mv.from + mv.to + (mv.promotion || '');
    const fen = c.fen();
    const run = ++practiceRunRef.current;
    clearTimeout(practiceTimerRef.current);

    const right = (exact, drop) => setPractice(p => ({
      ...p, status: 'right', fen, note: { san: mv.san, exact, drop },
      results: { ...p.results, [ply]: p.results[ply] || 'solved' },
    }));
    // Wrong: show the move for a moment, then put the position back.
    const wrong = (note) => {
      setPractice(p => ({ ...p, status: 'wrong', fen, note }));
      practiceTimerRef.current = setTimeout(() => {
        if (run !== practiceRunRef.current) return;
        setPractice(p => (p ? { ...p, status: 'ask', fen: null } : p));
      }, 1100);
    };

    if (uci === m.bestUci || c.isCheckmate()) { right(true, 0); return true; }
    if (mv.san === m.move) { wrong({ san: mv.san, same: true }); return true; }

    // Not the engine's move — ask the engine whether it is still good.
    setPractice(p => ({ ...p, status: 'checking', fen, note: { san: mv.san } }));
    (async () => {
      let res = null;
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (run !== practiceRunRef.current) return;
        res = await stockfishService.analyzePosition(fen, { depth: PRACTICE_DEPTH, multipv: 1 });
      } catch { /* treated as "couldn't check" below */ }
      if (run !== practiceRunRef.current) return;
      const line = res?.lines?.[0];
      if (!line) { wrong({ san: mv.san, unknown: true }); return; }
      // The engine scores from the side to move — the opponent now — so negate
      // for the player who just moved.
      const moverWin = line.scoreType === 'mate'
        ? (-line.score > 0 ? 100 : 0)
        : winChanceCp(-line.score);
      const drop = Math.max(0, Math.round(m.winChanceBefore - moverWin));
      if (drop < PRACTICE_OK_DROP) right(false, drop);
      else wrong({ san: mv.san, drop });
    })();
    return true;
  }, [practiceItem, practice, currentFen]);

  // The practice check uses the shared engine; stop it if the session ends
  // mid-search so the live panel can have it back.
  useEffect(() => {
    if (practice?.status !== 'checking') return undefined;
    return () => { stockfishService.stop(); };
  }, [practice?.status]);

  // Move-quality badge on the square the current move landed on.
  const squareBadges = useMemo(() => {
    if (practiceItem) {
      if (practice.status !== 'ask' || !practice.hint) return undefined;
      return { [practiceItem.m.bestUci.slice(0, 2)]: { text: '💡', color: '#2f74c0', title: 'Hint' } };
    }
    if (!currentAnalysis || !onMainline || !curNode.to) return undefined;
    const b = MOVE_BADGE[currentAnalysis.isBest ? 'best' : currentAnalysis.classification];
    return b ? { [curNode.to]: b } : undefined;
  }, [practiceItem, practice, currentAnalysis, onMainline, curNode]);

  // Move arrows: green best move for inaccuracies, mistakes and blunders (the
  // move that should have been played, from the position before it); gold-green
  // on the move itself for brilliant.
  const arrows = useMemo(() => {
    if (practiceItem) {
      if (practice.status !== 'shown') return [];
      const u = practiceItem.m.bestUci;
      return [{ from: u.slice(0, 2), to: u.slice(2, 4), color: 'var(--color-success)' }];
    }
    if (!currentAnalysis || !onMainline) return [];
    if (currentAnalysis.classification === 'brilliant') {
      if (curNode.from && curNode.to) return [{ from: curNode.from, to: curNode.to, color: 'var(--color-success)' }];
      return [];
    }
    if (!currentAnalysis.bestMove || currentAnalysis.classification === 'good') return [];
    const prevFen = nodeAtPath(tree, path.slice(0, -1))?.fen;
    if (!prevFen) return [];
    try {
      const c = new Chess(prevFen);
      const m = c.move(currentAnalysis.bestMove);
      if (m) return [{ from: m.from, to: m.to, color: 'var(--color-success)' }];
    } catch {}
    return [];
  }, [practiceItem, practice, currentAnalysis, onMainline, curNode, tree, path]);

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
      {!hideHeader && (
      <div className="gr-header">
        <button className="gr-back-btn" onClick={onClose}>{backLabel ? `← ${backLabel}` : quick ? '← Back' : '← Back to Overview'}</button>
        {headerTitle ? (
          <div className="gr-header-info">
            <span className="gr-game-num">{headerTitle}</span>
            {headerSub && <span className="gr-opening">{headerSub}</span>}
          </div>
        ) : !quick && (
          <div className="gr-header-info">
            <span className="gr-game-num">Game {gameNumber}</span>
            <span className="gr-opening">{opening || 'Unknown'}</span>
          </div>
        )}
      </div>
      )}

      <div className="gr-layout">
        {/* Board */}
        <div className="gr-board-col">
          <div className="gr-board-row">
            <div className="gr-board-wrap" ref={boardWrapRef}>
              <Chessboard
                position={(practiceItem && practice.fen) || currentFen}
                orientation={playerSide || 'white'}
                draggable={true}
                onDrop={(from, to, promotion) => (practice
                  ? handlePracticeMove(from, to, promotion)
                  : handleStudyMove(from, to, promotion))}
                lastMove={currentMove}
                arrows={exploring ? [] : arrows}
                boardWidth={boardSize}
                onSelectionChange={squareEvalsOn && !practice ? setSelection : undefined}
                squareEvals={squareEvalsOn && !practice ? squareEvals : undefined}
                squareBadges={exploring ? undefined : squareBadges}
              />
              {/* Shared grip — positions itself from the board's exported geometry. */}
            </div>

            {/* Vertical win chance bar right of the board (desktop/tablet).
                White's share sits on White's side of the board. */}
            <div
              className={`gr-vbar${(playerSide || 'white') === 'black' ? ' flipped' : ''}`}
              style={{
                ...(gridBox ? { height: gridBox.h, marginTop: gridBox.top } : { height: boardSize }),
                // Hidden (not removed) while practising — it shows the eval, and
                // keeping its space stops the board from jumping sideways.
                ...(practice ? { visibility: 'hidden' } : null),
              }}
              title={`White ${whiteWinPct}% · Black ${100 - whiteWinPct}%`}
            >
              <div className="gr-vbar-white" style={{ height: `${whiteWinPct}%` }} />
            </div>
          </div>

          {/* Learn from your mistakes — straight under the board, so it stays in
              view on phones too (the right column drops below the fold there). */}
          {practiceEnabled && practiceList.length > 0 && !practice && (
            <div className="gr-practice gr-practice--cta" style={{ maxWidth: drawnBoardSize }}>
              <div className="gr-practice-cta-text">
                <b>🎯 Learn from your mistakes</b>
                <span>{practiceList.length} position{practiceList.length === 1 ? '' : 's'} where you can find a better move</span>
              </div>
              <button type="button" className="gr-practice-btn gr-practice-btn--go" onClick={startPractice}>Start</button>
            </div>
          )}

          {/* No variation banner under the board — "Delete this line" /
              "Delete all variations" live in the moves list's right-click menu. */}

          {/* While practising, the board column is just the board: the win bars,
              tools and graph would all give the answer (or the game) away. */}
          {!practice && (<>
          {/* Horizontal win chance bar — phones only (the vertical one is hidden there). */}
          <div className="gr-winbar-wrap" style={{ maxWidth: drawnBoardSize }}>
            <div className="gr-winbar">
              <div className="gr-winbar-white" style={{ width: `${whiteWinPct}%` }} />
            </div>
            <div className="gr-winbar-labels">
              <span>White {whiteWinPct}%</span>
              <span>Black {100 - whiteWinPct}%</span>
            </div>
          </div>

          {/* Board tools — copy the position / the game, export the PGN, and the
              square-evals toggle. Square evals are off by default: they take
              over the shared engine for a second or two per click, which should
              be the user's choice. */}
          <div className="gr-boardtools" style={{ maxWidth: drawnBoardSize }}>
            <button type="button" className="gr-boardtool" onClick={copyFen} title="Copy the position on the board (FEN)">
              {copied === 'fen' ? '✓ Copied' : '📋 Copy FEN'}
            </button>
            <button type="button" className="gr-boardtool" onClick={copyGame} title="Copy the game's moves">
              {copied === 'game' ? '✓ Copied' : '📝 Copy game'}
            </button>
            <button type="button" className="gr-boardtool" onClick={exportPgn} title="Download this game as a .pgn file">
              📥 Export PGN
            </button>
            <button
              type="button"
              className={`gr-boardtool gr-boardtool--eval${squareEvalsOn ? ' on' : ''}`}
              onClick={toggleSquareEvals}
              aria-pressed={squareEvalsOn}
              title="Click a piece and every square it can reach shows the eval after moving there"
            >
              🎯 Square evals
              <span className="gr-boardtool-state">{squareEvalsOn ? (evalBusy ? '…' : 'On') : 'Off'}</span>
            </button>
          </div>

          {belowBoard && <div className="gr-below-board" style={{ maxWidth: drawnBoardSize }}>{belowBoard}</div>}
          </>)}
        </div>

        {/* Commentary + Move List. While practising this column holds only the
            practice panel, so it plays like a puzzle: no moves list, commentary,
            engine lines or accuracy that would show the answer. */}
        <div className="gr-info-col">
          {practice && (
            <div className={`gr-practice gr-practice--${practice.status}`} style={{ maxWidth: drawnBoardSize }}>
              <div className="gr-practice-head">
                <b>🎯 Learn from your mistakes</b>
                {practiceItem && <span className="gr-practice-count">{practice.idx + 1} / {practiceList.length}</span>}
                <button type="button" className="gr-practice-x" onClick={stopPractice} title="Stop (Esc)" aria-label="Stop practising">✕</button>
              </div>

              {practiceItem && (() => {
                const { m } = practiceItem;
                const sideName = m.side === 'white' ? 'White' : 'Black';
                const n = practice.note;
                const fromSq = m.bestUci.slice(0, 2);
                let hintPiece = null;
                try { hintPiece = new Chess(currentFen).get(fromSq)?.type; } catch { /* ignore */ }
                return (
                  <>
                    <div className="gr-practice-q">
                      Move {m.moveNumber}{m.side === 'black' ? '…' : '.'} you played{' '}
                      <span className={`gr-practice-played c-${m.classification}`}>{m.move}{MOVE_BADGE[m.classification].text}</span>
                      {' '}<span className="gr-practice-drop">−{m.winChanceDrop}% win chance</span>
                    </div>

                    {practice.status === 'ask' && (
                      <div className="gr-practice-msg">
                        {n?.same ? <span className="bad">That's the move from the game. Look for something better.</span>
                          : n?.unknown ? <span className="bad">Couldn't check {n.san}. Try again.</span>
                            : n?.drop != null ? <span className="bad">{n.san} isn't it: it loses {n.drop}% win chance. Try again.</span>
                              : <>Find a better move for <b>{sideName}</b>.</>}
                        {practice.hint && hintPiece && (
                          <div className="gr-practice-hint">💡 Look at your {PIECE_NAME[hintPiece]} on {fromSq}.</div>
                        )}
                      </div>
                    )}
                    {practice.status === 'checking' && <div className="gr-practice-msg">Checking {n?.san}…</div>}
                    {practice.status === 'wrong' && (
                      <div className="gr-practice-msg bad">
                        {n?.same ? `${n.san} is what you played in the game.` : n?.drop != null ? `${n.san}: loses ${n.drop}% win chance.` : `${n?.san}: not it.`}
                      </div>
                    )}
                    {practice.status === 'right' && (
                      <div className="gr-practice-msg good">
                        {n.exact
                          ? <>✓ <b>{n.san}</b>, the best move!</>
                          : <>✓ <b>{n.san}</b> works too{n.drop > 0 ? ` (only −${n.drop}%)` : ''}. The engine's choice was <b>{m.bestMove}</b>.</>}
                      </div>
                    )}
                    {practice.status === 'shown' && (
                      <div className="gr-practice-msg">The best move was <b>{n?.san || m.bestMove}</b>.</div>
                    )}

                    <div className="gr-practice-actions">
                      {practice.status === 'ask' && (<>
                        {!practice.hint && (
                          <button type="button" className="gr-practice-btn" onClick={() => setPractice(p => ({ ...p, hint: true }))}>💡 Hint</button>
                        )}
                        <button type="button" className="gr-practice-btn" onClick={showPracticeSolution}>👁 Show answer</button>
                        <button type="button" className="gr-practice-btn" onClick={nextPractice}>Skip →</button>
                      </>)}
                      {(practice.status === 'right' || practice.status === 'shown') && (
                        <button type="button" className="gr-practice-btn gr-practice-btn--go" onClick={nextPractice}>
                          {practice.idx + 1 < practiceList.length ? 'Next mistake →' : 'Finish'}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {practice.status === 'done' && (() => {
                const vals = Object.values(practice.results);
                const solved = vals.filter(v => v === 'solved').length;
                return (
                  <>
                    <div className="gr-practice-msg">
                      You found <b>{solved}</b> of <b>{practiceList.length}</b> on your own
                      {vals.length - solved > 0 ? `, ${vals.length - solved} with the answer shown` : ''}
                      {practiceList.length - vals.length > 0 ? `, ${practiceList.length - vals.length} skipped` : ''}.
                      {solved === practiceList.length ? ' 🎉' : ''}
                    </div>
                    <div className="gr-practice-actions">
                      <button type="button" className="gr-practice-btn" onClick={startPractice}>↻ Try again</button>
                      <button type="button" className="gr-practice-btn gr-practice-btn--go" onClick={stopPractice}>Done</button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {/* ── MOVES TAB ── */}
          {activeTab === 'moves' && !practice && (<>
          {/* Live Stockfish engine lines for the current position */}
          {/* `enabled` also goes false while the square evaluations are running.
              stockfishService is a single shared worker: if the panel kept its
              own search going, the two would call stop() on each other and both
              would return nothing. The panel resumes automatically the moment
              the squares finish. */}
          {/* (The square-evals toggle lives in the board tools row under the board.) */}
          <div className="gr-engine-row">
            <EnginePanel
              fen={currentFen}
              numLines={quick ? 4 : 3}
              enabled={engineOn && !evalBusy && !practice}
              onToggle={toggleEngine}
            />
          </div>

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
            <div className="gr-moves-head">Moves</div>
            <div ref={moveListRef} className="gr-move-list-inner">
              <MoveTree
                root={tree}
                path={path}
                moveAnalysis={moveAnalysis}
                turningPointPly={turningPointPly}
                onGoTo={goToPath}
              />
            </div>
            {/* Controls — attached to the bottom of the moves card; walk the
                current line (mainline or the variation you're in). */}
            <div className="gr-controls">
              <button className="gr-ctrl-btn" onClick={goFirst} disabled={path.length <= 0} title="First move">⏮</button>
              <button className="gr-ctrl-btn" onClick={goPrev} disabled={path.length <= 0} title="Previous (←)">◀</button>
              <button className="gr-ctrl-btn gr-play-btn" onClick={() => setPlaying(p => !p)} title="Play / pause (Space)">
                {playing ? '⏸' : '▶'}
              </button>
              <button className="gr-ctrl-btn" onClick={goNext} disabled={atEnd} title="Next (→)">▶</button>
              <button className="gr-ctrl-btn" onClick={goLast} disabled={atEnd} title="Last move">⏭</button>
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

          {/* Commentary — only rendered when it has something to say (inside a
              variation, or on an unanalysed move, there is nothing). */}
          {(path.length === 0 || currentAnalysis || showSummary) && (
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
            {/* Needs analysis to summarise — without it every stat is blank
                (Quick Analyze, or a single game not yet analysed). */}
            {showSummary && (
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
                  <button className="gr-nav-btn gr-nav-back" onClick={onClose}>{backLabel || 'Back to Overview'}</button>
                </div>
              </div>
            )}
          </div>
          )}

          {belowMoves}
          </>)}

          {/* ── COACH TAB ──(disabled for performance — re-enable when AI commentary is re-added) */}
        </div>
      </div>
      {belowAll && !practice && <div className="gr-below-all">{belowAll}</div>}
    </div>
  );
}
