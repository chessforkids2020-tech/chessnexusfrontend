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
  // Coach mode: a private race for the coach's own students only.
  const coachMode = searchParams.get('coach') === '1';
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
        ...(coachMode ? { coachPrivate: true } : {}),
        ...(!coachMode && clubId && linkToClub ? { clubId } : {})
      });

      if (response.data.ok) {
        // Coach → their live view; everyone else → the waiting room.
        navigate(coachMode
          ? `/coach/arena/${response.data.roomId}`
          : `/arena/waiting/${response.data.roomId}`);
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
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      color: 'var(--color-text-muted)',
    },
    card: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    formGroup: {
      marginBottom: '24px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--color-text)',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--color-text)',
      outline: 'none',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--color-text)',
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
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-white-a10)',
      outline: 'none',
      cursor: 'pointer',
      accentColor: 'var(--color-success)',
    },
    rangeValue: {
      minWidth: '60px',
      textAlign: 'center',
      padding: '8px 12px',
      background: 'var(--color-success-a20)',
      border: '1px solid var(--color-success-a30)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-success)',
      fontWeight: '700',
      fontSize: '16px',
    },
    hint: {
      fontSize: '12px',
      color: 'var(--color-text-faint)',
      marginTop: '6px',
    },
    error: {
      background: 'var(--color-danger-a12)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-a20)',
      padding: '12px 16px',
      borderRadius: 'var(--radius-lg)',
      fontSize: '14px',
      marginBottom: '20px',
      textAlign: 'center',
    },
    button: {
      width: '100%',
      padding: '16px 24px',
      fontSize: '18px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      border: 'none',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--color-text)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    backLink: {
      display: 'block',
      textAlign: 'center',
      marginTop: '20px',
      color: 'var(--color-text-muted)',
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
      color: 'var(--color-text-faint)',
      marginLeft: 'auto',
    },
    scoringInfo: {
      background: 'var(--color-accent-a12)',
      border: '1px solid var(--color-accent-a20)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      marginBottom: '24px',
    },
    scoringTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'var(--color-accent)',
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
      color: 'var(--color-text-muted)',
    },
    scoringValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--color-success)',
    },
    scoringNote: {
      fontSize: '12px',
      color: 'var(--color-text-faint)',
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
              <h2 style={{ color: 'var(--color-text)', marginBottom: '8px' }}>Login Required</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>Please log in to create an arena race</p>
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
          <h1 style={styles.title}>🏁 {coachMode ? 'Private Class Race' : 'Create Arena Race'}</h1>
          <p style={styles.subtitle}>
            {coachMode
              ? 'Only your students can join. You get a live results view.'
              : 'Set up your own puzzle race and challenge friends!'}
          </p>
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
                <div style={{ ...styles.input, color: 'var(--color-text-faint)' }}>Loading topics...</div>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={linkToClub}
                    onChange={(e) => setLinkToClub(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-success)' }}
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

            {/* Max Players — hidden for coach races (auto-sized to the roster) */}
            {!coachMode && (
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
            )}
            {coachMode && (
              <div style={{ ...styles.scoringInfo, marginBottom: 24 }}>
                <div style={{ color: 'var(--color-accent)', fontSize: 14 }}>
                  🎓 All your accepted students will be able to join this race. No join code is shared — it's private to your class.
                </div>
              </div>
            )}

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
              whileHover={!loading && !loadingTopics ? { y: -2, boxShadow: '0 6px 24px var(--color-accent-a40)' } : {}}
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
