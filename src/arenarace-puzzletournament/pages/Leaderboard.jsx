import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [batchInfo, setBatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [batchId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userResponse = await api.get('/api/auth/me');
      setCurrentUser(userResponse.data);
      
      // Get batch results
      const leaderboardResponse = await api.get(`/api/public/batches/${batchId}/leaderboard`);
      const leaderboardData = leaderboardResponse.data;
      
      // Get batch info
      const batchResponse = await api.get(`/api/public/batches/${batchId}`);
      setBatchInfo(batchResponse.data);
      
      // The leaderboard data is already processed by the backend
      // Just add rankings
      const rankedData = leaderboardData
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
      
      setLeaderboard(rankedData);
      
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleViewResults = () => {
    navigate(`/results/${batchId}`);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver  
      case 3: return '#CD7F32'; // Bronze
      default: return '#06b6d4'; // Cyan
    }
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      padding: '32px 28px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    trophyIcon: {
      display: 'inline',
      color: '#FFD700',
      textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
      marginRight: '10px',
    },
    batchInfo: {
      fontSize: '16px',
      color: '#9ca3af',
      fontWeight: '400',
      display: 'flex',
      gap: '20px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    batchInfoItem: {
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    userHighlight: {
      marginBottom: '40px',
    },
    userTitle: {
      textAlign: 'center',
      color: '#ffffff',
      marginBottom: '20px',
      fontSize: '28px',
      fontWeight: '600',
    },
    userCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '30px',
      padding: '32px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      borderTop: '4px solid #FFD700',
    },
    userRank: {
      textAlign: 'center',
      minWidth: '100px',
    },
    rankDisplay: {
      fontSize: '48px',
      fontWeight: 'bold',
      display: 'block',
    },
    userStats: {
      display: 'flex',
      gap: '40px',
      flex: 1,
      flexWrap: 'wrap',
    },
    userStat: {
      textAlign: 'center',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      minWidth: '120px',
    },
    statValue: {
      display: 'block',
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#10b981',
      textShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
    },
    statLabel: {
      display: 'block',
      fontSize: '14px',
      color: '#9ca3af',
      marginTop: '8px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    leaderboardSection: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      marginBottom: '40px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    sectionTitle: {
      color: '#ffffff',
      margin: '0 0 32px 0',
      fontSize: '32px',
      textAlign: 'center',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    tableContainer: {
      overflowX: 'auto',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      background: 'rgba(0, 0, 0, 0.3)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '1000px',
    },
    headerRow: {
      background: 'rgba(0, 0, 0, 0.5)',
    },
    th: {
      padding: '20px 16px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#ffffff',
      borderBottom: '2px solid rgba(255, 255, 255, 0.05)',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    row: {
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s ease',
    },
    td: {
      padding: '20px 16px',
      verticalAlign: 'middle',
      color: '#ffffff',
    },
    rankCell: {
      textAlign: 'center',
    },
    rankNumber: {
      fontSize: '24px',
      fontWeight: 'bold',
    },
    userCell: {
      minWidth: '180px',
    },
    displayName: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px',
    },
    countryCell: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    scoreCell: {
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#10b981',
      textShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
    },
    correctCell: {
      textAlign: 'center',
      fontSize: '16px',
    },
    percentage: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px',
    },
    timeCell: {
      textAlign: 'center',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      fontSize: '16px',
      color: '#06b6d4',
    },
    performanceCell: {
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '14px',
      padding: '8px 16px',
      borderRadius: '8px',
      background: 'rgba(6, 182, 212, 0.1)',
      border: '1px solid rgba(6, 182, 212, 0.2)',
    },
    actionSection: {
      display: 'flex',
      gap: '20px',
      justifyContent: 'center',
      marginBottom: '40px',
      flexWrap: 'wrap',
    },
    actionButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '16px 32px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    footerMessage: {
      textAlign: 'center',
      background: 'rgba(245, 158, 11, 0.1)',
      color: '#f59e0b',
      padding: '28px',
      borderRadius: '20px',
      fontSize: '18px',
      lineHeight: '1.6',
      fontWeight: '500',
      border: '1px solid rgba(245, 158, 11, 0.2)',
      backdropFilter: 'blur(10px)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    loadingIcon: {
      fontSize: '56px',
      marginBottom: '20px',
      color: '#06b6d4',
    },
    loadingTitle: {
      color: '#ffffff',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    loadingText: {
      color: '#9ca3af',
      fontSize: '15px',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    errorTitle: {
      color: '#ef4444',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    errorText: {
      color: '#9ca3af',
      fontSize: '15px',
      marginBottom: '24px',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>⏳</div>
            <h2 style={styles.loadingTitle}>Loading Leaderboard</h2>
            <p style={styles.loadingText}>
              Fetching tournament results and rankings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.loadingIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Error Loading Leaderboard</h2>
            <p style={styles.errorText}>{error}</p>
            <motion.button 
              onClick={() => fetchLeaderboard()} 
              style={styles.actionButton}
              whileHover={{ 
                y: -2,
                boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              Retry
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  const currentUserEntry = leaderboard.find(entry => entry.user._id === currentUser?._id);

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        <motion.div 
          style={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 style={styles.title}>
            <span style={styles.trophyIcon}>🏆</span>
            Final Leaderboard
          </h1>
          <div style={styles.batchInfo}>
            <span style={styles.batchInfoItem}>
              <strong style={{color: '#ffffff'}}>Batch:</strong> {batchInfo?.name || 'Unknown'}
            </span>
            <span style={styles.batchInfoItem}>
              <strong style={{color: '#ffffff'}}>Round:</strong> {batchInfo?.round?.number || 'N/A'}
            </span>
            <span style={styles.batchInfoItem}>
              <strong style={{color: '#ffffff'}}>Participants:</strong> {leaderboard.length}
            </span>
          </div>
        </motion.div>

        {/* Current User Highlight */}
        {currentUserEntry && (
          <motion.div 
            style={styles.userHighlight}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 style={styles.userTitle}>Your Final Result</h2>
            <div style={styles.userCard}>
              <div style={styles.userRank}>
                <span style={{...styles.rankDisplay, color: getRankColor(currentUserEntry.rank)}}>
                  {getRankEmoji(currentUserEntry.rank)}
                </span>
              </div>
              <div style={styles.userStats}>
                <div style={styles.userStat}>
                  <span style={styles.statValue}>{currentUserEntry.totalScore}</span>
                  <span style={styles.statLabel}>Points</span>
                </div>
                <div style={styles.userStat}>
                  <span style={styles.statValue}>{currentUserEntry.totalCorrect}/{currentUserEntry.puzzlesAttempted}</span>
                  <span style={styles.statLabel}>Correct</span>
                </div>
                <div style={styles.userStat}>
                  <span style={styles.statValue}>{formatTime(currentUserEntry.totalTime)}</span>
                  <span style={styles.statLabel}>Total Time</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard */}
        <motion.div 
          style={styles.leaderboardSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 style={styles.sectionTitle}>All Participants</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Player</th>
                  <th style={styles.th}>Country</th>
                  <th style={styles.th}>Points</th>
                  <th style={styles.th}>Correct</th>
                  <th style={styles.th}>Total Time</th>
                  <th style={styles.th}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <motion.tr 
                    key={entry.user._id} 
                    style={{
                      ...styles.row,
                      background: entry.user._id === currentUser?._id 
                        ? 'rgba(6, 182, 212, 0.15)' 
                        : 'transparent',
                      borderLeft: entry.user._id === currentUser?._id 
                        ? '4px solid #06b6d4' 
                        : 'none'
                    }}
                    whileHover={{ 
                      background: entry.user._id === currentUser?._id 
                        ? 'rgba(6, 182, 212, 0.25)' 
                        : 'rgba(255, 255, 255, 0.05)'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <td style={styles.td}>
                      <div style={styles.rankCell}>
                        <span style={{...styles.rankNumber, color: getRankColor(entry.rank)}}>
                          {getRankEmoji(entry.rank)}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <strong>{entry.user.displayName || entry.user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.countryCell}>
                        {entry.user.country || 'Unknown'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.scoreCell}>
                        <strong>{entry.totalScore}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.correctCell}>
                        {entry.totalCorrect}/{entry.puzzlesAttempted}
                        <div style={styles.percentage}>
                          ({Math.round((entry.totalCorrect / entry.puzzlesAttempted) * 100)}%)
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.timeCell}>
                        {formatTime(entry.totalTime)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.performanceCell}>
                        {entry.totalCorrect === entry.puzzlesAttempted ? '🔥 Perfect!' :
                         entry.totalCorrect > entry.puzzlesAttempted / 2 ? '🎯 Great!' :
                         entry.totalCorrect > 0 ? '👍 Good!' : '😅 Keep trying!'}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div 
          style={styles.actionSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <motion.button 
            style={styles.actionButton}
            onClick={handleViewResults}
            whileHover={{ 
              y: -2,
              boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
            }}
            transition={{ duration: 0.2 }}
          >
            📊 View Your Detailed Results
          </motion.button>
          <motion.button 
            style={styles.actionButton}
            onClick={handleGoToDashboard}
            whileHover={{ 
              y: -2,
              boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
            }}
            transition={{ duration: 0.2 }}
          >
            🏠 Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Footer Message */}
        <motion.div 
          style={styles.footerMessage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          🎉 Congratulations to all participants! 
          <br />
          Great chess puzzle solving everyone! 🔥
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;