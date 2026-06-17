import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import GameAnalysisModal from '../../components/masterGames/GameAnalysisModal';

// ── Master Games — browse / search results ────────────────────────────────────
// Reached from the home page's "Explore games" Search. Reads the initial filter
// set from the URL query (?player=&family=&year=&tournament=), shows a filtered,
// paginated games table, and lets the user refine the filters in place.
// Public page — no login required.

const RESULT_LABEL = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½', '*': '*' };

export default function MasterGamesBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter state seeded from the URL.
  const [filters, setFilters] = useState({ families: [], years: [], tournaments: [] });
  const [family, setFamily] = useState(searchParams.get('family') || '');
  const [opening, setOpening] = useState(searchParams.get('opening') || '');
  const [variations, setVariations] = useState([]);
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [player, setPlayer] = useState(searchParams.get('player') || '');
  const [playerInput, setPlayerInput] = useState(searchParams.get('player') || '');
  const [playerSuggest, setPlayerSuggest] = useState([]);
  const [tournament, setTournament] = useState(searchParams.get('tournament') || '');
  const [tournamentInput, setTournamentInput] = useState(searchParams.get('tournament') || '');
  const [tournamentSuggest, setTournamentSuggest] = useState([]);

  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openGameId, setOpenGameId] = useState(null);

  const suggestTimer = useRef(null);

  // Filter option lists.
  useEffect(() => {
    api.get('/api/master-games/filters')
      .then(res => setFilters(res.data || { families: [], years: [], tournaments: [] }))
      .catch(() => {});
  }, []);

  // Variations when a family is chosen.
  useEffect(() => {
    if (!family) { setVariations([]); return; }
    api.get('/api/master-games/variations', { params: { family } })
      .then(res => setVariations(res.data.variations || []))
      .catch(() => setVariations([]));
  }, [family]);

  // Load games whenever a committed filter or page changes.
  const loadGames = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (family) params.family = family;
    if (opening) params.opening = opening;
    if (tournament) params.tournament = tournament;
    if (year) params.year = year;
    if (player) params.player = player;
    api.get('/api/master-games', { params })
      .then(res => {
        setGames(res.data.games || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => { setGames([]); setTotal(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [page, family, opening, tournament, year, player]);

  useEffect(() => { loadGames(); }, [loadGames]);
  useEffect(() => { setPage(1); }, [family, opening, tournament, year, player]);

  // Keep the URL in sync with committed filters (shareable + back button).
  useEffect(() => {
    const next = {};
    if (player) next.player = player;
    if (family) next.family = family;
    if (opening) next.opening = opening;
    if (year) next.year = year;
    if (tournament) next.tournament = tournament;
    setSearchParams(next, { replace: true });
  }, [player, family, opening, year, tournament, setSearchParams]);

  // Player autocomplete.
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = playerInput.trim();
    if (q.length < 2) { setPlayerSuggest([]); return; }
    suggestTimer.current = setTimeout(() => {
      api.get('/api/master-games/players', { params: { q } })
        .then(res => setPlayerSuggest(res.data.players || []))
        .catch(() => setPlayerSuggest([]));
    }, 250);
    return () => suggestTimer.current && clearTimeout(suggestTimer.current);
  }, [playerInput]);

  // Tournament typeahead (local filter over the loaded list — thousands of them).
  useEffect(() => {
    const q = tournamentInput.trim().toLowerCase();
    if (q.length < 2 || tournament) { setTournamentSuggest([]); return; }
    setTournamentSuggest((filters.tournaments || []).filter(t => t.toLowerCase().includes(q)).slice(0, 12));
  }, [tournamentInput, tournament, filters.tournaments]);

  const commitPlayer = (name) => { setPlayer(name); setPlayerInput(name); setPlayerSuggest([]); };
  const commitTournament = (t) => { setTournament(t); setTournamentInput(t); setTournamentSuggest([]); };

  const clearAll = () => {
    setFamily(''); setOpening(''); setYear('');
    setPlayer(''); setPlayerInput(''); setPlayerSuggest([]);
    setTournament(''); setTournamentInput(''); setTournamentSuggest([]);
  };

  const hasAnyFilter = family || opening || year || player || tournament;

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <button style={st.back} onClick={() => navigate('/master-games')}>‹ Master Games</button>
        <h1 style={st.h1}>Browse games</h1>

        {/* ── Filters ── */}
        <div style={st.filters}>
          <div style={{ position: 'relative' }}>
            <input style={st.input} placeholder="Player…" value={playerInput}
              onChange={e => setPlayerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitPlayer(playerInput.trim()); }} />
            {playerSuggest.length > 0 && (
              <div style={st.suggestBox}>
                {playerSuggest.map(name => (
                  <div key={name} style={st.suggestItem} onClick={() => commitPlayer(name)}>{displayName(name)}</div>
                ))}
              </div>
            )}
          </div>

          <select style={st.select} value={family} onChange={e => { setFamily(e.target.value); setOpening(''); }}>
            <option value="">All openings</option>
            {filters.families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {family && (
            <select style={st.select} value={opening} onChange={e => setOpening(e.target.value)} disabled={!variations.length}>
              <option value="">All {family} variations</option>
              {variations.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}

          <select style={st.select} value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All years</option>
            {filters.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div style={{ position: 'relative' }}>
            <input style={st.input} placeholder="Tournament…" value={tournament || tournamentInput}
              onChange={e => { setTournament(''); setTournamentInput(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && tournamentInput.trim()) commitTournament(tournamentInput.trim()); }} />
            {tournamentSuggest.length > 0 && (
              <div style={st.suggestBox}>
                {tournamentSuggest.map(t => (
                  <div key={t} style={st.suggestItem} onClick={() => commitTournament(t)}>{t}</div>
                ))}
              </div>
            )}
          </div>

          {hasAnyFilter && <button style={st.clearBtn} onClick={clearAll}>Clear</button>}
        </div>

        {/* ── Games list ── */}
        <div style={st.listMeta}>{loading ? 'Loading…' : `${total.toLocaleString()} game${total === 1 ? '' : 's'}`}</div>
        <div style={st.table}>
          <div style={{ ...st.row, ...st.headRow }}>
            <span style={st.cPlayers}>Players</span>
            <span style={st.cResult}>Result</span>
            <span style={st.cOpening}>Opening</span>
            <span style={st.cEvent}>Event</span>
            <span style={st.cYear}>Year</span>
          </div>
          {games.map(g => (
            <div key={g._id} style={st.row} onClick={() => setOpenGameId(g._id)}
              onMouseEnter={e => { e.currentTarget.style.background = C.rowHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={st.cPlayers}>
                <div><strong>{displayName(g.white)}</strong>{g.whiteElo ? ` (${g.whiteElo})` : ''}</div>
                <div style={st.blackName}>{displayName(g.black)}{g.blackElo ? ` (${g.blackElo})` : ''}</div>
              </span>
              <span style={st.cResult}>{RESULT_LABEL[g.result] || g.result}</span>
              <span style={st.cOpening}>{g.eco ? `${g.eco} ` : ''}{g.opening || '—'}</span>
              <span style={st.cEvent}>{g.event || g.tournament || '—'}</span>
              <span style={st.cYear}>{g.year || '—'}</span>
            </div>
          ))}
          {!loading && games.length === 0 && (
            <div style={st.empty}>No games found. {hasAnyFilter ? 'Try clearing filters.' : ''}</div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={st.pager}>
            <button style={st.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={st.pageInfo}>Page {page} of {totalPages}</span>
            <button style={st.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}

        {openGameId && <GameAnalysisModal gameId={openGameId} onClose={() => setOpenGameId(null)} />}
      </div>
    </div>
  );
}

function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

const C = {
  ink: '#0a0c10', glass: 'rgba(22, 26, 34, 0.66)', glassSolid: '#12151c',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0', textMut: '#8b93a7', textFaint: '#5d6577',
  accent: '#a78bfa', rowHover: 'rgba(167,139,250,0.10)'
};

const st = {
  wrap: { minHeight: '100vh', padding: '24px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  back: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 16px', color: '#fff' },

  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
  input: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, minWidth: 170, background: C.glass, color: C.text, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.glass, color: C.text, maxWidth: 220, outline: 'none' },
  clearBtn: { padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', cursor: 'pointer', fontSize: 14 },
  suggestBox: { position: 'absolute', top: '100%', left: 0, right: 0, background: C.glassSolid, border: `1px solid ${C.borderStrong}`, borderRadius: 10, marginTop: 4, zIndex: 20, maxHeight: 240, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.55)', minWidth: 200 },
  suggestItem: { padding: '9px 12px', cursor: 'pointer', fontSize: 14, color: C.text },

  listMeta: { color: C.textMut, fontSize: 13, marginBottom: 8 },
  table: { background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14, gap: 8, color: C.text, transition: 'background 120ms ease' },
  headRow: { background: 'rgba(255,255,255,0.03)', fontWeight: 700, cursor: 'default', color: C.textMut, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  cPlayers: { flex: '2 1 0', minWidth: 0 },
  blackName: { color: C.textMut },
  cResult: { flex: '0 0 64px', textAlign: 'center', fontWeight: 600, color: '#fff' },
  cOpening: { flex: '2 1 0', minWidth: 0, color: C.textMut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cEvent: { flex: '1.5 1 0', minWidth: 0, color: C.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cYear: { flex: '0 0 56px', textAlign: 'right', color: C.textFaint },
  empty: { padding: 32, textAlign: 'center', color: C.textFaint },

  pager: { display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  pageBtn: { padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.glass, color: C.text, cursor: 'pointer', fontSize: 14 },
  pageInfo: { color: C.textMut, fontSize: 14 }
};
