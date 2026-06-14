import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../lib/analytics';
import io from 'socket.io-client';

export default function LiveGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if there's a valid current game
  useEffect(() => {
    const currentGame = localStorage.getItem('currentGame');
    // Allow loading if gameId matches localStorage (even for finished games in analysis mode)
    if (currentGame !== gameId) {
      navigate('/play');
      return;
    }
  }, [gameId, navigate]);

  const [game, setGame] = useState(new Chess());
  const [gameData, setGameData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [orientation, setOrientation] = useState('white');
  const [status, setStatus] = useState('Playing');
  const [winner, setWinner] = useState(null);
  const [ratings, setRatings] = useState({ white: 1200, black: 1200 });
  const [ratingChange, setRatingChange] = useState(null);
  const [category, setCategory] = useState('');
  const [clocks, setClocks] = useState({ white: 600, black: 600 }); // seconds
  const [activeColor, setActiveColor] = useState('w');
  const [moves, setMoves] = useState([]);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisGame, setAnalysisGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHistory, setGameHistory] = useState([]);
  const startedGameRef = useRef(null); // guards one game_started event per game
  const gameStartTimeRef = useRef(0); // when game_started fired (for game length)

  // Loading timeout - if game doesn't load in 10 seconds, redirect
  useEffect(() => {
    if (gameData) return; // Already loaded

    const timeout = setTimeout(() => {
      if (!gameData) {
        localStorage.removeItem('currentGame');
        navigate('/play');
      }
    }, 10000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [gameData, navigate]);

  useEffect(() => {
    if (status !== 'Playing') return;

    const timer = setInterval(() => {
      setClocks(prev => {
        const turn = game.turn() === 'w' ? 'white' : 'black';
        if (prev[turn] <= 0) {
          clearInterval(timer);
          return prev;
        }
        return {
          ...prev,
          [turn]: Math.max(0, prev[turn] - 1)
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game, status]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const newSocket = io(window.location.origin.replace('5173', '5000'), {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_game', { gameId });
      
      // Store current game in localStorage for easy access
      localStorage.setItem('currentGame', gameId);
    });

    newSocket.on('game_data', (data) => {
      if (!data) {
        // Game doesn't exist, redirect to play page
        localStorage.removeItem('currentGame');
        navigate('/play');
        return;
      }

      setGameData(data);
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setMoves(data.moves || []);

      // Fire game_started once per game (game_data can re-fire on reconnect)
      if (startedGameRef.current !== gameId) {
        startedGameRef.current = gameId;
        gameStartTimeRef.current = Date.now();
        trackEvent('game_started', { gameId, timeControl: data.timeControl || null, mode: 'live' });
      }
      
      // Initialize game history for analysis
      const history = [new Chess().fen()]; // Starting position
      const tempGame = new Chess();
      (data.moves || []).forEach(move => {
        tempGame.move(move);
        history.push(tempGame.fen());
      });
      setGameHistory(history);
      setCurrentMoveIndex(history.length - 1);

      // If game is already finished, enter analysis mode automatically
      if (data.status === 'finished') {
        setStatus('Game Over');
        setAnalysisMode(true);
        setAnalysisGame(new Chess(data.fen));
      }
      
      // Determine orientation based on player ID
      const myId = user.id || user._id;
      const isWhite = data.players.white.userId === myId;
      setOrientation(isWhite ? 'white' : 'black');
      
      setRatings({
        white: data.players.white.rating || 1200,
        black: data.players.black.rating || 1200
      });
      setCategory(data.category || '');

      // Initialize clocks from timeControl (e.g., "10+5")
      if (data.timeControl) {
        const [minutes] = data.timeControl.split('+');
        const initialSeconds = parseInt(minutes) * 60;
        setClocks({ white: initialSeconds, black: initialSeconds });
      }
    });

    newSocket.on('opponent_move', ({ move, fen }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
      setMoves(prev => [...prev, move]);
      setGameHistory(prev => [...prev, fen]);
      setCurrentMoveIndex(prev => prev + 1);
    });

    newSocket.on('rating_update', (data) => {
      setRatings({
        white: data.white.newRating,
        black: data.black.newRating
      });
      
      const myId = user.id || user._id;
      const myColor = data.white.userId === myId ? 'white' : 'black';
      const myChange = data[myColor]?.change;
      if (myChange !== undefined) {
        setRatingChange(myChange);
      }
    });

    newSocket.on('game_finished', ({ result, winner }) => {
      setStatus(`Game Over: ${result}`);
      setWinner(winner);
      trackEvent('game_finished', { result, winner, mode: 'live', durationMs: gameStartTimeRef.current ? Date.now() - gameStartTimeRef.current : 0 });
      // Enable analysis mode automatically when game ends
      setAnalysisMode(true);
      setAnalysisGame(new Chess(game.fen()));
      
      // Don't clear localStorage immediately - allow access to analysis
      // localStorage will be cleared when user exits analysis
    });

    newSocket.on('clock_update', (data) => {
      setClocks(data);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [gameId, user.id, user._id]);

  const onDrop = (sourceSquare, targetSquare) => {
    if (status !== 'Playing') return false;

    // Check turn
    const turn = game.turn() === 'w' ? 'white' : 'black';
    if (turn !== orientation) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // always promote to queen for simplicity
      });

      if (move === null) return false;

      const newFen = game.fen();
      setGame(new Chess(newFen));
      setMoves(prev => [...prev, move.san]);
      setGameHistory(prev => [...prev, newFen]);
      setCurrentMoveIndex(prev => prev + 1);

      // Emit move to server
      socket.emit('make_move', {
        gameId,
        move: move.san
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Analysis functions
  const goToMove = (index) => {
    if (index >= 0 && index < gameHistory.length) {
      setCurrentMoveIndex(index);
      setAnalysisGame(new Chess(gameHistory[index]));
    }
  };

  const goToPreviousMove = () => {
    goToMove(currentMoveIndex - 1);
  };

  const goToNextMove = () => {
    goToMove(currentMoveIndex + 1);
  };

  const goToStart = () => {
    goToMove(0);
  };

  const goToEnd = () => {
    goToMove(gameHistory.length - 1);
  };

  const onAnalysisDrop = (sourceSquare, targetSquare) => {
    try {
      const move = analysisGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      // Add the new move to history and continue from there
      const newHistory = gameHistory.slice(0, currentMoveIndex + 1);
      newHistory.push(analysisGame.fen());
      setGameHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);

      return true;
    } catch (e) {
      return false;
    }
  };

  const exitAnalysis = () => {
    setAnalysisMode(false);
    localStorage.removeItem('currentGame');
    navigate('/play');
  };

  if (!gameData) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading game...</div>;
  }

  const isMyTurn = (game.turn() === 'w' && orientation === 'white') || (game.turn() === 'b' && orientation === 'black');

  // Create notation display
  const renderNotation = () => {
    const notationRows = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      notationRows.push(
        <div key={moveNumber} style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid #eee' }}>
          <span style={{ width: '30px', fontWeight: 'bold', color: '#666' }}>{moveNumber}.</span>
          <span style={{ width: '60px', fontFamily: 'monospace', fontSize: '14px', padding: '2px' }}>{whiteMove || ''}</span>
          <span style={{ width: '60px', fontFamily: 'monospace', fontSize: '14px', padding: '2px' }}>{blackMove || ''}</span>
        </div>
      );
    }
    return notationRows;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2>{gameData.timeControl} {category.charAt(0).toUpperCase() + category.slice(1)} Game</h2>
        
        {/* Clocks and Players */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', margin: '20px 0' }}>
          {/* Opponent Block */}
          <div style={{ 
            padding: '15px', 
            backgroundColor: game.turn() !== orientation[0] ? '#f8f9fa' : '#fff',
            borderRadius: '10px',
            border: `2px solid ${game.turn() !== orientation[0] ? '#3498db' : '#eee'}`,
            width: '200px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Opponent</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {orientation === 'white' ? (gameData.players.black.displayName || gameData.players.black.username) : (gameData.players.white.displayName || gameData.players.white.username)}
            </div>
            <div style={{ fontSize: '24px', fontFamily: 'monospace', marginTop: '10px', fontWeight: 'bold' }}>
              {formatTime(orientation === 'white' ? clocks.black : clocks.white)}
            </div>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>VS</div>

          {/* User Block */}
          <div style={{ 
            padding: '15px', 
            backgroundColor: game.turn() === orientation[0] ? '#f8f9fa' : '#fff',
            borderRadius: '10px',
            border: `2px solid ${game.turn() === orientation[0] ? '#3498db' : '#eee'}`,
            width: '200px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>You</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '24px', fontFamily: 'monospace', marginTop: '10px', fontWeight: 'bold' }}>
              {formatTime(orientation === 'white' ? clocks.white : clocks.black)}
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '10px 20px', 
          backgroundColor: isMyTurn ? '#2ecc71' : '#f1c40f', 
          color: 'white', 
          borderRadius: '5px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          {status === 'Playing' ? (isMyTurn ? "Your Turn" : "Opponent's Turn") : (
            <div>
              {status}
              {ratingChange !== null && (
                <span style={{ marginLeft: '10px' }}>
                  ({ratingChange >= 0 ? '+' : ''}{ratingChange})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chessboard and Notation Container */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'center' }}>
        {analysisMode ? (
          // Analysis Mode
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Game Analysis</h3>
            
            {/* Analysis Controls */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={goToStart}
                disabled={currentMoveIndex <= 0}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentMoveIndex <= 0 ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: currentMoveIndex <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ⏮️ Start
              </button>
              <button 
                onClick={goToPreviousMove}
                disabled={currentMoveIndex <= 0}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentMoveIndex <= 0 ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: currentMoveIndex <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ⏪ Prev
              </button>
              <span style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '5px',
                fontSize: '14px',
                fontWeight: 'bold',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {currentMoveIndex === 0 ? 'Start' : `Move ${Math.ceil(currentMoveIndex / 2)}${currentMoveIndex % 2 === 1 ? ' Black' : ' White'}`}
              </span>
              <button 
                onClick={goToNextMove}
                disabled={currentMoveIndex >= gameHistory.length - 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentMoveIndex >= gameHistory.length - 1 ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: currentMoveIndex >= gameHistory.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Next ⏩
              </button>
              <button 
                onClick={goToEnd}
                disabled={currentMoveIndex >= gameHistory.length - 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentMoveIndex >= gameHistory.length - 1 ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: currentMoveIndex >= gameHistory.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                End ⏭️
              </button>
            </div>

            <div style={{ 
              padding: '10px', 
              backgroundColor: '#e8f4f8', 
              borderRadius: '5px',
              fontSize: '14px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              💡 In analysis mode, you can play both sides to explore different moves
            </div>

            <Chessboard 
              position={analysisGame.fen()} 
              onDrop={onAnalysisDrop} 
              orientation={orientation}
              boardWidth={window.innerWidth < 600 ? 350 : 500}
            />
          </div>
        ) : (
          // Live Game Mode
          <Chessboard 
            position={game.fen()} 
            onDrop={onDrop} 
            orientation={orientation}
            boardWidth={window.innerWidth < 600 ? 350 : 500}
          />
        )}

        {/* Notation Panel */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: '15px',
          minWidth: '200px',
          maxWidth: '250px',
          maxHeight: window.innerWidth < 600 ? '350px' : '500px',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#333' }}>
            {analysisMode ? 'Analysis Notation' : 'Game Notation'}
          </h3>
          
          {/* Header */}
          <div style={{ display: 'flex', padding: '8px', borderBottom: '2px solid #333', backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
            <span style={{ width: '30px' }}>#</span>
            <span style={{ width: '60px' }}>White</span>
            <span style={{ width: '60px' }}>Black</span>
          </div>
          
          {/* Moves */}
          <div style={{ maxHeight: window.innerWidth < 600 ? '280px' : '430px', overflowY: 'auto' }}>
            {renderNotation()}
          </div>
        </div>
      </div>

      {analysisMode && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            onClick={exitAnalysis}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#e74c3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Exit Analysis
          </button>
        </div>
      )}
    </div>
  );
}
