import React, { useState, useEffect } from 'react';
import api from '../api';

const DetailedRaceStatsModal = ({ isOpen, onClose, raceType, timeLimit, displayName }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topicsMap, setTopicsMap] = useState({});

  useEffect(() => {
    if (isOpen && raceType) {
      fetchDetailedStats();
    }
  }, [isOpen, raceType, displayName]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTopics = async () => {
      try {
        const res = await api.get('/api/public/racer/topics');
        const arr = res.data || [];
        const map = {};
        arr.forEach(t => { if (t && t.id) map[t.id] = t; });
        setTopicsMap(map);
      } catch (e) {
        // ignore
      }
    };
    fetchTopics();
  }, [isOpen]);

  const fetchDetailedStats = async () => {
    setLoading(true);
    try {

      const params = { raceType };
      // If a timeLimit is provided (for timed races or arena races), include it
      if (timeLimit) params.timeLimit = Number(timeLimit);
      // When viewing another user's profile, fetch THEIR stats (not the viewer's).
      if (displayName) params.displayName = displayName;

      const response = await api.get(
        '/api/auth/detailed-race-stats',
        {
          params
        }
      );
      setStats(response.data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const topicLabels = {
    tactics: '🎯 Chess Tactics',
    endgame: '👑 Endgame Mastery',
    openings: '♟️ Opening Principles',
    strategy: '🎲 Strategic Play',
    defense: '🛡️ Defensive Skills',
    mixed: '🎪 Mixed Puzzles',
    'racer-tactics': '🎯 Chess Tactics',
    'racer-endgame': '👑 Endgame Mastery',
    'racer-openings': '♟️ Opening Principles',
    'racer-strategy': '🎲 Strategic Play',
    'racer-defense': '🛡️ Defensive Skills',
    'racer-mixed': '🎪 Mixed Puzzles'
  };

  const getRaceTitle = () => {
    const titles = {
      timedRace: '🏃‍♂️ Timed Race',
      arenaRace: '🏟️ Arena Race',
      teamRace: '👥 Team Race'
    };
    const base = titles[raceType] || 'Race Details';
    if (timeLimit) return `${base} — ${timeLimit} min`;
    return base;
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{getRaceTitle()} - Detailed Stats by Topic</h2>
          <button 
            style={styles.closeButton} 
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
            }}
          >✕</button>
        </div>

        <div style={styles.modalBody}>
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.loadingIcon}>⏳</div>
              <div>Loading detailed statistics...</div>
            </div>
          ) : stats && stats.topicStats && stats.topicStats.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.statsTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Topics</th>
                    <th style={styles.tableHeader}>Highest Points</th>
                    <th style={styles.tableHeader}>Attempts</th>
                    <th style={styles.tableHeader}>Last Attempt</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topicStats.map((topic, index) => (
                    <tr 
                      key={index} 
                      style={{
                        ...styles.tableRow,
                        backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';
                        e.currentTarget.style.borderLeft = '4px solid #06b6d4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.borderLeft = 'none';
                      }}
                    >
                      <td style={styles.tableCell}>
                        <div style={styles.topicCell}>
                          <span style={styles.topicIcon}>
                            {topicsMap[topic.topic]?.icon || (topicLabels[topic.topic] ? topicLabels[topic.topic].split(' ')[0] : '🎯')}
                          </span>
                          <span style={styles.topicName}>
                            {topicsMap[topic.topic]?.title || (topicLabels[topic.topic] ? topicLabels[topic.topic].substring(topicLabels[topic.topic].indexOf(' ') + 1) : topic.topic)}
                          </span>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.pointsValue}>{topic.highestScore}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.attemptsValue}>{topic.attempts}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.dateValue}>{formatDate(topic.lastAttempt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.noData}>
              <div style={styles.noDataIcon}>📊</div>
              <div style={styles.noDataText}>No race data available yet. Complete some races to see detailed statistics!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(12px)',
  },
  modalContent: {
    background: 'rgba(23, 23, 23, 0.95)',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  modalHeader: {
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#ffffff',
    padding: '24px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#9ca3af',
    fontSize: '20px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontWeight: '300',
  },
  modalBody: {
    flex: 1,
    padding: '28px',
    overflowY: 'auto',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  tableContainer: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    '-webkit-backdrop-filter': 'blur(5px)',
    backdropFilter: 'blur(5px)',
  },
  statsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeaderRow: {
    background: 'rgba(6, 182, 212, 0.1)',
    borderBottom: '2px solid rgba(6, 182, 212, 0.3)',
  },
  tableHeader: {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#06b6d4',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tableRow: {
    transition: 'all 0.3s ease',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  tableCell: {
    padding: '16px 12px',
    borderRight: '1px solid rgba(255, 255, 255, 0.03)',
    verticalAlign: 'middle',
  },
  topicCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  topicIcon: {
    fontSize: '18px',
    minWidth: '20px',
  },
  topicName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  pointsValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#10b981',
  },
  attemptsValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f59e0b',
  },
  dateValue: {
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  noDataIcon: {
    fontSize: '56px',
    filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))',
  },
  noDataText: {
    color: '#9ca3af',
    fontSize: '16px',
    maxWidth: '500px',
    lineHeight: '1.6',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
    fontSize: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loadingIcon: {
    fontSize: '56px',
    filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))',
    animation: 'pulse 2s ease-in-out infinite',
  },
};

export default DetailedRaceStatsModal;
