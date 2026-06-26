import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import PlayerName from '../../components/PlayerName';
import './TeamRaceResults.css';

function TeamRaceResults() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [race, setRace] = useState(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (!raceId) {
      navigate('/dashboard');
      return;
    }

    fetchResults();
    fetchRaceDetails();
  }, [raceId]);

  const fetchRaceDetails = async () => {
    try {
      const res = await api.get(`/api/team-race/${raceId}`);
      setRace(res.data);
    } catch (err) {
    }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get(`/api/team-race/${raceId}/results`);
      setTeams(res.data.teams);
      setResults(res.data.results);
      
      // Refresh user data to get updated highest scores
      await refreshUser();
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const getTeamPlayers = (teamId) => {
    return results.filter(r => String(r.teamId?._id || r.teamId) === String(teamId));
  };

  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
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
        this.y += this.speedY; this.x += this.speedX; this.rotation += this.rotationSpeed;
        if (this.y > canvas.height) { this.y = -10; this.x = Math.random() * canvas.width; }
      }
      draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color; ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size); ctx.restore();
      }
    }

    for (let i = 0; i < 150; i++) confettiPieces.push(new ConfettiPiece());

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiPieces.forEach(p => { p.update(); p.draw(); });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const timeout = setTimeout(() => { setShowConfetti(false); cancelAnimationFrame(animationId); }, 20000);
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    return () => { cancelAnimationFrame(animationId); clearTimeout(timeout); window.removeEventListener('resize', handleResize); };
  }, [showConfetti]);

  const sortedResults = [...results].sort((a, b) => b.totalScore - a.totalScore);
  const teamColors = ['#f59e0b', '#94a3b8', '#b45309'];
  const topTeams = [teams[1], teams[0], teams[2]];
  const podiumConfig = [
    { place: 2, tone: '#94a3b8', label: 'Silver', className: 'is-second' },
    { place: 1, tone: '#f59e0b', label: 'Champion', className: 'is-first' },
    { place: 3, tone: '#b45309', label: 'Bronze', className: 'is-third' }
  ];

  if (loading) {
    return (
      <div className="tournament-leaderboard-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#06b6d4', borderLeftColor: '#10b981', animation: 'tr-spin 0.9s linear infinite' }} />
          <div style={{ color: '#06b6d4', fontSize: '14px', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-leaderboard-container">
      {showConfetti && (
        <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }} />
      )}

      {/* Back button */}
      <button className="back-to-tournaments" onClick={() => navigate('/dashboard')}>
        {'←'} Back to Dashboard
      </button>

      <div className="tr-main-content">
        {/* Race Name Header */}
        <h1 className="tournament-name-header">{race?.raceName || 'Team Race Results'}</h1>

        {/* Trophy Podium */}
        {teams.length > 0 && (
          <div className="podium-container elegant-podium">
            {topTeams.map((team, idx) => {
              if (!team) return null;
              const cfg = podiumConfig[idx];
              const teamPlayers = getTeamPlayers(team._id);
              const displayPlayers = teamPlayers.length;
              return (
                <article key={team._id} className={`trophy-item ${cfg.className}`} style={{ '--podium-tone': cfg.tone }}>
                  <div className="rank-ribbon" style={{ borderColor: `${cfg.tone}55`, color: cfg.tone }}>
                    #{cfg.place} {cfg.label}
                  </div>

                  <div className="trophy-icon" style={{ borderColor: `${cfg.tone}66`, boxShadow: `0 6px 24px ${cfg.tone}40` }}>
                    <svg viewBox="0 0 120 120" className="trophy-svg" role="img" aria-label={`${cfg.place} place trophy`}>
                      <defs>
                        <linearGradient id={`cupGrad-${cfg.place}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                          <stop offset="100%" stopColor={cfg.tone} stopOpacity="0.85" />
                        </linearGradient>
                      </defs>
                      <path d="M28 26h64v8c0 19-13 34-32 34S28 53 28 34v-8z" fill={`url(#cupGrad-${cfg.place})`} />
                      <path d="M28 34h-8c0 14 8 22 20 24" fill="none" stroke={cfg.tone} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
                      <path d="M92 34h8c0 14-8 22-20 24" fill="none" stroke={cfg.tone} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
                      <rect x="52" y="67" width="16" height="12" rx="2" fill={cfg.tone} opacity="0.75" />
                      <rect x="43" y="79" width="34" height="8" rx="4" fill={cfg.tone} opacity="0.6" />
                      <rect x="36" y="88" width="48" height="10" rx="5" fill={cfg.tone} opacity="0.45" />
                    </svg>
                  </div>

                  <div className="trophy-username">
                    <div className="team-dot" style={{ background: cfg.tone, boxShadow: `0 0 10px ${cfg.tone}` }} />
                    <span className="trophy-team-name" style={{ color: cfg.tone }}>{team.teamName}</span>
                    <span className="trophy-team-meta">{displayPlayers} players</span>
                  </div>

                  <div className="trophy-score">{team.totalScore} pts</div>
                  <div className="podium-base" style={{ borderColor: `${cfg.tone}66`, background: `linear-gradient(180deg, ${cfg.tone}33 0%, rgba(10, 13, 21, 0.92) 100%), rgba(0, 0, 0, 0.25)` }} />
                </article>
              );
            })}
          </div>
        )}

        {/* Team Standings Table */}
        {teams.length > 0 && (
          <div className="leaderboard-table-container">
            <h3 className="team-standings-title">⚔️ Team Standings</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'center' }}>Members</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const col = teamColors[i] || '#64748b';
                  return (
                    <tr key={team._id} className={i === 0 ? 'team-row-first' : ''}>
                      <td className="rank-cell">{medals[i] || i + 1}</td>
                      <td className="player-cell">
                        <div className="player-cell-content">
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}`, flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: col }}>{team.teamName}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>{getTeamPlayers(team._id).length}</td>
                      <td className="score-cell" style={{ textAlign: 'right' }}>{team.totalScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Individual Results Table */}
        {sortedResults.length > 0 && (
          <div className="leaderboard-table-container">
            <h3 className="team-standings-title">🏅 Individual Results</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const teamIdx = teams.findIndex(t => String(t._id) === String(r.teamId?._id || r.teamId));
                  const col = teamColors[teamIdx] || '#64748b';
                  return (
                    <tr key={r._id}>
                      <td className="rank-cell">{medals[i] || i + 1}</td>
                      <td className="player-cell">
                        <div className="player-cell-content">{r.userId ? <PlayerName displayName={r.userId.displayName} username={r.userId.username} userId={r.userId._id} /> : '—'}</div>
                      </td>
                      <td>
                        {r.teamId?.teamName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: `${col}22`, border: `1px solid ${col}55`, fontSize: '12px', fontWeight: '600', color: col, whiteSpace: 'nowrap' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: col, display: 'inline-block' }} />
                            {r.teamId.teamName}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="score-cell" style={{ textAlign: 'right' }}>{r.totalScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {teams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '16px' }}>
            No results available yet.
          </div>
        )}

        <div style={{ textAlign: 'center', paddingTop: '32px' }}>
          <button className="back-to-tournaments" onClick={() => navigate('/dashboard')}>
            {'←'} Back to Dashboard
          </button>
        </div>
      </div>

      <style>{`@keyframes tr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default TeamRaceResults;
