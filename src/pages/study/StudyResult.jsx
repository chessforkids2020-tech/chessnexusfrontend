import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';

const StudyResult = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.get(`/api/study/result/${resultId}`);
        setResult(response.data);
      } catch (err) {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
    },
    container: {
      maxWidth: '1000px',
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
      margin: '0 0 25px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textAlign: 'center',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      color: 'var(--color-text)',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: 'var(--color-accent)',
      margin: '0',
      textShadow: '0 2px 10px var(--color-accent-a30)',
    },
    statLabel: {
      fontSize: '14px',
      color: 'var(--color-text-muted)',
      marginTop: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '25px',
      borderRadius: '12px',
      overflow: 'hidden',
    },
    th: {
      background: 'var(--color-accent-a15)',
      color: 'var(--color-accent)',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
      borderBottom: '1px solid var(--color-white-a10)',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid var(--color-white-a04)',
      fontSize: '14px',
      color: 'var(--color-text)',
    },
    tr: {
      background: 'rgba(23, 23, 23, 0.5)',
    },
    trEven: {
      background: 'rgba(23, 23, 23, 0.3)',
    },
    retryButton: {
      display: 'inline-block',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      color: 'var(--color-text)',
      textDecoration: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
      border: 'none',
      cursor: 'pointer',
    },
    loading: {
      textAlign: 'center',
      color: 'var(--color-text-muted)',
      fontSize: '16px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: 'var(--color-danger)',
      fontSize: '16px',
      padding: '40px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading results...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Test Results</h1>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{result.puzzlesAttempted}</div>
            <div style={styles.statLabel}>Total Puzzles</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{result.puzzlesCorrect}</div>
            <div style={styles.statLabel}>Correct</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{result.score}%</div>
            <div style={styles.statLabel}>Total Points</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{Math.floor(result.totalTime / 60)}:{(result.totalTime % 60).toString().padStart(2, '0')}</div>
            <div style={styles.statLabel}>Avg Time</div>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Puzzle</th>
              <th style={styles.th}>Your Moves</th>
              <th style={styles.th}>Correct Moves</th>
              <th style={styles.th}>Result</th>
              <th style={styles.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {result.attempts.map((attempt, index) => (
              <tr key={index} style={index % 2 === 0 ? styles.trEven : styles.tr}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{attempt.userMoves}</td>
                <td style={styles.td}>{attempt.correctMoves}</td>
                <td style={styles.td}>
                  {attempt.result === 'correct' ? '✅' : attempt.result === 'incorrect' ? '❌' : '⏰'}
                </td>
                <td style={styles.td}>{attempt.timeSpent}s</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'center' }}>
          <Link to="/study/learn" style={styles.retryButton}>
            Click to Study
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudyResult;