import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/analyse-my-chess-game";

const FAQ = [
  {
    q: "How can I analyse my chess game for free?",
    a: "Open the analysis tool on Chess Nexus, load your game and get an instant move-by-move review — accuracy score, blunder detection, piece heatmap and more — completely free, with no ads.",
  },
  {
    q: "What is a CAPS / accuracy score?",
    a: "It's a single number that summarises how accurately you played a game, based on your average centipawn loss per move. A higher accuracy and lower loss means cleaner, more precise play.",
  },
  {
    q: "Will analysis tell me where I went wrong?",
    a: "Yes. The review flags every blunder, mistake and inaccuracy, shows the stronger move, highlights which pieces let you down and reveals whether time pressure hurt your accuracy.",
  },
];

export default function AnalyseMyChessGamePage() {
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
    name: "Analyse My Chess Game — Free Game Review",
    description:
      "Get a free move-by-move chess game review with an accuracy score, blunder detection, piece heatmaps and time-pressure analysis.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Analyse My Chess Game — Free Game Review",
        description:
          "Analyse your chess games free on Chess Nexus. Get a CAPS accuracy score, blunder detection, piece heatmaps, time-pressure analysis and session badges — no ads.",
        keywords:
          "analyse my chess game, chess game review, chess game analysis, chess blunder check, chess accuracy score, free chess analysis, review my chess game",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🔬",
        h1: "Analyse My Chess Game",
        sub: "Turn every game into a lesson. Get an instant, move-by-move review with an accuracy score, blunder detection, a piece heatmap, time-pressure insights and badges — free, no ads.",
        primary: { label: "Analyse a Game", to: "/game-analysis" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split mkt-split-reverse">
          <div className="mkt-split-media">
            <img src="/features/analysis.png" alt="Analyse My Chess Game — free game review" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>What your game review shows</h2>
            <p>
              Five clear views of your play, so you know exactly what to work on next.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🎯</span>
                <span className="mkt-feat-tx">
                  <strong>CAPS accuracy score</strong>
                  <span>Measures your average centipawn loss per move and grades the game with clear, colour-coded bands.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🚨</span>
                <span className="mkt-feat-tx">
                  <strong>Blunder detection</strong>
                  <span>Every blunder, mistake and inaccuracy flagged move by move — with the better move shown — so you stop repeating them.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🔥</span>
                <span className="mkt-feat-tx">
                  <strong>Piece heatmap</strong>
                  <span>Reveals which pieces — pawn, knight, bishop, rook or queen — cost you the most points.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">⏱️</span>
                <span className="mkt-feat-tx">
                  <strong>Time-pressure breakdown</strong>
                  <span>Compares your accuracy at normal speed versus when the clock is low — so you know if you fall apart under pressure.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🏅</span>
                <span className="mkt-feat-tx">
                  <strong>Session badges</strong>
                  <span>Earn Blunder Buster, Endgame Apprentice, Opening Scholar, Precision Master and more — progress tracking that's genuinely fun.</span>
                </span>
              </li>
            </ul>
            <Link to="/game-analysis" className="mkt-card-cta">
              Score a game →
            </Link>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Why review your games</h2>
        <p className="mkt-section-lead">
          The fastest way to improve is to learn from your own games. Instead of
          guessing where things went wrong, Chess Nexus pinpoints your blunders,
          shows the better moves, reveals which pieces and which moments cost you,
          and tracks your accuracy over time — all free and ad-free.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/game-analysis" className="mkt-btn mkt-btn-primary">
            Review a game now
          </Link>
          <Link to="/play" className="mkt-btn mkt-btn-ghost">
            Play a game first
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
