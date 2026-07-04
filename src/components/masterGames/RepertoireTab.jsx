// components/masterGames/RepertoireTab.jsx
//
// The "My Repertoire" tab inside Opening Study. Three modes:
//   Build  — play a line on the board (master explorer beside it) and SAVE it.
//   Train  — spaced-repetition drill of your DUE lines (you play the moves).
//   Check  — scan your real games for "you left your prep" deviations.
// Premium-gated (mirrors Books / Endgame trainer): locked until free / unlocked /
// supporter / privileged. Reuses moveTree + Chessboard + the master explorer API.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import api from '../../api';
import Chessboard from '../Chessboard';
import EnginePanel from '../EnginePanel';
import { buildTreeFromGame, applyMove, pathToNode, fenAt, lastMoveAt, firstNode, nextNode, prevNode, lastNode, rehydrateTree, hasVariations } from './moveTree';

// localStorage key for the in-progress (unsaved) build, so a reload doesn't lose it.
const DRAFT_KEY = 'repertoireBuildDraft';
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.tree) return null;
    return { tree: rehydrateTree(d.tree), currentId: d.currentId || null, side: d.side === 'black' ? 'black' : 'white', name: d.name || '' };
  } catch { return null; }
}

// ── Lichess-style move list over a move TREE ─────────────────────────────────
// Main line = a 2-column numbered table (White | Black). Whenever a main-line move
// has a comment or a real sideline (2nd+ child), a full-width block is inserted
// right after it: the comment text, then each variation rendered inline as (…).
// activeId = current node (highlight). onGo(nodeId) selects a move.

// Move number label for a variation's first move ("N." white / "N…" black).
function vNum(ply) {
  const no = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${no}.` : `${no}…`;
}

// Render a variation (a sideline) inline: "d5 4.exd5 Na5 …", following firstborn,
// and recursing into its own nested sidelines/comments as parenthesised groups.
function VariationInline({ tree, nodeId, ply, activeId, onGo, first }) {
  const out = [];
  let cur = nodeId; let p = ply; let showNum = first;
  while (cur) {
    const id = cur; // block-scoped copy so each onClick closes over the RIGHT id
    const n = tree.nodes[id];
    if (!n || !n.san) break;
    const label = p % 2 === 1 ? `${Math.ceil(p / 2)}.` : (showNum ? `${Math.ceil(p / 2)}…` : '');
    out.push(
      <span key={id}>
        {label && <span style={mt.vnum}>{label}</span>}
        <span style={{ ...mt.vmove, ...(id === activeId ? mt.moveActive : {}) }} onClick={() => onGo(id)}>{n.san}</span>{' '}
      </span>
    );
    if (n.comment) out.push(<span key={`c${id}`} style={mt.vcomment}>{n.comment} </span>);
    const kids = n.children || [];
    for (let i = 1; i < kids.length; i++) {
      out.push(<span key={`v${id}-${i}`}>(<VariationInline tree={tree} nodeId={kids[i]} ply={p + 1} activeId={activeId} onGo={onGo} first />) </span>);
    }
    cur = kids[0] || null; p += 1; showNum = kids.length > 1; // after a branch, re-show black number
  }
  return <>{out}</>;
}

function MoveList({ tree, activeId, onGo }) {
  const root = tree?.nodes?.[tree?.rootId];
  if (!root || (root.children || []).length === 0) {
    return <div style={{ ...mt.wrap, color: '#5d6577', padding: 14 }}>Play moves on the board to build your line.</div>;
  }
  // Walk the main line (firstborn chain) collecting nodes.
  const main = [];
  let cur = root;
  while (cur && (cur.children || []).length) { const c = tree.nodes[cur.children[0]]; if (!c) break; main.push({ node: c, parent: cur }); cur = c; }

  const cellFor = (item) => {
    if (!item) return <span style={{ color: '#5d6577' }}>…</span>;
    const n = item.node;
    return <span style={{ ...mt.move, ...(n.id === activeId ? mt.moveActive : {}), ...(n.comment ? mt.moveNoted : {}) }} onClick={() => onGo(n.id)}>{n.san}</span>;
  };

  // Group main line into rows of (white, black), and after each move emit its
  // comment + sidelines block if present.
  const rows = [];
  for (let i = 0; i < main.length; i += 2) {
    rows.push({ no: i / 2 + 1, white: main[i], black: main[i + 1] || null });
  }

  const extras = (item) => {
    if (!item) return null;
    const n = item.node;
    const hasSide = (n.children || []).length > 1;
    if (!n.comment && !hasSide) return null;
    return (
      <div style={mt.commentRow} key={`x${n.id}`}>
        {n.comment && <span>{n.comment} </span>}
        {(n.children || []).slice(1).map((cid, i) => (
          <span key={cid} style={mt.varBlock}>(<VariationInline tree={tree} nodeId={cid} ply={main.indexOf(item) + 2} activeId={activeId} onGo={onGo} first />)</span>
        ))}
      </div>
    );
  };

  return (
    <div style={mt.wrap}>
      {rows.map((r) => (
        <React.Fragment key={r.no}>
          <div style={mt.row}>
            <span style={mt.num}>{r.no}</span>
            <span style={mt.col}>{cellFor(r.white)}</span>
            <span style={mt.col}>{cellFor(r.black)}</span>
          </div>
          {extras(r.white)}
          {extras(r.black)}
        </React.Fragment>
      ))}
    </div>
  );
}

const mt = {
  wrap: { background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', fontSize: 15 },
  row: { display: 'grid', gridTemplateColumns: '44px 1fr 1fr', alignItems: 'stretch' },
  num: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b93a7', background: 'rgba(255,255,255,0.03)', fontVariantNumeric: 'tabular-nums', padding: '6px 0', fontSize: 13 },
  col: { padding: '6px 12px', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' },
  move: { cursor: 'pointer', padding: '2px 8px', borderRadius: 6, color: '#e7eaf0', fontWeight: 700 },
  moveActive: { background: '#2563eb', color: '#fff' },
  moveNoted: { borderBottom: '2px solid #f5c451' },
  commentRow: { padding: '8px 14px', color: '#cbd5e1', fontSize: 13.5, background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.6 },
  varBlock: { color: '#8b93a7' },
  vnum: { color: '#5d6577', marginRight: 2 },
  vmove: { cursor: 'pointer', color: '#a9b2c6', fontWeight: 600 },
  vcomment: { fontStyle: 'italic', color: '#cbd5e1' },
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const C = {
  glass: 'rgba(22, 26, 34, 0.66)', glassSolid: '#12151c',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0', textMut: '#8b93a7', textFaint: '#5d6577',
  accent: '#a78bfa', active: '#22d3ee', gold: '#f5c451',
  good: '#34d399', bad: '#f87171',
};

const st = {
  modeBar: { display: 'flex', gap: 6, marginBottom: 14 },
  mode: { padding: '7px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  modeOn: { background: 'rgba(34,211,238,0.14)', color: C.active, borderColor: C.active },
  cards: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' },
  boardCard: { flex: '0 0 auto', background: C.glass, border: `1px solid ${C.border}`, borderRadius: 16, padding: 10, alignSelf: 'flex-start', display: 'inline-flex', flexDirection: 'column' },
  // Chessboard reserves a 32px coordinate margin on all sides but only draws labels
  // bottom+left; pull up to trim the empty TOP margin (matches OpeningStudy).
  boardArea: { position: 'relative', display: 'inline-flex', lineHeight: 0, marginTop: -26, overflow: 'visible' },
  resizeHandle: { position: 'absolute', right: 2, bottom: 2, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'nwse-resize', borderRadius: 6, background: 'rgba(18,21,28,0.85)', border: `1px solid ${C.border}`, zIndex: 5, touchAction: 'none' },
  rightCard: { flex: '1 1 320px', minWidth: 280, background: C.glass, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, minHeight: '78vh', maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  rightScroll: { overflowY: 'auto', flex: '1 1 auto', minHeight: 220 },
  rightPinned: { flexShrink: 0, paddingTop: 12, marginTop: 4, borderTop: `1px solid ${C.border}` },
  h: { fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
  sub: { color: C.textMut, fontSize: 12.5, margin: '0 0 12px' },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  input: { padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: 13 },
  btn: { padding: '8px 14px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7c5cf0)`, color: '#0a0713', cursor: 'pointer', fontWeight: 800, fontSize: 13 },
  ghost: { padding: '7px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontSize: 13 },
  ghostSm: { padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontSize: 12 },
  engineBtn: { padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  engineBtnSm: { padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: C.glassSolid, color: C.textMut, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  engineBtnOn: { background: 'rgba(167,139,250,0.18)', color: C.accent, borderColor: C.accent },
  lineRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' },
  sanChips: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  chip: { padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12.5, fontWeight: 600 },
  exRow: { display: 'grid', gridTemplateColumns: '48px 1fr 70px', gap: 8, alignItems: 'center', padding: '5px 6px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', color: C.text, fontSize: 13, marginBottom: 3 },
  fb: (ok) => ({ marginTop: 10, padding: '8px 12px', borderRadius: 9, fontWeight: 700, fontSize: 13, background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: ok ? C.good : C.bad }),
  locked: { padding: 24, textAlign: 'center', border: `1px solid ${C.gold}55`, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,196,81,0.10), rgba(245,196,81,0.03))' },
  goldBtn: { padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, #e0a92e)`, color: '#1a1206', cursor: 'pointer', fontWeight: 800, marginTop: 12 },

  // Full-width "Your Repertoire" section below the board.
  repSection: { marginTop: 18, background: C.glass, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 },
  repGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  repCard: { border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.02)' },
  sanChipsSmall: { display: 'flex', flexWrap: 'wrap', gap: 3 },
  chipSmall: { padding: '1px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 11.5, fontWeight: 600 },
};


export default function RepertoireTab() {
  const [access, setAccess] = useState(null); // { locked, xpPrice, walletXp, freeAccess }
  const [mode, setMode] = useState('build');   // build | train | check
  const [err, setErr] = useState('');

  const loadAccess = useCallback(async () => {
    try { const r = await api.get('/api/opening-repertoire/access'); setAccess(r.data); }
    catch { setAccess({ locked: true, xpPrice: 0, walletXp: 0 }); }
  }, []);
  useEffect(() => { loadAccess(); }, [loadAccess]);

  const unlock = async () => {
    setErr('');
    try { await api.post('/api/opening-repertoire/unlock'); await loadAccess(); }
    catch (e) { setErr(e.response?.data?.message || 'Could not unlock.'); }
  };

  if (!access) return null;

  if (access.locked) {
    return (
      <div style={st.locked}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>⭐ Opening Repertoire Trainer</div>
        <p style={{ color: C.textMut, maxWidth: 460, margin: '10px auto 0', fontSize: 14 }}>
          Build your own opening lines, get drilled on them with spaced repetition, and see exactly
          where you left your prep in real games.
        </p>
        <div style={{ color: C.text, marginTop: 12, fontWeight: 700 }}>
          Unlock for {access.xpPrice} XP · you have {access.walletXp} XP
        </div>
        <button
          style={{ ...st.goldBtn, opacity: access.walletXp < access.xpPrice ? 0.55 : 1 }}
          disabled={access.walletXp < access.xpPrice}
          onClick={unlock}
        >
          🔓 Unlock ({access.xpPrice} XP)
        </button>
        {err && <div style={{ color: C.bad, marginTop: 10, fontSize: 13 }}>{err}</div>}
        <div style={{ color: C.textFaint, fontSize: 12, marginTop: 10 }}>Supporters and coaches have free access.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={st.modeBar}>
        {[['build', '➕ Build'], ['train', '🎯 Train'], ['check', '🔍 Check my games']].map(([m, label]) => (
          <button key={m} style={{ ...st.mode, ...(mode === m ? st.modeOn : {}) }} onClick={() => setMode(m)}>{label}</button>
        ))}
      </div>
      {mode === 'build' && <BuildMode access={access} onWalletChange={loadAccess} />}
      {mode === 'train' && <TrainMode />}
      {mode === 'check' && <CheckMode />}
    </div>
  );
}

// ── BUILD ─────────────────────────────────────────────────────────────────────
function BuildMode({ access, onWalletChange }) {
  // Per-save XP cost (admin-set). 0 or free-saves group → saving is free.
  const savePrice = access?.freeSaves ? 0 : (access?.saveLinePrice || 0);
  // Restore any in-progress build from localStorage (survives reload).
  const draft = useRef(loadDraft()).current;
  const [side, setSide] = useState(draft?.side || 'white');
  const [tree, setTree] = useState(() => draft?.tree || buildTreeFromGame([], []));
  const [currentId, setCurrentId] = useState(draft?.currentId ?? null);
  const [explorer, setExplorer] = useState(null);
  const [name, setName] = useState(draft?.name || '');
  const [lines, setLines] = useState([]);

  // Drag-to-resize board (bottom-right handle). Base 420, clamp 300–620.
  const [boardSize, setBoardSize] = useState(420);
  const dragRef = useRef(null);
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: pt.clientX, startY: pt.clientY, startSize: boardSize };
    const onMove = (ev) => {
      if (!dragRef.current) return;
      const p = ev.touches ? ev.touches[0] : ev;
      const delta = ((p.clientX - dragRef.current.startX) + (p.clientY - dragRef.current.startY)) / 2;
      setBoardSize(Math.max(300, Math.min(620, dragRef.current.startSize + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false }); window.addEventListener('touchend', onUp);
  }, [boardSize]);
  const resetBoardSize = useCallback(() => setBoardSize(420), []);
  const [msg, setMsg] = useState('');
  const [engineOn, setEngineOn] = useState(false);
  const [engineLines, setEngineLines] = useState(3); // MultiPV count (user-chosen)
  const [dbOn, setDbOn] = useState(false); // "Masters play here" explorer, off by default

  // Browser fullscreen (whole tab). requestFullscreen on the wrapper element.
  const wrapRef = useRef(null);
  const [isFull, setIsFull] = useState(false);
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  // Resolve the board FEN + last move by REPLAYING the path from root — works for
  // main line AND sidelines regardless of any stored-fen quirks.
  const { fen, lastMove } = useMemo(() => {
    const startFen = tree.nodes[tree.rootId]?.fen || START_FEN;
    if (!currentId) return { fen: startFen, lastMove: null };
    const ids = pathToNode(tree, currentId);
    try {
      const c = new Chess(startFen);
      let last = null;
      for (const id of ids) {
        const mv = c.move(tree.nodes[id].san, { sloppy: true });
        if (mv) last = { from: mv.from, to: mv.to };
      }
      return { fen: c.fen(), lastMove: last };
    } catch {
      return { fen: fenAt(tree, currentId), lastMove: lastMoveAt(tree, currentId) };
    }
  }, [tree, currentId]);
  const currentNode = currentId ? tree.nodes[currentId] : null;
  const hasMoves = (tree.nodes[tree.rootId]?.children || []).length > 0;
  // SAN prefix to the current node (for the master explorer + draft key).
  const sans = useMemo(() => (currentId ? pathToNode(tree, currentId).map(id => tree.nodes[id].san) : []), [tree, currentId]);

  // Click a move in the list → jump the board there (its comment box shows below).
  const onGo = (nodeId) => setCurrentId(nodeId);

  // Arrow-key navigation through the line (← back, → forward, ↑ start, ↓ end).
  useEffect(() => {
    const onKey = (e) => {
      // Ignore when typing in an input/textarea/select.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') { setCurrentId(id => prevNode(tree, id)); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setCurrentId(id => nextNode(tree, id)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setCurrentId(null); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { setCurrentId(lastNode(tree, null)); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tree]);

  // Write/clear the comment on the CURRENT node (comments live on the tree node).
  const setNodeComment = (text) => {
    if (!currentId) return;
    setTree(t => ({ ...t, nodes: { ...t.nodes, [currentId]: { ...t.nodes[currentId], comment: text || null } } }));
  };

  const loadLines = useCallback(async () => {
    try { const r = await api.get('/api/opening-repertoire/lines'); setLines(r.data.lines || []); } catch { /* */ }
  }, []);
  useEffect(() => { loadLines(); }, [loadLines]);

  // Master explorer for the current line prefix — only when the DB toggle is on.
  useEffect(() => {
    if (!dbOn) { setExplorer(null); return; }
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/api/master-games/explorer?moves=${encodeURIComponent(sans.join(','))}&source=masters`);
        if (alive) setExplorer(r.data);
      } catch { if (alive) setExplorer(null); }
    })();
    return () => { alive = false; };
  }, [sans.join(','), dbOn]); // eslint-disable-line

  // Auto-save the in-progress build (whole tree) to localStorage so a reload keeps it.
  useEffect(() => {
    try {
      if (!hasMoves) { localStorage.removeItem(DRAFT_KEY); return; }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ tree, currentId, side, name }));
    } catch { /* storage full/unavailable — ignore */ }
  }, [tree, currentId, side, name, hasMoves]);

  const onDrop = useCallback((from, to, promotion) => {
    // Play from the CURRENT node → reuses the next move or creates a real sideline.
    const res = applyMove(tree, currentId || tree.rootId, { from, to, promotion: promotion || 'q' });
    if (!res) return false;
    setTree(res.tree); setCurrentId(res.nodeId); return true;
  }, [tree, currentId]);

  const reset = () => {
    setTree(buildTreeFromGame([], [])); setCurrentId(null); setMsg('');
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
  };

  // Load a saved entry. Prefer the full tree; fall back to a linear tree from sans.
  const loadLine = (l) => {
    setSide(l.side);
    if (l.tree && l.tree.nodes && l.tree.rootId) {
      const t = rehydrateTree(l.tree);
      let nodeId = t.rootId;
      while (t.nodes[nodeId]?.children?.length) nodeId = t.nodes[nodeId].children[0];
      setTree(t); setCurrentId(nodeId === t.rootId ? null : nodeId);
    } else {
      let t = buildTreeFromGame([], []);
      let nodeId = t.rootId;
      (l.sans || []).forEach((san, i) => {
        const res = applyMove(t, nodeId, san);
        if (!res) return;
        t = res.tree; nodeId = res.nodeId;
        const c = (l.comments || [])[i];
        if (c) t = { ...t, nodes: { ...t.nodes, [nodeId]: { ...t.nodes[nodeId], comment: c } } };
      });
      setTree(t); setCurrentId(nodeId === t.rootId ? null : nodeId);
    }
    setName(l.name || '');
    setMsg(`Loaded "${l.name || l.openingName || 'line'}" — extend it and Save to update, or Reset.`);
  };

  const save = async () => {
    if (!hasMoves) { setMsg('Play some moves first.'); return; }
    if (savePrice > 0 && (access?.walletXp || 0) < savePrice) {
      setMsg(`Saving a line costs ${savePrice} XP — you have ${access?.walletXp || 0}.`);
      return;
    }
    try {
      const r = await api.post('/api/opening-repertoire/lines', { side, name: name.trim(), tree });
      const charged = r.data?.xpCharged || 0;
      setMsg(charged > 0 ? `✓ Saved · −${charged} XP.` : '✓ Saved to your repertoire.');
      setName(''); reset(); loadLines();
      if (charged > 0) onWalletChange?.(); // refresh wallet balance shown in the header
    } catch (e) { setMsg(e.response?.data?.message || 'Could not save.'); }
  };

  const del = async (id) => { try { await api.delete(`/api/opening-repertoire/lines/${id}`); loadLines(); } catch { /* */ } };

  return (
   <div ref={wrapRef} style={isFull ? { background: '#0a0a0a', minHeight: '100vh', padding: 18, overflowY: 'auto' } : undefined}>
    {/* Stockfish on/off + Fullscreen — ABOVE the cards, aligned right. */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        {engineOn && (
          <label style={{ ...st.sub, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Lines:
            <select
              style={{ ...st.input, padding: '4px 8px' }}
              value={engineLines}
              onChange={(e) => setEngineLines(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button
          style={{ ...st.engineBtnSm, ...(engineOn ? st.engineBtnOn : {}) }}
          onClick={() => setEngineOn(v => !v)}
        >
          ⚙ Stockfish {engineOn ? 'on' : 'off'}
        </button>
        <button
          style={st.engineBtnSm}
          onClick={toggleFullscreen}
          title={isFull ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFull ? '✕ Exit' : '⛶ Full'}
        </button>
      </div>
    </div>

    <div style={st.cards}>
      <div style={st.boardCard}>
        <div style={st.boardArea}>
          <Chessboard position={fen} boardWidth={isFull ? Math.max(boardSize, Math.min(680, Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.8))) : boardSize} orientation={side} draggable onDrop={onDrop} lastMove={lastMove} />
          {/* Drag-to-resize handle (bottom-right). Double-click resets. */}
          <div
            style={st.resizeHandle}
            onMouseDown={onResizeStart}
            onTouchStart={onResizeStart}
            onDoubleClick={resetBoardSize}
            title="Drag to resize the board · double-click to reset"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
              <path d="M13 1 L1 13 M13 6 L6 13 M13 11 L11 13" stroke={C.textMut} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div style={{ ...st.row, marginTop: 10, marginBottom: 0 }}>
          <button style={st.ghostSm} onClick={() => setSide(s => s === 'white' ? 'black' : 'white')}>⇅ Flip</button>
          <button style={st.ghostSm} onClick={reset}>↺ Reset</button>
        </div>
      </div>

      <div style={st.rightCard}>
        {/* Pinned header: Stockfish PV lines (outside the scroll) */}
        {engineOn && (
          <div style={{ flexShrink: 0, marginBottom: 12 }}>
            <EnginePanel fen={fen} enabled={engineOn} numLines={engineLines} />
          </div>
        )}

        {/* Scrollable content: move list */}
        <div style={st.rightScroll}>
          <MoveList tree={tree} activeId={currentId} onGo={onGo} />
          {hasMoves && (
            <div style={{ ...st.sub, marginTop: 6 }}>
              Click a move to go there. To add a <strong>sideline</strong>: click the move to branch from, then play the alternative on the board.
            </div>
          )}
        </div>

        {/* Pinned footer: Save + Masters DB on one row (outside the scroll) */}
        <div style={st.rightPinned}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...st.input, flex: 1, minWidth: 120 }} placeholder="Line name (optional)" value={name} onChange={e => setName(e.target.value)} />
            <button style={st.btn} onClick={save} title={savePrice > 0 ? `Costs ${savePrice} XP per save` : undefined}>
              {savePrice > 0 ? `Save line (${savePrice} XP)` : 'Save line'}
            </button>
            <button
              style={{ ...st.engineBtn, ...(dbOn ? st.engineBtnOn : {}) }}
              onClick={() => setDbOn(v => !v)}
              title="Masters database"
            >
              📚 DB {dbOn ? 'on' : 'off'}
            </button>
          </div>
          {msg && <div style={{ ...st.sub, margin: '8px 0 0', color: msg.startsWith('✓') ? C.good : C.bad }}>{msg}</div>}

          {dbOn && (
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                {!explorer ? (
                  <div style={st.sub}>Loading…</div>
                ) : explorer.moves?.length > 0 ? (
                  <>
                    <div style={{ ...st.sub, marginBottom: 6 }}>Masters play here ({explorer.total} games):</div>
                    {explorer.moves.slice(0, 6).map(m => (
                      <div key={m.san} style={st.exRow} onClick={() => onDrop(...uciFromSan(fen, m.san))}>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{m.san}</span>
                        <span style={{ color: C.textMut, fontSize: 12 }}>{m.games} games</span>
                        <span style={{ color: C.textFaint, fontSize: 11 }}>{pct(m.white, m.games)}% / {pct(m.draw, m.games)}% / {pct(m.black, m.games)}%</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={st.sub}>No master games from this position.</div>
                )}
            </div>
          )}
        </div>

      </div>
    </div>

    {/* Comment box for the current move — full width, above Your Repertoire. */}
    {currentNode && currentNode.san && (
      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ ...st.sub, marginBottom: 6 }}>💬 Comment on <strong style={{ color: '#fff' }}>{currentNode.san}</strong>:</div>
        <textarea
          style={{ ...st.input, width: '100%', minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }}
          placeholder="e.g. Spanish Exchange starts here…"
          maxLength={400}
          value={currentNode.comment || ''}
          onChange={(e) => setNodeComment(e.target.value)}
        />
      </div>
    )}

    {/* Your saved repertoire — full-width section below the board. */}
    <div style={st.repSection}>
      <h3 style={st.h}>Your Repertoire {lines.length > 0 && <span style={{ color: C.textFaint, fontWeight: 600, fontSize: 13 }}>({lines.length})</span>}</h3>
      {lines.length === 0 ? (
        <div style={st.sub}>No lines saved yet. Build a line above and hit “Save line”.</div>
      ) : (
        <div style={st.repGrid}>
          {lines.map(l => (
            <div key={l._id} style={st.repCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{l.side === 'white' ? '♔' : '♚'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name || l.openingName || 'Line'}</div>
                  <div style={{ color: C.textFaint, fontSize: 11.5 }}>{l.ecoCode ? `${l.ecoCode} · ` : ''}{l.sans.length} moves{l.tree && hasVariations(l.tree) ? ' · ⑂' : ''}{(l.comments || []).some(Boolean) ? ' · 💬' : ''}{l.dueAt && new Date(l.dueAt) <= new Date() ? ' · due' : ''}</div>
                </div>
              </div>
              <div style={st.sanChipsSmall}>
                {l.sans.slice(0, 8).map((s, i) => <span key={i} style={st.chipSmall}>{s}</span>)}
                {l.sans.length > 8 && <span style={{ ...st.chipSmall, color: C.textFaint }}>+{l.sans.length - 8}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...st.ghost, flex: 1 }} onClick={() => loadLine(l)}>▷ Load</button>
                <button style={st.ghost} onClick={() => del(l._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
   </div>
  );
}

// Convert a SAN in the given FEN to (from,to,promotion) for onDrop.
function uciFromSan(fen, san) {
  try {
    const c = new Chess(fen);
    const mv = c.move(san, { sloppy: true });
    if (!mv) return [null, null, undefined];
    return [mv.from, mv.to, mv.promotion];
  } catch { return [null, null, undefined]; }
}
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

// ── TRAIN (SRS) ─────────────────────────────────────────────────────────────
function TrainMode() {
  const [due, setDue] = useState(null);      // array of lines
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try { const r = await api.get('/api/opening-repertoire/due'); setDue(r.data.due || []); setTotal(r.data.total || 0); setIdx(0); }
    catch { setDue([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (due === null) return null;
  if (due.length === 0) {
    return <div style={{ ...st.sub, padding: 20 }}>🎉 Nothing due right now. {total > 0 ? `You have ${total} line(s) scheduled — come back when they're due.` : 'Build some lines first.'}</div>;
  }
  if (idx >= due.length) {
    return <div style={{ ...st.sub, padding: 20 }}>✓ Review complete! <button style={st.ghost} onClick={load}>Reload</button></div>;
  }

  const line = due[idx];
  const onGraded = () => setIdx(i => i + 1);
  return <DrillLine key={line._id} line={line} remaining={due.length - idx} onGraded={onGraded} />;
}

// Drill a single line: user plays each of THEIR moves; the app auto-plays the
// opponent replies from the stored line. Grade = clean (5) / hint used (2).
function DrillLine({ line, remaining, onGraded }) {
  const side = line.side;
  const [game] = useState(() => new Chess(line.startFen || START_FEN));
  const [fen, setFen] = useState(line.startFen || START_FEN);
  const [ply, setPly] = useState(0);            // index into line.sans expected next
  const [wrong, setWrong] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [done, setDone] = useState(false);
  const [lastNote, setLastNote] = useState(null); // { san, text } comment to reveal

  const myMoveNow = () => ((side === 'white' && ply % 2 === 0) || (side === 'black' && ply % 2 === 1));

  // Auto-play opponent moves (the plies that aren't ours).
  useEffect(() => {
    if (done) return;
    if (ply >= line.sans.length) { finish(); return; }
    if (!myMoveNow()) {
      const t = setTimeout(() => {
        const san = line.sans[ply];
        try { game.move(san, { sloppy: true }); setFen(game.fen()); setPly(p => p + 1); } catch { finish(); }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [ply, done]); // eslint-disable-line

  const finish = useCallback(async () => {
    if (done) return;
    setDone(true);
    const grade = usedHint ? 2 : 5;
    try { await api.post(`/api/opening-repertoire/lines/${line._id}/review`, { grade }); } catch { /* */ }
  }, [done, usedHint, line._id]);

  const onDrop = (from, to) => {
    if (done || !myMoveNow()) return false;
    const expected = line.sans[ply];
    const piece = game.get(from);
    const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
    let mv;
    try { mv = game.move({ from, to, promotion }); } catch { return false; }
    if (!mv) return false;
    if (mv.san !== expected) {
      game.undo(); setWrong(true); setUsedHint(true);
      setTimeout(() => setWrong(false), 700);
      return false;
    }
    setFen(game.fen()); setWrong(false);
    // Reveal this move's commentary (if any) after the user plays it.
    const note = (line.comments || [])[ply];
    setLastNote(note ? { san: mv.san, text: note } : null);
    setPly(p => p + 1);
    return true;
  };

  const showHint = () => { setUsedHint(true); setWrong(false); alert(`Play: ${line.sans[ply]}`); };

  return (
    <div style={st.cards}>
      <div style={st.boardCard}>
        <Chessboard position={fen} boardWidth={360} orientation={side} draggable={!done && myMoveNow()} onDrop={onDrop} />
      </div>
      <div style={st.rightCard}>
        <h3 style={st.h}>{line.name || line.openingName || 'Line'} <span style={{ color: C.textFaint, fontWeight: 600, fontSize: 12 }}>({remaining} due)</span></h3>
        <div style={st.sub}>You are <strong style={{ color: '#fff' }}>{side}</strong>. Play your repertoire moves from memory.</div>
        {!done && myMoveNow() && <div style={{ color: C.active, fontWeight: 700, fontSize: 13 }}>Your move ({Math.floor(ply / 2) + 1}).</div>}
        {wrong && <div style={st.fb(false)}>Not your line — try again (or use the hint).</div>}
        {lastNote && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: 'rgba(245,196,81,0.10)', border: `1px solid ${C.gold}44`, fontSize: 13, color: '#fde9b8' }}>
            💬 <strong>{lastNote.san}:</strong> {lastNote.text}
          </div>
        )}
        {!done && <button style={{ ...st.ghost, marginTop: 10 }} onClick={showHint}>💡 Hint</button>}
        {done && (
          <div>
            <div style={st.fb(!usedHint)}>{usedHint ? 'Reviewed — keep practising this line.' : '✓ Perfect recall!'}</div>
            <button style={{ ...st.btn, marginTop: 12 }} onClick={onGraded}>Next line →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHECK MY GAMES (deviation) ────────────────────────────────────────────────
function CheckMode() {
  const [platform, setPlatform] = useState('chesscom');
  const [username, setUsername] = useState('');
  const [timeClass, setTimeClass] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const scan = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const body = { platform };
      if (platform !== 'chessnexus') body.username = username.trim();
      else body.timeClass = timeClass;
      const r = await api.post('/api/opening-repertoire/scan', body);
      setResult(r.data);
    } catch (e) { setErr(e.response?.data?.message || 'Scan failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={st.rightCard}>
      <h3 style={st.h}>Check my games for deviations</h3>
      <div style={st.sub}>We replay your recent games and flag where you left your saved prep.</div>
      <div style={st.row}>
        <select style={st.input} value={platform} onChange={e => setPlatform(e.target.value)}>
          <option value="chesscom">chess.com</option>
          <option value="lichess">lichess</option>
          <option value="chessnexus">ChessNexus</option>
        </select>
        {platform !== 'chessnexus'
          ? <input style={{ ...st.input, flex: 1, minWidth: 140 }} placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
          : <select style={st.input} value={timeClass} onChange={e => setTimeClass(e.target.value)}>
              {['all', 'bullet', 'blitz', 'rapid', 'classical'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>}
        <button style={st.btn} disabled={loading} onClick={scan}>{loading ? 'Scanning…' : 'Scan'}</button>
      </div>
      {err && <div style={{ ...st.sub, color: C.bad }}>{err}</div>}
      {result && (
        <div style={{ marginTop: 10 }}>
          <div style={st.sub}>Scanned {result.scanned} games · {result.deviations.length} deviation(s).</div>
          {result.deviations.map((d, i) => (
            <div key={i} style={st.lineRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {d.lineName || d.opening || 'Your line'} · vs {d.opponent}
                </div>
                <div style={{ color: C.textMut, fontSize: 12 }}>
                  Move {d.moveNumber}: you played <strong style={{ color: C.bad }}>{d.played}</strong>,
                  prep was <strong style={{ color: C.good }}>{d.expected.join(' / ')}</strong>
                </div>
              </div>
            </div>
          ))}
          {result.deviations.length === 0 && <div style={st.sub}>No deviations found — you stuck to your prep. 👏</div>}
        </div>
      )}
    </div>
  );
}
