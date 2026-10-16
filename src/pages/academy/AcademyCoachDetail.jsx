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
import { t as tr } from '../../i18n/LanguageContext';

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

  if (loading && !data) return <div className="acad-wrap"><div className="acad-empty">{tr("Loading coach…")}</div></div>;
  if (err && !data) return (
    <div className="acad-wrap">
      <div className="acad-error">⚠️ {err}</div>
      <button className="btn-ghost" onClick={() => navigate('/academy/coaches')}>{tr("← Back to coaches")}</button>
    </div>
  );
  if (!data) return null;

  const { coach, totals, calendars, students, fees, daysInMonth, firstWeekday } = data;
  const [yy, mm] = month.split('-').map(Number);
  const maxClasses = Math.max(1, ...Object.values(calendars.classesByDay || {}));

  return (
    <div className="acad-wrap">
      <button className="btn-ghost" onClick={() => navigate('/academy/coaches')} style={{ marginBottom: 12 }}>
        {tr("← All coaches")}
      </button>

      {/* ── Profile ── */}
      <div className="acad-coach-hero">
        {coach.photo
          ? <img src={coach.photo} alt="" className="acad-coach-photo" />
          : <div className="acad-coach-photo acad-coach-photo--none">{(coach.name || '?')[0].toUpperCase()}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, color: 'var(--color-text)' }}>
            {coach.title ? <span className="acad-coach-title">{coach.title}</span> : null}
            {coach.name}
            {coach.verified && <span className="acad-coach-verified" title={tr("Verified")}>✓</span>}
          </h1>
          <div className="acad-coach-sub">
            @{coach.username}
            {coach.country ? ` · ${coach.country}` : ''}
            {coach.fideRating ? tr(" · FIDE {fideRating}", { fideRating: coach.fideRating }) : ''}
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
        <button className="btn-ghost" onClick={() => setMonth(m => shiftMonth(m, -1))}>{tr("← Prev")}</button>
        <strong style={{ color: 'var(--color-text)' }}>{MONTHS[mm - 1]} {yy}</strong>
        <button
          className="btn-ghost"
          onClick={() => setMonth(m => shiftMonth(m, 1))}
          disabled={month >= thisMonthKey()}
        >
          {tr("Next →")}
        </button>
        {month !== thisMonthKey() && (
          <button className="btn-ghost" onClick={() => setMonth(thisMonthKey())}>{tr("This month")}</button>
        )}
      </div>

      {/* ── Headline numbers ── */}
      <div className="acad-stat-grid">
        {[
          { label: tr('Students'), value: totals.students, sub: totals.onBreak ? tr("{onBreak} on break", { onBreak: totals.onBreak }) : tr('all active'), color: '#38bdf8' },
          { label: tr('Classes this month'), value: totals.classes, sub: tr("{classHours}h taught", { classHours: totals.classHours }), color: 'var(--color-accent-2)' },
          { label: tr('Attendance'), value: totals.attendanceRate == null ? '—' : `${totals.attendanceRate}%`, sub: tr("{present} present · {absent} absent", { present: totals.present, absent: totals.absent }), color: 'var(--color-success)' },
          { label: tr('Assignments set'), value: totals.assignments, sub: tr('this month'), color: 'var(--color-warning)' },
          { label: tr('Fees received'), value: fmtMoney(totals.approvedByCurrency), sub: tr("{feeApproved} approved", { feeApproved: totals.feeApproved }), color: 'var(--color-success)' },
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
        <h3>{tr("📊 Attendance —")} {MONTHS[mm - 1]}</h3>
        {(totals.present + totals.absent + totals.catchup) === 0 ? (
          <div className="acad-muted">{tr("No attendance marked this month.")}</div>
        ) : (
          <>
            <Bar label={tr("Present")}  value={totals.present} max={totals.present + totals.absent + totals.catchup} color="var(--color-success)" />
            <Bar label={tr("Absent")}   value={totals.absent}  max={totals.present + totals.absent + totals.catchup} color="var(--color-danger)" />
            <Bar label={tr("Catch-up")} value={totals.catchup} max={totals.present + totals.absent + totals.catchup} color="var(--color-warning)" />
          </>
        )}
      </div>

      {/* ── Calendars ── */}
      <div className="acad-cal-row">
        <MonthCalendar
          title={tr("🗓 Attendance")} month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="green = present · red = absent · amber = catch-up"
          render={(k) => {
            const c = calendars.attendanceByDay?.[k];
            if (!c) return null;
            // Colour by what dominates the day, so one glance shows problem days.
            const color = c.absent > c.present ? 'var(--color-danger-a30)'
              : c.catchup > 0 && c.present === 0 ? 'var(--color-warning-a30)'
              : 'rgba(52,211,153,0.32)';
            return { label: `${c.present}/${c.present + c.absent + c.catchup}`, color,
              title: tr("{k}: {present} present, {absent} absent, {catchup} catch-up", { k: k, present: c.present, absent: c.absent, catchup: c.catchup }) };
          }}
        />
        <MonthCalendar
          title={tr("🎥 Classes")} month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="darker = more classes that day"
          render={(k) => {
            const n = calendars.classesByDay?.[k];
            if (!n) return null;
            const a = 0.18 + 0.55 * (n / maxClasses);
            return { label: n, color: `rgba(167,139,250,${a.toFixed(2)})`, title: tr("{k}: {n} class{v2}", { k: k, n: n, v2: n === 1 ? '' : 'es' }) };
          }}
        />
        <MonthCalendar
          title={tr("💰 Fee requests")} month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="days a parent sent a fee request"
          render={(k) => {
            const n = calendars.feesByDay?.[k];
            if (!n) return null;
            return { label: n, color: 'rgba(244,114,182,0.32)', title: tr("{k}: {n} fee request{v2}", { k: k, n: n, v2: n === 1 ? '' : 's' }) };
          }}
        />
        <MonthCalendar
          title={tr("📋 Activities set")} month={month} daysInMonth={daysInMonth} firstWeekday={firstWeekday}
          legend="assignments this coach created"
          render={(k) => {
            const n = calendars.activityByDay?.[k];
            if (!n) return null;
            return { label: n, color: 'var(--color-warning-a30)', title: tr("{k}: {n} assignment{v2}", { k: k, n: n, v2: n === 1 ? '' : 's' }) };
          }}
        />
      </div>

      {/* ── Students ── */}
      <div className="acad-panel">
        <h3>{tr("🎓 Students (")}{students.length})</h3>
        {students.length === 0 ? (
          <div className="acad-muted">{tr("This coach has no students yet.")}</div>
        ) : (
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead>
                <tr>
                  <th>{tr("Student")}</th><th>{tr("Username")}</th><th>{tr("Batch")}</th>
                  <th>{tr("Joined")}</th><th>{tr("Last active")}</th><th>{tr("Status")}</th>
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
                        ? <span className="acad-pill acad-pill--warn">{tr("On break")}</span>
                        : <span className="acad-pill acad-pill--ok">{tr("Active")}</span>}
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
        <h3>{tr("💰 Fees —")} {MONTHS[mm - 1]}</h3>

        {/* Received / pending / rejected, with amounts. The coaches list shows
            only "received"; the full picture belongs here. */}
        <div className="acad-fee-split">
          {[
            { key: 'received', label: tr('✅ Received'), amount: totals.approvedByCurrency, n: totals.feeApproved, cls: 'acad-fee--ok' },
            { key: 'pending',  label: tr('⏳ Pending'),  amount: totals.pendingByCurrency,  n: totals.feePending,  cls: 'acad-fee--warn' },
            { key: 'rejected', label: tr('❌ Rejected'), amount: totals.rejectedByCurrency, n: totals.feeRejected, cls: 'acad-fee--bad' },
          ].map(f => (
            <div key={f.key} className={`acad-fee-card ${f.cls}`}>
              <div className="acad-fee-label">{f.label}</div>
              <MoneyCells byCurrency={f.amount} />
              <div className="acad-fee-count">{f.n} {tr("request")}{f.n === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>

        {fees.length === 0 ? (
          <div className="acad-muted">{tr("No fee requests this month.")}</div>
        ) : (
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead>
                <tr><th>{tr("Student")}</th><th>{tr("Amount")}</th><th>{tr("For")}</th><th>{tr("Sent")}</th><th>{tr("Status")}</th></tr>
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
