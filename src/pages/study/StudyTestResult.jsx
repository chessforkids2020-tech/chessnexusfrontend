import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import api from '../../api';
import useResponsiveBoardSize from '../../hooks/useResponsiveBoardSize';

const StudyTestResult = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();

  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 480, 360);
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPuzzle, setExpandedPuzzle] = useState(null);
  const [puzzlePosition, setPuzzlePosition] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [chessGame, setChessGame] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const response = await api.get(`/api/testpuzzle/result/${resultId}`);
      setResult(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load test results');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGrade = (percentage) => {
    // New thresholds:
    // >= 80 => A+
    // 65 - 79 => A
    // 50 - 64 => B
    // 35 - 49 => C
    // 20 - 34 => D
    // < 20 => F
    if (percentage >= 80) return { grade: 'A+', color: '#10b981' };
    if (percentage >= 65) return { grade: 'A', color: '#10b981' };
    if (percentage >= 50) return { grade: 'B', color: '#06b6d4' };
    if (percentage >= 35) return { grade: 'C', color: '#fbbf24' };
    if (percentage >= 20) return { grade: 'D', color: '#f59e0b' };
    return { grade: 'F', color: '#ef4444' };
  };

  const handleViewPuzzle = (puzzle) => {
    const game = new Chess(puzzle.fen);
    setChessGame(game);
    setPuzzlePosition(puzzle.fen);
    setMoveIndex(0);
    setExpandedPuzzle(puzzle);
  };

  const handleCloseModal = () => {
    setExpandedPuzzle(null);
    setChessGame(null);
    setPuzzlePosition('');
    setMoveIndex(0);
  };

  const handleNextMove = () => {
    if (!chessGame || !expandedPuzzle) return;
    
    const moves = expandedPuzzle.solutionUCI.trim().split(' ');
    if (moveIndex < moves.length) {
      const game = new Chess(expandedPuzzle.fen);
      
      // Apply all moves up to current index + 1
      for (let i = 0; i <= moveIndex; i++) {
        try {
          game.move({ from: moves[i].slice(0, 2), to: moves[i].slice(2, 4), promotion: 'q' });
        } catch (e) {
        }
      }
      
      setChessGame(game);
      setPuzzlePosition(game.fen());
      setMoveIndex(moveIndex + 1);
    }
  };

  const handlePrevMove = () => {
    if (!expandedPuzzle || moveIndex === 0) return;
    
    const game = new Chess(expandedPuzzle.fen);
    const moves = expandedPuzzle.solutionUCI.trim().split(' ');
    
    // Apply all moves up to current index - 1
    for (let i = 0; i < moveIndex - 1; i++) {
      try {
        game.move({ from: moves[i].slice(0, 2), to: moves[i].slice(2, 4), promotion: 'q' });
      } catch (e) {
      }
    }
    
    setChessGame(game);
    setPuzzlePosition(game.fen());
    setMoveIndex(moveIndex - 1);
  };

  const handleResetPosition = () => {
    if (!expandedPuzzle) return;
    const game = new Chess(expandedPuzzle.fen);
    setChessGame(game);
    setPuzzlePosition(expandedPuzzle.fen);
    setMoveIndex(0);
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
      maxWidth: '1000px',
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
      marginBottom: '10px',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
      fontStyle: 'italic',
    },
    gradeSection: {
      textAlign: 'center',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '30px',
      marginBottom: '25px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    gradeCircle: {
      width: '140px',
      height: '140px',
      borderRadius: '50%',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '50px',
      fontWeight: '700',
      color: '#ffffff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    },
    percentageText: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '8px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
      marginBottom: '25px',
    },
    statCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
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
    detailsSection: {
      marginTop: '25px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#67e8f9',
      marginBottom: '15px',
    },
    attemptsList: {
      maxHeight: '350px',
      overflowY: 'auto',
    },
    attemptCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '15px',
      marginBottom: '12px',
      borderLeft: '4px solid',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    attemptHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: '14px',
    },
    attemptMoves: {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '6px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginTop: '30px',
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#ffffff',
    },
    secondaryButton: {
      background: 'rgba(23, 23, 23, 0.7)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '16px',
      color: '#9ca3af',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: 'rgba(23, 23, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#67e8f9',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '5px 10px',
      transition: 'color 0.3s ease',
    },
    chessboardContainer: {
      marginBottom: '20px',
    },
    moveControls: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      marginBottom: '15px',
    },
    moveButton: {
      padding: '10px 20px',
      background: 'rgba(6, 182, 212, 0.2)',
      border: '1px solid rgba(6, 182, 212, 0.5)',
      borderRadius: '8px',
      color: '#06b6d4',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    moveInfo: {
      background: 'rgba(23, 23, 23, 0.7)',
      borderRadius: '12px',
      padding: '15px',
      fontSize: '13px',
      color: '#9ca3af',
    },
    viewButton: {
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      border: 'none',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px',
      transition: 'all 0.3s ease',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading results...</div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>{error || 'No results found'}</div>
        </div>
      </div>
    );
  }

  // Map the result fields correctly - use puzzlesAttempted for accuracy calculation
  const puzzlesSolved = result.puzzlesSolved || result.puzzlesCorrect || 0;
  const puzzlesAttempted = result.puzzlesAttempted || result.puzzlesSolved || 1;
  const totalPuzzles = result.totalPuzzles || puzzlesAttempted;
  const accuracy = result.percentage || Math.round((puzzlesSolved / puzzlesAttempted) * 100);
  const gradeInfo = getGrade(accuracy);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Test Results</h1>
          <p style={styles.subtitle}>
            Study: {result.studyTitle || 'Unknown Study'}
          </p>
        </div>

        <div style={styles.gradeSection}>
          <div style={{ ...styles.gradeCircle, background: gradeInfo.color }}>
            {gradeInfo.grade}
          </div>
          <div style={styles.percentageText}>{accuracy}% Accuracy</div>
          <p style={{ color: '#9ca3af', margin: 0 }}>
            You solved {puzzlesSolved} out of {puzzlesAttempted} attempted
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Score</div>
            <div style={styles.statValue}>{result.totalPoints || result.score || 0}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Puzzles Attempted</div>
            <div style={styles.statValue}>{puzzlesAttempted}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Time</div>
            <div style={styles.statValue}>{formatTime(result.totalTime || 0)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Avg Time/Puzzle</div>
            <div style={styles.statValue}>
              {puzzlesAttempted > 0 ? formatTime(Math.floor((result.totalTime || 0) / puzzlesAttempted)) : '0:00'}
            </div>
          </div>
        </div>

        <div style={styles.detailsSection}>
          <h2 style={styles.sectionTitle}>Review - Puzzles You Attempted</h2>
          
          {/* Correct Puzzles Section */}
          {result.correctPuzzles && result.correctPuzzles.length > 0 && (
            <div style={{marginBottom: '25px'}}>
              <h3 style={{...styles.sectionTitle, fontSize: '18px', color: '#10b981'}}>✓ Correct Puzzles ({result.correctPuzzles.length})</h3>
              <div style={styles.attemptsList}>
                {result.correctPuzzles.map((puzzle, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.attemptCard,
                      borderLeftColor: '#10b981',
                    }}
                  >
                    <div style={styles.attemptHeader}>
                      <span>Puzzle #{puzzle.puzzleNumber}</span>
                      <span style={{ color: '#10b981' }}>
                        ✓ Correct
                      </span>
                    </div>
                    <button
                      style={styles.viewButton}
                      onClick={() => handleViewPuzzle(puzzle)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                      }}
                    >
                      🎯 Click to View Position & Solution
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wrong Puzzles Section */}
          {(!result.wrongPuzzles || result.wrongPuzzles.length === 0) ? (
            result.correctPuzzles && result.correctPuzzles.length > 0 ? null : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#10b981' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>Perfect Score!</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  You didn't make any mistakes. Excellent work!
                </div>
              </div>
            )
          ) : (
            <div>
              <h3 style={{...styles.sectionTitle, fontSize: '18px', color: '#ef4444'}}>✗ Wrong Puzzles ({result.wrongPuzzles.length})</h3>
              <div style={styles.attemptsList}>
                {result.wrongPuzzles.map((puzzle, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.attemptCard,
                      borderLeftColor: '#ef4444',
                    }}
                  >
                    <div style={styles.attemptHeader}>
                      <span>Puzzle #{puzzle.puzzleNumber}</span>
                      <span style={{ color: '#ef4444' }}>
                        ✗ Incorrect
                      </span>
                    </div>
                    <div style={styles.attemptMoves}>
                      <div><strong style={{color: '#ef4444'}}>Your move:</strong> {puzzle.wrongMove}</div>
                      <div><strong style={{color: '#10b981'}}>Expected move:</strong> {puzzle.expectedMove}</div>
                    </div>
                    <button
                      style={styles.viewButton}
                      onClick={() => handleViewPuzzle(puzzle)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                      }}
                    >
                      🎯 Click to View Position & Solution
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate('/study')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            }}
          >
            Back to Studies
          </button>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Home
          </button>
        </div>
      </div>

      {/* Puzzle Review Modal */}
      {expandedPuzzle && (
        <div style={styles.modal} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Puzzle #{expandedPuzzle.puzzleNumber} - Review</h3>
              <button
                style={styles.closeButton}
                onClick={handleCloseModal}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                ✕
              </button>
            </div>

            <div ref={boardRef} style={{ ...styles.chessboardContainer, width: '100%' }}>
              <Chessboard
                position={puzzlePosition}
                orientation={expandedPuzzle.playerColor === 'w' ? 'white' : 'black'}
                draggable={false}
                boardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
                boardWidth={boardSize}
              />
            </div>

            <div style={styles.moveControls}>
              <button
                style={styles.moveButton}
                onClick={handleResetPosition}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ⟲ Reset
              </button>
              <button
                style={styles.moveButton}
                onClick={handlePrevMove}
                disabled={moveIndex === 0}
                onMouseEnter={(e) => {
                  if (moveIndex > 0) {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ← Previous
              </button>
              <button
                style={styles.moveButton}
                onClick={handleNextMove}
                disabled={moveIndex >= expandedPuzzle.solutionUCI.trim().split(' ').length}
                onMouseEnter={(e) => {
                  if (moveIndex < expandedPuzzle.solutionUCI.trim().split(' ').length) {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Next →
              </button>
            </div>

            <div style={styles.moveInfo}>
              <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                Move {moveIndex} / {expandedPuzzle.solutionUCI.trim().split(' ').length}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{color: '#ef4444'}}>Your move:</strong> {expandedPuzzle.wrongMove}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{color: '#10b981'}}>Expected move:</strong> {expandedPuzzle.expectedMove}
              </div>
              <div>
                <strong style={{color: '#ffffff'}}>Full solution:</strong> {expandedPuzzle.solutionUCI}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyTestResult;
