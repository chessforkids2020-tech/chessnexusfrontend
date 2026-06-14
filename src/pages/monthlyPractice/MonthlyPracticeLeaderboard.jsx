// src/pages/monthlyFocus/MonthlyFocusLeaderboard.jsx
import React, { useEffect, useState } from "react";
import api from '../../api';
import socket from '../../socket';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import './MonthlyFocusLeaderboard.css';

export default function MonthlyFocusLeaderboard() {
  const [currentFocus, setCurrentFocus] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('current'); // current, all-time
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch current monthly practice
        const focusRes = await api.get('/api/public/monthly-focus/current');
        setCurrentFocus(focusRes.data.focus);
        
        // Fetch leaderboard based on filter
        const leaderboardRes = await api.get(`/api/public/monthly-focus/leaderboard?filter=${timeFilter}`);
        setLeaderboard(leaderboardRes.data.leaderboard);
        setUserRank(leaderboardRes.data.userRank);
        setUserStats(leaderboardRes.data.userStats);
        
        setError(null);
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [timeFilter]);

  // Socket listeners for real-time leaderboard updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleLeaderboardUpdate = (data) => {
      if (data.type === 'monthly_focus') {
        setLeaderboard(data.leaderboard);
        setUserRank(data.userRank);
      }
    };

    socket.on('leaderboard_updated', handleLeaderboardUpdate);

    return () => {
      socket.off('leaderboard_updated', handleLeaderboardUpdate);
    };
  }, []);

  const getRankIcon = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  const getCompletionBadge = (completedDays, perfectDays) => {
    if (perfectDays > 0) return { icon: '👑', text: 'Perfect', class: 'perfect' };
    if (completedDays >= 5) return { icon: '🏆', text: 'Champion', class: 'champion' };
    if (completedDays >= 3) return { icon: '⭐', text: 'Active', class: 'active' };
    return { icon: '🌱', text: 'Beginner', class: 'beginner' };
  };

  const getUserProgress = (user) => {
    const totalDays = currentFocus?.days?.length || 7;
    const completed = user.completedDays || 0;
    return (completed / totalDays) * 100;
  };

  if (loading) {
    return (
      <div className="leaderboard-page loading">
        <div className="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <Link to="/monthly-focus" className="btn-primary">Back to Focus</Link>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <div className="title-section">
            <h1>🏅 Monthly Practice Leaderboard</h1>
            <p className="focus-title">
              {currentFocus?.title || 'Monthly Practice'} - {currentFocus?.theme || ''}
            </p>
          </div>
          
          <div className="filter-section">
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${timeFilter === 'current' ? 'active' : ''}`}
                onClick={() => setTimeFilter('current')}
              >
                Current Month
              </button>
              <button 
                className={`filter-tab ${timeFilter === 'all-time' ? 'active' : ''}`}
                onClick={() => setTimeFilter('all-time')}
              >
                All Time
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats Card */}
      {userStats && (
        <div className="user-stats-card">
          <h2>Your Performance</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Current Rank</span>
              <span className="stat-value">
                {getRankIcon(userRank)} 
                {userRank ? `${userRank} of ${leaderboard.length}` : 'Unranked'}
              </span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Focus XP</span>
              <span className="stat-value">{userStats.focusXp || 0} XP</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Skill Score</span>
              <span className="stat-value">{userStats.skillScore || 0} pts</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Completed Days</span>
              <span className="stat-value">{userStats.completedDays || 0}/7</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className={`stat-badge ${getCompletionBadge(userStats.completedDays, userStats.perfectDays).class}`}>
                {getCompletionBadge(userStats.completedDays, userStats.perfectDays).icon} 
                {getCompletionBadge(userStats.completedDays, userStats.perfectDays).text}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TOP 3 Podium */}
      <div className="podium-section">
        <h2>🏆 Top Performers</h2>
        <div className="podium">
          {leaderboard.slice(0, 3).map((user, index) => {
            const position = index + 1;
            const badge = getCompletionBadge(user.completedDays, user.perfectDays);
            
            return (
              <motion.div
                key={user.userId}
                className={`podium-place place-${position}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="podium-rank">{getRankIcon(position)}</div>
                <div className="podium-user">
                  <h3 className="podium-username">{user.displayName}</h3>
                  <div className="podium-stats">
                    <div className="podium-xp">{user.focusXp} XP</div>
                    <div className="podium-score">{user.skillScore || 0} pts</div>
                    <div className={`podium-badge ${badge.class}`}>
                      {badge.icon} {badge.text}
                    </div>
                  </div>
                  <div className="progress-bar small">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getUserProgress(user)}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="full-leaderboard">
        <h2>Complete Rankings</h2>
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="col-rank">Rank</div>
            <div className="col-user">User</div>
            <div className="col-xp">Focus XP</div>
            <div className="col-score">Skill Score</div>
            <div className="col-progress">Progress</div>
            <div className="col-status">Status</div>
          </div>
          
          <div className="table-body">
            {leaderboard.map((user, index) => {
              const position = index + 1;
              const badge = getCompletionBadge(user.completedDays, user.perfectDays);
              const isCurrentUser = user.userId === userStats?.userId;
              
              return (
                <motion.div
                  key={user.userId}
                  className={`table-row ${isCurrentUser ? 'current-user' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: '#f8f9fa' }}
                >
                  <div className="col-rank">
                    <span className="rank-icon">{getRankIcon(position)}</span>
                  </div>
                  
                  <div className="col-user">
                    <div className="user-info">
                      <span className="username">{user.displayName}</span>
                      {isCurrentUser && <span className="you-badge">YOU</span>}
                    </div>
                  </div>
                  
                  <div className="col-xp">
                    <span className="xp-value">{user.focusXp} XP</span>
                  </div>
                  
                  <div className="col-score">
                    <span className="score-value">{user.skillScore || 0} pts</span>
                  </div>
                  
                  <div className="col-progress">
                    <div className="progress-info">
                      <span className="progress-text">{user.completedDays}/7</span>
                      <div className="progress-bar mini">
                        <div 
                          className="progress-fill"
                          style={{ width: `${getUserProgress(user)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-status">
                    <span className={`status-badge ${badge.class}`}>
                      {badge.icon} {badge.text}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {leaderboard.length === 0 && (
          <div className="empty-leaderboard">
            <h3>📊 No participants yet</h3>
            <p>Be the first to join this month's focus challenge!</p>
            <Link to="/monthly-focus" className="btn-primary">Start Your Journey</Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="leaderboard-navigation">
        <Link to="/monthly-focus" className="btn-secondary">
          ← Back to Focus Dashboard
        </Link>
      </div>
    </div>
  );
}