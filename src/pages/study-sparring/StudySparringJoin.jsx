import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudySparringJoin() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 20%, var(--color-warning-a12) 0%, transparent 50%), radial-gradient(circle at 70% 70%, var(--color-warning-a12) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 0 32px var(--color-warning-a30))' }}>🔗</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-warning)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Join Duel / Coaching</div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--color-text)', margin: '0 0 16px', letterSpacing: '-1px' }}>Coming Soon</h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-faint)', lineHeight: 1.7, margin: '0 0 36px' }}>Join a friend's duel or connect to a live coaching session using a room code.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '12px 32px', background: 'var(--color-warning-a12)', border: '1px solid var(--color-warning-a30)', borderRadius: 'var(--radius-lg)', color: 'var(--color-warning)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >← Go Back</button>
      </div>
    </div>
  );
}
