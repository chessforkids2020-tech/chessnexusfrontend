// src/pages/marketing/ChessAcademyPage.jsx — /chess-academy-software
//
// PUBLIC academy/institute page: what the academy tier is, how running a
// multi-coach academy works, and how the head coach both runs the academy AND
// keeps their own students. Pricing lives on /chess-academy-pricing; this page
// links to it rather than duplicating the numbers.
//
// Why this page exists: the academy tier was fully built (dashboard, coaches,
// billing, payments, settings) but had NO public page — /academy/* is gated
// behind AcademyGate, so a prospective academy could not see it at all.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import AudienceSplit from "../../components/marketing/AudienceSplit";

const CANONICAL = "/chess-academy-software";

const FAQ = [
  {
    q: "What is a chess academy account on Chess Nexus?",
    a: "An academy is an overlay over normal coach accounts. The head of the academy invites coaches in, pays for all of their plans in one place, and oversees every coach, student, class and assignment from one aggregated dashboard. Each coach keeps their own students and their own workspace — nothing is taken away from them.",
  },
  {
    q: "Can the head of the academy also coach their own students?",
    a: "Yes. The academy head is a full coach as well. You keep your own student roster, courses, assignments and live classes exactly like any other coach, and you additionally get the academy dashboard for the whole organisation. You do not need a second account.",
  },
  {
    q: "How many coaches can an academy have?",
    a: "Between 5 and 25 depending on the plan — Starter covers 5 coaches, Growth 10, and Institute 25. Each plan also sets how many students each coach can have, from 50 up to 150 per coach.",
  },
  {
    q: "Do individual coaches still need their own subscription?",
    a: "No. When the academy pays, every member coach is given the academy plan's entitlements automatically. Coaches do not pay anything themselves, and they do not need to manage their own billing.",
  },
  {
    q: "What happens to coaches if the academy plan expires?",
    a: "Nobody is locked out. Each member coach keeps their current plan on a short exit trial so they have time to set up their own subscription, and all of their students, courses and history stay exactly where they are.",
  },
  {
    q: "Is there a discount for paying for several coaches at once?",
    a: "Yes. Academy billing applies a bulk discount that grows with the number of coaches you pay for in one checkout — 10% from 3 coaches, 15% from 6, and 20% from 11 or more, off the combined total.",
  },
  {
    q: "Can coaches be added or removed later?",
    a: "Yes. The head invites coaches by email or invite link, and can remove them at any time from the Coaches page. Your plan's coach limit is the only cap.",
  },
  {
    q: "Does every coach in the academy get the live classroom?",
    a: "Yes — every Chess Nexus coach has the built-in live classroom. The academy plan then sets how often each coach can teach live, how long each class runs, and how many students can join one room.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "1",
    icon: "🏫",
    title: "Create the academy",
    body: "Set up your academy with its name and details. You become the head coach — the owner — with full control over billing, coaches and settings.",
  },
  {
    n: "2",
    icon: "✉️",
    title: "Invite your coaches",
    body: "Invite coaches by email or share a join link. They accept and become members of your academy, keeping the coach account and students they already have.",
  },
  {
    n: "3",
    icon: "💳",
    title: "Pay once, for everyone",
    body: "Choose an academy plan and pay centrally. Every member coach is upgraded automatically — no coach handles their own billing, and bulk discounts apply as you add coaches.",
  },
  {
    n: "4",
    icon: "📊",
    title: "Oversee everything",
    body: "The academy dashboard aggregates every coach: their students, classes taken, assignments set and activity — so you can see how the whole organisation is running at a glance.",
  },
];

const MANAGE = [
  { icon: "👥", title: "Coaches", body: "Invite, view and remove coaches. See each coach's student count and activity, and assign which plan each of them is on." },
  { icon: "🎓", title: "Students across the academy", body: "Every student of every coach, aggregated. See who is active, who has stalled, and which coach they belong to." },
  { icon: "💳", title: "Central billing", body: "One academy plan covers all of your coaches. Pay monthly or for three months at a discount, in your own currency." },
  { icon: "🧾", title: "Payments & invoices", body: "A full record of what the academy has paid, when, and for which coaches — for your own accounting." },
  { icon: "🎥", title: "Live classes for every coach", body: "Each coach gets the built-in live classroom with a shared board, video, chat and play-in-class — with limits set by the academy plan." },
  { icon: "⚙️", title: "Academy settings", body: "Your academy's identity and preferences in one place, controlled by the head coach." },
];

export default function ChessAcademyPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to run a chess academy on Chess Nexus",
    step: HOW_IT_WORKS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Academy Software — Manage Multiple Coaches in One Place",
        description:
          "Run your whole chess academy on Chess Nexus: invite your coaches, pay for everyone centrally, and oversee every coach, student and class from one dashboard — while still coaching your own students as head coach.",
        keywords:
          "chess academy software, chess academy management, manage multiple chess coaches, chess institute software, chess club management software, chess school platform",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🏫",
        h1: "Chess academy software",
        sub:
          "Bring your coaches together in one place. Invite your team, pay for everyone centrally, and oversee every coach, student and class from a single dashboard — while still teaching your own students as head coach.",
        primary: { to: "/chess-academy-pricing", label: "See academy pricing" },
        secondary: { to: "/coach/onboarding", label: "Start as a coach — free" },
      }}
      jsonLd={[faqSchema, howToSchema]}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="What an academy is">
        <h2>Built for academies, institutes and chess schools</h2>
        <p className="mkt-section-lead">
          A single coach account is built for one person teaching their own students.
          An academy is built for an <strong>organisation</strong> — several coaches
          teaching under one roof, with one person responsible for all of it.
        </p>
        <p className="mkt-p">
          On Chess Nexus an academy sits <em>on top of</em> normal coach accounts. Your
          coaches keep everything they already have — their students, their courses,
          their assignments, their live classes. What the academy adds is the layer
          above: central billing, a coach roster you control, and one dashboard that
          aggregates the whole organisation.
        </p>
        <AudienceSplit current="academy" />
      </section>

      <section className="mkt-section" aria-label="How it works">
        <h2>How it works</h2>
        <p className="mkt-section-lead">Four steps from your first coach to a running academy.</p>
        <ul className="mkt-featurelist">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n}>
              <span className="mkt-feat-ic" aria-hidden="true">{s.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{s.n}. {s.title}</strong>
                <span>{s.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="Head coach">
        <h2>You run the academy — and you still coach</h2>
        <p className="mkt-section-lead">
          The head of the academy is not an administrator locked out of teaching.
        </p>
        <p className="mkt-p">
          As head coach you keep a complete, ordinary coach account: your own students,
          your own courses and assignments, your own live classes, your own schedule and
          parent reports. Everything a solo coach gets, you get.
        </p>
        <p className="mkt-p">
          On top of that you get the academy layer — the coach roster, central billing and
          the organisation-wide dashboard. You switch between "my students" and "the whole
          academy" from the same login. There is no second account to manage and nothing
          to hand over to someone else.
        </p>
      </section>

      <section className="mkt-section" aria-label="What you manage">
        <h2>Everything you manage in one place</h2>
        <ul className="mkt-featurelist">
          {MANAGE.map((m) => (
            <li key={m.title}>
              <span className="mkt-feat-ic" aria-hidden="true">{m.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{m.title}</strong>
                <span>{m.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="Plans overview">
        <h2>Plans that scale with your team</h2>
        <p className="mkt-section-lead">
          Academy plans are sized by how many coaches you have and how many students each
          coach teaches — with or without raised live-classroom limits.
        </p>
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Coaches</th>
                <th>Students per coach</th>
                <th>Total students</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Starter</strong></td><td>Up to 5</td><td>50</td><td><strong>250</strong></td></tr>
              <tr><td><strong>Growth</strong></td><td>Up to 10</td><td>100</td><td><strong>1,000</strong></td></tr>
              <tr><td><strong>Institute</strong></td><td>Up to 25</td><td>150</td><td><strong>3,750</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p className="mkt-p">
          Each of those comes in two families — one without raised live-classroom limits and
          one with. Bulk discounts apply as you pay for more coaches at once. See{" "}
          <Link to="/chess-academy-pricing">academy pricing</Link> for the full table and
          current prices.
        </p>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Academy questions</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-cta-section" aria-label="Start">
        <h2>Bring your academy onto one platform</h2>
        <p className="mkt-section-lead">
          Start as a coach for free, then create your academy when you're ready to add your team.
        </p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start free</Link>
          <Link to="/chess-academy-pricing" className="mkt-btn">See academy pricing</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
