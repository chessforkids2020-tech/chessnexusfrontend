import React, { useState, useEffect, useContext, useRef } from 'react';
import PlayerName from '../../components/PlayerName';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket-jwt';
import api from '../../api';
import TournamentChat from '../../components/TournamentChat';
import { AuthContext } from '../../contexts/AuthContext';
import './ArenaTournamentLobby.css';

const CROWN_TIERS = {
  gold:     { emoji: '👑', color: 'var(--color-warning)', bg: 'var(--color-warning-a12)', border: 'rgba(245,158,11,0.5)', glow: '0 0 8px rgba(245,158,11,0.6)', label: 'Gold Crown' },
  platinum: { emoji: '👑', color: 'var(--color-text)', bg: 'rgba(226,232,240,0.12)', border: 'var(--color-text-faint)', glow: '0 0 10px var(--color-text-faint)', label: 'Platinum Crown' },
  gem:      { emoji: '💎', color: 'var(--color-accent-2)', bg: 'var(--color-accent-2-a15)', border: 'rgba(96,165,250,0.5)', glow: '0 0 10px rgba(96,165,250,0.6)', label: 'Gem Crown' },
};

function CrownBadge({ tier }) {
  const c = CROWN_TIERS[tier];
  if (!c) return null;
  return (
    <span
      title={c.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 6px', borderRadius: 'var(--radius-pill)',
        background: c.bg, border: `1px solid ${c.border}`,
        boxShadow: c.glow, color: c.color,
        fontSize: '11px', fontWeight: '700', lineHeight: 1,
        verticalAlign: 'middle', flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {c.emoji} {c.label}
    </span>
  );
}

// kept for arena status card only
const getCrownStyle = (tier) => CROWN_TIERS[tier] || null;

export default function ArenaTournamentLobby() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myParticipant, setMyParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [timeUntilEnd, setTimeUntilEnd] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [earlyBirdToast, setEarlyBirdToast] = useState(false);
  const [carryBonusToast, setCarryBonusToast] = useState(0);
  const [carryExpiredToast, setCarryExpiredToast] = useState(false);
  const [participantPage, setParticipantPage] = useState(0);
  const PAGE_SIZE = 10;
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamCounts, setTeamCounts] = useState({});
  // Ref to always hold latest loadTournamentData — prevents stale-closure bug in socket handlers
  const loadTournamentDataRef = useRef(null);
  // Ref mirroring the latest tournament so the 1s countdown interval reads live
  // status/actualStartTime/endTime (not the value captured when the effect ran).
  const tournamentRef = useRef(null);
  useEffect(() => { tournamentRef.current = tournament; }, [tournament]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    loadTournamentData();
    socket.emit('joinArenaTournamentLobby', { tournamentId });

    // Rejoin tournament lobby on reconnection (socket.on('connect') fires on both initial connect and reconnect in Socket.IO v4)
    const handleReconnect = () => {
      socket.emit('joinArenaTournamentLobby', { tournamentId });
    };
    socket.on('connect', handleReconnect);

    socket.on('tournamentLobbyJoined', (data) => {
      setTournament(data.tournament);
      setParticipants(data.participants);
      setMyParticipant(data.myParticipant);
      setOnlineUserIds(data.onlineUserIds || []);
      const userId = user?.id || user?._id;
      setIsCreator(data.tournament.creatorId === userId);
      setLoading(false);
    });

    socket.on('participantJoined', () => { loadTournamentDataRef.current?.(); });
    socket.on('tournamentStarted', () => { navigate(`/arenatournament/live/${tournamentId}`); });
    socket.on('tournamentError', (data) => { setError(data.message); setLoading(false); });
    socket.on('tournamentOnlineStatus', (data) => { setOnlineUserIds(data.onlineUserIds || []); });
    socket.on('tournamentDeleted', (data) => {
      alert(data?.message || 'This tournament was deleted by an admin.');
      navigate('/arenatournament');
    });

    const interval = setInterval(() => {
      if (tournament?.scheduledStartTime) {
        const diff = new Date(tournament.scheduledStartTime).getTime() - Date.now();
        if (diff <= 0) {
          setTimeUntilStart('Starting soon...');
          if (tournament.status === 'scheduled' && isCreator && !starting) {
            handleStartTournament();
          }
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeUntilStart(`${hours}h ${minutes}m ${seconds}s`);
        }
      }

      // "Ends in" countdown while the tournament is active. End = endTime if the
      // server has set it, otherwise (start + configured duration). Read from the
      // ref so live status/start/end are used, not the stale captured value.
      const liveT = tournamentRef.current;
      if (liveT?.status === 'active') {
        let endMs = liveT.endTime ? new Date(liveT.endTime).getTime() : null;
        if (!endMs) {
          const startBase = liveT.actualStartTime || liveT.scheduledStartTime;
          const dur = liveT.tournamentDuration;
          if (startBase && dur) {
            const durMs = ((dur.hours || 0) * 60 + (dur.minutes || 0)) * 60 * 1000;
            endMs = new Date(startBase).getTime() + durMs;
          }
        }
        if (endMs) {
          const eDiff = endMs - Date.now();
          if (eDiff <= 0) {
            setTimeUntilEnd('Ending soon...');
          } else {
            const h = Math.floor(eDiff / (1000 * 60 * 60));
            const m = Math.floor((eDiff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((eDiff % (1000 * 60)) / 1000);
            setTimeUntilEnd(`${h}h ${m}m ${s}s`);
          }
        } else {
          setTimeUntilEnd('');
        }
      }
    }, 1000);

    const statusCheckInterval = setInterval(() => { loadTournamentData(); }, 30000);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('participantJoined');
      socket.off('tournamentStarted');
      socket.off('tournamentError');
      socket.off('tournamentOnlineStatus');
      socket.off('connect', handleReconnect);
      socket.off('tournamentDeleted');
      clearInterval(interval);
      clearInterval(statusCheckInterval);
    };
  }, [tournamentId, tournament?.scheduledStartTime]);

  const loadTournamentData = async () => {
    try {
      const response = await api.get(`/api/arenatournament/details/${tournamentId}`);
      if (response.status === 304 || !response.data || !response.data.tournament) {
        setLoading(false);
        return;
      }
      setTournament(response.data.tournament);
      setParticipants(response.data.participants || []);
      const userId = user?.id || user?._id;
      const myP = (response.data.participants || []).find(p => String(p.userId) === String(userId));
      setMyParticipant(myP);
      setIsCreator(response.data.tournament.creatorId === userId);

      const tournament = response.data.tournament;
      if (tournament.status === 'scheduled' && new Date(tournament.scheduledStartTime) < new Date()) {
        if (tournament.creatorId === userId) { handleStartTournament(); }
      }
      if (tournament.status === 'finished') {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        setLoading(false);
        return;
      }
      if (tournament.endTime && new Date(tournament.endTime) < new Date()) {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        setLoading(false);
        return;
      }
      setLoading(false);
      return response.data.tournament;
    } catch (err) {
      setError('Failed to load tournament');
      setLoading(false);
      return null;
    }
  };
  // Keep ref up-to-date every render so socket handlers never use stale closure
  loadTournamentDataRef.current = loadTournamentData;

  const handleStartTournament = () => {
    setStarting(true);
    socket.emit('startArenaTournament', { tournamentId });
  };

  const openTeamPicker = async () => {
    setShowTeamPicker(true);
    setSelectedTeamId(null);
    try {
      const lb = await api.get(`/api/arenatournament/leaderboard/${tournamentId}`);
      const counts = {};
      if (lb.data.teamLeaderboard) {
        lb.data.teamLeaderboard.forEach(t => { counts[t.teamId] = t.memberCount; });
      }
      setTeamCounts(counts);
    } catch { setTeamCounts({}); }
  };

  const handleJoinTournament = async () => {
    if (tournament?.tournamentType === 'team_battle') { openTeamPicker(); return; }
    setJoining(true);
    setError('');
    try {
      const response = await api.post('/api/arenatournament/join', { tournamentId });
      if (response.data.success) {
        if (response.data.earlyBirdBonus) { setEarlyBirdToast(true); setTimeout(() => setEarlyBirdToast(false), 4000); }
        if (response.data.carryBonusApplied > 0) { setCarryBonusToast(response.data.carryBonusApplied); setTimeout(() => setCarryBonusToast(0), 4000); }
        if (response.data.carryExpired) { setCarryExpiredToast(true); setTimeout(() => setCarryExpiredToast(false), 4000); }
        const latestTournament = await loadTournamentData();
        socket.emit('joinArenaTournamentLobby', { tournamentId });
        // If tournament is already live, navigate immediately (no waiting for button)
        if (latestTournament?.status === 'active') {
          navigate(`/arenatournament/live/${tournamentId}`);
          return;
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join tournament');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, var(--color-accent-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a12) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ color: 'var(--color-text)', fontSize: '24px', fontWeight: '600', position: 'relative', zIndex: 1, textAlign: 'center', background: 'var(--color-surface)', padding: '40px', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-white-a04)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 20px 40px var(--color-black-a50)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', color: 'var(--color-accent)' }}>⏳</div>
          Loading tournament...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, var(--color-accent-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a12) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ background: 'var(--color-danger-a12)', borderRadius: 'var(--radius-2xl)', padding: '40px', maxWidth: '500px', textAlign: 'center', border: '1px solid var(--color-danger-a20)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px var(--color-black-a50)' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '20px', fontSize: '28px', fontWeight: '700' }}>Error</h2>
          <p style={{ color: 'var(--color-danger)', marginBottom: '30px', fontSize: '16px' }}>{error}</p>
          <button
            onClick={() => navigate('/arenatournament')}
            style={{ padding: '14px 28px', background: 'var(--color-accent-a15)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-a30)', borderRadius: 'var(--radius-lg)', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--color-accent-a20)'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.transform = 'translateY(0)'; }}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="at-lobby-page" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <div className="at-lobby-bg" />

      {/* ── Team Picker Modal ── */}
      {showTeamPicker && tournament?.tournamentType === 'team_battle' && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowTeamPicker(false); setSelectedTeamId(null); } }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--color-black-a65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: 'linear-gradient(145deg, #111827, #0d1117)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 'var(--radius-2xl)', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 0 60px rgba(168,85,247,0.25), 0 24px 64px var(--color-black-a65)', position: 'relative' }}>
            <button onClick={() => { setShowTeamPicker(false); setSelectedTeamId(null); }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(107,114,128,0.2)', border: '1px solid rgba(107,114,128,0.3)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>

            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>⚔️</span>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text)' }}>Choose Your Team</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Pick a team to join the battle</div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(168,85,247,0.2)', margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {(tournament.teams || []).map(team => {
                const count = teamCounts[team.teamId] || 0;
                const isFull = count >= 30;
                const isSelected = selectedTeamId === team.teamId;
                return (
                  <div
                    key={team.teamId}
                    onClick={() => !isFull && setSelectedTeamId(team.teamId)}
                    style={{ padding: '14px', borderRadius: 'var(--radius-lg)', border: isSelected ? `2px solid ${team.color}` : `1px solid ${team.color}44`, background: isSelected ? `${team.color}1f` : `${team.color}0a`, cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.4 : 1, transition: 'all 0.18s', boxShadow: isSelected ? `0 0 20px ${team.color}44` : 'none', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '13px', height: '13px', borderRadius: 'var(--radius-circle)', background: team.color, boxShadow: `0 0 8px ${team.color}`, flexShrink: 0 }} />
                      <span style={{ fontWeight: '800', color: team.color, fontSize: '14px', lineHeight: 1.2 }}>{team.teamName}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: 'var(--radius-pill)', background: 'var(--color-white-a07)', marginBottom: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((count / 30) * 100, 100)}%`, background: isFull ? 'var(--color-danger)' : team.color, borderRadius: 'var(--radius-pill)', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: isFull ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: isFull ? '700' : '400' }}>
                      {isFull ? '🔒 Full' : `${count} / 30 players`}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTeamId && (() => {
              const t = tournament.teams.find(t => t.teamId === selectedTeamId);
              return t ? (
                <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: `${t.color}15`, border: `1px solid ${t.color}44`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-circle)', background: t.color }} />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Joining as <strong style={{ color: t.color }}>{t.teamName}</strong></span>
                </div>
              ) : null;
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowTeamPicker(false); setSelectedTeamId(null); }} style={{ padding: '12px 22px', background: 'rgba(107,114,128,0.15)', color: 'var(--color-text-muted)', border: '1px solid rgba(107,114,128,0.25)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedTeamId || joining) return;
                  setJoining(true);
                  setError('');
                  try {
                    const response = await api.post('/api/arenatournament/join', { tournamentId, teamId: selectedTeamId });
                    if (response.data.success) {
                      setShowTeamPicker(false);
                      setSelectedTeamId(null);
                      if (response.data.earlyBirdBonus) { setEarlyBirdToast(true); setTimeout(() => setEarlyBirdToast(false), 4000); }
                      if (response.data.carryBonusApplied > 0) { setCarryBonusToast(response.data.carryBonusApplied); setTimeout(() => setCarryBonusToast(0), 4000); }
                      if (response.data.carryExpired) { setCarryExpiredToast(true); setTimeout(() => setCarryExpiredToast(false), 4000); }
                      const latestTournamentTeam = await loadTournamentData();
                      socket.emit('joinArenaTournamentLobby', { tournamentId });
                      if (latestTournamentTeam?.status === 'active') {
                        navigate(`/arenatournament/live/${tournamentId}`);
                        return;
                      }
                    }
                  } catch (err) {
                    setError(err.response?.data?.error || 'Failed to join tournament');
                  } finally {
                    setJoining(false);
                  }
                }}
                disabled={!selectedTeamId || joining}
                style={{ flex: 1, padding: '12px 22px', background: (!selectedTeamId || joining) ? 'rgba(107,114,128,0.2)' : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(139,92,246,0.5))', color: (!selectedTeamId || joining) ? 'var(--color-text-faint)' : 'var(--color-text)', border: (!selectedTeamId || joining) ? '1px solid rgba(107,114,128,0.2)' : '1px solid rgba(168,85,247,0.5)', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: '800', cursor: (!selectedTeamId || joining) ? 'not-allowed' : 'pointer', boxShadow: (selectedTeamId && !joining) ? '0 0 20px rgba(168,85,247,0.35)' : 'none', transition: 'all 0.2s' }}
              >
                {joining ? '⏳ Joining...' : selectedTeamId ? `⚔️ Join ${tournament.teams.find(t => t.teamId === selectedTeamId)?.teamName}` : 'Select a Team First'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {earlyBirdToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg, var(--color-warning), #d97706)', color: 'var(--color-bg)', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: 'var(--radius-xl)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.5)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease' }}>
          <span style={{ fontSize: '22px' }}>🐦</span>
          Early Bird Bonus! <span style={{ color: 'var(--color-surface)' }}>+3 points</span> for joining early!
        </div>
      )}
      {carryBonusToast > 0 && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: 'linear-gradient(135deg, var(--color-accent-2), #4f46e5)', color: 'var(--color-text)', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: 'var(--radius-xl)', boxShadow: '0 8px 32px rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease' }}>
          <span style={{ fontSize: '22px' }}>🎁</span>
          Carry Bonus Applied! <span style={{ color: '#ddd6fe' }}>+{carryBonusToast} pts</span> from previous tournament!
        </div>
      )}
      {carryExpiredToast && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: 'linear-gradient(135deg, var(--color-text-faint), #1f2937)', color: 'var(--color-text)', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: 'var(--radius-xl)', boxShadow: '0 8px 32px var(--color-black-a50)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease', border: '1px solid var(--color-white-a10)' }}>
          <span style={{ fontSize: '22px' }}>⚠️</span>
          Your carry bonus has expired!
        </div>
      )}

      <div className="at-lobby-inner">
        {/* Tournament Header Card */}
        <div className="at-lobby-header">
          <h1 className="at-lobby-title">{tournament?.name}</h1>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {tournament?.tournamentType === 'team_battle' && (
              <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-2xl)', fontSize: '12px', fontWeight: '700', background: 'rgba(168,85,247,0.15)', color: 'var(--color-accent-2)', border: '1px solid rgba(168,85,247,0.3)' }}>⚔️ Team Battle · {tournament.teamCount} teams</span>
            )}
            {tournament?.tournamentType === 'chess960' && (
              <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-2xl)', fontSize: '12px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', border: '1px solid rgba(34,197,94,0.3)' }}>🎲 Chess960 — Random Positions</span>
            )}
            {tournament?.tournamentType === 'bullet_blitz_marathon' && (
              <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-2xl)', fontSize: '12px', fontWeight: '700', background: 'var(--color-warning-a12)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-a30)' }}>⚡ Bullet Blitz Marathon</span>
            )}
          </div>

          <div style={{ background: 'var(--color-black-a35)', borderRadius: 'var(--radius-xl)', padding: '20px', marginBottom: '20px', border: '1px solid var(--color-white-a04)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
            <div className="at-lobby-stats-grid">
              <div>
                <div style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Time Control</div>
                {tournament?.tournamentType === 'bullet_blitz_marathon' ? (
                  <div>
                    <span style={{ color: 'var(--color-warning)', fontSize: '18px', fontWeight: '700' }}>⚡ Marathon</span>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--color-danger)' }}>45 mins:</span> 2+1 &nbsp;→&nbsp; <span style={{ color: 'var(--color-accent)' }}>45 mins:</span> 3+2
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-accent)', fontSize: '20px', fontWeight: '700' }}>
                    {tournament?.timeControl.minutes}+{tournament?.timeControl.increment || 0}
                  </span>
                )}
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Duration</div>
                <span style={{ color: 'var(--color-success)', fontSize: '20px', fontWeight: '700' }}>
                  {tournament?.tournamentDuration.hours > 0 && `${tournament?.tournamentDuration.hours}h `}
                  {tournament?.tournamentDuration.minutes}min
                </span>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Participants</div>
                <span style={{ color: 'var(--color-accent-2)', fontSize: '20px', fontWeight: '700' }}>{participants.length}</span>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Join Code</div>
                <span style={{ color: 'var(--color-accent)', fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '2px' }}>{tournament?.joinCode}</span>
              </div>
            </div>
          </div>

          {tournament?.status === 'scheduled' && (
            <div style={{ background: 'var(--color-warning-a12)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px', textAlign: 'center', border: '1px solid var(--color-warning-a20)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: 'var(--color-warning)', display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>Tournament starts in</div>
              <div style={{ color: 'var(--color-warning)', fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{timeUntilStart}</div>
              <div style={{ color: 'var(--color-warning)', fontSize: '14px', fontWeight: '500' }}>{formatDate(tournament?.scheduledStartTime)}</div>
            </div>
          )}

          {tournament?.status === 'active' && timeUntilEnd && (
            <div style={{ background: 'var(--color-success-a12)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px', textAlign: 'center', border: '1px solid var(--color-success-a20)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: 'var(--color-success)', display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>Tournament ends in</div>
              <div style={{ color: 'var(--color-success)', fontSize: '28px', fontWeight: '800' }}>{timeUntilEnd}</div>
            </div>
          )}

          {isCreator && !tournament?.isAutoScheduled && (tournament?.status === 'scheduled' || tournament?.status === 'lobby' || (tournament?.status === 'active' && !tournament?.actualStartTime)) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--color-warning-a12)', border: '1px solid var(--color-warning-a20)', borderRadius: 'var(--radius-lg)', marginBottom: '16px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: 'var(--color-warning)', fontSize: '15px' }}>
                  {tournament?.status === 'lobby'
                    ? 'Tournament is ready to start! Click to begin the tournament.'
                    : tournament?.status === 'active'
                      ? "Tournament is active but hasn't started yet. Click to start now."
                      : new Date(tournament?.scheduledStartTime) < new Date()
                        ? "The tournament should have started automatically. If it hasn't, you can start it manually."
                        : 'The tournament will start automatically at the scheduled time, or you can start it early.'}
                </strong>
              </div>
              <button
                onClick={handleStartTournament}
                disabled={starting}
                style={{ width: '100%', padding: '18px', background: starting ? 'rgba(107, 114, 128, 0.3)' : 'var(--color-accent-a15)', color: starting ? 'var(--color-text-muted)' : 'var(--color-accent)', border: starting ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid var(--color-accent-a30)', borderRadius: 'var(--radius-lg)', fontSize: '18px', fontWeight: '700', cursor: starting ? 'not-allowed' : 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => { if (!starting) { e.target.style.background = 'var(--color-accent-a20)'; e.target.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={(e) => { if (!starting) { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.transform = 'translateY(0)'; } }}
              >
                {starting ? 'Starting...' : 'Start Tournament Now'}
              </button>
            </div>
          )}

          {tournament?.status === 'active' && myParticipant && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a20)', borderRadius: 'var(--radius-lg)', marginBottom: '12px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: 'var(--color-success)', fontSize: '15px' }}>🏆 Tournament is live! Click below to join the action.</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/arenatournament')}
                  style={{ flex: 1, padding: '14px', background: 'var(--color-white-a04)', color: 'var(--color-text)', border: '1px solid var(--color-white-a10)', borderRadius: 'var(--radius-lg)', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.borderColor = 'var(--color-accent-a30)'; e.target.style.color = 'var(--color-accent)'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'var(--color-white-a04)'; e.target.style.borderColor = 'var(--color-white-a10)'; e.target.style.color = 'var(--color-text)'; e.target.style.transform = 'translateY(0)'; }}
                >
                  ← Leave Lobby
                </button>
                <button
                  onClick={() => navigate(`/arenatournament/live/${tournamentId}`)}
                  style={{ flex: 1, padding: '14px', background: 'var(--color-success-a12)', color: 'var(--color-success)', border: '1px solid var(--color-success-a30)', borderRadius: 'var(--radius-lg)', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--color-success-a20)'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'var(--color-success-a12)'; e.target.style.transform = 'translateY(0)'; }}
                >
                  🎯 Go to Live Tournament
                </button>
              </div>
            </div>
          )}

          {!myParticipant && tournament?.status !== 'finished' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--color-accent-a12)', border: '1px solid var(--color-accent-a20)', borderRadius: 'var(--radius-lg)', marginBottom: '12px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: 'var(--color-accent)', fontSize: '15px' }}>👋 You are viewing this tournament. Join now to participate!</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/arenatournament')}
                  style={{ flex: 1, padding: '14px', background: 'var(--color-white-a04)', color: 'var(--color-text)', border: '1px solid var(--color-white-a10)', borderRadius: 'var(--radius-lg)', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.borderColor = 'var(--color-accent-a30)'; e.target.style.color = 'var(--color-accent)'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'var(--color-white-a04)'; e.target.style.borderColor = 'var(--color-white-a10)'; e.target.style.color = 'var(--color-text)'; e.target.style.transform = 'translateY(0)'; }}
                >
                  ← Leave Lobby
                </button>
                <button
                  onClick={handleJoinTournament}
                  disabled={joining}
                  style={{ flex: 1, padding: '14px', background: joining ? 'rgba(107,114,128,0.3)' : 'var(--color-accent-a15)', color: joining ? 'var(--color-text-muted)' : 'var(--color-accent)', border: joining ? '1px solid rgba(107,114,128,0.2)' : '1px solid var(--color-accent-a30)', borderRadius: 'var(--radius-lg)', fontSize: '15px', fontWeight: '600', cursor: joining ? 'not-allowed' : 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { if (!joining) { e.target.style.background = 'var(--color-accent-a20)'; e.target.style.transform = 'translateY(-2px)'; } }}
                  onMouseLeave={(e) => { if (!joining) { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.transform = 'translateY(0)'; } }}
                >
                  {joining ? 'Joining...' : '🎯 Join Tournament'}
                </button>
              </div>
            </div>
          )}

          {tournament?.tournamentType === 'team_battle' && tournament.teams?.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {tournament.teams.map(team => {
                const count = participants.filter(p => p.teamId === team.teamId).length;
                const isMyTeam = myParticipant?.teamId === team.teamId;
                return (
                  <div key={team.teamId} style={{
                    position: 'relative',
                    background: `${team.color}0e`,
                    border: `1px solid ${team.color}40`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 18px',
                    overflow: 'hidden',
                    boxShadow: isMyTeam ? `0 0 14px ${team.color}33` : 'none'
                  }}>
                    {/* top accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: team.color, borderRadius: '14px 14px 0 0', opacity: 0.8 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: 'var(--radius-circle)', background: team.color, boxShadow: `0 0 8px ${team.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: '15px', fontWeight: '800', color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.teamName}</span>
                      {isMyTeam && <span style={{ fontSize: '10px', fontWeight: '700', color: team.color, background: `${team.color}22`, border: `1px solid ${team.color}55`, borderRadius: 'var(--radius-sm)', padding: '1px 6px', flexShrink: 0 }}>You</span>}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-text)', lineHeight: 1, marginBottom: '2px' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', fontWeight: '500' }}>player{count !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {tournament?.description && (
            <div style={{ padding: '20px', background: 'var(--color-black-a35)', borderRadius: 'var(--radius-lg)', marginBottom: '20px', border: '1px solid var(--color-white-a04)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Description</div>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>"{tournament.description}"</p>
            </div>
          )}
        </div>

        <div className="at-lobby-grid">
          {/* Participants List */}
          <div className="at-lobby-participants">
            {/* ── Header ── */}
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--color-white-a07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Players</span>
                <span style={{ background: 'var(--color-accent-a15)', border: '1px solid var(--color-accent-a30)', color: 'var(--color-accent)', borderRadius: 'var(--radius-2xl)', padding: '2px 12px', fontSize: '14px', fontWeight: '700', WebkitTextFillColor: 'var(--color-accent)' }}>{participants.length}</span>
              </h2>
              {participants.length > 0 && (
                <span style={{ fontSize: '13px', color: 'var(--color-text-faint)', fontWeight: '500' }}>
                  {participants.length > PAGE_SIZE
                    ? `${participantPage * PAGE_SIZE + 1}–${Math.min((participantPage + 1) * PAGE_SIZE, participants.length)} of ${participants.length}`
                    : `${participants.length} joined`}
                </span>
              )}
            </div>

            {/* ── Empty state ── */}
            {participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>👤</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>No players yet</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-faint)' }}>Share the join code to invite players</div>
              </div>
            ) : (
              <div>
                {/* Column header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: tournament?.tournamentType === 'team_battle' ? '36px 1fr auto' : '36px 1fr',
                  gap: '0 10px',
                  padding: '9px 24px',
                  background: 'var(--color-white-a04)',
                  borderBottom: '1px solid var(--color-white-a07)',
                  fontSize: '11px', fontWeight: '700', color: 'var(--color-text-faint)',
                  textTransform: 'uppercase', letterSpacing: '0.09em'
                }}>
                  <span style={{ textAlign: 'center' }}>#</span>
                  <span>Player</span>
                  {tournament?.tournamentType === 'team_battle' && <span>Team</span>}
                </div>

                {/* Rows */}
                {participants.slice(participantPage * PAGE_SIZE, (participantPage + 1) * PAGE_SIZE).map((p, idx) => {
                  const globalIndex = participantPage * PAGE_SIZE + idx;
                  const isMe = String(p.userId) === String(myParticipant?.userId);
                  const isOnline = onlineUserIds.includes(p.userId) || onlineUserIds.includes(String(p.userId));
                  const crown = CROWN_TIERS[p.crownTierAtJoin];
                  const rankColors = ['var(--color-warning)', 'var(--color-text-muted)', '#b45309'];
                  const rankBgs   = ['var(--color-warning-a20)', 'var(--color-border)', 'rgba(180,83,9,0.18)'];
                  return (
                    <div
                      key={p._id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: tournament?.tournamentType === 'team_battle' ? '36px 1fr auto' : '36px 1fr',
                        gap: '0 10px',
                        alignItems: 'center',
                        padding: '10px 24px',
                        background: isMe
                          ? 'var(--color-accent-a12)'
                          : crown ? crown.bg
                          : idx % 2 === 0 ? 'transparent' : 'var(--color-white-a04)',
                        borderLeft: isMe
                          ? '3px solid var(--color-accent)'
                          : crown ? `3px solid ${crown.border}`
                          : p.teamColor ? `3px solid ${p.teamColor}`
                          : '3px solid transparent',
                        borderBottom: '1px solid var(--color-white-a04)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = crown ? crown.bg : 'var(--color-white-a04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'var(--color-accent-a12)' : crown ? crown.bg : idx % 2 === 0 ? 'transparent' : 'var(--color-white-a04)'; }}
                    >
                      {/* Rank */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {globalIndex < 3 ? (
                          <div style={{ width: '22px', height: '22px', borderRadius: 'var(--radius-circle)', background: rankBgs[globalIndex], border: `1px solid ${rankColors[globalIndex]}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: rankColors[globalIndex], flexShrink: 0 }}>
                            {globalIndex + 1}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155', width: '22px', textAlign: 'center' }}>{globalIndex + 1}</span>
                        )}
                      </div>

                      {/* Player info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        {/* Online dot */}
                        <span style={{ width: '8px', height: '8px', borderRadius: 'var(--radius-circle)', flexShrink: 0, background: isOnline ? 'var(--color-success)' : 'transparent', border: isOnline ? 'none' : '1px solid #334155', boxShadow: isOnline ? '0 0 6px var(--color-success)' : 'none' }} title={isOnline ? 'Online' : 'Offline'} />
                        {/* Crown emoji */}
                        {crown && (
                          <span title={crown.label} style={{ fontSize: '14px', flexShrink: 0, filter: `drop-shadow(0 0 4px ${crown.color})` }}>{crown.emoji}</span>
                        )}
                        {/* Name */}
                        <span style={{
                          fontSize: '15px', fontWeight: crown ? '700' : isMe ? '700' : '500',
                          color: crown ? crown.color : isMe ? 'var(--color-accent)' : 'var(--color-text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          minWidth: 0, maxWidth: '100%',
                          textShadow: crown ? `0 0 10px ${crown.color}55` : 'none'
                        }}>
                          <PlayerName displayName={p.displayName} username={p.username} userId={p.userId} />
                        </span>
                        {/* Rating right beside the name (e.g. "cc 1200"), shown as
                            bright text to match the name. For a marathon it flips
                            bullet→blitz at phase 2. Blank for old rows. */}
                        {(() => {
                          // Chess960 has no rating — never show it in the lobby.
                          if (tournament?.tournamentType === 'chess960') return null;
                          const isMarathon = tournament?.tournamentType === 'bullet_blitz_marathon';
                          const inBlitzPhase = isMarathon && (tournament?.currentPhase ?? 0) >= 1;
                          const shown = isMarathon
                            ? (inBlitzPhase ? p.blitzRatingAtJoin : p.bulletRatingAtJoin)
                            : p.ratingAtJoin;
                          if (shown == null) return null;
                          const label = isMarathon
                            ? (inBlitzPhase ? 'Blitz rating when joined' : 'Bullet rating when joined')
                            : 'Rating when joined';
                          return (
                            <span
                              title={label}
                              style={{
                                fontSize: '14px', fontWeight: '700', flexShrink: 0,
                                color: crown ? crown.color : isMe ? 'var(--color-accent)' : 'var(--color-text)',
                                fontVariantNumeric: 'tabular-nums',
                                textShadow: crown ? `0 0 10px ${crown.color}55` : 'none'
                              }}
                            >
                              {shown}
                            </span>
                          );
                        })()}
                        {/* spacer pushes the tags to the right edge */}
                        <span style={{ flex: 1, minWidth: 0 }} />
                        {/* You tag */}
                        {isMe && (
                          <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: '700', background: 'var(--color-accent-a20)', border: '1px solid var(--color-accent-a30)', padding: '2px 7px', borderRadius: 'var(--radius-md)', flexShrink: 0, letterSpacing: '0.02em' }}>you</span>
                        )}
                        {p.earlyBirdBonus && <span title="Early Bird +3 pts" style={{ fontSize: '13px', flexShrink: 0 }}>🐦</span>}
                        {p.carryBonusApplied > 0 && <span title={`Carry Bonus +${p.carryBonusApplied} pts`} style={{ fontSize: '13px', flexShrink: 0 }}>🎁</span>}
                      </div>

                      {/* Team badge */}
                      {tournament?.tournamentType === 'team_battle' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {p.teamColor ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: 'var(--radius-md)', background: `${p.teamColor}18`, border: `1px solid ${p.teamColor}44`, fontSize: '12px', fontWeight: '700', color: p.teamColor, whiteSpace: 'nowrap' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: 'var(--radius-circle)', background: p.teamColor, flexShrink: 0 }} />
                              {p.teamName}
                            </span>
                          ) : <span style={{ fontSize: '13px', color: '#334155' }}>—</span>}
                        </div>
                      )}

                    </div>
                  );
                })}

                {/* ── Pagination — Lichess style ── */}
                {participants.length > PAGE_SIZE && (() => {
                  const totalPages = Math.ceil(participants.length / PAGE_SIZE);
                  const pages = Array.from({ length: totalPages }, (_, i) => i);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '14px 24px', borderTop: '1px solid var(--color-white-a07)', background: 'var(--color-black-a20)' }}>
                      <button
                        onClick={() => setParticipantPage(p => Math.max(0, p - 1))}
                        disabled={participantPage === 0}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: participantPage === 0 ? 'var(--color-surface-2)' : 'var(--color-text-muted)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', cursor: participantPage === 0 ? 'default' : 'pointer', fontWeight: '700', fontSize: '18px', lineHeight: 1 }}
                      >‹</button>
                      {pages.map(pg => (
                        <button
                          key={pg}
                          onClick={() => setParticipantPage(pg)}
                          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pg === participantPage ? 'var(--color-accent-a20)' : 'transparent', color: pg === participantPage ? 'var(--color-accent)' : 'var(--color-text-faint)', border: pg === participantPage ? '1px solid var(--color-accent-a40)' : '1px solid transparent', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: pg === participantPage ? '800' : '500', fontSize: '14px' }}
                        >{pg + 1}</button>
                      ))}
                      <button
                        onClick={() => setParticipantPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={participantPage === totalPages - 1}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: participantPage === totalPages - 1 ? 'var(--color-surface-2)' : 'var(--color-text-muted)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', cursor: participantPage === totalPages - 1 ? 'default' : 'pointer', fontWeight: '700', fontSize: '18px', lineHeight: 1 }}
                      >›</button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Chat */}
          {participants.length > 0 && (
            <div className="at-lobby-chat">
              <div style={{ flex: 1, minHeight: 0 }}>
                <TournamentChat tournamentId={tournamentId} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/arenatournament')}
            style={{ flex: 1, padding: '16px', background: 'var(--color-white-a04)', color: 'var(--color-text)', border: '1px solid var(--color-white-a10)', borderRadius: 'var(--radius-lg)', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--color-accent-a15)'; e.target.style.borderColor = 'var(--color-accent-a30)'; e.target.style.color = 'var(--color-accent)'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'var(--color-white-a04)'; e.target.style.borderColor = 'var(--color-white-a10)'; e.target.style.color = 'var(--color-text)'; e.target.style.transform = 'translateY(0)'; }}
          >
            ← Leave Lobby
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateX(-50%) translateY(-16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}
