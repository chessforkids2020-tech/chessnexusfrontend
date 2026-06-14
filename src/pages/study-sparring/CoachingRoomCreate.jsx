import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoachingRoomCreate() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.10) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(6,182,212,0.07) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 0 32px rgba(16,185,129,0.35))' }}>🎓</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Coaching Room</div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>Coming Soon</h1>
        <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, margin: '0 0 36px' }}>Set up a live coaching session — broadcast positions to students while they practice in real time.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '12px 32px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 14, color: '#10b981', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >← Go Back</button>
      </div>
    </div>
  );
}
