// src/pages/marketing/ChessCoursesPage.jsx — /chess-courses
//
// SEO page for the coach course builder. Targets "chess course builder",
// "create a chess curriculum", "chess syllabus for students".
//
// Lesson kinds mirror Course.lessons.kind enum (5). Keep in step.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-courses";

const LESSON_KINDS = [
  { icon: "📖", t: "Your own studies", d: "Any study you've authored — the whole study, or a single chapter of it." },
  { icon: "🏛️", t: "Built-in Nexus studies", d: "Studies that ship with the platform, so you don't have to write every lesson from scratch." },
  { icon: "🎬", t: "Video", d: "Drop a video lesson in between the board work." },
  { icon: "♛", t: "Master games", d: "Teach from the master game collection — annotated games searchable by player or opening." },
  { icon: "♔", t: "Endgames", d: "Endgame positions, including premium picks for coaches on a paid plan." },
];

const FAQ = [
  {
    q: "What is a chess course on Chess Nexus?",
    a: "An ordered syllabus you build for your students. You add lessons in the order you teach them, enrol a batch, and students work through it in sequence with their progress tracked lesson by lesson.",
  },
  {
    q: "What can a chess course lesson be?",
    a: "Five kinds: one of your own studies (or a single chapter), a built-in Nexus study, a video, a master game, or an endgame position. A single course can mix all five.",
  },
  {
    q: "Do I have to write every lesson myself?",
    a: "No. Alongside your own studies you can use built-in Nexus studies, the master game collection and endgame positions — so a new coach can assemble a real curriculum without authoring everything first.",
  },
  {
    q: "How many courses can a free coach create?",
    a: "Free coaches can create up to 30 courses with 3 lessons each. Coaches on a paid plan get unlimited courses and unlimited lessons per course.",
  },
  {
    q: "How do students get access to a course?",
    a: "You enrol a batch. Every student in that batch sees the course in their My Syllabus tab and works through it in order — including any private studies of yours the course uses.",
  },
];

export default function ChessCoursesPage() {
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
        title: "Chess Course Builder — Build a Syllabus for Your Students",
        description:
          "Build an ordered chess curriculum from your own studies, built-in Nexus studies, videos, master games and endgames. Enrol a batch and track every student's progress through the syllabus.",
        keywords:
          "chess course builder, chess curriculum, chess syllabus for students, create chess course online, chess lesson planning, chess academy courses",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "📚",
        h1: "Build a chess course your students work through",
        sub:
          "An ordered syllabus — your studies, built-in studies, videos, master games and endgames — enrolled to a whole batch with progress tracked per student.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coach-guide", label: "Read the coach guide" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="Lesson types">
        <h2>Five kinds of lesson, one course</h2>
        <p className="mkt-section-lead">
          A course is an ordered list of lessons. Mix any of these in whatever
          sequence you teach them.
        </p>
        <ul className="mkt-featurelist">
          {LESSON_KINDS.map((k) => (
            <li key={k.t}>
              <span className="mkt-feat-ic" aria-hidden="true">{k.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{k.t}</strong>
                <span>{k.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="How it works">
        <h2>You don't have to author everything</h2>
        <p className="mkt-p">
          The hardest part of starting an academy is having material ready. Chess
          Nexus ships with built-in studies, a master game collection and an endgame
          library — so a new coach can assemble a genuine curriculum on day one and
          add their own studies over time. There's also a{" "}
          <strong>coach library</strong> of saved positions and games you keep on hand
          to drop into any course or assignment later.
        </p>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Course builder FAQ</h2>
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
        <h2>Build your first course free</h2>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start coaching free</Link>
          <Link to="/live-chess-classroom" className="mkt-btn">See the live classroom</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
