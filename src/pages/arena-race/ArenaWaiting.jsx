import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import socket from '../../socket';
import PlayerName from '../../components/PlayerName';
import { useAuth } from '../../contexts/AuthContext';
import { getTopicTitle } from '../../utils/topicTitles';

export default function ArenaWaiting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingRace, setStartingRace] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [playersPage, setPlayersPage] = useState(0);

  const PAGE_SIZE = 10;

  // Get user ID (could be _id or id depending on auth context)
  const userId = user?._id || user?.id;

  // Check if current user is the host (compare as strings to handle ObjectId vs string)
  const isHost = roomData?.isUserCreated && 
    roomData?.hostId && 
    userId && 
    String(roomData.hostId) === String(userId);

  const canHostStartNow = roomData?.canStartNow !== false;

  const formatCountdown = (target) => {
    if (!target) return '';
    const t = new Date(target).getTime();
    const diff = t - nowMs;
    if (diff <= 0) return '00:00:00';
    const total = Math.floor(diff / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Debug log to check values
  useEffect(() => {
    if (roomData && user) {
      console.log({
        isUserCreated: roomData.isUserCreated,
        hostId: roomData.hostId,
        odUserId: userId,
        userObject: user,
        isHost: roomData?.isUserCreated && userId && String(roomData?.hostId) === String(userId)
      });
    }
  }, [roomData, user, userId]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const canStartRace = isHost && 
    roomData?.status === 'waiting' && 
    (roomData?.playerCount ?? 0) >= 2 && 
    canHostStartNow;

  // Reset to first page when the player list changes
  useEffect(() => {
    setPlayersPage(0);
  }, [roomData?.players?.length]);

  // Auto-trigger race start when countdown hits zero
  useEffect(() => {
    if (roomData?.status === 'waiting' && roomData?.startMode === 'auto' && roomData?.plannedStartTime) {
      const t = new Date(roomData.plannedStartTime).getTime();
      if (t <= nowMs && !startingRace) {
        console.log('⏰ [ArenaWaiting] Countdown reached zero, triggering auto-start...');
        fetchRoomData();
      }
    }
  }, [nowMs, roomData?.status, roomData?.startMode, roomData?.plannedStartTime, startingRace]);

  // Handle host starting the race
  const handleStartRace = async () => {
    if (!isHost || startingRace) return;
    
    setStartingRace(true);
    try {
      const response = await api.post(`/api/arena/host/start/${roomId}`);
      if (response.data.ok) {
        // Socket will handle redirect via 'raceStarted' event
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start race');
      setStartingRace(false);
    }
  };

  // Copy room code to clipboard
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusDisplay = () => {
    if (!roomData) return null;

    switch (roomData.status) {
      case 'waiting':
        const plannedLabel = roomData?.plannedStartTime
          ? new Date(roomData.plannedStartTime).toLocaleString()
          : null;
        
        const isAuto = roomData?.startMode === 'auto';
        const countdown = roomData?.plannedStartTime ? formatCountdown(roomData.plannedStartTime) : null;

        const waitText = roomData?.plannedStartTime
          ? `${isAuto ? 'Auto start' : 'Host start'} at ${plannedLabel}`
          : (isAuto ? 'Auto starts when scheduled' : 'Host starts manually');

        // Different message for user-created races vs admin races
        if (roomData.isUserCreated) {
          if (isHost) {
            return {
              icon: '👑',
              text: 'You are the Host',
              subtext: isAuto && countdown ? `Starts in ${countdown}` : waitText,
              gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, var(--color-accent-2-a15) 100%)',
              border: 'rgba(168, 85, 247, 0.3)',
              textColor: 'var(--color-accent-2)'
            };
          } else {
            return {
              icon: '⏳',
              text: 'Waiting for Host to Start',
              subtext: isAuto && countdown ? `Starts in ${countdown}` : waitText,
              gradient: 'linear-gradient(135deg, var(--color-warning-a20) 0%, var(--color-warning-a20) 100%)',
              border: 'var(--color-warning-a30)',
              textColor: 'var(--color-warning)'
            };
          }
        }
        
        // Chess Nexus Hosted (Admin Race)
        if (isAuto && roomData?.plannedStartTime) {
          return {
            icon: '⏰',
            text: 'Chess Nexus Hosted Race',
            subtext: `STARTS IN ${countdown}`,
            gradient: 'linear-gradient(135deg, var(--color-accent-a20) 0%, var(--color-accent-2-a20) 100%)',
            border: 'var(--color-accent-a30)',
            textColor: 'var(--color-accent)'
          };
        }

        return {
          icon: '⏳',
          text: 'Chess Nexus Hosted Race',
          subtext: isAuto ? 'PLANNED TIME TO START' : 'Waiting for Chess Nexus to start the race',
          gradient: 'linear-gradient(135deg, var(--color-warning-a20) 0%, var(--color-warning-a20) 100%)',
          border: 'var(--color-warning-a30)',
          textColor: 'var(--color-warning)'
        };
      case 'active':
        return {
          icon: '🏁',
          text: 'Race Started!',
          subtext: 'Redirecting to race...',
          gradient: 'linear-gradient(135deg, var(--color-accent-2-a20) 0%, rgba(52, 211, 153, 0.2) 100%)',
          border: 'var(--color-success-a30)',
          textColor: 'var(--color-success)'
        };
      default:
        return {
          icon: '❓',
          text: 'Unknown Status',
          subtext: 'Please refresh the page',
          gradient: 'linear-gradient(135deg, var(--color-border) 0%, rgba(203, 213, 225, 0.2) 100%)',
          border: 'var(--color-border-strong)',
          textColor: 'var(--color-text-muted)'
        };
    }
  };

  // This page is styled entirely with inline objects and had NO media queries,
  // so nothing responded to screen size: a hardcoded `400px 1fr` grid is wider
  // than any phone, which is why the cards ran off the right edge and the text
  // was cut off. Track the viewport and branch the few size-critical values.
  const [vw, setVw] = useState(
    typeof document !== 'undefined'
      ? (document.documentElement.clientWidth || window.innerWidth)
      : 1280
  );
  useEffect(() => {
    const onResize = () => setVw(document.documentElement.clientWidth || window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  const isNarrow = vw <= 1024;

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-bg)',
      minHeight: '100vh',
      padding: isNarrow ? '12px 10px' : '20px',
      position: 'relative',
      overflow: 'hidden',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 50%, var(--color-accent-2-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)',
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
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    title: {
      fontSize: isNarrow ? '24px' : '42px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    roomCode: {
      fontSize: isNarrow ? '20px' : '36px',
      fontWeight: '900',
      color: 'var(--color-accent)',
      fontFamily: 'monospace',
      letterSpacing: isNarrow ? '2px' : '6px',
      textShadow: '0 0 30px var(--color-accent-a40)',
    },
    twoColumnGrid: {
      display: 'grid',
      // One column on a phone/tablet — `400px 1fr` needs ~840px before it fits.
      gridTemplateColumns: isNarrow ? '1fr' : '400px 1fr',
      gap: isNarrow ? '12px' : '24px',
      alignItems: 'start',
      minWidth: 0,
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
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: isNarrow ? '14px' : '32px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    statsGrid: {
      display: 'grid',
      // Two per row on a phone; the desktop stack is unchanged.
      gridTemplateColumns: isNarrow ? '1fr 1fr' : '1fr',
      gap: isNarrow ? '8px' : '0',
    },
    statItem: {
      padding: isNarrow ? '10px 12px' : '20px',
      minWidth: 0,
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '16px',
      transition: 'all 0.3s ease',
    },
    statLabel: {
      fontSize: isNarrow ? '11px' : '14px',
      color: 'var(--color-text-muted)',
      fontWeight: '600',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statValue: {
      fontSize: isNarrow ? '17px' : '28px',
      overflowWrap: 'anywhere',
      fontWeight: '700',
      color: 'var(--color-text)',
    },
    statusCard: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: '12px',
      textAlign: 'center',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    statusIcon: {
      fontSize: isNarrow ? '30px' : '56px',
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
      color: 'var(--color-text-muted)',
      lineHeight: '1.6',
    },
    playersCard: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: isNarrow ? '14px' : '32px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    playersHeader: {
      fontSize: '22px',
      fontWeight: '700',
      color: 'var(--color-text)',
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
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.3s ease',
    },
    playerAvatar: {
      width: '48px',
      height: '48px',
      borderRadius: 'var(--radius-circle)',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '700',
      color: 'var(--color-text)',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
      flexShrink: 0,
    },
    playerInfo: {
      flex: 1,
      minWidth: 0,
    },
    playerName: {
      fontSize: '15px',
      fontWeight: '600',
      color: 'var(--color-text)',
      marginBottom: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    playerUsername: {
      fontSize: '12px',
      color: 'var(--color-text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    playerStatus: {
      padding: '6px 14px',
      borderRadius: 'var(--radius-md)',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      flexShrink: 0,
    },
    statusWaiting: {
      background: 'var(--color-warning-a12)',
      color: 'var(--color-warning)',
      border: '1px solid var(--color-warning-a20)',
    },
    statusReady: {
      background: 'var(--color-success-a12)',
      color: 'var(--color-success)',
      border: '1px solid var(--color-success-a20)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '80px 20px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    loadingIcon: {
      fontSize: '64px',
      marginBottom: '24px',
    },
    loadingText: {
      fontSize: '20px',
      color: 'var(--color-text-muted)',
      fontWeight: '500',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    errorMessage: {
      background: 'var(--color-danger-a12)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-a20)',
      padding: '16px 24px',
      borderRadius: 'var(--radius-lg)',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '32px',
    },
    retryButton: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '14px 32px',
      borderRadius: 'var(--radius-lg)',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
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
              whileHover={{ y: -2, boxShadow: '0 6px 24px var(--color-accent-a40)' }}
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

  const allPlayers = roomData?.players || [];
  const totalPages = Math.ceil(allPlayers.length / PAGE_SIZE) || 1;
  const safePlayersPage = Math.min(playersPage, totalPages - 1);
  const pagedPlayers = allPlayers.slice(safePlayersPage * PAGE_SIZE, (safePlayersPage + 1) * PAGE_SIZE);
  const startIndex = safePlayersPage * PAGE_SIZE;

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
            
            {/* Room Code Share Section */}
            <div style={{ 
              marginTop: '20px', 
              padding: '16px',
              background: 'var(--color-black-a35)',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Room Code:</span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: '900', 
                color: 'var(--color-accent)',
                fontFamily: 'monospace',
                letterSpacing: '4px'
              }}>
                {roomId}
              </span>
              <motion.button
                onClick={handleCopyRoomId}
                style={{
                  padding: '8px 16px',
                  background: copied ? 'var(--color-success-a30)' : 'var(--color-accent-a20)',
                  border: `1px solid ${copied ? 'var(--color-success-a30)' : 'var(--color-accent-a30)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: copied ? 'var(--color-success)' : 'var(--color-accent)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </motion.button>
            </div>

            {/* Host Start Race Button */}
            {isHost && roomData?.status === 'waiting' && (
              <motion.div style={{ marginTop: '20px' }}>
                {/* Not enough players warning */}
                {(roomData.playerCount ?? 0) < 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--color-danger-a12)',
                      border: '1px solid var(--color-danger-a30)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 20px',
                      color: 'var(--color-danger)',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '12px',
                    }}
                  >
                    ⚠️ Arena Race cannot start with only {roomData.playerCount ?? 0} player. At least 2 players must join.
                  </motion.div>
                )}

                {/* Scheduled start passed but not enough players */}
                {roomData?.scheduledStartFailed && (roomData.playerCount ?? 0) < 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--color-danger-a20)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 20px',
                      color: 'var(--color-danger)',
                      fontSize: '14px',
                      fontWeight: '700',
                      marginBottom: '12px',
                    }}
                  >
                    ❌ Arena Race can't run with one user. The scheduled start time has passed. Waiting for more players to join...
                  </motion.div>
                )}

                <motion.button
                  onClick={handleStartRace}
                  disabled={!canStartRace || startingRace}
                  style={{
                    padding: '16px 48px',
                    fontSize: '18px',
                    fontWeight: '700',
                    background: (!canStartRace || startingRace)
                      ? 'rgba(107, 114, 128, 0.5)' 
                      : 'linear-gradient(135deg, var(--color-accent-2) 0%, var(--color-accent-2) 100%)',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--color-text)',
                    cursor: (!canStartRace || startingRace) ? 'not-allowed' : 'pointer',
                    boxShadow: (!canStartRace || startingRace)
                      ? 'none' 
                      : '0 4px 20px var(--color-success-a30)',
                    transition: 'all 0.3s ease',
                    opacity: (!canStartRace || startingRace) ? 0.6 : 1,
                  }}
                  whileHover={(canStartRace && !startingRace) ? { scale: 1.05, boxShadow: '0 6px 30px rgba(16, 185, 129, 0.6)' } : {}}
                  whileTap={(canStartRace && !startingRace) ? { scale: 0.98 } : {}}
                >
                  {startingRace ? '🔄 Starting...' : '🚀 Start Race'}
                </motion.button>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '8px' }}>
                  {roomData.playerCount ?? 0} player{(roomData.playerCount ?? 0) !== 1 ? 's' : ''} joined
                  {(roomData.playerCount ?? 0) < 2 && (
                    <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>(need at least 2)</span>
                  )}
                </div>
                {roomData?.plannedStartTime && (roomData.playerCount ?? 0) >= 2 && (
                  <div style={{ color: 'var(--color-accent)', fontSize: '12px', marginTop: '6px' }}>
                    {canHostStartNow
                      ? 'Scheduled time reached. You can start now.'
                      : `Start available in ${formatCountdown(roomData.plannedStartTime)}`}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div style={styles.twoColumnGrid}>
          
          {/* LEFT COLUMN - Stats */}
          <motion.div 
            style={styles.leftColumn}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div style={styles.card}>
              {/* 2x2 on a phone: five full-width stat bands filled the screen
                  before the player list was reachable. */}
              <div style={styles.statsGrid}>
              <motion.div 
                style={styles.statItem}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px var(--color-accent-a20)',
                  border: '1px solid var(--color-accent-a20)'
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
                  boxShadow: '0 4px 16px var(--color-accent-a20)',
                  border: '1px solid var(--color-accent-a20)'
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
                  boxShadow: '0 4px 16px var(--color-accent-a20)',
                  border: '1px solid var(--color-accent-a20)'
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
                  boxShadow: '0 4px 16px var(--color-accent-a20)',
                  border: '1px solid var(--color-accent-a20)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>👥</span> Players
                </div>
                <div style={styles.statValue}>{roomData?.playerCount}</div>
              </motion.div>

              <motion.div 
                style={{ ...styles.statItem, gridColumn: isNarrow ? '1 / -1' : 'auto' }}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 4px 16px var(--color-accent-a20)',
                  border: '1px solid var(--color-accent-a20)'
                }}
              >
                <div style={styles.statLabel}>
                  <span>🗓️</span> Planned Start
                </div>
                <div style={{ ...styles.statValue, fontSize: '18px', lineHeight: 1.3 }}>
                  {roomData?.plannedStartTime ? new Date(roomData.plannedStartTime).toLocaleString() : 'Start anytime'}
                </div>
                {roomData?.plannedStartTime && roomData?.status === 'waiting' && (
                  <div style={{ color: 'var(--color-accent)', fontSize: '12px', marginTop: '6px' }}>
                    {roomData?.startMode === 'auto' ? 'Auto start' : 'Manual start'} · {formatCountdown(roomData.plannedStartTime)}
                  </div>
                )}
              </motion.div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Players */}
          <motion.div 
            style={styles.rightColumn}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Players Table */}
            <div style={styles.playersCard}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ ...styles.playersHeader, marginBottom: 0 }}>
                  <span>👥</span> Players ({roomData?.playerCount ?? 0})
                </h2>
                {allPlayers.length > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, allPlayers.length)} of {allPlayers.length}
                  </span>
                )}
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-white-a07)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '44px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: '15px' }}>
                          👤 No players yet
                        </td>
                      </tr>
                    ) : pagedPlayers.map((player, i) => {
                      const absIndex = startIndex + i;
                      const isMe = userId && String(player.userId) === String(userId);
                      const isReady = player.status === 'ready';
                      return (
                        <tr
                          key={player.userId || absIndex}
                          style={{
                            borderBottom: '1px solid var(--color-white-a04)',
                            background: isMe ? 'var(--color-accent-a06)' : absIndex % 2 === 0 ? 'transparent' : 'var(--color-white-a04)',
                            borderLeft: isMe ? '3px solid var(--color-accent)' : '3px solid transparent',
                            transition: 'background 0.2s',
                          }}
                        >
                          {/* Rank */}
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--color-text-faint)', fontWeight: '600', textAlign: 'center' }}>
                            {absIndex + 1}
                          </td>
                          {/* Player */}
                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: 'var(--radius-circle)',
                                background: isMe ? 'linear-gradient(135deg,var(--color-accent),var(--color-accent-2))' : 'var(--color-white-a07)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', flexShrink: 0,
                              }}>
                                {(player.displayName || player.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: isMe ? 'var(--color-accent)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <PlayerName displayName={player.displayName} username={player.username} userId={player.userId} />
                                  {isMe && <span style={{ fontSize: '10px', background: 'var(--color-accent-a20)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-a30)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: '700' }}>You</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Status */}
                          <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                              fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                              background: isReady ? 'var(--color-success-a12)' : 'var(--color-warning-a12)',
                              color: isReady ? 'var(--color-success)' : 'var(--color-warning)',
                              border: `1px solid ${isReady ? 'var(--color-success-a30)' : 'var(--color-warning-a30)'}`,
                            }}>
                              {player.status || 'waiting'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-white-a07)' }}>
                  <button
                    onClick={() => setPlayersPage(p => Math.max(0, p - 1))}
                    disabled={safePlayersPage === 0}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600',
                      background: safePlayersPage === 0 ? 'var(--color-white-a04)' : 'var(--color-accent-a15)',
                      color: safePlayersPage === 0 ? 'var(--color-text-faint)' : 'var(--color-accent)',
                      border: `1px solid ${safePlayersPage === 0 ? 'var(--color-white-a07)' : 'var(--color-accent-a30)'}`,
                      cursor: safePlayersPage === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ‹ Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPlayersPage(i)}
                      style={{
                        width: '34px', height: '34px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700',
                        background: i === safePlayersPage ? 'var(--color-accent-a20)' : 'var(--color-white-a04)',
                        color: i === safePlayersPage ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        border: `1px solid ${i === safePlayersPage ? 'var(--color-accent-a40)' : 'var(--color-white-a07)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => setPlayersPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePlayersPage === totalPages - 1}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600',
                      background: safePlayersPage === totalPages - 1 ? 'var(--color-white-a04)' : 'var(--color-accent-a15)',
                      color: safePlayersPage === totalPages - 1 ? 'var(--color-text-faint)' : 'var(--color-accent)',
                      border: `1px solid ${safePlayersPage === totalPages - 1 ? 'var(--color-white-a07)' : 'var(--color-accent-a30)'}`,
                      cursor: safePlayersPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
