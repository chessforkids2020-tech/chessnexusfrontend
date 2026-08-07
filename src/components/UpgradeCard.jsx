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
  background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(16,185,129,0.06))',
  border: '1px solid rgba(6,182,212,0.3)',
  borderRadius: 14,
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
            <h2 style={{ margin: 0, fontSize: 17, color: '#f1f5f9' }}>
              You're part of the ChessNexus community ♥
            </h2>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13.5, lineHeight: 1.6 }}>
              Ready for what's next? Become a <b style={{ color: '#e2e8f0' }}>Coach</b> and share your love
              of chess by building your own academy — or <b style={{ color: '#e2e8f0' }}>support ChessNexus</b> and
              help keep the platform free, ad-free and growing for every player here.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={goCoach} style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', color: '#04211d',
            border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>🎓 Become a Coach</button>
          <button onClick={goSupport} style={{
            background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '11px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>☕ Support ChessNexus</button>
        </div>
      </section>

    </>
  );
}
