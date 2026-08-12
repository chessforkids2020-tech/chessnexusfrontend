import React, { useEffect, useState, useRef } from "react";
import api from '../api';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import io from 'socket.io-client';

export default function PuzzleTournament() {
  const [rounds, setRounds] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [realTimeUpdate, setRealTimeUpdate] = useState(null); // For showing real-time notifications
  const [latestAssignedUser, setLatestAssignedUser] = useState(null); // Most recent user assigned (display)
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const fetchData = async (retryCount = 0) => {
    setLoading(true);
    try {
      const [userRes, roundsRes] = await Promise.all([
        api.get('/api/auth/me', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        }),
        api.get('/api/public/rounds', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        })
      ]);

      setUser(userRes.data.user);
      setRounds(roundsRes.data || []);

      // Compute initial latest assigned user (best-effort: last user in batches)
      try {
        const roundsData = roundsRes.data || [];
        let latest = null;
        roundsData.forEach(r => {
          (r.batches || []).forEach(b => {
            if (b.users && b.users.length > 0) {
              const u = b.users[b.users.length - 1];
              latest = { id: u._id, name: u.displayName || u.username, batchName: b.name };
            }
          });
        });
        if (latest) setLatestAssignedUser(latest);
      } catch (e) {
      }

      setErr(null);
    } catch (e) {
      if (retryCount < 2 && (e.code === 'NETWORK_ERROR' || e.code === 'ERR_NETWORK' || e.response?.status >= 500 || e.response?.status === 401)) {
        setTimeout(() => fetchData(retryCount + 1), retryCount === 0 ? 800 : 2000);
        return;
      }

      if (e.response?.status === 401) {
        setErr('Session expired. Please log in again.');
        setTimeout(() => navigate('/login'), 3000);
      } else if (e.code === 'NETWORK_ERROR' || e.code === 'ERR_NETWORK' || !navigator.onLine) {
        setErr('Network connection issue. Please check your internet and try again.');
      } else {
        setErr(e?.response?.data?.message || e.message || String(e) || 'Failed to load tournament data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Setup socket connection for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        socketRef.current = io(API_URL, {
          auth: { token },
          transports: ['polling', 'websocket'] // Polling first for production reliability
        });
        
        const socket = socketRef.current;
        
        // Listen for real-time tournament updates
        socket.on('roundCreated', (data) => {
          setRealTimeUpdate(`✨ New round created: ${data.roundName}`);
          setTimeout(() => setRealTimeUpdate(null), 5000);
          // Refresh data to show new round
          fetchData();
        });
        
        socket.on('batchCreated', (data) => {
          setRealTimeUpdate(`🎯 New batch created: ${data.batchName} in ${data.roundName}`);
          setTimeout(() => setRealTimeUpdate(null), 5000);
          // Refresh data to show new batch
          fetchData();
        });
        
        socket.on('userAssigned', (data) => {
          // Update latest assigned user display
          const name = data.displayName || data.username || `User ${data.userId}`;
          setLatestAssignedUser({ id: data.userId, name, batchName: data.batchName });

          // Check if this assignment is for current user
          if (user && data.userId === user._id) {
            setRealTimeUpdate(`🎉 You've been assigned to batch: ${data.batchName}!`);
            setTimeout(() => setRealTimeUpdate(null), 7000);
            // Refresh user data to show new assignment
            fetchData();
          }
        });

        // When a batch is stopped, refresh data and clear any waiting buttons
        socket.on('batch:stopped', (data) => {
          setRealTimeUpdate('🛑 Batch stopped by admin');
          setTimeout(() => setRealTimeUpdate(null), 5000);
          fetchData();
        });
        
        socket.on('tournamentUpdate', (data) => {
          // General tournament update - refresh data
          fetchData();
        });
        
        socket.on('connect', () => {
        });
        
        socket.on('disconnect', () => {
        });
        
      } catch (error) {
      }
    }
    
    // Cleanup socket on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate, user?._id]); // Re-setup socket when user changes

  const isRoundAssigned = (round) => {
    if (!user || !user.assignedRounds || user.assignedRounds.length === 0) return false;
    return user.assignedRounds.some(r => r._id === round._id);
  };

  const getAssignedBatches = (round) => {
    if (!user || !round.batches) {
      return [];
    }
    
    const assignedBatches = round.batches.filter(batch => {
      // Check if user is assigned to this batch via user.assignedBatch
      if (user.assignedBatch && batch._id === user.assignedBatch._id) {
        return true;
      }
      
      // Also check if user is in the batch.users array
      if (batch.users && batch.users.some(batchUser => batchUser._id === user._id || batchUser._id === user.id)) {
        return true;
      }
      
      return false;
    });
    
    return assignedBatches;
  };

  // Format display name (shared helper)
  const formatDisplayName = (userData) => {
    if (!userData) return '';
    if (typeof userData === 'string') return userData.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return userData.displayName || '';
  };

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-bg)',
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
      background: 'radial-gradient(circle at 20% 50%, var(--color-accent-2-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      padding: '32px 28px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      color: 'var(--color-text)',
    },
    trophyIcon: {
      display: 'inline',
      color: 'var(--color-warning)', // Gold color for trophy
      textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
      marginRight: '10px',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0',
      color: 'var(--color-text-muted)',
      fontWeight: '400',
    },
    noAssignment: {
      background: 'var(--color-danger-a12)',
      border: '1px solid var(--color-danger-a20)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '30px',
      textAlign: 'center',
      backdropFilter: 'blur(10px)',
    },
    roundsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px', // Reduced gap between rounds
    },
    roundContainer: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '24px', // Reduced padding
      boxShadow: '0 8px 32px var(--color-black-a50)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    roundHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px', // Reduced margin
      paddingBottom: '12px', // Reduced padding
      borderBottom: '1px solid var(--color-white-a04)',
    },
    roundTitle: {
      color: 'var(--color-text)',
      fontSize: '22px', // Slightly smaller font
      fontWeight: '600',
      margin: '0',
    },
    globalTime: {
      color: 'var(--color-text-muted)',
      fontSize: '13px', // Smaller font
      fontWeight: '500',
      background: 'var(--color-black-a35)',
      padding: '5px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid var(--color-white-a04)',
    },
    batchContainer: {
      marginBottom: '16px', // Reduced margin
      padding: '20px', // Reduced padding
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
    },
    batchHeader: {
      marginBottom: '12px', // Reduced margin
    },
    batchTitle: {
      color: 'var(--color-text)',
      fontSize: '18px', // Smaller font
      fontWeight: '600',
      margin: '0 0 8px 0',
    },
    batchInfo: {
      display: 'flex',
      gap: '16px', // Reduced gap
      marginBottom: '10px', // Reduced margin
      fontSize: '14px',
    },
    duration: {
      color: 'var(--color-accent)',
      fontWeight: '500',
      background: 'var(--color-accent-a15)',
      padding: '4px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid var(--color-accent-a20)',
    },
    participants: {
      color: 'var(--color-text-muted)',
      background: 'var(--color-black-a35)',
      padding: '4px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid var(--color-white-a04)',
    },
    viewResults: {
      color: 'var(--color-text-muted)',
      fontSize: '14px',
      marginBottom: '16px', // Reduced margin
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    actionButtons: {
      display: 'flex',
      gap: '10px', // Reduced gap
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    joinButton: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
    joinButtonWaiting: {
      background: 'linear-gradient(135deg, var(--color-warning) 0%, #f97316 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-warning-a30)',
    },
    resultsButton: {
      background: 'rgba(111, 66, 193, 0.15)',
      color: '#9f7aea',
      border: '1px solid rgba(111, 66, 193, 0.2)',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    boardButton: {
      background: 'var(--color-warning-a12)',
      color: 'var(--color-warning)',
      border: '1px solid var(--color-warning-a20)',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    noBatchesMessage: {
      color: 'var(--color-text-muted)',
      fontStyle: 'italic',
      textAlign: 'center',
      padding: '30px', // Reduced padding
      background: 'var(--color-black-a35)',
      borderRadius: '16px',
      border: '1px solid var(--color-white-a04)',
    },
    noRounds: {
      textAlign: 'center',
      padding: '40px', // Reduced padding
      color: 'var(--color-text-muted)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    loadingIcon: {
      fontSize: '56px',
      marginBottom: '20px',
      color: 'var(--color-accent)',
    },
    loadingTitle: {
      color: 'var(--color-text)',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    loadingText: {
      color: 'var(--color-text-muted)',
      fontSize: '15px',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'var(--color-danger-a12)',
      border: '1px solid var(--color-danger-a20)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    errorTitle: {
      color: 'var(--color-danger)',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    errorText: {
      color: 'var(--color-text-muted)',
      fontSize: '15px',
      marginBottom: '24px',
    },
    retryButton: {
      background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger) 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '12px 28px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-danger-a30)',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>⏳</div>
            <h2 style={styles.loadingTitle}>Loading Tournament Data</h2>
            <p style={styles.loadingText}>
              Fetching available rounds and batches...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.loadingIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Error</h2>
            <p style={styles.errorText}>{err}</p>
            <motion.button 
              onClick={() => fetchData(0)} 
              style={styles.retryButton}
              whileHover={{ 
                y: -2,
                boxShadow: '0 6px 24px rgba(239, 68, 68, 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              Retry
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{...styles.container, position: 'relative'}}>
      {/* Real-time notification banner */}
      {realTimeUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, var(--color-accent-2) 0%, var(--color-accent-2) 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px var(--color-success-a30)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--color-white-a20)',
            fontSize: '14px',
            fontWeight: '500',
            animation: 'pulse 2s infinite'
          }}
        >
          {realTimeUpdate}
        </motion.div>
      )}
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.trophyIcon}>🏆</span>
            Tournament Rounds
          </h1>
          <p style={styles.subtitle}>
            Welcome, {user?.displayName}!
            Choose a round and pick a batch to join. Admin controls when each batch goes live.
          </p>

          {latestAssignedUser && (
            <div style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: 14 }}>
              🔔 Latest assigned: <strong style={{ color: 'var(--color-accent)' }}>{latestAssignedUser.name}</strong> — {latestAssignedUser.batchName}
            </div>
          )}
        </div>

        {(!user?.assignedRounds || user.assignedRounds.length === 0) && (
          <motion.div 
            style={styles.noAssignment}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ color: 'var(--color-danger)', margin: '0 0 12px 0' }}>📋 Assignment Status</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: '0' }}>
              You are not assigned to any round yet. Please contact an administrator.
            </p>
          </motion.div>
        )}

        <div style={styles.roundsList}>
          {rounds.map((round) => {
            const assignedBatches = getAssignedBatches(round);
            const isUserAssignedToRound = isRoundAssigned(round);

            if (assignedBatches.length === 0) return null;

            return (
              <motion.div
                key={round._id}
                style={styles.roundContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={styles.roundHeader}>
                  <h2 style={styles.roundTitle}>
                    {round.name || `Round ${round.number || 'Unknown'}`}
                  </h2>
                  <span style={styles.globalTime}>
                    Global time: {round.startDate ? new Date(round.startDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'Not set'}
                  </span>
                </div>

                {assignedBatches.map((batch) => {
                  const canJoin = batch.isLive;
                  const totalParticipants = batch.users?.length || 0;
                  const durationMinutes = batch.durationSec ? Math.round(batch.durationSec / 60) : 0;
                  const isAssignedToBatch = true;

                  return (
                    <motion.div
                      key={batch._id}
                      style={styles.batchContainer}
                      whileHover={{ 
                        borderColor: 'var(--color-accent-a20)',
                        boxShadow: '0 8px 32px var(--color-accent-a20)'
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div style={styles.batchHeader}>
                        <h3 style={styles.batchTitle}>{batch.name}</h3>
                        {/* Latest assigned user for this batch */}
                        {batch?.users && batch.users.length > 0 && (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            Latest assigned: {formatDisplayName(batch.users[batch.users.length - 1])}
                          </div>
                        )}
                      </div>

                      <div style={styles.batchInfo}>
                        <span style={styles.duration}>Duration: {durationMinutes} min</span>
                        <span style={styles.participants}>• {totalParticipants} participants</span>
                      </div>

                      <div style={styles.viewResults}>
                        💡 View results & leaderboard anytime
                      </div>

                      <div style={styles.actionButtons}>
                        { /* Determine assignment and batch states */ }
                        {(() => {
                          const isAssignedToBatch = (user.assignedBatch && batch._id === user.assignedBatch._id) ||
                            (batch.users && batch.users.some(bu => bu._id === user._id || bu._id === user.id));
                          const batchDone = !batch.isActive && batch.startedAt; // started & not active => finished

                          if (batchDone) {
                            return (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                                ✅ Batch finished
                              </span>
                            );
                          }

                          if (!isAssignedToBatch) {
                            return (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                                Contact admin to be assigned
                              </span>
                            );
                          }

                          // At this point user is assigned to this batch and batch is not done
                          if (batch.isActive) {
                            return (
                              <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                                <Link to={`/waiting/${round._id}/${batch._id}`} style={styles.joinButton}>
                                  🎯 Join Now
                                </Link>
                              </motion.div>
                            );
                          }

                          // Assigned but not yet started — allow entering waiting room early
                          return (
                            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                              <Link
                                to={`/waiting/${round._id}/${batch._id}`}
                                style={{ ...styles.joinButtonWaiting, opacity: 0.95 }}
                                aria-label={`Enter waiting room for ${batch.name}`}
                              >
                                ⏳ Enter Waiting Room
                              </Link>
                            </motion.div>
                          );
                        })()}


                        <motion.button 
                          style={styles.resultsButton}
                          onClick={() => navigate(`/results/${batch._id}`)}
                          whileHover={{ 
                            borderColor: 'rgba(111, 66, 193, 0.4)',
                            background: 'rgba(111, 66, 193, 0.25)',
                            y: -2
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          📊 Results
                        </motion.button>

                        <motion.button 
                          style={styles.boardButton}
                          onClick={() => navigate(`/leaderboard/${batch._id}`)}
                          whileHover={{ 
                            borderColor: 'rgba(23, 162, 184, 0.4)',
                            background: 'rgba(23, 162, 184, 0.25)',
                            y: -2
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          🏆 Leaderboard
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}

          {rounds.map((round) => {
            const assignedBatches = getAssignedBatches(round);
            if (assignedBatches.length > 0) return null;

            return (
              <motion.div
                key={`no-${round._id}`}
                style={styles.roundContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={styles.roundHeader}>
                  <h2 style={styles.roundTitle}>{round.name}</h2>
                  <span style={styles.globalTime}>
                    Global time: {new Date(round.startDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>

                <div style={styles.noBatchesMessage}>
                  No batches available for you in this round
                </div>
              </motion.div>
            );
          })}
        </div>

        {(!user?.assignedRounds || user.assignedRounds.length === 0) && rounds.length > 0 && (
          <motion.div 
            style={styles.noRounds}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 12px 0' }}>📭 No Assigned Rounds</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: '0' }}>
              You don't have any tournament rounds assigned yet. Contact an administrator to be assigned to a round.
            </p>
          </motion.div>
        )}

        {rounds.length === 0 && (
          <motion.div 
            style={styles.noRounds}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 12px 0' }}>📭 No Rounds Available</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: '0' }}>
              There are currently no tournament rounds available. Check back later!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
