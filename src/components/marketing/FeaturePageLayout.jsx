import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../SEO";
import FeatureLinkGrid from "./FeatureLinkGrid";
import "./marketing.css";

/**
 * Shared shell for the public SEO feature/about pages.
 *
 * Props:
 *  - seo:   { title, description, keywords, canonical }  -> passed to <SEO/>
 *  - hero:  { icon, h1, sub, primary:{label,to}, secondary?:{label,to} }
 *  - jsonLd: object | object[]  -> JSON-LD structured data injected via Helmet
 *  - excludeSlug: string        -> current page's slug, omitted from "Explore more"
 *  - children: the page body (sections)
 */
export default function FeaturePageLayout({
  seo = {},
  hero = {},
  jsonLd,
  excludeSlug,
  children,
}) {
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <div className="mkt-page">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={seo.canonical}
      />
      {schemas.length > 0 && (
        <Helmet>
          {schemas.map((schema, i) => (
            <script key={i} type="application/ld+json">
              {JSON.stringify(schema)}
            </script>
          ))}
        </Helmet>
      )}

      <div className="mkt-inner">
        <header className="mkt-hero">
          {hero.icon && <div className="mkt-hero-icon">{hero.icon}</div>}
          <h1>{hero.h1}</h1>
          {hero.sub && <p className="mkt-hero-sub">{hero.sub}</p>}
          <div className="mkt-free-badge">✅ 100% Free · No Ads, ever</div>

          {(hero.primary || hero.secondary) && (
            <div className="mkt-cta-row">
              {hero.primary &&
                (hero.primary.onClick ? (
                  <button
                    type="button"
                    onClick={hero.primary.onClick}
                    className="mkt-btn mkt-btn-primary"
                  >
                    {hero.primary.label}
                  </button>
                ) : (
                  <Link to={hero.primary.to} className="mkt-btn mkt-btn-primary">
                    {hero.primary.label}
                  </Link>
                ))}
              {hero.secondary &&
                (hero.secondary.onClick ? (
                  <button
                    type="button"
                    onClick={hero.secondary.onClick}
                    className="mkt-btn mkt-btn-ghost"
                  >
                    {hero.secondary.label}
                  </button>
                ) : (
                  <Link to={hero.secondary.to} className="mkt-btn mkt-btn-ghost">
                    {hero.secondary.label}
                  </Link>
                ))}
            </div>
          )}
        </header>

        {children}

        <section className="mkt-explore" aria-label="Explore more features">
          <h2>Explore more of Chess Nexus</h2>
          <p className="mkt-section-lead">
            Every feature is free with no ads. Pick where you want to grow next.
          </p>
          <FeatureLinkGrid exclude={excludeSlug} />
        </section>
      </div>
    </div>
  );
}
