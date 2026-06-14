import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import BlunderAssignmentPlayer from './BlunderAssignmentPlayer';
import './MyCoachPortal.css';

// Normalize a string for loose matching: "Mate in 1" → "matein1".
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function curSym(c) { return c === 'USD' ? '$' : c === 'EUR' ? '€' : '₹'; }


export default function MyCoachPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [coaches, setCoaches] = useState([]);
  const [attendance, setAttendance] = useState({ records: [], stats: null });
  const [payments, setPayments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [themes, setThemes] = useState([]);
  const [blunderTask, setBlunderTask] = useState(null); // active PGN-blunder assignment
  const [cursor, setCursor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Class Payment request form (targets the student's coach via the link).
  const [payForm, setPayForm] = useState({ paidDate: '', fromDate: '', untilDate: '', amount: '' });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payNotice, setPayNotice] = useState('');
  const [payError, setPayError] = useState('');

  const submitFees = async (coach) => {
    setPayError(''); setPayNotice('');
    if (!payForm.amount || Number(payForm.amount) <= 0) { setPayError('Enter the amount you paid.'); return; }
    setPaySubmitting(true);
    try {
      await api.post('/api/coach-attendance/requests', {
        coachId: coach.coachId,
        amount: Number(payForm.amount),
        currency: coach.currency || 'INR',
        forMonth: payForm.fromDate ? new Date(payForm.fromDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '',
        paidDate: payForm.paidDate || undefined,
        fromDate: payForm.fromDate || undefined,
        untilDate: payForm.untilDate || undefined,
      });
      setPayNotice(`Sent to ${coach.coachName}. Your coach will review it.`);
      setPayForm({ paidDate: '', fromDate: '', untilDate: '', amount: '' });
    } catch (e) {
      setPayError(e.response?.data?.error || 'Could not submit your fees. Try again.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const reloadAssignments = async () => {
    try {
      const res = await api.get('/api/coach/my-assignments');
      setAssignments(res.data?.assignments || []);
    } catch { /* ignore */ }
  };

  // Open an assignment. PGN "find the blunders" (custom) opens an inline player;
  // puzzle_topic redirects into themed Healthy Mix training tagged with the id.
  const startAssignment = (a) => {
    if (a.assignmentType === 'custom') {
      setBlunderTask(a);
      return;
    }
    // Study Test: launch the timed test on the coach's chosen study/chapter,
    // tagged with the assignment id and the coach-set time limit.
    if (a.assignmentType === 'study_chapter') {
      if (!a.studyId || !a.chapterId) return;
      const t = a.testTimeLimit || 300;
      navigate(`/test/play/${a.studyId}/${a.chapterId}?time=${t}&assignment=${a._id}`);
      return;
    }
    // Puzzle Rush: launch the Timed Race on the coach's topic + duration.
    if (a.assignmentType === 'puzzle_rush') {
      const topic = a.rushTopic || 'mixed';
      const mins = a.rushMinutes || 5;
      navigate(`/timed-race?topic=${encodeURIComponent(topic)}&time=${mins}&assignment=${a._id}`);
      return;
    }
    if (a.assignmentType !== 'puzzle_topic') return;
    const want = norm(a.topicName);
    const match = themes.find(t => norm(t.key) === want || norm(t.label) === want);
    if (match) {
      navigate(`/training/healthy-mix?theme=${encodeURIComponent(match.key)}&assignment=${a._id}`);
    } else {
      // No exact theme match — let the student pick the theme, still tagged to the assignment.
      navigate(`/training/themes?assignment=${a._id}`);
    }
  };

  // Initial load: coaches + payments (don't depend on month)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [coachesRes, paymentsRes, assignmentsRes, themesRes] = await Promise.all([
          api.get('/api/coach-attendance/my/coaches'),
          api.get('/api/coach-attendance/my/payments'),
          api.get('/api/coach/my-assignments'),
          api.get('/api/public/healthymix/themes').catch(() => ({ data: { themes: [] } })),
        ]);
        if (!alive) return;
        setCoaches(coachesRes.data || []);
        setPayments(paymentsRes.data?.payments || []);
        setAssignments(assignmentsRes.data?.assignments || []);
        setThemes(themesRes.data?.themes || []);
        setError(null);
      } catch {
        if (alive) setError('Could not load your coach records.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Attendance reloads whenever the month cursor changes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const res = await api.get(`/api/coach-attendance/my/attendance?year=${year}&month=${month}`);
        if (alive) setAttendance({ records: res.data?.records || [], stats: res.data?.stats || null });
      } catch {
        if (alive) setAttendance({ records: [], stats: null });
      }
    })();
    return () => { alive = false; };
  }, [cursor]);

  const shiftMonth = (d) => {
    const n = new Date(cursor);
    n.setMonth(n.getMonth() + d);
    setCursor(n);
  };

  const fmtDate = (s) => new Date(s).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric',
  });

  const statusClass = (st) =>
    st === 'Present' ? 'mcp-badge mcp-present'
    : st === 'Absent' ? 'mcp-badge mcp-absent'
    : 'mcp-badge mcp-catchup';

  // ── No coach linked ──
  if (!loading && coaches.length === 0) {
    return (
      <div className="mcp-page">
        <div className="mcp-empty">
          <div className="mcp-empty-icon">🎓</div>
          <h2 className="mcp-empty-title">No coach linked yet</h2>
          <p className="mcp-empty-desc">
            When your coach adds you and marks your attendance, it will appear here.
          </p>
          <Link to="/dashboard" className="mcp-empty-btn">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mcp-page">
        <div className="mcp-loading">Loading your coach records…</div>
      </div>
    );
  }

  return (
    <div className="mcp-page">
      <div className="mcp-bg" />

      {blunderTask && (
        <BlunderAssignmentPlayer
          assignment={blunderTask}
          onClose={() => { setBlunderTask(null); reloadAssignments(); }}
          onGraded={() => { reloadAssignments(); }}
        />
      )}

      <div className="mcp-header">
        <h1 className="mcp-title">🎓 My Coach</h1>
        <p className="mcp-subtitle">Attendance & payments recorded by your coach</p>
      </div>

      {error && <div className="mcp-error">{error}</div>}

      <div className="mcp-tabs">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'assignments', label: '📋 Assignments' },
          { id: 'player', label: '👤 Player' },
          { id: 'attendance', label: '📝 Attendance' },
          { id: 'payments', label: '💰 Payments' },
        ].map(t => (
          <button
            key={t.id}
            className={`mcp-tab ${tab === t.id ? 'mcp-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Player (enrollment profile) ── */}
      {tab === 'player' && (
        <div className="mcp-section">
          {coaches.map(c => (
            <div key={c.linkId} className="mcp-player-card">
              {/* Hero */}
              <div className="mcp-player-hero">
                <div className="mcp-player-avatar">👨‍🏫</div>
                <div className="mcp-player-hero-text">
                  <div className="mcp-player-coach">{c.coachName}</div>
                  <div className="mcp-player-sub">
                    {c.studentName || 'Student'}
                    {c.onBreak && <span className="mcp-break-tag" style={{ marginLeft: 8 }}>On Break</span>}
                  </div>
                </div>
                <div className="mcp-player-code">
                  <span className="mcp-player-code-label">CODE</span>
                  <span className="mcp-player-code-val">{c.coachCode || '—'}</span>
                </div>
              </div>

              {/* Detail rows */}
              <div className="mcp-player-rows">
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">📅</span>
                  <span className="mcp-player-row-label">Classes / month</span>
                  <span className="mcp-player-row-val">{c.classesPerMonth || 0}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">💸</span>
                  <span className="mcp-player-row-label">Monthly fees</span>
                  <span className="mcp-player-row-val">{curSym(c.currency)}{c.fees || 0}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">👥</span>
                  <span className="mcp-player-row-label">Class type</span>
                  <span className="mcp-player-row-val">{c.classType || 'Private'}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">🗓️</span>
                  <span className="mcp-player-row-label">Joined</span>
                  <span className="mcp-player-row-val">{c.enrollmentDate ? fmtDate(c.enrollmentDate) : '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Assignments ── */}
      {tab === 'assignments' && (
        <div className="mcp-section">
          {assignments.length === 0 ? (
            <div className="mcp-empty" style={{ margin: '40px auto' }}>
              <div className="mcp-empty-icon">📋</div>
              <h2 className="mcp-empty-title">No assignments yet</h2>
              <p className="mcp-empty-desc">When your coach assigns you work, it will show up here.</p>
            </div>
          ) : (
            <div className="mcp-assign-list">
              {assignments.map(a => {
                const isPgn = a.assignmentType === 'custom' && a.pgnTask;
                const isTest = a.assignmentType === 'study_chapter';
                const isRush = a.assignmentType === 'puzzle_rush';
                const cur = isPgn ? (a.foundCount || 0) : (a.progress || 0);
                const tot = (isTest || isRush) ? 0 : (isPgn ? (a.pgnTask.findTarget || 0) : (a.targetCount || 0));
                const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 0;
                const statusLabel = a.status === 'completed' ? 'Completed' : a.status === 'in_progress' ? 'In progress' : 'Not started';
                const statusClass = a.status === 'completed' ? 'mcp-present' : a.status === 'in_progress' ? 'mcp-catchup' : 'mcp-absent';
                return (
                  <div key={a._id} className="mcp-assign-card">
                    <div className="mcp-assign-head">
                      <div className="mcp-assign-title">{a.title}</div>
                      <span className={`mcp-badge ${statusClass}`}>{statusLabel}</span>
                    </div>
                    {a.description && <div className="mcp-assign-desc">{a.description}</div>}
                    <div className="mcp-assign-meta">
                      <span>👨‍🏫 {a.coachName}</span>
                      {isPgn
                        ? <span>· 🔍 Find {a.pgnTask.findTarget || 0} blunder{(a.pgnTask.findTarget || 0) > 1 ? 's' : ''}</span>
                        : isTest
                          ? <span>· ⏱ Timed test{a.targetGrade > 0 ? ` · goal ${a.targetGrade}%` : ''}</span>
                          : isRush
                            ? <span>· ⚡ {a.rushTopicLabel || a.rushTopic || 'Mixed'} · {a.rushMinutes || 5} min{a.rushTargetSolved > 0 ? ` · goal ${a.rushTargetSolved}` : ''}</span>
                            : (a.topicName && <span>· {a.topicName}</span>)}
                      {a.dueDate && <span>· Due {fmtDate(a.dueDate)}</span>}
                    </div>
                    {tot > 0 && (
                      <div className="mcp-assign-progress">
                        <div className="mcp-assign-bar"><div style={{ width: `${pct}%` }} /></div>
                        <span className="mcp-assign-pct">{cur}/{tot}{isPgn ? ' found' : ''}</span>
                      </div>
                    )}
                    {(a.solved > 0 || a.failed > 0) && (
                      <div className="mcp-assign-stats">
                        ✅ {a.solved} solved · ❌ {a.failed} failed · 🔥 {a.maxStreak} best streak
                      </div>
                    )}
                    {(a.assignmentType === 'puzzle_topic' || a.assignmentType === 'custom' || a.assignmentType === 'study_chapter' || a.assignmentType === 'puzzle_rush') && a.status !== 'completed' && (
                      <button className="mcp-assign-btn" onClick={() => startAssignment(a)}>
                        {a.assignmentType === 'custom'
                          ? (a.status === 'in_progress' ? 'Continue finding →' : 'Find the blunders →')
                          : a.assignmentType === 'study_chapter'
                            ? (a.status === 'in_progress' ? 'Continue test →' : 'Take the test →')
                            : a.assignmentType === 'puzzle_rush'
                              ? (a.status === 'in_progress' ? 'Race again →' : 'Start race →')
                              : (a.status === 'in_progress' ? 'Continue assignment →' : 'Do assignment →')}
                      </button>
                    )}
                    {a.status === 'completed' && (
                      <div className="mcp-assign-done">✓ Completed{a.completedAt ? ` · ${fmtDate(a.completedAt)}` : ''}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="mcp-section">
          {/* Assignment stats for the selected month */}
          {(() => {
            const inCursorMonth = (d) => {
              if (!d) return false;
              const dt = new Date(d);
              return dt.getMonth() === cursor.getMonth() && dt.getFullYear() === cursor.getFullYear();
            };
            const finishedThisMonth = assignments.filter(
              a => a.status === 'completed' && inCursorMonth(a.completedAt)
            ).length;
            const pending = assignments.filter(a => a.status !== 'completed').length;
            // Average accuracy across assignments that have an accuracy value
            // (puzzle assignments report accuracy; blunder/test don't).
            const withAcc = assignments.filter(a => (a.accuracy || 0) > 0);
            const avgAccuracy = withAcc.length
              ? Math.round(withAcc.reduce((s, a) => s + (a.accuracy || 0), 0) / withAcc.length)
              : 0;
            return (
              <div className="mcp-stat-row" style={{ marginBottom: 20 }}>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">📋 {finishedThisMonth}</span>
                  <span className="mcp-stat-label">Assignments finished ({MONTHS[cursor.getMonth()]})</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">⏳ {pending}</span>
                  <span className="mcp-stat-label">Pending assignments</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">🎯 {avgAccuracy}%</span>
                  <span className="mcp-stat-label">Accuracy</span>
                </div>
              </div>
            );
          })()}

          {/* Assignments — NEW (not-yet-started) first, then in-progress. Finished
              assignments are NOT shown here (see the Assignments tab for those). */}
          {(() => {
            const rank = (s) => (s === 'pending' ? 0 : s === 'in_progress' ? 1 : 2);
            const sorted = [...assignments]
              .filter(a => a.status !== 'completed')
              .sort((a, b) => rank(a.status) - rank(b.status));
            const top = sorted.slice(0, 3); // show the most relevant few on Overview
            if (top.length === 0) return null;
            return (
              <div style={{ marginBottom: 20 }}>
                {top.map(a => {
                  const isNew = a.status === 'pending';
                  const isPgn = a.assignmentType === 'custom' && a.pgnTask;
                  const isTest = a.assignmentType === 'study_chapter';
                  const isRush = a.assignmentType === 'puzzle_rush';
                  const cur = isPgn ? (a.foundCount || 0) : (a.progress || 0);
                  const tot = isPgn ? (a.pgnTask.findTarget || 0) : (a.targetCount || 0);
                  const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 0;
                  const canStart = (a.assignmentType === 'puzzle_topic' || a.assignmentType === 'custom' || isTest || isRush) && a.status !== 'completed';
                  return (
                    <div key={a._id} className={`mcp-current-assign ${isNew ? 'mcp-assign-new' : ''}`}>
                      <div className="mcp-current-assign-label">
                        {isNew ? '🆕 New assignment' : a.status === 'completed' ? '✓ Assignment' : '📋 Current assignment'}
                      </div>
                      <div className="mcp-current-assign-title">{a.title}</div>
                      <div className="mcp-current-assign-row">
                        {isTest
                          ? <span>Timed test{a.targetGrade > 0 ? <> · goal <strong>{a.targetGrade}%</strong></> : null}</span>
                          : isRush
                            ? <span>⚡ {a.rushTopicLabel || a.rushTopic || 'Mixed'} · {a.rushMinutes || 5} min{a.rushTargetSolved > 0 ? <> · goal <strong>{a.rushTargetSolved}</strong></> : null}</span>
                            : <span>Your progress: <strong>{cur}/{tot}{isPgn ? ' found' : ''}</strong></span>}
                        <span>Students done: <strong>{a.completedStudents}/{a.totalStudents}</strong></span>
                      </div>
                      {!isTest && !isRush && <div className="mcp-assign-bar" style={{ marginTop: 8 }}><div style={{ width: `${pct}%` }} /></div>}
                      {canStart && (
                        <button className="mcp-assign-btn" style={{ marginTop: 12 }} onClick={() => startAssignment(a)}>
                          {a.assignmentType === 'custom'
                            ? (a.status === 'in_progress' ? 'Continue finding →' : 'Find the blunders →')
                            : isTest
                              ? (a.status === 'in_progress' ? 'Continue test →' : 'Take the test →')
                              : isRush
                                ? (a.status === 'in_progress' ? 'Race again →' : 'Start race →')
                                : (a.status === 'in_progress' ? 'Continue assignment →' : 'Do assignment →')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="mcp-stat-row">
            <div className="mcp-stat">
              <span className="mcp-stat-num">
                ✅ {attendance.stats ? attendance.stats.present + attendance.stats.catchUp : 0}
              </span>
              <span className="mcp-stat-label">Classes attended ({MONTHS[cursor.getMonth()]})</span>
            </div>
            <div className="mcp-stat">
              <span className="mcp-stat-num">💰 {payments.length}</span>
              <span className="mcp-stat-label">Payment records</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {tab === 'attendance' && (
        <div className="mcp-section">
          <div className="mcp-month-nav">
            <button className="mcp-nav-btn" onClick={() => shiftMonth(-1)}>← Prev</button>
            <span className="mcp-month-label">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
            <button className="mcp-nav-btn" onClick={() => shiftMonth(1)}>Next →</button>
          </div>

          <div className="mcp-table-wrap">
            <table className="mcp-table">
              <thead>
                <tr><th>Date</th><th>Coach</th><th>Status</th></tr>
              </thead>
              <tbody>
                {attendance.records.map((r, i) => (
                  <tr key={r._id || i}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.coachName}</td>
                    <td><span className={statusClass(r.status)}>{r.status}</span></td>
                  </tr>
                ))}
                {attendance.records.length === 0 && (
                  <tr><td colSpan="3" className="mcp-empty-row">No attendance recorded for this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <div className="mcp-section">
          {/* Class Payment request form */}
          {coaches.map(c => (
            <div key={c.linkId} className="mcp-coach-card" style={{ display: 'block', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 10 }}>💰 Class Payment — {c.coachName}</div>
              {payNotice && <div className="mcp-ok" style={{ color: '#34d399', marginBottom: 8 }}>✓ {payNotice}</div>}
              {payError && <div className="mcp-error" style={{ marginBottom: 8 }}>{payError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <label className="mcp-pay-field">
                  <span>Student name</span>
                  <input type="text" value={c.studentName || ''} readOnly style={{ opacity: 0.7 }} />
                </label>
                <label className="mcp-pay-field">
                  <span>Paid date</span>
                  <input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Payment from</span>
                  <input type="date" value={payForm.fromDate} onChange={e => setPayForm(f => ({ ...f, fromDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Payment till</span>
                  <input type="date" value={payForm.untilDate} onChange={e => setPayForm(f => ({ ...f, untilDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Amount ({curSym(c.currency)})</span>
                  <input type="number" min="1" value={payForm.amount} placeholder={String(c.fees || '')} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                </label>
              </div>
              <button
                className="mcp-tab mcp-tab-active"
                style={{ marginTop: 12, cursor: paySubmitting ? 'wait' : 'pointer' }}
                disabled={paySubmitting}
                onClick={() => submitFees(c)}
              >
                {paySubmitting ? 'Submitting…' : 'Submit my fees'}
              </button>
            </div>
          ))}

          <div className="mcp-table-wrap">
            <table className="mcp-table">
              <thead>
                <tr><th>Period</th><th>Coach</th><th>Amount</th><th>Paid On</th></tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p._id || i}>
                    <td>{fmtDate(p.fromDate)} – {fmtDate(p.untilDate)}</td>
                    <td>{p.coachName}</td>
                    <td>{curSym(p.currency)}{p.amount}</td>
                    <td>{fmtDate(p.datePaid)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan="4" className="mcp-empty-row">No payment records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
