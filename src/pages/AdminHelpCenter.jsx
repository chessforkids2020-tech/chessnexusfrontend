// src/pages/AdminHelpCenter.jsx
// What users actually typed into the Help Center chat.
//
// The point of this page is the UNANSWERED list: every row there is a real
// person who asked something the help bank could not answer. Sorted by how many
// people asked, it is a ranked to-do list for what to write next — in the
// words users actually use rather than what we imagine they call things.
//
// Admins write the answer into the row itself, so the wording is saved and
// ready to paste into helpCenter.js the next time the bank is updated.
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const C = {
  bg: '#0a0a0a',
  panel: 'rgba(23,23,23,0.72)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f0',
  dim: 'rgba(240,240,240,0.6)',
  faint: 'rgba(240,240,240,0.4)',
  cyan: '#06b6d4',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

const btn = {
  background: 'rgba(255,255,255,0.06)', color: C.text,
  border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)',
  padding: '8px 14px', fontSize: 13, cursor: 'pointer',
};

function Stat({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 130px', background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 'var(--radius-lg)', padding: '14px 16px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || C.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AdminHelpCenter() {
  const nav = useNavigate();
  const [items, setItems]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  // Unanswered first: that is the list worth acting on.
  const [filter, setFilter]   = useState('unanswered');
  const [sort, setSort]       = useState('count');
  const [search, setSearch]   = useState('');
  const [openId, setOpenId]   = useState(null);
  const [draft, setDraft]     = useState({ resolution: '', adminNote: '', link: '' });
  const [saving, setSaving]   = useState(false);
  // Two different things live on this page: the passive log of what people
  // typed, and the inbox of messages that are actually waiting on a reply.
  const [view, setView]       = useState('questions'); // questions | coaching
  const [reqs, setReqs]       = useState([]);
  const [reqCounts, setReqCounts] = useState({});
  const [replyDraft, setReplyDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        api.get('/api/help-queries', { params: { filter, sort, q: search, limit: 100 } }),
        api.get('/api/help-queries/stats'),
      ]);
      setItems(Array.isArray(list.data?.items) ? list.data.items : []);
      setStats(st.data || null);
      try {
        const cr = await api.get('/api/coaching-requests', { params: { status: 'new' } });
        setReqs(Array.isArray(cr.data?.items) ? cr.data.items : []);
        setReqCounts(cr.data?.counts || {});
      } catch { /* the questions list still works without this */ }
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) nav('/login?role=admin');
    } finally {
      setLoading(false);
    }
  }, [filter, sort, search, nav]);

  useEffect(() => { load(); }, [load]);

  const openRow = (row) => {
    if (openId === row._id) { setOpenId(null); return; }
    setOpenId(row._id);
    setDraft({ resolution: row.resolution || '', adminNote: row.adminNote || '', link: row.link || '' });
  };

  async function save(id, extra = {}) {
    setSaving(true);
    try {
      const body = { ...draft, ...extra };
      const res = await api.patch(`/api/help-queries/${id}`, body);
      setItems(list => list.map(r => (r._id === id ? { ...r, ...res.data } : r)));
      if (extra.status) setOpenId(null);
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    try {
      await api.delete(`/api/help-queries/${id}`);
      setItems(list => list.filter(r => r._id !== id));
    } catch { alert('Failed to delete'); }
  }

  async function sendReply(id) {
    const text = (replyDraft[id] || '').trim();
    if (!text) return;
    setSaving(true);
    try {
      await api.post(`/api/coaching-requests/${id}/reply`, { reply: text });
      // Drop it from the queue: this view shows only what still needs answering.
      setReqs(list => list.filter(r => r._id !== id));
      setReplyDraft(d => ({ ...d, [id]: '' }));
    } catch { alert('Failed to send reply'); }
    finally { setSaving(false); }
  }

  const chip = (id, label, cur, set) => (
    <button key={id} onClick={() => set(id)} style={{
      background: cur === id ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.04)',
      color: cur === id ? C.cyan : C.dim,
      border: `1px solid ${cur === id ? 'rgba(6,182,212,0.4)' : C.border}`,
      borderRadius: 'var(--radius-pill)', padding: '6px 14px',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>{label}</button>
  );

  const badge = (text, color, bg) => (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: bg,
      border: `1px solid ${color}55`, borderRadius: 'var(--radius-pill)',
      padding: '2px 8px', whiteSpace: 'nowrap',
    }}>{text}</span>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '32px 24px 60px', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>❓ Help Center Questions</h1>
            <p style={{ margin: '6px 0 0', color: C.dim, fontSize: 14 }}>
              What users typed into the help chat. Unanswered ones are what to write next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={btn}>↻ Refresh</button>
            <button onClick={() => nav('/admin')} style={btn}>← Dashboard</button>
          </div>
        </div>

        {/* View switch. The coaching tab carries a count because those are
            people waiting on a human reply, not a passive log. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {chip('questions', 'Logged questions', view, setView)}
          {chip('coaching', `Coaching inbox${reqs.length ? ` (${reqs.length})` : ''}`, view, setView)}
        </div>

        {/* Stats */}
        {view === 'questions' && stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <Stat label="Distinct questions" value={stats.distinct} />
            <Stat label="Times asked" value={stats.totalAsks} />
            <Stat label="No answer found" value={stats.unanswered} color={stats.unanswered ? C.red : C.green} />
            <Stat label="Awaiting triage" value={stats.pending} color={stats.pending ? C.amber : C.green} />
            <Stat label="Asked last 7 days" value={stats.last7Days} color={C.cyan} />
          </div>
        )}

        {view === 'questions' && (<>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {chip('unanswered', 'No answer found', filter, setFilter)}
          {chip('all', 'All', filter, setFilter)}
          {chip('answered', 'Answered by bot', filter, setFilter)}
          {chip('new', 'Not triaged', filter, setFilter)}
          {chip('ignored', 'Ignored', filter, setFilter)}
          {chip('typed', 'Typed by users', filter, setFilter)}
          {chip('tapped', 'Tapped suggestions', filter, setFilter)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {chip('count', '↕ Most asked', sort, setSort)}
          {chip('popular', '↕ Most opened', sort, setSort)}
          {chip('recent', '↕ Most recent', sort, setSort)}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions…"
            style={{
              flex: '1 1 220px', minWidth: 0, padding: '8px 12px', fontSize: 13,
              background: 'rgba(255,255,255,0.04)', color: C.text,
              border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', outline: 'none',
            }}
          />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ color: C.dim, textAlign: 'center', padding: 60 }}>Loading questions…</div>
        ) : items.length === 0 ? (
          <div style={{ color: C.dim, textAlign: 'center', padding: 60, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)' }}>
            Nothing here yet. Questions appear once users type into the Help Center chat.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(row => {
              const open = openId === row._id;
              return (
                <div key={row._id} style={{ background: C.panel, border: `1px solid ${open ? 'rgba(6,182,212,0.35)' : C.border}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                  {/* Row header */}
                  <div onClick={() => openRow(row)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{
                      flexShrink: 0, minWidth: 38, height: 38, padding: '0 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(6,182,212,0.14)', border: '1px solid rgba(6,182,212,0.3)',
                      borderRadius: 'var(--radius-md)', color: C.cyan, fontWeight: 800, fontSize: 15,
                    }}>{row.askCount}×</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{row.question}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 7 }}>
                        {row.answered
                          ? badge('BOT ANSWERED', C.green, 'rgba(16,185,129,0.14)')
                          : badge('NO ANSWER', C.red, 'rgba(239,68,68,0.14)')}
                        {row.published && badge('★ LIVE', C.green, 'rgba(16,185,129,0.2)')}
                        {row.status === 'answered' && !row.published && badge('DRAFT', C.cyan, 'rgba(6,182,212,0.14)')}
                        {row.status === 'ignored'  && badge('IGNORED', C.faint, 'rgba(255,255,255,0.05)')}
                        {row.audience !== 'unknown' && badge(row.audience.toUpperCase(), C.amber, 'rgba(245,158,11,0.14)')}
                        {/* Typed vs tapped mean opposite things: typed = they
                            had to write it (possible gap), tapped = they picked
                            an existing answer (popular). */}
                        {row.typedCount  > 0 && badge(`TYPED ${row.typedCount}`, C.red, 'rgba(239,68,68,0.14)')}
                        {row.tappedCount > 0 && badge(`TAPPED ${row.tappedCount}`, C.green, 'rgba(16,185,129,0.14)')}
                        <span style={{ fontSize: 12, color: C.faint }}>
                          last asked {new Date(row.lastAsked).toLocaleDateString()}
                          {row.lastUsername ? ` · @${row.lastUsername}` : ' · guest'}
                        </span>
                      </div>
                      {/* What the bot replied with — so a wrong match is visible, not just a miss. */}
                      {row.answered && row.matchedQ && (
                        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>
                          ↳ matched: <span style={{ color: C.text }}>{row.matchedQ}</span>
                          <span style={{ color: C.faint }}> (score {row.matchedScore})</span>
                        </div>
                      )}
                    </div>

                    <div style={{ flexShrink: 0, color: C.faint, fontSize: 18 }}>{open ? '▾' : '▸'}</div>
                  </div>

                  {/* Editor */}
                  {open && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', background: 'rgba(0,0,0,0.25)' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>
                        ANSWER
                      </label>
                      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8, lineHeight: 1.5 }}>
                        Write the answer, then <strong style={{ color: C.green }}>Publish</strong> to make the
                        help chat serve it. A published answer overrides the built-in one — no code change needed.
                      </div>
                      <textarea
                        value={draft.resolution}
                        onChange={e => setDraft(d => ({ ...d, resolution: e.target.value }))}
                        rows={5}
                        placeholder="Write the answer in plain words, the way you would explain it to a child…"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                          fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical',
                          background: 'rgba(255,255,255,0.04)', color: C.text,
                          border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', outline: 'none',
                        }}
                      />
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, margin: '12px 0 6px' }}>
                        LINK (optional) — an in-app path like /settings
                      </label>
                      <input
                        value={draft.link}
                        onChange={e => setDraft(d => ({ ...d, link: e.target.value }))}
                        placeholder="/settings"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13,
                          background: 'rgba(255,255,255,0.04)', color: C.text,
                          border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', outline: 'none',
                        }}
                      />
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, margin: '12px 0 6px' }}>
                        INTERNAL NOTE (optional)
                      </label>
                      <input
                        value={draft.adminNote}
                        onChange={e => setDraft(d => ({ ...d, adminNote: e.target.value }))}
                        placeholder="e.g. needs a screenshot, or blocked until the feature ships"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13,
                          background: 'rgba(255,255,255,0.04)', color: C.text,
                          border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                        <button disabled={saving} onClick={() => save(row._id)} style={{ ...btn, background: 'rgba(6,182,212,0.18)', color: C.cyan, borderColor: 'rgba(6,182,212,0.4)', fontWeight: 700 }}>
                          {saving ? 'Saving…' : '💾 Save'}
                        </button>
                        {row.published ? (
                          <button disabled={saving} onClick={() => save(row._id, { published: false })} style={{ ...btn, color: C.amber, borderColor: 'rgba(245,158,11,0.4)', fontWeight: 700 }}>
                            ⏸ Unpublish
                          </button>
                        ) : (
                          <button
                            disabled={saving || !draft.resolution.trim()}
                            onClick={() => save(row._id, { published: true, status: 'answered' })}
                            style={{ ...btn, background: 'rgba(16,185,129,0.16)', color: C.green, borderColor: 'rgba(16,185,129,0.4)', fontWeight: 700 }}
                          >
                            ✓ Publish to help chat
                          </button>
                        )}
                        <button disabled={saving} onClick={() => save(row._id, { status: 'ignored' })} style={btn}>
                          Ignore
                        </button>
                        <button onClick={() => remove(row._id)} style={{ ...btn, marginLeft: 'auto', color: C.red, borderColor: 'rgba(239,68,68,0.35)' }}>
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {/* ── Coaching inbox ─────────────────────────────────────────────── */}
        {view === 'coaching' && (
          loading ? (
            <div style={{ color: C.dim, textAlign: 'center', padding: 60 }}>Loading…</div>
          ) : reqs.length === 0 ? (
            <div style={{ color: C.dim, textAlign: 'center', padding: 60, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)' }}>
              Nothing waiting. Answered: {reqCounts.answered || 0}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: C.dim }}>
                Oldest first. The player reads your reply in the Help Center and gets a bell notification.
              </div>
              {reqs.map(r => (
                <div key={r._id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>{r.displayName || r.username || 'Player'}</strong>
                    <span style={{ fontSize: 12, color: C.faint }}>@{r.username}</span>
                    {r.wasSupporter && badge('SUPPORTER', C.amber, 'rgba(245,158,11,0.14)')}
                    {/* Their strength when they asked — the advice depends on it. */}
                    {r.ratingSnapshot?.nexus   ? badge(`NEXUS ${r.ratingSnapshot.nexus}`, C.cyan, 'rgba(6,182,212,0.14)') : null}
                    {r.ratingSnapshot?.lichess ? badge(`LICHESS ${r.ratingSnapshot.lichess}`, C.green, 'rgba(16,185,129,0.14)') : null}
                    {r.ratingSnapshot?.chesscom? badge(`CHESS.COM ${r.ratingSnapshot.chesscom}`, C.green, 'rgba(16,185,129,0.14)') : null}
                    <span style={{ fontSize: 12, color: C.faint, marginLeft: 'auto' }}>
                      {new Date(r.createdAt).toLocaleDateString()} · {r.ratingSnapshot?.gamesPlayed || 0} games
                    </span>
                  </div>

                  {/* What they told us themselves — the account's linked name can
                      be missing or stale, so this is what to look up. */}
                  {r.lichessUsername && (
                    <div style={{ fontSize: 13, color: C.dim, marginBottom: 8 }}>
                      Lichess: <a
                        href={`https://lichess.org/@/${encodeURIComponent(r.lichessUsername)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: C.cyan, fontWeight: 700 }}
                      >@{r.lichessUsername}</a>
                      {r.lichessRating ? ` · says they are ${r.lichessRating}` : ''}
                    </div>
                  )}
                  <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{r.message}</p>

                  <textarea
                    value={replyDraft[r._id] || ''}
                    onChange={e => setReplyDraft(d => ({ ...d, [r._id]: e.target.value }))}
                    rows={5}
                    placeholder="Write the practice plan. The player reads this in the Help Center."
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical',
                      background: 'rgba(255,255,255,0.04)', color: C.text,
                      border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      disabled={saving || !(replyDraft[r._id] || '').trim()}
                      onClick={() => sendReply(r._id)}
                      style={{ ...btn, background: 'rgba(16,185,129,0.16)', color: C.green, borderColor: 'rgba(16,185,129,0.4)', fontWeight: 700 }}
                    >
                      {saving ? 'Sending…' : '✉ Send reply'}
                    </button>
                    <span style={{ fontSize: 12, color: C.faint }}>Delivered in-app · notifies their bell</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
