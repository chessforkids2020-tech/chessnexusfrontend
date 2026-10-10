// src/components/dashboard/AliveParts.jsx
//
// The building blocks of the "Alive" dashboard (UserDashboard.jsx). Each one is
// a presentational card fed with data the page already loads — none of them
// invent numbers: where the API has no figure (e.g. a history for game ratings)
// the card simply leaves that detail out.
//
// Motion is CSS-driven (see AliveDashboard.css) and every animation is switched
// off under prefers-reduced-motion. The only JS animation is the count-up.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { questTasks } from "./aliveQuest";
import './AliveDashboard.css';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// Counts from 0 up to `target` once, easing out. Re-runs only when the target
// changes, so a refetch that lands on the same number does not replay it.
function useCountUp(target, duration = 1300, delay = 300) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const to = Number(target) || 0;
    if (reducedMotion() || to === 0) { setVal(to); return undefined; }
    let raf;
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const x = Math.max(0, Math.min(1, (t - t0 - delay) / duration));
      setVal(Math.round(to * (1 - Math.pow(1 - x, 3))));
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return val;
}

function CountUp({ value, delay }) {
  const v = useCountUp(value, 1300, delay);
  return <>{v.toLocaleString()}</>;
}

// ── dates ───────────────────────────────────────────────────────────────────
// Activity history is keyed by UTC date (see /api/user/activity-history), so the
// last-N-days list has to be built in UTC too or the "today" bar would sit one
// day off for anyone east or west of Greenwich around midnight.
function utcKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function lastNDays(n) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push({ key: utcKey(d), abbr: DAY_ABBR[d.getUTCDay()], date: d, isToday: i === 0 });
  }
  return out;
}
function minutesOn(activity, key) {
  const m = activity?.dailyMinutes?.[key];
  if (m != null) return m;
  // Older payloads only carried activeDates — count those as "active, minutes unknown".
  return (activity?.activeDates || []).includes(key) ? null : 0;
}

// ── Hero ────────────────────────────────────────────────────────────────────
export function KnightJourney({ activity }) {
  const days = lastNDays(7);
  return (
    <div>
      <div className="journey" aria-label="Your last 7 days">
        {days.map((d, i) => {
          const m = minutesOn(activity, d.key);
          const active = m == null || m > 0;
          return (
            <div
              key={d.key}
              className={`sq ${i % 2 === 0 ? 'l' : 'd'}${d.isToday ? ' today' : ''}`}
              title={active ? `${d.abbr}: ${m == null ? 'active' : `${m} min`}` : `${d.abbr}: rest day`}
            >
              {active && <div className="dot" />}
            </div>
          );
        })}
        <div className="knight" aria-hidden="true"><span>♞</span></div>
      </div>
      <div className="journey-days">
        {days.map(d => (
          <span key={d.key} className={d.isToday ? 'today' : ''}>{d.isToday ? 'Today' : d.abbr}</span>
        ))}
      </div>
    </div>
  );
}

function greetingFor(hour) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function AliveHero({
  user, isPublicView, activity, streak, identity, trophies, chips, continueTo,
}) {
  const name = user?.displayName || user?.username || '';
  const first = name.split(/[\s._]/)[0] || name;
  // Public view: the PRACTICE streak (full daily bar), falling back to the
  // any-activity streak only for old payloads — same rule as the old card.
  const n = isPublicView
    ? (activity?.stats?.practiceStreak ?? activity?.stats?.currentStreak ?? 0)
    : (streak?.current || 0);
  const days = lastNDays(7);
  const activeDays = days.filter(d => { const m = minutesOn(activity, d.key); return m == null || m > 0; }).length;
  const weekMin = days.reduce((s, d) => s + (minutesOn(activity, d.key) || 0), 0);

  let sub;
  if (isPublicView) {
    sub = <>Active <b>{activeDays} of the last 7 days</b>{weekMin > 0 && <> · {weekMin} min trained this week</>}.</>;
  } else if (streak?.todayQualified) {
    sub = <>Today's quest is done — your streak is safe.{streak.daysToNextReport > 0 && <> <b>{streak.daysToNextReport} more day{streak.daysToNextReport === 1 ? '' : 's'}</b> to your next weekly report.</>}</>;
  } else if (streak) {
    sub = <>Finish today's quest to keep the streak alive.{streak.daysToNextReport > 0 && n > 0 && <> <b>{streak.daysToNextReport} more day{streak.daysToNextReport === 1 ? '' : 's'}</b> to your next weekly report.</>}</>;
  } else {
    sub = <>Puzzles, a game and an endgame a day keep the streak growing.</>;
  }

  return (
    <div className="a-card hero grow rise">
      <div className="hero-pattern" aria-hidden="true" />
      <div className="hero-id">
        {identity.avatar}
        <div className="hero-id-text">
          <div className="eyebrow">{isPublicView ? 'Player profile' : `${greetingFor(new Date().getHours())}, ${first}`}</div>
          <div className="hero-name">{identity.name}</div>
          <div className="hero-meta">{identity.meta}</div>
        </div>
      </div>

      <div>
        <h1 className="hero-head disp">
          {n > 0
            ? <>Day {n} of {isPublicView ? 'their' : 'your'}<br /><em>knight's journey.</em></>
            : isPublicView
              ? <>{first}'s<br /><em>knight's journey.</em></>
              : <>Start your<br /><em>knight's journey today.</em></>}
        </h1>
        <div className="hero-sub">{sub}</div>
        {user?.biography && <div className="hero-bio">“{user.biography}”</div>}
      </div>

      <KnightJourney activity={activity} />

      <div className="hero-actions">
        {!isPublicView && (
          <Link to={continueTo} className="a-btn">Continue training <span className="arr">→</span></Link>
        )}
        <div className="streak-line">
          <span className="flame" aria-hidden="true">🔥</span>
          <b className="disp">{n}</b> day streak
          {activity?.stats?.longestStreak > 0 && <span className="faint">· best active run {activity.stats.longestStreak}</span>}
        </div>
      </div>

      {trophies}
      {chips}
    </div>
  );
}

// ── Today's quest ───────────────────────────────────────────────────────────
export function QuestCard({ streak }) {
  if (!streak) {
    return (
      <div className="a-card side quest rise" style={{ animationDelay: '.08s' }}>
        <div className="card-title disp">Today's quest</div>
        <div className="meter"><i style={{ width: '0%' }} /></div>
        <div className="faint" style={{ fontSize: 13 }}>Loading today's tasks…</div>
      </div>
    );
  }
  const tasks = questTasks(streak);
  const doneCount = tasks.filter(t => t.done).length;
  return (
    <div className="a-card side quest rise" style={{ animationDelay: '.08s' }}>
      <div className="card-head">
        <div className="card-title disp">Today's quest</div>
        <div className="muted" style={{ fontSize: 13 }}><b style={{ color: 'var(--color-text)' }}>{doneCount}</b> of {tasks.length} done</div>
      </div>
      <QuestMeter pct={(doneCount / tasks.length) * 100} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <Link key={t.key} to={t.to} className={`task${t.done ? ' done' : ''}`}>
            <div className="box">
              {t.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path className="chk" pathLength="1" d="M5 12l5 5L20 7" />
                </svg>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="tt">{t.title}</div>
              <div className="ts">{t.sub}</div>
            </div>
            <span className="count-chip">{t.have}/{t.want}</span>
          </Link>
        ))}
      </div>
      {streak.todayQualified
        ? <div className="quest-done" style={{ marginTop: 'auto' }}>✓ Quest complete — streak saved for today</div>
        : <div className="faint" style={{ fontSize: 12, marginTop: 'auto' }}>All three keep your streak alive. Tap a task to start it.</div>}
    </div>
  );
}

// The fill animates from 0 on mount — a width set straight away would just
// appear at its final size.
function QuestMeter({ pct, gold }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return <div className={`meter${gold ? ' gold' : ''}`}><i style={{ width: `${w}%` }} /></div>;
}

// ── Ratings strip ───────────────────────────────────────────────────────────
function sparkPoints(series, w = 74, h = 28) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const step = (w - 4) / (series.length - 1);
  return series.map((v, i) => `${(2 + i * step).toFixed(1)},${(max === min ? h / 2 : h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`).join(' ');
}

// Game ratings + Replay points, as the old StatsBar had. The puzzle rating is
// NOT repeated here — it lives in the Puzzles card with its trend lines.
export function RatingsStrip({ ratings, deltas, replayTo }) {
  const cells = [
    { key: 'bullet',    name: 'Bullet' },
    { key: 'blitz',     name: 'Blitz' },
    { key: 'rapid',     name: 'Rapid' },
    { key: 'classical', name: 'Classical' },
  ].map(c => ({ ...c, val: ratings?.[c.key] ?? 1200, delta: deltas?.[c.key], deltaTitle: 'Change from your last rated game' }));
  cells.push({ key: 'replay', name: 'Replay', val: ratings?.replay ?? 0, to: replayTo, deltaTitle: '' });

  return (
    <div className="a-card ratings rise" style={{ animationDelay: '.14s' }}>
      {cells.map((c, i) => {
        const Tag = c.to ? Link : 'div';
        const hasDelta = c.delta != null && c.delta !== 0;
        return (
          <Tag key={c.key} className="rate" {...(c.to ? { to: c.to } : {})}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="eyebrow">{c.name}</span>
              {hasDelta && (
                <span className={`delta ${c.delta > 0 ? 'up' : 'dn'}`} title={c.deltaTitle}>
                  {c.delta > 0 ? '+' : '−'}{Math.abs(c.delta)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
              <span className="rate-val disp">
                {c.val == null ? '—' : <CountUp value={c.val} delay={300 + i * 60} />}
              </span>
            </div>
          </Tag>
        );
      })}
    </div>
  );
}

// ── Practice ────────────────────────────────────────────────────────────────
function fmtMinutes(mins) {
  if (mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// `practiceStreak` is the streak the page already shows in the hero (the
// practice bar, not "any activity"), so the two numbers always agree.
export function PracticeCard({ activity, practiceStreak = 0 }) {
  const [mode, setMode] = useState('week');
  const days14 = lastNDays(14);
  const thisWeek = days14.slice(7);
  const lastWeek = days14.slice(0, 7);
  const sum = arr => arr.reduce((s, d) => s + (minutesOn(activity, d.key) || 0), 0);
  const weekMin = sum(thisWeek);
  const prevMin = sum(lastWeek);
  const change = prevMin > 0 ? Math.round(((weekMin - prevMin) / prevMin) * 100) : null;

  let bars;
  if (mode === 'week') {
    bars = thisWeek.map(d => {
      const m = minutesOn(activity, d.key);
      return { id: d.key, label: d.isToday ? 'Today' : d.abbr, value: m || 0, today: d.isToday, tip: m == null ? 'Active' : m > 0 ? `${m} min` : 'Rest day' };
    });
  } else {
    const days56 = lastNDays(56);
    bars = [];
    for (let w = 0; w < 8; w++) {
      const chunk = days56.slice(w * 7, w * 7 + 7);
      const total = sum(chunk);
      const start = chunk[0].date;
      bars.push({
        id: chunk[0].key,
        label: w === 7 ? 'Now' : `${start.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${start.getUTCDate()}`,
        value: total, today: w === 7, tip: total > 0 ? `${total} min` : 'No practice',
      });
    }
  }
  const max = Math.max(1, ...bars.map(b => b.value));
  const totalMin = activity?.stats?.totalMinutes;

  return (
    <div className="a-card lift grow rise" style={{ animationDelay: '.2s' }}>
      <div className="card-head">
        <div>
          <div className="card-title disp">{mode === 'week' ? 'Practice this week' : 'Practice · last 8 weeks'}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            <b style={{ color: 'var(--color-text)' }}><CountUp value={mode === 'week' ? weekMin : bars.reduce((s, b) => s + b.value, 0)} /> min</b> trained
            {mode === 'week' && change != null && (
              <> · <span className={change >= 0 ? 'good' : 'bad'}>{change >= 0 ? 'up' : 'down'} {Math.abs(change)}%</span> on last week</>
            )}
            {mode === 'week' && change == null && weekMin > 0 && <> · a fresh start this week</>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="mini-seg" role="tablist">
            <button type="button" className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>Week</button>
            <button type="button" className={mode === 'weeks' ? 'on' : ''} onClick={() => setMode('weeks')}>8 weeks</button>
          </div>
        </div>
      </div>
      <div className="bars" key={mode}>
        {bars.map((b, i) => (
          <div className="bcol" key={b.id}>
            <div className="tip">{b.tip}</div>
            <div
              className={`bar${b.today ? ' today' : ''}${b.value === 0 ? ' zero' : ''}`}
              style={{ height: `${Math.max(4, (b.value / max) * 140)}px`, animationDelay: `${0.35 + i * 0.07}s` }}
            />
            <div className={`blabel${b.today ? ' today' : ''}`}>{b.label}</div>
          </div>
        ))}
      </div>
      {/* The old Practice Activity card's three totals. */}
      <div className="pr-metrics">
        <div><span className="pr-ic" aria-hidden="true">🔥</span><b className="disp">{practiceStreak}</b><span>Practice streak</span></div>
        <div><span className="pr-ic" aria-hidden="true">⏱</span><b className="disp">{fmtMinutes(totalMin || 0)}</b><span>Time spent</span></div>
        <div><span className="pr-ic" aria-hidden="true">📅</span><b className="disp">{activity?.stats?.totalDays || 0}</b><span>Days active</span></div>
      </div>
    </div>
  );
}

// ── XP wallet ───────────────────────────────────────────────────────────────
const XP_SOURCES = [
  { key: 'puzzles',  label: 'Puzzles' },
  { key: 'races',    label: 'Races' },
  { key: 'arena',    label: 'Arena games' },
  { key: 'analysis', label: 'Game analysis' },
  { key: 'games',    label: 'Mini games' },
  { key: 'social',   label: 'Friends & invites' },
];

export function XpCard({ wallet, onHelp }) {
  const total = wallet?.total || 0;
  const by = wallet?.bySource || {};
  const rows = XP_SOURCES.map(s => ({ ...s, v: by[s.key] || 0 })).filter(s => s.v > 0).sort((a, b) => b.v - a.v).slice(0, 4);
  const earned = XP_SOURCES.reduce((s, x) => s + (by[x.key] || 0), 0);
  return (
    <div className="a-card lift side rise" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="coin">XP</div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">XP wallet</div>
          <div className="disp" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}><CountUp value={total} /></div>
        </div>
        <button type="button" className="help-dot" aria-label="How do I earn XP?" onClick={onHelp}>?</button>
      </div>
      {rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="eyebrow">Where it came from</div>
          {rows.map(r => (
            <div key={r.key}>
              <div className="kv"><span>{r.label}</span><b className="good">+{r.v.toLocaleString()}</b></div>
              <div className="meter gold" style={{ height: 4, marginTop: 4 }}><i style={{ width: `${earned ? (r.v / earned) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>Every puzzle, race and arena game adds XP here.</div>
      )}
      <button type="button" className="ghost" style={{ marginTop: 'auto' }} onClick={onHelp}>How to earn more <span className="arr">→</span></button>
    </div>
  );
}

// ── Puzzles ─────────────────────────────────────────────────────────────────
// Same figures as the old Puzzle Stats panel: solved / attempts in the ring,
// then rating (+trend), accuracy and best streak, each with its sparkline.
function Spark({ series, color }) {
  const pts = sparkPoints(series, 74, 22);
  if (!pts) return null;
  return (
    <svg width="74" height="22" viewBox="0 0 74 22" fill="none" aria-hidden="true">
      <polyline className="spark" pathLength="1" points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PuzzleCard({ stats, range, onRange, to, fallbackRating }) {
  const solved = stats?.solved ?? 0;
  const attempts = stats?.attempts ?? 0;
  const pct = attempts > 0 ? Math.round((solved / attempts) * 100) : 0;
  const acc = stats?.accuracy ?? (attempts > 0 ? pct : null);
  const rating = stats?.rating ?? fallbackRating ?? null;
  const trend = stats?.trend ?? null;
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setFill(pct), reducedMotion() ? 0 : 500);
    return () => clearTimeout(id);
  }, [pct]);
  const rows = [
    { label: 'Puzzle rating', value: rating != null ? <CountUp value={rating} /> : '—', color: 'var(--color-accent)',
      extra: trend ? <span className={trend > 0 ? 'good' : 'bad'}>{trend > 0 ? '+' : ''}{trend}</span> : null,
      series: stats?.series?.rating },
    { label: 'Accuracy', value: acc != null ? `${acc}%` : '—', color: 'var(--color-success)', series: stats?.series?.accuracy },
    { label: 'Best streak', value: stats?.streak ?? 0, color: 'var(--color-warning)', series: stats?.series?.solved },
  ];
  return (
    <div className="a-card lift rise" style={{ animationDelay: '.32s', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card-head">
        <div className="eyebrow">Puzzles</div>
        <div className="mini-seg">
          {['24h', '7d'].map(r => (
            <button key={r} type="button" className={range === r ? 'on' : ''} onClick={() => onRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <div className="ring-wrap">
          <svg className="a-ring" width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
            <circle cx="56" cy="56" r="46" stroke="var(--a-track)" strokeWidth="12" fill="none" />
            <circle className="ringfg" cx="56" cy="56" r="46" stroke="var(--color-success)" strokeWidth="12" fill="none" strokeLinecap="round" pathLength="100" strokeDasharray={`${fill} 100`} />
          </svg>
          <div className="ring-in">
            <span className="disp" style={{ fontSize: 28, fontWeight: 800 }}><CountUp value={solved} /></span>
            <span className="faint" style={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>of {attempts}<br />solved</span>
          </div>
        </div>
        <div className="pz-rows">
          {rows.map(r => (
            <div key={r.label} className="pz-row">
              <span className="pz-lbl">{r.label}</span>
              <span className="pz-val disp" style={{ color: r.color }}>{r.value}{r.extra && <small> {r.extra}</small>}</span>
              <Spark series={r.series} color={r.color} />
            </div>
          ))}
        </div>
      </div>
      <Link to={to} className="ghost" style={{ marginTop: 'auto' }}>Puzzle dashboard <span className="arr">→</span></Link>
    </div>
  );
}

// ── Races ───────────────────────────────────────────────────────────────────
export function RacesCard({ user, onOpen }) {
  const rows = [
    { type: 'timedRace', label: 'Individual race', v: user?.highestTimedRaceScore || 0, color: 'var(--color-accent)' },
    { type: 'arenaRace', label: 'Arena race',      v: user?.highestArenaRaceScore || 0, color: 'var(--color-success)' },
    { type: 'teamRace',  label: 'Team race',       v: user?.highestTeamRaceScore || 0,  color: 'var(--color-warning)' },
  ];
  const max = Math.max(1, ...rows.map(r => r.v));
  return (
    <div className="a-card lift rise" style={{ animationDelay: '.38s', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="card-head"><div className="eyebrow">Puzzle races · best</div></div>
      {rows.map(r => (
        <button key={r.type} type="button" className="race-row" onClick={() => onOpen(r.type)} title="See race history">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{r.label}</span>
            <b className="disp" style={{ fontSize: 16 }}><CountUp value={r.v} /></b>
          </div>
          <div className="rbar"><i style={{ width: `${(r.v / max) * 100}%`, background: r.color }} /></div>
        </button>
      ))}
      <div className="faint" style={{ fontSize: 12, marginTop: 'auto' }}>Tap a race to see its history.</div>
    </div>
  );
}

// ── Tournaments ─────────────────────────────────────────────────────────────
// The old Tournament panel's three figures. Trophies and the crown are shown
// once, in the hero — not repeated here.
export function TournamentCard({ arena, to }) {
  const carry = arena?.arenaCarryPoints || 0;
  return (
    <div className="a-card lift rise" style={{ animationDelay: '.44s', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card-head">
        <div className="eyebrow">Arena tournaments</div>
        <Link to={to} className="ghost">Dashboard <span className="arr">→</span></Link>
      </div>
      <div className="stat3">
        <div><div className="disp" style={{ color: 'var(--color-warning)' }}>{arena ? <CountUp value={arena.totalTournaments || 0} /> : '—'}</div><div className="lbl">tournaments</div></div>
        <div><div className="disp" style={{ color: 'var(--color-accent)' }}>{arena ? <CountUp value={arena.totalGamesPlayed || 0} /> : '—'}</div><div className="lbl">games</div></div>
        <div><div className="disp" style={{ color: 'var(--color-success)' }}>{arena ? (carry > 0 ? `+${carry}` : '0') : '—'}</div><div className="lbl">carry pts</div></div>
      </div>
    </div>
  );
}

// ── Monthly focus ───────────────────────────────────────────────────────────
// Same data as the old MonthlyFocusPanel: /current then a leaderboard call per
// focus for this user's stats. The trail shows COMPLETED days only — which day
// is open next is decided server-side (days unlock in order), so the card marks
// the next stop as "up next" rather than computing a day from the calendar.
export function FocusCard({ publicData }) {
  const [data, setData] = useState(publicData);
  const [loaded, setLoaded] = useState(!!publicData);

  useEffect(() => {
    if (publicData) { setData(publicData); setLoaded(true); return undefined; }
    let alive = true;
    (async () => {
      try {
        const cur = await api.get('/api/public/monthly-focus/current');
        const focuses = cur.data.focuses || (cur.data.focus ? [cur.data.focus] : []);
        const arr = await Promise.all(focuses.map(f =>
          api.get(`/api/public/monthly-focus/leaderboard?focusId=${f._id}`)
            .then(r => ({ id: f._id, stats: r.data.userStats }))
            .catch(() => ({ id: f._id, stats: null }))));
        const statsMap = {};
        arr.forEach(s => { statsMap[s.id] = s.stats; });
        if (alive) setData({ focuses, statsMap });
      } catch { /* no focus is a normal state */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [publicData]);

  if (!loaded) return null;
  const focuses = data?.focuses || [];
  const statsMap = data?.statsMap || {};
  const isOfficial = f => !f.createdBy || f.createdBy?.role === 'admin';
  const ordered = [...focuses.filter(isOfficial), ...focuses.filter(f => !isOfficial(f))];
  // A focus you are in comes first; otherwise invite to the OFFICIAL one only —
  // an elite coach's private focus you never joined is none of your business.
  const focus = ordered.find(f => statsMap[f._id]) || ordered.find(isOfficial);
  const monthLabel = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });

  if (!focus) {
    return (
      <div className="a-card lift grow rise" style={{ animationDelay: '.5s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="card-head">
          <div>
            <div className="eyebrow">Monthly focus · {monthLabel}</div>
            <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>Monthly Focus Challenge</div>
          </div>
          <Link to="/monthly-focus" className="ghost">View all <span className="arr">→</span></Link>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>No Monthly Focus challenge active this month.</div>
      </div>
    );
  }

  const s = statsMap[focus._id];
  const done = Math.min(7, s?.completedDays || 0);
  const badge = s ? focusBadge(s.completedDays, s.perfectDays) : null;
  // Every focus this player is in — the old panel's table, kept so a student in
  // both the official focus and a coach's focus sees both.
  const joined = ordered.filter(f => statsMap[f._id]);

  return (
    <div className="a-card lift grow rise" style={{ animationDelay: '.5s', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card-head">
        <div>
          <div className="eyebrow">Monthly focus · {monthLabel}{isOfficial(focus) ? ' · ChessNexus official' : ''}</div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700 }}>{focus.title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/monthly-focus" className="ghost">View all <span className="arr">→</span></Link>
          {!publicData && (
            <Link to="/monthly-focus" className="a-btn sm">{s ? (done >= 7 ? 'Results' : 'Continue') : 'Join now'} <span className="arr">→</span></Link>
          )}
        </div>
      </div>
      <div className="trail" aria-label={`${done} of 7 days complete`}>
        {Array.from({ length: 7 }, (_, i) => {
          const day = i + 1;
          const cls = day <= done ? 'ok' : (day === done + 1 && s ? 'now' : 'no');
          return (
            <React.Fragment key={day}>
              {i > 0 && <div className={`link${day <= done ? ' ok' : ''}`} />}
              <div className={`stop ${cls}`}>{day}</div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {s ? (
          <>
            <span className="muted" style={{ fontSize: 13, marginRight: 4 }}>{done} of 7 days done</span>
            {badge && <span className="pill gold">{badge.emoji} {badge.name}</span>}
            <span className="pill">🏅 Rank {s.rank ? `#${s.rank}` : '—'}</span>
            <span className="pill">⚡ {s.focusXp ?? 0} XP</span>
            <span className="pill">🧠 Skill {s.skillScore ?? 0}</span>
            <span className="pill">✨ {s.perfectDays ?? 0} perfect day{s.perfectDays === 1 ? '' : 's'}</span>
          </>
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>🏛️ An official Monthly Focus challenge is active this month!</span>
        )}
      </div>
      {joined.length > 1 && (
        <div className="mf-table-wrap">
          <table className="mf-table">
            <thead>
              <tr><th>Challenge</th><th>Rank</th><th>XP</th><th>Skill</th><th>Badge</th></tr>
            </thead>
            <tbody>
              {joined.map(f => {
                const fs = statsMap[f._id];
                const off = isOfficial(f);
                const b = focusBadge(fs.completedDays, fs.perfectDays);
                const creator = off ? 'ChessNexus' : (f.createdBy?.displayName || f.createdBy?.username || 'Elite');
                return (
                  <tr key={f._id}>
                    <td>
                      <Link to="/monthly-focus">{off && '🏛️ '}{f.title}</Link>
                      <span className="faint"> · by {creator}</span>
                    </td>
                    <td>{fs.rank ? `#${fs.rank}` : '—'}</td>
                    <td>{fs.focusXp ?? 0}</td>
                    <td>{fs.skillScore ?? 0}</td>
                    <td>{b ? `${b.emoji} ${b.name}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Same tiers as the old dashboard's Monthly Focus badge.
function focusBadge(completedDays, perfectDays) {
  if (!completedDays) return null;
  if (completedDays >= 7 && perfectDays >= 5) return { emoji: '🏆', name: 'Champion' };
  if (perfectDays >= 5) return { emoji: '👑', name: 'Perfect' };
  if (completedDays >= 7) return { emoji: '🎯', name: 'Achiever' };
  if (completedDays >= 5) return { emoji: '🔥', name: 'Dedicated' };
  if (completedDays >= 3) return { emoji: '⭐', name: 'Active' };
  return { emoji: '🌱', name: 'Beginner' };
}

// ── Tabs ────────────────────────────────────────────────────────────────────
export function AliveTabs({ tabs, active, onChange, children }) {
  const idx = Math.max(0, tabs.findIndex(t => t.id === active));
  const ref = useRef(null);
  return (
    <div className="a-card tabs-card rise" style={{ animationDelay: '.6s' }} ref={ref}>
      <div className="seg" role="tablist" style={{ '--n': tabs.length }}>
        <div className="ind" style={{ transform: `translateX(${idx * 100}%)` }} />
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`segb${active === t.id ? ' on' : ''}`}
            onClick={() => onChange(t.id)}
            title={t.label}
          >
            <span className="ic" aria-hidden="true">{t.icon}</span>
            <span className="lbl-long">{t.label}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function AliveToast({ message }) {
  if (!message) return null;
  return (
    <div className="alive-toast" role="status">
      <span className="coin" style={{ width: 28, height: 28, fontSize: 10 }} aria-hidden="true">♞</span>
      <span>{message}</span>
    </div>
  );
}
