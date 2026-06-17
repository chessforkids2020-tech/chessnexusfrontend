import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import ImmortalCard from '../../components/masterGames/ImmortalCard';
import GameAnalysisModal from '../../components/masterGames/GameAnalysisModal';

// ── Immortal Games page ───────────────────────────────────────────────────────
// The curated "immortal" collection as a grid of board-thumbnail cards, with
// filters (player / year / opening) scoped to the immortal set. Click a card →
// the analysis popup. Public page — no login required.

export default function ImmortalGames() {
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterOpts, setFilterOpts] = useState({ years: [], families: [], openings: [] });
  const [loading, setLoading] = useState(true);
  const [openGameId, setOpenGameId] = useState(null);

  const [player, setPlayer] = useState('');
  const [year, setYear] = useState('');
  const [opening, setOpening] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (player.trim()) params.player = player.trim();
    if (year) params.year = year;
    if (opening) params.opening = opening;
    api.get('/api/master-games/immortal', { params })
      .then(res => {
        setGames(res.data.games || []);
        setTotal(res.data.total || 0);
        if (res.data.filters) setFilterOpts(res.data.filters);
      })
      .catch(() => { setGames([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [player, year, opening]);

  useEffect(() => { load(); }, [load]);

  const hasFilter = player.trim() || year || opening;
  const clearAll = () => { setPlayer(''); setYear(''); setOpening(''); };

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <button style={st.back} onClick={() => navigate('/master-games')}>‹ Master Games</button>
        <h1 style={st.h1}>★ Immortal Games</h1>
        <p style={st.sub}>A hand-picked collection of the most famous, brilliant games in chess history.</p>

        {/* ── Filters ── */}
        <div style={st.filters}>
          <input style={st.input} placeholder="Player…" value={player}
            onChange={e => setPlayer(e.target.value)} />
          <select style={st.select} value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All years</option>
            {filterOpts.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select style={st.select} value={opening} onChange={e => setOpening(e.target.value)}>
            <option value="">All openings</option>
            {filterOpts.openings.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {hasFilter && <button style={st.clearBtn} onClick={clearAll}>Clear</button>}
        </div>

        <div style={st.listMeta}>{loading ? 'Loading…' : `${total} game${total === 1 ? '' : 's'}`}</div>

        {/* ── Cards ── */}
        <div style={st.grid}>
          {games.map(g => <ImmortalCard key={g._id} game={g} onOpen={setOpenGameId} />)}
        </div>
        {!loading && games.length === 0 && (
          <div style={st.empty}>No immortal games match {hasFilter ? 'these filters.' : 'yet.'}</div>
        )}

        {openGameId && <GameAnalysisModal gameId={openGameId} onClose={() => setOpenGameId(null)} />}
      </div>
    </div>
  );
}

const C = {
  ink: '#0a0c10', glass: 'rgba(22, 26, 34, 0.66)', glassSolid: '#12151c',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0', textMut: '#8b93a7', textFaint: '#5d6577', accent: '#f5c451'
};

const st = {
  wrap: { minHeight: '100vh', padding: '24px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  back: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: '#fff' },
  sub: { color: C.textMut, margin: '0 0 20px', fontSize: 14 },

  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' },
  input: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, minWidth: 170, background: C.glass, color: C.text, outline: 'none' },
  select: { padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.glass, color: C.text, maxWidth: 240, outline: 'none' },
  clearBtn: { padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', cursor: 'pointer', fontSize: 14 },

  listMeta: { color: C.textMut, fontSize: 13, marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  empty: { padding: 32, textAlign: 'center', color: C.textFaint }
};
