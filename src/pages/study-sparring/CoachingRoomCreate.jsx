import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoachingRoomCreate() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 20%, var(--color-success-a12) 0%, transparent 50%), radial-gradient(circle at 70% 70%, var(--color-accent-a06) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 0 32px var(--color-success-a30))' }}>🎓</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Coaching Room</div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--color-text)', margin: '0 0 16px', letterSpacing: '-1px' }}>Coming Soon</h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-faint)', lineHeight: 1.7, margin: '0 0 36px' }}>Set up a live coaching session — broadcast positions to students while they practice in real time.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '12px 32px', background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a30)', borderRadius: 14, color: 'var(--color-success)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >← Go Back</button>
      </div>
    </div>
  );
}
