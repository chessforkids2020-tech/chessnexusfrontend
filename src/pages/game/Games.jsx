
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import CoffeeCta from '../../components/CoffeeCta';
import AboutFeatureCTA from '../../components/marketing/AboutFeatureCTA';
import FriendGameSetup from './FriendGameSetup';
import './Games.css';

export default function Games() {
  const navigate = useNavigate();
  const [showFriendSetup, setShowFriendSetup] = useState(false);
  const [floatingPieces, setFloatingPieces] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState(2898);
  const [tournaments, setTournaments] = useState([]);
  const [recentFinished, setRecentFinished] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);


  // Initialize floating chess pieces
  useEffect(() => {
    const pieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    const newPieces = [];
    
    for (let i = 0; i < 8; i++) {
      newPieces.push({
        id: i,
        piece: pieces[i % pieces.length],
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        size: 2 + Math.random() * 2
      });
    }
    
    setFloatingPieces(newPieces);

    // Update online players count
    const interval = setInterval(() => {
      setOnlinePlayers(prev => {
        const change = Math.floor(Math.random() * 10) - 5;
        const newValue = prev + change;
        return Math.max(2800, Math.min(2950, newValue));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.get('/api/arenatournament/list');
        setTournaments(response.data.tournaments || []);
      } catch (error) {
        setTournaments([]);
      } finally {
        setTournamentsLoading(false);
      }
    };

    fetchTournaments();

    api.get('/api/arenatournament/recent-finished')
      .then(res => setRecentFinished((res.data.tournaments || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  // Play options for right column
  const playOptions = [
    {
      id: 'friend',
      title: "Play with a Friend",
      subtitle: "Private game by code • Even as a guest",
      icon: "🤝",
      color: "#34D399",
      action: () => setShowFriendSetup(true)
    },
    {
      id: 2,
      title: "Masters Game",
      subtitle: "Study famous games • Top players",
      icon: "👑",
      color: "#A78BFA",
      action: () => navigate('/master-games')
    },
    {
      id: 3,
      title: "Arena Tournament",
      subtitle: "Competitive tournaments • Win places",
      icon: "🏆",
      color: "#FFD166",
      action: () => navigate('/arenatournament')
    }
  ];

  // Quick play options for left column
  const quickPlayOptions = [
    {
      id: 'blitz',
      title: "Blitz",
      time: "3+2 min",
      icon: "⚡",
      badge: "Fast",
      color: "#FF6B6B",
      gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF9E7D 100%)"
    },
    {
      id: 'rapid',
      title: "Rapid",
      time: "10+0 min",
      icon: "⏱️",
      badge: "Popular",
      color: "#4ECDC4",
      gradient: "linear-gradient(135deg, #4ECDC4 0%, #06D6A0 100%)"
    },
    {
      id: 'bullet',
      title: "Bullet",
      time: "1+0 min",
      icon: "💨",
      badge: "Extreme",
      color: "#FFD166",
      gradient: "linear-gradient(135deg, #FFD166 0%, #FFE99C 100%)"
    }
  ];

  // Today's tournaments
  // Tournaments are now fetched from API

  const handleQuickPlay = (gameType) => {
    navigate(`/play?mode=${gameType}`);
  };

  const handlePlayOption = (option) => {
    Promise.resolve(option.action()).catch(console.error);
  };

  const joinTournament = (tournamentId) => {
    navigate(`/arenatournament/lobby/${tournamentId}`);
  };

  return (
    <div className="games-container">
      {/* Background floating pieces */}
      <div className="floating-pieces">
        {floatingPieces.map((piece) => (
          <div
            key={piece.id}
            className="floating-piece"
            style={{
              left: `${piece.x}%`,
              top: `${piece.y}%`,
              fontSize: `${piece.size}rem`
            }}
          >
            {piece.piece}
          </div>
        ))}
      </div>

      {/* Main 60/40 Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1400px', gap: '16px', position: 'relative', zIndex: 2 }}>
      <div className="games-layout">
        
        {/* LEFT COLUMN - 60% */}
        <div className="left-column">
          
          {/* Today's Tournament Section */}
          <div className="glass-card">
            <div className="section-header">
              <div className="section-icon">🏆</div>
              <h2 className="section-title">Today's Tournament</h2>
            </div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>

              <span>🕔</span> To view tournament times and days, click <strong style={{ color: '#fbbf24' }}>SCHEDULE</strong>

            </div>
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {tournamentsLoading ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="loading-spinner" style={{ display: 'inline-block' }} />
                  Loading...
                </div>
              ) : tournaments.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 13, padding: '12px 0' }}>No active tournaments right now.</div>
              ) : (
                tournaments.slice(0, 3).map((tournament) => {
                  const startTime = new Date(tournament.scheduledStartTime);
                  const now = new Date();
                  const timeDiff = startTime - now;
                  let timeDisplay = '';
                  let statusColor = '#4ECDC4';
                  let statusText = tournament.status;
                  if (tournament.status === 'scheduled') {
                    if (timeDiff > 0) {
                      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                      const mins = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                      timeDisplay = `Starts in ${hours}:${mins.toString().padStart(2, '0')}`;
                      statusText = 'upcoming';
                    } else {
                      timeDisplay = 'Starting soon';
                      statusColor = '#FFD166';
                    }
                  } else if (tournament.status === 'lobby') {
                    timeDisplay = 'Join now!';
                    statusColor = '#FFD166';
                    statusText = 'open';
                  } else if (tournament.status === 'active') {
                    timeDisplay = 'In progress';
                    statusColor = '#FF6B6B';
                    statusText = 'live';
                  }
                  const timeControl = `${tournament.timeControl.minutes}+${tournament.timeControl.seconds}`;
                  let icon = '🏆';
                  if (timeControl.includes('1+') || timeControl.includes('2+')) icon = '💨';
                  else if (timeControl.includes('3+') || timeControl.includes('5+')) icon = '⚡';
                  return (
                    <div
                      key={tournament._id}
                      onClick={() => joinTournament(tournament._id)}
                      style={{
                        flex: '1 1 0', minWidth: 140,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${statusColor}44`,
                        borderRadius: 12, padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 7,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${statusColor}11`; e.currentTarget.style.borderColor = `${statusColor}99`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = `${statusColor}44`; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                        <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tournament.name}
                        </span>
                      </div>
                      <div style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>{timeDisplay}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>⏱ {timeControl}</span>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>👥 {tournament.participantCount}</span>
                      </div>
                      <span style={{
                        alignSelf: 'flex-start',
                        background: `${statusColor}15`, color: statusColor,
                        border: `1px solid ${statusColor}55`,
                        borderRadius: 999, padding: '2px 9px',
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      }}>
                        {statusText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <button
                onClick={() => navigate('/arenatournament')}
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  color: '#818cf8', borderRadius: 20,
                  padding: '7px 24px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; e.currentTarget.style.color = '#a5b4fc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#818cf8'; }}
              >
                View All Tournaments →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - 40% */}
        <div className="right-column">
          
          {/* CoffeeCta temporarily hidden — Razorpay verification in progress (re-enable ~June 2, 2026) */}

          {/* Play Options Cards */}
          {playOptions.map((option) => (
            <div
              key={option.id}
              className="glass-card play-option-card"
              onClick={() => !option.disabled && handlePlayOption(option)}
              style={{
                opacity: option.disabled ? 0.5 : 1,
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                position: 'relative'
              }}
            >
              <div className="play-option-left">
                <div 
                  className="play-option-icon"
                  style={{ color: option.color }}
                >
                  {option.icon}
                </div>
                <div className="play-option-content">
                  <h3 className="play-option-title">{option.title}</h3>
                  <p className="play-option-subtitle">{option.subtitle}</p>
                  {option.label && (
                    <div style={{
                      marginTop: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      padding: '7px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      boxShadow: '0 8px 20px rgba(124, 58, 237, 0.18)'
                    }}>
                      {option.label}
                    </div>
                  )}
                </div>
              </div>
              {option.disabled ? (
                <div style={{
                  background: 'rgba(255, 215, 0, 0.9)',
                  color: '#000',
                  padding: '6px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap'
                }}>
                  🔜 Coming Soon
                </div>
              ) : (
                <div className="arrow-icon">→</div>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* Recently Finished Tournaments */}
      {recentFinished.length > 0 && (
        <div className="glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div className="section-icon">🏁</div>
            <h2 className="section-title">Recently Finished Tournaments</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
            {recentFinished.map((t) => {
              const ended = t.endTime ? new Date(t.endTime) : null;
              const timeControl = t.timeControl ? `${t.timeControl.minutes}+${t.timeControl.seconds}` : '?';
              const endLabel = ended
                ? ended.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : 'N/A';
              return (
                <div
                  key={t._id}
                  onClick={() => navigate(`/arenatournament/leaderboard/${t._id}`)}
                  style={{
                    flex: '1 1 0',
                    minWidth: '220px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'; e.currentTarget.style.background = 'rgba(139,92,246,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#e5e7eb', fontSize: '14px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🏆 {t.name}
                    </span>
                    <span style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      FINISHED
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>⏱ {timeControl}</span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>👥 {t.participantCount ?? 0} players</span>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '11px' }}>Ended: {endLabel}</div>
                  <div style={{ marginTop: '2px', color: '#6366f1', fontSize: '12px', fontWeight: '600' }}>View Results →</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tournament Rewards Card - full width below layout */}
      <div className="glass-card trophy-showcase-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="trophy-header">
          <h3 className="trophy-title">🏆 Tournament Rewards</h3>
        </div>

        <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>

          {/* Left column — point events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Points</div>

            {[
              { icon: '✅', label: 'Win',              desc: null,                              value: '+2 pts' },
              { icon: '🤝', label: 'Draw',             desc: null,                              value: '+1 pt' },
              { icon: '🐦', label: 'Early Bird',       desc: 'Join before tournament starts',   value: '+3 pts' },
              { icon: '⚡', label: 'Comeback Surge',   desc: 'Last place → 2 wins in a row',   value: '+4 pts' },
              { icon: '👑', label: 'Beat Crown holder',desc: null,                              value: '+4 pts' },
              { icon: '🎁', label: 'Carry Bonus',      desc: 'From previous tournament',        value: 'up to +4' },
            ].map(({ icon, label, desc, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '600' }}>{label}</div>
                  {desc && <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '1px' }}>{desc}</div>}
                </div>
                <span style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: '6px', padding: '3px 9px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right column — crowns + carry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Crown Tiers</div>

            {[
              { emoji: '👑', label: 'Gold Crown',     req: '1 tournament win',    color: '#f59e0b' },
              { emoji: '👑', label: 'Platinum Crown', req: '3 consecutive wins',  color: '#cbd5e1' },
              { emoji: '💎', label: 'Gem Crown',      req: '5 tournament wins',   color: '#60a5fa' },
            ].map(({ emoji, label, req, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '18px', filter: `drop-shadow(0 0 6px ${color})`, width: '20px', textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color, fontSize: '13px', fontWeight: '700' }}>{label}</div>
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '1px' }}>{req}</div>
                </div>
              </div>
            ))}

            <div style={{ color: '#4b5563', fontSize: '11px', padding: '0 4px' }}>
              ⚠️ Crown is only lost if you participate and don't finish 1st
            </div>
            <div style={{ color: '#4b5563', fontSize: '11px', padding: '0 4px' }}>
              Any player who beats a crowned player gets <span style={{ color: '#f59e0b', fontWeight: '700' }}>+4 pts</span> for that win
            </div>

            <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px', marginBottom: '2px' }}>Carry-Forward Bonus 🎁</div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px' }}>
              <div style={{ color: '#e5e7eb', fontSize: '13px', lineHeight: '1.6' }}>
                Play <strong style={{ color: '#a78bfa' }}>≥ 3 games</strong> in <strong style={{ color: '#a78bfa' }}>3 separate tournaments</strong> → earn <strong style={{ color: '#a78bfa' }}>+2 carry pts</strong> (max +4). Auto-applied as your starting score next tournament. Expires in <strong style={{ color: '#a78bfa' }}>5 days</strong>.
              </div>
            </div>
          </div>

        </div>
      </div>
      </div>

      <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, zIndex: 1 }}>
        <AboutFeatureCTA
          links={[
            { label: "About Games", to: "/play-chess-online" },
            { label: "About 3D Arena", to: "/3d-chess-arena-tournament" },
          ]}
        />
      </div>

      {showFriendSetup && <FriendGameSetup onClose={() => setShowFriendSetup(false)} />}
    </div>
  );
}
