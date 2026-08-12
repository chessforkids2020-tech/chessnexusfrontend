import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TestTimeSelection = () => {
  const [selectedTime, setSelectedTime] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const chapterId = searchParams.get('chapterId');

  const timeOptions = [
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '20 min', value: 1200 },
    { label: '30 min', value: 1800 },
    { label: '40 min', value: 2400 },
  ];

  const handleTimeSelect = (timeValue) => {
    setSelectedTime(timeValue);
    // Navigate to test mode with selected time
    navigate(`/study/test/start?time=${timeValue}&studyId=${studyId}&chapterId=${chapterId}`);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      color: 'var(--color-text)',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: '16px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
      marginBottom: '30px',
      fontStyle: 'italic',
    },
    timeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
    },
    timeCard: {
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      color: 'var(--color-text)',
    },
    timeCardSelected: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      color: 'var(--color-text)',
      borderColor: 'var(--color-accent-a30)',
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 40px var(--color-accent-a30)',
    },
    timeLabel: {
      fontSize: '20px',
      fontWeight: '600',
      margin: '0',
    },
    backButton: {
      padding: '10px 20px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '25px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          style={styles.backButton}
          onClick={() => navigate('/study')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px var(--color-accent-a30)';
            e.currentTarget.style.borderColor = 'var(--color-accent-a20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--color-black-a35)';
            e.currentTarget.style.borderColor = 'var(--color-white-a10)';
          }}
        >
          ← Back
        </button>
        <h1 style={styles.title}>Choose Time Limit</h1>
        <p style={styles.subtitle}>Select how long you want to test yourself</p>

        <div style={styles.timeGrid}>
          {timeOptions.map((option) => (
            <div
              key={option.value}
              style={{
                ...styles.timeCard,
                ...(selectedTime === option.value ? styles.timeCardSelected : {})
              }}
              onClick={() => handleTimeSelect(option.value)}
              onMouseEnter={(e) => {
                if (selectedTime !== option.value) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px var(--color-accent-a20)';
                  e.currentTarget.style.borderColor = 'var(--color-accent-a20)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTime !== option.value) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px var(--color-black-a50)';
                  e.currentTarget.style.borderColor = 'var(--color-white-a04)';
                }
              }}
            >
              <h3 style={styles.timeLabel}>{option.label}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestTimeSelection;