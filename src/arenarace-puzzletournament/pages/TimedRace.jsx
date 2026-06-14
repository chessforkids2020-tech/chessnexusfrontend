import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Chessboard from '../components/Chessboard';

export default function TimedRace() {
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topic') || 'mixed';
  const timeParam = searchParams.get('time') || '5';
  const initialTime = parseInt(timeParam) * 60;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState(1);
  const [score, setScore] = useState(0);
  const [currentPuzzleData, setCurrentPuzzleData] = useState(null);
  const [currentPosition, setCurrentPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [moveIndex, setMoveIndex] = useState(0);
  const chessRef = useRef(null);
  const [availablePuzzles, setAvailablePuzzles] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [boardWidth, setBoardWidth] = useState(450);
  const [raceCompleted, setRaceCompleted] = useState(false);
  const [noPuzzlesAvailable, setNoPuzzlesAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [maxStreak, setMaxStreak] = useState(0);
  const [boardAnimDuration, setBoardAnimDuration] = useState(200);
  const isFetchingMoreRef = useRef(false);

  const currentAttemptStart = useRef(null);
  const navigate = useNavigate();

  const loadPuzzle = useCallback((puzzleIndex, puzzles = availablePuzzles) => {
    const puzzle = puzzles[puzzleIndex - 1];
    if (puzzle) {
      setCurrentPuzzleData(puzzle);
      const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const fenToUse = typeof puzzle.fen === 'string' && puzzle.fen ? puzzle.fen : defaultFen;
      let chess;
      try {
        chess = new Chess(fenToUse);
      } catch {
        chess = new Chess(defaultFen);
      }
      let moveIdx = 0;
      let newFen = chess.fen();
      if (puzzle.solution) {
        const solutionMoves = Array.isArray(puzzle.solution)
          ? puzzle.solution
          : (typeof puzzle.solution === 'string'
            ? puzzle.solution.split(/[, ]+/).filter(Boolean)
            : []);
        if (solutionMoves.length > 0) {
          const move = solutionMoves[0];
          let moveObj = chess.move(move, { sloppy: true });
          if (!moveObj && move.length === 4) {
            moveObj = chess.move({ from: move.slice(0,2), to: move.slice(2,4), promotion: 'q' });
          }
          if (moveObj) {
            moveIdx = 1;
            newFen = chess.fen();
          }
        }
      }
      chessRef.current = chess;
      setCurrentPosition(newFen);
      setMoveIndex(moveIdx);
      currentAttemptStart.current = Date.now();
      setBoardAnimDuration(0);
      setTimeout(() => setBoardAnimDuration(200), 120);
    }
  }, [availablePuzzles]);

  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        const requestTopic = topicId === 'mixed' ? 'racer-mixed' : topicId;
        const response = await api.get('/api/public/racer/puzzles', {
          params: { topic: requestTopic, limit: 150, random: true }
        });
        
        let puzzles = response.data || [];
        
        puzzles = puzzles.slice();
        for (let i = puzzles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [puzzles[i], puzzles[j]] = [puzzles[j], puzzles[i]];
        }
        setAvailablePuzzles(puzzles);
        setNoPuzzlesAvailable(puzzles.length === 0);
        setLoading(false);
        if (puzzles.length > 0) {
          loadPuzzle(1, puzzles);
        }
      } catch (error) {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
        setAvailablePuzzles([]);
        setNoPuzzlesAvailable(true);
        setLoading(false);
      }
    };

    if (topicId) {
      fetchPuzzles();
    }
  }, [topicId]);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const response = await api.get('/api/public/racer/topics');
        const topics = response.data || [];
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
          setCurrentTopic(topic);
        }
      } catch (error) {
      }
    };

    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!topicId) return;
      
      try {
        const response = await api.get(`/api/public/racer/leaderboard/${topicId}`);
        setLeaderboard(response.data || []);
      } catch (error) {
        setLeaderboard([]);
      }
    };

    fetchLeaderboard();
  }, [topicId]);

  useEffect(() => {
    if (availablePuzzles.length > 0 && !isActive && !loading && !noPuzzlesAvailable && timeLeft === initialTime) {
      setIsActive(true);
    }
  }, [availablePuzzles, isActive, loading, noPuzzlesAvailable, timeLeft, initialTime]);

  const handleMove = (sourceSquare, targetSquare, promotion) => {
    if (!currentPuzzleData || !currentPuzzleData.solution) return false;
    const chess = chessRef.current;
    const solutionMoves = Array.isArray(currentPuzzleData.solution)
      ? currentPuzzleData.solution
      : (typeof currentPuzzleData.solution === 'string'
        ? currentPuzzleData.solution.split(/[, ]+/).filter(Boolean)
        : []);

    const expectedMove = solutionMoves[moveIndex];
    if (!expectedMove) {
      recordAttempt(true);
      goToNextPuzzle();
      return true;
    }

    let isCorrect = false;
    let moveObj = null;
    const userMoveUCI = sourceSquare + targetSquare;
    const expectedMoveUCI = (() => {
      if (expectedMove.length === 4) return expectedMove;
      const tempChess = new Chess(chess.fen());
      // Clean the move notation by removing check/checkmate symbols
      const cleanExpectedMove = expectedMove.replace(/[+#]$/, '');
      const m = tempChess.move(cleanExpectedMove, { sloppy: true });
      return m ? m.from + m.to : '';
    })();
    if (userMoveUCI === expectedMoveUCI) {
      try {
        moveObj = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion || 'q' });
        isCorrect = true;
      } catch (error) {
        recordAttempt(false);
        goToNextPuzzle();
        return false;
      }
    }
    if (!moveObj) {
      recordAttempt(false);
      goToNextPuzzle();
      return false;
    }

    setCurrentPosition(chess.fen());
    let nextMoveIndex = moveIndex + 1;

    if (nextMoveIndex >= solutionMoves.length) {
      recordAttempt(isCorrect);
      goToNextPuzzle();
      return true;
    }

    const botMoveSan = solutionMoves[nextMoveIndex];
    if (botMoveSan) {
      // Clean the move notation by removing check/checkmate symbols
      const cleanMoveSan = botMoveSan.replace(/[+#]$/, '');
      let botMoveObj = null;
      try {
        botMoveObj = chess.move(cleanMoveSan, { sloppy: true });
        if (!botMoveObj && cleanMoveSan.length === 4) {
          botMoveObj = chess.move({ from: cleanMoveSan.slice(0,2), to: cleanMoveSan.slice(2,4), promotion: 'q' });
        }
      } catch (error) {
        // Skip this bot move and continue
        nextMoveIndex++;
        setMoveIndex(nextMoveIndex);
        return true;
      }
      if (botMoveObj) {
        nextMoveIndex++;
        setCurrentPosition(chess.fen());
      }
    }

    setMoveIndex(nextMoveIndex);

    if (nextMoveIndex >= solutionMoves.length) {
      recordAttempt(isCorrect);
      goToNextPuzzle();
    }

    return true;
  };

  const recordAttempt = (correct) => {
    const now = Date.now();
    const start = currentAttemptStart.current || now;
    const timeTakenSec = Math.round((now - start) / 1000);
    const attempt = {
      puzzleId: currentPuzzleData?._id,
      title: currentPuzzleData?.title,
      correct: !!correct,
      timeTakenSec
    };
    setAttempts(prev => [...prev, attempt]);
    if (correct) {
      setPuzzlesSolved(prev => prev + 1);
      setScore(prev => prev + 10);
      setMaxStreak(prev => Math.max(prev, prev + 1));
    }
  };

  const fetchMorePuzzles = async (currentLength) => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    try {
      const requestTopic = topicId === 'mixed' ? 'racer-mixed' : topicId;
      const limit = 50;
      const skip = currentLength;
      
      const response = await api.get('/api/public/racer/puzzles', {
        params: { topic: requestTopic, limit, skip, random: true }
      });
      
      let newPuzzles = response.data || [];
      if (newPuzzles.length > 0) {
        newPuzzles = newPuzzles.slice();
        for (let i = newPuzzles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newPuzzles[i], newPuzzles[j]] = [newPuzzles[j], newPuzzles[i]];
        }
        
        setAvailablePuzzles(prev => [...prev, ...newPuzzles]);
      }
    } catch (err) {
    } finally {
      isFetchingMoreRef.current = false;
    }
  };

  const goToNextPuzzle = () => {
    if (currentPuzzle < availablePuzzles.length) {
      const nextPuzzle = currentPuzzle + 1;
      setCurrentPuzzle(nextPuzzle);
      
      if (!isFetchingMoreRef.current && availablePuzzles.length - nextPuzzle < 20) {
        fetchMorePuzzles(availablePuzzles.length);
      }
    } else {
      setRaceCompleted(true);
      setIsActive(false);
    }
  };

  useEffect(() => {
    if (raceCompleted || (!isActive && timeLeft === 0)) {
      let attemptsForResult = [...attempts];
      const currentPuzzleId = currentPuzzleData?._id;
      const lastAttemptPuzzleId = attemptsForResult.length > 0 ? attemptsForResult[attemptsForResult.length - 1].puzzleId : null;
      if (currentPuzzleId && lastAttemptPuzzleId !== currentPuzzleId) {
        const now = Date.now();
        const start = currentAttemptStart.current || now;
        const timeTakenSec = Math.round((now - start) / 1000);
        attemptsForResult.push({ puzzleId: currentPuzzleId, title: currentPuzzleData?.title, correct: false, timeTakenSec });
      }

      const resultData = {
        points: score,
        attempts: attemptsForResult,
        totalCorrect: attemptsForResult.filter(a => a.correct).length,
        totalWrong: attemptsForResult.filter(a => !a.correct).length,
        maxStreak
      };
      navigate(`/racer-results?topic=${topicId}&time=${timeParam}`, { state: { results: resultData } });
    }
  }, [raceCompleted, isActive, timeLeft, attempts, score, maxStreak, currentPuzzleData, navigate, topicId, timeParam]);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      let boardSize;

      if (width < 768) {
        boardSize = Math.min(width - 60, 300);
        setIsMobile(true);
      } else if (width < 1024) {
        boardSize = 450;
        setIsMobile(false);
      } else {
        boardSize = 450;
        setIsMobile(false);
      }

      setBoardWidth(boardSize);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (availablePuzzles.length > 0 && currentPuzzle <= availablePuzzles.length) {
      const puzzleToLoad = availablePuzzles[currentPuzzle - 1];
      if (puzzleToLoad && puzzleToLoad._id !== currentPuzzleData?._id) {
        loadPuzzle(currentPuzzle, availablePuzzles);
      }
    }
  }, [currentPuzzle, availablePuzzles, loadPuzzle, currentPuzzleData]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRace = () => {
    setIsActive(true);
  };

  const resetRace = () => {
    setTimeLeft(initialTime);
    setIsActive(false);
    setPuzzlesSolved(0);
    setCurrentPuzzle(1);
    setScore(0);
    setRaceCompleted(false);
    setNoPuzzlesAvailable(false);
    if (availablePuzzles.length > 0) {
      loadPuzzle(1, availablePuzzles);
    }
  };

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: isMobile ? '8px' : '10px',
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
    content: {
      position: 'relative',
      zIndex: 1,
      maxWidth: isMobile ? '100%' : '1400px',
      margin: '0 auto',
    },
    raceContainer: {
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '1fr 2fr',
      gap: isMobile ? '12px' : '20px',
      alignItems: 'start',
    },
    statsRow: {
      display: 'flex',
      gap: '12px',
      marginBottom: '12px',
    },
    glassCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: isMobile ? '12px' : '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: isMobile ? 'relative' : 'sticky',
      top: isMobile ? '0' : '20px',
    },
    glassCardCenter: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: isMobile ? '8px' : '10px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    statCard: {
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: isMobile ? '6px' : '8px',
      textAlign: 'center',
      marginBottom: isMobile ? '0' : '12px',
      transition: 'all 0.3s ease',
      flex: isMobile ? '1' : undefined,
    },
    statCardTimer: {
      background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      borderColor: timeLeft < 60 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
    },
    statCardScore: {
      background: 'rgba(6, 182, 212, 0.1)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    statValue: {
      fontSize: isMobile ? '36px' : '48px',
      fontWeight: '700',
      marginBottom: '4px',
      fontFamily: 'monospace',
      color: timeLeft < 60 ? '#ef4444' : '#10b981',
      textShadow: timeLeft < 60 ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(16, 185, 129, 0.4)',
    },
    statValueScore: {
      fontSize: isMobile ? '28px' : '32px',
      fontWeight: '700',
      color: '#06b6d4',
      textShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
    },
    statLabel: {
      fontSize: '11px',
      color: '#6b7280',
      fontWeight: '600',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
    },
    compactCard: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: isMobile ? '12px' : '15px',
      marginBottom: isMobile ? '0' : '20px',
      textAlign: 'center',
    },
    topicText: {
      fontSize: isMobile ? '18px' : '22px',
      fontWeight: '600',
      color: '#ffffff',
    },
    leaderboardTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '12px',
      textAlign: 'center',
    },
    leaderboardItem: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '8px 12px',
      marginBottom: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.3s ease',
    },
    button: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#ffffff',
      border: 'none',
      padding: '14px 32px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
      width: '100%',
      marginBottom: '10px',
    },
    buttonSecondary: {
      background: 'rgba(0, 0, 0, 0.4)',
      color: '#9ca3af',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '14px 32px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      width: '100%',
    },
    puzzleHeader: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: isMobile ? '8px 12px' : '10px 16px',
      marginBottom: '12px',
      textAlign: 'center',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: '600',
      color: '#ffffff',
    },
    boardContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? '280px' : '500px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: isMobile ? '8px' : '12px',
    },
    placeholderIcon: {
      fontSize: isMobile ? '48px' : '64px',
      marginBottom: '16px',
      filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))',
    },
    placeholderText: {
      fontSize: isMobile ? '16px' : '18px',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: '1.8',
    },
    infoStatCard: {
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      marginBottom: '12px',
    },
    infoStatValue: {
      fontSize: isMobile ? '24px' : '28px',
      fontWeight: '700',
      marginBottom: '4px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        {isMobile ? (
          // Mobile Layout: Timer/Score → Chessboard → Leaderboard → Buttons
          <div style={styles.raceContainer}>
            {/* Timer and Score Row */}
            <div style={styles.statsRow}>
              <div style={{...styles.statCard, ...styles.statCardTimer}}>
                <div style={styles.statValue}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div style={{...styles.statCard, ...styles.statCardScore}}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentPosition && currentPosition.split(' ')[1] === 'w' ? '#ffffff' : '#d1d5db',
                  marginBottom: '4px',
                  textAlign: 'center'
                }}>
                  {currentPosition && currentPosition.split(' ')[1] === 'w' ? '⚪ White to Move' : '⚫ Black to Move'}
                </div>
                <div style={styles.statValueScore}>
                  {score}
                </div>
                <div style={styles.statLabel}>Score</div>
              </div>
            </div>

            {/* Chessboard */}
            <div style={styles.glassCardCenter}>
              <div style={styles.boardContainer}>
                {loading ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>⏳</div>
                    <div style={styles.placeholderText}>
                      <strong>Loading puzzles...</strong><br/>
                      <small style={{ color: '#9ca3af' }}>Please wait while we prepare your race.</small>
                    </div>
                  </div>
                ) : noPuzzlesAvailable ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🔍</div>
                    <div style={styles.placeholderText}>
                      <strong>No puzzles available</strong><br/>
                      This topic doesn't have any puzzles yet.<br/>
                      <small style={{ color: '#9ca3af' }}>Please choose a different topic.</small>
                    </div>
                  </div>
                ) : raceCompleted ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🎉</div>
                    <div style={styles.placeholderText}>
                      <strong style={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: isMobile ? '20px' : '24px'
                      }}>
                        Congratulations!
                      </strong><br/>
                      You've completed all {availablePuzzles.length} puzzles!<br/>
                      <small style={{ color: '#9ca3af' }}>Final Score: {score} points</small>
                    </div>
                  </div>
                ) : currentPuzzleData ? (
                  <Chessboard
                    key={currentPuzzleData?._id || `p-${currentPuzzle}`}
                    position={currentPosition}
                    onDrop={isActive ? handleMove : undefined}
                    boardWidth={boardWidth}
                    orientation={(currentPosition && currentPosition.split(' ')[1] === 'b') ? 'black' : 'white'}
                    transitionDuration={boardAnimDuration}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🏆</div>
                    <div style={styles.placeholderText}>
                      Chess Puzzle Area<br/>
                      <small style={{ color: '#9ca3af' }}>Loading puzzle...</small>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div style={styles.glassCard}>
                <div style={styles.leaderboardTitle}>
                  🏆 Top Racers
                </div>
                {leaderboard.slice(0, 5).map((player, index) => (
                  <div key={index} style={styles.leaderboardItem}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: '600',
                        color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9ca3af',
                        marginRight: '10px',
                        minWidth: '24px',
                        fontSize: isMobile ? '12px' : '13px'
                      }}>
                        #{player.rank}
                      </span>
                      <span style={{ flex: 1, fontSize: isMobile ? '12px' : '13px', color: '#d1d5db' }}>
                        {player.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: '600', color: '#10b981', fontSize: isMobile ? '12px' : '13px' }}>
                      {player.points}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={styles.glassCard}>
              {!isActive && timeLeft === initialTime && !loading && !noPuzzlesAvailable && (
                <button style={styles.button} onClick={startRace}>
                  🚀 Start Race
                </button>
              )}
              {!isActive && timeLeft < initialTime && !loading && !noPuzzlesAvailable && (
                <button style={styles.button} onClick={startRace}>
                  ▶️ Resume Race
                </button>
              )}
              <button style={styles.buttonSecondary} onClick={resetRace}>
                🔄 Reset Race
              </button>
            </div>
          </div>
        ) : (
          // Desktop Layout: 2-column grid
          <div style={styles.raceContainer}>
            {/* Stats Panel - Left */}
            <div style={styles.glassCard}>
              <div style={{...styles.statCard, ...styles.statCardTimer}}>
                <div style={styles.statValue}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div style={{...styles.statCard, ...styles.statCardScore}}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentPosition && currentPosition.split(' ')[1] === 'w' ? '#ffffff' : '#d1d5db',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  {currentPosition && currentPosition.split(' ')[1] === 'w' ? '⚪ White to Move' : '⚫ Black to Move'}
                </div>
                <div style={styles.statValueScore}>
                  {score}
                </div>
                <div style={styles.statLabel}>Current Score</div>
              </div>

              {leaderboard.length > 0 && (
                <div style={styles.compactCard}>
                  <div style={styles.leaderboardTitle}>
                    🏆 Top Racers
                  </div>
                  {leaderboard.slice(0, 5).map((player, index) => (
                    <div key={index} style={styles.leaderboardItem}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: '600',
                          color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9ca3af',
                          marginRight: '10px',
                          minWidth: '24px',
                          fontSize: isMobile ? '12px' : '13px'
                        }}>
                          #{player.rank}
                        </span>
                        <span style={{ flex: 1, fontSize: isMobile ? '12px' : '13px', color: '#d1d5db' }}>
                          {player.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: '600', color: '#10b981', fontSize: isMobile ? '12px' : '13px' }}>
                        {player.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                {!isActive && timeLeft === initialTime && !loading && !noPuzzlesAvailable && (
                  <button style={styles.button} onClick={startRace}>
                    🚀 Start Race
                  </button>
                )}
                {!isActive && timeLeft < initialTime && !loading && !noPuzzlesAvailable && (
                  <button style={styles.button} onClick={startRace}>
                    ▶️ Resume Race
                  </button>
                )}
                <button style={styles.buttonSecondary} onClick={resetRace}>
                  🔄 Reset Race
                </button>
              </div>
            </div>

            {/* Puzzle Area - Center */}
            <div style={styles.glassCardCenter}>
              <div style={styles.boardContainer}>
                {noPuzzlesAvailable ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🔍</div>
                    <div style={styles.placeholderText}>
                      <strong>No puzzles available</strong><br/>
                      This topic doesn't have any puzzles yet.<br/>
                      <small style={{ color: '#9ca3af' }}>Please choose a different topic.</small>
                    </div>
                  </div>
                ) : raceCompleted ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🎉</div>
                    <div style={styles.placeholderText}>
                      <strong style={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: isMobile ? '20px' : '24px'
                      }}>
                        Congratulations!
                      </strong><br/>
                      You've completed all {availablePuzzles.length} puzzles!<br/>
                      <small style={{ color: '#9ca3af' }}>Final Score: {score} points</small>
                    </div>
                  </div>
                ) : currentPuzzleData ? (
                  <Chessboard
                    key={currentPuzzleData?._id || `p-${currentPuzzle}`}
                    position={currentPosition}
                    onDrop={isActive ? handleMove : undefined}
                    boardWidth={boardWidth}
                    orientation={(currentPosition && currentPosition.split(' ')[1] === 'b') ? 'black' : 'white'}
                    transitionDuration={boardAnimDuration}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={styles.placeholderIcon}>🏆</div>
                    <div style={styles.placeholderText}>
                      Chess Puzzle Area<br/>
                      <small style={{ color: '#9ca3af' }}>Loading puzzle...</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
