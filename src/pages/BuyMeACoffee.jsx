// BuyMeACoffee.jsx — the support page.
//
// Supporting ChessNexus grants a TITLE shown before the name, the way a FIDE
// title is: "NS Hikaru". A coffee cup meant nothing to chess players; a title
// is the currency of identity here.
//
//   Knight (♞)        entry tier, a knight beside the name
//   Nexus Supporter   NS
//   Nexus Expert      NX
//
// Supports INR (Razorpay / UPI / Indian bank) and USD (PayPal / international
// cards via Razorpay International). The file and route keep the "coffee" name
// internally — renaming the model, collection and 10 API paths would be a
// migration for zero user-visible gain.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useSupporterRefresh } from '../context/SupporterContext';
import SEO from '../components/SEO';

const C = {
  base: 'var(--color-bg)',
  panel: 'var(--color-surface)',
  panelBorder: 'var(--color-white-a07)',
  text: 'var(--color-text)',
  textDim: 'rgba(229,231,235,0.7)',
  textFaint: 'rgba(229,231,235,0.45)',
  cyan: 'var(--color-accent)',
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  amberSoft: 'var(--color-warning-a20)',
  amberBorder: 'var(--color-warning-a30)'
};

// Two choices combine to set the price and how long the title lasts:
//   1. A tier (base price)                 2. A duration (1 / 3 / 6 / 12 months)
// Final price = base × months. The title then lives for that many months. A
// single payment — no auto-renewal.
//
// THE `id` VALUES ARE A DATA CONTRACT. They are written to
// CoffeeSupporter.tier and mapped to titles by TIER_TITLES in
// backend/models/CoffeeSupporter.js. Renaming an id silently strips the title
// from everyone who bought that tier — change the `name` shown to users, never
// the id.
const COFFEE_TIERS_INR = [
  { id: 'simple',   emoji: '♞', name: 'Knight',         title: null, base: 149, blurb: 'A knight beside your name. Fuels one bug fix.' },
  { id: 'espresso', emoji: '⚔', name: 'Nexus Supporter', title: 'NS', base: 250, blurb: 'The NS title before your name. Pays for a feature sprint.' },
  { id: 'latte',    emoji: '👑', name: 'Nexus Expert',   title: 'NX', base: 500, blurb: 'The NX title before your name. Covers a day of server bills.' }
];

const COFFEE_TIERS_USD = [
  { id: 'simple',   emoji: '♞', name: 'Knight',         title: null, base: 3,  blurb: 'A knight beside your name. Fuels one bug fix.' },
  { id: 'espresso', emoji: '⚔', name: 'Nexus Supporter', title: 'NS', base: 5,  blurb: 'The NS title before your name. Pays for a feature sprint.' },
  { id: 'latte',    emoji: '👑', name: 'Nexus Expert',   title: 'NX', base: 10, blurb: 'The NX title before your name. Covers a day of server bills.' }
];

// Duration options shown as tabs above the tiers. They multiply the price and
// set how long the title lasts.
const DURATIONS = [
  { months: 1,  label: '1 Month'   },
  { months: 3,  label: '3 Months'  },
  { months: 6,  label: '6 Months'  },
  { months: 12, label: '12 Months' }
];

const DEFAULT_MONTHS = 3;          // 3 months selected by default

// How many early backers get the permanent 👑 Founding Supporter badge. Purely a
// front-end display incentive for the empty/early state — honest scarcity ("first N").
const FOUNDING_LIMIT = 100;

export default function BuyMeACoffee() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const refreshSupporters = useSupporterRefresh();
  const [currency, setCurrency] = useState('INR');
  const [months, setMonths] = useState(DEFAULT_MONTHS); // duration tab; 3 by default
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('espresso'); // espresso default
  const [info, setInfo] = useState({ payment: {}, supporters: [] });
  const [myStatus, setMyStatus] = useState({ active: false, pendingCount: 0 });
  // Founding spots remaining, from the backend's DISTINCT founder count. Never derive
  // this from `supporters.length` — that list is newest-first and capped at 20, so it
  // would report "80 spots left" forever. Falls back to the limit if the field is
  // missing (older backend), which just keeps the offer visible.
  const foundingLeft = Math.max(
    0,
    (info.foundingLimit ?? FOUNDING_LIMIT) - (info.foundingTaken ?? 0)
  );
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

  // The three tiers are the only options.
  //
  // A free-text "Your Amount" card used to sit beside them. It is gone: the
  // thing being bought is a TITLE, and a title is defined by its tier. An
  // arbitrary amount has no title, so the page had to guess one from the
  // number — which meant ₹500 typed and ₹500 clicked could give different
  // results, and nothing on screen explained why.
  const selectedCoffee = useMemo(
    () => coffees.find(c => c.id === selectedCoffeeId) || coffees[1],
    [coffees, selectedCoffeeId]
  );
  const baseAmount = selectedCoffee?.base || 0;

  const effectiveMonths = months;
  const effectiveAmount = baseAmount * months;            // tier price × months
  const effectiveTierId = selectedCoffee?.id || 'espresso';
  const canContinue = baseAmount > 0;

  // The name used in the "this is how it will look" previews. Falls back to a
  // placeholder for a signed-out visitor, who is exactly the person the preview
  // has to convince.
  const previewName = user?.displayName || user?.username || 'YourName';

  const switchCurrency = (c) => {
    userToggledCurrency.current = true;
    setCurrency(c); // tier/month selection preserved; prices recompute for the new currency
  };

  const pickCoffee = (id) => setSelectedCoffeeId(id);

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
        description: `${selectedCoffee?.name} — ${effectiveMonths} ${effectiveMonths === 1 ? 'month' : 'months'} supporter badge`,
        order_id: orderId,
        prefill: { name: user?.displayName || '' },
        theme: { color: 'var(--color-warning)' },
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
            try { await refreshSupporters(); } catch (_) {} // update the title instantly everywhere
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
    const coffeeObj = selectedCoffee;
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
            ← Back
          </button>

          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            {!thankYou ? (
              <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', overflow: 'hidden' }}>

                {/* Amount header */}
                <div style={{ textAlign: 'center', padding: '28px 24px 20px', borderBottom: `1px solid ${C.panelBorder}` }}>
                  <div style={{ fontSize: 54 }}>{coffeeObj?.emoji || '♞'}</div>
                  <div style={{ color: C.textDim, fontSize: 13, marginTop: 6 }}>
                    {coffeeObj?.name || 'Custom amount'} · {monthsLabel}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-warning-a12)', border: '1px solid var(--color-warning-a30)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', marginBottom: 12 }}>
                    {/* Live preview of the exact title this tier grants, in the
                        same order it renders app-wide: title, then name. */}
                    {coffeeObj?.title && (
                      <span className="nexus-title" style={{ fontSize: 16 }}>{coffeeObj.title}</span>
                    )}
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{user?.displayName || 'You'}</span>
                    {!coffeeObj?.title && <span style={{ fontSize: 18, color: 'var(--color-accent)' }}>♞</span>}
                    <span style={{ color: C.amber, fontSize: 11, fontWeight: 600, background: 'var(--color-warning-a12)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>Preview</span>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                    {coffeeObj?.title ? (
                      <>The <strong className="nexus-title">{coffeeObj.title}</strong> title appears before your name for{' '}</>
                    ) : (
                      <>A <strong style={{ color: 'var(--color-accent)' }}>♞ knight</strong> appears beside your name for{' '}</>
                    )}
                    <strong style={{ color: C.text }}>{monthsLabel}</strong> — visible on your dashboard, leaderboards, chat and everywhere on ChessNexus. One-time payment, no auto-renewal.
                  </p>
                </div>

                {/* Pay */}
                <div style={{ padding: '20px 24px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePayNow}
                    style={{ ...styles.primaryBtn, width: '100%', fontSize: 15, padding: '14px 20px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box', opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? 'Opening payment…' : 'Confirm & Pay with Razorpay'}
                  </button>
                  <div style={{ color: C.textFaint, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                    Accepts UPI · Credit card · Debit card
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.thankBox}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>♞✨</div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 18 }}>Welcome, supporter!</div>
                <div style={{ color: C.textDim, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                  Your title is now live next to your name — visible on your dashboard, leaderboards, and everywhere on ChessNexus. You're literally fuelling the next feature.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{ ...styles.primaryBtn, marginTop: 18, padding: '10px 24px', borderRadius: 'var(--radius-lg)' }}
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
      {/* Without this the prerendered page inherits index.html's canonical,
          which points at '/' — Google would fold this page into the homepage
          as a duplicate and never index it. */}
      <SEO
        title="Support Chess Nexus — Earn Your Nexus Title"
        description="Chess Nexus is free with no ads. If it has helped you or your students, support it once and earn a Nexus title — NS or NX — shown before your name across the site."
        keywords="support chess nexus, donate chess platform, nexus title, chess supporter title"
        canonical="/nexus-supporter"
      />
      <div style={styles.bgGlow} />

      <div style={styles.container}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroBadge}>♞ Support ChessNexus</div>
          <h1 style={styles.heroTitle}>
            Your support keeps  <span style={{ color: C.cyan }}>ChessNexus</span> alive
          </h1>
          <p style={styles.heroLead}>
           People say chess is a lonely game.
ChessNexus says otherwise.

Every supporter helps build real-time arenas, tournaments, puzzles, and the future of multiplayer chess.
          </p>
          {myStatus.active && (
            <div style={styles.thankPill}>♞ You're an active supporter — thank you! Your badge is showing next to your name.</div>
          )}
          {!myStatus.active && myStatus.pendingCount > 0 && (
            <div style={styles.pendingPill}>We've got your message — your badge will appear shortly.</div>
          )}
          {/* Founding-supporter draw — only while early spots remain and the viewer
              isn't already a supporter. Honest scarcity, not fake proof. */}
          {!myStatus.active && !loading && foundingLeft > 0 && (
            <div style={styles.foundingPill}>
              👑 Founding Supporter — our first {FOUNDING_LIMIT} backers get a <strong>permanent</strong> badge that never expires.
            </div>
          )}
        </div>

        {/* Supporter XP perk — shown to EVERYONE, not just people mid-purchase
            Any active supporter gets it.
            Wording is scoped to "locked activities" deliberately: every XP-gated
            FEATURE waives its cost for supporters (books, premium endgames,
            endgame play-out vs Stockfish, opening repertoire — all check
            CoffeeSupporter.isActive), but avatar unlocks still charge XP, since
            routes/auth.js keeps "no privileged free pass for cosmetics". Saying
            "everything" here would be a promise the backend does not keep. */}
        <div style={styles.xpPerkCard}>
          <span style={styles.xpPerkIcon}>🔓</span>
          <div>
            <div style={styles.xpPerkTitle}>
              Supporters never spend XP on locked activities
            </div>
            <p style={styles.xpPerkText}>
              While your support is active, every locked activity opens for free — no XP needed.
              <strong style={{ color: C.text }}> Premium endgames</strong>,
              <strong style={{ color: C.text }}> playing endgames out against Stockfish</strong>,
              the <strong style={{ color: C.text }}>opening repertoire trainer</strong> and
              all <strong style={{ color: C.text }}>Nexus books</strong> unlock instantly.
              Save your XP — or never earn it at all.
            </p>
          </div>
        </div>

        {/* Currency switch */}
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>Choose your title</h2>
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
            How long should your title last?
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
            One-time payment, no auto-renewal. Tier price × {effectiveMonths}{' '}
            {effectiveMonths === 1 ? 'month' : 'months'}.
          </div>
        </div>

        {/* Title tiers — price shown is base × selected months */}
        <div style={styles.tierGrid}>
          {coffees.map(coffee => {
            const active = selectedCoffeeId === coffee.id;
            const price = coffee.base * months;
            return (
              <button
                key={coffee.id}
                type="button"
                onClick={() => pickCoffee(coffee.id)}
                style={{
                  ...styles.tierCard,
                  ...(active ? styles.tierCardActive : null),
                  position: 'relative',
                }}
              >
                {/* THE TITLE IS THE HEADLINE.
                    The whole point of supporting is the title, so it is the
                    largest thing on the card — bigger than the price. Showing
                    only an emoji and a name meant nobody could tell they were
                    buying a title at all. */}
                {coffee.title ? (
                  <div style={styles.tierTitleBig}>{coffee.title}</div>
                ) : (
                  <div style={styles.tierTitleBigIcon}>{coffee.emoji}</div>
                )}

                <div style={styles.tierName}>{coffee.name}</div>

                {/* What the title actually expands to, spelled out. "NS" means
                    nothing until you are told it is Nexus Supporter. */}
                <div style={styles.tierTitleMeaning}>
                  {coffee.title ? 'Your title, before your name' : 'A knight beside your name'}
                </div>

                {/* A worked example, so the value is concrete rather than
                    abstract: this is literally how your name will look. */}
                <div style={styles.tierNamePreview}>
                  {coffee.title
                    ? <><span className="nexus-title">{coffee.title}</span>{' '}{previewName}</>
                    : <>{previewName} <span style={{ color: 'var(--color-accent)' }}>♞</span></>}
                </div>

                <div style={styles.tierAmount}>
                  {currency === 'INR' ? `₹${price}` : `$${price}`}
                </div>
                <div style={styles.tierBlurb}>{coffee.blurb}</div>
              </button>
            );
          })}
        </div>

        {/* What the titles mean — stated once, plainly, under the cards.
            Without this the letters are just letters. */}
        <div style={styles.titleKey}>
          <div style={styles.titleKeyRow}>
            <span className="nexus-title" style={{ fontSize: 15 }}>NS</span>
            <span style={styles.titleKeyText}>
              <strong>Nexus Supporter</strong> — shown before your name, like a chess title.
            </span>
          </div>
          <div style={styles.titleKeyRow}>
            <span className="nexus-title" style={{ fontSize: 15 }}>NX</span>
            <span style={styles.titleKeyText}>
              <strong>Nexus Expert</strong> — the senior title, for our strongest supporters.
            </span>
          </div>
          <p style={styles.titleKeyFoot}>
            Your title appears everywhere your name does — chat, leaderboards, lobbies
            and your profile — for as long as your support runs. It sits after a FIDE
            title if you hold one: <span className="chess-title">GM</span>{' '}
            <span className="nexus-title">NS</span> {previewName}.
          </p>
        </div>

        {/* What every supporter can do.
            These are the real gates in the code, not aspirations — each one is
            enforced through helpers/privileged.js on the server. Any tier
            unlocks all of them; the tier only decides the title. */}
        <div style={styles.perksCard}>
          <div style={styles.perksHead}>
            <span style={styles.perksEyebrow}>♞ EVERY SUPPORTER GETS</span>
            <span style={styles.perksSubtle}>Any tier — the tier only sets your title</span>
          </div>
          <div style={styles.perksGrid}>
            <Perk icon="🎯" title="Create Monthly Focus challenges"
                  text="Design your own month-long training plans and share them." />
            <Perk icon="🏁" title="Host Team Races"
                  text="Create races, build teams, assign players and run the whole event." />
            <Perk icon="☁️" title="Opening repertoire in the cloud"
                  text="Unlimited saves — no XP, no cap." />
            <Perk icon="♟️" title="Endgame trainer and play"
                  text="Every position open, against the engine or as a drill. No XP." />
            <Perk icon="📚" title="All Nexus books"
                  text="Read the full library free." />
            <Perk icon="📊" title="Weekly practice report"
                  text="Your 5-day report, free every time. Normally 100 XP." />
            <Perk icon="🎨" title="All six app themes"
                  text="Every palette unlocked. Others earn them at 1,000 XP each." />
          </div>
          <p style={styles.perksFoot}>
            Everything above is unlocked for as long as your support runs — no XP
            spent on any of it. Board colours and piece sets stay free for
            everyone, supporter or not.
          </p>
        </div>

        {/* Continue */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            style={{ ...styles.primaryBtn, padding: '13px 32px', fontSize: 15, borderRadius: 'var(--radius-lg)', opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'not-allowed' }}
          >
            Continue · {currency === 'INR' ? '₹' : '$'}{effectiveAmount} for {effectiveMonths}{' '}
            {effectiveMonths === 1 ? 'month' : 'months'} →
          </button>
        </div>

        {/* Where the money goes */}
        <div style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-white-a07)' }} />
            <span style={{ color: 'var(--color-warning)', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>♞ WHERE YOUR SUPPORT GOES</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-white-a07)' }} />
          </div>
          <div style={styles.whyGrid}>
            <WhyCard
              icon="🖥️"
              title="Always-On Servers"
              text="Every cup helps keep ChessNexus.in running 24 × 7. No downtime, no slow nights — just fast, reliable chess for everyone, always."
              accent="var(--color-accent-a20)"
              border="var(--color-accent-a20)"
              step="01"
            />
            <WhyCard
              icon="🗄️"
              title="Your Progress, Remembered"
              text="Your games, ratings, streaks, and puzzle history need a home. Your support keeps our databases healthy so every move you make is recorded and learned from."
              accent="var(--color-success-a20)"
              border="var(--color-success-a20)"
              step="02"
            />
            <WhyCard
              icon="👨‍💻"
              title="Full-Time Developers"
              text="The people who build arenas, 3D rooms, team races, and everything in between work full time for ChessNexus. Your support is what keeps them here — building for you."
              accent="var(--color-accent-2-a15)"
              border="var(--color-accent-2-a15)"
              step="03"
            />
            <WhyCard
              icon="🧑‍🏫"
              title="Live Classroom"
              text="Real-time video classes where coaches teach on a shared board — the servers, video, and tools that let every lesson happen live keep running on your support."
              accent="var(--color-warning-a20)"
              border="var(--color-warning-a20)"
              step="04"
            />
          </div>
        </div>

        {/* Recent supporters */}
        <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Recent supporters</h2>
        {loading ? (
          <div style={{ color: C.textFaint }}>Loading…</div>
        ) : info.supporters.length === 0 ? (
          // Honest empty state: instead of a faint one-liner, a warm "be the first"
          // card. Being first is a draw, not a red flag — and it sells the permanent
          // Founding Supporter badge that early backers get.
          <div style={styles.firstSupporterCard}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>👑</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 19 }}>Be our very first supporter</div>
            <p style={{ color: C.textDim, fontSize: 14, lineHeight: 1.6, margin: '10px auto 0', maxWidth: 460 }}>
              ChessNexus is brand new and built by a tiny team. Our <strong style={{ color: 'var(--color-warning)' }}>first {FOUNDING_LIMIT} supporters</strong> get a
              permanent <strong style={{ color: 'var(--color-warning)' }}>👑 Founding Supporter</strong> badge — it never expires, as a thank-you for believing early.
            </p>
            <button
              type="button"
              onClick={() => { if (!user) { navigate('/login'); return; } window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ ...styles.primaryBtn, marginTop: 16, padding: '11px 24px', borderRadius: 'var(--radius-lg)', fontSize: 14 }}
            >
              Claim Founding Supporter
            </button>
          </div>
        ) : (
          <>
            {/* Founding-supporter incentive stays visible while spots remain. */}
            {foundingLeft > 0 && (
              <div style={styles.foundingBanner}>
                👑 <strong style={{ color: 'var(--color-warning)' }}>{foundingLeft} Founding Supporter {foundingLeft === 1 ? 'spot' : 'spots'} left</strong>
                {' '}— early supporters get a permanent badge that never expires.
              </div>
            )}
            <div style={styles.supporterRow}>
              {info.supporters.map((s, i) => (
                <div key={i} style={styles.supporterChip}>
                  {/* Founder status comes from the STORED flag, not list position —
                      the list is newest-first and capped, so an index check would
                      hand out crowns to the wrong people as it grows. */}
                  <span aria-hidden style={{ marginRight: 6 }}>{s.founding ? '👑' : '♞'}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>{s.displayName}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

function labelFor(p) {
  return { razorpay: 'Razorpay', paypal: 'PayPal', upi: 'UPI', bank: 'bank transfer' }[p] || p;
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
          fontSize: 11, fontWeight: 800, color: 'var(--color-white-a10)',
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
        borderColor: disabled ? 'var(--color-white-a04)' : `${accent}55`,
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--color-white-a07)' }}>
      <span style={{ color: C.textDim, fontSize: 13 }}>{label}</span>
      <span style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function Perk({ icon, title, text }) {
  return (
    <div style={styles.perkItem}>
      <span style={styles.perkIcon}>{icon}</span>
      <span>
        <span style={styles.perkTitle}>{title}</span>
        <span style={styles.perkText}>{text}</span>
      </span>
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
      'radial-gradient(circle at 20% 10%, var(--color-accent-a12), transparent 40%), ' +
      'radial-gradient(circle at 85% 0%, var(--color-accent-2-a12), transparent 45%), ' +
      'radial-gradient(circle at 50% 100%, var(--color-warning-a12), transparent 50%)',
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
    borderRadius: 'var(--radius-2xl)',
    padding: '28px 26px',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  },
  heroBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 'var(--radius-pill)',
    background: C.amberSoft,
    border: `1px solid ${C.amberBorder}`,
    color: 'var(--color-warning)',
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
    borderRadius: 'var(--radius-pill)',
    background: 'var(--color-success-a12)',
    border: '1px solid var(--color-success-a30)',
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: 600
  },
  pendingPill: {
    marginTop: 16,
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--color-accent-a12)',
    border: '1px solid var(--color-accent-a40)',
    color: 'var(--color-accent)',
    fontSize: 13,
    fontWeight: 600
  },
  foundingPill: {
    marginTop: 16,
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--color-warning-a12)',
    border: '1px solid var(--color-warning-a30)',
    color: 'var(--color-warning)',
    fontSize: 13,
    fontWeight: 600
  },
  // Supporter XP perk band.
  xpPerkCard: {
    marginTop: 22,
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    background: 'linear-gradient(135deg, var(--color-accent-2-a12), var(--color-accent-a06))',
    border: '1px solid rgba(52,211,153,0.34)',
    borderRadius: 'var(--radius-xl)',
    padding: '18px 20px',
  },
  xpPerkIcon: {
    flex: 'none',
    fontSize: 22,
    lineHeight: 1,
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-success-a12)',
    border: '1px solid rgba(52,211,153,0.3)',
  },
  xpPerkTitle: { color: 'var(--color-success)', fontWeight: 800, fontSize: 15, marginBottom: 6 },
  xpPerkText: { color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.65, margin: 0 },

  whyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginTop: 22
  },
  whyCard: {
    background: C.panel,
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 'var(--radius-lg)',
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
    background: 'var(--color-white-a04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 'var(--radius-pill)',
    padding: 4
  },
  currencyBtn: {
    background: 'transparent',
    border: 'none',
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
    color: C.textDim,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  currencyBtnActive: {
    background: 'linear-gradient(135deg, var(--color-accent-a20), var(--color-accent-2-a20))',
    color: C.text,
    boxShadow: '0 0 0 1px var(--color-accent-a40)'
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
    borderRadius: 'var(--radius-lg)',
    padding: '10px 14px',
    color: C.textDim,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  durationTabActive: {
    background: 'linear-gradient(135deg, var(--color-warning-a20), var(--color-warning-a12))',
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
    borderRadius: 'var(--radius-xl)',
    padding: 18,
    textAlign: 'center',
    color: C.text,
    fontFamily: 'Poppins, sans-serif',
    transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease'
  },
  tierCardActive: {
    borderColor: C.amberBorder,
    boxShadow: '0 8px 28px var(--color-warning-a20)',
    transform: 'translateY(-2px)'
  },
  /* "Every supporter gets" panel. */
  perksCard: {
    marginTop: 22,
    padding: '20px 22px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-accent-a20)',
    borderRadius: 'var(--radius-lg)',
  },
  perksHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  perksEyebrow: {
    color: 'var(--color-accent)',
    fontSize: 12.5,
    fontWeight: 800,
    letterSpacing: 0.6,
  },
  perksSubtle: { color: C.textFaint, fontSize: 12 },
  perksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  perkItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  perkIcon: { fontSize: 19, lineHeight: 1.2, flexShrink: 0 },
  perkTitle: {
    display: 'block',
    color: C.text,
    fontSize: 13.5,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  perkText: {
    display: 'block',
    color: C.textDim,
    fontSize: 12.5,
    lineHeight: 1.45,
    marginTop: 1,
  },
  perksFoot: {
    margin: '14px 0 0',
    paddingTop: 12,
    borderTop: '1px solid var(--color-white-a07)',
    color: C.textFaint,
    fontSize: 12.5,
    lineHeight: 1.6,
  },
  tierName: { fontWeight: 700 },
  tierAmount: { fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 10 },
  tierBlurb: { marginTop: 8, fontSize: 12, color: C.textDim, lineHeight: 1.4 },

  /* The title, as the card's headline. Deliberately larger than the price:
     the title is what is being bought. */
  tierTitleBig: {
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '0.02em',
    color: 'var(--color-accent)',
    marginBottom: 6,
  },
  /* The entry tier has no letters, so its knight takes the same slot at the
     same visual weight — the three cards must line up. */
  tierTitleBigIcon: {
    fontSize: 40,
    lineHeight: 1,
    color: 'var(--color-accent)',
    marginBottom: 6,
  },
  /* "NS = Nexus Supporter". The expansion, right under the letters. */
  tierTitleMeaning: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textDim,
    letterSpacing: '0.01em',
  },
  /* A worked example of the user's own name with the title applied. */
  tierNamePreview: {
    marginTop: 8,
    padding: '5px 10px',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--color-white-a04)',
    border: `1px solid ${C.panelBorder}`,
    fontSize: 13,
    fontWeight: 700,
    color: C.text,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },

  /* The key under the cards: what NS and NX actually stand for. */
  titleKey: {
    marginTop: 22,
    padding: '18px 20px',
    background: 'var(--color-surface)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 'var(--radius-lg)',
  },
  titleKeyRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 8,
  },
  titleKeyText: { color: C.textDim, fontSize: 13.5, lineHeight: 1.5 },
  titleKeyFoot: {
    margin: '10px 0 0',
    paddingTop: 10,
    borderTop: `1px solid ${C.panelBorder}`,
    color: C.textFaint,
    fontSize: 12.5,
    lineHeight: 1.6,
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
    borderRadius: 'var(--radius-lg)',
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
    borderRadius: 'var(--radius-lg)',
    padding: 16
  },
  confirmBox: {
    marginTop: 18,
    background: 'var(--color-warning-a12)',
    border: `1px solid ${C.amberBorder}`,
    borderRadius: 'var(--radius-lg)',
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
    background: 'var(--color-white-a04)',
    border: `1px solid ${C.panelBorder}`,
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    color: C.text,
    fontSize: 14,
    fontFamily: 'Poppins, sans-serif'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, var(--color-warning), #d97706)',
    color: '#1f2937',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  ghostBtn: {
    background: 'transparent',
    color: C.textDim,
    border: `1px solid ${C.panelBorder}`,
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif'
  },
  thankBox: {
    marginTop: 18,
    background: 'var(--color-success-a12)',
    border: '1px solid var(--color-success-a30)',
    borderRadius: 'var(--radius-lg)',
    padding: 18,
    textAlign: 'center'
  },
  firstSupporterCard: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, var(--color-warning-a12), rgba(139,92,246,0.07))',
    border: '1px solid var(--color-warning-a30)',
    borderRadius: 'var(--radius-xl)',
    padding: '30px 24px',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  },
  foundingBanner: {
    marginBottom: 14,
    padding: '10px 16px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-warning-a12)',
    border: '1px solid var(--color-warning-a30)',
    color: C.textDim,
    fontSize: 13.5,
    lineHeight: 1.5
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
    borderRadius: 'var(--radius-pill)',
    padding: '6px 12px'
  }
};
