// src/pages/marketing/CoachFaqPage.jsx — /chess-coaching-questions
//
// Long-tail Q&A / SEO page answering the real questions chess coaches search
// for — but ONLY the ones this app actually solves, so every answer is true and
// every link lands on a real feature page. Questions we have no feature for
// (pricing advice, book recommendations, generic "get more students" marketing)
// are deliberately left out.
//
// Each Q&A renders with in-answer links (for readers + internal SEO) AND emits a
// plain-text FAQPage schema entry (Google requires schema answers to be plain
// text, so the schema copy mirrors the visible answer without markup).
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import { t as tr } from '../../i18n/LanguageContext';

const CANONICAL = "/chess-coaching-questions";

// Each item: question, a plain-text answer (for FAQ schema), and a JSX answer
// with links (for the page). Keep the two answers equivalent in meaning.
const QA = [
  // ── Running the academy ──
  {
    group: "Managing students & batches",
    q: "How do I manage chess students online?",
    plain:
      "Chess Nexus gives coaches a single dashboard to manage their whole roster: add students, group them into batches, set assignments, track progress and chat with them directly. Coaching is free forever for up to 30 students.",
    a: (
      <>
        Chess Nexus gives you a single coach dashboard to manage your whole
        roster — add students, group them into <Link to="/chess-coaching">batches</Link>,
        {tr("set assignments, follow their")} <Link to="/chess-progress-reports">{tr("progress")}</Link>{" "}
        {tr("and chat with them directly. It's")}{" "}
        <Link to="/chess-coaching">{tr("free forever for up to 30 students")}</Link>{tr(". See the")}{" "}
        <Link to="/chess-coach-guide">{tr("full coach guide")}</Link> {tr("for the step-by-step.")}
      </>
    ),
  },
  {
    group: "Managing students & batches",
    q: "How do I organize students into chess batches?",
    plain:
      "You create batches (groups) on your Batches page and assign each student to one. Assignments, courses and class schedules can then target a whole batch at once instead of individual students, so managing many students stays simple.",
    a: (
      <>
        Create batches on your Batches page and drop each student into one.
        {tr("Assignments,")} <Link to="/chess-courses">{tr("courses")}</Link> {tr("and class schedules")}
        can then target a whole batch at once instead of one student at a time — so
        {tr("running several groups stays simple even as your")}{" "}
        <Link to="/chess-coaching">{tr("academy")}</Link> {tr("grows.")}
      </>
    ),
  },
  {
    group: "Managing students & batches",
    q: "How do I manage multiple batches of students at once?",
    plain:
      "Everything a coach does — assignments, courses, class schedules, private races and tournaments — can be aimed at a specific batch. So a coach running several batches of different levels sets each batch's work once, and every student in it receives it.",
    a: (
      <>
        Everything you do — assignments, <Link to="/chess-courses">courses</Link>,
        {tr("class schedules, and private")}{" "}
        <Link to="/3d-chess-arena-tournament">{tr("races and tournaments")}</Link> {tr("— can be")}
        aimed at a specific batch. Run several batches of different levels, set each
        batch's work once, and every student in it receives it.
      </>
    ),
  },

  // ── Classes ──
  {
    group: "Running classes",
    q: "How do I run online chess classes?",
    plain:
      "Chess Nexus has a built-in live classroom — no Zoom needed. You get a shared board, video and audio, and can push positions or endgames straight onto the board for the class. Every coach gets at least one live class a day free; paid plans raise the limits.",
    a: (
      <>
        {tr("Use the built-in")} <Link to="/live-chess-classroom">{tr("live classroom")}</Link> {tr("— no")}
        Zoom needed. You get a shared board, video and audio, and can push a position
        {tr("or an")} <Link to="/chess-endgame-training">{tr("endgame")}</Link> {tr("straight onto the board")}
        for the whole class. Every coach gets at least one live class a day free;{" "}
        <Link to="/chess-coach-pricing">{tr("paid plans")}</Link> {tr("raise the length, frequency")}
        and class size.
      </>
    ),
  },
  {
    group: "Running classes",
    q: "How do I structure lessons for beginners?",
    plain:
      "Build a course — an ordered syllabus of studies, master games, videos and free endgame positions — and enroll a beginner batch in it. Students work through it in sequence, and you can teach the same material live in the classroom. A course keeps a beginner group on a clear path rather than ad-hoc lessons.",
    a: (
      <>
        {tr("Build a")} <Link to="/chess-courses">{tr("course")}</Link> {tr("— an ordered syllabus of")}{" "}
        <Link to="/chess-study">{tr("studies")}</Link>,{" "}
        <Link to="/masters-chess-games">{tr("master games")}</Link>{tr(", videos and free")}{" "}
        <Link to="/chess-endgame-training">{tr("endgame positions")}</Link> {tr("— and enroll a")}
        beginner batch in it. Students work through it in sequence, and you can teach
        {tr("the same material live in the")}{" "}
        <Link to="/live-chess-classroom">{tr("classroom")}</Link>{tr(". That keeps a beginner group")}
        on a clear path instead of ad-hoc lessons.
      </>
    ),
  },
  {
    group: "Running classes",
    q: "How do I create a chess curriculum?",
    plain:
      "A curriculum on Chess Nexus is a course: an ordered list of lessons built from your own studies, master games, videos and endgame positions. You create it once, reuse it across batches, and students follow it lesson by lesson.",
    a: (
      <>
        {tr("A curriculum here is a")} <Link to="/chess-courses">{tr("course")}</Link>{tr(": an ordered list")}
        {tr("of lessons built from your own")} <Link to="/chess-study">{tr("studies")}</Link>,{" "}
        <Link to="/masters-chess-games">{tr("master games")}</Link>{tr(", videos and")}{" "}
        <Link to="/chess-endgame-training">{tr("endgame positions")}</Link>{tr(". Build it once,")}
        reuse it across batches, and students follow it lesson by lesson.
      </>
    ),
  },

  // ── Homework / assignments ──
  {
    group: "Homework & assignments",
    q: "How do I assign homework to chess students?",
    plain:
      "You create an assignment and give it to a student or a whole batch. Assignments can be tactics from a student's own blunders, Play-vs-Stockfish positions, or puzzle sets. Students get it in their account and you see who has completed it.",
    a: (
      <>
        Create an assignment and give it to a student or a whole batch. Assignments
        can be tactics drawn from a student's own blunders, Play-vs-Stockfish
        {tr("positions, or")} <Link to="/chess-puzzles">{tr("puzzle")}</Link> {tr("sets. Students receive it")}
        {tr("in their account and you see who's completed it — full detail in the")}{" "}
        <Link to="/chess-coach-guide">{tr("coach guide")}</Link>.
      </>
    ),
  },
  {
    group: "Homework & assignments",
    q: "How do I send chess homework automatically?",
    plain:
      "Save an assignment as a template and reuse it across students and batches instead of rebuilding it each week. You can also pull from the admin blunder library. This turns weekly homework into a couple of clicks rather than manual setup every time.",
    a: (
      <>
        Save an assignment as a template and reuse it across students and batches
        instead of rebuilding it every week — you can also pull from a shared blunder
        library. That turns weekly homework into a couple of clicks. Assignments draw
        {tr("on the same tactics and")} <Link to="/chess-puzzles">{tr("puzzle")}</Link> {tr("engine students")}
        use, so the work is always relevant.
      </>
    ),
  },

  // ── Progress & analysis ──
  {
    group: "Tracking progress",
    q: "How do I track my chess students' progress?",
    plain:
      "Each student has a progress view showing puzzles solved, races and activity over time, plus games they've played on Lichess and Chess.com in the last 30 days. You can send parents a shareable progress report link so families see it too.",
    a: (
      <>
        {tr("Each student has a")} <Link to="/chess-progress-reports">{tr("progress view")}</Link> —
        {tr("puzzles solved,")} <Link to="/chess-tactics-race">{tr("races")}</Link> {tr("and activity over")}
        time, plus games they've played on Lichess and Chess.com in the last 30 days.
        {tr("You can send parents a shareable")}{" "}
        <Link to="/chess-progress-reports">{tr("progress report")}</Link> {tr("link so families see")}
        it too.
      </>
    ),
  },
  {
    group: "Tracking progress",
    q: "How do I analyze my student's games?",
    plain:
      "Students can analyze their own games in the browser with a built-in engine, and coaches can turn a student's blunders into a tactics assignment — so the student re-solves the exact positions they got wrong in real games. It's the fastest way to fix recurring mistakes.",
    a: (
      <>
        {tr("Students")} <Link to="/analyse-my-chess-game">{tr("analyze their own games")}</Link> {tr("in")}
        the browser with a built-in engine, and you can turn a student's blunders into
        a tactics assignment — so they re-solve the exact positions they got wrong in
        {tr("real games. It's the fastest way to fix recurring mistakes. See how")}{" "}
        <Link to="/improve-at-chess">{tr("improvement")}</Link> {tr("is structured here.")}
      </>
    ),
  },

  // ── Automation / scale ──
  {
    group: "Automating & growing",
    q: "How do I reduce admin work in my chess academy?",
    plain:
      "Batches, assignment templates, reusable courses, an automatic class schedule that notifies students, and parent progress reports each remove a piece of manual work. Set things up once at the batch level and the platform delivers it to every student for you.",
    a: (
      <>
        {tr("Batches, assignment templates, reusable")}{" "}
        <Link to="/chess-courses">{tr("courses")}</Link>{tr(", a class schedule that notifies")}
        {tr("students automatically, and parent")}{" "}
        <Link to="/chess-progress-reports">{tr("progress reports")}</Link> {tr("each remove a piece")}
        of manual work. Set things up once at the batch level and the platform delivers
        {tr("it to every student for you — that's the point of a")}{" "}
        <Link to="/chess-coaching">{tr("coach-run platform")}</Link> {tr("over spreadsheets and chat")}
        apps.
      </>
    ),
  },
  {
    group: "Automating & growing",
    q: "How do I keep students engaged and motivated?",
    plain:
      "Private races and tournaments just for your students, puzzle challenges, a monthly focus theme, and visible progress all give students a reason to keep coming back. Competition among their own batch is often the strongest motivator for kids.",
    a: (
      <>
        {tr("Private")} <Link to="/chess-tactics-race">{tr("races")}</Link> {tr("and")}{" "}
        <Link to="/3d-chess-arena-tournament">{tr("tournaments")}</Link> {tr("just for your")}
        {tr("students,")} <Link to="/chess-puzzles">{tr("puzzle")}</Link> {tr("challenges, a monthly focus")}
        {tr("theme, and visible")} <Link to="/chess-progress-reports">{tr("progress")}</Link> {tr("all give")}
        students a reason to keep coming back. Friendly competition inside their own
        batch is often the strongest motivator for kids.
      </>
    ),
  },
  {
    group: "Automating & growing",
    q: "How do I start a chess academy online?",
    plain:
      "Sign up as a coach (free forever for up to 30 students, no card), add your students, group them into batches, build a course as your curriculum, and set a weekly class schedule. Everything an academy needs — roster, lessons, homework, live classes, reports — is in one place. You can also earn credit by referring other coaches.",
    a: (
      <>
        <Link to="/coach/onboarding">{tr("Sign up as a coach")}</Link> {tr("— free forever for up to")}
        {tr("30 students, no card — add your students, group them into batches, build a")}{" "}
        <Link to="/chess-courses">{tr("course")}</Link> {tr("as your curriculum, and set a weekly")}
        {tr("class schedule. Everything an academy needs — roster, lessons, homework,")}{" "}
        <Link to="/live-chess-classroom">{tr("live classes")}</Link>,{" "}
        <Link to="/chess-progress-reports">{tr("reports")}</Link> {tr("— is in one place. You can")}
        {tr("even")} <Link to="/chess-coach-referral">{tr("earn credit by referring other coaches")}</Link>.
      </>
    ),
  },
];

// Group the Q&A for rendering (keeps the on-page order tidy).
const GROUPS = QA.reduce((acc, item) => {
  (acc[item.group] = acc[item.group] || []).push(item);
  return acc;
}, {});

export default function CoachFaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QA.map(({ q, plain }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": tr("Answer"), text: plain },
    })),
  };

  return (
    <FeaturePageLayout
      seo={{
        title: tr("Chess Coaching Questions — How to Manage, Teach & Track Students"),
        description:
          "Straight answers for chess coaches: how to manage students, run online classes, organize batches, assign homework, track progress and start a chess academy — with the tools to do each.",
        keywords:
          "how to manage chess students, how to run online chess classes, how to track chess student progress, how to organize chess batches, how to assign chess homework, how to start a chess academy, chess coaching questions",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "❓",
        h1: "Chess coaching questions, answered",
        sub:
          "The real questions coaches ask — managing students, running classes, homework, progress, and starting an academy — each answered with the tool that does it.",
        primary: { to: "/coach/onboarding", label: tr("Start coaching free") },
        secondary: { to: "/chess-coach-guide", label: tr("Read the coach guide") },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      {Object.entries(GROUPS).map(([group, items]) => (
        <section className="mkt-section" key={group} aria-label={group}>
          <h2>{group}</h2>
          <div className="mkt-faq">
            {items.map((item) => (
              <div key={item.q} className="mkt-faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mkt-section mkt-cta-section" aria-label={tr("Start")}>
        <h2>{tr("Everything a chess coach needs, in one place")}</h2>
        <p className="mkt-section-lead">{tr("Free forever for up to 30 students. No card required.")}</p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">{tr("Start coaching free")}</Link>
          <Link to="/chess-coach-guide" className="mkt-btn">{tr("Read the coach guide")}</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
