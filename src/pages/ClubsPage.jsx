// src/pages/ClubsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ClubsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [clubs, setClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', isPrivate: false });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-open join modal if ?code= is in URL (from private club invite link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      setShowJoin(true);
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        api.get(`/api/clubs?search=${encodeURIComponent(search)}&page=${page}`),
        api.get('/api/clubs/mine')
      ]);
      setClubs(all.data.clubs);
      setTotal(all.data.total);
      setPages(all.data.pages);
      setMyClubs(mine.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search]);

  const createClub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/clubs', createForm);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', isPrivate: false });
      navigate(`/clubs/${res.data.club._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create club');
    } finally { setSubmitting(false); }
  };

  const joinClub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/clubs/join', { joinCode: joinCode.trim() });
      setShowJoin(false);
      setJoinCode('');
      navigate(`/clubs/${res.data.clubId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid join code');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🏰 Clubs</h1>
          <p style={s.sub}>Join a club, chat with members, and play together.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnSecondary} onClick={() => setShowJoin(true)}>🔑 Join with Code</button>
          <button style={s.btnPrimary} onClick={() => setShowCreate(true)}>+ Create Club</button>
        </div>
      </div>

      {/* My Clubs */}
      {myClubs.length > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>My Clubs</h2>
          <div style={s.grid}>
            {myClubs.map(c => (
              <div key={c._id} style={{ ...s.clubCard, border: '1px solid rgba(139,92,246,0.4)' }}
                onClick={() => navigate(`/clubs/${c._id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={s.clubName}>{c.name}</div>
                  {c.isPrivate
                    ? <span style={s.privateBadge}>🔒 Private</span>
                    : <span style={s.publicBadge}>🌍 Public</span>}
                </div>
                <div style={s.clubDesc}>{c.description || 'No description'}</div>
                <div style={s.clubMeta}>👥 {c.memberCount} members</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Browse Clubs {total > 0 && <span style={{ color: 'var(--color-text-faint)', fontWeight: 400, fontSize: 14 }}>({total} total)</span>}</h2>
        <input
          type="text"
          placeholder="Search clubs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.searchInput}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>Loading…</div>
        ) : clubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>
            No clubs found. <button style={s.linkBtn} onClick={() => setShowCreate(true)}>Create the first one!</button>
          </div>
        ) : (
          <>
            <div style={s.grid}>
              {clubs.map(c => (
                <div key={c._id} style={s.clubCard} onClick={() => navigate(`/clubs/${c._id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={s.clubName}>{c.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={s.publicBadge}>🌍 Public</span>
                      {c.isMember && <span style={s.memberChip}>✓ Member</span>}
                    </div>
                  </div>
                  <div style={s.clubDesc}>{c.description || 'No description'}</div>
                  <div style={s.clubMeta}>👥 {c.memberCount} members</div>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} style={{ ...s.pagBtn, ...(p === page ? s.pagBtnActive : {}) }}
                    onClick={() => setPage(p)}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={s.overlay} onClick={() => setShowCreate(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Create a Club</h2>
            <form onSubmit={createClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Club name *"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                style={s.inputField}
                required
                maxLength={50}
              />
              <textarea
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                style={{ ...s.inputField, height: 80, resize: 'vertical' }}
                maxLength={300}
              />
              {/* Privacy selector */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Visibility</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: false }))}
                    style={{
                      padding: '12px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                      background: !createForm.isPrivate ? 'rgba(34,197,94,0.15)' : 'var(--color-white-a04)',
                      border: !createForm.isPrivate ? '2px solid rgba(34,197,94,0.5)' : '2px solid var(--color-white-a07)',
                      color: 'var(--color-text)', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>🌍</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: !createForm.isPrivate ? '#4ade80' : 'var(--color-text-muted)' }}>Public</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2, lineHeight: 1.4 }}>Anyone can find &amp; join</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: true }))}
                    style={{
                      padding: '12px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                      background: createForm.isPrivate ? 'var(--color-accent-2-a15)' : 'var(--color-white-a04)',
                      border: createForm.isPrivate ? '2px solid rgba(139,92,246,0.5)' : '2px solid var(--color-white-a07)',
                      color: 'var(--color-text)', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: createForm.isPrivate ? 'var(--color-accent-2)' : 'var(--color-text-muted)' }}>Private</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2, lineHeight: 1.4 }}>Invite link only</div>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" style={s.btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={s.btnPrimary} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div style={s.overlay} onClick={() => setShowJoin(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Join with Code</h2>
            <form onSubmit={joinClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Enter club join code…"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                style={{ ...s.inputField, fontFamily: 'monospace', letterSpacing: 2 }}
                required
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" style={s.btnSecondary} onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit" style={s.btnPrimary} disabled={submitting}>
                  {submitting ? 'Joining…' : 'Join Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px', color: 'var(--color-text)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 26, fontWeight: 800, margin: '0 0 4px' },
  sub: { color: 'var(--color-text-faint)', fontSize: 14, margin: 0 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' },
  searchInput: {
    width: '100%',
    padding: '11px 16px',
    background: 'var(--color-black-a35)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 16
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14
  },
  clubCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-white-a07)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s',
    '&:hover': { borderColor: 'rgba(139,92,246,0.4)' }
  },
  clubName: { fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
  clubDesc: { fontSize: 12, color: 'var(--color-text-faint)', lineHeight: 1.5, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  clubMeta: { fontSize: 12, color: 'var(--color-text-faint)' },
  memberChip: { fontSize: 11, padding: '2px 8px', background: 'var(--color-accent-2-a15)', color: 'var(--color-accent-2)', borderRadius: 'var(--radius-md)', fontWeight: 600 },
  publicBadge: { fontSize: 11, padding: '2px 8px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 'var(--radius-md)', fontWeight: 600 },
  privateBadge: { fontSize: 11, padding: '2px 8px', background: 'var(--color-danger-a12)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontWeight: 600 },
  btnPrimary: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg,var(--color-accent-2),#6d28d9)',
    color: 'var(--color-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  btnSecondary: {
    padding: '9px 18px',
    background: 'var(--color-white-a04)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  linkBtn: { background: 'none', border: 'none', color: 'var(--color-accent-2)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  pagBtn: { padding: '6px 12px', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a10)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 },
  pagBtnActive: { background: 'var(--color-accent-2-a30)', color: 'var(--color-accent-2)', borderColor: 'rgba(139,92,246,0.5)' },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'var(--color-black-a65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modal: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: 'var(--radius-xl)',
    padding: '28px 32px',
    width: '100%',
    maxWidth: 440,
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 20px', color: 'var(--color-text)' },
  inputField: {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--color-black-a35)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  }
};
