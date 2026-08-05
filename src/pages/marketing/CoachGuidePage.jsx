// src/pages/marketing/CoachGuidePage.jsx
//
// The complete coach guide (/chess-coach-guide) — a long-form SEO page that walks
// through everything a coach can do, in the order they'd actually do it:
// onboard → add students → batches → schedule → assignments → courses → activities
// → attendance → parent reports → the built-in live classroom.
//
// Facts here are taken from the code, not marketing copy:
//   • assignment types  — CoachAssignment.assignmentType enum (7)
//   • course lessons    — Course.lessons.kind enum (5)
//   • attendance states — CoachAttendanceRecord.status enum (3)
//   • live-class limits — config/coachPlans.js  getLiveClassLimits()
// If any of those change, update this page too.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-coach-guide";

// Live-class caps per plan — mirrors config/coachPlans.js (liveClass block).
const PLAN_ROWS = [
  { plan: "Free", perDay: "1 a day", mins: "up to 40 min", students: "4" },
  { plan: "Pro / Coach", perDay: "1 a day", mins: "up to 60 min", students: "4" },
  { plan: "Live Basic", perDay: "Unlimited", mins: "up to 60 min", students: "10" },
  { plan: "Live Pro", perDay: "Unlimited", mins: "up to 60 min", students: "10" },
  { plan: "Live Coach", perDay: "Unlimited", mins: "up to 120 min", students: "25" },
];

const FAQ = [
  {
    q: "How do I become a chess coach on Chess Nexus?",
    a: "Open the Coach section and confirm you're a coach. New coaches are verified by the Nexus team, usually within 12 hours, before they can add students — this keeps the platform safe for kids. Coaching is free forever for up to 30 students, with no card required.",
  },
  {
    q: "How do I add students to my chess academy?",
    a: "Students send you a join request, or you invite them from your roster. Once accepted they appear on your dashboard with their rating, activity and attendance. You can then group them into batches by level, age or class time.",
  },
  {
    q: "What kinds of assignments can a chess coach create?",
    a: "Seven types: puzzle topics (e.g. Mate in 2), a full study, a single study chapter, a timed Puzzle Rush, an arena tournament, a custom task, and Play-vs-Stockfish positions built on a visual board editor — so you never type a FEN by hand.",
  },
  {
    q: "Do I need Zoom to teach a live chess class?",
    a: "No. Chess Nexus has a built-in live classroom with HD video, screen share and one shared board every student sees. You can hand a student control of the board, load studies, endgames, puzzles or master games straight onto it, and attendance is marked automatically as students join.",
  },
  {
    q: "How many students can join a live class?",
    a: "On the free plan you get one class a day (up to 40 minutes) with up to 4 students plus you, the coach. The live plans give you unlimited classes a day, unlimited students in the room, and classes up to 120 minutes or with no time limit at all.",
  },
  {
    q: "How do parents see their child's progress?",
    a: "Every student has one shareable parent report link. It shows ratings over time, puzzles solved, assignment completion, attendance and recent games — no login or account needed for the parent.",
  },
  {
    q: "Are coach-created races and tournaments private?",
    a: "Yes. Arena races and tournaments you create for your class are private by default — only your own accepted students can join, and they never appear on the public Arena page.",
  },
  {
    q: "How do students find out about a new class or activity?",
    a: "Whenever you change the schedule or start an activity, a notice is posted automatically into each affected student's coach chat, which raises their Messages badge. Students also see upcoming classes and activities on their My Coach page.",
  },
  {
    q: "Can I earn credit by referring other coaches?",
    a: "Yes. Every coach has a personal referral link on their profile. Refer another coach and, when they take their first paid subscription, you earn 25% of it as wallet credit toward your own plan — in your own currency, with no limit on referrals.",
  },
];

function Section({ id, icon, title, lead, children }) {
  return (
    <section className="mkt-section" aria-label={title} id={id}>
      <h2>{icon} {title}</h2>
      {lead && <p className="mkt-section-lead">{lead}</p>}
      {children}
    </section>
  );
}

function Steps({ items }) {
  return (
    <ol className="mkt-steps">
      {items.map((s, i) => (
        <li key={i}>
          <strong>{s.t}</strong>
          <span>{s.d}</span>
        </li>
      ))}
    </ol>
  );
}

function FeatList({ items }) {
  return (
    <ul className="mkt-featurelist">
      {items.map((f, i) => (
        <li key={i}>
          <span className="mkt-feat-ic" aria-hidden="true">{f.icon}</span>
          <span className="mkt-feat-tx">
            <strong>{f.t}</strong>
            <span>{f.d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CoachGuidePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to run a chess academy on Chess Nexus",
    step: [
      { "@type": "HowToStep", name: "Become a coach", text: "Confirm you're a coach and get verified by the Nexus team, usually within 12 hours." },
      { "@type": "HowToStep", name: "Add your students", text: "Accept join requests or invite students, then group them into batches." },
      { "@type": "HowToStep", name: "Set your class schedule", text: "Add weekly class slots per batch; students see them in their own timezone." },
      { "@type": "HowToStep", name: "Assign work", text: "Create assignments from puzzles, studies, races or your own positions." },
      { "@type": "HowToStep", name: "Teach live", text: "Run the class in the built-in classroom with video and a shared board." },
      { "@type": "HowToStep", name: "Report to parents", text: "Share one progress link per student with their parents." },
    ],
  };

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Coach Guide — Run Your Whole Academy on Chess Nexus",
        description:
          "The complete guide for chess coaches: onboarding, adding students, batches, class schedules, assignments, courses, activities, attendance, parent reports, and the built-in live classroom with video and a shared board.",
        keywords:
          "chess coach guide, how to teach chess online, online chess academy software, chess class management, chess coaching platform, live chess classroom, chess assignments for students, chess attendance tracking, chess parent reports",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🎓",
        h1: "The complete chess coach guide",
        sub:
          "Everything you can do as a coach on Chess Nexus — from your first student to a full academy, including a built-in live classroom so you never need Zoom.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coaching", label: "See the coaching platform" },
      }}
      jsonLd={[faqSchema, howToSchema]}
      excludeSlug={CANONICAL}
    >
      {/* ── 1. Getting started ─────────────────────────────────────────── */}
      <Section
        id="onboarding"
        icon="🚀"
        title="Getting started as a coach"
        lead="Free forever for up to 30 students. No card, no trial clock."
      >
        <Steps
          items={[
            { t: "Confirm you're a coach", d: "Open the Coach section and tell us you teach. It takes one click." },
            { t: "Get verified", d: "The Nexus team reviews new coaches — usually within 12 hours — before you can add students. This keeps the platform safe for children." },
            { t: "Your workspace opens", d: "Dashboard, roster, assignments, courses, library, schedule, activities and the live classroom are all unlocked straight away." },
          ]}
        />
      </Section>

      {/* ── 2. Students & batches ──────────────────────────────────────── */}
      <Section
        id="students"
        icon="👥"
        title="Adding students & organising batches"
        lead="Your roster is the base everything else builds on."
      >
        <FeatList
          items={[
            { icon: "🔗", t: "Students join you", d: "A student sends a join request, or you invite them. Once accepted they appear on your roster with rating, recent activity and attendance." },
            { icon: "🗂", t: "Group into batches", d: "Create batches by level, age or class time. Assignments, schedules and activities can all target a whole batch at once instead of one student at a time." },
            { icon: "🟢", t: "See who's online", d: "The coach sidebar shows which of your students are online right now — useful before starting a class or a race." },
            { icon: "📝", t: "Private notes", d: "Keep per-student notes only you can see, so you remember what each child is working on." },
          ]}
        />
      </Section>

      {/* ── 3. Assignments ─────────────────────────────────────────────── */}
      <Section
        id="assignments"
        icon="📝"
        title="Creating assignments"
        lead="Seven assignment types, all tracked automatically."
      >
        <FeatList
          items={[
            { icon: "🎯", t: "Puzzle topic", d: "Set a theme like Mate in 2, forks or pins, and a target number of puzzles. Solve rate and accuracy are recorded per student." },
            { icon: "📚", t: "Study or study chapter", d: "Assign one of your studies, or a single chapter from it, so students work through exactly the material you taught." },
            { icon: "⏱️", t: "Puzzle Rush", d: "A timed race against the clock on a topic you choose — great for building pattern speed." },
            { icon: "🏁", t: "Arena tournament", d: "Set a tournament as the assignment; completion is tracked when they play it." },
            { icon: "♟️", t: "Play vs Stockfish position", d: "Drag pieces onto a visual board editor — set side to move, castling and en passant — and it writes the FEN for you. Students play the position out against the engine." },
            { icon: "✍️", t: "Custom task", d: "Anything else you want to set, in your own words, with your own target." },
            { icon: "♻️", t: "Save & reuse", d: "Save your best assignments as templates, or pull from the admin blunder library, instead of rebuilding them every term." },
          ]}
        />
      </Section>

      {/* ── 4. Courses ─────────────────────────────────────────────────── */}
      <Section
        id="courses"
        icon="📚"
        title="Building courses"
        lead="A course is an ordered syllabus your students work through in sequence."
      >
        <p className="mkt-p">
          You create a course, add lessons in the order you teach them, and enrol a
          batch. Students see their progress through the syllabus as they complete
          each lesson. A course can mix five kinds of lesson:
        </p>
        <FeatList
          items={[
            { icon: "📖", t: "Your own studies", d: "Any study you've built — whole study or a single chapter." },
            { icon: "🏛️", t: "Nexus studies", d: "Built-in studies that ship with the platform, so you don't have to author everything yourself." },
            { icon: "🎬", t: "Video", d: "Drop in a video lesson alongside the board work." },
            { icon: "♛", t: "Master games", d: "Teach from the master game collection — thousands of annotated games." },
            { icon: "♔", t: "Endgames", d: "Endgame positions, including premium endgame picks for coaches on a paid plan." },
          ]}
        />
        <p className="mkt-p">
          Alongside courses you get a <strong>coach library</strong> — saved positions,
          games and templates you keep on hand to drop into any assignment or course
          later.
        </p>
      </Section>

      {/* ── 5. Schedule ────────────────────────────────────────────────── */}
      <Section
        id="schedule"
        icon="📅"
        title="Class schedule"
        lead="Set it once a week; every student sees it in their own timezone."
      >
        <FeatList
          items={[
            { icon: "🗓", t: "Weekly slots per batch", d: "Choose the days, start time and duration for each batch. You enter the time in your timezone; every student sees it converted to theirs automatically." },
            { icon: "🔔", t: "Students are told", d: "When you change the schedule, a notice is posted automatically into each affected student's coach chat — their Messages badge lights up. Nobody has to be told manually." },
            { icon: "📍", t: "Where students see it", d: "Upcoming classes appear on the student's My Coach page, so there's one place they always check." },
          ]}
        />
      </Section>

      {/* ── 6. Activities ──────────────────────────────────────────────── */}
      <Section
        id="activities"
        icon="🏁"
        title="Private activities for your class"
        lead="Races and tournaments only your students can enter."
      >
        <FeatList
          items={[
            { icon: "🔒", t: "Private by default", d: "Coach-created arena races and tournaments are visible only to your accepted students. They never appear on the public Arena page, so no outside player can join your class session." },
            { icon: "⚡", t: "Arena races", d: "Timed puzzle races for the whole batch — everyone solves the same set and climbs a live leaderboard." },
            { icon: "🏆", t: "Arena tournaments", d: "Run a tournament for your class, with standings tracked as it plays out." },
            { icon: "🔔", t: "Students get notified", d: "New activities show on the student's Activities tab with a badge, so they know something is waiting without you chasing them." },
          ]}
        />
      </Section>

      {/* ── 7. Attendance ──────────────────────────────────────────────── */}
      <Section
        id="attendance"
        icon="📋"
        title="Attendance"
        lead="Three states, CSV export, and it fills itself in when you teach live."
      >
        <FeatList
          items={[
            { icon: "✅", t: "Present, Absent or Catch-up", d: "Catch-up covers a student who missed the class and made it up separately, so your records reflect what actually happened." },
            { icon: "🎥", t: "Marked automatically in live class", d: "When you teach in the built-in classroom, each student's attendance is written the moment they're admitted. No separate register to fill in." },
            { icon: "📤", t: "CSV export", d: "Export attendance for any period — for your own records, for parents, or for an academy you report to." },
            { icon: "💳", t: "Fees alongside", d: "Track enrollment and record payments in the same place, so attendance and fees stay in step." },
          ]}
        />
      </Section>

      {/* ── 8. Parent reports ──────────────────────────────────────────── */}
      <Section
        id="reports"
        icon="📊"
        title="Parent reports"
        lead="One link per student. No account needed for the parent."
      >
        <p className="mkt-p">
          Every student has a shareable progress report you can send to their parents.
          It shows rating over time, puzzles solved, assignment completion, attendance
          and recent games — including games they played on Lichess or Chess.com in the
          last 30 days. Parents open the link and see it; they never need to sign up.
        </p>
      </Section>

      {/* ── 9. Live classroom (the big one) ────────────────────────────── */}
      <Section
        id="classroom"
        icon="🎥"
        title="The built-in live classroom"
        lead="Teach inside Chess Nexus — video, screen share and one shared board. No Zoom, no extra apps."
      >
        <FeatList
          items={[
            { icon: "📹", t: "HD video & screen share", d: "See your whole class and share your screen when you need to. Background noise suppression and video touch-up are built in." },
            { icon: "♟️", t: "One shared board", d: "Every student sees the same position, live. Move a piece and it moves on their screen instantly." },
            { icon: "🖱️", t: "Give a student control", d: "Hand the board to any student so they play the move themselves in front of the class — then take it back with one click." },
            { icon: "✏️", t: "Draw on the board", d: "Arrows and square highlights sync to everyone, so you can point at the plan instead of describing it." },
            { icon: "📚", t: "Load any content instantly", d: "Pull in your studies, Nexus studies, courses, the coach library, endgames (including premium picks), puzzles by theme or rating, and master games searchable by player or opening." },
            { icon: "🧩", t: "Puzzles for the class", d: "Load a puzzle at the level you choose and solve it together — Healthy Mix, by theme, or by number of pieces." },
            { icon: "🤖", t: "Private engine", d: "Stockfish runs on your side only. You see the evaluation and best lines; students see just the board." },
            { icon: "⏳", t: "Waiting room", d: "Students wait until you admit them, so nobody wanders in mid-explanation." },
            { icon: "✋", t: "Raise hand", d: "Students raise a hand and their tile jumps to the front of your grid. You can lower it for them when it's dealt with." },
            { icon: "🎙️", t: "Mic & camera control", d: "Mute a student or turn their camera off in one click, straight from their video tile. To turn either back on you send a request — the student accepts. A child's mic or camera is never forced on." },
            { icon: "📌", t: "One-click homework", d: "Press Add to homework and the position on the board is captured instantly — no dialog, no typing a FEN, so the lesson keeps moving. Collect positions all through the class, then send them as one assignment to exactly the students who were in the room. They play each one out against Stockfish at home." },
            { icon: "📋", t: "Attendance writes itself", d: "Admitting a student records their attendance for that class automatically." },
            { icon: "💬", t: "Class chat", d: "A chat panel for the session — good for links and quick questions without interrupting." },
            { icon: "♟️", t: "Play in class", d: "Pair students into real games from the Activities panel — the whole class can play at once, each on their own board with live clocks. You watch every board live, spotlight one for everyone to follow, and load any finished game onto the teaching board to review it together." },
            { icon: "🎲", t: "Simul — play the whole class", d: "Run a simultaneous exhibition against every student at once. Send a join request; once they accept you get one big active board plus a strip of all the others — click any board to swap to it and move, just like the Lichess simul page." },
            { icon: "🏁", t: "Activities in the room", d: "Launch a private Arena race or tournament for the class without leaving the room — only your own students can join." },
          ]}
        />

        <h3 className="mkt-h3">What each plan includes</h3>
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
        <p className="mkt-p mkt-muted">
          Every coach — including free ones — gets the live classroom. Paid live plans
          raise how often you can teach, how long each class runs, and how many
          students can join at once.
        </p>
      </Section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <Section id="faq" icon="❓" title="Coach FAQ">
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="mkt-section mkt-cta-section" aria-label="Start coaching">
        <h2>Start coaching free</h2>
        <p className="mkt-section-lead">
          Free forever for up to 30 students — including the live classroom. No card required.
        </p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Become a coach</Link>
          <Link to="/chess-coaching" className="mkt-btn">See the coaching platform</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
