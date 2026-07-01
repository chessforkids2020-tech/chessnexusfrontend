import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import GameReplay from '../../components/GameReplay';
// Reuse the SAME detailed report cards the student's "Analyze My Games" page
// renders, so the coach sees an identical deep report (no drift).
import {
  PhaseCard, PeerComparisonCard, EndgameStats, GameBreakdownTable, TrendCharts
} from '../GameAnalysis';
import '../GameAnalysis.css';
import './CoachDashboard.css';
import './CoachOnboarding.css';
import './CoachStudentDetail.css';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'; }
function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CoachStudentDetail() {
  const { studentLinkId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Game analysis (deep Stockfish report on the student's last 25 games) ──
  const [analysis, setAnalysis] = useState(null);      // result object when done
  const [analyzing, setAnalyzing] = useState(false);   // job running / polling
  const [analyzeErr, setAnalyzeErr] = useState('');
  const [analyzeProgress, setAnalyzeProgress] = useState(null); // { current, total, stage }
  const pollRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/coach/students/${studentLinkId}/progress`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load student.'))
      .finally(() => setLoading(false));
  }, [studentLinkId]);

  // Stop polling on unmount or when the student changes.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, [studentLinkId]);

  const pollStatus = (cacheId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/api/coach/students/${studentLinkId}/analyze/status/${cacheId}`);
        setAnalyzeProgress(r.data.progress || null);
        if (r.data.status === 'done') {
          clearInterval(pollRef.current);
          setAnalysis(r.data.result);
          setAnalyzing(false);
        } else if (r.data.status === 'error') {
          clearInterval(pollRef.current);
          setAnalyzeErr(r.data.error || 'Analysis failed.');
          setAnalyzing(false);
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setAnalyzeErr(e.response?.data?.message || 'Lost connection to the analysis job.');
        setAnalyzing(false);
      }
    }, 3000);
  };

  const startAnalysis = async (force = false) => {
    setAnalyzeErr('');
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzeProgress({ current: 0, total: 25, stage: 'Starting…' });
    try {
      const r = await api.post(`/api/coach/students/${studentLinkId}/analyze`, { force });
      if (r.data.status === 'done') {
        setAnalysis(r.data.result);
        setAnalyzing(false);
      } else {
        pollStatus(r.data.cacheId);
      }
    } catch (e) {
      setAnalyzeErr(e.response?.data?.message || 'Could not start analysis.');
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="coach-loading">Loading student progress…</div>;
  if (error) return <div className="coach-error">⚠️ {error}</div>;
  if (!data) return null;

  const { student, link, gameRatings, activity = [], raceResults = [], testResults = [], arenaGames = [], assignments = [], totals = {} } = data;
  const maxSeconds = Math.max(1, ...activity.map(a => a.totalSeconds || 0));

  return (
    <div className="coach-dash">
      <div className="csd-back">
        <button onClick={() => navigate(-1)} className="btn-ghost">← Back</button>
      </div>

      {/* ── Header ─────────────────── */}
      <div className="csd-header">
        <div className="csd-avatar">
          {(link?.studentName || student?.displayName || student?.username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="csd-meta">
          <h1>{link?.studentName || student?.displayName || student?.username || 'Unnamed student'}</h1>
          <p>
            {student?.username && <>@{student.username} · </>}
            {student?.country || 'Unknown country'}
            {link?.groupTag && <span className="tag" style={{ marginLeft: 8 }}>{link.groupTag}</span>}
          </p>
        </div>
        <div className="csd-rating">
          <span>Live rating</span>
          <strong>{fmt(student?.liveRating)}</strong>
        </div>
      </div>

      {/* ── Game ratings (Bullet / Blitz / Rapid / Classical) ─────── */}
      {gameRatings && (
        <div className="coach-stat-row">
          <div className="coach-stat-card">
            <div className="stat-label">♟ Bullet</div>
            <div className="stat-value">{fmt(gameRatings.bullet)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">⚡ Blitz</div>
            <div className="stat-value">{fmt(gameRatings.blitz)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">⏱ Rapid</div>
            <div className="stat-value">{fmt(gameRatings.rapid)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">♚ Classical</div>
            <div className="stat-value">{fmt(gameRatings.classical)}</div>
          </div>
        </div>
      )}

      {/* ── Summary stats ─────────── */}
      <div className="coach-stat-row">
        <div className="coach-stat-card">
          <div className="stat-label">Puzzles solved (30d)</div>
          <div className="stat-value">{fmt(totals.puzzlesSolved)}</div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Avg accuracy (30d)</div>
          <div className="stat-value">{totals.avgAccuracy != null ? Math.round(totals.avgAccuracy) + '%' : '—'}</div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Active days</div>
          <div className="stat-value">{totals.activeDays || 0}<span className="stat-cap">/ 30</span></div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Best race score</div>
          <div className="stat-value">{fmt(student?.highestArenaRaceScore)}</div>
        </div>
      </div>

      {/* ── Game analysis (deep Stockfish report) ───── */}
      <div className="coach-section">
        <div className="coach-section-head csd-analyze-head">
          <h2>🔎 Game analysis</h2>
          <div className="csd-analyze-actions">
            {analysis && !analyzing && (
              <button className="btn-ghost" onClick={() => startAnalysis(true)}>↻ Re-analyze</button>
            )}
            {!analysis && (
              <button className="btn-primary" onClick={() => startAnalysis(false)} disabled={analyzing}>
                {analyzing ? 'Analyzing…' : 'Analyze last 25 games'}
              </button>
            )}
          </div>
        </div>

        <p className="csd-analyze-hint">
          Runs a deep Stockfish review of {student?.displayName || student?.username || 'the student'}'s
          last 25 ChessNexus games — accuracy by phase, blunders, playstyle and recurring patterns.
          Results are cached for 24 hours.
        </p>

        {analyzeErr && <div className="coach-error" style={{ marginTop: 8 }}>⚠️ {analyzeErr}</div>}

        {analyzing && (
          <div className="csd-analyze-progress">
            <div className="csd-analyze-stage">{analyzeProgress?.stage || 'Working…'}</div>
            <div className="stat-bar">
              <div style={{ width: `${analyzeProgress && analyzeProgress.total ? Math.round((analyzeProgress.current / analyzeProgress.total) * 100) : 5}%` }} />
            </div>
            <div className="csd-analyze-count">
              {analyzeProgress?.current || 0} / {analyzeProgress?.total || 25} games
            </div>
          </div>
        )}

        {analysis && !analyzing && <AnalysisReport result={analysis} />}

        {!analysis && !analyzing && !analyzeErr && (
          <div className="coach-empty">No analysis yet. Click <strong>Analyze last 25 games</strong> above.</div>
        )}
      </div>

      {/* ── Daily activity chart ───── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>Daily activity (last 30 days)</h2></div>
        {activity.length === 0 ? (
          <div className="coach-empty">No activity recorded yet.</div>
        ) : (
          <div className="csd-chart">
            {activity.map((a, i) => {
              const h = Math.max(4, ((a.totalSeconds || 0) / maxSeconds) * 100);
              const mins = Math.round((a.totalSeconds || 0) / 60);
              return (
                <div className="csd-bar-wrap" key={i} title={`${fmtDate(a.date)}: ${mins} min`}>
                  <div className="csd-bar" style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Race results ──────────── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>🏁 Recent races (30 days)</h2></div>
        {raceResults.length === 0 ? (
          <div className="coach-empty">No race results in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Puzzles</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                  <th>Score</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {raceResults.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.finishedAt)}</td>
                    <td>{r.puzzlesSolved}/{r.totalPuzzles}</td>
                    <td className="cell-good">{r.correctCount}</td>
                    <td className="cell-bad">{r.wrongCount}</td>
                    <td>
                      <span className={`acc-pill ${r.accuracy >= 80 ? 'acc-high' : r.accuracy >= 50 ? 'acc-mid' : 'acc-low'}`}>
                        {r.accuracy}%
                      </span>
                    </td>
                    <td>{fmtTime(r.finishTime)}</td>
                    <td className="cell-score">{fmt(r.finalScore)}</td>
                    <td>#{r.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Arena tournament games ─── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>♟ Arena tournament games (30 days)</h2></div>
        {arenaGames.length === 0 ? (
          <div className="coach-empty">No arena games in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tournament</th>
                  <th>Color</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Time ctrl</th>
                </tr>
              </thead>
              <tbody>
                {arenaGames.map((g, i) => {
                  const sid = String(student?._id);
                  const isWhite = String(g.whitePlayerId) === sid;
                  const opponent = isWhite
                    ? (g.blackPlayerDisplayName || g.blackPlayerUsername)
                    : (g.whitePlayerDisplayName || g.whitePlayerUsername);
                  let resultLabel = '—';
                  let resultClass = '';
                  if (g.result === 'white_won') { resultLabel = isWhite ? 'Win' : 'Loss'; resultClass = isWhite ? 'cell-good' : 'cell-bad'; }
                  else if (g.result === 'black_won') { resultLabel = isWhite ? 'Loss' : 'Win'; resultClass = isWhite ? 'cell-bad' : 'cell-good'; }
                  else if (g.result === 'draw') { resultLabel = 'Draw'; }
                  const tc = g.timeControl ? `${g.timeControl.minutes}+${g.timeControl.increment ?? 0}` : '—';
                  return (
                    <tr key={i}>
                      <td>{fmtDate(g.finishedAt)}</td>
                      <td>{g.tournamentId?.name || '—'}</td>
                      <td>{isWhite ? '⬜ White' : '⬛ Black'}</td>
                      <td>{opponent}</td>
                      <td className={resultClass}>{resultLabel}</td>
                      <td>{tc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Study / Test results ───── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>📚 Recent study tests (30 days)</h2></div>
        {testResults.length === 0 ? (
          <div className="coach-empty">No study tests in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Study</th>
                  <th>Chapter</th>
                  <th>Solved</th>
                  <th>Accuracy</th>
                  <th>Points</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((r, i) => {
                  const acc = r.puzzlesAttempted > 0 ? Math.round((r.puzzlesSolved / r.puzzlesAttempted) * 100) : null;
                  return (
                    <tr key={i}>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>{r.studyId?.title || '—'}</td>
                      <td>{r.chapterId?.title || '—'}</td>
                      <td>{r.puzzlesSolved}/{r.totalPuzzles}</td>
                      <td>
                        {acc != null ? (
                          <span className={`acc-pill ${acc >= 80 ? 'acc-high' : acc >= 50 ? 'acc-mid' : 'acc-low'}`}>
                            {acc}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>{r.totalPoints}/{r.maxPoints}</td>
                      <td>{fmtTime(r.totalTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assignments ────────────── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>Assignments</h2>
          <Link to="/coach/assignments" className="btn-ghost">＋ New assignment</Link>
        </div>
        {assignments.length === 0 ? (
          <div className="coach-empty">No assignments yet for this student.</div>
        ) : (
          <div className="coach-assignment-list">
            {assignments.map(a => {
              const mine = a.completions?.find(c => String(c.studentId) === String(student?._id));
              return (
                <div key={a._id} className="coach-assignment-row">
                  <div>
                    <div className="assign-title">{a.title}</div>
                    <div className="assign-meta">
                      {a.assignmentType.replace('_', ' ')}
                      {a.targetCount ? ` · ${a.targetCount} puzzles` : ''}
                      {a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="assign-status">
                    <span className={`pill pill-${mine?.status || 'assigned'}`}>
                      {mine?.status || 'assigned'}
                    </span>
                    {mine?.progress != null && <span className="prog">{Math.round(mine.progress)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compact game-analysis report for the coach ───────────────────────────────
// Surfaces the key fields from the shared analysis result (same engine as the
// student's own "Analyze My Games"), summarised for a coach at-a-glance.
function accColor(a) {
  if (a == null) return '#9ca3af';
  return a >= 85 ? '#10b981' : a >= 70 ? '#06b6d4' : a >= 50 ? '#f59e0b' : '#ef4444';
}

function AnalysisReport({ result }) {
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  if (!result) return null;
  const totalBlunders = (result.opening?.blunders || 0) + (result.middlegame?.blunders || 0) + (result.endgame?.blunders || 0);

  // Guard against degenerate / tiny samples. With only 1–2 games (especially
  // short ones that ended quickly), the engine sees too few real decisions, so
  // "0 cp loss → Master 2000+ / 100%" is an artefact, not a true rating. We show
  // the numbers but flag them as low-confidence and suppress the ELO claim.
  const gamesN = result.gamesAnalyzed || 0;
  const movesAnalyzed =
    (result.opening?.moveCount || 0) + (result.middlegame?.moveCount || 0) + (result.endgame?.moveCount || 0);
  const lowSample = gamesN < 3 || movesAnalyzed < 20;
  const cp = result.capsScore?.avgCpLoss;
  // Trust the ELO band only with enough data AND a non-degenerate cp-loss reading.
  const eloBandTrustworthy = result.capsScore?.eloBand?.display && !lowSample && !(cp === 0 && movesAnalyzed < 60);

  return (
    <div className="csd-analysis">
      {lowSample && (
        <div className="csd-lowsample">
          ⚠️ Only {gamesN} game{gamesN === 1 ? '' : 's'} ({movesAnalyzed} of this player's moves) could be analyzed —
          not enough to judge skill reliably. Treat accuracy, cp-loss and the playstyle below as rough indicators,
          not a true rating. Ask the student to play a few more arena games, then re-analyze.
        </div>
      )}

      {/* Top-line summary */}
      <div className="csd-analysis-top">
        <div className="csd-an-card">
          <span className="csd-an-label">Games analyzed</span>
          <span className="csd-an-val">{gamesN}<span className="csd-an-cap"> / 25 max</span></span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Overall accuracy</span>
          <span className="csd-an-val" style={{ color: accColor(result.overallAccuracy) }}>
            {result.overallAccuracy != null ? `${result.overallAccuracy}%` : '—'}
          </span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Record (W-D-L)</span>
          <span className="csd-an-val">
            <span className="cell-good">{result.wins ?? 0}</span>-
            {result.draws ?? 0}-
            <span className="cell-bad">{result.losses ?? 0}</span>
          </span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Blunders</span>
          <span className="csd-an-val cell-bad">{totalBlunders}</span>
        </div>
        {result.capsScore?.avgCpLoss != null && (
          <div className="csd-an-card">
            <span className="csd-an-label">Avg cp lost / move</span>
            <span className="csd-an-val">{result.capsScore.avgCpLoss}</span>
          </div>
        )}
        {result.playstyle?.display && (
          <div className="csd-an-card">
            <span className="csd-an-label">Playstyle</span>
            <span className="csd-an-val csd-an-val-sm">{result.playstyle.display}</span>
          </div>
        )}
      </div>

      {eloBandTrustworthy && (
        <div className="csd-elo-band">
          Move quality is around <strong>{result.capsScore.eloBand.display}</strong> level
          {result.capsScore.eloBand.label ? ` (${result.capsScore.eloBand.label})` : ''}.
        </div>
      )}

      {/* ── Detailed report — same cards as the student's "Analyze My Games" ── */}

      {/* Game phase accuracy (doughnuts) */}
      <h3 className="ga-section-title">📊 Game Phase Accuracy</h3>
      <div className="ga-phase-cards">
        <PhaseCard phase="Opening"    data={result.opening}    icon="♟" />
        <PhaseCard phase="Middlegame" data={result.middlegame} icon="⚔" />
        <PhaseCard phase="Endgame"    data={result.endgame}    icon="👑" />
      </div>

      {/* Recurring patterns / coach takeaways */}
      {Array.isArray(result.patterns) && result.patterns.length > 0 && (
        <div className="csd-patterns">
          <div className="csd-patterns-title">🔬 Recurring patterns</div>
          <ul>
            {result.patterns.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Peer comparison */}
      {result.peerComparison && <PeerComparisonCard peerComparison={result.peerComparison} />}

      {/* Endgame type performance */}
      {result.endgameStats && result.endgameStats.length > 0 && (
        <div className="ga-endgame-section">
          <h3 className="ga-section-title">👑 Endgame Type Performance</h3>
          <EndgameStats endgameStats={result.endgameStats} />
        </div>
      )}

      {/* Performance trends across games */}
      {result.trends && result.trends.accuracyPerGame && result.trends.accuracyPerGame.length > 0 && (
        <>
          <h3 className="ga-section-title">📉 Performance Trends</h3>
          <TrendCharts trends={result.trends} />
        </>
      )}

      {/* Per-game breakdown + move-by-move replay */}
      {result.games && result.games.length > 0 && (
        <>
          <h3 className="ga-section-title">📋 Per-Game Breakdown</h3>
          <p className="ga-section-desc">Click a game to replay it move-by-move with full analysis.</p>
          <GameBreakdownTable games={result.games} />
          <div className="ga-game-btns">
            {result.games.map((g, i) => (
              <button
                key={i}
                className={`ga-game-btn${selectedGameIndex === i ? ' active' : ''}`}
                onClick={() => setSelectedGameIndex(i)}
              >
                Game {g.gameNumber}
              </button>
            ))}
          </div>
          {selectedGameIndex !== null && result.games[selectedGameIndex] && (
            <GameReplay
              game={result.games[selectedGameIndex]}
              totalGames={result.games.length}
              onClose={() => setSelectedGameIndex(null)}
              onNext={() => setSelectedGameIndex(prev => prev < result.games.length - 1 ? prev + 1 : prev)}
              onPrev={() => setSelectedGameIndex(prev => prev > 0 ? prev - 1 : prev)}
            />
          )}
        </>
      )}
    </div>
  );
}

