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
  const [joinedParticipants, setJoinedParticipants] = useState([]);
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
          
          console.log('WaitingRoom: Assignment check', {
            batchId,
            userAssignedBatch: currentUser.assignedBatch,
            batchUsers: b?.users?.map(u => ({ id: u._id, username: u.username })),
            currentUserId: currentUser._id,
            batchStatus: b?.isLive ? 'Live' : 'Waiting',
            batchName: b?.name
          });
          
          // Check if user is assigned to this batch - check both assignedBatch field and batch.users array
          const isAssignedViaBatchField = currentUser.assignedBatch && currentUser.assignedBatch._id === batchId;
          const isAssignedViaBatchUsers = b && b.users && b.users.some(u => u._id === currentUser._id || u._id === currentUser.id);
          
          if (!isAssignedViaBatchField && !isAssignedViaBatchUsers) {
            console.log('WaitingRoom: Access denied', {
              isAssignedViaBatchField, 
              isAssignedViaBatchUsers,
              reason: 'User not found in batch assignments'
            });
            setAccessError('You are not assigned to this batch. Please contact an administrator.');
          } else {
            // Clear any existing access error if access is granted
            setAccessError(null);
          }
        }
      } catch (err) {
        setAccessError('Failed to load waiting room data');
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Re-check access every 5 seconds to handle batch state changes
    const intervalId = setInterval(fetchData, 5000);
    
    return () => clearInterval(intervalId);
  }, [roundId, batchId]);

  useEffect(() => {
    // join waiting room via socket - only if user has access and batch is not already finished
    const batchNotFinished = !batch || !(batch.startedAt && !batch.isActive);
    if (!joinedRef.current && !accessError && user && batchNotFinished) {
      console.log('WaitingRoom: Socket status', {
        connected: socket.connected,
        id: socket.id
      });
      
      const joinWaitingRoom = () => {
        if (socket.connected) {
          socket.emit("join:waiting", { roundId, batchId });
          joinedRef.current = true;
        } else {
          // Wait for socket to connect then join
          socket.once('connect', () => {
            socket.emit("join:waiting", { roundId, batchId });
            joinedRef.current = true;
          });
        }
      };
      
      joinWaitingRoom();
    }

    const waitingHandler = (payload) => {
      if (payload.message) {
        setMessages((m) => [{ ts: Date.now(), text: payload.message } , ...m].slice(0, 30));
      }
      // Update joined participants list if provided
      if (payload.participants) {
        setJoinedParticipants(payload.participants);
      }
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

    const batchStoppedHandler = (data) => {
      if (data.batchId === batchId) {
        setMessages((m) => [{ ts: Date.now(), text: "Batch stopped by admin — waiting room closed." }, ...m]);
        // Redirect to results after a short delay
        setTimeout(() => {
          nav(`/results/${batchId}`);
        }, 1200);
      }
    };

    socket.on("waiting:update", waitingHandler);
    socket.on("batch:started", batchStartedHandler);
    socket.on("batch:stopped", batchStoppedHandler);
    // Also handle global start/stop broadcasts (may be emitted if server uses global notify)
    socket.on("batch:started:global", (data) => {
      if (data && data.batchId === batchId) {
        batchStartedHandler(data);
      }
    });
    socket.on("batch:stopped:global", (data) => {
      if (data && data.batchId === batchId) {
        batchStoppedHandler(data);
      }
    });

    console.log('WaitingRoom: Socket listeners registered', {
      socketId: socket.id,
      socketConnected: socket.connected
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
      background: 'radial-gradient(circle at 20% 50%, var(--color-success-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)',
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
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    sidePanel: {
      width: '350px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    sideCard: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '24px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0 0 24px 0',
      color: 'var(--color-text-muted)',
      fontWeight: '400',
    },
    metaInfo: {
      display: 'flex',
      gap: '20px',
      marginBottom: '24px',
      padding: '16px',
      background: 'var(--color-black-a35)',
      borderRadius: '16px',
      border: '1px solid var(--color-white-a04)',
    },
    metaItem: {
      color: 'var(--color-text)',
      fontSize: '14px',
      fontWeight: '500',
    },
    metaValue: {
      color: 'var(--color-accent)',
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: '0 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    instructions: {
      marginBottom: '24px',
      padding: '20px',
      background: 'var(--color-accent-a12)',
      border: '1px solid var(--color-accent-a20)',
      borderRadius: '16px',
    },
    instructionsText: {
      color: 'var(--color-text-muted)',
      fontSize: '14px',
      lineHeight: '1.6',
      margin: '0',
    },
    messagesContainer: {
      marginTop: '20px',
      borderRadius: '16px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      padding: '20px',
      minHeight: '200px',
      maxHeight: '300px',
      overflowY: 'auto',
    },
    messageItem: {
      padding: '12px',
      borderBottom: '1px solid var(--color-white-a04)',
      color: 'var(--color-text)',
      fontSize: '14px',
    },
    noMessages: {
      color: 'var(--color-text-muted)',
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
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
    secondaryButton: {
      background: 'var(--color-white-a04)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-white-a10)',
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
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '12px',
      color: 'var(--color-text)',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    },
    roundInfoItem: {
      color: 'var(--color-text-muted)',
      fontSize: '14px',
      marginBottom: '8px',
    },
    roundInfoValue: {
      color: 'var(--color-text)',
      fontWeight: '500',
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
                boxShadow: '0 6px 24px var(--color-accent-a40)'
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
              Status: <span style={{...styles.metaValue, color: batch?.isLive ? 'var(--color-success)' : 'var(--color-warning)'}}>
                {batch?.isLive ? 'Live' : 'Waiting'}
              </span>
            </div>
          </div>

          <h3 style={styles.sectionTitle}>🟢 Joined Participants</h3>
          <div style={styles.messagesContainer}>
            {joinedParticipants.length === 0 ? (
              <div style={styles.noMessages}>
                No participants have joined yet
              </div>
            ) : (
              joinedParticipants.map(participant => (
                <motion.div 
                  key={participant._id || participant.id} 
                  style={styles.participantRow}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {formatDisplayName(participant)} - Joined
                </motion.div>
              ))
            )}
          </div>

          <div style={styles.buttonGroup}>
            <motion.button 
              style={styles.secondaryButton}
              onClick={() => nav(-1)}
              whileHover={{ 
                borderColor: 'var(--color-white-a20)',
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
                boxShadow: '0 6px 24px var(--color-accent-a40)'
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
                      borderColor: 'var(--color-accent-a20)',
                      background: 'var(--color-accent-a12)'
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
