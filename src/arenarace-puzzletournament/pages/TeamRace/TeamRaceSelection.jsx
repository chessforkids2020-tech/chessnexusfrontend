import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import { getTopicTitle } from '../../../utils/topicTitles';
import './TeamRaceSelection.css';

function TeamRaceSelection() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableRaces();

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

                  {race.status === 'created' && race.scheduledStartTime && (
                    <div className="detail-row">
                      <span className="detail-icon">📅</span>
                      <span className="detail-label">Starts:</span>
                      <span className="detail-value">{new Date(race.scheduledStartTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                    </div>
                  )}
                </div>

                <button className="btn-join">
                  {race.status === 'created' ? 'Coming Soon' : race.status === 'waiting' ? 'Join Race →' : 'View Race →'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TeamRaceSelection;
