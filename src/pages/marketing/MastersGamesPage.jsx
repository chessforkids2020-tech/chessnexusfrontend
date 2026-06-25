import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/masters-chess-games";

const FAQ = [
  {
    q: "Are the masters games free to play through?",
    a: "Yes. Every grandmaster game on Chess Nexus is completely free to replay, study and play along with, with no ads and no paywall. You can open any famous game and walk through it move by move without paying anything.",
  },
  {
    q: "What are masters games?",
    a: "Masters games are real games played by chess masters, grandmasters and World Champions — from historic immortal games to modern super-grandmaster encounters. Replaying these games is one of the oldest and most effective ways to learn chess, because you see strong plans, attacks and endgames in the positions they actually arose.",
  },
  {
    q: "Can I guess the moves like the master did?",
    a: "Yes. In the play-along mode you try to find the move the master chose in each position. It turns passive replaying into active training — you predict, then compare your idea with what the grandmaster actually played and why.",
  },
  {
    q: "Do I need to download anything or create an account?",
    a: "No downloads — everything runs in your browser. You can browse and read freely; create a free account to save your progress and track which games you've studied.",
  },
];

export default function MastersGamesPage() {
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
    name: "Masters Chess Games — Play Through Grandmaster Games Free",
    description:
      "Replay and play through famous masters and grandmaster chess games move by move. Guess the master's move, study immortal games, and learn from World Champions — free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Masters Chess Games — Play Through Grandmaster Games Free",
        description:
          "Play through famous masters and grandmaster chess games move by move on Chess Nexus. Guess the master's move, study immortal games and learn from World Champions — 100% free, no ads.",
        keywords:
          "masters games, masters chess games, grandmaster games, play through master games, guess the move chess, immortal chess games, famous chess games, study grandmaster games, world champion games",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "👑",
        h1: "Masters Chess Games — Free, No Ads",
        sub: "Step into the games of the greatest players in history. Replay famous grandmaster and World Champion games move by move, try to guess the master's move before it's revealed, and absorb the ideas that win at the highest level — all free in your browser.",
        primary: { label: "Browse Masters Games", to: "/master-games" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <h2>Learn the way the masters learned</h2>
        <p className="mkt-section-lead">
          For over a century, the advice given to every improving player has been
          the same: study the games of the masters. Chess Nexus makes that advice
          effortless. Instead of digging through old books, you open a famous
          grandmaster game in your browser and play through it move by move — at
          your own pace, forwards and backwards, as many times as you like. You
          watch how a great attack is built, how a champion converts a tiny
          endgame edge, and how the quiet moves between the fireworks hold
          everything together.
        </p>
        <p className="mkt-section-lead">
          Replaying strong games trains your intuition in a way that solving
          isolated puzzles can't. You start to feel where the pieces belong,
          recognise the typical plans in each opening, and borrow ideas you can
          use in your own games the very next day. And because every game on
          Chess Nexus is free with no ads, nothing stands between you and the
          next lesson.
        </p>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">🎯</div>
        <div>
          <h2>Guess the move — active study, not passive watching</h2>
          <p>
            Reading through a game is good; predicting it is far better. In the
            guess-the-move mode you pause at each turn and try to find the move
            the master actually played. When you commit, the game reveals whether
            you matched the grandmaster — turning every famous game into a
            personal test of your understanding. It's the single fastest way to
            close the gap between recognising a good move and finding it yourself.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>From immortal classics to modern super-GM battles</h2>
        <p className="mkt-section-lead">
          The collection spans the whole history of the game. Relive the romantic
          attacking masterpieces — the immortal and evergreen games where a
          player sacrifices almost everything to deliver mate. Study the deep
          positional play of the World Champions who defined modern chess. Then
          jump to the razor-sharp games of today's super-grandmasters, where
          engine-level preparation meets human creativity. Each game is a
          self-contained lesson, and you can return to your favourites whenever
          you want to revisit an idea.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/master-games/browse" className="mkt-btn mkt-btn-primary">
            Browse the game library
          </Link>
          <Link to="/master-games/players" className="mkt-btn mkt-btn-ghost">
            Explore by player
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
