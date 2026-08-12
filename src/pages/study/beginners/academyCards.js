// The 10 Beginners Academy lesson cards, in unlock order. `id`s must match
// CARD_ORDER in backend/routes/beginnersAcademy.js. `ready:true` means the lesson is
// actually built (Phase 1 = piece-movements); others show a friendly "coming soon".
export const ACADEMY_CARDS = [
  { id: 'piece-movements', title: 'Piece Movements', emoji: '♟️', color: 'var(--color-accent)', desc: 'Learn how each piece moves — catch the stars!', ready: true },
  { id: 'square-names',    title: 'Square Names',    emoji: '🔤', color: 'var(--color-accent-2)', desc: 'Name the squares like a6 and f3.', ready: false },
  { id: 'arrange-board',   title: 'Arrange the Board', emoji: '🧩', color: 'var(--color-warning)', desc: 'Put every piece on its starting square.', ready: false },
  { id: 'piece-value',     title: 'Piece Value',     emoji: '💎', color: 'var(--color-success)', desc: 'How strong is each piece?', ready: false },
  { id: 'capture',         title: 'Capture',         emoji: '⚔️', color: 'var(--color-danger)', desc: 'Capture safely — take the right piece.', ready: false },
  { id: 'protection',      title: 'Protection',      emoji: '🛡️', color: 'var(--color-accent-2)', desc: 'Keep your pieces safe.', ready: false },
  { id: 'check',           title: 'Check',           emoji: '👑', color: 'var(--color-warning)', desc: 'Give check to the enemy king.', ready: false },
  { id: 'stop-check',      title: 'Stop Check',      emoji: '🚫', color: '#fb7185', desc: 'Save your king from check.', ready: false },
  { id: 'castling',        title: 'Castling',        emoji: '🏰', color: '#c084fc', desc: 'The special king-and-rook move.', ready: false },
  { id: 'start-game',      title: 'Start a Game',    emoji: '🚀', color: '#2dd4bf', desc: 'How to begin a real chess game.', ready: false },
];

// Mood emoji shown in the header, based on how many cards are completed (0..10).
// Starts with a wave and grows more excited; a trophy once everything is done.
export function moodEmoji(done, total) {
  if (total > 0 && done >= total) return '🏆';
  const r = total ? done / total : 0;
  if (r === 0) return '👋';
  if (r < 0.34) return '🙂';
  if (r < 0.67) return '😄';
  return '🤩';
}
