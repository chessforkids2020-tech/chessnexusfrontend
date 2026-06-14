import React, { useState, useEffect, useRef } from 'react';
import Chessboard from './Chessboard';
import { Chess } from 'chess.js';
import useResponsiveBoardSize from '../hooks/useResponsiveBoardSize';

const StudyMode = ({ result, onClose }) => {
  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 520, 400);

  const [chess, setChess] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showingSolution, setShowingSolution] = useState(false);
  const [userMoves, setUserMoves] = useState([]);
  const [expectedMoves, setExpectedMoves] = useState([]);

  useEffect(() => {
    if (result) {
      initializeStudyMode();
    }
  }, [result]);

  const initializeStudyMode = () => {
    try {
      // Initialize chess with the puzzle's starting position
      const fen = result.puzzle?.fen;
      
      if (!fen) {
        return;
      }
      
      const initialGame = new Chess(fen);
      setChess(initialGame);
      setGamePosition(initialGame.fen());
      
      // Extract moves from result
      const userMovesData = result.moves || [];
      const allMovesData = result.allMoves || [];
      
      setUserMoves(userMovesData);
      
      // Parse expected solution from puzzle if available
      if (result.puzzle?.solution) {
        const solution = Array.isArray(result.puzzle.solution) 
          ? result.puzzle.solution 
          : (typeof result.puzzle.solution === 'string' ? result.puzzle.solution.split(',').map(move => move.trim()) : []);
        setExpectedMoves(solution);
      }
      
    } catch (error) {
    }
  };

  const showSolution = () => {
    if (expectedMoves.length === 0) {
      alert('No solution available for this puzzle');
      return;
    }
    
    setShowingSolution(true);
    setCurrentMoveIndex(0);
    
    // Reset to initial position
    try {
      const initialGame = new Chess(result.puzzle?.fen || chess.fen());
      setChess(initialGame);
      setGamePosition(initialGame.fen());
    } catch (error) {
    }
  };

  const nextMove = () => {
    if (currentMoveIndex < expectedMoves.length) {
      try {
        const moveToPlay = expectedMoves[currentMoveIndex];
        const newChess = new Chess(chess.fen());
        const moveResult = newChess.move(moveToPlay);
        
        if (moveResult) {
          setChess(newChess);
          setGamePosition(newChess.fen());
          setCurrentMoveIndex(prev => prev + 1);
        } else {
        }
      } catch (error) {
      }
    }
  };

  const previousMove = () => {
    if (currentMoveIndex > 0) {
      try {
        // Rebuild position from start up to previous move
        const newChess = new Chess(result.puzzle?.fen || chess.fen());
        
        for (let i = 0; i < currentMoveIndex - 1; i++) {
          newChess.move(expectedMoves[i]);
        }
        
        setChess(newChess);
        setGamePosition(newChess.fen());
        setCurrentMoveIndex(prev => prev - 1);
      } catch (error) {
      }
    }
  };

  const resetPosition = () => {
    try {
      const initialGame = new Chess(result.puzzle?.fen || chess.fen());
      setChess(initialGame);
      setGamePosition(initialGame.fen());
      setCurrentMoveIndex(0);
      setShowingSolution(false);
    } catch (error) {
    }
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    try {
      const newChess = new Chess(chess.fen());
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        setChess(newChess);
        setGamePosition(newChess.fen());
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  if (!result) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            Study Mode: Puzzle {result.puzzleId?.toString().slice(-6) || 'Unknown'}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {/* Chess Board */}
          <div ref={boardRef} style={{ ...styles.boardSection, width: '100%' }}>
            <Chessboard
              position={gamePosition}
              onDrop={onPieceDrop}
              orientation="white"
              boardStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              boardWidth={boardSize}
              draggable={showingSolution}
            />
          </div>

          {/* Controls and Information */}
          <div style={styles.infoSection}>
            {/* Puzzle Info */}
            <div style={styles.puzzleInfo}>
              <h3>Puzzle Information</h3>
              <div><strong>Difficulty:</strong> {result.puzzle?.difficulty || 'medium'}</div>
              <div><strong>Your Result:</strong> 
                <span style={{
                  color: result.correct ? '#059669' : '#dc2626',
                  fontWeight: 'bold'
                }}>
                  {result.correct ? ' ✅ Correct' : ' ✗ Incorrect'}
                </span>
              </div>
            </div>

            {/* Move Analysis */}
            <div style={styles.moveAnalysis}>
              <h3>Move Analysis</h3>
              <div style={styles.moveComparison}>
                <div style={styles.moveSection}>
                  <strong>Your Moves:</strong>
                  <div style={styles.moveList}>
                    {userMoves.join(', ') || 'No moves recorded'}
                  </div>
                </div>
                <div style={styles.moveSection}>
                  <strong>Expected Solution:</strong>
                  <div style={styles.moveList}>
                    {expectedMoves.filter((move, index) => index % 2 === 0).join(', ') || 'No solution available'}
                  </div>
                </div>
              </div>
            </div>

            {/* Solution Controls */}
            <div style={styles.solutionControls}>
              <h3>Solution Replay</h3>
              <div style={styles.buttonGroup}>
                <button 
                  style={styles.controlButton}
                  onClick={showSolution}
                  disabled={expectedMoves.length === 0}
                >
                  Show Solution
                </button>
                <button 
                  style={styles.controlButton}
                  onClick={previousMove}
                  disabled={!showingSolution || currentMoveIndex === 0}
                >
                  ← Previous
                </button>
                <button 
                  style={styles.controlButton}
                  onClick={nextMove}
                  disabled={!showingSolution || currentMoveIndex >= expectedMoves.length}
                >
                  Next →
                </button>
                <button 
                  style={styles.controlButton}
                  onClick={resetPosition}
                >
                  Reset
                </button>
              </div>
              
              {showingSolution && (
                <div style={styles.progressInfo}>
                  Move {currentMoveIndex} of {expectedMoves.length}
                  {currentMoveIndex > 0 && (
                    <div style={styles.currentMove}>
                      Current: {expectedMoves[currentMoveIndex - 1]}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div style={styles.instructions}>
              <h4>How to Use:</h4>
              <ul style={styles.instructionsList}>
                <li>Click "Show Solution" to see the correct moves step by step</li>
                <li>Use "Previous" and "Next" to navigate through the solution</li>
                <li>You can also drag pieces to try different moves</li>
                <li>Click "Reset" to return to the starting position</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc'
  },
  title: {
    margin: 0,
    color: '#1e293b',
    fontSize: '1.5em'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#64748b',
    padding: '5px',
    borderRadius: '4px'
  },
  content: {
    display: 'flex',
    padding: '20px',
    gap: '30px',
    flexWrap: 'wrap'
  },
  boardSection: {
    flex: '0 0 400px',
    display: 'flex',
    justifyContent: 'center'
  },
  infoSection: {
    flex: 1,
    minWidth: '300px'
  },
  puzzleInfo: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  moveAnalysis: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  moveComparison: {
    marginTop: '10px'
  },
  moveSection: {
    marginBottom: '10px'
  },
  moveList: {
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    marginTop: '4px'
  },
  solutionControls: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap'
  },
  controlButton: {
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9em',
    transition: 'background-color 0.2s ease'
  },
  progressInfo: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
    fontSize: '0.9em'
  },
  currentMove: {
    marginTop: '5px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  instructions: {
    padding: '15px',
    backgroundColor: '#fefce8',
    borderRadius: '8px',
    border: '1px solid #fde047'
  },
  instructionsList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px'
  }
};

export default StudyMode;