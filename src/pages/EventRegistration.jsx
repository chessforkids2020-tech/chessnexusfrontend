import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './EventRegistration.css';

export default function EventRegistration() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    lichessUsername: '',
    country: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const eventDetails = {
    'monthly-focus-may-2026': {
      title: '🏆 May Mastery Challenge — Monthly Focus 2026',
      date: 'May 4–10, 2026 · 7 Days · Starts Sunday, May 4th',
      description:
        'The May Mastery Challenge is a 7-day intensive chess training event built around the 5 core skill stages of the Monthly Focus system. Each day unlocks a new challenge type — from solving tactical puzzles to analyzing your own games for blunders. Earn XP, climb the leaderboard, and prove your mastery. Open to all skill levels.',
      tasks: [
        { num: 1, label: '🧩 Day 1 — Tactical Puzzles · Sharpen your pattern recognition & calculation (May 4)' },
        { num: 2, label: '🔍 Day 2 — Tactics Identification · Name the tactic: Fork, Pin, Skewer & more (May 5)' },
        { num: 3, label: '🚨 Day 3 — Blunder Hunt · Find the mistakes hidden in a real game (May 6)' },
        { num: 4, label: '🧠 Day 4 — Theory Quiz · Multiple-choice chess knowledge challenge (May 7)' },
        { num: 5, label: '📋 Day 5 — PGN Analysis · Analyze your own game for blunders (May 8)' },
        { num: 6, label: '⚡ Day 6 — Advanced Puzzles · Harder tactics with tighter time limits (May 9)' },
        { num: 7, label: '🔥 Day 7 — Grand Finale · Mixed blunder hunt — the ultimate final challenge (May 10)' },
      ],
      howItWorks: [
        'Log in each day (May 4–10) and complete that day\'s unique training challenge',
        'Each day covers a different skill stage: Puzzles → Tactics ID → Blunder Hunt → Quiz → PGN Analysis → Advanced Puzzles → Grand Finale',
        'Submit on time for full XP — late submissions earn only 5 XP',
        'Achieve 100% accuracy to claim a +150 bonus XP perfect reward',
        'Build a daily streak to earn a ×1.2 XP multiplier',
        'Complete 5 of 7 days to unlock the 5-Day Milestone (+75 XP bonus)',
        'Finish all 7 days with 5 perfect scores to earn the 🏆 Champion Badge',
      ],
      awards: [
        { icon: '🏆', title: 'May Mastery Champion', desc: 'Complete all 7 days with 5+ perfect scores' },
        { icon: '👑', title: 'Perfect Crown', desc: 'Achieve 100% accuracy on any 5 days' },
        { icon: '🔥', title: 'Dedicated Badge', desc: 'Complete 5 or more days of the challenge' },
        { icon: '⭐', title: 'Active Learner', desc: 'Complete at least 3 days' },
        { icon: '🌱', title: 'First Step Badge', desc: 'Complete your very first day task' },
        { icon: '🎁', title: 'XP Rewards', desc: 'Earn 5–150+ XP per task based on accuracy, timing & streaks' },
      ],
      motivation:
        'Chess mastery isn\'t built in a single game — it\'s built day by day, puzzle by puzzle.\n\nThe May Mastery Challenge gives you 7 days of focused, structured training across every skill dimension: tactics, recognition, analysis, theory, and blunder awareness. Each day is a new test. Each day is a chance to improve.\n\n"The more I practice, the luckier I get." — Gary Player\n\nShow up every day. Complete every challenge. Claim your Mastery.',
    },
    'monthly-focus-april-2026': {
      title: '🎯 Monthly Focus Challenge — April 2026',
      date: 'April 17–23, 2026 (7 Days · Starts Friday)',
      description:
        'Join the April Monthly Focus Challenge! Complete daily chess training tasks covering Tactics, Endgame, Openings, and Strategy. Earn XP, unlock achievement badges, and compete on the leaderboard. The challenge runs for 7 days starting Friday, April 17th — open to all skill levels.',
      tasks: [
        { num: 1, label: '♟️ Tactical Puzzles — Sharpen your calculation & vision' },
        { num: 2, label: '♜ Endgame Mastery — King & Pawn fundamentals' },
        { num: 3, label: '♝ Opening Theory — Build a reliable repertoire' },
        { num: 4, label: '♞ Pattern Recognition — Forks, pins, skewers & more' },
        { num: 5, label: '♛ Strategy & Positional Play — Think like a Grandmaster' },
      ],
      howItWorks: [
        'Log in every day and complete your daily training task',
        'Submit on time for full XP — late submissions earn only 5 XP',
        'Score 100% accuracy to claim a +150 bonus XP perfect reward',
        'Build a daily streak to earn a ×1.2 XP multiplier',
        'Complete 5 days in a row to unlock the 5-Day Milestone (+75 XP)',
        'Compete on the leaderboard and earn achievement badges',
      ],
      awards: [
        { icon: '🏆', title: 'Champion Badge', desc: 'Complete all 7 days with 5+ perfect scores' },
        { icon: '👑', title: 'Perfect Crown', desc: 'Achieve 100% accuracy on any 5 days' },
        { icon: '🔥', title: 'Dedicated Badge', desc: 'Complete 5 or more days in the challenge' },
        { icon: '⭐', title: 'Active Badge', desc: 'Complete at least 3 days' },
        { icon: '🌱', title: 'Beginner Badge', desc: 'Complete your very first day' },
        { icon: '🎁', title: 'XP Rewards', desc: 'Earn 5–150+ XP per task based on performance & timing' },
      ],
      motivation:
        'Every great chess player was once a beginner who chose to show up every day.\n\nThis April, commit to one week of focused chess training. Whether you\'re new to the game or a seasoned competitor, the Monthly Focus Challenge is your chance to level up — one day at a time.\n\n"The secret to getting ahead is getting started." — Mark Twain',
    },
  };

  const event = eventDetails[eventId];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.country.trim()) {
      setError('Please enter your country');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/public/event-submissions', {
        eventId,
        eventName: event.title,
        name: formData.name.trim(),
        lichessUsername: formData.lichessUsername.trim(),
        country: formData.country.trim()
      });

      const isMay = eventId === 'monthly-focus-may-2026';
      alert(
        `🎉 Registration Successful!\n\n` +
        `✅ You're registered for the ${isMay ? 'May Mastery Challenge' : 'Monthly Focus Challenge'}!\n\n` +
        `⚠️ Make sure you have a ChessNexus account to participate.\n\n` +
        `${isMay ? 'The challenge runs May 4–10, 2026.' : 'Log in daily to complete your training tasks.'} Earn XP & compete on the leaderboard!\n\n` +
        `We look forward to seeing you compete! 🏆`
      );
      navigate('/monthly-focus');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="event-registration-container">
        <div className="event-not-found">
          <h2>Event not found</h2>
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-registration-container">
      <div className="event-registration-card">
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Home
        </button>

        <div className="event-header">
          <div className="event-icon">🎯</div>
          <h1 className="event-title">{event.title}</h1>
          <div className="event-date">📅 {event.date}</div>
        </div>

        <div className="event-description">
          <p>{event.description}</p>
        </div>

        {/* Training Tasks */}
        {event.tasks && (
          <div className="event-features" style={{ marginBottom: '20px' }}>
            <h3>🧩 This Month's 5 Training Tasks:</h3>
            <ol style={{ paddingLeft: '22px', margin: '10px 0 0 0' }}>
              {event.tasks.map((t) => (
                <li key={t.num} style={{ padding: '5px 0', fontWeight: '500' }}>{t.label}</li>
              ))}
            </ol>
          </div>
        )}

        {/* How it works */}
        {event.howItWorks && (
          <div className="event-features" style={{ marginBottom: '20px' }}>
            <h3>📋 How It Works:</h3>
            <ul style={{ paddingLeft: '20px', margin: '10px 0 0 0' }}>
              {event.howItWorks.map((item, idx) => (
                <li key={idx} style={{ padding: '4px 0' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Awards */}
        {event.awards && (
          <div className="event-features" style={{ marginBottom: '20px' }}>
            <h3>🏅 Monthly Focus Challenge Awards:</h3>
            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              {event.awards.map((award) => (
                <div key={award.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{award.icon}</span>
                  <div>
                    <strong style={{ color: '#4f46e5' }}>{award.title}</strong>
                    <span style={{ color: '#555', fontSize: '14px' }}> — {award.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivation */}
        {event.motivation && (
          <div className="event-features" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '18px' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>💬 A Message for Every Participant:</h3>
            {event.motivation.split('\n\n').map((para, idx) => (
              <p key={idx} style={{ margin: '8px 0', lineHeight: '1.7', fontSize: '15px', whiteSpace: 'pre-line', color: '#ffffff' }}>{para}</p>
            ))}
          </div>
        )}

        {/* Legacy features fallback */}
        {!event.tasks && event.features && (
          <div className="event-features">
            <h3>What's Included:</h3>
            <ul>
              {event.features.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <h2 className="form-title">Register Now</h2>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country *</label>
            <input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="e.g. India, USA, UK…"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lichessUsername">
              Lichess Username <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.82rem' }}>(optional, but recommended)</span>
            </label>
            <input
              id="lichessUsername"
              type="text"
              value={formData.lichessUsername}
              onChange={(e) => setFormData({ ...formData, lichessUsername: e.target.value })}
              placeholder="Your Lichess username (e.g. MagnusCarlsen)"
              disabled={submitting}
            />
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : '🚀 Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
