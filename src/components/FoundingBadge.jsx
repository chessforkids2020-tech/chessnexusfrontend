// FoundingBadge — permanent 👑 shown next to a Founding Supporter's displayName.
// Unlike CoffeeBadge (which lapses 30 days after the payment), this one NEVER
// expires: the first 100 backers were promised a permanent badge, so the backend
// keeps returning them from /api/coffee/active-usernames regardless of expiresAt.
import React from 'react';

export default function FoundingBadge({ size = 14, title = 'Founding Supporter — one of our first 100 backers' }) {
  return (
    <span
      title={title}
      aria-label="ChessNexus Founding Supporter"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        verticalAlign: 'middle',
        fontSize: size,
        lineHeight: 1,
        filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.75))',
        WebkitTextFillColor: 'initial', // override gradient text-fill from parent
        color: 'initial'
      }}
    >
      👑
    </span>
  );
}
