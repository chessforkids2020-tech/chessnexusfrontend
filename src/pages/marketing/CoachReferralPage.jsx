// src/pages/marketing/CoachReferralPage.jsx — /chess-coach-referral
//
// Standalone SEO page for the coach referral program. Targets "chess coaching
// referral", "refer a chess coach earn", "chess coach referral program",
// "earn credit chess coaching platform".
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import { t as tr } from '../../i18n/LanguageContext';

const CANONICAL = "/chess-coach-referral";

// Reward figures — keep in step with backend/config/coachPlans.js
// (REFERRAL_REWARD_PCT = 0.25, REFERRAL_MAX_DISCOUNT_PCT = 0.50).
const REWARD_PCT = 25;
const MAX_DISCOUNT_PCT = 50;

const STEPS = [
  { icon: "🔗", t: tr("Share your link"), d: tr("Every coach gets a personal referral link. Send it to another coach or academy you know.") },
  { icon: "🎓", t: tr("They join & coach"), d: tr("They sign up as a coach with your link — free forever for up to 30 students, no card required.") },
  { icon: "💳", t: tr("They subscribe"), d: tr("When they take their first paid plan to grow beyond the free tier, your reward unlocks.") },
  { icon: "💰", t: tr("You earn credit"), d: tr("You get {REWARD_PCT}% of what they paid as wallet credit, in your own currency.", { REWARD_PCT: REWARD_PCT }) },
];

const FAQ = [
  {
    q: "How does the chess coach referral program work?",
    a: tr("Every coach on Chess Nexus has a personal referral link. Share it with another coach. When they sign up as a coach and later take their first paid subscription, you earn {REWARD_PCT}% of what they paid as store credit in your referral wallet. That credit is spendable toward your own coach subscription.", { REWARD_PCT: REWARD_PCT }),
  },
  {
    q: "How much do I earn per referral?",
    a: tr("You earn {REWARD_PCT}% of the referred coach's first paid subscription. Refer a coach who buys a larger plan and you earn more. There's no limit on how many coaches you can refer.", { REWARD_PCT: REWARD_PCT }),
  },
  {
    q: "When do I get the reward?",
    a: "The reward is granted when the coach you referred makes their first paid subscription — not just when they sign up. This keeps the program fair: real, active coaches earn real credit.",
  },
  {
    q: "What can I do with the credit?",
    a: `Referral credit is store credit, spendable as a discount toward your own coach subscription — it covers up to ${MAX_DISCOUNT_PCT}% of a purchase. It's not a cash payout; it lowers what you pay to run your own coaching.`,
  },
  {
    q: "What currency is my reward in?",
    a: "Your reward is converted into your own home currency, so it's always spendable on your own checkout — even if the coach you referred paid in a different currency. An Indian coach earns in ₹, a US coach in $.",
  },
  {
    q: "Is there a catch or a cost to refer?",
    a: "No. Referring is free, sharing your link takes seconds, and both you and the coaches you invite start on the free-forever plan. You only ever earn — there's nothing to lose.",
  },
];

export default function CoachReferralPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": tr("Answer"), text: a },
    })),
  };

  return (
    <FeaturePageLayout
      seo={{
        title: tr("Chess Coach Referral Program — Refer Coaches & Earn Credit"),
        description:
          tr("Refer another chess coach to Chess Nexus and earn {REWARD_PCT}% of their first subscription as wallet credit toward your own plan. Free to join, no limit on referrals, paid in your own currency.", { REWARD_PCT: REWARD_PCT }),
        keywords:
          "chess coach referral, chess coaching referral program, refer a chess coach, earn credit chess coaching, chess academy referral, coach rewards chess platform",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "💰",
        h1: "Refer a chess coach, earn credit",
        sub:
          tr("Invite another coach or academy. When they take their first paid plan, you earn {REWARD_PCT}% of it as credit toward your own subscription — in your own currency, with no limit on referrals.", { REWARD_PCT: REWARD_PCT }),
        primary: { to: "/coach/onboarding", label: tr("Become a coach") },
        secondary: { to: "/chess-coach-pricing", label: tr("See coach pricing") },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label={tr("How it works")}>
        <h2>{tr("How the coach referral program works")}</h2>
        <p className="mkt-section-lead">
          {tr("Four steps, no cost to you or the coach you invite. Everyone starts free.")}
        </p>
        <ul className="mkt-featurelist">
          {STEPS.map((s) => (
            <li key={s.t}>
              <span className="mkt-feat-ic" aria-hidden="true">{s.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{s.t}</strong>
                <span>{s.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label={tr("What you earn")}>
        <h2>{tr("You earn")} {REWARD_PCT}{tr("%, in your own currency")}</h2>
        <p className="mkt-p">
          {tr("When a coach you referred takes their first paid subscription, you earn")}{" "}
          <strong>{REWARD_PCT}{tr("% of what they paid")}</strong> {tr("as credit in your referral")}
          {tr("wallet. The reward is converted into")} <strong>{tr("your")}</strong> {tr("home currency, so")}
          it's always spendable on your own checkout — an Indian coach earns in ₹, a US
          {tr("coach in $. Credit covers up to")} <strong>{MAX_DISCOUNT_PCT}%</strong> {tr("of your")}
          own subscription, so the coaches you bring in help pay for your own coaching.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">{tr("Start coaching free")}</Link>
        </div>
      </section>

      <section className="mkt-section" aria-label={tr("Why refer")}>
        <h2>{tr("Why it's worth sharing")}</h2>
        <p className="mkt-p">
          Chess Nexus is a coach-run academy platform: one coach brings a whole roster of
          students. Coaches already talk to each other — in clubs, at tournaments, in
          teacher groups. The referral program simply rewards a recommendation you'd make
          anyway. There's no cap on referrals and no cost to invite, so every coach you
          bring in is pure upside toward your own plan.
        </p>
      </section>

      <section className="mkt-section" aria-label={tr("For coaches")}>
        <h2>{tr("New to coaching on Chess Nexus?")}</h2>
        <p className="mkt-p">
          {tr("Coaching is")} <Link to="/chess-coaching">{tr("free forever for up to 30 students")}</Link>{" "}
          {tr("— manage a roster, set assignments, build")}{" "}
          <Link to="/chess-courses">{tr("courses")}</Link>{tr(", run a")}{" "}
          <Link to="/live-chess-classroom">{tr("live classroom")}</Link> {tr("and send parents")}{" "}
          <Link to="/chess-progress-reports">{tr("progress reports")}</Link>{tr(". See the full")}{" "}
          <Link to="/chess-coach-guide">{tr("coach guide")}</Link> {tr("and")}{" "}
          <Link to="/chess-coach-pricing">{tr("pricing")}</Link>.
        </p>
      </section>

      <section className="mkt-section" aria-label={"FAQ"}>
        <h2>{tr("Coach referral FAQ")}</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </FeaturePageLayout>
  );
}
