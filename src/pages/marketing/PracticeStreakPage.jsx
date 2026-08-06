// pages/marketing/PracticeStreakPage.jsx
//
// The public page for the 5-day practice streak and the weekly report.
//
// The report itself lives behind a login, so this page (and llms.txt) are the
// only places a search engine or an AI can learn what it actually contains.
// Everything claimed here is deliberately specific and true — the phase
// breakdown, Defender Training, the endgames-reached table and the study plan
// all exist; nothing is aspirational.
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-practice-streak";

const FAQ = [
  {
    q: "What is the 5-day practice streak?",
    a: "Practise chess five days in a row on Chess Nexus and you unlock a full report on how you have been playing. A day counts when you solve 10 puzzles, play one standard game (on Chess Nexus, Chess.com or Lichess) and play out one endgame against the computer. Simply opening the app does not count — the streak is about real practice.",
  },
  {
    q: "What is in the weekly chess report?",
    a: "Your accuracy in the opening, middlegame and endgame separately, with the blunders, mistakes and inaccuracies in each; how well you defend when a game turns against you; which endgames you actually reached and your record in them; the openings you played; how much worse you play under a minute on the clock; how often you converted a winning position; and every mistake you made grouped into tactics, defence, calculation, endgames and opening — each one replayable.",
  },
  {
    q: "Does it include my Chess.com and Lichess games?",
    a: "Yes. The report analyses every standard game you played in those five days across Chess Nexus, Chess.com and Lichess together — which is what makes it different from analysing one game on one site. Save your usernames in your profile so those games are counted. Bullet and variants such as Chess960 are left out, because their mistakes are mostly clock panic rather than chess.",
  },
  {
    q: "Does my streak reset after I get a report?",
    a: "No. The streak keeps running: day 10, day 15 and day 20 each unlock another report, and a 30-day streak stays a 30-day streak. Each report covers the five days since the last one, so no two reports overlap.",
  },
  {
    q: "What does the report cost?",
    a: "100 XP, which is roughly what five days of practice earns — so the streak pays for its own report. It is free for coaches, Nexus Elite members and coffee supporters.",
  },
  {
    q: "How is this different from analysing a single game?",
    a: "Analysing a game tells you what happened in that game. The report tells you what is happening to your chess: it pools a whole period across all three platforms, shows which phase of the game is holding you back, and turns each finding into a specific drill. Keep several reports and you can compare them side by side to see what is genuinely improving.",
  },
  {
    q: "What is Defender Training?",
    a: "It measures something almost nothing else does: how well you hold a bad position. The report counts how often you fell into a clearly worse position, how many of those you saved or held, how many collapsed, and how many moves on average you resisted before it fell apart. Many players resign mentally at minus two; the ones who improve fastest are usually the ones who defend.",
  },
];

export default function PracticeStreakPage() {
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
    name: "Chess Practice Streak — Earn a Full Report on Your Play",
    description:
      "Practise five days in a row and unlock a report on every game you played across Chess Nexus, Chess.com and Lichess: accuracy by phase, how you defend, the endgames you reached, and a study plan built from your own mistakes.",
    url: `https://www.chessnexus.in${CANONICAL}`,
  };

  return (
    <FeaturePageLayout
      excludeSlug={CANONICAL}
      seo={{
        title: "Chess Practice Streak — Earn a Full Report on Your Play",
        description:
          "Practise 5 days in a row and unlock a report on every game you played across Chess Nexus, Chess.com and Lichess — accuracy by phase, how you defend, the endgames you reached, and a study plan from your own mistakes.",
        keywords:
          "chess practice streak, daily chess practice, chess improvement report, chess weekly report, chess accuracy by phase, chess endgame weakness, chess study plan, track chess progress",
        canonical: CANONICAL,
      }}
      jsonLd={[webPageSchema, faqSchema]}
      hero={{
        icon: "🔥",
        h1: "Practise 5 days. Find out what is really costing you games.",
        sub: "Most players practise without ever learning which part of their chess is holding them back. Practise five days in a row and Chess Nexus analyses every game you played — on Chess Nexus, Chess.com and Lichess together — and tells you exactly what to work on next.",
        primary: { label: "Start your streak", to: "/dashboard" },
        secondary: { label: "Browse all features", to: "/features" },
      }}
    >
      <section className="mkt-section">
        <h2>What a practice day costs</h2>
        <p className="mkt-section-lead">
          A day only counts when you do all three. Opening the app does not
          count, and neither does one quick puzzle — the streak is a record of
          real work, which is what makes the report worth reading.
        </p>
        <ul className="mkt-featurelist">
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🧩</span>
            <span className="mkt-feat-tx">
              <strong>10 puzzles</strong>
              <span>Any mode counts — Healthy Mix, themes, by piece count or by rating band.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">⚔️</span>
            <span className="mkt-feat-tx">
              <strong>1 game</strong>
              <span>On Chess Nexus, Chess.com or Lichess. Blitz, rapid or classical — bullet and variants do not count, because their mistakes are usually the clock rather than your chess.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">♟️</span>
            <span className="mkt-feat-tx">
              <strong>1 endgame</strong>
              <span>Played out against the computer, from any position in the endgame library.</span>
            </span>
          </li>
        </ul>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">📊</div>
        <div>
          <h2>One report, all three platforms</h2>
          <p>
            Analysing a game tells you what happened in that game. This pools
            everything you played over five days — wherever you played it — and
            tells you what is happening to your chess. That is a different
            question, and a more useful one.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>What the report tells you</h2>
        <p className="mkt-section-lead">
          Not a wall of engine lines. Six things a coach would actually point at,
          each drawn from the games you really played.
        </p>
        <ul className="mkt-featurelist">
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🎯</span>
            <span className="mkt-feat-tx">
              <strong>Which phase is holding you back</strong>
              <span>Your accuracy in the opening, middlegame and endgame separately, with the blunders, mistakes and inaccuracies in each — and the weakest one marked.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🛡</span>
            <span className="mkt-feat-tx">
              <strong>How well you defend</strong>
              <span>How often a game turned against you, how many of those you saved, how many collapsed, and how long you resisted on average. Almost nothing else measures this.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">♟️</span>
            <span className="mkt-feat-tx">
              <strong>The endgames you actually reached</strong>
              <span>Rook endgames, king and pawn, queen endings — how many came up and your record in each. Losing the same type repeatedly is a fixable problem once you can see it.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">⏱</span>
            <span className="mkt-feat-tx">
              <strong>What the clock costs you</strong>
              <span>How much worse you play with under a minute left than with time to think — and how many of your blunders came from there.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🏁</span>
            <span className="mkt-feat-tx">
              <strong>Whether you finish won games</strong>
              <span>How often you reached a winning position, and how often you actually won from it.</span>
            </span>
          </li>
          <li>
            <span className="mkt-feat-ic" aria-hidden="true">🧠</span>
            <span className="mkt-feat-tx">
              <strong>Where your mistakes happen</strong>
              <span>Every blunder grouped into tactics, defence, calculation, endgames and opening — click a group and replay those exact positions.</span>
            </span>
          </li>
        </ul>
      </section>

      <section className="mkt-section">
        <div className="mkt-split">
          <div className="mkt-split-text">
            <h2>A study plan built from your own mistakes</h2>
            <p>
              The report does not stop at telling you what is wrong. Every
              finding becomes something to do:
            </p>
            <ul className="mkt-featurelist">
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">♜</span>
                <span className="mkt-feat-tx">
                  <strong>Lost rook endgames?</strong>
                  <span>Get rook endgames with the same material to play out against the engine.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">⚔️</span>
                <span className="mkt-feat-tx">
                  <strong>Kept missing forks?</strong>
                  <span>Go straight to fork puzzles, until you stop missing them.</span>
                </span>
              </li>
              <li>
                <span className="mkt-feat-ic" aria-hidden="true">🔁</span>
                <span className="mkt-feat-tx">
                  <strong>Weak middlegame?</strong>
                  <span>Replay your own middlegame blunders and find the move you should have played.</span>
                </span>
              </li>
            </ul>
            <Link to="/dashboard" className="mkt-card-cta">
              Start your streak →
            </Link>
          </div>
        </div>
      </section>

      <div className="mkt-callout">
        <div className="mkt-callout-icon">📈</div>
        <div>
          <h2>Compare four reports and watch a month of progress</h2>
          <p>
            Reports are kept and shown side by side, like comparing
            specifications. Each column is one five-day period; each row a
            measure — rating, accuracy, blunders per game, accuracy in each
            phase — with the change from last time underneath. Because every
            report covers a distinct five days rather than a rolling window, a
            difference between two columns is real change in your play, not an
            artefact of the dates moving.
          </p>
        </div>
      </div>

      <section className="mkt-section">
        <h2>Why a streak, and not just a button</h2>
        <p className="mkt-section-lead">
          Improvement comes from turning up regularly, and one analysed game
          tells you very little. Five days of real practice is enough games to
          say something true about your chess — which is why the report is
          earned rather than simply available. The streak keeps running after
          you claim one: day 10, day 15 and day 20 each unlock another, so a
          long run is never reset as a reward for succeeding.
        </p>
        <div className="mkt-cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/dashboard" className="mkt-btn mkt-btn-primary">
            Start your streak
          </Link>
          <Link to="/chess-puzzles" className="mkt-btn mkt-btn-ghost">
            Train tactics
          </Link>
          <Link to="/chess-endgame-training" className="mkt-btn mkt-btn-ghost">
            Endgame training
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
