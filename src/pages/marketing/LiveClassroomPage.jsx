// src/pages/marketing/LiveClassroomPage.jsx — /live-chess-classroom
//
// Standalone SEO page for the built-in live classroom. Targets searches like
// "teach chess online without zoom", "online chess classroom software",
// "live chess class with shared board".
//
// Plan limits mirror config/coachPlans.js (liveClass). Keep in step.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/live-chess-classroom";

const PLAN_ROWS = [
  { plan: "Free", perDay: "1 a day", mins: "up to 40 min", students: "4" },
  { plan: "Pro / Coach", perDay: "1 a day", mins: "up to 60 min", students: "4" },
  { plan: "Live Basic", perDay: "5 a day", mins: "up to 60 min", students: "4" },
  { plan: "Live Pro", perDay: "Unlimited", mins: "up to 60 min", students: "5" },
  { plan: "Live Coach", perDay: "Unlimited", mins: "up to 120 min", students: "10" },
];

const FEATURES = [
  { icon: "📹", t: "HD video & screen share", d: "See your whole class, share your screen when you need to. Background noise suppression and video touch-up are built in, so a noisy room or a dim lamp doesn't ruin the lesson." },
  { icon: "♟️", t: "One shared board", d: "Every student sees the same position, live. Move a piece and it moves on their screen instantly — no 'can you see my screen?'." },
  { icon: "🖱️", t: "Give a student control", d: "Hand the board to any student so they play the move themselves in front of the class, then take it back with one click." },
  { icon: "✏️", t: "Draw on the board", d: "Arrows and square highlights sync to everyone, so you point at the plan instead of describing it in words." },
  { icon: "📚", t: "Load content instantly", d: "Pull your own studies, built-in Nexus studies, courses, your coach library, endgames, puzzles by theme or rating, and master games searchable by player or opening — straight onto the class board." },
  { icon: "🤖", t: "Private engine", d: "Stockfish runs on your side only. You see the evaluation and best lines; students see just the board, so you can guide without giving the answer away." },
  { icon: "⏳", t: "Waiting room", d: "Students wait until you admit them, so nobody wanders in halfway through an explanation." },
  { icon: "✋", t: "Raise hand", d: "A student raises their hand and their tile jumps to the front of your grid. You can lower it for them once it's dealt with." },
  { icon: "🎙️", t: "Mic & camera controls", d: "Mute a student or turn their camera off in one click from their video tile. Turning either back on is always a request the student accepts — a child's mic or camera is never forced on." },
  { icon: "📋", t: "Attendance writes itself", d: "Admitting a student records their attendance for that class. No separate register to fill in afterwards." },
  { icon: "💬", t: "Class chat", d: "A chat panel for the session — good for links and quick questions without interrupting the lesson." },
  { icon: "🎯", t: "Activities on the stage", d: "One Activities panel, right inside the class: Play in class, a coach Simul, and private Arena races & tournaments — all launched without leaving the room." },
  { icon: "♟️", t: "Play in class", d: "Pair students into real games — the whole class can play at once, each on their own board with live clocks like a Lichess broadcast. You watch every board live, spotlight one for everyone to follow, and load any finished game onto the teaching board to review it together." },
  { icon: "🎲", t: "Simul — play the whole class", d: "Run a simultaneous exhibition: you play every student at once. Send a join request, and once they accept you see one big active board plus a strip of all the others — click any board to swap to it and make your move, exactly like the Lichess simul page." },
  { icon: "🏁", t: "Private races & tournaments", d: "Launch a private Arena race or tournament for your class without leaving the room — only your own students can join, results shown right on the stage." },
];

const FAQ = [
  {
    q: "Can I teach chess online without Zoom?",
    a: "Yes. Chess Nexus has a built-in live classroom with HD video, screen share and a shared chess board that every student sees. You don't need Zoom, Google Meet or any other app — the video and the board are in the same window, so you never alt-tab mid-lesson.",
  },
  {
    q: "Is the live chess classroom free?",
    a: "Yes. Every coach on Chess Nexus gets the live classroom, including free coaches — one class a day (up to 40 minutes) with up to 4 students plus you, the coach. Paid plans raise that to up to 60 minutes, and the top live plan to unlimited classes a day of up to 120 minutes with up to 10 students plus the coach.",
  },
  {
    q: "Can students move pieces on the shared board?",
    a: "Only when you let them. The coach controls the board by default; you can hand control to any student so they play their move in front of the class, then take it back with one click.",
  },
  {
    q: "Can students play games during a live class?",
    a: "Yes, two ways from the Activities panel. Play in class pairs students into real games — the whole class can play at once, each on their own board with live clocks, and you watch every board live and spotlight one for the rest to follow. A Simul lets you play every student at once, swapping between their boards like the Lichess simul page. Any finished game can be loaded onto the teaching board to review together.",
  },
  {
    q: "How is attendance recorded in an online chess class?",
    a: "Automatically. When you admit a student from the waiting room, their attendance for that class is written straight away. You can still mark Present, Absent or Catch-up manually, and export the whole thing as CSV.",
  },
  {
    q: "Can I mute a student or turn their camera off?",
    a: "Yes, in one click from their video tile. Turning a mic or camera back on works differently on purpose: you send a request and the student accepts it. Because the platform is used by children, a coach can never force a student's mic or camera on.",
  },
  {
    q: "What can I teach from inside the classroom?",
    a: "Your own studies, built-in Nexus studies, your courses and coach library, endgame positions, puzzles filtered by theme or rating, and master games you can search by player or opening — all loaded onto the shared board without leaving the class.",
  },
];

export default function LiveClassroomMarketingPage() {
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
        title: "Live Chess Classroom — Teach Chess Online Without Zoom",
        description:
          "Teach chess live inside Chess Nexus: HD video, screen share and one shared board every student sees. Give a student control, load studies, endgames and puzzles onto the board, and attendance marks itself. Free for every coach.",
        keywords:
          "live chess classroom, teach chess online, online chess class software, chess class without zoom, shared chess board online, chess teaching platform, online chess lessons software",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🎥",
        h1: "Teach chess live — without Zoom",
        sub:
          "A classroom built into Chess Nexus: video, screen share and one board every student sees. Hand a student control, load any study or puzzle onto the board, and attendance marks itself.",
        primary: { to: "/coach/onboarding", label: "Start teaching free" },
        secondary: { to: "/chess-coach-guide", label: "Read the coach guide" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="Why it's different">
        <h2>The board and the video are in the same room</h2>
        <p className="mkt-section-lead">
          Most online chess lessons are a video call in one window and a chess site
          in another. You share your screen, students squint at it, and nobody can
          touch the board but you. Chess Nexus puts both in one place.
        </p>
        <ul className="mkt-featurelist">
          {FEATURES.map((f) => (
            <li key={f.t}>
              <span className="mkt-feat-ic" aria-hidden="true">{f.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{f.t}</strong>
                <span>{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="Plans">
        <h2>What each plan includes</h2>
        <p className="mkt-section-lead">
          Every coach gets the live classroom — free plans included. Paid live plans
          raise how often you teach, how long, and how many students join.
        </p>
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Classes per day</th>
                <th>Length</th>
                <th>Students per class (+ coach)</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((r) => (
                <tr key={r.plan}>
                  <td>{r.plan}</td>
                  <td>{r.perDay}</td>
                  <td>{r.mins}</td>
                  <td>{r.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Live classroom FAQ</h2>
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
        <h2>Run your next class here</h2>
        <p className="mkt-section-lead">
          Free forever for up to 30 students. No card required.
        </p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start teaching free</Link>
          <Link to="/chess-coaching" className="mkt-btn">See the coaching platform</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
