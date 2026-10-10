// components/UpgradeCard.jsx
// Settings → Member tab, top card: "You're part of the ChessNexus community"
// plus every ChessNexus membership — the ones this user holds are lit, the rest
// are dimmed (not locked; they're just not yours yet). One small, quiet
// "Become a Coach" link below (/coach/onboarding), hidden for coaches.
//
// Held memberships come from the same sources the badges elsewhere use:
//   Knight / NS / NX / NC → SupporterContext (useIsSupporter + useNexusTitle)
//   Elite                 → user.role === 'elite'
//   Coach                 → user.isCoach
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsSupporter, useNexusTitle } from '../context/SupporterContext';

const cardStyle = {
  background: 'linear-gradient(135deg, var(--color-accent-a12), var(--color-accent-2-a12))',
  border: '1px solid var(--color-accent-a30)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
  marginBottom: 22,
};

// Badge colours match the Members page (nx-knight / nx-ns / nx-nx / nx-nc).
// Two groups: what kind of member you are, and the title next to your name.
const MEMBERSHIPS = [
  { key: 'player', badge: '♙', name: 'Player', desc: 'Every ChessNexus member', color: '#94a3b8', border: 'rgba(148,163,184,0.35)' },
  { key: 'coach', badge: '🎓', name: 'Coach', desc: 'Runs their own academy', color: '#5eead4', border: 'rgba(45,212,191,0.5)' },
  { key: 'elite', badge: '⭐', name: 'Elite', desc: 'Invited members', color: '#fbbf24', border: 'rgba(251,191,36,0.5)' },
];
const TITLES = [
  { key: 'knight', badge: '♞', name: 'Knight Warrior', desc: 'Supports ChessNexus', color: '#cbd5e1', border: 'rgba(148,163,184,0.45)' },
  { key: 'NS', badge: 'NS', name: 'Nexus Supporter', desc: 'Supports the platform', color: '#67e8f9', border: 'rgba(6,182,212,0.45)' },
  { key: 'NX', badge: 'NX', name: 'Nexus Expert', desc: 'Senior supporter', color: '#c4b5fd', border: 'rgba(139,92,246,0.5)' },
  { key: 'NC', badge: 'NC', name: 'Nexus Coach', desc: 'Awarded to top coaches', color: '#fcd34d', border: 'rgba(245,158,11,0.55)' },
];

const groupLabel = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
  color: 'var(--color-text-muted)', margin: '0 0 8px',
};

const smallBtn = {
  background: 'transparent', color: 'var(--color-text-muted)',
  border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)',
  padding: '5px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
};

function TierCard({ tier, held }) {
  return (
    <div
      title={held ? `You are a ${tier.name}` : tier.name}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        background: held ? 'var(--color-white-a07)' : 'var(--color-white-a04)',
        border: `1px solid ${held ? tier.border : 'var(--color-white-a07)'}`,
        opacity: held ? 1 : 0.4,
        boxShadow: held ? `0 0 14px ${tier.border}` : 'none',
        minWidth: 0,
      }}
    >
      <div style={{
        flex: '0 0 auto', width: 34, height: 34, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${tier.border}`, color: tier.color,
        fontWeight: 800, fontSize: tier.badge.length > 1 && /^[A-Z]+$/.test(tier.badge) ? 12.5 : 17,
        letterSpacing: 0.3,
      }}>{tier.badge}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: held ? tier.color : 'var(--color-text)', lineHeight: 1.25 }}>
          {tier.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.35, marginTop: 2 }}>
          {tier.desc}
        </div>
        {held && (
          <div style={{ fontSize: 10, fontWeight: 800, color: tier.color, letterSpacing: 0.4, marginTop: 3 }}>
            ✓ YOU
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradeCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id || user?._id;
  const isSupporter = useIsSupporter(user?.username, user?.displayName, uid);
  const title = useNexusTitle(user?.username, user?.displayName, uid);

  const held = {
    player: true,
    // A titled supporter shows their title (NS/NX/NC) instead of the ♞.
    knight: isSupporter && !title,
    NS: title === 'NS',
    NX: title === 'NX',
    NC: title === 'NC',
    elite: user?.role === 'elite',
    coach: !!user?.isCoach,
  };

  return (
    <section style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: 17, color: 'var(--color-text)' }}>
        You're part of the ChessNexus community ♥
      </h2>
      <p style={{ margin: '4px 0 14px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        What you hold is lit up below.
      </p>

      <div style={groupLabel}>Membership</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {MEMBERSHIPS.map(t => <TierCard key={t.key} tier={t} held={held[t.key]} />)}
      </div>

      <div style={{ ...groupLabel, marginTop: 18 }}>Title</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {TITLES.map(t => <TierCard key={t.key} tier={t} held={held[t.key]} />)}
      </div>

      {!held.coach && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/coach/onboarding')} style={smallBtn}>🎓 Become a Coach</button>
        </div>
      )}
    </section>
  );
}
