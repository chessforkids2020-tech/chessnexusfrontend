// BuyMeACoffee.jsx — donation page modelled after lichess/Patreon style support
// pages but framed as a friendly "buy us a coffee" gesture. Supports INR
// (Razorpay / UPI / Indian bank) and USD (PayPal / international cards via
// Razorpay International). After payment the user confirms with us and a
// 30-day ☕ supporter badge appears next to their displayName everywhere.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useSupporterRefresh } from '../context/SupporterContext';

const C = {
  base: '#0a0a0a',
  panel: 'rgba(23,23,23,0.7)',
  panelBorder: 'rgba(255,255,255,0.06)',
  text: '#e5e7eb',
  textDim: 'rgba(229,231,235,0.7)',
  textFaint: 'rgba(229,231,235,0.45)',
  cyan: '#06b6d4',
  green: '#10b981',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.45)'
};

// Two choices combine to set the price and how long the badge lasts:
//   1. A coffee (base price tier)         2. A duration (1 / 3 / 6 / 12 months)
// Final price = coffee base price × months. The ☕ badge then lives for that many
// months. A single payment — no auto-renewal.
const COFFEE_TIERS_INR = [
  { id: 'simple',   emoji: '☕', name: 'Simple Coffee',     base: 100, blurb: 'A warm thank-you. Fuels one bug fix.' },
  { id: 'espresso', emoji: '🥃', name: 'American Espresso', base: 250, blurb: 'A jolt of focus. Pays for a feature sprint.' },
  { id: 'latte',    emoji: '🍵', name: 'Cafe Latte',        base: 500, blurb: 'Helps cover a day of server bills.' }
];

const COFFEE_TIERS_USD = [
  { id: 'simple',   emoji: '☕', name: 'Simple Coffee',     base: 3,  blurb: 'A warm thank-you. Fuels one bug fix.' },
  { id: 'espresso', emoji: '🥃', name: 'American Espresso', base: 5,  blurb: 'A jolt of focus. Pays for a feature sprint.' },
  { id: 'latte',    emoji: '🍵', name: 'Cafe Latte',        base: 10, blurb: 'Helps cover a day of server bills.' }
];

// Duration options shown as tabs above the coffees. They multiply the price and
// set the badge length.
const DURATIONS = [
  { months: 1,  label: '1 Month'   },
  { months: 3,  label: '3 Months'  },
  { months: 6,  label: '6 Months'  },
  { months: 12, label: '12 Months' }
];

const DEFAULT_MONTHS = 3;          // 3 months selected by default
const MIN_BASE = { INR: 100, USD: 3 }; // minimum per-coffee base for manual entry

export default function BuyMeACoffee() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const refreshSupporters = useSupporterRefresh();
  const [currency, setCurrency] = useState('INR');
  const [months, setMonths] = useState(DEFAULT_MONTHS); // duration tab; 3 by default
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('espresso'); // espresso default
  const [customBase, setCustomBase] = useState(''); // manual per-coffee amount
  const [info, setInfo] = useState({ payment: {}, supporters: [] });
  const [myStatus, setMyStatus] = useState({ active: false, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmFor, setConfirmFor] = useState(null); // provider key
  const [providerRef, setProviderRef] = useState('');
  const [thankYou, setThankYou] = useState(false);
  const [step, setStep] = useState('pick'); // 'pick' | 'confirm'
  // Once the user manually picks a currency, never let the async /info response
  // override it.
  const userToggledCurrency = useRef(false);

  const coffees = currency === 'INR' ? COFFEE_TIERS_INR : COFFEE_TIERS_USD;
  const minBase = MIN_BASE[currency];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [infoRes, meRes] = await Promise.all([
          api.get('/api/coffee/info'),
          user ? api.get('/api/coffee/me').catch(() => ({ data: { active: false, pendingCount: 0 } })) : Promise.resolve({ data: { active: false, pendingCount: 0 } })
        ]);
        if (!mounted) return;
        setInfo(infoRes.data || { payment: {}, supporters: [] });
        setMyStatus(meRes.data || { active: false, pendingCount: 0 });
        // Apply the server's suggested currency (from saved pref or geolocation),
        // unless the user has already toggled it manually.
        const suggested = infoRes.data?.suggestedCurrency;
        if (!userToggledCurrency.current && ['INR', 'USD'].includes(suggested)) {
          setCurrency(prev => (prev === suggested ? prev : suggested));
        }
      } catch (err) {
        // non-fatal — page still renders, payment buttons just lack provider URLs
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // The active coffee — either a preset tier or the manual "Your Amount" card.
  const isCustom = customBase !== '';
  const customNum = Number(customBase);
  const selectedCoffee = useMemo(
    () => coffees.find(c => c.id === selectedCoffeeId) || coffees[1],
    [coffees, selectedCoffeeId]
  );
  const baseAmount = isCustom
    ? (Number.isFinite(customNum) ? customNum : 0)
    : (selectedCoffee?.base || 0);

  const effectiveMonths = months;
  const effectiveAmount = baseAmount * months;            // coffee price × months
  const effectiveTierId = isCustom ? 'custom' : (selectedCoffee?.id || 'espresso');
  const customBelowMin = isCustom && Number.isFinite(customNum) && customNum < minBase;
  const canContinue = baseAmount >= minBase;

  const switchCurrency = (c) => {
    userToggledCurrency.current = true;
    setCurrency(c); // coffee/month selection preserved; prices recompute for the new currency
    setCustomBase('');
  };

  const pickCoffee = (id) => { setSelectedCoffeeId(id); setCustomBase(''); };

  const handleContinue = () => {
    if (!user) { navigate('/login'); return; }
    if (!canContinue) return;
    setThankYou(false);
    setStep('confirm');
  };

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePayNow = async () => {
    if (!user) { navigate('/login'); return; }
    if (effectiveAmount <= 0) return;
    setSubmitting(true);
    try {
      // 1. Create Razorpay order on backend
      const orderRes = await api.post('/api/coffee/create-order', {
        amount: effectiveAmount,
        currency,
        tier: effectiveTierId,
        months: effectiveMonths
      });
      const { orderId, keyId } = orderRes.data;

      // 2. Load Razorpay Checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Could not load payment gateway. Please check your connection and try again.');
        setSubmitting(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const rzp = new window.Razorpay({
        key: keyId,
        amount: Math.round(effectiveAmount * 100),
        currency,
        name: 'ChessNexus',
        description: `${isCustom ? 'Custom Coffee' : selectedCoffee?.name} — ${effectiveMonths} ${effectiveMonths === 1 ? 'month' : 'months'} supporter badge`,
        order_id: orderId,
        prefill: { name: user?.displayName || '' },
        theme: { color: '#f59e0b' },
        modal: {
          ondismiss: () => setSubmitting(false)
        },
        handler: async (response) => {
          // 4. Verify + record on backend → badge activates instantly
          try {
            await api.post('/api/coffee/record', {
              amount: effectiveAmount,
              currency,
              tier: effectiveTierId,
              months: effectiveMonths,
              provider: 'razorpay',
              providerRef: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature
            });
            setThankYou(true);
            try { await refreshUser(); } catch (_) {}
            try { await refreshSupporters(); } catch (_) {} // update ☕ badge instantly everywhere
            try {
              const meRes = await api.get('/api/coffee/me');
              setMyStatus(meRes.data || { active: true, pendingCount: 0 });
            } catch (_) {}
          } catch (err) {
            alert(
              'Payment received but badge activation had an issue. ' +
              'Contact support with payment ID: ' + response.razorpay_payment_id
            );
          } finally {
            setSubmitting(false);
          }
        }
      });
      rzp.open();
      // submitting stays true until handler fires or modal dismissed
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not initiate payment. Please try again.');
      setSubmitting(false);
    }
  };

  // ─── CONFIRM STEP ────────────────────────────────────────────────────
  if (step === 'confirm') {
    const coffeeObj = isCustom ? null : selectedCoffee;
    const displayAmt = effectiveAmount;
    const symbol = currency === 'INR' ? '₹' : '$';
    const monthsLabel = effectiveMonths === 1 ? '1 month' : `${effectiveMonths} months`;
    return (
      <div style={styles.page}>
        <div style={styles.bgGlow} />
        <div style={styles.container}>
          <button
            type="button"
            onClick={() => { setStep('pick'); setConfirmFor(null); setProviderRef(''); setThankYou(false); }}
            style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Poppins, sans-serif', marginBottom: 24 }}
          >
            ← Back to coffees
          </button>

          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            {!thankYou ? (
              <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 20, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', overflow: 'hidden' }}>

                {/* Amount header */}
                <div style={{ textAlign: 'center', padding: '28px 24px 20px', borderBottom: `1px solid ${C.panelBorder}` }}>
                  <div style={{ fontSize: 54 }}>{coffeeObj?.emoji || '☕'}</div>
                  <div style={{ color: C.textDim, fontSize: 13, marginTop: 6 }}>
                    {coffeeObj?.name || 'Custom Coffee'} · {monthsLabel}
                  </div>
                  <div style={{ fontSize: 46, fontWeight: 800, color: C.amber, margin: '6px 0 2px', fontFamily: 'Poppins, sans-serif', lineHeight: 1 }}>
                    {symbol}{displayAmt}
                  </div>
                  <div style={{ color: C.textFaint, fontSize: 12, marginTop: 2 }}>
                    {symbol}{baseAmount} × {effectiveMonths} {effectiveMonths === 1 ? 'month' : 'months'} · {currency}
                  </div>
                </div>

                {/* Badge preview */}
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.panelBorder}` }}>
                  <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>What you'll get</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{user?.displayName || 'You'}</span>
                    <span style={{ fontSize: 18 }}>☕</span>
                    <span style={{ color: C.amber, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 999 }}>Preview</span>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                    A <strong style={{ color: '#fde68a' }}>☕ supporter badge</strong> appears next to your display name for{' '}
                    <strong style={{ color: C.text }}>{monthsLabel}</strong> — visible on your dashboard, leaderboards, and everywhere on ChessNexus. One-time payment, no auto-renewal.
                  </p>
                </div>

                {/* Pay */}
                <div style={{ padding: '20px 24px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePayNow}
                    style={{ ...styles.primaryBtn, width: '100%', fontSize: 15, padding: '14px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box', opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? 'Opening payment…' : 'Confirm & Pay with Razorpay ☕'}
                  </button>
                  <div style={{ color: C.textFaint, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                    Accepts UPI · Credit card · Debit card
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.thankBox}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>☕✨</div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 18 }}>Thank you for the coffee!</div>
                <div style={{ color: C.textDim, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Your ☕ supporter badge is now live next to your name — visible on your dashboard, leaderboards, and everywhere on ChessNexus. You're literally fuelling the next feature.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{ ...styles.primaryBtn, marginTop: 18, padding: '10px 24px', borderRadius: 12 }}
                >
                  Go to my dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <div style={styles.container}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroBadge}>☕ Support ChessNexus</div>
          <h1 style={styles.heroTitle}>
            Your support keeps  <span style={{ color: C.cyan }}>ChessNexus</span> alive
          </h1>
          <p style={styles.heroLead}>
           People say chess is a lonely game.
ChessNexus says otherwise.

Every coffee helps build real-time arenas, tournaments, puzzles, and the future of multiplayer chess.
          </p>
          {myStatus.active && (
            <div style={styles.thankPill}>☕ You're an active supporter — thank you! Your badge is showing next to your name.</div>
          )}
          {!myStatus.active && myStatus.pendingCount > 0 && (
            <div style={styles.pendingPill}>We've got your message — your badge will appear shortly.</div>
          )}
        </div>

        {/* Elite membership — our little gratitude to supporters */}
        <div style={styles.eliteCard}>
          <div style={styles.eliteHeader}>
            <span style={styles.eliteBadge}>✨ ELITE MEMBERSHIP</span>
            <span style={styles.eliteSubtle}>Our little gratitude towards our supporters 💛</span>
          </div>
          <p style={styles.eliteIntro}>
            Support ChessNexus for <strong style={{ color: '#fde68a' }}>6 months or more</strong> and unlock{' '}
            <strong style={{ color: C.text }}>Elite Membership</strong> — creator tools and perks reserved for the
            people who keep ChessNexus alive.
          </p>
          <div style={styles.eliteGrid}>
            <Eliter icon="🎯" text="Create your own Monthly Focus challenges" />
            <Eliter icon="🏁" text="Host and run your own Team Races" />
            <Eliter icon="🏟️" text="Launch 3D Arena Tournaments" />
            <Eliter icon="🧑‍🏫" text="ChessNexus Coach free for 6 months" />
          </div>
        </div>

        {/* Currency switch */}
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>Pick a coffee</h2>
          <div style={styles.currencyToggle}>
            {['INR', 'USD'].map(c => (
              <button
                key={c}
                onClick={() => switchCurrency(c)}
                style={{
                  ...styles.currencyBtn,
                  ...(currency === c ? styles.currencyBtnActive : null)
                }}
              >
                {c === 'INR' ? '₹ INR' : '$ USD'}
              </button>
            ))}
          </div>
        </div>

        {/* Duration selector — sets badge length and multiplies the price */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: C.textDim, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            How long should your ☕ badge last?
          </div>
          <div style={styles.durationTabs}>
            {DURATIONS.map(d => {
              const active = months === d.months;
              return (
                <button
                  key={d.months}
                  type="button"
                  onClick={() => setMonths(d.months)}
                  style={{
                    ...styles.durationTab,
                    ...(active ? styles.durationTabActive : null)
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div style={{ color: C.textFaint, fontSize: 12, marginTop: 8 }}>
            One-time payment, no auto-renewal. Your coffee price × {effectiveMonths}{' '}
            {effectiveMonths === 1 ? 'month' : 'months'}.
          </div>
        </div>

        {/* Coffee tiers — price shown is base × selected months */}
        <div style={styles.tierGrid}>
          {coffees.map(coffee => {
            const active = !isCustom && selectedCoffeeId === coffee.id;
            const price = coffee.base * months;
            return (
              <button
                key={coffee.id}
                type="button"
                onClick={() => pickCoffee(coffee.id)}
                style={{
                  ...styles.tierCard,
                  ...(active ? styles.tierCardActive : null)
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 6 }}>{coffee.emoji}</div>
                <div style={styles.tierName}>{coffee.name}</div>
                <div style={styles.tierAmount}>
                  {currency === 'INR' ? `₹${price}` : `$${price}`}
                </div>
                <div style={styles.tierBlurb}>{coffee.blurb}</div>
              </button>
            );
          })}

          {/* Manual amount card */}
          <div style={{
            ...styles.tierCard,
            ...(isCustom ? styles.tierCardActive : null),
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'default'
          }}>
            <div style={{ fontSize: 36 }}>✏️</div>
            <div style={styles.tierName}>Your Amount</div>
            <div style={styles.customInputWrap}>
              <span style={styles.currencyPrefix}>{currency === 'INR' ? '₹' : '$'}</span>
              <input
                type="number"
                min={minBase}
                placeholder={`e.g. ${currency === 'INR' ? '300' : '8'}`}
                value={customBase}
                onChange={(e) => { setCustomBase(e.target.value); }}
                style={styles.customInput}
              />
              <span style={{ color: C.textFaint, fontSize: 12, marginLeft: 6 }}>/ mo</span>
            </div>
            {isCustom && !customBelowMin && (
              <div style={{ color: C.amber, fontSize: 13, fontWeight: 700 }}>
                {currency === 'INR' ? '₹' : '$'}{baseAmount * months} total
              </div>
            )}
            {customBelowMin ? (
              <div style={{ color: '#f87171', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                Minimum is {currency === 'INR' ? '₹' : '$'}{minBase}/mo.
              </div>
            ) : (
              <div style={{ ...styles.tierBlurb, textAlign: 'center' }}>
                Any amount — min {currency === 'INR' ? '₹' : '$'}{minBase}/mo.
              </div>
            )}
          </div>
        </div>

        {/* Continue */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            style={{ ...styles.primaryBtn, padding: '13px 32px', fontSize: 15, borderRadius: 14, opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'not-allowed' }}
          >
            Continue · {currency === 'INR' ? '₹' : '$'}{effectiveAmount} for {effectiveMonths}{' '}
            {effectiveMonths === 1 ? 'month' : 'months'} →
          </button>
        </div>

        {/* Where the money goes */}
        <div style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ color: '#fde68a', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>☕ WHERE YOUR COFFEE GOES</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <div style={styles.whyGrid}>
            <WhyCard
              icon="🖥️"
              title="Always-On Servers"
              text="Every cup helps keep ChessNexus.in running 24 × 7. No downtime, no slow nights — just fast, reliable chess for everyone, always."
              accent="rgba(6,182,212,0.18)"
              border="rgba(6,182,212,0.25)"
              step="01"
            />
            <WhyCard
              icon="🗄️"
              title="Your Progress, Remembered"
              text="Your games, ratings, streaks, and puzzle history need a home. Coffee keeps our databases healthy so every move you make is recorded and learned from."
              accent="rgba(16,185,129,0.18)"
              border="rgba(16,185,129,0.25)"
              step="02"
            />
            <WhyCard
              icon="👨‍💻"
              title="Full-Time Developers"
              text="The people who build arenas, 3D rooms, team races, and everything in between work full time for ChessNexus. Your coffee is what keeps them here — building for you."
              accent="rgba(139,92,246,0.18)"
              border="rgba(139,92,246,0.25)"
              step="03"
            />
            <WhyCard
              icon="🧑‍🏫"
              title="ChessNexus Coach"
              text="Advanced game analysis, personalised improvement tips, and coaching tools that help every player — from beginner to tournament-level — keep getting better."
              accent="rgba(245,158,11,0.18)"
              border="rgba(245,158,11,0.25)"
              step="04"
            />
          </div>
        </div>

        {/* Recent supporters */}
        <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Recent supporters</h2>
        {loading ? (
          <div style={{ color: C.textFaint }}>Loading…</div>
        ) : info.supporters.length === 0 ? (
          <div style={{ color: C.textFaint }}>Be the first to buy us a coffee 💛</div>
        ) : (
          <div style={styles.supporterRow}>
            {info.supporters.map((s, i) => (
              <div key={i} style={styles.supporterChip}>
                <span aria-hidden style={{ marginRight: 6 }}>☕</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{s.displayName}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

function labelFor(p) {
  return { razorpay: 'Razorpay', paypal: 'PayPal', upi: 'UPI', bank: 'bank transfer' }[p] || p;
}

function Eliter({ icon, text }) {
  return (
    <div style={styles.eliteItem}>
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: C.text, fontSize: 13.5, lineHeight: 1.4, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function WhyCard({ icon, title, text, accent, border, step }) {
  return (
    <div style={{
      ...styles.whyCard,
      background: accent || C.panel,
      borderColor: border || C.panelBorder,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {step && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.10)',
          letterSpacing: 1, fontFamily: 'monospace',
        }}>{step}</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6, fontSize: 14 }}>{title}</div>
      <div style={{ color: C.textDim, fontSize: 13, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function PayCard({ title, sub, emoji, accent, onClick, disabled, disabledText }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        ...styles.payCard,
        borderColor: disabled ? 'rgba(255,255,255,0.05)' : `${accent}55`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>{sub}</div>
      {disabled && <div style={{ color: C.textFaint, fontSize: 11, marginTop: 8 }}>{disabledText}</div>}
    </button>
  );
}

function BankRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
      <span style={{ color: C.textDim, fontSize: 13 }}>{label}</span>
      <span style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    background: C.base,
    color: C.text,
    fontFamily: 'Poppins, sans-serif',
    overflow: 'hidden'
  },
  bgGlow: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 20% 10%, rgba(6,182,212,0.10), transparent 40%), ' +
      'radial-gradient(circle at 85% 0%, rgba(16,185,129,0.10), transparent 45%), ' +
      'radial-gradient(circle at 50% 100%, rgba(245,158,11,0.10), transparent 50%)',
    pointerEvents: 'none'
  },
  container: {
    position: 'relative',
    maxWidth: 1080,
    margin: '0 auto',
    padding: '36px 22px'
  },
  hero: {
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 20,
    padding: '28px 26px',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  },
  heroBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 999,
    background: C.amberSoft,
    border: `1px solid ${C.amberBorder}`,
    color: '#fde68a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.4
  },
  heroTitle: {
    margin: '14px 0 10px',
    fontSize: 30,
    lineHeight: 1.2,
    fontWeight: 700
  },
  heroLead: {
    margin: 0,
    color: C.textDim,
    lineHeight: 1.6,
    fontSize: 15
  },
  thankPill: {
    marginTop: 16,
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.4)',
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: 600
  },
  pendingPill: {
    marginTop: 16,
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(6,182,212,0.12)',
    border: '1px solid rgba(6,182,212,0.4)',
    color: '#a5f3fc',
    fontSize: 13,
    fontWeight: 600
  },
  eliteCard: {
    marginTop: 22,
    background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(139,92,246,0.08))',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: 20,
    padding: '22px 24px',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  },
  eliteHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12
  },
  eliteBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 999,
    background: 'rgba(245,158,11,0.20)',
    border: `1px solid ${C.amberBorder}`,
    color: '#fde68a',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8
  },
  eliteSubtle: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: 500
  },
  eliteIntro: {
    margin: '0 0 16px',
    color: C.textDim,
    fontSize: 14.5,
    lineHeight: 1.6
  },
  eliteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 10
  },
  eliteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 12,
    padding: '11px 14px'
  },
  whyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginTop: 22
  },
  whyCard: {
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 14,
    padding: 16
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap'
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700
  },
  currencyToggle: {
    display: 'inline-flex',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 999,
    padding: 4
  },
  currencyBtn: {
    background: 'transparent',
    border: 'none',
    padding: '6px 14px',
    borderRadius: 999,
    color: C.textDim,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  currencyBtnActive: {
    background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(16,185,129,0.2))',
    color: C.text,
    boxShadow: '0 0 0 1px rgba(6,182,212,0.4)'
  },
  durationTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  durationTab: {
    flex: '1 1 auto',
    minWidth: 90,
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 12,
    padding: '10px 14px',
    color: C.textDim,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  durationTabActive: {
    background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
    color: C.text,
    boxShadow: `0 0 0 1px ${C.amberBorder}`
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12
  },
  tierCard: {
    cursor: 'pointer',
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 16,
    padding: 18,
    textAlign: 'center',
    color: C.text,
    fontFamily: 'Poppins, sans-serif',
    transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease'
  },
  tierCardActive: {
    borderColor: C.amberBorder,
    boxShadow: '0 8px 28px rgba(245,158,11,0.18)',
    transform: 'translateY(-2px)'
  },
  tierName: { fontWeight: 700 },
  tierAmount: { fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4 },
  tierBlurb: { marginTop: 8, fontSize: 12, color: C.textDim, lineHeight: 1.4 },
  customRow: {
    marginTop: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap'
  },
  customLabel: { color: C.textDim, fontSize: 13 },
  customInputWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 10,
    padding: '6px 10px'
  },
  currencyPrefix: { color: C.textDim, marginRight: 6, fontWeight: 600 },
  customInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: C.text,
    width: 120,
    fontSize: 14,
    fontFamily: 'Poppins, sans-serif'
  },
  totalNote: { color: C.textDim, fontSize: 13 },
  payHint: { color: C.textDim, fontSize: 13, marginTop: -4, marginBottom: 14 },
  payGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12
  },
  payCard: {
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
    color: C.text,
    fontFamily: 'Poppins, sans-serif',
    transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease'
  },
  bankBox: {
    marginTop: 14,
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 14,
    padding: 16
  },
  confirmBox: {
    marginTop: 18,
    background: 'rgba(245,158,11,0.06)',
    border: `1px solid ${C.amberBorder}`,
    borderRadius: 14,
    padding: 16
  },
  confirmRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8
  },
  confirmInput: {
    flex: '1 1 220px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: C.text,
    fontSize: 14,
    fontFamily: 'Poppins, sans-serif'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#1f2937',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  ghostBtn: {
    background: 'transparent',
    color: C.textDim,
    border: `1px solid ${C.panelBorder}`,
    padding: '10px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  thankBox: {
    marginTop: 18,
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.4)',
    borderRadius: 14,
    padding: 18,
    textAlign: 'center'
  },
  supporterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  supporterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 999,
    padding: '6px 12px'
  }
};
