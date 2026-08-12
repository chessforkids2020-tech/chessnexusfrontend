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

  // Openings saved by an OLDER build are one row per variation and include
  // rows the source could not name ("Unknown"). Regroup them here so an
  // existing report reads the same as a new one — same rules as
  // openingSummary() in the builder: family before the colon, drop unnamed,
  // drop anything played only once.
  const openings = (() => {
    const raw = p.openings || [];
    if (!raw.length) return raw;
    // Already grouped by the current builder — it stamps `variations`.
    if (raw.some(o => typeof o.variations === 'number')) return raw;
    const by = new Map();
    for (const o of raw) {
      const family = String(o.opening || '').split(':')[0].trim();
      if (!family || /^(unknown|unnamed|irregular|\?+)$/i.test(family)) continue;
      const key = `${family}|${o.side || ''}`;
      if (!by.has(key)) {
        by.set(key, { opening: family, ecoCode: o.ecoCode || '', side: o.side || '',
                      games: 0, wins: 0, draws: 0, losses: 0, variations: new Set() });
      }
      const g = by.get(key);
      // Old rows carry their own game count, so add rather than increment.
      g.games  += o.games || o.played || 0;
      g.wins   += o.wins || 0;
      g.draws  += o.draws || 0;
      g.losses += o.losses || 0;
      if (o.opening && o.opening !== family) g.variations.add(o.opening);
    }
    return [...by.values()]
      .filter(g => g.games >= 2)
      .map(g => ({ ...g, variations: g.variations.size,
                   score: Math.round(((g.wins + g.draws * 0.5) / g.games) * 100) }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 8);
  })();

  // Reports generated BEFORE the comparison section existed have no
  // `payload.comparison`. Rather than hide the section from every student who
  // already earned a report, rebuild this report's own column from figures the
  // payload has always carried. History stays empty (it genuinely is not known
  // for an old payload), so such a report renders as a baseline — which for a
  // first report is exactly right anyway.
  const comparison = p.comparison || (() => {
    const res = games.results || {};
    const pt = p.practiceTotals || {};
    const played = (res.win || 0) + (res.loss || 0) + (res.draw || 0);
    const current = {
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      gamesAnalysed: games.analysed ?? null,
      opening:    phases.opening?.accuracy ?? null,
      middlegame: phases.middlegame?.accuracy ?? null,
      endgame:    phases.endgame?.accuracy ?? null,
      blundersPerGame: played
        ? +(((phases.opening?.blunders || 0) + (phases.middlegame?.blunders || 0)
            + (phases.endgame?.blunders || 0)) / played).toFixed(2)
        : null,
      winRate: played ? Math.round(((res.win || 0) / played) * 100) : null,
      defensiveScore: p.defence?.defensiveScore ?? null,
      // NOT moments.total: that counts CATEGORISED moments, and in payloads
      // written before 'tactic' became categorisable almost nothing was, so it
      // was saved as 0 while the report showed dozens of mistakes. The practice
      // plan's own tally never depended on categories.
      momentsFound: p.moments?.practice?.drillable
        ?? (p.momentThemes || []).reduce((n, t) => n + (t.count || 0), 0)
        ?? p.moments?.total ?? null,
      puzzles:        pt.puzzles        ?? null,
      puzzleAccuracy: pt.puzzleAccuracy ?? null,
      bestStreak:     pt.bestStreak     ?? null,
      daysPractised:  pt.daysPractised  ?? null,
      // Games from bySource — the games actually collected and analysed. NOT
      // StreakDay.externalGames, which is a streak GATE: it stops counting once
      // a day has one external game, so it reported 9 for a student with 26
      // analysed games.
      arenaGames:     games.bySource?.chessnexus ?? null,
      externalGames:  (games.bySource?.lichess != null || games.bySource?.chesscom != null)
        ? (games.bySource.lichess || 0) + (games.bySource.chesscom || 0)
        : null,
      endgamesPlayed: pt.endgames       ?? null,
      studies:        pt.studies        ?? null,
    };
    return { history: [], current, columns: [current] };
  })();

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
        <SectionHead
          title="The three phases of your games"
          help={`All ${games.analysed || 0} games, Chess Nexus and your other accounts together. Accuracy is how close your moves were to the best move available, so 100% would mean playing like the engine.`}
        />
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
          <SectionHead
            title="How you defend"
            help={<>
            What happens after a game turns against you — the skill most players never measure.
          </>}
          />
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
          <SectionHead
            title="The endgames you reached"
            help="Which endgames came up, and how you did once you were in them."
          />
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

      {/* ── Openings you played ──────────────────────────────────────────
          openingSummary() has always been computed and saved in the payload;
          the page simply never rendered it. */}
      {openings.length > 0 && (
        <section className="sr-section">
          <SectionHead
            title="Openings you played"
            help={<>
            Grouped by opening, not by variation — three Sicilians are three
            Sicilians however they continued. Openings you played only once are left
            out: one game is not a pattern.
          </>}
          />
          <div className="sr-scroll">
            <table className="sr-table">
              <thead>
                <tr><th>Opening</th><th>Side</th><th>Games</th><th>W</th><th>D</th><th>L</th><th>Score</th></tr>
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
                          {o.variations > 1 ? `${o.variations} variations` : ''}
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
            title="The patterns you missed"
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
                    {t.count}<span className="sr-motif-unit"> missed</span>
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
            title="Weekly report"
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
                  <th>Measure</th>
                  {comparison.columns.map((c, i) => (
                    <th key={i} className={i === comparison.columns.length - 1 ? 'sr-now' : ''}>
                      {comparison.columns.length === 1
                        ? 'This report'
                        : i === comparison.columns.length - 1 ? 'This report' : `Report ${i + 1}`}
                      <span className="sr-wk">{fmtDate(c.periodStart)}</span>
                    </th>
                  ))}
                  {/* A ghost column on a first report: the shape of what comes
                      next, so the table reads as "one down, one to go" rather
                      than a list with a missing half. */}
                  {comparison.columns.length === 1 && (
                    <th className="sr-next">
                      Next report
                      <span className="sr-wk">after 5 more days</span>
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
                <CompareGroup label="Puzzles — Chess Nexus" cols={comparison.columns}
                  rows={[
                    { label: 'Puzzles solved', field: 'puzzles' },
                    { label: 'Puzzle accuracy', field: 'puzzleAccuracy', suffix: '%' },
                    { label: 'Best streak', sub: 'correct in a row', field: 'bestStreak' },
                    { label: 'Days practised', field: 'daysPractised' },
                  ]} />

                <CompareGroup label="Play — accuracy by phase" cols={comparison.columns}
                  rows={[
                    { label: 'Games analysed', field: 'gamesAnalysed' },
                    { label: 'Opening', field: 'opening', suffix: '%' },
                    { label: 'Middlegame', field: 'middlegame', suffix: '%' },
                    { label: 'Endgame', field: 'endgame', suffix: '%' },
                    { label: 'Blunders per game', field: 'blundersPerGame', lowerIsBetter: true },
                    { label: 'Defensive score', field: 'defensiveScore', suffix: '%' },
                    { label: 'Mistakes found', field: 'momentsFound', lowerIsBetter: true },
                  ]} />

                <CompareGroup label="Games played" cols={comparison.columns}
                  rows={[
                    { label: 'Chess Nexus arena', field: 'arenaGames' },
                    { label: 'Lichess + Chess.com', field: 'externalGames' },
                    { label: 'Win rate', sub: 'all games', field: 'winRate', suffix: '%' },
                  ]} />

                <CompareGroup label="Study" cols={comparison.columns}
                  rows={[
                    { label: 'Endgames played out', field: 'endgamesPlayed' },
                    { label: 'Chapters completed', field: 'studies' },
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
            title="Where the work came from"
            help={<>
            Your games from every account go into the phase and endgame analysis above.
            Puzzle motifs are the one thing only Chess Nexus can give you.
          </>}
          />
          <div className="sr-sources">
            {[
              { key: 'chessnexus', name: 'Chess Nexus',
                lines: ['Every motif named and scored', 'Your moves kept, right and wrong', 'Failed positions ready to redo'],
                limit: null },
              { key: 'lichess', name: 'Lichess',
                lines: ['Openings played, by result', 'Win / draw / loss'],
                limit: 'Puzzles solved on Lichess stay on Lichess — we cannot see the motifs.' },
              { key: 'chesscom', name: 'Chess.com',
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
                ? `${pt.puzzles} puzzle${pt.puzzles === 1 ? '' : 's'}`
                : `${n} game${n === 1 ? '' : 's'}`;
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
                    <p className="sr-src-limit">Could not be reached this period, so these games are missing.</p>
                  ) : (
                    <>
                      <ul>
                        {src.lines.map(l => <li key={l}>{l}</li>)}
                        {/* n, not pt.arenaGames: this is the count of games
                            actually collected for the report, so it agrees with
                            the headline and with the comparison table. */}
                        {n > 0 && <li>{n} arena game{n === 1 ? '' : 's'}</li>}
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
          <SectionHead
            title="Where your mistakes happen"
            help={<>
            {p.moments.total} positions from your own games. A mistake can belong to more
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
            title="Your practice for the next few days"
            help={<>
            The positions that cost you the most, worst first. Five a day — enough to
            actually finish.
          </>}
          />
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
          <SectionHead
            title="Study plan — practice from your mistakes"
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

      <Link to="/dashboard" className="sr-back">← Back to dashboard</Link>
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
          aria-label={open ? `Hide explanation of ${title}` : `What does ${title} mean?`}
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
