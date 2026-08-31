// pages/coach/CoachArenaLive.jsx
// Coach's LIVE view of a private class arena race they created. Authorized by
// race ownership on the backend (/api/coach-arena) — this never touches the
// admin arena routes. Initial state comes from REST; live updates ride the same
// arena:<roomId> socket room the players use.
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import RoomCodeBadge, { joinLinkForCode } from '../../components/RoomCodeBadge';
import './CoachDashboard.css';

// Works BOTH as a route (/coach/arena/:roomId) and EMBEDDED inside the live class
// stage: pass `roomId` + `embedded` + `onBack` as props and it renders inline with a
// "back" affordance instead of a route <Link>. When used as a route, params drive it.
export default function CoachArenaLive({ roomId: roomIdProp, embedded = false, onBack, sessionId = null }) {
  const params = useParams();
  const roomId = roomIdProp || params.roomId;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [now, setNow] = useState(Date.now());   // ticks for the "starts in" countdown
  const [sentToClass, setSentToClass] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const tickRef = useRef(null);

  // Post the join link into class chat. Uses the SAME socket event the chat box
  // uses, so it arrives as a normal coach message — already clickable via
  // utils/linkify, and it opens in a new tab so the class tab stays connected.
  // Declared after the state above, which it reads.
  const sendLinkToClass = () => {
    const code = data?.roomId || roomId;
    if (!sessionId || !code) return;
    socket.emit('liveclass:chat', {
      sessionId,
      message: `🏁 Join the race: ${joinLinkForCode(code)}`,
    });
    setSentToClass(true);
    setTimeout(() => setSentToClass(false), 2500);
  };

  const load = async () => {
    try {
      const res = await api.get(`/api/coach-arena/races/${roomId}/live`);
      setData(res.data);
      if (res.data?.timing?.timeRemainingSec != null) setTimeLeft(res.data.timing.timeRemainingSec);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this race.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [roomId]);

  // Live socket wiring — join the same room the players are in, listen only.
  useEffect(() => {
    // The room join must happen ON an established connection: the server's
    // joinArenaRoom handler drops the call when the socket has no authed
    // userId yet, which is the case for an emit fired during the handshake.
    // So join now only if already connected, and (re)join on every 'connect'.
    const joinRoom = () => socket.emit('joinArenaRoom', `arena:${roomId}`);

    const onLeaderboard = (d) => {
      if (d?.leaderboard) setData(prev => ({ ...(prev || {}), leaderboard: d.leaderboard }));
    };
    const onTime = (d) => { if (d?.timeRemainingSec != null) setTimeLeft(d.timeRemainingSec); };
    const onStarted = () => load();
    const onEnded = () => load();
    const onPlayerJoined = () => load();
    const onConnect = () => joinRoom();

    socket.on('leaderboardUpdate', onLeaderboard);
    socket.on('arenaTimeUpdate', onTime);
    socket.on('raceStarted', onStarted);
    socket.on('raceEnded', onEnded);
    socket.on('raceCompleted', onEnded);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('connect', onConnect);

    if (socket.connected) joinRoom(); else socket.connect();

    return () => {
      socket.off('leaderboardUpdate', onLeaderboard);
      socket.off('arenaTimeUpdate', onTime);
      socket.off('raceStarted', onStarted);
      socket.off('raceEnded', onEnded);
      socket.off('raceCompleted', onEnded);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('connect', onConnect);
    };
    // eslint-disable-next-line
  }, [roomId]);

  // Safety net: a coach watching a 10-minute race must never be looking at a
  // frozen table. Sockets can silently drop a room (proxy timeout, transport
  // upgrade, laptop sleep) with no 'connect' event to re-trigger the rejoin,
  // so poll the REST /live route while the race is running. 10s is cheap for
  // a handful of coach tabs and keeps the board honest between socket pushes.
  useEffect(() => {
    const status = data?.status;
    if (status !== 'active' && status !== 'waiting') return;
    const id = setInterval(() => { load(); }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [data?.status, roomId]);

  // Local 1s countdown between server time syncs.
  useEffect(() => {
    if (timeLeft == null) return;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft(t => (t == null ? t : Math.max(0, t - 1)));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [timeLeft != null]);

  // Global 1s tick — drives the pre-start "starts in" countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (s) => {
    if (s == null) return '—';
    const mm = Math.floor(s / 60), ss = s % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  };

  // Manual-start: coach presses Start (owner-authorized backend route).
  const startRace = async () => {
    if (starting) return;
    setStarting(true);
    setStartErr('');
    try {
      await api.post(`/api/coach-arena/races/${roomId}/start`);
      await load();
    } catch (err) {
      setStartErr(err.response?.data?.message || 'Could not start the race.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="coach-loading">Loading live race…</div>;
  if (error) return (
    <div className="coach-dash">
      <div className="coach-error">⚠️ {error}</div>
      {embedded
        ? <button className="btn-ghost" onClick={onBack}>← Back to activities</button>
        : <Link to="/coach/activities" className="btn-ghost">← Back to activities</Link>}
    </div>
  );

  const lb = data?.leaderboard || [];
  const isWaiting = data?.status === 'waiting';
  const isActive = data?.status === 'active';
  const isDone = data?.status === 'completed';
  const statusLabel = isDone ? '✅ Completed' : isActive ? '🔴 Live' : '⏳ Waiting';

  // Pre-start countdown (auto mode): seconds until plannedStartTime.
  const plannedMs = data?.plannedStartTime ? new Date(data.plannedStartTime).getTime() : null;
  const startsInSec = plannedMs ? Math.max(0, Math.ceil((plannedMs - now) / 1000)) : null;
  const isManual = data?.startMode === 'manual';

  const fmtDur = (s) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;
  };

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>🏁 {data?.name || 'Class Race'}</h1>
          <p className="coach-dash-sub">
            {data?.topic} · {statusLabel}
            {isActive && <> · <strong style={{ color: timeLeft != null && timeLeft < 60 ? '#f87171' : '#6ee7b7' }}>⏱ Ends in {fmtTime(timeLeft)}</strong></>}
            {isWaiting && !isManual && startsInSec != null && startsInSec > 0 && <> · <strong style={{ color: '#fcd34d' }}>⏱ Starts in {fmtDur(startsInSec)}</strong></>}
          </p>
          {/* Students find this race in their Activities tab, but a coach mid-class
              needs to be able to read the code out or paste it into chat. */}
          {/* showLink: students kept asking for the waiting-room LINK, and the
              badge only offered the bare code — so the coach had to read the
              code out and explain where to type it, mid-class. */}
          {!isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <RoomCodeBadge code={data?.roomId || roomId} showLink />
              {/* One click beats "copy link, open chat, paste, send" while a
                  class of kids waits. Chat links are already clickable and open
                  in a new tab, so the class tab stays connected behind it. */}
              {sessionId && (
                <button
                  onClick={sendLinkToClass}
                  title="Post the join link into class chat for every student"
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    background: sentToClass ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.15)',
                    border: `1px solid ${sentToClass ? 'rgba(16,185,129,0.5)' : 'rgba(6,182,212,0.35)'}`,
                    color: sentToClass ? '#6ee7b7' : '#67e8f9',
                  }}
                >
                  {sentToClass ? '✓ Sent to class' : '💬 Send link to class'}
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={load}>↻ Refresh</button>
          {embedded
            ? <button className="btn-ghost" onClick={onBack}>← Activities</button>
            : <Link to="/coach/activities" className="btn-ghost">← Activities</Link>}
        </div>
      </div>

      {/* ── Start controls (before the race begins) ── */}
      {isWaiting && (
        <div className="coach-trial-banner trial" style={{ marginBottom: 20 }}>
          {isManual ? (
            <>
              <div>
                <strong>Ready when you are.</strong> {lb.length} student{lb.length === 1 ? '' : 's'} joined — press start to begin the race for everyone.
              </div>
              <button className="btn-primary" onClick={startRace} disabled={starting}>
                {starting ? 'Starting…' : '🏁 Start race now'}
              </button>
            </>
          ) : (
            <div>
              <strong>Auto start.</strong>{' '}
              {startsInSec != null && startsInSec > 0
                ? <>This race starts automatically in <strong style={{ color: '#fcd34d' }}>{fmtDur(startsInSec)}</strong>. {lb.length} joined.</>
                : <>Starting now… {lb.length} joined.</>}
            </div>
          )}
        </div>
      )}
      {startErr && <div className="coach-error" style={{ marginBottom: 16 }}>⚠️ {startErr}</div>}

      <div className="coach-section">
        <div className="coach-section-head"><h2>Live leaderboard</h2></div>
        {lb.length === 0 ? (
          <div className="coach-empty">
            No students have joined yet. This race appears automatically in their Activities tab —
            or share the room code above if someone can't find it.
          </div>
        ) : (
          <div className="coach-students-table-wrap">
            <table className="coach-students-table">
              <thead>
                <tr>
                  <th className="cst-player">#</th>
                  <th className="cst-player">Student</th>
                  <th className="cst-num">Score</th>
                  <th className="cst-num">Solved</th>
                  <th className="cst-num">✓</th>
                  <th className="cst-num">✗</th>
                  <th className="cst-num">Status</th>
                </tr>
              </thead>
              <tbody>
                {lb.map((p, i) => (
                  <tr key={p.username || i}>
                    <td className="cst-player">{i + 1}</td>
                    <td className="cst-player">{p.displayName || p.username}</td>
                    <td className="cst-num"><strong>{p.score || 0}</strong></td>
                    <td className="cst-num">{p.puzzlesSolved || p.currentPuzzleIndex || 0}</td>
                    <td className="cst-num" style={{ color: '#6ee7b7' }}>{p.correctCount || 0}</td>
                    <td className="cst-num" style={{ color: '#f87171' }}>{p.wrongCount || 0}</td>
                    <td className="cst-num">{p.status === 'finished' ? '🏁' : p.status === 'racing' ? '🔴' : '⏳'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
