import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CoachAttendance.css';

const getToday = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split('T')[0];
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS = { Present: '#10b981', Absent: '#ef4444', 'Catch-up': '#f59e0b' };

export default function CoachAttendance() {
  const navigate = useNavigate();

  const [students, setStudents]     = useState([]);
  const [selected, setSelected]     = useState(null); // { mongoId, name, username, ... }
  const [history, setHistory]       = useState([]);
  const [summary, setSummary]       = useState([]);

  // mark form
  const [markDate, setMarkDate]     = useState(getToday());
  const [markStatus, setMarkStatus] = useState('Present');
  const [marking, setMarking]       = useState(false);
  const [markMsg, setMarkMsg]       = useState('');

  // month nav
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingHistory, setLoadingHistory]   = useState(false);
  const [loadingSummary, setLoadingSummary]   = useState(true);
  const [error, setError] = useState('');

  // ── Load students ──────────────────────────────
  useEffect(() => {
    setLoadingStudents(true);
    api.get('/api/coach/attendance/students')
      .then(r => setStudents(r.data.students || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load students'))
      .finally(() => setLoadingStudents(false));
  }, []);

  // ── Load monthly summary ───────────────────────
  const loadSummary = useCallback(() => {
    setLoadingSummary(true);
    api.get(`/api/coach/attendance/summary?year=${viewYear}&month=${viewMonth}`)
      .then(r => setSummary(r.data.summary || []))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [viewYear, viewMonth]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Load history when student selected ────────
  const loadHistory = useCallback((mongoId) => {
    if (!mongoId) return;
    setLoadingHistory(true);
    api.get(`/api/coach/attendance/history/${mongoId}`)
      .then(r => setHistory(r.data.records || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const selectStudent = s => {
    setSelected(s);
    setMarkMsg('');
    loadHistory(s.mongoId);
  };

  // ── Mark attendance ────────────────────────────
  const handleMark = async () => {
    if (!selected) return;
    setMarking(true);
    setMarkMsg('');
    try {
      await api.post('/api/coach/attendance/mark', {
        studentId: selected.mongoId,
        date: markDate,
        status: markStatus
      });
      setMarkMsg(`✓ ${markStatus} marked for ${fmtDate(markDate)}`);
      loadHistory(selected.mongoId);
      loadSummary();
    } catch (e) {
      setMarkMsg('⚠ ' + (e.response?.data?.message || 'Failed'));
    } finally {
      setMarking(false);
    }
  };

  // ── Delete record ──────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api.delete(`/api/coach/attendance/${id}`);
      setHistory(h => h.filter(r => r._id !== id));
      loadSummary();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Month navigation ───────────────────────────
  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  // Filter history to selected month for the inline chart
  const monthHistory = history.filter(r => {
    const d = new Date(r.date);
    const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
    return ist.getUTCFullYear() === viewYear && ist.getUTCMonth() + 1 === viewMonth;
  });

  return (
    <div className="coach-dash">
      {/* ── Back ─── */}
      <div className="csd-back">
        <button onClick={() => navigate('/coach/dashboard')} className="btn-ghost">← Dashboard</button>
      </div>

      <div className="ca-header">
        <h1>📋 Attendance</h1>
        <p>Track and mark class attendance for your students</p>
      </div>

      {error && <div className="coach-error">⚠ {error}</div>}

      <div className="ca-layout">
        {/* ── LEFT: student list ──────────────────── */}
        <div className="ca-sidebar">
          <div className="coach-section">
            <div className="coach-section-head"><h2>Students</h2></div>
            {loadingStudents ? (
              <div className="coach-empty">Loading…</div>
            ) : students.length === 0 ? (
              <div className="coach-empty">No active students yet.</div>
            ) : (
              <ul className="ca-student-list">
                {students.map(s => (
                  <li
                    key={s.mongoId}
                    className={`ca-student-item${selected?.mongoId === s.mongoId ? ' ca-selected' : ''}`}
                    onClick={() => selectStudent(s)}
                  >
                    <div className="ca-student-avatar">{(s.name || s.username || '?')[0].toUpperCase()}</div>
                    <div className="ca-student-info">
                      <div className="ca-student-name">{s.name}</div>
                      <div className="ca-student-sub">@{s.username}{s.groupTag ? ` · ${s.groupTag}` : ''}</div>
                    </div>
                    {(() => {
                      const row = summary.find(x => String(x.mongoId) === String(s.mongoId));
                      return row ? (
                        <div className="ca-student-badge" title={`${row.present} present / ${row.absent} absent`}>
                          <span style={{ color: '#10b981' }}>{row.present}P</span>
                          {' '}<span style={{ color: '#ef4444' }}>{row.absent}A</span>
                        </div>
                      ) : null;
                    })()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── RIGHT: detail panel ─────────────────── */}
        <div className="ca-main">

          {/* Monthly summary */}
          <div className="coach-section">
            <div className="coach-section-head">
              <h2>
                <button className="ca-month-btn" onClick={prevMonth}>‹</button>
                {' '}{MONTHS[viewMonth - 1]} {viewYear}{' '}
                <button className="ca-month-btn" onClick={nextMonth}>›</button>
              </h2>
            </div>
            {loadingSummary ? (
              <div className="coach-empty">Loading…</div>
            ) : summary.length === 0 ? (
              <div className="coach-empty">No data for this month.</div>
            ) : (
              <div className="csd-table-wrap">
                <table className="csd-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Group</th>
                      <th style={{ color: '#10b981' }}>Present</th>
                      <th style={{ color: '#ef4444' }}>Absent</th>
                      <th>Total</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(row => {
                      const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : null;
                      return (
                        <tr
                          key={row.mongoId}
                          className={selected?.mongoId === String(row.mongoId) ? 'ca-row-active' : ''}
                          onClick={() => selectStudent(students.find(s => String(s.mongoId) === String(row.mongoId)) || row)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{row.name}</td>
                          <td>{row.groupTag || '—'}</td>
                          <td className="cell-good">{row.present}</td>
                          <td className="cell-bad">{row.absent}</td>
                          <td>{row.total}</td>
                          <td>
                            {pct != null ? (
                              <span className={`acc-pill ${pct >= 75 ? 'acc-high' : pct >= 50 ? 'acc-mid' : 'acc-low'}`}>
                                {pct}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mark attendance + history — only when student selected */}
          {selected ? (
            <>
              {/* Mark form */}
              <div className="coach-section">
                <div className="coach-section-head">
                  <h2>Mark attendance — {selected.name}</h2>
                </div>
                <div className="ca-mark-form">
                  <div className="ca-mark-row">
                    <label>Date</label>
                    <input
                      type="date"
                      value={markDate}
                      max={getToday()}
                      onChange={e => setMarkDate(e.target.value)}
                      className="ca-input"
                    />
                  </div>
                  <div className="ca-mark-row">
                    <label>Status</label>
                    <div className="ca-status-btns">
                      {['Present', 'Absent', 'Catch-up'].map(s => (
                        <button
                          key={s}
                          className={`ca-status-btn${markStatus === s ? ' ca-status-active' : ''}`}
                          style={markStatus === s ? { background: STATUS_COLORS[s] } : {}}
                          onClick={() => setMarkStatus(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="ca-mark-submit" onClick={handleMark} disabled={marking}>
                    {marking ? 'Marking…' : 'Mark Attendance'}
                  </button>
                  {markMsg && <div className="ca-mark-msg">{markMsg}</div>}
                </div>
              </div>

              {/* History */}
              <div className="coach-section">
                <div className="coach-section-head">
                  <h2>📅 History — {selected.name}</h2>
                  <span className="ca-history-sub">(last 60 records)</span>
                </div>
                {loadingHistory ? (
                  <div className="coach-empty">Loading…</div>
                ) : history.length === 0 ? (
                  <div className="coach-empty">No attendance records yet.</div>
                ) : (
                  <div className="csd-table-wrap">
                    <table className="csd-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Marked at</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(r => (
                          <tr key={r._id}>
                            <td>{fmtDate(r.date)}</td>
                            <td>
                              <span
                                className="ca-status-pill"
                                style={{ background: STATUS_COLORS[r.status] + '33', color: STATUS_COLORS[r.status], border: `1px solid ${STATUS_COLORS[r.status]}` }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                              {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            <td>
                              <button className="ca-del-btn" onClick={() => handleDelete(r._id)} title="Delete">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="coach-section">
              <div className="coach-empty">← Select a student to mark or view attendance</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
