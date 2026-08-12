import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Pages where the floating button is visible (exact match only)
const ALLOWED_PATHS = new Set(['/', '/dashboard', '/puzzles-hub', '/race', '/arcade', '/study', '/games', '/game-analysis']);

function msUntilNext(item) {
  const now = new Date();
  const [hh, mm] = item.timeUTC.split(':').map(Number);
  let diff = item.dayOfWeek - now.getUTCDay();
  if (diff < 0) diff += 7;
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, hh, mm));
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 7);
  return candidate - now;
}

function isLiveNow(item) {
  const now = new Date();
  const [hh, mm] = item.timeUTC.split(':').map(Number);
  const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
  const diffDays = item.dayOfWeek - now.getUTCDay();
  startUTC.setUTCDate(startUTC.getUTCDate() + diffDays);
  const endUTC = new Date(startUTC.getTime() + item.durationMinutes * 60 * 1000);
  return now >= startUTC && now <= endUTC;
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ScheduleFloatingButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [hovered, setHovered] = useState(false);
  const [, setTick] = useState(0); // force re-render for countdown
  const fetchedRef = useRef(false);

  const visible = ALLOWED_PATHS.has(location.pathname);

  useEffect(() => {
    if (!visible || fetchedRef.current) return;
    fetchedRef.current = true;
    const API_URL = import.meta.env.VITE_API_URL || '';
    fetch(`${API_URL}/api/schedule`)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [visible]);

  // Tick every minute to refresh countdown
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const liveNow = items.find(isLiveNow);
  const upcoming = items.length
    ? items.reduce((best, it) => (msUntilNext(it) < msUntilNext(best) ? it : best), items[0])
    : null;

  const isLive = !!liveNow;
  const preview = liveNow || upcoming;

  return (
    <>
      {/* Omitted from the prerendered snapshot. Text extractors read <style>
          bodies as page text, so these keyframes were being served to crawlers
          and AI readers as the FIRST few hundred characters of every page —
          ahead of any product copy. Real browsers still get them; only the
          static snapshot skips them. */}
      {!(typeof window !== 'undefined' && window.__PRERENDER__) && (
      <style>{`
        @keyframes sfbPulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 70%{box-shadow:0 0 0 10px rgba(34,197,94,0)} }
        @keyframes sfbLiveDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
      `}</style>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        {/* Hover preview card */}
        {hovered && preview && (
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #334155',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            width: 220,
            boxShadow: '0 8px 24px var(--color-black-a50)',
            animation: 'none',
          }}>
            {isLive ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-circle)', background: 'var(--color-success)', display: 'inline-block', animation: 'sfbLiveDot 1.4s infinite' }} />
                  <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 12 }}>LIVE NOW</span>
                </div>
                <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 14 }}>{preview.title}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>Happening now — tap to join!</div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 4 }}>NEXT ACTIVITY</div>
                <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 14 }}>{preview.title}</div>
                <div style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: 12, marginTop: 2 }}>
                  in {formatCountdown(msUntilNext(preview))}
                </div>
              </>
            )}
            <div style={{ color: 'var(--color-accent)', fontSize: 12, marginTop: 8, fontWeight: 600 }}>View full schedule →</div>
          </div>
        )}

        {/* Main button */}
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => navigate('/schedule')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: isLive ? '#052e16' : '#1a1a2e',
            border: `2px solid ${isLive ? 'var(--color-success)' : 'var(--color-accent)'}`,
            borderRadius: 'var(--radius-2xl)',
            padding: '10px 18px',
            cursor: 'pointer',
            color: isLive ? 'var(--color-success)' : 'var(--color-accent)',
            fontWeight: 700,
            fontSize: 14,
            fontFamily: 'Poppins, sans-serif',
            boxShadow: isLive ? '0 0 0 0 rgba(34,197,94,0.5)' : '0 4px 14px var(--color-black-a35)',
            animation: isLive ? 'sfbPulse 2s infinite' : 'none',
            transition: 'transform 0.15s, background 0.2s',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isLive && (
            <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-circle)', background: 'var(--color-success)', display: 'inline-block', animation: 'sfbLiveDot 1.4s infinite' }} />
          )}
          <span style={{ fontSize: 16 }}>📅</span>
          <span>Schedule</span>
        </button>
      </div>
    </>
  );
}
