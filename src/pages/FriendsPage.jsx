// src/pages/FriendsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PlayerName from '../components/PlayerName';
import api from '../api';

const TABS = ['Friends', 'Requests', 'Find'];

export default function FriendsPage() {
  const [tab, setTab] = useState('Friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState({}); // userId → { status, friendshipId }

  const fetchFriends = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        api.get('/api/friends'),
        api.get('/api/friends/requests')
      ]);
      setFriends(f.data);
      setRequests(r.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Live search
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    if (!search.trim() || search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/friends/search?q=${encodeURIComponent(search.trim())}`);
        setSearchResults(res.data);
        // Fetch status for each result
        const statuses = {};
        await Promise.all(res.data.map(async u => {
          try {
            const st = await api.get(`/api/friends/status/${u._id}`);
            statuses[u._id] = st.data;
          } catch (_) {}
        }));
        setStatusMap(statuses);
      } catch (err) { console.error(err); }
    }, 350);
    setSearchTimer(t);
  }, [search]);

  const sendRequest = async (userId) => {
    try {
      const res = await api.post('/api/friends/request', { userId });
      setStatusMap(prev => ({ ...prev, [userId]: { status: 'pending', iAmRequester: true, friendshipId: res.data.friendshipId } }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      await api.post(`/api/friends/accept/${friendshipId}`);
      await fetchFriends();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const declineRequest = async (friendshipId) => {
    try {
      await api.post(`/api/friends/decline/${friendshipId}`);
      setRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const unfriend = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await api.delete(`/api/friends/${friendshipId}`);
      setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>👥 Friends</h1>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Requests' && requests.length > 0 && (
              <span style={s.badge}>{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Friends tab ── */}
      {tab === 'Friends' && (
        <div>
          {friends.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
              <p>No friends yet. Use the <strong>Find</strong> tab to add friends!</p>
            </div>
          ) : (
            <div style={s.list}>
              {friends.map(f => (
                <div key={f.friendshipId} style={s.card}>
                  <div style={s.avatar}>{(f.user?.displayName || f.user?.username || '?')[0].toUpperCase()}</div>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}><PlayerName displayName={f.user?.displayName} username={f.user?.username} /></div>
                    <div style={s.cardSub}>@{f.user?.username}</div>
                  </div>
                  <button style={s.btnDanger} onClick={() => unfriend(f.friendshipId)}>Unfriend</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Requests tab ── */}
      {tab === 'Requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={s.empty}>
              <p>No pending friend requests.</p>
            </div>
          ) : (
            <div style={s.list}>
              {requests.map(r => (
                <div key={r.friendshipId} style={s.card}>
                  <div style={s.avatar}>{(r.user?.displayName || r.user?.username || '?')[0].toUpperCase()}</div>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}><PlayerName displayName={r.user?.displayName} username={r.user?.username} /></div>
                    <div style={s.cardSub}>@{r.user?.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={s.btnAccept} onClick={() => acceptRequest(r.friendshipId)}>Accept</button>
                    <button style={s.btnDecline} onClick={() => declineRequest(r.friendshipId)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Find tab ── */}
      {tab === 'Find' && (
        <div>
          <input
            type="text"
            placeholder="Search by username or display name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
            autoFocus
          />
          {search.trim().length > 0 && search.trim().length < 2 && (
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Type at least 2 characters…</p>
          )}
          <div style={s.list}>
            {searchResults.map(u => {
              const st = statusMap[u._id];
              return (
                <div key={u._id} style={s.card}>
                  <div style={s.avatar}>{(u.displayName || u.username || '?')[0].toUpperCase()}</div>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}><PlayerName displayName={u.displayName} username={u.username} userId={u._id} /></div>
                    <div style={s.cardSub}>@{u.username} · {u.friendCount || 0} friends</div>
                  </div>
                  {!st || st.status === 'none' ? (
                    <button style={s.btnAdd} onClick={() => sendRequest(u._id)}>+ Add</button>
                  ) : st.status === 'accepted' ? (
                    <span style={s.chipFriend}>✓ Friends</span>
                  ) : st.status === 'pending' ? (
                    <span style={s.chipPending}>{st.iAmRequester ? 'Sent' : 'Respond ↑'}</span>
                  ) : null}
                </div>
              );
            })}
            {search.trim().length >= 2 && searchResults.length === 0 && (
              <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 24 }}>No users found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '24px 16px',
    color: '#e2e8f0'
  },
  title: { fontSize: 26, fontWeight: 800, margin: '0 0 24px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 },
  tab: {
    padding: '8px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'color 0.2s'
  },
  tabActive: { color: '#8b5cf6', borderBottom: '2px solid #8b5cf6' },
  badge: {
    background: 'rgba(239,68,68,0.8)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    padding: '1px 7px',
    minWidth: 18,
    textAlign: 'center'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: 15
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  btnAdd: {
    padding: '7px 16px',
    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  btnAccept: {
    padding: '7px 14px',
    background: 'rgba(74,222,128,0.2)',
    color: '#4ade80',
    border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  btnDecline: {
    padding: '7px 14px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  btnDanger: {
    padding: '7px 14px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  chipFriend: {
    padding: '5px 12px',
    background: 'rgba(74,222,128,0.15)',
    color: '#4ade80',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600
  },
  chipPending: {
    padding: '5px 12px',
    background: 'rgba(251,191,36,0.15)',
    color: '#fbbf24',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 16
  }
};
