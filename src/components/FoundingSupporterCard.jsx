// FoundingSupporterCard — a compact, honest "be an early supporter" card shown on
// common pages (dashboard, homepage) while ChessNexus is new. It advertises the
// permanent 👑 Founding Supporter badge for the first N backers — real scarcity,
// no fabricated supporters. Clicking goes to /buy-coffee.
//
// It self-hides for users who are ALREADY active supporters (nothing to sell them),
// and once the founding spots are gone (fetched live from /api/coffee/info).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const FOUNDING_LIMIT = 100; // keep in sync with BuyMeACoffee.jsx

export default function FoundingSupporterCard({ compact = false, style = {} }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [supporters, setSupporters] = useState(null); // null = loading
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('foundingCardDismissed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    let alive = true;
    api.get('/api/coffee/info')
      .then(r => { if (alive) setSupporters(Array.isArray(r.data?.supporters) ? r.data.supporters : []); })
      .catch(() => { if (alive) setSupporters([]); });
    return () => { alive = false; };
  }, []);

  // Already a supporter, dismissed, still loading, or spots gone → don't show.
  if (dismissed) return null;
  if (user?.coffeeSupporter) return null;
  if (supporters === null) return null;
  const spotsLeft = FOUNDING_LIMIT - supporters.length;
  if (spotsLeft <= 0) return null;

  const dismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    try { localStorage.setItem('foundingCardDismissed', '1'); } catch { /* */ }
  };

  return (
    <div style={{ ...styles.card, ...(compact ? styles.compact : {}), ...style }}>
      <button type="button" aria-label="Dismiss" onClick={dismiss} style={styles.x}>✕</button>
      <div style={styles.icon}>👑</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.title}>Become a Founding Supporter</div>
        <div style={styles.sub}>
          ChessNexus is brand new. Our first {FOUNDING_LIMIT} supporters get a{' '}
          <strong style={{ color: '#fde68a' }}>permanent 👑 badge</strong> that never expires —{' '}
          <strong style={{ color: '#fde68a' }}>{spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left</strong>.
        </div>
      </div>
      <button type="button" onClick={() => navigate('/buy-coffee')} style={styles.btn}>
        Claim ☕
      </button>
    </div>
  );
}

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))',
    border: '1px solid rgba(245,158,11,0.38)',
    borderRadius: 16,
    padding: '16px 18px',
    fontFamily: 'Poppins, sans-serif',
    boxShadow: '0 10px 30px -18px rgba(245,158,11,0.4)'
  },
  compact: { padding: '12px 14px', borderRadius: 14, gap: 11 },
  x: {
    position: 'absolute', top: 8, right: 10, background: 'transparent', border: 'none',
    color: 'rgba(253,230,138,0.6)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2
  },
  icon: { fontSize: 30, flex: 'none', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' },
  title: { fontWeight: 800, color: '#fef3c7', fontSize: 15.5, marginBottom: 3 },
  sub: { color: 'rgba(229,231,235,0.82)', fontSize: 12.8, lineHeight: 1.5 },
  btn: {
    flex: 'none', cursor: 'pointer', border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1f2937',
    fontWeight: 800, fontSize: 13.5, padding: '10px 16px', borderRadius: 11,
    fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap'
  }
};
