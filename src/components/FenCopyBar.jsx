// src/components/FenCopyBar.jsx
// Read-only FEN strip shown under a study chessboard, so a user can grab the
// current position and paste it into an engine/analysis board.
//
// Distinct from PositionEditor/FenBar, which is an *editable* input requiring an
// onFenChange handler — study views are driven by the move tree, so the FEN here
// is display-only.
import React, { useState, useRef, useEffect } from 'react';
import { copyText } from '../utils/clipboard';

export default function FenCopyBar({ fen, style }) {
  const [state, setState] = useState('idle'); // 'idle' | 'copied' | 'failed'
  const timer = useRef(null);

  // Don't setState after unmount, and reset the label if the position changes.
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setState('idle'); }, [fen]);

  if (!fen) return null;

  const onCopy = async () => {
    const ok = await copyText(fen);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };

  const label = state === 'copied' ? '✓ Copied' : state === 'failed' ? 'Press Ctrl+C' : '📋 Copy';

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%',
                  maxWidth: '100%', marginTop: 10, ...style }}>
      <input
        value={fen}
        readOnly
        spellCheck={false}
        aria-label="FEN of the current position"
        onFocus={(e) => e.target.select()}
        style={{
          flex: 1, minWidth: 0,
          background: 'var(--color-black-a35)',
          border: '1px solid var(--color-white-a13)',
          borderRadius: 8, color: 'var(--color-text)',
          padding: '8px 12px', fontSize: 12, fontFamily: 'monospace',
          outline: 'none', textOverflow: 'ellipsis',
        }}
      />
      <button
        onClick={onCopy}
        title="Copy FEN to clipboard"
        style={{
          padding: '8px 14px',
          background: state === 'copied' ? 'var(--color-success-a20)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${state === 'copied' ? 'var(--color-success-a30)' : 'rgba(99,102,241,0.4)'}`,
          borderRadius: 8,
          color: state === 'copied' ? 'var(--color-success)' : 'var(--color-accent-2)',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    </div>
  );
}
