// components/EndgameTrainer.jsx
//
// The premium "Endgame Mastery" experience shown at the TOP of the Endgames page
// (/study/endgames). Three views driven by internal state:
//   band  → family cards (premium gold look) with curated counts + mastered counts
//   list  → curated picks in one family, with lock/price + mastery ticks
//   play  → play the position out vs Stockfish (Easy/Medium/Hard); mastery =
//           convert/hold without the engine eval ever slipping
//
// Everything stays on the same page. Gating mirrors Books (XP / supporter / coach).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Chess } from "chess.js";
import Chessboard from "./Chessboard";
import EnginePanel from "./EnginePanel";
import api from "../api";
import tablebase from "../services/tablebaseService";
import stockfish from "../services/stockfishService";

// Difficulty levels for playing the endgame out vs Stockfish. Lower skill = more
// human-like blunders; higher depth/time = stronger, more accurate defense.
const LEVELS = {
  easy:   { label: "Easy",   skill: 3,  depth: 6,  moveTime: 300 },
  medium: { label: "Medium", skill: 9,  depth: 10, moveTime: 600 },
  hard:   { label: "Hard",   skill: 18, depth: 16, moveTime: 1000 },
};
import { buildTreeFromGame, applyMove, fenAt, lastMoveAt, firstNode, nextNode, prevNode, lastNode, pathToNode } from "./masterGames/moveTree";

const FAMILY_ICON = {
  pawn: "♙", knight: "♘", bishop: "♗", bishop_knight: "♗♘",
  rook: "♖", queen: "♕", queen_rook: "♕♖", other_mixed: "♚",
};
const FAMILY_LABEL = {
  pawn: "Pawn", knight: "Knight", bishop: "Bishop", bishop_knight: "Bishop + Knight",
  rook: "Rook", queen: "Queen", queen_rook: "Queen + Rook", other_mixed: "Other / mixed",
};
const GOAL_LABEL = { white_win: "White to win", black_win: "Black to win", draw: "Hold the draw" };
const PREMIUM_ACCENT = "#f5c451"; // gold — clearly different from the flat browse cards

const S = {
  band: {
    position: "relative", marginBottom: 26, padding: "18px 18px 6px",
    borderRadius: 18, border: `1px solid ${PREMIUM_ACCENT}55`,
    background: "linear-gradient(135deg, rgba(245,196,81,0.10), rgba(245,196,81,0.03))",
  },
  bandHead: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  bandTitle: { fontSize: 18, fontWeight: 900, color: "#fde9b8", margin: 0, letterSpacing: "-0.2px" },
  bandRibbon: {
    fontSize: 11, fontWeight: 800, color: "#1a1206", background: PREMIUM_ACCENT,
    padding: "2px 8px", borderRadius: 999, letterSpacing: "0.4px",
  },
  bandSub: { margin: "6px 0 16px", color: "#cdb989", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 },
  card: {
    position: "relative", cursor: "pointer", padding: "18px 16px", borderRadius: 16,
    border: `1px solid ${PREMIUM_ACCENT}44`,
    background: "linear-gradient(160deg, rgba(40,33,12,0.65) 0%, rgba(16,13,6,0.85) 100%)",
    overflow: "hidden", transition: "transform .16s, border-color .16s, box-shadow .16s",
  },
  cardTop: { position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${PREMIUM_ACCENT}, transparent)` },
  cardGlyph: { position: "absolute", right: -6, bottom: -16, fontSize: 96, opacity: 0.12, color: PREMIUM_ACCENT, pointerEvents: "none" },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 26, marginBottom: 12, background: `${PREMIUM_ACCENT}1f`, color: PREMIUM_ACCENT, border: `1px solid ${PREMIUM_ACCENT}44`,
  },
  cardLabel: { fontSize: 15, fontWeight: 800, color: "#fde9b8", position: "relative", zIndex: 1 },
  cardCount: { fontSize: 26, fontWeight: 900, color: PREMIUM_ACCENT, marginTop: 2, position: "relative", zIndex: 1 },
  cardSub: { fontSize: 11.5, color: "#cdb989", fontWeight: 600, marginLeft: 6 },
  cardHint: { fontSize: 12, fontWeight: 800, color: PREMIUM_ACCENT, marginTop: 10, position: "relative", zIndex: 1 },
  backBtn: { background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  // list rows
  listRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8,
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(20,17,8,0.5)",
  },
  goalBadge: (goal) => ({
    fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    background: goal === "draw" ? "rgba(245,158,11,0.16)" : "rgba(16,185,129,0.16)",
    color: goal === "draw" ? "#fbbf24" : "#34d399",
  }),
  playBtn: { background: `linear-gradient(135deg, ${PREMIUM_ACCENT}, #e0a92e)`, color: "#1a1206", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  lockBtn: { background: "rgba(245,196,81,0.14)", color: PREMIUM_ACCENT, border: `1px solid ${PREMIUM_ACCENT}55`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  // play modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200000, padding: 16 },
  modal: { position: "relative", background: "rgba(23,23,23,0.97)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "12px 22px 22px", maxWidth: 960, width: "100%", maxHeight: "92vh", overflow: "auto" },
  verdict: (kind) => ({
    marginTop: 12, padding: "10px 14px", borderRadius: 12, fontWeight: 800, fontSize: 14,
    background: kind === "mastered" ? "rgba(16,185,129,0.16)" : kind === "slip" ? "rgba(245,158,11,0.16)" : "rgba(239,68,68,0.16)",
    color: kind === "mastered" ? "#34d399" : kind === "slip" ? "#fbbf24" : "#f87171",
  }),
  // Study-mode: move chips (like the study/analysis pop-up), engine + mode buttons.
  analyzeBtn: { background: "rgba(6,182,212,0.16)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.5)", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  playSwitchBtn: { background: `linear-gradient(135deg, ${PREMIUM_ACCENT}, #e0a92e)`, color: "#1a1206", border: "none", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  moveWrap: { display: "flex", flexWrap: "wrap", gap: "2px 6px", alignItems: "center", background: "rgba(0,0,0,0.28)", borderRadius: 12, padding: 12, maxHeight: 220, overflowY: "auto", lineHeight: 1.7 },
  moveNum: { color: "#6b7280", fontSize: 13, fontWeight: 700, marginLeft: 6 },
  // Plain clickable move text — no box. Only the active move gets a subtle highlight.
  moveChip: (active) => ({
    padding: "1px 4px", borderRadius: 5, fontSize: 14, fontWeight: 700, cursor: "pointer",
    background: active ? PREMIUM_ACCENT : "transparent",
    color: active ? "#1a1206" : "#e2e8f0",
  }),
  startChip: (active) => ({
    padding: "4px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
    background: active ? PREMIUM_ACCENT : "rgba(255,255,255,0.05)",
    color: active ? "#1a1206" : "#cbd5e1", border: `1px solid ${active ? PREMIUM_ACCENT : "rgba(255,255,255,0.1)"}`,
  }),
  navRow: { display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 10 },
  navBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 14 },
};

// Board size that fits the study pop-up in the viewport. The modal is capped at
// 92vh; the board must share that height with the button row + nav + padding
// (~150px). Also cap by a max width so it doesn't get silly on big screens.
function boardSizeForViewport() {
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const byHeight = Math.round(h * 0.92) - 120; // vertical budget for the board
  const byWidth = Math.min(560, Math.round(w * 0.54)); // left column share of the card
  return Math.max(280, Math.min(byWidth, byHeight));
}

// Count pieces from a FEN (defensive; server already restricts to ≤7).
function pieceCount(fen) {
  const b = String(fen || "").split(" ")[0];
  let n = 0; for (const c of b) if (/[pnbrqkPNBRQK]/.test(c)) n++; return n;
}

// Recursively render a line of the move tree from `nodeId`, showing sidelines
// (2nd+ children) inline in parentheses. `startColor` = 'w'|'b' of the ROOT so we
// number plies correctly for a mid-game position. `ply` is the 1-based half-move
// index of `nodeId` within the whole line.
function StudyVariation({ tree, nodeId, ply, startColor, activeId, onGo, showFirstNum }) {
  const out = [];
  let cur = nodeId;
  let p = ply;
  let firstNum = showFirstNum;
  while (cur) {
    const id = cur; // stable copy for the closure
    const n = tree.nodes[id];
    if (!n || !n.san) break;
    // White-to-move plies show "N.", black shows "N…" only when it starts a line.
    const isWhitePly = (startColor === "w") ? (p % 2 === 1) : (p % 2 === 0);
    const moveNo = Math.floor((p - 1) / 2) + 1;
    const label = isWhitePly ? `${moveNo}.` : (firstNum ? `${moveNo}…` : "");
    out.push(
      <React.Fragment key={id}>
        {label && <span style={S.moveNum}>{label}</span>}
        <span style={S.moveChip(id === activeId)} onClick={() => onGo(id)}>{n.san}</span>
      </React.Fragment>
    );
    const kids = n.children || [];
    for (let i = 1; i < kids.length; i++) {
      out.push(
        <span key={`v${id}-${i}`} style={{ color: "#8b93a7" }}>
          ({<StudyVariation tree={tree} nodeId={kids[i]} ply={p + 1} startColor={startColor} activeId={activeId} onGo={onGo} showFirstNum />})
        </span>
      );
    }
    cur = kids[0] || null;
    p += 1;
    firstNum = kids.length > 1; // after a branch, re-show the number on the mainline
  }
  return <>{out}</>;
}

// ── Study view: interactive board (build variations) + tablebase line + Stockfish ─
// The default view. The board is INTERACTIVE — the user can play moves to explore
// variations (a move tree with sidelines), navigate forward/back, turn on
// Stockfish, or switch to Play vs Tablebase. Seeded with the tablebase-perfect line.
function StudyView({ pick, onPlay }) {
  const trainerSide = pick.side;
  const [tree, setTree] = useState(() => buildTreeFromGame([], [], pick.fen));
  const [currentId, setCurrentId] = useState(null); // null = start position
  const [loadingLine, setLoadingLine] = useState(true);
  const [engineOn, setEngineOn] = useState(false);

  // Fit the board to the viewport so the pop-up never overflows.
  const [boardW, setBoardW] = useState(() => boardSizeForViewport());
  useEffect(() => {
    const onResize = () => setBoardW(boardSizeForViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Seed the tree's MAIN LINE from the tablebase-perfect line (once).
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingLine(true);
      try {
        const l = await tablebase.bestLine(pick.fen, Chess, 24);
        if (!alive) return;
        setTree(buildTreeFromGame((l || []).map(m => m.san), [], pick.fen));
      } catch {
        if (alive) setTree(buildTreeFromGame([], [], pick.fen));
      } finally {
        if (alive) setLoadingLine(false);
      }
    })();
    return () => { alive = false; };
  }, [pick.fen]);

  const fen = fenAt(tree, currentId);
  const lastMove = lastMoveAt(tree, currentId);
  const startColor = pick.fen.split(" ")[1] === "b" ? "b" : "w";
  const hasMoves = (tree.nodes[tree.rootId].children || []).length > 0;
  const curPly = currentId ? pathToNode(tree, currentId).length : 0;
  const goalWin = pick.goal !== "draw";

  // Play a move on the board → branch/extend the tree (like the study/repertoire board).
  const onDrop = (from, to, promotion) => {
    const res = applyMove(tree, currentId || tree.rootId, { from, to, promotion: promotion || "q" });
    if (!res) return false;
    setTree(res.tree);
    setCurrentId(res.nodeId);
    return true;
  };

  const goStart = () => setCurrentId(null);
  const goBack = () => setCurrentId(prevNode(tree, currentId));
  const goFwd = () => setCurrentId(nextNode(tree, currentId) || currentId);
  const goEnd = () => setCurrentId(lastNode(tree, null));

  // Keyboard arrows for navigation.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") { setCurrentId(prevNode(tree, currentId)); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setCurrentId(nextNode(tree, currentId) || currentId); e.preventDefault(); }
      else if (e.key === "ArrowUp") { setCurrentId(null); e.preventDefault(); }
      else if (e.key === "ArrowDown") { setCurrentId(lastNode(tree, null)); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tree, currentId]);

  return (
    <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* LEFT: interactive board. The Chessboard reserves its coordinate gutter only
          on the sides that render labels (bottom+left), so there is no blank TOP
          gutter to crop — a negative margin here would clip the top rank. */}
      <div>
        <Chessboard position={fen} boardWidth={boardW} orientation={trainerSide} draggable onDrop={onDrop} lastMove={lastMove} />
      </div>

      {/* RIGHT: buttons, goal, description, engine, move list, navigation. */}
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        {/* Stockfish + Play buttons at the top of the right column (clear of ✕). */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, paddingRight: 40 }}>
          <button style={{ ...S.analyzeBtn, ...(engineOn ? { background: "rgba(6,182,212,0.28)" } : {}) }} onClick={() => setEngineOn(v => !v)}>
            🐟 Stockfish {engineOn ? "on" : "off"}
          </button>
          <button style={S.playSwitchBtn} onClick={onPlay}>▶ Play vs Stockfish</button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <span style={S.goalBadge(pick.goal)}>{GOAL_LABEL[pick.goal]}</span>
          {pick.idea ? <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 13 }}>{pick.idea}</span> : null}
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>
          Study the perfect line{goalWin ? " that converts the win" : " that holds the draw"}, or
          <strong style={{ color: "#e2e8f0" }}> play your own moves on the board</strong> to explore variations.
          Turn on Stockfish, or hit <strong style={{ color: PREMIUM_ACCENT }}>Play vs Stockfish</strong> to try it out.
        </div>

        {engineOn && (
          <div style={{ marginBottom: 12 }}>
            <EnginePanel fen={fen} enabled={engineOn} numLines={3} />
          </div>
        )}

        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>Moves &amp; variations</div>
        <div style={S.moveWrap}>
          <span style={S.startChip(currentId === null)} onClick={goStart}>Start</span>
          {loadingLine ? (
            <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 6 }}>Loading the perfect line…</span>
          ) : !hasMoves ? (
            <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 6 }}>Play a move on the board to start a line.</span>
          ) : (
            <StudyVariation
              tree={tree} nodeId={firstNode(tree)} ply={1} startColor={startColor}
              activeId={currentId} onGo={setCurrentId} showFirstNum
            />
          )}
        </div>

        {/* Move navigation — below the move list, in the right card. */}
        <div style={{ ...S.navRow, justifyContent: "flex-start", marginTop: 12 }}>
          <button style={S.navBtn} onClick={goStart} disabled={currentId === null}>⏮</button>
          <button style={S.navBtn} onClick={goBack} disabled={currentId === null}>◀</button>
          <span style={{ fontSize: 12.5, color: "#cbd5e1", minWidth: 44, textAlign: "center", fontWeight: 700 }}>{curPly}</span>
          <button style={S.navBtn} onClick={goFwd} disabled={!nextNode(tree, currentId)}>▶</button>
          <button style={S.navBtn} onClick={goEnd} disabled={!nextNode(tree, currentId)}>⏭</button>
        </div>
      </div>
    </div>
  );
}

// ── Play-out view ────────────────────────────────────────────────────────────
function PlayView({ pick, onResult, onBack }) {
  const trainerSide = pick.side; // 'white' | 'black'
  const wantWin = pick.goal !== "draw";
  const [game] = useState(() => new Chess(pick.fen));
  const [fen, setFen] = useState(pick.fen);
  const [status, setStatus] = useState("play"); // play | thinking | done
  const [verdict, setVerdict] = useState(null);  // { kind, text }
  const [slipped, setSlipped] = useState(false);
  const [evalInfo, setEvalInfo] = useState(null); // { cp, mate } from trainer POV
  const [level, setLevel] = useState("medium");   // easy | medium | hard
  const [userMoves, setUserMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  // Move notation: { san, by:'you'|'bot', color:'w'|'b' } in play order.
  const [history, setHistory] = useState([]);

  // Fit the board to the viewport (same as study mode).
  const [boardW, setBoardW] = useState(() => boardSizeForViewport());
  useEffect(() => {
    const onResize = () => setBoardW(boardSizeForViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sideToMoveNow = () => (game.turn() === "w" ? "white" : "black");

  // Ensure the shared Stockfish engine is up before we ask it to move.
  const ensureEngine = useCallback(async () => {
    if (!stockfish.isReady()) {
      try { await stockfish.init(); } catch { /* handled by callers */ }
    }
  }, []);

  // Ask Stockfish for a move at the current level, plus its eval converted to the
  // TRAINER's point of view (positive = good for the trainee). Engine reports the
  // score from the side-to-move's POV, so flip when it's not the trainer's turn.
  const engineMove = useCallback(async (fenStr) => {
    await ensureEngine();
    const cfg = LEVELS[level] || LEVELS.medium;
    const r = await stockfish.getBestMove(fenStr, { skill: cfg.skill, depth: cfg.depth, moveTime: cfg.moveTime });
    const stm = fenStr.split(" ")[1] === "w" ? "white" : "black";
    const sign = stm === trainerSide ? 1 : -1;
    let cp = null, mate = null;
    if (r?.evaluation) {
      if (r.evaluation.type === "mate") mate = sign * r.evaluation.value;
      else cp = sign * r.evaluation.value;
    }
    return { uci: r?.bestMove || null, cp, mate };
  }, [ensureEngine, level, trainerSide]);

  // Show the engine's read of the starting position (from the trainee's POV).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await engineMove(game.fen());
        if (alive) setEvalInfo({ cp: r.cp, mate: r.mate });
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, []);

  const finish = useCallback((kind, text) => {
    setStatus("done");
    setVerdict({ kind, text });
    const mastered = kind === "mastered";
    onResult?.(pick, { mastered, movesPlayed: userMoves });
  }, [onResult, pick, userMoves]);

  // Detect terminal goal states after any move.
  const checkTerminal = useCallback(async (afterUser) => {
    // Win by checkmate.
    if (game.isCheckmate()) {
      const loserToMove = sideToMoveNow();       // side just checkmated is to move
      const winner = loserToMove === "white" ? "black" : "white";
      if (wantWin && winner === trainerSide) return finish("mastered", "Checkmate — endgame converted! ♛");
      return finish("failed", "Checkmate — but not in your favour.");
    }
    // Draws: stalemate / insufficient / repetition / 50-move.
    if (game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition() || game.isDraw()) {
      if (!wantWin) return finish(slipped ? "slip" : "mastered", slipped ? "Drawn — held, but the eval slipped along the way." : "Draw held — perfect technique! 🛡️");
      return finish("failed", "The game was drawn — the win slipped away.");
    }
    return false;
  }, [game, wantWin, trainerSide, slipped, finish]);

  const opponentReply = useCallback(async () => {
    // Opponent = the side NOT trained. Let Stockfish pick its reply at the chosen
    // difficulty level, then refresh the eval readout from the trainee's POV.
    setStatus("thinking");
    try {
      const r = await engineMove(game.fen());
      if (!r.uci) { setStatus("play"); return null; }
      const bmv = game.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci.length > 4 ? r.uci[4] : undefined });
      if (bmv) setHistory(h => [...h, { san: bmv.san, by: "bot", color: bmv.color }]);
      setFen(game.fen());
      const done = await checkTerminal(false);
      if (done) return null;
      setEvalInfo({ cp: r.cp, mate: r.mate });
      setStatus("play");
      return r; // eval (trainer POV) after the reply — reused for slip detection
    } catch {
      setStatus("play");
      setVerdict({ kind: "slip", text: "Engine unavailable — check your connection and retry." });
      return null;
    }
  }, [game, checkTerminal, engineMove]);

  const onUserMove = useCallback((from, to) => {
    if (status !== "play" || busy) return false;
    if (sideToMoveNow() !== trainerSide) return false;
    const piece = game.get(from);
    const promotion = piece && piece.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : undefined;
    let mv;
    try { mv = game.move({ from, to, promotion }); } catch { return false; }
    if (!mv) return false;

    setHistory(h => [...h, { san: mv.san, by: "you", color: mv.color }]);
    setFen(game.fen());
    setUserMoves((n) => n + 1);
    setBusy(true);

    (async () => {
      try {
        const done = await checkTerminal(true);
        if (done) { setBusy(false); return; }
        // Stockfish replies and returns its eval (trainer POV). Detect a technique
        // slip: a would-be win no longer clearly winning, or a hold gone losing.
        const r = await opponentReply();
        if (r) {
          const winning = r.mate != null ? r.mate > 0 : (r.cp != null && r.cp > 150);
          const losing = r.mate != null ? r.mate < 0 : (r.cp != null && r.cp < -150);
          if (wantWin && !winning) setSlipped(true);
          if (!wantWin && losing) setSlipped(true);
        }
      } finally {
        setBusy(false);
      }
    })();
    return true;
  }, [status, busy, game, trainerSide, wantWin, checkTerminal, opponentReply]);

  // Engine read of the position from the trainee's POV (positive = good for you).
  const evalText = (() => {
    if (!evalInfo) return "…";
    if (evalInfo.mate != null) return `Mate in ${Math.abs(evalInfo.mate)}`;
    if (evalInfo.cp == null) return "…";
    const p = (evalInfo.cp / 100).toFixed(1);
    return (evalInfo.cp > 0 ? "+" : "") + p;
  })();
  const evalColor = (() => {
    if (!evalInfo) return "#94a3b8";
    const v = evalInfo.mate != null ? (evalInfo.mate > 0 ? 9999 : -9999) : (evalInfo.cp || 0);
    if (v > 150) return "#34d399";
    if (v < -150) return "#f87171";
    return "#fbbf24";
  })();

  return (
    <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* LEFT: board only (no title above it). No blank TOP gutter to crop — the
          Chessboard only reserves gutters on the labelled sides (bottom+left). */}
      <div>
        <Chessboard
          position={fen}
          boardWidth={boardW}
          orientation={trainerSide}
          draggable={status === "play"}
          onDrop={onUserMove}
        />
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          {/* Back-to-study + play instruction (no title above the board now). */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, paddingRight: 40 }}>
            <button style={S.backBtn} onClick={onBack}>← Study</button>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={S.goalBadge(pick.goal)}>{GOAL_LABEL[pick.goal]}</span>
            {pick.idea ? <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 13 }}>{pick.idea}</span> : null}
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>
            You play <strong style={{ color: "#fff", textTransform: "capitalize" }}>{trainerSide}</strong>.
            {wantWin ? " Convert the win against Stockfish." : " Hold the draw against Stockfish."}
          </div>
          {/* Difficulty selector — changes Stockfish's strength for the next reply. */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {Object.entries(LEVELS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setLevel(key)}
                disabled={status === "thinking"}
                style={{
                  flex: 1, padding: "6px 8px", borderRadius: 8, cursor: status === "thinking" ? "default" : "pointer",
                  fontSize: 12.5, fontWeight: 700,
                  border: level === key ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.14)",
                  background: level === key ? "rgba(52,211,153,0.15)" : "rgba(0,0,0,0.25)",
                  color: level === key ? "#6ee7b7" : "#cbd5e1",
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.3)", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Stockfish eval (your side)</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: evalColor }}>
              {status === "thinking" ? "Stockfish thinking…" : evalText}
            </div>
          </div>
          {/* Move notation — your moves + Stockfish's replies, in play order. */}
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>
            Moves <span style={{ fontWeight: 500 }}>· you vs Stockfish</span>
          </div>
          <div style={{ ...S.moveWrap, marginBottom: 10 }}>
            {history.length === 0 ? (
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Make a move to begin.</span>
            ) : (
              (() => {
                // Pair into numbered rows using each move's actual color, so a
                // black-to-move start still numbers correctly (N… for black).
                const chips = [];
                for (let i = 0; i < history.length; i++) {
                  const m = history[i];
                  const isWhite = m.color === "w";
                  const prevWhite = i > 0 && history[i - 1].color === "w";
                  // Show a move number before every white move, and before a leading black move.
                  if (isWhite || i === 0) {
                    const no = history.slice(0, i + 1).filter(x => x.color === "w").length || 1;
                    chips.push(<span key={`n${i}`} style={S.moveNum}>{no}{isWhite ? "." : "…"}</span>);
                  }
                  chips.push(
                    <span key={i} style={{ ...S.moveChip(false), cursor: "default", opacity: m.by === "bot" ? 0.85 : 1 }}
                      title={m.by === "you" ? "Your move" : "Stockfish reply"}>
                      {m.san}{m.by === "bot" ? " ⛃" : ""}
                    </span>
                  );
                  void prevWhite;
                }
                return chips;
              })()
            )}
          </div>

          {slipped && status === "play" && (
            <div style={{ fontSize: 12, color: "#fbbf24", marginBottom: 8 }}>⚠️ Technique slipped — mastery won't be awarded this attempt.</div>
          )}
          {verdict && <div style={S.verdict(verdict.kind)}>{verdict.text}</div>}
          {status === "done" && (
            <button style={{ ...S.playBtn, marginTop: 12 }} onClick={onBack}>← Back to study</button>
          )}
      </div>
    </div>
  );
}

// ── Modal shell: study by default; switch to play; portal + overlay + close ───
function EndgameModal({ pick, onClose, onResult }) {
  const [mode, setMode] = useState("study"); // 'study' | 'play'
  return createPortal(
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Global close — top-right corner, above the mode content. */}
        <button style={{ ...S.backBtn, position: "absolute", right: 26, top: 14, zIndex: 2 }} onClick={onClose}>✕</button>
        {mode === "study"
          ? <StudyView pick={pick} onPlay={() => setMode("play")} />
          : <PlayView pick={pick} onResult={onResult} onBack={() => setMode("study")} />}
      </div>
    </div>,
    document.body
  );
}

// ── Main trainer (band → list → play) ────────────────────────────────────────
export default function EndgameTrainer({ emptyFallback = null }) {
  const [data, setData] = useState(null);   // { families, walletXp, freeAccess, ... }
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null); // active family key (list view)
  const [playing, setPlaying] = useState(null); // pick being played
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [pos, prog] = await Promise.all([
        api.get("/api/endgame-trainer/positions"),
        api.get("/api/endgame-trainer/progress").catch(() => ({ data: { picks: {} } })),
      ]);
      setData(pos.data);
      setProgress(prog.data?.picks || {});
    } catch (e) {
      setData({ families: {}, walletXp: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const familyKeys = useMemo(() => Object.keys(data?.families || {}), [data]);
  const masteredCount = useCallback((picks) => picks.filter((p) => progress[String(p._id)]?.mastered).length, [progress]);

  const unlock = async (pick) => {
    setError("");
    try {
      await api.post(`/api/endgame-trainer/${pick._id}/unlock`);
      await load();
    } catch (e) {
      const d = e.response?.data;
      setError(d?.message === "Not enough XP." ? `Not enough XP — needs ${d.xpPrice}, you have ${d.walletXp}.` : (d?.message || "Could not unlock."));
    }
  };

  const recordResult = async (pick, { mastered, movesPlayed }) => {
    try {
      await api.post(`/api/endgame-trainer/${pick._id}/result`, { mastered, movesPlayed });
      load(); // refresh mastery ticks
    } catch { /* non-critical */ }
  };

  if (loading) return null;
  // Nothing curated yet. Embedded in a page (as a band) that means render nothing;
  // on its OWN page a blank screen looks broken, so callers can pass a fallback.
  if (!data || familyKeys.length === 0) return emptyFallback || null;

  // ── LIST VIEW (one family) ──
  if (family) {
    const picks = data.families[family] || [];
    return (
      <div style={S.band}>
        <div style={S.cardTop} />
        <div style={S.bandHead}>
          <button style={S.backBtn} onClick={() => setFamily(null)}>← Endgame Mastery</button>
          <h2 style={{ ...S.bandTitle, marginLeft: 6 }}>{FAMILY_ICON[family]} {FAMILY_LABEL[family]} endgames</h2>
        </div>
        <p style={S.bandSub}>Study the perfect technique for each — then play it out vs Stockfish at Easy, Medium or Hard. Master = convert without the eval ever slipping.</p>
        {error && <div style={{ color: "#f87171", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ marginBottom: 6 }}>
          {picks.map((p) => {
            const prog = progress[String(p._id)];
            const mastered = !!prog?.mastered;
            return (
              <div key={p._id} style={S.listRow}>
                <span style={{ fontSize: 20 }}>{mastered ? "✅" : (p.locked ? "🔒" : "♟")}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: "#fde9b8" }}>{p.title || "Endgame position"}</div>
                  <div style={{ fontSize: 12.5, color: "#cdb989" }}>
                    <span style={S.goalBadge(p.goal)}>{GOAL_LABEL[p.goal]}</span>
                    {p.idea ? <span style={{ marginLeft: 8 }}>{p.idea}</span> : null}
                    {prog?.attempts ? <span style={{ marginLeft: 8, color: "#94a3b8" }}>· {prog.attempts} attempt{prog.attempts === 1 ? "" : "s"}</span> : null}
                  </div>
                </div>
                {p.locked ? (
                  <button
                    style={{ ...S.lockBtn, opacity: data.walletXp < p.xpPrice ? 0.55 : 1 }}
                    disabled={data.walletXp < p.xpPrice}
                    onClick={() => unlock(p)}
                    title={data.walletXp < p.xpPrice ? "Not enough XP" : "Unlock with XP"}
                  >
                    🔓 Unlock ({p.xpPrice} XP)
                  </button>
                ) : (
                  <button style={S.playBtn} onClick={() => setPlaying(p)}>{mastered ? "Review" : "Study ▶"}</button>
                )}
              </div>
            );
          })}
        </div>
        {playing && <EndgameModal pick={playing} onClose={() => setPlaying(null)} onResult={recordResult} />}
      </div>
    );
  }

  // ── BAND VIEW (family cards) ──
  return (
    <div style={S.band}>
      <div style={S.cardTop} />
      <div style={S.bandHead}>
        <span style={S.bandRibbon}>⭐ PREMIUM</span>
        <h2 style={S.bandTitle}>Endgame Mastery — Study the Best Positions</h2>
      </div>
      <p style={S.bandSub}>Hand-picked positions worth knowing. Study the perfect line, explore with Stockfish, then play it out vs perfect defense.</p>
      {data.coach && !data.coach.subscribed && data.coach.free && (
        <div style={{
          margin: "0 0 12px", padding: "9px 13px", borderRadius: 10,
          background: "rgba(250,204,21,0.10)", border: "1px solid rgba(250,204,21,0.35)",
          color: "#fde9b8", fontSize: 13, lineHeight: 1.5,
        }}>
          🎁 <strong>Coach free trial</strong> — premium endgames are free for you for
          {" "}<strong>{data.coach.daysLeft} more day{data.coach.daysLeft === 1 ? "" : "s"}</strong>.
          After that you can still open them by spending XP, or{" "}
          <a href="/coach/subscription" style={{ color: "#fbbf24", fontWeight: 700 }}>subscribe</a>{" "}
          to keep them free forever.
        </div>
      )}
      <div style={S.grid}>
        {familyKeys.map((fam) => {
          const picks = data.families[fam] || [];
          const done = masteredCount(picks);
          return (
            <div
              key={fam}
              style={S.card}
              onClick={() => setFamily(fam)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 16px 34px rgba(0,0,0,0.5), 0 0 0 1px ${PREMIUM_ACCENT}66`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={S.cardGlyph}>{FAMILY_ICON[fam]}</div>
              <div style={S.cardIcon}>{FAMILY_ICON[fam]}</div>
              <div style={S.cardLabel}>{FAMILY_LABEL[fam]} endgames</div>
              <div style={S.cardCount}>{picks.length}<span style={S.cardSub}>to master</span></div>
              <div style={S.cardHint}>{done > 0 ? `✅ ${done} mastered · Train →` : "Train →"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
