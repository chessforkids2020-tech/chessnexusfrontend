// src/components/FideTitleCard.jsx
// "Claim your FIDE title" card — Settings → Profile, directly above the coach card.
//
// A FIDE ID is public information, so it can't prove identity on its own. Like
// Lichess and Chess.com, we gate titles behind human review: the user uploads
// their FIDE title certificate and the ChessNexus team approves it. Approval is
// the only thing that sets the title on the account.
import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { TITLES, formatPlayerName } from '../utils/playerName';

const CARD = {
  background: 'linear-gradient(135deg, rgba(180,83,9,0.12), rgba(234,179,8,0.07))',
  border: '1px solid rgba(234,179,8,0.35)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 22px',
  margin: '16px 0',
  backdropFilter: 'blur(10px)',
};
const LABEL = { display: 'block', color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '5px', fontWeight: 600 };
const INPUT = {
  width: '100%', padding: '9px 11px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-white-a13)', background: 'var(--color-black-a20)',
  color: 'var(--color-text)', fontSize: '14px', outline: 'none',
};

export default function FideTitleCard() {
  const { user } = useAuth();
  const [state, setState] = useState(null);   // { claim, chessTitle, fideId }
  const [form, setForm] = useState({ fideId: '', fideName: '', claimedTitle: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = () => api.get('/api/title-claim/mine')
    .then(r => setState(r.data))
    .catch(() => setState({ claim: null, chessTitle: null }));

  useEffect(() => { load(); }, []);

  if (!state) return null;

  // Already titled → show it, nothing to do.
  if (state.chessTitle) {
    return (
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>🏅</div>
          <div>
            <div style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '15px' }}>
              {state.chessTitle} — title verified
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
              You appear as <strong style={{ color: 'var(--color-warning)' }}>{formatPlayerName({ ...user, chessTitle: state.chessTitle })}</strong> everywhere in ChessNexus.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Claim awaiting review.
  if (state.claim?.status === 'pending') {
    return (
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>⏳</div>
          <div>
            <div style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '15px' }}>
              Your title proof is uploaded
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '3px' }}>
              Waiting for the ChessNexus team to verify and approve your{' '}
              <strong>{state.claim.claimedTitle}</strong> title. We'll approve shortly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setDone('');
    if (!file) return setError('Please attach your FIDE title certificate.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('fideId', form.fideId);
      fd.append('fideName', form.fideName);
      fd.append('claimedTitle', form.claimedTitle);
      fd.append('proof', file);
      const r = await api.post('/api/title-claim', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(r.data.message);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit your claim. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const rejected = state.claim?.status === 'rejected';

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '28px' }}>🏅</div>
        <div>
          <div style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '15px' }}>Are you a titled player?</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Carry your FIDE title with you — it will appear before your name everywhere.
          </div>
        </div>
      </div>

      {rejected && (
        <div style={{
          background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a30)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px', marginBottom: '12px',
          color: 'var(--color-danger)', fontSize: '13px',
        }}>
          Your previous claim wasn't approved{state.claim.reviewNote ? `: ${state.claim.reviewNote}` : '.'} You can submit again.
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={LABEL}>FIDE ID</label>
            <input
              style={INPUT} inputMode="numeric" placeholder="e.g. 1503014" required
              value={form.fideId}
              onChange={e => setForm({ ...form, fideId: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div>
            <label style={LABEL}>Full name (as on FIDE)</label>
            <input
              style={INPUT} placeholder="Surname, Given name" required
              value={form.fideName}
              onChange={e => setForm({ ...form, fideName: e.target.value })}
            />
          </div>
          <div>
            <label style={LABEL}>Title</label>
            <select
              style={INPUT} required value={form.claimedTitle}
              onChange={e => setForm({ ...form, claimedTitle: e.target.value })}
            >
              <option value="">Select…</option>
              {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <label style={LABEL}>FIDE title certificate (image or PDF)</label>
          <input
            type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
            style={{ ...INPUT, padding: '7px 10px' }}
          />
          <div style={{ color: 'var(--color-text-faint)', fontSize: '11.5px', marginTop: '5px' }}>
            Only used to verify your title. Deleted as soon as your claim is reviewed.
          </div>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '10px' }}>{error}</div>}
        {done && <div style={{ color: 'var(--color-success)', fontSize: '13px', marginTop: '10px' }}>{done}</div>}

        <button
          type="submit" disabled={busy}
          style={{
            marginTop: '14px', padding: '9px 20px', borderRadius: 'var(--radius-md)', border: 'none',
            background: busy ? 'rgba(234,179,8,0.35)' : 'linear-gradient(135deg,var(--color-warning),#d97706)',
            color: 'var(--color-surface)', fontWeight: 700, fontSize: '14px',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Submitting…' : 'Submit for verification'}
        </button>
      </form>
    </div>
  );
}
