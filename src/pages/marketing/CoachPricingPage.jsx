// src/pages/marketing/CoachPricingPage.jsx — /chess-coach-pricing
//
// PUBLIC coach pricing. Previously the homepage "See coach pricing" button sent
// people to /coach/subscription, which is a coach-only app page — so a normal
// student clicking it landed inside the coach area. This page is open to
// everyone (logged out included) and only *links* into the app to subscribe.
//
// Plans come from the already-public GET /api/coach/plans, so prices and limits
// stay in step with config/coachPlans.js automatically.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import FeaturePageLayout from "../../components/marketing/FeaturePageLayout";

const CANONICAL = "/chess-coach-pricing";

const FAQ = [
  {
    q: "Is Chess Nexus free for chess coaches?",
    a: "Yes. Coaching is free forever for up to 30 students — no card, no trial clock. That includes assignments, courses, attendance, the class schedule, parent reports and one live class a day.",
  },
  {
    q: "What's the difference between the plan families?",
    a: "The 'Without Live Classroom' plans raise your student cap and unlock premium coaching tools. The 'With Live Classroom' plans additionally raise how often you can teach live, how long each class runs, and how many students can join at once.",
  },
  {
    q: "Do I need a paid plan to teach live?",
    a: "No. Every coach gets the built-in live classroom, including free coaches — one 30-minute class a day with up to 4 students. Paid live plans raise those limits, up to unlimited classes of 60 minutes with 10 students.",
  },
  {
    q: "What happens if my paid plan expires?",
    a: "You're moved back to the free plan's limits rather than losing access. Your students, courses and history stay exactly where they are.",
  },
];

function money(paise) {
  if (!paise) return "Free";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

// "Unlimited" markers on the wire. JSON can't carry Infinity, so the API sends -1
// (see plansForWire in backend/routes/coach.js); null is used elsewhere. Treat any
// non-positive value as unlimited rather than printing a raw "-1".
function orUnlimited(n) {
  if (n === null || n === undefined || n < 0) return "Unlimited";
  return String(n);
}

export default function CoachPricingPage() {
  const [data, setData] = useState(null);
  const [family, setFamily] = useState("noLive");

  useEffect(() => {
    let alive = true;
    api.get("/api/coach/plans")
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setData({ plans: {}, planFamilies: [] }); });
    return () => { alive = false; };
  }, []);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const families = data?.planFamilies || [];
  const active = families.find((f) => f.key === family) || families[0];
  const shown = (active?.order || []).map((id) => data?.plans?.[id]).filter(Boolean);

  return (
    <FeaturePageLayout
      seo={{
        title: "Chess Coach Pricing — Free for 30 Students",
        description:
          "Chess Nexus coach pricing. Free forever for up to 30 students, including the built-in live classroom. Paid plans raise student limits and live-class length, frequency and size.",
        keywords:
          "chess coach pricing, chess coaching software cost, chess academy software pricing, online chess teaching platform price",
        canonical: CANONICAL,
      }}
      hero={{
        icon: "💳",
        h1: "Coach pricing",
        sub:
          "Free forever for up to 30 students — including the live classroom. Paid plans are for coaches who need more students, longer classes, or more of them.",
        primary: { to: "/coach/onboarding", label: "Start coaching free" },
        secondary: { to: "/chess-coach-guide", label: "See what's included" },
      }}
      jsonLd={faqSchema}
      excludeSlug={CANONICAL}
    >
      <section className="mkt-section" aria-label="Plans">
        <h2>Plans</h2>
        <p className="mkt-section-lead">
          Two families: one without the live classroom limits raised, one with. Every
          plan — including Free — includes the built-in classroom.
        </p>

        {families.length > 1 && (
          <div className="mkt-cta-row" style={{ justifyContent: "flex-start", marginBottom: 18 }}>
            {families.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`mkt-btn ${family === f.key ? "mkt-btn-primary" : ""}`}
                onClick={() => setFamily(f.key)}
              >
                {f.title}
              </button>
            ))}
          </div>
        )}

        {!data && <p className="mkt-p">Loading plans…</p>}

        {data && shown.length > 0 && (
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Per month</th>
                  <th>Students</th>
                  <th>Live classes</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{money(p.monthlyPrice)}</td>
                    <td>{orUnlimited(p.maxStudents)}</td>
                    <td>
                      {p.liveClass
                        ? `${p.liveClass.meetingsPerDay < 0 || p.liveClass.meetingsPerDay == null
                            ? "Unlimited classes"
                            : `${p.liveClass.meetingsPerDay}/day`} · ${p.liveClass.durationMin} min · ${p.liveClass.maxStudents} students`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && shown.length > 0 && (
          <ul className="mkt-featurelist" style={{ marginTop: 22 }}>
            {shown.map((p) => (
              <li key={p.id}>
                <span className="mkt-feat-ic" aria-hidden="true">
                  {p.monthlyPrice ? "⭐" : "🎁"}
                </span>
                <span className="mkt-feat-tx">
                  <strong>{p.name} — {money(p.monthlyPrice)}{p.monthlyPrice ? "/mo" : ""}</strong>
                  <span>{(p.features || []).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mkt-section" aria-label="FAQ">
        <h2>Pricing FAQ</h2>
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
        <h2>Start free, upgrade only if you outgrow it</h2>
        <p className="mkt-section-lead">Up to 30 students, no card required.</p>
        <div className="mkt-cta-row">
          <Link to="/coach/onboarding" className="mkt-btn mkt-btn-primary">Start coaching free</Link>
          <Link to="/chess-coach-guide" className="mkt-btn">Read the coach guide</Link>
        </div>
      </section>
    </FeaturePageLayout>
  );
}
