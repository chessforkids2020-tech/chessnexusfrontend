// src/pages/monthlyFocus/MonthlyFocusDashboard.jsx
import React, { useEffect, useState } from "react";
import api from '../../api';
import socket from '../../socket';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import './MonthlyFocusDashboard.css';

export default function MonthlyFocusDashboard() {
  const [currentFocus, setCurrentFocus] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [focusLeaderboard, setFocusLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [showMilestoneAlert, setShowMilestoneAlert] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0); // Force re-render for countdown
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFocusData = async () => {
      try {
        setLoading(true);
        
        // Fetch current monthly practice
        const focusRes = await api.get('/api/public/monthly-focus/current');
        setCurrentFocus(focusRes.data.focus);
        
        // Fetch user's progress
        const progressRes = await api.get('/api/public/monthly-focus/my-progress');
        setUserProgress(progressRes.data.progress);
        
        // Fetch leaderboard
        const leaderboardRes = await api.get('/api/public/monthly-focus/leaderboard');
        setFocusLeaderboard(leaderboardRes.data.leaderboard);
        setUserRank(leaderboardRes.data.userRank);
        
        setError(null);
      } catch (err) {
        console.error('Focus fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load monthly practice data');
      } finally {
        setLoading(false);
      }
    };

    fetchFocusData();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleXpEarned = (data) => {
      setEarnedXp(data.amount);
      setShowXpAnimation(true);
      setUserProgress(prev => ({
        ...prev,
        xpEarned: prev.xpEarned + data.amount
      }));
      
      setTimeout(() => setShowXpAnimation(false), 2000);
      
      if (data.milestone) {
        setShowMilestoneAlert(true);
        setTimeout(() => setShowMilestoneAlert(false), 5000);
      }
    };

    const handleProgressUpdate = (data) => {
      setUserProgress(data.progress);
      setUserRank(data.newRank);
    };

    socket.on('focus_xp_earned', handleXpEarned);
    socket.on('focus_progress_updated', handleProgressUpdate);

    return () => {
      socket.off('focus_xp_earned', handleXpEarned);
      socket.off('focus_progress_updated', handleProgressUpdate);
    };
  }, []);

  // Countdown timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to check if day is currently running
  const isDayRunning = (day) => {
    if (!day.isStarted || !day.endTime) return false;
    return new Date() < new Date(day.endTime);
  };

  // Helper function to format countdown
  const formatCountdown = (endTime) => {
    const remaining = new Date(endTime) - new Date();
    if (remaining <= 0) return { text: 'Ended', expired: true };
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return { 
      text: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      expired: false,
      hours,
      minutes,
      seconds
    };
  };

  const getDayStatus = (dayNumber) => {
    if (!userProgress) return 'available';
    return userProgress.completedDays?.includes(dayNumber) ? 'completed' : 'available';
  };

  const getTotalWeeklyXp = () => {
    if (!userProgress || !currentFocus) return 0;
    return userProgress.totalXp || 0;
  };

  const getProgressPercentage = () => {
    if (!currentFocus) return 0;
    const completed = userProgress?.completedDays?.length || 0;
    return (completed / 7) * 100;
  };

  const claimMilestoneReward = async () => {
    try {
      await api.post('/api/public/monthly-focus/claim-milestone');
      setShowMilestoneAlert(false);
      // Refresh progress
      const progressRes = await api.get('/api/public/monthly-focus/my-progress');
      setUserProgress(progressRes.data.progress);
    } catch (err) {
      console.error('Claim reward error:', err);
    }
  };

  if (loading) {
    return (
      <div className="focus-dashboard loading">
        <div className="spinner"></div>
        <p style={{ color: '#9ca3af', fontSize: '1.1em', marginTop: '20px' }}>Loading Monthly Practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="focus-dashboard error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!currentFocus) {
    return (
      <div className="focus-dashboard no-focus">
        <h2>🎯 No Active Monthly Practice</h2>
        <p>Check back soon for the next monthly practice challenge!</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="focus-dashboard">
      {/* XP Animation */}
      {showXpAnimation && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="xp-animation"
        >
          +{earnedXp} XP ✨
        </motion.div>
      )}

      {/* Milestone Alert */}
      {showMilestoneAlert && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="milestone-alert"
        >
          <div className="alert-content">
            <span>🎉 Milestone Reached! +75 XP Bonus Available!</span>
            <button onClick={claimMilestoneReward} className="claim-btn">
              Claim Reward
            </button>
          </div>
        </motion.div>
      )}

      {/* Header Section */}
      <motion.div 
        className="focus-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="focus-title">
          <h1>🎯 {currentFocus.title}</h1>
          <p className="focus-theme">{currentFocus.theme}</p>
        </div>
        
        <div className="focus-stats">
          {/* Skill Score */}
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3>🧠 Skill Score</h3>
            <div className="xp-display">
              <span className="xp-amount">{userProgress?.skillScore || 0}</span>
              <span className="xp-label">Rating</span>
            </div>
          </motion.div>
          
          {/* XP */}
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3>🏅 Focus XP</h3>
            <div className="xp-display">
              <span className="xp-amount">{userProgress?.totalXp || 0}</span>
              <span className="xp-label">XP</span>
            </div>
          </motion.div>
          
          {/* Rank */}
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3>🏆 Focus Rank</h3>
            <div className="rank-display">
              <span className="rank-position">#{userRank || '-'}</span>
              <span className="rank-total">of {focusLeaderboard.length}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Progress overview */}
      <motion.div 
        className="progress-overview"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2>📊 Your Weekly Progress</h2>
        <div className="progress-bar">
          <motion.div 
            className="progress-fill" 
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage()}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          ></motion.div>
        </div>
        <p className="progress-text">
          {userProgress?.completedDays?.length || 0} of 7 days complete
          {userProgress?.completedDays?.length >= 5 && " • Milestone reached! 🎉"}
        </p>
      </motion.div>

      {/* Daily Tasks Grid */}
      <motion.div 
        className="daily-tasks-grid"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2>📅 Daily Tasks</h2>
        <div className="tasks-container">
          {currentFocus.days?.length > 0 ? currentFocus.days.map((day, index) => {
            const status = getDayStatus(day.dayNumber);
            const running = isDayRunning(day);
            const countdown = day.endTime ? formatCountdown(day.endTime) : null;
            
            return (
              <motion.div
                key={day.dayNumber}
                className={`task-card ${status} ${running ? 'running' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: (status === 'available' && running) ? 1.03 : 1 }}
                whileTap={{ scale: (status === 'available' && running) ? 0.98 : 1 }}
              >
                <div className="task-header">
                  <span className="day-number">Day {day.dayNumber}</span>
                  <span className="task-status-icon">
                    {status === 'completed' ? '✅' : running ? '🔴' : day.isStarted ? '⏹️' : '🔒'}
                  </span>
                </div>
                
                {/* Countdown Timer - show only for running days */}
                {running && countdown && (
                  <div className="countdown-timer">
                    <div>TIME REMAINING</div>
                    <div>{countdown.text}</div>
                  </div>
                )}
                
                {/* Not Started Badge */}
                {!day.isStarted && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    ⏳ Waiting for Admin to Start
                  </div>
                )}
                
                {/* Ended Badge - can still do for 5 XP */}
                {day.isStarted && !running && status !== 'completed' && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    ⏱️ Time's Up - Complete for 5 XP
                  </div>
                )}
                
                <h3 className="task-title">{day.title}</h3>
                <p className="task-type-badge" style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  marginBottom: '12px',
                  background: day.taskType === 'puzzles' ? 'rgba(6, 182, 212, 0.15)' : 
                             day.taskType === 'find_mistakes' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: day.taskType === 'puzzles' ? '#06b6d4' : 
                         day.taskType === 'find_mistakes' ? '#f59e0b' : '#10b981',
                  border: `1px solid ${day.taskType === 'puzzles' ? 'rgba(6, 182, 212, 0.3)' : 
                         day.taskType === 'find_mistakes' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  fontWeight: '600'
                }}>
                  {day.taskType === 'puzzles' && '🧩 Puzzles'}
                  {day.taskType === 'find_mistakes' && '🔍 Find Mistakes'}
                  {day.taskType === 'tactics_identification' && '🎯 Tactics ID'}
                </p>
                
                <div className="task-footer">
                  <span className="xp-reward">
                    +{(day.isStarted && !running && status !== 'completed') ? 5 : day.xpReward} XP
                    {day.timerEnabled && <span className="timer-badge">⏱️</span>}
                  </span>
                  {status === 'available' && running && (
                    <Link 
                      to={`/monthly-focus/task/${day.dayNumber}`}
                      className="start-task-btn"
                    >
                      Start Now!
                    </Link>
                  )}
                  {status === 'available' && !running && !day.isStarted && (
                    <span className="waiting-badge">
                      Coming Soon
                    </span>
                  )}
                  {status === 'available' && day.isStarted && !running && (
                    <Link 
                      to={`/monthly-focus/task/${day.dayNumber}`}
                      className="late-task-btn"
                    >
                      Do for 5 XP
                    </Link>
                  )}
                  {status === 'completed' && (
                    <span className="completed-badge">✓ Done</span>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <div style={{
              gridColumn: '1/-1', 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: '#9ca3af',
              background: 'rgba(23, 23, 23, 0.5)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <p style={{ fontSize: '1.1em', margin: 0 }}>No days created yet. Check back soon!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mini Leaderboard */}
      <motion.div 
        className="mini-leaderboard"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <h2>🏅 Focus Leaders</h2>
        <div className="leaderboard-list">
          {focusLeaderboard.slice(0, 5).map((user, index) => (
            <motion.div 
              key={user.userId} 
              className="leaderboard-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.7 + (index * 0.1) }}
              whileHover={{ x: 6 }}
            >
              <span className="rank">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              <span className="username">{user.displayName}</span>
              <span className="xp">{user.totalXp} XP</span>
            </motion.div>
          ))}
        </div>
        
        <Link to="/monthly-focus/leaderboard" className="view-full-btn">
          View Full Leaderboard →
        </Link>
      </motion.div>

      {/* Navigation */}
      <motion.div 
        className="focus-navigation"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Link to="/dashboard" className="btn-secondary">
          ← Back to Dashboard
        </Link>
        <Link to="/monthly-focus/leaderboard" className="btn-primary">
          View Leaderboard →
        </Link>
      </motion.div>
    </div>
  );
}