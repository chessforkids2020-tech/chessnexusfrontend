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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1000px',
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
      marginBottom: '30px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    statCard: {
      background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      color: '#1a5f1a',
      margin: '0',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
      marginTop: '5px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '30px',
    },
    th: {
      background: '#1a5f1a',
      color: '#fff',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef',
    },
    retryButton: {
      display: 'inline-block',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #1a5f1a, #2e7d32)',
      color: '#fff',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    loading: {
      textAlign: 'center',
      color: '#666',
      fontSize: '18px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: '#dc2626',
      fontSize: '18px',
      padding: '40px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>{error}</div>
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
              <tr key={index}>
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