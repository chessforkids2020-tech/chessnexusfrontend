import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import Chessboard from '../../components/Chessboard';
import api, { resolveApiAssetUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { getFriendIdentity } from './friendIdentity';
import FriendGameChat from '../../components/FriendGameChat';
import UserAvatar from '../../components/UserAvatar';
import './FriendGame.css';

const SOCKET_URL = import.meta?.env?.VITE_API_URL ||
  window.location.origin.replace('5173', '5000');

// In production the Render proxy supports WebSocket natively; prefer it so we
// don't stall on HTTP long-polling (which Render's infrastructure can buffer for
// minutes). Locally, fall back to polling first so it still works without WSS.
const IS_PROD = import.meta?.env?.PROD;
const SOCKET_TRANSPORTS = IS_PROD ? ['websocket'] : ['polling', 'websocket'];

function fmtClock(secs) {
  if (secs == null) return '--:--';
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// Clickable move list (Lichess-style): White/Black columns. `current` is the ply
// being viewed (moves.length = live). onSelect(plyAfterThisMove) jumps the board.
function MoveList({ moves, current, onSelect }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ no: i / 2 + 1, w: moves[i], wPly: i + 1, b: moves[i + 1], bPly: i + 2 });
  }
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [current, moves.length]);
  const cell = (san, ply) =>
    san ? (
      <button
        className={`fg-move-san ${current === ply ? 'active' : ''}`}
        onClick={() => onSelect(ply)}
      >
        {san}
      </button>
    ) : <span className="fg-move-san" />;
  return (
    <div className="fg-moves-list">
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
      if (w) setBoardPx(Math.min(520, Math.round(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
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
        setTimeout(() => { applyAndSendRef.current?.(pending.from, pending.to); }, 0);
      }
    });

    s.on('clock_update', ({ clocks: c }) => setClocks(c));

    s.on('game_over', (r) => {
      applyRoom(r);
      setPhase('finished');
      setResult({ text: r.result, winnerColor: r.winnerColor, winnerName: r.winnerName, ratingChanges: r.ratingChanges || null });
    });

    s.on('game_aborted', (r) => { applyRoom(r); setPhase('aborted'); });
    s.on('opponentDisconnected', () => setOpponentLeft(true));
    s.on('opponentReconnected', () => setOpponentLeft(false));
    s.on('draw_offered', () => setDrawOffered(true));
    s.on('rematch_start', (r) => {
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
  const applyAndSend = useCallback((from, to) => {
    const piece = gameRef.current.get(from);
    let promotion;
    if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = 'q';

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

  const handleDrop = useCallback((from, to) => {
    if (!isMyTurn) return false;
    return applyAndSend(from, to);
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
  // FEN to display: live position, or the replayed position at viewPly.
  const displayFen = (() => {
    if (isLive) return fen;
    try {
      const c = new Chess(startFenRef.current);
      for (let i = 0; i < viewPly; i++) c.move(moves[i]);
      return c.fen();
    } catch (_) { return fen; }
  })();
  const gotoPly = (ply) => {
    const clamped = Math.max(0, Math.min(ply, moves.length));
    setViewPly(clamped >= moves.length ? null : clamped);
  };
  const navFirst = () => setViewPly(moves.length === 0 ? null : 0);
  const navPrev = () => gotoPly((viewPly === null ? moves.length : viewPly) - 1);
  const navNext = () => gotoPly((viewPly === null ? moves.length : viewPly) + 1);
  const navLast = () => setViewPly(null);
  // Any new move snaps the view back to live.
  useEffect(() => { setViewPly(null); }, [moves.length]);

  const pbar = (player, color, isYou) => (
    <div className={`fg-pbar ${gameRef.current.turn() === (color === 'white' ? 'w' : 'b') && phase === 'active' ? 'on-move' : ''}`}>
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
      <div className="fg-room-inner">

        {/* LEFT CARD: controls + chat */}
        <div className="fg-card fg-left">
          <div className="fg-room-header">
            <span className="fg-room-meta">
              {room?.timeControlLabel || ''} {room?.variant === 'chess960' ? '• Chess960' : ''}
              {' • '}
              <span style={{
                fontWeight: 700,
                color: room?.isRated ? '#6ee7b7' : '#94a3b8',
              }}>
                {room?.isRated ? 'Rated' : 'Casual'}
              </span>
            </span>
          </div>

          {/* Icon action bar: Back · Resign · Offer draw — one row, no labels */}
          <div className="fg-icon-actions">
            <button
              className="fg-icon-btn"
              onClick={() => navigate('/games')}
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
                    <p className="fg-invite-label" style={{ color: '#f87171' }}>
                      Connection failed — retrying…
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
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

          {room?.chatEnabled && (phase === 'active' || phase === 'finished') && (
            <FriendGameChat socket={socketRef.current} roomCode={roomCode} myName={me.displayName} />
          )}
        </div>

        {/* MIDDLE CARD: board (biggest) + move navigation */}
        <div className="fg-card fg-center">
          <div className="fg-board-wrap" ref={boardWrapRef}>
            <Chessboard
              position={displayFen}
              orientation={orientation}
              onDrop={isLive ? handleDrop : () => false}
              boardWidth={boardPx}
              lastMove={isLive ? lastMove : null}
              draggable={true}
              playerColor={myColor || 'white'}
              allowPremove={isLive && phase === 'active'}
              onPremoveChange={(p) => { chessboardPremoveRef.current = p; }}
            />

            {phase === 'finished' && result && (
              <div className="fg-result-overlay">
                <h3>{result.text}</h3>
                <p>{result.winnerName ? `${result.winnerName} wins` : 'Draw'}</p>
                {result.ratingChanges && (() => {
                  const mine = myColor === 'black' ? result.ratingChanges.black : result.ratingChanges.white;
                  if (!mine) return null;
                  const up = mine.change >= 0;
                  return (
                    <p style={{ margin: '2px 0 8px', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Your {result.ratingChanges.category} rating: </span>
                      <strong style={{ color: '#e2e8f0' }}>{mine.new} </strong>
                      <strong style={{ color: up ? '#6ee7b7' : '#fca5a5' }}>
                        ({up ? '+' : ''}{mine.change})
                      </strong>
                    </p>
                  );
                })()}
                <div className="fg-result-actions">
                  <button className="fg-primary" onClick={() => socketRef.current.emit('rematch', { roomCode })}>Rematch</button>
                  <button className="fg-secondary" onClick={() => navigate('/games')}>Leave</button>
                </div>
              </div>
            )}

            {phase === 'aborted' && (
              <div className="fg-result-overlay">
                <h3>Game ended</h3>
                <p>Your opponent left the game.</p>
                <button className="fg-secondary" onClick={() => navigate('/games')}>Back to Games</button>
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
          <MoveList moves={moves} current={viewPly ?? moves.length} onSelect={gotoPly} />
          {/* Move navigation — attached below the moves list */}
          <div className="fg-nav">
            <button className="fg-nav-btn" onClick={navFirst} disabled={moves.length === 0} title="First">⏮</button>
            <button className="fg-nav-btn" onClick={navPrev} disabled={(viewPly ?? moves.length) <= 0} title="Previous">◀</button>
            <button className="fg-nav-btn" onClick={navNext} disabled={isLive} title="Next">▶</button>
            <button className="fg-nav-btn" onClick={navLast} disabled={isLive} title="Latest">⏭</button>
          </div>
          {pbar(bottomPlayer, bottomColor, true)}
        </div>

      </div>
    </div>
  );
}
