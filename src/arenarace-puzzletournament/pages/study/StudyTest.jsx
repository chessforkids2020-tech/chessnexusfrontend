import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';

const API = import.meta.env.VITE_API_URL;

const StudyTest = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  
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
      
      // Get study title
      const studiesResponse = await api.get(`/api/study/all`);
      const study = studiesResponse.data.find(s => s._id === studyId);
      if (study) setStudyTitle(study.title);

      // Start test
      const response = await api.post(`/api/study/test/start`, { studyId });

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
      const response = await api.post(`/api/study/test/move`,
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
      const response = await api.post(`/api/study/test/next`,
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
      const response = await api.post(`/api/study/test/finish`,
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1400px',
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
      fontSize: '32px',
      fontWeight: '800',
      color: '#1a5f1a',
      margin: '0 0 10px 0',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
      margin: '0',
    },
    statsBar: {
      display: 'flex',
      justifyContent: 'space-around',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      gap: '20px',
    },
    statItem: {
      textAlign: 'center',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '5px',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1a5f1a',
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
    },
    rightSection: {
      flex: '0 0 350px',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#1a5f1a',
      marginBottom: '15px',
    },
    movesList: {
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.8',
      maxHeight: '300px',
      overflowY: 'auto',
      background: '#fff',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
    },
    moveRow: {
      marginBottom: '4px',
      display: 'flex',
      gap: '12px',
    },
    moveNumber: {
      minWidth: '30px',
      fontWeight: '600',
      color: '#666',
    },
    whiteMove: {
      minWidth: '70px',
    },
    blackMove: {
      minWidth: '70px',
    },
    message: {
      padding: '15px',
      background: isSolved ? '#d4edda' : '#fff3cd',
      color: isSolved ? '#155724' : '#856404',
      borderRadius: '8px',
      marginBottom: '20px',
      fontWeight: '600',
      textAlign: 'center',
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
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    nextButton: {
      background: '#28a745',
      color: '#fff',
    },
    finishButton: {
      background: '#dc3545',
      color: '#fff',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666',
    },
    waitingOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '20px 40px',
      borderRadius: '10px',
      fontSize: '18px',
      fontWeight: '600',
      zIndex: 1000,
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
            <div style={styles.chessboardContainer}>
              {waitingForStockfish && (
                <div style={styles.waitingOverlay}>
                  Stockfish is thinking...
                </div>
              )}
              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                boardWidth={600}
                draggable={!isSolved && !waitingForStockfish}
                showCoordinates={true}
              />
            </div>
          </div>

          <div style={styles.rightSection}>
            <h3 style={styles.sectionTitle}>Your Moves</h3>
            <div style={styles.movesList}>
              {userMoves.length === 0 ? (
                <div style={{ color: '#999', fontStyle: 'italic' }}>
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
                >
                  Next Puzzle →
                </button>
              )}
              {(isSolved || puzzleNumber === totalPuzzles) && (
                <button
                  style={{ ...styles.button, ...styles.finishButton }}
                  onClick={finishTest}
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
