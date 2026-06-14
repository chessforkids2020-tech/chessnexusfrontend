import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import './Training.css';

const PUZZLE_MODES = [
  {
    id: 'healthy-mix',
    image: '/images/healthymixcard.png',
    badge: 'Recommended',
    badgeStyle: 'badge-recommended',
    title: 'Healthy Mix',
    desc: 'A balanced mix of all puzzle types from Lichess.',
    tags: ['All Themes', 'All Types'],
    tagIcons: ['🧩', '📊'],
    btnLabel: 'Start Healthy Mix',
    btnClass: 'btn-purple',
    to: '/training/healthy-mix',
  },
  {
    id: 'themes',
    image: '/images/piecescard.png',
    badge: null,
    title: 'Themes',
    desc: 'Pick one theme — get puzzles only from it, near your rating.',
    tags: ['Mate in 1', 'Forks', 'Pins', '...'],
    tagIcons: [],
    btnLabel: 'Choose Theme',
    btnClass: 'btn-green',
    to: '/puzzles/themes',
  },
  {
    id: 'pieces',
    image: '/images/themecard.png',
    badge: null,
    title: 'Pieces',
    desc: 'Pick how many pieces are on the board — fewer = simpler positions.',
    tags: ['4', '8', '16', '24', '32'],
    tagIcons: [],
    btnLabel: 'Select Pieces',
    btnClass: 'btn-blue',
    to: '/puzzles/pieces',
  },
  {
    id: 'rating',
    image: '/images/ratingcard.png',
    badge: null,
    title: 'Rating',
    desc: 'Practice puzzles based on your desired rating range.',
    tags: ['< 1200', '1200–1600', '1600–2000', '2000+'],
    tagIcons: [],
    btnLabel: 'Choose Rating',
    btnClass: 'btn-orange',
    to: '/puzzles/rating',
  },
];

export default function Training() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingBands, setRatingBands] = useState([]);

  useEffect(() => {
    api.get('/api/public/puzzle-stats/last7')
      .then(res => setStats(res.data))
      .catch(() => setStats(null));

    // Prefetch rating bands in the background so the Rating popup opens instantly.
    api.get('/api/public/healthymix/rating-bands')
      .then(res => setRatingBands(res.data.bands || []))
      .catch(() => {});
  }, []);

  // Bands are already prefetched on mount; just open the popup.
  const openRatingModal = () => setShowRatingModal(true);

  const chooseBand = (band) => {
    setShowRatingModal(false);
    navigate(`/training/healthy-mix?min=${band.min}&max=${band.max}`);
  };

  const STAT_CARDS = stats ? [
    { icon: '🏆', value: stats.rating,        label: 'Puzzle Rating',  cls: 'st-gold'   },
    { icon: '🧩', value: stats.solved,        label: 'Solved',         cls: 'st-green'  },
    { icon: '❌', value: stats.failed,        label: 'Failed',         cls: 'st-red'    },
    { icon: '🎯', value: `${stats.accuracy}%`, label: 'Accuracy',       cls: 'st-blue'   },
    { icon: '🔥', value: stats.streak,        label: 'Current Streak', cls: 'st-purple' },
  ] : [];

  return (
    <div className="pz-page">

      {/* ── Header ── */}
      <div className="pz-header">
        <div className="pz-header-left">
          <h1 className="pz-title">Train with Puzzles <span className="pz-puzzle-emoji">🧩</span></h1>
          <p className="pz-subtitle">Choose a mode to practice and improve your chess.</p>
        </div>
      </div>

      {/* ── Cards Grid ── */}
      <div className="pz-grid">
        {PUZZLE_MODES.map(mode => (
          <div key={mode.id} className="pz-card">

            {/* Card image area */}
            <div className="pz-card-img-wrap">
              {mode.badge && (
                <div className={`pz-badge ${mode.badgeStyle}`}>
                  <span>⭐</span> {mode.badge}
                </div>
              )}
              <img src={mode.image} alt={mode.title} className="pz-card-img" />
            </div>

            {/* Card body */}
            <div className="pz-card-body">
              <h2 className="pz-card-title">{mode.title}</h2>
              <p className="pz-card-desc">{mode.desc}</p>

              {/* CTA Button — Rating card opens a popup; others navigate. */}
              {mode.id === 'rating' ? (
                <button
                  type="button"
                  className={`pz-btn ${mode.btnClass}`}
                  onClick={openRatingModal}
                >
                  {mode.btnLabel} <span className="pz-btn-arrow">›</span>
                </button>
              ) : (
                <Link to={mode.to} className={`pz-btn ${mode.btnClass}`}>
                  {mode.btnLabel} <span className="pz-btn-arrow">›</span>
                </Link>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* ── Your Puzzle Stats (last 7 days) ── */}
      {stats && (
        <div className="pz-stats-section">
          <div className="pz-stats-header">
            <span className="pz-stats-icon">📊</span>
            <span className="pz-stats-title">Your Puzzle Stats</span>
            <span className="pz-stats-period">Last 7 days</span>
          </div>
          <div className="pz-stats-grid">
            {STAT_CARDS.map(s => (
              <div key={s.label} className={`pz-stat-card ${s.cls}`}>
                <span className="pz-stat-icon">{s.icon}</span>
                <span className="pz-stat-value">{s.value}</span>
                <span className="pz-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rating band picker modal ── */}
      {showRatingModal && (
        <div className="pz-modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="pz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pz-modal-header">
              <div>
                <h3 className="pz-modal-title">Choose a Rating Range</h3>
                <p className="pz-modal-sub">You'll only get puzzles from the range you pick.</p>
              </div>
              <button className="pz-modal-close" onClick={() => setShowRatingModal(false)}>×</button>
            </div>

            {ratingBands.length === 0 ? (
              <div className="pz-modal-loading">Loading ranges…</div>
            ) : (
              <div className="pz-band-grid">
                {ratingBands.map(b => (
                  <button key={b.min} className="pz-band" onClick={() => chooseBand(b)}>
                    <span className="pz-band-range">{b.min}–{b.max}</span>
                    <span className="pz-band-count">{b.count.toLocaleString()} puzzles</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
