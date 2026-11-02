import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import useScrollReveal from '../hooks/useScrollReveal';
import PawnBuddy from './PawnBuddy';
import './TrainingPathPanel.css';
import { t as tr } from '../i18n/LanguageContext';

// "Your Training Path" — the top of the Training page.
//
// The daily task list and the before/after games comparison were removed from
// the Guide; the level card, the slot and the reminders remain.

// Local midnight today / Monday, sent to the server (it cannot know our time zone).
function boundaries() {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(day);
  week.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return { dayStart: day.toISOString(), weekStart: week.toISOString() };
}

// First visit: the Nexus Guide places the player before giving any plan.
function Invite({ inProgress, total }) {
  return (
    <section className="tpp tpp-invite-wrap">
      <div className="tpp-col tpp-invite">
        <div className="tpp-invite-icon">🧭</div>
        <div className="tpp-invite-body">
          <h2 className="tpp-title">{tr("The Nexus Guide wants to know your level first")}</h2>
          <p className="tpp-invite-text">
            {tr("Before giving you a plan, the Nexus Guide checks where you are: {n} puzzles on different topics, getting harder when you are right and easier when you are wrong. About 10 minutes.", { n: total || 20 })}
          </p>
          <ul className="tpp-invite-list">
            <li>{tr("You get your level (1 to 8) and your title.")}</li>
            <li>{tr("It finds the topics you get wrong most.")}</li>
            <li>{tr("Then it builds your daily plan: which puzzles, which range, what to fix.")}</li>
          </ul>
          <Link to="/training/level-test" className="tpp-invite-cta">
            {inProgress
              ? tr("Continue the test ({a}/{t})", { a: inProgress.answered, t: inProgress.total })
              : tr("Find my level")} ›
          </Link>
        </div>
      </div>
    </section>
  );
}

// Why a topic is a weak spot, in words (chip tooltip).
function weakWhy(w) {
  const parts = [];
  if (w.testMissed) parts.push(tr("Missed in your level test."));
  if (w.practiceTried >= 3) parts.push(tr("Practised: {r} of {t} right.", { r: w.practiceTried - w.practiceWrong, t: w.practiceTried }));
  if (w.mixedTried >= 5) parts.push(tr("In Healthy Mix: missed {m} of {t}.", { m: w.mixedWrong, t: w.mixedTried }));
  if (w.histTried >= 5) parts.push(tr("In your past puzzles you got {wrong} of {tried} wrong.", { wrong: w.histWrong, tried: w.histTried }));
  return parts.join(' ');
}

// The current level (test first, then daily Healthy Mix), the player's standard
// rating range, the next step, and what to fix — the guidance in one strip.
// A chess piece per level, so the journey reads as "pawn → king" at a glance.
// ︎ keeps them as text glyphs (Windows would otherwise draw ♟ as an emoji).
const LEVEL_PIECES = ['♟', '♟', '♞', '♝', '♜', '♛', '♚', '👑'].map(p => (p === '👑' ? p : p + '︎'));

// Core tactics: the basic patterns of real games, weakest first, so the player
// sees exactly where to focus. Themes with too few puzzles go last, greyed.
const CORE_ICONS = {
  fork: '🍴', pin: '📌', hangingPiece: '🎁', mate: '♚︎', backRankMate: '🧱', trappedPiece: '🪤',
  sacrifice: '💥', capturingDefender: '🛡️', attackingF2F7: '🎯', skewer: '🍢',
};
const STRONG_AT = 80;

function CoreTactics({ core, minTries, goal }) {
  if (!core?.length) return null;
  const measured = core.filter(c => c.enough).sort((a, b) => a.accuracy - b.accuracy || b.tried - a.tried);
  const unmeasured = core.filter(c => !c.enough);
  const focus = measured.filter(c => c.accuracy < goal).slice(0, 3).map(c => c.theme);
  const rows = [...measured, ...unmeasured];
  return (
    <div className="tpp-core" data-reveal>
      <div className="tpp-core-head">
        <span className="tpp-core-title">🧩 {tr("Your core tactics")}</span>
        <span className="tpp-core-sub">{tr("The patterns that decide most games — weakest first")}</span>
      </div>
      {focus.length > 0 ? (
        <div className="tpp-core-focus">
          👉 {tr("Focus on:")}{' '}
          {focus.map((th, i) => {
            const c = core.find(x => x.theme === th);
            return <strong key={th}>{i > 0 ? ', ' : ''}{tr(c.label)}</strong>;
          })}
        </div>
      ) : measured.length > 0 ? (
        <div className="tpp-core-focus good">⭐ {tr("No weak basics right now — keep them sharp!")}</div>
      ) : null}
      <div className="tpp-core-grid">
        {rows.map((c, i) => {
          const state = !c.enough ? 'few' : c.accuracy >= STRONG_AT ? 'strong' : c.accuracy >= goal ? 'good' : c.accuracy >= 50 ? 'mid' : 'bad';
          const isFocus = focus.includes(c.theme);
          return (
            <Link key={c.theme} to={`/training/healthy-mix?theme=${encodeURIComponent(c.theme)}`}
              className={`tpp-core-row ${state}${isFocus ? ' focus' : ''}`} style={{ '--c': i % 2 }} title={tr(c.tip)} data-reveal="item">
              <span className="tpp-core-icon">{CORE_ICONS[c.theme] || '♟'}</span>
              <span className="tpp-core-main">
                <span className="tpp-core-name">
                  {tr(c.label)}
                  {isFocus && <span className="tpp-core-tag">{tr("Focus")}</span>}
                  {state === 'strong' && <span className="tpp-core-tag star">⭐ {tr("Strong")}</span>}
                </span>
                <span className="tpp-core-bar">
                  <span className="tpp-core-fill" style={{ width: `${c.enough ? Math.max(3, c.accuracy) : 0}%` }} />
                  <span className="tpp-core-goal" style={{ left: `${goal}%` }} />
                </span>
              </span>
              <span className="tpp-core-val">
                {c.enough
                  ? <><strong>{c.accuracy}%</strong><small>{tr("{s}/{t} right", { s: c.solved, t: c.tried })}</small></>
                  : <small>{c.tried ? tr("{n} of {min} tried", { n: c.tried, min: minTries }) : tr("Not tried yet")}</small>}
              </span>
              <span className="tpp-core-go">{isFocus && <span className="tpp-core-go-txt">{tr("Practise")} </span>}›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LevelStrip({ level }) {
  if (!level) return null;
  const lv = level.level;
  const tdn = level.trend;
  const nx = level.next;
  const goal = level.goal;
  const nxAcc = nx.tried ? nx.accuracy : 0;
  const bandClass = (b) => (!b.enough ? 'few' : b.accuracy >= goal ? 'good' : b.accuracy >= 50 ? 'mid' : 'bad');
  return (
    <div className="tpp-col tpp-wide tpp-level">
      {/* Encouragement only — shown when their puzzle solving got better. */}
      {tdn?.improved && (
        <div className="tpp-level-news" data-reveal>
          <span className="tpp-news-icon">🚀</span>
          <span className="tpp-news-text">
            <strong>{tr("You're getting stronger!")}</strong>{' '}
            {tdn.kind === 'harder'
              ? tr("Harder puzzles in the last {days} days, still {a}% right.", { days: tdn.days, a: tdn.after.accuracy })
              : tr("More puzzles right in the last {days} days.", { days: tdn.days })}
          </span>
          <span className="tpp-news-stat">
            {tdn.kind === 'harder'
              ? <>{tdn.before.avgRating} <b>→</b> {tdn.after.avgRating}</>
              : <>{tdn.before.accuracy}% <b>→</b> {tdn.after.accuracy}%</>}
          </span>
        </div>
      )}

      <div className="tpp-lv-top" data-reveal>
        <div className="tpp-lv-hero">
          <div className="tpp-lv-crest">
            <span className="tpp-lv-piece">{LEVEL_PIECES[lv.n - 1] || '♙'}</span>
            <span className="tpp-lv-num">{lv.n}</span>
          </div>
          <div className="tpp-lv-who">
            <div className="tpp-lv-kicker">{tr("Level {n} of {of}", { n: lv.n, of: level.of })}</div>
            <div className="tpp-lv-title">{tr(lv.title)}</div>
            <Link to="/training/level-test" className="tpp-level-link">{tr("Level test result")} ›</Link>
          </div>
        </div>

        {/* The journey: every level as a stop on one road. */}
        <div className="tpp-lv-map" aria-label={tr("Level {n} of {of}", { n: lv.n, of: level.of })}>
          {level.levels.map((l, i) => {
            const st = l.n < lv.n ? 'done' : l.n === lv.n ? 'now' : 'next';
            return (
              <div key={l.n} className={`tpp-lv-stop ${st}`} style={{ '--i': i }} title={`${l.n} · ${tr(l.title)}`}>
                <span className="tpp-lv-node">{st === 'done' ? '✓' : st === 'now' ? (LEVEL_PIECES[l.n - 1] || l.n) : l.n}</span>
                <span className="tpp-lv-name">{tr(l.title)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tpp-lv-body">
        {/* Next mission: one goal, one button. */}
        <div className="tpp-mission" data-reveal>
          <div className="tpp-mission-head">🎯 {tr("Next mission")}</div>
          <div className="tpp-mission-goal">
            {tr("Get {goal}% right on {min}–{max} puzzles", { goal, min: nx.min, max: nx.max })}
          </div>
          <div className="tpp-mission-bar" role="progressbar" aria-valuenow={nxAcc} aria-valuemin={0} aria-valuemax={100}>
            <div className="tpp-mission-fill" style={{ width: `${Math.min(100, nxAcc)}%` }} />
            <div className="tpp-mission-mark" style={{ left: `${goal}%` }}><span>{goal}%</span></div>
          </div>
          <div className="tpp-mission-now">
            {nx.tried ? tr("Now: {acc}% right", { acc: nx.accuracy }) : tr("Not tried yet")}
          </div>
          <Link className="tpp-mission-btn" to={`/training/healthy-mix?min=${nx.min}&max=${nx.max}`}>▶ {tr("Play mission")}</Link>
          <div className="tpp-mission-std">
            {level.standard
              ? <>🏅 {tr("Mastered: {min}–{max} ({acc}% right)", { min: level.standard.min, max: level.standard.max, acc: level.standard.accuracy })}</>
              : <>🏅 {tr("No standard yet: solve {goal}% of {n}+ Healthy Mix puzzles in one rating range.", { goal, n: level.minTries })}</>}
          </div>
        </div>

        {/* The ladder: how they do at each puzzle rating, as bars. */}
        {level.bands?.length > 0 && (
          <div className="tpp-ladder" data-reveal style={{ '--d': 1 }}>
            <div className="tpp-ladder-head">
              <span>🪜 {tr("Your puzzle ladder")}</span>
              <span className="tpp-ladder-sub">{tr("Healthy Mix, first try, by puzzle rating")}</span>
            </div>
            <div className="tpp-ladder-chart">
              <div className="tpp-ladder-goal" style={{ bottom: `${goal}%` }}><span>{goal}%</span></div>
              {level.bands.map((b, i) => (
                <div key={b.min} className={`tpp-ladder-col ${bandClass(b)}${b.min === nx.min ? ' target' : ''}`} style={{ '--i': i }}
                  title={tr("{min}–{max}: {solved} of {tried} right", { min: b.min, max: b.max, solved: b.solved, tried: b.tried })}>
                  <span className="tpp-ladder-pct">{b.accuracy}%</span>
                  <span className="tpp-ladder-bar" style={{ height: `${Math.max(4, b.accuracy)}%` }} />
                </div>
              ))}
            </div>
            <div className="tpp-ladder-axis">
              {level.bands.map(b => <span key={b.min} className={b.min === nx.min ? 'target' : ''}>{b.min}</span>)}
            </div>
          </div>
        )}
      </div>

      <CoreTactics core={level.core} minTries={level.coreMinTries} goal={goal} />

      {level.weak.length > 0 && !level.core?.some(c => c.enough) && (
        <div className="tpp-level-weak" data-reveal>
          <span className="tpp-weak-head">🩹 {tr("Weak spots:")}</span>
          {level.weak.map(w => (
            <Link key={w.theme} className="tpp-chip" to={`/training/healthy-mix?theme=${encodeURIComponent(w.theme)}`} title={weakWhy(w)}>{tr(w.label)}</Link>
          ))}
        </div>
      )}
      <div className="tpp-level-src">
        {level.source === 'training'
          ? tr("From your Healthy Mix puzzles — it updates as you train.")
          : tr("From your level test, until you solve {goal}% of {min}+ Healthy Mix puzzles in one rating range.", { goal, min: level.minTries })}
      </div>
    </div>
  );
}

function reminderText(r) {
  switch (r.kind) {
    case 'lichess': return tr("No Lichess games analysed this week. Analyse them to update your report.");
    case 'chesscom': return tr("No Chess.com games analysed this week. Analyse them to update your report.");
    case 'chessnexus': return tr("You played {n} games here this week. Analyse them to update your report.", { n: r.count });
    case 'link': return tr("Add your Lichess or Chess.com username to analyse those games too.");
    case 'moments': return tr("{n} mistakes from your own games are waiting in My Moments.", { n: r.count });
    default: return '';
  }
}

function Reminders({ items }) {
  if (!items?.length) return null;
  return (
    // The pawn buddy walks in and "says" the reminders in a speech bubble.
    <div className="tpp-col tpp-wide tpp-remind" data-reveal>
      <PawnBuddy className="tpp-remind-pawn" />
      <div className="tpp-bubble">
        <div className="tpp-remind-head">{tr("Keep your game report up to date")}</div>
        {items.map((r, i) => (
          <div key={r.kind} className="tpp-remind-row" style={{ '--i': i }}>
            <span>{reminderText(r)}</span>
            <Link className="tpp-go" to={r.to}>{r.kind === 'moments' ? tr("Open my moments") : r.kind === 'link' ? tr("Add username") : tr("Analyse")} ›</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// `afterLevel` — a node, or a function (levelTitle) => node, placed right under
// the level / puzzle card. The Guide puts "Learn from my mistakes" there. It is
// still shown when the level test is not done yet or the path fails to load.
export default function TrainingPathPanel({ afterLevel } = {}) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef(null);
  useScrollReveal(rootRef, [data]);

  useEffect(() => {
    api.get('/api/training-path', { params: boundaries() })
      .then((r) => setData(r.data))
      .catch(() => setFailed(true));
  }, []);

  const slot = typeof afterLevel === 'function' ? afterLevel(data?.level?.level?.title) : afterLevel;
  if (failed) return slot || null;
  if (!data) return null;
  if (data.needsAssessment) return <><Invite inProgress={data.inProgress} total={data.total} />{slot}</>;

  return (
    <section className="tpp" ref={rootRef}>
      <LevelStrip level={data.level} />
      {slot && <div className="tpp-wide">{slot}</div>}
      {/* Reminders (game report / My Moments) hidden for now:
          <Reminders items={data.reminders} /> */}
    </section>
  );
}
