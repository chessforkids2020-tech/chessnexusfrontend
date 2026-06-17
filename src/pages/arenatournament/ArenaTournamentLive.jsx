import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import PlayerName from '../../components/PlayerName';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import socket from '../../socket-jwt';
import api from '../../api';
import TournamentChat from '../../components/TournamentChat';
import { AuthContext } from '../../contexts/AuthContext';
import { playArenaSound } from '../../utils/arenaSound';
import './ArenaTournamentLive.css';

// ── Chess960 castling helpers ─────────────────────────────────────────────────
function parseFenBoard960(fen) {
  const board = {};
  const rows = fen.split(' ')[0].split('/');
  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const ch of rows[rank]) {
      if (isNaN(parseInt(ch))) {
        board[String.fromCharCode(97 + file) + (8 - rank)] = ch;
        file++;
      } else {
        file += parseInt(ch);
      }
    }
  }
  return board;
}

function applyCastle960(fen, kingFrom, rookFrom, isKingside) {
  const parts = fen.split(' ');
  const board = parseFenBoard960(fen);
  const rank = kingFrom[1];
  const kingPiece = rank === '1' ? 'K' : 'k';
  const rookPiece = rank === '1' ? 'R' : 'r';
  if (board[kingFrom] !== kingPiece || board[rookFrom] !== rookPiece) return null;
  const kingDest = (isKingside ? 'g' : 'c') + rank;
  const rookDest = (isKingside ? 'f' : 'd') + rank;
  delete board[kingFrom];
  delete board[rookFrom];
  board[kingDest] = kingPiece;
  board[rookDest] = rookPiece;
  // Reconstruct FEN piece-placement string
  let piecePart = '';
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = board[String.fromCharCode(97 + f) + (r + 1)];
      if (p) { if (empty) { piecePart += empty; empty = 0; } piecePart += p; }
      else empty++;
    }
    if (empty) piecePart += empty;
    if (r > 0) piecePart += '/';
  }
  const turn = parts[1] === 'w' ? 'b' : 'w';
  const half = parseInt(parts[4] || '0') + 1;
  const full = parseInt(parts[5] || '1') + (turn === 'w' ? 1 : 0);
  return `${piecePart} ${turn} - - ${half} ${full}`;
}

const CROWN_TIERS = {
  gold:     { emoji: '👑', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', glow: '0 0 8px rgba(245,158,11,0.6)', shadow: '0 0 8px rgba(245,158,11,0.7)', label: 'Gold Crown' },
  platinum: { emoji: '👑', color: '#e2e8f0', bg: 'rgba(226,232,240,0.12)', border: 'rgba(226,232,240,0.45)', glow: '0 0 10px rgba(226,232,240,0.5)', shadow: '0 0 10px rgba(255,255,255,0.9)', label: 'Platinum Crown' },
  gem:      { emoji: '💎', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.5)', glow: '0 0 10px rgba(96,165,250,0.6)', shadow: '0 0 12px rgba(96,165,250,0.8)', label: 'Gem Crown' },
};
const getCrownStyle = (tier) => CROWN_TIERS[tier] || null;

function CrownBadge({ tier }) {
  const c = CROWN_TIERS[tier];
  if (!c) return null;
  return (
    <span
      title={`${c.label} — Opponents earn +4 pts for beating you`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 6px', borderRadius: '999px',
        background: c.bg, border: `1px solid ${c.border}`,
        boxShadow: c.glow, color: c.color,
        fontSize: '11px', fontWeight: '700', lineHeight: 1,
        verticalAlign: 'middle', flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {c.emoji}
    </span>
  );
}

export default function ArenaTournamentLive() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  
  const [tournament, setTournament] = useState(null);
  const [myParticipant, setMyParticipant] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [opponent, setOpponent] = useState('');
  const [loading, setLoading] = useState(true);
  const [waitingForPairing, setWaitingForPairing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedCount, setPausedCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [pairingEnabled, setPairingEnabled] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [showGameEndPopup, setShowGameEndPopup] = useState(false);
  const [gameEndData, setGameEndData] = useState(null);
  const [comebackSurgeToast, setComebackSurgeToast] = useState(null); // null | 'fired' | 'ready'
  const [crownToast, setCrownToast] = useState(null); // null | 'gold' | 'platinum' | 'gem'
  const [carryBonusToast, setCarryBonusToast] = useState(0);
  const [carryExpiredToast, setCarryExpiredToast] = useState(false);
  const [boardWidth, setBoardWidth] = useState(560);
  const [whiteTimeRemaining, setWhiteTimeRemaining] = useState(null);
  const [blackTimeRemaining, setBlackTimeRemaining] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatOpenRef = useRef(false);

  // Bullet Blitz Marathon state
  const [marathonPhase, setMarathonPhase] = useState(0); // 0 = bullet, 1 = blitz
  const [marathonPhasePending, setMarathonPhasePending] = useState(false);
  const [marathonPhaseBanner, setMarathonPhaseBanner] = useState(null); // string message to flash
  
  const chessRef = useRef(new Chess());
  const lastProcessedFenRef = useRef('');
  const currentGameRef = useRef(null);
  const gameStartFenRef = useRef(null); // Chess960 starting FEN for manual castling
  const chessboardPremoveRef = useRef(null); // mirrors Chessboard's queued premove for instant firing
  const userRef = useRef(user);
  const isPausedRef = useRef(false);
  const pairingEnabledRef = useRef(true);
  const myParticipantRef = useRef(null);
  const carryToastShownRef = useRef(false);
  const clockIntervalRef = useRef(null);
  const timeoutRetryRef = useRef(null); // repeatedly notifies server until a flagged game actually ends
  const firstMoveIntervalRef = useRef(null);
  const firstMovePhaseRef = useRef(2); // 0=White not moved, 1=Black not moved, 2=both moved
  const pairingRetryTimerRef = useRef(null);

  // Sync chatOpenRef and clear unread count when chat is opened
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnreadChat(0);
  }, [chatOpen]);

  // Count incoming chat messages while chat panel is closed
  useEffect(() => {
    const handleIncoming = () => {
      if (!chatOpenRef.current) setUnreadChat(v => v + 1);
    };
    socket.on('arenaTournamentChatMessage', handleIncoming);
    return () => socket.off('arenaTournamentChatMessage', handleIncoming);
  }, []);

  const [firstMoveCountdown, setFirstMoveCountdown] = useState(null); // seconds remaining
  const [drawOfferState, setDrawOfferState] = useState(null); // null | 'sent' | 'incoming'
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('arenaSound') !== 'off'; } catch { return true; }
  });

  const soundEnabledRef = useRef(soundEnabled);

  // Keep refs in sync with state
  useEffect(() => {
    currentGameRef.current = currentGame;
  }, [currentGame]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try { localStorage.setItem('arenaSound', soundEnabled ? 'on' : 'off'); } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    pairingEnabledRef.current = pairingEnabled;
  }, [pairingEnabled]);

  useEffect(() => {
    myParticipantRef.current = myParticipant;
  }, [myParticipant]);

  // Fire the timeout to the server and keep retrying until the game actually ends.
  // The server validates timeouts against its own clock (lastMoveAt); small client/server
  // drift can make a single emit get silently rejected, leaving the loss popup stuck.
  // Retrying every second guarantees the flag lands as soon as the server agrees.
  const notifyTimeout = (timedOutColor) => {
    const gameId = currentGameRef.current;
    if (!gameId) return;
    // Emit immediately, then keep retrying.
    socket.emit('arenaTournamentTimeout', { gameId, timedOutColor });
    if (timeoutRetryRef.current) return; // already retrying
    timeoutRetryRef.current = setInterval(() => {
      const gid = currentGameRef.current;
      // Stop once the game is gone (ended/cleared) — the gameEnded handler clears currentGame.
      if (!gid) {
        clearInterval(timeoutRetryRef.current);
        timeoutRetryRef.current = null;
        return;
      }
      socket.emit('arenaTournamentTimeout', { gameId: gid, timedOutColor });
    }, 1000);
  };

  // Stop the timeout retry loop (called when a game ends or is cleared).
  const stopTimeoutRetry = () => {
    if (timeoutRetryRef.current) {
      clearInterval(timeoutRetryRef.current);
      timeoutRetryRef.current = null;
    }
  };

  // Live game clock - ticks every second for the player whose turn it is
  useEffect(() => {
    // Clear any existing interval
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }

    // Only run clock when there's an active game with time values
    if (!currentGame || !gameState || whiteTimeRemaining === null || blackTimeRemaining === null) {
      return;
    }

    // Determine whose turn it is from the chess position
    const turn = chessRef.current.turn(); // 'w' or 'b'

    clockIntervalRef.current = setInterval(() => {
      if (turn === 'w') {
        setWhiteTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            if (prev !== null && prev <= 0 && currentGameRef.current) {
              clearInterval(clockIntervalRef.current);
              clockIntervalRef.current = null;
              notifyTimeout('white');
            }
            return 0;
          }
          return prev - 100;
        });
      } else {
        setBlackTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            if (prev !== null && prev <= 0 && currentGameRef.current) {
              clearInterval(clockIntervalRef.current);
              clockIntervalRef.current = null;
              notifyTimeout('black');
            }
            return 0;
          }
          return prev - 100;
        });
      }
    }, 100);

    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGame, gameState, whiteTimeRemaining === null, blackTimeRemaining === null]);

  // Responsive board size — proportional to viewport for consistency across all screens
  useEffect(() => {
    const updateBoardSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setBoardWidth(Math.min(320, width - 40));
      } else if (width <= 768) {
        setBoardWidth(Math.min(440, width - 60));
      } else if (width <= 1024) {
        setBoardWidth(Math.min(560, Math.floor(width * 0.44)));
      } else {
        setBoardWidth(Math.min(620, Math.floor(width * 0.36)));
      }
    };
    
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  useEffect(() => {
    console.log('⚡ [ArenaTournamentLive] Component mounted, Tournament ID:', tournamentId);
    
    if (!socket.connected) {
      console.log('🔌 [ArenaTournamentLive] Connecting socket...');
      socket.connect();
    } else {
      console.log('✅ [ArenaTournamentLive] Socket already connected');
    }

    loadTournamentData();
    
    console.log('📤 [ArenaTournamentLive] Emitting joinArenaTournamentLobby');
    socket.emit('joinArenaTournamentLobby', { tournamentId });

    // Rejoin tournament lobby on reconnection (socket.on('connect') fires on both initial connect and reconnect in Socket.IO v4)
    const handleReconnect = () => {
      console.log('🔄 [ArenaTournamentLive] Socket reconnected, rejoining tournament lobby');
      socket.emit('joinArenaTournamentLobby', { tournamentId });
    };
    socket.on('connect', handleReconnect);

    socket.on('tournamentLobbyJoined', async (data) => {
      setTournament(data.tournament);
      setMyParticipant(data.myParticipant);
      setPairingEnabled(data.tournament.pairingEnabled);
      setOnlineUserIds(data.onlineUserIds || []);
      setPausedCount(data.pausedCount || 0);
      // Restore marathon phase state on reconnect/rejoin
      if (data.tournament.tournamentType === 'bullet_blitz_marathon') {
        setMarathonPhase(data.tournament.currentPhase || 0);
        setMarathonPhasePending(data.tournament.phaseTransitionPending || false);
      }

      // Show carry bonus toasts once on first join
      if (!carryToastShownRef.current && data.myParticipant) {
        carryToastShownRef.current = true;
        if (data.myParticipant.carryBonusApplied > 0) {
          setCarryBonusToast(data.myParticipant.carryBonusApplied);
          setTimeout(() => setCarryBonusToast(0), 4000);
        }
      }
      
      if (data.myParticipant && data.myParticipant.currentGameId) {
        await loadGameData(data.myParticipant.currentGameId);
      } else if (data.myParticipant && data.tournament.status === 'active' && data.tournament.pairingEnabled && !isPausedRef.current) {
        setTimeout(() => {
          if (!isPausedRef.current && pairingEnabledRef.current) {
            socket.emit('requestArenaTournamentPairing', { tournamentId });
            setWaitingForPairing(true);
          }
        }, 500);
      }
      
      setLoading(false);
    });

    socket.on('arenaTournamentGameStarted', (data) => {
      console.log('♟️ [ArenaTournamentLive] Game started!', data);
      
      // Determine if this game is for this user
      const curUser = userRef.current;
      const userId = curUser?.id || curUser?._id;
      const isWhitePlayer = data.whitePlayerId === userId;
      const isBlackPlayer = data.blackPlayerId === userId;
      
      // Only process if this user is part of the game
      if (!isWhitePlayer && !isBlackPlayer) {
        console.log('🚫 [ArenaTournamentLive] Game not for this user');
        return;
      }
      
      const myColor = isWhitePlayer ? 'white' : 'black';
      const opponentName = isWhitePlayer ? (data.blackPlayerDisplayName || data.blackPlayerUsername) : (data.whitePlayerDisplayName || data.whitePlayerUsername);
      
      console.log('🎨 [ArenaTournamentLive] Playing as:', myColor);
      console.log('🎯 [ArenaTournamentLive] Opponent:', opponentName);
      
      setCurrentGame(data.gameId);
      setMyColor(myColor);
      setOpponent(opponentName);
      setWaitingForPairing(false);
      // Cancel any pending auto-pairing retry since we are now in a game
      if (pairingRetryTimerRef.current) {
        clearTimeout(pairingRetryTimerRef.current);
        pairingRetryTimerRef.current = null;
      }
      setWhiteTimeRemaining(data.whiteTimeRemaining);
      setBlackTimeRemaining(data.blackTimeRemaining);
      
      try {
        chessRef.current = new Chess(data.startFen || undefined);
        console.log('♟️ [ArenaTournamentLive] Chess960 startFen:', data.startFen, '→ loaded FEN:', chessRef.current.fen());
      } catch (e) {
        console.error('⚠️ [ArenaTournamentLive] Failed to load startFen, falling back to standard:', e);
        chessRef.current = new Chess();
      }
      setGameState(chessRef.current.fen());
      setLastMove(null);

      setDrawOfferState(null);
      if (soundEnabledRef.current) playArenaSound('gameStart');

      // Start White's 60s first-move countdown
      firstMovePhaseRef.current = 0;
      clearInterval(firstMoveIntervalRef.current);
      setFirstMoveCountdown(60);
      firstMoveIntervalRef.current = setInterval(() => {
        setFirstMoveCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(firstMoveIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('waitingForOpponent', ({ cooldownMs } = {}) => {
      setWaitingForPairing(true);
      // Auto-retry after cooldown expires (or every 5s while waiting for a free opponent)
      if (pairingRetryTimerRef.current) clearTimeout(pairingRetryTimerRef.current);
      const retryDelay = cooldownMs ? cooldownMs + 500 : 5000;
      pairingRetryTimerRef.current = setTimeout(() => {
        pairingRetryTimerRef.current = null;
        if (!isPausedRef.current && pairingEnabledRef.current && !currentGameRef.current) {
          socket.emit('requestArenaTournamentPairing', { tournamentId });
        }
      }, retryDelay);
    });

    socket.on('arenaTournamentMove', (data) => {
      // Only update if it's a move in the current game and from opponent
      const curGame = currentGameRef.current;
      const curUser = userRef.current;
      console.log('📥 [ArenaTournamentLive] arenaTournamentMove received, gameId:', data.gameId, 'currentGame:', curGame);
      if (data.gameId !== curGame) return;
      
      // Performance: Skip if we already processed this FEN (e.g. from our own optimistic update)
      if (data.fen === lastProcessedFenRef.current) return;
      lastProcessedFenRef.current = data.fen;

      if (data.playerId === (curUser?.id || curUser?._id)) return;
      
      console.log('📥 [ArenaTournamentLive] Applying opponent move, FEN:', data.fen);

      // Advance first-move phase based on opponent's move
      if (firstMovePhaseRef.current === 0) {
        // White (opponent) just made their first move — clear White countdown, start Black's
        firstMovePhaseRef.current = 1;
        clearInterval(firstMoveIntervalRef.current);
        setFirstMoveCountdown(60);
        firstMoveIntervalRef.current = setInterval(() => {
          setFirstMoveCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(firstMoveIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (firstMovePhaseRef.current === 1) {
        // Black (opponent) just made their first move — clear Black countdown
        firstMovePhaseRef.current = 2;
        clearInterval(firstMoveIntervalRef.current);
        setFirstMoveCountdown(null);
      }

      chessRef.current.load(data.fen);

      // ── Instant premove (Lichess-style) ──────────────────────────────────
      // If the player queued a premove while the opponent was thinking,
      // fire it immediately in this same event handler — no React render cycle
      // gap, no extra round-trip before the board updates.
      const pendingPremove = chessboardPremoveRef.current;
      if (pendingPremove) {
        chessboardPremoveRef.current = null; // consume it
        let premoveFired = false;

        // Chess960 castling premove (king → rook notation)
        if (gameStartFenRef.current) {
          const fp = chessRef.current.get(pendingPremove.from);
          const tp = chessRef.current.get(pendingPremove.to);
          if (fp?.type === 'k' && tp?.type === 'r' && fp.color === tp.color) {
            const isKingside = pendingPremove.to.charCodeAt(0) > pendingPremove.from.charCodeAt(0);
            const castleFen = applyCastle960(data.fen, pendingPremove.from, pendingPremove.to, isKingside);
            if (castleFen) {
              chessRef.current.load(castleFen);
              lastProcessedFenRef.current = castleFen;
              setGameState(castleFen);
              if (data.move) setLastMove({ from: data.move.from, to: data.move.to });
              if (soundEnabledRef.current) playArenaSound('move');
              socket.emit('arenaTournamentMove', { gameId: curGame, move: { from: pendingPremove.from, to: pendingPremove.to } });
              setWhiteTimeRemaining(data.whiteTimeRemaining);
              setBlackTimeRemaining(data.blackTimeRemaining);
              premoveFired = true;
            }
          }
        }

        // Standard move premove
        if (!premoveFired) {
          try {
            const moveData = pendingPremove.promotion
              ? { from: pendingPremove.from, to: pendingPremove.to, promotion: pendingPremove.promotion }
              : { from: pendingPremove.from, to: pendingPremove.to };
            const move = chessRef.current.move(moveData);
            if (move) {
              const premoveFen = chessRef.current.fen();
              lastProcessedFenRef.current = premoveFen;
              setGameState(premoveFen);
              if (data.move) setLastMove({ from: data.move.from, to: data.move.to });
              if (soundEnabledRef.current) playArenaSound('move');
              socket.emit('arenaTournamentMove', { gameId: curGame, move: moveData });
              setWhiteTimeRemaining(data.whiteTimeRemaining);
              setBlackTimeRemaining(data.blackTimeRemaining);
              premoveFired = true;
            }
          } catch (e) { /* premove was illegal against new position — fall through */ }
        }

        if (premoveFired) return;

        // Premove turned out to be illegal — restore opponent's position
        chessRef.current.load(data.fen);
      }
      // ─────────────────────────────────────────────────────────────────────

      setGameState(data.fen);
      if (data.move) {
        setLastMove({ from: data.move.from, to: data.move.to });
      }
      setWhiteTimeRemaining(data.whiteTimeRemaining);
      setBlackTimeRemaining(data.blackTimeRemaining);
    });

    socket.on('arenaTournamentMoveSuccess', (data) => {
      // Confirmation of our own move from server
      const curGame = currentGameRef.current;
      console.log('📥 [ArenaTournamentLive] arenaTournamentMoveSuccess received, gameId:', data.gameId, 'currentGame:', curGame);
      if (data.gameId !== curGame) return;
      
      // Performance: Skip if we already processed this FEN (optimistic update)
      if (data.fen === lastProcessedFenRef.current) {
        // Still update times though
        setWhiteTimeRemaining(data.whiteTimeRemaining);
        setBlackTimeRemaining(data.blackTimeRemaining);
        return;
      }
      lastProcessedFenRef.current = data.fen;
      
      console.log('📥 [ArenaTournamentLive] Move confirmed by server, FEN:', data.fen);
      chessRef.current.load(data.fen);
      setGameState(data.fen);
      // lastMove is already set in handleMove for our own moves
      setWhiteTimeRemaining(data.whiteTimeRemaining);
      setBlackTimeRemaining(data.blackTimeRemaining);
    });

    socket.on('arenaTournamentGameEnded', (data) => {
      console.log('🏁 [ArenaTournamentLive] Game ended:', data);
      
      // Check if this game involves the current user
      const curUser = userRef.current;
      const userId = curUser?.id || curUser?._id;
      const isMyGame = data.whitePlayerId === userId || data.blackPlayerId === userId;
      
      // Only process if this is the user's game
      if (!isMyGame) {
        console.log('🚫 [ArenaTournamentLive] Game ended event not for this user');
        return;
      }
      
      // Clear game state immediately
      stopTimeoutRetry();
      setCurrentGame(null);
      setGameState(null);
      setLastMove(null);
      setMyColor(null);
      setOpponent('');
      setWhiteTimeRemaining(null);
      setBlackTimeRemaining(null);
      setWaitingForPairing(false);

      // Clear first-move countdown
      clearInterval(firstMoveIntervalRef.current);
      setFirstMoveCountdown(null);
      firstMovePhaseRef.current = 2;
      
      // Show custom popup instead of alert
      setGameEndData(data);
      setShowGameEndPopup(true);

      // Comeback surge toast
      const surgeUid = curUser?.id || curUser?._id;
      const isWinner = (data.result === 'white_won' && String(data.whitePlayerId) === String(surgeUid)) ||
                       (data.result === 'black_won' && String(data.blackPlayerId) === String(surgeUid));
      if (isWinner) {
        if (data.comebackBonus > 0) {
          setComebackSurgeToast('fired');
          setTimeout(() => setComebackSurgeToast(null), 5000);
        }
        if (data.crownBonus > 0) {
          const loserCrown = data.result === 'white_won' ? data.blackPlayerCrownTier : data.whitePlayerCrownTier;
          setCrownToast(loserCrown || 'gold');
          setTimeout(() => setCrownToast(null), 5000);
        }
      }
      
      // Auto-hide popup after 7 seconds
      setTimeout(() => {
        setShowGameEndPopup(false);
        setGameEndData(null);
      }, 7000);
      
      loadTournamentData();

      // Auto-pair for next game after a short delay unless paused
      setTimeout(() => {
        if (!isPausedRef.current && pairingEnabledRef.current && myParticipantRef.current) {
          socket.emit('requestArenaTournamentPairing', { tournamentId });
          setWaitingForPairing(true);
        }
      }, 2000);

      // Sound
      const uid = userId;
      if (soundEnabledRef.current) {
        if (data.result === 'draw') playArenaSound('draw');
        else if ((data.result === 'white_won' && data.whitePlayerId === uid) ||
                 (data.result === 'black_won' && data.blackPlayerId === uid)) playArenaSound('win');
        else playArenaSound('lose');
      }
    });

    socket.on('tournamentPairingStopped', (data) => {
      setPairingEnabled(false);
      alert(data.message);
    });

    socket.on('tournamentEnded', (data) => {
      setLeaderboard(data.leaderboard);
      navigate(`/arenatournament/leaderboard/${tournamentId}`);
    });

    socket.on('arenaTournamentDrawOffered', (data) => {
      const curUser = userRef.current;
      const uid = curUser?.id || curUser?._id;
      if (data.offeredByUserId === uid) {
        setDrawOfferState('sent');
      } else if (data.offeredToUserId === uid) {
        setDrawOfferState('incoming');
        if (soundEnabledRef.current) playArenaSound('move');
      }
    });

    socket.on('arenaTournamentDrawDeclined', () => {
      setDrawOfferState(null);
    });

    socket.on('arenaTournamentDrawCancelled', () => {
      setDrawOfferState(null);
    });

    socket.on('pairingUnavailable', () => {
      setWaitingForPairing(false);
      alert('Pairing is currently unavailable');
    });

    // Server refused pairing because this user is paused. Just reconcile UI;
    // don't surface an alert — this happens whenever a stray request slips in.
    socket.on('pairingPaused', () => {
      setWaitingForPairing(false);
      setIsPaused(true);
      isPausedRef.current = true;
    });

    // Bullet Blitz Marathon phase events
    socket.on('marathonPhaseTransitionPending', (data) => {
      setMarathonPhasePending(true);
      setWaitingForPairing(false);
      setMarathonPhaseBanner(data.message || 'Hour 1 complete! Finish your game — Blitz phase coming...');
    });

    socket.on('marathonPhaseChanged', (data) => {
      setMarathonPhase(1);
      setMarathonPhasePending(false);
      setMarathonPhaseBanner('⚡ BLITZ PHASE! Time control is now 3+2');
      // Update tournament timeControl so new pairings show correct time
      setTournament(prev => prev ? { ...prev, timeControl: data.timeControl, currentPhase: 1 } : prev);
    });

    socket.on('alreadyInGame', (data) => {
      loadGameData(data.gameId);
    });

    socket.on('gameError', (data) => {
      alert(`Error: ${data.message}`);
    });

    socket.on('tournamentLeaderboardUpdate', () => {
      loadTournamentData();
    });

    socket.on('teamLeaderboardUpdate', (data) => {
      if (data.teamLeaderboard) setTeamLeaderboard(data.teamLeaderboard);
    });

    socket.on('tournamentOnlineStatus', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    socket.on('pausedCountUpdate', (data) => {
      setPausedCount(data.pausedCount || 0);
    });

    socket.on('tournamentDeleted', (data) => {
      alert(data?.message || 'This tournament was deleted by an admin.');
      navigate('/arenatournament');
    });

    const interval = setInterval(() => {
      if (tournament?.endTime) {
        const now = Date.now();
        const end = new Date(tournament.endTime).getTime();
        const diff = end - now;

        if (diff <= 0) {
          setTimeRemaining('Tournament ending...');
          setTimeout(() => {
            console.log('🏆 [ArenaTournamentLive] Tournament time has expired, redirecting to leaderboard...');
            navigate(`/arenatournament/leaderboard/${tournamentId}`);
          }, 3000);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('arenaTournamentGameStarted');
      socket.off('waitingForOpponent');
      if (pairingRetryTimerRef.current) {
        clearTimeout(pairingRetryTimerRef.current);
        pairingRetryTimerRef.current = null;
      }
      socket.off('arenaTournamentMove');
      socket.off('arenaTournamentMoveSuccess');
      socket.off('arenaTournamentGameEnded');
      socket.off('tournamentPairingStopped');
      socket.off('tournamentEnded');
      socket.off('pairingUnavailable');
      socket.off('pairingPaused');
      socket.off('alreadyInGame');
      socket.off('gameError');
      socket.off('tournamentLeaderboardUpdate');
      socket.off('tournamentOnlineStatus');
      socket.off('pausedCountUpdate');
      socket.off('tournamentDeleted');
      socket.off('connect', handleReconnect);
      socket.off('arenaTournamentDrawOffered');
      socket.off('arenaTournamentDrawDeclined');
      socket.off('arenaTournamentDrawCancelled');
      socket.off('marathonPhaseTransitionPending');
      socket.off('marathonPhaseChanged');
      clearInterval(interval);
      clearInterval(firstMoveIntervalRef.current);
      if (timeoutRetryRef.current) {
        clearInterval(timeoutRetryRef.current);
        timeoutRetryRef.current = null;
      }
    };
  }, [tournamentId, tournament?.endTime, user?.id, user?._id]);

  const loadTournamentData = async () => {
    try {
      const response = await api.get(`/api/arenatournament/details/${tournamentId}`);

      // Handle 304 / missing response body gracefully
      if (response.status === 304 || !response.data || !response.data.tournament) {
        setLoading(false);
        return;
      }

      setTournament(response.data.tournament);
      
      if (response.data.tournament.status === 'finished') {
        console.log('🏆 [ArenaTournamentLive] Tournament is finished, redirecting to leaderboard...');
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        setLoading(false);
        return;
      }

      if (response.data.tournament.endTime && new Date(response.data.tournament.endTime) < new Date()) {
        console.log('🏆 [ArenaTournamentLive] Tournament end time has passed, redirecting to leaderboard...');
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        setLoading(false);
        return;
      }
      
      const userId = user?.id || user?._id;
      const myP = (response.data.participants || []).find(p => String(p.userId) === String(userId));
      setMyParticipant(myP);
      
      const sortedParticipants = [...(response.data.participants || [])].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      });
      setLeaderboard(sortedParticipants);

      // Seed team leaderboard from REST on initial load (socket fires after game ends only)
      if (response.data.tournament.tournamentType === 'team_battle') {
        try {
          const lb = await api.get(`/api/arenatournament/leaderboard/${tournamentId}`);
          if (lb.data.teamLeaderboard) setTeamLeaderboard(lb.data.teamLeaderboard);
        } catch { /* non-critical */ }
      }

      // Only set loading false here if we don't expect to load a game via socket soon
      // If we are a participant, we wait for tournamentLobbyJoined to load game data
      if (!myP) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading tournament:', err);
      setLoading(false);
    }
  };

  const loadGameData = async (gameId) => {
    try {
      console.log('🎮 [ArenaTournamentLive] Loading game data for game:', gameId);
      
      const gameResponse = await api.get(`/api/arenatournament/game/${gameId}`);
      const gameData = gameResponse.data;
      
      console.log('🎮 [ArenaTournamentLive] Game data loaded:', gameData);
      
      if (gameData.status !== 'active') {
        console.log('🏁 [ArenaTournamentLive] Game is already finished, not loading');
        setCurrentGame(null);
        setGameState(null);
        return;
      }
      
      setCurrentGame(gameId);
      
      let myColor = null;
      let opponent = '';
      const userId = user?.id || user?._id;
      
      if (String(gameData.whitePlayerId) === String(userId)) {
        myColor = 'white';
        opponent = gameData.blackPlayerDisplayName || gameData.blackPlayerUsername;
      } else if (String(gameData.blackPlayerId) === String(userId)) {
        myColor = 'black';
        opponent = gameData.whitePlayerDisplayName || gameData.whitePlayerUsername;
      }
      
      setMyColor(myColor);
      setOpponent(opponent);
      
      if (gameData.fen) {
        lastProcessedFenRef.current = gameData.fen;
        // For chess960 games, initialize chessRef with the starting FEN so move validation works correctly
        if (gameData.startFen) {
          chessRef.current = new Chess(gameData.startFen);
          gameStartFenRef.current = gameData.startFen;
        } else {
          gameStartFenRef.current = null;
        }
        chessRef.current.load(gameData.fen);
        setGameState(gameData.fen);
        
        // Set last move from game history if available
        if (gameData.moves && gameData.moves.length > 0) {
          // Use chess960 starting FEN if available, otherwise standard start
          const tempChess = new Chess(gameData.startFen || undefined);
          for (let i = 0; i < gameData.moves.length - 1; i++) {
            tempChess.move(gameData.moves[i]);
          }
          const lastMoveResult = tempChess.move(gameData.moves[gameData.moves.length - 1]);
          if (lastMoveResult) {
            setLastMove({ from: lastMoveResult.from, to: lastMoveResult.to });
          }
        }
      } else {
        chessRef.current = new Chess();
        setGameState(chessRef.current.fen());
      }

      // Initialize player timers
      if (gameData.whiteTimeRemaining !== undefined && gameData.blackTimeRemaining !== undefined) {
        let wTime = gameData.whiteTimeRemaining;
        let bTime = gameData.blackTimeRemaining;
        
        // If the game is active, subtract elapsed time since last move to keep clock synced
        if (gameData.status === 'active' && gameData.lastMoveAt) {
          const now = gameData.serverTime ? new Date(gameData.serverTime).getTime() : Date.now();
          const elapsed = now - new Date(gameData.lastMoveAt).getTime();
          const turn = chessRef.current.turn();
          if (turn === 'w') {
            wTime = Math.max(0, wTime - elapsed);
          } else {
            bTime = Math.max(0, bTime - elapsed);
          }
        }
        
        setWhiteTimeRemaining(wTime);
        setBlackTimeRemaining(bTime);
      }
      
      console.log('🎮 [ArenaTournamentLive] Game initialized - Color:', myColor, 'Opponent:', opponent);
    } catch (error) {
      console.error('❌ [ArenaTournamentLive] Error loading game data:', error);
    }
  };

  const handleRequestPairing = () => {
    if (!myParticipant) {
      alert('You must be a participant in this tournament to play games.');
      return;
    }
    
    if (!pairingEnabled) {
      alert('Pairing has been disabled. Tournament is ending soon.');
      return;
    }
    
    setWaitingForPairing(true);
    socket.emit('requestArenaTournamentPairing', { tournamentId });
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setWaitingForPairing(false);
    socket.emit('pauseArenaTournamentPairing', { tournamentId });
  };

  const handleResume = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    // Tell the server to clear the paused flag BEFORE requesting pairing.
    // The server's pairing handler refuses paused users, so resume must be explicit.
    socket.emit('resumeArenaTournamentPairing', { tournamentId });
    handleRequestPairing();
  };

  // Chess960: compute which rook squares the king can castle to (for dot indicators)
  const chess960ExtraMoves = useMemo(() => {
    if (!gameStartFenRef.current || !gameState) return [];
    try {
      const startBoard = parseFenBoard960(gameStartFenRef.current);
      const currBoard = parseFenBoard960(gameState);
      const isWhiteTurn = gameState.split(' ')[1] === 'w';
      const kChar = isWhiteTurn ? 'K' : 'k';
      const rChar = isWhiteTurn ? 'R' : 'r';
      // Find king's starting square
      const kingStartSq = Object.keys(startBoard).find(sq => startBoard[sq] === kChar);
      if (!kingStartSq || currBoard[kingStartSq] !== kChar) return [];
      const rankChar = kingStartSq[1];
      // Find rooks that are still on their starting squares
      return Object.keys(startBoard)
        .filter(sq => startBoard[sq] === rChar && sq[1] === rankChar && currBoard[sq] === rChar)
        .map(rookSq => ({ from: kingStartSq, to: rookSq }));
    } catch { return []; }
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = (from, to) => {
    console.log('♟️ [ArenaTournamentLive] Move attempted:', from, '→', to);

    if (!myParticipant) {
      console.warn('⚠️ [ArenaTournamentLive] User is not a participant');
      return false;
    }

    if (!currentGame || !gameState) {
      console.warn('⚠️ [ArenaTournamentLive] No active game');
      return false;
    }

    // Chess960 castling: king dragged onto own rook — apply manually
    if (gameStartFenRef.current) {
      const fromPiece = chessRef.current.get(from);
      const toPiece = chessRef.current.get(to);
      if (fromPiece?.type === 'k' && toPiece?.type === 'r' && fromPiece.color === toPiece.color) {
        const isKingside = to.charCodeAt(0) > from.charCodeAt(0);
        const newFen = applyCastle960(chessRef.current.fen(), from, to, isKingside);
        if (newFen) {
          chessRef.current.load(newFen);
          lastProcessedFenRef.current = newFen;
          setGameState(newFen);
          const rank = from[1];
          setLastMove({ from, to: (isKingside ? 'g' : 'c') + rank });
          if (soundEnabledRef.current) playArenaSound('move');
          socket.emit('arenaTournamentMove', { gameId: currentGame, move: { from, to } });
          return true;
        }
        return false;
      }
    }

    // Check if this is a pawn promotion move
    const piece = chessRef.current.get(from);
    const toRank = to[1];
    const isPromotion = piece?.type === 'p' && (toRank === '8' || toRank === '1');

    // Try the move with or without promotion
    const moveData = isPromotion ? { from, to, promotion: 'q' } : { from, to };
    const move = chessRef.current.move(moveData);

    if (!move) {
      console.warn('⚠️ [ArenaTournamentLive] Invalid move');
      return false;
    }
    
    console.log('✅ [ArenaTournamentLive] Valid move:', move);
    
    // Update board immediately for the player who made the move
    const newFen = chessRef.current.fen();
    lastProcessedFenRef.current = newFen;
    setGameState(newFen);
    setLastMove({ from, to });

    // Advance first-move phase for own moves
    if (firstMovePhaseRef.current === 0) {
      // I (White) just made my first move — clear White countdown, start Black's
      firstMovePhaseRef.current = 1;
      clearInterval(firstMoveIntervalRef.current);
      setFirstMoveCountdown(60);
      firstMoveIntervalRef.current = setInterval(() => {
        setFirstMoveCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(firstMoveIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (firstMovePhaseRef.current === 1) {
      // I (Black) just made my first move — clear Black countdown
      firstMovePhaseRef.current = 2;
      clearInterval(firstMoveIntervalRef.current);
      setFirstMoveCountdown(null);
    }
    
    if (soundEnabledRef.current) playArenaSound('move');
    console.log('📤 [ArenaTournamentLive] Emitting arenaTournamentMove');
    socket.emit('arenaTournamentMove', {
      gameId: currentGame,
      move: moveData
    });
    
    return true;
  };

  // Helper function to format time — shows tenths of seconds when under 10s (GM bullet precision)
  const formatTime = (milliseconds) => {
    if (milliseconds === null || milliseconds === undefined) return '--:--';
    if (milliseconds < 0) return '0.0';
    const totalSeconds = milliseconds / 1000;
    if (totalSeconds < 10) {
      // Show S.T format (tenths) for critical time
      const s = Math.floor(totalSeconds);
      const tenths = Math.floor((totalSeconds - s) * 10);
      return `${s}.${tenths}`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResign = () => {
    if (!myParticipant) return;
    if (!currentGame) return;
    
    console.log('🏳️ [ArenaTournamentLive] Resign button clicked');
    
    if (confirm('Are you sure you want to resign?')) {
      console.log('📤 [ArenaTournamentLive] Emitting resignArenaTournamentGame');
      socket.emit('resignArenaTournamentGame', { gameId: currentGame });
    } else {
      console.log('❌ [ArenaTournamentLive] Resignation cancelled');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        
        <div style={{ 
          color: '#ffffff', 
          fontSize: '24px', 
          fontWeight: '600',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          background: 'rgba(23, 23, 23, 0.7)',
          padding: '40px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', color: '#06b6d4' }}>⚡</div>
          Loading tournament...
        </div>
      </div>
    );
  }

  return (
    <div className="at-live-page">
      {/* Background gradient effect */}
      <div className="at-live-bg" />

      {/* Comeback Surge toast */}
      {comebackSurgeToast === 'fired' && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'linear-gradient(135deg, #f97316, #dc2626)',
          color: '#fff', fontWeight: '800', fontSize: '17px',
          padding: '14px 28px', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(249, 115, 22, 0.55)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeInDown 0.3s ease'
        }}>
          <span style={{ fontSize: '22px' }}>🔥</span>
          COMEBACK SURGE! Win scored <span style={{ color: '#fde68a', margin: '0 4px' }}>+4 pts</span>
        </div>
      )}

      {/* Crown bonus toast */}
      {crownToast && (() => {
        const cs = getCrownStyle(crownToast);
        return cs ? (
          <div style={{
            position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 9998, background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            color: '#fff', fontWeight: '800', fontSize: '17px',
            padding: '14px 28px', borderRadius: '16px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), ${cs.shadow}`,
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'fadeInDown 0.3s ease',
            border: `1px solid ${cs.color}`
          }}>
            <span style={{ fontSize: '22px', filter: `drop-shadow(0 0 6px ${cs.color})` }}>{cs.emoji}</span>
            CROWN SLAYER! Beat a {cs.label} holder{' '}
            <span style={{ color: cs.color, margin: '0 4px' }}>+4 pts</span>
          </div>
        ) : null;
      })()}

      {/* Carry Bonus Applied Toast */}
      {carryBonusToast > 0 && (
        <div style={{
          position: 'fixed', top: '136px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9997, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff', fontWeight: '800', fontSize: '17px',
          padding: '14px 28px', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(124,58,237,0.55)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeInDown 0.3s ease'
        }}>
          <span style={{ fontSize: '22px' }}>🎁</span>
          Carry Bonus! <span style={{ color: '#ddd6fe', margin: '0 4px' }}>+{carryBonusToast} pts</span> applied from previous tournament!
        </div>
      )}

      {/* Carry Expired Toast */}
      {carryExpiredToast && (
        <div style={{
          position: 'fixed', top: '136px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9997, background: 'linear-gradient(135deg, #374151, #1f2937)',
          color: '#fff', fontWeight: '800', fontSize: '17px',
          padding: '14px 28px', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeInDown 0.3s ease',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '22px' }}>⚠️</span>
          Your carry bonus has expired!
        </div>
      )}

      <div className="at-live-grid">
        {/* MOBILE-ONLY timer banner — shows above chessboard on small screens */}
        <div className="at-live-mobile-timer">
          <span className="at-live-mobile-timer-label">⏰ Time Remaining</span>
          <span className="at-live-mobile-timer-value">{timeRemaining || '0:00:00'}</span>
        </div>

        {/* Marathon phase banner — spans full width when active */}
        {tournament?.tournamentType === 'bullet_blitz_marathon' && (
          <div style={{
            gridColumn: '1 / -1',
            padding: '10px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: marathonPhasePending
              ? 'rgba(245,158,11,0.12)'
              : marathonPhase === 1
                ? 'rgba(6,182,212,0.12)'
                : 'rgba(239,68,68,0.08)',
            border: `1px solid ${marathonPhasePending ? 'rgba(245,158,11,0.4)' : marathonPhase === 1 ? 'rgba(6,182,212,0.4)' : 'rgba(239,68,68,0.2)'}`,
            marginBottom: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>
                {marathonPhasePending ? '⏳' : marathonPhase === 1 ? '⚡' : '🔫'}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: marathonPhasePending ? '#f59e0b' : marathonPhase === 1 ? '#06b6d4' : '#ef4444' }}>
                  {marathonPhasePending
                    ? 'Phase Transition — Finish Your Game!'
                    : marathonPhase === 1
                      ? 'BLITZ PHASE  ·  3+2'
                      : 'BULLET PHASE  ·  2+1'}
                </div>
                {marathonPhaseBanner && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{marathonPhaseBanner}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
              <span style={{ color: marathonPhase === 0 && !marathonPhasePending ? '#ef4444' : '#6b7280', fontWeight: marathonPhase === 0 ? '700' : '400' }}>Hour 1: 2+1</span>
              <span>→</span>
              <span style={{ color: marathonPhase === 1 ? '#06b6d4' : '#6b7280', fontWeight: marathonPhase === 1 ? '700' : '400' }}>Hour 2: 3+2</span>
            </div>
          </div>
        )}

        {/* LEFT CARD — Individual Leaderboard (grid-area: chat) */}
        <div className="at-live-chat">
          <div className="at-live-chat-inner" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
            {/* Individual Leaderboard header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #06b6d4, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                🏆 Leaderboard
              </h3>
              <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>{leaderboard.length} players</div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px', gap: '8px', padding: '5px 12px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Player</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Score</div>
            </div>

            {/* Leaderboard rows */}
            <div className="at-live-lb-scroll">
              {leaderboard.map((p, index) => {
                const crown = CROWN_TIERS[p.crownTierAtJoin];
                const isMe = p.userId === myParticipant?.userId;
                return (
                  <div
                    key={p._id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 52px',
                      gap: '8px',
                      padding: '5px 10px',
                      background: isMe ? 'rgba(6,182,212,0.15)' : crown ? crown.bg : index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderRadius: '6px',
                      marginTop: '1px',
                      border: isMe ? '1px solid #06b6d4' : crown ? `1px solid ${crown.border}` : '1px solid rgba(255,255,255,0.03)',
                      boxShadow: crown && !isMe ? crown.glow : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: index < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #6b7280, #4b5563)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: index < 3 ? '#000' : '#fff', fontWeight: '800', fontSize: '9px', flexShrink: 0 }}>
                        {index + 1}
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {onlineUserIds.includes(p.userId) && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 4px #10b981', flexShrink: 0 }} title="Online" />}
                      {crown && <span title={`${crown.label}`} style={{ fontSize: '13px', flexShrink: 0, filter: `drop-shadow(${crown.glow})` }}>{crown.emoji}</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, color: crown?.color || '#fff', fontWeight: crown ? '700' : '600', textShadow: crown ? `0 0 8px ${crown.color}88` : 'none' }}><PlayerName displayName={p.displayName} username={p.username} /></span>
                      {p.earlyBirdBonus && <span title="Early Bird: +3 pts" style={{ fontSize: '11px', flexShrink: 0 }}>🐦</span>}
                      {p.carryBonusApplied > 0 && <span title={`Carry Bonus: +${p.carryBonusApplied} pts`} style={{ fontSize: '11px', flexShrink: 0 }}>🎁</span>}
                      {p.comebackSurgeActive && <span title="Comeback Surge ready!" style={{ fontSize: '11px', flexShrink: 0 }}>⚡</span>}
                      {isMe && <span style={{ color: '#67e8f9', fontSize: '10px', fontWeight: '500', background: 'rgba(6,182,212,0.3)', padding: '1px 4px', borderRadius: '6px', flexShrink: 0 }}>You</span>}
                    </div>
                    <div style={{ fontWeight: '800', color: crown ? crown.color : '#06b6d4', fontSize: '13px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{p.score}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Chat button + overlay */}
        <button
          className="at-live-chat-fab"
          onClick={() => setChatOpen(v => !v)}
          title={chatOpen ? 'Close chat' : 'Open chat'}
        >
          {chatOpen ? '✕' : '💬'}
          {!chatOpen && <span style={{ fontSize: '13px', fontWeight: '700' }}>Chat</span>}
          {!chatOpen && unreadChat > 0 && (
            <span style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              fontSize: '11px',
              fontWeight: '700',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: '0 3px',
              boxShadow: '0 0 0 2px #0b1220',
            }}>
              {unreadChat > 99 ? '99+' : unreadChat}
            </span>
          )}
        </button>

        {chatOpen && (
          <div className="at-live-chat-overlay">
            <TournamentChat tournamentId={tournamentId} />
          </div>
        )}

        {/* CHESS — grid-area: chess (col 2 on desktop) */}
        <div className="at-live-chess">
          {currentGame && gameState ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* First-move 60s countdown banner */}
              {firstMoveCountdown !== null && (
                <div style={{
                  width: '100%',
                  maxWidth: `${boardWidth}px`,
                  marginBottom: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: firstMovePhaseRef.current === 0
                    ? (myColor === 'white' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)')
                    : (myColor === 'black' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)'),
                  border: firstMovePhaseRef.current === 0
                    ? (myColor === 'white' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.3)')
                    : (myColor === 'black' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.3)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: (() => {
                      const isMyTurn = (firstMovePhaseRef.current === 0 && myColor === 'white') ||
                                       (firstMovePhaseRef.current === 1 && myColor === 'black');
                      return isMyTurn ? '#f87171' : '#fbbf24';
                    })()
                  }}>
                    {(() => {
                      const isMyTurn = (firstMovePhaseRef.current === 0 && myColor === 'white') ||
                                       (firstMovePhaseRef.current === 1 && myColor === 'black');
                      return isMyTurn
                        ? `⚠️ Make your first move or you forfeit!`
                        : `⏳ Opponent must make their first move`;
                    })()}
                  </span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    color: firstMoveCountdown <= 10 ? '#f87171' : '#ffffff',
                    minWidth: '32px',
                    textAlign: 'right'
                  }}>
                    {firstMoveCountdown}s
                  </span>
                </div>
              )}
              {/* Opponent Info - Above Chessboard */}
              <div style={{
                width: '100%',
                maxWidth: `${boardWidth}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '0 16px'
              }}>
                {/* Opponent Name with Color */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {opponent || 'Opponent'}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: myColor === 'white' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: myColor === 'white' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: myColor === 'white' ? '#000000' : '#ffffff',
                      border: myColor === 'white' ? '1px solid #ffffff' : '1px solid #374151'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: '#ffffff',
                      fontWeight: '600'
                    }}>
                      {myColor === 'white' ? 'Black' : 'White'}
                    </span>
                  </div>
                </div>
                {/* Opponent Time */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontFamily: 'monospace'
                }}>
                  ⏱ {formatTime(myColor === 'white' ? blackTimeRemaining : whiteTimeRemaining)}
                </div>
              </div>

              {/* Chessboard */}
              <div style={{ 
                marginBottom: '8px',
                width: '100%',
                maxWidth: `${boardWidth}px`,
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                padding: '0',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <Chessboard
                  position={gameState}
                  onDrop={handleMove}
                  orientation={myColor}
                  lastMove={lastMove}
                  draggable={true}
                  boardWidth={boardWidth}
                  showCoordinates={false}
                  allowPremove={true}
                  playerColor={myColor}
                  extraLegalMoves={chess960ExtraMoves}
                  onPremoveChange={(p) => { chessboardPremoveRef.current = p; }}
                  boardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                />
                {/* Drag-to-resize handle — bottom-right corner */}
                <div
                  title="Drag to resize board"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startW = boardWidth;
                    const onMove = (mv) => {
                      const delta = mv.clientX - startX;
                      setBoardWidth(Math.min(720, Math.max(280, startW + delta)));
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '6px',
                    width: '22px',
                    height: '22px',
                    cursor: 'nwse-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.85,
                    transition: 'opacity 0.15s, transform 0.15s',
                    background: 'rgba(6,182,212,0.18)',
                    border: '1px solid rgba(6,182,212,0.5)',
                    borderRadius: '5px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = 'rgba(6,182,212,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(6,182,212,0.18)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M13 1L1 13" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M13 6L6 13" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M13 11L11 13" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* My Info - Below Chessboard */}
              <div style={{
                width: '100%',
                maxWidth: `${boardWidth}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '0 16px'
              }}>
                {/* My Name with Color */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    color: '#06b6d4',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {user?.displayName || 'You'}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: myColor === 'white' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: myColor === 'white' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: myColor === 'white' ? '#ffffff' : '#000000',
                      border: myColor === 'white' ? '1px solid #374151' : '1px solid #ffffff'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: '#06b6d4',
                      fontWeight: '600'
                    }}>
                      {myColor === 'white' ? 'White' : 'Black'}
                    </span>
                  </div>
                </div>
                {/* My Time */}
                <div style={{
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#06b6d4',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontFamily: 'monospace'
                }}>
                  ⏱ {formatTime(myColor === 'white' ? whiteTimeRemaining : blackTimeRemaining)}
                </div>
              </div>

              {/* Team Score Bar — hidden */}
              
              {/* Draw offer banners */}
              {drawOfferState === 'incoming' && (
                <div style={{ width: '100%', maxWidth: `${boardWidth}px`, marginBottom: '8px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#34d399' }}>🤝 Opponent offers a draw</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { socket.emit('respondArenaDraw', { gameId: currentGame, accept: true }); setDrawOfferState(null); }} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.25)', color: '#34d399', border: '1px solid rgba(16,185,129,0.5)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => { socket.emit('respondArenaDraw', { gameId: currentGame, accept: false }); setDrawOfferState(null); }} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Decline</button>
                  </div>
                </div>
              )}
              {drawOfferState === 'sent' && (
                <div style={{ width: '100%', maxWidth: `${boardWidth}px`, marginBottom: '8px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#fbbf24' }}>⏳ Draw offer sent — waiting for opponent...</div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#9ca3af',
              width: '100%'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <img 
                  src="/logo- no name.png" 
                  alt="ChessNexus Logo" 
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                />
              </div>
              <h3 style={{ 
                fontSize: '28px', 
                marginBottom: '16px', 
                color: isPaused ? '#f59e0b' : '#ffffff',
                fontWeight: '700'
              }}>
                {isPaused ? '⏸ Paused' : waitingForPairing ? 'Searching for opponent...' : 'Finding opponent...'}
              </h3>
              <p style={{ fontSize: '16px', maxWidth: '400px', margin: '0 auto 30px auto' }}>
                {isPaused
                  ? 'You are paused. Click Resume to get paired automatically.'
                  : waitingForPairing
                    ? 'Please wait while we find you an opponent'
                    : pairingEnabled
                      ? 'Auto-pairing is active'
                      : 'Pairing has been disabled. Tournament is ending soon.'}
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                {myParticipant && pairingEnabled && (
                  isPaused ? (
                    <button
                      onClick={handleResume}
                      style={{
                        padding: '14px 28px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.28)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      ▶ Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      style={{
                        padding: '14px 28px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.24)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      ⏸ Pause
                    </button>
                  )
                )}
                <button
                  onClick={() => navigate(`/arenatournament/lobby/${tournamentId}`)}
                  style={{
                    padding: '14px 28px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  ← Back to Lobby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — grid-area: right */}
        <div className="at-live-right">

          {/* Time section — hidden on mobile/tablet (shown in mobile banner instead) */}
          <div className="at-live-right-timer" style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '12px',
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{ 
              color: '#fbbf24', 
              fontSize: '12px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              whiteSpace: 'nowrap'
            }}>
              Time Remaining
            </div>
            <div style={{ 
              color: '#fbbf24', 
              fontSize: '22px', 
              fontWeight: '800', 
              fontFamily: 'monospace',
              textShadow: '0 0 12px rgba(251, 191, 36, 0.5)'
            }}>
              {timeRemaining || '0:00:00'}
            </div>
          </div>

          {/* Action Buttons — below Time Remaining, only during active game */}
          {currentGame && gameState && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {/* Sound toggle */}
                <button onClick={() => setSoundEnabled(v => !v)} title={soundEnabled ? 'Sound On' : 'Sound Off'} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: soundEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.18)', color: soundEnabled ? '#34d399' : '#9ca3af', border: `1px solid ${soundEnabled ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.25)'}`, borderRadius: '10px', fontSize: '18px', cursor: 'pointer' }}>
                  {soundEnabled ? '🔔' : '🔕'}
                </button>
                {/* Offer Draw */}
                {drawOfferState !== 'sent' && drawOfferState !== 'incoming' && (
                  <button onClick={() => { socket.emit('offerArenaDraw', { gameId: currentGame }); }} title="Offer Draw" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', fontSize: '20px', cursor: 'pointer' }}>🤝</button>
                )}
                {/* Back to Lobby */}
                <button onClick={() => navigate(`/arenatournament/lobby/${tournamentId}`)} title="Back to Lobby"
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '18px', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; e.currentTarget.style.color = '#67e8f9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                >←</button>
                {/* Pause/Resume next game toggle */}
                <button
                  onClick={isPaused ? handleResume : handlePause}
                  title={isPaused ? 'Resume auto-pairing for next game' : 'Pause auto-pairing after this game'}
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.15)', color: isPaused ? '#fbbf24' : '#9ca3af', border: `1px solid ${isPaused ? 'rgba(245,158,11,0.4)' : 'rgba(107,114,128,0.25)'}`, borderRadius: '10px', fontSize: '16px', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = isPaused ? 'rgba(245,158,11,0.32)' : 'rgba(107,114,128,0.28)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.15)'; }}
                >{isPaused ? '▶' : '⏸'}</button>
                {/* Resign */}
                <button onClick={handleResign} title="Resign"
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '18px', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(239,68,68,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                >🏳️</button>
              </div>
            </div>
          )}

          {/* YOUR STATS — below action buttons */}
          <div className="at-live-stats" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Your Stats
            </h3>
            {tournament?.tournamentType === 'team_battle' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Score</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#06b6d4', lineHeight: 1 }}>
                    {myParticipant ? myParticipant.score : '0'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Games</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', lineHeight: 1 }}>
                    {myParticipant ? myParticipant.gamesPlayed : '0'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', width: '100%' }}>
                <div style={{ textAlign: 'center', background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '10px 4px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Score</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#06b6d4', lineHeight: 1 }}>
                    {myParticipant ? myParticipant.score : '0'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 4px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Rank</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>
                    {myParticipant
                      ? (() => { const r = leaderboard.findIndex(p => p.userId === myParticipant.userId) + 1; return r > 0 ? `#${r}` : '—'; })()
                      : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '10px 4px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Wins</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>
                    {myParticipant ? (myParticipant.wins ?? 0) : '0'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', padding: '10px 4px' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Losses</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>
                    {myParticipant ? (myParticipant.losses ?? 0) : '0'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Bonuses strip — non-team only, only shown when at least one bonus active */}
          {tournament?.tournamentType !== 'team_battle' && myParticipant && (
            (myParticipant.earlyBirdBonus || myParticipant.comebackSurgeActive || myParticipant.carryBonusApplied > 0 || myParticipant.crownTierAtJoin)
          ) && (
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Active Bonuses</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {myParticipant.earlyBirdBonus && (
                  <span title="Early Bird: +3 pts for joining early" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                    🐦 Early Bird <span style={{ opacity: 0.8 }}>+3</span>
                  </span>
                )}
                {myParticipant.comebackSurgeActive && (
                  <span title="Comeback Surge: next win = +4 pts" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399' }}>
                    ⚡ Surge <span style={{ opacity: 0.8 }}>next win +4</span>
                  </span>
                )}
                {myParticipant.carryBonusApplied > 0 && (
                  <span title={`Carry Bonus: +${myParticipant.carryBonusApplied} pts from previous tournament`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}>
                    🎁 Carry <span style={{ opacity: 0.8 }}>+{myParticipant.carryBonusApplied}</span>
                  </span>
                )}
                {myParticipant.crownTierAtJoin && CROWN_TIERS[myParticipant.crownTierAtJoin] && (
                  <span title={`${CROWN_TIERS[myParticipant.crownTierAtJoin].label} — opponents earn +4 for beating you`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${CROWN_TIERS[myParticipant.crownTierAtJoin].bg}`, border: `1px solid ${CROWN_TIERS[myParticipant.crownTierAtJoin].border}`, color: CROWN_TIERS[myParticipant.crownTierAtJoin].color }}>
                    {CROWN_TIERS[myParticipant.crownTierAtJoin].emoji} {CROWN_TIERS[myParticipant.crownTierAtJoin].label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tournament Info card — non-team only */}
          {tournament?.tournamentType !== 'team_battle' && (
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#e5e7eb' }}>
                  {tournament?.tournamentType === 'chess960' && '🎲 Chess960'}
                  {tournament?.tournamentType === 'bullet_blitz_marathon' && '🏃 Bullet → Blitz Marathon'}
                  {(!tournament?.tournamentType || tournament?.tournamentType === 'standard') && '♟ Standard'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#10b981' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981', display: 'inline-block' }} />
                  {onlineUserIds.length} online
                </span>
              </div>
              {tournament?.tournamentType === 'bullet_blitz_marathon' && (
                <div>
                  {marathonPhase === 0
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>🔴 Phase 1 · Bullet</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)', color: '#fde047' }}>🟡 Phase 2 · Blitz</span>
                  }
                </div>
              )}
            </div>
          )}

          {/* Leaderboard toggle button — visible on mobile/tablet only */}
          <button
            className={`at-live-lb-toggle ${showLeaderboard ? 'open' : ''}`}
            onClick={() => setShowLeaderboard(v => !v)}
          >
            🏆 Leaderboard ({leaderboard.length})
            <span className="at-live-lb-toggle-arrow">▼</span>
          </button>

          {/* Team Score Cards — right panel (team_battle only) */}
          {tournament?.tournamentType === 'team_battle' && teamLeaderboard.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>⚔️ Teams</h3>
                <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>{teamLeaderboard.length} teams</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 56px', gap: '8px', padding: '5px 12px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Score</div>
              </div>
              {teamLeaderboard.map((team, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isMyTeam = myParticipant?.teamId === team.teamId;
                return (
                  <div key={team.teamId} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 56px', gap: '8px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', background: isMyTeam ? `${team.color}12` : 'transparent', borderLeft: isMyTeam ? `3px solid ${team.color}` : '3px solid transparent' }}>
                    <div style={{ fontSize: '14px', textAlign: 'center' }}>{medals[i] || `#${i + 1}`}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: team.color, boxShadow: `0 0 6px ${team.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: isMyTeam ? team.color : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.teamName}</span>
                      {isMyTeam && <span style={{ fontSize: '9px', fontWeight: '700', color: team.color, background: `${team.color}22`, border: `1px solid ${team.color}55`, borderRadius: '4px', padding: '1px 4px', flexShrink: 0 }}>You</span>}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#34d399', textAlign: 'right' }}>{team.totalScore}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paused count indicator */}
          {pausedCount > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '14px' }}>⏸</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#fbbf24' }}>
                {pausedCount} player{pausedCount !== 1 ? 's' : ''} paused
              </span>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Game End Popup */}
      {showGameEndPopup && gameEndData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #171717, #0a0a0a)',
            padding: '40px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.1)',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%',
            animation: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '800',
              marginBottom: '24px',
              color: '#ffffff',
              background: 'linear-gradient(to right, #ffffff, #9ca3af)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {gameEndData.result === 'draw' ? 'Game Drawn!' : 'Game Over'}
            </h2>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: gameEndData.winner === 'white' ? '#fbbf24' : '#ffffff',
                  marginBottom: '8px',
                  textShadow: gameEndData.winner === 'white' ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none'
                }}>
                  <PlayerName displayName={gameEndData.whitePlayerDisplayName} username={gameEndData.whitePlayerUsername} />
                </div>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>White</div>
              </div>

              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#4b5563'
              }}>
                {gameEndData.result === 'draw' ? '=' : 'VS'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: gameEndData.winner === 'black' ? '#fbbf24' : '#ffffff',
                  marginBottom: '8px',
                  textShadow: gameEndData.winner === 'black' ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none'
                }}>
                  <PlayerName displayName={gameEndData.blackPlayerDisplayName} username={gameEndData.blackPlayerUsername} />
                </div>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Black</div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#06b6d4',
                marginBottom: '4px'
              }}>
                {gameEndData.result === 'white_won' ? <><PlayerName displayName={gameEndData.whitePlayerDisplayName} username={gameEndData.whitePlayerUsername} /> Won!</> : 
                 gameEndData.result === 'black_won' ? <><PlayerName displayName={gameEndData.blackPlayerDisplayName} username={gameEndData.blackPlayerUsername} /> Won!</> : 
                 'Draw!'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px', textTransform: 'capitalize' }}>
                {gameEndData.reason === 'no_first_move_white'
                  ? 'Forfeit — White did not make the first move in time'
                  : gameEndData.reason === 'no_first_move_black'
                  ? 'Forfeit — Black did not make the first move in time'
                  : gameEndData.reason || 'Game ended'}
              </div>
            </div>

            {/* Streak badge */}
            {(() => {
              const uid = user?.id || user?._id;
              const isWinner = (gameEndData.result === 'white_won' && String(gameEndData.whitePlayerId) === String(uid)) ||
                               (gameEndData.result === 'black_won' && String(gameEndData.blackPlayerId) === String(uid));
              const myStreak = isWinner
                ? (gameEndData.result === 'white_won' ? gameEndData.whiteStreak : gameEndData.blackStreak)
                : 0;
              const bonus = isWinner ? (gameEndData.streakBonus || 0) : 0;
              if (!isWinner || !myStreak) return null;
              return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ padding: '8px 18px', borderRadius: '12px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>
                    🔥 {myStreak}-game win streak!
                    {bonus > 0 && <span style={{ marginLeft: '8px', color: '#34d399' }}>+{bonus} bonus pts</span>}
                    {(gameEndData.comebackBonus || 0) > 0 && (
                      <span style={{ marginLeft: '8px', color: '#f97316', fontWeight: '800' }}>⚡ COMEBACK SURGE! +4 pts</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Auto-pairing status in popup */}
            {myParticipant && pairingEnabled && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                {isPaused ? (
                  <div style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>⏸ Paused — click Resume to get paired</div>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500' }}>⚡ Finding next opponent automatically...</div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {isPaused ? (
                    <button
                      onClick={() => { setShowGameEndPopup(false); setGameEndData(null); handleResume(); }}
                      style={{ padding: '10px 24px', background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                    >
                      ▶ Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowGameEndPopup(false); setGameEndData(null); handlePause(); }}
                      style={{ padding: '10px 24px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                    >
                      ⏸ Pause
                    </button>
                  )}
                  <button
                    onClick={() => { setShowGameEndPopup(false); setGameEndData(null); }}
                    style={{ padding: '10px 24px', background: 'rgba(107,114,128,0.18)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.25)', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>
              Returning to lobby in 7 seconds...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}