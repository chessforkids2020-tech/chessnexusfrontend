import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';

const StudyPuzzleView = () => {
  const { studyId, chapterId } = useParams();
  const navigate = useNavigate();
  
  const [puzzles, setPuzzles] = useState([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [chess, setChess] = useState(new Chess());
  const [userMoves, setUserMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]); // Track full move history for undo/redo
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // Current position in history
  const [showSolution, setShowSolution] = useState(false);
  const [studyTitle, setStudyTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPuzzleList, setShowPuzzleList] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studyId, chapterId]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch study and chapter info
      const studyResponse = await api.get('/api/study/all');
      const study = studyResponse.data.find(s => s._id === studyId);
      if (study) setStudyTitle(study.title);

      const chaptersResponse = await api.get(`/api/study/${studyId}/chapters`);
      const chapter = chaptersResponse.data.find(c => c._id === chapterId);
      if (chapter) setChapterTitle(chapter.title);

      // Fetch puzzles for this chapter
      const puzzlesResponse = await api.get(`/api/study/chapters/${chapterId}/puzzles`);
      
      setPuzzles(puzzlesResponse.data || []);
      if ((puzzlesResponse.data || []).length > 0) {
        loadPuzzle(puzzlesResponse.data[0]);
      }
    } catch {
      setError('Failed to load puzzles');
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzle = (puzzle) => {
    const newChess = new Chess(puzzle.puzzleFen);
    setChess(newChess);
    setUserMoves([]);
    setMoveHistory([puzzle.puzzleFen]); // Start with initial position
    setCurrentMoveIndex(0);
    setShowSolution(false);
  };

  const handleMove = (sourceSquare, targetSquare, promotion) => {
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || 'q'
      });

      if (move) {
        const newMoves = [...userMoves, move.san];
        setUserMoves(newMoves);
        
        // Update move history - remove any future moves if we're not at the end
        const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
        newHistory.push(chess.fen());
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);
        
        return true;
      }
    } catch {
    }
    return false;
  };

  const moveBackward = () => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(newIndex);
      const newChess = new Chess(moveHistory[newIndex]);
      setChess(newChess);
      
      // Update user moves list
      const newUserMoves = userMoves.slice(0, newIndex);
      setUserMoves(newUserMoves);
    }
  };

  const moveForward = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(newIndex);
      const newChess = new Chess(moveHistory[newIndex]);
      setChess(newChess);
      
      // Restore user moves up to this point
      if (newIndex <= userMoves.length) {
        // If we're within the original moves, just update the display
        const newUserMoves = userMoves.slice(0, newIndex);
        setUserMoves(newUserMoves);
      }
    }
  };

  const selectPuzzle = (index) => {
    setCurrentPuzzleIndex(index);
    loadPuzzle(puzzles[index]);
  };

  const resetPosition = () => {
    if (puzzles[currentPuzzleIndex]) {
      loadPuzzle(puzzles[currentPuzzleIndex]);
    }
  };

  // Format moves for display - white and black on same line
  const formatMovesDisplay = () => {
    const moves = [];
    
    // Safety check - if no puzzle or no FEN, return empty
    if (!puzzles[currentPuzzleIndex]?.puzzleFen) {
      return moves;
    }
    
    const startingTurn = new Chess(puzzles[currentPuzzleIndex].puzzleFen).turn();
    let moveNumber = 1;
    
    // If puzzle starts with black to move, show empty white move
    if (startingTurn === 'b' && userMoves.length > 0) {
      moves.push({
        number: moveNumber,
        white: '...',
        black: userMoves[0],
      });
      moveNumber++;
      
      // Process remaining moves
      for (let i = 1; i < userMoves.length; i += 2) {
        moves.push({
          number: moveNumber,
          white: userMoves[i] || '',
          black: userMoves[i + 1] || '',
        });
        moveNumber++;
      }
    } else {
      // Puzzle starts with white to move
      for (let i = 0; i < userMoves.length; i += 2) {
        moves.push({
          number: moveNumber,
          white: userMoves[i] || '',
          black: userMoves[i + 1] || '',
        });
        moveNumber++;
      }
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
      maxWidth: '1600px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      padding: isMobile ? '10px' : '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px',
    },
    backButton: {
      padding: '8px 16px',
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginBottom: '15px',
    },
    toggleButton: {
      padding: '8px 16px',
      background: '#007bff',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginBottom: '15px',
      marginLeft: '10px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '800',
      color: '#1a5f1a',
      margin: '0 0 5px 0',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
      margin: '0',
    },
    mainContent: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      minHeight: '600px',
    },
    leftPanel: {
      flex: isMobile ? 'none' : '0 0 250px',
      display: isMobile && !showPuzzleList ? 'none' : 'block',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '15px',
      overflowY: 'auto',
      maxHeight: isMobile ? '300px' : '700px',
      position: isMobile ? 'absolute' : 'static',
      top: isMobile ? '60px' : 'auto',
      left: isMobile ? '10px' : 'auto',
      right: isMobile ? '10px' : 'auto',
      zIndex: isMobile ? 1000 : 'auto',
      boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
    },
    puzzleListTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#1a5f1a',
      marginBottom: '15px',
    },
    puzzleItem: {
      padding: '12px',
      background: '#fff',
      borderRadius: '8px',
      marginBottom: '10px',
      cursor: 'pointer',
      border: '2px solid #e9ecef',
      transition: 'all 0.2s ease',
    },
    puzzleItemActive: {
      background: '#1a5f1a',
      color: '#fff',
      borderColor: '#1a5f1a',
    },
    centerPanel: {
      flex: isMobile ? 'none' : '1',
      width: isMobile ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '10px' : '20px',
      order: isMobile ? -1 : 0, // Chessboard first on mobile
    },
    chessboardContainer: {
      marginBottom: '20px',
    },
    controlButtons: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px',
      flexWrap: 'wrap',
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    navigationButton: {
      padding: '10px 16px',
      background: '#007bff',
      color: '#fff',
      minWidth: '45px',
    },
    navigationButtonDisabled: {
      background: '#ccc',
      cursor: 'not-allowed',
      opacity: 0.6,
    },
    resetButton: {
      background: '#6c757d',
      color: '#fff',
    },
    solutionButton: {
      background: '#1a5f1a',
      color: '#fff',
    },
    rightPanel: {
      flex: isMobile ? 'none' : '0 0 350px',
      width: isMobile ? '100%' : 'auto',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      overflowY: 'auto',
      overflowX: 'hidden',
      maxHeight: isMobile ? 'none' : '700px',
      order: isMobile ? 1 : 0, // Below chessboard on mobile
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#1a5f1a',
      marginBottom: '10px',
      marginTop: '0',
    },
    movesContainer: {
      background: '#fff',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      minHeight: '150px',
      overflowX: 'hidden',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    movesList: {
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.8',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
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
    turnIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px',
      border: '2px solid #e9ecef',
    },
    kingIcon: {
      fontSize: '24px',
    },
    turnText: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    solutionContainer: {
      background: '#fff',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      overflowX: 'hidden',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    solutionMoves: {
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.8',
      color: '#1a5f1a',
      fontWeight: '600',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    descriptionContainer: {
      background: '#fff',
      borderRadius: '8px',
      padding: '15px',
      overflowX: 'hidden',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    },
    descriptionText: {
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#333',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      hyphens: 'auto',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666',
    },
    error: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#dc2626',
    },
    mobileOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 999,
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading puzzles...</div>
        </div>
      </div>
    );
  }

  if (error || puzzles.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button style={styles.backButton} onClick={() => navigate(`/study/learn/${studyId}`)}>
            ← Back to Chapters
          </button>
          <div style={styles.error}>{error || 'No puzzles available for this chapter'}</div>
        </div>
      </div>
    );
  }

  const currentPuzzle = puzzles[currentPuzzleIndex];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={styles.backButton} onClick={() => navigate(`/study/learn/${studyId}`)}>
              ← Back to Chapters
            </button>
            {isMobile && (
              <button style={styles.toggleButton} onClick={() => setShowPuzzleList(!showPuzzleList)}>
                {showPuzzleList ? 'Hide Puzzles' : 'Show Puzzles'}
              </button>
            )}
          </div>
          <h1 style={styles.title}>{studyTitle}</h1>
          <p style={styles.subtitle}>{chapterTitle}</p>
        </div>

        <div style={styles.mainContent}>
          {/* Mobile Overlay */}
          {isMobile && showPuzzleList && (
            <div 
              style={styles.mobileOverlay} 
              onClick={() => setShowPuzzleList(false)}
            />
          )}

          {/* Left Panel - Puzzles List */}
          <div style={styles.leftPanel}>
            <h3 style={styles.puzzleListTitle}>Puzzles</h3>
            {puzzles.map((puzzle, index) => (
              <div
                key={puzzle._id}
                style={{
                  ...styles.puzzleItem,
                  ...(index === currentPuzzleIndex ? styles.puzzleItemActive : {})
                }}
                onClick={() => selectPuzzle(index)}
              >
                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                  {puzzle.name || `Puzzle ${index + 1}`}
                </div>
              </div>
            ))}
          </div>

          {/* Center Panel - Chessboard */}
          <div style={styles.centerPanel}>
            <div style={styles.chessboardContainer}>
              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                boardWidth={isMobile ? Math.min(window.innerWidth - 40, 400) : 500}
                draggable={true}
                showCoordinates={true}
              />
            </div>
            <div style={styles.controlButtons}>
              <button
                style={{
                  ...styles.button,
                  ...styles.navigationButton,
                  ...(currentMoveIndex <= 0 ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveBackward}
                disabled={currentMoveIndex <= 0}
                title="Undo last move"
              >
                ← Back
              </button>
              <button
                style={{
                  ...styles.button,
                  ...styles.navigationButton,
                  ...(currentMoveIndex >= moveHistory.length - 1 ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveForward}
                disabled={currentMoveIndex >= moveHistory.length - 1}
                title="Redo move"
              >
                Forward →
              </button>
              <button
                style={{ ...styles.button, ...styles.resetButton }}
                onClick={resetPosition}
              >
                Reset Position
              </button>
              <button
                style={{ ...styles.button, ...styles.solutionButton }}
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? 'Hide Solution' : 'View Solution'}
              </button>
            </div>
          </div>

          {/* Right Panel - Moves & Description */}
          <div style={styles.rightPanel}>
            {/* Turn Indicator */}
            <div style={styles.turnIndicator}>
              <div style={styles.kingIcon}>
                {chess.turn() === 'w' ? '♔' : '♚'}
              </div>
              <div style={styles.turnText}>
                {chess.turn() === 'w' ? 'White to move' : 'Black to move'}
              </div>
            </div>

            <div style={styles.movesContainer}>
              <h3 style={styles.sectionTitle}>Your Moves</h3>
              <div style={styles.movesList}>
                {userMoves.length === 0 ? (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>
                    No moves yet. Make a move on the board!
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
            </div>

            {showSolution && (
              <div style={styles.solutionContainer}>
                <h3 style={styles.sectionTitle}>Solution</h3>
                {currentPuzzle.puzzleSolutions?.map((solution, index) => (
                  <div key={index} style={{ marginBottom: '15px' }}>
                    <div style={styles.solutionMoves}>{solution.pgn}</div>
                    {solution.description && (
                      <div style={{ ...styles.descriptionText, marginTop: '8px', fontSize: '13px', color: '#666' }}>
                        {solution.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={styles.descriptionContainer}>
              <h3 style={styles.sectionTitle}>Puzzle Description</h3>
              <div style={styles.descriptionText}>
                {currentPuzzle.puzzleDescription ? (
                  currentPuzzle.puzzleDescription
                ) : (
                  <span style={{ color: '#999', fontStyle: 'italic' }}>
                    No description available. Try to find the best move!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPuzzleView;
