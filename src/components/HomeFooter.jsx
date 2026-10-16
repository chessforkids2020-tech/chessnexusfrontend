import React from "react";
import { Link } from "react-router-dom";
import "./HomeFooter.css";
import { t as tr } from '../i18n/LanguageContext';

// components/HomeFooter.jsx
//
// The big marketing footer, rendered ONLY on the homepage ("/"). Every other
// page keeps the compact <Footer />, which is deliberately small because it sits
// under the app itself.
//
// Why a separate component rather than a prop on Footer: the two have different
// jobs. The compact footer is chrome under a working page — it should take as
// little attention as possible. This one is the last section of a landing page:
// it restates what the product is, gives a route into every part of the site,
// and ends on a call to action.
//
// SEO note: the column links are the site's PRERENDERED pages (see
// frontend/prerender.js). The homepage is the most-crawled URL on the domain,
// so linking those pages from here is what passes authority to them — a footer
// full of in-app routes (/dashboard, /puzzles-hub) would do nothing for search,
// since those are behind auth and are not prerendered.
//
// The stylesheet lives in HomeFooter.css rather than an inline <style>. The
// compact Footer inlines ~4.8k chars of CSS and has to strip it during prerender
// because crawlers count style text as page text; keeping this one in a real
// stylesheet avoids that problem entirely.
export default function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="home-footer" aria-labelledby="home-footer-heading">
      <h2 id="home-footer-heading" className="hf-sr-only">
        {tr("Chess Nexus — site navigation")}
      </h2>

      <div className="hf-inner">
        {/* ── Brand + call to action ── */}
        <div className="hf-brand">
          <div className="hf-brand-top">
            <img src="/logo.png" alt="" className="hf-logo" width="40" height="40" />
            <span className="hf-wordmark">{tr("CHESS NEXUS")}</span>
          </div>

          <p className="hf-tagline">
            A coach-led chess academy for kids and beginners — puzzles, races,
            live classes and progress reports, run by real coaches.
          </p>

          <div className="hf-cta-row">
            <Link to="/signup-request" className="hf-cta">{tr("Start free")}</Link>
            <Link to="/chess-coaching" className="hf-cta hf-cta-ghost">{tr("For coaches")}</Link>
          </div>

          <div className="hf-social" aria-label={tr("Chess Nexus on social media")}>
            <a
              href="https://www.instagram.com/chessnexus.in_official/"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={tr("Chess Nexus on Instagram")}
              title={tr("Instagram")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100064068341481"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={tr("Chess Nexus on Facebook")}
              title={tr("Facebook")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Link columns ──
            <nav> per column so a screen reader announces each group's purpose
            instead of reading one undifferentiated list of twenty links. */}
        <nav className="hf-col" aria-label={tr("Training")}>
          <h3 className="hf-col-head">{tr("Training")}</h3>
          <Link to="/chess-puzzles">{tr("Chess puzzles")}</Link>
          <Link to="/chess-tactics-race">{tr("Tactics races")}</Link>
          <Link to="/chess-study">{tr("Study")}</Link>
          <Link to="/chess-endgame-training">{tr("Endgames")}</Link>
          <Link to="/chess-opening-repertoire">{tr("Openings")}</Link>
          <Link to="/analyse-my-chess-game">{tr("Analyse a game")}</Link>
        </nav>

        <nav className="hf-col" aria-label={tr("Play")}>
          <h3 className="hf-col-head">{tr("Play")}</h3>
          <Link to="/play-chess-online">{tr("Play online")}</Link>
          <Link to="/play-chess-with-friends">{tr("Play friends")}</Link>
          <Link to="/3d-chess-arena-tournament">{tr("3D arena")}</Link>
          <Link to="/masters-chess-games">{tr("Master games")}</Link>
          <Link to="/chess-practice-streak">{tr("Daily streak")}</Link>
          <Link to="/improve-at-chess">{tr("Improve at chess")}</Link>
        </nav>

        <nav className="hf-col" aria-label={tr("For coaches")}>
          <h3 className="hf-col-head">{tr("For coaches")}</h3>
          <Link to="/chess-coaching">{tr("Coaching platform")}</Link>
          <Link to="/live-chess-classroom">{tr("Live classroom")}</Link>
          <Link to="/chess-courses">{tr("Courses")}</Link>
          <Link to="/chess-progress-reports">{tr("Progress reports")}</Link>
          <Link to="/chess-coach-pricing">{tr("Pricing")}</Link>
          <Link to="/chess-coach-guide">{tr("Coach guide")}</Link>
        </nav>

        <nav className="hf-col" aria-label={tr("Chess Nexus")}>
          <h3 className="hf-col-head">{tr("Chess Nexus")}</h3>
          <Link to="/features">{tr("Features")}</Link>
          <Link to="/coaches">{tr("Find a coach")}</Link>
          <Link to="/chess-community">{tr("Community")}</Link>
          <Link to="/members">{tr("Members")}</Link>
          <Link to="/nexus-supporter">{tr("Supporters")}</Link>
          <Link to="/careers">{tr("Careers")}</Link>
          <Link to="/contact">{tr("Contact us")}</Link>
        </nav>
      </div>

      {/* ── Legal strip ── */}
      <div className="hf-bottom">
        <p className="hf-copy">© {year} {tr("Chess Nexus")}</p>
        <nav className="hf-legal" aria-label={tr("Legal")}>
          <Link to="/privacy-policy">{tr("Privacy")}</Link>
          <Link to="/terms">{tr("Terms")}</Link>
          <Link to="/refund-policy">{tr("Refund")}</Link>
          <Link to="/contest-rules">{tr("Contest rules")}</Link>
          <Link to="/report">{tr("Report a problem")}</Link>
        </nav>
        <p className="hf-made">{tr("Made in India 🇮🇳")}</p>
      </div>
    </footer>
  );
}
