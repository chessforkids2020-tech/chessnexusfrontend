import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import DebugPanel from '../../components/DebugPanel';
import ConfirmDialog from '../../components/ConfirmDialog';

const API = import.meta.env.VITE_API_URL || window.location.origin;

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
  },
  createSection: {
    background: '#f8f9fa',
    padding: '30px',
    borderRadius: '16px',
    marginBottom: '40px',
    border: '1px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    background: '#fff',
  },
  createButton: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: '#fff',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  racesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: '20px',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '10px 0',
    scrollbarWidth: 'thin',
    scrollbarColor: '#667eea #f1f1f1',
    width: '100%',
    boxSizing: 'border-box',
  },
  raceCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e9ecef',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  raceCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  },
  raceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  raceTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  raceInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  infoItem: {
    textAlign: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  raceActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  primaryAction: {
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    color: '#fff',
  },
  secondaryAction: {
    background: '#6c757d',
    color: '#fff',
  },
  successAction: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: '#fff',
  },
  dangerAction: {
    background: 'linear-gradient(135deg, #dc3545, #c82333)',
    color: '#fff',
  },
  warningAction: {
    background: 'linear-gradient(135deg, #ffc107, #e0a800)',
    color: '#212529',
  },
  disabledAction: {
    background: '#6c757d',
    color: '#fff',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  linkDisplay: {
    background: '#f8f9fa',
    padding: '8px',
    borderRadius: '8px',
    marginTop: '8px',
    border: '1px solid #e9ecef',
  },
  linkText: {
    fontSize: '14px',
    color: '#007bff',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  roomIdText: {
    fontSize: '16px',
    color: '#1a1a1a',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  copyButton: {
    background: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
    fontSize: '18px',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#e74c3c',
    fontSize: '16px',
  },
  success: {
    textAlign: 'center',
    padding: '20px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e9ecef',
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    borderRight: '1px solid #e9ecef',
  },
  thLast: {
    borderRight: 'none',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f1f1f1',
    fontSize: '14px',
    color: '#1a1a1a',
  },
  tdCenter: {
    textAlign: 'center',
  },
  tableButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
};

export default function ArenaAdmin() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [raceSettings, setRaceSettings] = useState(null);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [formData, setFormData] = useState({
    raceName: '',
    topic: '',
    timeLimit: 10,
    puzzleCount: 5,
    pointsPerPuzzle: 10,
    timeBonus: 5,
    timeBonusThreshold: 30,
    startMode: 'manual',
    plannedStartTime: '',
    botCount: 0,
  });

  useEffect(() => {
    loadRaceSettings();
    fetchTopics();
    fetchRaces();
    fetchCleanupStats();
  }, []);

  const loadRaceSettings = () => {
    try {
      const saved = localStorage.getItem('raceSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRaceSettings(parsed);
        // Update form defaults with race settings
        setFormData(prev => ({
          ...prev,
          timeLimit: parsed.defaultDuration || 10,
          puzzleCount: Math.min(parsed.pointsPerPuzzle || 5, 100), // Use points as rough estimate for puzzle count
          pointsPerPuzzle: parsed.pointsPerPuzzle || 10,
          timeBonus: parsed.timeBonus || 0,
          timeBonusThreshold: parsed.timeBonusThreshold || 30,
        }));
      }
    } catch (err) {
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get(`/api/public/racer/topics`);
      setTopics(response.data || []);
    } catch (err) {
    }
  };

  const fetchRaces = async () => {
    try {
      const response = await api.get(`/api/admin/arena`);
      setRaces(response.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load races');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }) + ' IST';
  };

  const createRace = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convert plannedStartTime from IST (UTC+5:30) to UTC explicitly
      let plannedStartTimeUTC = formData.plannedStartTime;
      if (formData.plannedStartTime && formData.startMode === 'auto') {
        const [dp, tp] = formData.plannedStartTime.split('T');
        const [yr, mo, dy] = dp.split('-').map(Number);
        const [hr, mn] = tp.split(':').map(Number);
        plannedStartTimeUTC = new Date(Date.UTC(yr, mo - 1, dy, hr - 5, mn - 30)).toISOString();
      }
      const response = await api.post(`/api/admin/arena`, {
        ...formData,
        plannedStartTime: plannedStartTimeUTC,
        pointsPerPuzzle: raceSettings?.pointsPerPuzzle || 10,
        timeBonus: formData.timeBonus || raceSettings?.timeBonus || 0,
        timeBonusThreshold: formData.timeBonusThreshold || raceSettings?.timeBonusThreshold || 30
      });
      setSuccess(`Race created successfully! Room code: ${response.data.roomId}`);
      setFormData({
        raceName: '',
        topic: '',
        timeLimit: raceSettings?.defaultDuration || 10,
        puzzleCount: Math.min(raceSettings?.pointsPerPuzzle || 5, 100),
        pointsPerPuzzle: raceSettings?.pointsPerPuzzle || 10,
        timeBonus: raceSettings?.timeBonus || 0,
        timeBonusThreshold: raceSettings?.timeBonusThreshold || 30,
        startMode: 'manual',
        plannedStartTime: '',
        botCount: 0,
      });
      fetchRaces();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create race');
    }
  };

  const startRace = async (roomId) => {
    try {
      await api.post(`/api/admin/arena/start/${roomId}`, {});
      setSuccess('Race started successfully!');
      fetchRaces();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start race');
    }
  };

  const deleteRace = async (roomId) => {
    if (window.debugLog) window.debugLog('button', `Delete button clicked for arena race: ${roomId}`);
    const confirmed = await window.confirmDialog('Are you sure you want to delete this race?');
    if (!confirmed) {
      if (window.debugLog) window.debugLog('info', 'Delete cancelled by user');
      return;
    }

    try {
      if (window.debugLog) window.debugLog('api', `DELETE ${API}/api/admin/arena/delete/${roomId}`);
      await api.delete(`/api/admin/arena/delete/${roomId}`);
      if (window.debugLog) window.debugLog('success', 'Arena race deleted successfully');
      setSuccess('Race deleted successfully!');
      fetchRaces();
    } catch (err) {
      if (window.debugLog) window.debugLog('error', 'Delete failed', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to delete race');
    }
  };

  const fetchCleanupStats = async () => {
    try {
      const res = await api.get(`/api/admin/arena/cleanup/stats`);
      setCleanupStats(res.data);
    } catch (err) {
      setError('Failed to load cleanup stats');
    }
  };

  const runCleanup = async () => {
    if (!window.confirm('This will permanently delete all Arena Race records older than 3 months. Continue?')) return;
    setCleanupRunning(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/api/admin/arena/cleanup/run`);
      if (res.data.deleted) {
        setSuccess(`Cleanup done! Deleted ${res.data.deleted.rooms} races, ${res.data.deleted.results} results (before ${new Date(res.data.cutoffDate).toDateString()})`);
      } else {
        setSuccess(res.data.message || 'Nothing to clean up');
      }
      fetchRaces();
      fetchCleanupStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Cleanup failed');
    } finally {
      setCleanupRunning(false);
    }
  };

  const viewWaitingRoom = (roomId) => {
    navigate(`/admin/arena/waiting/${roomId}`);
  };

  const viewLiveLeaderboard = (roomId) => {
    navigate(`/admin/arena/live/${roomId}`);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'waiting':
        return { background: '#fff3cd', color: '#856404' };
      case 'active':
        return { background: '#d1ecf1', color: '#0c5460' };
      case 'finished':
      case 'completed':
        return { background: '#d4edda', color: '#155724' };
      default:
        return { background: '#f8f9fa', color: '#6c757d' };
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading race arena...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <a href="/admin" style={styles.backButton}>← Back to Admin</a>

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🏁 Race Arena Admin</div>
          <div style={styles.subtitle}>Create and manage race arenas for competitive chess puzzles</div>
        </div>

        {error && <div style={{...styles.error, background: '#ffeaea', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.createSection}>
          <div style={styles.sectionTitle}>
            ➕ Create New Race
          </div>
          
          {raceSettings && (
            <div style={{
              background: '#e8f5e8',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #c3e6c3'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d5a2d', marginBottom: '8px' }}>
                ⚙️ Race Settings (Customizable per race):
              </div>
              <div style={{ fontSize: '13px', color: '#2d5a2d' }}>
                You can customize scoring settings for each race below, or use the global defaults from the Racer Management page.
              </div>
            </div>
          )}

          <form onSubmit={createRace}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Race Name</label>
                <input
                  type="text"
                  placeholder="Enter race name (optional)"
                  value={formData.raceName}
                  onChange={(e) => setFormData({ ...formData, raceName: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Topic</label>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  style={styles.select}
                  required
                >
                  <option value="">Select a topic</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Time Limit (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 10 })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Number of Puzzles</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.puzzleCount}
                  onChange={(e) => setFormData({ ...formData, puzzleCount: parseInt(e.target.value) || 5 })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Points per Puzzle</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.pointsPerPuzzle || raceSettings?.pointsPerPuzzle || 10}
                  onChange={(e) => setFormData({ ...formData, pointsPerPuzzle: parseInt(e.target.value) || 10 })}
                  style={styles.input}
                  required
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Base points awarded for each correct puzzle (1-100)</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Time Bonus Points</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.timeBonus || raceSettings?.timeBonus || 0}
                  onChange={(e) => setFormData({ ...formData, timeBonus: parseInt(e.target.value) || 0 })}
                  style={styles.input}
                  required
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Bonus points for solving quickly (0-50)</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Time Bonus Threshold (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={formData.timeBonusThreshold || raceSettings?.timeBonusThreshold || 30}
                  onChange={(e) => setFormData({ ...formData, timeBonusThreshold: parseInt(e.target.value) || 30 })}
                  style={styles.input}
                  required
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Time limit to earn bonus points (5-300 seconds)</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Start Mode</label>
                <select
                  value={formData.startMode}
                  onChange={(e) => setFormData({ ...formData, startMode: e.target.value })}
                  style={styles.select}
                >
                  <option value="manual">Manual Start</option>
                  <option value="auto">Automatic Start</option>
                </select>
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Auto start begins the race at the scheduled time</small>
              </div>

              {formData.startMode === 'auto' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Planned Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.plannedStartTime}
                    onChange={(e) => setFormData({ ...formData, plannedStartTime: e.target.value })}
                    style={styles.input}
                    required={formData.startMode === 'auto'}
                  />
                  <small style={{ color: '#6c757d', fontSize: '12px' }}>Enter time in Indian Standard Time (IST). Race starts automatically at this time.</small>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>🤖 Number of Bots (0–10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.botCount}
                  onChange={(e) => setFormData({ ...formData, botCount: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                  style={styles.input}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Bots automatically solve puzzles during the race. Only add if you need filler participants (0 = no bots).</small>
              </div>
            </div>

            <button
              type="submit"
              style={styles.createButton}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🚀 Create Race
            </button>
          </form>
        </div>

        <div style={styles.sectionTitle}>
          📋 Active Races ({races.length})
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={fetchRaces} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            {races.length > 0 && (
              <button 
                onClick={async () => {
                  if (window.debugLog) window.debugLog('button', 'Delete All Arena Races button clicked');
                  const confirmed = await window.confirmDialog(`Are you sure you want to delete ALL ${races.length} races? This action cannot be undone!`);
                  if (confirmed) {
                    if (window.debugLog) window.debugLog('api', `Deleting all ${races.length} arena races from ${API}`);
                    try {
                      setError('');
                      setSuccess('');
                      
                      const deletePromises = races.map(race => 
                        api.delete(`/api/admin/arena/delete/${race.roomId}`)
                      );
                      
                      const results = await Promise.all(deletePromises);
                      
                      if (window.debugLog) window.debugLog('success', `All ${races.length} arena races deleted`);
                      setSuccess(`Successfully deleted ${races.length} races`);
                      setRaces([]);
                    } catch (err) {
                      if (window.debugLog) window.debugLog('error', 'Delete all arena races error', err.response?.data || err.message);
                      setError(err.response?.data?.message || 'Failed to delete races');
                    }
                  } else {
                    if (window.debugLog) window.debugLog('info', 'Delete all arena races cancelled by user');
                  }
                }}
                style={{
                  ...styles.refreshButton,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: '1px solid #dc3545'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                🗑️ Delete All Races
              </button>
            )}
          </div>
        </div>

        {races.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>No races yet</div>
            <div style={styles.emptyText}>Create your first race arena above to get started!</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Race Name</th>
                <th style={styles.th}>Time Limit</th>
                <th style={styles.th}>Start Mode</th>
                <th style={styles.th}>Scheduled Time</th>
                <th style={styles.th}>Players</th>
                <th style={styles.th}>Room ID</th>
                <th style={styles.th}>Waiting Room</th>
                <th style={styles.th}>Actions</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => (
                <tr key={race.roomId}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600', color: '#1a1a1a' }}>
                      {race.name || 'Unnamed Race'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {race.topic}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600', color: '#1a1a1a' }}>
                      {race.timeLimit} min
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: race.startMode === 'auto' ? '#764ba2' : '#6c757d',
                      fontSize: '12px',
                      textTransform: 'uppercase'
                    }}>
                      {race.startMode || 'manual'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                      {race.plannedStartTime ? formatDate(race.plannedStartTime) : '—'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600', color: '#1a1a1a' }}>
                      {race.players?.length || 0}
                    </div>
                    <div style={{ 
                      ...styles.statusBadge, 
                      ...getStatusStyle(race.status),
                      display: 'inline-block',
                      marginTop: '4px',
                      fontSize: '10px',
                      padding: '2px 6px'
                    }}>
                      {race.status}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1a1a1a' }}>
                      {race.roomId}
                    </div>
                  </td>
                  <td style={{ ...styles.td, ...styles.tdCenter }}>
                    <button
                      onClick={() => viewWaitingRoom(race.roomId)}
                      style={{ ...styles.tableButton, ...styles.primaryAction }}
                    >
                      👀 View
                    </button>
                  </td>
                  <td style={{ ...styles.td, ...styles.tdCenter }}>
                    {race.status === 'waiting' && (
                      <button
                        onClick={() => startRace(race.roomId)}
                        style={{
                          ...styles.tableButton,
                          ...styles.successAction,
                          ...(race.players && race.players.length === 0 ? styles.disabledAction : {})
                        }}
                        disabled={race.players && race.players.length === 0}
                      >
                        🚀 Start
                      </button>
                    )}
                    {race.status === 'active' && (
                      <button
                        onClick={() => viewLiveLeaderboard(race.roomId)}
                        style={{ ...styles.tableButton, ...styles.primaryAction }}
                      >
                        📊 Live
                      </button>
                    )}
                    {race.status === 'completed' && (
                      <button
                        onClick={() => viewLiveLeaderboard(race.roomId)}
                        style={{ ...styles.tableButton, ...styles.primaryAction }}
                      >
                        📊 Results
                      </button>
                    )}
                  </td>
                  <td style={{ ...styles.td, ...styles.tdCenter }}>
                    <button
                      onClick={() => deleteRace(race.roomId)}
                      style={{ ...styles.tableButton, ...styles.dangerAction }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 3-Month Auto-Cleanup Panel ── */}
      <div style={{
        marginTop: '40px',
        background: '#fff8f0',
        border: '1px solid #f0c080',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#7c4a00', marginBottom: '4px' }}>
              🧹 Data Retention — 3-Month Rolling Window
            </div>
            <div style={{ fontSize: '13px', color: '#9a6200' }}>
              Arena Race records are kept for the current month + 2 previous months. Older <em>completed</em> races are deleted automatically every 24 hours.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchCleanupStats}
              style={{ background: '#fff', border: '1px solid #f0c080', color: '#7c4a00', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              🔍 Check Stats
            </button>
            <button
              onClick={runCleanup}
              disabled={cleanupRunning}
              style={{ background: cleanupRunning ? '#ccc' : '#e65c00', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: cleanupRunning ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              {cleanupRunning ? 'Cleaning...' : '🗑️ Run Cleanup Now'}
            </button>
          </div>
        </div>

        {cleanupStats && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ background: '#fff', border: '1px solid #e0c090', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#2d7a2d' }}>{cleanupStats.keptCount}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Races Kept</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e0c090', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: cleanupStats.eligibleForDeletion > 0 ? '#c0392b' : '#555' }}>{cleanupStats.eligibleForDeletion}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Ready to Delete</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e0c090', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '160px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#7c4a00' }}>{new Date(cleanupStats.cutoffDate).toDateString()}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Cutoff Date</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cleanupStats.breakdown.map((m, i) => (
                <div key={i} style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: m.willBeDeleted ? '#fde8e8' : '#e8fde8',
                  color: m.willBeDeleted ? '#c0392b' : '#2d7a2d',
                  border: `1px solid ${m.willBeDeleted ? '#f5c6c6' : '#c6f5c6'}`
                }}>
                  {m.month}: {m.count} {m.willBeDeleted ? '(will delete)' : '(kept)'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}