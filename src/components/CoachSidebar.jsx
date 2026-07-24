// components/CoachSidebar.jsx
// Dedicated sidebar for the /coach/* workspace. Replaces the main Sidebar while
// a coach is inside their coaching area (swapped in by UserLayout). Mirrors the
// main sidebar's look (170px, cyan accent, Poppins) so it feels native.
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { icon: '🏠', label: 'Dashboard',   path: '/coach/dashboard' },
  { icon: '📝', label: 'Assignments', path: '/coach/assignments' },
  { icon: '📚', label: 'Courses',     path: '/coach/courses' },
  { icon: '📖', label: 'Library',     path: '/coach/library' },
  { icon: '👥', label: 'Batches',     path: '/coach/batches' },
  { icon: '📅', label: 'Schedule',    path: '/coach/schedule' },
  { icon: '🎯', label: 'Activities',  path: '/coach/activities' },
  { icon: '📋', label: 'Attendance',  path: '/coach/attendance' },
];

// Live Class is host-only (the 2 allowed accounts). Appended conditionally below.
const LIVE_NAV = { icon: '🔴', label: 'Classroom', path: '/coach/live' };
// Academy entry — shown only to members of an academy (head/managing/coach).
const ACADEMY_NAV = { icon: '🏛️', label: 'Academy', path: '/academy/dashboard' };

export default function CoachSidebar({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canHostLiveClassroom: authCanHost, isAdmin } = useAuth();
  // Plan/status state → drives the bottom button AND the Classroom entry. We fetch
  // /api/coach/status fresh below.
  const [plan, setPlan] = useState(null);
  // Show the Classroom entry to any COACH — verified OR pending-verification — so an
  // unverified coach can click it and see the friendly "verification in progress"
  // screen (rather than the entry being invisible). We only hide it for confirmed
  // non-coaches. hostState: 'yes' | 'pending' | 'no'. Default to showing during load
  // (this sidebar only renders for coaches) to avoid the "hidden until reload" race.
  const hostState = plan?.liveClassroomHostState;
  const showClassroom = isAdmin || authCanHost || (hostState ? hostState !== 'no' : true);
  // Academy membership (drives the Academy nav entry).
  const [academy, setAcademy] = useState(null); // { academy, role, status, isOwner } | null
  const isAcademyMember = academy?.academy && academy?.status === 'active';
  let navItems = showClassroom ? [...NAV, LIVE_NAV] : [...NAV];
  if (isAcademyMember) navItems = [...navItems, ACADEMY_NAV];
  // Students online (mirrors the main sidebar's "friends online").
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnline, setShowOnline] = useState(false);
  const onlineBtnRef = useRef(null);
  const onlineDisabled = useRef(false);

  useEffect(() => {
    let alive = true;
    api.get('/api/coach/status')
      .then(r => { if (alive) setPlan(r.data || null); })
      .catch(() => {});
    // Academy membership (for the Academy nav entry).
    api.get('/api/academy/me').then(r => { if (alive) setAcademy(r.data || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Poll which students are online (lastActivity < 5 min). Refresh every 45s.
  useEffect(() => {
    let alive = true;
    const fetchOnline = async () => {
      if (onlineDisabled.current) return;
      try {
        const r = await api.get('/api/coach/students/online');
        if (alive) setOnlineStudents(r.data?.students || []);
      } catch (err) {
        // Disable polling if the endpoint isn't available on this backend.
        if (err?.response?.status === 404) onlineDisabled.current = true;
      }
    };
    fetchOnline();
    const id = setInterval(fetchOnline, 45000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const go = (path) => { navigate(path); if (onNavigate) onNavigate(); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // "Upgrade" for free coaches (or lapsed → downgraded); "Manage plan" otherwise.
  // Admins/elite/privileged/comped NEVER see an upgrade prompt — they already have
  // full access (the admin built the app; showing them "Upgrade" is absurd).
  const planId = plan?.coachSubscription?.plan;
  const isFree = !plan || planId === 'free' || planId === 'trial' || plan?.access?.downgraded;
  const reason = plan?.access?.reason;
  const isPrivileged = isAdmin || reason === 'privileged' || reason === 'elite_free' || reason === 'comped';
  // Academy-sponsored coaches don't buy their own plan — hide upgrade/manage.
  const sponsoredByAcademy = !!plan?.coachSubscription?.sponsoredByAcademy;
  const upgradeLabel = (isPrivileged || sponsoredByAcademy) ? null : (isFree ? '⚡ Upgrade' : '💳 Manage plan');

  return (
    <div style={styles.sidebar}>
      <div style={styles.content}>
        {/* Brand */}
        <div style={styles.brand} onClick={() => go('/coach/dashboard')} title="ChessNexus Coach">
          <span style={styles.brandText}>ChessNexus</span>
          <span style={styles.brandSub}>Coach</span>
        </div>

        <div style={styles.separator} />

        {/* Nav */}
        <nav style={styles.navMenu}>
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <div
                key={item.path}
                style={active ? styles.navItemActive : styles.navItem}
                onClick={() => go(item.path)}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(6,182,212,0.10)'; e.currentTarget.style.color = '#67e8f9'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ffffff'; } }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Footer: online + back-to-app in one card, then a slim upgrade link */}
        <div style={styles.footer}>
          <div style={styles.separator} />

          {/* One card, split left/right: Students online · Back to app */}
          <div style={styles.footerCard}>
            <div
              ref={onlineBtnRef}
              style={styles.footerHalf}
              onClick={() => setShowOnline(v => !v)}
              title={onlineStudents.length > 0 ? `${onlineStudents.length} student${onlineStudents.length === 1 ? '' : 's'} online — click to see who` : 'No students online'}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.10)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                background: onlineStudents.length > 0 ? '#22c55e' : '#64748b',
                boxShadow: onlineStudents.length > 0 ? '0 0 6px #22c55e' : 'none' }} />
              <span>👥 {onlineStudents.length}</span>
            </div>

            <div style={styles.footerDivider} />

            <div
              style={styles.footerHalf}
              onClick={() => go('/dashboard')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="Back to the main app"
            >
              <span>← Back</span>
            </div>
          </div>

          {upgradeLabel && (
            <button
              style={styles.upgradeBtn}
              onClick={() => go('/coach/subscription')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {upgradeLabel}
            </button>
          )}
        </div>
      </div>

      {/* Students-online panel — anchored above the button */}
      {showOnline && (() => {
        const rect = onlineBtnRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return createPortal(
          <>
            <div onClick={() => setShowOnline(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} />
            <div style={{
              position: 'fixed', bottom: window.innerHeight - rect.top + 8, left: rect.left,
              width: 'max-content', minWidth: 240, maxWidth: 320,
              background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 14, boxShadow: '0 -8px 32px rgba(0,0,0,0.65)', zIndex: 9999,
              backdropFilter: 'blur(16px)', maxHeight: '60vh', overflowY: 'auto', padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  Students online <span style={{ color: '#34d399', fontWeight: 800 }}>{onlineStudents.length}</span>
                </span>
                <button onClick={() => setShowOnline(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 15 }} title="Close">✕</button>
              </div>
              {onlineStudents.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '18px 4px' }}>
                  None of your students are online right now.
                </div>
              ) : (
                onlineStudents.map(s => (
                  <div key={s._id}
                    onClick={() => { setShowOnline(false); go('/coach/dashboard'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 11px', marginBottom: 8, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    title={s.groupTag ? `Batch: ${s.groupTag}` : ''}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22c55e', boxShadow: '0 0 5px #22c55e', flexShrink: 0 }} />
                    {s.profilePhotoUrl
                      ? <img src={s.profilePhotoUrl} alt="" style={{ width: 26, height: 26, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
                      : <span style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(34,197,94,0.2)', color: '#86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(s.displayName || '?').charAt(0).toUpperCase()}</span>}
                    <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.displayName}</span>
                  </div>
                ))
              )}
            </div>
          </>,
          document.body
        );
      })()}
    </div>
  );
}

const baseItem = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '7px 12px 7px 10px', color: '#ffffff', cursor: 'pointer',
  borderRadius: '12px', transition: 'all 0.2s ease', fontSize: '14px',
  fontWeight: 500, fontFamily: "'Poppins', sans-serif",
  whiteSpace: 'nowrap', overflow: 'hidden', background: 'transparent',
  border: '1px solid transparent',
};

const styles = {
  sidebar: {
    width: '170px', background: 'rgba(10,10,10,0.95)', position: 'fixed',
    top: 0, left: 0, height: '100vh', boxShadow: '2px 0 20px rgba(0,0,0,0.5)',
    zIndex: 100, display: 'flex', flexDirection: 'column',
    fontFamily: "'Poppins', sans-serif", borderRight: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  },
  content: { display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 0', position: 'relative' },
  brand: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '0 14px 4px', cursor: 'pointer', lineHeight: 1.1,
  },
  brandText: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  brandSub: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '26px', fontWeight: 700, letterSpacing: '1px',
    fontStyle: 'italic',
    background: 'linear-gradient(135deg, #67e8f9 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginTop: '-2px',
  },
  separator: {
    height: '1px', margin: '8px 12px',
    background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)',
  },
  inviteBanner: { margin: '0 10px 8px', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' },
  inviteText: { fontSize: 12, color: '#fcd34d', fontWeight: 600, marginBottom: 8, lineHeight: 1.35 },
  inviteBtns: { display: 'flex', gap: 6 },
  inviteAccept: { flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: '#10b981', color: '#04211d', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  inviteDecline: { flex: 1, padding: '5px 0', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#cbd5e1', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  navMenu: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px', flex: 1, overflowY: 'auto' },
  navItem: baseItem,
  navItemActive: {
    ...baseItem, color: '#06b6d4', fontWeight: 600,
    background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
    boxShadow: '0 4px 12px rgba(6,182,212,0.2)',
  },
  navIcon: { fontSize: '17px', flexShrink: 0, width: '20px', textAlign: 'center' },
  navLabel: { flex: 1, fontWeight: 600 },
  footer: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px', paddingBottom: '4px' },
  // Single card holding "Online" (left) + "Back to app" (right).
  footerCard: {
    display: 'flex', alignItems: 'stretch',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', overflow: 'hidden',
  },
  footerHalf: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '7px 4px', cursor: 'pointer', color: 'rgba(226,232,240,0.82)',
    fontSize: '12px', fontWeight: 600, fontFamily: "'Poppins', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.2s ease',
  },
  footerDivider: { width: '1px', background: 'rgba(255,255,255,0.08)' },
  // Slim outline link — no longer a big filled block that dominates the footer.
  upgradeBtn: {
    margin: 0, padding: '6px 10px',
    background: 'transparent', color: '#22d3ee',
    border: '1px solid rgba(6,182,212,0.4)', borderRadius: '10px',
    fontSize: '12px', fontWeight: 700, fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer', transition: 'background 0.2s ease',
  },
};
