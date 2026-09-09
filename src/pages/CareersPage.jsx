import React, { useState, useMemo, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import api from "../api";
import SEO from "../components/SEO";
import "../components/marketing/marketing.css";
import "./CareersPage.css";

const CANONICAL = "/careers";

// ─────────────────────────────────────────────────────────────────────────────
// OPEN ROLES  —  edit this array; nothing else needs touching.
//
// An empty array is a supported state: the page then shows a "nothing open,
// tell us anyway" panel with the same form, so it never looks broken.
//
//   id         stable slug. Stored with each application, so do NOT change it
//              once a role is live or old applications lose their label.
//   title      role name
//   dept       drives the filter chips. Reuse the same spelling across roles.
//   type       "Full-time" | "Part-time" | "Internship" | "Contract"
//   location   "Remote (India)" | "Chennai" | …
//   summary    one line, shown on the collapsed row
//   about      optional paragraph, shown when expanded
//   skills     array — what you are looking for
//   nice       optional array — nice-to-haves, not requirements
//   pay        optional string, e.g. "₹25,000–40,000 / month"
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = [
  // COMING SOON: no roles are listed yet, so the page shows its
  // "we are not hiring yet" state. Uncomment (or replace) the entries below
  // when hiring opens — the whole job board, filters and apply modal are
  // already built and switch on automatically as soon as this array is
  // non-empty. Nothing else needs changing.
//
//  {
//    id: "frontend-engineer",
//    title: "Frontend Engineer",
//    dept: "Engineering",
//    type: "Full-time",
//    location: "Remote (India)",
//    summary: "Build the live classroom, puzzle trainers and tournament screens.",
//    about:
//      "You will own real features end to end — the board, the classroom, the race screens — and see coaches using them within days.",
//    skills: [
//      "Strong React and modern JavaScript",
//      "You care how an interface feels, not just whether it works",
//      "Comfortable owning a feature end to end",
//    ],
//    nice: ["Real-time / WebSocket experience", "You play chess"],
//  },
//  {
//    id: "chess-coach",
//    title: "Chess Coach",
//    dept: "Coaching",
//    type: "Part-time",
//    location: "Remote (India)",
//    summary: "Teach beginners and improvers in small online batches.",
//    about:
//      "You teach inside the Chess Nexus live classroom — shared board, video, and attendance written for you as students join.",
//    skills: [
//      "Rated 1600+, or equivalent teaching experience",
//      "Comfortable teaching children aged 6–14",
//      "Fluent in English; a second Indian language is a plus",
//      "Reliable internet and a quiet place to teach",
//    ],
//    nice: ["Experience running school or club tournaments", "FIDE title or rating"],
//  },
//  {
//    id: "content-creator",
//    title: "Chess Content Creator",
//    dept: "Content",
//    type: "Contract",
//    location: "Remote",
//    summary: "Write lessons, puzzle sets and openings content beginners can follow.",
//    skills: [
//      "You can explain a chess idea to a 10-year-old without dumbing it down",
//      "Solid chess understanding (1800+ or a strong coaching background)",
//      "Clear written English",
//    ],
//    nice: ["Video editing", "An existing channel or following"],
//  },
];

const PERKS = [
  { icon: "🚀", title: "You ship, people use it", text: "Build something on Monday, watch a coach use it with their class on Thursday." },
  { icon: "♟", title: "It is all chess", text: "Puzzles, endgames, live classes, tournaments. If you love the game, the work is the hobby." },
  { icon: "🌍", title: "Remote, properly", text: "Work from anywhere in India. No office, no commute, no one counting your hours." },
  { icon: "🌱", title: "Early enough to matter", text: "You will not inherit someone else's decisions — you will make the ones that stick." },
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", location: "", message: "",
  portfolioUrl: "", chessProfileUrl: "", chessRating: "", experienceYears: "",
  referrer: "", website: "", // `website` is the honeypot — see the input below
};

export default function CareersPage() {
  const hasRoles = ROLES.length > 0;

  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);  // roleId whose details are open
  const [applyRole, setApplyRole] = useState(null); // role object shown in the modal
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentFor, setSentFor] = useState(null);
  const closeBtnRef = useRef(null);

  // Departments in the order they first appear, so the chips follow the ROLES
  // array rather than an arbitrary alphabetical order.
  const depts = useMemo(() => {
    const seen = [];
    ROLES.forEach((r) => { if (r.dept && !seen.includes(r.dept)) seen.push(r.dept); });
    return seen;
  }, []);

  const visible = useMemo(
    () => (filter === "All" ? ROLES : ROLES.filter((r) => r.dept === filter)),
    [filter]
  );

  // Group for rendering, preserving the chip order.
  const grouped = useMemo(() => {
    const map = new Map();
    visible.forEach((r) => {
      const k = r.dept || "Other";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()];
  }, [visible]);

  // Modal housekeeping: lock the page behind it, close on Escape, and move focus
  // to the dialog so a keyboard user is not left navigating the page underneath.
  useEffect(() => {
    if (!applyRole) return;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [applyRole]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openModal = (role) => {
    setError("");
    setForm(EMPTY_FORM); // never carry one role's draft into another
    setApplyRole(role);
  };
  const closeModal = () => { setApplyRole(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Please enter a valid email address.");
    if (form.message.trim().length < 30) return setError("Please tell us a little more — a couple of sentences is plenty.");

    setSending(true);
    try {
      await api.post("/api/public/job-application", {
        ...form,
        roleId: applyRole.id,
        roleTitle: applyRole.title,
      });
      setSentFor(applyRole.id);
      setApplyRole(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your application. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // JobPosting structured data — what lets Google surface roles in its jobs
  // results. Only emitted when roles exist: schema that does not match the page
  // is penalised, so an empty list falls back to plain WebPage markup.
  const jsonLd = hasRoles
    ? ROLES.map((r) => ({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: r.title,
        description: r.about || r.summary,
        employmentType: r.type,
        hiringOrganization: { "@type": "Organization", name: "Chess Nexus", sameAs: "https://chessnexus.in" },
        jobLocationType: /remote/i.test(r.location || "") ? "TELECOMMUTE" : undefined,
        applicantLocationRequirements: { "@type": "Country", name: "India" },
        directApply: true,
      }))
    : [{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Careers at Chess Nexus",
        description: "Open roles and how to apply to work at Chess Nexus.",
        url: `https://chessnexus.in${CANONICAL}`,
      }];

  return (
    <div className="mkt-page careers-page">
      <SEO
        title="Careers — Work at Chess Nexus"
        description="Work at Chess Nexus — we build the platform chess coaches use to run their academies. Remote-first, small team, real ownership. See open roles."
        keywords="chess nexus careers, chess jobs india, chess coach jobs, remote chess jobs, chess startup jobs"
        canonical={CANONICAL}
      />
      <Helmet>
        {jsonLd.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>

      <div className="mkt-inner">
        <header className="mkt-hero">
          <div className="mkt-hero-icon">💼</div>
          <h1>Build the tools <span className="cr-accent">coaches teach with.</span></h1>
          <p className="mkt-hero-sub">
            Chess coaches still run their academies on WhatsApp, spreadsheets and
            Zoom. We are replacing all of it with{" "}
            <b>one platform they can actually afford</b> — and the kids on the other
            end are learning the game because of it.
          </p>
          <p className="cr-hero-line">Small team. Real users. Your work ships this week.</p>
        </header>

        {/* ── Why work here ── */}
        <section className="cr-section" aria-labelledby="cr-why">
          <h2 id="cr-why">Why work here</h2>
          <div className="cr-perks">
            {PERKS.map((p) => (
              <div className="cr-perk" key={p.title}>
                <span className="cr-perk-icon" aria-hidden="true">{p.icon}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Open roles ── */}
        <section className="cr-section" aria-labelledby="cr-roles">
          <h2 id="cr-roles">
            Open roles{hasRoles && <span className="cr-count">{ROLES.length}</span>}
          </h2>

          {hasRoles ? (
            <>
              {/* Filters. Hidden with a single department — a lone "All" chip
                  next to one group is noise, not navigation. */}
              {depts.length > 1 && (
                <div className="cr-filters" role="tablist" aria-label="Filter roles by team">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === "All"}
                    className={`cr-chip ${filter === "All" ? "is-active" : ""}`}
                    onClick={() => setFilter("All")}
                  >
                    All <span className="cr-chip-n">{ROLES.length}</span>
                  </button>
                  {depts.map((d) => {
                    const n = ROLES.filter((r) => r.dept === d).length;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="tab"
                        aria-selected={filter === d}
                        className={`cr-chip ${filter === d ? "is-active" : ""}`}
                        onClick={() => setFilter(d)}
                      >
                        {d} <span className="cr-chip-n">{n}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="cr-board">
                {grouped.map(([dept, roles]) => (
                  <div className="cr-group" key={dept}>
                    <h3 className="cr-group-head">{dept}</h3>

                    {roles.map((r) => {
                      const isOpen = expanded === r.id;
                      const justSent = sentFor === r.id;
                      return (
                        <div className={`cr-row ${isOpen ? "is-open" : ""}`} key={r.id}>
                          {/* The whole row toggles details. A <button> rather than
                              a div so it is keyboard-reachable and announced. */}
                          <button
                            type="button"
                            className="cr-row-main"
                            onClick={() => setExpanded(isOpen ? null : r.id)}
                            aria-expanded={isOpen}
                          >
                            <span className="cr-row-text">
                              <span className="cr-row-title">{r.title}</span>
                              <span className="cr-row-sum">{r.summary}</span>
                              <span className="cr-row-meta">
                                <span className="cr-tag">{r.type}</span>
                                <span className="cr-tag cr-tag-loc">📍 {r.location}</span>
                                {r.pay && <span className="cr-tag cr-tag-pay">{r.pay}</span>}
                              </span>
                            </span>
                            <span className={`cr-row-arrow ${isOpen ? "is-open" : ""}`} aria-hidden="true">›</span>
                          </button>

                          {isOpen && (
                            <div className="cr-row-detail">
                              {r.about && <p className="cr-role-about">{r.about}</p>}

                              {r.skills?.length > 0 && (
                                <>
                                  <h4 className="cr-role-sub">What we are looking for</h4>
                                  <ul className="cr-list">{r.skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </>
                              )}

                              {r.nice?.length > 0 && (
                                <>
                                  <h4 className="cr-role-sub">Nice to have</h4>
                                  <ul className="cr-list cr-list-muted">{r.nice.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </>
                              )}

                              {justSent ? (
                                <p className="cr-sent" role="status">
                                  ✅ Application sent — thank you. We will be in touch by email.
                                </p>
                              ) : (
                                <button type="button" className="cr-apply" onClick={() => openModal(r)}>
                                  Apply for this role →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cr-soon">
              <div className="cr-soon-icon" aria-hidden="true">🚧</div>
              <p className="cr-soon-lead">We are not hiring just yet.</p>
              <p className="cr-soon-text">
                Chess Nexus is still a very small team. When we open roles —
                coaching, engineering, design and content — they will be listed
                right here.
              </p>
              <p className="cr-soon-text">
                In the meantime, if you are a coach, you can already{" "}
                <Link to="/chess-coaching">teach on the platform for free</Link>.
              </p>
            </div>
          )}
        </section>

        {/* ── Note for coaches ── */}
        <section className="cr-section">
          <p className="cr-note">
            Are you a chess coach looking to <b>teach on the platform</b> rather than
            join the team? That is a different — and free — route. See{" "}
            <Link to="/chess-coaching">coaching on Chess Nexus</Link>.
          </p>
        </section>
      </div>

      {/* ── Apply modal ── */}
      {applyRole && (
        <div className="cr-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="cr-modal" role="dialog" aria-modal="true" aria-labelledby="cr-modal-title">
            <div className="cr-modal-head">
              <div>
                <p className="cr-modal-kicker">Apply for</p>
                <h3 id="cr-modal-title">{applyRole.title}</h3>
              </div>
              <button ref={closeBtnRef} type="button" className="cr-modal-x" onClick={closeModal} aria-label="Close">×</button>
            </div>

            <form className="cr-form" onSubmit={submit} noValidate>
              <div className="cr-form-grid">
                <label className="cr-field">
                  <span>Your name *</span>
                  <input value={form.name} onChange={set("name")} autoComplete="name" required />
                </label>
                <label className="cr-field">
                  <span>Email *</span>
                  <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
                </label>
                <label className="cr-field">
                  <span>Phone / WhatsApp</span>
                  <input value={form.phone} onChange={set("phone")} autoComplete="tel" />
                </label>
                <label className="cr-field">
                  <span>Where are you based?</span>
                  <input value={form.location} onChange={set("location")} placeholder="e.g. Chennai" />
                </label>
                <label className="cr-field">
                  <span>Chess rating</span>
                  <input value={form.chessRating} onChange={set("chessRating")} placeholder="e.g. FIDE 1850" />
                </label>
                <label className="cr-field">
                  <span>Years of experience</span>
                  <input type="number" min="0" max="70" value={form.experienceYears} onChange={set("experienceYears")} />
                </label>
                <label className="cr-field cr-field-wide">
                  <span>Portfolio, GitHub or LinkedIn</span>
                  <input type="url" value={form.portfolioUrl} onChange={set("portfolioUrl")} placeholder="https://…" />
                </label>
                <label className="cr-field cr-field-wide">
                  <span>Lichess or Chess.com profile</span>
                  <input type="url" value={form.chessProfileUrl} onChange={set("chessProfileUrl")} placeholder="https://lichess.org/@/yourname" />
                </label>
                <label className="cr-field cr-field-wide">
                  <span>Why you? *</span>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="What have you built, taught or played? Links are better than a CV."
                    required
                  />
                </label>
                <label className="cr-field cr-field-wide">
                  <span>How did you hear about us?</span>
                  <input value={form.referrer} onChange={set("referrer")} placeholder="e.g. Instagram, a friend, Google" />
                </label>
              </div>

              {/* Honeypot: hidden from people, irresistible to bots. A filled
                  value is silently accepted server-side, so the bot never learns
                  it was caught. */}
              <input
                className="cr-hp" type="text" name="website" tabIndex={-1}
                autoComplete="off" value={form.website} onChange={set("website")} aria-hidden="true"
              />

              {error && <p className="cr-form-error" role="alert">⚠️ {error}</p>}

              <div className="cr-form-actions">
                <button type="submit" className="cr-apply" disabled={sending}>
                  {sending ? "Sending…" : "Send application"}
                </button>
                <button type="button" className="cr-cancel" onClick={closeModal}>Cancel</button>
              </div>

              <p className="cr-form-note">We read every application and reply to everyone we can.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
