import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-community";

const FAQ = [
  {
    q: "Is there a chess community I can join?",
    a: "Yes. The Chess Nexus social hub lets you add friends, join clubs, chat, follow a live activity feed and compete on community leaderboards — all free with no ads.",
  },
  {
    q: "Can I create or join a chess club?",
    a: "Absolutely. Browse existing clubs to find your crowd, or start your own community and invite players to learn and compete together.",
  },
  {
    q: "How do I connect with other players?",
    a: "Follow friends, message them in chat, see who's online and watch each other's results in the activity feed — staying connected between games is built right in.",
  },
];

export default function ChessCommunityPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chess Community — Friends, Clubs & Leaderboards",
    description:
      "Join the Chess Nexus community — add friends, join clubs, chat, follow live activity feeds and climb leaderboards. Free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Chess Community — Friends, Clubs & Leaderboards",
        description:
          "Join the Chess Nexus community. Add friends, join chess clubs, chat, follow a live activity feed and climb weekly leaderboards — a friendly, free, ad-free chess community.",
        keywords:
          "chess community, chess clubs online, online chess friends, chess social, chess club, join chess community, chess players online",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🤝",
        h1: "Join the Chess Nexus Community",
        sub: "Chess is better with people. Add friends, join clubs, chat, follow a live activity feed and climb weekly leaderboards in a friendly, growing community — free, no ads.",
        primary: { label: "Open the Social Hub", to: "/social" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split mkt-split-reverse">
          <div className="mkt-split-media">
            <img src="/features/clubs.png" alt="Chess Community — friends, clubs and leaderboards" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Ways to connect</h2>
            <p>
              Friends, clubs, chat and recognition — everything that makes playing
              here feel like a community.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">👋</span>
                <span className="mkt-feat-tx">
                  <strong>Friends &amp; live activity feed</strong>
                  <span>See who's online, follow friends, and watch race finishes, podium results and personal bests happen live across the community.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🏛️</span>
                <span className="mkt-feat-tx">
                  <strong>Clubs</strong>
                  <span>Play, learn and compete alongside players who share your interests — build your own club or find one that fits you.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">💬</span>
                <span className="mkt-feat-tx">
                  <strong>Social hub chat</strong>
                  <span>Message friends and talk chess between games.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🏆</span>
                <span className="mkt-feat-tx">
                  <strong>Leaderboards &amp; recognition</strong>
                  <span>Climb weekly leaderboards, get recognised as a top racer or top inviter, and earn community tiers like Mentor and Ambassador.</span>
                </span>
              </li>
            </ul>
            <Link to="/social" className="mkt-card-cta">
              Open the social hub →
            </Link>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Why community matters</h2>
        <p className="mkt-section-lead">
          Players who feel part of a community stick with chess and improve faster.
          Friends to challenge, clubs to belong to and leaderboards to chase keep
          training fun and motivating — and on Chess Nexus it's all free, with no
          ads getting in the way.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/social" className="mkt-btn mkt-btn-primary">
            Join the community
          </Link>
          <Link to="/clubs" className="mkt-btn mkt-btn-ghost">
            Find a club
          </Link>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Frequently asked questions</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div className="mkt-faq-item" key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </FeaturePageLayout>
  );
}
