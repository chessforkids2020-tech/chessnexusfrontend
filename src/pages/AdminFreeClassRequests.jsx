// src/pages/AdminFreeClassRequests.jsx — /admin/free-class-requests
//
// The review queue for parents asking for the free beginner classes. Everything
// after this screen is done by hand: admin reads a request, messages the parent
// on WhatsApp, assigns a coach and creates the batch. The statuses just track
// where each family has got to.
//
// Holds children's names and parents' phone numbers — admin-only, never public.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const STATUSES = [
  { id: 'new',       label: 'New',       color: '#fcd34d' },
  { id: 'contacted', label: 'Contacted', color: '#67e8f9' },
  { id: 'scheduled', label: 'Scheduled', color: '#6ee7b7' },
  { id: 'declined',  label: 'Declined',  color: '#94a3b8' },
];

export default function AdminFreeClassRequests() {
  const nav = useNavigate();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ new: 0, contacted: 0, scheduled: 0, declined: 0 });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [noteDraft, setNoteDraft] = useState({});

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const r = await api.get('/api/free-class/admin/requests', {
        params: status ? { status } : {},
      });
      setRequests(r.data?.requests || []);
      setCounts(r.data?.counts || {});
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/api/free-class/admin/requests/${id}`, { status });
      await load(filter);
    } finally { setBusyId(null); }
  };

  const saveNote = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/api/free-class/admin/requests/${id}`, { adminNotes: noteDraft[id] ?? '' });
      await load(filter);
    } finally { setBusyId(null); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this request? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api.delete(`/api/free-class/admin/requests/${id}`);
      await load(filter);
    } finally { setBusyId(null); }
  };

  // Opens WhatsApp with the parent's number — the next step for almost every row.
  const waLink = (n) => `https://wa.me/${String(n || '').replace(/\D/g, '')}`;

  // Honour the retention promise: delete scheduled requests whose classes have
  // finished, and requests that were declined. Dry-runs first so nothing is
  // deleted without the admin seeing the number.
  const purge = async () => {
    try {
      const [s, d] = await Promise.all([
        api.post('/api/free-class/admin/requests/purge', { mode: 'scheduled', days: 30, dryRun: true }),
        api.post('/api/free-class/admin/requests/purge', { mode: 'declined', days: 30, dryRun: true }),
      ]);
      const total = (s.data?.wouldDelete || 0) + (d.data?.wouldDelete || 0);
      if (total === 0) return window.alert('Nothing to delete yet.\n\nRequests are removed once they have been scheduled (or declined) for more than 30 days.');
      if (!window.confirm(
        `Permanently delete ${total} request(s)?\n\n` +
        `• ${s.data?.wouldDelete || 0} scheduled more than 30 days ago (classes finished)\n` +
        `• ${d.data?.wouldDelete || 0} declined more than 30 days ago\n\n` +
        `This removes the child's name, age and the parent's WhatsApp number, as our privacy policy promises.`
      )) return;
      await Promise.all([
        api.post('/api/free-class/admin/requests/purge', { mode: 'scheduled', days: 30 }),
        api.post('/api/free-class/admin/requests/purge', { mode: 'declined', days: 30 }),
      ]);
      await load(filter);
    } catch {
      window.alert('Could not delete. Please try again.');
    }
  };

  return (
    <div style={S.page}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>🎁 Free class requests</h1>
          <p style={S.sub}>Parents asking for the free beginner classes. Contact, then arrange a coach and a batch.</p>
        </div>
        <button style={S.ghost} onClick={() => nav('/admin')}>← Admin</button>
      </div>

      <div style={S.filters}>
        <button style={filter === '' ? S.chipOn : S.chip} onClick={() => setFilter('')}>
          All
        </button>
        {STATUSES.map(s => (
          <button key={s.id} style={filter === s.id ? S.chipOn : S.chip} onClick={() => setFilter(s.id)}>
            {s.label} ({counts[s.id] ?? 0})
          </button>
        ))}
        <button style={S.ghost} onClick={() => load(filter)}>↻ Refresh</button>
        <button style={S.purge} onClick={purge}>🧹 Delete finished</button>
      </div>

      {/* The privacy policy promises these details are deleted once the classes
          have finished. Stating it here keeps the promise visible to whoever is
          working the queue. */}
      <div style={S.privacyNote}>
        🔒 These are children's names and parents' phone numbers. Our{' '}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={S.plink}>privacy policy</a>{' '}
        says we delete them once the classes finish — use <b>Delete finished</b> regularly.
      </div>

      {loading ? (
        <div style={S.empty}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={S.empty}>No requests{filter ? ` with status "${filter}"` : ''} yet.</div>
      ) : (
        <div style={S.list}>
          {requests.map(r => {
            const st = STATUSES.find(s => s.id === r.status) || STATUSES[0];
            return (
              <div key={r._id} style={S.card}>
                <div style={S.cardTop}>
                  <div>
                    <div style={S.kid}>
                      {r.kidName} <span style={S.age}>· {r.kidAge} yrs</span>
                      <span style={{ ...S.status, color: st.color, borderColor: st.color + '66' }}>{st.label}</span>
                    </div>
                    <div style={S.meta}>
                      {r.country} · {r.knowsPieceMoves ? 'Knows piece moves' : 'Complete beginner'} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {r.note && <div style={S.note}>“{r.note}”</div>}
                  </div>
                  <a href={waLink(r.whatsapp)} target="_blank" rel="noopener noreferrer" style={S.wa}>
                    💬 {r.whatsapp}
                  </a>
                </div>

                <div style={S.actions}>
                  {STATUSES.map(s => (
                    <button key={s.id}
                      disabled={busyId === r._id || r.status === s.id}
                      onClick={() => setStatus(r._id, s.id)}
                      style={r.status === s.id ? S.actOn : S.act}>
                      {s.label}
                    </button>
                  ))}
                  <button style={S.del} disabled={busyId === r._id} onClick={() => remove(r._id)}>Delete</button>
                </div>

                <div style={S.noteRow}>
                  <input
                    style={S.noteInput}
                    placeholder="Admin notes (coach assigned, batch, timing…)"
                    defaultValue={r.adminNotes || ''}
                    onChange={e => setNoteDraft(d => ({ ...d, [r._id]: e.target.value }))}
                  />
                  <button style={S.saveNote} disabled={busyId === r._id} onClick={() => saveNote(r._id)}>Save</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#05060a', color: '#e6e8ee', padding: '26px 20px 80px', maxWidth: 1100, margin: '0 auto' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 },
  title: { margin: 0, fontSize: 25, fontWeight: 800 },
  sub: { margin: '7px 0 0', color: '#94a3b8', fontSize: 13.5 },
  ghost: { padding: '8px 15px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
  chip: { padding: '7px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 },
  chipOn: { padding: '7px 14px', borderRadius: 999, border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.16)', color: '#6ee7b7', cursor: 'pointer', fontSize: 12.5, fontWeight: 800 },
  purge: { padding: '8px 15px', borderRadius: 9, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.10)', color: '#fcd34d', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  privacyNote: { marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.6, color: '#cbd5e1', border: '1px solid rgba(103,232,249,0.28)', background: 'rgba(6,182,212,0.08)' },
  plink: { color: '#67e8f9', fontWeight: 700 },
  empty: { padding: 40, textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, background: 'rgba(255,255,255,0.02)' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  kid: { fontSize: 16.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  age: { color: '#94a3b8', fontWeight: 600, fontSize: 13.5 },
  status: { fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, border: '1px solid' },
  meta: { marginTop: 5, color: '#94a3b8', fontSize: 12.5 },
  note: { marginTop: 7, color: '#cbd5e1', fontSize: 12.5, fontStyle: 'italic' },
  wa: { flex: 'none', alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 700, color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(16,185,129,0.12)' },
  actions: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 },
  act: { padding: '6px 13px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  actOn: { padding: '6px 13px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.16)', color: '#6ee7b7', cursor: 'default', fontSize: 12, fontWeight: 800 },
  del: { marginLeft: 'auto', padding: '6px 13px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.10)', color: '#fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  noteRow: { display: 'flex', gap: 8 },
  noteInput: { flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e6e8ee', fontSize: 12.5 },
  saveNote: { padding: '8px 15px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 },
};
