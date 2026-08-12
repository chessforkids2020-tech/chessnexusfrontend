// src/pages/AdminTestimonials.jsx
// Admin view of user-submitted testimonials (Settings → Member tab).
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

function Stars({ n }) {
  return (
    <span style={{ color: C.amber, letterSpacing: 2, fontSize: 15 }}>
      {'★'.repeat(n)}<span style={{ color: 'rgba(255,255,255,0.15)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default function AdminTestimonials() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | approved | hidden

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/testimonials/admin/all');
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
      await api.put(`/api/testimonials/admin/${id}/status`, { status });
      setItems(list => list.map(t => (t._id === id ? { ...t, status } : t)));
    } catch { alert('Failed to update status'); }
  }

  async function toggleFeature(id, featured) {
    try {
      await api.put(`/api/testimonials/admin/${id}/feature`, { featured });
      setItems(list => list.map(t => (t._id === id ? { ...t, featured } : t)));
    } catch { alert('Failed to update homepage feature'); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this testimonial? This cannot be undone.')) return;
    try {
      await api.delete(`/api/testimonials/admin/${id}`);
      setItems(list => list.filter(t => t._id !== id));
    } catch { alert('Failed to delete'); }
  }

  const shown = filter === 'all' ? items : items.filter(t => t.status === filter);
  const avg = items.length
    ? (items.reduce((s, t) => s + (t.rating || 0), 0) / items.length).toFixed(1)
    : '—';

  const chip = (id, label) => (
    <button onClick={() => setFilter(id)} style={{
      background: filter === id ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.04)',
      color: filter === id ? C.cyan : C.dim,
      border: `1px solid ${filter === id ? 'rgba(6,182,212,0.4)' : C.border}`,
      borderRadius: 'var(--radius-pill)', padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '32px 24px 60px', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: C.text, display: 'flex', alignItems: 'center', gap: 10 }}>💬 Testimonials</h1>
            <p style={{ margin: '6px 0 0', color: C.dim, fontSize: 14 }}>
              {items.length} total · average rating <b style={{ color: C.amber }}>★ {avg}</b>
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
          {chip('pending', `Pending (${items.filter(t => t.status === 'pending').length})`)}
          {chip('approved', `Approved (${items.filter(t => t.status === 'approved').length})`)}
          {chip('hidden', `Hidden (${items.filter(t => t.status === 'hidden').length})`)}
        </div>

        {loading ? (
          <div style={{ color: C.dim, textAlign: 'center', padding: 60 }}>Loading testimonials…</div>
        ) : shown.length === 0 ? (
          <div style={{ background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', color: C.dim }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>💬</div>
            No testimonials {filter !== 'all' ? `in "${filter}"` : 'yet'}.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {shown.map(t => (
              <div key={t._id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Stars n={t.rating} />
                    {t.status === 'approved' && <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>APPROVED</span>}
                    {t.status === 'hidden' && <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>HIDDEN</span>}
                    {t.featured && <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-pill)', padding: '2px 8px' }}>★ ON HOMEPAGE</span>}
                  </div>
                  <span style={{ color: C.faint, fontSize: 12 }}>{new Date(t.createdAt).toLocaleString()}</span>
                </div>

                <p style={{ margin: '0 0 14px', color: C.text, fontSize: 14.5, lineHeight: 1.6 }}>“{t.text}”</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: C.dim, fontSize: 13 }}>
                    — <b style={{ color: C.text }}>{t.displayName || t.username || 'Anonymous'}</b>
                    {t.username && t.displayName && t.username !== t.displayName ? <span style={{ color: C.faint }}> (@{t.username})</span> : null}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleFeature(t._id, !t.featured)}
                      title={t.featured ? 'Remove from homepage' : 'Show on the homepage testimonials'}
                      style={{
                        background: t.featured ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(245,158,11,0.12)',
                        color: t.featured ? '#241a05' : '#fcd34d',
                        border: t.featured ? 'none' : '1px solid rgba(245,158,11,0.35)',
                        borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {t.featured ? '★ On homepage' : '☆ Feature on homepage'}
                    </button>
                    {t.status !== 'approved' && (
                      <button onClick={() => setStatus(t._id, 'approved')} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
                    )}
                    {t.status !== 'hidden' && (
                      <button onClick={() => setStatus(t._id, 'hidden')} style={{ background: 'rgba(255,255,255,0.06)', color: C.dim, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hide</button>
                    )}
                    <button onClick={() => remove(t._id)} style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
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
