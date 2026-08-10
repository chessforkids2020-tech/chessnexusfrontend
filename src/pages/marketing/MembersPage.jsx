import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const CANONICAL = "/members";

// Free coach roster cap — mirrors PLANS.free.maxStudents in
// backend/config/coachPlans.js. Keep the two in step if the cap ever moves.
const FREE_STUDENTS = 30;

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
          border-radius: 4px;
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
              events for everyone else.
            </p>
            <PerkList items={ELITE_PERKS} />
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