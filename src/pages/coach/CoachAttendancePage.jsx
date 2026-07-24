import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '../../api';
import CoachChatFab from '../../components/coach/CoachChatFab';
import './CoachAttendancePage.css';

// ─── IST helpers ────────────────────────────────────────────────────────────
const IST = 'Asia/Kolkata';
const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: IST }); // YYYY-MM-DD
const fmtIST   = (d) => new Date(d).toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium' });
const monthName = (y, m) => new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

// ─── Status badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  const cls = s === 'Present' ? 'badge-present' : s === 'Absent' ? 'badge-absent' : 'badge-catchup';
  return <span className={`cap-badge ${cls}`}>{s}</span>;
};

// ─── Download bar (attendance + payments CSV) ─────────────────────────────────
function DownloadBar() {
  const [players, setPlayers] = useState([]);
  const [range, setRange]     = useState('1');   // '1' = this month, '6' = past 6 months
  const [student, setStudent] = useState('all'); // 'all' or a studentId
  const [busy, setBusy]       = useState('');

  useEffect(() => {
    api.get('/api/coach-attendance/players')
      .then(r => setPlayers((r.data || []).filter(p => p.studentId)))
      .catch(() => setPlayers([]));
  }, []);

  // Download a CSV through axios so the auth token is sent (a plain link can't).
  const download = async (kind) => {
    setBusy(kind);
    try {
      const url = `/api/coach-attendance/${kind}/export.csv?months=${range}&studentId=${student}`;
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${kind}-${range}mo.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      alert('Could not download. Try again.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="cap-card" style={{ marginBottom: 20 }}>
      <div className="cap-card-hdr" style={{ justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>⬇️ Download reports</h3>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="cap-label">Period</label>
          <select className="cap-input" value={range} onChange={e => setRange(e.target.value)}>
            <option value="1">This month</option>
            <option value="6">Past 6 months</option>
          </select>
        </div>
        <div>
          <label className="cap-label">Student</label>
          <select className="cap-input" value={student} onChange={e => setStudent(e.target.value)}>
            <option value="all">All students</option>
            {players.map(p => (
              <option key={p._id} value={p.studentId}>{p.studentName}</option>
            ))}
          </select>
        </div>
        <button className="cap-btn cap-btn-cyan" disabled={busy === 'attendance'} onClick={() => download('attendance')}>
          {busy === 'attendance' ? 'Preparing…' : '📝 Attendance CSV'}
        </button>
        <button className="cap-btn cap-btn-green" disabled={busy === 'payments'} onClick={() => download('payments')}>
          {busy === 'payments' ? 'Preparing…' : '💰 Payments CSV'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CoachAttendancePage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="cap-wrap">
      <div className="cap-header">
        <div>
          <h1 className="cap-title">📋 Coach Attendance</h1>
          <p className="cap-sub">Track your players' classes, payments and progress</p>
        </div>
      </div>

      <div className="cap-tabs">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'players',   label: '👥 Players' },
          { id: 'attendance',label: '📝 Attendance' },
          { id: 'payments',  label: '💰 Payments' },
          { id: 'requests',  label: '📋 Requests' },
          { id: 'history',   label: '📚 History' },
        ].map(t => (
          <button key={t.id} className={`cap-tab${tab === t.id ? ' cap-tab-active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="cap-body">
        {tab === 'dashboard'  && <TabDashboard />}
        {tab === 'players'    && <TabPlayers />}
        {tab === 'attendance' && <TabAttendance />}
        {tab === 'payments'   && <TabPayments />}
        {tab === 'requests'   && <TabRequests />}
        {tab === 'history'    && <TabHistory />}
      </div>

      {/* Floating message button (opens coach chat popup). */}
      <CoachChatFab />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function TabDashboard() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  // Sortable monthly summary: key + direction.
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  // Derived per-row values (attended = present + catch-up; % of monthly quota).
  const rowVals = (s) => {
    const attended = (s.present || 0) + (s.catchUp || 0);
    const pct = s.classesPerMonth > 0 ? Math.round((attended / s.classesPerMonth) * 100) : null;
    return { attended, pct };
  };

  const toggleSort = (key) =>
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  const sortedSummary = (() => {
    // Students on break are excluded from the monthly summary — they've dropped out
    // of the active roster (like Mark Attendance and the Players tab), and live only
    // in the Payments tab. Showing them here (even with a badge) was confusing.
    const rows = (data?.summary || []).filter(s => !s.onBreak);
    const { key, dir } = sort;
    const val = (s) => {
      const { attended, pct } = rowVals(s);
      switch (key) {
        case 'name':      return (s.studentName || '').toLowerCase();
        case 'attended':  return attended;
        case 'remaining': return s.remaining || 0;
        case 'paid':      return s.paid ? 1 : 0;
        case 'pct':       return pct == null ? -1 : pct;
        default:          return 0;
      }
    };
    rows.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  })();

  const sortArrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/coach-attendance/attendance/summary?year=${year}&month=${month}`);
      setData(r.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Also fetch top stats
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/api/coach-attendance/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <DownloadBar />
      {stats && (
        <div className="cap-stat-row">
          <div className="cap-stat-card cap-stat-cyan">
            <div className="cap-stat-num">{stats.totalPlayers}</div>
            <div className="cap-stat-lbl">Total Players</div>
          </div>
          <div className="cap-stat-card cap-stat-green">
            <div className="cap-stat-num">{stats.paidThisMonth}</div>
            <div className="cap-stat-lbl">Paid This Month</div>
          </div>
          <div className="cap-stat-card cap-stat-gold">
            <div className="cap-stat-num">{stats.classesToday}</div>
            <div className="cap-stat-lbl">Classes Today</div>
          </div>
        </div>
      )}

      <div className="cap-card" style={{ marginTop: 24 }}>
        <div className="cap-card-hdr">
          <button className="cap-icon-btn" onClick={prevMonth}>‹</button>
          <h3 style={{ margin: 0 }}>{monthName(year, month)}</h3>
          <button className="cap-icon-btn" onClick={nextMonth}>›</button>
        </div>

        {loading ? (
          <p className="cap-muted">Loading…</p>
        ) : !data || !sortedSummary.length ? (
          <p className="cap-muted">No enrolled players found.</p>
        ) : (
          <div className="cap-table-wrap">
            <table className="cap-table">
              <thead><tr>
                <th className="cap-th-sort" onClick={() => toggleSort('name')}>Player{sortArrow('name')}</th>
                <th className="cap-th-sort" onClick={() => toggleSort('attended')} title="Present + Catch-up this month">Classes{sortArrow('attended')}</th>
                <th className="cap-th-sort" onClick={() => toggleSort('remaining')}>Remaining{sortArrow('remaining')}</th>
                <th className="cap-th-sort" onClick={() => toggleSort('paid')}>Fees{sortArrow('paid')}</th>
                <th className="cap-th-sort" onClick={() => toggleSort('pct')} title="Attended ÷ classes per month">Attendance %{sortArrow('pct')}</th>
              </tr></thead>
              <tbody>
                {sortedSummary.map(s => {
                  const { attended, pct } = rowVals(s);
                  return (
                    <tr key={s.studentId}>
                      <td>{s.studentName}</td>
                      <td><span className="cap-td-present">{attended}</span></td>
                      <td>{s.remaining}</td>
                      <td>
                        <span className={s.paid ? 'cap-fee-paid' : 'cap-fee-unpaid'}>
                          {s.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td>{pct == null ? <span className="cap-muted">—</span> : `${pct}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: PLAYERS
// ════════════════════════════════════════════════════════════════════════════
function TabPlayers() {
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [search,  setSearch]    = useState('');
  const [editing, setEditing]   = useState(null);   // linkId being edited
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/api/coach-attendance/players');
      setPlayers(r.data);
    } catch (e) {
      setError(e?.response?.data?.error || `Could not load players (${e?.response?.status || 'network error'})`);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const startEdit = (p) => {
    setEditing(p._id);
    setForm({
      classesPerMonth: p.classesPerMonth || 0,
      fees: p.fees || 0,
      currency: p.currency || 'INR',
      classType: p.classType || 'Private',
      enrollmentDate: p.enrollmentDate ? p.enrollmentDate.slice(0, 10) : ''
    });
    setMsg('');
  };

  const saveEnroll = async (linkId) => {
    setSaving(true);
    try {
      await api.put(`/api/coach-attendance/players/${linkId}/enroll`, form);
      setMsg('Saved!');
      await load();
      setTimeout(() => { setEditing(null); setMsg(''); }, 800);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  // Put a player on break. They drop out of this tab (and out of Mark Attendance)
  // and appear in the Payments tab, which is where Rejoin lives.
  const putOnBreak = async (linkId) => {
    try {
      await api.put(`/api/coach-attendance/players/${linkId}/break`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error');
    }
  };

  // Remove a player from the roster. This is the SOFT delete on the coach-student
  // link (active:false + archivedAt) — attendance and payment history are kept,
  // and the coach's student count is decremented. It is not a data wipe.
  const removePlayer = async (p) => {
    const name = p.studentName || 'this player';
    if (!window.confirm(
      `Remove ${name} from your roster?\n\n` +
      `Their past attendance and payments are kept, but they will no longer ` +
      `appear here and you can't mark them present.`
    )) return;
    try {
      await api.delete(`/api/coach/students/${p._id}`);
      if (editing === p._id) setEditing(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e?.response?.data?.error || 'Could not remove player');
    }
  };

  // Students on break live in the Payments tab (with a Rejoin button), not here.
  const onBreakCount = players.filter(p => p.onBreak).length;
  const filtered = players.filter(p =>
    !p.onBreak && (
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (p.studentUsername || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) return <p className="cap-muted">Loading players…</p>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="cap-input" placeholder="Search players…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="cap-muted" style={{ fontSize: 13 }}>
          {players.filter(p => p.enrolled && !p.onBreak).length} active
          {onBreakCount > 0 && `, ${onBreakCount} on break`}
        </span>
        <button className="cap-btn cap-btn-ghost" onClick={load} style={{ fontSize: 12 }}>↻ Refresh</button>
      </div>

      {onBreakCount > 0 && (
        <p className="cap-muted" style={{ fontSize: 13, marginTop: -4, marginBottom: 16 }}>
          ⏸ {onBreakCount} student{onBreakCount === 1 ? '' : 's'} on break — rejoin them from the <strong>Payments</strong> tab.
        </p>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error} — make sure the backend server is running with the latest code.
        </div>
      )}

      {!error && !filtered.length && <p className="cap-muted">No players found. Add students via the main Coach Dashboard first.</p>}

      {!!filtered.length && (
        <div className="cap-table-wrap">
          <table className="cap-table">
            <thead><tr>
              <th>Player</th>
              <th>Status</th>
              <th>Classes/mo</th>
              <th>Fee</th>
              <th>Type</th>
              <th>Since</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <Fragment key={p._id}>
                  <tr>
                    <td>
                      <div className="cap-td-player">{p.studentName}</div>
                      <div className="cap-muted" style={{ fontSize: 12 }}>@{p.studentUsername || '—'}</div>
                    </td>
                    <td>
                      {p.enrolled
                        ? <span className="cap-fee-paid">Enrolled</span>
                        : <span className="cap-muted">Not enrolled</span>}
                    </td>
                    <td>{p.enrolled ? p.classesPerMonth : <span className="cap-muted">—</span>}</td>
                    <td>{p.enrolled ? `${p.currency} ${(p.fees || 0).toLocaleString()}` : <span className="cap-muted">—</span>}</td>
                    <td>{p.classType || 'Private'}</td>
                    <td>{p.enrollmentDate ? fmtIST(p.enrollmentDate) : <span className="cap-muted">—</span>}</td>
                    <td>
                      <div className="cap-row-actions">
                        <button className="cap-btn cap-btn-ghost"
                          onClick={() => editing === p._id ? setEditing(null) : startEdit(p)}>
                          {editing === p._id ? 'Cancel' : p.enrolled ? 'Edit' : 'Enroll'}
                        </button>
                        {/* Break moves the player to the Payments tab, where Rejoin lives. */}
                        {p.enrolled && (
                          <button className="cap-btn cap-btn-warn" onClick={() => putOnBreak(p._id)}>Break</button>
                        )}
                        <button className="cap-btn cap-btn-danger" onClick={() => removePlayer(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline enrollment editor, expanded under the player's row. */}
                  {editing === p._id && (
                    <tr className="cap-row-edit">
                      <td colSpan={7}>
                        <div className="cap-enroll-form">
                          <div className="cap-form-row">
                            <label>Classes / Month</label>
                            <input type="number" className="cap-input" min="0" value={form.classesPerMonth}
                              onChange={e => setForm(f => ({ ...f, classesPerMonth: e.target.value }))} />
                          </div>
                          <div className="cap-form-row">
                            <label>Monthly Fee</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <select className="cap-input" style={{ width: 80 }} value={form.currency}
                                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                              </select>
                              <input type="number" className="cap-input" min="0" value={form.fees}
                                onChange={e => setForm(f => ({ ...f, fees: e.target.value }))} />
                            </div>
                          </div>
                          <div className="cap-form-row">
                            <label>Class Type</label>
                            <select className="cap-input" value={form.classType}
                              onChange={e => setForm(f => ({ ...f, classType: e.target.value }))}>
                              <option>Private</option><option>Group</option><option>Online</option>
                            </select>
                          </div>
                          <div className="cap-form-row">
                            <label>Enrollment Date</label>
                            <input type="date" className="cap-input" value={form.enrollmentDate}
                              onChange={e => setForm(f => ({ ...f, enrollmentDate: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <button className="cap-btn cap-btn-cyan" disabled={saving} onClick={() => saveEnroll(p._id)}>
                              {saving ? 'Saving…' : 'Save Enrollment'}
                            </button>
                            {msg && <span style={{ color: msg === 'Saved!' ? '#10b981' : '#fca5a5', fontSize: 13 }}>{msg}</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Paste-to-mark attendance ─────────────────────────────────────────────────
// Two-step, safe-by-design: (1) paste names + pick a status → "Preview" asks the
// server for the exact plan (no writes); (2) review the plan → "Confirm & Mark"
// applies it. Matching is exact (display name OR username); ambiguous / unknown
// names are never marked. Only the chosen date is affected.
const OUTCOME_META = {
  will_mark: { label: 'Will mark', color: '#10b981', icon: '✓' },
  marked:    { label: 'Marked',    color: '#10b981', icon: '✓' },
  already:   { label: 'Already',   color: '#38bdf8', icon: '•' },
  on_break:  { label: 'On break',  color: '#fbbf24', icon: '⏸' },
  full:      { label: 'Both classes full', color: '#fbbf24', icon: '⚠' },
  ambiguous: { label: 'Ambiguous', color: '#fca5a5', icon: '⚠' },
  not_found: { label: 'Not found', color: '#fca5a5', icon: '✗' },
  duplicate: { label: 'Duplicate', color: '#94a3b8', icon: '↺' },
};

function PasteMarker({ selDate, onApplied }) {
  const [open, setOpen]       = useState(false);
  const [status, setStatus]   = useState('Present');
  // Each status keeps its OWN pasted list. Switching Present → Absent must NOT
  // carry over the names you typed for Present.
  const [texts, setTexts]     = useState({ Present: '', Absent: '', 'Catch-up': '' });
  const [preview, setPreview] = useState(null);   // server dry-run response
  const [applied, setApplied] = useState(null);   // server apply response (what was actually written)
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState('');

  const text = texts[status];
  const setText = (val) =>
    setTexts(prev => ({ ...prev, [status]: typeof val === 'function' ? val(prev[status]) : val }));

  // Split pasted text into names: one per line, also allow comma separation.
  const parseNames = (raw) =>
    raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  // Any time the inputs that affect the plan change, invalidate a stale preview
  // so a coach can never confirm a plan that doesn't match what's on screen.
  const invalidate = () => { if (preview) setPreview(null); if (applied) setApplied(null); };

  // Changing the chosen date (e.g. to a previous day) must invalidate a preview
  // that was built for the old date — the plan only makes sense for one date.
  useEffect(() => { setPreview(null); setApplied(null); setMsg(''); }, [selDate]);

  const doPreview = async () => {
    const names = parseNames(text);
    if (!names.length) { setMsg('Paste at least one name.'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/api/coach-attendance/attendance/bulk-paste', {
        date: selDate, status, names, dryRun: true,
      });
      setPreview(r.data);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Could not build preview.');
    } finally {
      setBusy(false);
    }
  };

  const doApply = async () => {
    const names = parseNames(text);
    if (!names.length) return;
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/api/coach-attendance/attendance/bulk-paste', {
        date: selDate, status, names, dryRun: false,
      });
      // The server now returns the TRUE per-row result (marked vs skipped), so we
      // display it as-is rather than assuming the plan succeeded.
      setApplied(r.data);
      setMsg(`✓ Marked ${r.data.created} student(s) as ${status} on ${selDate}.`);
      setPreview(null);
      setText('');
      onApplied && onApplied();   // refresh the live attendance rows + summary below
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Could not apply.');
    } finally {
      setBusy(false);
    }
  };

  const s = preview?.summary;

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 14 }}>
      <button className="cap-btn cap-btn-ghost" onClick={() => setOpen(o => !o)} style={{ fontSize: 13 }}>
        {open ? '▾' : '▸'} 📋 Paste names to mark attendance
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 12 }}>
            Paste student names (one per line). They’ll be marked <strong>only for {selDate}</strong>.
            Names are matched exactly to a player’s display name or username — anything that doesn’t
            match is shown but never marked. Review the preview before confirming.
          </div>

          {/* Status selector — this box decides the status applied to all pasted names */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {['Present', 'Absent', 'Catch-up'].map(st => (
              <button key={st}
                className={`cap-att-btn${status === st ? ` cap-att-btn-${st.toLowerCase().replace('-up','up')}` : ''}`}
                onClick={() => { setStatus(st); setPreview(null); setApplied(null); setMsg(''); }}>
                Paste {st} here
              </button>
            ))}
          </div>

          <textarea
            className="cap-input"
            style={{ width: '100%', minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder={`Paste ${status} names here — one per line\nAarav Kumar\npriya_2015\n…`}
            value={text}
            onChange={e => { setText(e.target.value); invalidate(); }}
          />

          {/* Two-step flow hint — Preview first, then Confirm. Keeps coaches from
              thinking "Preview" did the marking (it doesn't — it only shows the plan). */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 6 }}>
            {!preview
              ? <>① <strong>Preview match</strong> to check the names → ② then a <strong>Confirm &amp; mark</strong> button appears to save.</>
              : <>Review the plan below, then click <strong style={{ color: '#10b981' }}>Confirm &amp; mark</strong> to actually save it.</>}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {!preview ? (
              <button className="cap-btn cap-btn-cyan" disabled={busy} onClick={doPreview}>
                {busy ? 'Checking…' : '🔍 Step 1 — Preview match'}
              </button>
            ) : (
              <>
                <button className="cap-btn cap-btn-green" disabled={busy || (s?.willMark ?? 0) === 0} onClick={doApply}>
                  {busy ? 'Marking…' : `✓ Step 2 — Confirm & mark ${s?.willMark ?? 0} as ${status}`}
                </button>
                <button className="cap-btn cap-btn-ghost" disabled={busy} onClick={() => setPreview(null)}>
                  Edit list
                </button>
              </>
            )}
            {msg && <span style={{ fontSize: 13, color: msg.startsWith('✓') ? '#10b981' : '#fca5a5' }}>{msg}</span>}
          </div>

          {preview && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, marginBottom: 10 }}>
                <span style={{ color: '#10b981' }}>Will mark: <strong>{s.willMark}</strong></span>
                <span style={{ color: '#38bdf8' }}>Already: <strong>{s.already}</strong></span>
                {s.notFound > 0 && <span style={{ color: '#fca5a5' }}>Not found: <strong>{s.notFound}</strong></span>}
                {s.ambiguous > 0 && <span style={{ color: '#fca5a5' }}>Ambiguous: <strong>{s.ambiguous}</strong></span>}
                {s.onBreak > 0 && <span style={{ color: '#fbbf24' }}>On break: <strong>{s.onBreak}</strong></span>}
                {s.full > 0 && <span style={{ color: '#fbbf24' }}>Classes full: <strong>{s.full}</strong></span>}
                {s.duplicate > 0 && <span style={{ color: '#94a3b8' }}>Duplicates: <strong>{s.duplicate}</strong></span>}
              </div>
              <div className="cap-table-wrap">
                <table className="cap-table">
                  <thead><tr><th>Pasted</th><th>Matched player</th><th>Result</th></tr></thead>
                  <tbody>
                    {preview.results.map((r, i) => {
                      const meta = OUTCOME_META[r.outcome] || { label: r.outcome, color: '#94a3b8', icon: '•' };
                      return (
                        <tr key={i}>
                          <td>{r.input}</td>
                          <td>{r.studentName || <span className="cap-muted">—</span>}</td>
                          <td style={{ color: meta.color, fontWeight: 600 }}>
                            {meta.icon} {r.message || meta.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AFTER applying: show exactly what was written, so the coach has clear
              confirmation without hunting through the player list below. */}
          {applied && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>
                ✓ Done — {applied.created} marked as {applied.status} on {applied.date}
              </div>
              <div className="cap-table-wrap">
                <table className="cap-table">
                  <thead><tr><th>Pasted</th><th>Matched player</th><th>Result</th></tr></thead>
                  <tbody>
                    {applied.results.map((r, i) => {
                      const meta = OUTCOME_META[r.outcome] || { label: r.outcome, color: '#94a3b8', icon: '•' };
                      return (
                        <tr key={i}>
                          <td>{r.input}</td>
                          <td>{r.studentName || <span className="cap-muted">—</span>}</td>
                          <td style={{ color: meta.color, fontWeight: 600 }}>
                            {meta.icon} {r.message || meta.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="cap-muted" style={{ fontSize: 12, marginTop: 8 }}>
                These marks are now saved and shown in the list below.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: ATTENDANCE
// ════════════════════════════════════════════════════════════════════════════
function TabAttendance() {
  const [selDate, setSelDate]   = useState(todayIST());
  const [players, setPlayers]   = useState([]);
  const [records, setRecords]   = useState([]);   // records for selDate
  const [saving,  setSaving]    = useState('');   // studentId being saved

  const loadPlayers = useCallback(async () => {
    try {
      const r = await api.get('/api/coach-attendance/players');
      // Show all active students — enrollment (fees/classType) is optional, not a gate
      setPlayers(r.data.filter(p => !p.onBreak));
    } catch {
      setPlayers([]);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      const r = await api.get(`/api/coach-attendance/attendance/date/${selDate}`);
      setRecords(r.data);
    } catch {
      setRecords([]);
    }
  }, [selDate]);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Every entry this student has on the selected day, oldest first. A student can
  // have any number (second class, make-up lesson) — same as the admin's Teacher
  // Attendance. Records written before `slot` existed are treated as slot 1.
  const entriesFor = (studentId) =>
    records
      .filter(r => r.studentId.toString() === studentId.toString())
      .sort((a, b) => (a.slot || 1) - (b.slot || 1));

  // Map studentId → name for the confirmation log (records don't carry names).
  const nameFor = (studentId) => {
    const p = players.find(x => x.studentId?.toString() === studentId?.toString());
    return p?.studentName || 'Student';
  };
  // Entries the coach marked for this date, newest edit first (for the log).
  const markedLog = [...records]
    .filter(r => r.status)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const fmtEntryTime = (r) => {
    const t = r.updatedAt || r.createdAt;
    if (!t) return '';
    return new Date(t).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Add another entry for this student today. Omitting `slot` tells the server to
  // append the next one, so pressing "+ Present" twice logs two classes rather
  // than overwriting the first — exactly how the admin's Teacher Attendance works.
  const addEntry = async (studentId, status) => {
    setSaving(`${studentId}-add`);
    try {
      await api.post('/api/coach-attendance/attendance/mark', { studentId, date: selDate, status });
      await loadRecords();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error marking attendance');
    } finally {
      setSaving('');
    }
  };

  // Remove one entry (the × on a chip).
  const removeEntry = async (studentId, recordId) => {
    setSaving(`${studentId}-del`);
    try {
      await api.delete(`/api/coach-attendance/attendance/${recordId}`);
      await loadRecords();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error removing entry');
    } finally {
      setSaving('');
    }
  };

  const istNow = new Date().toLocaleString('en-IN', { timeZone: IST, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="cap-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label className="cap-label">Date (IST)</label>
            <input type="date" className="cap-input" value={selDate}
              onChange={e => setSelDate(e.target.value)} />
          </div>
          <div className="cap-muted" style={{ fontSize: 13 }}>
            Today: {istNow}
          </div>
        </div>

        {/* Paste-to-mark: paste a list of names, preview the plan, then apply.
            Marks ONLY the selected date above. Nothing is written until you
            review the preview and click Confirm. */}
        <PasteMarker selDate={selDate} onApplied={loadRecords} />
      </div>

      {!players.length ? (
        <p className="cap-muted">No players found. Add students in the main Coach Dashboard, then come back here.</p>
      ) : (
        <div className="cap-card">
          <h3 className="cap-card-title">Mark Attendance — {new Date(selDate + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'full' })}</h3>
          <div className="cap-att-list">
            {players.filter(p => !p.onBreak).map(p => {
              const entries = entriesFor(p.studentId);
              const busy = saving.startsWith(`${p.studentId}-`);
              return (
                <div key={p._id} className="cap-att-row">
                  <div className="cap-att-avatar">{(p.studentName || '?')[0].toUpperCase()}</div>
                  <div className="cap-att-name">{p.studentName}</div>

                  <div className="cap-att-mark">
                    {/* One set of buttons. Each press ADDS an entry for today. */}
                    <div className="cap-att-btns">
                      {['Present', 'Absent', 'Catch-up'].map(s => (
                        <button key={s} disabled={busy}
                          className={`cap-att-btn cap-att-add-${s.toLowerCase().replace('-up', 'up')}`}
                          onClick={() => addEntry(p.studentId, s)}>
                          + {s}
                        </button>
                      ))}
                      {busy && <span className="cap-muted" style={{ fontSize: 12 }}>…</span>}
                    </div>

                    {/* Today's entries — a chip per class, with a × to remove it. */}
                    {entries.length > 0 && (
                      <div className="cap-att-entries">
                        {entries.map(r => (
                          <span key={r._id} className="cap-att-chip">
                            <StatusBadge s={r.status} />
                            <span className="cap-att-chip-time">
                              {new Date(r.createdAt || r.date).toLocaleTimeString('en-IN', {
                                timeZone: IST, hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            <button className="cap-att-chip-x" title="Remove this entry"
                              disabled={busy}
                              onClick={() => removeEntry(p.studentId, r._id)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cap-att-summary">
            <span>Present: <strong className="cap-td-present">{records.filter(r => r.status === 'Present').length}</strong></span>
            <span>Absent: <strong className="cap-td-absent">{records.filter(r => r.status === 'Absent').length}</strong></span>
            <span>Catch-up: <strong className="cap-td-catchup">{records.filter(r => r.status === 'Catch-up').length}</strong></span>
          </div>

          {/* Confirmation log — what you marked for this date + when you entered it,
              so you can double-check attendance was recorded correctly. */}
          {markedLog.length > 0 && (
            <div className="cap-att-log">
              <h4 className="cap-att-log-title">✓ Marked entries for this date</h4>
              <div className="cap-table-wrap">
                <table className="cap-table">
                  <thead><tr>
                    <th>Player</th>
                    <th>Status</th>
                    <th>Class</th>
                    <th>Entered</th>
                  </tr></thead>
                  <tbody>
                    {markedLog.map(r => (
                      <tr key={r._id}>
                        <td>{nameFor(r.studentId)}</td>
                        <td><StatusBadge s={r.status} /></td>
                        <td>Class {r.slot || 1}</td>
                        <td className="cap-muted">{fmtEntryTime(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: PAYMENTS
// ════════════════════════════════════════════════════════════════════════════
function TabPayments() {
  const [players,  setPlayers]  = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [filterP,  setFilterP]  = useState('');

  const [form, setForm] = useState({
    studentId: '', amount: '', currency: 'INR',
    datePaid: todayIST(), fromDate: '', untilDate: '', notes: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [pr, pl] = await Promise.all([
        api.get('/api/coach-attendance/payments'),
        api.get('/api/coach-attendance/players')
      ]);
      setPayments(pr.data);
      // Every enrolled player, on break or not — going on break sets `onBreak`
      // but leaves `enrolled` true, so break students stay in this list and
      // playerName() can still resolve them for the break payments table.
      setPlayers(pl.data.filter(p => p.enrolled));
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Active roster drives the "Add payment" form and the filter dropdown — you
  // don't normally record a new payment against a student who's on break.
  const activePlayers = players.filter(p => !p.onBreak);
  const breakPlayers  = players.filter(p => p.onBreak);
  const breakIds = new Set(breakPlayers.map(p => p.studentId.toString()));

  const playerName = (id) => {
    const p = players.find(x => x.studentId.toString() === id.toString());
    return p ? p.studentName : id;
  };

  // Bring a student back from break. They reappear in the Players tab and can be
  // marked present again. Lives here because break students are only listed here.
  const rejoin = async (linkId) => {
    try {
      await api.put(`/api/coach-attendance/players/${linkId}/rejoin`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Could not rejoin player');
    }
  };

  const handleAdd = async () => {
    if (!form.studentId || !form.amount || !form.datePaid || !form.fromDate || !form.untilDate) {
      setMsg('All fields required.'); return;
    }
    setSaving(true); setMsg('');
    try {
      await api.post('/api/coach-attendance/payments', form);
      setMsg('Payment saved!');
      setShowForm(false);
      setForm({ studentId: '', amount: '', currency: 'INR', datePaid: todayIST(), fromDate: '', untilDate: '', notes: '' });
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/api/coach-attendance/payments/${id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error');
    }
  };

  const filtered = filterP
    ? payments.filter(p => p.studentId.toString() === filterP)
    : payments;

  // Split so a student on break doesn't muddle the active roster's history.
  const activePayments = filtered.filter(p => !breakIds.has(p.studentId.toString()));
  const breakPayments  = filtered.filter(p =>  breakIds.has(p.studentId.toString()));

  return (
    <div>
      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(226,232,240,0.85)'
      }}>
        💰 <strong>Parents pay you directly.</strong> In ChessNexus you simply track and verify these
        payments yourself — the payment stays entirely between you and the parent. It goes straight to
        your account: no middleman, no delays, no deductions.
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="cap-btn cap-btn-cyan" onClick={() => { setShowForm(s => !s); setMsg(''); }}>
          {showForm ? '✕ Cancel' : '+ Add Payment'}
        </button>
        <select className="cap-input" style={{ maxWidth: 220 }} value={filterP}
          onChange={e => setFilterP(e.target.value)}>
          <option value="">All Players</option>
          {players.map(p => (
            <option key={p._id} value={p.studentId}>
              {p.studentName}{p.onBreak ? ' (on break)' : ''}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="cap-card" style={{ marginBottom: 20 }}>
          <h3 className="cap-card-title">Record Payment</h3>
          <div className="cap-form-grid">
            <div className="cap-form-row">
              <label>Player *</label>
              <select className="cap-input" value={form.studentId}
                onChange={e => {
                  const p = players.find(x => x.studentId.toString() === e.target.value);
                  setForm(f => ({ ...f, studentId: e.target.value, currency: p?.currency || f.currency, amount: p?.fees || f.amount }));
                }}>
                <option value="">Select player…</option>
                {activePlayers.map(p => <option key={p._id} value={p.studentId}>{p.studentName}</option>)}
              </select>
            </div>
            <div className="cap-form-row">
              <label>Amount *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="cap-input" style={{ width: 80 }} value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                </select>
                <input type="number" className="cap-input" min="0" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="cap-form-row">
              <label>Date Paid *</label>
              <input type="date" className="cap-input" value={form.datePaid}
                onChange={e => setForm(f => ({ ...f, datePaid: e.target.value }))} />
            </div>
            <div className="cap-form-row">
              <label>Covers From *</label>
              <input type="date" className="cap-input" value={form.fromDate}
                onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div className="cap-form-row">
              <label>Covers Until *</label>
              <input type="date" className="cap-input" value={form.untilDate}
                onChange={e => setForm(f => ({ ...f, untilDate: e.target.value }))} />
            </div>
            <div className="cap-form-row">
              <label>Notes</label>
              <input type="text" className="cap-input" placeholder="Optional note" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button className="cap-btn cap-btn-green" disabled={saving} onClick={handleAdd}>
              {saving ? 'Saving…' : '✓ Save Payment'}
            </button>
            {msg && <span style={{ color: msg.includes('!') ? '#10b981' : '#fca5a5', fontSize: 13 }}>{msg}</span>}
          </div>
        </div>
      )}

      {/* All payments from the active roster. */}
      <div className="cap-card">
        <h3 className="cap-card-title">Payment History</h3>
        {loading ? <p className="cap-muted">Loading…</p> : !activePayments.length ? (
          <p className="cap-muted">No payment records found.</p>
        ) : (
          <PaymentTable rows={activePayments} playerName={playerName} onDelete={del} />
        )}
      </div>

      {/* Students on break, and any payments they made. Kept separate so the
          active roster's history stays clean. */}
      {!loading && breakPlayers.length > 0 && (
        <div className="cap-card" style={{ marginTop: 20 }}>
          <h3 className="cap-card-title">⏸ Students on break</h3>

          <div className="cap-table-wrap" style={{ marginBottom: 18 }}>
            <table className="cap-table">
              <thead><tr>
                <th>Player</th><th>Classes/mo</th><th>Fee</th><th>Type</th><th>Since</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {breakPlayers.map(p => (
                  <tr key={p._id}>
                    <td><span className="cap-td-player">{p.studentName}</span></td>
                    <td>{p.classesPerMonth}</td>
                    <td>{p.currency} {(p.fees || 0).toLocaleString()}</td>
                    <td>{p.classType || 'Private'}</td>
                    <td>{p.enrollmentDate ? fmtIST(p.enrollmentDate) : <span className="cap-muted">—</span>}</td>
                    <td>
                      <div className="cap-row-actions">
                        <button className="cap-btn cap-btn-green" onClick={() => rejoin(p._id)}>Rejoin</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 10px' }}>
            Payments from students on break
          </h4>
          {!breakPayments.length ? (
            <p className="cap-muted">No payments recorded for students on break.</p>
          ) : (
            <PaymentTable rows={breakPayments} playerName={playerName} onDelete={del} />
          )}
        </div>
      )}
    </div>
  );
}

// Shared payment table — used for both the active roster and students on break.
function PaymentTable({ rows, playerName, onDelete }) {
  return (
    <div className="cap-table-wrap">
      <table className="cap-table">
        <thead><tr>
          <th>Player</th><th>Amount</th><th>Date Paid</th>
          <th>Covers From</th><th>Covers Until</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p._id}>
              <td>{playerName(p.studentId)}</td>
              <td>{p.currency} {p.amount.toLocaleString()}</td>
              <td>{fmtIST(p.datePaid)}</td>
              <td>{fmtIST(p.fromDate)}</td>
              <td>{fmtIST(p.untilDate)}</td>
              <td>{p.notes || '—'}</td>
              <td>
                <button className="cap-btn cap-btn-danger" onClick={() => onDelete(p._id)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: REQUESTS
// ════════════════════════════════════════════════════════════════════════════
function TabRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('pending');
  const [acting,   setActing]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const r = await api.get(`/api/coach-attendance/requests${params}`);
      setRequests(r.data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const resolve = async (id, status) => {
    setActing(id);
    try {
      await api.put(`/api/coach-attendance/requests/${id}`, { status });
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error');
    } finally {
      setActing('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} className={`cap-btn ${filter === s ? 'cap-btn-cyan' : 'cap-btn-ghost'}`}
            onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="cap-card">
        {loading ? <p className="cap-muted">Loading…</p> : !requests.length ? (
          <p className="cap-muted">No {filter !== 'all' ? filter : ''} payment requests.</p>
        ) : (
          <div className="cap-req-list">
            {requests.map(r => (
              <div key={r._id} className={`cap-req-item cap-req-${r.status}`}>
                <div className="cap-req-info">
                  <div className="cap-req-name">{r.studentName}</div>
                  <div className="cap-req-detail">
                    {r.currency} {r.amount.toLocaleString()}
                    {r.forMonth && ` · ${r.forMonth}`}
                    {r.message && <span className="cap-muted"> · "{r.message}"</span>}
                  </div>
                  {(r.fromDate || r.untilDate || r.paidDate) && (
                    <div className="cap-muted" style={{ fontSize: 12 }}>
                      {(r.fromDate || r.untilDate) && (
                        <>Period: {r.fromDate ? fmtIST(r.fromDate) : '—'} – {r.untilDate ? fmtIST(r.untilDate) : '—'}</>
                      )}
                      {r.paidDate && <> · Paid {fmtIST(r.paidDate)}</>}
                    </div>
                  )}
                  <div className="cap-muted" style={{ fontSize: 12 }}>Submitted {fmtIST(r.createdAt)}</div>
                </div>
                <div className="cap-req-actions">
                  <span className={`cap-badge ${r.status === 'pending' ? 'badge-catchup' : r.status === 'approved' ? 'badge-present' : 'badge-absent'}`}>
                    {r.status}
                  </span>
                  {r.status === 'pending' && (
                    <>
                      <button className="cap-btn cap-btn-green" disabled={acting === r._id}
                        onClick={() => resolve(r._id, 'approved')}>Approve</button>
                      <button className="cap-btn cap-btn-danger" disabled={acting === r._id}
                        onClick={() => resolve(r._id, 'rejected')}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HISTORY
// ════════════════════════════════════════════════════════════════════════════
function TabHistory() {
  const [players, setPlayers]   = useState([]);
  const [selId,   setSelId]     = useState('');
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.get('/api/coach-attendance/players')
      .then(r => setPlayers(r.data.filter(p => p.enrolled)))
      .catch(() => {});
  }, []);

  const load = async (sid) => {
    setLoading(true);
    try {
      const r = await api.get(`/api/coach-attendance/attendance/history/${sid}?limit=90`);
      setHistory(r.data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (e) => {
    const sid = e.target.value;
    setSelId(sid);
    if (sid) load(sid);
    else setHistory([]);
  };

  const selPlayer = players.find(p => p.studentId.toString() === selId);

  // Group by month
  const grouped = {};
  for (const rec of history) {
    const d = new Date(rec.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rec);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label className="cap-label">Select Player</label>
        <select className="cap-input" style={{ maxWidth: 280 }} value={selId} onChange={onSelect}>
          <option value="">Choose a player…</option>
          {players.map(p => <option key={p._id} value={p.studentId}>{p.studentName}</option>)}
        </select>
      </div>

      {selPlayer && (
        <div className="cap-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><span className="cap-muted">Player:</span> <strong>{selPlayer.studentName}</strong></div>
            <div><span className="cap-muted">Classes/mo:</span> <strong>{selPlayer.classesPerMonth}</strong></div>
            <div><span className="cap-muted">Type:</span> <strong>{selPlayer.classType}</strong></div>
            {selPlayer.enrollmentDate && <div><span className="cap-muted">Since:</span> <strong>{fmtIST(selPlayer.enrollmentDate)}</strong></div>}
          </div>
        </div>
      )}

      {loading && <p className="cap-muted">Loading…</p>}

      {!loading && selId && !history.length && (
        <p className="cap-muted">No attendance records found for this player.</p>
      )}

      {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([key, recs]) => {
        const [y, m] = key.split('-');
        const present  = recs.filter(r => r.status === 'Present').length;
        const absent   = recs.filter(r => r.status === 'Absent').length;
        const catchUp  = recs.filter(r => r.status === 'Catch-up').length;

        return (
          <div key={key} className="cap-card" style={{ marginBottom: 16 }}>
            <div className="cap-hist-month-hdr">
              <span className="cap-hist-month">{monthName(y, m)}</span>
              <span className="cap-td-present">{present}P</span>
              <span className="cap-td-absent">{absent}A</span>
              <span className="cap-td-catchup">{catchUp}C</span>
            </div>
            <div className="cap-hist-grid">
              {recs.sort((a, b) => new Date(a.date) - new Date(b.date)).map(rec => (
                <div key={rec._id} className={`cap-hist-cell cap-hist-${rec.status.toLowerCase().replace('-', '')}`}>
                  <div className="cap-hist-day">{new Date(rec.date).getDate()}</div>
                  <div className="cap-hist-s">{rec.status === 'Catch-up' ? 'CU' : rec.status.charAt(0)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
