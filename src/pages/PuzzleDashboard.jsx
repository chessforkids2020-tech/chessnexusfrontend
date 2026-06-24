import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Chessboard from '../components/Chessboard';
import './PuzzleDashboard.css';

// ── Small SVG donut (solved vs failed) ───────────────────────────────────────
function Donut({ solved, failed, size = 64 }) {
  const total = solved + failed;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const solvedFrac = total ? solved / total : 0;
  const solvedLen = c * solvedFrac;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ef4444" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22c55e" strokeWidth="6"
        strokeDasharray={`${solvedLen} ${c - solvedLen}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="round"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
            fontSize={size * 0.26} fontWeight="800" fill="#fff">
        {total ? Math.round(solvedFrac * 100) : 0}%
      </text>
    </svg>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d !== 1 ? 's' : ''} ago`;
}

// ── Mini chessboard — uses the app's real board (themed, piece graphics).
//    Sizes itself to its container so it stays responsive on tablet/mobile. ──
function MiniBoard({ fen }) {
  const ref = useRef(null);
  const [size, setSize] = useState(140);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w > 0) setSize(Math.floor(w));
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  // Orientation: show the side to move at the bottom, like the puzzle solver.
  const orientation = (fen || '').split(' ')[1] === 'b' ? 'black' : 'white';
  return (
    <div ref={ref} className="pd-hist-board">
      <Chessboard
        position={fen || 'start'}
        orientation={orientation}
        boardWidth={size}
        draggable={false}
        showCoordinates={false}
        mute
      />
    </div>
  );
}

export default function PuzzleDashboard() {
  const navigate = useNavigate();
  // When viewing from a public profile (/player/:displayName/puzzle-dashboard)
  // this is the viewed user; spectator mode hides the redo controls.
  const { displayName } = useParams();
  const isSpectator = !!displayName;

  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = isSpectator
        ? `/api/public/profile/${encodeURIComponent(displayName)}/puzzle-dashboard?range=${range}`
        : `/api/public/puzzle-dashboard?range=${range}`;
      const res = await api.get(url);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, isSpectator, displayName]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary || {};
  const SUMMARY = [
    { icon: '🏆', label: 'Puzzle Rating',  value: s.rating ?? '—',                 color: '#f59e0b' },
    { icon: '🧩', label: 'Solved',         value: s.solved ?? 0,                    color: '#22c55e' },
    { icon: '❌', label: 'Failed',         value: s.failed ?? 0,                    color: '#ef4444' },
    { icon: '🎯', label: 'Accuracy',       value: `${s.accuracy ?? 0}%`,            color: '#06b6d4' },
    { icon: '🔥', label: 'Current Streak', value: s.streak ?? 0,                    color: '#a855f7' },
  ];

  const redoAll = () => {
    const ids = data?.failedPuzzleIds || [];
    if (!ids.length) return;
    sessionStorage.setItem('redoPuzzleIds', JSON.stringify(ids));
    navigate('/training/healthy-mix?redo=1');
  };

  const redoOne = (puzzleId) => {
    sessionStorage.setItem('redoPuzzleIds', JSON.stringify([puzzleId]));
    navigate('/training/healthy-mix?redo=1');
  };

  return (
    <div className="pd-page">
      {/* ── Top summary ── */}
      <div className="pd-card">
        <div className="pd-head-row">
          <h2 className="pd-h2">📊 {isSpectator ? `${displayName}'s Puzzle Stats` : 'Your Puzzle Stats'}</h2>
          <div className="pd-toggle">
            {['24h', '7d'].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`pd-toggle-btn${range === r ? ' active' : ''}`}>
                {r === '24h' ? '24 hrs' : 'Last 7 days'}
              </button>
            ))}
          </div>
        </div>
        <div className="pd-summary-grid">
          {SUMMARY.map(item => (
            <div key={item.label} className="pd-summary-item">
              <div style={{ fontSize: 26 }}>{item.icon}</div>
              <div className="pd-summary-value" style={{ color: item.color }}>{loading ? '…' : item.value}</div>
              <div className="pd-summary-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Needs improvement (weak topics) ── */}
      <div className="pd-card">
        <div className="pd-head-row">
          <h3 className="pd-h3">⚠️ Topics that need improvement</h3>
          {!isSpectator && (data?.failedPuzzleIds?.length > 0) && (
            <button onClick={redoAll} className="pd-redo-all-btn">
              🔁 Redo all mistakes ({data.failedPuzzleIds.length})
            </button>
          )}
        </div>
        {loading ? (
          <p className="pd-muted">Loading…</p>
        ) : data?.weakTopics?.length ? (
          <div className="pd-weak-grid">
            {data.weakTopics.map(t => (
              <div key={t.theme} className="pd-weak-item">
                <Donut solved={t.solved} failed={t.failed} />
                <div>
                  <div className="pd-weak-title">{isSpectator ? <><b>{t.label}</b> needs improvement</> : <>Your <b>{t.label}</b> needs improvement</>}</div>
                  <div className="pd-weak-sub">
                    <span style={{ color: '#22c55e' }}>✓ {t.solved} solved</span>
                    {'  ·  '}
                    <span style={{ color: '#ef4444' }}>✗ {t.failed} failed</span>
                    {'  ·  '}{t.attempts} total
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pd-muted">No weak topics yet — keep solving to surface patterns.</p>
        )}
      </div>

      {/* ── Strengths ── */}
      <div className="pd-card">
        <h3 className="pd-h3">💪 {isSpectator ? 'Good at these topics' : 'You are good at these topics'}</h3>
        {loading ? (
          <p className="pd-muted">Loading…</p>
        ) : data?.strongTopics?.length ? (
          <div className="pd-strong-grid">
            {data.strongTopics.map(t => (
              <div key={t.theme} className="pd-strong-item">
                <span className="pd-strong-name">{t.label}</span>
                <span className="pd-strong-right">
                  <span className="pd-strong-count">{t.solved}/{t.attempts}</span>
                  <span className="pd-strong-pct">{t.accuracy}%</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="pd-muted">No topics above 80% yet — your strengths will show here.</p>
        )}
      </div>

      {/* ── History ── */}
      <div className="pd-card">
        <h3 className="pd-h3">🕑 Recent puzzles</h3>
        {loading ? (
          <p className="pd-muted">Loading…</p>
        ) : data?.history?.length ? (
          <div className="pd-hist-grid">
            {data.history.map((h, i) => (
              <div key={i} className="pd-hist-card">
                <MiniBoard fen={h.fen} />
                <div className="pd-hist-theme">
                  {h.correct ? '✅' : '❌'} {h.themeLabel}
                </div>
                <div className="pd-hist-meta">{timeAgo(h.when)} · {h.rating}</div>
                {!isSpectator && <button onClick={() => redoOne(h.puzzleId)} className="pd-redo-btn">Redo</button>}
              </div>
            ))}
          </div>
        ) : (
          <p className="pd-muted">No puzzle history in this window.</p>
        )}
      </div>
    </div>
  );
}
