// src/pages/marketing/FreeChessClassesPage.jsx — /free-chess-classes-for-kids
//
// The free beginner classes, as a proper indexable page. "Free chess classes for
// kids" is a real search, and a homepage band cannot be cited on its own — an
// AI assistant or a search result needs a page it can point at.
//
// Everything here is static text so whatever a browser shows, a crawler reads.
// The form is the same modal the homepage uses.
import { useState } from "react";
import { Link } from "react-router-dom";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";
import FreeClassModal from "../../components/FreeClassModal";

const CANONICAL = "/free-chess-classes-for-kids";

const STEPS = [
  { n: "1", t: "Tell us about your child", d: "Name, age, country, your WhatsApp number, and whether they already know how the pieces move. Five fields — no account needed to ask, no card, nothing to install." },
  { n: "2", t: "We contact you", d: "The ChessNexus team messages you on WhatsApp to agree a class time that suits you, and to answer anything you want to ask first. We also create your child's free ChessNexus account and send you the login — you do not have to set anything up." },
  { n: "3", t: "We arrange a coach", d: "Your child is placed in a small beginners group with a professional coach — matched by age and by whether they are starting from zero." },
  { n: "4", t: "They learn the fundamentals", d: "Three classes a week, 40 minutes each, for about two weeks. By the end your child can set up the board, move every piece correctly, and play a full game." },
];

const COVERED = [
  "The board, the pieces and how the game is won",
  "How every piece moves and captures",
  "Check, checkmate and stalemate",
  "Castling, en passant and pawn promotion",
  "The opening principles that stop early blunders",
  "Basic tactics — forks, pins and simple mates",
  "How to finish a game with a king and a queen",
  "Playing a full game, start to finish, with confidence",
];

const FAQ = [
  {
    q: "Is the chess course really free?",
    a: "Yes. ChessNexus arranges a professional coach to teach your child the fundamentals of chess at no cost. There is no card, no trial, and no obligation to continue afterwards. We run these classes because we believe every child deserves the chance to discover chess, taught properly from the start.",
  },
  {
    q: "What age are the free chess classes for?",
    a: "Any age. We teach children from about 5 upwards, and we group them by age and by starting level, so a six-year-old who has never seen a chessboard and a ten-year-old who knows the moves are not put in the same class.",
  },
  {
    q: "What language are the classes taught in?",
    a: "All classes are taught in English.",
  },
  {
    q: "How long is the course, and how often are classes?",
    a: "Three classes a week, 40 minutes each, for roughly two weeks — about six sessions in total. That is enough to take a complete beginner to playing a full game on their own.",
  },
  {
    q: "Does my child need an account to join?",
    a: "Not to request a class. You fill in a short form and we contact you on WhatsApp. We set up everything your child needs before their first class.",
  },
  {
    q: "What does my child need for the class?",
    a: "A device with a browser and a working internet connection — a laptop, tablet or phone. No chess set and no software to install: the board is on screen, and the coach teaches on a board every student can see.",
  },
  {
    q: "What happens after the free classes finish?",
    a: "Your child keeps their free ChessNexus account and can carry on with puzzles, practice games and lessons for as long as they like — all free. If you want them to continue with a coach, we can introduce you to one, but there is no pressure and no obligation.",
  },
  {
    q: "Is it safe for my child?",
    a: "Classes are taught by coaches we have verified ourselves. Lessons take place inside ChessNexus rather than on a public video app, and a coach can never switch a child's microphone or camera on without the child accepting.",
  },
  {
    q: "What do you do with my child's details?",
    a: "We use them for one thing: arranging the class. Your WhatsApp number is only used to contact you about it — never for marketing, and we never sell or share it. Once your child has finished the free classes we delete the request, including their name and age and your phone number. We do not keep children's details on file afterwards. You can ask us to delete them sooner at any time.",
  },
];

export default function FreeChessClassesPage() {
  const [open, setOpen] = useState(false);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  // A free Course, stated so an assistant can confirm the offer without
  // parsing prose.
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Your Child's First Chess Course — Free Beginner Chess for Kids",
    description:
      "A free beginner chess course for children of any age, taught live in English by a professional coach arranged by ChessNexus. Three 40-minute classes a week for about two weeks.",
    provider: { "@type": "Organization", name: "Chess Nexus", url: "https://www.chessnexus.in" },
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://www.chessnexus.in${CANONICAL}`,
    },
  };

  return (
    <FeaturePageLayout
      seo={{
        title: "Your Child's First Chess Course — Free, With a Professional Coach",
        description:
          "ChessNexus arranges a professional coach to teach your child the fundamentals of chess, completely free. Any age, taught in English, three 40-minute classes a week for about two weeks. No card, and no account needed to ask — just tell us about your child.",
        keywords:
          "free chess classes for kids, free online chess coaching for children, learn chess free, beginner chess classes, chess classes for beginners online, free chess lessons kids",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "🎁",
        h1: "A professional coach will teach your child chess — free",
        sub: "Tell us about your child and ChessNexus will arrange a professional coach to teach them the fundamentals of chess — completely free, at any age, taught in English.",
        primary: { to: CANONICAL, label: "Book a free class", onClick: () => setOpen(true) },
        secondary: { to: "/chess-puzzles", label: "See what they'll train on" },
      }}
      jsonLd={[faqSchema, courseSchema]}
      excludeSlug={CANONICAL}
    >
      {/* Emitted inline as well: Helmet appends to <head> after the prerender
          snapshot is taken, so page-level JSON-LD never reaches the static HTML. */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="mkt-section">
        <h2>Why chess is worth discovering early</h2>
        <p>
          Chess asks a child to sit with a problem, look ahead, and accept the consequences of
          their own decisions — for thirty quiet minutes at a time. It builds{" "}
          <strong>focus, patience and problem-solving</strong> at the age when those habits form,
          and it does it while the child thinks they are just playing a game.
        </p>
        <p>
          The hard part is the start. A child taught the fundamentals properly goes on enjoying
          chess for years; a child left to work it out alone usually gives up. That is the part
          we do for free.
        </p>
      </section>

      <section className="mkt-section">
        <h2>How it works</h2>
        <ol className="mkt-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <strong>{s.t}</strong>
              <span>{s.d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mkt-section">
        <h2>What your child will learn</h2>
        <p>By the end of the course a complete beginner can play a full game unaided.</p>
        <ul className="mkt-featurelist">
          {COVERED.map((c) => (
            <li key={c}><span className="mkt-feat-tx"><strong>{c}</strong></span></li>
          ))}
        </ul>
      </section>

      <section className="mkt-section">
        <h2>The details</h2>
        <div className="mkt-table-wrap">
          <table className="mkt-table">
            <thead><tr><th>What</th><th>Details</th></tr></thead>
            <tbody>
              <tr><td>Price</td><td>Free — no card, no obligation</td></tr>
              <tr><td>Ages</td><td>Any age (we group by age and level)</td></tr>
              <tr><td>Language</td><td>English</td></tr>
              <tr><td>Classes</td><td>3 per week, 40 minutes each</td></tr>
              <tr><td>Length of course</td><td>About 2 weeks (around 6 sessions)</td></tr>
              <tr><td>Taught by</td><td>A professional coach we arrange for you</td></tr>
              <tr><td>Where</td><td>Live inside ChessNexus — no other app needed</td></tr>
              <tr><td>Account needed to ask</td><td>No — we create your child's free account before the first class</td></tr>
              <tr><td>What you need</td><td>A browser and an internet connection</td></tr>
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
        <h2>Start your child's first chess course</h2>
        <p>
          Five short questions and we will contact you on WhatsApp to arrange the rest. Afterwards
          your child keeps a free ChessNexus account with{" "}
          <Link to="/chess-puzzles">daily puzzles</Link> and{" "}
          <Link to="/chess-study">structured lessons</Link> for as long as they want it.
        </p>
        <button type="button" className="mkt-btn mkt-btn-primary" onClick={() => setOpen(true)}>
          Book a free class →
        </button>
      </section>

      <FreeClassModal open={open} onClose={() => setOpen(false)} />
    </FeaturePageLayout>
  );
}
