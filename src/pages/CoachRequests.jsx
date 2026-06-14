import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Student-facing page: review and respond to coach requests (a coach asking to
// add you as their student). Mirrors the sidebar bell, but persistent.
export default function CoachRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // linkId currently being acted on
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coach/requests/incoming');
      setRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const respond = async (linkId, action) => {
    setBusy(linkId);
    try {
      await api.post(`/api/coach/requests/${linkId}/${action}`);
      setRequests(prev => prev.filter(r => r._id !== linkId));
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} the request.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>🎓 Coach Requests</h1>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >← Back</button>
      </div>

      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
        These coaches want to add you as their student. You stay in control — approve only the ones you want.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0', background: 'rgba(23,23,23,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
          No pending coach requests.
        </div>
      ) : (
        requests.map(r => {
          const coach = r.coachId || {};
          const coachName = coach.displayName || coach.username || 'A coach';
          return (
            <div
              key={r._id}
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e9d5ff' }}>
                Coach {coachName}
              </div>
              <div style={{ fontSize: 13.5, color: '#cbd5e1', margin: '6px 0 14px' }}>
                wants to add you as a student.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={busy === r._id}
                  onClick={() => respond(r._id, 'approve')}
                  style={{ flex: 1, background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: busy === r._id ? 'wait' : 'pointer' }}
                >✓ Approve</button>
                <button
                  disabled={busy === r._id}
                  onClick={() => respond(r._id, 'decline')}
                  style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: busy === r._id ? 'wait' : 'pointer' }}
                >✕ Decline</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
