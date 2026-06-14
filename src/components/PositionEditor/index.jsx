import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PieceSelector from './PieceSelector';
import EditableBoard from './EditableBoard';
import FenBar from './FenBar';
import SetupControls from './SetupControls';
import api from '../../api';

const CATEGORIES = [['basics', '📗 Basics'], ['positional', '📘 Positional']];

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN  = '8/8/8/8/8/8/8/8 w - - 0 1';

function validatePosition(chess) {
  try {
    const board = chess.board();
    let wk = 0, bk = 0;
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.type === 'k' && sq.color === 'w') wk++;
        if (sq.type === 'k' && sq.color === 'b') bk++;
      }
    }
    if (wk !== 1) return 'White must have exactly 1 king';
    if (bk !== 1) return 'Black must have exactly 1 king';
    return null; // valid
  } catch (e) {
    return e.message || 'Invalid position';
  }
}

export default function PositionEditor({ initialFen = START_FEN }) {
  const navigate = useNavigate();
  const [chess, setChess] = useState(() => {
    try { return new Chess(initialFen, { skipValidation: true }); } catch { return new Chess(START_FEN); }
  });
  const [selectedPiece, setSelectedPiece] = useState(undefined); // undefined = drag-only; null = eraser; string = piece
  const [orientation] = useState('white');
  const [boardWidth, setBoardWidth] = useState(440);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const chessRef = useRef(chess);
  chessRef.current = chess;

  // ── Save modal state ──────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTab, setSaveTab] = useState('private'); // 'private' | 'public'
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalSolution, setModalSolution] = useState('');
  // Public study state
  const [myStudies, setMyStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [studyMode, setStudyMode] = useState('pick'); // 'pick' | 'new'
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyType, setNewStudyType] = useState('basics');
  const [newChapterName, setNewChapterName] = useState('Chapter 1');
  const [nameAvailable, setNameAvailable] = useState(null); // null | true | false
  const [nameChecking, setNameChecking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // 'basics' | 'positional'
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const nameCheckTimer = useRef(null);

  const validationError = validatePosition(chess);

  const handleFenChange = useCallback((newFen) => {
    try {
      const c = new Chess(newFen, { skipValidation: true });
      setChess(c);
    } catch {}
  }, []);

  function handleClear() {
    const c = new Chess(EMPTY_FEN, { skipValidation: true });
    setChess(c);
  }

  function handleReset() {
    const c = new Chess(START_FEN);
    setChess(c);
  }

  function handleMirror() {
    const board = chess.board();
    const c = new Chess(EMPTY_FEN, { skipValidation: true });
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 8; col++) {
        const sq = board[r][col];
        if (!sq) continue;
        const file = String.fromCharCode(97 + col);
        const rank = 8 - r;
        const square = file + rank;
        // Flip color
        c.put({ type: sq.type, color: sq.color === 'w' ? 'b' : 'w' }, square);
      }
    }
    // Keep the turn, but swap it
    const fenParts = chess.fen().split(' ');
    const newFenParts = c.fen().split(' ');
    newFenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    newFenParts[2] = '-';
    newFenParts[3] = '-';
    try {
      setChess(new Chess(newFenParts.join(' '), { skipValidation: true }));
    } catch {
      setChess(c);
    }
  }

  async function handleSave() {
    if (validationError) return;
    // Open modal instead of direct save
    setModalTitle(titleInput.trim());
    setModalDesc('');
    setModalSolution('');
    setSaveTab('private');
    setStudyMode('pick');
    setSelectedCategory('');
    setSelectedStudyId('');
    setSelectedChapterId('');
    setNewStudyName('');
    setNewStudyType('basics');
    setNewChapterName('Chapter 1');
    setNameAvailable(null);
    setModalError('');
    setModalSuccess('');
    setShowSaveModal(true);
  }

  // Fetch user's studies when switching to public tab
  async function fetchMyStudies() {
    setStudiesLoading(true);
    try {
      const res = await api.get('/api/user-studies/mine');
      setMyStudies(res.data || []);
    } catch {
      setMyStudies([]);
    } finally {
      setStudiesLoading(false);
    }
  }

  useEffect(() => {
    if (showSaveModal && saveTab === 'public') {
      fetchMyStudies();
    }
  }, [showSaveModal, saveTab]);

  // Check study name availability, debounced (only for public studies)
  function handleNewStudyNameChange(val) {
    setNewStudyName(val);
    setNameAvailable(null);
    clearTimeout(nameCheckTimer.current);
    if (!val.trim() || saveTab !== 'public') return;
    nameCheckTimer.current = setTimeout(async () => {
      setNameChecking(true);
      try {
        const res = await api.get(`/api/user-studies/check-name?name=${encodeURIComponent(val.trim())}`);
        setNameAvailable(res.data.available);
      } catch {
        setNameAvailable(null);
      } finally {
        setNameChecking(false);
      }
    }, 500);
  }

  // Save as private puzzle
  async function handlePrivateSave() {
    setModalSaving(true);
    setModalError('');
    try {
      const res = await api.post('/api/user-puzzles', {
        fen: chess.fen(),
        title: modalTitle,
        description: modalDesc,
        isPublic: false,
      });
      setModalSuccess(`✅ Saved privately! Share code: ${res.data.shareCode}`);
      setSaveMsg(`✅ Saved! Share code: ${res.data.shareCode}`);
      setTitleInput('');
      setTimeout(() => { setShowSaveModal(false); navigate('/my-puzzles'); }, 1200);
    } catch {
      setModalError('❌ Failed to save. Are you logged in?');
    } finally {
      setModalSaving(false);
    }
  }

  // Save to public OR private study
  async function handlePublicSave() {
    const isPublicStudy = saveTab === 'public';
    setModalSaving(true);
    setModalError('');
    try {
      let studyId = selectedStudyId;
      let chapterId = selectedChapterId;

      if (!selectedCategory) { setModalError('Please choose a category (Basics or Positional)'); setModalSaving(false); return; }
      if (studyMode === 'new') {
        if (!newStudyName.trim()) { setModalError('Study name is required'); setModalSaving(false); return; }
        if (nameAvailable === false) { setModalError('Study name is already taken'); setModalSaving(false); return; }
        if (!newChapterName.trim()) { setModalError('Chapter name is required'); setModalSaving(false); return; }
        // Create study + first chapter
        const studyRes = await api.post('/api/user-studies', {
          name: newStudyName.trim(),
          studyType: selectedCategory || 'basics',
          isPublic: isPublicStudy,
        });
        studyId = studyRes.data._id;
        const chapRes = await api.post(`/api/user-studies/${studyId}/chapters`, { name: newChapterName.trim() });
        chapterId = chapRes.data.chapter._id;
      } else {
        if (!studyId) { setModalError('Please select a study'); setModalSaving(false); return; }
        if (!chapterId) { setModalError('Please select a chapter'); setModalSaving(false); return; }
      }

      await api.post(`/api/user-studies/${studyId}/chapters/${chapterId}/puzzles`, {
        fen: chess.fen(),
        title: modalTitle,
        description: modalDesc,
        solution: modalSolution,
      });
      setModalSuccess(isPublicStudy ? '✅ Position added to your public study!' : '✅ Saved to your private study!');
      setSaveMsg(isPublicStudy ? '✅ Saved to public study!' : '✅ Saved to private study!');
      setTitleInput('');
      const studyBasePath = isPublicStudy ? '/public-studies' : '/my-studies';
      setTimeout(() => { setShowSaveModal(false); navigate(`${studyBasePath}/${studyId}/chapter/${chapterId}`); }, 1200);
    } catch (e) {
      setModalError(e.response?.data?.error || '❌ Failed to save to study');
    } finally {
      setModalSaving(false);
    }
  }

  const cardStyle = {
    background: 'rgba(15,15,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    backdropFilter: 'blur(20px)',
    padding: 12,
  };

  const actionBtn = (onClick, label, color, disabled) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '12px 8px',
        background: disabled ? 'rgba(255,255,255,0.04)' : `rgba(${color},0.15)`,
        border: `1px solid rgba(${color},${disabled ? 0.1 : 0.4})`,
        borderRadius: 10,
        color: disabled ? '#4b5563' : `rgb(${color})`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 700,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      color: '#fff',
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: 820,
      margin: '0 auto',
    }}>
      {/* Left: Piece selector + setup controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180, flex: '0 0 190px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            Pieces
          </div>
          <PieceSelector selectedPiece={selectedPiece} onSelectPiece={setSelectedPiece} />
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            Setup
          </div>
          <SetupControls
            chess={chess}
            onFenChange={handleFenChange}
          />
        </div>
      </div>

      {/* Center: Board + FEN bar + action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto', minWidth: 320 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleClear} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            🗑 Clear Board
          </button>
          <button onClick={handleReset} style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ♟ Starting Pos
          </button>
          <button onClick={handleMirror} style={{ padding: '8px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, color: '#fbbf24', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ⇆ Mirror Colors
          </button>
        </div>

        {/* Board */}
        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center', padding: 4 }}>
          <EditableBoard
            chess={chess}
            selectedPiece={selectedPiece}
            onFenChange={handleFenChange}
            orientation={orientation}
            boardWidth={boardWidth}
          />
        </div>

        {/* FEN bar */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>FEN String</div>
          <FenBar fen={chess.fen()} onFenChange={handleFenChange} />
        </div>

        {/* Validation error */}
        {validationError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            padding: '10px 16px',
            color: '#f87171',
            fontSize: 13,
            fontWeight: 500,
          }}>
            ⚠ {validationError} — Fix the position before playing
          </div>
        )}

        {/* Save title */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Save Title (optional)</div>
          <input
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            placeholder="e.g. Sicilian Dragon starting position..."
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#fff',
              padding: '8px 12px',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {actionBtn(handleSave, '💾 Save Position', '16,185,129', !!validationError)}
        </div>

        {saveMsg && (
          <div style={{
            padding: '10px 16px',
            background: saveMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${saveMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 10,
            color: saveMsg.startsWith('✅') ? '#34d399' : '#f87171',
            fontSize: 13,
            fontWeight: 500,
          }}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* ── Save Position Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !modalSaving && setShowSaveModal(false)}
          >
            <motion.div
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>💾 Save Position</div>
                <button onClick={() => setShowSaveModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>

              {/* common fields */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>TITLE (optional)</label>
                <input
                  value={modalTitle}
                  onChange={e => setModalTitle(e.target.value)}
                  placeholder="e.g. Sicilian Dragon – key position"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>DESCRIPTION (optional)</label>
                <textarea
                  value={modalDesc}
                  onChange={e => setModalDesc(e.target.value)}
                  placeholder="What is the key idea here?"
                  rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>SOLUTION MOVES (optional)</label>
                <input
                  value={modalSolution}
                  onChange={e => setModalSolution(e.target.value)}
                  placeholder="e.g. Nf6 Bg5 e6..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Tab chooser */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {[['private', '🔒 Private Puzzle'], ['private-study', '🔒 Private Study'], ['public', '🌐 Public Study']].map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setSaveTab(tab)}
                    style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${saveTab === tab ? (tab === 'public' ? '#10b981' : '#6366f1') : 'rgba(255,255,255,0.1)'}`, background: saveTab === tab ? (tab === 'public' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)') : 'transparent', color: saveTab === tab ? (tab === 'public' ? '#34d399' : '#a5b4fc') : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: saveTab === tab ? 700 : 400 }}
                  >{label}</button>
                ))}
              </div>

              {/* Private tab content */}
              {saveTab === 'private' && (
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                  Saved as a standalone private puzzle to <strong style={{ color: '#a5b4fc' }}>My Positions</strong>. Best for a single position you want to share via link.
                </div>
              )}
              {saveTab === 'private-study' && (
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                  Saved into your <strong style={{ color: '#a5b4fc' }}>Private Study</strong> — organised by chapters. View and play through positions at <strong style={{ color: '#a5b4fc' }}>My Studies</strong>. Only you can see it.
                </div>
              )}

              {/* Study tab content (public OR private-study) */}
              {(saveTab === 'public' || saveTab === 'private-study') && (
                <div>
                  {/* Step 1: Category */}
                  <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 8 }}>CHOOSE CATEGORY <span style={{ color: '#f87171' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    {CATEGORIES.map(([cat, label]) => {
                      const isActive = selectedCategory === cat;
                      const col = cat === 'basics' ? '#10b981' : '#6366f1';
                      return (
                        <button
                          key={cat}
                          onClick={() => { setSelectedCategory(cat); setSelectedStudyId(''); setSelectedChapterId(''); setStudyMode('pick'); }}
                          style={{ flex: 1, padding: '14px 8px', borderRadius: 12, border: `2px solid ${isActive ? col : 'rgba(255,255,255,0.1)'}`, background: isActive ? `rgba(${cat === 'basics' ? '16,185,129' : '99,102,241'},0.15)` : 'rgba(255,255,255,0.03)', color: isActive ? col : '#64748b', cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'all 0.15s' }}
                        >{label}</button>
                      );
                    })}
                  </div>

                  {/* Step 2: Only show after category chosen */}
                  {selectedCategory && (
                    <>
                      {/* Mode toggle */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {[['pick', 'Choose Existing Study'], ['new', 'Create New Study']].map(([m, l]) => (
                          <button key={m} onClick={() => setStudyMode(m)} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${studyMode === m ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, background: studyMode === m ? 'rgba(251,191,36,0.12)' : 'transparent', color: studyMode === m ? '#fbbf24' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: studyMode === m ? 700 : 400 }}>{l}</button>
                        ))}
                      </div>

                      {studyMode === 'pick' && (() => {
                        const filtered = myStudies.filter(s => s.studyType === selectedCategory);
                        return studiesLoading ? (
                          <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 16 }}>Loading your studies...</div>
                        ) : filtered.length === 0 ? (
                          <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '14px 10px' }}>
                            No {selectedCategory} studies yet.{' '}
                            <button onClick={() => setStudyMode('new')} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Create one</button>
                          </div>
                        ) : (
                          <>
                            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>SELECT STUDY</label>
                            <select
                              value={selectedStudyId}
                              onChange={e => { setSelectedStudyId(e.target.value); setSelectedChapterId(''); }}
                              style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, marginBottom: 10 }}
                            >
                              <option value="">-- choose a study --</option>
                              {filtered.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                            {selectedStudyId && (() => {
                              const study = filtered.find(s => s._id === selectedStudyId);
                              const chapters = study?.chapters || [];
                              return chapters.length === 0 ? (
                                <div style={{ fontSize: 13, color: '#64748b' }}>This study has no chapters yet.</div>
                              ) : (
                                <>
                                  <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>SELECT CHAPTER</label>
                                  <select
                                    value={selectedChapterId}
                                    onChange={e => setSelectedChapterId(e.target.value)}
                                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13 }}
                                  >
                                    <option value="">-- choose a chapter --</option>
                                    {chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                  </select>
                                </>
                              );
                            })()}
                          </>
                        );
                      })()}

                      {studyMode === 'new' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>STUDY NAME <span style={{ color: '#f87171' }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                              <input
                                value={newStudyName}
                                onChange={e => handleNewStudyNameChange(e.target.value)}
                                placeholder={selectedCategory === 'basics' ? "e.g. King's Indian Fundamentals" : "e.g. Pawn Structure Mastery"}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${nameAvailable === false ? '#ef4444' : nameAvailable === true ? '#10b981' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                              />
                              {saveTab === 'public' && nameChecking && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>checking...</span>}
                              {saveTab === 'public' && !nameChecking && nameAvailable === true && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#10b981' }}>✓ available</span>}
                              {saveTab === 'public' && !nameChecking && nameAvailable === false && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#ef4444' }}>✗ taken</span>}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>FIRST CHAPTER NAME <span style={{ color: '#f87171' }}>*</span></label>
                            <input
                              value={newChapterName}
                              onChange={e => setNewChapterName(e.target.value)}
                              placeholder="e.g. Introduction"
                              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Errors / success */}
              {modalError && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>{modalError}</div>
              )}
              {modalSuccess && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', fontSize: 13 }}>{modalSuccess}</div>
              )}

              {/* Bottom buttons */}
              {!modalSuccess && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    disabled={modalSaving}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
                  >Cancel</button>
                  <button
                    onClick={saveTab === 'private' ? handlePrivateSave : handlePublicSave}
                    disabled={modalSaving}
                    style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saveTab === 'public' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: modalSaving ? 0.7 : 1 }}
                  >{modalSaving ? '⏳ Saving...' : saveTab === 'public' ? '🌐 Save to Public Study' : saveTab === 'private-study' ? '🔒 Save to Private Study' : '🔒 Save as Private Puzzle'}</button>
                </div>
              )}
              {modalSuccess && (
                <button
                  onClick={() => setShowSaveModal(false)}
                  style={{ width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                >Done ✓</button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
