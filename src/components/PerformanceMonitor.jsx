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

const PerformanceMonitor = ({ user, publicTrainingStats = null, publicArenaSummary = null }) => {
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
    // Public/shared dashboards can't call the login-only range endpoint.
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
  }, [user, statsRange, publicTrainingStats]);

  // Fetch Monthly Focus data — all current focuses + per-focus user stats
  useEffect(() => {
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
  }, [user]);

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

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Top Section: Two Columns with Equal Height */}
        <div style={styles.topSection}>
          {/* Left Column: Highest Points */}
          <div style={styles.column}>
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
          </div>

          {/* Right Column: Daily Puzzle Stats & Puzzle Rating */}
          <div style={styles.column}>
            <h3 style={styles.columnTitle}>🧩 Today's Daily Puzzles</h3>
            
            {/* Daily Puzzle Progress with Circles */}
            <div style={styles.dailyPuzzleCard}>
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
            </div>

            {/* Puzzle Rating */}
            <div style={styles.puzzleRatingCard}>
              <div style={{ fontSize: 'clamp(24px, 6vw, 32px)', filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.3))' }}>
                🧩
              </div>
              <div style={{ flex: 1, marginLeft: 'clamp(12px, 3vw, 16px)' }}>
                <div style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Puzzle Rating
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: '700', color: 'var(--obsidian-text-soft, #dbeafe)' }}>
                    {rangeStats?.rating ?? (user?.liveRating || 1200)}
                  </div>
                  {(() => {
                    const trend = rangeStats?.trend || 0;
                    const up = trend > 0;
                    const color = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))';
                    return (
                      <span style={{ fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: 700, color }}>
                        {rangeStatsLoading ? '…' : trend === 0 ? '▬ no change' : `${up ? '▲ +' : '▼ '}${trend}`}
                        {!rangeStatsLoading && trend !== 0 && (
                          <span style={{ fontWeight: 500, color: 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))', marginLeft: '4px' }}>
                            ({statsRange === '7d' ? '7d' : '24h'})
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Puzzle Stats card (above Arena Tournament Summary) ── */}
        <div style={styles.fullWidthSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h3 style={{ ...styles.columnTitle, margin: 0 }}>🧩 Puzzle Stats</h3>
            <div style={{ display: 'inline-flex', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid var(--obsidian-border, rgba(148, 163, 184, 0.16))', borderRadius: '10px', padding: '3px' }}>
              {[
                { id: '24h', label: '24 hrs' },
                { id: '7d', label: '7 days' },
              ].map(opt => {
                const active = statsRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatsRange(opt.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      transition: 'all 0.2s ease',
                      background: active ? 'linear-gradient(135deg, #06b6d4, #10b981)' : 'transparent',
                      color: active ? '#04201f' : 'var(--obsidian-text-muted, rgba(203, 213, 225, 0.74))',
                      boxShadow: active ? '0 4px 12px rgba(6,182,212,0.3)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.ratingCard}>
            {(() => {
              const rs = rangeStats || {};
              const dash = rangeStatsLoading ? '…' : '—';
              const val = (n) => (rangeStatsLoading || rs.attempts == null ? dash : n);
              return (
                <div style={{ ...styles.ratingGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))' }}>
                  {/* Puzzles done */}
                  <div style={styles.ratingItem}>
                    <div style={styles.ratingLabel}>Puzzles Done</div>
                    <div style={styles.ratingValue}>{val(rs.attempts)}</div>
                  </div>
                  {/* Solved */}
                  <div style={styles.ratingItem}>
                    <div style={styles.ratingLabel}>Solved</div>
                    <div style={{ ...styles.ratingValue, color: '#22c55e' }}>{val(rs.solved)}</div>
                  </div>
                  {/* Failed */}
                  <div style={styles.ratingItem}>
                    <div style={styles.ratingLabel}>Failed</div>
                    <div style={{ ...styles.ratingValue, color: '#ef4444' }}>{val(rs.failed)}</div>
                  </div>
                  {/* Accuracy + latest streak */}
                  <div style={styles.ratingItem}>
                    <div style={styles.ratingLabel}>Accuracy</div>
                    <div style={styles.ratingValue}>{rangeStatsLoading || rs.attempts == null ? dash : `${rs.accuracy}%`}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                      🔥 {rangeStatsLoading ? '…' : `${rs.streak || 0} streak`}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={styles.fullWidthSection}>
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
        </div>

        {/* Monthly Focus Challenge Section */}
        {(() => {
          const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

          if (focusLoading) {
            return (
              <div style={styles.focusCard}>
                <div style={styles.mfHeader}>
                  <div style={styles.mfHeaderLeft}>
                    <span style={{ fontSize: '22px' }}>🎯</span>
                    <div>
                      <h3 style={styles.mfTitle}>Monthly Focus Challenge</h3>
                      <p style={styles.mfMonth}>{currentMonthLabel}</p>
                    </div>
                  </div>
                </div>
                <div style={styles.focusEmptyState}>Loading focus data...</div>
              </div>
            );
          }

          const focuses = focusData?.focuses || [];
          const statsMap = focusData?.statsMap || {};

          const isOfficial = f => !f.createdBy || f.createdBy?.role === 'admin';
          const officialFocuses   = focuses.filter(isOfficial);
          const eliteFocuses      = focuses.filter(f => !isOfficial(f));
          const officialWithStats = officialFocuses.filter(f => statsMap[f._id]);
          const eliteWithStats    = eliteFocuses.filter(f => statsMap[f._id]);
          const tableRows         = [...officialWithStats, ...eliteWithStats];

          const hasAnything = officialFocuses.length > 0 || tableRows.length > 0;
          if (!hasAnything) {
            return (
              <div style={styles.focusCard}>
                <div style={styles.mfHeader}>
                  <div style={styles.mfHeaderLeft}>
                    <span style={{ fontSize: '22px' }}>🎯</span>
                    <div>
                      <h3 style={styles.mfTitle}>Monthly Focus Challenge</h3>
                      <p style={styles.mfMonth}>{currentMonthLabel}</p>
                    </div>
                  </div>
                  <Link to="/monthly-focus" style={styles.mfViewAll}>View All →</Link>
                </div>
                <div style={styles.focusEmptyState}>No Monthly Focus challenge active this month.</div>
              </div>
            );
          }

          return (
            <div style={styles.focusCard}>
              {/* Header */}
              <div style={styles.mfHeader}>
                <div style={styles.mfHeaderLeft}>
                  <span style={{ fontSize: '22px' }}>🎯</span>
                  <div>
                    <h3 style={styles.mfTitle}>Monthly Focus Challenge</h3>
                    <p style={styles.mfMonth}>{currentMonthLabel}</p>
                  </div>
                </div>
                <Link to="/monthly-focus" style={styles.mfViewAll}>View All →</Link>
              </div>

              {/* Official challenge played by user — horizontal stat cards */}
              {officialWithStats.map(focus => {
                const s = statsMap[focus._id];
                const badge = getMFBadge(s.completedDays, s.perfectDays);
                return (
                  <div key={focus._id} style={styles.mfOfficialBlock}>
                    <div style={styles.mfOfficialLabel}>🏛️ ChessNexus Official</div>
                    <div style={styles.mfOfficialFocusName}>{focus.title}</div>
                    <div style={styles.mfStatCards}>
                      <div style={{ ...styles.mfStatCard, borderColor: 'rgba(245,158,11,0.3)' }}>
                        <div style={styles.mfStatCardIcon}>🏅</div>
                        <div style={{ ...styles.mfStatCardValue, color: '#f59e0b' }}>{s.rank ? `#${s.rank}` : '—'}</div>
                        <div style={styles.mfStatCardLabel}>Rank</div>
                      </div>
                      <div style={{ ...styles.mfStatCard, borderColor: 'rgba(6,182,212,0.3)' }}>
                        <div style={styles.mfStatCardIcon}>⚡</div>
                        <div style={{ ...styles.mfStatCardValue, color: '#06b6d4' }}>{s.focusXp ?? 0}</div>
                        <div style={styles.mfStatCardLabel}>XP</div>
                      </div>
                      <div style={{ ...styles.mfStatCard, borderColor: 'rgba(129,140,248,0.3)' }}>
                        <div style={styles.mfStatCardIcon}>🧠</div>
                        <div style={{ ...styles.mfStatCardValue, color: '#818cf8' }}>{s.skillScore ?? 0}</div>
                        <div style={styles.mfStatCardLabel}>Skill Score</div>
                      </div>
                      <div style={{ ...styles.mfStatCard, borderColor: 'rgba(16,185,129,0.3)' }}>
                        <div style={styles.mfStatCardIcon}>🎖️</div>
                        <div style={{ ...styles.mfStatCardValue, color: '#10b981', fontSize: 'clamp(12px, 2.8vw, 14px)' }}>
                          {badge ? `${badge.emoji} ${badge.name}` : '—'}
                        </div>
                        <div style={styles.mfStatCardLabel}>Badge</div>
                      </div>
                      <div style={{ ...styles.mfStatCard, borderColor: 'rgba(232,121,249,0.3)' }}>
                        <div style={styles.mfStatCardIcon}>✨</div>
                        <div style={{ ...styles.mfStatCardValue, color: '#e879f9' }}>{s.perfectDays ?? 0}</div>
                        <div style={styles.mfStatCardLabel}>Perfect Days</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Invite to join if official is active but user hasn't played */}
              {officialWithStats.length === 0 && officialFocuses.length > 0 && (
                <div style={styles.mfJoinInvite}>
                  <span>🏛️ An official Monthly Focus challenge is active this month!</span>
                  <Link to="/monthly-focus" style={styles.mfJoinLink}>Join now →</Link>
                </div>
              )}

              {/* Table: all participated focuses (official first, then elite) */}
              {tableRows.length > 0 && (
                <div style={styles.mfTableWrap}>
                  <table style={styles.mfTable}>
                    <thead>
                      <tr style={{ background: 'rgba(6,182,212,0.08)' }}>
                        {['Focus Name', 'Rank', 'XP', 'Skill Score', 'Badge'].map(h => (
                          <th key={h} style={{
                            padding: '10px 14px',
                            textAlign: h === 'Focus Name' ? 'left' : 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.6px',
                            color: 'var(--obsidian-text-muted, rgba(203,213,225,0.74))',
                            borderBottom: '1px solid rgba(148,163,184,0.16)',
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((focus, idx) => {
                        const s = statsMap[focus._id];
                        const off = isOfficial(focus);
                        const badge = getMFBadge(s.completedDays, s.perfectDays);
                        const creator = off ? 'ChessNexus' : (focus.createdBy?.displayName || focus.createdBy?.username || 'Elite');
                        return (
                          <tr key={focus._id} style={{
                            background: off ? 'rgba(251,191,36,0.05)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                            borderBottom: '1px solid rgba(148,163,184,0.10)',
                          }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {off && <span title="ChessNexus Official">🏛️</span>}
                                <div>
                                  <div style={{ fontWeight: '600', color: 'var(--obsidian-text-soft, #dbeafe)', fontSize: 'clamp(12px,2.8vw,14px)' }}>
                                    {focus.title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--obsidian-text-muted, rgba(203,213,225,0.6))' }}>
                                    by {creator}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#f59e0b' }}>
                              {s.rank ? `#${s.rank}` : '—'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#06b6d4' }}>
                              {s.focusXp ?? 0}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#818cf8' }}>
                              {s.skillScore ?? 0}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>
                              {badge ? `${badge.emoji} ${badge.name}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <DetailedRaceStatsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        raceType={selectedRaceType}
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