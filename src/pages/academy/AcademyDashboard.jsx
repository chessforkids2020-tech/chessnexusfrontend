// pages/academy/AcademyDashboard.jsx — /academy/overview
// KPI cards + two graphs, with a week / month / last-3-months toggle. The
// coaches table + join link + join requests live on the Coaches page.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../../api';
import ExpiryReminder from '../../components/ExpiryReminder';
import './AcademyDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const PERIODS = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: '3mo', label: 'Last 3 months' },
];

// Shorten bucket labels for the x-axis.
//   month grain (3mo)  2026-07     → "Jul"
//   week grain (month) 2026-07-16  → "wk 16/7" (the week's start date)
//   day grain (week)   2026-07-16  → "16/7"
function shortLabel(label, grain) {
  if (grain === 'month') {
    const [y, m] = label.split('-');
    return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' });
  }
  const [, m, d] = label.split('-');
  return grain === 'week' ? `wk ${Number(d)}/${Number(m)}` : `${Number(d)}/${Number(m)}`;
}

export default function AcademyDashboard() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [periodEnd, setPeriodEnd] = useState(null);

  const load = async (p = period) => {
    setLoading(true); setErr('');
    try {
      const res = await api.get('/api/academy/overview', { params: { period: p } });
      setData(res.data);
      if (res.data?.isOwner) {
        api.get('/api/academy/leave-requests').then(r => setLeaveReqs(r.data?.requests || [])).catch(() => setLeaveReqs([]));
        api.get('/api/academy/me').then(r => setPeriodEnd(r.data?.academy?.currentPeriodEnd || null)).catch(() => {});
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load the academy overview.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const releaseCoach = async (coachId, name) => {
    if (!window.confirm(`Release ${name} as an individual coach? They'll revert to the free plan (keeping their students) and leave your academy.`)) return;
    try {
      await api.delete(`/api/academy/members/${coachId}`);
      setMsg(`${name} released as an individual coach.`);
      setLeaveReqs(rs => rs.filter(r => r.coachId !== coachId));
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not release the coach.');
    }
  };

  const changePeriod = (p) => { setPeriod(p); load(p); };

  if (loading && !data) return <div className="acad-wrap"><div className="acad-empty">Loading overview…</div></div>;
  if (err && !data) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;
  if (!data) return null;

  const { academy, kpis, graphs } = data;
  const grain = graphs?.grain || 'day';
  const labels = (graphs?.students || []).map(p => shortLabel(p.label, grain));
  const col = (arr) => (arr || []).map(p => p.count);
  const barData = { labels, datasets: [{ label: 'Students joined', data: col(graphs?.students), backgroundColor: 'rgba(6,182,212,0.6)', borderRadius: 6 }] };
  const lineData = { labels, datasets: [{ label: 'Classes', data: col(graphs?.classes), borderColor: 'var(--color-success)', backgroundColor: 'var(--color-success-a12)', fill: true, tension: 0.3 }] };
  const activityData = { labels, datasets: [{ label: 'Activities', data: col(graphs?.activities), backgroundColor: 'rgba(167,139,250,0.6)', borderRadius: 6 }] };
  const fee = graphs?.feeRequests || {};
  const feeData = {
    labels,
    datasets: [
      { label: 'Pending', data: col(fee.pending), backgroundColor: 'rgba(245,158,11,0.7)', stack: 'f' },
      { label: 'Paid', data: col(fee.approved), backgroundColor: 'rgba(16,185,129,0.7)', stack: 'f' },
      { label: 'Rejected', data: col(fee.rejected), backgroundColor: 'rgba(239,68,68,0.6)', stack: 'f' },
    ],
  };
  const stackedOpts = { ...CHART_OPTS, plugins: { legend: { display: true, position: 'bottom', labels: { color: 'var(--color-text-muted)', boxWidth: 12, font: { size: 11 } } } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } };
  const periodLabel = PERIODS.find(p => p.key === period)?.label.toLowerCase() || 'this month';

  return (
    <div className="acad-wrap">
      <div className="acad-head">
        <div>
          <h1>🏛️ {academy.name}</h1>
          <div className="acad-code">Academy code: <strong>{academy.academyCode}</strong></div>
        </div>
        <div className="acad-period-toggle">
          {PERIODS.map(p => (
            <button key={p.key} className={period === p.key ? 'is-active' : ''} onClick={() => changePeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.isOwner && periodEnd && (
        <ExpiryReminder
          daysRemaining={Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86400000))}
          what="academy plan"
          to="/academy/billing"
          ctaLabel="Renew plan"
        />
      )}

      {msg && <div className="acad-msg">{msg}</div>}

      {/* New coaches requesting to join — act on the Coaches page */}
      {data.isOwner && data.pendingRequests > 0 && (
        <div className="acad-req" style={{ borderColor: 'var(--color-accent-a30)', background: 'var(--color-accent-a08)' }}>
          <div className="acad-req-row">
            <span>🔔 <strong>{data.pendingRequests}</strong> coach{data.pendingRequests === 1 ? '' : 'es'} requesting to join your academy</span>
            <Link to="/academy/coaches" className="acad-req-approve" style={{ textDecoration: 'none' }}>Review →</Link>
          </div>
        </div>
      )}

      {/* Coaches who asked to leave (become individual) — review + release */}
      {data.isOwner && leaveReqs.length > 0 && (
        <div className="acad-req">
          <h3>🔔 {leaveReqs.length} coach{leaveReqs.length === 1 ? '' : 'es'} asked to become individual</h3>
          {leaveReqs.map(r => (
            <div key={r.id} className="acad-req-row">
              <span>{r.name} — wants to leave your academy</span>
              <div className="acad-req-btns">
                <button className="acad-req-approve" onClick={() => releaseCoach(r.coachId, r.name)}>Release</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="acad-kpis">
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.totalCoaches}</div><div className="acad-kpi-l">Coaches</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.totalStudents}</div><div className="acad-kpi-l">Students</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.studentsJoinedInPeriod}</div><div className="acad-kpi-l">Joined {periodLabel}</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.classesInPeriod}</div><div className="acad-kpi-l">Classes {periodLabel}</div></div>
      </div>

      {/* Graphs */}
      <div className="acad-charts">
        <div className="acad-chart-card">
          <h3>Students joined ({periodLabel})</h3>
          <div className="acad-chart"><Bar data={barData} options={CHART_OPTS} /></div>
        </div>
        <div className="acad-chart-card">
          <h3>Classes taken ({periodLabel})</h3>
          <div className="acad-chart"><Line data={lineData} options={CHART_OPTS} /></div>
        </div>
        <div className="acad-chart-card">
          <h3>Coach activities ({periodLabel})</h3>
          <div className="acad-chart"><Bar data={activityData} options={CHART_OPTS} /></div>
        </div>
        <div className="acad-chart-card">
          <h3>Fee requests by status ({periodLabel})</h3>
          <div className="acad-chart"><Bar data={feeData} options={stackedOpts} /></div>
        </div>
      </div>
    </div>
  );
}
