// pages/academy/AcademyCoachDetail.jsx — /academy/coaches/:coachId
//
// Everything the academy head needs about ONE member coach: profile, roster,
// and month-by-month attendance / classes / fees / activity as calendars.
//
// One request feeds the whole page (/api/academy/coach/:id/detail?month=YYYY-MM),
// so switching month is a single fetch rather than one per panel.
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import './AcademyDashboard.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const thisMonthKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', AED: 'د.إ', SGD: 'S$' };

// Money held per currency. Currencies are listed side by side rather than
// summed — ₹ and $ cannot be added into one honest number.
const fmtMoney = (byCurrency) => {
  const by = byCurrency || {};
  const codes = Object.keys(by).filter(k => by[k] > 0);
  if (codes.length === 0) return '—';
  return codes.map(c => `${CURRENCY_SYMBOL[c] || c + ' '}${by[c].toLocaleString()}`).join(' + ');
};

// INR and USD as fixed compartments (matching the coaches table), with any
// other currency the coach actually used appended rather than dropped.
const FEE_COLUMNS = ['INR', 'USD'];
const MoneyCells = ({ byCurrency }) => {
  const by = byCurrency || {};
  const others = Object.keys(by).filter(k => !FEE_COLUMNS.includes(k) && by[k] > 0);
  return (
    <div className="acad-fee-cells" style={{ marginTop: 4 }}>
      {FEE_COLUMNS.map(code => (
        <div key={code} className={`acad-fee-cell ${by[code] ? '' : 'acad-fee-cell--empty'}`}>
          <span className="acad-fee-cell-cur">{code}</span>
          <span className="acad-fee-cell-amt">
            {by[code] ? `${CURRENCY_SYMBOL[code]}${by[code].toLocaleString()}` : '—'}
          </span>
        </div>
      ))}
      {others.map(code => (
        <div key={code} className="acad-fee-cell">
          <span className="acad-fee-cell-cur">{code}</span>
          <span className="acad-fee-cell-amt">{CURRENCY_SYMBOL[code] || ''}{by[code].toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// A month grid. `render(dayKey)` returns the cell's content + colour, so the
// same component draws attendance, classes, fees and activity.
function MonthCalendar({ title, month, daysInMonth, firstWeekday, render, legend }) {
  const [y, m] = month.split('-').map(Number);
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`b${i}`} className="acad-cal-cell acad-cal-blank" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const { label, color, title: cellTitle } = render(key) || {};
    cells.push(
      <div
        key={key}
        className="acad-cal-cell"
        title={cellTitle || key}
        style={color ? { background: color, borderColor: color } : undefined}
      >
        <span className="acad-cal-day">{day}</span>
        {label ? <span className="acad-cal-val">{label}</span> : null}
      </div>
    );
  }
  return (
    <div className="acad-cal">
      <div className="acad-cal-head">{title}</div>
      <div className="acad-cal-grid">
        {WEEKDAYS.map((d, i) => <div key={`w${i}`} className="acad-cal-wd">{d}</div>)}
        {cells}
      </div>
      {legend && <div className="acad-cal-legend">{legend}</div>}
    </div>
  );
}

// Simple horizontal bar — avoids pulling a chart library into this page.
function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="acad-bar-row">
      <span className="acad-bar-label">{label}</span>
      <span className="acad-bar-track"><span className="acad-bar-fill" style={{ width: `${pct}%`, background: color }} /></span>
      <span className="acad-bar-val">{value}</span>
    </div>
  );
}

export default function AcademyCoachDetail() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const [month, setMonth] = useState(thisMonthKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.get(`/api/academy/coach/${coachId}/detail`, { params: { month } });
      setData(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load this coach.');
    } finally { setLoading(false); }
  }, [coachId, month]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="acad-wrap"><div className="acad-empty">Loading coach…</div></div>;
  if (err && !data) return (
    <div className="acad-wrap">
      <div className="acad-error">⚠️ {err}</div>
      <button className="btn-ghost" onClick={() => navigate('/academy/coaches')}>← Back to coaches</button>
    </div>
  );
  if (!data) return null;

  const { coach, totals, calendars, students, fees, daysInMonth, firstWeekday } = data;
  const [yy, mm] = month.split('-').map(Number);
  const maxClasses = Math.max(1, ...Object.values(calendars.classesByDay || {}));

  return (
    <div className="acad-wrap">
      <button className="btn-ghost" onClick={() => navigate('/academy/coaches')} style={{ marginBottom: 12 }}>
        ← All coaches
      </button>

      {/* ── Profile ── */}
      <div className="acad-coach-hero">
        {coach.photo
          ? <img src={coach.photo} alt="" className="acad-coach-photo" />
          : <div className="acad-coach-photo acad-coach-photo--none">{(coach.name || '?')[0].toUpperCase()}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, color: '#fff' }}>
            {coach.title ? <span className="acad-coach-title">{coach.title}</span> : null}
            {coach.name}
            {coach.verified && <span className="acad-coach-verified" title="Verified">✓</span>}
          </h1>
          <div className="acad-coach-sub">
            @{coach.username}
            {coach.country ? ` · ${coach.country}` : ''}
            {coach.fideRating ? ` · FIDE ${coach.fideRating}` : ''}
          </div>
          {coach.languages?.length > 0 && (
            <div className="acad-coach-tags">
              {coach.languages.map(l => <span key={l} className="acad-tag">🗣 {l}</span>)}
            </div>
          )}
          {coach.specialization && <div className="acad-coach-spec">{coach.specialization}</div>}
        </div>
      </div>

      {/* ── Month picker ── */}
      <div className="acad-month-bar">
        <button className="btn-ghost" onClick={() => setMonth(m => shiftMonth(m, -1))}>← Prev</button>
        <strong style={{ color: '#fff' }}>{MONTHS[mm - 1]} {yy}</strong>
        <button
          className="btn-ghost"
          onClick={() => setMonth(m => shiftMonth(m, 1))}
          disabled={month >= thisMonthKey()}
        >
          Next →
        </button>
        {month !== thisMonthKey() && (
          <button className="btn-ghost" onClick={() => setMonth(thisMonthKey())}>This month</button>
        )}
      </div>

      {/* ── Headline numbers ── */}
      <div className="acad-stat-grid">
        {[
          { label: 'Students', value: totals.students, sub: totals.onBreak ? `${totals.onBreak} on break` : 'all active', color: '#38bdf8' },
          { label: 'Classes this month', value: totals.classes, sub: `${totals.classHours}h taught`, color: '#a78bfa' },
          { label: 'Attendance', value: totals.attendanceRate == null ? '—' : `${totals.attendanceRate}%`, sub: `${totals.present} present · ${totals.absent} absent`, color: '#34d399' },
          { label: 'Assignments set', value: totals.assignments, sub: 'this month', color: '#fbbf24' },
          { label: 'Fees received', value: fmtMoney(totals.approvedByCurrency), sub: `${totals.feeApproved} approved`, color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="acad-stat">
            <div className="acad-stat-label">{s.label}</div>
            <div className="acad-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="acad-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Attendance breakdown ── */}
      <div className="acad-panel">
        <h3>📊 Attendance — {MONTHS[mm - 1]}</h3>
        {(totals.present + totals.absent + totals.catchup) === 0 ? (
          <div className="acad-muted">No attendance marked this month.</div>
        ) : (
          <>
            <Bar label="Present"  value={totals.present} max={totals.present + totals.absent + totals.catchup} color="#34d399" />
            <Bar label="Absent"   value={totals.absent}  max={totals.present + totals.absent + totals.catchup} color="#f87171" />
            <Bar label="Catch-up" value={totals.catchup} max={totals.present + totals.absent + totals.catchup} color="#fbbf24" />
          </>
        )}
      </div>

      {/* ── Calendars ── */}
      <div className="acad-cal-row">
        <MonthCalendar
          title="🗓 Attendance" month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="green = present · red = absent · amber = catch-up"
          render={(k) => {
            const c = calendars.attendanceByDay?.[k];
            if (!c) return null;
            // Colour by what dominates the day, so one glance shows problem days.
            const color = c.absent > c.present ? 'rgba(248,113,113,0.35)'
              : c.catchup > 0 && c.present === 0 ? 'rgba(251,191,36,0.35)'
              : 'rgba(52,211,153,0.32)';
            return { label: `${c.present}/${c.present + c.absent + c.catchup}`, color,
              title: `${k}: ${c.present} present, ${c.absent} absent, ${c.catchup} catch-up` };
          }}
        />
        <MonthCalendar
          title="🎥 Classes" month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="darker = more classes that day"
          render={(k) => {
            const n = calendars.classesByDay?.[k];
            if (!n) return null;
            const a = 0.18 + 0.55 * (n / maxClasses);
            return { label: n, color: `rgba(167,139,250,${a.toFixed(2)})`, title: `${k}: ${n} class${n === 1 ? '' : 'es'}` };
          }}
        />
        <MonthCalendar
          title="💰 Fee requests" month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="days a parent sent a fee request"
          render={(k) => {
            const n = calendars.feesByDay?.[k];
            if (!n) return null;
            return { label: n, color: 'rgba(244,114,182,0.32)', title: `${k}: ${n} fee request${n === 1 ? '' : 's'}` };
          }}
        />
        <MonthCalendar
          title="📋 Activities set" month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="assignments this coach created"
          render={(k) => {
            const n = calendars.activityByDay?.[k];
            if (!n) return null;
            return { label: n, color: 'rgba(251,191,36,0.3)', title: `${k}: ${n} assignment${n === 1 ? '' : 's'}` };
          }}
        />
      </div>

      {/* ── Students ── */}
      <div className="acad-panel">
        <h3>🎓 Students ({students.length})</h3>
        {students.length === 0 ? (
          <div className="acad-muted">This coach has no students yet.</div>
        ) : (
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead>
                <tr>
                  <th>Student</th><th>Username</th><th>Batch</th>
                  <th>Joined</th><th>Last active</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.username ? `@${s.username}` : '—'}</td>
                    <td>{s.groupTag || '—'}</td>
                    <td>{fmtDate(s.joinedAt)}</td>
                    <td>{s.lastActivity ? fmtDate(s.lastActivity) : '—'}</td>
                    <td>
                      {s.onBreak
                        ? <span className="acad-pill acad-pill--warn">On break</span>
                        : <span className="acad-pill acad-pill--ok">Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Fee requests ── */}
      <div className="acad-panel">
        <h3>💰 Fees — {MONTHS[mm - 1]}</h3>

        {/* Received / pending / rejected, with amounts. The coaches list shows
            only "received"; the full picture belongs here. */}
        <div className="acad-fee-split">
          {[
            { key: 'received', label: '✅ Received', amount: totals.approvedByCurrency, n: totals.feeApproved, cls: 'acad-fee--ok' },
            { key: 'pending',  label: '⏳ Pending',  amount: totals.pendingByCurrency,  n: totals.feePending,  cls: 'acad-fee--warn' },
            { key: 'rejected', label: '❌ Rejected', amount: totals.rejectedByCurrency, n: totals.feeRejected, cls: 'acad-fee--bad' },
          ].map(f => (
            <div key={f.key} className={`acad-fee-card ${f.cls}`}>
              <div className="acad-fee-label">{f.label}</div>
              <MoneyCells byCurrency={f.amount} />
              <div className="acad-fee-count">{f.n} request{f.n === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>

        {fees.length === 0 ? (
          <div className="acad-muted">No fee requests this month.</div>
        ) : (
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead>
                <tr><th>Student</th><th>Amount</th><th>For</th><th>Sent</th><th>Status</th></tr>
              </thead>
              <tbody>
                {fees.map((f, i) => (
                  <tr key={i}>
                    <td>{f.studentName || '—'}</td>
                    <td>{f.currency} {f.amount}</td>
                    <td>{f.forMonth || '—'}</td>
                    <td>{fmtDate(f.createdAt)}</td>
                    <td>
                      <span className={`acad-pill ${f.status === 'approved' ? 'acad-pill--ok' : f.status === 'rejected' ? 'acad-pill--bad' : 'acad-pill--warn'}`}>
                        {f.status}
                      </span>
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
