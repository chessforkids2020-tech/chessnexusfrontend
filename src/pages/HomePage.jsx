import React, { useEffect, useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import HomepagePuzzle from "../components/HomepagePuzzle";
import BookDemoModal from "../components/BookDemoModal";
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

// ── Player feature cards (image + copy) ──────────────────────
const PLAYER_FEATURES = [
  { img: '/features/puzzleshub.png',     title: 'Puzzle Dashboard', desc: 'Tracks every theme a player solves and surfaces their <b>strong and weak tactics</b> — so training targets exactly what needs work.' },
  { img: '/features/improveatchess.png', title: 'Nexus Guide',      desc: "Scans a player's games to <b>pinpoint recurring weaknesses</b> and tells them what to practise next — a personal coach in the background." },
  { img: '/features/analysis.png',       title: 'Deep Analysis',    desc: 'Server-side <b>Stockfish 18</b> reviews every game and returns <b>clear, plain-language insights</b> — blunders, turning points and better plans.' },
  { img: '/features/study.png',          title: 'Studies',          desc: "A library of <b>endgame studies, master games</b> and Nexus's own curated studies — structured lessons players can work through anytime." },
  { img: '/features/3darena.png',        title: '3D Arena',         desc: 'An <b>immersive 3D board</b> that makes online play feel real — perfect for keeping younger players engaged and having fun.' },
  { img: '/features/clubs.png',          title: 'Social Club',      desc: 'Clubs, friends and chat in a <b>safe, moderated space</b> — students compete, discuss games and belong to a community.' },
];

// Placeholder testimonials shown until an admin features real ones on the
// homepage (Admin → Testimonials → ★ Feature on homepage).
const FALLBACK_TESTIMONIALS = [
  { av: 'CA', cls: '',  text: "The daily puzzles are my favourite part. I do a few every morning and I've slowly stopped hanging pieces.", name: 'chess_arjun', sub: 'Rating 1412' },
  { av: 'PP', cls: 'v', text: "I love the tactics races with my friends after class. It doesn't even feel like practice.", name: 'puzzle_priya', sub: 'Rating 1388' },
  { av: 'KK', cls: 'w', text: "The game analysis actually tells me what went wrong in plain words. It's like a coach is sitting with me.", name: 'knight_kai', sub: 'Rating 1465' },
  { av: 'RR', cls: '',  text: "I used to get stuck in endgames. The endgame studies here fixed that for me.", name: 'rook_rhea', sub: 'Rating 1430' },
  { av: 'BB', cls: 'v', text: "Everything is in one place — puzzles, play, studies. I don't jump between apps anymore.", name: 'bishop_ben', sub: 'Rating 1451' },
];

// Initials for a testimonial avatar. Rotates the accent color by index.
const QUOTE_AV_CLASSES = ['', 'v', 'w'];
function testimonialInitials(name) {
  if (!name) return '★';
  const parts = String(name).replace(/[_-]+/g, ' ').trim().split(/\s+/).slice(0, 2);
  return parts.map(w => w[0]?.toUpperCase() || '').join('') || '★';
}

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
    <div
      className={`hp-contest-row${isLive ? ' hp-contest-row-live' : ''}${clickable ? ' hp-contest-row-active' : ''}${className ? ' ' + className : ''}`}
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
        <button type="button" className="hp-contest-join" onClick={onClick}>
          {isLive ? 'Join Now' : 'Join'} →
        </button>
      )}
    </div>
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
  const [demoOpen,          setDemoOpen]          = useState(false);
  // Admin-featured testimonials (null = still loading → use fallback).
  const [featuredQuotes,    setFeaturedQuotes]    = useState(null);

  useEffect(() => {
    fetchTopPlayers();
    fetchSchedule();
    api.get('/api/testimonials/featured')
      .then(r => setFeaturedQuotes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setFeaturedQuotes([]));
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

  // Show admin-featured testimonials if any exist; otherwise the placeholders.
  const quotes = (featuredQuotes && featuredQuotes.length > 0)
    ? featuredQuotes.map((t, i) => ({
        av: testimonialInitials(t.displayName || t.username),
        cls: QUOTE_AV_CLASSES[i % QUOTE_AV_CLASSES.length],
        text: t.text,
        name: t.displayName || t.username || 'Player',
        sub: `★ ${t.rating}/5`,
        raw: true, // plain text (not HTML)
      }))
    : FALLBACK_TESTIMONIALS;

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

        {/* ── COACH HERO (image + workspace pill bar) ── */}
        <div className="hp-glass hp-hero">
          <div className="hp-hero-grid">
            <div className="hp-hero-copy">
              <span className="hp-hero-kicker"><span className="hp-hero-dot" />For chess coaches &amp; academies</span>
              <h1 className="hp-hero-title">Run your entire coaching in <span className="hp-hero-accent">one place.</span></h1>
              <p className="hp-hero-sub">
                <b>Start for free</b> — board your coach account and manage students, assignments and progress, all in one place.
              </p>
              <div className="hp-hero-cta">
                <button type="button" className="hp-hero-btn hp-hero-btn-primary" onClick={() => navigate((user && user.role !== 'guest') ? '/coach/onboarding' : '/login')}>Start free</button>
                <button type="button" className="hp-hero-btn hp-hero-btn-ghost" onClick={() => setDemoOpen(true)}>Book free demo</button>
              </div>
            </div>
            <div className="hp-hero-shot">
              <div className="hp-hero-frame">
                <img src="/Screenshot 2026-07-11 142338.png" alt="ChessNexus coach dashboard with students, assignments and activity charts" loading="eager" />
              </div>
              <div className="hp-hero-badge"><i />Live coach dashboard</div>
            </div>
          </div>

          <div className="hp-hero-pilllabel">Your coach workspace</div>
          <div className="hp-hero-pillbar">
            <span className="hp-pill">🏠 Dashboard</span>
            <span className="hp-pill">📝 Assignments</span>
            <span className="hp-pill">📚 Courses</span>
            <span className="hp-pill">📖 Library</span>
            <span className="hp-pill">👥 Batches</span>
            <span className="hp-pill">📅 Schedule</span>
            <span className="hp-pill">🎯 Activities</span>
            <span className="hp-pill">📋 Attendance</span>
          </div>
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
              <span className="hp-stat-value">5K+</span>
              <span className="hp-stat-label">Puzzles Solved</span>
            </div>
          </div>
          <div className="hp-stat-divider" />
          <div className="hp-stat-item">
            <span className="hp-stat-icon">🏆</span>
            <div className="hp-stat-text">
              <span className="hp-stat-value">300+</span>
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
            <span className="hp-showcase-eyebrow"><span className="hp-showcase-dot" />For your students</span>
            <h2 className="hp-showcase-title">Everything your players get, included.</h2>
            <p className="hp-showcase-sub">One login opens the full Chess Nexus experience — the tools that actually make players stronger.</p>
            <div className="hp-showcase-trust">
              <span className="hp-showcase-pill hp-showcase-pill-free"><span className="hp-showcase-pill-ic">★</span> 100% free to start</span>
              <span className="hp-showcase-pill"><span className="hp-showcase-pill-ic">✓</span> No ads, ever</span>
              <span className="hp-showcase-pill"><span className="hp-showcase-pill-ic">✓</span> For beginners to advanced</span>
            </div>
          </div>

          <div className="hp-featgrid">
            {PLAYER_FEATURES.map(f => (
              <article key={f.title} className="hp-glass hp-feat">
                <div className="hp-feat-img"><img src={f.img} alt="" loading="lazy" /></div>
                <div className="hp-feat-tx">
                  <h3>{f.title}</h3>
                  <p dangerouslySetInnerHTML={{ __html: f.desc }} />
                </div>
              </article>
            ))}
          </div>

          <div className="hp-showcase-cta">
            <Link to={user ? "/puzzles" : "/signup-request"} className="hp-showcase-btn hp-showcase-btn-primary">
              {user ? "Start solving →" : "Start free →"}
            </Link>
            <Link to="/features" className="hp-showcase-btn hp-showcase-btn-ghost">See all features</Link>
          </div>
        </div>

        {/* ── FOR COACHES — image + circular-icon feature grid ── */}
        {(() => {
          const goCoach = () => navigate((user && user.role !== 'guest') ? '/coach/onboarding' : '/login');
          const CoachIcon = ({ d }) => (
            <svg viewBox="0 0 24 24" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          );
          const COACH_FEATS = [
            { d: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 5 18.5V20M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11M19 20v-1.4a3.2 3.2 0 0 0-2.4-3.1M15.5 4.7a3.2 3.2 0 0 1 0 6.1', title: 'Roster & Batches', desc: 'Unlimited groups, private notes, students online' },
            { d: 'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 13l2 2 4-4', title: 'Attendance & Fees', desc: 'Mark in a tap, request payments, CSV export' },
            { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20', title: 'Assignments & Courses', desc: '7 types: templates, studies & master games' },
            { d: 'M14 3v4a1 1 0 0 0 1 1h4M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-4-5ZM9 13h6M9 17h4', title: 'Parent Reports', desc: 'One shareable progress link per student' },
          ];
          return (
            <div className="hp-glass hp-cshow">
              <div className="hp-cshow-img">
                <img src="/features/homecoach.png" alt="ChessNexus coach workspace on laptop and tablet with a class notebook" loading="lazy" />
              </div>
              <div className="hp-cshow-tx">
                <span className="hp-cshow-eyebrow">For coaches</span>
                <h2 className="hp-cshow-title">Built for how you <em>actually</em> coach.</h2>
                <p className="hp-cshow-sub">Everything you juggle across five apps and a spreadsheet — unified in one workspace built for chess coaches.</p>
                <div className="hp-cshow-grid">
                  {COACH_FEATS.map(f => (
                    <div key={f.title} className="hp-cshow-item">
                      <span className="hp-cshow-ic"><CoachIcon d={f.d} /></span>
                      <div><h3>{f.title}</h3><p>{f.desc}</p></div>
                    </div>
                  ))}
                </div>
                <div className="hp-cshow-foot">
                  <div className="hp-cshow-trust"><span>✓ Free — up to 30 students</span><span>•</span><span>No card required</span></div>
                  <button type="button" className="hp-cshow-btn" onClick={goCoach}>
                    {(user && user.role !== 'guest') ? 'Start coaching free →' : 'Log in to start →'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── HOW IT WORKS — illustrated flow ── */}
        <div className="hp-glass hp-howit">
          <div className="hp-howit-head">
            <span className="hp-cshow-eyebrow">Up and running in minutes</span>
            <h2 className="hp-cshow-title">How it <em>works.</em></h2>
          </div>
          <div className="hp-flow">
            <div className="hp-flow-line" aria-hidden="true" />
            <div className="hp-flow-step">
              <span className="hp-flow-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a7 7 0 0 1 12-4.9M17 14v6M20 17h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              <div><div className="hp-flow-n"><i>1</i><b>Create your free account</b></div><p>Board your coach account in under a minute — no card required.</p></div>
            </div>
            <span className="hp-flow-arrow" aria-hidden="true">→</span>
            <div className="hp-flow-step">
              <span className="hp-flow-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 5 18.5V20M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11M19 20v-1.4a3.2 3.2 0 0 0-2.4-3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              <div><div className="hp-flow-n"><i>2</i><b>Add students &amp; batches</b></div><p>Invite players, group them, set your schedule and fees.</p></div>
            </div>
            <span className="hp-flow-arrow" aria-hidden="true">→</span>
            <div className="hp-flow-step">
              <span className="hp-flow-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1ZM9 13l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              <div><div className="hp-flow-n"><i>3</i><b>Assign, track &amp; report</b></div><p>Push homework, mark attendance, share parent reports.</p></div>
            </div>
          </div>
        </div>

        {/* ── PLAYER TESTIMONIALS ── */}
        <div className="hp-showcase-head" style={{ marginBottom: 20 }}>
          <span className="hp-showcase-eyebrow"><span className="hp-showcase-dot" />Loved by players</span>
          <h2 className="hp-showcase-title">What our players say.</h2>
        </div>
        <div className="hp-quotes-wrap">
          <button type="button" className="hp-quotes-arrow" aria-label="Scroll left"
            onClick={() => document.getElementById('hpQuotes')?.scrollBy({ left: -340, behavior: 'smooth' })}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="hp-quotes" id="hpQuotes">
            {quotes.map((q, i) => (
              <figure key={q.name + i} className="hp-glass hp-quote">
                <div className="hp-quote-stars">★★★★★</div>
                {q.raw
                  ? <blockquote>{q.text}</blockquote>
                  : <blockquote dangerouslySetInnerHTML={{ __html: q.text }} />}
                <figcaption className="hp-quote-who">
                  <span className={`hp-quote-av ${q.cls}`}>{q.av}</span>
                  <span className="hp-quote-nm"><span className="n">{q.name}</span><span className="s">{q.sub}</span></span>
                </figcaption>
              </figure>
            ))}
          </div>
          <button type="button" className="hp-quotes-arrow next" aria-label="Scroll right"
            onClick={() => document.getElementById('hpQuotes')?.scrollBy({ left: 340, behavior: 'smooth' })}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

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

      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}