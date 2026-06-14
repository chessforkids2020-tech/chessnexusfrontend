import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const CANONICAL = "/members";

// What every signed-up user can do (all free).
const USER_PERKS = [
  { icon: "🧩", title: "All puzzles & training", desc: "Daily puzzles, themed tactics, rating-band and piece-count training in Healthy Mix — solve as much as you want." },
  { icon: "⚡", title: "All races", desc: "Timed Race, Arena Race and Team Race — beat the clock and climb the live leaderboards." },
  { icon: "📈", title: "Game analysis", desc: "Review your games with engine evaluation, accuracy and phase-by-phase breakdowns." },
  { icon: "📚", title: "Study & tests", desc: "Browse studies, work through chapters and take timed study tests to track your progress." },
  { icon: "🏆", title: "Tournaments", desc: "Join arena tournaments and compete across multiple rounds with full leaderboards." },
  { icon: "🎮", title: "3D Arena Tournament Experience", desc: "Immerse yourself in realistic 3D tournament environments — play chess on stunning 3D boards with atmospheric effects, camera controls, and real-time spectator views." },
  { icon: "🧩✨", title: "3D Puzzle Room", desc: "Solve puzzles with friends and other players in real-time 3D puzzle rooms. Collaborate, compete, and learn together in an immersive spatial puzzle environment." },
  { icon: "💬", title: "Social Hub — Group Chats", desc: "Create and join group chats with friends, coaches, and teammates. Share strategies, discuss games, and stay connected with the chess community." },
  { icon: "🏛️", title: "Clubs", desc: "Create or join chess clubs to participate in exclusive club activities, internal tournaments, club leaderboards, and team-based puzzle challenges." },
];

// Extra abilities Elite members unlock.
const ELITE_PERKS = [
  { icon: "🎓", title: "Coach access — free", desc: "Work with a coach on the platform at no cost as an Elite member." },
  { icon: "👥", title: "Create Team Races", desc: "Set up your own team-based puzzle races and invite players to compete." },
  { icon: "🎯", title: "Create Monthly Focus challenges", desc: "Design month-long daily challenges with XP and leaderboards for the community." },
  { icon: "🧊", title: "Create 3D Arena Tournaments", desc: "Host immersive 3D arena tournaments — a premium way to run events." },
];

// What coaches can do.
const COACH_PERKS = [
  { icon: "📋", title: "Assign structured work", desc: "Give students puzzle topics, timed Study Tests, Timed Races and 'find the blunder' tasks." },
  { icon: "📊", title: "Track every student", desc: "See each student's solved/failed/streak, accuracy, grades and the exact answers they submitted." },
  { icon: "📝", title: "Attendance & payments", desc: "Mark attendance, manage enrollment and record payments — built for running real classes." },
  { icon: "🔗", title: "Manage your roster", desc: "Add students, handle join requests and keep everyone's progress in one place." },
  { icon: "👥", title: "Coach Group Chats", desc: "Create dedicated group chats for your students. Send announcements, share puzzles, and provide real-time feedback to your entire class." },
  { icon: "🏛️", title: "Manage Club Activities", desc: "Create and manage chess clubs, organize club tournaments, track member participation, and foster a thriving community around your coaching." },
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
      "What members can do on Chess Nexus — every user can play all activities for free, Elite members unlock coach access, Team Races, Monthly Focus challenges and 3D arena tournaments, and coaches can assign and track student work.",
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
          title="Members — Users, Elite & Coaches on Chess Nexus"
          description="See what every member can do on Chess Nexus: all users play every activity free; Elite members get free coach access, Team Races, Monthly Focus challenges and 3D arena tournaments; coaches assign and track student work."
          keywords="chess nexus members, elite chess membership, chess coach platform, create team race, monthly focus challenge, 3d arena tournament, 3d puzzle room, chess clubs, group chat"
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
              Everyone gets the full platform for free. Elite members and coaches
              unlock extra ways to create, host and teach.
            </p>
            <div className="mkt-free-badge">✅ Every core activity is free for all members</div>
          </header>

          {/* ── All users ── */}
          <section className="mkt-section" aria-label="What every user can do">
            <h2>👤 Every user</h2>
            <p className="mkt-section-lead">
              Sign up and explore the whole app — every user can use all features
              and play all activities, completely free.
            </p>
            <PerkList items={USER_PERKS} />
          </section>

          {/* ── Elite users ── */}
          <section className="mkt-section" aria-label="What elite members can do">
            <h2>⭐ Elite members</h2>
            <p className="mkt-section-lead">
              Elite members get everything above, plus the power to create and host
              for the whole community.
            </p>
            <PerkList items={ELITE_PERKS} />
          </section>

          {/* ── Coaches ── */}
          <section className="mkt-section" aria-label="What coaches can do">
            <h2>🎓 Coaches</h2>
            <p className="mkt-section-lead">
              Coaches run their classes on Chess Nexus — assign work, track
              progress and manage attendance and payments.
            </p>
            <PerkList items={COACH_PERKS} />
          </section>

          {/* ── Collaboration / become Elite ── */}
          <div className="mkt-callout">
            <span className="mkt-callout-icon">🤝</span>
            <div>
              <h2>Want to collaborate or become an Elite member?</h2>
              <p>
                Interested in coaching on Chess Nexus, hosting tournaments, or
                partnering with us? Reach out — we'd love to work with you and help
                you become an Elite member.
              </p>
              <div className="mkt-cta-row">
                <Link to="/contact" className="mkt-btn mkt-btn-primary">
                  Contact us to collaborate
                </Link>
                <Link to="/features" className="mkt-btn mkt-btn-ghost">
                  See all features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}