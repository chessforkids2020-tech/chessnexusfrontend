// src/pages/monthlyFocus/MonthlyFocusList.jsx
import React, { useEffect, useState } from "react";
import api from '../../api';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from '../../contexts/AuthContext';
import './MonthlyFocusList.css';
import './MonthlyFocusDashboard.css';

export default function MonthlyFocusList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEliteOrAdmin = user?.role === 'elite' || user?.role === 'admin';

  const [focuses, setFocuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canCreate, setCanCreate] = useState(true);
  const [nextAllowedDate, setNextAllowedDate] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/public/monthly-focus/current');
        const all = res.data.focuses || (res.data.focus ? [res.data.focus] : []);
        // Admin (ChessNexus) challenges always appear first
        const sorted = [...all].sort((a, b) => {
          const aIsAdmin = a.createdBy?.role === 'admin' || !a.createdBy;
          const bIsAdmin = b.createdBy?.role === 'admin' || !b.createdBy;
          if (aIsAdmin && !bIsAdmin) return -1;
          if (!aIsAdmin && bIsAdmin) return 1;
          return 0;
        });
        setFocuses(sorted);
      } catch (err) {
        setError('Failed to load challenges');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Check if elite user can create this month
    if (isEliteOrAdmin) {
      api.get('/api/elite/monthly-focus/can-create')
        .then(res => {
          setCanCreate(res.data.canCreate);
          setNextAllowedDate(res.data.nextAllowedDate ? new Date(res.data.nextAllowedDate) : null);
        })
        .catch(() => {});
    }
  }, [isEliteOrAdmin]);

  if (loading) {
    return (
      <div className="mfl-page">
        <div className="mfl-spinner-wrap">
          <div className="mfl-spinner" />
          <p>Loading challenges…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mfl-page">
        <p className="mfl-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="mfl-page">
      {/* Header */}
      <motion.div
        className="mfl-hero"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <h1 className="mfl-title">🎯 Monthly Focus</h1>
        <p className="mfl-subtitle">
          Sharpen your chess skills with daily tasks. Pick a challenge and start earning XP.
        </p>

        {/* Challenge count badge */}
        {focuses.length > 0 ? (
          <div className="mfl-count-badge">
            <span className="mfl-count-dot" />
            {focuses.length} active challenge{focuses.length > 1 ? 's' : ''} running right now
          </div>
        ) : (
          <div className="mfl-count-badge mfl-count-none">
            ⏳ No active challenges right now — check back soon
          </div>
        )}

        {/* Elite / Admin — Create / Manage Challenge button */}
        {isEliteOrAdmin && (
          <div className="mfl-elite-create">
            {canCreate ? (
              <button
                className="mfl-elite-btn"
                onClick={() => navigate('/elite-monthly-focus')}
              >
                ✨ Create Challenge
              </button>
            ) : (
              <>
                <button
                  className="mfl-elite-btn"
                  onClick={() => navigate('/elite-monthly-focus')}
                >
                  ⚙️ Manage My Challenge
                </button>
                <p className="mfl-elite-note">
                  Next new challenge: {nextAllowedDate ? nextAllowedDate.toLocaleDateString() : '1st of next month'}
                </p>
              </>
            )}
            {canCreate && <p className="mfl-elite-note">Elite members can create 1 challenge per month.</p>}
          </div>
        )}
      </motion.div>

      {/* Challenge cards */}
      {focuses.length === 0 ? (
        <motion.div
          className="mfl-empty"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mfl-empty-icon">🏆</div>
          <h2>Nothing active yet</h2>
          <p>The next Monthly Focus challenge is on its way. Stay tuned!</p>
          <Link to="/dashboard" className="mfl-back-btn">← Back to Dashboard</Link>
        </motion.div>
      ) : (
        <div className="mfl-grid">
          {focuses.map((focus, i) => {
            const isAdmin = focus.createdBy?.role === 'admin' || !focus.createdBy;
            return <FocusCard key={focus._id} focus={focus} index={i} isAdmin={isAdmin} />;
          })}
        </div>
      )}

      {/* Monthly Focus Awards */}
      <MonthlyFocusAwards />
    </div>
  );
}

// ── Monthly Focus Awards ─────────────────────────────────────────────────────
function MonthlyFocusAwards() {
  return (
    <motion.div
      className="mfa-section"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
    >
      <div className="mfa-title-row">
        <span className="mfa-trophy-icon">🏆</span>
        <div>
          <h2 className="mfa-main-title">Monthly Focus Awards</h2>
          <p className="mfa-subtitle">Complete daily tasks, earn XP, unlock badges &amp; climb the ranks</p>
        </div>
      </div>

      <div className="mfa-block">
        <h3 className="mfa-block-title">🎖️ Achievement Badges — Your Journey</h3>
        <p className="mfa-block-sub">Badges are awarded based on how many days you complete and how many perfect scores you achieve</p>
        <div className="mfa-badges-list">
          <div className="mfa-badge-row">
            <div className="mfa-badge-icon mfa-badge-beginner">🌱</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Beginner</span><span className="mfa-badge-req">Complete 1–2 days</span></div>
            <div className="mfa-badge-tag mfa-tag-green">You've started!</div>
          </div>
          <div className="mfa-badge-row">
            <div className="mfa-badge-icon mfa-badge-active">⭐</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Active</span><span className="mfa-badge-req">Complete 3 or more days</span></div>
            <div className="mfa-badge-tag mfa-tag-blue">Showing up daily</div>
          </div>
          <div className="mfa-badge-row">
            <div className="mfa-badge-icon mfa-badge-dedicated">🔥</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Dedicated</span><span className="mfa-badge-req">Complete 5 or more days</span></div>
            <div className="mfa-badge-tag mfa-tag-orange">+75 XP Milestone Bonus</div>
          </div>
          <div className="mfa-badge-row">
            <div className="mfa-badge-icon mfa-badge-achiever">🎯</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Achiever</span><span className="mfa-badge-req">Complete all 7 days</span></div>
            <div className="mfa-badge-tag mfa-tag-cyan">Full week warrior!</div>
          </div>
          <div className="mfa-badge-row">
            <div className="mfa-badge-icon mfa-badge-perfect">👑</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Perfect</span><span className="mfa-badge-req">Get perfect score on 5+ days</span></div>
            <div className="mfa-badge-tag mfa-tag-gold">Elite accuracy</div>
          </div>
          <div className="mfa-badge-row mfa-badge-row-champion">
            <div className="mfa-badge-icon mfa-badge-champion">🏆</div>
            <div className="mfa-badge-info"><span className="mfa-badge-name">Champion</span><span className="mfa-badge-req">Perfect score on 5+ days AND complete all 7</span></div>
            <div className="mfa-badge-tag mfa-tag-trophy">🔝 Highest Honor</div>
          </div>
        </div>
      </div>

      <div className="mfa-block">
        <h3 className="mfa-block-title">🎁 What You Earn</h3>
        <div className="mfa-rewards-grid">
          <div className="mfa-reward-card">
            <div className="mfa-reward-top">🧠</div>
            <div className="mfa-reward-name">Skill Score</div>
            <div className="mfa-reward-desc">Your score only goes up — never resets. It reflects your chess growth across every monthly challenge you participate in.</div>
          </div>
          <div className="mfa-reward-card">
            <div className="mfa-reward-top">⚡</div>
            <div className="mfa-reward-name">Platform XP</div>
            <div className="mfa-reward-desc">XP earned in Monthly Focus counts toward your global platform level and leaderboard rank.</div>
          </div>
          <div className="mfa-reward-card">
            <div className="mfa-reward-top">📊</div>
            <div className="mfa-reward-name">Leaderboard Rank</div>
            <div className="mfa-reward-desc">Top performers are showcased on the Monthly Focus leaderboard. Compete with everyone in your batch every week.</div>
          </div>
          <div className="mfa-reward-card">
            <div className="mfa-reward-top">🎖️</div>
            <div className="mfa-reward-name">Achievement Badges</div>
            <div className="mfa-reward-desc">Unlock badges shown on your profile — from Beginner to Champion. They show your dedication at a glance.</div>
          </div>
        </div>
      </div>

      <div className="mfa-block mfa-tips-block">
        <h3 className="mfa-block-title">💡 Tips to Maximize Your Score</h3>
        <div className="mfa-tips-table-wrap">
          <table className="mfa-tips-table">
            <thead>
              <tr>
                <th className="mfa-th-icon"></th>
                <th>Tip</th>
                <th>What to do</th>
                <th>Reward / Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mfa-td-icon">⏰</td>
                <td className="mfa-td-tip"><strong>Complete On Time</strong></td>
                <td>Finish the task before the window closes</td>
                <td className="mfa-td-reward mfa-reward-blue">Full XP earned</td>
              </tr>
              <tr>
                <td className="mfa-td-icon">⏱️</td>
                <td className="mfa-td-tip"><strong>Late Submission</strong></td>
                <td>Submit after the window has ended</td>
                <td className="mfa-td-reward mfa-reward-gray">Only 5 XP</td>
              </tr>
              <tr>
                <td className="mfa-td-icon">🎯</td>
                <td className="mfa-td-tip"><strong>Perfect Accuracy</strong></td>
                <td>Get every puzzle / task 100% correct</td>
                <td className="mfa-td-reward mfa-reward-gold">Bonus XP</td>
              </tr>
              <tr>
                <td className="mfa-td-icon">🔥</td>
                <td className="mfa-td-tip"><strong>Daily Streak</strong></td>
                <td>Complete tasks on consecutive days</td>
                <td className="mfa-td-reward mfa-reward-orange">×1.2 XP multiplier</td>
              </tr>
              <tr>
                <td className="mfa-td-icon">📅</td>
                <td className="mfa-td-tip"><strong>5-Day Milestone</strong></td>
                <td>Complete any 5 days in the challenge</td>
                <td className="mfa-td-reward mfa-reward-green">+75 XP + Dedicated badge</td>
              </tr>
              <tr>
                <td className="mfa-td-icon">🏆</td>
                <td className="mfa-td-tip"><strong>Champion Path</strong></td>
                <td>All 7 days completed + 5 perfect scores</td>
                <td className="mfa-td-reward mfa-reward-trophy">🏆 Champion — highest honor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function FocusCard({ focus, index, isAdmin = false }) {
  const now = new Date();
  const end = new Date(focus.endDate);
  const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  const totalDays = focus.days?.length || 0;
  const runningDays = focus.days?.filter(d => d.isRunning || d.isStarted).length || 0;
  const completedDaysArr = focus.days?.filter(d => {
    if (!d.endTime) return false;
    return new Date(d.endTime) < now && d.isStarted;
  }) || [];

  // Task type distribution
  const typeMap = {};
  (focus.days || []).forEach(d => {
    const t = d.taskType || 'puzzles';
    typeMap[t] = (typeMap[t] || 0) + 1;
  });

  const typeLabels = {
    puzzles: '🧩 Puzzles',
    find_mistakes: '🔍 Find Mistakes',
    tactics_identification: '🎯 Tactics ID',
    multiple_choice: '📝 MCQ',
    blunder_analysis: '🔬 Blunder Analysis',
  };

  return (
    <motion.div
      className={`mfl-card${isAdmin ? ' mfl-card--official' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
    >
      {/* Top accent bar */}
      <div className="mfl-card-accent" />
      {isAdmin && (
        <div className="mfl-official-badge">🏛️ ChessNexus Official</div>
      )}

      <div className="mfl-card-body">
        {/* Status pill */}
        <div className="mfl-card-status">
          <span className="mfl-status-dot" />
          <span className="mfl-status-text">Live</span>
          {daysLeft > 0 && <span className="mfl-days-left">{daysLeft}d left</span>}
        </div>

        {/* Title & theme */}
        <h2 className="mfl-card-title">{focus.title}</h2>
        {focus.theme && <p className="mfl-card-theme">{focus.theme}</p>}

        {/* Day progress bar */}
        <div className="mfl-card-progress">
          <div className="mfl-progress-row">
            <span className="mfl-prog-label">
              {totalDays} day{totalDays !== 1 ? 's' : ''}
            </span>
            {runningDays > 0 && (
              <span className="mfl-prog-running">
                🟢 {runningDays} running
              </span>
            )}
          </div>
          <div className="mfl-prog-bar-bg">
            <div
              className="mfl-prog-bar-fill"
              style={{ width: totalDays ? `${(completedDaysArr.length / totalDays) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Task types */}
        {Object.keys(typeMap).length > 0 && (
          <div className="mfl-card-types">
            {Object.entries(typeMap).map(([type, count]) => (
              <span key={type} className={`mfl-type-pill mfl-type-${type}`}>
                {typeLabels[type] || type} ×{count}
              </span>
            ))}
          </div>
        )}

        {/* Created by */}
        <div className="mfl-card-xp">
          {(() => {
            const name = focus.createdBy?.displayName || focus.createdBy?.username || '';
            const display = (!name || name.toLowerCase() === 'admin') ? 'ChessNexus' : name;
            return <span>👤 Created by <strong>{display}</strong></span>;
          })()}
        </div>
      </div>

      <div className="mfl-card-footer">
        <Link to={`/monthly-focus/${focus._id}`} className="mfl-enter-btn">
          View Challenge →
        </Link>
      </div>
    </motion.div>
  );
}
