import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CoachOnboarding.css';
import './CoachSubscription.css';

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CoachSubscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const expired = new URLSearchParams(location.search).get('expired') === '1';

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const cycle = 'monthly'; // single plan is monthly-only
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null); // plan id while activating
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, st, h] = await Promise.all([
        api.get('/api/coach/plans'),
        api.get('/api/coach/status'),
        api.get('/api/coach-subscription/history').catch(() => ({ data: { payments: [] } }))
      ]);
      const raw = p.data?.plans || {};
      const arr = Array.isArray(raw) ? raw : Object.values(raw);
      setPlans(arr);
      setStatus(st.data);
      setHistory(h.data?.payments || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const subscribe = async (planId) => {
    setErr(''); setMsg('');
    setActivating(planId);
    try {
      const orderRes = await api.post('/api/coach-subscription/order', { plan: planId, billingCycle: cycle });
      const data = orderRes.data;

      // Dev fallback: backend returns { devMode: true } when keys aren't configured
      if (data.devMode) {
        await api.post('/api/coach-subscription/dev-activate', { paymentRecordId: data.paymentRecordId });
        setMsg(`✅ ${planId.toUpperCase()} activated (dev mode).`);
        await loadAll();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load payment SDK. Check your connection.');

      const opts = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        order_id: data.orderId,
        name: 'Chess Coach',
        description: `${planId} plan · ${cycle}`,
        prefill: {
          name: status?.coachProfile?.coachName || '',
          email: status?.email || ''
        },
        theme: { color: '#06b6d4' },
        handler: async (response) => {
          try {
            await api.post('/api/coach-subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
              billingCycle: cycle
            });
            setMsg(`✅ Payment successful. Welcome to ${planId.toUpperCase()}!`);
            await loadAll();
          } catch (e) {
            setErr(e.response?.data?.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => setActivating(null)
        }
      };

      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not start payment.');
    } finally {
      setActivating(null);
    }
  };

  const cancelPlan = async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of the current period.')) return;
    try {
      await api.post('/api/coach-subscription/cancel');
      setMsg('Subscription cancelled. Access continues until period end.');
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not cancel.');
    }
  };

  if (loading) return <div className="coach-loading">Loading plans…</div>;

  const currentPlan = status?.coachSubscription?.plan;
  const access = status?.access || {};
  const isElite = status?.isElite;
  // Elite AND admin get coach access free for as long as they hold the role.
  const isPrivileged = access.reason === 'privileged' || isElite;

  // Privileged users get coaching free — show a thank-you banner, hide purchase UI
  if (isPrivileged) {
    return (
      <div className="coach-dash">
        <div className="coach-dash-header">
          <div>
            <h1>💎 Coach Subscription</h1>
            <p className="coach-dash-sub">Your membership includes everything.</p>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
        </div>
        <div className="cs-current" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: '24px 28px' }}>
          <div>
            <div className="cs-current-label" style={{ color: '#fbbf24' }}>✨ {isElite ? 'Elite Member' : 'Admin'}</div>
            <div className="cs-current-name" style={{ color: '#fde68a', fontSize: 22 }}>Coach access included — free</div>
            <div className="cs-current-meta" style={{ marginTop: 6 }}>
              Your {isElite ? 'Elite membership' : 'admin role'} includes full coach access (up to 100 students) at no extra cost. No subscription needed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>💎 Coach Subscription</h1>
          <p className="coach-dash-sub">Pick the plan that fits your coaching practice.</p>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
      </div>

      {expired && (
        <div className="cs-warn">
          ⚠️ Your free trial has ended. Pick a plan below to continue coaching.
        </div>
      )}
      {msg && <div className="cs-ok">{msg}</div>}
      {err && <div className="cs-err">{err}</div>}

      {currentPlan && (
        <div className="cs-current">
          <div>
            <div className="cs-current-label">Current plan</div>
            <div className="cs-current-name">{currentPlan.toUpperCase()}</div>
            <div className="cs-current-meta">
              Status: {status?.coachSubscription?.status} ·
              {access.active
                ? ` ${access.daysRemaining} day${access.daysRemaining === 1 ? '' : 's'} remaining`
                : ' expired'}
            </div>
          </div>
          {status?.coachSubscription?.status === 'active' && currentPlan !== 'trial' && (
            <button className="btn-danger" onClick={cancelPlan}>Cancel subscription</button>
          )}
        </div>
      )}

      <div className="cs-plans">
        {plans.filter(p => p.id !== 'trial').map(p => {
          const isCurrent = p.id === currentPlan;
          const inr = (p.monthlyPrice / 100).toLocaleString('en-IN');

          return (
            <div key={p.id} className={`cs-plan ${isCurrent ? 'is-current' : ''}`}>
              <div className="cs-plan-name">{p.name}</div>
              <div className="cs-plan-price">
                <span className="currency">₹</span>
                <span className="amount">{inr}</span>
                <span className="cycle">per month</span>
              </div>
              <div className="cs-plan-students">Up to {p.maxStudents.toLocaleString()} students</div>
              <ul className="cs-plan-features">
                {(p.features || []).map(f => <li key={f}>✓ {f}</li>)}
              </ul>
              <button
                className={isCurrent ? 'btn-ghost' : 'btn-primary'}
                disabled={isCurrent || activating === p.id}
                onClick={() => subscribe(p.id)}
              >
                {isCurrent ? 'Current plan' :
                  activating === p.id ? 'Starting…' :
                    currentPlan && currentPlan !== 'trial' ? 'Switch plan' : 'Choose plan'}
              </button>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>Payment history</h2></div>
          <div className="cs-history">
            <div className="cs-history-row cs-history-head">
              <span>Date</span><span>Plan</span><span>Cycle</span><span>Amount</span><span>Status</span>
            </div>
            {history.map(h => (
              <div key={h._id} className="cs-history-row">
                <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                <span>{h.planId}</span>
                <span>{h.billingCycle}</span>
                <span>{h.currency} {(h.amount / 100).toLocaleString('en-IN')}</span>
                <span className={`pill pill-${h.status === 'paid' ? 'completed' : h.status === 'failed' ? 'overdue' : 'pending'}`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
