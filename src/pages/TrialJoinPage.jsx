// pages/TrialJoinPage.jsx
//
// What a PARENT sees when they open a trial link from WhatsApp.
//
// The whole design goal is that this page asks for as little as possible: no
// signup, no password, no email. A name, then a Join button. Anything more and
// a parent trying one free lesson simply closes the tab.
//
// A guest account IS created underneath (GuestAllowedRoute does it before this
// component renders), because the live session keys participants by a real user
// id — but the parent never sees or hears about it.
//
// Flow:
//   1. resolve the link          → is it valid / used / closed?
//   2. parent types their name   → knock
//   3. wait for the coach        → poll until admitted
//   4. admitted                  → hand over to the classroom
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const C = {
  text: '#e2e8f0', dim: 'rgba(226,232,240,0.62)', cyan: '#22d3ee',
  green: '#34d399', red: '#f87171',
  border: 'rgba(255,255,255,0.09)', panel: 'rgba(20,26,34,0.75)',
};

const wrap = {
  minHeight: '100vh', display: 'grid', placeItems: 'center',
  padding: '24px 16px', color: C.text,
};
const card = {
  width: '100%', maxWidth: 440, background: C.panel,
  border: `1px solid ${C.border}`, borderRadius: 18, padding: '26px 22px',
  textAlign: 'center',
};

export default function TrialJoinPage() {
  const { joinCode } = useParams();
  const nav = useNavigate();

  const [info, setInfo] = useState(null);     // resolved link
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');     // expired / not found
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('form'); // form | waiting | admitted
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  // ── 1. Resolve the link (public, no auth needed) ──────────────────────────
  useEffect(() => {
    let alive = true;
    api.get(`/api/trial-class/join/${joinCode}`)
      .then(r => { if (alive) setInfo(r.data); })
      .catch(e => {
        if (alive) setFatal(e.response?.data?.message
          || 'This trial link is not valid. Please ask your coach for a new one.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [joinCode]);

  // ── 2/3. Knock, then poll until the coach admits ──────────────────────────
  const knock = useCallback(async (quiet = false) => {
    if (!quiet) { setBusy(true); setErr(''); }
    try {
      const r = await api.post(`/api/trial-class/join/${joinCode}/knock`, {
        name: name.trim() || 'Guest',
      });
      if (r.data?.state === 'admitted') {
        setPhase('admitted');
        return true;
      }
      setPhase('waiting');
      return false;
    } catch (e) {
      // A used-up or closed link is terminal — say so plainly rather than
      // leaving a parent staring at a spinner.
      if (e.response?.data?.expired) {
        setFatal(e.response.data.message);
        return false;
      }
      if (!quiet) setErr(e.response?.data?.message || 'Could not join. Please try again.');
      return false;
    } finally {
      if (!quiet) setBusy(false);
    }
  }, [joinCode, name]);

  // Poll while waiting. Deliberately a poll and not a socket: this page may be
  // the parent's only visit, on a phone, on a poor connection — a 3-second
  // request that always works beats a socket that sometimes does not.
  useEffect(() => {
    if (phase !== 'waiting') return;
    pollRef.current = setInterval(async () => {
      const inNow = await knock(true);
      if (inNow) clearInterval(pollRef.current);
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [phase, knock]);

  // ── 4. Admitted → into the classroom ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'admitted') return;
    const t = setTimeout(() => nav(`/trial/${joinCode}/room`, { replace: true }), 600);
    return () => clearTimeout(t);
  }, [phase, joinCode, nav]);

  if (loading) {
    return <div style={wrap}><div style={{ color: C.dim }}>Loading…</div></div>;
  }

  if (fatal) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 42 }}>🔗</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: '10px 0 8px' }}>
            This link is no longer active
          </h1>
          <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.6, margin: 0 }}>{fatal}</p>
        </div>
      </div>
    );
  }

  const coach = info?.coachName || 'Your coach';

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 40 }}>♟️</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '10px 0 4px' }}>
          Trial class with {coach}
        </h1>
        {info?.academyName && (
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 2 }}>{info.academyName}</div>
        )}
        <p style={{ fontSize: 13, color: C.dim, margin: '6px 0 20px' }}>
          {info?.durationMinutes ? `${info.durationMinutes} minutes · ` : ''}
          No account needed — just your name.
        </p>

        {phase === 'form' && (
          <>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) knock(); }}
              placeholder="Your name"
              maxLength={80}
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 11, fontSize: 15,
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
                color: C.text, textAlign: 'center', marginBottom: 12,
              }}
            />
            <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 14 }}>
              Your coach will see this name when you knock.
            </div>

            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

            <button
              onClick={() => knock()}
              disabled={busy || !name.trim()}
              style={{
                width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                background: name.trim() ? C.cyan : 'rgba(255,255,255,0.1)',
                color: name.trim() ? '#06222a' : C.dim,
                fontSize: 15, fontWeight: 800,
                cursor: busy || !name.trim() ? 'default' : 'pointer',
              }}
            >
              {busy ? 'Joining…' : info?.live ? 'Join the class' : 'Knock'}
            </button>

            {!info?.live && (
              <div style={{ fontSize: 12, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>
                Your coach has not opened the room yet — knock and this page will
                let you in as soon as they do.
              </div>
            )}
          </>
        )}

        {phase === 'waiting' && (
          <div>
            <div style={{
              width: 34, height: 34, margin: '6px auto 14px',
              border: `3px solid ${C.border}`, borderTopColor: C.cyan,
              borderRadius: '50%', animation: 'trialspin 0.9s linear infinite',
            }} />
            <style>{'@keyframes trialspin{to{transform:rotate(360deg)}}'}</style>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Waiting for {coach} to let you in
            </div>
            <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>
              Keep this page open. You will go straight into the class.
            </div>
          </div>
        )}

        {phase === 'admitted' && (
          <div>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 4px' }}>You're in!</div>
            <div style={{ fontSize: 12.5, color: C.dim }}>Opening the classroom…</div>
          </div>
        )}
      </div>
    </div>
  );
}
