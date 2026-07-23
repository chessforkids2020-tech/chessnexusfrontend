// pages/academy/JoinAcademy.jsx — /join-academy/:code
// A coach lands here from an academy's shared join link. Shows the academy and a
// "Request to join" button; the academy head approves before they're added.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import './AcademyDashboard.css';

export default function JoinAcademy() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/api/academy/by-code/${code}`)
      .then(r => { if (alive) setInfo(r.data); })
      .catch(e => { if (alive) setErr(e.response?.data?.message || 'This academy link is not valid.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  const requestJoin = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api.post('/api/academy/join', { code });
      setMsg(r.data?.message || 'Request sent.');
      setInfo(prev => prev ? { ...prev, myStatus: 'requested' } : prev);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not send your join request.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="acad-wrap"><div className="acad-empty">Loading…</div></div>;

  return (
    <div className="acad-wrap" style={{ maxWidth: 560 }}>
      <div className="acad-join-card">
        <div className="acad-join-emoji">🏛️</div>
        {err && !info ? (
          <>
            <h1>Academy link</h1>
            <div className="acad-error">⚠️ {err}</div>
            <Link to="/coach/dashboard" className="btn-ghost">← Back</Link>
          </>
        ) : info ? (
          <>
            <h1>{info.academy.name}</h1>
            <p className="acad-join-sub">You've been invited to join this academy as a coach.</p>

            {msg && <div className="acad-msg">{msg}</div>}
            {err && <div className="acad-error">⚠️ {err}</div>}

            {info.isOwnerOfThis ? (
              <>
                <p className="acad-muted">This is your own academy.</p>
                <button className="btn-primary" onClick={() => navigate('/academy/dashboard')}>Go to dashboard</button>
              </>
            ) : info.myStatus === 'active' ? (
              <>
                <p className="acad-muted">You're already a member of this academy.</p>
                <button className="btn-primary" onClick={() => navigate('/academy/dashboard')}>Open academy</button>
              </>
            ) : info.myStatus === 'requested' ? (
              <p className="acad-muted">✓ Your request is pending. The academy head will approve you shortly.</p>
            ) : info.myStatus === 'in_other' ? (
              <p className="acad-muted">You already belong to another academy, so you can't join this one.</p>
            ) : (
              <>
                <p className="acad-join-note">
                  When you join, the academy may cover your subscription plan. Your own students and
                  data stay yours. The academy head approves your request before you're added.
                </p>
                <button className="btn-primary" onClick={requestJoin} disabled={busy}>
                  {busy ? 'Sending…' : 'Request to join'}
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
