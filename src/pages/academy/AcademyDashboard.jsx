// pages/academy/AcademyDashboard.jsx — /academy/dashboard
// Academy head/managing view: KPI cards, 6-month graphs, per-coach progress with
// roster drill-down, and (owner only) academy billing — assign each coach a plan,
// see the bulk discount, and pay for them all at once.
import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../../api';
import './AcademyDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Assignable plans (paid tiers). Free/elite_free aren't sponsorable.
const ASSIGNABLE = [
  { id: '', label: '— none —' },
  { id: 'pro', label: 'Pro' },
  { id: 'coach', label: 'Coach' },
  { id: 'live1', label: 'Live Basic' },
  { id: 'live2', label: 'Live Pro' },
  { id: 'live3', label: 'Live Coach' },
];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD'];
const curSym = (c) => ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' }[c] || c + ' ');
const fmtMoney = (minor, c) => `${curSym(c)}${((minor || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AcademyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Join requests (head approves coaches who used the academy link)
  const [requests, setRequests] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Drill-down
  const [openCoach, setOpenCoach] = useState(null);
  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Billing (owner only)
  const [showBilling, setShowBilling] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [months, setMonths] = useState(1);
  const [quote, setQuote] = useState(null);
  const [paying, setPaying] = useState(false);

  const loadQuote = async (cur = currency, mo = months) => {
    try {
      const res = await api.get('/api/academy/billing', { params: { currency: cur, months: mo } });
      setQuote(res.data);
    } catch { setQuote(null); }
  };

  const assignPlan = async (coachId, plan) => {
    try {
      await api.post('/api/academy/assign-plan', { coachId, plan: plan || null });
      await load();       // refresh coach rows (sponsoredPlan)
      await loadQuote();  // refresh the quote
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not assign plan.');
    }
  };

  const payAcademy = async () => {
    setErr(''); setMsg(''); setPaying(true);
    try {
      const orderRes = await api.post('/api/academy/billing/order', { currency, months });
      const d = orderRes.data;
      if (d.devMode) {
        await api.post('/api/academy/billing/dev-activate', { paymentRecordId: d.paymentRecordId });
        setMsg('✅ Plans activated for your coaches (dev mode).');
        await load(); await loadQuote();
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load the payment SDK.');
      const rzp = new window.Razorpay({
        key: d.keyId, amount: d.amount, currency: d.currency, order_id: d.orderId,
        name: 'Chess Academy', description: `${d.coaches} coach plan(s) · ${months} month(s)`,
        theme: { color: '#06b6d4' },
        handler: async (r) => {
          try {
            await api.post('/api/academy/billing/verify', {
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
              paymentRecordId: d.paymentRecordId,
            });
            setMsg('✅ Payment successful — your coaches are now on their plans.');
            await load(); await loadQuote();
          } catch (e) { setErr(e.response?.data?.message || 'Verification failed.'); }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not start payment.');
    } finally {
      setPaying(false);
    }
  };

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.get('/api/academy/overview');
      setData(res.data);
      if (res.data?.isOwner) {
        api.get('/api/academy/requests').then(r => setRequests(r.data?.requests || [])).catch(() => setRequests([]));
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load the academy dashboard.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const approveRequest = async (id, name) => {
    try {
      await api.post(`/api/academy/requests/${id}/approve`);
      setMsg(`${name} approved and added to your academy.`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not approve.');
    }
  };
  const declineRequest = async (id) => {
    try {
      await api.post(`/api/academy/requests/${id}/decline`);
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not decline.');
    }
  };

  const removeCoach = async (coachId, name) => {
    if (!window.confirm(`Remove ${name} from the academy? Their own students and data stay with them.`)) return;
    try {
      await api.delete(`/api/academy/members/${coachId}`);
      setMsg(`${name} removed from the academy.`);
      if (openCoach === coachId) { setOpenCoach(null); setRoster(null); }
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not remove the coach.');
    }
  };

  const toggleRoster = async (coachId) => {
    if (openCoach === coachId) { setOpenCoach(null); setRoster(null); return; }
    setOpenCoach(coachId); setRoster(null); setRosterLoading(true);
    try {
      const res = await api.get(`/api/academy/coach/${coachId}/students`);
      setRoster(res.data?.students || []);
    } catch {
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

  if (loading) return <div className="acad-wrap"><div className="acad-empty">Loading your academy…</div></div>;
  if (err && !data) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;
  if (!data) return null;

  const { academy, isOwner, kpis, graphs, coaches } = data;
  const labels = (graphs?.students || []).map(p => p.month);
  const barData = { labels, datasets: [{ label: 'Students joined', data: (graphs?.students || []).map(p => p.count), backgroundColor: 'rgba(6,182,212,0.6)', borderRadius: 6 }] };
  const lineData = { labels, datasets: [{ label: 'Classes', data: (graphs?.classes || []).map(p => p.count), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3 }] };

  return (
    <div className="acad-wrap">
      <div className="acad-head">
        <div>
          <h1>🏛️ {academy.name}</h1>
          <div className="acad-code">Academy code: <strong>{academy.academyCode}</strong></div>
        </div>
        {isOwner && (
          <button
            className="btn-primary"
            onClick={() => { const next = !showBilling; setShowBilling(next); if (next) loadQuote(); }}
          >
            {showBilling ? 'Hide billing' : '💳 Manage coach plans'}
          </button>
        )}
      </div>

      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      {/* KPI cards */}
      <div className="acad-kpis">
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.totalCoaches}</div><div className="acad-kpi-l">Coaches</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.totalStudents}</div><div className="acad-kpi-l">Students</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.totalClasses}</div><div className="acad-kpi-l">Classes taken</div></div>
        <div className="acad-kpi"><div className="acad-kpi-v">{kpis.studentsJoinedThisMonth}</div><div className="acad-kpi-l">Joined this month</div></div>
      </div>

      {/* Graphs */}
      <div className="acad-charts">
        <div className="acad-chart-card">
          <h3>Students joined (last 6 months)</h3>
          <div className="acad-chart"><Bar data={barData} options={CHART_OPTS} /></div>
        </div>
        <div className="acad-chart-card">
          <h3>Classes taken (last 6 months)</h3>
          <div className="acad-chart"><Line data={lineData} options={CHART_OPTS} /></div>
        </div>
      </div>

      {/* Join link to share (owner only) */}
      {isOwner && (
        <>
          <div className="acad-joinlink">
            <div>
              <div className="acad-joinlink-label">Share this link — coaches use it to join your academy</div>
              <div className="acad-joinlink-url">{`${window.location.origin}/join-academy/${academy.academyCode}`}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/join-academy/${academy.academyCode}`)
                  .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
              }}
            >{linkCopied ? '✓ Copied' : 'Copy link'}</button>
          </div>

          {/* Pending join requests to approve */}
          {requests.length > 0 && (
            <div className="acad-req">
              <h3>🔔 {requests.length} coach{requests.length === 1 ? '' : 'es'} requesting to join</h3>
              {requests.map(r => (
                <div key={r.id} className="acad-req-row">
                  <span>{r.name}{r.username ? ` · @${r.username}` : ''}{r.country ? ` · ${r.country}` : ''}</span>
                  <div className="acad-req-btns">
                    <button className="acad-req-approve" onClick={() => approveRequest(r.id, r.name)}>Approve</button>
                    <button className="acad-req-decline" onClick={() => declineRequest(r.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Billing panel (owner only) */}
      {isOwner && showBilling && (
        <div className="acad-billing">
          <h3>💳 Coach plans — academy pays</h3>
          <p className="acad-invite-hint">
            Assign each coach a plan; your academy pays for them all in one go. The more coaches
            you pay for, the bigger the bulk discount.
          </p>
          <div className="acad-billing-controls">
            <label>Pay in
              <select value={currency} onChange={e => { setCurrency(e.target.value); loadQuote(e.target.value, months); }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Duration
              <select value={months} onChange={e => { const m = Number(e.target.value); setMonths(m); loadQuote(currency, m); }}>
                {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>)}
              </select>
            </label>
          </div>

          {/* Per-coach plan assignment */}
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead><tr><th>Coach</th><th>Current</th><th>Assign plan</th><th>Price</th></tr></thead>
              <tbody>
                {coaches.map(c => {
                  const line = quote?.lines?.find(l => String(l.coachId) === String(c.coachId));
                  return (
                    <tr key={c.coachId}>
                      <td>{c.name} {c.sponsored && <span className="acad-role acad-role-coach">sponsored</span>}</td>
                      <td>{c.plan}</td>
                      <td>
                        <select value={c.sponsoredPlan || ''} onChange={e => assignPlan(c.coachId, e.target.value)}>
                          {ASSIGNABLE.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </td>
                      <td>{line ? fmtMoney(line.price, currency) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quote summary */}
          {quote && (
            <div className="acad-quote">
              <div className="acad-quote-row"><span>{quote.payingCount} coach plan{quote.payingCount === 1 ? '' : 's'}</span><span>{fmtMoney(quote.subtotal, currency)}</span></div>
              {quote.discount > 0 && (
                <div className="acad-quote-row acad-quote-disc">
                  <span>Bulk discount ({Math.round(quote.discountPct * 100)}%)</span>
                  <span>− {fmtMoney(quote.discount, currency)}</span>
                </div>
              )}
              <div className="acad-quote-row acad-quote-total"><span>Total</span><span>{fmtMoney(quote.total, currency)}</span></div>
              <button
                className="btn-primary acad-pay"
                disabled={paying || quote.payingCount === 0 || quote.total <= 0}
                onClick={payAcademy}
              >
                {paying ? 'Processing…' : `Pay ${fmtMoney(quote.total, currency)} for ${quote.payingCount} coach${quote.payingCount === 1 ? '' : 'es'}`}
              </button>
              <p className="acad-invite-hint">
                Discount tiers: 3–5 coaches 10% · 6–10 coaches 15% · 11+ coaches 20%.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Per-coach progress */}
      <div className="acad-coaches">
        <h3>Coaches — progress</h3>
        {coaches.length === 0 ? (
          <p className="acad-empty-inline">No coaches yet. Invite your first coach above.</p>
        ) : (
          <div className="acad-table-wrap">
            <table className="acad-table">
              <thead>
                <tr>
                  <th>Coach</th><th>Role</th><th>Plan</th>
                  <th>Students</th><th>Joined this month</th><th>Classes</th>
                  {isOwner && <th></th>}
                </tr>
              </thead>
              <tbody>
                {coaches.map(c => (
                  <React.Fragment key={c.coachId}>
                    <tr>
                      <td>
                        <button className="acad-coach-name" onClick={() => toggleRoster(c.coachId)}>
                          {openCoach === c.coachId ? '▾' : '▸'} {c.name}
                        </button>
                      </td>
                      <td><span className={`acad-role acad-role-${c.role}`}>{c.role}</span></td>
                      <td>{c.plan}</td>
                      <td><strong>{c.students}</strong></td>
                      <td>{c.joinedThisMonth}</td>
                      <td>{c.classesTotal}</td>
                      {isOwner && (
                        <td>
                          {c.role !== 'head' && (
                            <button className="acad-remove" onClick={() => removeCoach(c.coachId, c.name)}>Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                    {openCoach === c.coachId && (
                      <tr>
                        <td colSpan={isOwner ? 7 : 6} className="acad-roster-cell">
                          {rosterLoading ? (
                            <span className="acad-muted">Loading students…</span>
                          ) : !roster?.length ? (
                            <span className="acad-muted">No students yet.</span>
                          ) : (
                            <div className="acad-roster">
                              <div className="acad-roster-title">{c.name}'s students ({roster.length})</div>
                              {roster.map(s => (
                                <div key={s.id} className="acad-roster-row">
                                  <span>{s.name}{s.username ? ` · @${s.username}` : ''}{s.country ? ` · ${s.country}` : ''}</span>
                                  <span className="acad-muted">joined {new Date(s.joinedAt).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
