import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-study";

const MODES = [
  {
    icon: "♟️",
    title: "Basic Study",
    body:
      "Master the fundamentals — basic tactics, opening principles, endgame patterns and essential strategies. The perfect starting track for beginners building a solid foundation.",
    appPath: "/study",
    cta: "Start Basic Study",
  },
  {
    icon: "⚡",
    title: "Positional Study",
    body:
      "Go deeper into strategy — piece activity, weak squares, pawn structures, outposts and exchanges. An advanced track for players ready to think positionally.",
    appPath: "/study",
    cta: "Start Positional Study",
  },
  {
    icon: "📖",
    title: "Chapter-by-Chapter Lessons",
    body:
      "Each study is organised into clear chapters and worked puzzles, so you progress step by step and actually retain what you learn instead of jumping around.",
    appPath: "/study/learn",
    cta: "Browse chapters",
  },
  {
    icon: "📝",
    title: "Timed Tests",
    body:
      "Check that it's sticking. Take timed tests on what you've studied, see your results and find out which ideas you've truly mastered and which need another pass.",
    appPath: "/study/test",
    cta: "Take a test",
  },
];

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
        <h2>Your study tracks</h2>
        <p className="mkt-section-lead">
          Two guided tracks plus structured chapters and tests — learn in the order
          that builds lasting skill.
        </p>
        <div className="mkt-grid">
          {MODES.map((m) => (
            <div className="mkt-card" key={m.title}>
              <div className="mkt-card-icon">{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <Link to={m.appPath} className="mkt-card-cta">
                {m.cta} →
              </Link>
            </div>
          ))}
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
