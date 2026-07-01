import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../api';
import { Chess } from 'chess.js';
import Chessboard from '../Chessboard';
import stockfishService from '../../services/stockfishService';
import GameAnalysisModal from './GameAnalysisModal';
import {
  buildTreeFromGame, applyMove, pathToNode,
  nextNode, prevNode, lastNode, fenAt, lastMoveAt
} from './moveTree';

// ── Opening Study card (Master Games home page) ───────────────────────────────
// A Lichess-study-style opening trainer that sits above the featured players.
//
//   LEFT card  : an interactive board. Play any legal move → the study tree grows;
//                replaying a move continues the line, a new move branches a variation.
//   RIGHT card : ⚙ Stockfish button → live 3-line PV (MultiPV) for the current
//                position; the move list (with variations) below it; forward/back
//                nav at the bottom; then a Masters DB / ChessNexus DB toggle whose
//                results — an opening explorer (next-move stats + matching games) —
//                render in this same right card with its own scroll. Clicking a
//                MASTERS game opens the analysis popup starting at the studied moves.
//
// Nothing is persisted: this all lives in component state, so leaving or reloading
// the page starts fresh (by design).

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const RESULT_LABEL = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½', '*': '*' };

export default function OpeningStudy() {
  // Empty tree (start position only) — the user builds the whole thing.
  const [tree, setTree] = useState(() => buildTreeFromGame([], []));
  const [currentId, setCurrentId] = useState(null);        // null = start position
  const [orientation, setOrientation] = useState('white');

  // Stockfish panel
  const [engineOn, setEngineOn] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [pvLines, setPvLines] = useState([]);              // [{ k, scoreType, score, depth, pvSan:[..] }]
  const [engineDepth, setEngineDepth] = useState(0);
  const engineAbort = useRef(0);                            // bumps to invalidate stale async results

  // Explorer (DB) panel. Only the Masters DB is wired for now — the ChessNexus
  // (arena) source is hidden until there are enough arena games to be useful.
  const [dbOpen, setDbOpen] = useState(false);             // is the Masters explorer shown?
  const dbSource = 'masters';
  const [explorer, setExplorer] = useState(null);          // { total, moves:[...], games:[...] }
  const [exLoading, setExLoading] = useState(false);

  // Masters game popup (opens at the studied ply)
  const [openGame, setOpenGame] = useState(null);          // { id, initialPly }

  const fen = useMemo(() => fenAt(tree, currentId), [tree, currentId]);
  const lastMove = useMemo(() => lastMoveAt(tree, currentId), [tree, currentId]);
  const activePath = useMemo(
    () => (currentId ? new Set(pathToNode(tree, currentId)) : new Set()),
    [tree, currentId]
  );
  // The SAN moves from the start down to the current node = the "line" we explore.
  const linePrefix = useMemo(() => {
    if (!currentId) return [];
    return pathToNode(tree, currentId).map(id => tree.nodes[id].san);
  }, [tree, currentId]);
  const currentPly = linePrefix.length;

  // ── Board move → grow the study tree ──
  const handleDrop = useCallback((from, to, promotion) => {
    const res = applyMove(tree, currentId || tree.rootId, { from, to, promotion: promotion || 'q' });
    if (!res) return false;
    setTree(res.tree);
    setCurrentId(res.nodeId);
    return true;
  }, [tree, currentId]);

  // ── Navigation ──
  const goStart = useCallback(() => setCurrentId(null), []);
  const goPrev = useCallback(() => setCurrentId(prevNode(tree, currentId)), [tree, currentId]);
  const goNext = useCallback(() => {
    const nxt = currentId ? nextNode(tree, currentId) : (tree.nodes[tree.rootId].children[0] || null);
    if (nxt) setCurrentId(nxt);
  }, [tree, currentId]);
  const goEnd = useCallback(() => setCurrentId(lastNode(tree, currentId || tree.rootId)), [tree, currentId]);

  // Keyboard nav (only when not focused in an input).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // ── Stockfish: init once when turned on; quit on unmount ──
  useEffect(() => {
    if (!engineOn) return;
    let alive = true;
    if (!stockfishService.isReady()) {
      stockfishService.init()
        .then(() => { if (alive) setEngineReady(true); })
        .catch(() => { if (alive) { setEngineReady(false); setEngineOn(false); } });
    } else {
      setEngineReady(true);
    }
    return () => { alive = false; };
  }, [engineOn]);

  // Quit the engine when the whole panel unmounts (leaving the page).
  useEffect(() => () => { try { stockfishService.quit(); } catch { /* ignore */ } }, []);

  // Analyse the current position whenever it changes (while the engine is on).
  useEffect(() => {
    if (!engineOn || !engineReady) { setPvLines([]); setEngineDepth(0); return; }
    const token = ++engineAbort.current;
    setPvLines([]); setEngineDepth(0);
    stockfishService.analyzePosition(fen, {
      depth: 20, multipv: 3,
      onUpdate: ({ depth, lines }) => {
        if (token !== engineAbort.current) return;         // a newer position superseded this
        setEngineDepth(depth);
        setPvLines(lines.map(l => ({ ...l, pvSan: uciPvToSan(fen, l.pv) })));
      }
    }).catch(() => { /* engine stopped / superseded */ });
    return () => { stockfishService.stop(); };
  }, [fen, engineOn, engineReady]);

  // ── Explorer: (re)load when opened or the current line changes ──
  useEffect(() => {
    if (!dbOpen) { setExplorer(null); return; }
    let alive = true;
    setExLoading(true);
    api.get('/api/master-games/explorer', {
      params: { source: dbSource, moves: linePrefix.join(','), limit: 24 }
    })
      .then(res => { if (alive) setExplorer(res.data); })
      .catch(() => { if (alive) setExplorer({ total: 0, moves: [], games: [] }); })
      .finally(() => { if (alive) setExLoading(false); });
    return () => { alive = false; };
  }, [dbOpen, linePrefix]);

  // Play an explorer "next move" onto the board (SAN).
  const playSan = useCallback((san) => {
    const res = applyMove(tree, currentId || tree.rootId, san);
    if (!res) return;
    setTree(res.tree);
    setCurrentId(res.nodeId);
  }, [tree, currentId]);

  const resetStudy = useCallback(() => {
    setTree(buildTreeFromGame([], []));
    setCurrentId(null);
  }, []);

  // Board sizing — an auto "fit to card" size PLUS a user drag delta, so the board
  // auto-fits the layout but the user can also grow/shrink it with the corner handle.
  const boardColRef = useRef(null);
  const [fitSize, setFitSize] = useState(420);       // computed from the card width
  const [userScale, setUserScale] = useState(0);      // px the user has dragged (+/-)
  // Final board size = fit + user delta, clamped to sane bounds.
  const boardSize = Math.max(240, Math.min(fitSize + userScale, 620));
  const dragRef = useRef(null);                        // { startX, startY, startScale }

  useEffect(() => {
    const el = boardColRef.current;
    if (!el) return;

    // The board keeps its LEFT and RIGHT coordinate margins (32px each = 64px total).
    // Subtract that (plus slack) so the full board + labels fit inside the card
    // without overflowing or clipping the h-file.
    const measure = () => {
      const cs = window.getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
      const w = Math.floor(el.clientWidth - padX);
      if (w > 0) setFitSize(Math.max(240, Math.min(w - 72, 420)));
    };

    measure(); // initial

    // Primary: ResizeObserver on the card. Fallback: window resize / orientation
    // change (covers browsers/layouts where the card's own resize doesn't fire).
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  // ── Drag-to-resize (bottom-right corner handle) ──
  // The handle sits at the board's bottom-right corner, so dragging it DOWN-RIGHT
  // (away from the board center) grows the board and UP-LEFT shrinks it. We track
  // the pointer and adjust userScale by the average of the two axes' movement.
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: pt.clientX, startY: pt.clientY, startScale: userScale };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const p = ev.touches ? ev.touches[0] : ev;
      const dxRight = p.clientX - dragRef.current.startX;  // drag right → positive → bigger
      const dyDown = p.clientY - dragRef.current.startY;   // drag down → positive → bigger
      const delta = (dxRight + dyDown) / 2;
      setUserScale(Math.max(-160, Math.min(200, dragRef.current.startScale + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [userScale]);

  const resetBoardSize = useCallback(() => setUserScale(0), []);

  return (
    <div style={st.wrap}>
      <div style={st.head}>
        <div>
          <h2 style={st.title}>Opening Study</h2>
          <p style={st.sub}>Play moves on the board to explore. Turn on the engine for the top 3 lines, or open the databases to see how masters continued.</p>
        </div>
        <div style={st.headBtns}>
          <button style={st.ghostBtn} onClick={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))}>⇅ Flip</button>
          <button style={st.ghostBtn} onClick={resetStudy}>↺ Reset</button>
        </div>
      </div>

      <div style={st.cards}>
        {/* ── LEFT CARD: board ── */}
        <div style={st.boardCard} ref={boardColRef}>
          <div style={st.boardArea}>
            <div style={st.boardWrap}>
              <Chessboard
                position={fen}
                onDrop={handleDrop}
                orientation={orientation}
                boardWidth={boardSize}
                lastMove={lastMove}
                transitionDuration={180}
              />
            </div>
            {/* Drag-to-resize handle (bottom-left corner). Double-click resets size. */}
            <div
              style={st.resizeHandle}
              onMouseDown={onResizeStart}
              onTouchStart={onResizeStart}
              onDoubleClick={resetBoardSize}
              title="Drag to resize the board · double-click to reset"
            >
              {/* Classic corner grip: short parallel lines stepping into the
                  bottom-right corner (each runs bottom-left → top-right). */}
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
                <path d="M13 1 L1 13 M13 6 L6 13 M13 11 L11 13" stroke={C.textMut} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── RIGHT CARD: toolbar (Stockfish + Masters DB) + engine PV + notation + nav ── */}
        <div style={st.rightCard}>
          {/* Toolbar row: Stockfish (grows) and a narrower Masters DB toggle, side by side */}
          <div style={st.toolbar}>
            <button
              style={{ ...st.engineBtn, ...(engineOn ? st.engineBtnOn : {}) }}
              onClick={() => setEngineOn(v => !v)}
            >
              ⚙ Stockfish {engineOn ? 'on' : 'off'}
            </button>
            {engineOn && (
              <span style={st.depthTag}>
                {engineReady ? `depth ${engineDepth}` : 'starting…'}
              </span>
            )}
            <span style={{ flex: 1 }} />
            {/* Masters DB toggle (narrower; ChessNexus/arena source hidden for now) */}
            <button
              style={{ ...st.dbBtn, ...(dbOpen ? st.dbBtnOn : {}) }}
              onClick={() => setDbOpen(v => !v)}
            >Masters DB</button>
          </div>

          {/* Explorer results — floating overlay LAYERED OVER the engine + notation
              (higher z-index, doesn't push the cards down). Close with × or the toggle. */}
          {dbOpen && (
            <div style={st.explorerOverlay}>
              <button style={st.explorerClose} onClick={() => setDbOpen(false)} aria-label="Close">×</button>
              {exLoading && <div style={st.exMuted}>Loading…</div>}
              {!exLoading && explorer && (
                <Explorer
                  data={explorer}
                  source={dbSource}
                  onPlay={playSan}
                  onOpenGame={(id) => setOpenGame({ id, initialPly: currentPly })}
                />
              )}
            </div>
          )}

          {/* 3-line PV */}
          {engineOn && (
            <div style={st.pvBox}>
              {pvLines.length === 0 && <div style={st.pvEmpty}>Analysing…</div>}
              {pvLines.map(line => (
                <div key={line.k} style={st.pvRow}>
                  <span style={st.pvEval}>{formatScore(line, fen)}</span>
                  <span style={st.pvMoves}>{line.pvSan?.slice(0, 12).join(' ') || '…'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notation (study move list with variations) */}
          <div style={st.notation}>
            <Notation tree={tree} currentId={currentId} activePath={activePath} onGo={setCurrentId} />
          </div>

          {/* Nav bar */}
          <div style={st.nav}>
            <button style={st.navBtn} onClick={goStart} title="Start">⏮</button>
            <button style={st.navBtn} onClick={goPrev} title="Back (←)">◀</button>
            <span style={st.plyTag}>{currentPly}</span>
            <button style={st.navBtn} onClick={goNext} title="Forward (→)">▶</button>
            <button style={st.navBtn} onClick={goEnd} title="End">⏭</button>
          </div>
        </div>
      </div>

      {openGame && (
        <GameAnalysisModal
          gameId={openGame.id}
          initialPly={openGame.initialPly}
          onClose={() => setOpenGame(null)}
        />
      )}
    </div>
  );
}

// ── Explorer sub-panel: next-move stats table + matching games list ───────────
function Explorer({ data, source, onPlay, onOpenGame }) {
  const total = data.total || 0;
  const moves = data.moves || [];
  const games = data.games || [];
  const maxGames = Math.max(1, ...moves.map(m => m.games));

  return (
    <>
      <div style={st.exHeader}>
        {total.toLocaleString()} {source === 'arena' ? 'arena' : 'master'} game{total === 1 ? '' : 's'} reached this position
      </div>

      {/* Next-move distribution */}
      {moves.length > 0 && (
        <div style={st.moveTable}>
          {moves.map(m => {
            const g = m.games || 1;
            const wPct = Math.round((m.white / g) * 100);
            const dPct = Math.round((m.draw / g) * 100);
            const bPct = 100 - wPct - dPct;
            return (
              <button key={m.san} style={st.moveTableRow} onClick={() => onPlay(m.san)} title={`Play ${m.san}`}>
                <span style={st.mtSan}>{m.san}</span>
                <span style={st.mtCount}>
                  <span style={st.mtBar}><span style={{ ...st.mtBarFill, width: `${(m.games / maxGames) * 100}%` }} /></span>
                  {m.games.toLocaleString()}
                </span>
                <span style={st.wdl}>
                  <span style={{ ...st.wdlSeg, background: '#e8e8e8', color: '#111', width: `${wPct}%` }}>{wPct > 12 ? `${wPct}%` : ''}</span>
                  <span style={{ ...st.wdlSeg, background: '#8b93a7', color: '#fff', width: `${dPct}%` }}>{dPct > 12 ? `${dPct}%` : ''}</span>
                  <span style={{ ...st.wdlSeg, background: '#3a3f4b', color: '#fff', width: `${bPct}%` }}>{bPct > 12 ? `${bPct}%` : ''}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Matching games */}
      <div style={st.gamesList}>
        {games.length === 0 && <div style={st.exMuted}>No games at this position.</div>}
        {games.map(g => {
          const clickable = source === 'masters';
          return (
            <div
              key={g._id}
              style={{ ...st.gameRow, cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.85 }}
              onClick={clickable ? () => onOpenGame(g._id) : undefined}
              title={clickable ? 'Open this game from the current position' : ''}
            >
              <div style={st.gamePlayers}>
                <span>{displayName(g.white)}{g.whiteElo ? ` (${g.whiteElo})` : ''}</span>
                <span style={st.gameRes}>{RESULT_LABEL[g.result] || g.result}</span>
                <span>{displayName(g.black)}{g.blackElo ? ` (${g.blackElo})` : ''}</span>
              </div>
              <div style={st.gameMeta}>
                {[g.event, g.year].filter(Boolean).join(' · ')}
                {clickable && <span style={st.openArrow}>›</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Notation renderer (main line inline + nested variations) ──────────────────
function Notation({ tree, currentId, activePath, onGo }) {
  const root = tree.nodes[tree.rootId];
  const renderLine = (startNodeId, depth) => {
    const out = [];
    let cur = startNodeId;
    while (cur) {
      const node = tree.nodes[cur];
      if (!node) break;
      out.push(
        <MoveToken key={node.id} tree={tree} node={node}
          isCurrent={node.id === currentId} inActivePath={activePath.has(node.id)} onGo={onGo} />
      );
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
  if (!first) return <div style={st.empty}>Play a move on the board to begin your study line.</div>;
  return <div>{renderLine(first, 0)}</div>;
}

function MoveToken({ tree, node, isCurrent, onGo }) {
  const ply = pathToNode(tree, node.id).length;
  const isWhite = ply % 2 === 1;
  const moveNo = Math.ceil(ply / 2);
  const moveStyle = isCurrent
    ? { ...st.move, background: C.active, color: '#06141a', fontWeight: 700 }
    : st.move;
  return (
    <span style={st.moveTokenWrap}>
      {isWhite && <span style={st.moveNo}>{moveNo}.</span>}
      <span data-nid={node.id} style={moveStyle} onClick={() => onGo(node.id)}>{node.san}</span>
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Convert an engine PV (UCI moves) to SAN for display, from a given FEN.
function uciPvToSan(fen, pvUci) {
  if (!Array.isArray(pvUci) || !pvUci.length) return [];
  try {
    const c = new Chess(fen && fen !== 'start' ? fen : START_FEN);
    const out = [];
    for (const uci of pvUci) {
      if (!uci || uci.length < 4) break;
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (!mv) break;
      out.push(mv.san);
    }
    return out;
  } catch { return []; }
}

// Format a PV score from the side-to-move's engine value into a white-relative
// "+1.2" / "M3" string (so the sign always means "good for white").
function formatScore(line, fen) {
  const whiteToMove = (fen || '').split(' ')[1] !== 'b';
  const sign = whiteToMove ? 1 : -1;
  if (line.scoreType === 'mate') {
    const m = sign * line.score;
    return `M${Math.abs(m)}${m < 0 ? '⁻' : ''}`.replace('⁻', '');
  }
  const pawns = (sign * line.score) / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

// ── Theme (mirrors the Master Games home page) ────────────────────────────────
const C = {
  glass: 'rgba(22, 26, 34, 0.66)',
  glassSolid: '#12151c',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0',
  textMut: '#8b93a7',
  textFaint: '#5d6577',
  accent: '#a78bfa',
  active: '#22d3ee'
};

const st = {
  wrap: { marginBottom: 28 },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  sub: { color: C.textMut, fontSize: 13, margin: '4px 0 0', maxWidth: 560 },
  headBtns: { display: 'flex', gap: 8, flexShrink: 0 },
  ghostBtn: { padding: '7px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontSize: 13 },

  cards: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' },

  boardCard: { flex: '1 1 380px', minWidth: 300, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  // The Chessboard reserves a 32px coordinate margin on ALL FOUR sides but only
  // DRAWS labels on bottom + left. We only trim the empty TOP margin (safe — no
  // labels there); the left/right/bottom margins are LEFT INTACT so the a–h files
  // and 1–8 ranks are never clipped. boardArea wraps the board's natural footprint.
  boardArea: { position: 'relative', flex: '0 0 auto', display: 'inline-flex' },
  boardWrap: { display: 'flex', justifyContent: 'center', marginTop: -26, overflow: 'visible' },
  // Drag-to-resize grip, tucked into the board's bottom-right coordinate margin.
  resizeHandle: { position: 'absolute', right: 0, bottom: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'nwse-resize', borderRadius: 6, background: 'rgba(18,21,28,0.85)', border: `1px solid ${C.border}`, zIndex: 5, touchAction: 'none' },

  rightCard: { position: 'relative', flex: '1 1 380px', minWidth: 300, maxWidth: 480, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },

  // Toolbar: Stockfish button (left) + Masters DB toggle (right), on one row.
  toolbar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  engineBtn: { padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  engineBtnOn: { background: 'rgba(167,139,250,0.18)', color: C.accent, borderColor: C.accent },
  depthTag: { fontSize: 12, color: C.textFaint },

  pvBox: { background: 'rgba(0,0,0,0.22)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 8px', marginBottom: 10, minHeight: 70 },
  pvEmpty: { color: C.textFaint, fontSize: 12, padding: '6px 2px' },
  pvRow: { display: 'flex', gap: 8, alignItems: 'baseline', padding: '3px 2px', fontSize: 13 },
  pvEval: { fontWeight: 800, color: '#fff', minWidth: 46, fontVariantNumeric: 'tabular-nums' },
  pvMoves: { color: C.textMut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  notation: { flex: '1 1 auto', minHeight: 260, maxHeight: 380, overflowY: 'auto', lineHeight: 2.2, fontSize: 17, color: C.text, background: 'rgba(0,0,0,0.18)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' },
  empty: { color: C.textFaint, fontSize: 15, padding: 6 },
  moveTokenWrap: { display: 'inline-flex', alignItems: 'center', marginRight: 8 },
  moveNo: { color: C.textFaint, marginRight: 5, fontVariantNumeric: 'tabular-nums' },
  move: { cursor: 'pointer', padding: '2px 7px', borderRadius: 6, color: C.text },
  variation: { display: 'block', color: C.textMut, fontSize: 15, margin: '3px 0', paddingLeft: 8, borderLeft: `2px solid ${C.border}` },

  nav: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` },
  navBtn: { width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.borderStrong}`, background: C.glassSolid, color: C.text, cursor: 'pointer', fontSize: 12 },
  plyTag: { minWidth: 28, textAlign: 'center', color: C.textMut, fontVariantNumeric: 'tabular-nums', fontWeight: 700 },

  // Narrow, fixed-width Masters DB toggle (sits at the right end of the toolbar).
  dbBtn: { flex: '0 0 auto', padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  dbBtnOn: { background: 'rgba(34,211,238,0.14)', color: C.active, borderColor: C.active },

  // Floating overlay that layers OVER the engine/notation cards (z-index), rather
  // than pushing them down. Anchored just under the Masters DB toggle button.
  explorerOverlay: { position: 'absolute', top: 56, left: 14, right: 14, bottom: 14, zIndex: 20, background: C.glassSolid, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: '12px 14px 14px', overflowY: 'auto', boxShadow: '0 18px 50px rgba(0,0,0,0.6)' },
  explorerClose: { position: 'absolute', top: 6, right: 8, width: 26, height: 26, border: 'none', background: 'transparent', color: C.textMut, fontSize: 22, lineHeight: 1, cursor: 'pointer', zIndex: 2 },
  exMuted: { color: C.textFaint, fontSize: 13, padding: 6 },
  exHeader: { fontSize: 12, color: C.textMut, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },

  moveTable: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 },
  moveTableRow: { display: 'grid', gridTemplateColumns: '52px 1fr 90px', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' },
  mtSan: { fontWeight: 700, color: '#fff' },
  mtCount: { display: 'flex', alignItems: 'center', gap: 8, color: C.textMut, fontSize: 12 },
  mtBar: { flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' },
  mtBarFill: { display: 'block', height: '100%', background: C.accent },
  wdl: { display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', border: `1px solid ${C.border}` },
  wdlSeg: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, overflow: 'hidden' },

  gamesList: { display: 'flex', flexDirection: 'column', gap: 6 },
  gameRow: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' },
  gamePlayers: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', flexWrap: 'wrap' },
  gameRes: { color: C.accent, fontWeight: 700 },
  gameMeta: { fontSize: 11.5, color: C.textFaint, marginTop: 3, display: 'flex', justifyContent: 'space-between' },
  openArrow: { color: C.accent, fontWeight: 700 }
};
