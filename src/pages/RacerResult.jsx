import React from 'react';
import { Link } from 'react-router-dom';

export default function RacerResult() {
  // Get results from URL params or state
  const urlParams = new URLSearchParams(window.location.search);
  const totalPoints = parseInt(urlParams.get('points')) || 0;
  const correctPuzzles = parseInt(urlParams.get('correct')) || 0;
  const wrongPuzzles = parseInt(urlParams.get('wrong')) || 0;
  const maxStreak = parseInt(urlParams.get('streak')) || 0;
  const topicId = urlParams.get('topic') || 'mixed';
  const timeParam = urlParams.get('time') || '5';
  // When this race was a coach Puzzle Rush assignment, tailor the buttons.
  const assignmentId = urlParams.get('assignment') || null;

  const getTopicName = (id) => {
    const topics = {
      tactics: 'Chess Tactics',
      endgame: 'Endgame Mastery',
      openings: 'Opening Principles',
      strategy: 'Strategic Play',
      defense: 'Defensive Skills',
      mixed: 'Mixed Puzzles'
    };
    return topics[id] || 'Mixed Puzzles';
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
      position: 'relative',
      zIndex: 1,
      maxWidth: '900px',
      margin: '0 auto',
      textAlign: 'center',
    },
    header: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: '40px',
      marginBottom: '30px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
    },
    title: {
      fontSize: '48px',
      fontWeight: '800',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '18px',
      margin: '0',
      color: 'var(--color-text-muted)',
      fontWeight: '400',
    },
    trophyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
      filter: 'drop-shadow(0 4px 12px var(--color-accent-a30))',
    },
    resultsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    resultCard: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(10px)',
      padding: '30px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      textAlign: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    resultValue: {
      fontSize: '48px',
      fontWeight: '700',
      marginBottom: '8px',
      color: 'var(--color-accent)',
      textShadow: '0 0 20px var(--color-accent-a40)',
    },
    resultLabel: {
      fontSize: '11px',
      color: 'var(--color-text-faint)',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      fontWeight: '600',
    },
    performanceMessage: {
      fontSize: '18px',
      color: 'var(--color-text)',
      marginBottom: '30px',
      padding: '20px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-xl)',
      backdropFilter: 'blur(10px)',
    },
    actionButtons: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    button: {
      padding: '14px 32px',
      border: 'none',
      borderRadius: 'var(--radius-lg)',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      display: 'inline-block',
      textAlign: 'center',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      color: 'var(--color-text)',
      boxShadow: '0 4px 16px var(--color-accent-a40)',
    },
    secondaryButton: {
      background: 'var(--color-black-a35)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-white-a10)',
    },
    backButton: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'var(--color-black-a35)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-white-a10)',
      padding: '10px 20px',
      borderRadius: 'var(--radius-lg)',
      fontSize: '14px',
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      fontWeight: '600',
      zIndex: 10,
    },
  };

  const getPerformanceMessage = () => {
    const totalPuzzles = correctPuzzles + wrongPuzzles;
    const accuracy = totalPuzzles > 0 ? (correctPuzzles / totalPuzzles) * 100 : 0;

    if (accuracy >= 90) return "🏆 Outstanding performance! You're a chess master!";
    if (accuracy >= 75) return "🎯 Great job! Excellent tactical skills!";
    if (accuracy >= 60) return "👍 Good effort! Keep practicing!";
    if (accuracy >= 40) return "💪 Not bad! Room for improvement!";
    return "🎓 Keep learning! Every puzzle makes you stronger!";
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      
      <div style={styles.content}>
        <Link to="/choose-topic" style={styles.backButton}>← Back to Choose Topic</Link>

        <div style={styles.header}>
          <div style={styles.trophyIcon}>🏆</div>
          <h1 style={styles.title}>Race Complete!</h1>
          <p style={styles.subtitle}>
            {getTopicName(topicId)} • {timeParam} Minute Race
          </p>
        </div>

        <div style={styles.resultsGrid}>
        <div style={styles.resultCard}>
          <div style={styles.resultValue}>{totalPoints}</div>
          <div style={styles.resultLabel}>Total Points</div>
        </div>

        <div style={styles.resultCard}>
          <div style={styles.resultValue}>{correctPuzzles}</div>
          <div style={styles.resultLabel}>Correct Puzzles</div>
        </div>

        <div style={styles.resultCard}>
          <div style={styles.resultValue}>{wrongPuzzles}</div>
          <div style={styles.resultLabel}>Wrong Puzzles</div>
        </div>

        <div style={styles.resultCard}>
          <div style={styles.resultValue}>{maxStreak}</div>
          <div style={styles.resultLabel}>Max Streak</div>
        </div>
      </div>

      <div style={styles.performanceMessage}>
        {getPerformanceMessage()}
      </div>

        <div style={styles.actionButtons}>
          {assignmentId ? (
            <>
              {/* Coach assignment: retake uses the coach's topic + time (no topic
                  picker), and a way back to the assignments page. */}
              <Link
                to={`/timed-race?topic=${topicId}&time=${timeParam}&assignment=${assignmentId}`}
                style={{...styles.button, ...styles.primaryButton}}
              >
                🚀 Race Again
              </Link>
              <Link
                to="/my-coach"
                style={{...styles.button, ...styles.secondaryButton}}
              >
                📋 Back to Assignments
              </Link>
            </>
          ) : (
            <>
              <Link
                to={`/timed-race?topic=${topicId}&time=${timeParam}`}
                style={{...styles.button, ...styles.primaryButton}}
              >
                🚀 Race Again
              </Link>
              <Link
                to="/choose-topic"
                style={{...styles.button, ...styles.secondaryButton}}
              >
                📚 Choose Different Topic
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}