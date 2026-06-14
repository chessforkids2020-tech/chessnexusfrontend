import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const UserTestStudySelection = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const response = await api.get('/api/testpuzzle/studies');
        setStudies(response.data);
      } catch (err) {
        setError('Failed to load studies');
      } finally {
        setLoading(false);
      }
    };
    fetchStudies();
  }, []);

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '36px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '25px',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '20px',
      padding: '30px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    },
    cardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 20px 40px rgba(245, 158, 11, 0.2)',
      border: '1px solid rgba(245, 158, 11, 0.5)',
    },
    cardIcon: {
      fontSize: '48px',
      marginBottom: '15px',
    },
    cardTitle: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '10px',
    },
    cardDesc: {
      fontSize: '14px',
      color: '#9ca3af',
      lineHeight: '1.6',
    },
    cardArrow: {
      position: 'absolute',
      right: '20px',
      bottom: '20px',
      fontSize: '24px',
      color: '#f59e0b',
      opacity: 0,
      transition: 'all 0.3s ease',
    },
    backButton: {
      padding: '12px 24px',
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '30px',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      padding: '60px',
      fontSize: '18px',
    },
    empty: {
      textAlign: 'center',
      color: '#6b7280',
      padding: '60px',
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '20px',
    },
  };

  const [hoveredCard, setHoveredCard] = useState(null);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading studies...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate('/puzzles')}>
          ← Back to Puzzles
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>🧩 Test Your Skills</h1>
          <p style={styles.subtitle}>
            Choose a study to test your chess knowledge. Solve puzzles against Stockfish!
          </p>
        </div>

        {error && (
          <div style={{ ...styles.empty, color: '#ef4444', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {studies.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No studies available yet</p>
            <p>Check back later for new test materials!</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {studies.map((study, index) => (
              <div
                key={study._id}
                style={{
                  ...styles.card,
                  ...(hoveredCard === study._id ? styles.cardHover : {})
                }}
                onMouseEnter={() => setHoveredCard(study._id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(`/test/chapters/${study._id}`)}
              >
                <div style={styles.cardIcon}>
                  {['📚', '🎯', '♟️', '🏆', '⚡', '🧠'][index % 6]}
                </div>
                <div style={styles.cardTitle}>{study.title}</div>
                <div style={styles.cardDesc}>
                  {study.description || 'Test your skills with these challenging puzzles!'}
                </div>
                <div style={{
                  ...styles.cardArrow,
                  opacity: hoveredCard === study._id ? 1 : 0,
                  transform: hoveredCard === study._id ? 'translateX(0)' : 'translateX(-10px)'
                }}>
                  →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTestStudySelection;
