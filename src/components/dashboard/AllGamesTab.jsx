// AllGamesTab.jsx — dashboard "All Games": arena, friend and vs-Stockfish games
// in one list (Lichess-style), filterable. Clicking a game opens the
// single-game analysis page.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../Chessboard';
import './DashGames.css';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PAGE_SIZE = 24;
// Board size per card; the desktop size and breakpoint match DashGames.css.
const BOARD_MOBILE = 112;
const BOARD_DESKTOP = 176;
const DESKTOP_MQ = '(min-width: 900px)';

function useIsDesktop() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setOn(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return on;
}

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'arena', label: 'Arena' },
  { id: 'friend', label: 'Friends' },
  { id: 'stockfish', label: 'Stockfish' },
];
const RESULTS = [
  { id: '', label: 'Any result' },
  { id: 'win', label: 'Wins' },
  { id: 'loss', label: 'Losses' },
  { id: 'draw', label: 'Draws' },
];
const COLORS = [
  { id: '', label: 'Both colours' },
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
];
const STAT_ROWS = [
  { id: 'arena', label: '🏟 Arena' },
  { id: 'friend', label: '🤝 vs Friends' },
  { id: 'stockfish', label: '🤖 vs Stockfish' },
];
const TYPE_BADGE ={ arena: '🏟 Arena', friend: '🤝 Friend', stockfish: '🤖 Stockfish' };
const OUTCOME = { win: 'Won', loss: 'Lost', draw: 'Draw' };
const SPEED = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', friendly: 'Friendly' };

// "Italian Game: Two Knights Defense, Knight Attack, Normal Variation" →
// "Italian Game: Two Knights Defense". The full name stays in the tooltip.
const shortOpening = (name) => name.split(',')[0].trim();
const tcText = (tc) => (!tc || tc.minutes == null ? 'Unlimited' : `${tc.minutes}+${tc.increment || 0}`);
const scoreText = (r) => (r === 'white_won' ? '1-0' : r === 'black_won' ? '0-1' : r === 'draw' ? '½-½' : '*');

function ago(d) {
  if (!d) return '';
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Props: who — user id, username or displayName of the profile being viewed. */
export default function AllGamesTab({ who }) {
  const [type, setType] = useState('all');
  const [result, setResult] = useState('');
  const [color, setColor] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');                 // debounced search
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);       // W/D/L per type, last 6 months
  const [exporting, setExporting] = useState(false);
  const reqRef = useRef(0);
  const boardWidth = useIsDesktop() ? BOARD_DESKTOP : BOARD_MOBILE;

  useEffect(() => {
    if (!who) return;
    let alive = true;
    setStats(null);
    api.get(`/api/user-games/stats/${encodeURIComponent(who)}`)
      .then(({ data }) => { if (alive) setStats(data); })
      .catch(() => { /* the table is optional — the list still works */ });
    return () => { alive = false; };
  }, [who]);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filterParams = () => {
    const params = { type };
    if (result) params.result = result;
    if (color) params.color = color;
    if (q) params.q = q;
    return params;
  };

  const exportPgn = () => {
    if (!who || exporting) return;
    setExporting(true);
    api.get(`/api/user-games/export/${encodeURIComponent(who)}`, { params: filterParams(), responseType: 'blob' })
      .then(({ data }) => {
        // Named here: the API is cross-origin, so Content-Disposition is not readable.
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chessnexus_games_${new Date().toISOString().slice(0, 10)}.pgn`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(() => setError('Could not export games.'))
      .finally(() => setExporting(false));
  };

  const load = (nextPage) => {
    if (!who) return;
    const req = ++reqRef.current;
    setLoading(true);
    setError('');
    const params = { ...filterParams(), page: nextPage, limit: PAGE_SIZE };
    api.get(`/api/user-games/list/${encodeURIComponent(who)}`, { params })
      .then(({ data }) => {
        if (req !== reqRef.current) return;
        setGames(prev => (nextPage === 1 ? data.games : [...prev, ...data.games]));
        setPage(nextPage);
        setHasMore(!!data.hasMore);
        setTotal(data.total || 0);
        setCounts(data.counts || null);
      })
      .catch(() => { if (req === reqRef.current) setError('Could not load games.'); })
      .finally(() => { if (req === reqRef.current) setLoading(false); });
  };

  // Any filter change starts again from page 1.
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => { load(1); }, [who, type, result, color, q]);

  const countFor = (id) => {
    if (!counts) return null;
    if (id === 'all') return (counts.arena || 0) + (counts.friend || 0) + (counts.stockfish || 0);
    return counts[id] || 0;
  };

  return (
    <div className="dg-wrap">
      {stats && (
        <div className="dg-summary" aria-label={`Games, last ${stats.months || 6} months`}>
          {STAT_ROWS.map(t => {
            const g = stats[t.id] || {};
            const n = g.games || 0;
            const pct = (v) => (n ? `${((v || 0) / n) * 100}%` : '0%');
            return (
              <div key={t.id} className="dg-sum">
                <div className="dg-sum-head">
                  <span className="dg-sum-label">{t.label}</span>
                  <span className="dg-sum-n">{n}<span className="dg-sum-unit"> {n === 1 ? 'game' : 'games'}</span></span>
                </div>
                <div className="dg-sum-bar" aria-hidden="true">
                  <span className="w" style={{ width: pct(g.win) }} />
                  <span className="d" style={{ width: pct(g.draw) }} />
                  <span className="l" style={{ width: pct(g.loss) }} />
                </div>
                <div className="dg-sum-wdl">
                  <span className="w">{g.win || 0}W</span>
                  <span className="d">{g.draw || 0}D</span>
                  <span className="l">{g.loss || 0}L</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="dg-filters">
        <div className="dg-chips" role="group" aria-label="Game type">
          {TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`dg-chip${type === t.id ? ' is-on' : ''}`}
              onClick={() => setType(t.id)}
            >
              {t.label}
              {countFor(t.id) != null && <span className="dg-chip-count">{countFor(t.id)}</span>}
            </button>
          ))}
        </div>
        <div className="dg-filter-row">
          <select className="dg-select" value={result} onChange={e => setResult(e.target.value)} aria-label="Result">
            {RESULTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <select className="dg-select" value={color} onChange={e => setColor(e.target.value)} aria-label="Colour">
            {COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input
            className="dg-search"
            type="search"
            placeholder="Search opponent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="dg-export"
            onClick={exportPgn}
            disabled={exporting || total === 0}
            title="Download the games shown below (current filters) as a PGN file"
          >
            {exporting ? 'Exporting…' : '⬇ Export PGN'}
          </button>
        </div>
      </div>

      {error && <div className="dg-empty">{error}</div>}
      {!error && !loading && games.length === 0 && (
        <div className="dg-empty">
          <div className="dg-empty-icon">♟</div>
          {type === 'all' && !result && !color && !q
            ? 'No games in the last 6 months. Play an arena, a friend or Stockfish and your games will appear here.'
            : 'No games match these filters.'}
        </div>
      )}

      {games.length > 0 && (
        <>
          <div className="dg-total">{total} game{total === 1 ? '' : 's'} in the last 6 months</div>
          <div className="dg-list">
            {games.map(g => (
              <Link
                key={`${g.type}:${g.id}`}
                to={`/game/${g.type}/${g.id}?pov=${g.myColor}`}
                className={`dg-row dg-row--${g.outcome}`}
              >
                <div className="dg-board">
                  <Chessboard
                    position={g.fen || DEFAULT_FEN}
                    boardWidth={boardWidth}
                    draggable={false}
                    resizable={false}
                    orientation={g.myColor || 'white'}
                  />
                </div>
                <div className="dg-info">
                  <div className="dg-top">
                    <span className={`dg-type dg-type--${g.type}`}>{TYPE_BADGE[g.type]}</span>
                    <span className="dg-tc">
                      {tcText(g.timeControl)}
                      {g.speed && <> · <span className={`dg-speed dg-speed--${g.speed}`}>{SPEED[g.speed]}</span></>}
                      {g.rated ? ' · Rated' : ''}{g.chess960 ? ' · 960' : ''}
                    </span>
                    <span className="dg-when">{ago(g.finishedAt)}</span>
                  </div>
                  <div className="dg-players">
                    <span className="dg-p">
                      <span className="dg-dot dg-dot--white" />{g.white}
                      {g.whiteRating != null && <span className="dg-prating">({g.whiteRating})</span>}
                    </span>
                    <span className="dg-vs">vs</span>
                    <span className="dg-p">
                      <span className="dg-dot dg-dot--black" />{g.black}
                      {g.blackRating != null && <span className="dg-prating">({g.blackRating})</span>}
                    </span>
                  </div>
                  <div className="dg-opening">
                    {g.myColor && (
                      <span className={`dg-side dg-side--${g.myColor}`}>
                        as {g.myColor === 'white' ? 'White' : 'Black'}
                      </span>
                    )}
                    {g.opening && (
                      <span className="dg-open-name" title={`${g.opening.eco} · ${g.opening.name}`}>
                        <span className="dg-eco">{g.opening.eco}</span>{shortOpening(g.opening.name)}
                      </span>
                    )}
                  </div>
                  {g.tournamentName && <div className="dg-sub">{g.tournamentName}</div>}
                  <div className="dg-bottom">
                    <span className={`dg-outcome dg-outcome--${g.outcome}`}>{OUTCOME[g.outcome]}</span>
                    <span className="dg-score">{scoreText(g.result)}</span>
                    {g.resultReason && <span className="dg-reason">{g.resultReason}</span>}
                    {g.ratingChange != null && g.ratingChange !== 0 && (
                      <span className={`dg-rc ${g.ratingChange > 0 ? 'up' : 'down'}`}>
                        {g.ratingChange > 0 ? `+${g.ratingChange}` : g.ratingChange}
                      </span>
                    )}
                    <span className="dg-plies">{Math.ceil((g.plies || 0) / 2)} moves</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {loading && <div className="dg-loading">Loading…</div>}
      {!loading && hasMore && (
        <button type="button" className="dg-more" onClick={() => load(page + 1)}>Load more</button>
      )}
    </div>
  );
}
