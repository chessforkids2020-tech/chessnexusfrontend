// components/UpgradeCard.jsx
// Settings → Member tab, top card: invites the user to become a Coach or Elite
// Member.  Coach → onboarding.  Elite → popup (Collaborate / Support).
//   Support     → /buy-coffee
//   Collaborate → a partner/streamer form (reuses EventSubmission via
//                 /api/public/event-submissions, eventId 'collaborate-request').
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import '../pages/EventRegistration.css'; // .registration-form / .form-group / .submit-button / .error-message
import './BookDemoModal.css'; // reuse .bdm-overlay / .bdm-modal / .bdm-close / .event-icon styles

const cardStyle = {
  background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(16,185,129,0.06))',
  border: '1px solid rgba(6,182,212,0.3)',
  borderRadius: 14,
  padding: 22,
  marginBottom: 22,
};
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(226,232,240,0.6)', marginBottom: 6 };
const input = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.28)',
  color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

export default function UpgradeCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eliteOpen, setEliteOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const goCoach = () => navigate('/coach/onboarding');

  return (
    <>
      {/* ── Upgrade prompt card ─────────────────────── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>🚀</div>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, color: '#f1f5f9' }}>
              You're part of the ChessNexus community ♥
            </h2>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13.5, lineHeight: 1.6 }}>
              Ready for what's next? Become a <b style={{ color: '#e2e8f0' }}>Coach</b> and share your love
              of chess by building your own academy — or join us as an <b style={{ color: '#e2e8f0' }}>Elite Member</b> and
              help shape the community we're growing together.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={goCoach} style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', color: '#04211d',
            border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>🎓 Become a Coach</button>
          <button onClick={() => setEliteOpen(true)} style={{
            background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '11px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>💎 Become an Elite Member</button>
        </div>
      </section>

      {/* ── Elite choice popup ──────────────────────── */}
      {eliteOpen && (
        <EliteChoiceModal
          onClose={() => setEliteOpen(false)}
          onSupport={() => { setEliteOpen(false); navigate('/buy-coffee'); }}
          onCollaborate={() => { setEliteOpen(false); setCollabOpen(true); }}
        />
      )}

      {/* ── Collaborate / streamer form ─────────────── */}
      {collabOpen && (
        <CollaborateModal user={user} onClose={() => setCollabOpen(false)} />
      )}
    </>
  );
}

// ── Elite: Collaborate or Support ──────────────────────────────────────────────
function EliteChoiceModal({ onClose, onSupport, onCollaborate }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const choice = {
    display: 'flex', gap: 14, alignItems: 'center', width: '100%', textAlign: 'left',
    padding: '16px 18px', borderRadius: 14, cursor: 'pointer', color: '#e2e8f0',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    fontFamily: 'inherit', marginBottom: 12,
  };

  return (
    <div className="bdm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bdm-modal" role="dialog" aria-modal="true" aria-label="Become an Elite Member" style={{ width: 'min(480px,100%)' }}>
        <button className="bdm-close" onClick={onClose} aria-label="Close">×</button>
        <div className="bdm-head">
          <div className="event-icon" style={{ margin: 0, fontSize: 34 }}>💎</div>
          <div>
            <h1 className="bdm-title">Become an Elite Member</h1>
            <p className="bdm-subtitle">Partner with ChessNexus, or support the platform.</p>
          </div>
        </div>

        <button style={choice} onClick={onCollaborate}>
          <span style={{ fontSize: 26 }}>🤝</span>
          <span>
            <b style={{ display: 'block', fontSize: 15 }}>Collaborate with us</b>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Streamers, creators &amp; partners — let's work together.</span>
          </span>
        </button>

        <button style={{ ...choice, marginBottom: 0 }} onClick={onSupport}>
          <span style={{ fontSize: 26 }}>☕</span>
          <span>
            <b style={{ display: 'block', fontSize: 15 }}>Support ChessNexus</b>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Buy us a coffee &amp; get a supporter badge.</span>
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Collaborate / streamer form ────────────────────────────────────────────────
function CollaborateModal({ user, onClose }) {
  const [form, setForm] = useState({
    name: user?.displayName || user?.username || '',
    email: user?.email || '',
    isStreamer: null,          // null | true | false
    streamPlatform: '',
    streamLink: '',
    whatsappNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())  return setError('Please enter your name.');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setError('Please enter a valid email.');
    if (form.isStreamer === null) return setError('Please tell us whether you are a streamer.');
    if (form.isStreamer && !form.streamLink.trim())
      return setError('Please add your channel link or username.');

    setSubmitting(true);
    try {
      await api.post('/api/public/event-submissions', {
        eventId: 'collaborate-request',
        eventName: 'Collaborate / Partner Request',
        name: form.name.trim(),
        email: form.email.trim(),
        isStreamer: form.isStreamer,
        streamPlatform: form.isStreamer ? form.streamPlatform.trim() : '',
        streamLink: form.isStreamer ? form.streamLink.trim() : '',
        whatsappNumber: form.whatsappNumber.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const yesNoBtn = (val, txt) => (
    <button type="button" onClick={() => setForm(f => ({ ...f, isStreamer: val }))}
      style={{
        flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        fontFamily: 'inherit',
        color: form.isStreamer === val ? '#04211d' : '#e2e8f0',
        background: form.isStreamer === val ? 'linear-gradient(135deg,#06b6d4,#10b981)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${form.isStreamer === val ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
      }}>{txt}</button>
  );

  return (
    <div className="bdm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bdm-modal" role="dialog" aria-modal="true" aria-label="Collaborate with ChessNexus">
        <button className="bdm-close" onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div className="bdm-success">
            <div className="bdm-success-icon">🤝</div>
            <h2>Thanks for reaching out!</h2>
            <p>ChessNexus will connect with you shortly at <b>{form.email.trim()}</b>.</p>
            <button className="submit-button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="bdm-head">
              <div className="event-icon" style={{ margin: 0, fontSize: 34 }}>🤝</div>
              <div>
                <h1 className="bdm-title">Collaborate with ChessNexus</h1>
                <p className="bdm-subtitle">Streamers, creators and partners — tell us a bit about you and we'll reach out.</p>
              </div>
            </div>

            <form onSubmit={submit} className="registration-form" style={{ marginTop: 0 }}>
              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-group">
                <label style={label} htmlFor="col-name">Your name *</label>
                <input id="col-name" style={input} value={form.name} onChange={set('name')} placeholder="Your name or brand" disabled={submitting} />
              </div>

              <div className="form-group">
                <label style={label} htmlFor="col-email">Email *</label>
                <input id="col-email" type="email" style={input} value={form.email} onChange={set('email')} placeholder="you@example.com" disabled={submitting} />
              </div>

              <div className="form-group">
                <label style={label}>Are you a streamer / content creator? *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {yesNoBtn(true, 'Yes')}
                  {yesNoBtn(false, 'No')}
                </div>
              </div>

              {form.isStreamer && (
                <>
                  <div className="form-group">
                    <label style={label} htmlFor="col-plat">Platform</label>
                    <input id="col-plat" style={input} value={form.streamPlatform} onChange={set('streamPlatform')} placeholder="YouTube, Twitch, Facebook, Instagram…" disabled={submitting} />
                  </div>
                  <div className="form-group">
                    <label style={label} htmlFor="col-link">Channel link or username *</label>
                    <input id="col-link" style={input} value={form.streamLink} onChange={set('streamLink')} placeholder="https://youtube.com/@yourchannel or @username" disabled={submitting} />
                  </div>
                </>
              )}

              <div className="form-group">
                <label style={label} htmlFor="col-wa">
                  WhatsApp number <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <input id="col-wa" style={input} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="+91…" disabled={submitting} />
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Sending…' : '🚀 Send collaboration request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
