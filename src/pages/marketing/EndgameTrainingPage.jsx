// src/pages/marketing/EndgameTrainingPage.jsx — /chess-endgame-training
//
// Standalone SEO page for endgame training. Targets "chess endgame training",
// "practice chess endgames online", "rook endgame practice".
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-endgame-training";

// The eight families the endgame browser groups positions into.
const FAMILIES = [
  { icon: "♙", t: "Pawn endgames", d: "Opposition, key squares, breakthroughs — the foundation everything else rests on." },
  { icon: "♖", t: "Rook endgames", d: "The most common endgame in real games. Lucena, Philidor, and the practical positions that decide club games." },
  { icon: "♗", t: "Bishop endgames", d: "Same-colour and opposite-colour bishops, and why the second is so often drawn." },
  { icon: "♘", t: "Knight endgames", d: "Short-range piece, long-range problems — knight vs pawns technique." },
  { icon: "♗♘", t: "Bishop + knight", d: "Including the mate that every improving player is told about and few can actually play." },
  { icon: "♕", t: "Queen endgames", d: "Perpetual check, queen vs pawn on the seventh, and converting material." },
  { icon: "♕♖", t: "Queen + rook", d: "Heavy-piece endings where king safety still decides the game." },
  { icon: "♚", t: "Other / mixed", d: "Everything else that reaches an endgame with few pieces on the board." },
];

const FAQ = [
  {
    q: "Where do the endgame positions come from?",
    a: "They're extracted from a large collection of real master games — positions that actually occurred once the game reduced to a small number of pieces. So you're practising endings that genuinely arise, not artificial studies.",
  },
  {
    q: "Can I play an endgame out against the engine?",
    a: "Yes. Curated Endgame Challenges let you play the position out against Stockfish at Easy, Medium or Hard. You have to convert the win or hold the draw yourself — the position is only 'mastered' when you actually do it.",
  },
  {
    q: "Is endgame training free?",
    a: "Browsing endgames by type is free. Curated Endgame Challenges include some premium picks, which are free for Chess Nexus supporters and for coaches on a paid plan, or can be unlocked with XP earned by playing.",
  },
  {
    q: "Can a coach use endgames in lessons?",
    a: "Yes. A coach can load any endgame position straight onto the shared board in the live classroom, add endgames as lessons inside a course, or set one as an assignment for a student to play out.",
  },
];

export default function EndgameTrainingPage() {
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
        title: "Chess Endgame Training — Practice Real Endgames Online Free",
        description:
          "Practise chess endgames taken from real master games, grouped into eight types — pawn, rook, bishop, knight, queen and more. Play positions out against Stockfish until you can convert them.",
        keywords:
          "chess endgame training, practice chess endgames, rook endgame practice, pawn endgame training, endgame trainer online, learn chess endgames free",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "♔",
        h1: "Chess endgame training",
        sub:
          "Endgames pulled from real master games, grouped by type — then play them out against the engine until you can actually convert them.",
        primary: { to: "/study/endgames", label: "Browse endgames" },
        secondary: { to: "/study/endgame-challenges", label: "Play a challenge" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="Endgame types">
        <h2>Every endgame type, from real games</h2>
        <p className="mkt-section-lead">
          Positions are extracted from a large master-game collection, so you drill
          endings that genuinely occur — not textbook curiosities.
        </p>
        <ul className="mkt-featurelist">
          {FAMILIES.map((f) => (
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

      <section className="mkt-section" aria-label="Endgame challenges">
        <h2>Knowing it isn't the same as converting it</h2>
        <p className="mkt-p">
          Most players can describe the Lucena position and still fail to win it at
          the board. <strong>Endgame Challenges</strong> are curated positions you play
          out against Stockfish — Easy, Medium or Hard. You keep the position until
          you convert the win or hold the draw yourself. That's the difference between
          having read about an endgame and being able to play it.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/study/endgame-challenges" className="mkt-btn mkt-btn-primary">Try a challenge</Link>
        </div>
      </section>

      <section className="mkt-section" aria-label="For coaches">
        <h2>For coaches</h2>
        <p className="mkt-p">
          Load any endgame straight onto the shared board in the{" "}
          <Link to="/live-chess-classroom">live classroom</Link>, add endgames as
          lessons inside a <Link to="/chess-courses">course</Link>, or set one as an
          assignment a student must play out against the engine.
        </p>
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Endgame training FAQ</h2>
        <div className="mkt-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="mkt-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </FeaturePageLayout>
  );
}
