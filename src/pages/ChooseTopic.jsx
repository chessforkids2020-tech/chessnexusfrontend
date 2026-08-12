import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ChooseTopicDemo() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(5);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await api.get('/api/public/racer/topics');
        setTopics(response.data);
      } catch (error) {
        // Keep empty array if error
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

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
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      margin: '0',
      color: 'var(--color-text-muted)',
      fontWeight: '400',
    },
    topicsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      padding: '10px',
    },
    topicCard: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '28px',
      textAlign: 'center',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    },
    topicIcon: {
      fontSize: '52px',
      marginBottom: '16px',
      filter: 'drop-shadow(0 4px 12px var(--color-accent-a30))',
      transition: 'transform 0.3s ease',
    },
    topicTitle: {
      fontSize: '22px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: '0 0 12px 0',
    },
    topicDescription: {
      fontSize: '14px',
      color: 'var(--color-text-muted)',
      lineHeight: '1.6',
      margin: '0 0 20px 0',
    },
    topicMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid var(--color-white-a04)',
    },
    difficultyBadge: {
      padding: '6px 14px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    beginnerBadge: {
      background: 'var(--color-success-a12)',
      color: 'var(--color-success)',
      border: '1px solid var(--color-success-a20)',
    },
    intermediateBadge: {
      background: 'var(--color-warning-a12)',
      color: 'var(--color-warning)',
      border: '1px solid var(--color-warning-a20)',
    },
    advancedBadge: {
      background: 'var(--color-danger-a12)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-a20)',
    },
    allLevelsBadge: {
      background: 'var(--color-accent-a15)',
      color: 'var(--color-accent)',
      border: '1px solid var(--color-accent-a20)',
    },
    puzzleCount: {
      fontSize: '13px',
      color: 'var(--color-text-muted)',
      fontWeight: '500',
      background: 'var(--color-black-a35)',
      padding: '6px 12px',
      borderRadius: '8px',
      border: '1px solid var(--color-white-a04)',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-black-a65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(12px)',
    },
    modal: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: '24px',
      padding: '36px',
      maxWidth: '520px',
      width: '90%',
      boxShadow: '0 20px 60px var(--color-black-a65)',
      textAlign: 'center',
      backdropFilter: 'blur(20px)',
    },
    modalTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: 'var(--color-text)',
      margin: '0 0 8px 0',
    },
    modalSubtitle: {
      fontSize: '15px',
      color: 'var(--color-text-muted)',
      margin: '0 0 28px 0',
    },
    timeOptions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '28px',
    },
    timeOption: {
      padding: '18px 12px',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'var(--color-black-a35)',
    },
    timeOptionSelected: {
      border: '1px solid var(--color-accent-a40)',
      background: 'var(--color-accent-a15)',
      transform: 'scale(1.05)',
      boxShadow: '0 4px 16px var(--color-accent-a30)',
    },
    timeValue: {
      fontSize: '26px',
      fontWeight: '700',
      marginBottom: '4px',
    },
    timeValueSelected: {
      color: 'var(--color-accent)',
    },
    timeValueUnselected: {
      color: 'var(--color-text-muted)',
    },
    timeLabel: {
      fontSize: '12px',
      fontWeight: '500',
    },
    timeLabelSelected: {
      color: 'var(--color-accent)',
    },
    timeLabelUnselected: {
      color: 'var(--color-text-faint)',
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    },
    startButton: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      color: 'var(--color-text)',
      border: 'none',
      padding: '14px 32px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
    cancelButton: {
      background: 'var(--color-black-a35)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-white-a10)',
      padding: '14px 32px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
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
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return styles.beginnerBadge;
      case 'Intermediate':
        return styles.intermediateBadge;
      case 'Advanced':
        return styles.advancedBadge;
      case 'All Levels':
        return styles.allLevelsBadge;
      default:
        return styles.allLevelsBadge;
    }
  };

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    setShowTimeModal(true);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleStartRace = () => {
    // Navigate to timed race with selected topic and time
    navigate(`/timed-race?topic=${selectedTopic.id}&time=${selectedTime}`);
  };

  const handleCloseModal = () => {
    setShowTimeModal(false);
    setSelectedTopic(null);
    setSelectedTime(5);
  };

  const timeOptions = [
    { value: 1, label: '1 minute' },
    { value: 3, label: '3 minutes' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Choose Your Topic</h1>
          <p style={styles.subtitle}>Select a chess topic to focus your timed race practice</p>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>⏳</div>
            <h2 style={styles.loadingTitle}>Loading Topics</h2>
            <p style={styles.loadingText}>
              Fetching available puzzle topics...
            </p>
          </div>
        ) : topics.length === 0 ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>🔍</div>
            <h2 style={styles.loadingTitle}>No Topics Available</h2>
            <p style={styles.loadingText}>
              No puzzle topics found in the database.
            </p>
          </div>
        ) : (
          <div style={styles.topicsGrid}>
            {topics.map((topic) => (
              <motion.div
                key={topic.id}
                onClick={() => handleTopicClick(topic)}
                style={styles.topicCard}
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  boxShadow: '0 12px 40px var(--color-accent-a30)',
                  border: '1px solid var(--color-accent-a20)'
                }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  style={styles.topicIcon}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  {topic.icon}
                </motion.div>
                <h3 style={styles.topicTitle}>{topic.title}</h3>
                <p style={styles.topicDescription}>{topic.description}</p>

                <div style={styles.topicMeta}>
                  <span style={{...styles.difficultyBadge, ...getDifficultyStyle(topic.difficulty)}}>
                    {topic.difficulty}
                  </span>
                  <span style={styles.puzzleCount}>
                    {topic.puzzles} puzzles
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showTimeModal && selectedTopic && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <motion.div 
            style={styles.modal} 
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={styles.modalTitle}>
              {selectedTopic.icon} {selectedTopic.title}
            </h2>
            <p style={styles.modalSubtitle}>
              Choose how long you want to race for
            </p>

            <div style={styles.timeOptions}>
              {timeOptions.map((option) => {
                const isSelected = selectedTime === option.value;
                return (
                  <motion.div
                    key={option.value}
                    onClick={() => handleTimeSelect(option.value)}
                    style={{
                      ...styles.timeOption,
                      ...(isSelected ? styles.timeOptionSelected : {})
                    }}
                    whileHover={!isSelected ? { 
                      borderColor: 'var(--color-accent-a30)',
                      scale: 1.05 
                    } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{
                      ...styles.timeValue,
                      ...(isSelected ? styles.timeValueSelected : styles.timeValueUnselected)
                    }}>
                      {option.value}
                    </div>
                    <div style={{
                      ...styles.timeLabel,
                      ...(isSelected ? styles.timeLabelSelected : styles.timeLabelUnselected)
                    }}>
                      {option.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div style={styles.modalButtons}>
              <motion.button 
                style={styles.cancelButton} 
                onClick={handleCloseModal}
                whileHover={{ 
                  borderColor: 'var(--color-white-a20)',
                  y: -2 
                }}
                transition={{ duration: 0.2 }}
              >
                Cancel
              </motion.button>
              <motion.button 
                style={styles.startButton} 
                onClick={handleStartRace}
                whileHover={{ 
                  y: -2,
                  boxShadow: '0 6px 24px var(--color-accent-a40)'
                }}
                transition={{ duration: 0.2 }}
              >
                Start {selectedTime} Minute Race
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
