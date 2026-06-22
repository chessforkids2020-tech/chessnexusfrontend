import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
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

function planLabel(plan) {
  return ({
    trial: 'Free Trial',
    elite_free: 'Elite Coach (6 months free)',
    coach: 'Coach',
    // Legacy plan ids (still shown correctly for any pre-existing subscribers).
    starter: 'Starter',
    pro: 'Pro',
    pro_plus: 'Pro+',
    academy: 'Academy'
  })[plan] || plan;
}

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  // Add student modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ studentUsername: '', studentName: '', studentEmail: '', groupTag: '', notes: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addNotice, setAddNotice] = useState(''); // "request sent" confirmation

  // Activity chart
  const [chartData, setChartData] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    api.get(`/api/coach/activity-chart?days=${chartDays}`)
      .then(r => { if (!cancelled) setChartData(r.data); })
      .catch(() => { if (!cancelled) setChartData([]); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
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
      if (!status.data?.access?.active) {
        // Expired — push to subscription page
        navigate('/coach/subscription?expired=1', { replace: true });
        return;
      }
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

  const addStudent = async (e) => {
    e.preventDefault();
    setAddError('');
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

  const access = summary?.access || {};
  const plan = summary?.plan || 'trial';
  const max = summary?.maxStudents || 0;
  const count = students.length;
  const remaining = Math.max(0, max - count);
  // Elite/admin users get coaching free for as long as they hold that role —
  // no trial countdown and no upgrade prompt.
  const isPrivileged = access.reason === 'privileged';
  const isEliteFree = access.reason === 'elite_free';
  const isTrial = !isPrivileged && !isEliteFree && plan === 'trial';
  const eliteRenewSoon = isEliteFree && access.renewalReminder;

  return (
    <div className="coach-dash">
      {/* ── Top status bar ───────────────────── */}
      {isEliteFree ? (
        <div className={`coach-trial-banner ${eliteRenewSoon ? 'trial' : 'paid'}`}>
          <div>
            <strong>💎 Elite Coach Access — Free for 6 months</strong>
            {eliteRenewSoon ? (
              <> · ⚠️ Your coach membership is about to finish ({access.daysRemaining} day
                {access.daysRemaining === 1 ? '' : 's'} left). To continue, contact the Nexus team on the Contact Us page.</>
            ) : (
              <> · {access.daysRemaining} day{access.daysRemaining === 1 ? '' : 's'} remaining</>
            )}
          </div>
          {eliteRenewSoon && (
            <button className="btn-primary" onClick={() => navigate('/contact')}>
              Contact Nexus team
            </button>
          )}
        </div>
      ) : (
        <div className={`coach-trial-banner ${isPrivileged ? 'paid' : isTrial ? 'trial' : 'paid'}`}>
          <div>
            <strong>{isPrivileged ? 'Free Coach Access' : planLabel(plan)}</strong>
            {isPrivileged
              ? <> · included with your {summary?.isElite ? 'Elite' : 'Admin'} membership</>
              : isTrial
                ? <> · {access.daysRemaining} day{access.daysRemaining === 1 ? '' : 's'} left in your free trial</>
                : <> · renews in {access.daysRemaining} day{access.daysRemaining === 1 ? '' : 's'}</>}
          </div>
          {!isPrivileged && (
            <button className="btn-primary" onClick={() => navigate('/coach/subscription')}>
              {isTrial ? 'Upgrade now' : 'Manage plan'}
            </button>
          )}
        </div>
      )}

      <div className="coach-dash-header">
        <div>
          <h1>Welcome back, {summary?.coachProfile?.coachName || 'Coach'} 👋</h1>
          <p className="coach-dash-sub">
            {summary?.coachProfile?.coachType === 'academy'
              ? summary?.coachProfile?.academyName
              : `Individual coach · ${summary?.coachProfile?.coachCountry || ''}`}
          </p>
        </div>
        <div className="coach-dash-quicklinks">
          <Link to="/coach/assignments" className="btn-ghost">📝 Assignments</Link>
          <Link to="/coach/attendance" className="btn-ghost">📋 Attendance</Link>
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
          <div className="stat-label">Specialization</div>
          <div className="stat-value" style={{ fontSize: '20px' }}>
            {summary?.coachProfile?.specialization || 'General'}
          </div>
          <div className="stat-foot">{summary?.coachProfile?.coachType === 'academy' ? 'Academy' : 'Individual coach'}</div>
        </div>
      </div>

      {/* ── Activity chart ──────────────────────────── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>Student activity</h2>
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
        <div className="coach-chart-wrap">
          {chartLoading ? (
            <p className="coach-chart-placeholder">Loading activity data…</p>
          ) : chartData.every(d => d.present === 0 && d.absent === 0 && d.catchup === 0 && d.studyMins === 0) ? (
            <p className="coach-chart-placeholder">
              No activity recorded yet — start marking attendance in the{' '}
              <Link to="/coach/attendance">Attendance</Link> tab to see trends here.
            </p>
          ) : (
            <Bar data={buildChartData(chartData)} options={buildChartOptions(chartData, chartDays)} />
          )}
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

        {students.length > 0 && (
          <div className="coach-students-grid">
            {students.map(s => {
              const u = s.studentId;
              return (
                <div key={s._id} className="coach-student-card">
                  <div className="student-top">
                    <div className="student-avatar">
                      {(s.studentName || u?.displayName || u?.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="student-meta">
                      <div className="student-name">{s.studentName || u?.displayName || u?.username || 'Unnamed'}</div>
                      <div className="student-sub">
                        {u?.username && <>@{u.username}</>}
                        {s.groupTag && <span className="tag">{s.groupTag}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="student-stats">
                    <div><span>Rating</span><strong>{u?.liveRating ?? '—'}</strong></div>
                    <div><span>Country</span><strong>{u?.country || '—'}</strong></div>
                    <div><span>Source</span><strong>{s.source}</strong></div>
                  </div>
                  {s.inviteStatus === 'pending' && s.inviteCode && (
                    <div className="invite-pill">Invite code: <code>{s.inviteCode}</code></div>
                  )}
                  <div className="student-actions">
                    <Link to={`/coach/students/${s._id}`} className="btn-ghost">View progress →</Link>
                    <button className="btn-danger" onClick={() => removeStudent(s._id)}>Remove</button>
                  </div>
                </div>
              );
            })}
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

              {addError && <div className="form-error">{addError}</div>}

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
    </div>
  );
}
