import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import socket from '../../socket-jwt';
import api from '../../api';
import TournamentChat from '../../components/TournamentChat';
import { AuthContext } from '../../contexts/AuthContext';
import './ArenaTournamentLive.css';

export default function ArenaTournamentLive() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  
  const [tournament, setTournament] = useState(null);
  const [myParticipant, setMyParticipant] = useState(null);
  const [isParticipantConfirmed, setIsParticipantConfirmed] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [opponent, setOpponent] = useState('');
  const [loading, setLoading] = useState(true);
  const [waitingForPairing, setWaitingForPairing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [pairingEnabled, setPairingEnabled] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  
  const chessRef = useRef(new Chess());

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  useEffect(() => {
    if (!isParticipantConfirmed) return;
    if (!myParticipant) {
      navigate(`/arenatournament/lobby/${tournamentId}`);
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinArenaTournamentLobby', { tournamentId });

    socket.on('tournamentLobbyJoined', (data) => {
      setTournament(data.tournament);
      setMyParticipant(data.myParticipant);
      setPairingEnabled(data.tournament.pairingEnabled);
      setOnlineUserIds(data.onlineUserIds || []);
      
      if (data.myParticipant.currentGameId) {
        loadGameData(data.myParticipant.currentGameId);
      }
      
      setLoading(false);
    });

    socket.on('arenaTournamentGameStarted', (data) => {
      setCurrentGame(data.gameId);
      setMyColor(data.color);
      setOpponent(data.opponent);
      setWaitingForPairing(false);
      setLastMove(null);
      
      chessRef.current = new Chess();
      setGameState(chessRef.current.fen());
    });

    socket.on('waitingForOpponent', ({ cooldownMs } = {}) => {
      setWaitingForPairing(true);
      const retryDelay = cooldownMs ? cooldownMs + 500 : 5000;
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('requestArenaTournamentPairing', { tournamentId });
        }
      }, retryDelay);
    });

    socket.on('arenaTournamentMove', (data) => {
      if (data.playerId !== (user?.id || user?._id)) {
        chessRef.current.load(data.fen);
        setGameState(data.fen);
        if (data.move) {
          setLastMove({ from: data.move.from, to: data.move.to });
        }
      }
    });

    socket.on('arenaTournamentMoveSuccess', (data) => {
      chessRef.current.load(data.fen);
      setGameState(data.fen);
    });

    socket.on('arenaTournamentGameEnded', (data) => {
      setCurrentGame(null);
      setGameState(null);
      setLastMove(null);
      setMyColor(null);
      setOpponent('');
      
      setTimeout(() => {
        alert(`Game ended: ${data.result === 'white_won' ? 'White won' : data.result === 'black_won' ? 'Black won' : 'Draw'}${data.reason ? ` (${data.reason})` : ''}`);
      }, 100);
      
      loadTournamentData();
    });

    socket.on('tournamentPairingStopped', (data) => {
      setPairingEnabled(false);
      alert(data.message);
    });

    socket.on('tournamentEnded', (data) => {
      setLeaderboard(data.leaderboard);
      navigate(`/arenatournament/leaderboard/${tournamentId}`);
    });

    socket.on('pairingUnavailable', () => {
      setWaitingForPairing(false);
      alert('Pairing is currently unavailable');
    });

    socket.on('alreadyInGame', (data) => {
      loadGameData(data.gameId);
    });

    socket.on('gameError', (data) => {
      alert(`Error: ${data.message}`);
    });

    socket.on('tournamentLeaderboardUpdate', () => {
      loadTournamentData();
    });

    socket.on('tournamentOnlineStatus', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    const interval = setInterval(() => {
      if (tournament?.endTime) {
        const now = Date.now();
        const end = new Date(tournament.endTime).getTime();
        const diff = end - now;

        if (diff <= 0) {
          setTimeRemaining('Tournament ending...');
          setTimeout(() => {
            navigate(`/arenatournament/leaderboard/${tournamentId}`);
          }, 3000);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('arenaTournamentGameStarted');
      socket.off('waitingForOpponent');
      socket.off('arenaTournamentMove');
      socket.off('arenaTournamentMoveSuccess');
      socket.off('arenaTournamentGameEnded');
      socket.off('tournamentPairingStopped');
      socket.off('tournamentEnded');
      socket.off('pairingUnavailable');
      socket.off('alreadyInGame');
      socket.off('gameError');
      socket.off('tournamentLeaderboardUpdate');
      socket.off('tournamentOnlineStatus');
      clearInterval(interval);
    };
  }, [tournamentId, tournament?.endTime, myParticipant, isParticipantConfirmed]);

  const loadTournamentData = async () => {
    try {
      const response = await api.get(`/api/arenatournament/details/${tournamentId}`);
      setTournament(response.data.tournament);
      
      // If tournament is finished, redirect to leaderboard
      if (response.data.tournament.status === 'finished') {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        return;
      }

      // If tournament end time has passed, consider it finished and redirect
      if (response.data.tournament.endTime && new Date(response.data.tournament.endTime) < new Date()) {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        return;
      }
      
      const userId = user?.id || user?._id;
      const myP = response.data.participants.find(p => String(p.userId) === String(userId));
      setMyParticipant(myP);
      setIsParticipantConfirmed(true);
      
      if (!myP) {
        navigate(`/arenatournament/lobby/${tournamentId}`);
        return;
      }
      
      const sortedParticipants = [...response.data.participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      });
      setLeaderboard(sortedParticipants);
    } catch (err) {
    }
  };

  const loadGameData = async (gameId) => {
    try {
      
      // Fetch game data from API
      const gameResponse = await api.get(`/api/arenatournament/game/${gameId}`);
      const gameData = gameResponse.data;
      
      
      if (gameData.status !== 'active') {
        setCurrentGame(null);
        setGameState(null);
        return;
      }
      
      setCurrentGame(gameId);
      
      // Determine player's color
      let myColor = null;
      let opponent = '';
      
      if (String(gameData.whitePlayerId) === String(user?.id)) {
        myColor = 'white';
        opponent = gameData.blackPlayerUsername;
      } else if (String(gameData.blackPlayerId) === String(user?.id)) {
        myColor = 'black';
        opponent = gameData.whitePlayerUsername;
      }
      
      setMyColor(myColor);
      setOpponent(opponent);
      
      // Initialize chess board with current position
      if (gameData.fen) {
        chessRef.current.load(gameData.fen);
        setGameState(gameData.fen);
        
        // Set last move from game history if available
        if (gameData.moves && gameData.moves.length > 0) {
          const tempChess = new Chess();
          for (let i = 0; i < gameData.moves.length - 1; i++) {
            tempChess.move(gameData.moves[i]);
          }
          const lastMoveResult = tempChess.move(gameData.moves[gameData.moves.length - 1]);
          if (lastMoveResult) {
            setLastMove({ from: lastMoveResult.from, to: lastMoveResult.to });
          }
        }
      } else {
        chessRef.current = new Chess();
        setGameState(chessRef.current.fen());
      }
      
    } catch (error) {
    }
  };

  const handleRequestPairing = () => {
    
    if (!myParticipant) {
      alert('You must be a participant in this tournament to play games.');
      return;
    }
    
    if (!pairingEnabled) {
      alert('Pairing has been disabled. Tournament is ending soon.');
      return;
    }
    
    setWaitingForPairing(true);
    socket.emit('requestArenaTournamentPairing', { tournamentId });
  };

  const handleMove = (from, to) => {
    
    if (!myParticipant) {
      return false;
    }
    
    if (!currentGame || !gameState) {
      return false;
    }
    
    const move = chessRef.current.move({ from, to, promotion: 'q' });
    if (!move) {
      return false;
    }
    
    socket.emit('arenaTournamentMove', {
      gameId: currentGame,
      move: { from, to, promotion: 'q' }
    });

    setGameState(chessRef.current.fen());
    setLastMove({ from, to });
    
    return true;
  };

  const handleResign = () => {
    if (!myParticipant) return;
    if (!currentGame) return;
    
    
    if (confirm('Are you sure you want to resign?')) {
      socket.emit('resignArenaTournamentGame', { gameId: currentGame });
    } else {
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif'
      }}>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: '600' }}>
          Loading tournament...
        </div>
      </div>
    );
  }

  return (
    <div className="ar-live-page">
      <div className="ar-live-bg" />
      <div className="ar-live-grid">
        {/* Mobile-only timer banner (shown above chess on mobile) */}
        {timeRemaining && (
          <div className="ar-live-mobile-timer">
            <strong>Time Remaining</strong>
            <div className="ar-timer-value">{timeRemaining}</div>
          </div>
        )}

        {/* Left Panel: stats, leaderboard toggle, chat */}
        <div className="ar-live-left">
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '20px'
          }}>
            {tournament?.name}
          </h2>

          {timeRemaining && (
            <div style={{
              background: '#fff3cd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong style={{ color: '#856404', display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                Time Remaining
              </strong>
              <div style={{ color: '#856404', fontSize: '28px', fontWeight: '700', fontFamily: 'monospace' }}>
                {timeRemaining}
              </div>
            </div>
          )}

          {myParticipant && (
            <div style={{
              background: '#e8f5e9',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2e7d32', marginBottom: '12px' }}>
                Your Stats
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#555' }}>Score</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>{myParticipant.score}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#555' }}>Games</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>{myParticipant.gamesPlayed}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#555' }}>Wins</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#4caf50' }}>{myParticipant.wins}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#555' }}>Losses</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#f44336' }}>{myParticipant.losses}</div>
                </div>
              </div>
            </div>
          )}

          {!currentGame && pairingEnabled && myParticipant && (
            <button
              onClick={handleRequestPairing}
              disabled={waitingForPairing}
              style={{
                width: '100%',
                padding: '16px',
                background: waitingForPairing ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: waitingForPairing ? 'not-allowed' : 'pointer',
                marginBottom: '20px'
              }}
            >
              {waitingForPairing ? 'Searching for opponent...' : 'Find Game'}
            </button>
          )}


          {!pairingEnabled && !currentGame && (
            <div style={{
              background: '#fee',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#c33'
            }}>
              <strong>Pairing Disabled</strong>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                New pairings have stopped. Finish your current games - tournament ends in {timeRemaining}.
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
          </button>

          {showLeaderboard && (
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginTop: '20px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                Leaderboard
              </h3>
              {leaderboard.map((p, index) => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: p.userId === myParticipant?.userId ? '#e8f5e9' : '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: p.userId === myParticipant?.userId ? '2px solid #4caf50' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: index < 3 ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: index < 3 ? '#000' : '#666',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ fontWeight: '600', color: '#333', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onlineUserIds.includes(p.userId) && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#4caf50',
                          display: 'inline-block',
                          boxShadow: '0 0 4px #4caf50'
                        }} title="Online" />
                      )}
                      {p.displayName || p.username}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', color: '#667eea', fontSize: '16px' }}>
                    {p.score}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <TournamentChat tournamentId={tournamentId} />
          </div>
        </div>{/* end ar-live-left */}

        {/* Right Panel: chessboard */}
        <div className="ar-live-chess">
          {currentGame && gameState ? (
            <>
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <strong style={{ color: '#555', fontSize: '14px' }}>Playing as</strong>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: myColor === 'white' ? '#333' : '#764ba2' }}>
                    {myColor?.toUpperCase()}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#555', fontSize: '14px' }}>Opponent</strong>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#667eea' }}>
                    {opponent}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px', maxWidth: '450px', width: '100%' }}>
                <Chessboard
                  position={gameState}
                  onDrop={handleMove}
                  orientation={myColor}
                  lastMove={lastMove}
                  draggable={true}
                  boardWidth={450}
                  showCoordinates={true}
                  allowPremove={true}
                  playerColor={myColor}
                />
              </div>

              <button
                onClick={handleResign}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Resign
              </button>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#666'
            }}>
              <h3 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
                {waitingForPairing ? 'Searching for opponent...' : 'No active game'}
              </h3>
              <p>
                {waitingForPairing 
                  ? 'Please wait while we find you an opponent' 
                  : pairingEnabled 
                    ? 'Click "Find Game" to get paired with an opponent'
                    : 'Pairing has been disabled. Tournament is ending soon.'}
              </p>
            </div>
          )}
        </div>{/* end ar-live-chess */}
      </div>{/* end ar-live-grid */}
    </div>{/* end ar-live-page */}
  );
}
