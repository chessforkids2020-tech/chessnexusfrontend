import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import FeatureLinkGrid from "../../components/marketing/FeatureLinkGrid";
import "../../components/marketing/marketing.css";
import { t as tr } from '../../i18n/LanguageContext';

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
        title={tr("Features — Free Online Chess Training & Community")}
        description={tr("Explore every Chess Nexus feature: free chess puzzles, tactics races, play online, game analysis, 3D arena tournaments, chess study and community — all free, no ads.")}
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
          <img src="/logo.png" alt={tr("Chess Nexus logo")} className="mkt-hero-logo" />
          <h1>{tr("Everything Chess Nexus Offers")}</h1>
          <p className="mkt-hero-sub">
            One free platform to learn, train and compete at chess — daily puzzles,
            tactics races, live games, deep game analysis, 3D arena tournaments,
            structured study and a friendly community. No ads, no paywalls, ever.
          </p>
          <div className="mkt-free-badge">{tr("✅ 100% Core Features · No Ads, ever")}</div>
          <div className="mkt-cta-row">
            <Link to="/chess-puzzles" className="mkt-btn mkt-btn-primary">
              {tr("Start with Chess Puzzles")}
            </Link>
            <Link to="/" className="mkt-btn mkt-btn-ghost">
              {tr("Go to home")}
            </Link>
          </div>
        </header>

        <section className="mkt-section" aria-label={tr("What you can do")}>
          <h2>{tr("What you can do on Chess Nexus")}</h2>
          <p className="mkt-section-lead">
            {tr("Six ways to grow at chess, all in one place — free, no ads.")}
          </p>
          <ul className="mkt-featurelist">
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🧩</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Train tactics")}</strong>
                <span>{tr("Daily puzzles from World Champion games, a Nexus Guide that finds your weaknesses, plus fun modes like Puzzle Tic-Tac-Toe and Bingo.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🏁</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Compete live")}</strong>
                <span>{tr("Timed puzzle races, team races, and immersive 3D arena tournaments with real-time leaderboards.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">♟️</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Play chess")}</strong>
                <span>{tr("Live games against real people or Stockfish, play with friends in private rooms, and spectate live boards.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🔍</span>
              <span className="mkt-feat-tx">
                <strong>Analyse &amp; study</strong>
                <span>{tr("Deep game review with accuracy scores and blunder detection, master games with guess-the-move, and structured study tracks.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🌐</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Belong to a community")}</strong>
                <span>{tr("Friends, clubs, live activity feeds, chat and weekly leaderboards.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🎥</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Teach live, in the app")}</strong>
                <span>{tr("A built-in classroom: HD video, screen share and one shared board. Give a student control, load studies, endgames or puzzles onto the board, and attendance marks itself. No Zoom needed.")}</span>
              </span>
            </li>
            <li>
              <span className="mkt-feat-ic" aria-hidden="true">🎓</span>
              <span className="mkt-feat-tx">
                <strong>{tr("Coach an academy")}</strong>
                <span>{tr("A full coaching toolkit — roster, batches, attendance, assignments, courses, private races and parent reports.")}</span>
              </span>
            </li>
          </ul>
        </section>

        <section className="mkt-section" aria-label={tr("All features")}>
          <h2>{tr("Explore every feature")}</h2>
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
