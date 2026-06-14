import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';

const UserTestResult = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // When the test was launched from a coach Study Test assignment, tailor the
  // result-page buttons accordingly.
  const assignmentId = searchParams.get('assignment') || null;
  const aStudyId   = searchParams.get('studyId') || null;
  const aChapterId = searchParams.get('chapterId') || null;
  const aTime      = searchParams.get('time') || null;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [reviewChess, setReviewChess] = useState(null);
  const [reviewPosition, setReviewPosition] = useState(null);
  const [boardOrientation, setBoardOrientation] = useState('white');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.get(`/api/testpuzzle/result/${resultId}`);
        setResult(response.data);
      } catch (err) {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply the bot's first move so the board starts from the user's perspective
  const applyBotFirstMove = (chess, solutionUCI) => {
    const moves = solutionUCI ? solutionUCI.trim().split(/\s+/) : [];
    if (moves.length > 0 && moves[0]) {
      const m = moves[0];
      chess.move({
        from: m.slice(0, 2),
        to: m.slice(2, 4),
        promotion: m.length === 5 ? m[4] : undefined,
      });
    }
  };

  const openPuzzleReview = (puzzle) => {
    setSelectedPuzzle(puzzle);
    setBoardOrientation('white');
    const chess = new Chess(puzzle.fen);
    applyBotFirstMove(chess, puzzle.solutionUCI);
    setReviewChess(chess);
    setReviewPosition(chess.fen());
  };

  const handleReviewMove = (sourceSquare, targetSquare) => {
    if (!reviewChess) return false;
    
    try {
      const move = reviewChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });
      
      if (move) {
        setReviewPosition(reviewChess.fen());
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const resetReviewPosition = () => {
    if (selectedPuzzle) {
      const chess = new Chess(selectedPuzzle.fen);
      applyBotFirstMove(chess, selectedPuzzle.solutionUCI);
      setReviewChess(chess);
      setReviewPosition(chess.fen());
    }
  };

  const getGrade = (percentage) => {
    // New thresholds:
    // >= 80 => A+
    // 65 - 79 => A
    // 50 - 64 => B
    // 35 - 49 => C
    // 20 - 34 => D
    // < 20 => F
    if (percentage >= 80) return { grade: 'A+', color: '#22c55e', emoji: '🏆' };
    if (percentage >= 65) return { grade: 'A', color: '#22c55e', emoji: '🌟' };
    if (percentage >= 50) return { grade: 'B', color: '#84cc16', emoji: '👍' };
    if (percentage >= 35) return { grade: 'C', color: '#eab308', emoji: '📈' };
    if (percentage >= 20) return { grade: 'D', color: '#f97316', emoji: '💪' };
    return { grade: 'F', color: '#ef4444', emoji: '📚' };
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
    },
    gradeCard: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '24px',
      padding: '40px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      textAlign: 'center',
      marginBottom: '30px',
    },
    gradeEmoji: {
      fontSize: '64px',
      marginBottom: '15px',
    },
    gradeText: {
      fontSize: '72px',
      fontWeight: '800',
      marginBottom: '10px',
    },
    percentage: {
      fontSize: '24px',
      color: '#9ca3af',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '15px',
      marginBottom: '30px',
    },
    statCard: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '16px',
      padding: '25px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      textAlign: 'center',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '5px',
    },
    statLabel: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    puzzlesCard: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '20px',
      padding: '25px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '30px',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '20px',
    },
    puzzlesList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '10px',
    },
    puzzleItem: {
      padding: '15px',
      borderRadius: '12px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '2px solid transparent',
    },
    puzzleSolved: {
      background: 'rgba(34, 197, 94, 0.2)',
      border: '2px solid rgba(34, 197, 94, 0.4)',
    },
    puzzleUnsolved: {
      background: 'rgba(239, 68, 68, 0.2)',
      border: '2px solid rgba(239, 68, 68, 0.4)',
    },
    puzzleNumber: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#fff',
    },
    puzzlePoints: {
      fontSize: '13px',
      marginTop: '5px',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: '#171717',
      borderRadius: '20px',
      padding: '30px',
      maxWidth: '700px',
      width: '90%',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      fontSize: '24px',
      cursor: 'pointer',
    },
    moveSection: {
      marginTop: '20px',
    },
    moveLabel: {
      fontSize: '14px',
      color: '#9ca3af',
      marginBottom: '8px',
    },
    moveCode: {
      fontFamily: 'monospace',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '12px',
      borderRadius: '8px',
      color: '#f59e0b',
      fontSize: '14px',
      wordBreak: 'break-all',
    },
    buttons: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
    },
    button: {
      padding: '16px 32px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      color: '#fff',
    },
    secondaryBtn: {
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      padding: '100px',
      fontSize: '18px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading results...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.loading, color: '#ef4444' }}>
          {error || 'Result not found'}
        </div>
      </div>
    );
  }

  const gradeInfo = getGrade(result.percentage);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎯 Test Complete!</h1>
          <p style={styles.subtitle}>
            {result.studyTitle} - {result.chapterTitle}
          </p>
        </div>

        {/* Grade Card */}
        <div style={styles.gradeCard}>
          <div style={styles.gradeEmoji}>{gradeInfo.emoji}</div>
          <div style={{ ...styles.gradeText, color: gradeInfo.color }}>
            {gradeInfo.grade}
          </div>
          <div style={styles.percentage}>
            {result.percentage}% Accuracy
          </div>
          <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
            {result.puzzlesSolved} correct out of {result.puzzlesAttempted || result.puzzlesSolved} attempted
          </div>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#22c55e' }}>
              {result.totalPoints}/{result.maxPoints}
            </div>
            <div style={styles.statLabel}>Score</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{result.puzzlesAttempted || result.puzzlesSolved}/{result.totalPuzzles}</div>
            <div style={styles.statLabel}>Puzzles Attempted</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {result.puzzlesSolved}
            </div>
            <div style={styles.statLabel}>Puzzles Solved</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{formatTime(result.totalTime)}</div>
            <div style={styles.statLabel}>Time Taken</div>
          </div>
        </div>

        {/* Puzzles Review — only puzzles the student actually attempted.
            Fall back to all attempts for legacy results that predate the
            `attempted` flag (so they don't render an empty list). */}
        {(() => {
        const attemptsAll = result.attempts || [];
        const flagged = attemptsAll.filter(a => a.attempted);
        // Prefer the persisted `attempted` flag. For legacy results saved before
        // that flag existed, fall back to the first N (= puzzlesAttempted) so we
        // still don't dump the whole chapter.
        const n = result.puzzlesAttempted || result.puzzlesSolved || 0;
        const reviewList = flagged.length > 0
          ? flagged
          : (n > 0 ? attemptsAll.slice(0, n) : attemptsAll);
        return (
        <div style={styles.puzzlesCard}>
          <div style={styles.cardTitle}>📋 Puzzle Review (Click to view details)</div>
          <div style={styles.puzzlesList}>
            {reviewList.map((attempt, index) => (
              <div
                key={index}
                style={{
                  ...styles.puzzleItem,
                  ...(attempt.solved ? styles.puzzleSolved : styles.puzzleUnsolved)
                }}
                onClick={() => openPuzzleReview(attempt)}
              >
                <div style={styles.puzzleNumber}>#{attempt.puzzleNumber}</div>
                <div style={{
                  ...styles.puzzlePoints,
                  color: attempt.solved ? '#86efac' : '#fca5a5'
                }}>
                  {attempt.solved ? '+2 pts' : '0 pts'}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
        })()}

        {/* Action Buttons */}
        <div style={styles.buttons}>
          {assignmentId ? (
            <>
              {/* Coach assignment: retake uses the coach's fixed time (no time
                  picker, no "choose different study"). */}
              <button
                style={{ ...styles.button, ...styles.primaryBtn }}
                onClick={() => navigate(
                  `/test/play/${aStudyId || result.studyId}/${aChapterId || result.chapterId}?time=${aTime || result.timeLimit}&assignment=${assignmentId}`
                )}
              >
                🔄 Try Again
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryBtn }}
                onClick={() => navigate('/my-coach')}
              >
                📋 Back to Assignments
              </button>
            </>
          ) : (
            <>
              <button
                style={{ ...styles.button, ...styles.primaryBtn }}
                onClick={() => navigate(`/test/time/${result.studyId}/${result.chapterId}`)}
              >
                🔄 Try Again
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryBtn }}
                onClick={() => navigate('/test')}
              >
                📚 Choose Different Study
              </button>
            </>
          )}
        </div>

        {/* Puzzle Detail Modal */}
        {selectedPuzzle && (
          <div style={styles.modal} onClick={() => setSelectedPuzzle(null)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalTitle}>
                <span>
                  Puzzle #{selectedPuzzle.puzzleNumber} 
                  {selectedPuzzle.solved ? ' ✓' : ' ✗'}
                </span>
                <button 
                  style={styles.closeBtn}
                  onClick={() => setSelectedPuzzle(null)}
                >
                  Ã—
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <Chessboard
                    position={reviewPosition || selectedPuzzle.fen}
                    boardWidth={280}
                    draggable={true}
                    onDrop={handleReviewMove}
                    orientation={boardOrientation}
                  />
                  <button
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '10px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '8px',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => setBoardOrientation(o => o === 'white' ? 'black' : 'white')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    }}
                  >
                    ⇅ Flip Board ({boardOrientation === 'white' ? 'White' : 'Black'} view)
                  </button>
                  <button
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '10px',
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      borderRadius: '8px',
                      color: '#06b6d4',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={resetReviewPosition}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                    }}
                  >
                    🔄 Reset Position
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  {/* Split solution: first move = bot, rest = user moves */}
                  {(() => {
                    const allMoves = selectedPuzzle.solutionUCI ? selectedPuzzle.solutionUCI.trim().split(/\s+/) : [];
                    const botMove = allMoves[0] || '—';
                    const userSolution = allMoves.slice(1).join(' ') || '—';
                    return (
                      <>
                        <div style={styles.moveSection}>
                          <div style={{ ...styles.moveLabel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>BOT</span>
                            Opening Move:
                          </div>
                          <div style={{ ...styles.moveCode, color: '#f87171' }}>{botMove}</div>
                        </div>
                        <div style={styles.moveSection}>
                          <div style={{ ...styles.moveLabel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>YOU</span>
                            Correct Solution:
                          </div>
                          <div style={{ ...styles.moveCode, color: '#86efac' }}>{userSolution}</div>
                        </div>
                        <div style={styles.moveSection}>
                          <div style={styles.moveLabel}>Your Moves (UCI):</div>
                          <div style={styles.moveCode}>
                            {selectedPuzzle.userMovesUCI || 'No moves made'}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  <div style={styles.moveSection}>
                    <div style={styles.moveLabel}>Time Spent:</div>
                    <div style={{ color: '#fff', fontSize: '18px' }}>
                      {formatTime(selectedPuzzle.timeSpent)}
                    </div>
                  </div>
                  <div style={styles.moveSection}>
                    <div style={styles.moveLabel}>Points:</div>
                    <div style={{ 
                      color: selectedPuzzle.solved ? '#22c55e' : '#ef4444', 
                      fontSize: '24px',
                      fontWeight: '700'
                    }}>
                      {selectedPuzzle.points}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTestResult;
