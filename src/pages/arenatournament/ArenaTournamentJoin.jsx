import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { trackEvent } from '../../lib/analytics';
import Sidebar from '../../components/Sidebar';

export default function ArenaTournamentJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';
  // When a coach assigns "play this tournament", the student arrives with
  // ?assignment=<id>. We carry it through join so the leaderboard can later
  // show a "Submit assignment" button (stashed by tournament id in sessionStorage).
  const assignmentId = searchParams.get('assignment') || '';

  const [joinCode, setJoinCode] = useState(codeFromUrl);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamCounts, setTeamCounts] = useState({});

  const handleSearch = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setError('');
    setLoading(true);
    setTournament(null);

    try {
      const response = await api.get(`/api/arenatournament/by-code/${code}`);
      const found = response.data.tournament;
      setTournament(found);
      setSelectedTeamId(null);
      // For team_battle: fetch current team member counts from leaderboard
      if (found.tournamentType === 'team_battle') {
        try {
          const lb = await api.get(`/api/arenatournament/leaderboard/${found._id}`);
          const counts = {};
          if (lb.data.teamLeaderboard) {
            lb.data.teamLeaderboard.forEach(t => { counts[t.teamId] = t.memberCount; });
          }
          setTeamCounts(counts);
        } catch { setTeamCounts({}); }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    // Team Battle requires team selection
    if (tournament?.tournamentType === 'team_battle' && !selectedTeamId) {
      setError('Please select a team before joining.');
      return;
    }
    setError('');
    setJoining(true);

    try {
      const payload = { tournamentId: tournament._id };
      if (selectedTeamId) payload.teamId = selectedTeamId;

      const response = await api.post('/api/arenatournament/join', payload);

      if (response.data.success) {
        trackEvent('tournament_joined', { tournamentId: tournament._id, teamId: selectedTeamId || null });
        // Coach-assigned tournament: remember which assignment this play satisfies,
        // keyed by tournament id, so the leaderboard can offer "Submit assignment".
        if (assignmentId) {
          try { sessionStorage.setItem(`assignmentForTournament:${tournament._id}`, assignmentId); } catch { /* ignore */ }
        }
        navigate(`/arenatournament/lobby/${tournament._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join tournament');
    } finally {
      setJoining(false);
    }
  };

  // Arriving from a coach assignment (or a shared link) with ?code= prefilled —
  // auto-search so the student lands straight on the tournament card.
  useEffect(() => {
    if (codeFromUrl) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

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
      <Sidebar />
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
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        animation: 'slideIn 0.6s ease-out'
      }}>
        <div style={{
          background: 'rgba(23, 23, 23, 0.7)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Join Arena Tournament
          </h1>
          <p style={{ 
            color: '#9ca3af', 
            marginBottom: '30px',
            fontStyle: 'italic'
          }}>
            Enter the tournament code to join
          </p>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: '#ffffff',
                fontSize: '14px'
              }}>
                Tournament Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                placeholder="XXXXXXXX"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                maxLength={8}
                onFocus={(e) => {
                  e.target.style.borderColor = '#06b6d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: loading || !joinCode.trim() ? 'rgba(107, 114, 128, 0.3)' : 'rgba(6, 182, 212, 0.15)',
                color: loading || !joinCode.trim() ? '#9ca3af' : '#06b6d4',
                border: loading || !joinCode.trim() ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !joinCode.trim() ? 'not-allowed' : 'pointer',
                marginBottom: '20px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!loading && joinCode.trim()) {
                  e.target.style.background = 'rgba(6, 182, 212, 0.25)';
                  e.target.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && joinCode.trim()) {
                  e.target.style.background = 'rgba(6, 182, 212, 0.15)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{ position: 'relative', zIndex: 2 }}>Searching...</span>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.2), transparent)',
                    animation: 'shimmer 1.5s infinite'
                  }} />
                </>
              ) : 'Find Tournament'}
            </button>
          </form>

          {tournament && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              animation: 'slideInUp 0.5s ease-out'
            }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#ffffff', 
                marginBottom: '20px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {tournament.name}
              </h2>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Hosted by
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#67e8f9' }}>
                    ChessNexus
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Time Control
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#06b6d4' }}>
                    {tournament.timeControl.minutes}+{tournament.timeControl.increment || 0}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Duration
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                    {tournament.tournamentDuration.hours > 0 && `${tournament.tournamentDuration.hours}h `}
                    {tournament.tournamentDuration.minutes}min
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Starts
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                    {formatDate(tournament.scheduledStartTime)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Status
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    padding: '4px 12px',
                    background: getStatusColor(tournament.status),
                    color: 'white',
                    borderRadius: '20px',
                    display: 'inline-block',
                    boxShadow: `0 4px 16px ${getStatusColor(tournament.status)}40`
                  }}>
                    {tournament.status.toUpperCase()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    Participants
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#8b5cf6' }}>
                    {tournament.participantCount}
                  </div>
                </div>
              </div>

              {tournament.description && (
                <div style={{ 
                  marginTop: '20px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
                }}>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#9ca3af', 
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    Description:
                  </div>
                  <p style={{ 
                    color: '#d1d5db', 
                    lineHeight: '1.6', 
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    "{tournament.description}"
                  </p>
                </div>
              )}

              {tournament.status !== 'finished' && (
                <>
                  {/* Team Battle: team selection grid */}
                  {tournament.tournamentType === 'team_battle' && tournament.teams && tournament.teams.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#a855f7', marginBottom: '12px' }}>
                        ⚔️ Select Your Team
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {(() => {
                          const counts = tournament.teams.map(t => teamCounts[t.teamId] || 0);
                          const minCount = tournament.teams.length > 1 ? Math.min(...counts) : 0;
                          return tournament.teams.map((team, idx) => {
                            const count = counts[idx];
                            const isFull = count >= 30;
                            const isTooUnbalanced = tournament.teams.length > 1 && count >= minCount + 2;
                            const isSelected = selectedTeamId === team.teamId;
                            const isBlocked = isFull || isTooUnbalanced;
                            return (
                              <div
                                key={team.teamId}
                                onClick={() => !isBlocked && setSelectedTeamId(team.teamId)}
                                style={{
                                  padding: '12px 14px',
                                  borderRadius: '12px',
                                  border: `2px solid ${isSelected ? team.color : isFull ? 'rgba(255,255,255,0.05)' : isTooUnbalanced ? 'rgba(255,193,7,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                  background: isSelected ? `${team.color}22` : isFull ? 'rgba(0,0,0,0.2)' : isTooUnbalanced ? 'rgba(40,30,0,0.5)' : 'rgba(0,0,0,0.3)',
                                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                                  opacity: isFull ? 0.45 : isTooUnbalanced ? 0.7 : 1,
                                  transition: 'all 0.2s ease',
                                  textAlign: 'center'
                                }}
                              >
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? team.color : isTooUnbalanced ? '#fbbf24' : '#ffffff', marginBottom: '4px' }}>
                                  {team.teamName}
                                </div>
                                <div style={{ fontSize: '11px', color: isFull ? '#ef4444' : isTooUnbalanced ? '#fbbf24' : '#9ca3af' }}>
                                  {isFull ? 'FULL' : isTooUnbalanced ? '⚖️ Too large' : `${count} / 30`}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {selectedTeamId && (
                        <div style={{ fontSize: '12px', color: '#a855f7', marginTop: '10px', textAlign: 'center' }}>
                          ✓ Joining as <strong>{tournament.teams.find(t => t.teamId === selectedTeamId)?.teamName}</strong>
                        </div>
                      )}
                      {tournament.teams.length > 1 && (() => {
                        const counts = tournament.teams.map(t => teamCounts[t.teamId] || 0);
                        const minCount = Math.min(...counts);
                        const hasUnbalanced = counts.some(c => c >= minCount + 2);
                        return hasUnbalanced ? (
                          <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '10px', padding: '8px 12px', background: 'rgba(40,30,0,0.5)', borderRadius: '8px', border: '1px solid rgba(255,193,7,0.3)' }}>
                            ⚖️ Some teams have too many players — please join a smaller team for fair play.
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <button
                    onClick={handleJoin}
                    disabled={joining || (tournament.tournamentType === 'team_battle' && !selectedTeamId)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: (joining || (tournament.tournamentType === 'team_battle' && !selectedTeamId)) ? 'rgba(107, 114, 128, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                      color: (joining || (tournament.tournamentType === 'team_battle' && !selectedTeamId)) ? '#9ca3af' : '#10b981',
                      border: (joining || (tournament.tournamentType === 'team_battle' && !selectedTeamId)) ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: (joining || (tournament.tournamentType === 'team_battle' && !selectedTeamId)) ? 'not-allowed' : 'pointer',
                      marginTop: '24px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!joining && !(tournament.tournamentType === 'team_battle' && !selectedTeamId)) {
                        e.target.style.background = 'rgba(16, 185, 129, 0.25)';
                        e.target.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!joining && !(tournament.tournamentType === 'team_battle' && !selectedTeamId)) {
                        e.target.style.background = 'rgba(16, 185, 129, 0.15)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {joining ? (
                      <>
                        <span style={{ position: 'relative', zIndex: 2 }}>Joining...</span>
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent)',
                          animation: 'shimmer 1.5s infinite'
                        }} />
                      </>
                    ) : 'Join Tournament'}
                  </button>
                </>
              )}

              {/* Already finished — let an assigned student jump to the results
                  page to submit their assignment. */}
              {tournament.status === 'finished' && assignmentId && (
                <button
                  onClick={() => {
                    try { sessionStorage.setItem(`assignmentForTournament:${tournament._id}`, assignmentId); } catch { /* ignore */ }
                    navigate(`/arenatournament/leaderboard/${tournament._id}?assignment=${assignmentId}`);
                  }}
                  style={{
                    width: '100%', padding: '16px', marginTop: '24px',
                    background: 'rgba(139, 92, 246, 0.15)', color: '#a855f7',
                    border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px',
                    fontSize: '16px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  View results &amp; submit assignment →
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => navigate('/arenatournament')}
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
            ← Back to Tournaments
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        input::placeholder {
          color: rgba(156, 163, 175, 0.6);
        }
      `}</style>
    </div>
  );
}
