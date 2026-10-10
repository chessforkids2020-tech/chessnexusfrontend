import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Chessboard from '../components/Chessboard';
import FenCopyBar from '../components/FenCopyBar';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import EditableBoard from '../components/PositionEditor/EditableBoard';
import PieceSelector from '../components/PositionEditor/PieceSelector';
import SetupControls from '../components/PositionEditor/SetupControls';
import FenBar from '../components/PositionEditor/FenBar';
import { useAnalysisTree } from '../hooks/useAnalysisTree';
import StudyMovesCard from '../components/StudyMovesCard';
import SolutionText from '../components/SolutionText';
import { parseSolutionTree, formatSolutionTree } from '../utils/solutionLine';

// `tree` with a node that playMove just created (its state update hasn't landed yet).
const withNode = (tree, node) => {
  if (tree.nodes[node.id]) return tree;
  const parent = tree.nodes[node.parentId];
  return {
    ...tree,
    nodes: { ...tree.nodes, [node.id]: node, [parent.id]: { ...parent, children: [...parent.children, node.id] } },
  };
};

// ── Full-screen board layout budget ────────────────────────────────────────
// These pages render OUTSIDE UserLayout (see App.jsx), so there is no sidebar
// to subtract — the whole viewport belongs to the study. The board is sized by
// arithmetic over these numbers rather than by measuring the DOM, so it is
// correct on the very first paint with no resize flash.
const SHELL_W = 0;             // no persistent sidebar on this route
const PAGE_PAD_X = 16;         // st.page horizontal padding, per side
const PAGE_PAD_TOP = 8;        // st.page padding-top
const PAGE_PAD_BOTTOM = 8;     // st.page padding-bottom
const LEFT_W = 260;            // positions list column
const RIGHT_W = 340;           // analysis / solution column
const COL_GAP = 12;            // gap between the three columns
const BOARD_CARD_CHROME = 20;  // board card's own padding (top 0 + bottom 10 + border)

// Shared look for the inline "annotate this position" editor (creator only).
const metaInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--color-black-a35)',
  border: '1px solid var(--color-white-a13)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 13,
  lineHeight: 1.6,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const metaBtnStyle = (primary, busy) => ({
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 600,
  cursor: busy ? 'default' : 'pointer',
  opacity: busy ? 0.6 : 1,
  border: primary ? 'none' : '1px solid var(--color-white-a13)',
  background: primary ? 'linear-gradient(135deg,var(--color-accent-2),#047857)' : 'var(--color-white-a07)',
  color: primary ? 'var(--color-text)' : 'var(--color-text-muted)',
});

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
  const [posSolution, setPosSolution] = useState('');
  const [posCreating, setPosCreating] = useState(false);
  const [posError, setPosError] = useState('');

  // Comments (creator only): a comment is attached to one move and saved with
  // the moves. commentFor = id of the move being commented on (null = closed).
  // (User studies have no descriptions — admin only.)
  const [commentFor, setCommentFor] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Auto-record (creator only): moves the study's creator plays on the board are
  // saved as this position's moves (mainline + sidelines) — no Record button.
  // Anyone else's moves are only local analysis and are never saved, even in a
  // public study.
  //   recordable — false when the saved text is hand-written prose (then nothing
  //                is overwritten unless the creator explicitly replaces it).
  //   recordedRef — ids of the tree nodes that make up the saved moves; moves
  //                 played while paused / vs Stockfish stay out of it.
  const [recordable, setRecordable] = useState(true);
  const [recOn, setRecOn] = useState(true);
  const [recStatus, setRecStatus] = useState('');   // '' | 'saving' | 'saved' | 'error'
  const creatorRef = useRef(false);
  const recordedRef = useRef(new Set());
  const recPendingRef = useRef(null);               // { puzzleId, text } awaiting save
  const recTimerRef = useRef(null);

  // Stockfish mode
  const [sfMode, setSfMode] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [sfThinking, setSfThinking] = useState(false);
  const [humanColor, setHumanColor] = useState('white');
  const [sfLevel, setSfLevel] = useState('medium');

  // ── Analysis mode (evaluate the CURRENT position; does not play moves) ──
  // Separate from "play vs Stockfish": this runs an infinite search on whatever
  // position is on the board and streams back the top three lines.
  const [anMode, setAnMode] = useState(false);
  // Top-3 engine lines, keyed by MultiPV index: { 1: {cp|mate, san}, 2: …, 3: … }.
  // Keyed rather than an array because Stockfish emits each line separately and
  // out of order, so we overwrite per index and render whatever we have.
  const [anLines, setAnLines] = useState({});
  const [anDepth, setAnDepth] = useState(0);

  const chessboardRef = useRef(null);

  // Stockfish refs
  const sfWorkerRef = useRef(null);
  const sfReadyRef = useRef(false);
  const sfModeRef = useRef(false);
  const sfThinkingRef = useRef(false);
  const humanColorRef = useRef('white');
  // Analysis uses its OWN worker so it never fights the play-vs-Stockfish one for
  // the same engine instance (two `go` commands on one worker cancel each other).
  const anWorkerRef = useRef(null);
  const anModeRef = useRef(false);
  const anFenRef = useRef('');   // FEN the current search is running on (for SAN + POV)
  // With 3 lines on, this Stockfish build crashes ("RuntimeError: unreachable")
  // if a new search starts before the old one has finished stopping. So a new
  // position waits in anPendingFenRef until the engine answers 'bestmove'.
  const anSearchingRef = useRef(false);
  const anPendingFenRef = useRef(null);

  const typeColors = {
    basics:     { color: 'var(--color-success)', gradient: 'linear-gradient(135deg,var(--color-accent-2),var(--color-accent))', accentColor: 'var(--color-success-a12)', bgColor: 'var(--color-success-a20)' },
    positional: { color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,var(--color-accent-2))', accentColor: 'rgba(99,102,241,0.15)',  bgColor: 'rgba(99,102,241,0.2)'  },
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
      else {
        // FULL-SCREEN BOARD (chess.com style).
        //
        // The page no longer scrolls: it is exactly one viewport tall, so the
        // board should take every pixel of height the layout is not already
        // using. Previously the board was capped at 900 and sized from a `top`
        // measured on a scrolling page, which left a wide empty band under the
        // board on tall screens and a small board on short ones.
        //
        // Width budget: the shell sidebar + page gutters + the two side panels.
        // No 1600px container cap any more — on a wide monitor that cap was
        // throwing away centre width for nothing.
        const centre = w - SHELL_W - PAGE_PAD_X * 2 - LEFT_W - RIGHT_W - COL_GAP * 2;
        // Height budget: viewport minus the page's own vertical padding and the
        // board card's padding. Everything else in the centre column (FEN bar,
        // control buttons) scrolls inside that column, so it does not reserve
        // height from the board.
        const byHeight = window.innerHeight - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - BOARD_CARD_CHROME;
        setBoardWidth(Math.max(360, Math.floor(Math.min(centre, byHeight))));
      }
    };
    update();
    // Nothing is measured from the DOM any more — the budget is pure arithmetic
    // over the layout constants — so a single pass plus resize is enough.
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  /* ── fetch ───────────────────────────────────── */
  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const res = await api.get(`/api/user-studies/${id}`);
        const study = res.data;
        setStudyName(study.name);
        setStudyOwnerId(study.userId);
        // Set before loadPuzzle below, which needs it to preload the solution.
        const uid = authUser?.id || authUser?._id;
        creatorRef.current = !!uid && !!study.userId && String(study.userId) === String(uid);
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
  // Save the pending recorded solution now (debounce fired, or we're leaving
  // this position / the page). Updates the list by _id, so it is safe after the
  // creator has already moved on to another position.
  const flushRecSave = () => {
    clearTimeout(recTimerRef.current);
    const pending = recPendingRef.current;
    if (!pending) return;
    recPendingRef.current = null;
    setRecStatus('saving');
    api.patch(`/api/user-studies/${pending.studyId}/chapters/${pending.chapterId}/puzzles/${pending.puzzleId}`, { solution: pending.text })
      .then(() => setRecStatus(recPendingRef.current ? 'saving' : 'saved'))
      .catch(() => setRecStatus('error'));
  };

  // Store `text` as the moves of `puzzle`: shown at once, saved shortly after.
  const recordSolution = (puzzle, text) => {
    if (!puzzle?._id) return;
    setRecordable(true);
    setPuzzles(prev => prev.map(q => (q._id === puzzle._id ? { ...q, solution: text } : q)));
    recPendingRef.current = { studyId: id, chapterId, puzzleId: puzzle._id, text };
    setRecStatus('saving');
    clearTimeout(recTimerRef.current);
    recTimerRef.current = setTimeout(flushRecSave, 700);
  };

  // Save the recorded part of tree `t` as the current position's moves.
  const saveTree = (t) => {
    const keep = recordedRef.current;
    recordSolution(puzzles[currentPuzzleIndex], formatSolutionTree(t, (nid) => keep.has(nid)));
  };

  // Don't lose the last few moves if the creator closes the page mid-debounce.
  useEffect(() => () => flushRecSave(), []);

  const loadPuzzle = (puzzle) => {
    flushRecSave();
    setRecStatus('');
    // Reset SF when switching puzzle
    if (sfModeRef.current) {
      if (sfWorkerRef.current) { sfWorkerRef.current.terminate(); sfWorkerRef.current = null; }
      sfReadyRef.current = false; sfModeRef.current = false; sfThinkingRef.current = false;
      setSfMode(false); setSfReady(false); setSfThinking(false);
    }
    // Saved moves (mainline + sidelines) go into the move tree for everyone, with
    // the board at the start. Prose (null) is shown as notes instead, and is
    // protected from being overwritten.
    const parsed = parseSolutionTree(puzzle.solution, puzzle.fen);
    setRecordable(parsed !== null);
    let t;
    try {
      const c = new Chess(puzzle.fen);
      setBoardOrientation(c.turn() === 'b' ? 'black' : 'white');
      t = analysis.load(c.fen(), parsed);
    } catch {
      setBoardOrientation('white');
      t = analysis.load(new Chess().fen(), null);
    }
    recordedRef.current = new Set(Object.keys(t.nodes));
  };

  const handleMove = (source, target, promo) => {
    // Play into the analysis tree. Same move advances; a different move from a
    // past position branches into a new sideline (Lichess behaviour).
    const before = analysis.tree;
    const node = analysis.playMove({ from: source, to: target, promotion: promo || 'q' });
    // Auto-record — creator only, and never while playing Stockfish. Replaying
    // saved moves changes nothing; a new move is saved together with the line
    // leading to it.
    if (node && creatorRef.current && recOn && recordable && !sfModeRef.current
        && !recordedRef.current.has(node.id)) {
      const t = withNode(before, node);
      for (let n = node; n; n = t.nodes[n.parentId]) recordedRef.current.add(n.id);
      saveTree(t);
    }
    return !!node;
  };

  // ⏭ — follow the current line (first children) to its end.
  const moveToEnd = () => {
    let n = analysis.tree.nodes[analysis.tree.currentId];
    while (n?.children.length) n = analysis.tree.nodes[n.children[0]];
    if (n) analysis.goTo(n.id);
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
    // Close an open comment box — it belongs to the previous position's moves.
    setCommentFor(null);
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

  /* ── Analysis mode ─────────────────────────────
     Evaluates the position currently on the board and streams depth / score /
     principal variation. Read-only: it never plays a move into the tree. */
  useEffect(() => { return () => { if (anWorkerRef.current) anWorkerRef.current.terminate(); }; }, []);

  const stopAnalysis = useCallback(() => {
    if (anWorkerRef.current) { anWorkerRef.current.terminate(); anWorkerRef.current = null; }
    anModeRef.current = false;
    anSearchingRef.current = false;
    anPendingFenRef.current = null;
    setAnMode(false); setAnLines({}); setAnDepth(0);
  }, []);

  // Start a search on `fen` now, or — if one is still running — stop it and
  // start once the engine confirms with 'bestmove' (see anPendingFenRef).
  const startAnSearch = (w, fen) => {
    anFenRef.current = fen;
    anSearchingRef.current = true;
    w.postMessage(`position fen ${fen}`);
    w.postMessage('go depth 20');
  };
  const requestAnSearch = (fen) => {
    const w = anWorkerRef.current;
    if (!w) return;
    if (anSearchingRef.current) {
      const alreadyStopping = anPendingFenRef.current !== null;
      anPendingFenRef.current = fen;
      if (!alreadyStopping) w.postMessage('stop');
    } else {
      startAnSearch(w, fen);
    }
  };

  const toggleAnalysis = useCallback(() => {
    if (anModeRef.current) { stopAnalysis(); return; }
    anModeRef.current = true;
    setAnMode(true);
    setAnLines({}); setAnDepth(0);
    if (anWorkerRef.current) anWorkerRef.current.terminate();
    anSearchingRef.current = false;
    anPendingFenRef.current = null;
    const w = new Worker('/stockfish.js');
    anWorkerRef.current = w;
    w.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (line.startsWith('bestmove')) {
        anSearchingRef.current = false;
        const next = anPendingFenRef.current;
        if (next !== null) { anPendingFenRef.current = null; startAnSearch(w, next); }
        return;
      }
      // Lines still arriving from a search we've asked to stop are for the old
      // position — ignore them.
      if (anPendingFenRef.current !== null) return;
      if (!line.startsWith('info') || !line.includes(' pv ')) return;
      // "info depth 18 multipv 2 ... score cp 34 ... pv e2e4 e7e5 ..."
      const d = /\bdepth (\d+)/.exec(line);
      const k = /\bmultipv (\d+)/.exec(line);
      const cp = /\bscore cp (-?\d+)/.exec(line);
      const mate = /\bscore mate (-?\d+)/.exec(line);
      const pv = /\bpv (.+)$/.exec(line);
      if (d) setAnDepth(Number(d[1]));
      // Engine scores are from the SIDE TO MOVE; flip to White's POV so the number
      // means the same thing regardless of whose turn it is.
      const sideToMove = anFenRef.current.split(' ')[1] === 'b' ? -1 : 1;
      const idx = k ? Number(k[1]) : 1;          // no multipv tag → single line
      const evalObj = mate ? { mate: Number(mate[1]) * sideToMove }
                    : cp   ? { cp: Number(cp[1]) * sideToMove }
                    : null;
      if (!pv) return;
      // Convert the UCI principal variation to SAN for readability.
      try {
        const tmp = new Chess(anFenRef.current);
        const sans = [];
        for (const uci of pv[1].trim().split(/\s+/).slice(0, 8)) {
          const mv = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
          if (!mv) break;
          sans.push(mv.san);
        }
        if (sans.length) {
          setAnLines(prev => ({ ...prev, [idx]: { ...evalObj, san: sans.join(' ') } }));
        }
      } catch { /* malformed pv — keep whatever we already have */ }
    };
    w.onerror = () => stopAnalysis();
    // THREE lines, set once while the engine is idle — before any search. (It
    // used to be sent on 'uciok', after the first search had already started,
    // so it was ignored and the first position only ever showed one line.)
    w.postMessage('uci');
    w.postMessage('setoption name MultiPV value 3');
    w.postMessage('isready');
  }, [stopAnalysis]);

  // Re-run the search whenever the board position changes while analysis is on.
  useEffect(() => {
    if (!anMode || !anWorkerRef.current) return;
    setAnLines({}); setAnDepth(0);
    requestAnSearch(currentNode.fen);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode.fen, anMode]);
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

  /* ── inline annotate (creator only) ───────────────── */
  // Wipe all saved moves and put the board back at the start.
  const clearRecording = () => {
    const p = puzzles[currentPuzzleIndex];
    if (!p) return;
    if (!window.confirm('Delete all moves for this position?')) return;
    const t = analysis.load(p.fen, null);
    recordedRef.current = new Set([t.rootId]);
    recordSolution(p, '');
  };

  // Delete the current move and everything after it (sidelines included).
  const deleteFromHere = () => {
    const nid = analysis.tree.currentId;
    if (nid === analysis.tree.rootId) return;
    if (!window.confirm('Delete this move and everything after it?')) return;
    const wasSaved = recordedRef.current.has(nid);
    const t = analysis.deleteFrom(nid);
    if (!t) return;
    recordedRef.current = new Set([...recordedRef.current].filter((k) => t.nodes[k]));
    if (wasSaved && creatorRef.current && recordable) saveTree(t);
  };

  // The saved text is prose: the creator opts in to replacing it with the
  // moves currently on the board.
  const replaceWithBoardLine = () => {
    const p = puzzles[currentPuzzleIndex];
    if (!p) return;
    if (!window.confirm('Replace the written notes with the moves on the board?')) return;
    recordedRef.current = new Set(Object.keys(analysis.tree.nodes));
    saveTree(analysis.tree);
  };

  // "12. Nf3" / "12… Nf6" for a node — or "the start" for the root.
  const moveLabel = (nid) => {
    const n = analysis.tree.nodes[nid];
    if (!n?.parentId) return 'the start';
    const parts = analysis.tree.nodes[n.parentId].fen.split(' ');
    return `${parseInt(parts[5], 10) || 1}${parts[1] === 'w' ? '.' : '…'} ${n.san}`;
  };

  const startComment = (nid = analysis.tree.currentId) => {
    if (nid !== analysis.tree.currentId) analysis.goTo(nid);
    setCommentFor(nid);
    setCommentText(analysis.tree.nodes[nid]?.comment || '');
  };

  // Save the comment onto its move. Commenting is a deliberate act, so the move
  // (and the line leading to it) is saved too, even if it was played paused.
  const saveComment = () => {
    const nid = commentFor;
    setCommentFor(null);
    const t = analysis.setComment(nid, commentText);
    if (!t) return;
    for (let n = t.nodes[nid]; n; n = t.nodes[n.parentId]) recordedRef.current.add(n.id);
    saveTree(t);
  };

  /* ── styles (identical structure to StudyPuzzleView) ── */
  const st = {
    // FULL-SCREEN: the page is exactly one viewport tall and never scrolls.
    // Each column scrolls inside itself instead, so the board can own the
    // full height without the controls below it pushing the page taller.
    page: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: 'var(--color-bg)', height: isMobile ? 'auto' : '100dvh', minHeight: isMobile ? '100vh' : 0, padding: isMobile ? '8px 20px 20px 20px' : `${PAGE_PAD_TOP}px ${PAGE_PAD_X}px ${PAGE_PAD_BOTTOM}px ${PAGE_PAD_X}px`, position: 'relative', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
    bg: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 30% 20%, ${currentColor.bgColor} 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(99,102,241,0.08) 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 },
    grid: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(${currentColor.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${currentColor.accentColor} 1px, transparent 1px)`, backgroundSize: '50px 50px', pointerEvents: 'none', zIndex: 0, opacity: 0.5 },
    // No 1600px cap on desktop: on a wide monitor that cap threw away centre
    // width and shrank the board for nothing.
    container: { maxWidth: isMobile ? '1600px' : 'none', width: '100%', margin: '0 auto', position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
    // The header holds only absolutely-positioned buttons, so its height is
    // whatever the tallest one is (~45px). Pinning it keeps the row from
    // reserving more than the button needs — the board is height-limited here,
    // so every pixel above it comes straight off the board.
    // On desktop the header collapses to nothing: its only desktop control
    // (Back to Chapters) moves into the left column, so no horizontal band sits
    // above the board stealing height from it. On mobile it still holds the
    // list toggle, so it keeps its row there.
    header: { textAlign: 'center', marginBottom: isMobile ? 6 : 0, position: 'relative', minHeight: isMobile ? 46 : 0, display: isMobile ? 'block' : 'none' },
    backButton: { position: isMobile ? 'absolute' : 'static', left: 0, top: isMobile ? '50%' : 'auto', transform: isMobile ? 'translateY(-50%)' : 'none', width: isMobile ? 'auto' : '100%', justifyContent: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? 0 : 12, flexShrink: 0, padding: isMobile ? '12px 24px' : '9px 14px', background: 'var(--color-surface)', backdropFilter: 'blur(20px)', color: 'var(--color-text)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-xl)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 },
    toggleButton: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', padding: '12px 24px', background: 'var(--color-surface)', backdropFilter: 'blur(20px)', color: 'var(--color-text)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-xl)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: isMobile ? 'flex' : 'none', alignItems: 'center', gap: 8, zIndex: 2 },
    mainContent: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : COL_GAP, minHeight: isMobile ? 600 : 0, flex: 1, alignItems: isMobile ? 'stretch' : 'stretch' },
    leftPanel: { flex: isMobile ? 'none' : `0 0 ${LEFT_W}px`, display: isMobile && !showPuzzleList ? 'none' : 'flex', flexDirection: 'column', background: 'var(--color-surface)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(20px)', padding: 16, overflowY: 'auto', maxHeight: isMobile ? 400 : 'none', height: isMobile ? 'auto' : '100%', minHeight: 0, boxSizing: 'border-box', position: isMobile ? 'absolute' : 'static', top: isMobile ? 100 : 'auto', left: isMobile ? 20 : 'auto', right: isMobile ? 20 : 'auto', zIndex: isMobile ? 1000 : 'auto', boxShadow: isMobile ? '0 20px 60px var(--color-black-a50)' : 'none' },
    tableHeaderRow: { borderBottom: `2px solid ${currentColor.color}40` },
    tableHeader: { padding: '5px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: currentColor.color, letterSpacing: '0.5px', textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid var(--color-white-a04)', cursor: 'pointer', transition: 'all 0.3s' },
    tableRowActive: { background: currentColor.accentColor, boxShadow: `0 4px 12px ${currentColor.accentColor}` },
    tableCell: { padding: '5px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' },
    tableCellName: { padding: '5px 8px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' },
    // justifyContent flex-start (not centre): the board already fills the
    // height, and centring made a tall centre column drift the board down.
    centerPanel: { flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 0, order: isMobile ? -1 : 0, minWidth: 0, minHeight: 0, overflowY: isMobile ? 'visible' : 'auto' },
    chessboardContainer: { marginBottom: isMobile ? 24 : 10, flexShrink: 0, background: 'var(--color-surface)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(20px)', padding: '0px 10px 10px 10px' },
    controlButtons: { display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
    btn: { padding: '12px 24px', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontSize: 15, fontWeight: 600, transition: 'all 0.3s', background: 'var(--color-surface)', backdropFilter: 'blur(10px)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 },
    navBtn: { borderColor: currentColor.color + '40', color: currentColor.color },
    navBtnDisabled: { background: 'rgba(23,23,23,0.8)', borderColor: 'var(--color-white-a04)', color: 'var(--color-text-faint)', cursor: 'not-allowed' },
    resetBtn: { borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' },
    solBtn: { background: currentColor.accentColor, borderColor: currentColor.color + '60', color: 'var(--color-text)' },
    rightPanel: { flex: isMobile ? 'none' : `0 0 ${RIGHT_W}px`, width: isMobile ? '100%' : 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(20px)', padding: isMobile ? 24 : 18, overflowY: 'auto', maxHeight: 'none', height: isMobile ? 'auto' : '100%', minHeight: 0, boxSizing: 'border-box', order: isMobile ? 1 : 0 },
    turnIndicator: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-lg)', marginBottom: 20 },
    movesContainer: { background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20, minHeight: 180 },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: currentColor.color, marginBottom: 16, letterSpacing: '-0.5px' },
    movesList: { fontFamily: 'monospace', fontSize: 15, lineHeight: '1.8', color: 'var(--color-text)' },
    moveRow: { marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' },
    solutionContainer: { background: 'var(--color-black-a35)', border: `1px solid ${currentColor.color}40`, borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 },
    solutionText: { fontFamily: 'monospace', fontSize: 15, lineHeight: '1.8', color: currentColor.color, fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
    descContainer: { background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-lg)', padding: 20 },
    // pre-wrap: an imported Lichess chapter puts one note per LINE ("Nf3: …"),
    // and without this they collapse into a single run-on paragraph.
    descText: { fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' },
    mobileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--color-black-a65)', zIndex: 999, display: isMobile && showPuzzleList ? 'block' : 'none' },
    loading: { textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 18, padding: 60, fontStyle: 'italic', background: 'var(--color-surface)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(20px)' },
    error: { textAlign: 'center', color: 'var(--color-danger)', fontSize: 18, padding: 60, fontWeight: 500, background: 'var(--color-surface)', border: '1px solid var(--color-danger-a20)', borderRadius: 'var(--radius-2xl)', backdropFilter: 'blur(20px)' },
  };

  if (loading) return (
    <div style={st.page}><div style={st.bg}/><div style={st.grid}/>
      <div style={st.container}><div style={st.loading}>Loading puzzles...</div></div>
    </div>
  );

  /* ── computed (after styles so st is available) ── */
  const currentUserId = authUser?.id || authUser?._id;
  const isCreator = !!currentUserId && !!studyOwnerId && String(studyOwnerId) === String(currentUserId);
  creatorRef.current = isCreator;
  const editorBoardWidth = isMobile ? Math.min(280, window.innerWidth - 40) : 440;
  const editorValidErr = validateEditorPosition(editorChess);

  const createModal = showCreateModal ? (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-black-a65)', zIndex: 5000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isMobile ? 8 : 24, overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
      <div style={{ background: '#111827', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 'var(--radius-2xl)', width: '100%', maxWidth: 980, margin: 'auto', boxShadow: '0 24px 64px var(--color-black-a65)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--color-white-a07)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-2)' }}>♟️ Create New Position</div>
          <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 10px', borderRadius: 'var(--radius-md)', transition: 'color 0.15s' }}>✕</button>
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
              <button onClick={() => handleEditorFenChange('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')} style={{ flex: 1, padding: '7px 0', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Start</button>
              <button onClick={() => handleEditorFenChange('8/8/8/8/8/8/8/8 w - - 0 1')} style={{ flex: 1, padding: '7px 0', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Empty</button>
              <button onClick={() => setEditorOrientation(o => o === 'white' ? 'black' : 'white')} style={{ flex: 1, padding: '7px 0', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⇅ Flip</button>
            </div>
          </div>
          {/* Right: Piece selector + Setup controls + Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <PieceSelector selectedPiece={editorSelectedPiece} onSelectPiece={setEditorSelectedPiece} />
            <SetupControls chess={editorChess} onFenChange={handleEditorFenChange} orientation={editorOrientation} onFlipOrientation={() => setEditorOrientation(o => o === 'white' ? 'black' : 'white')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 8, borderBottom: '1px solid var(--color-white-a07)' }}>Position Info</div>
              <input
                placeholder="Title (optional)"
                value={posTitle}
                onChange={e => setPosTitle(e.target.value)}
                style={{ background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <input
                placeholder="Moves (optional — or just play them on the board after creating)"
                value={posSolution}
                onChange={e => setPosSolution(e.target.value)}
                style={{ background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', padding: '10px 14px', fontSize: 14, fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-white-a07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {editorValidErr && <div style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>⚠️ {editorValidErr}</div>}
            {posError && <div style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>❌ {posError}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleCreatePosition}
              disabled={!!editorValidErr || posCreating}
              style={{ padding: '10px 28px', background: editorValidErr ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700, cursor: editorValidErr || posCreating ? 'not-allowed' : 'pointer', opacity: editorValidErr ? 0.6 : 1, transition: 'all 0.2s' }}
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
        <div style={{ ...st.error, color: 'var(--color-accent-2)', borderColor: 'rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 52 }}>♟️</div>
          <div>This chapter has no positions yet.</div>
          <motion.button
            onClick={openCreateModal}
            style={{ padding: '14px 36px', background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
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
          {isMobile && (
            <motion.button
              style={st.backButton}
              onClick={() => navigate(`/public-studies/${id}`)}
              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
              whileHover={{ x: -4, background: currentColor.accentColor, borderColor: currentColor.color + '40', boxShadow: `0 8px 32px ${currentColor.accentColor}` }}
            >← Back to Chapters</motion.button>
          )}

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
              {!isMobile && (
                <button
                  style={{ ...st.backButton, ...st.navBtn }}
                  onClick={() => navigate(`/public-studies/${id}`)}
                >← Back to Chapters</button>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: currentColor.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14, flexShrink: 0 }}>Positions</div>
              {/* The list is the flexible, scrolling part of the column so the
                  Back button and the "Positions" heading stay pinned. */}
              <div style={{ overflowX: 'auto', overflowY: 'auto', flex: isMobile ? 'none' : 1, minHeight: 0 }}>
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
                                background: 'var(--color-danger-a12)',
                                border: '1px solid var(--color-danger-a30)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                fontSize: 12,
                                lineHeight: 1,
                                padding: '4px 6px',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-a20)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-danger-a12)'; }}
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
                    style={{ width: '100%', padding: '11px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
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
                orientation={boardOrientation}
                lastMove={lastMove}
              />
            </motion.div>

            {/* Current position FEN — copy it straight into an analysis board. */}
            <FenCopyBar fen={currentNode.fen} style={{ maxWidth: boardWidth }} />

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
            {/* ── Engine row: Stockfish on/off (evaluates the position, plays
                nothing) + play vs Stockfish, side by side ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                data-testid="sf-analysis-toggle"
                onClick={toggleAnalysis}
                title={anMode ? 'Turn the engine evaluation off' : 'Show the engine evaluation for this position'}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', background: anMode ? 'rgba(56,189,248,0.16)' : 'var(--color-white-a04)', color: anMode ? '#38bdf8' : 'var(--color-text-muted)', border: `1px solid ${anMode ? 'rgba(56,189,248,0.45)' : 'var(--color-white-a10)'}`, transition: 'all 0.2s' }}
              >
                🔍 Stockfish {anMode ? 'On' : 'Off'}
                {anMode && anDepth ? <span style={{ fontWeight: 500, opacity: 0.75 }}> · d{anDepth}</span> : null}
              </button>
              <button
                data-testid="sf-play-toggle"
                onClick={toggleSfMode}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', background: sfMode ? 'var(--color-danger-a12)' : 'rgba(34,197,94,0.12)', color: sfMode ? 'var(--color-danger)' : 'var(--color-success)', border: `1px solid ${sfMode ? 'var(--color-danger-a30)' : 'rgba(34,197,94,0.35)'}`, transition: 'all 0.2s' }}
              >{sfMode ? (sfReady ? '■ Stop vs Stockfish' : 'Loading…') : '🤖 vs Stockfish'}</button>
            </div>
            {anMode && (
              <div data-testid="sf-lines" style={{ marginBottom: 14, padding: '6px 12px 10px', borderRadius: 'var(--radius-md)', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
                {!anLines[1] && (
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--color-text-faint)' }}>Thinking…</div>
                )}
                {/* Top 3 engine lines (no separate headline score). Rendered in
                    MultiPV order: line 1 is the engine's best, 2–3 the next-best. */}
                {[1, 2, 3].map((i) => {
                  const ln = anLines[i];
                  if (!ln) return null;
                  const ev = ln.mate != null
                    ? `M${Math.abs(ln.mate)}`
                    : ln.cp != null ? `${ln.cp > 0 ? '+' : ''}${(ln.cp / 100).toFixed(2)}` : '';
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11.5, lineHeight: 1.5 }}>
                      <span style={{
                        flex: '0 0 auto', minWidth: 46, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: i === 1 ? 'var(--color-accent-2)' : 'var(--color-text-faint)',
                      }}>{ev}</span>
                      <span style={{ color: i === 1 ? 'var(--color-text-muted)' : 'var(--color-text-muted)', wordBreak: 'break-word' }}>{ln.san}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {sfMode && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['easy', 'medium', 'hard'].map(lvl => (
                    <button key={lvl} onClick={() => setSfLevel(lvl)} style={{ flex: 1, padding: '4px 0', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: sfLevel === lvl ? 'rgba(34,197,94,0.18)' : 'var(--color-white-a04)', color: sfLevel === lvl ? 'var(--color-success)' : 'var(--color-text-faint)', border: `1px solid ${sfLevel === lvl ? 'rgba(34,197,94,0.4)' : 'var(--color-white-a07)'}` }}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 14, textAlign: 'center' }}>
                  You play <span style={{ color: 'var(--color-accent-2)' }}>{humanColor}</span> · Stockfish plays <span style={{ color: 'var(--color-danger)' }}>{humanColor === 'white' ? 'black' : 'white'}</span>
                  {sfThinking && <span style={{ marginLeft: 8, color: 'var(--color-warning)' }}>● thinking</span>}
                </div>
              </>
            )}



            {/* Written notes (a saved text that isn't just moves) — moves in it
                stay clickable. The creator can swap it for the board's moves. */}
            {puzzles[currentPuzzleIndex]?.solution && !recordable && (
              <div data-testid="rec-prose" style={{ ...st.descContainer, padding: 14, marginBottom: 12 }}>
                <h3 style={{ ...st.sectionTitle, fontSize: 13, marginBottom: 8 }}>Notes</h3>
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                  <SolutionText
                    text={puzzles[currentPuzzleIndex].solution}
                    startFen={puzzles[currentPuzzleIndex].fen}
                    accentColor={currentColor.color}
                    onPlayLine={(seq) => analysis.playLine(seq)}
                  />
                </div>
                {isCreator && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
                    Because these are written notes, your board moves aren't saved automatically here.
                    <button onClick={replaceWithBoardLine} style={{ display: 'block', marginTop: 6, padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a07)', color: 'var(--color-text-muted)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                      Replace with the moves on the board
                    </button>
                  </div>
                )}
              </div>
            )}

            <StudyMovesCard
                tree={analysis.tree}
                currentId={analysis.tree.currentId}
                accentColor={currentColor.color}
                onSelect={(nid) => analysis.goTo(nid)}
                onComment={isCreator && recordable && !sfMode ? startComment : undefined}
                onFirst={() => analysis.toStart()}
                onPrev={moveBackward}
                onNext={moveForward}
                onLast={moveToEnd}
                emptyText={isCreator && recordable
                  ? 'Play moves on the board — they are saved automatically. Go back and play a different move to add a sideline.'
                  : 'No moves yet — make a move on the board.'}
                headExtra={isCreator && recordable ? (
                  <span data-testid="rec-strip" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 10.5, color: recStatus === 'error' ? 'var(--color-danger)' : 'var(--color-text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sfMode ? 'Not saving vs Stockfish'
                        : !recOn ? 'Not saving'
                        : recStatus === 'saving' ? 'Saving…'
                        : recStatus === 'saved' ? 'Saved ✓'
                        : recStatus === 'error' ? "Couldn't save"
                        : 'Auto-saving'}
                    </span>
                    <button
                      onClick={() => setRecOn(v => !v)}
                      title={recOn ? 'Pause saving your moves' : 'Resume saving your moves'}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 'var(--radius-2xl)', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, background: recOn && !sfMode ? 'var(--color-danger-a12)' : 'var(--color-white-a04)', color: recOn && !sfMode ? 'var(--color-danger)' : 'var(--color-text-faint)', border: `1px solid ${recOn && !sfMode ? 'var(--color-danger-a30)' : 'var(--color-white-a07)'}` }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {recOn && !sfMode ? 'REC' : 'PAUSED'}
                    </button>
                  </span>
                ) : null}
                footExtra={isCreator && recordable ? (
                  analysis.hasMoves && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      {analysis.tree.currentId !== analysis.tree.rootId && (
                        <button onClick={deleteFromHere} style={{ padding: '3px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'transparent', color: 'var(--color-text-faint)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Delete from here
                        </button>
                      )}
                      <button onClick={clearRecording} style={{ padding: '3px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'transparent', color: 'var(--color-text-faint)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Clear all
                      </button>
                    </span>
                  )
                ) : !isCreator ? (
                  <span style={{ fontSize: 10.5, color: 'var(--color-text-faint)', textAlign: 'center' }}>
                    Play your own moves to explore — they aren't saved.
                  </span>
                ) : null}
              />

            {/* Creator-only: comment on the selected move; it shows right after
                that move in the moves card and is saved with the moves. */}
            {isCreator && recordable && currentPuzzle?._id && !sfMode && (
              <div style={{ marginTop: 4 }} data-testid="comment-box">
                {commentFor && analysis.tree.nodes[commentFor] ? (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 6 }}>
                      Comment after <strong style={{ color: 'var(--color-text-muted)' }}>{moveLabel(commentFor)}</strong>
                    </div>
                    <textarea
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveComment(); }}
                      placeholder="e.g. White takes the centre."
                      rows={3}
                      style={metaInputStyle}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={saveComment} style={metaBtnStyle(true, false)}>✓ Save</button>
                      <button onClick={() => setCommentFor(null)} style={metaBtnStyle(false, false)}>Cancel</button>
                    </div>
                  </>
                ) : analysis.tree.currentId === analysis.tree.rootId && !analysis.current?.comment ? (
                  // At the start nothing is selected — commenting here used to
                  // put every comment at the top. Point at the moves instead.
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
                    💬 To add a comment, click a move in the list (or play one) — the comment appears right after that move.
                  </div>
                ) : (
                  <button onClick={() => startComment()} style={metaBtnStyle(false, false)}>
                    💬 {analysis.current?.comment ? 'Edit comment' : 'Comment'} on {moveLabel(analysis.tree.currentId)}
                  </button>
                )}
              </div>
            )}

          </motion.div>
        </div>
      </div>
      {createModal}
    </div>
  );
};

export default UserStudyPuzzleView;
