// pages/AdminCoaching.jsx
// The coach system rendered INSIDE the admin dashboard, so the admin never leaves
// /admin (avoids landing on the public /coach/* or /my-coach pages that confuse
// parents/students about where to pay fees). Two in-page tabs:
//   • Assignments — embeds the existing CoachAssignments component (self-contained;
//     admins never hit its subscription redirect).
//   • Students   — an admin-owned roster + per-student progress view built on the
//     coach APIs (/coach/students, /coach/students/:id/progress) with NO /coach links.
// Attendance & fees intentionally stay in Teacher/Students — one fees place.

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import CoachAssignments from './coach/CoachAssignments';
import CoachStudentDetail from './coach/CoachStudentDetail';
import MyMeetingsPage from './coach/MyMeetingsPage';
import './coach/CoachDashboard.css';

const C = {
  border: '#e5e7eb', accent: '#6d28d9', accentDark: '#4c1d95',
  text: '#111827', muted: '#6b7280', bg: '#faf5ff',
};

const s = {
  tabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', color: C.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  tabOn: { background: C.accent, color: '#fff', borderColor: C.accent },
  linkBar: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 12, borderRadius: 10, background: C.bg, border: `1px solid ${C.accent}33`, marginBottom: 14 },
  linkBtn: { padding: '8px 14px', background: '#fff', color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  msg: { fontSize: 13, color: C.accentDark, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  card: { border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: '#fff', cursor: 'pointer' },
  name: { fontWeight: 800, color: C.text, fontSize: 15 },
  sub: { color: C.muted, fontSize: 12.5, marginTop: 2 },
  back: { padding: '6px 12px', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: 12 },
  statRow: { display: 'flex', gap: 16, flexWrap: 'wrap', margin: '10px 0' },
  stat: { background: '#f9fafb', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', minWidth: 120 },
  statNum: { fontSize: 22, fontWeight: 900, color: C.accentDark },
  statLbl: { fontSize: 12, color: C.muted },
};

// ── Students roster + per-student progress (admin-owned, no /coach links) ──
function StudentsTab() {
  const [students, setStudents] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // CoachStudent link _id
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { const r = await api.get('/api/coach/students'); setStudents(r.data?.students || []); }
    catch { setStudents([]); }
  }, []);

  // Auto-connect the admin's enrolled students once on open — they're already in
  // the admin's classes, so no manual step needed. Idempotent server-side.
  useEffect(() => {
    let alive = true;
    (async () => {
      try { await api.post('/api/admin/coach/link-students'); } catch { /* ignore */ }
      if (alive) load();
    })();
    return () => { alive = false; };
  }, [load]);

  const linkMyStudents = async () => {
    setLinking(true); setMsg('');
    try {
      const r = await api.post('/api/admin/coach/link-students');
      const { totalEnrolled = 0, newlyLinked = 0 } = r.data || {};
      setMsg(`✓ ${totalEnrolled} enrolled · ${newlyLinked} newly linked.`);
      await load();
    } catch (e) { setMsg(e.response?.data?.message || 'Could not link.'); }
    finally { setLinking(false); }
  };

  // Full rich per-student view — reuse the real coach student-detail page, embedded.
  if (selectedId) {
    return <CoachStudentDetail studentLinkId={selectedId} embedded onBack={() => setSelectedId(null)} />;
  }

  return (
    <div>
      <div style={s.linkBar}>
        <span style={{ fontSize: 13, color: C.muted }}>Your enrolled students are auto-connected here for coaching (assignments &amp; progress).</span>
        <button style={s.linkBtn} disabled={linking} onClick={linkMyStudents}>{linking ? 'Syncing…' : '🔄 Re-sync students'}</button>
        {msg && <span style={s.msg}>{msg}</span>}
      </div>
      {students === null ? <div style={s.sub}>Loading…</div>
        : students.length === 0 ? <div style={s.sub}>No linked students yet. Click “Re-sync students” to bring your enrolled students in.</div>
        : (
          <div className="coach-students-table-wrap">
            <table className="coach-students-table">
              <thead>
                <tr>
                  <th className="cst-player">Student</th>
                  <th className="cst-num">Puzzle</th>
                  <th className="cst-num">Bullet</th>
                  <th className="cst-num">Blitz</th>
                  <th className="cst-num">Rapid</th>
                  <th className="cst-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(l => {
                  const u = l.studentId;
                  const name = l.studentName || u?.displayName || u?.username || 'Unnamed';
                  const r = l.ratings || {};
                  const profileKey = u?.displayName || u?.username;
                  return (
                    <tr key={l._id}>
                      <td className="cst-player">
                        <div className="cst-player-cell">
                          <div className="cst-avatar">
                            {u?.profilePhotoUrl
                              ? <img src={u.profilePhotoUrl} alt={name} />
                              : <span>{name.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className="cst-player-meta">
                            <div className="cst-name">{name}</div>
                            <div className="cst-sub">
                              {u?.username && <>@{u.username}</>}
                              {l.groupTag && <span className="cst-tag">{l.groupTag}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="cst-num">{u?.liveRating ?? '—'}</td>
                      <td className="cst-num">{r.bullet ?? '—'}</td>
                      <td className="cst-num">{r.blitz ?? '—'}</td>
                      <td className="cst-num">{r.rapid ?? '—'}</td>
                      <td className="cst-actions">
                        <div className="cst-btns">
                          {profileKey ? (
                            <Link
                              to={`/player/${encodeURIComponent(profileKey)}`}
                              className="cst-btn cst-btn-profile"
                              title="Open student's public profile"
                            >Profile</Link>
                          ) : (
                            <span className="cst-btn cst-btn-disabled" title="No linked account yet">Profile</span>
                          )}
                          <button
                            className="cst-btn cst-btn-progress"
                            onClick={() => setSelectedId(l._id)}
                            title="View this student's progress"
                          >Progress</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export default function AdminCoaching() {
  const [tab, setTab] = useState('assignments');
  return (
    <div>
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'assignments' ? s.tabOn : {}) }} onClick={() => setTab('assignments')}>📝 Assignments</button>
        <button style={{ ...s.tab, ...(tab === 'students' ? s.tabOn : {}) }} onClick={() => setTab('students')}>👥 Students</button>
        <button style={{ ...s.tab, ...(tab === 'live' ? s.tabOn : {}) }} onClick={() => setTab('live')}>🔴 Live Class</button>
      </div>
      {tab === 'assignments' && <CoachAssignments />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'live' && <MyMeetingsPage />}
    </div>
  );
}
