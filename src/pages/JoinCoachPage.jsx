// pages/JoinCoachPage.jsx
//
// /join/:code — a student opens the invite link their coach sent them.
//
// This is the ONLY discoverable way into the coach-request flow, by design.
// There is no directory and no search: the platform teaches children, so a
// student should never be able to browse strangers who coach. The link is the
// permission — the coach chose to send it — and the coach still approves the
// request before the student joins their roster.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './JoinCoachPage.css';

export default function JoinCoachPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState({ loading: true, coach: null, status: 'none', error: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (authLoading) return;
    // Not logged in: remember the code, then send them to log in.
    //
    // NOT ?redirect= — that parameter is cross-app SSO with a host allowlist
    // (see LoginPage), so an internal path is rejected and login always lands on
    // /dashboard. Stash the code instead and pick it up on return, which also
    // survives the student signing UP rather than in.
    if (!user) {
      try { sessionStorage.setItem('pendingCoachInvite', String(code)); } catch { /* private mode */ }
      navigate('/login', { replace: true, state: { message: 'Log in to join your coach.' } });
      return;
    }
    let alive = true;
    api.get(`/api/coach/by-code/${encodeURIComponent(code)}`)
      .then(r => { if (alive) setState({ loading: false, coach: r.data.coach, status: r.data.status, error: '' }); })
      .catch(e => {
        if (alive) setState({
          loading: false, coach: null, status: 'none',
          error: e.response?.data?.message || 'That invite link is not valid.',
        });
      });
    return () => { alive = false; };
  }, [code, user, authLoading, navigate]);

  const send = async () => {
    if (sending) return;
    setSending(true); setErr('');
    try {
      await api.post('/api/coach/request-coach', { coachCode: code });
      setSent(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not send that request.');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || state.loading) {
    return <div className="jc-page"><div className="jc-card jc-muted">Loading…</div></div>;
  }

  if (state.error) {
    return (
      <div className="jc-page">
        <div className="jc-card">
          <div className="jc-ic" aria-hidden="true">🔗</div>
          <h1 className="jc-title">Invite link not valid</h1>
          <p className="jc-sub">{state.error}</p>
          <p className="jc-sub">Ask your coach to send you their link again.</p>
          <Link to="/dashboard" className="jc-ghost">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const c = state.coach;
  const name = c.displayName || c.username;

  return (
    <div className="jc-page">
      <div className="jc-card">
        {c.photo
          ? <img className="jc-photo" src={c.photo} alt="" />
          : <div className="jc-ic" aria-hidden="true">🎓</div>}

        <h1 className="jc-title">{name}</h1>
        {c.academy && <p className="jc-academy">{c.academy}</p>}
        {c.verified && <span className="jc-verified">🎓 Verified by the Nexus team</span>}

        {sent || state.status === 'pending_mine' ? (
          <>
            <div className="jc-ok">✓ Request sent</div>
            <p className="jc-sub">
              {name} will see your request and decide whether to add you. You will
              get a notification either way.
            </p>
            <Link to="/dashboard" className="jc-ghost">← Back to dashboard</Link>
          </>
        ) : state.status === 'already' ? (
          <>
            <div className="jc-ok">✓ {name} is already your coach</div>
            <Link to="/my-coach" className="jc-btn">Open My Coach</Link>
          </>
        ) : state.status === 'pending_theirs' ? (
          <>
            <p className="jc-sub">
              {name} has already invited you — accept it from your notifications.
            </p>
            <Link to="/coach-requests" className="jc-btn">View the invitation</Link>
          </>
        ) : (
          <>
            <p className="jc-sub">
              Ask {name} to add you as their student. They will need to accept
              before you appear on their roster.
            </p>
            {err && <div className="jc-err">⚠️ {err}</div>}
            <button className="jc-btn" onClick={send} disabled={sending}>
              {sending ? 'Sending…' : `Ask ${name} to add me`}
            </button>
            <Link to="/dashboard" className="jc-ghost">Not now</Link>
          </>
        )}
      </div>
    </div>
  );
}
