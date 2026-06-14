import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import stockfishService from '../../services/stockfishService';
import { useAuth } from '../../contexts/AuthContext';
import useResponsiveBoardSize from '../../hooks/useResponsiveBoardSize';

export default function PlayWithStockfish() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 520, 400);

  const [chess, setChess] = useState(new Chess());
  const [orientation, setOrientation] = useState('white');
  const [isHumanTurn, setIsHumanTurn] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus] = useState('Playing');
  const [winner, setWinner] = useState(null);
  const [moves, setMoves] = useState([]);
  const [stockfishReady, setStockfishReady] = useState(false);

  // Initialize Stockfish
  useEffect(() => {
    const initStockfish = async () => {
      try {
        await stockfishService.init();
        setStockfishReady(true);
        setStatus('Stockfish ready! Make your move.');
      } catch (error) {
        setStatus('Failed to initialize Stockfish: ' + error.message);
      }
    };

    initStockfish();

    return () => {
      try {
        stockfishService.quit();
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  const makeStockfishMove = useCallback(async () => {
    if (isThinking || !stockfishReady) return;

    setIsThinking(true);
    setStatus('Stockfish is thinking...');

    try {
      const bestMove = await stockfishService.getBestMove(chess.fen(), 2000); // 2 second think time

      if (bestMove) {
        const move = chess.move(bestMove);
        if (move) {
          setChess(new Chess(chess.fen()));
          setMoves(prev => [...prev, move.san]);
          setIsHumanTurn(true);

          // Check game end
          if (chess.isCheckmate()) {
            setStatus('Checkmate! You win!');
            setWinner('human');
          } else if (chess.isStalemate()) {
            setStatus('Stalemate!');
          } else if (chess.isDraw()) {
            setStatus('Draw!');
          } else {
            setStatus('Your turn');
          }
        }
      }
    } catch (error) {
      setStatus('Error making Stockfish move: ' + error.message);
    } finally {
      setIsThinking(false);
    }
  }, [chess, isThinking, stockfishReady]);

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    if (!isHumanTurn || isThinking || winner) return false;

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        setChess(new Chess(chess.fen()));
        setMoves(prev => [...prev, move.san]);
        setIsHumanTurn(false);

        // Check game end
        if (chess.isCheckmate()) {
          setStatus('Checkmate! Stockfish wins!');
          setWinner('stockfish');
        } else if (chess.isStalemate()) {
          setStatus('Stalemate!');
        } else if (chess.isDraw()) {
          setStatus('Draw!');
        } else {
          // Make Stockfish move after a short delay
          setTimeout(() => {
            makeStockfishMove();
          }, 500);
        }

        return true;
      }
    } catch (error) {
      // Invalid move
    }

    return false;
  }, [chess, isHumanTurn, isThinking, winner, makeStockfishMove]);

  const resetGame = () => {
    setChess(new Chess());
    setIsHumanTurn(true);
    setIsThinking(false);
    setStatus('Playing');
    setWinner(null);
    setMoves([]);
  };

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px',
    },
    title: {
      fontSize: '2rem',
      color: '#333',
      marginBottom: '10px',
    },
    status: {
      fontSize: '1.2rem',
      color: winner === 'human' ? '#4CAF50' : winner === 'stockfish' ? '#f44336' : '#666',
      fontWeight: 'bold',
    },
    gameContainer: {
      display: 'flex',
      gap: '40px',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    },
    boardContainer: {
      flex: '1',
      minWidth: '400px',
    },
    infoPanel: {
      flex: '0 0 300px',
      background: '#f5f5f5',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    button: {
      background: '#4CAF50',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '1rem',
      margin: '10px 5px',
      transition: 'background 0.3s',
    },
    buttonHover: {
      background: '#45a049',
    },
    movesList: {
      maxHeight: '300px',
      overflowY: 'auto',
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      marginTop: '10px',
    },
    moveItem: {
      padding: '5px',
      borderBottom: '1px solid #eee',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Play vs Stockfish</h1>
        <div style={styles.status}>{status}</div>
      </div>

      <div style={styles.gameContainer}>
        <div ref={boardRef} style={{ ...styles.boardContainer, width: '100%' }}>
          <Chessboard
            position={chess.fen()}
            onPieceDrop={handleMove}
            orientation={orientation}
            boardWidth={boardSize}
          />
        </div>

        <div style={styles.infoPanel}>
          <h3>Game Info</h3>
          <p><strong>Playing as:</strong> {orientation === 'white' ? 'White' : 'Black'}</p>
          <p><strong>Turn:</strong> {isHumanTurn ? 'Your turn' : 'Stockfish thinking...'}</p>

          <div style={{ marginTop: '20px' }}>
            <button
              style={styles.button}
              onClick={resetGame}
              onMouseEnter={(e) => e.currentTarget.style.background = styles.buttonHover.background}
              onMouseLeave={(e) => e.currentTarget.style.background = styles.button.background}
            >
              New Game
            </button>
            <button
              style={{ ...styles.button, background: '#2196F3' }}
              onClick={() => navigate('/play')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1976D2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2196F3'}
            >
              Back to Play
            </button>
          </div>

          <div style={styles.movesList}>
            <h4>Move History</h4>
            {moves.map((move, index) => (
              <div key={index} style={styles.moveItem}>
                {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}