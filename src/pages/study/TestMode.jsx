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
  const studyId = searchParams.get('studyId');
  const chapterId = searchParams.get('chapterId');

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

  // Board resize state & refs (for manual drag resize)
  const [boardWidth, setBoardWidth] = useState(400);
  const rightPanelRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const resizingRef = useRef(false);

  // Manual resize handlers (touch + mouse)
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
    const rightPanelWidth = rightPanelRef.current ? rightPanelRef.current.clientWidth - 40 : 800;
    const maxWidth = Math.min(800, rightPanelWidth);
    const newWidth = Math.max(300, Math.min(maxWidth, startWidthRef.current + deltaX));
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
    const startTest = async () => {
      try {
        // Start test from testpuzzle endpoint
        const response = await api.post(`/api/testpuzzle/start`, {
          studyId,
          chapterId,
          timeLimit
        });

        setTestId(response.data.testId);
        setTotalPuzzles(response.data.totalPuzzles);
        // Set current puzzle number if provided by server
        setPuzzleNumber(response.data.currentPuzzle?.puzzleNumber ?? (response.data.puzzleIndex ? response.data.puzzleIndex + 1 : 1));
        loadPuzzle(response.data.currentPuzzle);
        setTestStarted(true);
      } catch (err) {
        setError('Failed to start test: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [studyId, chapterId]);

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
    const newChess = new Chess(puzzle.fen || puzzle.puzzleFen);
    setChess(newChess);
    setCurrentPuzzle(puzzle);
    setIsSolved(false);
    setMessage('');
    setWaitingForStockfish(false);
  };

  const handleMove = async (sourceSquare, targetSquare, promotion) => {
    if (isSolved || waitingForStockfish || timeLeft <= 0) return false;

    try {
      // Check if it's the user's turn (based on playerColor)
      const currentTurn = chess.turn(); // 'w' or 'b'
      const playerTurn = currentPuzzle?.playerColor === 'white' ? 'w' : 'b';
      
      if (currentTurn !== playerTurn) {
        // Not user's turn
        return false;
      }

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
      const response = await api.post(`/api/testpuzzle/move`, {
        testId,
        moveUCI: move.from + move.to + (move.promotion || '')
      });

      // Handle wrong move - skip to next puzzle
      if (response.data.wrongMove) {
        setMessage('✗ Wrong move! Moving to next puzzle...');
        setWaitingForStockfish(false);
        
        if (response.data.completed) {
          // Test completed
          setTimeout(() => {
            finishTest();
          }, 1500);
        } else if (response.data.skippedToNext) {
          // Load next puzzle
          setTimeout(() => {
            loadPuzzle(response.data.nextPuzzle);
            setPuzzleNumber(response.data.nextPuzzle?.puzzleNumber ?? (response.data.puzzleIndex ? response.data.puzzleIndex + 1 : puzzleNumber + 1));
            setMessage('');
          }, 1500);
        }
        
        return false;
      }

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

      // Apply opponent's response move
      if (response.data.stockfishMoveSAN) {
        setTimeout(() => {
          const opponentMove = chess.move(response.data.stockfishMoveSAN);
          if (opponentMove) {
            setChess(new Chess(chess.fen()));
          }
          setWaitingForStockfish(false);
        }, 500); // Small delay to show opponent is "thinking"
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
      const response = await api.post(`/api/testpuzzle/next`, {
        testId
      });

      if (response.data.completed) {
        finishTest();
        return;
      }

      // Server returns currentPuzzle.puzzleNumber; fallback to puzzleIndex
      setPuzzleNumber(response.data.currentPuzzle?.puzzleNumber ?? (response.data.puzzleIndex ? response.data.puzzleIndex + 1 : puzzleNumber + 1));
      loadPuzzle(response.data.currentPuzzle);
    } catch (err) {
      setMessage('Error loading next puzzle');
    }
  };

  const finishTest = async () => {
    try {
      const response = await api.post(`/api/testpuzzle/finish`, {
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

  // Get current turn for "To Move" display
  const getCurrentTurn = () => {
    if (!chess) return '';
    return chess.turn() === 'w' ? 'White' : 'Black';
  };

  // Normalize player orientation - accept 'black' or 'b'
  const boardOrientation = (currentPuzzle && (currentPuzzle.playerColor === 'black' || currentPuzzle.playerColor === 'b')) ? 'black' : 'white';

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'rgba(23, 23, 23, 0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '16px',
      padding: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      color: '#ffffff',
      position: 'relative',
      zIndex: '1',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '30% 70%',
      gap: '24px',
      alignItems: 'start',
    },
    
    // Left card - 30%
    leftCard: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '30px 20px',
      borderRadius: '12px',
      background: 'rgba(23, 23, 23, 0.6)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    
    // Right card - 70%
    rightCard: {
      padding: '30px',
      borderRadius: '12px',
      background: 'rgba(23, 23, 23, 0.6)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    
    timer: {
      fontSize: '48px',
      fontWeight: '700',
      color: timeLeft < 60 ? '#ef4444' : '#06b6d4',
      marginBottom: '10px',
      fontFamily: 'monospace',
      textShadow: timeLeft < 60 ? '0 2px 10px rgba(239, 68, 68, 0.5)' : '0 2px 10px rgba(6, 182, 212, 0.3)',
    },
    infoSection: {
      width: '100%',
      marginBottom: '30px',
      textAlign: 'center',
    },
    puzzleCount: {
      fontSize: '20px',
      color: '#e5e7eb',
      marginBottom: '15px',
      fontWeight: '600',
    },
    toMove: {
      fontSize: '18px',
      color: '#9ca3af',
      fontWeight: '500',
      padding: '12px 24px',
      background: 'rgba(6, 182, 212, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      display: 'inline-block',
    },
    buttonSection: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    skipButton: {
      width: '100%',
      padding: '14px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    backButton: {
      width: '100%',
      padding: '14px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '16px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      fontSize: '16px',
      padding: '40px',
    },
    message: {
      padding: '15px',
      background: isSolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
      color: isSolved ? '#10b981' : '#ef4444',
      borderRadius: '10px',
      marginBottom: '20px',
      fontWeight: '600',
      textAlign: 'center',
      border: isSolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
      width: '100%',
    },
    waitingOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.85)',
      color: '#67e8f9',
      padding: '15px 30px',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '600',
      zIndex: '10',
      pointerEvents: 'none',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(6, 182, 212, 0.3)',
    },
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
            style={{
              padding: '10px 20px',
              background: 'rgba(23, 23, 23, 0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '20px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
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
        <div style={styles.gridContainer}>

          {/* Left card - 30% - Info & Controls */}
          <div style={styles.leftCard}>
            {/* Timer */}
            <div style={styles.timer}>{formatTime(timeLeft)}</div>
            
            {/* Info Section */}
            <div style={styles.infoSection}>
              <div style={styles.puzzleCount}>
                Puzzle {puzzleNumber}
              </div>
              
              <div style={styles.toMove}>
                {getCurrentTurn()} to Move
              </div>
            </div>

            {/* Message */}
            {message && <div style={styles.message}>{message}</div>}

            {/* Buttons */}
            <div style={styles.buttonSection}>
              <button 
                style={styles.skipButton}
                onClick={nextPuzzle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Skip Puzzle
              </button>

              <button
                style={styles.backButton}
                onClick={() => navigate('/study')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Back to Studies
              </button>
            </div>
          </div>

          {/* Right card - 70% - Chessboard */}
          <div style={styles.rightCard} ref={rightPanelRef}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' }}>


              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                boardWidth={boardWidth}
                draggable={!isSolved && !waitingForStockfish && timeLeft > 0}
                showCoordinates={true}
                orientation={boardOrientation}
              />

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
                  opacity: 0.9,
                  touchAction: 'none'
                }}
                title="Drag to resize"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TestMode;
