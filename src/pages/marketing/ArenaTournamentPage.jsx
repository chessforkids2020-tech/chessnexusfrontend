import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { launch3DArena } from "../../utils/open3DArena";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/3d-chess-arena-tournament";

const FAQ = [
  {
    q: "What is the 3D Chess Arena?",
    a: "It's an immersive, real-time online chess experience where you join as an avatar, walk into tournament halls and a puzzle hall, and play or solve alongside other players live — like stepping into a virtual chess club.",
  },
  {
    q: "How do 3D arena tournaments work?",
    a: "Enter the lobby, walk into the hall and choose a tournament. When it starts you're paired automatically, your avatar takes its seat at the table and you play a real-time game against your opponent.",
  },
  {
    q: "What is the Puzzle Hall?",
    a: "The Puzzle Hall is a space inside the 3D arena with five stages of puzzles, from basic to advanced. Players walk in together and solve with live submissions, a live leaderboard and real-time chat.",
  },
  {
    q: "Can I chat with other players while I play?",
    a: "Yes. You can chat with friends and other players in real time while you solve puzzles or wait between rounds, so the arena always feels social and alive.",
  },
];

export default function ArenaTournamentPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  // The 3D Arena is a live external app (3darena.chessnexus.in) sharing Chess Nexus
  // login — launch it via SSO. Logged-out visitors are sent to login first.
  const enterArena = () => launch3DArena({ user, loading, navigate });

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
    name: "3D Chess Arena — Immersive Real-Time Tournaments & Puzzle Hall",
    description:
      "Step into an immersive 3D chess arena as an avatar. Join real-time tournaments in the hall and solve tactics in a 5-stage Puzzle Hall with live leaderboards and chat. Free, no ads.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "3D Chess Arena — Immersive Real-Time Tournaments & Puzzle Hall",
        description:
          "Step into a 3D chess arena as your own avatar. Walk into the tournament hall for real-time games, or the 5-stage Puzzle Hall to solve tactics with live leaderboards and chat — free, no ads.",
        keywords:
          "3d chess, 3d chess arena, immersive chess, real-time chess tournament, online chess tournament, chess avatar, chess puzzle hall, live chess leaderboard, multiplayer chess",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🏟️",
        h1: "3D Chess Arena — Play & Solve in Real Time",
        sub: "Step into a fully immersive 3D world as your own avatar. Walk into the tournament hall for real-time games at the table, or head to the Puzzle Hall to solve tactics alongside other players — with live leaderboards and chat throughout.",
        primary: { label: "Enter the 3D Arena", onClick: enterArena },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <div className="mkt-split mkt-split-reverse">
          <div className="mkt-split-media">
            <img src="/features/3darena.png" alt="3D Chess Arena — immersive real-time tournaments and puzzle hall" loading="lazy" width="220" height="220" />
          </div>
          <div className="mkt-split-text">
            <h2>Inside the 3D Arena</h2>
            <p>
              It's not just a board on a screen — it's a place you walk into, play and
              solve in, alongside real people in real time.
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🚪</span>
                <span className="mkt-feat-tx">
                  <strong>Walk into the tournament hall</strong>
                  <span>Enter as your own avatar, just like walking into a real chess club — check the notice board for live events and pick one to join.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">♟️</span>
                <span className="mkt-feat-tx">
                  <strong>Play live at the table</strong>
                  <span>When a tournament starts you're paired instantly — your avatar sits down and plays a real-time game, the closest thing to over-the-board chess online.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🧩</span>
                <span className="mkt-feat-tx">
                  <strong>Puzzle Hall — 5 stages</strong>
                  <span>Climb from basic to advanced. Every solve is submitted live and the leaderboard updates in real time so you see exactly where you stand.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">💬</span>
                <span className="mkt-feat-tx">
                  <strong>Chat &amp; social buzz</strong>
                  <span>Chat with friends and other players in real time — the social feel of a real chess event, online and in 3D.</span>
                </span>
              </li>
            </ul>
            <button type="button" className="mkt-card-cta" onClick={enterArena}>
              Enter the arena →
            </button>
          </div>
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">🗓️</div>
        <div>
          <h2>A different tournament every day</h2>
          <p>
            Arena tournaments are scheduled daily at different times, so there's
            always a live event to walk into no matter when you play. Check the
            hall, pick a slot that suits you and battle for the top of the
            leaderboard.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Why play in the 3D Arena</h2>
        <p className="mkt-section-lead">
          Online chess can feel flat and lonely. The 3D Arena brings back the
          atmosphere of a real tournament hall — walking in, sitting down across the
          board, racing through puzzles with the room and chatting between rounds.
          It's competitive, social and genuinely fun, free with no ads.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <button type="button" onClick={enterArena} className="mkt-btn mkt-btn-primary">
            Enter the 3D Arena
          </button>
          <Link to="/chess-puzzles" className="mkt-btn mkt-btn-ghost">
            Train with puzzles first
          </Link>
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
