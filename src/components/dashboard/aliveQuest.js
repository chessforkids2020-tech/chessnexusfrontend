// Today's quest = the three practice-streak requirements from /api/user/streak.
// Kept out of AliveParts.jsx so that file exports only components (fast refresh).
const QUEST_ROWS = [
  { key: 'puzzles',  title: 'Solve puzzles',        sub: 'Healthy Mix, themes, pieces or rating', to: '/training/healthy-mix' },
  { key: 'games',    title: 'Play a game',          sub: 'Chess Nexus, Chess.com or Lichess',     to: '/arenatournament' },
  { key: 'endgames', title: 'Play out an endgame',  sub: 'Against the computer',                  to: '/study/endgames' },
];

export function questTasks(streak) {
  const done = streak?.today?.done || {};
  const need = streak?.today?.required || { puzzles: 10, games: 1, endgames: 1 };
  return QUEST_ROWS.map(r => {
    const have = done[r.key] || 0;
    const want = need[r.key] || 1;
    return { ...r, have: Math.min(have, want), want, done: have >= want };
  });
}
