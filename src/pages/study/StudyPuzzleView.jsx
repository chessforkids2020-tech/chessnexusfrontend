import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import FenCopyBar from '../../components/FenCopyBar';

import { Chess } from 'chess.js';
import { motion } from 'framer-motion';

const StudyPuzzleView = () => {
  const { studyId, chapterId } = useParams();
  const navigate = useNavigate();
  
  const [puzzles, setPuzzles] = useState([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [chess, setChess] = useState(new Chess());
  const [userMoves, setUserMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
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
  const [anEval, setAnEval] = useState(null);   // { cp } | { mate } — White's POV
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
  const currentMoveIndexRef = useRef(0);
  // Analysis uses its OWN worker so it never competes with the play-vs-Stockfish
  // engine (two `go` commands on one worker cancel each other).
  const anWorkerRef = useRef(null);
  const anModeRef = useRef(false);
  const anFenRef = useRef('');   // FEN the current search is running on (SAN + POV)

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
        setBoardWidth(Math.min(600, Math.floor(width * 0.40)));
      }
    };
    
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
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
      setError('Failed to load puzzles');
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
    const newChess = new Chess(puzzle.puzzleFen);
    const turnColor = newChess.turn();
    const orientation = turnColor === 'b' ? 'black' : 'white';
    setChess(newChess);
    setBoardOrientation(orientation);
    setUserMoves([]);
    setMoveHistory([puzzle.puzzleFen]);
    setCurrentMoveIndex(0);
  };

  const handleMove = (sourceSquare, targetSquare, promotion) => {
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || 'q'
      });

      if (move) {
        const newMoves = [...userMoves, move.san];
        setUserMoves(newMoves);
        
        const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
        newHistory.push(chess.fen());
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);
        
        return true;
      }
    } catch {
    }
    return false;
  };

  const moveBackward = () => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(newIndex);
      const newChess = new Chess(moveHistory[newIndex]);
      setChess(newChess);
      
      const newUserMoves = userMoves.slice(0, newIndex);
      setUserMoves(newUserMoves);
    }
  };

  const moveForward = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(newIndex);
      const newChess = new Chess(moveHistory[newIndex]);
      setChess(newChess);
      
      if (newIndex <= userMoves.length) {
        const newUserMoves = userMoves.slice(0, newIndex);
        setUserMoves(newUserMoves);
      }
    }
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

  // ── Stockfish Mode ────────────────────────────────────────────────────────
  // Keep currentMoveIndex in a ref so SF callbacks always read the latest value
  useEffect(() => { currentMoveIndexRef.current = currentMoveIndex; }, [currentMoveIndex]);

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

  // When sfReady changes or userMoves changes: check if it's SF's turn and fire
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
          try {
            const from = mv.slice(0, 2), to = mv.slice(2, 4), promo = mv[4] || 'q';
            const move = chess.move({ from, to, promotion: promo });
            if (move) {
              setUserMoves(prev => [...prev, move.san]);
              setMoveHistory(prev => {
                const h = prev.slice(0, currentMoveIndexRef.current + 1);
                h.push(chess.fen());
                return h;
              });
              setCurrentMoveIndex(prev => prev + 1);
            }
          } catch {}
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
  }, [userMoves, sfReady, sfMode]);

  /* ── Analysis mode ─────────────────────────────
     Evaluates the position on the board and streams depth / score / best line.
     Read-only — it never plays a move. */
  useEffect(() => { return () => { if (anWorkerRef.current) anWorkerRef.current.terminate(); }; }, []);

  const stopAnalysis = useCallback(() => {
    if (anWorkerRef.current) { anWorkerRef.current.terminate(); anWorkerRef.current = null; }
    anModeRef.current = false;
    setAnMode(false); setAnEval(null); setAnLines({}); setAnDepth(0);
  }, []);

  const toggleAnalysis = useCallback(() => {
    if (anModeRef.current) { stopAnalysis(); return; }
    anModeRef.current = true;
    setAnMode(true);
    setAnEval(null); setAnLines({}); setAnDepth(0);
    if (anWorkerRef.current) anWorkerRef.current.terminate();
    const w = new Worker('/stockfish.js');
    anWorkerRef.current = w;
    w.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (line.includes('uciok')) {
        // Ask for THREE lines before the search starts. MultiPV must be set while
        // the engine is idle — sending it mid-search is ignored.
        w.postMessage('setoption name MultiPV value 3');
        w.postMessage('isready');
        return;
      }
      if (!line.startsWith('info') || !line.includes(' pv ')) return;
      const d = /\bdepth (\d+)/.exec(line);
      const k = /\bmultipv (\d+)/.exec(line);
      const cp = /\bscore cp (-?\d+)/.exec(line);
      const mate = /\bscore mate (-?\d+)/.exec(line);
      const pv = /\bpv (.+)$/.exec(line);
      if (d) setAnDepth(Number(d[1]));
      // Scores come from the SIDE TO MOVE; flip to White's POV so the sign is stable.
      const sideToMove = anFenRef.current.split(' ')[1] === 'b' ? -1 : 1;
      const idx = k ? Number(k[1]) : 1;          // no multipv tag → single line
      const evalObj = mate ? { mate: Number(mate[1]) * sideToMove }
                    : cp   ? { cp: Number(cp[1]) * sideToMove }
                    : null;
      // Line 1 is the engine's best — it drives the headline evaluation.
      if (idx === 1 && evalObj) setAnEval(evalObj);
      if (!pv) return;
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
    w.postMessage('uci');
  }, [stopAnalysis]);

  // Re-run the search whenever the position changes while analysis is on. Keyed on
  // userMoves (same signal the play-vs-Stockfish effect uses in this file).
  useEffect(() => {
    const fen = chess.fen();
    anFenRef.current = fen;
    const w = anWorkerRef.current;
    if (!anMode || !w) return;
    setAnEval(null); setAnLines({}); setAnDepth(0);
    w.postMessage('stop');
    w.postMessage(`position fen ${fen}`);
    w.postMessage('go depth 20');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMoves, anMode]);
  // ─────────────────────────────────────────────────────────────────────────

  
  

  const formatMovesDisplay = () => {
    const moves = [];
    
    if (!puzzles[currentPuzzleIndex]?.puzzleFen) {
      return moves;
    }
    
    const startingTurn = new Chess(puzzles[currentPuzzleIndex].puzzleFen).turn();
    let moveNumber = 1;
    
    if (startingTurn === 'b' && userMoves.length > 0) {
      moves.push({
        number: moveNumber,
        white: '...',
        black: userMoves[0],
      });
      moveNumber++;
      
      for (let i = 1; i < userMoves.length; i += 2) {
        moves.push({
          number: moveNumber,
          white: userMoves[i] || '',
          black: userMoves[i + 1] || '',
        });
        moveNumber++;
      }
    } else {
      for (let i = 0; i < userMoves.length; i += 2) {
        moves.push({
          number: moveNumber,
          white: userMoves[i] || '',
          black: userMoves[i + 1] || '',
        });
        moveNumber++;
      }
    }
    
    return moves;
  };

  const styles = {
    page: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-bg)',
      minHeight: '100vh',
      padding: '8px 20px 20px 20px',
      position: 'relative',
      overflow: 'hidden',
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
    container: {
      maxWidth: '1600px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '10px',
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: 0,
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
      gap: '0px',
      minHeight: '600px',
    },
    leftPanel: {
      flex: isMobile ? 'none' : '0 0 220px',
      display: isMobile && !showPuzzleList ? 'none' : 'block',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      overflowY: 'auto',
      maxHeight: isMobile ? '400px' : '700px',
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
    puzzleTable: {
      width: '100%',
      overflowX: 'auto',
      marginTop: '16px',
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
      padding: isMobile ? '0' : '0 0 0 20px',
      order: isMobile ? -1 : 0,
    },
    chessboardContainer: {
      marginBottom: '24px',
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
      flex: isMobile ? 'none' : '0 0 350px',
      width: isMobile ? '100%' : 'auto',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      padding: '24px',
      overflowY: 'auto',
      maxHeight: isMobile ? 'none' : '700px',
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
          <div style={styles.loading}>Loading puzzles...</div>
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
            <span>←</span> Back to Chapters
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
            <span>←</span> Back to Chapters
          </motion.button>

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
              {showPuzzleList ? 'Hide Puzzles' : 'Show Puzzles'}
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
              <div style={styles.puzzleTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>#</th>
                      <th style={{...styles.tableHeader, textAlign: 'left'}}>Puzzle Name</th>
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
                          {puzzle.name || `Puzzle ${index + 1}`}
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
                position={chess.fen()}
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
                  ...(currentMoveIndex <= 0 ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveBackward}
                disabled={currentMoveIndex <= 0}
                title="Undo last move"
                whileHover={currentMoveIndex > 0 ? { 
                  scale: 1.05,
                  background: currentColor.accentColor,
                  boxShadow: `0 8px 24px ${currentColor.accentColor}`,
                } : {}}
              >
                <span>←</span> Back
              </motion.button>
              
              <motion.button
                style={{
                  ...styles.button,
                  ...styles.navigationButton,
                  ...(currentMoveIndex >= moveHistory.length - 1 ? styles.navigationButtonDisabled : {})
                }}
                onClick={moveForward}
                disabled={currentMoveIndex >= moveHistory.length - 1}
                title="Redo move"
                whileHover={currentMoveIndex < moveHistory.length - 1 ? { 
                  scale: 1.05,
                  background: currentColor.accentColor,
                  boxShadow: `0 8px 24px ${currentColor.accentColor}`,
                } : {}}
              >
                Forward <span>→</span>
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
                <span>↺</span> Reset
              </motion.button>
              




              {/* Edit this position in the board editor */}
              <motion.button
                style={{ ...styles.button, ...styles.resetButton, background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-accent-2)' }}
                onClick={() => navigate('/create-position', { state: { customFen: puzzles[currentPuzzleIndex]?.puzzleFen } })}
                title="Open this position in the board editor"
                whileHover={{ scale: 1.05, background: 'rgba(99,102,241,0.2)', boxShadow: '0 8px 24px rgba(99,102,241,0.15)' }}
              >
                🔧 Edit Position
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
            {/* ── Analyze with Stockfish (evaluates the position; plays nothing) ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: anMode ? 8 : 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: anMode ? '#38bdf8' : 'var(--color-text-faint)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔍 {anMode ? (anDepth ? `Analysing · depth ${anDepth}` : 'Starting…') : 'Analysis'}
              </div>
              <button
                onClick={toggleAnalysis}
                style={{ padding: '5px 14px', borderRadius: 'var(--radius-2xl)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: anMode ? 'var(--color-danger-a12)' : 'rgba(56,189,248,0.12)', color: anMode ? 'var(--color-danger)' : '#38bdf8', border: `1px solid ${anMode ? 'var(--color-danger-a30)' : 'rgba(56,189,248,0.35)'}`, transition: 'all 0.2s' }}
              >{anMode ? '■ Stop' : '🔍 Analyse'}</button>
            </div>
            {anMode && (
              <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#e0f2fe', fontVariantNumeric: 'tabular-nums' }}>
                    {anEval == null ? '…'
                      : anEval.mate != null
                        ? `M${Math.abs(anEval.mate)}${anEval.mate < 0 ? ' ♚' : ''}`
                        : `${anEval.cp > 0 ? '+' : ''}${(anEval.cp / 100).toFixed(2)}`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-accent-2)' }}>
                    {anEval == null ? '' : anEval.mate != null
                      ? (anEval.mate > 0 ? 'White mates' : 'Black mates')
                      : anEval.cp > 30 ? 'White is better' : anEval.cp < -30 ? 'Black is better' : 'Equal'}
                  </span>
                </div>
                {/* Top 3 engine lines, in MultiPV order: line 1 is the engine's
                    preference, 2–3 are the next-best alternatives. */}
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

            {/* ── Stockfish Toggle ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sfMode ? 'var(--color-success)' : 'var(--color-text-faint)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                🤖
                {sfMode ? (sfThinking ? 'Thinking…' : sfReady ? 'Stockfish ON' : 'Loading…') : 'vs Computer'}
              </div>
              <button
                onClick={toggleSfMode}
                style={{ padding: '5px 14px', borderRadius: 'var(--radius-2xl)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: sfMode ? 'var(--color-danger-a12)' : 'rgba(34,197,94,0.12)', color: sfMode ? 'var(--color-danger)' : 'var(--color-success)', border: `1px solid ${sfMode ? 'var(--color-danger-a30)' : 'rgba(34,197,94,0.35)'}`, transition: 'all 0.2s' }}
              >{sfMode ? '■ Stop' : '▶ Play vs Stockfish'}</button>
            </div>
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

            {/* Turn Indicator */}
            <div style={styles.turnIndicator}>
              <div style={styles.kingIcon}>
                {chess.turn() === 'w' ? '♔' : '♚'}
              </div>
              <div style={styles.turnText}>
                {chess.turn() === 'w' ? 'White to move' : 'Black to move'}
              </div>
            </div>

            <div style={styles.movesContainer}>
              <h3 style={styles.sectionTitle}>Your Moves</h3>
              <div style={styles.movesList}>
                {userMoves.length === 0 ? (
                  <div style={{ color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                    No moves yet. Make a move on the board!
                  </div>
                ) : (
                  formatMovesDisplay().map((move, index) => (
                    <div key={index} style={styles.moveRow}>
                      <span style={styles.moveNumber}>{move.number}.</span>
                      <span style={styles.whiteMove}>{move.white}</span>
                      <span style={styles.blackMove}>{move.black}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <motion.div
                style={styles.solutionContainer}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <h3 style={{ ...styles.sectionTitle, marginBottom: 8 }}>Solution</h3>
                <div style={{ fontFamily: 'monospace', fontSize: 14, color: currentColor.color, lineHeight: 1.9, letterSpacing: 0.2 }}>
                  {puzzles[currentPuzzleIndex]?.puzzleSolutions?.[0]?.pgn || <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic' }}>No solution provided</span>}
                </div>
                {currentPuzzle.puzzleSolutions?.[0]?.description && (
                  <div style={{ ...styles.descriptionText, marginTop: 12, fontSize: 13 }}>
                    {currentPuzzle.puzzleSolutions[0].description}
                  </div>
                )}
              </motion.div>

            <div style={styles.descriptionContainer}>
              <h3 style={styles.sectionTitle}>Puzzle Description</h3>
              <div style={styles.descriptionText}>
                {currentPuzzle.puzzleDescription ? (
                  currentPuzzle.puzzleDescription
                ) : (
                  <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                    No description available. Try to find the best move!
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudyPuzzleView;
