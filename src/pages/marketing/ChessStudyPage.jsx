import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-study";

const FAQ = [
  {
    q: "Can I learn chess for free here?",
    a: "Yes. Chess Nexus study covers tactics, openings, endgames and positional play in structured lessons — all completely free with no ads.",
  },
  {
    q: "Is the study suitable for beginners?",
    a: "Definitely. The Basic Study track is built for beginners, covering fundamentals from the ground up, while the Positional track challenges more advanced players.",
  },
  {
    q: "How is chess study organised?",
    a: "Studies are split into chapters and worked puzzles you complete in sequence, followed by timed tests so you can confirm what you've learned before moving on.",
  },
];

export default function ChessStudyPage() {
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
    name: "Chess Study — Free Structured Chess Lessons",
    description:
      "Learn chess with structured study tracks covering tactics, openings, endgames and positional play, with chapters and timed tests. Free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Chess Study — Free Structured Chess Lessons",
        description:
          "Learn chess the structured way on Chess Nexus. Study tactics, openings, endgames and positional play through chapters and timed tests — free for beginners to advanced, no ads.",
        keywords:
          "chess study, learn chess, chess lessons, chess for beginners, chess openings, chess endgames, positional chess, chess training, free chess lessons",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "📚",
        h1: "Chess Study — Learn the Right Way",
        sub: "Build real chess understanding with structured study. Work through tactics, openings, endgames and positional play chapter by chapter, then prove it with timed tests — from beginner to advanced, all free and ad-free.",
        primary: { label: "Start Studying", to: "/study" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split">
          <div className="mkt-split-media">
            <img src="/features/study.png" alt="Chess Study — free structured chess lessons" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Your study tracks</h2>
            <p>
              Two guided tracks plus structured chapters and tests — learn in the order
              that builds lasting skill.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🌱</span>
                <span className="mkt-feat-tx">
                  <strong>Basic Study track</strong>
                  <span>The fundamentals — basic tactics, opening principles, endgame patterns and essential strategy. The perfect starting point for beginners.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🧠</span>
                <span className="mkt-feat-tx">
                  <strong>Positional Study track</strong>
                  <span>Goes deeper into strategy — piece activity, weak squares, pawn structures, outposts and exchanges — for players ready to think positionally.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">📖</span>
                <span className="mkt-feat-tx">
                  <strong>Chapters &amp; worked puzzles</strong>
                  <span>Every study is organised into clear chapters and worked puzzles, so you progress step by step and actually retain what you learn.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">✅</span>
                <span className="mkt-feat-tx">
                  <strong>Timed tests</strong>
                  <span>Check that it's sticking — see which ideas you've truly mastered and which need another pass.</span>
                </span>
              </li>
            </ul>
            <Link to="/study" className="mkt-card-cta">
              Start Basic Study →
            </Link>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Why study with Chess Nexus</h2>
        <p className="mkt-section-lead">
          Random puzzles build speed, but structured study builds understanding.
          By learning concepts in a deliberate order — and testing yourself along
          the way — you turn scattered knowledge into real chess strength. It's a
          complete, beginner-friendly curriculum, free with no ads.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/study" className="mkt-btn mkt-btn-primary">
            Open Chess Study
          </Link>
          <Link to="/chess-puzzles" className="mkt-btn mkt-btn-ghost">
            Practise with puzzles
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
