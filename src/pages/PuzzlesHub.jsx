import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './PuzzlesHub.css';

/** Pick today's daily-tip image using IST (UTC+5:30) day index */
function getDailyTipImage(images) {
  if (!images || images.length === 0) return null;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const daysSinceEpoch = Math.floor(istNow.getTime() / (24 * 60 * 60 * 1000));
  return images[daysSinceEpoch % images.length];
}

export default function PuzzlesHub() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [dailyTipImage, setDailyTipImage] = useState(null);

  // Fetch manifest and pick today's image (changes every 24 hrs IST)
  React.useEffect(() => {
    fetch('/dailytips/manifest.json')
      .then(r => r.json())
      .then(images => {
        const filename = getDailyTipImage(images);
        if (filename) setDailyTipImage(`/dailytips/${filename}`);
      })
      .catch(() => {}); // silently fall back to placeholder
  }, []);

  const rulesContent = [
    "Kids should not turn off video or mute during the contest.",
    "This contest will be held live online via Zoom. Video must cover the full view of the participant (not just the head).",
    "External assistance is strictly not allowed.",
    "Participants should not speak to anyone (friends or family) during the contest.",
    "If you cannot attend the contest at the scheduled time, please notify us in advance to reschedule."
  ];

  return (
    <div className="puzzles-hub-container">

      {/* ── ROW 1: Daily Tip (left) + Daily Puzzles hero (right) ── */}
      <div className="hub-top-row">

        {/* LEFT: Daily-tip picture card */}
        <div className="hub-picture-card">
          {dailyTipImage && (
            <img
              src={dailyTipImage}
              alt="Daily Chess Tip"
              className="hub-picture-img"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        {/* RIGHT: Puzzles hero.
            Daily Puzzles used to live here as a second, separate card, which
            meant "Puzzles" and "Daily Puzzles" looked like rival destinations
            and a user had to guess which one they wanted. Daily Puzzles is now
            the first card INSIDE Puzzles (see Training.jsx PUZZLE_MODES), so
            this hero points at the one place that holds every puzzle mode. */}
        <div className="hub-daily-hero">
          <div className="hub-daily-badge">⭐ Featured</div>
          <div className="hub-daily-icon">🧩</div>
          <div className="hub-daily-body">
            <h2 className="hub-daily-title">Puzzles</h2>
            <p className="hub-daily-desc">
              <strong>Daily Puzzles</strong> from World Champion games, plus Healthy Mix,
              Themes, Pieces and Rating — every way to train, in one place.
            </p>
            <div className="hub-daily-stats">
              <span className="hub-daily-stat">👑 From Champion Games</span>
              <span className="hub-daily-stat">🔥 New every day</span>
            </div>
          </div>
          <Link to="/training" className="hub-daily-cta">Start Solving →</Link>
        </div>

      </div>

      {/* ── ROW 2: Find the Blunder (wider) + TTT + Bingo ──
          The "Puzzles" mini-card that used to sit here has moved up into the
          hero above, so puzzles are advertised once rather than twice. Find
          the Blunder takes the wide 1.6fr slot that column reserved. */}
      <div className="hub-bottom-row">

        {/* Find the Blunder — the admin blunder library, now open to every
            player rather than only to coaches' students. */}
        <Link to="/training/find-the-blunder" className="hub-mini-card hub-mini--blunder hub-mini--wide">
          <div className="hub-mini-icon">🔎</div>
          <div className="hub-mini-body">
            <span className="hub-mini-tag">Analysis</span>
            <h3 className="hub-mini-title">Find the Blunder</h3>
            <p className="hub-mini-desc">Spot the losing move in a real game</p>
          </div>
          <span className="hub-mini-arrow">→</span>
        </Link>

        <Link to="/arcade/lobby?game=ttt" className="hub-mini-card hub-mini--ttt">
          <div className="hub-mini-icon">⚔️</div>
          <div className="hub-mini-body">
            <span className="hub-mini-tag">Strategy</span>
            <h3 className="hub-mini-title">TTT</h3>
            <p className="hub-mini-desc">Puzzle-powered Tic‑Tac‑Toe</p>
          </div>
          <span className="hub-mini-arrow">→</span>
        </Link>

        <Link to="/arcade/lobby?game=bingo" className="hub-mini-card hub-mini--bingo">
          <div className="hub-mini-icon">🎰</div>
          <div className="hub-mini-body">
            <span className="hub-mini-tag">Knowledge</span>
            <h3 className="hub-mini-title">Bingo</h3>
            <p className="hub-mini-desc">Spot tactical themes</p>
          </div>
          <span className="hub-mini-arrow">→</span>
        </Link>

      </div>

      {/* ── MONTHLY FOCUS — Full-width redesigned card ── */}
      <Link to="/monthly-focus" className="hub-focus-card">
        <div className="hub-focus-left-glow" />

        <div className="hub-focus-icon-wrap">
          <span className="hub-focus-big-icon">🎯</span>
          <span className="hub-focus-active-badge">Active Now</span>
        </div>

        <div className="hub-focus-info">
          <p className="hub-focus-eyebrow">Monthly Challenge</p>
          <h3 className="hub-focus-title">Monthly Focus Challenge</h3>
          <p className="hub-focus-desc">7-day tactical training program • Earn XP & unlock achievements</p>
          <div className="hub-focus-meta">
            <div className="hub-focus-progress-wrap">
              <div className="hub-focus-progress-labels">
                <span>Progress</span>
                <span>0 / 7 days</span>
              </div>
              <div className="hub-focus-bar">
                <div className="hub-focus-bar-fill" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="hub-focus-right">
          <div className="hub-focus-xp-badge">
            <span className="hub-focus-xp-number">+350</span>
            <span className="hub-focus-xp-label">XP Available</span>
          </div>
          <div className="hub-focus-cta">Start Challenge →</div>
        </div>
      </Link>

      {/* ── ACTION BAR ── */}
      <div className="action-bar">
        <Link to="/scoreboard" className="action-button scoreboard-btn">
          <span className="btn-icon">🏅</span>
          <span className="btn-text">Scoreboard</span>
        </Link>
        <Link to="/contest-rules" className="action-button contest-btn">
          <span className="btn-icon">🎯</span>
          <span className="btn-text">Contest 2025</span>
        </Link>
        <button className="action-button rules-btn" onClick={() => setShowRulesModal(true)}>
          <span className="btn-icon">📜</span>
          <span className="btn-text">Quick Rules</span>
        </button>
      </div>

      {/* ── RULES MODAL ── */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📜 Contest Rules</h2>
              <button className="modal-close" onClick={() => setShowRulesModal(false)} aria-label="Close modal">✕</button>
            </div>
            <div className="modal-body">
              <ul className="rules-list">
                {rulesContent.map((rule, index) => (
                  <li key={index} className="rule-item">
                    <span className="rule-number">{index + 1}</span>
                    <span className="rule-text">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="modal-action-btn" onClick={() => setShowRulesModal(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}