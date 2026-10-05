import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import Chessboard, { gutterFor } from '../../components/Chessboard';
import api, { resolveApiAssetUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { getFriendIdentity } from './friendIdentity';
import FriendGameChat from '../../components/FriendGameChat';
import FriendVoiceBar from '../../components/FriendVoiceBar';
import EnginePanel from '../../components/EnginePanel';
import useSquareEvals from '../../hooks/useSquareEvals';
import { analyzeGame } from '../../components/masterGames/analyzeGame';
import UserAvatar from '../../components/UserAvatar';
import './FriendGame.css';

// NOTE: `import.meta.env.X` must be written EXACTLY like this — plain, with no
// optional chaining. Vite performs a literal TEXT substitution of that pattern at
// build time; `import.meta?.env?.VITE_API_URL` does not match, so it survives into
// the bundle as a real runtime lookup. In a browser `import.meta.env` does not
// exist, so it evaluated to undefined and fell through to the origin — this page
// tried to open a socket to https://www.chessnexus.in/friendgame (Vercel, which
// runs no Socket.IO server) instead of the API host. It never connected, never
// created a room, and never reached the backend, so there was nothing in the
// server logs and no console error either.
const SOCKET_URL = import.meta.env.VITE_API_URL ||
  window.location.origin.replace('5173', '5000');

// Production prefers a native WebSocket so we don't stall on HTTP long-polling.
// Polling stays in the list as a fallback: websocket-only has no second chance if
// the WSS upgrade is blocked (corporate proxy, some mobile networks), and this
// page is the only socket in the app that used to forbid it.
const IS_PROD = import.meta.env.PROD;
const SOCKET_TRANSPORTS = IS_PROD ? ['websocket', 'polling'] : ['polling', 'websocket'];

// Widest the board is allowed to get. The middle grid column is 640px on a large
// screen (1280 container - two 300px cards - two 20px gaps), so 600 lets a big
// display actually use its space while leaving room for the coordinate gutter.
const BOARD_MAX_PX = 600;
// Single-column layout at or below this width (matches FriendGame.css and the
// board's own touch breakpoint).
const MOBILE_MAX_PX = 1024;

function fmtClock(secs) {
  if (secs == null) return '--:--';
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const MOVE_MARKS = {
  blunder: { color: '#ef4444', symbol: '??', label: 'Blunders' },
  mistake: { color: '#f97316', symbol: '?', label: 'Mistakes' },
  inaccuracy: { color: '#eab308', symbol: '?!', label: 'Inaccuracies' },
};

// Clickable move list (Lichess-style): White/Black columns. `current` is the ply
// being viewed (moves.length = live). onSelect(plyAfterThisMove) jumps the board.
// `marks` (ply → blunder|mistake|inaccuracy) colours analysed moves.
function MoveList({ moves, current, onSelect, marks = {} }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ no: i / 2 + 1, w: moves[i], wPly: i + 1, b: moves[i + 1], bPly: i + 2 });
  }
  const endRef = useRef(null);
  const listRef = useRef(null);
  // Scroll the LIST only. scrollIntoView also scrolls the page, and on a phone or
  // iPad (list below the board) that made the board jump on every move.
  useEffect(() => {
    const el = endRef.current, box = listRef.current;
    if (!el || !box) return;
    const top = el.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 24) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 2);
    }
  }, [current, moves.length]);
  const cell = (san, ply) => {
    if (!san) return <span className="fg-move-san" />;
    const mark = MOVE_MARKS[marks[ply]];
    return (
      <button
        className={`fg-move-san ${current === ply ? 'active' : ''}`}
        onClick={() => onSelect(ply)}
        style={mark ? { color: mark.color, fontWeight: 800 } : undefined}
        title={mark ? marks[ply] : undefined}
      >
        {san}{mark ? mark.symbol : ''}
      </button>
    );
  };
  return (
    <div className="fg-moves-list" ref={listRef}>
      {rows.length === 0 ? (
        <div className="fg-moves-empty">No moves yet</div>
      ) : (
        rows.map((r) => (
          <div className="fg-move-row" key={r.no}>
            <span className="fg-move-no">{r.no}.</span>
            {cell(r.w, r.wPly)}
            {cell(r.b, r.bPly)}
            {(current === r.wPly || current === r.bPly) && <span ref={endRef} />}
          </div>
        ))
      )}
    </div>
  );
}

// Avatar: resolved image (custom photo or basic avatar) if present, else a
// colored initial circle. `imageUrl` is expected already-absolute.
function PlayerAvatar({ name, user, imageUrl }) {
  // In-game avatar: renders the shared UserAvatar (3D shown as a still frame).
  // `imageUrl` (resolved photo/basic url) is passed through as profilePhotoUrl so
  // basic-avatar players still render even when only the resolved url is known.
  return (
    <div className="fg-avatar">
      <UserAvatar
        user={user}
        displayName={name}
        profilePhotoUrl={user?.profilePhotoUrl || imageUrl}
        active3dModel={user?.active3dModel}
        size={34}
      />
    </div>
  );
}

export default function FriendGame() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const me = getFriendIdentity(user);
  // Guest accounts (no login, or a role:'guest' account) cannot use voice.
  const voiceGuest = !user || user.role === 'guest';

  // Map of basic-avatar key → absolute imageUrl (fetched once). Used to render
  // a player's chosen basic avatar; custom photos use profilePhotoUrl directly.
  const [avatarMap, setAvatarMap] = useState({});
  useEffect(() => {
    let active = true;
    api.get('/api/auth/avatar-options')
      .then((res) => {
        if (!active) return;
        const map = {};
        (res.data?.basicOptions || []).forEach((opt) => {
          if (opt.key && opt.imageUrl) map[opt.key] = resolveApiAssetUrl(opt.imageUrl);
        });
        setAvatarMap(map);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Resolve a player's avatar image: custom photo → basic avatar → none.
  const avatarUrlFor = useCallback((player) => {
    if (!player) return '';
    if (player.profilePhotoUrl) return resolveApiAssetUrl(player.profilePhotoUrl);
    if (player.activeAvatar && avatarMap[player.activeAvatar]) return avatarMap[player.activeAvatar];
    return '';
  }, [avatarMap]);

  // /friend/new with state.create === true → we create the room.
  // /friend/:code → we join the room with that code.
  const createIntent = location.state?.create ? location.state : null;
  const isCreator = !!createIntent;

  const socketRef = useRef(null);
  const gameRef = useRef(new Chess());
  // Tracks whether we've already created the room, so reconnects re-join (by code)
  // instead of creating a duplicate room or re-emitting the original create.
  const createdRef = useRef(false);
  const roomCodeRef = useRef(null);

  // For a creator, the code is unknown until room_created; track it in state.
  const [roomCode, setRoomCode] = useState(isCreator ? null : (code || '').toUpperCase());

  const [room, setRoom] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [clocks, setClocks] = useState({ white: null, black: null });
  const [phase, setPhase] = useState('connecting'); // connecting|waiting|active|aborted|finished
  const [connectError, setConnectError] = useState(false);
  const [result, setResult] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moves, setMoves] = useState([]); // SAN list for the move panel
  // Move-list navigation. null = following the live game; a number = viewing the
  // position AFTER that ply index (0-based). Replaying moves from startFen.
  const [viewPly, setViewPly] = useState(null);
  const startFenRef = useRef('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState(null);       // { from, to } — highlighted

  // ── Post-game (finished/aborted only) ──
  const [popupHidden, setPopupHidden] = useState(false);
  const [rematchState, setRematchState] = useState(null);   // null | 'sent' | 'offered'
  const [friendLeftRoom, setFriendLeftRoom] = useState(false);
  const [engineOn, setEngineOn] = useState(false);
  const [squaresOn, setSquaresOn] = useState(false);
  // { status: idle|running|done|error, done, total, marks: { ply: class } }
  const [analysis, setAnalysis] = useState({ status: 'idle' });
  const analysisRunRef = useRef(0);
  // Free exploration from a game position: { fen, sans, lastMove }. Local only.
  const [explore, setExplore] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;

  const resetPostGame = useCallback(() => {
    analysisRunRef.current++;               // cancels a running analysis
    setPopupHidden(false); setRematchState(null); setEngineOn(false); setSquaresOn(false);
    setAnalysis({ status: 'idle' }); setExplore(null);
  }, []);
  useEffect(() => () => { analysisRunRef.current++; }, []);
  const chessboardPremoveRef = useRef(null);            // queued premove, fired on opponent's move

  // Render the board at its TRUE measured pixel width so the arrow SVG overlay
  // (sized in absolute px inside Chessboard) matches the squares exactly. A
  // hardcoded boardWidth + CSS down-scaling distorts/fattens the arrows — this
  // mirrors how Study sizes its board. Capped at 520 (the design max).
  const boardWrapRef = useRef(null);
  const [boardPx, setBoardPx] = useState(520);
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (!w) return;
      // Phones/tablets (same 1024px line as the board's own touch layout): edge
      // to edge like HealthyMix. Coordinates sit inside the board there, so no
      // gutter; Chessboard itself caps the size by screen height.
      if (window.innerWidth <= MOBILE_MAX_PX) {
        setBoardPx(Math.floor(window.innerWidth));
        return;
      }
      // The board draws its coordinate labels in a gutter OUTSIDE boardWidth, so
      // the element it renders is wider than the number we hand it. Sizing the
      // board to the full container therefore overflowed by the gutter (~16px at
      // 520) and slid under the move list on the right.
      //
      // Ask the board for its real gutters rather than copying its internal math
      // — the helper exists precisely because hardcoded copies broke last time
      // the gutter changed. Only the labelled sides (bottom + left) reserve
      // space, so just the horizontal ones matter here.
      const probe = Math.round(w);
      const g = gutterFor(probe);
      setBoardPx(Math.max(200, Math.min(BOARD_MAX_PX, probe - g.left - g.right)));
    });
    ro.observe(el);
    // On mobile the wrap hugs the board, so it won't resize by itself when the
    // screen gets wider (rotating a tablet) — follow the window directly too.
    const onWin = () => { if (window.innerWidth <= MOBILE_MAX_PX) setBoardPx(Math.floor(window.innerWidth)); };
    window.addEventListener('resize', onWin);
    window.addEventListener('orientationchange', onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
      window.removeEventListener('orientationchange', onWin);
    };
  }, []);

  // Local clock ticker for smoothness between server updates.
  // A color's clock only ticks AFTER that color has made its first move (matches
  // the server). White has moved once total moves ≥ 1; Black once total moves ≥ 2.
  useEffect(() => {
    if (phase !== 'active' || !room?.firstMoveMade) return;
    const id = setInterval(() => {
      setClocks((prev) => {
        const turn = gameRef.current.turn() === 'w' ? 'white' : 'black';
        const movesPlayed = moves.length; // authoritative count (gameRef loses history on FEN rebuild)
        const hasMoved = turn === 'white' ? movesPlayed >= 1 : movesPlayed >= 2;
        if (!hasMoved || prev[turn] == null) return prev;
        return { ...prev, [turn]: Math.max(0, prev[turn] - 1) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, room?.firstMoveMade, fen, moves.length]);

  const applyRoom = useCallback((r) => {
    setRoom(r);
    if (r.startFen) startFenRef.current = r.startFen;
    if (r.fen) {
      gameRef.current = new Chess(r.fen);
      setFen(r.fen);
    }
    // Server's move list is the source of truth (covers join/reconnect/rematch).
    if (Array.isArray(r.moves)) {
      setMoves(r.moves);
      // Derive the last-move highlight by replaying from the start position.
      if (r.moves.length === 0) {
        setLastMove(null);
      } else {
        try {
          const c = new Chess(r.startFen || startFenRef.current);
          let last = null;
          for (const san of r.moves) last = c.move(san);
          if (last) setLastMove({ from: last.from, to: last.to });
        } catch (_) { /* keep current highlight */ }
      }
    }
    if (r.clocks) setClocks(r.clocks);
    if (r.status === 'waiting') setPhase('waiting');
    else if (r.status === 'active') setPhase('active');
    else if (r.status === 'aborted') setPhase('aborted');
    else if (r.status === 'finished') setPhase('finished');
  }, []);

  useEffect(() => {
    // Wait for auth to resolve before connecting — otherwise a logged-in user who
    // reloads would join with a GUEST identity (user not loaded yet) and the
    // server can't match the rejoin → "Room is full".
    if (authLoading) return;

    const s = io(`${SOCKET_URL}/friendgame`, {
      transports: SOCKET_TRANSPORTS,
      forceNew: true,            // dedicated connection — don't queue behind the app's main socket
      reconnectionAttempts: IS_PROD ? Infinity : 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: IS_PROD ? 30000 : 8000,
    });
    socketRef.current = s;

    s.on('connect_error', (err) => {
      console.warn('[FriendGame] connect_error:', err?.message || err);
      setConnectError(true);
    });
    s.on('connect', () => {
      setConnectError(false);
      const ident = {
        userId: me.userId, displayName: me.displayName, username: me.username,
        profilePhotoUrl: me.profilePhotoUrl, activeAvatar: me.activeAvatar,
      };
      // First connect as a creator → create the room exactly once.
      if (isCreator && !createdRef.current) {
        s.emit('create_room', {
          variant: createIntent.variant,
          timeControl: createIntent.timeControl,
          chatEnabled: createIntent.chatEnabled,
          voiceEnabled: !!createIntent.voiceEnabled && !!user && user.role !== 'guest',
          isRated: createIntent.isRated,
          ...ident,
        });
      } else {
        // Joiner, OR a reconnect after we already have a code → (re)join by code.
        // Server treats a same-user/same-socket join as an idempotent re-seat.
        const code = roomCodeRef.current || roomCode;
        if (code) s.emit('join_room', { roomCode: code, ...ident });
      }
    });

    s.on('room_created', (r) => {
      createdRef.current = true;       // never create again on reconnect
      roomCodeRef.current = r.code;    // reconnects re-join by this code
      setMyColor(r.you);
      setRoomCode(r.code);
      // Reflect the code in the URL without a reload, so the page is shareable.
      window.history.replaceState(null, '', `/friend/${r.code}`);
      applyRoom(r);
    });
    s.on('room_joined', (r) => {
      if (r.code) roomCodeRef.current = r.code;
      setMyColor(r.you);
      applyRoom(r);
    });
    s.on('room_ready', (r) => { applyRoom(r); });

    s.on('opponent_move', ({ move, from, to, fen: newFen }) => {
      try { gameRef.current = new Chess(newFen); } catch (_) {}
      setFen(newFen);
      if (from && to) setLastMove({ from, to });   // highlight opponent's move
      if (move) setMoves((prev) => [...prev, move]); // SAN from server

      // Fire a queued premove now that it's our turn (Lichess-style).
      const pending = chessboardPremoveRef.current;
      if (pending) {
        chessboardPremoveRef.current = null;
        // Defer so gameRef/fen state settles before validating the premove.
        setTimeout(() => { applyAndSendRef.current?.(pending.from, pending.to, pending.promotion); }, 0);
      }
    });

    s.on('clock_update', ({ clocks: c }) => setClocks(c));

    s.on('game_over', (r) => {
      applyRoom(r);
      resetPostGame();
      setPhase('finished');
      setResult({ text: r.result, winnerColor: r.winnerColor, winnerName: r.winnerName, ratingChanges: r.ratingChanges || null });
    });

    s.on('game_aborted', (r) => { applyRoom(r); resetPostGame(); setPhase('aborted'); });
    s.on('opponentDisconnected', () => setOpponentLeft(true));
    s.on('opponentReconnected', () => setOpponentLeft(false));
    s.on('draw_offered', () => setDrawOffered(true));
    s.on('rematch_offered', () => setRematchState(st => (st === 'sent' ? st : 'offered')));
    s.on('opponent_left_room', () => setFriendLeftRoom(true));
    s.on('friendChatMessage', () => { if (!chatOpenRef.current) setChatUnread(n => n + 1); });
    s.on('rematch_start', (r) => {
      resetPostGame(); setFriendLeftRoom(false);
      setResult(null); setDrawOffered(false); setOpponentLeft(false);
      // colors were swapped server-side; pick mine from the players list
      const mine = r.players.find(p => p.userId === me.userId);
      if (mine) setMyColor(mine.color);
      applyRoom(r);
    });

    s.on('join_error', ({ message }) => {
      setPhase('error');
      setResult({ text: message });
    });

    return () => { s.disconnect(); };
    // Connect once auth is ready; create-vs-join is decided from the initial
    // props/state. createdRef guards against duplicate room creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Determine my color from the room if not set by room_created/joined.
  useEffect(() => {
    if (myColor || !room) return;
    const mine = room.players?.find(p => p.userId === me.userId);
    if (mine) setMyColor(mine.color);
  }, [room, myColor, me.userId]);

  const isMyTurn = phase === 'active' && myColor &&
    (gameRef.current.turn() === 'w' ? 'white' : 'black') === myColor;

  // Attempt a move locally + send to server. Returns true if applied/sent.
  // Used by both drag-drop and premove firing. Does NOT check whose turn it is —
  // callers gate that (handleDrop checks isMyTurn; premove fires only after the
  // opponent moves, making it our turn).
  const applyAndSend = useCallback((from, to, promo) => {
    const piece = gameRef.current.get(from);
    let promotion;
    if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = promo || 'q';

    const test = new Chess(gameRef.current.fen());
    const moved = test.move({ from, to, promotion });
    if (!moved) {
      // Chess960 castling attempt (king onto own rook).
      if (room?.variant === 'chess960' && piece && piece.type === 'k') {
        const target = gameRef.current.get(to);
        if (target && target.type === 'r' && target.color === piece.color) {
          const isKingside = to.charCodeAt(0) > from.charCodeAt(0);
          socketRef.current.emit('make_move', {
            roomCode, move: { castle: isKingside ? 'k' : 'q', from, rookFrom: to },
          });
          setMoves((prev) => [...prev, isKingside ? 'O-O' : 'O-O-O']);
          setLastMove({ from, to });
          return true;
        }
      }
      return false;
    }

    // Optimistically apply, then send.
    gameRef.current = test;
    setFen(test.fen());
    setMoves((prev) => [...prev, moved.san]);
    setLastMove({ from, to });
    socketRef.current.emit('make_move', { roomCode, move: { from, to, promotion } });
    return true;
  }, [roomCode, room?.variant]);

  const handleDrop = useCallback((from, to, promo) => {
    if (!isMyTurn) return false;
    return applyAndSend(from, to, promo);
  }, [isMyTurn, applyAndSend]);

  // Keep a stable ref so the once-registered socket handler fires the latest premove.
  const applyAndSendRef = useRef(applyAndSend);
  useEffect(() => { applyAndSendRef.current = applyAndSend; }, [applyAndSend]);

  const opponent = room?.players?.find(p => p.userId !== me.userId);
  const myPlayer = room?.players?.find(p => p.userId === me.userId);
  const orientation = myColor || 'white';
  const topPlayer = opponent;   // shown above board
  const bottomPlayer = myPlayer;
  const topColor = myColor === 'white' ? 'black' : 'white';
  const bottomColor = myColor || 'white';

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };

  // Invite friend by display name
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null); // { ok, text }

  const sendGameInvite = async () => {
    const name = inviteDisplayName.trim();
    if (!name) return;
    setInviteSending(true);
    setInviteMsg(null);
    try {
      const res = await api.post('/api/game-invites', {
        displayName: name,
        roomCode,
        timeControlLabel: room?.timeControlLabel || '',
        variant: room?.variant || 'standard',
      });
      setInviteMsg({ ok: true, text: `Invite sent to ${res.data.inviteeName}!` });
      setInviteDisplayName('');
    } catch (err) {
      setInviteMsg({ ok: false, text: err?.response?.data?.message || 'Failed to send invite' });
    } finally {
      setInviteSending(false);
    }
  };

  // ── Move-list navigation ───────────────────────────────────────────────────
  const isLive = viewPly === null || viewPly >= moves.length;
  const gameOver = phase === 'finished' || phase === 'aborted';
  // Game position at viewPly (or live), before any post-game exploration.
  const gameFen = (() => {
    if (isLive) return fen;
    try {
      const c = new Chess(startFenRef.current);
      for (let i = 0; i < viewPly; i++) c.move(moves[i]);
      return c.fen();
    } catch (_) { return fen; }
  })();
  const displayFen = explore ? explore.fen : gameFen;
  const gotoPly = (ply) => {
    setExplore(null);
    const clamped = Math.max(0, Math.min(ply, moves.length));
    setViewPly(clamped >= moves.length ? null : clamped);
  };
  const navFirst = () => { setExplore(null); setViewPly(moves.length === 0 ? null : 0); };
  const navPrev = () => gotoPly((viewPly === null ? moves.length : viewPly) - (explore ? 0 : 1));
  const navNext = () => gotoPly((viewPly === null ? moves.length : viewPly) + 1);
  const navLast = () => { setExplore(null); setViewPly(null); };

  // Post-game: try your own moves from any position (local, never sent).
  const handleExploreDrop = (from, to, promo) => {
    let mv;
    const c = new Chess(displayFen);
    try { mv = c.move({ from, to, promotion: promo || 'q' }); } catch { return false; }
    if (!mv) return false;
    setExplore(e => ({ fen: c.fen(), sans: [...(e?.sans || []), mv.san], lastMove: { from, to } }));
    return true;
  };

  const { squareEvals, onSelectionChange } = useSquareEvals(displayFen, gameOver && squaresOn);

  // Engine features share one Stockfish worker, so only one runs at a time.
  const toggleEngine = () => { setEngineOn(v => !v); setSquaresOn(false); };
  const toggleSquares = () => { setSquaresOn(v => !v); setEngineOn(false); };

  const runAnalysis = async () => {
    if (!moves.length) return;
    const run = ++analysisRunRef.current;
    setEngineOn(false); setSquaresOn(false); setPopupHidden(true);
    setAnalysis({ status: 'running', done: 0, total: moves.length });
    try {
      const { analysis: rows } = await analyzeGame(moves, {
        depth: 12,
        startFen: startFenRef.current,
        isCancelled: () => run !== analysisRunRef.current,
        onProgress: (done, total) => {
          if (run === analysisRunRef.current) setAnalysis(a => ({ ...a, done, total }));
        },
      });
      if (run !== analysisRunRef.current) return;
      const marks = {};
      rows.forEach(r => { if (r.classification) marks[r.ply] = r.classification; });
      setAnalysis({ status: 'done', marks });
    } catch {
      if (run === analysisRunRef.current) setAnalysis({ status: 'error' });
    }
  };

  // Per-colour counts. Ply 1 is White's first move.
  const markCounts = (() => {
    const c = { white: {}, black: {} };
    Object.entries(analysis.marks || {}).forEach(([ply, cls]) => {
      const side = Number(ply) % 2 === 1 ? 'white' : 'black';
      c[side][cls] = (c[side][cls] || 0) + 1;
    });
    return c;
  })();

  const playAgain = () => {
    setPopupHidden(true);
    setRematchState('sent');
    socketRef.current?.emit('rematch', { roomCode });
  };
  const leaveRoom = () => {
    socketRef.current?.emit('leave_room', { roomCode });
    navigate('/games');
  };

  // ←/→ step through the game after it ends.
  useEffect(() => {
    if (!gameOver) return undefined;
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // Any new move snaps the view back to live.
  useEffect(() => { setViewPly(null); }, [moves.length]);

  const pbar = (player, color, isYou) => (
    <div className={`fg-pbar ${isYou ? 'fg-pbar-me' : 'fg-pbar-opp'} ${gameRef.current.turn() === (color === 'white' ? 'w' : 'b') && phase === 'active' ? 'on-move' : ''}`}>
      <div className="fg-player-id">
        <PlayerAvatar
          name={player?.displayName || (isYou ? me.displayName : undefined)}
          user={isYou ? {
            profilePhotoUrl: player?.profilePhotoUrl || me.profilePhotoUrl,
            active3dModel: player?.active3dModel || me.active3dModel,
          } : player}
          imageUrl={avatarUrlFor(isYou ? {
            profilePhotoUrl: player?.profilePhotoUrl || me.profilePhotoUrl,
            activeAvatar: player?.activeAvatar || me.activeAvatar,
          } : player)}
        />
        <span className="fg-pname">
          {(player?.displayName || (isYou ? me.displayName : 'Waiting…'))}{isYou ? ' (you)' : ''}
        </span>
      </div>
      <span className="fg-clock">{fmtClock(clocks[color])}</span>
    </div>
  );

  return (
    <div className="fg-room">
      <div className={`fg-room-inner ${phase === 'waiting' || phase === 'connecting' ? 'is-waiting' : ''}`}>

        {/* LEFT CARD: controls + chat */}
        <div className="fg-card fg-left">
          <div className="fg-room-header">
            <span className="fg-room-meta">
              {room?.timeControlLabel || ''} {room?.variant === 'chess960' ? '• Chess960' : ''}
              {' • '}
              <span style={{
                fontWeight: 700,
                color: room?.isRated ? 'var(--color-success)' : 'var(--color-text-muted)',
              }}>
                {room?.isRated ? 'Rated' : 'Casual'}
              </span>
            </span>
          </div>

          {/* Icon action bar: Back · Resign · Offer draw — one row, no labels */}
          <div className="fg-icon-actions">
            <button
              className="fg-icon-btn"
              onClick={() => (gameOver ? leaveRoom() : navigate('/games'))}
              title="Back to Games"
              aria-label="Back to Games"
            >🏠</button>
            <button
              className="fg-icon-btn"
              onClick={() => socketRef.current.emit('resign', { roomCode })}
              title="Resign"
              aria-label="Resign"
              disabled={phase !== 'active'}
            >🏳️</button>
            <button
              className="fg-icon-btn"
              onClick={() => socketRef.current.emit('offer_draw', { roomCode })}
              title="Offer draw"
              aria-label="Offer draw"
              disabled={phase !== 'active'}
            >🤝</button>
          </div>

          {isCreator && !roomCode && (phase === 'connecting' || phase === 'waiting') && (
            <div className="fg-invite">
              <div className="fg-code-generating">
                {connectError ? (
                  <>
                    <p className="fg-invite-label" style={{ color: 'var(--color-danger)' }}>
                      Connection failed — retrying…
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      The server may be starting up. Please wait a moment.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="fg-spinner" />
                    <p className="fg-invite-label">Creating room…</p>
                  </>
                )}
              </div>
            </div>
          )}

          {phase === 'waiting' && roomCode && (
            <div className="fg-invite">
              <p className="fg-invite-label">Share this code with your friend</p>
              <div className="fg-code-box" onClick={copyCode}>
                <span className="fg-code-text">{roomCode}</span>
                <button className="fg-copy-btn">{copied ? '✓ Copied' : 'Copy code'}</button>
              </div>
              <p className="fg-waiting">Waiting for opponent to join…</p>

              {isCreator && user && (
                <div className="fg-invite-friend">
                  <p className="fg-invite-friend-label">Invite friend</p>
                  <div className="fg-invite-friend-row">
                    <input
                      className="fg-invite-friend-input"
                      type="text"
                      placeholder="Enter display name"
                      value={inviteDisplayName}
                      onChange={(e) => { setInviteDisplayName(e.target.value); setInviteMsg(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && !inviteSending && sendGameInvite()}
                      disabled={inviteSending}
                    />
                    <button
                      className="fg-invite-friend-btn"
                      onClick={sendGameInvite}
                      disabled={inviteSending || !inviteDisplayName.trim()}
                    >
                      {inviteSending ? '…' : 'Invite'}
                    </button>
                  </div>
                  {inviteMsg && (
                    <p className={`fg-invite-friend-msg ${inviteMsg.ok ? 'ok' : 'err'}`}>
                      {inviteMsg.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {drawOffered && phase === 'active' && (
            <div className="fg-banner">
              Opponent offers a draw.
              <button className="fg-link" onClick={() => socketRef.current.emit('accept_draw', { roomCode })}>Accept</button>
            </div>
          )}

          {opponentLeft && phase !== 'finished' && (
            <div className="fg-banner fg-warn">Opponent disconnected.</div>
          )}

          {gameOver && (
            <div className="fg-post">
              <div className="fg-post-title">
                {phase === 'aborted' ? 'Game ended — opponent left' : (result?.text || 'Game over')}
                {phase === 'finished' && result && (
                  <span className="fg-post-sub">{result.winnerName ? `${result.winnerName} wins` : 'Draw'}</span>
                )}
              </div>

              <button className="fg-primary fg-post-btn" onClick={playAgain}
                disabled={friendLeftRoom || rematchState === 'sent'}>
                {rematchState === 'sent' ? '⏳ Waiting for your friend…'
                  : rematchState === 'offered' ? '✓ Accept rematch' : '↻ Play again'}
              </button>
              {rematchState === 'offered' && <p className="fg-post-note ok">Your friend wants a rematch!</p>}
              {friendLeftRoom && <p className="fg-post-note">Your friend left the room.</p>}

              <button className="fg-secondary fg-post-btn" onClick={runAnalysis}
                disabled={!moves.length || analysis.status === 'running'}>
                {analysis.status === 'running' ? `Analyzing… ${analysis.done || 0}/${analysis.total || moves.length}`
                  : analysis.status === 'done' ? '🔍 Analyze again' : '🔍 Analyze game'}
              </button>
              {analysis.status === 'running' && (
                <div className="fg-post-progress">
                  <div style={{ width: `${Math.round(100 * (analysis.done || 0) / Math.max(1, analysis.total || 1))}%` }} />
                </div>
              )}
              {analysis.status === 'error' && <p className="fg-post-note">Analysis failed — try again.</p>}
              {analysis.status === 'done' && (
                <div className="fg-post-summary">
                  {['white', 'black'].map(side => {
                    const pl = room?.players?.find(p => p.color === side);
                    return (
                      <div key={side} className="fg-post-side">
                        <div className="fg-post-side-name">{side === 'white' ? '♔' : '♚'} {pl?.displayName || side}</div>
                        {Object.entries(MOVE_MARKS).map(([cls, m]) => (
                          <div key={cls} className="fg-post-count" style={{ color: m.color }}>
                            <span>{m.label}</span><b>{markCounts[side][cls] || 0}</b>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <p className="fg-post-hint">Coloured moves in the move list are clickable.</p>
                </div>
              )}

              <div className="fg-post-tools">
                <button className={`fg-secondary fg-post-btn ${engineOn ? 'on' : ''}`} onClick={toggleEngine}
                  aria-pressed={engineOn}
                  disabled={analysis.status === 'running'}>⚙️ Stockfish</button>
                <button className={`fg-secondary fg-post-btn ${squaresOn ? 'on' : ''}`} onClick={toggleSquares}
                  aria-pressed={squaresOn}
                  disabled={analysis.status === 'running'}>🎯 Square evals</button>
              </div>
              {squaresOn && <p className="fg-post-hint">Click a piece — every square it can reach gets a score.</p>}
              {engineOn && analysis.status !== 'running' && (
                <EnginePanel fen={displayFen} numLines={3} enabled onToggle={toggleEngine} />
              )}
              {explore && (
                <p className="fg-post-hint">
                  Exploring: {explore.sans.join(' ')}{' '}
                  <button className="fg-link" onClick={() => setExplore(null)}>back to game</button>
                </p>
              )}

              <button className="fg-secondary fg-post-btn" onClick={leaveRoom}>🚪 Leave room</button>
            </div>
          )}

          {(room?.voiceEnabled || voiceGuest) && ['waiting', 'active', 'finished'].includes(phase) && (
            <FriendVoiceBar
              socket={socketRef.current}
              roomCode={roomCode}
              isGuest={voiceGuest}
              friendName={room?.players?.find(p => p.userId !== me.userId)?.displayName}
            />
          )}

        </div>

        {/* Floating chat: kept mounted (so history survives) and shown on demand. */}
        {room?.chatEnabled && ['active', 'finished', 'aborted'].includes(phase) && (
          <>
            <div className="fg-chat-float" style={{ display: chatOpen ? 'block' : 'none' }}>
              <button className="fg-chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">✕</button>
              <FriendGameChat socket={socketRef.current} roomCode={roomCode} myName={me.displayName} />
            </div>
            {!chatOpen && (
              <button className="fg-chat-fab" onClick={() => { setChatOpen(true); setChatUnread(0); }} aria-label="Open chat">
                💬 Chat
                {chatUnread > 0 && <span className="fg-chat-badge">{chatUnread}</span>}
              </button>
            )}
          </>
        )}

        {/* MIDDLE CARD: board (biggest) + move navigation */}
        <div className="fg-card fg-center">
          <div className="fg-board-wrap" ref={boardWrapRef}>
            <Chessboard
              allowAutoQueen
              position={displayFen}
              orientation={orientation}
              onDrop={gameOver ? handleExploreDrop : (isLive ? handleDrop : () => false)}
              boardWidth={boardPx}
              lastMove={explore ? explore.lastMove : (isLive ? lastMove : null)}
              draggable={true}
              playerColor={myColor || 'white'}
              allowPremove={isLive && phase === 'active'}
              onPremoveChange={(p) => { chessboardPremoveRef.current = p; }}
              squareEvals={squareEvals}
              onSelectionChange={onSelectionChange}
            />

            {phase === 'finished' && result && !popupHidden && (
              <div className="fg-result-overlay">
                <h3>{result.text}</h3>
                <p>{result.winnerName ? `${result.winnerName} wins` : 'Draw'}</p>
                {result.ratingChanges && (() => {
                  const mine = myColor === 'black' ? result.ratingChanges.black : result.ratingChanges.white;
                  if (!mine) return null;
                  const up = mine.change >= 0;
                  return (
                    <p style={{ margin: '2px 0 8px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Your {result.ratingChanges.category} rating: </span>
                      <strong style={{ color: 'var(--color-text)' }}>{mine.new} </strong>
                      <strong style={{ color: up ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        ({up ? '+' : ''}{mine.change})
                      </strong>
                    </p>
                  );
                })()}
                <div className="fg-result-actions">
                  <button className="fg-primary" onClick={playAgain} disabled={friendLeftRoom}>
                    {rematchState === 'offered' ? '✓ Accept rematch' : '↻ Play again'}
                  </button>
                  <button className="fg-secondary" onClick={runAnalysis} disabled={!moves.length}>🔍 Analyze</button>
                </div>
                <button className="fg-link" style={{ marginTop: 8 }} onClick={() => setPopupHidden(true)}>Close</button>
              </div>
            )}

            {phase === 'aborted' && !popupHidden && (
              <div className="fg-result-overlay">
                <h3>Game ended</h3>
                <p>Your opponent left the game.</p>
                <div className="fg-result-actions">
                  {moves.length > 0 && <button className="fg-secondary" onClick={runAnalysis}>🔍 Analyze</button>}
                  <button className="fg-secondary" onClick={() => setPopupHidden(true)}>Close</button>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="fg-result-overlay">
                <h3>Can't join</h3>
                <p>{result?.text}</p>
                <button className="fg-secondary" onClick={() => navigate('/games')}>Back to Games</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CARD: player strips (opponent top, you bottom) + clickable moves */}
        <div className="fg-card fg-right">
          {pbar(topPlayer, topColor, false)}
          <MoveList moves={moves} current={explore ? -1 : (viewPly ?? moves.length)} onSelect={gotoPly}
            marks={gameOver && analysis.status === 'done' ? analysis.marks : undefined} />
          {/* Move navigation — attached below the moves list */}
          <div className="fg-nav">
            <button className="fg-nav-btn" onClick={navFirst} disabled={moves.length === 0} title="First">⏮</button>
            <button className="fg-nav-btn" onClick={navPrev} disabled={(viewPly ?? moves.length) <= 0} title="Previous">◀</button>
            <button className="fg-nav-btn" onClick={navNext} disabled={isLive && !explore} title="Next">▶</button>
            <button className="fg-nav-btn" onClick={navLast} disabled={isLive && !explore} title="Latest">⏭</button>
          </div>
          {pbar(bottomPlayer, bottomColor, true)}
        </div>

      </div>
    </div>
  );
}
