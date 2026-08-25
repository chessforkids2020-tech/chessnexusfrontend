import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import CoachChatFab from '../../components/coach/CoachChatFab';
import InlineBoardEditor from '../../components/PositionEditor/InlineBoardEditor';
import AssignmentReview from '../../components/coach/AssignmentReview';
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
  { id: 'puzzle_rush',  label: '⚡ Timed race', hint: 'Beat the clock — solve as many as possible in time' },
  { id: 'arena_tournament', label: '🏆 Play a tournament', hint: 'Play a real-game Arena Tournament — wins, losses & score' },
  { id: 'custom',       label: '🔍 Find the blunders', hint: 'Post PGNs with blunder answers — students find them' },
  { id: 'fen_solution', label: '♟️ Play vs Stockfish', hint: 'Post positions (FEN) — student plays them out; Stockfish scores' }
];

// Puzzle Rush durations (minutes), mirroring the Timed Race options.
const RUSH_TIME_OPTIONS = [
  { value: 1,  label: '1 minute' },
  { value: 3,  label: '3 minutes' },
  { value: 5,  label: '5 minutes' },
  { value: 10, label: '10 minutes' },
];

// Difficulty bands a coach can pick for a puzzle assignment. Chosen so a coach
// never has to reason about Elo numbers: a beginner gets 400-800 regardless of
// what the student's own rating happens to be.
const RATING_BANDS = [
  { min: 400,  max: 800,  label: '400 – 800 · Beginner' },
  { min: 801,  max: 1200, label: '801 – 1200 · Improving' },
  { min: 1201, max: 1600, label: '1201 – 1600 · Intermediate' },
  { min: 1601, max: 2000, label: '1601 – 2000 · Advanced' },
  { min: 2001, max: 2400, label: '2001 – 2400 · Strong' },
  { min: 2401, max: 3000, label: '2401+ · Expert' },
];

export default function CoachAssignments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  // Which assignment is open in the board review (null = none).
  const [reviewing, setReviewing] = useState(null);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]); // named batches, for one-click assign
  const [templates, setTemplates] = useState([]); // coach's saved reusable templates
  const [templateMax, setTemplateMax] = useState(10);
  const [subscribed, setSubscribed] = useState(true); // subscribed coaches skip free-tier caps
  const FREE_MAX_BLUNDER_GAMES = 3;
  // Premium endgame picker (fen_solution assignments; subscribed coaches only).
  const [egPremium, setEgPremium] = useState(null); // { fam: [picks] }
  const [egFam, setEgFam] = useState('');
  const [library, setLibrary] = useState([]);     // admin blunder library (read-only)
  const [themes, setThemes] = useState([]);      // real theme catalogue for the picker
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplMsg, setTplMsg] = useState('');
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
    puzzleMode: 'mix',        // 'mix' | 'theme' | 'rating'
    puzzleTheme: '',
    puzzleMinRating: 1000,
    puzzleMaxRating: 1400,
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
    // Arena Tournament (arena_tournament type): code/link + optional goals
    arenaTournamentCode: '',
    targetGames: 0,
    targetScore: 0,
    targetRank: 0,
    targetWins: 0,
    targetMaxLosses: 0,
    studentIds: [],
    dueDate: '',
    // PGN "find the blunders" (custom type)
    pgnFindTarget: 2,
    pgnGames: [{ pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }],
    // "Play vs Stockfish" (fen_solution type)
    fenTolerance: 80,
    fenPositions: [{ fen: '', solution: '', userMoveCount: 1, tag: '' }]
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, s, st, rt, g, tpl, lib, th, status] = await Promise.all([
        api.get('/api/coach/assignments'),
        api.get('/api/coach/students'),
        api.get('/api/testpuzzle/studies'),
        api.get('/api/public/racer/topics').catch(() => ({ data: [] })),
        api.get('/api/coach/groups').catch(() => ({ data: { groups: [] } })),
        api.get('/api/coach/assignment-templates').catch(() => ({ data: { templates: [] } })),
        api.get('/api/coach/blunder-library').catch(() => ({ data: { library: [] } })),
        // Same catalogue the students see, so the picker can never offer a
        // theme that does not exist.
        api.get('/api/public/healthymix/themes').catch(() => ({ data: { themes: [] } })),
        api.get('/api/coach/status').catch(() => ({ data: {} }))
      ]);
      setAssignments(a.data?.assignments || []);
      setStudents(s.data?.students || []);
      setStudies(Array.isArray(st.data) ? st.data : []);
      setRushTopics(Array.isArray(rt.data) ? rt.data : []);
      setGroups(g.data?.groups || []);
      setTemplates(tpl.data?.templates || []);
      setTemplateMax(tpl.data?.max || 10);
      setLibrary(lib.data?.library || []);
      setThemes(th.data?.themes || []);
      const reason = status.data?.access?.reason;
      setSubscribed(!!status.data?.isElite || reason === 'paid' || reason === 'privileged' || reason === 'elite_free');
      setError('');
    } catch (err) {
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
  // Add a whole batch to the current selection (union). Intersect with the
  // visible roster so a since-removed group member never shows as "selected".
  const applyBatch = (groupId) => {
    if (!groupId) return;
    const g = groups.find(x => String(x._id) === String(groupId));
    if (!g) return;
    const roster = new Set(students.map(s => String(s.studentId?._id)).filter(Boolean));
    const ids = (g.studentIds || []).map(String).filter(id => roster.has(id));
    setForm(prev => ({ ...prev, studentIds: [...new Set([...prev.studentIds, ...ids])] }));
  };

  // Build the pgnTask/fenTask from the CURRENT form (same as the create flow),
  // for saving as a template. Returns {pgnTask} or {fenTask} or {error}.
  const buildTaskFromForm = () => {
    if (form.assignmentType === 'custom') {
      const games = (form.pgnGames || []).map(g => ({
        pgn: g.pgn.trim(),
        blunders: (g.blunders || []).filter(b => b.move.trim()).map(b => ({
          move: b.move.trim(), betterMove: b.betterMove.trim(), explanation: b.explanation.trim()
        }))
      })).filter(g => g.pgn && g.blunders.length > 0);
      if (games.length === 0) return { error: 'Add at least one PGN with a blunder answer first.' };
      const derived = games.reduce((n, g) => n + (g.blunders || []).length, 0) || 1;
      return { pgnTask: { findTarget: derived, games } };
    }
    if (form.assignmentType === 'fen_solution') {
      const positions = (form.fenPositions || []).map(p => ({
        fen: (p.fen || '').trim(), solution: (p.solution || '').trim(),
        userMoveCount: Math.max(1, Number(p.userMoveCount) || 1), tag: (p.tag || '').trim()
      })).filter(p => p.fen);
      if (positions.length === 0) return { error: 'Add at least one position first.' };
      return { fenTask: { engineToleranceCp: Number(form.fenTolerance) || 80, engineDepth: 12, positions } };
    }
    return { error: 'This assignment type cannot be saved.' };
  };

  const saveAsTemplate = async () => {
    setTplMsg('');
    if (!form.title.trim()) { setCreateErr('Give the assignment a title before saving it as a template.'); return; }
    const built = buildTaskFromForm();
    if (built.error) { setCreateErr(built.error); return; }
    setSavingTpl(true);
    try {
      await api.post('/api/coach/assignment-templates', {
        assignmentType: form.assignmentType,
        title: form.title, description: form.description,
        ...built
      });
      setTplMsg('Saved to your templates.');
      const r = await api.get('/api/coach/assignment-templates');
      setTemplates(r.data?.templates || []);
    } catch (err) {
      setCreateErr(err.response?.data?.message || 'Could not save template.');
    } finally {
      setSavingTpl(false);
    }
  };

  const deleteTemplate = async (id) => {
    try {
      await api.delete(`/api/coach/assignment-templates/${id}`);
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete template.');
    }
  };

  // Load a saved template into the form (coach then picks batch + due date).
  const applyTemplate = (tpl) => {
    if (!tpl) return;
    if (tpl.assignmentType === 'custom') {
      setForm(prev => ({
        ...prev,
        assignmentType: 'custom',
        title: tpl.title || prev.title,
        description: tpl.description || '',
        pgnFindTarget: tpl.pgnTask?.findTarget || 1,
        pgnGames: (tpl.pgnTask?.games || []).map(g => ({
          pgn: g.pgn || '',
          blunders: (g.blunders || []).map(b => ({ move: b.move || '', betterMove: b.betterMove || '', explanation: b.explanation || '' }))
        }))
      }));
    } else if (tpl.assignmentType === 'fen_solution') {
      setForm(prev => ({
        ...prev,
        assignmentType: 'fen_solution',
        title: tpl.title || prev.title,
        description: tpl.description || '',
        fenTolerance: tpl.fenTask?.engineToleranceCp || 80,
        fenPositions: (tpl.fenTask?.positions || []).map(p => ({
          fen: p.fen || '', solution: p.solution || '', userMoveCount: p.userMoveCount || 1, tag: p.tag || ''
        }))
      }));
    }
    setCreateErr('');
  };

  // Load an admin blunder-library SET (multiple games) into the form as a
  // custom blunder task — one pgnGames entry per game in the set.
  const applyLibraryItem = (item) => {
    if (!item) return;
    if (item.locked) { setCreateErr('That set is Premium — subscribe to use built-in premium content.'); return; }
    const games = (item.games || []).map(g => ({
      pgn: g.pgn || '',
      blunders: (g.blunders || []).map(b => ({ move: b.move || '', betterMove: b.betterMove || '', explanation: b.explanation || '' }))
    }));
    setForm(prev => ({
      ...prev,
      assignmentType: 'custom',
      title: item.title || prev.title,
      pgnFindTarget: item.blunderCount || 1,
      pgnGames: games.length > 0 ? games : prev.pgnGames
    }));
    setCreateErr('');
  };

  // Load a saved single position (fen/endgame) into the form as a fen_solution task.
  const applySavedFen = (item) => {
    if (!item?.fen) return;
    setForm(prev => ({
      ...prev,
      assignmentType: 'fen_solution',
      title: item.title || prev.title,
      fenTolerance: 80,
      fenPositions: [{ fen: item.fen, solution: item.solution || '', userMoveCount: item.userMoveCount || 1, tag: item.tag || '' }],
    }));
    setCreateErr('');
  };

  // Handle a "Reuse" hand-off from the Library page (router state). Prefill the
  // form, open the create modal, then clear the state so a refresh doesn't repeat.
  useEffect(() => {
    const reuse = location.state?.reuse;
    if (!reuse) return;
    if (reuse.kind === 'template') applyTemplate(reuse.template);
    else if (reuse.kind === 'library') applyLibraryItem(reuse.item);
    else if (reuse.kind === 'savedFen') applySavedFen(reuse.item);
    setShowCreate(true);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── PGN "find the blunders" builder helpers ──
  const setGames = (games) => setForm(prev => ({ ...prev, pgnGames: games }));
  const addGame = () => setGames([...form.pgnGames, { pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]);
  const removeGame = (gi) => setGames(form.pgnGames.filter((_, i) => i !== gi));
  const updateGamePgn = (gi, pgn) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, pgn } : g));
  const addBlunder = (gi) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: [...g.blunders, { move: '', betterMove: '', explanation: '' }] } : g));
  const removeBlunder = (gi, bi) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: g.blunders.filter((_, j) => j !== bi) } : g));
  const updateBlunder = (gi, bi, field, val) => setGames(form.pgnGames.map((g, i) => i === gi ? { ...g, blunders: g.blunders.map((b, j) => j === bi ? { ...b, [field]: val } : b) } : g));

  // ── "Play vs Stockfish" (fen_solution) builder helpers ──
  // Index of the position whose visual board editor is open (null = none).
  const [fenEditorOpen, setFenEditorOpen] = useState(null);
  const setFenPositions = (positions) => setForm(prev => ({ ...prev, fenPositions: positions }));
  // Load admin premium endgame picks (subscribed coaches only), grouped by family.
  const loadPremiumEndgames = async () => {
    if (egPremium) return egPremium;
    try {
      const r = await api.get('/api/endgame-trainer/positions');
      const fams = r.data?.families || {};
      setEgPremium(fams);
      return fams;
    } catch { setEgPremium({}); return {}; }
  };
  // Append a premium endgame position (by FEN) as a new fen_solution position.
  const addPremiumFen = (pick) => {
    if (!pick?.fen) return;
    const label = pick.title || (pick.white || pick.black ? `${pick.white || 'White'} vs ${pick.black || 'Black'}` : 'Premium endgame');
    const positions = form.fenPositions.filter(p => String(p.fen || '').trim());
    setFenPositions([...positions, { fen: pick.fen, solution: '', userMoveCount: 1, tag: label.slice(0, 80) }]);
  };
  const addFenPosition = () => setFenPositions([...form.fenPositions, { fen: '', solution: '', userMoveCount: 1, tag: '' }]);
  const removeFenPosition = (i) => setFenPositions(form.fenPositions.filter((_, j) => j !== i));
  const updateFenPosition = (i, field, val) => setFenPositions(form.fenPositions.map((p, j) => j === i ? { ...p, [field]: val } : p));

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
      // Derived, never typed: every blunder in every game must be found.
      const findTarget = totalBlunders || 1;
      pgnTask = { findTarget, games };
    }

    // Build the FEN task payload for the "Play vs Stockfish" (fen_solution) type.
    let fenTask;
    if (form.assignmentType === 'fen_solution') {
      const positions = (form.fenPositions || [])
        .map(p => ({
          fen: (p.fen || '').trim(),
          solution: (p.solution || '').trim(),
          userMoveCount: Math.max(1, Number(p.userMoveCount) || 1),
          tag: (p.tag || '').trim()
        }))
        .filter(p => p.fen);
      if (positions.length === 0) return setCreateErr('Add at least one position (FEN).');
      // Basic FEN shape check: 8 ranks separated by "/" and a side-to-move field.
      const bad = positions.find(p => !/^\s*([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+\s+[wb]\s/.test(p.fen + ' '));
      if (bad) return setCreateErr('One of the FENs looks invalid. Paste a full FEN (e.g. "r1bqkbnr/... w KQkq - 0 1").');
      fenTask = { engineToleranceCp: Number(form.fenTolerance) || 80, engineDepth: 12, positions };
    }

    if (form.assignmentType === 'study_chapter' && (!form.studyId || !form.chapterId)) {
      return setCreateErr('Pick a study and a chapter for the test.');
    }

    if (form.assignmentType === 'arena_tournament' && !form.arenaTournamentCode.trim()) {
      return setCreateErr('Paste a tournament code or join link.');
    }

    // Resolve the rush topic's display label so the coach UI/student card can
    // show a friendly name without re-fetching topics.
    const rushTopicDoc = rushTopics.find(t => t.id === form.rushTopic);
    const rushTopicLabel = form.assignmentType === 'puzzle_rush'
      ? (rushTopicDoc?.title || rushTopicDoc?.label || form.rushTopic)
      : '';

    setCreating(true);
    try {
      // topicName is still stored so every existing display ("· Mate in 2" on
      // the card, the student's assignment list) keeps reading naturally — it is
      // now DERIVED from the picked mode instead of typed.
      const topicName = form.assignmentType !== 'puzzle_topic' ? form.topicName
        : form.puzzleMode === 'theme'
          ? (themes.find(t => t.key === form.puzzleTheme)?.label || form.puzzleTheme)
          : form.puzzleMode === 'theme_rating'
            // Name both parts, so the student sees what they were set and the
            // coach can tell two similar assignments apart in the list.
            ? `${themes.find(t => t.key === form.puzzleTheme)?.label || form.puzzleTheme} · ${form.puzzleMinRating}–${form.puzzleMaxRating}`
            : form.puzzleMode === 'rating'
              ? `Rating ${form.puzzleMinRating}–${form.puzzleMaxRating}`
              : 'Healthy Mix';

      await api.post('/api/coach/assignments', {
        ...form,
        topicName,
        targetCount: Number(form.targetCount) || 10,
        rushTopicLabel,
        pgnTask,
        fenTask
      });
      setShowCreate(false);
      setForm({
        title: '', description: '', assignmentType: 'puzzle_topic',
        topicName: '', studyId: '', chapterId: '',
        puzzleMode: 'mix', puzzleTheme: '', puzzleMinRating: 1000, puzzleMaxRating: 1400,
        targetCount: 10, testTimeLimit: 300, targetGrade: 0,
        rushTopic: 'mixed', rushMinutes: 5, rushTargetSolved: 0,
        arenaTournamentCode: '', targetGames: 0, targetScore: 0, targetRank: 0, targetWins: 0, targetMaxLosses: 0,
        studentIds: [], dueDate: '',
        pgnFindTarget: 2, pgnGames: [{ pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }],
        fenTolerance: 80, fenPositions: [{ fen: '', solution: '', userMoveCount: 1, tag: '' }]
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

  // ── Edit who an assignment is for ───────────────────────────────────────────
  // Coaches miss a student when tagging, or tag one who shouldn't get the work.
  // Deleting and recreating was the only fix before, which threw away everyone's
  // progress. Only the recipient list is editable — the task itself is frozen.
  const [editingIds, setEditingIds] = useState(null);   // assignment _id being edited
  const [editSel, setEditSel] = useState([]);           // studentIds being chosen
  const [editBusy, setEditBusy] = useState(false);

  const openEditStudents = (a) => {
    setEditingIds(a._id);
    setEditSel((a.studentIds || []).map(String));
  };
  const toggleEditStudent = (id) =>
    setEditSel(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const saveEditStudents = async (id) => {
    if (!editSel.length) { alert('Select at least one student.'); return; }
    setEditBusy(true);
    try {
      const r = await api.put(`/api/coach/assignments/${id}/students`, { studentIds: editSel });
      // Reflect the new recipient list without a full refetch.
      setAssignments(prev => prev.map(a => (a._id === id ? r.data.assignment : a)));
      setEditingIds(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update students.');
    } finally {
      setEditBusy(false);
    }
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
            const isArena = a.assignmentType === 'arena_tournament';
            const isFen = a.assignmentType === 'fen_solution';
            // Only students who have actually started/submitted have results worth showing.
            const withResults = completions.filter(c => c.status !== 'pending');
            const isOpen = !!expanded[a._id];
            return (
              <div key={a._id} className="ca-card">
                <div className="ca-card-head">
                  <div>
                    <div className="ca-title">{a.title}</div>
                    <div className="ca-meta">
                      <span className="ca-type-pill">{isStudyTest ? 'study test' : isRush ? 'timed race' : isArena ? 'tournament' : isFen ? 'play vs stockfish' : a.assignmentType.replace('_', ' ')}</span>
                      {a.topicName && <span>· {a.topicName}</span>}
                      {a.assignmentType === 'puzzle_topic' && a.targetCount > 0 && <span>· {a.targetCount} puzzles</span>}
                      {isBlunder && a.pgnTask?.findTarget && <span>· find {a.pgnTask.findTarget}</span>}
                      {isFen && a.fenTask?.positions?.length > 0 && <span>· ♟️ {a.fenTask.positions.length} position{a.fenTask.positions.length > 1 ? 's' : ''}</span>}
                      {isStudyTest && <span>· ⏱ {fmtSecs(a.testTimeLimit || 300)}</span>}
                      {isStudyTest && a.targetGrade > 0 && <span>· goal {a.targetGrade}%</span>}
                      {isRush && <span>· {a.rushTopicLabel || a.rushTopic || 'Mixed'}</span>}
                      {isRush && <span>· ⚡ {a.rushMinutes || 5} min</span>}
                      {isRush && a.rushTargetSolved > 0 && <span>· goal {a.rushTargetSolved} solved</span>}
                      {isArena && a.arenaTournamentCode && <span>· 🏆 {a.arenaTournamentCode}</span>}
                      {isArena && a.targetGames > 0 && <span>· {a.targetGames}+ games</span>}
                      {isArena && a.targetScore > 0 && <span>· {a.targetScore}+ pts</span>}
                      {isArena && a.targetRank > 0 && <span>· top {a.targetRank}</span>}
                      {isArena && a.targetWins > 0 && <span>· {a.targetWins}+ wins</span>}
                      {isArena && a.targetMaxLosses > 0 && <span>· ≤{a.targetMaxLosses} losses</span>}
                      {a.dueDate && <span>· due {new Date(a.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => (editingIds === a._id ? setEditingIds(null) : openEditStudents(a))}
                      title="Add or remove students for this assignment"
                    >
                      👥 Students ({(a.studentIds || []).length})
                    </button>
                    <button className="btn-danger" onClick={() => removeAssignment(a._id)}>Delete</button>
                  </div>
                </div>

                {editingIds === a._id && (
                  <div className="ca-edit-students">
                    <div className="ca-edit-students-head">
                      Who gets this assignment?
                      <span className="ca-edit-hint">
                        Removing a student hides it from them — their progress is kept if you add them back.
                      </span>
                    </div>
                    <div className="ca-edit-students-list">
                      {students.map((s) => {
                        const sid = String(s.studentId?._id || '');
                        if (!sid) return null;
                        const on = editSel.includes(sid);
                        const name = s.studentId?.displayName || s.studentId?.username || s.studentName || 'Student';
                        return (
                          <label key={sid} className={`ca-edit-student ${on ? 'on' : ''}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleEditStudent(sid)} />
                            <span>{name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="ca-edit-students-foot">
                      <span className="ca-edit-count">{editSel.length} selected</span>
                      <button className="btn-primary" disabled={editBusy} onClick={() => saveEditStudents(a._id)}>
                        {editBusy ? 'Saving…' : 'Save students'}
                      </button>
                      <button className="btn-secondary" onClick={() => setEditingIds(null)}>Cancel</button>
                    </div>
                  </div>
                )}
                {a.description && <p className="ca-desc">{a.description}</p>}
                <div className="ca-progress">
                  <div className="ca-progress-label">
                    <span>{completed} / {total} students completed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="stat-bar"><div style={{ width: `${pct}%` }} /></div>
                </div>

                {/* Roster: who this assignment was given to, with each
                    student's status — visible even before anyone starts. */}
                {completions.length > 0 && (
                  <div className="ca-assigned">
                    <span className="ca-assigned-label">Assigned to:</span>
                    {completions.map(c => (
                      <span key={c.studentId} className={`ca-assigned-pill ca-status-${c.status}`}>
                        {c.studentName} · {statusLabel(c.status)}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="ca-results-toggle" onClick={() => toggleExpand(a._id)}>
                    {isOpen ? '▾ Hide student results' : `▸ View student results (${withResults.length})`}
                  </button>
                  {/* Board review — for every type where a position means something:
                      Play vs Stockfish (which class homework uses), find-the-blunders,
                      and puzzle assignments. The table shows WHETHER a student
                      finished; this shows WHICH position and WHAT they played. */}
                  {(a.assignmentType === 'fen_solution' || isBlunder || a.assignmentType === 'puzzle_topic') && (
                    <button className="ca-results-toggle" onClick={() => setReviewing(a)}>
                      ♟️ Show assignment
                    </button>
                  )}
                </div>

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
                    ) : isArena ? (
                      // ── Arena Tournament: score / W-L-D / games / rank per student ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Score</th><th>W-L-D</th><th>Games</th>
                          <th>Rank</th><th>🔥</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => {
                            // A goal is "met" only when the coach set it (>0) and the result clears it.
                            const scoreMet  = a.targetScore > 0 && (c.arenaScore || 0) >= a.targetScore;
                            const gamesMet  = a.targetGames > 0 && (c.arenaGamesPlayed || 0) >= a.targetGames;
                            const rankMet   = a.targetRank > 0 && c.arenaRank > 0 && c.arenaRank <= a.targetRank;
                            const winsMet   = a.targetWins > 0 && (c.arenaWins || 0) >= a.targetWins;
                            const lossOk    = a.targetMaxLosses > 0 && (c.arenaLosses || 0) <= a.targetMaxLosses;
                            return (
                              <tr key={c.studentId}>
                                <td>{c.studentName}</td>
                                <td>
                                  <span className={a.targetScore > 0 ? (scoreMet ? 'ca-cell-ok' : 'ca-cell-no') : ''}>{c.arenaScore || 0}</span>
                                  {a.targetScore > 0 && <span className="ca-muted"> / {a.targetScore} {scoreMet ? '✓' : ''}</span>}
                                </td>
                                <td>
                                  <span className={winsMet ? 'ca-cell-ok' : ''}>{c.arenaWins || 0}</span>
                                  -<span className={lossOk || a.targetMaxLosses === 0 ? '' : 'ca-cell-no'}>{c.arenaLosses || 0}</span>
                                  -{c.arenaDraws || 0}
                                  {(a.targetWins > 0 || a.targetMaxLosses > 0) && (
                                    <span className="ca-muted">
                                      {a.targetWins > 0 ? ` (${a.targetWins}+ W${winsMet ? '✓' : ''})` : ''}
                                      {a.targetMaxLosses > 0 ? ` (≤${a.targetMaxLosses} L${lossOk ? '✓' : ''})` : ''}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={a.targetGames > 0 ? (gamesMet ? 'ca-cell-ok' : 'ca-cell-no') : ''}>{c.arenaGamesPlayed || 0}</span>
                                  {a.targetGames > 0 && <span className="ca-muted"> / {a.targetGames} {gamesMet ? '✓' : ''}</span>}
                                </td>
                                <td>
                                  <span className={a.targetRank > 0 ? (rankMet ? 'ca-cell-ok' : 'ca-cell-no') : ''}>{c.arenaRank > 0 ? `#${c.arenaRank}` : '—'}</span>
                                  {a.targetRank > 0 && <span className="ca-muted"> / top {a.targetRank} {rankMet ? '✓' : ''}</span>}
                                </td>
                                <td>{c.arenaMaxStreak ? `${c.arenaMaxStreak}🔥` : '—'}</td>
                                <td><span className={`ca-status ca-status-${c.status}`}>{statusLabel(c.status)}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : isFen ? (
                      // ── Play vs Stockfish: positions solved / accuracy per student ──
                      <table className="ca-results-table">
                        <thead><tr>
                          <th>Student</th><th>Solved</th><th>Accuracy</th><th>Runs</th><th>Per position</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                          {withResults.map(c => {
                            const posTotal = c.fenTotal || a.fenTask?.positions?.length || 0;
                            return (
                              <tr key={c.studentId}>
                                <td>{c.studentName}</td>
                                <td className="ca-cell-ok">{c.fenSolved || 0} / {posTotal}</td>
                                <td>{c.fenAccuracy || 0}%</td>
                                <td>{c.fenRuns || 1}</td>
                                <td>
                                  {(c.fenResults && c.fenResults.length)
                                    ? c.fenResults.map((r, i) => (
                                        <span key={i} className={`ca-move-chip ${r.passed ? 'ok' : 'no'}`} title={r.passed ? 'Solved' : (r.engineBestMove ? `Best: ${r.engineBestMove}` : 'Missed')}>
                                          {i + 1}{r.passed ? '✓' : '✗'}
                                        </span>
                                      ))
                                    : <span className="ca-muted">—</span>}
                                </td>
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
                <>
                  {/* Pick HOW the puzzles are chosen. This replaced a free-text
                      "Topic name" box: the coach had to type a theme exactly, and
                      the student side fuzzy-matched it — a typo left the student
                      on the theme picker with no idea what to choose. */}
                  <div className="field-row">
                    <label className="field">
                      <span>Which puzzles</span>
                      <select
                        value={form.puzzleMode}
                        onChange={e => update('puzzleMode', e.target.value)}
                      >
                        <option value="mix">Healthy Mix — a bit of everything</option>
                        <option value="theme">A specific theme</option>
                        <option value="rating">A rating range</option>
                        <option value="theme_rating">A theme at a set difficulty</option>
                      </select>
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

                  {(form.puzzleMode === 'theme' || form.puzzleMode === 'theme_rating') && (
                    <label className="field">
                      <span>Theme</span>
                      <select
                        value={form.puzzleTheme}
                        onChange={e => update('puzzleTheme', e.target.value)}
                      >
                        <option value="">Choose a theme…</option>
                        {themes.map(t => (
                          <option key={t.key} value={t.key}>
                            {t.icon ? `${t.icon} ` : ''}{t.label}
                            {typeof t.count === 'number' ? ` (${t.count})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.puzzleMode === 'theme_rating' && (
                    <label className="field">
                      <span>Difficulty</span>
                      <select
                        value={`${form.puzzleMinRating}-${form.puzzleMaxRating}`}
                        onChange={e => {
                          const [mn, mx] = e.target.value.split('-');
                          update('puzzleMinRating', mn);
                          update('puzzleMaxRating', mx);
                        }}
                      >
                        {RATING_BANDS.map(b => (
                          <option key={b.min} value={`${b.min}-${b.max}`}>{b.label}</option>
                        ))}
                      </select>
                      <small style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        Puzzles come from this range, not from the student's own rating —
                        so a beginner gets easy puzzles on the theme you are teaching.
                      </small>
                    </label>
                  )}

                  {form.puzzleMode === 'rating' && (
                    <div className="field-row">
                      <label className="field" style={{ maxWidth: 160 }}>
                        <span>From rating</span>
                        <input
                          type="number" min="400" max="3000" step="50"
                          value={form.puzzleMinRating}
                          onChange={e => update('puzzleMinRating', e.target.value)}
                        />
                      </label>
                      <label className="field" style={{ maxWidth: 160 }}>
                        <span>To rating</span>
                        <input
                          type="number" min="400" max="3000" step="50"
                          value={form.puzzleMaxRating}
                          onChange={e => update('puzzleMaxRating', e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </>
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

              {/* Arena Tournament (arena_tournament) — link a tournament + optional goals */}
              {form.assignmentType === 'arena_tournament' && (
                <div className="ca-arena-builder">
                  <label className="field">
                    <span>Tournament code or join link</span>
                    <input
                      type="text"
                      value={form.arenaTournamentCode}
                      onChange={e => update('arenaTournamentCode', e.target.value)}
                      placeholder="e.g. AB12CD34  —  or paste a join link"
                    />
                  </label>
                  <div style={{ fontSize: 13, color: '#9ca3af', margin: '-4px 0 10px' }}>
                    Paste the code or full link of an existing tournament, or{' '}
                    <button
                      type="button"
                      className="ca-link"
                      /* ?coach=1 — this is the COACH side, so the tournament is
                         private to their students and must never appear in the
                         public list on /arenatournament. Without the flag the
                         backend creates an ordinary public tournament, which is
                         how coach events were leaking into the open list. */
                      onClick={() => window.open('/arenatournament/create?coach=1', '_blank')}
                      style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                    >
                      create a new tournament
                    </button>{' '}
                    and copy its code back here.
                  </div>

                  <div className="ca-blunder-label">Goals (optional — leave 0 to skip; finishing always completes the assignment)</div>
                  <div className="field-row">
                    <label className="field" style={{ maxWidth: 150 }}>
                      <span>Min games</span>
                      <input type="number" min="0" value={form.targetGames} onChange={e => update('targetGames', e.target.value)} placeholder="0" />
                    </label>
                    <label className="field" style={{ maxWidth: 150 }}>
                      <span>Min score</span>
                      <input type="number" min="0" value={form.targetScore} onChange={e => update('targetScore', e.target.value)} placeholder="0" />
                    </label>
                    <label className="field" style={{ maxWidth: 150 }}>
                      <span>Finish top-N</span>
                      <input type="number" min="0" value={form.targetRank} onChange={e => update('targetRank', e.target.value)} placeholder="0" />
                    </label>
                  </div>
                  <div className="field-row">
                    <label className="field" style={{ maxWidth: 150 }}>
                      <span>Min wins</span>
                      <input type="number" min="0" value={form.targetWins} onChange={e => update('targetWins', e.target.value)} placeholder="0" />
                    </label>
                    <label className="field" style={{ maxWidth: 150 }}>
                      <span>Max losses</span>
                      <input type="number" min="0" value={form.targetMaxLosses} onChange={e => update('targetMaxLosses', e.target.value)} placeholder="0" />
                    </label>
                  </div>
                </div>
              )}

              {/* ── Reuse bar: load a saved template or the admin blunder library,
                     and save the current task as a template (custom/fen only) ── */}
              {(form.assignmentType === 'custom' || form.assignmentType === 'fen_solution') && (
                <div className="ca-reuse-bar">
                  <div className="ca-reuse-row">
                    <label className="field" style={{ flex: 1, minWidth: 200 }}>
                      <span>Start from a saved template or the built-in library</span>
                      <select
                        value=""
                        onChange={e => {
                          const [kind, id] = e.target.value.split(':');
                          if (kind === 'tpl') applyTemplate(templates.find(t => t._id === id));
                          else if (kind === 'lib') applyLibraryItem(library.find(l => l._id === id));
                          e.target.value = '';
                        }}
                      >
                        <option value="">＋ Load a template or library game…</option>
                        {templates.length > 0 && (
                          <optgroup label="My templates">
                            {templates.map(t => (
                              <option key={t._id} value={`tpl:${t._id}`}>
                                {t.assignmentType === 'custom' ? '🔎' : '♟'} {t.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {library.length > 0 && (
                          <optgroup label="Blunder library (built-in)">
                            {library.map(l => (
                              <option key={l._id} value={`lib:${l._id}`} disabled={l.locked}>
                                {l.locked ? '🔒' : '🔎'} {l.title}{l.premium ? ' 💎' : ''} · {l.gameCount} game{l.gameCount === 1 ? '' : 's'}, {l.blunderCount} blunder{l.blunderCount === 1 ? '' : 's'}{l.locked ? ' — Subscribe to use' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={saveAsTemplate}
                      disabled={savingTpl || templates.length >= templateMax}
                      title={templates.length >= templateMax ? `Template limit reached (${templateMax})` : 'Save this task to reuse later'}
                    >
                      {savingTpl ? 'Saving…' : `💾 Save as template (${templates.length}/${templateMax})`}
                    </button>
                  </div>
                  {tplMsg && <div className="ca-reuse-msg">✅ {tplMsg}</div>}
                  {templates.length > 0 && (
                    <div className="ca-reuse-list">
                      {templates.map(t => (
                        <span key={t._id} className="ca-reuse-chip">
                          {t.assignmentType === 'custom' ? '🔎' : '♟'} {t.title}
                          <button type="button" onClick={() => deleteTemplate(t._id)} title="Delete template">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Find the blunders (custom) — PGN games + blunder answers */}
              {form.assignmentType === 'custom' && (
                <div className="ca-pgn-builder">
                  {/* Read-only now. A coach-typed total made no sense once each
                      game is graded on its own: the student must find every
                      blunder in every game, so the target IS the content. The
                      old free-text field is also what produced "find 2" on a
                      2-game set with 1 blunder each. */}
                  <div className="ca-pgn-target">
                    Students must find <strong>every blunder in every game</strong>
                    {' — '}
                    {form.pgnGames.reduce((n, g) => n + (g.blunders || []).filter(b => b && b.move.trim()).length, 0)}
                    {' in total across '}{form.pgnGames.length} game{form.pgnGames.length > 1 ? 's' : ''}.
                  </div>

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
                  {subscribed || form.pgnGames.length < FREE_MAX_BLUNDER_GAMES ? (
                    <button type="button" className="ca-link-add" onClick={addGame}>+ Add another game</button>
                  ) : (
                    <p className="ca-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                      Free plan allows up to {FREE_MAX_BLUNDER_GAMES} games per blunder assignment.{' '}
                      <a href="/coach/subscription">Subscribe</a> to add more.
                    </p>
                  )}
                </div>
              )}

              {/* Play vs Stockfish (fen_solution) — positions + engine tolerance */}
              {form.assignmentType === 'fen_solution' && (
                <div className="ca-pgn-builder">
                  <p className="ca-help" style={{ marginTop: 0 }}>
                    The student plays each position out against Stockfish. The engine grades every move
                    and plays a reply; a position is solved when the student plays enough good moves.
                  </p>
                  <label className="field" style={{ maxWidth: 260 }}>
                    <span>Move tolerance (centipawns)</span>
                    <select value={form.fenTolerance} onChange={e => update('fenTolerance', e.target.value)}>
                      <option value={40}>Strict (40cp — near-best moves only)</option>
                      <option value={80}>Normal (80cp — good moves accepted)</option>
                      <option value={150}>Lenient (150cp — reasonable moves)</option>
                    </select>
                  </label>

                  {form.fenPositions.map((p, i) => (
                    <div key={i} className="ca-pgn-game">
                      <div className="ca-pgn-game-head">
                        <strong>Position {i + 1}</strong>
                        {form.fenPositions.length > 1 && (
                          <button type="button" className="ca-link-danger" onClick={() => removeFenPosition(i)}>Remove</button>
                        )}
                      </div>
                      <label className="field">
                        <span>FEN *</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                          <input
                            style={{ flex: 1 }}
                            value={p.fen}
                            onChange={e => updateFenPosition(i, 'fen', e.target.value)}
                            placeholder="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
                          />
                          <button
                            type="button"
                            onClick={() => setFenEditorOpen(fenEditorOpen === i ? null : i)}
                            title="Set up the position on a board instead of typing a FEN"
                            style={{
                              whiteSpace: 'nowrap',
                              padding: '0 14px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                              background: fenEditorOpen === i ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.15)',
                              border: `1px solid ${fenEditorOpen === i ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                              color: fenEditorOpen === i ? '#f87171' : '#a5b4fc',
                            }}
                          >
                            {fenEditorOpen === i ? '✕ Close editor' : '🎨 Board editor'}
                          </button>
                        </div>
                      </label>
                      {fenEditorOpen === i && (
                        <InlineBoardEditor
                          initialFen={p.fen}
                          onApply={fen => { updateFenPosition(i, 'fen', fen); setFenEditorOpen(null); }}
                          onCancel={() => setFenEditorOpen(null)}
                        />
                      )}
                      <div className="ca-blunder-row">
                        <label className="field" style={{ flex: 1 }}>
                          <span>Good moves the student must play</span>
                          <input
                            type="number" min="1" max="12"
                            value={p.userMoveCount}
                            onChange={e => updateFenPosition(i, 'userMoveCount', e.target.value)}
                          />
                        </label>
                        <label className="field" style={{ flex: 2 }}>
                          <span>Label (optional)</span>
                          <input
                            value={p.tag}
                            onChange={e => updateFenPosition(i, 'tag', e.target.value)}
                            placeholder="e.g. Win the queen"
                          />
                        </label>
                      </div>
                      <label className="field">
                        <span>Solution line (optional — for your reference, not shown to students)</span>
                        <input
                          value={p.solution}
                          onChange={e => updateFenPosition(i, 'solution', e.target.value)}
                          placeholder="e.g. Nxf7+ Rxf7 Qxc3"
                        />
                      </label>
                    </div>
                  ))}
                  <button type="button" className="ca-link-add" onClick={addFenPosition}>+ Add another position</button>

                  {/* Premium endgame picker — paid coaches pull admin trainer positions. */}
                  {subscribed ? (
                    <div className="ca-eg-premium" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⭐ Add from premium endgames</div>
                      <select
                        value={egFam}
                        onChange={async e => { const f = e.target.value; setEgFam(f); await loadPremiumEndgames(); }}
                        style={{ maxWidth: 280 }}
                      >
                        <option value="">Pick an endgame type…</option>
                        {['pawn','knight','bishop','bishop_knight','rook','queen','queen_rook','other_mixed'].map(k => (
                          <option key={k} value={k}>{k.replace('_', ' + ')}</option>
                        ))}
                      </select>
                      {egFam && egPremium && (
                        (egPremium[egFam] || []).length > 0 ? (
                          <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
                            {(egPremium[egFam] || []).map((p) => (
                              <div key={p._id} className="ca-blunder-row" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                <span style={{ fontSize: 12.5 }}>{p.title || (p.white || p.black ? `${p.white || 'White'} vs ${p.black || 'Black'}` : 'Position')}</span>
                                <button type="button" className="ca-link-add" onClick={() => addPremiumFen(p)}>+ Add</button>
                              </div>
                            ))}
                          </div>
                        ) : <p className="ca-muted" style={{ fontSize: 12, marginTop: 6 }}>No premium positions in this type.</p>
                      )}
                    </div>
                  ) : (
                    <p className="ca-muted" style={{ fontSize: 12, marginTop: 10 }}>
                      ⭐ <a href="/coach/subscription">Subscribe</a> to add positions from the premium endgame library.
                    </p>
                  )}
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
                  {groups.length > 0 && (
                    <select
                      className="btn-ghost"
                      value=""
                      onChange={e => { applyBatch(e.target.value); e.target.value = ''; }}
                      title="Add all students in a batch"
                    >
                      <option value="">＋ Add a batch…</option>
                      {groups.map(g => (
                        <option key={g._id} value={g._id}>{g.name} ({g.memberCount})</option>
                      ))}
                    </select>
                  )}
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

      {/* Floating message button (opens coach chat popup). */}
      {reviewing && <AssignmentReview assignment={reviewing} onClose={() => setReviewing(null)} />}
      <CoachChatFab />
    </div>
  );
}
