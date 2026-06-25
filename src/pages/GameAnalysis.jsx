import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Chess } from 'chess.js';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import GameReplay from '../components/GameReplay';
import PieceSelector from '../components/PositionEditor/PieceSelector';
import EditableBoard from '../components/PositionEditor/EditableBoard';
import SetupControls from '../components/PositionEditor/SetupControls';
import FenBar from '../components/PositionEditor/FenBar';
import OTBConfirmPanel from '../components/OTBConfirmPanel';
import CoffeeCta from '../components/CoffeeCta';
import AboutFeatureCTA from '../components/marketing/AboutFeatureCTA';
import './GameAnalysis.css';

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

// ─── Brand logos (inline SVG, no external assets) ─────────────────────────────
// Path data from Simple Icons (CC0). Rendered in each brand's colour.
function ChessComLogo({ size = 22 }) {
  return (
    <svg height={size} viewBox="0 0 24 24" role="img" aria-label="Chess.com" focusable="false">
      <path fill="#81B64C" d="M12 0a3.85 3.85 0 0 0-3.875 3.846A3.84 3.84 0 0 0 9.73 6.969l-2.79 1.85c0 .622.144 1.114.434 1.649H9.83c-.014.245-.014.549-.014.925 0 .025.003.048.006.071-.064 1.353-.507 3.472-3.62 5.842-.816.625-1.423 1.495-1.806 2.533a.33.33 0 0 0-.045.084 8.124 8.124 0 0 0-.39 2.516c0 .1.216 1.561 8.038 1.561s8.038-1.46 8.038-1.561c0-2.227-.824-4.048-2.24-5.133-4.034-3.08-3.586-5.74-3.644-6.838h2.458c.29-.535.434-1.027.434-1.649l-2.79-1.836a3.86 3.86 0 0 0 1.604-3.123A3.873 3.873 0 0 0 13.445.275c-.004-.002-.01.004-.015.004A3.76 3.76 0 0 0 12 0Z"/>
    </svg>
  );
}
function LichessLogo({ size = 22 }) {
  return (
    <svg height={size} viewBox="0 0 24 24" role="img" aria-label="Lichess" focusable="false">
      <path fill="currentColor" d="M10.457 6.161a.237.237 0 0 0-.296.165c-.8 2.785 2.819 5.579 5.214 7.428.653.504 1.216.939 1.591 1.292 1.745 1.642 2.564 2.851 2.733 3.178a.24.24 0 0 0 .275.122c.047-.013 4.726-1.3 3.934-4.574a.257.257 0 0 0-.023-.06L18.204 3.407 18.93.295a.24.24 0 0 0-.262-.293c-1.7.201-3.115.435-4.5 1.425-4.844-.323-8.718.9-11.213 3.539C.334 7.737-.246 11.515.085 14.128c.763 5.655 5.191 8.631 9.081 9.532.993.229 1.974.34 2.923.34 3.344 0 6.297-1.381 7.946-3.85a.24.24 0 0 0-.372-.3c-3.411 3.527-9.002 4.134-13.296 1.444-4.485-2.81-6.202-8.41-3.91-12.749C4.741 4.221 8.801 2.362 13.888 3.31c.056.01.115 0 .165-.029l.335-.197c.926-.546 1.961-1.157 2.873-1.279l-.694 1.993a.243.243 0 0 0 .02.202l6.082 10.192c-.193 2.028-1.706 2.506-2.226 2.611-.287-.645-.814-1.364-2.306-2.803-.422-.407-1.21-.941-2.124-1.56-2.364-1.601-5.937-4.02-5.391-5.984a.239.239 0 0 0-.165-.295z"/>
    </svg>
  );
}

// ─── CAPS Score Card ──────────────────────────────────────────────────────────
function CapsCard({ capsScore }) {
  if (!capsScore) return null;
  const { avgCpLoss, eloBand } = capsScore;
  const color = avgCpLoss <= 30 ? '#10b981' : avgCpLoss <= 80 ? '#06b6d4' : avgCpLoss <= 150 ? '#f59e0b' : '#ef4444';
  return (
    <div className="ga-caps-card">
      <div className="ga-caps-glow" style={{ background: color }} />
      <div className="ga-caps-icon">🧮</div>
      <div className="ga-caps-body">
        <div className="ga-caps-title">How Good Were Your Moves?</div>
        <div className="ga-caps-value" style={{ color }}>~{avgCpLoss} points lost per move</div>
        <div className="ga-caps-band">
          <span className="ga-caps-band-label" style={{ background: color + '22', color, border: `1px solid ${color}55` }}>
            {eloBand.display}
          </span>
          <span className="ga-caps-band-range">{eloBand.label} rating equivalent</span>
        </div>
        <div className="ga-caps-desc">Each move, the computer picks the best one. This shows how far your moves were from perfect — lower is better. 0 means flawless, 150+ means many moves were missed.</div>
      </div>
    </div>
  );
}

// ─── Session Badges ───────────────────────────────────────────────────────────
const BADGE_META = {
  blunderBuster:   { icon: '🛡️', label: 'Blunder Buster',    desc: 'At least one game with zero blunders' },
  endgameApprentice: { icon: '👑', label: 'Endgame Apprentice', desc: 'Endgame accuracy above 80%' },
  openingScholar:  { icon: '📖', label: 'Opening Scholar',    desc: '90%+ opening accuracy' },
  precisionMaster: { icon: '🏆', label: 'Precision Master',   desc: '85%+ overall accuracy this session' }
};

function SessionBadges({ badges }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="ga-badges-wrap">
      <h3 className="ga-section-title">🏅 Badges Earned This Session</h3>
      <div className="ga-badges-grid">
        {badges.map(b => {
          const meta = BADGE_META[b];
          if (!meta) return null;
          return (
            <div key={b} className="ga-badge-card">
              <div className="ga-badge-icon">{meta.icon}</div>
              <div className="ga-badge-label">{meta.label}</div>
              <div className="ga-badge-desc">{meta.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Patterns Section ─────────────────────────────────────────────────────────
function PatternsSection({ patterns }) {
  if (!patterns || patterns.length === 0) return null;
  return (
    <div className="ga-patterns-wrap">
      <h3 className="ga-section-title">🔬 Recurring Patterns Detected</h3>
      <div className="ga-patterns-list">
        {patterns.map((p, i) => (
          <div key={i} className="ga-pattern-item">
            <span className="ga-pattern-dot" />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Piece Heatmap Card ───────────────────────────────────────────────────────
function PieceHeatmap({ pieceHeatmap, worstPiece }) {
  if (!pieceHeatmap || pieceHeatmap.every(p => p.count === 0)) return null;
  const max = Math.max(...pieceHeatmap.map(p => p.count), 1);
  const PIECE_COLORS = { Pawn: '#9ca3af', Knight: '#8b5cf6', Bishop: '#06b6d4', Rook: '#f59e0b', Queen: '#ef4444' };
  return (
    <div className="ga-piece-heatmap-wrap">
      {worstPiece && (
        <div className="ga-piece-worst-badge">
          Your most error-prone piece: <strong>{worstPiece.label}</strong> ({worstPiece.count} blunders/mistakes)
        </div>
      )}
      <div className="ga-piece-bars">
        {pieceHeatmap.filter(p => p.count > 0).map(p => (
          <div key={p.type} className="ga-piece-bar-row">
            <span className="ga-piece-bar-label">{p.label}</span>
            <div className="ga-piece-bar-bg">
              <div
                className="ga-piece-bar-fill"
                style={{ width: `${Math.round((p.count / max) * 100)}%`, background: PIECE_COLORS[p.label] || '#9ca3af' }}
              />
            </div>
            <span className="ga-piece-bar-count">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Time Pressure Card ───────────────────────────────────────────────────────
function TimePressureCard({ timePressureStats }) {
  if (!timePressureStats) return null;
  const { normalAccuracy, pressuredAccuracy, normalMoves, pressuredMoves } = timePressureStats;
  if (normalMoves === 0 && pressuredMoves === 0) return null;
  const diff = (normalAccuracy ?? 0) - (pressuredAccuracy ?? 0);
  return (
    <div className="ga-time-pressure-card">
      <div className="ga-tp-icon">⏱️</div>
      <div className="ga-tp-body">
        <div className="ga-tp-title">Time Pressure Analysis</div>
        <div className="ga-tp-stats">
          <div className="ga-tp-stat">
            <span className="ga-tp-stat-val" style={{ color: '#10b981' }}>{normalAccuracy ?? '—'}%</span>
            <span className="ga-tp-stat-lbl">Normal speed ({normalMoves} moves)</span>
          </div>
          <div className="ga-tp-divider" />
          <div className="ga-tp-stat">
            <span className="ga-tp-stat-val" style={{ color: pressuredMoves > 0 && diff > 10 ? '#ef4444' : '#f59e0b' }}>
              {pressuredAccuracy ?? '—'}%
            </span>
            <span className="ga-tp-stat-lbl">Under pressure ({pressuredMoves} moves, &lt;60s)</span>
          </div>
        </div>
        {pressuredMoves > 0 && diff > 5 && (
          <div className="ga-tp-insight">
            Your accuracy drops {diff}% when the clock is under a minute — time pressure is a significant factor.
          </div>
        )}
        {pressuredMoves === 0 && (
          <div className="ga-tp-insight">No time-pressure situations detected in these games.</div>
        )}
      </div>
    </div>
  );
}

// ─── Peer Comparison Card ─────────────────────────────────────────────────────
function PeerComparisonCard({ peerComparison }) {
  if (!peerComparison) return null;
  const { playerBandDisplay, avgCpLoss, benchmarkCpLoss, blundersPerGame, benchmarkBlundersPerGame, cpLossVsBenchmark, blunderVsBenchmark } = peerComparison;
  const cpColor = cpLossVsBenchmark <= 0 ? '#10b981' : cpLossVsBenchmark <= 30 ? '#f59e0b' : '#ef4444';
  const blunderColor = blunderVsBenchmark <= 0 ? '#10b981' : blunderVsBenchmark <= 1 ? '#f59e0b' : '#ef4444';
  return (
    <div className="ga-peer-card">
      <div className="ga-peer-title">🎖️ You vs. Your Skill Band</div>
      <div className="ga-peer-band-label">Estimated level: <strong>{playerBandDisplay}</strong></div>
      <div className="ga-peer-stats-row">
        <div className="ga-peer-stat">
          <span className="ga-peer-stat-label">Your move quality</span>
          <span className="ga-peer-stat-val" style={{ color: cpColor }}>{avgCpLoss} cp/move</span>
          <span className="ga-peer-stat-bench">Band avg: {benchmarkCpLoss} cp/move</span>
        </div>
        <div className="ga-peer-stat">
          <span className="ga-peer-stat-label">Your blunder rate</span>
          <span className="ga-peer-stat-val" style={{ color: blunderColor }}>{blundersPerGame}/game</span>
          <span className="ga-peer-stat-bench">Band avg: {benchmarkBlundersPerGame}/game</span>
        </div>
      </div>
    </div>
  );
}

// ─── Progress History Charts ──────────────────────────────────────────────────
function ProgressHistoryCharts({ history }) {
  if (!history || history.length < 2) return null;
  const labels = history.map((s, i) => {
    const d = new Date(s.analyzedAt);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  // Session diff (last vs second-to-last)
  const latest = history[history.length - 1];
  const prev   = history[history.length - 2];
  const accDiff    = latest.overallAccuracy != null && prev.overallAccuracy != null
    ? latest.overallAccuracy - prev.overallAccuracy : null;
  const blunderDiff = latest.blundersPerGame != null && prev.blundersPerGame != null
    ? Math.round((latest.blundersPerGame - prev.blundersPerGame) * 10) / 10 : null;

  const accuracyData = {
    labels,
    datasets: [{
      label: 'Accuracy %',
      data: history.map(s => s.overallAccuracy),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6,182,212,0.12)',
      tension: 0.35,
      pointBackgroundColor: '#06b6d4',
      pointRadius: 4,
      fill: true
    }]
  };

  const blunderData = {
    labels,
    datasets: [{
      label: 'Blunders/game',
      data: history.map(s => s.blundersPerGame),
      backgroundColor: 'rgba(239,68,68,0.6)',
      borderColor: '#ef4444',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  const capsData = history.some(s => s.capsAvgCpLoss != null) ? {
    labels,
    datasets: [{
      label: 'Avg cp loss',
      data: history.map(s => s.capsAvgCpLoss),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245,158,11,0.1)',
      tension: 0.35,
      pointBackgroundColor: '#f59e0b',
      pointRadius: 4,
      fill: true
    }]
  } : null;

  const chartOpts = (label, unit, inverted = false) => ({
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 12 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}${unit}` } }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' }, reverse: inverted }
    }
  });

  // Improvement velocity: slope of last 5 accuracy points
  const accSlice = history.slice(-5).map(s => s.overallAccuracy).filter(v => v != null);
  let velocity = '→ Stable';
  if (accSlice.length >= 3) {
    const n = accSlice.length;
    const xMean = (n - 1) / 2;
    const yMean = accSlice.reduce((a, b) => a + b, 0) / n;
    const slope = accSlice.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0) /
                  accSlice.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    if (slope > 1.5)       velocity = '↑ Improving';
    else if (slope < -1.5) velocity = '↓ Declining';
  }
  const velocityColor = velocity.startsWith('↑') ? '#10b981' : velocity.startsWith('↓') ? '#ef4444' : '#9ca3af';

  return (
    <div className="ga-history-section">
      <h3 className="ga-section-title">📈 Your Progress Over Time</h3>
      <div className="ga-history-meta-row">
        <div className="ga-history-meta-card">
          <span className="ga-history-meta-label">Trend (last 5 sessions)</span>
          <span className="ga-history-meta-val" style={{ color: velocityColor }}>{velocity}</span>
        </div>
        {accDiff !== null && (
          <div className="ga-history-meta-card">
            <span className="ga-history-meta-label">vs. last session</span>
            <span className="ga-history-meta-val" style={{ color: accDiff >= 0 ? '#10b981' : '#ef4444' }}>
              {accDiff >= 0 ? '+' : ''}{accDiff}% accuracy
            </span>
          </div>
        )}
        {blunderDiff !== null && (
          <div className="ga-history-meta-card">
            <span className="ga-history-meta-label">Blunders/game change</span>
            <span className="ga-history-meta-val" style={{ color: blunderDiff <= 0 ? '#10b981' : '#ef4444' }}>
              {blunderDiff >= 0 ? '+' : ''}{blunderDiff}
            </span>
          </div>
        )}
      </div>
      <div className="ga-history-charts">
        <div className="ga-trend-chart">
          <h4 className="ga-trend-title">Accuracy Per Session</h4>
          <Line data={accuracyData} options={chartOpts('Accuracy', '%')} />
        </div>
        <div className="ga-trend-chart">
          <h4 className="ga-trend-title">Blunders/Game Per Session</h4>
          <Bar data={blunderData} options={chartOpts('Blunders', '/game')} />
        </div>
        {capsData && (
          <div className="ga-trend-chart">
            <h4 className="ga-trend-title">Move Quality (cp loss) — lower is better</h4>
            <Line data={capsData} options={chartOpts('cp loss', ' cp', true)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Endgame Type Stats ───────────────────────────────────────────────────────
function EndgameStats({ endgameStats }) {
  if (!endgameStats || endgameStats.length === 0) return null;
  return (
    <div className="ga-endgame-stats-wrap">
      <table className="ga-openings-table">
        <thead>
          <tr>
            <th>Endgame Type</th>
            <th>Played</th>
            <th>W / D / L</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {endgameStats.map((e, i) => (
            <tr key={i}>
              <td className="ga-opening-name">{e.type}</td>
              <td>{e.played}</td>
              <td>
                <span className="ga-wdl">
                  <span className="ga-w">{e.wins}</span>
                  <span className="ga-sep">/</span>
                  <span className="ga-d">{e.draws}</span>
                  <span className="ga-sep">/</span>
                  <span className="ga-l">{e.losses}</span>
                </span>
              </td>
              <td>
                <span style={{ color: e.winRate >= 60 ? '#10b981' : e.winRate >= 40 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                  {e.winRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



function phaseLabel(accuracy, blunders = 0, mistakes = 0) {
  if (accuracy === null || accuracy === undefined) return { label: 'No Data', color: '#6b7280' };
  const tiers = [
    { label: 'Weak',       color: '#ef4444' },
    { label: 'Needs Work', color: '#f59e0b' },
    { label: 'Good',       color: '#06b6d4' },
    { label: 'Strong',     color: '#10b981' },
  ];
  // Accuracy-based tier (0–3)
  const accTier = accuracy >= 80 ? 3 : accuracy >= 60 ? 2 : accuracy >= 45 ? 1 : 0;
  // Error-based cap: blunders are critical regardless of accuracy %
  const errTier = blunders >= 5 ? 0
                : blunders >= 3 ? 1
                : blunders >= 1 || mistakes >= 4 ? 2
                : 3;
  return tiers[Math.min(accTier, errTier)];
}

function AccuracyDoughnut({ accuracy, color, size = 120 }) {
  const value = accuracy ?? 0;
  const data = {
    datasets: [{
      data: [value, 100 - value],
      backgroundColor: [color, 'rgba(255,255,255,0.06)'],
      borderWidth: 0,
      circumference: 270,
      rotation: -135
    }]
  };
  const options = {
    responsive: false,
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 800 }
  };
  return (
    <div className="ga-doughnut-wrap" style={{ width: size, height: size }}>
      <Doughnut data={data} options={options} width={size} height={size} />
      <div className="ga-doughnut-label" style={{ color }}>
        {accuracy !== null && accuracy !== undefined ? `${accuracy}%` : '—'}
      </div>
    </div>
  );
}

function PhaseCard({ phase, data, icon }) {
  if (!data) return null;
  const { label, color } = phaseLabel(data.accuracy, data.blunders ?? 0, data.mistakes ?? 0);
  return (
    <div className="ga-phase-card">
      <div className="ga-phase-header">
        <span className="ga-phase-icon">{icon}</span>
        <span className="ga-phase-name">{phase}</span>
      </div>
      <AccuracyDoughnut accuracy={data.accuracy} color={color} />
      <div className="ga-phase-label" style={{ color, background: color + '20' }}>
        {label}
      </div>
      <div className="ga-phase-stats">
        <span className="ga-stat-chip blunder">🔴 {data.blunders ?? 0} blunders</span>
        <span className="ga-stat-chip mistake">🟠 {data.mistakes ?? 0} mistakes</span>
        <span className="ga-stat-chip inaccuracy">🟡 {data.inaccuracies ?? 0} inaccuracies</span>
      </div>
    </div>
  );
}

function TacticsBar({ tacticsStats }) {
  if (!tacticsStats) return null;
  const { missedCheckmate = 0, hangingPiece = 0, fork = 0, positional = 0 } = tacticsStats;
  const total = missedCheckmate + hangingPiece + fork + positional;
  if (total === 0) return <p className="ga-no-data">No tactics missed — great play! 🎉</p>;

  const TACTICS = [
    { key: 'missedCheckmate', label: 'Missed Checkmate', icon: '♔', color: '#ef4444', bg: 'rgba(239,68,68,0.14)',   glowBg: '#ef4444', count: missedCheckmate,
      desc: "You had checkmate available but didn't play it." },
    { key: 'hangingPiece',    label: 'Hanging Piece',    icon: '🪝', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)', glowBg: '#f59e0b', count: hangingPiece,
      desc: "Opponent's piece was free to capture but you missed it." },
    { key: 'fork',            label: 'Missed Fork',      icon: '⚔️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)', glowBg: '#8b5cf6', count: fork,
      desc: 'You could have attacked two pieces at once.' },
    { key: 'positional',      label: 'Other Blunder',    icon: '❓', color: '#9ca3af', bg: 'rgba(107,114,128,0.14)', glowBg: '#6b7280', count: positional,
      desc: 'A bad move that gave away your advantage.' },
  ];

  const max = Math.max(...TACTICS.map(t => t.count), 1);

  return (
    <div className="ga-tactics-grid">
      {TACTICS.filter(item => item.count > 0).map(item => (
        <div key={item.key} className="ga-tac-card">
          <div className="ga-tac-glow" style={{ background: item.glowBg }} />
          <div className="ga-tac-top">
            <div className="ga-tac-icon-wrap" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <span className="ga-tac-count" style={{ color: item.color }}>
              {item.count}
            </span>
          </div>
          <div className="ga-tac-label">{item.label}</div>
          <div className="ga-tac-desc">{item.desc}</div>
          <div className="ga-tac-bar-bg">
            <div
              className="ga-tac-bar-fill"
              style={{
                width: `${Math.round((item.count / max) * 100)}%`,
                background: item.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatmapBar({ blunderHeatmap }) {
  if (!blunderHeatmap || blunderHeatmap.every(b => b.total === 0)) return null;

  const grandMax = Math.max(...blunderHeatmap.map(b => b.total), 1);

  return (
    <div className="ga-heatmap-v2">
      <div className="ga-hm-legend">
        <div className="ga-hm-legend-item"><span className="ga-hm-dot" style={{ background: '#ef4444' }} />Blunders</div>
        <div className="ga-hm-legend-item"><span className="ga-hm-dot" style={{ background: '#f59e0b' }} />Mistakes</div>
        <div className="ga-hm-legend-item"><span className="ga-hm-dot" style={{ background: '#eab308' }} />Inaccuracies</div>
      </div>
      <div className="ga-hm-rows">
        {blunderHeatmap.map((b, i) => {
          const trackWidth = Math.round((b.total / grandMax) * 100);
          const blunderW  = b.total > 0 ? Math.round((b.blunders     / b.total) * 100) : 0;
          const mistakeW  = b.total > 0 ? Math.round((b.mistakes     / b.total) * 100) : 0;
          const inaccW    = b.total > 0 ? Math.round((b.inaccuracies / b.total) * 100) : 0;
          return (
            <div key={i} className="ga-hm-row">
              <span className="ga-hm-range">Moves {b.range}</span>
              <div className="ga-hm-track-bg">
                <div className="ga-hm-track-fill" style={{ width: `${trackWidth}%` }}>
                  {blunderW > 0 && <div className="ga-hm-seg" style={{ width: `${blunderW}%`, background: '#ef4444' }} />}
                  {mistakeW > 0 && <div className="ga-hm-seg" style={{ width: `${mistakeW}%`, background: '#f59e0b' }} />}
                  {inaccW   > 0 && <div className="ga-hm-seg" style={{ width: `${inaccW}%`,   background: '#eab308' }} />}
                </div>
              </div>
              <span className="ga-hm-total">{b.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpeningsTable({ openings }) {
  if (!openings || openings.length === 0) return null;
  return (
    <div className="ga-openings-table-wrap">
      <table className="ga-openings-table">
        <thead>
          <tr>
            <th>Opening</th>
            <th>ECO</th>
            <th>Played</th>
            <th>W / D / L</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {openings.map((o, i) => (
            <tr key={i}>
              <td className="ga-opening-name">{o.name}</td>
              <td><span className="ga-eco-badge">{o.ecoCode}</span></td>
              <td>{o.played}</td>
              <td>
                <span className="ga-wdl">
                  <span className="ga-w">{o.wins}</span>
                  <span className="ga-sep">/</span>
                  <span className="ga-d">{o.draws}</span>
                  <span className="ga-sep">/</span>
                  <span className="ga-l">{o.losses}</span>
                </span>
              </td>
              <td>
                <div className="ga-winrate-bar-wrap">
                  <div className="ga-winrate-bar-bg">
                    <div
                      className="ga-winrate-bar-fill"
                      style={{
                        width: `${o.winRate}%`,
                        background: o.winRate >= 60 ? '#10b981' : o.winRate >= 40 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className="ga-winrate-pct">{o.winRate}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Recommendations({ result }) {
  if (!result) return null;
  const { opening, middlegame, endgame, tacticsStats } = result;

  const phases = [
    { key: 'opening',    data: opening,    label: 'Opening',    icon: '♟' },
    { key: 'middlegame', data: middlegame,  label: 'Middlegame', icon: '⚔' },
    { key: 'endgame',    data: endgame,     label: 'Endgame',    icon: '👑' }
  ].filter(p => p.data && p.data.accuracy !== null);

  if (phases.length === 0) return null;

  const weakest = phases.reduce((prev, curr) =>
    (curr.data.accuracy ?? 100) < (prev.data.accuracy ?? 100) ? curr : prev
  );

  // Dominant missed tactic
  const tactics = Object.entries(tacticsStats || {}).sort((a, b) => b[1] - a[1]);
  const topTactic = tactics[0] && tactics[0][1] > 0 ? tactics[0][0] : null;

  return (
    <div className="ga-recommendations">
      <h3 className="ga-section-title">💡 Personalised Recommendations</h3>
      <div className="ga-recs-grid">
        <div className="ga-rec-card">
          <div className="ga-rec-icon">🎯</div>
          <div className="ga-rec-body">
            <div className="ga-rec-title">Focus Area: {weakest.label}</div>
            <div className="ga-rec-desc">
              Your {weakest.label.toLowerCase()} accuracy is {weakest.data.accuracy}% — the weakest phase. Focus your training here to improve fastest.
            </div>
          </div>
        </div>

        {topTactic && (
          <div className="ga-rec-card">
            <div className="ga-rec-icon">⚡</div>
            <div className="ga-rec-body">
              <div className="ga-rec-title">
                Top Blind Spot: {topTactic === 'missedCheckmate' ? 'Missed Checkmate' :
                                 topTactic === 'hangingPiece'    ? 'Hanging Pieces'   :
                                 topTactic === 'fork'            ? 'Missed Forks'     : 'Other Blunders'}
              </div>
              <div className="ga-rec-desc">
                Solve puzzles specifically targeting this pattern to stop losing points here.
              </div>
            </div>
          </div>
        )}

        <div className="ga-rec-card">
          <div className="ga-rec-icon">🏁</div>
          <div className="ga-rec-body">
            <div className="ga-rec-title">Daily Practice</div>
            <div className="ga-rec-desc">
              Consistent daily puzzles are the fastest way to improve pattern recognition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PlaystyleCard ────────────────────────────────────────────────────────────

function PlaystyleCard({ playstyle }) {
  if (!playstyle) return null;
  return (
    <div className="ga-playstyle-card">
      <div className="ga-playstyle-icon">{playstyle.icon}</div>
      <div className="ga-playstyle-body">
        <div className="ga-playstyle-type">{playstyle.display}</div>
        <div className="ga-playstyle-desc">{playstyle.description}</div>
        <div className="ga-playstyle-chips">
          {(playstyle.strengths || []).map((s, i) => (
            <span key={i} className="ga-ps-chip strength">✓ {s}</span>
          ))}
          {(playstyle.weaknesses || []).map((w, i) => (
            <span key={i} className="ga-ps-chip weakness">✗ {w}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GameBreakdownTable ───────────────────────────────────────────────────────

const THEME_COLORS = {
  missedCheckmate: '#ef4444',
  hangingPiece:    '#f59e0b',
  fork:            '#8b5cf6',
  positional:      '#6b7280'
};
const THEME_LABELS = {
  missedCheckmate: 'Missed Mate',
  hangingPiece:    'Hanging Piece',
  fork:            'Missed Fork',
  positional:      'Blunder'
};

function GameBreakdownTable({ games }) {
  if (!games || games.length === 0) return null;
  return (
    <div className="ga-breakdown-wrap">
      <table className="ga-breakdown-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Opening</th>
            <th>Result</th>
            <th>Accuracy</th>
            <th>Blunders</th>
            <th>Key Themes</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => (
            <tr key={i}>
              <td className="ga-game-num">{g.gameNumber}</td>
              <td className="ga-game-opening" title={g.opening}>
                <span className="ga-eco-badge">{g.ecoCode || '?'}</span>
                {g.opening ? g.opening.slice(0, 22) + (g.opening.length > 22 ? '…' : '') : '—'}
              </td>
              <td>
                <span className={`ga-result-badge ${g.result}`}>
                  {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                </span>
              </td>
              <td className="ga-game-acc">
                <span style={{ color: g.accuracy >= 70 ? '#10b981' : g.accuracy >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {g.accuracy}%
                </span>
              </td>
              <td className="ga-game-blunders">
                {g.totalBlunders > 0
                  ? <span style={{ color: '#ef4444' }}>{g.totalBlunders}</span>
                  : <span style={{ color: '#10b981' }}>0</span>}
              </td>
              <td className="ga-game-themes">
                {(!g.gameThemes || g.gameThemes.length === 0)
                  ? <span className="ga-no-themes">Clean ✓</span>
                  : g.gameThemes.slice(0, 2).map((t, ti) => (
                    <span
                      key={ti}
                      className="ga-theme-pill"
                      style={{
                        background:   (THEME_COLORS[t.theme] || '#6b7280') + '22',
                        color:        THEME_COLORS[t.theme] || '#6b7280',
                        borderColor:  (THEME_COLORS[t.theme] || '#6b7280') + '66'
                      }}
                      title={t.description}
                    >
                      {THEME_LABELS[t.theme] || t.theme}
                    </span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── TrendCharts ──────────────────────────────────────────────────────────────

function TrendCharts({ trends }) {
  if (!trends || !trends.accuracyPerGame || trends.accuracyPerGame.length === 0) return null;
  const labels = trends.accuracyPerGame.map((_, i) => `G${i + 1}`);

  const accuracyData = {
    labels,
    datasets: [{
      label: 'Accuracy %',
      data: trends.accuracyPerGame,
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6,182,212,0.12)',
      tension: 0.35,
      pointBackgroundColor: '#06b6d4',
      pointRadius: 4,
      fill: true
    }]
  };
  const accuracyOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 12 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% accuracy` } }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { min: 0, max: 100, ticks: { color: '#9ca3af', callback: v => `${v}%` }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const blundersData = {
    labels,
    datasets: [{
      label: 'Blunders',
      data: trends.blundersPerGame,
      backgroundColor: 'rgba(239,68,68,0.65)',
      borderColor: '#ef4444',
      borderWidth: 1,
      borderRadius: 4
    }]
  };
  const blundersOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 12 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw} blunder${ctx.raw !== 1 ? 's' : ''}` } }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { min: 0, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div className="ga-trends-wrap">
      <div className="ga-trend-chart">
        <h4 className="ga-trend-title">📈 Accuracy Trend</h4>
        <Line data={accuracyData} options={accuracyOptions} />
      </div>
      <div className="ga-trend-chart">
        <h4 className="ga-trend-title">💥 Blunders Per Game</h4>
        <Bar data={blundersData} options={blundersOptions} />
      </div>
    </div>
  );
}

// ─── OpeningIntelligence ──────────────────────────────────────────────────────

function OpeningIntelligence({ openingIntelligence }) {
  if (!openingIntelligence) return null;
  const { bestOpening, worstOpening } = openingIntelligence;
  if (!bestOpening && !worstOpening) return null;
  return (
    <div className="ga-oi-wrap">
      {bestOpening && (
        <div className="ga-oi-card ga-oi-best">
          {/* Glow orb behind crown */}
          <div className="ga-oi-glow ga-oi-glow-best" />

          {/* Top row: badge + win rate */}
          <div className="ga-oi-top-row">
            <span className="ga-oi-badge ga-oi-badge-best">★ Best Opening</span>
            {bestOpening.winRate != null && (
              <span className="ga-oi-winrate-pill ga-oi-winrate-best">
                {bestOpening.winRate}% win rate
              </span>
            )}
          </div>

          {/* Crown + name block */}
          <div className="ga-oi-hero">
            <div className="ga-oi-crown">♔</div>
            <div className="ga-oi-hero-body">
              <div className="ga-oi-name">{bestOpening.name}</div>
              {bestOpening.ecoCode && (
                <span className="ga-eco-badge ga-oi-eco">{bestOpening.ecoCode}</span>
              )}
            </div>
          </div>

          {/* Stats row */}
          {(bestOpening.wins != null || bestOpening.draws != null || bestOpening.losses != null || bestOpening.played != null) && (
            <div className="ga-oi-stats-row">
              {bestOpening.played != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val">{bestOpening.played}</span>
                  <span className="ga-oi-stat-lbl">played</span>
                </div>
              )}
              {bestOpening.wins != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-w">{bestOpening.wins}</span>
                  <span className="ga-oi-stat-lbl">wins</span>
                </div>
              )}
              {bestOpening.draws != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-d">{bestOpening.draws}</span>
                  <span className="ga-oi-stat-lbl">draws</span>
                </div>
              )}
              {bestOpening.losses != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-l">{bestOpening.losses}</span>
                  <span className="ga-oi-stat-lbl">losses</span>
                </div>
              )}
            </div>
          )}

          {/* Advice */}
          <div className="ga-oi-advice">
            Keep studying all variations — this suits your style.
          </div>
        </div>
      )}

      {worstOpening && (
        <div className="ga-oi-card ga-oi-worst">
          <div className="ga-oi-glow ga-oi-glow-worst" />

          <div className="ga-oi-top-row">
            <span className="ga-oi-badge ga-oi-badge-worst">⚠ Needs Work</span>
            {worstOpening.winRate != null && (
              <span className="ga-oi-winrate-pill ga-oi-winrate-worst">
                {worstOpening.winRate}% win rate
              </span>
            )}
          </div>

          <div className="ga-oi-hero">
            <div className="ga-oi-warn-icon">⚠️</div>
            <div className="ga-oi-hero-body">
              <div className="ga-oi-name">{worstOpening.name}</div>
              {worstOpening.ecoCode && (
                <span className="ga-eco-badge ga-oi-eco">{worstOpening.ecoCode}</span>
              )}
            </div>
          </div>

          {(worstOpening.wins != null || worstOpening.draws != null || worstOpening.losses != null || worstOpening.played != null) && (
            <div className="ga-oi-stats-row">
              {worstOpening.played != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val">{worstOpening.played}</span>
                  <span className="ga-oi-stat-lbl">played</span>
                </div>
              )}
              {worstOpening.wins != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-w">{worstOpening.wins}</span>
                  <span className="ga-oi-stat-lbl">wins</span>
                </div>
              )}
              {worstOpening.draws != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-d">{worstOpening.draws}</span>
                  <span className="ga-oi-stat-lbl">draws</span>
                </div>
              )}
              {worstOpening.losses != null && (
                <div className="ga-oi-stat-pill">
                  <span className="ga-oi-stat-val ga-l">{worstOpening.losses}</span>
                  <span className="ga-oi-stat-lbl">losses</span>
                </div>
              )}
            </div>
          )}

          <div className="ga-oi-advice">
            Consider one of these instead:
          </div>
          {Array.isArray(worstOpening.suggestions) && worstOpening.suggestions.length > 0 && (
            <div className="ga-oi-suggestions">
              {worstOpening.suggestions.map((s, i) => (
                <div key={i} className="ga-oi-suggestion-pill">
                  <span className="ga-oi-suggestion-num">{i + 1}</span>
                  <span className="ga-oi-suggestion-name">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chess Nexus Coach Card (DISABLED) ───────────────────────────────────────
// AI / coach commentary removed for performance. Re-add this component when
// commentary is re-enabled in the future.
// eslint-disable-next-line no-unused-vars
function ChessNexusCoachCard_DISABLED({ result, history }) {
  if (!result) return null;

  // 1. Weak Area — lowest avg phase accuracy
  const phases = {
    Opening:    result.opening?.accuracy,
    Middlegame: result.middlegame?.accuracy,
    Endgame:    result.endgame?.accuracy,
  };
  const validPhases = Object.entries(phases).filter(([, v]) => v != null);
  const weakArea = validPhases.length > 0
    ? validPhases.reduce((a, b) => a[1] < b[1] ? a : b)[0]
    : null;

  // 2. Blunder Rate
  const bpg = result.blundersPerGame ?? 0;
  const blunderRate  = bpg > 3 ? 'High 🔴' : bpg > 1 ? 'Medium 🟠' : 'Low 🟢';
  const blunderColor = bpg > 3 ? '#ef4444' : bpg > 1 ? '#f59e0b' : '#10b981';

  // 3. Best Opening
  const bestOpening = result.openingIntelligence?.bestOpening?.name
    ?? (result.openings?.length > 0
        ? result.openings.reduce((a, b) => b.winRate > a.winRate ? b : a).name
        : null);

  // 4. Common Mistake — top tactic type
  const tactics = result.tacticsStats ?? {};
  const TACTIC_LABELS = {
    missedCheckmate: 'Missed Checkmate',
    hangingPiece:    'Hanging Pieces',
    fork:            'Missed Forks',
    positional:      'Positional Errors',
  };
  const topTacticKey = Object.entries(tactics)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const commonMistake = topTacticKey ? TACTIC_LABELS[topTacticKey] : null;

  // 5. Trend — compare recent half vs older half of accuracyPerGame
  const acc = result.trends?.accuracyPerGame ?? [];
  let trend = 'Stable →';
  let trendColor = '#9ca3af';
  if (acc.length >= 6) {
    const half     = Math.floor(acc.length / 2);
    const recent   = acc.slice(-half).reduce((a, b) => a + b, 0) / half;
    const previous = acc.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const diff = recent - previous;
    if (diff > 5)       { trend = 'Improving 📈'; trendColor = '#10b981'; }
    else if (diff < -5) { trend = 'Declining 📉'; trendColor = '#ef4444'; }
  }

  // 6. Improved vs last session (from saved history snapshots)
  let vsLastSession = null;
  if (history && history.length >= 1 && result.overallAccuracy != null) {
    const prev = history[history.length - 1];
    if (prev?.overallAccuracy != null) {
      const diff = Math.round(result.overallAccuracy - prev.overallAccuracy);
      vsLastSession = {
        diff,
        label: diff > 0 ? `+${diff}% vs last session 📈`
             : diff < 0 ? `${diff}% vs last session 📉`
             : 'Same as last session →',
        color: diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#9ca3af',
      };
    }
  }

  const insights = [
    { icon: '🎯', label: 'Weak Area',       value: weakArea ?? '—',              color: null },
    { icon: '💥', label: 'Blunder Rate',    value: blunderRate,                   color: blunderColor },
    { icon: '♟️', label: 'Best Opening',    value: bestOpening ?? '—',            color: null },
    { icon: '⚠️', label: 'Common Mistake', value: commonMistake ?? '—',          color: null },
    { icon: '📈', label: 'Performance',     value: trend,                          color: trendColor },
  ];

  return (
    <div className="ga-nexus-coach-card">
      <div className="ga-nexus-coach-header">
        <span className="ga-nexus-coach-logo">♞</span>
        <span className="ga-nexus-coach-title">Chess Nexus Coach</span>
        {vsLastSession && (
          <span className="ga-nexus-coach-vs" style={{ color: vsLastSession.color }}>
            {vsLastSession.label}
          </span>
        )}
      </div>
      <div className="ga-nexus-coach-grid">
        {insights.map((item, i) => (
          <div key={i} className="ga-nexus-coach-item">
            <span className="ga-nexus-coach-item-icon">{item.icon}</span>
            <span className="ga-nexus-coach-item-label">{item.label}</span>
            <span
              className="ga-nexus-coach-item-value"
              style={item.color ? { color: item.color } : undefined}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OTB Scoresheet Section ──────────────────────────────────────────────────
// ─── Move list table shown after OCR scan ────────────────────────────────────
function MoveListTable({ allMoves = [] }) {
  // Build pairs: [{ moveNumber, white, black }]
  const pairs = [];
  for (const m of allMoves) {
    if (m.side === 'white') {
      pairs.push({ moveNumber: m.moveNumber, white: m, black: null });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && last.moveNumber === m.moveNumber && !last.black) {
        last.black = m;
      } else {
        pairs.push({ moveNumber: m.moveNumber, white: null, black: m });
      }
    }
  }

  if (pairs.length === 0) {
    return <p className="ga-otb-no-moves">No moves were detected. Try re-uploading a clearer image.</p>;
  }

  return (
    <div className="ga-otb-move-list">
      <div className="ga-otb-move-list-head">
        <span>#</span><span>White</span><span>Black</span>
      </div>
      {pairs.map(p => (
        <div
          key={p.moveNumber}
          className={`ga-otb-move-row${
            (p.white && !p.white.accepted) || (p.black && !p.black.accepted) ? ' needs-fix' : ''
          }`}
        >
          <span className="ga-otb-mn">{p.moveNumber}.</span>
          <span className={`ga-otb-ms${p.white && !p.white.accepted ? ' bad' : ''}`}>
            {p.white ? p.white.san : ''}
          </span>
          <span className={`ga-otb-ms${p.black && !p.black.accepted ? ' bad' : ''}`}>
            {p.black ? p.black.san : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── OTB upload + review section ─────────────────────────────────────────────
function OTBSection({
  files, setFiles, playerSide, setPlayerSide,
  scanResult, scanning, analyzing, error, limitReached,
  onScan, onConfirmMoves, onAnalyze, onReset
}) {
  function handleFiles(fileList) {
    const arr = Array.from(fileList || []).slice(0, 5);
    setFiles(arr);
  }

  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  const hasAmbiguous = scanResult && scanResult.ambiguous && scanResult.ambiguous.length > 0;
  const allClean     = scanResult && !hasAmbiguous;

  // ── Upload form (before scan) ──────────────────────────────────────────────
  if (!scanResult) {
    return (
      <div className="ga-otb-section">
        <div className="ga-otb-side-row">
          <span className="ga-otb-side-label">Which colour did you play?</span>
          <div className="ga-otb-side-toggle">
            <button
              type="button"
              className={`ga-otb-side-btn${playerSide === 'white' ? ' active' : ''}`}
              onClick={() => setPlayerSide('white')}
            >♔ White</button>
            <button
              type="button"
              className={`ga-otb-side-btn${playerSide === 'black' ? ' active' : ''}`}
              onClick={() => setPlayerSide('black')}
            >♚ Black</button>
          </div>
        </div>

        <label className="ga-otb-drop">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <div className="ga-otb-drop-icon">📷</div>
          <div className="ga-otb-drop-title">Tap to upload scoresheet photos</div>
          <div className="ga-otb-drop-sub">Up to 5 images (JPG, PNG, WEBP). Take a clear, well-lit photo for best results.</div>
        </label>

        {files.length > 0 && (
          <div className="ga-otb-preview-grid">
            {files.map((f, i) => (
              <div key={i} className="ga-otb-preview">
                <img src={URL.createObjectURL(f)} alt={`scoresheet ${i + 1}`} />
                <button
                  type="button"
                  className="ga-otb-preview-remove"
                  onClick={() => removeFile(i)}
                  aria-label="Remove"
                >×</button>
                <span className="ga-otb-preview-name">Page {i + 1}</span>
              </div>
            ))}
          </div>
        )}

        <div className="ga-input-row ga-analyze-row">
          <button
            type="button"
            className="ga-analyze-btn"
            disabled={!files.length || scanning}
            onClick={onScan}
          >
            {scanning ? 'Reading scoresheet…' : '📷 Scan Scoresheet'}
          </button>
        </div>

        {error && <div className="ga-error">{error}</div>}
      </div>
    );
  }

  // ── Review panel (after scan) ──────────────────────────────────────────────
  return (
    <div className="ga-otb-section">
      <div className="ga-otb-review-header">
        <div className="ga-otb-review-title">
          📋 {scanResult.totalMoves} moves detected
          {hasAmbiguous
            ? <span className="ga-otb-badge-warn"> · {scanResult.ambiguous.length} need correction</span>
            : <span className="ga-otb-badge-ok"> · All moves recognised</span>
          }
        </div>
        <p className="ga-otb-review-sub">
          {hasAmbiguous
            ? 'Fix the highlighted moves below, then click Analyse.'
            : 'Review your game — if everything looks correct, click Analyse Game.'}
        </p>
      </div>

      <MoveListTable allMoves={scanResult.allMoves || []} />

      {hasAmbiguous && (
        <div className="ga-otb-ambiguous-section">
          <div className="ga-otb-ambiguous-title">⚠️ Moves that need correction</div>
          <OTBConfirmPanel
            scanResult={scanResult}
            onConfirm={onConfirmMoves}
            onCancel={onReset}
            submitting={analyzing}
          />
        </div>
      )}

      {allClean && (
        <div className="ga-input-row ga-analyze-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="ga-analyze-btn"
            disabled={analyzing}
            onClick={onAnalyze}
          >
            {analyzing ? 'Starting analysis…' : '✅ Analyse Game →'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button type="button" className="ga-otb-rescan-btn" onClick={onReset}>
          🔄 Re-scan with different image
        </button>
      </div>

      {error && <div className="ga-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ANALYSIS_JOB_KEY = 'analysisJob';

function saveAnalysisJob(cacheId, platform, username) {
  localStorage.setItem(ANALYSIS_JOB_KEY, JSON.stringify({ cacheId, platform, username, startedAt: Date.now() }));
  // Dispatch so Sidebar gets notified immediately
  window.dispatchEvent(new StorageEvent('storage', { key: ANALYSIS_JOB_KEY }));
}

function clearAnalysisJob() {
  localStorage.removeItem(ANALYSIS_JOB_KEY);
  window.dispatchEvent(new StorageEvent('storage', { key: ANALYSIS_JOB_KEY }));
}

function loadAnalysisJob() {
  try {
    const raw = localStorage.getItem(ANALYSIS_JOB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function registerAnalysisUsage(cacheId, platform, username) {
  if (!cacheId || !platform) return;
  try {
    await api.post('/api/game-analysis/usage', {
      cacheId,
      platform,
      username: platform === 'chessnexus' ? '' : username.trim()
    });
  } catch (err) {
    console.error('Failed to record analysis usage', err);
  }
}

// ─── Login prompt for features requiring an account ─────────────────────────
function LoginPrompt({ feature }) {
  return (
    <div className="ga-login-prompt">
      <div className="ga-login-prompt-icon">�</div>
      <div className="ga-login-prompt-body">
        <strong>{feature}</strong> is only available to logged-in users. Create a free account to use this feature.
      </div>
      <div className="ga-login-prompt-actions">
        <a href="/login" className="ga-login-prompt-btn">Log in</a>
        <a href="/signup-request" className="ga-login-prompt-btn ga-login-prompt-btn--outline">Sign up free</a>
      </div>
    </div>
  );
}

export default function GameAnalysis() {
  const { user } = useAuth();
  const [platform, setPlatform]           = useState('chesscom');
  const [username, setUsername]           = useState('');
  const [isOwnAccount, setIsOwnAccount]   = useState(true);  // false = scout mode
  const [loading, setLoading]             = useState(false);
  const [runningInBackground, setRunningInBackground] = useState(false); // navigated away and came back
  const [error, setError]                 = useState(null);
  const [cacheId, setCacheId]             = useState(null);
  const [pollStatus, setPollStatus]       = useState(null); // 'pending' | 'done' | 'error'
  const [progress, setProgress]           = useState(null);
  const [result, setResult]               = useState(null);
  const [userProfile, setUserProfile]     = useState(null);
  const [lastAnalysis, setLastAnalysis]   = useState(null); // { analyzedAt, platform, chessPlatformUsername }
  const [loadingPrev, setLoadingPrev]     = useState(true);
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  const [history, setHistory]             = useState([]);
  // Opening Repertoire UI was removed — repertoire is no longer fetched/shown.
  const [usageLoggedForCacheId, setUsageLoggedForCacheId] = useState(null);

  // ── OTB scoresheet scanner state ─────────────────────────────────────────
  const [otbFiles, setOtbFiles] = useState([]);              // File[]
  const [otbPlayerSide, setOtbPlayerSide] = useState('white');
  const [otbScanResult, setOtbScanResult] = useState(null);  // { scanId, ambiguous, confirmedMoves, totalMoves }
  const [otbScanning, setOtbScanning] = useState(false);
  const [otbAnalyzing, setOtbAnalyzing] = useState(false);
  const [otbError, setOtbError] = useState(null);
  const [otbLimitReached, setOtbLimitReached] = useState(false);

  // ── Detailed-report (server) state — used by Quick Analyze's report button ──
  const [pgnAnalyzing, setPgnAnalyzing] = useState(false);
  const [pgnError, setPgnError] = useState(null);

  // ── Quick Analyze state (FEN/PGN → live engine board, nothing saved to DB) ──
  const [quickFen, setQuickFen] = useState('');
  const [quickPgn, setQuickPgn] = useState('');
  const [quickError, setQuickError] = useState(null);
  const [quickGame, setQuickGame] = useState(null); // { pgn, playerSide, moveAnalysis }

  // Board editor (set up a position by hand, then Quick Analyze it).
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [showEditor, setShowEditor] = useState(false);
  const [editorChess, setEditorChess] = useState(() => new Chess(START_FEN));
  const [selectedPiece, setSelectedPiece] = useState(undefined); // undefined=drag, null=erase, str=place
  const editorFen = editorChess.fen();

  const setEditorFromFen = (fen) => {
    try { setEditorChess(new Chess(fen, { skipValidation: true })); } catch { /* ignore */ }
  };
  const openEditor = () => {
    // Seed the editor from the typed FEN if valid, else the standard start.
    const f = quickFen.trim();
    try { setEditorChess(new Chess(f || START_FEN, { skipValidation: true })); }
    catch { setEditorChess(new Chess(START_FEN)); }
    setShowEditor(true);
  };

  const pollRef = useRef(null);

  // Opening Repertoire feature removed — keep a no-op so existing call sites stay
  // valid without fetching/showing the (now-removed) repertoire panel.
  const fetchRepertoire = useCallback(() => {}, []);

  // Fetch user profile to pre-fill usernames
  useEffect(() => {
    api.get('/api/auth/me').then(res => {
      const u = res.data?.user;
      if (u) {
        setUserProfile(u);
        if (u.chessComUsername) setUsername(u.chessComUsername);
      }
    }).catch(() => {});
  }, []);

  // Auto-load on page open: resume pending job OR show last completed result
  useEffect(() => {
    api.get('/api/game-analysis/latest')
      .then(res => {
        if (!res.data?.found) return;

        if (res.data.status === 'pending') {
          // There is an in-progress server-side job — resume polling
          const job = loadAnalysisJob();
          setCacheId(res.data.cacheId);
          setPollStatus('pending');
          setProgress(res.data.progress);
          setLoading(false);
          setRunningInBackground(true); // show the "came back" banner
          startPolling(res.data.cacheId);
          // Restore username/platform from localStorage if available
          if (job) {
            setPlatform(job.platform || 'chesscom');
            setUsername(job.username || '');
          }
        } else {
          // Done result
          setLastAnalysis({
            analyzedAt: res.data.analyzedAt,
            platform: res.data.platform,
            chessPlatformUsername: res.data.chessPlatformUsername
          });
          setResult(res.data.result);
          setPollStatus('done');
          clearAnalysisJob();
          if (res.data.platform !== 'chessnexus') fetchRepertoire(res.data.platform, res.data.chessPlatformUsername);
          if (res.data.cacheId && usageLoggedForCacheId !== res.data.cacheId) {
            registerAnalysisUsage(res.data.cacheId, res.data.platform, res.data.chessPlatformUsername)
              .then(() => setUsageLoggedForCacheId(res.data.cacheId));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill username when platform changes
  useEffect(() => {
    if (!userProfile) return;
    if (platform === 'chesscom' && userProfile.chessComUsername) {
      setUsername(userProfile.chessComUsername);
    } else if (platform === 'lichess' && userProfile.lichessUsername) {
      setUsername(userProfile.lichessUsername);
    } else {
      setUsername('');
    }
  }, [platform, userProfile]);

  // Fetch history snapshots (updated whenever a new result arrives)
  const fetchHistory = useCallback(() => {
    api.get('/api/game-analysis/history')
      .then(res => setHistory(res.data.history || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Start polling when we have a cacheId and status is pending
  const startPolling = useCallback((id, ownAccount = true) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/game-analysis/status/${id}`);
        const { status, progress: prog, result: res_result, error: err } = res.data;
        setProgress(prog);
        setPollStatus(status);

        if (status === 'done') {
          clearInterval(pollRef.current);
          clearAnalysisJob();
          setLastAnalysis(null); // new result replaces the old one
          setResult(res_result);
          setLoading(false);
          setRunningInBackground(false);
          fetchHistory(); // refresh progress history after each completed analysis
          if (ownAccount && platform !== 'chessnexus') fetchRepertoire(platform, username.trim()); // only save/show for own account on external platforms
          if (id && usageLoggedForCacheId !== id) {
            registerAnalysisUsage(id, platform, username).then(() => setUsageLoggedForCacheId(id));
          }
        } else if (status === 'error') {
          clearInterval(pollRef.current);
          clearAnalysisJob();
          setError(err || 'Analysis failed. Please try again.');
          setLoading(false);
          setRunningInBackground(false);
        }
      } catch {
        // keep polling on temporary network errors
      }
    }, 3000);
  }, [fetchHistory, fetchRepertoire, platform, username, user]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (platform === 'otb' || platform === 'quick') return; // these have their own analyze flow
    if (platform !== 'chessnexus' && !username.trim()) {
      setError('Please enter your username.');
      return;
    }

    setError(null);
    setResult(null);
    setCacheId(null);
    setPollStatus(null);
    setProgress(null);
    setLastAnalysis(null);
    setLoading(true);
    setRunningInBackground(false);

    // Guests are always scout mode; logged-in users respect their toggle
    const effectiveIsOwnAccount = !user ? false : (platform === 'chessnexus' ? true : isOwnAccount);

    try {
      const res = await api.post('/api/game-analysis/start', {
        platform,
        username: platform === 'chessnexus' ? '' : username.trim(),
        force: true,
        isOwnAccount: effectiveIsOwnAccount
      });

      const { cacheId: id, status, result: cachedResult } = res.data;
      setCacheId(id);
      setPollStatus(status);

      // Save username to profile silently — only for logged-in users on their own account
      if (user && effectiveIsOwnAccount && platform !== 'chessnexus') {
        if (platform === 'chesscom') {
          api.patch('/api/user/chess-usernames', { chessComUsername: username.trim() }).catch(() => {});
        } else {
          api.patch('/api/user/chess-usernames', { lichessUsername: username.trim() }).catch(() => {});
        }
      }

      if (status === 'done' && cachedResult) {
        // Cache hit — show instantly
        clearAnalysisJob();
        setResult(cachedResult);
        setLoading(false);
        // No opening repertoire for ChessNexus (no ECO codes in arena games)
        if (effectiveIsOwnAccount && platform !== 'chessnexus') fetchRepertoire(platform, username.trim());
        if (id && usageLoggedForCacheId !== id) {
          registerAnalysisUsage(id, platform, username).then(() => setUsageLoggedForCacheId(id));
        }
      } else {
        // Save job to localStorage so user can navigate away and come back
        saveAnalysisJob(id, platform, username.trim());
        // Poll for progress
        startPolling(id, effectiveIsOwnAccount);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start analysis. Please try again.');
      setLoading(false);
    }
  }

  // ── OTB scoresheet handlers ────────────────────────────────────────────────
  function handleOtbReset() {
    setOtbFiles([]);
    setOtbScanResult(null);
    setOtbError(null);
    setOtbScanning(false);
    setOtbAnalyzing(false);
    setOtbLimitReached(false);
  }

  async function handleOtbScan() {
    setOtbError(null);
    if (!otbFiles.length) {
      setOtbError('Please upload at least one scoresheet image.');
      return;
    }

    setOtbScanning(true);
    setOtbScanResult(null);

    try {
      const fd = new FormData();
      otbFiles.forEach(f => fd.append('images', f));
      fd.append('playerSide', otbPlayerSide);

      const res = await api.post('/api/otb-analysis/scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setOtbScanResult(data);
      // Always show the review panel — user must confirm before analysis starts
    } catch (err) {
      const data = err?.response?.data;
      if (data?.limitReached) {
        setOtbLimitReached(true);
        setOtbError(data.message || 'Monthly scan limit reached.');
      } else {
        setOtbError(data?.message || 'Failed to scan scoresheet.');
      }
    } finally {
      setOtbScanning(false);
    }
  }

  async function handleOtbConfirmMoves(resolvedList) {
    if (!otbScanResult) return;
    await submitOtbForAnalysis(otbScanResult.scanId, resolvedList);
  }

  async function submitOtbForAnalysis(scanId, resolvedMoves) {
    setOtbError(null);
    setOtbAnalyzing(true);
    setError(null);
    setResult(null);
    setLastAnalysis(null);

    try {
      const res = await api.post('/api/otb-analysis/analyze', {
        scanId,
        resolvedMoves,
        playerSide: otbPlayerSide
      });
      const { cacheId: id, status } = res.data;
      setCacheId(id);
      setPollStatus(status);
      setLoading(true);
      setOtbScanResult(null);
      setOtbFiles([]);
      startPolling(id, true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to analyse OTB game.';
      const failedIndex = err?.response?.data?.failedIndex;
      setOtbError(typeof failedIndex === 'number'
        ? `${msg} (Move #${failedIndex + 1})`
        : msg);
    } finally {
      setOtbAnalyzing(false);
    }
  }

  // ── Quick Analyze — open the live engine board from a pasted FEN or PGN.
  // No server call, nothing saved to DB; it's the same study board as a game.
  function handleQuickAnalyze() {
    setQuickError(null);
    const fen = quickFen.trim();
    const pgn = quickPgn.trim();

    // PGN takes priority if both are filled.
    if (pgn) {
      const c = new Chess();
      let ok = true;
      try { if (c.loadPgn(pgn, { strict: false }) === false) ok = false; } catch { ok = false; }
      if (!ok || c.history().length < 1) {
        setQuickError('Could not read that PGN. Paste a valid PGN with at least one move.');
        return;
      }
      // Re-emit a clean PGN from the parsed moves.
      const sans = c.history();
      const clean = new Chess();
      sans.forEach(s => clean.move(s, { strict: false }));
      setQuickGame({ pgn: clean.pgn(), playerSide: 'white', moveAnalysis: [], opening: 'Quick Analyze' });
      return;
    }

    if (fen) {
      // Validate the FEN, then wrap it as a header-only PGN so the board loads it.
      let valid = true;
      try { new Chess(fen); } catch { valid = false; }
      if (!valid) {
        setQuickError('That FEN is not valid. Check it and try again.');
        return;
      }
      const side = (fen.split(' ')[1] === 'b') ? 'black' : 'white';
      const headerPgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n*`;
      setQuickGame({ pgn: headerPgn, playerSide: side, moveAnalysis: [], opening: 'Quick Analyze' });
      return;
    }

    setQuickError('Paste a FEN or a PGN to analyse.');
  }

  // Analyze the position currently set up in the board editor.
  function handleEditorAnalyze() {
    setQuickError(null);
    const fen = editorChess.fen();
    // Need exactly one king per side for a legal, analysable position.
    const board = fen.split(' ')[0];
    const wk = (board.match(/K/g) || []).length;
    const bk = (board.match(/k/g) || []).length;
    if (wk !== 1 || bk !== 1) {
      setQuickError('Set up exactly one White king and one Black king before analysing.');
      return;
    }
    const side = (fen.split(' ')[1] === 'b') ? 'black' : 'white';
    const headerPgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n*`;
    setQuickGame({ pgn: headerPgn, playerSide: side, moveAnalysis: [], opening: 'Quick Analyze' });
  }

  // Quick Analyze → full server-side detailed report (reuses the PGN pipeline).
  async function handleQuickDetailed() {
    setQuickError(null);
    setPgnError(null);
    const pgn = quickPgn.trim();
    if (!pgn) { setQuickError('Paste a PGN (with moves) to get a detailed report.'); return; }
    setPgnAnalyzing(true);
    setError(null);
    setResult(null);
    setLastAnalysis(null);
    try {
      const res = await api.post('/api/otb-analysis/analyze-pgn', { pgn });
      const { cacheId: id, status } = res.data;
      setCacheId(id);
      setPollStatus(status);
      setLoading(true);
      startPolling(id, true);
    } catch (err) {
      setPgnError(err?.response?.data?.message || 'Failed to analyse that PGN. Please check it and try again.');
    } finally {
      setPgnAnalyzing(false);
    }
  }

  const progressPct = progress
    ? Math.round(((progress.current || 0) / Math.max(progress.total || 10, 1)) * 100)
    : 0;

  // Quick Analyze takes over the page with just the live engine board.
  if (quickGame) {
    return (
      <div className="ga-page">
        <GameReplay
          game={quickGame}
          quick
          totalGames={1}
          onClose={() => setQuickGame(null)}
        />
      </div>
    );
  }

  return (
    <div className="ga-page">

      {/* ── Header ── */}
      <div className="ga-header">
        <div className="ga-header-icon">🔍</div>
        <div style={{ flex: 1 }}>
          <h1 className="ga-title">Analyze My Games</h1>
          <p className="ga-subtitle">
            {platform === 'quick'
              ? 'Quick Analyze — paste a FEN or PGN. Study it instantly on a live Stockfish board, or run a full Detailed Report for a PGN.'
              : platform === 'otb'
              ? 'Snap a photo of your over-the-board scoresheet. Chess Nexus reads the moves and analyses the game with Stockfish.'
              : platform === 'chessnexus'
              ? 'Analyzes your last 25 Arena Tournament games played on ChessNexus.'
              : isOwnAccount
              ? 'Chess Nexus analyzes your last 25 games from chess.com or lichess and exposes exactly where you\'re losing points.'
              : 'Scout mode — analyzes the last 50 games of any player. No data is saved to your profile.'}
          </p>
        </div>
        <CoffeeCta variant="pill" style={{ flexShrink: 0, alignSelf: 'flex-start' }} />
      </div>

      {/* ── Input Form ── */}
      <div className="ga-form-card">
        {lastAnalysis && (
          <div className="ga-last-analysis-banner">
            <span className="ga-last-analysis-icon">📊</span>
            <span>
              Showing your last analysis for <strong>{lastAnalysis.chessPlatformUsername}</strong> on{' '}
              <strong>{
                lastAnalysis.platform === 'chesscom' ? 'chess.com' :
                lastAnalysis.platform === 'lichess' ? 'lichess' :
                'ChessNexus Arena'
              }</strong>
              {' '}· Analyzed on {new Date(lastAnalysis.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="ga-last-analysis-hint">Run a new analysis below to refresh.</span>
          </div>
        )}
        <form onSubmit={handleAnalyze} className="ga-form">
          <div className="ga-platform-row">
            <button
              type="button"
              className={`ga-platform-btn ga-platform-logo ${platform === 'chesscom' ? 'active' : ''}`}
              onClick={() => setPlatform('chesscom')}
              title="Chess.com"
              aria-label="Chess.com"
            >
              <ChessComLogo />
            </button>
            <button
              type="button"
              className={`ga-platform-btn ga-platform-logo ${platform === 'lichess' ? 'active' : ''}`}
              onClick={() => setPlatform('lichess')}
              title="Lichess"
              aria-label="Lichess"
            >
              <LichessLogo />
            </button>
            <button
              type="button"
              className={`ga-platform-btn ${platform === 'chessnexus' ? 'active' : ''}`}
              onClick={() => setPlatform('chessnexus')}
            >
              ⚡ ChessNexus
            </button>
            <button
              type="button"
              className={`ga-platform-btn ${platform === 'otb' ? 'active' : ''}`}
              onClick={() => setPlatform('otb')}
            >
              📷 OTB Scoresheet
            </button>
            <button
              type="button"
              className={`ga-platform-btn ${platform === 'quick' ? 'active' : ''}`}
              onClick={() => setPlatform('quick')}
            >
              ⚡ Quick Analyze
            </button>
          </div>

          {/* Account mode toggle — logged-in non-guest users only; hidden for ChessNexus & OTB */}
          {user && user.role !== 'guest' && platform !== 'chessnexus' && platform !== 'otb' && platform !== 'quick' && (
            <>
              <div className="ga-mode-row">
                <button
                  type="button"
                  className={`ga-mode-btn${isOwnAccount ? ' active' : ''}`}
                  onClick={() => setIsOwnAccount(true)}
                >
                  👤 My Account
                </button>
                <button
                  type="button"
                  className={`ga-mode-btn scout${!isOwnAccount ? ' active' : ''}`}
                  onClick={() => setIsOwnAccount(false)}
                >
                  🔭 Check Another Player
                </button>
              </div>
              {!isOwnAccount && (
                <p className="ga-scout-hint">🔭 Scout mode: analyzes 50 games — results not saved to your profile.</p>
              )}
            </>
          )}

          {/* Guest notice for chess.com / lichess */}
          {(!user || user.role === 'guest') && platform !== 'chessnexus' && platform !== 'otb' && platform !== 'quick' && (
            <p className="ga-scout-hint">🔭 Analysing 50 games in scout mode. <a href="/login" style={{color:'#f59e0b'}}>Log in</a> to track your progress over time.</p>
          )}

          {/* Username input — hidden for ChessNexus (uses DB games automatically) and OTB */}
          {platform === 'otb' ? (
            (user && user.role !== 'guest') ? (
              <OTBSection
                files={otbFiles}
                setFiles={setOtbFiles}
                playerSide={otbPlayerSide}
                setPlayerSide={setOtbPlayerSide}
                scanResult={otbScanResult}
                scanning={otbScanning}
                analyzing={otbAnalyzing}
                error={otbError}
                limitReached={otbLimitReached}
                onScan={handleOtbScan}
                onConfirmMoves={handleOtbConfirmMoves}
                onAnalyze={() => submitOtbForAnalysis(otbScanResult?.scanId, [])}
                onReset={handleOtbReset}
              />
            ) : (
              <LoginPrompt feature="OTB Scoresheet Scanner" />
            )
          ) : platform === 'chessnexus' ? (
            (user && user.role !== 'guest') ? (
              <div className="ga-nexus-info">
                <span className="ga-nexus-info-icon">🏆</span>
                <span>Your last 25 finished Arena Tournament games on ChessNexus will be analyzed automatically.</span>
              </div>
            ) : (
              <LoginPrompt feature="ChessNexus Analysis" />
            )
          ) : platform === 'quick' ? (
            <div className="ga-pgn-section">
              <p className="ga-pgn-side-label" style={{ margin: '0 0 2px' }}>
                ⚡ Paste a FEN or a PGN. <strong>Quick Analyze</strong> opens a live
                Stockfish board (depth 18, 4 lines, nothing saved). For a PGN you
                can also run a full <strong>Detailed Report</strong>.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  className="ga-username-input"
                  type="text"
                  placeholder="FEN — e.g. r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
                  value={quickFen}
                  onChange={e => setQuickFen(e.target.value)}
                  spellCheck={false}
                  style={{ fontFamily: "'Courier New', monospace", fontSize: 13, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => (showEditor ? setShowEditor(false) : openEditor())}
                  style={{
                    flexShrink: 0, padding: '0 14px', borderRadius: 12,
                    border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.12)',
                    color: '#c084fc', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {showEditor ? '✕ Close editor' : '✏️ Board editor'}
                </button>
              </div>

              {/* ── Board editor (set up a position by hand) ── */}
              {showEditor && (
                <div className="ga-editor-wrap">
                  <div className="ga-editor-pieces">
                    <PieceSelector selectedPiece={selectedPiece} onSelectPiece={setSelectedPiece} />
                    <div style={{ marginTop: 10 }}>
                      <SetupControls chess={editorChess} onFenChange={setEditorFromFen} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="ga-editor-mini" onClick={() => setEditorFromFen('8/8/8/8/8/8/8/8 w - - 0 1')}>🗑 Clear</button>
                      <button type="button" className="ga-editor-mini" onClick={() => setEditorFromFen(START_FEN)}>♟ Start</button>
                    </div>
                  </div>
                  <div className="ga-editor-board">
                    <EditableBoard
                      chess={editorChess}
                      selectedPiece={selectedPiece}
                      onFenChange={setEditorFromFen}
                      orientation="white"
                      boardWidth={320}
                    />
                    <div style={{ marginTop: 8 }}>
                      <FenBar fen={editorFen} onFenChange={setEditorFromFen} />
                    </div>
                    <div className="ga-input-row ga-analyze-row" style={{ marginTop: 12 }}>
                      <button type="button" className="ga-analyze-btn" onClick={handleEditorAnalyze}>
                        ⚡ Quick Analyze this position →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, margin: '4px 0' }}>— or —</div>
              <textarea
                className="ga-pgn-textarea"
                placeholder={'Paste a PGN here…\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 …'}
                value={quickPgn}
                onChange={e => setQuickPgn(e.target.value)}
                rows={6}
                spellCheck={false}
              />
              <div className="ga-input-row ga-analyze-row" style={{ marginTop: 14, gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ga-analyze-btn"
                  disabled={!quickFen.trim() && !quickPgn.trim()}
                  onClick={handleQuickAnalyze}
                >
                  ⚡ Quick Analyze →
                </button>
                <button
                  type="button"
                  className="ga-analyze-btn"
                  style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' }}
                  disabled={pgnAnalyzing || loading || !quickPgn.trim()}
                  title={!quickPgn.trim() ? 'Paste a PGN to get a detailed report' : undefined}
                  onClick={handleQuickDetailed}
                >
                  {pgnAnalyzing ? 'Starting…' : '📊 Detailed Report →'}
                </button>
              </div>
              {quickError && <div className="ga-error">{quickError}</div>}
              {pgnError && <div className="ga-error">{pgnError}</div>}
            </div>
          ) : (
            <div className="ga-input-row">
              <input
                className="ga-username-input"
                type="text"
                placeholder={isOwnAccount
                  ? `Your ${platform === 'chesscom' ? 'chess.com' : 'lichess'} username`
                  : `Any ${platform === 'chesscom' ? 'chess.com' : 'lichess'} username`}
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={50}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          {platform !== 'otb' && platform !== 'quick' && !(platform === 'chessnexus' && (!user || user.role === 'guest')) && (
            <div className="ga-input-row ga-analyze-row">
              <button
                type="submit"
                className="ga-analyze-btn"
                disabled={loading || (platform !== 'chessnexus' && !username.trim())}
              >
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>
          )}

          {error && <div className="ga-error">{error}</div>}
        </form>
      </div>

      {/* Chess Nexus Coach card removed — no coach commentary anywhere in Analyze My Games. */}

      {/* ── Background-running banner (returned to page while analysis is in progress) ── */}
      {runningInBackground && pollStatus === 'pending' && (
        <div className="ga-bg-running-banner">
          <div className="ga-bg-banner-pulse" />
          <div className="ga-bg-banner-content">
            <span className="ga-bg-banner-icon">🔄</span>
            <div>
              <div className="ga-bg-banner-title">Analysis running in the background</div>
              <div className="ga-bg-banner-sub">
                {progress?.stage || 'Analysing your games with Stockfish…'}
                {progress && ` (${progress.current}/${progress.total})`}
              </div>
            </div>
            <div className="ga-bg-banner-bar-wrap">
              <div
                className="ga-bg-banner-bar-fill"
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Loading / Progress (just-started, user is still on the page) ── */}
      {loading && !runningInBackground && (
        <div className="ga-progress-card">
          <div className="ga-progress-stage">
            {progress?.stage || 'Starting analysis…'}
          </div>
          <div className="ga-progress-bar-bg">
            <div
              className="ga-progress-bar-fill"
              style={{ width: `${Math.max(progressPct, 3)}%` }}
            />
          </div>
          <div className="ga-progress-text">
            {progress
              ? `Game ${progress.current} of ${progress.total} — Chess Nexus analysis in progress`
              : 'Fetching games…'}
          </div>
          <div className="ga-progress-note">
            {isOwnAccount
              ? <span>👋 Analysing 25 games takes 10–15 minutes. <strong>You can freely browse other pages</strong> — the analysis keeps running in the background. Come back here anytime to see your results.</span>
              : <span>🔭 Scout mode analyses 50 games. <strong>You can freely browse other pages</strong> — come back anytime to see the results.</span>}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="ga-results">

          {/* Playstyle */}
          {result.playstyle && (
            <>
              <h3 className="ga-section-title">🧠 Your Playing Style</h3>
              <PlaystyleCard playstyle={result.playstyle} />
            </>
          )}

          {/* Summary row */}
          <div className="ga-summary-row">
            <div className="ga-summary-card">
              <div className="ga-summary-label">Games Analyzed</div>
              <div className="ga-summary-value">{result.gamesAnalyzed}</div>
            </div>
            <div className="ga-summary-card">
              <div className="ga-summary-label">Record</div>
              <div className="ga-summary-value wdl">
                <span className="ga-w">{result.wins}W</span>
                &nbsp;/&nbsp;
                <span className="ga-d">{result.draws}D</span>
                &nbsp;/&nbsp;
                <span className="ga-l">{result.losses}L</span>
              </div>
            </div>
            <div className="ga-summary-card">
              <div className="ga-summary-label">Overall Accuracy</div>
              <div className="ga-summary-value">
                {result.overallAccuracy != null ? `${result.overallAccuracy}%` : '—'}
              </div>
            </div>
            {result.conversionStats && result.conversionStats.hadWinningPosition > 0 && (
              <div className="ga-summary-card">
                <div className="ga-summary-label">Converted Wins</div>
                <div className="ga-summary-value">
                  {result.conversionStats.converted}/{result.conversionStats.hadWinningPosition}
                </div>
                <div className="ga-conversion-note">winning positions</div>
              </div>
            )}
          </div>

          {/* Phase cards */}
          <h3 className="ga-section-title">📊 Game Phase Accuracy</h3>
          <div className="ga-phase-cards">
            <PhaseCard phase="Opening"    data={result.opening}    icon="♟" />
            <PhaseCard phase="Middlegame" data={result.middlegame} icon="⚔" />
            <PhaseCard phase="Endgame"    data={result.endgame}    icon="👑" />
          </div>

          {/* ── New Phase 1+2 sections ── */}
          {result.sessionBadges && result.sessionBadges.length > 0 && (
            <SessionBadges badges={result.sessionBadges} />
          )}

          {result.patterns && result.patterns.length > 0 && (
            <PatternsSection patterns={result.patterns} />
          )}

          {result.peerComparison && (
            <PeerComparisonCard peerComparison={result.peerComparison} />
          )}

          {result.timePressureStats && (
            <TimePressureCard timePressureStats={result.timePressureStats} />
          )}

          {result.pieceHeatmap && (
            <div className="ga-piece-heatmap-section">
              <h3 className="ga-section-title">♟ Piece-Level Mistake Map</h3>
              <p className="ga-section-desc">Which pieces do you blunder with most?</p>
              <PieceHeatmap pieceHeatmap={result.pieceHeatmap} worstPiece={result.worstPiece} />
            </div>
          )}

          {result.endgameStats && result.endgameStats.length > 0 && (
            <div className="ga-endgame-section">
              <h3 className="ga-section-title">👑 Endgame Type Performance</h3>
              <EndgameStats endgameStats={result.endgameStats} />
            </div>
          )}

          {history.length >= 2 && (
            <ProgressHistoryCharts history={history} />
          )}

          {/* Per-Game Breakdown */}
          {result.games && result.games.length > 0 && (
            <>
              <h3 className="ga-section-title">📋 Per-Game Breakdown</h3>
              <p className="ga-section-desc">Click a game to see full move-by-move Chess Nexus analysis.</p>
              <div className="ga-game-btns">
                {result.games.map((g, i) => (
                  <button
                    key={i}
                    className={`ga-game-btn${selectedGameIndex === i ? ' active' : ''}`}
                    onClick={() => setSelectedGameIndex(i)}
                  >
                    Game {g.gameNumber}
                  </button>
                ))}
              </div>
              {selectedGameIndex !== null && result.games[selectedGameIndex] && (
                <GameReplay
                  game={result.games[selectedGameIndex]}
                  totalGames={result.games.length}
                  onClose={() => setSelectedGameIndex(null)}
                  onNext={() => setSelectedGameIndex(prev =>
                    prev < result.games.length - 1 ? prev + 1 : prev
                  )}
                  onPrev={() => setSelectedGameIndex(prev =>
                    prev > 0 ? prev - 1 : prev
                  )}
                />
              )}
            </>
          )}

          {/* Trend Charts */}
          {result.trends && result.trends.accuracyPerGame && result.trends.accuracyPerGame.length > 0 && (
            <>
              <h3 className="ga-section-title">📉 Performance Trends</h3>
              <p className="ga-section-desc">Are you improving across these games?</p>
              <TrendCharts trends={result.trends} />
            </>
          )}

          {/* Tactics */}
          <h3 className="ga-section-title">🎯 Tactics Missed</h3>
          <TacticsBar tacticsStats={result.tacticsStats} />

          {/* Recommendations */}
          <Recommendations result={result} />

          {/* Re-analyze note */}
          <p className="ga-cache-note">
            Results are cached for 24 hours. Click Analyze again after 24 hours to refresh.
          </p>
        </div>
      )}

      <AboutFeatureCTA
        links={[{ label: "About Game Analysis", to: "/analyse-my-chess-game" }]}
      />
    </div>
  );
}