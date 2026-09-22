// pages/coach/TrialClassesPage.jsx
//
// TRIAL CLASSES — one-time links for teaching someone who is NOT a student yet.
//
// The gap this fills: a coach could only teach people already on their roster,
// so the one lesson that WINS a student was impossible to give without first
// enrolling a stranger. Here the coach makes a link, sends it on WhatsApp, and
// the parent joins with no account at all.
//
// The link is spent when someone ACTUALLY ARRIVES, not when the coach opens the
// room — so starting early, or a parent who never turns up, costs nothing.
//
// Styling deliberately mirrors MyMeetingsPage (same `C` palette, same line
// icons): this is the same product doing a neighbouring job, and it should not
// look like a different one.
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const DURATIONS = [10, 20, 30, 40, 60, 120];

const C = {
  text: '#e2e8f0', dim: 'rgba(226,232,240,0.6)', cyan: '#22d3ee', green: '#34d399',
  red: '#f87171', amber: '#fcd34d',
  border: 'rgba(255,255,255,0.08)', panel: 'rgba(20,26,34,0.72)',
};

const Ic = ({ d, size = 18, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flex: 'none' }}>
    <path d={d} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPlus  = (p) => <Ic {...p} d="M12 5v14M5 12h14" sw={2} />;
const IconCopy  = (p) => <Ic {...p} d="M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />;
const IconCheck = (p) => <Ic {...p} d="M5 12.5 10 17.5 19 7" sw={2} />;
const IconTrash = (p) => <Ic {...p} d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v6M14 11v6" />;
const IconClock = (p) => <Ic {...p} d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />;

// The link points at the APP origin (the /trial/:code page lives in the client,
// not on the API host) — correct in dev and prod without configuration.
const buildTrialLink = (code) => `${window.location.origin}/trial/${code}`;

const STATE_META = {
  unused:   { label: 'Ready to send',  color: C.green, hint: 'Not used yet — share it whenever you like.' },
  consumed: { label: 'In use',         color: C.amber, hint: 'Someone has joined with this link. No one new can use it.' },
  closed:   { label: 'Closed',         color: C.dim,   hint: 'Finished. This link no longer works.' },
};

// `embedded` = rendered as a TAB inside the Classroom page (the normal case).
// The standalone route is kept so a direct link still works, and then the panel
// prints its own title.
export default function TrialClassesPage({ embedded = false }) {
  const nav = useNavigate();
  // The "?" explainer. Collapsed by default: a coach who already knows what a
  // trial is should not have to scroll past the pitch every visit.
  const [showHelp, setShowHelp] = useState(false);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/trial-class/links');
      setLinks(Array.isArray(r.data?.links) ? r.data.links : []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load your trial links.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true); setErr(''); setMsg('');
    try {
      const r = await api.post('/api/trial-class/links', {
        label: label.trim(),
        durationMinutes: duration,
      });
      setLinks(prev => [r.data.link, ...prev]);
      setLabel('');
      setMsg('Trial link created — copy it and send it to the parent.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create the trial link.');
    } finally {
      setCreating(false);
    }
  };

  // Open the room. Reuses the normal meeting-start endpoint — a trial IS a live
  // class, and that route already reserves the coach's daily slot and enforces
  // the plan's duration, which a trial must obey like any other class.
  const start = async (row) => {
    setErr('');
    try {
      const r = await api.post(`/api/coach-live/meetings/${row.id}/start`);
      const sid = r.data?.session?.id || r.data?.sessionId;
      if (sid) nav(`/coach/live/session/${sid}`);
      else setErr('Could not open the classroom.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start the trial class.');
    }
  };

  const copy = async (row) => {
    // ALWAYS build from the browser's own origin — never from the server's
    // `joinUrl`. The /trial/:code page is a React route served by the FRONTEND,
    // but the API builds its link from its own host, so in dev that produced
    // localhost:5000 (the API) and the parent got "Cannot GET /trial/…".
    // Same reasoning as buildJoinLink() in MyMeetingsPage.
    const url = buildTrialLink(row.joinCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(row.id);
      setTimeout(() => setCopied(c => (c === row.id ? '' : c)), 1800);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions). Show the link
      // so the coach can copy it by hand rather than losing the action.
      window.prompt('Copy this trial link:', url);
    }
  };

  const cancel = async (row) => {
    if (!window.confirm('Cancel this trial link? Anyone holding it will no longer be able to join.')) return;
    try {
      await api.post(`/api/trial-class/links/${row.id}/cancel`);
      setLinks(prev => prev.filter(l => l.id !== row.id));
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not cancel that link.');
    }
  };

  return (
    <div style={{ maxWidth: embedded ? '100%' : 860, margin: '0 auto', padding: embedded ? 0 : '18px 14px 40px', color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: embedded ? 14 : 6 }}>
        {!embedded && <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Trial classes</h1>}
        {embedded && <div style={{ fontSize: 15, fontWeight: 800 }}>Trial classroom</div>}
        {/* The "?" — everything a coach needs to know about trials, on demand. */}
        <button
          onClick={() => setShowHelp(v => !v)}
          aria-expanded={showHelp}
          aria-label="What is a trial class?"
          title="What is a trial class?"
          style={{
            width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', flex: 'none',
            border: `1px solid ${showHelp ? C.cyan : 'rgba(255,255,255,0.28)'}`,
            background: showHelp ? 'rgba(34,211,238,0.16)' : 'transparent',
            color: showHelp ? C.cyan : C.dim,
            fontSize: 12, fontWeight: 800, lineHeight: 1, padding: 0,
          }}
        >?</button>
      </div>

      {showHelp && (
        <div style={{
          marginBottom: 18, padding: '13px 15px',
          background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.22)',
          borderRadius: 12, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(226,232,240,0.85)',
        }}>
          <p style={{ margin: '0 0 10px' }}>
            Teach someone who is <strong>not your student yet</strong>. Create a link, send it on
            WhatsApp, and they join with <strong>no account and no signup</strong> — they just type
            their name and knock. You let them in exactly like a normal class.
          </p>
          <div style={{ display: 'grid', gap: 7 }}>
            <div>🎟️ <strong>One link, one trial.</strong> It is used up when someone actually joins — if nobody turns up, the link still works next time.</div>
            <div>📋 <strong>No attendance is recorded.</strong> They are not on your roster, so nothing touches your register or your reports.</div>
            <div>⏱️ <strong>The clock starts when they arrive</strong>, not when you open the room — so you can set up early.</div>
          </div>
        </div>
      )}

      {/* ── Create ── */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 16, marginBottom: 22,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>New trial link</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12, color: C.dim, marginBottom: 5 }}>
              Who is it for? (only you see this)
            </span>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Aarav — trial Tuesday"
              maxLength={80}
              style={{
                width: '100%', padding: '9px 11px', borderRadius: 9, fontSize: 13.5,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text,
              }}
            />
          </label>

          <label>
            <span style={{ display: 'block', fontSize: 12, color: C.dim, marginBottom: 5 }}>Length</span>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{
                padding: '9px 11px', borderRadius: 9, fontSize: 13.5,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text,
              }}
            >
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>

          <button
            onClick={create}
            disabled={creating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', borderRadius: 9, border: 'none', cursor: creating ? 'default' : 'pointer',
              background: C.cyan, color: '#06222a', fontSize: 13.5, fontWeight: 800,
              opacity: creating ? 0.65 : 1,
            }}
          >
            <IconPlus size={16} /> {creating ? 'Creating…' : 'Create link'}
          </button>
        </div>

        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 9 }}>
          A trial uses one of your daily live classes, the same as any other class.
        </div>
      </div>

      {msg && <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>{msg}</div>}
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {/* ── The links ── */}
      {loading ? (
        <div style={{ color: C.dim, fontSize: 13.5 }}>Loading…</div>
      ) : links.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '30px 16px', color: C.dim, fontSize: 13.5,
          border: `1px dashed ${C.border}`, borderRadius: 14, lineHeight: 1.6,
        }}>
          No trial links yet.<br />
          Create one above and send it to a parent who wants to try a class.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {links.map(row => {
            const meta = STATE_META[row.trialState] || STATE_META.unused;
            return (
              <div key={row.id} style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 13, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14.5, flex: '1 1 auto', minWidth: 0 }}>
                    {row.label || 'Trial class'}
                  </strong>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                    color: meta.color, background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${meta.color}44`, whiteSpace: 'nowrap',
                  }}>
                    {meta.label}
                  </span>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  fontSize: 12, color: C.dim, marginTop: 6,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <IconClock size={13} /> {row.durationMinutes} min
                  </span>
                  {row.guestName && <span>👤 {row.guestName}</span>}
                </div>

                <div style={{ fontSize: 11.5, color: C.dim, marginTop: 6 }}>{meta.hint}</div>

                {row.trialState !== 'closed' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => start(row)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                        background: C.cyan, border: 'none', color: '#06222a',
                        fontSize: 12.5, fontWeight: 800,
                      }}
                    >
                      ▶ Start class
                    </button>

                    <button
                      onClick={() => copy(row)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 13px', borderRadius: 8, cursor: 'pointer',
                        background: copied === row.id ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${copied === row.id ? C.green : C.border}`,
                        color: copied === row.id ? C.green : C.text, fontSize: 12.5, fontWeight: 700,
                      }}
                    >
                      {copied === row.id ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy link</>}
                    </button>

                    {/* Cancel is offered only on an UNUSED link. A trial already in
                        progress is closed by the end-of-class prompt instead, so a
                        coach cannot kill a room mid-lesson by mistake. */}
                    {row.trialState === 'unused' && (
                      <button
                        onClick={() => cancel(row)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 13px', borderRadius: 8, cursor: 'pointer',
                          background: 'transparent', border: `1px solid ${C.border}`,
                          color: C.red, fontSize: 12.5, fontWeight: 700,
                        }}
                      >
                        <IconTrash size={14} /> Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
