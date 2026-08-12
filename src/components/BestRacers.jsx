import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import PlayerName from './PlayerName';

const BestRacers = ({ compact = false }) => {
  const [timedRacers, setTimedRacers] = useState([]);
  const [arenaRacers, setArenaRacers] = useState([]);
  const [teamRaceRacers, setTeamRaceRacers] = useState([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [topicsRacers, setTopicsRacers] = useState([]);
  const [topicsMap, setTopicsMap] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const fetchTeamRacers = async () => {
    setModalLoading(true);
    setModalError(null);
    setModalTitle('Top 5 Team Race Racers — 20 min races (by topic)');
    try {
      const res = await api.get('/api/auth/top-racers/team');
      setTopicsRacers(res.data.topics || []);
    } catch (e) {
      setModalError('Failed to load team racers. Please try again.');
      setTopicsRacers([]);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchTopicsRacers = async () => {
    setModalLoading(true);
    setModalError(null);
    setModalTitle('Top 5 Racers — 5 min races (by topic)');
    try {
      const res = await api.get('/api/auth/top-racers/by-topic?timeLimit=5');
      setTopicsRacers(res.data.topics || []);
    } catch (e) {
      setModalError('Failed to load racers. Please try again.');
      setTopicsRacers([]);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchArenaRacers = async () => {
    setModalLoading(true);
    setModalError(null);
    setModalTitle('Top 5 Arena Racers — 10 min races (by topic)');
    try {
      const res = await api.get('/api/auth/top-racers/arena');
      setTopicsRacers(res.data.topics || []);
    } catch (e) {
      setModalError('Failed to load racers. Please try again.');
      setTopicsRacers([]);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    const fetchTopRacers = async () => {
      try {
        // Fetch 5 minute timed racers (checkmate topic only)
        const timedResponse = await api.get('/api/auth/top-racers?timeLimit=5&topic=checkmate');
        setTimedRacers(timedResponse.data.timedRacers || []);
        
        // Fetch 10 minute arena racers (checkmate topic only)
        const arenaResponse = await api.get('/api/auth/top-racers?timeLimit=10&topic=checkmate');
        setArenaRacers(arenaResponse.data.arenaRacers || []);
        
        // Fetch team race racers (checkmate topic only for dashboard display)
        const teamResponse = await api.get('/api/auth/top-racers?topic=checkmate');
        setTeamRaceRacers(teamResponse.data.teamRaceRacers || []);
      } catch {
          await fetchTopicsRacers();
      } finally {
        setLoading(false);
      }
    };

    fetchTopRacers();
  }, []);

  useEffect(() => {
    const fetchTopicsMap = async () => {
      try {
        const res = await api.get('/api/public/racer/topics');
        const topicsArray = res.data || [];
        const map = {};
        topicsArray.forEach(t => { if (t && t.id) map[t.id] = t; });
        setTopicsMap(map);
      } catch (err) {
        // ignore
      }
    };
    fetchTopicsMap();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading) return null;

  const compactLeaderboard = compact ? {
    ...styles.leaderboard,
    background: 'var(--color-white-a04)',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    minWidth: 0,
  } : styles.leaderboard;

  const compactRacerItem = compact ? {
    ...styles.racerItem,
    padding: '8px 10px',
    gap: '8px',
  } : styles.racerItem;

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <>
      <div style={compact ? { padding: '4px 0' } : styles.container}>
        {!compact && <h2 style={styles.title}>🏆 Best Racers (Highest Scores)</h2>}
      
      <div style={compact ? { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: '12px', minWidth: '700px' } : styles.grid}>
        {/* Team Race Leaderboard */}
        <div style={compactLeaderboard}>
          <h3 style={{ ...styles.sectionTitle, fontSize: compact ? '14px' : '18px', marginBottom: compact ? '10px' : '16px' }}>👥 Team Race</h3>
          <div style={styles.racerList}>
            {teamRaceRacers.length > 0 ? (
              teamRaceRacers.map((racer, index) => (
                <div key={racer.userId} style={compactRacerItem}>
                  <div style={styles.racerRank}>{getMedalEmoji(index)}</div>
                  <div style={styles.racerInfo}>
                    <div style={styles.racerName}>
                      <PlayerName displayName={racer.displayName} username={racer.username} userId={racer.userId} />
                    </div>
                    <div style={styles.racerUsername}>{topicsMap[racer.topic]?.title || racer.topic || 'checkmate'} • 20 min</div>
                  </div>
                  <div style={styles.racerScore}>{racer.score}</div>
                </div>
              ))
            ) : (
              <div style={{ ...styles.racerItem, color: 'var(--color-text-muted)' }}>No team racers yet</div>
            )}
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 12}}>
            <button
              style={styles.seeAllInlineButton}
              onClick={async () => {
                setShowAllModal(true);
                setModalError(null);
                await fetchTeamRacers();
              }}
              aria-label="See all team race racers"
            >See all racers</button>
          </div>
        </div>

        {/* Timed Race Leaderboard */}
        <div style={compactLeaderboard}>
          <h3 style={{ ...styles.sectionTitle, fontSize: compact ? '14px' : '18px', marginBottom: compact ? '10px' : '16px' }}>⏱️ Individual Race</h3>
          <div style={styles.racerList}>
            {timedRacers.length > 0 ? (
              timedRacers.map((racer, index) => (
                <div key={racer.userId} style={compactRacerItem}>
                  <div style={styles.racerRank}>{getMedalEmoji(index)}</div>
                  <div style={styles.racerInfo}>
                    <div style={styles.racerName}>
                      <PlayerName displayName={racer.displayName} username={racer.username} userId={racer.userId} />
                    </div>
                    <div style={styles.racerUsername}>{racer.timeLimit}min race • {topicsMap[racer.topic]?.title || racer.topic || 'checkmate'}</div>
                  </div>
                  <div style={styles.racerScore}>{racer.timedRaceScore}</div>
                </div>
              ))
            ) : (
              <div style={{ ...styles.racerItem, color: 'var(--color-text-muted)' }}>No races yet</div>
            )}
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 12}}>
            <button
              style={styles.seeAllInlineButton}
              onClick={async () => {
                setShowAllModal(true);
                setModalError(null);
                await fetchTopicsRacers();
              }}
              aria-label="See all racers (5 min races by topic)"
            >See all racers</button>
          </div>
        </div>

        {/* Arena Race Leaderboard */}
        <div style={compactLeaderboard}>
          <h3 style={{ ...styles.sectionTitle, fontSize: compact ? '14px' : '18px', marginBottom: compact ? '10px' : '16px' }}>🏙️ Arena Race</h3>
          <div style={styles.racerList}>
            {arenaRacers.length > 0 ? (
              arenaRacers.map((racer, index) => (
                <div key={racer.userId} style={compactRacerItem}>
                  <div style={styles.racerRank}>{getMedalEmoji(index)}</div>
                  <div style={styles.racerInfo}>
                    <div style={styles.racerName}>
                      <PlayerName displayName={racer.displayName} username={racer.username} userId={racer.userId} />
                    </div>
                    <div style={styles.racerUsername}>{racer.timeLimit || 10}min race • {topicsMap[racer.topic]?.title || racer.topic || 'checkmate'}</div>
                  </div>
                  <div style={styles.racerScore}>{racer.arenaRaceScore}</div>
                </div>
              ))
            ) : (
              <div style={{ ...styles.racerItem, color: 'var(--color-text-muted)' }}>No races yet</div>
            )}
          </div>
          <div style={{display: 'flex', justifyContent: 'center', marginTop: 12}}>
            <button
              style={styles.seeAllInlineButton}
              onClick={async () => {
                setShowAllModal(true);
                setModalError(null);
                await fetchArenaRacers();
              }}
              aria-label="See all arena racers"
            >See all racers</button>
          </div>
        </div>
      </div>
      </div>
      
      {showAllModal && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowAllModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <span style={{fontSize: 28}}>🏆</span>
                <h3 style={{margin: 0, color: 'var(--color-text)', fontSize: '24px'}}>{modalTitle}</h3>
              </div>
              <button onClick={() => setShowAllModal(false)} style={{border: '1px solid var(--color-white-a20)', background: 'var(--color-white-a10)', color: 'var(--color-text)', padding: '10px 20px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: '700'}}>Close</button>
            </div>

            {modalLoading ? (
              <div style={{textAlign: 'center', padding: 40, color: 'var(--color-text-muted)'}}>Loading racers...</div>
            ) : modalError ? (
              <div style={{textAlign: 'center', padding: 40, color: 'var(--color-danger)'}}>{modalError}</div>
            ) : topicsRacers.length === 0 ? (
              <div style={{textAlign: 'center', padding: 40, color: 'var(--color-text-muted)'}}>No racers found.</div>
            ) : (
              <div style={{...styles.modalGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)'}}>
                {topicsRacers.map((topicObj) => (
                  <div key={topicObj.topic} style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th colSpan="3" style={styles.topicHeader}>{topicsMap[topicObj.topic]?.title || topicObj.topic}</th>
                        </tr>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.th}>Rank</th>
                          <th style={styles.th}>Name</th>
                          <th style={{...styles.th, textAlign: 'right'}}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(topicObj.users || []).map((u, idx) => (
                          <tr key={u.userId || u.username}>
                            <td style={{...styles.td, ...styles.rankCell}}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}.`}
                            </td>
                            <td style={styles.td}>
                              <div style={{fontWeight: '600', color: 'var(--color-text)'}}><PlayerName displayName={u.displayName} username={u.username} userId={u.userId} /></div>
                            </td>
                            <td style={{...styles.td, ...styles.pointsCell}}>{u.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// BestRacers Component - Obsidian Glass Theme
const styles = {
  container: {
    background: 'var(--color-surface)',
    padding: '32px 28px',
    borderRadius: 'var(--radius-2xl)',
    marginTop: '40px',
    marginBottom: '40px',
    boxShadow: '0 8px 32px var(--color-black-a50)',
    border: '1px solid var(--color-white-a04)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  title: {
    margin: '0 0 24px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  leaderboard: {
    background: 'var(--color-black-a35)',
    padding: '20px',
    borderRadius: 'var(--radius-xl)',
    boxShadow: '0 4px 16px var(--color-black-a35)',
    border: '1px solid var(--color-white-a04)',
    backdropFilter: 'blur(5px)',
    minWidth: '280px',
    transition: 'all 0.3s ease',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--color-accent)',
  },
  racerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  racerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'var(--color-white-a04)',
    borderRadius: 'var(--radius-lg)',
    transition: 'all 0.3s ease',
    borderLeft: '3px solid var(--color-accent-a30)',
    cursor: 'pointer',
  },
  racerItemHover: {
    background: 'var(--color-accent-a12)',
    transform: 'translateX(4px)',
    borderLeftColor: 'var(--color-success)',
  },
  racerRank: {
    fontSize: '20px',
    fontWeight: '700',
    minWidth: '30px',
    textAlign: 'center',
    color: 'var(--color-accent)',
  },
  racerInfo: {
    flex: 1,
    minWidth: 0,
  },
  racerName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  racerUsername: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  racerScore: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-success)',
    minWidth: '50px',
    textAlign: 'right',
  },
};

// Modal styles appended to styles object
styles.seeAllButton = {
  padding: '10px 18px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-accent-a30)',
  background: 'var(--color-accent-a15)',
  color: 'var(--color-accent)',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px var(--color-accent-a20)',
  transition: 'all 0.3s ease',
};

styles.seeAllInlineButton = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-accent-a30)',
  background: 'var(--color-accent-a15)',
  color: 'var(--color-accent)',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px var(--color-accent-a20)',
  transition: 'all 0.3s ease',
};

styles.modalOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'var(--color-black-a65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200000,
  backdropFilter: 'blur(12px)',
};

styles.modal = {
  width: '98%',
  maxWidth: 1400,
  maxHeight: '92vh',
  overflow: 'auto',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-2xl)',
  padding: 32,
  border: '1px solid var(--color-white-a10)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 20px 60px var(--color-black-a65)',
};

styles.modalGrid = {
  display: 'grid',
  gap: '24px',
  alignItems: 'start'
};

styles.tableWrapper = {
  background: 'var(--color-black-a35)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 4px 16px var(--color-black-a35)',
  border: '1px solid var(--color-white-a04)',
  overflow: 'hidden',
  backdropFilter: 'blur(5px)',
};

styles.table = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '0',
  background: 'transparent'
};

styles.topicHeader = {
  background: 'var(--color-accent-a15)',
  padding: '12px 16px',
  fontSize: '16px',
  fontWeight: '700',
  color: 'var(--color-accent)',
  textAlign: 'left',
  borderBottom: '1px solid var(--color-white-a04)'
};

styles.tableHeaderRow = {
  background: 'var(--color-black-a20)',
  borderBottom: '1px solid var(--color-white-a04)'
};

styles.th = {
  padding: '10px 16px',
  textAlign: 'left',
  fontWeight: '600',
  color: 'var(--color-text-muted)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

styles.td = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-white-a04)',
  color: 'var(--color-text)',
  fontSize: '14px',
  verticalAlign: 'middle'
};

styles.rankCell = {
  fontWeight: '700',
  fontSize: '18px',
  width: '60px',
  textAlign: 'center',
  color: 'var(--color-accent)'
};

styles.pointsCell = {
  fontWeight: '700',
  color: 'var(--color-success)',
  textAlign: 'right',
  fontSize: '16px'
};

export default BestRacers;
