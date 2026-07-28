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
        secondary: { label: "Read the full coach guide", to: "/chess-coach-guide" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split">
          <div className="mkt-split-media">
            <img src="/features/coaching.png" alt="Chess Coaching Platform — run your academy on Chess Nexus" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Everything you need to run a coaching practice</h2>
            <p>
              From your first student to a full academy — one dashboard covers
              rosters, lessons, live activities and parent communication.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🎥</span>
                <span className="mkt-feat-tx">
                  <strong>Built-in live classroom</strong>
                  <span>
                    Teach inside Chess Nexus — HD video, screen share and one board every
                    student sees. Hand a student control to play their move, load studies,
                    endgames, puzzles or master games straight onto the board, and run a
                    waiting room with raise-hand, mic and camera controls. Attendance marks
                    itself as students join. No Zoom, no extra apps.
                  </span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">👥</span>
                <span className="mkt-feat-tx">
                  <strong>Student roster &amp; batches</strong>
                  <span>See ratings, activity and attendance for every student. Group them into batches by level, age or class, and see who's online right now.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">📅</span>
                <span className="mkt-feat-tx">
                  <strong>Class schedule &amp; attendance</strong>
                  <span>Set a weekly schedule with day, time and Zoom link per batch, and mark attendance with catch-ups and CSV export.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">📝</span>
                <span className="mkt-feat-tx">
                  <strong>Assign tactics in seconds</strong>
                  <span>Push Find-the-Blunder puzzles from real games or Play-vs-Stockfish positions — built on a visual board editor, no FEN typing. Solve rate &amp; accuracy tracked per student.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">📚</span>
                <span className="mkt-feat-tx">
                  <strong>Course Builder syllabus</strong>
                  <span>Build a structured syllabus from your own studies — lessons, videos, master games and endgame positions — that students follow per batch in a "My Syllabus" tab.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🏁</span>
                <span className="mkt-feat-tx">
                  <strong>Private races &amp; tournaments</strong>
                  <span>Run Arena Races and Tournaments that only your own students can join — no outsiders.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">💬</span>
                <span className="mkt-feat-tx">
                  <strong>Coach ↔ student chat &amp; parent reports</strong>
                  <span>Chat with students in a dedicated space, and send parents shareable progress reports covering puzzle accuracy, games played, blunder trends and monthly focus.</span>
                </span>
              </li>
            </ul>
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
          <Link to="/chess-coach-pricing" className="mkt-btn mkt-btn-ghost">
            See coach pricing
          </Link>
          <Link to="/improve-at-chess" className="mkt-btn mkt-btn-ghost">
            See student-side training
          </Link>
        </div>
      </section>

      {/* This page speaks to a SOLO coach. Academies are a separate product, so
          point them there explicitly rather than leaving "academy" ambiguous. */}
      <section className="mkt-section" aria-label="Academies">
        <div className="mkt-callout">
          <div className="mkt-callout-icon" aria-hidden="true">🏫</div>
          <div>
            <h2>Running an academy with several coaches?</h2>
            <p>
              Everything above is for one coach and their own students. If you have a team of
              coaches, an academy plan covers <strong>5, 10 or 25 coaches</strong> on a single
              bill — up to <strong>3,750 students</strong> — with one dashboard over every
              coach, student and class, and bulk discounts of up to 20%. You still coach your
              own students as head of the academy.{" "}
              <Link to="/chess-academy-software">See how academies work</Link> or{" "}
              <Link to="/chess-academy-pricing">compare academy pricing</Link>.
            </p>
          </div>
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
