// src/data/notifications.js
// App-wide notifications shown in the sidebar bell.
// Add a new object here to broadcast a notification to all users.
// `id` must be unique — it's how "read/unread" is tracked per user (localStorage).
const notifications = [
  {
    id: 'june-endgame-goals-2026',
    icon: '🎯',
    topic: '🏛️ ChessNexus Official',
    title: 'Monthly Focus: June Endgame Goals',
    desc: 'June Monthly Focus challenge starts on June 17th — master endgame technique, earn XP, climb the leaderboard & unlock exclusive badges!',
    date: 'June 2026',
    link: '/monthly-focus',
    linkLabel: 'Go to Monthly Focus →',
  },
];

export default notifications;
