// pages/academy/AcademyPayments.jsx — /academy/payments
// Oversight of the student fee-requests raised by the academy's coaches.
import React, { useEffect, useState } from 'react';
import api from '../../api';
import './AcademyDashboard.css';

const curSym = (c) => ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' }[c] || (c || '') + ' ');

export default function AcademyPayments() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/academy/payment-requests')
      .then(r => setRows(r.data?.requests || []))
      .catch(e => setErr(e.response?.data?.message || 'Could not load payment requests.'));
  }, []);

  if (err) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;
  if (!rows) return <div className="acad-wrap"><div className="acad-empty">Loading…</div></div>;

  return (
    <div className="acad-wrap">
      <h1 style={{ color: '#fff', marginBottom: 6 }}>🧾 Payment requests</h1>
      <p className="acad-muted" style={{ marginBottom: 18 }}>
        Fee requests your coaches have raised to their students. View-only oversight.
      </p>
      {rows.length === 0 ? (
        <p className="acad-empty-inline">No payment requests yet.</p>
      ) : (
        <div className="acad-table-wrap">
          <table className="acad-table">
            <thead><tr><th>Coach</th><th>Student</th><th>Amount</th><th>For</th><th>Status</th><th>Raised</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.coachName}</td>
                  <td>{r.studentName || '—'}</td>
                  <td>{curSym(r.currency)}{((r.amount || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>{r.forMonth || '—'}</td>
                  <td><span className={`acad-role acad-role-${r.status === 'approved' ? 'coach' : r.status === 'rejected' ? 'head' : 'managing'}`}>{r.status}</span></td>
                  <td className="acad-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
