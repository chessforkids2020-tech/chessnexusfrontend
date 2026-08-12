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
        background: 'linear-gradient(135deg, var(--color-accent-a12), var(--color-accent-2-a12))',
        border: '1px solid var(--color-accent-a30)',
        borderRadius: 'var(--radius-lg)',
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
            <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '15px' }}>
              You're set up as a coach
            </div>
            <div style={{ color: 'rgba(226,232,240,0.65)', fontSize: '12.5px', marginTop: '2px' }}>
              {coachStatus.access?.downgraded
                ? 'Coach plan ended — you\'re on the Free plan'
                : coachStatus.access?.daysRemaining != null
                  ? `${coachStatus.access.daysRemaining} day(s) remaining`
                  : 'Free coach plan — no expiry'}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/coach/dashboard')}
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
            color: 'var(--color-bg)',
            border: 'none',
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
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
      background: 'linear-gradient(135deg, var(--color-warning-a12), var(--color-accent-a06))',
      border: '1px solid var(--color-accent-a30)',
      borderRadius: 'var(--radius-xl)',
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
      <div style={{ fontSize: '42px', filter: 'drop-shadow(0 4px 14px var(--color-accent-a40))' }}>🎓</div>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{
          color: 'var(--color-text)', fontWeight: 700, fontSize: '17px', marginBottom: '4px',
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          Are you a chess coach?
        </div>
        <div style={{ color: 'rgba(226,232,240,0.7)', fontSize: '13.5px', lineHeight: 1.5 }}>
          Manage your students, give assignments, and track progress — all in one place.
          <strong style={{ color: 'var(--color-warning)' }}> Free forever</strong> for up to 30 students. No card required.
        </div>
      </div>
      <button
        onClick={() => navigate('/coach/onboarding')}
        style={{
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
          color: 'var(--color-bg)',
          border: 'none',
          padding: '11px 22px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 6px 20px var(--color-accent-a30)'
        }}
      >
        Yes — I'm a coach →
      </button>
    </div>
  );
}
