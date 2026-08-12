// components/ExpiryReminder.jsx
// A renewal-reminder banner for coach + academy plans.
//   > 15 days left  → nothing
//   ≤ 15 days       → a small heads-up "your plan is about to expire"
//   ≤ 7 days        → a stronger daily countdown ("N days left"), so it's never missed
//
// Props:
//   daysRemaining : number | null  (days until the plan/period ends)
//   what          : string         (e.g. "coach plan" or "academy plan")
//   to            : string         (route to the billing/subscription page)
//   ctaLabel      : string         (button text, e.g. "Renew" / "Manage plan")
import React from 'react';
import { Link } from 'react-router-dom';

export default function ExpiryReminder({ daysRemaining, what = 'plan', to, ctaLabel = 'Renew now' }) {
  if (daysRemaining == null || daysRemaining > 15 || daysRemaining < 0) return null;
  const urgent = daysRemaining <= 7;
  const dayText = daysRemaining === 0 ? 'today' : `in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      padding: '10px 16px', marginBottom: 16, borderRadius: 12,
      background: urgent ? 'var(--color-danger-a12)' : 'var(--color-warning-a12)',
      border: `1px solid ${urgent ? 'var(--color-danger-a30)' : 'var(--color-warning-a30)'}`,
    }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: urgent ? 'var(--color-danger)' : 'var(--color-warning)' }}>
        {urgent ? '⏰' : '🔔'} Your {what} expires {dayText}. Renew to keep your access without interruption.
      </span>
      {to && (
        <Link to={to} style={{
          fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
          color: '#04211d', background: urgent ? 'var(--color-danger)' : 'var(--color-warning)',
          borderRadius: 8, padding: '6px 14px',
        }}>{ctaLabel}</Link>
      )}
    </div>
  );
}
