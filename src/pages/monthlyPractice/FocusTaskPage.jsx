// src/pages/monthlyFocus/FocusTaskPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { Chess } from 'chess.js';
import api from '../../api';
import socket from '../../socket';
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import Chessboard from '../../components/Chessboard';
import PGNChessboard from '../../components/PGNChessboard';
import stockfishService from '../../services/stockfishService';
import './FocusTaskPage.css';

// Map a Stockfish eval (cp or mate, from the side-to-move's perspective) to a
// single comparable centipawn number. Mate is mapped to a large bounded value
// so "mate in 1" > "mate in 5" > any cp score.
function evalToCp(evaluation) {
  if (!evaluation) return 0;
  if (evaluation.type === 'mate') {
    const m = evaluation.value;
    const big = 100000 - Math.min(Math.abs(m), 50) * 1000;
    return m >= 0 ? big : -big;
  }
  return evaluation.value; // already centipawns
}

export default function FocusTaskPage() {
  const { dayNumber } = useParams();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focusId');
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completedResult, setCompletedResult] = useState(null);
  const [dayNotStarted, setDayNotStarted] = useState(false);
  const [dayEnded, setDayEnded] = useState(false);
  
  // Task state
  const [taskStarted, setTaskStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  // Chessboard popup
  const [showChessboardPopup, setShowChessboardPopup] = useState(false);
  const [popupChessboardData, setPopupChessboardData] = useState(null);

  // Interactive puzzle board state (for taskType === 'puzzles')
  const [puzzleGameFens, setPuzzleGameFens] = useState([]);   // current FEN per puzzle
  const [puzzleMovesMade, setPuzzleMovesMade] = useState([]); // SAN moves made per puzzle
  const [puzzleLastMoves, setPuzzleLastMoves] = useState([]); // { from, to } per puzzle
  const [puzzleDone, setPuzzleDone] = useState([]);           // whether puzzle has all moves
  const autoSubmitScheduled = useRef(false);
  const pendingServerMoves = useRef({}); // { [puzzleIndex]: lastAppliedBotMove }

  // Engine-judged puzzle state (Stockfish WASM)
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [engineThinking, setEngineThinking] = useState(false); // puzzleIndex while judging, else false
  const [engineVerdicts, setEngineVerdicts] = useState([]);    // per puzzle: null | 'pass' | 'fail'
  const engineVerdictsRef = useRef([]);                        // mirror for submit payload
  const userMovesRef = useRef([]);                             // user-only SAN moves per puzzle
  const [engineBestMoves, setEngineBestMoves] = useState([]);  // per puzzle: SAN of engine's best move at the spot the user erred
  const engineBestMovesRef = useRef([]);                       // mirror for submit payload

  // PGN Blunder Analysis state
  const [userPgn, setUserPgn] = useState('');
  const [userSide, setUserSide] = useState('white');
  const [analyzingPgn, setAnalyzingPgn] = useState(false);
  const [pgnAnalysisResult, setPgnAnalysisResult] = useState(null);
  const [viewSide, setViewSide] = useState('white'); // Which side's results to view

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchTask();
  }, [dayNumber]);

  useEffect(() => {
    // Timer countdown
    if (taskStarted && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(); // Auto-submit on timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [taskStarted, timeLeft]);

  const fetchTask = async () => {
    try {
      console.log('Fetching task for day:', dayNumber, 'focusId:', focusId);
      setLoading(true);
      const focusParam = focusId ? `?focusId=${focusId}` : '';
      const res = await api.get(`/api/public/monthly-focus/task/${dayNumber}${focusParam}`);
      console.log('Task response:', res.data);
      
      if (res.data.alreadyCompleted) {
        console.log('Task already completed');
        setAlreadyCompleted(true);
        setCompletedResult(res.data.result);
      } else if (res.data.notStarted) {
        console.log('Day not started yet');
        setDayNotStarted(true);
      } else if (res.data.dayEnded) {
        console.log('Day has ended');
        setDayEnded(true);
      } else {
        console.log('Task loaded successfully:', res.data.task);
        setTask(res.data.task);
        initializeAnswers(res.data.task);
      }
    } catch (err) {
      console.error('Task fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const initializeAnswers = (taskData) => {
    if (!taskData) return;
    
    if (taskData.taskType === 'puzzles') {
      // Each puzzle answer is an array of moves matching the expected moveCount
      setAnswers(taskData.content.items.map(item => 
        item.moveCount > 1 ? Array(item.moveCount).fill('') : ''
      ));
      // Interactive board state
      setPuzzleGameFens(taskData.content.items.map(item => item.fen));
      setPuzzleMovesMade(taskData.content.items.map(() => []));
      setPuzzleLastMoves(taskData.content.items.map(() => null));
      setPuzzleDone(taskData.content.items.map(() => false));
      autoSubmitScheduled.current = false;
      // Engine-judged: reset verdict tracking
      const n = taskData.content.items.length;
      setEngineVerdicts(Array(n).fill(null));
      engineVerdictsRef.current = Array(n).fill(null);
      userMovesRef.current = Array.from({ length: n }, () => []);
      setEngineBestMoves(Array(n).fill(null));
      engineBestMovesRef.current = Array(n).fill(null);
    } else if (taskData.taskType === 'find_mistakes') {
      setAnswers({
        bestMoves: Array(taskData.content.bestMovesCount || 0).fill(''),
        blunders: Array(taskData.content.blundersCount || 0).fill('')
      });
    } else if (taskData.taskType === 'tactics_identification') {
      setAnswers(taskData.content.items.map(() => ''));
    } else if (taskData.taskType === 'multiple_choice') {
      setAnswers({
        answers: taskData.content.items.map(() => ''),
        explanations: {}
      });
    } else if (taskData.taskType === 'pgn_blunder_analysis') {
      // User will paste PGN and analyze it
      setAnswers({
        pgn: '',
        side: 'white',
        blundersFound: null
      });
      setUserPgn('');
      setUserSide('white');
      setPgnAnalysisResult(null);
    }
  };

  // ── Engine-judged: boot Stockfish WASM when the day is engine-judged ────────
  useEffect(() => {
    if (task?.taskType === 'puzzles' && task?.content?.engineJudged && !engineReady && !engineError) {
      let cancelled = false;
      (async () => {
        try {
          if (!stockfishService.isReady()) await stockfishService.init();
          if (!cancelled) setEngineReady(true);
        } catch (err) {
          if (!cancelled) setEngineError('Could not load Stockfish in your browser. Please refresh and try again.');
        }
      })();
      return () => { cancelled = true; };
    }
  }, [task, engineReady, engineError]);

  // Judge a single user move with Stockfish, then (if accepted) play the reply.
  // Returns nothing; updates board + verdict state.
  const judgeEngineMove = async (puzzleIndex, fenBefore, chessAfterUserMove, userSan) => {
    const item = task.content.items[puzzleIndex];
    const tolerance = task.content.engineToleranceCp || 80;
    const depth = task.content.engineDepth || 12;
    const requiredUserMoves = item.moveCount || 1;

    // Record the user's move (user-only list)
    userMovesRef.current[puzzleIndex] = [...(userMovesRef.current[puzzleIndex] || []), userSan];
    const userMovesPlayed = userMovesRef.current[puzzleIndex].length;

    const finish = (passed) => {
      engineVerdictsRef.current[puzzleIndex] = passed ? 'pass' : 'fail';
      setEngineVerdicts(prev => { const n = [...prev]; n[puzzleIndex] = passed ? 'pass' : 'fail'; return n; });
      setPuzzleDone(prev => { const n = [...prev]; n[puzzleIndex] = true; return n; });
      setEngineThinking(false);
    };

    try {
      setEngineThinking(puzzleIndex);

      // If the user's move ends the game in their favour, that's the best outcome.
      if (chessAfterUserMove.isCheckmate()) { finish(true); return; }

      // Evaluate best available move at the position the user faced.
      const pre = await stockfishService.getBestMove(fenBefore, { depth, moveTime: 1200 });
      const bestCp = evalToCp(pre.evaluation);

      // Did the user play exactly the engine's #1 move? Compare by resulting square
      // (UCI from/to + promotion), which is robust to SAN spelling. If so, it can never
      // be a "loss" — accept immediately and skip the cp arithmetic. This avoids false
      // rejections caused by comparing two independent searches (especially mate scores).
      const userUci = (chessAfterUserMove.history({ verbose: true }).slice(-1)[0]) || null;
      const userMoveUci = userUci ? (userUci.from + userUci.to + (userUci.promotion || '')) : '';
      const bestUci = (pre.bestMove || '').toLowerCase();
      const matchedBest = bestUci && userMoveUci &&
        (userMoveUci === bestUci || userMoveUci === bestUci.replace(/[qrbn]$/, ''));

      // Evaluate the position after the user's move (opponent to move).
      const fenAfter = chessAfterUserMove.fen();
      let userCpAfter;
      let reply = null;
      if (chessAfterUserMove.isGameOver()) {
        // Stalemate / draw / etc. after user's move — treat as the resulting eval (~0 for draw).
        userCpAfter = chessAfterUserMove.isDraw() ? 0 : evalToCp(pre.evaluation);
      } else {
        const post = await stockfishService.getBestMove(fenAfter, { depth, moveTime: 1200 });
        userCpAfter = -evalToCp(post.evaluation); // flip to the user's perspective
        reply = post.bestMove; // UCI, e.g. "e7e5"
      }

      // Mate scores from two independent searches don't subtract cleanly (the mate-distance
      // mapping isn't continuous across a ply), so a raw cp-loss check can wrongly flag the
      // engine's own best move. Guard against that: if either side is a mate eval, only the
      // exact-best-move check decides; otherwise use the normal centipawn tolerance.
      const MATE_THRESHOLD = 40000; // anything above this came from a mate score
      const mateInvolved = Math.abs(bestCp) >= MATE_THRESHOLD || Math.abs(userCpAfter) >= MATE_THRESHOLD;
      const loss = bestCp - userCpAfter;
      const accepted = matchedBest || (mateInvolved ? loss <= 0 : loss <= tolerance);

      if (!accepted) {
        // The user gave up the advantage — record what the engine would have played
        // instead (as SAN, from the position the user faced) so they can learn from it.
        try {
          if (pre.bestMove && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(pre.bestMove)) {
            const probe = new Chess(fenBefore);
            const bm = probe.move({
              from: pre.bestMove.slice(0, 2),
              to: pre.bestMove.slice(2, 4),
              promotion: pre.bestMove[4] || 'q',
            });
            if (bm) {
              engineBestMovesRef.current[puzzleIndex] = bm.san;
              setEngineBestMoves(prev => { const n = [...prev]; n[puzzleIndex] = bm.san; return n; });
            }
          }
        } catch { /* best-move hint is optional — ignore conversion errors */ }
        finish(false);
        return;
      }

      // Accepted. If the user has now made all required moves, the puzzle is solved.
      if (userMovesPlayed >= requiredUserMoves) { finish(true); return; }

      // Choose the bot's reply. Prefer the admin's scripted line (so the puzzle plays out
      // the way the author intended), but only if that scripted move is legal in the
      // current position — if the user chose a different (still-strong) move and the line
      // diverged, fall back to Stockfish's own reply.
      let replyMove = null;
      const scriptedBot = (item.botMoves || [])[userMovesPlayed - 1]; // SAN, e.g. "d5"
      if (scriptedBot) {
        try { replyMove = chessAfterUserMove.move(scriptedBot); } catch { replyMove = null; }
      }
      if (!replyMove && reply && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(reply)) {
        replyMove = chessAfterUserMove.move({
          from: reply.slice(0, 2),
          to: reply.slice(2, 4),
          promotion: reply[4] || 'q'
        });
      }
      if (replyMove) {
        setPuzzleMovesMade(prev => { const n = [...prev]; n[puzzleIndex] = [...(n[puzzleIndex] || []), replyMove.san]; return n; });
        setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = chessAfterUserMove.fen(); return n; });
        setPuzzleLastMoves(prev => { const n = [...prev]; n[puzzleIndex] = { from: replyMove.from, to: replyMove.to }; return n; });
        // If the bot's reply ends the game, the puzzle is complete (user survived the line).
        if (chessAfterUserMove.isGameOver()) { finish(true); return; }
      }
      setEngineThinking(false);
    } catch (err) {
      console.warn('Engine judge failed:', err?.message || err);
      // Fail open is unfair; fail closed is harsh. On engine error, accept the move so the
      // user is never blocked by an engine glitch, but don't auto-pass the whole puzzle.
      if (userMovesPlayed >= requiredUserMoves) { finish(true); return; }
      setEngineThinking(false);
    }
  };

  const startTask = async () => {
    try {
      const focusParam = focusId ? `?focusId=${focusId}` : '';
      const res = await api.post(`/api/public/monthly-focus/start-task/${dayNumber}${focusParam}`);
      setTaskStarted(true);
      setStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (res.data.timeLimit) {
        setTimeLeft(res.data.timeLimit);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start task');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    try {
      setSubmitting(true);
      clearInterval(timerRef.current);
      
      const focusParam = focusId ? `?focusId=${focusId}` : '';
      const payload = { answers };

      // Engine-judged puzzles: send the per-puzzle verdict Stockfish computed locally.
      if (task?.taskType === 'puzzles' && task?.content?.engineJudged) {
        payload.engineResults = (task.content.items || []).map((_, i) => ({
          index: i,
          passed: engineVerdictsRef.current[i] === 'pass',
          moves: userMovesRef.current[i] || [],
          engineBestMove: engineBestMovesRef.current[i] || null
        }));
      }

      const res = await api.post(`/api/public/monthly-focus/submit-task/${dayNumber}${focusParam}`, payload);
      
      setResult(res.data.result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Socket notification
      socket.emit('focus_task_completed', {
        dayNumber: parseInt(dayNumber),
        xpEarned: res.data.result.xpEarned + res.data.result.bonusXp
      });
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Interactive puzzle board handlers ──────────────────────────────────────
  const handlePuzzleDrop = (puzzleIndex, sourceSquare, targetSquare, promotion) => {
    if (!task || puzzleDone[puzzleIndex]) return false;
    const item = task.content.items[puzzleIndex];
    const movesSoFar = puzzleMovesMade[puzzleIndex] || [];

    // ── Engine-judged mode: Stockfish judges the move, then replies ──────────
    if (task.content.engineJudged) {
      if (!engineReady || engineThinking !== false) return false; // wait for engine

      const fenBefore = puzzleGameFens[puzzleIndex] || item.fen;
      const chess = new Chess(item.fen);
      for (const m of movesSoFar) chess.move(m);
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion || 'q' });
      if (!move) return false; // illegal move

      // Show the user's move immediately
      setPuzzleMovesMade(prev => { const n = [...prev]; n[puzzleIndex] = [...movesSoFar, move.san]; return n; });
      setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = chess.fen(); return n; });
      setPuzzleLastMoves(prev => { const n = [...prev]; n[puzzleIndex] = { from: move.from, to: move.to }; return n; });

      // Judge asynchronously (engine plays its reply inside)
      judgeEngineMove(puzzleIndex, fenBefore, chess, move.san);
      return true;
    }

    // ── Classic mode: exact-match against saved solution line ────────────────
    // Rebuild chess state from original FEN + moves made
    const chess = new Chess(item.fen);
    for (const m of movesSoFar) chess.move(m);

    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion || 'q' });
    if (!move) return false; // illegal move

    const newMoves = [...movesSoFar, move.san];
    const newFen = chess.fen();
    const newLastMove = { from: move.from, to: move.to };
    const isDone = newMoves.length >= item.moveCount;

    setPuzzleMovesMade(prev => { const n = [...prev]; n[puzzleIndex] = newMoves; return n; });
    setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = newFen; return n; });
    setPuzzleLastMoves(prev => { const n = [...prev]; n[puzzleIndex] = newLastMove; return n; });

    // Update answers with SAN moves
    setAnswers(prev => {
      const n = [...prev];
      n[puzzleIndex] = item.moveCount > 1 ? newMoves : move.san;
      return n;
    });

    if (isDone) {
      setPuzzleDone(prev => { const n = [...prev]; n[puzzleIndex] = true; return n; });
    }

    // After user's move, call server per-move endpoint to get bot reply (if any).
    (async () => {
      try {
        const focusParam = focusId ? `?focusId=${focusId}` : '';
        const res = await api.post(`/api/public/monthly-focus/submit-move/${dayNumber}${focusParam}`, {
          puzzleIndex,
          move: move.san
        });

        const { botMove, fenAfter, completed } = res.data || {};
        if (botMove) {
          // Avoid applying duplicate bot move
          setPuzzleMovesMade(prev => {
            const n = [...prev];
            const cur = n[puzzleIndex] ? [...n[puzzleIndex]] : [];
            if (cur[cur.length - 1] !== botMove) {
              cur.push(botMove);
              n[puzzleIndex] = cur;
            }
            return n;
          });

          setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = fenAfter || (n[puzzleIndex] || item.fen); return n; });
          setPuzzleLastMoves(prev => { const n = [...prev]; n[puzzleIndex] = null; return n; });
          if (completed) setPuzzleDone(prev => { const n = [...prev]; n[puzzleIndex] = true; return n; });
          pendingServerMoves.current[puzzleIndex] = botMove;
        }
      } catch (err) {
        // Ignore transient errors; bot may emit via socket instead
        console.warn('submit-move failed (will rely on socket):', err?.message || err);
      }
    })();

    return true;
  };

  const handlePuzzleUndoMove = (puzzleIndex) => {
    if (!task) return;
    const item = task.content.items[puzzleIndex];
    const movesSoFar = puzzleMovesMade[puzzleIndex] || [];
    if (movesSoFar.length === 0) return;

    const newMoves = movesSoFar.slice(0, -1);

    // Rebuild from original FEN
    const chess = new Chess(item.fen);
    let lastMove = null;
    for (const m of newMoves) { lastMove = chess.move(m); }

    setPuzzleMovesMade(prev => { const n = [...prev]; n[puzzleIndex] = newMoves; return n; });
    setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = chess.fen(); return n; });
    setPuzzleLastMoves(prev => { const n = [...prev]; n[puzzleIndex] = lastMove ? { from: lastMove.from, to: lastMove.to } : null; return n; });
    setPuzzleDone(prev => { const n = [...prev]; n[puzzleIndex] = false; return n; });

    setAnswers(prev => {
      const n = [...prev];
      n[puzzleIndex] = item.moveCount > 1 ? newMoves : (newMoves[0] || '');
      return n;
    });
  };

  // Auto-submit when all puzzles have their moves
  useEffect(() => {
    if (
      task?.taskType === 'puzzles' &&
      taskStarted &&
      puzzleDone.length > 0 &&
      puzzleDone.every(Boolean) &&
      !autoSubmitScheduled.current
    ) {
      autoSubmitScheduled.current = true;
      setTimeout(() => handleSubmit(), 1800);
    }
  }, [puzzleDone]);

  // Listen for server-side bot moves emitted via socket
  useEffect(() => {
    const handler = (data) => {
      try {
        if (!data) return;
        const dn = parseInt(data.dayNumber);
        if (dn !== parseInt(dayNumber)) return;
        const puzzleIndex = data.puzzleIndex;
        const botMove = data.botMove;
        const fenAfter = data.fenAfter;
        const completed = !!data.completed;

        if (botMove == null) return;

        // Avoid duplicate application
        setPuzzleMovesMade(prev => {
          const n = [...prev];
          const cur = n[puzzleIndex] ? [...n[puzzleIndex]] : [];
          if (cur[cur.length - 1] !== botMove && pendingServerMoves.current[puzzleIndex] !== botMove) {
            cur.push(botMove);
            n[puzzleIndex] = cur;
          }
          return n;
        });

        setPuzzleGameFens(prev => { const n = [...prev]; n[puzzleIndex] = fenAfter || n[puzzleIndex]; return n; });
        if (completed) setPuzzleDone(prev => { const n = [...prev]; n[puzzleIndex] = true; return n; });
        pendingServerMoves.current[puzzleIndex] = botMove;
      } catch (err) {
        console.warn('monthlyFocusBotMove handler error', err);
      }
    };

    socket.on('monthlyFocusBotMove', handler);
    return () => { socket.off('monthlyFocusBotMove', handler); };
  }, [dayNumber]);
  // ── End interactive puzzle board handlers ───────────────────────────────────

  const updateAnswer = (index, value, moveIdx) => {    if (task.taskType === 'puzzles') {
      // Each input should only contain a single move (no spaces)
      const cleanedValue = value.trim().split(/\s+/)[0] || '';
      const newAnswers = [...answers];
      if (moveIdx !== undefined && Array.isArray(newAnswers[index])) {
        // Multi-move: update specific move slot
        newAnswers[index] = [...newAnswers[index]];
        newAnswers[index][moveIdx] = cleanedValue;
      } else {
        newAnswers[index] = cleanedValue;
      }
      setAnswers(newAnswers);
    } else if (task.taskType === 'tactics_identification') {
      const newAnswers = [...answers];
      newAnswers[index] = value;
      setAnswers(newAnswers);
    } else if (task.taskType === 'find_mistakes') {
      // index is like "best_0" or "blunder_1"
      const [type, idx] = index.split('_');
      const newAnswers = { ...answers };
      if (type === 'best') {
        newAnswers.bestMoves = [...answers.bestMoves];
        newAnswers.bestMoves[parseInt(idx)] = value;
      } else {
        newAnswers.blunders = [...answers.blunders];
        newAnswers.blunders[parseInt(idx)] = value;
      }
      setAnswers(newAnswers);
    }
  };

  const analyzePgn = async () => {
    if (!userPgn.trim()) {
      alert('Please paste a PGN first');
      return;
    }

    try {
      setAnalyzingPgn(true);
      setPgnAnalysisResult(null);

      // Always analyze BOTH sides — long-running call, override default 30s timeout
      const focusParam = focusId ? `?focusId=${focusId}` : '';
      const res = await api.post(`/api/public/monthly-focus/analyze-user-pgn/${dayNumber}${focusParam}`, {
        pgn: userPgn,
        side: 'both'
      }, { timeout: 300000 }); // 5 minutes — a 60-move game takes ~90s

      const analysis = res.data.analysis;
      setPgnAnalysisResult(analysis);
      setViewSide(userSide); // Default view to the side the user played
      
      // Use the selected side's blunders for submission pass/fail
      const sideData = analysis[userSide] || { blundersFound: [], allIssues: [] };
      setAnswers({
        pgn: userPgn,
        side: userSide,
        blundersFound: sideData.blundersFound,
        allIssues: sideData.allIssues
      });

    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzingPgn(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openChessboardPopup = (fen, orientation, type = 'chessboard') => {
    setPopupChessboardData({ fen, orientation, type });
    setShowChessboardPopup(true);
  };

  const closeChessboardPopup = () => {
    setShowChessboardPopup(false);
    setPopupChessboardData(null);
  };

  if (loading) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <div className="focus-task-loading">
            <div className="focus-task-loading-icon">⏳</div>
            <p className="focus-task-loading-text">Loading task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <div className="focus-card focus-error-card">
            <h2 className="focus-error-title">⚠️ Error</h2>
            <p className="focus-error-message">{error}</p>
            <Link to="/monthly-focus" className="focus-btn focus-btn-primary focus-btn-link">
              Back to Focus Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Day not started yet
  if (dayNotStarted) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <div className="focus-card focus-status-card">
            <div className="focus-status-icon">⏳</div>
            <h2 className="focus-status-title">Day {dayNumber} - Not Started Yet</h2>
            <p className="focus-status-message">
              This day hasn't been activated by the admin yet. Check back later!
            </p>
            <Link to="/monthly-focus" className="focus-btn focus-btn-primary focus-btn-link">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Day ended (late submission with reduced XP)
  if (dayEnded && !task) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <div className="focus-card focus-status-card">
            <div className="focus-status-icon">⏱️</div>
            <h2 className="focus-status-title">Day {dayNumber} - Time Expired</h2>
            <p className="focus-status-message">
              The 24-hour window for this day has ended. You can still complete it, but you'll earn reduced XP (5 XP instead of the full reward).
            </p>
            <div style={{ marginTop: '24px' }}>
              <Link to="/monthly-focus" className="focus-btn focus-btn-secondary focus-btn-link" style={{ marginRight: '16px' }}>
                Back to Dashboard
              </Link>
              <button className="focus-btn focus-btn-primary" onClick={() => window.location.reload()}>
                Continue Anyway (5 XP)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Already completed
  if (alreadyCompleted && completedResult) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <Link to="/monthly-focus" className="focus-back-link">
            ← Back to Dashboard
          </Link>
          
          <div className={`focus-card focus-result-card ${completedResult.correct === completedResult.total ? 'focus-result-success' : 'focus-result-partial'}`}>
            <div className="focus-result-icon">
              {completedResult.correct === completedResult.total ? '🎉' : '✨'}
            </div>
            <h2 className="focus-result-title">Already Completed!</h2>
            <p className="focus-result-score">{completedResult.correct} / {completedResult.total}</p>
            <p className="focus-result-xp">+{completedResult.xpEarned} XP Earned</p>
            {completedResult.bonusXp > 0 && (
              <p className="focus-result-bonus">🎁 Bonus: +{completedResult.bonusXp} XP</p>
            )}
            <p className="focus-result-message">You've already completed this day's task.</p>
            
            <Link to="/monthly-focus" className="focus-btn focus-btn-primary focus-btn-link">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Task completed - show result
  if (result) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">
          <Link to="/monthly-focus" className="focus-back-link">
            ← Back to Dashboard
          </Link>
          
          <div className={`focus-card focus-result-card ${result.correct === result.total ? 'focus-result-success' : 'focus-result-partial'}`}>
            <div className="focus-result-icon">
              {result.correct === result.total ? '🏆' : result.correct >= result.total / 2 ? '⭐' : '💪'}
            </div>
            <h2 className="focus-result-title">
              {result.correct === result.total ? 'Perfect Score!' : result.correct >= result.total / 2 ? 'Good Job!' : 'Keep Practicing!'}
            </h2>
            <p className="focus-result-score">{result.correct} / {result.total}</p>
            {result.bonusXp > 0 && (
              <p className="focus-result-bonus">🎁 Bonus: +{result.bonusXp} XP</p>
            )}

            {/* Educational Review - Show positions with solutions (not for PGN blunder analysis) */}
            {task && task.taskType !== 'pgn_blunder_analysis' && result.correctAnswers && result.correctAnswers.length > 0 && (
              <div className="focus-answer-review" style={{ marginTop: '30px' }}>
                <h3 className="focus-answer-review-title">📚 Educational Review</h3>
                
                {task.taskType === 'puzzles' && result.correctAnswers.map((item, idx) => (
                  <div key={idx} className={`focus-answer-item ${result.review?.[idx]?.isCorrect ? 'focus-answer-correct' : 'focus-answer-wrong'}`}>
                    <div className="focus-answer-label">
                      {result.review?.[idx]?.isCorrect ? '✅' : '❌'} Puzzle {idx + 1}
                    </div>
                    
                    {/* Chess position */}
                    <div style={{ margin: '10px 0' }}>
                      <div 
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        onClick={() => openChessboardPopup(item.fen, item.fen.includes(' b ') ? 'black' : 'white', 'chessboard')}
                      >
                        <Chessboard 
                          position={item.fen}
                          boardWidth={250}
                          draggable={false}
                          orientation={item.fen.includes(' b ') ? 'black' : 'white'}
                        />
                      </div>
                    </div>
                    
                    <div className="focus-answer-value">
                      <strong>Your line:</strong> {result.review?.[idx]?.userAnswer || '(no answer)'}
                    </div>
                    {result.review?.[idx]?.engineJudged ? (
                      // Engine-judged: multiple lines are valid, so there's no single "expected"
                      // line to show — just the engine's verdict.
                      <div className="focus-answer-correct-value">
                        <strong>{result.review?.[idx]?.isCorrect ? '🤖 Accepted by Stockfish' : '🤖 Stockfish: this line gave up the advantage'}</strong>
                        {!result.review?.[idx]?.isCorrect && (result.review?.[idx]?.engineBestMove || engineBestMoves[idx]) && (
                          <div style={{ marginTop: '6px', color: '#b45309' }}>
                            💡 Stockfish preferred: <strong>{result.review?.[idx]?.engineBestMove || engineBestMoves[idx]}</strong> instead.
                          </div>
                        )}
                      </div>
                    ) : (
                      !result.review?.[idx]?.isCorrect && (
                        <div className="focus-answer-correct-value">
                          <strong>Expected solution:</strong> {item.solution}
                        </div>
                      )
                    )}
                  </div>
                ))}

                {task.taskType === 'tactics_identification' && result.correctAnswers.map((item, idx) => (
                  <div key={idx} className={`focus-answer-item ${result.review?.[idx]?.isCorrect ? 'focus-answer-correct' : 'focus-answer-wrong'}`}>
                    <div className="focus-answer-label">
                      {result.review?.[idx]?.isCorrect ? '✅' : '❌'} Position {idx + 1}
                    </div>
                    
                    <div style={{ margin: '10px 0' }}>
                      <div 
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        onClick={() => openChessboardPopup(item.fen, item.fen.includes(' b ') ? 'black' : 'white', 'chessboard')}
                      >
                        <Chessboard 
                          position={item.fen}
                          boardWidth={250}
                          draggable={false}
                          orientation={item.fen.includes(' b ') ? 'black' : 'white'}
                        />
                      </div>
                    </div>
                    
                    <div className="focus-answer-value">
                      <strong>Your answer:</strong> {result.review?.[idx]?.userAnswer || '(no answer)'}
                    </div>
                    {!result.review?.[idx]?.isCorrect && (
                      <div className="focus-answer-correct-value">
                        <strong>Expected tactic:</strong> {item.tacticsName}
                      </div>
                    )}
                  </div>
                ))}

                {task.taskType === 'multiple_choice' && result.correctAnswers.map((item, idx) => (
                  <div key={idx} className={`focus-answer-item ${result.review?.[idx]?.isCorrect ? 'focus-answer-correct' : 'focus-answer-wrong'}`}>
                    <div className="focus-answer-label">
                      {result.review?.[idx]?.isCorrect ? '✅' : '❌'} Question {idx + 1}
                    </div>
                    
                    <div style={{ margin: '10px 0' }}>
                      <div 
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        onClick={() => openChessboardPopup(item.fen, item.fen.includes(' b ') ? 'black' : 'white', 'chessboard')}
                      >
                        <Chessboard 
                          position={item.fen}
                          boardWidth={250}
                          draggable={false}
                          orientation={item.fen.includes(' b ') ? 'black' : 'white'}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '500' }}>
                      {item.question}
                    </div>
                    
                    <div className="focus-answer-value">
                      <strong>Your answer:</strong> {result.review?.[idx]?.userAnswer || '(no answer)'}
                    </div>
                    {!result.review?.[idx]?.isCorrect && (
                      <>
                        <div className="focus-answer-correct-value">
                          <strong>Correct answer:</strong> {item.correctAnswer}
                        </div>
                        {item.explanation && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                            💡 {item.explanation}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {task.taskType === 'find_mistakes' && result.correctAnswers && result.correctAnswers.length > 0 && (
                  <div style={{ background: 'rgba(23, 23, 23, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#e5e7eb', padding: '15px', borderRadius: '12px', marginTop: '15px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ color: '#06b6d4' }}>Game PGN:</strong>
                      <div 
                        style={{ cursor: 'pointer', marginTop: '10px', display: 'inline-block' }}
                        onClick={() => openChessboardPopup(task.content.pgn, task.content.side || 'white', 'pgn')}
                      >
                        <PGNChessboard 
                          pgn={task.content.pgn}
                          boardWidth={300}
                          orientation={task.content.side || 'white'}
                        />
                      </div>
                    </div>
                    {result.correctAnswers.map((ans, idx) => (
                      <div key={idx} style={{ marginTop: '15px', padding: '12px', background: ans.type === 'best_move' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: ans.type === 'best_move' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: ans.type === 'best_move' ? '#10b981' : '#ef4444' }}>
                          {ans.type === 'best_move' ? '🎯 Best Move' : '💥 Blunder'} - Move {ans.moveNumber}
                        </div>
                        <div style={{ color: '#d1d5db' }}><strong>Move:</strong> {ans.move}</div>
                        {ans.betterMove && <div style={{ color: '#d1d5db' }}><strong>Better:</strong> {ans.betterMove}</div>}
                        {ans.explanation && (
                          <div style={{ marginTop: '5px', fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                            💡 {ans.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ marginTop: '32px' }}>
              <Link to="/monthly-focus/leaderboard" className="focus-btn focus-btn-primary focus-btn-link">
                📊 View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pre-start view
  if (!taskStarted && task) {
    return (
      <div className="focus-task-page">
        <div className="focus-task-content">

          <div className="focus-card">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span className="focus-day-badge">Day {dayNumber}</span>
              <h1 className="focus-task-title" style={{ marginTop: '20px' }}>{task.title}</h1>
              
              {/* Task Info Badges */}
              <div className="focus-task-info-badges">
                {/* Task Type Badge */}
                <div className="focus-info-badge">
                  {task.taskType === 'puzzles' && '🧩 Puzzles'}
                  {task.taskType === 'find_mistakes' && '🔍 Find Mistakes'}
                  {task.taskType === 'tactics_identification' && '🎯 Tactics ID'}
                  {task.taskType === 'multiple_choice' && '❓ Multiple Choice'}
                  {task.taskType === 'pgn_blunder_analysis' && '📊 Blunder Analysis'}
                </div>
                
                {/* XP Badge */}
                <div className="focus-info-badge focus-info-badge-xp">
                  🏅 {task.xpReward} XP
                  {task.perfectBonus > 0 && ` + ${task.perfectBonus} bonus`}
                </div>
                
                {/* Max Points Badge */}
                {task.maxScore > 0 && (
                  <div className="focus-info-badge focus-info-badge-points">
                    ⭐ Max {task.maxScore} pts
                  </div>
                )}
              </div>
            </div>

            {/* Skill Score Breakdown */}
            {task.scoring && (
              <div className="focus-skill-score-breakdown">
                <h3 className="focus-breakdown-title">⭐ Skill Score System</h3>
                <div className="focus-scoring-note">
                  <p>🎯 Start with 0 points • Earn points for correct answers • Wrong answers don't subtract points</p>
                </div>
                <div className="focus-breakdown-content">
                  {task.taskType === 'puzzles' && task.scoring.puzzlePoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Each correct puzzle:</span>
                      <span className="focus-breakdown-value">+{task.scoring.puzzlePoints} pts</span>
                    </div>
                  )}
                  {task.taskType === 'find_mistakes' && task.scoring.bestMovePoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Each best move found:</span>
                      <span className="focus-breakdown-value">+{task.scoring.bestMovePoints} pts</span>
                    </div>
                  )}
                  {task.taskType === 'find_mistakes' && task.scoring.blunderPoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Each blunder found:</span>
                      <span className="focus-breakdown-value">+{task.scoring.blunderPoints} pts</span>
                    </div>
                  )}
                  {task.taskType === 'tactics_identification' && task.scoring.tacticsPoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Each correct tactic:</span>
                      <span className="focus-breakdown-value">+{task.scoring.tacticsPoints} pts</span>
                    </div>
                  )}
                  {task.taskType === 'multiple_choice' && task.scoring.multipleChoicePoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Each correct answer:</span>
                      <span className="focus-breakdown-value">+{task.scoring.multipleChoicePoints} pts</span>
                    </div>
                  )}
                  {task.taskType === 'pgn_blunder_analysis' && task.scoring.blunderAnalysisPoints && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">Pass blunder limit:</span>
                      <span className="focus-breakdown-value">+{task.scoring.blunderAnalysisPoints} pts</span>
                    </div>
                  )}
                  {task.scoring.perfectMultiplier && task.scoring.perfectMultiplier > 1 && (
                    <div className="focus-breakdown-item">
                      <span className="focus-breakdown-label">🎉 Perfect score bonus:</span>
                      <span className="focus-breakdown-value">{task.scoring.perfectMultiplier}x multiplier!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="focus-instructions">
              <h3 className="focus-instructions-title">
                <span>📖</span> Instructions
              </h3>
              {task.taskType === 'puzzles' && (
                <ul className="focus-instructions-list">
                  <li>You will see {task.content.items.length} chess puzzle{task.content.items.length !== 1 ? 's' : ''}</li>
                  <li>Find the best move or sequence of moves in each position</li>
                  <li>♟️ <strong>Make your move directly on the chessboard</strong> — drag a piece or click the piece then click the destination square</li>
                  <li>No typing required — moves are recorded automatically</li>
                  {task.content.items.some(i => i.moveCount > 1) && <li>For multi-move puzzles, keep playing until all moves are done</li>}
                  <li>Use the <strong>Undo</strong> button if you want to take back a move</li>
                  <li>When all puzzles are complete, your solution is submitted automatically</li>
                  {task.timerEnabled && <li>⏱️ Timer: {Math.floor(task.timeLimit / 60)} minutes</li>}
                  <li>🏅 Reward: {task.xpReward} XP{task.perfectBonus > 0 ? ` + ${task.perfectBonus} bonus for perfect` : ''}</li>
                </ul>
              )}
              {task.taskType === 'find_mistakes' && (
                <ul className="focus-instructions-list">
                  <li>Analyze the game PGN provided</li>
                  {(task.content.mode === 'best_moves' || task.content.mode === 'both') && 
                    <li>Find {task.content.bestMovesCount} best moves from the game</li>}
                  {(task.content.mode === 'blunders' || task.content.mode === 'both') && 
                    <li>Identify {task.content.blundersCount} blunders/mistakes</li>}
                  <li>Format: "12. Nf6" or "Qxd5"</li>
                  {task.timerEnabled && <li>⏱️ Timer: {Math.floor(task.timeLimit / 60)} minutes</li>}
                  <li>🏅 Reward: {task.xpReward} XP{task.perfectBonus > 0 ? ` + ${task.perfectBonus} bonus for perfect` : ''}</li>
                </ul>
              )}
              {task.taskType === 'tactics_identification' && (
                <ul className="focus-instructions-list">
                  <li>You will see {task.content.items.length} positions</li>
                  <li>Identify the tactical pattern (Fork, Pin, Skewer, etc.)</li>
                  <li>Use the quick-select buttons or type the tactic name</li>
                  {task.timerEnabled && <li>⏱️ Timer: {Math.floor(task.timeLimit / 60)} minutes</li>}
                  <li>🏅 Reward: {task.xpReward} XP{task.perfectBonus > 0 ? ` + ${task.perfectBonus} bonus for perfect` : ''}</li>
                </ul>
              )}
              {task.taskType === 'multiple_choice' && (
                <ul className="focus-instructions-list">
                  <li>You will answer {task.content.items.length} multiple-choice questions</li>
                  <li>Each question shows a chess position with 2-6 answer options</li>
                  <li>Select the correct answer for each question</li>
                  <li>You can optionally explain your reasoning (not graded)</li>
                  {task.timerEnabled && <li>⏱️ Timer: {Math.floor(task.timeLimit / 60)} minutes</li>}
                  <li>🏅 Reward: {task.xpReward} XP{task.perfectBonus > 0 ? ` + ${task.perfectBonus} bonus for perfect` : ''}</li>
                </ul>
              )}
              {task.taskType === 'pgn_blunder_analysis' && (
                <ul className="focus-instructions-list">
                  <li>Play a chess game on Lichess or Chess.com</li>
                  <li>Copy the PGN (game notation) and paste it in the task</li>
                  <li>Select which side you played (White or Black)</li>
                  <li>Click "Analyze" to check your game with Stockfish</li>
                  <li>Goal: ≤ {task.content.blunderLimit} blunder{task.content.blunderLimit !== 1 ? 's' : ''} to earn {task.scoring.blunderAnalysisPoints} points</li>
                  {task.timerEnabled && <li>⏱️ Timer: {Math.floor(task.timeLimit / 60)} minutes</li>}
                  <li>🏅 Reward: {task.xpReward} XP for passing the blunder limit</li>
                </ul>
              )}
            </div>

            <button 
              className="focus-btn focus-btn-primary focus-btn-large"
              onClick={startTask}
            >
              🚀 Start Day {dayNumber} Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active task view
  return (
    <div className="focus-task-page">
      <div className="focus-task-content">
        {/* Header with timer */}
        <div className="focus-task-header">
          <h2 className="focus-task-title">{task.title}</h2>
          {timeLeft !== null && (
            <div className={`focus-timer ${timeLeft < 60 ? 'focus-timer-danger' : ''}`}>
              <span>⏱️</span> {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Puzzles Task — Interactive chessboard, no typing */}
        {task.taskType === 'puzzles' && (
          <div>
            {/* Engine-judged status banner */}
            {task.content.engineJudged && (
              <div style={{
                marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
                background: engineError ? 'rgba(239,68,68,0.12)' : engineReady ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${engineError ? 'rgba(239,68,68,0.4)' : engineReady ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
                color: engineError ? '#ef4444' : engineReady ? '#10b981' : '#f59e0b',
                fontSize: '13.5px', fontWeight: 600, textAlign: 'center'
              }}>
                {engineError
                  ? `⚠️ ${engineError}`
                  : engineReady
                    ? '🤖 Stockfish-judged: any move as strong as Stockfish\'s best is accepted — there can be more than one right answer.'
                    : '⏳ Loading Stockfish in your browser…'}
              </div>
            )}
            {task.content.items.map((item, index) => {
              const movesMade = puzzleMovesMade[index] || [];
              const engineMode = !!task.content.engineJudged;
              const userMovesPlayed = engineMode ? Math.ceil(movesMade.length / 2) : movesMade.length;
              const movesNeeded = item.moveCount - userMovesPlayed;
              const isDone = puzzleDone[index];
              const verdict = engineVerdicts[index]; // 'pass' | 'fail' | null
              const thinking = engineThinking === index;
              const orientation = item.fen.includes(' b ') ? 'black' : 'white';
              const boardLocked = isDone || thinking || (engineMode && !engineReady);
              return (
                <div
                  key={index}
                  className={`focus-puzzle-card ${isDone ? 'focus-puzzle-card-done' : index === currentIndex ? 'focus-puzzle-card-active' : ''}`}
                  style={{ marginBottom: '32px' }}
                >
                  {/* Puzzle header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 className="focus-puzzle-number" style={{ margin: 0 }}>
                      Puzzle {index + 1} of {task.content.items.length}
                    </h4>
                    {isDone && (
                      engineMode ? (
                        <span style={{
                          background: verdict === 'pass' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          color: verdict === 'pass' ? '#10b981' : '#ef4444',
                          border: `1px solid ${verdict === 'pass' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                          padding: '4px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px'
                        }}>
                          {verdict === 'pass' ? '✓ Solved!' : '✗ Not quite'}
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.5)', padding: '4px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px' }}>
                          ✓ Solution submitted!
                        </span>
                      )
                    )}
                  </div>

                  <p className="focus-puzzle-description" style={{ marginBottom: '16px' }}>
                    {item.moveCount > 1
                      ? `Find the best ${item.moveCount}-move sequence for ${orientation === 'white' ? 'White' : 'Black'} — make moves directly on the board`
                      : `Find the best move for ${orientation === 'white' ? 'White' : 'Black'} — drag or click a piece to make your move`
                    }
                  </p>

                  {/* Interactive chessboard */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Chessboard
                      position={puzzleGameFens[index] || item.fen}
                      boardWidth={Math.min(window.innerWidth - 48, 420)}
                      draggable={!boardLocked}
                      orientation={orientation}
                      onDrop={(src, tgt, promo) => {
                        setCurrentIndex(index);
                        return handlePuzzleDrop(index, src, tgt, promo);
                      }}
                      lastMove={puzzleLastMoves[index]}
                    />

                    {/* Moves made chips */}
                    {movesMade.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#9ca3af', marginRight: '4px' }}>Moves:</span>
                        {movesMade.map((m, i) => (
                          <span
                            key={i}
                            style={{
                              background: 'rgba(6,182,212,0.15)',
                              color: '#06b6d4',
                              border: '1px solid rgba(6,182,212,0.4)',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: 'monospace'
                            }}
                          >
                            {i + 1}. {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status line */}
                    {!isDone ? (
                      <div style={{ textAlign: 'center' }}>
                        {thinking ? (
                          <p style={{ color: '#f59e0b', fontSize: '13px', margin: '0 0 8px 0', fontWeight: 600 }}>
                            🤖 Stockfish checking your move…
                          </p>
                        ) : (
                          <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 8px 0' }}>
                            {movesNeeded} move{movesNeeded !== 1 ? 's' : ''} remaining — drag or click a piece to play
                          </p>
                        )}
                        {/* Undo is only available in classic mode (engine replies can't be taken back) */}
                        {!engineMode && movesMade.length > 0 && (
                          <button
                            className="focus-btn focus-btn-secondary"
                            style={{ padding: '6px 16px', fontSize: '13px' }}
                            onClick={() => handlePuzzleUndoMove(index)}
                          >
                            ↩ Undo last move
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: verdict === 'fail' ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: '14px' }}>
                        {engineMode
                          ? (verdict === 'pass' ? '✓ Accepted by Stockfish!' : '✗ That line gave up the advantage — auto-submitting when all puzzles complete')
                          : '✓ All moves made — auto-submitting when all puzzles complete'}
                        {engineMode && verdict === 'fail' && engineBestMoves[index] && (
                          <div style={{ marginTop: '6px', color: '#fbbf24', fontWeight: 700, fontSize: '13.5px' }}>
                            💡 Stockfish preferred: <strong>{engineBestMoves[index]}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Find Mistakes Task */}
        {task.taskType === 'find_mistakes' && (
          <div>
            <div className="focus-pgn-section">
              <div className="focus-section-header">
                <h4 className="focus-pgn-title">
                  <span>📜</span> Analyze Game
                </h4>
                {task.content.side && (
                  <div className={`focus-side-badge focus-side-${task.content.side}`}>
                    Side to analyze: <strong>{task.content.side.charAt(0).toUpperCase() + task.content.side.slice(1)}</strong>
                  </div>
                )}
              </div>
              <div className="focus-pgn-viewer">
                <PGNChessboard 
                  pgn={task.content.pgn} 
                  boardWidth={400} 
                  coordinateSides={['bottom', 'left']}
                  orientation={task.content.side || 'white'}
                />
              </div>
            </div>

            {(task.content.mode === 'best_moves' || task.content.mode === 'both') && (
              <div className="focus-card">
                <h4 className="focus-section-title">
                  <span className="focus-section-title-icon">🎯</span>
                  Find Best Moves ({task.content.bestMovesCount})
                </h4>
                {[...Array(task.content.bestMovesCount)].map((_, i) => (
                  <div key={i} className="focus-answer-group">
                    <label className="focus-input-label">Best Move {i + 1}:</label>
                    <input 
                      className="focus-input"
                      placeholder="e.g., Nf6 or 12. Qxd5"
                      value={answers.bestMoves?.[i] || ''}
                      onChange={e => updateAnswer(`best_${i}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {(task.content.mode === 'blunders' || task.content.mode === 'both') && (
              <div className="focus-card">
                <h4 className="focus-section-title">
                  <span className="focus-section-title-icon">💥</span>
                  Find Blunders ({task.content.blundersCount})
                </h4>
                {[...Array(task.content.blundersCount)].map((_, i) => (
                  <div key={i} className="focus-answer-group">
                    <label className="focus-input-label">Blunder {i + 1}:</label>
                    <input 
                      className="focus-input"
                      placeholder="e.g., Qxe5?? or 8. Bxh2??"
                      value={answers.blunders?.[i] || ''}
                      onChange={e => updateAnswer(`blunder_${i}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tactics Identification */}
        {task.taskType === 'tactics_identification' && (
          <div>
            {task.content.items.map((item, index) => (
              <div 
                key={index} 
                className={`focus-puzzle-card ${index === currentIndex ? 'focus-puzzle-card-active' : ''}`}
              >
                <div className="focus-puzzle-content">
                  <div 
                    className="focus-puzzle-board"
                    onClick={() => openChessboardPopup(item.fen, item.fen.includes(' b ') ? 'black' : 'white', 'chessboard')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Chessboard 
                      position={item.fen}
                      boardWidth={300}
                      draggable={false}
                      orientation={item.fen.includes(' b ') ? 'black' : 'white'}
                    />
                  </div>
                  <div className="focus-puzzle-details">
                    <h4 className="focus-puzzle-number">Position {index + 1} of {task.content.items.length}</h4>
                    <p className="focus-puzzle-description">
                      What tactics pattern is this?
                    </p>
                    {/* Pick the tactic below. These are the choices — tap one. The
                        text box is only for a different pattern not listed here. */}
                    <label className="focus-input-label">Choose the tactic:</label>
                    <div className="focus-tactics-buttons">
                      {['Fork', 'Pin', 'Skewer', 'Discovered Attack', 'Double Check',
                        'Deflection', 'Hanging Piece', 'Back Rank Mate', 'Smothered Mate',
                        'Mate in 2', 'Attack f2/f7'].map(tactic => (
                        <button
                          key={tactic}
                          className={`focus-tactics-btn ${answers[index]?.toLowerCase() === tactic.toLowerCase() ? 'focus-tactics-btn-active' : ''}`}
                          onClick={() => updateAnswer(index, tactic)}
                        >
                          {tactic}
                        </button>
                      ))}
                    </div>
                    <label className="focus-input-label" style={{ marginTop: '12px', opacity: 0.85 }}>
                      Or type a different pattern:
                    </label>
                    <input
                      className="focus-input"
                      placeholder="Only if it's not one of the choices above"
                      value={answers[index] || ''}
                      onChange={e => updateAnswer(index, e.target.value)}
                      onFocus={() => setCurrentIndex(index)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Multiple Choice Questions */}
        {task.taskType === 'multiple_choice' && (
          <div>
            {task.content.items.map((item, index) => (
              <div 
                key={index} 
                className={`focus-puzzle-card ${index === currentIndex ? 'focus-puzzle-card-active' : ''}`}
              >
                <div className="focus-puzzle-content">
                  <div 
                    className="focus-puzzle-board"
                    onClick={() => openChessboardPopup(item.fen, item.fen.includes(' b ') ? 'black' : 'white', 'chessboard')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Chessboard 
                      position={item.fen}
                      boardWidth={300}
                      draggable={false}
                      orientation={item.fen.includes(' b ') ? 'black' : 'white'}
                    />
                  </div>
                  <div className="focus-puzzle-details">
                    <h4 className="focus-puzzle-number">Question {index + 1} of {task.content.items.length}</h4>
                    <p 
                      className="focus-puzzle-description" 
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '16px', 
                        marginBottom: '15px',
                        background: 'rgba(30, 41, 59, 0.85)',
                        backdropFilter: 'blur(10px)',
                        color: '#ffffff',
                        padding: '15px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {item.question}
                    </p>
                    
                    <div style={{ marginBottom: '15px' }}>
                      {item.options.map((option, optIdx) => (
                        <div 
                          key={optIdx}
                          className={`focus-option-btn ${answers?.answers?.[index] === option ? 'focus-option-btn-selected' : ''}`}
                          onClick={() => {
                            const newAnswers = [...(answers?.answers || [])];
                            newAnswers[index] = option;
                            setAnswers({...answers, answers: newAnswers});
                            setCurrentIndex(index);
                          }}
                          style={{
                            padding: '12px 15px',
                            margin: '8px 0',
                            border: answers?.answers?.[index] === option 
                              ? '2px solid #10b981' 
                              : '2px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            background: answers?.answers?.[index] === option 
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))' 
                              : 'rgba(30, 41, 59, 0.75)',
                            backdropFilter: 'blur(10px)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px',
                            fontWeight: answers?.answers?.[index] === option ? 'bold' : 'normal',
                            boxShadow: answers?.answers?.[index] === option 
                              ? '0 4px 8px rgba(16, 185, 129, 0.3)' 
                              : '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                    
                    <details style={{ marginTop: '15px' }}>
                      <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '13px' }}>
                        💭 Add explanation (optional)
                      </summary>
                      <textarea 
                        className="focus-textarea"
                        placeholder="Explain your reasoning..."
                        value={answers.explanations?.[index] || ''}
                        onChange={e => {
                          const newExplanations = {...(answers.explanations || {})};
                          newExplanations[index] = e.target.value;
                          setAnswers({...answers, explanations: newExplanations});
                        }}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '10px',
                          marginTop: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PGN Blunder Analysis */}
        {task.taskType === 'pgn_blunder_analysis' && (
          <div>
            <div className="focus-card" style={{ marginBottom: '20px' }}>
              <h4 className="focus-section-title">
                <span className="focus-section-title-icon">♟️</span>
                Paste Your Game PGN
              </h4>
              
              <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #93c5fd' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e40af' }}>ℹ️ Instructions:</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e40af' }}>
                  <li>Play a chess game on Lichess or Chess.com</li>
                  <li>Copy the PGN (game notation with moves)</li>
                  <li>Paste it below and select which side you played</li>
                  <li>Click "Analyze" — Stockfish analyzes <strong>both sides</strong></li>
                  <li>After analysis, you can switch between White and Black results</li>
                  <li>Goal: ≤ {task.content.blunderLimit} blunder{task.content.blunderLimit !== 1 ? 's' : ''} on your side to earn {task.scoring.blunderAnalysisPoints} points</li>
                </ul>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="focus-input-label">PGN Text:</label>
                <textarea 
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                  placeholder="[Event &quot;Rated Game&quot;]&#10;[Site &quot;https://lichess.org&quot;]&#10;...&#10;&#10;1. e4 e5 2. Nf3 Nc6 ..."
                  value={userPgn}
                  onChange={e => setUserPgn(e.target.value)}
                  disabled={analyzingPgn || pgnAnalysisResult}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="focus-input-label">Which side did you play?</label>
                <select 
                  style={{
                    width: '200px',
                    padding: '10px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  value={userSide}
                  onChange={e => setUserSide(e.target.value)}
                  disabled={analyzingPgn || pgnAnalysisResult}
                >
                  <option value="white">⚪ White</option>
                  <option value="black">⚫ Black</option>
                </select>
              </div>

              {!pgnAnalysisResult && (
                <button 
                  className="focus-btn focus-btn-primary"
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                  onClick={analyzePgn}
                  disabled={!userPgn.trim() || analyzingPgn}
                >
                  {analyzingPgn ? '⏳ Analyzing with Stockfish (60-120s)...' : '🔍 Analyze with Stockfish'}
                </button>
              )}

              {analyzingPgn && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>⚙️</div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#92400e' }}>Analyzing both sides...</div>
                      <div style={{ fontSize: '13px', color: '#92400e', marginTop: '3px' }}>
                        Stockfish is checking every move for both White and Black. This may take 60-120 seconds.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pgnAnalysisResult && (() => {
                // Get the data for the currently viewed side
                const sideData = pgnAnalysisResult[viewSide] || { totalBlunders: 0, totalMistakes: 0, totalInaccuracies: 0, blundersFound: [], allIssues: [] };
                const isUserSide = viewSide === userSide;
                const passed = sideData.totalBlunders <= (task.content?.blunderLimit || 3);
                
                return (
                <div style={{ marginTop: '20px' }}>
                  {/* Side Toggle Tabs */}
                  <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #d1d5db' }}>
                    {['white', 'black'].map(s => {
                      const sd = pgnAnalysisResult[s] || { totalBlunders: 0, totalMistakes: 0, totalInaccuracies: 0 };
                      const isActive = viewSide === s;
                      const isUser = s === userSide;
                      return (
                        <button 
                          key={s}
                          onClick={() => {
                            setViewSide(s);
                            // Update answers to use this side's blunders for submission
                            if (s === userSide) {
                              const sd2 = pgnAnalysisResult[s] || { blundersFound: [], allIssues: [] };
                              setAnswers({ pgn: userPgn, side: s, blundersFound: sd2.blundersFound, allIssues: sd2.allIssues });
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            background: isActive ? (s === 'white' ? '#f3f4f6' : '#1f2937') : '#fff',
                            color: isActive ? (s === 'white' ? '#1f2937' : '#f9fafb') : '#6b7280',
                            transition: 'all 0.2s'
                          }}
                        >
                          {s === 'white' ? '⚪' : '⚫'} {s.charAt(0).toUpperCase() + s.slice(1)}
                          {isUser && ' (You)'}
                          <div style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '4px' }}>
                            {sd.totalBlunders > 0 && <span style={{ color: '#dc2626' }}>💥{sd.totalBlunders} </span>}
                            {sd.totalMistakes > 0 && <span style={{ color: '#ea580c' }}>⚠️{sd.totalMistakes} </span>}
                            {sd.totalInaccuracies > 0 && <span style={{ color: '#2563eb' }}>❓{sd.totalInaccuracies}</span>}
                            {sd.totalBlunders === 0 && sd.totalMistakes === 0 && sd.totalInaccuracies === 0 && <span style={{ color: '#10b981' }}>✅ Clean</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pass/Fail Banner — only shown for the user's side */}
                  {isUserSide && (
                    <div style={{ 
                      background: passed ? '#d1fae5' : '#fee2e2',
                      padding: '20px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      marginBottom: '20px',
                      border: `2px solid ${passed ? '#10b981' : '#ef4444'}`
                    }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
                        {passed ? '✅ PASSED!' : '❌ FAILED'}
                      </h3>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: passed ? '#166534' : '#dc2626' }}>
                        {sideData.totalBlunders} blunder{sideData.totalBlunders !== 1 ? 's' : ''} found on your side
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                        {sideData.totalMistakes > 0 && (
                          <span>⚠️ {sideData.totalMistakes} mistake{sideData.totalMistakes !== 1 ? 's' : ''}</span>
                        )}
                        {sideData.totalInaccuracies > 0 && (
                          <span>❓ {sideData.totalInaccuracies} inaccurac{sideData.totalInaccuracies !== 1 ? 'ies' : 'y'}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                        Limit: {task.content.blunderLimit} blunders · Lichess Win% model · Depth: {pgnAnalysisResult.depth || 18}
                      </div>
                    </div>
                  )}

                  {/* Opponent side info banner */}
                  {!isUserSide && (
                    <div style={{ 
                      background: '#f3f4f6',
                      padding: '15px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      marginBottom: '20px',
                      border: '2px solid #d1d5db'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                        Opponent's ({viewSide}) analysis
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                        {sideData.totalBlunders} blunder{sideData.totalBlunders !== 1 ? 's' : ''}, {sideData.totalMistakes} mistake{sideData.totalMistakes !== 1 ? 's' : ''}, {sideData.totalInaccuracies} inaccurac{sideData.totalInaccuracies !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                  )}

                  {/* Issue list for the viewed side */}
                  {sideData.allIssues && sideData.allIssues.length > 0 && (
                    <div>
                      <h5 style={{ marginTop: '20px', marginBottom: '10px', fontSize: '16px', color: '#1f2937' }}>
                        📊 {viewSide === 'white' ? '⚪ White' : '⚫ Black'} Move Analysis:
                      </h5>
                      {sideData.allIssues.map((issue, idx) => {
                        const colors = {
                          blunder: { bg: '#fff', border: '#fca5a5', badge: '#dc2626', badgeBg: '#fee2e2', icon: '💥' },
                          mistake: { bg: '#fff', border: '#fdba74', badge: '#ea580c', badgeBg: '#ffedd5', icon: '⚠️' },
                          inaccuracy: { bg: '#fff', border: '#93c5fd', badge: '#2563eb', badgeBg: '#dbeafe', icon: '❓' }
                        };
                        const c = colors[issue.classification] || colors.inaccuracy;
                        return (
                          <div 
                            key={idx}
                            style={{
                              padding: '12px',
                              margin: '10px 0',
                              background: c.bg,
                              border: `2px solid ${c.border}`,
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                              <span style={{ 
                                background: c.badgeBg, color: c.badge, padding: '2px 8px', 
                                borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize'
                              }}>
                                {c.icon} {issue.classification}
                              </span>
                              <span style={{ fontWeight: 'bold' }}>
                                Move {issue.moveNumber}: <span style={{ color: c.badge }}>{issue.move}</span>
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>
                              Win chance: {issue.winChanceBefore}% → {issue.winChanceAfter}%
                              <span style={{ color: c.badge, fontWeight: 'bold' }}> (−{issue.winChanceDrop}%)</span>
                            </div>
                            {issue.evalWhiteBefore !== undefined && issue.evalWhiteAfter !== undefined && (
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '3px' }}>
                                Eval: {issue.evalWhiteBefore > 0 ? '+' : ''}{(issue.evalWhiteBefore / 100).toFixed(2)} → {issue.evalWhiteAfter > 0 ? '+' : ''}{(issue.evalWhiteAfter / 100).toFixed(2)}
                              </div>
                            )}
                            <div style={{ fontSize: '13px', color: '#10b981' }}>
                              <strong>Better move:</strong> {issue.bestMove}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(!sideData.allIssues || sideData.allIssues.length === 0) && (
                    <div style={{ 
                      padding: '20px',
                      background: '#d1fae5',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#166534',
                      border: '2px solid #10b981'
                    }}>
                      🎉 Excellent! No blunders, mistakes, or inaccuracies detected for {viewSide}.
                    </div>
                  )}

                  <button 
                    className="focus-btn focus-btn-secondary"
                    style={{ marginTop: '15px' }}
                    onClick={() => {
                      setPgnAnalysisResult(null);
                      setUserPgn('');
                      setUserSide('white');
                      setViewSide('white');
                      setAnswers({ pgn: '', side: 'white', blundersFound: null });
                    }}
                  >
                    🔄 Analyze Another Game
                  </button>
                </div>
                );
              })()}
            </div>

            {pgnAnalysisResult && (
              <div className="focus-card" style={{ background: '#fffbeb', padding: '15px', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                  <strong>Ready to submit:</strong> Analysis complete. Click "Submit Answers" below to complete this day.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="focus-submit-section">
          {task.taskType === 'puzzles' && puzzleDone.length > 0 && puzzleDone.every(Boolean) ? (
            <button
              className="focus-btn focus-btn-success focus-btn-large focus-btn-disabled"
              disabled
            >
              ⏳ Auto-submitting...
            </button>
          ) : (
            <button 
              className={`focus-btn focus-btn-success focus-btn-large ${submitting ? 'focus-btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '⏳ Submitting...' : '✓ Submit Answers'}
            </button>
          )}
        </div>
      </div>

      {/* Chessboard Popup Modal */}
      {showChessboardPopup && popupChessboardData && (
        <div className="focus-popup-overlay" onClick={closeChessboardPopup}>
          <button className="focus-popup-close" onClick={closeChessboardPopup}>
            ✕
          </button>
          <div className="focus-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="focus-popup-chessboard">
              {popupChessboardData.type === 'chessboard' ? (
                <Chessboard 
                  position={popupChessboardData.fen}
                  boardWidth={Math.min(window.innerWidth * 0.9, 450)}
                  draggable={false}
                  orientation={popupChessboardData.orientation}
                  coordinateSides={['bottom', 'left']}
                />
              ) : (
                <PGNChessboard 
                  pgn={popupChessboardData.fen} 
                  boardWidth={Math.min(window.innerWidth * 0.9, 450)}
                  coordinateSides={['bottom', 'left']}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}