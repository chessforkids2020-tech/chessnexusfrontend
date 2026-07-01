import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../api';
import Chessboard from '../Chessboard';
import {
  buildTreeFromGame, applyMove, pathToNode,
  firstNode, nextNode, prevNode, lastNode, fenAt, lastMoveAt,
  rehydrateTree, hasVariations
} from './moveTree';

// Variations the user adds are kept in the browser only (localStorage), never the
// DB. Key is per game so each game restores its own exploration on refresh.
const lsKey = (gameId) => `mg.analysis.${gameId}`;

// ── Master Game analysis popup ────────────────────────────────────────────────
// Left: interactive board (reuses the shared Chessboard) + navigation + flip.
// Right: clickable move notation with blunder/mistake/inaccuracy highlights
// (matching the ChessNexus analysis look) + a classification card. The user can
// play LEGAL moves anywhere to create nested variations; replaying a main-line
// move just continues it. Nothing is persisted — reload resets exploration.
//
// Annotations come from the imported PGN's NAGs ($4/$2/$6) OR, when a game is
// unanalyzed, from a deep server-side Stockfish run triggered by the Analyze
// button (POST /api/master-games/:id/analyze) and cached in the DB for everyone.

// Colours mirror the ChessNexus GameReplay scheme.
const CLASS_META = {
  blunder:    { symbol: '??', color: '#ef4444', icon: '⁉️', label: 'Blunder', desc: 'A blunder was played here — a serious error.' },
  mistake:    { symbol: '?',  color: '#f59e0b', icon: '?',  label: 'Mistake', desc: 'A mistake — this move loses ground.' },
  inaccuracy: { symbol: '?!', color: '#eab308', icon: '?!', label: 'Inaccuracy', desc: 'An inaccuracy — a slightly imprecise move.' }
};

export default function GameAnalysisModal({ gameId, onClose, initialPly = 0 }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tree, setTree] = useState(null);
  const [currentId, setCurrentId] = useState(null); // null = start position

  // Lazy analysis state
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [analyzeError, setAnalyzeError] = useState(null);

  // Guard so the save effect doesn't fire before the tree is first built.
  const hydratedRef = useRef(false);

  // Load the game, build the base move tree, then overlay any saved exploration
  // for this game from localStorage (so refresh restores the user's variations).
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    hydratedRef.current = false;
    api.get(`/api/master-games/${gameId}`)
      .then(res => {
        if (!alive) return;
        const g = res.data.game;
        setGame(g);
        const base = buildTreeFromGame(g.moves || [], g.analysis || []);

        // Try to restore the user's saved tree for this game.
        let restoredTree = null;
        try {
          const raw = localStorage.getItem(lsKey(gameId));
          if (raw) restoredTree = rehydrateTree(JSON.parse(raw));
        } catch { restoredTree = null; }

        const activeTree = restoredTree || base;
        setTree(activeTree);
        setAnalyzed(!!g.analyzed);
        // Open at the requested ply (used by the opening-study explorer so the game
        // opens exactly where the user's studied line reached). Walk firstborn
        // children `initialPly` times from the root; fall back to start on mismatch.
        setCurrentId(nodeAtPly(activeTree, initialPly));
        hydratedRef.current = true;
      })
      .catch(() => alive && setError('Could not load this game.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [gameId, initialPly]);

  // Persist the tree to localStorage whenever it changes from user interaction —
  // but only once the user has actually added a variation (keeps storage clean).
  useEffect(() => {
    if (!hydratedRef.current || !tree) return;
    try {
      if (hasVariations(tree)) {
        localStorage.setItem(lsKey(gameId), JSON.stringify(tree));
      } else {
        localStorage.removeItem(lsKey(gameId));
      }
    } catch { /* storage full / unavailable — ignore */ }
  }, [tree, gameId]);

  // ── Board interaction: play a legal move → create/continue a variation ──
  const handleDrop = useCallback((from, to, promotion) => {
    if (!tree) return false;
    const res = applyMove(tree, currentId || tree.rootId, { from, to, promotion: promotion || 'q' });
    if (!res) return false; // illegal — board rejects
    setTree(res.tree);
    setCurrentId(res.nodeId);
    return true;
  }, [tree, currentId]);

  // ── Analysis: run deep Stockfish on the SERVER, then cache to the DB ──
  // Quality no longer depends on the user's device. The server runs at most one
  // analysis at a time, so if it's busy with another game we briefly retry. The
  // progress bar is an estimate (the request is a single call, not streamed).
  const runAnalysis = useCallback(async () => {
    if (!game || analyzing) return;
    setAnalyzing(true); setAnalyzeError(null); setProgress(0);

    // Smoothly creep the progress bar while we wait on the server. Estimate the
    // duration from the move count (~2 positions/move). Caps at 95% until done.
    const moveCount = (game.moves || []).length || 40;
    const estMs = Math.max(8000, moveCount * 900);
    const startedAt = Date.now();
    const ticker = setInterval(() => {
      const frac = Math.min(0.95, (Date.now() - startedAt) / estMs);
      setProgress(frac);
    }, 300);

    const MAX_BUSY_RETRIES = 30; // ~30 * 4s = up to 2 min waiting for a free engine
    try {
      let analysis = null;
      for (let attempt = 0; attempt <= MAX_BUSY_RETRIES; attempt++) {
        try {
          const res = await api.post(`/api/master-games/${gameId}/analyze`, { depth: 20 });
          analysis = res.data?.analysis || [];
          break;
        } catch (e) {
          // 429 = engine busy with another game → wait and retry.
          if (e?.response?.status === 429 && attempt < MAX_BUSY_RETRIES) {
            await new Promise(r => setTimeout(r, 4000));
            continue;
          }
          throw e;
        }
      }
      if (!analysis) throw new Error('busy');

      // Annotate the main line in place so the user's own variations are kept.
      setTree(prev => annotateMainLine(prev, analysis));
      setAnalyzed(true);
      setProgress(1);
    } catch {
      setAnalyzeError('Analysis failed — the engine may be busy. Please try again.');
    } finally {
      clearInterval(ticker);
      setAnalyzing(false);
    }
  }, [game, gameId, analyzing]);

  // ── Navigation ──
  const go = useCallback((id) => setCurrentId(id), []);
  const goStart = useCallback(() => setCurrentId(null), []);
  const goPrev = useCallback(() => tree && setCurrentId(prevNode(tree, currentId)), [tree, currentId]);
  const goNext = useCallback(() => {
    if (!tree) return;
    const nxt = currentId ? nextNode(tree, currentId) : firstNode(tree);
    if (nxt) setCurrentId(nxt);
  }, [tree, currentId]);
  const goEnd = useCallback(() => tree && setCurrentId(lastNode(tree, currentId || tree.rootId)), [tree, currentId]);

  // ── Auto-play: step forward through the main line on a timer ──
  const [playing, setPlaying] = useState(false);
  const togglePlay = useCallback(() => setPlaying(p => !p), []);
  useEffect(() => {
    if (!playing || !tree) return;
    const t = setInterval(() => {
      setCurrentId(cur => {
        const nxt = cur ? nextNode(tree, cur) : firstNode(tree);
        if (!nxt) { setPlaying(false); return cur; } // reached the end
        return nxt;
      });
    }, 900);
    return () => clearInterval(t);
  }, [playing, tree]);
  // Stop auto-play if the user navigates manually or the game changes.
  useEffect(() => { setPlaying(false); }, [gameId]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); goStart(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); goEnd(); }
      else if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, goStart, goEnd, onClose]);

  const fen = useMemo(() => (tree ? fenAt(tree, currentId) : ''), [tree, currentId]);
  const lastMove = useMemo(() => (tree ? lastMoveAt(tree, currentId) : null), [tree, currentId]);
  const activePath = useMemo(() => (tree && currentId ? new Set(pathToNode(tree, currentId)) : new Set()), [tree, currentId]);

  // Move counter for the footer (current ply / total main-line plies).
  const totalPlies = (game?.moves || []).length;
  const currentPly = currentId && tree ? pathToNode(tree, currentId).length : 0;

  // Size the board to fill the (55%) board column responsively.
  const boardColRef = useRef(null);
  const [boardSize, setBoardSize] = useState(440);
  useEffect(() => {
    const el = boardColRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setBoardSize(Math.min(w, 460));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [game]);

  // Keep the active move visible in the notation panel (like the Arena board).
  useEffect(() => {
    if (!currentId) return;
    const el = document.querySelector(`[data-nid="${currentId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentId]);

  return (
    <div style={st.backdrop} onClick={onClose}>
      <div style={st.modal} onClick={e => e.stopPropagation()}>
        {(loading || error) && <button style={st.close} onClick={onClose} aria-label="Close">×</button>}

        {loading && <div style={st.center}>Loading game…</div>}
        {error && <div style={st.center}>{error}</div>}

        {game && tree && (
          <>
            {/* ── TOP: shared header (players + opening + analyze), full width ── */}
            <GameHeader game={game} tree={tree} analyzed={analyzed} analyzing={analyzing} progress={progress} onAnalyze={runAnalysis} onClose={onClose} />

            <div style={st.body}>
            {/* ── LEFT: board only (controls live in the right footer, like Arena) ── */}
            <div style={st.leftCol} ref={boardColRef}>
              <div style={st.boardWrap}>
                <Chessboard
                  position={fen}
                  onDrop={handleDrop}
                  orientation="white"
                  boardWidth={boardSize}
                  lastMove={lastMove}
                  transitionDuration={200}
                />
              </div>
            </div>

            {/* ── RIGHT: notation panel (scrolls) + footer nav bar ── */}
            <div style={st.right}>
              {analyzeError && <div style={st.analyzeErr}>{analyzeError}</div>}

              <div style={st.notation}>
                <Notation
                  tree={tree}
                  currentId={currentId}
                  activePath={activePath}
                  onGo={go}
                />
              </div>

              {/* Footer: navigation + move counter + play (Arena-style). */}
              <div style={st.footer}>
                <button style={st.ctrl} onClick={goStart} title="Start (↑)">⏮</button>
                <button style={st.ctrl} onClick={goPrev} title="Previous (←)">◀</button>
                <div style={st.counter}>
                  <span style={st.counterCur}>{currentPly}</span>
                  <span style={st.counterSep}>/</span>
                  <span style={st.counterTot}>{totalPlies}</span>
                </div>
                <button style={st.playBtn} onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</button>
                <button style={st.ctrl} onClick={goEnd} title="End (↓)">⏭</button>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Eval bar (white share of the bar = how good for white) ────────────────────
// ── Classification card (ChessNexus-style explanation bubble) ─────────────────
function ClassCard({ classification }) {
  const meta = CLASS_META[classification];
  if (!meta) return null;
  return (
    <div style={{ ...st.card, borderColor: meta.color, boxShadow: `inset 3px 0 0 ${meta.color}` }}>
      <span style={{ ...st.cardIcon, color: meta.color }}>{meta.icon}</span>
      <div>
        <span style={{ ...st.cardBadge, background: meta.color + '22', color: meta.color }}>{meta.label}</span>
        <div style={st.cardDesc}>{meta.desc}</div>
      </div>
    </div>
  );
}

// ── Per-game tally of blunders / mistakes / inaccuracies ──────────────────────
function ClassTally({ tree }) {
  let b = 0, m = 0, i = 0;
  Object.values(tree.nodes).forEach(n => {
    if (n.classification === 'blunder') b++;
    else if (n.classification === 'mistake') m++;
    else if (n.classification === 'inaccuracy') i++;
  });
  if (!b && !m && !i) return null;
  return (
    <div style={st.tally}>
      <span style={{ color: CLASS_META.blunder.color }}>?? {b}</span>
      <span style={{ color: CLASS_META.mistake.color }}>? {m}</span>
      <span style={{ color: CLASS_META.inaccuracy.color }}>?! {i}</span>
    </div>
  );
}

// Apply per-ply analysis onto the existing tree's MAIN LINE (firstborn chain),
// leaving any user-created variations untouched. Returns a new tree object.
function annotateMainLine(tree, analysis) {
  if (!tree) return tree;
  const nodes = { ...tree.nodes };
  let curId = nodes[tree.rootId].children[0];
  let ply = 0;
  while (curId) {
    const a = analysis[ply] || {};
    const n = nodes[curId];
    nodes[curId] = {
      ...n,
      classification: a.classification ?? null,
      eval: a.eval ?? null,
      mateIn: a.mateIn ?? null,
      bestMove: a.bestMove ?? null,
      bestLine: a.bestLine ?? null
    };
    curId = n.children[0];
    ply++;
  }
  return { ...tree, nodes };
}

// Node id after walking `ply` firstborn (main-line) steps from the root.
// ply 0 (or invalid) → null (the start position). If the game is shorter than the
// requested ply, stop at the last available node so the game still opens.
function nodeAtPly(tree, ply) {
  if (!tree || !ply || ply < 1) return null;
  let cur = tree.nodes[tree.rootId];
  let id = null;
  for (let i = 0; i < ply; i++) {
    const nextId = cur.children[0];
    if (!nextId) break;
    id = nextId;
    cur = tree.nodes[nextId];
  }
  return id;
}

// Stored "Last, First" → "First Last" for readability.
function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

function GameHeader({ game, tree, analyzed, analyzing, progress, onAnalyze, onClose }) {
  const r = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½', '*': '*' }[game.result] || game.result;
  return (
    <div style={st.header}>
      <button style={st.close} onClick={onClose} aria-label="Close">×</button>
      <div style={st.matchup}>
        <span><strong>{displayName(game.white)}</strong>{game.whiteElo ? ` (${game.whiteElo})` : ''}</span>
        <span style={st.vs}>{r}</span>
        <span><strong>{displayName(game.black)}</strong>{game.blackElo ? ` (${game.blackElo})` : ''}</span>
      </div>
      {/* Analyze control → becomes the blunder/mistake/inaccuracy tally once analyzed. */}
      <div style={st.headerAnalyze}>
        {analyzed
          ? <ClassTally tree={tree} />
          : analyzing
            ? <span style={st.analyzeLabel}>Analyzing… {Math.round(progress * 100)}%</span>
            : <button style={st.analyzeBtnSm} onClick={onAnalyze} title="Find blunders, mistakes & inaccuracies">⚙ Analyze</button>}
      </div>
    </div>
  );
}

// ── Notation renderer ─────────────────────────────────────────────────────────
// Renders the main line inline; variations render as indented, parenthesized
// blocks recursively (nested variations supported).
function Notation({ tree, currentId, activePath, onGo }) {
  const root = tree.nodes[tree.rootId];

  // Render a line: emit each node, follow its FIRSTBORN child for the main
  // continuation, and render the node's OTHER children (children[1..]) as nested
  // sideline variations. Walking children (not parent siblings) keeps this a
  // strict tree traversal — no node is ever revisited, so no infinite recursion.
  const renderLine = (startNodeId, depth) => {
    const out = [];
    let cur = startNodeId;
    while (cur) {
      const node = tree.nodes[cur];
      if (!node) break;

      out.push(
        <MoveToken
          key={node.id}
          tree={tree}
          node={node}
          isCurrent={node.id === currentId}
          inActivePath={activePath.has(node.id)}
          onGo={onGo}
        />
      );

      // Sideline variations = this node's children beyond the firstborn.
      const variations = node.children.slice(1);
      variations.forEach(sid => {
        out.push(
          <div key={`var-${sid}`} style={{ ...st.variation, marginLeft: depth * 10 }}>
            ( {renderLine(sid, depth + 1)} )
          </div>
        );
      });

      cur = node.children[0] || null;
    }
    return out;
  };

  const first = root.children[0];
  if (!first) return <div style={st.empty}>No moves.</div>;
  return <div>{renderLine(first, 0)}</div>;
}

function MoveToken({ tree, node, isCurrent, onGo }) {
  // Move number: show "12." before white's move. Derive ply from path length.
  const ply = pathToNode(tree, node.id).length; // 1-based
  const isWhite = ply % 2 === 1;
  const moveNo = Math.ceil(ply / 2);
  const showNumber = isWhite;
  const meta = node.classification ? CLASS_META[node.classification] : null;

  // Colour the move text by its classification (ChessNexus-style). The current
  // move gets a solid cyan pill (matching the Arena board's active highlight).
  const baseColor = meta ? meta.color : C.text;
  const moveStyle = isCurrent
    ? { ...st.move, background: C.active, color: '#06141a', fontWeight: 700 }
    : { ...st.move, color: baseColor, fontWeight: meta ? 700 : 400 };

  return (
    <span style={st.moveTokenWrap}>
      {showNumber && <span style={st.moveNo}>{moveNo}.</span>}
      <span data-nid={node.id} style={moveStyle} onClick={() => onGo(node.id)} title={meta ? meta.label : ''}>
        {node.san}{meta && <span style={{ fontWeight: 800 }}>{meta.symbol}</span>}
      </span>
    </span>
  );
}

// ── Obsidian glass dark theme tokens (mirrors MasterGames page) ───────────────
const C = {
  glass: 'rgba(20, 24, 32, 0.92)',
  panel: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0',
  textMut: '#8b93a7',
  textFaint: '#5d6577',
  accent: '#a78bfa',
  active: '#22d3ee'   // cyan active-move pill (matches the Arena board)
};

const st = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { position: 'relative', background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.border}`, borderRadius: 18, width: 'min(940px, 96vw)', minHeight: 'min(620px, 90vh)', maxHeight: '94vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.65)', fontFamily: 'Poppins, sans-serif', color: C.text },
  close: { position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', border: 'none', background: 'transparent', fontSize: 26, lineHeight: 1, cursor: 'pointer', color: C.textMut, zIndex: 4 },
  center: { padding: 60, textAlign: 'center', color: C.textMut },
  body: { display: 'flex', gap: 16, padding: '1px 20px 20px', alignItems: 'flex-start' },

  // 55% board / 45% notation split (side by side; min-widths kept small so the
  // gap never forces a wrap to two rows).
  leftCol: { flex: '0 0 55%', minWidth: 0, display: 'flex', flexDirection: 'column' },
  boardRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  // The Chessboard reserves ~32px of coordinate padding on ALL sides but only
  // draws coords on bottom+left, so the top is empty space. Pull the board up to
  // sit flush under the header (clip the wasted top padding).
  boardWrap: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: -28, overflow: 'hidden' },

  right: { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' },

  // Footer nav bar (Arena-style): round buttons + a current/total move counter + play.
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` },
  ctrl: { width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.borderStrong}`, background: C.panel, color: C.text, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  playBtn: { width: 38, height: 38, borderRadius: '50%', border: `2px solid ${C.accent}`, background: 'rgba(167,139,250,0.16)', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  counter: { display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 56, justifyContent: 'center', fontVariantNumeric: 'tabular-nums' },
  counterCur: { fontSize: 15, fontWeight: 800, color: '#fff' },
  counterSep: { color: C.textFaint },
  counterTot: { color: C.textMut, fontSize: 14 },

  // Full-width shared header on top: players row + opening below, centered.
  // Sticky so it never scrolls under the rounded modal top (fixes the clipping).
  header: { position: 'sticky', top: 0, zIndex: 3, background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottom: `1px solid ${C.border}`, padding: '10px 52px 8px', textAlign: 'center' },
  matchup: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, fontSize: 15, color: '#fff', flexWrap: 'wrap' },
  vs: { color: C.accent, fontWeight: 700 },
  headerMeta: { color: C.textMut, fontSize: 13, marginTop: 6 },
  headerAnalyze: { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' },

  // Small toolbar above the notation: tally / subtle analyze button / reset.
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, minHeight: 30 },
  tally: { display: 'flex', gap: 14, fontSize: 13, fontWeight: 700 },
  analyzeBtnSm: { padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: 'rgba(167,139,250,0.16)', color: C.accent, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  analyzeInline: { flex: 1, display: 'flex', alignItems: 'center', gap: 8 },
  analyzeErr: { color: '#fca5a5', fontSize: 12, marginBottom: 6 },
  analyzeLabel: { color: C.text, fontSize: 12, whiteSpace: 'nowrap' },
  progressTrack: { height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', background: C.accent, transition: 'width 200ms ease' },

  notation: { flex: '0 0 auto', height: 390, overflowY: 'auto', lineHeight: 2.1, fontSize: 15, color: C.text, background: 'rgba(0,0,0,0.18)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' },
  hint: { color: C.textFaint, fontSize: 11, marginTop: 10, paddingTop: 8 },
  resetBtn: { flexShrink: 0, padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: 'rgba(255,255,255,0.04)', color: C.textMut, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' },

  card: { display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10, padding: '10px 12px', background: C.panel, border: '1px solid', borderRadius: 10 },
  cardIcon: { fontSize: 18, fontWeight: 800, lineHeight: 1.2 },
  cardBadge: { display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardDesc: { color: C.text, fontSize: 13, marginTop: 6, opacity: 0.9 },

  moveTokenWrap: { display: 'inline-flex', alignItems: 'center', marginRight: 6 },
  moveNo: { color: C.textFaint, marginRight: 4, fontVariantNumeric: 'tabular-nums' },
  move: { cursor: 'pointer', padding: '2px 6px', borderRadius: 6 },
  variation: { display: 'block', color: C.textMut, fontSize: 13, margin: '2px 0', paddingLeft: 6, borderLeft: `2px solid ${C.border}` },
  empty: { color: C.textFaint, padding: 12 }
};
