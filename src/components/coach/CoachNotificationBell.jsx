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

  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 60000);   // safety net

    if (!socket.connected) socket.connect();
    // Payload always carries `count`; a new request also carries `request`.
    const onRequest = (d) => {
      if (typeof d?.count === 'number') setCount(d.count);
      else loadCount();
    };
    socket.on('coach:paymentRequest', onRequest);

    return () => {
      clearInterval(id);
      socket.off('coach:paymentRequest', onRequest);
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
    if (next) loadLatest();
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
        title={count > 0 ? `${count} pending payment request${count === 1 ? '' : 's'}` : 'No new requests'}
        style={{ position: 'relative' }}
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            minWidth: 18, height: 18, padding: '0 5px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, lineHeight: 1,
            color: '#fff', background: '#ef4444', borderRadius: 999,
            boxShadow: '0 0 0 2px rgba(15,23,42,0.9)',
          }}>
            {count > 99 ? '99+' : count}
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

          <button className="btn-primary" onClick={goToRequests}
            style={{ width: '100%', marginTop: 10 }}>
            Review requests
          </button>
        </div>
      )}
    </div>
  );
}
