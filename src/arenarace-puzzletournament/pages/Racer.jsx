import React, { useState, useEffect } from 'react';
import api from '../api';

const styles = {
  page: {
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: 'linear-gradient(135deg, #1a5f1a, #2e7d32)',
    borderRadius: '15px',
    color: '#fff',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '16px',
    margin: '5px 0 0 0',
    opacity: '0.9',
  },
  backButton: {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px',
    marginTop: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    border: '2px solid #e9ecef',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  cardHover: {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a5f1a',
    margin: '0 0 15px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6c757d',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  statItem: {
    textAlign: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #e9ecef',
  },
  statNumber: {
    display: 'block',
    fontSize: '28px',
    fontWeight: '800',
    color: '#1a5f1a',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  button: {
    background: 'linear-gradient(135deg, #1a5f1a, #2e7d32)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(26, 95, 26, 0.3)',
    marginRight: '10px',
  },
  secondaryButton: {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginTop: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  tableHeader: {
    background: '#f9fafb',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: '16px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    fontSize: 13,
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px 12px',
    verticalAlign: 'middle',
    fontSize: 13,
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#6c757d',
    fontSize: '18px',
  },
  error: {
    textAlign: 'center',
    padding: '30px',
    color: '#dc2626',
    background: '#fef2f2',
    borderRadius: '8px',
    margin: '20px 0',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a5f1a',
    margin: '0 0 20px 0',
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  saveButton: {
    background: 'linear-gradient(135deg, #1a5f1a, #2e7d32)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(26, 95, 26, 0.3)',
  },
};

export default function Racer() {
  const [racerStats, setRacerStats] = useState({
    totalRacers: 0,
    activeRacers: 0,
    completedRaces: 0,
    averageScore: 0,
  });
  const [racerData, setRacerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Topics state
  const [topics, setTopics] = useState([]);
  const [topicForm, setTopicForm] = useState({
    id: '',
    title: '',
    description: '',
    icon: '',
    difficulty: 'Intermediate'
  });
  const [editingTopic, setEditingTopic] = useState(null);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  
  // Race settings state
  const [raceSettings, setRaceSettings] = useState({
    defaultDuration: 5, // minutes
    pointsPerPuzzle: 10,
    timeBonus: 5,
    timeBonusThreshold: 30, // seconds
    difficultyLevels: ['Beginner', 'Intermediate', 'Advanced']
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...raceSettings });

  // Racer details modal state
  const [showRacerDetailsModal, setShowRacerDetailsModal] = useState(false);
  const [selectedRacer, setSelectedRacer] = useState(null);
  const [racerDetails, setRacerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchRacerData();
    fetchTopics();
    loadRaceSettings();
  }, []);

  const loadRaceSettings = () => {
    try {
      const saved = localStorage.getItem('raceSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRaceSettings(parsed);
        setSettingsForm(parsed);
      }
    } catch (err) {
    }
  };

  const saveRaceSettings = (settings) => {
    try {
      localStorage.setItem('raceSettings', JSON.stringify(settings));
      setRaceSettings(settings);
      setSettingsForm(settings);
    } catch (err) {
    }
  };

  const fetchRacerData = async () => {
    try {
      setLoading(true);
      // Fetch real racer data from the backend
      const response = await api.get('/api/admin/racers');
      const racers = response.data;

      setRacerData(racers);
      setRacerStats({
        totalRacers: racers.length,
        activeRacers: racers.filter(r => {
          const lastActive = new Date(r.lastActive);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return lastActive > oneDayAgo;
        }).length,
        completedRaces: racers.reduce((sum, r) => sum + r.completedRaces, 0),
        averageScore: racers.length > 0 
          ? Math.round(racers.reduce((sum, r) => sum + r.averageScore, 0) / racers.length)
          : 0,
      });

      setError(null);
    } catch (err) {
      setError('Failed to load racer data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get('/api/public/racer/topics');
      const fetchedTopics = response.data || [];
      setTopics(fetchedTopics);
      
    } catch (err) {
      // Fallback to default topics if API fails
      const fallbackTopics = [
        { id: 'tactics', title: 'Chess Tactics', description: 'Master tactical patterns like pins, forks, skewers, and discovered attacks.', icon: '⚔️', difficulty: 'Intermediate', puzzles: 0 },
        { id: 'endgame', title: 'Endgame Mastery', description: 'Learn essential endgame techniques and winning positions.', icon: '👑', difficulty: 'Advanced', puzzles: 0 },
        { id: 'openings', title: 'Opening Principles', description: 'Understand fundamental opening concepts and common mistakes.', icon: '🚀', difficulty: 'Beginner', puzzles: 0 },
        { id: 'strategy', title: 'Strategic Play', description: 'Develop positional understanding and long-term planning.', icon: '🎯', difficulty: 'Advanced', puzzles: 0 },
        { id: 'defense', title: 'Defensive Skills', description: 'Learn how to defend against attacks and counter threats.', icon: '🛡️', difficulty: 'Intermediate', puzzles: 0 },
        { id: 'checkmate', title: 'Checkmate Patterns', description: 'Practice delivering checkmate in various positions.', icon: '♔', difficulty: 'Intermediate', puzzles: 0 },
        { id: 'forks', title: 'Forks & Pins', description: 'Master attacking multiple pieces simultaneously.', icon: '🍴', difficulty: 'Intermediate', puzzles: 0 },
        { id: 'combinations', title: 'Combinations', description: 'Complex tactical sequences requiring calculation.', icon: '🔗', difficulty: 'Advanced', puzzles: 0 },
        { id: 'mixed', title: 'Mixed Puzzles', description: 'A variety of puzzles covering all aspects of chess.', icon: '🎲', difficulty: 'All Levels', puzzles: 0 }
      ];
      setTopics(fallbackTopics);
    }
  };

  const handleAddTopic = () => {
    setTopicForm({
      id: '',
      title: '',
      description: '',
      icon: '',
      difficulty: 'Intermediate'
    });
    setEditingTopic(null);
    setShowAddTopicModal(true);
  };

  const handleEditTopic = (topic) => {
    setTopicForm({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      icon: topic.icon,
      difficulty: topic.difficulty
    });
    setEditingTopic(topic);
    setShowConfigureModal(true);
  };

  const handleSaveTopic = async () => {
    if (!topicForm.title || !topicForm.description) {
      alert('Title and description are required');
      return;
    }

    try {
      if (editingTopic) {
        // Update existing topic
        await api.put(`/api/admin/topics/${editingTopic._id}`, topicForm);
        alert('Topic updated successfully!');
      } else {
        // Add new topic
        const newTopic = {
          ...topicForm,
          id: topicForm.id || topicForm.title.toLowerCase().replace(/\s+/g, ''),
        };
        await api.post('/api/admin/topics', newTopic);
        alert('Topic added successfully!');
      }
      
      // Refresh topics from database after save
      await fetchTopics();
      
      setShowAddTopicModal(false);
      setShowConfigureModal(false);
      setTopicForm({ id: '', title: '', description: '', icon: '', difficulty: 'Intermediate' });
    } catch (err) {
      alert('Failed to save topic: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/topics/${topicId}`);
      alert('Topic deleted successfully!');
      await fetchTopics();
    } catch (err) {
      alert('Failed to delete topic: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditSettings = () => {
    setSettingsForm({ ...raceSettings });
    setShowSettingsModal(true);
  };

  const handleSaveSettings = () => {
    // Validate inputs
    if (settingsForm.defaultDuration < 1 || settingsForm.defaultDuration > 60) {
      alert('Race duration must be between 1 and 60 minutes');
      return;
    }
    if (settingsForm.pointsPerPuzzle < 1 || settingsForm.pointsPerPuzzle > 100) {
      alert('Points per puzzle must be between 1 and 100');
      return;
    }
    if (settingsForm.timeBonus < 0 || settingsForm.timeBonus > 50) {
      alert('Time bonus must be between 0 and 50 points');
      return;
    }
    if (settingsForm.timeBonusThreshold < 5 || settingsForm.timeBonusThreshold > 300) {
      alert('Time bonus threshold must be between 5 and 300 seconds');
      return;
    }

    saveRaceSettings(settingsForm);
    setShowSettingsModal(false);
    alert('Race settings saved successfully!');
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      defaultDuration: 5,
      pointsPerPuzzle: 10,
      timeBonus: 5,
      timeBonusThreshold: 30,
      difficultyLevels: ['Beginner', 'Intermediate', 'Advanced']
    };
    saveRaceSettings(defaultSettings);
    alert('Settings reset to defaults!');
  };

  const fetchRacerDetails = async (racerId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/api/admin/racers/${racerId}`);
      setRacerDetails(response.data);
    } catch (err) {
      alert('Failed to load racer details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewRacerDetails = (racer) => {
    setSelectedRacer(racer);
    setShowRacerDetailsModal(true);
    fetchRacerDetails(racer.id);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastActive = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };


  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading racer data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>{error}</div>
        <button style={styles.button} onClick={fetchRacerData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏎️ Racer Management</h1>
          <p style={styles.subtitle}>Monitor and manage racing participants</p>
        </div>
        <a href="/admin" style={styles.backButton}>← Back to Admin</a>
      </div>

      <div style={styles.content}>
        {/* Statistics Cards */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            📊 Racing Statistics
          </h2>
          <p style={styles.cardDescription}>
            Overview of racing activity and performance metrics
          </p>

          <div style={styles.statGrid}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{racerStats.totalRacers}</span>
              <span style={styles.statLabel}>Total Racers</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{racerStats.activeRacers}</span>
              <span style={styles.statLabel}>Active Today</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{racerStats.completedRaces}</span>
              <span style={styles.statLabel}>Completed Races</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{racerStats.averageScore}</span>
              <span style={styles.statLabel}>Avg Score</span>
            </div>
          </div>

          <div>
            <button style={styles.button} onClick={fetchRacerData}>
              🔄 Refresh Stats
            </button>
            <button style={styles.secondaryButton} onClick={() => alert('Export functionality coming soon!')}>
              📈 Export Report
            </button>
          </div>
        </div>

        {/* Racing Topics */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            🎯 Racing Topics
          </h2>
          <p style={styles.cardDescription}>
            Manage available racing topics and difficulty levels
          </p>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a5f1a' }}>Available Topics:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
              {topics.map(topic => (
                <div key={topic.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: topic.puzzles > 0 ? '#f0f9f0' : '#f9fafb',
                  color: topic.puzzles > 0 ? '#064f28' : '#6b7280',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: `1px solid ${topic.puzzles > 0 ? '#bbf7d0' : '#e5e7eb'}`
                }}>
                  <span>{topic.icon}</span>
                  <span>{topic.title}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>({topic.puzzles})</span>
                  <button
                    onClick={() => handleEditTopic(topic)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '10px',
                      padding: '2px',
                      marginLeft: '4px'
                    }}
                    title="Edit topic"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteTopic(topic._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '10px',
                      padding: '2px'
                    }}
                    title="Delete topic"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button style={styles.button} onClick={handleAddTopic}>
              ➕ Add Topic
            </button>
            <button style={styles.secondaryButton} onClick={() => setShowConfigureModal(true)}>
              ⚙️ Configure Topics
            </button>
          </div>
        </div>

        {/* Race Settings */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            ⚙️ Race Settings
          </h2>
          <p style={styles.cardDescription}>
            Configure racing parameters and time limits
          </p>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <strong>Default Race Duration:</strong> {raceSettings.defaultDuration} minutes
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Points per Puzzle:</strong> {raceSettings.pointsPerPuzzle} points
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Time Bonus:</strong> +{raceSettings.timeBonus} points for under {raceSettings.timeBonusThreshold} seconds
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Difficulty Levels:</strong> {raceSettings.difficultyLevels.join(', ')}
            </div>
          </div>

          <div>
            <button style={styles.button} onClick={handleEditSettings}>
              ⚙️ Edit Settings
            </button>
            <button style={styles.secondaryButton} onClick={handleResetSettings}>
              🔄 Reset to Default
            </button>
          </div>
        </div>
      </div>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Racer</th>
              <th style={styles.th}>Races</th>
              <th style={styles.th}>Performance</th>
              <th style={styles.th}>Time Spent</th>
              <th style={styles.th}>Last Active</th>
              <th style={styles.th}>Favorite Topic</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {racerData.map(racer => (
              <tr key={racer.id} style={styles.tableRow}>
                <td style={styles.td}>
                  <div>
                    <strong>{racer.displayName}</strong>
                  </div>
                </td>
                <td style={styles.td}>
                  <div>
                    <strong>{racer.completedRaces}/{racer.totalRaces}</strong>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {Math.round((racer.completedRaces / racer.totalRaces) * 100)}% completion
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div>
                    <strong>{racer.averageScore} avg</strong>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      Best: {racer.bestScore} pts
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  {formatTime(racer.totalTime)}
                </td>
                <td style={styles.td}>
                  {formatLastActive(racer.lastActive)}
                </td>
                <td style={styles.td}>
                  <span style={{
                    padding: '4px 8px',
                    background: '#f0f9f0',
                    color: '#064f28',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500',
                  }}>
                    {racer.favoriteTopic}
                  </span>
                </td>
                <td style={styles.td}>
                  <button 
                    style={{ ...styles.button, padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleViewRacerDetails(racer)}
                  >
                    👁️ View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Topic Modal */}
      {showAddTopicModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddTopicModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add New Topic</h2>
            <div style={styles.modalContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Topic ID:</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g., tactics, endgame"
                  value={topicForm.id}
                  onChange={(e) => setTopicForm({...topicForm, id: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title:</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g., Chess Tactics"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({...topicForm, title: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Icon:</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g., ⚔️, 👑, 🚀"
                  value={topicForm.icon}
                  onChange={(e) => setTopicForm({...topicForm, icon: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description:</label>
                <textarea
                  style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                  placeholder="Describe what this topic covers..."
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Difficulty:</label>
                <select
                  style={styles.input}
                  value={topicForm.difficulty}
                  onChange={(e) => setTopicForm({...topicForm, difficulty: e.target.value})}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowAddTopicModal(false)}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSaveTopic}>
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Topics Modal */}
      {showConfigureModal && (
        <div style={styles.modalOverlay} onClick={() => setShowConfigureModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingTopic ? 'Edit Topic' : 'Configure Topics'}</h2>
            {editingTopic ? (
              <div style={styles.modalContent}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Topic ID:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={topicForm.id}
                    onChange={(e) => setTopicForm({...topicForm, id: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Title:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({...topicForm, title: e.target.value})}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Icon:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={topicForm.icon}
                    onChange={(e) => setTopicForm({...topicForm, icon: e.target.value})}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description:</label>
                  <textarea
                    style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Difficulty:</label>
                  <select
                    style={styles.input}
                    value={topicForm.difficulty}
                    onChange={(e) => setTopicForm({...topicForm, difficulty: e.target.value})}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>
              </div>
            ) : (
              <div style={styles.modalContent}>
                <p style={{ marginBottom: '20px', color: '#6c757d' }}>
                  Click the edit button (✏️) next to any topic to modify it, or use the "Add Topic" button to create new topics.
                </p>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {topics.map(topic => (
                    <div key={topic.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      background: '#f8f9fa'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{topic.icon}</span>
                        <div>
                          <strong>{topic.title}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {topic.puzzles} puzzles • {topic.difficulty}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={{...styles.button, padding: '6px 12px', fontSize: '12px'}}
                          onClick={() => handleEditTopic(topic)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          style={{...styles.secondaryButton, padding: '6px 12px', fontSize: '12px'}}
                          onClick={() => handleDeleteTopic(topic._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => {
                setShowConfigureModal(false);
                setEditingTopic(null);
                setTopicForm({ id: '', title: '', description: '', icon: '', difficulty: 'Intermediate' });
              }}>
                {editingTopic ? 'Cancel' : 'Close'}
              </button>
              {editingTopic && (
                <button style={styles.saveButton} onClick={handleSaveTopic}>
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Race Settings Modal */}
      {showSettingsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Race Settings</h2>
            <div style={styles.modalContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Default Race Duration (minutes):</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max="60"
                  value={settingsForm.defaultDuration}
                  onChange={(e) => setSettingsForm({...settingsForm, defaultDuration: parseInt(e.target.value) || 5})}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Range: 1-60 minutes</small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Points per Puzzle:</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max="100"
                  value={settingsForm.pointsPerPuzzle}
                  onChange={(e) => setSettingsForm({...settingsForm, pointsPerPuzzle: parseInt(e.target.value) || 10})}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Range: 1-100 points</small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Time Bonus Points:</label>
                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  max="50"
                  value={settingsForm.timeBonus}
                  onChange={(e) => setSettingsForm({...settingsForm, timeBonus: parseInt(e.target.value) || 0})}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Bonus points for solving quickly (0-50)</small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Time Bonus Threshold (seconds):</label>
                <input
                  style={styles.input}
                  type="number"
                  min="5"
                  max="300"
                  value={settingsForm.timeBonusThreshold}
                  onChange={(e) => setSettingsForm({...settingsForm, timeBonusThreshold: parseInt(e.target.value) || 30})}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Time limit to earn bonus points (5-300 seconds)</small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Difficulty Levels (comma-separated):</label>
                <input
                  style={styles.input}
                  type="text"
                  value={settingsForm.difficultyLevels.join(', ')}
                  onChange={(e) => {
                    const levels = e.target.value.split(',').map(level => level.trim()).filter(level => level.length > 0);
                    setSettingsForm({...settingsForm, difficultyLevels: levels.length > 0 ? levels : ['Beginner', 'Intermediate', 'Advanced']});
                  }}
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>Separate levels with commas (e.g., Beginner, Intermediate, Advanced)</small>
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => setShowSettingsModal(false)}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSaveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Racer Details Modal */}
      {showRacerDetailsModal && selectedRacer && (
        <div style={styles.modalOverlay} onClick={() => setShowRacerDetailsModal(false)}>
          <div style={{...styles.modal, maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              👤 {selectedRacer.displayName}
            </h2>
            
            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading racer details...
              </div>
            ) : racerDetails ? (
              <div style={styles.modalContent}>
                {/* User Info */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1a5f1a' }}>User Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div><strong>Display Name:</strong> {racerDetails.user.displayName}</div>
                    {racerDetails.user.age && <div><strong>Age:</strong> {racerDetails.user.age}</div>}
                    {racerDetails.user.country && <div><strong>Country:</strong> {racerDetails.user.country}</div>}
                    {racerDetails.user.timeZone && <div><strong>Time Zone:</strong> {racerDetails.user.timeZone}</div>}
                    {racerDetails.user.lichessUsername && <div><strong>Lichess:</strong> {racerDetails.user.lichessUsername}</div>}
                    <div><strong>Joined:</strong> {new Date(racerDetails.user.joinedDate).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Statistics */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1a5f1a' }}>📊 Performance Statistics</h3>
                  <div style={styles.statGrid}>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{racerDetails.statistics.totalAttempts}</span>
                      <span style={styles.statLabel}>Total Attempts</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{racerDetails.statistics.correctAttempts}</span>
                      <span style={styles.statLabel}>Correct Solutions</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{racerDetails.statistics.accuracy}%</span>
                      <span style={styles.statLabel}>Accuracy</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{racerDetails.statistics.averageScore}</span>
                      <span style={styles.statLabel}>Avg Score</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{racerDetails.statistics.bestScore}</span>
                      <span style={styles.statLabel}>Best Score</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{formatTime(racerDetails.statistics.totalTime)}</span>
                      <span style={styles.statLabel}>Total Time</span>
                    </div>
                  </div>
                </div>

                {/* Topic Breakdown */}
                {racerDetails.topicBreakdown.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1a5f1a' }}>🎯 Topic Performance</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {racerDetails.topicBreakdown.map(topic => (
                        <div key={topic.topic} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ fontWeight: '600' }}>{topic.topic}</div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            <span>{topic.attempts} attempts</span>
                            <span>{topic.correct} correct ({topic.accuracy}%)</span>
                            <span>Avg: {topic.averageScore} pts</span>
                            <span>{topic.averageTime}s avg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {racerDetails.recentActivity.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1a5f1a' }}>🕒 Recent Activity</h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '8px' }}>
                      {racerDetails.recentActivity.map((activity, index) => (
                        <div key={index} style={{
                          padding: '8px 12px',
                          borderBottom: index < racerDetails.recentActivity.length - 1 ? '1px solid #f0f0f0' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <strong>{activity.puzzle}</strong> 
                            <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                              {activity.topic} • {activity.difficulty}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ color: activity.correct ? '#064f28' : '#dc2626' }}>
                              {activity.correct ? '✓' : '✗'} {activity.score}pts
                            </span>
                            <span>{activity.timeTaken}s</span>
                            <span style={{ color: '#6c757d' }}>
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Timeline */}
                {racerDetails.performanceTimeline.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1a5f1a' }}>📈 Performance Over Time</h3>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '8px' }}>
                      {racerDetails.performanceTimeline.map((day, index) => (
                        <div key={index} style={{
                          padding: '6px 12px',
                          borderBottom: index < racerDetails.performanceTimeline.length - 1 ? '1px solid #f0f0f0' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}>
                          <span>{new Date(day.date).toLocaleDateString()}</span>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <span>{day.attempts} attempts</span>
                            <span>{day.accuracy}% accuracy</span>
                            <span>{day.averageScore} avg pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                Failed to load racer details
              </div>
            )}
            
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={() => {
                setShowRacerDetailsModal(false);
                setSelectedRacer(null);
                setRacerDetails(null);
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
