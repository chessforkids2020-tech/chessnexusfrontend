import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/improve-at-chess";

// What the Nexus Guide actually does — described from the real feature, no hype.
const MODES = [
  {
    icon: "🔎",
    title: "It studies your own games",
    body:
      "The Nexus Guide looks through your recent tournament games — bullet, blitz or rapid — and finds the exact moments you went wrong. No setup, no uploading: it works from the games you already played on Chess Nexus.",
    appPath: "/dashboard",
    cta: "Meet your Nexus Guide",
  },
  {
    icon: "🎯",
    title: "It finds your real weaknesses",
    body:
      "Instead of random puzzles, the Guide spots the patterns you keep missing — forks, pins, skewers, hanging pieces, back-rank mates and more — and tells you which one is costing you the most games right now.",
    appPath: "/dashboard",
    cta: "See your weak spots",
  },
  {
    icon: "🚨",
    title: "It warns you about repeat mistakes",
    body:
      "When you lose to the same idea again and again, the Guide raises a clear alert — “you've lost to forks 5 times, practise this now” — so you fix the leak that's actually holding your rating back.",
    appPath: "/dashboard",
    cta: "Fix your biggest leak",
  },
  {
    icon: "♟️",
    title: "It replays your exact mistakes",
    body:
      "The Guide shows you the real position from your game — “you played Qd4 here, find the better move” — and lets you solve it yourself, with the engine's best line and a plain-English explanation of why it wins.",
    appPath: "/dashboard",
    cta: "Redo your mistakes",
  },
  {
    icon: "🏋️",
    title: "It drills the weakness for you",
    body:
      "One tap turns your weakest theme into a focused training set. You practise the exact tactic you're bad at until it sticks — the fastest way to turn a weakness into a strength.",
    appPath: "/training/healthy-mix",
    cta: "Train a weakness",
  },
  {
    icon: "📅",
    title: "It tracks your progress each month",
    body:
      "A monthly report shows your blunders per game, mistakes found and your focus area — and compares this month to last, so you can actually see yourself improving over time.",
    appPath: "/dashboard",
    cta: "See your progress",
  },
];

const FAQ = [
  {
    q: "How do I improve at chess with Chess Nexus?",
    a: "Play games on Chess Nexus, then open your dashboard — the Nexus Guide studies those games, finds the tactics you keep missing, and gives you targeted practice on your exact weaknesses. Consistent, personalised training is the fastest proven way to raise your rating.",
  },
  {
    q: "What is the Nexus Guide?",
    a: "The Nexus Guide is your personal training buddy inside Chess Nexus. It reviews your own games, points out your weaknesses, replays the exact mistakes you made, and lets you drill the themes you're weakest at — all from your real games, for free.",
  },
  {
    q: "Do I need to upload my games?",
    a: "No. The Nexus Guide works automatically from the tournament games you play on Chess Nexus — bullet, blitz or rapid. Just play, then let the Guide analyse. Nothing to import or set up.",
  },
  {
    q: "Is it really free?",
    a: "Yes. The Nexus Guide, its game analysis, weakness training and monthly progress report are all part of the free Chess Nexus platform — no ads, no paywall on improvement.",
  },
  {
    q: "How is this different from just analysing a game?",
    a: "A game analysis reviews one game you choose. The Nexus Guide is ongoing: it studies many of your games, remembers your recurring weaknesses, warns you about repeat mistakes, and builds targeted practice around them over time — more like a coach than a one-off report.",
  },
];

export default function ImproveAtChessPage() {
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
    name: "Improve at Chess — Your Personal Nexus Guide",
    description:
      "The Nexus Guide studies your own games, finds your weaknesses, replays your mistakes and drills the tactics you keep missing — a personal training buddy on Chess Nexus, free.",
    url: `https://www.chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Improve at Chess — Your Personal Nexus Guide",
        description:
          "Improve faster with the Nexus Guide: it studies your own games, finds your weak tactics, replays your mistakes and drills them for you. A free personal training buddy on Chess Nexus.",
        keywords:
          "improve at chess, how to improve at chess, get better at chess, personal chess coach, chess weakness training, chess improvement, learn from my chess games, chess training buddy",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🧭",
        h1: "Improve at Chess — Meet Your Nexus Guide",
        sub: "Most players do random puzzles and never fix what's actually losing them games. The Nexus Guide studies your own games, finds your real weaknesses, and trains you on them — your personal chess training buddy, free.",
        primary: { label: "Open your Nexus Guide", to: "/dashboard" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <h2>A training buddy that knows your game</h2>
        <p className="mkt-section-lead">
          The Nexus Guide isn't a wall of engine lines. It talks to you about
          your own play, points out what to fix first, and turns it into
          practice — the way a good coach would.
        </p>
        <div className="mkt-grid">
          {MODES.map((m) => (
            <div className="mkt-card" key={m.title}>
              <div className="mkt-card-icon">{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <Link to={m.appPath} className="mkt-card-cta">
                {m.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">📈</div>
        <div>
          <h2>Fix the leak, not the symptom</h2>
          <p>
            Rating stuck? It's usually the same handful of mistakes repeating.
            The Nexus Guide finds that pattern from your real games and drills it
            out of your play — so your improvement is targeted, not random.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Why train with the Nexus Guide</h2>
        <p className="mkt-section-lead">
          Improvement comes from working on your weaknesses, not from grinding
          puzzles you're already good at. The Nexus Guide makes that automatic:
          it studies your games, shows you exactly where you're losing points,
          and gives you focused practice to close the gap — all free, no ads.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/dashboard" className="mkt-btn mkt-btn-primary">
            Open your Nexus Guide
          </Link>
          <Link to="/analyse-my-chess-game" className="mkt-btn mkt-btn-ghost">
            Analyse a single game
          </Link>
          <Link to="/chess-puzzles" className="mkt-btn mkt-btn-ghost">
            Train tactics
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
