import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../../api';
import { getTopicTitle } from '../../../utils/topicTitles';
import './AdminTeamRace.css';

function AdminTeamRace() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [socket, setSocket] = useState(null);
  const [liveLeaderboards, setLiveLeaderboards] = useState({});
  const [activeRaceId, setActiveRaceId] = useState(null);
  const [showLiveLeaderboard, setShowLiveLeaderboard] = useState(false);
  const [positionInputs, setPositionInputs] = useState([{ position: 1, count: 10 }]);
  const [newRace, setNewRace] = useState({
    raceName: '',
    duration: 600, // 10 minutes default
    topic: '',
    pointsPerPuzzle: 10,
    puzzlesPerPosition: 10, // Keep for backward compatibility
    positionPuzzleCounts: {}, // New field for position-specific counts
    scheduledStartTime: '',
    botCount: 0
  });

  const API = import.meta.env.VITE_API_URL || window.location.origin;

  useEffect(() => {
    fetchRaces();
    fetchTopics();
    initializeSocket();
  }, []);

  const initializeSocket = () => {
    const API = import.meta.env.VITE_API_URL || window.location.origin;
    // JWT token sent via socket auth for authentication
    const token = localStorage.getItem('authToken');
    const newSocket = io(API, { 
      auth: { token },
      transports: ['websocket', 'polling'] 
    });

    newSocket.on('connect', async () => {
      // Verify server-side auth before joining the admin monitoring room
      try {
        const token = localStorage.getItem('authToken');
        const res = await api.get(`/api/auth/me`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user?.role === 'admin') {
          newSocket.emit('joinAdminTeamRaces');
        }
      } catch (err) {
      }
    });

    // Listen for live leaderboard updates
    newSocket.on('teamLeaderboardUpdate', (data) => {
      setLiveLeaderboards(prev => ({
        ...prev,
        [data.raceId]: data.leaderboard
      }));
    });

    // Listen for race status updates
    newSocket.on('teamRaceStatusUpdate', (data) => {
      setRaces(prev => prev.map(race =>
        race._id === data.raceId ? { ...race, status: data.status, startTime: data.startTime } : race
      ));
    });

    // Listen for team player updates
    newSocket.on('teamPlayerUpdate', (data) => {
      // Could update team counts here if needed
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  };

  const fetchRaces = async () => {
    try {
      const res = await api.get(`/api/admin/team-race`);
      setRaces(res.data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await api.get(`/api/public/racer/topics`);
      setTopics(res.data);
    } catch (err) {
    }
  };

  const fetchLiveLeaderboard = async (raceId) => {
    try {
      const res = await api.get(`/api/admin/team-race/${raceId}/leaderboard`);
      setLiveLeaderboards(prev => ({
        ...prev,
        [raceId]: res.data.leaderboard
      }));
    } catch (err) {
    }
  };

  const handleCreateRace = async (e) => {
    e.preventDefault();
    try {
      // Build positionPuzzleCounts from positionInputs
      let positionPuzzleCounts = {};
      positionInputs.forEach(input => {
        if (input.count > 0) {
          positionPuzzleCounts[input.position.toString()] = input.count;
        }
      });

      const raceData = {
        ...newRace,
        positionPuzzleCounts
      };

      // Always treat scheduledStartTime input as IST (UTC+5:30), explicitly convert to UTC
      // regardless of the browser's local timezone setting.
      if (raceData.scheduledStartTime) {
        const [dp, tp] = raceData.scheduledStartTime.split('T');
        const [yr, mo, dy] = dp.split('-').map(Number);
        const [hr, mn] = tp.split(':').map(Number);
        raceData.scheduledStartTime = new Date(Date.UTC(yr, mo - 1, dy, hr - 5, mn - 30)).toISOString();
      }

      const res = await api.post(`/api/admin/team-race`, raceData);

      const race = res.data;
      setRaces([race, ...races]);
      setShowCreateModal(false);
      setNewRace({ 
        raceName: '', 
        duration: 600, 
        topic: '', 
        pointsPerPuzzle: 10, 
        puzzlesPerPosition: 10, 
        positionPuzzleCounts: {},
        scheduledStartTime: '',
        botCount: 0
      });
      setPositionInputs([{ position: 1, count: 10 }]);
      alert('Race created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleDeleteRace = async (raceId) => {
    if (!confirm('Are you sure you want to delete this race?')) return;

    try {
      await api.delete(`/api/admin/team-race/${raceId}`);
      setRaces(races.filter(r => r._id !== raceId));
      alert('Race deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const addPositionInput = () => {
    const nextPosition = Math.max(...positionInputs.map(p => p.position)) + 1;
    setPositionInputs([...positionInputs, { position: nextPosition, count: 10 }]);
  };

  const updatePositionInput = (index, field, value) => {
    const updated = [...positionInputs];
    updated[index][field] = field === 'position' ? parseInt(value) : parseInt(value);
    setPositionInputs(updated);
  };

  const removePositionInput = (index) => {
    if (positionInputs.length > 1) {
      setPositionInputs(positionInputs.filter((_, i) => i !== index));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      created: { color: '#6c757d', label: 'Created' },
      waiting: { color: '#ffc107', label: 'Waiting' },
      running: { color: '#28a745', label: 'Running' },
      finished: { color: '#dc3545', label: 'Finished' }
    };
    const badge = badges[status] || badges.created;
    return (
      <span style={{
        backgroundColor: badge.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="admin-team-race">
      <div className="admin-team-race-header">
        <h1>🏁 Team Race Management</h1>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)} className="btn-create">
            ➕ Create New Race
          </button>
          {races.length > 0 && (
            <button 
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete ALL ${races.length} team races? This action cannot be undone!`)) {
                  try {
                    // Delete all races
                    const deletePromises = races.map(race => 
                      api.delete(`/api/admin/team-race/${race._id}`)
                    );
                    
                    await Promise.all(deletePromises);
                    alert(`Successfully deleted ${races.length} team races`);
                    setRaces([]);
                  } catch (err) {
                    alert('Failed to delete races. Please check the console for details.');
                  }
                }
              }}
              className="btn-delete-all"
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: '1px solid #dc3545',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              🗑️ Delete All Races
            </button>
          )}
          <button onClick={() => navigate('/admin')} className="btn-back">
            ← Back to Admin
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Team Race</h2>
            <form onSubmit={handleCreateRace}>
              <div className="form-group">
                <label>Race Name *</label>
                <input
                  type="text"
                  value={newRace.raceName}
                  onChange={e => setNewRace({ ...newRace, raceName: e.target.value })}
                  required
                  placeholder="e.g., Friday Night Blitz"
                />
              </div>

              <div className="form-group">
                <label>Duration (seconds) *</label>
                <input
                  type="number"
                  value={newRace.duration}
                  onChange={e => setNewRace({ ...newRace, duration: parseInt(e.target.value) })}
                  required
                  min="60"
                  placeholder="600"
                />
                <small>{Math.floor(newRace.duration / 60)} minutes</small>
              </div>

              <div className="form-group">
                <label>Topic * {topics.length === 0 && <span style={{ color: '#dc3545' }}>({loading ? 'Loading...' : 'No topics available'})</span>}</label>
                <select
                  value={newRace.topic}
                  onChange={e => setNewRace({ ...newRace, topic: e.target.value })}
                  required
                  disabled={topics.length === 0}
                >
                  <option value="">{topics.length === 0 ? 'No topics found' : 'Select Topic'}</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.icon} {topic.title} ({topic.puzzles} puzzles)
                    </option>
                  ))}
                </select>
                {topics.length === 0 && (
                  <small style={{ color: '#dc3545' }}>
                    {loading ? 'Loading topics...' : 'No topics are available. Please contact admin.'}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Points Per Puzzle *</label>
                <input
                  type="number"
                  value={newRace.pointsPerPuzzle}
                  onChange={e => setNewRace({ ...newRace, pointsPerPuzzle: parseInt(e.target.value) })}
                  required
                  min="1"
                  placeholder="10"
                />
              </div>

              <div className="form-group">
                <label>Puzzles per Position *</label>
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    <small>Configure puzzles for each position:</small>
                  </div>
                    {positionInputs.map((input, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ marginRight: '10px', minWidth: '80px' }}>Position {input.position}:</span>
                        <input
                          type="number"
                          value={input.count}
                          onChange={e => updatePositionInput(index, 'count', e.target.value)}
                          min="1"
                          max="1000"
                          placeholder="10"
                          style={{ width: '80px', marginRight: '10px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePositionInput(index)}
                          disabled={positionInputs.length <= 1}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '2px 6px',
                            cursor: positionInputs.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPositionInput}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginTop: '5px'
                      }}
                    >
                      + Add Position
                    </button>
                  </div>
                </div>

              <div className="form-group">
                <label>Scheduled Start Time — IST (Optional)</label>
                <input
                  type="datetime-local"
                  value={newRace.scheduledStartTime}
                  onChange={e => setNewRace({ ...newRace, scheduledStartTime: e.target.value })}
                />
                <small>Enter time in Indian Standard Time (IST). The race will start automatically at this time.</small>
              </div>

              <div className="form-group">
                <label>🤖 Bot Players</label>
                <select
                  value={newRace.botCount}
                  onChange={e => setNewRace({ ...newRace, botCount: parseInt(e.target.value) })}
                >
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n === 0 ? '0 — No bots' : `${n} bot${n > 1 ? 's' : ''}`}</option>
                  ))}
                </select>
                <small>Bots join as a separate team and compete automatically (daily rotating names)</small>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit">Create Race</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="races-list">
        {races.length === 0 ? (
          <div className="empty-state">
            <p>No team races created yet. Click "Create New Race" to get started!</p>
          </div>
        ) : (
          races.map(race => (
            <div key={race._id} className="race-card">
              <div className="race-header">
                <h3>{race.raceName}</h3>
                {getStatusBadge(race.status)}
                {race.status === 'running' && (
                  <button
                    onClick={async () => {
                      setActiveRaceId(race._id);
                      setShowLiveLeaderboard(true);
                      // Fetch current leaderboard immediately
                      await fetchLiveLeaderboard(race._id);
                    }}
                    className="btn-live-leaderboard"
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '10px'
                    }}
                  >
                    📊 Live View
                  </button>
                )}
              </div>
              
              <div className="race-details">
                <div className="detail-item">
                  <strong>Topic:</strong> {getTopicTitle(race.topic)}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {Math.floor(race.duration / 60)} minutes
                </div>
                <div className="detail-item">
                  <strong>Points:</strong> {race.pointsPerPuzzle} per puzzle
                </div>
                <div className="detail-item">
                  <strong>Puzzles:</strong> {
                    race.positionPuzzleCounts && Object.keys(race.positionPuzzleCounts).length > 0
                      ? Object.entries(race.positionPuzzleCounts).map(([pos, count]) => `Pos ${pos}: ${count}`).join(', ')
                      : `${race.puzzlesPerPosition} per position`
                  }
                </div>
                <div className="detail-item">
                  <strong>Created:</strong> {new Date(race.createdAt).toLocaleDateString()}
                </div>
                {race.scheduledStartTime && (
                  <div className="detail-item">
                    <strong>Scheduled (IST):</strong> {new Date(race.scheduledStartTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                )}
                {liveLeaderboards[race._id] && (
                  <div className="detail-item">
                    <strong>Live Teams:</strong> {liveLeaderboards[race._id].length}
                  </div>
                )}
              </div>

              <div className="race-actions">
                <button 
                  onClick={() => navigate(`/admin/team-race/${race._id}`)}
                  className="btn-manage"
                >
                  ⚙️ Manage
                </button>
                <button 
                  onClick={() => handleDeleteRace(race._id)}
                  className="btn-delete"
                  disabled={race.status === 'running'}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live Leaderboard Modal */}
      {showLiveLeaderboard && activeRaceId && (
        <div className="modal-overlay" onClick={() => setShowLiveLeaderboard(false)}>
          <div className="modal-content live-leaderboard-modal" onClick={e => e.stopPropagation()}>
            <div className="live-leaderboard-header">
              <h2>🏆 Live Team Race Leaderboard</h2>
              <button
                onClick={() => setShowLiveLeaderboard(false)}
                className="btn-close"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                Ã—
              </button>
            </div>

            <div className="live-leaderboard-content">
              {liveLeaderboards[activeRaceId] ? (
                <div className="leaderboard-table">
                  <div className="leaderboard-header">
                    <div>Rank</div>
                    <div>Team</div>
                    <div>Score</div>
                    <div>Players</div>
                    <div>Status</div>
                  </div>
                  {liveLeaderboards[activeRaceId]
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((team, index) => (
                      <div key={team.teamId} className="leaderboard-row">
                        <div className="rank">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <div className="team-name">{team.teamName}</div>
                        <div className="score">{team.totalScore}</div>
                        <div className="players">{team.activePlayers}/{team.totalPlayers}</div>
                        <div className="status">
                          <span style={{
                            color: team.status === 'finished' ? '#28a745' : team.status === 'running' ? '#ffc107' : '#6c757d',
                            fontWeight: 'bold'
                          }}>
                            {team.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="no-leaderboard">
                  <p>No live data available yet. Leaderboard will appear once teams start playing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTeamRace;
