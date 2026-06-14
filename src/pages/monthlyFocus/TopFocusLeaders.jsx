import React, { useState, useEffect } from 'react';
import PlayerName from '../../components/PlayerName';
import { Link } from 'react-router-dom';
import api from '../../api';

const TopFocusLeaders = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusTitle, setFocusTitle] = useState('Monthly Focus');
  const [isHistorical, setIsHistorical] = useState(false);
  const [focusInfo, setFocusInfo] = useState(null);

  useEffect(() => {
    const fetchTopLeaders = async () => {
      console.log('TopFocusLeaders: Fetching leaders...');
      try {
        // Fetch leaderboard (which now includes focus info)
        const leaderboardRes = await api.get('/api/public/monthly-focus/leaderboard');
        console.log('TopFocusLeaders: Leaderboard response:', leaderboardRes.data);
        
        const focusInfo = leaderboardRes.data.focusInfo;
        if (focusInfo) {
          setFocusTitle(focusInfo.title || 'Monthly Focus');
          setIsHistorical(focusInfo.isHistorical || false);
          setFocusInfo(focusInfo);
        }

        const top5 = (leaderboardRes.data.leaderboard || []).slice(0, 5);
        setLeaders(top5);
      } catch (error) {
        console.error('TopFocusLeaders: Failed to fetch focus leaders:', error);
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopLeaders();
  }, []);

  if (loading) return null;
  // if (leaders.length === 0) return null; // Original: Don't show if no participants

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getCompletionBadge = (completedDays, perfectDays) => {
    if (perfectDays > 0) return { icon: '👑', text: 'Perfect', color: '#f59e0b' };
    if (completedDays >= 5) return { icon: '🏆', text: 'Champion', color: '#10b981' };
    if (completedDays >= 3) return { icon: '⭐', text: 'Active', color: '#06b6d4' };
    return { icon: '🌱', text: 'Beginner', color: '#94a3b8' };
  };

  return (
    <div style={styles.container} className="top-focus-leaders-container">
      <div style={styles.header}>
        <h2 style={styles.title}>🎯 Top Focus Leaders</h2>
        <span style={styles.subtitle}>
          {focusTitle}
          {isHistorical && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>📚 Previous</span>}
        </span>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Rank</th>
              <th style={{ ...styles.th, textAlign: 'left' }}>User</th>
              <th style={styles.th}>Focus XP</th>
              <th style={styles.th}>Skill Score</th>
              <th style={styles.th}>Progress</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  {isHistorical 
                    ? 'No participants in the previous focus.' 
                    : `No participants yet for this month. ${!localStorage.getItem('authToken') ? 'Login to be the first!' : ''}`
                  }
                </td>
              </tr>
            ) : leaders.map((leader, index) => {
              const badge = getCompletionBadge(leader.completedDays, leader.perfectDays);
              return (
                <tr key={leader.userId} style={styles.tableRow}>
                  <td style={styles.tdRank}>{getMedalEmoji(index)}</td>
                  <td style={styles.tdUser}><PlayerName displayName={leader.displayName} username={leader.username} /></td>
                  <td style={styles.tdXp}>{leader.focusXp} XP</td>
                  <td style={styles.tdScore}>{leader.skillScore || 0} pts</td>
                  <td style={styles.tdProgress}>{leader.completedDays}/{focusInfo?.totalDays || 7}</td>
                  <td style={styles.tdStatus}>
                    <span style={{ ...styles.statusBadge, color: badge.color, borderColor: badge.color }}>
                      {badge.icon} {badge.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Link to="/monthly-focus/leaderboard" style={styles.viewAllLink}>
        View Full Leaderboard →
      </Link>
    </div>
  );
};

const styles = {
  container: {
    background: 'rgba(23, 23, 23, 0.7)',
    padding: '20px', /* reduced padding to shorten card */
    borderRadius: '20px',
    marginTop: '16px', /* reduce vertical gap on homepage */
    marginBottom: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '500px',
  },
  tableHeaderRow: {
    background: 'rgba(23, 23, 23, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  th: {
    padding: '10px 8px', /* reduced padding */
    fontSize: '0.8em',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'background 0.3s ease',
  },
  tdRank: {
    padding: '10px 8px',
    fontSize: '1.3em',
    textAlign: 'center',
  },
  tdUser: {
    padding: '10px 8px',
    fontSize: '0.95em',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'left',
  },
  tdXp: {
    padding: '10px 8px',
    fontSize: '0.95em',
    fontWeight: '700',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  tdScore: {
    padding: '10px 8px',
    fontSize: '0.9em',
    fontWeight: '600',
    color: '#f59e0b',
    textAlign: 'center',
  },
  tdProgress: {
    padding: '10px 8px',
    fontSize: '0.9em',
    fontWeight: '600',
    color: '#d1d5db',
    textAlign: 'center',
  },
  tdStatus: {
    padding: '10px 8px',
    textAlign: 'center',
  },
  statusBadge: {
    fontSize: '0.8em',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid',
    background: 'rgba(255,255,255,0.05)',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  viewAllLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '12px', /* tighter gap */
    color: '#06b6d4',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95em',
    transition: 'color 0.3s ease',
  },
};

// Add hover effect via CSS-in-JS workaround
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .top-focus-leaders-container table tbody tr:hover {
    background: rgba(6, 182, 212, 0.08) !important;
  }
  
  @media (max-width: 640px) {
    .top-focus-leaders-container table {
      min-width: 400px !important;
    }
    .top-focus-leaders-container th,
    .top-focus-leaders-container td {
      padding: 10px 8px !important;
      font-size: 0.85em !important;
    }
  }
`;
if (!document.getElementById('top-focus-leaders-styles')) {
  styleSheet.id = 'top-focus-leaders-styles';
  document.head.appendChild(styleSheet);
}

export default TopFocusLeaders;
