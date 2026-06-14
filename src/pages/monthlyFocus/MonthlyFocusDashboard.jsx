// src/pages/monthlyFocus/MonthlyFocusDashboard.jsx
import React, { useEffect, useState } from "react";
import api from '../../api';
import socket from '../../socket';
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';
import canvasConfetti from 'canvas-confetti';
import './MonthlyFocusDashboard.css';

// MonthlyFocusAwards moved to MonthlyFocusList.jsx



// Web Audio API success chime — no external package needed
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.32);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.4);
    });
  } catch (e) { /* audio unavailable */ }
};

// Fanfare / clap sound for badge unlock
const playBadgeSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Rising triumphant chord + clap bursts
    const chordFreqs = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5];
    chordFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.5);
      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.6);
    });
    // Clap-like noise bursts
    for (let c = 0; c < 4; c++) {
      const bufSize = ctx.sampleRate * 0.05;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1) * 0.15;
      const src = ctx.createBufferSource();
      const gainN = ctx.createGain();
      src.buffer = buf;
      src.connect(gainN); gainN.connect(ctx.destination);
      gainN.gain.setValueAtTime(1, ctx.currentTime + 0.55 + c * 0.18);
      gainN.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55 + c * 0.18 + 0.08);
      src.start(ctx.currentTime + 0.55 + c * 0.18);
    }
  } catch (e) { /* audio unavailable */ }
};

export default function MonthlyFocusDashboard() {
  const { focusId } = useParams(); // comes from /monthly-focus/:focusId
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [badgePopup, setBadgePopup] = useState(null); // { icon, name, desc, color }
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFocusData = async () => {
      try {
        setLoading(true);
        
        // Fetch all active focuses
        const focusRes = await api.get(`/api/public/monthly-focus/current`);
        const focuses = focusRes.data.focuses || (focusRes.data.focus ? [focusRes.data.focus] : []);

        // Resolve which focus to show.
        // - If the URL has an explicit :focusId, always use that one.
        // - Otherwise (plain /monthly-focus), DON'T just grab the newest active
        //   focus — when several are active in the same month that picks an
        //   empty challenge and hides the leaderboard for the one the user
        //   actually played. Instead, prefer the active focus the user has
        //   already participated in, falling back to the newest only if none.
        let thisFocus = null;
        if (focusId) {
          thisFocus = focuses.find(f => f._id === focusId) || null;
        } else if (focuses.length === 1) {
          thisFocus = focuses[0];
        } else if (focuses.length > 1) {
          // Check the user's progress in each active focus; pick the first one
          // they've made progress in (focuses are already newest-first).
          const progressChecks = await Promise.all(
            focuses.map(f =>
              api.get(`/api/public/monthly-focus/my-progress?focusId=${f._id}`)
                .then(r => {
                  const p = r.data?.progress;
                  const completed = Array.isArray(p?.completedDays)
                    ? p.completedDays.length
                    : (p?.dayProgress?.length || 0);
                  return { f, completed };
                })
                .catch(() => ({ f, completed: 0 }))
            )
          );
          const participated = progressChecks.find(p => p.completed > 0);
          thisFocus = participated ? participated.f : focuses[0];
        }
        setCurrentFocus(thisFocus);

        if (thisFocus) {
          const id = thisFocus._id;
          // Fetch user's progress for this focus
          const progressRes = await api.get(`/api/public/monthly-focus/my-progress?focusId=${id}`);
          setUserProgress(progressRes.data.progress);
          // Fetch leaderboard for this focus
          const leaderboardRes = await api.get(`/api/public/monthly-focus/leaderboard?focusId=${id}`);
          setFocusLeaderboard(leaderboardRes.data.leaderboard);
          setUserRank(leaderboardRes.data.userRank);
        }
        
        setError(null);
      } catch (err) {
        console.error('Focus fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load monthly focus data');
      } finally {
        setLoading(false);
      }
    };

    fetchFocusData();
  }, [focusId]);

  // Re-fetch progress & leaderboard when user switches active challenge
  // (removed — navigation now handled via route /monthly-focus/:focusId)

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleXpEarned = (data) => {
      setEarnedXp(data.amount);
      setShowXpAnimation(true);
      setUserProgress(prev => prev ? ({ ...prev, xpEarned: (prev.xpEarned || 0) + data.amount }) : prev);
      // 🎉 Confetti + Sound on completion
      setShowConfetti(true);
      playSuccessSound();
      setTimeout(() => setShowXpAnimation(false), 3000);
      setTimeout(() => setShowConfetti(false), 4500);
      if (data.milestone) {
        setShowMilestoneAlert(true);
        setTimeout(() => setShowMilestoneAlert(false), 6000);
      }
      // Refresh progress to update streak & dayProgress
      const focusParam = focusId ? `?focusId=${focusId}` : '';
      api.get(`/api/public/monthly-focus/my-progress${focusParam}`)
        .then(r => setUserProgress(r.data.progress))
        .catch(() => {});
    };

    const handleProgressUpdate = (data) => {
      setUserProgress(data.progress);
      setUserRank(data.newRank);
    };

    const handleActivity = (data) => {
      setActivityFeed(prev => [{ ...data, id: Date.now() + Math.random() }, ...prev].slice(0, 8));
    };

    // New monthly challenge activated by admin — re-fetch
    const handleFocusActivated = () => {
      const id = focusId || currentFocus?._id;
      Promise.all([
        api.get('/api/public/monthly-focus/current'),
        id ? api.get(`/api/public/monthly-focus/my-progress?focusId=${id}`) : Promise.resolve({ data: { progress: null } }),
        id ? api.get(`/api/public/monthly-focus/leaderboard?focusId=${id}`) : Promise.resolve({ data: { leaderboard: [], userRank: null } }),
      ]).then(([focusRes, progressRes, leaderboardRes]) => {
        const focuses = focusRes.data.focuses || (focusRes.data.focus ? [focusRes.data.focus] : []);
        const thisFocus = id ? focuses.find(f => f._id === id) : focuses[0];
        setCurrentFocus(thisFocus || null);
        setUserProgress(progressRes.data.progress);
        setFocusLeaderboard(leaderboardRes.data.leaderboard);
        setUserRank(leaderboardRes.data.userRank);
      }).catch(() => {});
    };

    socket.on('focus_xp_earned', handleXpEarned);
    socket.on('focus_progress_updated', handleProgressUpdate);
    socket.on('focus_activity', handleActivity);
    socket.on('monthly_focus_activated', handleFocusActivated);

    return () => {
      socket.off('focus_xp_earned', handleXpEarned);
      socket.off('focus_progress_updated', handleProgressUpdate);
      socket.off('focus_activity', handleActivity);
      socket.off('monthly_focus_activated', handleFocusActivated);
    };
  }, []);

  // Countdown timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fireworks burst when badge popup appears
  useEffect(() => {
    if (!badgePopup) return;
    const color = badgePopup.color || '#ffd700';
    const end = Date.now() + 2200;
    const frame = () => {
      canvasConfetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.85 },
        colors: [color, '#ffffff', '#ffd700'],
        startVelocity: 45,
        ticks: 120,
      });
      canvasConfetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.85 },
        colors: [color, '#ffffff', '#ffd700'],
        startVelocity: 45,
        ticks: 120,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [badgePopup]);

  // Badge unlock detection — shows popup once per badge per focus month
  useEffect(() => {
    if (!userProgress || !currentFocus) return;

    const completedDays = userProgress.completedDays?.length || 0;
    const perfectDays = (userProgress.dayProgress || []).filter(d => d.isPerfect).length;
    const focusId = currentFocus._id || currentFocus.id;

    // Decode JWT to get userId so badge-seen keys are per-account, not per-browser
    let userId = 'guest';
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || payload.id || payload.sub || 'guest';
      }
    } catch (_) {}

    const BADGE_DEFS = [
      { key: 'champion',  icon: '🏆', name: 'Champion',  desc: 'All 7 days completed + 5 perfect scores!', color: '#fbbf24', check: () => perfectDays >= 5 && completedDays >= 7 },
      { key: 'perfect',   icon: '👑', name: 'Perfect',   desc: 'Perfect score on 5 or more days!',          color: '#a78bfa', check: () => perfectDays >= 5 },
      { key: 'achiever',  icon: '🎯', name: 'Achiever',  desc: 'All 7 days completed — full week warrior!', color: '#06b6d4', check: () => completedDays >= 7 },
      { key: 'dedicated', icon: '🔥', name: 'Dedicated', desc: '5 days done — you\'re on fire!',            color: '#f97316', check: () => completedDays >= 5 },
      { key: 'active',    icon: '⭐', name: 'Active',    desc: '3 days completed — showing up daily!',     color: '#3b82f6', check: () => completedDays >= 3 },
      { key: 'beginner',  icon: '🌱', name: 'Beginner',  desc: 'You started your focus journey!',           color: '#22c55e', check: () => completedDays >= 1 },
    ];

    for (const badge of BADGE_DEFS) {
      if (!badge.check()) continue;
      const storageKey = `focus_badge_seen_${userId}_${focusId}_${badge.key}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, '1');
        setBadgePopup(badge);
        playBadgeSound();
        break; // Show highest unlocked badge that hasn't been seen yet
      }
    }
  }, [userProgress, currentFocus]);

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
      const focusParam = selectedFocusId ? `?focusId=${selectedFocusId}` : '';
      await api.post(`/api/public/monthly-focus/claim-milestone${focusParam}`);
      setShowMilestoneAlert(false);
      // Refresh progress
      const progressRes = await api.get(`/api/public/monthly-focus/my-progress${focusParam}`);
      setUserProgress(progressRes.data.progress);
    } catch (err) {
      console.error('Claim reward error:', err);
    }
  };

  // ── Derived values for new features ────────────────────────────────
  const streakCurrent = userProgress?.streaks?.current || 0;
  const streakLongest = userProgress?.streaks?.longest || 0;
  const completedCount = userProgress?.completedDays?.length || 0;
  const dayProgressArr = userProgress?.dayProgress || [];
  const perfectCount = dayProgressArr.filter(d => d.isPerfect).length;
  const todayDay = currentFocus?.days?.find(d => isDayRunning(d));
  const todayCompleted = todayDay ? getDayStatus(todayDay.dayNumber) === 'completed' : false;

  const getCurrentBadge = () => {
    if (perfectCount >= 5 && completedCount >= 7) return { icon: '🏆', name: 'Champion',  cls: 'champion'  };
    if (perfectCount >= 5)  return { icon: '👑', name: 'Perfect',   cls: 'perfect'   };
    if (completedCount >= 7) return { icon: '🎯', name: 'Achiever',  cls: 'achiever'  };
    if (completedCount >= 5) return { icon: '🔥', name: 'Dedicated', cls: 'dedicated' };
    if (completedCount >= 3) return { icon: '⭐', name: 'Active',    cls: 'active'    };
    if (completedCount >= 1) return { icon: '🌱', name: 'Beginner',  cls: 'beginner'  };
    return null;
  };

  const getNextBadge = () => {
    if (completedCount === 0) return null;
    if (completedCount < 3)  return { icon: '⭐', name: 'Active',    need: 3 - completedCount, field: 'days'         };
    if (completedCount < 5)  return { icon: '🔥', name: 'Dedicated', need: 5 - completedCount, field: 'days'         };
    if (completedCount < 7)  return { icon: '🎯', name: 'Achiever',  need: 7 - completedCount, field: 'days'         };
    if (perfectCount < 5)    return { icon: '👑', name: 'Perfect',   need: 5 - perfectCount,   field: 'perfect days' };
    return null;
  };

  if (loading) {
    return (
      <div className="focus-dashboard loading">
        <div className="spinner"></div>
        <p style={{ color: '#9ca3af', fontSize: '1.1em', marginTop: '20px' }}>Loading Monthly Focus...</p>
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
      <div className="focus-dashboard no-focus-with-awards">
        <motion.div
          className="nf-hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="nf-coming-soon-badge">⏳ Coming Soon</div>
          <h2 className="nf-title">🎯 No Active Challenge Right Now</h2>
          <p className="nf-desc">
            The next Monthly Focus challenge is on its way!<br />
            Check out what's waiting for you below — and come back ready to compete.
          </p>
          <Link to="/dashboard" className="btn-secondary nf-back-btn">← Back to Dashboard</Link>
        </motion.div>
        <MonthlyFocusAwards animate={true} />
      </div>
    );
  }

  return (
    <div className="focus-dashboard">
      {/* 🎉 Confetti on task completion */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={280}
          gravity={0.25}
          colors={['#06b6d4','#10b981','#ffd700','#ff6b6b','#a78bfa','#34d399']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}

      {/* 🎖️ Badge Unlock Popup */}
      <AnimatePresence>
        {badgePopup && (
          <>
            <motion.div
              key="badge-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9100,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
              }}
              onClick={() => setBadgePopup(null)}
            >
              <motion.div
                key="badge-card"
                initial={{ scale: 0.4, opacity: 0, y: 60 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.6, opacity: 0, y: -40 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: `linear-gradient(145deg, #0f0f1a, #1a1a2e)`,
                  border: `2px solid ${badgePopup.color}`,
                  borderRadius: '24px',
                  padding: '40px 36px',
                  textAlign: 'center',
                  maxWidth: '380px',
                  width: '100%',
                  boxShadow: `0 0 60px ${badgePopup.color}55, 0 24px 60px rgba(0,0,0,0.6)`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Glow ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '24px',
                  background: `radial-gradient(ellipse at 50% 0%, ${badgePopup.color}18 0%, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                <motion.div
                  animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  style={{ fontSize: '72px', lineHeight: 1, marginBottom: '12px' }}
                >
                  {badgePopup.icon}
                </motion.div>

                <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: badgePopup.color, marginBottom: '8px' }}>
                  Badge Unlocked!
                </div>

                <h2 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '800', color: '#ffffff' }}>
                  {badgePopup.name}
                </h2>

                <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.5, margin: '0 0 28px' }}>
                  {badgePopup.desc}
                </p>

                {/* Animated sparkle dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '28px' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: badgePopup.color }}
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setBadgePopup(null)}
                  style={{
                    width: '100%', padding: '14px',
                    background: `linear-gradient(135deg, ${badgePopup.color}, ${badgePopup.color}bb)`,
                    border: 'none', borderRadius: '12px',
                    color: '#000', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                    letterSpacing: '0.03em'
                  }}
                >
                  🎉 Awesome!
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      {/* ← Back to challenges */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/monthly-focus"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: '#9ca3af', fontSize: '13px', fontWeight: '600',
            textDecoration: 'none', padding: '6px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', transition: 'color 0.2s'
          }}
        >
          ← All Challenges
        </Link>
      </div>

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



      {/* 🔥 Streak Counter */}
      <motion.div
        className="streak-banner"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="streak-left">
          <motion.div
            className="streak-fire-wrap"
            animate={{ scale: [1, 1.14, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="streak-fire-emoji" style={{ fontSize: `${Math.min(2 + streakCurrent * 0.12, 3.5)}em` }}>🔥</span>
          </motion.div>
          <div>
            <div className="streak-num">{streakCurrent}</div>
            <div className="streak-label">Day Streak</div>
          </div>
          <div className="streak-divider" />
          <div>
            <div className="streak-num streak-num-best">{streakLongest}</div>
            <div className="streak-label">Best Ever</div>
          </div>
        </div>
        <div className="streak-middle">
          <div className="streak-week-label">THIS WEEK</div>
          <div className="streak-dots">
            {[1,2,3,4,5,6,7].map(d => (
              <div key={d} className={`sdot ${d <= streakCurrent ? 'sdot-on' : 'sdot-off'}`}>
                {d <= streakCurrent ? '🔥' : d}
              </div>
            ))}
          </div>
        </div>
        <div className="streak-right">
          {todayDay && !todayCompleted && streakCurrent > 0 && (
            <motion.div
              className="streak-warning"
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⚠️ Complete today to keep your {streakCurrent}-day streak!
            </motion.div>
          )}
          {streakCurrent === 0 && (
            <div className="streak-start-msg">🚀 Start your streak — complete today's task!</div>
          )}
          {streakCurrent > 0 && (!todayDay || todayCompleted) && (
            <div className="streak-safe-msg">🔥 Your streak is safe today!</div>
          )}
        </div>
      </motion.div>

      {/* 🎯 Today's Mission */}
      {todayDay ? (
        <motion.div
          className={`todays-mission ${todayCompleted ? 'tm-done' : 'tm-active'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="tm-left">
            <div className="tm-eyebrow">📅 TODAY’S MISSION  ·  Day {todayDay.dayNumber}</div>
            <h2 className="tm-title">{todayDay.title}</h2>
            <div className="tm-pills">
              <span className={`tm-pill tm-pill-type-${todayDay.taskType}`}>
                {todayDay.taskType === 'puzzles' && '🧩 Puzzles'}
                {todayDay.taskType === 'find_mistakes' && '🔍 Find Mistakes'}
                {todayDay.taskType === 'tactics_identification' && '🎯 Tactics ID'}
              </span>
              <span className="tm-pill tm-pill-xp">+{todayDay.xpReward} XP</span>
              {streakCurrent > 0 && <span className="tm-pill tm-pill-streak">🔥 ×1.2 Streak</span>}
            </div>
          </div>
          <div className="tm-right">
            {todayCompleted ? (
              <div className="tm-completed-state">
                <div className="tm-check-circle">✅</div>
                <div className="tm-check-text">Completed!</div>
              </div>
            ) : (
              <>
                {todayDay.endTime && (
                  <div className="tm-timer">
                    <div className="tm-timer-label">CLOSES IN</div>
                    <div className="tm-timer-val">{formatCountdown(todayDay.endTime).text}</div>
                  </div>
                )}
                <Link to={`/monthly-focus/task/${todayDay.dayNumber}?focusId=${currentFocus._id}`} className="tm-start-btn">
                  ▶ Start Now
                </Link>
              </>
            )}
          </div>
        </motion.div>
      ) : currentFocus?.days?.length > 0 && (
        <motion.div
          className="todays-mission tm-locked"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <span style={{ fontSize: '2em' }}>🔒</span>
          <div>
            <div className="tm-eyebrow">TODAY’S MISSION</div>
            <p style={{ margin: 0, color: '#9ca3af' }}>Admin hasn’t opened today’s task yet — check back soon!</p>
          </div>
        </motion.div>
      )}

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
                      to={`/monthly-focus/task/${day.dayNumber}?focusId=${currentFocus._id}`}
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
                      to={`/monthly-focus/task/${day.dayNumber}?focusId=${currentFocus._id}`}
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

      {/* 🏆 Achievement Badge Showcase */}
      <motion.div
        className="badge-showcase"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="bs-header">
          <h2>🎖️ Achievement Badges</h2>
          {getCurrentBadge() && (
            <div className={`bs-current-pill bs-pill-${getCurrentBadge().cls}`}>
              {getCurrentBadge().icon} {getCurrentBadge().name}
            </div>
          )}
        </div>
        <div className="bs-grid">
          {[
            { icon: '🌱', name: 'Beginner',  req: '1+ days',            unlocked: completedCount >= 1,                              cls: 'beginner'  },
            { icon: '⭐', name: 'Active',    req: '3+ days',            unlocked: completedCount >= 3,                              cls: 'active'    },
            { icon: '🔥', name: 'Dedicated', req: '5+ days',            unlocked: completedCount >= 5,                              cls: 'dedicated' },
            { icon: '🎯', name: 'Achiever',  req: 'All 7 days',         unlocked: completedCount >= 7,                              cls: 'achiever'  },
            { icon: '👑', name: 'Perfect',   req: '5 perfect days',     unlocked: perfectCount >= 5,                                cls: 'perfect'   },
            { icon: '🏆', name: 'Champion',  req: '7 days + 5 perfect', unlocked: perfectCount >= 5 && completedCount >= 7,         cls: 'champion'  },
          ].map(badge => (
            <motion.div
              key={badge.name}
              className={`bs-badge ${badge.unlocked ? 'bs-badge-on' : 'bs-badge-off'} bs-badge-${badge.cls}`}
              whileHover={{ scale: 1.08, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className={`bs-icon ${badge.unlocked ? '' : 'bs-icon-gray'}`}>{badge.icon}</div>
              <div className="bs-name">{badge.name}</div>
              <div className="bs-req">{badge.req}</div>
              {badge.unlocked && <div className="bs-earned">✓ Earned</div>}
            </motion.div>
          ))}
        </div>
        {getNextBadge() && (
          <div className="bs-next-hint">
            🎯 {getNextBadge().need} more {getNextBadge().field} to unlock {getNextBadge().icon} <strong>{getNextBadge().name}</strong>
          </div>
        )}
      </motion.div>

      {/* 📊 Performance Graph + 📢 Live Activity Feed */}
      <div className="perf-activity-row">
        {/* Performance Graph */}
        <motion.div
          className="perf-graph"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <h2>📊 Your Performance</h2>
          <p className="pg-sub">Score accuracy per completed day</p>
          <div className="pg-bars">
            {[1,2,3,4,5,6,7].map(day => {
              const dp = dayProgressArr.find(d => d.dayNumber === day);
              const pct = dp ? Math.round(dp.scorePercentage || 0) : 0;
              return (
                <div key={day} className="pg-col">
                  <div className="pg-pct">{dp ? `${pct}%` : ''}</div>
                  <div className="pg-track">
                    <motion.div
                      className={`pg-fill ${dp?.isPerfect ? 'pg-fill-perfect' : dp ? 'pg-fill-done' : 'pg-fill-empty'}`}
                      initial={{ height: '0%' }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.65 + day * 0.07, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="pg-label">D{day}</div>
                  {dp?.isPerfect && <div className="pg-star">⭐</div>}
                </div>
              );
            })}
          </div>
          {completedCount === 0 && (
            <p className="pg-empty">Complete your first task to see your performance chart!</p>
          )}
        </motion.div>

        {/* Top Performers */}
        <motion.div
          className="activity-feed"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <h2>🏆 Top Performers</h2>
          <p className="af-sub">This month's leading students</p>
          <div className="af-list">
            {focusLeaderboard.length > 0 ? focusLeaderboard.slice(0, 8).map((u, i) => (
              <div key={u.userId} className={`af-item af-static${i < 3 ? ' af-top3' : ''}`}>
                <span className="af-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="af-rank-num">#{i + 1}</span>}
                </span>
                <span className="af-text">
                  <strong>{u.displayName || u.username}</strong>
                  <span className="af-days">{u.completedDays} day{u.completedDays !== 1 ? 's' : ''}</span>
                </span>
                <span className="af-xp">{u.focusXp || u.totalScore || 0} XP</span>
              </div>
            )) : (
              <div className="af-empty">
                <span className="af-pulse" />
                No entries yet — be the first!
              </div>
            )}
          </div>

          {/* Live activity strip — subtle, below leaderboard */}
          {activityFeed.length > 0 && (
            <div className="af-live-strip">
              <span className="af-live-dot" />
              <span className="af-live-label">Live:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={activityFeed[0].id}
                  className="af-live-text"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <strong>{activityFeed[0].username}</strong> {activityFeed[0].message}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div 
        className="focus-navigation"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
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