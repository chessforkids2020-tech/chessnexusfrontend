// src/components/CoachPromptCard.jsx
// "Are you a chess coach?" prompt card.
// Previously lived inline in UserDashboard; moved here so it can be rendered at
// the bottom of the Profile tab in Settings (and reused elsewhere if needed).
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CoachPromptCard() {
  const navigate = useNavigate();
  const [coachStatus, setCoachStatus] = useState(null); // null | { isCoach, access }
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('coachPromptDismissed') === '1');

  useEffect(() => {
    let alive = true;
    api.get('/api/coach/status')
      .then(r => { if (alive) setCoachStatus(r.data); })
      .catch(() => { if (alive) setCoachStatus({ isCoach: false }); });
    return () => { alive = false; };
  }, []);

  if (!coachStatus) return null;

  // Already a coach → show "Go to coach dashboard" mini-card
  if (coachStatus.isCoach) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(16,185,129,0.08))',
        border: '1px solid rgba(6,182,212,0.35)',
        borderRadius: '14px',
        padding: '16px 22px',
        margin: '16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>🎓</div>
          <div>
            <div style={{ color: '#67e8f9', fontWeight: 600, fontSize: '15px' }}>
              You're set up as a coach
            </div>
            <div style={{ color: 'rgba(226,232,240,0.65)', fontSize: '12.5px', marginTop: '2px' }}>
              {coachStatus.access?.active
                ? `${coachStatus.access.daysRemaining} day(s) remaining`
                : 'Subscription expired — renew to continue'}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/coach/dashboard')}
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #10b981)',
            color: '#0a0a0a',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Open coach dashboard →
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(6,182,212,0.06))',
      border: '1px solid rgba(6,182,212,0.3)',
      borderRadius: '16px',
      padding: '22px 26px',
      margin: '20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      flexWrap: 'wrap',
      backdropFilter: 'blur(10px)',
      position: 'relative'
    }}>
      <button
        onClick={() => { localStorage.setItem('coachPromptDismissed', '1'); setDismissed(true); }}
        title="Dismiss"
        style={{
          position: 'absolute', top: '8px', right: '12px',
          background: 'transparent', border: 'none', color: 'rgba(226,232,240,0.4)',
          fontSize: '18px', cursor: 'pointer', lineHeight: 1
        }}
      >×</button>
      <div style={{ fontSize: '42px', filter: 'drop-shadow(0 4px 14px rgba(6,182,212,0.4))' }}>🎓</div>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{
          color: '#f1f5f9', fontWeight: 700, fontSize: '17px', marginBottom: '4px',
          background: 'linear-gradient(135deg, #06b6d4, #10b981)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          Are you a chess coach?
        </div>
        <div style={{ color: 'rgba(226,232,240,0.7)', fontSize: '13.5px', lineHeight: 1.5 }}>
          Manage your students, give assignments, and track progress — all in one place.
          Start with a <strong style={{ color: '#fcd34d' }}>30-day free trial</strong>. No card required.
        </div>
      </div>
      <button
        onClick={() => navigate('/coach/onboarding')}
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #10b981)',
          color: '#0a0a0a',
          border: 'none',
          padding: '11px 22px',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(6,182,212,0.35)'
        }}
      >
        Yes — I'm a coach →
      </button>
    </div>
  );
}
