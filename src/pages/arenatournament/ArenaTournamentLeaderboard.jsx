import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import socket from '../../socket-jwt';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import PlayerName from '../../components/PlayerName';
import './ArenaTournamentLeaderboard.css';

const CROWN_TIERS = {
  gold:     { emoji: '👑', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', glow: '0 0 8px rgba(245,158,11,0.6)', label: 'Gold Crown' },
  platinum: { emoji: '👑', color: '#e2e8f0', bg: 'rgba(226,232,240,0.12)', border: 'rgba(226,232,240,0.45)', glow: '0 0 10px rgba(226,232,240,0.5)', label: 'Platinum Crown' },
  gem:      { emoji: '💎', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.5)', glow: '0 0 10px rgba(96,165,250,0.6)', label: 'Gem Crown' },
};

function containsBlockedLink(text) {
  if (!text) return false;
  return /(?:https?:\/\/|www\.|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+(?:\/\S*)?)/i.test(text);
}

function CrownBadge({ tier, size = 'sm' }) {
  const c = CROWN_TIERS[tier];
  if (!c) return null;
  const pad = size === 'lg' ? '3px 9px' : '2px 6px';
  const fs  = size === 'lg' ? '13px' : '11px';
  return (
    <span
      title={c.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: pad, borderRadius: '999px',
        background: c.bg, border: `1px solid ${c.border}`,
        boxShadow: c.glow, color: c.color,
        fontSize: fs, fontWeight: '700', lineHeight: 1,
        verticalAlign: 'middle', flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {c.emoji} {c.label}
    </span>
  );
}

export default function ArenaTournamentLeaderboard() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const user = auth?.user || null;

  // Coach assignment tie-in: the student may have arrived here from a coach's
  // "play this tournament" assignment. We learn the assignment id either from
  // the URL (?assignment=) or from the stash set when they joined (keyed by
  // tournament id). When present + the tournament has ended, we show a
  // "Submit assignment" button powered by mySummary below.
  const assignmentId = searchParams.get('assignment')
    || (() => { try { return sessionStorage.getItem(`assignmentForTournament:${tournamentId}`) || ''; } catch { return ''; } })();
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignDone, setAssignDone] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [assignError, setAssignError] = useState('');

  const [tournament, setTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myRank, setMyRank] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [mySummary, setMySummary] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    
    if (!socket.connected) {
      socket.connect();
    } else {
    }

    loadLeaderboard();
    loadChatMessages();
    loadMySummary();

    socket.emit('joinArenaTournamentLobby', { tournamentId });

    // Rejoin tournament lobby on reconnection (socket.on('connect') fires on both initial connect and reconnect in Socket.IO v4)
    const handleReconnect = () => {
      socket.emit('joinArenaTournamentLobby', { tournamentId });
    };
    socket.on('connect', handleReconnect);

    socket.on('tournamentLobbyJoined', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    socket.on('tournamentOnlineStatus', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    socket.on('tournamentLeaderboardUpdate', () => {
      loadLeaderboard();
    });

    socket.on('tournamentEnded', (data) => {
      loadLeaderboard();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 10000);
    });

    const handleChatMessage = (data) => {
      setChatMessages(prev => {
        // Avoid duplicate messages
        if (prev.some(m => String(m._id) === String(data._id))) return prev;
        return [...prev, data];
      });
    };
    socket.on('arenaTournamentChatMessage', handleChatMessage);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('tournamentOnlineStatus');
      socket.off('tournamentLeaderboardUpdate');
      socket.off('tournamentEnded');
      socket.off('connect', handleReconnect);
      socket.off('arenaTournamentChatMessage', handleChatMessage);
    };
  }, [tournamentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadLeaderboard = async () => {
    try {
      const response = await api.get(`/api/arenatournament/leaderboard/${tournamentId}`);
      
      setTournament(response.data.tournament);
      setLeaderboard(response.data.leaderboard);
      if (response.data.teamLeaderboard) setTeamLeaderboard(response.data.teamLeaderboard);
      
      const userId = user?.id || user?._id;
      const myIndex = response.data.leaderboard.findIndex(p => String(p.userId) === String(userId));
      if (myIndex !== -1) {
        const rank = myIndex + 1;
        setMyRank(rank);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };



  const loadChatMessages = async () => {
    if (!user) return; // guests don't see chat
    try {
      const response = await api.get(`/api/arenatournament/${tournamentId}/chat`);
      const apiMessages = response.data.messages || [];
      // Merge with any socket-received messages, dedup by _id
      setChatMessages(prev => {
        const apiIds = new Set(apiMessages.map(m => String(m._id)));
        const socketOnly = prev.filter(m => !apiIds.has(String(m._id)));
        return [...apiMessages, ...socketOnly].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    } catch (err) {
    }
  };

  const loadMySummary = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await api.get(`/api/arenatournament/${tournamentId}/my-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMySummary(response.data);
    } catch {
      // not a participant or tournament not found — silently ignore
    }
  };

  const sendMessage = () => {
    const text = newMessage.trim();
    if (text && user && !containsBlockedLink(text)) {
      socket.emit('sendArenaTournamentChatMessage', {
        tournamentId,
        message: text,
        username: user.username || user.displayName
      });
      setNewMessage('');
    }
  };

  const submitAssignment = async () => {
    if (!assignmentId || assignSubmitting || assignDone) return;
    setAssignError('');
    setAssignSubmitting(true);
    try {
      // The server pulls the authoritative participant row itself; we just tell
      // it which tournament (covers code-only assignments with no pinned id).
      const res = await api.post(`/api/coach/my-assignments/${assignmentId}/submit-tournament`, { tournamentId });
      setAssignResult(res.data || null);
      setAssignDone(true);
      try { sessionStorage.removeItem(`assignmentForTournament:${tournamentId}`); } catch { /* ignore */ }
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Could not submit. Make sure you played in this tournament.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const hasBlockedLink = containsBlockedLink(newMessage);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  if (loading) {
    return (
      <div className="tournament-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading tournament...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournament-error">
        <div className="error-content">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/arenatournament')} className="error-back-btn">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="tournament-leaderboard-container">
      {showConfetti && <Confetti />}
      
      {/* Back Button */}
      <button onClick={() => navigate('/arenatournament')} className="back-to-tournaments">
        ← Back to Tournaments
      </button>

      <div className="tournament-content">
        {/* Left Side - 30% */}
        <div className="tournament-left">
          {/* Tournament Details Card */}
          <div className="tournament-details-card">
            <h3 className="details-title">Tournament Details</h3>
            <div className="detail-item">
              <span className="detail-label">Name</span>
              <span className="detail-value">{tournament?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`detail-value status-${tournament?.status}`}>
                {tournament?.status?.toUpperCase()}
              </span>
            </div>
            {tournament?.endTime && (
              <div className="detail-item">
                <span className="detail-label">Ended</span>
                <span className="detail-value">{formatDate(tournament.endTime)}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Participants</span>
              <span className="detail-value">{leaderboard.length}</span>
            </div>
            <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span className="detail-label">Tournament Games</span>
              <button
                onClick={() => navigate(`/arenatournament/games/${tournamentId}`)}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Show Games
              </button>
            </div>
            {tournament?.tournamentType && tournament.tournamentType !== 'standard' && (
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">
                  {tournament.tournamentType === 'team_battle' && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>⚔️ Team Battle</span>}
                  {tournament.tournamentType === 'chess960' && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🎲 Chess960</span>}
                  {tournament.tournamentType === 'bullet_blitz_marathon' && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ Marathon</span>}
                </span>
              </div>
            )}
          </div>

          {/* Chat Card — visible to logged-in users only */}
          {user ? (
          <div className="tournament-chat-card">
            <h3 className="chat-title">Tournament Chat</h3>
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <div className="chat-empty">No messages yet. Start the conversation!</div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={String(msg._id) || idx} className="chat-message">
                    <span className="chat-username">{msg.displayName || msg.username || 'Anonymous'}:</span>
                    <span className="chat-text">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="chat-input"
              />
              <button onClick={sendMessage} className="chat-send-btn" disabled={!newMessage.trim() || hasBlockedLink}>
                Send
              </button>
            </div>
            {hasBlockedLink && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                Links are not allowed in chat messages.
              </div>
            )}
          </div>
          ) : (
          <div className="tournament-chat-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>💬</div>
            <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <a href="/login" style={{ color: '#f59e0b', fontWeight: '700' }}>Log in</a> to join the tournament chat.
            </div>
          </div>
          )}
        </div>

        {/* Right Side - 70% */}
        <div className="tournament-right">
          {/* Tournament Name Header */}
          <h1 className="tournament-name-header">{tournament?.name}</h1>

          {/* Podium — team trophies for team_battle, individual trophies otherwise */}
          {tournament?.tournamentType === 'team_battle' ? (
            <div className="podium-container">
              {/* Silver — 2nd team */}
              {teamLeaderboard[1] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenasecond.png" alt="2nd Place Trophy" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: teamLeaderboard[1].color, fontWeight: '800', fontSize: '17px', textShadow: `0 0 12px ${teamLeaderboard[1].color}88` }}>
                      {teamLeaderboard[1].teamName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{teamLeaderboard[1].memberCount} players</span>
                  </div>
                  <div className="trophy-score">{teamLeaderboard[1].totalScore} pts</div>
                </div>
              )}
              {/* Gold — 1st team */}
              {teamLeaderboard[0] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenafirst.png" alt="1st Place Trophy" style={{ width: '210px', height: '210px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: teamLeaderboard[0].color, fontWeight: '800', fontSize: '20px', textShadow: `0 0 14px ${teamLeaderboard[0].color}88` }}>
                      {teamLeaderboard[0].teamName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{teamLeaderboard[0].memberCount} players</span>
                  </div>
                  <div className="trophy-score">{teamLeaderboard[0].totalScore} pts</div>
                </div>
              )}
              {/* Bronze — 3rd team */}
              {teamLeaderboard[2] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenathird.png" alt="3rd Place Trophy" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: teamLeaderboard[2].color, fontWeight: '800', fontSize: '15px', textShadow: `0 0 10px ${teamLeaderboard[2].color}88` }}>
                      {teamLeaderboard[2].teamName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{teamLeaderboard[2].memberCount} players</span>
                  </div>
                  <div className="trophy-score">{teamLeaderboard[2].totalScore} pts</div>
                </div>
              )}
            </div>
          ) : (
            <div className="podium-container">
              {topThree[1] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenasecond.png" alt="2nd Place Trophy" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username">
                    <span style={{ color: CROWN_TIERS[topThree[1].crownTierAtJoin]?.color || 'inherit', fontWeight: CROWN_TIERS[topThree[1].crownTierAtJoin] ? '800' : 'inherit', textShadow: CROWN_TIERS[topThree[1].crownTierAtJoin] ? `0 0 10px ${CROWN_TIERS[topThree[1].crownTierAtJoin].color}66` : 'none' }}><PlayerName displayName={topThree[1].displayName} username={topThree[1].username} userId={topThree[1].userId} /></span>
                    {String(topThree[1].userId) === String(user?.id || user?._id) && <span className="you-badge-trophy">You</span>}
                    <div style={{ marginTop: '4px' }}><CrownBadge tier={topThree[1].crownTierAtJoin} size="lg" /></div>
                  </div>
                  <div className="trophy-score">{topThree[1].score} pts</div>
                </div>
              )}
              {topThree[0] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenafirst.png" alt="1st Place Trophy" style={{ width: '210px', height: '210px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username">
                    <span style={{ color: CROWN_TIERS[topThree[0].crownTierAtJoin]?.color || 'inherit', fontWeight: CROWN_TIERS[topThree[0].crownTierAtJoin] ? '800' : 'inherit', textShadow: CROWN_TIERS[topThree[0].crownTierAtJoin] ? `0 0 10px ${CROWN_TIERS[topThree[0].crownTierAtJoin].color}66` : 'none' }}><PlayerName displayName={topThree[0].displayName} username={topThree[0].username} userId={topThree[0].userId} /></span>
                    {String(topThree[0].userId) === String(user?.id || user?._id) && <span className="you-badge-trophy">You</span>}
                    <div style={{ marginTop: '4px' }}><CrownBadge tier={topThree[0].crownTierAtJoin} size="lg" /></div>
                  </div>
                  <div className="trophy-score">{topThree[0].score} pts</div>
                </div>
              )}
              {topThree[2] && (
                <div className="trophy-item">
                  <div className="trophy-icon">
                    <img src="/arenatrophies/arenathird.png" alt="3rd Place Trophy" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                  </div>
                  <div className="trophy-username">
                    <span style={{ color: CROWN_TIERS[topThree[2].crownTierAtJoin]?.color || 'inherit', fontWeight: CROWN_TIERS[topThree[2].crownTierAtJoin] ? '800' : 'inherit', textShadow: CROWN_TIERS[topThree[2].crownTierAtJoin] ? `0 0 10px ${CROWN_TIERS[topThree[2].crownTierAtJoin].color}66` : 'none' }}><PlayerName displayName={topThree[2].displayName} username={topThree[2].username} userId={topThree[2].userId} /></span>
                    {String(topThree[2].userId) === String(user?.id || user?._id) && <span className="you-badge-trophy">You</span>}
                    <div style={{ marginTop: '4px' }}><CrownBadge tier={topThree[2].crownTierAtJoin} size="lg" /></div>
                  </div>
                  <div className="trophy-score">{topThree[2].score} pts</div>
                </div>
              )}
            </div>
          )}

          {/* Coach assignment submit card — only for students who came here from
              a coach's "play this tournament" assignment and actually played. */}
          {assignmentId && mySummary && (
            <div style={{ marginBottom: '24px', padding: '20px 24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(168,85,247,0.08) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#a855f7', marginBottom: '10px' }}>🏆 Coach Assignment</h3>
              {assignDone ? (
                <div style={{ color: '#10b981', fontWeight: '700', fontSize: '15px' }}>
                  ✓ Assignment submitted to your coach!
                  {assignResult && (
                    <div style={{ color: '#9ca3af', fontWeight: '500', fontSize: '13px', marginTop: '6px' }}>
                      {assignResult.score} pts · {assignResult.wins}W-{assignResult.losses}L-{assignResult.draws}D · {assignResult.gamesPlayed} games{assignResult.rank > 0 ? ` · rank #${assignResult.rank}` : ''}
                      {assignResult.allMet ? ' · 🎯 all goals met!' : ''}
                    </div>
                  )}
                </div>
              ) : tournament?.status === 'finished' ? (
                <>
                  <div style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '12px' }}>
                    This tournament has ended. Submit your result to complete the assignment.
                  </div>
                  <button
                    onClick={submitAssignment}
                    disabled={assignSubmitting}
                    style={{
                      padding: '12px 22px', borderRadius: '12px', border: 'none',
                      background: assignSubmitting ? 'rgba(107,114,128,0.4)' : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                      color: '#fff', fontWeight: '700', fontSize: '15px',
                      cursor: assignSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {assignSubmitting ? 'Submitting…' : '✅ Submit assignment to coach'}
                  </button>
                  {assignError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px' }}>{assignError}</div>}
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Keep playing! You can submit this assignment from here once the tournament ends.
                </div>
              )}
            </div>
          )}

          {/* Personal Summary Card */}
          {mySummary && (
            <div style={{ marginBottom: '24px', padding: '20px 24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4', marginBottom: '14px', letterSpacing: '0.5px' }}>📊 Your Summary — {mySummary.tournamentName || tournament?.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Score', value: mySummary.score, color: '#06b6d4' },
                  { label: 'Games', value: mySummary.gamesPlayed, color: '#ffffff' },
                  { label: 'Wins', value: mySummary.wins, color: '#10b981' },
                  { label: 'Losses', value: mySummary.losses, color: '#ef4444' },
                  { label: 'Draws', value: mySummary.draws, color: '#fbbf24' },
                  { label: 'Best Streak', value: mySummary.maxStreak, color: '#f97316', suffix: '🔥' },
                  { label: 'Total Moves', value: mySummary.totalMovesPlayed, color: '#a78bfa' },
                  { label: 'Rank', value: myRank ? `#${myRank}` : '—', color: '#fbbf24' }
                ].map(({ label, value, color, suffix }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}{suffix || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full team standings table (team_battle — shows all teams including 4th+) */}
          {tournament?.tournamentType === 'team_battle' && teamLeaderboard.length > 0 && (
            <div className="leaderboard-table-container">
              <h3 className="team-standings-title">⚔️ Team — Final Standings</h3>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                    <th>Team</th>
                    <th style={{ textAlign: 'center' }}>Players</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeaderboard.map((team, i) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <tr key={team.teamId} className={i === 0 ? 'team-row-first' : ''}>
                        <td className="rank-cell">{medals[i] || i + 1}</td>
                        <td className="player-cell">
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: team.color, boxShadow: `0 0 8px ${team.color}`, flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: team.color }}>{team.teamName}</span>
                        </td>
                        <td style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>{team.memberCount}</td>
                        <td className="score-cell" style={{ textAlign: 'right' }}>{team.totalScore}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th style={{ textAlign: 'left' }}>Player</th>
                  {tournament?.tournamentType === 'team_battle' && <th>Team</th>}
                  <th style={{ textAlign: 'center' }}>Rating</th>
                  <th>W</th>
                  <th>L</th>
                  <th>D</th>
                  <th>Games</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((participant, index) => {
                  const rank = index + 1;
                  const userId = user?.id || user?._id;
                  const isMe = String(participant.userId) === String(userId);
                  const medal = getMedalEmoji(rank);

                  return (
                    <tr key={participant._id} className={isMe ? 'table-row-me' : ''}>
                      <td className="rank-cell">
                        {medal || rank}
                      </td>
                      <td className="player-cell">
                        {onlineUserIds.includes(participant.userId) && (
                          <span className="online-dot-small" title="Online" />
                        )}
                        <span style={{ color: CROWN_TIERS[participant.crownTierAtJoin]?.color || 'inherit', fontWeight: CROWN_TIERS[participant.crownTierAtJoin] ? '700' : 'inherit', textShadow: CROWN_TIERS[participant.crownTierAtJoin] ? `0 0 8px ${CROWN_TIERS[participant.crownTierAtJoin].color}55` : 'none' }}><PlayerName displayName={participant.displayName} username={participant.username} userId={participant.userId} /></span>
                        {isMe && <span className="you-badge-small">You</span>}
                        <CrownBadge tier={participant.crownTierAtJoin} />
                      </td>
                      {tournament?.tournamentType === 'team_battle' && (
                        <td style={{ textAlign: 'center' }}>
                          {participant.teamColor ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: `${participant.teamColor}22`, border: `1px solid ${participant.teamColor}55`, fontSize: '12px', fontWeight: '600', color: participant.teamColor, whiteSpace: 'nowrap' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: participant.teamColor, display: 'inline-block' }} />
                              {participant.teamName}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{participant.tournamentRating ?? 1200}</td>
                      <td className="win-cell">{participant.wins}</td>
                      <td className="loss-cell">{participant.losses}</td>
                      <td className="draw-cell">{participant.draws}</td>
                      <td className="games-cell">{participant.gamesPlayed}</td>
                      <td className="score-cell">{participant.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



// Confetti Component
function Confetti() {
  const confettiCount = 100;
  const confettiElements = [];

  for (let i = 0; i < confettiCount; i++) {
    const style = {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 2}s`,
      backgroundColor: ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 6)]
    };
    confettiElements.push(<div key={i} className="confetti-piece" style={style} />);
  }

  return <div className="confetti-container">{confettiElements}</div>;
}
