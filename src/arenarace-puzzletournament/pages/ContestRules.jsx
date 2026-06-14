import React from 'react';
import { Link } from 'react-router-dom';


const styles = {
  page: {
    minHeight: "100vh",
    background: "#fdeceb", // soft rose, calm
    padding: "40px 20px",
    fontFamily: "'Poppins', sans-serif",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },

  header: {
    padding: "36px 30px 24px",
    borderBottom: "1px solid #f3c6cc",
    textAlign: "center",
  },

  title: {
    fontSize: "34px",
    fontWeight: "800",
    margin: 0,
    color: "#c44569", // sunset rose
  },

  subtitle: {
    marginTop: "10px",
    fontSize: "16px",
    color: "#6b4a4a",
  },

  content: {
    padding: "32px 30px",
  },

  section: {
    marginBottom: "36px",
  },

  sectionTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#e17055", // soft sunset orange
    marginBottom: "14px",
  },

  sectionContent: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "#3b2f2f",
  },

  ruleList: {
    paddingLeft: "22px",
  },

  ruleItem: {
    marginBottom: "10px",
  },

  highlightBox: {
    background: "#fff4f1",
    borderLeft: "5px solid #f36f85",
    padding: "18px 20px",
    borderRadius: "10px",
    marginTop: "20px",
  },

  highlightTitle: {
    fontWeight: "700",
    color: "#c44569",
    marginBottom: "6px",
  },

  highlightText: {
    color: "#3b2f2f",
    fontSize: "15px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },

  backButton: {
    display: "inline-block",
    marginTop: "30px",
    padding: "12px 26px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #ff9f43, #f36f85)",
    color: "#fff",
    fontWeight: "700",
    textDecoration: "none",
    boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
    transition: "all 0.25s ease",
  },
};

export default function ContestRules() {
  return (
    <div style={styles.page}>
      {/* Banner */}
      <div style={styles.banner}>
      </div>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏆 Global Chess Puzzle Contest 2025</h1>
          <p style={styles.subtitle}>Official rules and guidelines for the worldwide competition</p>
        </div>

        <div style={styles.content}>
          {/* Announcement */}
          <div style={styles.section}>
            <div style={styles.sectionContent}>
              <p style={{fontSize: '18px', fontWeight: '600', color: '#2d3748', marginBottom: '20px'}}>
                We are excited to announce that the Global Chess Puzzle Contest 2025 is officially open for registrations!
                This contest is designed for kids from around the world — any country, any chess level can participate.
              </p>
            </div>
          </div>

          {/* Contest Overview */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.icon}>🎯</span>
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
              <span style={styles.icon}>🧩</span>
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

              <h4>🎂 Age Requirements:</h4>
              <p>Children between 5 and 16 years old can participate.</p>
            </div>
          </div>

          {/* Technical Requirements */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.icon}>💻</span>
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
              <span style={styles.icon}>🎮</span>
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
              <span style={styles.icon}>🧮</span>
              Scoring & Eliminations
            </h2>
            <div style={styles.sectionContent}>
              <p>The contest has 5 rounds:</p>

              <div style={{overflowX: 'auto', margin: '20px 0'}}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  minWidth: '300px'
                }}>
                  <thead>
                    <tr style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      <th style={{
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontSize: '18px',
                        fontWeight: '700',
                        borderBottom: '3px solid rgba(255,255,255,0.3)',
                        letterSpacing: '0.5px'
                      }}>
                        🏁 Round
                      </th>
                      <th style={{
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontSize: '18px',
                        fontWeight: '700',
                        borderBottom: '3px solid rgba(255,255,255,0.3)',
                        letterSpacing: '0.5px'
                      }}>
                        📊 Qualification Rule
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.closest('tr').style.transform = 'translateY(0)'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%)',
                        borderRadius: '8px 0 0 8px'
                      }}>
                        Round 1
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#4a5568',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}>
                        Participants scoring less than <strong style={{color: '#e53e3e'}}>4 points</strong> are eliminated
                      </td>
                    </tr>
                    <tr style={{
                      background: 'white',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.closest('tr').style.transform = 'translateY(0)'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        borderRadius: '8px 0 0 8px'
                      }}>
                        Round 2
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#4a5568',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}>
                        Participants scoring less than <strong style={{color: '#e53e3e'}}>5 points</strong> are eliminated
                      </td>
                    </tr>
                    <tr style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.closest('tr').style.transform = 'translateY(0)'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '8px 0 0 8px'
                      }}>
                        Round 3
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#4a5568',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}>
                        Participants scoring less than <strong style={{color: '#e53e3e'}}>6 points</strong> are eliminated
                      </td>
                    </tr>
                    <tr style={{
                      background: 'white',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.closest('tr').style.transform = 'translateY(0)'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                        borderRadius: '8px 0 0 8px'
                      }}>
                        Round 4
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#4a5568',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}>
                        Top <strong style={{color: '#38a169'}}>6 participants</strong> advance to Round 5
                      </td>
                    </tr>
                    <tr style={{
                      background: 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 50%, #fdba74 100%)',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.closest('tr').style.transform = 'translateY(0)'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2d3748',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '8px 0 0 8px'
                      }}>
                        Round 5
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#4a5568',
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}>
                        Top <strong style={{color: '#d69e2e'}}>3 participants</strong> become the final winners 🏆
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rules & Fair Play */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.icon}>⚖️</span>
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
              <span style={styles.icon}>🔁</span>
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
          <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e2e8f0' }}>
            <Link
              to="/"
              style={styles.backButton}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🏠 Back to Home
            </Link>
            <p style={{ color: '#718096', marginTop: '20px', fontSize: '14px' }}>
              These rules are subject to change. Last updated: November 2025
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            50% { transform: translate(-50%, -50%) rotate(180deg); }
          }
        `}
      </style>
    </div>
  );
}