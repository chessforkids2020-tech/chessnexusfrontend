import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket-jwt';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import './ArenaTournamentLeaderboard.css';

export default function ArenaTournamentLeaderboard() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth?.user || null;
  
  const [tournament, setTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myRank, setMyRank] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    
    if (!socket.connected) {
      socket.connect();
    } else {
    }

    loadLeaderboard();

    socket.emit('joinArenaTournamentLobby', { tournamentId });

    // Rejoin tournament lobby on reconnection
    socket.on('reconnect', () => {
      socket.emit('joinArenaTournamentLobby', { tournamentId });
    });

    socket.on('tournamentLobbyJoined', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    socket.on('tournamentOnlineStatus', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    socket.on('tournamentLeaderboardUpdate', () => {
      loadLeaderboard();
    });

    socket.on('tournamentEnded', (data) => {
      loadLeaderboard();
    });

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('tournamentOnlineStatus');
      socket.off('tournamentLeaderboardUpdate');
      socket.off('tournamentEnded');
      socket.off('reconnect');
    };
  }, [tournamentId]);

  const loadLeaderboard = async () => {
    try {
      const response = await api.get(`/api/arenatournament/leaderboard/${tournamentId}`);
      
      setTournament(response.data.tournament);
      setLeaderboard(response.data.leaderboard);
      
      const userId = user?.id || user?._id;
      const myIndex = response.data.leaderboard.findIndex(p => String(p.userId) === String(userId));
      if (myIndex !== -1) {
        const rank = myIndex + 1;
        setMyRank(rank);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
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
          Loading leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c33', marginBottom: '20px' }}>Error</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
          <button
            onClick={() => navigate('/arenatournament')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-lb-page">
      <div className="ar-lb-inner">
        <div className="ar-lb-result-card">
          <h1 className="ar-lb-result-title">
            Tournament Results
          </h1>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '20px'
          }}>
            {tournament?.name}
          </h2>
          
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            display: 'inline-block',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>
              Status: <strong style={{ color: tournament?.status === 'finished' ? '#4caf50' : '#667eea' }}>
                {tournament?.status?.toUpperCase()}
              </strong>
            </div>
            {tournament?.endTime && (
              <div style={{ fontSize: '14px', color: '#555' }}>
                Ended: <strong>{formatDate(tournament.endTime)}</strong>
              </div>
            )}
          </div>

          {myRank && (
            <div style={{
              background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '16px', color: '#2e7d32', marginBottom: '8px' }}>
                Your Rank
              </div>
              <div style={{ fontSize: '48px', fontWeight: '800', color: '#1b5e20' }}>
                {getMedalEmoji(myRank)} #{myRank}
              </div>
            </div>
          )}
        </div>

        <div className="ar-lb-standings-card">
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '24px' }}>
            Final Standings
          </h2>

          {leaderboard.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
              No participants
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {leaderboard.map((participant, index) => {
                const rank = index + 1;
                const medal = getMedalEmoji(rank);
                const userId = localStorage.getItem('userId');
                const isMe = participant.userId === userId;

                return (
                  <div
                    key={participant._id}
                    className="ar-lb-participant"
                    style={{
                      background: isMe ? 'linear-gradient(135deg, #e8f5e9, #f1f8f4)' : '#f8f9fa',
                      border: isMe ? '3px solid #4caf50' : rank <= 3 ? '2px solid #ffd700' : 'none',
                      boxShadow: rank <= 3 ? '0 4px 12px rgba(255,215,0,0.2)' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: rank <= 3 
                        ? 'linear-gradient(135deg, #ffd700, #ffed4e)'
                        : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: rank <= 3 ? '#000' : 'white',
                      fontSize: rank <= 3 ? '24px' : '20px',
                      fontWeight: '700'
                    }}>
                      {medal || rank}
                    </div>

                    <div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        {onlineUserIds.includes(participant.userId) && (
                          <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#4caf50',
                            display: 'inline-block',
                            boxShadow: '0 0 6px #4caf50'
                          }} title="Online" />
                        )}
                        {participant.displayName || participant.username}
                        {isMe && (
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#4caf50',
                            background: '#e8f5e9',
                            padding: '4px 12px',
                            borderRadius: '12px'
                          }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        display: 'flex',
                        gap: '16px'
                      }}>
                        <span>
                          <strong style={{ color: '#4caf50' }}>{participant.wins}W</strong>
                        </span>
                        <span>
                          <strong style={{ color: '#f44336' }}>{participant.losses}L</strong>
                        </span>
                        <span>
                          <strong style={{ color: '#757575' }}>{participant.draws}D</strong>
                        </span>
                        <span>
                          <strong>{participant.gamesPlayed}</strong> games
                        </span>
                      </div>
                    </div>

                    <div style={{
                      textAlign: 'right'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#555',
                        marginBottom: '4px'
                      }}>
                        Score
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        color: '#667eea'
                      }}>
                        {participant.score}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/arenatournament')}
          className="ar-lb-back-btn"
        >
          ← Back to Tournaments
        </button>
      </div>
    </div>
  );
}
