// src/pages/AdminFeedback.jsx
// Admin view of first-session user feedback (auto-prompt modal for new signups).
import React, { useEffect, useState } from 'react';
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

// One answered question block (label + body), only rendered when there's an answer.
function Answer({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 0.3, marginBottom: 4 }}>{label}</div>
      <p style={{ margin: 0, color: C.text, fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  );
}

export default function AdminFeedback() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | new | reviewed | archived

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/feedback/admin/all');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        nav('/login?role=admin');
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    try {
      await api.put(`/api/feedback/admin/${id}/status`, { status });
      setItems(list => list.map(f => (f._id === id ? { ...f, status } : f)));
    } catch { alert('Failed to update status'); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this feedback? This cannot be undone.')) return;
    try {
      await api.delete(`/api/feedback/admin/${id}`);
      setItems(list => list.filter(f => f._id !== id));
    } catch { alert('Failed to delete'); }
  }

  const shown = filter === 'all' ? items : items.filter(f => f.status === filter);

  const chip = (id, label) => (
    <button onClick={() => setFilter(id)} style={{
      background: filter === id ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.04)',
      color: filter === id ? C.cyan : C.dim,
      border: `1px solid ${filter === id ? 'rgba(6,182,212,0.4)' : C.border}`,
      borderRadius: 'var(--radius-pill)', padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>{label}</button>
  );

  const statusBadge = (status) => {
    if (status === 'reviewed') return <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>REVIEWED</span>;
    if (status === 'archived') return <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>ARCHIVED</span>;
    return <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>NEW</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '32px 24px 60px', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: C.text, display: 'flex', alignItems: 'center', gap: 10 }}>💡 User Feedback</h1>
            <p style={{ margin: '6px 0 0', color: C.dim, fontSize: 14 }}>
              {items.length} total · what new players say is missing & what they want
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: 'rgba(255,255,255,0.06)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
            <button onClick={() => nav('/admin')} style={{ background: 'rgba(255,255,255,0.06)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>← Dashboard</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {chip('all', `All (${items.length})`)}
          {chip('new', `New (${items.filter(f => f.status === 'new').length})`)}
          {chip('reviewed', `Reviewed (${items.filter(f => f.status === 'reviewed').length})`)}
          {chip('archived', `Archived (${items.filter(f => f.status === 'archived').length})`)}
        </div>

        {loading ? (
          <div style={{ color: C.dim, textAlign: 'center', padding: 60 }}>Loading feedback…</div>
        ) : shown.length === 0 ? (
          <div style={{ background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', color: C.dim }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>💡</div>
            No feedback {filter !== 'all' ? `in "${filter}"` : 'yet'}.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {shown.map(f => (
              <div key={f._id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {statusBadge(f.status)}
                    {typeof f.accountAgeDays === 'number' && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.dim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>
                        {f.accountAgeDays === 0 ? 'joined today' : `${f.accountAgeDays}d old`}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.faint, fontSize: 12 }}>{new Date(f.createdAt).toLocaleString()}</span>
                </div>

                <Answer label="Anything missing?" value={f.missing} />
                <Answer label="Feature they want" value={f.wantedFeature} />
                <Answer label="Experience" value={f.experience} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ color: C.dim, fontSize: 13 }}>
                    — <b style={{ color: C.text }}>{f.displayName || f.username || 'Anonymous'}</b>
                    {f.username && f.displayName && f.username !== f.displayName ? <span style={{ color: C.faint }}> (@{f.username})</span> : null}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {f.status !== 'reviewed' && (
                      <button onClick={() => setStatus(f._id, 'reviewed')} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Reviewed</button>
                    )}
                    {f.status !== 'archived' && (
                      <button onClick={() => setStatus(f._id, 'archived')} style={{ background: 'rgba(255,255,255,0.06)', color: C.dim, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Archive</button>
                    )}
                    {f.status !== 'new' && (
                      <button onClick={() => setStatus(f._id, 'new')} style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark new</button>
                    )}
                    <button onClick={() => remove(f._id)} style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
