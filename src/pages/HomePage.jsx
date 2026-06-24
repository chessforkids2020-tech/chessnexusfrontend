import React, { useEffect, useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import HomepagePuzzle from "../components/HomepagePuzzle";
import CoffeeCta from "../components/CoffeeCta";
import MonthlyFocusLeaderboard from "./monthlyFocus/MonthlyFocusLeaderboard";
import { Link, useNavigate } from "react-router-dom";
import "./HomePage.css";

// ── IST helpers ──────────────────────────────────────────────
const IST_OFFSET_MS = (5 * 60 + 30) * 60000;

function parseIstMs(dateStr, timeValue) {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  const [hh, mm]     = timeValue.split(':').map(Number);
  return Date.UTC(yy, mo - 1, dd, hh, mm) - IST_OFFSET_MS;
}

// Expand recurring items into date strings (same logic as SchedulePage)
function expandItemDates(item) {
  if (!item.isRecurring) return item.dates || [];
  const dates = [];
  const now = Date.now();
  for (let i = -1; i < 14; i++) {  // look 2 weeks out
    const utcMs = now + i * 86400000;
    const dow = new Date(utcMs + IST_OFFSET_MS).getUTCDay(); // IST day-of-week
    const rdArr = item.recurringDays || [];
    if (rdArr.length === 0 || rdArr.includes(dow)) {
      const d = new Date(utcMs + IST_OFFSET_MS);
      dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`);
    }
  }
  return dates;
}

function getNextOccurrence(item) {
  const now        = Date.now();
  const durationMs = (item.durationMinutes || 60) * 60000;
  const sorted     = expandItemDates(item).sort();
  for (const d of sorted) {
    const start = parseIstMs(d, item.timeUTC);
    const end   = start + durationMs;
    if (now >= start && now < end) return { target: end, isLive: true };
  }
  for (const d of sorted) {
    const start = parseIstMs(d, item.timeUTC);
    if (start > now) return { target: start, isLive: false };
  }
  return null;
}

// ── Config ───────────────────────────────────────────────────
const CONTEST_CONFIG = {
  arena_race:            { icon: '🧩', name: 'Arena Race',            desc: 'Fast-paced puzzle race',        color: '#8b5cf6' },
  team_race:             { icon: '👥', name: 'Team Race',             desc: 'Race together with your team',  color: '#06b6d4' },
  monthly_focus:         { icon: '🎯', name: 'Monthly Focus',         desc: 'Daily focus tasks all month',   color: '#f59e0b' },
  arena_tournament:      { icon: '🏆', name: 'Arena Tournament',      desc: 'Full competitive tournament',   color: '#ec4899' },
  '3d_arena_tournament': { icon: '🎮', name: '3D Arena Tournament',   desc: 'Live chess in 3D — feel real!', color: '#a855f7', link: 'http://localhost:5174' },
};

// Arena Tournament formats — each shown as its own row under the tournament card.
// activityType (DB) → display config. Order defines render order.
const TOURNAMENT_FORMATS = [
  { type: 'arena_tournament',      icon: '🏆', name: 'Standard',    desc: 'Classic competitive tournament', color: '#ec4899' },
  { type: 'team_tournament',       icon: '🥇', name: 'Team Battle', desc: 'Teams clash for the crown',      color: '#f59e0b' },
  { type: 'chess960',              icon: '🔀', name: 'Chess960',    desc: 'Randomized starting position',   color: '#06b6d4' },
  { type: 'bullet_blitz_marathon', icon: '⚡', name: 'Marathon',    desc: 'Endurance bullet & blitz',       color: '#a855f7' },
];

const CONTEST_WANTED = ['arena_race', 'team_race', 'monthly_focus', 'arena_tournament', '3d_arena_tournament'];

// Compute the Live Contests rows from raw /api/schedule data. Pass null/[] for
// the empty (loading/failed) state. Pure + synchronous so it can seed initial
// state from a localStorage cache for instant first paint.
function buildContestRows(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return CONTEST_WANTED.map(type => ({ type, item: null, occ: null, items: null, cfg: CONTEST_CONFIG[type] }));
  }
  const rows = [];
  for (const type of CONTEST_WANTED) {
    const candidates = data.filter(i => i.activityType === type);
    if (type === 'arena_tournament') {
      // ONE row: soonest upcoming (or live) tournament across ALL formats.
      let best = null; // { fmt, occ }
      for (const fmt of TOURNAMENT_FORMATS) {
        for (const item of data.filter(i => i.activityType === fmt.type)) {
          const occ = getNextOccurrence(item);
          if (!occ) continue;
          if (!best) { best = { fmt, occ }; continue; }
          if (occ.isLive && !best.occ.isLive) { best = { fmt, occ }; continue; }
          if (occ.isLive === best.occ.isLive && occ.target < best.occ.target) best = { fmt, occ };
        }
      }
      rows.push({ type, items: null, item: null, occ: best?.occ || null, cfg: best?.fmt || CONTEST_CONFIG[type] });
    } else {
      let best = null, bestTarget = Infinity;
      for (const item of candidates) {
        const occ = getNextOccurrence(item);
        if (occ && occ.target < bestTarget) { bestTarget = occ.target; best = { item, occ }; }
      }
      rows.push({ type, items: null, item: best?.item || null, occ: best?.occ || null, cfg: CONTEST_CONFIG[type] });
    }
  }
  return rows;
}

// Synchronously read the cached raw schedule (for instant first paint).
function readCachedContestRows() {
  try {
    const raw = localStorage.getItem('homepageScheduleCache');
    return raw ? buildContestRows(JSON.parse(raw)) : buildContestRows(null);
  } catch {
    return buildContestRows(null);
  }
}

const FEATURES = [
  {
    icon: "🧠",
    label: "AI-Powered Training",
    desc: "Your games are analyzed move-by-move to generate adaptive puzzle paths for your exact weaknesses.",
    tag: "Adaptive",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.16)",
  },
  {
    icon: "🏆",
    label: "Seasonal Puzzle Races",
    desc: "Season-based competitions keep every week fresh with rankings, milestones, and rivalry momentum.",
    tag: "Seasonal",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.16)",
  },
  {
    icon: "📈",
    label: "Skill Progression",
    desc: "Track rating growth, unlock ranks, and clearly see how your tactical decisions improve over time.",
    tag: "Measurable",
    accent: "#10b981",
    glow: "rgba(16,185,129,0.16)",
  },
  {
    icon: "⚔️",
    label: "Competitive Arena",
    desc: "Play high-pressure puzzle battles and prove your calculation speed against serious competitors.",
    tag: "PvP",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.16)",
  },
  {
    icon: "🔥",
    label: "Daily Mastery Streaks",
    desc: "Build consistent habits with streak rewards that turn short daily sessions into long-term mastery.",
    tag: "Consistency",
    accent: "#f97316",
    glow: "rgba(249,115,22,0.16)",
  },
  {
    icon: "🎮",
    label: "3D Arena Tournament",
    desc: "Experience the thrill of live chess tournaments in real time — watch battles unfold on a cinematic 3D board with live standings and crowd energy.",
    tag: "Real-Time",
    accent: "#e879f9",
    glow: "rgba(232,121,249,0.16)",
  },
];

// ── Helpers ──────────────────────────────────────────────────
function getActivePlayers() {
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const x      = Math.sin(bucket + 42) * 10000;
  return Math.floor((x - Math.floor(x)) * 301) + 100;
}

function getArenaTarget() {
  const t = new Date();
  t.setHours(19, 0, 0, 0);
  if (t <= new Date()) t.setDate(t.getDate() + 1);
  return t.getTime();
}

function useCountdownLong(target) {
  const calc = () => {
    const diff = target - Date.now();
    if (diff <= 0) return 'Starting now';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
  };
  const [time, setTime] = useState(calc);
  useEffect(() => { const id = setInterval(() => setTime(calc()), 1000); return () => clearInterval(id); }, [target]);
  return time;
}

function useCountdown(target) {
  const calc = () => {
    const diff = new Date(target) - Date.now();
    if (diff <= 0) return "00:00:00";
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  const [time, setTime] = useState(calc);
  useEffect(() => { const id = setInterval(() => setTime(calc()), 1000); return () => clearInterval(id); }, [target]);
  return time;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

const MEDALS = ['🥇', '🥈', '🥉'];
const ROW_CLASS = ['hp-row-gold', 'hp-row-silver', 'hp-row-bronze'];

// ── Sub-components ────────────────────────────────────────────

function LiveTimer({ target, color, label, inline }) {
  const time = useCountdown(target);
  if (inline) return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label} {time}</span>;
  return (
    <div className="hp-contest-timer">
      <span className="hp-contest-timer-label">{label}</span>
      <span className="hp-contest-timer-val" style={{ color }}>{time}</span>
    </div>
  );
}

function ContestRow({ icon, title, desc, time, isLive, onClick, className = '' }) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`hp-contest-row hp-contest-row-btn${isLive ? ' hp-contest-row-live' : ''}${className ? ' ' + className : ''}`}
      style={clickable ? undefined : { cursor: 'default' }}
    >
      <div className="hp-contest-icon-wrap">{icon}</div>
      <div className="hp-contest-body">
        <div className="hp-contest-name-row">
          <span className="hp-contest-title">{title}</span>
          {isLive && <span className="hp-live-pill">● LIVE</span>}
        </div>
        <div className="hp-contest-desc">{desc}</div>
      </div>
      {time}
      {clickable && (
        <span className="hp-contest-join">{isLive ? 'Join Now' : 'Join'} →</span>
      )}
    </button>
  );
}

function RatingTrend({ delta }) {
  const isUp   = delta > 0;
  const isDown = delta < 0;
  const abs    = Math.abs(delta);
  const color  = isUp ? '#10b981' : isDown ? '#ef4444' : '#6b7280';
  const barH   = Math.min(Math.round(abs / 2), 14);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="40" height="22" viewBox="0 0 40 22">
        <line x1="2" y1="18" x2="38" y2="18" stroke="#1f2937" strokeWidth="1" />
        {isUp && <>
          <rect x="14" y={18 - barH} width="12" height={barH} fill={color} rx="2" opacity="0.85" />
          <polygon points={`20,${18 - barH - 4} 15,${18 - barH} 25,${18 - barH}`} fill={color} opacity="0.9" />
        </>}
        {isDown && <>
          <rect x="14" y="18" width="12" height={barH} fill={color} rx="2" opacity="0.85" />
          <polygon points={`20,${18 + barH + 4} 15,${18 + barH} 25,${18 + barH}`} fill={color} opacity="0.9" />
        </>}
        {!isUp && !isDown && <rect x="10" y="17" width="20" height="2" fill={color} rx="1" opacity="0.5" />}
      </svg>
      <span style={{ fontSize: 12, fontWeight: 800, color, minWidth: 34 }}>
        {isUp ? `+${abs}` : isDown ? `-${abs}` : '—'}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function HomePage() {
  const { user, loading } = useAuth();
  const navigate    = useNavigate();

  const [topPlayers,        setTopPlayers]        = useState([]);
  // Seed from the cached schedule so Live Contests paints instantly, then the
  // background fetch refreshes it. Falls back to empty rows on first ever visit.
  const [contests,          setContests]          = useState(readCachedContestRows);

  const [activePlayers,     setActivePlayers]     = useState(getActivePlayers);
  const [arenaTarget]                             = useState(getArenaTarget);
  const [focusChampion,     setFocusChampion]     = useState(null);
  const [adminFocusId,      setAdminFocusId]      = useState(null);

  useEffect(() => {
    fetchTopPlayers();
    fetchSchedule();
    fetchFocusChampion();
    fetchAdminFocus();
    document.body.classList.add('no-header-padding');
    const interval = setInterval(() => setActivePlayers(getActivePlayers()), 15 * 60 * 1000);
    return () => {
      document.body.classList.remove('no-header-padding');
      clearInterval(interval);
    };
  }, []);

  const fetchTopPlayers = async () => {
    try {
      const r = await api.get('/api/public/leaderboard/manual');
      setTopPlayers(r.data.slice(0, 5));
    } catch {}
  };

  const fetchSchedule = async () => {
    try {
      const { data } = await api.get('/api/schedule');
      try { localStorage.setItem('homepageScheduleCache', JSON.stringify(data)); } catch {}
      setContests(buildContestRows(data));
    } catch {
      setContests(buildContestRows(null));
    }
  };

  const fetchFocusChampion = async () => {
    try {
      const { data } = await api.get('/api/public/monthly-focus/leaderboard');
      if (data.leaderboard && data.leaderboard.length > 0) {
        setFocusChampion(data.leaderboard[0]);
      }
    } catch {}
  };

  const fetchAdminFocus = async () => {
    try {
      const { data } = await api.get('/api/public/monthly-focus/current');
      const all = data.focuses || (data.focus ? [data.focus] : []);
      const adminFocus = all.find(f => f.createdBy?.role === 'admin' || !f.createdBy);
      if (adminFocus) setAdminFocusId(adminFocus._id);
    } catch {}
  };

  const CONTEST_ROUTES = {
    arena_race:       '/arena',
    team_race:        '/team-race',
    monthly_focus:    '/monthly-focus',
    arena_tournament: '/arenatournament',
  };

  const open3DArena = () => {
    if (loading || !user || user.role === 'guest') {
      navigate('/login', { state: { message: 'Please log in to access the 3D Arena.' } });
      return;
    }
    const base = import.meta.env.VITE_3D_ARENA_URL || 'https://3darena.chessnexus.in';
    // Open blank tab synchronously so browsers don't block it as a popup.
    // Do NOT use noopener/noreferrer — they prevent navigating the new tab.
    const newTab = window.open('', '_blank');
    api.get('/api/auth/arena-token')
      .then(res => {
        if (newTab) newTab.location.href = `${base}?token=${encodeURIComponent(res.data.token)}`;
      })
      .catch(() => {
        const token = localStorage.getItem('authToken');
        if (newTab) newTab.location.href = token ? `${base}?token=${encodeURIComponent(token)}` : base;
      });
  };

  const displayName = user?.displayName || user?.username || "Player";

  return (
    <div className="hp-root">
      <SEO
        title="Free Online Chess Puzzles, Tactics & Live Races"
        description="Chess Nexus is a free chess platform to solve daily puzzles, compete in live arena races, practice tactics, and climb the global leaderboard. Join 1000+ players."
        keywords="chess nexus, chess puzzles online, chess tactics, chess arena race, free chess platform, improve chess rating, daily chess puzzles"
        canonical="/"
      />
      <div className="hp-bg-layer" />

      <Sidebar user={user} />

      <div className="hp-content">

        {/* ── HEADER ── */}
        <div className="hp-glass hp-header">
          <div>
            <h1 className="hp-greeting">{getGreeting()}, {displayName}! 👋</h1>
            <p className="hp-subgreeting">Keep solving, keep improving.</p>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {focusChampion && (
              <div className="hp-champion-badge">
                <span className="hp-champion-crown">👑</span>
                <div className="hp-champion-info">
                  <span className="hp-champion-label">Champion of the Month</span>
                  <span className="hp-champion-name">{focusChampion.displayName || focusChampion.username}</span>
                </div>
              </div>
            )}
          </div>
          {/* CoffeeCta temporarily hidden — Razorpay verification in progress (re-enable ~June 2, 2026) */}
          {/* <CoffeeCta variant="pill" style={{ padding: '6px 12px', fontSize: 12 }} /> */}
        </div>

        {/* ── TOP ROW: Puzzle + Right Column ── */}
        <div className="hp-top-row">

          {/* Puzzle of the Day */}
          <div className="hp-glass hp-potd">
            <div className="hp-potd-header">
              <div className="hp-section-label">
                <span className="hp-section-label-bar" />
                 Try a Puzzle Now — No Signup Required
              </div>

            </div>
            <div className="hp-potd-board">
              <HomepagePuzzle />
            </div>
            <p className="hp-potd-tagline">Get a feel of Chess Nexus. Track your progress after sign up!</p>
          </div>

          {/* Right Column */}
          <div className="hp-right-col">

            {/* ── LIVE CONTESTS ── */}
            <div className="hp-glass hp-contests">
              <div className="hp-section-label">
                <span className="hp-section-label-bar" />
                🔥 Live Contests
              </div>
              {contests.map(({ occ, cfg, type }, i) => (
                <React.Fragment key={type}>
                  {i > 0 && <div className="hp-contest-divider" />}
                  <ContestRow
                    className={type === 'arena_tournament' ? 'hp-contest-row-lg' : ''}
                    icon={cfg.icon}
                    title={cfg.name}
                    desc={cfg.desc}
                    isLive={occ?.isLive || false}
                    time={
                      occ
                        ? <LiveTimer target={occ.target} color={cfg.color} label={occ.isLive ? 'Ends in' : 'Starts in'} />
                        : <span className="hp-contest-ended">No schedule</span>
                    }
                    onClick={
                      !occ
                        ? undefined
                        : type === '3d_arena_tournament'
                          ? open3DArena
                          : CONTEST_ROUTES[type] ? () => navigate(CONTEST_ROUTES[type]) : undefined
                    }
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="hp-stats-bar">
          <div className="hp-stat-item">
            <span className="hp-stat-icon">🧑‍🤝‍🧑</span>
            <div className="hp-stat-text">
              <span className="hp-stat-value">{activePlayers}</span>
              <span className="hp-stat-label">Active Players</span>
            </div>
          </div>
          <div className="hp-stat-divider" />
          <div className="hp-stat-item">
            <span className="hp-stat-icon">🧩</span>
            <div className="hp-stat-text">
              <span className="hp-stat-value">1K+</span>
              <span className="hp-stat-label">Puzzles Solved</span>
            </div>
          </div>
          <div className="hp-stat-divider" />
          <div className="hp-stat-item">
            <span className="hp-stat-icon">🏆</span>
            <div className="hp-stat-text">
              <span className="hp-stat-value">50+</span>
              <span className="hp-stat-label">Tournaments Held</span>
            </div>
          </div>
          <div className="hp-stat-divider" />
          <div className="hp-stat-item">
            <span className="hp-stat-icon">⚡</span>
            <div className="hp-stat-text">
              <span className="hp-stat-value">24/7</span>
              <span className="hp-stat-label">Live Events</span>
            </div>
          </div>
        </div>

        {/* ── CHESS TRAINING LAB PROMO ── */}
        <div className="hp-glass hp-lab1-section">
          <div className="hp-lab1-img-col">
            <img src="/lab1.png" alt="Chess Training Lab" className="hp-lab1-img" />
          </div>
          <div className="hp-lab1-text-col">
            <div className="hp-lab1-badges">
              <span className="hp-lab1-eyebrow">Lab 01</span>
              <span className="hp-lab1-free-badge">FREE CORE PLATFORM</span>
            </div>
            <h2 className="hp-lab1-title">Chess Training Lab</h2>
            <table className="hp-lab1-table">
              <tbody>
                <tr className="hp-lab1-row">
                  <td className="hp-lab1-icon-cell">🏆</td>
                  <td className="hp-lab1-text-cell">Daily Arena tournaments</td>
                </tr>
                <tr className="hp-lab1-row">
                  <td className="hp-lab1-icon-cell">🧩</td>
                  <td className="hp-lab1-text-cell">Daily tactical puzzles</td>
                </tr>
                <tr className="hp-lab1-row">
                  <td className="hp-lab1-icon-cell">🔥</td>
                  <td className="hp-lab1-text-cell">Weekly contests &amp; challenges</td>
                </tr>
                <tr className="hp-lab1-row">
                  <td className="hp-lab1-icon-cell">📈</td>
                  <td className="hp-lab1-text-cell">Track rating and progress</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── LAB 02 ── */}
        <div className="hp-glass hp-lab2-section">
          <div className="hp-lab2-text-col">
            <div className="hp-lab2-badges">
              <span className="hp-lab2-eyebrow">Lab 02</span>
              <span className="hp-lab2-exp-badge">3D EXPERIENCE</span>
            </div>
            <h2 className="hp-lab2-title">PREMIUM 3D EXPERIENCE</h2>
            <p className="hp-lab2-subtitle">Play and watch games in a shared live chess space.</p>
            <table className="hp-lab2-table">
              <tbody>
                <tr className="hp-lab2-row">
                  <td className="hp-lab2-icon-cell">🏙️</td>
                  <td className="hp-lab2-text-cell">Live tournament atmosphere</td>
                </tr>
                <tr className="hp-lab2-row">
                  <td className="hp-lab2-icon-cell">🤝</td>
                  <td className="hp-lab2-text-cell">Play with friends in real time</td>
                </tr>
                <tr className="hp-lab2-row">
                  <td className="hp-lab2-icon-cell">♜</td>
                  <td className="hp-lab2-text-cell">Follow games together live</td>
                </tr>
              </tbody>
            </table>
            <p className="hp-lab2-tagline">Built for interactive and social chess experiences.</p>
          </div>
          <div className="hp-lab2-img-col">
            <img src="/lab2.png" alt="3D Chess Arena" className="hp-lab2-img" />
          </div>
        </div>

        {/* ── WHY CHESS NEXUS ── */}
        <div className="hp-features-section">
          <div className="hp-features-heading">
            <span className="hp-features-eyebrow">WHY PLAY HERE</span>
            <h2 className="hp-features-title">Why Chess Nexus?</h2>
            <p className="hp-features-subtitle">Everything you need to master chess, compete harder, and improve faster.</p>
            <Link to="/features" className="hp-lb-view-btn" style={{ marginTop: 12, display: 'inline-block' }}>Explore all features →</Link>
          </div>
          <div className="hp-features-row">
            {FEATURES.map(f => (
              <div
                key={f.label}
                className="hp-feature-item"
                style={{ '--feat-accent': f.accent, '--feat-glow': f.glow }}
              >
                <div className="hp-feature-top">
                  <div className="hp-feature-icon-wrap">
                    <span className="hp-feature-icon">{f.icon}</span>
                  </div>
                  <span className="hp-feature-tag">{f.tag}</span>
                </div>
                <div className="hp-feature-text">
                  <span className="hp-feature-label">{f.label}</span>
                  <span className="hp-feature-desc">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hp-features-trust">
            <div className="hp-features-trust-item">
              <span className="hp-features-trust-value">100% Free</span>
              <span className="hp-features-trust-label">core features</span>
            </div>
            <div className="hp-features-trust-divider" />
            <div className="hp-features-trust-item">
              <span className="hp-features-trust-value">Safe &amp; Secure</span>
              <span className="hp-features-trust-label">your data is protected</span>
            </div>
            <div className="hp-features-trust-divider" />
            <div className="hp-features-trust-item">
              <span className="hp-features-trust-value">Global Community</span>
              <span className="hp-features-trust-label">players from 10+ countries</span>
            </div>
          </div>
        </div>

        {/* ── LEADERBOARD ── */}
        <div className="hp-glass hp-leaderboard">
          <div className="hp-lb-topbar">
            <div className="hp-lb-heading-row">
              <h3 className="hp-lb-title">🏆 ChessNexus Monthly Focus — Top Players</h3>
            </div>
          </div>

          <div className="hp-lb-table-wrap">
            <MonthlyFocusLeaderboard compact limit={5} focusId={adminFocusId} />
          </div>
          <div className="hp-lb-footer">
            <Link to="/monthly-focus/leaderboard" className="hp-lb-view-btn">View Leaderboard →</Link>
          </div>
        </div>

        {/* ── CTA FOOTER ── */}
        <div className="hp-glass hp-cta">
          <div className="hp-cta-glow" />
          <span className="hp-cta-chess">♟</span>
          <div className="hp-cta-text">
            <h2 className="hp-cta-heading">Ready to Level Up Your Chess?</h2>
            <p className="hp-cta-sub">Join Chess Nexus today and become part of a growing community of chess players and learners.</p>
          </div>
          <Link to={user ? "/puzzles" : "/login"} className="hp-cta-btn">
            {user ? "Start Playing Now →" : "Login to Play →"}
          </Link>
        </div>

      </div>
    </div>
  );
}