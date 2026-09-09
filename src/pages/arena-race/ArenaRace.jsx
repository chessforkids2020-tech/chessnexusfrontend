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
    background: 'var(--color-bg)',
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
    background: 'radial-gradient(circle at 20% 50%, var(--color-accent-2-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)',
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
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--color-white-a04)',
    borderRadius: 'var(--radius-2xl)',
    padding: '30px',
    boxShadow: '0 8px 32px var(--color-black-a50)',
    justifySelf: 'center',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  statsFlyer: {
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    borderRadius: 'var(--radius-2xl)',
    padding: '25px',
    border: '1px solid var(--color-white-a04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 8px 32px var(--color-black-a50)',
  },
  timerTile: {
    background: 'var(--color-surface)',
    backdropFilter: 'blur(5px)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 107, 107, 0.15)',
    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.2)',
    minWidth: '140px',
    width: '100%',
    maxWidth: '180px',
  },
  scoreTile: {
    background: 'var(--color-surface)',
    backdropFilter: 'blur(5px)',
    borderRadius: 'var(--radius-xl)',
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
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    borderRadius: 'var(--radius-2xl)',
    padding: '25px',
    border: '1px solid var(--color-white-a04)',
    boxShadow: '0 8px 32px var(--color-black-a50)',
    // No `flex: 1`: inside a stretched grid cell it made the card fill the
    // board's full height, leaving a tall empty panel under the rankings.
    alignSelf: 'start',
    width: '100%',
  },
  puzzleInfo: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(23, 23, 23, 0.5)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-white-a04)',
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
    color: 'var(--color-text)',
  },
  leaderboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--color-white-a04)',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  lbPager: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '12px',
  },
  lbPagerBtn: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-white-a04)',
    borderRadius: 'var(--radius-md)',
    width: '32px',
    height: '32px',
    fontSize: '18px',
    lineHeight: 1,
    cursor: 'pointer',
    flex: '0 0 auto',
  },
  lbPagerBtnDisabled: {
    opacity: 0.35,
    cursor: 'default',
  },
  lbPagerLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
  },
  lbJumpToMe: {
    display: 'block',
    width: '100%',
    marginTop: '8px',
    padding: '8px',
    background: 'var(--color-accent-a12)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent-a20)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  currentPlayer: {
    background: 'var(--color-accent-a12)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 15px',
    margin: '0 -10px',
    border: '1px solid var(--color-accent-a20)',
  },
  error: {
    color: 'var(--color-danger)',
    textAlign: 'center',
    padding: '20px',
    background: 'var(--color-danger-a12)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-danger-a20)',
    backdropFilter: 'blur(10px)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-2xl)',
    border: '1px solid var(--color-white-a04)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px var(--color-black-a50)',
  },
};

const adminStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, var(--color-accent-2) 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-2xl)',
    padding: '30px',
    boxShadow: '0 20px 40px var(--color-black-a20)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--color-surface)',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, var(--color-accent-2), #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
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
    color: 'var(--color-text-faint)',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee',
    color: 'var(--color-surface)',
  },
  score: {
    fontWeight: '700',
    color: 'var(--color-accent-2)',
  },
  correct: {
    color: 'var(--color-success)',
    fontWeight: '600',
  },
  wrong: {
    color: 'var(--color-danger)',
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
  // Leaderboard paging. `null` means "follow me": the page containing the
  // current user is shown and keeps following them as their rank moves during
  // the race. Once they press a page arrow this holds that page number, so a
  // live score update can't yank the view out from under them mid-read.
  const [lbPage, setLbPage] = useState(null);
  const updateBoardSizeRef = useRef(null);
  const gridResizeObserverRef = useRef(null);
  // Callback ref: fires with the node the instant the grid mounts (and with
  // null on unmount), so we measure the real element instead of guessing.
  const gridRefCb = useCallback((node) => {
    if (gridResizeObserverRef.current) {
      gridResizeObserverRef.current.disconnect();
      gridResizeObserverRef.current = null;
    }
    if (!node) return;
    updateBoardSizeRef.current?.();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateBoardSizeRef.current?.());
      ro.observe(node);
      gridResizeObserverRef.current = ro;
    }
  }, []);
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
      // The grid measurement below is authoritative; this is only the
      // first-paint fallback before the element exists.
      const sidebarWidth = viewportWidth < 1200 ? 0 : 300;
      const padding = 80; // total padding and margins
      const availableWidth = viewportWidth - sidebarWidth - padding;
      // 120px was reserved for the header plus the board card's padding. The
      // card is gone now, and the board no longer has controls stacked under it
      // (Skip moved to the right column), so only the page chrome needs
      // reserving. Reclaiming this is what actually makes the board bigger on a
      // short window, where HEIGHT — not the free width — is the binding limit.
      // The coordinate labels live OUTSIDE the board, so the column needs
      // board + bottom gutter to fit. Reserving only 12px let a 573px board
      // render 591px tall on a 585px window and pushed the file letters off
      // screen. ~34px covers the gutter (18px at these sizes) plus breathing
      // room, so the a-h row is always visible.
      const availableHeight = viewportHeight - 34;

      // Chessboard reserves space for the rank/file labels on the bottom+left.
      // ~5% of the board is a safe allowance at these sizes.
      const boardGutterAllowance = 45;

      // Determine device type and set appropriate size
      // Hoisted so the desktop branch and the diagnostic below can both see it.
      const gridEl = document.querySelector('[data-arena-grid]');
      const gridWidth = gridEl ? gridEl.getBoundingClientRect().width : availableWidth;

      let newSize;
      if (viewportWidth < 1024) {
        // Phones/tablets: EDGE TO EDGE, like HealthyMix.
        //
        // This used to be `viewportWidth - 60` capped at 450, so a 430px phone
        // got a 370px board and an iPad got 450 of its 768. The Chessboard
        // clamps DOWN to the viewport but never UP, so those small numbers won
        // and no page-level fix could widen them. Hand it the full width and
        // let its own mobile sizing (MOBILE_VW/MOBILE_VH) govern.
        newSize = viewportWidth;
      } else {
        // Desktop: fill the space actually available.
        //
        // This was hardcoded to 435px, which is SMALLER than the tablet branch
        // above (450) — so a 1440p monitor drew a smaller board than an iPad
        // while most of the column sat empty. Height is the real limit for a
        // square board, so take whichever of width/height runs out first and
        // cap only to keep it sane on very large displays.
        // The desktop layout is a `300px auto 300px` grid, so the board only
        // owns the middle track — subtract both side columns and the board's
        // coordinate gutters, or the grid overflows on 1280-1440px laptops.
        // The card padding and the Skip rail that used to be subtracted here
        // are both gone (Skip now sits under the Score card).
        // MEASURED, not assumed: the debug panel showed the grid is already
        // ~clientWidth (1234 of 1274) — it does NOT include the app sidebar, so
        // subtracting `sidebarWidth` here double-counted it and left a
        // centreTrack of 367 on a 1280px window. That fell under the old 435
        // floor, so the floor won and every width change was dead code.
        //
        // Measure the grid track we actually live in instead of guessing
        // (gridEl/gridWidth are computed above).
        // Budget the sides at their 190px MINIMUM. The track itself is now
        // sized from boardSize (see gridTemplateColumns), so this only decides
        // how much room the board may claim; the sides soak up whatever it
        // doesn't use. Using the minimum here — not the rendered width — keeps
        // this independent of the track it feeds, so the two can't chase each
        // other from frame to frame.
        const centreTrack = gridWidth - 380 - 48 - boardGutterAllowance;
        newSize = Math.max(300, Math.min(centreTrack, availableHeight));
      }

      // Ensure minimum size
      newSize = Math.max(250, newSize);
      setBoardSize(newSize);
    };

    // Published so the grid's callback ref can re-run this the moment the
    // element mounts. This effect runs while the page is still in its `loading`
    // early-return, so querySelector here ALWAYS returns null — which is why
    // the measurement silently fell back to the estimate.
    updateBoardSizeRef.current = updateBoardSize;
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => {
      window.removeEventListener('resize', updateBoardSize);
    };
  }, []);

  
  

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
      addLog(`Blocked — opponent turn (moveIndex ${moveIndex})`);
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
            <div style={{ fontSize: '20px', color: 'var(--color-accent-2)', fontWeight: '700' }}>Room: {roomId}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--color-surface-2)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Time Left</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: timeLeft < 60 ? 'var(--color-danger)' : 'var(--color-surface)' }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--color-surface-2)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Active Players</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-accent-2)' }}>{leaderboard.length}</div>
            </div>
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => fetchLeaderboard(true)}
                style={{
                  padding: '12px 20px',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
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
                  background: 'var(--color-danger)',
                  color: 'var(--color-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🏁 End Race
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid #eee', overflow: 'hidden' }}>
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
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: player.status === 'racing' ? '#e7f5ff' : 'var(--color-surface)',
                        color: player.status === 'racing' ? '#228be6' : 'var(--color-text-faint)'
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

  // ---- Leaderboard paging ------------------------------------------------
  const LB_PAGE_SIZE = 20;
  const lbTotalPages = Math.max(1, Math.ceil(leaderboard.length / LB_PAGE_SIZE));
  // Where the current user sits right now. -1 when they're not on the board yet.
  const myIndex = user
    ? leaderboard.findIndex(p => p.username === user.username)
    : -1;
  const myPage = myIndex >= 0 ? Math.floor(myIndex / LB_PAGE_SIZE) : 0;
  // Browsing a page pins it; otherwise track the user's own rank. Clamped so a
  // shrinking leaderboard can never strand us past the last page.
  const lbCurrentPage = Math.min(lbPage ?? myPage, lbTotalPages - 1);
  const lbStart = lbCurrentPage * LB_PAGE_SIZE;
  const lbSlice = leaderboard.slice(lbStart, lbStart + LB_PAGE_SIZE);

  return (
    <div style={{
      ...styles.page,
      // The 20px page padding is another inset the full-bleed board has to
      // clear on mobile; `overflow: hidden` would also clip it. `overflow-x`
      // alone still guards against sideways scroll.
      ...(isMobileLayout ? { padding: '10px 0', overflow: 'visible', overflowX: 'hidden' } : null),
    }}>
      <div style={styles.background}></div>
      
      <div ref={gridRefCb} data-arena-grid="" style={{
        ...styles.container,
        // The board is capped by the window HEIGHT, not by this row's width, so
        // once it stops growing any width left over just becomes dead space
        // between the board and the side cards. Sizing the middle track to the
        // board's real width and giving the sides `1fr` hands that slack to the
        // cards instead of leaving it as a gap. They still shrink first (down to
        // 190px) on a narrow window so the board keeps its room.
        gridTemplateColumns: (isMobileLayout
          ? '1fr'
          : `minmax(190px, 1fr) ${boardSize + 24}px minmax(190px, 1fr)`),
        gap: isMobileLayout ? '20px' : '24px',
        padding: isMobileLayout ? '10px' : '0',
        // Grid items stretch to the row height by default, which is why the
        // leaderboard card grew tall and empty as the board got bigger. Size
        // each column to its own content and top-align them; the board centres
        // itself in the middle track.
        alignItems: isMobileLayout ? 'stretch' : 'start',
        // The 1400px cap meant a 1920/1440p monitor left the extra room unused.
        maxWidth: isMobileLayout ? undefined : '1800px',
      }}>
        {/* LEADERBOARD - Left Side (drops BELOW the board on mobile) */}
        <div style={{
          ...styles.leaderboardSection,
          // The board is the point of the page; a tall leaderboard above it
          // pushed it off the first screen on phones.
          ...(isMobileLayout ? { order: 4 } : null),
        }}>
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardTitle}>🏆 Leaderboard</div>
            {lbSlice.map((player, index) => (
              <div key={player.username || index} style={{
                ...styles.leaderboardItem,
                ...(user && player.username === user.username ? styles.currentPlayer : {})
              }}>
                {/* Rank is the position in the FULL list, not on this page. */}
                <span>#{lbStart + index + 1} <PlayerName displayName={player.displayName} username={player.username} /></span>
                <span>{player.score}</span>
              </div>
            ))}

            {lbTotalPages > 1 && (
              <div style={styles.lbPager}>
                <button
                  type="button"
                  onClick={() => setLbPage(Math.max(0, lbCurrentPage - 1))}
                  disabled={lbCurrentPage === 0}
                  style={{
                    ...styles.lbPagerBtn,
                    ...(lbCurrentPage === 0 ? styles.lbPagerBtnDisabled : null),
                  }}
                  aria-label="Previous page"
                >‹</button>

                <span style={styles.lbPagerLabel}>
                  {lbStart + 1}-{Math.min(lbStart + LB_PAGE_SIZE, leaderboard.length)} of {leaderboard.length}
                </span>

                <button
                  type="button"
                  onClick={() => setLbPage(Math.min(lbTotalPages - 1, lbCurrentPage + 1))}
                  disabled={lbCurrentPage >= lbTotalPages - 1}
                  style={{
                    ...styles.lbPagerBtn,
                    ...(lbCurrentPage >= lbTotalPages - 1 ? styles.lbPagerBtnDisabled : null),
                  }}
                  aria-label="Next page"
                >›</button>
              </div>
            )}

            {/* Only offered once they've actually navigated away from their own
                page — otherwise the view is already following them. */}
            {lbPage !== null && myIndex >= 0 && lbCurrentPage !== myPage && (
              <button
                type="button"
                onClick={() => setLbPage(null)}
                style={styles.lbJumpToMe}
              >
                Jump to my rank (#{myIndex + 1})
              </button>
            )}
          </div>
        </div>

        {/* WHOSE MOVE — mobile only, sits directly ABOVE the board. */}
        {!isAdminView && isMobileLayout && (
          <div style={{
            order: 1,
            textAlign: 'center',
            fontSize: '17px',
            fontWeight: 700,
            padding: '10px 0 2px',
            color: chess.turn() === 'w' ? 'var(--color-text)' : 'var(--color-text-muted)',
          }}>
            {chess.turn() === 'w' ? 'White' : 'Black'} to move
          </div>
        )}

        {/* CHESSBOARD - Center (hidden for admin view) */}
        {!isAdminView && (
        <div style={{
          // NO card on any screen — no surface, border, shadow or padding — so
          // the board itself is the widest thing in the column. On mobile the
          // card's 20px padding plus its border was the last inset keeping the
          // board off the screen edges.
          padding: 0,
          marginBottom: isMobileLayout ? '16px' : '0',
          ...(isMobileLayout ? {
            order: 2,
            // Break out of the grid container's 10px side padding so the board
            // reaches the true screen edges, the way HealthyMix does.
            width: '100dvw',
            marginLeft: 'calc(50% - 50dvw)',
            display: 'flex',
            justifyContent: 'center',
          } : {
            // Fill the middle track so the board sits centred BETWEEN the two
            // side cards, instead of hugging the left edge of the track.
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }),
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
              // Nothing is stacked under this board any more (no card, and Skip
              // moved to the right column), so it can use nearly the whole
              // window height. On a wide 1919x700 window that height — not the
              // ~1400px of free width — is what caps a square board.
              desktopHeightRatio={0.99}
              draggable={true}
            />
            {/* Resize Handle */}
          </div>


        </div>
        )}

        {/* TIME & SCORE - Right Side (sits between board and leaderboard on mobile) */}
        <div style={{
          ...styles.infoSection,
          // Mobile order inside this column: Skip first, then Time + Score.
          ...(isMobileLayout ? { order: 3, gap: '12px' } : null),
        }}>
          {/* PUZZLE NUMBER — desktop only. On mobile the number is dropped and
              the "X to move" line is rendered above the board instead. */}
          {!isAdminView && !isMobileLayout && (
          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-accent-a20)',
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--color-accent)',
              marginBottom: '8px',
            }}>
              Puzzle {currentPuzzleIndex + 1}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: chess.turn() === 'w' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}>
              {chess.turn() === 'w' ? 'White' : 'Black'} to move
            </div>
          </div>
          )}

          {/* Time + Score sit SIDE BY SIDE on mobile, stacked on desktop.
              order 2 puts them BELOW the Skip button on mobile. */}
          <div style={{
            ...styles.statsFlyer,
            ...(isMobileLayout ? { display: 'flex', flexDirection: 'row', gap: '10px', order: 2, padding: '14px' } : null),
          }}>
            <div style={{
              ...styles.timerTile,
              ...(isMobileLayout ? { flex: '1 1 0', minWidth: 0, padding: '14px 10px' } : null),
            }}>
              <div style={styles.timer}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div style={styles.timerLabel}>Time Left</div>
            </div>
            {!isAdminView && (
            <div style={{
              ...styles.scoreTile,
              ...(isMobileLayout ? { flex: '1 1 0', minWidth: 0, padding: '14px 10px' } : null),
            }}>
              <div style={styles.score}>{score}</div>
              <div style={styles.scoreLabel}>Score</div>
            </div>
            )}
          </div>

          {/* SKIP PUZZLE — under the Score card on desktop; on mobile order 1
              puts it directly below the board, above Time + Score. */}
          {!isAdminView && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 0,
            ...(isMobileLayout ? { order: 1 } : null),
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
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger-a30)',
                padding: '12px 24px',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: '100%',
                lineHeight: 1.3,
                boxShadow: '0 4px 16px var(--color-danger-a20)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px var(--color-danger-a30)';
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px var(--color-danger-a20)';
                e.target.style.borderColor = 'var(--color-danger-a30)';
              }}
            >
              ⏭️ Skip Puzzle
            </button>
          </div>
          )}
        </div>
      </div>

    </div>
  );
}
