import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { resolveApiAssetUrl } from '../../api';
import GameAnalysisModal from '../../components/masterGames/GameAnalysisModal';

// ── Master Games viewer ───────────────────────────────────────────────────────
// Browse professional games with filters (Opening / Player / Year / Tournament).
// Click a game to open the Lichess-style analysis popup (board + notation +
// variation exploration). Public page — no login required.

const RESULT_LABEL = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½', '*': '*' };

export default function MasterGames() {
  // Filter state
  const [filters, setFilters] = useState({ families: [], years: [], tournaments: [] });
  const [family, setFamily] = useState('');           // level-1: major opening
  const [variations, setVariations] = useState([]);   // variations within the chosen family
  const [opening, setOpening] = useState('');          // level-2: specific variation
  const [tournament, setTournament] = useState('');
  const [year, setYear] = useState('');
  const [player, setPlayer] = useState('');          // committed player filter
  const [playerInput, setPlayerInput] = useState(''); // search box text
  const [playerSuggest, setPlayerSuggest] = useState([]);

  // Selected-player header
  const [playerHeader, setPlayerHeader] = useState(null); // { player, gameCount, hasProfile }

  // Games list
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Popup
  const [openGameId, setOpenGameId] = useState(null);

  const suggestTimer = useRef(null);

  // Load filter dropdown options once.
  useEffect(() => {
    api.get('/api/master-games/filters')
      .then(res => setFilters(res.data || { families: [], years: [], tournaments: [] }))
      .catch(() => {});
  }, []);

  // Load variations when a major opening (family) is chosen; reset variation choice.
  useEffect(() => {
    setOpening('');
    if (!family) { setVariations([]); return; }
    api.get('/api/master-games/variations', { params: { family } })
      .then(res => setVariations(res.data.variations || []))
      .catch(() => setVariations([]));
  }, [family]);

  // Load games whenever a filter or page changes.
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

  // Reset to page 1 whenever the filter set changes.
  useEffect(() => { setPage(1); }, [family, opening, tournament, year, player]);

  // Load the player header when a player filter is committed.
  useEffect(() => {
    if (!player) { setPlayerHeader(null); return; }
    api.get(`/api/master-games/player/${encodeURIComponent(player)}`)
      .then(res => setPlayerHeader(res.data))
      .catch(() => setPlayerHeader(null));
  }, [player]);

  // Player search autocomplete (debounced).
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

  const commitPlayer = (name) => {
    setPlayer(name);
    setPlayerInput(name);
    setPlayerSuggest([]);
  };

  const clearAll = () => {
    setFamily(''); setOpening(''); setTournament(''); setYear('');
    setPlayer(''); setPlayerInput(''); setPlayerSuggest([]);
  };

  const hasAnyFilter = family || opening || tournament || year || player;

  return (
    <div style={st.wrap}>
     <div style={st.inner}>
      <h1 style={st.h1}>Master Games</h1>
      <p style={st.sub}>Browse professional games. Filter by opening, player, year or tournament, then click a game to study it on an interactive board.</p>

      {/* ── Player header (top-left) — only when a player is selected ── */}
      {playerHeader && (
        <div style={st.playerHeader}>
          <div style={st.avatar}>
            {playerHeader.player?.photoUrl
              ? <img src={resolveApiAssetUrl(playerHeader.player.photoUrl)} alt={playerHeader.player.name} style={st.avatarImg} />
              : <span style={st.avatarPlaceholder}>{(playerHeader.player?.name || '?').charAt(0).toUpperCase()}</span>}
          </div>
          <div style={st.playerInfo}>
            <div style={st.playerName}>
              {playerHeader.player?.title && <span style={st.title}>{playerHeader.player.title}</span>}
              {playerHeader.player?.name}
            </div>
            <div style={st.playerMeta}>
              {playerHeader.player?.country && <span>{playerHeader.player.country}</span>}
              {playerHeader.player?.peakRating && <span>Peak {playerHeader.player.peakRating}</span>}
              <span>{playerHeader.gameCount} game{playerHeader.gameCount === 1 ? '' : 's'}</span>
            </div>
            {playerHeader.player?.bio && <div style={st.playerBio}>{playerHeader.player.bio}</div>}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={st.filters}>
        {/* Player search */}
        <div style={{ position: 'relative' }}>
          <input
            style={st.input}
            placeholder="Search player…"
            value={playerInput}
            onChange={e => setPlayerInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitPlayer(playerInput.trim()); }}
          />
          {playerSuggest.length > 0 && (
            <div style={st.suggestBox}>
              {playerSuggest.map(name => (
                <div key={name} style={st.suggestItem} onClick={() => commitPlayer(name)}>{name}</div>
              ))}
            </div>
          )}
        </div>

        {/* Level 1: major opening */}
        <select style={st.select} value={family} onChange={e => setFamily(e.target.value)}>
          <option value="">All openings</option>
          {filters.families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Level 2: variation within the chosen family */}
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

        <select style={st.select} value={tournament} onChange={e => setTournament(e.target.value)}>
          <option value="">All tournaments</option>
          {filters.tournaments.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {hasAnyFilter && <button style={st.clearBtn} onClick={clearAll}>Clear</button>}
      </div>

      {/* ── Games list ── */}
      <div style={st.listMeta}>{loading ? 'Loading…' : `${total} game${total === 1 ? '' : 's'}`}</div>

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
              <div><strong>{g.white}</strong>{g.whiteElo ? ` (${g.whiteElo})` : ''}</div>
              <div style={st.blackName}>{g.black}{g.blackElo ? ` (${g.blackElo})` : ''}</div>
            </span>
            <span style={st.cResult}>{RESULT_LABEL[g.result] || g.result}</span>
            <span style={st.cOpening}>{g.eco ? `${g.eco} ` : ''}{g.opening || '—'}</span>
            <span style={st.cEvent}>{g.event || g.tournament || '—'}</span>
            <span style={st.cYear}>{g.year || '—'}</span>
          </div>
        ))}
        {!loading && games.length === 0 && (
          <div style={st.empty}>No games found. {hasAnyFilter ? 'Try clearing filters.' : 'Import games to get started.'}</div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={st.pager}>
          <button style={st.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span style={st.pageInfo}>Page {page} of {totalPages}</span>
          <button style={st.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}

      {/* ── Analysis popup ── */}
      {openGameId && (
        <GameAnalysisModal gameId={openGameId} onClose={() => setOpenGameId(null)} />
      )}
     </div>
    </div>
  );
}

// ── Obsidian glass dark theme tokens ──────────────────────────────────────────
const C = {
  ink: '#0a0c10',                 // page background
  glass: 'rgba(22, 26, 34, 0.66)',// frosted panel fill
  glassSolid: '#12151c',          // opaque variant (dropdowns)
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0',
  textMut: '#8b93a7',
  textFaint: '#5d6577',
  accent: '#a78bfa',              // matches the "Masters Game" card violet
  rowHover: 'rgba(167,139,250,0.10)'
};

const st = {
  wrap: { minHeight: '100vh', maxWidth: '100%', margin: 0, padding: '32px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: '#fff', letterSpacing: 0.2 },
  sub: { color: C.textMut, margin: '0 0 20px', fontSize: 14 },

  playerHeader: { display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.45)', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { fontSize: 30, fontWeight: 700, color: C.textFaint },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 20, fontWeight: 700, color: '#fff' },
  title: { color: C.accent, fontWeight: 700, marginRight: 8 },
  playerMeta: { display: 'flex', gap: 14, color: C.textMut, fontSize: 13, marginTop: 2 },
  playerBio: { color: C.text, fontSize: 13, marginTop: 6, opacity: 0.85 },

  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
  input: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, minWidth: 180, background: C.glass, color: C.text, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.glass, color: C.text, maxWidth: 220, outline: 'none' },
  clearBtn: { padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', cursor: 'pointer', fontSize: 14 },
  suggestBox: { position: 'absolute', top: '100%', left: 0, right: 0, background: C.glassSolid, border: `1px solid ${C.borderStrong}`, borderRadius: 10, marginTop: 4, zIndex: 20, maxHeight: 220, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.55)' },
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
