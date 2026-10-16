// pages/academy/AcademyBilling.jsx — /academy/billing
// The academy buys ONE academy plan (Starter/Growth/Institute, ±live). The plan
// covers all its coaches. Shows plan cards, current plan, and checkout.
import React, { useEffect, useState } from 'react';
import api from '../../api';
import './AcademyDashboard.css';
import { t as tr } from '../../i18n/LanguageContext';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
const curSym = (c) => ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' }[c] || c + ' ');
const fmt = (minor, c) => `${curSym(c)}${((minor || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// Per-coach live-class line. meetingsPerDay === -1 means Unlimited (wire form).
function liveLine(lc) {
  if (!lc) return 'Live classes included';
  const per = lc.meetingsPerDay === -1 ? 'Unlimited live classes' : tr("{meetingsPerDay} live class{v1}/day", { meetingsPerDay: lc.meetingsPerDay, v1: lc.meetingsPerDay === 1 ? '' : 'es' });
  const room = lc.maxStudents === -1 ? 'unlimited students' : tr("up to {maxStudents} students (+ coach)", { maxStudents: lc.maxStudents });
  const len = lc.meetingsPerDay === -1 ? tr("up to {durationMin} min or unlimited", { durationMin: lc.durationMin }) : tr("up to {durationMin} min", { durationMin: lc.durationMin });
  return tr("{per} · {len} · {room} each", { per: per, len: len, room: room });
}

export default function AcademyBilling() {
  const [data, setData] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [months, setMonths] = useState(1);
  const [family, setFamily] = useState('noLive');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async (mo = months) => {
    try {
      const r = await api.get('/api/academy/billing', { params: { months: mo } });
      setData(r.data);
      if (r.data?.currency) setCurrency(r.data.currency); // server-resolved from head's country
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load billing.');
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const buy = async (planId) => {
    setErr(''); setMsg(''); setBusy(planId);
    try {
      const orderRes = await api.post('/api/academy/billing/order', { plan: planId, currency, months });
      const d = orderRes.data;
      if (d.devMode) {
        await api.post('/api/academy/billing/dev-activate', { paymentRecordId: d.paymentRecordId });
        setMsg(tr('✅ Academy plan activated (dev mode). All your coaches are now covered.'));
        await load();
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load the payment SDK.');
      const rzp = new window.Razorpay({
        key: d.keyId, amount: d.amount, currency: d.currency, order_id: d.orderId,
        name: tr('Chess Academy'), description: tr("{academyPlan} · {months} month(s) · {coaches} coaches", { academyPlan: d.academyPlan, months: months, coaches: d.coaches }),
        theme: { color: 'var(--color-accent)' },
        handler: async (r) => {
          try {
            await api.post('/api/academy/billing/verify', {
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
              paymentRecordId: d.paymentRecordId,
            });
            setMsg(tr('✅ Payment successful — your academy plan is active and all coaches are covered.'));
            await load();
          } catch (e) { setErr(e.response?.data?.message || tr('Verification failed.')); }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      rzp.open();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not start checkout.');
    } finally {
      setBusy('');
    }
  };

  if (!data) return <div className="acad-wrap"><div className="acad-empty">{tr("Loading billing…")}</div></div>;

  const fam = (data.families || []).find(f => f.key === family) || data.families?.[0];
  const shown = (fam?.order || []).map(id => ({ id, ...data.plans[id] })).filter(p => p.name);

  return (
    <div className="acad-wrap">
      <h1 style={{ color: 'var(--color-text)', marginBottom: 6 }}>{tr("💳 Academy billing")}</h1>
      <p className="acad-muted" style={{ marginBottom: 18 }}>
        {tr("Your academy buys ONE plan that covers all your coaches. You currently have")}{' '}
        <strong>{data.coachCount}</strong> {tr("coach")}{data.coachCount === 1 ? '' : 'es'}.
        {data.currentPlan && <> {tr("Current plan:")} <strong style={{ color: 'var(--color-accent)' }}>{data.plans[data.currentPlan]?.name || data.currentPlan}</strong>.</>}
      </p>

      {!data.currentPlan && (
        <div className="acad-req" style={{ borderColor: 'var(--color-warning-a30)', background: 'var(--color-warning-a12)' }}>
          <div style={{ fontSize: 14, color: 'var(--color-warning)', fontWeight: 600 }}>
            {tr("🔒 Buy a plan to unlock your academy — add coaches, share your join link, and see your dashboard. Your academy pays for its coaches.")}
          </div>
        </div>
      )}
      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      <div className="acad-billing-controls">
        <span className="acad-muted">{tr("Prices in")} <strong>{currency}</strong> {tr("(based on your country)")}</span>
        <label>{tr("Duration")}
          <select value={months} onChange={e => { const m = Number(e.target.value); setMonths(m); load(m); }}>
            {[1, 3].map(m => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}{m === 3 ? ' (save 10%)' : ''}</option>)}
          </select>
        </label>
        <div className="acad-fam-tabs">
          {(data.families || []).map(f => (
            <button key={f.key} className={family === f.key ? 'is-active' : ''} onClick={() => setFamily(f.key)}>
              {f.key === 'live' ? '🎥 ' : ''}{f.title}
            </button>
          ))}
        </div>
      </div>

      <div className="acad-plan-grid">
        {shown.map(p => {
          const isCurrent = p.id === data.currentPlan;
          const tooManyCoaches = !p.fitsCoachCount;
          // -1 means UNLIMITED. The server sends it because JSON cannot carry
          // Infinity; rendering it raw showed "Covers up to -1 coaches" and a
          // total of "-100 students".
          const unlimitedCoaches = p.maxCoaches === -1;
          return (
            <div key={p.id} className={`acad-plan-card ${isCurrent ? 'is-current' : ''}`}>
              <div className="acad-plan-name">{p.name}</div>
              <div className="acad-plan-price">{fmt(p.price, currency)}<span> / {months}{tr("mo")}</span></div>

              {/* Academy-level: how many coaches this ONE price covers */}
              <div className="acad-plan-coaches">
                {unlimitedCoaches
                  ? <>{tr("Covers")} <strong>{tr("unlimited coaches")}</strong> {tr("· one price")}</>
                  : <>{tr("Covers up to")} <strong>{p.maxCoaches} coaches</strong> {tr("· one price")}</>}
              </div>

              {/* Per-coach entitlements — the differentiator: EVERY coach gets the full thing */}
              <div className="acad-plan-percoach">
                <div className="acad-plan-percoach-head">{tr("✨ Every coach gets:")}</div>
                <ul className="acad-plan-feats">
                  <li>{tr("👥 Up to")} <strong>{p.studentsPerCoach} {tr("students")}</strong> {tr("— each")}</li>
                  <li>🎥 {liveLine(p.liveClass)}</li>
                  {(p.features || []).map(f => <li key={f}>✓ {f}</li>)}
                </ul>
              </div>
              <div className="acad-plan-total">
                {unlimitedCoaches
                  ? <>= unlimited coaches × {p.studentsPerCoach} students = <strong>{tr("no cap")}</strong> {tr("on your academy")}</>
                  : <>= {p.maxCoaches} coaches × {p.studentsPerCoach} students = up to{' '}
                      <strong>{(p.maxCoaches * p.studentsPerCoach).toLocaleString()} {tr("students")}</strong> {tr("across your academy")}</>}
              </div>

              {isCurrent ? (
                <button className="btn-ghost" disabled>{tr("Current plan")}</button>
              ) : (
                <button
                  className="btn-primary"
                  disabled={busy === p.id || tooManyCoaches}
                  onClick={() => buy(p.id)}
                >
                  {busy === p.id ? 'Processing…' : tooManyCoaches ? tr("Max {maxCoaches} coaches", { maxCoaches: p.maxCoaches }) : tr("Buy {name}", { name: p.name })}
                  {/* tooManyCoaches can never be true on the unlimited plan, so
                      the -1 label above is unreachable there. */}
                </button>
              )}
              {tooManyCoaches && <div className="acad-plan-warn">You have {data.coachCount} coaches — this plan allows {p.maxCoaches}.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
