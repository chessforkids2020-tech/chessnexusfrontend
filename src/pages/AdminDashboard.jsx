// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import socket from "../socket";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const API = import.meta.env.VITE_API_URL;

const styles = {
  page: { padding: 18, paddingTop: 90, fontFamily: "Inter, Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logo: { fontSize: 20, color: "#072b05", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "360px 1fr 360px", gap: 14 },
  col: { background: "#f6fff6", padding: 12, borderRadius: 10 },
  colWide: { background: "#f6fff6", padding: 12, borderRadius: 10, overflow: "auto" },
  card: { background: "#fff", padding: 10, borderRadius: 10, marginBottom: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.03)" },
  quickLinksGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 },
  quickLinkCard: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 200, padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e6f1e6', boxShadow: '0 10px 24px rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
  quickLinkTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#064f28' },
  quickLinkText: { margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.5 },
  quickLinkFooter: { marginTop: 16, alignSelf: 'flex-start', padding: '8px 16px', background: '#f0f9ff', color: '#0369a1', borderRadius: 8, fontWeight: 700, fontSize: 13, border: '1px solid #bae6fd' },
  input: { padding: 8, borderRadius: 8, marginTop: 8, border: "1px solid #e6f1e6", width: "100%" },
  primaryBtn: { padding: "8px 12px", background: "#0b6623", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", marginTop: 8 },
  secondaryBtn: { padding: "8px 12px", background: "#f0f9f0", color: "#064f28", border: "1px solid #d6f0d6", borderRadius: 8, cursor: "pointer" },
  smallBtn: { padding: "6px 8px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  roundCard: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12 },
  roundCardCollapsed: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, cursor: "pointer", transition: "all 0.2s ease" },
  roundCardExpanded: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, cursor: "default", transition: "all 0.2s ease" },
  roundHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  batchCard: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", width: 260, cursor: "pointer", transition: "all 0.2s ease" },
  batchCardCollapsed: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", minWidth: 200, cursor: "pointer", transition: "all 0.2s ease" },
  batchCardExpanded: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", width: 260, cursor: "default", transition: "all 0.2s ease" },
  batchHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  batchTitle: { fontWeight: 700, flex: 1 },
  expandIcon: { fontSize: 12, color: "#64748b", marginLeft: 8 },
  userChip: { padding: "4px 8px", background: "#fff", borderRadius: 6, border: "1px solid #e6f1e6" },
  usersTableWrap: { 
    marginTop: 16, 
    background: "#fff", 
    padding: 16, 
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  tableContainer: { 
    overflow: "auto", 
    maxHeight: "600px",
    border: "1px solid #e5e7eb",
    borderRadius: 8
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse",
    fontSize: 14
  },
  tableHeader: { 
    background: "#f9fafb",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  th: { 
    padding: "12px 8px", 
    textAlign: "left", 
    fontWeight: 600,
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    fontSize: 13
  },
  tableRow: { 
    borderBottom: "1px solid #f3f4f6",
    transition: "background-color 0.2s"
  },
  td: { 
    padding: "12px 8px", 
    verticalAlign: "middle",
    fontSize: 13
  },
  usernameCell: {
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  onlineIndicator: {
    color: "#10b981",
    fontSize: 8
  },
  roleTag: {
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  statusTag: {
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  assignmentTag: {
    padding: "4px 8px",
    background: "#fef3c7",
    color: "#d97706",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  lichessLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500
  },
  dateCell: {
    display: "flex",
    flexDirection: "column"
  },
  timeCell: {
    fontSize: 11,
    color: "#6b7280"
  }
};

const roundsBackupStyles = {
  roundsBackupWrap: {
    marginTop: 32,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  },
  roundCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16
  },
  roundBackupCard: {
    background: '#f8fffa',
    border: '2px solid #e6f3ea',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
  },
  roundCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roundNumber: {
    background: '#064f28',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  roundCardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roundStat: {
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: 24,
    fontWeight: 700,
    color: '#064f28'
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500
  },
  roundStatus: {
    fontSize: 14
  },
  roundCardDate: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20
  },
  batchCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16
  },
  batchBackupCard: {
    background: '#fff',
    border: '2px solid #e6f3ea',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
  },
  batchCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  batchCardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  batchStat: {
    textAlign: 'center'
  },
  batchStatNumber: {
    display: 'block',
    fontSize: 18,
    fontWeight: 600,
    color: '#064f28'
  },
  batchStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 500
  },
  batchCardUsers: {
    borderTop: '1px solid #e6f3ea',
    paddingTop: 12
  },
  miniUserChip: {
    background: '#f0f9f0',
    color: '#064f28',
    padding: '2px 6px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 500
  },
  resultsTableWrap: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  chartCard: {
    background: '#fff',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartToolbar: {
    display: 'flex',
    gap: 8
  },
  chartToggleButton: {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600
  },
  chartToggleButtonActive: {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #0b6623',
    background: '#0b6623',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600
  },
  chartHistoryButton: {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #94a3b8',
    background: '#f8fafc',
    color: '#0f172a',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600
  },
  chartHistoryButtonActive: {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600
  },
  recordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 16
  },
  recordCard: {
    background: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e2e8f0'
  },
  recordLabel: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6
  }
};

// Merge styles
Object.assign(styles, roundsBackupStyles);

// ─── Avatar XP Prices (admin-tunable wallet prices for cosmetic unlocks) ──────
function AvatarXpPrices() {
  const [prices, setPrices] = useState({ avatarCustomPhoto: 0, avatar3d: 0 });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/api/admin/settings')
      .then(res => { setPrices(res.data?.xpPrices || { avatarCustomPhoto: 0, avatar3d: 0 }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await api.put('/api/admin/settings', { xpPrices: prices });
      setPrices(res.data?.xpPrices || prices);
      setMsg('Saved ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: 90, padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 };

  return (
    <div style={{ ...styles.card, padding: 16, marginTop: 20, background: '#ffffff', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginTop: 0, marginBottom: 4, color: '#0f172a' }}>👛 Avatar XP Prices</h3>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Wallet XP a user spends to unlock these avatar tiers (invite milestones still unlock them free).
      </div>
      {!loaded ? <div style={{ color: '#94a3b8' }}>Loading…</div> : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#334155' }}>
            📸 Custom Photo (XP)
            <input type="number" min={0} style={inputStyle} value={prices.avatarCustomPhoto}
              onChange={e => setPrices({ ...prices, avatarCustomPhoto: Math.max(0, +e.target.value || 0) })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#334155' }}>
            🌌 3D Model (XP)
            <input type="number" min={0} style={inputStyle} value={prices.avatar3d}
              onChange={e => setPrices({ ...prices, avatar3d: Math.max(0, +e.target.value || 0) })} />
          </label>
          <button onClick={save} disabled={saving} style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save prices'}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.includes('fail') ? '#dc2626' : '#16a34a' }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  // Contact messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);   // msg._id being replied to
  const [replyText, setReplyText] = useState('');
  const [puzzles, setPuzzles] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsView, setAnalyticsView] = useState('week');
  const [showAnalyticsHistory, setShowAnalyticsHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [expandedBatches, setExpandedBatches] = useState({}); // Track which batches are expanded
  const [expandedRounds, setExpandedRounds] = useState({}); // Track which rounds are expanded
  // Signup & payment requests state
  const [pendingSignupCount, setPendingSignupCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [coachAnalytics, setCoachAnalytics] = useState(null);
  const [coachList, setCoachList] = useState(null);
  const [coachListLoading, setCoachListLoading] = useState(false);
  // Arena Tournaments admin state
  const [arenaTournaments, setArenaTournaments] = useState([]);
  const [loadingArenaTournaments, setLoadingArenaTournaments] = useState(false);
  const [arenaListCollapsed, setArenaListCollapsed] = useState(true); // list is long — collapsed by default
  const [showArenaCreateModal, setShowArenaCreateModal] = useState(false);
  const [creatingArenaTournament, setCreatingArenaTournament] = useState(false);
  const [arenaCreateError, setArenaCreateError] = useState('');
  const ARENA_TEAM_SUGGESTIONS = ['Dragons', 'Wolves', 'Eagles', 'Tigers', 'Lions', 'Panthers', 'Sharks', 'Hawks', 'Cobras', 'Falcons'];
  const [arenaTeamCount, setArenaTeamCount] = useState(2);
  const [arenaTeamNames, setArenaTeamNames] = useState(['Dragons', 'Wolves']);
  const [arenaCreateForm, setArenaCreateForm] = useState({
    name: '',
    tournamentType: 'standard',
    timeControlMinutes: 5,
    timeControlIncrement: 0,
    tournamentDurationHours: 0,
    tournamentDurationMinutes: 30,
    scheduledStartDate: '',
    scheduledStartTime: '',
    description: ''
  });
  const [forms, setForms] = useState({
    newUserName: "",
    newUserPass: "",
    newUserConfirmPass: "",
    newUserDisplay: "",
    newUserAge: "",
    newUserCountry: "",
    newUserTimeZone: "",
    newUserLichess: "",
    newUserChessCom: "",
    newUserEmail: "",
    newUserParentEmail: "",
    puzzleTitle: "",
    puzzleFen: "",
    puzzleSolution: "",
    puzzleMoveLimit: 10,
    puzzleWhoPlayed: "",
    puzzleDifficulty: "medium",
    puzzleRating: "1200",
    roundName: "",
    roundNumber: 1,
    batchName: "",
    batchDuration: 300,
    assignUserIds: [],
    assignPuzzleIds: [],
    selectedRoundForBatch: "",
    selectedBatchForAssign: "",
    editingRound: null,
    editingBatch: null,
    editRoundName: "",
    editRoundNumber: "",
    editBatchName: "",
    editBatchDuration: "",
    editingUser: null,
    editUserName: "",
    editUserDisplay: "",
    editUserRole: "",
    editUserAge: "",
    editUserCountry: "",
    editUserTimeZone: "",
    editUserLichess: "",
    editUserChessCom: "",
    editUserPass: "",
  });

  useEffect(() => {
    fetchAll();
    fetchSignupRequestsCount();
    fetchPendingPaymentCount();
    fetchArenaTournaments();

    const handleNewSignupRequest = () => {
      fetchSignupRequestsCount();
    };
    const handlePendingPaymentCount = (count) => {
      setPendingPaymentCount(typeof count === 'object' ? (count.count || 0) : (count || 0));
    };

    socket.on("newSignupRequest", handleNewSignupRequest);
    socket.on('admin:pendingPaymentCount', handlePendingPaymentCount);

    return () => {
      socket.off("newSignupRequest", handleNewSignupRequest);
      socket.off('admin:pendingPaymentCount', handlePendingPaymentCount);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchContactMessages();
  }, []);

  // Fetch contact messages from public API
  async function fetchContactMessages() {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/public/contact`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function markMessageRead(id) {
    try {
      await api.put(`/api/admin/contact/${id}/read`);
      setMessages(prev => prev.map(m => m._id === id ? { ...m, read: true } : m));
    } catch (err) {
      alert('Failed to mark as read');
    }
  }

  async function replyToMessage(id) {
    if (!replyText.trim()) return alert('Please type a reply first');
    try {
      await api.post(`/api/admin/contact/${id}/reply`, { replyText });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, read: true, replied: true } : m));
      setReplyingTo(null);
      setReplyText('');
      alert('Reply sent successfully!');
    } catch (err) {
      alert('Failed to send reply: ' + (err?.response?.data?.message || err.message));
    }
  }

  // Fetch signup & pending payment counts
  async function fetchSignupRequestsCount() {
    try {
      const res = await api.get(`/api/admin/signup-requests/count`);
      setPendingSignupCount(res.data.count || 0);
    } catch (err) {
    }
  }

  async function fetchPendingPaymentCount() {
    try {
      const res = await api.get(`/api/admin/attendance/payment-requests/count`);
      setPendingPaymentCount(res.data.count || 0);
    } catch (err) {
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#334155' }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: {
          color: '#334155',
          callback: (value) => Number.isInteger(value) ? value : '',
          precision: 0,
          stepSize: 1
        }
      }
    }
  };

  const buildChartData = (label, series, borderColor) => ({
    labels: series.map(item => item.label),
    datasets: [
      {
        label,
        data: series.map(item => item.count),
        borderColor,
        backgroundColor: borderColor,
        tension: 0.35,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  });

  const getSignupSeries = () => {
    if (!analytics) return buildChartData('Signups', [], '#2563eb');
    const series = analyticsView === 'week'
      ? analytics.trends.dailySignups.slice(-7)
      : analytics.trends.monthlySignups;
    return buildChartData(analyticsView === 'week' ? 'Daily signups' : 'Monthly signups', series, '#2563eb');
  };

  const getActiveSeries = () => {
    if (!analytics) return buildChartData('Active users', [], '#10b981');
    const series = analyticsView === 'week'
      ? analytics.trends.dailyActiveUsers.slice(-7)
      : analytics.trends.monthlyActiveUsers;
    return buildChartData(analyticsView === 'week' ? 'Daily active users' : 'Monthly active users', series, '#10b981');
  };

  const formatTrendValue = (value) => typeof value === 'number' ? value.toLocaleString() : '-';

  const getAnalyticsHistory = () => {
    if (!analytics || !analytics.trends) return [];
    const signups = analytics.trends.monthlySignups || [];
    const activeUsers = analytics.trends.monthlyActiveUsers || [];
    const history = [];

    signups.forEach((item, index) => {
      history.push({
        month: item.label,
        signups: item.count,
        activeUsers: activeUsers[index]?.count ?? 0
      });
    });

    return history;
  };

  async function fetchAll() {
    setLoading(true);
    try {
      const [uRes, pRes, rRes, aRes, analyticsRes, coachRes] = await Promise.all([
        api.get(`/api/admin/users`),
        api.get(`/api/admin/puzzles`),
        api.get(`/api/admin/rounds`),
        api.get(`/api/admin/activity`).catch(() => ({ data: [] })),
        api.get(`/api/admin/analytics/trends`).catch(() => ({ data: null })),
        api.get(`/api/admin/coach-analytics`).catch(() => ({ data: null }))
      ]);
      const usersArr = Array.isArray(uRes?.data) ? uRes.data : [];
      const puzzlesArr = Array.isArray(pRes?.data) ? pRes.data : [];
      const roundsArr = Array.isArray(rRes?.data) ? rRes.data : [];
      const activityArr = Array.isArray(aRes?.data) ? aRes.data : [];
      const analyticsData = analyticsRes?.data || null;


      setUsers(usersArr);
      setPuzzles(puzzlesArr);
      setRounds(roundsArr);
      setActivity(activityArr);
      setAnalytics(analyticsData);
      setCoachAnalytics(coachRes?.data || null);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert("Session expired. Please login again as admin.");
        nav("/login?role=admin");
      } else {
        alert("Failed to fetch admin data: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  }

  // Load the detailed coach list (lazy — when admin opens the coach section).
  async function loadCoaches() {
    setCoachListLoading(true);
    try {
      const res = await api.get('/api/admin/coaches');
      setCoachList(res.data?.coaches || []);
    } catch {
      setCoachList([]);
    } finally {
      setCoachListLoading(false);
    }
  }

  async function verifyCoach(id, verified) {
    try {
      await api.post(`/api/admin/coaches/${id}/verify`, { verified });
      setCoachList(list => (list || []).map(c => c.id === id ? { ...c, verified } : c));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update coach');
    }
  }

  // ---------------- Admin actions ----------------


  async function createPuzzle() {
    try {
      const { puzzleTitle, puzzleFen, puzzleSolution, puzzleMoveLimit, puzzleWhoPlayed, puzzleDifficulty, puzzleRating } = forms;
      if (!puzzleTitle) return alert("title required");
      // solution: comma separated moves
      const solution = (puzzleSolution || "").split(",").map(s => s.trim()).filter(Boolean);
      const res = await api.post(`/api/admin/puzzles`, { 
        title: puzzleTitle, 
        fen: puzzleFen, 
        solution, 
        moveLimit: puzzleMoveLimit || 10,
        whoPlayed: puzzleWhoPlayed,
        difficulty: puzzleDifficulty,
        rating: puzzleRating
      }, { withCredentials: true });
      alert("Puzzle created: " + res.data.title);
      setForms({ ...forms, puzzleTitle: "", puzzleFen: "", puzzleSolution: "", puzzleMoveLimit: 10, puzzleWhoPlayed: "", puzzleDifficulty: "medium", puzzleRating: "1200" });
      fetchAll();
    } catch (err) {
      alert("Create puzzle failed");
    }
  }

  async function createRound() {
    try {
      const { roundName, roundNumber } = forms;
      if (!roundName) return alert("round name required");
      await api.post(`/api/admin/rounds`, { name: roundName, number: parseInt(roundNumber || 1) });
      alert("Round created");
      setForms({ ...forms, roundName: "", roundNumber: 1 });
      fetchAll();
    } catch (err) {
      alert("Create round failed");
    }
  }

  async function createBatch(roundId) {
    try {
      const { batchName, batchDuration } = forms;
      if (!batchName) return alert("batch name required");
      await api.post(`/api/admin/rounds/${roundId}/batches`, { name: batchName, durationSec: parseInt(batchDuration || 5) * 60 });
      alert("Batch created");
      setForms({ ...forms, batchName: "", batchDuration: 5 });
      fetchAll();
    } catch (err) {
      alert("Create batch failed");
    }
  }

  async function assignUsersToBatch(batchId) {
    try {
      const userIds = (forms.assignUserIds || []).filter(Boolean);
      if (!userIds.length) return alert("Select at least one user to assign");
      await api.post(`/api/admin/batches/${batchId}/assign`, { userIds });
      alert("Users assigned to batch");
      setForms({ ...forms, assignUserIds: [] });
      fetchAll();
    } catch (err) {
      alert("Assign users failed");
    }
  }

  async function attachPuzzlesToBatch(batchId) {
    try {
      const puzzleIds = (forms.assignPuzzleIds || []).filter(Boolean);
      if (!puzzleIds.length) return alert("Select puzzles to attach");
      await api.post(`/api/admin/batches/${batchId}/puzzles`, { puzzleIds });
      alert("Puzzles attached");
      setForms({ ...forms, assignPuzzleIds: [] });
      fetchAll();
    } catch (err) {
      alert("Attach puzzles failed");
    }
  }

  async function startRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/start`, {});
      alert("Round started");
      fetchAll();
    } catch (err) {
      alert("Start round failed");
    }
  }

  async function stopRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/stop`, {});
      alert("Round stopped");
      fetchAll();
    } catch (err) {
      alert("Stop round failed");
    }
  }

  async function createRace() {
    try {
      const { raceTopic, raceTimeLimit } = forms;
      if (!raceTopic) return alert("Topic required");
      if (!raceTimeLimit || raceTimeLimit < 1) return alert("Valid time limit required");
      const res = await api.post(`/api/admin/arena`, { 
        topic: raceTopic, 
        timeLimit: parseInt(raceTimeLimit) 
      }, { withCredentials: true });
      alert("Race created: " + res.data.roomId);
      setForms({ ...forms, raceTopic: "", raceTimeLimit: 10 });
      fetchAll();
    } catch (err) {
      alert("Create race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function startRace(roomId) {
    try {
      await api.post(`/api/admin/arena/start/${roomId}`, {});
      alert("Race started!");
      fetchAll();
    } catch (err) {
      alert("Start race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function deleteRace(roomId) {
    if (!confirm("Are you sure you want to delete this race?")) return;
    try {
      await api.delete(`/api/admin/arena/delete/${roomId}`);
      alert("Race deleted successfully");
      fetchAll();
    } catch (err) {
      alert("Delete race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  function viewLiveLeaderboard(roomId) {
    window.open(`/admin/arena/live/${roomId}`, '_blank');
  }

  async function fetchArenaTournaments() {
    try {
      setLoadingArenaTournaments(true);
      const res = await api.get('/api/arenatournament/admin/all');
      setArenaTournaments(res.data?.tournaments || []);
    } catch (err) {
      console.error('Failed to load arena tournaments:', err);
    } finally {
      setLoadingArenaTournaments(false);
    }
  }

  async function deleteArenaTournament(tournamentId, name) {
    if (!confirm(`Delete tournament "${name}"?\n\nThis will release all reserved bots, kick connected users out of the lobby/live page, and permanently remove participants, games and chat.`)) return;
    try {
      await api.delete(`/api/arenatournament/${tournamentId}`);
      setArenaTournaments(list => list.filter(t => t._id !== tournamentId));
    } catch (err) {
      alert('Delete tournament failed: ' + (err?.response?.data?.error || err.message));
    }
  }

  function openArenaCreateModal() {
    // Prefill start time = now + 5 minutes, calculated in IST explicitly
    const pad = (n) => String(n).padStart(2, '0');
    const istMs = Date.now() + 5 * 60 * 1000 + 5.5 * 60 * 60 * 1000; // UTC + 5:30
    const ist = new Date(istMs);
    const dateStr = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
    const timeStr = `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
    setArenaCreateForm({
      name: '',
      tournamentType: 'standard',
      timeControlMinutes: 5,
      timeControlIncrement: 0,
      tournamentDurationHours: 0,
      tournamentDurationMinutes: 30,
      scheduledStartDate: dateStr,
      scheduledStartTime: timeStr,
      description: ''
    });
    setArenaTeamCount(2);
    setArenaTeamNames(ARENA_TEAM_SUGGESTIONS.slice(0, 2));
    setArenaCreateError('');
    setShowArenaCreateModal(true);
  }

  async function submitArenaCreate(e) {
    e?.preventDefault?.();
    if (creatingArenaTournament) return;
    const f = arenaCreateForm;
    if (!f.name.trim()) { setArenaCreateError('Name is required'); return; }
    if (!f.scheduledStartDate || !f.scheduledStartTime) { setArenaCreateError('Start date and time required'); return; }
    // Always treat input as IST (UTC+5:30), explicitly convert to UTC
    const [sdY, sdM, sdD] = f.scheduledStartDate.split('-').map(Number);
    const [stH, stMin] = f.scheduledStartTime.split(':').map(Number);
    const scheduled = new Date(Date.UTC(sdY, sdM - 1, sdD, stH - 5, stMin - 30));
    if (isNaN(scheduled.getTime())) { setArenaCreateError('Invalid start date/time'); return; }

    const isMarathon = f.tournamentType === 'bullet_blitz_marathon';
    const isTeamBattle = f.tournamentType === 'team_battle';

    const payload = {
      name: f.name.trim(),
      scheduledStartTime: scheduled.toISOString(),
      description: f.description,
      createdInTimezone: 'Asia/Kolkata',
      tournamentType: f.tournamentType
    };
    if (!isMarathon) {
      payload.timeControlMinutes = parseInt(f.timeControlMinutes) || 5;
      payload.timeControlIncrement = parseInt(f.timeControlIncrement) || 0;
      payload.tournamentDurationHours = parseInt(f.tournamentDurationHours) || 0;
      payload.tournamentDurationMinutes = parseInt(f.tournamentDurationMinutes) || 30;
    }
    if (isTeamBattle) {
      payload.teamCount = arenaTeamCount;
      payload.teamNames = arenaTeamNames.slice(0, arenaTeamCount);
    }

    try {
      setCreatingArenaTournament(true);
      setArenaCreateError('');
      const res = await api.post('/api/arenatournament/create', payload);
      if (res.data?.success) {
        setShowArenaCreateModal(false);
        await fetchArenaTournaments();
        alert(`Tournament created! Join code: ${res.data.tournament?.joinCode || 'n/a'}`);
      } else {
        setArenaCreateError(res.data?.error || 'Failed to create tournament');
      }
    } catch (err) {
      setArenaCreateError(err?.response?.data?.error || err.message || 'Failed to create tournament');
    } finally {
      setCreatingArenaTournament(false);
    }
  }

  function viewWaitingRoom(roomId) {
    window.open(`/admin/arena/waiting/${roomId}`, '_blank');
  }

  async function startBatch(batchId) {
    try {
      await api.post(`/api/admin/batches/${batchId}/start`, {});
      alert("Batch started");
      fetchAll();
    } catch (err) {
      alert("Start batch failed");
    }
  }

  async function stopBatch(batchId) {
    try {
      await api.post(`/api/admin/batches/${batchId}/stop`, {});
      alert("Batch stopped");
      fetchAll();
    } catch (err) {
      alert("Stop batch failed");
    }
  }

  // fetch detailed batch results (users and their puzzle scores)
  async function fetchBatchResults(batchId) {
    try {
      const res = await api.get(`/api/admin/batches/${batchId}/results`);
      setBatchResults(res.data);
    } catch (err) {
      alert("Fetch batch results failed: " + (err.response?.data?.message || err.message));
    }
  }

  async function editUser(userId) {
    try {
      const { editUserName, editUserDisplay, editUserRole, editUserAge, editUserCountry, editUserTimeZone, editUserLichess, editUserChessCom, editUserPass } = forms;
      if (!editUserName) return alert("Username required");
      await api.put(`/api/admin/users/${userId}`, {
        username: editUserName,
        displayName: editUserDisplay,
        role: editUserRole,
        age: editUserAge,
        country: editUserCountry,
        timeZone: editUserTimeZone,
        lichessUsername: editUserLichess,
        chessComUsername: editUserChessCom,
        password: editUserPass || undefined
      }, { withCredentials: true });
      alert("User updated successfully");
      setForms({ ...forms, editingUser: null, editUserName: "", editUserDisplay: "", editUserRole: "", editUserAge: "", editUserCountry: "", editUserTimeZone: "", editUserLichess: "", editUserChessCom: "", editUserPass: "" });
      fetchAll();
    } catch (err) {
      alert("Edit user failed: " + (err?.response?.data?.message || err.message));
    }
  }

  async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user? This will remove all their scores and unassign them from any batches.")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      alert("User deleted successfully");
      fetchAll();
    } catch (err) {
      alert("Delete user failed: " + (err?.response?.data?.message || err.message));
    }
  }

  function startEditingUser(user) {
    setForms({
      ...forms,
      editingUser: user._id,
      editUserName: user.username,
      editUserDisplay: user.displayName || "",
      editUserRole: user.role || "user",
      editUserAge: user.age || "",
      editUserCountry: user.country || "",
      editUserTimeZone: user.timeZone || "",
      editUserLichess: user.lichessUsername || "",
      editUserChessCom: user.chessComUsername || "",
      editUserPass: "",
    });
  }

  function cancelEditing() {
    setForms({
      ...forms,
      editingRound: null,
      editingBatch: null,
      editingUser: null,
      editRoundName: "",
      editRoundNumber: "",
      editBatchName: "",
      editBatchDuration: "",
      editUserName: "",
      editUserDisplay: "",
      editUserRole: "",
      editUserAge: "",
      editUserCountry: "",
      editUserTimeZone: "",
      editUserLichess: "",
      editUserChessCom: "",
      editUserPass: "",
    });
  }

  async function editRound(roundId) {
    try {
      const { editRoundName, editRoundNumber } = forms;
      if (!editRoundName) return alert("Round name required");
      await api.put(`/api/admin/rounds/${roundId}`, {
        name: editRoundName,
        number: parseInt(editRoundNumber)
      }, { withCredentials: true });
      alert("Round updated");
      setForms({ ...forms, editingRound: null, editRoundName: "", editRoundNumber: "" });
      fetchAll();
    } catch (err) {
      alert("Edit round failed");
    }
  }

  async function deleteRound(roundId) {
    if (!confirm("Are you sure you want to delete this round and all its batches? This will unassign all users.")) return;
    try {
      await api.delete(`/api/admin/rounds/${roundId}`);
      alert("Round deleted");
      fetchAll();
    } catch (err) {
      alert("Delete round failed");
    }
  }

  async function editBatch(batchId) {
    try {
      const { editBatchName, editBatchDuration } = forms;
      if (!editBatchName) return alert("Batch name required");
      await api.put(`/api/admin/batches/${batchId}`, {
        name: editBatchName,
        durationSec: parseInt(editBatchDuration) * 60
      }, { withCredentials: true });
      alert("Batch updated");
      setForms({ ...forms, editingBatch: null, editBatchName: "", editBatchDuration: "" });
      fetchAll();
    } catch (err) {
      alert("Edit batch failed");
    }
  }

  async function deleteBatch(batchId) {
    if (!confirm("Are you sure you want to delete this batch? This will unassign all users from it.")) return;
    try {
      await api.delete(`/api/admin/batches/${batchId}`);
      alert("Batch deleted");
      fetchAll();
    } catch (err) {
      alert("Delete batch failed");
    }
  }

  function startEditingRound(round) {
    setForms({
      ...forms,
      editingRound: round._id,
      editRoundName: round.name,
      editRoundNumber: round.number.toString()
    });
  }

  function startEditingBatch(batch) {
    setForms({
      ...forms,
      editingBatch: batch._id,
      editBatchName: batch.name,
      editBatchDuration: (batch.durationSec / 60).toString()
    });
  }

  // remove activity log, refresh
  async function refreshActivity() { fetchAll(); }

  // Toggle batch expansion
  function toggleBatchExpansion(batchId) {
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  }

  // Toggle round expansion
  function toggleRoundExpansion(roundId) {
    setExpandedRounds(prev => ({
      ...prev,
      [roundId]: !prev[roundId]
    }));
  }

  // ---------- UI ----------
  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.1);
            }
          }
        `}
      </style>
      <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>♛ Admin Dashboard</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={async () => { await logout(); nav('/', { replace: true }); }}>Logout</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/arena')}>🏁 Race Arena</button>
          <button style={styles.secondaryBtn} onClick={openArenaCreateModal}>🏆 New Arena Tournament</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/studies')}>📚 Study Management</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/monthly-focus')}>🎯 Monthly Focus</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/team-race')}>👥 Team Race</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/reports')}>🚩 Reports</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/supporters')}>☕ Supporters</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/chat')}>💬 Chat</button>
          <button style={styles.primaryBtn} onClick={fetchAll}>Refresh</button>
        </div>
      </div>

      <AvatarXpPrices />

      <div style={{
        ...styles.card,
        padding: 16,
        marginTop: 20,
        background: '#ffffff',
        border: '1px solid #e2e8f0'
      }}>
        <div style={styles.chartHeader}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, color: '#0f172a' }}>📈 Growth Insights</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
              Week/month trends for signups and active users.
            </p>
          </div>
          <div style={styles.chartToolbar}>
            <button
              type="button"
              onClick={() => setAnalyticsView('week')}
              style={analyticsView === 'week' ? styles.chartToggleButtonActive : styles.chartToggleButton}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView('month')}
              style={analyticsView === 'month' ? styles.chartToggleButtonActive : styles.chartToggleButton}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setShowAnalyticsHistory(!showAnalyticsHistory)}
              style={showAnalyticsHistory ? styles.chartHistoryButtonActive : styles.chartHistoryButton}
            >
              History
            </button>
          </div>
        </div>

        <div style={styles.recordGrid}>
          <div style={styles.recordCard}>
            <div style={styles.recordLabel}>Previous month signups</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0b6623' }}>
              {formatTrendValue(analytics?.totals?.previousMonthSignups)}
            </div>
          </div>
          <div style={styles.recordCard}>
            <div style={styles.recordLabel}>Previous month active users</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0b6623' }}>
              {formatTrendValue(analytics?.totals?.previousMonthActiveUsers)}
            </div>
          </div>
          <div style={styles.recordCard}>
            <div style={styles.recordLabel}>This month signups</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>
              {formatTrendValue(analytics?.totals?.currentMonthSignups)}
            </div>
          </div>
          <div style={styles.recordCard}>
            <div style={styles.recordLabel}>This month active users</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
              {formatTrendValue(analytics?.totals?.currentMonthActiveUsers)}
            </div>
          </div>
        </div>

        {showAnalyticsHistory && (
          <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>History</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Last 6 months of signups and active users.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalyticsHistory(false)}
                style={styles.chartHistoryButton}
              >
                Close
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Month</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Signups</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Active users</th>
                  </tr>
                </thead>
                <tbody>
                  {getAnalyticsHistory().map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 10, color: '#0f172a' }}>{row.month}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>{row.signups.toLocaleString()}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{row.activeUsers.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!analytics || getAnalyticsHistory().length === 0) && (
                    <tr>
                      <td colSpan={3} style={{ padding: 10, color: '#64748b' }}>No history data available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Signups</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {analyticsView === 'week' ? 'Daily' : 'Monthly'}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 260 }}>
              {analytics ? (
                <Line data={getSignupSeries()} options={chartOptions} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>Loading analytics...</div>
              )}
            </div>
          </div>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Active Users</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {analyticsView === 'week' ? 'Daily' : 'Monthly'}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 260 }}>
              {analytics ? (
                <Line data={getActiveSeries()} options={chartOptions} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>Loading analytics...</div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          ...styles.card,
          marginTop: 20,
          padding: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ecfdf5',
          border: '1px solid #d1fae5'
        }}>
          <div>
            <h4 style={{ margin: 0, color: '#0f766e' }}>📊 Metrics</h4>
            <p style={{ margin: '8px 0 0', color: '#166534', fontSize: 14 }}>
              Jump to the Metrics page for a full growth-insights view and hub activity tracking.
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={() => nav('/admin/metrics')}>
            Open Metrics →
          </button>
        </div>

        <div style={{
          ...styles.card,
          padding: 16,
          marginTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#eff6ff',
          border: '1px solid #bfdbfe'
        }}>
          <div>
            <h4 style={{ margin: 0, color: '#1d4ed8' }}>📈 Analytics</h4>
            <p style={{ margin: '8px 0 0', color: '#1e3a8a', fontSize: 14 }}>
              Real-time dashboard: live users, KPI cards, page views, and a live events stream.
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={() => nav('/admin/analytics')}>
            Open Analytics →
          </button>
        </div>
      </div>

      <div style={{
        ...styles.card,
        padding: 16,
        marginTop: 20,
        background: "linear-gradient(135deg, #f0f9ff 0%, #dcfce7 100%)",
        border: "2px solid #0b6623"
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, color: "#072b05" }}>👥 User Management</h3>
            <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
              Total users registered: <strong style={{ color: "#0b6623", fontSize: 16 }}>{users.length}</strong>
              {users.filter(u => u.isCurrentlyOnline).length > 0 && (
                <span style={{ marginLeft: 20, color: "#10b981" }}>
                  Currently online: <strong>{users.filter(u => u.isCurrentlyOnline).length}</strong>
                </span>
              )}
            </p>
          </div>
          <button 
            onClick={() => nav('/admin/users')}
            style={{
              padding: "10px 20px",
              background: "#0b6623",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            View All Users →
          </button>
        </div>

      </div>

      <div style={{
        ...styles.card,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginTop: 20,
        background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
        border: "2px solid #d97706"
      }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4, color: "#92400e" }}>📚 Attendance Management</h3>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Manage student attendance and payments
          </p>
        </div>
        <button 
          onClick={() => nav('/admin/attendance')}
          style={{
            position: 'relative',
            padding: "10px 20px",
            background: "#d97706",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14
          }}
        >
          Teacher Attendance →
          {pendingPaymentCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              border: '2px solid white',
              animation: pendingPaymentCount > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              {pendingPaymentCount > 9 ? '9+' : pendingPaymentCount}
            </span>
          )}
        </button>
      </div>

      <div style={{
        ...styles.card,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginTop: 12,
        background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
        border: "1px solid #e6f3ea"
      }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4, color: "#064f28" }}>📨 Event Submissions</h3>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Review events submitted by users and manage approvals
          </p>
        </div>
        <button 
          onClick={() => nav('/admin/event-submissions')}
          style={{
            padding: "10px 20px",
            background: "#064f28",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14
          }}
        >
          View Event Submissions →
        </button>
      </div>

      {/* Contact Messages Inbox */}
      <div style={{ ...styles.card, marginTop: 12, background: '#fffbe6', border: '1px solid #ffe58f' }}>
        <h3 style={{ margin: 0, color: '#ad8b00' }}>Contact Messages</h3>
        {loadingMessages ? (
          <div>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#888', padding: 12 }}>No messages received yet.</div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fffbe6' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>From</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Subject</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Message</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: 6 }}></th>
                </tr>
              </thead>
              <tbody>
                {messages.map(msg => (
                  <React.Fragment key={msg._id}>
                  <tr style={{ background: msg.read ? '#f6fff6' : '#fff1f0' }}>
                    <td style={{ padding: 6 }}>{msg.name}</td>
                    <td style={{ padding: 6 }}><a href={`mailto:${msg.email}`}>{msg.email}</a></td>
                    <td style={{ padding: 6 }}>{msg.subject || 'General'}</td>
                    <td style={{ padding: 6, maxWidth: 220, wordBreak: 'break-word' }}>{msg.message}</td>
                    <td style={{ padding: 6 }}>{new Date(msg.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: 6 }}>
                      {msg.replied ? <span style={{ color: '#1677ff' }}>Replied</span> : msg.read ? <span style={{ color: '#389e0d' }}>Read</span> : <span style={{ color: '#d4380d' }}>Unread</span>}
                    </td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => { setReplyingTo(replyingTo === msg._id ? null : msg._id); setReplyText(''); }}
                        style={{ ...styles.smallBtn, background: '#1677ff', color: '#fff', marginRight: 4 }}
                      >{replyingTo === msg._id ? 'Cancel' : '↩ Reply'}</button>
                      {!msg.read && (
                        <button onClick={() => markMessageRead(msg._id)} style={{ ...styles.smallBtn, background: '#ffe58f', color: '#ad8b00' }}>Mark Read</button>
                      )}
                    </td>
                  </tr>
                  {replyingTo === msg._id && (
                    <tr style={{ background: '#e8f4ff' }}>
                      <td colSpan={7} style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, color: '#1677ff' }}>
                          Reply to {msg.name} &lt;{msg.email}&gt;
                        </div>
                        <textarea
                          rows={4}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your reply here..."
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #91caff', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => replyToMessage(msg._id)}
                            style={{ ...styles.primaryBtn, background: '#1677ff' }}
                          >Send Reply via Email</button>
                          <button onClick={() => { setReplyingTo(null); setReplyText(''); }} style={styles.secondaryBtn}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Arena Tournaments Admin Panel */}
      <div style={{ ...styles.card, padding: 16, marginTop: 16, background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', cursor: 'pointer', userSelect: 'none' }} onClick={() => setArenaListCollapsed(c => !c)}>
              {arenaListCollapsed ? '▶' : '▼'} 🏆 Arena Tournaments
              {arenaTournaments.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#64748b' }}>({arenaTournaments.length})</span>
              )}
            </h3>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
              Admin-created tournaments auto-reserve 5 bots. Deleting a tournament releases those bots so they're free for the next one.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.secondaryBtn} onClick={() => setArenaListCollapsed(c => !c)}>
              {arenaListCollapsed ? 'Expand' : 'Collapse'}
            </button>
            <button style={styles.primaryBtn} onClick={openArenaCreateModal}>+ Create</button>
            <button style={styles.secondaryBtn} onClick={fetchArenaTournaments} disabled={loadingArenaTournaments}>
              {loadingArenaTournaments ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {arenaListCollapsed ? null : arenaTournaments.length === 0 ? (
          <div style={{ padding: 16, color: '#64748b', textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
            No tournaments yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Players</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Start</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {arenaTournaments.map(t => {
                  const statusColors = {
                    scheduled: '#0369a1',
                    lobby: '#7c3aed',
                    active: '#059669',
                    pairing_stopped: '#d97706',
                    finished: '#64748b'
                  };
                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.name}</td>
                      <td style={{ padding: '10px 8px', color: '#475569' }}>{t.tournamentType || 'standard'}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: statusColors[t.status] || '#64748b'
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#475569' }}>{t.participantCount || 0}</td>
                      <td style={{ padding: '10px 8px', color: '#475569', fontSize: 12 }}>
                        {t.scheduledStartTime ? new Date(t.scheduledStartTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <button
                          style={{ ...styles.secondaryBtn, marginRight: 6, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => window.open(`/arenatournament/lobby/${t._id}`, '_blank')}
                        >
                          View
                        </button>
                        <button
                          style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={() => deleteArenaTournament(t._id, t.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Admin Links: Signup, Stockfish, Racer, Contest */}
      <div style={styles.quickLinksGrid}>
        <button
          onClick={() => nav('/admin/signup-requests')}
          style={styles.quickLinkCard}
        >
          <div>
            <h4 style={styles.quickLinkTitle}>📬 Signup Requests</h4>
            <p style={styles.quickLinkText}>Pending signups: <strong>{pendingSignupCount}</strong></p>
          </div>
          <div style={styles.quickLinkFooter}>View Signup Requests →</div>
        </button>

        <button
          onClick={() => window.open('/stockfish-test', '_blank')}
          style={styles.quickLinkCard}
        >
          <div>
            <h4 style={styles.quickLinkTitle}>🧪 Stockfish Test</h4>
            <p style={styles.quickLinkText}>Open the Stockfish testing tool in a new tab</p>
          </div>
          <div style={styles.quickLinkFooter}>Open Stockfish Test →</div>
        </button>

        <button
          onClick={() => window.open('/racer', '_blank')}
          style={styles.quickLinkCard}
        >
          <div>
            <h4 style={styles.quickLinkTitle}>🏎️ Racer</h4>
            <p style={styles.quickLinkText}>Open the Racer tool in a new tab</p>
          </div>
          <div style={styles.quickLinkFooter}>Open Racer →</div>
        </button>

        <button
          onClick={() => nav('/admin/contest')}
          style={styles.quickLinkCard}
        >
          <div>
            <h4 style={styles.quickLinkTitle}>🏆 Contest</h4>
            <p style={styles.quickLinkText}>Open the Contest page to manage contests.</p>
          </div>
          <div style={styles.quickLinkFooter}>Open Contest →</div>
        </button>
      </div>

      {/* ── Coach Analytics Section ── */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ color: '#072b05', marginBottom: 16 }}>👨‍🏫 Coach Overview</h3>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Applications', value: coachAnalytics?.totalApplicants ?? '—', color: '#3b82f6' },
            { label: 'Active Coaches', value: coachAnalytics?.totalCoaches ?? '—', color: '#10b981' },
            { label: 'Active Subscribers', value: coachAnalytics?.activeSubscribers ?? '—', color: '#8b5cf6' },
            { label: 'Total Students', value: coachAnalytics?.totalStudents ?? '—', color: '#f59e0b' },
            { label: 'Paid Payments', value: coachAnalytics?.paidCount ?? '—', color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {coachAnalytics && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Plan Distribution Bar Chart */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h4 style={{ margin: '0 0 14px', color: '#072b05', fontSize: 14 }}>Coaches by Plan</h4>
              <Bar
                data={{
                  labels: ['Starter', 'Pro', 'Pro Plus', 'Academy', 'None'],
                  datasets: [{
                    label: 'Coaches',
                    data: ['starter', 'pro', 'pro_plus', 'academy', null].map(plan =>
                      coachAnalytics.planBreakdown.find(p => p._id === plan)?.count || 0
                    ),
                    backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#94a3b8'],
                    borderRadius: 5,
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            </div>

            {/* Monthly Payment Trend Line Chart */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h4 style={{ margin: '0 0 14px', color: '#072b05', fontSize: 14 }}>Monthly Payments (Last 6 Months)</h4>
              <Line
                data={{
                  labels: coachAnalytics.monthlyTrend.map(m => {
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    return `${months[m._id.month - 1]} ${m._id.year}`;
                  }),
                  datasets: [
                    {
                      label: 'Revenue (₹)',
                      data: coachAnalytics.monthlyTrend.map(m => Math.round(m.revenue / 100)),
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16,185,129,0.1)',
                      tension: 0.4,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Payments',
                      data: coachAnalytics.monthlyTrend.map(m => m.count),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      tension: 0.4,
                      yAxisID: 'y1',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: { mode: 'index', intersect: false },
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: {
                    y: { beginAtZero: true, position: 'left', title: { display: true, text: '₹ Revenue' } },
                    y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Count' } }
                  }
                }}
              />
            </div>
          </div>
        )}

        {!coachAnalytics && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Coach analytics unavailable</p>
        )}

        {/* ── Coach list: who they are, status, payments, verify ── */}
        <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ margin: 0, color: '#072b05', fontSize: 14 }}>Coaches &amp; Applicants</h4>
            <button
              onClick={loadCoaches}
              disabled={coachListLoading}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #10b981', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {coachListLoading ? 'Loading…' : (coachList ? '↻ Refresh' : 'Load coaches')}
            </button>
          </div>

          {coachList === null ? (
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Click “Load coaches” to see the full list with verify controls.</p>
          ) : coachList.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No coaches or applicants yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px' }}>Coach</th>
                    <th style={{ padding: '8px 10px' }}>Type</th>
                    <th style={{ padding: '8px 10px' }}>Plan</th>
                    <th style={{ padding: '8px 10px' }}>Students</th>
                    <th style={{ padding: '8px 10px' }}>Applied</th>
                    <th style={{ padding: '8px 10px' }}>Last paid</th>
                    <th style={{ padding: '8px 10px' }}>Total paid</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {coachList.map(c => {
                    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1f2937' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700 }}>{c.coachName || c.displayName}</div>
                          <div style={{ color: '#94a3b8', fontSize: 11 }}>@{c.username}{c.email ? ` · ${c.email}` : ''}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{c.coachType === 'academy' ? `🏫 ${c.academyName || 'Academy'}` : '👤 Individual'}</td>
                        <td style={{ padding: '8px 10px' }}>{c.plan || '—'}{c.subStatus ? ` (${c.subStatus})` : ''}</td>
                        <td style={{ padding: '8px 10px' }}>{c.studentsCount}</td>
                        <td style={{ padding: '8px 10px' }}>{fmtDate(c.appliedAt)}</td>
                        <td style={{ padding: '8px 10px' }}>{fmtDate(c.lastPaidAt)}</td>
                        <td style={{ padding: '8px 10px' }}>{c.totalPaid ? `₹${Math.round(c.totalPaid / 100)}` : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {c.verified
                            ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Verified</span>
                            : c.isCoach
                              ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>Unverified</span>
                              : <span style={{ color: '#94a3b8' }}>Applicant</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {c.isCoach && (
                            <button
                              onClick={() => verifyCoach(c.id, !c.verified)}
                              style={{
                                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                border: `1px solid ${c.verified ? '#ef4444' : '#10b981'}`,
                                background: c.verified ? '#fff' : '#10b981',
                                color: c.verified ? '#ef4444' : '#fff',
                              }}
                            >
                              {c.verified ? 'Unverify' : 'Verify'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rounds Backup Section */}
      <div style={styles.roundsBackupWrap}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: "#072b05" }}>Rounds Backup</h3>
        
        {!selectedRound ? (
          // Round Cards View
          <div style={styles.roundCardsGrid}>
            {rounds.map(round => (
              <div 
                key={round._id} 
                style={styles.roundBackupCard}
                onClick={() => setSelectedRound(round)}
              >
                <div style={styles.roundCardHeader}>
                  <h4 style={{ margin: 0, color: "#064f28" }}>{round.name}</h4>
                  <span style={styles.roundNumber}>#{round.number}</span>
                </div>
                <div style={styles.roundCardInfo}>
                  <div style={styles.roundStat}>
                    <span style={styles.statNumber}>{round.batches?.length || 0}</span>
                    <span style={styles.statLabel}>Batches</span>
                  </div>
                  <div style={styles.roundStatus}>
                    {round.isActive ? (
                      <span style={{ color: "#059669", fontWeight: 600 }}>● Active</span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>Inactive</span>
                    )}
                  </div>
                </div>
                <div style={styles.roundCardDate}>
                  Created: {new Date(round.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                <div>No rounds found</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Create rounds and batches, assign users and puzzles to see backup data.
                </div>
              </div>
            )}
          </div>
        ) : !selectedBatch ? (
          // Batch Selection View
          <div>
            <div style={styles.backButton}>
              <button 
                onClick={() => {
                  setSelectedRound(null);
                  setSelectedBatch(null);
                  setBatchResults([]);
                }} 
                style={styles.secondaryBtn}
              >
                ← Back to Rounds
              </button>
              <h4 style={{ margin: 0, color: "#064f28" }}>
                {selectedRound.name} - Select Batch
              </h4>
            </div>
            
            <div style={styles.batchCardsGrid}>
              {selectedRound.batches?.map(batch => (
                <div 
                  key={batch._id} 
                  style={styles.batchBackupCard}
                  onClick={() => {
                    setSelectedBatch(batch);
                    fetchBatchResults(batch._id);
                  }}
                >
                  <div style={styles.batchCardHeader}>
                    <h5 style={{ margin: 0, color: "#064f28" }}>{batch.name}</h5>
                    {batch.isActive && <span style={{ color: "#059669", fontWeight: 600 }}>●</span>}
                  </div>
                  <div style={styles.batchCardStats}>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{batch.users?.length || 0}</span>
                      <span style={styles.batchStatLabel}>Users</span>
                    </div>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{batch.puzzles?.length || 0}</span>
                      <span style={styles.batchStatLabel}>Puzzles</span>
                    </div>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{Math.ceil((batch.durationSec || 0) / 60)}</span>
                      <span style={styles.batchStatLabel}>Min</span>
                    </div>
                  </div>
                  <div style={styles.batchCardUsers}>
                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Assigned Users:</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {batch.users?.slice(0, 3).map(user => (
                        <span key={user._id} style={styles.miniUserChip}>
                          {user.displayName || user.username}
                        </span>
                      ))}
                      {batch.users?.length > 3 && (
                        <span style={styles.miniUserChip}>+{batch.users.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )) || (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  No batches in this round
                </div>
              )}
            </div>
          </div>
        ) : (
          // Batch Results View
          <div>
            <div style={styles.backButton}>
              <button 
                onClick={() => {
                  setSelectedBatch(null);
                  setBatchResults([]);
                }} 
                style={styles.secondaryBtn}
              >
                ← Back to Batches
              </button>
              <h4 style={{ margin: 0, color: "#064f28" }}>
                {selectedRound.name} → {selectedBatch.name} - Results
              </h4>
            </div>
            
            {/* Leaderboard summary for batch */}
            <div style={{ marginBottom: 32, background: '#f8fff8', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#064f28' }}>Batch Leaderboard</h4>
              {batchResults.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 14 }}>No results yet for this batch.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead>
                    <tr style={{ background: '#f0f9f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Rank</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Aggregate total score per user
                      const userScores = {};
                      batchResults.forEach(r => {
                        if (!r.user || r._empty) return;
                        const uid = r.user._id;
                        if (!userScores[uid]) userScores[uid] = { user: r.user, total: 0 };
                        userScores[uid].total += r.score || 0;
                      });
                      // Convert to array and sort by total desc
                      const sorted = Object.values(userScores).sort((a, b) => b.total - a.total);
                      return sorted.map((entry, idx) => (
                        <tr key={entry.user._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6fff6' }}>
                          <td style={{ padding: '8px 6px', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 6px' }}>{entry.user.displayName || entry.user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 600 }}>{entry.total}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            <div style={styles.resultsTableWrap}>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Puzzle</th>
                      <th style={styles.th}>Moves</th>
                      <th style={styles.th}>Final Position</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Result</th>
                      <th style={styles.th}>Points</th>
                      <th style={styles.th}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                          <div>No results found for this batch</div>
                          <div style={{ fontSize: 12, marginTop: 8 }}>
                            Users need to attempt puzzles for data to appear here.
                            <br />
                            Check: 1) Users assigned to batch, 2) Puzzles attached to batch, 3) Users completed puzzles
                          </div>
                        </td>
                      </tr>
                    ) : (
                      batchResults.map((result, index) => (
                        <tr key={`result-${index}`} style={styles.tableRow}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 600 }}>
                              {result.user.displayName || result.user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 500 }}>
                              {result.puzzle?.title || 'N/A'}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {result.puzzle?.difficulty || 'normal'}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                              {result._empty ? 'No attempt' : (
                                <div>
                                  <div><strong>Complete Game:</strong> {result.allMoves?.join(' ') || 'No complete record'}</div>
                                  <div style={{ fontSize: 11, color: '#666' }}><strong>User Only:</strong> {result.moves?.join(' ') || 'No user moves'}</div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                              {result._empty ? 'N/A' : (result.finalPosition || 'No position')}
                            </div>
                          </td>
                          <td style={styles.td}>
                            {result._empty ? 'N/A' : (result.timeTakenSec ? `${result.timeTakenSec}s` : '-')}
                          </td>
                          <td style={styles.td}>
                            {result._empty ? (
                              <span style={{
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 500,
                                background: '#f3f4f6',
                                color: '#6b7280'
                              }}>
                                Not attempted
                              </span>
                            ) : (
                              <span style={{
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 500,
                                background: result.correct ? '#dcfce7' : '#fee2e2',
                                color: result.correct ? '#059669' : '#dc2626'
                              }}>
                                {result.correct ? '✓ Correct' : '✗ Incorrect'}
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              fontWeight: 600,
                              color: result._empty ? '#6b7280' : (result.score > 0 ? '#064f28' : '#dc2626')
                            }}>
                              {result._empty ? '0' : `+${result.score}`}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {result._empty ? (
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Not attempted</span>
                            ) : (
                              <div style={styles.dateCell}>
                                {new Date(result.createdAt).toLocaleDateString()}
                                <div style={styles.timeCell}>
                                  {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Content management cards (moved from header) ─────────────── */}
        <div style={{ marginTop: 28, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 18 }}>Content Management</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}>
            {[
              { icon: '♟', title: 'Endgames', desc: 'Manage endgame studies & positions', route: '/admin/endgames' },
              { icon: '📖', title: 'Book Management', desc: 'Manage chess books & lessons', route: '/admin/books' },
              { icon: '📅', title: 'Activity Schedule', desc: 'Manage the tournament & race calendar', route: '/admin/schedule' },
            ].map((c) => (
              <div
                key={c.route}
                onClick={() => nav(c.route)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') nav(c.route); }}
                style={{
                  ...styles.card,
                  marginBottom: 0,
                  padding: 18,
                  cursor: 'pointer',
                  border: '1px solid #e2e8f0',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ fontSize: 30, lineHeight: 1 }}>{c.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{c.title}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arena Tournament Create Modal */}
        {showArenaCreateModal && (
          <div
            onClick={() => !creatingArenaTournament && setShowArenaCreateModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: 16
            }}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitArenaCreate}
              style={{
                background: '#fff', borderRadius: 12, padding: 24,
                width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🏆 Create Arena Tournament</h3>
                <button
                  type="button"
                  onClick={() => setShowArenaCreateModal(false)}
                  disabled={creatingArenaTournament}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}
                >×</button>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#475569' }}>
                As admin, 5 bots will auto-join when the tournament is created.
              </p>

              {arenaCreateError && (
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  {arenaCreateError}
                </div>
              )}

              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'block' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Name *</div>
                  <input
                    type="text"
                    value={arenaCreateForm.name}
                    onChange={(e) => setArenaCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Friday Night Arena"
                    style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                    required
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Tournament Type</div>
                  <select
                    value={arenaCreateForm.tournamentType}
                    onChange={(e) => setArenaCreateForm(f => ({ ...f, tournamentType: e.target.value }))}
                    style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, background: '#fff' }}
                  >
                    <option value="standard">Standard</option>
                    <option value="chess960">Chess960</option>
                    <option value="team_battle">Team Battle</option>
                    <option value="bullet_blitz_marathon">Bullet/Blitz Marathon</option>
                  </select>
                </label>

                {arenaCreateForm.tournamentType !== 'bullet_blitz_marathon' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <label>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Time (min)</div>
                        <input
                          type="number" min="1" max="60"
                          value={arenaCreateForm.timeControlMinutes}
                          onChange={(e) => setArenaCreateForm(f => ({ ...f, timeControlMinutes: e.target.value }))}
                          style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                        />
                      </label>
                      <label>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Increment (sec)</div>
                        <input
                          type="number" min="0" max="60"
                          value={arenaCreateForm.timeControlIncrement}
                          onChange={(e) => setArenaCreateForm(f => ({ ...f, timeControlIncrement: e.target.value }))}
                          style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <label>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Duration hours</div>
                        <input
                          type="number" min="0" max="24"
                          value={arenaCreateForm.tournamentDurationHours}
                          onChange={(e) => setArenaCreateForm(f => ({ ...f, tournamentDurationHours: e.target.value }))}
                          style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                        />
                      </label>
                      <label>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Duration minutes</div>
                        <input
                          type="number" min="0" max="59"
                          value={arenaCreateForm.tournamentDurationMinutes}
                          onChange={(e) => setArenaCreateForm(f => ({ ...f, tournamentDurationMinutes: e.target.value }))}
                          style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                        />
                      </label>
                    </div>
                  </>
                )}

                {arenaCreateForm.tournamentType === 'team_battle' && (
                  <>
                    <label>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Number of teams (2–10)</div>
                      <select
                        value={arenaTeamCount}
                        onChange={(e) => {
                          const n = parseInt(e.target.value);
                          setArenaTeamCount(n);
                          setArenaTeamNames(prev => {
                            const updated = [...prev];
                            while (updated.length < n) updated.push(ARENA_TEAM_SUGGESTIONS[updated.length] || `Team ${updated.length + 1}`);
                            return updated.slice(0, n);
                          });
                        }}
                        style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, background: '#fff' }}
                      >
                        {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} teams</option>)}
                      </select>
                    </label>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Team names</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {Array.from({ length: arenaTeamCount }).map((_, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#64748b', minWidth: 60 }}>Team {i + 1}</span>
                            <input
                              type="text"
                              value={arenaTeamNames[i] || ''}
                              onChange={(e) => {
                                const updated = [...arenaTeamNames];
                                updated[i] = e.target.value;
                                setArenaTeamNames(updated);
                              }}
                              placeholder={ARENA_TEAM_SUGGESTIONS[i] || `Team ${i + 1}`}
                              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Start date *</div>
                    <input
                      type="date"
                      value={arenaCreateForm.scheduledStartDate}
                      onChange={(e) => setArenaCreateForm(f => ({ ...f, scheduledStartDate: e.target.value }))}
                      style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                      required
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Start time *</div>
                    <input
                      type="time"
                      value={arenaCreateForm.scheduledStartTime}
                      onChange={(e) => setArenaCreateForm(f => ({ ...f, scheduledStartTime: e.target.value }))}
                      style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                      required
                    />
                  </label>
                </div>

                <label>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>Description (optional)</div>
                  <textarea
                    rows={2}
                    value={arenaCreateForm.description}
                    onChange={(e) => setArenaCreateForm(f => ({ ...f, description: e.target.value }))}
                    style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowArenaCreateModal(false)}
                  disabled={creatingArenaTournament}
                  style={{ ...styles.secondaryBtn, padding: '8px 16px' }}
                >Cancel</button>
                <button
                  type="submit"
                  disabled={creatingArenaTournament}
                  style={{ ...styles.primaryBtn, padding: '8px 16px', opacity: creatingArenaTournament ? 0.6 : 1 }}
                >{creatingArenaTournament ? 'Creating…' : 'Create Tournament'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default AdminDashboard;
