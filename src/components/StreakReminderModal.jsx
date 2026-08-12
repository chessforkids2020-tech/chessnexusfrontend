// components/StreakReminderModal.jsx
//
// The daily nudge: shown once a day when a student opens their dashboard and
// has not yet earned this milestone's report.
//
// The message CHANGES WITH PROGRESS, which is the whole point — "start today to
// unlock your report" on day 0 and "you are on day 3, two more to go" on day 3
// are different pieces of information. A fixed reminder gets ignored by the
// second week; one that acknowledges what you have already done does not.
//
// Distinct from StreakMilestoneModal, which fires ONCE when a report has been
// earned and offers to generate it. This one is the road to that moment.
import React from 'react';
import { Link } from 'react-router-dom';

export default function StreakReminderModal({ streak, progress, milestone = 5, user, onClose }) {
  const day = streak || 0;
  const left = Math.max(0, milestone - (day % milestone || (day ? milestone : 0)));
  const remaining = day === 0 ? milestone : left;

  const done = progress?.done || { puzzles: 0, games: 0, endgames: 0 };
  const need = progress?.required || { puzzles: 10, games: 1, endgames: 1 };

  const rows = [
    { key: 'puzzles',  icon: '🧩', label: 'puzzles', to: '/training/healthy-mix',
      note: 'Healthy Mix, themes, pieces or rating — all count' },
    { key: 'games',    icon: '⚔️', label: 'game — Chess Nexus, Chess.com or Lichess',
      to: '/arenatournament', note: 'blitz, rapid or classical' },
    { key: 'endgames', icon: '♟️', label: 'endgame against the computer', to: '/study/endgames' },
  ];

  const todayDone = rows.every(r => (done[r.key] || 0) >= (need[r.key] || 1));

  // Headline and subtitle both key off where they are, so the modal reads like
  // someone keeping track rather than a repeated announcement.
  let title, sub;
  if (day === 0) {
    title = 'Start today to unlock your report';
    sub = `Practice ${milestone} days in a row and we will analyse every game you played — where your mistakes happen and what to work on next.`;
  } else if (todayDone) {
    title = `Day ${day} done — ${remaining} to go`;
    sub = remaining === 1
      ? 'One more day and your report unlocks.'
      : `Keep going. ${remaining} more days and your report unlocks.`;
  } else {
    title = `You are on day ${day} — ${remaining} to go`;
    sub = 'Finish today’s three to keep the streak alive.';
  }

  const missingUsernames = !user?.lichessUsername && !user?.chessComUsername;

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label="Practice streak">
      <div style={S.card}>
        <button type="button" style={S.x} onClick={onClose} aria-label="Close">×</button>

        <div style={S.flameRow}>
          <span style={S.flame} aria-hidden="true">🔥</span>
          <span style={S.dayCount}>{day}</span>
          <span style={S.dayLabel}>day{day === 1 ? '' : 's'}</span>
        </div>

        {/* Five dots — a streak is easier to feel than to read. */}
        <div style={S.dots} aria-hidden="true">
          {Array.from({ length: milestone }, (_, i) => (
            <span key={i} style={{ ...S.dot, ...(i < (day % milestone || (day ? milestone : 0)) ? S.dotOn : {}) }} />
          ))}
        </div>

        <h2 style={S.title}>{title}</h2>
        <p style={S.sub}>{sub}</p>

        <div style={S.list}>
          <div style={S.listHead}>{todayDone ? 'Today is done ✓' : 'Every day needs all three'}</div>
          {rows.map(r => {
            const have = done[r.key] || 0;
            const want = need[r.key] || 1;
            const ok = have >= want;
            return (
              <Link key={r.key} to={r.to} style={{ ...S.row, ...(ok ? S.rowDone : {}) }} onClick={onClose}>
                <span style={S.rowIc}>{ok ? '✓' : r.icon}</span>
                <span style={S.rowText}>
                  <b>{want}</b> {r.label}
                  {r.note && <em style={S.note}> ({r.note})</em>}
                </span>
                <span style={{ ...S.count, ...(ok ? S.countDone : {}) }}>
                  {Math.min(have, want)}/{want}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Worth saying every time, not just once: without these the report can
            only see Chess Nexus games, which for most students is a small slice
            of the week — and they will not know why it looks thin. */}
        <p style={{ ...S.foot, ...(missingUsernames ? S.footWarn : {}) }}>
          {missingUsernames ? '⚠️ ' : ''}
          Make sure your Chess.com and Lichess usernames are saved in{' '}
          <Link to="/settings?tab=profile" style={S.link} onClick={onClose}>Settings → Profile</Link>
          {' '}so those games count toward your report.
        </p>

        <button type="button" style={S.primary} onClick={onClose}>
          {todayDone ? 'Nice — see you tomorrow' : 'Let’s go'}
        </button>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, padding: 20,
  },
  card: {
    position: 'relative',
    background: 'var(--color-surface)', border: '1px solid var(--color-accent-a30)',
    borderRadius: 'var(--radius-xl)', padding: '26px 24px 22px', maxWidth: 460, width: '100%',
    boxShadow: '0 24px 60px var(--color-black-a50)', textAlign: 'center',
  },
  x: {
    position: 'absolute', top: 10, right: 12,
    background: 'none', border: 'none', color: 'var(--color-text-faint)',
    fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4,
  },
  flameRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  flame: { fontSize: 30 },
  dayCount: {
    fontSize: 40, fontWeight: 800, lineHeight: 1,
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  dayLabel: { fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 },
  dots: { display: 'flex', gap: 7, justifyContent: 'center', margin: '12px 0 14px' },
  dot: {
    width: 9, height: 9, borderRadius: 'var(--radius-circle)',
    background: 'var(--color-border-strong)',
  },
  dotOn: { background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))' },
  title: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--color-text)' },
  sub: { margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-text-muted)' },

  list: {
    textAlign: 'left', background: 'var(--color-white-a04)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
    padding: '12px 14px', marginBottom: 14,
  },
  listHead: {
    fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
    color: 'var(--color-text-muted)', marginBottom: 8,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-text)', textDecoration: 'none', fontSize: 13.5,
  },
  rowDone: { color: 'var(--color-success)' },
  rowIc: { width: 20, textAlign: 'center' },
  rowText: { flex: 1 },
  note: { fontStyle: 'normal', color: 'var(--color-text-faint)', fontSize: 12.5 },
  count: { fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--color-text-muted)' },
  countDone: { color: 'var(--color-success)' },

  foot: { margin: '0 0 14px', fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-faint)' },
  footWarn: { color: 'var(--color-warning)' },
  link: { color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' },
  primary: {
    width: '100%', padding: '11px 16px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
    color: '#04210f', fontWeight: 800, fontSize: 14.5, cursor: 'pointer',
  },
};
