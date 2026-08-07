// components/AskCoachPanel.jsx
//
// "Ask a coach to add you" — the student side of the coach-request flow.
//
// Shared by the dashboard's My Coach tab and the /my-coach empty state. It used
// to live inside MyCoachPortal, which made it unreachable for the people it is
// for: every link to /my-coach is gated behind ALREADY having a coach, so a
// student with none could never open the page that offered the form.
//
// There is deliberately no directory and no search. The student types a
// username they already know, or arrives on an invite link the coach sent them.
// The platform teaches children, so nobody browses strangers who coach — and
// the coach still approves before anyone joins their roster.
import React, { useEffect, useState } from 'react';
import api from '../api';
import './AskCoachPanel.css';

export default function AskCoachPanel() {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);       // { ok: boolean, text: string }
  const [pending, setPending] = useState([]);

  const loadPending = async () => {
    try {
      const r = await api.get('/api/coach/my-pending-requests');
      setPending(r.data?.requests || []);
    } catch { /* a failed load just shows nothing */ }
  };
  useEffect(() => { loadPending(); }, []);

  const send = async () => {
    const u = username.trim();
    if (!u || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/api/coach/request-coach', { coachUsername: u });
      setMsg({ ok: true, text: r.data?.message || 'Request sent.' });
      setUsername('');
      loadPending();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Could not send that request.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acp">
      <div className="acp-head">
        <div className="acp-ic" aria-hidden="true">🎓</div>
        <div className="acp-head-txt">
          <h3 className="acp-title">Connect with your coach</h3>
          {/* "Enter their username" was ambiguous — a student could read
              "their" as their OWN. Say whose username it is. */}
          <p className="acp-sub">
            Enter your <strong>coach&apos;s username</strong> and we will send them a
            request to add you.
          </p>
        </div>
      </div>

      <label className="acp-label" htmlFor="acp-coach-username">Coach&apos;s username</label>
      <div className="acp-row">
        <input
          id="acp-coach-username"
          className="acp-input"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setMsg(null); }}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="e.g. coach_ravi"
          disabled={busy}
          maxLength={50}
        />
        <button className="acp-btn" onClick={send} disabled={busy || !username.trim()}>
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>

      <div className="acp-note">
        <span aria-hidden="true">🔒</span>
        <span>Your coach approves before you join their roster. Got an invite link instead? Just open it.</span>
      </div>

      {msg && (
        <div className={msg.ok ? 'acp-ok' : 'acp-err'}>
          {msg.ok ? '✓ ' : '⚠️ '}{msg.text}
        </div>
      )}

      {pending.length > 0 && (
        <div className="acp-pending">
          <div className="acp-pending-h">Waiting for a reply</div>
          {pending.map((p) => (
            <div key={p._id} className="acp-pending-row">
              <span>{p.coachId?.displayName || p.coachId?.username || 'Coach'}</span>
              <span className="acp-chip">Pending</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
