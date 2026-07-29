// src/pages/marketing/CoachPricingPage.jsx — /chess-coach-pricing
//
// PUBLIC coach pricing. Previously the homepage "See coach pricing" button sent
// people to /coach/subscription, which is a coach-only app page — so a normal
// student clicking it landed inside the coach area. This page is open to
// everyone (logged out included) and only *links* into the app to subscribe.
//
// Plans come from the already-public GET /api/coach/plans, so prices and limits
// stay in step with config/coachPlans.js automatically.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import AudienceSplit from "../../components/marketing/AudienceSplit";

const CANONICAL = "/chess-coach-pricing";

const FAQ = [
  {
    q: "Is Chess Nexus free for chess coaches?",
    a: "Yes. Coaching is free forever for up to 30 students — no card, no trial clock. That includes assignments, courses, attendance, the class schedule, parent reports and one live class a day.",
  },
  {
    q: "What's the difference between the plan families?",
    a: "The 'Without Live Classroom' plans raise your student cap and unlock premium coaching tools. The 'With Live Classroom' plans additionally raise how often you can teach live, how long each class runs, and how many students can join at once.",
  },
  {
    q: "Do I need a paid plan to teach live?",
    a: "No. Every coach gets the built-in live classroom, including free coaches — one class a day (up to 40 minutes) with up to 4 students plus you, the coach. The live plans give you unlimited classes a day with up to 10 students plus the coach, and the top live plan raises that to 120-minute classes with up to 25 students plus the coach.",
  },
  {
    q: "What happens if my paid plan expires?",
    a: "You're moved back to the free plan's limits rather than losing access. Your students, courses and history stay exactly where they are.",
  },
  {
    q: "Can I earn credit toward my subscription?",
    a: "Yes. Refer another coach and, when they take their first paid plan, you earn 25% of it as wallet credit toward your own subscription — in your own currency, with no limit on referrals. See the coach referral program for details.",
  },
];

// This PUBLIC page quotes USD — it's the SEO landing page and most of its
// non-Indian traffic can't read a rupee figure. INR (and every other currency)
// is still offered at checkout; see CoachSubscription.jsx for the picker.
// Falls back to the INR base only if a plan somehow has no USD price.
function money(plan) {
  const cents = plan?.monthlyPrices?.USD;
  if (cents == null) {
    const paise = plan?.monthlyPrice;
    if (!paise) return "Free";
    return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
  }
  if (!cents) return "Free";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

// "Unlimited" markers on the wire. JSON can't carry Infinity, so the API sends -1
// (see plansForWire in backend/routes/coach.js); null is used elsewhere. Treat any
// non-positive value as unlimited rather than printing a raw "-1".
function orUnlimited(n) {
  if (n === null || n === undefined || n < 0) return "Unlimited";
  return String(n);
}

export default function CoachPricingPage() {
  const [data, setData] = useState(null);
  const [family, setFamily] = useState("noLive");

  useEffect(() => {
    let alive = true;
    api.get("/api/coach/plans")
      .then((r) => { if (alive) setData(r.data); })
      // Leave `data` NULL when the request fails so the static fallback table
      // below renders. Setting it to an empty object made `!data` false while
      // `shown.length > 0` was also false, so the page rendered NO table at all
      // — which is exactly what prerender produced (it aborts every API call),
      // leaving crawlers with a pricing page containing no prices.
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, []);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const families = data?.planFamilies || [];
  const active = families.find((f) => f.key === family) || families[0];
  const shown = (active?.order || []).map((id) => data?.plans?.[id]).filter(Boolean);

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Coach Pricing — Free for 30 Students",
        description:
          "Chess Nexus coach pricing. Free forever for up to 30 students, including the built-in live classroom. Paid plans raise student limits and live-class length, frequency and size.",
        keywords:
          "chess coach pricing, chess coaching software cost, chess academy software pricing, online chess teaching platform price",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "💳",
        h1: "Coach pricing",
        sub:
          "Free forever for up to 30 students — including the live classroom. Paid plans are for coaches who need more students, longer classes, or more of them.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coach-guide", label: "See what's included" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      {/* Two different products — say so before the price list, or a school with
          several coaches reads solo pricing and never finds the academy tier. */}
      <section className="mkt-section" aria-label="Coach or academy">
        <h2>First — are you one coach, or an academy?</h2>
        <p className="mkt-section-lead">
          Chess Nexus is sold two ways. This page covers <strong>individual coaches</strong>.
          If several coaches teach under one name, the academy plans are cheaper per coach
          and add a dashboard over all of them.
        </p>
        <AudienceSplit current="solo" />
      </section>

      <section className="mkt-section" aria-label="Plans">
        <h2>Plans for individual coaches</h2>
        <p className="mkt-section-lead">
          Two families: one without the live classroom limits raised, one with. Every
          plan — including Free — includes the built-in classroom.
        </p>
        <p className="mkt-p">
          ⭐ <strong>Every plan in the "With Live Classroom" family is an elite coach plan</strong>{" "}
          — unlimited Team Race events and unlimited Monthly Focus challenges, on all three.
        </p>

        {families.length > 1 && (
          <div className="mkt-cta-row" style={{ justifyContent: "flex-start", marginBottom: 18 }}>
            {families.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`mkt-btn ${family === f.key ? "mkt-btn-primary" : ""}`}
                onClick={() => setFamily(f.key)}
              >
                {f.title}
              </button>
            ))}
          </div>
        )}

        {/* Static fallback shown while the live plan table loads — and, crucially,
            in the PRERENDERED snapshot, because prerender.js aborts every API
            call so /api/coach/plans never resolves at build time. Without this a
            crawler saw only "Loading plans…": the page asserted "free forever"
            but shipped no numbers to back it, so AI assistants answered that they
            could not confirm Chess Nexus is free for 30 students.
            Mirrors backend/config/coachPlans.js — keep in step. */}
        {!data && (
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Plan</th><th>Price (USD/mo)</th><th>Students</th><th>Live classes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Free</td><td>$0 — free forever</td><td>30</td><td>1/day · 40 min · 4 (+coach)</td></tr>
                <tr><td>Pro</td><td>$29</td><td>70</td><td>1/day · 60 min · 4 (+coach)</td></tr>
                <tr><td>Coach</td><td>$49</td><td>150</td><td>1/day · 60 min · 4 (+coach)</td></tr>
                <tr><td>Live Basic</td><td>$79</td><td>50</td><td>Unlimited · 60 min · 10 (+coach)</td></tr>
                <tr><td>Live Pro</td><td>$119</td><td>100</td><td>Unlimited · 60 min · 10 (+coach)</td></tr>
                <tr><td>Live Coach</td><td>$244</td><td>150</td><td>Unlimited · 120 min · 25 (+coach)</td></tr>
              </tbody>
            </table>
            <p className="mkt-p">
              The Free plan is <strong>free forever for up to 30 students</strong> — not a
              trial, and no card is required. It includes assignments, courses, the class
              schedule, attendance, fee tracking, parent progress reports and the built-in
              live classroom. See{" "}
              <Link to="/free-chess-coaching-software">everything included in the free plan</Link>.
            </p>
          </div>
        )}

        {data && shown.length > 0 && (
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Per month (USD)</th>
                  <th>Students</th>
                  <th>Live classes</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{money(p)}</td>
                    <td>{orUnlimited(p.maxStudents)}</td>
                    <td>
                      {p.liveClass
                        ? `${p.liveClass.meetingsPerDay < 0 || p.liveClass.meetingsPerDay == null
                            ? "Unlimited classes"
                            : `${p.liveClass.meetingsPerDay}/day`} · up to ${p.liveClass.durationMin} min · ${p.liveClass.maxStudents} students (+ coach)`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mkt-p" style={{ fontSize: 13, opacity: 0.75, marginTop: 10 }}>
              Prices shown in USD. At checkout you can pay in ₹ INR, €, £, A$, C$, S$ or د.إ —
              India and other regions are priced separately.
            </p>
          </div>
        )}

        {data && shown.length > 0 && (
          <ul className="mkt-featurelist" style={{ marginTop: 22 }}>
            {shown.map((p) => (
              <li key={p.id}>
                <span className="mkt-feat-ic" aria-hidden="true">
                  {p.monthlyPrice ? "⭐" : "🎁"}
                </span>
                <span className="mkt-feat-tx">
                  <strong>{p.name} — {money(p)}{p.monthlyPrice ? "/mo" : ""}</strong>
                  <span>{(p.features || []).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Pricing FAQ</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" aria-label="Academies">
        <div className="mkt-callout">
          <div className="mkt-callout-icon" aria-hidden="true">🏫</div>
          <div>
            <h2>More than one coach? Look at academy plans</h2>
            <p>
              If you run a chess academy, school or institute with several coaches, you
              don't buy a plan each. One academy plan covers <strong>5, 10 or 25 coaches</strong>{" "}
              — up to <strong>3,750 students</strong> — on a single bill, with one dashboard
              over every coach and student, and bulk discounts of up to 20%. The head of the
              academy still keeps their own students and teaches like any other coach.{" "}
              <Link to="/chess-academy-pricing">See academy pricing</Link> or read{" "}
              <Link to="/chess-academy-software">how academies work</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="mkt-section" aria-label="Referral program">
        <h2>Lower your cost — refer a coach</h2>
        <p className="mkt-p">
          Refer another coach and earn <strong>25%</strong> of their first paid
          subscription as wallet credit toward your own plan — in your own currency,
          with no limit on referrals. See how the{" "}
          <Link to="/chess-coach-referral">coach referral program</Link> works.
        </p>
      </section>

      <section className="mkt-section mkt-cta-section" aria-label="Start">
        <h2>Start free, upgrade only if you outgrow it</h2>
        <p className="mkt-section-lead">Up to 30 students, no card required.</p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start coaching free</Link>
          <Link to="/chess-coach-referral" className="mkt-btn">Refer & earn</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
