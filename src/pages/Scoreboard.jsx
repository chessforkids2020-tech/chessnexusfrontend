// src/pages/Scoreboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Scoreboard() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleRoundClick = (roundNumber) => {
    navigate(`/scoreboard/round/${roundNumber}`);
  };

  const rounds = [1, 2, 3, 4, 5];

  const styles = {
    pageWrapper: {
      minHeight: '100vh',
      background: 'var(--color-bg)',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
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
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      padding: '28px',
      marginTop: '20px',
      position: 'relative',
      zIndex: 1,
      maxWidth: '1200px',
      margin: '20px auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginBottom: '20px',
    },
    backButton: {
      padding: '10px 20px',
      background: 'var(--color-black-a35)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    title: {
      marginTop: 0,
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '12px',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      color: 'var(--color-text-muted)',
      marginBottom: '32px',
      fontSize: '15px',
      lineHeight: '1.6',
    },
    roundsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    roundCard: {
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: '16px',
      padding: '32px 24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 16px var(--color-black-a35)',
      position: 'relative',
      overflow: 'hidden',
    },
    roundNumber: {
      margin: '0 0 12px 0',
      fontSize: '48px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textShadow: '0 0 20px var(--color-accent-a30)',
    },
    roundLabel: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: 'var(--color-text-muted)',
      marginBottom: '8px',
    },
    roundAction: {
      margin: 0,
      color: 'var(--color-accent)',
      fontSize: '14px',
      fontWeight: '500',
    },
    infoBox: {
      marginTop: '28px',
      padding: '20px',
      backgroundColor: 'var(--color-accent-a06)',
      borderRadius: '12px',
      border: '1px solid var(--color-accent-a12)',
    },
    infoTitle: {
      margin: '0 0 12px 0',
      color: 'var(--color-accent)',
      fontSize: '16px',
      fontWeight: '600',
    },
    infoList: {
      margin: '8px 0',
      paddingLeft: '20px',
      color: 'var(--color-text-muted)',
      fontSize: '14px',
      lineHeight: '1.8',
    },
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.background}></div>
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-white-a20)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-white-a10)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      <h3 style={styles.title}>Scoreboard</h3>
      <p style={styles.subtitle}>
        {isAdmin
          ? "Select a round to manage player points for that round."
          : "Select a round to view the scoreboard for that round."
        }
      </p>

      <div style={styles.roundsGrid}>
        {rounds.map(roundNum => (
          <div
            key={roundNum}
            onClick={() => handleRoundClick(roundNum)}
            style={styles.roundCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px var(--color-accent-a30)';
              e.currentTarget.style.border = '1px solid var(--color-accent-a20)';
              e.currentTarget.style.background = 'var(--color-accent-a08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px var(--color-black-a35)';
              e.currentTarget.style.border = '1px solid var(--color-white-a04)';
              e.currentTarget.style.background = 'var(--color-black-a35)';
            }}
          >
            <div style={styles.roundLabel}>Round</div>
            <h2 style={styles.roundNumber}>{roundNum}</h2>
            <p style={styles.roundAction}>
              {isAdmin ? 'Manage Points' : 'View Scores'}
            </p>
          </div>
        ))}
      </div>

      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>How it works</h4>
        <ul style={styles.infoList}>
          {isAdmin ? (
            <>
              <li>Click on any round card to manage points for that round</li>
              <li>You can set manual points for each player in that round</li>
              <li>Points are specific to each round and don't carry over</li>
              <li>Players will see their points for each round separately</li>
            </>
          ) : (
            <>
              <li>Click on any round card to view the scoreboard for that round</li>
              <li>See your ranking, points, and other players' scores</li>
              <li>Each round has its own separate scoreboard</li>
              <li>Points are awarded by administrators for each round</li>
            </>
          )}
        </ul>
      </div>
    </div>
    </div>
  );
}