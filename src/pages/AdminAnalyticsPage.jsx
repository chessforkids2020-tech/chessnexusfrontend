import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.08)';
ChartJS.defaults.font.family = "Inter, system-ui, Arial, sans-serif";

const RANGES = [{ key: '24h', label: '24h' }, { key: '7d', label: '7 days' }, { key: '30d', label: '30 days' }];
const RANGE_TEXT = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };
const REALTIME_POLL_MS = 5000;
const HIST_LEN = 24;

const TABS = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'games', label: 'Games', icon: '♟️' },
  { key: 'pages', label: 'Pages', icon: '📄' },
  { key: 'performance', label: 'Performance', icon: '📈' },
  { key: 'realtime', label: 'Real-time', icon: '⚡' },
  { key: 'livefeed', label: 'Live Feed', icon: '📡' },
  { key: 'alerts', label: 'Alerts', icon: '⚠️' }
];

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const s = {
  shell: { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, Arial, sans-serif', color: '#e2e8f0', background: 'radial-gradient(1100px 520px at 18% -8%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(167,139,250,0.10), transparent 55%), linear-gradient(180deg, #0a0f1f 0%, #0b1224 100%)' },

  sidebar: { width: 232, flexShrink: 0, padding: 18, borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,12,24,0.6)', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: 6, backdropFilter: 'blur(8px)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 18px', fontWeight: 800, fontSize: 18, color: '#f1f5f9' },
  brandDot: { width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#22d3ee,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, cursor: 'pointer', color: '#94a3b8', fontWeight: 600, fontSize: 14, border: '1px solid transparent', transition: 'all .15s ease' },
  navItemActive: { background: 'linear-gradient(90deg, rgba(34,211,238,0.16), rgba(167,139,250,0.10))', color: '#f1f5f9', border: '1px solid rgba(34,211,238,0.28)', boxShadow: '0 6px 18px rgba(34,211,238,0.12)' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navBadge: { marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '1px 7px' },
  navSpacer: { flex: 1 },
  backBtn: { marginTop: 'auto', padding: '11px 13px', borderRadius: 11, cursor: 'pointer', color: '#cbd5e1', fontWeight: 700, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', textAlign: 'center' },

  main: { flex: 1, padding: '22px 26px', minWidth: 0 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  h1: { margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 13 },
  toggleGroup: { display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' },
  toggle: { padding: '7px 14px', borderRadius: 9, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  toggleActive: { padding: '7px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(90deg,#22d3ee,#3b82f6)', color: '#04121f', cursor: 'pointer', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(34,211,238,0.3)' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 },
  kpiCard: { position: 'relative', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', padding: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 40px rgba(0,0,0,0.35)', overflow: 'hidden' },
  kpiTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  kpiIcon: { fontSize: 18, width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  kpiLabel: { margin: 0, fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  kpiValue: { fontSize: 32, fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 },
  kpiCaption: { fontSize: 10, color: '#64748b', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 },
  kpiSpark: { height: 38, marginTop: 8 },

  grid2: { display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'stretch', marginBottom: 20 },
  grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginBottom: 20 },
  panel: { background: 'rgba(255,255,255,0.035)', padding: 20, borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)' },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  twoCol: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'start' },
  chartBox: { height: 300 },
  heroBox: { height: 320 },
  doughnutBox: { height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 },
  td: { padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 14 },

  rtRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 },
  rtIcon: { fontSize: 16, width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  rtLabel: { fontSize: 13, color: '#94a3b8' },
  rtValue: { fontSize: 26, fontWeight: 800, color: '#f8fafc', marginLeft: 'auto', marginRight: 8 },
  rtSpark: { width: 110, height: 40, flexShrink: 0 },

  stream: { maxHeight: 420, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(0,0,0,0.18)' },
  streamRow: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 },
  badge: { background: 'rgba(34,211,238,0.14)', color: '#67e8f9', borderRadius: 999, padding: '2px 9px', fontWeight: 800, fontSize: 11, border: '1px solid rgba(34,211,238,0.3)' },
  liveBadge: { background: 'rgba(248,113,113,0.16)', color: '#fca5a5', borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: 11, border: '1px solid rgba(248,113,113,0.35)', display: 'inline-flex', alignItems: 'center', gap: 6 },
  muted: { color: '#64748b', fontSize: 14 },

  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 18 },
  statTile: { background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 },
  statValue: { fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 5 },

  windowTag: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#6ee7b7', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 999, padding: '2px 10px', verticalAlign: 'middle' },
  windowTagFixed: { color: '#fdba74', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.35)' },

  funnelRow: { marginBottom: 14 },
  funnelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  funnelLabel: { fontSize: 14, fontWeight: 700, color: '#e2e8f0' },
  funnelMeta: { fontSize: 13, color: '#94a3b8' },
  funnelTrack: { background: 'rgba(255,255,255,0.05)', borderRadius: 10, height: 34, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' },
  funnelFill: { height: '100%', background: 'linear-gradient(90deg,#22d3ee,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', paddingLeft: 12, color: '#04121f', fontWeight: 800, fontSize: 13, minWidth: 2, transition: 'width 0.5s ease', boxShadow: '0 0 18px rgba(99,102,241,0.45)' },
  funnelDrop: { fontSize: 12, color: '#f87171', marginTop: 5 },

  healthBanner: { display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 16, marginBottom: 16, border: '1px solid' },
  healthIcon: { fontSize: 32, lineHeight: 1 },
  healthStatus: { fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 },
  healthReasons: { fontSize: 13, marginTop: 3, opacity: 0.9 },
  newBadge: { background: 'rgba(248,113,113,0.16)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 800, marginLeft: 8 },
  errMsg: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#cbd5e1', wordBreak: 'break-word' },
  subHead: { margin: '4px 0 10px', fontSize: 13, color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }
};

const HEALTH_THEME = {
  healthy: { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.4)', color: '#6ee7b7', icon: '✅' },
  degraded: { bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.45)', color: '#fdba74', icon: '⚠️' },
  critical: { bg: 'linear-gradient(90deg,#dc2626,#7f1d1d)', border: '#ef4444', color: '#fff', icon: '🔴', pulse: true }
};

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '64%',
  plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 12, padding: 12, font: { size: 12 } } } }
};
const barScales = {
  x: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' } },
  y: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
};

function StatTile({ label, value, accent }) {
  return <div style={s.statTile}><div style={{ ...s.statValue, ...(accent ? { color: accent } : {}) }}>{value}</div><div style={s.statLabel}>{label}</div></div>;
}
function WindowTag({ text, fixed }) {
  return <span style={{ ...s.windowTag, ...(fixed ? s.windowTagFixed : {}) }}>{text}</span>;
}
function Panel({ title, icon, tag, tagFixed, right, children, style }) {
  return (
    <div style={{ ...s.panel, ...style }}>
      <div style={s.panelHead}>
        <h3 style={s.panelTitle}>{icon && <span>{icon}</span>}{title}{tag && <WindowTag text={tag} fixed={tagFixed} />}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function timeAgo(d) {
  const diff = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
// Color for an HTTP status code (green 2xx, blue 3xx, amber 4xx, red 5xx).
function statusColor(code) {
  if (code >= 500) return '#f87171';
  if (code >= 400) return '#fbbf24';
  if (code >= 300) return '#60a5fa';
  return '#34d399';
}
function build24hTrend(rows) {
  const map = new Map((rows || []).map(r => [r.hour, r.count]));
  const now = new Date(); const out = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:00`;
    out.push({ hour: key, count: map.get(key) || 0 });
  }
  return out;
}

// Tiny gradient area sparkline (no axes)
function Sparkline({ data, color = '#a78bfa' }) {
  if (!data || data.length === 0) return null;
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{ data, borderColor: color, backgroundColor: hexToRgba(color, 0.18), fill: true, tension: 0.42, pointRadius: 0, borderWidth: 2 }]
  };
  const opts = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false, min: 0 } }, elements: { point: { radius: 0 } }
  };
  return <Line data={chartData} options={opts} />;
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [range, setRange] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [pages, setPages] = useState(null);
  const [games, setGames] = useState(null);
  const [puzzles, setPuzzles] = useState(null);
  const [users, setUsers] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [retention, setRetention] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [rtHist, setRtHist] = useState({ online: [], games: [], loggedIn: [] });
  const [feed, setFeed] = useState(null);
  const [feedErrorsOnly, setFeedErrorsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const get = (p) => api.get(p).then(r => r.data).catch(() => null);
    Promise.all([
      get(`/api/admin/analytics/overview?range=${range}`),
      get(`/api/admin/analytics/pages?range=${range}`),
      get(`/api/admin/analytics/games?range=${range}`),
      get(`/api/admin/analytics/puzzles?range=${range}`),
      get(`/api/admin/analytics/users?range=${range}`),
      get(`/api/admin/analytics/behavior?range=${range}`),
      get(`/api/admin/analytics/funnel?range=${range}`),
      get(`/api/admin/analytics/performance?range=${range}`)
    ]).then(([ov, pg, gm, pz, us, bh, fn, pf]) => {
      if (cancelled) return;
      setOverview(ov); setPages(pg); setGames(gm); setPuzzles(pz);
      setUsers(us); setBehavior(bh); setFunnel(fn); setPerformance(pf); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/admin/analytics/retention').then(r => { if (!cancelled) setRetention(r.data); }).catch(() => {});
    const loadTraffic = () => api.get('/api/admin/analytics/traffic').then(r => { if (!cancelled) setTraffic(r.data); }).catch(() => {});
    loadTraffic();
    const tId = setInterval(loadTraffic, 60000);
    return () => { cancelled = true; clearInterval(tId); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      api.get(`/api/admin/analytics/performance?range=${range}`).then(r => setPerformance(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api.get('/api/admin/analytics/realtime');
        if (cancelled) return;
        setRealtime(r.data);
        setRtHist(prev => {
          const cap = (arr, v) => [...arr, v ?? 0].slice(-HIST_LEN);
          return { online: cap(prev.online, r.data.onlineNow), games: cap(prev.games, r.data.activeGames), loggedIn: cap(prev.loggedIn, r.data.loggedIn) };
        });
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, REALTIME_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Live request-activity feed: only polls while the Live Feed tab is open.
  useEffect(() => {
    if (tab !== 'livefeed') return;
    let cancelled = false;
    const tick = () => {
      const q = feedErrorsOnly ? '?status=error&limit=300' : '?limit=300';
      api.get(`/api/admin/analytics/activity-feed${q}`)
        .then(r => { if (!cancelled) setFeed(r.data); })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, REALTIME_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab, feedErrorsOnly]);

  const kpis = overview?.kpis || {};
  const rangeLabel = RANGE_TEXT[range] || 'Last 7 days';
  const alertCount = (performance?.client?.clientErrors ?? 0) + (performance?.client?.apiFailures ?? 0);

  const trafficChart = useMemo(() => ({
    labels: traffic?.labels || [],
    datasets: [
      { label: 'Users', data: traffic?.users || [], borderColor: '#a78bfa', backgroundColor: hexToRgba('#a78bfa', 0.16), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5 },
      { label: 'Games', data: traffic?.games || [], borderColor: '#34d399', backgroundColor: hexToRgba('#34d399', 0.14), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5 }
    ]
  }), [traffic]);

  const pageChart = useMemo(() => ({
    labels: (pages?.mostVisited || []).map(r => r.page),
    datasets: [{ label: 'Page views', data: (pages?.mostVisited || []).map(r => r.views), backgroundColor: 'rgba(34,211,238,0.6)', hoverBackgroundColor: 'rgba(34,211,238,0.9)', borderRadius: 7, borderSkipped: false }]
  }), [pages]);

  const userSplit = useMemo(() => ({
    labels: ['Returning', 'New'],
    datasets: [{ data: [users?.returningVisitors ?? 0, users?.newVisitors ?? 0], backgroundColor: ['#60a5fa', '#34d399'], borderColor: 'rgba(0,0,0,0.2)', borderWidth: 2 }]
  }), [users]);

  const gameResultChart = useMemo(() => {
    const rows = games?.resultBreakdown || [];
    const palette = ['#34d399', '#f87171', '#fbbf24', '#a78bfa', '#60a5fa', '#fb923c'];
    return { labels: rows.map(r => r.result), datasets: [{ data: rows.map(r => r.count), backgroundColor: rows.map((_, i) => palette[i % palette.length]), borderColor: 'rgba(0,0,0,0.2)', borderWidth: 2 }] };
  }, [games]);

  const statusChart = useMemo(() => {
    const sb = performance?.client?.statusBreakdown || {};
    return { labels: ['5xx', '4xx', 'Network'], datasets: [{ data: [sb['5xx'] ?? 0, sb['4xx'] ?? 0, sb.network ?? 0], backgroundColor: ['#f87171', '#fb923c', '#64748b'], borderColor: 'rgba(0,0,0,0.2)', borderWidth: 2 }] };
  }, [performance]);

  const heroOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: true, labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 8, padding: 16 } } },
    scales: {
      x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const KPIS = [
    { label: 'Active Users', icon: '👥', color: '#a78bfa', value: kpis.activeUsers, win: rangeLabel, spark: traffic?.users, sparkColor: '#a78bfa' },
    { label: 'Online Now', icon: '🟢', color: '#34d399', value: kpis.onlineNow, win: 'Live now', spark: rtHist.online, sparkColor: '#34d399' },
    { label: 'Games Today', icon: '♟️', color: '#fbbf24', value: kpis.gamesToday, win: 'Today (UTC)', spark: traffic?.games, sparkColor: '#fbbf24' },
    { label: 'Puzzles Solved', icon: '🧩', color: '#22d3ee', value: kpis.puzzlesSolved, win: 'Today (UTC)' },
    { label: 'New Signups', icon: '✨', color: '#f472b6', value: kpis.newSignups, win: rangeLabel }
  ];

  return (
    <div style={s.shell}>
      <style>{`
        @keyframes healthPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 8px; }
      `}</style>

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.brand}><span style={s.brandDot}>📊</span> Analytics</div>
        {TABS.map(t => (
          <div key={t.key} style={{ ...s.navItem, ...(tab === t.key ? s.navItemActive : {}) }} onClick={() => setTab(t.key)}>
            <span style={s.navIcon}>{t.icon}</span>{t.label}
            {t.key === 'alerts' && alertCount > 0 && <span style={s.navBadge}>{alertCount}</span>}
          </div>
        ))}
        <div style={s.backBtn} onClick={() => navigate('/admin')}>← Back to Dashboard</div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.h1}>{TABS.find(t => t.key === tab)?.icon} {TABS.find(t => t.key === tab)?.label}</h1>
            <p style={s.sub}>
              {tab === 'overview' ? 'Live pulse of your platform.' : `Showing ${rangeLabel} (green-tagged) · orange tags use a fixed window.`}
            </p>
          </div>
          <div style={s.toggleGroup}>
            {RANGES.map(r => <button key={r.key} style={range === r.key ? s.toggleActive : s.toggle} onClick={() => setRange(r.key)}>{r.label}</button>)}
          </div>
        </div>

        {/* ===================== OVERVIEW ===================== */}
        {tab === 'overview' && (
          <>
            <div style={s.kpiGrid}>
              {KPIS.map(k => (
                <div key={k.label} style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <span style={{ ...s.kpiIcon, background: `linear-gradient(135deg, ${k.color}, ${hexToRgba(k.color, 0.5)})` }}>{k.icon}</span>
                    <div>
                      <p style={s.kpiLabel}>{k.label}</p>
                      <div style={s.kpiValue}>{loading && k.value == null ? '…' : (k.value ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
                  {k.spark && k.spark.length > 1
                    ? <div style={s.kpiSpark}><Sparkline data={k.spark} color={k.sparkColor} /></div>
                    : <div style={s.kpiCaption}>{k.win}</div>}
                </div>
              ))}
            </div>

            <div style={s.grid2}>
              <Panel title="Traffic / Activity" icon="📊" tag="Last 24h" tagFixed
                right={<span style={s.muted}>Users vs Games per hour</span>}>
                <div style={s.heroBox}>
                  {traffic ? <Line data={trafficChart} options={heroOptions} /> : <span style={s.muted}>Loading…</span>}
                </div>
              </Panel>

              <Panel title="Real-time" icon="⚡" right={<span style={s.liveBadge}>● LIVE</span>}>
                {[
                  { label: 'Active Users', icon: '👥', color: '#a78bfa', val: realtime?.onlineNow, spark: rtHist.online },
                  { label: 'Active Games', icon: '♟️', color: '#34d399', val: realtime?.activeGames, spark: rtHist.games },
                  { label: 'Logged In', icon: '🔐', color: '#fbbf24', val: realtime?.loggedIn, spark: rtHist.loggedIn }
                ].map(r => (
                  <div key={r.label} style={s.rtRow}>
                    <span style={{ ...s.rtIcon, background: `linear-gradient(135deg, ${r.color}, ${hexToRgba(r.color, 0.5)})` }}>{r.icon}</span>
                    <span style={s.rtLabel}>{r.label}</span>
                    <span style={s.rtValue}>{r.val ?? '…'}</span>
                    <div style={s.rtSpark}><Sparkline data={r.spark} color={r.color} /></div>
                  </div>
                ))}
              </Panel>
            </div>

            <div style={s.grid2}>
              <Panel title="Game Activity" icon="♟️" tag={rangeLabel}>
                <div style={s.twoCol}>
                  <div style={s.statRow}>
                    <StatTile label="Games Started" value={(games?.gamesStarted ?? 0).toLocaleString()} />
                    <StatTile label="Completed" value={(games?.gamesCompleted ?? 0).toLocaleString()} accent="#34d399" />
                    <StatTile label="Abort Rate" value={`${games?.abortRate ?? 0}%`} accent="#f87171" />
                    <StatTile label="Avg Length" value={games?.avgGameLengthSec ? `${games.avgGameLengthSec}s` : '—'} accent="#60a5fa" />
                  </div>
                  <div>
                    <div style={s.subHead}>Win / Draw / Loss</div>
                    <div style={s.doughnutBox}>{games?.resultBreakdown?.length > 0 ? <Doughnut data={gameResultChart} options={doughnutOptions} /> : <span style={s.muted}>No finished games yet.</span>}</div>
                  </div>
                </div>
              </Panel>

              <Panel title="Performance" icon="📈" tag="Since restart" tagFixed>
                <div style={s.subHead}>Slowest routes</div>
                <table style={s.table}>
                  <tbody>
                    {(performance?.server?.slowestRoutes || []).slice(0, 5).map(r => (
                      <tr key={r.route}>
                        <td style={s.td}><span style={s.errMsg}>{r.route}</span></td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: r.avgMs > 1000 ? '#fbbf24' : '#34d399' }}>{r.avgMs}ms {r.avgMs > 1000 ? '⚠️' : ''}</td>
                      </tr>
                    ))}
                    {(!performance?.server?.slowestRoutes || performance.server.slowestRoutes.length === 0) && <tr><td style={s.td}><span style={s.muted}>No traffic since restart.</span></td></tr>}
                  </tbody>
                </table>
              </Panel>
            </div>
          </>
        )}

        {/* ===================== USERS ===================== */}
        {tab === 'users' && (
          <>
            <Panel title="User Analytics" icon="👥" tag={rangeLabel} style={{ marginBottom: 18 }}>
              <div style={s.twoCol}>
                <div style={s.statRow}>
                  <StatTile label="Total Users" value={(users?.totalUsers ?? 0).toLocaleString()} />
                  <StatTile label="New Users" value={(users?.newUsers ?? 0).toLocaleString()} accent="#34d399" />
                  <StatTile label="Active Visitors" value={(users?.activeVisitors ?? 0).toLocaleString()} accent="#60a5fa" />
                  <StatTile label="Returning" value={(users?.returningVisitors ?? 0).toLocaleString()} accent="#67e8f9" />
                  <StatTile label="Logged-in Active" value={(users?.loggedInActive ?? 0).toLocaleString()} />
                  <StatTile label="Guests" value={(users?.guestVisitors ?? 0).toLocaleString()} accent="#a78bfa" />
                </div>
                <div>
                  <div style={s.subHead}>Returning vs New</div>
                  <div style={s.doughnutBox}>{(users?.activeVisitors ?? 0) > 0 ? <Doughnut data={userSplit} options={doughnutOptions} /> : <span style={s.muted}>No visitor data yet.</span>}</div>
                </div>
              </div>
            </Panel>

            <Panel title="Retention" icon="🔁" tag="Signup cohorts · last 60 days" tagFixed style={{ marginBottom: 18 }}>
              <div style={s.statRow}>
                <StatTile label="D1" value={retention?.overall?.d1 != null ? `${retention.overall.d1}%` : '—'} accent="#34d399" />
                <StatTile label="D7" value={retention?.overall?.d7 != null ? `${retention.overall.d7}%` : '—'} accent="#60a5fa" />
                <StatTile label="D30" value={retention?.overall?.d30 != null ? `${retention.overall.d30}%` : '—'} accent="#a78bfa" />
              </div>
              {retention?.cohorts?.length > 0 ? (
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Cohort</th><th style={{ ...s.th, textAlign: 'right' }}>Signups</th><th style={{ ...s.th, textAlign: 'right' }}>D1</th><th style={{ ...s.th, textAlign: 'right' }}>D7</th><th style={{ ...s.th, textAlign: 'right' }}>D30</th></tr></thead>
                  <tbody>
                    {retention.cohorts.map(c => (
                      <tr key={c.cohort}>
                        <td style={s.td}>{c.cohort}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{c.size}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{c.d1 != null ? `${c.d1}%` : '—'}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{c.d7 != null ? `${c.d7}%` : '—'}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{c.d30 != null ? `${c.d30}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={s.muted}>Not enough signup history yet.</div>}
            </Panel>

            <Panel title="Conversion Funnel" icon="🫙" tag={rangeLabel} style={{ marginBottom: 18 }}>
              {!funnel || funnel.stages?.[0]?.count === 0 ? <div style={s.muted}>No session data yet.</div> : (
                <div>{funnel.stages.map((stage, i) => (
                  <div key={stage.key} style={s.funnelRow}>
                    <div style={s.funnelHead}><span style={s.funnelLabel}>{stage.label}</span><span style={s.funnelMeta}>{stage.count.toLocaleString()} · {stage.pctOfTop}% of top</span></div>
                    <div style={s.funnelTrack}><div style={{ ...s.funnelFill, width: `${Math.max(stage.pctOfTop, 1)}%` }}>{stage.pctOfTop >= 8 ? `${stage.pctOfTop}%` : ''}</div></div>
                    {i > 0 && stage.dropFromPrev > 0 && <div style={s.funnelDrop}>▼ {stage.dropFromPrev}% drop-off</div>}
                  </div>
                ))}</div>
              )}
            </Panel>

            <Panel title="User Behavior" icon="🧭" tag={rangeLabel}>
              <div style={s.statRow}>
                <StatTile label="Sessions" value={(behavior?.sessions ?? 0).toLocaleString()} />
                <StatTile label="Avg Pages / Session" value={behavior?.avgPagesPerSession ?? 0} accent="#60a5fa" />
                <StatTile label="Bounce Rate" value={`${behavior?.bounceRate ?? 0}%`} accent="#f87171" />
              </div>
              <div style={s.twoCol}>
                {[['➡️ Entry Pages', behavior?.entryPages], ['🚪 Exit Pages', behavior?.exitPages]].map(([title, rows]) => (
                  <div key={title}>
                    <div style={s.subHead}>{title}</div>
                    <table style={s.table}>
                      <thead><tr><th style={s.th}>Page</th><th style={{ ...s.th, textAlign: 'right' }}>Sessions</th></tr></thead>
                      <tbody>
                        {(rows || []).map(p => <tr key={p.page}><td style={s.td}>{p.page}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{p.count.toLocaleString()}</td></tr>)}
                        {(!rows || rows.length === 0) && <tr><td style={s.td} colSpan={2}><span style={s.muted}>No data yet.</span></td></tr>}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ===================== GAMES ===================== */}
        {tab === 'games' && (
          <>
            <Panel title="Game Analytics" icon="♟️" tag={rangeLabel} style={{ marginBottom: 18 }}>
              <div style={s.twoCol}>
                <div style={s.statRow}>
                  <StatTile label="Games Started" value={(games?.gamesStarted ?? 0).toLocaleString()} />
                  <StatTile label="Games Completed" value={(games?.gamesCompleted ?? 0).toLocaleString()} accent="#34d399" />
                  <StatTile label="Abort Rate" value={`${games?.abortRate ?? 0}%`} accent="#f87171" />
                  <StatTile label="Avg Game Length" value={games?.avgGameLengthSec ? `${games.avgGameLengthSec}s` : '—'} accent="#60a5fa" />
                </div>
                <div>
                  <div style={s.subHead}>Result breakdown</div>
                  <div style={s.doughnutBox}>{games?.resultBreakdown?.length > 0 ? <Doughnut data={gameResultChart} options={doughnutOptions} /> : <span style={s.muted}>No finished games yet.</span>}</div>
                </div>
              </div>
            </Panel>

            {/* Arena tournament games — the only games users play right now. */}
            <Panel title="Arena Tournament Games" icon="🏟️" tag={rangeLabel} style={{ marginBottom: 18 }}>
              <div style={s.statRow}>
                <StatTile label="Arena Games Played" value={(games?.arena?.gamesPlayed ?? 0).toLocaleString()} />
                <StatTile label="Completed" value={(games?.arena?.gamesCompleted ?? 0).toLocaleString()} accent="#34d399" />
                <StatTile label="Aborted" value={(games?.arena?.gamesAborted ?? 0).toLocaleString()} accent="#f87171" />
              </div>
              <div style={s.subHead}>By tournament type</div>
              {games?.arena?.byType?.length > 0 ? (
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Type</th><th style={{ ...s.th, textAlign: 'right' }}>Games</th></tr></thead>
                  <tbody>
                    {games.arena.byType.map(t => (
                      <tr key={t.type}>
                        <td style={s.td}>{t.label}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{t.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={s.muted}>No arena games played in this range.</div>}
            </Panel>

            <Panel title="Puzzle Analytics" icon="🧩" tag={rangeLabel}>
              <div style={s.statRow}>
                <StatTile label="Attempts" value={(puzzles?.attempts ?? 0).toLocaleString()} />
                <StatTile label="Solved" value={(puzzles?.solved ?? 0).toLocaleString()} accent="#34d399" />
                <StatTile label="Success Rate" value={`${puzzles?.successRate ?? 0}%`} accent="#60a5fa" />
                <StatTile label="Avg Solve Time" value={puzzles?.avgSolveTimeSec ? `${puzzles.avgSolveTimeSec}s` : '—'} accent="#fbbf24" />
              </div>
              {puzzles?.popularPuzzles?.length > 0 ? (
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Puzzle</th><th style={s.th}>Difficulty</th><th style={{ ...s.th, textAlign: 'right' }}>Attempts</th></tr></thead>
                  <tbody>
                    {puzzles.popularPuzzles.map(p => <tr key={String(p.puzzleId)}><td style={s.td}>{p.title || String(p.puzzleId)}</td><td style={s.td}>{p.difficulty || '—'}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{p.attempts.toLocaleString()}</td></tr>)}
                  </tbody>
                </table>
              ) : <div style={s.muted}>No puzzle data yet for this range.</div>}
            </Panel>
          </>
        )}

        {/* ===================== PAGES ===================== */}
        {tab === 'pages' && (
          <Panel title={`Page Views ${pages ? `· ${pages.totalPageViews?.toLocaleString() || 0} total` : ''}`} icon="📄" tag={rangeLabel}>
            {!pages || pages.mostVisited?.length === 0 ? <div style={s.muted}>No page-view data yet.</div> : (
              <div style={s.twoCol}>
                <div style={s.chartBox}><Bar data={pageChart} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: barScales }} /></div>
                <div>
                  <table style={s.table}>
                    <thead><tr><th style={s.th}>Page</th><th style={{ ...s.th, textAlign: 'right' }}>Views</th><th style={{ ...s.th, textAlign: 'right' }}>Avg time</th></tr></thead>
                    <tbody>
                      {pages.mostVisited.map(row => <tr key={row.page}><td style={s.td}>{row.page}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{row.views.toLocaleString()}</td><td style={{ ...s.td, textAlign: 'right', color: '#67e8f9' }}>{row.avgTimeSec ? `${row.avgTimeSec}s` : '—'}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* ===================== PERFORMANCE ===================== */}
        {tab === 'performance' && (() => {
          const health = performance?.health;
          const theme = HEALTH_THEME[health?.status] || HEALTH_THEME.healthy;
          const sb = performance?.client?.statusBreakdown || {};
          const statusTotal = (sb['5xx'] ?? 0) + (sb['4xx'] ?? 0) + (sb.network ?? 0);
          const trend = build24hTrend(performance?.client?.errorTrend);
          const trendTotal = trend.reduce((sum, t) => sum + t.count, 0);
          const trendMax = Math.max(1, ...trend.map(t => t.count));
          return (
            <>
              <Panel title="Health Monitor" icon="🩺" right={<span style={s.muted}>auto-refresh 30s</span>} style={{ marginBottom: 18 }}>
                <div style={{ ...s.healthBanner, background: theme.bg, borderColor: theme.border, color: theme.color, ...(theme.pulse ? { animation: 'healthPulse 1.4s ease-in-out infinite' } : {}) }}>
                  <span style={s.healthIcon}>{theme.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...s.healthStatus, color: theme.color }}>{health?.status || 'unknown'}</div>
                    <div style={s.healthReasons}>{(health?.reasons || []).join(' · ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 24, fontWeight: 800, color: theme.color }}>{health?.errLastHour ?? 0}</div><div style={{ fontSize: 12 }}>errors last hour {health?.spiking ? '▲ spiking' : ''}</div></div>
                </div>
                <div style={s.statRow}>
                  <StatTile label="Avg Response · since restart" value={performance?.server?.avgResponseMs != null ? `${performance.server.avgResponseMs}ms` : '—'} accent="#60a5fa" />
                  <StatTile label="Server Error Rate · since restart" value={`${performance?.server?.errorRate ?? 0}%`} accent="#f87171" />
                  <StatTile label={`5xx · ${rangeLabel}`} value={(sb['5xx'] ?? 0).toLocaleString()} accent="#f87171" />
                  <StatTile label={`4xx · ${rangeLabel}`} value={(sb['4xx'] ?? 0).toLocaleString()} accent="#fb923c" />
                  <StatTile label={`Network · ${rangeLabel}`} value={(sb.network ?? 0).toLocaleString()} />
                  <StatTile label={`JS Errors · ${rangeLabel}`} value={(performance?.client?.clientErrors ?? 0).toLocaleString()} accent="#fb923c" />
                </div>
                <div style={s.twoCol}>
                  <div>
                    <div style={s.subHead}>📉 Error trend (24h){trendTotal > 0 ? ` · ${trendTotal} total` : ''}</div>
                    {trendTotal === 0 ? <div style={{ ...s.muted, padding: '8px 0' }}>No errors in the last 24h. 🎉</div> : (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64, padding: '0 2px' }}>
                        {trend.map(t => <div key={t.hour} style={{ flex: 1, borderRadius: '4px 4px 2px 2px', minHeight: 2, height: t.count > 0 ? `${Math.max(8, (t.count / trendMax) * 100)}%` : '3px', background: t.count > 0 ? 'linear-gradient(180deg,#f87171,#b91c1c)' : 'rgba(255,255,255,0.08)', boxShadow: t.count > 0 ? '0 0 10px rgba(248,113,113,0.4)' : 'none' }} title={`${t.hour.slice(11)}:00 UTC — ${t.count}`} />)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={s.subHead}>Failure types</div>
                    <div style={s.doughnutBox}>{statusTotal > 0 ? <Doughnut data={statusChart} options={doughnutOptions} /> : <span style={s.muted}>No API failures. 🎉</span>}</div>
                  </div>
                </div>
              </Panel>

              <Panel title="Slowest Routes" icon="🐢" tag="Since restart" tagFixed>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Route</th><th style={{ ...s.th, textAlign: 'right' }}>Avg</th><th style={{ ...s.th, textAlign: 'right' }}>Max</th><th style={{ ...s.th, textAlign: 'right' }}>Err%</th></tr></thead>
                  <tbody>
                    {(performance?.server?.slowestRoutes || []).map(r => <tr key={r.route}><td style={s.td}><span style={s.errMsg}>{r.route}</span></td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{r.avgMs}ms</td><td style={{ ...s.td, textAlign: 'right' }}>{r.maxMs}ms</td><td style={{ ...s.td, textAlign: 'right', color: r.errorRate > 0 ? '#f87171' : '#94a3b8' }}>{r.errorRate}%</td></tr>)}
                    {(!performance?.server?.slowestRoutes || performance.server.slowestRoutes.length === 0) && <tr><td style={s.td} colSpan={4}><span style={s.muted}>No traffic recorded since last restart.</span></td></tr>}
                  </tbody>
                </table>
              </Panel>
            </>
          );
        })()}

        {/* ===================== ALERTS ===================== */}
        {tab === 'alerts' && (() => {
          const newSet = new Set(performance?.health?.newErrorTypes || []);
          return (
            <>
              <Panel title="Most Common Errors" icon="🐞" tag={rangeLabel} style={{ marginBottom: 18 }}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Error message</th><th style={{ ...s.th, textAlign: 'right' }}>Count</th><th style={{ ...s.th, textAlign: 'right' }}>Users</th><th style={{ ...s.th, textAlign: 'right' }}>Last seen</th></tr></thead>
                  <tbody>
                    {(performance?.client?.topErrors || []).map((e, i) => (
                      <tr key={i}>
                        <td style={{ ...s.td, maxWidth: 480 }}><span style={s.errMsg}>{e.message}</span>{newSet.has(e.message) && <span style={s.newBadge}>NEW</span>}{e.source && <div style={{ ...s.muted, fontSize: 11 }}>{e.source}</div>}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{e.count.toLocaleString()}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{e.affected}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{timeAgo(e.lastSeen)}</td>
                      </tr>
                    ))}
                    {(!performance?.client?.topErrors || performance.client.topErrors.length === 0) && <tr><td style={s.td} colSpan={4}><span style={s.muted}>No JS errors in range. 🎉</span></td></tr>}
                  </tbody>
                </table>
              </Panel>
              <Panel title="Top Failing Endpoints" icon="🔌" tag={rangeLabel}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>Endpoint</th><th style={{ ...s.th, textAlign: 'right' }}>Status</th><th style={{ ...s.th, textAlign: 'right' }}>Count</th></tr></thead>
                  <tbody>
                    {(performance?.client?.topApiFailures || []).map((f, i) => <tr key={i}><td style={s.td}><span style={s.errMsg}>{f.method ? `${f.method} ` : ''}{f.url}</span></td><td style={{ ...s.td, textAlign: 'right', color: f.status >= 500 ? '#f87171' : '#fb923c', fontWeight: 700 }}>{f.status || 'net'}</td><td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{f.count.toLocaleString()}</td></tr>)}
                    {(!performance?.client?.topApiFailures || performance.client.topApiFailures.length === 0) && <tr><td style={s.td} colSpan={3}><span style={s.muted}>No API failures in range. 🎉</span></td></tr>}
                  </tbody>
                </table>
              </Panel>
            </>
          );
        })()}

        {/* ===================== REAL-TIME ===================== */}
        {tab === 'realtime' && (
          <>
            <div style={s.kpiGrid}>
              {[
                { label: 'Online Now', icon: '👥', color: '#a78bfa', val: realtime?.onlineNow, spark: rtHist.online },
                { label: 'Logged In', icon: '🔐', color: '#34d399', val: realtime?.loggedIn, spark: rtHist.loggedIn },
                { label: 'Guests', icon: '🎭', color: '#fbbf24', val: realtime?.guests },
                { label: 'Active Games', icon: '♟️', color: '#22d3ee', val: realtime?.activeGames, spark: rtHist.games }
              ].map(k => (
                <div key={k.label} style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <span style={{ ...s.kpiIcon, background: `linear-gradient(135deg, ${k.color}, ${hexToRgba(k.color, 0.5)})` }}>{k.icon}</span>
                    <div><p style={s.kpiLabel}>{k.label}</p><div style={s.kpiValue}>{k.val ?? '…'}</div></div>
                  </div>
                  {k.spark && k.spark.length > 1 ? <div style={s.kpiSpark}><Sparkline data={k.spark} color={k.color} /></div> : <div style={s.kpiCaption}>Live now</div>}
                </div>
              ))}
            </div>
            <Panel title="Live Events" icon="⚡" right={<span style={s.liveBadge}>● LIVE</span>}>
              <div style={s.stream}>
                {(realtime?.recentEvents || []).length === 0 ? <div style={{ ...s.streamRow, color: '#64748b' }}>Waiting for events…</div> : (
                  realtime.recentEvents.map((e, i) => (
                    <div key={i} style={s.streamRow}>
                      <span><span style={s.badge}>{e.eventType}</span> <strong style={{ color: '#e2e8f0' }}>{e.user}</strong>{e.page ? <span style={{ color: '#94a3b8' }}> · {e.page}</span> : ''}</span>
                      <span style={s.muted}>{e.device || ''} · {timeAgo(e.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </>
        )}

        {tab === 'livefeed' && (
          <Panel
            title="Request Activity"
            icon="📡"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setFeedErrorsOnly(v => !v)}
                  style={feedErrorsOnly ? s.toggleActive : s.toggle}
                  title="Show only requests that returned 4xx/5xx"
                >
                  Errors only
                </button>
                <span style={s.liveBadge}>● LIVE</span>
              </div>
            }
          >
            <div style={{ color: '#64748b', fontSize: 12, padding: '0 2px 10px' }}>
              Live HTTP requests since the last server restart. Spot a failing or slow endpoint here,
              then SSH to the server and run <code style={{ color: '#94a3b8' }}>pm2 logs chessnexus-api</code> for the full trace.
            </div>
            <div style={s.stream}>
              {(feed?.requests || []).length === 0 ? (
                <div style={{ ...s.streamRow, color: '#64748b' }}>
                  {feedErrorsOnly ? 'No errors recorded yet.' : 'Waiting for requests…'}
                </div>
              ) : (
                feed.requests.map((r, i) => (
                  <div key={i} style={s.streamRow}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{
                        color: statusColor(r.status), fontWeight: 800, fontSize: 12,
                        minWidth: 34, textAlign: 'right'
                      }}>{r.status}</span>
                      <span style={{ ...s.badge, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)' }}>{r.method}</span>
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</span>
                      {r.errName ? (
                        <span style={{ ...s.badge, background: 'rgba(248,113,113,0.14)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}>{r.errName}</span>
                      ) : null}
                    </span>
                    <span style={s.muted}>{r.ms}ms · {timeAgo(r.at)}</span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}
