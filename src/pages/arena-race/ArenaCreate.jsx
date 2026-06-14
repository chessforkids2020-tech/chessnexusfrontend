import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function ArenaCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const clubId = searchParams.get('clubId') || '';
  const [linkToClub, setLinkToClub] = useState(Boolean(clubId));
  
  // Form state
  const [raceName, setRaceName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [timeLimit, setTimeLimit] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [startMode, setStartMode] = useState('auto');
  const [startDelay, setStartDelay] = useState(5);
  
  // UI state
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [error, setError] = useState('');

  // Fetch available topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoadingTopics(true);
        const response = await api.get('/api/arena/topics');
        setTopics(response.data.topics || []);
        if (response.data.topics && response.data.topics.length > 0) {
          setSelectedTopic(response.data.topics[0].id);
        }
      } catch (err) {
        setError('Failed to load topics. Please refresh the page.');
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTopics();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please log in to create a race');
      return;
    }

    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    // Calculate planned start from delay (relative to now, no timezone conversion needed)
    const plannedStart = new Date(Date.now() + startDelay * 60 * 1000);

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/arena/create', {
        raceName: raceName.trim() || `${user.displayName || user.username}'s Race`,
        topic: selectedTopic,
        timeLimit,
        maxPlayers,
        startMode,
        plannedStartTime: plannedStart.toISOString(),
        ...(clubId && linkToClub ? { clubId } : {})
      });

      if (response.data.ok) {
        // Redirect host to waiting room
        navigate(`/arena/waiting/${response.data.roomId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create race');
    } finally {
      setLoading(false);
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
      maxWidth: '600px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
      paddingTop: '40px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
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
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    formGroup: {
      marginBottom: '24px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#e5e7eb',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      color: '#fff',
      outline: 'none',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      color: '#fff',
      outline: 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    rangeContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    rangeInput: {
      flex: 1,
      height: '8px',
      borderRadius: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      outline: 'none',
      cursor: 'pointer',
      accentColor: '#10b981',
    },
    rangeValue: {
      minWidth: '60px',
      textAlign: 'center',
      padding: '8px 12px',
      background: 'rgba(16, 185, 129, 0.2)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '8px',
      color: '#10b981',
      fontWeight: '700',
      fontSize: '16px',
    },
    hint: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '6px',
    },
    error: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      padding: '12px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      marginBottom: '20px',
      textAlign: 'center',
    },
    button: {
      width: '100%',
      padding: '16px 24px',
      fontSize: '18px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      border: 'none',
      borderRadius: '12px',
      color: '#fff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    backLink: {
      display: 'block',
      textAlign: 'center',
      marginTop: '20px',
      color: '#9ca3af',
      textDecoration: 'none',
      fontSize: '14px',
      cursor: 'pointer',
    },
    topicOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    puzzleCount: {
      fontSize: '12px',
      color: '#6b7280',
      marginLeft: 'auto',
    },
    scoringInfo: {
      background: 'rgba(6, 182, 212, 0.1)',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    },
    scoringTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#06b6d4',
      marginBottom: '12px',
      textAlign: 'center',
    },
    scoringItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    scoringLabel: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    scoringValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#10b981',
    },
    scoringNote: {
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'center',
      marginTop: '12px',
      fontStyle: 'italic',
    },
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: '#fff', marginBottom: '8px' }}>Login Required</h2>
              <p style={{ color: '#9ca3af' }}>Please log in to create an arena race</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        <motion.div
          style={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={styles.title}>🏁 Create Arena Race</h1>
          <p style={styles.subtitle}>Set up your own puzzle race and challenge friends!</p>
        </motion.div>

        <motion.div
          style={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <form onSubmit={handleCreate}>
            {error && <div style={styles.error}>❌ {error}</div>}

            {/* Race Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Race Name (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder={`${user.displayName || user.username}'s Race`}
                maxLength={50}
              />
              <div style={styles.hint}>Leave blank for default name</div>
            </div>

            {/* Topic Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Puzzle Topic *</label>
              {loadingTopics ? (
                <div style={{ ...styles.input, color: '#6b7280' }}>Loading topics...</div>
              ) : (
                <select
                  style={styles.select}
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  required
                >
                  <option value="">Select a topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.icon} {topic.title} ({topic.puzzleCount} puzzles)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {clubId && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Club Visibility</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e5e7eb', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={linkToClub}
                    onChange={(e) => setLinkToClub(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#10b981' }}
                  />
                  Show in this club's Featured Club Events
                </label>
                <div style={styles.hint}>
                  Turn this off to create a private/outside-club race from this page.
                </div>
              </div>
            )}

            {/* Time Limit */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Time Limit</label>
              <div style={styles.rangeContainer}>
                <input
                  type="range"
                  style={styles.rangeInput}
                  min="1"
                  max="30"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                />
                <div style={styles.rangeValue}>{timeLimit} min</div>
              </div>
              <div style={styles.hint}>Race duration (1-30 minutes)</div>
            </div>

            {/* Max Players */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Max Players</label>
              <div style={styles.rangeContainer}>
                <input
                  type="range"
                  style={styles.rangeInput}
                  min="2"
                  max="20"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                />
                <div style={styles.rangeValue}>{maxPlayers}</div>
              </div>
              <div style={styles.hint}>Maximum players allowed (2-20)</div>
            </div>

            {/* Start Delay */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Race Starts In *</label>
              <select
                style={styles.select}
                value={startDelay}
                onChange={(e) => setStartDelay(parseInt(e.target.value))}
              >
                <option value={5}>⏱ In 5 minutes</option>
                <option value={10}>⏱ In 10 minutes</option>
                <option value={15}>⏱ In 15 minutes</option>
                <option value={30}>⏱ In 30 minutes</option>
                <option value={60}>⏱ In 1 hour</option>
              </select>
            </div>

            {/* Start Mode */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Mode</label>
              <select
                style={styles.select}
                value={startMode}
                onChange={(e) => setStartMode(e.target.value)}
              >
                <option value="auto">Auto start at scheduled time</option>
                <option value="manual">Manual start by host</option>
              </select>
            </div>

            {/* Scoring Information */}
            <div style={styles.scoringInfo}>
              <div style={styles.scoringTitle}>💰 Scoring System</div>
              <div style={styles.scoringItem}>
                <span style={styles.scoringLabel}>Base Points per Puzzle:</span>
                <span style={styles.scoringValue}>10 points</span>
              </div>
              <div style={styles.scoringItem}>
                <span style={styles.scoringLabel}>Time Bonus Threshold:</span>
                <span style={styles.scoringValue}>10 seconds</span>
              </div>
              <div style={styles.scoringItem}>
                <span style={styles.scoringLabel}>Time Bonus Points:</span>
                <span style={styles.scoringValue}>5 points</span>
              </div>
              <div style={styles.scoringNote}>
                Solve puzzles within 10 seconds to earn bonus points!
              </div>
            </div>

            {/* Create Button */}
            <motion.button
              type="submit"
              style={{
                ...styles.button,
                ...(loading || loadingTopics ? styles.buttonDisabled : {})
              }}
              disabled={loading || loadingTopics}
              whileHover={!loading && !loadingTopics ? { y: -2, boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)' } : {}}
              transition={{ duration: 0.2 }}
            >
              {loading ? '🔄 Creating Race...' : '🚀 Create Race'}
            </motion.button>
          </form>

          <div 
            style={styles.backLink}
            onClick={() => navigate('/arena')}
          >
            ← Back to Arena
          </div>
        </motion.div>
      </div>
    </div>
  );
}
