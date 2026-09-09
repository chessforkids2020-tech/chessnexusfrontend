import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const CANONICAL = "/members";

// Free coach roster cap — mirrors PLANS.free.maxStudents in
// backend/config/coachPlans.js. Keep the two in step if the cap ever moves.
const FREE_STUDENTS = 30;

// ── NEXUS TITLES ───────────────────────────────────────────────────────────
// Shown before the name the way a FIDE title is ("NS Hikaru") — chess players
// read a title instantly, where a "supporter badge" means nothing.
//
// Prices mirror COFFEE_TIERS_INR / COFFEE_TIERS_USD in pages/BuyMeACoffee.jsx,
// and the rules mirror TIER_TITLES + titleFor() in models/CoffeeSupporter.js.
// Keep them in step if either changes.
// What an ACTIVE SUPPORTER unlocks.
//
// This list mirrors "WHAT A SUPPORTER GETS" in backend/helpers/privileged.js —
// the single definition every feature gate reads (isPrivileged()). A supporter
// IS elite as far as access is concerned; they simply do not carry the `elite`
// role, which stays admin-granted and never expires. Keep the two in step.
const SUPPORTER_UNLOCKS = [
  { icon: "🎯", title: "Monthly Focus challenges", desc: "Create your own month-long daily challenges, with XP and a leaderboard for everyone taking part." },
  { icon: "👥", title: "Team Races", desc: "Host and run team-based puzzle races — set them up and invite players to compete." },
  { icon: "📖", title: "Opening repertoire", desc: "Unlimited cloud saves for your repertoire, instead of the standard limit." },
  { icon: "♟️", title: "Endgame trainer — no XP", desc: "The premium endgame library and playing positions out against the engine, without spending any XP." },
  { icon: "📚", title: "Books, free", desc: "Read the Chess Nexus book library at no cost." },
  { icon: "📈", title: "Weekly streak report — no XP", desc: "Your weekly progress report unlocked without spending XP on it." },
];

const NEXUS_TITLES = [
  {
    code: "NS",
    name: "Nexus Supporter",
    role: "Supports the platform",
    how: "Given to members who support Chess Nexus",
    desc: "Held by members who back the growth of Chess Nexus. NS is carried before your name wherever you play — leaderboards, chat, your profile, every race and tournament you enter.",
    accent: "ns",
  },
  {
    code: "NX",
    name: "Nexus Expert",
    role: "Supports the platform",
    how: "Given to members who support Chess Nexus",
    desc: "The senior supporter title. NX works exactly as NS does — same recognition, carried the same way, at a higher standing.",
    accent: "nx",
  },
  {
    code: "NC",
    name: "Nexus Coach",
    role: "Builds the community",
    how: "Awarded to the most active coaches — cannot be bought",
    desc: "Awarded to the coaches who build this community — teaching here regularly, bringing their own academy across, and introducing other academies and coaches to Chess Nexus. It recognises contribution, not payment, and it never expires.",
    accent: "nc",
    earned: true,
  },
];

// What every signed-up player gets, at no cost.
const USER_PERKS = [
  { icon: "🧩", title: "All puzzles & training", desc: "Daily puzzles, themed tactics, rating-band and piece-count training in Healthy Mix — solve as much as you want, with no daily limit." },
  { icon: "⚡", title: "All races", desc: "Timed Race, Arena Race and Team Race — beat the clock and climb the live leaderboards." },
  { icon: "📈", title: "Analyse your own games", desc: "Import from Lichess or Chess.com and review any game with engine evaluation, accuracy, blunder detection and a phase-by-phase breakdown. The engine runs in your browser, so analysis is unlimited and free." },
  { icon: "📚", title: "Studies & timed tests", desc: "Work through Nexus studies chapter by chapter, then sit timed study tests that grade you and track progress over time." },
  { icon: "🏆", title: "Tournaments", desc: "Join arena tournaments and compete across multiple rounds with full leaderboards." },
  { icon: "♟️", title: "Endgame trainer", desc: "Drill essential endgames from a free library of positions, then play them out against the engine at your chosen strength. A deeper premium set unlocks with the XP you earn as you play." },
  { icon: "🎮", title: "3D Arena Tournament", desc: "Play in realistic 3D tournament environments — 3D boards with atmospheric effects, camera controls and real-time spectator views." },
  { icon: "🧩✨", title: "3D Puzzle Room", desc: "Solve puzzles with friends and other players in real-time 3D puzzle rooms — collaborate, compete and learn together." },
  { icon: "💬", title: "Chat & friends", desc: "Message friends, coaches and teammates, create group chats, and see who is online right now." },
  { icon: "🏛️", title: "Clubs", desc: "Create or join chess clubs for club activities, internal tournaments, club leaderboards and team puzzle challenges." },
  { icon: "🔥", title: "Streaks, XP & badges", desc: "Build a daily practice streak, earn XP for everything you solve, and unlock achievement badges shown on your public profile." },
];

// Extra abilities Elite members unlock. Coach access is deliberately NOT listed
// here any more: coaching is free for everyone up to the free-plan cap, so
// presenting it as an Elite unlock both undersold the free plan and misled.
const ELITE_PERKS = [
  { icon: "👥", title: "Create Team Races", desc: "Set up your own team-based puzzle races and invite players to compete." },
  { icon: "🎯", title: "Create Monthly Focus challenges", desc: "Design month-long daily challenges with XP and leaderboards for the community." },
  { icon: "🧊", title: "Create 3D Arena Tournaments", desc: "Host immersive 3D arena tournaments — a premium way to run events." },
  { icon: "♟️", title: "Premium tools included", desc: "Premium endgame positions and the opening repertoire trainer are open to you without spending XP." },
];

// What coaches can do. Everything here is on the free plan unless the entry
// says otherwise — the free plan is the product, not a trial.
const COACH_PERKS = [
  { icon: "🎥", title: "Built-in live classroom", desc: "Teach inside the app — HD video, screen share and one shared board. Give a student control to play their move, load studies, endgames, puzzles or master games onto the board, and run a waiting room with raise-hand, mic and camera controls. Attendance marks itself as students join. Free plan: one 40-minute class a day with up to 4 students; paid plans remove every limit." },
  { icon: "📋", title: "Seven kinds of assignment", desc: "Puzzle topics by theme or rating band, whole studies, timed Study Tests, Timed Races, Arena Tournaments, 'find the blunder' tasks from real games, and custom positions played out against Stockfish." },
  { icon: "📚", title: "Course builder", desc: "Build a course as your curriculum — order lessons from your own studies, Nexus studies, videos, master games and endgame positions, then enrol a whole batch at once and watch progress lesson by lesson." },
  { icon: "👥", title: "Batches", desc: "Group students into batches and assign work, courses and class times to the whole group instead of one student at a time." },
  { icon: "🗓️", title: "Class schedule", desc: "Set your weekly class slots with IST times and a meeting link. Students see them on their My Coach page, and everyone is notified automatically when a slot changes." },
  { icon: "📊", title: "Track every student", desc: "See each student's solved/failed/streak, accuracy, grades and the exact moves they played — including their wrong answers, so you can teach from the mistake." },
  { icon: "📨", title: "Parent progress reports", desc: "Share a link that shows a parent how their child is doing — activity, accuracy, streaks and recent work — without the parent needing an account." },
  { icon: "📝", title: "Attendance & fees", desc: "Mark attendance, manage enrolment and record fee payments — built for running a real academy." },
  { icon: "🗂️", title: "Your coaching library", desc: "Save assignment templates, positions and games you reuse, and pull from the Nexus blunder library instead of rebuilding the same homework each term." },
  { icon: "🏁", title: "Private class activities", desc: "Run Arena Races just for your own students — your batch competes together, with nobody else in the room." },
  { icon: "💬", title: "Coach & class chat", desc: "One-to-one chat with any student plus dedicated class group chats for announcements, puzzles and feedback." },
];

function PerkList({ items }) {
  return (
    <div className="mkt-list">
      {items.map((p) => (
        <div className="mkt-list-item" key={p.title}>
          <div className="mkt-list-icon">{p.icon}</div>
          <div className="mkt-list-content">
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MembersPage() {
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chess Nexus Members",
    description:
      `What members get on Chess Nexus — every player trains free with puzzles, races, studies, tournaments, clubs and unlimited analysis of their own games; coaches run a full academy free for up to ${FREE_STUDENTS} students with a built-in live classroom, seven assignment types, courses, attendance and parent reports; Elite members can create Team Races, Monthly Focus challenges and 3D arena tournaments.`,
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <>
      <style>{`
        /* Obsidian Glass Dark Theme - Members Page */
        
        .mkt-page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 30%, #1a1a2e, #0a0a0f);
          position: relative;
        }
        
        /* Glass effect overlay */
        .mkt-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 15, 0.6);
          backdrop-filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        
        .mkt-inner {
          position: relative;
          z-index: 1;
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }
        
        /* Hero Section - Glassmorphic */
        .mkt-hero {
          text-align: center;
          padding: 2rem 1rem 3rem;
          background: rgba(20, 20, 35, 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .mkt-hero-logo {
          height: 64px;
          width: auto;
          margin-bottom: 1.5rem;
          filter: brightness(0) invert(1);
        }
        
        .mkt-hero h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          background: linear-gradient(135deg, #e2e2e2 0%, #a0a0c0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .mkt-hero-sub {
          font-size: 1.2rem;
          color: rgba(200, 200, 220, 0.8);
          max-width: 600px;
          margin: 0 auto 1.5rem;
          line-height: 1.5;
        }
        
        .mkt-free-badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.2);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #6ee7b7;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        /* Sections - Glass cards */
        .mkt-section {
          margin-bottom: 2rem;
          padding: 2rem;
          background: rgba(15, 15, 25, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          transition: all 0.3s ease;
        }
        
        .mkt-section:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(15, 15, 25, 0.5);
        }
        
        .mkt-section h2 {
          font-size: 1.8rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: #e2e2f0;
        }
        
        .mkt-section-lead {
          font-size: 1rem;
          color: rgba(200, 200, 220, 0.7);
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        /* List Layout - NO CARDS, transparent list items */
        .mkt-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .mkt-list-item {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          padding: 1rem;
          transition: all 0.2s ease;
          border-radius: 0.75rem;
        }
        
        .mkt-list-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        
        .mkt-list-icon {
          font-size: 2rem;
          flex-shrink: 0;
          min-width: 3rem;
          text-align: center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        
        .mkt-list-content {
          flex: 1;
        }
        
        .mkt-list-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #d0d0e8;
        }
        
        .mkt-list-content p {
          margin: 0;
          color: rgba(180, 180, 200, 0.8);
          line-height: 1.5;
          font-size: 0.95rem;
        }
        
        /* Callout Section - Premium glass */
        .mkt-callout {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          backdrop-filter: blur(12px);
          border: 1px solid rgba(102, 126, 234, 0.3);
          padding: 2rem;
          border-radius: 1.5rem;
          margin-top: 2rem;
        }
        
        .mkt-callout-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 8px rgba(102,126,234,0.4));
        }
        
        .mkt-callout h2 {
          margin: 0 0 0.75rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #e2e2f0;
        }
        
        .mkt-callout p {
          margin: 0 0 1rem 0;
          color: rgba(200, 200, 220, 0.85);
          line-height: 1.5;
        }
        
        .mkt-cta-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* ── Nexus title cards ── */
        .nx-titles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin: 1.25rem 0 1.5rem;
        }

        .nx-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
        }

        /* Each title gets its own accent so the four are told apart at a glance
           rather than by reading. NC is gold on purpose: it is the one that
           cannot be bought, so it should not look like another price tier. */
        .nx-knight { border-color: rgba(148,163,184,0.35); }
        .nx-ns     { border-color: rgba(6,182,212,0.40); }
        .nx-nx     { border-color: rgba(139,92,246,0.45); }
        .nx-nc     {
          border-color: rgba(245,158,11,0.55);
          background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(255,255,255,0.02));
        }

        .nx-card-top {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .nx-code {
          flex-shrink: 0;
          min-width: 3rem;
          height: 2.5rem;
          padding: 0 0.6rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.6rem;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          background: rgba(0,0,0,0.35);
        }

        .nx-knight .nx-code { color: #cbd5e1; }
        .nx-ns .nx-code     { color: #67e8f9; }
        .nx-nx .nx-code     { color: #c4b5fd; }
        .nx-nc .nx-code     { color: #fcd34d; }

        .nx-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #e2e8f0;
        }

        /* The role label, not a tagline: it states what the title RECOGNISES,
           so it is set as a small caps-style descriptor rather than sales copy. */
        .nx-role {
          margin: 0.2rem 0 0;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
          opacity: 0.85;
        }

        .nx-desc {
          margin: 0 0 1rem;
          font-size: 0.86rem;
          line-height: 1.6;
          color: #9ca3af;
          flex: 1;
        }

        /* How the title is obtained. Sits where a price used to: this page
           explains what the titles ARE and how they work — the amounts belong on
           /buy-coffee, whose job is to take a payment. */
        .nx-how {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1.45;
          color: #9ca3af;
        }

        .nx-nc .nx-how { color: #fcd34d; }

        .nx-sub {
          margin: 1.75rem 0 0.35rem;
          font-size: 1rem;
          font-weight: 800;
          color: #e2e8f0;
        }

        .nx-sub-lead {
          margin: 0 0 1rem;
          font-size: 0.88rem;
          line-height: 1.6;
          color: #9ca3af;
        }

        .nx-notes {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          padding: 1rem 1.15rem;
          border-radius: 0.9rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 1.25rem;
        }

        .nx-notes p {
          margin: 0;
          font-size: 0.86rem;
          line-height: 1.65;
          color: #9ca3af;
        }

        .nx-notes b { color: #e2e8f0; }
        
        .mkt-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .mkt-btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .mkt-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .mkt-btn-ghost {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(4px);
          color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.15);
        }
        
        .mkt-btn-ghost:hover {
          background: rgba(255,255,255,0.15);
        }
        
        /* Scrollbar for dark theme */
        .mkt-page::-webkit-scrollbar {
          width: 8px;
        }
        
        .mkt-page::-webkit-scrollbar-track {
          background: #0a0a0f;
        }
        
        .mkt-page::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: var(--radius-sm);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .mkt-inner {
            padding: 1rem 1rem 3rem;
          }
          
          .mkt-hero h1 {
            font-size: 1.8rem;
          }
          
          .mkt-hero-sub {
            font-size: 1rem;
          }
          
          .mkt-section {
            padding: 1.25rem;
          }
          
          .mkt-section h2 {
            font-size: 1.4rem;
          }
          
          .mkt-list-item {
            gap: 0.875rem;
            padding: 0.75rem;
          }
          
          .mkt-list-icon {
            font-size: 1.5rem;
            min-width: 2.5rem;
          }
          
          .mkt-list-content h3 {
            font-size: 1rem;
          }
          
          .mkt-callout {
            flex-direction: column;
            padding: 1.5rem;
          }
          
          .mkt-callout-icon {
            font-size: 2rem;
          }
        }
        
        @media (max-width: 480px) {
          .mkt-cta-row {
            flex-direction: column;
          }
          
          .mkt-btn {
            text-align: center;
          }
        }
      `}</style>
      
      <div className="mkt-page">
        <SEO
          title="Members — Players, Coaches & Elite on Chess Nexus"
          description={`What you get on Chess Nexus: every player trains free — puzzles, races, studies, tournaments, clubs and unlimited analysis of their own games. Coaches run an academy free for up to ${FREE_STUDENTS} students, with a live classroom, seven assignment types, courses, attendance and parent reports.`}
          keywords="chess nexus members, free chess training, chess coach platform, free chess coaching software, chess course builder, chess attendance, parent progress reports, create team race, monthly focus challenge, 3d arena tournament, 3d puzzle room, chess clubs"
          canonical={CANONICAL}
        />
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        </Helmet>

        <div className="mkt-inner">
          <header className="mkt-hero">
            <img src="/logo.png" alt="Chess Nexus logo" className="mkt-hero-logo" />
            <h1>Membership on Chess Nexus</h1>
            <p className="mkt-hero-sub">
              Every player gets the whole training platform free. Coaches run their
              academy free for up to {FREE_STUDENTS} students, and Elite members
              unlock extra ways to create and host.
            </p>
            <div className="mkt-free-badge">✅ Free to play · free to coach · no card required</div>
          </header>

          {/* ── All users ── */}
          <section className="mkt-section" aria-label="What every player gets">
            <h2>👤 Every player</h2>
            <p className="mkt-section-lead">
              Sign up and start training — puzzles, races, studies, tournaments,
              clubs and analysis of your own games are all free, with no daily
              caps and no card. The only things behind a gate are the premium
              endgame set and the repertoire trainer, and XP you earn by playing
              opens those too.
            </p>
            <PerkList items={USER_PERKS} />
          </section>

          {/* ── Coaches ── */}
          <section className="mkt-section" aria-label="What coaches can do">
            <h2>🎓 Coaches</h2>
            <p className="mkt-section-lead">
              Run your whole coaching operation here — classroom, curriculum,
              homework, attendance and parent reports. It is{" "}
              <strong>free forever for up to {FREE_STUDENTS} students</strong>:
              not a trial, no time limit and no card on file. Paid plans raise the
              roster cap and lift every limit on the live classroom.
            </p>
            <PerkList items={COACH_PERKS} />
          </section>

          {/* ── Elite users ── */}
          <section className="mkt-section" aria-label="What elite members can do">
            <h2>⭐ Elite members</h2>
            <p className="mkt-section-lead">
              Elite is a small invited role for people who help run the community.
              Elite members get everything above, plus the power to create and host
              events for everyone else. Holding a Nexus title unlocks these same
              abilities — the difference is that Elite is granted by us and never
              expires, while a title is self-serve and lasts as long as you hold it.
            </p>
            <PerkList items={ELITE_PERKS} />
          </section>

          {/* ── Nexus titles ──
              These titles are carried beside names all over the app, and nothing
              explained them anywhere — a new player saw "NC bb" on a leaderboard
              with no way to find out what it meant.

              Framing matters here: an earlier draft called them "letters before
              some names", which reduces a title to typography. Chess players care
              about titles specifically, so the copy names them as titles — held,
              carried and addressed by — never as decoration. */}
          <section className="mkt-section" aria-label="Nexus titles explained">
            <h2>🎖️ Nexus titles — NS, NX and NC</h2>
            <p className="mkt-section-lead">
              Chess Nexus has its own titles — <b>NS</b>, <b>NX</b> and <b>NC</b> —
              which recognise the different roles people play in this community.
            </p>
            <p className="mkt-section-lead">
              Like any chess title, they are carried before your name wherever you
              play on Chess Nexus: <b>NS Hikaru</b>. Each one marks a different way a
              member contributes to the platform and represents it to everyone else.
            </p>

            <div className="nx-titles">
              {NEXUS_TITLES.map((t) => (
                <div className={`nx-card nx-${t.accent}`} key={t.name}>
                  <div className="nx-card-top">
                    <span className="nx-code" aria-hidden="true">{t.code}</span>
                    <div>
                      <h3 className="nx-name">{t.name}</h3>
                      <p className="nx-role">{t.role}</p>
                    </div>
                  </div>

                  <p className="nx-desc">{t.desc}</p>

                  <div className="nx-how">
                    <span aria-hidden="true">{t.earned ? "🏅" : "⭐"}</span> {t.how}
                  </div>
                </div>
              ))}
            </div>

            {/* What the title actually unlocks. The page previously implied a
                Nexus title was recognition only, while the Elite section above
                listed the same abilities as elite-exclusive — which undersold
                the titles and was simply wrong: see helpers/privileged.js. */}
            <h3 className="nx-sub">What a Nexus title unlocks</h3>
            <p className="nx-sub-lead">
              NS and NX open the same tools the Elite role does, for as long as the
              title is held:
            </p>
            <PerkList items={SUPPORTER_UNLOCKS} />

            <div className="nx-notes">
              <p>
                <b>NS and NX work the same way.</b> Both are supporter titles: you
                choose one, it is carried before your name across the whole platform,
                and NX simply sits above NS. <b>NC is different in kind</b> — it is
                awarded, never bought, so a coach who also supports us still carries
                NC, because it is the one that has to be earned.
              </p>
              <p>
                <b>♞ The Knight.</b> Members who support us at the entry level carry a
                knight beside their name instead of initials — the same recognition,
                without a lettered title.
              </p>
              <p>
                <b>What NC coaches get.</b> The title itself, which never expires,
                plus Chess Nexus coaching tools free for up to two years — the full
                coach plan, with the student cap and live-class limits lifted. The
                exact length is set when the title is awarded.
              </p>
              <p>
                <b>Are you an active coach here?</b> NC is awarded, not sold — but you
                can put yourself forward. If you teach regularly on Chess Nexus, run
                your academy here, or introduce other academies and coaches to the
                platform, open <Link to="/chat">your chat with the Nexus team</Link>{" "}
                and apply for your Nexus Coach title. We reply in the same conversation.
              </p>
              <p>
                <b>👑 Founding Supporter.</b> The first supporters carry a permanent
                crown beside their name. Unlike the titles above, it never expires —
                it was promised as permanent and it stays that way.
              </p>
              <p>
                <b>How long a title lasts.</b> You choose 1, 3, 6 or 12 months at
                checkout. It is a one-time payment with no auto-renewal — when the
                period ends the title simply stops showing, and you can renew whenever
                you like.
              </p>
              <p>
                <b>Never an advantage at the board.</b> A title unlocks tools for
                running things — challenges, races, your repertoire — but no extra
                moves and no edge over the person you are playing. Every puzzle,
                race, study and tournament here stays free for everyone.
              </p>
            </div>

            <div className="mkt-cta-row">
              <Link to="/nexus-supporter" className="mkt-btn mkt-btn-primary">
                See who holds a title
              </Link>
              <Link to="/buy-coffee" className="mkt-btn">
                Become a supporter
              </Link>
            </div>
          </section>

          {/* ── Collaboration / become Elite ── */}
          <div className="mkt-callout">
            <span className="mkt-callout-icon">🤝</span>
            <div>
              <h2>Teach on Chess Nexus</h2>
              <p>
                If you coach, you can move your whole academy here today — roster,
                classes, homework, attendance and parent reports — free for up to{" "}
                {FREE_STUDENTS} students, with no card and no trial clock. Hosting
                tournaments or partnering with us instead? Get in touch.
              </p>
              <div className="mkt-cta-row">
                <Link to="/chess-coaching" className="mkt-btn mkt-btn-primary">
                  Start coaching free
                </Link>
                <Link to="/chess-coach-pricing" className="mkt-btn mkt-btn-ghost">
                  See coach plans
                </Link>
                <Link to="/contact" className="mkt-btn mkt-btn-ghost">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}