import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const hubCards = [
  { key: 'puzzleHub', label: 'Puzzle Hub', description: 'Puzzle play, practice and challenge sessions.' },
  { key: 'raceHub', label: 'Race Hub', description: 'Timed race and team race gameplay activity.' },
  { key: 'socialHub', label: 'Social Hub', description: 'Live play, chat, and collaborative practice usage.' },
  { key: 'study', label: 'Study', description: 'Study sessions, tests, and practice lessons.' },
  { key: 'analysisHub', label: 'Analysis', description: 'Game review, post-game analysis, and study of completed play.' },
  { key: 'gamesHub', label: 'Games', description: 'Casual and competitive gameplay sessions across arcade and play modes.' }
];

const defaultMetrics = {
  puzzleHub: {
    week: [12, 18, 22, 27, 20, 24, 28],
    month: [180, 210, 230, 250, 270, 290],
  },
  raceHub: {
    week: [15, 22, 28, 24, 32, 30, 35],
    month: [220, 240, 260, 280, 310, 330],
  },
  socialHub: {
    week: [9, 14, 15, 18, 21, 23, 19],
    month: [140, 160, 170, 185, 200, 215],
  },
  study: {
    week: [18, 21, 24, 28, 30, 32, 34],
    month: [260, 280, 300, 320, 340, 360],
  },
  analysisHub: {
    week: [5, 7, 9, 11, 10, 12, 13],
    month: [75, 85, 95, 110, 125, 140],
  },
  gamesHub: {
    week: [9, 12, 14, 16, 18, 20, 22],
    month: [120, 135, 150, 165, 180, 195],
  }
};

const pageStyles = {
  page: { minHeight: '100vh', padding: 18, fontFamily: 'Inter, Arial, sans-serif', background: '#f6fff6' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  title: { margin: 0, fontSize: 32, color: '#072b05' },
  button: { padding: '10px 16px', background: '#0b6623', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 20 },
  card: { background: '#fff', padding: 18, borderRadius: 14, border: '1px solid #e6f1e6', boxShadow: '0 12px 32px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
  cardSelected: { transform: 'translateY(-2px)', boxShadow: '0 18px 40px rgba(0,0,0,0.08)', borderColor: '#0b6623' },
  cardLabel: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  cardDescription: { marginTop: 10, fontSize: 14, color: '#475569', lineHeight: 1.6 },
  statsPanel: { marginTop: 24, display: 'grid', gridTemplateColumns: '1fr', gap: 16 },
  chartWrapper: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'nowrap', overflowX: 'auto' },
  chartContainer: { minHeight: 240, maxHeight: 320, flex: '0 0 70%', minWidth: 320 },
  historyPanel: { flex: '0 0 30%', minWidth: 280, background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #d1fae6', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' },
  historyPanelTitle: { margin: 0, marginBottom: 12, fontSize: 15, fontWeight: 700, color: '#0f172a' },
  historyRow: { marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyLabel: { color: '#475569', fontSize: 13 },
  historyValue: { color: '#0b6623', fontWeight: 700, fontSize: 16 },
  panel: { background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #e6f1e6', boxShadow: '0 10px 28px rgba(0,0,0,0.04)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  panelTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  pill: { padding: '8px 14px', borderRadius: 999, border: '1px solid #d1fae5', background: '#ecfdf5', color: '#0f766e', fontWeight: 700, fontSize: 13 },
  toggleGroup: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  toggleButton: { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' },
  toggleButtonActive: { padding: '8px 14px', borderRadius: 8, border: '1px solid #0b6623', background: '#0b6623', color: '#fff', cursor: 'pointer' },
  historyButton: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  summaryCard: { background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #dbeafe' },
  summaryLabel: { margin: 0, fontSize: 13, color: '#475569' },
  summaryValue: { marginTop: 8, fontSize: 24, fontWeight: 700, color: '#0b6623' }
};

function AdminMetricsPage() {
  const navigate = useNavigate();
  const [selectedHub, setSelectedHub] = useState(hubCards[0].key);
  const [viewMode, setViewMode] = useState('week');
  const [showHistory, setShowHistory] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await api.get('/api/admin/metrics');
        if (res?.data && typeof res.data === 'object') {
          setMetrics(res.data);
        } else {
          setMetrics({});
        }
      } catch (err) {
        setMetrics({});
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const getMetricsFor = (key) => {
    if (!metrics) return null;
    const value = metrics[key];
    if (!value || (!Array.isArray(value.week) && !Array.isArray(value.month) && !Array.isArray(value.history))) {
      return null;
    }
    return value;
  };

  const selectedData = getMetricsFor(selectedHub);
  const defaultWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const defaultMonthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const labels = selectedData?.[viewMode + 'Labels'] || (viewMode === 'week' ? defaultWeekLabels : defaultMonthLabels);
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: `${hubCards.find(h => h.key === selectedHub)?.label || ''} activity`,
        data: selectedData?.[viewMode] || [],
        borderColor: '#0b6623',
        backgroundColor: 'rgba(11, 102, 35, 0.16)',
        tension: 0.35,
        fill: true,
      }
    ]
  }), [selectedData, selectedHub, viewMode, labels]);

  const totals = useMemo(() => {
    return hubCards.map((hub) => {
      const data = getMetricsFor(hub.key);
      const total = (data?.month || []).reduce((sum, value) => sum + value, 0);
      return { label: hub.label, value: total };
    });
  }, [metrics]);

  const topUsage = useMemo(() => {
    return [...totals].sort((a, b) => b.value - a.value).slice(0, 3);
  }, [totals]);

  const historyRows = useMemo(() => {
    return hubCards.map(hub => {
      const data = getMetricsFor(hub.key);
      const totalMonth = (data?.month || []).reduce((sum, value) => sum + value, 0);
      const averageWeek = Math.round((data?.week || []).reduce((sum, value) => sum + value, 0) / 7) || 0;
      return {
        label: hub.label,
        monthlyUsage: totalMonth,
        weeklyAverage: averageWeek
      };
    });
  }, [metrics]);

  const selectedHistory = selectedData?.history || [];
  const selectedMonthLabels = selectedData?.monthLabels || [];
  const comparisonMonthLabels = metrics?.[hubCards[0].key]?.monthLabels || defaultMonthLabels;
  const comparisonRows = hubCards.map(hub => {
    const data = getMetricsFor(hub.key);
    const monthly = data?.month || [];
    const values = comparisonMonthLabels.map((_, index) => monthly[index] || 0);
    return {
      label: hub.label,
      values,
      total: values.reduce((sum, value) => sum + value, 0)
    };
  });
  const allCardsActivity = hubCards.map(hub => {
    const data = getMetricsFor(hub.key);
    return {
      label: hub.label,
      week: data?.week || [],
      month: data?.month || [],
      total: (data?.[viewMode] || []).reduce((sum, value) => sum + value, 0)
    };
  });

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.header}>
        <div>
          <h1 style={pageStyles.title}>📊 Metrics</h1>
          <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 15 }}>View Growth Insights and usage activity across key product hubs.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={pageStyles.button} onClick={() => navigate('/admin')}>Back to Dashboard</button>
          <button style={pageStyles.historyButton} onClick={() => setShowHistory(prev => !prev)}>{showHistory ? 'Hide History' : 'History'}</button>
        </div>
      </div>

      <div style={pageStyles.cardGrid}>
        {hubCards.map(card => {
          const selected = card.key === selectedHub;
          return (
            <div
              key={card.key}
              style={{
                ...pageStyles.card,
                ...(selected ? pageStyles.cardSelected : {}),
              }}
              onClick={() => { setSelectedHub(card.key); setShowHistory(false); }}
            >
              <h2 style={pageStyles.cardLabel}>{card.label}</h2>
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#0b6623', fontWeight: 700 }}>View activity</span>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{allCardsActivity.find(a => a.label === card.label)?.total ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={pageStyles.panel}>
        <div style={pageStyles.panelHeader}>
          <div>
            <h3 style={pageStyles.panelTitle}>{hubCards.find(h => h.key === selectedHub)?.label} activity</h3>
            <div style={pageStyles.pill}>{viewMode === 'week' ? 'Weekly view' : 'Monthly view'}</div>
          </div>
          <div style={pageStyles.toggleGroup}>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              style={viewMode === 'week' ? pageStyles.toggleButtonActive : pageStyles.toggleButton}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              style={viewMode === 'month' ? pageStyles.toggleButtonActive : pageStyles.toggleButton}
            >
              Month
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ color: '#64748b' }}>Loading metrics...</div>
        ) : (
          <div style={pageStyles.chartWrapper}>
            <div style={pageStyles.chartContainer}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: { display: false }
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      grid: { color: '#f1f5f9' },
                      ticks: {
                        callback: (value) => Number.isInteger(value) ? value : '',
                        precision: 0
                      },
                      suggestedMax: (() => {
                        const maxValue = Math.max(...(selectedData?.[viewMode] || [0]), 0);
                        if (maxValue <= 5) return 25;
                        if (maxValue <= 20) return 25;
                        if (maxValue <= 50) return 50;
                        if (maxValue <= 100) return 100;
                        return Math.ceil(maxValue / 4 / 10) * 10 * 4;
                      })(),
                      suggestedMin: 0,
                      stepSize: (() => {
                        const maxValue = Math.max(...(selectedData?.[viewMode] || [0]), 0);
                        if (maxValue <= 5) return 5;
                        if (maxValue <= 20) return 5;
                        if (maxValue <= 50) return 10;
                        if (maxValue <= 100) return 20;
                        return Math.ceil(maxValue / 4 / 10) * 10;
                      })()
                    }
                  }
                }}
              />
            </div>
            {selectedHistory.length > 0 && (
              <div style={pageStyles.historyPanel}>
                <h4 style={pageStyles.historyPanelTitle}>{hubCards.find(h => h.key === selectedHub)?.label} monthly history</h4>
                {selectedHistory.map((item) => (
                  <div key={item.label} style={pageStyles.historyRow}>
                    <span style={pageStyles.historyLabel}>{item.label}</span>
                    <span style={pageStyles.historyValue}>{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showHistory && (
        <div style={{ ...pageStyles.panel, marginTop: 20 }}>
          <div style={pageStyles.panelHeader}>
            <div>
              <h3 style={pageStyles.panelTitle}>History & usage priority</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Which hubs are driving the most completed activity and practice usage.</p>
            </div>
          </div>

          <div style={pageStyles.summaryGrid}>
            {topUsage.map((item) => (
              <div key={item.label} style={pageStyles.summaryCard}>
                <p style={pageStyles.summaryLabel}>{item.label}</p>
                <div style={pageStyles.summaryValue}>{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Hub</th>
                  {comparisonMonthLabels.map(label => (
                    <th key={label} style={{ textAlign: 'right', padding: 12, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>{label}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: 12, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(row => (
                  <tr key={row.label} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 12, color: '#0f172a' }}>{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={index} style={{ padding: 12, textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>
                        {value.toLocaleString()}
                      </td>
                    ))}
                    <td style={{ padding: 12, textAlign: 'right', color: '#0b6623', fontWeight: 700 }}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMetricsPage;
