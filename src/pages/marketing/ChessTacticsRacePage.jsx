import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-tactics-race";

const FAQ = [
  {
    q: "What is a chess puzzle race?",
    a: "A chess puzzle race is a timed challenge where you solve as many tactical puzzles as possible before the clock runs out. It's a fast, exciting way to train pattern recognition and calculation speed.",
  },
  {
    q: "Is the puzzle race free?",
    a: "Yes — puzzle races on Chess Nexus are completely free with no ads. Race as often as you like, solo or with a team.",
  },
  {
    q: "How does racing improve my chess?",
    a: "Racing trains you to spot tactics quickly under time pressure — the same skill that wins blitz and rapid games. Regular timed practice boosts both your speed and your accuracy.",
  },
];

export default function ChessTacticsRacePage() {
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
    name: "Chess Puzzle Race — Timed Tactics Training",
    description:
      "Race against the clock solving chess puzzles by theme, solo or in teams, with live leaderboards. Free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Chess Puzzle Race — Timed Tactics Training",
        description:
          "Solve as many chess puzzles as you can against the clock. Timed puzzle races by theme, solo or in teams, with live leaderboards — 100% free, no ads.",
        keywords:
          "chess puzzle race, timed chess tactics, chess tactics race, chess puzzle rush, chess speed puzzles, team chess race, chess leaderboard",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🏁",
        h1: "Chess Puzzle Race — Beat the Clock",
        sub: "Test your tactical speed in timed chess puzzle races. Solve as many positions as you can before time runs out, race by theme, team up with friends and climb live leaderboards — all free, no ads.",
        primary: { label: "Start a Puzzle Race", to: "/arena-race" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split">
          <div className="mkt-split-media">
            <img src="/features/racehub.png" alt="Chess Puzzle Race — timed tactics training" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Ways to race</h2>
            <p>
              Solo sprints, themed drills or team battles — pick your race and get
              solving.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">⏱️</span>
                <span className="mkt-feat-tx">
                  <strong>Timed Puzzle Race</strong>
                  <span>Pick a duration — 5, 10 or 15 minutes — and chase your best score, streak and accuracy before the clock runs out.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🎯</span>
                <span className="mkt-feat-tx">
                  <strong>Race by theme</strong>
                  <span>Drill a specific pattern — forks, pins, mating nets and more — with a tailored set of puzzles.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">👥</span>
                <span className="mkt-feat-tx">
                  <strong>Team Race</strong>
                  <span>Every solve adds to your side's score — turning solo practice into a shared team challenge.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🏆</span>
                <span className="mkt-feat-tx">
                  <strong>Live leaderboards</strong>
                  <span>Every race feeds live leaderboards — see how you stack up this week and track the best racers of all time.</span>
                </span>
              </li>
            </ul>
            <Link to="/arena-race" className="mkt-card-cta">
              Start a race →
            </Link>
          </div>
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">📅</div>
        <div>
          <h2>New races every single day</h2>
          <p>
            There's always something live. Arena Races and Team Races run every day
            at different times, so whenever you sit down you'll find a fresh race to
            jump into — solo against the clock or together with your team.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Why race your tactics</h2>
        <p className="mkt-section-lead">
          Speed wins games. Racing trains you to recognise tactical patterns
          instantly and calculate under pressure — exactly what you need for blitz,
          rapid and tournament play. With live scores, accuracy tracking and
          leaderboards, every race shows you measurable progress, free and ad-free.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/arena-race" className="mkt-btn mkt-btn-primary">
            Race now
          </Link>
          <Link to="/best-racers" className="mkt-btn mkt-btn-ghost">
            See the best racers
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
