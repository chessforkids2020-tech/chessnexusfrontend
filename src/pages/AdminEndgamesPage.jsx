// src/pages/AdminEndgamesPage.jsx
//
// Admin "Endgames" browser. Shows endgames extracted from the master PGN
// collection, grouped into 8 families (pawn, knight, bishop, bishop+knight,
// rook, queen, queen+rook, other/mixed).
//
//   Landing            -> 8 family cards with counts ("Show all" per card)
//   Click a family     -> paginated list of games (white/black/year/result)
//   Click a game row    -> board modal with move navigation
//
// Data is static JSON served from the backend public folder:
//   GET /api/public/endgames/index.json     -> { families: [{family,label,count,file}], total }
//   GET /api/public/endgames/<family>.json   -> [ { white, black, year, result, fen,
//                                                   startFen, moves[], endgamePly, ... } ]
//
// Each record carries startFen + an SAN moves[] array, so the board can replay
// the moves before AND after the endgame position; endgamePly is the index in
// moves[] where the endgame begins (board opens there).
import React, { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import api from "../api";
import Chessboard from "../components/Chessboard";
import stockfishService from "../services/stockfishService";

// ── Engine analysis helpers (shared style with GameReplay's Stockfish panel) ──
// The bundled WASM is now Stockfish 18 (public/stockfish.js — lite-single build).
const ENGINE_LABEL = "Stockfish";
const ENGINE_DEPTH = 18;
const ENGINE_LINES = 3;

// Score (relative to side-to-move) → White-perspective string: "+1.20", "-M2".
function formatEval(line, sideToMove) {
  const sign = sideToMove === "w" ? 1 : -1;
  if (line.scoreType === "mate") {
    const m = line.score * sign;
    return (m > 0 ? "+" : "") + "M" + Math.abs(m);
  }
  const cp = (line.score * sign) / 100;
  return (cp > 0 ? "+" : "") + cp.toFixed(2);
}

// UCI principal variation → readable SAN with move numbers, from `fen`.
function pvToSan(fen, pv, maxPlies = 8) {
  try {
    const c = new Chess(fen);
    const out = [];
    for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
      const uci = pv[i];
      const moveNo = c.moveNumber();
      const whiteToMove = c.turn() === "w";
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
    return out.join(" ");
  } catch {
    return "";
  }
}

// Live Stockfish panel: top-N lines for `fen` with White-perspective evals and
// the best continuation (SAN). Re-analyses whenever `fen` changes.
function EnginePanel({ fen, numLines = ENGINE_LINES }) {
  const [lines, setLines] = useState([]);
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState("init"); // init | thinking | done | error
  const reqIdRef = useRef(0);
  const sideToMove = (fen || "").split(" ")[1] === "b" ? "b" : "w";

  useEffect(() => {
    let cancelled = false;
    const myReq = ++reqIdRef.current;
    (async () => {
      try {
        if (!stockfishService.isReady()) {
          setStatus("init");
          await stockfishService.init();
        }
        if (cancelled || myReq !== reqIdRef.current) return;
        setLines([]);
        setDepth(0);
        setStatus("thinking");
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
        setStatus("done");
      } catch {
        if (!cancelled && myReq === reqIdRef.current) setStatus("error");
      }
    })();
    return () => { cancelled = true; stockfishService.stop(); };
  }, [fen, numLines]);

  return (
    <div style={engineStyles.box}>
      <div style={engineStyles.head}>
        <span style={engineStyles.name}>🐟 {ENGINE_LABEL}</span>
        <span style={engineStyles.depth}>
          {status === "error" ? "unavailable" : status === "init" ? "loading…" : `depth ${depth}/${ENGINE_DEPTH}`}
        </span>
      </div>
      {status === "error" ? (
        <div style={engineStyles.empty}>Engine could not start in this browser.</div>
      ) : lines.length === 0 ? (
        <div style={engineStyles.empty}>Analysing…</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {lines.slice(0, numLines).map((ln) => {
              const ev = formatEval(ln, sideToMove);
              const positive = !ev.startsWith("-");
              return (
                <tr key={ln.k}>
                  <td style={{ ...engineStyles.eval, color: positive ? "#10b981" : "#ef4444" }}>{ev}</td>
                  <td style={engineStyles.pv}>{pvToSan(fen, ln.pv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const engineStyles = {
  box: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 12, padding: 12, marginTop: 12, flex: "0 0 auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  name: { fontWeight: 800, color: "#ffffff", fontSize: 14 },
  depth: { fontSize: 12, color: "#06b6d4", border: "1px solid rgba(6,182,212,0.4)", borderRadius: 999, padding: "2px 10px" },
  empty: { color: "#9ca3af", fontSize: 13, padding: "6px 2px" },
  th: { textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#6b7280", padding: "4px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  eval: { fontWeight: 800, fontFamily: "monospace", padding: "6px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", whiteSpace: "nowrap", verticalAlign: "top" },
  pv: { fontFamily: "monospace", fontSize: 13, color: "#e5e7eb", padding: "6px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", lineHeight: 1.5 },
};

// The static files live under the backend's public mount.
const BASE = "/api/public/endgames";

const FAMILY_ICON = {
  pawn: "♙",
  knight: "♘",
  bishop: "♗",
  bishop_knight: "♗♘",
  rook: "♖",
  queen: "♕",
  queen_rook: "♕♖",
  other_mixed: "♚",
};

// Per-type accent colour — gives each card its own identity.
const FAMILY_ACCENT = {
  pawn: "#34d399",          // emerald
  knight: "#a78bfa",        // violet
  bishop: "#60a5fa",        // blue
  bishop_knight: "#22d3ee", // cyan
  rook: "#f59e0b",          // amber
  queen: "#f472b6",         // pink
  queen_rook: "#fb7185",    // rose
  other_mixed: "#94a3b8",   // slate
};

const PAGE_SIZE = 24;

const RESULT_STYLE = {
  "White won": { color: "#047857", bg: "rgba(16,185,129,0.14)" },
  "Black won": { color: "#1d4ed8", bg: "rgba(59,130,246,0.14)" },
  Draw: { color: "#b45309", bg: "rgba(245,158,11,0.14)" },
  Unknown: { color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const styles = {
  // Obsidian glass dark theme (matches StudyOverview and other pages).
  shell: { position: "relative", minHeight: "100vh", background: "#0a0a0a", overflow: "hidden" },
  bgGlow: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    background: `
      radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 70% 60%, rgba(239, 68, 68, 0.10) 0%, transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(16, 185, 129, 0.10) 0%, transparent 50%)
    `,
  },
  bgGrid: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.5,
    backgroundImage: `
      linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: "50px 50px",
  },
  page: { position: "relative", zIndex: 1, padding: 18, paddingTop: 24, fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", maxWidth: 1200, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 24, color: "#f1f5f9", fontWeight: 800, margin: 0 },
  subtitle: { margin: "4px 0 18px", color: "#94a3b8", fontSize: 13 },
  secondaryBtn: { padding: "8px 12px", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 },
  card: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(30,30,34,0.75) 0%, rgba(12,12,14,0.85) 100%)",
    backdropFilter: "blur(20px)",
    padding: "22px 20px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    cursor: "pointer",
    overflow: "hidden",
    transition: "transform .18s cubic-bezier(0.4,0,0.2,1), box-shadow .18s, border-color .18s",
  },
  cardTopBar: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  cardGlyph: {
    position: "absolute", right: -8, bottom: -18, fontSize: 110, lineHeight: 1,
    opacity: 0.10, pointerEvents: "none", userSelect: "none", fontWeight: 400,
  },
  cardIconBadge: {
    width: 54, height: 54, borderRadius: 14, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 30, lineHeight: 1, marginBottom: 14,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  cardLabel: { fontSize: 16, fontWeight: 800, color: "#f1f5f9", position: "relative", zIndex: 1 },
  cardCount: { fontSize: 30, fontWeight: 900, marginTop: 4, position: "relative", zIndex: 1, letterSpacing: "-0.5px" },
  cardCountSub: { fontSize: 11, color: "#94a3b8", fontWeight: 600, marginLeft: 6, letterSpacing: "0.5px" },
  cardHint: {
    fontSize: 12, fontWeight: 700, marginTop: 14, position: "relative", zIndex: 1,
    display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.3px",
  },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#e2e8f0", minWidth: 260, fontSize: 14 },
  tableWrap: { background: "rgba(15,15,15,0.6)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.35)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "11px 12px", textAlign: "left", fontWeight: 700, color: "#cbd5e1", borderBottom: "2px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "middle", color: "#cbd5e1" },
  rowBtn: { cursor: "pointer" },
  tag: { padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-block", whiteSpace: "nowrap" },
  pager: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
  // Modal — Obsidian Glass theme (matches src/styles/obsidian-glass.css)
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200000, padding: 16 },
  modal: { background: "rgba(23,23,23,0.95)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24, maxWidth: 880, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  analyzeBtn: { background: "rgba(0,0,0,0.4)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.4)", borderRadius: 999, padding: "6px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, alignSelf: "center" },
  analyzeBtnOn: { background: "linear-gradient(135deg,#06b6d4 0%,#10b981 100%)", color: "#fff", border: "1px solid rgba(6,182,212,0.6)", borderRadius: 999, padding: "6px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, alignSelf: "center", boxShadow: "0 4px 16px rgba(6,182,212,0.4)" },
  // Board on the left, everything else (controls + moves + meta) in the right column.
  modalBody: { display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" },
  boardCol: { flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center" },
  rightCol: { flex: "1 1 360px", minWidth: 320, maxHeight: "78vh", overflowY: "auto", paddingRight: 4 },
  // Compact (student): even 50 / 50 split — board column and engine+moves column.
  // The right column is a flex column whose moves list flexes to fill the height
  // of the board column, so there's no empty space under the board and only the
  // moves list scrolls internally (no outer modal scroll).
  boardColCompact: { flex: "0 0 50%", maxWidth: "50%", display: "flex", flexDirection: "column", alignItems: "center" },
  rightColCompact: { flex: "0 0 50%", maxWidth: "50%", minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 },
  metaBox: { minWidth: 240 },
  metaRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 },
  metaKey: { color: "#9ca3af" },
  metaVal: { fontWeight: 700, color: "#ffffff", textAlign: "right" },
  closeBtn: { background: "rgba(0,0,0,0.4)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 18, lineHeight: 1 },
  navBtn: { background: "rgba(0,0,0,0.4)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  navBtnPrimary: { background: "linear-gradient(135deg,#06b6d4 0%,#10b981 100%)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 16px rgba(6,182,212,0.4)" },
  moveList: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, maxHeight: 200, overflowY: "auto", padding: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 },
  moveChip: (active) => ({ cursor: "pointer", padding: "2px 7px", borderRadius: 6, fontSize: 13, background: active ? "#06b6d4" : "transparent", color: active ? "#0a0a0a" : "#e5e7eb", border: active ? "1px solid #06b6d4" : "1px solid rgba(255,255,255,0.1)" }),
  loading: { padding: 40, textAlign: "center", color: "#6b7280" },
};

// ── Board modal: replay startFen + moves[], open at endgamePly ───────────────
function EndgameModal({ game, onClose, compact = false }) {
  // Build the list of FENs once from startFen + SAN moves.
  const fens = useMemo(() => {
    const out = [{ fen: game.startFen, san: "Start" }];
    try {
      const c = new Chess(game.startFen);
      for (const san of game.moves || []) {
        const mv = c.move(san, { sloppy: true });
        out.push({ fen: c.fen(), san: mv ? mv.san : san });
      }
    } catch (e) {
      // If replay fails for any reason, fall back to just the endgame FEN.
      return [{ fen: game.fen, san: "Endgame" }];
    }
    return out;
  }, [game]);

  // Engine analysis panel toggle (Analyze button).
  const [analyzing, setAnalyzing] = useState(false);

  // ── Analysis tree ──────────────────────────────────────────────────────────
  // Everything (the game's main line + the student's variations) lives in one
  // move tree. A node = one move and the position it produces; the root is the
  // start position (no move). The game's moves seed the main line as the first
  // child chain. Students can branch off ANY node, to any depth — a true tree.
  // This is in-memory only: nothing is saved, reload/close discards it.
  //
  // node: { id, san, fen, from, to, parentId, childIds: [] }
  // root: { id: "root", san: null, fen: startFen, parentId: null, childIds: [] }
  const endgameFenIndex = Math.min(fens.length - 1, (game.endgamePly ?? 0) + 1);
  const [tree, setTree] = useState(null);
  const [currentId, setCurrentId] = useState("root"); // node shown on the board
  const seqRef = useRef(0);

  // Build the tree once (and rebuild if the game changes).
  useEffect(() => {
    const startFen = fens[0].fen;
    const nodes = { root: { id: "root", san: null, fen: startFen, from: null, to: null, parentId: null, childIds: [] } };
    let parentId = "root";
    let prevFen = startFen;
    let endgameNodeId = "root";
    seqRef.current = 0;
    for (let i = 1; i < fens.length; i++) {
      const id = `m${seqRef.current++}`;
      let from = null, to = null;
      try {
        const c = new Chess(prevFen);
        const mv = c.move(fens[i].san, { sloppy: true });
        if (mv) { from = mv.from; to = mv.to; }
      } catch { /* keep nulls */ }
      nodes[id] = { id, san: fens[i].san, fen: fens[i].fen, from, to, parentId, childIds: [] };
      nodes[parentId].childIds.push(id);
      if (i === endgameFenIndex) endgameNodeId = id;
      parentId = id;
      prevFen = fens[i].fen;
    }
    setTree({ nodes, endgameNodeId });
    setCurrentId(endgameNodeId); // open at the endgame position, as before
  }, [fens, endgameFenIndex]);

  // The node currently shown on the board.
  const nodes = tree?.nodes || { root: { id: "root", san: null, fen: fens[0].fen, from: null, to: null, parentId: null, childIds: [] } };
  const current = nodes[currentId] || nodes.root;
  const endgameNodeId = tree?.endgameNodeId || "root";

  const shownFen = current.fen;
  const shownLastMove = current.from && current.to ? { from: current.from, to: current.to } : null;

  // Navigate to any node by id (clicking a move in the tree).
  const goTo = useCallback((id) => { if (nodes[id]) setCurrentId(id); }, [nodes]);

  // Step back to the parent.
  const goBack = useCallback(() => {
    const p = nodes[currentId]?.parentId;
    if (p) setCurrentId(p);
  }, [nodes, currentId]);

  // Step forward along the CURRENT branch: the first child (main continuation of
  // whatever line we're on).
  const goForward = useCallback(() => {
    const child = nodes[currentId]?.childIds?.[0];
    if (child) setCurrentId(child);
  }, [nodes, currentId]);

  // Jump to the very start (root) / to the end of the current branch (keep taking
  // the first child until a leaf).
  const goStart = useCallback(() => setCurrentId("root"), []);
  const goEnd = useCallback(() => {
    let id = currentId;
    let guard = 0;
    while (nodes[id]?.childIds?.[0] && guard++ < 1000) id = nodes[id].childIds[0];
    setCurrentId(id);
  }, [nodes, currentId]);

  const hasParent = !!nodes[currentId]?.parentId;
  const hasChild = !!nodes[currentId]?.childIds?.[0];

  // Half-move count from root to a node (root = 0) — used to print "12." / "12...".
  const plyOf = useCallback((id) => {
    let n = 0, cur = id;
    let guard = 0;
    while (nodes[cur]?.parentId && guard++ < 2000) { n++; cur = nodes[cur].parentId; }
    return n;
  }, [nodes]);

  // A single clickable move token (with move number when appropriate).
  const MoveToken = ({ id, forceNumber }) => {
    const node = nodes[id];
    if (!node) return null;
    const ply = plyOf(id);
    const isWhiteMove = ply % 2 === 1; // ply 1 = white's 1st move
    const moveNo = Math.ceil(ply / 2);
    const showNumber = forceNumber || isWhiteMove;
    const numberLabel = showNumber ? `${moveNo}${isWhiteMove ? "." : "..."}` : "";
    const active = id === currentId;
    return (
      <span
        onClick={() => goTo(id)}
        style={{
          ...styles.moveChip(active),
          marginRight: 4,
          marginBottom: 3,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        {numberLabel && <span style={{ color: active ? "#0b1220" : "#64748b", fontWeight: 700 }}>{numberLabel}</span>}
        {node.san}
        {id === endgameNodeId ? " ⚑" : ""}
      </span>
    );
  };

  // Render a line starting at `startId` and following first-children (the "main"
  // continuation of this line). Wherever a node has extra children, those branch
  // off as indented sub-lines (recursively → a full tree). `depth` styles indent.
  const renderLine = (startId, depth) => {
    const tokens = [];
    let id = startId;
    let needNumber = true; // first token in a line always prints its number
    let guard = 0;
    while (id && guard++ < 4000) {
      const node = nodes[id];
      if (!node) break;
      tokens.push(<MoveToken key={id} id={id} forceNumber={needNumber} />);
      needNumber = false;

      const children = node.childIds || [];
      // Sub-lines: every child except the first (the first continues THIS line).
      if (children.length > 1) {
        for (let k = 1; k < children.length; k++) {
          const subId = children[k];
          tokens.push(
            <div
              key={`sub-${subId}`}
              style={{
                marginLeft: 12 + depth * 12,
                paddingLeft: 8,
                borderLeft: "2px solid rgba(34,211,238,0.35)",
                margin: "4px 0 4px " + (12 + depth * 12) + "px",
              }}
            >
              {renderLine(subId, depth + 1)}
            </div>
          );
        }
        // After printing sub-lines, the next main token needs its number again.
        needNumber = true;
      }
      id = children[0]; // continue down the main child
    }
    return <span style={{ lineHeight: 1.9 }}>{tokens}</span>;
  };

  // Make a user move from the current position. If a child with the same SAN
  // already exists, just follow it (don't duplicate). Otherwise add a new branch.
  // Returns false for illegal moves so the board snaps back.
  const onUserMove = useCallback((from, to, promotion) => {
    try {
      const c = new Chess(current.fen);
      const mv = c.move({ from, to, promotion: promotion || "q" });
      if (!mv) return false;
      const newFen = c.fen();
      setTree((prev) => {
        if (!prev) return prev;
        const next = { ...prev, nodes: { ...prev.nodes } };
        const parent = { ...next.nodes[current.id] };
        // Re-use an existing identical child if present.
        const existing = parent.childIds.map((cid) => next.nodes[cid]).find((n) => n && n.san === mv.san);
        if (existing) {
          next.nodes[parent.id] = parent;
          queueMicrotask(() => setCurrentId(existing.id));
          return next;
        }
        const id = `u${seqRef.current++}`;
        next.nodes[id] = { id, san: mv.san, fen: newFen, from: mv.from, to: mv.to, parentId: parent.id, childIds: [] };
        parent.childIds = [...parent.childIds, id];
        next.nodes[parent.id] = parent;
        queueMicrotask(() => setCurrentId(id));
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, [current]);

  // In compact (student) mode, size the board to ~half the modal-body width so the
  // board column shrinks to the board exactly (no leftover slack beside it) and the
  // engine/moves column fills the rest. Admin keeps the fixed 440px board.
  const bodyRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(440);
  useLayoutEffect(() => {
    if (!compact) return;
    const measure = () => {
      if (bodyRef.current) {
        const w = bodyRef.current.clientWidth; // total body width (both columns + gap)
        const gap = 16;
        // Fixed 480px board, but shrink to the column on narrow screens.
        const colW = (w - gap) / 2;
        setBoardWidth(Math.max(240, Math.min(480, Math.floor(colW))));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [compact]);

  const orientation = useMemo(() => {
    // Orient toward the side to move at the endgame position for a natural view.
    const parts = (game.fen || "").split(" ");
    return parts[1] === "b" ? "black" : "white";
  }, [game.fen]);

  // Arrow keys step along the current branch; Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") goForward();
      else if (e.key === "ArrowLeft") goBack();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goForward, goBack, onClose]);

  const atEndgame = currentId === endgameNodeId;

  // Render via a portal to document.body so the overlay escapes the page/layout
  // stacking context (otherwise the sidebar, z-index ~100000, covers it).
  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={compact ? { ...styles.modal, maxWidth: 1100, paddingTop: 8 } : styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={compact ? { ...styles.modalHead, marginBottom: 0, justifyContent: "flex-end" } : styles.modalHead}>
          {!compact && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {game.white} <span style={{ color: "#94a3b8" }}>vs</span> {game.black}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
                {game.event || "—"} · {game.year}
              </div>
            </div>
          )}
          <button
            style={analyzing ? styles.analyzeBtnOn : styles.analyzeBtn}
            onClick={() => setAnalyzing((v) => !v)}
            title="Show Stockfish's top 3 lines for this position"
          >
            {analyzing ? "✓ Analyzing" : "🐟 Analyze"}
          </button>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)">×</button>
        </div>

        <div ref={bodyRef} style={compact ? { ...styles.modalBody, flexWrap: "nowrap", marginTop: 0, gap: 16, alignItems: "stretch" } : styles.modalBody}>
          {/* LEFT: chessboard + navigation controls */}
          <div style={compact ? { ...styles.boardColCompact, marginTop: -68, marginBottom: -20 } : styles.boardCol}>
            <Chessboard
              position={shownFen}
              boardWidth={compact ? boardWidth : 440}
              orientation={orientation}
              draggable={compact}
              onDrop={compact ? onUserMove : undefined}
              lastMove={shownLastMove}
            />
            {!compact && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 }}>
                <button style={styles.navBtn} onClick={goStart} disabled={!hasParent} title="Start">«</button>
                <button style={styles.navBtn} onClick={goBack} disabled={!hasParent} title="Previous (←)">‹</button>
                <button
                  style={atEndgame ? styles.navBtn : styles.navBtnPrimary}
                  onClick={() => goTo(endgameNodeId)}
                  title="Jump to the endgame position"
                >
                  ⚑ Endgame
                </button>
                <button style={styles.navBtn} onClick={goForward} disabled={!hasChild} title="Next (→)">›</button>
                <button style={styles.navBtn} onClick={goEnd} disabled={!hasChild} title="End of this line">»</button>
              </div>
            )}
            {!compact && (
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: "#cbd5e1" }}>
                {current.id === "root"
                  ? "Starting position (before endgame)"
                  : <>Move: {current.san}</>}
                {atEndgame && <span style={{ color: "#22d3ee", fontWeight: 700 }}>  ← endgame starts here</span>}
              </div>
            )}
          </div>

          {/* RIGHT: move list + all game details */}
          <div style={compact ? styles.rightColCompact : styles.rightCol}>
            {analyzing && <EnginePanel fen={shownFen} />}
            <div style={compact
              ? { ...styles.moveList, flex: "1 1 auto", minHeight: 0, height: "auto", maxHeight: "none", display: "block", marginTop: analyzing ? 12 : 0 }
              : { ...styles.moveList, display: "block", marginTop: 0 }}>
              {/* Root chip, then the full tree from root's first child. */}
              <span
                onClick={() => goTo("root")}
                style={{ ...styles.moveChip(currentId === "root"), marginRight: 6, marginBottom: 4, display: "inline-flex" }}
              >
                Start
              </span>
              {nodes.root?.childIds?.[0] ? renderLine(nodes.root.childIds[0], 0) : null}
            </div>
            {compact && (
              <div style={{ flex: "0 0 auto", display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
                <button style={styles.navBtn} onClick={goStart} disabled={!hasParent} title="Start">«</button>
                <button style={styles.navBtn} onClick={goBack} disabled={!hasParent} title="Previous (←)">‹</button>
                <button
                  style={atEndgame ? styles.navBtn : styles.navBtnPrimary}
                  onClick={() => goTo(endgameNodeId)}
                  title="Jump to the endgame position"
                >
                  ⚑ Endgame
                </button>
                <button style={styles.navBtn} onClick={goForward} disabled={!hasChild} title="Next (→)">›</button>
                <button style={styles.navBtn} onClick={goEnd} disabled={!hasChild} title="End of this line">»</button>
              </div>
            )}

            {!compact && (
            <div style={{ ...styles.metaBox, marginTop: 18 }}>
            <div style={styles.metaRow}><span style={styles.metaKey}>White</span><span style={styles.metaVal}>{game.white}</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Black</span><span style={styles.metaVal}>{game.black}</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Result</span><span style={styles.metaVal}>{game.outcome} ({game.result})</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Year</span><span style={styles.metaVal}>{game.year}</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Event</span><span style={styles.metaVal}>{game.event || "—"}</span></div>
            {game.eco && <div style={styles.metaRow}><span style={styles.metaKey}>ECO</span><span style={styles.metaVal}>{game.eco}</span></div>}
            <div style={styles.metaRow}><span style={styles.metaKey}>Endgame type</span><span style={styles.metaVal}>{game.type}</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Pieces</span><span style={styles.metaVal}>{game.pieceCount}</span></div>
            <div style={styles.metaRow}><span style={styles.metaKey}>Starts at move</span><span style={styles.metaVal}>{game.endgameMoveNumber}</span></div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>FEN (endgame position)</div>
              <code style={{ display: "block", fontSize: 11, background: "#1e293b", padding: 8, borderRadius: 6, wordBreak: "break-all", color: "#e2e8f0" }}>
                {game.fen}
              </code>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Source: {game.source}</div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Shared Endgames browser. Used by the admin page and the student Study page;
// only the back-link target/label differ (passed as props).
export default function AdminEndgamesPage({ backTo = "/admin", backLabel = "← Back to Admin", compact = false }) {
  // `compact` (student view) hides the Type / Move / Event columns: students are
  // already inside a type, and event/move metadata isn't relevant for them.
  const navigate = useNavigate();
  const [index, setIndex] = useState(null);        // index.json
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [error, setError] = useState("");

  const [activeFamily, setActiveFamily] = useState(null); // {family,label,count,file}
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);  // game for modal

  // Load the index once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`${BASE}/index.json`);
        if (alive) setIndex(res.data);
      } catch (e) {
        if (alive) setError("Could not load endgame index. Is the data deployed in backend/public/endgames?");
      } finally {
        if (alive) setLoadingIndex(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load a family's games on demand.
  const openFamily = useCallback(async (fam) => {
    setActiveFamily(fam);
    setSearch("");
    setPage(0);
    setRows([]);
    setLoadingRows(true);
    try {
      const res = await api.get(`${BASE}/${fam.file}`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(`Could not load ${fam.label}.`);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.white || "").toLowerCase().includes(q) ||
        (r.black || "").toLowerCase().includes(q) ||
        (r.event || "").toLowerCase().includes(q) ||
        (r.year || "").includes(q) ||
        (r.type || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // ── Render: landing (family cards) ─────────────────────────────────────────
  if (!activeFamily) {
    return (
      <div style={styles.shell}>
        <div style={styles.bgGlow} />
        <div style={styles.bgGrid} />
        <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>♟ Endgames</h1>
          </div>
          <button style={styles.secondaryBtn} onClick={() => navigate(backTo)}>{backLabel}</button>
        </div>
        <p style={styles.subtitle}>
          Endgames extracted from the master games collection (positions with ≤10 pieces).
          {index ? ` ${index.total?.toLocaleString()} positions across ${index.gamesScanned?.toLocaleString()} games.` : ""}
          {" "}Pick a type, then click any game to open the board.
        </p>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
        {loadingIndex && <div style={styles.loading}>Loading endgame types…</div>}

        {index && (
          <div style={styles.cardGrid}>
            {index.families.map((fam) => {
              const accent = FAMILY_ACCENT[fam.family] || "#22d3ee";
              const disabled = fam.count === 0;
              return (
                <div
                  key={fam.family}
                  style={{ ...styles.card, opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" }}
                  onClick={() => !disabled && openFamily(fam)}
                  onMouseEnter={(e) => {
                    if (disabled) return;
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = `0 18px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accent}55`;
                    e.currentTarget.style.borderColor = `${accent}55`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  <div style={{ ...styles.cardTopBar, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                  <div style={{ ...styles.cardGlyph, color: accent }}>{FAMILY_ICON[fam.family] || "♟"}</div>
                  <div style={{ ...styles.cardIconBadge, background: `${accent}1f`, color: accent }}>
                    {FAMILY_ICON[fam.family] || "♟"}
                  </div>
                  <div style={styles.cardLabel}>{fam.label}</div>
                  <div style={{ ...styles.cardCount, color: accent }}>
                    {fam.count.toLocaleString()}
                    <span style={styles.cardCountSub}>positions</span>
                  </div>
                  <div style={{ ...styles.cardHint, color: disabled ? "#64748b" : accent }}>
                    {disabled ? "None yet" : "Show all →"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    );
  }

  // ── Render: family list ────────────────────────────────────────────────────
  return (
    <div style={styles.shell}>
      <div style={styles.bgGlow} />
      <div style={styles.bgGrid} />
      <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{FAMILY_ICON[activeFamily.family]} {activeFamily.label}</h1>
        </div>
        <button style={styles.secondaryBtn} onClick={() => setActiveFamily(null)}>← All types</button>
      </div>
      <p style={styles.subtitle}>
        {filtered.length.toLocaleString()} game{filtered.length === 1 ? "" : "s"}
        {search ? ` matching "${search}"` : ""}. Click a row to view the board with move navigation.
      </p>

      <div style={styles.toolbar}>
        <input
          style={styles.input}
          placeholder="Search player, event, year, type…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {loadingRows ? (
        <div style={styles.loading}>Loading games…</div>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>White</th>
                  <th style={styles.th}>Black</th>
                  <th style={styles.th}>Result</th>
                  <th style={styles.th}>Year</th>
                  {!compact && <th style={styles.th}>Type</th>}
                  {!compact && <th style={styles.th}>Move</th>}
                  {!compact && <th style={styles.th}>Event</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const rs = RESULT_STYLE[r.outcome] || RESULT_STYLE.Unknown;
                  return (
                    <tr
                      key={r.id || i}
                      style={styles.rowBtn}
                      onClick={() => setSelected(r)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={styles.td}>{page * PAGE_SIZE + i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: "#f1f5f9" }}>{r.white}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: "#f1f5f9" }}>{r.black}</td>
                      <td style={styles.td}><span style={{ ...styles.tag, color: rs.color, background: rs.bg }}>{r.outcome}</span></td>
                      <td style={styles.td}>{r.year}</td>
                      {!compact && <td style={{ ...styles.td, color: "#94a3b8" }}>{r.type}</td>}
                      {!compact && <td style={styles.td}>{r.endgameMoveNumber}</td>}
                      {!compact && <td style={{ ...styles.td, color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.event || "—"}</td>}
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }} colSpan={compact ? 5 : 8}>No games found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div style={styles.pager}>
              <button style={styles.secondaryBtn} onClick={() => setPage(0)} disabled={page === 0}>«</button>
              <button style={styles.secondaryBtn} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Page {page + 1} / {pageCount}</span>
              <button style={styles.secondaryBtn} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</button>
              <button style={styles.secondaryBtn} onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>»</button>
            </div>
          )}
        </>
      )}

      {selected && <EndgameModal game={selected} onClose={() => setSelected(null)} compact={compact} />}
      </div>
    </div>
  );
}
