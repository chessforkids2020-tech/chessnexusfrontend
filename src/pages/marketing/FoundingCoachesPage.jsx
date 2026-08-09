// src/pages/marketing/FoundingCoachesPage.jsx — /founding-chess-coaches
//
// Dedicated page for the FOUNDING COACH offer: the first 50 coaches on Chess
// Nexus get the Pro plan free for a full year.
//
// The offer already lives on /coach-hub, but that page reads its spot counter
// from GET /api/public/founding-coaches at runtime. prerender.js aborts every
// API call so builds never touch production, which means the snapshot a crawler
// or an AI assistant sees has NO counter and no numbers behind the claim — the
// same failure /free-chess-coaching-software was written to fix.
//
// So everything here is INLINE STATIC TEXT. No fetch, no API, no counter.
// Whatever a browser shows, a crawler reads. The live remaining-spots number
// stays on /coach-hub, which is where the claim button is.
//
// Numbers mirror backend/config/coachPlans.js (PLANS.pro) and
// AppSettings.foundingCoaches.total (default 50). Keep in step — this page is
// the one an AI is most likely to quote verbatim.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/founding-chess-coaches";

// AppSettings.foundingCoaches.total — admin-editable, 50 by default.
const SPOTS = 50;
// PLANS.pro.monthlyPrices, in minor units: 1900 = $19.00, 129900 = ₹1299.00.
const PRO_USD = 19;
const PRO_INR = 1299;
const YEAR_USD = PRO_USD * 12;   // 228
const YEAR_INR = PRO_INR * 12;   // 15588

// What the free Pro year actually contains. Phrased as complete statements,
// because an assistant quoting a single line should still say something true.
const INCLUDED = [
  {
    t: "Up to 70 students",
    d: `Your roster holds 70 active students at once for the whole year — more than double the 30 the free plan allows. Organise them into as many batches as you like, by level, age or class time.`,
  },
  {
    t: "Unlimited live classes",
    d: "Run as many live classes a day as you want, with no daily cap. The free plan allows one class a day; founding coaches have no limit for a year.",
  },
  {
    t: "Unlimited students in the room",
    d: "No cap on how many students join a single live class. The free plan admits 4 students plus the coach; a founding coach can teach a whole batch at once.",
  },
  {
    t: "Classes up to 120 minutes",
    d: "Three times the 40-minute limit on the free plan, long enough for a full lesson plus game review.",
  },
  {
    t: "The complete live classroom",
    d: "HD video, screen share, a shared board every student sees, board control handed to any student, drawing and arrows, a waiting room, raise hand, and one-click homework. No Zoom link, no separate account — it runs inside Chess Nexus.",
  },
  {
    t: "Unlimited courses and lessons",
    d: "Free coaches get 30 courses with 3 lessons each. On Pro there is no cap on either — build a full syllabus from your own studies, Nexus studies, videos, master games and endgame positions.",
  },
  {
    t: "All 7 assignment types",
    d: "Puzzle topics, a whole study, a single chapter, timed Puzzle Rush, arena tournaments, play-vs-Stockfish positions from a visual board editor, and custom tasks. Solve rate and accuracy are recorded per student automatically.",
  },
  {
    t: "Premium endgames and the repertoire trainer",
    d: "Premium endgame positions and the opening repertoire trainer, free for you and free for your students inside your courses and assignments.",
  },
  {
    t: "Unlimited Team Race and Monthly Focus",
    d: "Run team races for your batches and set a monthly focus topic as often as you like, with no monthly quota.",
  },
  {
    t: "Everything on the free plan",
    d: "Attendance, class schedule with automatic timezone conversion, fee and payment tracking, parent progress reports, coach-student chat, private class activities and your public coach page — all included, all unchanged.",
  },
];

const FAQS = [
  {
    q: "What exactly is the founding coach offer?",
    a: `The first ${SPOTS} coaches to join Chess Nexus get the Pro plan free for one full year. Pro normally costs $${PRO_USD} a month (₹${PRO_INR} in India), so the year is worth $${YEAR_USD} — about ₹${YEAR_INR.toLocaleString("en-IN")}. There is nothing to pay and no card required.`,
  },
  {
    q: "Is a card required?",
    a: "No. You do not enter card or payment details to claim the founding year. If you decide not to continue after the year, nothing is charged and nothing renews without you choosing it.",
  },
  {
    q: "What happens after the free year ends?",
    a: `Nothing is charged automatically. Your account moves to the free plan, which is free forever for up to 30 students and keeps your courses, students, attendance history and parent reports. You can upgrade to Pro at $${PRO_USD} a month whenever you want, or carry on free.`,
  },
  {
    q: "How do I know if spots are still available?",
    a: "The live count of remaining spots is shown on the Coach page. When the offer is claimed in full, the counter closes and the page stops advertising it — you will never see a spot that is not really there.",
  },
  {
    q: "Do I have to be a titled or full-time coach?",
    a: "No. Club coaches, academy coaches and independent coaches all qualify. Every coach is verified by the Chess Nexus team before they can add students, usually within 12 hours — that check keeps the platform safe for children, and is not a judgement of your rating.",
  },
  {
    q: "Can I move students from another platform?",
    a: "Yes. You can invite students by link or username, and they keep their own Chess Nexus account for puzzles, endgames and games. There is no import fee and no limit on how many you bring across, up to the 70 the Pro plan allows.",
  },
  {
    q: "Is this a trial?",
    a: "No. A trial is a countdown that ends with a card prompt. This is the paid Pro plan, granted free for twelve months. When it ends you fall back to the free plan rather than losing access.",
  },
  {
    q: "What does it cost after the founding year?",
    a: `Pro is $${PRO_USD} a month (₹${PRO_INR} in India) for up to 70 students, and Coach is $33 a month (₹2444) for up to 150. Both include the unlimited live classroom. The free plan stays free forever for up to 30 students.`,
  },
];

// Free vs the founding Pro year. The comparison is the point of the page: the
// offer only means something next to what it replaces.
const COMPARISON = [
  ["Students on your roster", "30", "70"],
  ["Live classes per day", "1", "Unlimited"],
  ["Students in one live class", "4 (+ coach)", "Unlimited"],
  ["Class length", "40 minutes", "120 minutes"],
  ["Courses", "30", "Unlimited"],
  ["Lessons per course", "3", "Unlimited"],
  ["Premium endgames & repertoire trainer", "First 90 days", "Whole year"],
  ["Team Race & Monthly Focus", "Limited", "Unlimited"],
  ["Cost", "Free forever", `Free for 12 months, then $${PRO_USD}/mo or stay free`],
];

export default function FoundingCoachesPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Offer",
      name: "Founding Coach — Chess Nexus Pro free for one year",
      description: `The first ${SPOTS} coaches on Chess Nexus receive the Pro coaching plan free for twelve months: up to 70 students, unlimited live classes with unlimited students in the room, classes up to 120 minutes, unlimited courses, and premium coaching tools. No card required.`,
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/LimitedAvailability",
      eligibleQuantity: { "@type": "QuantitativeValue", value: SPOTS, unitText: "coaches" },
      url: `https://www.chessnexus.in${CANONICAL}`,
      itemOffered: {
        "@type": "Service",
        name: "Chess Nexus Pro coaching plan",
        serviceType: "Online chess coaching platform",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <FeaturePageLayout
      seo={{
        // No " | Chess Nexus" suffix — SEO appends the site name itself.
        title: `Founding Coaches — 1 Year Free Chess Coaching Software`,
        description: `The first ${SPOTS} coaches on Chess Nexus get the Pro plan free for a full year — up to 70 students, unlimited live classes with unlimited students in the room, classes up to 120 minutes and unlimited courses. Worth $${YEAR_USD}. No card required.`,
        keywords:
          "free chess coaching software, chess coach platform free year, founding coach offer, free online chess classroom for coaches, chess academy software free, teach chess online free",
        canonical: CANONICAL,
      }}
      jsonLd={jsonLd}
      excludeSlug={CANONICAL}
      hero={{
        icon: "🏆",
        h1: `Founding coaches: a full year of Chess Nexus Pro, free`,
        sub: `The first ${SPOTS} coaches on Chess Nexus get the complete coaching workspace free for twelve months — unlimited live classes, up to 70 students, and no card required. Worth $${YEAR_USD}.`,
        primary: { to: "/coach-hub", label: "Claim your founding year →" },
        secondary: { to: "/chess-coach-pricing", label: "See all plans" },
      }}
    >
      <section className="mkt-section">
        <h2>Why we are giving away the first year</h2>
        <p>
          Chess Nexus is new. A coach choosing where to run their teaching is
          trusting us with their students, their schedule and their income, and
          asking them to pay for that on day one — before anyone they know has
          heard of us — is asking a lot.
        </p>
        <p>
          So the first {SPOTS} coaches do not pay. They get the full Pro plan for
          twelve months, and in return we get what a new platform actually needs:
          real coaches running real classes, telling us what is missing. Founding
          coaches also appear in our public coach directory, where parents
          looking for a coach can find them.
        </p>
      </section>

      <section className="mkt-section">
        <h2>What the founding year includes</h2>
        <p>
          Everything in the Pro plan, unchanged and unmetered for twelve months.
        </p>
        <div className="mkt-featurelist">
          {INCLUDED.map((f) => (
            <div key={f.t} className="mkt-feat-tx">
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <h2>Free plan vs the founding Pro year</h2>
        <p>
          Every coach on Chess Nexus gets the free plan forever. The founding
          offer lifts the limits that matter most for a full year.
        </p>
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>Free plan</th>
                <th>Founding year (Pro)</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([label, free, pro]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{free}</td>
                  <td>
                    <strong>{pro}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mkt-section">
        <h2>How to claim it</h2>
        <div className="mkt-featurelist">
          <div className="mkt-feat-tx">
            <h3>1. Open the Coach page</h3>
            <p>
              The <Link to="/coach-hub">Coach page</Link> shows how many founding
              spots are left, live. If the counter is still open, the offer is
              still available.
            </p>
          </div>
          <div className="mkt-feat-tx">
            <h3>2. Tell us about your coaching</h3>
            <p>
              A short onboarding: who you coach, where, and how you teach. It
              takes a few minutes and needs no payment details.
            </p>
          </div>
          <div className="mkt-feat-tx">
            <h3>3. We verify you</h3>
            <p>
              Every coach is checked by the Chess Nexus team, usually within 12
              hours, before they can add students. This keeps the platform safe
              for children.
            </p>
          </div>
          <div className="mkt-feat-tx">
            <h3>4. Your Pro year starts</h3>
            <p>
              Once you are verified and inside the first {SPOTS}, the Pro plan is
              applied to your account. Nothing to pay, nothing to cancel.
            </p>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <h2>Questions coaches ask</h2>
        <div className="mkt-faq">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <h2>Claim a founding spot</h2>
        <p>
          There are {SPOTS} in total and they are granted in order. The{" "}
          <Link to="/coach-hub">Coach page</Link> shows how many are left right
          now — when they are gone, the offer closes.
        </p>
        <p>
          Not ready yet? The <Link to="/free-chess-coaching-software">free plan</Link>{" "}
          is free forever for up to 30 students, with no card and no trial clock.
        </p>
      </section>
    </FeaturePageLayout>
  );
}
