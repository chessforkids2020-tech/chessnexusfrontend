import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/play-chess-with-friends";

const FAQ = [
  {
    q: "How do I play chess with a friend online?",
    a: "On Chess Nexus, start a friend game to create a private room, then share the link with your friend. When they open it, the board is ready and you play in real time — free, with no ads and no downloads.",
  },
  {
    q: "Can two players play chess on the same device?",
    a: "Yes. Chess Nexus supports 2-player chess, so you and a friend can play on one screen, passing the device between moves, or play remotely from two devices using a shared room link.",
  },
  {
    q: "Is playing chess with friends free?",
    a: "Completely free. There's no cost to create a private game, no ads interrupting your match, and no limit on how many games you and your friends can play.",
  },
  {
    q: "Do my friends need an account to play?",
    a: "Playing a friend game is guest-friendly — your opponent can join straight from the shared link. Creating a free account lets you save games, track results and add people to your friends list.",
  },
];

export default function PlayWithFriendsPage() {
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
    name: "Play Chess With Friends — Free 2-Player Online Chess",
    description:
      "Play chess with friends online for free on Chess Nexus. Create a private room, share a link, and play 2-player chess in your browser — no ads, no downloads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Play Chess With Friends — Free 2-Player Online Chess",
        description:
          "Play chess with friends online for free on Chess Nexus. Create a private room, share a link and play 2-player chess in your browser — no ads, no downloads, no sign-up needed to join.",
        keywords:
          "play chess with friends, chess 2 player, online chess with friends, 2 player chess online, private chess game, play chess with a friend, chess game online with friends, free online chess",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🤝",
        h1: "Play Chess With Friends — Free, No Ads",
        sub: "Challenge a friend to a game in seconds. Create a private room, share the link, and play 2-player chess online in real time — or pass one device back and forth. No ads, no downloads, no fuss.",
        primary: { label: "Start a Friend Game", to: "/friend/new" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <h2>A private board for you and a friend</h2>
        <p className="mkt-section-lead">
          Sometimes you don't want a stranger from the matchmaking pool — you want
          to beat your friend, your sibling, or your study partner. Chess Nexus
          makes that effortless. Start a friend game and you get a private room
          with its own link. Send that link by chat, message or however you like;
          the moment your friend opens it, the board is set and the clocks are
          ready. No lobbies to search, no accounts required just to join — only
          two players and a game of chess.
        </p>
        <p className="mkt-section-lead">
          Because the room is private, it's perfect for a friendly rivalry, a
          remote game with someone across the world, or coaching a beginner
          through their first real game. And it's all free, with no ads breaking
          the rhythm of your match.
        </p>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">📱</div>
        <div>
          <h2>2-player chess, on one device or two</h2>
          <p>
            Want a quick game side by side? Play 2-player chess on a single
            screen and pass the device between moves — great for a coffee-table
            game or teaching someone the rules. Prefer to play remotely? Share the
            room link and each of you plays from your own phone or laptop. Either
            way it's the same clean board, the same real-time play, and the same
            zero cost.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>More ways to play once you're hooked</h2>
        <p className="mkt-section-lead">
          A friendly game is just the start. When you want a fresh challenge, jump
          into live games against other members from around the world, test
          yourself against the powerful Stockfish engine, or enter a real-time
          arena tournament. Then run any of your games through free analysis to
          see exactly where it turned. Play, learn and improve — all in one place,
          all free.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/friend/new" className="mkt-btn mkt-btn-primary">
            Create a private game
          </Link>
          <Link to="/play-chess-online" className="mkt-btn mkt-btn-ghost">
            Play chess online
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
