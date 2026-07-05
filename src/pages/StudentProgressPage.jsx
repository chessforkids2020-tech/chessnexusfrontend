import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./StudentProgressPage.css";

/**
 * PARENT / STUDENT PROGRESS REPORT — a clean, read-only, share-friendly page.
 *
 * Built for a parent (or the coach) to open a single link and instantly see how
 * a student is doing: rating, activity streak, puzzle accuracy, this month's
 * focus and badges. Uses the SAME public endpoint as the public profile
 * (/api/public/profile/:displayName) so there is NO new backend.
 *
 * Route: /progress/:displayName  (public, no login)
 */
export default function StudentProgressPage() {
  const { displayName } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(
          `${apiBase}/api/public/profile/${encodeURIComponent(displayName)}`
        );
        if (res.status === 404) {
          if (alive) { setErr(`No student named "${displayName}" found.`); setLoading(false); }
          return;
        }
        if (!res.ok) throw new Error("Could not load this progress report.");
        const d = await res.json();
        if (alive) { setData(d); setErr(""); }
      } catch (e) {
        if (alive) setErr(e.message || "Could not load this progress report.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [displayName]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked — ignore */ }
  };

  if (loading) {
    return (
      <div className="sp-root">
        <div className="sp-bg" />
        <div className="sp-loading">Loading progress…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="sp-root">
        <div className="sp-bg" />
        <div className="sp-error">
          <div className="sp-error-icon">🔍</div>
          <p>{err}</p>
          <Link to="/" className="sp-btn sp-btn-ghost">Go to Chess Nexus</Link>
        </div>
      </div>
    );
  }

  const name = data.displayName || data.username;
  const rating = data.liveRating || data.ratings?.rapid || data.ratings?.blitz || null;
  const activity = data.activity || {};
  const stats = activity.stats || {};
  const streak = stats.currentStreak || 0;
  const totalDays = stats.totalDays || 0;
  const minutes = stats.totalMinutes || 0;
  const hours = Math.round((minutes / 60) * 10) / 10;
  const training = data.trainingStats || { correct: 0, wrong: 0 };
  const solved = training.correct || 0;
  const attempts = solved + (training.wrong || 0);
  const accuracy = attempts > 0 ? Math.round((solved / attempts) * 100) : null;
  const badges = data.badges || [];
  const memberSince = data.memberSince
    ? new Date(data.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  // This month's focus challenge, if any.
  const focuses = data.monthlyFocus?.focuses || [];
  const focus = focuses[0] || null;

  return (
    <div className="sp-root">
      <div className="sp-bg" />
      <div className="sp-inner">

        {/* Header */}
        <header className="sp-head">
          <div className="sp-brand">
            <span className="sp-brand-mark">♞</span>
            <span className="sp-brand-name">Chess<span>Nexus</span></span>
          </div>
          <button className="sp-share" onClick={copyLink}>
            {copied ? "✓ Link copied" : "🔗 Share this report"}
          </button>
        </header>

        {/* Hero — who this is about */}
        <section className="sp-hero sp-card">
          <div className="sp-hero-avatar">{(name || "?")[0].toUpperCase()}</div>
          <div>
            <div className="sp-hero-eyebrow">Chess progress report</div>
            <h1 className="sp-hero-name">{name}</h1>
            <p className="sp-hero-sub">
              {memberSince ? `Training on Chess Nexus since ${memberSince}` : "Training on Chess Nexus"}
            </p>
          </div>
        </section>

        {/* Headline stats */}
        <section className="sp-stats">
          {rating != null && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">📈</div>
              <div className="sp-stat-value">{rating}</div>
              <div className="sp-stat-label">Current rating</div>
            </div>
          )}
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">🔥</div>
            <div className="sp-stat-value">{streak}</div>
            <div className="sp-stat-label">Day streak</div>
          </div>
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">🧩</div>
            <div className="sp-stat-value">{solved}</div>
            <div className="sp-stat-label">Puzzles solved</div>
          </div>
          {accuracy != null && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">🎯</div>
              <div className="sp-stat-value">{accuracy}%</div>
              <div className="sp-stat-label">Puzzle accuracy</div>
            </div>
          )}
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">📅</div>
            <div className="sp-stat-value">{totalDays}</div>
            <div className="sp-stat-label">Active days</div>
          </div>
          {hours > 0 && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">⏱️</div>
              <div className="sp-stat-value">{hours}h</div>
              <div className="sp-stat-label">Time practised</div>
            </div>
          )}
        </section>

        {/* This month's focus */}
        {focus && (
          <section className="sp-card sp-focus">
            <div className="sp-section-title">🎯 This month's focus</div>
            <p className="sp-focus-name">{focus.title || focus.name || "Monthly Focus challenge"}</p>
            <p className="sp-focus-sub">
              {name} is taking part in this month's guided training challenge on Chess Nexus.
            </p>
          </section>
        )}

        {/* Achievements */}
        {badges.length > 0 && (
          <section className="sp-card sp-badges">
            <div className="sp-section-title">🏅 Achievements earned</div>
            <div className="sp-badge-row">
              {badges.slice(0, 12).map((b, i) => (
                <div key={i} className="sp-badge" title={b.name || b.label || ""}>
                  <span className="sp-badge-icon">{b.icon || b.emoji || "🏅"}</span>
                  <span className="sp-badge-name">{b.name || b.label || "Badge"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Encouraging note + CTA */}
        <section className="sp-card sp-note">
          <p>
            This report is generated automatically from {name}'s activity on
            Chess Nexus — a free platform for learning chess through puzzles,
            games and guided practice.
          </p>
          <div className="sp-note-actions">
            <Link to={`/player/${encodeURIComponent(name)}`} className="sp-btn sp-btn-primary">
              View full profile →
            </Link>
            <Link to="/" className="sp-btn sp-btn-ghost">About Chess Nexus</Link>
          </div>
        </section>

        <footer className="sp-foot">
          Powered by <Link to="/">Chess Nexus</Link> · A read-only progress report
        </footer>
      </div>
    </div>
  );
}
