import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Sidebar from '../../components/Sidebar';

export default function ArenaTournamentCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId') || '';
  // Coach mode: a private tournament for the coach's own students only.
  const coachMode = searchParams.get('coach') === '1';
  const [linkToClub, setLinkToClub] = useState(Boolean(clubId));
  const [tournamentType, setTournamentType] = useState('standard');
  const [teamCount, setTeamCount] = useState(2);
  const DEFAULT_TEAM_SUGGESTIONS = ['Dragons', 'Wolves', 'Eagles', 'Tigers', 'Lions', 'Panthers', 'Sharks', 'Hawks', 'Cobras', 'Falcons'];
  const [teamNames, setTeamNames] = useState(() => DEFAULT_TEAM_SUGGESTIONS.slice(0, 2));
  const [formData, setFormData] = useState({
    name: '',
    timeControlMinutes: 5,
    timeControlSeconds: 0,
    tournamentDurationHours: 0,
    tournamentDurationMinutes: 30,
    scheduledStartDate: '',
    scheduledStartTime: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMarathon = tournamentType === 'bullet_blitz_marathon';
  const isTeamBattle = tournamentType === 'team_battle';
  const isChess960 = tournamentType === 'chess960';
  // Standard + Team Battle + Chess960 all allow custom time control
  const needsTimeControl = !isMarathon;

  useEffect(() => {
    return () => {
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const scheduledDateTime = new Date(`${formData.scheduledStartDate}T${formData.scheduledStartTime}`);
      
      const payload = {
        name: formData.name,
        scheduledStartTime: scheduledDateTime.toISOString(),
        description: formData.description,
        createdInTimezone: userTimezone,
        tournamentType,
        ...(coachMode ? { coachPrivate: true } : {}),
        ...(!coachMode && clubId && linkToClub ? { clubId } : {})
      };

      if (!isMarathon) {
        payload.timeControlMinutes = parseInt(formData.timeControlMinutes);
        payload.timeControlSeconds = parseInt(formData.timeControlSeconds);
        payload.tournamentDurationHours = parseInt(formData.tournamentDurationHours);
        payload.tournamentDurationMinutes = parseInt(formData.tournamentDurationMinutes);
      }

      if (isTeamBattle) {
        payload.teamCount = parseInt(teamCount);
        payload.teamNames = teamNames.slice(0, parseInt(teamCount));
      }
      
      const response = await api.post('/api/arenatournament/create', payload);

      if (response.data.success) {
        if (coachMode) {
          // Coach → their own no-live-board spectator page. Students see it in
          // their Activities tab automatically (no join code to share).
          navigate(`/coach/arena-tournament/${response.data.tournament._id}`);
        } else {
          alert(`Tournament created! Join code: ${response.data.tournament.joinCode}`);
          navigate('/arenatournament');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
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
        background: 'radial-gradient(circle at 20% 50%, var(--color-accent-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a12) 0%, transparent 50%)',
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
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          padding: '40px',
          boxShadow: '0 20px 40px var(--color-black-a50)',
          border: '1px solid var(--color-white-a04)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {coachMode ? 'Create Class Tournament' : 'Create Arena Tournament'}
          </h1>
          <p style={{
            color: 'var(--color-text-muted)',
            marginBottom: coachMode ? '16px' : '30px',
            fontStyle: 'italic'
          }}>
            {coachMode
              ? 'Only your students can see and join this one'
              : 'Set up your tournament and share the code with participants'}
          </p>

          {/* The form is IDENTICAL in both modes, and the only thing that makes
              a tournament private is the ?coach=1 flag in the URL. A coach who
              arrives here from the public page gets a public tournament, which
              is correct — but they had no way to tell the two apart. Say which
              one they are about to create. */}
          {coachMode && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'var(--color-accent-a12)',
              border: '1px solid var(--color-accent-a30)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              marginBottom: '24px',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">🎓</span>
              <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
                <strong>Private to your class.</strong> This tournament will not
                appear in the public tournament list. Your students find it in
                their <em>My Coach → Activities</em> tab — no join code to share.
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--color-danger-a12)',
              color: 'var(--color-danger)',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '20px',
              border: '1px solid var(--color-danger-a20)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Tournament Format Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontWeight: '600',
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Tournament Format *
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Standard option */}
                <div
                  onClick={() => setTournamentType('standard')}
                  style={{
                    flex: '1 1 140px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${tournamentType === 'standard' ? 'var(--color-accent)' : 'var(--color-white-a10)'}`,
                    background: tournamentType === 'standard' ? 'var(--color-accent-a12)' : 'var(--color-black-a35)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>♟️</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Standard</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Custom time & duration</div>
                </div>
                {/* Marathon option */}
                <div
                  onClick={() => setTournamentType('bullet_blitz_marathon')}
                  style={{
                    flex: '1 1 140px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${tournamentType === 'bullet_blitz_marathon' ? 'var(--color-warning)' : 'var(--color-white-a10)'}`,
                    background: tournamentType === 'bullet_blitz_marathon' ? 'var(--color-warning-a12)' : 'var(--color-black-a35)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚡</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Bullet Blitz Marathon</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>2 hrs · 2+1 → 3+2</div>
                </div>
                {/* Team Battle option */}
                <div
                  onClick={() => setTournamentType('team_battle')}
                  style={{
                    flex: '1 1 140px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isTeamBattle ? 'var(--color-accent-2)' : 'var(--color-white-a10)'}`,
                    background: isTeamBattle ? 'rgba(168,85,247,0.1)' : 'var(--color-black-a35)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚔️</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Team Battle</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Teams compete together</div>
                </div>
                {/* Chess960 option */}
                <div
                  onClick={() => setTournamentType('chess960')}
                  style={{
                    flex: '1 1 140px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isChess960 ? 'var(--color-success)' : 'var(--color-white-a10)'}`,
                    background: isChess960 ? 'rgba(34,197,94,0.1)' : 'var(--color-black-a35)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎲</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Chess960</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Random starting positions</div>
                </div>
              </div>

              {/* Marathon info panel */}
              {isMarathon && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-warning-a12)',
                  border: '1px solid var(--color-warning-a30)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-warning)', marginBottom: '8px' }}>
                    ⚡ Bullet Blitz Marathon — 1h 30min
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                      <span style={{ color: 'var(--color-warning)', fontWeight: '600' }}>45 min:</span> Bullet 2+1
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>→</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                      <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>45 min:</span> Blitz 3+2
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    Players finish their current game before the phase switch. No games are dropped.
                  </div>
                </div>
              )}

              {/* Team Battle config panel */}
              {isTeamBattle && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.3)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-accent-2)', marginBottom: '12px' }}>
                    ⚔️ Team Battle Settings
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      Number of Teams *
                    </label>
                    <select
                      value={teamCount}
                      onChange={e => {
                        const n = parseInt(e.target.value);
                        setTeamCount(n);
                        setTeamNames(prev => {
                          const updated = [...prev];
                          while (updated.length < n) updated.push(DEFAULT_TEAM_SUGGESTIONS[updated.length] || `Team ${updated.length + 1}`);
                          return updated.slice(0, n);
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'var(--color-black-a35)',
                        border: '1px solid rgba(168,85,247,0.4)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text)',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        appearance: 'none'
                      }}
                    >
                      {[2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n} style={{ background: 'var(--color-surface)' }}>{n} Teams</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '10px' }}>
                    👥 Max <strong style={{ color: 'var(--color-accent-2)' }}>30 players</strong> per team &nbsp;·&nbsp; Players pick their team when joining
                  </div>

                  {/* Team name inputs */}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-accent-2)', marginBottom: '8px' }}>
                      ✏️ Name your teams (suggestions pre-filled — change as you like!)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                      {Array.from({ length: teamCount }).map((_, i) => {
                        const COLORS = ['var(--color-danger)','var(--color-accent-2)','var(--color-success)','var(--color-warning)','var(--color-accent-2)','#ec4899','#14b8a6','#f97316','var(--color-accent-2)','#e11d48'];
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-circle)', background: COLORS[i], flexShrink: 0 }} />
                            <input
                              type="text"
                              value={teamNames[i] || ''}
                              onChange={e => {
                                const updated = [...teamNames];
                                updated[i] = e.target.value;
                                setTeamNames(updated);
                              }}
                              maxLength={20}
                              placeholder={`Team ${i + 1}`}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                background: 'var(--color-black-a35)',
                                border: `1px solid ${COLORS[i]}55`,
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text)',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                outline: 'none'
                              }}
                              onFocus={e => { e.target.style.borderColor = COLORS[i]; }}
                              onBlur={e => { e.target.style.borderColor = `${COLORS[i]}55`; }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Chess960 info panel */}
              {isChess960 && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.3)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-success)', marginBottom: '6px' }}>
                    🎲 Chess960 (Fischer Random)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text)', lineHeight: '1.6' }}>
                    Each game starts from a <strong style={{ color: 'var(--color-success)' }}>unique random position</strong> chosen from
                    960 possibilities. Opening theory doesn't apply — pure calculation and creativity win!
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    Custom time control & duration apply as usual.
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              {clubId && (
                <>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'var(--color-text)',
                    fontSize: '14px'
                  }}>
                    Club Visibility
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text)', fontSize: '14px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={linkToClub}
                      onChange={(e) => setLinkToClub(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                    />
                    Show in this club's Featured Club Events
                  </label>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                    Turn this off to create a private/outside-club tournament.
                  </div>
                </>
              )}

              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Tournament Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                placeholder="My Arena Tournament"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Time Control and Duration — hidden for Marathon (fixed at 2+1 → 3+2, 1h30m) */}
            {!isMarathon && (
            <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Time Control (Minutes) *
              </label>
              <select
                name="timeControlMinutes"
                value={formData.timeControlMinutes}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2367e8f9' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  backgroundSize: '20px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="1" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>1 min</option>
                <option value="3" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>3 min</option>
                <option value="5" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>5 min</option>
                <option value="10" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>10 min</option>
                <option value="15" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>15 min</option>
                <option value="20" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>20 min</option>
                <option value="30" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>30 min</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Time Control (Seconds)
              </label>
              <input
                type="number"
                name="timeControlSeconds"
                value={formData.timeControlSeconds}
                onChange={handleChange}
                min="0"
                max="59"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Tournament Duration
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '13px', 
                    color: 'var(--color-text-muted)',
                    fontWeight: '500'
                  }}>
                    Hours
                  </label>
                  <input
                    type="number"
                    name="tournamentDurationHours"
                    value={formData.tournamentDurationHours}
                    onChange={handleChange}
                    min="0"
                    max="12"
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'var(--color-black-a35)',
                      border: '1px solid var(--color-white-a10)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      color: 'var(--color-text)',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-accent)';
                      e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-white-a10)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '13px', 
                    color: 'var(--color-text-muted)',
                    fontWeight: '500'
                  }}>
                    Minutes *
                  </label>
                  <input
                    type="number"
                    name="tournamentDurationMinutes"
                    value={formData.tournamentDurationMinutes}
                    onChange={handleChange}
                    min="10"
                    max="59"
                    required={!isMarathon}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'var(--color-black-a35)',
                      border: '1px solid var(--color-white-a10)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      color: 'var(--color-text)',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-accent)';
                      e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-white-a10)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            </> )} {/* end !isMarathon */}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Scheduled Start Date *
              </label>
              <input
                type="date"
                name="scheduledStartDate"
                value={formData.scheduledStartDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Scheduled Start Time *
              </label>
              <input
                type="time"
                name="scheduledStartTime"
                value={formData.scheduledStartTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <small style={{ 
                color: 'var(--color-accent)', 
                fontSize: '13px',
                display: 'block',
                marginTop: '8px',
                fontWeight: '500'
              }}>
                Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </small>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-black-a35)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  resize: 'vertical',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Describe your tournament..."
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-accent-a12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate('/arenatournament')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--color-white-a04)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-white-a10)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--color-danger-a12)';
                  e.target.style.borderColor = 'var(--color-danger-a30)';
                  e.target.style.color = 'var(--color-danger)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--color-white-a04)';
                  e.target.style.borderColor = 'var(--color-white-a10)';
                  e.target.style.color = 'var(--color-text)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: loading ? 'rgba(107, 114, 128, 0.3)' : 'var(--color-accent-a15)',
                  color: loading ? 'var(--color-text-muted)' : 'var(--color-accent)',
                  border: loading ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid var(--color-accent-a30)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = 'var(--color-accent-a20)';
                    e.target.style.boxShadow = '0 12px 40px var(--color-accent-a30)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = 'var(--color-accent-a15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <span style={{ position: 'relative', zIndex: 2 }}>Creating...</span>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent, var(--color-accent-a20), transparent)',
                      animation: 'shimmer 1.5s infinite'
                    }} />
                  </>
                ) : 'Create Tournament'}
              </button>
            </div>
          </form>
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
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        input::placeholder,
        textarea::placeholder {
          color: rgba(156, 163, 175, 0.6);
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8) sepia(1) saturate(5) hue-rotate(160deg);
          cursor: pointer;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
