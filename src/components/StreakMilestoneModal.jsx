// components/StreakMilestoneModal.jsx
//
// "You practiced 5 days running" — the moment a report is earned.
//
// Generation takes 30+ minutes, so this never shows a progress bar. The student
// presses Generate, gets a short burst of confetti, and is told they will be
// notified. Watching a bar crawl for half an hour is worse than not watching.
import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import api from '../api';

// Five seconds of confetti. Uses react-confetti, which the dashboard already
// depends on for badge popups — no reason to hand-roll a second canvas.
// `recycle={false}` lets the existing pieces fall out of frame rather than
// vanishing mid-air when the timer ends.
function Confetti({ ms = 5000, onDone }) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    const stop = setTimeout(() => setRunning(false), ms);
    // Give the last pieces ~1.5s to fall off screen before the caller moves on.
    const done = setTimeout(() => onDone?.(), ms + 1500);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(stop); clearTimeout(done);
    };
  }, [ms, onDone]);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduce) return null;

  return (
    <ReactConfetti
      width={size.w}
      height={size.h}
      run={true}
      recycle={running}
      numberOfPieces={200}
      gravity={0.25}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 10001, pointerEvents: 'none' }}
    />
  );
}

export default function StreakMilestoneModal({ streak, user, onClose }) {
  const [phase, setPhase] = useState('offer');   // offer | celebrating | queued | error
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // What the report costs THIS user. Shown before they press Generate — being
  // charged XP you were never told about feels like a trick, even at 100.
  const [cost, setCost] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/api/streak-report/price')
      .then(r => { if (alive) setCost(r.data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Without these we can only see their Chess Nexus games, which for most
  // students is a small slice of the week — worth saying before they generate,
  // not after they read a thin report.
  const missingLichess = !user?.lichessUsername;
  const missingChesscom = !user?.chessComUsername;
  const missingBoth = missingLichess && missingChesscom;

  const generate = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/streak-report/generate');
      setPhase('celebrating');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start your report. Please try again.');
      setPhase('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label="Practice streak reward">
      {phase === 'celebrating' && <Confetti onDone={() => setPhase('queued')} />}

      <div style={S.card}>
        <div style={S.flame} aria-hidden="true">🔥</div>
        <h2 style={S.title}>{streak} days in a row</h2>

        {phase === 'offer' && (
          <>
            <p style={S.body}>
              You have practiced {streak} days running. That earns you a full report on
              how you have been playing — your games from Chess Nexus, Chess.com and
              Lichess, where your mistakes happen, and what to work on next.
            </p>

            {(missingLichess || missingChesscom) && (
              <div style={S.warn}>
                <strong>{missingBoth ? 'Add your usernames first?' : 'One thing missing'}</strong>
                <p style={S.warnBody}>
                  {missingBoth
                    ? 'We do not have your Chess.com or Lichess usernames, so this report can only cover games played here.'
                    : `We do not have your ${missingLichess ? 'Lichess' : 'Chess.com'} username, so those games will not be included.`}
                  {' '}
                  <a href="/profile" style={S.link}>Add {missingBoth ? 'them' : 'it'} in your profile</a>
                  {' '}— or carry on without.
                </p>
              </div>
            )}

            {cost && !cost.free && (
              <div style={{ ...S.cost, ...(cost.affordable ? {} : S.costShort) }}>
                <span>Costs <b>{cost.price} XP</b></span>
                <span style={S.costBal}>
                  you have {cost.balance}
                  {!cost.affordable && ' — solve a few more puzzles'}
                </span>
              </div>
            )}
            <button
              type="button"
              style={{ ...S.primary, ...(cost && !cost.affordable ? S.primaryOff : {}) }}
              onClick={generate}
              disabled={busy || (cost ? !cost.affordable : false)}
            >
              {busy ? 'Starting…'
                : cost && !cost.free ? `Generate my report · ${cost.price} XP`
                : 'Generate my report'}
            </button>
            <button type="button" style={S.ghost} onClick={onClose}>Maybe later</button>
          </>
        )}

        {(phase === 'celebrating' || phase === 'queued') && (
          <>
            <p style={S.body}>
              We are analysing your games now. This takes a while — go and play, and
              we will send you a notification the moment it is ready.
            </p>
            {phase === 'queued' && (
              <button type="button" style={S.primary} onClick={onClose}>Got it</button>
            )}
          </>
        )}

        {phase === 'error' && (
          <>
            <p style={{ ...S.body, color: '#fca5a5' }}>{err}</p>
            <button type="button" style={S.primary} onClick={() => setPhase('offer')}>Try again</button>
            <button type="button" style={S.ghost} onClick={onClose}>Close</button>
          </>
        )}
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
    background: '#0f172a', border: '1px solid rgba(148,163,184,0.22)',
    borderRadius: 18, padding: '28px 26px', maxWidth: 460, width: '100%',
    textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  flame: { fontSize: 46, lineHeight: 1 },
  title: { margin: '8px 0 6px', fontSize: 26, fontWeight: 800, color: '#f8fafc' },
  body: { margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.6, color: '#cbd5e1' },
  cost: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 10, padding: '9px 12px', marginBottom: 10, borderRadius: 10,
    background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.3)',
    fontSize: 13, color: '#e2e8f0',
  },
  costShort: { background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.4)', color: '#fcd34d' },
  costBal: { fontSize: 12, color: '#94a3b8' },
  primaryOff: { opacity: 0.5, cursor: 'not-allowed' },
  warn: {
    textAlign: 'left', background: 'rgba(245,158,11,0.10)',
    border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10,
    padding: '10px 12px', marginBottom: 16, color: '#fcd34d', fontSize: 13,
  },
  warnBody: { margin: '4px 0 0', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.5 },
  link: { color: '#fcd34d', fontWeight: 700 },
  primary: {
    width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
    background: '#22c55e', color: '#04210f', fontWeight: 800, fontSize: 14.5,
    cursor: 'pointer', marginBottom: 8,
  },
  ghost: {
    width: '100%', padding: '9px 16px', borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.25)', background: 'transparent',
    color: '#94a3b8', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
  },
};
