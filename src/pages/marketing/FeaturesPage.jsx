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
