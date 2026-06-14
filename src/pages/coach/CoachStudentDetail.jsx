import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
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

  useEffect(() => {
    setLoading(true);
    api.get(`/api/coach/students/${studentLinkId}/progress`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load student.'))
      .finally(() => setLoading(false));
  }, [studentLinkId]);

  if (loading) return <div className="coach-loading">Loading student progress…</div>;
  if (error) return <div className="coach-error">⚠️ {error}</div>;
  if (!data) return null;

  const { student, link, activity = [], raceResults = [], testResults = [], arenaGames = [], assignments = [], totals = {} } = data;
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

