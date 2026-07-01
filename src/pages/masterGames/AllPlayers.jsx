import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../../api';

// ── All Master-Games players ──────────────────────────────────────────────────
// Every curated player as a card (same look as the home "Featured players" row).
// Click a card → that player's games page. Public page — no login required.

function photoSrc(url) {
  if (!url) return '';
  if (url.startsWith('/players/')) return url;
  return resolveApiAssetUrl(url);
}

function displayName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${first} ${last}` : last;
}

// Photo with a graceful fallback: if the profile has no photoUrl OR the image file
// 404s (a player whose picture hasn't been added yet), show the letter avatar
// instead of the browser's broken-image icon + alt text.
function PlayerPhoto({ player }) {
  const [failed, setFailed] = useState(false);
  const src = player.photoUrl && !failed ? photoSrc(player.photoUrl) : '';
  return (
    <div style={st.playerPhoto}>
      {src
        ? <img src={src} alt={displayName(player.name)} style={st.playerPhotoImg} onError={() => setFailed(true)} />
        : <span style={st.playerPhotoPlaceholder}>{displayName(player.name).charAt(0).toUpperCase()}</span>}
    </div>
  );
}

export default function AllPlayers() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/master-games/players-all')
      .then(res => setPlayers(res.data.players || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  const openPlayer = (name) => navigate(`/master-games/player/${encodeURIComponent(name)}`);
  const fmt = (n) => (n == null ? '—' : n.toLocaleString());

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <button style={st.back} onClick={() => navigate('/master-games')}>‹ Master Games</button>
        <h1 style={st.h1}>All players</h1>
        <p style={st.sub}>{loading ? 'Loading…' : `${players.length} player${players.length === 1 ? '' : 's'}`}</p>

        <div style={st.grid}>
          {players.map(p => (
            <button key={p.name} style={st.playerCard} onClick={() => openPlayer(p.name)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = C.border; }}>
              <PlayerPhoto player={p} />
              <div style={st.playerCardName}>
                {p.title && <span style={st.title}>{p.title} </span>}{displayName(p.name)}
              </div>
              <div style={st.playerCardCount}>{fmt(p.games)} games</div>
            </button>
          ))}
        </div>
        {!loading && players.length === 0 && <div style={st.empty}>No players found.</div>}
      </div>
    </div>
  );
}

const C = {
  ink: '#0a0c10', glass: 'rgba(22, 26, 34, 0.66)',
  border: 'rgba(255,255,255,0.08)', text: '#e7eaf0',
  textMut: '#8b93a7', textFaint: '#5d6577', accent: '#a78bfa'
};

const st = {
  wrap: { minHeight: '100vh', padding: '24px 16px 64px', fontFamily: 'Poppins, sans-serif', color: C.text, background: `radial-gradient(1200px 600px at 50% -10%, #1a1f2b 0%, ${C.ink} 60%)` },
  inner: { maxWidth: 1000, margin: '0 auto' },
  back: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: '#fff' },
  sub: { color: C.textMut, margin: '0 0 20px', fontSize: 14 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 },
  playerCard: { background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 16px', cursor: 'pointer', textAlign: 'center', color: C.text, transition: 'transform 150ms ease, border-color 150ms ease', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
  playerPhoto: { width: 130, height: 130, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  playerPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  playerPhotoPlaceholder: { fontSize: 52, fontWeight: 700, color: C.textFaint },
  playerCardName: { fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.25 },
  title: { color: C.accent, fontWeight: 700 },
  playerCardCount: { fontSize: 12, color: C.textMut, marginTop: 3 },
  empty: { padding: 32, textAlign: 'center', color: C.textFaint }
};
