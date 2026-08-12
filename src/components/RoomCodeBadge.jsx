// src/components/RoomCodeBadge.jsx
// Shows a race/room code with a copy button.
//
// Coach class races open automatically in each student's Activities tab, so the
// code isn't strictly required to join — but a coach running a live class needs
// to be able to read it out or paste it into chat when a student can't find the
// race. /arena/join accepts any room code, coach-created ones included.
import React, { useState, useRef, useEffect } from 'react';
import { copyText } from '../utils/clipboard';

// Build the full waiting-room URL for a race code. /arena/join already reads
// ?code= and pre-fills the box (see ArenaJoin.jsx), so this needs no new route —
// the link just wasn't being offered anywhere.
export function joinLinkForCode(code) {
  const origin = typeof window !== 'undefined' && window.location
    ? window.location.origin
    : 'https://www.chessnexus.in';
  return `${origin}/arena/join?code=${encodeURIComponent(String(code).toUpperCase())}`;
}

export default function RoomCodeBadge({ code, label = 'Room code', style, showLink = false }) {
  const [state, setState] = useState('idle'); // 'idle' | 'copied' | 'failed'
  // Separate state so the two buttons report their own result independently.
  const [linkState, setLinkState] = useState('idle');
  const timer = useRef(null);
  const linkTimer = useRef(null);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(linkTimer.current); }, []);
  useEffect(() => { setState('idle'); setLinkState('idle'); }, [code]);

  if (!code) return null;

  // Copying the CODE alone means the coach still has to explain where to type
  // it. Copying the LINK gives students something they can just open.
  const onCopyLink = async () => {
    const ok = await copyText(joinLinkForCode(code));
    setLinkState(ok ? 'copied' : 'failed');
    clearTimeout(linkTimer.current);
    linkTimer.current = setTimeout(() => setLinkState('idle'), 1800);
  };

  const onCopy = async () => {
    const ok = await copyText(code);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };

  const copied = state === 'copied';
  const btnLabel = copied ? '✓ Copied' : state === 'failed' ? 'Copy failed' : '📋 Copy';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', ...style }}>
      <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)', fontWeight: 600 }}>{label}</span>
      <code
        onClick={(e) => {
          // Select the code so it can be copied by hand if the button fails.
          const r = document.createRange();
          r.selectNodeContents(e.currentTarget);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        }}
        style={{
          fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: 2,
          color: 'var(--color-accent)', background: 'var(--color-accent-a12)',
          border: '1px solid var(--color-accent-a30)', borderRadius: 'var(--radius-md)',
          padding: '5px 12px', cursor: 'text', userSelect: 'all',
        }}
      >
        {code}
      </code>
      <button
        onClick={onCopy}
        title="Copy room code"
        style={{
          padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: copied ? 'var(--color-success-a20)' : 'var(--color-accent-a15)',
          border: `1px solid ${copied ? 'var(--color-success-a30)' : 'var(--color-accent-a30)'}`,
          color: copied ? 'var(--color-success)' : 'var(--color-accent)',
        }}
      >
        {btnLabel}
      </button>
      {showLink && (
        <button
          onClick={onCopyLink}
          title="Copy the full waiting-room link to paste into class chat"
          style={{
            padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: linkState === 'copied' ? 'var(--color-success-a20)' : 'var(--color-accent-2-a15)',
            border: `1px solid ${linkState === 'copied' ? 'var(--color-success-a30)' : 'rgba(167,139,250,0.4)'}`,
            color: linkState === 'copied' ? 'var(--color-success)' : 'var(--color-accent-2)',
          }}
        >
          {linkState === 'copied' ? '✓ Link copied' : linkState === 'failed' ? 'Copy failed' : '🔗 Copy join link'}
        </button>
      )}
    </div>
  );
}
