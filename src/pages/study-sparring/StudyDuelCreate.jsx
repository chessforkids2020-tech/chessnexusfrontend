import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudyDuelCreate() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 0 32px rgba(99,102,241,0.4))' }}>⚔️</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Study Duel</div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>Coming Soon</h1>
        <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, margin: '0 0 36px' }}>Challenge friends to a live study duel — play through puzzles head-to-head and see who finds the best moves.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '12px 32px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 14, color: '#a5b4fc', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >← Go Back</button>
      </div>
    </div>
  );
}
