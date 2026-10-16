// pages/academy/AcademyPayments.jsx — /academy/payments
// Oversight of the student fee-requests raised by the academy's coaches.
import React, { useEffect, useState } from 'react';
import api from '../../api';
import './AcademyDashboard.css';
import { t as tr } from '../../i18n/LanguageContext';

const curSym = (c) => ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' }[c] || (c || '') + ' ');

export default function AcademyPayments() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/academy/payment-requests')
      .then(r => setRows(r.data?.requests || []))
      .catch(e => setErr(e.response?.data?.message || tr('Could not load payment requests.')));
  }, []);

  if (err) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;
  if (!rows) return <div className="acad-wrap"><div className="acad-empty">{tr("Loading…")}</div></div>;

  return (
    <div className="acad-wrap">
      <h1 style={{ color: 'var(--color-text)', marginBottom: 6 }}>{tr("🧾 Payment requests")}</h1>
      <p className="acad-muted" style={{ marginBottom: 18 }}>
        {tr("Fee requests your coaches have raised to their students. View-only oversight.")}
      </p>
      {rows.length === 0 ? (
        <p className="acad-empty-inline">{tr("No payment requests yet.")}</p>
      ) : (
        <div className="acad-table-wrap">
          <table className="acad-table">
            <thead><tr><th>{tr("Coach")}</th><th>{tr("Student")}</th><th>{tr("Amount")}</th><th>{tr("For")}</th><th>{tr("Status")}</th><th>{tr("Raised")}</th></tr></thead>
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
