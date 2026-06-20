import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import stockfishService from '../services/stockfishService';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { trackEvent } from '../../lib/analytics';
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
  
  // Responsive board size
  useEffect(() => {
    const updateBoardSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        // Mobile: smaller board
        setBoardWidth(Math.min(320, width - 40));
      } else if (width <= 768) {
        // Tablet: medium board
        setBoardWidth(Math.min(450, width - 60));
      } else if (width <= 1024) {
        // Small desktop/large tablet
        setBoardWidth(470);
      } else {
        // Desktop: full size
        setBoardWidth(500);
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
    
    // Mark current puzzle as wrong with penalty
    if (puzzle && !failedStepRef.current) {
      failedStepRef.current = true;
      penaltyAppliedRef.current = true;
      
      // Apply penalty
      const penaltyPoints = calculatePenalty(puzzle?.rating || 1200);
      setLocalRating(prev => prev + penaltyPoints);
      
      // Submit as wrong
      try {
        const res = await api.post(`/api/public/training/submit`, {
          puzzleId: puzzle._id,
          isCorrect: false,
          quality: 'skip',
          failedStep: true
        });
        
        if (res.data.newRating !== undefined) {
          setLocalRating(res.data.newRating);
        }
        
        // Update local batch with penalty points
        setDailyBatch(prev => {
          const newBatch = [...prev];
          if (newBatch[currentBatchIndex]) {
            newBatch[currentBatchIndex] = {
              ...newBatch[currentBatchIndex],
              isSolved: true,
              isCorrect: false,
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
    if (!user) return;
    
    try {
      setMessage('Loading Daily Puzzles...');
      const res = await api.get(`/api/public/training/puzzles`);
      
      if (res.data.dailyLimitReached) {
        setDailyStatus('locked');
        setDailyStats(res.data.stats);
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
    if (p) trackEvent('puzzle_started', { puzzleId: p._id || p.id || null, mode: 'tournament', isGuest: !user });
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
    if (isCorrect) trackEvent('puzzle_solved', { mode: 'tournament', isGuest: !user, solveTimeMs: puzzleStartTimeRef.current ? Date.now() - puzzleStartTimeRef.current : 0 });
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

      const res = await api.post(`/api/public/training/submit`, {
        puzzleId: puzzle._id,
        isCorrect,
        quality,
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
    const nextIndex = currentBatchIndex + 1;
    if (nextIndex < dailyBatch.length) {
      setCurrentBatchIndex(nextIndex);
      loadPuzzle(dailyBatch[nextIndex]);
    } else {
      setDailyStatus('summary');
    }
  };

  useEffect(() => {
    if (stockfishReady && !authLoading) {
      if (dailyStatus === 'summary' || dailyStatus === 'locked') return;
      if (puzzle && dailyStatus === 'active') return;

      if (user) {
        fetchDailyState();
      }
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
    // Whether the user's move delivers immediate checkmate — covers positions
    // with multiple ways to mate where the alternate mate differs from the
    // single recorded solution move.
    const isAltMate = game.isCheckmate();
    
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
      
      // Submit to backend
      handlePuzzleCompletion(cleanSuccess, finalPoints);
      
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
    <div className="puzzles-container">
      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalTitle}>Skip Puzzle?</div>
            <div style={styles.modalMessage}>
              {puzzle && (
                <div>
                  <p>This puzzle is <strong>not completed</strong>. Skipping will:</p>
                  <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#475569' }}>
                    <li>Mark it as wrong</li>
                    <li>Apply a rating penalty of {calculatePenalty(puzzle?.rating || 1200)} points</li>
                    <li>Count towards your daily wrong puzzles</li>
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
                Skip Puzzle
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="puzzles-left-panel">
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#ffffff' }}>Daily Puzzles</h1>
          </div>
          {/* Sound toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: soundEnabled ? '#3b82f6' : '#94a3b8',
              padding: '5px'
            }}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Daily Progress Status Bars */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          justifyContent: 'center'
        }}>
          {[1, 2, 3, 4, 5].map((puzzleNumber) => {
            let bgColor = 'rgba(100, 116, 139, 0.3)'; // default glass gray
            let borderColor = 'rgba(100, 116, 139, 0.5)';
            let textColor = '#ffffff';
            let glowColor = 'transparent';
            
            if (dailyBatch && dailyBatch[puzzleNumber - 1]) {
              const puzzleData = dailyBatch[puzzleNumber - 1];
              if (puzzleData.isSolved) {
                if (puzzleData.isCorrect) {
                  bgColor = 'rgba(16, 185, 129, 0.3)'; // glass green
                  borderColor = 'rgba(16, 185, 129, 0.6)';
                  glowColor = 'rgba(16, 185, 129, 0.4)';
                } else {
                  bgColor = 'rgba(239, 68, 68, 0.3)'; // glass red
                  borderColor = 'rgba(239, 68, 68, 0.6)';
                  glowColor = 'rgba(239, 68, 68, 0.4)';
                }
              }
            }
            
            // Highlight current active puzzle
            if (puzzleNumber - 1 === currentBatchIndex && dailyStatus === 'active') {
              bgColor = 'rgba(59, 130, 246, 0.3)'; // glass blue
              borderColor = 'rgba(59, 130, 246, 0.7)';
              glowColor = 'rgba(59, 130, 246, 0.5)';
            }
            
            return (
              <div
                key={puzzleNumber}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                }}
              >
                {puzzleNumber}
              </div>
            );
          })}
        </div>

        {puzzle && dailyStatus === 'active' && (
          <></>
        )}

        <div style={{
          ...styles.turnIndicator,
          background: turn === 'user' ? '#dcfce7' : '#fee2e2',
          color: turn === 'user' ? '#166534' : '#991b1b',
          opacity: dailyStatus !== 'active' ? 0 : 1
        }}>
          {gameOver ? 'Puzzle Complete ✓' : (
            turn === 'user' 
            ? `${orientation.charAt(0).toUpperCase() + orientation.slice(1)} to Move` 
            : `${(orientation === 'white' ? 'Black' : 'White')} to Move`
          )}
        </div>

        {/* Rating Display */}
        <div style={{
          textAlign: 'center',
          marginBottom: '15px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '700', marginBottom: '4px' }}>
            Current Rating
          </div>
          <div style={{ fontSize: '32px', color: '#ffffff', fontWeight: '800' }}>
            {totalPoints || 'Loading...'}
          </div>
        </div>

        <div style={{
          textAlign: 'center', 
          color: dailyStatus === 'active' ? '#64748b' : '#94a3b8', 
          fontStyle: dailyStatus === 'active' ? 'italic' : 'normal',
          minHeight: '24px',
          fontSize: dailyStatus === 'active' ? '14px' : '12px'
        }}>
          {message}
        </div>

        {dailyStatus === 'active' && (
          <button 
            style={styles.nextBtn}
            onClick={handleSkipClick}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {gameOver ? 'Next Puzzle ➔' : 'Skip Puzzle ➔'}
          </button>
        )}
      </div>

      <div className="puzzles-right-panel" ref={rightPanelRef}>
        
        {/* DAILY SUMMARY VIEW */}
        {(dailyStatus === 'summary' || dailyStatus === 'locked') && (
          <div className="training-completion-container">
            <div style={{ marginBottom: '25px' }}>
              <img 
                src="/images/dailypuzzles.png" 
                alt="Daily Puzzles" 
                style={{ width: '120px', height: 'auto', borderRadius: '16px' }}
              />
            </div>
            <h2 className="training-completion-title">Training Complete!</h2>
            <p className="training-completion-description">You've finished your daily batch of {dailyBatch.length} puzzles.</p>
            
            <div className="training-stats-grid">
              <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#166534' }}>{sessionStats.correct}</div>
                <div style={{ color: '#166534', fontWeight: '600', fontSize: '14px' }}>Correct</div>
              </div>
              <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#991b1b' }}>{sessionStats.wrong}</div>
                <div style={{ color: '#991b1b', fontWeight: '600', fontSize: '14px' }}>Wrong</div>
              </div>
            </div>

            <div className="current-rating-section">
              <div className="current-rating-label">Current Rating</div>
              <div className="current-rating-value">
                {totalPoints}
              </div>
            </div>
            
            <div className="puzzles-solved-section" style={{ marginBottom: '30px', textAlign: 'left', width: '100%' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>Puzzles Solved</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                {dailyBatch.map((p, i) => (
                  <div key={i} className="puzzle-completion-item">
                    <div className="puzzle-completion-details">
                      <div style={{ fontWeight: '700', color: '#334155' }}>Puzzle #{i+1}</div>

                      {p.isSolved ? (
                        <div className="puzzle-completion-meta">
                          <span style={{ fontWeight: 600, color: p.isCorrect ? '#10b981' : '#ef4444' }}>
                            {p.isCorrect ? 'Correct' : 'Wrong'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 600, color: '#64748b' }}>Not started</div>
                      )}
                    </div>

                    <div className="puzzle-points" style={{ textAlign: 'right', minWidth: '86px', fontWeight: 800, color: (p.pointsEarned || 0) >= 0 ? '#10b981' : '#991b1b' }}>
                      {p.isSolved ? (p.pointsEarned !== undefined && p.pointsEarned !== 0 ? `${p.pointsEarned > 0 ? `+${p.pointsEarned}` : p.pointsEarned} pts` : '0 pts') : ''}
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="training-completion-button">
              <button 
                onClick={() => { window.location.href = '/'; }}
                style={{ 
                  padding: '14px 28px', 
                  background: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  fontSize: '16px',
                  boxShadow: '0 6px 12px -3px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {dailyStatus === 'loading' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{
              width: '48px', height: '48px', margin: '0 auto 20px',
              border: '4px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.8)',
              borderRadius: '50%',
              animation: 'dp-spin 0.8s linear infinite'
            }} />
            <div style={{ fontSize: '18px', fontWeight: '500' }}>
              Preparing Daily Puzzles...
            </div>
            <style>{`
              @keyframes dp-spin {
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
