// lib/streakReportView.js
//
// Read-side repairs for a saved streak-report payload, shared by the STUDENT's
// report page and the COACH's view of the same report.
//
// Why this exists: a report payload is written once, at generation time, and
// then never changes. So every fix made to the report after a student earned
// theirs would otherwise only reach them when they earn the NEXT one — and the
// coach, reading the same stored payload through a different page, would see a
// different report from their student unless the identical repairs were applied
// in both places.
//
// They were not. The coach page rendered `payload.openings` raw, so coaches saw
// "Unknown" rows, one row per variation, and one-game openings long after the
// student's page had stopped showing them. Two copies of this logic would drift
// again, so there is one copy here and both pages call it.
//
// Everything here mirrors a rule already enforced in
// backend/services/streakReportBuilder.js for NEW reports. Nothing invents data:
// each repair either regroups what is present or reads a field the payload has
// always carried.

/**
 * Openings grouped by FAMILY, unnamed and one-off rows dropped.
 *
 * Older payloads store one row per variation ("Sicilian Defense: Löwenthal
 * Variation") plus rows the source could not classify ("Unknown"). Mirrors
 * openingSummary() in the builder: family is everything before the first colon,
 * which is the convention both Lichess and Chess.com follow in their tags.
 */
export function viewOpenings(payload) {
  const raw = payload?.openings || [];
  if (!raw.length) return raw;
  // Already grouped by the current builder — it stamps `variations`.
  if (raw.some(o => typeof o.variations === 'number')) return raw;

  const by = new Map();
  for (const o of raw) {
    const family = String(o.opening || '').split(':')[0].trim();
    if (!family || /^(unknown|unnamed|irregular|\?+)$/i.test(family)) continue;
    const key = `${family}|${o.side || ''}`;
    if (!by.has(key)) {
      by.set(key, {
        opening: family, ecoCode: o.ecoCode || '', side: o.side || '',
        games: 0, wins: 0, draws: 0, losses: 0, variations: new Set(),
      });
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
    .filter(g => g.games >= 2)            // one game is not a pattern
    .map(g => ({
      ...g,
      variations: g.variations.size,
      score: Math.round(((g.wins + g.draws * 0.5) / g.games) * 100),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 8);
}

/**
 * How many mistakes this report actually found.
 *
 * NOT moments.total: that counts CATEGORISED moments, and before 'tactic' (the
 * schema default on UserGamePuzzle.theme) became categorisable almost nothing
 * was, so it was saved as 0 on reports whose phase cards showed dozens of
 * blunders. The practice plan's tally never depended on categories.
 */
export function viewMomentsFound(payload) {
  const p = payload || {};
  if (p.moments?.practice?.drillable != null) return p.moments.practice.drillable;
  const themed = (p.momentThemes || []).reduce((n, t) => n + (t.count || 0), 0);
  if (themed > 0) return themed;
  return p.moments?.total ?? null;
}

/**
 * The comparison columns, rebuilt from the payload when it predates the field.
 *
 * History stays empty for an old payload — it genuinely is not knowable from one
 * stored report — so such a report renders as a single baseline column.
 */
export function viewComparison(report) {
  const p = report?.payload || {};
  if (p.comparison) return p.comparison;

  const phases = p.phases || {};
  const games = p.games || {};
  const res = games.results || {};
  const pt = p.practiceTotals || {};
  const played = (res.win || 0) + (res.loss || 0) + (res.draw || 0);

  const current = {
    periodStart: report?.periodStart,
    periodEnd: report?.periodEnd,
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
    momentsFound: viewMomentsFound(p),
    puzzles:        pt.puzzles        ?? null,
    puzzleAccuracy: pt.puzzleAccuracy ?? null,
    bestStreak:     pt.bestStreak     ?? null,
    daysPractised:  pt.daysPractised  ?? null,
    // Games from bySource — the games actually collected and analysed. NOT
    // StreakDay.externalGames, which is a streak GATE: it stops counting once a
    // day has one external game, so it reported 9 for a student with 26.
    arenaGames:     games.bySource?.chessnexus ?? null,
    externalGames:  (games.bySource?.lichess != null || games.bySource?.chesscom != null)
      ? (games.bySource.lichess || 0) + (games.bySource.chesscom || 0)
      : null,
    endgamesPlayed: pt.endgames ?? null,
    studies:        pt.studies  ?? null,
  };
  return { history: [], current, columns: [current] };
}
