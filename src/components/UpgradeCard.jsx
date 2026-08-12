// components/UpgradeCard.jsx
// Settings → Member tab, top card: invites the user to become a Coach, or to
// support ChessNexus directly.
//   Coach   → /coach/onboarding
//   Support → /buy-coffee
//
// This used to offer "Become an Elite Member", which opened a popup with two
// choices (Collaborate / Support). Support is now a direct button — one less
// click, and it says plainly what it does. The Elite popup and the
// Collaborate/streamer form went with it; the separate support card that used
// to sit at the bottom of the Member tab is gone too, since this replaces it.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const cardStyle = {
  background: 'linear-gradient(135deg, var(--color-accent-a12), var(--color-accent-2-a12))',
  border: '1px solid var(--color-accent-a30)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
  marginBottom: 22,
};
export default function UpgradeCard() {
  const navigate = useNavigate();

  const goCoach = () => navigate('/coach/onboarding');
  const goSupport = () => navigate('/buy-coffee');

  return (
    <>
      {/* ── Upgrade prompt card ─────────────────────── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>🚀</div>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, color: 'var(--color-text)' }}>
              You're part of the ChessNexus community ♥
            </h2>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>
              Ready for what's next? Become a <b style={{ color: 'var(--color-text)' }}>Coach</b> and share your love
              of chess by building your own academy — or <b style={{ color: 'var(--color-text)' }}>support ChessNexus</b> and
              help keep the platform free, ad-free and growing for every player here.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={goCoach} style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)', color: '#04211d',
            border: 'none', borderRadius: 'var(--radius-md)', padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>🎓 Become a Coach</button>
          <button onClick={goSupport} style={{
            background: 'var(--color-white-a04)', color: 'var(--color-text)',
            border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', padding: '11px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>☕ Support ChessNexus</button>
        </div>
      </section>

    </>
  );
}
