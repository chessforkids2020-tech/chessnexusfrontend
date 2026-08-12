// KnightBadge — a small ♞ shown after the name of an entry-tier supporter.
//
// Replaces the old ☕ CoffeeBadge. A coffee cup is a generic creator-economy
// symbol that means nothing in chess; the knight is the one piece no other
// game has, and it reads at badge size.
//
// Entry tier ONLY. The paid tiers grant a TITLE instead — "NS Hikaru",
// "NX Hikaru" — so they never also carry an icon, and Founding Supporters get
// the permanent 👑 (see FoundingBadge). PlayerName owns that decision; this
// component just draws the piece.
import React from 'react';

export default function KnightBadge({ size = 14, title = 'Supports ChessNexus' }) {
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
        // Themed, not a fixed amber: the app has six palettes and a hardcoded
        // glow looked wrong in five of them.
        color: 'var(--color-accent)',
        filter: 'drop-shadow(0 0 6px var(--color-accent-a40))',
        // The glyph would otherwise inherit a gradient text-fill from headings
        // it sits inside, rendering it invisible.
        WebkitTextFillColor: 'currentColor',
      }}
    >
      ♞
    </span>
  );
}
