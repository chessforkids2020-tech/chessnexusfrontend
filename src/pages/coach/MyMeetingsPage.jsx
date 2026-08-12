// pages/coach/MyMeetingsPage.jsx
// Host-only (verified coaches + admin). Create/manage REUSABLE live-classroom
// meetings — each has a fixed duration and a stable shareable link that can be
// reused any day / pasted into a class-schedule slot. "Start" opens the classroom.
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

// Meeting lengths a coach may pick. 0 = UNLIMITED (runs until the coach ends
// it) and is offered only on plans with unlimited classes a day — matching the
// server's rule in helpers/liveClassLimits.js.
const UNLIMITED = 0;
const DURATIONS = [10, 20, 30, 40, 60, 120];
// Colours aligned to the rest of the coach app (CoachDashboard.css): body text
// #e2e8f0, muted rgba(226,232,240,0.6), cyan/emerald accents. Keeps this page from
// looking like a different product.
const C = {
  text: '#e2e8f0', dim: 'rgba(226,232,240,0.6)', cyan: '#22d3ee', green: '#34d399', red: '#f87171',
  border: 'rgba(255,255,255,0.08)', panel: 'rgba(20,26,34,0.72)',
};

// ── Crisp line icons (replace the emoji — the main "modern SaaS" upgrade) ──────
const Ic = ({ d, size = 18, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flex: 'none' }}>
    <path d={d} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconVideo   = (p) => <Ic {...p} d="M4 6.5h10a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5ZM15.5 10.5 21 7.5v9l-5.5-3Z" />;
const IconPlus    = (p) => <Ic {...p} d="M12 5v14M5 12h14" sw={2} />;
const IconClock   = (p) => <Ic {...p} d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />;
const IconUsers   = (p) => <Ic {...p} d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.4a3.2 3.2 0 0 0-2.4-3.1M16 5.2a3.2 3.2 0 0 1 0 6" />;
const IconPlay    = (p) => <Ic {...p} d="M7 5.5v13l11-6.5-11-6.5Z" sw={1.5} />;
const IconLink    = (p) => <Ic {...p} d="M9.5 14.5 14.5 9.5M10 6.5l1.2-1.2a3.5 3.5 0 0 1 5 5L15 11.5M14 17.5l-1.2 1.2a3.5 3.5 0 0 1-5-5L9 12.5" />;
const IconCopy    = (p) => <Ic {...p} d="M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />;
const IconCheck   = (p) => <Ic {...p} d="M5 12.5 10 17.5 19 7" sw={2} />;
const IconTrash   = (p) => <Ic {...p} d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v6M14 11v6" />;
const IconBolt    = (p) => <Ic {...p} d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />;
const IconLock    = (p) => <Ic {...p} d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />;

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
      // The meetings call 403s for an unverified coach — catch it here so it does
      // NOT short-circuit the status call. Otherwise hostState never resolves to
      // 'pending' and the coach sees a raw error instead of the friendly wait screen.
      const [r, st] = await Promise.all([
        api.get('/api/coach-live/meetings').catch(() => null),
        api.get('/api/coach/status').catch(() => null),
      ]);
      setMeetings(Array.isArray(r?.data) ? r.data : []);
      if (st?.data) {
        setHostState(st.data.liveClassroomHostState || (st.data.canHostLiveClassroom ? 'yes' : 'no'));
      }
      const lc = st?.data?.liveClass;
      if (lc) {
        setLimits(lc);
        // Clamp the default duration selection to what the plan allows.
        setDuration(d => (d === UNLIMITED ? d : Math.min(d, lc.durationMin || 30)));
      }
    } catch (e) {
      // Fallback only — the 'pending' screen above is the primary path for unverified
      // coaches. Keep the wording friendly (not "not enabled", which sounds fixable).
      if (e.response?.status === 403) setMsg('Please wait for the Nexus team to verify you. Once verified, you can start your live classroom.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Durations the plan allows (≤ the plan's max). Falls back to all if unknown.
  const allowedDurations = DURATIONS.filter(d => !limits || d <= (limits.durationMin || 60));
  // Unlimited length rides on the same entitlement as unlimited classes a day
  // (limitToday === -1), which is exactly what the server checks.
  const canPickUnlimited = limits?.limitToday === -1;

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
        <div style={s.bgGlow} />
        <div style={s.pendingCard}>
          <div style={s.pendingIcon}><IconVideo size={30} /></div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#67e8f9' }}>Verification in progress</h1>
          <p style={{ color: C.dim, fontSize: 14.5, lineHeight: 1.6, marginTop: 12 }}>
            Please <b style={{ color: C.text }}>wait for the Nexus team to verify you</b>.
            Once verified, you can start your live classroom.
          </p>
          <p style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>
            Thanks for your patience! 🙏
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
    return <div style={s.wrap}><div style={s.bgGlow} /><p style={{ color: C.dim, textAlign: 'center', marginTop: 60 }}>This area is only available to coaches.</p></div>;
  }

  const unlimited = limits?.limitToday === -1;
  const atDailyLimit = !unlimited && limits && (limits.usedToday ?? 0) >= limits.limitToday;

  return (
    <div style={s.wrap}>
      <div style={s.bgGlow} />
      <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}>

        {/* ── Hero header ── */}
        <div style={s.hero}>
          <div style={s.heroMain}>
            <div style={s.eyebrow}>
              <span style={s.liveDot} />Live Classroom
            </div>
            <h1 style={s.h1}>Your classroom meetings</h1>
            <p style={s.sub}>
              Create a reusable meeting once — it gets a permanent
              link you can share with a batch and reuse any day.
            </p>
          </div>

          {/* Plan stat cards */}
          {limits && (
            <div style={s.chips}>
              <div style={s.chip}>
                <span style={{ ...s.chipIc, ...s.chipIcGreen }}><IconBolt size={17} /></span>
                <span style={s.chipVal}>{unlimited ? '∞' : limits.limitToday}</span>
                <span style={s.chipKey}>Classes / day</span>
                <span style={{ ...s.chipTag, color: C.green }}>{unlimited ? 'Unlimited' : 'Per day'}</span>
              </div>
              <div style={s.chip}>
                <span style={{ ...s.chipIc, ...s.chipIcGreen }}><IconClock size={17} /></span>
                <span style={s.chipVal}>
                  {canPickUnlimited ? '∞' : <>{limits.durationMin}<small style={s.chipUnit}>min</small></>}
                </span>
                <span style={s.chipKey}>Per class</span>
                {/* When the plan allows a no-limit class the headline is already
                    ∞, so the tag says "Unlimited" like the card beside it. The
                    old "Up to 120 min or unlimited" restated the ceiling under a
                    ∞ and read as a cap. The exact minutes are still offered in
                    the Duration dropdown, which is where the choice is made. */}
                <span style={{ ...s.chipTag, color: C.green }}>
                  {canPickUnlimited ? 'Unlimited' : 'Max length'}
                </span>
              </div>
              <div style={s.chip}>
                <span style={{ ...s.chipIc, ...s.chipIcBlue }}><IconUsers size={17} /></span>
                <span style={s.chipVal}>{limits.maxStudents === -1 ? '∞' : limits.maxStudents}</span>
                <span style={s.chipKey}>Students + coach</span>
                <span style={{ ...s.chipTag, color: '#60a5fa' }}>
                  {limits.maxStudents === -1 ? 'Unlimited' : 'Per meeting'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Today's usage — only when there's a real daily cap */}
        {limits && !unlimited && (
          <div style={{ ...s.usage, ...(atDailyLimit ? s.usageFull : {}) }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              {atDailyLimit
                ? <><IconLock size={16} /> You’ve used today’s live class ({limits.usedToday}/{limits.limitToday}). Resets at midnight IST.</>
                : <><IconBolt size={16} /> Today: <b style={{ color: C.text }}>{limits.usedToday ?? 0} of {limits.limitToday}</b> live class{limits.limitToday === 1 ? '' : 'es'} used</>}
            </span>
            <a href="/coach/subscription" style={s.usageLink}>Get more →</a>
          </div>
        )}

        {/* ── Create ── */}
        <div style={s.card}>
          <div style={s.cardTitle}><span style={s.cardTitleIc}><IconPlus size={15} /></span>New meeting</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 260px' }}>
              <label style={s.label}>Title</label>
              <input style={s.input} value={title} maxLength={100} placeholder="e.g. Beginner Batch — Tuesday"
                onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ flex: '0 1 150px' }}>
              <label style={s.label}>Duration</label>
              <select style={s.input} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                {allowedDurations.map(d => <option key={d} value={d}>{d} min</option>)}
                {canPickUnlimited && <option value={UNLIMITED}>Unlimited</option>}
              </select>
            </div>
            <button style={{ ...s.primary, ...(creating ? { opacity: 0.6, cursor: 'default' } : {}) }} disabled={creating} onClick={create}>
              {creating ? 'Creating…' : 'Create meeting'}
            </button>
          </div>
          {limits && !canPickUnlimited && (
            <p style={s.upsell}>
              💡 Unlimited-length classes, unlimited students in the room and more
              classes per day come with the{' '}
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
          <div style={s.skeletonWrap}>
            {[0, 1].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : meetings.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}><IconVideo size={26} /></div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>No meetings yet</div>
            <p style={{ color: C.dim, fontSize: 13.5, margin: '6px 0 0' }}>
              Create one above — you’ll get a link to share with your batch.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {meetings.map(m => (
              <div key={m.id} style={s.meeting}>
                <div style={s.meetingTop}>
                  <div style={s.meetingLead}>
                    <div style={s.meetingAvatar}><IconVideo size={20} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.meetingName}>{m.title || 'Untitled meeting'}</div>
                      <div style={s.meetingMeta}>
                        <span style={s.pill}><IconClock size={13} />{m.durationMinutes > 0 ? `${m.durationMinutes} min` : 'Unlimited'}</span>
                        {limits && (
                          <span style={s.pill}><IconUsers size={13} />
                            {limits.maxStudents === -1 ? 'Unlimited students' : `up to ${limits.maxStudents} students (+ coach)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={s.meetingActions}>
                    <button style={s.start} onClick={() => start(m.id)}><IconPlay size={15} />Start class</button>
                    <button style={s.ghost} onClick={() => copy(buildJoinLink(m.joinCode), m.id)}>
                      {copied === m.id ? <><IconCheck size={15} />Copied</> : <><IconCopy size={15} />Copy link</>}
                    </button>
                    <button style={s.iconDanger} title="Deactivate meeting" onClick={() => remove(m.id)}><IconTrash size={16} /></button>
                  </div>
                </div>
                <div style={s.linkRow}>
                  <span style={s.linkLabel}><IconLink size={13} />Share link</span>
                  <code style={s.linkbox}>{buildJoinLink(m.joinCode)}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { position: 'relative', minHeight: '100vh', background: '#0b0f14', color: C.text, padding: '28px 24px 80px', fontFamily: "'Poppins',sans-serif", fontSize: 15, overflow: 'hidden' },
  // Soft depth behind everything — kills the "flat dead black" look.
  bgGlow: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(60% 45% at 15% 0%, rgba(6,182,212,0.10), transparent 70%), radial-gradient(55% 45% at 95% 5%, rgba(16,185,129,0.09), transparent 70%)',
  },

  // ── Hero ──
  hero: {
    position: 'relative',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 30, flexWrap: 'wrap',
    background: 'linear-gradient(135deg, rgba(20,26,34,0.85), rgba(14,19,26,0.7))',
    border: `1px solid ${C.border}`, borderRadius: 'var(--radius-2xl)', padding: '28px 30px',
    boxShadow: '0 20px 50px -30px rgba(0,0,0,0.8)',
  },
  heroMain: { minWidth: 280, flex: '1 1 420px' },
  eyebrow: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.green, marginBottom: 14 },
  liveDot: { width: 7, height: 7, borderRadius: 'var(--radius-circle)', background: '#34d399', boxShadow: '0 0 0 4px rgba(52,211,153,0.18)' },
  // Hero title — large, bold, white (a display heading; bigger than in-app h1 on purpose).
  h1: { margin: '0 0 10px', fontSize: 'clamp(26px, 3.4vw, 38px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.02em', color: '#f4f8fb' },
  sub: { color: C.dim, fontSize: 12.5, margin: 0, lineHeight: 1.5, maxWidth: 400 },

  // Plan stat cards
  chips: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  chip: {
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 118, flex: '1 1 118px', maxWidth: 150,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))', border: `1px solid ${C.border}`,
    borderRadius: 'var(--radius-xl)', padding: '16px 14px 14px',
  },
  chipIc: { display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 'var(--radius-circle)', marginBottom: 6, color: C.green, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.28)' },
  chipIcGreen: { color: C.green, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.28)' },
  chipIcBlue: { color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.3)' },
  chipVal: { fontSize: 28, fontWeight: 800, color: '#f4f8fb', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  chipUnit: { fontSize: 13, fontWeight: 700, marginLeft: 2, color: 'rgba(244,248,251,0.7)' },
  chipKey: { fontSize: 12, color: C.dim, fontWeight: 600, textAlign: 'center', marginTop: 2 },
  chipTag: { fontSize: 11, fontWeight: 700, textAlign: 'center' },

  // Usage strip
  usage: {
    position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    marginTop: 16, padding: '11px 16px', borderRadius: 'var(--radius-lg)', fontSize: 13,
    color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
  },
  usageFull: { color: '#fcd34d', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' },
  usageLink: { color: C.cyan, textDecoration: 'none', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' },

  // ── Cards ──
  card: {
    position: 'relative', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-xl)',
    padding: '20px 20px 18px', marginTop: 18, boxShadow: '0 14px 40px -28px rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
  },
  // Card heading matches the app's .cb-card h3 (15px), not a tiny uppercase label.
  cardTitle: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 },
  cardTitleIc: { display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 'var(--radius-md)', color: C.cyan, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.24)' },
  upsell: { color: C.dim, fontSize: 12.5, marginTop: 14, marginBottom: 0 },
  upsellLink: { color: C.cyan, fontWeight: 700, textDecoration: 'none' },

  pendingCard: { position: 'relative', maxWidth: 520, margin: '52px auto 0', textAlign: 'center', background: C.panel, border: '1px solid rgba(6,182,212,0.22)', borderRadius: 'var(--radius-2xl)', padding: '34px 30px', boxShadow: '0 20px 50px -30px rgba(0,0,0,0.8)' },
  pendingIcon: { width: 64, height: 64, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-circle)', color: C.cyan, background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.28)' },
  pendingHint: { marginTop: 22, padding: '13px 15px', borderRadius: 'var(--radius-lg)', fontSize: 13, color: '#cbd5e1', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', textAlign: 'left', lineHeight: 1.5 },

  label: { display: 'block', fontSize: 12, color: C.dim, marginBottom: 6, fontWeight: 600 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 'var(--radius-lg)', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  primary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#ffffff', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 10px 26px -12px rgba(52,211,153,0.6)' },

  // ── Meeting list ──
  listHead: { display: 'flex', alignItems: 'center', gap: 10, margin: '30px 0 14px', fontSize: 18, fontWeight: 700 },
  count: { fontSize: 11.5, fontWeight: 800, color: C.cyan, background: 'rgba(6,182,212,0.14)', borderRadius: 'var(--radius-pill)', padding: '2px 10px' },

  skeletonWrap: { display: 'grid', gap: 12 },
  skeleton: { height: 108, borderRadius: 'var(--radius-xl)', background: 'linear-gradient(100deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 70%)', border: `1px solid ${C.border}` },

  empty: { position: 'relative', padding: '44px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.02)' },
  emptyIcon: { width: 58, height: 58, margin: '0 auto 12px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-circle)', color: C.green, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(52,211,153,0.22)' },

  meeting: {
    position: 'relative', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-xl)',
    padding: 18, boxShadow: '0 14px 40px -30px rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    transition: 'border-color .16s ease',
  },
  meetingTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  meetingLead: { display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 240px' },
  meetingAvatar: { width: 46, height: 46, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-lg)', color: C.cyan, background: 'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(16,185,129,0.12))', border: '1px solid rgba(6,182,212,0.24)' },
  meetingName: { fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meetingMeta: { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: C.dim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-pill)', padding: '4px 10px' },
  meetingActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },

  start: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 20px -10px rgba(16,185,129,0.7)' },
  ghost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 'var(--radius-md)', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  iconDanger: { display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.10)', color: '#fca5a5', cursor: 'pointer' },

  linkRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 15, flexWrap: 'wrap' },
  linkLabel: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 },
  linkbox: { flex: 1, minWidth: 200, fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#67e8f9', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 'var(--radius-md)', padding: '9px 11px', wordBreak: 'break-all' },
};
