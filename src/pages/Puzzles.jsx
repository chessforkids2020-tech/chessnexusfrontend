import React, { useState, useEffect, useRef } from 'react';
import SEO from '../components/SEO';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import stockfishService from '../services/stockfishService';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { trackEvent } from '../lib/analytics';
import PuzzleReviewPanel from '../components/PuzzleReviewPanel';
import './Puzzles.css';

const API = import.meta.env.VITE_API_URL || '';

// Enhanced sound generation for puzzles
const playSound = (type) => {
  const soundMethods = {
    'correct': () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    },
    'wrong': () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    },
    'complete': () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (i * 0.1));
        gain.gain.setValueAtTime(0, now + (i * 0.1));
        gain.gain.linearRampToValueAtTime(0.08, now + (i * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.3);
        osc.start(now + (i * 0.1));
        osc.stop(now + (i * 0.1) + 0.3);
      });
    }
  };

  try {
    if (soundMethods[type]) {
      soundMethods[type]();
    }
  } catch (err) {
  }
};

// Check if date is "today" according to Indian Standard Time (IST)
const isToday = (date) => {
  if (!date) return false;
  
  // Since we want IST-based days, convert UTC date to IST and compare date components
  const dateObj = new Date(date);
  const now = new Date();
  
  // Add IST offset (5.5 hours) to both dates to compare in IST
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const dateInIST = new Date(dateObj.getTime() + istOffset);
  const nowInIST = new Date(now.getTime() + istOffset);
  
  return dateInIST.getUTCDate() === nowInIST.getUTCDate() &&
         dateInIST.getUTCMonth() === nowInIST.getUTCMonth() &&
         dateInIST.getUTCFullYear() === nowInIST.getUTCFullYear();
};

export default function Puzzles() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [puzzle, setPuzzle] = useState(null);
  const [fen, setFen] = useState('start');
  const [points, setPoints] = useState(0);
  const [turn, setTurn] = useState('user'); // 'user' or 'bot'
  const [message, setMessage] = useState('Initializing engine...');
  const [gameOver, setGameOver] = useState(false);
  const [stockfishReady, setStockfishReady] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const moveIndexRef = useRef(0);
  const [solution, setSolution] = useState([]);
  const [boardWidth, setBoardWidth] = useState(600);
  const [orientation, setOrientation] = useState('white');
  
  // Responsive board size — proportional to viewport so it looks the same
  // on every screen size and Windows DPI scaling level.
  useEffect(() => {
    const updateBoardSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setBoardWidth(Math.min(320, width - 40));
      } else if (width <= 768) {
        setBoardWidth(Math.min(450, width - 60));
      } else if (width <= 1024) {
        // ~35 % of viewport, capped at 480
        setBoardWidth(Math.min(480, Math.floor(width * 0.35)));
      } else {
        // ~32 % of viewport on large/wide screens, capped at 600
        setBoardWidth(Math.min(600, Math.floor(width * 0.32)));
      }
    };
    
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);
  
  // Daily Mode State
  const [dailyBatch, setDailyBatch] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [dailyStatus, setDailyStatus] = useState('loading'); // 'loading', 'active', 'summary', 'locked'
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [localRating, setLocalRating] = useState(null);

  // Guest puzzle state
  const [showGuestLoginPopup, setShowGuestLoginPopup] = useState(false);
  const GUEST_PUZZLE_LIMIT = 5;
  const GUEST_KEY = 'guest_puzzle_done'; // sessionStorage key

  const getGuestDoneCount = () => {
    try { return parseInt(sessionStorage.getItem(GUEST_KEY) || '0', 10); } catch { return 0; }
  };
  const incGuestDoneCount = () => {
    try { sessionStorage.setItem(GUEST_KEY, String(getGuestDoneCount() + 1)); } catch {}
  };

  // Skip Confirmation Modal
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  
  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const chessRef = useRef(new Chess());
  const processingRef = useRef(false);
  const puzzlePointsRef = useRef(0);
  const puzzleStartTimeRef = useRef(0); // when current puzzle was loaded (for solve time)
  const rightPanelRef = useRef(null);
  const failedStepRef = useRef(false);
  const perfectSolveRef = useRef(true); // Track if solve was perfect (best moves only)
  const penaltyAppliedRef = useRef(false); // Track if penalty was already subtracted locally
  const puzzleAlreadyFailedRef = useRef(false); // Track if current puzzle has been submitted as wrong
  const wrongMoveMadeRef = useRef(false); // Track if a wrong move was just made (for immediate undo)
  
  // Resizing refs
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  
  useEffect(() => {
    if (user && localRating === null) {
      setLocalRating(user.liveRating || 1200);
    }
  }, [user, localRating]);

  const totalPoints = localRating !== null ? localRating : (user?.liveRating || 1200);

  const calculateSessionStats = () => {
    // Always prioritize calculating from dailyBatch if available, as it's more reliable
    if (dailyBatch && dailyBatch.length > 0) {
      const correct = dailyBatch.filter(p => p.isSolved && p.isCorrect).length;
      const wrong = dailyBatch.filter(p => p.isSolved && !p.isCorrect).length;
      if (correct + wrong > 0) return { correct, wrong };
    }
    
    // Fallback to backend stats if dailyBatch not available
    if (dailyStats && (dailyStats.correct > 0 || dailyStats.wrong > 0)) {
      return { correct: dailyStats.correct, wrong: dailyStats.wrong };
    }
    
    return { correct: 0, wrong: 0 };
  };

  const sessionStats = calculateSessionStats();

  // Initialize Stockfish
  useEffect(() => {
    const initEngine = async () => {
      try {
        if (!stockfishService.isReady()) {
          await stockfishService.init();
        }
        setStockfishReady(true);
      } catch (err) {
        setMessage('Engine failed to load. Please refresh.');
      }
    };
    initEngine();
  }, []);

  // Session storage removed - was causing cross-player contamination

  // Resize handlers with touch support
  const handleManualResizeStart = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = boardWidth;
    
    // Add both mouse and touch listeners
    document.addEventListener('mousemove', handleManualResizeMove);
    document.addEventListener('mouseup', handleManualResizeEnd);
    document.addEventListener('touchmove', handleManualResizeMove, { passive: false });
    document.addEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'nwse-resize';
  };
  
  const handleManualResizeMove = (e) => {
    if (!resizingRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startXRef.current;
    // Get the right panel width to ensure we don't exceed it
    const rightPanelWidth = rightPanelRef.current ? rightPanelRef.current.clientWidth - 40 : 800;
    const maxWidth = Math.min(800, rightPanelWidth);
    const newWidth = Math.max(300, Math.min(maxWidth, startWidthRef.current + deltaX));
    setBoardWidth(newWidth);
  };
  
  const handleManualResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleManualResizeMove);
    document.removeEventListener('mouseup', handleManualResizeEnd);
    document.removeEventListener('touchmove', handleManualResizeMove);
    document.removeEventListener('touchend', handleManualResizeEnd);
    document.body.style.cursor = 'default';
  };

  // SKIP CONFIRMATION FUNCTIONS
  const handleSkipClick = () => {
    if (gameOver) {
      handleNextDailyPuzzle();
    } else {
      setShowSkipConfirm(true);
    }
  };

  const confirmSkip = async () => {
    setShowSkipConfirm(false);

    // Guest: just count it and move on — no API call
    if (!user) {
      incGuestDoneCount();
      setDailyBatch(prev => {
        const nb = [...prev];
        if (nb[currentBatchIndex]) nb[currentBatchIndex] = { ...nb[currentBatchIndex], isSolved: true, isCorrect: false };
        return nb;
      });
      if (soundEnabled) playSound('wrong');
      const newDone = getGuestDoneCount();
      if (newDone >= GUEST_PUZZLE_LIMIT) {
        setTimeout(() => { setShowGuestLoginPopup(true); setDailyStatus('locked'); }, 400);
      } else {
        handleNextDailyPuzzle();
      }
      return;
    }

    // SKIP = WRONG: Mark current puzzle as wrong with penalty
    if (puzzle && !puzzleAlreadyFailedRef.current) {
      failedStepRef.current = true;
      puzzleAlreadyFailedRef.current = true;
      penaltyAppliedRef.current = true;
      
      // Apply penalty
      const penaltyPoints = calculatePenalty(puzzle?.rating || 1200);
      setLocalRating(prev => prev + penaltyPoints);
      
      // Submit as WRONG (skip counts as wrong)
      try {
        const res = await api.post(`/api/public/training/submit`, {
          puzzleId: puzzle._id,
          isCorrect: false, // SKIP = WRONG
          quality: 'skip',
          failedStep: true
        });
        
        if (res.data.newRating !== undefined) {
          setLocalRating(res.data.newRating);
        }
        
        setDailyStats(res.data.stats);
        
        // Update local batch - mark as solved and WRONG
        setDailyBatch(prev => {
          const newBatch = [...prev];
          if (newBatch[currentBatchIndex]) {
            newBatch[currentBatchIndex] = {
              ...newBatch[currentBatchIndex],
              isSolved: true,
              isCorrect: false, // SKIP = WRONG
              pointsEarned: penaltyPoints // Store negative penalty
            };
          }
          return newBatch;
        });
        
        refreshUser();
      } catch (err) {
      }
      
      // Play wrong sound
      if (soundEnabled) playSound('wrong');
    }
    
    // Move to next puzzle
    handleNextDailyPuzzle();
  };

  const cancelSkip = () => {
    setShowSkipConfirm(false);
  };

  const fetchDailyState = async () => {
    // ── GUEST path ────────────────────────────────────────────────────────────
    if (!user) {
      const doneSoFar = getGuestDoneCount();
      if (doneSoFar >= GUEST_PUZZLE_LIMIT) {
        setShowGuestLoginPopup(true);
        setDailyStatus('locked');
        setMessage('Guest limit reached.');
        return;
      }
      try {
        setMessage('Loading Daily Puzzles...');
        const res = await api.get('/api/public/training/guest-puzzles');
        const puzzles = (res.data.puzzles || []).map(p => ({ ...p, isSolved: false, isCorrect: false }));
        if (!puzzles.length) { setMessage('No puzzles available.'); setDailyStatus('locked'); return; }
        setDailyBatch(puzzles);
        setDailyStats({ correct: 0, wrong: 0 });
        const startIdx = doneSoFar;
        if (startIdx >= puzzles.length) {
          setShowGuestLoginPopup(true);
          setDailyStatus('locked');
        } else {
          setDailyStatus('active');
          setCurrentBatchIndex(startIdx);
          loadPuzzle(puzzles[startIdx]);
        }
      } catch (err) {
        setMessage('Error loading puzzles');
      }
      return;
    }

    // ── Logged-in user path ───────────────────────────────────────────────────
    try {
      setMessage('Loading Daily Puzzles...');
      const res = await api.get(`/api/public/training/puzzles`);
      
      if (res.data.dailyLimitReached) {
        setDailyStatus('locked');
        setDailyStats(res.data.stats);
        if (res.data.puzzles && res.data.puzzles.length > 0) {
          setDailyBatch(res.data.puzzles);
        }
        setMessage('All daily puzzles completed!');
        return;
      }

      if (res.data.completedAll) {
        setMessage('No more puzzles available!');
        setDailyStatus('locked');
        return;
      }

      // Check if all puzzles in batch are solved
      if (res.data.puzzles && res.data.puzzles.length > 0) {
        const allSolved = res.data.puzzles.every(p => p.isSolved);
        const totalPuzzlesInBatch = res.data.puzzles.length;
        if (allSolved && res.data.progress >= totalPuzzlesInBatch) {
          setDailyStatus('summary');
          setDailyBatch(res.data.puzzles);
          setDailyStats(res.data.stats);
          return;
        }
      }

      setDailyBatch(res.data.puzzles);
      setDailyStats(res.data.stats);
      
      const firstUnsolved = res.data.puzzles.findIndex(p => !p.isSolved);
      if (firstUnsolved === -1) {
        setDailyStatus('summary');
      } else {
        setDailyStatus('active');
        setCurrentBatchIndex(firstUnsolved);
        loadPuzzle(res.data.puzzles[firstUnsolved]);
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setDailyStatus('locked');
        setDailyStats(err.response.data.stats);
        setMessage('All daily puzzles completed!');
      } else {
        setMessage('Error loading daily puzzles');
      }
    }
  };

  const loadPuzzle = (p) => {
    if (p) trackEvent('puzzle_started', { puzzleId: p._id || p.id || null, mode: 'daily', isGuest: !user });
    puzzleStartTimeRef.current = Date.now();
    setPuzzle(p);
    const game = new Chess(p.fen || 'start');
    chessRef.current = game;
    setFen(game.fen());
    setOrientation(game.turn() === 'w' ? 'white' : 'black');
    setGameOver(false);
    setPoints(0);
    setTurn('user');
    setMoveIndex(0);
    moveIndexRef.current = 0;
    puzzlePointsRef.current = 0;
    perfectSolveRef.current = true;
    processingRef.current = false;
    wrongMoveMadeRef.current = false;
    
    // Reset all failure tracking flags for this puzzle attempt
    // Each player gets their own fresh attempt - no cross-contamination
    failedStepRef.current = false;
    puzzleAlreadyFailedRef.current = p.isSolved; // Only if already solved in THIS session
    penaltyAppliedRef.current = false;
    
    // Parse solution
    let sol = [];
    if (Array.isArray(p.solution)) {
      sol = p.solution;
    } else if (typeof p.solution === 'string') {
      sol = p.solution.split(/[, ]+/).filter(Boolean);
    }
    setSolution(sol);
    
    if (sol.length === 0) {
    }
    
    setMessage('Your Turn');
  };

  const handlePuzzleCompletion = async (isCorrect, pointsToSave) => {
    if (isCorrect) trackEvent('puzzle_solved', { mode: 'daily', isGuest: !user, solveTimeMs: puzzleStartTimeRef.current ? Date.now() - puzzleStartTimeRef.current : 0 });
    // ── Guest: track locally, no API call ────────────────────────────────────
    if (!user) {
      incGuestDoneCount();
      if (soundEnabled) playSound(isCorrect ? 'correct' : 'wrong');
      setDailyBatch(prev => {
        const nb = [...prev];
        if (nb[currentBatchIndex]) nb[currentBatchIndex] = { ...nb[currentBatchIndex], isSolved: true, isCorrect };
        return nb;
      });
      const newDone = getGuestDoneCount();
      if (newDone >= GUEST_PUZZLE_LIMIT) {
        setTimeout(() => { setShowGuestLoginPopup(true); setDailyStatus('locked'); }, 1200);
      }
      return;
    }

    // If we already submitted a failure for this puzzle, don't submit again
    if (puzzleAlreadyFailedRef.current) {
      if (isCorrect) {
        setMessage("Puzzle Solved (Practice)");
        if (soundEnabled) playSound('complete');
      } else {
        if (soundEnabled) playSound('wrong');
      }
      return;
    }

    try {
      const quality = perfectSolveRef.current ? 'best' : 'good';
      const failedStep = failedStepRef.current;
      
      // Play completion sound
      if (soundEnabled) {
        if (isCorrect) {
          if (failedStep) {
            playSound('complete');
          } else {
            playSound('correct');
          }
        } else {
          playSound('wrong');
        }
      }
      
      // Mark as failed for this session only (no sessionStorage cross-contamination)
      if (!isCorrect && puzzle) {
        puzzleAlreadyFailedRef.current = true;
      }

      // Submit to backend
      // isCorrect: true = perfect solve (no wrong moves) -> get points
      // isCorrect: false = wrong moves OR skip -> get PENALTY
      const res = await api.post(`/api/public/training/submit`, {
        puzzleId: puzzle._id,
        isCorrect,
        quality: isCorrect ? quality : (quality === 'skip' ? 'skip' : 'wrong'),
        failedStep,
        points: pointsToSave,
        totalPuzzlesInBatch: dailyBatch.length
      });
      

      setDailyStats(res.data.stats);
      if (res.data.newRating !== undefined) {
        setLocalRating(res.data.newRating);
      }
      
      setDailyBatch(prev => {
        const newBatch = [...prev];
        if (newBatch[currentBatchIndex]) {
          const isPerfect = isCorrect && !failedStep;
          newBatch[currentBatchIndex] = {
            ...newBatch[currentBatchIndex],
            isSolved: true,
            isCorrect: isPerfect,
            pointsEarned: isCorrect ? (pointsToSave || 0) : (res.data.pointsChange || 0) // Store penalty for wrong
          };
        }
        return newBatch;
      });

      refreshUser();
      
      // Don't auto-redirect to summary - let user click "Next" button
      // The summary will show when they try to go to the next puzzle
      if (!res.data.batchCompleted) {
        setMessage(isCorrect ? 'Correct!' : 'Wrong!');
      }
    } catch (err) {
    }
  };
  
  const handleNextDailyPuzzle = () => {
    // Guest: check if limit hit before moving to next
    if (!user && getGuestDoneCount() >= GUEST_PUZZLE_LIMIT) {
      setShowGuestLoginPopup(true);
      setDailyStatus('locked');
      return;
    }
    const nextIndex = currentBatchIndex + 1;
    if (nextIndex < dailyBatch.length) {
      // Guest: don't go past their limit
      if (!user && nextIndex >= GUEST_PUZZLE_LIMIT) {
        setShowGuestLoginPopup(true);
        setDailyStatus('locked');
        return;
      }
      setCurrentBatchIndex(nextIndex);
      loadPuzzle(dailyBatch[nextIndex]);
    } else {
      if (!user) {
        setShowGuestLoginPopup(true);
        setDailyStatus('locked');
      } else {
        setDailyStatus('summary');
      }
    }
  };

  useEffect(() => {
    if (stockfishReady && !authLoading) {
      if (dailyStatus === 'summary' || dailyStatus === 'locked') return;
      if (puzzle && dailyStatus === 'active') return;

      // Allow both logged-in and guest users
      fetchDailyState();
    }
  }, [stockfishReady, user, authLoading, dailyStatus, puzzle]);

  // Handle bot moves automatically
  useEffect(() => {
    if (turn === 'bot' && !gameOver && dailyStatus === 'active' && !processingRef.current && !wrongMoveMadeRef.current) {
      processingRef.current = true;
      
      // Small delay to ensure UI updates
      setTimeout(() => {
        handleBotMove().finally(() => {
          processingRef.current = false;
        });
      }, 100);
    }
  }, [turn, gameOver, dailyStatus]);

  // HELPER FUNCTIONS
  const calculatePenalty = (rating) => {
    if (rating < 1000) return -15;
    if (rating < 1400) return -12;
    if (rating < 1700) return -10;
    if (rating < 2000) return -6;
    return -3;
  };

  const getBasePoints = (rating) => {
    if (rating < 1000) return 3;
    if (rating < 1400) return 5;
    if (rating < 1700) return 12;
    if (rating < 2000) return 18;
    return 25;
  };

  const calculateFinalPoints = (puzzleRating, isFailed, isPerfect) => {
    // NEW LOGIC: If user made a wrong move, they get ZERO points
    if (isFailed) {
      return 0;
    }
    
    // Only calculate points if puzzle was solved perfectly (no wrong moves)
    if (isPerfect) {
      return getBasePoints(puzzleRating);
    } else {
      // Half points for non-best but still correct moves (only if no wrong moves)
      return Math.ceil(getBasePoints(puzzleRating) / 2);
    }
  };

  const checkLineSimilarity = (line1, line2) => {
    if (!line1 || !line2) return false;
    
    if (line1.type === 'mate' && line2.type === 'mate') {
      return Math.abs(line1.score - line2.score) <= 1;
    } else if (line1.type === 'cp' && line2.type === 'cp') {
      return Math.abs(line1.score - line2.score) <= 70;
    }
    
    return false;
  };

  const handleBotMove = async () => {

    if (gameOver) {
      return;
    }
    
    if (turn !== 'bot') {
      return;
    }
    
    const game = chessRef.current;
    const currentMoveIndex = moveIndexRef.current;

    if (game.moves().length === 1 && solution.length <= currentMoveIndex) {
      const forcedMove = game.moves()[0];
      game.move(forcedMove);
      setFen(game.fen());
      
      const nextIndex = currentMoveIndex + 1;
      setMoveIndex(nextIndex);
      moveIndexRef.current = nextIndex;
      
      if (game.isGameOver()) {
        setGameOver(true);
        setMessage('Game Over! ' + (game.isCheckmate() ? 'Checkmate' : 'Draw'));
        return;
      }
      
      setTurn('user');
      setMessage('Your Turn');
      return;
    }

    setMessage('Bot is thinking...');
    
    try {
      let move = null;
      
      if (solution.length > currentMoveIndex) {
        const sanOrUci = solution[currentMoveIndex];
        
        try {
          // First try: Parse as SAN notation (e.g., "Rxd8", "Nf3", "e4")
          move = game.move(sanOrUci);
        } catch (e) {
          // Second try: Check if it's valid UCI format (must be 4-5 chars and start with valid square)
          if (sanOrUci.length >= 4 && sanOrUci.length <= 5) {
            const from = sanOrUci.substring(0, 2);
            const to = sanOrUci.substring(2, 4);
            const promotion = sanOrUci.length > 4 ? sanOrUci.substring(4) : undefined;
            
            // Validate that 'from' and 'to' are valid chess squares (a-h, 1-8)
            const isValidSquare = (sq) => /^[a-h][1-8]$/.test(sq);
            
            if (isValidSquare(from) && isValidSquare(to)) {
              try {
                move = game.move({ from, to, promotion: promotion || 'q' });
              } catch (e2) { 
              }
            } else {
            }
          } else {
          }
        }
      } else {
        const result = await stockfishService.getBestMove(game.fen(), { depth: 8, moveTime: 500 });
        const uci = result.bestMove;
        if (uci) {
          move = game.move({ 
            from: uci.substring(0,2), 
            to: uci.substring(2,4), 
            promotion: uci.length > 4 ? uci.substring(4) : 'q' 
          });
        }
      }
      
      if (move) {
        setFen(game.fen());
        const nextIndex = currentMoveIndex + 1;
        setMoveIndex(nextIndex);
        moveIndexRef.current = nextIndex;
        
        // Check if puzzle is finished after bot move
        if (solution.length > 0 && nextIndex >= solution.length) {
          setGameOver(true);
          
          const finalPoints = calculateFinalPoints(
            puzzle?.rating || 1200,
            failedStepRef.current,
            perfectSolveRef.current
          );
          
          setPoints(finalPoints);
          setLocalRating(prev => prev + finalPoints);

          const cleanSuccess = !failedStepRef.current;
          const messageText = cleanSuccess 
            ? `Perfect Solve! +${finalPoints} points`
            : `Puzzle Solved (with retries) ${finalPoints > 0 ? `+${finalPoints} points` : ''}`;
          
          setMessage(messageText);
          handlePuzzleCompletion(true, finalPoints);
          return;
        }

        if (game.isGameOver()) {
          setGameOver(true);
          
          const finalPoints = calculateFinalPoints(
            puzzle?.rating || 1200,
            failedStepRef.current,
            perfectSolveRef.current
          );
          
          setPoints(finalPoints);
          setLocalRating(prev => prev + finalPoints);

          const cleanSuccess = !failedStepRef.current;
          const messageText = cleanSuccess 
            ? `Perfect Solve! +${finalPoints} points`
            : `Puzzle Solved (with retries) ${finalPoints > 0 ? `+${finalPoints} points` : ''}`;
            
          setMessage(messageText);
          handlePuzzleCompletion(true, finalPoints);
          return;
        }
        
        setTurn('user');
        setMessage('Your Turn');
      } else {
        setMessage("Bot failed to move.");
      }
    } catch (err) {
      setMessage('Bot failed to move');
    }
  };

  const onDrop = async (source, target) => {
    
    // Prevent moves if game is over or not user's turn
    if (gameOver) {
      return false;
    }
    
    if (turn !== 'user') {
      return false;
    }
    
    if (processingRef.current) {
      return false;
    }
    
    if (dailyStatus !== 'active') {
      return false;
    }
    
    const game = chessRef.current;
    const startFen = game.fen();
    
    let move = null;
    try {
      move = game.move({ from: source, to: target, promotion: 'q' });
    } catch (err) { 
      return false; 
    }
    
    if (!move) {
      return false;
    }
    
    
    // Store the move for potential undo
    const attemptedMove = { san: move.san, uci: move.from + move.to + (move.promotion || '') };
    
    processingRef.current = true;
    
    const uciMove = move.from + move.to + (move.promotion || '');
    const sanMove = move.san;
    const currentMoveIndex = moveIndexRef.current;
    
    const evaluateMove = async () => {
      setMessage('Verifying move...');
      
      // Helper function to normalize move notation by removing check (+) and checkmate (#) symbols
      const normalizeMove = (move) => {
        if (!move) return '';
        return move.replace(/[+#]/g, '');
      };
      
      // PRIMARY: Check against admin solution array
      if (solution.length > 0 && currentMoveIndex < solution.length) {
        const expectedMove = solution[currentMoveIndex];
        
        // Check if the user's move matches the expected solution (both SAN and UCI)
        // Normalize moves to ignore check (+) and checkmate (#) symbols
        const normalizedSan = normalizeMove(sanMove);
        const normalizedExpected = normalizeMove(expectedMove);
        
        // Lichess rule: accept the stored move, OR any move that delivers
        // immediate checkmate (covers "multiple ways to mate" — alternate mates
        // are valid). `game` already reflects the position after this move.
        const isAltMate = game.isCheckmate();

        if (normalizedSan === normalizedExpected || uciMove === expectedMove || isAltMate) {
          if (soundEnabled) playSound('correct');
          setMessage(failedStepRef.current ? 'Correct! (But penalty already applied)' : 'Perfect move!');
          return { correct: true, isBestMove: true };
        }

        // Move doesn't match admin solution - it's wrong
        return { correct: false, isBestMove: false };
      }
      
      // FALLBACK: Use Stockfish analysis only if no solution array or beyond solution length
      try {
        const result = await stockfishService.getBestMove(startFen, { 
          depth: 8, 
          moveTime: 800, 
          multipv: 2 
        });
        
        let lines = result.lines || [];
        const tempGame = new Chess(startFen);
        lines = lines.map(l => {
          try {
            const m = tempGame.move({ 
              from: l.move.substring(0,2), 
              to: l.move.substring(2,4), 
              promotion: l.move.length > 4 ? l.move.substring(4) : 'q' 
            });
            tempGame.undo(); 
            return { ...l, san: m.san };
          } catch {
            return { ...l, san: l.move };
          }
        });

        const topLine = lines[0]; 
        const secondLine = lines[1]; 
        
        const isBest = topLine && (uciMove === topLine.move);
        const isSecondBest = secondLine && (uciMove === secondLine.move);
        
        if (isBest) {
          if (soundEnabled) playSound('correct');
          setMessage(failedStepRef.current ? 'Best move! (But penalty already applied)' : 'Best move!');
          return { correct: true, isBestMove: true };
        } else if (isSecondBest) {
          const isSimilar = checkLineSimilarity(topLine, secondLine);
          if (isSimilar) {
            perfectSolveRef.current = false;
            if (soundEnabled) playSound('correct');
            setMessage(failedStepRef.current ? 'Good move (But penalty already applied)' : 'Good move!');
            return { correct: true, isBestMove: false };
          } else {
            return { correct: false, isBestMove: false };
          }
        } else {
          return { correct: false, isBestMove: false };
        }
      } catch (e) {
        return { correct: false, isBestMove: false };
      }
    };
    
    const evaluation = await evaluateMove();
    
    if (!evaluation.correct) {
      // Wrong move - undo it immediately and allow retry
      
      // Undo the wrong move
      game.undo();
      setFen(game.fen()); // Update board to previous position
      
      wrongMoveMadeRef.current = true;
      failedStepRef.current = true;
      
      // Apply penalty only once (first time) - but DON'T submit to backend yet
      if (!penaltyAppliedRef.current) {
        penaltyAppliedRef.current = true;
        const penaltyPoints = calculatePenalty(puzzle?.rating || 1200);
        setLocalRating(prev => prev + penaltyPoints);
        
        // Play wrong sound
        if (soundEnabled) playSound('wrong');
        
        setMessage(`Wrong move: ${attemptedMove.san}. Try again! (Penalty: ${penaltyPoints} points)`);
      } else {
        // For subsequent wrong moves in same puzzle, just play sound
        if (soundEnabled) playSound('wrong');
        setMessage(`Wrong move: ${attemptedMove.san}. Try again!`);
      }
      
      // Reset wrong move flag after a delay
      setTimeout(() => {
        wrongMoveMadeRef.current = false;
      }, 100);
      
      processingRef.current = false;
      return false; // Return false to indicate move was undone
    }
    
    // Move is correct
    wrongMoveMadeRef.current = false;
    
    // Update board with the correct move
    setFen(game.fen());
    
    const nextIndex = moveIndex + 1;
    setMoveIndex(nextIndex);
    moveIndexRef.current = nextIndex;
    
    // Check puzzle completion
    // Solution has ALL moves (user + bot alternating)
    const isPuzzleComplete = () => {
      
      // Check 1: Did we reach the end of the solution?
      if (solution.length > 0 && nextIndex >= solution.length) {
        return true;
      }
      
      // Check 2: Is the game over?
      if (game.isGameOver()) {
        return true;
      }
      
      return false;
    };
    
    if (isPuzzleComplete()) {
      // Puzzle completed successfully
      setGameOver(true);
      
      // Calculate final points - NEW LOGIC: If failedStep is true, get ZERO points
      let finalPoints = 0;
      if (!failedStepRef.current) {
        // Only calculate points if puzzle was solved without wrong moves
        finalPoints = calculateFinalPoints(
          puzzle?.rating || 1200,
          false, // Not failed since no wrong moves
          perfectSolveRef.current && evaluation.isBestMove
        );
      }
      
      // Update points and rating
      setPoints(finalPoints);
      setLocalRating(prev => prev + finalPoints);
      
      // IMPORTANT: If user made ANY wrong move, puzzle counts as WRONG (not just 0 points)
      const cleanSuccess = !failedStepRef.current;
      
      const messageText = cleanSuccess 
        ? `Perfect Solve! +${finalPoints} points`
        : `Puzzle Solved (with retries) ${finalPoints > 0 ? `+${finalPoints} points` : 'No points for retries'}`;
      
      setMessage(messageText);
      
      // Play completion sound only if points were earned
      if (soundEnabled && finalPoints > 0) {
        playSound('complete');
      } else if (soundEnabled && !cleanSuccess) {
        playSound('wrong');
      }
      
      // Submit to backend - WRONG MOVES = WRONG PUZZLE (with penalty)
      handlePuzzleCompletion(cleanSuccess, cleanSuccess ? finalPoints : 0);
      
      processingRef.current = false;
      return true;
    } else {
      // Puzzle not complete - bot's turn
      setTurn('bot');
      setMessage('Bot thinking...');
    }
    
    processingRef.current = false;
    return true;
  };

  // Reset daily training (for debugging)
  const handleResetDaily = async () => {
    if (window.confirm('Reset daily training? This will clear your progress for today.')) {
      try {
        // Clear local storage
        sessionStorage.clear();
        
        // Call backend reset endpoint
        await api.post(`/api/public/training/reset-today`, {});
        
        // Refresh the page
        window.location.reload();
      } catch (err) {
        alert('Reset failed. Please contact support.');
      }
    }
  };

  // STYLES
  const styles = {
    infoCard: {
      background: 'white',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    label: {
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#64748b',
      fontWeight: '600',
      marginBottom: '5px',
    },
    value: {
      fontSize: '18px',
      color: '#1e293b',
      fontWeight: '700',
    },
    scoreBox: {
      textAlign: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      borderRadius: '16px',
      color: 'white',
      boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
    },
    turnIndicator: {
      padding: '12px',
      borderRadius: '12px',
      textAlign: 'center',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      fontSize: '16px',
    },
    nextBtn: {
      marginTop: 'auto',
      padding: '15px',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: 'white',
      borderRadius: '16px',
      padding: '30px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#1e293b',
    },
    modalMessage: {
      color: '#64748b',
      marginBottom: '25px',
      lineHeight: '1.5',
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    modalCancelBtn: {
      padding: '10px 20px',
      background: '#e2e8f0',
      color: '#475569',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    modalConfirmBtn: {
      padding: '10px 20px',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    // Game overlay styles
    gameOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      borderRadius: '4px'
    },
    overlayContent: {
      background: 'white',
      padding: '30px',
      borderRadius: '12px',
      textAlign: 'center',
      maxWidth: '300px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
    }
  };

  return (
    <div className={`puzzles-container${(dailyStatus === 'summary' || dailyStatus === 'locked') ? ' summary-mode' : ''}`}>

      {/* Guest Login Popup — shown after 5 guest puzzles */}
      {showGuestLoginPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <h2 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Amazing! You solved 5 puzzles!</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
              Want to keep improving? Login to <strong style={{ color: '#60a5fa' }}>ChessNexus</strong> to unlock unlimited daily puzzles, track your rating, and compete on leaderboards!
            </p>
            <a
              href="/login"
              style={{ display: 'block', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 16, marginBottom: 14, boxShadow: '0 4px 15px rgba(59,130,246,0.4)' }}
            >
              Login to ChessNexus 🚀
            </a>
            <a
              href="/register"
              style={{ display: 'block', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', padding: '12px 28px', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 15, marginBottom: 14, border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Create Free Account
            </a>
            <button
              onClick={() => setShowGuestLoginPopup(false)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      <SEO
        title="Daily Chess Puzzles — Practice Tactics Online"
        description="Solve daily chess puzzles on Chess Nexus. Improve your tactics, earn rating points, and track your progress. Free interactive chess puzzles for all levels."
        keywords="daily chess puzzles, chess tactics online, free chess puzzles, chess nexus puzzles, improve chess tactics"
        canonical="/puzzles"
      />
      {showSkipConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalTitle}>Skip Puzzle?</div>
            <div style={styles.modalMessage}>
              {puzzle && (
                <div>
                  <p><strong style={{ color: '#ef4444' }}>⚠️ Skipping = WRONG Puzzle</strong></p>
                  <p>This puzzle is <strong>not completed</strong>. Skipping will:</p>
                  <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#475569' }}>
                    <li><strong>Mark it as WRONG</strong></li>
                    <li>Apply a rating penalty of <strong>{calculatePenalty(puzzle?.rating || 1200)} points</strong></li>
                    <li>Count as 1 wrong puzzle in your daily stats</li>
                  </ul>
                  <p>Do you want to continue?</p>
                </div>
              )}
            </div>
            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancelBtn}
                onClick={cancelSkip}
                onMouseEnter={(e) => e.currentTarget.style.background = '#cbd5e1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                Cancel
              </button>
              <button 
                style={styles.modalConfirmBtn}
                onClick={confirmSkip}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
              >
                Skip (Mark as Wrong)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="puzzles-left-panel">

        {/* ── Top bar: sound toggle only ── */}
        <div className="lp-topbar">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`lp-sound-btn ${soundEnabled ? 'on' : 'off'}`}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* ── Hero rating block ── */}
        <div className="lp-hero">
          <div className="lp-hero-label">Your Rating</div>
          <div className="lp-hero-rating">{totalPoints || '—'}</div>
          <div className="lp-hero-tag">Puzzle Rating</div>

          {/* Who to move — inside hero, below rating */}
          {dailyStatus === 'active' && puzzle && (
            <div className="lp-who-to-move">
              <div className={`lp-simple-circle ${gameOver ? 'done' : orientation}`} />
              <span className={`lp-who-label ${
                gameOver ? 'done'
                : message.toLowerCase().includes('wrong') ? 'wrong'
                : message.toLowerCase().includes('correct') || message.toLowerCase().includes('perfect') || message.toLowerCase().includes('best') ? 'good'
                : ''
              }`}>
                {gameOver ? 'Puzzle Complete!' : `${orientation === 'white' ? 'White' : 'Black'} to move`}
              </span>
            </div>
          )}
        </div>

        {/* ── From the game ── */}
        {dailyStatus === 'active' && puzzle && puzzle.whoPlayed && (
          <div className="lp-from-game">
            <span className="lp-from-icon">♟</span>
            <div>
              <div className="lp-from-label">From the game</div>
              <div className="lp-from-value">{puzzle.whoPlayed}</div>
            </div>
          </div>
        )}

        {/* ── Puzzle difficulty badge (if puzzle.rating exists) ── */}
        {dailyStatus === 'active' && puzzle && puzzle.rating && (
          <div className="lp-difficulty">
            <span className="lp-diff-label">Puzzle Difficulty</span>
            <span className={`lp-diff-badge ${puzzle.rating >= 1800 ? 'hard' : puzzle.rating >= 1400 ? 'medium' : 'easy'}`}>
              {puzzle.rating >= 1800 ? '🔥 Hard' : puzzle.rating >= 1400 ? '⚡ Medium' : '🌱 Easy'}
            </span>
          </div>
        )}

        {/* ── 5-dot progress track ── */}
        <div className="lp-progress">
          <div className="lp-progress-header">
            <span className="lp-progress-label">Today's Puzzles</span>
            <span className="lp-progress-frac">
              <strong>{sessionStats.correct + sessionStats.wrong}</strong> / 5
            </span>
          </div>
          <div className="lp-dots">
            {[0, 1, 2, 3, 4].map((idx) => {
              const isActive = idx === currentBatchIndex && dailyStatus === 'active';
              const puzzleData = dailyBatch && dailyBatch[idx];
              const isSolved = puzzleData?.isSolved;
              const isCorrect = puzzleData?.isCorrect;

              let cls = 'lp-dot pending';
              let inner = null;
              if (isActive) {
                cls = 'lp-dot active';
                inner = <span className="lp-dot-pulse" />;
              } else if (isSolved && isCorrect) {
                cls = 'lp-dot correct';
                inner = <span>✓</span>;
              } else if (isSolved && !isCorrect) {
                cls = 'lp-dot wrong';
                inner = <span>✕</span>;
              } else {
                inner = <span className="lp-dot-num">{idx + 1}</span>;
              }

              return (
                <div key={idx} className={cls}>{inner}</div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* ── CTA button ── */}
        {dailyStatus === 'active' && (
          <button className={`lp-cta ${gameOver ? 'next' : 'skip'}`} onClick={handleSkipClick}>
            {gameOver ? <>Next Puzzle <span>→</span></> : <>Skip <span style={{ opacity: 0.7 }}>→</span></>}
          </button>
        )}
      </div>

      <div className="puzzles-right-panel" ref={rightPanelRef}>
        
        {/* DAILY SUMMARY VIEW */}
        {(dailyStatus === 'summary' || dailyStatus === 'locked') && (
          <div className="training-completion-container has-review">

            {/* ── Top header bar ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src="/images/dailypuzzles.png"
                  alt="Daily Puzzles"
                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', marginTop: -16 }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>Training Complete! 🎉</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                    You finished today's {dailyBatch.length} puzzles
                  </div>
                </div>
              </div>

              {/* rating pill only */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 12, padding: '8px 24px',
              }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#60a5fa' }}>{totalPoints || '—'}</span>
                <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>Rating</span>
              </div>
            </div>

            {/* Puzzle Review — mini boards for all completed puzzles */}
            <PuzzleReviewPanel dailyBatch={dailyBatch} />
          </div>
        )}

        {/* LOADING STATE */}
        {dailyStatus === 'loading' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 1s infinite linear' }}>♞</div>
            <div style={{ fontSize: '18px', fontWeight: '500' }}>
              Preparing Daily Puzzles...
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* CHESSBOARD VIEW */}
        {dailyStatus === 'active' && (
          <div style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            opacity: gameOver ? 0.8 : 1,
            transition: 'opacity 0.3s'
          }}>
            {/* Game Over Overlay */}
            {gameOver && (
              <div style={styles.gameOverlay}>
                <div style={styles.overlayContent}>
                  <div style={{ fontSize: '24px', color: '#166534', marginBottom: '10px' }}>
                    ✓ Puzzle Complete!
                  </div>
                  <div style={{ fontSize: '18px', color: '#475569', marginBottom: '15px' }}>
                    {points > 0 ? `+${points} points` : 'Penalty applied'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                    {failedStepRef.current ? 'Solved with retries' : 'Perfect solve!'}
                  </div>
                  <button
                    onClick={handleNextDailyPuzzle}
                    style={{
                      padding: '12px 24px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    Next Puzzle →
                  </button>
                </div>
              </div>
            )}
            
            {/* Bot Thinking Overlay */}
            {dailyStatus === 'active' && turn === 'bot' && !gameOver && !wrongMoveMadeRef.current && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div>Bot is thinking...</div>
              </div>
            )}
            
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: '100%',
            }}>
              <Chessboard 
                position={fen} 
                onDrop={onDrop}
                boardWidth={boardWidth}
                orientation={orientation}
                draggable={!gameOver}
              />
              
              <div
                onMouseDown={handleManualResizeStart}
                onTouchStart={handleManualResizeStart}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '0',
                  height: '0',
                  borderStyle: 'solid',
                  borderWidth: '0 0 30px 30px',
                  borderColor: 'transparent transparent #3b82f6 transparent',
                  cursor: 'nwse-resize',
                  zIndex: 100,
                  opacity: 0.8,
                  touchAction: 'none'
                }}
                title="Drag to resize"
              />
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
