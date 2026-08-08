// src/pages/marketing/ChessAcademyPricingPage.jsx — /chess-academy-pricing
//
// PUBLIC academy pricing. The in-app academy billing page (/academy/billing) is
// owner-only behind AcademyGate, so a prospective academy — and any AI/search
// crawler — could never reach these prices. This page mirrors what the billing
// page shows (coach count, per-coach students, TOTAL students, live limits and
// every included feature) in plain crawlable HTML, and additionally emits
// Product/Offer JSON-LD per plan so AI search can quote exact numbers.
//
// Plans come from the public GET /api/academy/plans so this stays in step with
// config/academyPlans.js automatically.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import AudienceSplit from "../../components/marketing/AudienceSplit";

const CANONICAL = "/chess-academy-pricing";

const FAQ = [
  {
    q: "How much does chess academy software cost?",
    a: "Chess Nexus academy plans are $89 per month (₹7,999) for up to 5 coaches, $129 (₹11,999) for up to 10 coaches, and $199 (₹19,999) for unlimited coaches. Every plan gives each coach 100 students and the full live classroom — unlimited classes a day with unlimited students in the room. One academy plan covers every coach; coaches never pay separately.",
  },
  {
    q: "How many coaches can join one academy?",
    a: "Starter covers up to 5 coaches, Growth up to 10, and Institute has no coach limit at all — add as many as your academy needs. Every plan gives every coach the same 100 students, so moving up a plan only ever buys you more coaches.",
  },
  {
    q: "What does each coach get in an academy?",
    a: "Every coach in the academy gets a full coach account: their own student roster of up to 100 students, course builder, assignments, attendance, class schedule, parent progress reports and the built-in live classroom with unlimited classes a day, unlimited students in the room and classes up to 120 minutes or with no time limit at all. Every plan also makes each coach an elite coach — unlimited Team Race events and unlimited Monthly Focus challenges — plus premium endgames, the premium blunder library, unlimited courses and lessons and a cloud opening repertoire.",
  },
  {
    q: "How does academy billing work?",
    a: "The academy pays for all of its coaches in one place. You pick an academy plan sized to your number of coaches, pay monthly or for three months, and every member coach is given that plan's entitlements automatically. Individual coaches never handle their own billing.",
  },
  {
    q: "Is there a discount for more coaches?",
    a: "Academy plans are flat-priced by coach count, so the saving is built into the plan itself rather than applied as a per-coach discount: $199 covers unlimited coaches. Paying for three months at once takes 10% off.",
  },
  {
    q: "Which currencies can an academy pay in?",
    a: "Prices are shown here in US dollars. At checkout an academy is billed in the currency for its country — Indian rupees, US dollars, euros, pounds, Australian and Canadian dollars, Singapore dollars or UAE dirhams. India is priced separately for the Indian market.",
  },
  // Replaced the old "two plan families" question. There is no longer a
  // "Without Live Classroom" / "With Live Classroom" split to explain — every
  // academy plan carries the full classroom, so the only question left is what
  // actually changes as you move up the three plans.
  {
    q: "What is the difference between the three plans?",
    a: "Only the number of coaches. Starter covers up to 5 coaches, Growth up to 10, and Institute is unlimited. Everything else is identical on all three: 100 students for every coach, unlimited live classes a day with unlimited students in the room, classes up to 120 minutes or with no time limit, unlimited courses and lessons, premium endgames, the premium blunder library, a cloud opening repertoire and elite-coach perks for every coach.",
  },
  {
    q: "What happens if the academy plan expires?",
    a: "Coaches are not locked out. Each member coach keeps their current plan on a short exit trial so they have time to set up their own subscription, and every student, course and record stays exactly where it is.",
  },
  {
    q: "Can the academy head still coach their own students?",
    a: "Yes. The head of the academy is a full coach too — own students, own courses, own live classes — plus the academy dashboard for the whole organisation, all from one login.",
  },
];

// This PUBLIC page quotes USD (same reasoning as CoachPricingPage): most of its
// non-Indian traffic can't read a rupee figure. Every currency is still offered
// at checkout. Falls back to the INR base only if a plan has no USD price.
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
const usd = (plan) => (plan?.monthlyPrices?.USD != null ? plan.monthlyPrices.USD / 100 : null);

// JSON can't carry Infinity — academyPlansForWire() sends -1 for "unlimited".
const isUnlimited = (n) => n == null || n < 0;
function classesPerDay(lc) {
  return isUnlimited(lc?.meetingsPerDay) ? "Unlimited" : `${lc.meetingsPerDay} per day`;
}
function liveSentence(lc) {
  if (!lc) return "—";
  const room = isUnlimited(lc.maxStudents) ? "unlimited students in one room" : `${lc.maxStudents} students (+ coach) in one room`;
  const len = isUnlimited(lc.meetingsPerDay) ? `up to ${lc.durationMin} min each or unlimited` : `up to ${lc.durationMin} min each`;
  return `${classesPerDay(lc)} · ${len} · ${room}`;
}
// Coach cap. Institute has NO coach limit, and academyPlansForWire() sends -1 for
// that (JSON can't carry Infinity), so print "Unlimited" rather than "Up to -1".
const coachCap = (p) => (isUnlimited(p?.maxCoaches) ? "Unlimited" : `Up to ${p.maxCoaches}`);

// NOTE: the old totalStudents() helper (maxCoaches × studentsPerCoach) is gone
// along with the "Total students" column and prose that used it. Institute has
// unlimited coaches, so any such figure would state a cap that no longer exists.

// The plan table. There is now ONE list of three plans — the "with" / "without
// live classroom" families are gone, so this renders once rather than per family.
function PlanTable({ plans }) {
  return (
    <div className="mkt-table-wrap">
      <table className="mkt-table">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Per month (USD)</th>
            <th>Coaches</th>
            <th>Students per coach</th>
            <th>Live classes per coach</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td>{money(p)}</td>
              <td>{coachCap(p)}</td>
              <td>{p.studentsPerCoach}</td>
              <td>{liveSentence(p.liveClass)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Full per-plan breakdown — the same detail the in-app billing page shows, in
// crawlable prose so an AI answering "what does each coach get?" can read it.
function PlanCards({ plans }) {
  return (
    <ul className="mkt-featurelist" style={{ marginTop: 22 }}>
      {plans.map((p) => (
        <li key={p.id}>
          <span className="mkt-feat-ic" aria-hidden="true">🏫</span>
          <span className="mkt-feat-tx">
            <strong>{p.name} — {money(p)} per month</strong>
            <span>
              {isUnlimited(p.maxCoaches)
                ? <>Covers an <strong>unlimited number of coaches</strong> on one bill. </>
                : <>Covers up to <strong>{p.maxCoaches} coaches</strong> on one bill. </>}
              Each coach gets up to <strong>{p.studentsPerCoach} students</strong> of their own.
              Live classes for every coach: {liveSentence(p.liveClass)}.
              Every coach also gets their own course builder, assignments, attendance,
              class schedule and parent progress reports
              {(p.features || []).length ? `, plus: ${(p.features || []).join(", ")}` : ""}.
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ChessAcademyPricingPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/academy/plans")
      .then((r) => { if (alive) setData(r.data); })
      // Leave `data` NULL on failure so the static fallback table renders. Setting
      // it to an empty object made `!data` false while `allPlans.length > 0` was
      // also false, so the page showed NO prices at all — which is exactly what
      // prerender produces, since it aborts every API call.
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, []);

  const families = data?.families || [];
  const allPlans = families.flatMap((f) =>
    (f.order || []).map((id) => data?.plans?.[id]).filter(Boolean)
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  // Per-plan Product/Offer schema so AI search and rich results can quote exact
  // prices and limits instead of guessing from prose.
  const productSchemas = allPlans.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Chess Nexus Academy — ${p.name}`,
    description:
      `Chess academy plan for ${isUnlimited(p.maxCoaches) ? "unlimited coaches" : `up to ${p.maxCoaches} coaches`} ` +
      `with ${p.studentsPerCoach} students per coach. ` +
      `Live classes per coach: ${liveSentence(p.liveClass)}.`,
    category: "Chess academy management software",
    offers: {
      "@type": "Offer",
      price: usd(p) != null ? String(usd(p)) : undefined,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://www.chessnexus.in${CANONICAL}`,
    },
  }));

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Academy Pricing — Multi-Coach Plans from $89/month",
        description:
          "Chess Nexus academy pricing: $89/mo for up to 5 coaches, $129 for up to 10, $199 for unlimited coaches. Every plan gives every coach 100 students and unlimited live classes with unlimited students in the room. One plan covers every coach.",
        keywords:
          "chess academy pricing, chess academy software cost, chess institute software pricing, multi coach chess platform price, chess school software cost, how much does chess academy software cost",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🏫",
        h1: "Academy pricing",
        sub:
          "One plan covers your whole team — 5, 10 or unlimited coaches, each with 100 students and an unlimited live classroom. Coaches never pay separately.",
        primary: { to: "/coach/onboarding", label: "Get started free" },
        secondary: { to: "/chess-academy-software", label: "How academies work" },
      }}
      jsonLd={[faqSchema, ...productSchemas]}
      excludeSlug={CANONICAL}
    >
      {/* Mirror of the block on the coach pricing page — same two cards, with the
          academy side marked as the current page. */}
      <section className="mkt-section" aria-label="Coach or academy">
        <h2>First — are you an academy, or one coach?</h2>
        <p className="mkt-section-lead">
          Chess Nexus is sold two ways. This page covers <strong>academies and institutes</strong>{" "}
          with several coaches. If you teach alone, individual coach plans are cheaper — and
          free up to 20 students.
        </p>
        <AudienceSplit current="academy" />
      </section>

      <section className="mkt-section" aria-label="How academy pricing works">
        <h2>How academy pricing works</h2>
        <p className="mkt-section-lead">
          An academy buys <strong>one plan</strong>, and that plan decides exactly one thing:
          how many coaches you can have. Everything each coach gets — 100 students and the
          full unlimited live classroom — is identical on all three plans.
        </p>
        <ul className="mkt-featurelist">
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">👥</span>
            <span className="mkt-feat-tx">
              <strong>Coaches</strong>
              <span>Up to 5 on Starter, up to 10 on Growth, and unlimited on Institute. Invite them by email or link; remove them any time.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🎓</span>
            <span className="mkt-feat-tx">
              <strong>Students per coach</strong>
              <span>100 students for every coach in the academy, on every plan — not shared between them.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🎥</span>
            <span className="mkt-feat-tx">
              <strong>Live classroom</strong>
              <span>Unlimited live classes a day for every coach, with unlimited students in the room and classes up to 120 minutes or with no time limit at all.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">💳</span>
            <span className="mkt-feat-tx">
              <strong>One bill</strong>
              <span>The academy pays centrally. No coach ever enters a card or manages a subscription.</span>
            </span>
          </li>
        </ul>
      </section>

      {/* ONE section, three plans. This used to render a section per family
          ("with" and "without live classroom") plus a six-row comparison table
          below it; both families and three of the six plans no longer exist in
          config/academyPlans.js, so all of that collapsed into this one list. */}
      <section className="mkt-section" aria-label="Academy plans">
        <h2>Academy plans</h2>
        <p className="mkt-section-lead">
          Three plans, all with the full live classroom. Every coach on every plan gets
          100 students, unlimited live classes a day and unlimited students in the room —
          so the only question is how many coaches your academy has.
        </p>
        <p className="mkt-p">
          ⭐ <strong>Every academy plan makes each of your coaches an elite coach</strong> —
          unlimited Team Race events and unlimited Monthly Focus challenges, plus premium
          endgames, the premium blunder library and a cloud opening repertoire.
        </p>

        {/* Static fallback, mirroring CoachPricingPage: prerender.js aborts every
            API call, so /api/academy/plans never resolves at build time and the
            crawled snapshot would otherwise show "Loading plans…" with no prices
            at all. This table is what crawlers and AI assistants actually read.
            Mirrors backend/config/academyPlans.js — keep in step. */}
        {!data && (
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Per month (USD)</th>
                  <th>Per month (INR)</th>
                  <th>Coaches</th>
                  <th>Students per coach</th>
                  <th>Live classes per coach</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Starter</strong></td><td>$89</td><td>₹7,999</td><td>Up to 5</td><td>100</td><td>Unlimited · up to 120 min or no limit · unlimited students</td></tr>
                <tr><td><strong>Growth</strong></td><td>$129</td><td>₹11,999</td><td>Up to 10</td><td>100</td><td>Unlimited · up to 120 min or no limit · unlimited students</td></tr>
                <tr><td><strong>Institute</strong></td><td>$199</td><td>₹19,999</td><td><strong>Unlimited</strong></td><td>100</td><td>Unlimited · up to 120 min or no limit · unlimited students</td></tr>
              </tbody>
            </table>
            <p className="mkt-p">
              Every plan includes unlimited courses and lessons, the premium blunder library,
              premium endgames, a cloud opening repertoire and elite-coach perks for every
              coach — on one central bill, so no coach ever enters a card. Plans are bought by
              the month or in a 3-month term, and paying for 3 months up front takes 10% off.
            </p>
          </div>
        )}

        {allPlans.length > 0 && (
          <>
            <PlanTable plans={allPlans} />
            <PlanCards plans={allPlans} />
            <p className="mkt-p" style={{ fontSize: 13, opacity: 0.75, marginTop: 10 }}>
              Prices shown in US dollars. At checkout your academy is billed in its own currency —
              ₹ INR, €, £, A$, C$, S$ or د.إ. India is priced separately for the Indian market.
            </p>
          </>
        )}
      </section>

      <section className="mkt-section" aria-label="What every coach gets">
        <h2>What every coach in your academy gets</h2>
        <p className="mkt-section-lead">
          Regardless of plan, every member coach has a complete coaching workspace of their own.
        </p>
        <ul className="mkt-featurelist">
          <li><span className="mkt-feat-ic" aria-hidden="true">🎓</span><span className="mkt-feat-tx"><strong>Their own students & batches</strong><span>A private roster the coach manages, grouped into batches for classes.</span></span></li>
          <li><span className="mkt-feat-ic" aria-hidden="true">📘</span><span className="mkt-feat-tx"><strong>Course builder</strong><span>Build a syllabus from studies, videos, master games and endgame positions.</span></span></li>
          <li><span className="mkt-feat-ic" aria-hidden="true">📝</span><span className="mkt-feat-tx"><strong>Assignments</strong><span>Set puzzle, blunder-fix and game-based homework, and track who completed what.</span></span></li>
          <li><span className="mkt-feat-ic" aria-hidden="true">🎥</span><span className="mkt-feat-tx"><strong>Live classroom</strong><span>HD video, screen share, one shared board the class follows, and play-in-class games.</span></span></li>
          <li><span className="mkt-feat-ic" aria-hidden="true">🗓️</span><span className="mkt-feat-tx"><strong>Class schedule & attendance</strong><span>Weekly class slots students can see, with attendance marked automatically.</span></span></li>
          <li><span className="mkt-feat-ic" aria-hidden="true">📊</span><span className="mkt-feat-tx"><strong>Parent progress reports</strong><span>A shareable report link for every student's parents.</span></span></li>
        </ul>
      </section>

      {/* The per-coach bulk-discount table was removed. It promised a discount
          "applied automatically to the combined total", but academyPriceForMonths
          never applied one — the tiers were displayed and never charged. Under the
          new flat pricing (one price per coach-count tier) there is no per-coach
          discount to advertise. The 3-month 10% IS real and is stated with the
          plans above. */}

      <section className="mkt-section" aria-label="FAQ">
        <h2>Academy pricing FAQ</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" aria-label="Individual coaches">
        <div className="mkt-callout">
          <div className="mkt-callout-icon" aria-hidden="true">🎓</div>
          <div>
            <h2>Teaching on your own? You don't need an academy plan</h2>
            <p>
              Academy plans exist for organisations with several coaches. A single coach
              teaching their own students is better off on an individual plan — those are{" "}
              <strong>free forever for up to 20 students</strong>, with paid tiers from
              $19/month and a live classroom on every plan.{" "}
              <Link to="/chess-coach-pricing">See individual coach pricing</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-cta-section" aria-label="Start">
        <h2>Ready to bring your coaches together?</h2>
        <p className="mkt-section-lead">Start free, then create your academy when your team is ready.</p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Get started free</Link>
          <Link to="/chess-academy-software" className="mkt-btn">How academies work</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
