// src/pages/monthlyFocus/AdminMonthlyFocus.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

const AdminMonthlyFocus = () => {
  const navigate = useNavigate();
  const [focuses, setFocuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [focusDays, setFocusDays] = useState([]);
  const [showCreateFocus, setShowCreateFocus] = useState(false);
  const [showDayForm, setShowDayForm] = useState(false);
  const [showDayResults, setShowDayResults] = useState(null);
  const [dayResults, setDayResults] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [viewingAnswers, setViewingAnswers] = useState(null);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'elite'
  
  // Focus creation form
  const [focusForm, setFocusForm] = useState({
    title: '',
    theme: 'tactics',
    month: 'February 2026'
  });
  
  // Day creation form
  const [dayForm, setDayForm] = useState({
    dayNumber: 1,
    title: '',
    description: '',
    taskType: 'puzzles',
    timerEnabled: false,
    timeLimit: 600, // 10 minutes
    xpReward: 100,
    perfectBonus: 50,
    // Scoring (skill points per correct answer)
    scoring: {
      puzzlePoints: 100,
      bestMovePoints: 150,
      blunderPoints: 150,
      tacticsPoints: 100,
      multipleChoicePoints: 100,
      blunderAnalysisPoints: 200,
      perfectMultiplier: 2.0
    },
    // Engine-judged puzzles (Stockfish WASM judges moves within a tolerance)
    engineJudged: false,
    engineToleranceCp: 80,
    engineDepth: 12,
    // Puzzles
    puzzles: [{ fen: '', solution: '', tag: '', userMoveCount: 1 }],
    // Find Mistakes
    findMistakes: {
      pgn: '',
      mode: 'best_moves',
      side: 'both',
      bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
      blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
    },
    // Tactics ID
    tacticsItems: [{ fen: '', tacticsName: '' }],
    // Multiple Choice
    multipleChoiceItems: [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }],
    // PGN Blunder Analysis (user-submitted)
    blunderTask: {
      blunderLimit: 2,
      thresholdCp: 150,
      stockfishDepth: 15
    }
  });

  useEffect(() => {
    fetchFocuses();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab]);

  const fetchFocuses = async () => {
    try {
      // High limit so both Admin and Elite tabs get the full list (split client-side).
      const res = await api.get('/api/admin/monthly-focus?limit=200');
      setFocuses(res.data.focuses || []);
    } catch (err) {
      setError('Failed to load focuses');
    } finally {
      setLoading(false);
    }
  };

  const loadFocusDetails = async (focusId) => {
    try {
      const res = await api.get(`/api/admin/monthly-focus/${focusId}`);
      setSelectedFocus(res.data.focus);
      setFocusDays(res.data.days || []);
    } catch (err) {
      setError('Failed to load focus details');
    }
  };

  // ── Bell notifications (admin-managed) ────────────────────────────────────
  const emptyNotifForm = {
    icon: '🎯',
    topic: '🏛️ ChessNexus Official',
    title: '',
    desc: '',
    date: '',
    link: '/monthly-focus',
    linkLabel: 'Go to Monthly Focus →',
  };
  const [notifications, setNotifications] = useState([]);
  const [notifForm, setNotifForm] = useState(emptyNotifForm);
  const [editingNotifId, setEditingNotifId] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/admin/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load notifications');
    }
  };

  const saveNotification = async () => {
    if (!notifForm.title.trim()) { setError('Notification title is required'); return; }
    try {
      if (editingNotifId) {
        await api.put(`/api/admin/notifications/${editingNotifId}`, notifForm);
      } else {
        await api.post('/api/admin/notifications', notifForm);
      }
      setNotifForm(emptyNotifForm);
      setEditingNotifId(null);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save notification');
    }
  };

  const editNotification = (n) => {
    setEditingNotifId(n._id);
    setNotifForm({
      icon: n.icon || '', topic: n.topic || '', title: n.title || '',
      desc: n.desc || '', date: n.date || '', link: n.link || '', linkLabel: n.linkLabel || ''
    });
  };

  const publishNotification = async (id) => {
    try { await api.post(`/api/admin/notifications/${id}/publish`); fetchNotifications(); }
    catch { setError('Failed to publish'); }
  };
  const unpublishNotification = async (id) => {
    try { await api.post(`/api/admin/notifications/${id}/unpublish`); fetchNotifications(); }
    catch { setError('Failed to unpublish'); }
  };
  const deleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await api.delete(`/api/admin/notifications/${id}`); fetchNotifications(); }
    catch { setError('Failed to delete'); }
  };

  const createFocus = async () => {
    try {
      const res = await api.post('/api/admin/monthly-focus', focusForm);
      setShowCreateFocus(false);
      setFocusForm({ title: '', theme: 'tactics', month: '' });
      fetchFocuses();
      // Auto-select the new focus
      loadFocusDetails(res.data.focus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create focus');
    }
  };

  const createOrUpdateDay = async () => {
    try {
      // Build request body based on task type
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
          dayData.puzzles = dayForm.puzzles
            .filter(p => p.fen)
            .map(p => ({ fen: p.fen, solution: p.solution || '', tag: p.tag || '', userMoveCount: parseInt(p.userMoveCount) || 1 }));
        } else {
          dayData.puzzles = dayForm.puzzles.filter(p => p.fen && p.solution);
        }
      } else if (dayForm.taskType === 'find_mistakes') {
        dayData.findMistakes = {
          pgn: dayForm.findMistakes.pgn,
          mode: dayForm.findMistakes.mode,
          side: dayForm.findMistakes.side,
          bestMoves: dayForm.findMistakes.mode !== 'blunders' 
            ? dayForm.findMistakes.bestMoves.filter(m => m.move) 
            : [],
          blunders: dayForm.findMistakes.mode !== 'best_moves' 
            ? dayForm.findMistakes.blunders.filter(b => b.move) 
            : []
        };
      } else if (dayForm.taskType === 'tactics_identification') {
        dayData.tacticsItems = dayForm.tacticsItems.filter(t => t.fen && t.tacticsName);
      } else if (dayForm.taskType === 'multiple_choice') {
        dayData.multipleChoiceItems = dayForm.multipleChoiceItems.filter(item => 
          item.fen && item.question && item.options.length >= 2 && item.correctAnswer
        );
      } else if (dayForm.taskType === 'pgn_blunder_analysis') {
        dayData.blunderTask = dayForm.blunderTask;
      }

      await api.post(`/api/admin/monthly-focus/${selectedFocus._id}/day`, dayData);
      setShowDayForm(false);
      setEditingDay(null);
      resetDayForm();
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save day');
    }
  };

  const deleteDay = async (dayNumber) => {
    if (!confirm(`Delete Day ${dayNumber}?`)) return;
    try {
      await api.delete(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError('Failed to delete day');
    }
  };

  const activateFocus = async (focusId) => {
    try {
      await api.post(`/api/admin/monthly-focus/${focusId}/activate`);
      fetchFocuses();
      loadFocusDetails(focusId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate');
    }
  };

  const deactivateFocus = async (focusId) => {
    try {
      await api.post(`/api/admin/monthly-focus/${focusId}/deactivate`);
      fetchFocuses();
      loadFocusDetails(focusId);
    } catch (err) {
      setError('Failed to deactivate');
    }
  };

  const reactivateFocus = async (focusId) => {
    try {
      await api.post(`/api/admin/monthly-focus/${focusId}/reactivate`);
      fetchFocuses();
      loadFocusDetails(focusId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate');
    }
  };

  // Start a day (begins 24-hour countdown)
  const startDay = async (dayNumber) => {
    if (!confirm(`Start Day ${dayNumber}? Users will have 24 hours to complete it.`)) return;
    try {
      await api.post(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}/start`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start day');
    }
  };

  // Stop a running day early
  const stopDay = async (dayNumber) => {
    if (!confirm(`Stop Day ${dayNumber}? Users will no longer be able to submit.`)) return;
    try {
      await api.post(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}/stop`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop day');
    }
  };

  // Reset a day (allows restarting)
  const resetDay = async (dayNumber) => {
    if (!confirm(`Reset Day ${dayNumber}? This will clear all user submissions and allow you to restart it.`)) return;
    try {
      await api.post(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}/reset`);
      loadFocusDetails(selectedFocus._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset day');
    }
  };

  // Helper to check if day is currently running
  const isDayRunning = (day) => {
    if (!day || !day.isStarted || !day.endTime) return false;
    return new Date() < new Date(day.endTime);
  };

  // Helper to format time remaining
  const formatTimeRemaining = (endTime) => {
    const remaining = new Date(endTime) - new Date();
    if (remaining <= 0) return 'Ended';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const deleteFocus = async (focusId) => {
    if (!confirm('Delete this focus and all its days?')) return;
    try {
      await api.delete(`/api/admin/monthly-focus/${focusId}`);
      setSelectedFocus(null);
      setFocusDays([]);
      fetchFocuses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const viewDayResults = async (dayNumber) => {
    try {
      const res = await api.get(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}/results`);
      setDayResults(res.data.results || []);
      setShowDayResults(dayNumber);
    } catch (err) {
      setError('Failed to load results');
    }
  };

  const editDay = async (dayNumber) => {
    try {
      const res = await api.get(`/api/admin/monthly-focus/${selectedFocus._id}/day/${dayNumber}`);
      const day = res.data.day;
      
      setDayForm({
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description || '',
        taskType: day.taskType,
        timerEnabled: day.timerEnabled,
        timeLimit: day.timeLimit || 600,
        xpReward: day.xpReward,
        perfectBonus: day.perfectBonus || 50,
        scoring: day.scoring || {
          puzzlePoints: 100,
          bestMovePoints: 150,
          blunderPoints: 150,
          tacticsPoints: 100,
          perfectMultiplier: 2.0
        },
        engineJudged: day.engineJudged || false,
        engineToleranceCp: day.engineToleranceCp ?? 80,
        engineDepth: day.engineDepth ?? 12,
        puzzles: day.puzzles?.length
          ? day.puzzles.map(p => ({ fen: p.fen || '', solution: p.solution || '', tag: p.tag || '', userMoveCount: p.userMoveCount || 1 }))
          : [{ fen: '', solution: '', tag: '', userMoveCount: 1 }],
        findMistakes: day.findMistakes || {
          pgn: '',
          mode: 'best_moves',
          side: 'both',
          bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
          blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
        },
        tacticsItems: day.tacticsItems?.length ? day.tacticsItems : [{ fen: '', tacticsName: '' }],
        multipleChoiceItems: day.multipleChoiceItems?.length ? day.multipleChoiceItems : [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }],
        blunderTask: day.blunderTask || {
          blunderLimit: 2,
          thresholdCp: 150,
          stockfishDepth: 15
        }
      });
      setEditingDay(dayNumber);
      setShowDayForm(true);
    } catch (err) {
      setError('Failed to load day for editing');
    }
  };

  const resetDayForm = () => {
    setDayForm({
      dayNumber: focusDays.length + 1,
      title: '',
      description: '',
      taskType: 'puzzles',
      timerEnabled: false,
      timeLimit: 600,
      xpReward: 100,
      perfectBonus: 50,
      scoring: {
        puzzlePoints: 100,
        bestMovePoints: 150,
        blunderPoints: 150,
        tacticsPoints: 100,
        perfectMultiplier: 2.0
      },
      engineJudged: false,
      engineToleranceCp: 80,
      engineDepth: 12,
      puzzles: [{ fen: '', solution: '', tag: '', userMoveCount: 1 }],
      findMistakes: {
        pgn: '',
        mode: 'best_moves',
        side: 'both',
        bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
        blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
      },
      tacticsItems: [{ fen: '', tacticsName: '' }],
      multipleChoiceItems: [{ fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }],
      blunderTask: {
        blunderLimit: 2,
        thresholdCp: 150,
        stockfishDepth: 15
      }
    });
  };

  const openNewDayForm = () => {
    resetDayForm();
    setEditingDay(null);
    setShowDayForm(true);
  };

  // Array field helpers
  const addPuzzle = () => {
    if (dayForm.puzzles.length < 20) {
      setDayForm({...dayForm, puzzles: [...dayForm.puzzles, { fen: '', solution: '', tag: '', userMoveCount: 1 }]});
    }
  };

  const removePuzzle = (index) => {
    const newPuzzles = dayForm.puzzles.filter((_, i) => i !== index);
    setDayForm({...dayForm, puzzles: newPuzzles.length ? newPuzzles : [{ fen: '', solution: '', tag: '', userMoveCount: 1 }]});
  };

  const updatePuzzle = (index, field, value) => {
    const newPuzzles = [...dayForm.puzzles];
    newPuzzles[index] = { ...newPuzzles[index], [field]: value };
    setDayForm({...dayForm, puzzles: newPuzzles});
  };

  const addTactics = () => {
    setDayForm({...dayForm, tacticsItems: [...dayForm.tacticsItems, { fen: '', tacticsName: '' }]});
  };

  const removeTactics = (index) => {
    const newItems = dayForm.tacticsItems.filter((_, i) => i !== index);
    setDayForm({...dayForm, tacticsItems: newItems.length ? newItems : [{ fen: '', tacticsName: '' }]});
  };

  const updateTactics = (index, field, value) => {
    const newItems = [...dayForm.tacticsItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setDayForm({...dayForm, tacticsItems: newItems});
  };

  const addBestMove = () => {
    setDayForm({
      ...dayForm,
      findMistakes: {
        ...dayForm.findMistakes,
        bestMoves: [...dayForm.findMistakes.bestMoves, { moveNumber: dayForm.findMistakes.bestMoves.length + 1, move: '', explanation: '' }]
      }
    });
  };

  const removeBestMove = (index) => {
    const newMoves = dayForm.findMistakes.bestMoves.filter((_, i) => i !== index);
    setDayForm({
      ...dayForm,
      findMistakes: {
        ...dayForm.findMistakes,
        bestMoves: newMoves.length ? newMoves : [{ moveNumber: 1, move: '', explanation: '' }]
      }
    });
  };

  const updateBestMove = (index, field, value) => {
    const newMoves = [...dayForm.findMistakes.bestMoves];
    newMoves[index] = { ...newMoves[index], [field]: value };
    setDayForm({...dayForm, findMistakes: {...dayForm.findMistakes, bestMoves: newMoves}});
  };

  const addBlunder = () => {
    setDayForm({
      ...dayForm,
      findMistakes: {
        ...dayForm.findMistakes,
        blunders: [...dayForm.findMistakes.blunders, { moveNumber: dayForm.findMistakes.blunders.length + 1, move: '', betterMove: '', explanation: '' }]
      }
    });
  };

  const removeBlunder = (index) => {
    const newBlunders = dayForm.findMistakes.blunders.filter((_, i) => i !== index);
    setDayForm({
      ...dayForm,
      findMistakes: {
        ...dayForm.findMistakes,
        blunders: newBlunders.length ? newBlunders : [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
      }
    });
  };

  const updateBlunder = (index, field, value) => {
    const newBlunders = [...dayForm.findMistakes.blunders];
    newBlunders[index] = { ...newBlunders[index], [field]: value };
    setDayForm({...dayForm, findMistakes: {...dayForm.findMistakes, blunders: newBlunders}});
  };

  const styles = {
    page: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
    smallTag: { fontSize: '12px', color: '#6b7280' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '15px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 },
    grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' },
    sidebar: { background: '#f9fafb', padding: '15px', borderRadius: '12px', height: 'fit-content' },
    main: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    focusItem: { padding: '12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#fff', border: '1px solid #e5e7eb' },
    focusItemActive: { background: '#667eea', color: '#fff', border: '1px solid #667eea' },
    focusItemSelected: { background: '#e0e7ff', border: '2px solid #667eea' },
    btn: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
    btnPrimary: { background: '#667eea', color: '#fff' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    btnDanger: { background: '#ef4444', color: '#fff' },
    btnSuccess: { background: '#10b981', color: '#fff' },
    btnSmall: { padding: '6px 12px', fontSize: '12px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '10px' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '100px', marginBottom: '10px', fontFamily: 'monospace' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '10px', background: '#fff' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '14px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
    dayCard: { padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' },
    badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
    badgeActive: { background: '#dcfce7', color: '#166534' },
    badgeDraft: { background: '#fef3c7', color: '#92400e' },
    badgeCompleted: { background: '#e5e7eb', color: '#4b5563' },
    fieldGroup: { background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    row: { display: 'flex', gap: '10px', marginBottom: '10px' },
    resultRow: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #e5e7eb' }
  };

  if (loading) return <div style={styles.page}>Loading...</div>;

  // A focus is "elite" when its creator is an elite user; everything else is admin-created.
  const isEliteFocus = (focus) => (focus?.createdBy?.role === 'elite');
  const visibleFocuses = focuses.filter(f => activeTab === 'elite' ? isEliteFocus(f) : !isEliteFocus(f));
  const eliteCount = focuses.filter(isEliteFocus).length;
  const adminCount = focuses.length - eliteCount;

  const tabStyle = (id) => ({
    ...styles.btn,
    padding: '8px 18px',
    borderRadius: '8px 8px 0 0',
    border: '1px solid #e5e7eb',
    borderBottom: activeTab === id ? '2px solid #fff' : '1px solid #e5e7eb',
    background: activeTab === id ? '#fff' : '#f3f4f6',
    color: activeTab === id ? '#111827' : '#6b7280',
    fontWeight: activeTab === id ? 700 : 500,
    position: 'relative',
    top: '1px',
  });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎯 Monthly Focus Admin</h1>
        <div>
          <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => navigate('/admin')}>
            ← Back to Admin
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
          {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs: Admin-created vs Elite-created focuses */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <button style={tabStyle('admin')} onClick={() => setActiveTab('admin')}>
          🛠️ Admin Focuses ({adminCount})
        </button>
        <button style={tabStyle('elite')} onClick={() => setActiveTab('elite')}>
          💎 Elite Focuses ({eliteCount})
        </button>
        <button style={tabStyle('notifications')} onClick={() => setActiveTab('notifications')}>
          🔔 Notifications
        </button>
      </div>

      {activeTab === 'notifications' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
          {/* Create / edit form */}
          <div style={styles.sidebar}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
              {editingNotifId ? '✏️ Edit Notification' : '➕ New Notification'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '70px' }}>
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Icon</label>
                  <input style={styles.input} value={notifForm.icon}
                    onChange={e => setNotifForm({ ...notifForm, icon: e.target.value })} placeholder="🎯" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Topic</label>
                  <input style={styles.input} value={notifForm.topic}
                    onChange={e => setNotifForm({ ...notifForm, topic: e.target.value })} placeholder="🏛️ ChessNexus Official" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Title *</label>
                <input style={styles.input} value={notifForm.title}
                  onChange={e => setNotifForm({ ...notifForm, title: e.target.value })} placeholder="Monthly Focus: June Endgame Goals" />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Description</label>
                <textarea style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} value={notifForm.desc}
                  onChange={e => setNotifForm({ ...notifForm, desc: e.target.value })}
                  placeholder="June Monthly Focus challenge starts on June 17th — ..." />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Date label</label>
                <input style={styles.input} value={notifForm.date}
                  onChange={e => setNotifForm({ ...notifForm, date: e.target.value })} placeholder="June 2026" />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Link</label>
                  <input style={styles.input} value={notifForm.link}
                    onChange={e => setNotifForm({ ...notifForm, link: e.target.value })} placeholder="/monthly-focus" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Link label</label>
                  <input style={styles.input} value={notifForm.linkLabel}
                    onChange={e => setNotifForm({ ...notifForm, linkLabel: e.target.value })} placeholder="Go to Monthly Focus →" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={saveNotification}>
                  {editingNotifId ? 'Save Changes' : 'Create Draft'}
                </button>
                {editingNotifId && (
                  <button style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={() => { setEditingNotifId(null); setNotifForm(emptyNotifForm); }}>
                    Cancel
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: '4px 0 0', lineHeight: 1.5 }}>
                Create a draft, then <b>Publish</b> it to show it to all users. Each published
                notification appears as a new unread item in everyone's bell.
              </p>
            </div>
          </div>

          {/* Existing notifications list */}
          <div style={styles.main}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>All Notifications ({notifications.length})</h3>
            {notifications.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>No notifications yet. Create one on the left.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map(n => (
                  <div key={n._id} style={{
                    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px',
                    background: n.published ? '#f0fdf4' : '#fff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2' }}>{n.topic}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '2px 0' }}>
                          {n.icon} {n.title}
                        </div>
                        {n.desc && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>{n.desc}</div>}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>
                          {n.date} {n.link ? `• ${n.link}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px',
                        background: n.published ? '#dcfce7' : '#f3f4f6',
                        color: n.published ? '#15803d' : '#6b7280', whiteSpace: 'nowrap'
                      }}>
                        {n.published ? '● Published' : '○ Draft'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {n.published ? (
                        <button style={{ ...styles.btn, ...styles.btnSecondary, fontSize: '13px' }}
                          onClick={() => unpublishNotification(n._id)}>Unpublish</button>
                      ) : (
                        <button style={{ ...styles.btn, ...styles.btnPrimary, fontSize: '13px' }}
                          onClick={() => publishNotification(n._id)}>Publish</button>
                      )}
                      <button style={{ ...styles.btn, ...styles.btnSecondary, fontSize: '13px' }}
                        onClick={() => editNotification(n)}>Edit</button>
                      <button style={{ ...styles.btn, fontSize: '13px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                        onClick={() => deleteNotification(n._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div style={styles.grid}>
        {/* Sidebar - Focus List */}
        <div style={styles.sidebar}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
            {activeTab === 'elite' ? 'Elite-Created Focuses' : 'Admin Monthly Focuses'}
          </h3>
          {activeTab === 'admin' && (
            <button
              style={{...styles.btn, ...styles.btnPrimary, width: '100%', marginBottom: '15px'}}
              onClick={() => setShowCreateFocus(true)}
            >
              + Create New Focus
            </button>
          )}

          {visibleFocuses.map(focus => (
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
              {isEliteFocus(focus) && (
                <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>
                  by {focus.createdBy?.displayName || focus.createdBy?.username || 'elite user'}
                </div>
              )}
              <span style={{
                ...styles.badge,
                ...(focus.status === 'active' ? styles.badgeActive :
                    focus.status === 'draft' ? styles.badgeDraft : styles.badgeCompleted)
              }}>
                {focus.status}
              </span>
              <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}>
                {focus.dayCount || 0}/7 days
              </span>
            </div>
          ))}

          {visibleFocuses.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              {activeTab === 'elite' ? 'No elite users have created focuses yet' : 'No focuses created yet'}
            </div>
          )}
        </div>

        {/* Main Content - Selected Focus */}
        <div style={styles.main}>
          {!selectedFocus ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <h2 style={{ marginBottom: '10px' }}>Select or Create a Focus</h2>
              <p>Choose a focus from the sidebar or create a new one</p>
            </div>
          ) : (
            <>
              {/* Focus Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0' }}>{selectedFocus.title}</h2>
                  <p style={{ margin: 0, color: '#6b7280' }}>{selectedFocus.month} • Theme: {selectedFocus.theme}</p>
                  {isEliteFocus(selectedFocus) && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>
                      💎 Elite challenge — created by {selectedFocus.createdBy?.displayName || selectedFocus.createdBy?.username || 'an elite user'}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedFocus.status === 'draft' && (
                    <button 
                      style={{...styles.btn, ...styles.btnSuccess}}
                      onClick={() => activateFocus(selectedFocus._id)}
                    >
                      ✓ Activate
                    </button>
                  )}
                  {selectedFocus.status === 'active' && (
                    <button 
                      style={{...styles.btn, ...styles.btnSecondary}}
                      onClick={() => deactivateFocus(selectedFocus._id)}
                    >
                      Deactivate
                    </button>
                  )}
                  {selectedFocus.status === 'completed' && (
                    <button 
                      style={{...styles.btn, ...styles.btnSuccess}}
                      onClick={() => reactivateFocus(selectedFocus._id)}
                    >
                      🔄 Reactivate
                    </button>
                  )}
                  {selectedFocus.status !== 'active' && (
                    <button 
                      style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                      onClick={() => deleteFocus(selectedFocus._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Days Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>Days (1-7)</h3>
                  <button 
                    style={{...styles.btn, ...styles.btnPrimary}}
                    onClick={openNewDayForm}
                    disabled={focusDays.length >= 7}
                  >
                    + Add Day
                  </button>
                </div>

                {focusDays.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                    <p>No days created yet. Add days 1-7 to build the focus cycle.</p>
                  </div>
                ) : (
                  <div>
                    {[1,2,3,4,5,6,7].map(dayNum => {
                      const day = focusDays.find(d => d.dayNumber === dayNum);
                      const running = day && isDayRunning(day);
                      return (
                        <div key={dayNum} style={{
                          ...styles.dayCard,
                          background: running ? '#ecfdf5' : day ? '#fff' : '#f9fafb',
                          opacity: day ? 1 : 0.5,
                          border: running ? '2px solid #10b981' : '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <strong>Day {dayNum}</strong>
                              {day ? (
                                <>
                                  <span style={{ marginLeft: '10px', color: '#6b7280' }}>
                                    {day.title}
                                  </span>
                                  <span style={{
                                    ...styles.badge,
                                    marginLeft: '10px',
                                    background: day.taskType === 'puzzles' ? '#dbeafe' : 
                                               day.taskType === 'find_mistakes' ? '#fef3c7' : '#dcfce7',
                                    color: day.taskType === 'puzzles' ? '#1e40af' : 
                                           day.taskType === 'find_mistakes' ? '#92400e' : '#166534'
                                  }}>
                                    {day.taskType.replace('_', ' ')}
                                  </span>
                                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6b7280' }}>
                                    {day.timerEnabled ? `⏱️ ${Math.floor(day.timeLimit/60)}min` : 'No timer'}
                                  </span>
                                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#10b981' }}>
                                    {day.xpReward} XP
                                  </span>
                                  {/* Day Status Badge */}
                                  {day.isStarted && (
                                    <span style={{
                                      ...styles.badge,
                                      marginLeft: '10px',
                                      background: running ? '#10b981' : '#6b7280',
                                      color: '#fff'
                                    }}>
                                      {running ? `LIVE - ${formatTimeRemaining(day.endTime)}` : 'ENDED'}
                                    </span>
                                  )}
                                  {!day.isStarted && (
                                    <span style={{
                                      ...styles.badge,
                                      marginLeft: '10px',
                                      background: '#f59e0b',
                                      color: '#fff'
                                    }}>
                                      NOT STARTED
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span style={{ marginLeft: '10px', color: '#9ca3af' }}>Not created</span>
                              )}
                            </div>
                            {day && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {/* Start/Stop/Reset Controls */}
                                {!day.isStarted && (
                                  <button 
                                    style={{...styles.btn, background: '#10b981', color: '#fff', ...styles.btnSmall}}
                                    onClick={() => startDay(dayNum)}
                                  >
                                    ▶️ Start Day
                                  </button>
                                )}
                                {running && (
                                  <button 
                                    style={{...styles.btn, background: '#ef4444', color: '#fff', ...styles.btnSmall}}
                                    onClick={() => stopDay(dayNum)}
                                  >
                                    ⏹️ Stop
                                  </button>
                                )}
                                {day.isStarted && !running && (
                                  <button 
                                    style={{...styles.btn, background: '#f59e0b', color: '#fff', ...styles.btnSmall}}
                                    onClick={() => resetDay(dayNum)}
                                  >
                                    🔄 Reset
                                  </button>
                                )}
                                <button 
                                  style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}}
                                  onClick={() => viewDayResults(dayNum)}
                                >
                                  📊 Results
                                </button>
                                <button 
                                  style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}}
                                  onClick={() => editDay(dayNum)}
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                                  onClick={() => deleteDay(dayNum)}
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                            {!day && (
                              <button 
                                style={{...styles.btn, ...styles.btnPrimary, ...styles.btnSmall}}
                                onClick={() => {
                                  setDayForm({...dayForm, dayNumber: dayNum, title: `Day ${dayNum}`});
                                  setShowDayForm(true);
                                }}
                              >
                                + Create
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Create Focus Modal */}
      {showCreateFocus && (
        <div style={styles.modal} onClick={() => setShowCreateFocus(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Create Monthly Focus</h2>
            
            <label style={styles.label}>Title *</label>
            <input 
              style={styles.input}
              placeholder="e.g., February 2026 Tactics Challenge"
              value={focusForm.title}
              onChange={e => setFocusForm({...focusForm, title: e.target.value})}
            />
            
            <label style={styles.label}>Month *</label>
            <input 
              style={styles.input}
              placeholder="e.g., February 2026"
              value={focusForm.month}
              onChange={e => setFocusForm({...focusForm, month: e.target.value})}
            />
            
            <label style={styles.label}>Theme</label>
            <select 
              style={styles.select}
              value={focusForm.theme}
              onChange={e => setFocusForm({...focusForm, theme: e.target.value})}
            >
              <option value="tactics">Tactics</option>
              <option value="strategy">Strategy</option>
              <option value="endgame">Endgame</option>
              <option value="opening">Opening</option>
              <option value="mixed">Mixed</option>
            </select>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{...styles.btn, ...styles.btnPrimary}} onClick={createFocus}>
                Create Focus
              </button>
              <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => setShowCreateFocus(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Form Modal */}
      {showDayForm && (
        <div style={styles.modal} onClick={() => {setShowDayForm(false); setEditingDay(null);}}>
          <div style={{...styles.modalContent, maxWidth: '900px'}} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>
              {editingDay ? `Edit Day ${editingDay}` : `Create Day ${dayForm.dayNumber}`}
            </h2>

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Day Number</label>
                <select 
                  style={styles.select}
                  value={dayForm.dayNumber}
                  onChange={e => setDayForm({...dayForm, dayNumber: parseInt(e.target.value)})}
                  disabled={editingDay}
                >
                  {[1,2,3,4,5,6,7].map(n => (
                    <option key={n} value={n}>Day {n}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Title</label>
                <input 
                  style={styles.input}
                  placeholder={`Day ${dayForm.dayNumber} title`}
                  value={dayForm.title}
                  onChange={e => setDayForm({...dayForm, title: e.target.value})}
                />
              </div>
            </div>

            <label style={styles.label}>Description (optional)</label>
            <input 
              style={styles.input}
              placeholder="Brief description of this day's task"
              value={dayForm.description}
              onChange={e => setDayForm({...dayForm, description: e.target.value})}
            />

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Task Type *</label>
                <select 
                  style={styles.select}
                  value={dayForm.taskType}
                  onChange={e => setDayForm({...dayForm, taskType: e.target.value})}
                >
                  <option value="puzzles">🧩 Puzzles (FEN + Solution)</option>
                  <option value="find_mistakes">🔍 Find Mistakes (PGN)</option>
                  <option value="tactics_identification">🎯 Tactics Identification</option>
                  <option value="multiple_choice">❓ Multiple Choice (FEN Questions)</option>
                  <option value="pgn_blunder_analysis">📊 PGN Blunder Analysis</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>XP Reward</label>
                <input 
                  style={styles.input}
                  type="number"
                  value={dayForm.xpReward}
                  onChange={e => setDayForm({...dayForm, xpReward: parseInt(e.target.value) || 100})}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Perfect Bonus XP</label>
                <input 
                  style={styles.input}
                  type="number"
                  value={dayForm.perfectBonus}
                  onChange={e => setDayForm({...dayForm, perfectBonus: parseInt(e.target.value) || 50})}
                />
              </div>
            </div>

            {/* Timer Settings */}
            <div style={styles.fieldGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox"
                  checked={dayForm.timerEnabled}
                  onChange={e => setDayForm({...dayForm, timerEnabled: e.target.checked})}
                />
                <strong>Enable Timer</strong>
              </label>
              {dayForm.timerEnabled && (
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>Time Limit (seconds)</label>
                  <input 
                    style={{...styles.input, width: '150px'}}
                    type="number"
                    value={dayForm.timeLimit}
                    onChange={e => setDayForm({...dayForm, timeLimit: parseInt(e.target.value) || 600})}
                  />
                  <span style={{ marginLeft: '10px', color: '#6b7280' }}>
                    = {Math.floor(dayForm.timeLimit / 60)} minutes {dayForm.timeLimit % 60} seconds
                  </span>
                </div>
              )}
            </div>

            {/* Scoring Settings */}
            <div style={styles.fieldGroup}>
              <h4 style={{ margin: '0 0 10px 0' }}>📊 Skill Score Settings</h4>
              <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                Points awarded per correct answer (separate from XP)
              </p>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {dayForm.taskType === 'puzzles' && (
                  <div>
                    <label style={styles.label}>Points per Puzzle</label>
                    <input 
                      style={{...styles.input, width: '100px'}}
                      type="number"
                      value={dayForm.scoring.puzzlePoints}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        scoring: {...dayForm.scoring, puzzlePoints: parseInt(e.target.value) || 10}
                      })}
                    />
                  </div>
                )}
                {dayForm.taskType === 'find_mistakes' && (
                  <>
                    <div>
                      <label style={styles.label}>Best Move Points</label>
                      <input 
                        style={{...styles.input, width: '100px'}}
                        type="number"
                        value={dayForm.scoring.bestMovePoints}
                        onChange={e => setDayForm({
                          ...dayForm, 
                          scoring: {...dayForm.scoring, bestMovePoints: parseInt(e.target.value) || 15}
                        })}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Blunder ID Points</label>
                      <input 
                        style={{...styles.input, width: '100px'}}
                        type="number"
                        value={dayForm.scoring.blunderPoints}
                        onChange={e => setDayForm({
                          ...dayForm, 
                          scoring: {...dayForm.scoring, blunderPoints: parseInt(e.target.value) || 15}
                        })}
                      />
                    </div>
                  </>
                )}
                {dayForm.taskType === 'tactics_identification' && (
                  <div>
                    <label style={styles.label}>Points per Tactic</label>
                    <input 
                      style={{...styles.input, width: '100px'}}
                      type="number"
                      value={dayForm.scoring.tacticsPoints}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        scoring: {...dayForm.scoring, tacticsPoints: parseInt(e.target.value) || 10}
                      })}
                    />
                  </div>
                )}
                {dayForm.taskType === 'multiple_choice' && (
                  <div>
                    <label style={styles.label}>Points per Question</label>
                    <input 
                      style={{...styles.input, width: '100px'}}
                      type="number"
                      value={dayForm.scoring.multipleChoicePoints}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        scoring: {...dayForm.scoring, multipleChoicePoints: parseInt(e.target.value) || 100}
                      })}
                    />
                  </div>
                )}
                {dayForm.taskType === 'pgn_blunder_analysis' && (
                  <div>
                    <label style={styles.label}>Points (Pass/Fail)</label>
                    <input 
                      style={{...styles.input, width: '100px'}}
                      type="number"
                      value={dayForm.scoring.blunderAnalysisPoints}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        scoring: {...dayForm.scoring, blunderAnalysisPoints: parseInt(e.target.value) || 200}
                      })}
                    />
                  </div>
                )}
                <div>
                  <label style={styles.label}>Perfect Multiplier</label>
                  <input 
                    style={{...styles.input, width: '100px'}}
                    type="number"
                    step="0.1"
                    value={dayForm.scoring.perfectMultiplier}
                    onChange={e => setDayForm({
                      ...dayForm, 
                      scoring: {...dayForm.scoring, perfectMultiplier: parseFloat(e.target.value) || 1.5}
                    })}
                  />
                </div>
              </div>
            </div>

            {/* PUZZLES TASK TYPE */}
            {dayForm.taskType === 'puzzles' && (
              <div style={styles.fieldGroup}>
                <h4 style={{ margin: '0 0 15px 0' }}>🧩 Puzzles (Max 20)</h4>

                {/* Engine-judged toggle */}
                <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '12px', marginBottom: '15px' }}>
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
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', marginLeft: '24px' }}>
                      <div>
                        <label style={styles.label}>Tolerance (centipawns)</label>
                        <input style={{ ...styles.input, width: '140px' }} type="number" min="0" max="500"
                          value={dayForm.engineToleranceCp}
                          onChange={e => setDayForm({ ...dayForm, engineToleranceCp: parseInt(e.target.value) || 0 })} />
                        <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Lower = stricter (~50 strict, ~100 lenient)</span>
                      </div>
                      <div>
                        <label style={styles.label}>Engine depth</label>
                        <input style={{ ...styles.input, width: '140px' }} type="number" min="6" max="18"
                          value={dayForm.engineDepth}
                          onChange={e => setDayForm({ ...dayForm, engineDepth: parseInt(e.target.value) || 12 })} />
                        <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Higher = stronger but slower</span>
                      </div>
                    </div>
                  )}
                </div>

                <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                  {dayForm.engineJudged
                    ? 'Enter the FEN and how many moves the user must play. Stockfish judges each move and plays the replies.'
                    : 'Enter FEN position and the solution move (e.g., "Nxf7+" or multi-move "Nxf7+ Rxf7 Qxc3")'}
                </p>

                {dayForm.puzzles.map((puzzle, index) => (
                  <div key={index} style={{ marginBottom: '15px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Puzzle {index + 1}</strong>
                      <button
                        style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                        onClick={() => removePuzzle(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <label style={styles.label}>FEN Position *</label>
                    <input
                      style={styles.input}
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      value={puzzle.fen}
                      onChange={e => updatePuzzle(index, 'fen', e.target.value)}
                    />
                    {dayForm.engineJudged ? (
                      <>
                        <label style={styles.label}>User moves required *</label>
                        <input
                          style={{ ...styles.input, width: '140px' }}
                          type="number" min="1" max="10"
                          value={puzzle.userMoveCount || 1}
                          onChange={e => updatePuzzle(index, 'userMoveCount', parseInt(e.target.value) || 1)}
                        />
                        <label style={styles.label}>Solution line (optional — reference/hint only)</label>
                        <input
                          style={styles.input}
                          placeholder="optional, e.g., Nxf7+ Rxf7 Qxc3"
                          value={puzzle.solution}
                          onChange={e => updatePuzzle(index, 'solution', e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <label style={styles.label}>Solution Move(s) *</label>
                        <input
                          style={styles.input}
                          placeholder="Nxf7+ or Nxf7+ Rxf7 Qxc3"
                          value={puzzle.solution}
                          onChange={e => updatePuzzle(index, 'solution', e.target.value)}
                        />
                      </>
                    )}
                    <label style={styles.label}>Tag / Motif (optional)</label>
                    <input
                      style={styles.input}
                      placeholder='e.g., "Mate in 2", "Hanging piece"'
                      value={puzzle.tag || ''}
                      onChange={e => updatePuzzle(index, 'tag', e.target.value)}
                    />
                  </div>
                ))}
                
                {dayForm.puzzles.length < 20 && (
                  <button style={{...styles.btn, ...styles.btnSecondary}} onClick={addPuzzle}>
                    + Add Puzzle ({dayForm.puzzles.length}/20)
                  </button>
                )}
              </div>
            )}

            {/* FIND MISTAKES TASK TYPE */}
            {dayForm.taskType === 'find_mistakes' && (
              <div style={styles.fieldGroup}>
                <h4 style={{ margin: '0 0 15px 0' }}>🔍 Find Mistakes in Game</h4>
                
                <label style={styles.label}>Game PGN *</label>
                <textarea 
                  style={styles.textarea}
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
                  value={dayForm.findMistakes.pgn}
                  onChange={e => setDayForm({
                    ...dayForm, 
                    findMistakes: {...dayForm.findMistakes, pgn: e.target.value}
                  })}
                />

                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Mode *</label>
                    <select 
                      style={styles.select}
                      value={dayForm.findMistakes.mode}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        findMistakes: {...dayForm.findMistakes, mode: e.target.value}
                      })}
                    >
                      <option value="best_moves">🎯 Find Best Moves</option>
                      <option value="blunders">💥 Find Blunders</option>
                      <option value="both">🎯💥 Both (Best Moves & Blunders)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Side</label>
                    <select 
                      style={styles.select}
                      value={dayForm.findMistakes.side}
                      onChange={e => setDayForm({
                        ...dayForm, 
                        findMistakes: {...dayForm.findMistakes, side: e.target.value}
                      })}
                    >
                      <option value="white">White only</option>
                      <option value="black">Black only</option>
                      <option value="both">Both sides</option>
                    </select>
                  </div>
                </div>

                {/* Best Moves Section */}
                {(dayForm.findMistakes.mode === 'best_moves' || dayForm.findMistakes.mode === 'both') && (
                  <div style={{ marginTop: '15px' }}>
                    <h5 style={{ margin: '0 0 10px 0' }}>🎯 Best Moves to Find</h5>
                    {dayForm.findMistakes.bestMoves.map((bm, index) => (
                      <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end' }}>
                        <div style={{ width: '80px' }}>
                          <label style={styles.label}>Move #</label>
                          <input 
                            style={styles.input}
                            type="number"
                            value={bm.moveNumber}
                            onChange={e => updateBestMove(index, 'moveNumber', parseInt(e.target.value))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>Best Move *</label>
                          <input 
                            style={styles.input}
                            placeholder="Nxf7+"
                            value={bm.move}
                            onChange={e => updateBestMove(index, 'move', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label style={styles.label}>Explanation</label>
                          <input 
                            style={styles.input}
                            placeholder="Wins the queen"
                            value={bm.explanation}
                            onChange={e => updateBestMove(index, 'explanation', e.target.value)}
                          />
                        </div>
                        <button 
                          style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall, marginBottom: '10px'}}
                          onClick={() => removeBestMove(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}} onClick={addBestMove}>
                      + Add Best Move
                    </button>
                  </div>
                )}

                {/* Blunders Section */}
                {(dayForm.findMistakes.mode === 'blunders' || dayForm.findMistakes.mode === 'both') && (
                  <div style={{ marginTop: '15px' }}>
                    <h5 style={{ margin: '0 0 10px 0' }}>💥 Blunders to Find</h5>
                    {dayForm.findMistakes.blunders.map((bl, index) => (
                      <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ width: '80px' }}>
                          <label style={styles.label}>Move #</label>
                          <input 
                            style={styles.input}
                            type="number"
                            value={bl.moveNumber}
                            onChange={e => updateBlunder(index, 'moveNumber', parseInt(e.target.value))}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={styles.label}>Blunder Move *</label>
                          <input 
                            style={styles.input}
                            placeholder="Qxe5??"
                            value={bl.move}
                            onChange={e => updateBlunder(index, 'move', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={styles.label}>Better Move</label>
                          <input 
                            style={styles.input}
                            placeholder="Nf3"
                            value={bl.betterMove}
                            onChange={e => updateBlunder(index, 'betterMove', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 2, minWidth: '200px' }}>
                          <label style={styles.label}>Explanation</label>
                          <input 
                            style={styles.input}
                            placeholder="Loses the queen to Nxe5"
                            value={bl.explanation}
                            onChange={e => updateBlunder(index, 'explanation', e.target.value)}
                          />
                        </div>
                        <button 
                          style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall, marginBottom: '10px'}}
                          onClick={() => removeBlunder(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}} onClick={addBlunder}>
                      + Add Blunder
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TACTICS IDENTIFICATION TASK TYPE */}
            {dayForm.taskType === 'tactics_identification' && (
              <div style={styles.fieldGroup}>
                <h4 style={{ margin: '0 0 15px 0' }}>🎯 Tactics Identification</h4>
                <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                  Enter FEN position and the tactic name (Pin, Fork, Skewer, Discovery, etc.)
                </p>
                
                {dayForm.tacticsItems.map((item, index) => (
                  <div key={index} style={{ marginBottom: '15px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Position {index + 1}</strong>
                      <button 
                        style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                        onClick={() => removeTactics(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <label style={styles.label}>FEN Position *</label>
                    <input 
                      style={styles.input}
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      value={item.fen}
                      onChange={e => updateTactics(index, 'fen', e.target.value)}
                    />
                    <label style={styles.label}>Tactics Name *</label>
                    <input 
                      style={styles.input}
                      placeholder="Fork, Pin, Skewer, Discovery, etc."
                      value={item.tacticsName}
                      onChange={e => updateTactics(index, 'tacticsName', e.target.value)}
                    />
                  </div>
                ))}
                
                <button style={{...styles.btn, ...styles.btnSecondary}} onClick={addTactics}>
                  + Add Position
                </button>
              </div>
            )}

            {/* MULTIPLE CHOICE TASK TYPE */}
            {dayForm.taskType === 'multiple_choice' && (
              <div style={styles.fieldGroup}>
                <h4 style={{ margin: '0 0 15px 0' }}>❓ Multiple Choice Questions</h4>
                <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                  Create FEN positions with questions and customizable answer options (2-6 options per question)
                </p>
                
                {dayForm.multipleChoiceItems.map((item, index) => {
                  const updateItem = (field, value) => {
                    const updated = [...dayForm.multipleChoiceItems];
                    updated[index][field] = value;
                    setDayForm({...dayForm, multipleChoiceItems: updated});
                  };
                  
                  const addOption = () => {
                    if (item.options.length >= 6) return;
                    updateItem('options', [...item.options, '']);
                  };
                  
                  const removeOption = (optIdx) => {
                    if (item.options.length <= 2) return;
                    const newOptions = item.options.filter((_, i) => i !== optIdx);
                    updateItem('options', newOptions);
                  };
                  
                  const updateOption = (optIdx, value) => {
                    const newOptions = [...item.options];
                    newOptions[optIdx] = value;
                    updateItem('options', newOptions);
                  };
                  
                  const removeItem = () => {
                    setDayForm({
                      ...dayForm,
                      multipleChoiceItems: dayForm.multipleChoiceItems.filter((_, i) => i !== index)
                    });
                  };
                  
                  return (
                    <div key={index} style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>Question {index + 1}</strong>
                        <button 
                          style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                          onClick={removeItem}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <label style={styles.label}>FEN Position *</label>
                      <input 
                        style={styles.input}
                        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        value={item.fen}
                        onChange={e => updateItem('fen', e.target.value)}
                      />
                      
                      <label style={styles.label}>Question *</label>
                      <input 
                        style={styles.input}
                        placeholder="What is White's best immediate threat?"
                        value={item.question}
                        onChange={e => updateItem('question', e.target.value)}
                      />
                      
                      <label style={styles.label}>Answer Options * (2-6 options)</label>
                      {item.options.map((option, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                          <input 
                            type="radio"
                            name={`correct_${index}`}
                            checked={item.correctAnswer === option}
                            onChange={() => updateItem('correctAnswer', option)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <input 
                            style={{...styles.input, flex: 1}}
                            placeholder={`Option ${optIdx + 1}`}
                            value={option}
                            onChange={e => updateOption(optIdx, e.target.value)}
                          />
                          {item.options.length > 2 && (
                            <button 
                              style={{...styles.btn, ...styles.btnDanger, ...styles.btnSmall}}
                              onClick={() => removeOption(optIdx)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {item.options.length < 6 && (
                        <button 
                          style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall, marginTop: '5px'}}
                          onClick={addOption}
                        >
                          + Add Option
                        </button>
                      )}
                      
                      <label style={styles.label}>Explanation (optional)</label>
                      <textarea 
                        style={{...styles.textarea, minHeight: '60px'}}
                        placeholder="Explain why this is the correct answer..."
                        value={item.explanation}
                        onChange={e => updateItem('explanation', e.target.value)}
                      />
                    </div>
                  );
                })}
                
                <button 
                  style={{...styles.btn, ...styles.btnSecondary}} 
                  onClick={() => setDayForm({
                    ...dayForm,
                    multipleChoiceItems: [...dayForm.multipleChoiceItems, { fen: '', question: '', options: ['', ''], correctAnswer: '', explanation: '' }]
                  })}
                >
                  + Add Question
                </button>
              </div>
            )}

            {/* PGN BLUNDER ANALYSIS TASK TYPE */}
            {dayForm.taskType === 'pgn_blunder_analysis' && (
              <div style={styles.fieldGroup}>
                <h4 style={{ margin: '0 0 15px 0' }}>📊 PGN Blunder Analysis (User-Submitted Games)</h4>
                <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                  Users will paste their own PGN games and analyze them with Stockfish. Configure the limits below.
                </p>
                
                <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #93c5fd' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e40af' }}>ℹ️ How it works:</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e40af' }}>
                    <li>Users paste PGN from their Lichess/Chess.com games</li>
                    <li>Users select which side they played (White or Black)</li>
                    <li>Users click "Analyze" to run Stockfish analysis</li>
                    <li>Users get points if blunders ≤ your blunder limit</li>
                  </ul>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Blunder Limit * (max allowed)</label>
                    <input 
                      style={styles.input}
                      type="number"
                      min="0"
                      max="20"
                      value={dayForm.blunderTask.blunderLimit}
                      onChange={e => setDayForm({
                        ...dayForm,
                        blunderTask: {...dayForm.blunderTask, blunderLimit: parseInt(e.target.value) || 0}
                      })}
                    />
                    <small style={{ color: '#6b7280', fontSize: '11px' }}>
                      Users get points if their game has ≤ this many blunders
                    </small>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Blunder Threshold (centipawns)</label>
                    <input 
                      style={styles.input}
                      type="number"
                      min="50"
                      max="500"
                      value={dayForm.blunderTask.thresholdCp}
                      onChange={e => setDayForm({
                        ...dayForm,
                        blunderTask: {...dayForm.blunderTask, thresholdCp: parseInt(e.target.value) || 150}
                      })}
                    />
                    <small style={{ color: '#6b7280', fontSize: '11px' }}>
                      Eval drop to count as blunder (150 = 1.5 pawns)
                    </small>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Stockfish Depth</label>
                    <input 
                      style={styles.input}
                      type="number"
                      min="10"
                      max="20"
                      value={dayForm.blunderTask.stockfishDepth}
                      onChange={e => setDayForm({
                        ...dayForm,
                        blunderTask: {...dayForm.blunderTask, stockfishDepth: parseInt(e.target.value) || 15}
                      })}
                    />
                    <small style={{ color: '#6b7280', fontSize: '11px' }}>
                      Higher = more accurate but slower (default: 15)
                    </small>
                  </div>
                </div>
                
                <div style={{ marginTop: '15px', padding: '12px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                  ⚠️ <strong>Note:</strong> Analysis will take 60-120 seconds per game when users submit
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{...styles.btn, ...styles.btnPrimary}} onClick={createOrUpdateDay}>
                {editingDay ? 'Update Day' : 'Create Day'}
              </button>
              <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => {setShowDayForm(false); setEditingDay(null);}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Results Modal */}
      {showDayResults && (
        <div style={styles.modal} onClick={() => setShowDayResults(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>📊 Day {showDayResults} Results</h2>
            
            {dayResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No results yet for this day.
              </div>
            ) : (
              <div>
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <strong>{dayResults.length}</strong> users completed this day
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
                          {result.correct}/{result.total} ({Math.round(result.correct/result.total*100)}%)
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.totalTime ? `${Math.floor(result.totalTime/60)}:${(result.totalTime%60).toString().padStart(2,'0')}` : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#10b981', fontWeight: '500' }}>
                          +{result.xpEarned + (result.bonusXpEarned || 0)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {result.isPerfect ? '⭐' : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}}
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
              style={{...styles.btn, ...styles.btnSecondary, marginTop: '20px'}}
              onClick={() => setShowDayResults(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Solutions Modal */}
      {viewingAnswers && (
        <div style={styles.modal} onClick={() => setViewingAnswers(null)}>
          <div style={{...styles.modalContent, maxWidth: '800px'}} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🧠 Solutions: {viewingAnswers.userId?.displayName || viewingAnswers.userId?.username}</h2>
              <button 
                style={{...styles.btn, ...styles.btnSecondary, ...styles.btnSmall}}
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
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        background: ans.isCorrect ? '#10b981' : '#ef4444',
                        color: '#fff'
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
                          fontWeight: '500', 
                          color: ans.isCorrect ? '#065f46' : '#991b1b',
                          background: '#fff',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {ans.userAnswer || ans.userTag || '(No answer)'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>EXPECTED</div>
                        <div style={{ 
                          fontWeight: '500', 
                          color: '#374151',
                          background: '#fff',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {ans.correctAnswer || ans.correctTag || '(No answer)'}
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
              style={{...styles.btn, ...styles.btnSecondary, width: '100%', marginTop: '20px'}}
              onClick={() => setViewingAnswers(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyFocus;
