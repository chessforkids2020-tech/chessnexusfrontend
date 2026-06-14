import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';
import useResponsiveBoardSize from '../../hooks/useResponsiveBoardSize';

const UserTestPlay = () => {
  const { studyId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const timeLimit = parseInt(searchParams.get('time')) || 300;
  // When launched from a coach Study Test assignment, report the result back.
  const assignmentId = searchParams.get('assignment') || null;
  const navigate = useNavigate();

  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 580, 520);

  // Test state
  const [testId, setTestId] = useState(null);
  const [studyTitle, setStudyTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [displayPuzzleNumber, setDisplayPuzzleNumber] = useState(null);
  
  // Puzzle state
  const [chess, setChess] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('white');
  const [solutionLength, setSolutionLength] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [waitingForStockfish, setWaitingForStockfish] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);

  // Stats
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);

  // Start the test
  useEffect(() => {
    const startTest = async () => {
      try {
        const response = await api.post('/api/testpuzzle/start', {
          studyId,
          chapterId,
          timeLimit
        });


        setTestId(response.data.testId);
        setStudyTitle(response.data.studyTitle);
        setChapterTitle(response.data.chapterTitle);
        // Use chapter total for progress if provided, otherwise fall back
        setTotalPuzzles(response.data.totalPuzzlesInChapter || response.data.totalPuzzles);
        
        // Load first puzzle
        const puzzle = response.data.currentPuzzle;
        const newChess = new Chess(puzzle.fen);
        setChess(newChess);
        setPlayerColor(puzzle.playerColor || 'white');
        setSolutionLength(puzzle.solutionLength);
        setIsSolved(false);
        setMessage('');
        setWaitingForStockfish(false);
        // Track absolute puzzle number for display (so users see puzzle 31, 32...)
        setDisplayPuzzleNumber(response.data.currentPuzzle?.puzzleNumber || 1);
        setTestStarted(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start test');
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [studyId, chapterId, timeLimit]);

  // Timer
  useEffect(() => {
    if (!testStarted || testFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, testFinished, timeLeft]);

  const loadPuzzle = (puzzle) => {
    const newChess = new Chess(puzzle.fen);
    setChess(newChess);
    setPlayerColor(puzzle.playerColor);
    setSolutionLength(puzzle.solutionLength);
    setIsSolved(false);
    setMessage('');
    setWaitingForStockfish(false);
    setDisplayPuzzleNumber(puzzle.puzzleNumber || null);
  };

  const handleMove = useCallback(async (sourceSquare, targetSquare, promotion) => {
    if (isSolved || waitingForStockfish || timeLeft <= 0 || testFinished) {
      return false;
    }

    // Check if it's player's turn
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) {
      return false;
    }

    try {
      // Try to make the move
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || 'q'
      });

      if (!move) {
        return false;
      }

      // Update board immediately
      setChess(new Chess(chess.fen()));
      setWaitingForStockfish(true);
      setMessage('');

      // Convert to UCI
      const moveUCI = move.from + move.to + (move.promotion || '');

      // Submit move to backend
      const response = await api.post('/api/testpuzzle/move', {
        testId,
        moveUCI
      });

      if (response.data.isSolved) {
        setIsSolved(true);
        setPuzzlesSolved(prev => prev + 1);
        setMessage(response.data.isCheckmate ? '✓ Checkmate! +2 points!' : '✓ Correct! +2 points!');
        setWaitingForStockfish(false);
        
        // Auto-advance after delay
        setTimeout(() => {
          nextPuzzle();
        }, 1500);
        
        return true;
      }

      // Handle wrong move - backend returns the next puzzle
      if (response.data.wrongMove) {
        setMessage('✗ Wrong move!');
        setWaitingForStockfish(false);
        
        // If test is completed, finish
        if (response.data.completed) {
          setTimeout(() => {
            finishTest();
          }, 1500);
          return true;
        }
        
        // Load next puzzle after showing message
        if (response.data.skippedToNext && response.data.nextPuzzle) {
          setTimeout(() => {
            setCurrentPuzzleIndex(response.data.puzzleIndex);
            loadPuzzle(response.data.nextPuzzle);
            setDisplayPuzzleNumber(response.data.nextPuzzle.puzzleNumber || response.data.puzzleIndex + 1);
          }, 1500);
        }
        
        return true;
      }

      // Apply Stockfish's response
      if (response.data.stockfishMoveUCI) {
        setTimeout(() => {
          try {
            const sfFrom = response.data.stockfishMoveUCI.substring(0, 2);
            const sfTo = response.data.stockfishMoveUCI.substring(2, 4);
            const sfPromotion = response.data.stockfishMoveUCI.length > 4 
              ? response.data.stockfishMoveUCI[4] 
              : undefined;
            
            chess.move({ from: sfFrom, to: sfTo, promotion: sfPromotion });
            setChess(new Chess(chess.fen()));
          } catch (e) {
          }
          setWaitingForStockfish(false);
        }, 400);
      } else {
        setWaitingForStockfish(false);
      }

      return true;
    } catch (err) {
      setWaitingForStockfish(false);
      // Undo move on error
      chess.undo();
      setChess(new Chess(chess.fen()));
      setMessage('Move failed. Try again.');
      return false;
    }
  }, [chess, testId, isSolved, waitingForStockfish, timeLeft, testFinished, playerColor]);

  const nextPuzzle = async () => {
    if (!testId) return;

    try {
      const response = await api.post('/api/testpuzzle/next', { testId });

      if (response.data.completed) {
        finishTest();
        return;
      }

      setCurrentPuzzleIndex(response.data.puzzleIndex);
      loadPuzzle(response.data.currentPuzzle);
      setDisplayPuzzleNumber(response.data.currentPuzzle.puzzleNumber || response.data.puzzleIndex + 1);
      setDisplayPuzzleNumber(response.data.currentPuzzle.puzzleNumber || response.data.puzzleIndex + 1);
    } catch (err) {
      setMessage('Error loading next puzzle');
    }
  };

  const skipPuzzle = async () => {
    if (!testId) return;

    try {
      const response = await api.post('/api/testpuzzle/skip', { testId });

      if (response.data.completed) {
        finishTest();
        return;
      }

      setCurrentPuzzleIndex(response.data.puzzleIndex);
      loadPuzzle(response.data.currentPuzzle);
    } catch (err) {
      setMessage('Error skipping puzzle');
    }
  };

  const finishTest = async () => {
    if (!testId || testFinished) return;

    setTestFinished(true);

    try {
      const response = await api.post('/api/testpuzzle/finish', { testId });
      // If this test was a coach Study Test assignment, report the grade back.
      if (assignmentId) {
        const d = response.data || {};
        try {
          await api.post(`/api/coach/my-assignments/${assignmentId}/submit-test`, {
            percentage: d.percentage,
            totalPoints: d.totalPoints,
            maxPoints: d.maxPoints,
            puzzlesSolved: d.puzzlesSolved,
            puzzlesAttempted: d.puzzlesAttempted,
            totalTime: d.totalTime,
          });
        } catch (_) { /* non-blocking — still show the result */ }
      }
      // Carry assignment context (id + time) into the result page so it can
      // tailor its buttons (no "choose study", retake uses the coach's time).
      const resultUrl = assignmentId
        ? `/test/result/${response.data.resultId}?assignment=${assignmentId}&studyId=${studyId}&chapterId=${chapterId}&time=${timeLimit}`
        : `/test/result/${response.data.resultId}`;
      navigate(resultUrl);
    } catch (err) {
      setError('Failed to save results');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1100px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '15px 20px',
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    titleSection: {
      display: 'flex',
      flexDirection: 'column',
    },
    studyTitle: {
      fontSize: '13px',
      color: '#f59e0b',
    },
    chapterTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#fff',
    },
    timer: {
      fontSize: '32px',
      fontWeight: '700',
      color: timeLeft <= 30 ? '#ef4444' : timeLeft <= 60 ? '#f59e0b' : '#22c55e',
      fontFamily: 'monospace',
    },
    main: {
      display: 'grid',
      gridTemplateColumns: '1fr 350px',
      gap: '25px',
    },
    boardSection: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '20px',
      padding: '25px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    boardContainer: {
      maxWidth: '550px',
      margin: '0 auto',
    },
    sidebar: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    cardTitle: {
      fontSize: '14px',
      color: '#9ca3af',
      marginBottom: '10px',
    },
    progressBar: {
      height: '8px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '10px',
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    stat: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    statLabel: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#fff',
    },
    message: {
      textAlign: 'center',
      padding: '15px',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '500',
    },
    successMessage: {
      background: 'rgba(34, 197, 94, 0.2)',
      color: '#86efac',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    },
    wrongMessage: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#fca5a5',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    playerTurn: {
      textAlign: 'center',
      padding: '15px',
      borderRadius: '10px',
      background: playerColor === 'white' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.3)',
      color: '#fff',
      fontSize: '16px',
      marginBottom: '15px',
    },
    button: {
      width: '100%',
      padding: '14px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '10px',
    },
    skipBtn: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#fca5a5',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    finishBtn: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      color: '#fff',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      padding: '100px 20px',
      fontSize: '18px',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      padding: '100px 20px',
      fontSize: '18px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Starting test...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>
          {error}
          <br />
          <button 
            onClick={() => navigate('/test')}
            style={{ ...styles.button, ...styles.finishBtn, width: 'auto', marginTop: '20px' }}
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const progressIndex = displayPuzzleNumber != null ? displayPuzzleNumber : (currentPuzzleIndex + 1);
  const progress = totalPuzzles > 0 ? (progressIndex / totalPuzzles) * 100 : 0;

  // Debug log for Chessboard props
  console.log({
    position: chess.fen(),
    orientation: playerColor,
    draggable: !waitingForStockfish && !isSolved && !testFinished,
    waitingForStockfish,
    isSolved,
    testFinished,
    chessTurn: chess.turn(),
    testId
  });

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <div style={styles.studyTitle}>{studyTitle}</div>
            <div style={styles.chapterTitle}>{chapterTitle}</div>
          </div>
          <div style={styles.timer}>{formatTime(timeLeft)}</div>
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {/* Board Section */}
          <div style={styles.boardSection}>
            <div style={styles.playerTurn}>
              {playerColor === 'white' ? '⚪' : '⚫'} You play as {playerColor}
            </div>
            
            {message && (
              <div style={{ 
                ...styles.message, 
                ...(isSolved ? styles.successMessage : {}),
                ...(message.includes('Wrong') ? styles.wrongMessage : {})
              }}>
                {message}
              </div>
            )}

            <div ref={boardRef} style={{ ...styles.boardContainer, width: '100%' }}>
              <div style={{ position: 'relative' }}>
                <Chessboard
                  key={`${currentPuzzleIndex}-${playerColor}`}
                  position={chess.fen()}
                  onDrop={handleMove}
                  orientation={playerColor}
                  boardWidth={boardSize}
                  boardStyle={{
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                  }}
                  draggable={!waitingForStockfish && !isSolved && !testFinished}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={styles.sidebar}>
            {/* Progress Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Progress</div>
              <div style={styles.progressBar}>
                <div 
                  style={{ 
                    ...styles.progressFill, 
                    width: `${progress}%` 
                  }} 
                />
              </div>
              <div style={{ textAlign: 'center', color: '#fff', fontSize: '18px' }}>
                Puzzle {displayPuzzleNumber || (currentPuzzleIndex + 1)}
              </div>
            </div>

            {/* Stats Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Stats</div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Solved</span>
                <span style={styles.statValue}>{puzzlesSolved}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Points</span>
                <span style={{ ...styles.statValue, color: '#22c55e' }}>
                  {puzzlesSolved * 2}
                </span>
              </div>
              <div style={{ ...styles.stat, borderBottom: 'none' }}>
                <span style={styles.statLabel}>Solution Length</span>
                <span style={styles.statValue}>{solutionLength} moves</span>
              </div>
            </div>

            {/* Actions Card */}
            <div style={styles.card}>
              <button
                style={{ ...styles.button, ...styles.skipBtn }}
                onClick={skipPuzzle}
                disabled={waitingForStockfish || testFinished}
              >
                ⏭️ Skip Puzzle
              </button>
              <button
                style={{ ...styles.button, ...styles.finishBtn }}
                onClick={finishTest}
                disabled={testFinished}
              >
                🏁 Finish Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTestPlay;
