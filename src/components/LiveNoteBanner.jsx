import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Show the live note on exactly the same pages as the floating schedule button.
const ALLOWED_PATHS = new Set(['/', '/dashboard', '/puzzles-hub', '/race', '/arcade', '/study', '/games', '/game-analysis']);

// How long the banner stays in its "LIVE NOW" state after the countdown hits
// zero, before it auto-hides.
const LIVE_GRACE_MS = 60 * 60 * 1000; // 1 hour

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function LiveNoteBanner() {
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [closed, setClosed] = useState(false); // session-only: reappears on reload
  const [, setTick] = useState(0);
  const fetchedRef = useRef(false);

  const visible = ALLOWED_PATHS.has(location.pathname);

  // Fetch the active note once (when first on an allowed page).
  useEffect(() => {
    if (!visible || fetchedRef.current) return;
    fetchedRef.current = true;
    const API_URL = import.meta.env.VITE_API_URL || '';
    fetch(`${API_URL}/api/public/live-note`)
      .then(r => r.json())
      .then(data => { if (data && data.title && data.targetAt) setItem(data); })
      .catch(() => {});
  }, [visible]);

  // Tick every second so the countdown updates smoothly.
  useEffect(() => {
    if (!visible || !item) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [visible, item]);

  if (!visible || !item || closed) return null;

  const target = new Date(item.targetAt).getTime();
  const now = Date.now();
  const diff = target - now;
  const isLive = diff <= 0;

  // After the grace window past the target, stop showing it entirely.
  if (isLive && now - target > LIVE_GRACE_MS) return null;

  return (
    <>
      <style>{`
        @keyframes lnbIn { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes lnbLiveDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(1.4)} }
      `}</style>

      <div
        role="status"
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9997,
          maxWidth: 'min(92vw, 420px)',
          background: isLive ? 'rgba(5,46,22,0.96)' : 'rgba(20,20,40,0.96)',
          border: `1.5px solid ${isLive ? '#22c55e' : '#22d3ee'}`,
          borderRadius: 12,
          padding: '9px 13px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          // Entrance slide-in only — steady (non-animated) glow on the card.
          animation: 'lnbIn 0.25s ease-out',
          boxShadow: isLive
            ? '0 6px 22px rgba(0,0,0,0.4), 0 0 26px 4px rgba(34,197,94,0.8), 0 0 0 1px rgba(34,197,94,0.7) inset'
            : '0 6px 22px rgba(0,0,0,0.4), 0 0 24px 3px rgba(6,182,212,0.7), 0 0 0 1px rgba(6,182,212,0.6) inset',
          fontFamily: 'Poppins, sans-serif',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {isLive && (
          <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'lnbLiveDot 1.4s infinite' }} />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Small title */}
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 13, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title}
          </div>
          {/* Smaller note + countdown / LIVE */}
          <div style={{ fontSize: 11, lineHeight: 1.3, marginTop: 1, display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
            {item.note && (
              <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.note}</span>
            )}
            {isLive ? (
              <span style={{
                color: '#bbf7d0', fontWeight: 800, letterSpacing: 0.4,
                padding: '1px 8px', borderRadius: 999,
                background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.6)',
                textShadow: '0 0 8px rgba(34,197,94,0.9)',
              }}>● LIVE NOW</span>
            ) : (
              <span style={{
                color: '#fde68a', fontWeight: 700,
                padding: '1px 8px', borderRadius: 999,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.5)',
                textShadow: '0 0 6px rgba(245,158,11,0.7)',
              }}>in {formatCountdown(diff)}</span>
            )}
          </div>
        </div>

        {/* Close (session only — comes back on reload) */}
        <button
          onClick={() => setClosed(true)}
          aria-label="Close"
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        >
          ×
        </button>
      </div>
    </>
  );
}
