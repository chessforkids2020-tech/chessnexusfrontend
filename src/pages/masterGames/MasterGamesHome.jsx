import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../../api';
import ImmortalCard from '../../components/masterGames/ImmortalCard';
import GameAnalysisModal from '../../components/masterGames/GameAnalysisModal';

// Featured photos live in the frontend public/ dir (served at /players/<file>),
// so a root-relative path is resolved by the browser against the frontend origin.
// Anything else (uploads / absolute URLs) goes through the API asset resolver.
function photoSrc(url) {
  if (!url) return '';
  if (url.startsWith('/players/')) return url;
  return resolveApiAssetUrl(url);
}

// ── Master Games HOME / landing ───────────────────────────────────────────────
// Top: 5 featured players (photo + game count) → click to a player page.
// Middle: an "Explore games" panel (player / opening / year / tournament filters
//         + Search) that navigates to the browse results page.
// Bottom: a stats strip (players · games · tournaments · years of games).
// Public page — no login required.

export default function MasterGamesHome() {
  const navigate = useNavigate();

  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState(null);
  const [immortal, setImmortal] = useState([]);
  const [immortalTotal, setImmortalTotal] = useState(0);
  const [openGameId, setOpenGameId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Explore-panel filter state (mirrors the browse page params).
  const [filters, setFilters] = useState({ families: [], years: [], tournaments: [] });
  const [family, setFamily] = useState('');
  const [year, setYear] = useState('');
  const [tournament, setTournament] = useState('');
  const [playerInput, setPlayerInput] = useState('');
  const [playerSuggest, setPlayerSuggest] = useState([]);
  const [tournamentInput, setTournamentInput] = useState('');
  const [tournamentSuggest, setTournamentSuggest] = useState([]);
  const suggestTimer = useRef(null);

  // Load home data (featured players + stats) and the filter dropdown options.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/master-games/home').then(r => r.data).catch(() => null),
      api.get('/api/master-games/filters').then(r => r.data).catch(() => null)
    ]).then(([home, f]) => {
      if (home) {
        setFeatured(home.featured || []);
        setStats(home.stats || null);
        setImmortal(home.immortal || []);
        setImmortalTotal(home.immortalTotal || 0);
      }
      if (f) setFilters(f);
    }).finally(() => setLoading(false));
  }, []);

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

  // Tournament typeahead — there are thousands, so we filter the loaded list locally.
  useEffect(() => {
    const q = tournamentInput.trim().toLowerCase();
    if (q.length < 2) { setTournamentSuggest([]); return; }
    setTournamentSuggest(
      (filters.tournaments || []).filter(t => t.toLowerCase().includes(q)).slice(0, 12)
    );
  }, [tournamentInput, filters.tournaments]);

  const openPlayer = (name) => navigate(`/master-games/player/${encodeURIComponent(name)}`);

  // Build the browse URL from the selected filters and navigate.
  const runSearch = useCallback(() => {
    const params = new URLSearchParams();
    const p = playerInput.trim();
    const t = tournament || tournamentInput.trim();
    if (p) params.set('player', p);
    if (family) params.set('family', family);
    if (year) params.set('year', year);
    if (t) params.set('tournament', t);
    navigate(`/master-games/browse${params.toString() ? `?${params}` : ''}`);
  }, [navigate, playerInput, family, year, tournament, tournamentInput]);

  const fmt = (n) => (n == null ? '—' : n.toLocaleString());
  const roundDown = (n, step) => Math.floor((n || 0) / step) * step;

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <h1 style={st.h1}>Master Games</h1>
        <p style={st.sub}>Study the famous players. Pick a champion to browse their games, or explore the whole library by opening, year and tournament.</p>

        {/* ── Featured players ── */}
        <div style={st.sectionHead}>
          <h2 style={st.sectionTitle}>Featured players</h2>
          <button style={st.viewAll} onClick={() => navigate('/master-games/players')}>View all ›</button>
        </div>
        <div style={st.playerRow}>
          {loading && featured.length === 0 && <div style={st.muted}>Loading…</div>}
          {featured.map(p => (
            <button key={p.name} style={st.playerCard} onClick={() => openPlayer(p.name)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = C.border; }}>
              <div style={st.playerPhoto}>
                {p.photoUrl
                  ? <img src={photoSrc(p.photoUrl)} alt={p.name} style={st.playerPhotoImg} />
                  : <span style={st.playerPhotoPlaceholder}>{displayName(p.name).charAt(0).toUpperCase()}</span>}
              </div>
              <div style={st.playerCardName}>
                {p.title && <span style={st.title}>{p.title} </span>}{displayName(p.name)}
              </div>
              <div style={st.playerCardCount}>{fmt(p.games)} games</div>
            </button>
          ))}
        </div>

        {/* ── Explore games ── */}
        <div style={st.exploreBar}>
          <div style={st.exploreTitle}>Explore games</div>
          <div style={st.exploreFilters}>
            {/* Player search */}
            <div style={{ position: 'relative' }}>
              <input style={st.input} placeholder="Player…" value={playerInput}
                onChange={e => setPlayerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} />
              {playerSuggest.length > 0 && (
                <div style={st.suggestBox}>
                  {playerSuggest.map(name => (
                    <div key={name} style={st.suggestItem}
                      onClick={() => { setPlayerInput(name); setPlayerSuggest([]); }}>{displayName(name)}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Opening */}
            <select style={st.select} value={family} onChange={e => setFamily(e.target.value)}>
              <option value="">All openings</option>
              {filters.families.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            {/* Year */}
            <select style={st.select} value={year} onChange={e => setYear(e.target.value)}>
              <option value="">All years</option>
              {filters.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Tournament typeahead (thousands of them → searchable, not a giant select) */}
            <div style={{ position: 'relative' }}>
              <input style={st.input} placeholder="Tournament…"
                value={tournament || tournamentInput}
                onChange={e => { setTournament(''); setTournamentInput(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} />
              {tournamentSuggest.length > 0 && !tournament && (
                <div style={st.suggestBox}>
                  {tournamentSuggest.map(t => (
                    <div key={t} style={st.suggestItem}
                      onClick={() => { setTournament(t); setTournamentInput(t); setTournamentSuggest([]); }}>{t}</div>
                  ))}
                </div>
              )}
            </div>

            <button style={st.searchBtn} onClick={runSearch}>🔍 Search</button>
          </div>
        </div>

        {/* ── Immortal games ── */}
        {immortal.length > 0 && (
          <div style={st.immortalSection}>
            <div style={st.immortalHead}>
              <h2 style={st.sectionTitle}>★ Immortal games</h2>
              <button style={st.seeAll} onClick={() => navigate('/master-games/immortal')}>
                See all {immortalTotal > immortal.length ? `(${immortalTotal})` : ''} ›
              </button>
            </div>
            <div style={st.immortalGrid}>
              {immortal.map(g => (
                <ImmortalCard key={g._id} game={g} onOpen={setOpenGameId} />
              ))}
            </div>
          </div>
        )}

        {/* ── Stats strip ── */}
        {stats && (
          <div style={st.statsStrip}>
            <Stat value={fmt(stats.players)} label="Top players" />
            <Stat value={`${fmt(roundDown(stats.games, 1000))}+`} label="Games added" />
            <Stat value={`${fmt(roundDown(stats.tournaments, 100))}+`} label="Tournaments" />
            <Stat value={stats.yearSpan || 0} label="Years of games"
              sub={stats.minYear && stats.maxYear ? `${stats.minYear}–${stats.maxYear}` : ''} />
          </div>
        )}

        {openGameId && <GameAnalysisModal gameId={openGameId} onClose={() => setOpenGameId(null)} />}
      </div>
    </div>
  );
}

// Display names are stored "Last, First" — show "First Last" for readability.
function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

function Stat({ value, label, sub }) {
  return (
    <div style={st.stat}>
      <div style={st.statValue}>{value}</div>
      <div style={st.statLabel}>{label}</div>
      {sub && <div style={st.statSub}>{sub}</div>}
    </div>
  );
}

// ── Theme tokens (mirror the MasterGames viewer) ──────────────────────────────
const C = {
  ink: '#0a0c10',
  glass: 'rgba(22, 26, 34, 0.66)',
  glassSolid: '#12151c',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0',
  textMut: '#8b93a7',
  textFaint: '#5d6577',
  accent: '#a78bfa'
};

const st = {
  wrap: { minHeight: '100vh', padding: '32px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  h1: { fontSize: 30, fontWeight: 700, margin: '0 0 4px', color: '#fff', letterSpacing: 0.2 },
  sub: { color: C.textMut, margin: '0 0 24px', fontSize: 14 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: C.textMut, textTransform: 'uppercase', letterSpacing: 0.6, margin: 0 },
  viewAll: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  muted: { color: C.textMut, fontSize: 14 },

  immortalSection: { marginBottom: 24 },
  immortalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  seeAll: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  immortalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },

  playerRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 },
  playerCard: { flex: '1 1 180px', maxWidth: 240, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 16px', cursor: 'pointer', textAlign: 'center', color: C.text, transition: 'transform 150ms ease, border-color 150ms ease', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  playerPhoto: { width: 150, height: 150, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  playerPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  playerPhotoPlaceholder: { fontSize: 60, fontWeight: 700, color: C.textFaint },
  playerCardName: { fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.25 },
  title: { color: C.accent, fontWeight: 700 },
  playerCardCount: { fontSize: 12, color: C.textMut, marginTop: 3 },

  exploreBar: { background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  exploreTitle: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 },
  exploreFilters: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, minWidth: 160, background: C.glassSolid, color: C.text, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.glassSolid, color: C.text, maxWidth: 200, outline: 'none' },
  searchBtn: { padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: 'rgba(167,139,250,0.18)', color: C.accent, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  suggestBox: { position: 'absolute', top: '100%', left: 0, right: 0, background: C.glassSolid, border: `1px solid ${C.borderStrong}`, borderRadius: 10, marginTop: 4, zIndex: 20, maxHeight: 240, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.55)', minWidth: 200 },
  suggestItem: { padding: '9px 12px', cursor: 'pointer', fontSize: 14, color: C.text },

  statsStrip: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  stat: { flex: '1 1 140px', background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  statValue: { fontSize: 26, fontWeight: 800, color: '#fff' },
  statLabel: { fontSize: 12, color: C.textMut, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  statSub: { fontSize: 11, color: C.textFaint, marginTop: 2 }
};
