import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import io from 'socket.io-client';
import api from '../../api';
import './TeamRacePuzzle.css';

// Module-level cache to persist across component remounts
const raceCache = {
  initialized: {},  // Track initialized races by raceId
  sockets: {},      // Store active socket connections
  data: {}          // Store race data
};

function TeamRacePuzzle() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultId, setResultId] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const puzzlesRef = useRef([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess());
  const gameRef = useRef(new Chess());
  const [userMoves, setUserMoves] = useState([]);
  const [puzzleStartTime, setPuzzleStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pointsPerPuzzle, setPointsPerPuzzle] = useState(10);
  const [teamName, setTeamName] = useState('');
  const [position, setPosition] = useState(0);
  const [socket, setSocket] = useState(null);
  const timerRef = useRef(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const socketTimeoutRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const offsetRef = useRef(0); // serverTime - clientTime offset in ms
  const resultIdRef = useRef(null);
  const [raceStartTime, setRaceStartTime] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [lastMove, setLastMove] = useState(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [playerLeaderboard, setPlayerLeaderboard] = useState([]);
  const [myUserId, setMyUserId] = useState('');
  const [playerLbPage, setPlayerLbPage] = useState(0);
  const [boardWidth, setBoardWidth] = useState(450);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(400);

  // Calculate responsive board width
  const calculateResponsiveBoardWidth = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Account for sidebar and padding (approximately 620px for sidebars + padding)
    const availableWidth = screenWidth - (screenWidth >= 1024 ? 620 : 0);
    
    // For mobile/small screens (< 768px)
    if (screenWidth < 768) {
      // Use 95% of available width, but cap between 280px and 400px
      return Math.min(Math.max(availableWidth * 0.95, 280), 400);
    }
    
    // For tablets (768px - 1024px)
    if (screenWidth < 1024) {
      // Use 75% of available width, cap at 550px
      return Math.min(availableWidth * 0.75, 550);
    }
    
    // For desktop/laptops (> 1024px)
    // Use 70% of available width, cap at 750px
    return Math.min(availableWidth * 0.7, 750);
  };

  // Set initial responsive board width
  useEffect(() => {
    const initialWidth = calculateResponsiveBoardWidth();
    setBoardWidth(initialWidth);
  }, []);

  // Handle window resize for responsive board sizing
  useEffect(() => {
    const handleResize = () => {
      // Only auto-resize if not currently manually resizing
      if (!resizingRef.current) {
        const newWidth = calculateResponsiveBoardWidth();
        setBoardWidth(newWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // CRITICAL: Use module-level cache to prevent infinite loop across remounts
    if (raceCache.initialized[raceId]) {
      // Restore cached data if available
      if (raceCache.data[raceId]) {
        const cached = raceCache.data[raceId];
        if (cached.puzzles) {
          setPuzzles(cached.puzzles);
          puzzlesRef.current = cached.puzzles;
        }
        if (cached.resultId) {
          setResultId(cached.resultId);
          resultIdRef.current = cached.resultId;
        }
        if (cached.duration) setDuration(cached.duration);
        if (cached.timeLeft) setTimeLeft(cached.timeLeft);
        if (cached.teamName) setTeamName(cached.teamName);
        if (cached.position) setPosition(cached.position);
        if (cached.pointsPerPuzzle) setPointsPerPuzzle(cached.pointsPerPuzzle);
        if (cached.game) {
          setGame(cached.game);
          gameRef.current = cached.game;
        }
        setLoading(false);
        startedRef.current = true;
      }
      // Reuse existing socket if available
      if (raceCache.sockets[raceId] && raceCache.sockets[raceId].connected) {
        setSocket(raceCache.sockets[raceId]);
      }
      return;
    }
    
    // Mark as initialized immediately to prevent loops
    raceCache.initialized[raceId] = true;
    socketInitializedRef.current = true;
    
    const API = import.meta.env.VITE_API_URL || window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const newSocket = io(API, { auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(newSocket);
    raceCache.sockets[raceId] = newSocket;

    // Wait for socket to connect before starting race
    newSocket.on('connect', () => {
      startRace(newSocket);
      
      // Request initial leaderboard
      fetchLeaderboard();

      // Request server time sync for accurate countdown
      newSocket.emit('requestTimeSync', { raceId });
    });

    // Time sync info from server (sent when joining the room or on demand)
    newSocket.on('teamRaceTime', (data) => {
      if (data && data.serverTime) {
        offsetRef.current = data.serverTime - Date.now();
      }
      if (data && data.startTime) {
        setRaceStartTime(data.startTime);
      }
      if (data && data.duration) {
        setDuration(data.duration);
      }
    });

    newSocket.on('error', (error) => {
    });

    newSocket.on('connect_error', (error) => {
    });

    // Fallback: Start race after 3 seconds even if socket doesn't connect
    socketTimeoutRef.current = setTimeout(() => {
      if (!startedRef.current) {
        startRace(null);
      }
    }, 3000);

    // Race finished event
    newSocket.on('teamRaceFinished', (data) => {
      if (data.raceId === raceId) {
        handleFinish();
      } else {
      }
    });

    // Optimized: Socket-based puzzle submission response (no HTTP roundtrip)
    newSocket.on('puzzleSubmitted', (data) => {
      if (data.success) {
        setScore(data.currentScore);
      }
    });

    newSocket.on('puzzleSubmitError', (data) => {
    });

    // Optimized: Receive real-time score updates from other players
    newSocket.on('teamScoreUpdate', (data) => {
    });

    // Listen for live leaderboard updates
    newSocket.on('teamLeaderboardUpdate', (data) => {
      if (data.raceId === raceId) {
        setLiveLeaderboard(data.leaderboard || []);
        setPlayerLeaderboard(data.playerLeaderboard || []);
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current);
    };
  }, [raceId]);

  // Periodic leaderboard refresh every 5 seconds as fallback
  useEffect(() => {
    const leaderboardInterval = setInterval(() => {
      if (!loading && timeLeft > 0) {
        fetchLeaderboard();
      }
    }, 5000);

    return () => clearInterval(leaderboardInterval);
  }, [raceId, loading, timeLeft]);

  // When tab visibility changes, force a time sync tick so UI is correct immediately
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (raceStartTime && duration) {
          const now = Date.now() + (offsetRef.current || 0);
          const startMs = new Date(raceStartTime).getTime();
          const elapsed = Math.floor((now - startMs) / 1000);
          const remaining = Math.max(0, (duration || 0) - elapsed);
          setTimeLeft(remaining);
        }
        // also request time sync from server to recalibrate offset
        if (socket && socket.connected) {
          socket.emit('requestTimeSync', { raceId });
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [raceStartTime, duration, socket, raceId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/api/team-race/${raceId}/leaderboard`);
      setLiveLeaderboard(res.data.leaderboard || []);
      setPlayerLeaderboard(res.data.playerLeaderboard || []);
    } catch (err) {
    }
  };

  // Resize handlers
  const handleManualResizeStart = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = boardWidth;
    
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
    setBoardWidth(newWidth);
  };
  
  const handleManualResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleManualResizeMove);
    document.removeEventListener('mouseup', handleManualResizeEnd);
    document.removeEventListener('touchmove', handleManualResizeMove);
    document.removeEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    if (!raceStartTime || !duration) return;

    const tick = () => {
      const now = Date.now() + (offsetRef.current || 0);
      const startMs = new Date(raceStartTime).getTime();
      const elapsed = Math.floor((now - startMs) / 1000);
      const remaining = Math.max(0, (duration || 0) - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleFinish();
      }
    };

    // Immediate tick then interval
    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [raceStartTime, duration]);


  const startRace = async (socketConnection) => {
    if (!raceId) {
      navigate('/dashboard');
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    if (socketTimeoutRef.current) {
      clearTimeout(socketTimeoutRef.current);
    }
    
    try {
      // First fetch race details to get pointsPerPuzzle
      const raceResponse = await api.get(`/api/team-race/${raceId}`);
      const raceData = raceResponse.data;
      setPointsPerPuzzle(raceData.pointsPerPuzzle || 10);

      const res = await api.post(`/api/team-race/${raceId}/start`);
      const data = res.data;
      
      setResultId(data.resultId);
      resultIdRef.current = data.resultId;
      setPuzzles(data.puzzles);
      puzzlesRef.current = data.puzzles;
      
      setDuration(data.duration);
      
      const timeRemaining = data.timeLeft !== undefined ? data.timeLeft : data.duration;
      setTimeLeft(timeRemaining);
      setRaceStartTime(data.startTime);
      
      setPosition(data.position);
      
      setTeamName(data.teamName);
      if (data.userId) setMyUserId(String(data.userId));
      
      // Cache the data
      raceCache.data[raceId] = {
        puzzles: data.puzzles,
        resultId: data.resultId,
        duration: data.duration,
        timeLeft: timeRemaining,
        teamName: data.teamName,
        position: data.position,
        pointsPerPuzzle: raceData.pointsPerPuzzle || 10
      };
      
      const sock = socketConnection || socket;
      if (sock && sock.connected) {
        sock.emit('joinTeamRace', { raceId, userId: data.userId });
      }
      
      // Fetch leaderboard after race starts (result now exists)
      fetchLeaderboard();
      
      const startIndex = data.currentPuzzleIndex !== undefined ? data.currentPuzzleIndex : 0;
      if (data.puzzles && data.puzzles.length > 0) {
        try {
          loadPuzzle(startIndex, data.puzzles);
        } catch (err) {
          alert('Error loading puzzle: ' + err.message);
          setLoading(false);
          return;
        }
        setLoading(false);
        startedRef.current = true;
      } else {
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      
      // Check if race has finished - redirect to results
      if (err.response?.data?.raceFinished) {
        navigate(`/team-race/${raceId}/results`);
        return;
      }
      
      alert(`Failed to start race: ${errorMessage}`);
      
      if (err.response?.status === 404 && errorMessage === 'You are not in a team') {
        setLoading(false);
        navigate(`/team-race/${raceId}/select-team`);
      } else {
        setLoading(false);
        navigate(`/team-race/${raceId}/lobby`);
      }
    }
  };

  const loadPuzzle = (index, puzzleList = puzzles) => {
    
    if (index >= puzzleList.length) {
      handleFinish();
      return;
    }

    const merged = puzzleList[index];
    const puzzleDoc = merged.puzzleDoc || merged;

    try {
      const newGame = new Chess(puzzleDoc.fen);
      
      // Safety check: ensure game is not in checkmate/stalemate
      if (newGame.isGameOver()) {
        loadPuzzle(index + 1, puzzleList);
        return;
      }
      
      const solution = puzzleDoc.solution || [];
      const resumeUserMovesStr = merged.userMoves || '';
      const resumeUserMovesArr = resumeUserMovesStr ? resumeUserMovesStr.split(/\s+/).filter(Boolean) : [];

      // Racer puzzles are USER-FIRST: solution[0] is the player's move and the
      // side to move in the FEN is the solver. The side never changes mid-puzzle.
      const playerSide = newGame.turn() === 'w' ? 'white' : 'black';

      // All moves the user is expected to make (even-indexed: 0, 2, 4…)
      const allExpectedUserMoves = solution.filter((_, idx) => idx % 2 === 0);

      // If stored userMoves already covers the full solution (puzzle completed but index
      // wasn't incremented yet because the socket event was lost on reload), skip ahead.
      if (resumeUserMovesArr.length > 0 && resumeUserMovesArr.length >= allExpectedUserMoves.length) {
        loadPuzzle(index + 1, puzzleList);
        return;
      }

    if (resumeUserMovesArr.length === 0) {
      // USER-FIRST: do NOT pre-play solution[0] (that's the user's own move).
      // Show the FEN as-is; the user makes the first move.
      setLastMove(null);

      // Set game and reset userMoves for new puzzle
      setGame(newGame);
      gameRef.current = newGame;
      if (raceCache.data[raceId]) {
        raceCache.data[raceId].game = newGame;
      }
      setPlayerColor(playerSide);
      setCurrentPuzzleIndex(index);
      setUserMoves([]);
      setPuzzleStartTime(Date.now());
    } else {
      // Resuming puzzle — replay stored moves to reconstruct the board position
      try {
        const resumedGame = new Chess(puzzleDoc.fen);
        let lastMoveData = null;

        // USER-FIRST: user move i is at solution index 2i, the opponent's reply
        // after it at index 2i+1. (No pre-played opponent move 0.)
        for (let i = 0; i < resumeUserMovesArr.length; i++) {
          const userMoveUCI = resumeUserMovesArr[i];
          // apply user move
          let mUser = null;
          try {
            mUser = resumedGame.move({
              from: userMoveUCI.slice(0,2),
              to: userMoveUCI.slice(2,4),
              promotion: userMoveUCI.length > 4 ? userMoveUCI[4] : undefined
            }, { sloppy: true });
          } catch (err) {
            try {
              mUser = resumedGame.move(userMoveUCI, { sloppy: true });
            } catch (e) {
            }
          }
          if (mUser) lastMoveData = { from: mUser.from, to: mUser.to };

          // apply opponent move after user's move if exists
          const oppIndex = (i * 2) + 1;
          if (solution[oppIndex]) {
            try { 
              const mOpp = resumedGame.move(solution[oppIndex], { sloppy: true }); 
              if (mOpp) lastMoveData = { from: mOpp.from, to: mOpp.to };
            } catch (e) { 
            }
          }
        }

        // If resume left the game in a finished state, skip to the next puzzle
        if (resumedGame.isGameOver()) {
          loadPuzzle(index + 1, puzzleList);
          return;
        }

        setGame(resumedGame);
        gameRef.current = resumedGame;
        if (raceCache.data[raceId]) {
          raceCache.data[raceId].game = resumedGame;
        }
        setLastMove(lastMoveData);
        setUserMoves(resumeUserMovesArr);
        if (merged.timeSpent) {
          setPuzzleStartTime(Date.now() - (merged.timeSpent * 1000));
        } else {
          setPuzzleStartTime(Date.now());
        }
        // Use playerSide (from solution[0]) — NOT resumedGame.turn() which may be
        // the opponent's turn if the last resume move had no opponent response to follow.
        setPlayerColor(playerSide);
        setCurrentPuzzleIndex(index);
      } catch (err) {
        // Fall back to loading fresh puzzle on error
        loadPuzzle(index + 1, puzzleList);
        return;
      }
    }
    
    } catch (err) {
      // Skip problematic puzzle
      loadPuzzle(index + 1, puzzleList);
      return;
    }
  };

  const handleMove = (from, to, promotion) => {
    const currentPuzzleMerged = puzzles[currentPuzzleIndex];
    const currentPuzzle = currentPuzzleMerged?.puzzleDoc || currentPuzzleMerged;
    if (!currentPuzzle) return false;

    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({ from, to, promotion: promotion || 'q' });

    if (!move) return false;

    const uciMove = move.from + move.to + (move.promotion || '');
    
    const newUserMoves = [...userMoves, uciMove];
    setUserMoves(newUserMoves);
    setGame(gameCopy);
    setLastMove({ from: move.from, to: move.to });

    const solution = currentPuzzle?.solution || [];
    const expectedUserMoves = solution.filter((_, idx) => idx % 2 === 1);

    const userMovesStr = newUserMoves.join(' ');
    const expectedStr = expectedUserMoves.slice(0, newUserMoves.length).join(' ');

    // Lichess rule: accept the stored move, OR any move that delivers immediate
    // checkmate (covers "multiple ways to mate" — alternate mates are valid).
    const isAltMate = gameCopy.isCheckmate();

    if (isAltMate || userMovesStr === expectedStr) {
      if (isAltMate || newUserMoves.length === expectedUserMoves.length) {
        const timeSpent = Math.floor((Date.now() - puzzleStartTime) / 1000);
        submitPuzzle(true, newUserMoves.join(' '), timeSpent);
        
        // Lichess-style: brief pause so the user registers the solve, then advance
        setTimeout(() => {
          loadPuzzle(currentPuzzleIndex + 1);
        }, 250);
      } else {
        setTimeout(() => {
          // USER-FIRST: after N user moves (indices 0,2,…,2N-2), the opponent's
          // reply is the next move at index 2N-1.
          const opponentMoveIndex = (newUserMoves.length * 2) - 1;
          const solution = currentPuzzle.solution || [];
          if (opponentMoveIndex >= 0 && opponentMoveIndex < solution.length) {
            const opponentMove = solution[opponentMoveIndex];
            const newGame = new Chess(gameCopy.fen());
            const oppMoveResult = newGame.move(opponentMove, { sloppy: true });
            if (oppMoveResult) {
              setGame(newGame);
              setLastMove({ from: oppMoveResult.from, to: oppMoveResult.to });
            } else {
            }
          } else {
          }
        }, 140);
      }
    } else {
      const timeSpent = Math.floor((Date.now() - puzzleStartTime) / 1000);
      submitPuzzle(false, newUserMoves.join(' '), timeSpent);
      
      // Brief pause so the user registers the wrong move, then next puzzle instantly
      setTimeout(() => {
        loadPuzzle(currentPuzzleIndex + 1);
      }, 120);
    }

    return true;
  };

  const submitPuzzle = async (solved, moves, timeSpent) => {
    if (socket && socket.connected) {
      socket.emit('submitTeamPuzzle', {
        resultId,
        puzzleIndex: currentPuzzleIndex,
        userMoves: moves,
        solved,
        timeSpent
      });
    } else {
      try {
        const res = await api.post('/api/team-race/submit-puzzle', {
          resultId,
          puzzleIndex: currentPuzzleIndex,
          userMoves: moves,
          solved,
          timeSpent
        });

        setScore(res.data.currentScore);
      } catch (err) {
      }
    }
  };

  const handleFinish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const rid = resultIdRef.current || resultId;
    try {
      if (rid) {
        await api.post('/api/team-race/finish', { resultId: rid });
      }
    } catch (err) {
      // Ignore errors — race is over regardless
    } finally {
      navigate(`/team-race/${raceId}/results`);
    }
  };

  const handleSkipPuzzle = () => {
    const timeSpent = Math.floor((Date.now() - puzzleStartTime) / 1000);
    // Submit as unsolved/wrong
    submitPuzzle(false, userMoves.join(' '), timeSpent);
    
    // Load next puzzle almost immediately
    setTimeout(() => {
      loadPuzzle(currentPuzzleIndex + 1);
    }, 120);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage > 50) return '#28a745';
    if (percentage > 20) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Loading race...</h2>
      </div>
    );
  }

  if (!puzzles || puzzles.length === 0) {
    return (
      <div className="error-screen">
        <h2>No puzzles available</h2>
        <button onClick={() => navigate('/team-race')} className="btn-back">
          Back to Races
        </button>
      </div>
    );
  }

  const effectivePuzzles = puzzles.length > 0 ? puzzles : puzzlesRef.current;
  const currentPuzzle = effectivePuzzles[currentPuzzleIndex];
  const currentPuzzleDoc = currentPuzzle?.puzzleDoc || currentPuzzle;
  const progress = effectivePuzzles.length > 0 ? ((currentPuzzleIndex + 1) / effectivePuzzles.length) * 100 : 0;

  if (effectivePuzzles.length === 0 && startedRef.current) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#0a0a0a', 
        minHeight: '100vh', 
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>♟️</div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading puzzles...</div>
        <div style={{ fontSize: '16px', color: '#C0C0C0' }}>Race started, waiting for puzzle data</div>
      </div>
    );
  }

  if (loading && !startedRef.current) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#0a0a0a', 
        minHeight: '100vh', 
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>♟️</div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>Starting Team Race...</div>
        <div style={{ fontSize: '16px', color: '#C0C0C0' }}>Connecting to server and loading puzzles</div>
      </div>
    );
  }

  return (
    <div className="team-race-puzzle">
      {/* Three Column Layout */}
      <div className="race-three-column-layout">
        {/* LEFT SIDEBAR - Leaderboard */}
        <div className="left-sidebar">
          <div className="leaderboard-panel">
            <h3 className="leaderboard-title">🏆 Team Leaderboard</h3>
            <table className="lb-sidebar-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Pts</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {[...liveLeaderboard]
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team, index) => (
                    <tr
                      key={team.teamId || index}
                      className={team.teamName === teamName ? 'lb-my-row' : ''}
                    >
                      <td className="lb-rank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="lb-name">{team.teamName}</td>
                      <td className="lb-score">{team.totalScore}</td>
                      <td className="lb-players">{team.activePlayers}/{team.totalPlayers}</td>
                    </tr>
                  ))}
                {liveLeaderboard.length === 0 && (
                  <tr><td colSpan="4" className="lb-empty">No data yet</td></tr>
                )}
              </tbody>
            </table>

            {/* Individual Player Leaderboard */}
            <div className="individual-leaderboard-panel">
              {(() => {
                const PL_PER_PAGE = 10;
                const plTotal = Math.max(1, Math.ceil(playerLeaderboard.length / PL_PER_PAGE));
                const safePlPage = Math.min(playerLbPage, plTotal - 1);
                const pagePlayers = playerLeaderboard.slice(safePlPage * PL_PER_PAGE, safePlPage * PL_PER_PAGE + PL_PER_PAGE);
                const myRankIdx = myUserId ? playerLeaderboard.findIndex(p => String(p.userId) === myUserId) : -1;
                const myOnPage = pagePlayers.some(p => String(p.userId) === myUserId);
                const myPlayer = myRankIdx >= 0 ? playerLeaderboard[myRankIdx] : null;
                return (
                  <>
                    <h3 className="leaderboard-title">🎯 Top Players{playerLeaderboard.length > 0 ? ` (${playerLeaderboard.length})` : ''}</h3>
                    <table className="lb-sidebar-table">
                      <thead>
                        <tr><th>#</th><th>Player</th><th>Pts</th></tr>
                      </thead>
                      <tbody>
                        {pagePlayers.map((player, i) => {
                          const abs = safePlPage * PL_PER_PAGE + i;
                          return (
                            <tr key={player.userId || i} className={myUserId && String(player.userId) === myUserId ? 'lb-my-row' : ''}>
                              <td className="lb-rank">{abs === 0 ? '🥇' : abs === 1 ? '🥈' : abs === 2 ? '🥉' : `#${abs + 1}`}</td>
                              <td className="lb-name">{player.displayName || player.username}</td>
                              <td className="lb-score">{player.totalScore}</td>
                            </tr>
                          );
                        })}
                        {myPlayer && !myOnPage && (
                          <tr className="lb-my-row lb-pinned-row">
                            <td className="lb-rank">{myRankIdx === 0 ? '🥇' : myRankIdx === 1 ? '🥈' : myRankIdx === 2 ? '🥉' : `#${myRankIdx + 1}`}</td>
                            <td className="lb-name">📍 {myPlayer.displayName || myPlayer.username}</td>
                            <td className="lb-score">{myPlayer.totalScore}</td>
                          </tr>
                        )}
                        {playerLeaderboard.length === 0 && (
                          <tr><td colSpan="3" className="lb-empty">No data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                    {plTotal > 1 && (
                      <div className="lb-sidebar-pagination">
                        <button className="lb-page-btn" onClick={() => setPlayerLbPage(p => Math.max(0, p - 1))} disabled={safePlPage === 0}>‹</button>
                        <span className="lb-page-info">{safePlPage + 1}/{plTotal}</span>
                        <button className="lb-page-btn" onClick={() => setPlayerLbPage(p => Math.min(plTotal - 1, p + 1))} disabled={safePlPage === plTotal - 1}>›</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* MIDDLE - Chessboard */}
        <div className="middle-board-section">
          <div className="chessboard-wrapper">
            <Chessboard
              position={(game || gameRef.current).fen()}
              onDrop={handleMove}
              orientation={playerColor}
              boardWidth={boardWidth}
              draggable={true}
              lastMove={lastMove}
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
                borderColor: 'transparent transparent #3b82f6 transparent',
                cursor: 'nwse-resize',
                zIndex: 100,
                opacity: 0.8,
                touchAction: 'none'
              }}
              title="Drag to resize"
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR - Info Panel */}
        <div className="right-sidebar">
          <div className="info-panel">
            {/* Timer */}
            <div className="info-timer" style={{ color: getTimerColor() }}>
              <span className="timer-icon">⏱️</span>
              <span className="timer-value">{formatTime(timeLeft)}</span>
            </div>

            {/* Info Table */}
            <div className="info-table-container">
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="info-table-label">To Move:</td>
                    <td className="info-table-value">
                      {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
                    </td>
                  </tr>
                  <tr>
                    <td className="info-table-label">Your Position:</td>
                    <td className="info-table-value">#{position}</td>
                  </tr>
                  <tr>
                    <td className="info-table-label">Your Points:</td>
                    <td className="info-table-value info-points">{score}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Skip Button */}
            <div className="info-skip">
              <button 
                onClick={handleSkipPuzzle}
                className="skip-button"
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.3s'
                }}
              >
                ⏭️ Skip Puzzle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamRacePuzzle;
