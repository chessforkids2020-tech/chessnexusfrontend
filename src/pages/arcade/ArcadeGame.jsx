// FILE: src/pages/arcade/ArcadeGame.jsx
// Route: /arcade/game
// The actual multiplayer game — handles both TTT and Bingo via sockets

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  T, PageWrap, GlassCard, GradHeading, Btn, ErrorBanner,
  SOCKET_URL, API_BASE,
  SIDEBAR_OFFSET,
} from "./arcadeTheme";
import Chessboard from "../../components/Chessboard";
import { Chess } from "chess.js";
import { useAuth } from "../../contexts/AuthContext";
import StudyPuzzleSidebar from "../../components/StudyPuzzleSidebar";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function checkTTT(board, player, size) {
  const lines = [];
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return lines.some(combo => combo.every(i => board[i] === player));
}

// ─── CHESSBOARD ───────────────────────────────────────────────────────────────
// helper to convert our old lastMove string into the shape consumed by the shared board
function makeLastMoveObj(move) {
  if (!move || move.length !== 4) return null;
  return { from: move.slice(0, 2), to: move.slice(2) };
}

// ─── BINGO CARD ───────────────────────────────────────────────────────────────
function BingoCard({ label, card, marked, color, isActive, size, turnText }) {
  const cs = size === 3 ? 85 : size === 4 ? 72 : 62;
  const needed = size * size;
  // Always render exactly size*size cells — pad with empty string if card is short
  const rawCard = Array.isArray(card) ? card : [];
  const safeCard = rawCard.length >= needed
    ? rawCard.slice(0, needed)
    : [...rawCard, ...Array(needed - rawCard.length).fill("")];
  const markedSet = marked instanceof Set ? marked : new Set();
  if (!safeCard.length) return null;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity: isActive ? 1 : 0.7, transition:"opacity 0.3s" }}>
      <div style={{ color, fontWeight:700, fontSize:14, letterSpacing:"0.5px", textTransform:"uppercase" }}>{label}</div>
      <div style={{ background: T.glass, padding:8, border: isActive ? `2px solid ${color}60` : `1px solid ${color}25`, borderRadius:12, boxShadow: isActive ? `0 0 16px ${color}20` : "none", transition:"all 0.3s" }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${size},1fr)`, gap:3 }}>
          {safeCard.map((theme, i) => {
            const mk = markedSet.has(i);
            const themeStr = theme == null ? "" : typeof theme === "object" ? (theme.name || theme.theme || JSON.stringify(theme)) : String(theme);
            return (
              <div key={i} style={{ width:cs, height:cs, display:"flex", alignItems:"center", justifyContent:"center", background: mk ? `${color}25` : "rgba(255,255,255,0.08)", border: mk ? `1px solid ${color}70` : "1px solid rgba(255,255,255,0.15)", borderRadius:7, fontSize: mk ? 18 : size === 3 ? 11 : size === 4 ? 10 : 9, color: mk ? color : "#d1d5db", fontWeight: mk ? 700 : 500, textAlign:"center", lineHeight:1.2, padding:3, transition:"all 0.2s" }}>
                {mk ? "✓" : <span style={{ textTransform:"capitalize" }}>{themeStr}</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Turn indicator below the bingo card */}
      <div style={{ padding:"4px 14px", borderRadius:8, fontSize:12, fontWeight:700, letterSpacing:"0.3px", background: isActive ? `${color}18` : "transparent", border: isActive ? `1px solid ${color}40` : "1px solid transparent", color: isActive ? color : T.textDim, transition:"all 0.3s" }}>
        {turnText}
      </div>
    </div>
  );
}

// ─── MAIN GAME ────────────────────────────────────────────────────────────────
export default function ArcadeGame() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { user } = useAuth();

  // Restore session from sessionStorage on reload (nav state is lost on hard refresh in some browsers)
  const savedSession = (() => { try { const s = sessionStorage.getItem("arcade_session"); return s ? JSON.parse(s) : null; } catch { return null; } })();
  const src = state?.roomCode ? state : savedSession;

  if (!src?.roomCode) {
    navigate("/arcade");
    return null;
  }

  const { roomCode, gameType, boardSize: size, playerNum, username, userId: stateUserId, players, firstPlayer, gameState: initState } = src;
  const userId = stateUserId || user?._id || user?.id;
  const myUsername = user?.displayName || username || "Player";

  const socketRef = useRef(null);
  const isP1 = playerNum === 1;
  const oppNum = playerNum === 1 ? 2 : 1;

  // determine opponent name; if room has no other human yet treat as bot
  const initialOpp = players?.find(p => p.playerNum !== playerNum)?.displayName || players?.find(p => p.playerNum !== playerNum)?.username;
  // opponent name state: use initial from room or default to bot until a human joins
  const [oppName, setOppName] = useState(initialOpp || "bot");

  const playerColors  = { 1: T.p1, 2: T.p2 };
  const playerSymbols = { 1: "✕", 2: "○" };
  const isMobileView = typeof window !== "undefined" && window.innerWidth <= 480;
  const chessBoardWidth = isMobileView ? 320 : 450;
  const cellSize = isMobileView
    ? Math.floor(260 / size)
    : (size === 3 ? 82 : size === 4 ? 68 : 56);

  // ── State ──────────────────────────────────────────────────────────────────
  const [puzzle,      setPuzzle]      = useState(null);
  const [currentFen,   setCurrentFen]   = useState(null);
  const [boardOrientation, setBoardOrientation] = useState("white"); // flip board based on puzzle
  const [lastMove,    setLastMove]    = useState(null);
  const [currentTurn, setCurrentTurn] = useState(firstPlayer || 1);
  const [phase,       setPhase]       = useState("waiting_puzzle"); // waiting_puzzle | bot_moving | solving | pending_cell | pending_theme | opponent_turn | ended
  const [feedback,    setFeedback]    = useState("");
  const [error,       setError]       = useState("");
  const chessGameRef = useRef(null);
  const [winner,      setWinner]      = useState(null);
  const [isDraw,      setIsDraw]      = useState(false);
  const [forfeit,     setForfeit]     = useState(false);
  const [iSentRematch,     setISentRematch]     = useState(false);
  const [oppWantsRematch,  setOppWantsRematch]  = useState(false);
  const [disconnectMsg,    setDisconnectMsg]    = useState("");

  // TTT
  const [tttBoard,    setTttBoard]    = useState(initState?.board || Array(size * size).fill(null));
  const [hoveredCell, setHoveredCell] = useState(null);

  // Bingo — cards come from server in initState
  const p1Card = initState?.cards?.[1] || [];
  const p2Card = initState?.cards?.[2] || [];
  const myCard  = playerNum === 1 ? p1Card : p2Card;
  const oppCard = playerNum === 1 ? p2Card : p1Card;
  const [myMarked,  setMyMarked]  = useState(new Set(initState?.marked?.[playerNum] || []));
  const [oppMarked, setOppMarked] = useState(new Set(initState?.marked?.[oppNum]    || []));
  const [selTheme,    setSelTheme]    = useState(null);
  const [themeResult, setThemeResult] = useState(null);

  // theme options = unique themes from MY bingo card (the user picks which cell matches)
  const allThemes = [...new Set(myCard.map(t => typeof t === 'string' ? t : ''))];
  const isMyTurn  = currentTurn === playerNum;
  const currentColor = currentTurn === 1 ? "White" : "Black"; // for display purposes

  // ── Fetch puzzle (P1 fetches + syncs to P2) ─────────────────────────────────
  const fetchPuzzle = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/puzzles/random`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("No puzzles available in the database. Import some and try again.");
        } else {
          setError(`Server error (${res.status})`);
        }
        return;
      }
      const p = await res.json();
      console.log('[ArcadeGame] fetched puzzle', p);
      setPuzzle(p);
      setLastMove(null);
      socketRef.current?.emit("sync_puzzle", { roomCode, puzzle: p });
    } catch (err) {
      console.error('[ArcadeGame] failed to fetch puzzle:', err);
      setError("Unable to load puzzle from server.");
    }
  }, [roomCode]);

  // ── Persist session to sessionStorage so page reload can restore it ───────────
  useEffect(() => {
    if (roomCode) {
      sessionStorage.setItem("arcade_session", JSON.stringify({ roomCode, gameType, boardSize: size, playerNum, username, userId, players, firstPlayer, gameState: initState }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);
  // Keep session storage updated with live game state
  useEffect(() => {
    if (!roomCode || phase === "ended") return;
    try {
      const saved = sessionStorage.getItem("arcade_session");
      if (saved) {
        const session = JSON.parse(saved);
        if (gameType === "ttt") {
          session.gameState = { ...(session.gameState || {}), board: tttBoard, currentTurn };
        }
        if (gameType === "bingo") {
          session.gameState = {
            ...(session.gameState || {}),
            marked: { [playerNum]: [...myMarked], [oppNum]: [...oppMarked] },
            currentTurn,
          };
        }
        sessionStorage.setItem("arcade_session", JSON.stringify(session));
      }
    } catch (e) {}
  }, [tttBoard, myMarked, oppMarked, currentTurn, phase]);
  // ── Socket setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Connecting to arcade socket (URL hidden for security)
    const socket = io(`${SOCKET_URL}/arcade`, {
      auth: { token: localStorage.getItem("authToken") || localStorage.getItem("token") || "" },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 30000,
      upgrade: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      console.log('[ArcadeGame] socket connected via', socket.io.engine.transport.name, socket.id);
    });
    socket.on("connect_error", (err) => {
      console.error("[ArcadeGame] socket connect_error:", err);
      setError(`Connection error: ${err?.message || String(err)}. Retrying...`);
    });
    socket.on("connect_timeout", () => {
      console.error("[ArcadeGame] socket connect_timeout");
      setError("Connection timed out. Please refresh.");
    });

    socket.on("connect", () => {
      const uid = userId || user?._id || user?.id;
      const uname = username || user?.username;
      if (roomCode && (uid || uname)) socket.emit("reconnect_room", { roomCode, userId: uid, username: uname });
    });

    socket.on("reconnect_failed", ({ message }) => {
      setError(`❌ ${message || "Room no longer active."} Redirecting...`);
      sessionStorage.removeItem("arcade_session");
      setTimeout(() => navigate("/arcade"), 3000);
    });

    // ── NEW PUZZLE FLOW: server-managed bot-user-bot-user ──────────────────────
    socket.on("puzzle_started", ({ fen, originalFen, hint, theme, themes, totalMoves, botMove, lastMove: serverLastMove, playerMoveIndex, currentTurn: srvTurn, isReconnect }) => {
      console.log('[ArcadeGame] puzzle_started', { fen: fen?.substring(0,30), botMove, totalMoves, isReconnect, playerMoveIndex, themes });
      if (!fen) {
        console.warn('[ArcadeGame] puzzle_started missing fen — ignoring');
        return;
      }
      const game = new Chess(fen);
      chessGameRef.current = game;
      // Use themes array from DB (clean), theme is now the display string
      setPuzzle({ fen: originalFen || fen, hint: hint || "", theme: theme || "", themes: themes || [] });
      setSelTheme(null);
      setThemeResult(null);
      setCurrentTurn(srvTurn);

      // Determine board orientation based on the ORIGINAL puzzle fen
      // In multi-move puzzles, move[0] is the opponent/bot move, move[1] is the player's.
      const baseFen = originalFen || fen;
      const fenTurn = baseFen.split(' ')[1]; // 'w' or 'b'

      if (isReconnect) {
        // On reconnect: fen already has all completed moves applied
        // Orientation: if playerMoveIndex > 0 or totalMoves > 1, bot moved first
        if (totalMoves >= 2) {
          setBoardOrientation(fenTurn === 'w' ? 'black' : 'white');
        } else {
          setBoardOrientation(fenTurn === 'w' ? 'white' : 'black');
        }
        setCurrentFen(fen);
        setLastMove(serverLastMove || null);
        if (srvTurn === playerNum) {
          setPhase("solving");
          setFeedback(`🧩 Your turn! (${totalMoves - playerMoveIndex} move${totalMoves - playerMoveIndex > 1 ? 's' : ''} left)`);
        } else {
          setPhase("opponent_turn");
          setFeedback(`⏳ ${oppName}'s turn — watch the puzzle!`);
        }
        return;
      }

      if (botMove) {
        // Bot moves first as the FEN's active color, player is the other side
        setBoardOrientation(fenTurn === 'w' ? 'black' : 'white');
      } else {
        // Player moves directly as the FEN's active color
        setBoardOrientation(fenTurn === 'w' ? 'white' : 'black');
      }

      if (botMove) {
        // Show initial position, then animate bot's first move
        setCurrentFen(fen);
        setLastMove(null);
        setPhase(srvTurn === playerNum ? "bot_moving" : "opponent_turn");
        setFeedback(srvTurn === playerNum ? "🤖 Bot is making a move..." : `⏳ ${oppName}'s turn — watch the puzzle!`);
        setTimeout(() => {
          try { game.move({ from: botMove.slice(0,2), to: botMove.slice(2,4), promotion: botMove[4] || undefined }); } catch(e) { console.warn('bot move error', e); }
          setCurrentFen(game.fen());
          setLastMove(botMove);
          if (srvTurn === playerNum) {
            setPhase("solving");
            setFeedback("");
          }
        }, 800);
      } else {
        // Single-move puzzle — player goes directly
        setCurrentFen(fen);
        setLastMove(null);
        setPhase(srvTurn === playerNum ? "solving" : "opponent_turn");
        setFeedback("");
      }
    });

    socket.on("bot_move", ({ botMove, isFinal, remainingMoves }) => {
      console.log('[ArcadeGame] bot_move', { botMove, isFinal });
      const game = chessGameRef.current;
      if (!game) return;
      setPhase("bot_moving");
      setFeedback("🤖 Bot responds...");
      setTimeout(() => {
        try { game.move({ from: botMove.slice(0,2), to: botMove.slice(2,4), promotion: botMove[4] || undefined }); } catch(e) { console.warn('bot move error', e); }
        setCurrentFen(game.fen());
        setLastMove(botMove);
        if (!isFinal) {
          setPhase("solving");
          setFeedback(`🧩 Your turn! (${remainingMoves} move${remainingMoves > 1 ? 's' : ''} left)`);
        }
      }, 600);
    });

    socket.on("puzzle_complete", ({ playerNum: pNum, gameType: gt }) => {
      console.log('[ArcadeGame] puzzle_complete', { pNum });
      if (pNum === playerNum) {
        setFeedback("✅ Puzzle solved!");
        setPhase(gt === "ttt" ? "pending_cell" : "pending_theme");
      } else {
        setFeedback(`✅ ${oppName} solved the puzzle!`);
        setPhase("opponent_turn");
      }
    });

    socket.on("puzzle_failed", ({ playerNum: pNum, wrongMove, correctMove }) => {
      if (pNum === playerNum) {
        // Undo the player's optimistic move
        if (chessGameRef.current) { try { chessGameRef.current.undo(); setCurrentFen(chessGameRef.current.fen()); } catch(e) {} }
        setFeedback(`❌ Wrong! Correct was ${correctMove}. Turn passes.`);
      } else {
        setFeedback(`❌ ${oppName} got it wrong! Your turn next.`);
      }
      setPhase("waiting_puzzle");
    });

    socket.on("puzzle_error", ({ message }) => setError(message));

    // TTT: server confirms cell claim with authoritative board state
    socket.on("cell_claimed", ({ playerNum: pNum, cellIndex, board }) => {
      setTttBoard(board);
      setHoveredCell(null);
    });

    // Bingo: server confirms theme with authoritative marked indexes
    socket.on("theme_result", ({ playerNum: pNum, theme, isCorrect, correctTheme, markedIndexes }) => {
      console.log('[ArcadeGame] theme_result received', { pNum, playerNum, theme, isCorrect, correctTheme });
      if (pNum === playerNum) {
        setMyMarked(new Set(markedIndexes));
        setThemeResult(isCorrect ? "correct" : "wrong");
        setPhase("theme_answered"); // New phase to show result
      } else {
        setOppMarked(new Set(markedIndexes));
      }
      setFeedback(isCorrect ? `🎯 "${theme}" is correct!` : `❌ Wrong! It was "${correctTheme}"`);
    });

    // Turn change
    socket.on("turn_change", ({ nextPlayer }) => {
      console.log('[ArcadeGame] turn_change received', { nextPlayer, playerNum });
      setCurrentTurn(nextPlayer);
      setPhase("waiting_puzzle");
      // Delay clearing selection state so user can see their result
      setTimeout(() => {
        setSelTheme(null);
        setThemeResult(null);
      }, 100);
      setFeedback(nextPlayer === playerNum ? "Loading puzzle..." : `${oppName}'s turn...`);
    });

    // Pass turn — someone chose None
    socket.on("turn_passed", ({ playerNum: passedBy }) => {
      const passer = passedBy === playerNum ? "You" : oppName;
      setFeedback(`⏭️ ${passer} passed — no matching theme on the board.`);
    });

    // Game over
    socket.on("game_over", ({ winner: w, isDraw: d, reason }) => {
      setWinner(w);
      setIsDraw(!!d);
      setForfeit(reason === "forfeit");
      setPhase("ended");
      sessionStorage.removeItem("arcade_session");
    });

    // Reconnect — server sends full current state
    socket.on("reconnected", ({ gameState: gs, puzzle: savedPuzzle, gameEnded, gameStarted, hasPuzzle, players: rPlayers }) => {
      console.log('[ArcadeGame] reconnected', { gameStarted, gameEnded, hasPuzzle, hasPuzzleData: !!savedPuzzle });
      if (gs) {
        if (gameType === "ttt") setTttBoard(gs.board || []);
        if (gameType === "bingo") {
          setMyMarked(new Set(gs.marked?.[playerNum] || []));
          setOppMarked(new Set(gs.marked?.[oppNum] || []));
        }
        setCurrentTurn(gs.currentTurn || 1);
      }
      if (savedPuzzle) setPuzzle(savedPuzzle);
      if (gameEnded) {
        setPhase("ended");
      } else if (gameStarted && !hasPuzzle) {
        // Game is active but between puzzles — server will send a new puzzle shortly
        setPhase("waiting_puzzle");
        setFeedback("♻️ Reconnected! Loading next puzzle...");
      } else if (gameStarted && hasPuzzle) {
        // Puzzle will arrive via puzzle_started event
        setPhase("waiting_puzzle");
      }
      const opp = rPlayers?.find(p => p.playerNum !== playerNum);
      if (opp) setOppName(opp.displayName || opp.username);
      setDisconnectMsg("");
      if (!gameEnded) {
        setFeedback(prev => prev || "♻️ Reconnected!");
        setTimeout(() => setFeedback(""), 2000);
      }
    });

    // Opponent events
    socket.on("opponent_disconnected", ({ message }) => setDisconnectMsg(message));
    socket.on("opponent_reconnected",  ({ username: u }) => { setDisconnectMsg(""); setFeedback(`✅ ${u} reconnected!`); setTimeout(() => setFeedback(""), 2000); });

    // Rematch
    socket.on("rematch_requested", ({ from }) => { setOppWantsRematch(true); setFeedback(`🔄 ${from} wants a rematch!`); });

    socket.on("game_start", ({ gameState: gs, firstPlayer: fp }) => {
      setTttBoard(gs?.board || Array(size * size).fill(null));
      setMyMarked(new Set()); setOppMarked(new Set());
      setCurrentTurn(fp || 1);
      setPhase("waiting_puzzle"); setFeedback("Loading first puzzle..."); setSelTheme(null); setThemeResult(null);
      setWinner(null); setIsDraw(false); setForfeit(false);
      setISentRematch(false); setOppWantsRematch(false);
      setPuzzle(null);
      // Server auto-starts first puzzle
    });

    // Server handles puzzle fetching — no client fetch needed

    return () => socket.disconnect();
  }, [roomCode]);

  // Safety-net: if auth loaded AFTER socket connected (race condition on reload),
  // re-emit reconnect_room once user is available and puzzle still hasn't arrived
  useEffect(() => {
    if (!user || puzzle) return;
    const uid = userId || user._id || user.id;
    const uname = username || user?.username;
    const socket = socketRef.current;
    if (socket?.connected && (uid || uname)) {
      console.log('[ArcadeGame] safety-net: re-emitting reconnect_room');
      socket.emit("reconnect_room", { roomCode, userId: uid, username: uname });
    }
  }, [user, puzzle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry reconnect if stuck on loading for more than 5 seconds
  useEffect(() => {
    if (puzzle || phase === "ended") return;
    const timer = setTimeout(() => {
      const socket = socketRef.current;
      const uid = userId || user?._id || user?.id;
      const uname = username || user?.username;
      if (socket?.connected && !puzzle && phase !== "ended" && (uid || uname)) {
        console.log('[ArcadeGame] retry reconnect after timeout');
        socket.emit("reconnect_room", { roomCode, userId: uid, username: uname });
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [puzzle, phase]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Move handlers ─────────────────────────────────────────────────────────────

  // ── Move handler — sends to server for validation ──────────────────────────
  const handleMove = (from, to, promotion) => {
    if (!isMyTurn || phase !== "solving" || !puzzle) return;
    const game = chessGameRef.current;
    if (!game) return;

    // Try the move in chess.js to verify legality
    let moveResult = null;
    try {
      moveResult = game.move({ from, to, promotion: promotion?.toLowerCase() || undefined });
    } catch (e) {}
    // If failed and it could be a promotion, try with queen
    if (!moveResult) {
      try {
        moveResult = game.move({ from, to, promotion: 'q' });
        if (moveResult) promotion = 'q';
      } catch (e2) {}
    }
    if (!moveResult) return; // illegal move

    // Apply move locally (optimistic update)
    const uci = from + to + (promotion ? promotion.toLowerCase() : '');
    setCurrentFen(game.fen());
    setLastMove(uci);
    setPhase("bot_moving"); // waiting for server response
    setFeedback("⏳ Checking...");

    // Send to server for validation
    socketRef.current?.emit("puzzle_move", { roomCode, move: uci });
  };

  const handleCellClick = idx => {
    if (!isMyTurn || phase !== "pending_cell" || tttBoard[idx] !== null) return;
    socketRef.current?.emit("cell_claimed", { roomCode, playerNum, cellIndex: idx });
    // Optimistic board update
    const nb = [...tttBoard]; nb[idx] = playerNum; setTttBoard(nb);
    setPhase("waiting_puzzle");
    setFeedback("");
    // Server auto-switches turn and starts next puzzle
  };

  const handleThemeSelect = theme => {
    if (!isMyTurn || phase !== "pending_theme" || selTheme || !puzzle) return;
    setSelTheme(theme);
    // Send only the selected theme — server validates against DB themes[] array directly
    socketRef.current?.emit("theme_selected", { roomCode, playerNum, theme });
  };

  const handlePassTurn = () => {
    if (!isMyTurn || phase !== "pending_theme" || selTheme) return;
    setSelTheme("__pass__");
    setFeedback("⏭️ Passing turn...");
    socketRef.current?.emit("pass_turn", { roomCode, playerNum });
  };

  const handleRematch = () => {
    setISentRematch(true);
    socketRef.current?.emit("request_rematch", { roomCode, playerNum });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  const handleManualReconnect = useCallback(() => {
    const socket = socketRef.current;
    const uid = userId || user?._id || user?.id;
    const uname = username || user?.username;
    if (socket?.connected && (uid || uname)) {
      socket.emit("reconnect_room", { roomCode, userId: uid, username: uname });
      setFeedback("♻️ Reconnecting...");
    } else if (socket && !socket.connected) {
      socket.connect();
      setFeedback("🔌 Reconnecting socket...");
    }
  }, [roomCode, userId, username, user]);

  if (!puzzle && phase !== "ended") return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <StudyPuzzleSidebar />
      <div style={{ flex: 1 }}>
        <PageWrap maxWidth={500}>
          {error && <ErrorBanner message={error} onClose={() => setError("")} />}
          <GlassCard style={{ textAlign:"center", padding:"56px 40px" }}>
            <GradHeading size={20} style={{ marginBottom:8 }}>
              {feedback || "Loading game..."}
            </GradHeading>
            <p style={{ color:T.textMuted, fontSize:13, marginBottom: 16 }}>Room: <span style={{ color:T.accent1, fontWeight:700, letterSpacing:2 }}>{roomCode}</span></p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Btn primary onClick={handleManualReconnect} style={{ fontSize:13, padding:"8px 20px" }}>
                🔄 Reconnect
              </Btn>
              <Btn ghost onClick={() => { sessionStorage.removeItem("arcade_session"); navigate("/arcade"); }} style={{ fontSize:13, padding:"8px 20px" }}>
                ← Back to Arcade
              </Btn>
            </div>
          </GlassCard>
        </PageWrap>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <StudyPuzzleSidebar />
      <div style={{ flex: 1 }}>
        <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, padding: gameType === "bingo" ? "6px 12px 14px" : "14px 12px", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {error && <ErrorBanner message={error} onClose={() => setError("")} />}
          <div style={{ position:"fixed", inset:0, background:T.bgRadial, pointerEvents:"none" }} />
          <div style={{ maxWidth: gameType === "bingo" ? 1180 : 980, margin:"0 auto", position:"relative", zIndex:1, width:"100%" }}>

        {/* Disconnect warning */}
        {disconnectMsg && (
          <div style={{ background:`${T.wrong}12`, border:`1px solid ${T.wrong}35`, borderRadius:10, padding:"8px 16px", marginBottom:10, color:T.wrong, fontSize:13, textAlign:"center" }}>
            ⚠️ {disconnectMsg}
          </div>
        )}

        {/* ══ TTT GAME ══ */}
        {gameType === "ttt" && puzzle?.fen && (
          <div className="arc-game-ttt">

            {/* LEFT — Chessboard */}
            <GlassCard className="arc-ttt-chess" style={{ padding:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
              <Chessboard
                position={currentFen || puzzle.fen}
                orientation={boardOrientation}
                onDrop={(src, dst, promo) => handleMove(src, dst, promo)}
                lastMove={makeLastMoveObj(lastMove)}
                draggable={isMyTurn && phase === "solving"}
                allowMovePiece={() => isMyTurn && phase === "solving"}
                coordinateSides={['bottom', 'left']}
                boardWidth={chessBoardWidth}
              />
              {!isMyTurn && <div style={{ color:T.textDim, fontSize:12 }}>Watch {oppName} solve...</div>}
              {phase === "bot_moving" && isMyTurn && <div style={{ color:T.accent1, fontSize:12 }}>🤖 Bot making move...</div>}
              {feedback && (
                <div style={{ fontSize:13, fontWeight:600, color: feedback.startsWith("❌") ? T.wrong : T.correct, textAlign:"center" }}>
                  {feedback}
                </div>
              )}
            </GlassCard>

            {/* RIGHT — Title + Turn banner + TTT board */}
            <GlassCard className="arc-ttt-board" style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:14, minWidth:420, flex:1 }}>

              {/* Game title */}
              <div style={{ fontSize:18, fontWeight:800, background:T.accentGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                {gameType === "ttt" ? "⚔️ Tic-Tac-Toe" : "🎯 Chess Bingo"} • {size}×{size}
              </div>

              {/* Turn banner */}
              <div style={{ width:"100%", background:`${playerColors[currentTurn]}12`, border:`1px solid ${playerColors[currentTurn]}35`, borderRadius:10, padding:"8px 16px", color:playerColors[currentTurn], fontWeight:600, fontSize:14, textAlign:"center" }}>
                {phase === "bot_moving"      ? "🤖 Bot is making a move..."
                : phase === "waiting_puzzle" ? "⏳ Loading next puzzle..."
                : isMyTurn
                  ? phase === "pending_cell"  ? "✅ Puzzle solved! Claim your square"
                  : phase === "pending_theme" ? "🎯 Puzzle solved! Identify the theme!"
                  : phase === "solving"       ? "🧩 Your turn — find the best move!"
                  :                             "⏳ Waiting..."
                  : `⏳ ${oppName}'s turn...`}
              </div>

              {/* Opponent name — above board */}
              <div style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start" }}>
                <span style={{ color: playerColors[oppNum], fontWeight:800, fontSize:24 }}>{playerSymbols[oppNum]}</span>
                <span style={{ color: playerColors[oppNum], fontWeight:700, fontSize:18 }}>{oppName}</span>
                <span style={{ fontSize:12, fontWeight:600, color: oppNum === currentTurn ? T.accent1 : T.textDim }}>
                  {oppNum === currentTurn ? "▶ Their turn" : "Waiting..."}
                </span>
              </div>

              {/* TTT grid */}
              <div style={{ display:"grid", gridTemplateColumns:`repeat(${size},1fr)`, gap:6 }}>
                {tttBoard.map((cell, i) => {
                  const hov = hoveredCell === i && !cell && isMyTurn && phase === "pending_cell";
                  return (
                    <div key={i}
                      onClick={() => handleCellClick(i)}
                      onMouseEnter={() => setHoveredCell(i)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ width:cellSize, height:cellSize, display:"flex", alignItems:"center", justifyContent:"center", background: cell ? `${playerColors[cell]}15` : hov ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)", border: cell ? `1px solid ${playerColors[cell]}50` : hov ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.05)", borderRadius:10, cursor: !cell && isMyTurn && phase === "pending_cell" ? "pointer" : "default", transition:"all 0.15s", fontSize: size === 3 ? 34 : size === 4 ? 26 : 20, fontWeight:900, color: cell ? playerColors[cell] : T.textDim, transform: hov ? "scale(1.06)" : "scale(1)" }}>
                      {cell ? playerSymbols[cell] : (hov ? "?" : "")}
                    </div>
                  );
                })}
              </div>

              {/* My name — below board */}
              <div style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start" }}>
                <span style={{ color: playerColors[playerNum], fontWeight:800, fontSize:24 }}>{playerSymbols[playerNum]}</span>
                <span style={{ color: playerColors[playerNum], fontWeight:700, fontSize:18 }}>{myUsername}</span>
                <span style={{ fontSize:12, fontWeight:600, color: playerNum === currentTurn ? T.correct : T.textDim }}>
                  {playerNum === currentTurn ? "▶ Your turn" : "Waiting..."}
                </span>
              </div>

            </GlassCard>
          </div>
        )}

        {/* ══ BINGO GAME ══ */}
        {gameType === "bingo" && puzzle?.fen && (
          <div style={{ position:"relative" }}>
            {/* Back button — top left, aligned with board */}
            <button
              onClick={() => { sessionStorage.removeItem("arcade_session"); navigate("/arcade"); }}
              style={{ position:"absolute", top:0, left:0, zIndex:10, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"5px 12px", color:"#d1d5db", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font, transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(6,182,212,0.15)"; e.currentTarget.style.borderColor="rgba(6,182,212,0.4)"; e.currentTarget.style.color=T.accent1; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; e.currentTarget.style.color="#d1d5db"; }}
            >← Arcade</button>
            <div className="arc-game-bingo">

            <BingoCard label="You" card={myCard} marked={myMarked} color={playerColors[playerNum]} isActive={isMyTurn} size={size} turnText={isMyTurn ? "▶ Your turn" : "Waiting..."} />

            {/* Center: board + turn banner + theme buttons */}
            <GlassCard style={{ padding:"8px 2px 18px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, flex:"1 1 auto", minWidth:0, maxWidth:520 }}>

              {/* Game title */}
              <div style={{ fontSize:18, fontWeight:800, background:T.accentGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:-10 }}>
                🎯 Chess Bingo • {size}×{size}
              </div>

              <Chessboard
                position={currentFen || puzzle.fen}
                orientation={boardOrientation}
                onDrop={(src, dst, promo) => handleMove(src, dst, promo)}
                lastMove={makeLastMoveObj(lastMove)}
                draggable={isMyTurn && phase === "solving"}
                allowMovePiece={() => isMyTurn && phase === "solving"}
                boardWidth={typeof window !== "undefined" ? (window.innerWidth <= 480 ? Math.min(320, window.innerWidth - 32) : Math.min(420, window.innerWidth - 500)) : 420}
                coordinateSides={["bottom", "left"]}
              />
              {feedback && (
                <div style={{ fontSize:13, fontWeight:600, color: feedback.startsWith("❌") ? T.wrong : T.correct, textAlign:"center" }}>
                  {feedback}
                </div>
              )}

              {/* Theme buttons — show themes from player's card */}
              <div style={{ width:"100%", maxWidth:400 }}>
                <div style={{ color: phase === "theme_answered" ? (themeResult === "correct" ? T.correct : T.wrong) : isMyTurn && phase === "pending_theme" ? T.accent1 : T.textMuted, fontSize:13, textAlign:"center", marginBottom:8, fontWeight: phase === "pending_theme" || phase === "theme_answered" ? 700 : 400 }}>
                  {phase === "theme_answered" ? (themeResult === "correct" ? "✅ Correct! You selected:" : "❌ Wrong! You selected:") : isMyTurn && phase === "pending_theme" ? "🎯 Which theme matches this puzzle?" : isMyTurn && phase === "solving" ? "🧩 Solve the puzzle first!" : !isMyTurn ? `⏳ ${oppName}'s turn...` : ""}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
                  {allThemes.filter(Boolean).map(theme => {
                    const isSel = selTheme === theme;
                    const ok    = isSel && themeResult === "correct";
                    const bad   = isSel && themeResult === "wrong";
                    const waitingResult = isSel && !themeResult; // Selected but waiting for server
                    const can   = isMyTurn && phase === "pending_theme" && !selTheme;
                    return (
                      <button key={theme} onClick={() => handleThemeSelect(theme)} disabled={!can}
                        style={{ 
                          background: ok ? `${T.correct}25` : bad ? `${T.wrong}25` : waitingResult ? "rgba(6,182,212,0.2)" : can ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", 
                          border: ok ? `2px solid ${T.correct}` : bad ? `2px solid ${T.wrong}` : waitingResult ? `2px solid ${T.accent1}` : can ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)", 
                          color: ok ? T.correct : bad ? T.wrong : waitingResult ? T.accent1 : can ? "#e5e7eb" : T.textDim, 
                          borderRadius:8, padding:"7px 14px", fontSize:12, 
                          fontWeight: (can || isSel) ? 600 : 400, 
                          cursor: can ? "pointer" : "default", fontFamily:T.font, transition:"all 0.2s", textTransform:"capitalize", letterSpacing: "0.3px",
                          transform: isSel ? "scale(1.05)" : "scale(1)"
                        }}
                        onMouseEnter={e => { if (can && !isSel) { e.currentTarget.style.background="rgba(6,182,212,0.18)"; e.currentTarget.style.borderColor="rgba(6,182,212,0.5)"; e.currentTarget.style.color=T.accent1; e.currentTarget.style.transform="scale(1.05)"; }}}
                        onMouseLeave={e => { if (can && !isSel) { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; e.currentTarget.style.color="#e5e7eb"; e.currentTarget.style.transform="scale(1)"; }}}
                      >{isSel && waitingResult ? `⏳ ${theme}` : theme}</button>
                    );
                  })}
                </div>
                {themeResult === "correct" && <div style={{ color:T.correct, fontSize:12, textAlign:"center", marginTop:6, fontWeight:600 }}>✅ Correct! Cell marked on your board.</div>}
                {themeResult === "wrong" && <div style={{ color:T.wrong, fontSize:12, textAlign:"center", marginTop:6, fontWeight:600 }}>❌ Wrong theme! Turn passes.</div>}

                {/* None / Pass button */}
                {(isMyTurn && (phase === "pending_theme" || selTheme === "__pass__")) && (
                  <div style={{ width:"100%", display:"flex", justifyContent:"center", marginTop:10 }}>
                    <button
                      onClick={handlePassTurn}
                      disabled={!!selTheme}
                      style={{
                        background: selTheme === "__pass__" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                        border: selTheme === "__pass__" ? "2px solid #f59e0b" : "1px dashed rgba(255,255,255,0.25)",
                        color: selTheme === "__pass__" ? "#f59e0b" : "#9ca3af",
                        borderRadius:8, padding:"7px 22px", fontSize:12,
                        fontWeight: 600, cursor: selTheme ? "default" : "pointer",
                        fontFamily:T.font, transition:"all 0.2s", letterSpacing:"0.3px"
                      }}
                      onMouseEnter={e => { if (!selTheme) { e.currentTarget.style.background="rgba(245,158,11,0.15)"; e.currentTarget.style.borderColor="rgba(245,158,11,0.5)"; e.currentTarget.style.color="#f59e0b"; }}}
                      onMouseLeave={e => { if (!selTheme) { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.25)"; e.currentTarget.style.color="#9ca3af"; }}}
                    >
                      {selTheme === "__pass__" ? "⏳ Passing..." : "⏭️ None — Pass Turn"}
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>

            <BingoCard label={oppName} card={oppCard} marked={oppMarked} color={playerColors[oppNum]} isActive={!isMyTurn} size={size} turnText={!isMyTurn ? "▶ Their turn" : "Waiting..."} />
            </div>
          </div>
        )}

        {/* ══ GAME OVER OVERLAY ══ */}
        {phase === "ended" && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(12px)" }}>
            <GlassCard style={{ padding:48, textAlign:"center", maxWidth:420, width:"90%", border:`1px solid ${winner ? playerColors[winner] + "60" : "rgba(255,255,255,0.1)"}` }}>
              <div style={{ fontSize:64, marginBottom:14 }}>
                {isDraw ? "🤝" : winner === playerNum ? "🏆" : "😔"}
              </div>
              <GradHeading size={30} style={{ marginBottom:8, ...(isDraw ? {} : { background: winner === playerNum ? "linear-gradient(135deg,#10b981,#06b6d4)" : "linear-gradient(135deg,#ef4444,#f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }) }}>
                {isDraw ? "It's a Draw!" : winner === playerNum ? "You Win! 🎉" : "You Lose!"}
              </GradHeading>
              {gameType === "bingo" && !isDraw && winner === playerNum && (
                <p style={{ color:T.accent1, fontSize:22, fontWeight:700, margin:"0 0 4px" }}>BINGO!</p>
              )}
              {forfeit && <p style={{ color:T.textMuted, fontSize:13 }}>Opponent forfeited</p>}
              <p style={{ color:T.textMuted, marginBottom:28, fontSize:14 }}>
                {isDraw ? "What a battle!" : winner === playerNum ? "Great tactical vision!" : "Better luck next time!"}
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
                {/* Rematch logic */}
                {!iSentRematch && !oppWantsRematch && (
                  <Btn primary full onClick={handleRematch}>🔄 Request Rematch</Btn>
                )}
                {iSentRematch && !oppWantsRematch && (
                  <div style={{ color:T.textMuted, fontSize:14, padding:"8px 0" }}>Rematch request sent... waiting</div>
                )}
                {oppWantsRematch && !iSentRematch && (
                  <Btn primary full onClick={handleRematch}>✅ Accept Rematch!</Btn>
                )}
                {oppWantsRematch && iSentRematch && (
                  <div style={{ color:T.correct, fontSize:14, padding:"8px 0" }}>Starting rematch...</div>
                )}
                <Btn ghost full onClick={() => navigate("/arcade")} style={{ maxWidth:260 }}>← Back to Arcade</Btn>
              </div>
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  </div>
</div>
  );
}
