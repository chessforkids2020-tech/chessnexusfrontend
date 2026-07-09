import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-puzzles";

const FAQ = [
  {
    q: "Are the chess puzzles free?",
    a: "Yes. Every puzzle mode on Chess Nexus — daily puzzles, the Monthly Focus challenge, TTT and Bingo — is 100% free with no ads. There is nothing to pay and no premium paywall on training.",
  },
  {
    q: "What are daily chess puzzles?",
    a: "Daily chess puzzles are hand-picked tactical positions, refreshed every day, where you must find the best move. Ours come from real super-grandmaster and World Champion games, so you practise patterns that appear in genuine high-level play.",
  },
  {
    q: "How do daily puzzles help me improve at chess tactics?",
    a: "Solving tactics every day trains your brain to recognise recurring patterns — forks, pins, skewers and mating nets — faster. Consistent daily practice is one of the most proven ways to raise your chess rating.",
  },
  {
    q: "Do I need an account to solve puzzles?",
    a: "You can read about every feature freely. To track your progress, earn XP and appear on leaderboards, create a free Chess Nexus account — it only takes a moment.",
  },
];

export default function ChessPuzzlesPage() {
  // FAQPage structured data for Google rich results — mirrors the visible FAQ.
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
    name: "Free Chess Puzzles & Daily Tactics Training",
    description:
      "Solve free daily chess puzzles from super-grandmaster games, take the Monthly Focus tactics challenge, and train with TTT and Bingo on Chess Nexus.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Free Chess Puzzles & Daily Tactics Training",
        description:
          "Solve free daily chess puzzles from super-grandmaster games. Train tactics with the Monthly Focus challenge, Puzzle Tic-Tac-Toe and Bingo — 100% free, no ads.",
        keywords:
          "chess puzzles, daily chess puzzles, chess tactics training, free chess puzzles, chess tactics, grandmaster puzzles, chess puzzle of the day, learn chess tactics",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🧩",
        h1: "Free Chess Puzzles & Daily Tactics Training",
        sub: "The Chess Nexus Puzzle Hub is a free, no-ads home for sharpening your tactics — daily puzzles from super-grandmaster games, a 7-day Monthly Focus challenge, plus fun modes like Puzzle Tic-Tac-Toe and Bingo.",
        primary: { label: "Start Solving Puzzles", to: "/puzzles-hub" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split mkt-split-reverse">
          <div className="mkt-split-media">
            <img src="/features/chessonline.png" alt="Free chess puzzles and daily tactics training" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Everything inside the Puzzle Hub</h2>
            <p>
              One hub, five ways to train your chess tactics — pick the one that fits
              your mood today. All free, forever.
            </p>
            <p>
              Every day brings a fresh Daily Chess Puzzle drawn from real
              super-grandmaster and World Champion games, so you train on the
              exact tactics the masters found over the board. The Monthly
              Focus Challenge is a 7-day guided tactics program with a
              brand-new themed challenge each day, letting you earn XP,
              unlock achievements and climb the monthly leaderboard while
              building a training habit that sticks. For a change of pace,
              TTT — Puzzle Tic-Tac-Toe — has you solve a puzzle to claim a
              square and outmanoeuvre your opponent to complete a line, while
              Bingo has you spot the tactical theme behind each puzzle —
              fork, pin, skewer, discovered attack and more — to mark off
              your card. And every day also brings a fresh, bite-sized chess
              tip that rotates automatically at midnight IST.
            </p>
            <Link to="/puzzles-hub" className="mkt-card-cta">
              Solve today's puzzle →
            </Link>
          </div>
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">🗓️</div>
        <div>
          <h2>Fresh challenges all month long</h2>
          <p>
            A brand-new Monthly Focus challenge launches in the second week of every
            month, and new daily challenges run regularly throughout — alongside a
            fresh daily puzzle and a new tip each day. There's always something new
            to train on.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Why train chess tactics here</h2>
        <p className="mkt-section-lead">
          Tactics decide most games below master level. Chess Nexus makes daily
          tactics practice free, fast and genuinely fun — no ads interrupting your
          flow, no paywall blocking your improvement. Whether you want a quick
          puzzle of the day or a structured 7-day challenge, you train on real
          patterns from elite games and watch your rating climb.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/puzzles-hub" className="mkt-btn mkt-btn-primary">
            Open the Puzzle Hub
          </Link>
          <Link to="/monthly-focus" className="mkt-btn mkt-btn-ghost">
            Try the Monthly Focus
          </Link>
          <Link to="/masters-chess-games" className="mkt-btn mkt-btn-ghost">
            Study masters games
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
