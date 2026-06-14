import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function ArenaTournament() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [recentFinished, setRecentFinished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadTournaments();
    api.get('/api/arenatournament/recent-finished')
      .then(res => setRecentFinished(res.data.tournaments || []))
      .catch(() => {});
    api.get('/api/auth/me').then(res => setUser(res.data.user)).catch(() => {});
    return () => {
    };
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await api.get('/api/arenatournament/list');
      setTournaments(response.data.tournaments);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tournaments');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#06b6d4'; // Cyan
      case 'lobby':
        return '#f59e0b'; // Amber
      case 'active':
        return '#10b981'; // Emerald
      case 'finished':
        return '#8b5cf6'; // Violet
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Section */}
        <div style={{
          background: 'rgba(23, 23, 23, 0.7)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          marginBottom: '30px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'slideInUp 0.6s ease-out'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            marginBottom: '10px',
            color: 'white'
          }}>
            🏟️ Arena Tournament
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#9ca3af',
            marginBottom: '30px',
            fontStyle: 'italic'
          }}>
            Compete in exciting arena tournaments! Join live battles and climb the rankings.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => {
                navigate('/arenatournament/create');
              }}
              style={{
                padding: '20px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-4px) scale(1.02)';
                e.target.style.background = 'rgba(6, 182, 212, 0.25)';
                e.target.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.background = 'rgba(6, 182, 212, 0.15)';
                e.target.style.boxShadow = 'none';
              }}
            >
              ➕ Create Tournament
            </button>

            <button
              onClick={() => {
                navigate('/arenatournament/join');
              }}
              style={{
                padding: '20px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-4px) scale(1.02)';
                e.target.style.background = 'rgba(16, 185, 129, 0.25)';
                e.target.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.background = 'rgba(16, 185, 129, 0.15)';
                e.target.style.boxShadow = 'none';
              }}
            >
              🔗 Join Tournament
            </button>
          </div>
        </div>

        {/* ─── Arena Status ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>

          {/* Crown Status */}
          {(() => {
            const crownMap = {
              gold:     { emoji: '👑', label: 'Gold Crown',     sub: 'Opponents earn +4 pts for beating you', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)' },
              platinum: { emoji: '👑', label: 'Platinum Crown', sub: 'Opponents earn +4 pts for beating you', color: '#e2e8f0', bg: 'rgba(226,232,240,0.07)', border: 'rgba(226,232,240,0.2)' },
              gem:      { emoji: '💎', label: 'Gem Crown',      sub: 'Opponents earn +4 pts for beating you', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
            };
            const c = user?.arenaCrownTier && crownMap[user.arenaCrownTier];
            return c ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: '36px', filter: `drop-shadow(0 0 10px ${c.color})`, flexShrink: 0 }}>{c.emoji}</span>
                <div>
                  <div style={{ color: c.color, fontWeight: '800', fontSize: '16px' }}>{c.label}</div>
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>{c.sub}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(23,23,23,0.7)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: '36px', opacity: 0.3, flexShrink: 0 }}>👑</span>
                <div>
                  <div style={{ color: '#6b7280', fontWeight: '800', fontSize: '16px' }}>No Crown Yet</div>
                  <div style={{ color: '#4b5563', fontSize: '12px', marginTop: '4px' }}>Win a tournament to earn one</div>
                </div>
              </div>
            );
          })()}

          {/* Carry Bonus Status */}
          {(() => {
            const pts = user?.arenaCarryPoints || 0;
            const expiry = user?.arenaCarryPointsExpiry ? new Date(user.arenaCarryPointsExpiry) : null;
            const expired = expiry && expiry < new Date();
            const progress = user?.arenaCarryQualifyingCount || 0;
            if (pts > 0 && !expired) {
              const daysLeft = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <span style={{ fontSize: '36px', filter: 'drop-shadow(0 0 10px #8b5cf6)', flexShrink: 0 }}>🎁</span>
                  <div>
                    <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '16px' }}>+{pts} Carry Bonus Ready</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                      {daysLeft !== null ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Use in next tournament'}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(23,23,23,0.7)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: '36px', opacity: 0.3, flexShrink: 0 }}>🎁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#6b7280', fontWeight: '800', fontSize: '16px' }}>No Carry Bonus</div>
                    {progress > 0 && (
                      <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '700' }}>{progress}/3</span>
                    )}
                  </div>
                  <div style={{ color: '#4b5563', fontSize: '12px', marginTop: '4px' }}>
                    {progress > 0
                      ? `${3 - progress} more qualifying tournament${3 - progress !== 1 ? 's' : ''} needed (play \u22653 games each)`
                      : 'Play \u22653 games in 3 separate tournaments to earn +2 pts'}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Tournaments List Section */}
        <div style={{
          background: 'rgba(23, 23, 23, 0.7)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Available Tournaments
          </h2>

          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 30px',
              background: 'rgba(23, 23, 23, 0.7)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '56px', marginBottom: '20px', color: '#06b6d4' }}>⏳</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading tournaments...</div>
              <div style={{ fontSize: '15px', marginTop: '12px', color: '#9ca3af' }}>Fetching the latest arena battles</div>
            </div>
          ) : error ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>⚠️ Error</div>
              {error}
            </div>
          ) : tournaments.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 30px',
              background: 'rgba(23, 23, 23, 0.7)',
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              color: '#9ca3af',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏟️</div>
              <div style={{ fontSize: '18px', marginBottom: '12px', color: '#ffffff' }}>
                No active tournaments at the moment
              </div>
              <div style={{ fontSize: '14px' }}>
                Create a new tournament to get started!
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {tournaments.map((tournament, index) => (
                <div
                  key={tournament._id}
                  style={{
                    padding: '24px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                  onClick={() => {
                    console.log({
                      id: tournament._id,
                      name: tournament.name,
                      status: tournament.status
                    });
                    if (tournament.status === 'scheduled' || tournament.status === 'lobby' || (tournament.status === 'active' && !tournament.actualStartTime)) {
                      navigate(`/arenatournament/lobby/${tournament._id}`);
                    } else if (tournament.status === 'active') {
                      navigate(`/arenatournament/live/${tournament._id}`);
                    } else if (tournament.status === 'finished') {
                      navigate(`/arenatournament/leaderboard/${tournament._id}`);
                    } else if (tournament.endTime && new Date(tournament.endTime) < new Date()) {
                      navigate(`/arenatournament/leaderboard/${tournament._id}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#06b6d4';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '20px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#ffffff',
                        marginBottom: '8px'
                      }}>
                        {tournament.name}
                      </h3>
                      {/* Tournament type badge */}
                      {tournament.tournamentType === 'team_battle' && (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', marginBottom: '6px' }}>⚔️ Team Battle</span>
                      )}
                      {tournament.tournamentType === 'chess960' && (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '6px' }}>🎲 Chess960</span>
                      )}
                      {tournament.tournamentType === 'bullet_blitz_marathon' && (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '6px' }}>⚡ Marathon</span>
                      )}
                      <div style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        marginBottom: '8px'
                      }}>
                        Hosted by <strong style={{ color: '#67e8f9' }}>{tournament.creatorDisplayName || tournament.creatorUsername}</strong>
                      </div>
                    </div>

                    <div style={{
                      padding: '8px 16px',
                      background: getStatusColor(tournament.status),
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      boxShadow: `0 4px 16px ${getStatusColor(tournament.status)}40`
                    }}>
                      {tournament.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '20px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                        Time Control
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#06b6d4' }}>
                        {tournament.tournamentType === 'bullet_blitz_marathon'
                          ? <span style={{ color: '#f59e0b' }}>⚡ 2+1 → 3+2</span>
                          : `${tournament.timeControl.minutes}:${tournament.timeControl.seconds.toString().padStart(2, '0')}`}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                        Duration
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                        {tournament.tournamentDuration.hours > 0 && `${tournament.tournamentDuration.hours}h `}
                        {tournament.tournamentDuration.minutes}min
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                        Participants
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#8b5cf6' }}>
                        {tournament.participantCount}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                        Starts
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                        {formatDate(tournament.scheduledStartTime)}
                      </div>
                    </div>
                  </div>

                  {tournament.description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#9ca3af',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      fontStyle: 'italic'
                    }}>
                      "{tournament.description}"
                    </div>
                  )}

                  <div style={{
                    marginTop: '20px',
                    fontSize: '14px',
                    color: '#67e8f9',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    Click to {tournament.status === 'active' ? 'join live' : 'view details'}
                    <span style={{ fontSize: '18px' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Finished Tournaments */}
        {recentFinished.length > 0 && (
          <div style={{
            background: 'rgba(23, 23, 23, 0.7)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            marginTop: '30px'
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🏁 Recent Tournaments
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', marginTop: 0 }}>
              Tournaments that ended in the last 48 hours
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {recentFinished.map((tournament, index) => (
                <div
                  key={tournament._id}
                  onClick={() => navigate(`/arenatournament/leaderboard/${tournament._id}`)}
                  style={{
                    padding: '20px 24px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '14px',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    animation: `slideInUp 0.6s ease-out ${index * 0.08}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Finished badge */}
                  <div style={{
                    padding: '6px 14px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#a78bfa',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    flexShrink: 0
                  }}>
                    ✅ Finished
                  </div>

                  {/* Name + creator */}
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff', marginBottom: '3px' }}>
                      {tournament.name}
                    </div>
                    {tournament.tournamentType === 'team_battle' && (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', marginBottom: '3px' }}>⚔️ Team Battle</span>
                    )}
                    {tournament.tournamentType === 'chess960' && (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '3px' }}>🎲 Chess960</span>
                    )}
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      by <span style={{ color: '#67e8f9' }}>{tournament.creatorDisplayName || tournament.creatorUsername}</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Players</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#8b5cf6' }}>{tournament.participantCount}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Time</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#06b6d4' }}>
                        {tournament.tournamentType === 'bullet_blitz_marathon'
                          ? '2+1→3+2'
                          : `${tournament.timeControl?.minutes}:${String(tournament.timeControl?.seconds || 0).padStart(2, '0')}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Duration</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                        {(tournament.tournamentDuration?.hours || 0) > 0 && `${tournament.tournamentDuration.hours}h `}
                        {tournament.tournamentDuration?.minutes || 0}min
                      </div>
                    </div>
                    {tournament.endTime && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Ended</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                          {formatDate(tournament.endTime)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div style={{ color: '#a78bfa', fontSize: '18px', flexShrink: 0 }}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '30px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(6, 182, 212, 0.15)';
            e.target.style.borderColor = 'rgba(6, 182, 212, 0.3)';
            e.target.style.color = '#67e8f9';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.target.style.color = '#ffffff';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
