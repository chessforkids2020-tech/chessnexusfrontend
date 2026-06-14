// src/pages/WaitingRoom.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from '../api';
import socket from "../socket";
import { motion } from "framer-motion";

export default function WaitingRoom() {
  const { roundId, batchId } = useParams();
  const nav = useNavigate();
  const [batch, setBatch] = useState(null);
  const [round, setRound] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [loading, setLoading] = useState(true);
  const joinedRef = useRef(false);

  useEffect(() => {
    // fetch user info and batch data
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, roundsRes] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/public/rounds')
        ]);
        
        const currentUser = userRes.data.user;
        setUser(currentUser);
        
        const rounds = roundsRes.data || [];
        const r = rounds.find((x) => x._id === roundId);
        setRound(r || null);
        if (r) {
          const b = (r.batches || []).find((bb) => bb._id === batchId);
          setBatch(b || null);
          
          // Check if user is assigned to this batch
          if (!currentUser.assignedBatch || currentUser.assignedBatch._id !== batchId) {
            setAccessError('You are not assigned to this batch. Please contact an administrator.');
          }
        }
      } catch (err) {
        setAccessError('Failed to load waiting room data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roundId, batchId]);

  useEffect(() => {
    // join waiting room via socket - only if user has access
    if (!joinedRef.current && !accessError && user) {
      socket.emit("join:waiting", { roundId, batchId });
      joinedRef.current = true;
    }

    const waitingHandler = (payload) => {
      setMessages((m) => [{ ts: Date.now(), text: payload.message } , ...m].slice(0, 30));
    };
    const batchStartedHandler = (data) => {
      // Only react to the event when it matches this batch
      if (data.batchId === batchId) {
        setMessages((m) => [{ ts: Date.now(), text: "Batch started by admin — redirecting to puzzle..." }, ...m]);
        // small delay then redirect to first puzzle in batch if present
        setTimeout(() => {
          // find first puzzle for the batch by fetching fresh data
          api.get('/api/public/rounds').then(res => {
            const r = (res.data || []).find(x => x._id === roundId);
            if (!r) return;
            const b = (r.batches || []).find(bb => bb._id === batchId);
            if (!b || !b.puzzles || b.puzzles.length === 0) {
              alert("No puzzles assigned to this batch yet.");
              return;
            }
            const firstPuzzleId = b.puzzles[0]._id;
            nav(`/puzzle/${roundId}/${batchId}/${firstPuzzleId}`);
          });
        }, 900);
      }
    };

    socket.on("waiting:update", waitingHandler);
    socket.on("batch:started", batchStartedHandler);
    // Also handle global start broadcasts (may be emitted if server uses global notify)
    socket.on("batch:started:global", (data) => {
      if (data && data.batchId === batchId) {
        batchStartedHandler(data);
      }
    });

    return () => {
      socket.emit("leave:waiting", { roundId, batchId });
      socket.off("waiting:update", waitingHandler);
      socket.off("batch:started", batchStartedHandler);
    };
  }, [roundId, batchId, nav, accessError, user]);

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
      display: 'flex',
      gap: '24px',
    },
    mainCard: {
      flex: 1,
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    sidePanel: {
      width: '350px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    sideCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0 0 24px 0',
      color: '#9ca3af',
      fontWeight: '400',
    },
    metaInfo: {
      display: 'flex',
      gap: '20px',
      marginBottom: '24px',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    metaItem: {
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '500',
    },
    metaValue: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#ffffff',
      margin: '0 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    instructions: {
      marginBottom: '24px',
      padding: '20px',
      background: 'rgba(6, 182, 212, 0.1)',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      borderRadius: '16px',
    },
    instructionsText: {
      color: '#9ca3af',
      fontSize: '14px',
      lineHeight: '1.6',
      margin: '0',
    },
    messagesContainer: {
      marginTop: '20px',
      borderRadius: '16px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '20px',
      minHeight: '200px',
      maxHeight: '300px',
      overflowY: 'auto',
    },
    messageItem: {
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      color: '#ffffff',
      fontSize: '14px',
    },
    noMessages: {
      color: '#9ca3af',
      fontStyle: 'italic',
      textAlign: 'center',
      padding: '40px 20px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
    },
    secondaryButton: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#9ca3af',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    participantsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    participantRow: {
      padding: '12px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      color: '#ffffff',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    },
    roundInfoItem: {
      color: '#9ca3af',
      fontSize: '14px',
      marginBottom: '8px',
    },
    roundInfoValue: {
      color: '#ffffff',
      fontWeight: '500',
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
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>⏳</div>
            <h2 style={styles.loadingTitle}>Loading Waiting Room</h2>
            <p style={styles.loadingText}>
              Please wait while we load the waiting room data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.loadingIcon}>🚫</div>
            <h2 style={styles.errorTitle}>Access Denied</h2>
            <p style={styles.errorText}>{accessError}</p>
            <motion.button 
              style={styles.primaryButton}
              onClick={() => nav('/')}
              whileHover={{ 
                y: -2,
                boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              Back to Dashboard
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Format display name
  const formatDisplayName = (userData) => {
    if (!userData) return '';
    return userData.displayName || '';
  };

  // Responsive styles
  const responsiveStyles = `
    @media (max-width: 1024px) {
      .waiting-room-content {
        flex-direction: column !important;
        gap: 20px !important;
      }
      .waiting-room-side-panel {
        width: 100% !important;
        order: 2;
      }
      .waiting-room-main-card {
        order: 1;
      }
    }
    
    @media (max-width: 768px) {
      .waiting-room-container {
        padding: 16px !important;
      }
      .waiting-room-main-card {
        padding: 24px !important;
      }
      .waiting-room-side-panel {
        gap: 16px !important;
      }
      .waiting-room-side-card {
        padding: 20px !important;
      }
    }
  `;

  return (
    <div style={styles.container} className="waiting-room-container">
      <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      <div style={styles.background}></div>
      
      <div style={styles.content} className="waiting-room-content">
        <motion.div 
          style={styles.mainCard}
          className="waiting-room-main-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={styles.title}>
            {round?.name || `Round ${round?.number || 'Unknown'}`}
          </h2>

          <div style={styles.metaInfo}>
            <div style={styles.metaItem}>
              Batch: <span style={styles.metaValue}>{batch?.name || "Loading..."}</span>
            </div>
            <div style={styles.metaItem}>
              Participants: <span style={styles.metaValue}>{ (batch?.users||[]).length }</span>
            </div>
            <div style={styles.metaItem}>
              Puzzles: <span style={styles.metaValue}>{ (batch?.puzzles||[]).length }</span>
            </div>
            <div style={styles.metaItem}>
              Status: <span style={{...styles.metaValue, color: batch?.isLive ? '#10b981' : '#f59e0b'}}>
                {batch?.isLive ? 'Live' : 'Waiting'}
              </span>
            </div>
          </div>

          <h3 style={styles.sectionTitle}>� Joined Participants</h3>
          <div style={styles.messagesContainer}>
            {(batch?.users || []).length === 0 ? (
              <div style={styles.noMessages}>
                No participants have joined yet
              </div>
            ) : (
              (batch?.users || []).map(u => (
                <motion.div 
                  key={u._id} 
                  style={styles.participantRow}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {formatDisplayName(u)} - Joined
                </motion.div>
              ))
            )}
          </div>

          <div style={styles.buttonGroup}>
            <motion.button 
              style={styles.secondaryButton}
              onClick={() => nav(-1)}
              whileHover={{ 
                borderColor: 'rgba(255, 255, 255, 0.2)',
                y: -2 
              }}
              transition={{ duration: 0.2 }}
            >
              ← Back
            </motion.button>
            <motion.button 
              style={styles.primaryButton}
              onClick={() => nav('/')}
              whileHover={{ 
                y: -2,
                boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              Go to Dashboard
            </motion.button>
          </div>
        </motion.div>

        <div style={styles.sidePanel} className="waiting-room-side-panel">
          <motion.div 
            style={styles.sideCard}
            className="waiting-room-side-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 style={styles.sectionTitle}>👥 Participants</h3>
            <div style={styles.participantsList}>
              {(batch?.users || []).length === 0 ? (
                <div style={styles.noMessages}>No participants listed</div>
              ) : (
                (batch?.users || []).map(u => (
                  <motion.div 
                    key={u._id} 
                    style={styles.participantRow}
                    whileHover={{ 
                      borderColor: 'rgba(6, 182, 212, 0.2)',
                      background: 'rgba(6, 182, 212, 0.1)'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {formatDisplayName(u)}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div 
            style={styles.sideCard}
            className="waiting-room-side-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h3 style={styles.sectionTitle}>📋 Instructions</h3>
            <p style={styles.instructionsText}>
              Wait here until admin starts this batch. When admin starts, you will be redirected to the first puzzle automatically.
              Stay connected and ready to begin!
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}