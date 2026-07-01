import React, { useState, useEffect, useContext, useRef } from 'react';
import PlayerName from '../../components/PlayerName';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket-jwt';
import api from '../../api';
import TournamentChat from '../../components/TournamentChat';
import { AuthContext } from '../../contexts/AuthContext';
import './ArenaTournamentLobby.css';

const CROWN_TIERS = {
  gold:     { emoji: '👑', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', glow: '0 0 8px rgba(245,158,11,0.6)', label: 'Gold Crown' },
  platinum: { emoji: '👑', color: '#e2e8f0', bg: 'rgba(226,232,240,0.12)', border: 'rgba(226,232,240,0.45)', glow: '0 0 10px rgba(226,232,240,0.5)', label: 'Platinum Crown' },
  gem:      { emoji: '💎', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.5)', glow: '0 0 10px rgba(96,165,250,0.6)', label: 'Gem Crown' },
};

function CrownBadge({ tier }) {
  const c = CROWN_TIERS[tier];
  if (!c) return null;
  return (
    <span
      title={c.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 6px', borderRadius: '999px',
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '600', position: 'relative', zIndex: 1, textAlign: 'center', background: 'rgba(23, 23, 23, 0.7)', padding: '40px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', color: '#06b6d4' }}>⏳</div>
          Loading tournament...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', padding: '40px', maxWidth: '500px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px', fontSize: '28px', fontWeight: '700' }}>Error</h2>
          <p style={{ color: '#fca5a5', marginBottom: '30px', fontSize: '16px' }}>{error}</p>
          <button
            onClick={() => navigate('/arenatournament')}
            style={{ padding: '14px 28px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(6, 182, 212, 0.25)'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(6, 182, 212, 0.15)'; e.target.style.transform = 'translateY(0)'; }}
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
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: 'linear-gradient(145deg, #111827, #0d1117)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 0 60px rgba(168,85,247,0.25), 0 24px 64px rgba(0,0,0,0.6)', position: 'relative' }}>
            <button onClick={() => { setShowTeamPicker(false); setSelectedTeamId(null); }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(107,114,128,0.2)', border: '1px solid rgba(107,114,128,0.3)', color: '#9ca3af', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>

            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>⚔️</span>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Choose Your Team</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>Pick a team to join the battle</div>
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
                    style={{ padding: '14px', borderRadius: '14px', border: isSelected ? `2px solid ${team.color}` : `1px solid ${team.color}44`, background: isSelected ? `${team.color}1f` : `${team.color}0a`, cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.4 : 1, transition: 'all 0.18s', boxShadow: isSelected ? `0 0 20px ${team.color}44` : 'none', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: team.color, boxShadow: `0 0 8px ${team.color}`, flexShrink: 0 }} />
                      <span style={{ fontWeight: '800', color: team.color, fontSize: '14px', lineHeight: 1.2 }}>{team.teamName}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', marginBottom: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((count / 30) * 100, 100)}%`, background: isFull ? '#ef4444' : team.color, borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: isFull ? '#ef4444' : '#9ca3af', fontWeight: isFull ? '700' : '400' }}>
                      {isFull ? '🔒 Full' : `${count} / 30 players`}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTeamId && (() => {
              const t = tournament.teams.find(t => t.teamId === selectedTeamId);
              return t ? (
                <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: `${t.color}15`, border: `1px solid ${t.color}44`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color }} />
                  <span style={{ fontSize: '13px', color: '#d1d5db' }}>Joining as <strong style={{ color: t.color }}>{t.teamName}</strong></span>
                </div>
              ) : null;
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowTeamPicker(false); setSelectedTeamId(null); }} style={{ padding: '12px 22px', background: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.25)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
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
                style={{ flex: 1, padding: '12px 22px', background: (!selectedTeamId || joining) ? 'rgba(107,114,128,0.2)' : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(139,92,246,0.5))', color: (!selectedTeamId || joining) ? '#6b7280' : '#fff', border: (!selectedTeamId || joining) ? '1px solid rgba(107,114,128,0.2)' : '1px solid rgba(168,85,247,0.5)', borderRadius: '10px', fontSize: '15px', fontWeight: '800', cursor: (!selectedTeamId || joining) ? 'not-allowed' : 'pointer', boxShadow: (selectedTeamId && !joining) ? '0 0 20px rgba(168,85,247,0.35)' : 'none', transition: 'all 0.2s' }}
              >
                {joining ? '⏳ Joining...' : selectedTeamId ? `⚔️ Join ${tournament.teams.find(t => t.teamId === selectedTeamId)?.teamName}` : 'Select a Team First'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {earlyBirdToast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.5)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease' }}>
          <span style={{ fontSize: '22px' }}>🐦</span>
          Early Bird Bonus! <span style={{ color: '#1a1a1a' }}>+3 points</span> for joining early!
        </div>
      )}
      {carryBonusToast > 0 && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(124,58,237,0.5)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease' }}>
          <span style={{ fontSize: '22px' }}>🎁</span>
          Carry Bonus Applied! <span style={{ color: '#ddd6fe' }}>+{carryBonusToast} pts</span> from previous tournament!
        </div>
      )}
      {carryExpiredToast && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: 'linear-gradient(135deg, #374151, #1f2937)', color: '#fff', fontWeight: '700', fontSize: '16px', padding: '14px 28px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInDown 0.3s ease', border: '1px solid rgba(255,255,255,0.1)' }}>
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
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>⚔️ Team Battle · {tournament.teamCount} teams</span>
            )}
            {tournament?.tournamentType === 'chess960' && (
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🎲 Chess960 — Random Positions</span>
            )}
            {tournament?.tournamentType === 'bullet_blitz_marathon' && (
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ Bullet Blitz Marathon</span>
            )}
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
            <div className="at-lobby-stats-grid">
              <div>
                <div style={{ color: '#9ca3af', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Time Control</div>
                {tournament?.tournamentType === 'bullet_blitz_marathon' ? (
                  <div>
                    <span style={{ color: '#f59e0b', fontSize: '18px', fontWeight: '700' }}>⚡ Marathon</span>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      <span style={{ color: '#ef4444' }}>45 mins:</span> 2+1 &nbsp;→&nbsp; <span style={{ color: '#06b6d4' }}>45 mins:</span> 3+2
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#06b6d4', fontSize: '20px', fontWeight: '700' }}>
                    {tournament?.timeControl.minutes}+{tournament?.timeControl.increment || 0}
                  </span>
                )}
              </div>
              <div>
                <div style={{ color: '#9ca3af', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Duration</div>
                <span style={{ color: '#10b981', fontSize: '20px', fontWeight: '700' }}>
                  {tournament?.tournamentDuration.hours > 0 && `${tournament?.tournamentDuration.hours}h `}
                  {tournament?.tournamentDuration.minutes}min
                </span>
              </div>
              <div>
                <div style={{ color: '#9ca3af', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Participants</div>
                <span style={{ color: '#8b5cf6', fontSize: '20px', fontWeight: '700' }}>{participants.length}</span>
              </div>
              <div>
                <div style={{ color: '#9ca3af', display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>Join Code</div>
                <span style={{ color: '#67e8f9', fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '2px' }}>{tournament?.joinCode}</span>
              </div>
            </div>
          </div>

          {tournament?.status === 'scheduled' && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.2)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: '#fbbf24', display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>Tournament starts in</div>
              <div style={{ color: '#fbbf24', fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{timeUntilStart}</div>
              <div style={{ color: '#fde68a', fontSize: '14px', fontWeight: '500' }}>{formatDate(tournament?.scheduledStartTime)}</div>
            </div>
          )}

          {tournament?.status === 'active' && timeUntilEnd && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: '#10b981', display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>Tournament ends in</div>
              <div style={{ color: '#10b981', fontSize: '28px', fontWeight: '800' }}>{timeUntilEnd}</div>
            </div>
          )}

          {isCreator && !tournament?.isAutoScheduled && (tournament?.status === 'scheduled' || tournament?.status === 'lobby' || (tournament?.status === 'active' && !tournament?.actualStartTime)) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: '#fbbf24', fontSize: '15px' }}>
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
                style={{ width: '100%', padding: '18px', background: starting ? 'rgba(107, 114, 128, 0.3)' : 'rgba(6, 182, 212, 0.15)', color: starting ? '#9ca3af' : '#06b6d4', border: starting ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', fontSize: '18px', fontWeight: '700', cursor: starting ? 'not-allowed' : 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => { if (!starting) { e.target.style.background = 'rgba(6, 182, 212, 0.25)'; e.target.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={(e) => { if (!starting) { e.target.style.background = 'rgba(6, 182, 212, 0.15)'; e.target.style.transform = 'translateY(0)'; } }}
              >
                {starting ? 'Starting...' : 'Start Tournament Now'}
              </button>
            </div>
          )}

          {tournament?.status === 'active' && myParticipant && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', marginBottom: '12px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: '#10b981', fontSize: '15px' }}>🏆 Tournament is live! Click below to join the action.</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/arenatournament')}
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(6,182,212,0.15)'; e.target.style.borderColor = 'rgba(6,182,212,0.3)'; e.target.style.color = '#67e8f9'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
                >
                  ← Leave Lobby
                </button>
                <button
                  onClick={() => navigate(`/arenatournament/live/${tournamentId}`)}
                  style={{ flex: 1, padding: '14px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(16,185,129,0.25)'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(16,185,129,0.15)'; e.target.style.transform = 'translateY(0)'; }}
                >
                  🎯 Go to Live Tournament
                </button>
              </div>
            </div>
          )}

          {!myParticipant && tournament?.status !== 'finished' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '12px', marginBottom: '12px', textAlign: 'center', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <strong style={{ color: '#06b6d4', fontSize: '15px' }}>👋 You are viewing this tournament. Join now to participate!</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/arenatournament')}
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(6,182,212,0.15)'; e.target.style.borderColor = 'rgba(6,182,212,0.3)'; e.target.style.color = '#67e8f9'; e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
                >
                  ← Leave Lobby
                </button>
                <button
                  onClick={handleJoinTournament}
                  disabled={joining}
                  style={{ flex: 1, padding: '14px', background: joining ? 'rgba(107,114,128,0.3)' : 'rgba(6,182,212,0.15)', color: joining ? '#9ca3af' : '#06b6d4', border: joining ? '1px solid rgba(107,114,128,0.2)' : '1px solid rgba(6,182,212,0.3)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: joining ? 'not-allowed' : 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                  onMouseEnter={(e) => { if (!joining) { e.target.style.background = 'rgba(6,182,212,0.25)'; e.target.style.transform = 'translateY(-2px)'; } }}
                  onMouseLeave={(e) => { if (!joining) { e.target.style.background = 'rgba(6,182,212,0.15)'; e.target.style.transform = 'translateY(0)'; } }}
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
                    borderRadius: '14px',
                    padding: '16px 18px',
                    overflow: 'hidden',
                    boxShadow: isMyTeam ? `0 0 14px ${team.color}33` : 'none'
                  }}>
                    {/* top accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: team.color, borderRadius: '14px 14px 0 0', opacity: 0.8 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, boxShadow: `0 0 8px ${team.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: '15px', fontWeight: '800', color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.teamName}</span>
                      {isMyTeam && <span style={{ fontSize: '10px', fontWeight: '700', color: team.color, background: `${team.color}22`, border: `1px solid ${team.color}55`, borderRadius: '6px', padding: '1px 6px', flexShrink: 0 }}>You</span>}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#e2e8f0', lineHeight: 1, marginBottom: '2px' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>player{count !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {tournament?.description && (
            <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ color: '#9ca3af', display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Description</div>
              <p style={{ color: '#d1d5db', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>"{tournament.description}"</p>
            </div>
          )}
        </div>

        <div className="at-lobby-grid">
          {/* Participants List */}
          <div className="at-lobby-participants">
            {/* ── Header ── */}
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #06b6d4, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Players</span>
                <span style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', borderRadius: '20px', padding: '2px 12px', fontSize: '14px', fontWeight: '700', WebkitTextFillColor: '#06b6d4' }}>{participants.length}</span>
              </h2>
              {participants.length > 0 && (
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                  {participants.length > PAGE_SIZE
                    ? `${participantPage * PAGE_SIZE + 1}–${Math.min((participantPage + 1) * PAGE_SIZE, participants.length)} of ${participants.length}`
                    : `${participants.length} joined`}
                </span>
              )}
            </div>

            {/* ── Empty state ── */}
            {participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 24px', color: '#64748b' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>👤</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>No players yet</div>
                <div style={{ fontSize: '13px', color: '#475569' }}>Share the join code to invite players</div>
              </div>
            ) : (
              <div>
                {/* Column header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: tournament?.tournamentType === 'team_battle' ? '36px 1fr auto' : '36px 1fr',
                  gap: '0 10px',
                  padding: '9px 24px',
                  background: 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '11px', fontWeight: '700', color: '#475569',
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
                  const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];
                  const rankBgs   = ['rgba(245,158,11,0.18)', 'rgba(148,163,184,0.12)', 'rgba(180,83,9,0.18)'];
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
                          ? 'rgba(6,182,212,0.1)'
                          : crown ? crown.bg
                          : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)',
                        borderLeft: isMe
                          ? '3px solid #06b6d4'
                          : crown ? `3px solid ${crown.border}`
                          : p.teamColor ? `3px solid ${p.teamColor}`
                          : '3px solid transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = crown ? crown.bg : 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(6,182,212,0.1)' : crown ? crown.bg : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)'; }}
                    >
                      {/* Rank */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {globalIndex < 3 ? (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: rankBgs[globalIndex], border: `1px solid ${rankColors[globalIndex]}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: rankColors[globalIndex], flexShrink: 0 }}>
                            {globalIndex + 1}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155', width: '22px', textAlign: 'center' }}>{globalIndex + 1}</span>
                        )}
                      </div>

                      {/* Player info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        {/* Online dot */}
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: isOnline ? '#10b981' : 'transparent', border: isOnline ? 'none' : '1px solid #334155', boxShadow: isOnline ? '0 0 6px #10b981' : 'none' }} title={isOnline ? 'Online' : 'Offline'} />
                        {/* Crown emoji */}
                        {crown && (
                          <span title={crown.label} style={{ fontSize: '14px', flexShrink: 0, filter: `drop-shadow(0 0 4px ${crown.color})` }}>{crown.emoji}</span>
                        )}
                        {/* Name */}
                        <span style={{
                          fontSize: '15px', fontWeight: crown ? '700' : isMe ? '700' : '500',
                          color: crown ? crown.color : isMe ? '#67e8f9' : '#e2e8f0',
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
                                color: crown ? crown.color : isMe ? '#67e8f9' : '#e2e8f0',
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
                          <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '700', background: 'rgba(6,182,212,0.18)', border: '1px solid rgba(6,182,212,0.35)', padding: '2px 7px', borderRadius: '8px', flexShrink: 0, letterSpacing: '0.02em' }}>you</span>
                        )}
                        {p.earlyBirdBonus && <span title="Early Bird +3 pts" style={{ fontSize: '13px', flexShrink: 0 }}>🐦</span>}
                        {p.carryBonusApplied > 0 && <span title={`Carry Bonus +${p.carryBonusApplied} pts`} style={{ fontSize: '13px', flexShrink: 0 }}>🎁</span>}
                      </div>

                      {/* Team badge */}
                      {tournament?.tournamentType === 'team_battle' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {p.teamColor ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '10px', background: `${p.teamColor}18`, border: `1px solid ${p.teamColor}44`, fontSize: '12px', fontWeight: '700', color: p.teamColor, whiteSpace: 'nowrap' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.teamColor, flexShrink: 0 }} />
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                      <button
                        onClick={() => setParticipantPage(p => Math.max(0, p - 1))}
                        disabled={participantPage === 0}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: participantPage === 0 ? '#1e293b' : '#94a3b8', border: '1px solid transparent', borderRadius: '8px', cursor: participantPage === 0 ? 'default' : 'pointer', fontWeight: '700', fontSize: '18px', lineHeight: 1 }}
                      >‹</button>
                      {pages.map(pg => (
                        <button
                          key={pg}
                          onClick={() => setParticipantPage(pg)}
                          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pg === participantPage ? 'rgba(6,182,212,0.2)' : 'transparent', color: pg === participantPage ? '#06b6d4' : '#64748b', border: pg === participantPage ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: pg === participantPage ? '800' : '500', fontSize: '14px' }}
                        >{pg + 1}</button>
                      ))}
                      <button
                        onClick={() => setParticipantPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={participantPage === totalPages - 1}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: participantPage === totalPages - 1 ? '#1e293b' : '#94a3b8', border: '1px solid transparent', borderRadius: '8px', cursor: participantPage === totalPages - 1 ? 'default' : 'pointer', fontWeight: '700', fontSize: '18px', lineHeight: 1 }}
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
            style={{ flex: 1, padding: '16px', background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(6, 182, 212, 0.15)'; e.target.style.borderColor = 'rgba(6, 182, 212, 0.3)'; e.target.style.color = '#67e8f9'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
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
