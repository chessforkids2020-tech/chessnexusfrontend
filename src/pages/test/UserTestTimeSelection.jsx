import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const UserTestTimeSelection = () => {
  const { studyId, chapterId } = useParams();
  const navigate = useNavigate();
  const [selectedTime, setSelectedTime] = useState(null);

  const timeOptions = [
    { value: 60, label: '1 Minute', icon: '⚡', description: 'Lightning fast!' },
    { value: 120, label: '2 Minutes', icon: '🔥', description: 'Quick challenge' },
    { value: 180, label: '3 Minutes', icon: '⏱️', description: 'Standard pace' },
    { value: 300, label: '5 Minutes', icon: '🎯', description: 'Balanced time' },
    { value: 600, label: '10 Minutes', icon: '🧠', description: 'Think deeply' },
    { value: 900, label: '15 Minutes', icon: '📚', description: 'Study mode' },
    { value: 1200, label: '20 Minutes', icon: '♟️', description: 'Extended session' },
    { value: 1800, label: '30 Minutes', icon: '🏆', description: 'Marathon mode' },
  ];

  const handleStart = () => {
    if (selectedTime) {
      navigate(`/test/play/${studyId}/${chapterId}?time=${selectedTime}`);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-bg) 0%, #1a1a2e 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '700px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: 'var(--color-text)',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '15px',
      color: 'var(--color-text-muted)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px',
      marginBottom: '30px',
    },
    card: {
      background: 'var(--color-surface)',
      borderRadius: '16px',
      padding: '25px',
      border: '2px solid var(--color-white-a10)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center',
    },
    cardSelected: {
      border: '2px solid var(--color-warning)',
      background: 'var(--color-warning-a12)',
      transform: 'scale(1.02)',
    },
    cardIcon: {
      fontSize: '36px',
      marginBottom: '10px',
    },
    cardLabel: {
      fontSize: '20px',
      fontWeight: '600',
      color: 'var(--color-text)',
      marginBottom: '5px',
    },
    cardDesc: {
      fontSize: '13px',
      color: 'var(--color-text-muted)',
    },
    startButton: {
      width: '100%',
      padding: '18px',
      borderRadius: '14px',
      border: 'none',
      background: selectedTime 
        ? 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-danger) 100%)' 
        : 'rgba(38, 38, 38, 0.8)',
      color: 'var(--color-text)',
      fontSize: '18px',
      fontWeight: '600',
      cursor: selectedTime ? 'pointer' : 'not-allowed',
      transition: 'all 0.3s ease',
      opacity: selectedTime ? 1 : 0.5,
    },
    backButton: {
      padding: '12px 24px',
      background: 'rgba(38, 38, 38, 0.8)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a20)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '30px',
    },
    info: {
      background: 'var(--color-warning-a12)',
      border: '1px solid var(--color-warning-a30)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '25px',
      color: 'var(--color-warning)',
      fontSize: '14px',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button 
          style={styles.backButton} 
          onClick={() => navigate(`/test/chapters/${studyId}`)}
        >
          ← Back to Chapters
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>⏱️ Select Time Limit</h1>
          <p style={styles.subtitle}>
            How much time do you want for this test?
          </p>
        </div>

        <div style={styles.info}>
          <strong>Scoring:</strong> 2 points for each puzzle you solve completely!<br/>
          Stockfish will play against you until you complete the admin's solution.
        </div>

        <div style={styles.grid}>
          {timeOptions.map((option) => (
            <div
              key={option.value}
              style={{
                ...styles.card,
                ...(selectedTime === option.value ? styles.cardSelected : {})
              }}
              onClick={() => setSelectedTime(option.value)}
            >
              <div style={styles.cardIcon}>{option.icon}</div>
              <div style={styles.cardLabel}>{option.label}</div>
              <div style={styles.cardDesc}>{option.description}</div>
            </div>
          ))}
        </div>

        <button 
          style={styles.startButton}
          onClick={handleStart}
          disabled={!selectedTime}
        >
          {selectedTime ? '🚀 Start Test' : 'Select a time to continue'}
        </button>
      </div>
    </div>
  );
};

export default UserTestTimeSelection;
