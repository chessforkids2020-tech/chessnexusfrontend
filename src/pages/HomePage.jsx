import React, { useEffect, useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import HomepagePuzzle from "../components/HomepagePuzzle";
import CoffeeCta from "../components/CoffeeCta";
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

// ── "What Chess Nexus Offers" — 6 feature buckets ────────────
// Each bucket groups several real features so a first-time visitor grasps the
// full depth in a few seconds. `ribbon` marks the coaching layer (paid add-on).
const FEATURE_BUCKETS = [
  {
    key: "train",
    icon: "🧩",
    title: "Train",
    tag: "Practice that targets your weaknesses",
    accent: "#06b6d4", accent2: "#22d3ee", glow: "rgba(6,182,212,0.18)",
    border: "rgba(34,211,238,0.42)", chipBg: "rgba(6,182,212,0.09)", chipBd: "rgba(34,211,238,0.24)",
    items: [
      "A puzzle dashboard that finds your weak topics from past solves",
      "Redo the puzzles you got wrong",
      "Daily puzzles from World Champions' blunders",
      "Millions of Lichess-database puzzles",
      "Fun modes: Puzzle Tic-Tac-Toe & Bingo",
      "Monthly Focus — a themed 7-day challenge",
    ],
  },
  {
    key: "analyze",
    icon: "🔬",
    title: "Analyze",
    tag: "Grandmaster-level analysis of your games",
    accent: "#8b5cf6", accent2: "#a78bfa", glow: "rgba(139,92,246,0.18)",
    border: "rgba(167,139,250,0.42)", chipBg: "rgba(139,92,246,0.09)", chipBd: "rgba(167,139,250,0.24)",
    items: [
      "Server-side Stockfish 18 analysis",
      "Import games from Lichess, Chess.com & Chess Nexus",
      "OTB scanner — digitize an over-the-board game",
    ],
    chips: ["Full-game report", "Blunder detection", "Best-move lines"],
  },
  {
    key: "compete",
    icon: "🏆",
    title: "Compete",
    tag: "Live events every day",
    accent: "#f59e0b", accent2: "#fbbf24", glow: "rgba(245,158,11,0.18)",
    border: "rgba(251,191,36,0.42)", chipBg: "rgba(245,158,11,0.09)", chipBd: "rgba(251,191,36,0.24)",
    items: [
      "Arena, Team & Individual races",
      "Arena tournaments — create & play",
      "Play & watch in a live 3D arena",
    ],
    chips: ["Daily arenas", "Team battles", "Live leaderboards"],
  },
  {
    key: "study",
    icon: "📚",
    title: "Study",
    tag: "A full chess library & tools",
    accent: "#10b981", accent2: "#34d399", glow: "rgba(16,185,129,0.18)",
    border: "rgba(52,211,153,0.42)", chipBg: "rgba(16,185,129,0.09)", chipBd: "rgba(52,211,153,0.24)",
    items: [
      "Super-GM hand-picked, categorized endgames",
      "Masters & Super-GM game database",
      "Opening explorer",
      "Create & save your opening lines (with Stockfish 18)",
      "Build studies & share them",
      "Read Nexus books — free",
    ],
  },
  {
    key: "community",
    icon: "👥",
    title: "Play & Community",
    tag: "Play and belong",
    accent: "#ec4899", accent2: "#f472b6", glow: "rgba(236,72,153,0.18)",
    border: "rgba(244,114,182,0.42)", chipBg: "rgba(236,72,153,0.09)", chipBd: "rgba(244,114,182,0.24)",
    items: [
      "Play with friends in private rooms",
      "Clubs — create or join, chat & discuss with members",
    ],
    chips: ["Private rooms", "Club chat", "Members feed"],
  },
  {
    key: "coach",
    icon: "🎓",
    title: "Coach",
    tag: "Run your whole academy",
    accent: "#06b6d4", accent2: "#34d399", glow: "rgba(16,185,129,0.2)",
    border: "rgba(52,211,153,0.45)", chipBg: "rgba(16,185,129,0.09)", chipBd: "rgba(52,211,153,0.24)",
    ribbon: "For Coaches",
    items: [
      "Student roster with ratings & activity",
      "Assign puzzles, studies & tasks in seconds",
      "Track every student's progress & weak spots",
    ],
    note: "The coaching layer — a separate paid toolkit for academies & private coaches.",
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

  useEffect(() => {
    fetchTopPlayers();
    fetchSchedule();
    fetchFocusChampion();
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
        title="Coach-Led Chess Training for Players & Academies"
        description="Train with puzzles, endgames, courses & live team races — or learn from real coaches. Coaches assign lessons, track student progress, and run their academy, all in one free platform."
        keywords="chess coaching, online chess academy, chess training platform, coach-led chess, chess for clubs, endgame training, chess courses, team races, track student progress"
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
          <CoffeeCta variant="pill" style={{ padding: '6px 12px', fontSize: 12 }} />
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

        {/* ── WHAT CHESS NEXUS OFFERS — 6 feature buckets ── */}
        <div className="hp-showcase">
          <div className="hp-showcase-head">
            <span className="hp-showcase-eyebrow"><span className="hp-showcase-dot" />Everything in one place</span>
            <h2 className="hp-showcase-title">One platform. Everything you need to improve at chess.</h2>
            <p className="hp-showcase-sub">Train, analyze, compete, study, and play — plus a full coaching toolkit. Deep enough for a serious academy, simple enough to start in seconds.</p>
            <div className="hp-showcase-trust">
              <span className="hp-showcase-pill hp-showcase-pill-free"><span className="hp-showcase-pill-ic">★</span> 100% free to start</span>
              <span className="hp-showcase-pill"><span className="hp-showcase-pill-ic">✓</span> No ads, ever</span>
              <span className="hp-showcase-pill"><span className="hp-showcase-pill-ic">✓</span> For beginners to advanced</span>
            </div>
          </div>

          <div className="hp-showcase-grid">
            {FEATURE_BUCKETS.map(b => (
              <div
                key={b.key}
                className={`hp-glass hp-bucket${b.ribbon ? ' hp-bucket-coach' : ''}`}
                style={{
                  '--bk-accent': b.accent, '--bk-accent2': b.accent2, '--bk-glow': b.glow,
                  '--bk-border': b.border, '--bk-chip-bg': b.chipBg, '--bk-chip-bd': b.chipBd,
                }}
              >
                {b.ribbon && <span className="hp-bucket-ribbon">{b.ribbon}</span>}
                <div className="hp-bucket-head">
                  <span className="hp-bucket-icon" aria-hidden="true">{b.icon}</span>
                  <div className="hp-bucket-titles">
                    <span className="hp-bucket-title">{b.title}</span>
                    <span className="hp-bucket-tag">{b.tag}</span>
                  </div>
                </div>
                <div className="hp-bucket-divider" />
                <ul className="hp-bucket-list">
                  {b.items.map((it, i) => <li key={i}>{it}</li>)}
                </ul>
                {b.chips && (
                  <>
                    <div className="hp-bucket-divider" />
                    <div className="hp-bucket-chips">
                      {b.chips.map((c, i) => <span key={i} className="hp-bucket-chip">{c}</span>)}
                    </div>
                  </>
                )}
                {b.note && <p className="hp-bucket-note">{b.note}</p>}
              </div>
            ))}
          </div>

          <div className="hp-showcase-cta">
            <Link to={user ? "/puzzles" : "/signup-request"} className="hp-showcase-btn hp-showcase-btn-primary">
              {user ? "Start solving →" : "Start free →"}
            </Link>
            <Link to="/features" className="hp-showcase-btn hp-showcase-btn-ghost">See all features</Link>
          </div>
        </div>

        {/* ── ARE YOU A COACH? — rich promo card ── */}
        {/* Logged-in user → coach onboarding; guest/logged-out → login. */}
        {(() => {
          const goCoach = () => navigate((user && user.role !== 'guest') ? '/coach/onboarding' : '/login');
          // Per-benefit accent colors, as explicit rgba (no color-mix — keep old-browser safe).
          const COACH_BENEFITS = [
            { icon: '🧑‍🎓', title: 'Your students, organized', desc: 'One roster with ratings, activity & attendance at a glance.',
              accent: '#06b6d4', glow: 'rgba(6,182,212,0.30)', bd30: 'rgba(6,182,212,0.30)', bd60: 'rgba(6,182,212,0.60)', chipBg: 'rgba(6,182,212,0.18)', chipBd: 'rgba(6,182,212,0.40)' },
            { icon: '⚡', title: 'Assign in seconds', desc: 'Push puzzles, studies & custom tasks to individuals or the whole group.',
              accent: '#f59e0b', glow: 'rgba(245,158,11,0.30)', bd30: 'rgba(245,158,11,0.30)', bd60: 'rgba(245,158,11,0.60)', chipBg: 'rgba(245,158,11,0.18)', chipBd: 'rgba(245,158,11,0.40)' },
            { icon: '📈', title: 'See real progress', desc: 'Track every student’s growth, streaks and weak spots over time.',
              accent: '#10b981', glow: 'rgba(16,185,129,0.30)', bd30: 'rgba(16,185,129,0.30)', bd60: 'rgba(16,185,129,0.60)', chipBg: 'rgba(16,185,129,0.18)', chipBd: 'rgba(16,185,129,0.40)' },
            { icon: '📊', title: 'Reports parents love', desc: 'Shareable progress reports that make your coaching value obvious.',
              accent: '#a78bfa', glow: 'rgba(167,139,250,0.30)', bd30: 'rgba(167,139,250,0.30)', bd60: 'rgba(167,139,250,0.60)', chipBg: 'rgba(167,139,250,0.18)', chipBd: 'rgba(167,139,250,0.40)' },
          ];
          return (
            <div className="hp-coachpromo">
              <div className="hp-coachpromo-glow hp-coachpromo-glow-1" aria-hidden="true" />
              <div className="hp-coachpromo-glow hp-coachpromo-glow-2" aria-hidden="true" />
              <div className="hp-coachpromo-hero" aria-hidden="true">🎓</div>
              <div className="hp-coachpromo-inner">
                <div className="hp-coachpromo-head">
                  <div className="hp-coachpromo-badges">
                    <span className="hp-coachpromo-eyebrow">🎓 For Coaches</span>
                    <span className="hp-coachpromo-trial-badge">✦ 30-DAY FREE TRIAL</span>
                  </div>
                  <h2 className="hp-coachpromo-title">
                    Run your entire coaching<br />practice in one place
                  </h2>
                  <p className="hp-coachpromo-sub">
                    Manage students, hand out assignments, and track every player’s
                    progress — a complete toolkit built for chess coaches.
                  </p>
                </div>

                <div className="hp-coachpromo-grid">
                  {COACH_BENEFITS.map(b => (
                    <div
                      key={b.title}
                      className="hp-coachpromo-benefit"
                      style={{ '--cp-accent': b.accent, '--cp-glow': b.glow, '--cp-bd30': b.bd30, '--cp-bd60': b.bd60, '--cp-chip-bg': b.chipBg, '--cp-chip-bd': b.chipBd }}
                    >
                      <span className="hp-coachpromo-benefit-icon">{b.icon}</span>
                      <div>
                        <div className="hp-coachpromo-benefit-title">{b.title}</div>
                        <div className="hp-coachpromo-benefit-desc">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hp-coachpromo-foot">
                  <div className="hp-coachpromo-trust">
                    <span>✓ 30-day free trial</span>
                    <span className="hp-coachpromo-trust-dot">•</span>
                    <span>✓ No card required</span>
                    <span className="hp-coachpromo-trust-dot">•</span>
                    <span>✓ Cancel anytime</span>
                  </div>
                  <button type="button" className="hp-coachpromo-btn" onClick={goCoach}>
                    {(user && user.role !== 'guest') ? 'Start your free trial →' : 'Log in to start →'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── COLLABORATE / BECOME ELITE (same card as Members page) ── */}
        <div className="hp-callout">
          <span className="hp-callout-icon">🤝</span>
          <div>
            <h2>Want to collaborate or become an Elite member?</h2>
            <p>
              Interested in coaching on Chess Nexus, hosting tournaments, or
              partnering with us? Reach out — we'd love to work with you and help
              you become an Elite member.
            </p>
            <div className="hp-callout-row">
              <Link to="/contact" className="hp-callout-btn hp-callout-btn-primary">
                Contact us to collaborate
              </Link>
              <Link to="/features" className="hp-callout-btn hp-callout-btn-ghost">
                See all features
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}