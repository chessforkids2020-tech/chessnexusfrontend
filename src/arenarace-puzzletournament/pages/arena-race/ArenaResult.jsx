import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

// Updated Obsidian Glass styles matching ArenaRace
const styles = {
  page: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#0a0a0a',
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
    background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    background: 'rgba(23, 23, 23, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '42px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(156, 163, 175, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },
  roomId: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  ongoingWarning: {
    color: '#ef4444',
    marginTop: '15px',
    fontSize: '14px',
    fontWeight: '600',
  },
  trophyContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '45px',
    margin: '40px 0',
    position: 'relative',
    zIndex: 950,
  },
  trophy: {
    borderRadius: '50%',
    background: 'rgba(23, 23, 23, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  trophy2: {
    width: '170px',
    height: '170px',
  },
  trophy1: {
    width: '200px',
    height: '200px',
    boxShadow: '0 0 20px gold, 0 0 45px rgba(255,215,0,.6), 0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 953,
    position: 'relative',
  },
  trophy3: {
    width: '170px',
    height: '170px',
  },
  crown: {
    width: '60px',
    position: 'absolute',
    top: '-55px',
    left: '50%',
    transform: 'translateX(-50%) rotate(-8deg)',
    zIndex: 952,
  },
  tableContainer: {
    background: 'rgba(23, 23, 23, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    marginBottom: '30px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px 12px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '12px',
    color: '#e2e8f0',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderBottom: '2px solid rgba(6, 182, 212, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  td: {
    padding: '18px 12px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1',
    fontSize: '15px',
  },
  userHighlight: {
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(6, 182, 212, 0.2)',
  },
  rank: {
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '18px',
  },
  medal: {
    marginLeft: '8px',
    fontSize: '20px',
  },
  username: {
    fontWeight: '600',
    color: '#f1f5f9',
  },
  score: {
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '18px',
  },
  performance: {
    fontWeight: '500',
    color: '#9ca3af',
  },
  buttonContainer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  backButton: {
    background: 'rgba(23, 23, 23, 0.8)',
    backdropFilter: 'blur(10px)',
    color: '#06b6d4',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    padding: '16px 40px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(6, 182, 212, 0.2)',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  backButtonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(6, 182, 212, 0.3)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    background: 'rgba(6, 182, 212, 0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 40px',
    color: '#ffffff',
    background: 'rgba(23, 23, 23, 0.7)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '18px',
    color: 'rgba(156, 163, 175, 0.9)',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    padding: '30px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '16px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    backdropFilter: 'blur(10px)',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
  },
  ribbonRain: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'url(/trophies/ribbons.gif)',
    backgroundSize: 'cover',
    backgroundRepeat: 'repeat',
    zIndex: 900,
    pointerEvents: 'none',
  },
  confettiCanvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 9999,
    transition: 'opacity 0.5s ease',
  },
};

export default function ArenaResult() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [results, setResults] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [raceOngoing, setRaceOngoing] = useState(false);
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const [buttonHover, setButtonHover] = useState(false);
  const canvasRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [roomId]);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/api/arena/result/${roomId}`);
      setResults(response.data.results);
      setUserResult(response.data.userResult);
      setRaceOngoing(response.data.raceOngoing || false);
      setTotalPuzzles(response.data.totalPuzzles || 0);
      
      await refreshUser();
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasReady(true);
    }
  }, []);

  useEffect(() => {
    const checkCanvas = () => {
      if (canvasRef.current && !canvasReady) {
        setCanvasReady(true);
      }
    };

    checkCanvas();
    const timeout = setTimeout(checkCanvas, 100);

    return () => clearTimeout(timeout);
  }, [canvasReady]);

  useEffect(() => {
    if (!showConfetti || !canvasReady || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const confettiCount = 150;
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFFF00', '#FFB6C1', '#87CEEB'];

    class ConfettiPiece {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        if (this.y > canvas.height) {
          this.y = -10;
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
      }
    }

    for (let i = 0; i < confettiCount; i++) {
      confettiPieces.push(new ConfettiPiece());
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiPieces.forEach(piece => {
        piece.update();
        piece.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const timeout = setTimeout(() => {
      setShowConfetti(false);
      cancelAnimationFrame(animationId);
    }, 20000);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [showConfetti, canvasReady]);

  const getMedal = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getPerformanceText = (rank, correctCount, totalPuzzles) => {
    if (rank === 1) return 'perfect';
    if (rank === 2) return 'great';
    if (rank === 3) return 'amazing';
    
    if (!totalPuzzles || totalPuzzles === 0) return 'keep learning';
    const percentage = (correctCount / totalPuzzles) * 100;
    if (percentage >= 80) return 'great';
    if (percentage >= 60) return 'amazing';
    if (percentage >= 40) return 'good';
    return 'keep learning';
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <canvas ref={canvasRef} style={{...styles.confettiCanvas, opacity: showConfetti ? 1 : 0}} />
        <div style={styles.content}>
          <div style={{...styles.loading, marginTop: '100px'}}>
            <div style={styles.loadingIcon}>🏆</div>
            <div style={styles.loadingText}>Loading results...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={{...styles.error, marginTop: '100px'}}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      
      <canvas ref={canvasRef} style={{...styles.confettiCanvas, opacity: showConfetti ? 1 : 0}} />
      
      <div style={styles.ribbonRain} />

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏆 Race Results</h1>
          <p style={styles.subtitle}>Room: <span style={styles.roomId}>{roomId}</span></p>
          {raceOngoing && (
            <p style={styles.ongoingWarning}>
              Race is still ongoing. Your results are preliminary.
            </p>
          )}
        </div>

        {!raceOngoing && results && results.length >= 2 && (
          <div style={styles.trophyContainer}>
            {results[1] && (
              <div style={{...styles.trophy, ...styles.trophy2}}>
                <img src="/trophies/silver-trophy.png" alt="2nd" style={{ width: '75px' }} />
                <span style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6, color: '#fff' }}>Rank 2</span>
                <p style={{ fontSize: 14, marginTop: 3, color: '#cbd5e1' }}>{results[1].displayName}</p>
              </div>
            )}

            {results[0] && (
              <div style={{ position: 'relative' }}>
                <img src="/trophies/crown.png" alt="crown" style={styles.crown} />
                <div style={{...styles.trophy, ...styles.trophy1}}>
                  <img src="/trophies/gold-trophy.png" alt="1st" style={{ width: '100px' }} />
                  <span style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6, color: '#fff' }}>Rank 1</span>
                  <p style={{ fontSize: 15, marginTop: 3, color: '#cbd5e1' }}>{results[0].displayName}</p>
                </div>
              </div>
            )}

            {results[2] && (
              <div style={{...styles.trophy, ...styles.trophy3}}>
                <img src="/trophies/bronze-trophy.png" alt="3rd" style={{ width: '75px' }} />
                <span style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6, color: '#fff' }}>Rank 3</span>
                <p style={{ fontSize: 14, marginTop: 3, color: '#cbd5e1' }}>{results[2].displayName}</p>
              </div>
            )}
          </div>
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {raceOngoing ? (
                userResult && (
                  <tr style={styles.userHighlight}>
                    <td style={styles.td}>
                      <span style={styles.rank}>N/A</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.username}>{userResult.displayName}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.score}>{userResult.finalScore}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.performance}>{getPerformanceText(userResult.rank, userResult.correctCount || 0, totalPuzzles)}</span>
                    </td>
                  </tr>
                )
              ) : (
                results.map((result) => (
                  <tr key={result.username} style={userResult && result.username === userResult.username ? styles.userHighlight : {}}>
                    <td style={styles.td}>
                      <span style={styles.rank}>{result.rank}</span>
                      <span style={styles.medal}>{getMedal(result.rank)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.username}>{result.displayName}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.score}>{result.finalScore}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.performance}>{getPerformanceText(result.rank, result.correctCount || 0, totalPuzzles)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.buttonContainer}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{
              ...styles.backButton,
              ...(buttonHover ? styles.backButtonHover : {})
            }}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}