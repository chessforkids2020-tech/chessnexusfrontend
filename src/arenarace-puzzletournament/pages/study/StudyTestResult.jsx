import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const StudyTestResult = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const response = await api.get(`/api/study/result/${resultId}`);
      setResult(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load test results');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGrade = (percentage) => {
    // New thresholds:
    // >= 80 => A+
    // 65 - 79 => A
    // 50 - 64 => B
    // 35 - 49 => C
    // 20 - 34 => D
    // < 20 => F
    if (percentage >= 80) return { grade: 'A+', color: '#28a745' };
    if (percentage >= 65) return { grade: 'A', color: '#28a745' };
    if (percentage >= 50) return { grade: 'B', color: '#17a2b8' };
    if (percentage >= 35) return { grade: 'C', color: '#ffc107' };
    if (percentage >= 20) return { grade: 'D', color: '#fd7e14' };
    return { grade: 'F', color: '#dc3545' };
  };

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
    header: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '36px',
      fontWeight: '800',
      color: '#1a5f1a',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
    },
    gradeSection: {
      textAlign: 'center',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '40px',
      marginBottom: '30px',
    },
    gradeCircle: {
      width: '150px',
      height: '150px',
      borderRadius: '50%',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '60px',
      fontWeight: '800',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    },
    percentageText: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#333',
      marginBottom: '10px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a5f1a',
    },
    detailsSection: {
      marginTop: '30px',
    },
    sectionTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#1a5f1a',
      marginBottom: '20px',
    },
    attemptsList: {
      maxHeight: '400px',
      overflowY: 'auto',
    },
    attemptCard: {
      background: '#f8f9fa',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px',
      borderLeft: '4px solid',
    },
    attemptHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '10px',
      fontWeight: '600',
    },
    attemptMoves: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#666',
      marginTop: '8px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
      marginTop: '40px',
    },
    button: {
      padding: '12px 30px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    primaryButton: {
      background: '#1a5f1a',
      color: '#fff',
    },
    secondaryButton: {
      background: '#6c757d',
      color: '#fff',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666',
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

  if (error || !result) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>{error || 'No results found'}</div>
        </div>
      </div>
    );
  }

  const accuracy = Math.round((result.puzzlesCorrect / result.puzzlesAttempted) * 100);
  const gradeInfo = getGrade(accuracy);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Test Results</h1>
          <p style={styles.subtitle}>
            {result.studyId ? `Study: ${result.studyId.title}` : 'All Studies'}
          </p>
        </div>

        <div style={styles.gradeSection}>
          <div style={{ ...styles.gradeCircle, background: gradeInfo.color }}>
            {gradeInfo.grade}
          </div>
          <div style={styles.percentageText}>{accuracy}% Accuracy</div>
          <p style={{ color: '#666', margin: 0 }}>
            You solved {result.puzzlesCorrect} out of {result.puzzlesAttempted} puzzles
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Score</div>
            <div style={styles.statValue}>{result.score}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Puzzles Correct</div>
            <div style={styles.statValue}>{result.puzzlesCorrect}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Time</div>
            <div style={styles.statValue}>{formatTime(result.totalTime)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Avg Time/Puzzle</div>
            <div style={styles.statValue}>
              {formatTime(Math.floor(result.totalTime / result.puzzlesAttempted))}
            </div>
          </div>
        </div>

        <div style={styles.detailsSection}>
          <h2 style={styles.sectionTitle}>Puzzle Details</h2>
          <div style={styles.attemptsList}>
            {(result.attempts || []).map((attempt, index) => (
              <div
                key={index}
                style={{
                  ...styles.attemptCard,
                  borderLeftColor: attempt.result === 'correct' ? '#28a745' : '#dc3545',
                }}
              >
                <div style={styles.attemptHeader}>
                  <span>Puzzle {index + 1}</span>
                  <span style={{
                    color: attempt.result === 'correct' ? '#28a745' : '#dc3545',
                  }}>
                    {attempt.result === 'correct' ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Time: {formatTime(attempt.timeSpent)}
                  {attempt.attempts && ` • Attempts: ${attempt.attempts}`}
                </div>
                <div style={styles.attemptMoves}>
                  <div><strong>Your moves:</strong> {attempt.userMoves}</div>
                  <div><strong>Solution:</strong> {attempt.correctMoves}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate('/study')}
          >
            Back to Studies
          </button>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => navigate('/')}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyTestResult;
