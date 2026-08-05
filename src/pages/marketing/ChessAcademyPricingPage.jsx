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
    a: "Chess Nexus academy plans start at $88 per month for up to 5 coaches and 50 students per coach, and go up to $1,777 per month for up to 25 coaches and 150 students per coach with unlimited live classes. Plans without raised live-classroom limits are cheaper than the equivalent live plan. One academy plan covers every coach — coaches never pay separately.",
  },
  {
    q: "How many coaches can join one academy?",
    a: "Starter plans cover up to 5 coaches, Growth up to 10, and Institute up to 25. Each plan also sets how many students every coach may teach: 50 on Starter, 100 on Growth and 150 on Institute. So an Institute academy can reach up to 3,750 students across 25 coaches.",
  },
  {
    q: "What does each coach get in an academy?",
    a: "Every coach in the academy gets a full coach account: their own student roster, course builder, assignments, attendance, class schedule, parent progress reports and the built-in live classroom. The academy plan then sets their student limit and their live-class limits. Every plan with the live classroom also makes each coach an elite coach — unlimited Team Race events and unlimited Monthly Focus challenges — plus premium endgames, the premium blunder library and a cloud opening repertoire.",
  },
  {
    q: "How does academy billing work?",
    a: "The academy pays for all of its coaches in one place. You pick an academy plan sized to your number of coaches, pay monthly or for three months, and every member coach is given that plan's entitlements automatically. Individual coaches never handle their own billing.",
  },
  {
    q: "Is there a discount for more coaches?",
    a: "Yes. Paying for more coaches in a single checkout earns a bulk discount off the combined total — 10% from 3 coaches, 15% from 6, and 20% from 11 or more. Paying for three months at once takes a further 10% off.",
  },
  {
    q: "Which currencies can an academy pay in?",
    a: "Prices are shown here in US dollars. At checkout an academy is billed in the currency for its country — Indian rupees, US dollars, euros, pounds, Australian and Canadian dollars, Singapore dollars or UAE dirhams. India is priced separately for the Indian market.",
  },
  {
    q: "What is the difference between the two plan families?",
    a: "The 'Without Live Classroom' plans set how many coaches you have and how many students each coach can teach, and include a single short live class a day. The 'With Live Classroom' plans give every coach unlimited live classes a day, unlimited students in the room, and classes up to 120 minutes or with no time limit at all.",
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
const totalStudents = (p) => (p.maxCoaches || 0) * (p.studentsPerCoach || 0);

// One family's table. Rendered ONCE PER FAMILY (not behind a toggle) so both
// tables are in the HTML for crawlers and AI search — a toggle would hide half
// the pricing from anything that doesn't run JavaScript interactions.
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
            <th>Total students</th>
            <th>Live classes per coach</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td>{money(p)}</td>
              <td>Up to {p.maxCoaches}</td>
              <td>{p.studentsPerCoach}</td>
              <td><strong>{totalStudents(p).toLocaleString()}</strong></td>
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
              Covers up to <strong>{p.maxCoaches} coaches</strong> on one bill.
              Each coach gets up to <strong>{p.studentsPerCoach} students</strong>,
              so the academy reaches up to{" "}
              <strong>{totalStudents(p).toLocaleString()} students</strong> in total
              ({p.maxCoaches} coaches × {p.studentsPerCoach} students).
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
      .catch(() => { if (alive) setData({ plans: {}, families: [] }); });
    return () => { alive = false; };
  }, []);

  const families = data?.families || [];
  const tiers = (data?.discountTiers || []).filter((t) => t.pct > 0);
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
      `Chess academy plan for up to ${p.maxCoaches} coaches with ${p.studentsPerCoach} students per coach ` +
      `(up to ${totalStudents(p).toLocaleString()} students in total). ` +
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
        title: "Chess Academy Pricing — Multi-Coach Plans from $88/month",
        description:
          "Chess Nexus academy pricing: plans for 5, 10 or 25 coaches with 50–150 students each, up to 3,750 students in total. One plan covers every coach, with bulk discounts. Compare academy plans with and without live classrooms.",
        keywords:
          "chess academy pricing, chess academy software cost, chess institute software pricing, multi coach chess platform price, chess school software cost, how much does chess academy software cost",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🏫",
        h1: "Academy pricing",
        sub:
          "One plan covers your whole team — from 5 to 25 coaches, and up to 3,750 students. Coaches never pay separately, and discounts grow as your academy grows.",
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
          free up to 30 students.
        </p>
        <AudienceSplit current="academy" />
      </section>

      <section className="mkt-section" aria-label="How academy pricing works">
        <h2>How academy pricing works</h2>
        <p className="mkt-section-lead">
          An academy buys <strong>one plan</strong>. That plan decides three things: how many
          coaches you can have, how many students each of those coaches can teach, and what
          each coach's live classroom allows.
        </p>
        <ul className="mkt-featurelist">
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">👥</span>
            <span className="mkt-feat-tx">
              <strong>Coaches</strong>
              <span>Up to 5, 10 or 25 coaches depending on the plan. Invite them by email or link; remove them any time.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🎓</span>
            <span className="mkt-feat-tx">
              <strong>Students per coach</strong>
              <span>50, 100 or 150 students for every coach in the academy — not shared between them.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🎥</span>
            <span className="mkt-feat-tx">
              <strong>Live classroom</strong>
              <span>Every coach gets the built-in classroom. The live plans give each coach unlimited classes a day and much larger rooms.</span>
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

      {!data && (
        <section className="mkt-section"><p className="mkt-p">Loading plans…</p></section>
      )}

      {/* Each family gets its OWN section + table, always rendered (no toggle), so
          both price lists are visible to readers and crawlers at once. */}
      {families.map((f) => {
        const plans = (f.order || []).map((id) => data?.plans?.[id]).filter(Boolean);
        if (!plans.length) return null;
        const live = f.key === "live";
        return (
          <section className="mkt-section" key={f.key} aria-label={f.title}>
            <h2>{live ? "Academy plans with live classroom" : "Academy plans without live classroom"}</h2>
            <p className="mkt-section-lead">
              {live
                ? "Every coach gets unlimited live classes a day and a full-size live room — for academies that teach live every day."
                : "The full coaching toolkit for every coach, with a single short live class a day. For academies that teach mostly through assignments, courses and practice."}
            </p>
            {live && (
              <p className="mkt-p">
                ⭐ <strong>Every plan with the live classroom makes each of your coaches an
                elite coach</strong> — unlimited Team Race events and unlimited Monthly Focus
                challenges, on all three live plans.
              </p>
            )}
            <PlanTable plans={plans} />
            <PlanCards plans={plans} />
          </section>
        );
      })}

      {data && allPlans.length > 0 && (
        <section className="mkt-section" aria-label="Price comparison">
          <h2>Every academy plan at a glance</h2>
          <p className="mkt-section-lead">
            All six plans side by side, cheapest first — so you can see exactly what each step up buys.
          </p>
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Live classroom</th>
                  <th>Per month (USD)</th>
                  <th>Coaches</th>
                  <th>Students each</th>
                  <th>Total students</th>
                  <th>Live room size</th>
                </tr>
              </thead>
              <tbody>
                {allPlans
                  .slice()
                  .sort((a, b) => (usd(a) ?? 0) - (usd(b) ?? 0))
                  .map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.family === "live" ? "✅ Unlimited classes" : "1 class/day"}</td>
                      <td>{money(p)}</td>
                      <td>{p.maxCoaches}</td>
                      <td>{p.studentsPerCoach}</td>
                      <td><strong>{totalStudents(p).toLocaleString()}</strong></td>
                      <td>{isUnlimited(p.liveClass?.maxStudents) ? 'Unlimited' : `${p.liveClass?.maxStudents} + coach`}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="mkt-p" style={{ fontSize: 13, opacity: 0.75, marginTop: 10 }}>
              Prices shown in US dollars. At checkout your academy is billed in its own currency —
              ₹ INR, €, £, A$, C$, S$ or د.إ. India is priced separately for the Indian market.
            </p>
          </div>
        </section>
      )}

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

      {tiers.length > 0 && (
        <section className="mkt-section" aria-label="Bulk discount">
          <h2>The more coaches, the bigger the discount</h2>
          <p className="mkt-section-lead">
            Applied automatically to the combined total when you pay for your coaches in one go.
          </p>
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr><th>Coaches paid for at once</th><th>Discount</th></tr>
              </thead>
              <tbody>
                {tiers
                  .slice()
                  .sort((a, b) => a.min - b.min)
                  .map((t) => (
                    <tr key={t.min}>
                      <td>{t.min}+ coaches</td>
                      <td><strong>{Math.round(t.pct * 100)}% off</strong></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mkt-p">
            Paying for three months up front takes a further <strong>10%</strong> off on top.
          </p>
        </section>
      )}

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
              <strong>free forever for up to 30 students</strong>, with paid tiers from
              $29/month and a live classroom on every plan.{" "}
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
