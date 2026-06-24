import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function ArenaTournament() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTournaments();
    return () => {
    };
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await api.get('/api/arenatournament/list');
      setTournaments(response.data.tournaments);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tournaments');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#2196f3';
      case 'lobby':
        return '#ff9800';
      case 'active':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            color: '#1a1a1a',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🏟️ Arena Tournament
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '30px',
          }}>
            Compete in exciting arena tournaments! Join live battles and climb the rankings.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => {
                navigate('/arenatournament/create');
              }}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              ➕ Create Tournament
            </button>

            <button
              onClick={() => {
                navigate('/arenatournament/join');
              }}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #4caf50, #45a049)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🔗 Join Tournament
            </button>
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '24px'
          }}>
            Available Tournaments
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading tournaments...
            </div>
          ) : error ? (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          ) : tournaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p style={{ fontSize: '18px', marginBottom: '12px' }}>
                No active tournaments at the moment
              </p>
              <p style={{ fontSize: '14px' }}>
                Create a new tournament to get started!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {tournaments.map((tournament) => (
                <div
                  key={tournament._id}
                  style={{
                    padding: '24px',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                      id: tournament._id,
                      name: tournament.name,
                      status: tournament.status
                    });
                    if (tournament.status === 'scheduled' || tournament.status === 'lobby' || (tournament.status === 'active' && !tournament.actualStartTime)) {
                      navigate(`/arenatournament/lobby/${tournament._id}`);
                    } else if (tournament.status === 'active') {
                      navigate(`/arenatournament/live/${tournament._id}`);
                    } else if (tournament.status === 'finished') {
                      navigate(`/arenatournament/leaderboard/${tournament._id}`);
                    } else if (tournament.endTime && new Date(tournament.endTime) < new Date()) {
                      navigate(`/arenatournament/leaderboard/${tournament._id}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        {tournament.name}
                      </h3>
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        Created by <strong>{tournament.creatorDisplayName || tournament.creatorUsername}</strong>
                      </div>
                    </div>

                    <div style={{
                      padding: '8px 16px',
                      background: getStatusColor(tournament.status),
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {tournament.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Time Control
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        {tournament.timeControl.minutes}+{tournament.timeControl.increment || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Duration
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        {tournament.tournamentDuration.hours > 0 && `${tournament.tournamentDuration.hours}h `}
                        {tournament.tournamentDuration.minutes}min
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Participants
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#667eea' }}>
                        {tournament.participantCount}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Starts
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {formatDate(tournament.scheduledStartTime)}
                      </div>
                    </div>
                  </div>

                  {tournament.description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #e0e0e0'
                    }}>
                      {tournament.description}
                    </div>
                  )}

                  <div style={{
                    marginTop: '16px',
                    fontSize: '14px',
                    color: '#667eea',
                    fontWeight: '600'
                  }}>
                    Click to {tournament.status === 'active' ? 'join live' : 'view details'} →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => window.history.back()}
          style={{
            width: '100%',
            padding: '14px',
            background: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
