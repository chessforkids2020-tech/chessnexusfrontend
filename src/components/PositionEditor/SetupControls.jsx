import React from 'react';

const EP_SQUARES_WHITE = ['a6','b6','c6','d6','e6','f6','g6','h6'];
const EP_SQUARES_BLACK = ['a3','b3','c3','d3','e3','f3','g3','h3'];

export default function SetupControls({ chess, onFenChange }) {
  const fen = chess.fen();
  const parts = fen.split(' ');
  const turn = parts[1] || 'w';
  const castling = parts[2] || '-';
  const ep = parts[3] || '-';

  function updateFenPart(index, value) {
    const p = fen.split(' ');
    p[index] = value;
    // Rebuild with proper defaults
    if (!p[4]) p[4] = '0';
    if (!p[5]) p[5] = '1';
    onFenChange(p.join(' '));
  }

  function toggleCastle(flag) {
    let c = castling === '-' ? '' : castling;
    if (c.includes(flag)) {
      c = c.replace(flag, '');
    } else {
      const order = 'KQkq';
      c = order.split('').filter(f => (c + flag).includes(f)).join('');
    }
    updateFenPart(2, c || '-');
  }

  const castleBtn = (flag, label) => (
    <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={castling.includes(flag)}
        onChange={() => toggleCastle(flag)}
        style={{ accentColor: '#6366f1', width: 15, height: 15 }}
      />
      <span style={{ color: '#d1d5db', fontSize: 13 }}>{label}</span>
    </label>
  );

  const epSquares = turn === 'w' ? EP_SQUARES_BLACK : EP_SQUARES_WHITE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Side to move */}
      <div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Side to Move</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['w', 'b'].map(c => (
            <button
              key={c}
              onClick={() => updateFenPart(1, c)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: turn === c ? (c === 'w' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)') : 'rgba(255,255,255,0.04)',
                border: turn === c ? '2px solid ' + (c === 'w' ? '#e2e8f0' : '#94a3b8') : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: turn === c ? '#fff' : '#6b7280',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              {c === 'w' ? '♔ White' : '♚ Black'}
            </button>
          ))}
        </div>
      </div>

      {/* Castling rights */}
      <div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Castling Rights</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {castleBtn('K', 'White O-O')}
          {castleBtn('Q', 'White O-O-O')}
          {castleBtn('k', 'Black O-O')}
          {castleBtn('q', 'Black O-O-O')}
        </div>
      </div>

      {/* En passant */}
      <div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>En Passant</div>
        <select
          value={ep}
          onChange={e => updateFenPart(3, e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 12px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <option value="-">None</option>
          {epSquares.map(sq => <option key={sq} value={sq}>{sq}</option>)}
        </select>
      </div>
    </div>
  );
}
