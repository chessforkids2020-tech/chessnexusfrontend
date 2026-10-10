// src/components/dashboard/DockViews.jsx
//
// The 5-view dashboard (Home · Train · Activity · My Coach · Me) and its
// floating dock. The views themselves are composed in UserDashboard.jsx from the
// existing Alive cards; this file holds only the pieces that are new to the
// dock layout: the dock, the view headings and the Home view's hero, plan,
// stats and "up next" blocks. Like AliveParts, nothing here invents numbers —
// a figure the API does not give is left out.
import React from 'react';
import { Link } from 'react-router-dom';
import { questTasks } from './aliveQuest';
import './DockDashboard.css';

// ── Dock ────────────────────────────────────────────────────────────────────
export function DashDock({ items, active, onChange }) {
  // Lets the app-wide Schedule button (main.jsx) lift itself above the dock.
  React.useEffect(() => {
    document.body.classList.add('has-dash-dock');
    return () => document.body.classList.remove('has-dash-dock');
  }, []);
  return (
    <nav className="dash-dock" aria-label="Dashboard sections">
      {items.map(it => (
        <button
          key={it.key}
          type="button"
          className={active === it.key ? 'on' : ''}
          aria-current={active === it.key ? 'page' : undefined}
          onClick={() => onChange(it.key)}
        >
          <span className="dk-ic" aria-hidden="true">{it.icon}</span>
          <span className="dk-lb">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ViewHead({ eyebrow, title, sub, right }) {
  return (
    <div className="v-head rise">
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="serif v-title">{title}</h1>
        {sub && <div className="v-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function SectionHead({ eyebrow, title, right }) {
  return (
    <div className="s-head">
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow">{eyebrow}</div>
        <div className="serif s-title">{title}</div>
      </div>
      {right}
    </div>
  );
}

// ── shared date helpers (activity history is keyed by UTC date) ─────────────
function utcKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function minutesBetween(activity, fromDaysAgo, toDaysAgo) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let sum = 0;
  for (let i = fromDaysAgo; i >= toDaysAgo; i--) {
    sum += activity?.dailyMinutes?.[utcKey(new Date(today - i * 86400000))] || 0;
  }
  return sum;
}
function greetingFor(hour) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Home: hero + member card ────────────────────────────────────────────────
const CROWN_LABEL = {
  bronze: 'Bronze Crown', silver: 'Silver Crown', gold: 'Gold Crown', platinum: 'Platinum Crown', gem: 'Gem Crown',
};

export function MemberCard({ user, practiceStreak }) {
  const tier = CROWN_LABEL[user?.arenaCrownTier] || (user?.role === 'elite' ? 'Elite' : 'Member');
  const xp = user?.xpWallet?.total || 0;
  const since = user?.memberSince ? new Date(user.memberSince).getFullYear() : null;
  const name = (user?.displayName || user?.username || '').toUpperCase();
  return (
    <div className="mcard" aria-label={`ChessNexus member card: ${tier}, ${xp} XP`}>
      <div className="mc-top">
        <div>
          <div className="mc-kicker">CHESSNEXUS MEMBER</div>
          <div className="serif mc-tier">{tier}</div>
        </div>
        <span className="mc-glyph" aria-hidden="true">♛</span>
      </div>
      <div className="mc-bottom">
        <div style={{ minWidth: 0 }}>
          <div className="disp mc-xp">{xp.toLocaleString()} XP</div>
          <div className="mc-name">{name}{since && <> · SINCE {since}</>}</div>
        </div>
        <div className="mc-streak">🔥 {practiceStreak}<br />DAY STREAK</div>
      </div>
    </div>
  );
}

export function HomeHero({ user, isPublicView, streak, activity, practiceStreak, identity, trophies, chips }) {
  const name = user?.displayName || user?.username || '';
  const first = name.split(/[\s._]/)[0] || name;
  const now = new Date();
  const dateLine = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  let sub;
  if (isPublicView) {
    const weekMin = minutesBetween(activity, 6, 0);
    sub = <>{practiceStreak > 0 ? <>On a <b>{practiceStreak}-day</b> practice streak.</> : <>Training on ChessNexus.</>}{weekMin > 0 && <> {weekMin} min trained this week.</>}</>;
  } else if (streak?.todayQualified) {
    sub = <>Today's plan is done — your streak is safe.{streak.daysToNextReport > 0 && <> <b>{streak.daysToNextReport} more day{streak.daysToNextReport === 1 ? '' : 's'}</b> to your next weekly report.</>}</>;
  } else if (streak) {
    sub = <>Finish today's plan to reach a <b>{(streak.current || 0) + 1}-day streak</b>.</>;
  } else {
    sub = <>Puzzles, a game and an endgame a day keep the streak growing.</>;
  }

  return (
    <div className="home-hero">
      <div className="hh-text rise">
        {isPublicView ? (
          <>
            <div className="hh-id">{identity.avatar}<div className="hero-meta">{identity.meta}</div></div>
            <h1 className="serif hh-title"><span className="hh-name">{identity.name}</span></h1>
          </>
        ) : (
          <>
            <div className="eyebrow">{dateLine}{practiceStreak > 0 && <> · Day {practiceStreak}</>}</div>
            <h1 className="serif hh-title">{greetingFor(now.getHours())},<br /><i>{first}.</i></h1>
          </>
        )}
        <div className="hh-sub">{sub}</div>
        {user?.biography && <div className="hero-bio">“{user.biography}”</div>}
        {isPublicView && trophies}
        {chips}
      </div>
      <div className="hh-card rise" style={{ animationDelay: '.1s' }}>
        <MemberCard user={user} practiceStreak={practiceStreak} />
      </div>
    </div>
  );
}

// ── Home: today's plan (the 3 practice-streak tasks) ────────────────────────
const PLAN_ICON = { puzzles: '🧩', games: '♟️', endgames: '🏰' };

export function TodayPlan({ streak }) {
  const tasks = questTasks(streak);
  const doneCount = streak ? tasks.filter(t => t.done).length : 0;
  return (
    <section className="rise" style={{ animationDelay: '.16s' }}>
      <SectionHead
        eyebrow={streak ? `Today · ${doneCount} of ${tasks.length} done` : 'Today'}
        title="Today's plan"
        right={<span className="muted" style={{ fontSize: 14 }}>All three keep your streak alive</span>}
      />
      <div className="plan-grid">
        {tasks.map(t => {
          const pct = streak ? Math.round((t.have / t.want) * 100) : 0;
          const started = t.have > 0;
          return (
            <div key={t.key} className={`a-card lift plan-card${t.done ? ' done' : started ? ' going' : ''}`}>
              <div className="pc-top">
                <div className="d-ico" aria-hidden="true">{t.done ? '✅' : PLAN_ICON[t.key]}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="dv-title">{t.title}</div>
                  <div className="faint" style={{ fontSize: 13 }}>{t.sub}</div>
                </div>
              </div>
              <div className="d-bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="pc-foot">
                <span className="faint" style={{ fontSize: 12 }}>{streak ? `${t.have} of ${t.want}` : '…'}</span>
                <Link to={t.to} className={t.done ? 'd-btn2' : 'd-btn'}>{t.done ? 'Done ✓' : started ? 'Continue' : 'Start'}</Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Home: four big numbers ──────────────────────────────────────────────────
export function StatsRow({ practiceStreak, activity, puzzleStats, fallbackRating, arena }) {
  const week = minutesBetween(activity, 6, 0);
  const prev = minutesBetween(activity, 13, 7);
  const change = prev > 0 ? Math.round(((week - prev) / prev) * 100) : null;
  const rating = puzzleStats?.rating ?? fallbackRating ?? null;
  const trend = puzzleStats?.trend ?? null;
  const attempts = puzzleStats?.attempts ?? 0;
  const solvedPct = attempts > 0 ? Math.round(((puzzleStats?.solved ?? 0) / attempts) * 100) : null;
  const best = activity?.stats?.longestStreak;
  return (
    <div className="stats-row rise" style={{ animationDelay: '.22s' }}>
      <div>
        <div className="eyebrow">Streak</div>
        <div className="serif big">{practiceStreak}<span className="unit"> {practiceStreak === 1 ? 'day' : 'days'}</span></div>
        {best > 0 && <div className="faint st-sub">Best active run {best}</div>}
      </div>
      <div>
        <div className="eyebrow">Trained this week</div>
        <div className="serif big">{week}<span className="unit"> min</span></div>
        {change != null && (
          <div className={`st-sub ${change >= 0 ? 'good' : 'bad'}`}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)}% on last week</div>
        )}
      </div>
      <div>
        <div className="eyebrow">Puzzle rating</div>
        <div className="serif big" style={{ color: 'var(--a-gold)' }}>{rating != null ? Number(rating).toLocaleString() : '—'}</div>
        <div className="st-sub">
          {trend ? <span className={trend > 0 ? 'good' : 'bad'}>{trend > 0 ? '+' : ''}{trend}</span> : null}
          {solvedPct != null && <span className="faint">{trend ? ' · ' : ''}{solvedPct}% solved · 24h</span>}
        </div>
      </div>
      <div>
        <div className="eyebrow">Arena</div>
        <div className="serif big">{arena ? (arena.totalTournaments || 0) : '—'}</div>
        {arena && <div className="faint st-sub">tournaments · {arena.totalGamesPlayed || 0} games</div>}
      </div>
    </div>
  );
}

// ── Next class (shared by Home "Up next" and the My Coach view) ─────────────
function fmtIn(ms) {
  const min = Math.round(ms / 60000);
  if (min <= 1) return 'now';
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h}h${min % 60 ? ` ${min % 60}m` : ''}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? '' : 's'}`;
}

function classWhen(when) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const day = sameDay(when, today) ? 'Today' : sameDay(when, tomorrow) ? 'Tomorrow'
    : when.toLocaleDateString(undefined, { weekday: 'long' });
  return `${day}, ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export function NextClassCard({ next }) {
  if (!next) return null;
  const { item, when } = next;
  const ms = when.getTime() - Date.now();
  const live = ms <= 60000 && ms > -(item.durationMinutes || 60) * 60000;
  return (
    <div className="a-card next-class rise">
      <div className="eyebrow" style={{ color: 'var(--a-gold)' }}>{live ? 'Class is on now' : 'Next class'}</div>
      <div className="serif nc-when">{classWhen(when)}</div>
      <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
        {item.title} · {item.coachName}
        {!live && <> · starts <b style={{ color: 'var(--a-gold)' }}>{fmtIn(ms)}</b></>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {item.meetingLink && (
          <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" className="d-btn">Join class</a>
        )}
        <Link to="/my-coach" className="d-btn2">Full schedule</Link>
      </div>
    </div>
  );
}

// ── Home: up next ───────────────────────────────────────────────────────────
export function UpNext({ next, nextTask, onGo }) {
  const rows = [];
  if (next) {
    const ms = next.when.getTime() - Date.now();
    rows.push({ key: 'class', ic: '🎓', t: `Class with ${next.item.coachName}`, s: `${classWhen(next.when)} · ${next.item.title}`, right: fmtIn(ms), go: 'coach' });
  }
  if (nextTask) {
    rows.push({ key: 'task', ic: PLAN_ICON[nextTask.key], t: nextTask.title, s: `${nextTask.have} of ${nextTask.want} today`, right: '→', to: nextTask.to });
  }
  rows.push({ key: 'focus', ic: '🎯', t: 'Monthly Focus', s: "This month's theme, one day at a time", right: '→', go: 'train' });
  rows.push({ key: 'arena', ic: '🏆', t: 'Arena tournaments', s: 'Live games with players your level', right: '→', to: '/arenatournament' });
  return (
    <div className="up-next rise" style={{ animationDelay: '.34s' }}>
      <div className="eyebrow">Up next</div>
      {rows.slice(0, 3).map(r => {
        const body = (
          <>
            <div className="d-ico" aria-hidden="true">{r.ic}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{r.t}</div>
              <div className="faint" style={{ fontSize: 13 }}>{r.s}</div>
            </div>
            <span className="un-right">{r.right}</span>
          </>
        );
        return r.to
          ? <Link key={r.key} to={r.to} className="a-card lift un-row">{body}</Link>
          : <button key={r.key} type="button" className="a-card lift un-row" onClick={() => onGo(r.go)}>{body}</button>;
      })}
    </div>
  );
}

// ── Train: quick tiles ──────────────────────────────────────────────────────
const TRAIN_TILES = [
  { ic: '🧩', t: 'Healthy Mix', s: 'Rated puzzles, mixed themes', to: '/training/healthy-mix', cta: 'Solve' },
  { ic: '📅', t: 'Daily puzzles', s: 'A fresh set every day', to: '/daily-puzzles', cta: 'Open' },
  { ic: '⚡', t: 'Puzzle Race', s: 'Beat your personal best', to: '/race', cta: 'Race' },
  { ic: '🏰', t: 'Endgames', s: 'Play out vs the computer', to: '/study/endgames', cta: 'Practise' },
];

export function TrainTiles() {
  return (
    <div className="tile-grid">
      {TRAIN_TILES.map(t => (
        <Link key={t.to} to={t.to} className="a-card lift tile">
          <div className="d-ico" aria-hidden="true">{t.ic}</div>
          <div>
            <div className="dv-title">{t.t}</div>
            <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>{t.s}</div>
          </div>
          <span className="tile-cta">{t.cta} <span className="arr">→</span></span>
        </Link>
      ))}
    </div>
  );
}
