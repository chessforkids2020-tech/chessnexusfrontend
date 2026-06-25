import { Link } from "react-router-dom";

/**
 * Single source of truth for the public SEO feature pages.
 * Every feature page links to all the others (minus itself) via this grid,
 * which drives internal linking / crawl-depth for Google ranking.
 *
 * `slug`    -> the public marketing URL (keyword-rich, login-free)
 * `appPath` -> the real in-app route the page's CTA deep-links into
 */
export const FEATURES = [
  {
    slug: "/chess-puzzles",
    appPath: "/puzzles-hub",
    icon: "🧩",
    title: "Chess Puzzles",
    blurb:
      "Daily puzzles from super-grandmaster games, the Monthly Focus challenge, TTT and Bingo. A free, fun way to train tactics.",
  },
  {
    slug: "/chess-tactics-race",
    appPath: "/arena-race",
    icon: "🏁",
    title: "Puzzle Race",
    blurb:
      "Solve as many tactics as you can against the clock. Timed puzzle races by theme, with live leaderboards.",
  },
  {
    slug: "/play-chess-online",
    appPath: "/games",
    icon: "♟️",
    title: "Play Chess Online",
    blurb:
      "Play live games against other members or challenge the Stockfish engine — all free, no ads.",
  },
  {
    slug: "/play-chess-with-friends",
    appPath: "/friend/new",
    icon: "🤝",
    title: "Play With Friends",
    blurb:
      "Create a private room, share a link and play 2-player chess with a friend in real time — free, no ads.",
  },
  {
    slug: "/masters-chess-games",
    appPath: "/master-games",
    icon: "👑",
    title: "Masters Games",
    blurb:
      "Play through famous grandmaster and World Champion games move by move, and guess the master's move — free.",
  },
  {
    slug: "/analyse-my-chess-game",
    appPath: "/game-analysis",
    icon: "🔬",
    title: "Analyse My Game",
    blurb:
      "Get a move-by-move review with a CAPS accuracy score, blunder detection, piece heatmaps and session badges.",
  },
  {
    slug: "/3d-chess-arena-tournament",
    appPath: "/3d-chess-arena-tournament",
    icon: "🏟️",
    title: "3D Chess Arena",
    blurb:
      "Enter an immersive 3D world as an avatar — play real-time tournaments at the table and solve tactics in a 5-stage Puzzle Hall with live leaderboards and chat.",
  },
  {
    slug: "/chess-study",
    appPath: "/study",
    icon: "📚",
    title: "Chess Study",
    blurb:
      "Structured lessons and tests — basic tactics, openings, endgames and positional play — chapter by chapter.",
  },
  {
    slug: "/chess-community",
    appPath: "/social",
    icon: "🤝",
    title: "Chess Community",
    blurb:
      "Follow friends, join clubs, see live activity feeds and weekly leaderboards in the Chess Nexus social hub.",
  },
];

/**
 * Renders the cross-link card grid.
 * @param {string} [exclude] - slug to omit (the current page).
 * @param {string} [linkTo]  - "slug" (default, links to the marketing page)
 *                             or "app" (links straight into the live app).
 */
export default function FeatureLinkGrid({ exclude, linkTo = "slug" }) {
  const items = FEATURES.filter((f) => f.slug !== exclude);

  return (
    <div className="mkt-grid">
      {items.map((f) => (
        <Link
          key={f.slug}
          to={linkTo === "app" ? f.appPath : f.slug}
          className="mkt-card"
        >
          <div className="mkt-card-icon">{f.icon}</div>
          <h3>{f.title}</h3>
          <p>{f.blurb}</p>
          <span className="mkt-card-cta">Learn more →</span>
        </Link>
      ))}
    </div>
  );
}
