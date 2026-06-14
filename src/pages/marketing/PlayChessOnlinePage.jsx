import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/play-chess-online";

const MODES = [
  {
    icon: "🌐",
    title: "Play Live Against People",
    body:
      "Challenge other Chess Nexus members to live games and play in real time. Find an opponent, sit down at the board and test your skills against a real person.",
    appPath: "/play",
    cta: "Play a live game",
  },
  {
    icon: "🤖",
    title: "Play vs the Computer",
    body:
      "Sharpen up against the Stockfish engine — one of the strongest chess engines in the world. Practise openings, endgames and full games at a level that pushes you.",
    appPath: "/play/ai",
    cta: "Play vs Stockfish",
  },
  {
    icon: "📺",
    title: "Watch Live Games",
    body:
      "Spectate live games as they happen, follow the action move by move and learn from how other players handle key positions.",
    appPath: "/games",
    cta: "Browse live games",
  },
  {
    icon: "🗂️",
    title: "Review Your Games",
    body:
      "Every game you play is saved to your history. Revisit past games, replay the moves and feed them straight into the analysis tool to learn from your wins and losses.",
    appPath: "/game-analysis",
    cta: "Analyse your games",
  },
];

const FAQ = [
  {
    q: "Can I play chess online for free?",
    a: "Yes. You can play live games against other members and against the Stockfish computer on Chess Nexus completely free, with no ads.",
  },
  {
    q: "Can I play chess against the computer?",
    a: "Absolutely. Challenge the built-in Stockfish engine to practise openings, middlegames and endgames at a strength that keeps improving your play.",
  },
  {
    q: "Do I need to download anything to play?",
    a: "No downloads needed — Chess Nexus runs right in your browser. Create a free account and start playing in seconds.",
  },
];

export default function PlayChessOnlinePage() {
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
    name: "Play Chess Online — Free Live Games & vs Computer",
    description:
      "Play live chess online against people or challenge the Stockfish engine. Watch live games and review your own. Free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Play Chess Online — Free Live Games & vs Computer",
        description:
          "Play chess online for free on Chess Nexus — live games against real people or against the Stockfish engine. Watch live games and review your own. No ads, no downloads.",
        keywords:
          "play chess online, play chess vs computer, free online chess, play chess against stockfish, live chess games, online chess no ads",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "♟️",
        h1: "Play Chess Online — Free, No Ads",
        sub: "Sit down at the board whenever you like. Play live games against other members, challenge the powerful Stockfish engine, watch live games and review every move — all free in your browser.",
        primary: { label: "Play a Game", to: "/play" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <h2>Ways to play</h2>
        <p className="mkt-section-lead">
          People or engine, playing or watching — chess your way.
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

      <section className="mkt-section">
        <h2>Why play on Chess Nexus</h2>
        <p className="mkt-section-lead">
          No ads interrupting your game, no downloads, no clutter — just chess.
          Play a quick game against the engine to test an idea, take on a real
          opponent, then run the game through analysis to see exactly where it
          turned. It's the complete loop of play, learn and improve, all free.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/play/ai" className="mkt-btn mkt-btn-primary">
            Play vs computer
          </Link>
          <Link to="/play" className="mkt-btn mkt-btn-ghost">
            Find an opponent
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
