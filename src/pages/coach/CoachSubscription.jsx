import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const [plansById, setPlansById] = useState({});      // id → plan (for family rendering)
  const [families, setFamilies] = useState([]);        // [{ key, title, order }]
  const [activeFamily, setActiveFamily] = useState('noLive'); // which tab is showing
  const [currencies, setCurrencies] = useState([]);   // [{ code, symbol, label }]
  const [currency, setCurrency] = useState('INR');     // coach-selected checkout currency
  const [durations, setDurations] = useState([1, 3, 6, 12]); // offered month options
  const [months, setMonths] = useState(1);             // coach-selected duration (default 1)
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null); // plan id while activating
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState(null);          // { homeCurrency, balances[], maxDiscountPct }
  const [referrals, setReferrals] = useState(null);    // { myCoachCode, total, pending, granted, earnedByCurrency, referrals[] }
  const [applyCredit, setApplyCredit] = useState(true); // use wallet credit at checkout
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, st, h, w] = await Promise.all([
        api.get('/api/coach/plans'),
        api.get('/api/coach/status'),
        api.get('/api/coach-subscription/history').catch(() => ({ data: { payments: [] } })),
        api.get('/api/coach-subscription/wallet').catch(() => ({ data: null }))
      ]);
      api.get('/api/coach-subscription/referrals')
        .then(r => setReferrals(r.data)).catch(() => setReferrals(null));
      const raw = p.data?.plans || {};
      const byId = Array.isArray(raw) ? Object.fromEntries(raw.map(pl => [pl.id, pl])) : raw;
      setPlansById(byId);
      // Two families ("Without Live Classroom" / "With Live Classroom") for the two tables.
      setFamilies(p.data?.planFamilies || [
        { key: 'noLive', title: 'Without Live Classroom', order: p.data?.planOrderNoLive || ['free', 'pro', 'coach'] },
        { key: 'live', title: 'With Live Classroom', order: p.data?.planOrderLive || ['live1', 'live2', 'live3'] },
      ]);
      const curs = p.data?.currencies || [];
      setCurrencies(curs);
      // Default the dropdown to the server's default (INR) the first time.
      setCurrency(prev => (curs.some(c => c.code === prev) ? prev : (p.data?.defaultCurrency || 'INR')));
      const durs = p.data?.durations || [1, 3, 6, 12];
      setDurations(durs);
      setMonths(prev => (durs.includes(prev) ? prev : (p.data?.defaultMonths || 3)));
      setStatus(st.data);
      setHistory(h.data?.payments || []);
      setWallet(w.data || null);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const subscribe = async (planId) => {
    if (activating) return; // guard against double-click / concurrent checkout
    setErr(''); setMsg('');
    setActivating(planId);
    try {
      const orderRes = await api.post('/api/coach-subscription/order', { plan: planId, currency, months, applyCredit });
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
        description: `${planId} plan · ${months} month${months === 1 ? '' : 's'}`,
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
            });
            setMsg(`✅ Payment successful. Welcome to ${planId.toUpperCase()}!`);
            await loadAll();
          } catch (e) {
            setErr(e.response?.data?.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            // Coach closed checkout without paying — refund the reserved credit
            // so it isn't stuck on an unfinished order.
            if (data.creditApplied > 0 && data.paymentRecordId) {
              api.post('/api/coach-subscription/release', { paymentRecordId: data.paymentRecordId })
                .then(() => loadAll()).catch(() => {});
            }
            setActivating(null);
          }
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

  // Voluntary downgrade to a lower plan (incl. Free). Server blocks it if the
  // coach's current roster won't fit the target cap.
  const downgrade = async (planId, planName, targetCap) => {
    if (activating) return;
    if (!window.confirm(`Switch to the ${planName} plan (up to ${targetCap} students)? You'll keep your students, but can't add past ${targetCap}.`)) return;
    setErr(''); setMsg('');
    setActivating(planId);
    try {
      const res = await api.post('/api/coach-subscription/downgrade', { plan: planId });
      setMsg(`✅ ${res.data?.message || `Switched to ${planName}.`}`);
      await loadAll();
    } catch (e) {
      // 409 with blocked=true → too many students for the target cap.
      setErr(e.response?.data?.message || 'Could not downgrade.');
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

  // Symbol for the selected currency (falls back to the code itself).
  const curMeta = currencies.find(c => c.code === currency);
  const curSymbol = curMeta?.symbol || currency + ' ';
  const fmt = (minor) => (minor / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  // Monthly price (minor units) for a plan in the selected currency. Uses the
  // per-currency table when present, else the INR base price.
  const monthlyMinor = (p) => (
    (p.monthlyPrices && p.monthlyPrices[currency] != null) ? p.monthlyPrices[currency] : p.monthlyPrice
  );
  // Total charge for the selected duration, formatted.
  const totalFor = (p) => fmt(monthlyMinor(p) * months);
  const perMonthFor = (p) => fmt(monthlyMinor(p));

  // Referral-wallet credit available in the currently selected currency.
  const walletBalanceMinor = (() => {
    const b = wallet?.balances?.find(x => x.currency === currency);
    return b ? b.amount : 0;
  })();
  const maxDiscountPct = wallet?.maxDiscountPct ?? 0.5;
  // Estimated discount for a plan at the current duration (capped), for preview.
  const previewDiscount = (p) => {
    if (!applyCredit || walletBalanceMinor <= 0) return 0;
    const gross = monthlyMinor(p) * months;
    return Math.min(walletBalanceMinor, Math.floor(gross * maxDiscountPct));
  };

  // Per-tier presentation: a ribbon badge + a one-line tagline of the offer.
  const TIER = {
    free:  { tagline: 'Start free, forever', badge: '' },
    pro:   { tagline: 'More students, same tools', badge: 'Best value' },
    coach: { tagline: 'All-in-one · everything unlocked', badge: '' },
    live1: { tagline: 'Live teaching starts here', badge: '' },
    live2: { tagline: 'Unlimited live · elite perks', badge: '⭐ Most popular' },
    live3: { tagline: 'Everything, unlimited', badge: '💎 Elite Coach' },
  };

  // Human "live class" summary for a plan's liveClass config (server sends
  // meetingsPerDay === -1 for Unlimited).
  const liveSummary = (p) => {
    const lc = p.liveClass || {};
    const per = lc.meetingsPerDay === -1 ? 'Unlimited' : `${lc.meetingsPerDay}/day`;
    return `${per} · ${lc.durationMin} min · up to ${lc.maxStudents} students`;
  };

  if (loading) return <div className="coach-loading">Loading plans…</div>;

  const currentPlan = status?.coachSubscription?.plan;
  const access = status?.access || {};
  // 'trial' is the legacy id for what is now the free-forever plan.
  const isOnFreePlan = currentPlan === 'free' || currentPlan === 'trial';
  const periodEnd = status?.coachSubscription?.currentPeriodEnd;
  const periodEndDate = periodEnd ? new Date(periodEnd).toLocaleDateString() : '';
  const isElite = status?.isElite;
  // Admins get unlimited free coach access. Elite is handled separately (6-month
  // free window with manual renewal), so it is NOT treated as unlimited here.
  const isAdmin = access.reason === 'privileged' && !isElite;
  const isEliteFree = isElite || access.reason === 'elite_free' || currentPlan === 'elite_free';

  // Is plan `p` a downgrade from the coach's CURRENT active plan? Mirrors the
  // server's isDowngrade: smaller student cap, or same cap but cheaper. Only
  // meaningful when the coach is on an active PAID plan (not free/downgraded).
  const currentPlanObj = plansById[currentPlan];
  const onActivePaid = currentPlanObj && !isOnFreePlan && !access.downgraded && !isEliteFree && !isAdmin;
  const isDowngradeCard = (p) => {
    if (!onActivePaid || !currentPlanObj || p.id === currentPlan) return false;
    const curCap = currentPlanObj.maxStudents ?? 0;
    const curPrice = currentPlanObj.monthlyPrice ?? 0;
    const tgtCap = p.maxStudents ?? 0;
    const tgtPrice = p.monthlyPrice ?? 0;
    return tgtCap < curCap || (tgtCap === curCap && tgtPrice < curPrice);
  };
  // Roster size hint for the UI warning. The server does the AUTHORITATIVE count
  // at downgrade time; this is only to pre-warn the coach.
  const activeStudents = status?.coachProfile?.studentsCount ?? null;

  // Academy-sponsored coach — their plan is paid for by their academy. Hide the
  // buy UI; show a "provided by your academy" panel instead.
  const sponsoredByAcademy = !!status?.coachSubscription?.sponsoredByAcademy;
  if (sponsoredByAcademy) {
    const planName = plansById[currentPlan]?.name || String(currentPlan || '').toUpperCase();
    return (
      <div className="coach-dash">
        <div className="coach-dash-header">
          <div>
            <h1>💎 Coach Subscription</h1>
            <p className="coach-dash-sub">Your plan is provided by your academy.</p>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
        </div>
        <div className="cs-current" style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(16,185,129,0.08))', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 12, padding: '24px 28px' }}>
          <div>
            <div className="cs-current-label" style={{ color: '#67e8f9' }}>🏛️ Academy-sponsored</div>
            <div className="cs-current-name" style={{ color: '#a5f3fc', fontSize: 22 }}>{planName} plan — provided by your academy</div>
            <div className="cs-current-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Your academy pays for your subscription. You don't need to buy a plan yourself.
              If anything looks off, ask your academy head.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admins — unlimited free, hide purchase UI.
  if (isAdmin) {
    return (
      <div className="coach-dash">
        <div className="coach-dash-header">
          <div>
            <h1>💎 Coach Subscription</h1>
            <p className="coach-dash-sub">Your role includes everything.</p>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
        </div>
        <div className="cs-current" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: '24px 28px' }}>
          <div>
            <div className="cs-current-label" style={{ color: '#fbbf24' }}>✨ Admin</div>
            <div className="cs-current-name" style={{ color: '#fde68a', fontSize: 22 }}>Coach access included — free</div>
            <div className="cs-current-meta" style={{ marginTop: 6 }}>
              Your admin role includes full coach access (up to 100 students) at no extra cost.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Elite members — coach access is included free with their membership.
  if (isEliteFree) {
    return (
      <div className="coach-dash">
        <div className="coach-dash-header">
          <div>
            <h1>💎 Coach Subscription</h1>
            <p className="coach-dash-sub">Elite Coach access — included free.</p>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
        </div>
        <div className="cs-current" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: '24px 28px' }}>
          <div>
            <div className="cs-current-label" style={{ color: '#fbbf24' }}>💎 Elite Member</div>
            <div className="cs-current-name" style={{ color: '#fde68a', fontSize: 22 }}>
              Coach access included — free
            </div>
            <div className="cs-current-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Coach access is included free with your Elite membership — up to 100 students, no expiry.
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
          <h1>💎 Coach Plans</h1>
          <p className="coach-dash-sub">Free forever, or upgrade for more students and tools. Cancel anytime.</p>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/coach/dashboard')}>← Back to dashboard</button>
      </div>

      {msg && <div className="cs-ok">{msg}</div>}
      {err && <div className="cs-err">{err}</div>}

      {currentPlan && (
        <div className="cs-current">
          <div>
            <div className="cs-current-label">Current plan</div>
            <div className="cs-current-name">{isOnFreePlan ? 'FREE' : currentPlan.toUpperCase()}</div>
            <div className="cs-current-meta">
              {access.downgraded ? (
                <>Your Coach plan ended{periodEndDate ? ` on ${periodEndDate}` : ''} — you're on the Free plan now
                  (up to {access.maxStudents} students). Your existing students are unaffected.</>
              ) : isOnFreePlan ? (
                <>Free forever · up to {access.maxStudents} students · no card required</>
              ) : (
                <>Status: {status?.coachSubscription?.status} · {access.daysRemaining} day{access.daysRemaining === 1 ? '' : 's'} remaining</>
              )}
            </div>
          </div>
          {status?.coachSubscription?.status === 'active' && !isOnFreePlan && !access.downgraded && (
            <button className="btn-danger" onClick={cancelPlan}>Cancel subscription</button>
          )}
        </div>
      )}

      {currencies.length > 1 && (
        <div className="cs-currency-row">
          <label htmlFor="cs-currency">Pay in</label>
          <select
            id="cs-currency"
            className="cs-currency-select"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            {currencies.map(c => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
          <span className="cs-currency-hint">Choose the currency you'd like to be charged in.</span>
        </div>
      )}

      {walletBalanceMinor > 0 && (
        <div className="cs-credit-row">
          <label className="cs-credit-toggle">
            <input
              type="checkbox"
              checked={applyCredit}
              onChange={e => setApplyCredit(e.target.checked)}
            />
            <span>
              Apply referral credit — you have{' '}
              <strong>{curSymbol}{fmt(walletBalanceMinor)}</strong> in {currency}
            </span>
          </label>
          <span className="cs-currency-hint">
            Credit covers up to {Math.round(maxDiscountPct * 100)}% of a purchase.
          </span>
        </div>
      )}
      {wallet?.balances?.length > 0 && walletBalanceMinor === 0 && (
        <div className="cs-currency-hint" style={{ marginBottom: 8 }}>
          You have referral credit in {wallet.balances.filter(b => b.amount > 0).map(b => `${b.currency} ${fmt(b.amount)}`).join(', ')}.
          Switch "Pay in" to that currency to use it.
        </div>
      )}

      <div className="cs-duration-row">
        <label>Subscribe for</label>
        <div className="cs-duration-pills">
          {durations.map(m => (
            <button
              key={m}
              type="button"
              className={`cs-duration-pill ${months === m ? 'is-active' : ''}`}
              onClick={() => setMonths(m)}
            >
              {m} month{m === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Two tabs: "Without Live Classroom" / "With Live Classroom" — 3 cards each. */}
      {families.length > 1 && (
        <div className="cs-tabs" role="tablist">
          {families.map(fam => (
            <button
              key={fam.key}
              role="tab"
              aria-selected={activeFamily === fam.key}
              className={`cs-tab ${activeFamily === fam.key ? 'is-active' : ''}`}
              onClick={() => setActiveFamily(fam.key)}
            >
              {fam.key === 'live' ? '🎥 ' : ''}{fam.title}
            </button>
          ))}
        </div>
      )}

      {families.filter(fam => families.length <= 1 || fam.key === activeFamily).map(fam => {
        const famPlans = (fam.order || [])
          .map(id => plansById[id])
          .filter(p => p && (p.id === 'free' || p.monthlyPrices));
        if (famPlans.length === 0) return null;
        return (
          <div key={fam.key} className="cs-family">
            <div className="cs-plans">
              {famPlans.map(p => {
                const isFreeCard = p.id === 'free';
                const isCurrent = isFreeCard
                  ? (isOnFreePlan || access.downgraded)
                  : (p.id === currentPlan && !access.downgraded);
                const tier = TIER[p.id] || {};
                const highlight = p.id === 'coach' || p.id === 'live2';
                return (
                  <div key={p.id} className={`cs-plan ${isCurrent ? 'is-current' : ''} ${highlight ? 'is-featured' : ''}`}>
                    {tier.badge && <div className="cs-plan-badge">{tier.badge}</div>}
                    <div className="cs-plan-name">{p.name}</div>
                    {tier.tagline && <div className="cs-plan-tagline">{tier.tagline}</div>}
                    {isFreeCard ? (
                      <div className="cs-plan-price">
                        <span className="amount">{curSymbol}0</span>
                        <span className="cycle">forever</span>
                      </div>
                    ) : (
                      <>
                        <div className="cs-plan-price">
                          <span className="currency">{curSymbol}</span>
                          <span className="amount">{totalFor(p)}</span>
                          <span className="cycle">for {months} month{months === 1 ? '' : 's'}</span>
                        </div>
                        {months > 1 && (
                          <div className="cs-plan-permonth">{curSymbol}{perMonthFor(p)} / month</div>
                        )}
                      </>
                    )}
                    <div className="cs-plan-students"><strong>{p.maxStudents.toLocaleString()}</strong> students</div>
                    {p.liveClass && (
                      <div className="cs-plan-live">🎥 {liveSummary(p)}</div>
                    )}
                    <ul className="cs-plan-features">
                      {(p.features || []).map(f => <li key={f}>✓ {f}</li>)}
                    </ul>
                    {(() => {
                      const canDowngrade = isDowngradeCard(p);
                      const tooMany = canDowngrade && activeStudents != null && activeStudents > (p.maxStudents ?? 0);
                      if (isFreeCard) {
                        // Free card: current plan, or a downgrade target for a paid coach.
                        if (isCurrent) return <button className="btn-ghost" disabled>Current plan</button>;
                        if (onActivePaid) {
                          return (
                            <>
                              <button
                                className="btn-ghost"
                                disabled={activating === p.id || tooMany}
                                onClick={() => downgrade(p.id, p.name, p.maxStudents)}
                              >
                                {activating === p.id ? 'Switching…' : `Downgrade to Free`}
                              </button>
                              {tooMany && (
                                <div className="cs-downgrade-warn">
                                  You have {activeStudents} students — remove {activeStudents - p.maxStudents} to fit {p.maxStudents}.
                                </div>
                              )}
                            </>
                          );
                        }
                        return <button className="btn-ghost" disabled>Included free</button>;
                      }
                      if (isCurrent) return <button className="btn-ghost" disabled>Current plan</button>;
                      if (canDowngrade) {
                        return (
                          <>
                            <button
                              className="btn-ghost"
                              disabled={activating === p.id || tooMany}
                              onClick={() => downgrade(p.id, p.name, p.maxStudents)}
                            >
                              {activating === p.id ? 'Switching…' : 'Downgrade'}
                            </button>
                            {tooMany && (
                              <div className="cs-downgrade-warn">
                                You have {activeStudents} students — remove {activeStudents - p.maxStudents} to fit {p.maxStudents}.
                              </div>
                            )}
                          </>
                        );
                      }
                      return (
                        <button
                          className="btn-primary"
                          disabled={activating === p.id}
                          onClick={() => subscribe(p.id)}
                        >
                          {activating === p.id ? 'Starting…' : access.downgraded ? 'Renew plan' : 'Upgrade'}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {referrals?.myCoachCode && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>Refer coaches & earn credit</h2></div>
          <div className="cs-refer">
            <p className="cs-refer-lead">
              Invite another coach with your code. When they make their first paid
              subscription, you earn <strong>{Math.round((referrals.rewardPct ?? 0.2) * 100)}%</strong> of
              what they pay as wallet credit — spendable on your own plan.
            </p>

            <div className="cs-refer-code-row">
              <div className="cs-refer-code">
                <span className="cs-refer-code-label">Your code</span>
                <strong>{referrals.myCoachCode}</strong>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const link = `${window.location.origin}/coach/onboarding?ref=${referrals.myCoachCode}`;
                  navigator.clipboard?.writeText(link).then(() => {
                    setCopied(true); setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? '✓ Link copied' : 'Copy invite link'}
              </button>
            </div>

            <div className="cs-refer-stats">
              <div className="cs-refer-stat"><strong>{referrals.total}</strong><span>Referred</span></div>
              <div className="cs-refer-stat"><strong>{referrals.granted}</strong><span>Subscribed</span></div>
              <div className="cs-refer-stat"><strong>{referrals.pending}</strong><span>Pending</span></div>
              <div className="cs-refer-stat">
                <strong>
                  {Object.keys(referrals.earnedByCurrency || {}).length
                    ? Object.entries(referrals.earnedByCurrency).map(([c, a]) => `${c} ${fmt(a)}`).join(' · ')
                    : '—'}
                </strong>
                <span>Earned</span>
              </div>
            </div>

            {referrals.referrals?.length > 0 && (
              <div className="cs-refer-list">
                {referrals.referrals.map(r => (
                  <div key={r.id} className="cs-refer-list-row">
                    <span>{r.coach?.name || 'A coach'}{r.coach?.academy ? ` · ${r.coach.academy}` : ''}</span>
                    <span className={`pill pill-${r.status === 'granted' ? 'completed' : 'pending'}`}>
                      {r.status === 'granted'
                        ? `+${r.rewardCurrency} ${fmt(r.rewardAmount)}`
                        : 'Awaiting first payment'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="coach-section">
          <div className="coach-section-head"><h2>Payment history</h2></div>
          <div className="cs-history">
            <div className="cs-history-row cs-history-head">
              <span>Date</span><span>Plan</span><span>Duration</span><span>Amount</span><span>Status</span>
            </div>
            {history.map(h => (
              <div key={h._id} className="cs-history-row">
                <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                <span>{h.planId}</span>
                <span>{h.months ? `${h.months} mo` : h.billingCycle}</span>
                <span>{h.currency} {(h.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
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
