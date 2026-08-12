import React, { useEffect, useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import HomepagePuzzle from "../components/HomepagePuzzle";
import BookDemoModal from "../components/BookDemoModal";
import FoundingSupporterCard from "../components/FoundingSupporterCard";
// Single source of truth for the public SEO pages — reused here so the homepage
// links to every one of them (they were previously unreachable from "/").
import { FEATURES } from "../components/marketing/FeatureLinkGrid";
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
  arena_race:            { icon: '🧩', name: 'Arena Race',            desc: 'Fast-paced puzzle race',        color: 'var(--color-accent-2)' },
  team_race:             { icon: '👥', name: 'Team Race',             desc: 'Race together with your team',  color: 'var(--color-accent)' },
  monthly_focus:         { icon: '🎯', name: 'Monthly Focus',         desc: 'Daily focus tasks all month',   color: 'var(--color-warning)' },
  arena_tournament:      { icon: '🏆', name: 'Arena Tournament',      desc: 'Full competitive tournament',   color: '#ec4899' },
  '3d_arena_tournament': { icon: '🎮', name: '3D Arena Tournament',   desc: 'Live chess in 3D — feel real!', color: 'var(--color-accent-2)', link: 'http://localhost:5174' },
};

// Arena Tournament formats — each shown as its own row under the tournament card.
// activityType (DB) → display config. Order defines render order.
const TOURNAMENT_FORMATS = [
  { type: 'arena_tournament',      icon: '🏆', name: 'Standard',    desc: 'Classic competitive tournament', color: '#ec4899' },
  { type: 'team_tournament',       icon: '🥇', name: 'Team Battle', desc: 'Teams clash for the crown',      color: 'var(--color-warning)' },
  { type: 'chess960',              icon: '🔀', name: 'Chess960',    desc: 'Randomized starting position',   color: 'var(--color-accent)' },
  { type: 'bullet_blitz_marathon', icon: '⚡', name: 'Marathon',    desc: 'Endurance bullet & blitz',       color: 'var(--color-accent-2)' },
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

// ── COACH DEEP-DIVE LINKS ────────────────────────────────────
// The coach-facing marketing pages, in the order they're shown. Pulled FROM the
// FeatureLinkGrid registry (not retyped) so an icon or title change there flows
// here automatically. Order is explicit because the registry's order is tuned
// for the cross-link grid, not for this row.
const COACH_DEEP_SLUGS = [
  "/chess-coaching",
  "/chess-academy-software",
  "/live-chess-classroom",
  "/chess-courses",
  "/chess-progress-reports",
  "/chess-coach-guide",
  "/chess-coach-referral",
  "/chess-coaching-questions",
];
const COACH_DEEP_LINKS = COACH_DEEP_SLUGS
  .map(slug => FEATURES.find(f => f.slug === slug))
  .filter(Boolean);   // a renamed slug drops out rather than rendering a dead link

// ── WHAT'S FREE FOREVER ──────────────────────────────────────
// Mirrors config/coachPlans.js (`free`). This is the single most asked
// question about the product, so it gets its own section rather than a pill.
const FREE_INCLUDES = [
  "Up to 30 students",
  "Unlimited batches",
  "All 7 assignment types",
  "30 courses, 3 lessons each",
  "Class schedule & attendance",
  "Parent progress reports",
  "Fee & payment tracking",
  "Coach ↔ student chat",
  "The live classroom",
  "Premium tools for 90 days",
];

// ── Player feature cards (image + copy) ──────────────────────
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
  const color  = isUp ? 'var(--color-success)' : isDown ? 'var(--color-danger)' : 'var(--color-text-faint)';
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

// ── Hero slider ───────────────────────────────────────────────
// Two auto-rotating slides sharing the same layout so the mobile fix (text + image
// SIDE BY SIDE, like desktop) applies to both. Auto-advances every 6s, pauses on
// hover, supports dots + touch swipe. Slide 1 = Academy, Slide 2 = Live Classroom.
const HERO_SLIDES = ['academy', 'live'];

function HeroSlider({ user, onStartCoach, onBookDemo }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = React.useRef(null);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx(i => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [paused]);

  const go = (i) => setIdx((i + HERO_SLIDES.length) % HERO_SLIDES.length);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  // Identical short labels on BOTH slides so the buttons are the exact same size.
  const primaryLabel = 'Start free';
  const ghostLabel = 'Book demo';

  return (
    <div
      className="hp-glass hp-hero hp-heroslider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* SLIDE 1 — Academy */}
      {idx === 0 && (
        <div className="hp-slide">
          <div className="hp-hero-grid">
            <div className="hp-hero-copy">
              <span className="hp-hero-kicker"><span className="hp-hero-dot" />For chess coaches &amp; academies</span>
              <h1 className="hp-hero-title">Run your entire coaching in <span className="hp-hero-accent">one place.</span></h1>
              <p className="hp-hero-sub">
                Students, assignments, courses, attendance, fees and parent reports — plus a
                <b> live classroom built right in</b>. <b className="hp-hero-lt">Free forever up to 30 students.</b>
              </p>
              <div className="hp-hero-cta">
                <button type="button" className="hp-hero-btn hp-hero-btn-primary" onClick={onStartCoach}>{primaryLabel}</button>
                <button type="button" className="hp-hero-btn hp-hero-btn-ghost" onClick={onBookDemo}>{ghostLabel}</button>
              </div>
              <div className="hp-hero-trust">
                <span className="hp-hero-trust-item">✓ Free forever — up to 30 students</span>
                <span className="hp-hero-trust-dot">•</span>
                <span className="hp-hero-trust-item">No card required</span>
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
            {/* Live Classroom sits mid-bar: it's the headline capability, so it
                reads as part of the workspace rather than an afterthought. */}
            <span className="hp-pill hp-pill-hero">🎥 Live Classroom</span>
            <span className="hp-pill">👥 Batches</span>
            <span className="hp-pill">📅 Schedule</span>
            <span className="hp-pill">🎯 Activities</span>
            <span className="hp-pill">📋 Attendance</span>
          </div>
        </div>
      )}

      {/* SLIDE 2 — Live Classroom */}
      {idx === 1 && (
        <div className="hp-slide">
          <div className="hp-hero-grid">
            <div className="hp-hero-copy">
              <span className="hp-hero-kicker"><span className="hp-hero-dot" style={{ background: 'var(--color-danger)', boxShadow: '0 0 10px 1px rgba(239,68,68,0.85)' }} />Live Classroom · built in</span>
              <h1 className="hp-hero-title">Teach live, <span className="hp-hero-accent">right inside</span> <span className="hp-hero-brandsm">Chess&nbsp;Nexus.</span></h1>
              <p className="hp-hero-sub">
                Teach with <b>HD video, screen-share and one shared board</b> — give a student control, and every attendance mark is written for you as they join. <b className="hp-hero-lt">No Zoom, no extra apps.</b>
              </p>
              <div className="hp-hero-cta">
                <button type="button" className="hp-hero-btn hp-hero-btn-primary" onClick={onStartCoach}>{primaryLabel}</button>
                <button type="button" className="hp-hero-btn hp-hero-btn-ghost" onClick={onBookDemo}>{ghostLabel}</button>
              </div>
              <div className="hp-hero-trust">
                <span className="hp-hero-trust-item">✓ Included on every coach plan</span>
                <span className="hp-hero-trust-dot">•</span>
                <span className="hp-hero-trust-item">Free to start</span>
              </div>
            </div>
            <div className="hp-hero-shot">
              <div className="hp-hero-frame">
                <img src="/features/homepageslide.png" alt="ChessNexus live classroom — coach teaching students with video and a shared board" loading="lazy" />
              </div>
              <div className="hp-hero-badge"><i style={{ background: 'var(--color-danger)', boxShadow: '0 0 8px 1px rgba(239,68,68,0.7)' }} />Live class in session</div>
            </div>
          </div>
          <div className="hp-hero-pilllabel">Everything in one live room</div>
          <div className="hp-hero-pillbar">
            <span className="hp-pill">🎥 HD video</span>
            <span className="hp-pill">🖥️ Screen share</span>
            <span className="hp-pill">♟ Synced board</span>
            <span className="hp-pill">🎯 Give / take control</span>
            <span className="hp-pill">⏳ Waiting room</span>
            <span className="hp-pill">📋 Auto attendance</span>
          </div>
        </div>
      )}

      {/* Dots */}
      <div className="hp-hero-dots">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hp-hero-dotbtn${i === idx ? ' on' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
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
        title="Chess Coaching Platform with a Built-In Live Classroom — Free for 30 Students"
        description="Run your whole chess coaching business in one place: a built-in live classroom (no Zoom), 7 assignment types, a course builder, batches, attendance, fee tracking and parent progress reports. Free forever for up to 30 students — no card, no trial clock. Students get puzzles, endgames, analysis, studies and daily races."
        keywords="chess coaching platform, chess academy software, online chess classroom, teach chess online without zoom, chess coach software free, chess assignments, chess attendance tracking, chess student progress reports, chess course builder, chess fee tracking"
        canonical="/"
      />
      <div className="hp-bg-layer" />

      <Sidebar user={user} />

      <div className="hp-content">

        {/* ── HERO SLIDER — slide 1: Academy · slide 2: Live Classroom ── */}
        <HeroSlider
          user={user}
          onStartCoach={() => navigate((user && user.role !== 'guest') ? '/coach/onboarding' : '/login')}
          onBookDemo={() => setDemoOpen(true)}
        />

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

        {/* ── FOUNDING SUPPORTER — honest early-backer draw (self-hides once spots gone) ── */}
        <div style={{ margin: '4px 0 28px' }}>
          <FoundingSupporterCard />
        </div>

        {/* The "For your students" showcase (6 player-feature cards + its CTA)
            was removed. It described puzzles, analysis, studies and clubs —
            things Chess.com and Lichess already offer, so it argued on their
            ground rather than ours. The homepage now stays on the coach-led
            story. The features themselves still live on /features. */}

        {/* ── FOR COACHES — image + circular-icon feature grid ── */}
        {(() => {
          const goCoach = () => navigate((user && user.role !== 'guest') ? '/coach/onboarding' : '/login');
          // PUBLIC pricing page — never /coach/subscription. That is a coach-only app
          // route, so sending a normal user there dropped them inside the coach area
          // (and now bounces them to onboarding). Pricing should be readable by
          // anyone, logged out included, before they commit to anything.
          const goPricing = () => navigate('/chess-coach-pricing');
          const CoachIcon = ({ d }) => (
            <svg viewBox="0 0 24 24" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          );
          const COACH_FEATS = [
            { d: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 5 18.5V20M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11M19 20v-1.4a3.2 3.2 0 0 0-2.4-3.1M15.5 4.7a3.2 3.2 0 0 1 0 6.1', title: 'Roster, Batches & Fees', desc: 'Unlimited batches, private notes, enrollment & payments' },
            // Video-camera glyph — the classroom is the headline feature, and
            // attendance is now a by-product of it rather than a separate chore.
            { d: 'M15 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3.5ZM15 10.5 21 7v10l-6-3.5', title: 'Built-in classroom', desc: 'Teach live — attendance marks itself as students join' },
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
                  <div className="hp-cshow-trust"><span>✓ Free forever — up to 30 students</span><span>•</span><span>No card required</span></div>
                  <div className="hp-cshow-btns">
                    <button type="button" className="hp-cshow-btn" onClick={goCoach}>
                      {(user && user.role !== 'guest') ? 'Start coaching free →' : 'Log in to start →'}
                    </button>
                    {/* Pricing lives on the coach subscription page, which already
                        splits plans into "With / Without Live Classroom" tabs. */}
                    <button type="button" className="hp-cshow-btn2" onClick={goPricing}>
                      See coach pricing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── FREE FOREVER — the most-asked question, answered in full ── */}
        <div className="hp-glass hp-free">
          <div className="hp-free-head">
            <span className="hp-free-badge">Free forever</span>
            <h2 className="hp-free-title">
              Everything above is <em>free forever</em> for up to 30 students.
            </h2>
            <p className="hp-free-sub">
              Not a 30-day trial. Not a card on file. If you coach 30 students or fewer,
              you can run your entire coaching on Chess Nexus without ever paying us —
              and that includes the live classroom.
            </p>
          </div>

          <ul className="hp-free-list">
            {FREE_INCLUDES.map(f => (
              <li key={f}><span className="hp-free-tick">✓</span>{f}</li>
            ))}
          </ul>

          <p className="hp-free-note">
            Growing past 30 students? Paid plans raise the cap and unlock unlimited live
            classes with bigger rooms. Go over later and nothing is deleted — you simply
            move back to the free limits, with every student, course and record intact.
          </p>

          <div className="hp-free-btns">
            <Link to="/chess-coach-pricing" className="hp-free-btn hp-free-btn-primary">
              See all plans &amp; prices →
            </Link>
            <Link to="/chess-academy-software" className="hp-free-btn hp-free-btn-ghost">
              Running an academy?
            </Link>
          </div>
        </div>

        {/* The "What's inside the live classroom" block (14 feature titles, the
            screenshot and its CTA) was removed from the homepage. The classroom
            is still the headline capability — it is covered by the hero above
            and in full on /live-chess-classroom. */}

        {/* The "Everything a coach gets / The whole coaching workspace" block
            (6 cards + their links) was removed. The same ground is covered by
            the hero and the live-classroom section above, and every card's
            depth link still exists on its own marketing page. */}

        {/* ── ACADEMIES — the multi-coach layer, invisible until now ── */}
        <div className="hp-glass hp-acad">
          <span className="hp-acad-ic">🏫</span>
          <div className="hp-acad-tx">
            <span className="hp-cshow-eyebrow">For academies &amp; institutions</span>
            <h2 className="hp-cshow-title">More than one coach? Run the <em>whole academy.</em></h2>
            <p>
              An academy sits on top of normal coach accounts. Invite your coaches by email
              or a join link, pay for all of them on <b>one central bill</b>, and oversee every
              coach, student and live class from a single dashboard — while still teaching
              your own students from the same login. No coach ever enters a card.
            </p>
            <ul className="hp-acad-list">
              <li>Plans for <b>5, 10 or unlimited coaches</b> — 100 students each</li>
              <li>Unlimited live classes for every coach, plus 10% for paying 3 months up front</li>
              <li>The head coach is still a coach, not locked into admin</li>
              <li>If a plan lapses, nobody is locked out and no data is lost</li>
            </ul>
            <div className="hp-acad-btns">
              <Link to="/chess-academy-software" className="hp-cshow-btn">How academies work →</Link>
              <Link to="/chess-academy-pricing" className="hp-cshow-btn2">Academy pricing</Link>
            </div>
          </div>
        </div>

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

        {/* ── DEEP-DIVE LINKS ──
            Coach pages only, on ONE horizontal line with arrows (same pattern as
            the testimonials scroller below). This section follows the coach
            content, so the player pages (puzzles, races, 3D arena…) don't belong
            here — they're already linked from the player showcase's "See all
            features" and from every marketing page's own cross-link grid. */}
        <div className="hp-deep">
          <h2 className="hp-deep-title">Want more detail on any of it?</h2>
          <div className="hp-deep-wrap">
            <button type="button" className="hp-quotes-arrow" aria-label="Scroll left"
              onClick={() => document.getElementById('hpDeep')?.scrollBy({ left: -320, behavior: 'smooth' })}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="hp-deep-row" id="hpDeep">
              {COACH_DEEP_LINKS.map(f => (
                <Link key={f.slug} to={f.slug} className="hp-deep-link">
                  <span aria-hidden="true">{f.icon}</span>{f.title}
                </Link>
              ))}
            </div>
            <button type="button" className="hp-quotes-arrow next" aria-label="Scroll right"
              onClick={() => document.getElementById('hpDeep')?.scrollBy({ left: 320, behavior: 'smooth' })}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
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