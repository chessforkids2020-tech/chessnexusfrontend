// pages/academy/AcademyInvite.jsx — /academy/invite
// The INVITED coach's side of an academy invitation.
//
// The academy head invites by username from /academy/coaches; the invitee gets a
// bell notification pointing here. Unlike /join-academy/:code there is no code to
// type — the academy is already attached to the invitation.
//
// Two cases:
//   • already a coach  → Accept sends a join request the head confirms.
//   • not a coach yet  → Accept first routes through coach onboarding; the
//     invitation stays pending until they come back.
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import './AcademyDashboard.css';

export default function AcademyInvite() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/api/academy/my-invite')
      .then(r => { if (alive) setInvite(r.data?.invite || null); })
      .catch(() => { if (alive) setInvite(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const accept = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api.post('/api/academy/my-invite/accept');
      setMsg(r.data?.message || 'Accepted.');
      setInvite(null);
    } catch (e) {
      // Not a coach yet — send them to onboarding; the invite waits for them.
      if (e.response?.data?.needsOnboarding) {
        navigate('/coach/onboarding');
        return;
      }
      setErr(e.response?.data?.message || 'Could not accept the invitation.');
    } finally { setBusy(false); }
  };

  const decline = async () => {
    if (!window.confirm('Decline this invitation?')) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/academy/my-invite/decline');
      setInvite(null);
      setMsg('Invitation declined.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not decline.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="acad-wrap"><div className="acad-empty">Loading…</div></div>;

  return (
    <div className="acad-wrap" style={{ maxWidth: 560 }}>
      <div className="acad-join-card">
        <div className="acad-join-emoji">🏛️</div>

        {msg && <div className="acad-msg">{msg}</div>}
        {err && <div className="acad-error">⚠️ {err}</div>}

        {!invite ? (
          <>
            <h1>No pending invitation</h1>
            <p className="acad-muted">
              You don't have an academy invitation waiting. If you were expecting one,
              ask the academy to send it to your username.
            </p>
            <Link to="/coach/dashboard" className="btn-ghost">← Back to coaching</Link>
          </>
        ) : (
          <>
            <h1>{invite.academyName}</h1>
            <p className="acad-join-sub">has invited you to join as a coach.</p>
            {invite.blurb && <p className="acad-muted">{invite.blurb}</p>}

            <p className="acad-join-note">
              The academy covers your subscription plan. Your own students, courses and
              data stay yours.
              {invite.needsOnboarding && (
                <> You'll set up your coach profile first — it only takes a moment.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={accept} disabled={busy}>
                {busy ? 'Working…' : invite.needsOnboarding ? 'Accept & set up my profile' : 'Accept invitation'}
              </button>
              <button className="btn-ghost" onClick={decline} disabled={busy}>Decline</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
