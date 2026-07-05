import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./StudentProgressPage.css";

/**
 * PARENT PROGRESS REPORT — clean, read-only, share-friendly.
 *
 * A coach shares /progress/:token with a parent. The token (unguessable) is
 * resolved server-side by GET /api/public/report/:token, which returns the
 * student's chess stats PLUS this month's coaching data (attendance, payment
 * status, assignments). No login required — the secret token is the gate.
 *
 * Route: /progress/:token
 */
export default function StudentProgressPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${apiBase}/api/public/report/${encodeURIComponent(token)}`);
        if (res.status === 404) {
          if (alive) { setErr("This progress link is invalid or has expired."); setLoading(false); }
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
  }, [token]);

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
          <div className="sp-error-icon">🔒</div>
          <p>{err}</p>
          <Link to="/" className="sp-btn sp-btn-ghost">Go to Chess Nexus</Link>
        </div>
      </div>
    );
  }

  const name = data.displayName || data.username;
  const month = data.month || "";

  // Puzzle stats — prefer the 7-day window, fall back to 24h, then live rating.
  const psr = data.puzzleStatsRange || {};
  const pz = psr["7d"] || psr["24h"] || null;
  const puzzleRating = pz?.rating ?? data.liveRating ?? null;
  const puzzleAccuracy = pz?.accuracy ?? null;
  const puzzleStreak = pz?.streak ?? 0;
  const puzzlesSolved = pz?.solved ?? 0;
  const puzzleAttempts = pz?.attempts ?? null;
  const puzzleFailed = pz?.failed ?? null;
  const puzzleTrend = pz?.trend ?? null; // rating change over the window (+/-)

  // Tournaments in the last 30 days: count, games played inside them, win rate.
  const t30 = data.tournaments30d || {};
  const tournamentsPlayed = t30.tournaments || 0;
  const tournamentGames = t30.games || 0;
  const tournamentWinRate = t30.winRate ?? null;

  // Active days this month.
  const activeDays = data.activeDays || 0;

  // This month's coaching data.
  const attendance = data.attendance || { present: 0, total: 0 };
  const payment = data.payment || { status: "unknown" };
  const assignments = data.assignments || { total: 0, completed: 0, pending: 0, avgAccuracy: null };

  const memberSince = data.memberSince
    ? new Date(data.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  const paymentMeta = {
    paid: { label: "Paid", cls: "sp-pay-paid", icon: "✓" },
    due: { label: "Payment due", cls: "sp-pay-due", icon: "•" },
  }[payment.status] || null; // 'na'/'unknown' → don't show the payment card

  return (
    <div className="sp-root">
      <div className="sp-bg" />
      <div className="sp-inner">

        {/* Header */}
        <header className="sp-head">
          <div className="sp-brand">
            <img src="/logo.png" alt="Chess Nexus" className="sp-brand-logo" />
            <span className="sp-brand-name">Chess<span>Nexus</span></span>
          </div>
          {month && <span className="sp-month-pill">📅 {month}</span>}
        </header>

        {/* Hero — who this is about */}
        <section className="sp-hero sp-card">
          <div className="sp-hero-avatar">{(name || "?")[0].toUpperCase()}</div>
          <div>
            <div className="sp-hero-eyebrow">Progress report{month ? ` · ${month}` : ""}</div>
            <h1 className="sp-hero-name">{name}</h1>
            <p className="sp-hero-sub">
              {memberSince ? `Training on Chess Nexus since ${memberSince}` : "Training on Chess Nexus"}
            </p>
          </div>
        </section>

        {/* ── This month's class summary (attendance / payment / assignments) ── */}
        <section className="sp-card sp-month">
          <div className="sp-section-title">📋 This month's class summary</div>
          <div className="sp-month-grid">
            {/* 1 — Attendance (this month) */}
            <div className="sp-month-item">
              <div className="sp-month-icon">🗓️</div>
              <div className="sp-month-value">
                {attendance.present}<span className="sp-month-of">/{attendance.total || 0}</span>
              </div>
              <div className="sp-month-label">Classes attended<br /><span className="sp-month-sub">this month</span></div>
            </div>

            {/* 2 — Payment */}
            <div className="sp-month-item">
              <div className="sp-month-icon">💳</div>
              {paymentMeta ? (
                <div className={`sp-pay-badge ${paymentMeta.cls}`}>
                  {paymentMeta.icon} {paymentMeta.label}
                </div>
              ) : (
                <div className="sp-month-value sp-month-na">—</div>
              )}
              <div className="sp-month-label">Fee status<br /><span className="sp-month-sub">this month</span></div>
            </div>

            {/* 3 — Assignments done */}
            <div className="sp-month-item">
              <div className="sp-month-icon">📝</div>
              <div className="sp-month-value">
                {assignments.completed}<span className="sp-month-of">/{assignments.total || 0}</span>
              </div>
              <div className="sp-month-label">Assignments done<br /><span className="sp-month-sub">last 30 days</span></div>
            </div>

            {/* 4 — Assignments pending */}
            <div className="sp-month-item">
              <div className="sp-month-icon">⏳</div>
              <div className="sp-month-value">{assignments.pending}</div>
              <div className="sp-month-label">Assignments pending<br /><span className="sp-month-sub">last 30 days</span></div>
            </div>
          </div>
          {assignments.avgAccuracy != null && (
            <p className="sp-month-note">
              Assignment accuracy: <strong>{assignments.avgAccuracy}%</strong> (last 30 days).
            </p>
          )}
        </section>

        {/* ── Puzzle training detail ── */}
        <div className="sp-section-title sp-stats-title">🧩 Puzzle training</div>
        <section className="sp-stats">
          {puzzleRating != null && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">🧩</div>
              <div className="sp-stat-value">
                {puzzleRating}
                {puzzleTrend != null && puzzleTrend !== 0 && (
                  <span className={`sp-trend ${puzzleTrend > 0 ? "sp-trend-up" : "sp-trend-down"}`}>
                    {puzzleTrend > 0 ? `▲ ${puzzleTrend}` : `▼ ${Math.abs(puzzleTrend)}`}
                  </span>
                )}
              </div>
              <div className="sp-stat-label">Puzzle rating</div>
            </div>
          )}
          {puzzleAccuracy != null && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">🎯</div>
              <div className="sp-stat-value">{puzzleAccuracy}%</div>
              <div className="sp-stat-label">Puzzle accuracy</div>
            </div>
          )}
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">✅</div>
            <div className="sp-stat-value">{puzzlesSolved}</div>
            <div className="sp-stat-label">Puzzles solved</div>
          </div>
          {puzzleAttempts != null && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">📊</div>
              <div className="sp-stat-value">{puzzleAttempts}</div>
              <div className="sp-stat-label">Puzzles attempted</div>
            </div>
          )}
          {puzzleStreak > 0 && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">🔥</div>
              <div className="sp-stat-value">{puzzleStreak}</div>
              <div className="sp-stat-label">Best solve streak</div>
            </div>
          )}
          {puzzleFailed != null && puzzleFailed > 0 && (
            <div className="sp-card sp-stat">
              <div className="sp-stat-icon">❌</div>
              <div className="sp-stat-value">{puzzleFailed}</div>
              <div className="sp-stat-label">Puzzles missed</div>
            </div>
          )}
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">📅</div>
            <div className="sp-stat-value">{activeDays}</div>
            <div className="sp-stat-label">Active days<br /><span className="sp-month-sub">this month</span></div>
          </div>
        </section>

        {/* ── Tournaments (last 30 days) — 3 cards ── */}
        <div className="sp-section-title sp-stats-title">🏆 Tournaments (last 30 days)</div>
        <section className="sp-stats">
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">🏆</div>
            <div className="sp-stat-value">{tournamentsPlayed}</div>
            <div className="sp-stat-label">Tournaments played</div>
          </div>
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">♟️</div>
            <div className="sp-stat-value">{tournamentGames}</div>
            <div className="sp-stat-label">Games played</div>
          </div>
          <div className="sp-card sp-stat">
            <div className="sp-stat-icon">🎯</div>
            <div className="sp-stat-value">{tournamentWinRate != null ? `${tournamentWinRate}%` : "—"}</div>
            <div className="sp-stat-label">Win rate</div>
          </div>
        </section>

        {/* Encouraging note + CTA */}
        <section className="sp-card sp-note">
          <p>
            This report is generated from {name}'s activity on Chess Nexus — a
            platform for learning chess through puzzles, games and guided,
            coach-led practice.
          </p>
          <div className="sp-note-actions">
            <Link to="/" className="sp-btn sp-btn-primary">About Chess Nexus →</Link>
          </div>
        </section>

        <footer className="sp-foot">
          Powered by <Link to="/">Chess Nexus</Link> · A private, read-only progress report
        </footer>
      </div>
    </div>
  );
}
