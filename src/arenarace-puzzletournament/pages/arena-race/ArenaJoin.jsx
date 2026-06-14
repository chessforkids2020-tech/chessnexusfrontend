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
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [timers, setTimers] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Pre-fill room code from URL parameter
  React.useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code.toUpperCase());
    }
  }, [searchParams]);

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
  };

  return (
    <div style={styles.container}>
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

        {/* Join New Race */}
        <motion.div 
          style={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 style={styles.sectionTitle}>
            <span>🎫</span> Join a New Race
          </h2>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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

            <p style={styles.hint}>
              💡 Ask your race administrator for the room code
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
