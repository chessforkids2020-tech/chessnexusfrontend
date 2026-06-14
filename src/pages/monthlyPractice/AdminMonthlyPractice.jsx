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
      perfectMultiplier: 2.0
    },
    // Puzzles
    puzzles: [{ fen: '', solution: '' }],
    // Find Mistakes
    findMistakes: {
      pgn: '',
      mode: 'best_moves',
      side: 'both',
      bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
      blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
    },
    // Tactics ID
    tacticsItems: [{ fen: '', tacticsName: '' }]
  });

  useEffect(() => {
    fetchFocuses();
  }, []);

  const fetchFocuses = async () => {
    try {
      const res = await api.get('/api/admin/monthly-focus');
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
        dayData.puzzles = dayForm.puzzles.filter(p => p.fen && p.solution);
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
          puzzlePoints: 10,
          bestMovePoints: 15,
          blunderPoints: 15,
          tacticsPoints: 10,
          perfectMultiplier: 1.5
        },
        puzzles: day.puzzles?.length ? day.puzzles : [{ fen: '', solution: '' }],
        findMistakes: day.findMistakes || {
          pgn: '',
          mode: 'best_moves',
          side: 'both',
          bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
          blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
        },
        tacticsItems: day.tacticsItems?.length ? day.tacticsItems : [{ fen: '', tacticsName: '' }]
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
        puzzlePoints: 10,
        bestMovePoints: 15,
        blunderPoints: 15,
        tacticsPoints: 10,
        perfectMultiplier: 1.5
      },
      puzzles: [{ fen: '', solution: '' }],
      findMistakes: {
        pgn: '',
        mode: 'best_moves',
        side: 'both',
        bestMoves: [{ moveNumber: 1, move: '', explanation: '' }],
        blunders: [{ moveNumber: 1, move: '', betterMove: '', explanation: '' }]
      },
      tacticsItems: [{ fen: '', tacticsName: '' }]
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
      setDayForm({...dayForm, puzzles: [...dayForm.puzzles, { fen: '', solution: '' }]});
    }
  };

  const removePuzzle = (index) => {
    const newPuzzles = dayForm.puzzles.filter((_, i) => i !== index);
    setDayForm({...dayForm, puzzles: newPuzzles.length ? newPuzzles : [{ fen: '', solution: '' }]});
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

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎯 Monthly Practice Admin</h1>
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

      <div style={styles.grid}>
        {/* Sidebar - Focus List */}
        <div style={styles.sidebar}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Monthly Practices</h3>
          <button 
            style={{...styles.btn, ...styles.btnPrimary, width: '100%', marginBottom: '15px'}}
            onClick={() => setShowCreateFocus(true)}
          >
            + Create New Practice
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
          
          {focuses.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              No focuses created yet
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

      {/* Create Focus Modal */}
      {showCreateFocus && (
        <div style={styles.modal} onClick={() => setShowCreateFocus(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Create Monthly Practice</h2>
            
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
                <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '13px' }}>
                  Enter FEN position and the solution move (e.g., "Nxf7+" or multi-move "Nxf7+ Rxf7 Qxc3")
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
                    <label style={styles.label}>Solution Move(s) *</label>
                    <input 
                      style={styles.input}
                      placeholder="Nxf7+ or Nxf7+ Rxf7 Qxc3"
                      value={puzzle.solution}
                      onChange={e => updatePuzzle(index, 'solution', e.target.value)}
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
    </div>
  );
};

export default AdminMonthlyFocus;
