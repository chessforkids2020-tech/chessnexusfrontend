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
import { viewOpenings, viewComparison } from '../lib/streakReportView';
import './StreakReportPage.css';
import { t as tr } from '../i18n/LanguageContext';

const PHASE_LABEL = { opening: tr('Opening'), middlegame: tr('Middlegame'), endgame: tr('Endgame') };

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
      .catch(e => { if (alive) setError(e.response?.data?.message || tr('Could not load this report.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="sr-wrap"><p className="sr-muted">{tr("Loading your report…")}</p></div>;
  if (error)   return <div className="sr-wrap"><p className="sr-muted">{error}</p></div>;
  if (!report) return <div className="sr-wrap"><p className="sr-muted">{tr("Report not found.")}</p></div>;

  if (report.status !== 'done') {
    return (
      <div className="sr-wrap">
        <h1 className="sr-h1">{tr("Your report is being prepared")}</h1>
        <p className="sr-muted">
          {report.status === 'failed'
            ? (report.error || 'Something went wrong. Please try generating it again.')
            : tr("Analysing your games… {v0} of {v1}. You will get a notification when it is ready.", { v0: report.progress?.current || 0, v1: report.progress?.total || 0 })}
        </p>
        <Link to="/dashboard" className="sr-back">{tr("← Back to dashboard")}</Link>
      </div>
    );
  }

  const p = report.payload || {};
  const phases = p.phases || {};
  const games = p.games || {};

  // Read-side repairs for payloads written before the current builder. Shared
  // with the coach's view of this same report — see lib/streakReportView.js for
  // why these cannot live in this file.
  const openings = viewOpenings(p);
  const comparison = viewComparison(report);
  // The free dashboard "weakness report" (kind 'quick'): a chosen window and
  // time control, no Chess Nexus puzzle stats (those rows/cards hide on null).
  const quick = report.kind === 'quick';
  const QUICK_TC = { rapid: tr('Rapid'), blitz: tr('Blitz'), blitz_rapid: tr('Blitz + Rapid'), classical: tr('Classical') };
  const periodWords = quick ? (report.days === 14 ? 'these two weeks' : 'these seven days') : 'these five days';

  return (
    <div className="sr-wrap">
      <header className="sr-head">
        {quick ? (
          <div className="sr-streak-badge">
            <span aria-hidden="true">🔍</span>
            {tr("Weakness report ·")} {QUICK_TC[report.timeControl] || tr('All games')}
          </div>
        ) : (
          <div className="sr-streak-badge">
            <span aria-hidden="true">🔥</span>
            {report.milestoneDay}{tr("-day streak · report unlocked")}
          </div>
        )}
        <h1 className="sr-h1">
          {quick ? (report.days === 14 ? 'Your last 2 weeks' : 'Your last 7 days') : 'Your last 5 days'}
        </h1>
        <div className="sr-meta">
          {fmtDate(report.periodStart)} – {fmtDate(report.periodEnd)}
        </div>
        {/* The week at a glance, before any analysis — a student wants to see
            their own record first, then be told what it means. */}
        <div className="sr-record">
          <span className="sr-pill"><b>{games.analysed || 0}</b> {tr("games analysed")}</span>
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
            <>{tr("Analysed")} {games.analysed} {tr("of your")} {games.found} {tr("games this period.")} </>
          )}
          {Object.entries(games.sourceErrors || {}).map(([src, msg]) => (
            <span key={src}>{tr("We could not reach")} {src === 'chesscom' ? 'Chess.com' : src === 'lichess' ? 'Lichess' : src}{tr(", so those games are missing.")} </span>
          ))}
        </p>
      )}

      {/* ── The three phases ─────────────────────────────────────────── */}
      <section className="sr-section">
        <SectionHead
          title={tr("The three phases of your games")}
          help={tr("All {v0} games, Chess Nexus and your other accounts together. Accuracy is how close your moves were to the best move available, so 100% would mean playing like the engine.", { v0: games.analysed || 0 })}
        />
        <div className="sr-phases">
          {['opening', 'middlegame', 'endgame'].map(key => {
            const ph = phases[key] || {};
            const weakest = weakestPhase(phases) === key;
            return (
              <div key={key} className={`sr-phase${weakest ? ' is-weak' : ''}`}>
                <span className="sr-phase-name">{PHASE_LABEL[key]}</span>
                <span className="sr-phase-moves">{ph.moves || 0} {tr("moves")}</span>
                <div className="sr-phase-acc">{ph.accuracy != null ? `${ph.accuracy}%` : '—'}</div>
                {/* The bar is the fastest read on the page — you can see which
                    phase is behind without comparing three numbers. */}
                {ph.accuracy != null && (
                  <div className="sr-bar" role="img" aria-label={tr("{accuracy}% accuracy", { accuracy: ph.accuracy })}>
                    <i style={{ width: `${Math.max(2, Math.min(100, ph.accuracy))}%` }} />
                  </div>
                )}
                <div className="sr-errline"><span>{tr("Blunders")}</span><b>{ph.blunders || 0}</b></div>
                <div className="sr-errline"><span>{tr("Mistakes")}</span><b>{ph.mistakes || 0}</b></div>
                <div className="sr-errline"><span>{tr("Inaccuracies")}</span><b>{ph.inaccuracies || 0}</b></div>
                {weakest && <div className="sr-tag">{tr("Your weakest phase")}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Defence ──────────────────────────────────────────────────── */}
      {p.defence?.opportunities > 0 && (
        <section className="sr-section">
          <SectionHead
            title={tr("How you defend")}
            help={<>
            {tr("What happens after a game turns against you — the skill most players never measure.")}
          </>}
          />
          <div className="sr-stats">
            <Stat label={tr("Difficult positions")} value={p.defence.opportunities} />
            <Stat label={tr("Saved or held")} value={p.defence.recovered + p.defence.turnedAround + p.defence.held} good />
            <Stat label={tr("Collapsed")} value={p.defence.collapsed} bad />
            <Stat label={tr("Defensive score")} value={p.defence.defensiveScore != null ? `${p.defence.defensiveScore}%` : '—'} />
            <Stat label={tr("Avg. resistance")} value={p.defence.avgResistanceMoves != null ? tr("{avgResistanceMoves} moves", { avgResistanceMoves: p.defence.avgResistanceMoves }) : '—'} />
          </div>
        </section>
      )}

      {/* ── Endgames reached ─────────────────────────────────────────── */}
      {(p.endgames || []).length > 0 && (
        <section className="sr-section">
          <SectionHead
            title={tr("The endgames you reached")}
            help="Which endgames came up, and how you did once you were in them."
          />
          <div className="sr-scroll">
            <table className="sr-table">
              <thead>
                <tr><th>{tr("Endgame")}</th><th>{tr("Reached")}</th><th>W</th><th>D</th><th>L</th><th>{tr("Score")}</th><th>{tr("Accuracy")}</th></tr>
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

      {/* ── Openings you played ──────────────────────────────────────────
          openingSummary() has always been computed and saved in the payload;
          the page simply never rendered it. */}
      {openings.length > 0 && (
        <section className="sr-section">
          <SectionHead
            title={tr("Openings you played")}
            help={<>
            Grouped by opening, not by variation — three Sicilians are three
            Sicilians however they continued. Openings you played only once are left
            out: one game is not a pattern.
          </>}
          />
          <div className="sr-scroll">
            <table className="sr-table">
              <thead>
                <tr><th>{tr("Opening")}</th><th>{tr("Side")}</th><th>{tr("Games")}</th><th>W</th><th>D</th><th>L</th><th>{tr("Score")}</th></tr>
              </thead>
              <tbody>
                {openings.slice(0, 12).map((o, i) => (
                  <tr key={`${o.opening}-${o.side}-${i}`}>
                    <th scope="row">
                      {o.opening}
                      {(o.ecoCode || o.variations > 1) && (
                        <small style={{ display: 'block', fontWeight: 400, opacity: 0.6 }}>
                          {o.ecoCode}
                          {o.ecoCode && o.variations > 1 ? ' · ' : ''}
                          {o.variations > 1 ? tr("{variations} variations", { variations: o.variations }) : ''}
                        </small>
                      )}
                    </th>
                    <td>{o.side === 'white' ? 'White' : o.side === 'black' ? 'Black' : '—'}</td>
                    <td>{o.games}</td>
                    <td>{o.wins}</td><td>{o.draws}</td><td>{o.losses}</td>
                    <td className={o.score < 40 ? 'sr-bad' : o.score > 60 ? 'sr-good' : ''}>{o.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Motifs you missed ────────────────────────────────────────────
          momentThemes is already computed and stored. Bars rather than a table:
          the point is which motif is WORST, and a length is read faster than a
          number. */}
      {(p.momentThemes || []).length > 0 && (
        <section className="sr-section">
          <SectionHead
            title={tr("The patterns you missed")}
            help={<>
            The tactical motifs behind your mistakes this period, most frequent first.
            These come from your own games, not from a puzzle set.
          </>}
          />
          <div className="sr-motifs">
            {p.momentThemes.slice(0, 8).map(t => {
              const top = p.momentThemes[0]?.count || 1;
              return (
                <div className="sr-motif" key={t.theme}>
                  <span className="sr-motif-name">{prettyTheme(t.theme)}</span>
                  <span className="sr-motif-val">
                    {t.count}<span className="sr-motif-unit"> {tr("missed")}</span>
                  </span>
                  <div className="sr-motif-track">
                    <i style={{ width: `${Math.max(6, Math.round((t.count / top) * 100))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Report-over-report comparison ────────────────────────────────
          Renders from the FIRST report onward. With no history it is a baseline
          rather than a comparison: the numbers to beat, plus what this period's
          practice actually consisted of. A student's first report should still
          tell them where they stand and what "more practice" would mean —
          hiding the section entirely taught them nothing and gave them no
          reason to come back for a second one. */}
      {comparison.current && (
        <section className="sr-section">
          {/* One fixed title. It used to name the column count ("Four reports,
              side by side"), which was wrong for everyone who did not have four,
              and swapping in "Your baseline" for a first report meant the same
              section changed name as a student earned more — so nobody could
              learn where to look for it.

              On a FIRST report there is nothing to explain: the table shows one
              filled column and one hatched "Next report" column waiting, which
              says it without a sentence. So no "?" appears there at all. */}
          <SectionHead
            title={tr("Weekly report")}
            help={(comparison.history || []).length > 0
              ? 'Each column is one report period, oldest first. The small figure under a number is the change from the report before it. Periods never overlap, so a change here is a real change in your play.'
              : null}
          />

          {/* No stat cards above the table. They repeated "games analysed" from
              the masthead and "mistakes found" from the table's own row, so the
              same figure appeared three times on one page. */}
          <div className="sr-scroll">
            <table className="sr-table sr-compare">
              <thead>
                <tr>
                  <th>{tr("Measure")}</th>
                  {comparison.columns.map((c, i) => (
                    <th key={i} className={i === comparison.columns.length - 1 ? 'sr-now' : ''}>
                      {comparison.columns.length === 1
                        ? 'This report'
                        : i === comparison.columns.length - 1 ? 'This report' : tr("Report {v0}", { v0: i + 1 })}
                      <span className="sr-wk">{fmtDate(c.periodStart)}</span>
                    </th>
                  ))}
                  {/* A ghost column on a first report: the shape of what comes
                      next, so the table reads as "one down, one to go" rather
                      than a list with a missing half. */}
                  {comparison.columns.length === 1 && (
                    <th className="sr-next">
                      {tr("Next report")}
                      <span className="sr-wk">{quick ? 'next week' : 'after 5 more days'}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Grouped the way the report is read: what you practised, how
                    you played, what you played, what you studied. A flat list of
                    eight numbers made the reader work out which belonged
                    together. A group whose every row is empty hides itself, so a
                    student with no study work does not get an empty heading. */}
                <CompareGroup label={tr("Puzzles — Chess Nexus")} cols={comparison.columns}
                  rows={[
                    { label: tr('Puzzles solved'), field: 'puzzles' },
                    { label: tr('Puzzle accuracy'), field: 'puzzleAccuracy', suffix: '%' },
                    // Lower is better only up to a point — rushing is not a
                    // virtue in puzzles — so this is NOT marked lowerIsBetter.
                    // It is shown so a student can see whether they are
                    // guessing quickly or thinking.
                    { label: tr('Avg time per puzzle'), field: 'avgPuzzleSeconds', suffix: ' sec' },
                    { label: tr('Best streak'), sub: tr('correct in a row'), field: 'bestStreak' },
                    { label: tr('Days practised'), field: 'daysPractised' },
                  ]} />

                <CompareGroup label={tr("Play — accuracy by phase")} cols={comparison.columns}
                  rows={[
                    { label: tr('Games analysed'), field: 'gamesAnalysed' },
                    { label: tr('Opening'), field: 'opening', suffix: '%' },
                    { label: tr('Middlegame'), field: 'middlegame', suffix: '%' },
                    { label: tr('Endgame'), field: 'endgame', suffix: '%' },
                    { label: tr('Blunders per game'), field: 'blundersPerGame', lowerIsBetter: true },
                    // The most actionable line in the table for a beginner:
                    // not "71% accuracy" but "you drop a piece to a one-move
                    // shot about once a game".
                    { label: tr('Pieces lost to one-move tactics'), sub: tr('per game'),
                      field: 'oneMoveLossesPerGame', lowerIsBetter: true },
                    { label: tr('Defensive score'), field: 'defensiveScore', suffix: '%' },
                    // "Mistakes found" removed: it counted the moments the
                    // analyser extracted, not the student's play, so it moved
                    // with how many games were analysed rather than with how
                    // well they played — and "Blunders per game" above already
                    // answers the question honestly.
                  ]} />

                {/* The point of tracking performance rather than rating: this
                    row is where "am I getting stronger?" is actually answered,
                    report over report. */}
                <CompareGroup label={tr("Tournament performance — Chess Nexus")} cols={comparison.columns}
                  rows={[
                    { label: tr('Performance rating'), sub: tr('blitz + rapid'), field: 'performance' },
                    { label: tr('Blitz'), field: 'performanceBlitz' },
                    { label: tr('Rapid'), field: 'performanceRapid' },
                  ]} />

                <CompareGroup label={tr("Games played")} cols={comparison.columns}
                  rows={[
                    { label: tr('Chess Nexus arena'), field: 'arenaGames' },
                    { label: tr('Lichess + Chess.com'), field: 'externalGames' },
                    { label: tr('Win rate'), sub: tr('all games'), field: 'winRate', suffix: '%' },
                  ]} />

                <CompareGroup label={tr("Study")} cols={comparison.columns}
                  rows={[
                    { label: tr('Endgames played out'), field: 'endgamesPlayed' },
                    { label: tr('Chapters completed'), field: 'studies' },
                  ]} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Where the work came from ─────────────────────────────────────
          bySource has always been collected and saved; the page never showed
          it. Worth showing because it answers "did you actually look at ALL my
          chess?" — the thing that makes this report different from the
          single-site stats a student already gets on Lichess or Chess.com.
          It is also where the honest limitation belongs: we can name the motif
          behind every Chess Nexus mistake, and cannot for the other two. */}
      {Object.values(p.games?.bySource || {}).some(n => n > 0) && (
        <section className="sr-section">
          <SectionHead
            title={tr("Where the work came from")}
            help={<>
            Your games from every account go into the phase and endgame analysis above.
            Puzzle motifs are the one thing only Chess Nexus can give you.
          </>}
          />
          <div className="sr-sources">
            {[
              { key: 'chessnexus', name: tr('Chess Nexus'),
                lines: ['Every motif named and scored', 'Your moves kept, right and wrong', 'Failed positions ready to redo'],
                limit: null },
              { key: 'lichess', name: tr('Lichess'),
                lines: ['Openings played, by result', 'Win / draw / loss'],
                limit: 'Puzzles solved on Lichess stay on Lichess — we cannot see the motifs.' },
              { key: 'chesscom', name: tr('Chess.com'),
                lines: ['Openings played, by result', 'Win / draw / loss'],
                limit: 'Same here — games yes, puzzle detail no.' },
            ].map(src => {
              const n = p.games.bySource[src.key] || 0;
              const failed = (p.games.sourceErrors || {})[src.key];
              const pt = src.key === 'chessnexus' ? p.practiceTotals : null;
              // Did the student do ANY Chess Nexus work — puzzles, endgames or
              // studies — not just play games here?
              const practised = (pt?.puzzles || 0) + (pt?.endgames || 0) + (pt?.studies || 0) > 0;
              // Chess Nexus is the only source that also carries PRACTICE, so
              // its headline is the puzzle count when we have one — games alone
              // badly understate what the student did here.
              const headline = pt?.puzzles > 0
                ? tr("{puzzles} puzzle{v1}", { puzzles: pt.puzzles, v1: pt.puzzles === 1 ? '' : 's' })
                : tr("{n} game{v1}", { n: n, v1: n === 1 ? '' : 's' });
              // Hide a source only when there is genuinely nothing to say about
              // it. Chess Nexus previously disappeared whenever no GAMES were
              // played here, which hid a week of puzzle practice — the one thing
              // this card exists to show.
              if (!n && !failed && !practised) return null;
              return (
                <div className="sr-src" key={src.key}>
                  <div className="sr-src-who">{src.name}</div>
                  <div className="sr-src-big">{headline}</div>
                  {failed ? (
                    <p className="sr-src-limit">{tr("Could not be reached this period, so these games are missing.")}</p>
                  ) : (
                    <>
                      <ul>
                        {src.lines.map(l => <li key={l}>{l}</li>)}
                        {/* n, not pt.arenaGames: this is the count of games
                            actually collected for the report, so it agrees with
                            the headline and with the comparison table. */}
                        {n > 0 && src.key === 'chessnexus' && <li>{n} arena game{n === 1 ? '' : 's'}</li>}
                        {pt?.endgames > 0 && <li>{pt.endgames} endgame{pt.endgames === 1 ? '' : 's'} played out</li>}
                        {pt?.studies > 0 && <li>{pt.studies} study chapter{pt.studies === 1 ? '' : 's'}</li>}
                      </ul>
                      {src.limit && <p className="sr-src-limit">{src.limit}</p>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tournament performance ───────────────────────────────────────
          Set apart from every other number on the page, because it answers a
          different question. A rating says what the system currently believes
          about you and moves slowly; a PERFORMANCE rating says what strength
          you actually played at over these five days. A student improving sees
          it here first, weeks before their rating catches up.

          Absent entirely below the minimum sample — see helpers/performanceRating.js.
          A performance figure from three games is noise, and printing it would
          be the kind of flattering nonsense this report is meant to avoid. */}
      {p.performance && (
        <section className="sr-section sr-perf">
          <h2 className="sr-h2">{tr("Tournament performance")}</h2>
          <p className="sr-sub">
            {tr("How strongly you actually played in Chess Nexus tournaments over")}{' '}
            {periodWords} {tr("— blitz and rapid only. This is not your rating: it is the")}
            level your results were worth, and it moves before your rating does.
          </p>
          <div className="sr-stats">
            <Stat
              label={tr("Performance")}
              value={p.performance.performance}
              sub={`${p.performance.score}/${p.performance.games} vs ~${p.performance.avgOpponent}`}
            />
            {p.performance.byCategory?.blitz && (
              <Stat
                label={tr("Blitz")}
                value={p.performance.byCategory.blitz.performance}
                sub={tr("{games} games", { games: p.performance.byCategory.blitz.games })}
              />
            )}
            {p.performance.byCategory?.rapid && (
              <Stat
                label={tr("Rapid")}
                value={p.performance.byCategory.rapid.performance}
                sub={tr("{games} games", { games: p.performance.byCategory.rapid.games })}
              />
            )}
          </div>
        </section>
      )}

      {/* ── What they practised ──────────────────────────────────────────
          Puzzle counts alone say how MUCH work was done, never what KIND.
          This is the "which topics did I do, and where am I strong or weak"
          answer the counts could not give.

          Grouped by the training surface the student chose — Healthy Mix, a
          theme, a piece count, a rating band — because that is what they
          believe they practised. Chess Nexus only, by construction: these come
          from Score rows, which no Lichess or Chess.com import ever writes. */}
      {p.practiceTotals?.topics?.length > 0 && (
        <section className="sr-section">
          <h2 className="sr-h2">{tr("What you practised")}</h2>

          {(p.practiceTotals.topicStrongest || p.practiceTotals.topicWeakest) && (
            <div className="sr-stats">
              {p.practiceTotals.topicMost && (
                <Stat
                  label={tr("Most practised")}
                  value={p.practiceTotals.topicMost.topic}
                  sub={tr("{attempts} puzzles", { attempts: p.practiceTotals.topicMost.attempts })}
                />
              )}
              {p.practiceTotals.topicStrongest && (
                <Stat
                  label={tr("Strongest")}
                  value={p.practiceTotals.topicStrongest.topic}
                  sub={tr("{accuracy}% solved", { accuracy: p.practiceTotals.topicStrongest.accuracy })}
                />
              )}
              {p.practiceTotals.topicWeakest && (
                <Stat
                  label={tr("Needs work")}
                  value={p.practiceTotals.topicWeakest.topic}
                  sub={tr("{accuracy}% solved", { accuracy: p.practiceTotals.topicWeakest.accuracy })}
                />
              )}
            </div>
          )}

          <table className="sr-table">
            <thead>
              <tr><th>{tr("Topic")}</th><th>{tr("Puzzles")}</th><th>{tr("Solved")}</th><th>{tr("Accuracy")}</th></tr>
            </thead>
            <tbody>
              {p.practiceTotals.topics.map(t => {
                // Below the threshold nothing is claimed about the topic — an
                // accuracy from one or two puzzles is noise, and calling it a
                // weakness would be wrong.
                const judged = t.attempts >= (p.practiceTotals.topicsMinToJudge || 5);
                return (
                  <tr key={t.topic}>
                    {/* th[scope=row], not td — that is what carries --sr-text in
                        .sr-table, and it is how every other table on this page
                        labels its rows. A plain td has no colour rule and
                        renders near-invisible on the dark panel. */}
                    <th scope="row">{t.topic}</th>
                    <td>{t.attempts}</td>
                    <td>{t.solved}</td>
                    <td>{judged ? `${t.accuracy}%` : <span className="sr-muted">{tr("too few")}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="sr-sub">
            Only work done on Chess Nexus is counted here — puzzles solved on
            Lichess or Chess.com stay there, so we cannot see what they were
            {tr("about. A topic needs at least")} {p.practiceTotals.topicsMinToJudge || 5}{' '}
            puzzles before it is called a strength or a weakness.
          </p>
        </section>
      )}

      {/* ── Time pressure ────────────────────────────────────────────── */}
      {p.timePressure?.hasClockData && (
        <section className="sr-section">
          <h2 className="sr-h2">{tr("The clock")}</h2>
          <div className="sr-stats">
            <Stat label={tr("Moves with time")} value={p.timePressure.normalMoves} />
            <Stat label={tr("Moves under a minute")} value={p.timePressure.pressuredMoves} />
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
          <SectionHead
            title={tr("Where your mistakes happen")}
            help={<>
            {p.moments.total} {tr("positions from your own games. A mistake can belong to more")}
            than one group — an endgame fork is both — so these add up to more than the total.
          </>}
          />
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
          <SectionHead
            title={tr("Your practice for the next few days")}
            help={<>
            The positions that cost you the most, worst first. Five a day — enough to
            actually finish.
          </>}
          />
          <div className="sr-plan">
            {p.moments.practice.plan.map(d => (
              <div key={d.day} className="sr-day">
                <div className="sr-day-h">{tr("Day")} {d.day}</div>
                <div className="sr-day-n">{d.moments.length} {tr("positions")}</div>
              </div>
            ))}
          </div>
          {p.moments.practice.skippedTimeScramble > 0 && (
            <p className="sr-sub">
              {p.moments.practice.skippedTimeScramble} {tr("more mistakes came with under a minute")}
              on the clock. Those are left out of practice — you did not miss the idea, you
              ran out of time to look for it.
            </p>
          )}
        </section>
      )}

      {/* ── Study plan — the payoff: every finding becomes something to DO ── */}
      {(p.suggestions || []).length > 0 && (
        <section className="sr-section">
          <SectionHead
            title={tr("Study plan — practice from your mistakes")}
            help="Built from the games above, worst first. Everything here comes from a position you actually got wrong this week."
          />
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

      <Link to="/dashboard" className="sr-back">{tr("← Back to dashboard")}</Link>
    </div>
  );
}

/**
 * A section heading with its explanation tucked behind a "?".
 *
 * Every section used to carry two or three lines of prose under its title. Each
 * line was worth having — they say what a number MEANS, which is the difference
 * between a report and a scoreboard — but ten of them pushed the actual figures
 * a long way down, and a student rereading their report has already read them.
 *
 * So the text stays, one tap away. Collapsed by default because the numbers are
 * what people come back for; the "?" is always there for the first read, or for
 * a parent seeing the report for the first time.
 */
function SectionHead({ title, help }) {
  const [open, setOpen] = useState(false);
  if (!help) return <h2 className="sr-h2">{title}</h2>;
  return (
    <>
      <h2 className="sr-h2">
        {title}
        <button
          type="button"
          className={`sr-help${open ? ' is-open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={open ? tr("Hide explanation of {title}", { title: title }) : tr("What does {title} mean?", { title: title })}
        >
          ?
        </button>
      </h2>
      {open && <p className="sr-sub sr-sub--help">{help}</p>}
    </>
  );
}

// detectTheme() emits snake_case keys ('discovered_attack'). Shown to children,
// so they are spelled out rather than title-cased mechanically.
const THEME_LABELS = {
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discovered_attack: 'Discovered attacks',
  hanging_piece: 'Hanging pieces',
  queen_win: 'Winning the queen',
  mate: 'Missed mates',
  sacrifice: 'Sacrifices',
  long_combination: 'Long combinations',
  tactic: 'Other tactics',
};
function prettyTheme(t) {
  return THEME_LABELS[t] || String(t || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

/**
 * One row of the side-by-side table: the value per report, each with its change
 * from the column before.
 *
 * `lowerIsBetter` flips the colour for measures where down is good (blunders per
 * game, mistakes found) — without it a student cutting their blunders in half
 * would see it painted red.
 *
 * A null value prints "—" and suppresses the delta: a phase that was never
 * reached has no accuracy, and inventing 0 would read as playing it terribly.
 */
/**
 * A labelled band of related rows.
 *
 * Hides itself entirely when every row in it is empty for every column, so a
 * student who has done no studies is not shown a "Study" heading over blanks —
 * an empty group reads as missing data rather than as work not yet done.
 */
function CompareGroup({ label, cols, rows }) {
  const live = rows.filter(r => cols.some(c => c[r.field] != null));
  if (!live.length) return null;
  return (
    <>
      <tr className="sr-group">
        <th scope="row" colSpan={cols.length + (cols.length === 1 ? 2 : 1)}>{label}</th>
      </tr>
      {live.map(r => <CompareRow key={r.field} cols={cols} {...r} />)}
    </>
  );
}

function CompareRow({ label, sub, cols, field, suffix = '', lowerIsBetter = false }) {
  return (
    <tr>
      <th scope="row">
        {label}
        {sub && <small className="sr-rowsub">{sub}</small>}
      </th>
      {cols.map((c, i) => {
        const v = c[field];
        const prev = i > 0 ? cols[i - 1][field] : null;
        const hasDelta = v != null && prev != null;
        const d = hasDelta ? +(v - prev).toFixed(2) : null;
        const better = d == null || d === 0 ? null : (lowerIsBetter ? d < 0 : d > 0);
        return (
          <td key={i} className={i === cols.length - 1 ? 'sr-now' : ''}>
            {v == null ? '—' : `${v}${suffix}`}
            {hasDelta && d !== 0 && (
              <span className={`sr-delta ${better ? 'sr-good' : 'sr-bad'}`}>
                {d > 0 ? '+' : ''}{d}{suffix}
              </span>
            )}
          </td>
        );
      })}
      {/* Empty cell under the "Next report" ghost header, so a first report's
          table has a visible slot waiting to be filled rather than a ragged
          edge. */}
      {cols.length === 1 && <td className="sr-next">·</td>}
    </tr>
  );
}

// `sub` is an optional second line under the label — used where the value is a
// NAME rather than a number ("Fork") and the figure behind it still matters
// ("83% solved"). Omitted everywhere else, so existing call sites are unchanged.
function Stat({ label, value, good, bad, sub }) {
  return (
    <div className="sr-stat">
      <div className={`sr-stat-v${good ? ' sr-good' : ''}${bad ? ' sr-bad' : ''}`}>{value}</div>
      <div className="sr-stat-l">{label}</div>
      {sub && <div className="sr-stat-sub">{sub}</div>}
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
