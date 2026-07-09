// pages/coach/CoachActivities.jsx
// Coach hub for private class activities. V1: Arena Races the coach created for
// their students, each with a live results link. Uses /api/coach-arena only.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';

// Activity types a coach can create. Arena race + arena tournament are open to
// all coaches; team race is elite-only. Monthly Focus is a special case: any
// coach gets ONE for free, then it becomes elite-only (id 'monthlyFocus' drives
// the dynamic lock from /can-create).
const ACTIVITY_OPTIONS = [
  { id: 'arenaRace', label: '🏁 Arena Race', to: '/arena/create?coach=1', elite: false },
  { id: 'arenaTournament', label: '🏆 Arena Tournament', to: '/arenatournament/create?coach=1', elite: false },
  { id: 'teamRace', label: '🏃 Team Race', to: '/elite/team-race', elite: true },
  { id: 'monthlyFocus', label: '🎯 Monthly Focus', to: '/elite-monthly-focus', elite: false },
];

export default function CoachActivities() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState('races'); // races | tournaments | monthlyFocus
  const [isEliteCoach, setIsEliteCoach] = useState(false);
  // Monthly Focus eligibility (any coach gets one free, then elite-only).
  const [mf, setMf] = useState(null); // { canCreate, reason, isTrial }

  const load = async () => {
    setLoading(true);
    try {
      const [rc, tr] = await Promise.all([
        api.get('/api/coach-arena/races'),
        api.get('/api/coach-arena/tournaments').catch(() => ({ data: { tournaments: [] } })),
      ]);
      setRaces(rc.data?.races || []);
      setTournaments(tr.data?.tournaments || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Elite coaches (or admin) unlock Team Race.
  useEffect(() => {
    api.get('/api/coach/status')
      .then(r => {
        const reason = r.data?.access?.reason;
        setIsEliteCoach(!!r.data?.isElite || reason === 'privileged' || reason === 'elite_free');
      })
      .catch(() => {});
    // Monthly Focus: is this coach allowed to create one now?
    api.get('/api/elite/monthly-focus/can-create')
      .then(r => setMf(r.data || null))
      .catch(() => setMf({ canCreate: false, reason: 'error' }));
  }, []);

  const statusChip = (s) => {
    const map = { waiting: ['⏳ Waiting', '#fcd34d'], active: ['🔴 Live', '#f87171'], completed: ['✅ Done', '#6ee7b7'], cancelled: ['✖ Cancelled', 'rgba(226,232,240,0.5)'] };
    const [label, color] = map[s] || [s, '#e2e8f0'];
    return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>;
  };

  if (loading) return <div className="coach-loading">Loading activities…</div>;

  const tChipMap = { scheduled: ['⏳ Scheduled', '#fcd34d'], lobby: ['⏳ Lobby', '#fcd34d'], active: ['🔴 Live', '#f87171'], pairing_stopped: ['🔴 Live', '#f87171'], finished: ['✅ Done', '#6ee7b7'] };

  const TABS = [
    { id: 'races', label: `🏁 Arena Races${races.length ? ` (${races.length})` : ''}` },
    { id: 'tournaments', label: `🏆 Arena Tournaments${tournaments.length ? ` (${tournaments.length})` : ''}` },
    { id: 'monthlyFocus', label: '🎯 Monthly Focus' },
  ];

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>🎯 Class Activities</h1>
          <p className="coach-dash-sub">Private activities for your students. Only they can join; you watch results live.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {/* Create activity launcher */}
          <div className="coach-activity-menu">
            <button className="btn-primary" onClick={() => setShowMenu(v => !v)}>
              ➕ Create Activity ▾
            </button>
            {showMenu && (
              <>
                <div className="coach-activity-backdrop" onClick={() => setShowMenu(false)} />
                <div className="coach-activity-dropdown">
                  {ACTIVITY_OPTIONS.map(opt => {
                    let locked = opt.elite && !isEliteCoach;
                    let tag = locked ? '💎 Elite' : null;
                    let tooltip = locked ? 'Available for Elite coaches' : '';

                    // Monthly Focus: one free per coach, then elite-only.
                    if (opt.id === 'monthlyFocus') {
                      if (isEliteCoach) { locked = false; tag = null; }
                      else if (mf?.canCreate) { locked = false; tag = '✨ 1 free'; tooltip = 'Your one free Monthly Focus'; }
                      else if (mf?.reason === 'coach_trial_used') { locked = true; tag = '💎 Elite'; tooltip = 'You have used your free Monthly Focus — Elite for more'; }
                      else if (mf?.reason === 'month_used') { locked = true; tag = '⏳'; tooltip = 'You already created one this month'; }
                      else { locked = true; tag = '💎 Elite'; tooltip = 'Available for Elite coaches'; }
                    }

                    return (
                      <button
                        key={opt.id}
                        className={`coach-activity-item ${locked ? 'locked' : ''}`}
                        disabled={locked}
                        title={tooltip}
                        onClick={() => { if (!locked) { setShowMenu(false); navigate(opt.to); } }}
                      >
                        <span>{opt.label}</span>
                        {tag && <span className="coach-activity-lock">{tag}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
        </div>
      </div>

      {error && <div className="coach-error">⚠️ {error}</div>}

      {/* ── Activity tabs ── */}
      <div className="coach-act-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`coach-act-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Arena Races ── */}
      {tab === 'races' && (
        races.length === 0 ? (
          <div className="coach-empty">
            No class races yet. Click <strong>Create Activity</strong> to set one up for your students.
          </div>
        ) : (
          <div className="coach-students-grid">
            {races.map(r => (
              <div key={r._id} className="coach-student-card">
                <div className="coach-student-name">{r.name || 'Race'}</div>
                <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>
                  {r.topic} · {r.timeLimit} min · {statusChip(r.status)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)', marginBottom: 10 }}>
                  {r.joined}/{r.invited} students joined
                </div>
                <Link to={`/coach/arena/${r.roomId}`} className="btn-primary" style={{ display: 'inline-block' }}>
                  {r.status === 'completed' ? 'View results' : 'Watch live'}
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Arena Tournaments ── */}
      {tab === 'tournaments' && (
        tournaments.length === 0 ? (
          <div className="coach-empty">
            No class tournaments yet. Click <strong>Create Activity</strong> → Arena Tournament.
          </div>
        ) : (
          <div className="coach-students-grid">
            {tournaments.map(t => {
              const tChip = tChipMap[t.status] || [t.status, '#e2e8f0'];
              return (
                <div key={t._id} className="coach-student-card">
                  <div className="coach-student-name">{t.name || 'Tournament'}</div>
                  <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>
                    <span style={{ color: tChip[1], fontWeight: 700 }}>{tChip[0]}</span>
                    {' · '}{t.participantCount || 0} joined
                  </div>
                  <Link to={`/coach/arena-tournament/${t._id}`} className="btn-primary" style={{ display: 'inline-block' }}>
                    {t.status === 'finished' ? 'View results' : 'Watch'}
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Monthly Focus ── */}
      {tab === 'monthlyFocus' && (
        <div className="coach-empty" style={{ textAlign: 'left' }}>
          <p style={{ margin: '0 0 12px' }}>
            🎯 <strong>Monthly Focus</strong> — a multi-day challenge for your students.
            {mf?.canCreate
              ? mf?.isTrial ? ' You have your one free Monthly Focus available.' : ' You can create one this month.'
              : mf?.reason === 'coach_trial_used' ? ' You’ve used your free Monthly Focus — creating more is an Elite feature.'
              : mf?.reason === 'month_used' ? ' You already created one this month.'
              : ' Available for Elite coaches.'}
          </p>
          <Link to="/elite-monthly-focus" className="btn-primary" style={{ display: 'inline-block' }}>
            Open Monthly Focus →
          </Link>
        </div>
      )}
    </div>
  );
}
