import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Chessboard from '../components/Chessboard';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import EditableBoard from '../components/PositionEditor/EditableBoard';
import PieceSelector from '../components/PositionEditor/PieceSelector';
import SetupControls from '../components/PositionEditor/SetupControls';
import FenBar from '../components/PositionEditor/FenBar';
import { useAnalysisTree } from '../hooks/useAnalysisTree';
import AnalysisMoveTree from '../components/AnalysisMoveTree';
import SolutionText from '../components/SolutionText';

const UserStudyPuzzleView = () => {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [puzzles, setPuzzles] = useState([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);

  // Lichess-style in-memory analysis tree (mainline + variations). The board's
  // position is always the tree's current node; navigating never deletes moves.
  const START_FEN = new Chess().fen();
  const analysis = useAnalysisTree(START_FEN);
  const { current: currentNode } = analysis;
  // A Chess instance for the current node — used for turn/legal-move checks.
  const chess = useMemo(() => new Chess(currentNode.fen), [currentNode.fen]);

  // Right-panel tab: 'solution' (default) | 'moves'
  const [activeTab, setActiveTab] = useState('solution');

  const [studyName, setStudyName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [studyType, setStudyType] = useState('basics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPuzzleList, setShowPuzzleList] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [boardWidth, setBoardWidth] = useState(380);

  // Study owner + create position modal state
  const [studyOwnerId, setStudyOwnerId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editorChess, setEditorChess] = useState(() => new Chess());
  const [editorSelectedPiece, setEditorSelectedPiece] = useState(undefined);
  const [editorOrientation, setEditorOrientation] = useState('white');
  const [posTitle, setPosTitle] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posSolution, setPosSolution] = useState('');
  const [posCreating, setPosCreating] = useState(false);
  const [posError, setPosError] = useState('');

  // Stockfish mode
  const [sfMode, setSfMode] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [sfThinking, setSfThinking] = useState(false);
  const [humanColor, setHumanColor] = useState('white');
  const [sfLevel, setSfLevel] = useState('medium');

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const chessboardRef = useRef(null);

  // Stockfish refs
  const sfWorkerRef = useRef(null);
  const sfReadyRef = useRef(false);
  const sfModeRef = useRef(false);
  const sfThinkingRef = useRef(false);
  const humanColorRef = useRef('white');

  const typeColors = {
    basics:     { color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)', accentColor: 'rgba(16,185,129,0.15)', bgColor: 'rgba(16,185,129,0.2)' },
    positional: { color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', accentColor: 'rgba(99,102,241,0.15)',  bgColor: 'rgba(99,102,241,0.2)'  },
  };

  const currentColor = typeColors[studyType] || typeColors.basics;

  /* ── responsive ─────────────────────────────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w <= 480)       setBoardWidth(Math.min(340, w - 40));
      else if (w <= 768)  setBoardWidth(Math.min(420, w - 60));
      else if (w <= 1024) setBoardWidth(Math.min(460, Math.floor(w * 0.36)));
      else                setBoardWidth(Math.min(560, Math.floor(w * 0.36)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ── fetch ───────────────────────────────────── */
  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const res = await api.get(`/api/user-studies/${id}`);
        const study = res.data;
        setStudyName(study.name);
        setStudyOwnerId(study.userId);
        setStudyType(study.studyType || 'basics');
        const chapter = study.chapters.find(c => c._id?.toString() === chapterId?.toString());
        if (!chapter) { setError('Chapter not found'); setLoading(false); return; }
        setChapterName(chapter.name);
        const list = chapter.puzzles || [];
        setPuzzles(list);
        if (list.length > 0) loadPuzzle(list[0]);

        api.post('/api/study/view', { studyId: id, chapterId }).catch(() => {});
      } catch {
        setError('Failed to load study');
      } finally {
        setLoading(false);
      }
    };
    fetchStudy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chapterId]);

  /* ── puzzle helpers ──────────────────────────── */
  const loadPuzzle = (puzzle) => {
    // Reset SF when switching puzzle
    if (sfModeRef.current) {
      if (sfWorkerRef.current) { sfWorkerRef.current.terminate(); sfWorkerRef.current = null; }
      sfReadyRef.current = false; sfModeRef.current = false; sfThinkingRef.current = false;
      setSfMode(false); setSfReady(false); setSfThinking(false);
    }
    try {
      const c = new Chess(puzzle.fen);
      setBoardOrientation(c.turn() === 'b' ? 'black' : 'white');
      analysis.reset(c.fen());
    } catch {
      setBoardOrientation('white');
      analysis.reset(new Chess().fen());
    }
  };

  const handleMove = (source, target, promo) => {
    // Play into the analysis tree. Same move advances; a different move from a
    // past position branches into a new variation (Lichess behaviour).
    const node = analysis.playMove({ from: source, to: target, promotion: promo || 'q' });
    return !!node;
  };

  const moveBackward = () => {
    analysis.back();
  };

  const moveForward = () => {
    analysis.forward();
  };

  const selectPuzzle = (index) => {
    setCurrentPuzzleIndex(index);
    loadPuzzle(puzzles[index]);
    if (isMobile) setShowPuzzleList(false);
  };

  const resetPosition = () => {
    if (puzzles[currentPuzzleIndex]) {
      loadPuzzle(puzzles[currentPuzzleIndex]);
    }
  };

  // Highlight the move that produced the current position — taken straight from
  // the current tree node (null at the root / start position).
  const lastMove = (currentNode.from && currentNode.to)
    ? { from: currentNode.from, to: currentNode.to }
    : null;

  /* ── Stockfish Mode ───────────────────────────── */
  useEffect(() => { return () => { if (sfWorkerRef.current) sfWorkerRef.current.terminate(); }; }, []);

  const stopSfWorker = () => {
    if (sfWorkerRef.current) { sfWorkerRef.current.terminate(); sfWorkerRef.current = null; }
    sfReadyRef.current = false; sfModeRef.current = false; sfThinkingRef.current = false;
    setSfMode(false); setSfReady(false); setSfThinking(false);
  };

  const toggleSfMode = useCallback(() => {
    if (sfModeRef.current) {
      stopSfWorker();
    } else {
      const hc = boardOrientation;
      humanColorRef.current = hc;
      setHumanColor(hc);
      sfModeRef.current = true;
      setSfMode(true);
      setSfReady(false);
      if (sfWorkerRef.current) sfWorkerRef.current.terminate();
      const w = new Worker('/stockfish.js');
      sfWorkerRef.current = w;
      sfReadyRef.current = false;
      w.onmessage = (e) => {
        if (e.data.includes('uciok')) w.postMessage('isready');
        if (e.data.includes('readyok')) { sfReadyRef.current = true; setSfReady(true); }
      };
      w.onerror = () => { sfModeRef.current = false; sfReadyRef.current = false; setSfMode(false); setSfReady(false); };
      w.postMessage('uci');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardOrientation]);

  useEffect(() => {
    if (!sfMode || !sfReady || sfThinkingRef.current) return;
    if (chess.isGameOver()) return;
    const sfColor = humanColorRef.current === 'white' ? 'b' : 'w';
    if (chess.turn() !== sfColor) return;
    const capturedFen = chess.fen();
    const depth = sfLevel === 'easy' ? 4 : sfLevel === 'hard' ? 16 : 10;
    const timer = setTimeout(() => {
      if (!sfModeRef.current || !sfReadyRef.current || sfThinkingRef.current) return;
      if (chess.fen() !== capturedFen) return;
      const w = sfWorkerRef.current;
      if (!w) return;
      sfThinkingRef.current = true;
      setSfThinking(true);
      let done = false;
      const handler = (e) => {
        if (!e.data.startsWith('bestmove') || done) return;
        done = true;
        w.removeEventListener('message', handler);
        const mv = e.data.split(' ')[1];
        if (mv && mv !== '(none)' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(mv)) {
          const from = mv.slice(0, 2), to = mv.slice(2, 4), promo = mv[4] || 'q';
          // Apply the engine reply into the analysis tree (board follows).
          analysis.playMove({ from, to, promotion: promo });
        }
        sfThinkingRef.current = false;
        setSfThinking(false);
      };
      w.addEventListener('message', handler);
      w.postMessage('stop');
      w.postMessage(`position fen ${capturedFen}`);
      w.postMessage(`go depth ${depth} movetime 400`);
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode.fen, sfReady, sfMode]);
  /* ─────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setShowCreateModal(false); return; }
      // Don't hijack arrows while typing in an input/textarea.
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); analysis.back(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); analysis.forward(); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); analysis.toStart(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── resize ──────────────────────────────────── */
  const handleManualResizeStart = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = x;
    startWidthRef.current = boardWidth;
    document.addEventListener('mousemove', handleManualResizeMove);
    document.addEventListener('mouseup', handleManualResizeEnd);
    document.addEventListener('touchmove', handleManualResizeMove, { passive: false });
    document.addEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'nwse-resize';
  };
  const handleManualResizeMove = (e) => {
    if (!resizingRef.current) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const max = Math.min(800, window.innerWidth - 100);
    setBoardWidth(Math.max(300, Math.min(max, startWidthRef.current + (x - startXRef.current))));
  };
  const handleManualResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleManualResizeMove);
    document.removeEventListener('mouseup', handleManualResizeEnd);
    document.removeEventListener('touchmove', handleManualResizeMove);
    document.removeEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'default';
  };

  /* ── create position modal ───────────────────── */
  const validateEditorPosition = (c) => {
    const board = c.board();
    let wk = 0, bk = 0;
    for (const row of board) for (const sq of row) {
      if (!sq) continue;
      if (sq.type === 'k' && sq.color === 'w') wk++;
      if (sq.type === 'k' && sq.color === 'b') bk++;
    }
    if (wk !== 1) return 'White must have exactly 1 king';
    if (bk !== 1) return 'Black must have exactly 1 king';
    return null;
  };

  const openCreateModal = () => {
    setEditorChess(new Chess());
    setEditorSelectedPiece(undefined);
    setEditorOrientation('white');
    setPosTitle('');
    setPosDesc('');
    setPosSolution('');
    setPosError('');
    setShowCreateModal(true);
  };

  const handleEditorFenChange = (newFen) => {
    try {
      const c = new Chess(newFen, { skipValidation: true });
      setEditorChess(c);
    } catch (e) { /* ignore invalid FEN */ }
  };

  const handleCreatePosition = async () => {
    const validErr = validateEditorPosition(editorChess);
    if (validErr) { setPosError(validErr); return; }
    setPosCreating(true);
    setPosError('');
    try {
      await api.post(`/api/user-studies/${id}/chapters/${chapterId}/puzzles`, {
        fen: editorChess.fen(),
        title: posTitle.trim(),
        description: posDesc.trim(),
        solution: posSolution.trim(),
      });
      const res = await api.get(`/api/user-studies/${id}`);
      const study = res.data;
      const chapter = study.chapters.find(c => c._id?.toString() === chapterId?.toString());
      const list = chapter?.puzzles || [];
      setPuzzles(list);
      if (list.length > 0) {
        const newIdx = list.length - 1;
        setCurrentPuzzleIndex(newIdx);
        loadPuzzle(list[newIdx]);
      }
      setShowCreateModal(false);
    } catch (err) {
      setPosError(err.response?.data?.error || 'Failed to create position. Please try again.');
    } finally {
      setPosCreating(false);
    }
  };

  const handleDeletePosition = async (puzzle, index) => {
    if (!puzzle?._id) return;
    const label = puzzle.title || `Position ${index + 1}`;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/user-studies/${id}/chapters/${chapterId}/puzzles/${puzzle._id}`);
      const res = await api.get(`/api/user-studies/${id}`);
      const study = res.data;
      const chapter = study.chapters.find(c => c._id?.toString() === chapterId?.toString());
      const list = chapter?.puzzles || [];
      setPuzzles(list);
      if (list.length === 0) {
        setCurrentPuzzleIndex(0);
        return;
      }
      // Keep a sensible selection: clamp to the new range, then load that puzzle.
      const newIdx = Math.min(index, list.length - 1);
      setCurrentPuzzleIndex(newIdx);
      loadPuzzle(list[newIdx]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete position.');
    }
  };

  /* ── styles (identical structure to StudyPuzzleView) ── */
  const st = {
    page: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: '#0a0a0a', minHeight: '100vh', padding: '8px 20px 20px 20px', position: 'relative', overflow: 'hidden' },
    bg: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 30% 20%, ${currentColor.bgColor} 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(99,102,241,0.08) 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 },
    grid: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(${currentColor.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${currentColor.accentColor} 1px, transparent 1px)`, backgroundSize: '50px 50px', pointerEvents: 'none', zIndex: 0, opacity: 0.5 },
    container: { maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 },
    header: { textAlign: 'center', marginBottom: 10, position: 'relative' },
    backButton: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', padding: '12px 24px', background: 'rgba(15,15,15,0.6)', backdropFilter: 'blur(20px)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 },
    toggleButton: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', padding: '12px 24px', background: 'rgba(15,15,15,0.6)', backdropFilter: 'blur(20px)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: isMobile ? 'flex' : 'none', alignItems: 'center', gap: 8, zIndex: 2 },
    mainContent: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 0, minHeight: 600 },
    leftPanel: { flex: isMobile ? 'none' : '0 0 300px', display: isMobile && !showPuzzleList ? 'none' : 'flex', flexDirection: 'column', background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, backdropFilter: 'blur(20px)', padding: 16, overflowY: 'auto', maxHeight: isMobile ? 400 : 700, position: isMobile ? 'absolute' : 'static', top: isMobile ? 100 : 'auto', left: isMobile ? 20 : 'auto', right: isMobile ? 20 : 'auto', zIndex: isMobile ? 1000 : 'auto', boxShadow: isMobile ? '0 20px 60px rgba(0,0,0,0.5)' : 'none' },
    tableHeaderRow: { borderBottom: `2px solid ${currentColor.color}40` },
    tableHeader: { padding: '5px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: currentColor.color, letterSpacing: '0.5px', textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.3s' },
    tableRowActive: { background: currentColor.accentColor, boxShadow: `0 4px 12px ${currentColor.accentColor}` },
    tableCell: { padding: '5px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#9ca3af' },
    tableCellName: { padding: '5px 8px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#fff' },
    centerPanel: { flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : '0 0 0 8px', order: isMobile ? -1 : 0 },
    chessboardContainer: { marginBottom: 24, background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, backdropFilter: 'blur(20px)', padding: '0px 10px 10px 10px' },
    controlButtons: { display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
    btn: { padding: '12px 24px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600, transition: 'all 0.3s', background: 'rgba(15,15,15,0.6)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 },
    navBtn: { borderColor: currentColor.color + '40', color: currentColor.color },
    navBtnDisabled: { background: 'rgba(23,23,23,0.8)', borderColor: 'rgba(255,255,255,0.05)', color: '#64748b', cursor: 'not-allowed' },
    resetBtn: { borderColor: '#9ca3af', color: '#9ca3af' },
    solBtn: { background: currentColor.accentColor, borderColor: currentColor.color + '60', color: '#fff' },
    rightPanel: { flex: isMobile ? 'none' : '0 0 350px', width: isMobile ? '100%' : 'auto', background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, backdropFilter: 'blur(20px)', padding: 24, overflowY: 'auto', maxHeight: isMobile ? 'none' : 700, order: isMobile ? 1 : 0 },
    turnIndicator: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 20 },
    movesContainer: { background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 20, minHeight: 180 },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: currentColor.color, marginBottom: 16, letterSpacing: '-0.5px' },
    movesList: { fontFamily: 'monospace', fontSize: 15, lineHeight: '1.8', color: '#fff' },
    moveRow: { marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' },
    solutionContainer: { background: 'rgba(0,0,0,0.4)', border: `1px solid ${currentColor.color}40`, borderRadius: 14, padding: 20, marginBottom: 20 },
    solutionText: { fontFamily: 'monospace', fontSize: 15, lineHeight: '1.8', color: currentColor.color, fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
    descContainer: { background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 },
    descText: { fontSize: 15, lineHeight: 1.6, color: '#94a3b8' },
    mobileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: isMobile && showPuzzleList ? 'block' : 'none' },
    loading: { textAlign: 'center', color: '#94a3b8', fontSize: 18, padding: 60, fontStyle: 'italic', background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, backdropFilter: 'blur(20px)' },
    error: { textAlign: 'center', color: '#ef4444', fontSize: 18, padding: 60, fontWeight: 500, background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, backdropFilter: 'blur(20px)' },
  };

  if (loading) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}><div style={st.loading}>Loading puzzles...</div></div>
    </div>
  );

  /* ── computed (after styles so st is available) ── */
  const currentUserId = authUser?.id || authUser?._id;
  const isCreator = !!currentUserId && !!studyOwnerId && String(studyOwnerId) === String(currentUserId);
  const editorBoardWidth = isMobile ? Math.min(280, window.innerWidth - 40) : 440;
  const editorValidErr = validateEditorPosition(editorChess);

  const createModal = showCreateModal ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.87)', zIndex: 5000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isMobile ? 8 : 24, overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
      <div style={{ background: '#111827', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 20, width: '100%', maxWidth: 980, margin: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#a5b4fc' }}>♟️ Create New Position</div>
          <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 10px', borderRadius: 8, transition: 'color 0.15s' }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24, padding: 24 }}>
          {/* Left: Board + FEN + Quick buttons */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <EditableBoard
              chess={editorChess}
              selectedPiece={editorSelectedPiece}
              onFenChange={handleEditorFenChange}
              orientation={editorOrientation}
              boardWidth={editorBoardWidth}
            />
            <FenBar fen={editorChess.fen()} onFenChange={handleEditorFenChange} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleEditorFenChange('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')} style={{ flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Start</button>
              <button onClick={() => handleEditorFenChange('8/8/8/8/8/8/8/8 w - - 0 1')} style={{ flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Empty</button>
              <button onClick={() => setEditorOrientation(o => o === 'white' ? 'black' : 'white')} style={{ flex: 1, padding: '7px 0', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⇅ Flip</button>
            </div>
          </div>
          {/* Right: Piece selector + Setup controls + Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <PieceSelector selectedPiece={editorSelectedPiece} onSelectPiece={setEditorSelectedPiece} />
            <SetupControls chess={editorChess} onFenChange={handleEditorFenChange} orientation={editorOrientation} onFlipOrientation={() => setEditorOrientation(o => o === 'white' ? 'black' : 'white')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Position Info</div>
              <input
                placeholder="Title (optional)"
                value={posTitle}
                onChange={e => setPosTitle(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="Description (optional)"
                value={posDesc}
                onChange={e => setPosDesc(e.target.value)}
                rows={3}
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <input
                placeholder="Solution moves (e.g. Nh5 Nc3 Nf4)"
                value={posSolution}
                onChange={e => setPosSolution(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14, fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {editorValidErr && <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>⚠️ {editorValidErr}</div>}
            {posError && <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginTop: 4 }}>❌ {posError}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleCreatePosition}
              disabled={!!editorValidErr || posCreating}
              style={{ padding: '10px 28px', background: editorValidErr ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: editorValidErr || posCreating ? 'not-allowed' : 'pointer', opacity: editorValidErr ? 0.6 : 1, transition: 'all 0.2s' }}
            >{posCreating ? '⏳ Creating...' : '✓ Create this position'}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (error) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}>
        <button style={{ ...st.btn, ...st.navBtn, marginBottom: 20 }} onClick={() => navigate(`/public-studies/${id}`)}>← Back to Chapters</button>
        <div style={st.error}>{error}</div>
      </div>
    </div>
  );

  if (puzzles.length === 0 && !isCreator) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}>
        <button style={{ ...st.btn, ...st.navBtn, marginBottom: 20 }} onClick={() => navigate(`/public-studies/${id}`)}>← Back to Chapters</button>
        <div style={st.error}>No puzzles in this chapter yet</div>
      </div>
    </div>
  );

  if (puzzles.length === 0 && isCreator) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}>
        <motion.button
          style={{ ...st.btn, ...st.navBtn, marginBottom: 20 }}
          onClick={() => navigate(`/public-studies/${id}`)}
          whileHover={{ x: -4, background: currentColor.accentColor }}
        >← Back to Chapters</motion.button>
        <div style={{ ...st.error, color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 52 }}>♟️</div>
          <div>This chapter has no positions yet.</div>
          <motion.button
            onClick={openCreateModal}
            style={{ padding: '14px 36px', background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            whileHover={{ scale: 1.05, background: '#6366f1' }}
          >➕ Create First Position</motion.button>
        </div>
      </div>
      {createModal}
    </div>
  );

  if (error || puzzles.length === 0) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}>
        <button style={{ ...st.btn, ...st.navBtn, marginBottom: 20 }} onClick={() => navigate(`/public-studies/${id}`)}>← Back to Chapters</button>
        <div style={st.error}>{error || 'No puzzles in this chapter yet'}</div>
      </div>
    </div>
  );

  const currentPuzzle = puzzles[currentPuzzleIndex];

  return (
    <div style={st.page}>
      <div style={st.bg}/>
      <div style={st.grid}/>
      <div style={st.container}>
        {/* Header */}
        <div style={st.header}>
          <motion.button
            style={st.backButton}
            onClick={() => navigate(`/public-studies/${id}`)}
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
            whileHover={{ x: -4, background: currentColor.accentColor, borderColor: currentColor.color + '40', boxShadow: `0 8px 32px ${currentColor.accentColor}` }}
          >← Back to Chapters</motion.button>

          {isMobile && (
            <motion.button
              style={st.toggleButton}
              onClick={() => setShowPuzzleList(!showPuzzleList)}
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
              whileHover={{ x: 4, background: currentColor.accentColor, borderColor: currentColor.color + '40' }}
            >
              {showPuzzleList ? 'Hide List' : 'Show List'}
            </motion.button>
          )}
        </div>

        <div style={st.mainContent}>
          {/* Mobile overlay */}
          {isMobile && showPuzzleList && <div style={st.mobileOverlay} onClick={() => setShowPuzzleList(false)}/>}

          {/* Left Panel – puzzle list */}
          {(!isMobile || showPuzzleList) && (
            <motion.div style={st.leftPanel} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: currentColor.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14, flexShrink: 0 }}>Positions</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={st.tableHeaderRow}>
                      <th style={st.tableHeader}>#</th>
                      <th style={{ ...st.tableHeader, textAlign: 'left' }}>Title</th>
                      {isCreator && <th style={st.tableHeader} aria-label="Delete"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {puzzles.map((puzzle, i) => (
                      <motion.tr
                        key={puzzle._id}
                        style={{ ...st.tableRow, ...(i === currentPuzzleIndex ? st.tableRowActive : {}) }}
                        onClick={() => selectPuzzle(i)}
                        whileHover={{ backgroundColor: currentColor.accentColor }}
                      >
                        <td style={st.tableCell}>{i + 1}</td>
                        <td style={st.tableCellName}>{puzzle.title || `Position ${i + 1}`}</td>
                        {isCreator && (
                          <td style={{ ...st.tableCell, textAlign: 'center', padding: '4px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePosition(puzzle, i); }}
                              title="Delete position"
                              aria-label="Delete position"
                              style={{
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.35)',
                                borderRadius: 6,
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: 12,
                                lineHeight: 1,
                                padding: '4px 6px',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                            >
                              🗑
                            </button>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isCreator && (
                <div style={{ marginTop: 14, flexShrink: 0 }}>
                  <motion.button
                    onClick={openCreateModal}
                    style={{ width: '100%', padding: '11px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, color: '#a5b4fc', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                    whileHover={{ background: 'rgba(99,102,241,0.25)', scale: 1.02 }}
                  >
                    ➕ Create Position
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* Center Panel – board */}
          <div style={st.centerPanel}>
            <motion.div
              ref={chessboardRef}
              style={{ ...st.chessboardContainer, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            >
              <Chessboard
                position={currentNode.fen}
                onDrop={handleMove}
                boardWidth={boardWidth}
                draggable={true}
                showCoordinates={true}
                coordinateSides={['bottom', 'left']}
                orientation={boardOrientation}
                lastMove={lastMove}
              />
              <div
                onMouseDown={handleManualResizeStart}
                onTouchStart={handleManualResizeStart}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 30px 30px', borderColor: 'transparent transparent #3b82f6 transparent', cursor: 'nwse-resize', zIndex: 100, opacity: 0.8, touchAction: 'none' }}
                title="Drag to resize board"
              />
            </motion.div>


            <div style={st.controlButtons}>
              {(() => {
                const canBack = !!currentNode.parentId;
                const canFwd = currentNode.children.length > 0;
                return (
                  <>
                    <motion.button style={{ ...st.btn, ...(!canBack ? st.navBtnDisabled : st.navBtn) }} onClick={moveBackward} disabled={!canBack} whileHover={canBack ? { scale: 1.05, background: currentColor.accentColor } : {}}>← Back</motion.button>
                    <motion.button style={{ ...st.btn, ...(!canFwd ? st.navBtnDisabled : st.navBtn) }} onClick={moveForward} disabled={!canFwd} whileHover={canFwd ? { scale: 1.05, background: currentColor.accentColor } : {}}>Forward →</motion.button>
                  </>
                );
              })()}
              <motion.button style={{ ...st.btn, ...st.resetBtn }} onClick={resetPosition} whileHover={{ scale: 1.05, background: 'rgba(156,163,175,0.2)' }}>↺ Reset</motion.button>
            </div>
          </div>

          {/* Right Panel – moves + solution + description */}
          <motion.div style={st.rightPanel} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* ── Stockfish Toggle ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sfMode ? '#22c55e' : '#4b5563', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                🤖 {sfMode ? (sfThinking ? 'Thinking…' : sfReady ? 'Stockfish ON' : 'Loading…') : 'vs Computer'}
              </div>
              <button
                onClick={toggleSfMode}
                style={{ padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: sfMode ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: sfMode ? '#ef4444' : '#22c55e', border: `1px solid ${sfMode ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`, transition: 'all 0.2s' }}
              >{sfMode ? '■ Stop' : '▶ Play vs Stockfish'}</button>
            </div>
            {sfMode && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['easy', 'medium', 'hard'].map(lvl => (
                    <button key={lvl} onClick={() => setSfLevel(lvl)} style={{ flex: 1, padding: '4px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: sfLevel === lvl ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.04)', color: sfLevel === lvl ? '#22c55e' : '#6b7280', border: `1px solid ${sfLevel === lvl ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.07)'}` }}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14, textAlign: 'center' }}>
                  You play <span style={{ color: '#a5b4fc' }}>{humanColor}</span> · Stockfish plays <span style={{ color: '#fca5a5' }}>{humanColor === 'white' ? 'black' : 'white'}</span>
                  {sfThinking && <span style={{ marginLeft: 8, color: '#fbbf24' }}>● thinking</span>}
                </div>
              </>
            )}



            {/* Tabs: Solution (default) · Your Moves (analysis tree) */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'solution', label: 'Solution' },
                { id: 'moves', label: 'Your Moves' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    color: activeTab === t.id ? currentColor.color : '#64748b',
                    borderBottom: activeTab === t.id ? `2px solid ${currentColor.color}` : '2px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'solution' && (
              <div style={st.solutionContainer}>
                <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.9, letterSpacing: 0.2 }}>
                  {puzzles[currentPuzzleIndex]?.solution ? (
                    <SolutionText
                      text={puzzles[currentPuzzleIndex].solution}
                      startFen={puzzles[currentPuzzleIndex].fen}
                      accentColor={currentColor.color}
                      onPlayLine={(seq) => { analysis.playLine(seq); setActiveTab('moves'); }}
                    />
                  ) : (
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>No solution provided by creator</span>
                  )}
                </div>
                {puzzles[currentPuzzleIndex]?.solution && (
                  <div style={{ fontSize: 10.5, color: '#475569', marginTop: 10 }}>
                    💡 Click any highlighted move to play that line on the board.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'moves' && (
              <div style={st.movesContainer}>
                {!analysis.hasMoves ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No moves yet. Make a move on the board!</div>
                ) : (
                  <AnalysisMoveTree
                    tree={analysis.tree}
                    currentId={analysis.tree.currentId}
                    accentColor={currentColor.color}
                    onSelect={(id) => analysis.goTo(id)}
                  />
                )}
                <div style={{ fontSize: 10.5, color: '#475569', marginTop: 10 }}>
                  Play different moves to branch into variations. Use ← → to step, ↑ to jump to start. Lines reset when you leave the page.
                </div>
              </div>
            )}

            {/* Description */}
            <div style={st.descContainer}>
              <h3 style={st.sectionTitle}>Description</h3>
              <div style={st.descText}>
                {currentPuzzle?.description || (
                  <span style={{ color: '#64748b', fontStyle: 'italic' }}>No description available. Try to find the best move!</span>
                )}
              </div>
            </div>

            {/* Prev / Next puzzle */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <motion.button
                disabled={currentPuzzleIndex <= 0}
                onClick={() => selectPuzzle(currentPuzzleIndex - 1)}
                style={{ ...st.btn, flex: 1, justifyContent: 'center', ...(currentPuzzleIndex <= 0 ? st.navBtnDisabled : st.navBtn) }}
                whileHover={currentPuzzleIndex > 0 ? { scale: 1.03, background: currentColor.accentColor } : {}}
              >◀ Prev</motion.button>
              <motion.button
                disabled={currentPuzzleIndex >= puzzles.length - 1}
                onClick={() => selectPuzzle(currentPuzzleIndex + 1)}
                style={{ ...st.btn, flex: 1, justifyContent: 'center', ...(currentPuzzleIndex >= puzzles.length - 1 ? st.navBtnDisabled : st.navBtn) }}
                whileHover={currentPuzzleIndex < puzzles.length - 1 ? { scale: 1.03, background: currentColor.accentColor } : {}}
              >Next ▶</motion.button>
            </div>
          </motion.div>
        </div>
      </div>
      {createModal}
    </div>
  );
};

export default UserStudyPuzzleView;
