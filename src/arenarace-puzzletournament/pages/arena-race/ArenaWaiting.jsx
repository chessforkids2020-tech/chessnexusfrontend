import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import { getTopicTitle } from '../../../utils/topicTitles';

export default function ArenaWaiting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }

    fetchRoomData();
    
    // Enhanced real-time event listeners for better reliability
    socket.on('playerJoined', (data) => {
      console.log('📨 [ArenaWaiting] Player joined:', data);
      fetchRoomData();
    });
    
    // New enhanced event with full player list
    socket.on('arenaPlayersUpdate', (data) => {
      console.log('📨 [ArenaWaiting] Players update:', data);
      setRoomData(prev => prev ? {
        ...prev,
        players: data.players
      } : null);
    });
    
    // Confirmation that we joined the arena room
    socket.on('arenaRoomJoined', (data) => {
      console.log('✅ [ArenaWaiting] Successfully joined arena room:', data);
    });
    
    // Handle room join errors
    socket.on('arenaRoomError', (data) => {
      console.error('❌ [ArenaWaiting] Arena room error:', data);
      setError(data.message || 'Failed to join waiting room');
    });

    socket.on('raceStarted', (data) => {
      navigate(`/arena/race/${roomId}`);
    });

    // Join socket room with retry logic
    joinSocketRoom();
    
    // Backup polling for missed updates (reduced frequency)
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/api/arena/waiting/${roomId}`);
        if (response.data.status === 'active') {
          navigate(`/arena/race/${roomId}`);
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          clearInterval(pollInterval);
          setError('Room not found — it may have been deleted by the administrator');
          setTimeout(() => navigate('/arena'), 4000);
        }
      }
    }, 10000); // Reduced to 10 seconds since we have real-time updates

    const onRoomDeleted = (data) => {
      if (data && data.roomId === roomId) {
        setError('Room has been deleted by the administrator');
        clearInterval(pollInterval);
        setTimeout(() => navigate('/arena'), 3000);
      }
    };
    socket.on('roomDeleted', onRoomDeleted);

    return () => {
      socket.emit('leave:arena', { roomId, userId: user?._id });
      socket.off('playerJoined');
      socket.off('arenaPlayersUpdate');
      socket.off('arenaRoomJoined');
      socket.off('arenaRoomError');
      socket.off('raceStarted');
      socket.off('roomDeleted', onRoomDeleted);
      clearInterval(pollInterval);
    };
  }, [roomId]);

  const fetchRoomData = async () => {
    if (!roomId) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get(`/api/arena/waiting/${roomId}`);
      setRoomData(response.data);
      
      if (response.data.status === 'active') {
        navigate(`/arena/race/${roomId}`);
        return;
      }
      
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  const joinSocketRoom = () => {
    // Enhanced socket room joining with retry and logging
    console.log(`🔌 [ArenaWaiting] Attempting to join arena room: arena:${roomId}`);
    
    const attemptJoin = () => {
      if (socket.connected) {
        socket.emit('joinArenaRoom', `arena:${roomId}`);
        console.log(`✅ [ArenaWaiting] Emitted joinArenaRoom for arena:${roomId}`);
      } else {
        console.warn(`⚠️ [ArenaWaiting] Socket not connected, retrying in 1 second...`);
        setTimeout(attemptJoin, 1000);
      }
    };
    
    attemptJoin();
    
    // Also listen for reconnection events
    socket.on('connect', () => {
      console.log(`🔄 [ArenaWaiting] Socket reconnected, rejoining room`);
      socket.emit('joinArenaRoom', `arena:${roomId}`);
    });
  };

  const getStatusDisplay = () => {
    if (!roomData) return null;

    switch (roomData.status) {
      case 'waiting':
        return {
          icon: '⏳',
          text: 'Waiting for Admin to Start',
          subtext: 'The race administrator will start the race when ready',
          gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)',
          border: 'rgba(245, 158, 11, 0.3)',
          textColor: '#f59e0b'
        };
      case 'active':
        return {
          icon: '🏁',
          text: 'Race Started!',
          subtext: 'Redirecting to race...',
          gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(52, 211, 153, 0.2) 100%)',
          border: 'rgba(16, 185, 129, 0.3)',
          textColor: '#10b981'
        };
      default:
        return {
          icon: '❓',
          text: 'Unknown Status',
          subtext: 'Please refresh the page',
          gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2) 0%, rgba(203, 213, 225, 0.2) 100%)',
          border: 'rgba(148, 163, 184, 0.3)',
          textColor: '#94a3b8'
        };
    }
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
      paddingTop: '2px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      padding: '32px 28px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    roomCode: {
      fontSize: '36px',
      fontWeight: '900',
      color: '#06b6d4',
      fontFamily: 'monospace',
      letterSpacing: '6px',
      textShadow: '0 0 30px rgba(6, 182, 212, 0.5)',
    },
    twoColumnGrid: {
      display: 'grid',
      gridTemplateColumns: '400px 1fr',
      gap: '24px',
      alignItems: 'start',
    },
    leftColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    rightColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    statItem: {
      padding: '20px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      marginBottom: '16px',
      transition: 'all 0.3s ease',
    },
    statLabel: {
      fontSize: '14px',
      color: '#9ca3af',
      fontWeight: '600',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
    },
    statusCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '12px',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    statusIcon: {
      fontSize: '56px',
      marginBottom: '16px',
      filter: 'drop-shadow(0 4px 12px currentColor)',
    },
    statusTitle: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '4px',
    },
    statusSubtext: {
      fontSize: '16px',
      color: '#9ca3af',
      lineHeight: '1.6',
    },
    playersCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    playersHeader: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    playersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    playerCard: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.3s ease',
    },
    playerAvatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '700',
      color: '#ffffff',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
      flexShrink: 0,
    },
    playerInfo: {
      flex: 1,
      minWidth: 0,
    },
    playerName: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    playerUsername: {
      fontSize: '12px',
      color: '#9ca3af',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    playerStatus: {
      padding: '6px 14px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      flexShrink: 0,
    },
    statusWaiting: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.2)',
    },
    statusReady: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '80px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    loadingIcon: {
      fontSize: '64px',
      marginBottom: '24px',
    },
    loadingText: {
      fontSize: '20px',
      color: '#9ca3af',
      fontWeight: '500',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    errorMessage: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      padding: '16px 24px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '32px',
    },
    retryButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '14px 32px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
    },
    responsiveNote: {
      '@media (max-width: 1024px)': {
        gridTemplateColumns: '1fr',
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <motion.div 
            style={styles.loadingContainer}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              style={styles.loadingIcon}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              ⏳
            </motion.div>
            <div style={styles.loadingText}>Loading room...</div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <motion.div 
            style={styles.errorContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={styles.errorMessage}>❌ {error}</div>
            <motion.button 
              style={styles.retryButton} 
              onClick={fetchRoomData}
              whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)' }}
              transition={{ duration: 0.2 }}
            >
              Retry
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        {/* Status Card - Moved to Top */}
        <motion.div 
          style={{
            ...styles.statusCard,
            background: statusDisplay?.gradient,
            border: `2px solid ${statusDisplay?.border}`,
            marginBottom: '15px',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ textAlign: 'center', padding: '15px' }}>
            <motion.div 
              style={{ 
                fontSize: '36px', 
                marginBottom: '8px',
                display: 'inline-block'
              }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {statusDisplay?.icon}
            </motion.div>
            <div style={{ 
              ...styles.statusTitle, 
              color: statusDisplay?.textColor,
              display: 'inline-block',
              marginLeft: '10px',
              verticalAlign: 'middle'
            }}>
              {statusDisplay?.text}
            </div>
            <div style={styles.statusSubtext}>{statusDisplay?.subtext}</div>
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div style={{
          ...styles.twoColumnGrid,
          '@media (max-width: 1024px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          
          {/* LEFT COLUMN - Stats */}
          <motion.div 
            style={styles.leftColumn}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div style={styles.card}>
              <motion.div 
                style={styles.statItem}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.2)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>📚</span> Topic
                </div>
                <div style={styles.statValue}>{getTopicTitle(roomData?.topic)}</div>
              </motion.div>

              <motion.div 
                style={styles.statItem}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.2)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>⏱️</span> Duration
                </div>
                <div style={styles.statValue}>{roomData?.timeLimit} min</div>
              </motion.div>

              <motion.div 
                style={styles.statItem}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.2)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>🧩</span> Puzzles
                </div>
                <div style={styles.statValue}>{roomData?.puzzleCount}</div>
              </motion.div>

              <motion.div 
                style={styles.statItem}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.2)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>👥</span> Players
                </div>
                <div style={styles.statValue}>{roomData?.playerCount}</div>
              </motion.div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Players */}
          <motion.div 
            style={styles.rightColumn}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Players Card */}
            <div style={styles.playersCard}>
              <h2 style={styles.playersHeader}>
                <span>👥</span> Players ({roomData?.playerCount})
              </h2>
              
              <div style={styles.playersList}>
                <AnimatePresence>
                  {roomData?.players?.map((player, index) => (
                    <motion.div
                      key={player.userId || index}
                      style={styles.playerCard}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ 
                        y: -2,
                        boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                        border: '1px solid rgba(6, 182, 212, 0.2)'
                      }}
                    >
                      <div style={styles.playerAvatar}>
                        {(player.displayName || player.username || player.userId || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.playerInfo}>
                        <div style={styles.playerName}>
                          {player.displayName || player.userId}
                        </div>
                      </div>
                      <div style={{
                        ...styles.playerStatus,
                        ...(player.status === 'ready' ? styles.statusReady : styles.statusWaiting)
                      }}>
                        {player.status || 'waiting'}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}