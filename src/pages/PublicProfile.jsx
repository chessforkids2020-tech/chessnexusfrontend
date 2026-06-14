// src/pages/PublicProfile.jsx
// Public profile page — viewable by anyone, no login required.
// URL: /player/:displayName
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resolveApiAssetUrl } from '../api';

const API = import.meta.env.VITE_API_URL || window.location.origin;

// ─── Badge Tracks (same definition as UserDashboard) ──────────────────────
const TRACKS = [
  {
    id: 'puzzles', icon: '🧩', name: 'Daily Puzzles',
    badges: [
      { id: 'puzzle_starter', tier: 'starter', emoji: '🧩', name: 'First Move',    threshold: 'Solve 1 puzzle' },
      { id: 'puzzle_gold',    tier: 'gold',    emoji: '🥇', name: 'Puzzle Pro',     threshold: '25 puzzles (~5 days)' },
      { id: 'puzzle_plat',    tier: 'plat',    emoji: '💎', name: 'Puzzle Legend',  threshold: '300 puzzles (~2 months)' },
    ],
  },
  {
    id: 'rating', icon: '⭐', name: 'Competition',
    badges: [
      { id: 'rating_starter', tier: 'starter', emoji: '⭐', name: 'Rising',         threshold: 'Reach 1250 points' },
      { id: 'rating_gold',    tier: 'gold',    emoji: '🥇', name: 'Sharp Mind',     threshold: 'Reach 1350 points' },
      { id: 'rating_plat',    tier: 'plat',    emoji: '💎', name: 'Chess King',     threshold: 'Reach 1700 points' },
    ],
  },
  {
    id: 'race', icon: '🏎️', name: 'Speed Race',
    badges: [
      { id: 'race_starter',   tier: 'starter', emoji: '🏁', name: 'Racer',          threshold: 'Play any race' },
      { id: 'race_gold',      tier: 'gold',    emoji: '🥇', name: 'Speed Demon',    threshold: 'Score 200+ in Individual Race' },
      { id: 'race_plat',      tier: 'plat',    emoji: '💎', name: 'Arena Champion', threshold: 'Score 400+ in Arena Race' },
    ],
  },
  {
    id: 'streak', icon: '🔥', name: 'Streak',
    badges: [
      { id: 'streak_starter', tier: 'starter', emoji: '🔥', name: 'On Fire',        threshold: '2 perfect days in a row' },
      { id: 'streak_gold',    tier: 'gold',    emoji: '🥇', name: 'Grinder',        threshold: '4 perfect days in a row' },
      { id: 'streak_plat',    tier: 'plat',    emoji: '💎', name: 'Iron Will',      threshold: '7 perfect days in a row' },
    ],
  },
  {
    id: 'focus', icon: '🎯', name: 'Monthly Focus',
    badges: [
      { id: 'focus_starter',  tier: 'starter', emoji: '🎯', name: 'Focused',        threshold: 'Complete 5 Focus days' },
      { id: 'focus_gold',     tier: 'gold',    emoji: '🥇', name: 'Consistent',     threshold: 'Complete 2 full Focus months' },
      { id: 'focus_plat',     tier: 'plat',    emoji: '💎', name: 'Dedicated',      threshold: 'Complete 4 full Focus months' },
    ],
  },
  {
    id: 'tournament', icon: '🏆', name: 'Tournament',
    badges: [
      { id: 'tournament_starter', tier: 'starter', emoji: '🏅', name: 'Competitor', threshold: '3 games without losing' },
      { id: 'tournament_gold',    tier: 'gold',    emoji: '🥇', name: 'Veteran',     threshold: '6 games without losing' },
      { id: 'tournament_plat',    tier: 'plat',    emoji: '💎', name: 'Champion',    threshold: '10 games without losing' },
    ],
  },
];

const TIER_COLOR = { starter: '#6366f1', gold: '#f59e0b', plat: '#06b6d4' };
const CROWN_LABELS = { gold: '👑 Gold Crown', platinum: '👑 Platinum Crown', gem: '💎 Gem Crown', none: null };

export default function PublicProfile() {
  const { displayName } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/public/profile/${encodeURIComponent(displayName)}`);
        if (res.status === 404) {
          setError(`No player found with the name "${displayName}"`);
        } else if (!res.ok) {
          setError('Failed to load profile. Please try again.');
        } else {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [displayName]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '18px' }}>
            ⏳ Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '20px', color: '#ef4444', marginBottom: '24px' }}>{error}</div>
            <Link to="/" style={s.backBtn}>← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const earnedSet = new Set(profile.badges || []);
  const allFlat = TRACKS.flatMap(t => t.badges);
  const earnedFlat = allFlat.filter(b => earnedSet.has(b.id));
  const lockedFlat = allFlat.filter(b => !earnedSet.has(b.id));
  const totalEarned = earnedFlat.length;
  const totalBadges = allFlat.length;

  const memberYear = profile.memberSince ? new Date(profile.memberSince).getFullYear() : null;

  const avatarUrl = profile.profilePhotoUrl
    ? resolveApiAssetUrl(profile.profilePhotoUrl)
    : null;

  const crownLabel = CROWN_LABELS[profile.arenaCrownTier];

  return (
    <div style={s.page}>
      {/* Back / Share bar */}
      <div style={s.topBar}>
        <Link to="/" style={s.backBtn}>← Home</Link>
        <button onClick={handleCopyLink} style={s.shareBtn}>
          {copied ? '✓ Link Copied!' : '🔗 Share Profile'}
        </button>
      </div>

      <div style={s.card}>
        {/* ── Header ─────────────────────────────────────── */}
        <div style={s.heroSection}>
          <div style={s.avatarWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={s.avatarImg} />
            ) : (
              <div style={s.avatarInitials}>
                {(profile.displayName || profile.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div style={s.heroText}>
            <h1 style={s.heroName}>{profile.displayName || profile.username}</h1>
            {profile.country && <div style={s.heroBadge}>🌍 {profile.country}</div>}
            {crownLabel && <div style={{ ...s.heroBadge, background: '#fef3c7', color: '#92400e' }}>{crownLabel}</div>}
            {profile.chessExperience && <div style={s.heroBadge}>♟️ {profile.chessExperience}</div>}
            {memberYear && <div style={{ ...s.heroBadge, background: '#f0fdf4', color: '#166534' }}>Member since {memberYear}</div>}
          </div>
        </div>

        {/* ── Biography ───────────────────────────────────── */}
        {profile.biography && (
          <p style={{
            margin: '0 0 18px',
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#475569',
            whiteSpace: 'pre-wrap',
          }}>
            {profile.biography}
          </p>
        )}

        {/* ── Chess Platforms ─────────────────────────────── */}
        {(profile.chessComUsername || profile.lichessUsername) && (
          <div style={s.platformsRow}>
            {profile.chessComUsername && (
              <a href={`https://www.chess.com/member/${profile.chessComUsername}`} target="_blank" rel="noopener noreferrer" style={s.platformLink}>
                ♟ Chess.com: <strong>{profile.chessComUsername}</strong>
              </a>
            )}
            {profile.lichessUsername && (
              <a href={`https://lichess.org/@/${profile.lichessUsername}`} target="_blank" rel="noopener noreferrer" style={s.platformLink}>
                ♜ Lichess: <strong>{profile.lichessUsername}</strong>
              </a>
            )}
          </div>
        )}

        {/* ── Stats ───────────────────────────────────────── */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statValue}>{profile.liveRating}</div>
            <div style={s.statLabel}>⭐ Rating</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{profile.highestArenaRaceScore}</div>
            <div style={s.statLabel}>🏆 Best Arena Score</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{profile.highestTimedRaceScore}</div>
            <div style={s.statLabel}>🏁 Best Race Score</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{totalEarned}</div>
            <div style={s.statLabel}>🏅 Badges ({totalEarned}/{totalBadges})</div>
          </div>
        </div>

        {/* ── Badge Wall ──────────────────────────────────── */}
        <div style={s.badgeSection}>
          <div style={s.badgeSectionHeader}>
            <h2 style={s.sectionTitle}>🏅 Achievements</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={s.badgeCount}>{totalEarned}/{totalBadges}</span>
              <button style={s.showAllBtn} onClick={() => setShowAllBadges(v => !v)}>
                {showAllBadges ? 'Show Less' : 'Show All'}
              </button>
            </div>
          </div>

          {!showAllBadges ? (
            /* Preview: first 6 earned, then locked to fill to 6 */
            <div style={s.badgePreviewRow}>
              {(earnedFlat.length >= 6
                ? earnedFlat.slice(0, 6)
                : [...earnedFlat, ...lockedFlat.slice(0, 6 - earnedFlat.length)]
              ).map(badge => {
                const earned = earnedSet.has(badge.id);
                return (
                  <div key={badge.id} style={{ ...s.badgePreviewItem, ...(earned ? s.badgeEarned : s.badgeLocked) }}>
                    <div style={{ fontSize: '28px' }}>{badge.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>{badge.name}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>{earned ? '✓' : '🔒'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Full track view */
            <div style={s.tracksWrap}>
              {TRACKS.map(track => (
                <div key={track.id} style={s.track}>
                  <div style={s.trackLabel}>
                    <span style={{ fontSize: '18px' }}>{track.icon}</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{track.name}</span>
                  </div>
                  <div style={s.trackSteps}>
                    {track.badges.map((badge, i) => {
                      const earned = earnedSet.has(badge.id);
                      const prevEarned = i === 0 || earnedSet.has(track.badges[i - 1].id);
                      const isNext = !earned && prevEarned;
                      return (
                        <React.Fragment key={badge.id}>
                          {i > 0 && (
                            <div style={{
                              width: '32px', height: '3px', alignSelf: 'center',
                              background: earnedSet.has(track.badges[i - 1].id) ? TIER_COLOR[badge.tier] : '#e2e8f0',
                              borderRadius: '2px', flexShrink: 0,
                            }} />
                          )}
                          <div style={{
                            ...s.badgeStep,
                            background: earned ? '#f0fdf4' : isNext ? '#fefce8' : '#f8fafc',
                            border: `2px solid ${earned ? TIER_COLOR[badge.tier] : isNext ? '#fbbf24' : '#e2e8f0'}`,
                            boxShadow: earned ? `0 0 0 3px ${TIER_COLOR[badge.tier]}22` : 'none',
                          }}>
                            <div style={{ fontSize: '26px' }}>{badge.emoji}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginTop: '4px' }}>{badge.name}</div>
                            <div style={{ fontSize: '10px', color: earned ? TIER_COLOR[badge.tier] : '#94a3b8', marginTop: '2px', fontWeight: '600' }}>
                              {earned ? (badge.tier === 'plat' ? '💎 Platinum' : badge.tier === 'gold' ? '🥇 Gold' : '✓ Done') : (isNext ? `→ ${badge.threshold}` : badge.threshold)}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 16px' }}>
            Want to challenge {profile.displayName}? Join our chess community!
          </p>
          <Link to="/login" style={{ ...s.shareBtn, display: 'inline-block', textDecoration: 'none', marginRight: '12px' }}>Log In</Link>
          <Link to="/signup" style={{ ...s.shareBtn, display: 'inline-block', textDecoration: 'none', background: '#10b981' }}>Sign Up Free</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  topBar: {
    maxWidth: '860px',
    margin: '0 auto 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
  },
  shareBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  card: {
    maxWidth: '860px',
    margin: '0 auto',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  heroSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  avatarWrap: {
    width: '90px',
    height: '90px',
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarInitials: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#fff',
  },
  heroText: {
    flex: 1,
    minWidth: '160px',
  },
  heroName: {
    fontSize: 'clamp(22px, 5vw, 32px)',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 8px',
  },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.07)',
    color: '#cbd5e1',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: '500',
    marginRight: '8px',
    marginBottom: '6px',
  },
  platformsRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  platformLink: {
    display: 'inline-block',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '13px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  badgeSection: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '24px',
  },
  badgeSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: 0,
  },
  badgeCount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.06)',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  showAllBtn: {
    background: 'rgba(99,102,241,0.2)',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  badgePreviewRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  badgePreviewItem: {
    width: '90px',
    textAlign: 'center',
    padding: '12px 8px',
    borderRadius: '12px',
    border: '2px solid transparent',
    cursor: 'default',
  },
  badgeEarned: {
    background: 'rgba(16,185,129,0.1)',
    border: '2px solid rgba(16,185,129,0.3)',
    color: '#a7f3d0',
  },
  badgeLocked: {
    background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.06)',
    color: '#475569',
    opacity: 0.6,
  },
  tracksWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  track: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  trackLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  trackSteps: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '4px',
    flexWrap: 'wrap',
  },
  badgeStep: {
    width: '110px',
    padding: '12px 8px',
    borderRadius: '12px',
    textAlign: 'center',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
};
