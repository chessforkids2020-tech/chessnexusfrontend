import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';
import CoachChatFab from '../../components/coach/CoachChatFab';
import CoachNotificationBell from '../../components/coach/CoachNotificationBell';
import ExpiryReminder from '../../components/ExpiryReminder';
import './CoachDashboard.css';
import './CoachOnboarding.css'; // shared button styles

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Tooltip, Legend, Filler
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

// ── Pure helpers for chart config ─────────────────────────────────────
function buildChartData(data) {
  const labels = data.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const hasStudy = data.some(d => d.studyMins > 0);
  const datasets = [
    {
      type: 'bar', label: '✓ Present',
      data: data.map(d => d.present),
      backgroundColor: 'rgba(16,185,129,0.78)', borderWidth: 0,
      stack: 'att', yAxisID: 'y', order: 2
    },
    {
      type: 'bar', label: '↺ Catch-up',
      data: data.map(d => d.catchup),
      backgroundColor: 'rgba(245,158,11,0.75)', borderWidth: 0,
      stack: 'att', yAxisID: 'y', order: 2
    },
    {
      type: 'bar', label: '✗ Absent',
      data: data.map(d => d.absent),
      backgroundColor: 'rgba(248,113,113,0.45)', borderWidth: 0,
      stack: 'att', yAxisID: 'y', order: 2
    }
  ];
  if (hasStudy) {
    datasets.push({
      type: 'line', label: 'Study (min)',
      data: data.map(d => d.studyMins),
      borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.07)',
      yAxisID: 'y2', tension: 0.4, fill: true,
      pointRadius: data.length <= 7 ? 4 : 2, pointHoverRadius: 5, order: 1
    });
  }
  return { labels, datasets };
}

function buildChartOptions(data, days) {
  const hasStudy = data.some(d => d.studyMins > 0);
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: 'rgba(226,232,240,0.65)', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: 'rgba(12,12,20,0.95)', titleColor: '#f1f5f9',
        bodyColor: 'rgba(226,232,240,0.8)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(226,232,240,0.45)', font: { size: 10 }, maxTicksLimit: days <= 7 ? 7 : 10 }
      },
      y: {
        stacked: true, position: 'left',
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: 'rgba(226,232,240,0.45)', font: { size: 10 }, stepSize: 1 },
        title: { display: true, text: 'Classes', color: 'rgba(226,232,240,0.35)', font: { size: 10 } },
        beginAtZero: true
      },
      ...(hasStudy ? {
        y2: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: 'rgba(6,182,212,0.6)', font: { size: 10 } },
          title: { display: true, text: 'Study min', color: 'rgba(6,182,212,0.4)', font: { size: 10 } },
          beginAtZero: true
        }
      } : {})
    }
  };
}

// ── Engagement chart: distinct students/day per category ──────────────
function buildEngagementData(data) {
  const labels = data.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const cat = (label, key, color) => ({
    type: 'bar', label, data: data.map(d => d[key] || 0),
    backgroundColor: color, borderWidth: 0, stack: 'eng', order: 2,
  });
  return {
    labels,
    datasets: [
      cat('🧩 Puzzles', 'puzzles', 'rgba(6,182,212,0.8)'),
      cat('♟ Games', 'games', 'rgba(139,92,246,0.8)'),
      cat('📚 Studies', 'studies', 'rgba(16,185,129,0.8)'),
      cat('📝 Assignments', 'assignments', 'rgba(245,158,11,0.8)'),
    ],
  };
}

function buildEngagementOptions(data, days) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: 'rgba(226,232,240,0.65)', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: 'rgba(12,12,20,0.95)', titleColor: '#f1f5f9',
        bodyColor: 'rgba(226,232,240,0.8)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1
      }
    },
    scales: {
      x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(226,232,240,0.45)', font: { size: 10 }, maxTicksLimit: days <= 7 ? 7 : 10 } },
      y: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: 'rgba(226,232,240,0.45)', font: { size: 10 }, stepSize: 1 },
        title: { display: true, text: 'Students', color: 'rgba(226,232,240,0.35)', font: { size: 10 } },
        beginAtZero: true }
    }
  };
}

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [coachStatus, setCoachStatus] = useState(null); // /api/coach/status (has access + sponsored)
  const [students, setStudents] = useState([]);
  // Roster search. A coach on the top plan can have 150 students, and the table
  // was a single unfiltered scroll — finding one child meant hunting by eye.
  // Filtering is client-side because the full roster is already loaded.
  const [studentSearch, setStudentSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');   // '' = all batches
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [showVerifiedPopup, setShowVerifiedPopup] = useState(false); // one-time verified welcome
  const [toast, setToast] = useState('');   // transient live-update notice

  // Add student modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ studentUsername: '', studentName: '', studentEmail: '', groupTag: '', notes: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addErrorUpgrade, setAddErrorUpgrade] = useState(false); // 402: student cap hit — offer plans link
  const [addNotice, setAddNotice] = useState(''); // "request sent" confirmation

  // Activity + engagement charts (share the day-range toggle).
  const [chartData, setChartData] = useState([]);
  const [engData, setEngData] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    Promise.all([
      api.get(`/api/coach/activity-chart?days=${chartDays}`).then(r => r.data).catch(() => []),
      api.get(`/api/coach/engagement-chart?days=${chartDays}`).then(r => r.data).catch(() => []),
    ]).then(([act, eng]) => {
      if (cancelled) return;
      setChartData(act);
      setEngData(eng);
    }).finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [chartDays]); // eslint-disable-line

  const loadAll = async () => {
    setLoading(true);
    try {
      const status = await api.get('/api/coach/status');
      if (!status.data?.isCoach) {
        navigate('/coach/onboarding', { replace: true });
        return;
      }
      setCoachStatus(status.data);
      // One-time "you're a verified coach" welcome — verified but not yet seen.
      const cp = status.data?.coachProfile;
      if (cp?.verified && !cp?.verifiedNoticeSeenAt) setShowVerifiedPopup(true);
      const [dash, studs, pend] = await Promise.all([
        api.get('/api/coach/dashboard'),
        api.get('/api/coach/students'),
        api.get('/api/coach/students/pending')
      ]);
      setSummary(dash.data);
      setStudents(studs.data?.students || []);
      setPending(pend.data?.pending || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  // Live updates — a student approving/declining your request refreshes the
  // roster in place, no reload. The server emits to this coach's `user-<id>`
  // room only, so one coach never sees another's events.
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onApproved = (d) => {
      setToast(`✓ ${d?.studentName || 'A student'} joined your roster`);
      loadAll();
    };
    const onDeclined = (d) => {
      setToast(`${d?.studentName || 'A student'} declined your request`);
      loadAll();
    };

    socket.on('coach:studentApproved', onApproved);
    socket.on('coach:studentDeclined', onDeclined);
    return () => {
      socket.off('coach:studentApproved', onApproved);
      socket.off('coach:studentDeclined', onDeclined);
    };
  }, []); // eslint-disable-line

  // Auto-dismiss the live toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const dismissVerifiedPopup = async () => {
    setShowVerifiedPopup(false);
    try { await api.post('/api/coach/verified-notice-seen'); } catch { /* best-effort */ }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddErrorUpgrade(false);
    if (!addForm.studentUsername && !addForm.studentName) {
      setAddError('Enter the student\'s username (preferred) or their name.');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post('/api/coach/students', addForm);
      setShowAdd(false);
      setAddForm({ studentUsername: '', studentName: '', studentEmail: '', groupTag: '', notes: '' });
      setAddNotice(res.data?.message || 'Request sent — waiting for the student to approve.');
      await loadAll();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Could not add student.');
      setAddErrorUpgrade(err.response?.status === 402 && !!err.response?.data?.requiresUpgrade);
    } finally {
      setAdding(false);
    }
  };

  const cancelPending = async (linkId) => {
    try {
      await api.delete(`/api/coach/students/${linkId}`);
      setPending(prev => prev.filter(p => p._id !== linkId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request.');
    }
  };

  const removeStudent = async (linkId) => {
    if (!window.confirm('Remove this student from your roster?')) return;
    try {
      await api.delete(`/api/coach/students/${linkId}`);
      setStudents(prev => prev.filter(s => s._id !== linkId));
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove student.');
    }
  };

  if (loading) {
    return <div className="coach-loading">Loading your coach dashboard…</div>;
  }

  if (error) {
    return <div className="coach-error">⚠️ {error}</div>;
  }

  const max = summary?.maxStudents || 0;
  const count = students.length;
  const remaining = Math.max(0, max - count);

  // Every batch currently in use, for the filter dropdown.
  const batches = [...new Set(students.map(s => s.groupTag).filter(Boolean))].sort();

  // Match on the same fields a coach would think to type: the name they gave the
  // student, the student's own display name, and their username.
  const q = studentSearch.trim().toLowerCase();
  const visibleStudents = students.filter(s => {
    if (batchFilter && s.groupTag !== batchFilter) return false;
    if (!q) return true;
    const u = s.studentId;
    return [s.studentName, u?.displayName, u?.username, s.studentUsername, s.groupTag]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  // Renewal reminder — only for individual coaches on a real paid plan (not
  // academy-sponsored: their billing is the academy's concern, not theirs).
  const cs = coachStatus?.access;
  const showRenewal = cs && !coachStatus?.coachSubscription?.sponsoredByAcademy
    && cs.reason !== 'free' && cs.reason !== 'elite_free' && cs.reason !== 'privileged' && cs.reason !== 'comped'
    && !cs.downgraded;

  return (
    <div className="coach-dash">
      {showRenewal && (
        <ExpiryReminder
          daysRemaining={cs.daysRemaining}
          what={cs.reason === 'exit_trial' ? 'academy trial' : 'coach plan'}
          to="/coach/subscription"
          ctaLabel={cs.reason === 'exit_trial' ? 'Set up your plan' : 'Renew now'}
        />
      )}
      {/* Live update notice — appears without a reload, fades after 4s. */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)',
          color: '#67e8f9', borderRadius: 10, padding: '11px 16px',
          fontSize: 14, fontWeight: 600, backdropFilter: 'blur(10px)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)', maxWidth: '90vw',
        }}>
          {toast}
        </div>
      )}
      <div className="coach-dash-header">
        <div>
          <h1>
            Welcome Coach, {summary?.coachProfile?.coachName || 'Coach'} 👋
            {summary?.coachProfile?.verified && (
              <span className="coach-verified-badge" title="Verified by the Nexus team">🎓 Verified Coach</span>
            )}
          </h1>
          <p className="coach-dash-sub">
            {summary?.coachProfile?.coachType === 'academy'
              ? summary?.coachProfile?.academyName
              : `Individual coach · ${summary?.coachProfile?.coachCountry || ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <CoachNotificationBell />
          <Link to="/coach/profile" className="btn-ghost">👤 Profile</Link>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────── */}
      <div className="coach-stat-row">
        <div className="coach-stat-card">
          <div className="stat-label">Students</div>
          <div className="stat-value">{count} <span className="stat-cap">/ {max}</span></div>
          <div className="stat-bar"><div style={{ width: `${Math.min(100, (count / max) * 100)}%` }} /></div>
          <div className="stat-foot">{remaining} slots remaining</div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Active assignments</div>
          <div className="stat-value">{summary?.assignmentsCount || 0}</div>
          <Link to="/coach/assignments" className="stat-link">View all →</Link>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Activities</div>
          <div className="stat-value">{summary?.activitiesCount || 0}</div>
          <Link to="/coach/activities" className="stat-link">View all →</Link>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Active students</div>
          <div className="stat-value">
            {summary?.activeStudents || 0} <span className="stat-cap">/ {count}</span>
          </div>
          <div className="stat-foot">active in the last 7 days</div>
        </div>
      </div>

      {/* ── Class overview: two charts side by side ─────────────── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>Class overview</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                className={chartDays === d ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => setChartDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="coach-charts-grid">
          {/* Engagement: how many students did each activity */}
          <div className="coach-chart-panel">
            <div className="coach-chart-title">🔥 Student engagement <span>· students active per day</span></div>
            <div className="coach-chart-wrap">
              {chartLoading ? (
                <p className="coach-chart-placeholder">Loading…</p>
              ) : engData.every(d => !d.puzzles && !d.games && !d.studies && !d.assignments) ? (
                <p className="coach-chart-placeholder">
                  No student activity yet — puzzles, games, studies and completed assignments will show here.
                </p>
              ) : (
                <Bar data={buildEngagementData(engData)} options={buildEngagementOptions(engData, chartDays)} />
              )}
            </div>
          </div>

          {/* Attendance: present / catch-up / absent */}
          <div className="coach-chart-panel">
            <div className="coach-chart-title">📋 Attendance <span>· present · catch-up · absent</span></div>
            <div className="coach-chart-wrap">
              {chartLoading ? (
                <p className="coach-chart-placeholder">Loading…</p>
              ) : chartData.every(d => d.present === 0 && d.absent === 0 && d.catchup === 0 && d.studyMins === 0) ? (
                <p className="coach-chart-placeholder">
                  No attendance yet — mark it in the <Link to="/coach/attendance">Attendance</Link> tab.
                </p>
              ) : (
                <Bar data={buildChartData(chartData)} options={buildChartOptions(chartData, chartDays)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Students section ─────────────────── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>Your students</h2>
          <button
            className="btn-primary"
            onClick={() => setShowAdd(true)}
            disabled={remaining <= 0}
            title={remaining <= 0 ? 'Upgrade your plan to add more students' : ''}
          >
            ＋ Add student
          </button>
        </div>

        <p className="coach-add-hint" style={{ fontSize: '13px', color: '#a78bfa', margin: '-4px 0 12px' }}>
          Enroll a student in attendance — the student will receive your assignments.
        </p>

        {addNotice && (
          <div
            className="coach-empty"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>🎓 {addNotice}</span>
            <button onClick={() => setAddNotice('')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Pending requests — sent, waiting for the student to approve. These reserve a slot. */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 8px' }}>
              ⏳ Pending requests ({pending.length})
            </div>
            <div className="coach-students-grid">
              {pending.map(p => {
                const u = p.studentId;
                const name = u?.displayName || u?.username || p.studentName || 'Student';
                return (
                  <div key={p._id} className="coach-student-card" style={{ opacity: 0.85, border: '1px dashed rgba(139,92,246,0.4)' }}>
                    <div className="coach-student-name">{name}</div>
                    <div style={{ fontSize: '12px', color: '#a78bfa', margin: '4px 0' }}>Waiting for approval…</div>
                    <button className="btn-ghost" onClick={() => cancelPending(p._id)}>Cancel request</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {students.length === 0 && (
          <div className="coach-empty">
            No students yet. Click <strong>Add student</strong> to invite your first one.
          </div>
        )}

        {/* Search + batch filter. Only worth showing once the roster is big
            enough to scroll — under 8 students you can see everyone at once. */}
        {students.length >= 8 && (
          <div className="coach-roster-tools">
            <input
              className="coach-roster-search"
              type="search"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search students by name or username…"
              aria-label="Search students"
            />
            {batches.length > 0 && (
              <select
                className="coach-roster-batch"
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                aria-label="Filter by batch"
              >
                <option value="">All batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <span className="coach-roster-count">
              {visibleStudents.length === students.length
                ? `${students.length} students`
                : `${visibleStudents.length} of ${students.length} students`}
            </span>
            {(q || batchFilter) && (
              <button
                type="button"
                className="coach-roster-clear"
                onClick={() => { setStudentSearch(''); setBatchFilter(''); }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* A search that matches nobody must say so — an empty table reads as
            "your students vanished". */}
        {students.length > 0 && visibleStudents.length === 0 && (
          <div className="coach-empty">
            No students match “{studentSearch || batchFilter}”.
          </div>
        )}

        {visibleStudents.length > 0 && (
          <div className="coach-students-table-wrap">
            <table className="coach-students-table">
              <thead>
                <tr>
                  <th className="cst-player">Student</th>
                  <th className="cst-num">Puzzle</th>
                  <th className="cst-num">Bullet</th>
                  <th className="cst-num">Blitz</th>
                  <th className="cst-num">Rapid</th>
                  <th className="cst-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map(s => {
                  const u = s.studentId;
                  const name = s.studentName || u?.displayName || u?.username || 'Unnamed';
                  const r = s.ratings || {};
                  // Public profile is keyed by displayName; fall back to username.
                  const profileKey = u?.displayName || u?.username;
                  return (
                    <tr key={s._id}>
                      <td className="cst-player">
                        <div className="cst-player-cell">
                          <div className="cst-avatar">
                            {u?.profilePhotoUrl
                              ? <img src={u.profilePhotoUrl} alt={name} />
                              : <span>{name.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className="cst-player-meta">
                            <div className="cst-name">{name}</div>
                            <div className="cst-sub">
                              {u?.username && <>@{u.username}</>}
                              {s.groupTag && <span className="cst-tag">{s.groupTag}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="cst-num">{u?.liveRating ?? '—'}</td>
                      <td className="cst-num">{r.bullet ?? '—'}</td>
                      <td className="cst-num">{r.blitz ?? '—'}</td>
                      <td className="cst-num">{r.rapid ?? '—'}</td>
                      <td className="cst-actions">
                        <div className="cst-btns">
                          {profileKey ? (
                            <Link
                              to={`/player/${encodeURIComponent(profileKey)}`}
                              className="cst-btn cst-btn-profile"
                              title="Open student's public profile"
                            >Profile</Link>
                          ) : (
                            <span className="cst-btn cst-btn-disabled" title="No linked account yet">Profile</span>
                          )}
                          <Link
                            to={`/coach/students/${s._id}`}
                            className="cst-btn cst-btn-progress"
                            title="View this student's progress"
                          >Progress</Link>
                          <button
                            className="cst-btn cst-btn-delete"
                            onClick={() => removeStudent(s._id)}
                            title="Remove from roster"
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent assignments ──────────────── */}
      {summary?.recentAssignments?.length > 0 && (
        <div className="coach-section">
          <div className="coach-section-head">
            <h2>Recent assignments</h2>
            <Link to="/coach/assignments" className="btn-ghost">See all</Link>
          </div>
          <div className="coach-assignment-list">
            {summary.recentAssignments.map(a => (
              <div key={a._id} className="coach-assignment-row">
                <div>
                  <div className="assign-title">{a.title}</div>
                  <div className="assign-meta">
                    {a.assignmentType.replace('_', ' ')} · {a.studentIds.length} student{a.studentIds.length === 1 ? '' : 's'}
                    {a.targetCount ? ` · ${a.targetCount} puzzles` : ''}
                  </div>
                </div>
                <div className="assign-date">
                  {new Date(a.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating message button (opens coach chat popup). */}
      <CoachChatFab />

      {/* ── Add Student Modal ───────────────── */}
      {showAdd && (
        <div className="coach-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="coach-modal" onClick={e => e.stopPropagation()}>
            <h2>Add a student</h2>
            <p className="modal-hint">
              If your student already has a chess account here, enter their username — they will be linked instantly and their progress will sync.
            </p>
            <form onSubmit={addStudent}>
              <label className="field">
                <span>Username (preferred)</span>
                <input
                  type="text"
                  value={addForm.studentUsername}
                  onChange={e => setAddForm({ ...addForm, studentUsername: e.target.value })}
                  placeholder="e.g. magnus_2018"
                />
              </label>
              <div className="modal-divider">— or add manually —</div>
              <label className="field">
                <span>Student name</span>
                <input
                  type="text"
                  value={addForm.studentName}
                  onChange={e => setAddForm({ ...addForm, studentName: e.target.value })}
                  placeholder="Full name"
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={addForm.studentEmail}
                    onChange={e => setAddForm({ ...addForm, studentEmail: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Group / batch tag</span>
                  <input
                    type="text"
                    value={addForm.groupTag}
                    onChange={e => setAddForm({ ...addForm, groupTag: e.target.value })}
                    placeholder="e.g. Sunday morning"
                  />
                </label>
              </div>
              <label className="field">
                <span>Coach notes (private)</span>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Anything you want to remember about this student"
                />
              </label>

              {addError && (
                <div className="form-error">
                  {addError}
                  {addErrorUpgrade && <> <Link to="/coach/subscription">View plans →</Link></>}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)} disabled={adding}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={adding}>
                  {adding ? 'Adding…' : 'Add student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time "you're a verified coach" welcome popup */}
      {showVerifiedPopup && (
        <div className="coach-modal-overlay" onClick={dismissVerifiedPopup}>
          <div className="coach-modal coach-verified-modal" onClick={e => e.stopPropagation()}>
            <div className="coach-verified-modal-icon">🎓</div>
            <h2>You're a verified coach!</h2>
            <p>
              The Nexus team has verified your account — welcome aboard. You now carry the
              <strong> 🎓 Verified Coach</strong> badge.
            </p>
            <p className="coach-verified-modal-note">
              ChessNexus is <strong>free for coaches</strong>. To keep it fair for everyone,
              please make sure you use <strong>only one coach account</strong>. Duplicate
              coach accounts may be removed.
            </p>
            <button className="btn-primary" onClick={dismissVerifiedPopup}>
              Got it — let's coach ♟️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
