import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import AboutFeatureCTA from '../components/marketing/AboutFeatureCTA';

function getCountdown(dateStr) {
  if (!dateStr) return 'Open now';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Open now';
  const totalMinutes = Math.floor(diff / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function RaceCard({ race, onJoin }) {
  const [countdown, setCountdown] = useState(() =>
    getCountdown(race.scheduledStartTime || race.plannedStartTime)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(getCountdown(race.scheduledStartTime || race.plannedStartTime));
    }, 30000);
    return () => clearInterval(t);
  }, [race.scheduledStartTime, race.plannedStartTime]);

  const isArena = race.type === 'arena';
  const title = race.name || race.raceName || 'Untitled Race';
  const isOpen = countdown === 'Open now';

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      border: `1px solid ${isArena ? 'rgba(245,158,11,0.25)' : 'rgba(139,92,246,0.25)'}`,
      borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            background: isArena ? 'rgba(245,158,11,0.18)' : 'rgba(139,92,246,0.18)',
            color: isArena ? '#fbbf24' : '#a78bfa',
            padding: '2px 9px', borderRadius: 20, marginBottom: 6,
          }}>
            {isArena ? '👑 Arena Race' : '👥 Team Race'}
          </span>
          <div style={{
            color: '#fff', fontWeight: 700, fontSize: 15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title.length > 24 ? title.slice(0, 24) + '…' : title}
          </div>
        </div>
        <button
          onClick={() => onJoin(race)}
          style={{
            marginLeft: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Join
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Topic</div>
          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {race.topic || '—'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Players</div>
          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
            {race.playerCount !== undefined ? race.playerCount : '—'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Starts in</div>
          <div style={{ fontSize: 12, color: isOpen ? '#10b981' : '#fbbf24', fontWeight: 700 }}>
            {countdown}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Race() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [loadingRaces, setLoadingRaces] = useState(true);

  async function fetchRaces() {
    setLoadingRaces(true);
    try {
      const [arenaRes, teamRes] = await Promise.all([
        api.get('/api/arena/public'),
        api.get('/api/team-race/upcoming'),
      ]);

      const arenaRaces = (arenaRes.data?.races || []).map(r => ({ ...r, type: 'arena' }));
      const teamRaces = Array.isArray(teamRes.data) ? teamRes.data : [];

      const combined = [...arenaRaces, ...teamRaces].sort((a, b) => {
        const aTime = a.plannedStartTime || a.scheduledStartTime;
        const bTime = b.plannedStartTime || b.scheduledStartTime;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(aTime) - new Date(bTime);
      });

      setRaces(combined.slice(0, 4));
    } catch (err) {
      console.error('Failed to fetch upcoming races', err);
      setRaces([]);
    } finally {
      setLoadingRaces(false);
    }
  }

  useEffect(() => {
    fetchRaces();
    const interval = setInterval(fetchRaces, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleJoin(race) {
    if (race.type === 'arena') {
      try {
        const res = await api.post('/api/arena/join', { roomId: race.roomId });
        const status = res.data.status || race.status;
        if (status === 'active') {
          navigate(`/arena/race/${race.roomId}`);
        } else {
          navigate(`/arena/waiting/${race.roomId}`);
        }
      } catch {
        // fallback: use the race status we already know
        if (race.status === 'active') {
          navigate(`/arena/race/${race.roomId}`);
        } else {
          navigate(`/arena/waiting/${race.roomId}`);
        }
      }
    } else {
      navigate(`/team-race/${race._id}/teams`);
    }
  }

  return (
    <div style={styles.container} className="race-page-wrapper">
      <div style={styles.background}></div>
      <style>
        {`
          .race-page-wrapper,
          .race-page-wrapper *,
          .race-page-wrapper *::before,
          .race-page-wrapper *::after {
            box-sizing: border-box;
          }
          .content-grid {
            width: 100%;
            max-width: 1400px;
          }
          .board-section,
          .menu-section {
            min-width: 0;
          }
          .race-mode-card {
            box-sizing: border-box;
            width: 100%;
          }
          /* ── Tablet (≤ 900px): stack columns ── */
          @media (max-width: 900px) {
            .content-grid {
              grid-template-columns: 1fr !important;
              gap: 14px !important;
            }
            .board-section { order: 1; }
            .menu-section  { order: 2; }
          }
          /* ── Mobile (≤ 600px): tighten padding ── */
          @media (max-width: 600px) {
            .race-page-wrapper {
              padding: 10px 8px !important;
              align-items: flex-start !important;
            }
            .board-glass-card {
              padding: 10px 10px 14px !important;
            }
            .race-mode-card {
              padding: 14px 14px !important;
            }
            .race-mode-title {
              font-size: 15px !important;
            }
            .race-mode-desc {
              font-size: 12px !important;
            }
            .race-stat-number {
              font-size: 22px !important;
            }
          }
          /* ── Small phone (≤ 400px) ── */
          @media (max-width: 400px) {
            .race-page-wrapper {
              padding: 8px 6px !important;
            }
            .board-glass-card {
              padding: 8px 8px 12px !important;
            }
            .race-mode-card {
              padding: 12px 10px !important;
            }
          }
        `}
      </style>

      <div style={styles.contentGrid} className="content-grid">
        <div style={styles.glassCard} className="board-section board-glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ffffff' }}>🏁 Upcoming Races</h2>
            <button
              onClick={fetchRaces}
              disabled={loadingRaces}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, lineHeight: 1, transition: 'color 0.2s' }}
              title="Refresh"
              onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
            >↻</button>
          </div>

          {loadingRaces ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '50px 0', fontSize: 14 }}>
              Loading races...
            </div>
          ) : races.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '50px 0', fontSize: 14, lineHeight: 1.8 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
              No upcoming races right now.<br />Check back soon!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {races.map(race => (
                <RaceCard key={race._id || race.roomId} race={race} onJoin={handleJoin} />
              ))}
            </div>
          )}

        </div>

        <div style={styles.menuSection} className="menu-section">
          <div style={styles.glassCard}>
            <h2 style={styles.menuTitle}>Select Race Mode</h2>
          </div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/choose-topic" style={styles.modeCard} className="race-mode-card">
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode1}}>⚡</div>
                <h3 style={styles.modeTitle} className="race-mode-title">Individual Race</h3>
              </div>
              <p style={styles.modeDesc} className="race-mode-desc">Timed puzzles with topic selection</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/arena" style={styles.modeCard} className="race-mode-card">
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode2}}>👑</div>
                <h3 style={styles.modeTitle} className="race-mode-title">Arena Race</h3>
              </div>
              <p style={styles.modeDesc} className="race-mode-desc">Join competitive arena matches</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/team-race" style={styles.modeCard} className="race-mode-card">
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode3}}>👥</div>
                <h3 style={styles.modeTitle} className="race-mode-title">Team Race</h3>
              </div>
              <p style={styles.modeDesc} className="race-mode-desc">Compete with your team</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, zIndex: 1 }}>
        <AboutFeatureCTA
          links={[{ label: "About Race Hub", to: "/chess-tactics-race" }]}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#0a0a0a',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px',
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  glassCard: {
    background: 'rgba(23, 23, 23, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    padding: '24px 28px 28px 28px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  menuSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  menuTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  modeCard: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '22px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
    textDecoration: 'none',
  },
  modeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px',
  },
  modeIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    flexShrink: 0,
  },
  mode1: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.15))',
  },
  mode2: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.15))',
  },
  mode3: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.15))',
  },
  modeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  modeDesc: {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  modeArrow: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    color: '#4b5563',
    transition: 'all 0.3s ease',
  },
};