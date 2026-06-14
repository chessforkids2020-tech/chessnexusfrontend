import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TestTimeSelection = () => {
  const [selectedTime, setSelectedTime] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyType = searchParams.get('type') || 'positional';

  const studyTypeNames = {
    positional: 'Positional Studies',
    realtime: 'Real Time Game Studies',
    tournament: 'Tournament Studies'
  };

  const timeOptions = [
    { label: '1 min', value: 60 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '20 min', value: 1200 },
  ];

  const handleTimeSelect = (timeValue) => {
    setSelectedTime(timeValue);
    // Navigate to test mode with selected time
    navigate(`/study/test/start?time=${timeValue}&type=${studyType}`);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
    title: {
      fontSize: '36px',
      fontWeight: '800',
      color: '#1a5f1a',
      textAlign: 'center',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '40px',
    },
    timeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    },
    timeCard: {
      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
      border: '2px solid #e9ecef',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    timeCardSelected: {
      background: 'linear-gradient(135deg, #1a5f1a, #2e7d32)',
      color: '#fff',
      borderColor: '#1a5f1a',
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
    },
    timeLabel: {
      fontSize: '24px',
      fontWeight: '700',
      margin: '0',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}
          onClick={() => navigate('/study')}
        >
          ← Back
        </button>
        <h1 style={styles.title}>Choose Time Limit</h1>
        <p style={styles.subtitle}>Test your knowledge in {studyTypeNames[studyType]}</p>

        <div style={styles.timeGrid}>
          {timeOptions.map((option) => (
            <div
              key={option.value}
              style={{
                ...styles.timeCard,
                ...(selectedTime === option.value ? styles.timeCardSelected : {})
              }}
              onClick={() => handleTimeSelect(option.value)}
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