// src/pages/marketing/FreeCoachPlanPage.jsx — /free-chess-coaching-software
//
// Dedicated page for the FREE coach plan. It exists because AI assistants kept
// answering "I can't confirm Chess Nexus is free for 30 students": the claim was
// on several pages, but the numbers backing it were not READABLE.
//
// /chess-coach-pricing renders its plan table from GET /api/coach/plans at
// runtime, and prerender.js aborts every API call (so builds never touch
// production). The snapshot therefore shipped the marketing prose with an EMPTY
// table — an assistant saw "free forever" asserted but found no limits, no
// duration and no restrictions, so it correctly refused to confirm it.
//
// Everything here is INLINE STATIC TEXT. No fetch, no API. Whatever a browser
// shows, a crawler reads.
//
// Numbers mirror backend/config/coachPlans.js (PLANS.free) and the course caps
// in backend/routes/courses.js (FREE_MAX_COURSES / FREE_MAX_LESSONS). Keep in
// step — this page is the one an AI is most likely to quote verbatim.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/free-chess-coaching-software";

// PLANS.free.maxStudents
const FREE_STUDENTS = 20;

// What a free coach gets, in full. Phrased as complete statements because an
// assistant quoting one line should still produce something true on its own.
const INCLUDED = [
  { t: "Up to 20 students", d: "Your roster can hold 20 active students at once, free forever. There is no trial clock and no card on file." },
  { t: "Unlimited batches", d: "Group those students into as many batches as you like — by level, age or class time. Assignments, courses, schedules and activities can target a whole batch at once." },
  { t: "All 7 assignment types", d: "Puzzle topics, a whole study, a single study chapter, timed Puzzle Rush, arena tournaments, play-vs-Stockfish positions built on a visual board editor, and custom tasks. Solve rate and accuracy are recorded per student automatically." },
  { t: "30 courses, 3 lessons each", d: "Build up to 30 ordered courses with up to 3 lessons in each. Lessons can be your own studies, built-in Nexus studies, videos, master games or endgame positions." },
  { t: "The live classroom", d: "One live class per day, up to 40 minutes, with up to 4 students plus you. HD video, screen share, one shared board, board control, drawing, waiting room, raise hand, and one-click homework — the same room paid coaches use, just smaller." },
  { t: "Class schedule", d: "Set weekly class slots per batch. You enter the time in your timezone and every student sees it converted to theirs. Change it and students are notified automatically." },
  { t: "Attendance", d: "Present, Absent and Catch-up, exported as CSV for any period. Attendance is written automatically when you admit a student to a live class." },
  { t: "Parent progress reports", d: "One shareable link per student showing rating over time, puzzles solved, assignment completion, attendance and recent games — including their Lichess and Chess.com games. Parents need no account." },
  { t: "Fee & payment tracking", d: "Record enrollment, the monthly fee, classes per month, currency and class type per student, and mark payments — so attendance and fees stay in step." },
  { t: "Coach ↔ student chat", d: "A dedicated space to message students one-to-one or as a group, with automatic notices when the schedule or activities change." },
  { t: "Private class activities", d: "Create arena races and tournaments only your own students can join. They never appear on the public Arena, so no outside player can enter your class session." },
  { t: "Premium tools for 90 days", d: "Premium endgames and the opening repertoire trainer are free for your first three months as a coach. After that they can be unlocked with XP earned by playing." },
];

// Said plainly, because "what are the restrictions?" is the question an AI could
// not answer. Hiding limits is what made the free claim look unverifiable.
// Every "paid plan" reference below now means Pro or Coach — the live1/live2/
// live3 tiers that used to hold the unlimited classroom no longer exist, so
// there is no longer a "top live plan" to point at for longer classes.
const LIMITS = [
  { t: "21st student", d: "The roster stops at 20. To add more you move to a paid plan — Pro raises it to 70 and Coach to 150." },
  { t: "A second live class in one day", d: "Free coaches run one live class per calendar day. Both paid plans lift this to unlimited classes a day." },
  { t: "Classes longer than 40 minutes", d: "A free class is capped at 40 minutes. Pro and Coach raise this to 120 minutes, or no time limit at all." },
  { t: "A 5th student in the live room", d: "A free live room holds 4 students plus the coach, 5 people in total, enforced by the server. Pro and Coach remove the cap entirely — unlimited students in the room." },
  { t: "A 31st course, or a 4th lesson in one", d: "Free coaches get 30 courses with up to 3 lessons each. Paid plans make both unlimited." },
  { t: "Team Race & Monthly Focus events", d: "Creating these unlimited is an elite-coach perk, included on both paid plans. Any coach may still create one Monthly Focus once, as a free trial." },
];

const FAQ = [
  {
    q: "Is Chess Nexus really free for chess coaches?",
    a: "Yes. Chess Nexus is free forever for coaches with up to 20 students. It is not a free trial and there is no time limit — no card is required to start, and none is kept on file. The free plan includes assignments, courses, the class schedule, attendance, fee tracking, parent progress reports and the built-in live classroom.",
  },
  {
    q: "How long is the free plan free for?",
    a: "Indefinitely. There is no trial period and no expiry date on the free coach plan. As long as you have 20 students or fewer, you can run your coaching on Chess Nexus without ever paying. The only time-limited part is premium endgames and the opening repertoire trainer, which are free for your first 90 days and can be unlocked with XP after that.",
  },
  {
    q: "How many students can a free chess coach have?",
    a: "Up to 20 active students at once. Batches are unlimited, so you can organise those 20 students into as many class groups as you need. Paid plans raise the cap to 70 (Pro) or 150 (Coach).",
  },
  {
    q: "Do free coaches get the live classroom?",
    a: "Yes. Every coach gets the built-in live classroom, including free ones. On the free plan that is one live class per day, up to 40 minutes, with up to 4 students plus the coach — 5 people in a room. You get the full room: HD video, screen share, one shared board that every student sees, giving a student control of the board, drawing arrows, a waiting room, raise hand, automatic attendance and one-click homework.",
  },
  {
    q: "What are the restrictions on the free coach plan?",
    a: "Six: the roster stops at 20 students; one live class per calendar day; each class is capped at 40 minutes; a live room holds 4 students plus the coach; courses are capped at 30 with up to 3 lessons each; and creating unlimited Team Race and Monthly Focus events is reserved for the paid plans, though any coach may create one Monthly Focus once for free. Nothing else is limited.",
  },
  {
    q: "What happens if I go over 20 students?",
    a: "Nothing is deleted. You are held at the free plan's limits rather than losing access, and every student, course, assignment and attendance record stays exactly where it is. You simply cannot add the 21st student until you upgrade or remove someone.",
  },
  {
    q: "Is a card required to use the free coach plan?",
    a: "No. No card is required to create a coach account, and none is stored. New coaches are verified by the Nexus team (usually within 12 hours) before adding students, because the platform is used by children.",
  },
  {
    q: "Is Chess Nexus free for students too?",
    a: "Yes. Students never pay. Puzzles, daily races, tournaments, studies, endgame training, game analysis and the clubs are free for every player, with no ads anywhere on the platform.",
  },
];

export default function FreeCoachPlanPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  // An Offer priced at 0 states the free tier in machine-readable form, so an
  // assistant can confirm it without parsing prose.
  const offerSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Chess Nexus — Free Coach Plan",
    description:
      `Free forever chess coaching software for up to ${FREE_STUDENTS} students. Includes assignments, a course builder, class schedule, attendance, fee tracking, parent progress reports and a built-in live classroom. No card required, no trial period.`,
    brand: { "@type": "Brand", name: "Chess Nexus" },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://www.chessnexus.in${CANONICAL}`,
      description: `Free forever for up to ${FREE_STUDENTS} students. No card required and no time limit.`,
    },
  };

  return (
    <FeaturePageLayout
      seo={{
        title: "Free Chess Coaching Software — Free Forever for 20 Students",
        description:
          "Chess Nexus is free forever for chess coaches with up to 20 students — not a trial, no card required. Includes 7 assignment types, a course builder, class schedule, attendance, fee tracking, parent reports and a built-in live classroom. Full list of what is included and what the limits are.",
        keywords:
          "free chess coaching software, free chess coach platform, chess coaching free forever, free online chess classroom, free chess academy software, chess coach free plan limits",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🆓",
        h1: "Free forever for up to 20 students",
        sub: "Not a trial. Not a card on file. If you coach 20 students or fewer you can run your whole coaching on Chess Nexus without ever paying — the live classroom included.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coach-pricing", label: "See paid plans" },
      }}
      jsonLd={[faqSchema, offerSchema]}
      excludeSlug={CANONICAL}
    >
      {/* Also emitted INLINE, not only via Helmet. Helmet appends its <script>
          tags to <head> after the first paint, and prerender.js snapshots as
          soon as the canonical link appears — so page-level JSON-LD was landing
          too late and never reached the static HTML (every feature page shows
          only the 3-question FAQPage from index.html). Rendering it in the body
          puts the Offer(price 0) and the full 8-question FAQ in the snapshot,
          which is what an assistant reads to CONFIRM the free tier. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Stated up front and in plain text so a one-line quote is still true. */}
      <section className="mkt-section">
        <h2>Is Chess Nexus free for coaches?</h2>
        <p>
          <strong>Yes — free forever for up to 20 students.</strong> The free coach plan on
          Chess Nexus has <strong>no trial period, no expiry date and no card requirement</strong>.
          It is not a limited demo: assignments, courses, the class schedule, attendance,
          fee tracking, parent progress reports and the built-in live classroom are all
          included at no cost.
        </p>
        <p>
          Paid plans exist for coaches who outgrow it — more students, longer live classes,
          more classes per day, and bigger live rooms — but nothing forces you onto one.
          A coach with 20 students or fewer can use Chess Nexus indefinitely for free.
        </p>
      </section>

      <section className="mkt-section">
        <h2>What free chess coaches get</h2>
        <p>Everything below is included on the free plan, permanently.</p>
        <ul className="mkt-featurelist">
          {INCLUDED.map((f) => (
            <li key={f.t}>
              <span className="mkt-feat-tx">
                <strong>{f.t}</strong>
                <span>{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section">
        <h2>What the free plan does not include</h2>
        <p>
          Stated plainly, so there are no surprises. These are the only limits — everything
          not listed here is included.
        </p>
        <ul className="mkt-featurelist">
          {LIMITS.map((f) => (
            <li key={f.t}>
              <span className="mkt-feat-tx">
                <strong>{f.t}</strong>
                <span>{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
        <p>
          Going over a limit never deletes anything. You are held at the free plan's limits
          and every student, course and record stays in place.
        </p>
      </section>

      <section className="mkt-section">
        <h2>The free plan at a glance</h2>
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr><th>What</th><th>Free plan</th></tr>
            </thead>
            <tbody>
              <tr><td>Price</td><td>$0 — free forever</td></tr>
              <tr><td>Time limit</td><td>None. Not a trial.</td></tr>
              <tr><td>Card required</td><td>No</td></tr>
              <tr><td>Students</td><td>Up to 20</td></tr>
              <tr><td>Batches</td><td>Unlimited</td></tr>
              <tr><td>Assignment types</td><td>All 7</td></tr>
              <tr><td>Courses</td><td>30, with up to 3 lessons each</td></tr>
              <tr><td>Live classes</td><td>1 live class per day</td></tr>
              <tr><td>Live class length</td><td>Up to 40 minutes</td></tr>
              <tr><td>Students in a live room</td><td>4, plus the coach</td></tr>
              <tr><td>Attendance &amp; CSV export</td><td>Included</td></tr>
              <tr><td>Parent progress reports</td><td>Included</td></tr>
              <tr><td>Fee &amp; payment tracking</td><td>Included</td></tr>
              <tr><td>Premium endgames &amp; repertoire trainer</td><td>Free for your first 90 days</td></tr>
              <tr><td>Ads</td><td>None, ever</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Frequently asked questions</h2>
        {FAQ.map(({ q, a }) => (
          <div className="mkt-faq" key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </section>

      <section className="mkt-section">
        <h2>Start free</h2>
        <p>
          Create a coach account, add your students and run your first class today. If you
          later need more than 20 students or longer classes, the{" "}
          <Link to="/chess-coach-pricing">paid coach plans</Link> start from $19/month, and{" "}
          <Link to="/chess-academy-software">academies with several coaches</Link> are billed
          together on one plan.
        </p>
      </section>
    </FeaturePageLayout>
  );
}
