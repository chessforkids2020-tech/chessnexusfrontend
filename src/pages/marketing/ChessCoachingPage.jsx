import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-coaching";

const FAQ = [
  {
    q: "Is Chess Nexus free for chess coaches?",
    a: "Yes — coaching on Chess Nexus is free forever for up to 30 students, no card required and no time limit. Beyond 30 students, or for premium tools like the endgame trainer and repertoire builder, a paid plan unlocks unlimited students and extra perks.",
  },
  {
    q: "What can a chess coach do on Chess Nexus?",
    a: "Manage a student roster grouped into batches, set a weekly class schedule, assign tactics (Find-the-Blunder or Play-vs-Stockfish) to individuals or whole groups, build a course syllabus from your own studies, run private class-only arena races and tournaments, chat directly with students, and send parents shareable progress reports — all from one dashboard.",
  },
  {
    q: "Can I run private puzzle races just for my students?",
    a: "Yes. Coach-created arena races and tournaments are private by default — only your own accepted students can join. They never appear on the public Arena page, so there's no risk of outside players joining your class session.",
  },
  {
    q: "How do I create a chess assignment without typing a FEN?",
    a: "The Play-vs-Stockfish assignment builder includes a visual board editor — drag pieces onto the board, set side to move, castling rights and en passant, and it builds the FEN for you. No manual FEN notation needed.",
  },
  {
    q: "Can I track my students' progress over time?",
    a: "Yes. Every assignment records solve rate and accuracy per student, and the dashboard tracks activity, ratings and streaks across your whole roster — plus shareable reports parents can see directly.",
  },
];

export default function ChessCoachingPage() {
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
    name: "Chess Coaching Platform — Run Your Academy on Chess Nexus",
    description:
      "A free coaching toolkit for chess coaches and academies: student roster & batches, assignments, course builder, private class races, coach-student chat and parent reports.",
    url: `https://www.chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Chess Coaching Platform — Run Your Academy on Chess Nexus",
        description:
          "Free chess coaching platform for coaches & academies: manage a student roster in batches, assign puzzles & Play-vs-Stockfish positions, build courses, run private class races, chat with students and send parents progress reports. Free forever up to 30 students.",
        keywords:
          "chess coaching platform, online chess academy software, chess coach dashboard, manage chess students, chess coaching tools, chess academy management, chess coach app, teach chess online, chess coaching for kids, chess coach assignments",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🎓",
        h1: "Chess Coaching Platform — Run Your Academy in One Place",
        sub: "Chess Nexus gives chess coaches and academies a complete free toolkit: a student roster organised into batches, assignments you can build in seconds, a course builder, private class-only races, direct student chat, and progress reports parents actually understand.",
        primary: { label: "Start coaching free", to: "/coach/onboarding" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split">
          <div className="mkt-split-media">
            <img src="/features/chesscoaching.png" alt="Chess Coaching Platform — run your academy on Chess Nexus" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Everything you need to run a coaching practice</h2>
            <p>
              From your first student to a full academy — one dashboard covers
              rosters, lessons, live class activities and parent communication.
            </p>
            <p>
              One dashboard shows ratings, activity and attendance for every
              student — group them into batches by level, age or class, set
              a weekly class schedule with day, time and Zoom link per
              batch, and see who's online right now. Push tactics
              assignments in seconds: Find-the-Blunder puzzles from real
              games, or Play-vs-Stockfish positions set up on a visual board
              editor with no FEN typing required, reusing saved templates or
              pulling from the admin blunder library, with solve rate and
              accuracy tracked per student. Build a structured syllabus with
              the Course Builder from your own studies — chapters of
              lessons, videos, master games and endgame positions — that
              students follow per batch from a dedicated "My Syllabus" tab.
              Run Arena Races and Tournaments that only your own students
              can join, chat directly with students in a dedicated
              coach-student chat separate from the general community, and
              send parents shareable progress reports covering puzzle
              accuracy, games played, blunder trends and monthly focus.
            </p>
            <Link to="/coach/onboarding" className="mkt-card-cta">
              Set up your roster →
            </Link>
          </div>
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">🔒</div>
        <div>
          <h2>Your class stays your class</h2>
          <p>
            Every private race, tournament and assignment a coach creates is
            strictly limited to that coach's own accepted students — never open
            to the public, never visible on the general Arena page. Students only
            see your activities in their dedicated "My Coach" area.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Free forever — no catch</h2>
        <p className="mkt-section-lead">
          Coach on Chess Nexus for free, permanently, for up to 30 students — no
          card required and no trial countdown. Running a bigger academy or
          want premium tools like the endgame trainer and repertoire builder
          included free for your students? A paid coach plan unlocks unlimited
          students and extra perks like more saved templates and admin blunder
          libraries.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">
            Start coaching free
          </Link>
          <Link to="/improve-at-chess" className="mkt-btn mkt-btn-ghost">
            See student-side training
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
