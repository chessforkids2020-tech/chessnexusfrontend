import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import PlayerName from '../../components/PlayerName';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

// Updated Obsidian Glass styles matching ArenaRace
const styles = {
  page: {
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
    maxWidth: '1000px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    border: '1px solid var(--color-white-a04)',
    boxShadow: '0 8px 32px var(--color-black-a50)',
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
    color: 'var(--color-accent)',
    fontWeight: '700',
  },
  ongoingWarning: {
    color: 'var(--color-danger)',
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
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    border: '2px solid var(--color-white-a10)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 8px 32px var(--color-black-a50)',
  },
  trophy2: {
    width: '170px',
    height: '170px',
  },
  trophy1: {
    width: '200px',
    height: '200px',
    boxShadow: '0 0 20px gold, 0 0 45px rgba(255,215,0,.6), 0 8px 32px var(--color-black-a50)',
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
    background: 'var(--color-surface)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid var(--color-white-a04)',
    boxShadow: '0 8px 32px var(--color-black-a50)',
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
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-accent-a15)',
    borderBottom: '2px solid var(--color-accent-a30)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  td: {
    padding: '18px 12px',
    textAlign: 'center',
    borderBottom: '1px solid var(--color-white-a04)',
    color: 'var(--color-text-muted)',
    fontSize: '15px',
  },
  userHighlight: {
    background: 'var(--color-accent-a12)',
    borderRadius: '8px',
    border: '1px solid var(--color-accent-a20)',
  },
  rank: {
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
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
    color: 'var(--color-text)',
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
    color: 'var(--color-text-muted)',
  },
  buttonContainer: {
    textAlign: 'center',
    marginTop: '40px',
  },
  backButton: {
    background: 'rgba(23, 23, 23, 0.8)',
    backdropFilter: 'blur(10px)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent-a30)',
    padding: '16px 40px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 24px var(--color-accent-a20)',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  backButtonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px var(--color-accent-a30)',
    borderColor: 'var(--color-accent-a40)',
    background: 'var(--color-accent-a12)',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 40px',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    borderRadius: '20px',
    border: '1px solid var(--color-white-a04)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px var(--color-black-a50)',
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
    color: 'var(--color-danger)',
    textAlign: 'center',
    padding: '30px',
    background: 'var(--color-danger-a12)',
    borderRadius: '16px',
    border: '1px solid var(--color-danger-a30)',
    backdropFilter: 'blur(10px)',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 8px 32px var(--color-danger-a20)',
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

const adminStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, var(--color-accent-2) 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'var(--color-surface)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 40px var(--color-black-a20)',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--color-surface)',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, var(--color-accent-2), #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
    zIndex: 10,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  th: {
    textAlign: 'left',
    padding: '15px',
    borderBottom: '2px solid #eee',
    color: 'var(--color-text-faint)',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  td: {
    padding: '15px',
    borderBottom: '1px solid #eee',
    color: 'var(--color-surface)',
  },
  rank: {
    fontWeight: '800',
    color: 'var(--color-accent-2)',
    fontSize: '18px',
  },
  score: {
    fontWeight: '700',
    color: 'var(--color-accent-2)',
  },
  correct: {
    color: 'var(--color-success)',
    fontWeight: '600',
  },
  wrong: {
    color: 'var(--color-danger)',
    fontWeight: '600',
  }
};

export default function ArenaResult({ isAdminView = false }) {
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

  // Navigation helper for admin vs user
  const getBackPath = () => isAdminView ? '/admin/arena' : '/arena';

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
    const colors = ['var(--color-warning)', '#FFA500', '#FF6347', '#FFFF00', '#FFB6C1', '#87CEEB'];

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

  if (isAdminView) {
    return (
      <div style={adminStyles.page}>
        <button onClick={() => navigate('/admin/arena')} style={adminStyles.backButton}>
          ← Back to Arena Admin
        </button>
        
        <div style={adminStyles.container}>
          <div style={adminStyles.header}>
            <div style={adminStyles.title}>🏆 Final Race Results</div>
            <div style={{ fontSize: '20px', color: 'var(--color-accent-2)', fontWeight: '700' }}>Room: {roomId}</div>
            {raceOngoing && (
              <div style={{ color: 'var(--color-danger)', fontWeight: '700', marginTop: '10px' }}>
                ⚠️ RACE STILL IN PROGRESS (Live View)
              </div>
            )}
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden' }}>
            <table style={adminStyles.table}>
              <thead>
                <tr>
                  <th style={adminStyles.th}>Rank</th>
                  <th style={adminStyles.th}>Player</th>
                  <th style={adminStyles.th}>Score</th>
                  <th style={adminStyles.th}>Correct</th>
                  <th style={adminStyles.th}>Wrong</th>
                  <th style={adminStyles.th}>Total Done</th>
                  <th style={adminStyles.th}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {results && results.length > 0 ? (
                  results.map((result, index) => {
                    const total = (result.correctCount || 0) + (result.wrongCount || 0);
                    const accuracy = total > 0 ? ((result.correctCount || 0) / total * 100).toFixed(1) : 0;
                    return (
                      <tr key={result.username}>
                        <td style={adminStyles.td}>
                          <span style={adminStyles.rank}>#{result.rank || index + 1}</span>
                          {getMedal(result.rank || index + 1)}
                        </td>
                        <td style={adminStyles.td}>
                          <div style={{ fontWeight: '600' }}><PlayerName displayName={result.displayName} username={result.username} /></div>
                          <div style={{ fontSize: '11px', color: '#999' }}>@{result.username}</div>
                        </td>
                        <td style={{ ...adminStyles.td, ...adminStyles.score }}>{result.finalScore || result.score}</td>
                        <td style={{ ...adminStyles.td, ...adminStyles.correct }}>{result.correctCount || 0}</td>
                        <td style={{ ...adminStyles.td, ...adminStyles.wrong }}>{result.wrongCount || 0}</td>
                        <td style={adminStyles.td}>{total}</td>
                        <td style={adminStyles.td}>{accuracy}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ ...adminStyles.td, textAlign: 'center', padding: '40px', color: '#999' }}>
                      No results found for this race.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              onClick={fetchResults}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, var(--color-accent-2), #764ba2)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Results
            </button>
          </div>
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

        {!raceOngoing && results && results.length >= 1 && (
          <div style={styles.trophyContainer}>
            {results[1] && (
              <div style={{...styles.trophy, ...styles.trophy2}}>
                <img src="/trophies/silver-trophy.png" alt="2nd" style={{ width: '75px' }} />
                <span style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6, color: 'var(--color-text)' }}>Rank 2</span>
                <p style={{ fontSize: 14, marginTop: 3, color: 'var(--color-text-muted)' }}><PlayerName displayName={results[1].displayName} username={results[1].username} /></p>
              </div>
            )}

            {results[0] && (
              <div style={{ position: 'relative' }}>
                <img src="/trophies/crown.png" alt="crown" style={styles.crown} />
                <div style={{...styles.trophy, ...styles.trophy1}}>
                  <img src="/trophies/gold-trophy.png" alt="1st" style={{ width: '100px' }} />
                  <span style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6, color: 'var(--color-text)' }}>Rank 1</span>
                  <p style={{ fontSize: 15, marginTop: 3, color: 'var(--color-text-muted)' }}><PlayerName displayName={results[0].displayName} username={results[0].username} /></p>
                </div>
              </div>
            )}

            {results[2] && (
              <div style={{...styles.trophy, ...styles.trophy3}}>
                <img src="/trophies/bronze-trophy.png" alt="3rd" style={{ width: '75px' }} />
                <span style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6, color: 'var(--color-text)' }}>Rank 3</span>
                <p style={{ fontSize: 14, marginTop: 3, color: 'var(--color-text-muted)' }}><PlayerName displayName={results[2].displayName} username={results[2].username} /></p>
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
                      <span style={styles.username}><PlayerName displayName={userResult.displayName} username={userResult.username} /></span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.score}>{userResult.finalScore || userResult.score}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.performance}>{getPerformanceText(userResult.rank, userResult.correctCount || 0, totalPuzzles)}</span>
                    </td>
                  </tr>
                )
              ) : (
                results && results.map((result) => (
                  <tr key={result.username} style={userResult && result.username === userResult.username ? styles.userHighlight : {}}>
                    <td style={styles.td}>
                      <span style={styles.rank}>{result.rank}</span>
                      <span style={styles.medal}>{getMedal(result.rank)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.username}><PlayerName displayName={result.displayName} username={result.username} /></span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.score}>{result.finalScore || result.score}</span>
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
            onClick={() => navigate(isAdminView ? '/admin/arena' : '/dashboard')} 
            style={{
              ...styles.backButton,
              ...(buttonHover ? styles.backButtonHover : {})
            }}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
          >
            {isAdminView ? '← Back to Arena Admin' : '← Back to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}