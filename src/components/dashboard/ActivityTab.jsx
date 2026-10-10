// ActivityTab.jsx — dashboard "Activity": a day-by-day table of what the player
// did — date, activity, how many right / drawn / wrong, and rating gained or
// lost — under a strip of the player's current ratings. Games are summed per
// speed (arena), vs friends and vs Stockfish; "Show older activity" pages back
// 30 days at a time.

import React, { useEffect, useRef, useState } from 'react';
import api from '../../api';
import './DashGames.css';

// Arena games are split by speed; friend and Stockfish games get one row each.
const GAME_ROWS = [
  { id: 'bullet', icon: '🚀', label: (k) => `${plural(k, 'bullet game', 'bullet games')}` },
  { id: 'blitz', icon: '⚡', label: (k) => `${plural(k, 'blitz game', 'blitz games')}` },
  { id: 'rapid', icon: '🐇', label: (k) => `${plural(k, 'rapid game', 'rapid games')}` },
  { id: 'classical', icon: '🐢', label: (k) => `${plural(k, 'classical game', 'classical games')}` },
  { id: 'friend', icon: '🤝', label: (k) => `${plural(k, 'game', 'games')} vs friends` },
  { id: 'stockfish', icon: '🤖', label: (k) => `${plural(k, 'game', 'games')} vs Stockfish` },
];
const RATINGS = [
  { id: 'puzzle', icon: '🧩', label: 'Puzzle' },
  { id: 'bullet', icon: '🚀', label: 'Bullet' },
  { id: 'blitz', icon: '⚡', label: 'Blitz' },
  { id: 'rapid', icon: '🐇', label: 'Rapid' },
  { id: 'classical', icon: '🐢', label: 'Classical' },
];

const n = (v) => (v || 0).toLocaleString();
const plural = (k, one, many) => `${n(k)} ${k === 1 ? one : many}`;
const signed = (v) => (v > 0 ? `+${v}` : `${v}`);

// iso is an IST calendar date (YYYY-MM-DD) — compare as dates, not instants.
function formatDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const Num = ({ v, kind, word }) => (
  <span className={`da-num${v ? ` da-num--${kind}` : ''}`}>
    {n(v)}{word && <span className="da-num-word"> {word}</span>}
  </span>
);
const Dash = () => <span className="da-none">—</span>;

function RatingCell({ rating }) {
  if (!rating || (!rating.up && !rating.down)) return <Dash />;
  const c = rating.change;
  return (
    <div className="da-rating">
      <span className={`da-rating-net ${c > 0 ? 'up' : c < 0 ? 'down' : ''}`}>{signed(c)}</span>
      <span className="da-rating-split">
        <span className="up">▲ {rating.up}</span>
        <span className="down">▼ {rating.down}</span>
      </span>
    </div>
  );
}

// One day: a <tbody> whose first row carries the date and day for all its rows.
function FeedDay({ day }) {
  const rows = [];
  if (day.puzzles) {
    rows.push({
      key: 'puz', icon: '🧩',
      what: <>Puzzles · {plural(day.puzzles.attempted, 'attempt', 'attempts')}</>,
      right: <Num v={day.puzzles.solved} kind="good" />,
      wrong: <Num v={day.puzzles.attempted - day.puzzles.solved} kind="bad" />,
      rating: <RatingCell rating={day.puzzles.rating} />,
    });
  }
  if (day.races) {
    rows.push({
      key: 'race', icon: '🏁',
      what: <>{plural(day.races.count, 'puzzle race', 'puzzle races')}</>,
      right: <Num v={day.races.solved} kind="good" />,
      wrong: <Num v={day.races.wrong} kind="bad" />,
    });
  }
  GAME_ROWS.forEach(t => {
    const g = day.games?.[t.id];
    if (!g || !g.games) return;
    rows.push({
      key: t.id, icon: t.icon,
      what: t.label(g.games),
      right: <Num v={g.win} kind="good" word="won" />,
      draw: <Num v={g.draw} kind="draw" word="drawn" />,
      wrong: <Num v={g.loss} kind="bad" word="lost" />,
      rating: g.rating ? <RatingCell rating={g.rating} /> : null,
    });
  });
  if (day.studies) {
    rows.push({ key: 'study', icon: '📖', what: <>Studied {plural(day.studies.chapters, 'chapter', 'chapters')}</> });
  }
  if (day.tests) {
    rows.push({
      key: 'test', icon: '📝',
      what: <>{plural(day.tests.count, 'study test', 'study tests')} · {plural(day.tests.positions, 'position', 'positions')}</>,
      right: <Num v={day.tests.correct} kind="good" />,
      wrong: <Num v={day.tests.positions - day.tests.correct} kind="bad" />,
    });
  }
  if (!rows.length) return null;
  const date = formatDay(day.date);
  return (
    <tbody className="da-tday">
      {rows.map((r, i) => (
        <tr key={r.key}>
          {i === 0 && (
            <td className="da-t-date" rowSpan={rows.length}>{date}</td>
          )}
          <td>
            <div className="da-t-what">
              <span className="da-line-icon">{r.icon}</span>
              <div className="da-line-body">{r.what}</div>
            </div>
          </td>
          <td className="da-t-num">{r.right || <Dash />}</td>
          <td className="da-t-num">{r.draw || <Dash />}</td>
          <td className="da-t-num">{r.wrong || <Dash />}</td>
          <td className="da-t-num">{r.rating || <Dash />}</td>
        </tr>
      ))}
    </tbody>
  );
}

/** Props: who — user id, username or displayName of the profile being viewed. */
export default function ActivityTab({ who }) {
  const [data, setData] = useState(null);      // first page: newest 30 days
  const [feed, setFeed] = useState([]);         // every day loaded so far, newest first
  const [older, setOlder] = useState(null);     // { before, hasOlder, from }
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const whoRef = useRef(who);

  useEffect(() => {
    if (!who) return;
    whoRef.current = who;
    let alive = true;
    setData(null); setFeed([]); setOlder(null); setError('');
    api.get(`/api/user-games/activity/${encodeURIComponent(who)}`)
      .then(({ data: d }) => {
        if (!alive) return;
        setData(d);
        setFeed(d.feed || []);
        setOlder({ before: d.nextBefore, hasOlder: !!d.hasOlder, from: d.from });
      })
      .catch(() => { if (alive) setError('Could not load activity.'); });
    return () => { alive = false; };
  }, [who]);

  const loadOlder = () => {
    if (!older?.before || loadingOlder) return;
    const forWho = who;
    setLoadingOlder(true);
    // A quiet month returns no days — keep stepping back (a few windows at
    // most) so one click always shows something when older activity exists.
    const step = (before, hops) => api
      .get(`/api/user-games/activity/${encodeURIComponent(forWho)}`, { params: { before } })
      .then(({ data: d }) => {
        if (whoRef.current !== forWho) return;
        setFeed(f => [...f, ...(d.feed || [])]);
        setOlder({ before: d.nextBefore, hasOlder: !!d.hasOlder, from: d.from });
        if (!(d.feed || []).length && d.hasOlder && hops < 12) return step(d.nextBefore, hops + 1);
      });
    step(older.before, 1)
      .catch(() => { /* keep what is shown; the button stays to retry */ })
      .finally(() => setLoadingOlder(false));
  };

  if (error) return <div className="dg-empty">{error}</div>;
  if (!data) return <div className="dg-loading">Loading activity…</div>;

  return (
    <div className="da-wrap">
      {data.ratings && (
        <div className="da-ratings" aria-label="Current ratings">
          {RATINGS.map(r => (
            <div key={r.id} className="da-rating-chip">
              <span className="da-rating-chip-label">{r.icon} {r.label}</span>
              <span className="da-rating-chip-val">{n(data.ratings[r.id])}</span>
            </div>
          ))}
        </div>
      )}
      {feed.length === 0 ? (
        <div className="dg-empty">
          {older?.hasOlder ? `No activity in the last ${data.feedDays || 30} days.` : 'No activity yet.'}
        </div>
      ) : (
        <div className="da-table-wrap">
          <table className="da-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th className="da-t-num"><span className="da-h-long">✓ Correct / Won</span><span className="da-h-short">✓</span></th>
                <th className="da-t-num"><span className="da-h-long">½ Draw</span><span className="da-h-short">½</span></th>
                <th className="da-t-num"><span className="da-h-long">✗ Wrong / Lost</span><span className="da-h-short">✗</span></th>
                <th className="da-t-num">Rating</th>
              </tr>
            </thead>
            {feed.map(d => <FeedDay key={d.date} day={d} />)}
          </table>
        </div>
      )}
      {older?.hasOlder && (
        <button type="button" className="dg-more" onClick={loadOlder} disabled={loadingOlder}>
          {loadingOlder ? 'Loading…' : 'Show older activity'}
        </button>
      )}
    </div>
  );
}
