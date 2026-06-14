import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';
import useResponsiveBoardSize from '../../hooks/useResponsiveBoardSize';

const API = import.meta.env.VITE_API_URL;

const StudyTest = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();

  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 580, 500);
  
  const [testId, setTestId] = useState(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [chess, setChess] = useState(new Chess());
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const [userMoves, setUserMoves] = useState([]);
  const [timer, setTimer] = useState(0);
  const [puzzleTimer, setPuzzleTimer] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [waitingForStockfish, setWaitingForStockfish] = useState(false);
  const [message, setMessage] = useState('');
  const [studyTitle, setStudyTitle] = useState('');

  useEffect(() => {
    startTest();
  }, [studyId]);

  // Global timer
  useEffect(() => {
    if (testId && !isSolved) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
        setPuzzleTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [testId, isSolved]);

  const startTest = async () => {
    try {
      setLoading(true);
      
      // Get study title from testpuzzle endpoint
      const studiesResponse = await api.get(`/api/testpuzzle/studies`);
      const study = studiesResponse.data.find(s => s._id === studyId);
      if (study) setStudyTitle(study.title);

      // Start test
      const response = await api.post(`/api/testpuzzle/start`, { studyId });

      setTestId(response.data.testId);
      setTotalPuzzles(response.data.totalPuzzles);
      loadPuzzle(response.data.currentPuzzle);
      setLoading(false);
    } catch (err) {
      setMessage('Failed to start test: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const loadPuzzle = (puzzle) => {
    const newChess = new Chess(puzzle.puzzleFen);
    setChess(newChess);
    setCurrentPuzzle(puzzle);
    setUserMoves([]);
    setIsSolved(false);
    setAttempts(0);
    setPuzzleTimer(0);
    setMessage('');
  };

  const handleMove = async (sourceSquare, targetSquare, piece) => {
    if (isSolved || waitingForStockfish) return false;

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (!move) return false;

      setUserMoves(prev => [...prev, move.san]);
      setWaitingForStockfish(true);

      // Submit move to backend
      const response = await api.post(`/api/testpuzzle/move`,
        { testId, move: move.san }
      );

      setAttempts(response.data.attempts);

      if (response.data.isSolved) {
        setIsSolved(true);
        setMessage(response.data.isCheckmate ? '✓ Checkmate! Puzzle solved!' : '✓ Correct! Puzzle solved!');
        setWaitingForStockfish(false);
        return true;
      }

      // Apply Stockfish's response move
      if (response.data.stockfishMove) {
        setTimeout(() => {
          const stockfishMove = chess.move(response.data.stockfishMove);
          if (stockfishMove) {
            setUserMoves(prev => [...prev, stockfishMove.san]);
            setChess(new Chess(chess.fen()));
          }
          setWaitingForStockfish(false);
        }, 500); // Small delay to show Stockfish is "thinking"
      } else {
        setWaitingForStockfish(false);
      }

      return true;
    } catch (err) {
      setMessage('Invalid move or error: ' + (err.response?.data?.message || err.message));
      setWaitingForStockfish(false);
      return false;
    }
  };

  const nextPuzzle = async () => {
    try {
      const response = await api.post(`/api/testpuzzle/next`,
        { testId }
      );

      if (response.data.completed) {
        setMessage('Test completed! Click Finish to see results.');
        return;
      }

      setPuzzleNumber(response.data.puzzleNumber);
      loadPuzzle(response.data.currentPuzzle);
    } catch (err) {
      setMessage('Error loading next puzzle: ' + (err.response?.data?.message || err.message));
    }
  };

  const finishTest = async () => {
    try {
      const response = await api.post(`/api/testpuzzle/finish`,
        { testId }
      );

      // Navigate to results page
      navigate(`/study/test/result/${response.data.resultId}`);
    } catch (err) {
      setMessage('Error finishing test: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMovesDisplay = () => {
    const moves = [];
    for (let i = 0; i < userMoves.length; i += 2) {
      moves.push({
        number: Math.floor(i / 2) + 1,
        white: userMoves[i] || '',
        black: userMoves[i + 1] || '',
      });
    }
    return moves;
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      color: '#ffffff',
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
      margin: '0',
      fontStyle: 'italic',
    },
    statsBar: {
      display: 'flex',
      justifyContent: 'space-around',
      background: 'rgba(23, 23, 23, 0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '30px',
      gap: '20px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    },
    statItem: {
      textAlign: 'center',
    },
    statLabel: {
      fontSize: '14px',
      color: '#9ca3af',
      marginBottom: '8px',
      fontWeight: '600',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#06b6d4',
      textShadow: '0 2px 10px rgba(6, 182, 212, 0.3)',
    },
    mainContent: {
      display: 'flex',
      gap: '30px',
      alignItems: 'flex-start',
    },
    leftSection: {
      flex: '1',
    },
    chessboardContainer: {
      maxWidth: '600px',
      margin: '0 auto',
      position: 'relative',
    },
    rightSection: {
      flex: '0 0 350px',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#67e8f9',
      marginBottom: '15px',
    },
    movesList: {
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.8',
      maxHeight: '300px',
      overflowY: 'auto',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    moveRow: {
      marginBottom: '4px',
      display: 'flex',
      gap: '12px',
      color: '#ffffff',
    },
    moveNumber: {
      minWidth: '30px',
      fontWeight: '600',
      color: '#9ca3af',
    },
    whiteMove: {
      minWidth: '70px',
      color: '#ffffff',
    },
    blackMove: {
      minWidth: '70px',
      color: '#9ca3af',
    },
    message: {
      padding: '15px',
      background: isSolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
      color: isSolved ? '#10b981' : '#06b6d4',
      borderRadius: '10px',
      marginBottom: '20px',
      fontWeight: '600',
      textAlign: 'center',
      border: isSolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    },
    button: {
      flex: '1',
      padding: '12px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    nextButton: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
    },
    finishButton: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '16px',
      color: '#9ca3af',
    },
    waitingOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#67e8f9',
      padding: '15px 30px',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      zIndex: '10',
      pointerEvents: 'none',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(6, 182, 212, 0.3)',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading test...</div>
        </div>
      </div>
    );
  }

  if (!currentPuzzle) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>No puzzles available</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Test Mode: {studyTitle}</h1>
          <p style={styles.subtitle}>Solve puzzles with Stockfish as your opponent</p>
        </div>

        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Puzzle</div>
            <div style={styles.statValue}>{puzzleNumber} / {totalPuzzles}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Total Time</div>
            <div style={styles.statValue}>{formatTime(timer)}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Puzzle Time</div>
            <div style={styles.statValue}>{formatTime(puzzleTimer)}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Attempts</div>
            <div style={styles.statValue}>{attempts}</div>
          </div>
        </div>

        {message && <div style={styles.message}>{message}</div>}

        <div style={styles.mainContent}>
          <div style={styles.leftSection}>
            <div ref={boardRef} style={{ ...styles.chessboardContainer, width: '100%' }}>
              {waitingForStockfish && (
                <div style={styles.waitingOverlay}>
                  Stockfish is thinking...
                </div>
              )}
              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                boardWidth={boardSize}
                draggable={!isSolved && !waitingForStockfish}
                showCoordinates={true}
              />
            </div>
          </div>

          <div style={styles.rightSection}>
            <h3 style={styles.sectionTitle}>Your Moves</h3>
            <div style={styles.movesList}>
              {userMoves.length === 0 ? (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Make your first move!
                </div>
              ) : (
                formatMovesDisplay().map((move, index) => (
                  <div key={index} style={styles.moveRow}>
                    <span style={styles.moveNumber}>{move.number}.</span>
                    <span style={styles.whiteMove}>{move.white}</span>
                    <span style={styles.blackMove}>{move.black}</span>
                  </div>
                ))
              )}
            </div>

            <div style={styles.buttonGroup}>
              {isSolved && puzzleNumber < totalPuzzles && (
                <button
                  style={{ ...styles.button, ...styles.nextButton }}
                  onClick={nextPuzzle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  Next Puzzle →
                </button>
              )}
              {(isSolved || puzzleNumber === totalPuzzles) && (
                <button
                  style={{ ...styles.button, ...styles.finishButton }}
                  onClick={finishTest}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  Finish Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyTest;