// src/pages/marketing/ProgressReportsPage.jsx — /chess-progress-reports
//
// SEO page for parent reports + progress tracking. Targets "chess progress
// report for parents", "track chess student progress", "chess academy reporting".
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-progress-reports";

const REPORT_CONTENTS = [
  { icon: "📈", t: "Rating over time", d: "How the child's puzzle rating has moved — the single number parents ask about most." },
  { icon: "🧩", t: "Puzzles solved", d: "Volume and accuracy, so effort is visible even when the rating is flat." },
  { icon: "📝", t: "Assignment completion", d: "What you set, what they finished, and how they scored on it." },
  { icon: "📋", t: "Attendance", d: "Present, absent and catch-up classes, so there's no argument about who missed what." },
  { icon: "♟️", t: "Recent games", d: "Games played on the platform, plus games from Lichess or Chess.com in the last 30 days — so parents see the whole picture, not just the part that happened here." },
];

const FAQ = [
  {
    q: "How do parents see their child's chess progress?",
    a: "Every student has one shareable report link. You send it to the parent and they open it — no account, no login, no app. It shows rating over time, puzzles solved, assignment completion, attendance and recent games.",
  },
  {
    q: "Do parents need a Chess Nexus account?",
    a: "No. The report is a link. That's deliberate: asking a parent to create an account to see their child's progress is the fastest way to ensure they never look at it.",
  },
  {
    q: "Does the report include games played elsewhere?",
    a: "Yes. If the student plays on Lichess or Chess.com, games from the last 30 days are counted too, so the report reflects how much chess the child is actually playing rather than only what happened on this platform.",
  },
  {
    q: "Can I track progress across my whole academy?",
    a: "Yes. The coach dashboard shows ratings, activity, streaks and assignment results across your entire roster, and you can group students into batches to compare a class at a glance.",
  },
];

export default function ProgressReportsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Progress Reports for Parents — Track Every Student",
        description:
          "One shareable progress link per student: rating over time, puzzles solved, assignment completion, attendance and recent games — including Lichess and Chess.com. Parents need no account.",
        keywords:
          "chess progress report, chess report for parents, track chess student progress, chess academy reporting, chess student dashboard, chess coach reporting tool",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "📊",
        h1: "Progress reports parents actually read",
        sub:
          "One link per student. No account, no login — rating, puzzles, assignments, attendance and recent games in a page a parent understands.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coach-guide", label: "Read the coach guide" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="What's in a report">
        <h2>What the parent sees</h2>
        <p className="mkt-section-lead">
          The question every coach gets is "is my child improving?" This answers it
          with evidence instead of reassurance.
        </p>
        <ul className="mkt-featurelist">
          {REPORT_CONTENTS.map((r) => (
            <li key={r.t}>
              <span className="mkt-feat-ic" aria-hidden="true">{r.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{r.t}</strong>
                <span>{r.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="Why a link">
        <h2>Why it's a link, not an account</h2>
        <p className="mkt-p">
          Parents don't want another login. Every extra step between them and their
          child's progress is a step where they give up — so the report is a URL you
          paste into a message. They open it and it's there.
        </p>
      </section>

      <section className="mkt-section" aria-label="For coaches">
        <h2>And for you</h2>
        <p className="mkt-p">
          The same data powers your own dashboard: ratings, activity, streaks and
          assignment results across the whole roster, grouped by batch. Attendance
          feeds in automatically from the{" "}
          <Link to="/live-chess-classroom">live classroom</Link>, and assignment
          results from whatever you set — so the report builds itself as you teach.
        </p>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Progress reports FAQ</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-cta-section" aria-label="Start">
        <h2>Send your first report free</h2>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start coaching free</Link>
          <Link to="/chess-coaching" className="mkt-btn">See the coaching platform</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
