import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const styles = {
  container: {
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
    position: 'relative',
    zIndex: 1,
    maxWidth: '1400px',
    margin: '0 auto',
  },
  hero: {
    background: 'rgba(23, 23, 23, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    padding: '15px 20px',
    marginBottom: '20px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '1px',
  },
  trophyIcon: {
    fontSize: '55px',
    filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#9ca3af',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2.5fr',
    gap: '30px',
    marginBottom: '30px',
  },
  glassCard: {
    background: 'rgba(23, 23, 23, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 25px 0',
    textAlign: 'center',
  },
  scoreDisplay: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  scoreNumber: {
    fontSize: '72px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '5px',
    textShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
  },
  scoreLabel: {
    fontSize: '18px',
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
    marginBottom: '30px',
  },
  statItem: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px 15px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#10b981',
    marginBottom: '5px',
    textShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
  },
  statLabelSmall: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  accuracySection: {
    marginBottom: '30px',
  },
  accuracyLabel: {
    fontSize: '16px',
    color: '#9ca3af',
    marginBottom: '10px',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBar: {
    height: '16px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981, #06b6d4)',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
  },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px',
  },
  chartContainer: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '8px',
    overflow: 'hidden',
    minHeight: '210px',
    maxHeight: '210px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  timeChart: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '8px',
    overflow: 'hidden',
    minHeight: '210px',
    maxHeight: '210px',
  },
  noData: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '40px',
    fontSize: '16px',
  },
};

export default function RaceResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser, user } = useAuth();
  const results = state?.results;
  const [resultSaved, setResultSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fallback: try to load results from localStorage if missing
  let safeResults = results;
  if (!safeResults) {
    try {
      const stored = localStorage.getItem('racerResults');
      if (stored) safeResults = JSON.parse(stored);
    } catch {}
  }

  useEffect(() => {
    
    const isGuest = user?.role === 'guest';
    if (safeResults && !resultSaved && !isGuest) {
      const saveResult = async () => {
        try {
          const topic = searchParams.get('topic') || 'mixed';
          const timeLimit = parseInt(searchParams.get('time')) || 5;
          const { points, attempts, totalCorrect, totalWrong, maxStreak } = safeResults;
          const accuracy = attempts && attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : 0;
          const finishTime = attempts && attempts.length > 0 ? attempts.reduce((sum, a) => sum + (a.timeTakenSec || 0), 0) : 0;

          
          const response = await api.post(
            '/api/auth/save-timed-race',
            {
              topic,
              timeLimit,
              finalScore: points,
              puzzlesSolved: totalCorrect,
              totalAttempts: attempts.length,
              correctCount: totalCorrect,
              wrongCount: totalWrong,
              maxStreak,
              finishTime,
              accuracy,
              attempts
            }
          );
          setResultSaved(true);
          
          // Refresh user data to get updated highest scores
          await refreshUser();
        } catch (err) {
        }
      };
      saveResult();
    }
  }, [safeResults, resultSaved, searchParams]);

  if (!safeResults) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.hero}>
            <div style={styles.heroContent}>
              <div style={styles.trophyIcon}>🏁</div>
              <h1 style={styles.heroTitle}>No Results Found</h1>
              <p style={styles.heroSubtitle}>It looks like you haven't completed a race yet.</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/choose-topic" style={styles.primaryButton}>Start Your First Race</Link>
          </div>
        </div>
      </div>
    );
  }

  const { points, attempts, totalCorrect, totalWrong } = safeResults;
  const percentCorrect = attempts && attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : 0;

  // Chart options with dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };

  return (
    <div style={styles.container} className="rr-container">
      <div style={styles.background}></div>
      <style>{`
        @media (max-width: 768px) {
          .rr-container { padding: 10px 8px !important; }
          .rr-main-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .rr-glass-card { padding: 16px !important; }
          .rr-card-title { font-size: 18px !important; margin-bottom: 16px !important; }
          .rr-score-number { font-size: 46px !important; }
          .rr-trophy-icon { font-size: 36px !important; }
          .rr-hero-title { font-size: 22px !important; }
          .rr-stats-grid { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 8px !important; grid-template-columns: unset !important; }
          .rr-stat-item { flex: 1 1 calc(50% - 8px) !important; min-width: 0 !important; padding: 12px 8px !important; }
          .rr-chart-row { grid-template-columns: 1fr !important; gap: 10px !important; }
          .rr-chart-container { min-height: 150px !important; max-height: 150px !important; }
          .rr-time-chart { min-height: 150px !important; max-height: 150px !important; }
        }
      `}</style>
      
      <div style={styles.content}>
        {/* Guest notice */}
        {!localStorage.getItem('authToken') && (
          <div style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 14,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ color: '#fbbf24', fontSize: 14, fontWeight: 600 }}>
              👤 You're playing as a guest — results won't be saved.{' '}
              <span style={{ color: '#d1d5db', fontWeight: 400 }}>Create a free account to track your progress!</span>
            </div>
            <Link to="/signup-request" style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '8px 18px', fontWeight: 700, fontSize: 13,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Request Account</Link>
          </div>
        )}

        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.titleRow}>
              <div style={styles.trophyIcon} className="rr-trophy-icon">🏆</div>
              <h1 style={styles.heroTitle} className="rr-hero-title">Race Complete!</h1>
            </div>
            <p style={styles.heroSubtitle}>Great job finishing the timed race!</p>
          </div>
        </div>

        <div style={styles.mainGrid} className="rr-main-grid">
          {/* Personal Stats */}
          <div style={styles.glassCard} className="rr-glass-card">
            <h3 style={styles.cardTitle} className="rr-card-title">Your Performance</h3>
            <div style={styles.scoreDisplay}>
              <div style={styles.scoreNumber} className="rr-score-number">{points}</div>
              <div style={styles.scoreLabel}>Points</div>
            </div>

            <div style={styles.statsGrid} className="rr-stats-grid">
              <div style={styles.statItem} className="rr-stat-item">
                <div style={styles.statIcon}>✅</div>
                <div style={styles.statValue}>{totalCorrect}</div>
                <div style={styles.statLabelSmall}>Correct</div>
              </div>
              <div style={styles.statItem} className="rr-stat-item">
                <div style={styles.statIcon}>❌</div>
                <div style={styles.statValue}>{totalWrong}</div>
                <div style={styles.statLabelSmall}>Wrong</div>
              </div>
            </div>

            <div style={styles.accuracySection}>
              <div style={styles.accuracyLabel}>Accuracy: {percentCorrect}%</div>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${percentCorrect}%`}}></div>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <Link to="/choose-topic" style={styles.primaryButton}>Race Again</Link>
            </div>
          </div>

          {/* Charts Section */}
          <div style={styles.glassCard} className="rr-glass-card">
            <h3 style={styles.cardTitle} className="rr-card-title">Performance Analysis</h3>

            {attempts && attempts.length > 0 ? (
              <>
                <div style={styles.chartRow} className="rr-chart-row">
                  <div style={styles.chartContainer} className="rr-chart-container">
                    <h4 style={styles.chartTitle}>Attempt Results</h4>
                    <Line
                      data={{
                        labels: attempts.map((a, i) => `${i+1}`),
                        datasets: [{
                          label: 'Correct/Incorrect',
                          data: attempts.map(a => a.correct ? 1 : -1),
                          borderColor: '#10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.3,
                          fill: true,
                          pointRadius: 4,
                          pointBackgroundColor: '#10b981',
                          pointBorderColor: '#10b981',
                        }]
                      }}
                      options={{
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          y: { 
                            ...chartOptions.scales.y,
                            min: -1, 
                            max: 1, 
                            ticks: { 
                              ...chartOptions.scales.y.ticks,
                              stepSize: 1, 
                              callback: (value) => value === 1 ? 'Correct' : 'Wrong' 
                            } 
                          },
                          x: { 
                            ...chartOptions.scales.x,
                            title: { display: true, text: 'Puzzle #', color: '#9ca3af' } 
                          }
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>

                  <div style={styles.chartContainer} className="rr-chart-container">
                    <h4 style={styles.chartTitle}>Point Progression</h4>
                    <Line
                      data={{
                        labels: attempts.map((a, i) => `${i+1}`),
                        datasets: [{
                          label: 'Cumulative Points',
                          data: (function() {
                            let sum = 0;
                            return attempts.map(a => { sum += (a.correct ? 10 : 0); return sum; });
                          })(),
                          borderColor: '#06b6d4',
                          backgroundColor: 'rgba(6, 182, 212, 0.12)',
                          tension: 0.3,
                          fill: true,
                          pointRadius: 4,
                          pointBackgroundColor: '#06b6d4',
                          pointBorderColor: '#06b6d4',
                        }]
                      }}
                      options={{
                        ...chartOptions,
                        scales: { 
                          ...chartOptions.scales,
                          y: { 
                            ...chartOptions.scales.y,
                            beginAtZero: true, 
                            title: { display: true, text: 'Points', color: '#9ca3af' } 
                          } 
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>

                <div style={styles.timeChart} className="rr-time-chart">
                  <h4 style={styles.chartTitle}>Time per Puzzle</h4>
                  <Bar
                    data={{
                      labels: attempts.map((a, i) => `${i+1}`),
                      datasets: [{
                        label: 'Time (seconds)',
                        data: attempts.map(a => a.timeTakenSec || 0),
                        backgroundColor: attempts.map(a => a.correct ? 'rgba(16, 185, 129, 0.8)' : 'rgba(220, 53, 69, 0.8)'),
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      plugins: { legend: { display: false } },
                      scales: { 
                        ...chartOptions.scales,
                        y: { 
                          ...chartOptions.scales.y,
                          beginAtZero: true, 
                          title: { display: true, text: 'Seconds', color: '#9ca3af' } 
                        } 
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={styles.noData}>No attempts recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
