// pages/coach/CoachArenaLive.jsx
// Coach's LIVE view of a private class arena race they created. Authorized by
// race ownership on the backend (/api/coach-arena) — this never touches the
// admin arena routes. Initial state comes from REST; live updates ride the same
// arena:<roomId> socket room the players use.
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import './CoachDashboard.css';

export default function CoachArenaLive() {
  const { roomId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [now, setNow] = useState(Date.now());   // ticks for the "starts in" countdown
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const tickRef = useRef(null);

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
    if (!socket.connected) socket.connect();
    socket.emit('joinArenaRoom', `arena:${roomId}`);

    const onLeaderboard = (d) => {
      if (d?.leaderboard) setData(prev => ({ ...(prev || {}), leaderboard: d.leaderboard }));
    };
    const onTime = (d) => { if (d?.timeRemainingSec != null) setTimeLeft(d.timeRemainingSec); };
    const onStarted = () => load();
    const onEnded = () => load();
    const onPlayerJoined = () => load();
    const onReconnect = () => socket.emit('joinArenaRoom', `arena:${roomId}`);

    socket.on('leaderboardUpdate', onLeaderboard);
    socket.on('arenaTimeUpdate', onTime);
    socket.on('raceStarted', onStarted);
    socket.on('raceEnded', onEnded);
    socket.on('raceCompleted', onEnded);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('leaderboardUpdate', onLeaderboard);
      socket.off('arenaTimeUpdate', onTime);
      socket.off('raceStarted', onStarted);
      socket.off('raceEnded', onEnded);
      socket.off('raceCompleted', onEnded);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('connect', onReconnect);
    };
    // eslint-disable-next-line
  }, [roomId]);

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
      <Link to="/coach/activities" className="btn-ghost">← Back to activities</Link>
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
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={load}>↻ Refresh</button>
          <Link to="/coach/activities" className="btn-ghost">← Activities</Link>
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
          <div className="coach-empty">No students have joined yet. Share nothing — it opens for them automatically in their Activities tab.</div>
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
