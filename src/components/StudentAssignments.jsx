// components/StudentAssignments.jsx
// Self-contained student "Assignments" view — the list of coach assignments a
// student can open/do. Extracted from MyCoachPortal so BOTH the My Coach page and
// the admin-student Student Portal (UserAttendancePage) render the exact same UI
// from one source (no drift). Fetches /api/coach/my-assignments; launches each
// assignment type; shows the inline blunder player for PGN "find the blunders".
//
// Props:
//   onLoaded(assignments)  optional — receive the (filtered) list (e.g. for Overview stats)
//   only                   optional — 'admin' (Student Portal: only admin-coach assignments)
//                          | 'private' (My Coach: exclude admin-coach assignments)
//                          | undefined (all). Keeps admin classwork out of My Coach.
// Uses the mcp-* classes from MyCoachPortal.css (imported here).

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BlunderAssignmentPlayer from '../pages/BlunderAssignmentPlayer';
import FenAssignmentPlayer from '../pages/FenAssignmentPlayer';
import '../pages/MyCoachPortal.css';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fmtDate = (s) => new Date(s).toLocaleDateString('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric',
});

export default function StudentAssignments({ onLoaded, only }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [themes, setThemes] = useState([]);
  const [blunderTask, setBlunderTask] = useState(null);
  const [fenTask, setFenTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter by coach type when requested (keeps admin classwork out of My Coach).
  const applyFilter = useCallback((list) => {
    if (only === 'admin') return list.filter(a => a.coachIsAdmin);
    if (only === 'private') return list.filter(a => !a.coachIsAdmin);
    return list;
  }, [only]);

  const reload = useCallback(async () => {
    try {
      const res = await api.get('/api/coach/my-assignments');
      const list = applyFilter(res.data?.assignments || []);
      setAssignments(list);
      onLoaded?.(list);
    } catch { /* ignore */ }
  }, [onLoaded, applyFilter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [a, th] = await Promise.all([
          api.get('/api/coach/my-assignments'),
          api.get('/api/public/healthymix/themes').catch(() => ({ data: { themes: [] } })),
        ]);
        if (!alive) return;
        const list = applyFilter(a.data?.assignments || []);
        setAssignments(list);
        setThemes(th.data?.themes || []);
        onLoaded?.(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open an assignment. Custom (PGN blunders) opens an inline player; the others
  // navigate into the matching training flow, tagged with the assignment id.
  const startAssignment = (a) => {
    if (a.assignmentType === 'custom') { setBlunderTask(a); return; }
    if (a.assignmentType === 'fen_solution') { setFenTask(a); return; }
    if (a.assignmentType === 'study_chapter') {
      if (!a.studyId || !a.chapterId) return;
      const t = a.testTimeLimit || 300;
      navigate(`/test/play/${a.studyId}/${a.chapterId}?time=${t}&assignment=${a._id}`);
      return;
    }
    if (a.assignmentType === 'puzzle_rush') {
      const topic = a.rushTopic || 'mixed';
      const mins = a.rushMinutes || 5;
      navigate(`/timed-race?topic=${encodeURIComponent(topic)}&time=${mins}&assignment=${a._id}`);
      return;
    }
    if (a.assignmentType === 'arena_tournament') {
      const code = (a.arenaTournamentCode || '').toUpperCase();
      if (a.arenaTournamentId) {
        try { sessionStorage.setItem(`assignmentForTournament:${a.arenaTournamentId}`, a._id); } catch { /* ignore */ }
      }
      navigate(`/arenatournament/join?code=${encodeURIComponent(code)}&assignment=${a._id}`);
      return;
    }
    if (a.assignmentType !== 'puzzle_topic') return;

    // The coach now picks the mode explicitly, so the student lands on the right
    // puzzles instead of us guessing from typed text.
    const q = `assignment=${a._id}`;
    if (a.puzzleMode === 'mix') {
      navigate(`/training/healthy-mix?${q}`);
      return;
    }
    // Theme AND a fixed difficulty band — the backend applies both filters.
    if (a.puzzleMode === 'theme_rating' && a.puzzleTheme && a.puzzleMinRating && a.puzzleMaxRating) {
      navigate(`/training/healthy-mix?theme=${encodeURIComponent(a.puzzleTheme)}&min=${a.puzzleMinRating}&max=${a.puzzleMaxRating}&${q}`);
      return;
    }
    if (a.puzzleMode === 'theme' && a.puzzleTheme) {
      navigate(`/training/healthy-mix?theme=${encodeURIComponent(a.puzzleTheme)}&${q}`);
      return;
    }
    if (a.puzzleMode === 'rating' && a.puzzleMinRating && a.puzzleMaxRating) {
      navigate(`/training/healthy-mix?min=${a.puzzleMinRating}&max=${a.puzzleMaxRating}&${q}`);
      return;
    }

    // 'legacy' — assignments created before puzzleMode existed. Keep the old
    // fuzzy match on the typed topic so nothing a coach already set up breaks.
    const want = norm(a.topicName);
    const match = themes.find(t => norm(t.key) === want || norm(t.label) === want);
    if (match) navigate(`/training/healthy-mix?theme=${encodeURIComponent(match.key)}&${q}`);
    else navigate(`/training/themes?${q}`);
  };

  if (loading) return null;

  return (
    <>
      {blunderTask && (
        <BlunderAssignmentPlayer
          assignment={blunderTask}
          onClose={() => { setBlunderTask(null); reload(); }}
          onGraded={() => { reload(); }}
        />
      )}
      {fenTask && (
        <FenAssignmentPlayer
          assignment={fenTask}
          onClose={() => { setFenTask(null); reload(); }}
          onGraded={() => { reload(); }}
        />
      )}
      {assignments.length === 0 ? (
        <div className="mcp-empty" style={{ margin: '40px auto' }}>
          <div className="mcp-empty-icon">📋</div>
          <h2 className="mcp-empty-title">No assignments yet</h2>
          <p className="mcp-empty-desc">When your coach assigns you work, it will show up here.</p>
        </div>
      ) : (
        <div className="mcp-assign-list">
          {assignments.map(a => {
            const isPgn = a.assignmentType === 'custom' && a.pgnTask;
            const isTest = a.assignmentType === 'study_chapter';
            const isRush = a.assignmentType === 'puzzle_rush';
            const isArena = a.assignmentType === 'arena_tournament';
            const isFen = a.assignmentType === 'fen_solution' && a.fenTask;
            const fenPositions = isFen ? (a.fenTask.positions?.length || 0) : 0;
            const cur = isPgn ? (a.foundCount || 0) : isFen ? (a.fenSolved || 0) : (a.progress || 0);
            const tot = (isTest || isRush || isArena) ? 0 : (isPgn ? (a.pgnTask.findTarget || 0) : isFen ? fenPositions : (a.targetCount || 0));
            const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 0;
            const statusLabel = a.status === 'completed' ? 'Completed' : a.status === 'in_progress' ? 'In progress' : 'Not started';
            const statusClass = a.status === 'completed' ? 'mcp-present' : a.status === 'in_progress' ? 'mcp-catchup' : 'mcp-absent';
            return (
              <div key={a._id} className="mcp-assign-card">
                <div className="mcp-assign-head">
                  <div className="mcp-assign-title">{a.title}</div>
                  <span className={`mcp-badge ${statusClass}`}>{statusLabel}</span>
                </div>
                {a.description && <div className="mcp-assign-desc">{a.description}</div>}
                <div className="mcp-assign-meta">
                  <span>👨‍🏫 {a.coachName}</span>
                  {isPgn
                    ? <span>· 🔍 Find {a.pgnTask.findTarget || 0} blunder{(a.pgnTask.findTarget || 0) > 1 ? 's' : ''}</span>
                    : isTest
                      ? <span>· ⏱ Timed test{a.targetGrade > 0 ? ` · goal ${a.targetGrade}%` : ''}</span>
                      : isRush
                        ? <span>· ⚡ {a.rushTopicLabel || a.rushTopic || 'Mixed'} · {a.rushMinutes || 5} min{a.rushTargetSolved > 0 ? ` · goal ${a.rushTargetSolved}` : ''}</span>
                        : isArena
                          ? <span>· 🏆 Arena tournament{a.arenaTournamentCode ? ` · code ${a.arenaTournamentCode}` : ''}{a.targetGames > 0 ? ` · ${a.targetGames}+ games` : ''}{a.targetScore > 0 ? ` · ${a.targetScore}+ pts` : ''}{a.targetRank > 0 ? ` · top ${a.targetRank}` : ''}{a.targetWins > 0 ? ` · ${a.targetWins}+ wins` : ''}</span>
                          : isFen
                            ? <span>· ♟️ Play vs Stockfish · {fenPositions} position{fenPositions > 1 ? 's' : ''}</span>
                            : (a.topicName && <span>· {a.topicName}</span>)}
                  {a.dueDate && <span>· Due {fmtDate(a.dueDate)}</span>}
                </div>
                {tot > 0 && (
                  <div className="mcp-assign-progress">
                    <div className="mcp-assign-bar"><div style={{ width: `${pct}%` }} /></div>
                    <span className="mcp-assign-pct">{cur}/{tot}{isPgn ? ' found' : isFen ? ' solved' : ''}</span>
                  </div>
                )}
                {(a.solved > 0 || a.failed > 0) && (
                  <div className="mcp-assign-stats">
                    ✅ {a.solved} solved · ❌ {a.failed} failed · 🔥 {a.maxStreak} best streak
                  </div>
                )}
                {isArena && a.status === 'completed' && (a.arenaGamesPlayed > 0 || a.arenaScore > 0) && (
                  <div className="mcp-assign-stats">
                    🏆 {a.arenaScore} pts · {a.arenaWins}W-{a.arenaLosses}L-{a.arenaDraws}D · {a.arenaGamesPlayed} games{a.arenaRank > 0 ? ` · rank #${a.arenaRank}` : ''}
                  </div>
                )}
                {(a.assignmentType === 'puzzle_topic' || a.assignmentType === 'custom' || a.assignmentType === 'study_chapter' || a.assignmentType === 'puzzle_rush' || isArena || isFen) && a.status !== 'completed' && (
                  <button className="mcp-assign-btn" onClick={() => startAssignment(a)}>
                    {a.assignmentType === 'custom'
                      ? (a.status === 'in_progress' ? 'Continue finding →' : 'Find the blunders →')
                      : a.assignmentType === 'study_chapter'
                        ? (a.status === 'in_progress' ? 'Continue test →' : 'Take the test →')
                        : a.assignmentType === 'puzzle_rush'
                          ? (a.status === 'in_progress' ? 'Race again →' : 'Start race →')
                          : isArena
                            ? 'Join tournament →'
                            : isFen
                              ? (a.status === 'in_progress' ? 'Continue playing →' : 'Play vs Stockfish →')
                              : (a.status === 'in_progress' ? 'Continue assignment →' : 'Do assignment →')}
                  </button>
                )}
                {a.status === 'completed' && (
                  <div className="mcp-assign-done">✓ Completed{a.completedAt ? ` · ${fmtDate(a.completedAt)}` : ''}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
