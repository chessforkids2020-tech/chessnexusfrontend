import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import FenCopyBar from '../../components/FenCopyBar';
import StudyMovesCard from '../../components/StudyMovesCard';
import { useAnalysisTree } from '../../hooks/useAnalysisTree';
import { parseSolutionTree } from '../../utils/solutionLine';

import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { t as tr } from '../../i18n/LanguageContext';

// ── Full-screen board layout budget ────────────────────────────────────────
// This route renders OUTSIDE UserLayout (see App.jsx), so there is no sidebar
// to subtract — the whole viewport belongs to the study. Sized by arithmetic
// over these constants rather than by measuring the DOM, so the board is right
// on the first paint with no resize flash.
const SHELL_W = 0;             // no persistent sidebar on this route
const PAGE_PAD_X = 16;         // page horizontal padding, per side
const PAGE_PAD_TOP = 8;
const PAGE_PAD_BOTTOM = 8;
const LEFT_W = 220;            // positions list column
const RIGHT_W = 340;           // solution / moves column
const COL_GAP = 12;
const BOARD_CARD_CHROME = 20;  // board card padding + border
// The board draws its rank/file labels in a gutter OUTSIDE boardWidth (left and
// bottom). Not budgeting for it pushed the h-file past the card's edge.
const COORD_GUTTER = 30;


const StudyPuzzleView = () => {
  const { studyId, chapterId } = useParams();
  const navigate = useNavigate();
  
  const [puzzles, setPuzzles] = useState([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  // Lichess-style move tree, same as the user study page: the admin's solution
  // is the mainline (extra solutions are sidelines) and every move a user plays
  // is added as a sideline. The board always shows the tree's current node.
  const analysis = useAnalysisTree(new Chess().fen());
  const { current: currentNode } = analysis;
  const chess = useMemo(() => new Chess(currentNode.fen), [currentNode.fen]);
  // A solution that isn't readable as moves (written notes) is shown as text.
  const [solutionNotes, setSolutionNotes] = useState('');
  const [studyTitle, setStudyTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showPuzzleList, setShowPuzzleList] = useState(false);
  const [studyType, setStudyType] = useState('positional');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [boardWidth, setBoardWidth] = useState(380);

  // Stockfish mode
  const [sfMode, setSfMode] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [sfThinking, setSfThinking] = useState(false);
  const [humanColor, setHumanColor] = useState('white');
  const [sfLevel, setSfLevel] = useState('medium');

  // ── Analysis mode (evaluate the CURRENT position; does not play moves) ──
  const [anMode, setAnMode] = useState(false);
  // Top-3 engine lines, keyed by MultiPV index: { 1: {cp|mate, san}, 2: …, 3: … }.
  // Keyed rather than an array because Stockfish emits each line separately and
  // out of order, so we overwrite per index and render whatever we have.
  const [anLines, setAnLines] = useState({});
  const [anDepth, setAnDepth] = useState(0);

  // Resizing refs
  const chessboardRef = useRef(null);

  // Stockfish refs
  const sfWorkerRef = useRef(null);
  const sfReadyRef = useRef(false);
  const sfModeRef = useRef(false);
  const sfThinkingRef = useRef(false);
  const humanColorRef = useRef('white');
  // Analysis uses its OWN worker so it never competes with the play-vs-Stockfish
  // engine (two `go` commands on one worker cancel each other).
  const anWorkerRef = useRef(null);
  const anModeRef = useRef(false);
  const anFenRef = useRef('');   // FEN the current search is running on (SAN + POV)
  // This engine build crashes ("RuntimeError: unreachable") if a new search is
  // started while one with MultiPV 3 is still running. So a new position waits
  // in anPendingFenRef until the engine answers 'bestmove'.
  const anSearchingRef = useRef(false);
  const anPendingFenRef = useRef(null);

  const studyTypeColors = {
    positional: {
      color: 'var(--color-accent)',
      gradient: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      accentColor: 'var(--color-accent-a15)',
      bgColor: 'var(--color-accent-a20)'
    },
    realtime: {
      color: 'var(--color-danger)',
      gradient: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger) 100%)',
      accentColor: 'var(--color-danger-a12)',
      bgColor: 'var(--color-danger-a20)'
    },
    tournament: {
      color: 'var(--color-warning)',
      gradient: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning) 100%)',
      accentColor: 'var(--color-warning-a12)',
      bgColor: 'var(--color-warning-a20)'
    }
  };

  const currentColor = studyTypeColors[studyType] || studyTypeColors.positional;

  useEffect(() => {
    fetchData();
  }, [studyId, chapterId]);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 1024;
      const landscape = window.innerHeight < window.innerWidth && window.innerWidth <= 1024;
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
  }, [boardOrientation]);

  // Responsive board size — proportional to viewport so all screens look consistent
  useEffect(() => {
    const updateBoardSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setBoardWidth(Math.min(340, width - 32));
      } else if (width <= 768) {
        setBoardWidth(Math.min(440, width - 48));
      } else if (width <= 1024) {
        setBoardWidth(Math.min(520, Math.floor(width * 0.40)));
      } else {
        // FULL-SCREEN BOARD (chess.com style).
        //
        // The page is now exactly one viewport tall and does not scroll, so the
        // board takes every pixel of height the layout is not already using.
        // The old version capped the board at 900, subtracted a 170px sidebar
        // that this route does not render, and measured `top` on a scrolling
        // page — all of which shrank the board for no reason.
        const centre = width - SHELL_W - PAGE_PAD_X * 2 - LEFT_W - RIGHT_W - COL_GAP * 2
          - BOARD_CARD_CHROME - COORD_GUTTER;
        const byHeight = window.innerHeight - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - BOARD_CARD_CHROME - COORD_GUTTER;
        setBoardWidth(Math.max(360, Math.floor(Math.min(centre, byHeight))));
      }
    };
    
    updateBoardSize();
    // Nothing is measured from the DOM any more — the budget is pure arithmetic
    // over the layout constants — so one pass plus resize is enough.
    window.addEventListener('resize', updateBoardSize);
    window.addEventListener('orientationchange', updateBoardSize);
    return () => {
      window.removeEventListener('resize', updateBoardSize);
      window.removeEventListener('orientationchange', updateBoardSize);
    };
  }, []);

  const fetchData = async () => {
    try {
      const studyResponse = await api.get('/api/study/all');
      const study = studyResponse.data.find(s => s._id === studyId);
      if (study) {
        setStudyTitle(study.title);
        if (study.title.toLowerCase().includes('positional') || study.studyType === 'realtime') {
          setStudyType('realtime');
        } else if (study.title.toLowerCase().includes('tournament') || study.studyType === 'tournament') {
          setStudyType('tournament');
        } else {
          setStudyType('positional');
        }
      }

      const chaptersResponse = await api.get(`/api/study/${studyId}/chapters`);
      const chapter = chaptersResponse.data.find(c => c._id === chapterId);
      if (chapter) setChapterTitle(chapter.title);

      const puzzlesResponse = await api.get(`/api/study/chapters/${chapterId}/puzzles`);
      
      setPuzzles(puzzlesResponse.data || []);
      if ((puzzlesResponse.data || []).length > 0) {
        loadPuzzle(puzzlesResponse.data[0]);
      }

      api.post('/api/study/view', { studyId, chapterId }).catch(() => {});
    } catch {
      setError(tr('Failed to load puzzles'));
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzle = (puzzle) => {
    // Reset SF mode when switching puzzles
    if (sfModeRef.current) {
      if (sfWorkerRef.current) { sfWorkerRef.current.terminate(); sfWorkerRef.current = null; }
      sfReadyRef.current = false; sfModeRef.current = false; sfThinkingRef.current = false;
      setSfMode(false); setSfReady(false); setSfThinking(false);
    }
    // Every solution the admin wrote goes into the tree: the first is the
    // mainline, the others become sidelines. A solution that is written notes
    // rather than moves is shown as text under the moves card.
    const sols = (puzzle.puzzleSolutions || []).map(x => (x?.pgn || '').trim()).filter(Boolean);
    const kids = [];
    const notes = [];
    for (const pgn of sols) {
      const parsed = parseSolutionTree(pgn, puzzle.puzzleFen);
      if (parsed && parsed.children?.length) kids.push(...parsed.children);
      else notes.push(pgn);
    }
    setSolutionNotes(notes.join('\n\n'));
    try {
      const c = new Chess(puzzle.puzzleFen);
      setBoardOrientation(c.turn() === 'b' ? 'black' : 'white');
      analysis.load(c.fen(), { children: kids });
    } catch {
      setBoardOrientation('white');
      analysis.load(new Chess().fen(), null);
    }
  };

  // Same move advances; a different move from a past position starts a sideline.
  const handleMove = (sourceSquare, targetSquare, promotion) => (
    !!analysis.playMove({ from: sourceSquare, to: targetSquare, promotion: promotion || 'q' })
  );

  const moveBackward = () => analysis.back();
  const moveForward = () => analysis.forward();
  // ⏭ — follow the current line (first children) to its end.
  const moveToEnd = () => {
    let n = analysis.tree.nodes[analysis.tree.currentId];
    while (n?.children.length) n = analysis.tree.nodes[n.children[0]];
    if (n) analysis.goTo(n.id);
  };
  const atStart = currentNode.id === analysis.tree.rootId;
  const atEnd = !currentNode.children.length;
  const lastMove = (currentNode.from && currentNode.to)
    ? { from: currentNode.from, to: currentNode.to } : null;

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

  // ── Stockfish Mode ────────────────────────────────────────────────────────

  // Cleanup SF worker on unmount
  useEffect(() => {
    return () => { if (sfWorkerRef.current) sfWorkerRef.current.terminate(); };
  }, []);

  const stopSfWorker = () => {
    if (sfWorkerRef.current) { sfWorkerRef.current.terminate(); sfWorkerRef.current = null; }
    sfReadyRef.current = false;
    sfModeRef.current = false;
    sfThinkingRef.current = false;
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

  // When sfReady changes or the board position changes: if it's SF's turn, fire
  useEffect(() => {
    if (!sfMode || !sfReady || sfThinkingRef.current) return;
    if (chess.isGameOver()) return;
    const sfColor = humanColorRef.current === 'white' ? 'b' : 'w';
    if (chess.turn() !== sfColor) return;

    const capturedFen = chess.fen();
    const depth = sfLevel === 'easy' ? 4 : sfLevel === 'hard' ? 16 : 10;

    const timer = setTimeout(() => {
      if (!sfModeRef.current || !sfReadyRef.current || sfThinkingRef.current) return;
      if (chess.fen() !== capturedFen) return; // position changed, abort
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
          // The engine's reply goes into the move tree; the board follows.
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

  /* ── Analysis mode ─────────────────────────────
     Evaluates the position on the board and streams depth / score / best line.
     Read-only — it never plays a move. */
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
  // ─────────────────────────────────────────────────────────────────────────

  
  

  const styles = {
    // FULL-SCREEN: exactly one viewport tall, never scrolls. Each column
    // scrolls inside itself so the board can own the full height.
    page: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-bg)',
      height: isMobile ? 'auto' : '100dvh',
      minHeight: isMobile ? '100vh' : 0,
      padding: isMobile ? '8px 20px 20px 20px' : `${PAGE_PAD_TOP}px ${PAGE_PAD_X}px ${PAGE_PAD_BOTTOM}px ${PAGE_PAD_X}px`,
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 30% 20%, var(--color-accent-a15) 0%, transparent 50%),
        radial-gradient(circle at 70% 60%, var(--color-danger-a12) 0%, transparent 50%),
        radial-gradient(circle at 50% 90%, var(--color-accent-2-a12) 0%, transparent 50%)
      `,
      pointerEvents: 'none',
      zIndex: 0,
    },
    gridPattern: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(var(--color-accent-a06) 1px, transparent 1px),
        linear-gradient(90deg, var(--color-accent-a06) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.5,
    },
    // No 1600px cap on desktop: it threw away centre width on wide monitors.
    container: {
      maxWidth: isMobile ? '1600px' : 'none',
      width: '100%',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    // Collapses to nothing on desktop: its Back button moves into the left
    // column so no band above the board steals height from it.
    header: {
      textAlign: 'center',
      marginBottom: isMobile ? '10px' : 0,
      position: 'relative',
      display: isMobile ? 'block' : 'none',
    },
    backButton: {
      position: isMobile ? 'absolute' : 'static',
      left: 0,
      top: isMobile ? '50%' : 'auto',
      transform: isMobile ? 'translateY(-50%)' : 'none',
      width: isMobile ? 'auto' : '100%',
      justifyContent: 'center',
      marginBottom: isMobile ? 0 : '12px',
      flexShrink: 0,
      padding: isMobile ? '12px 24px' : '9px 14px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-xl)',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      textDecoration: 'none',
      zIndex: 2,
    },
    toggleButton: {
      position: 'absolute',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      padding: '12px 24px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-xl)',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 2,
    },
    mainContent: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '0px' : `${COL_GAP}px`,
      minHeight: isMobile ? '600px' : 0,
      flex: 1,
      alignItems: 'stretch',
    },
    leftPanel: {
      flex: isMobile ? 'none' : `0 0 ${LEFT_W}px`,
      display: isMobile && !showPuzzleList ? 'none' : 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      padding: isMobile ? '24px' : '16px',
      overflowY: 'auto',
      maxHeight: isMobile ? '400px' : 'none',
      height: isMobile ? 'auto' : '100%',
      minHeight: 0,
      position: isMobile ? 'absolute' : 'static',
      top: isMobile ? '100px' : 'auto',
      left: isMobile ? '20px' : 'auto',
      right: isMobile ? '20px' : 'auto',
      zIndex: isMobile ? 1000 : 'auto',
      boxShadow: isMobile ? '0 20px 60px var(--color-black-a50)' : 'none',
    },
    puzzleListTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: currentColor.color,
      marginBottom: '20px',
      letterSpacing: '-0.5px',
    },
    // The list is the flexible, scrolling part of the left column so the
    // Back button above it stays pinned.
    puzzleTable: {
      width: '100%',
      overflowX: 'auto',
      overflowY: 'auto',
      marginTop: isMobile ? '16px' : 0,
      flex: isMobile ? 'none' : 1,
      minHeight: 0,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeaderRow: {
      borderBottom: `2px solid ${currentColor.color}40`,
    },
    tableHeader: {
      padding: '12px 8px',
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: '700',
      color: currentColor.color,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    },
    tableRow: {
      borderBottom: '1px solid var(--color-white-a04)',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    tableRowActive: {
      background: currentColor.accentColor,
      boxShadow: `0 4px 12px ${currentColor.accentColor}`,
    },
    tableCell: {
      padding: '12px 8px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--color-text-muted)',
    },
    tableCellName: {
      padding: '12px 8px',
      textAlign: 'left',
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--color-text)',
    },
    centerPanel: {
      flex: isMobile ? 'none' : '1',
      width: isMobile ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 0,
      order: isMobile ? -1 : 0,
      minWidth: 0,
      minHeight: 0,
      overflowY: isMobile ? 'visible' : 'auto',
    },
    chessboardContainer: {
      marginBottom: isMobile ? '24px' : '10px',
      flexShrink: 0,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      padding: '0px 10px 10px 10px',
    },
    controlButtons: {
      display: 'flex',
      gap: '8px',
      marginTop: '20px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    button: {
      padding: '12px 24px',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      color: 'var(--color-text)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    navigationButton: {
      background: 'var(--color-surface)',
      borderColor: currentColor.color + '40',
      color: currentColor.color,
    },
    navigationButtonDisabled: {
      background: 'rgba(23, 23, 23, 0.8)',
      borderColor: 'var(--color-white-a04)',
      color: 'var(--color-text-faint)',
      cursor: 'not-allowed',
    },
    resetButton: {
      borderColor: 'var(--color-text-muted)',
      color: 'var(--color-text-muted)',
    },
    solutionButton: {
      background: currentColor.accentColor,
      borderColor: currentColor.color + '60',
      color: 'var(--color-text)',
    },
    rightPanel: {
      flex: isMobile ? 'none' : `0 0 ${RIGHT_W}px`,
      width: isMobile ? '100%' : 'auto',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      padding: isMobile ? '24px' : '18px',
      overflowY: 'auto',
      maxHeight: 'none',
      height: isMobile ? 'auto' : '100%',
      minHeight: 0,
      boxSizing: 'border-box',
      order: isMobile ? 1 : 0,
    },
    turnIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '20px',
    },
    kingIcon: {
      fontSize: '28px',
      filter: 'drop-shadow(0 4px 8px var(--color-black-a50))',
    },
    turnText: {
      fontSize: '15px',
      fontWeight: '600',
      color: chess.turn() === 'w' ? 'var(--color-text)' : 'var(--color-text-muted)',
    },
    movesContainer: {
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      marginBottom: '20px',
      minHeight: '180px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: currentColor.color,
      marginBottom: '16px',
      letterSpacing: '-0.5px',
    },
    movesList: {
      fontFamily: 'monospace',
      fontSize: '15px',
      lineHeight: '1.8',
      color: 'var(--color-text)',
    },
    moveRow: {
      marginBottom: '8px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    moveNumber: {
      minWidth: '32px',
      fontWeight: '600',
      color: 'var(--color-text-muted)',
    },
    whiteMove: {
      minWidth: '75px',
      color: 'var(--color-text)',
    },
    blackMove: {
      minWidth: '75px',
      color: 'var(--color-text-muted)',
    },
    solutionContainer: {
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      marginBottom: '20px',
    },
    solutionMoves: {
      fontFamily: 'monospace',
      fontSize: '15px',
      lineHeight: '1.8',
      color: currentColor.color,
      fontWeight: '600',
    },
    descriptionContainer: {
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
    },
    descriptionText: {
      fontSize: '15px',
      lineHeight: '1.6',
      color: 'var(--color-text-muted)',
    },
    loading: {
      textAlign: 'center',
      color: 'var(--color-text-muted)',
      fontSize: '18px',
      padding: '60px',
      fontStyle: 'italic',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
    },
    error: {
      textAlign: 'center',
      color: 'var(--color-danger)',
      fontSize: '18px',
      padding: '60px',
      fontWeight: '500',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-danger-a20)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
    },
    mobileOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--color-black-a65)',
      zIndex: 999,
      display: isMobile && showPuzzleList ? 'block' : 'none',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.gridPattern}></div>
        <div style={styles.container}>
          <div style={styles.loading}>{tr("Loading puzzles...")}</div>
        </div>
      </div>
    );
  }

  if (error || puzzles.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.gridPattern}></div>
        <div style={styles.container}>
          <motion.button
            style={styles.backButton}
            onClick={() => navigate(`/study/learn/${studyId}`)}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            whileHover={{ 
              x: -4,
              background: currentColor.accentColor,
              borderColor: `${currentColor.color}40`,
              boxShadow: `0 8px 32px ${currentColor.accentColor}`,
            }}
          >
            <span>←</span> {tr("Back to Chapters")}
          </motion.button>
          <div style={styles.error}>{error || 'No puzzles available for this chapter'}</div>
        </div>
      </div>
    );
  }

  const currentPuzzle = puzzles[currentPuzzleIndex];

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      <div style={styles.gridPattern}></div>
      <div style={styles.container}>
        <div style={styles.header}>
          {isMobile && (
            <motion.button
              style={styles.backButton}
              onClick={() => navigate(`/study/learn/${studyId}`)}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{ 
                x: -4,
                background: currentColor.accentColor,
                borderColor: `${currentColor.color}40`,
                boxShadow: `0 8px 32px ${currentColor.accentColor}`,
              }}
            >
              <span>←</span> {tr("Back to Chapters")}
            </motion.button>
          )}

          {isMobile && (
            <motion.button
              style={styles.toggleButton}
              onClick={() => setShowPuzzleList(!showPuzzleList)}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{ 
                x: 4,
                background: currentColor.accentColor,
                borderColor: `${currentColor.color}40`,
                boxShadow: `0 8px 32px ${currentColor.accentColor}`,
              }}
            >
              {showPuzzleList ? tr('Hide Puzzles') : tr('Show Puzzles')}
            </motion.button>
          )}

        </div>

        <div style={styles.mainContent}>
          {/* Mobile Overlay */}
          {isMobile && showPuzzleList && (
            <div 
              style={styles.mobileOverlay} 
              onClick={() => setShowPuzzleList(false)}
            />
          )}

          {/* Left Panel - Puzzles List */}
          {(!isMobile || showPuzzleList) && (
            <motion.div 
              style={styles.leftPanel}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {!isMobile && (
                <button
                  style={{ ...styles.backButton, ...styles.navigationButton }}
                  onClick={() => navigate(`/study/learn/${studyId}`)}
                >
                  <span>←</span> {tr("Back to Chapters")}
                </button>
              )}
              <div style={styles.puzzleTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>#</th>
                      <th style={{...styles.tableHeader, textAlign: 'left'}}>{tr("Puzzle Name")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {puzzles.map((puzzle, index) => (
                      <motion.tr
                        key={puzzle._id}
                        style={{
                          ...styles.tableRow,
                          ...(index === currentPuzzleIndex ? styles.tableRowActive : {})
                        }}
                        onClick={() => selectPuzzle(index)}
                        whileHover={{ 
                          backgroundColor: currentColor.accentColor,
                        }}
                      >
                        <td style={styles.tableCell}>{index + 1}</td>
                        <td style={styles.tableCellName}>
                          {puzzle.name || tr("Puzzle {v0}", { v0: index + 1 })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Center Panel - Chessboard */}
          <div style={styles.centerPanel}>
            <motion.div 
              ref={chessboardRef}
              style={{
                ...styles.chessboardContainer,
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxWidth: '100%',
                // No negative margin here: Chessboard reserves gutter space only on
                // the sides that render labels (bottom+left), so there is no empty
                // top reservation to pull over — doing so clips the top rank.
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Chessboard
                position={currentNode.fen}
                lastMove={lastMove}
                onDrop={handleMove}
                boardWidth={boardWidth}
                draggable={true}
                orientation={boardOrientation}
              />
            </motion.div>

            {/* Current position FEN — copy it straight into an analysis board. */}
            <FenCopyBar fen={chess.fen()} style={{ maxWidth: boardWidth }} />

            <div style={styles.controlButtons}>
              <motion.button
                style={{
                  ...styles.button,
                  ...styles.navigationButton,
                  ...(atStart ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveBackward}
                disabled={atStart}
                title={tr("Previous move")}
                whileHover={!atStart ? { 
                  scale: 1.05,
                  background: currentColor.accentColor,
                  boxShadow: `0 8px 24px ${currentColor.accentColor}`,
                } : {}}
              >
                <span>←</span> {tr("Back")}
              </motion.button>
              
              <motion.button
                style={{
                  ...styles.button,
                  ...styles.navigationButton,
                  ...(atEnd ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveForward}
                disabled={atEnd}
                title={tr("Next move")}
                whileHover={!atEnd ? { 
                  scale: 1.05,
                  background: currentColor.accentColor,
                  boxShadow: `0 8px 24px ${currentColor.accentColor}`,
                } : {}}
              >
                {tr("Forward")} <span>→</span>
              </motion.button>
              
              <motion.button
                style={{ ...styles.button, ...styles.resetButton }}
                onClick={resetPosition}
                whileHover={{ 
                  scale: 1.05,
                  background: 'rgba(156, 163, 175, 0.2)',
                  boxShadow: '0 8px 24px rgba(156, 163, 175, 0.2)',
                }}
              >
                <span>↺</span> {tr("Reset")}
              </motion.button>
              




              {/* Edit this position in the board editor */}
              <motion.button
                style={{ ...styles.button, ...styles.resetButton, background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-accent-2)' }}
                onClick={() => navigate('/create-position', { state: { customFen: puzzles[currentPuzzleIndex]?.puzzleFen } })}
                title={tr("Open this position in the board editor")}
                whileHover={{ scale: 1.05, background: 'rgba(99,102,241,0.2)', boxShadow: '0 8px 24px rgba(99,102,241,0.15)' }}
              >
                {tr("🔧 Edit Position")}
              </motion.button>
            </div>
          </div>

          {/* Right Panel - Moves & Description */}
          <motion.div 
            style={styles.rightPanel}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* ── Engine row: Stockfish on/off (evaluates the position, plays
                nothing) + play vs Stockfish, side by side ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                data-testid="sf-analysis-toggle"
                onClick={toggleAnalysis}
                title={anMode ? tr('Turn the engine evaluation off') : tr('Show the engine evaluation for this position')}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', background: anMode ? 'rgba(56,189,248,0.16)' : 'var(--color-white-a04)', color: anMode ? '#38bdf8' : 'var(--color-text-muted)', border: `1px solid ${anMode ? 'rgba(56,189,248,0.45)' : 'var(--color-white-a10)'}`, transition: 'all 0.2s' }}
              >
                {tr("🔍 Stockfish")} {anMode ? tr('On') : tr('Off')}
                {anMode && anDepth ? <span style={{ fontWeight: 500, opacity: 0.75 }}> · d{anDepth}</span> : null}
              </button>
              <button
                data-testid="sf-play-toggle"
                onClick={toggleSfMode}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', background: sfMode ? 'var(--color-danger-a12)' : 'rgba(34,197,94,0.12)', color: sfMode ? 'var(--color-danger)' : 'var(--color-success)', border: `1px solid ${sfMode ? 'var(--color-danger-a30)' : 'rgba(34,197,94,0.35)'}`, transition: 'all 0.2s' }}
              >{sfMode ? (sfReady ? tr('■ Stop vs Stockfish') : tr('Loading…')) : tr('🤖 vs Stockfish')}</button>
            </div>
            {anMode && (
              <div data-testid="sf-lines" style={{ marginBottom: 14, padding: '6px 12px 10px', borderRadius: 'var(--radius-md)', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
                {!anLines[1] && (
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--color-text-faint)' }}>{tr("Thinking…")}</div>
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
                  {tr("You play")} <span style={{ color: 'var(--color-accent-2)' }}>{humanColor}</span> {tr("· Stockfish plays")} <span style={{ color: 'var(--color-danger)' }}>{humanColor === 'white' ? 'black' : 'white'}</span>
                  {sfThinking && <span style={{ marginLeft: 8, color: 'var(--color-warning)' }}>{tr("● thinking")}</span>}
                </div>
              </>
            )}

            {/* Turn Indicator */}
            <div style={styles.turnIndicator}>
              <div style={styles.kingIcon}>
                {chess.turn() === 'w' ? '♔' : '♚'}
              </div>
              <div style={styles.turnText}>
                {chess.turn() === 'w' ? 'White to move' : 'Black to move'}
              </div>
            </div>

            {/* One moves card (like the user study page): the admin's solution is
                the mainline, extra solutions and the user's own moves are
                sidelines. */}
            <StudyMovesCard
              tree={analysis.tree}
              currentId={analysis.tree.currentId}
              accentColor={currentColor.color}
              onSelect={(nid) => analysis.goTo(nid)}
              onFirst={() => analysis.toStart()}
              onPrev={moveBackward}
              onNext={moveForward}
              onLast={moveToEnd}
              emptyText={tr("No moves yet — make a move on the board.")}
            />

            {/* A solution written as notes rather than moves. */}
            {solutionNotes && (
              <div style={{ ...styles.descriptionContainer, marginBottom: 12 }}>
                <h3 style={styles.sectionTitle}>{tr("Notes")}</h3>
                <div style={{ ...styles.descriptionText, whiteSpace: 'pre-wrap' }}>{solutionNotes}</div>
              </div>
            )}

            {/* The admin's explanation for each solution line, if written. */}
            {(currentPuzzle.puzzleSolutions || []).filter(x => x?.description?.trim()).map((x, i, arr) => (
              <div key={i} style={{ ...styles.descriptionContainer, marginBottom: 12 }}>
                <h3 style={styles.sectionTitle}>{arr.length > 1 ? tr("Explanation {v0}", { v0: i + 1 }) : 'Explanation'}</h3>
                <div style={styles.descriptionText}>{x.description}</div>
              </div>
            ))}

            {/* Admin studies only. Shown only when the admin wrote one — leaving
                the description blank in Admin → Study Management hides it. */}
            {currentPuzzle.puzzleDescription?.trim() && (
              <div style={styles.descriptionContainer}>
                <h3 style={styles.sectionTitle}>{tr("Description")}</h3>
                <div style={styles.descriptionText}>{currentPuzzle.puzzleDescription}</div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudyPuzzleView;
