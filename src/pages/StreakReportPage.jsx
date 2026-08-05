// pages/StreakReportPage.jsx
//
// The weekly practice report, earned by a 5-day practice streak.
//
// Layout follows the agreed design: verdict first (the ONE thing to fix), then
// the three phases, endgames actually reached, defence, and the student's own
// mistakes grouped so they can see where their mistakes happen.
//
// Two honesty rules are enforced in the markup, not just the data:
//   • when the 50-game cap bit, say so — never present a sample as the whole week
//   • when a platform could not be reached, say so — a quiet week and a failed
//     fetch must not look identical
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import './StreakReportPage.css';

const PHASE_LABEL = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function StreakReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/api/streak-report/${id}`)
      .then(res => { if (alive) setReport(res.data?.report || null); })
      .catch(e => { if (alive) setError(e.response?.data?.message || 'Could not load this report.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="sr-wrap"><p className="sr-muted">Loading your report…</p></div>;
  if (error)   return <div className="sr-wrap"><p className="sr-muted">{error}</p></div>;
  if (!report) return <div className="sr-wrap"><p className="sr-muted">Report not found.</p></div>;

  if (report.status !== 'done') {
    return (
      <div className="sr-wrap">
        <h1 className="sr-h1">Your report is being prepared</h1>
        <p className="sr-muted">
          {report.status === 'failed'
            ? (report.error || 'Something went wrong. Please try generating it again.')
            : `Analysing your games… ${report.progress?.current || 0} of ${report.progress?.total || 0}. You will get a notification when it is ready.`}
        </p>
        <Link to="/dashboard" className="sr-back">← Back to dashboard</Link>
      </div>
    );
  }

  const p = report.payload || {};
  const phases = p.phases || {};
  const games = p.games || {};

  return (
    <div className="sr-wrap">
      <header className="sr-head">
        <div className="sr-streak-badge">
          <span aria-hidden="true">🔥</span>
          {report.milestoneDay}-day streak · report unlocked
        </div>
        <h1 className="sr-h1">Your last 5 days</h1>
        <div className="sr-meta">
          {fmtDate(report.periodStart)} – {fmtDate(report.periodEnd)}
        </div>
        {/* The week at a glance, before any analysis — a student wants to see
            their own record first, then be told what it means. */}
        <div className="sr-record">
          <span className="sr-pill"><b>{games.analysed || 0}</b> games analysed</span>
          {games.results?.win   > 0 && <span className="sr-pill is-win"><b>{games.results.win}</b> won</span>}
          {games.results?.draw  > 0 && <span className="sr-pill"><b>{games.results.draw}</b> drawn</span>}
          {games.results?.loss  > 0 && <span className="sr-pill is-loss"><b>{games.results.loss}</b> lost</span>}
        </div>
      </header>

      {p.verdict && (
        <div className="sr-verdict">
          <p>{p.verdict.text}</p>
        </div>
      )}

      {/* Sampling and source failures, stated up front rather than buried. */}
      {(games.sampled || Object.keys(games.sourceErrors || {}).length > 0) && (
        <p className="sr-note">
          {games.sampled && (
            <>Analysed {games.analysed} of your {games.found} games this period. </>
          )}
          {Object.entries(games.sourceErrors || {}).map(([src, msg]) => (
            <span key={src}>We could not reach {src === 'chesscom' ? 'Chess.com' : src === 'lichess' ? 'Lichess' : src}, so those games are missing. </span>
          ))}
        </p>
      )}

      {/* ── The three phases ─────────────────────────────────────────── */}
      <section className="sr-section">
        <h2 className="sr-h2">The three phases of your games</h2>
        <p className="sr-sub">
          All {games.analysed || 0} games, Chess Nexus and your other accounts together.
        </p>
        <div className="sr-phases">
          {['opening', 'middlegame', 'endgame'].map(key => {
            const ph = phases[key] || {};
            const weakest = weakestPhase(phases) === key;
            return (
              <div key={key} className={`sr-phase${weakest ? ' is-weak' : ''}`}>
                <span className="sr-phase-name">{PHASE_LABEL[key]}</span>
                <span className="sr-phase-moves">{ph.moves || 0} moves</span>
                <div className="sr-phase-acc">{ph.accuracy != null ? `${ph.accuracy}%` : '—'}</div>
                {/* The bar is the fastest read on the page — you can see which
                    phase is behind without comparing three numbers. */}
                {ph.accuracy != null && (
                  <div className="sr-bar" role="img" aria-label={`${ph.accuracy}% accuracy`}>
                    <i style={{ width: `${Math.max(2, Math.min(100, ph.accuracy))}%` }} />
                  </div>
                )}
                <div className="sr-errline"><span>Blunders</span><b>{ph.blunders || 0}</b></div>
                <div className="sr-errline"><span>Mistakes</span><b>{ph.mistakes || 0}</b></div>
                <div className="sr-errline"><span>Inaccuracies</span><b>{ph.inaccuracies || 0}</b></div>
                {weakest && <div className="sr-tag">Your weakest phase</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Defence ──────────────────────────────────────────────────── */}
      {p.defence?.opportunities > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">How you defend</h2>
          <p className="sr-sub">
            What happens after a game turns against you — the skill most players never measure.
          </p>
          <div className="sr-stats">
            <Stat label="Difficult positions" value={p.defence.opportunities} />
            <Stat label="Saved or held" value={p.defence.recovered + p.defence.turnedAround + p.defence.held} good />
            <Stat label="Collapsed" value={p.defence.collapsed} bad />
            <Stat label="Defensive score" value={p.defence.defensiveScore != null ? `${p.defence.defensiveScore}%` : '—'} />
            <Stat label="Avg. resistance" value={p.defence.avgResistanceMoves != null ? `${p.defence.avgResistanceMoves} moves` : '—'} />
          </div>
        </section>
      )}

      {/* ── Endgames reached ─────────────────────────────────────────── */}
      {(p.endgames || []).length > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">The endgames you reached</h2>
          <p className="sr-sub">Which endgames came up, and how you did once you were in them.</p>
          <div className="sr-scroll">
            <table className="sr-table">
              <thead>
                <tr><th>Endgame</th><th>Reached</th><th>W</th><th>D</th><th>L</th><th>Score</th><th>Accuracy</th></tr>
              </thead>
              <tbody>
                {p.endgames.map(e => (
                  <tr key={e.type}>
                    <th scope="row">{e.type}</th>
                    <td>{e.played}</td><td>{e.wins}</td><td>{e.draws}</td><td>{e.losses}</td>
                    <td className={e.score < 40 ? 'sr-bad' : e.score > 60 ? 'sr-good' : ''}>{e.score}%</td>
                    <td>{e.accuracy != null ? `${e.accuracy}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Time pressure ────────────────────────────────────────────── */}
      {p.timePressure?.hasClockData && (
        <section className="sr-section">
          <h2 className="sr-h2">The clock</h2>
          <div className="sr-stats">
            <Stat label="Moves with time" value={p.timePressure.normalMoves} />
            <Stat label="Moves under a minute" value={p.timePressure.pressuredMoves} />
          </div>
          {p.timePressure.avgDropPressured > p.timePressure.avgDropNormal * 1.5 && (
            <p className="sr-sub">
              Your play falls off sharply when the clock runs low. That is a time-management
              problem rather than a chess one — and it is usually the faster thing to fix.
            </p>
          )}
        </section>
      )}

      {/* ── Moments by category ──────────────────────────────────────── */}
      {(p.moments?.categories || []).length > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">Where your mistakes happen</h2>
          <p className="sr-sub">
            {p.moments.total} positions from your own games. A mistake can belong to more
            than one group — an endgame fork is both — so these add up to more than the total.
          </p>
          <div className="sr-cats">
            {p.moments.categories.map(c => (
              <Link key={c.key} to={`/nexus-guide?category=${c.key}`} className="sr-cat">
                <span className="sr-cat-ic">{c.icon}</span>
                <span className="sr-cat-n">{c.count}</span>
                <span className="sr-cat-label">{c.label}</span>
                {c.unsolved > 0 && <span className="sr-cat-todo">{c.unsolved} to practice</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Practice plan ────────────────────────────────────────────── */}
      {(p.moments?.practice?.plan || []).length > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">Your practice for the next few days</h2>
          <p className="sr-sub">
            The positions that cost you the most, worst first. Five a day — enough to
            actually finish.
          </p>
          <div className="sr-plan">
            {p.moments.practice.plan.map(d => (
              <div key={d.day} className="sr-day">
                <div className="sr-day-h">Day {d.day}</div>
                <div className="sr-day-n">{d.moments.length} positions</div>
              </div>
            ))}
          </div>
          {p.moments.practice.skippedTimeScramble > 0 && (
            <p className="sr-sub">
              {p.moments.practice.skippedTimeScramble} more mistakes came with under a minute
              on the clock. Those are left out of practice — you did not miss the idea, you
              ran out of time to look for it.
            </p>
          )}
        </section>
      )}

      {/* ── Study plan — the payoff: every finding becomes something to DO ── */}
      {(p.suggestions || []).length > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">Study plan — practice from your mistakes</h2>
          <p className="sr-sub">
            Built from the games above, worst first. Everything here comes from a
            position you actually got wrong this week.
          </p>
          <div className="sr-improve">
            {p.suggestions.map(s => (
              <div key={s.key} className="sr-imp">
                <span className="sr-imp-ic" aria-hidden="true">{s.icon}</span>
                <div className="sr-imp-body">
                  <div className="sr-imp-title">{s.title}</div>
                  <p className="sr-imp-detail">{s.detail}</p>
                </div>
                {s.action && (
                  <Link to={s.action.to} className="sr-imp-cta">{s.action.label} →</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Link to="/dashboard" className="sr-back">← Back to dashboard</Link>
    </div>
  );
}

function Stat({ label, value, good, bad }) {
  return (
    <div className="sr-stat">
      <div className={`sr-stat-v${good ? ' sr-good' : ''}${bad ? ' sr-bad' : ''}`}>{value}</div>
      <div className="sr-stat-l">{label}</div>
    </div>
  );
}

// Which phase is furthest behind — used to mark one card, so the page has a
// single obvious answer to "what should I work on".
function weakestPhase(phases) {
  const withAcc = ['opening', 'middlegame', 'endgame'].filter(p => phases?.[p]?.accuracy != null);
  if (withAcc.length < 2) return null;
  return withAcc.reduce((a, b) => (phases[a].accuracy <= phases[b].accuracy ? a : b));
}
