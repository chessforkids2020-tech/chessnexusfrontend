// CoffeeBadge — small ☕ icon shown next to a displayName when the user is an
// active Buy-Me-A-Coffee supporter. The badge silently expires 30 days after
// the supporter's payment — we never surface the expiry to the user.
import React from 'react';

export default function CoffeeBadge({ size = 14, title = 'Supporter — thank you for the coffee!' }) {
  return (
    <span
      title={title}
      aria-label="ChessNexus supporter"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        verticalAlign: 'middle',
        fontSize: size,
        lineHeight: 1,
        filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.55))',
        WebkitTextFillColor: 'initial', // override gradient text-fill from parent
        color: 'initial'
      }}
    >
      ☕
    </span>
  );
}
