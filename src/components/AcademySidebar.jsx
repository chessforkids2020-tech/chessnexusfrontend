// components/AcademySidebar.jsx
// Dedicated sidebar for the academy area (/academy/*). Mirrors CoachSidebar's
// look. Shown to the academy owner. A "just manage" owner (usesCoachingTools =
// false) sees ONLY this — the coach sidebar/tools are hidden for them.
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

const NAV = [
  { icon: '📊', label: 'Overview',   path: '/academy/overview' },
  { icon: '👨‍🏫', label: 'Coaches',   path: '/academy/coaches' },
  { icon: '💳', label: 'Billing',    path: '/academy/billing' },
  { icon: '🧾', label: 'Payments',   path: '/academy/payments' },
  { icon: '⚙️', label: 'Settings',   path: '/academy/settings' },
];

export default function AcademySidebar({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get('/api/academy/me').then(r => { if (alive) setMe(r.data || null); }).catch(() => {});
    api.get('/api/academy/requests').then(r => { if (alive) setPending((r.data?.requests || []).length); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const go = (path) => { navigate(path); if (onNavigate) onNavigate(); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const usesCoachingTools = me?.usesCoachingTools !== false;

  return (
    <div style={styles.sidebar}>
      <div style={styles.content}>
        <div style={styles.brand} onClick={() => go('/academy/overview')} title="ChessNexus Academy">
          <span style={styles.brandText}>ChessNexus</span>
          <span style={styles.brandSub}>Academy</span>
        </div>

        <div style={styles.separator} />

        <nav style={styles.navMenu}>
          {NAV.map(item => {
            const active = isActive(item.path);
            const badge = item.path === '/academy/coaches' && pending > 0 ? pending : null;
            return (
              <div
                key={item.path}
                style={active ? styles.navItemActive : styles.navItem}
                onClick={() => go(item.path)}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--color-accent-a12)'; e.currentTarget.style.color = 'var(--color-accent)'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; } }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
                {badge != null && <span style={styles.badge}>{badge}</span>}
              </div>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <div style={styles.separator} />
          {/* A "coach too" owner can hop to their coach workspace; a manage-only
              owner sees "Back to app" instead. */}
          <div style={styles.footerCard}>
            {usesCoachingTools ? (
              <div style={styles.footerHalf} onClick={() => go('/coach/dashboard')}>🎓 Coach tools</div>
            ) : (
              <div style={styles.footerHalf} onClick={() => go('/dashboard')}>← Back to app</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const baseItem = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
  borderRadius: '10px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px',
  fontWeight: 500, fontFamily: "'Poppins', sans-serif",
  whiteSpace: 'nowrap', overflow: 'hidden', background: 'transparent',
  border: '1px solid transparent',
};

const styles = {
  sidebar: {
    // Same themed rail as the main Sidebar — see the note there on why a flat
    // background reads as "the sidebar never changes".
    width: 'var(--sidebar-w)', background: 'var(--sidebar-surface)', position: 'fixed',
    top: 0, left: 0, height: '100vh', boxShadow: '2px 0 20px var(--color-black-a50)',
    zIndex: 100, display: 'flex', flexDirection: 'column',
    fontFamily: "'Poppins', sans-serif", borderRight: '1px solid var(--color-white-a04)',
    backdropFilter: 'blur(10px)',
  },
  content: { display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 0', position: 'relative' },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0 14px 4px', cursor: 'pointer', lineHeight: 1.1 },
  brandText: {
    fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  brandSub: {
    fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '26px', fontWeight: 700, letterSpacing: '1px', fontStyle: 'italic',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: '-2px',
  },
  separator: { height: '1px', margin: '8px 12px', background: 'linear-gradient(90deg, transparent, var(--color-accent-a30), transparent)' },
  navMenu: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px', flex: 1, overflowY: 'auto' },
  navItem: baseItem,
  navItemActive: {
    ...baseItem, color: 'var(--color-accent)', fontWeight: 600,
    background: 'var(--color-accent-a15)', border: '1px solid var(--color-accent-a30)',
    boxShadow: '0 4px 12px var(--color-accent-a20)',
  },
  navIcon: { fontSize: '17px', flexShrink: 0, width: '20px', textAlign: 'center' },
  navLabel: { flex: 1, fontWeight: 600 },
  badge: { background: 'var(--color-warning)', color: '#04211d', fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '1px 6px', minWidth: 16, textAlign: 'center' },
  footer: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px', paddingBottom: '4px' },
  footerCard: { display: 'flex', alignItems: 'stretch', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)', borderRadius: '12px', overflow: 'hidden' },
  footerHalf: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '9px 4px', cursor: 'pointer', color: 'rgba(226,232,240,0.82)',
    fontSize: '12px', fontWeight: 600, fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap',
  },
};
