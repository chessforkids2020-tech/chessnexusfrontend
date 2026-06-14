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
  const socketTimeoutRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [boardWidth, setBoardWidth] = useState(600);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(400);

  // Calculate responsive board width
  const calculateResponsiveBoardWidth = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Account for sidebar and padding (approximately 400px for sidebar + padding)
    const availableWidth = screenWidth - (screenWidth >= 1024 ? 400 : 0);
    
    // For mobile/small screens (< 768px)
    if (screenWidth < 768) {
      // Use 95% of available width, but cap between 280px and 400px
      return Math.min(Math.max(availableWidth * 0.95, 280), 400);
    }
    
    // For tablets (768px - 1024px)
    if (screenWidth < 1024) {
      // Use 80% of available width, cap at 500px
      return Math.min(availableWidth * 0.8, 500);
    }
    
    // For desktop (> 1024px)
    // Use 65% of available width, cap at 600px
    return Math.min(availableWidth * 0.65, 600);
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
        if (cached.resultId) setResultId(cached.resultId);
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
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current);
    };
  }, [raceId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/api/team-race/${raceId}/leaderboard`);
      setLiveLeaderboard(res.data.leaderboard || []);
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
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleFinish();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

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
      setPuzzles(data.puzzles);
      puzzlesRef.current = data.puzzles;
      
      setDuration(data.duration);
      
      const timeRemaining = data.timeLeft !== undefined ? data.timeLeft : data.duration;
      setTimeLeft(timeRemaining);
      
      setPosition(data.position);
      
      setTeamName(data.teamName);
      
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

    const newGame = new Chess(puzzleDoc.fen);
    
    const solution = puzzleDoc.solution || [];
    const resumeUserMovesStr = merged.userMoves || '';
    const resumeUserMovesArr = resumeUserMovesStr ? resumeUserMovesStr.split(/\s+/).filter(Boolean) : [];

    if (resumeUserMovesArr.length === 0) {
      if (solution && solution.length > 0) {
        const firstMove = solution[0];
        const moveResult = newGame.move(firstMove, { sloppy: true });
        
        const userColor = newGame.turn() === 'w' ? 'white' : 'black';
        setPlayerColor(userColor);
      } else {
      }

      // Set game and reset userMoves for new puzzle
      setGame(newGame);
      gameRef.current = newGame;
      if (raceCache.data[raceId]) {
        raceCache.data[raceId].game = newGame;
      }
      setCurrentPuzzleIndex(index);
      setUserMoves([]);
      setPuzzleStartTime(Date.now());
    } else {
      // Resuming puzzle
      try {
        const resumedGame = new Chess(puzzleDoc.fen);

        // Apply opponent move 0 if present
        if (solution && solution.length > 0) {
          const opp0 = solution[0];
          resumedGame.move(opp0, { sloppy: true });
        }

        // For each user move applied, also apply the next opponent move if it exists
        for (let i = 0; i < resumeUserMovesArr.length; i++) {
          const userMoveUCI = resumeUserMovesArr[i];
          // apply user move
          try {
            resumedGame.move({ 
              from: userMoveUCI.slice(0,2), 
              to: userMoveUCI.slice(2,4), 
              promotion: userMoveUCI.length > 4 ? userMoveUCI[4] : undefined 
            }, { sloppy: true });
          } catch (err) {
            try { 
              resumedGame.move(userMoveUCI, { sloppy: true }); 
            } catch (e) { 
            }
          }

          // apply opponent move after user's move if exists
          const oppIndex = (i + 1) * 2;
          if (solution[oppIndex]) {
            try { 
              resumedGame.move(solution[oppIndex], { sloppy: true }); 
            } catch (e) { 
            }
          }
        }

        setGame(resumedGame);
        gameRef.current = resumedGame;
        if (raceCache.data[raceId]) {
          raceCache.data[raceId].game = resumedGame;
        }
        setUserMoves(resumeUserMovesArr);
        if (merged.timeSpent) {
          setPuzzleStartTime(Date.now() - (merged.timeSpent * 1000));
        } else {
          setPuzzleStartTime(Date.now());
        }
        const resumedUserColor = resumedGame.turn() === 'w' ? 'white' : 'black';
        setPlayerColor(resumedUserColor);
        setCurrentPuzzleIndex(index);
      } catch (err) {
      }
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

    const solution = currentPuzzle?.solution || [];
    const expectedUserMoves = solution.filter((_, idx) => idx % 2 === 1);
    
    const userMovesStr = newUserMoves.join(' ');
    const expectedStr = expectedUserMoves.slice(0, newUserMoves.length).join(' ');

    if (userMovesStr === expectedStr) {
      if (newUserMoves.length === expectedUserMoves.length) {
        const timeSpent = Math.floor((Date.now() - puzzleStartTime) / 1000);
        submitPuzzle(true, newUserMoves.join(' '), timeSpent);
        
        setTimeout(() => {
          loadPuzzle(currentPuzzleIndex + 1);
        }, 1000);
      } else {
        setTimeout(() => {
          const opponentMoveIndex = newUserMoves.length * 2;
          const solution = currentPuzzle.solution || [];
          if (opponentMoveIndex < solution.length) {
            const opponentMove = solution[opponentMoveIndex];
            const newGame = new Chess(gameCopy.fen());
            const oppMoveResult = newGame.move(opponentMove, { sloppy: true });
            if (oppMoveResult) {
              setGame(newGame);
            } else {
            }
          } else {
          }
        }, 300);
      }
    } else {
      const timeSpent = Math.floor((Date.now() - puzzleStartTime) / 1000);
      submitPuzzle(false, newUserMoves.join(' '), timeSpent);
      
      setTimeout(() => {
        loadPuzzle(currentPuzzleIndex + 1);
      }, 1500);
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
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await api.post('/api/team-race/finish', { resultId });
      navigate(`/team-race/${raceId}/results`);
    } catch (err) {
    }
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
      <div className="race-header-bar">
        <div className="race-info-left">
          <div className="team-badge-display">{teamName}</div>
          <div className="position-display">Position #{position}</div>
        </div>

        <div className="race-timer" style={{ color: getTimerColor() }}>
          <span className="timer-icon">⏱️</span>
          <span className="timer-value">{formatTime(timeLeft)}</span>
        </div>

        <div className="race-info-right">
          <div className="score-display">
            <span className="score-label">Score:</span>
            <span className="score-value">{score}</span>
          </div>
          <div className="puzzle-progress">
            <span>{currentPuzzleIndex + 1}/{effectivePuzzles.length}</span>
          </div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="puzzle-content">
        <div className="puzzle-board-section">
          <div className="puzzle-info">
            <h3 className="puzzle-title">
              Puzzle {currentPuzzleIndex + 1}
            </h3>
            <div className="hint-item" style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: (game || gameRef.current).turn() === 'w' ? '#fff' : '#333',
              background: (game || gameRef.current).turn() === 'w' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              padding: '10px 15px',
              borderRadius: '8px',
              textAlign: 'center',
              margin: '10px 0'
            }}>
              {(game || gameRef.current).turn() === 'w' ? '⚪ White to move' : '⚫ Black to move'}
            </div>
          </div>

          <div className="chessboard-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <Chessboard
              position={(game || gameRef.current).fen()}
              onDrop={handleMove}
              orientation={playerColor}
              boardWidth={boardWidth}
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
                borderColor: 'transparent transparent #3b82f6 transparent',
                cursor: 'nwse-resize',
                zIndex: 100,
                opacity: 0.8,
                touchAction: 'none'
              }}
              title="Drag to resize"
            />
          </div>

          <div className="puzzle-hints">
            <div className="hint-item">
              <strong>Your turn:</strong> Find the best move!
            </div>
            {userMoves.length > 0 && (
              <div className="moves-made">
                <strong>Your moves:</strong> {userMoves.join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="puzzle-sidebar">
          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <h4>🏆 Team Standings</h4>
            </div>
            {liveLeaderboard.length > 0 ? (
              <div className="leaderboard-list">
                {liveLeaderboard
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team, index) => (
                    <div
                      key={team.teamId}
                      className={`leaderboard-item ${team.teamName === teamName ? 'my-team' : ''}`}
                    >
                      <div className="rank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="team-info">
                        <div className="team-name">{team.teamName}</div>
                        <div className="team-score">{team.totalScore} pts</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="leaderboard-loading">
                <p>Waiting for leaderboard data...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default TeamRacePuzzle;
