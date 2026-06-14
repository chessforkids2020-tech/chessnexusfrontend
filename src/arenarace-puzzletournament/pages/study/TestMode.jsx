import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';

const API = import.meta.env.VITE_API_URL;

const TestMode = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const timeLimit = parseInt(searchParams.get('time')) || 300;
  const studyType = searchParams.get('type');

  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const [chess, setChess] = useState(new Chess());
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [testStarted, setTestStarted] = useState(false);
  const [testId, setTestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waitingForStockfish, setWaitingForStockfish] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const startTest = async () => {
      try {
        // Start Stockfish test (general or by type)
        const response = await api.post(`/api/study/test/start`, {
          studyType
        });

        setTestId(response.data.testId);
        setTotalPuzzles(response.data.totalPuzzles);
        loadPuzzle(response.data.currentPuzzle);
        setTestStarted(true);
      } catch (err) {
        setError('Failed to start test: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [studyType]);

  useEffect(() => {
    if (testStarted && timeLeft > 0) {
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
    }
  }, [testStarted, timeLeft]);

  const loadPuzzle = (puzzle) => {
    const newChess = new Chess(puzzle.puzzleFen);
    setChess(newChess);
    setCurrentPuzzle(puzzle);
    setIsSolved(false);
    setMessage('');
    setWaitingForStockfish(false);
  };

  const handleMove = async (sourceSquare, targetSquare, promotion) => {
    if (isSolved || waitingForStockfish || timeLeft <= 0) return false;

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || 'q'
      });

      if (!move) return false;

      // Update board immediately
      setChess(new Chess(chess.fen()));
      setWaitingForStockfish(true);

      // Submit move to backend
      const response = await api.post(`/api/study/test/move`, {
        testId,
        move: move.san
      });

      if (response.data.isSolved) {
        setIsSolved(true);
        setMessage(response.data.isCheckmate ? '✓ Checkmate! Puzzle solved!' : '✓ Correct! Puzzle solved!');
        setWaitingForStockfish(false);
        
        // Auto-advance after a short delay
        setTimeout(() => {
          nextPuzzle();
        }, 1500);
        
        return true;
      }

      // Apply Stockfish's response move
      if (response.data.stockfishMove) {
        setTimeout(() => {
          const stockfishMove = chess.move(response.data.stockfishMove);
          if (stockfishMove) {
            setChess(new Chess(chess.fen()));
          }
          setWaitingForStockfish(false);
        }, 500); // Small delay to show Stockfish is "thinking"
      } else {
        setWaitingForStockfish(false);
      }

      return true;
    } catch (err) {
      setWaitingForStockfish(false);
      // Undo move on error
      chess.undo();
      setChess(new Chess(chess.fen()));
      return false;
    }
  };

  const nextPuzzle = async () => {
    try {
      const response = await api.post(`/api/study/test/next`, {
        testId
      });

      if (response.data.completed) {
        finishTest();
        return;
      }

      setPuzzleNumber(response.data.puzzleNumber);
      loadPuzzle(response.data.currentPuzzle);
    } catch (err) {
      setMessage('Error loading next puzzle');
    }
  };

  const finishTest = async () => {
    try {
      const response = await api.post(`/api/study/test/finish`, {
        testId
      });

      navigate(`/study/test/result/${response.data.resultId}`);
    } catch (err) {
      setError('Failed to finish test');
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    timer: {
      fontSize: '48px',
      fontWeight: '800',
      color: timeLeft < 60 ? '#dc2626' : '#1a5f1a',
      marginBottom: '20px',
    },
    progress: {
      fontSize: '18px',
      color: '#666',
      marginBottom: '30px',
    },
    chessboardContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '30px',
      position: 'relative',
    },
    loading: {
      textAlign: 'center',
      color: '#666',
      fontSize: '18px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: '#dc2626',
      fontSize: '18px',
      padding: '40px',
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
    waitingOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '15px 30px',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      zIndex: 10,
      pointerEvents: 'none',
    },
    skipButton: {
      padding: '10px 20px',
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      marginTop: '20px',
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Starting test with Stockfish...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
          <button 
            onClick={() => navigate('/study/test')}
            style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.timer}>{formatTime(timeLeft)}</div>
        <div style={styles.progress}>
          Puzzle {puzzleNumber} of {totalPuzzles}
        </div>
        
        {message && <div style={styles.message}>{message}</div>}

        <div style={styles.chessboardContainer}>
          {waitingForStockfish && (
            <div style={styles.waitingOverlay}>
              Stockfish is thinking...
            </div>
          )}
          <Chessboard
            position={chess.fen()}
            onDrop={handleMove}
            boardWidth={400}
            draggable={!isSolved && !waitingForStockfish && timeLeft > 0}
            showCoordinates={true}
          />
        </div>

        <button style={styles.skipButton} onClick={nextPuzzle}>
          Skip Puzzle
        </button>
      </div>
    </div>
  );
};

export default TestMode;
