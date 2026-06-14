import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Chess } from 'chess.js';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
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

export default function ArenaRace() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [raceData, setRaceData] = useState(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [chess, setChess] = useState(new Chess());
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0); // Track position in current puzzle's solution
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boardSize, setBoardSize] = useState(600);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [nextPuzzlePrefetched, setNextPuzzlePrefetched] = useState(null);
  // Mirror ref for nextPuzzlePrefetched — refs are never stale inside socket closures.
  // The socket handler useEffect captures functions once on mount; any state read
  // inside those closures is frozen at mount time.  Using a ref ensures that
  // fetchCurrentPuzzle() always sees the latest prefetch data regardless of when it runs.
  const nextPuzzlePrefetchedRef = useRef(null);
  const lastLeaderboardUpdate = useRef(0);
  const pendingMoveRequest = useRef(false);
  const userIdRef = useRef(null);
  // Ref that always holds the latest currentPuzzleIndex value.
  // Refs are NOT captured by stale closures — the socket handler registered once
  // in useEffect([roomId,user,authLoading]) would otherwise see a frozen
  // currentPuzzleIndex=0 forever, causing it to misidentify every response as a
  // puzzle change and trigger a spurious fetchCurrentPuzzle() that flashes the board.
  const currentPuzzleIndexRef = useRef(0);
  // Keep ref in sync every render (runs synchronously before any effects fire)
  currentPuzzleIndexRef.current = currentPuzzleIndex;

  
  // Manual resize refs
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  
  // Performance monitoring state
  const [perfMetrics, setPerfMetrics] = useState({
    lastMoveRequestTime: 0,
    lastMoveResponseTime: 0,
    lastMoveValidationTime: 0,
    lastBotMoveTime: 0,
    lastOptimisticUpdateTime: 0,
    lastPuzzleFetchTime: 0,
    lastLeaderboardFetchTime: 0,
    lastRaceDataFetchTime: 0,
    socketLatencies: [],
    moveHistory: [],
    avgResponseTime: 0,
    avgValidationTime: 0,
    totalMoves: 0
  });
  const [showPerfDebug, setShowPerfDebug] = useState(false);
  const perfTimers = useRef({});

  // Deduplicate a leaderboard array — keep the LAST entry for each username
  // (last entry wins so progressUpdate patches always win over stale data)
  const dedupeLeaderboard = (arr) => {
    const map = new Map();
    arr.forEach(p => map.set(p.username, p));
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  };

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
      const receiveTime = performance.now();
      addLog(`Progress update: ${JSON.stringify(data)}`);
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'progressUpdate', time: receiveTime, data: data.username }]
      }));
      setLeaderboard(prev => {
        const updated = prev.filter(p => p.username !== data.username);
        updated.push({
          username: data.username,
          displayName: data.displayName || data.username,
          score: data.score,
          currentPuzzleIndex: data.currentPuzzleIndex,
          status: data.status
        });
        return dedupeLeaderboard(updated);
      });
    });

    socket.on('arenaTimeUpdate', (data) => {
      const receiveTime = performance.now();
      addLog(`Time update: ${data.timeRemaining}s`);
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'arenaTimeUpdate', time: receiveTime, remaining: data.timeRemaining }]
      }));
      setTimeLeft(data.timeRemaining);
    });

    // Listen for race end
    socket.on('raceEnded', () => {
      const receiveTime = performance.now();
      addLog('Race ended event received');
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'raceEnded', time: receiveTime }]
      }));
      navigate(`/arena/result/${roomId}`);
    });

    socket.on('raceCompleted', () => {
      const receiveTime = performance.now();
      addLog('Race completed event received');
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'raceCompleted', time: receiveTime }]
      }));
      navigate(`/arena/result/${roomId}`);
    });

    socket.on('raceStarted', (data) => {
      const receiveTime = performance.now();
      addLog(`Race started: ${JSON.stringify(data)}`);
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'raceStarted', time: receiveTime }]
      }));
      // Race started, load first puzzle and set timer
      setTimeLeft(data.timeLimit * 60); // Convert to seconds
      setMoveIndex(1); // FIXED: Bot will have played move 0, user starts at move 1
      fetchCurrentPuzzle();
      // REMOVED: fetchLeaderboard(); - socket handles leaderboard updates
    });

    // Listen for new players joining the room
    socket.on('playerJoined', (data) => {
      const receiveTime = performance.now();
      addLog(`Player joined: ${data.username}`);
      setPerfMetrics(prev => ({
        ...prev,
        socketLatencies: [...prev.socketLatencies.slice(-9), { event: 'playerJoined', time: receiveTime, player: data.username }]
      }));
      
      // Add new player to leaderboard with initial score of 0
      setLeaderboard(prev => {
        const existing = prev.find(p => p.username === data.username);
        if (existing) return prev; // Player already in leaderboard
        
        const newPlayer = {
          username: data.username,
          displayName: data.displayName || data.username,
          score: 0,
          currentPuzzleIndex: 0,
          status: 'waiting'
        };
        
        return [...prev, newPlayer].sort((a, b) => b.score - a.score);
      });
    });

    // Socket-based leaderboard updates (no polling needed)
    socket.on('leaderboardUpdate', (data) => {
      const receiveTime = performance.now();
      addLog(`Leaderboard update via socket: ${data.leaderboard.length} players`);
      // Deduplicate before storing — server may broadcast duplicate entries for the
      // same user, causing the same name to appear many times and the list to grow unbounded.
      setLeaderboard(dedupeLeaderboard(data.leaderboard || []));
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
        nextPuzzlePrefetchedRef.current = data.puzzle;
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
        // Set remaining time immediately so late joiners see correct timer (not 0)
        if (response.data.timeRemainingSec != null) {
          setTimeLeft(response.data.timeRemainingSec);
        }
        fetchCurrentPuzzle();
        // REMOVED: fetchLeaderboard(); - socket handles leaderboard updates
      } else if (response.data.status === 'completed') {
        // Race has ended, redirect to results
        addLog('Race completed, redirecting to results');
        navigate(`/arena/result/${roomId}`);
        return;
      } else if (response.data.status === 'waiting') {
        // Race hasn't started yet, redirect to waiting room
        addLog('Race waiting, redirecting to waiting room');
        navigate(`/arena/waiting/${roomId}`);
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
        navigate(`/arena/result/${roomId}`);
        return;
      } catch (resultErr) {
        setError('Failed to load race data');
        setLoading(false);
      }
    }
  };

  const fetchCurrentPuzzle = async () => {
    const startTime = performance.now();
    
    // Check if we have prefetched puzzle.
    // IMPORTANT: read from the ref, not state — state reads inside socket-registered
    // closures are frozen at mount time (stale closure), refs always return fresh values.
    const _prefetch = nextPuzzlePrefetchedRef.current;
    if (_prefetch && _prefetch.currentPuzzleIndex !== undefined) {
      addLog(`Using prefetched puzzle ${_prefetch.currentPuzzleIndex} - ZERO LATENCY`);
      const puzzle = _prefetch.puzzle || _prefetch;
      const currentPuzzleIndex = _prefetch.currentPuzzleIndex;
      const currentMoveIndex = _prefetch.currentMoveIndex || 1;
      const score = _prefetch.score || 0;
      
      setCurrentPuzzle(puzzle);
      setCurrentPuzzleIndex(currentPuzzleIndex);
      setScore(score);
      nextPuzzlePrefetchedRef.current = null; // Clear used prefetch (ref)
      setNextPuzzlePrefetched(null); // Clear used prefetch (state)
      
      // Setup board state
      const solutionMoves = Array.isArray(puzzle.solution) 
        ? puzzle.solution 
        : (typeof puzzle.solution === 'string'
          ? puzzle.solution.split(/[, ]+/).filter(Boolean)
          : []);
      
      const newChess = new Chess(puzzle.fen);

      // Check if the game is already over (checkmate, stalemate, etc.)
      if (newChess.isGameOver()) {
        // Submit as incorrect and request next puzzle
        try {
          await api.post(`/api/arena/submit/${roomId}`, {
            move: null,
            timeSpent: 0,
            skipInvalid: true
          });
          // Fetch next puzzle after a short delay
          setTimeout(() => {
            fetchCurrentPuzzle();
          }, 100);
        } catch (skipErr) {
          setError('Invalid puzzle position - please refresh');
        }
        return;
      }
      for (let i = 0; i < currentMoveIndex; i++) {
        if (i < solutionMoves.length) {
          const move = solutionMoves[i];
          if (move) {
            let moveObj = newChess.move(move, { sloppy: true });
            if (!moveObj && move.length === 4) {
              moveObj = newChess.move({ from: move.slice(0,2), to: move.slice(2,4), promotion: 'q' });
            }
          }
        }
      }
      setChess(newChess);
      setMoveIndex(currentMoveIndex);
      setLoading(false);
      return;
    }
    
    // Fallback: fetch from API
    try {
      addLog(`Fetching current puzzle for room ${roomId}`);
      const response = await api.get(`/api/arena/puzzle/${roomId}`);
      const endTime = performance.now();
      const duration = endTime - startTime;
      const { puzzle, currentPuzzleIndex, currentMoveIndex, score } = response.data;
      addLog(`Puzzle ${currentPuzzleIndex}, moveIndex ${currentMoveIndex}, score ${score} (${duration.toFixed(2)}ms)`);
      setCurrentPuzzle(puzzle);
      setCurrentPuzzleIndex(currentPuzzleIndex);
      setScore(score);
      
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
        // Submit as incorrect and request next puzzle
        try {
          await api.post(`/api/arena/submit/${roomId}`, {
            move: null,
            timeSpent: 0,
            skipInvalid: true
          });
          // Fetch next puzzle after a short delay
          setTimeout(() => {
            fetchCurrentPuzzle();
          }, 100);
        } catch (skipErr) {
          setError('Invalid puzzle position - please refresh');
        }
        return;
      }
      
      // Replay all moves up to current position (including bot's first move at index 0).
      // NOTE: currentMoveIndex=1 means bot played move[0] and user should play move[1],
      // so we apply moves[0..currentMoveIndex-1] = moves[0] (1 iteration, correct).
      for (let i = 0; i < currentMoveIndex; i++) {
        if (i < solutionMoves.length) {
          const move = solutionMoves[i];
          if (move) {
            let moveObj = newChess.move(move, { sloppy: true });
            if (!moveObj && move.length === 4) {
              // Try UCI
              moveObj = newChess.move({ from: move.slice(0,2), to: move.slice(2,4), promotion: 'q' });
            }
            if (moveObj) {
              addLog(`Replayed move ${i}: ${move}`);
            } else {
              addLog(`Failed to replay move ${i}: ${move}`, 'error');
            }
          }
        }
      }
      
      addLog(`Final FEN after replay: ${newChess.fen()}`);
      setChess(newChess);
      setMoveIndex(currentMoveIndex);
      
      setLoading(false);
    } catch (err) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      addLog(`Fetch puzzle error: ${err.message} (${duration.toFixed(2)}ms)`, 'error');
      setError('Failed to load puzzle');
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

  const handleMove = async (sourceSquare, targetSquare, promotion) => {
    const moveStartTime = performance.now();
    addLog(`Attempting move from ${sourceSquare} to ${targetSquare}${promotion ? ' with promotion: ' + promotion : ''}`);
    
    // Get userId (use ref as fallback if context is lost)
    const userId = (user?.id || user?._id) || userIdRef.current;
    if (!userId) {
      setError('Authentication lost. Please refresh the page.');
      return false;
    }
    
    // Bot always starts first, so even indices are bot turns, odd are user turns
    if (moveIndex % 2 === 0) {
      addLog(`Invalid move order - bot turn (index ${moveIndex})`, 'error');
      setError("Not your turn - bot moves first!");
      setTimeout(() => setError(''), 2000);
      return false;
    }
    
    // Create a temporary chess instance to validate and get the move
    const validationStartTime = performance.now();
    const tempChess = new Chess(chess.fen());
    const moves = tempChess.moves({ verbose: true });
    const move = moves.find(m => m.from === sourceSquare && m.to === targetSquare && (!promotion || m.promotion === promotion));
    const validationTime = performance.now() - validationStartTime;
    
    if (!move) {
      addLog('Move not valid', 'error');
      return false;
    }
    
    // Server now handles all move validation and bot moves
    // Just send the move and let server update board state
    const uci = sourceSquare + targetSquare + (promotion || '');
    addLog(`Sending move: ${uci}`);
    
    // Prevent duplicate requests
    if (pendingMoveRequest.current) {
      addLog('Move request already pending, skipping duplicate');
      return true;
    }
    pendingMoveRequest.current = true;
    
    // Send move via socket for instant feedback (no HTTP overhead)
    if (socket && socket.connected) {
      socket.emit('submitArenaMove', {
        roomId,
        move: uci,
        userId: userId
      });
      addLog(`Move sent via socket: ${uci} - ZERO HTTP OVERHEAD`);
    } else {
      // Fallback to HTTP if socket disconnected
      const requestStartTime = performance.now();
      api.post(`/api/arena/progress/${roomId}`, {
        move: uci
      })
        .then(response => {
          addLog(`Move response (HTTP fallback): ${JSON.stringify(response.data)}`);
          handleMoveResponse(response.data);
        })
        .catch(err => {
          pendingMoveRequest.current = false;
          addLog(`Move error: ${err.message}`, 'error');
          setError('Network error - please try again');
          setTimeout(() => setError(''), 2000);
        });
    }
    
    return true;
  };

  const handleMoveResponse = (data) => {
    pendingMoveRequest.current = false;
    addLog(`Processing move response: ${JSON.stringify(data)}`);
    
    // Update score from server response
    if (data.score !== undefined) {
      setScore(data.score);
    }
    
    // Check if puzzle changed first (before updating board state)
    if (data.currentPuzzleIndex !== undefined) {
      const newPuzzleIndex = data.currentPuzzleIndex;
      if (newPuzzleIndex !== currentPuzzleIndexRef.current) {
        // Puzzle changed! Don't update board state yet, let fetchCurrentPuzzle handle it
        setCurrentPuzzleIndex(newPuzzleIndex);
        
        // Server can send puzzle data directly to avoid fetch
        if (data.puzzle) {
          addLog('Puzzle data received in move response - ZERO LATENCY LOAD');
          const prefetchPayload = {
            puzzle: data.puzzle,
            currentPuzzleIndex: newPuzzleIndex,
            currentMoveIndex: data.currentMoveIndex || 1,
            score: data.score || score
          };
          // Update BOTH ref (readable by stale closures) and state (for re-renders)
          nextPuzzlePrefetchedRef.current = prefetchPayload;
          setNextPuzzlePrefetched(prefetchPayload);
        }
        
        // Add delay to prevent race condition with board state
        setTimeout(() => {
          fetchCurrentPuzzle();
        }, 50);
        return; // Don't update board state when puzzle changes
      } else {
        // Same puzzle, request prefetch of next one
        if (socket && socket.connected) {
          socket.emit('prefetchNextPuzzle', { roomId, userId: user?._id });
        }
      }
    }
    
    // Update move index from server response (increment after user move)
    if (data.currentMoveIndex !== undefined) {
      setMoveIndex(data.currentMoveIndex);
      addLog(`Updated moveIndex to ${data.currentMoveIndex}`);
    }
    
    // Update chess board position from server (only for same puzzle)
    if (data.currentFen) {
      addLog(`Updating board position from server: ${data.currentFen}`);
      const serverChess = new Chess(data.currentFen);
      setChess(serverChess);
      
      // Check if the game is now over (checkmate, stalemate, etc.)
      if (serverChess.isGameOver()) {
        addLog('Game over detected after move - automatically moving to next puzzle');
        // Automatically submit and move to next puzzle
        setTimeout(async () => {
          try {
            await api.post(`/api/arena/submit/${roomId}`, {
              move: null,
              timeSpent: 0,
              autoAdvance: true // Flag to indicate automatic advancement due to game over
            });
            // Fetch next puzzle after submission
            setTimeout(() => {
              fetchCurrentPuzzle();
            }, 200);
          } catch (err) {
            // Fallback: just fetch next puzzle
            setTimeout(() => {
              fetchCurrentPuzzle();
            }, 500);
          }
        }, 1000); // Small delay to let user see the final position
      }
    }
    
    if (data.status === 'finished') {
      addLog('Race finished');
      navigate(`/arena/result/${roomId}`);
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

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      
      {/* Debug indicator - remove after confirming fix */}
      {/* Performance Debug Window */}
      {showPerfDebug && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          width: '400px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'rgba(23, 23, 23, 0.95)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          zIndex: 10000,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: '12px',
          color: '#d1d5db',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '16px' }}>⚡ Performance Monitor</h3>
            <button onClick={() => setShowPerfDebug(false)} style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
            }}>✕</button>
          </div>
          
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>🎯 Current Move Stats</div>
            <div>Validation: <span style={{ color: '#fff' }}>{perfMetrics.lastMoveValidationTime.toFixed(2)}ms</span></div>
            <div>Optimistic Update: <span style={{ color: '#fff' }}>{perfMetrics.lastOptimisticUpdateTime.toFixed(2)}ms</span></div>
            <div>Bot Move Process: <span style={{ color: '#fff' }}>{perfMetrics.lastBotMoveTime.toFixed(2)}ms</span></div>
            <div>API Response: <span style={{ color: '#fff' }}>{perfMetrics.lastMoveResponseTime.toFixed(2)}ms</span></div>
          </div>
          
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>📊 Averages ({perfMetrics.totalMoves} moves)</div>
            <div>Avg Validation: <span style={{ color: '#fff' }}>{perfMetrics.avgValidationTime.toFixed(2)}ms</span></div>
            <div>Avg Response: <span style={{ color: '#fff' }}>{perfMetrics.avgResponseTime.toFixed(2)}ms</span></div>
          </div>
          
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>🌐 API Fetch Times</div>
            <div>Race Data: <span style={{ color: '#fff' }}>{perfMetrics.lastRaceDataFetchTime.toFixed(2)}ms</span></div>
            <div>Puzzle Fetch: <span style={{ color: '#fff' }}>{perfMetrics.lastPuzzleFetchTime.toFixed(2)}ms</span></div>
            <div>Leaderboard: <span style={{ color: '#fff' }}>{perfMetrics.lastLeaderboardFetchTime.toFixed(2)}ms</span></div>
          </div>
          
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>� Device & Board Info</div>
            <div>Chessboard Size: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{boardSize}px</span></div>
            <div>Screen Size: <span style={{ color: '#fff' }}>{window.innerWidth} x {window.innerHeight}px</span></div>
            <div>Layout: <span style={{ color: '#fff' }}>{isMobileLayout ? 'Mobile/Stacked' : 'Desktop/Side-by-side'}</span></div>
          </div>
          
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>�📡 Recent Socket Events</div>
            {perfMetrics.socketLatencies.slice(-5).reverse().map((evt, idx) => (
              <div key={idx} style={{ fontSize: '11px', opacity: 1 - (idx * 0.15) }}>
                {evt.event}: {new Date(evt.time).toLocaleTimeString()}
                {evt.data && ` (${evt.data})`}
                {evt.remaining !== undefined && ` (${evt.remaining}s)`}
              </div>
            ))}
          </div>
          
          <div>
            <div style={{ background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', marginBottom: '5px' }}>📈 Move History (last 10)</div>
            {perfMetrics.moveHistory.slice(-10).reverse().map((move, idx) => (
              <div key={idx} style={{ fontSize: '11px', opacity: 1 - (idx * 0.08), marginBottom: '4px' }}>
                Move {perfMetrics.totalMoves - idx}: {move.time.toFixed(0)}ms total
                <div style={{ paddingLeft: '12px', fontSize: '10px', color: '#9ca3af' }}>
                  V:{move.validationTime.toFixed(1)} O:{move.optimisticUpdateTime.toFixed(1)} B:{move.botMoveTime.toFixed(1)} R:{move.responseTime.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Toggle button for debug window */}
      <button
        onClick={() => setShowPerfDebug(!showPerfDebug)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(23, 23, 23, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '12px',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#06b6d4',
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.4)'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(6, 182, 212, 0.3)'; }}
      >
        ⚡
      </button>
      
      <div style={{
        ...styles.container,
        gridTemplateColumns: isMobileLayout ? '1fr' : '300px auto 300px',
        gap: isMobileLayout ? '20px' : '30px',
        padding: isMobileLayout ? '10px' : '0',
      }}>
        {/* LEADERBOARD - Left Side */}
        <div style={styles.leaderboardSection}>
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardTitle}>🏆 Leaderboard</div>
            {leaderboard.map((player, index) => (
              <div key={`${player.username}-${index}`} style={{
                ...styles.leaderboardItem,
                ...(user && player.username === user.username ? styles.currentPlayer : {})
              }}>
                <span>#{index + 1} {player.displayName || player.username || 'Unknown'}</span>
                <span>{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHESSBOARD - Center */}
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
              position={chess.fen()}
              onDrop={handleMove}
              orientation={(chess.fen().split(' ')[1] === 'b') ? 'black' : 'white'}
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
                  await api.post(`/api/arena/submit/${roomId}`, {
                    move: null,
                    timeSpent: 0,
                    skipPuzzle: true
                  });
                  // Fetch next puzzle after submission
                  setTimeout(() => {
                    fetchCurrentPuzzle();
                  }, 500);
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

        {/* TIME & SCORE - Right Side */}
        <div style={styles.infoSection}>
          {/* PUZZLE NUMBER - Above Time Left */}
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

          <div style={styles.statsFlyer}>
            <div style={styles.timerTile}>
              <div style={styles.timer}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div style={styles.timerLabel}>Time Left</div>
            </div>
            <div style={styles.scoreTile}>
              <div style={styles.score}>{score}</div>
              <div style={styles.scoreLabel}>Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
