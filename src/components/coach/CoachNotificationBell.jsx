// components/coach/CoachNotificationBell.jsx
// Live bell for a coach's pending student payment requests.
//
// Before this, a student's payment request landed in CoachPaymentRequest and the
// coach found out only by manually opening /coach/attendance → Requests. Now the
// server emits `coach:paymentRequest` to that coach's personal `user-<id>` socket
// room, so the count updates without a reload.
//
// The socket is the fast path; a 60s poll is the safety net for a dropped
// connection or a tab that slept.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import socket from '../../socket';

export default function CoachNotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState([]);   // most recent pending requests
  // Students asking to join this coach — a different kind of request, but the
  // coach looks in ONE bell, so it belongs in the same badge.
  const [studentReqs, setStudentReqs] = useState([]);
  const boxRef = useRef(null);

  const loadCount = async () => {
    try {
      const r = await api.get('/api/coach-attendance/requests/pending-count');
      setCount(r.data?.count || 0);
    } catch { /* keep the last known count */ }
  };

  const loadLatest = async () => {
    try {
      const r = await api.get('/api/coach-attendance/requests?status=pending');
      setLatest((r.data || []).slice(0, 5));
    } catch { setLatest([]); }
  };

  const loadStudentReqs = async () => {
    try {
      const r = await api.get('/api/coach/student-requests');
      setStudentReqs(r.data?.requests || []);
    } catch { setStudentReqs([]); }
  };

  useEffect(() => {
    loadCount();
    loadStudentReqs();
    const id = setInterval(() => { loadCount(); loadStudentReqs(); }, 60000);   // safety net

    if (!socket.connected) socket.connect();
    // Payload always carries `count`; a new request also carries `request`.
    const onRequest = (d) => {
      if (typeof d?.count === 'number') setCount(d.count);
      else loadCount();
    };
    socket.on('coach:paymentRequest', onRequest);
    const onStudentRequest = () => loadStudentReqs();
    socket.on('coach:studentRequested', onStudentRequest);

    return () => {
      clearInterval(id);
      socket.off('coach:paymentRequest', onRequest);
      socket.off('coach:studentRequested', onStudentRequest);
    };
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) { loadLatest(); loadStudentReqs(); }
  };

  // One badge for everything the coach must act on.
  const totalCount = count + studentReqs.length;

  const answer = async (linkId, action) => {
    try {
      await api.post(`/api/coach/student-requests/${linkId}/${action}`);
      setStudentReqs(prev => prev.filter(r => r._id !== linkId));
    } catch { /* leave the row so the coach can retry */ }
  };

  const goToRequests = () => {
    setOpen(false);
    navigate('/coach/attendance');
  };

  const cur = (c) => (c === 'USD' ? '$' : c === 'EUR' ? '€' : '₹');

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={toggle}
        title={totalCount > 0 ? `${totalCount} item${totalCount === 1 ? '' : 's'} need your attention` : 'No new requests'}
        style={{ position: 'relative' }}
      >
        🔔
        {totalCount > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            minWidth: 18, height: 18, padding: '0 5px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, lineHeight: 1,
            color: '#fff', background: '#ef4444', borderRadius: 999,
            boxShadow: '0 0 0 2px rgba(15,23,42,0.9)',
          }}>
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          width: 320, maxWidth: '90vw',
          background: 'rgba(20,20,30,0.98)', border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 12, padding: 12, backdropFilter: 'blur(10px)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
        }}>
          {studentReqs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                🙋 Student requests
              </div>
              {studentReqs.slice(0, 5).map(r => (
                <div key={r._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ color: '#e2e8f0', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.studentId?.displayName || r.studentId?.username || r.studentName || 'Student'}
                  </span>
                  <span style={{ display: 'flex', gap: 6, flex: 'none' }}>
                    <button onClick={() => answer(r._id, 'approve')} style={{
                      background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.45)',
                      color: '#6ee7b7', borderRadius: 7, padding: '3px 10px', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Accept</button>
                    <button onClick={() => answer(r._id, 'decline')} style={{
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
                      color: '#94a3b8', borderRadius: 7, padding: '3px 10px', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Decline</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            💰 Payment requests
          </div>

          {latest.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: '10px 2px' }}>
              No pending requests.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {latest.map(r => (
                <div key={r._id} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '9px 11px',
                }}>
                  <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600 }}>
                    {r.studentName || 'Student'}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12.5, marginTop: 2 }}>
                    {cur(r.currency)}{r.amount}
                    {r.forMonth ? ` · ${r.forMonth}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right-aligned and sized to its text: this is a "go to the full
              page" link, not the panel's main action, so a full-width primary
              button overstated it. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button onClick={goToRequests} style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              color: '#67e8f9',
              background: 'rgba(6,182,212,0.10)',
              border: '1px solid rgba(6,182,212,0.35)',
            }}>
              Review requests →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
