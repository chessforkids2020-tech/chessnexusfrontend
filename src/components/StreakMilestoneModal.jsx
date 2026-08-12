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

// `onDismiss` marks this milestone as dealt with, so the modal does not reappear.
// It is called ONLY on a real decision: the report was generated, or the student
// chose "Maybe later". It is deliberately NOT called when they close while short
// of the XP price — that student has not had their reward, and suppressing the
// offer would strand them exactly as it did before (the unlock lives only here).
export default function StreakMilestoneModal({ streak, user, onClose, onDismiss, onGenerated }) {
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
      // Generated — this milestone is genuinely done with.
      onDismiss?.();
      onGenerated?.();
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
            {/* "Maybe later" is a real decision ONLY if they could have said yes.
                A student who cannot afford it yet is not deferring — they are
                blocked — so closing must leave the offer standing for when they
                have the XP. Hence the label changes too: promising to come back
                is honest; "maybe later" would imply they had a choice. */}
            <button
              type="button"
              style={S.ghost}
              onClick={() => { if (cost ? cost.affordable : true) onDismiss?.(); onClose(); }}
            >
              {cost && !cost.affordable ? 'I will come back for this' : 'Maybe later'}
            </button>
          </>
        )}

        {(phase === 'celebrating' || phase === 'queued') && (
          <>
            <p style={S.body}>
              We are analysing your games now. This takes a while — go and play, and
              we will send you a notification the moment it is ready.
            </p>
            <p style={S.bodyQuiet}>
              You can close this. The report will be waiting on your dashboard under
              <b> Weekly report</b> when it is done.
            </p>
            {phase === 'queued' && (
              <button type="button" style={S.primary} onClick={onClose}>Got it</button>
            )}
          </>
        )}

        {phase === 'error' && (
          <>
            <p style={{ ...S.body, color: 'var(--color-danger)' }}>{err}</p>
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
    background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-xl)', padding: '28px 26px', maxWidth: 460, width: '100%',
    textAlign: 'center', boxShadow: '0 24px 60px var(--color-black-a50)',
  },
  flame: { fontSize: 46, lineHeight: 1 },
  title: { margin: '8px 0 6px', fontSize: 26, fontWeight: 800, color: 'var(--color-text)' },
  body: { margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text-muted)' },
  bodyQuiet: { margin: '0 0 18px', fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-muted)' },
  cost: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 10, padding: '9px 12px', marginBottom: 10, borderRadius: 'var(--radius-md)',
    background: 'var(--color-accent-a12)', border: '1px solid var(--color-accent-a30)',
    fontSize: 13, color: 'var(--color-text)',
  },
  costShort: { background: 'var(--color-warning-a12)', borderColor: 'var(--color-warning-a30)', color: 'var(--color-warning)' },
  costBal: { fontSize: 12, color: 'var(--color-text-muted)' },
  primaryOff: { opacity: 0.5, cursor: 'not-allowed' },
  warn: {
    textAlign: 'left', background: 'var(--color-warning-a12)',
    border: '1px solid var(--color-warning-a30)', borderRadius: 'var(--radius-md)',
    padding: '10px 12px', marginBottom: 16, color: 'var(--color-warning)', fontSize: 13,
  },
  warnBody: { margin: '4px 0 0', color: 'var(--color-text)', fontSize: 12.5, lineHeight: 1.5 },
  link: { color: 'var(--color-warning)', fontWeight: 700 },
  primary: {
    width: '100%', padding: '11px 16px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--color-success)', color: '#04210f', fontWeight: 800, fontSize: 14.5,
    cursor: 'pointer', marginBottom: 8,
  },
  ghost: {
    width: '100%', padding: '9px 16px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-strong)', background: 'transparent',
    color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
  },
};
