// components/MemberPanel.jsx
// Settings → Member tab. Lets the logged-in user leave a star-rated testimonial
// (admins read them in the dashboard) and prompts them to support ChessNexus.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import UpgradeCard from './UpgradeCard';

const cyan = '#06b6d4';
const green = '#10b981';
const amber = '#f59e0b';

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 24,
  marginBottom: 22,
};

export default function MemberPanel() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);   // user's latest testimonial
  const [justSent, setJustSent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/testimonials/mine')
      .then(r => setExisting(r.data?.testimonial || null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const submit = async () => {
    setError('');
    if (!rating) return setError('Please tap a star rating first.');
    if (!text.trim()) return setError('Please write a short testimonial.');
    setSubmitting(true);
    try {
      const r = await api.post('/api/testimonials', { rating, text: text.trim() });
      setExisting(r.data.testimonial);
      setJustSent(true);
      setText('');
      setRating(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Star = ({ i }) => {
    const filled = (hover || rating) >= i;
    return (
      <button type="button" aria-label={`${i} star${i > 1 ? 's' : ''}`}
        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
        onClick={() => setRating(i)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1,
                 fontSize: 30, color: filled ? amber : 'rgba(255,255,255,0.18)',
                 transition: 'transform .1s ease', transform: filled ? 'scale(1.05)' : 'none' }}>
        ★
      </button>
    );
  };

  return (
    <div>
      {/* ── Become a Coach / Elite Member ───────────── */}
      <UpgradeCard />

      {/* ── Testimonial ─────────────────────────────── */}
      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          💬 Share your experience
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 18px' }}>
          Enjoying Chess Nexus? Leave a rating and a few words — it helps us and other players.
        </p>

        {loaded && existing && !justSent && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13.5, color: '#6ee7b7' }}>
            You already shared a {existing.rating}★ testimonial — thank you! You can send an updated one below anytime.
          </div>
        )}

        {justSent && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: 10, padding: '14px 16px', marginBottom: 16, color: '#6ee7b7', fontSize: 14 }}>
            ✅ Thank you! Your testimonial was submitted.
          </div>
        )}

        {/* stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          {[1, 2, 3, 4, 5].map(i => <Star key={i} i={i} />)}
          <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 13 }}>
            {rating ? `${rating} / 5` : 'Tap to rate'}
          </span>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="What do you like about Chess Nexus? What's helped you improve?"
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10,
                   border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.28)',
                   color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ color: '#475569', fontSize: 12 }}>{text.length}/600</span>
        </div>

        {error && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 8 }}>⚠️ {error}</div>}

        <button onClick={submit} disabled={submitting} style={{
          marginTop: 14, background: submitting ? 'rgba(6,182,212,0.4)' : `linear-gradient(135deg,${cyan},${green})`,
          color: '#04211d', border: 'none', borderRadius: 10, padding: '11px 22px',
          fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
        }}>
          {submitting ? 'Submitting…' : justSent ? 'Submit another' : '🚀 Submit testimonial'}
        </button>
      </section>

      {/* ── Support card ────────────────────────────── */}
      <section style={{
        ...cardStyle,
        marginBottom: 0,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))',
        border: '1px solid rgba(245,158,11,0.35)',
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>☕</div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#fde68a' }}>Would you like to support ChessNexus.in?</h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(253,230,138,0.8)', fontSize: 13.5, lineHeight: 1.6 }}>
            Chess Nexus is free and ad-free. A small contribution helps cover servers and new features —
            and gets you a ☕ supporter badge next to your name.
          </p>
        </div>
        <button onClick={() => navigate('/buy-coffee')} style={{
          flex: 'none', background: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))',
          color: '#241a05', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 999,
          padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          Buy us a coffee →
        </button>
      </section>
    </div>
  );
}
