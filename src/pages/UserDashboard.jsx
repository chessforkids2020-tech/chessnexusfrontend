// src/pages/UserDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import ReactConfetti from 'react-confetti';
import api, { resolveApiAssetUrl } from '../api';
import { trackEvent } from '../lib/analytics';
import { Link, useNavigate, useParams } from "react-router-dom";
import './UserDashboard.css';
import PerformanceMonitor from "../components/PerformanceMonitor";
import DetailedRaceStatsModal from "../components/DetailedRaceStatsModal";
import ActivityTracker from "../components/ActivityTracker";
import BestRacers from "../components/BestRacers";
import FriendGamesSection from "../components/FriendGamesSection";
import GameInsightsPanel from "../components/GameInsightsPanel";
import CoffeeBadge from "../components/CoffeeBadge";
import UserAvatar from "../components/UserAvatar";
import CoffeeCta from "../components/CoffeeCta";

// ─── Badge Tracks: Starter → Gold → Platinum ────────────────────────────────
const TRACKS = [
  {
    id: 'puzzles', icon: '🧩', name: 'Daily Puzzles',
    badges: [
      { id: 'puzzle_starter', tier: 'starter', emoji: '🧩', name: 'First Move',      threshold: 'Solve 1 puzzle' },
      { id: 'puzzle_gold',    tier: 'gold',    emoji: '🥇', name: 'Puzzle Pro',       threshold: '25 puzzles (~5 days)' },
      { id: 'puzzle_plat',    tier: 'plat',    emoji: '💎', name: 'Puzzle Legend',    threshold: '300 puzzles (~2 months)' },
    ],
  },
  {
    id: 'rating', icon: '⭐', name: 'Competition',
    badges: [
      { id: 'rating_starter', tier: 'starter', emoji: '⭐', name: 'Rising',           threshold: 'Reach 1250 points' },
      { id: 'rating_gold',    tier: 'gold',    emoji: '🥇', name: 'Sharp Mind',       threshold: 'Reach 1350 points' },
      { id: 'rating_plat',    tier: 'plat',    emoji: '💎', name: 'Chess King',       threshold: 'Reach 1700 points' },
    ],
  },
  {
    id: 'race', icon: '🏎️', name: 'Speed Race',
    badges: [
      { id: 'race_starter',   tier: 'starter', emoji: '🏁', name: 'Racer',            threshold: 'Play any race' },
      { id: 'race_gold',      tier: 'gold',    emoji: '🥇', name: 'Speed Demon',      threshold: 'Score 200+ in Individual Race' },
      { id: 'race_plat',      tier: 'plat',    emoji: '💎', name: 'Arena Champion',   threshold: 'Score 400+ in Arena Race' },
    ],
  },
  {
    id: 'streak', icon: '🔥', name: 'Streak',
    badges: [
      { id: 'streak_starter', tier: 'starter', emoji: '🔥', name: 'On Fire',       threshold: '2 perfect days in a row' },
      { id: 'streak_gold',    tier: 'gold',    emoji: '🥇', name: 'Grinder',       threshold: '4 perfect days in a row' },
      { id: 'streak_plat',    tier: 'plat',    emoji: '💎', name: 'Iron Will',     threshold: '7 perfect days in a row' },
    ],
  },
  {
    id: 'focus', icon: '🎯', name: 'Monthly Focus',
    badges: [
      { id: 'focus_starter',  tier: 'starter', emoji: '🎯', name: 'Focused',      threshold: 'Complete 5 Focus days' },
      { id: 'focus_gold',     tier: 'gold',    emoji: '🥇', name: 'Consistent',   threshold: 'Complete 2 full Focus months (no absence)' },
      { id: 'focus_plat',     tier: 'plat',    emoji: '💎', name: 'Dedicated',    threshold: 'Complete 4 full Focus months (no absence)' },
    ],
  },
  {
    id: 'tournament', icon: '🏆', name: 'Tournament',
    badges: [
      { id: 'tournament_starter', tier: 'starter', emoji: '🏅', name: 'Competitor',  threshold: '3 games without losing' },
      { id: 'tournament_gold',    tier: 'gold',    emoji: '🥇', name: 'Veteran',      threshold: '6 games without losing' },
      { id: 'tournament_plat',    tier: 'plat',    emoji: '💎', name: 'Champion',     threshold: '10 games without losing' },
    ],
  },
];

// ─── Badge Unlock Popup (confetti + congrats card) ─────────────────────────
function BadgeUnlockPopup({ badgeInfo, onClose, remaining }) {
  const [winSize, setWinSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });
  // recycle=true → keep generating pieces; recycle=false → let existing pieces fall off naturally (no freeze)
  const [recycle, setRecycle] = React.useState(true);

  React.useEffect(() => {
    const handleResize = () => setWinSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    // After 4s stop spawning new pieces — existing ones will drift off screen smoothly
    const timer = setTimeout(() => setRecycle(false), 4000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const tierLabel = badgeInfo.tier === 'plat' ? '💎 Platinum' : badgeInfo.tier === 'gold' ? '🥇 Gold' : '⭐ Starter';
  const tierClass = badgeInfo.tier === 'plat' ? 'popup-tier-plat' : badgeInfo.tier === 'gold' ? 'popup-tier-gold' : 'popup-tier-starter';

  return (
    <div className="badge-popup-overlay" onClick={onClose}>
      <ReactConfetti
        width={winSize.width}
        height={winSize.height}
        run={true}
        recycle={recycle}
        numberOfPieces={200}
        gravity={0.25}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
      />
      <div className="badge-popup-card" onClick={e => e.stopPropagation()}>
        <div className="badge-popup-sparkle">✨</div>
        <div className="badge-popup-congrats">Congratulations!</div>
        <div className="badge-popup-headline">You unlocked a new badge!</div>
        <div className="badge-popup-emoji">{badgeInfo.emoji}</div>
        <div className="badge-popup-name">{badgeInfo.name}</div>
        <div className={`badge-popup-tier ${tierClass}`}>{tierLabel}</div>
        <div className="badge-popup-threshold">{badgeInfo.threshold}</div>
        {remaining > 0 && (
          <div className="badge-popup-more">+{remaining} more badge{remaining > 1 ? 's' : ''} unlocked!</div>
        )}
        <button className="badge-popup-btn" onClick={onClose}>
          {remaining > 0 ? 'Next →' : 'Awesome! 🎉'}
        </button>
      </div>
    </div>
  );
}

// Public "Coach" badge — shown for verified coaches next to the joined date.
// Gold/teal so it reads distinctly from the purple "enrolled-with-a-coach" chip.
function CoachBadge() {
  return (
    <span
      title="Verified coach on Chess Nexus"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 11px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#e5e7eb',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ fontSize: '12px' }}>🎓</span>
      Coach
      <span
        aria-hidden
        title="Verified"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '13px',
          height: '13px',
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.9)',
          color: '#04110d',
          fontSize: '9px',
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        ✓
      </span>
    </span>
  );
}

function BadgeWall({ badges, userId, isPublicView = false }) {
  const [showAll, setShowAll] = React.useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = React.useState([]);
  const [popupIndex, setPopupIndex] = React.useState(0);

  React.useEffect(() => {
    // Only the logged-in owner of the dashboard sees congratulations popups.
    if (isPublicView) return;
    if (!badges || badges.length === 0 || !userId) return;
    const storageKey = `seenBadges_v1_${userId}`;
    const seen = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const fresh = badges.filter(id => !seen.has(id));
    localStorage.setItem(storageKey, JSON.stringify(badges));
    if (fresh.length > 0) {
      setNewlyUnlocked([...fresh].reverse());
      setPopupIndex(0);
    }
  }, [badges, userId, isPublicView]);

  const handlePopupClose = () => {
    if (popupIndex < newlyUnlocked.length - 1) {
      setPopupIndex(i => i + 1);
    } else {
      setNewlyUnlocked([]);
      setPopupIndex(0);
    }
  };

  const earnedSet = new Set(badges);
  const totalEarned = TRACKS.reduce((n, t) => n + t.badges.filter(b => earnedSet.has(b.id)).length, 0);
  const totalBadges = TRACKS.reduce((n, t) => n + t.badges.length, 0);

  const allFlat = TRACKS.flatMap(t => t.badges);
  const earnedFlat = allFlat.filter(b => earnedSet.has(b.id));
  const lockedFlat = allFlat.filter(b => !earnedSet.has(b.id));
  const previewBadges = earnedFlat.length >= 6
    ? earnedFlat.slice(0, 6)
    : [...earnedFlat, ...lockedFlat.slice(0, 6 - earnedFlat.length)];

  const allBadges = TRACKS.flatMap(t => t.badges);
  const currentPopupBadge = newlyUnlocked.length > 0
    ? allBadges.find(b => b.id === newlyUnlocked[popupIndex])
    : null;

  return (
    <>
      {currentPopupBadge && (
        <BadgeUnlockPopup
          badgeInfo={currentPopupBadge}
          onClose={handlePopupClose}
          remaining={newlyUnlocked.length - popupIndex - 1}
        />
      )}

      <div className="badge-wall-section">
        <div className="badge-wall-header">
          <h2 className="badge-wall-title">🏅 My Achievements</h2>
          <div className="badge-wall-header-actions">
            <span className="badge-wall-footer-count">{totalEarned}/{totalBadges}</span>
            <button className="badge-wall-toggle" onClick={() => setShowAll(s => !s)}>
              {showAll ? 'Show Less' : 'Show All'}
            </button>
          </div>
        </div>

        {showAll ? (
          <div className="badge-tracks">
            {TRACKS.map(track => (
              <div key={track.id} className="badge-track">
                <div className="badge-track-label">
                  <span className="badge-track-icon">{track.icon}</span>
                  <span className="badge-track-name">{track.name}</span>
                </div>
                <div className="badge-track-steps">
                  {track.badges.map((badge, i) => {
                    const earned = earnedSet.has(badge.id);
                    const prevEarned = i === 0 || earnedSet.has(track.badges[i - 1].id);
                    const isNext = !earned && prevEarned;
                    return (
                      <React.Fragment key={badge.id}>
                        {i > 0 && (
                          <div className={`badge-connector${earnedSet.has(track.badges[i - 1].id) ? ' connector-filled' : ''}`} />
                        )}
                        <div className={`badge-step badge-step-${badge.tier}${earned ? ' badge-step-earned' : ''}${isNext ? ' badge-step-next' : ''}`}>
                          <div className="badge-step-emoji">{badge.emoji}</div>
                          <div className="badge-step-name">{badge.name}</div>
                          <div className="badge-step-status">
                            {earned
                              ? (badge.tier === 'plat' ? '💎 Platinum' : badge.tier === 'gold' ? '🥇 Gold' : '✓ Done')
                              : (isNext ? `→ ${badge.threshold}` : badge.threshold)
                            }
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="badge-wall-preview">
            {previewBadges.map(badge => {
              const earned = earnedSet.has(badge.id);
              return (
                <div key={badge.id} className={`badge-preview-item${earned ? ' badge-preview-earned' : ' badge-preview-locked'}`}>
                  <div className="badge-preview-emoji">{badge.emoji}</div>
                  <div className="badge-preview-name">{badge.name}</div>
                  <div className="badge-preview-status">{earned ? '✓' : '🔒'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── My Coach Card ──────────────────────────────────────────────────────────
// Shows a link to the student's coach portal when they are linked to a coach
// who has enrolled them in the coach attendance system.
function MyCoachCard() {
  const [coaches, setCoaches] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    api.get('/api/coach-attendance/my/coaches')
      .then(r => { if (alive) setCoaches(r.data || []); })
      .catch(() => { if (alive) setCoaches([]); });
    return () => { alive = false; };
  }, []);

  if (!coaches || coaches.length === 0) return null;

  const coachNames = coaches.map(c => c.coachName).join(', ');

  return (
    <div className="attendance-section">
      <div className="racing-mode-card attendance-card">
        <div className="racing-mode-icon">🎓</div>
        <h3 className="racing-mode-title">My Coach</h3>
        <p className="racing-mode-description">
          {coaches.length === 1 ? `Coached by ${coachNames}. ` : `Coaches: ${coachNames}. `}
          View attendance &amp; payments your coach has recorded.
        </p>
        <Link to="/my-coach" style={{ textDecoration: 'none' }}>
          <button className="watch-games-btn">View Coach Records</button>
        </Link>
      </div>
    </div>
  );
}

// ─── Watch My Games Card ────────────────────────────────────────────────────
function WatchGamesCard({ displayName }) {
  const [gamesInfo, setGamesInfo] = React.useState(null);
  React.useEffect(() => {
    if (!displayName) return;
    setGamesInfo(null); // reset whenever we switch to a different player
    const API_URL = import.meta.env.VITE_API_URL || '';
    fetch(`${API_URL}/api/public/player-games/${encodeURIComponent(displayName)}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.message) {
          setGamesInfo({ totalCount: data.totalCount || 0, lastPlayedAt: data.lastPlayedAt });
        }
      })
      .catch(() => {});
  }, [displayName]);

  if (!gamesInfo || gamesInfo.totalCount === 0) return null;

  const lastPlayed = gamesInfo.lastPlayedAt
    ? new Date(gamesInfo.lastPlayedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="watch-games-section">
      <div className="watch-games-card">
        <div className="watch-games-icon">♟</div>
        <div className="watch-games-info">
          <h3 className="watch-games-title">Watch My Games</h3>
          <div className="watch-games-stats">
            <span className="watch-games-count">{gamesInfo.totalCount} games saved</span>
            {lastPlayed && (
              <span className="watch-games-last">Last played: {lastPlayed}</span>
            )}
          </div>
        </div>
        <Link to={`/player/${encodeURIComponent(displayName)}/games`} style={{ textDecoration: 'none' }}>
          <button className="watch-games-btn">▶ Watch</button>
        </Link>
      </div>
    </div>
  );
}

// ─── XP Wallet ───────────────────────────────────────────────────────────────
// Standalone XP wallet block: total XP + "how to earn" popup.
// Rendered in the right-hand panel below Highest Race Points.
function XpWallet({ wallet }) {
  const total = wallet?.total || 0;
  const [showHelp, setShowHelp] = React.useState(false);

  const helpRows = [
    { icon: '🧩', text: 'Every puzzle (daily, healthy mix, theme, rating, pieces)', xp: '+2 XP' },
    { icon: '🎮', text: 'Every game (Tic-Tac-Toe, Bingo)', xp: '+2 XP' },
    { icon: '🏁', text: 'Every race in the Race Hub (5–30 min races)', xp: '+5 XP' },
    { icon: '🔍', text: 'Every game analysis you run', xp: '+3 XP' },
    { icon: '⚔️', text: 'Every Arena Tournament game you play', xp: '+3 XP' },
    { icon: '🤝', text: 'Inviting a friend who joins', xp: '+10 XP' },
    { icon: '💜', text: 'Accepting a friend (both of you earn it)', xp: '+2 XP' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18,
      padding: '24px 24px', borderRadius: 16,
      background: 'rgba(6,182,212,0.06)',
      border: '1px solid rgba(6,182,212,0.22)',
    }}>
      <span style={{ fontSize: 42, lineHeight: 1, flexShrink: 0 }}>👛</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--obsidian-accent, #06b6d4)' }}>
            XP Wallet
          </span>
          <button
            type="button"
            aria-label="How do I earn XP?"
            onClick={() => setShowHelp(v => !v)}
            style={{
              width: 20, height: 20, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', cursor: 'pointer',
              background: showHelp ? 'var(--obsidian-accent, #06b6d4)' : 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.3)',
              color: showHelp ? '#06121a' : '#67e8f9',
              fontSize: 12, fontWeight: 800, padding: 0,
            }}
          >?</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: 'var(--obsidian-text, #f8fafc)' }}>
            {total.toLocaleString()}
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))' }}>XP</span>
        </div>
      </div>

      {/* How-to-earn popup */}
      {showHelp && ReactDOM.createPortal(
        <div
          onClick={() => setShowHelp(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}
        >
          <div
            role="dialog"
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(380px, calc(100vw - 32px))',
              background: 'var(--obsidian-surface, rgba(23,23,23,0.95))',
              WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(6,182,212,0.3)', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--obsidian-accent, #06b6d4)' }}>How you earn XP</span>
              <button type="button" onClick={() => setShowHelp(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {helpRows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{r.icon}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))', lineHeight: 1.4 }}>{r.text}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#67e8f9', flexShrink: 0 }}>{r.xp}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.16)', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              XP is separate from Monthly Focus XP — it tracks how active you are across the app.
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Game Ratings card ───────────────────────────────────────────────────────
// ─── Stats Bar ───────────────────────────────────────────────────────────────
// One horizontal card right below the welcome card.
// 4 sections: bullet / blitz / rapid / classical Elo ratings.
// Last (5th) slot: reserved for chess960 — added later.
function StatsBar({ ratings }) {
  const [ratingDeltas, setRatingDeltas] = React.useState({});

  React.useEffect(() => {
    api.get('/api/user/rating-changes')
      .then(res => setRatingDeltas(res.data || {}))
      .catch(() => {});
  }, []);

  const ratingCats = [
    { key: 'bullet',    label: 'Bullet',    icon: '⚡', color: '#f59e0b' },
    { key: 'blitz',     label: 'Blitz',     icon: '🔥', color: '#ef4444' },
    { key: 'rapid',     label: 'Rapid',     icon: '🐇', color: '#22c55e' },
    { key: 'classical', label: 'Classical', icon: '🐢', color: '#818cf8' },
  ];

  const divider = (
    <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--obsidian-border, rgba(148,163,184,0.16))', flexShrink: 0 }} />
  );

  return (
    <div style={{
      position: 'relative',
      margin: '14px 0 6px',
      background: 'var(--obsidian-surface, rgba(23,23,23,0.7))',
      WebkitBackdropFilter: 'blur(20px)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--obsidian-border, rgba(148,163,184,0.16))',
      borderRadius: 18,
      boxShadow: 'var(--obsidian-shadow, 0 8px 32px rgba(0,0,0,0.5))',
      display: 'flex',
      alignItems: 'stretch',
      overflow: 'hidden',
      minHeight: 90,
    }}>
      {/* Sections 1–4: rating cells */}
      {ratingCats.map((c, i) => (
        <React.Fragment key={c.key}>
          {(() => {
            const delta = ratingDeltas[c.key];
            const hasDelta = delta != null && delta !== 0;
            const isUp = delta > 0;
            return (
              <div style={{
                flex: '1 1 0', minWidth: 0,
                padding: '14px 12px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: '#f1f5f9' }}>
                    {ratings?.[c.key] ?? 1200}
                  </span>
                  {hasDelta && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: isUp ? '#22c55e' : '#ef4444', lineHeight: 1 }}>
                      {isUp ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {c.label}
                </span>
              </div>
            );
          })()}
          {i < ratingCats.length - 1 && divider}
        </React.Fragment>
      ))}

    </div>
  );
}

// ─── Today Strip ────────────────────────────────────────────────────────────
// Slim "come back tomorrow" band under the hero: streak + today's open tasks.
// Reuses endpoints the dashboard children already call — no new backend.
function TodayStrip() {
  const [streak, setStreak] = React.useState(null);     // current streak (days)
  const [minsToday, setMinsToday] = React.useState(null); // minutes practiced today
  const [puzzleDone, setPuzzleDone] = React.useState(null); // { done, count }
  const [focus, setFocus] = React.useState(null);       // { dayNumber, done } | { completed, label }
  const [isStudent, setIsStudent] = React.useState(false); // accepted a coach request

  React.useEffect(() => {
    let alive = true;

    // Is this user an accepted student of any coach? Gates the "My Coach" chip.
    api.get('/api/coach/my-coaches')
      .then(res => { if (alive) setIsStudent(!!res.data?.isStudent); })
      .catch(() => {});

    // Streak + minutes today
    api.get('/api/user/activity-history')
      .then(res => {
        if (!alive) return;
        const stats = res.data?.stats || {};
        setStreak(stats.currentStreak || 0);
        const todayKey = new Date().toISOString().slice(0, 10);
        const daily = res.data?.dailyMinutes || {};
        setMinsToday(Math.round(daily[todayKey] || 0));
      })
      .catch(() => {});

    // Daily puzzle progress (done at 5)
    api.get('/api/public/training/state')
      .then(res => {
        if (!alive) return;
        const d = res.data || {};
        const count = (d.correct || 0) + (d.wrong || 0);
        setPuzzleDone({ done: count >= 5, count });
      })
      .catch(() => {});

    // Monthly Focus — current running day + whether the user finished it
    api.get('/api/public/monthly-focus/current')
      .then(async res => {
        if (!alive) return;
        const f = res.data?.focus;
        if (!f?._id) { setFocus(null); return; }
        try {
          const pr = await api.get(`/api/public/monthly-focus/my-progress?focusId=${f._id}`);
          const progress = pr.data?.progress || pr.data || {};
          const completedDays = progress.completedDays
            ?? (Array.isArray(progress.days) ? progress.days.filter(d => d.completed).length : 0);
          const runningDay = res.data?.currentDay?.dayNumber || res.data?.runningDay || null;
          const doneToday = runningDay
            ? (Array.isArray(progress.days) ? progress.days.some(d => d.dayNumber === runningDay && d.completed) : false)
            : false;
          if (alive) setFocus(runningDay ? { dayNumber: runningDay, done: doneToday } : { completed: completedDays });
        } catch {
          if (alive) setFocus({ active: true });
        }
      })
      .catch(() => {});

    return () => { alive = false; };
  }, []);

  // Don't render an empty bar before anything loads
  if (streak === null && puzzleDone === null && focus === null && minsToday === null) return null;

  const chips = [];

  if (streak !== null) {
    chips.push(
      <div key="streak" className={`today-chip ${streak > 0 ? 'today-chip--done' : ''}`}>
        <span className="today-chip-emoji">🔥</span>
        <span className="today-chip-text">
          <strong>{streak}</strong>-day streak{streak > 0 ? '' : ' — start one!'}
        </span>
      </div>
    );
  }

  if (puzzleDone !== null) {
    chips.push(
      <Link key="puzzle" to="/puzzles" className={`today-chip ${puzzleDone.done ? 'today-chip--done' : 'today-chip--todo'}`}>
        <span className="today-chip-emoji">🧩</span>
        <span className="today-chip-text">
          {puzzleDone.done ? 'Daily puzzles ✓' : `Daily puzzles ${puzzleDone.count}/5`}
        </span>
        {!puzzleDone.done && <span className="today-chip-go">→</span>}
      </Link>
    );
  }

  if (focus) {
    let label, done = false;
    if (focus.dayNumber) { label = `Focus Day ${focus.dayNumber}`; done = focus.done; }
    else if (typeof focus.completed === 'number') { label = `Focus: ${focus.completed}/7 days`; done = focus.completed >= 7; }
    else { label = 'Monthly Focus'; }
    chips.push(
      <Link key="focus" to="/monthly-focus" className={`today-chip ${done ? 'today-chip--done' : 'today-chip--todo'}`}>
        <span className="today-chip-emoji">♟</span>
        <span className="today-chip-text">{label}{done ? ' ✓' : ''}</span>
        {!done && <span className="today-chip-go">→</span>}
      </Link>
    );
  }

  // Arena Tournaments — quick link to the arena tournament dashboard
  chips.push(
    <Link key="arena" to="/arenatournament" className="today-chip today-chip--todo">
      <span className="today-chip-emoji">🏆</span>
      <span className="today-chip-text">Arena Tournaments</span>
      <span className="today-chip-go">→</span>
    </Link>
  );

  // My Coach — only for users who have accepted a coach request (are a student).
  if (isStudent) {
    chips.push(
      <Link key="mycoach" to="/my-coach" className="today-chip today-chip--todo">
        <span className="today-chip-emoji">🎓</span>
        <span className="today-chip-text">My Coach</span>
        <span className="today-chip-go">→</span>
      </Link>
    );
  }

  if (chips.length === 0) return null;
  return <div className="today-strip">{chips}</div>;
}

// ─── Dashboard Tabs ─────────────────────────────────────────────────────────
function DashboardTabs({ activeTab, onChange }) {
  const tabs = [
    { id: 'nexusguide',   icon: '🧭', label: 'Nexus Guide' },
    { id: 'friendgames',  icon: '🎮', label: 'Games with Friends' },
    { id: 'achievements', icon: '🏅', label: 'My Achievements' },
    { id: 'mycoach',      icon: '👨‍🏫', label: 'My Coach' },
  ];
  return (
    <div className="dash-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          className={`dash-tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="dash-tab-icon">{t.icon}</span>
          <span className="dash-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// Convert country name → 2-letter ISO code (case-insensitive)
function getCountryCode(country) {
  if (!country) return '';
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const nameToCode = {
    'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Angola':'AO','Argentina':'AR',
    'Armenia':'AM','Australia':'AU','Austria':'AT','Azerbaijan':'AZ','Bahrain':'BH',
    'Bangladesh':'BD','Belarus':'BY','Belgium':'BE','Bolivia':'BO','Brazil':'BR',
    'Bulgaria':'BG','Cambodia':'KH','Canada':'CA','Chile':'CL','China':'CN',
    'Colombia':'CO','Croatia':'HR','Cuba':'CU','Czechia':'CZ','Czech Republic':'CZ',
    'Denmark':'DK','Ecuador':'EC','Egypt':'EG','England':'GB','Ethiopia':'ET',
    'Finland':'FI','France':'FR','Georgia':'GE','Germany':'DE','Ghana':'GH',
    'Greece':'GR','Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID',
    'Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL','Italy':'IT',
    'Jamaica':'JM','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ','Kenya':'KE',
    'Kuwait':'KW','Kyrgyzstan':'KG','Latvia':'LV','Lebanon':'LB','Lithuania':'LT',
    'Malaysia':'MY','Mexico':'MX','Moldova':'MD','Mongolia':'MN','Morocco':'MA',
    'Myanmar':'MM','Nepal':'NP','Netherlands':'NL','New Zealand':'NZ','Nigeria':'NG',
    'Norway':'NO','Pakistan':'PK','Paraguay':'PY','Peru':'PE','Philippines':'PH',
    'Poland':'PL','Portugal':'PT','Qatar':'QA','Romania':'RO','Russia':'RU',
    'Saudi Arabia':'SA','Senegal':'SN','Serbia':'RS','Singapore':'SG','Slovakia':'SK',
    'Slovenia':'SI','South Africa':'ZA','South Korea':'KR','Spain':'ES',
    'Sri Lanka':'LK','Sweden':'SE','Switzerland':'CH','Syria':'SY','Taiwan':'TW',
    'Tajikistan':'TJ','Tanzania':'TZ','Thailand':'TH','Tunisia':'TN','Turkey':'TR',
    'Turkmenistan':'TM','Uganda':'UG','Ukraine':'UA','United Arab Emirates':'AE',
    'UAE':'AE','United Kingdom':'GB','UK':'GB','United States':'US','USA':'US',
    'United States of America':'US','Uruguay':'UY','Uzbekistan':'UZ',
    'Venezuela':'VE','Vietnam':'VN','Yemen':'YE','Zimbabwe':'ZW',
  };
  return nameToCode[trimmed]
    || nameToCode[trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()]
    || (() => {
         const lower = trimmed.toLowerCase();
         const key = Object.keys(nameToCode).find(k => k.toLowerCase() === lower);
         return key ? nameToCode[key] : '';
       })();
}

// <CountryFlag /> — renders an <img> from flagcdn.com so flags display on Windows too
// (Windows Segoe UI Emoji has no country-flag glyphs, so Unicode flags fall back to letters)
function CountryFlag({ country, height = 14, style }) {
  const code = getCountryCode(country);
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt={code}
      height={height}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '2px', boxShadow: '0 0 1px rgba(0,0,0,0.4)', ...style }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

// Convert country name or 2-letter ISO code → Unicode flag emoji (kept for fallback)
function getCountryFlag(country) {
  const code = getCountryCode(country);
  if (!code) return '';
  return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}


// ─── Monthly Focus Helpers ───────────────────────────────────────────────────
function getMonthlyFocusBadge(completedDays, perfectDays) {
  if (!completedDays || completedDays === 0) return null;
  if (completedDays >= 7 && perfectDays >= 5) return { emoji: '🏆', name: 'Champion' };
  if (perfectDays >= 5) return { emoji: '👑', name: 'Perfect' };
  if (completedDays >= 7) return { emoji: '🎯', name: 'Achiever' };
  if (completedDays >= 5) return { emoji: '🔥', name: 'Dedicated' };
  if (completedDays >= 3) return { emoji: '⭐', name: 'Active' };
  return { emoji: '🌱', name: 'Beginner' };
}

function MFStatCard({ icon, label, value, accent }) {
  return (
    <div className="mfp-stat-card" style={{ '--mfp-accent': accent }}>
      <div className="mfp-stat-icon">{icon}</div>
      <div className="mfp-stat-value">{value}</div>
      <div className="mfp-stat-label">{label}</div>
    </div>
  );
}

// When `publicData` is provided (spectator view), the panel renders the VIEWED
// user's monthly-focus stats supplied by /api/public/profile/:displayName.
// Otherwise it fetches the logged-in user's own stats.
function MonthlyFocusPanel({ publicData = null }) {
  const [data, setData] = useState(publicData);
  const [mfLoading, setMfLoading] = useState(!publicData);

  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    // Spectator view: data comes from props, no fetch needed.
    if (publicData) { setData(publicData); setMfLoading(false); return; }

    let alive = true;
    const load = async () => {
      try {
        const cur = await api.get('/api/public/monthly-focus/current');
        const focuses = cur.data.focuses || (cur.data.focus ? [cur.data.focus] : []);
        if (!focuses.length) { if (alive) setMfLoading(false); return; }

        const statsArr = await Promise.all(
          focuses.map(f =>
            api.get(`/api/public/monthly-focus/leaderboard?focusId=${f._id}`)
              .then(r => ({ focusId: f._id, stats: r.data.userStats }))
              .catch(() => ({ focusId: f._id, stats: null }))
          )
        );
        const statsMap = {};
        statsArr.forEach(s => { statsMap[s.focusId] = s.stats; });
        if (alive) setData({ focuses, statsMap });
      } catch { /* silent */ }
      finally { if (alive) setMfLoading(false); }
    };
    load();
    return () => { alive = false; };
  }, [publicData]);

  if (mfLoading) return null;

  const isOfficial = f => !f.createdBy || f.createdBy?.role === 'admin';

  const focuses = data?.focuses || [];
  const statsMap = data?.statsMap || {};

  const officialFocuses   = focuses.filter(isOfficial);
  const eliteFocuses      = focuses.filter(f => !isOfficial(f));
  const officialWithStats = officialFocuses.filter(f => statsMap[f._id]);
  const eliteWithStats    = eliteFocuses.filter(f => statsMap[f._id]);
  const tableRows         = [...officialWithStats, ...eliteWithStats];

  const hasAnything = officialFocuses.length > 0 || tableRows.length > 0;

  return (
    <div className="mfp-section">
      <div className="mfp-header">
        <div className="mfp-header-left">
          <span className="mfp-header-icon">🎯</span>
          <div>
            <h2 className="mfp-title">Monthly Focus Challenge</h2>
            <p className="mfp-month">{currentMonthLabel}</p>
          </div>
        </div>
        <Link to="/monthly-focus" className="mfp-view-all">View All →</Link>
      </div>
      {!hasAnything && <p style={{ color: 'rgba(203,213,225,0.4)', fontSize: 13, margin: '8px 0 0' }}>No Monthly Focus challenge active this month.</p>}

      {/* Official challenge horizontal stat cards */}
      {officialWithStats.map(focus => {
        const s = data.statsMap[focus._id];
        const badge = getMonthlyFocusBadge(s.completedDays, s.perfectDays);
        return (
          <div key={focus._id} className="mfp-official-block">
            <div className="mfp-official-badge-label">🏛️ ChessNexus Official</div>
            <div className="mfp-official-focus-name">{focus.title}</div>
            <div className="mfp-stat-cards">
              <MFStatCard icon="🏅" label="Rank"         value={s.rank ? `#${s.rank}` : '—'}       accent="#f59e0b" />
              <MFStatCard icon="⚡" label="XP Earned"    value={s.focusXp ?? 0}                      accent="#06b6d4" />
              <MFStatCard icon="🧠" label="Skill Score"  value={s.skillScore ?? 0}                   accent="#818cf8" />
              <MFStatCard icon="🎖️" label="Badge"        value={badge ? `${badge.emoji} ${badge.name}` : '—'} accent="#10b981" />
              <MFStatCard icon="✨" label="Perfect Days" value={s.perfectDays ?? 0}                  accent="#e879f9" />
            </div>
          </div>
        );
      })}

      {/* Invite to join if official challenge active but user hasn't played */}
      {officialWithStats.length === 0 && officialFocuses.length > 0 && (
        <div className="mfp-join-invite">
          <span>🏛️ An official Monthly Focus challenge is active this month!</span>
          <Link to="/monthly-focus" className="mfp-join-link">Join now →</Link>
        </div>
      )}

      {/* Table: all participated focuses */}
      {tableRows.length > 0 && (
        <div className="mfp-table-wrap">
          <table className="mfp-table">
            <thead>
              <tr>
                <th>Challenge</th>
                <th>Rank</th>
                <th>XP</th>
                <th>Skill Score</th>
                <th>Badge</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(focus => {
                const s = data.statsMap[focus._id];
                const off = isOfficial(focus);
                const badge = getMonthlyFocusBadge(s.completedDays, s.perfectDays);
                const creator = off ? 'ChessNexus' : (focus.createdBy?.displayName || focus.createdBy?.username || 'Elite');
                return (
                  <tr key={focus._id} className={off ? 'mfp-row-official' : ''}>
                    <td>
                      <Link to={`/monthly-focus`} className="mfp-focus-name-link">
                        {off && <span className="mfp-official-dot">🏛️</span>}
                        <span>{focus.title}</span>
                        <span className="mfp-creator-tag">by {creator}</span>
                      </Link>
                    </td>
                    <td className="mfp-td-rank">{s.rank ? `#${s.rank}` : '—'}</td>
                    <td className="mfp-td-xp">{s.focusXp ?? 0}</td>
                    <td className="mfp-td-skill">{s.skillScore ?? 0}</td>
                    <td className="mfp-td-badge">{badge ? `${badge.emoji} ${badge.name}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UserDashboard() {
  const { displayName: routeDisplayName } = useParams();
  const [user, setUser] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [isStudent, setIsStudent] = useState(false); // accepted a coach request
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showSessionDebug, setShowSessionDebug] = useState(false);
  const [sessionDebug, setSessionDebug] = useState(null);
  const [keepOnExpiry, setKeepOnExpiry] = useState(localStorage.getItem('sessionDebugKeepOnExpiry') === 'true');
  const [animatedCards, setAnimatedCards] = useState(new Set());
  const [events, setEvents] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set(JSON.parse(localStorage.getItem('dismissedEventNotifications') || '[]')));
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [showTrophyTooltip, setShowTrophyTooltip] = useState(false);
  // Dashboard tabs. Performance stats live on the page; tabs hold one focused
  // section each: Activity (heatmap) / Achievements / Games.
  // Default to 'activity' but remember the last tab a returning user was on.
  const [puzzleCardRange, setPuzzleCardRange] = useState('24h');
  const [puzzleCardStats24, setPuzzleCardStats24] = useState(null);
  const [puzzleCardStats7d, setPuzzleCardStats7d] = useState(null);
  const puzzleCardStats = puzzleCardRange === '7d' ? puzzleCardStats7d : puzzleCardStats24;
  useEffect(() => {
    if (!user) return;
    api.get('/api/public/puzzle-stats/range?range=24h').then(r => setPuzzleCardStats24(r.data)).catch(() => {});
    api.get('/api/public/puzzle-stats/range?range=7d').then(r => setPuzzleCardStats7d(r.data)).catch(() => {});
  }, [user]);



  const [ownArenaSummary, setOwnArenaSummary] = useState(null);
  useEffect(() => {
    if (!user || routeDisplayName) return;
    const dn = user.displayName || user.username;
    if (!dn) return;
    api.get(`/api/public/profile/${encodeURIComponent(dn)}`)
      .then(r => setOwnArenaSummary(r.data?.arenaSummary || null))
      .catch(() => {});
  }, [user, routeDisplayName]);

  const [raceModalOpen, setRaceModalOpen] = useState(false);
  const [raceModalType, setRaceModalType] = useState(null);
  const openRaceModal = (type) => { setRaceModalType(type); setRaceModalOpen(true); };
  const DASH_TABS = ['nexusguide', 'friendgames', 'achievements', 'mycoach'];
  const initialTab = (() => {
    const saved = localStorage.getItem('dashboardTab');
    return DASH_TABS.includes(saved) ? saved : 'nexusguide';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([initialTab]));
  const selectTab = (t) => {
    setActiveTab(t);
    setVisitedTabs(prev => new Set(prev).add(t));
    localStorage.setItem('dashboardTab', t);
  };
  const [publicView, setPublicView] = useState(null); // when viewing another user's profile: { activity, trainingStats, arenaSummary }
  // Edit profile modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editCountry, setEditCountry] = useState('');
  const [editCurrentPw, setEditCurrentPw] = useState('');
  const [editNewPw, setEditNewPw] = useState('');
  const [editConfirmPw, setEditConfirmPw] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState(null); // { type: 'ok'|'err', text: string }
  const navigate = useNavigate();
  const isPublicView = Boolean(routeDisplayName);
  // Viewer is logged in only if they actually have a token
  const isViewerLoggedIn = Boolean(localStorage.getItem('authToken'));
  const cardRefs = useRef([]);

  // Track public profile views (once per profile)
  useEffect(() => {
    if (isPublicView && routeDisplayName) {
      trackEvent('profile_viewed', { profile: routeDisplayName });
    }
  }, [isPublicView, routeDisplayName]);

  // Whether the viewer has accepted a coach request (is an active student).
  // Gates the "Student Attendance" card. Skipped on public profile views.
  useEffect(() => {
    if (isPublicView) return;
    let alive = true;
    api.get('/api/coach/my-coaches')
      .then(res => { if (alive) setIsStudent(!!res.data?.isStudent); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isPublicView]);


  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = parseInt(entry.target.dataset.cardIndex);
            setAnimatedCards(prev => new Set([...prev, cardIndex]));
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Fetch user and badge data
  useEffect(() => {
    // ── Public view: fetch from /api/public/profile/:displayName ─────────────
    if (isPublicView) {
      const fetchPublic = async () => {
        setLoading(true);
        try {
          const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
          const res = await fetch(`${apiBase}/api/public/profile/${encodeURIComponent(routeDisplayName)}`);
          if (res.status === 404) {
            setErr(`Player "${routeDisplayName}" not found.`);
            setLoading(false);
            return;
          }
          if (!res.ok) throw new Error('Failed to load profile');
          const data = await res.json();
          setUser({
            _id: data.username, // use username as a stable identifier (no real _id is exposed publicly)
            id: data.username,
            displayName: data.displayName,
            username: data.username,
            role: data.role, // so role badges (e.g. 💎 Elite) show on the public/spectate profile
            isCoach: !!data.isCoach,
            coachVerified: !!data.coachVerified,
            country: data.country,
            liveRating: data.liveRating,
            ratings: data.ratings || {},
            highestTimedRaceScore: data.highestTimedRaceScore,
            highestArenaRaceScore: data.highestArenaRaceScore,
            highestTeamRaceScore: data.highestTeamRaceScore,
            profilePhotoUrl: data.profilePhotoUrl,
            activeAvatar: data.activeAvatar,
            activeAvatarUrl: data.activeAvatarUrl,
            activeLego: data.activeLego,
            active3dModel: data.active3dModel,
            arenaCrownTier: data.arenaCrownTier,
            marathonTrophies: data.marathonTrophies || { first: 0, second: 0, third: 0 },
            teamBattleTrophies: data.teamBattleTrophies || 0,
            chessExperience: data.chessExperience,
            chessComUsername: data.chessComUsername,
            lichessUsername: data.lichessUsername,
            memberSince: data.memberSince,
            coffeeSupporter: !!data.coffeeSupporter,
            xpWallet: data.xpWallet || { total: 0, bySource: {} }, // spectators see the full breakdown too
            enrolled: false, // never show student attendance on public profile
          });
          setBadges(data.badges || []);
          setPublicView({
            activity: data.activity || { activeDates: [], stats: { totalDays: 0, currentStreak: 0, totalMinutes: 0 } },
            trainingStats: data.trainingStats || { correct: 0, wrong: 0 },
            arenaSummary: data.arenaSummary || { totalTournaments: 0, totalGamesPlayed: 0, arenaCrownTier: 'none', arenaCarryPoints: 0 },
            monthlyFocus: data.monthlyFocus || { focuses: [], statsMap: {} },
            puzzleStatsRange: data.puzzleStatsRange || null,
          });
          setErr(null);
        } catch (e) {
          setErr(e.message || 'Failed to load profile');
        } finally {
          setLoading(false);
        }
      };
      fetchPublic();
      return;
    }

    // ── Own dashboard: existing behavior ─────────────────────────────────────
    // If there's no token at all, show the guest view (BestRacers) — don't call the API
    if (!localStorage.getItem('authToken')) {
      setLoading(false);
      return;
    }

    const fetchData = async (retryCount = 0) => {
      setLoading(true);
      try {
        const userRes = await api.get('/api/auth/me', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          timeout: 10000
        });

        if (userRes.data && userRes.data.user) {
          const u = userRes.data.user;
          setUser(u);
          setBadges(u.badges || u.earnedBadges || []);
        } else {
          throw new Error('Invalid user data structure');
        }
        setErr(null);
      } catch (e) {
        if (retryCount < 2 && (e.code === 'NETWORK_ERROR' || e.response?.status >= 500)) {
          setTimeout(() => fetchData(retryCount + 1), retryCount === 0 ? 800 : 2000);
          return;
        }

        if (e.response?.status === 401) {
          setErr('Session expired. Please log in again.');
          setTimeout(() => navigate('/login'), 3000);
        } else if (e.code === 'NETWORK_ERROR' || !navigator.onLine) {
          setErr('Network connection issue. Please check your internet and try again.');
        } else {
          setErr(e?.response?.data?.message || e.message || 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, keepOnExpiry, isPublicView, routeDisplayName]);

  const COUNTRY_LIST = [
    'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria',
    'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Brazil','Bulgaria',
    'Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba','Czechia','Denmark',
    'Ecuador','Egypt','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece',
    'Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
    'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon',
    'Lithuania','Malaysia','Mexico','Moldova','Mongolia','Morocco','Myanmar','Nepal',
    'Netherlands','New Zealand','Nigeria','Norway','Pakistan','Paraguay','Peru','Philippines',
    'Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia',
    'Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka',
    'Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Tunisia',
    'Turkey','Turkmenistan','Uganda','Ukraine','United Arab Emirates','United Kingdom',
    'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
  ];

  async function saveCountry(e) {
    e.preventDefault();
    if (!editCountry.trim()) return setEditMsg({ type: 'err', text: 'Please select a country.' });
    setEditSaving(true);
    setEditMsg(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      const res = await fetch(`${apiBase}/api/user/update-country`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ country: editCountry.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setEditMsg({ type: 'err', text: data.message || 'Failed to update country.' });
      setUser(prev => ({ ...prev, country: data.country }));
      setEditMsg({ type: 'ok', text: 'Country updated!' });
    } catch {
      setEditMsg({ type: 'err', text: 'Network error.' });
    } finally {
      setEditSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!editCurrentPw || !editNewPw || !editConfirmPw) return setEditMsg({ type: 'err', text: 'Fill all password fields.' });
    if (editNewPw.length < 6) return setEditMsg({ type: 'err', text: 'New password must be at least 6 characters.' });
    if (editNewPw !== editConfirmPw) return setEditMsg({ type: 'err', text: 'New passwords do not match.' });
    setEditSaving(true);
    setEditMsg(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      const res = await fetch(`${apiBase}/api/user/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ currentPassword: editCurrentPw, newPassword: editNewPw }),
      });
      const data = await res.json();
      if (!res.ok) return setEditMsg({ type: 'err', text: data.message || 'Failed to change password.' });
      setEditMsg({ type: 'ok', text: 'Password changed!' });
      setEditCurrentPw(''); setEditNewPw(''); setEditConfirmPw('');
    } catch {
      setEditMsg({ type: 'err', text: 'Network error.' });
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="dashboard-container">
      <style>{`
        @keyframes bounce { 0%,20%,50%,80%,100%{transform:translateY(0);}40%{transform:translateY(-10px);}60%{transform:translateY(-5px);} }
        @keyframes slideIn { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
      `}</style>


      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div
          onClick={() => setShowEditProfile(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.65)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--obsidian-card, #1a1f2e)',
              border: '1px solid var(--obsidian-border, rgba(255,255,255,0.1))',
              borderRadius: '16px', padding: '28px 32px', width: '100%', maxWidth: '420px',
              animation: 'slideIn 0.18s ease',
            }}
          >
            <h2 style={{ margin: '0 0 20px', color: 'var(--obsidian-accent, #7dd3fc)', fontSize: '18px' }}>
              ✏️ Edit Profile
            </h2>

            {/* Country */}
            <form onSubmit={saveCountry} style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px' }}>
                Country
              </label>
              <select
                value={editCountry}
                onChange={e => setEditCountry(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.07)', color: '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.15)', fontSize: '14px', marginBottom: '10px',
                }}
              >
                <option value="">— Select country —</option>
                {COUNTRY_LIST.map(c => (
                  <option key={c} value={c}>{getCountryFlag(c)} {c}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={editSaving}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  background: 'var(--obsidian-accent, #7dd3fc)', color: '#0f172a',
                  border: 'none', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.6 : 1,
                }}
              >
                Save Country
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 0 20px' }} />

            {/* Change Password */}
            <form onSubmit={savePassword}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>
                Change Password
              </label>
              {[
                { label: 'Current password', val: editCurrentPw, set: setEditCurrentPw },
                { label: 'New password', val: editNewPw, set: setEditNewPw },
                { label: 'Confirm new password', val: editConfirmPw, set: setEditConfirmPw },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginBottom: '4px' }}>{label}</label>
                  <input
                    type="password"
                    value={val}
                    onChange={e => set(e.target.value)}
                    autoComplete="off"
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.07)', color: '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.15)', fontSize: '14px',
                    }}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={editSaving}
                style={{
                  marginTop: '4px', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  background: '#7c3aed', color: '#fff',
                  border: 'none', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.6 : 1,
                }}
              >
                Change Password
              </button>
            </form>

            {editMsg && (
              <p style={{
                marginTop: '14px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                background: editMsg.type === 'ok' ? 'rgba(20,184,166,0.15)' : 'rgba(239,68,68,0.15)',
                color: editMsg.type === 'ok' ? '#2dd4bf' : '#f87171',
                border: `1px solid ${editMsg.type === 'ok' ? 'rgba(45,212,191,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {editMsg.type === 'ok' ? '✓ ' : '⚠ '}{editMsg.text}
              </p>
            )}

            <button
              onClick={() => setShowEditProfile(false)}
              style={{
                marginTop: '18px', width: '100%', padding: '8px', borderRadius: '8px',
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="main-content">

        {/* Event notifications now live in the sidebar bell (see data/notifications.js) */}

        {user && (
          <div className="welcome-section">
            <div className="welcome-avatar-col">
              <div className="welcome-avatar-wrap">
                {user.activeLego && !(user.profilePhotoUrl || user.activeAvatarUrl) && !user.active3dModel ? (
                  <div className="welcome-avatar-initials welcome-avatar-emoji">🧱</div>
                ) : (
                  <UserAvatar user={user} size={120} live />
                )}
              </div>
              {/* Share Profile — sits directly under the avatar */}
              <button
                className="welcome-share-btn"
                onClick={() => {
                  const link = `${window.location.origin}/player/${encodeURIComponent(user.displayName || user.username)}`;
                  navigator.clipboard.writeText(link);
                  setProfileLinkCopied(true);
                  setTimeout(() => setProfileLinkCopied(false), 2500);
                }}
                style={{
                  background: profileLinkCopied ? '#0f766e' : 'var(--obsidian-pill)',
                  color: profileLinkCopied ? '#ecfeff' : 'var(--obsidian-accent)',
                  border: profileLinkCopied ? '1px solid rgba(45, 212, 191, 0.35)' : '1px solid var(--obsidian-border)',
                }}
              >
                {profileLinkCopied ? '✓ Copied!' : '🔗 Share Profile'}
              </button>
            </div>
            <div className="welcome-text">
              <h1 className="welcome-title">
                {isPublicView ? user.displayName : `Welcome, ${user.displayName}!`}
                {user.coffeeSupporter && <CoffeeBadge size={26} />}
                {user.role === 'elite' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: '10px',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))',
                    border: '1px solid rgba(251,191,36,0.55)',
                    color: '#fbbf24',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '10px',
                    verticalAlign: 'middle',
                    textShadow: '0 0 8px rgba(251,191,36,0.4)',
                    boxShadow: '0 0 12px rgba(251,191,36,0.15)',
                  }}>
                    💎 Elite
                  </span>
                )}
              </h1>
              {isPublicView ? (
                <p className="welcome-quote" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  {user.country && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CountryFlag country={user.country} height={16} />
                      {user.country}
                    </span>
                  )}
                  {user.chessExperience && <span>• {user.chessExperience}</span>}
                  {user.memberSince && <span>• Member since {new Date(user.memberSince).getFullYear()}</span>}
                  {user.isCoach && user.coachVerified && <CoachBadge />}
                </p>
              ) : (
                <p className="welcome-quote welcome-meta-row">
                  {user.memberSince && (
                    <span className="welcome-meta-pill">📅 Joined {new Date(user.memberSince).getFullYear()}</span>
                  )}
                  {user.isCoach && user.coachVerified && <CoachBadge />}
                  {user.country && (
                    <span className="welcome-meta-flag" title={user.country} aria-label={user.country}>
                      <CountryFlag country={user.country} height={18} />
                    </span>
                  )}
                </p>
              )}
              {user.biography && (
                <div style={{
                  margin: '12px 0 0',
                  maxWidth: '620px',
                  padding: '12px 16px',
                  background: 'var(--obsidian-pill, rgba(255,255,255,0.04))',
                  border: '1px solid var(--obsidian-border, rgba(255,255,255,0.08))',
                  borderLeft: '3px solid var(--obsidian-accent, #06b6d4)',
                  borderRadius: '12px',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: 'var(--obsidian-text-soft, #94a3b8)',
                    whiteSpace: 'pre-wrap',
                    fontStyle: 'italic',
                  }}>
                    “{user.biography}”
                  </p>
                </div>
              )}
            </div>

            {/* Right-side trophies: Focus Champion + Marathon + Team Battle + Arena Crown */}
            {(() => {
              const mt = user.marathonTrophies || { first: 0, second: 0, third: 0 };
              const hasMarathon = (mt.first + mt.second + mt.third) > 0;
              const teamBattleTrophies = user.teamBattleTrophies || 0;
              const hasTeamBattle = teamBattleTrophies > 0;
              const hasCrown = user.arenaCrownTier && user.arenaCrownTier !== 'none';
              if (!user.isFocusChampion && !hasMarathon && !hasTeamBattle && !hasCrown) return null;
              return (
              <div className="welcome-trophies-panel">
                {user.isFocusChampion && (
                  <div
                    className="focus-champion-trophy"
                    style={{ marginLeft: 0, padding: '0 3px' }}
                    onMouseEnter={() => setShowTrophyTooltip(true)}
                    onMouseLeave={() => setShowTrophyTooltip(false)}
                  >
                    <img
                      src="/monthlyfocuschampion.png"
                      alt="Monthly Focus Champion"
                      className="champion-trophy-img"
                    />
                    {showTrophyTooltip && (
                      <div className="champion-trophy-tooltip">
                        <span className="champion-trophy-tooltip-title">🏆 Monthly Focus Champion</span>
                        <span className="champion-trophy-tooltip-desc">
                          Awarded for achieving 5 or more <strong>perfect days</strong> in the Monthly Focus Challenge.
                          A perfect day means completing all required tasks without missing anything.
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {hasMarathon && (
                  <>
                    {user.isFocusChampion && (
                      <div style={{ width: '1px', height: '54px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 3px' }}>
                      {[
                        { key: 'first',  img: 'marathonfirst',  label: 'Marathon Champion · 1st Place', count: mt.first },
                        { key: 'second', img: 'marathonsecond', label: 'Marathon Runner-up · 2nd Place', count: mt.second },
                        { key: 'third',  img: 'marathonthird',  label: 'Marathon · 3rd Place', count: mt.third },
                      ].filter(m => m.count > 0).map(m => (
                        <span
                          key={m.key}
                          title={`${m.label}${m.count > 1 ? ` ×${m.count}` : ''}`}
                          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <img
                            src={`/arenadashboardcrowns/${m.img}.png`}
                            alt={m.label}
                            style={{ width: '86px', height: '86px', objectFit: 'contain', display: 'block' }}
                          />
                          {m.count > 1 && (
                            <span style={{
                              position: 'absolute', bottom: '2px', right: '-2px',
                              minWidth: '18px', height: '18px', padding: '0 4px', borderRadius: '999px',
                              background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.18)',
                              color: '#fbbf24', fontSize: '11px', fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                            }}>
                              ×{m.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {hasTeamBattle && (
                  <>
                    {(user.isFocusChampion || hasMarathon) && (
                      <div style={{ width: '1px', height: '54px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 3px' }}>
                      <span
                        title={`Team Battle Champion${teamBattleTrophies > 1 ? ` ×${teamBattleTrophies}` : ''}`}
                        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <img
                          src="/arenadashboardcrowns/teambattle.png"
                          alt="Team Battle Champion"
                          style={{ width: '86px', height: '86px', objectFit: 'contain', display: 'block' }}
                        />
                        {teamBattleTrophies > 1 && (
                          <span style={{
                            position: 'absolute', bottom: '2px', right: '-2px',
                            minWidth: '18px', height: '18px', padding: '0 4px', borderRadius: '999px',
                            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.18)',
                            color: '#818cf8', fontSize: '11px', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}>
                            ×{teamBattleTrophies}
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {(() => {
                  const tier = user.arenaCrownTier;
                  if (!tier || tier === 'none') return null;
                  const cs = {
                    bronze:   { color: '#c08457', label: 'Bronze Crown' },
                    silver:   { color: '#e5e7eb', label: 'Silver Crown' },
                    gold:     { color: '#fbbf24', label: 'Gold Crown' },
                    platinum: { color: '#f8fafc', label: 'Platinum Crown' },
                    gem:      { color: '#60a5fa', label: 'Gem Crown' },
                  }[tier];
                  if (!cs) return null;
                  return (
                    <>
                      {(user.isFocusChampion || hasMarathon || hasTeamBattle) && (
                        <div style={{ width: '1px', height: '54px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                      )}
                      <div className="arena-crown-widget" style={{ padding: '0 3px' }}>
                        <span className={`arena-crown-trophy tier-${tier}`}>👑</span>
                        <span className="arena-crown-label" style={{ color: cs.color }}>
                          {cs.label}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
              );
            })()}
          </div>
        )}

        {/* Stats Bar — 4 ratings (bullet / blitz / rapid / classical) */}
        {user && (
          <StatsBar ratings={user.ratings} />
        )}

        {/* ── Tabbed dashboard ── */}
        {user && (
          <>
            {!isPublicView && <TodayStrip />}

            {/* Two-column card: 65% Practice Activity | 35% right panel (TBD) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '65fr 35fr',
              gap: 16,
              margin: '0 0 18px 0',
            }}>
              <div style={{ overflow: 'hidden' }}>
                <ActivityTracker publicData={publicView?.activity || null} />
              </div>
              <div style={{
                background: 'var(--obsidian-surface-elevated, rgba(23,23,23,0.7))',
                border: '1px solid var(--obsidian-border, rgba(148,163,184,0.16))',
                borderRadius: 24,
                padding: '20px 18px',
                boxShadow: 'var(--obsidian-shadow, 0 8px 32px rgba(0,0,0,0.5))',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {/* XP Wallet — above Highest Race Points */}
                {user && <XpWallet wallet={user.xpWallet} />}

                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--obsidian-accent, #06b6d4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  🏆 Highest Race Points
                </div>
                {[
                  { icon: '🏃‍♂️', label: 'Individual Race', value: user?.highestTimedRaceScore || 0, type: 'timedRace' },
                  { icon: '🏟️',   label: 'Arena Race',      value: user?.highestArenaRaceScore || 0, type: 'arenaRace' },
                  { icon: '👥',   label: 'Team Race',       value: user?.highestTeamRaceScore || 0,  type: 'teamRace' },
                ].map(r => (
                  <div
                    key={r.label}
                    onClick={() => openRaceModal(r.type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      background: 'var(--obsidian-panel, linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02)))',
                      border: '1px solid var(--obsidian-border, rgba(148,163,184,0.16))',
                      transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.35)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,182,212,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#f1f5f9' }}>
                        {r.value.toLocaleString()}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--obsidian-text-muted, rgba(203,213,225,0.5))' }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Combined card — Puzzle Stats | Tournament Stats | Daily Puzzles */}
            <div style={{
              display: 'flex',
              background: 'var(--obsidian-surface-elevated, rgba(23,23,23,0.7))',
              border: '1px solid var(--obsidian-border, rgba(148,163,184,0.16))',
              borderRadius: 24,
              boxShadow: 'var(--obsidian-shadow, 0 8px 32px rgba(0,0,0,0.5))',
              margin: '0 0 18px 0',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {(() => {
                const ps = puzzleCardStats;
                const solved   = ps?.solved  ?? 0;
                const total    = ps?.attempts ?? 0;
                const pct      = total > 0 ? Math.round((solved / total) * 100) : 0;
                const rating   = ps?.rating   ?? (user?.liveRating || 1200);
                const trend    = ps?.trend    ?? null;
                const accuracy = ps?.accuracy ?? (total > 0 ? pct : null);
                const streak   = ps?.streak   ?? 0;
                const R = 78; const C = 2 * Math.PI * R;
                const offset   = C - (pct / 100) * C;
                const viewedDN = isPublicView ? routeDisplayName : null;
                const arena    = isPublicView ? publicView?.arenaSummary : ownArenaSummary;

                const mkSpark = (data, color) => {
                  if (!Array.isArray(data) || data.length < 2) return null;
                  const max = Math.max(...data); const min = Math.min(...data);
                  const allSame = max === min;
                  const span = allSame ? 1 : max - min;
                  const W = 100; const H = 22;
                  const stepX = W / (data.length - 1);
                  const y = v => allSame ? H / 2 : H - 3 - ((v - min) / span) * (H - 6);
                  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
                  return (
                    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', opacity: allSame ? 0.3 : 1 }} preserveAspectRatio="none" aria-hidden="true">
                      <path d={`M ${pts.join(' L ')}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  );
                };

                const arenaStats = [
                  { icon: '🏆', label: 'Tournaments', value: arena?.totalTournaments ?? '—', accent: '#f59e0b', glow: 'rgba(255,255,255,0.03)' },
                  { icon: '⚔️',  label: 'Games',       value: arena?.totalGamesPlayed ?? '—',  accent: '#06b6d4', glow: 'rgba(255,255,255,0.03)' },
                  { icon: '⚡',  label: 'Carry Pts',   value: arena?.arenaCarryPoints > 0 ? `+${arena.arenaCarryPoints}` : (arena ? '0' : '—'), accent: '#a855f7', glow: 'rgba(255,255,255,0.03)' },
                ];

                return (
                  <>
                    {/* ── Section 1: Puzzle Stats (circle + table) ── */}
                    <div style={{ flex: '38 1 0', minWidth: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15 }}>🧩</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(203,213,225,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Puzzle Stats</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 7, padding: 2, gap: 2 }}>
                            {['24h','7d'].map(r => (
                              <button key={r} onClick={() => setPuzzleCardRange(r)} style={{ border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: puzzleCardRange === r ? 'linear-gradient(135deg,#06b6d4,#10b981)' : 'transparent', color: puzzleCardRange === r ? '#04201f' : 'rgba(203,213,225,0.4)', transition: 'all 0.15s' }}>{r}</button>
                            ))}
                          </div>
                          <Link to={viewedDN ? `/player/${encodeURIComponent(viewedDN)}/puzzle-dashboard` : '/puzzle-dashboard'} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04201f', fontWeight: 700, fontSize: 10, textDecoration: 'none' }}>Dashboard →</Link>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {/* Circle */}
                        <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
                          <svg viewBox="0 0 170 170" width="170" height="170" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="85" cy="85" r={R} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="11" />
                            <circle cx="85" cy="85" r={R} fill="none" stroke="#10b981" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{solved}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(203,213,225,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>solved</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{pct}%</span>
                          </div>
                        </div>
                        {/* Stats rows */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: 'Puzzle Rating', value: rating, extra: trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '—', extraColor: trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : 'rgba(203,213,225,0.3)', valueColor: '#f1f5f9', spark: mkSpark(ps?.series?.rating, '#f1f5f9') },
                            { label: 'Accuracy',      value: accuracy != null ? `${accuracy}%` : '—', extra: null, valueColor: '#a78bfa', spark: mkSpark(ps?.series?.accuracy, '#a78bfa') },
                            { label: 'Best Streak',   value: streak, extra: null, valueColor: '#f59e0b', spark: mkSpark(ps?.series?.solved, '#f59e0b') },
                          ].map((row, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 60px 1fr', alignItems: 'center', gap: '0 8px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(203,213,225,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{row.label}</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                <span style={{ fontSize: 17, fontWeight: 900, color: row.valueColor }}>{row.value}</span>
                                {row.extra && <span style={{ fontSize: 10, fontWeight: 700, color: row.extraColor }}>{row.extra}</span>}
                              </div>
                              <div style={{ minWidth: 0 }}>{row.spark}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(148,163,184,0.1)', flexShrink: 0, zIndex: 1 }} />

                    {/* ── Section 2: Tournament Stats ── */}
                    <div style={{ flex: '32 1 0', minWidth: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15 }}>🏟️</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(203,213,225,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tournament</span>
                        </div>
                        <Link to={isPublicView ? `/arena-tournament-dashboard/${encodeURIComponent(routeDisplayName)}` : '/arena-tournament-dashboard'} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04201f', fontWeight: 700, fontSize: 10, textDecoration: 'none' }}>Dashboard →</Link>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {arenaStats.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: s.glow, border: '1px solid rgba(148,163,184,0.08)' }}>
                            <span style={{ fontSize: 18 }}>{s.icon}</span>
                            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'rgba(203,213,225,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                            <span style={{ fontSize: 20, fontWeight: 900, color: s.accent }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(148,163,184,0.1)', flexShrink: 0, zIndex: 1 }} />

                    {/* ── Section 3: Today's Daily Puzzles ── */}
                    <div style={{ flex: '30 1 0', minWidth: 0, position: 'relative', zIndex: 1 }}>
                      <PerformanceMonitor
                        user={user}
                        publicTrainingStats={publicView?.trainingStats || null}
                        publicArenaSummary={null}
                        publicMonthlyFocus={null}
                        publicPuzzleStatsRange={null}
                        viewedDisplayName={isPublicView ? routeDisplayName : null}
                        section="dailypuzzle"
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Monthly Focus — shown directly below the stats card */}
            <MonthlyFocusPanel
              publicData={isPublicView ? (publicView?.monthlyFocus || { focuses: [], statsMap: {} }) : null}
            />

            <DashboardTabs activeTab={activeTab} onChange={selectTab} />

            {/* Tab 1 — Nexus Guide (your training buddy) */}
            {visitedTabs.has('nexusguide') && (
              <div className="dash-tabpanel" role="tabpanel" hidden={activeTab !== 'nexusguide'}>
                {!isPublicView && isViewerLoggedIn && <GameInsightsPanel />}
              </div>
            )}

            {/* Tab 2 — Games with Friends */}
            {visitedTabs.has('friendgames') && (
              <div className="dash-tabpanel" role="tabpanel" hidden={activeTab !== 'friendgames'}>
                <FriendGamesSection userId={user._id || user.id || user.username} />
              </div>
            )}

            {/* Tab 3 — My Achievements */}
            {visitedTabs.has('achievements') && (
              <div className="dash-tabpanel" role="tabpanel" hidden={activeTab !== 'achievements'}>
                <BadgeWall badges={badges} userId={user._id || user.id || 'me'} isPublicView={isPublicView} />
              </div>
            )}

            {/* Tab 4 — My Coach */}
            {visitedTabs.has('mycoach') && (
              <div className="dash-tabpanel" role="tabpanel" hidden={activeTab !== 'mycoach'}>
                {(isStudent || user?.enrolled) && (
                  <div className="attendance-section">
                    <div
                      ref={(el) => cardRefs.current[3] = el}
                      data-card-index="3"
                      className={`racing-mode-card attendance-card ${animatedCards.has(3) ? 'scroll-animated' : ''} ${hoveredCard === 3 ? 'racing-mode-card-hover' : ''}`}
                      onMouseEnter={() => setHoveredCard(3)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div className="racing-mode-icon">📋</div>
                      <h3 className="racing-mode-title">Student Attendance</h3>
                      <p className="racing-mode-description">View your attendance records and manage payments.</p>
                      <Link to="/attendance" style={{ textDecoration: 'none' }}>
                        <button className="watch-games-btn">View Attendance</button>
                      </Link>
                    </div>
                  </div>
                )}
                {!isPublicView && <MyCoachCard />}
              </div>
            )}

            <DetailedRaceStatsModal
              isOpen={raceModalOpen}
              onClose={() => setRaceModalOpen(false)}
              raceType={raceModalType}
              timeLimit={raceModalType === 'timedRace' ? 5 : raceModalType === 'arenaRace' ? 10 : 30}
            />
          </>
        )}

        {/* Guest highlights (no account) — preserved from previous behavior */}
        {!isViewerLoggedIn && !isPublicView && <BestRacers />}

        {loading && (
          <div className="loading-card">
            <div className="loading-icon">⏳</div>
            Loading dashboard... Please wait.
            <div className="loading-subtitle">If this takes too long, check your internet connection.</div>
          </div>
        )}

        {err && (
          <div className="error-card">
            <div className="error-message">{err}</div>
            <button onClick={() => window.location.reload()} className="retry-button">🔁 Retry</button>
          </div>
        )}

      </div>
    </div>
  );
}