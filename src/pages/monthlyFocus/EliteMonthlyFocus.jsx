// src/pages/monthlyFocus/EliteMonthlyFocus.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

const styles = {
  page: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '15px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' },
  sidebar: { background: '#f9fafb', padding: '15px', borderRadius: '12px', height: 'fit-content' },
  main: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  focusItem: { padding: '12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#fff', border: '1px solid #e5e7eb' },
  focusItemSelected: { background: '#ede9fe', border: '2px solid #7c3aed' },
  focusItemActive: { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' },
  btn: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'opacity 0.2s' },
  btnPrimary: { background: '#7c3aed', color: '#fff' },
  btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
  btnDanger: { background: '#ef4444', color: '#fff' },
  btnSuccess: { background: '#10b981', color: '#fff' },
  btnSmall: { padding: '6px 12px', fontSize: '12px' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '80px', marginBottom: '10px', fontFamily: 'monospace', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '10px', background: '#fff', boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '14px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  dayCard: { padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  badgeActive: { background: '#dcfce7', color: '#166534' },
  badgeDraft: { background: '#fef3c7', color: '#92400e' },
  badgeCompleted: { background: '#e5e7eb', color: '#4b5563' },
  row: { display: 'flex', gap: '10px', marginBottom: '10px' },
  fieldGroup: { background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
  canCreateBanner: { background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px', fontSize: '14px', color: '#5b21b6' },
  cannotCreateBanner: { background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px', fontSize: '14px', color: '#92400e' },
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
  const [nextAllowedDate, setNextAllowedDate] = useState(null);

  // Modals
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
    startDate: '', endDate: ''
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
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              ✅ You can create 1 challenge this month
            </div>
          ) : (
            <div style={styles.cannotCreateBanner}>
              ⏳ Already created this month.<br />
              Next allowed: <strong>{nextAllowedDate ? nextAllowedDate.toDateString() : '1st of next month'}</strong>
            </div>
          )}

          <button
            style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', marginBottom: '15px', ...(canCreate ? {} : styles.btnDisabled) }}
            onClick={() => canCreate && setShowCreateModal(true)}
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
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px', fontSize: '14px' }}>
              No challenges yet. Create your first one!
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={styles.main}>
          {!selectedFocus ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <h2 style={{ marginBottom: '10px' }}>Select or Create a Challenge</h2>
              <p>Choose a challenge from the sidebar or create a new one</p>
            </div>
          ) : (
            <>
              {/* Focus header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0' }}>{selectedFocus.title}</h2>
                  <p style={{ margin: 0, color: '#6b7280' }}>{selectedFocus.month} • Theme: {selectedFocus.theme}</p>
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
                <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '12px', marginBottom: '15px', fontSize: '14px', color: '#92400e' }}>
                  📝 Draft — Add at least 1 day, then activate to make it live for all users.
                </div>
              )}
              {selectedFocus.status === 'active' && (
                <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '12px', marginBottom: '15px', fontSize: '14px', color: '#166534' }}>
                  🟢 Active — This challenge is live. Press <strong>▶️ Start Day</strong> on a day below to open it for 24 hours (one day runs at a time).
                </div>
              )}

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
                <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                  <p>No days yet. Add days 1–7 to build your challenge cycle.</p>
                </div>
              ) : (
                <div>
                  {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                    const day = focusDays.find(d => d.dayNumber === dayNum);
                    return (
                      <div key={dayNum} style={{ ...styles.dayCard, background: day ? '#fff' : '#f9fafb', opacity: day ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <strong>Day {dayNum}</strong>
                            {day ? (
                              <>
                                <span style={{ marginLeft: '10px', color: '#6b7280' }}>{day.title}</span>
                                <span style={{
                                  ...styles.badge, marginLeft: '10px',
                                  background: day.taskType === 'puzzles' ? '#dbeafe' : day.taskType === 'find_mistakes' ? '#fef3c7' : '#dcfce7',
                                  color: day.taskType === 'puzzles' ? '#1e40af' : day.taskType === 'find_mistakes' ? '#92400e' : '#166534'
                                }}>
                                  {day.taskType.replace(/_/g, ' ')}
                                </span>
                                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#10b981' }}>
                                  {day.xpReward} XP
                                </span>
                                {/* Day status badge */}
                                {day.isStarted ? (
                                  <span style={{
                                    ...styles.badge, marginLeft: '10px', color: '#fff',
                                    background: isDayRunning(day) ? '#10b981' : '#6b7280'
                                  }}>
                                    {isDayRunning(day) ? `LIVE — ${formatTimeRemaining(day.endTime)}` : 'ENDED'}
                                  </span>
                                ) : (
                                  <span style={{ ...styles.badge, marginLeft: '10px', background: '#f59e0b', color: '#fff' }}>
                                    NOT STARTED
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ marginLeft: '10px', color: '#9ca3af' }}>Not created</span>
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
                                  <button style={{ ...styles.btn, ...styles.btnSmall, background: '#f59e0b', color: '#fff' }} onClick={() => resetDay(dayNum)}>
                                    🔄 Reset
                                  </button>
                                )}
                                {day.isStarted && (
                                  <button style={{ ...styles.btn, ...styles.btnSmall, background: '#3b82f6', color: '#fff' }} onClick={() => viewDayResults(dayNum)}>
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
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '-10px' }}>
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
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>= {Math.floor(dayForm.timeLimit / 60)} min</span>
                </div>
              )}
            </div>

            {/* Task-specific content */}

            {/* PUZZLES */}
            {dayForm.taskType === 'puzzles' && (
              <div style={styles.fieldGroup}>
                {/* Engine-judged toggle */}
                <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#5b21b6' }}>
                    <input type="checkbox" checked={dayForm.engineJudged}
                      onChange={e => setDayForm({ ...dayForm, engineJudged: e.target.checked })} />
                    🤖 Stockfish-judged (accept any strong move, not just one saved line)
                  </label>
                  <p style={{ margin: '8px 0 0 24px', fontSize: '12.5px', color: '#6b21a8' }}>
                    The user plays, Stockfish replies in their browser. A move counts if it's within the tolerance of the engine's best.
                    You don't enter a solution line — just how many moves the user must play.
                  </p>
                  {dayForm.engineJudged && (
                    <div style={{ ...styles.row, marginTop: '10px', marginLeft: '24px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Tolerance (centipawns)</label>
                        <input style={styles.input} type="number" min="0" max="500" value={dayForm.engineToleranceCp}
                          onChange={e => setDayForm({ ...dayForm, engineToleranceCp: parseInt(e.target.value) || 0 })} />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Lower = stricter. ~50 strict, ~100 lenient.</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Engine depth</label>
                        <input style={styles.input} type="number" min="6" max="18" value={dayForm.engineDepth}
                          onChange={e => setDayForm({ ...dayForm, engineDepth: parseInt(e.target.value) || 12 })} />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Higher = stronger but slower in-browser.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Puzzles ({dayForm.puzzles.length}/20)</strong>
                  <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }} onClick={addPuzzle}>+ Add Puzzle</button>
                </div>
                {dayForm.puzzles.map((p, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>Puzzle {i + 1}</strong>
                      {dayForm.puzzles.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removePuzzle(i)}>Remove</button>
                      )}
                    </div>
                    <label style={styles.label}>FEN *</label>
                    <input style={styles.input} placeholder="FEN string" value={p.fen}
                      onChange={e => updatePuzzle(i, 'fen', e.target.value)} />
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
                      <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', marginBottom: '6px' }}>
                        <div style={styles.row}>
                          <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} type="number" placeholder="Move #" value={m.moveNumber}
                            onChange={e => updateBestMove(i, 'moveNumber', parseInt(e.target.value))} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Best move (e.g., Nf3)" value={m.move}
                            onChange={e => updateBestMove(i, 'move', e.target.value)} />
                          {dayForm.findMistakes.bestMoves.length > 1 && (
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeBestMove(i)}>✕</button>
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
                      <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', marginBottom: '6px' }}>
                        <div style={styles.row}>
                          <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} type="number" placeholder="Move #" value={b.moveNumber}
                            onChange={e => updateBlunder(i, 'moveNumber', parseInt(e.target.value))} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Blunder move" value={b.move}
                            onChange={e => updateBlunder(i, 'move', e.target.value)} />
                          <input style={{ ...styles.input, flex: 2, marginBottom: 0 }} placeholder="Better move" value={b.betterMove}
                            onChange={e => updateBlunder(i, 'betterMove', e.target.value)} />
                          {dayForm.findMistakes.blunders.length > 1 && (
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeBlunder(i)}>✕</button>
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
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>Item {i + 1}</strong>
                      {dayForm.tacticsItems.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeTactics(i)}>Remove</button>
                      )}
                    </div>
                    <label style={styles.label}>FEN *</label>
                    <input style={styles.input} placeholder="FEN string" value={t.fen}
                      onChange={e => updateTactics(i, 'fen', e.target.value)} />
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
                  <div key={mi} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Question {mi + 1}</strong>
                      {dayForm.multipleChoiceItems.length > 1 && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeMC(mi)}>Remove</button>
                      )}
                    </div>
                    <label style={styles.label}>FEN *</label>
                    <input style={styles.input} placeholder="FEN string" value={item.fen}
                      onChange={e => updateMC(mi, 'fen', e.target.value)} />
                    <label style={styles.label}>Question *</label>
                    <input style={styles.input} placeholder="What is the best move?" value={item.question}
                      onChange={e => updateMC(mi, 'question', e.target.value)} />
                    <label style={styles.label}>Options ({item.options.length}/6) *</label>
                    {item.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} placeholder={`Option ${oi + 1}`} value={opt}
                          onChange={e => updateMCOption(mi, oi, e.target.value)} />
                        {item.options.length > 2 && (
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeMCOption(mi, oi)}>✕</button>
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
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
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
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading results…</div>
            ) : dayResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No results yet for this day.
              </div>
            ) : (
              <div>
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <strong>{dayResults.length}</strong> user{dayResults.length !== 1 ? 's' : ''} completed this day
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
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
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>
                          {result.userId?.displayName || result.userId?.username || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.total ? `${result.correct}/${result.total} (${Math.round(result.correct / result.total * 100)}%)` : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.totalTime ? `${Math.floor(result.totalTime / 60)}:${(result.totalTime % 60).toString().padStart(2, '0')}` : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#10b981', fontWeight: '500' }}>
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
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No detailed answers recorded for this result.</p>
              ) : (
                viewingAnswers.answers.map((ans, idx) => (
                  <div key={idx} style={{
                    padding: '15px',
                    background: ans.isCorrect ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: `1px solid ${ans.isCorrect ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong style={{ color: '#374151' }}>Question #{idx + 1}</strong>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        background: ans.isCorrect ? '#10b981' : '#ef4444', color: '#fff'
                      }}>
                        {ans.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>

                    {ans.fen && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', background: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                        FEN: {ans.fen}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>USER ANSWER</div>
                        <div style={{
                          fontWeight: '500', color: ans.isCorrect ? '#065f46' : '#991b1b',
                          background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb'
                        }}>
                          {ans.userAnswer || ans.userTag || '(No answer)'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          {ans.engineJudged ? 'STOCKFISH' : 'EXPECTED'}
                        </div>
                        <div style={{
                          fontWeight: '500', color: '#374151',
                          background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb'
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
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
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
