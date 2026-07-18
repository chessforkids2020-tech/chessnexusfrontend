// pages/coach/MyMeetingsPage.jsx
// Host-only (the 2 allowed accounts). Create/manage REUSABLE live-classroom
// meetings — each has a fixed duration and a stable shareable link that can be
// reused any day / pasted into a class-schedule slot. "Start" opens the classroom.
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const DURATIONS = [10, 20, 30, 40, 60];
const C = {
  bg: '#0a0a0a', panel: 'rgba(23,23,23,0.72)', border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f0', dim: 'rgba(240,240,240,0.6)', cyan: '#06b6d4', green: '#10b981', red: '#ef4444',
};

// Build the shareable link on the FRONTEND origin (the /join/:code page lives in
// the app, not the API server). This is always correct in dev and prod.
export function buildJoinLink(joinCode) {
  return `${window.location.origin}/join/${joinCode}`;
}

export default function MyMeetingsPage() {
  const nav = useNavigate();
  const { canHostLiveClassroom: authCanHost, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');
  // Host eligibility state: 'yes' (verified) | 'pending' (coach awaiting review) |
  // 'no' (not a coach) | null (not loaded yet).
  const [hostState, setHostState] = useState(null);
  // The coach's live-class plan limits (meetings/day, max minutes, room size).
  const [limits, setLimits] = useState(null); // { durationMin, meetingsPerDay(-1=∞), maxStudents, usedToday, limitToday }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, st] = await Promise.all([
        api.get('/api/coach-live/meetings'),
        api.get('/api/coach/status').catch(() => null),
      ]);
      setMeetings(Array.isArray(r.data) ? r.data : []);
      if (st?.data) {
        setHostState(st.data.liveClassroomHostState || (st.data.canHostLiveClassroom ? 'yes' : 'no'));
      }
      const lc = st?.data?.liveClass;
      if (lc) {
        setLimits(lc);
        // Clamp the default duration selection to what the plan allows.
        setDuration(d => Math.min(d, lc.durationMin || 30));
      }
    } catch (e) {
      if (e.response?.status === 403) setMsg('Live classroom hosting is not enabled for this account.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Durations the plan allows (≤ the plan's max). Falls back to all if unknown.
  const allowedDurations = DURATIONS.filter(d => !limits || d <= (limits.durationMin || 60));

  const create = async () => {
    setCreating(true); setMsg('');
    try {
      await api.post('/api/coach-live/meetings', { title: title.trim(), durationMinutes: duration });
      setTitle('');
      await load();
    } catch (e) { setMsg(e.response?.data?.message || 'Could not create meeting.'); }
    finally { setCreating(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Deactivate this meeting? Its link will stop working.')) return;
    try { await api.delete(`/api/coach-live/meetings/${id}`); setMeetings(m => m.filter(x => x.id !== id)); }
    catch { alert('Failed to deactivate'); }
  };

  const start = async (id) => {
    try {
      const r = await api.post(`/api/coach-live/meetings/${id}/start`);
      const sid = r.data?.session?.id;
      nav(`/coach/live/session/${sid}`);
    } catch (e) { alert(e.response?.data?.message || 'Could not start the class.'); }
  };

  const copy = async (link, id) => {
    try { await navigator.clipboard.writeText(link); setCopied(id); setTimeout(() => setCopied(''), 1500); }
    catch { /* clipboard blocked */ }
  };

  const privileged = isAdmin || authCanHost;

  // A coach who isn't verified yet → friendly "pending review" screen. Only show
  // once we've confirmed the state (never during load), and never to admins.
  if (!privileged && hostState === 'pending') {
    return (
      <div style={s.wrap}>
        <div style={s.pendingCard}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>🎓</div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Verification in progress</h1>
          <p style={{ color: C.dim, fontSize: 14.5, lineHeight: 1.6, marginTop: 12 }}>
            Live classrooms are available to <b style={{ color: C.text }}>verified coaches</b> only.
            The ChessNexus team is reviewing your onboarding — we’ll verify your account shortly.
          </p>
          <p style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>
            You’ll be able to host live classes as soon as you’re verified. Thanks for your patience! 🙏
          </p>
          <div style={s.pendingHint}>
            💡 Meanwhile, you can set up your courses, assignments, batches and schedule — everything’s ready for your first class.
          </div>
        </div>
      </div>
    );
  }

  // Confirmed not a coach at all → generic message.
  if (!privileged && hostState === 'no') {
    return <div style={{ ...s.wrap }}><p style={{ color: C.dim }}>This area is only available to coaches.</p></div>;
  }

  const unlimited = limits?.limitToday === -1;
  const atDailyLimit = !unlimited && limits && (limits.usedToday ?? 0) >= limits.limitToday;

  return (
    <div style={s.wrap}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* ── Hero header ── */}
        <div style={s.hero}>
          <div style={s.heroMain}>
            <div style={s.eyebrow}>Live Classroom</div>
            <h1 style={s.h1}>Your classroom meetings</h1>
            <p style={s.sub}>
              Create a reusable meeting once — it gets a permanent link you can share with a batch
              and reuse any day.
            </p>
          </div>
          {/* Plan chips */}
          {limits && (
            <div style={s.chips}>
              <div style={s.chip}>
                <span style={s.chipVal}>{unlimited ? '∞' : limits.limitToday}</span>
                <span style={s.chipKey}>classes / day</span>
              </div>
              <div style={s.chip}>
                <span style={s.chipVal}>{limits.durationMin}<small style={s.chipUnit}>min</small></span>
                <span style={s.chipKey}>per class</span>
              </div>
              <div style={s.chip}>
                <span style={s.chipVal}>{limits.maxStudents}</span>
                <span style={s.chipKey}>students + coach</span>
              </div>
            </div>
          )}
        </div>

        {/* Today's usage — only when there's a real daily cap */}
        {limits && !unlimited && (
          <div style={{ ...s.usage, ...(atDailyLimit ? s.usageFull : {}) }}>
            <span>
              {atDailyLimit
                ? <>🔒 You’ve used today’s live class ({limits.usedToday}/{limits.limitToday}). It resets at midnight IST.</>
                : <>Today: <b>{limits.usedToday ?? 0} of {limits.limitToday}</b> live class{limits.limitToday === 1 ? '' : 'es'} used</>}
            </span>
            <a href="/coach/subscription" style={s.usageLink}>Get more →</a>
          </div>
        )}

        {/* ── Create ── */}
        <div style={s.card}>
          <div style={s.cardTitle}>➕ New meeting</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 260px' }}>
              <label style={s.label}>Title</label>
              <input style={s.input} value={title} maxLength={100} placeholder="e.g. Beginner Batch — Tuesday"
                onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <label style={s.label}>Duration</label>
              <select style={s.input} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                {allowedDurations.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <button style={{ ...s.primary, ...(creating ? { opacity: 0.6 } : {}) }} disabled={creating} onClick={create}>
              {creating ? 'Creating…' : 'Create meeting'}
            </button>
          </div>
          {limits && limits.durationMin < 60 && (
            <p style={s.upsell}>
              💡 Longer classes (up to 60 min) and more per day come with the{' '}
              <a href="/coach/subscription" style={s.upsellLink}>With Live Classroom</a> plans.
            </p>
          )}
          {msg && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{msg}</p>}
        </div>

        {/* ── List ── */}
        <div style={s.listHead}>
          <span>Your meetings</span>
          {meetings.length > 0 && <span style={s.count}>{meetings.length}</span>}
        </div>

        {loading ? (
          <p style={{ color: C.dim }}>Loading…</p>
        ) : meetings.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🎥</div>
            <div style={{ fontWeight: 600 }}>No meetings yet</div>
            <p style={{ color: C.dim, fontSize: 13.5, margin: '6px 0 0' }}>
              Create one above — you’ll get a link to share with your batch.
            </p>
          </div>
        ) : (
          meetings.map(m => (
            <div key={m.id} style={s.meeting}>
              <div style={s.meetingTop}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.meetingName}>{m.title || 'Untitled meeting'}</div>
                  <div style={s.meetingMeta}>
                    <span style={s.pill}>⏱ {m.durationMinutes} min</span>
                    {limits && <span style={s.pill}>👥 up to {limits.maxStudents} students</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={s.start} onClick={() => start(m.id)}>▶ Start class</button>
                  <button style={s.ghost} onClick={() => copy(buildJoinLink(m.joinCode), m.id)}>
                    {copied === m.id ? '✓ Copied' : '🔗 Copy link'}
                  </button>
                  <button style={s.danger} onClick={() => remove(m.id)}>Deactivate</button>
                </div>
              </div>
              <div style={s.linkRow}>
                <span style={s.linkLabel}>Share link</span>
                <code style={s.linkbox}>{buildJoinLink(m.joinCode)}</code>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: '100vh', background: C.bg, color: C.text, padding: '28px 20px 70px', fontFamily: "'Poppins',sans-serif" },

  // ── Hero ──
  hero: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    background: 'radial-gradient(120% 140% at 0% 0%, rgba(6,182,212,0.12), transparent 60%), rgba(23,23,23,0.6)',
    border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 24px',
  },
  heroMain: { minWidth: 260, flex: '1 1 320px' },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.cyan, marginBottom: 7 },
  h1: { margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' },
  sub: { color: C.dim, fontSize: 14, margin: '8px 0 0', lineHeight: 1.55, maxWidth: 460 },

  // Plan stat chips
  chips: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  chip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 92,
    background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)',
    borderRadius: 12, padding: '10px 14px',
  },
  chipVal: { fontSize: 22, fontWeight: 800, color: '#6ee7b7', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  chipUnit: { fontSize: 11, fontWeight: 700, marginLeft: 2, color: '#6ee7b7' },
  chipKey: { fontSize: 10.5, color: 'rgba(167,243,208,0.75)', fontWeight: 600, textAlign: 'center' },

  // Usage strip
  usage: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
    color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
  },
  usageFull: { color: '#fcd34d', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' },
  usageLink: { color: C.cyan, textDecoration: 'none', fontWeight: 700, fontSize: 12.5 },

  // ── Cards ──
  card: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginTop: 16 },
  cardTitle: { fontSize: 13, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 },
  upsell: { color: C.dim, fontSize: 12.5, marginTop: 12, marginBottom: 0 },
  upsellLink: { color: C.cyan, fontWeight: 700, textDecoration: 'none' },

  pendingCard: { maxWidth: 520, margin: '40px auto 0', textAlign: 'center', background: C.panel, border: '1px solid rgba(6,182,212,0.25)', borderRadius: 18, padding: '32px 28px' },
  pendingHint: { marginTop: 20, padding: '12px 14px', borderRadius: 10, fontSize: 13, color: '#cbd5e1', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', textAlign: 'left' },

  label: { display: 'block', fontSize: 12, color: C.dim, marginBottom: 5, fontWeight: 600 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: 14, fontFamily: 'inherit' },
  primary: { padding: '11px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },

  // ── Meeting list ──
  listHead: { display: 'flex', alignItems: 'center', gap: 9, margin: '30px 0 4px', fontSize: 15, fontWeight: 800 },
  count: { fontSize: 11.5, fontWeight: 800, color: C.cyan, background: 'rgba(6,182,212,0.14)', borderRadius: 999, padding: '2px 9px' },
  empty: { marginTop: 14, padding: '36px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 16, background: 'rgba(255,255,255,0.02)' },

  meeting: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginTop: 12 },
  meetingTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  meetingName: { fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' },
  meetingMeta: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 },
  pill: { fontSize: 11.5, fontWeight: 600, color: C.dim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 999, padding: '3px 9px' },

  start: { padding: '8px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  ghost: { padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  danger: { padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', cursor: 'pointer', fontWeight: 600, fontSize: 13 },

  linkRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  linkLabel: { fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 },
  linkbox: { flex: 1, minWidth: 200, fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#67e8f9', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, padding: '8px 10px', wordBreak: 'break-all' },
};
