import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CoachOnboarding.css';
import './CoachStudentDetail.css';
import './CoachAssignments.css';

// Time options mirror the Study Test feature (UserTestTimeSelection).
const TEST_TIME_OPTIONS = [
  { value: 60,   label: '1 minute' },
  { value: 120,  label: '2 minutes' },
  { value: 180,  label: '3 minutes' },
  { value: 300,  label: '5 minutes' },
  { value: 600,  label: '10 minutes' },
  { value: 900,  label: '15 minutes' },
  { value: 1200, label: '20 minutes' },
  { value: 1800, label: '30 minutes' },
];

const ASSIGNMENT_TYPES = [
  { id: 'puzzle_topic', label: '🧩 Puzzle topic', hint: 'Assign puzzles from a specific topic' },
  { id: 'study_chapter',label: '📖 Study test', hint: 'Timed test on a chapter — time & grade based' },
  { id: 'puzzle_rush',  label: '⚡ Timed race', hint: 'Beat the clock — solve as many as possible in time' },
  { id: 'custom',       label: '🔍 Find the blunders', hint: 'Post PGNs with blunder answers — students find them' }
];

// Puzzle Rush durations (minutes), mirroring the Timed Race options.
const RUSH_TIME_OPTIONS = [
  { value: 1,  label: '1 minute' },
  { value: 3,  label: '3 minutes' },
  { value: 5,  label: '5 minutes' },
  { value: 10, label: '10 minutes' },
];

export default function CoachAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Study picker state
  const [studies, setStudies] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  // Puzzle Rush topic list (racer topics)
  const [rushTopics, setRushTopics] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [expanded, setExpanded] = useState({});   // assignmentId -> bool (show per-student results)
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignmentType: 'puzzle_topic',
    topicName: '',
    studyId: '',
    chapterId: '',
    targetCount: 10,
    // Study Test (study_chapter type): time + grade oriented
    testTimeLimit: 300,
    targetGrade: 0,
    // Puzzle Rush (puzzle_rush type): topic + duration
    rushTopic: 'mixed',
    rushMinutes: 5,
    rushTargetSolved: 0,
    studentIds: [],
    dueDate: '',
    // PGN "find the blunders" (custom type)
    pgnFindTarget: 2,
    pgnGames: [{ pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, s, st, rt] = await Promise.all([
        api.get('/api/coach/assignments'),
        api.get('/api/coach/students'),
        api.get('/api/testpuzzle/studies'),
        api.get('/api/public/racer/topics').catch(() => ({ data: [] }))
      ]);
      setAssignments(a.data?.assignments || []);
      setStudents(s.data?.students || []);
      setStudies(Array.isArray(st.data) ? st.data : []);
      setRushTopics(Array.isArray(rt.data) ? rt.data : []);
      setError('');
    } catch (err) {
      if (err.response?.status === 402) {
        navigate('/coach/subscription?expired=1');
        return;
      }
      setError(err.response?.data?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  // When study changes, load its chapters and clear the chapter selection
  const handleStudyChange = async (studyId) => {
    update('studyId', studyId);
    update('chapterId', '');
    setChapters([]);
    if (!studyId) return;
    setLoadingChapters(true);
    try {
      const r = await api.get(`/api/testpuzzle/studies/${studyId}/chapters`);
      setChapters(Array.isArray(r.data) ? r.data : []);
    } catch {
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleStudent = (id) => {
    setForm(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter(x => x !== id)
        : [...prev.studentIds, id]
    }));
  };
  const selectAllStudents = () => {
    setForm(prev => ({ ...prev, studentIds: students.map(s => s.studentId?._id).filter(Boolean) }));
  };
  const clearStudents = () => setForm(prev => ({ ...prev, studentIds: [] }));

  // ── PGN "find the blunders" builder helpers ──
  const setGames = (games) => setForm(prev => ({ ...prev, pgnGames: games }));
  const addGame = () => setGames([...form.pgnGames, { pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]);
  const removeGame = (gi) => setGames(form.pgnGames.filter((_, i) => i !== gi));
  const updateGamePgn = (gi, pgn) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, pgn } : g));
  const addBlunder = (gi) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: [...g.blunders, { move: '', betterMove: '', explanation: '' }] } : g));
  const removeBlunder = (gi, bi) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: g.blunders.filter((_, j) => j !== bi) } : g));
  const updateBlunder = (gi, bi, field, val) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: g.blunders.map((b, j) => j === bi ? { ...b, [field]: val } : b) } : g));

  const create = async (e) => {
    e.preventDefault();
    setCreateErr('');
    if (!form.title.trim()) return setCreateErr('Please enter a title.');
    if (form.studentIds.length === 0) return setCreateErr('Pick at least one student.');

    // Build the PGN task payload for the "Find the blunders" (custom) type.
    let pgnTask;
    if (form.assignmentType === 'custom') {
      const games = (form.pgnGames || [])
        .map(g => ({
          pgn: g.pgn.trim(),
          blunders: (g.blunders || []).filter(b => b.move.trim()).map(b => ({
            move: b.move.trim(), betterMove: b.betterMove.trim(), explanation: b.explanation.trim()
          }))
        }))
        .filter(g => g.pgn && g.blunders.length > 0);
      const totalBlunders = games.reduce((n, g) => n + g.blunders.length, 0);
      if (games.length === 0 || totalBlunders === 0) return setCreateErr('Add at least one PGN with at least one blunder move.');
      const findTarget = Number(form.pgnFindTarget) || 1;
      if (findTarget > totalBlunders) return setCreateErr(`Find target (${findTarget}) can't exceed total blunders (${totalBlunders}).`);
      pgnTask = { findTarget, games };
    }

    if (form.assignmentType === 'study_chapter' && (!form.studyId || !form.chapterId)) {
      return setCreateErr('Pick a study and a chapter for the test.');
    }

    // Resolve the rush topic's display label so the coach UI/student card can
    // show a friendly name without re-fetching topics.
    const rushTopicDoc = rushTopics.find(t => t.id === form.rushTopic);
    const rushTopicLabel = form.assignmentType === 'puzzle_rush'
      ? (rushTopicDoc?.title || rushTopicDoc?.label || form.rushTopic)
      : '';

    setCreating(true);
    try {
      await api.post('/api/coach/assignments', {
        ...form,
        targetCount: Number(form.targetCount) || 10,
        rushTopicLabel,
        pgnTask
      });
      setShowCreate(false);
      setForm({
        title: '', description: '', assignmentType: 'puzzle_topic',
        topicName: '', studyId: '', chapterId: '',
        targetCount: 10, testTimeLimit: 300, targetGrade: 0,
        rushTopic: 'mixed', rushMinutes: 5, rushTargetSolved: 0,
        studentIds: [], dueDate: '',
        pgnFindTarget: 2, pgnGames: [{ pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]
      });
      setChapters([]);
      await loadAll();
    } catch (err) {
      setCreateErr(err.response?.data?.message || 'Could not create assignment.');
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const statusLabel = (s) =>
    s === 'completed' ? 'Completed' : s === 'in_progress' ? 'In progress' : 'Not started';

  const fmtSecs = (s) => {
    const n = Number(s) || 0;
    const m = Math.floor(n / 60);
    const sec = n % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const removeAssignment = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/api/coach/assignments/${id}`);
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete.');
    }
  };

  if (loading) return <div className="coach-loading">Loading assignments…</div>;
  if (error) return <div className="coach-error">⚠️ {error}</div>;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>📝 Assignments</h1>
          <p className="coach-dash-sub">Give your students structured work and track completion.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)} disabled={students.length === 0}>
          ＋ New assignment
        </button>
      </div>

      {students.length === 0 ? (
        <div className="coach-empty">
          You don't have any students yet. <a href="/coach/dashboard" style={{ color: '#06b6d4' }}>Add a student</a> first.
        </div>
      ) : assignments.length === 0 ? (
        <div className="coach-empty">
          No assignments yet. Click <strong>New assignment</strong> above.
        </div>
      ) : (
        <div className="ca-list">
          {assignments.map(a => {
            const completions = a.completions || [];
            const completed = completions.filter(c => c.status === 'completed').length;
            const total = a.studentIds?.length || 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isBlunder = a.assignmentType === 'custom';
            const isStudyTest = a.assignmentType === 'study_chapter';
            const isRush = a.assignmentType === 'puzzle_rush';
            // Only students who have actually started/submitted have results worth showing.
            const withResults = completions.filter(c => c.status !== 'pending');
            const isOpen = !!expanded[a._id];
            return (
              <div key={a._id} className="ca-card">
                <div className="ca-card-head">
                  <div>
                    <div className="ca-title">{a.title}</div>
                    <div className="ca-meta">
                      <span className="ca-type-pill">{isStudyTest ? 'study test' : isRush ? 'timed race' : a.assignmentType.replace('_', ' ')}</span>
                      {a.topicName && <span>· {a.topicName}</span>}
                      {a.assignmentType === 'puzzle_topic' && a.targetCount > 0 && <span>· {a.targetCount} puzzles</span>}
                      {isBlunder && a.pgnTask?.findTarget && <span>· find {a.pgnTask.findTarget}</span>}
                      {isStudyTest && <span>· ⏱ {fmtSecs(a.testTimeLimit || 300)}</span>}
                      {isStudyTest && a.targetGrade > 0 && <span>· goal {a.targetGrade}%</span>}
                      {isRush && <span>· {a.rushTopicLabel || a.rushTopic || 'Mixed'}</span>}
                      {isRush && <span>· ⚡ {a.rushMinutes || 5} min</span>}
                      {isRush && a.rushTargetSolved > 0 && <span>· goal {a.rushTargetSolved} solved</span>}
                      {a.dueDate && <span>· due {new Date(a.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button className="btn-danger" onClick={() => removeAssignment(a._id)}>Delete</button>
                </div>
                {a.description && <p className="ca-desc">{a.description}</p>}
                <div className="ca-progress">
                  <div className="ca-progress-label">
                    <span>{completed} / {total} students completed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="stat-bar"><div style={{ width: `${pct}%` }} /></div>
                </div>

                <button className="ca-results-toggle" onClick={() => toggleExpand(a._id)}>
                  {isOpen ? '▾ Hide student results' : `▸ View student results (${withResults.length})`}
                </button>

                {isOpen && (
                  <div className="ca-results">
                    {withResults.length === 0 ? (
                      <div className="ca-results-empty">No student has started this assignment yet.</div>
                    ) : isBlunder ? (
                      // ── Find the blunders: show attempts + what each student submitted ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Found</th><th>Attempts</th><th>Their answers (last try)</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => {
                            const target = a.pgnTask?.findTarget || 1;
                            const history = c.submissionHistory || [];
                            const histKey = `${a._id}-${c.studentId}`;
                            const histOpen = !!expanded[histKey];
                            // "tries to finish correct" = the attempt index that first passed.
                            const passedIdx = history.findIndex(h => h.passed);
                            const triesToSolve = passedIdx >= 0 ? passedIdx + 1 : null;
                            return (
                              <React.Fragment key={c.studentId}>
                                <tr>
                                  <td>{c.studentName}</td>
                                  <td>{c.foundCount || 0} / {target}</td>
                                  <td>
                                    {c.attempts || history.length || (c.status !== 'pending' ? 1 : 0)}
                                    {triesToSolve != null
                                      ? <span className="ca-solved-note"> · done on #{triesToSolve}</span>
                                      : (c.status !== 'completed' && (c.attempts || history.length)
                                          ? <span className="ca-stopped-note"> · not yet</span>
                                          : null)}
                                    {history.length > 0 && (
                                      <button className="ca-hist-btn" onClick={() => toggleExpand(histKey)}>
                                        {histOpen ? 'hide' : 'tries'}
                                      </button>
                                    )}
                                  </td>
                                  <td>
                                    {(c.submittedMoves && c.submittedMoves.length)
                                      ? c.submittedMoves.map((m, i) => {
                                          const ok = (c.foundMoves || []).some(fm => fm.toLowerCase().replace(/[+#!?\s]/g,'') === m.toLowerCase().replace(/[+#!?\s]/g,''));
                                          return <span key={i} className={`ca-move-chip ${ok ? 'ok' : 'no'}`}>{m}</span>;
                                        })
                                      : (c.foundMoves && c.foundMoves.length)
                                        ? c.foundMoves.map((m, i) => <span key={i} className="ca-move-chip ok">{m}</span>)
                                        : <span className="ca-muted">—</span>}
                                  </td>
                                  <td><span className={`ca-status ca-status-${c.status}`}>{statusLabel(c.status)}</span></td>
                                </tr>
                                {histOpen && history.length > 0 && (
                                  <tr className="ca-hist-row">
                                    <td colSpan={5}>
                                      <ol className="ca-hist-list">
                                        {history.map((h, hi) => (
                                          <li key={hi} className={h.passed ? 'passed' : ''}>
                                            <span className="ca-hist-idx">Try {hi + 1}</span>
                                            <span className="ca-hist-moves">
                                              {(h.submittedMoves || []).length
                                                ? h.submittedMoves.map((m, mi) => <span key={mi} className="ca-move-chip">{m}</span>)
                                                : <span className="ca-muted">— (nothing submitted)</span>}
                                            </span>
                                            <span className="ca-hist-result">
                                              {h.foundCount}/{target} found {h.passed ? '✓' : ''}
                                            </span>
                                          </li>
                                        ))}
                                      </ol>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : isStudyTest ? (
                      // ── Study Test: grade % + points + time per student ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Grade</th><th>Points</th><th>Solved</th>
                          <th>Time</th><th>Runs</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => {
                            const goal = a.targetGrade || 0;
                            const grade = c.testGrade || 0;
                            const met = goal > 0 && grade >= goal;
                            return (
                              <tr key={c.studentId}>
                                <td>{c.studentName}</td>
                                <td>
                                  <span className={goal > 0 ? (met ? 'ca-cell-ok' : 'ca-cell-no') : ''}>{grade}%</span>
                                  {goal > 0 && <span className="ca-muted"> / {goal}% {met ? '✓' : ''}</span>}
                                </td>
                                <td>{c.testPoints || 0}{c.testMaxPoints ? ` / ${c.testMaxPoints}` : ''}</td>
                                <td>{c.testSolved || 0}{c.testAttempted ? ` / ${c.testAttempted}` : ''}</td>
                                <td>{fmtSecs(c.testTimeTaken)}</td>
                                <td>{c.testRuns || 1}</td>
                                <td><span className={`ca-status ca-status-${c.status}`}>{statusLabel(c.status)}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : isRush ? (
                      // ── Puzzle Rush: solved / streak / accuracy per student ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Solved</th><th>Wrong</th><th>Best streak</th>
                          <th>Accuracy</th><th>Runs</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => {
                            const goal = a.rushTargetSolved || 0;
                            const solved = c.rushSolved || 0;
                            const met = goal > 0 && solved >= goal;
                            return (
                              <tr key={c.studentId}>
                                <td>{c.studentName}</td>
                                <td>
                                  <span className={goal > 0 ? (met ? 'ca-cell-ok' : 'ca-cell-no') : 'ca-cell-ok'}>{solved}</span>
                                  {goal > 0 && <span className="ca-muted"> / {goal} {met ? '✓' : ''}</span>}
                                </td>
                                <td className="ca-cell-no">{c.rushWrong || 0}</td>
                                <td>🔥 {c.rushMaxStreak || 0}</td>
                                <td>{c.rushAccuracy || 0}%</td>
                                <td>{c.rushRuns || 1}</td>
                                <td><span className={`ca-status ca-status-${c.status}`}>{statusLabel(c.status)}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      // ── Puzzle / study: solved / failed / streak per student ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Progress</th><th>Solved</th><th>Failed</th>
                          <th>Best streak</th><th>Accuracy</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => (
                            <tr key={c.studentId}>
                              <td>{c.studentName}</td>
                              <td>{c.progress || 0} / {a.targetCount || 0}</td>
                              <td className="ca-cell-ok">{c.solved || 0}</td>
                              <td className="ca-cell-no">{c.failed || 0}</td>
                              <td>🔥 {c.maxStreak || 0}</td>
                              <td>{c.accuracy || 0}%</td>
                              <td><span className={`ca-status ca-status-${c.status}`}>{statusLabel(c.status)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="coach-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="coach-modal ca-modal" onClick={e => e.stopPropagation()}>
            <h2>Create assignment</h2>
            <form onSubmit={create}>
              <label className="field">
                <span>Title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  placeholder="e.g. Daily puzzles week 1"
                  maxLength={200}
                  required
                />
              </label>

              <div className="field">
                <span>Type *</span>
                <div className="ca-type-grid">
                  {ASSIGNMENT_TYPES.map(t => (
                    <label
                      key={t.id}
                      className={`ca-type-card ${form.assignmentType === t.id ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="atype"
                        checked={form.assignmentType === t.id}
                        onChange={() => update('assignmentType', t.id)}
                      />
                      <div className="ca-type-label">{t.label}</div>
                      <div className="ca-type-hint">{t.hint}</div>
                    </label>
                  ))}
                </div>
              </div>

              {form.assignmentType === 'puzzle_topic' && (
                <div className="field-row">
                  <label className="field">
                    <span>Topic name</span>
                    <input
                      type="text"
                      value={form.topicName}
                      onChange={e => update('topicName', e.target.value)}
                      placeholder="e.g. Mate in 2"
                    />
                  </label>
                  <label className="field" style={{ maxWidth: 140 }}>
                    <span>Target count</span>
                    <input
                      type="number"
                      min="1"
                      value={form.targetCount}
                      onChange={e => update('targetCount', e.target.value)}
                    />
                  </label>
                </div>
              )}

              {form.assignmentType === 'study_chapter' && (
                <div className="field-row">
                  <label className="field">
                    <span>Study</span>
                    <select
                      value={form.studyId}
                      onChange={e => handleStudyChange(e.target.value)}
                    >
                      <option value="">— Select a study —</option>
                      {studies.map(s => (
                        <option key={s._id} value={s._id}>{s.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Chapter</span>
                    <select
                      value={form.chapterId}
                      onChange={e => update('chapterId', e.target.value)}
                      disabled={!form.studyId || loadingChapters}
                    >
                      <option value="">{loadingChapters ? 'Loading…' : '— Select a chapter —'}</option>
                      {chapters.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.title}{c.puzzleCount != null ? ` (${c.puzzleCount} puzzles)` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {form.assignmentType === 'study_chapter' && (
                <div className="field-row">
                  <label className="field">
                    <span>Time limit</span>
                    <select
                      value={form.testTimeLimit}
                      onChange={e => update('testTimeLimit', Number(e.target.value))}
                    >
                      {TEST_TIME_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ maxWidth: 180 }}>
                    <span>Target grade % (optional)</span>
                    <input
                      type="number" min="0" max="100"
                      value={form.targetGrade}
                      onChange={e => update('targetGrade', e.target.value)}
                      placeholder="e.g. 70"
                    />
                  </label>
                </div>
              )}

              {/* Puzzle Rush (puzzle_rush) — racer topic + duration */}
              {form.assignmentType === 'puzzle_rush' && (
                <div className="field-row">
                  <label className="field">
                    <span>Topic</span>
                    <select
                      value={form.rushTopic}
                      onChange={e => update('rushTopic', e.target.value)}
                    >
                      {rushTopics.length === 0 && <option value="mixed">Mixed</option>}
                      {rushTopics.map(t => {
                        const name = t.title || t.label || t.id;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.icon ? `${t.icon} ` : ''}{name}{t.puzzles != null ? ` (${t.puzzles})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="field">
                    <span>Duration</span>
                    <select
                      value={form.rushMinutes}
                      onChange={e => update('rushMinutes', Number(e.target.value))}
                    >
                      {RUSH_TIME_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ maxWidth: 180 }}>
                    <span>Goal solved (optional)</span>
                    <input
                      type="number" min="0"
                      value={form.rushTargetSolved}
                      onChange={e => update('rushTargetSolved', e.target.value)}
                      placeholder="e.g. 25"
                    />
                  </label>
                </div>
              )}

              {/* Find the blunders (custom) — PGN games + blunder answers */}
              {form.assignmentType === 'custom' && (
                <div className="ca-pgn-builder">
                  <label className="field" style={{ maxWidth: 220 }}>
                    <span>Blunders students must find</span>
                    <input
                      type="number" min="1"
                      value={form.pgnFindTarget}
                      onChange={e => update('pgnFindTarget', e.target.value)}
                    />
                  </label>

                  {form.pgnGames.map((g, gi) => (
                    <div key={gi} className="ca-pgn-game">
                      <div className="ca-pgn-game-head">
                        <strong>Game {gi + 1}</strong>
                        {form.pgnGames.length > 1 && (
                          <button type="button" className="ca-link-danger" onClick={() => removeGame(gi)}>Remove game</button>
                        )}
                      </div>
                      <label className="field">
                        <span>PGN</span>
                        <textarea
                          rows={3}
                          value={g.pgn}
                          onChange={e => updateGamePgn(gi, e.target.value)}
                          placeholder="1. e4 e5 2. Nf3 Nc6 ..."
                        />
                      </label>
                      <div className="ca-blunder-label">Blunder answers (the moves students must spot)</div>
                      {g.blunders.map((b, bi) => (
                        <div key={bi} className="ca-blunder-row">
                          <input placeholder="Blunder move e.g. Qh5??" value={b.move} onChange={e => updateBlunder(gi, bi, 'move', e.target.value)} />
                          <input placeholder="Better move (opt.)" value={b.betterMove} onChange={e => updateBlunder(gi, bi, 'betterMove', e.target.value)} />
                          <input placeholder="Why (opt.)" value={b.explanation} onChange={e => updateBlunder(gi, bi, 'explanation', e.target.value)} />
                          {g.blunders.length > 1 && (
                            <button type="button" className="ca-link-danger" onClick={() => removeBlunder(gi, bi)}>✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="ca-link-add" onClick={() => addBlunder(gi)}>+ Add blunder</button>
                    </div>
                  ))}
                  <button type="button" className="ca-link-add" onClick={addGame}>+ Add another game</button>
                </div>
              )}

              <label className="field">
                <span>Description / instructions</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  placeholder="What should the student do?"
                  maxLength={2000}
                />
              </label>

              <label className="field">
                <span>Due date (optional)</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => update('dueDate', e.target.value)}
                />
              </label>

              <div className="field">
                <span>Assign to *</span>
                <div className="ca-student-controls">
                  <button type="button" className="btn-ghost" onClick={selectAllStudents}>Select all</button>
                  <button type="button" className="btn-ghost" onClick={clearStudents}>Clear</button>
                  <span className="ca-selected-count">{form.studentIds.length} selected</span>
                </div>
                <div className="ca-student-list">
                  {students.map(s => {
                    const sid = s.studentId?._id;
                    if (!sid) return null;
                    const active = form.studentIds.includes(sid);
                    return (
                      <label key={sid} className={`ca-student-pill ${active ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleStudent(sid)}
                        />
                        {s.studentName || s.studentId?.displayName || s.studentId?.username || 'Student'}
                      </label>
                    );
                  })}
                </div>
              </div>

              {createErr && <div className="form-error">{createErr}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
