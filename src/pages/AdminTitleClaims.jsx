// src/pages/AdminTitleClaims.jsx
// Admin review queue for FIDE title claims (/admin/title-claims).
//
// A FIDE ID is public information, so it proves the title exists, not who is
// claiming it. This page exists so a human binds the two: check the uploaded
// FIDE title certificate against the FIDE record, then approve.
//
// The certificate is NOT a static URL — it lives outside express.static and is
// streamed from an admin-only endpoint, so it must be fetched as a blob through
// the authed api client (which attaches the Bearer token) and shown via an
// object URL. Approving or rejecting deletes the file server-side.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PlayerName } from '../utils/playerName';

const FIDE_PROFILE = (id) => `https://ratings.fide.com/profile/${id}`;

function ProofViewer({ claimId }) {
  const [url, setUrl] = useState(null);
  const [mime, setMime] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let objectUrl;
    let alive = true;
    api.get(`/api/title-claim/admin/${claimId}/proof`, { responseType: 'blob' })
      .then((r) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(r.data);
        setMime(r.data.type || '');
        setUrl(objectUrl);
      })
      .catch(() => { if (alive) setErr('Certificate unavailable'); });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl); // don't leak blobs
    };
  }, [claimId]);

  if (err) return <div style={{ color: '#b91c1c', fontSize: 13 }}>{err}</div>;
  if (!url) return <div style={{ color: '#64748b', fontSize: 13 }}>Loading certificate…</div>;

  const box = { width: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' };
  return (
    <div>
      {mime === 'application/pdf'
        ? <iframe src={url} title="FIDE certificate" style={{ ...box, height: 420 }} />
        : <img src={url} alt="FIDE title certificate" style={{ ...box, objectFit: 'contain' }} />}
      <a href={url} target="_blank" rel="noreferrer"
         style={{ display: 'inline-block', marginTop: 6, fontSize: 12.5, color: '#0369a1' }}>
        Open full size ↗
      </a>
    </div>
  );
}

const BACK_BTN = {
  padding: '10px 20px',
  background: '#f0f9f0',
  color: '#064f28',
  border: '2px solid #d6f0d6',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function AdminTitleClaims() {
  const nav = useNavigate();
  const [claims, setClaims] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');

  const load = () => api.get('/api/title-claim/admin/pending')
    .then((r) => setClaims(r.data.claims))
    .catch(() => setError('Failed to load claims'));

  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    if (decision === 'reject' && !window.confirm('Reject this title claim?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.post(`/api/title-claim/admin/${id}/decide`, { decision, note: notes[id] || '' });
      setClaims((cs) => cs.filter((c) => c._id !== id));
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not save decision');
    } finally {
      setBusyId(null);
    }
  };

  // Keep the back button available while loading — never strand the admin here.
  if (!claims) {
    return (
      <div style={{ padding: '20px 4px' }}>
        <button style={BACK_BTN} onClick={() => nav('/admin')}>← Back to Dashboard</button>
        <div style={{ padding: 24, color: '#64748b' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            🏅 Title Claims
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Check each certificate against the player's FIDE record, then approve. Approving sets the
            title on their account; the certificate is deleted either way.
          </p>
        </div>
        <button style={BACK_BTN} onClick={() => nav('/admin')}>← Back to Dashboard</button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                      borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {claims.length === 0 && (
        <div style={{ color: '#64748b', padding: '28px 0', textAlign: 'center' }}>
          No claims awaiting review.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {claims.map((c) => (
          <div key={c._id} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: 18, boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
            display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(260px, 340px)', gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ACCOUNT</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                <PlayerName user={c.userId} />
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>@{c.userId?.username}</div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 14px', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>Claimed title</span>
                <strong style={{ color: '#b45309' }}>{c.claimedTitle}</strong>

                <span style={{ color: '#64748b' }}>Name on FIDE</span>
                <span style={{ color: '#0f172a' }}>{c.fideName}</span>

                <span style={{ color: '#64748b' }}>FIDE ID</span>
                <a href={FIDE_PROFILE(c.fideId)} target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>
                  {c.fideId} ↗
                </a>

                <span style={{ color: '#64748b' }}>Submitted</span>
                <span style={{ color: '#0f172a' }}>{new Date(c.createdAt).toLocaleString()}</span>
              </div>

              <input
                placeholder="Note (shown to the user if rejected)"
                value={notes[c._id] || ''}
                onChange={(e) => setNotes({ ...notes, [c._id]: e.target.value })}
                style={{ width: '100%', marginTop: 14, padding: '8px 10px', fontSize: 13,
                         border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  disabled={busyId === c._id}
                  onClick={() => decide(c._id, 'approve')}
                  style={{ padding: '9px 18px', border: 'none', borderRadius: 8, fontWeight: 700,
                           fontSize: 13.5, cursor: 'pointer', color: '#fff', background: '#059669' }}
                >
                  {busyId === c._id ? 'Saving…' : `Approve ${c.claimedTitle}`}
                </button>
                <button
                  disabled={busyId === c._id}
                  onClick={() => decide(c._id, 'reject')}
                  style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13.5,
                           cursor: 'pointer', color: '#b91c1c', background: '#fff', border: '1px solid #fecaca' }}
                >
                  Reject
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                FIDE TITLE CERTIFICATE
              </div>
              <ProofViewer claimId={c._id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
