import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import { getTopicTitle } from '../../utils/topicTitles';
import './TeamRaceSelection.css';

function TeamRaceSelection() {
  const navigate = useNavigate();
  const { isAdmin, isElite } = useAuth();
  const [races, setRaces] = useState([]);
  const [recentRaces, setRecentRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableRaces();
    fetchRecentRaces();

    // Listen for new team race creation
    const handleTeamRaceCreated = (data) => {
      if (data.race && (data.race.status === 'waiting' || data.race.status === 'running' || (data.race.status === 'created' && data.race.scheduledStartTime))) {
        setRaces(prevRaces => {
          // Check if race already exists
          const exists = prevRaces.find(r => r._id === data.race._id);
          if (!exists) {
            return [...prevRaces, data.race];
          }
          return prevRaces;
        });
      }
    };

    // Listen for race status changes (e.g., created -> waiting)
    const handleTeamRaceStarted = (data) => {
      if (data.race) {
        // Add or update the race in the list
        setRaces(prevRaces => {
          const existingIndex = prevRaces.findIndex(r => r._id === data.race._id);
          if (existingIndex >= 0) {
            // Update existing race
            const updatedRaces = [...prevRaces];
            updatedRaces[existingIndex] = data.race;
            return updatedRaces;
          } else {
            // Add new race
            return [...prevRaces, data.race];
          }
        });
      } else {
        // Fallback: just update status if race data not provided
        setRaces(prevRaces =>
          prevRaces.map(race =>
            race._id === data.raceId ? { ...race, status: 'waiting' } : race
          )
        );
      }
    };

    socket.on('teamRaceCreated', handleTeamRaceCreated);
    socket.on('teamRaceStarted', handleTeamRaceStarted);

    return () => {
      socket.off('teamRaceCreated', handleTeamRaceCreated);
      socket.off('teamRaceStarted', handleTeamRaceStarted);
    };
  }, []);

  const fetchRecentRaces = async () => {
    try {
      const res = await api.get('/api/team-race/recent');
      setRecentRaces(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // silently ignore
    }
  };

  const fetchAvailableRaces = async () => {
    try {
      const res = await api.get('/api/team-race/upcoming');
      const races = Array.isArray(res.data) ? res.data : [];
      setRaces(races);
    } catch (err) {
      console.error('Failed to fetch team races:', err);
      setRaces([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading races...</div>;
  }

  return (
    <div className="team-race-selection">
      <div className="selection-header">
        <h1>🏁 Team Race</h1>
        <p>Choose a race and join a team to compete!</p>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        {(isAdmin || isElite) && (
          <button
            onClick={() => navigate(isAdmin ? '/admin/team-race' : '/elite/team-race')}
            style={{
              marginLeft: '10px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
              border: '1px solid rgba(251,191,36,0.5)',
              color: '#fbbf24',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ⚙️ Manage Races
          </button>
        )}
      </div>

      {races.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏁</div>
          <h2>No Active Races</h2>
          <p>There are no team races available at the moment.</p>
          <p>Check back later or contact your admin!</p>
        </div>
      ) : (
        <div className="races-grid">
          {races.map(race => {
            const badges = {
              created: { color: '#6c757d', label: '📅 Scheduled' },
              waiting: { color: '#ffc107', label: '⏳ Join Now' },
              running: { color: '#28a745', label: '🏃 In Progress' }
            };
            const badge = badges[race.status] || badges.waiting;
            
            return (
              <div key={race._id} className="race-card" onClick={() => {
                if (race.status === 'created') {
                  const t = new Date(race.scheduledStartTime);
                  const formatted = t.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short', timeZoneName: 'short' });
                  alert(`This race is scheduled to start at ${new Date(race.scheduledStartTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Please check back later!`);
                  return;
                }
                navigate(`/team-race/${race._id}/teams`);
              }}>
                <div className="race-status">
                  <span style={{
                    backgroundColor: badge.color,
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {badge.label}
                  </span>
                </div>
                
                <h2>{race.raceName}</h2>
                
                <div className="race-details">
                  <div className="detail-row">
                    <span className="detail-icon">📚</span>
                    <span className="detail-label">Topic:</span>
                    <span className="detail-value">{getTopicTitle(race.topic)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-icon">⏱️</span>
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{Math.floor(race.duration / 60)} minutes</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-icon">⭐</span>
                    <span className="detail-label">Points:</span>
                    <span className="detail-value">{race.pointsPerPuzzle} per puzzle</span>
                  </div>

                  {race.scheduledStartTime && (() => {
                    const t = new Date(race.scheduledStartTime);
                    const datePart = t.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    const timePart = t.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
                    return (
                      <div className="detail-row">
                        <span className="detail-icon">📅</span>
                        <span className="detail-label">Starts (IST):</span>
                        <span className="detail-value" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{datePart}</span>
                          <span style={{ opacity: 0.8 }}>{timePart} IST</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <button className="btn-join">
                  {race.status === 'created' ? 'Coming Soon' : race.status === 'waiting' ? 'Join Race →' : 'View Race →'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {recentRaces.length > 0 && (
        <div className="recent-races-section">
          <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 16, marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏆 Recently Finished Team Races
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {recentRaces.map(race => (
              <div key={race._id} style={{
                background: 'rgba(139,92,246,0.07)',
                border: '1px solid rgba(139,92,246,0.18)',
                borderRadius: 14,
                padding: '16px 18px',
              }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {race.raceName || 'Team Race'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>📚 Topic: <span style={{ color: '#e2e8f0' }}>{getTopicTitle(race.topic)}</span></div>
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>👥 Players: <span style={{ color: '#e2e8f0' }}>{race.playerCount}</span></div>
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>⏱️ Duration: <span style={{ color: '#e2e8f0' }}>{Math.floor(race.duration / 60)} min</span></div>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  Finished {(() => {
                    const diff = Date.now() - new Date(race.finishedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins}m ago`;
                    const h = Math.floor(mins / 60);
                    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamRaceSelection;
