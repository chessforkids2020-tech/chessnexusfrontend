import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-tactics-race";

const MODES = [
  {
    icon: "⏱️",
    title: "Timed Puzzle Race",
    body:
      "Race against the clock and solve as many chess puzzles as you can before time runs out. Pick a duration — 5, 10 or 15 minutes — and a theme, then chase your best score, streak and accuracy.",
    appPath: "/arena-race",
    cta: "Start a race",
  },
  {
    icon: "🎯",
    title: "Race by Theme",
    body:
      "Want to drill a specific tactic? Choose a topic — forks, pins, mating nets and more — and race through a tailored set of puzzles to sharpen exactly the pattern you're working on.",
    appPath: "/choose-topic",
    cta: "Pick a theme",
  },
  {
    icon: "🤝",
    title: "Team Race",
    body:
      "Team up and compete together. Team races turn solo tactics practice into a shared challenge where every solve adds to your side's score.",
    appPath: "/team-race",
    cta: "Join a team race",
  },
  {
    icon: "🏆",
    title: "Live Leaderboards",
    body:
      "Every race feeds live leaderboards. See how you stack up against other racers this week, track the best racers of all time and climb the rankings.",
    appPath: "/best-racers",
    cta: "View best racers",
  },
];

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
        <h2>Ways to race</h2>
        <p className="mkt-section-lead">
          Solo sprints, themed drills or team battles — pick your race and get
          solving.
        </p>
        <div className="mkt-grid">
          {MODES.map((m) => (
            <div className="mkt-card" key={m.title}>
              <div className="mkt-card-icon">{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <Link to={m.appPath} className="mkt-card-cta">
                {m.cta} →
              </Link>
            </div>
          ))}
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
