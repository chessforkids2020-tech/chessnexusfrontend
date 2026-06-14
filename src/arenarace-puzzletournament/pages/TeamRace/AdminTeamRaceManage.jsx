import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import { getTopicTitle } from '../../../utils/topicTitles';
import './AdminTeamRaceManage.css';

function AdminTeamRaceManage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({ teamName: '', maxPlayers: 10 });
  const [assignData, setAssignData] = useState({ userId: '', position: 1 });
  const [bulkAssignData, setBulkAssignData] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const API = import.meta.env.VITE_API_URL || window.location.origin;

  useEffect(() => {
    if (!raceId) {
      navigate('/admin');
      return;
    }

    fetchRaceDetails();
    fetchTeams();
    fetchUsers();

    // Join race room for live updates
    socket.emit('joinTeamRace', { raceId });

    // Listen for player joins - update teams directly from event
    socket.on('teamPlayerJoined', (data) => {
      if (data.teams) {
        setTeams(data.teams);
      } else {
        // Fallback to API if teams not in event
        fetchTeams();
      }
    });

    return () => {
      socket.off('teamPlayerJoined');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [raceId]); // Only depend on raceId to avoid infinite loop

  // Timer countdown effect
  useEffect(() => {
    if (race && race.status === 'running' && race.startTime) {
      // Calculate initial time left
      const now = new Date();
      const raceStartTime = new Date(race.startTime);
      const elapsedSeconds = Math.floor((now - raceStartTime) / 1000);
      const remainingTime = Math.max(0, race.duration - elapsedSeconds);
      setTimeLeft(remainingTime);

      // Start countdown
      if (remainingTime > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      setTimeLeft(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [race]);

  const fetchRaceDetails = async () => {
    try {
      const response = await api.get(`/api/team-race/${raceId}`);
      setRace(response.data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get(`/api/admin/team-race/${raceId}/teams`);
      const data = response.data;
      
      // Handle different possible response structures
      let teamsArray;
      if (Array.isArray(data)) {
        teamsArray = data;
      } else if (data && Array.isArray(data.teams)) {
        teamsArray = data.teams;
      } else if (data && typeof data === 'object') {
        teamsArray = [];
      } else {
        teamsArray = [];
      }
      
      // Ensure all teams have players array
      const teamsWithPlayers = teamsArray.map(team => ({
        ...team,
        players: team.players || []
      }));
      setTeams(teamsWithPlayers);
    } catch (err) {
      setTeams([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      const data = response.data;
      setUsers((data || []).filter(u => u.role === 'user'));
    } catch (err) {
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/admin/team-race/${raceId}/teams`, newTeam);
      setShowTeamModal(false);
      setNewTeam({ teamName: '', maxPlayers: 10 });
      // Refresh teams list from server
      await fetchTeams();
      alert('Team created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleAssignUser = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/team-race/${raceId}/assign`, {
        teamId: selectedTeam._id,
        userId: assignData.userId,
        position: parseInt(assignData.position)
      });
      await fetchTeams();
      setShowAssignModal(false);
      setAssignData({ userId: '', position: 1 });
      alert('User assigned successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleBulkAssignUsers = async (e) => {
    e.preventDefault();
    if (bulkAssignData.length === 0) {
      alert('Please add at least one user assignment');
      return;
    }

    try {
      const data = await api.post(`/api/admin/team-race/${raceId}/bulk-assign`, {
        teamId: selectedTeam._id,
        assignments: bulkAssignData
      });

      await fetchTeams();
      setShowBulkAssignModal(false);
      setBulkAssignData([]);

      const successMsg = `Bulk assignment completed!\n${data.successCount} users assigned successfully.`;
      const errorMsg = data.errorCount > 0 ? `\n${data.errorCount} assignments failed.` : '';
      alert(successMsg + errorMsg);

      if (data.errors && data.errors.length > 0) {
      }
    } catch (err) {
      const data = err.response?.data || {};
      alert(data.message || 'Server error');
    }
  };

  const addBulkAssignment = () => {
    setBulkAssignData([...bulkAssignData, { userId: '', position: bulkAssignData.length + 1 }]);
  };

  const updateBulkAssignment = (index, field, value) => {
    const updated = [...bulkAssignData];
    updated[index][field] = field === 'position' ? parseInt(value) : value;
    setBulkAssignData(updated);
  };

  const removeBulkAssignment = (index) => {
    setBulkAssignData(bulkAssignData.filter((_, i) => i !== index));
  };

  const handleRemoveUser = async (teamId, userId) => {
    if (!confirm('Remove this user from the team?')) return;

    try {
      await api.delete(`/api/admin/team-race/${raceId}/teams/${teamId}/users/${userId}`);
      await fetchTeams();
      alert('User removed successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleStartRace = async () => {
    if (!confirm('Start the race and open lobby for users?')) return;

    try {
      const response = await api.post(`/api/admin/team-race/${raceId}/start`);
      await fetchRaceDetails();
      alert('Race started! Users can now join teams.');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleRunRace = async () => {
    if (!confirm('Begin the race? Timer will start for all participants.')) return;

    try {
      await api.post(`/api/admin/team-race/${raceId}/run`);
      await fetchRaceDetails();
      alert('Race is now running!');
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const handleFinishRace = async () => {
    if (!confirm('Finish the race and calculate results?')) return;

    try {
      await api.post(`/api/admin/team-race/${raceId}/finish`);
      await fetchRaceDetails();
      alert('Race finished! View results.');
      navigate(`/admin/team-race/${raceId}/results`);
    } catch (err) {
      alert(err.response?.data?.message || 'Server error');
    }
  };

  const openAssignModal = (team) => {
    if (!team || !team.players) return;
    setSelectedTeam(team);
    setShowAssignModal(true);
    
    // Calculate next available position
    const positions = team.players.map(p => p.position);
    const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 1;
    setAssignData({ userId: '', position: nextPosition });
  };

  const openBulkAssignModal = (team) => {
    if (!team) return;
    setSelectedTeam(team);
    setShowBulkAssignModal(true);
    setBulkAssignData([]); // Start with empty bulk assignments
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (!race) return '#28a745';
    const percentage = (timeLeft / race.duration) * 100;
    if (percentage > 50) return '#28a745';
    if (percentage > 20) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!race) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Race not found</div>;
  }

  return (
    <div className="admin-team-race-manage">
      <div className="manage-header">
        <div>
          <h1>🏁 {race.raceName}</h1>
          <div className="race-info">
            <span>Topic: {getTopicTitle(race.topic)}</span>
            <span>Duration: {Math.floor(race.duration / 60)} min</span>
            <span>Status: <strong>{race.status}</strong></span>
            {race.scheduledStartTime && race.status === 'created' && (
              <span>Scheduled (IST): <strong>{new Date(race.scheduledStartTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong></span>
            )}
            {race.status === 'running' && (
              <span className="timer-display" style={{
                backgroundColor: getTimerColor(),
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '18px',
                marginLeft: '10px',
                animation: timeLeft <= 60 ? 'pulse 1s infinite' : 'none'
              }}>
                ⏱️ {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          {race.status === 'created' && (
            <button onClick={handleStartRace} className="btn-start">
              🚀 Start Race (Open Lobby)
            </button>
          )}
          {race.status === 'waiting' && (
            <button onClick={handleRunRace} className="btn-run">
              ▶️ Begin Race
            </button>
          )}
          {race.status === 'running' && (
            <button onClick={handleFinishRace} className="btn-finish">
              🏁 Finish Race
            </button>
          )}
          {(race.status === 'finished' || race.status === 'running') && (
            <button onClick={() => navigate(`/admin/team-race/${raceId}/results`)} className="btn-results">
              📊 View Results
            </button>
          )}
          <button onClick={() => navigate('/admin/team-race')} className="btn-back">
            ← Back
          </button>
        </div>
      </div>

      <div className="manage-content">
        <div className="section-header">
          <h2>Teams</h2>
          <button onClick={() => setShowTeamModal(true)} className="btn-add-team">
            ➕ Add Team
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="empty-state">No teams created yet. Click "Add Team" to start.</div>
        ) : (
          <div className="teams-grid">
            {teams.map(team => team ? (
              <div key={team._id} className="team-card">
                <div className="team-card-header">
                  <h3>{team.teamName}</h3>
                  <span className="player-count">
                    {(team.players || []).length}/{team.maxPlayers} players
                  </span>
                </div>

                <div className="players-list">
                  {(team.players || []).length === 0 ? (
                    <div className="no-players">No players yet</div>
                  ) : (
                    (team.players || [])
                      .sort((a, b) => a.position - b.position)
                      .map(player => (
                        <div key={player.userId._id} className="player-item">
                          <div className="player-info">
                            <span className="position-badge">#{player.position}</span>
                            <span className="player-name">
                              {player.userId.displayName || player.userId.username}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveUser(team._id, player.userId._id)}
                            className="btn-remove"
                            disabled={race.status === 'running' || race.status === 'finished'}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="team-actions">
                  <button
                    onClick={() => openAssignModal(team)}
                    className="btn-assign"
                    disabled={(team.players || []).length >= team.maxPlayers || race.status === 'running' || race.status === 'finished'}
                  >
                    ➕ Assign User
                  </button>
                  <button
                    onClick={() => openBulkAssignModal(team)}
                    className="btn-assign btn-bulk"
                    disabled={(team.players || []).length >= team.maxPlayers || race.status === 'running' || race.status === 'finished'}
                  >
                    📋 Bulk Assign
                  </button>
                </div>
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Team</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={newTeam.teamName}
                  onChange={e => setNewTeam({ ...newTeam, teamName: e.target.value })}
                  required
                  placeholder="e.g., Blue Dragons"
                />
              </div>

              <div className="form-group">
                <label>Max Players *</label>
                <input
                  type="number"
                  value={newTeam.maxPlayers}
                  onChange={e => setNewTeam({ ...newTeam, maxPlayers: parseInt(e.target.value) })}
                  required
                  min="1"
                  max="20"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit">Create Team</button>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Assign User to {selectedTeam.teamName}</h2>
            <form onSubmit={handleAssignUser}>
              <div className="form-group">
                <label>Select User *</label>
                <select
                  value={assignData.userId}
                  onChange={e => setAssignData({ ...assignData, userId: e.target.value })}
                  required
                >
                  <option value="">Choose user...</option>
                  {users
                    .filter(u => !teams.some(t => t.players.some(p => p.userId._id === u._id)))
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.displayName || user.username}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label>Position *</label>
                <input
                  type="number"
                  value={assignData.position}
                  onChange={e => setAssignData({ ...assignData, position: parseInt(e.target.value) })}
                  required
                  min="1"
                  max={selectedTeam.maxPlayers}
                />
                <small>Position determines puzzle set assignment</small>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit">Assign User</button>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Users Modal */}
      {showBulkAssignModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowBulkAssignModal(false)}>
          <div className="modal-content bulk-modal" onClick={e => e.stopPropagation()}>
            <h2>Bulk Assign Users to {selectedTeam.teamName}</h2>
            <form onSubmit={handleBulkAssignUsers}>
              <div className="bulk-assignments">
                {bulkAssignData.map((assignment, index) => (
                  <div key={index} className="bulk-assignment-row">
                    <div className="form-group">
                      <label>User {index + 1}</label>
                      <select
                        value={assignment.userId}
                        onChange={e => updateBulkAssignment(index, 'userId', e.target.value)}
                        required
                      >
                        <option value="">Choose user...</option>
                        {users
                          .filter(u => !teams.some(t => t.players.some(p => p.userId._id === u._id)))
                          .map(user => (
                            <option key={user._id} value={user._id}>
                              {user.displayName || user.username}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Position</label>
                      <input
                        type="number"
                        value={assignment.position}
                        onChange={e => updateBulkAssignment(index, 'position', e.target.value)}
                        required
                        min="1"
                        max={selectedTeam.maxPlayers}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBulkAssignment(index)}
                      className="btn-remove"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              <div className="bulk-actions">
                <button type="button" onClick={addBulkAssignment} className="btn-add">
                  ➕ Add User
                </button>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit" disabled={bulkAssignData.length === 0}>
                  Assign {bulkAssignData.length} User{bulkAssignData.length !== 1 ? 's' : ''}
                </button>
                <button type="button" onClick={() => setShowBulkAssignModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTeamRaceManage;
