import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../../api';
import GameAnalysisModal from '../../components/masterGames/GameAnalysisModal';

// Featured photos are frontend public/ assets at /players/<file> — keep that path
// as-is (browser resolves it against the frontend origin); resolve everything else.
function photoSrc(url) {
  if (!url) return '';
  if (url.startsWith('/players/')) return url;
  return resolveApiAssetUrl(url);
}

// ── Master Games — single player page ─────────────────────────────────────────
// Top: player photo (placeholder until a profile photo is saved) + chess info.
// Below: that player's games, paginated 25/page. Click a game → analysis popup.
// Public page — no login required.

const RESULT_LABEL = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½', '*': '*' };

export default function MasterPlayer() {
  const { name } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name || '');

  const [player, setPlayer] = useState(null);
  const [gameCount, setGameCount] = useState(0);
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openGameId, setOpenGameId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/master-games/player/${encodeURIComponent(decodedName)}`, { params: { page, limit: 25 } })
      .then(res => {
        setPlayer(res.data.player || { name: decodedName });
        setGameCount(res.data.gameCount || 0);
        setGames(res.data.games || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => { setGames([]); setGameCount(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [decodedName, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const display = displayName(player?.name || decodedName);

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <button style={st.back} onClick={() => navigate('/master-games')}>‹ Master Games</button>

        {/* ── Player header ── */}
        <div style={st.header}>
          <div style={st.avatar}>
            {player?.photoUrl
              ? <img src={photoSrc(player.photoUrl)} alt={display} style={st.avatarImg} />
              : <span style={st.avatarPlaceholder}>{display.charAt(0).toUpperCase()}</span>}
          </div>
          <div style={st.headerInfo}>
            <div style={st.playerName}>
              {player?.title && <span style={st.title}>{player.title} </span>}{display}
            </div>
            <div style={st.playerMeta}>
              {player?.country && <span>{player.country}</span>}
              {player?.peakRating && <span>Peak {player.peakRating}</span>}
              <span>{gameCount.toLocaleString()} game{gameCount === 1 ? '' : 's'}</span>
            </div>
            {player?.bio
              ? <div style={st.playerBio}>{player.bio}</div>
              : <div style={st.playerBioEmpty}>Player information coming soon.</div>}
          </div>
        </div>

        {/* ── Games (25/page) ── */}
        <div style={st.listMeta}>{loading ? 'Loading…' : `${gameCount.toLocaleString()} game${gameCount === 1 ? '' : 's'}`}</div>
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
          {!loading && games.length === 0 && <div style={st.empty}>No games found for this player.</div>}
        </div>

        {/* ── Pagination ── */}
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

// Stored "Last, First" → "First Last" for display.
function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

const C = {
  ink: '#0a0c10', glass: 'rgba(22, 26, 34, 0.66)',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e7eaf0', textMut: '#8b93a7', textFaint: '#5d6577',
  accent: '#a78bfa', rowHover: 'rgba(167,139,250,0.10)'
};

const st = {
  wrap: { minHeight: '100vh', padding: '24px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  back: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 },

  header: { display: 'flex', gap: 20, alignItems: 'center', padding: 20, background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.45)', marginBottom: 20 },
  avatar: { width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { fontSize: 44, fontWeight: 700, color: C.textFaint },
  headerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 26, fontWeight: 800, color: '#fff' },
  title: { color: C.accent, fontWeight: 700 },
  playerMeta: { display: 'flex', gap: 16, color: C.textMut, fontSize: 13, marginTop: 4 },
  playerBio: { color: C.text, fontSize: 14, marginTop: 10, opacity: 0.9, lineHeight: 1.5 },
  playerBioEmpty: { color: C.textFaint, fontSize: 13, marginTop: 10, fontStyle: 'italic' },

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
