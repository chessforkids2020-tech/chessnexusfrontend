
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import CoffeeCta from '../../components/CoffeeCta';
import AboutFeatureCTA from '../../components/marketing/AboutFeatureCTA';
import FriendGameSetup from './FriendGameSetup';
import MasterMoveBoard from '../../components/MasterMoveBoard';
import './Games.css';

export default function Games() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showFriendSetup, setShowFriendSetup] = useState(false);

  // Auto-open "Play with a Friend" when arriving with ?friend=1 (e.g. from the
  // Social Hub friends list "Play" button).
  useEffect(() => {
    if (searchParams.get('friend') === '1') setShowFriendSetup(true);
  }, [searchParams]);
  const [floatingPieces, setFloatingPieces] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState(2898);
  const [tournaments, setTournaments] = useState([]);
  const [recentFinished, setRecentFinished] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  // Tick every second so the hero-banner countdown updates live.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // The single tournament to feature in the hero banner: a live one if any,
  // otherwise the soonest upcoming. null = nothing worth highlighting.
  const featured = (() => {
    if (!tournaments.length) return null;
    const live = tournaments.find(t => t.status === 'active' || t.status === 'lobby');
    if (live) return live;
    const upcoming = tournaments
      .filter(t => t.status === 'scheduled' && t.scheduledStartTime)
      .sort((a, b) => new Date(a.scheduledStartTime) - new Date(b.scheduledStartTime));
    return upcoming[0] || null;
  })();


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

      {/* ── HERO: highlight the next/live tournament ── */}
      {featured && (() => {
        const start = featured.scheduledStartTime ? new Date(featured.scheduledStartTime).getTime() : null;
        const diff = start ? start - nowTick : 0;
        const isLive = featured.status === 'active' || featured.status === 'lobby' || (start && diff <= 0);
        const tc = featured.timeControl ? `${featured.timeControl.minutes}+${featured.timeControl.seconds}` : '';
        let countdown = '';
        if (!isLive && diff > 0) {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          countdown = h > 0 ? `${h}h ${m}m ${s}s` : `${m}:${String(s).padStart(2, '0')}`;
        }
        const accent = isLive ? '#ef4444' : '#FFD166';
        // Drop a trailing date like "– 24 Jun 2026" from the name (we show the countdown instead).
        const displayName = (featured.name || '').replace(/\s*[–-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim();
        return (
          <div
            className="games-hero-banner"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 20,
              padding: '34px 36px',
              minHeight: 150,
              background: `linear-gradient(120deg, rgba(124,58,237,0.22), rgba(6,182,212,0.12) 60%, rgba(0,0,0,0.2))`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 10px 40px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            {/* pulsing glow accent */}
            <div style={{
              position: 'absolute', top: -60, left: -40, width: 220, height: 220,
              background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
              pointerEvents: 'none',
              animation: 'heroPulse 3s ease-in-out infinite',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 58, lineHeight: 1, flexShrink: 0 }}>🏆</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  {isLive ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(239,68,68,0.18)', color: '#fca5a5',
                      border: '1px solid rgba(239,68,68,0.5)', borderRadius: 999,
                      padding: '3px 11px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'heroBlink 1.2s infinite' }} />
                      Live now
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(255,209,102,0.16)', color: '#FFD166',
                      border: '1px solid rgba(255,209,102,0.5)', borderRadius: 999,
                      padding: '3px 11px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Upcoming Tournament
                    </span>
                  )}
                  {tc && <span style={{ color: '#cbd5e1', fontSize: 13 }}>⏱ {tc}</span>}
                  <span style={{ color: '#cbd5e1', fontSize: 13 }}>👥 {featured.participantCount ?? 0} joined</span>
                </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 28, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 520 }} title={displayName}>
                  {displayName}
                </div>
                <div style={{ color: accent, fontWeight: 700, fontSize: 17, marginTop: 4 }}>
                  {isLive ? '🔴 Join the action now' : countdown ? `Starts in ${countdown}` : 'Starting soon'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <button
                onClick={() => joinTournament(featured._id)}
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  color: isLive ? '#fff' : '#1a1500',
                  border: 'none', borderRadius: 14, padding: '15px 32px',
                  fontSize: 16, fontWeight: 800, cursor: 'pointer',
                  boxShadow: `0 6px 22px ${accent}44`, whiteSpace: 'nowrap',
                }}
              >
                {isLive ? 'Join now →' : 'Join tournament →'}
              </button>
              <button
                onClick={() => navigate('/arenatournament')}
                style={{
                  background: 'rgba(255,255,255,0.08)', color: '#e5e7eb',
                  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12,
                  padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                All tournaments
              </button>
            </div>
          </div>
        );
      })()}

      {/* Play options — horizontal row below the hero banner */}
      <div className="games-play-row">
        {playOptions.map((option) => (
          <div
            key={option.id}
            className="glass-card play-option-card play-option-card--row"
            onClick={() => !option.disabled && handlePlayOption(option)}
            style={{
              opacity: option.disabled ? 0.5 : 1,
              cursor: option.disabled ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
          >
            <div className="play-option-left">
              <div className="play-option-icon" style={{ color: option.color }}>
                {option.icon}
              </div>
              <div className="play-option-content">
                <h3 className="play-option-title">{option.title}</h3>
                <p className="play-option-subtitle">{option.subtitle}</p>
              </div>
            </div>
            {option.disabled ? (
              <div style={{
                background: 'rgba(255, 215, 0, 0.9)', color: '#000',
                padding: '6px 16px', borderRadius: '12px', fontSize: '12px',
                fontWeight: '700', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', whiteSpace: 'nowrap'
              }}>
                🔜 Coming Soon
              </div>
            ) : (
              <div className="arrow-icon">→</div>
            )}
          </div>
        ))}
      </div>

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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tournamentsLoading ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="loading-spinner" style={{ display: 'inline-block' }} />
                  Loading...
                </div>
              ) : tournaments.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 13, padding: '12px 0' }}>No active tournaments right now.</div>
              ) : (
                tournaments.slice(0, 4).map((tournament) => {
                  const startTime = new Date(tournament.scheduledStartTime);
                  const now = new Date();
                  const timeDiff = startTime - now;
                  let timeDisplay = '';
                  let statusColor = '#4ECDC4';
                  let statusText = tournament.status;
                  let joinLabel = 'Join →';
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
                    joinLabel = 'Join now →';
                  } else if (tournament.status === 'active') {
                    timeDisplay = 'In progress';
                    statusColor = '#FF6B6B';
                    statusText = 'live';
                    joinLabel = 'Watch →';
                  }
                  const timeControl = `${tournament.timeControl.minutes}+${tournament.timeControl.seconds}`;
                  let icon = '🏆';
                  if (timeControl.includes('1+') || timeControl.includes('2+')) icon = '💨';
                  else if (timeControl.includes('3+') || timeControl.includes('5+')) icon = '⚡';
                  return (
                    <div
                      key={tournament._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${statusColor}44`,
                        borderRadius: 12, padding: '12px 16px',
                      }}
                    >
                      <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{icon}</span>

                      {/* Name + details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={tournament.name}>
                            {(tournament.name || '').replace(/\s*[–-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim()}
                          </span>
                          <span style={{
                            background: `${statusColor}15`, color: statusColor,
                            border: `1px solid ${statusColor}55`,
                            borderRadius: 999, padding: '2px 9px',
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          }}>{statusText}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>{timeDisplay}</span>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>⏱ {timeControl}</span>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>👥 {tournament.participantCount}</span>
                        </div>
                      </div>

                      {/* Join button */}
                      <button
                        onClick={() => joinTournament(tournament._id)}
                        style={{
                          flexShrink: 0,
                          background: `${statusColor}1f`, color: statusColor,
                          border: `1px solid ${statusColor}88`,
                          borderRadius: 10, padding: '9px 18px',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${statusColor}33`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${statusColor}1f`; }}
                      >
                        {joinLabel}
                      </button>
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

          {/* Guess the Master's Move — daily widget (large inline playable board) */}
          <MasterMoveBoard maxBoard={320} />

          {/* CoffeeCta temporarily hidden — Razorpay verification in progress (re-enable ~June 2, 2026) */}

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
              const timeControl = t.timeControl ? `${t.timeControl.minutes}+${t.timeControl.seconds}` : '?';
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
                      🏆 {(t.name || '').replace(/\s*[–-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim()}
                    </span>
                    <span style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      FINISHED
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>⏱ {timeControl}</span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>👥 {t.participantCount ?? 0} players</span>
                  </div>
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
