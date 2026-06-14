import React, { useState } from 'react';
import { Chess } from 'chess.js';

export default function FenBar({ fen, onFenChange }) {
  const [input, setInput] = useState(fen);
  const [error, setError] = useState('');

  // Sync input when fen prop changes from board edits
  React.useEffect(() => {
    setInput(fen);
    setError('');
  }, [fen]);

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    try {
      const c = new Chess(val.trim());
      setError('');
      onFenChange(c.fen());
    } catch {
      setError('Invalid FEN');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(fen).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={handleChange}
          spellCheck={false}
          placeholder="Paste FEN here..."
          style={{
            flex: 1,
            background: error ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.4)',
            border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 12px',
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={handleCopy}
          title="Copy FEN"
          style={{
            padding: '8px 14px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 8,
            color: '#a5b4fc',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          📋 Copy
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
    </div>
  );
}
