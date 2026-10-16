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
import { t as tr } from '../i18n/LanguageContext';

export default function JoinCoachPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState({ loading: true, coach: null, status: 'none', error: '' });
  const [note, setNote] = useState('');
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
      navigate('/login', { replace: true, state: { message: tr('Log in to join your coach.') } });
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
      await api.post('/api/coach/request-coach', { coachCode: code, note });
      setSent(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not send that request.');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || state.loading) {
    return <div className="jc-page"><div className="jc-card jc-muted">{tr("Loading…")}</div></div>;
  }

  if (state.error) {
    return (
      <div className="jc-page">
        <div className="jc-card">
          <div className="jc-ic" aria-hidden="true">🔗</div>
          <h1 className="jc-title">{tr("Invite link not valid")}</h1>
          <p className="jc-sub">{state.error}</p>
          <p className="jc-sub">{tr("Ask your coach to send you their link again.")}</p>
          <Link to="/dashboard" className="jc-ghost">{tr("← Back to dashboard")}</Link>
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
        {c.verified && <span className="jc-verified">{tr("🎓 Verified by the Nexus team")}</span>}

        {sent || state.status === 'pending_mine' ? (
          <>
            <div className="jc-ok">{tr("✓ Request sent")}</div>
            <p className="jc-sub">
              {name} {tr("will see your request and decide whether to add you. You will")}
              get a notification either way.
            </p>
            <Link to="/dashboard" className="jc-ghost">{tr("← Back to dashboard")}</Link>
          </>
        ) : state.status === 'already' ? (
          <>
            <div className="jc-ok">✓ {name} {tr("is already your coach")}</div>
            <Link to="/my-coach" className="jc-btn">{tr("Open My Coach")}</Link>
          </>
        ) : state.status === 'pending_theirs' ? (
          <>
            <p className="jc-sub">
              {name} {tr("has already invited you — accept it from your notifications.")}
            </p>
            <Link to="/coach-requests" className="jc-btn">{tr("View the invitation")}</Link>
          </>
        ) : (
          <>
            <p className="jc-sub">
              {tr("Ask")} {name} {tr("to add you as their student. They will need to accept")}
              before you appear on their roster.
            </p>
            {/* Guests cannot ask to join. Saying so up front beats a button
                that fails with a 403 after they have typed a message. */}
            {user?.role === 'guest' ? (
              <>
                <div className="jc-err">
                  You are playing as a guest. Create a free account to ask a coach
                  to take you on.
                </div>
                <Link to="/signup-request" className="jc-btn">{tr("Create a free account")}</Link>
              </>
            ) : (
              <>
                <label className="jc-note-label" htmlFor="jc-note">
                  {tr("Tell")} {name.split(' ')[0]} {tr("a little about yourself")}
                </label>
                <textarea
                  id="jc-note"
                  className="jc-note"
                  rows={4}
                  maxLength={600}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tr("Your age, your rating if you have one, and what you would like help with. Coaches read this before deciding.")}
                />
                <div className="jc-note-count">{note.length}/600</div>
                {err && <div className="jc-err">⚠️ {err}</div>}
                <button className="jc-btn" onClick={send} disabled={sending || !note.trim()}>
                  {sending ? tr('Sending…') : tr("Ask {name} to add me", { name: name })}
                </button>
                {!note.trim() && (
                  <p className="jc-sub" style={{ margin: '10px 0 0', fontSize: 12 }}>
                    Write a short message first — coaches rarely accept a request
                    with nothing in it.
                  </p>
                )}
                <Link to="/dashboard" className="jc-ghost">{tr("Not now")}</Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
