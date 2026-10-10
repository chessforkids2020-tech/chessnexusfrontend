import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PieceSelector from './PieceSelector';
import EditableBoard from './EditableBoard';
import FenBar from './FenBar';
import SetupControls from './SetupControls';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user } = useAuth();
  // Per-user key: coaches sign into several student accounts on one browser.
  const lastSaveKey = `posEditorLastSave:${user?.id || user?._id || 'anon'}`;
  const [chess, setChess] = useState(() => {
    try { return new Chess(initialFen, { skipValidation: true }); } catch { return new Chess(START_FEN); }
  });
  const [selectedPiece, setSelectedPiece] = useState(undefined); // undefined = drag-only; null = eraser; string = piece
  // The setter was missing here, so this "state" could never change and the
  // board was permanently White-side-up despite EditableBoard supporting both.
  const [orientation, setOrientation] = useState('white');
  const [boardWidth, setBoardWidth] = useState(440);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const chessRef = useRef(chess);
  chessRef.current = chess;

  // ── Save modal state ──────────────────────────────────────────────
  // One picker: Study → Chapter, each with an inline "➕ New…" option. All of the
  // user's studies are listed (private and public together); the last study and
  // chapter they saved into are preselected.
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSolution, setModalSolution] = useState('');
  const [myStudies, setMyStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState('');   // '' | '__new__' | studyId
  const [selectedChapterId, setSelectedChapterId] = useState(''); // '' | '__new__' | chapterId
  const [newChapterInStudy, setNewChapterInStudy] = useState(''); // name for a brand-new chapter in an existing study
  const [newStudyName, setNewStudyName] = useState('');
  const [newStudyPublic, setNewStudyPublic] = useState(false);
  const [newChapterName, setNewChapterName] = useState('Chapter 1');
  const [nameAvailable, setNameAvailable] = useState(null); // null | true | false
  const [nameChecking, setNameChecking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basics'); // only used for a NEW study
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
    setModalSolution('');
    setSelectedCategory('basics');
    setSelectedStudyId('');
    setSelectedChapterId('');
    setNewChapterInStudy('');
    setNewStudyName('');
    setNewStudyPublic(false);
    setNewChapterName('Chapter 1');
    setNameAvailable(null);
    setModalError('');
    setModalSuccess('');
    setShowSaveModal(true);
  }

  // Pick a sensible chapter for a study: the remembered one if it is still
  // there, else the newest chapter, else "new chapter".
  function defaultChapterFor(study, rememberedChapterId) {
    const chapters = study?.chapters || [];
    if (rememberedChapterId && chapters.some(c => c._id === rememberedChapterId)) return rememberedChapterId;
    return chapters.length ? chapters[chapters.length - 1]._id : '__new__';
  }

  // Load ALL the user's studies whenever the modal opens (previously this only
  // ran on the Public tab, so "choose existing" was always empty on Private),
  // then preselect where they saved last time.
  useEffect(() => {
    if (!showSaveModal) return;
    let cancelled = false;
    (async () => {
      setStudiesLoading(true);
      let list = [];
      try {
        const res = await api.get('/api/user-studies/mine');
        list = res.data || [];
      } catch { list = []; }
      if (cancelled) return;
      setMyStudies(list);
      setStudiesLoading(false);
      let last = null;
      try { last = JSON.parse(localStorage.getItem(lastSaveKey) || 'null'); } catch { last = null; }
      const study = list.find(s => s._id === last?.studyId) || list[0];
      if (!study) { setSelectedStudyId('__new__'); return; }
      setSelectedStudyId(study._id);
      setSelectedChapterId(defaultChapterFor(study, last?.chapterId));
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSaveModal]);

  // Check study name availability, debounced (only for public studies — the
  // public catalogue needs unique names; private ones only per user).
  function handleNewStudyNameChange(val, isPublicStudy = newStudyPublic) {
    setNewStudyName(val);
    setNameAvailable(null);
    clearTimeout(nameCheckTimer.current);
    if (!val.trim() || !isPublicStudy) return;
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


  // Save to public OR private study
  async function handlePublicSave() {
    const isNewStudy = selectedStudyId === '__new__';
    const pickedStudy = myStudies.find(s => s._id === selectedStudyId);
    const isPublicStudy = isNewStudy ? newStudyPublic : !!pickedStudy?.isPublic;
    setModalSaving(true);
    setModalError('');
    try {
      let studyId = selectedStudyId;
      let chapterId = selectedChapterId;

      if (isNewStudy) {
        if (!newStudyName.trim()) { setModalError('Study name is required'); setModalSaving(false); return; }
        if (isPublicStudy && nameAvailable === false) { setModalError('Study name is already taken'); setModalSaving(false); return; }
        // Create study + first chapter
        const studyRes = await api.post('/api/user-studies', {
          name: newStudyName.trim(),
          studyType: selectedCategory || 'basics',
          isPublic: isPublicStudy,
        });
        studyId = studyRes.data._id;
        const chapRes = await api.post(`/api/user-studies/${studyId}/chapters`, { name: newChapterName.trim() || 'Chapter 1' });
        chapterId = chapRes.data.chapter._id;
      } else {
        if (!studyId) { setModalError('Please select a study'); setModalSaving(false); return; }
        if (!chapterId) { setModalError('Please select a chapter'); setModalSaving(false); return; }
        // Add a brand-new chapter to the chosen existing study
        if (chapterId === '__new__') {
          const name = newChapterInStudy.trim() || `Chapter ${(pickedStudy?.chapters?.length || 0) + 1}`;
          const chapRes = await api.post(`/api/user-studies/${studyId}/chapters`, { name });
          chapterId = chapRes.data.chapter._id;
        }
      }

      await api.post(`/api/user-studies/${studyId}/chapters/${chapterId}/puzzles`, {
        fen: chess.fen(),
        title: modalTitle,
        solution: modalSolution,
      });
      try { localStorage.setItem(lastSaveKey, JSON.stringify({ studyId, chapterId })); } catch { /* storage off */ }
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
          <button onClick={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))} title="Flip the board" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: '#e6e8ee', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ⇅ Flip Board
          </button>
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
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>MOVES (optional)</label>
                <input
                  value={modalSolution}
                  onChange={e => setModalSolution(e.target.value)}
                  placeholder="e.g. 1. Nf6+ gxf6 2. Bxf7#"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>
                  Easier: leave this empty, save, then just play the moves on the board — they're saved automatically, sidelines too.
                </div>
              </div>

              {/* Where to save: Study → Chapter, with "new" inline */}
              {studiesLoading ? (
                <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 16 }}>Loading your studies...</div>
              ) : (() => {
                const fieldStyle = { width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' };
                const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
                const labelStyle = { fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 };
                const study = myStudies.find(s => s._id === selectedStudyId);
                const chapters = study?.chapters || [];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>SAVE TO STUDY</label>
                      <select
                        data-testid="save-study"
                        value={selectedStudyId}
                        onChange={e => {
                          const v = e.target.value;
                          setSelectedStudyId(v);
                          setNewChapterInStudy('');
                          setSelectedChapterId(v === '__new__' ? '' : defaultChapterFor(myStudies.find(s => s._id === v)));
                        }}
                        style={fieldStyle}
                      >
                        {myStudies.map(s => (
                          <option key={s._id} value={s._id}>{s.isPublic ? '🌐' : '🔒'} {s.name}</option>
                        ))}
                        <option value="__new__">➕ New study…</option>
                      </select>
                    </div>

                    {selectedStudyId === '__new__' ? (
                      <>
                        <div style={{ position: 'relative' }}>
                          <input
                            data-testid="new-study-name"
                            value={newStudyName}
                            onChange={e => handleNewStudyNameChange(e.target.value)}
                            placeholder="New study name (e.g. My Tactics)"
                            autoFocus
                            style={{ ...inputStyle, ...(nameAvailable === false && newStudyPublic ? { border: '1px solid #ef4444' } : {}) }}
                          />
                          {newStudyPublic && nameChecking && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>checking...</span>}
                          {newStudyPublic && !nameChecking && nameAvailable === true && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#10b981' }}>✓ available</span>}
                          {newStudyPublic && !nameChecking && nameAvailable === false && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#ef4444' }}>✗ taken</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[[false, '🔒 Private', 'Only you'], [true, '🌐 Public', 'Anyone can study it']].map(([pub, label, hint]) => {
                            const on = newStudyPublic === pub;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => { setNewStudyPublic(pub); handleNewStudyNameChange(newStudyName, pub); }}
                                style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${on ? (pub ? '#10b981' : '#6366f1') : 'rgba(255,255,255,0.1)'}`, background: on ? (pub ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)') : 'transparent', color: on ? (pub ? '#34d399' : '#a5b4fc') : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 500 }}
                              >{label}<div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{hint}</div></button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                          Category:
                          {CATEGORIES.map(([cat, label]) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid ${selectedCategory === cat ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, background: selectedCategory === cat ? 'rgba(251,191,36,0.12)' : 'transparent', color: selectedCategory === cat ? '#fbbf24' : '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                            >{label}</button>
                          ))}
                        </div>
                        <div>
                          <label style={labelStyle}>FIRST CHAPTER</label>
                          <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="Chapter 1" style={{ ...inputStyle, border: '1px solid rgba(255,255,255,0.12)' }} />
                        </div>
                      </>
                    ) : study && (
                      <div>
                        <label style={labelStyle}>CHAPTER</label>
                        <select
                          data-testid="save-chapter"
                          value={selectedChapterId}
                          onChange={e => { setSelectedChapterId(e.target.value); if (e.target.value !== '__new__') setNewChapterInStudy(''); }}
                          style={fieldStyle}
                        >
                          {chapters.map(c => <option key={c._id} value={c._id}>{c.name}{c.puzzleCount != null ? ` (${c.puzzleCount})` : ''}</option>)}
                          <option value="__new__">➕ New chapter…</option>
                        </select>
                        {selectedChapterId === '__new__' && (
                          <input
                            value={newChapterInStudy}
                            onChange={e => setNewChapterInStudy(e.target.value)}
                            placeholder={`New chapter name (e.g. Chapter ${chapters.length + 1})`}
                            autoFocus
                            style={{ ...inputStyle, marginTop: 8 }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                    onClick={handlePublicSave}
                    disabled={modalSaving}
                    style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: modalSaving ? 0.7 : 1 }}
                  >{modalSaving ? '⏳ Saving...' : '💾 Save'}</button>
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
