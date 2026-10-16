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
import { t as tr } from '../../i18n/LanguageContext';

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
    a: "As many as you need — Starter covers up to 5 coaches, Growth up to 10, and Institute has no coach limit at all. Every plan gives every coach the same 100 students, so a bigger plan only ever buys you more coaches.",
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
    a: "Academy plans are flat-priced by coach count — $89 for up to 5 coaches, $129 for up to 10, and $199 for unlimited coaches — so the saving is already built into the plan rather than added as a per-coach discount. Paying for three months at once takes 10% off.",
  },
  {
    q: "Can coaches be added or removed later?",
    a: "Yes. The head invites coaches by email or invite link, and can remove them at any time from the Coaches page. Your plan's coach limit is the only cap.",
  },
  {
    q: "Does every coach in the academy get the live classroom?",
    a: "Yes, and it is unlimited on every academy plan. Each coach can run unlimited live classes a day, with unlimited students in the room, and classes up to 120 minutes or with no time limit at all. There is no cheaper academy plan with a smaller classroom — all three include it in full.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "1",
    icon: "🏫",
    title: tr("Create the academy"),
    body: tr("Set up your academy with its name and details. You become the head coach — the owner — with full control over billing, coaches and settings."),
  },
  {
    n: "2",
    icon: "✉️",
    title: tr("Invite your coaches"),
    body: tr("Invite coaches by email or share a join link. They accept and become members of your academy, keeping the coach account and students they already have."),
  },
  {
    n: "3",
    icon: "💳",
    title: tr("Pay once, for everyone"),
    body: tr("Choose an academy plan and pay centrally. Every member coach is upgraded automatically — no coach handles their own billing, and adding a coach costs nothing extra until you outgrow the tier."),
  },
  {
    n: "4",
    icon: "📊",
    title: tr("Oversee everything"),
    body: tr("The academy dashboard aggregates every coach: their students, classes taken, assignments set and activity — so you can see how the whole organisation is running at a glance."),
  },
];

const MANAGE = [
  { icon: "👥", title: tr("Coaches"), body: tr("Invite, view and remove coaches. See each coach's student count and activity, and assign which plan each of them is on.") },
  { icon: "🎓", title: tr("Students across the academy"), body: tr("Every student of every coach, aggregated. See who is active, who has stalled, and which coach they belong to.") },
  { icon: "💳", title: tr("Central billing"), body: tr("One academy plan covers all of your coaches. Pay monthly or for three months at a discount, in your own currency.") },
  { icon: "🧾", title: tr("Payments & invoices"), body: tr("A full record of what the academy has paid, when, and for which coaches — for your own accounting.") },
  { icon: "🎥", title: tr("Live classes for every coach"), body: tr("Each coach gets the built-in live classroom with a shared board, video, chat and play-in-class — unlimited classes a day with unlimited students in the room, on every academy plan.") },
  { icon: "⚙️", title: tr("Academy settings"), body: tr("Your academy's identity and preferences in one place, controlled by the head coach.") },
];

export default function ChessAcademyPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": tr("Answer"), text: a },
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
        title: tr("Chess Academy Software — Manage Multiple Coaches in One Place"),
        description:
          "Run your whole chess academy on Chess Nexus: invite your coaches, pay for everyone centrally, and oversee every coach, student and class from one dashboard — while still coaching your own students as head coach. Plans from $89/month for 5 coaches to $199 for unlimited coaches, each with 100 students and an unlimited live classroom.",
        keywords:
          "chess academy software, chess academy management, manage multiple chess coaches, chess institute software, chess club management software, chess school platform",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🏫",
        h1: "Chess academy software",
        sub:
          "Bring your coaches together in one place. Invite your team, pay for everyone centrally, and oversee every coach, student and class from a single dashboard — while still teaching your own students as head coach.",
        primary: { to: "/chess-academy-pricing", label: tr("See academy pricing") },
        secondary: { to: "/coach/onboarding", label: tr("Start as a coach — free") },
      }}
      jsonLd={[faqSchema, howToSchema]}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label={tr("What an academy is")}>
        <h2>{tr("Built for academies, institutes and chess schools")}</h2>
        <p className="mkt-section-lead">
          A single coach account is built for one person teaching their own students.
          {tr("An academy is built for an")} <strong>{tr("organisation")}</strong> {tr("— several coaches")}
          teaching under one roof, with one person responsible for all of it.
        </p>
        <p className="mkt-p">
          {tr("On Chess Nexus an academy sits")} <em>{tr("on top of")}</em> {tr("normal coach accounts. Your")}
          coaches keep everything they already have — their students, their courses,
          their assignments, their live classes. What the academy adds is the layer
          above: central billing, a coach roster you control, and one dashboard that
          aggregates the whole organisation.
        </p>
        <AudienceSplit current="academy" />
      </section>

      <section className="mkt-section" aria-label={tr("How it works")}>
        <h2>{tr("How it works")}</h2>
        <p className="mkt-section-lead">{tr("Four steps from your first coach to a running academy.")}</p>
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

      <section className="mkt-section" aria-label={tr("Head coach")}>
        <h2>{tr("You run the academy — and you still coach")}</h2>
        <p className="mkt-section-lead">
          {tr("The head of the academy is not an administrator locked out of teaching.")}
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

      <section className="mkt-section" aria-label={tr("What you manage")}>
        <h2>{tr("Everything you manage in one place")}</h2>
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

      <section className="mkt-section" aria-label={tr("Plans overview")}>
        <h2>{tr("Plans that scale with your team")}</h2>
        <p className="mkt-section-lead">
          Academy plans are sized by one thing only: how many coaches you have. Every plan
          gives every coach 100 students and the full unlimited live classroom.
        </p>
        {/* Static table — this page makes no API call, so these figures are what
            crawlers and AI assistants read. Mirrors backend/config/academyPlans.js.
            The "Total students" column was dropped along with the old 6-plan
            structure: Institute has unlimited coaches, so there is no finite
            academy-wide total to quote any more. */}
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>{tr("Plan")}</th>
                <th>{tr("Coaches")}</th>
                <th>{tr("Students per coach")}</th>
                <th>{tr("Per month")}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>{tr("Starter")}</strong></td><td>{tr("Up to 5")}</td><td>100</td><td>$89 / ₹7,999</td></tr>
              <tr><td><strong>{tr("Growth")}</strong></td><td>{tr("Up to 10")}</td><td>100</td><td>$129 / ₹11,999</td></tr>
              <tr><td><strong>{tr("Institute")}</strong></td><td><strong>{tr("Unlimited")}</strong></td><td>100</td><td>$199 / ₹19,999</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mkt-p">
          All three include unlimited live classes with unlimited students in the room,
          unlimited courses and lessons, premium endgames, the premium blunder library, a
          cloud opening repertoire and elite-coach perks for every coach. Pay monthly or in a
          {tr("3-month term for 10% off. See")}{" "}
          <Link to="/chess-academy-pricing">{tr("academy pricing")}</Link> {tr("for the full breakdown.")}
        </p>
      </section>

      <section className="mkt-section" aria-label={"FAQ"}>
        <h2>{tr("Academy questions")}</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-cta-section" aria-label={tr("Start")}>
        <h2>{tr("Bring your academy onto one platform")}</h2>
        <p className="mkt-section-lead">
          {tr("Start as a coach for free, then create your academy when you're ready to add your team.")}
        </p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">{tr("Start free")}</Link>
          <Link to="/chess-academy-pricing" className="mkt-btn">{tr("See academy pricing")}</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
