import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './EliteTeamRace.css';

const EliteTeamRace = () => {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRace, setNewRace] = useState({
    raceName: '',
    duration: 600,
    topic: '',
    pointsPerPuzzle: 10,
    puzzlesPerPosition: 500,
    scheduledStartTime: '',
    botCount: 0
  });

  useEffect(() => {
    fetchRaces();
    fetchTopics();
  }, []);

  const fetchRaces = async () => {
    try {
      const response = await api.get('/api/admin/team-race');
      // Backend returns a plain array
      const data = response.data;
      setRaces(Array.isArray(data) ? data : (data.races || []));
    } catch (err) {
      console.error('Failed to fetch races:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get('/api/arena/topics');
      setTopics(response.data.topics || response.data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    }
  };

  const handleCreateRace = async (e) => {
    e.preventDefault();
    if (!newRace.topic) {
      alert('Please select a topic');
      return;
    }
    try {
      const payload = { ...newRace };
      if (!payload.scheduledStartTime) delete payload.scheduledStartTime;
      await api.post('/api/admin/team-race', payload);
      setShowCreateModal(false);
      setNewRace({
        raceName: '',
        duration: 600,
        topic: '',
        pointsPerPuzzle: 10,
        puzzlesPerPosition: 500,
        scheduledStartTime: '',
        botCount: 0
      });
      fetchRaces();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create race');
    }
  };

  const handleDeleteRace = async (raceId) => {
    if (!window.confirm('Are you sure you want to delete this race?')) return;
    try {
      await api.delete(`/api/admin/team-race/${raceId}`);
      setRaces(prev => prev.filter(r => r._id !== raceId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete race');
    }
  };

  const statusClass = (s) => ({ created: 'created', waiting: 'waiting', running: 'running', finished: 'finished' }[s] || 'created');

  if (loading) return <div className="elite-tr-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}><span style={{ color:'#9ca3af' }}>Loading…</span></div>;

  return (
    <div className="elite-tr-root">

      {/* ── Header ── */}
      <div className="elite-tr-header">
        <div>
          <h1>💎 Elite Team Races</h1>
          <p className="elite-tr-header-sub">Create and manage team race events for your community</p>
        </div>
        <div className="elite-tr-header-actions">
          <button onClick={() => setShowCreateModal(true)} className="btn-elite-primary">
            ➕ Create Race
          </button>
          <button onClick={() => navigate('/team-race')} className="btn-elite-back">
            ← Back
          </button>
        </div>
      </div>

      {/* ── Race list ── */}
      <div className="elite-tr-list">
        {races.length === 0 ? (
          <div className="elite-tr-empty">No races yet. Click <strong>Create Race</strong> to get started.</div>
        ) : races.map(race => (
          <div key={race._id} className="elite-race-card">
            <div className="elite-race-card-top">
              <h3>{race.raceName}</h3>
              <span className={`elite-status-badge ${statusClass(race.status)}`}>
                {race.status}
              </span>
            </div>

            <div className="elite-race-meta">
              <div className="elite-race-meta-item"><strong>Topic:</strong> {race.topic}</div>
              <div className="elite-race-meta-item"><strong>Duration:</strong> {Math.floor(race.duration / 60)} min</div>
              <div className="elite-race-meta-item"><strong>Points:</strong> {race.pointsPerPuzzle}/puzzle</div>
              <div className="elite-race-meta-item">
                <strong>Puzzles:</strong>{' '}
                {race.positionPuzzleCounts && Object.keys(race.positionPuzzleCounts).length > 0
                  ? Object.entries(race.positionPuzzleCounts).map(([p, c]) => `Pos ${p}: ${c}`).join(', ')
                  : `${race.puzzlesPerPosition} per position`}
              </div>
              <div className="elite-race-meta-item"><strong>Created:</strong> {new Date(race.createdAt).toLocaleDateString()}</div>
              {race.scheduledStartTime && (
                <div className="elite-race-meta-item">
                  <strong>Scheduled:</strong>{' '}
                  {new Date(race.scheduledStartTime).toLocaleString()}
                </div>
              )}
            </div>

            <div className="elite-race-card-actions">
              <button onClick={() => navigate(`/elite/team-race/${race._id}`)} className="btn-elite-secondary">
                ⚙️ Manage Teams
              </button>
              <button
                onClick={() => handleDeleteRace(race._id)}
                className="btn-elite-danger"
                disabled={race.status === 'running'}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* ── Create Race Modal ── */}
      {showCreateModal && (
        <div className="elite-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="elite-modal" onClick={e => e.stopPropagation()}>
            <h2>✨ Create Team Race</h2>
            <form onSubmit={handleCreateRace}>
              <div className="elite-form-group">
                <label>Race Name *</label>
                <input
                  type="text" required placeholder="e.g., Friday Night Blitz"
                  value={newRace.raceName}
                  onChange={e => setNewRace({ ...newRace, raceName: e.target.value })}
                />
              </div>
              <div className="elite-form-group">
                <label>Duration (seconds) *</label>
                <input
                  type="number" required min="60" placeholder="600"
                  value={newRace.duration}
                  onChange={e => setNewRace({ ...newRace, duration: parseInt(e.target.value) })}
                />
                <small>{Math.floor(newRace.duration / 60)} minutes</small>
              </div>
              <div className="elite-form-group">
                <label>Topic *</label>
                <select
                  required disabled={topics.length === 0}
                  value={newRace.topic}
                  onChange={e => setNewRace({ ...newRace, topic: e.target.value })}
                >
                  <option value="">{topics.length === 0 ? 'No topics found' : 'Select Topic'}</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.title} ({t.puzzleCount} puzzles)</option>
                  ))}
                </select>
              </div>
              <div className="elite-form-group">
                <label>Points Per Puzzle *</label>
                <input
                  type="number" required min="1" placeholder="10"
                  value={newRace.pointsPerPuzzle}
                  onChange={e => setNewRace({ ...newRace, pointsPerPuzzle: parseInt(e.target.value) })}
                />
              </div>
              <div className="elite-form-group">
                <label>Puzzles per Position *</label>
                <input
                  type="number" required min="1" max="10000" placeholder="500"
                  value={newRace.puzzlesPerPosition}
                  onChange={e => setNewRace({ ...newRace, puzzlesPerPosition: parseInt(e.target.value) })}
                />
                <small>Each position gets this many unique puzzles</small>
              </div>
              <div className="elite-form-group">
                <label>Scheduled Start Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={newRace.scheduledStartTime}
                  onChange={e => setNewRace({ ...newRace, scheduledStartTime: e.target.value })}
                />
                <small>Race auto-starts at this time (your local time)</small>
              </div>
              <div className="elite-modal-actions">
                <button type="submit" className="btn-elite-primary">Create Race</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-elite-back">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EliteTeamRace;
