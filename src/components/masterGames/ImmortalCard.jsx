import React from 'react';
import Chessboard from '../Chessboard';

// ── Immortal-game card ────────────────────────────────────────────────────────
// A clickable card with a small static board thumbnail + the game's headers,
// matching the Master Games "famous games" look. Click → opens the analysis popup
// (handled by the parent via onOpen).

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Stored "Last, First" → "Last, F." compact label like the mockup.
function compactName(name) {
  if (!name) return '';
  const i = name.indexOf(',');
  if (i === -1) return name;
  const last = name.slice(0, i).trim();
  const first = name.slice(i + 1).trim();
  return first ? `${last}, ${first.charAt(0).toUpperCase()}.` : last;
}

export default function ImmortalCard({ game, onOpen, size = 128 }) {
  return (
    <button style={st.card} onClick={() => onOpen?.(game._id)}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = C.accent; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ ...st.board, width: size, height: size }}>
        <Chessboard
          position={game.thumbFen || START_FEN}
          boardWidth={size}
          draggable={false}
          showCoordinates={false}
          transitionDuration={0}
          mute
        />
      </div>
      <div style={st.info}>
        <div style={st.players}>
          <div>{compactName(game.white)}</div>
          <div>{compactName(game.black)}</div>
        </div>
        <div style={st.event}>{game.event || '—'}{game.year ? `, ${game.year}` : ''}</div>
        {game.opening && <div style={st.opening}>{game.opening}</div>}
      </div>
      <span style={st.star} title="Immortal game">★</span>
    </button>
  );
}

const C = {
  glass: 'rgba(22, 26, 34, 0.66)', border: 'rgba(255,255,255,0.08)',
  text: '#e7eaf0', textMut: '#8b93a7', textFaint: '#5d6577', accent: '#f5c451'
};

const st = {
  card: { position: 'relative', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left',
    background: C.glass, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, cursor: 'pointer',
    color: C.text, transition: 'transform 150ms ease, border-color 150ms ease',
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)', width: '100%' },
  board: { flexShrink: 0, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' },
  info: { flex: 1, minWidth: 0 },
  players: { fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.35 },
  event: { fontSize: 13, color: C.textMut, marginTop: 6 },
  opening: { fontSize: 13, color: C.textFaint, fontStyle: 'italic', marginTop: 2 },
  star: { position: 'absolute', top: 12, right: 14, color: C.accent, fontSize: 18, lineHeight: 1 }
};
