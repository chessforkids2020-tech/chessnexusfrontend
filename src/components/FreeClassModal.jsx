// src/components/FreeClassModal.jsx
//
// The parent's request form for the free beginner classes. Deliberately five
// fields: a parent deciding whether their child should learn chess will not
// fill in a long form, and everything else can be settled on the WhatsApp call.
//
// No account required — asking a parent to sign up before they can ask for a
// free class is the fastest way to lose them.
import React, { useEffect, useState } from 'react';
import api from '../api';

const EMPTY = { kidName: '', kidAge: '', country: '', whatsapp: '', knowsPieceMoves: '', note: '' };

export default function FreeClassModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Reset each time it opens so a second child can be booked cleanly.
  useEffect(() => {
    if (open) { setForm(EMPTY); setError(''); setDone(false); setSubmitting(false); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!form.kidName.trim()) return setError("Please enter your child's name.");
    const age = Number(form.kidAge);
    if (!Number.isFinite(age) || age < 3 || age > 18) return setError('Please enter an age between 3 and 18.');
    if (!form.country.trim()) return setError('Please enter your country.');
    if (String(form.whatsapp).replace(/\D/g, '').length < 7) return setError('Please enter a valid WhatsApp number.');
    if (form.knowsPieceMoves === '') return setError('Please tell us if your child knows how the pieces move.');

    setSubmitting(true);
    try {
      await api.post('/api/free-class/request', {
        kidName: form.kidName,
        kidAge: age,
        country: form.country,
        whatsapp: form.whatsapp,
        knowsPieceMoves: form.knowsPieceMoves === 'yes',
        note: form.note,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button style={S.close} onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '18px 4px' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🎉</div>
            <h2 style={S.title}>Request received</h2>
            <p style={S.sub}>
              The <b>ChessNexus team will contact you shortly on WhatsApp</b> to confirm your
              child's class schedule. Classes are taught in <b>English</b>.
            </p>
            <button style={S.primary} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 style={S.title}>Book a free class</h2>
            <p style={S.sub}>
              We'll arrange a professional coach to teach your child the basics of chess —
              completely free. Classes are taught in <b>English</b>.
            </p>

            <form onSubmit={submit}>
              <label style={S.label}>Child's name
                <input style={S.input} value={form.kidName} maxLength={80}
                  onChange={e => set('kidName', e.target.value)} placeholder="First name is fine" />
              </label>

              <div style={S.row}>
                <label style={{ ...S.label, flex: 1 }}>Age
                  <input style={S.input} type="number" min={3} max={18} value={form.kidAge}
                    onChange={e => set('kidAge', e.target.value)} placeholder="e.g. 8" />
                </label>
                <label style={{ ...S.label, flex: 2 }}>Country
                  <input style={S.input} value={form.country} maxLength={60}
                    onChange={e => set('country', e.target.value)} placeholder="e.g. India" />
                </label>
              </div>

              <label style={S.label}>WhatsApp number
                <input style={S.input} value={form.whatsapp} maxLength={30}
                  onChange={e => set('whatsapp', e.target.value)} placeholder="With country code, e.g. +91 98765 43210" />
                <span style={S.hint}>We use this only to contact you about the class.</span>
              </label>

              <label style={S.label}>Does your child know how the pieces move?
                <div style={S.choices}>
                  {[['yes', 'Yes'], ['no', 'Not yet']].map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => set('knowsPieceMoves', v)}
                      style={form.knowsPieceMoves === v ? S.choiceOn : S.choice}>
                      {l}
                    </button>
                  ))}
                </div>
                <span style={S.hint}>Either is fine — it just helps us pick the right group.</span>
              </label>

              {error && <div style={S.error}>{error}</div>}

              <button type="submit" style={{ ...S.primary, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                {submitting ? 'Sending…' : 'Request a free class'}
              </button>
              {/* Said at the point of decision, not buried in the policy — a
                  parent handing over a child's name deserves to see it here. */}
              <p style={S.privacy}>
                We only use these details to arrange your child's class, and we never
                share them. <b>Once the classes finish we delete them.</b>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(2,6,12,0.72)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto',
  },
  modal: {
    position: 'relative', width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto',
    background: 'linear-gradient(160deg,#0d1520 0%,#0a0f18 100%)',
    border: '1px solid rgba(52,211,153,0.32)', borderRadius: 18, padding: '26px 24px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  },
  close: {
    position: 'absolute', top: 10, right: 12, background: 'none', border: 'none',
    color: '#94a3b8', fontSize: 26, lineHeight: 1, cursor: 'pointer',
  },
  title: { margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: '#e6e8ee' },
  sub: { margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.6, color: '#94a3b8' },
  label: { display: 'block', marginBottom: 14, fontSize: 13, fontWeight: 700, color: '#cbd5e1' },
  input: {
    display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
    color: '#e6e8ee', fontSize: 14, boxSizing: 'border-box',
  },
  row: { display: 'flex', gap: 12 },
  hint: { display: 'block', marginTop: 5, fontSize: 11.5, fontWeight: 500, color: '#64748b' },
  choices: { display: 'flex', gap: 8, marginTop: 6 },
  choice: {
    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1',
  },
  choiceOn: {
    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 800,
    border: '1px solid rgba(52,211,153,0.55)', background: 'rgba(16,185,129,0.16)', color: '#6ee7b7',
  },
  error: {
    margin: '0 0 12px', padding: '9px 12px', borderRadius: 9, fontSize: 12.5,
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5',
  },
  primary: {
    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 800, color: '#04211d',
    background: 'linear-gradient(135deg,#06b6d4 0%,#10b981 100%)',
    boxShadow: '0 10px 26px rgba(52,211,153,0.3)',
  },
  privacy: { margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#64748b', textAlign: 'center' },
};
