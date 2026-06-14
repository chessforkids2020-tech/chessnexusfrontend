import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import { getTopicTitle } from '../../utils/topicTitles';
import { useAuth } from '../../contexts/AuthContext';
import './EliteTeamRace.css';

function EliteTeamRaceManage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [race, setRace]               = useState(null);
  const [teams, setTeams]             = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showTeamModal, setShowTeamModal]           = useState(false);
  const [showAssignModal, setShowAssignModal]         = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeam, setNewTeam]           = useState({ teamName: '', maxPlayers: 20 });
  const [assignData, setAssignData]     = useState({ userId: '', position: 1 });
  const [bulkAssignData, setBulkAssignData] = useState([]);
  const [timeLeft, setTimeLeft]         = useState(0);
  const timerRef = useRef(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!raceId) { navigate('/elite/team-race'); return; }
    fetchRaceDetails();
    fetchTeams();
    fetchUsers();

    socket.emit('joinTeamRace', { raceId });

    socket.on('teamPlayerJoined', (data) => {
      if (data.teams) setTeams(data.teams);
      else fetchTeams();
    });

    return () => {
      socket.off('teamPlayerJoined');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [raceId]);

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (race?.status === 'running' && race.startTime) {
      const elapsed = Math.floor((Date.now() - new Date(race.startTime)) / 1000);
      const remaining = Math.max(0, race.duration - elapsed);
      setTimeLeft(remaining);
      if (remaining > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
        }, 1000);
      }
    } else {
      setTimeLeft(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [race]);

  // ── API helpers ───────────────────────────────────────────────────────────────
  const fetchRaceDetails = async () => {
    try {
      const res = await api.get(`/api/team-race/${raceId}`);
      setRace(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get(`/api/admin/team-race/${raceId}/teams`);
      const raw = Array.isArray(res.data) ? res.data : (res.data?.teams || []);
      setTeams(raw.map(t => ({ ...t, players: t.players || [] })));
    } catch { setTeams([]); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers((res.data || []).filter(u => u.role === 'user'));
    } catch { /* ignore */ }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/team-race/${raceId}/teams`, newTeam);
      setShowTeamModal(false);
      setNewTeam({ teamName: '', maxPlayers: 20 });
      await fetchTeams();
      alert('Team created!');
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleAssignUser = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/team-race/${raceId}/assign`, {
        teamId: selectedTeam._id,
        userId: assignData.userId,
        position: parseInt(assignData.position),
      });
      await fetchTeams();
      setShowAssignModal(false);
      setAssignData({ userId: '', position: 1 });
      alert('User assigned!');
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkAssignData.length) { alert('Add at least one assignment'); return; }
    try {
      const res = await api.post(`/api/admin/team-race/${raceId}/bulk-assign`, {
        teamId: selectedTeam._id,
        assignments: bulkAssignData,
      });
      await fetchTeams();
      setShowBulkAssignModal(false);
      setBulkAssignData([]);
      alert(`${res.data?.successCount || 0} users assigned.`);
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleRemoveUser = async (teamId, userId) => {
    if (!confirm('Remove this user?')) return;
    try {
      await api.delete(`/api/admin/team-race/${raceId}/teams/${teamId}/users/${userId}`);
      await fetchTeams();
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleStartRace = async () => {
    if (!confirm('Open the lobby so users can join teams?')) return;
    try {
      await api.post(`/api/admin/team-race/${raceId}/start`);
      await fetchRaceDetails();
      alert('Lobby is open!');
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleRunRace = async () => {
    if (!confirm('Begin the race? Timer starts for everyone.')) return;
    try {
      await api.post(`/api/admin/team-race/${raceId}/run`);
      await fetchRaceDetails();
      alert('Race is running!');
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const handleFinishRace = async () => {
    if (!confirm('Finish the race?')) return;
    try {
      await api.post(`/api/admin/team-race/${raceId}/finish`);
      await fetchRaceDetails();
      alert('Race finished!');
      navigate(`/elite/team-race/${raceId}/results`);
    } catch (err) { alert(err.response?.data?.message || 'Server error'); }
  };

  const openAssignModal = (team) => {
    setSelectedTeam(team);
    const pos = team.players.length ? Math.max(...team.players.map(p => p.position)) + 1 : 1;
    setAssignData({ userId: '', position: pos });
    setShowAssignModal(true);
  };

  const openBulkModal = (team) => {
    setSelectedTeam(team);
    setBulkAssignData([]);
    setShowBulkAssignModal(true);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) return <div className="elite-tr-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><span style={{ color:'#9ca3af' }}>Loading…</span></div>;
  if (!race)   return <div className="elite-tr-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><span style={{ color:'#9ca3af' }}>Race not found.</span></div>;

  // Only the creator can manage this race; admins bypass this check
  const creatorId = race.createdBy?._id || race.createdBy;
  if (user?.role === 'elite' && String(creatorId) !== String(currentUserId)) {
    return (
      <div className="elite-tr-root" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'16px' }}>
        <div style={{ fontSize:'3rem' }}>🔒</div>
        <h2 style={{ color:'#e5e7eb', margin:0 }}>Access Denied</h2>
        <p style={{ color:'#9ca3af', textAlign:'center', maxWidth:'380px' }}>
          You can only manage races <strong style={{ color:'#fbbf24' }}>you created</strong>.
        </p>
        <button onClick={() => navigate('/elite/team-race')} className="btn-elite-back">← Back to Races</button>
      </div>
    );
 }

  const timerPct = race.duration ? (timeLeft / race.duration) * 100 : 100;
  const timerColor = timerPct > 50 ? '#10b981' : timerPct > 20 ? '#fbbf24' : '#ef4444';

  return (
    <div className="elite-tr-root">

      {/* ── Header ── */}
      <div className="elite-tr-manage-header">
        <div>
          <h1>💎 {race.raceName}</h1>
          <div className="elite-race-info-chips">
            <span className="elite-chip cyan">🎯 {getTopicTitle(race.topic)}</span>
            <span className="elite-chip">⏱ {Math.floor(race.duration / 60)} min</span>
            <span className={`elite-chip ${race.status === 'running' ? 'green' : race.status === 'finished' ? 'red' : race.status === 'waiting' ? 'amber' : ''}`}>
              {race.status}
            </span>
            {race.scheduledStartTime && race.status !== 'running' && race.status !== 'finished' && (
              <span className="elite-chip amber">
                📅 {new Date(race.scheduledStartTime).toLocaleString()}
              </span>
            )}
            {race.status === 'running' && (
              <span className="elite-timer-chip">⏱️ {formatTime(timeLeft)}</span>
            )}
          </div>
        </div>
        <div className="elite-tr-header-actions">
          {race.status === 'created' && (
            <button onClick={handleStartRace} className="btn-elite-start">🚀 Open Lobby</button>
          )}
          {race.status === 'waiting' && (
            <button onClick={handleRunRace} className="btn-elite-run">▶️ Begin Race</button>
          )}
          {race.status === 'running' && (
            <button onClick={handleFinishRace} className="btn-elite-finish">🏁 Finish Race</button>
          )}
          {(race.status === 'finished' || race.status === 'running') && (
            <button onClick={() => navigate(`/elite/team-race/${raceId}/results`)} className="btn-elite-results">
              📊 Results
            </button>
          )}
          <button onClick={() => navigate('/elite/team-race')} className="btn-elite-back">← Back</button>
        </div>
      </div>

      {/* ── Teams section ── */}
      <div className="elite-section-header">
        <h2>Teams ({teams.length})</h2>
        <button onClick={() => setShowTeamModal(true)} className="btn-elite-primary" disabled={race.status === 'finished'}>
          ➕ Add Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="elite-tr-empty">No teams yet. Click <strong>Add Team</strong> to create one.</div>
      ) : (
        <div className="elite-teams-grid">
          {teams.map(team => (
            <div key={team._id} className="elite-team-card">
              <div className="elite-team-card-head">
                <h3>{team.teamName}</h3>
                <span className="elite-player-count">{team.players.length}/{team.maxPlayers}</span>
              </div>

              <div className="elite-players-list">
                {team.players.length === 0
                  ? <div className="elite-no-players">No players yet</div>
                  : team.players.slice().sort((a, b) => a.position - b.position).map(player => (
                    <div key={player.userId?._id || player.userId} className="elite-player-row">
                      <div className="elite-player-info">
                        <span className="elite-pos-badge">#{player.position}</span>
                        <span className="elite-player-name">
                          {player.userId?.displayName || player.userId?.username || '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(team._id, player.userId?._id || player.userId)}
                        className="btn-elite-remove"
                        disabled={race.status === 'finished'}
                      >✕</button>
                    </div>
                  ))
                }
              </div>

              <div className="elite-team-foot">
                <button
                  onClick={() => openAssignModal(team)}
                  className="btn-elite-assign"
                  disabled={team.players.length >= team.maxPlayers || race.status === 'finished'}
                >➕ Assign</button>
                <button
                  onClick={() => openBulkModal(team)}
                  className="btn-elite-assign btn-elite-bulk"
                  disabled={team.players.length >= team.maxPlayers || race.status === 'finished'}
                >📋 Bulk</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Team Modal ── */}
      {showTeamModal && (
        <div className="elite-modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="elite-modal" onClick={e => e.stopPropagation()}>
            <h2>🏟️ Create Team</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="elite-form-group">
                <label>Team Name *</label>
                <input type="text" required placeholder="e.g., Blue Dragons"
                  value={newTeam.teamName}
                  onChange={e => setNewTeam({ ...newTeam, teamName: e.target.value })} />
              </div>
              <div className="elite-form-group">
                <label>Max Players</label>
                <input type="number" min="1" max="20"
                  value={newTeam.maxPlayers}
                  onChange={e => setNewTeam({ ...newTeam, maxPlayers: parseInt(e.target.value) })} />
              </div>
              <div className="elite-modal-actions">
                <button type="submit" className="btn-elite-primary">Create</button>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn-elite-back">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign User Modal ── */}
      {showAssignModal && selectedTeam && (
        <div className="elite-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="elite-modal" onClick={e => e.stopPropagation()}>
            <h2>👤 Assign to {selectedTeam.teamName}</h2>
            <form onSubmit={handleAssignUser}>
              <div className="elite-form-group">
                <label>User *</label>
                <select required value={assignData.userId}
                  onChange={e => setAssignData({ ...assignData, userId: e.target.value })}>
                  <option value="">Choose user…</option>
                  {users
                    .filter(u => !teams.some(t => t.players.some(p => (p.userId?._id || p.userId) === u._id)))
                    .map(u => <option key={u._id} value={u._id}>{u.displayName || u.username}</option>)}
                </select>
              </div>
              <div className="elite-form-group">
                <label>Position *</label>
                <input type="number" required min="1" max={selectedTeam.maxPlayers}
                  value={assignData.position}
                  onChange={e => setAssignData({ ...assignData, position: parseInt(e.target.value) })} />
                <small>Position determines which puzzle set this player gets</small>
              </div>
              <div className="elite-modal-actions">
                <button type="submit" className="btn-elite-primary">Assign</button>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-elite-back">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Modal ── */}
      {showBulkAssignModal && selectedTeam && (
        <div className="elite-modal-overlay" onClick={() => setShowBulkAssignModal(false)}>
          <div className="elite-modal" onClick={e => e.stopPropagation()}>
            <h2>📋 Bulk Assign to {selectedTeam.teamName}</h2>
            <form onSubmit={handleBulkAssign}>
              {bulkAssignData.map((a, i) => (
                <div key={i} className="elite-bulk-row">
                  <div className="elite-form-group" style={{ margin: 0 }}>
                    <label>User {i + 1}</label>
                    <select required value={a.userId}
                      onChange={e => {
                        const upd = [...bulkAssignData]; upd[i].userId = e.target.value; setBulkAssignData(upd);
                      }}>
                      <option value="">Choose…</option>
                      {users
                        .filter(u => !teams.some(t => t.players.some(p => (p.userId?._id || p.userId) === u._id)))
                        .map(u => <option key={u._id} value={u._id}>{u.displayName || u.username}</option>)}
                    </select>
                  </div>
                  <div className="elite-form-group" style={{ margin: 0 }}>
                    <label>Pos</label>
                    <input type="number" required min="1" max={selectedTeam.maxPlayers}
                      value={a.position} style={{ width: 70 }}
                      onChange={e => {
                        const upd = [...bulkAssignData]; upd[i].position = parseInt(e.target.value); setBulkAssignData(upd);
                      }} />
                  </div>
                  <button type="button" className="btn-elite-remove" style={{ marginTop: 20 }}
                    onClick={() => setBulkAssignData(bulkAssignData.filter((_, idx) => idx !== i))}>❌</button>
                </div>
              ))}
              <div className="elite-bulk-actions">
                <button type="button" className="btn-elite-add-row"
                  onClick={() => setBulkAssignData([...bulkAssignData, { userId: '', position: bulkAssignData.length + 1 }])}>
                  ➕ Add Row
                </button>
              </div>
              <div className="elite-modal-actions">
                <button type="submit" className="btn-elite-primary" disabled={!bulkAssignData.length}>
                  Assign {bulkAssignData.length} User{bulkAssignData.length !== 1 ? 's' : ''}
                </button>
                <button type="button" onClick={() => setShowBulkAssignModal(false)} className="btn-elite-back">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default EliteTeamRaceManage;

