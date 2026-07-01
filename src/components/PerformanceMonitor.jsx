import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import DetailedRaceStatsModal from './DetailedRaceStatsModal';

// Human-readable labels for the arena tournament formats.
const TOURNAMENT_TYPE_LABELS = {
  standard: 'Standard',
  chess960: 'Chess960',
  bullet_blitz_marathon: 'Bullet · Blitz Marathon',
  team_battle: 'Team Battle',
};
const formatTypeLabel = (t) => TOURNAMENT_TYPE_LABELS[t] || 'Standard';

// Tiny inline sparkline for the puzzle stat cards. Renders a smooth-ish area
// line of `data` (array of numbers) — progress over the selected window's
// buckets (hours for 24h, days for 7d). No axes/labels, just the trend shape.
function Sparkline({ data, color = '#a78bfa', width = 96, height = 26, fill = false }) {
  if (!Array.isArray(data) || data.length < 2) return null;
  // For the min/max we ignore a flat baseline so a real line still shows.
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const y = (v) => height - 2 - ((v - min) / span) * (height - 4); // 2px padding top/bottom
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const gid = `spark-${color.replace('#', '')}-${data.length}-${Math.round(max)}`;
  return (
    <svg
      width={fill ? '100%' : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', margin: fill ? '0' : '6px auto 0', overflow: 'visible', width: fill ? '100%' : undefined }}
      preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
    padding: '0 16px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  contentWrapper: {
    background: 'var(--obsidian-surface-elevated, rgba(23, 23, 23, 0.7))',
    borderRadius: '20px',
    boxShadow: 'var(--obsidian-shadow, 0 8px 32px rgba(0, 0, 0, 0.5))',
    padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 28px)',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    backdropFilter: 'blur(10px)',
  },
  topSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: '24px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
  },
  columnTitle: {
    fontSize: 'clamp(16px, 4vw, 18px)',
    fontWeight: '600',
    color: 'var(--obsidian-text-soft, #dbeafe)',
    margin: '0 0 8px 0',
    letterSpacing: '0.02em',
  },
  highestPointCard: {
    background: 'var(--obsidian-panel, linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)))',
    borderRadius: '18px',
    padding: 'clamp(16px, 3vw, 20px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.28)',
    backdropFilter: 'blur(10px)',
  },
  highestPointIcon: {
    fontSize: 'clamp(24px, 6vw, 32px)',
    filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))',
  },
  highestPointLabel: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    marginBottom: '4px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  highestPointValue: {
    fontSize: 'clamp(22px, 5vw, 28px)',
    fontWeight: '700',
    color: 'var(--obsidian-text, #f8fafc)',
  },
  detailsHint: {
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    color: 'var(--obsidian-accent, #7dd3fc)',
    marginTop: '8px',
    fontWeight: '500',
  },
  dailyPuzzleCard: {
    background: 'var(--obsidian-panel, linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)))',
    borderRadius: '18px',
    padding: 'clamp(16px, 4vw, 24px)',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.22)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  dailyPuzzleHeader: {
    fontSize: 'clamp(13px, 3vw, 15px)',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  statsCirclesContainer: {
    display: 'flex',
    gap: 'clamp(16px, 4vw, 24px)',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statCircle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  circleWrapper: {
    position: 'relative',
    width: 'clamp(80px, 20vw, 100px)',
    height: 'clamp(80px, 20vw, 100px)',
  },
  circleSvg: {
    transform: 'rotate(-90deg)',
    width: '100%',
    height: '100%',
  },
  circleBackground: {
    fill: 'none',
    stroke: 'rgba(148, 163, 184, 0.18)',
    strokeWidth: '8',
  },
  circleProgress: {
    fill: 'none',
    strokeWidth: '8',
    strokeLinecap: 'round',
    transition: 'stroke-dashoffset 0.5s ease',
  },
  circleText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 'clamp(24px, 6vw, 32px)',
    fontWeight: '800',
  },
  circleLabel: {
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  ratingCard: {
    background: 'var(--obsidian-panel, linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)))',
    borderRadius: '18px',
    padding: 'clamp(16px, 3vw, 20px)',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.22)',
    backdropFilter: 'blur(10px)',
  },
  ratingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  ratingItem: {
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '12px',
    padding: 'clamp(12px, 3vw, 16px)',
    textAlign: 'center',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    transition: 'all 0.3s ease',
  },
  crownValue: {
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: '700',
  },
  ratingLabel: {
    fontSize: 'clamp(10px, 2.5vw, 11px)',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    marginBottom: '6px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  ratingValue: {
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: '700',
    color: 'var(--obsidian-text-soft, #dbeafe)',
  },
  puzzleRatingCard: {
    background: 'var(--obsidian-panel, linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)))',
    borderRadius: '18px',
    padding: 'clamp(16px, 3vw, 20px)',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.22)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
  },
  fullWidthSection: {
    marginTop: '24px',
  },
  focusCard: {
    background: 'var(--obsidian-panel, linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)))',
    borderRadius: '18px',
    padding: 'clamp(16px, 3vw, 24px)',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
    boxShadow: '0 12px 30px rgba(2, 6, 23, 0.22)',
    backdropFilter: 'blur(10px)',
    marginTop: '24px',
  },
  focusCardTitle: {
    fontSize: 'clamp(16px, 4vw, 18px)',
    fontWeight: '600',
    color: 'var(--obsidian-text-soft, #dbeafe)',
    margin: '0 0 4px 0',
  },
  focusSubtitle: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    marginBottom: '16px',
  },
  focusStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
    gap: '12px',
  },
  focusStatItem: {
    background: 'rgba(168, 85, 247, 0.1)',
    borderRadius: '12px',
    padding: 'clamp(12px, 3vw, 16px)',
    textAlign: 'center',
    border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))',
  },
  focusStatLabel: {
    fontSize: 'clamp(10px, 2.5vw, 11px)',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    marginBottom: '6px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  focusStatValue: {
    fontSize: 'clamp(18px, 4vw, 22px)',
    fontWeight: '700',
    color: 'var(--obsidian-text, #f8fafc)',
  },
  focusEmptyState: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
    fontSize: 'clamp(13px, 3vw, 14px)',
  },
  focusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: 'clamp(10px, 2.5vw, 11px)',
    fontWeight: '600',
    letterSpacing: '0.5px',
    marginLeft: '8px',
    verticalAlign: 'middle',
  },
  // ── Enhanced Monthly Focus styles ──────────────────────────────
  mfHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '4px',
  },
  mfHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mfTitle: {
    fontSize: 'clamp(16px, 4vw, 18px)',
    fontWeight: '700',
    color: 'var(--obsidian-text-soft, #dbeafe)',
    margin: 0,
  },
  mfMonth: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))',
    margin: '2px 0 0 0',
  },
  mfViewAll: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: 'var(--obsidian-accent, #7dd3fc)',
    textDecoration: 'none',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  mfOfficialBlock: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(251,191,36,0.07)',
    borderRadius: '14px',
    border: '1px solid rgba(251,191,36,0.2)',
  },
  mfOfficialLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#fbbf24',
    marginBottom: '4px',
  },
  mfOfficialFocusName: {
    fontSize: 'clamp(13px, 3vw, 15px)',
    fontWeight: '600',
    color: 'var(--obsidian-text-soft, #dbeafe)',
    marginBottom: '14px',
  },
  mfStatCards: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  mfStatCard: {
    flex: '1 1 90px',
    minWidth: '80px',
    background: 'rgba(23,23,23,0.6)',
    borderRadius: '12px',
    padding: '12px 10px',
    textAlign: 'center',
    border: '1px solid rgba(148,163,184,0.16)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  mfStatCardIcon: {
    fontSize: '18px',
  },
  mfStatCardValue: {
    fontSize: 'clamp(14px, 3.5vw, 18px)',
    fontWeight: '700',
    color: 'var(--obsidian-text, #f8fafc)',
    lineHeight: 1.2,
  },
  mfStatCardLabel: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))',
  },
  mfJoinInvite: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    padding: '12px 16px',
    background: 'rgba(99,102,241,0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(99,102,241,0.25)',
    fontSize: 'clamp(12px, 2.8vw, 14px)',
    color: 'var(--obsidian-text-soft, #dbeafe)',
  },
  mfJoinLink: {
    color: '#818cf8',
    fontWeight: '700',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  mfTableWrap: {
    marginTop: '16px',
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,0.16)',
  },
  mfTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(12px, 2.8vw, 14px)',
  },
};

// ── Monthly Focus badge helper ────────────────────────────────────────────────
function getMFBadge(completedDays, perfectDays) {
  if (!completedDays || completedDays === 0) return null;
  if (completedDays >= 7 && perfectDays >= 5) return { emoji: '🏆', name: 'Champion' };
  if (perfectDays >= 5) return { emoji: '👑', name: 'Perfect' };
  if (completedDays >= 7) return { emoji: '🎯', name: 'Achiever' };
  if (completedDays >= 5) return { emoji: '🔥', name: 'Dedicated' };
  if (completedDays >= 3) return { emoji: '⭐', name: 'Active' };
  return { emoji: '🌱', name: 'Beginner' };
}

const PerformanceMonitor = ({ user, publicTrainingStats = null, publicArenaSummary = null, publicMonthlyFocus = null, publicPuzzleStatsRange = null, viewedDisplayName = null, section = 'all' }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRaceType, setSelectedRaceType] = useState(null);
  // Puzzle Stats card time range: '24h' | '7d'
  const [statsRange, setStatsRange] = useState('24h');
  const [rangeStats, setRangeStats] = useState(null);
  const [rangeStatsLoading, setRangeStatsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState(publicTrainingStats || { correct: 0, wrong: 0 });
  const [focusData, setFocusData] = useState(null);
  const [focusLoading, setFocusLoading] = useState(true);
  const [arenaSummary, setArenaSummary] = useState(publicArenaSummary || {
    totalTournaments: 0,
    totalGamesPlayed: 0,
    arenaCrownTier: 'none',
    arenaCarryPoints: 0,
    arenaCarryPointsExpiry: null,
  });

  // Fetch daily puzzle stats
  useEffect(() => {
    if (publicTrainingStats) {
      setDailyStats(publicTrainingStats);
      return;
    }
    const fetchDailyStats = async () => {
      try {
        const res = await api.get('/api/public/training/state');
        if (res.data.stats) {
          setDailyStats({
            correct: res.data.stats.correct || 0,
            wrong: res.data.stats.wrong || 0
          });
        }
      } catch (err) {
        // If error, keep default 0/0
      }
    };

    if (user) {
      fetchDailyStats();
    }
  }, [user, publicTrainingStats]);

  // Fetch Puzzle Stats for the selected range (24h / 7d). Re-runs on toggle.
  useEffect(() => {
    let alive = true;
    // Spectator view: the range endpoint is viewer-scoped, so use the viewed
    // user's pre-computed range stats from the public profile payload instead.
    if (publicPuzzleStatsRange) {
      setRangeStats(publicPuzzleStatsRange[statsRange] || null);
      setRangeStatsLoading(false);
      return;
    }
    // Public/shared dashboards (no range data) can't call the login-only endpoint.
    if (publicTrainingStats) { setRangeStatsLoading(false); return; }
    const fetchRangeStats = async () => {
      setRangeStatsLoading(true);
      try {
        const res = await api.get(`/api/public/puzzle-stats/range?range=${statsRange}`);
        if (alive) setRangeStats(res.data);
      } catch (err) {
        if (alive) setRangeStats(null);
      } finally {
        if (alive) setRangeStatsLoading(false);
      }
    };
    if (user) fetchRangeStats();
    return () => { alive = false; };
  }, [user, statsRange, publicTrainingStats, publicPuzzleStatsRange]);

  // Fetch Monthly Focus data — all current focuses + per-focus user stats.
  // In spectator view (publicMonthlyFocus provided) use the VIEWED user's stats
  // straight from the public profile payload instead of fetching, which would
  // otherwise return the logged-in viewer's own stats.
  useEffect(() => {
    if (publicMonthlyFocus) {
      setFocusData(publicMonthlyFocus);
      setFocusLoading(false);
      return;
    }
    let alive = true;
    const fetchFocusData = async () => {
      setFocusLoading(true);
      try {
        const cur = await api.get('/api/public/monthly-focus/current');
        const focuses = cur.data.focuses || (cur.data.focus ? [cur.data.focus] : []);
        if (!focuses.length) {
          if (alive) setFocusData({ focuses: [], statsMap: {} });
          return;
        }
        const statsArr = await Promise.all(
          focuses.map(f =>
            api.get(`/api/public/monthly-focus/leaderboard?focusId=${f._id}`)
              .then(r => ({ focusId: f._id, stats: r.data.userStats }))
              .catch(() => ({ focusId: f._id, stats: null }))
          )
        );
        const statsMap = {};
        statsArr.forEach(s => { statsMap[s.focusId] = s.stats; });
        if (alive) setFocusData({ focuses, statsMap });
      } catch {
        if (alive) setFocusData({ focuses: [], statsMap: {} });
      } finally {
        if (alive) setFocusLoading(false);
      }
    };
    if (user) {
      fetchFocusData();
    }
    return () => { alive = false; };
  }, [user, publicMonthlyFocus]);

  // Fetch Arena Tournament summary
  useEffect(() => {
    if (publicArenaSummary) {
      setArenaSummary(publicArenaSummary);
      return;
    }
    const fetchArenaSummary = async () => {
      try {
        const res = await api.get('/api/arenatournament/my-tournaments');
        if (res.data.summary) {
          setArenaSummary(res.data.summary);
        }
      } catch (err) {
        setArenaSummary({
          totalTournaments: 0,
          totalGamesPlayed: 0,
          arenaCrownTier: 'none',
          arenaCarryPoints: 0,
          arenaCarryPointsExpiry: null,
        });
      }
    };

    if (user) {
      fetchArenaSummary();
    }
  }, [user, publicArenaSummary]);

  const highestPoints = {
    timedRace: user?.highestTimedRaceScore || 0,
    arenaRace: user?.highestArenaRaceScore || 0,
    teamRace: user?.highestTeamRaceScore || 0,
  };

  const getCrownStyle = (tier) => {
    const base = {
      ...styles.crownValue,
      color: 'var(--obsidian-text-soft, #dbeafe)'
    };
    if (tier === 'gold') return { ...base, color: '#f59e0b' };
    if (tier === 'platinum') return { ...base, color: '#8b5cf6' };
    if (tier === 'gem') return { ...base, color: '#38bdf8' };
    return base;
  };

  const openDetailedStats = (raceType) => {
    setSelectedRaceType(raceType);
    setModalOpen(true);
  };

  // Calculate progress circles
  const totalPuzzles = dailyStats.correct + dailyStats.wrong;
  const maxPuzzles = 5;
  const correctPercentage = (dailyStats.correct / maxPuzzles) * 100;
  const wrongPercentage = (dailyStats.wrong / maxPuzzles) * 100;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const correctOffset = circumference - (correctPercentage / 100) * circumference;
  const wrongOffset = circumference - (wrongPercentage / 100) * circumference;

  const showOverview = section === 'all' || section === 'overview';
  const showPractice = section === 'all' || section === 'practice';
  const showPuzzleStats = showPractice || section === 'puzzlestats';
  const showRacePoints = showPractice && section !== 'puzzlestats';
  // daily puzzle circles: shown standalone OR in 'all' mode, NOT in 'overview' (moved to 40% panel)
  const showDailyPuzzle = section === 'dailypuzzle' || section === 'all';

  // ── Daily Puzzle standalone card ─────────────────────────────────────────
  if (section === 'dailypuzzle') {
    const totalPuzzlesDp = dailyStats.correct + dailyStats.wrong;
    const radiusDp = 42;
    const circumferenceDp = 2 * Math.PI * radiusDp;
    const correctOffsetDp = circumferenceDp - ((dailyStats.correct / 5) * circumferenceDp);
    const wrongOffsetDp   = circumferenceDp - ((dailyStats.wrong   / 5) * circumferenceDp);
    return (
      <div style={{ padding: 'clamp(16px,4vw,24px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Header */}
        <h3 style={{ ...styles.columnTitle, marginBottom: 14 }}>🧩 Today's Daily Puzzles</h3>
        <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))', textAlign: 'center', marginBottom: 16, lineHeight: 1.5 }}>
          {totalPuzzlesDp >= 5 ? "🎉 You've finished your daily batch of 5 puzzles!"
            : totalPuzzlesDp > 0 ? `📈 Progress: ${totalPuzzlesDp}/5 puzzles completed`
            : '🚀 Start your daily puzzles!'}
        </div>
        {/* Two halves with a divider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          {/* Correct */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ position: 'relative', width: 'clamp(72px,18vw,96px)', height: 'clamp(72px,18vw,96px)' }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radiusDp} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
                <circle cx="50" cy="50" r={radiusDp} fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumferenceDp} strokeDashoffset={correctOffsetDp} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, color: '#10b981' }}>
                {dailyStats.correct}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981' }}>Correct</span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 90, background: 'var(--obsidian-border, rgba(148,163,184,0.16))', flexShrink: 0 }} />

          {/* Wrong */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ position: 'relative', width: 'clamp(72px,18vw,96px)', height: 'clamp(72px,18vw,96px)' }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radiusDp} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
                <circle cx="50" cy="50" r={radiusDp} fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumferenceDp} strokeDashoffset={wrongOffsetDp} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, color: '#ef4444' }}>
                {dailyStats.wrong}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ef4444' }}>Wrong</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={section !== 'all' ? { ...styles.container, margin: 0, padding: 0 } : styles.container}>
      <div style={section !== 'all' ? { ...styles.contentWrapper, borderRadius: '24px', height: '100%' } : styles.contentWrapper}>
        {/* Top Section: Two Columns (race points left, daily puzzles right) */}
        <div style={styles.topSection}>
          {/* Left Column: Highest Points — practice tab only (not puzzlestats) */}
          {showRacePoints && <div style={styles.column}>
            <h3 style={styles.columnTitle}>🏆 Highest Race Points</h3>
            <div
              style={styles.highestPointCard}
              onClick={() => openDetailedStats('timedRace')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--obsidian-border, rgba(148, 163, 184, 0.16))';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(2, 6, 23, 0.28)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={styles.highestPointIcon}>🏃‍♂️</div>
                  <div>
                    <div style={styles.highestPointLabel}>Individual Race</div>
                    <div style={styles.highestPointValue}>{highestPoints.timedRace}</div>
                  </div>
                </div>
                <div style={styles.detailsHint}>Click for details →</div>
              </div>
            </div>
            <div
              style={styles.highestPointCard}
              onClick={() => openDetailedStats('arenaRace')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--obsidian-border, rgba(148, 163, 184, 0.16))';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(2, 6, 23, 0.28)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={styles.highestPointIcon}>🏟️</div>
                  <div>
                    <div style={styles.highestPointLabel}>Arena Race</div>
                    <div style={styles.highestPointValue}>{highestPoints.arenaRace}</div>
                  </div>
                </div>
                <div style={styles.detailsHint}>Click for details →</div>
              </div>
            </div>
            <div
              style={styles.highestPointCard}
              onClick={() => openDetailedStats('teamRace')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--obsidian-border, rgba(148, 163, 184, 0.16))';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(2, 6, 23, 0.28)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={styles.highestPointIcon}>👥</div>
                  <div>
                    <div style={styles.highestPointLabel}>Team Race</div>
                    <div style={styles.highestPointValue}>{highestPoints.teamRace}</div>
                  </div>
                </div>
                <div style={styles.detailsHint}>Click for details →</div>
              </div>
            </div>
          </div>}

          {/* Right Column: Puzzle Rating (overview) or Daily Puzzle standalone */}
          {(showOverview || showDailyPuzzle) && <div style={styles.column}>
            {showDailyPuzzle && <h3 style={styles.columnTitle}>🧩 Today's Daily Puzzles</h3>}

            {/* Daily Puzzle Progress with Circles */}
            {showDailyPuzzle && <div style={styles.dailyPuzzleCard}>
              <div style={styles.dailyPuzzleHeader}>
                {totalPuzzles >= 5 
                  ? "🎉 You've finished your daily batch of 5 puzzles!"
                  : totalPuzzles > 0
                  ? `📈 Progress: ${totalPuzzles}/5 puzzles completed`
                  : "🚀 Start your daily puzzles!"}
              </div>
              
              <div style={styles.statsCirclesContainer}>
                {/* Correct Circle */}
                <div style={styles.statCircle}>
                  <div style={styles.circleWrapper}>
                    <svg style={styles.circleSvg} viewBox="0 0 100 100">
                      <circle
                        style={styles.circleBackground}
                        cx="50"
                        cy="50"
                        r={radius}
                      />
                      <circle
                        style={{
                          ...styles.circleProgress,
                          stroke: '#10b981',
                          strokeDasharray: circumference,
                          strokeDashoffset: correctOffset,
                        }}
                        cx="50"
                        cy="50"
                        r={radius}
                      />
                    </svg>
                    <div style={{ ...styles.circleText, color: '#10b981' }}>
                      {dailyStats.correct}
                    </div>
                  </div>
                  <div style={{ ...styles.circleLabel, color: '#10b981' }}>
                    Correct
                  </div>
                </div>

                {/* Wrong Circle */}
                <div style={styles.statCircle}>
                  <div style={styles.circleWrapper}>
                    <svg style={styles.circleSvg} viewBox="0 0 100 100">
                      <circle
                        style={styles.circleBackground}
                        cx="50"
                        cy="50"
                        r={radius}
                      />
                      <circle
                        style={{
                          ...styles.circleProgress,
                          stroke: '#ef4444',
                          strokeDasharray: circumference,
                          strokeDashoffset: wrongOffset,
                        }}
                        cx="50"
                        cy="50"
                        r={radius}
                      />
                    </svg>
                    <div style={{ ...styles.circleText, color: '#ef4444' }}>
                      {dailyStats.wrong}
                    </div>
                  </div>
                  <div style={{ ...styles.circleLabel, color: '#ef4444' }}>
                    Wrong
                  </div>
                </div>
              </div>
            </div>}

          </div>}
        </div>


        {/* ── Arena Tournament Summary — overview tab only ── */}
        {showOverview && <div style={styles.fullWidthSection}>
          <h3 style={styles.columnTitle}>🏟️ Arena Tournament Summary</h3>
          <div style={styles.ratingCard}>
            <div style={styles.ratingGrid}>
              <div style={styles.ratingItem}>
                <div style={styles.ratingLabel}>Tournaments Played</div>
                <div style={styles.ratingValue}>{arenaSummary.totalTournaments}</div>
              </div>
              <div style={styles.ratingItem}>
                <div style={styles.ratingLabel}>Last Finish</div>
                {arenaSummary.lastFinish ? (
                  <>
                    <div style={styles.ratingValue}>#{arenaSummary.lastFinish.rank}</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#67e8f9', marginTop: '2px' }}>
                      {formatTypeLabel(arenaSummary.lastFinish.tournamentType)}
                    </div>
                  </>
                ) : (
                  <div style={styles.ratingValue}>—</div>
                )}
              </div>
              <div style={styles.ratingItem}>
                <div style={styles.ratingLabel}>Carry Bonus</div>
                <div style={styles.ratingValue}>
                  {arenaSummary.arenaCarryPoints > 0 ? `+${arenaSummary.arenaCarryPoints}` : 'None'}
                </div>
              </div>
              <div style={{ ...styles.ratingItem, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
                <Link
                  to={publicArenaSummary
                    ? `/arena-tournament-dashboard/${encodeURIComponent(user?.displayName || user?.username || '')}`
                    : '/arena-tournament-dashboard'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #06b6d4, #10b981)',
                    color: '#04201f',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 6px 18px rgba(6,182,212,0.3)',
                  }}
                >
                  🏟️ arena Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>}

      </div>

      <DetailedRaceStatsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        raceType={selectedRaceType}
        /* In public/spectate view, fetch the viewed user's stats (not the viewer's).
           publicArenaSummary is only set when spectating someone else's profile. */
        displayName={publicArenaSummary ? (user?.displayName || user?.username) : undefined}
        timeLimit={
          selectedRaceType === 'timedRace' ? 5 :
          selectedRaceType === 'arenaRace' ? 10 :
          selectedRaceType === 'teamRace' ? 30 : undefined
        }
      />
    </div>
  );
};

export default PerformanceMonitor;