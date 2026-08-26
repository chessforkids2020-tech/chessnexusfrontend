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
/**
 * The six-month line.
 *
 * Hand-drawn SVG rather than a chart library: it is one polyline, it has to
 * survive being printed and forwarded by a parent, and pulling in a charting
 * dependency for this would be the larger decision.
 *
 * NO Y-AXIS NUMBERS, deliberately. The score is a composite of five different
 * signals — "68" is not a rating and not a percentage, and putting it on an
 * axis invites a parent to read meaning into a number that has none on its
 * own. The shape is the message.
 *
 * A month with no data is null and BREAKS the line rather than dropping to
 * zero: a gap reads as "nothing happened", a plunge to the floor reads as "my
 * child collapsed", and only one of those is true.
 */
function ProgressChart({ points }) {
  const W = 640, H = 170, PAD_X = 28, PAD_Y = 20;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const x = (i) => PAD_X + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (score) => PAD_Y + innerH - (score / 100) * innerH;

  // Split into runs of consecutive scored months, so a gap draws as a gap.
  const runs = [];
  let run = [];
  points.forEach((p, i) => {
    if (p.score === null) { if (run.length) runs.push(run); run = []; return; }
    run.push({ ...p, i });
  });
  if (run.length) runs.push(run);

  return (
    <div className="sp-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sp-chart" role="img"
           aria-label="Progress over the last six months">
        {/* Three faint guides. Unlabelled — they give the eye a reference for
            rise and fall without implying the numbers mean something. */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD_X} x2={W - PAD_X}
                y1={PAD_Y + innerH * f} y2={PAD_Y + innerH * f}
                className="sp-chart-grid" />
        ))}

        {runs.map((r, ri) => (
          <g key={ri}>
            {r.length > 1 && (
              <polyline
                className="sp-chart-line"
                points={r.map(p => `${x(p.i)},${y(p.score)}`).join(' ')}
              />
            )}
            {r.map(p => (
              <circle key={p.key} cx={x(p.i)} cy={y(p.score)} r="5"
                      className="sp-chart-dot">
                <title>{`${p.label}: ${p.puzzleCount} puzzles, ${p.gameCount} games`}</title>
              </circle>
            ))}
          </g>
        ))}

        {points.map((p, i) => (
          <text key={p.key} x={x(i)} y={H - 4} className="sp-chart-label"
                textAnchor="middle">{p.label}</text>
        ))}
      </svg>
    </div>
  );
}

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

  // Games played on linked Lichess / Chess.com accounts (last 30 days).
  const ext = data.externalGames || null;
  const extCount = (p) => {
    if (!p) return null;                       // platform not linked
    if (p.error) return p.error === "not_found" ? "—" : "—";
    return `${p.count ?? 0}${p.capped ? "+" : ""}`;
  };
  const lichessGames = ext ? extCount(ext.lichess) : null;
  const chesscomGames = ext ? extCount(ext.chesscom) : null;

  // Active days this month.
  const activeDays = data.activeDays || 0;
  // Plain-English verdict for a non-playing parent (helpers/parentSummary.js).
  // Absent on older cached responses, so the section simply does not render.
  const summary = data.summary || null;
  // Six-month progress line. Absent on older responses — the section hides.
  const progress = data.progress || null;
  // What the child actually LEARNED, in plain words (helpers/learningNarrative.js).
  // null whenever there is not enough data to say anything honest.
  const learning = data.learning || null;
  // The coach message, if they wrote one. Plain text, never HTML.
  const coachNote = data.coachNote || "";
  const coachNoteAt = data.coachNoteAt || null;

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

        {/* ── THE ANSWER, FIRST ─────────────────────────────────────────────
            Most parents paying for chess classes do not play chess. A page of
            ratings, accuracy and win rates tells them nothing — a coach fed
            this back directly. So the report now opens with the two things
            they are actually asking: is my child doing the work, and are they
            getting better. Everything below is still here for the parents who
            want detail, and for the coach.

            The wording is decided server-side (helpers/parentSummary.js), where
            it can refuse to give a verdict at all when there is not enough
            activity to judge one honestly. */}
        {summary && (
          <section className={`sp-card sp-verdict sp-verdict-${summary.status}`}>
            <div className="sp-verdict-head">
              <span className="sp-verdict-icon" aria-hidden="true">
                {summary.status === 'great' ? '🌟'
                  : summary.status === 'good' ? '👍'
                  : summary.status === 'steady' ? '📈'
                  : summary.status === 'needs-attention' ? '⚠️' : 'ℹ️'}
              </span>
              <h2 className="sp-verdict-title">{summary.headline}</h2>
            </div>
            <p className="sp-verdict-detail">{summary.detail}</p>
            {summary.progress && (
              <p className="sp-verdict-progress">{summary.progress}</p>
            )}
            {summary.effort && (
              <p className="sp-verdict-effort">This month: {summary.effort}.</p>
            )}
          </section>
        )}

        {/* ── WHAT THEY ARE LEARNING ────────────────────────────────────────
            The verdict above says whether they are improving, in ratings. This
            says WHAT changed, which is the thing a parent who does not play
            chess can actually understand and act on.

            Directly under the verdict and above the coach note: it answers the
            second question a parent asks, and the coach note is often empty. */}
        {learning?.sentences?.length > 0 && (
          <section className="sp-card sp-learning">
            <h2 className="sp-learning-head">
              <span aria-hidden="true">🎯</span>
              {learning.source === 'puzzles' ? 'Their practice this month' : 'What they are learning'}
            </h2>
            {learning.sentences.map((line, i) => (
              <p key={i} className="sp-learning-line">{line}</p>
            ))}
          </section>
        )}

        {/* ── THE COACH'S OWN WORDS ─────────────────────────────────────────
            Placed above the numbers because it is the part a parent trusts
            most: a person who teaches their child, saying what they think.
            Every figure below is generated; this one is not.

            Rendered as plain text with pre-wrap — the coach typed line breaks
            and those are what they meant. Never HTML: this page is reachable
            by anyone holding the token. */}
        {coachNote && (
          <section className="sp-card sp-coachnote">
            <div className="sp-coachnote-head">
              <span className="sp-coachnote-icon" aria-hidden="true">💬</span>
              <div>
                <div className="sp-coachnote-title">A note from your coach</div>
                {coachNoteAt && (
                  <div className="sp-coachnote-date">
                    {new Date(coachNoteAt).toLocaleDateString(undefined,
                      { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            <p className="sp-coachnote-body">{coachNote}</p>
          </section>
        )}

        {/* ── SIX-MONTH PROGRESS LINE ───────────────────────────────────────
            One line, five signals averaged: puzzle accuracy, how fast they
            solve, how hard the puzzles are, blunders per game, and results
            against rated opponents. Five separate charts would be the wall of
            numbers this report is trying to replace — a parent cannot weigh
            five lines against each other.

            The parent reads the SHAPE, not the number. Deliberately no y-axis
            values: "68" means nothing to them, and rising does. */}
        {progress?.points?.some(p => p.score !== null) && (
          <section className="sp-card sp-trend">
            <div className="sp-section-title">📈 Progress over 6 months</div>
            <p className="sp-trend-lead">
              {progress.direction === 'up'
                ? 'The line is going up — they are getting better.'
                : progress.direction === 'down'
                ? 'The line has dipped. Worth a word with your coach about what changed.'
                : progress.direction === 'steady'
                ? 'Holding steady. Chess improves in steps, so flat stretches are normal.'
                : 'Not enough months yet to show a trend.'}
            </p>
            <ProgressChart points={progress.points} />
            <p className="sp-trend-note">
              This combines how accurately they solve puzzles, how quickly, how
              hard those puzzles are, and how they play in games — into one
              score per month. A gap means there was too little activity that
              month to measure.
            </p>
          </section>
        )}

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

        {/* ── Online games on Lichess / Chess.com (last 30 days) ── */}
        {ext && (lichessGames != null || chesscomGames != null) && (
          <>
            <div className="sp-section-title sp-stats-title">🌐 Online games (last 30 days)</div>
            <section className="sp-stats">
              {lichessGames != null && (
                <div className="sp-card sp-stat">
                  <div className="sp-stat-icon">♞</div>
                  <div className="sp-stat-value">{lichessGames}</div>
                  <div className="sp-stat-label">
                    Lichess games
                    {ext.lichess?.username ? <><br /><span className="sp-month-sub">@{ext.lichess.username}</span></> : null}
                  </div>
                </div>
              )}
              {chesscomGames != null && (
                <div className="sp-card sp-stat">
                  <div className="sp-stat-icon">♟️</div>
                  <div className="sp-stat-value">{chesscomGames}</div>
                  <div className="sp-stat-label">
                    Chess.com games
                    {ext.chesscom?.username ? <><br /><span className="sp-month-sub">@{ext.chesscom.username}</span></> : null}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

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
