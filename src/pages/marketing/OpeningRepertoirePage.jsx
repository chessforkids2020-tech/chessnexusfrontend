// src/pages/marketing/OpeningRepertoirePage.jsx — /chess-opening-repertoire
//
// SEO page for the repertoire trainer. Targets "chess opening repertoire builder",
// "practice my chess openings", "spaced repetition chess openings".
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-opening-repertoire";

const MODES = [
  { icon: "🏗️", t: "Build", d: "Play your line on the board with the master explorer open beside it — see what strong players actually chose at each point — then save it as your line. Add comments and variations as you go." },
  { icon: "🎯", t: "Train", d: "Spaced-repetition drilling of the lines that are due. You play your side's moves from memory; anything you get wrong comes back sooner." },
  { icon: "🔍", t: "Check", d: "Scan your real games for the moment you left your own preparation — the exact move where you deviated, and what your line said instead." },
];

const FAQ = [
  {
    q: "What is a chess opening repertoire trainer?",
    a: "It's a tool for storing the openings you intend to play and then drilling them until you can reproduce them from memory. Chess Nexus lets you build lines on the board, train the ones that are due using spaced repetition, and scan your real games to find where you left your preparation.",
  },
  {
    q: "How does the training decide what to show me?",
    a: "Spaced repetition. Lines you've just got right come back later; lines you got wrong come back sooner. That means your practice time goes to the moves you're actually shaky on rather than the ones you already know.",
  },
  {
    q: "Can it tell me where I went wrong in a real game?",
    a: "Yes. Check mode scans your games and finds the exact move where you deviated from your own repertoire, and shows what your line said you should have played.",
  },
  {
    q: "Is the repertoire trainer free?",
    a: "It's a premium tool. It's free for Chess Nexus supporters and for coaches on a paid plan, and free coaches get it during their first three months. It can also be unlocked with XP earned by playing.",
  },
];

export default function OpeningRepertoirePage() {
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
        title: "Chess Opening Repertoire Builder & Trainer",
        description:
          "Build your chess opening repertoire on the board with a master explorer beside it, drill it with spaced repetition, and scan your real games to find exactly where you left your preparation.",
        keywords:
          "chess opening repertoire, opening repertoire builder, practice chess openings, spaced repetition chess, chess opening trainer, memorise chess openings",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "📖",
        h1: "Build a repertoire — then actually remember it",
        sub:
          "Save the lines you intend to play, drill them with spaced repetition, and find the exact move where you left your prep in real games.",
        primary: { to: "/masters-chess-games", label: "Open the repertoire trainer" },
        secondary: { to: "/features", label: "See all features" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="Three modes">
        <h2>Three modes, one loop</h2>
        <p className="mkt-section-lead">
          Most players collect opening knowledge and never test it. This closes the
          loop: build a line, drill it, then check whether it survived contact with a
          real game.
        </p>
        <ul className="mkt-featurelist">
          {MODES.map((m) => (
            <li key={m.t}>
              <span className="mkt-feat-ic" aria-hidden="true">{m.icon}</span>
              <span className="mkt-feat-tx">
                <strong>{m.t}</strong>
                <span>{m.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section" aria-label="Why it works">
        <h2>Why "I know this opening" usually isn't true</h2>
        <p className="mkt-p">
          Reading a line and recalling it under a clock are different skills. Spaced
          repetition targets the second one: the lines you keep getting wrong come
          back more often, and the ones you know drop away — so practice time goes
          where it's actually needed. Check mode then tells you whether it worked,
          using your own games rather than your impression of them.
        </p>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Repertoire FAQ</h2>
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
        <h2>Start your repertoire</h2>
        <div className="mkt-cta-row">
          <Link to="/masters-chess-games" className="mkt-btn mkt-btn-primary">Open the trainer</Link>
          <Link to="/chess-endgame-training" className="mkt-btn">Endgame training</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
