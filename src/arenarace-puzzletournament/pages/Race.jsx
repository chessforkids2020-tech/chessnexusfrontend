import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Chessboard from '../components/Chessboard';
import Confetti from 'react-confetti';
import { Chess } from 'chess.js';

export default function Race() {
  const puzzles = [
    {
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
      moves: ['Qh5', 'Nf6', 'Qxf7#'],
      scoreIncrement: 10
    }
  ];

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState(puzzles[0].fen);
  const [timer, setTimer] = useState(30);
  const [score, setScore] = useState(10);
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentPuzzle = puzzles[puzzleIndex];
  const moves = currentPuzzle.moves;

  useEffect(() => {
    if (timer > 0 && step < 4) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, step]);

  useEffect(() => {
    const sequence = async () => {
      if (timer === 28 && step === 0) {
        const chess = new Chess(currentFen);
        const move = chess.move(moves[0]);
        setCurrentFen(chess.fen());
        setTimeout(() => {
          setScore(prev => prev + 10);
          setStep(1);
        }, 1000);
      }
      if (timer === 25 && step === 1) {
        const chess = new Chess(currentFen);
        chess.move(moves[1]);
        setCurrentFen(chess.fen());
        setTimeout(() => {
          setStep(2);
        }, 1000);
      }
      if (timer === 22 && step === 2) {
        const chess = new Chess(currentFen);
        const move = chess.move(moves[2]);
        setCurrentFen(chess.fen());
        setTimeout(() => {
          setScore(20);
          setStep(3);
        }, 1000);
      }
      if (step === 3) {
        setTimeout(() => {
          setShowConfetti(true);
          setStep(4);
          setTimeout(() => {
            setShowConfetti(false);
          }, 9000);
        }, 1000);
      }
    };
    sequence();
  }, [timer, step, currentFen, moves, currentPuzzle, puzzleIndex]);

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <style>
        {`
          @media (max-width: 768px) {
            .content-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
            .board-section {
              order: 1;
            }
            .menu-section {
              order: 2;
            }
          }
        `}
      </style>

      <div style={styles.contentGrid} className="content-grid">
        <div style={styles.glassCard} className="board-section">
          <div style={styles.controlPanel}>
            <div style={styles.statBox}>
              <div style={styles.timerIcon}>⏱</div>
              <div style={styles.statContent}>
                <div style={styles.statLabel}>TIME</div>
                <motion.div 
                  style={{
                    ...styles.statNumber,
                    color: timer <= 10 ? '#ef4444' : '#06b6d4',
                    textShadow: timer <= 10 ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(6, 182, 212, 0.4)'
                  }}
                  key={timer}
                  animate={{ 
                    scale: timer <= 10 ? [1, 1.05, 1] : 1,
                    opacity: timer <= 10 ? [1, 0.7, 1] : 1
                  }}
                  transition={{ duration: 0.5, repeat: timer <= 10 ? Infinity : 0 }}
                >
                  {timer}
                </motion.div>
              </div>
            </div>

            <div style={styles.separator}></div>

            <div style={styles.statBox}>
              <div style={styles.scoreIcon}>🏆</div>
              <div style={styles.statContent}>
                <div style={styles.statLabel}>SCORE</div>
                <motion.div 
                  style={styles.scoreValue}
                  key={score}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  {score}
                </motion.div>
              </div>
            </div>
          </div>

          <div style={styles.boardWrapper}>
            <Chessboard
              position={currentFen}
              draggable={false}
              boardWidth={420}
              transitionDuration={1000}
              showCoordinates={false}
              boardStyle={{ 
                border: 'none', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
              }}
            />
            {showConfetti && <Confetti width={450} height={450} />}
          </div>
        </div>

        <div style={styles.menuSection} className="menu-section">
          <div style={styles.glassCard}>
            <h2 style={styles.menuTitle}>Select Race Mode</h2>
          </div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/choose-topic" style={styles.modeCard}>
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode1}}>⚡</div>
                <h3 style={styles.modeTitle}>Individual Race</h3>
              </div>
              <p style={styles.modeDesc}>Timed puzzles with topic selection</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/arena" style={styles.modeCard}>
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode2}}>👑</div>
                <h3 style={styles.modeTitle}>Arena Race</h3>
              </div>
              <p style={styles.modeDesc}>Join competitive arena matches</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>

          <motion.div whileHover={{ x: 8 }} transition={{ duration: 0.3 }}>
            <Link to="/team-race" style={styles.modeCard}>
              <div style={styles.modeCardBefore}></div>
              <div style={styles.modeHeader}>
                <div style={{...styles.modeIcon, ...styles.mode3}}>👥</div>
                <h3 style={styles.modeTitle}>Team Race</h3>
              </div>
              <p style={styles.modeDesc}>Compete with your team</p>
              <div style={styles.modeArrow}>→</div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#0a0a0a',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  glassCard: {
    background: 'rgba(23, 23, 23, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    padding: '12px 28px 28px 28px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  controlPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '2px 10px',
    borderRadius: '16px',
    marginBottom: '3px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  timerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(14, 165, 233, 0.2))',
  },
  scoreIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
  },
  scoreValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fbbf24',
    textShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
  },
  separator: {
    width: '1px',
    height: '60px',
    background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)',
  },
  boardWrapper: {
    position: 'relative',
    width: '100%',
  },
  menuSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  menuTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  modeCard: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '22px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
    textDecoration: 'none',
  },
  modeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '10px',
  },
  modeIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    flexShrink: 0,
  },
  mode1: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.15))',
  },
  mode2: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.15))',
  },
  mode3: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.15))',
  },
  modeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  modeDesc: {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  modeArrow: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    color: '#4b5563',
    transition: 'all 0.3s ease',
  },
};