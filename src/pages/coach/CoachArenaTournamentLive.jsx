// pages/coach/CoachArenaTournamentLive.jsx
// Coach's spectator view of a PRIVATE class Arena Tournament. NO live board
// streaming (cost) — the coach sees the lobby (who joined), the live leaderboard,
// current pairings, finished games (replay after each ends), a results banner
// when done, and the tournament chat with their students.
//
// It joins the tournament-<id> socket room LISTEN-ONLY and never subscribes to
// per-move events (arenaTournamentMove). All live updates come from the small
// game-started / game-ended / leaderboard events already broadcast to the room.
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import './CoachDashboard.css';

export default function CoachArenaTournamentLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [games, setGames] = useState([]);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now()); // ticks every second for countdowns
  const chatEndRef = useRef(null);

  // ── Data loaders ──
  const loadLobby = async () => {
    try {
      const r = await api.get(`/api/coach-arena/tournaments/${id}/lobby`);
      setTournament(r.data?.tournament || null);
      setParticipants(r.data?.participants || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this tournament.');
    }
  };
  const loadLeaderboard = async () => {
    try {
      const r = await api.get(`/api/arenatournament/leaderboard/${id}`);
      setLeaderboard(r.data?.leaderboard || []);
      if (r.data?.tournament) setTournament(prev => ({ ...(prev || {}), ...r.data.tournament }));
    } catch { /* ignore */ }
  };
  const loadGames = async () => {
    try {
      const r = await api.get(`/api/arenatournament/${id}/games`);
      setGames(r.data?.games || []);
    } catch { /* ignore */ }
  };
  const loadChat = async () => {
    try {
      const r = await api.get(`/api/arenatournament/${id}/chat`);
      setChat(r.data?.messages || []);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    (async () => {
      await loadLobby();
      await Promise.all([loadLeaderboard(), loadGames(), loadChat()]);
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [id]);

  // ── Socket (listen-only; NO per-move events) ──
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('joinArenaTournamentLobby', { tournamentId: id });

    const onLeaderboard = () => loadLeaderboard();
    const onGameStarted = () => loadGames();       // new pairing appears
    const onGameEnded = () => { loadGames(); loadLeaderboard(); }; // pairing resolves + replay available
    const onStarted = () => { loadLobby(); loadLeaderboard(); };
    const onEnded = () => { loadLobby(); loadLeaderboard(); loadGames(); };
    const onJoined = () => loadLobby();
    const onChat = (msg) => setChat(prev => [...prev, msg]);
    const onReconnect = () => socket.emit('joinArenaTournamentLobby', { tournamentId: id });

    socket.on('tournamentLeaderboardUpdate', onLeaderboard);
    socket.on('arenaTournamentGameStarted', onGameStarted);
    socket.on('arenaTournamentGameEnded', onGameEnded);
    socket.on('tournamentStarted', onStarted);
    socket.on('tournamentEnded', onEnded);
    socket.on('participantJoined', onJoined);
    socket.on('arenaTournamentChatMessage', onChat);
    socket.on('connect', onReconnect);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId: id });
      socket.off('tournamentLeaderboardUpdate', onLeaderboard);
      socket.off('arenaTournamentGameStarted', onGameStarted);
      socket.off('arenaTournamentGameEnded', onGameEnded);
      socket.off('tournamentStarted', onStarted);
      socket.off('tournamentEnded', onEnded);
      socket.off('participantJoined', onJoined);
      socket.off('arenaTournamentChatMessage', onChat);
      socket.off('connect', onReconnect);
    };
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // 1-second tick so the start/end countdowns update live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sendChat = (e) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    socket.emit('sendArenaTournamentChatMessage', { tournamentId: id, message: msg });
    setChatInput('');
  };

  if (loading) return <div className="coach-loading">Loading tournament…</div>;
  if (error) return (
    <div className="coach-dash">
      <div className="coach-error">⚠️ {error}</div>
      <Link to="/coach/activities" className="btn-ghost">← Back to activities</Link>
    </div>
  );

  const status = tournament?.status;
  const notStarted = status === 'scheduled' || status === 'lobby';
  const isFinished = status === 'finished';
  // The API already returns students only (filler players are filtered server-side).
  const humans = participants;
  const activeGames = games.filter(g => g.status === 'active');
  const finishedGames = games.filter(g => g.status === 'finished');

  const resultLabel = (g) => g.result === 'white_won' ? '1–0' : g.result === 'black_won' ? '0–1' : g.result === 'draw' ? '½–½' : '—';

  // Countdown: "starts in" before start, "ends in" while running. Uses a live
  // `now` tick. End = actualStartTime + duration (falls back to endTime).
  const fmtCountdown = (ms) => {
    if (ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
    return `${sec}s`;
  };
  const startMs = tournament?.scheduledStartTime ? new Date(tournament.scheduledStartTime).getTime() : null;
  const durationMs = tournament?.tournamentDuration
    ? ((tournament.tournamentDuration.hours || 0) * 60 + (tournament.tournamentDuration.minutes || 0)) * 60000
    : 0;
  const actualStartMs = tournament?.actualStartTime ? new Date(tournament.actualStartTime).getTime() : null;
  const endMs = tournament?.endTime
    ? new Date(tournament.endTime).getTime()
    : (actualStartMs && durationMs ? actualStartMs + durationMs : null);

  let countdown = null;
  if (notStarted && startMs && startMs > now) {
    countdown = { label: 'Starts in', value: fmtCountdown(startMs - now), color: '#fcd34d' };
  } else if (status === 'active' && endMs) {
    countdown = { label: 'Ends in', value: fmtCountdown(Math.max(0, endMs - now)), color: endMs - now < 120000 ? '#f87171' : '#6ee7b7' };
  }

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>🏆 {tournament?.name || 'Class Tournament'}</h1>
          <p className="coach-dash-sub">
            {isFinished ? '✅ Finished' : status === 'active' ? '🔴 Live' : '⏳ Not started'}
            {countdown && (
              <> · <strong style={{ color: countdown.color }}>⏱ {countdown.label} {countdown.value}</strong></>
            )}
            {' · '}{humans.length} student{humans.length === 1 ? '' : 's'} joined
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => { loadLobby(); loadLeaderboard(); loadGames(); }}>↻ Refresh</button>
          <Link to="/coach/activities" className="btn-ghost">← Activities</Link>
        </div>
      </div>

      {isFinished && (
        <div className="coach-trial-banner paid" style={{ marginBottom: 20 }}>
          <div><strong>🏁 Tournament finished</strong> · final standings below. You can replay every game.</div>
        </div>
      )}

      {/* ── Lobby (before start): who has joined ── */}
      {notStarted && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>Lobby · {humans.length} joined</h2></div>
          {startMs && (
            <p className="coach-dash-sub" style={{ margin: '-6px 0 12px' }}>
              Scheduled to start {new Date(startMs).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              {startMs > now && <> · <strong style={{ color: '#fcd34d' }}>in {fmtCountdown(startMs - now)}</strong></>}
            </p>
          )}
          {humans.length === 0 ? (
            <div className="coach-empty">Waiting for your students to join from their Activities tab…</div>
          ) : (
            <div className="coach-students-grid">
              {humans.map(p => (
                <div key={p.userId} className="coach-student-card">
                  <div className="coach-student-name">{p.displayName || p.username}</div>
                  <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>Ready</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leaderboard ── */}
      {!notStarted && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>{isFinished ? 'Final standings' : 'Live leaderboard'}</h2></div>
          {leaderboard.length === 0 ? (
            <div className="coach-empty">No scores yet.</div>
          ) : (
            <div className="coach-students-table-wrap">
              <table className="coach-students-table">
                <thead>
                  <tr>
                    <th className="cst-player">#</th>
                    <th className="cst-player">Student</th>
                    <th className="cst-num">Score</th>
                    <th className="cst-num">Rating</th>
                    <th className="cst-num">W</th>
                    <th className="cst-num">L</th>
                    <th className="cst-num">D</th>
                    <th className="cst-num">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p, i) => {
                    const chg = p.tournamentRatingChange || 0;
                    return (
                    <tr key={p.userId || i}>
                      <td className="cst-player">{i + 1}</td>
                      <td className="cst-player">{p.displayName || p.username}</td>
                      <td className="cst-num"><strong>{p.score || 0}</strong></td>
                      <td className="cst-num">
                        {p.tournamentRating ?? '—'}
                        {chg !== 0 && (
                          <span style={{ color: chg > 0 ? '#6ee7b7' : '#f87171', fontSize: 11, marginLeft: 3 }}>
                            {chg > 0 ? `+${chg}` : chg}
                          </span>
                        )}
                      </td>
                      <td className="cst-num" style={{ color: '#6ee7b7' }}>{p.wins || 0}</td>
                      <td className="cst-num" style={{ color: '#f87171' }}>{p.losses || 0}</td>
                      <td className="cst-num">{p.draws || 0}</td>
                      <td className="cst-num">{p.gamesPlayed || 0}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Pairings (current active games) ── */}
      {status === 'active' && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>Now playing · {activeGames.length}</h2></div>
          {activeGames.length === 0 ? (
            <div className="coach-empty">No games in progress right now.</div>
          ) : (
            <div className="coach-students-grid">
              {activeGames.map(g => (
                <div key={g._id} className="coach-student-card">
                  <div style={{ fontSize: 13 }}>
                    ♟ {g.whitePlayerDisplayName || g.whitePlayerUsername}
                    <span style={{ color: 'rgba(226,232,240,0.5)' }}> vs </span>
                    {g.blackPlayerDisplayName || g.blackPlayerUsername}
                  </div>
                  <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 4 }}>{g.movesCount} moves · in progress</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Finished games (replay after each ends) ── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>Finished games · {finishedGames.length}</h2></div>
        {finishedGames.length === 0 ? (
          <div className="coach-empty">Completed games will appear here to replay, move by move.</div>
        ) : (
          <div className="coach-students-grid">
            {finishedGames.map(g => (
              <div key={g._id} className="coach-student-card">
                <div style={{ fontSize: 13 }}>
                  {g.whitePlayerDisplayName || g.whitePlayerUsername}
                  <span style={{ color: 'rgba(226,232,240,0.5)' }}> vs </span>
                  {g.blackPlayerDisplayName || g.blackPlayerUsername}
                </div>
                <div style={{ fontSize: 13, color: '#a78bfa', margin: '4px 0 8px' }}>
                  {resultLabel(g)} · {g.movesCount} moves
                </div>
                <button className="btn-ghost" onClick={() => navigate(`/arenatournament/games/${id}`)}>
                  ▶ Replay games
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat ── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>Tournament chat</h2></div>
        <div style={{ background: 'rgba(20,20,28,0.7)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 14, padding: 12 }}>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {chat.length === 0 ? (
              <div style={{ color: 'rgba(226,232,240,0.5)', fontSize: 13, padding: 8 }}>No messages yet. Say hello to your class 👋</div>
            ) : chat.map(m => (
              <div key={m._id} style={{ fontSize: 13 }}>
                <strong style={{ color: '#67e8f9' }}>{m.displayName}:</strong>{' '}
                <span style={{ color: '#e2e8f0' }}>{m.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} style={{ display: 'flex', gap: 8 }}>
            <input
              className="csf-input"
              style={{ flex: 1 }}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Message your students…"
              maxLength={100}
            />
            <button type="submit" className="btn-primary" disabled={!chatInput.trim()}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
