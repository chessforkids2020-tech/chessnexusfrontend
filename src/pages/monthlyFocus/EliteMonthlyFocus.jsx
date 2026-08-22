// src/pages/monthlyFocus/EliteMonthlyFocus.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import InlineBoardEditor from "../../components/PositionEditor/InlineBoardEditor";

const styles = {
  page: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-white-a13)', paddingBottom: '15px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' },
  sidebar: { background: 'var(--color-surface)', padding: '15px', borderRadius: 'var(--radius-lg)', height: 'fit-content' },
  main: { background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: '0 2px 8px var(--color-black-a20)' },
  focusItem: { padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--color-surface)', border: '1px solid var(--color-white-a07)' },
  focusItemSelected: { background: 'var(--color-accent-2-a15)', border: '2px solid var(--color-accent-2)', color: 'var(--color-text)' },
  focusItemActive: { background: 'var(--color-accent-2)', color: 'var(--color-text)', border: '1px solid var(--color-accent-2)' },
  btn: { padding: '10px 20px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'opacity 0.2s' },
  btnPrimary: { background: 'var(--color-accent-2)', color: 'var(--color-text)' },
  btnSecondary: { background: 'var(--color-surface)', color: 'var(--color-text-faint)', border: '1px solid var(--color-text-muted)' },
  btnDanger: { background: 'var(--color-danger)', color: 'var(--color-text)' },
  btnSuccess: { background: 'var(--color-success)', color: 'var(--color-text)' },
  btnSmall: { padding: '6px 12px', fontSize: '12px' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid var(--color-text-muted)', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid var(--color-text-muted)', borderRadius: 'var(--radius-sm)', fontSize: '14px', minHeight: '80px', marginBottom: '10px', fontFamily: 'monospace', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid var(--color-text-muted)', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '10px', background: 'var(--color-surface)', boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--color-text-faint)', fontSize: '14px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--color-black-a50)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  dayCard: { padding: '15px', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-md)', marginBottom: '10px' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: 'var(--radius-2xl)', fontSize: '12px', fontWeight: '500' },
  badgeActive: { background: 'var(--color-success-a20)', color: 'var(--color-success)' },
  badgeDraft: { background: 'var(--color-warning-a20)', color: 'var(--color-warning)' },
  badgeCompleted: { background: 'var(--color-white-a07)', color: 'var(--color-text-muted)' },
  row: { display: 'flex', gap: '10px', marginBottom: '10px' },
  fieldGroup: { background: 'var(--color-surface)', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '15px' },
  canCreateBanner: { background: 'var(--color-accent-2-a15)', border: '1px solid var(--color-accent-2-a30)', borderRadius: 'var(--radius-md)', padding: '12px 15px', marginBottom: '15px', fontSize: '14px', color: 'var(--color-text)' },
  cannotCreateBanner: { background: 'var(--color-warning-a20)', border: '1px solid var(--color-warning-a30)', borderRadius: 'var(--radius-md)', padding: '12px 15px', marginBottom: '15px', fontSize: '14px', color: 'var(--color-text)' },
};

const EMPTY_DAY_FORM = {
  dayNumber: 1,
  title: '',
  description: '',
  taskType: 'puzzles',
  timerEnabled: false,
  timeLimit: 600,
  xpReward: 100,
  perfectBonus: 50,
  scoring: {
    puzzlePoints: 100, bestMovePoints: 150, blunderPoints: 150,
    tacticsPoints: 100, multipleChoicePoints: 100, blunderAnalysisPoints: 200,
    perfectMultiplier: 2.0
  },
  // Engine-judged puzzles (Stockfish WASM judges moves within a tolerance)
  engineJudged: false,
  engineToleranceCp: 80,
  engineDepth: 12,
  puzzles: [{ fen: '', solution: '', tag: '', userMoveCount: 1 }],
  findMistakes: {
    pgn: '', mode: 'best_moves', side: 'both',
    bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
    blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
  },
  tacticsItems: [{ fen: '', tacticsName: '' }],
  multipleChoiceItems: [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }],
  blunderTask: { blunderLimit: 2, thresholdCp: 150, stockfishDepth: 15 }
};

export default function EliteMonthlyFocus() {
  const navigate = useNavigate();
  const [focuses, setFocuses] = useState([]);
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [focusDays, setFocusDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canCreate, setCanCreate] = useState(true);
  const [createInfo, setCreateInfo] = useState(null); // { reason, isTrial, message }
  const [nextAllowedDate, setNextAllowedDate] = useState(null);

  // Modals
  // Which board editor is open, as `${kind}:${index}` — e.g. "puzzle:0".
  // Building a position by hand is the normal case; pasting a FEN is the
  // shortcut. A single key means only one editor can be open at a time, so the
  // form never turns into a wall of boards.
  const [boardEditor, setBoardEditor] = useState(null);

  // Auto-start schedule. Minutes past midnight IST, so 18:00 is 1080.
  const [savingSchedule, setSavingSchedule] = useState(false);
  const minuteToTime = (m) => `${String(Math.floor((m ?? 0) / 60)).padStart(2, '0')}:${String((m ?? 0) % 60).padStart(2, '0')}`;
  const timeToMinute = (t) => {
    const [h, m] = String(t || '').split(':').map(Number);
    return (Number.isFinite(h) && Number.isFinite(m)) ? h * 60 + m : 0;
  };
  const saveSchedule = async (patch) => {
    if (!selectedFocus) return;
    setSavingSchedule(true);
    try {
      const body = {
        autoStart: patch.autoStart ?? selectedFocus.autoStart ?? false,
        dailyStartMinute: patch.dailyStartMinute ?? selectedFocus.dailyStartMinute ?? 1080,
        dailyEndMinute: patch.dailyEndMinute ?? selectedFocus.dailyEndMinute ?? 1320,
      };
      const res = await api.post(`/api/elite/monthly-focus/${selectedFocus._id}/schedule`, body);
      setSelectedFocus(res.data.focus);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save the schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDayForm, setShowDayForm] = useState(false);
  const [editingDay, setEditingDay] = useState(null);

  // Day results (which users completed a day + their answers)
  const [showDayResults, setShowDayResults] = useState(null); // dayNumber or null
  const [dayResults, setDayResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [viewingAnswers, setViewingAnswers] = useState(null);  // a single result row

  // Create focus form
  const [focusForm, setFocusForm] = useState({
    title: '', theme: 'tactics',
    startDate: '', endDate: '',
    // 'public' is the safe default. The form switches it to 'private' for a
    // coach who has students, since that is what they usually mean — but for
    // anyone else private is not a valid choice, and defaulting to it would
    // create a challenge nobody could open.
    visibility: 'public',
  });

  // Day form
  const [dayForm, setDayForm] = useState({ ...EMPTY_DAY_FORM });

  const fetchFocuses = useCallback(async (autoSelectId = null) => {
    try {
      const res = await api.get('/api/elite/monthly-focus/my-focuses');
      const list = res.data.focuses || [];
      setFocuses(list);
      // Auto-select: prefer explicitly given id, then current month's focus, then most recent
      if (list.length > 0 && !selectedFocus) {
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const target =
          (autoSelectId && list.find(f => f._id === autoSelectId)) ||
          list.find(f => f.month === thisMonth) ||
          list[0];
        if (target) loadFocusDetails(target._id);
      }
    } catch (err) {
      setError('Failed to load your challenges');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkCanCreate = useCallback(async () => {
    try {
      const res = await api.get('/api/elite/monthly-focus/can-create');
      setCanCreate(res.data.canCreate);
      setCreateInfo(res.data || null);
      setNextAllowedDate(res.data.nextAllowedDate ? new Date(res.data.nextAllowedDate) : null);
    } catch (_) { /* silent */ }
  }, []);

  useEffect(() => {
    fetchFocuses();
    checkCanCreate();
  }, [fetchFocuses, checkCanCreate]);

  const loadFocusDetails = async (focusId) => {
    try {
      const res = await api.get(`/api/elite/monthly-focus/${focusId}`);
      setSelectedFocus(res.data.focus);
      setFocusDays(res.data.days || []);
    } catch (err) {
      setError('Failed to load challenge details');
    }
  };

  // ── Create focus ─────────────────────────────────────────────────────────

  const createFocus = async () => {
    if (!focusForm.title.trim()) { setError('Title is required'); return; }
    try {
      const res = await api.post('/api/elite/monthly-focus', focusForm);
      setShowCreateModal(false);
      setFocusForm({ title: '', theme: 'tactics', startDate: '', endDate: '' });
      await checkCanCreate();
      await fetchFocuses(res.data.focus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create challenge');
    }
  };

  // ── Activate / deactivate ────────────────────────────────────────────────

  const activateFocus = async (focusId) => {
    try {
      await api.post(`/api/elite/monthly-focus/${focusId}/activate`);
      await fetchFocuses(focusId);
      loadFocusDetails(focusId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate');
    }
  };

  const deactivateFocus = async (focusId) => {
    try {
      await api.post(`/api/elite/monthly-focus/${focusId}/deactivate`);
      await fetchFocuses(focusId);
      loadFocusDetails(focusId);
    } catch (err) {
      setError('Failed to deactivate');
    }
  };

  // ── Day start / stop / reset (owner-controlled, like admin) ──────────────

  const isDayRunning = (day) => {
    if (!day || !day.isStarted || !day.endTime) return false;
    return new Date() < new Date(day.endTime);
  };

  const formatTimeRemaining = (endTime) => {
    const remaining = new Date(endTime) - new Date();
    if (remaining <= 0) return 'Ended';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m left`;
  };

  const startDay = async (dayNumber) => {
    if (!window.confirm(`Start Day ${dayNumber}? Users will have 24 hours to complete it.`)) return;
    try {
      await api.post(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}/start`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start day');
    }
  };

  const stopDay = async (dayNumber) => {
    if (!window.confirm(`Stop Day ${dayNumber}? Users will no longer be able to submit.`)) return;
    try {
      await api.post(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}/stop`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop day');
    }
  };

  const resetDay = async (dayNumber) => {
    if (!window.confirm(`Reset Day ${dayNumber}? This clears all user submissions and lets you start it again.`)) return;
    try {
      await api.post(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}/reset`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset day');
    }
  };

  const viewDayResults = async (dayNumber) => {
    setShowDayResults(dayNumber);
    setLoadingResults(true);
    setDayResults([]);
    try {
      const res = await api.get(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}/results`);
      setDayResults(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  };

  // ── Day management ───────────────────────────────────────────────────────

  const resetDayForm = (dayNum = 1) => {
    setDayForm({ ...EMPTY_DAY_FORM, dayNumber: dayNum });
  };

  const openNewDayForm = (dayNum) => {
    resetDayForm(dayNum || (focusDays.length + 1));
    setEditingDay(null);
    setShowDayForm(true);
  };

  const editDay = async (dayNumber) => {
    try {
      const res = await api.get(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}`);
      const d = res.data.day;
      setDayForm({
        dayNumber: d.dayNumber,
        title: d.title || '',
        description: d.description || '',
        taskType: d.taskType,
        timerEnabled: d.timerEnabled,
        timeLimit: d.timeLimit || 600,
        xpReward: d.xpReward,
        perfectBonus: d.perfectBonus || 50,
        scoring: d.scoring || EMPTY_DAY_FORM.scoring,
        engineJudged: d.engineJudged || false,
        engineToleranceCp: d.engineToleranceCp ?? 80,
        engineDepth: d.engineDepth ?? 12,
        puzzles: d.puzzles?.length
          ? d.puzzles.map(p => ({ fen: p.fen || '', solution: p.solution || '', tag: p.tag || '', userMoveCount: p.userMoveCount || 1 }))
          : [{ fen: '', solution: '', tag: '', userMoveCount: 1 }],
        findMistakes: d.findMistakes || EMPTY_DAY_FORM.findMistakes,
        tacticsItems: d.tacticsItems?.length ? d.tacticsItems : [{ fen: '', tacticsName: '' }],
        multipleChoiceItems: d.multipleChoiceItems?.length ? d.multipleChoiceItems : [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }],
        blunderTask: d.blunderTask || EMPTY_DAY_FORM.blunderTask
      });
      setEditingDay(dayNumber);
      setShowDayForm(true);
    } catch (err) {
      setError('Failed to load day for editing');
    }
  };

  const saveDay = async () => {
    const dayData = {
      dayNumber: dayForm.dayNumber,
      title: dayForm.title || `Day ${dayForm.dayNumber}`,
      description: dayForm.description,
      taskType: dayForm.taskType,
      timerEnabled: dayForm.timerEnabled,
      timeLimit: dayForm.timerEnabled ? dayForm.timeLimit : 0,
      xpReward: dayForm.xpReward,
      perfectBonus: dayForm.perfectBonus,
      scoring: dayForm.scoring
    };

    if (dayForm.taskType === 'puzzles') {
      dayData.engineJudged = dayForm.engineJudged;
      dayData.engineToleranceCp = dayForm.engineToleranceCp;
      dayData.engineDepth = dayForm.engineDepth;
      if (dayForm.engineJudged) {
        // Engine-judged: keep puzzles with a FEN; solution optional, move count required
        dayData.puzzles = dayForm.puzzles
          .filter(p => p.fen)
          .map(p => ({ fen: p.fen, solution: p.solution || '', tag: p.tag || '', userMoveCount: parseInt(p.userMoveCount) || 1 }));
      } else {
        dayData.puzzles = dayForm.puzzles.filter(p => p.fen && p.solution);
      }
    } else if (dayForm.taskType === 'find_mistakes') {
      dayData.findMistakes = {
        pgn: dayForm.findMistakes.pgn, mode: dayForm.findMistakes.mode, side: dayForm.findMistakes.side,
        bestMoves: dayForm.findMistakes.mode !== 'blunders' ? dayForm.findMistakes.bestMoves.filter(m => m.move) : [],
        blunders: dayForm.findMistakes.mode !== 'best_moves' ? dayForm.findMistakes.blunders.filter(b => b.move) : []
      };
    } else if (dayForm.taskType === 'tactics_identification') {
      dayData.tacticsItems = dayForm.tacticsItems.filter(t => t.fen && t.tacticsName);
    } else if (dayForm.taskType === 'multiple_choice') {
      dayData.multipleChoiceItems = dayForm.multipleChoiceItems.filter(i => i.fen && i.question && i.options.length >= 2 && i.correctAnswer);
    } else if (dayForm.taskType === 'pgn_blunder_analysis') {
      dayData.blunderTask = dayForm.blunderTask;
    }

    try {
      await api.post(`/api/elite/monthly-focus/${selectedFocus._id}/day`, dayData);
      setShowDayForm(false);
      setEditingDay(null);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save day');
    }
  };

  const deleteDay = async (dayNumber) => {
    if (!window.confirm(`Delete Day ${dayNumber}?`)) return;
    try {
      await api.delete(`/api/elite/monthly-focus/${selectedFocus._id}/day/${dayNumber}`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError('Failed to delete day');
    }
  };

  // ── Array helpers ────────────────────────────────────────────────────────

  const updatePuzzle = (i, field, val) => {
    const p = [...dayForm.puzzles]; p[i] = { ...p[i], [field]: val };
    setDayForm({ ...dayForm, puzzles: p });
  };
  const addPuzzle = () => {
    if (dayForm.puzzles.length < 20) setDayForm({ ...dayForm, puzzles: [...dayForm.puzzles, { fen: '', solution: '', tag: '', userMoveCount: 1 }] });
  };
  const removePuzzle = (i) => {
    const p = dayForm.puzzles.filter((_, idx) => idx !== i);
    setDayForm({ ...dayForm, puzzles: p.length ? p : [{ fen: '', solution: '', tag: '', userMoveCount: 1 }] });
  };

  const updateTactics = (i, field, val) => {
    const t = [...dayForm.tacticsItems]; t[i] = { ...t[i], [field]: val };
    setDayForm({ ...dayForm, tacticsItems: t });
  };
  const addTactics = () => setDayForm({ ...dayForm, tacticsItems: [...dayForm.tacticsItems, { fen: '', tacticsName: '' }] });
  const removeTactics = (i) => {
    const t = dayForm.tacticsItems.filter((_, idx) => idx !== i);
    setDayForm({ ...dayForm, tacticsItems: t.length ? t : [{ fen: '', tacticsName: '' }] });
  };

  const updateMC = (i, field, val) => {
    const mc = [...dayForm.multipleChoiceItems]; mc[i] = { ...mc[i], [field]: val };
    setDayForm({ ...dayForm, multipleChoiceItems: mc });
  };
  const addMC = () => setDayForm({ ...dayForm, multipleChoiceItems: [...dayForm.multipleChoiceItems, { fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }] });
  const removeMC = (i) => {
    const mc = dayForm.multipleChoiceItems.filter((_, idx) => idx !== i);
    setDayForm({ ...dayForm, multipleChoiceItems: mc.length ? mc : [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }] });
  };
  const updateMCOption = (mi, oi, val) => {
    const mc = [...dayForm.multipleChoiceItems];
    const opts = [...mc[mi].options]; opts[oi] = val;
    mc[mi] = { ...mc[mi], options: opts };
    setDayForm({ ...dayForm, multipleChoiceItems: mc });
  };
  const addMCOption = (mi) => {
    const mc = [...dayForm.multipleChoiceItems];
    if (mc[mi].options.length < 6) { mc[mi] = { ...mc[mi], options: [...mc[mi].options, ''] }; setDayForm({ ...dayForm, multipleChoiceItems: mc }); }
  };
  const removeMCOption = (mi, oi) => {
    const mc = [...dayForm.multipleChoiceItems];
    const opts = mc[mi].options.filter((_, i) => i !== oi);
    mc[mi] = { ...mc[mi], options: opts.length >= 2 ? opts : mc[mi].options };
    setDayForm({ ...dayForm, multipleChoiceItems: mc });
  };

  const updateBestMove = (i, field, val) => {
    const bm = [...dayForm.findMistakes.bestMoves]; bm[i] = { ...bm[i], [field]: val };
    setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, bestMoves: bm } });
  };
  const addBestMove = () => setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, bestMoves: [...dayForm.findMistakes.bestMoves, { moveNumber: dayForm.findMistakes.bestMoves.length + 1, move: '', explanation: '' }] } });
  const removeBestMove = (i) => {
    const bm = dayForm.findMistakes.bestMoves.filter((_, idx) => idx !== i);
    setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, bestMoves: bm.length ? bm : [{ moveNumber: 1, move: '', explanation: '' }] } });
  };

  const updateBlunder = (i, field, val) => {
    const bl = [...dayForm.findMistakes.blunders]; bl[i] = { ...bl[i], [field]: val };
    setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, blunders: bl } });
  };
  const addBlunder = () => setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, blunders: [...dayForm.findMistakes.blunders, { moveNumber: dayForm.findMistakes.blunders.length + 1, move: '', betterMove: '', explanation: '' }] } });
  const removeBlunder = (i) => {
    const bl = dayForm.findMistakes.blunders.filter((_, idx) => idx !== i);
    setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, blunders: bl.length ? bl : [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }] } });
  };

  if (loading) return <div style={styles.page}><p>Loading your challenges…</p></div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>✨ My Monthly Focus Challenges</h1>
        <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => navigate('/monthly-focus')}>
          ← Back to Challenges
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-a12)', color: 'var(--color-danger)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div style={styles.grid}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>My Challenges</h3>

          {/* Can create banner */}
          {canCreate ? (
            <div style={styles.canCreateBanner}>
              {createInfo?.isTrial
                ? '✨ You can create your ONE free Monthly Focus. After this, it becomes an Elite feature.'
                : '✅ You can create 1 challenge this month'}
            </div>
          ) : createInfo?.reason === 'coach_trial_used' ? (
            <div style={styles.cannotCreateBanner}>
              💎 You've used your free Monthly Focus.<br />
              Creating more is an <strong>Elite</strong> feature.
            </div>
          ) : createInfo?.reason === 'month_used' ? (
            <div style={styles.cannotCreateBanner}>
              ⏳ Already created this month.<br />
              Next allowed: <strong>{nextAllowedDate ? nextAllowedDate.toDateString() : '1st of next month'}</strong>
            </div>
          ) : (
            <div style={styles.cannotCreateBanner}>
              💎 Monthly Focus creation is an <strong>Elite</strong> feature.
            </div>
          )}

          <button
            style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', marginBottom: '15px', ...(canCreate ? {} : styles.btnDisabled) }}
            onClick={() => {
              if (!canCreate) return;
              // Pre-select private for a coach who has students — that is almost
              // always what they mean — while leaving it public for everyone
              // else, for whom private is not a workable choice.
              setFocusForm(f => ({
                ...f,
                visibility: (createInfo?.isCoach && createInfo?.studentCount > 0) ? 'private' : 'public',
              }));
              setShowCreateModal(true);
            }}
            disabled={!canCreate}
          >
            + Create Challenge
          </button>

          {focuses.map(focus => (
            <div
              key={focus._id}
              style={{
                ...styles.focusItem,
                ...(focus.status === 'active' ? styles.focusItemActive : {}),
                ...(selectedFocus?._id === focus._id && focus.status !== 'active' ? styles.focusItemSelected : {})
              }}
              onClick={() => loadFocusDetails(focus._id)}
            >
              <div style={{ fontWeight: '500', marginBottom: '3px' }}>{focus.title}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{focus.month}</div>
              <span style={{
                ...styles.badge,
                ...(focus.status === 'active' ? styles.badgeActive : focus.status === 'draft' ? styles.badgeDraft : styles.badgeCompleted)
              }}>
                {focus.status}
              </span>
            </div>
          ))}

          {focuses.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: '20px', fontSize: '14px' }}>
              No challenges yet. Create your first one!
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={styles.main}>
          {!selectedFocus ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-faint)' }}>
              <h2 style={{ marginBottom: '10px' }}>Select or Create a Challenge</h2>
              <p>Choose a challenge from the sidebar or create a new one</p>
            </div>
          ) : (
            <>
              {/* Focus header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0' }}>{selectedFocus.title}</h2>
                  <p style={{ margin: 0, color: 'var(--color-text-faint)' }}>
                    {selectedFocus.month} • Theme: {selectedFocus.theme}
                    {/* Say who can join. A coach needs to see at a glance whether
                        a challenge is going out to the whole platform. */}
                    {' • '}
                    <span style={{ color: selectedFocus.visibility === 'private' ? 'var(--color-accent-2)' : 'var(--color-accent)' }}>
                      {selectedFocus.visibility === 'private' ? '🔒 My students only' : '🌍 Public'}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedFocus.status === 'draft' && (
                    <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={() => activateFocus(selectedFocus._id)}>
                      ✓ Activate
                    </button>
                  )}
                  {selectedFocus.status === 'active' && (
                    <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => deactivateFocus(selectedFocus._id)}>
                      Deactivate
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              {selectedFocus.status === 'draft' && (
                <div style={{ background: 'var(--color-warning-a20)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '15px', fontSize: '14px', color: 'var(--color-warning)' }}>
                  📝 Draft — Add at least 1 day, then activate to make it live for all users.
                </div>
              )}
              {selectedFocus.status === 'active' && (
                <div style={{ background: 'var(--color-success-a20)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '15px', fontSize: '14px', color: 'var(--color-success)' }}>
                  🟢 Active — This challenge is live. Press <strong>▶️ Start Day</strong> on a day below to open it for 24 hours (one day runs at a time).
                </div>
              )}

              {/* AUTO-START — only once all 7 days exist. A partial challenge is
                  still being built, and opening its days automatically would
                  push unfinished content to students, so 1-6 days stay manual. */}
              <div style={{
                background: focusDays.length >= 7 ? 'var(--color-success-a12)' : 'var(--color-white-a04)',
                border: `1px solid ${focusDays.length >= 7 ? 'var(--color-success-a30)' : 'var(--color-white-a13)'}`,
                borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '15px',
              }}>
                {focusDays.length >= 7 ? (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={!!selectedFocus.autoStart}
                        disabled={savingSchedule}
                        onChange={e => saveSchedule({ autoStart: e.target.checked })}
                      />
                      ⏰ Start each day automatically
                    </label>
                    <p style={{ margin: '6px 0 0 24px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                      {selectedFocus.autoStart
                        ? 'Day 1 opens on the start date, day 2 the next day, and so on — you do not have to be here.'
                        : 'You start each day yourself. Turn this on and the days open on schedule.'}
                    </p>
                    {selectedFocus.autoStart && (
                      <div style={{ ...styles.row, marginTop: '10px', marginLeft: '24px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>Opens at (IST)</label>
                          <input style={styles.input} type="time" disabled={savingSchedule}
                            value={minuteToTime(selectedFocus.dailyStartMinute ?? 1080)}
                            onChange={e => saveSchedule({ dailyStartMinute: timeToMinute(e.target.value) })} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>Closes at (IST)</label>
                          <input style={styles.input} type="time" disabled={savingSchedule}
                            value={minuteToTime(selectedFocus.dailyEndMinute ?? 1320)}
                            onChange={e => saveSchedule({ dailyEndMinute: timeToMinute(e.target.value) })} />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                    ⏰ <strong>Auto-start needs all 7 days.</strong> You have {focusDays.length} —
                    add {7 - focusDays.length} more and you can have the days open themselves.
                    Until then you start each day yourself.
                  </p>
                )}
              </div>

              {/* Days section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Days (1–7)</h3>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary, ...(focusDays.length >= 7 ? styles.btnDisabled : {}) }}
                  onClick={() => openNewDayForm()}
                  disabled={focusDays.length >= 7}
                >
                  + Add Day
                </button>
              </div>

              {focusDays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-faint)' }}>
                  <p>No days yet. Add days 1–7 to build your challenge cycle.</p>
                </div>
              ) : (
                <div>
                  {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                    const day = focusDays.find(d => d.dayNumber === dayNum);
                    return (
                      // --color-text is the near-WHITE type colour; using it as a
                      // background painted every day row as a white slab on the
                      // dark page (both ternary branches were identical, so the
                      // condition did nothing, and opacity:0.5 just greyed the
                      // empty ones). A created day now reads as a real surface;
                      // an empty one is a dashed placeholder rather than a
                      // half-transparent block.
                      <div key={dayNum} style={{
                        ...styles.dayCard,
                        background: day ? 'var(--color-white-a04)' : 'transparent',
                        border: day ? '1px solid var(--color-white-a13)' : '1px dashed var(--color-white-a13)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <strong>Day {dayNum}</strong>
                            {day ? (
                              <>
                                <span style={{ marginLeft: '10px', color: 'var(--color-text-faint)' }}>{day.title}</span>
                                <span style={{
                                  ...styles.badge, marginLeft: '10px',
                                  background: day.taskType === 'puzzles' ? 'var(--color-accent-a15)' : day.taskType === 'find_mistakes' ? 'var(--color-warning-a20)' : 'var(--color-success-a20)',
                                  color: day.taskType === 'puzzles' ? 'var(--color-accent)' : day.taskType === 'find_mistakes' ? 'var(--color-warning)' : 'var(--color-success)'
                                }}>
                                  {day.taskType.replace(/_/g, ' ')}
                                </span>
                                <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--color-success)' }}>
                                  {day.xpReward} XP
                                </span>
                                {/* Day status badge */}
                                {day.isStarted ? (
                                  <span style={{
                                    ...styles.badge, marginLeft: '10px',
                                    // Tinted chips, not solid fills — and never a
                                    // TEXT token as a background (--color-text-faint
                                    // was painting the ENDED pill as a pale slab).
                                    color: isDayRunning(day) ? 'var(--color-success)' : 'var(--color-text-muted)',
                                    background: isDayRunning(day) ? 'var(--color-success-a20)' : 'var(--color-white-a07)',
                                  }}>
                                    {isDayRunning(day) ? `LIVE — ${formatTimeRemaining(day.endTime)}` : 'ENDED'}
                                  </span>
                                ) : (
                                  <span style={{ ...styles.badge, marginLeft: '10px', background: 'var(--color-warning-a20)', color: 'var(--color-warning)' }}>
                                    NOT STARTED
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ marginLeft: '10px', color: 'var(--color-text-muted)' }}>Not created</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {day ? (
                              <>
                                {/* Start / Stop / Reset — only when challenge is active */}
                                {selectedFocus.status === 'active' && !day.isStarted && (
                                  <button style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }} onClick={() => startDay(dayNum)}>
                                    ▶️ Start Day
                                  </button>
                                )}
                                {selectedFocus.status === 'active' && isDayRunning(day) && (
                                  <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }} onClick={() => stopDay(dayNum)}>
                                    ⏹️ Stop
                                  </button>
                                )}
                                {selectedFocus.status === 'active' && day.isStarted && !isDayRunning(day) && (
                                  <button style={{ ...styles.btn, ...styles.btnSmall, background: 'var(--color-warning)', color: 'var(--color-text)' }} onClick={() => resetDay(dayNum)}>
                                    🔄 Reset
                                  </button>
                                )}
                                {day.isStarted && (
                                  <button style={{ ...styles.btn, ...styles.btnSmall, background: 'var(--color-accent-2)', color: 'var(--color-text)' }} onClick={() => viewDayResults(dayNum)}>
                                    📊 Results
                                  </button>
                                )}
                                <button style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }} onClick={() => editDay(dayNum)}>
                                  ✏️ Edit
                                </button>
                                <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }} onClick={() => deleteDay(dayNum)}>
                                  🗑️
                                </button>
                              </>
                            ) : (
                              <button
                                style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                                onClick={() => openNewDayForm(dayNum)}
                              >
                                + Create
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create Challenge Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>✨ Create Monthly Focus Challenge</h2>
            <p style={{ color: 'var(--color-text-faint)', fontSize: '14px', marginTop: '-10px' }}>
              You can create <strong>1 challenge per month</strong>. Once created, add up to 7 days then activate.
            </p>

            <label style={styles.label}>Title *</label>
            <input style={styles.input} placeholder="e.g., Endgame Mastery — June 2026"
              value={focusForm.title} onChange={e => setFocusForm({ ...focusForm, title: e.target.value })} />

            <label style={styles.label}>Theme</label>
            <select style={styles.select} value={focusForm.theme} onChange={e => setFocusForm({ ...focusForm, theme: e.target.value })}>
              <option value="tactics">Tactics</option>
              <option value="strategy">Strategy</option>
              <option value="endgame">Endgame</option>
              <option value="opening">Opening</option>
              <option value="mixed">Mixed</option>
            </select>

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Start Date</label>
                <input style={styles.input} type="date" value={focusForm.startDate}
                  onChange={e => setFocusForm({ ...focusForm, startDate: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>End Date</label>
                <input style={styles.input} type="date" value={focusForm.endDate}
                  onChange={e => setFocusForm({ ...focusForm, endDate: e.target.value })} />
              </div>
            </div>

            {/* "My students only" is a COACH concept. An elite member or
                supporter has no students, so offering it would be a choice that
                cannot work — their challenges are always public. A coach with no
                accepted students yet is told why the option is unavailable. */}
            {createInfo?.isCoach && createInfo?.studentCount > 0 ? (
              <>
                <label style={styles.label}>Who can join?</label>
                <select style={styles.select} value={focusForm.visibility}
                  onChange={e => setFocusForm({ ...focusForm, visibility: e.target.value })}>
                  <option value="private">My students only (private)</option>
                  <option value="public">Anyone on Chess Nexus (public)</option>
                </select>
                <p style={{ margin: '-4px 0 12px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  {focusForm.visibility === 'private'
                    ? `Only your ${createInfo.studentCount} accepted student${createInfo.studentCount === 1 ? '' : 's'} can join. Everyone else sees it listed as a closed activity under your name. The student list is fixed when you create it.`
                    : 'Every player on Chess Nexus can find and join this challenge.'}
                </p>
              </>
            ) : (
              <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                🌍 This challenge will be <strong>open to everyone</strong> on Chess Nexus.
                {createInfo?.isCoach && createInfo?.studentCount === 0
                  ? ' Enrol students to be able to run a private, students-only challenge.'
                  : ''}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={createFocus}>
                Create Challenge
              </button>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Day Form Modal ─────────────────────────────────────────────────── */}
      {showDayForm && (
        <div style={styles.modal} onClick={() => { setShowDayForm(false); setEditingDay(null); }}>
          <div style={{ ...styles.modalContent, maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>
              {editingDay ? `Edit Day ${editingDay}` : `Add Day ${dayForm.dayNumber}`}
            </h2>

            {/* Day Number + Title */}
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Day Number</label>
                <select style={styles.select} value={dayForm.dayNumber}
                  onChange={e => setDayForm({ ...dayForm, dayNumber: parseInt(e.target.value) })}
                  disabled={!!editingDay}>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>Day {n}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Title</label>
                <input style={styles.input} placeholder={`Day ${dayForm.dayNumber}`}
                  value={dayForm.title} onChange={e => setDayForm({ ...dayForm, title: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>Description (optional)</label>
            <input style={styles.input} placeholder="Brief description of this day's task"
              value={dayForm.description} onChange={e => setDayForm({ ...dayForm, description: e.target.value })} />

            {/* Task type + XP */}
            <div style={styles.row}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Task Type *</label>
                <select style={styles.select} value={dayForm.taskType}
                  onChange={e => setDayForm({ ...dayForm, taskType: e.target.value })}>
                  <option value="puzzles">🧩 Puzzles (FEN + Solution)</option>
                  <option value="find_mistakes">🔍 Find Mistakes (PGN)</option>
                  <option value="tactics_identification">🎯 Tactics Identification</option>
                  <option value="multiple_choice">❓ Multiple Choice</option>
                  <option value="pgn_blunder_analysis">📊 PGN Blunder Analysis</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>XP Reward</label>
                <input style={styles.input} type="number" value={dayForm.xpReward}
                  onChange={e => setDayForm({ ...dayForm, xpReward: parseInt(e.target.value) || 100 })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Perfect Bonus XP</label>
                <input style={styles.input} type="number" value={dayForm.perfectBonus}
                  onChange={e => setDayForm({ ...dayForm, perfectBonus: parseInt(e.target.value) || 50 })} />
              </div>
            </div>

            {/* Timer */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={dayForm.timerEnabled}
                  onChange={e => setDayForm({ ...dayForm, timerEnabled: e.target.checked })} />
                Enable Timer
              </label>
              {dayForm.timerEnabled && (
                <div style={{ marginLeft: '24px', marginTop: '5px' }}>
                  <label style={styles.label}>Time Limit (seconds)</label>
                  <input style={{ ...styles.input, maxWidth: '200px' }} type="number" value={dayForm.timeLimit}
                    onChange={e => setDayForm({ ...dayForm, timeLimit: parseInt(e.target.value) || 600 })} />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>= {Math.floor(dayForm.timeLimit / 60)} min</span>
                </div>
              )}
            </div>

            {/* Task-specific content */}

            {/* PUZZLES */}
            {dayForm.taskType === 'puzzles' && (
              <div style={styles.fieldGroup}>
                {/* Engine-judged toggle */}
                <div style={{ background: 'var(--color-accent-2-a15)', border: '1px solid var(--color-accent-2-a30)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text)' }}>
                    <input type="checkbox" checked={dayForm.engineJudged}
                      onChange={e => setDayForm({ ...dayForm, engineJudged: e.target.checked })} />
                    🤖 Stockfish-judged (accept any strong move, not just one saved line)
                  </label>
                  <p style={{ margin: '8px 0 0 24px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                    The user plays, Stockfish replies in their browser. A move counts if it's within the tolerance of the engine's best.
                    You don't enter a solution line — just how many moves the user must play.
                  </p>
                  {dayForm.engineJudged && (
                    <div style={{ ...styles.row, marginTop: '10px', marginLeft: '24px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tolerance (centipawns)</label>
                        <input style={styles.input} type="number" min="0" max="500" value={dayForm.engineToleranceCp}
                          onChange={e => setDayForm({ ...dayForm, engineToleranceCp: parseInt(e.target.value) || 0 })} />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>Lower = stricter. ~50 strict, ~100 lenient.</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Engine depth</label>
                        <input style={styles.input} type="number" min="6" max="18" value={dayForm.engineDepth}
                          onChange={e => setDayForm({ ...dayForm, engineDepth: parseInt(e.target.value) || 12 })} />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>Higher = stronger but slower in-browser.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Puzzles ({dayForm.puzzles.length}/20)</strong>
                  <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addPuzzle}>+ Add Puzzle</button>
                </div>
                {dayForm.puzzles.map((p, i) => (
                  <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>Puzzle {i + 1}</strong>
                      {dayForm.puzzles.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removePuzzle(i)}>Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>FEN *</label>
                      <button
                        type="button"
                        style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                        onClick={() => setBoardEditor(boardEditor === 'puzzle:' + i ? null : 'puzzle:' + i)}
                      >
                        {boardEditor === 'puzzle:' + i ? '✕ Close board' : '♟ Set up on board'}
                      </button>
                    </div>
                    <input style={styles.input} placeholder="Paste a FEN, or build the position on the board" value={p.fen}
                      onChange={e => updatePuzzle(i, 'fen', e.target.value)} />
                    {boardEditor === 'puzzle:' + i && (
                      <div style={{ marginBottom: '10px' }}>
                        <InlineBoardEditor
                          initialFen={p.fen}
                          onApply={fen => { updatePuzzle(i, 'fen', fen); setBoardEditor(null); }}
                          onCancel={() => setBoardEditor(null)}
                        />
                      </div>
                    )}
                    {dayForm.engineJudged ? (
                      <>
                        <label style={styles.label}>User moves required *</label>
                        <input style={{ ...styles.input, maxWidth: '160px' }} type="number" min="1" max="10"
                          value={p.userMoveCount || 1}
                          onChange={e => updatePuzzle(i, 'userMoveCount', parseInt(e.target.value) || 1)} />
                        <label style={styles.label}>Solution line (optional — hint/reference only)</label>
                        <input style={styles.input} placeholder="optional, e.g., Qh5 g6 Qxe5" value={p.solution}
                          onChange={e => updatePuzzle(i, 'solution', e.target.value)} />
                      </>
                    ) : (
                      <>
                        <label style={styles.label}>Solution *</label>
                        <input style={styles.input} placeholder="e.g., e4 d5 Nf3" value={p.solution}
                          onChange={e => updatePuzzle(i, 'solution', e.target.value)} />
                      </>
                    )}
                    <label style={styles.label}>Tag (optional)</label>
                    <input style={styles.input} placeholder="e.g., pin, fork, skewer" value={p.tag || ''}
                      onChange={e => updatePuzzle(i, 'tag', e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {/* FIND MISTAKES */}
            {dayForm.taskType === 'find_mistakes' && (
              <div style={styles.fieldGroup}>
                <strong style={{ display: 'block', marginBottom: '10px' }}>Find Mistakes</strong>
                <label style={styles.label}>PGN *</label>
                <textarea style={styles.textarea} placeholder="Paste PGN here"
                  value={dayForm.findMistakes.pgn}
                  onChange={e => setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, pgn: e.target.value } })} />
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Mode</label>
                    <select style={styles.select} value={dayForm.findMistakes.mode}
                      onChange={e => setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, mode: e.target.value } })}>
                      <option value="best_moves">Best Moves</option>
                      <option value="blunders">Blunders</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Side</label>
                    <select style={styles.select} value={dayForm.findMistakes.side}
                      onChange={e => setDayForm({ ...dayForm, findMistakes: { ...dayForm.findMistakes, side: e.target.value } })}>
                      <option value="both">Both</option>
                      <option value="white">White</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                </div>

                {dayForm.findMistakes.mode !== 'blunders' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Best Moves</strong>
                      <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addBestMove}>+ Add</button>
                    </div>
                    {dayForm.findMistakes.bestMoves.map((m, i) => (
                      <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '6px' }}>
                        <div style={styles.row}>
                          <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} type="number" placeholder="Move #" value={m.moveNumber}
                            onChange={e => updateBestMove(i, 'moveNumber', parseInt(e.target.value))} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Best move (e.g., Nf3)" value={m.move}
                            onChange={e => updateBestMove(i, 'move', e.target.value)} />
                          {dayForm.findMistakes.bestMoves.length > 1 && (
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeBestMove(i)}>✕</button>
                          )}
                        </div>
                        <input style={styles.input} placeholder="Explanation (optional)" value={m.explanation}
                          onChange={e => updateBestMove(i, 'explanation', e.target.value)} />
                      </div>
                    ))}
                  </>
                )}

                {dayForm.findMistakes.mode !== 'best_moves' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Blunders</strong>
                      <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addBlunder}>+ Add</button>
                    </div>
                    {dayForm.findMistakes.blunders.map((b, i) => (
                      <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '6px' }}>
                        <div style={styles.row}>
                          <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} type="number" placeholder="Move #" value={b.moveNumber}
                            onChange={e => updateBlunder(i, 'moveNumber', parseInt(e.target.value))} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Blunder move" value={b.move}
                            onChange={e => updateBlunder(i, 'move', e.target.value)} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Better move" value={b.betterMove}
                            onChange={e => updateBlunder(i, 'betterMove', e.target.value)} />
                          {dayForm.findMistakes.blunders.length > 1 && (
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeBlunder(i)}>✕</button>
                          )}
                        </div>
                        <input style={styles.input} placeholder="Explanation (optional)" value={b.explanation}
                          onChange={e => updateBlunder(i, 'explanation', e.target.value)} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* TACTICS IDENTIFICATION */}
            {dayForm.taskType === 'tactics_identification' && (
              <div style={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Tactics Items</strong>
                  <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addTactics}>+ Add</button>
                </div>
                {dayForm.tacticsItems.map((t, i) => (
                  <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>Item {i + 1}</strong>
                      {dayForm.tacticsItems.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeTactics(i)}>Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>FEN *</label>
                      <button
                        type="button"
                        style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                        onClick={() => setBoardEditor(boardEditor === 'tactics:' + i ? null : 'tactics:' + i)}
                      >
                        {boardEditor === 'tactics:' + i ? '✕ Close board' : '♟ Set up on board'}
                      </button>
                    </div>
                    <input style={styles.input} placeholder="Paste a FEN, or build the position on the board" value={t.fen}
                      onChange={e => updateTactics(i, 'fen', e.target.value)} />
                    {boardEditor === 'tactics:' + i && (
                      <div style={{ marginBottom: '10px' }}>
                        <InlineBoardEditor
                          initialFen={t.fen}
                          onApply={fen => { updateTactics(i, 'fen', fen); setBoardEditor(null); }}
                          onCancel={() => setBoardEditor(null)}
                        />
                      </div>
                    )}
                    <label style={styles.label}>Tactics Name *</label>
                    <input style={styles.input} placeholder="e.g., Fork, Pin, Skewer" value={t.tacticsName}
                      onChange={e => updateTactics(i, 'tacticsName', e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {/* MULTIPLE CHOICE */}
            {dayForm.taskType === 'multiple_choice' && (
              <div style={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Multiple Choice Items</strong>
                  <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addMC}>+ Add</button>
                </div>
                {dayForm.multipleChoiceItems.map((item, mi) => (
                  <div key={mi} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Question {mi + 1}</strong>
                      {dayForm.multipleChoiceItems.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeMC(mi)}>Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>FEN *</label>
                      <button
                        type="button"
                        style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                        onClick={() => setBoardEditor(boardEditor === 'mc:' + mi ? null : 'mc:' + mi)}
                      >
                        {boardEditor === 'mc:' + mi ? '✕ Close board' : '♟ Set up on board'}
                      </button>
                    </div>
                    <input style={styles.input} placeholder="Paste a FEN, or build the position on the board" value={item.fen}
                      onChange={e => updateMC(mi, 'fen', e.target.value)} />
                    {boardEditor === 'mc:' + mi && (
                      <div style={{ marginBottom: '10px' }}>
                        <InlineBoardEditor
                          initialFen={item.fen}
                          onApply={fen => { updateMC(mi, 'fen', fen); setBoardEditor(null); }}
                          onCancel={() => setBoardEditor(null)}
                        />
                      </div>
                    )}
                    <label style={styles.label}>Question *</label>
                    <input style={styles.input} placeholder="What is the best move?" value={item.question}
                      onChange={e => updateMC(mi, 'question', e.target.value)} />
                    <label style={styles.label}>Options ({item.options.length}/6) *</label>
                    {item.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} placeholder={`Option ${oi + 1}`} value={opt}
                          onChange={e => updateMCOption(mi, oi, e.target.value)} />
                        {item.options.length > 2 && (
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeMCOption(mi, oi)}>✕</button>
                        )}
                      </div>
                    ))}
                    {item.options.length < 6 && (
                      <button style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall, marginBottom: '8px' }} onClick={() => addMCOption(mi)}>+ Option</button>
                    )}
                    <label style={styles.label}>Correct Answer *</label>
                    <select style={styles.select} value={item.correctAnswer}
                      onChange={e => updateMC(mi, 'correctAnswer', e.target.value)}>
                      <option value="">— Select correct answer —</option>
                      {item.options.filter(o => o).map((opt, oi) => (
                        <option key={oi} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <label style={styles.label}>Explanation (optional)</label>
                    <input style={styles.input} placeholder="Why is this the correct answer?" value={item.explanation || ''}
                      onChange={e => updateMC(mi, 'explanation', e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {/* PGN BLUNDER ANALYSIS */}
            {dayForm.taskType === 'pgn_blunder_analysis' && (
              <div style={styles.fieldGroup}>
                <strong style={{ display: 'block', marginBottom: '10px' }}>PGN Blunder Analysis Settings</strong>
                <p style={{ fontSize: '13px', color: 'var(--color-text-faint)', marginBottom: '10px' }}>
                  Users submit their own PGN game. Stockfish analyzes it to count blunders.
                </p>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Blunder Limit (target to beat) *</label>
                    <input style={styles.input} type="number" min="0" max="20" value={dayForm.blunderTask.blunderLimit}
                      onChange={e => setDayForm({ ...dayForm, blunderTask: { ...dayForm.blunderTask, blunderLimit: parseInt(e.target.value) || 0 } })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Threshold (centipawns)</label>
                    <input style={styles.input} type="number" value={dayForm.blunderTask.thresholdCp}
                      onChange={e => setDayForm({ ...dayForm, blunderTask: { ...dayForm.blunderTask, thresholdCp: parseInt(e.target.value) || 150 } })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Stockfish Depth</label>
                    <input style={styles.input} type="number" min="5" max="20" value={dayForm.blunderTask.stockfishDepth}
                      onChange={e => setDayForm({ ...dayForm, blunderTask: { ...dayForm.blunderTask, stockfishDepth: parseInt(e.target.value) || 15 } })} />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={saveDay}>
                {editingDay ? 'Update Day' : 'Save Day'}
              </button>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => { setShowDayForm(false); setEditingDay(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Day Results Modal ──────────────────────────────────────────────── */}
      {showDayResults !== null && (
        <div style={styles.modal} onClick={() => setShowDayResults(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>📊 Day {showDayResults} Results</h2>

            {loadingResults ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>Loading results…</div>
            ) : dayResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>
                No results yet for this day.
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--color-success-a12)', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                  <strong>{dayResults.length}</strong> user{dayResults.length !== 1 ? 's' : ''} completed this day
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-text)' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Time</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>XP Earned</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Perfect</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayResults.map((result, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--color-text)' }}>
                        <td style={{ padding: '12px' }}>
                          {result.userId?.displayName || result.userId?.username || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.total ? `${result.correct}/${result.total} (${Math.round(result.correct / result.total * 100)}%)` : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.totalTime ? `${Math.floor(result.totalTime / 60)}:${(result.totalTime % 60).toString().padStart(2, '0')}` : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--color-success)', fontWeight: '500' }}>
                          +{(result.xpEarned || 0) + (result.bonusXpEarned || 0)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.isPerfect ? '⭐' : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                            onClick={() => setViewingAnswers(result)}
                          >
                            Solutions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              style={{ ...styles.btn, ...styles.btnSecondary, marginTop: '20px' }}
              onClick={() => setShowDayResults(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Solutions Modal (per user) ─────────────────────────────────────── */}
      {viewingAnswers && (
        <div style={styles.modal} onClick={() => setViewingAnswers(null)}>
          <div style={{ ...styles.modalContent, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🧠 Solutions: {viewingAnswers.userId?.displayName || viewingAnswers.userId?.username}</h2>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                onClick={() => setViewingAnswers(null)}
              >
                Close
              </button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
              {!viewingAnswers.answers || viewingAnswers.answers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: '20px' }}>No detailed answers recorded for this result.</p>
              ) : (
                viewingAnswers.answers.map((ans, idx) => (
                  <div key={idx} style={{
                    padding: '15px',
                    background: ans.isCorrect ? 'var(--color-success-a12)' : 'var(--color-danger-a12)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '15px',
                    border: `1px solid ${ans.isCorrect ? 'var(--color-success-a30)' : 'var(--color-danger-a30)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong style={{ color: 'var(--color-text-faint)' }}>Question #{idx + 1}</strong>
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 'bold',
                        background: ans.isCorrect ? 'var(--color-success)' : 'var(--color-danger)', color: 'var(--color-text)'
                      }}>
                        {ans.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>

                    {ans.fen && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: 'var(--color-text-faint)', fontFamily: 'monospace', background: 'var(--color-surface)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                        FEN: {ans.fen}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', marginBottom: '4px' }}>USER ANSWER</div>
                        <div style={{
                          fontWeight: '500', color: ans.isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                          background: 'var(--color-surface)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-text)'
                        }}>
                          {ans.userAnswer || ans.userTag || '(No answer)'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-faint)', marginBottom: '4px' }}>
                          {ans.engineJudged ? 'STOCKFISH' : 'EXPECTED'}
                        </div>
                        <div style={{
                          fontWeight: '500', color: 'var(--color-text-faint)',
                          background: 'var(--color-surface)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-text)'
                        }}>
                          {ans.engineJudged
                            ? (ans.isCorrect
                                ? 'Accepted by Stockfish'
                                : (ans.engineBestMove ? `Preferred: ${ans.engineBestMove}` : 'Gave up the advantage'))
                            : (ans.correctAnswer || ans.correctTag || '(No answer)')}
                        </div>
                      </div>
                    </div>

                    {ans.timeTaken && (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-faint)' }}>
                        Time taken: <strong>{ans.timeTaken}s</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              style={{ ...styles.btn, ...styles.btnSecondary, width: '100%', marginTop: '20px' }}
              onClick={() => setViewingAnswers(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
