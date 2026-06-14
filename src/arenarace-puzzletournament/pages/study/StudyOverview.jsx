import React from 'react';
import { Link } from 'react-router-dom';

const StudyOverview = () => {
  const studyTypes = [
    {
      type: 'positional',
      title: 'Positional Studies',
      description: 'Master strategic patterns — piece activity, weak squares, pawn structures, outposts, and exchanges.',
      icon: '♟️',
      color: '#1a5f1a'
    },
    {
      type: 'realtime',
      title: 'Real Time Game Studies',
      description: 'Analyze real games from grandmasters and learn practical decision-making under pressure.',
      icon: '⚡',
      color: '#dc3545'
    },
    {
      type: 'tournament',
      title: 'Tournament Studies',
      description: 'Study critical moments from championship games and tournament battles.',
      icon: '🏆',
      color: '#ffc107'
    }
  ];

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
    mainTitle: {
      fontSize: '42px',
      fontWeight: '800',
      color: '#1a5f1a',
      textAlign: 'center',
      marginBottom: '15px',
    },
    mainDescription: {
      fontSize: '18px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '50px',
    },
    studySection: {
      marginBottom: '50px',
      padding: '30px',
      background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
      borderRadius: '16px',
      border: '2px solid #e9ecef',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '20px',
    },
    sectionIcon: {
      fontSize: '40px',
    },
    sectionTitle: {
      fontSize: '28px',
      fontWeight: '700',
      margin: 0,
    },
    sectionDescription: {
      fontSize: '16px',
      color: '#666',
      lineHeight: '1.6',
      marginBottom: '25px',
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
    },
    card: {
      background: '#fff',
      borderRadius: '12px',
      padding: '25px',
      textAlign: 'center',
      boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
      border: '2px solid #e9ecef',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      color: 'inherit',
    },
    cardIcon: {
      fontSize: '36px',
      marginBottom: '12px',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      margin: '0 0 10px 0',
    },
    cardDescription: {
      fontSize: '14px',
      color: '#6c757d',
      margin: '0',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Chess Studies</h1>
        <p style={styles.mainDescription}>
          Master chess through structured learning and testing across different study categories
        </p>

        {studyTypes.map((studyType) => (
          <div key={studyType.type} style={styles.studySection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>{studyType.icon}</span>
              <h2 style={{ ...styles.sectionTitle, color: studyType.color }}>
                {studyType.title}
              </h2>
            </div>
            <p style={styles.sectionDescription}>{studyType.description}</p>

            <div style={styles.cardsGrid}>
              <Link
                to={`/study/learn?type=${studyType.type}`}
                style={styles.card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
                }}
              >
                <div style={styles.cardIcon}>📘</div>
                <h3 style={{ ...styles.cardTitle, color: studyType.color }}>
                  Click to Study
                </h3>
                <p style={styles.cardDescription}>Learn & explore positions</p>
              </Link>

              <Link
                to={`/study/test?type=${studyType.type}`}
                style={styles.card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
                }}
              >
                <div style={styles.cardIcon}>🧠</div>
                <h3 style={{ ...styles.cardTitle, color: studyType.color }}>
                  Click to Test
                </h3>
                <p style={styles.cardDescription}>Solve puzzles based on studies</p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyOverview;