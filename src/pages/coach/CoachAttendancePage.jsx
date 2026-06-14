import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
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
        ) : !data || !data.summary.length ? (
          <p className="cap-muted">No enrolled players found.</p>
        ) : (
          <div className="cap-table-wrap">
            <table className="cap-table">
              <thead><tr>
                <th>Player</th>
                <th>Classes/Mo</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Catch-up</th>
                <th>Remaining</th>
                <th>Fee</th>
                <th>Paid</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {data.summary.map(s => (
                  <tr key={s.studentId} className={s.onBreak ? 'cap-row-break' : ''}>
                    <td>{s.studentName} {s.onBreak && <span className="cap-break-badge">Break</span>}</td>
                    <td>{s.classesPerMonth}</td>
                    <td className="cap-td-present">{s.present}</td>
                    <td className="cap-td-absent">{s.absent}</td>
                    <td className="cap-td-catchup">{s.catchUp}</td>
                    <td>{s.remaining}</td>
                    <td>{s.currency} {s.fees.toLocaleString()}</td>
                    <td>{s.paid ? '✅' : '❌'}</td>
                    <td>
                      {s.onBreak
                        ? <span className="cap-badge badge-absent">On Break</span>
                        : s.paid
                          ? <span className="cap-badge badge-present">Paid</span>
                          : <span className="cap-badge badge-absent">Unpaid</span>}
                    </td>
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

  const setBreak = async (linkId, brk) => {
    const action = brk ? 'break' : 'rejoin';
    try {
      await api.put(`/api/coach-attendance/players/${linkId}/${action}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error');
    }
  };

  const filtered = players.filter(p =>
    p.studentName.toLowerCase().includes(search.toLowerCase()) ||
    (p.studentUsername || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="cap-muted">Loading players…</p>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="cap-input" placeholder="Search players…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="cap-muted" style={{ fontSize: 13 }}>{players.filter(p => p.enrolled).length} enrolled, {players.length} total</span>
        <button className="cap-btn cap-btn-ghost" onClick={load} style={{ fontSize: 12 }}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error} — make sure the backend server is running with the latest code.
        </div>
      )}

      {!error && !filtered.length && <p className="cap-muted">No players found. Add students via the main Coach Dashboard first.</p>}

      <div className="cap-player-list">
        {filtered.map(p => (
          <div key={p._id} className={`cap-player-card${p.onBreak ? ' cap-player-break' : ''}`}>
            <div className="cap-player-top">
              <div className="cap-player-avatar">{(p.studentName || '?')[0].toUpperCase()}</div>
              <div className="cap-player-info">
                <div className="cap-player-name">{p.studentName}</div>
                <div className="cap-player-meta">
                  @{p.studentUsername || '—'} · {p.classType || 'Private'}
                  {p.enrolled && <span className="cap-badge badge-present" style={{ marginLeft: 6 }}>Enrolled</span>}
                  {p.onBreak  && <span className="cap-badge badge-absent"  style={{ marginLeft: 6 }}>On Break</span>}
                </div>
              </div>
              <div className="cap-player-actions">
                {p.enrolled && !p.onBreak && (
                  <button className="cap-btn cap-btn-warn" onClick={() => setBreak(p._id, true)}>Break</button>
                )}
                {p.enrolled && p.onBreak && (
                  <button className="cap-btn cap-btn-green" onClick={() => setBreak(p._id, false)}>Rejoin</button>
                )}
                <button className="cap-btn cap-btn-ghost" onClick={() => editing === p._id ? setEditing(null) : startEdit(p)}>
                  {editing === p._id ? 'Cancel' : p.enrolled ? 'Edit' : 'Enroll'}
                </button>
              </div>
            </div>

            {p.enrolled && editing !== p._id && (
              <div className="cap-player-enroll-summary">
                {p.classesPerMonth} classes/mo · {p.currency} {p.fees.toLocaleString()}/mo · {p.classType}
                {p.enrollmentDate && ` · Since ${fmtIST(p.enrollmentDate)}`}
              </div>
            )}

            {editing === p._id && (
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
            )}
          </div>
        ))}
      </div>
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

  // Records may not carry a slot (older data) — treat a missing slot as slot 1.
  const recForSlot = (studentId, slot) =>
    records.find(r =>
      r.studentId.toString() === studentId.toString() && (r.slot || 1) === slot
    );
  const getStatus   = (studentId, slot) => recForSlot(studentId, slot)?.status || null;
  const getRecordId = (studentId, slot) => recForSlot(studentId, slot)?._id || null;

  const mark = async (studentId, slot, status) => {
    setSaving(`${studentId}-${slot}`);
    try {
      const cur = getStatus(studentId, slot);
      if (cur === status) {
        // Toggle off — delete this slot's record
        const rid = getRecordId(studentId, slot);
        if (rid) await api.delete(`/api/coach-attendance/attendance/${rid}`);
      } else {
        await api.post('/api/coach-attendance/attendance/mark', { studentId, date: selDate, status, slot });
      }
      await loadRecords();
    } catch (e) {
      alert(e?.response?.data?.error || 'Error marking attendance');
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
      </div>

      {!players.length ? (
        <p className="cap-muted">No players found. Add students in the main Coach Dashboard, then come back here.</p>
      ) : (
        <div className="cap-card">
          <h3 className="cap-card-title">Mark Attendance — {new Date(selDate + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'full' })}</h3>
          <div className="cap-att-list">
            {players.map(p => (
              <div key={p._id} className="cap-att-row">
                <div className="cap-att-avatar">{(p.studentName || '?')[0].toUpperCase()}</div>
                <div className="cap-att-name">{p.studentName}</div>
                <div className="cap-att-slots">
                  {[1, 2].map(slot => {
                    const status = getStatus(p.studentId, slot);
                    const busy   = saving === `${p.studentId}-${slot}`;
                    return (
                      <div key={slot} className="cap-att-slot">
                        <span className="cap-att-slot-lbl">Class {slot}</span>
                        <div className="cap-att-btns">
                          {['Present', 'Absent', 'Catch-up'].map(s => (
                            <button key={s} disabled={busy}
                              className={`cap-att-btn${status === s ? ` cap-att-btn-${s.toLowerCase().replace('-up','up')}` : ''}`}
                              onClick={() => mark(p.studentId, slot, s)}>
                              {s === 'Present' ? '✓ Present' : s === 'Absent' ? '✗ Absent' : '↺ Catch-up'}
                            </button>
                          ))}
                          {status && <StatusBadge s={status} />}
                          {busy && <span className="cap-muted" style={{ fontSize: 12 }}>…</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="cap-att-summary">
            <span>Present: <strong className="cap-td-present">{records.filter(r => r.status === 'Present').length}</strong></span>
            <span>Absent: <strong className="cap-td-absent">{records.filter(r => r.status === 'Absent').length}</strong></span>
            <span>Catch-up: <strong className="cap-td-catchup">{records.filter(r => r.status === 'Catch-up').length}</strong></span>
          </div>
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
      setPlayers(pl.data.filter(p => p.enrolled));
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const playerName = (id) => {
    const p = players.find(x => x.studentId.toString() === id.toString());
    return p ? p.studentName : id;
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

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="cap-btn cap-btn-cyan" onClick={() => { setShowForm(s => !s); setMsg(''); }}>
          {showForm ? '✕ Cancel' : '+ Add Payment'}
        </button>
        <select className="cap-input" style={{ maxWidth: 220 }} value={filterP}
          onChange={e => setFilterP(e.target.value)}>
          <option value="">All Players</option>
          {players.map(p => <option key={p._id} value={p.studentId}>{p.studentName}</option>)}
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
                {players.map(p => <option key={p._id} value={p.studentId}>{p.studentName}</option>)}
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

      <div className="cap-card">
        <h3 className="cap-card-title">Payment History</h3>
        {loading ? <p className="cap-muted">Loading…</p> : !filtered.length ? (
          <p className="cap-muted">No payment records found.</p>
        ) : (
          <div className="cap-table-wrap">
            <table className="cap-table">
              <thead><tr>
                <th>Player</th><th>Amount</th><th>Date Paid</th>
                <th>Covers From</th><th>Covers Until</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td>{playerName(p.studentId)}</td>
                    <td>{p.currency} {p.amount.toLocaleString()}</td>
                    <td>{fmtIST(p.datePaid)}</td>
                    <td>{fmtIST(p.fromDate)}</td>
                    <td>{fmtIST(p.untilDate)}</td>
                    <td>{p.notes || '—'}</td>
                    <td>
                      <button className="cap-btn cap-btn-danger" onClick={() => del(p._id)}>Del</button>
                    </td>
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
