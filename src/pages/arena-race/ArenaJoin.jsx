import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function ArenaJoin() {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [publicRaces, setPublicRaces] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [recentRaces, setRecentRaces] = useState([]);
  const [timers, setTimers] = useState({});
  const [nowTick, setNowTick] = useState(Date.now());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Tick every second so race countdowns stay live
  React.useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Pre-fill room code from URL parameter
  React.useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code.toUpperCase());
    }
  }, [searchParams]);

  // Fetch public admin races
  const fetchPublicRaces = async () => {
    try {
      setLoadingPublic(true);
      const response = await api.get('/api/arena/public');
      setPublicRaces(response.data.races || []);
    } catch (err) {
      console.error('Fetch public races error:', err);
    } finally {
      setLoadingPublic(false);
    }
  };

  const fetchRecentRaces = async () => {
    try {
      const response = await api.get('/api/arena/recent');
      setRecentRaces(response.data.races || []);
    } catch (err) {
      // silently ignore
    }
  };

  // Fetch joined rooms on component load
  React.useEffect(() => {
    const fetchJoinedRooms = async () => {
      try {
        setLoadingRooms(true);
        const response = await api.get('/api/arena/joined-rooms');
        const rooms = response.data.rooms || [];

        if (rooms.length > 0) {
          const mostRecent = rooms.reduce((best, cur) => {
            const curJoined = cur.userProgress && cur.userProgress.joinedAt ? new Date(cur.userProgress.joinedAt) : (cur.createdAt ? new Date(cur.createdAt) : (cur.startedAt ? new Date(cur.startedAt) : null));
            const bestJoined = best.userProgress && best.userProgress.joinedAt ? new Date(best.userProgress.joinedAt) : (best.createdAt ? new Date(best.createdAt) : (best.startedAt ? new Date(best.startedAt) : null));

            if (!bestJoined) return cur;
            if (!curJoined) return best;
            return curJoined > bestJoined ? cur : best;
          }, rooms[0]);

          setJoinedRooms([mostRecent]);
        } else {
          setJoinedRooms([]);
        }
      } catch (err) {
      } finally {
        setLoadingRooms(false);
      }
    };

    if (user) {
      fetchJoinedRooms();
      fetchPublicRaces();
      fetchRecentRaces();
    }
  }, [user]);

  // Update countdown timers every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newTimers = {};
      const expiredRoomIds = new Set();
      joinedRooms.forEach(room => {
        if (room.userProgress && room.userProgress.status === 'finished') {
          expiredRoomIds.add(room.roomId);
          return;
        }

        if (room.status === 'active' && room.timeRemaining > 0) {
          const updated = Math.max(0, room.timeRemaining - (Object.keys(timers).length > 0 ? 1 : 0));
          newTimers[room.roomId] = updated;
          if (updated === 0) expiredRoomIds.add(room.roomId);
        } else if (room.status === 'active') {
          newTimers[room.roomId] = 0;
          expiredRoomIds.add(room.roomId);
        }

        if (room.status === 'completed') {
          expiredRoomIds.add(room.roomId);
        }
      });

      if (expiredRoomIds.size > 0) {
        expiredRoomIds.forEach((roomId) => {
          api.post('/api/arena/leave', { roomId }).catch((e) => {});
        });

        setJoinedRooms(prev => prev.filter(r => !expiredRoomIds.has(r.roomId)));
        Object.keys(newTimers).forEach(id => {
          if (expiredRoomIds.has(id)) delete newTimers[id];
        });
      }

      if (Object.keys(newTimers).length > 0) {
        setTimers(newTimers);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [joinedRooms, timers]);

  const handleJoin = async () => {
    if (loading) return;

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!user) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/arena/join', {
        roomId: roomCode.trim().toUpperCase(),
        userId: user._id,
        username: user.username
      });

      if (response.data.alreadyJoined) {
        if (response.data.status === 'active') {
          navigate(`/arena/race/${response.data.roomId}`);
        } else {
          navigate(`/arena/waiting/${response.data.roomId}`);
        }
        return;
      }

      setSuccess('Successfully joined the race!');

      setTimeout(() => {
        navigate(`/arena/waiting/${roomCode.trim().toUpperCase()}`);
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join race');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  const handleRejoinRoom = async (roomId) => {
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/arena/join', { roomId });

      if (response.data.ok) {
        if (response.data.status === 'active' || response.data.status === 'completed') {
          navigate(`/arena/race/${roomId}`);
        } else {
          navigate(`/arena/waiting/${roomId}`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rejoin room');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
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
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      padding: '32px 24px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    title: {
      fontSize: '48px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0',
      color: '#9ca3af',
      fontWeight: '400',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      marginBottom: '16px',
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    roomCard: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      transition: 'all 0.3s ease',
    },
    roomHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    roomCode: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#06b6d4',
      fontFamily: 'monospace',
      letterSpacing: '3px',
    },
    roomGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    statBox: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '16px',
    },
    statLabel: {
      fontSize: '11px',
      color: '#9ca3af',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px',
    },
    statValue: {
      fontSize: '18px',
      color: '#ffffff',
      fontWeight: '600',
    },
    progressCard: {
      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
    },
    progressTitle: {
      fontSize: '14px',
      color: '#06b6d4',
      fontWeight: '600',
      marginBottom: '16px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    progressRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
    },
    progressLabel: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    progressValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
    },
    timerBox: {
      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
      border: '2px solid rgba(6, 182, 212, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      marginBottom: '20px',
    },
    timerWarning: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)',
      border: '2px solid rgba(245, 158, 11, 0.3)',
    },
    timerDanger: {
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
      border: '2px solid rgba(239, 68, 68, 0.3)',
    },
    timerLabel: {
      fontSize: '12px',
      color: '#9ca3af',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
    },
    timerValue: {
      fontSize: '36px',
      fontWeight: '700',
      fontFamily: 'monospace',
      color: '#06b6d4',
    },
    input: {
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto 24px',
      display: 'block',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      fontSize: '32px',
      fontWeight: '700',
      color: '#06b6d4',
      textAlign: 'center',
      fontFamily: 'monospace',
      letterSpacing: '8px',
      textTransform: 'uppercase',
      outline: 'none',
      transition: 'all 0.3s ease',
    },
    button: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '16px 40px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
    },
    buttonSecondary: {
      background: 'rgba(0, 0, 0, 0.4)',
      color: '#9ca3af',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '16px 40px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    status: {
      textAlign: 'center',
      padding: '12px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '20px',
      maxWidth: '500px',
      margin: '0 auto 20px',
    },
    statusError: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    statusSuccess: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    hint: {
      textAlign: 'center',
      color: '#6b7280',
      fontSize: '13px',
      marginTop: '16px',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
    },
    loadingIcon: {
      fontSize: '56px',
      marginBottom: '20px',
    },
    loadingText: {
      color: '#9ca3af',
      fontSize: '16px',
    },
    publicRaceCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(6, 182, 212, 0.3)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(6, 182, 212, 0.1)',
    },
    publicJoinButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }
  };

  return (
    <div style={styles.container}>
      <style>{`@keyframes schedPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        {/* Header */}
        <motion.div 
          style={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={styles.title}>🏎️ Race Arena</h1>
          <p style={styles.subtitle}>Join competitive puzzle racing and challenge your skills</p>
        </motion.div>

        {/* Active Rooms */}
        {!loadingRooms && joinedRooms.length > 0 && (
          <motion.div 
            style={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 style={styles.sectionTitle}>
              <span>🎯</span> Your Active Rooms
            </h2>

            {joinedRooms.map(room => {
              const timeRemaining = timers[room.roomId] !== undefined ? timers[room.roomId] : room.timeRemaining;
              const isCompleted = room.status === 'completed' || timeRemaining === 0 || (room.userProgress && room.userProgress.status === 'finished');
              const isActive = room.status === 'active';

              return (
                <motion.div
                  key={room.roomId}
                  style={{
                    ...styles.roomCard,
                    ...(isCompleted ? { opacity: 0.5 } : {})
                  }}
                  whileHover={!isCompleted ? { 
                    y: -4,
                    boxShadow: '0 12px 40px rgba(6, 182, 212, 0.2)',
                    border: '1px solid rgba(6, 182, 212, 0.2)'
                  } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <div style={styles.roomHeader}>
                    <span style={{ fontSize: '32px' }}>🔥</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>ROOM CODE</div>
                      <div style={styles.roomCode}>{room.roomId}</div>
                    </div>
                  </div>

                  <div style={styles.roomGrid}>
                    <div style={styles.statBox}>
                      <div style={styles.statLabel}>Topic</div>
                      <div style={styles.statValue}>📚 {room.topic || 'N/A'}</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statLabel}>Players</div>
                      <div style={styles.statValue}>👥 {room.playerCount}</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statLabel}>Puzzles</div>
                      <div style={styles.statValue}>🧩 {room.puzzleCount}</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statLabel}>Time Limit</div>
                      <div style={styles.statValue}>⏱️ {room.timeLimit} min</div>
                    </div>
                  </div>

                  {room.userProgress && (
                    <div style={styles.progressCard}>
                      <div style={styles.progressTitle}>📊 Your Progress</div>
                      <div style={styles.progressRow}>
                        <span style={styles.progressLabel}>Current Puzzle</span>
                        <span style={styles.progressValue}>{room.userProgress.currentPuzzleIndex + 1}/{room.puzzleCount}</span>
                      </div>
                      <div style={styles.progressRow}>
                        <span style={styles.progressLabel}>Score</span>
                        <span style={{ ...styles.progressValue, color: '#fbbf24' }}>⭐ {room.userProgress.score}</span>
                      </div>
                      <div style={styles.progressRow}>
                        <span style={styles.progressLabel}>Solved</span>
                        <span style={{ ...styles.progressValue, color: '#10b981' }}>✅ {room.userProgress.puzzlesSolved}</span>
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div style={{
                      ...styles.timerBox,
                      ...(timeRemaining <= 60 ? styles.timerDanger : timeRemaining <= 300 ? styles.timerWarning : {})
                    }}>
                      <div style={styles.timerLabel}>⏳ Time Remaining</div>
                      <div style={styles.timerValue}>{formatTimeRemaining(timeRemaining)}</div>
                    </div>
                  )}

                  <motion.button
                    onClick={() => handleRejoinRoom(room.roomId)}
                    disabled={loading || isCompleted}
                    style={{
                      ...styles.button,
                      width: '100%',
                      ...(loading || isCompleted ? styles.buttonDisabled : {})
                    }}
                    whileHover={!loading && !isCompleted ? { 
                      y: -2,
                      boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
                    } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    {isCompleted ? '🏁 Finished' : loading ? '⏳ Joining...' : '🚀 Rejoin Race'}
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {loadingRooms && (
          <div style={styles.card}>
            <div style={styles.loadingContainer}>
              <div style={styles.loadingIcon}>⏳</div>
              <div style={styles.loadingText}>Loading your active rooms...</div>
            </div>
          </div>
        )}

        {/* Today's Arena Races */}
        {!loadingPublic && publicRaces.length > 0 && (() => {
          const sorted = [...publicRaces].sort((a, b) =>
            (a.plannedStartTime ? new Date(a.plannedStartTime) : 0) -
            (b.plannedStartTime ? new Date(b.plannedStartTime) : 0)
          );
          return (
            <motion.div
              style={{ marginBottom: '32px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <h2 style={{ ...styles.sectionTitle, justifyContent: 'flex-start', margin: 0 }}>
                  <span>🏁</span> Today's Arena Races
                </h2>
                <span style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>
                  {sorted.length} race{sorted.length !== 1 ? 's' : ''} today
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {sorted.map(race => {
                  const startMs = race.plannedStartTime ? new Date(race.plannedStartTime).getTime() : null;
                  const diffMs = startMs ? startMs - nowTick : null;
                  const isLive = race.status === 'active' || (diffMs !== null && diffMs <= 0);
                  const isSoon = !isLive && diffMs !== null && diffMs > 0 && diffMs < 30 * 60 * 1000;

                  const fmtStartTime = startMs
                    ? new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : null;

                  // Display name without the trailing date (e.g. "– 23 Jun 2026").
                  const rawName = race.name || `${race.topic} Race`;
                  const displayName = rawName.replace(/\s*[–-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim();

                  const fmtCountdown = (ms) => {
                    if (ms <= 0) return 'Starting now';
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    const s = Math.floor((ms % 60000) / 1000);
                    if (h > 0) return `${h}h ${m}m`;
                    if (m > 0) return `${m}m ${s}s`;
                    return `${s}s`;
                  };

                  return (
                    <motion.div
                      key={race.roomId}
                      style={{
                        ...styles.publicRaceCard,
                        border: isLive
                          ? '1px solid rgba(34,197,94,0.5)'
                          : isSoon
                          ? '1px solid rgba(251,191,36,0.5)'
                          : '1px solid rgba(6,182,212,0.25)',
                        boxShadow: isLive
                          ? '0 0 20px rgba(34,197,94,0.15)'
                          : '0 8px 32px rgba(6,182,212,0.08)',
                      }}
                      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(6, 182, 212, 0.2)' }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                            {displayName}
                          </h3>
                          <div style={{ color: '#06b6d4', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}>ROOM: {race.roomId}</div>
                        </div>
                        {isLive && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#052e16', border: '1px solid #22c55e', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'schedPulse 1.4s infinite' }} />
                            LIVE
                          </span>
                        )}
                        {!isLive && isSoon && (
                          <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            SOON
                          </span>
                        )}
                        {!isLive && !isSoon && (
                          <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            SCHEDULED
                          </span>
                        )}
                      </div>

                      {/* Countdown only (no date / start time) */}
                      {fmtStartTime && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {isLive ? 'In progress' : 'Starts in'}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: isLive ? '#22c55e' : isSoon ? '#fbbf24' : '#06b6d4' }}>
                            {isLive ? '🚀 Now' : fmtCountdown(diffMs)}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ color: '#9ca3af', fontSize: 13 }}>📚 <span style={{ color: '#fff' }}>{race.topicTitle || race.topic}</span></div>
                        <div style={{ color: '#9ca3af', fontSize: 13 }}>⏱️ <span style={{ color: '#fff' }}>{race.timeLimit} min</span></div>
                        <div style={{ color: '#9ca3af', fontSize: 13 }}>👥 <span style={{ color: '#fff' }}>{race.playerCount} joined</span></div>
                        <div style={{ color: '#9ca3af', fontSize: 13 }}>🧩 <span style={{ color: '#fff' }}>{race.puzzleCount} puzzles</span></div>
                      </div>

                      <button
                        onClick={() => {
                          if (isLive) {
                            // Race is active — join and go directly to race room
                            api.post('/api/arena/join', { roomId: race.roomId })
                              .then(r => navigate(r.data.status === 'active' ? `/arena/race/${race.roomId}` : `/arena/waiting/${race.roomId}`))
                              .catch(() => navigate(`/arena/race/${race.roomId}`));
                          } else {
                            handleRejoinRoom(race.roomId);
                          }
                        }}
                        style={{
                          ...styles.publicJoinButton,
                          background: isLive
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                            : isSoon
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : 'linear-gradient(135deg, #06b6d4, #10b981)',
                        }}
                      >
                        {isLive ? '🚀 Join Now — Live!' : isSoon ? '⚡ Join — Starting Soon' : '👀 Preview & Wait'}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* Join and Create Race - Side by Side */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          flexWrap: 'wrap',
          marginTop: '32px'
        }}>
          {/* Join New Race - Left Side */}
          <motion.div 
            style={{ 
              ...styles.card,
              flex: '1',
              minWidth: '320px'
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 style={styles.sectionTitle}>
              <span>🎫</span> Join Arena
            </h2>

            <div style={{ maxWidth: '100%' }}>
              <p style={{ textAlign: 'center', color: '#9ca3af', marginBottom: '20px', fontSize: '15px' }}>
                Enter the 6-character room code
              </p>

              <input
                type="text"
                placeholder="ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyPress={handleKeyPress}
                style={styles.input}
                maxLength={6}
                disabled={loading}
              />

              {error && (
                <motion.div 
                  style={{ ...styles.status, ...styles.statusError }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  ❌ {error}
                </motion.div>
              )}
              
              {success && (
                <motion.div 
                  style={{ ...styles.status, ...styles.statusSuccess }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  ✅ {success}
                </motion.div>
              )}

              <motion.button
                onClick={handleJoin}
                disabled={loading || !roomCode.trim()}
                style={{
                  ...styles.button,
                  width: '100%',
                  fontSize: '18px',
                  padding: '18px',
                  ...(loading || !roomCode.trim() ? styles.buttonDisabled : {})
                }}
                whileHover={!loading && roomCode.trim() ? { 
                  y: -2,
                  boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
                } : {}}
                transition={{ duration: 0.2 }}
              >
                {loading ? '⏳ Joining Race...' : '🏁 Join Race'}
              </motion.button>
            </div>
          </motion.div>

          {/* Create Your Own Race - Right Side */}
          <motion.div 
            style={{ 
              ...styles.card,
              flex: '1',
              minWidth: '320px'
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 style={styles.sectionTitle}>
              <span>🏁</span> Create Arena
            </h2>

            <div style={{ maxWidth: '100%', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '15px' }}>
                Host your own puzzle race! Choose a topic, set the time limit, and invite your friends.
              </p>

              <motion.button
                onClick={() => navigate('/arena/create')}
                style={{
                  ...styles.button,
                  width: '100%',
                  fontSize: '18px',
                  padding: '18px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)',
                }}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 6px 24px rgba(168, 85, 247, 0.5)'
                }}
                transition={{ duration: 0.2 }}
              >
                🚀 Create New Race
              </motion.button>

              <p style={{ ...styles.hint, marginTop: '16px' }}>
                👑 You'll be the host and can start the race when everyone joins
              </p>
            </div>
          </motion.div>
        </div>

        {/* Recently Finished Arena Races */}
        {recentRaces.length > 0 && (
          <motion.div
            style={{ marginTop: '40px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 style={{ ...styles.sectionTitle, justifyContent: 'flex-start', marginBottom: '16px' }}>
              <span>🏆</span> Recently Finished Arena Races
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {recentRaces.map(race => (
                <div key={race._id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '16px 18px',
                }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(race.name || `${race.topic} Race`).replace(/\s*[–-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim()}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 8 }}>
                    <div style={{ color: '#9ca3af', fontSize: 13 }}>📚 <span style={{ color: '#e2e8f0' }}>{race.topic}</span></div>
                    <div style={{ color: '#9ca3af', fontSize: 13 }}>👥 <span style={{ color: '#e2e8f0' }}>{race.playerCount} players</span></div>
                    <div style={{ color: '#9ca3af', fontSize: 13 }}>⏱️ <span style={{ color: '#e2e8f0' }}>{race.timeLimit} min</span></div>
                    <div style={{ color: '#9ca3af', fontSize: 13 }}>🧩 <span style={{ color: '#e2e8f0' }}>{race.puzzleCount} puzzles</span></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563' }}>
                    Finished {(() => {
                      const diff = Date.now() - new Date(race.finishedAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return 'just now';
                      if (mins < 60) return `${mins}m ago`;
                      const h = Math.floor(mins / 60);
                      return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}