import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Chess } from 'chess.js';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import PlayerName from '../../components/PlayerName';
import Chessboard from '../../components/Chessboard';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../socket';

// Debug logging function
const addLog = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
};

// Updated with Obsidian Glass theme matching ChooseTopic

const styles = {
  page: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#0a0a0a',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    position: 'relative',
    zIndex: 1,
  },
  boardSection: {
    background: 'rgba(23, 23, 23, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    justifySelf: 'center',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  statsFlyer: {
    background: 'rgba(23, 23, 23, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  timerTile: {
    background: 'rgba(23, 23, 23, 0.9)',
    backdropFilter: 'blur(5px)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 107, 107, 0.15)',
    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.2)',
    minWidth: '140px',
    width: '100%',
    maxWidth: '180px',
  },
  scoreTile: {
    background: 'rgba(23, 23, 23, 0.9)',
    backdropFilter: 'blur(5px)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(78, 205, 196, 0.15)',
    boxShadow: '0 8px 25px rgba(78, 205, 196, 0.2)',
    minWidth: '140px',
    width: '100%',
    maxWidth: '180px',
  },
  timer: {
    fontSize: '32px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '5px',
  },
  score: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '5px',
  },
  timerLabel: {
    fontSize: '12px',
    color: 'rgba(156, 163, 175, 0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '1px',
  },
  scoreLabel: {
    fontSize: '12px',
    color: 'rgba(156, 163, 175, 0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '1px',
  },
  leaderboardSection: {
    background: 'rgba(23, 23, 23, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    flex: 1,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  puzzleInfo: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(23, 23, 23, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  puzzleNumber: {
    fontSize: '24px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  leaderboard: {
    marginTop: '0',
  },
  leaderboardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '15px',
    color: '#ffffff',
  },
  leaderboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#d1d5db',
    fontSize: '14px',
  },
  currentPlayer: {
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '8px',
    padding: '12px 15px',
    margin: '0 -10px',
    border: '1px solid rgba(6, 182, 212, 0.2)',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#ffffff',
    background: 'rgba(23, 23, 23, 0.7)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
};

const adminStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
    zIndex: 10,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #eee',
    color: '#666',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee',
    color: '#1a1a1a',
  },
  score: {
    fontWeight: '700',
    color: '#667eea',
  },
  correct: {
    color: '#28a745',
    fontWeight: '600',
  },
  wrong: {
    color: '#dc3545',
    fontWeight: '600',
  }
};

export default function ArenaRace({ isAdminView = false }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Helper for result page navigation (admin vs user)
  const getResultPath = () => isAdminView ? `/admin/arena/result/${roomId}` : `/arena/result/${roomId}`;
  
  const [raceData, setRaceData] = useState(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [chess, setChess] = useState(new Chess());
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0); // Track position in current puzzle's solution
  const [userSide, setUserSide] = useState('white');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boardSize, setBoardSize] = useState(600);
  const [lastMove, setLastMove] = useState(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [nextPuzzlePrefetched, setNextPuzzlePrefetched] = useState(null);
  // Full preload of all race puzzles (FEN + intro move only — no full solutions, anti-cheat preserved).
  // Lets us render the next puzzle position instantly with zero round-trip.
  const [puzzleQueue, setPuzzleQueue] = useState(null);
  const puzzleQueueRef = useRef(null);
  // Ref version of currentPuzzleIndex — updated synchronously before any
  // fetchCurrentPuzzle call so the queue fast-path never uses a stale closure value.
  const currentPuzzleIndexRef = useRef(0);
  const lastLeaderboardUpdate = useRef(0);
  const pendingMoveRequest = useRef(false);
  const userIdRef = useRef(null);
  // Prevents overlapping prefetch requests
  const prefetchingRef = useRef(false);
  // Tracks the pending animateBotIntro Frame-2 timeout so we can cancel it
  // if a new puzzle arrives before the previous 120 ms delay has fired.
  const botIntroTimeoutRef = useRef(null);
  
  // Manual resize refs
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    // Guard: Don't proceed if roomId is undefined
    if (!roomId) {
      setError('Invalid race room ID');
      setLoading(false);
      return;
    }

    // Guard: Wait for user to be loaded before joining
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const userId = user.id || user._id;
    
    // Store userId in ref for later use (prevents context loss issues)
    userIdRef.current = userId;
    
    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }
    
    // Join socket room
    socket.emit('joinArenaRoom', `arena:${roomId}`);

    // Listen for progress updates
    socket.on('progressUpdate', (data) => {
      addLog(`Progress update: ${JSON.stringify(data)}`);
      setLeaderboard(prev => {
        const updated = prev.filter(p => p.username !== data.username);
        updated.push({
          username: data.username,
          displayName: data.displayName || data.username,
          score: data.score,
          currentPuzzleIndex: data.currentPuzzleIndex,
          correctCount: data.correctCount || 0,
          wrongCount: data.wrongCount || 0,
          status: data.status
        });
        return updated.sort((a, b) => b.score - a.score);
      });
    });

    socket.on('arenaTimeUpdate', (data) => {
      addLog(`Time update: ${data.timeRemaining}s`);
      setTimeLeft(data.timeRemaining);
    });

    // Listen for race end
    socket.on('raceEnded', () => {
      addLog('Race ended event received');
      navigate(getResultPath());
    });

    socket.on('raceCompleted', () => {
      addLog('Race completed event received');
      navigate(getResultPath());
    });

    socket.on('raceStarted', (data) => {
      addLog(`Race started: ${JSON.stringify(data)}`);
      // Race started, load first puzzle and set timer
      setTimeLeft(data.timeLimit * 60); // Convert to seconds
      setMoveIndex(0); // USER-FIRST: user plays solution[0]
      fetchCurrentPuzzle();
      // REMOVED: fetchLeaderboard(); - socket handles leaderboard updates
    });

    // Listen for new players joining the room
    socket.on('playerJoined', (data) => {
      addLog(`Player joined: ${data.username}`);
      
      // Add new player to leaderboard with initial score of 0
      setLeaderboard(prev => {
        const existing = prev.find(p => p.username === data.username);
        if (existing) return prev; // Player already in leaderboard
        
        const newPlayer = {
          username: data.username,
          displayName: data.displayName || data.username,
          score: 0,
          currentPuzzleIndex: 0,
          correctCount: 0,
          wrongCount: 0,
          status: 'racing'
        };
        
        return [...prev, newPlayer].sort((a, b) => b.score - a.score);
      });
    });

    // Socket-based leaderboard updates (no polling needed)
    socket.on('leaderboardUpdate', (data) => {
      addLog(`Leaderboard update via socket: ${data.leaderboard.length} players`);
      setLeaderboard(data.leaderboard || []);
      lastLeaderboardUpdate.current = Date.now();
    });

    // Socket response for move submissions (replaces HTTP)
    socket.on('arenaMoveResponse', (data) => {
      addLog(`Move response via socket: ${JSON.stringify(data)} - ZERO HTTP OVERHEAD`);
      handleMoveResponse(data);
    });

    socket.on('arenaMoveError', (data) => {
      addLog(`Move error via socket: ${data.message}`, 'error');
      pendingMoveRequest.current = false;
      
      // Handle specific error types
      if (data.action === 'REFRESH') {
        // Don't immediately refresh, just warn user - they can retry
        setError('Session expired - your move still counts. Please refresh if issues continue.');
      } else {
        setError(data.message || 'Move failed - retrying...');
      }
      setTimeout(() => setError(''), 3000);
    });

    // Socket notification for next puzzle ready
    socket.on('puzzleReady', (data) => {
      addLog(`Next puzzle ready: ${data.puzzleIndex}`);
      if (data.puzzle) {
        setNextPuzzlePrefetched(data.puzzle);
      }
    });

    // Socket error handler - don't crash UI
    socket.on('error', (errorData) => {
      addLog(`Socket error: ${typeof errorData === 'string' ? errorData : errorData?.message || 'Unknown error'}`, 'error');
    });

    // Socket disconnect handler - attempt to rejoin
    socket.on('disconnect', (reason) => {
      addLog(`Socket disconnected: ${reason}`);
      
      // For iOS/iPad, the reconnect might be delayed - don't show scary message
      if (reason === 'io client disconnect' || reason === 'transport close') {
        addLog('Attempting to reconnect...');
      }
    });

    // Handle server-side deletion of the room
    const onRoomDeleted = (data) => {
      if (data && data.roomId === roomId) {
        addLog('Room has been deleted by admin', 'error');
        setError('This room has been deleted by the administrator');
        setTimeout(() => navigate('/arena'), 3000);
      }
    };
    socket.on('roomDeleted', onRoomDeleted);

    // Fetch initial data
    fetchRaceData();

    return () => {
      socket.off('progressUpdate');
      socket.off('arenaTimeUpdate');
      socket.off('raceEnded');
      socket.off('raceCompleted');
      socket.off('roomDeleted', onRoomDeleted);
      socket.off('raceStarted');
      socket.off('playerJoined');
      socket.off('leaderboardUpdate');
      socket.off('puzzleReady');
      socket.off('arenaMoveError');
      socket.off('arenaMoveResponse');
      socket.off('error');
      socket.off('disconnect');
    };
  }, [roomId, user, authLoading]);

  // Keep userId ref in sync with user context
  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      userIdRef.current = userId;
    }
  }, [user]);

  // Rejoin arena if socket reconnects
  useEffect(() => {
    const handleReconnect = () => {
      if (roomId) {
        socket.emit('joinArenaRoom', `arena:${roomId}`);
      }
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [roomId, user]);

  // Client-side countdown ticker — keeps display smooth regardless of socket delivery timing.
  // Server's arenaTimeUpdate events sync/correct the value; this just fills in the gaps.
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Responsive board sizing and layout
  useEffect(() => {
    const updateBoardSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Set mobile layout for phones and tablets, desktop layout for laptops and larger screens
      setIsMobileLayout(viewportWidth < 1200);

      // Calculate available space for board (accounting for sidebar and padding)
      const sidebarWidth = viewportWidth < 1200 ? 0 : 300; // Sidebar on laptops and desktops, not on mobile/tablet
      const padding = 80; // total padding and margins
      const availableWidth = viewportWidth - sidebarWidth - padding;
      const availableHeight = viewportHeight - 120; // header and padding

      // Determine device type and set appropriate size
      let newSize;
      if (viewportWidth < 768) {
        // Mobile: smaller board
        newSize = Math.min(viewportWidth - 60, 450); // Increased to 450px as requested
      } else if (viewportWidth < 1024) {
        // Tablet: medium board
        newSize = Math.min(450, Math.min(availableWidth - 40, availableHeight - 40)); // Set to 450px for tablets
      } else {
        // Desktop: larger board
        newSize = Math.min(435, Math.min(availableWidth, availableHeight)); // Set to 435px for desktop chessboard
      }

      // Ensure minimum size
      newSize = Math.max(250, newSize);
      setBoardSize(newSize);
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  // Manual resize handlers with touch support
  const handleManualResizeStart = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = boardSize;
    
    document.addEventListener('mousemove', handleManualResizeMove);
    document.addEventListener('mouseup', handleManualResizeEnd);
    document.addEventListener('touchmove', handleManualResizeMove, { passive: false });
    document.addEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'nwse-resize';
  };
  
  const handleManualResizeMove = (e) => {
    if (!resizingRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startXRef.current;
    const newWidth = Math.max(300, Math.min(800, startWidthRef.current + deltaX));
    setBoardSize(newWidth);
  };
  
  const handleManualResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleManualResizeMove);
    document.removeEventListener('mouseup', handleManualResizeEnd);
    document.removeEventListener('touchmove', handleManualResizeMove);
    document.removeEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'default';
  };

  // Appends the next 30 puzzles to the local queue so fast solvers
  // never run out of pre-loaded data between puzzles.
  const prefetchNextBatch = async (offset) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    addLog(`Pre-fetching puzzle batch from offset ${offset}`);
    try {
      const res = await api.get(`/api/arena/rooms/${roomId}/puzzle-batch?offset=${offset}&limit=30`);
      if (res.data.puzzles && res.data.puzzles.length > 0) {
        const appended = [...(puzzleQueueRef.current || []), ...res.data.puzzles];
        puzzleQueueRef.current = appended;
        setPuzzleQueue(appended);
        addLog(`Batch prefetched: queue now has ${appended.length} puzzles`);
      }
    } catch (err) {
      addLog(`Batch prefetch error: ${err.message}`, 'error');
    } finally {
      prefetchingRef.current = false;
    }
  };

  const fetchRaceData = async () => {
    // Guard: Don't fetch if roomId is undefined
    if (!roomId) {
      setError('Invalid race room ID');
      setLoading(false);
      return;
    }
    
    const startTime = performance.now();
    try {
      addLog(`Fetching race data for room ${roomId}`);
      // Check race status
      const response = await api.get(`/api/arena/waiting/${roomId}`);
      const endTime = performance.now();
      const duration = endTime - startTime;
      addLog(`Race status: ${response.data.status} (${duration.toFixed(2)}ms)`);
      if (response.data.status === 'active') {
        // Set initial leaderboard from API response
        if (response.data.leaderboard && response.data.leaderboard.length > 0) {
          setLeaderboard(response.data.leaderboard);
        }
        // Set remaining time immediately so late joiners see correct timer (not 0)
        if (response.data.timeRemainingSec != null) {
          setTimeLeft(response.data.timeRemainingSec);
        }
        // SPEED: cache the full puzzle queue (FENs + intro moves) so puzzle
        // transitions are instant. The server still validates every move.
        if (Array.isArray(response.data.puzzleQueue) && response.data.puzzleQueue.length) {
          setPuzzleQueue(response.data.puzzleQueue);
          puzzleQueueRef.current = response.data.puzzleQueue;
          addLog(`Preloaded puzzle queue: ${response.data.puzzleQueue.length} puzzles`);
        }
        // RESUME SYNC: if the player refreshed mid-race they may already be on a
        // later puzzle. Seed the local index from the server's leaderboard so the
        // queue fast-path renders the CORRECT puzzle (not always puzzle 1).
        if (response.data.leaderboard && user) {
          const me = response.data.leaderboard.find(
            p => p.username === user.username
          );
          if (me && typeof me.currentPuzzleIndex === 'number' && me.currentPuzzleIndex > 0) {
            currentPuzzleIndexRef.current = me.currentPuzzleIndex;
            setCurrentPuzzleIndex(me.currentPuzzleIndex);
            addLog(`Resume sync: starting at puzzle index ${me.currentPuzzleIndex}`);
          }
        }
        if (!isAdminView) {
          fetchCurrentPuzzle();
        }
        // Socket will handle real-time leaderboard updates
      } else if (response.data.status === 'completed') {
        // Race has ended, redirect to results
        addLog('Race completed, redirecting to results');
        navigate(getResultPath());
        return;
      } else if (response.data.status === 'waiting') {
        // Race hasn't started yet, redirect to waiting room
        addLog('Race waiting, redirecting to waiting room');
        navigate(isAdminView ? `/admin/arena/waiting/${roomId}` : `/arena/waiting/${roomId}`);
        return;
      }
      setLoading(false);
    } catch (err) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      addLog(`Fetch race data error: ${err.message} (${duration.toFixed(2)}ms)`, 'error');
      // If we can't fetch race data, try to get results anyway
      try {
        await api.get(`/api/arena/result/${roomId}`);
        navigate(getResultPath());
        return;
      } catch (resultErr) {
        setError('Failed to load race data');
        setLoading(false);
      }
    }
  };

  // Lichess-style intro: flash the starting position, then snap to the position
  // after the bot's opening pre-moves (with last-move highlight) so the user
  // perceives the bot as having just moved. Single fast frame — no per-move stagger.
  // USER-FIRST puzzle start (matches Timed Race): the opponent's setup move is
  // already baked into the FEN, so we just SHOW the position and let the user
  // play solution[0]. For a resume (resumeIndex > 0), replay the solution up to
  // that index so the board is reconstructed correctly.
  const showPuzzleStart = (newChess, resumeIndex = 0, solutionMoves = []) => {
    if (botIntroTimeoutRef.current) {
      clearTimeout(botIntroTimeoutRef.current);
      botIntroTimeoutRef.current = null;
    }

    if (!resumeIndex || resumeIndex <= 0) {
      // Fresh puzzle — show the position, user moves first.
      setChess(new Chess(newChess.fen()));
      setLastMove(null);
      setMoveIndex(0);
      return;
    }

    // Resume — replay solution[0..resumeIndex) to rebuild the board state.
    const board = new Chess(newChess.fen());
    let lastMoveObj = null;
    for (let i = 0; i < resumeIndex && i < solutionMoves.length; i++) {
      const move = solutionMoves[i];
      let moveObj = board.move(move, { sloppy: true });
      if (!moveObj && typeof move === 'string' && move.length >= 4) {
        moveObj = board.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || 'q' });
      }
      if (moveObj) lastMoveObj = moveObj;
    }
    setChess(board);
    if (lastMoveObj) setLastMove({ from: lastMoveObj.from, to: lastMoveObj.to });
    setMoveIndex(resumeIndex);
  };

  const fetchCurrentPuzzle = async (retryCount = 0) => {
    const startTime = performance.now();

    // SPEED FAST-PATH: render the next puzzle's position instantly from the
    // preloaded queue (FEN + bot's intro move only \u2014 no solution exposed).
    // After the visual render, we still fetch the full puzzle in the background
    // so the solution is available for last-move highlighting on bot replies.
    const queue = puzzleQueueRef.current;
    if (queue && queue.length && !nextPuzzlePrefetched) {
      // Use the ref (always current) — never the stale closure value of currentPuzzleIndex
      const idx = currentPuzzleIndexRef.current;
      if (idx < queue.length) {
        const queued = queue[idx];
        if (queued && queued.fen && queued.solution) {
          addLog(`Queue fast-path: rendering puzzle ${idx} instantly (full solution)`);
          const solutionMoves = queued.solution;
          // USER-FIRST (like Timed Race): the opponent's setup move is already
          // baked into the FEN. The solver is the FEN's side-to-move and plays
          // solution[0]. Do NOT pre-play any move.
          const initialSide = queued.fen.split(' ')[1];
          setUserSide(initialSide === 'w' ? 'white' : 'black');
          const newChess = new Chess(queued.fen);
          setCurrentPuzzle({ fen: queued.fen, solution: solutionMoves });
          setLoading(false);
          showPuzzleStart(newChess);
          if (idx >= Math.floor(queue.length * 0.7) && !prefetchingRef.current) {
            prefetchNextBatch(queue.length);
          }
          return;
        }
      }
    }

    // Check if we have prefetched puzzle
    if (nextPuzzlePrefetched && nextPuzzlePrefetched.currentPuzzleIndex !== undefined) {
      addLog(`Using prefetched puzzle ${nextPuzzlePrefetched.currentPuzzleIndex} - ZERO LATENCY`);
      const puzzle = nextPuzzlePrefetched.puzzle || nextPuzzlePrefetched;
      const currentPuzzleIndex = nextPuzzlePrefetched.currentPuzzleIndex;
      const currentMoveIndex = nextPuzzlePrefetched.currentMoveIndex || 1;
      const score = nextPuzzlePrefetched.score || 0;
      
      setCurrentPuzzle(puzzle);
      setCurrentPuzzleIndex(currentPuzzleIndex);
      setScore(score);
      setNextPuzzlePrefetched(null); // Clear used prefetch
      
      // USER-FIRST: solver is the FEN's side-to-move; solution[0] is their move.
      const initialSide = puzzle.fen.split(' ')[1];
      const side = initialSide === 'w' ? 'white' : 'black';
      setUserSide(side);
      addLog(`User side determined: ${side}`);

      // Setup board state
      const solutionMoves = Array.isArray(puzzle.solution)
        ? puzzle.solution
        : (typeof puzzle.solution === 'string'
          ? puzzle.solution.split(/[, ]+/).filter(Boolean)
          : []);

      const newChess = new Chess(puzzle.fen);

      // Check if the game is already over (checkmate, stalemate, etc.)
      if (newChess.isGameOver()) {
        // Submit as incorrect and request next puzzle immediately (no delay)
        try {
          await api.post(`/api/arena/submit/${roomId}`, {
            move: null,
            timeSpent: 0,
            skipInvalid: true
          });
          fetchCurrentPuzzle();
        } catch (skipErr) {
          setError('Invalid puzzle position - please refresh');
        }
        return;
      }
      // Show the position as-is; the user moves first (the opponent's setup move
      // is already in the FEN). currentMoveIndex from the server is the resume
      // point; for a fresh puzzle it is 0.
      showPuzzleStart(newChess, currentMoveIndex, solutionMoves);
      setLoading(false);
      return;
    }
    
    // Fallback: fetch from API
    try {
      addLog(`Fetching current puzzle for room ${roomId}${retryCount > 0 ? ' (retry ' + retryCount + ')' : ''}`);
      const response = await api.get(`/api/arena/puzzle/${roomId}`);
      const endTime = performance.now();
      const duration = endTime - startTime;
      const { puzzle, currentPuzzleIndex: serverPuzzleIdx, currentMoveIndex, score } = response.data;
      addLog(`Puzzle ${serverPuzzleIdx}, moveIndex ${currentMoveIndex}, score ${score} (${duration.toFixed(2)}ms)`);

      // If the fast-path already rendered this puzzle from the queue, just
      // backfill the full puzzle (with solution) for last-move highlighting on
      // bot replies \u2014 do NOT re-render the board or reset moveIndex.
      setCurrentPuzzle(puzzle);
      setCurrentPuzzleIndex(serverPuzzleIdx);
      setScore(score);
      
      // USER-FIRST: solver is the FEN's side-to-move; solution[0] is their move.
      const initialSide = puzzle.fen.split(' ')[1];
      const side = initialSide === 'w' ? 'white' : 'black';
      setUserSide(side);
      addLog(`User side determined: ${side}`);

      // Parse solution as array
      const solutionMoves = Array.isArray(puzzle.solution)
        ? puzzle.solution
        : (typeof puzzle.solution === 'string'
          ? puzzle.solution.split(/[, ]+/).filter(Boolean)
          : []);
      addLog(`Solution moves: ${solutionMoves.join(' ')}`);

      // Initialize chess board with puzzle position
      const newChess = new Chess(puzzle.fen);
      addLog(`Initial FEN: ${puzzle.fen}`);

      // Check if the game is already over (checkmate, stalemate, etc.)
      if (newChess.isGameOver()) {
        try {
          await api.post(`/api/arena/submit/${roomId}`, {
            move: null,
            timeSpent: 0,
            skipInvalid: true
          });
          fetchCurrentPuzzle();
        } catch (skipErr) {
          setError('Invalid puzzle position - please refresh');
        }
        return;
      }

      // Show the position as-is; the user moves first.
      showPuzzleStart(newChess, currentMoveIndex, solutionMoves);
      setLoading(false);
    } catch (err) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      addLog(`Fetch puzzle error: ${err.message} (${duration.toFixed(2)}ms)`, 'error');
      
      // Retry logic for race condition during start (especially for auto-start races)
      if (retryCount < 10) {
        const backoff = Math.pow(1.5, retryCount) * 500; // gentler backoff but more retries
        addLog(`Retrying fetch puzzle in ${backoff.toFixed(0)}ms... (Attempt ${retryCount + 1}/10)`);
        
        // Show a more friendly message during retries
        if (retryCount > 2) {
          setError('Race is initializing... please wait a moment');
        }
        
        setTimeout(() => {
          fetchCurrentPuzzle(retryCount + 1);
        }, backoff);
        return;
      }
      
      setError('Failed to load puzzle - please try refreshing the page');
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (force = false) => {
    // Throttle: only fetch if 2+ seconds since last update (socket should handle real-time)
    const now = Date.now();
    if (!force && lastLeaderboardUpdate.current && (now - lastLeaderboardUpdate.current) < 2000) {
      addLog('Leaderboard fetch skipped - using socket updates');
      return;
    }
    
    const startTime = performance.now();
    try {
      const response = await api.get(`/api/arena/live/${roomId}`);
      const endTime = performance.now();
      const duration = endTime - startTime;
      setLeaderboard(response.data.leaderboard || []);
      lastLeaderboardUpdate.current = now;
    } catch (err) {
      const endTime = performance.now();
      const duration = endTime - startTime;
    }
  };

  // Optimistically bump the current user's OWN leaderboard row by `delta`,
  // immediately on a local solve — so the board reflects the new score without
  // waiting for the server round-trip. handleMoveResponse later overwrites this
  // row with the server's authoritative score, so there is no double-count.
  const bumpOwnLeaderboard = (delta) => {
    if (!user?.username) return;
    setLeaderboard(prev => {
      const mine = prev.find(p => p.username === user.username);
      const others = prev.filter(p => p.username !== user.username);
      others.push({
        ...(mine || {}),
        username: user.username,
        displayName: user.displayName || mine?.displayName || user.username,
        score: (mine?.score || 0) + delta,
        currentPuzzleIndex: mine?.currentPuzzleIndex ?? currentPuzzleIndexRef.current,
        status: mine?.status || 'racing',
      });
      return others.sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  };

  const handleMove = (sourceSquare, targetSquare, promotion) => {
    const userId = (user?.id || user?._id) || userIdRef.current;
    if (!userId) {
      setError('Authentication lost. Please refresh the page.');
      return false;
    }

    // USER-FIRST: user plays EVEN indices (0,2,4…), bot replies at ODD (1,3,5…).
    if (moveIndex % 2 === 1) {
      addLog(`Blocked — bot turn (moveIndex ${moveIndex})`);
      setError("Not your turn");
      setTimeout(() => setError(''), 1200);
      return false;
    }

    // Capture the position BEFORE the user's move to resolve the expected move.
    const preMoveFen = chess.fen();

    // Validate the move is legal on the current board
    const tempChess = new Chess(preMoveFen);
    const moveResult = tempChess.move({ from: sourceSquare, to: targetSquare, promotion: promotion || 'q' });
    if (!moveResult) {
      addLog('Illegal move', 'error');
      return false;
    }

    // User's move in full UCI (incl. promotion, e.g. "e7e8q").
    const uci = (moveResult.from + moveResult.to + (moveResult.promotion || '')).toLowerCase();

    // Show user's piece landing immediately — zero latency
    setChess(tempChess);
    setLastMove({ from: sourceSquare, to: targetSquare });

    // ── Local move validation ─────────────────────────────────────────────────
    // Full solution is already in memory from the puzzle queue.
    // No server round-trip needed — validate here, update board locally.
    const solutionMoves = Array.isArray(currentPuzzle?.solution)
      ? currentPuzzle.solution
      : (typeof currentPuzzle?.solution === 'string'
          ? currentPuzzle.solution.split(/[, ]+/).filter(Boolean)
          : []);

    // Resolve the stored expected move to UCI. It may be SAN ("Rb1#","a1=Q") or
    // UCI ("b2b1") — NEVER assume 4 chars means UCI (SAN mates are 4 chars too).
    const rawExpected = solutionMoves[moveIndex] || '';
    const expectedMove = (() => {
      if (!rawExpected) return '';
      const pre = new Chess(preMoveFen);
      let m = pre.move(rawExpected, { sloppy: true });
      if (!m && rawExpected.length >= 4) {
        try {
          m = pre.move({ from: rawExpected.slice(0, 2), to: rawExpected.slice(2, 4), promotion: rawExpected[4] || undefined });
        } catch (_) { m = null; }
      }
      return m ? (m.from + m.to + (m.promotion || '')).toLowerCase() : '';
    })();

    // Lichess rule: accept the stored move, OR any move that delivers immediate
    // checkmate (covers "multiple ways to mate" — alternate mates are valid).
    const isAltMate = tempChess.isCheckmate();
    const isCorrect = isAltMate || (!!expectedMove && expectedMove === uci);

    addLog(`${uci} vs ${expectedMove || '?'} → ${isCorrect ? (isAltMate ? '✓ alt-mate' : '✓ correct') : '✗ wrong'}`);

    // Report to server for leaderboard — fire-and-forget, no blocking wait
    if (socket && socket.connected) {
      socket.emit('submitArenaMove', { roomId, move: uci, userId });
    }

    if (isCorrect) {
      const nextIdx = moveIndex + 1;

      // An alternate mate ends the puzzle immediately, even mid-line.
      if (isAltMate || nextIdx >= solutionMoves.length) {
        // ── Puzzle solved on this move ──────────────────────────────────────
        setMoveIndex(nextIdx);
        setScore(prev => prev + 10); // local estimate; server confirms exact value
        bumpOwnLeaderboard(10); // immediate leaderboard feedback, no round-trip
        addLog('Puzzle solved — next puzzle in 280 ms');
        setTimeout(() => {
          currentPuzzleIndexRef.current += 1;
          setCurrentPuzzleIndex(prev => prev + 1);
          fetchCurrentPuzzle();
        }, 280);

      } else {
        // ── Bot responds at the next (odd) index ───────────────────────────
        // Block user clicks (odd index = bot's turn) while we animate.
        setMoveIndex(nextIdx);
        const botMoveUCI = solutionMoves[nextIdx];
        const capturedChess = tempChess; // local variable — not stale in setTimeout

        setTimeout(() => {
          const afterBotChess = new Chess(capturedChess.fen());
          let botMoveObj = afterBotChess.move(botMoveUCI, { sloppy: true });
          if (!botMoveObj && botMoveUCI?.length >= 4) {
            botMoveObj = afterBotChess.move({
              from: botMoveUCI.slice(0, 2),
              to:   botMoveUCI.slice(2, 4),
              promotion: botMoveUCI[4] || 'q',
            });
          }
          if (botMoveObj) {
            setChess(afterBotChess);
            setLastMove({ from: botMoveObj.from, to: botMoveObj.to });
          }
          const afterBotIdx = nextIdx + 1;
          setMoveIndex(afterBotIdx); // odd again → user's turn

          // Edge case: solution ends on the bot's response
          if (afterBotIdx >= solutionMoves.length) {
            setScore(prev => prev + 10);
            bumpOwnLeaderboard(10); // immediate leaderboard feedback
            setTimeout(() => {
              currentPuzzleIndexRef.current += 1;
              setCurrentPuzzleIndex(prev => prev + 1);
              fetchCurrentPuzzle();
            }, 280);
          }
        }, 150); // 150 ms: user sees their piece land, then bot replies
      }

    } else {
      // ── Wrong move — skip this puzzle ──────────────────────────────────────
      addLog('Wrong move — skipping puzzle');
      // 100 ms: brief visual of the wrong position, then next puzzle
      setTimeout(() => {
        currentPuzzleIndexRef.current += 1;
        setCurrentPuzzleIndex(prev => prev + 1);
        fetchCurrentPuzzle();
      }, 100);
    }

    return true;
  };

  const handleMoveResponse = (data) => {
    addLog(`Server confirmation: score=${data.score} puzzleIdx=${data.currentPuzzleIndex} status=${data.status}`);

    // Server is authoritative for score — correct local estimate if needed
    if (data.score !== undefined) setScore(data.score);

    // Update the CURRENT user's own leaderboard row. The server broadcasts
    // progressUpdate only to OTHER players (socket.broadcast excludes the
    // sender), so without this our own row would stay frozen at its initial
    // score and the player would never see their score climb on the board.
    if (data.score !== undefined && user?.username) {
      setLeaderboard(prev => {
        const mine = prev.find(p => p.username === user.username) || {};
        const others = prev.filter(p => p.username !== user.username);
        others.push({
          ...mine,
          username: user.username,
          displayName: user.displayName || mine.displayName || user.username,
          score: data.score,
          currentPuzzleIndex: data.currentPuzzleIndex ?? mine.currentPuzzleIndex ?? 0,
          status: data.status || mine.status || 'racing',
        });
        return others.sort((a, b) => (b.score || 0) - (a.score || 0));
      });
    }

    // Race finished (all puzzles done or time expired server-side)
    if (data.status === 'finished') {
      addLog('Race finished');
      navigate(getResultPath());
      return;
    }

    // NOTE: The board is rendered EXCLUSIVELY by the local optimistic path
    // (handleMove → fetchCurrentPuzzle). We deliberately do NOT re-render the
    // board from this server response. Doing so previously caused the
    // "repeating move" glitch: a stale closure made the client replay
    // animateBotIntro on every move, fighting the local renderer and snapping
    // the board back to the puzzle start. A genuinely exhausted puzzle queue is
    // already handled by fetchCurrentPuzzle's own API fallback, so this handler
    // only needs to sync score and detect race completion.
  };

  const endRace = async () => {
    if (!window.confirm('Are you sure you want to end this race early?')) return;
    try {
      await api.post(`/api/admin/arena/complete/${roomId}`, {});
      navigate(getResultPath());
    } catch (err) {
      alert('Failed to end race: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.loading}>Loading race...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <div style={adminStyles.page}>
        <button onClick={() => navigate('/admin/arena')} style={adminStyles.backButton}>
          ← Back to Arena Admin
        </button>
        
        <div style={adminStyles.container}>
          <div style={adminStyles.header}>
            <div style={adminStyles.title}>🏆 Live Race Monitoring</div>
            <div style={{ fontSize: '20px', color: '#667eea', fontWeight: '700' }}>Room: {roomId}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', textAlign: 'center', border: '1px solid #e9ecef' }}>
              <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Time Left</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: timeLeft < 60 ? '#dc3545' : '#1a1a1a' }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', textAlign: 'center', border: '1px solid #e9ecef' }}>
              <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Active Players</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#667eea' }}>{leaderboard.length}</div>
            </div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', textAlign: 'center', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => fetchLeaderboard(true)}
                style={{
                  padding: '12px 20px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
              <button 
                onClick={endRace}
                style={{
                  padding: '12px 20px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🏁 End Race
              </button>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden' }}>
            <table style={adminStyles.table}>
              <thead>
                <tr>
                  <th style={adminStyles.th}>Rank</th>
                  <th style={adminStyles.th}>Player</th>
                  <th style={adminStyles.th}>Score</th>
                  <th style={adminStyles.th}>Correct</th>
                  <th style={adminStyles.th}>Wrong</th>
                  <th style={adminStyles.th}>Total Done</th>
                  <th style={adminStyles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr key={player.username}>
                    <td style={adminStyles.td}>#{index + 1}</td>
                    <td style={adminStyles.td}>
                      <div style={{ fontWeight: '600' }}><PlayerName displayName={player.displayName} username={player.username} /></div>
                      <div style={{ fontSize: '11px', color: '#999' }}>@{player.username}</div>
                    </td>
                    <td style={{ ...adminStyles.td, ...adminStyles.score }}>{player.score}</td>
                    <td style={{ ...adminStyles.td, ...adminStyles.correct }}>{player.correctCount || 0}</td>
                    <td style={{ ...adminStyles.td, ...adminStyles.wrong }}>{player.wrongCount || 0}</td>
                    <td style={adminStyles.td}>{(player.correctCount || 0) + (player.wrongCount || 0)}</td>
                    <td style={adminStyles.td}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: player.status === 'racing' ? '#e7f5ff' : '#f8f9fa',
                        color: player.status === 'racing' ? '#228be6' : '#666'
                      }}>
                        {player.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      
      <div style={{
        ...styles.container,
        gridTemplateColumns: (isMobileLayout ? '1fr' : '300px auto 300px'),
        gap: isMobileLayout ? '20px' : '30px',
        padding: isMobileLayout ? '10px' : '0',
      }}>
        {/* LEADERBOARD - Left Side */}
        <div style={styles.leaderboardSection}>
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardTitle}>🏆 Leaderboard</div>
            {leaderboard.map((player, index) => (
              <div key={player.username || index} style={{
                ...styles.leaderboardItem,
                ...(user && player.username === user.username ? styles.currentPlayer : {})
              }}>
                <span>#{index + 1} <PlayerName displayName={player.displayName} username={player.username} /></span>
                <span>{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHESSBOARD - Center (hidden for admin view) */}
        {!isAdminView && (
        <div style={{
          ...styles.boardSection,
          padding: isMobileLayout ? '20px' : '30px',
          marginBottom: isMobileLayout ? '20px' : '0',
          width: (() => {
            const coordinateSize = boardSize < 400 ? 20 : 32;
            const totalBoardWidth = boardSize + coordinateSize * 2;
            return `${totalBoardWidth + (isMobileLayout ? 40 : 60)}px`;
          })(),
          maxWidth: '100%', // Prevent overflow on very small screens
        }}>
          <div style={{
            position: 'relative',
            display: 'inline-block',
          }}>
            <Chessboard
              key={currentPuzzle?._id}
              position={chess.fen()}
              onDrop={handleMove}
              orientation={userSide}
              lastMove={lastMove}
              isInteractive={true}
              boardWidth={boardSize}
              draggable={true}
            />
            {/* Resize Handle */}
            <div
              onMouseDown={handleManualResizeStart}
              onTouchStart={handleManualResizeStart}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '0 0 30px 30px',
                borderColor: 'transparent transparent #06b6d4 transparent',
                cursor: 'nwse-resize',
                zIndex: 100,
                opacity: 0.8,
                touchAction: 'none'
              }}
              title="Drag to resize"
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '20px'
          }}>
            <button
              onClick={async () => {
                try {
                  // Send skip via socket for faster response
                  if (socket && socket.connected) {
                    socket.emit('submitArenaMove', {
                      roomId,
                      move: 'SKIP',
                      userId: user?.id || user?._id
                    });
                  } else {
                    // Fallback to HTTP - submit wrong move to skip
                    await api.post(`/api/arena/progress/${roomId}`, {
                      move: 'SKIP'
                    });
                  }
                  // Advance the LOCAL puzzle index (ref + state) before fetching,
                  // exactly like a wrong move does. Without this the queue
                  // fast-path re-renders the SAME puzzle and skip appears to do
                  // nothing / repeat the current puzzle.
                  setTimeout(() => {
                    currentPuzzleIndexRef.current += 1;
                    setCurrentPuzzleIndex(prev => prev + 1);
                    fetchCurrentPuzzle();
                  }, 300);
                } catch (err) {
                }
              }}
              style={{
                background: 'rgba(23, 23, 23, 0.8)',
                backdropFilter: 'blur(10px)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.2)';
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              ⏭️ Skip Puzzle
            </button>
          </div>
        </div>
        )}

        {/* TIME & SCORE - Right Side */}
        <div style={styles.infoSection}>
          {/* PUZZLE NUMBER - Above Time Left (hidden for admin view) */}
          {!isAdminView && (
          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#06b6d4',
              marginBottom: '8px',
            }}>
              Puzzle {currentPuzzleIndex + 1}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: chess.turn() === 'w' ? '#ffffff' : '#9ca3af',
            }}>
              {chess.turn() === 'w' ? 'White' : 'Black'} to move
            </div>
          </div>
          )}

          <div style={styles.statsFlyer}>
            <div style={styles.timerTile}>
              <div style={styles.timer}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div style={styles.timerLabel}>Time Left</div>
            </div>
            {!isAdminView && (
            <div style={styles.scoreTile}>
              <div style={styles.score}>{score}</div>
              <div style={styles.scoreLabel}>Score</div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
