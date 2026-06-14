import React, { useEffect, useState } from "react";
import api from '../api';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function PuzzleTournament() {
  const [rounds, setRounds] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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
        setErr(null);
      } catch (e) {
        if (retryCount < 2 && (e.code === 'NETWORK_ERROR' || e.response?.status >= 500 || e.response?.status === 401)) {
          setTimeout(() => fetchData(retryCount + 1), retryCount === 0 ? 800 : 2000);
          return;
        }

        if (e.response?.status === 401) {
          setErr('Session expired. Please log in again.');
          setTimeout(() => navigate('/login'), 3000);
        } else if (e.code === 'NETWORK_ERROR' || !navigator.onLine) {
          setErr('Network connection issue. Please check your internet and try again.');
        } else {
          setErr(e?.response?.data?.message || e.message || 'Failed to load tournament data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const isRoundAssigned = (round) => {
    if (!user || !user.assignedRounds || user.assignedRounds.length === 0) return false;
    return user.assignedRounds.some(r => r._id === round._id);
  };

  const getAssignedBatches = (round) => {
    if (!user || !round.batches) return [];
    
    return round.batches.filter(batch => {
      if (user.assignedBatch && batch._id === user.assignedBatch._id) return true;
      return false;
    });
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
      maxWidth: '1200px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
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
      margin: '0 0 12px 0',
      color: '#ffffff',
    },
    trophyIcon: {
      display: 'inline',
      color: '#FFD700', // Gold color for trophy
      textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
      marginRight: '10px',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0',
      color: '#9ca3af',
      fontWeight: '400',
    },
    noAssignment: {
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
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
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '24px', // Reduced padding
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    roundHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px', // Reduced margin
      paddingBottom: '12px', // Reduced padding
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    roundTitle: {
      color: '#ffffff',
      fontSize: '22px', // Slightly smaller font
      fontWeight: '600',
      margin: '0',
    },
    globalTime: {
      color: '#9ca3af',
      fontSize: '13px', // Smaller font
      fontWeight: '500',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '5px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    batchContainer: {
      marginBottom: '16px', // Reduced margin
      padding: '20px', // Reduced padding
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
    },
    batchHeader: {
      marginBottom: '12px', // Reduced margin
    },
    batchTitle: {
      color: '#ffffff',
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
      color: '#06b6d4',
      fontWeight: '500',
      background: 'rgba(6, 182, 212, 0.15)',
      padding: '4px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
    },
    participants: {
      color: '#9ca3af',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '4px 10px', // Reduced padding
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    viewResults: {
      color: '#9ca3af',
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
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
    },
    joinButtonWaiting: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      color: '#fff',
      border: 'none',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
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
      background: 'rgba(255, 215, 0, 0.15)',
      color: '#FFD700',
      border: '1px solid rgba(255, 215, 0, 0.2)',
      padding: '8px 20px', // Reduced padding
      borderRadius: '10px', // Slightly smaller
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    noBatchesMessage: {
      color: '#9ca3af',
      fontStyle: 'italic',
      textAlign: 'center',
      padding: '30px', // Reduced padding
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    noRounds: {
      textAlign: 'center',
      padding: '40px', // Reduced padding
      color: '#9ca3af',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    loadingIcon: {
      fontSize: '56px',
      marginBottom: '20px',
      color: '#06b6d4',
    },
    loadingTitle: {
      color: '#ffffff',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    loadingText: {
      color: '#9ca3af',
      fontSize: '15px',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    errorTitle: {
      color: '#ef4444',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    errorText: {
      color: '#9ca3af',
      fontSize: '15px',
      marginBottom: '24px',
    },
    retryButton: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#fff',
      border: 'none',
      padding: '12px 28px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
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
              onClick={() => window.location.reload()} 
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
    <div style={styles.container}>
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
        </div>

        {(!user?.assignedRounds || user.assignedRounds.length === 0) && (
          <motion.div 
            style={styles.noAssignment}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ color: '#ef4444', margin: '0 0 12px 0' }}>📋 Assignment Status</h3>
            <p style={{ color: '#9ca3af', margin: '0' }}>
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
                        borderColor: 'rgba(6, 182, 212, 0.2)',
                        boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2)'
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div style={styles.batchHeader}>
                        <h3 style={styles.batchTitle}>{batch.name}</h3>
                      </div>

                      <div style={styles.batchInfo}>
                        <span style={styles.duration}>Duration: {durationMinutes} min</span>
                        <span style={styles.participants}>• {totalParticipants} participants</span>
                      </div>

                      <div style={styles.viewResults}>
                        💡 View results & leaderboard anytime
                      </div>

                      <div style={styles.actionButtons}>
                        {isAssignedToBatch ? (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Link
                              to={`/waiting/${round._id}/${batch._id}`}
                              style={batch.isLive ? styles.joinButton : styles.joinButtonWaiting}
                            >
                              🎯 {batch.isLive ? 'Join Now' : 'Waiting to Start'}
                            </Link>
                          </motion.div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                            Contact admin to be assigned
                          </span>
                        )}

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
            <h3 style={{ color: '#ffffff', margin: '0 0 12px 0' }}>📭 No Assigned Rounds</h3>
            <p style={{ color: '#9ca3af', margin: '0' }}>
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
            <h3 style={{ color: '#ffffff', margin: '0 0 12px 0' }}>📭 No Rounds Available</h3>
            <p style={{ color: '#9ca3af', margin: '0' }}>
              There are currently no tournament rounds available. Check back later!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}