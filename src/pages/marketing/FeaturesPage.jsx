import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import FeatureLinkGrid from "../../components/marketing/FeatureLinkGrid";
import "../../components/marketing/marketing.css";

const CANONICAL = "/features";

export default function FeaturesPage() {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Chess Nexus Features",
    description:
      "Explore everything Chess Nexus offers — free chess puzzles, tactics races, online games, game analysis, 3D arena tournaments, structured study and a chess community. Free, with no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <div className="mkt-page">
      <SEO
        title="Features — Free Online Chess Training & Community"
        description="Explore every Chess Nexus feature: free chess puzzles, tactics races, play online, game analysis, 3D arena tournaments, chess study and community — all free, no ads."
        keywords="chess training features, free online chess, chess puzzles, chess tactics, play chess online, chess analysis, chess tournament, chess study, chess community"
        canonical={CANONICAL}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(collectionSchema)}
        </script>
      </Helmet>

      <div className="mkt-inner">
        <header className="mkt-hero">
          <img src="/logo.png" alt="Chess Nexus logo" className="mkt-hero-logo" />
          <h1>Everything Chess Nexus Offers</h1>
          <p className="mkt-hero-sub">
            One free platform to learn, train and compete at chess — daily puzzles,
            tactics races, live games, deep game analysis, 3D arena tournaments,
            structured study and a friendly community. No ads, no paywalls, ever.
          </p>
          <div className="mkt-free-badge">✅ 100% Core Features · No Ads, ever</div>
          <div className="mkt-cta-row">
            <Link to="/chess-puzzles" className="mkt-btn mkt-btn-primary">
              Start with Chess Puzzles
            </Link>
            <Link to="/" className="mkt-btn mkt-btn-ghost">
              Go to home
            </Link>
          </div>
        </header>

        <section className="mkt-section" aria-label="What you can do">
          <h2>What you can do on Chess Nexus</h2>
          <p className="mkt-section-lead">
            Six ways to grow at chess, all in one place — free, no ads.
          </p>
          <ul className="mkt-featurelist">
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🧩</span>
              <span className="mkt-feat-tx">
                <strong>Train tactics</strong>
                <span>Daily puzzles from World Champion games, a Nexus Guide that finds your weaknesses, plus fun modes like Puzzle Tic-Tac-Toe and Bingo.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🏁</span>
              <span className="mkt-feat-tx">
                <strong>Compete live</strong>
                <span>Timed puzzle races, team races, and immersive 3D arena tournaments with real-time leaderboards.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">♟️</span>
              <span className="mkt-feat-tx">
                <strong>Play chess</strong>
                <span>Live games against real people or Stockfish, play with friends in private rooms, and spectate live boards.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🔍</span>
              <span className="mkt-feat-tx">
                <strong>Analyse &amp; study</strong>
                <span>Deep game review with accuracy scores and blunder detection, master games with guess-the-move, and structured study tracks.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🌐</span>
              <span className="mkt-feat-tx">
                <strong>Belong to a community</strong>
                <span>Friends, clubs, live activity feeds, chat and weekly leaderboards.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🎥</span>
              <span className="mkt-feat-tx">
                <strong>Teach live, in the app</strong>
                <span>A built-in classroom: HD video, screen share and one shared board. Give a student control, load studies, endgames or puzzles onto the board, and attendance marks itself. No Zoom needed.</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🎓</span>
              <span className="mkt-feat-tx">
                <strong>Coach an academy</strong>
                <span>A full coaching toolkit — roster, batches, attendance, assignments, courses, private races and parent reports.</span>
              </span>
            </li>
          </ul>
        </section>

        <section className="mkt-section" aria-label="All features">
          <h2>Explore every feature</h2>
          <p className="mkt-section-lead">
            Pick a feature to learn exactly how it works — then jump straight into
            the app and play.
          </p>
          <FeatureLinkGrid />
        </section>
      </div>
    </div>
  );
}
