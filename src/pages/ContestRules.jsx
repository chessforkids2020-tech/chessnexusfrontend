import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    background: '#0a0a0a',
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
    background: `
      radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 90% 60%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
    zIndex: 0,
  },
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: 'rgba(23, 23, 23, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '32px',
    marginTop: '20px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '1000px',
    margin: '20px auto',
    overflow: 'hidden',
  },
  header: {
    padding: '40px 0 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
    marginBottom: '32px',
    position: 'relative',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '150px',
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
    filter: 'blur(40px)',
    opacity: 0.3,
    zIndex: -1,
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textShadow: '0 4px 20px rgba(244, 63, 94, 0.2)',
  },
  subtitle: {
    marginTop: '12px',
    fontSize: '16px',
    color: '#9ca3af',
    fontWeight: '400',
    opacity: '0.9',
  },
  content: {
    padding: '0 8px',
  },
  section: {
    marginBottom: '36px',
    padding: '28px',
    background: 'rgba(30, 30, 30, 0.5)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'all 0.3s ease',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionContent: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: '#e2e8f0',
  },
  ruleList: {
    paddingLeft: '22px',
    margin: '16px 0',
  },
  ruleItem: {
    marginBottom: '12px',
    color: '#cbd5e1',
    position: 'relative',
  },
  highlightBox: {
    background: 'rgba(244, 63, 94, 0.08)',
    borderLeft: '4px solid #f43f5e',
    padding: '22px',
    borderRadius: '12px',
    marginTop: '24px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(244, 63, 94, 0.1)',
    transition: 'all 0.3s ease',
  },
  highlightTitle: {
    fontWeight: '700',
    color: '#fda4af',
    marginBottom: '10px',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  highlightText: {
    color: '#e2e8f0',
    fontSize: '15px',
    lineHeight: '1.6',
  },
  announcement: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '20px',
    lineHeight: '1.6',
    padding: '20px',
    background: 'rgba(6, 182, 212, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(6, 182, 212, 0.1)',
  },
  backButton: {
    display: 'inline-block',
    marginTop: '30px',
    padding: '14px 32px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)',
    color: '#ffffff',
    fontWeight: '700',
    textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(244, 63, 94, 0.3)',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  tableContainer: {
    overflowX: 'auto',
    margin: '24px 0',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    background: 'rgba(15, 15, 15, 0.6)',
    borderRadius: '12px',
    overflow: 'hidden',
    minWidth: '300px',
    backdropFilter: 'blur(8px)',
  },
  tableHeader: {
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  tableHeaderCell: {
    padding: '18px 24px',
    textAlign: 'left',
    fontSize: '16px',
    fontWeight: '700',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
  },
  tableRow: {
    background: 'rgba(30, 30, 30, 0.6)',
    transition: 'all 0.3s ease',
    cursor: 'default',
  },
  tableCell: {
    padding: '16px 24px',
    fontWeight: '600',
    fontSize: '15px',
    color: '#f8fafc',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  roundCell: {
    borderRight: '1px solid rgba(148, 163, 184, 0.1)',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    paddingTop: '32px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
  },
  footerText: {
    color: '#94a3b8',
    marginTop: '20px',
    fontSize: '14px',
  },
};

export default function ContestRules() {
  const roundsData = [
    { number: 1, color: 'rgba(254, 243, 199, 0.1)', bg: 'rgba(254, 243, 199, 0.1)', text: 'Participants scoring less than', points: '4 points', pointsColor: '#f87171' },
    { number: 2, color: 'rgba(209, 250, 229, 0.1)', bg: 'rgba(209, 250, 229, 0.1)', text: 'Participants scoring less than', points: '5 points', pointsColor: '#f87171' },
    { number: 3, color: 'rgba(254, 243, 199, 0.1)', bg: 'rgba(254, 243, 199, 0.1)', text: 'Participants scoring less than', points: '6 points', pointsColor: '#f87171' },
    { number: 4, color: 'rgba(207, 250, 254, 0.1)', bg: 'rgba(207, 250, 254, 0.1)', text: 'Top', points: '6 participants', pointsColor: '#4ade80' },
    { number: 5, color: 'rgba(254, 243, 199, 0.2)', bg: 'rgba(254, 243, 199, 0.2)', text: 'Top', points: '3 participants', pointsColor: '#fbbf24' },
  ];

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.background}></div>
      
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerBackground}></div>
          <h1 style={styles.title}>🏆 Global Chess Puzzle Contest 2025</h1>
          <p style={styles.subtitle}>Official rules and guidelines for the worldwide competition</p>
        </div>

        <div style={styles.content}>
          {/* Announcement */}
          <div style={styles.section}>
            <div style={styles.sectionContent}>
              <p style={styles.announcement}>
                We are excited to announce that the Global Chess Puzzle Contest 2025 is officially open for registrations!
                This contest is designed for kids from around the world — any country, any chess level can participate.
              </p>
            </div>
          </div>

          {/* Contest Overview */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>🎯</span>
              Contest Overview
            </h2>
            <div style={styles.sectionContent}>
              <p>
                The contest will be held LIVE on Zoom and all puzzles will be solved on the Official Chess for Kids Puzzle Competition Page.
                There are a total of 5 thrilling rounds, with eliminations after each stage until the final Top 3 winners are crowned.
              </p>

              <div style={styles.highlightBox}>
                <h3 style={styles.highlightTitle}>📅 Contest Starts: 1st December (Monday)</h3>
                <p style={styles.highlightText}>
                  ⏳ Before the contest begins, each participant will receive:<br/>
                  ✔ Date & Time slot<br/>
                  ✔ Unique Username<br/>
                  ✔ Password for login
                </p>
              </div>
            </div>
          </div>

          {/* Eligibility */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>🧩</span>
              Eligibility Requirements
            </h2>
            <div style={styles.sectionContent}>
              <div style={styles.highlightBox}>
                <h3 style={styles.highlightTitle}>Who Can Participate?</h3>
                <p style={styles.highlightText}>
                  ✔ Open to all kids worldwide<br/>
                  ✔ No minimum or maximum chess skill level — beginners to advanced are welcome
                </p>
              </div>

              <h4 style={{color: '#cbd5e1', margin: '20px 0 8px 0'}}>🎂 Age Requirements:</h4>
              <p>Children between 5 and 16 years old can participate.</p>
            </div>
          </div>

          {/* Technical Requirements */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>💻</span>
              Technical Requirements
            </h2>
            <div style={styles.sectionContent}>
              <p>To compete, each participant must have:</p>
              <ul style={styles.ruleList}>
                <li style={styles.ruleItem}>A laptop / computer (phones/tablets not allowed)</li>
                <li style={styles.ruleItem}>Webcam turned ON at all times</li>
                <li style={styles.ruleItem}>Zoom application installed</li>
                <li style={styles.ruleItem}>Stable internet connection</li>
                <li style={styles.ruleItem}>Ability to share the entire screen on Zoom (not just the browser window)</li>
              </ul>
            </div>
          </div>

          {/* How to Play */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>🎮</span>
              How to Play
            </h2>
            <div style={styles.sectionContent}>
              <ul style={styles.ruleList}>
                <li style={styles.ruleItem}>Join the assigned Zoom meeting during your scheduled time</li>
                <li style={styles.ruleItem}>Log in to the Official Contest Page using the username & password provided</li>
                <li style={styles.ruleItem}>Puzzle timer will start automatically</li>
                <li style={styles.ruleItem}>Solve puzzles as fast and accurately as possible to score points</li>
              </ul>
            </div>
          </div>

          {/* Scoring & Eliminations */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>🧮</span>
              Scoring & Eliminations
            </h2>
            <div style={styles.sectionContent}>
              <p>The contest has 5 rounds:</p>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.tableHeaderCell}>
                        🏁 Round
                      </th>
                      <th style={styles.tableHeaderCell}>
                        📊 Qualification Rule
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundsData.map((round, index) => (
                      <tr
                        key={round.number}
                        style={{
                          ...styles.tableRow,
                          background: index % 2 === 0 ? 'rgba(30, 30, 30, 0.6)' : 'rgba(20, 20, 20, 0.6)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = index % 2 === 0 ? 'rgba(30, 30, 30, 0.6)' : 'rgba(20, 20, 20, 0.6)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <td style={{
                          ...styles.tableCell,
                          ...styles.roundCell,
                          background: round.bg,
                          borderRadius: '12px 0 0 12px',
                        }}>
                          Round {round.number}
                        </td>
                        <td style={styles.tableCell}>
                          {round.text} <strong style={{color: round.pointsColor}}>{round.points}</strong> {round.number === 4 || round.number === 5 ? 'advance' : 'are eliminated'} {round.number === 5 && '🏆'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rules & Fair Play */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>⚖️</span>
              Rules & Fair Play
            </h2>
            <div style={styles.sectionContent}>
              <p>To ensure fair competition:</p>
              <ul style={styles.ruleList}>
                <li style={styles.ruleItem}>Participants must share their entire screen on Zoom</li>
                <li style={styles.ruleItem}>Camera must remain ON throughout the contest and must clearly show the participant</li>
                <li style={styles.ruleItem}>No external help from parents, friends, books, devices, or notes</li>
                <li style={styles.ruleItem}>No talking during the rounds</li>
                <li style={styles.ruleItem}>If the internet disconnects, the round timer continues</li>
                <li style={styles.ruleItem}>Puzzles must be solved only on the official contest page</li>
                <li style={styles.ruleItem}>Cheating or breaking rules will lead to immediate disqualification</li>
              </ul>
            </div>
          </div>

          {/* Rescheduling */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span>🔁</span>
              Rescheduling
            </h2>
            <div style={styles.sectionContent}>
              <p>
                If a participant is unable to attend the scheduled time, parents must inform us in advance.
                Rescheduling depends strictly on slot availability.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <Link
              to="/"
              style={styles.backButton}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05) translateY(-2px)';
                e.target.style.boxShadow = '0 12px 28px rgba(244, 63, 94, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1) translateY(0)';
                e.target.style.boxShadow = '0 8px 24px rgba(244, 63, 94, 0.3)';
              }}
            >
              🏠 Back to Home
            </Link>
            <p style={styles.footerText}>
              These rules are subject to change. Last updated: November 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}