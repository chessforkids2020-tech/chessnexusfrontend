
// src/pages/PuzzleBoard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from '../api';
import socket from "../socket";
import { Chess } from "chess.js";
import Chessboard from "../components/Chessboard";
import stockfishService from "../services/stockfishService";
import { useAuth } from '../contexts/AuthContext';


// Add shake animation CSS
const shakeAnimation = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    transform: translateY(30px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

@keyframes glassGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5); }
}
`;

// Inject the animation into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = shakeAnimation;
  if (!document.head.querySelector('style[data-shake-animation]')) {
    styleSheet.setAttribute('data-shake-animation', 'true');
    document.head.appendChild(styleSheet);
  }
}

function TournamentPuzzle() {
  const { roundId, batchId, puzzleId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [lastMove, setLastMove] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [isUserTurn, setIsUserTurn] = useState(true); // User makes first move
  const [stockfishInitialized, setStockfishInitialized] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [gameMode, setGameMode] = useState('user-vs-stockfish'); // vs manual
  const [allMoves, setAllMoves] = useState([]); // Combined moves array
  const [competitionMode, setCompetitionMode] = useState(true); // Strict mode for competitions
  const [solutionMoveIndex, setSolutionMoveIndex] = useState(0); // Track position in admin solution
  const [usingAdminSolution, setUsingAdminSolution] = useState(true); // Always use admin solution
  const [attempts, setAttempts] = useState(0); // Track wrong attempts
  const [userAttempts, setUserAttempts] = useState([]); // Track all user move attempts
  const [showWrongMovePopup, setShowWrongMovePopup] = useState(false);
  const [wrongMoveMessage, setWrongMoveMessage] = useState('');

  // Additional state variables for UI
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [boardSize, setBoardSize] = useState(500); // Reduced initial size
  const [statusMsg, setStatusMsg] = useState('');

  // Missing state variables that are used in render
  const [chess, setChess] = useState(new Chess());
  const [timeLeft, setTimeLeft] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [moves, setMoves] = useState([]);
  const [autoMoves, setAutoMoves] = useState([]);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startSize, setStartSize] = useState(400);

  // Refs
  const headerRef = useRef(null);
  const timerRef = useRef(null);

  // Navigate to next puzzle or results page
  const navigateToNextPuzzle = () => {
    if (!batch || !batch.puzzles) {
      navigate(`/results/${batchId}`);
      return;
    }

    const currentIndex = batch.puzzles.findIndex(p => p._id === puzzleId);
    if (currentIndex === -1 || currentIndex >= batch.puzzles.length - 1) {
      // Last puzzle or not found, go to results
      navigate(`/results/${batchId}`);
    } else {
      // Go to next puzzle
      const nextPuzzle = batch.puzzles[currentIndex + 1];
      navigate(`/puzzle/${roundId}/${batchId}/${nextPuzzle._id}`);
    }
  };

  // Function to calculate current score based on solution matching
  const calculateCurrentScore = (userMoves, solution) => {
    // No scoring - just return 0
    return 0;
  };

  // Helper function to get next move from admin solution
  const getNextSolutionMove = () => {
    if (!puzzle.solution || puzzle.solution.length === 0) {
      return null;
    }
    // Use allMoves.length as the index for the next move
    const nextIndex = allMoves.length;
    if (nextIndex >= puzzle.solution.length) {
      return null;
    }
    const solutionMove = puzzle.solution[nextIndex];
    return solutionMove;
  };

  // Helper function to validate if user's move matches expected solution
  const isExpectedMove = (userMoveObj) => {
    if (!competitionMode || !puzzle.solution || puzzle.solution.length === 0) {
      return true; // Allow any move if not in competition mode or no solution
    }
    
    // The expected move index is simply the current number of moves made
    // allMoves contains all moves so far, so allMoves.length is the next move index
    const expectedMoveIndex = allMoves.length;
    
    if (expectedMoveIndex >= puzzle.solution.length) {
      return true; // Beyond solution, allow any move
    }
    
    const expectedMove = puzzle.solution[expectedMoveIndex];
    const userMove = userMoveObj.san;
    const userUci = `${userMoveObj.from}${userMoveObj.to}${userMoveObj.promotion || ''}`;
    
    // Check both SAN and UCI formats
    // Also check if moves match when ignoring check/checkmate symbols (+, #)
    const expectedMoveClean = expectedMove.replace(/[+#]/g, '');
    const userMoveClean = userMove.replace(/[+#]/g, '');
    
    const matchesSan = expectedMove === userMove;
    const matchesSanClean = expectedMoveClean === userMoveClean;
    const matchesUci = expectedMove === userUci;
    
    return matchesSan || matchesSanClean || matchesUci;
  };

  // Shake animation function
  const triggerShakeAnimation = (element) => {
    if (element) {
      element.style.animation = 'shake 0.6s ease-in-out';
      setTimeout(() => {
        element.style.animation = '';
      }, 600);
    }
  };

  // Show wrong move popup with auto-submit and navigation
  const showWrongMovePopupAndNavigate = (message) => {
    setWrongMoveMessage(message);
    setShowWrongMovePopup(true);
    
    // Auto-submit after 2 seconds and navigate to next puzzle
    setTimeout(() => {
      setShowWrongMovePopup(false);
      onSubmit(true); // Silent submission
      setTimeout(() => {
        navigateToNextPuzzle();
      }, 1000);
    }, 2000);
  };

  const makeStockfishMove = async (forceRun = false) => {
    // Only run when it's the bot's turn (i.e. NOT the user's turn) and not already thinking
    // Allow forceRun to bypass the guard check (used when called from onPieceDrop)
    if (!forceRun && isUserTurn || isThinking) {
      return;
    }

    setIsThinking(true);
    setStatusMsg("🤖 Bot following admin solution...");

    try {
      let nextMove = null;

      // First try to use admin solution
      const solutionMove = getNextSolutionMove();

      if (solutionMove) {
        // Use admin solution - try to apply it, with error handling
        nextMove = solutionMove;
        
        // Try to validate the move first to avoid crashes
        const testChess = new Chess(chess.fen());
        try {
          const moveResult = testChess.move(solutionMove);
          if (!moveResult) {
            throw new Error('Move validation failed');
          }
        } catch (validationError) {
          addDebugError(validationError, `Admin solution move invalid: ${solutionMove} at index ${solutionMoveIndex}`);
          
          // For now, try to find any legal move as emergency fallback
          const legalMoves = chess.moves();
          if (legalMoves.length > 0) {
            nextMove = legalMoves[0];
            setStatusMsg("⚠️ Solution move invalid - using fallback move");
          } else {
            // If the board is in a terminal state (checkmate/stalemate/draw), treat as success
            if (testChess.game_over && typeof testChess.game_over === 'function' && testChess.game_over()) {
              setStatusMsg("🎉 SUCCESS!");
            } else if (testChess.in_checkmate && typeof testChess.in_checkmate === 'function' && testChess.in_checkmate()) {
              setStatusMsg("🎉 SUCCESS!");
            } else if (testChess.in_stalemate && typeof testChess.in_stalemate === 'function' && testChess.in_stalemate()) {
              setStatusMsg("🎉 SUCCESS!");
            } else {
              setStatusMsg("❌ No valid moves available");
            }
            setIsThinking(false);
            return;
          }
        }
        
        setStatusMsg("✅ Bot following admin solution...");
      } else {
        // No admin solution available - use Stockfish analysis
        setStatusMsg("🤖 Bot analyzing with Stockfish...");
        
        // Get Stockfish move
        const fen = chess.fen();
        const analysis = await stockfishService.getBestMove(fen, { moveTime: 1000 }); // 1 second thinking time
        const botMove = analysis.bestMove;
        
        if (botMove) {
          nextMove = botMove;
          setStatusMsg("✅ Bot move calculated...");
        } else {
          // Stockfish failed - use any legal move as fallback
          const legalMoves = chess.moves();
          if (legalMoves.length > 0) {
            nextMove = legalMoves[0];
            setStatusMsg("⚠️ Stockfish failed - using random legal move");
          } else {
            setStatusMsg("🏁 Game ended - use Submit button when ready!");
            setIsThinking(false);
            return;
          }
        }
      }


      if (nextMove && nextMove !== '(none)') {
        // Apply the validated move
        let moveObj = null;
        try {
          moveObj = chess.move(nextMove);
        } catch (error) {
          // If the validated move still fails, something is wrong
          throw new Error(`Failed to apply validated move: ${nextMove}`);
        }

        if (moveObj) {
          setChess(new Chess(chess.fen()));
          setAutoMoves(prev => [...prev, moveObj.san]);
          setAllMoves(prev => [...prev, `Bot: ${moveObj.san}`]);

          // Update last move highlighting
          setLastMove({
            from: moveObj.from,
            to: moveObj.to
          });

          // Check if move limit reached or if we should auto-complete
          const totalMovesAfterMove = moves.length + autoMoves.length + 1;
          if (puzzle && totalMovesAfterMove >= puzzle.moveLimit) {
            setStatusMsg("⏱️ Move limit reached - puzzle will be auto-submitted!");
            // Auto-submit after reaching move limit
            setTimeout(() => {
              onSubmit(true); // Silent submission
            }, 1500);
          } else {
            // Check if puzzle is complete (reached end of solution)
            const isGameOver = chess.isGameOver();
            const solutionLength = puzzle.solution ? puzzle.solution.length : 0;
            const isBotToPlayLast = solutionLength % 2 === 0; // Even: bot plays last
            const hasReachedSolution = allMoves.length >= solutionLength;

            if (
              isGameOver ||
              (hasReachedSolution && isBotToPlayLast) ||
              // Only auto-submit when we've actually reached the configured move limit.
              // Previously this used (moveLimit - 1) which could auto-submit one move early
              // and prevent the user from playing the final solution move when it belongs to them.
              totalMovesAfterMove >= puzzle.moveLimit
            ) {
              // Puzzle completed by following solution (bot played last)
              setStatusMsg("✅ Puzzle completed! Auto-submitting...");
              setTimeout(() => {
                onSubmit(true); // Silent submission
              }, 1500);
            } else {
              // Bot move completed - switch back to user turn
              setIsUserTurn(true);
              setStatusMsg("Your turn! Make your next move.");
            }
          }
        } else {
          throw new Error('Failed to apply bot move');
        }
      } else {
        // Bot has no legal moves (game over) - show message but don't auto-submit
        setStatusMsg("🏁 Game ended - use Submit button when ready!");
      }
    } catch (error) {
      setStatusMsg("❌ Bot error - use Submit button when ready!");
    } finally {
      setIsThinking(false);
    }
  };

  // Check browser compatibility and environment
  useEffect(() => {
    const browserInfo = {
      userAgent: navigator.userAgent,
      webAssembly: typeof WebAssembly !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      memory: navigator.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown'
    };

    // Browser info collected but not stored since debug panel was removed
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    // Initialize Stockfish
    const initStockfish = async () => {
      try {
        await stockfishService.init();
        setStockfishInitialized(true);
      } catch (error) {
        setStatusMsg('Warning: Stockfish engine failed to initialize. Using manual mode.');
        setGameMode('manual');
        // Don't set competition mode if Stockfish fails
        setCompetitionMode(false);
      }
    };

    initStockfish();

    // fetch puzzle meta
    const fetchPuzzle = async () => {
      if (!isAuthenticated || !user) {
        setAccessError('Please log in to access this puzzle.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check if user is assigned to this batch
        if (!user.assignedBatch || user.assignedBatch._id !== batchId) {
          setAccessError('You are not assigned to this batch. Please contact an administrator.');
          setLoading(false);
          return;
        }
        // Fetch batch data first
        const batchRes = await api.get(`/api/public/batches/${batchId}`);
        const batchData = batchRes.data;
        setBatch(batchData);
        // Set batch timer
        if (batchData.timeRemaining !== undefined) {
          setTimeLeft(batchData.timeRemaining);
        } else if (batchData.durationSec) {
          setTimeLeft(batchData.durationSec);
        }
        // Find current puzzle index in batch (skip if batchData.puzzles is not present)
        if (Array.isArray(batchData.puzzles)) {
          const currentIndex = batchData.puzzles.findIndex(p => p._id === puzzleId);
          if (currentIndex === -1) {
            setAccessError('Puzzle not found in this batch. Please contact an administrator.');
            setLoading(false);
            return;
          }
          setCurrentPuzzleIndex(currentIndex);
        }
        const res = await api.get(`/api/public/puzzles/${puzzleId}`);
        const p = res.data;
        setPuzzle(p);
        
        // Check if user has already submitted this puzzle (to prevent re-attempts after reload)
        try {
          const myResultsRes = await api.get(`/api/public/batches/${batchId}/my-results`);
          const myResults = myResultsRes.data;
          
          // Check if this specific puzzle was already attempted
          const existingAttempt = myResults.puzzleResults?.find(r => r.puzzleId.toString() === puzzleId);
          
          if (existingAttempt) {
            const resultMsg = existingAttempt.correct 
              ? '✅ You already completed this puzzle correctly!' 
              : '❌ You already attempted this puzzle. First attempt counts!';
            setStatusMsg(`${resultMsg} Redirecting to next puzzle...`);
            setAccessError(resultMsg); // Block the board completely
            setLoading(false);
            // Immediate redirect - no delay to prevent interaction
            setTimeout(() => {
              navigateToNextPuzzle();
            }, 1500);
            return;
          }
        } catch (checkErr) {
          // Continue with puzzle load even if check fails
        }
        
        // Create chess instance and reset puzzle state
        const fenToUse = p.fen || undefined;
        const c = new Chess(fenToUse);
        setChess(c);
        setMoves([]);
        setAutoMoves([]);
        setAllMoves([]);
        setIsUserTurn(true); // User makes first move
        setIsThinking(false);
        // Reset competition mode flags for new puzzle
        setSolutionMoveIndex(0);
        setUsingAdminSolution(true); // Start fresh with admin solution
        
        // Check localStorage for previous wrong attempts to prevent reload exploit
        const attemptKey = `puzzle_attempt_${puzzleId}`;
        const savedAttempt = localStorage.getItem(attemptKey);
        if (savedAttempt) {
          try {
            const attemptData = JSON.parse(savedAttempt);
            const attemptAge = Date.now() - attemptData.timestamp;
            // If attempt was made in last 5 minutes and matches this puzzle/batch, restore count
            if (attemptAge < 300000 && attemptData.puzzleId === puzzleId && attemptData.batchId === batchId) {
              setAttempts(attemptData.wrongAttempts);
              setStatusMsg(`⚠️ You already made ${attemptData.wrongAttempts} wrong attempt(s). Be careful!`);
            } else {
              // Old or mismatched data, clear it
              localStorage.removeItem(attemptKey);
              setAttempts(0);
            }
          } catch (e) {
            localStorage.removeItem(attemptKey);
            setAttempts(0);
          }
        } else {
          setAttempts(0);
        }
        
        // Set board orientation based on initial position and keep it fixed
        const initialOrientation = c.turn() === 'b' ? 'black' : 'white';
        setBoardOrientation(initialOrientation);
        // Set status message based on game mode
        if (stockfishInitialized) {
          setStatusMsg(competitionMode ? 
            "🏆 ONE ATTEMPT ONLY! Wrong move = instant fail. Think carefully!" :
            "Your turn! Make your first move.");
        } else {
          setStatusMsg("");
        }
      } catch (err) {
        setAccessError('Failed to load puzzle data');
      } finally {
        setLoading(false);
      }
    };
    fetchPuzzle();

    // Prevent accidental page reload/navigation during puzzle
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your first submission counts and you cannot retry wrong answers!';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerRef.current);
      // Clean up Stockfish when component unmounts
      stockfishService.quit();
      // Remove reload warning when leaving component
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [puzzleId, roundId, batchId]);

  useEffect(() => {
    // start timer countdown when timeLeft is set
    if (timeLeft == null) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setStatusMsg("Batch time expired - puzzle session ended.");
          // End session without navigation
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [timeLeft]);

  // Responsive board sizing: compute a boardSize that fits the available center area
  useEffect(() => {
    const computeSize = () => {
      const leftWidth = 260; // matches grid column
      const rightWidth = 260;
      const gutter = 80; // spacing and margins
      const headerH = headerRef.current ? headerRef.current.getBoundingClientRect().height : 120;
      const availableW = Math.max(300, window.innerWidth - leftWidth - rightWidth - gutter);
      const availableH = Math.max(300, window.innerHeight - headerH - 160);
      const newSize = Math.floor(Math.min(availableW, availableH) * 1.2); // Reduced to 20%
      setBoardSize(Math.min(newSize, 900)); // Cap at 900px max
      setStartSize(Math.min(newSize, 900));
    };

    computeSize();
    window.addEventListener('resize', computeSize);
    return () => window.removeEventListener('resize', computeSize);
  }, []);

  const handleMouseDown = (e) => {
    setIsResizing(true);
    setStartY(e.clientY);
    setStartSize(boardSize);
    e.preventDefault();
  };

  useEffect(() => {
    // listen for auto-moves and puzzle moves on this puzzle
    const autoHandler = (msg) => {
      if (msg.puzzleId !== puzzleId) return;
      setAutoMoves(am => [...am, msg.moveSAN || msg.move || "unknown"].slice(-40));
      // apply move to local chess instance if legal
      setChess(prev => {
        const clone = new Chess(prev.fen());
        try {
          const moveResult = clone.move(msg.moveSAN || msg.move);
          if (moveResult) {
            // Update last move highlighting for socket auto-moves
            setLastMove({
              from: moveResult.from,
              to: moveResult.to
            });
          }
        } catch (err) {
        }
        return clone;
      });
    };
    const moveHandler = (msg) => {
      if (msg.puzzleId !== puzzleId) return;
      // other users' moves or admin monitoring
      setMoves(prev => [...prev, `${msg.displayName || msg.username || msg.userId}: ${msg.moveSAN}`].slice(-200));
    };

    socket.on("puzzle:auto-move", autoHandler);
    socket.on("puzzle:move", moveHandler);

    // Listen for batch timeout events
    const batchTimeoutHandler = (data) => {
      if (data.batchId === batchId) {
        setStatusMsg('⏰ Batch time has expired! Auto-submitting current puzzle...');
        
        // Auto-submit the current puzzle with timeout status
        setTimeout(() => {
          onSubmitTimeout();
        }, 1000);
      }
    };

    socket.on('batchCompleted', batchTimeoutHandler);
    socket.on('batchTimeExpired', batchTimeoutHandler);

    const allFinishedHandler = (data) => {
      if (data.batchId === batchId) {
        setStatusMsg('🎉 All participants finished! Redirecting to final leaderboard...');
        setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 2500);
      }
    };

    socket.on('allParticipantsFinished', allFinishedHandler);

    return () => {
      socket.off("puzzle:auto-move", autoHandler);
      socket.off("puzzle:move", moveHandler);
      socket.off('batchCompleted', batchTimeoutHandler);
      socket.off('batchTimeExpired', batchTimeoutHandler);
      socket.off('allParticipantsFinished', allFinishedHandler);
    };
  }, [puzzleId]);

  // Add mouse event listeners for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const deltaY = startY - e.clientY;
      const newSize = Math.max(300, Math.min(900, startSize + deltaY));
      setBoardSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startY, startSize]);

  const onPieceDrop = (sourceSquare, targetSquare) => {
    // In Stockfish mode, only allow moves on user's turn
    if (gameMode === 'user-vs-stockfish' && !isUserTurn) {
      setStatusMsg("Wait for the bot to make its move!");
      return false;
    }

    // Check if move limit already reached
    const currentTotalMoves = moves.length + autoMoves.length;
    if (puzzle && currentTotalMoves >= puzzle.moveLimit) {
      setStatusMsg("Move limit reached - puzzle is being submitted!");
      return false;
    }

    // use chess.js to validate
    const moveObj = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!moveObj) {
      setStatusMsg("Illegal move");
      return false;
    }

    // In competition mode, validate against expected solution
    if (competitionMode && gameMode === 'user-vs-stockfish') {
      // Two-attempt logic
      if (!isExpectedMove(moveObj)) {
        // Wrong move: Build the updated attempts array with this wrong move
        const updatedAttempts = [...userAttempts, { move: moveObj.san, correct: false, fen: chess.fen() }];
        const updatedMoves = [...moves, moveObj.san];
        // Don't add wrong moves to allMoves - only correct moves should appear in history
        // const updatedAllMoves = [...allMoves, `You: ${moveObj.san}`];
        
        // Update state for UI (but don't rely on this for submission)
        setUserAttempts(updatedAttempts);
        setMoves(updatedMoves);
        setAllMoves(updatedAllMoves);

        // Undo the move on the chess instance so the board returns to the pre-move state
        try {
          chess.undo();
        } catch (undoErr) {
          addDebugError(undoErr, 'Undo wrong move');
        }

        // Update React state with the reverted position
        setChess(new Chess(chess.fen()));

        // Highlight the attempted (wrong) move briefly so user sees what they tried
        setLastMove({ from: sourceSquare, to: targetSquare });
        addDebugMessage('WRONG_MOVE', 'User made wrong move', {
          userMove: moveObj.san,
          expectedIndex: allMoves.length,
          expectedMove: puzzle.solution?.[allMoves.length],
          attempts: attempts + 1
        });
        // Trigger shake animation on the chessboard
        const chessboardElement = document.querySelector('.chessboard');
        if (chessboardElement) {
          triggerShakeAnimation(chessboardElement);
        }

        if (attempts < 1) {
          // First wrong attempt: AUTO-SUBMIT immediately to prevent reload exploit
          setAttempts(attempts + 1);
          
          // Track first wrong attempt in localStorage to prevent reload exploit
          const attemptKey = `puzzle_attempt_${puzzleId}`;
          localStorage.setItem(attemptKey, JSON.stringify({
            puzzleId,
            batchId,
            wrongAttempts: 1,
            timestamp: Date.now()
          }));
          
          setStatusMsg('❌ Wrong move! Auto-submitting failed attempt...');
          
          // CRITICAL: Pass updatedAttempts AND updated moves directly to onSubmit to avoid stale state
          onSubmit(true, updatedAttempts, updatedMoves, allMoves).then(() => {
            // After submission succeeds, show message and navigate
            setStatusMsg('❌ Wrong move. Moving to next puzzle...');
            setTimeout(() => {
              navigateToNextPuzzle();
            }, 1500);
          }).catch(err => {
            // Even if submission fails, navigate to prevent getting stuck
            setTimeout(() => {
              navigateToNextPuzzle();
            }, 1500);
          });
        } else {
          // Second wrong attempt: AUTO-SUBMIT AS FAILED immediately to prevent reload exploit
          setAttempts(attempts + 1);
          setStatusMsg('❌ Wrong move! Auto-submitting failed attempt...');
          
          // CRITICAL: Submit immediately to prevent reload retry
          onSubmit(true).then(() => {
            // After submission succeeds, show message and navigate
            setStatusMsg('❌ Second wrong attempt. Moving to next puzzle...');
            setTimeout(() => {
              navigateToNextPuzzle();
            }, 1500);
          }).catch(err => {
            // Even if submission fails, navigate to prevent getting stuck
            setTimeout(() => {
              navigateToNextPuzzle();
            }, 1500);
          });
        }
        return true;
      } else {
        // Correct move, reset attempts for next move
        setUserAttempts(prev => [...prev, { move: moveObj.san, correct: true, fen: chess.fen() }]);
        setAttempts(0);
      }
    }

    // Move is valid - proceed
    setStatusMsg("");
    setMoves(prev => [...prev, moveObj.san]);
    setAllMoves(prev => [...prev, `You: ${moveObj.san}`]);
    setUserAttempts(prev => [...prev, { move: moveObj.san, correct: true, fen: chess.fen() }]);
    setChess(new Chess(chess.fen()));

    // Update last move highlighting
    setLastMove({
      from: sourceSquare,
      to: targetSquare
    });

    addDebugMessage('USER_MOVE', 'User made move', { 
      move: moveObj.san,
      competitionMode,
      solutionIndex: solutionMoveIndex
    });

    // Check if move limit will be reached after this move
    const totalMovesAfterMove = moves.length + autoMoves.length;
    if (puzzle && totalMovesAfterMove >= puzzle.moveLimit) {
      // Move limit reached - show message but don't auto-submit
      setStatusMsg("Move limit reached - use Submit button when ready!");
      return true;
    }

    // In Stockfish mode, switch turn and trigger bot move
    if (gameMode === 'user-vs-stockfish') {
      setIsUserTurn(false);
      if (competitionMode) {
        if (usingAdminSolution) {
          setStatusMsg("✅ Following solution! Bot responding with admin move...");
        } else {
          setStatusMsg("🤖 Bot thinking... (using Stockfish since you deviated)");
        }
      } else {
        setStatusMsg("Bot is thinking...");
      }
      
      // Delay bot move slightly to allow UI update
      // setTimeout(() => {
      //   makeStockfishMove(true); // Force run to bypass guard check
      // }, 800);
    } else {
      // Manual mode - just indicate whose turn it would be
      setStatusMsg(`Manual mode: ${chess.turn() === 'w' ? 'White' : 'Black'} to move next.`);
    }

    return true;
  };

  const resetBoard = () => {
    const fenToUse = puzzle.fen || undefined;
    const c = new Chess(fenToUse);
    setChess(c);
    setMoves([]);
    setAutoMoves([]);
    setAllMoves([]);
    setIsUserTurn(true); // User starts after reset
    setIsThinking(false);
    setLastMove(null);
    setSolutionMoveIndex(0);
    setUsingAdminSolution(true); // Always use admin solution mode
    setAttempts(0);

    if (stockfishInitialized && gameMode === 'user-vs-stockfish') {
      setStatusMsg(competitionMode ? 
        "Board reset! Following admin solution until deviation." : 
        "Board reset! Your turn to make the first move.");
    } else {
      setStatusMsg("Board reset! Manual mode - play both sides.");
    }
  };

  const onSubmitTimeout = async () => {
    try {
      const payload = {
        puzzleId,
        moves: moves, // Send only user moves for scoring
        allMoves: allMoves, // Send complete game record (user + computer moves)
        timeTakenSec: batch ? Math.max(0, batch.durationSec - timeLeft) : 0,
        roundId,
        batchId,
        timeout: true // Special flag to indicate this was a timeout submission
      };
      
      
      const response = await api.post('/api/public/submit', payload);
      
      
      // Navigate to leaderboard page immediately after timeout submission
      setStatusMsg('⏰ Puzzle submitted due to timeout. Redirecting to leaderboard...');
      setTimeout(() => {
        navigate(`/leaderboard/${batchId}`);
      }, 2000);
      
    } catch (err) {
      
      // Check if puzzle was already submitted
      if (err.response?.data?.alreadySubmitted) {
        setStatusMsg('⚠️ Puzzle already submitted. Redirecting to leaderboard...');
        setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 1500);
        return;
      }
      
      // Even if submission fails, redirect to leaderboard to prevent getting stuck
      setTimeout(() => {
        navigate(`/leaderboard/${batchId}`);
      }, 1000);
    }
  };

  const onSubmit = async (silent = false, updatedAttempts = null, updatedMoves = null, updatedAllMoves = null) => {
    
    try {
      // Use updated values if provided (for immediate auto-submit scenarios),
      // otherwise use state values
      const attemptsToSend = updatedAttempts !== null ? updatedAttempts : userAttempts;
      const movesToSend = updatedMoves !== null ? updatedMoves : moves;
      const allMovesToSend = updatedAllMoves !== null ? updatedAllMoves : allMoves;
      
      
      const payload = {
        puzzleId,
        moves: movesToSend, // Send only user moves for scoring
        allMoves: allMovesToSend, // Send complete game record (user + computer moves)
        userAttempts: attemptsToSend, // All user move attempts (for admin review)
        timeTakenSec: batch ? Math.max(0, batch.durationSec - timeLeft) : 0,
        roundId,
        batchId,
        timeout: false // Normal submission, not timeout
      };
      
      
      const response = await api.post('/api/public/submit', payload);
      
      
      // Clear localStorage attempt tracking on successful submission
      const attemptKey = `puzzle_attempt_${puzzleId}`;
      localStorage.removeItem(attemptKey);
      
      if (!silent) {
        setStatusMsg('✅ Puzzle submitted successfully! Redirecting to next puzzle...');
        setTimeout(() => {
          navigateToNextPuzzle();
        }, 1500);
      } else {
        navigateToNextPuzzle();
      }
      
    } catch (err) {
      
      // Check if puzzle was already submitted (e.g., user reloaded page after wrong answer)
      if (err.response?.data?.alreadySubmitted) {
        const existingResult = err.response.data.existingResult;
        
        if (!silent) {
          const resultMsg = existingResult.correct 
            ? '✅ You already completed this puzzle correctly!' 
            : '❌ You already attempted this puzzle.';
          setStatusMsg(`${resultMsg} Redirecting to next puzzle...`);
        }
        
        setTimeout(() => {
          navigateToNextPuzzle();
        }, 2000);
        return;
      }
      
      if (!silent) {
        setStatusMsg("❌ Submission failed. Please try again.");
      }
    }
  };

  // Add this useEffect after allMoves and isUserTurn are defined
  useEffect(() => {
    // If it's not the user's turn and we're in competition mode, trigger the bot move
    if (
      !isUserTurn &&
      competitionMode &&
      gameMode === 'user-vs-stockfish' &&
      allMoves.length > 0 &&
      allMoves[allMoves.length - 1].startsWith('You:')
    ) {
      makeStockfishMove(true);
    }
    // eslint-disable-next-line
  }, [allMoves, isUserTurn]);

  if (authLoading || loading) { // authLoading from AuthContext, loading from component state
    return (
      <div style={styles.page}>
        <div style={styles.glassLoading}>
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>
            {authLoading ? 'Authenticating...' : 'Loading puzzle...'}
          </div>
        </div>
      </div>
    );
  }
  if (accessError) {
    return (
      <div style={styles.page}>
        <div style={styles.glassError}>
          <h3 style={{color: '#ef4444', marginBottom: '16px'}}>Access Denied</h3>
          <p style={{color: '#d1d5db', marginBottom: '20px'}}>{accessError}</p>
          <button 
            style={styles.glassButton}
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  if (!puzzle) {
    return (
      <div style={styles.page}>
        <div style={styles.glassError}>
          <div style={styles.loadingText}>Puzzle not found</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.glassMainCard}>

        <div style={styles.glassHeader} ref={headerRef}>
          <div>
          </div>
        </div>

        {/* Three Column Layout */}
        <div style={styles.threeColumnLayout} className="tournament-layout">
          {/* Left Sidebar */}
          <div style={styles.glassSidebar} className="tournament-sidebar">
            {/* Global Batch Time - Big Display */}
            <div style={styles.glassTimeSection}>
              <div style={styles.glassTimeLabel}>Batch Time Remaining</div>
              <div style={styles.glassTimer} className="tournament-timer">
                {timeLeft != null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : "--:--"}
              </div>
            </div>

            {/* Current Turn and Game Mode */}
            <div style={styles.glassTurnSection}>
              <div style={styles.glassSectionTitle}>Game Mode</div>
              <div style={styles.glassGameModeIndicator}>
                {competitionMode ? '🏆 Competition' : '🎯 Puzzle Mode'}
              </div>
              <div style={styles.glassCompetitionModeInfo}>
                Puzzle {currentPuzzleIndex + 1}
              </div>
              <div style={chess.turn() === 'w' ? styles.glassWhiteTurn : styles.glassBlackTurn}>
                {chess.turn() === 'w' ? "⚪ White to Move" : "⚫ Black to Move"}
              </div>
            </div>
          </div>

          {/* Center - Chessboard */}
          <div style={styles.centerSectionAlt} className="tournament-center">
            <div style={styles.chessboardContainer} className="chessboard-container">
              <div style={{ position: "relative" }}>
                {(() => {
                  return null;
                })()}
                <div className="chessboard">
                  <Chessboard
                    position={chess.fen()}
                    onDrop={onPieceDrop}
                    lastMove={lastMove}
                    boardWidth={boardSize}
                    boardStyle={{
                      borderRadius: "8px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)",
                      border: "2px solid rgba(99, 102, 241, 0.4)",
                      animation: 'glassGlow 3s ease-in-out infinite'
                    }}
                    orientation={boardOrientation}
                    draggable={gameMode === 'manual' || isUserTurn}
                    transitionDuration={200}
                    lightSquareStyle={{ backgroundColor: '#EEEED2' }}
                    darkSquareStyle={{ backgroundColor: '#769656' }}
                    showCoordinates={false}
                  />
                </div>
                <div
                  style={styles.glassResizeHandle}
                  onMouseDown={handleMouseDown}
                  title="Drag to resize chessboard"
                >
                  ↕
                </div>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div style={styles.glassSidebar} className="tournament-sidebar">
            <div style={styles.glassNotationSection} className="tournament-notation">
              <div style={styles.glassNotationTitle}>Move History</div>
              <div style={styles.glassNotationList} className="tournament-notation-list">
                {allMoves.length === 0 ? (
                  <div style={styles.glassNoMoves}>No moves yet</div>
                ) : (
                  allMoves.map((move, index) => (
                    <div key={index} style={styles.glassMoveItem}>
                      <span style={styles.glassMoveNumber}>{Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}</span>
                      <span style={styles.glassMoveText}>{move}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Status Messages */}
            <div style={styles.glassStatusSection}>
              <div style={styles.glassStatusMessage}>
                {statusMsg || "Ready to play!"}
              </div>
            </div>

            {/* Submit Button - Desktop: in right sidebar */}
            <div style={styles.glassSubmitSection}>
              <button
                style={{...styles.glassSubmitButton}}
                className="tournament-submit-button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to submit this puzzle? This action cannot be undone.')) {
                    onSubmit();
                  }
                }}
              >
                📤 Submit Puzzle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wrong Move Popup */}
      {showWrongMovePopup && (
        <div style={styles.glassPopupOverlay}>
          <div style={styles.glassPopupContainer}>
            <div style={styles.glassPopupIcon}>❌</div>
            <div style={styles.glassPopupMessage}>
              {wrongMoveMessage}
            </div>
            <button
              style={styles.glassPopupButton}
              onClick={() => setShowWrongMovePopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { 
    padding: 18,
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#e5e7eb'
  },
  glassMainCard: { 
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(20px)',
    padding: 16, 
    borderRadius: 16,
    border: '1px solid rgba(99, 102, 241, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.1)',
    position: 'relative',
    overflow: 'hidden'
  },
  glassHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
  },
  
  // Three Column Layout
  threeColumnLayout: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr 260px',
    gap: 16,
    alignItems: 'start',
    minHeight: '600px'
  },

  // Glass Sidebar
  glassSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 20,
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.2)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  centerSectionAlt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    minHeight: '60vh',
    width: '100%'
  },
  
  // Time Section
  glassTimeSection: {
    textAlign: 'center',
    padding: 20,
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  glassTimeLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    fontWeight: 500,
    letterSpacing: '0.5px'
  },
  glassTimer: {
    fontSize: 36,
    fontWeight: 800,
    color: '#60a5fa',
    fontFamily: 'monospace',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
  },
  
  // Turn Section
  glassTurnSection: {
    textAlign: 'center',
    padding: 16,
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)'
  },
  glassGameModeIndicator: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e5e7eb',
    textAlign: "center",
    marginBottom: 12
  },
  glassCompetitionModeInfo: {
    fontSize: 12,
    fontWeight: 500,
    color: '#a78bfa',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    padding: "6px 8px",
    borderRadius: "6px",
    textAlign: "center",
    marginTop: 8,
    border: '1px solid rgba(167, 139, 250, 0.2)'
  },
  
  // Moves Section
  glassMovesSection: {
    textAlign: 'center',
    padding: 16,
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)'
  },
  glassMovesValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#60a5fa'
  },
  
  // Difficulty Section
  glassDifficultySection: {
    textAlign: 'center',
    padding: 16,
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)'
  },
  glassDifficultyValue: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e5e7eb'
  },
  glassSectionTitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: 500,
    letterSpacing: '0.5px'
  },
  
  // Center Section
  chessboardContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "800px"
  },
  glassActionButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  glassModeButton: { 
    padding: "12px 24px", 
    borderRadius: 10, 
    border: "1px solid rgba(139, 92, 246, 0.3)",
    background: 'rgba(139, 92, 246, 0.2)',
    color: "#c4b5fd", 
    cursor: "pointer",
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  glassSubmitButton: { 
    padding: "12px 24px", 
    borderRadius: 10, 
    border: "1px solid rgba(245, 158, 11, 0.3)",
    background: 'rgba(245, 158, 11, 0.2)',
    color: "#fde68a", 
    cursor: "pointer",
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  glassSubmitSection: {
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    padding: 16,
    textAlign: 'center'
  },
  submitButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  
  // Right Sidebar Styles
  glassNotationSection: {
    flex: 1,
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column'
  },
  glassNotationTitle: {
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: '16px',
    letterSpacing: '0.5px'
  },
  glassNotationList: {
    flex: 1,
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: 8,
    padding: 12,
    background: 'rgba(15, 23, 42, 0.7)'
  },
  glassMoveItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
    transition: 'all 0.2s ease'
  },
  glassMoveNumber: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 12,
    minWidth: 24,
    fontWeight: 500
  },
  glassMoveText: {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'monospace',
    color: '#e5e7eb'
  },
  glassNoMoves: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: 24,
    fontSize: '14px'
  },
  glassStatusSection: {
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    padding: 16
  },
  glassStatusMessage: {
    fontSize: 14,
    color: '#e5e7eb',
    textAlign: 'center',
    lineHeight: 1.5,
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  glassModeIndicator: {
    marginTop: 12,
    padding: 10,
    background: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    border: '1px solid rgba(99, 102, 241, 0.2)'
  },
  glassModeText: {
    fontSize: 12,
    textAlign: 'center'
  },
  glassStockfishMode: {
    color: '#c4b5fd',
    fontWeight: 'bold'
  },
  
  // Warning Banner
  glassWarningBanner: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.3) 100%)',
    backdropFilter: 'blur(10px)',
    color: '#fca5a5',
    padding: '14px 20px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    borderRadius: '10px 10px 0 0',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(239, 68, 68, 0.3)'
  },
  warningIcon: { 
    fontSize: '20px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  
  // Turn Indicators
  glassUserTurnActive: {
    color: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "2px solid rgba(16, 185, 129, 0.3)",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 14,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  glassStockfishTurnActive: {
    color: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "2px solid rgba(239, 68, 68, 0.3)",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 14,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  },
  glassWhiteTurn: {
    color: "#e5e7eb",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 14,
    backdropFilter: 'blur(10px)'
  },
  glassBlackTurn: {
    color: "#e5e7eb",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "2px solid rgba(0, 0, 0, 0.4)",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 14,
    backdropFilter: 'blur(10px)'
  },
  
  // Resize Handle
  glassResizeHandle: {
    position: "absolute",
    bottom: -15,
    right: 10,
    width: 30,
    height: 30,
    background: "rgba(99, 102, 241, 0.8)",
    backdropFilter: 'blur(10px)',
    color: "#fff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "ns-resize",
    fontSize: 16,
    fontWeight: "bold",
    userSelect: "none",
    zIndex: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  
  // Wrong Move Popup Styles
  glassPopupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease-in-out'
  },
  glassPopupContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: 30,
    borderRadius: 16,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    textAlign: 'center',
    maxWidth: 400,
    margin: 20,
    animation: 'slideUp 0.3s ease-out'
  },
  glassPopupIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#ef4444'
  },
  glassPopupMessage: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fca5a5',
    lineHeight: 1.4,
    marginBottom: 20
  },
  glassPopupButton: {
    marginTop: 10,
    padding: "12px 24px",
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: "#fca5a5",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: '14px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease'
  },
  
  // Loading States
  glassLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: 40,
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(99, 102, 241, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    border: '4px solid rgba(99, 102, 241, 0.3)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 20
  },
  loadingText: {
    color: '#e5e7eb',
    fontSize: '18px',
    fontWeight: 500
  },
  
  // Error States
  glassError: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(20px)',
    padding: '30px',
    borderRadius: 16,
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    maxWidth: 500,
    margin: '40px auto'
  },
  glassButton: {
    padding: "12px 24px",
    background: 'rgba(99, 102, 241, 0.2)',
    color: "#c4b5fd",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: '14px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease'
  }
};

// Add responsive styles
const responsiveStyles = `
/* Desktop styles - Submit button to the right of chessboard */
@media (min-width: 769px) {
  .tournament-layout {
    gap: 8px !important;
  }
  
  .tournament-center {
    display: flex !important;
    align-items: flex-start !important;
    gap: 30px !important;
  }
  
  .chessboard-container {
    flex: 1 !important;
  }
  
  .submit-button-container {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .tournament-layout {
    flex-direction: column !important;
    gap: 16px !important;
    align-items: center !important;
  }
  
  .tournament-sidebar {
    width: 100% !important;
    max-width: 500px !important;
    padding: 16px !important;
    gap: 12px !important;
  }
  
  .tournament-center {
    order: 2 !important;
    width: 100% !important;
    flex-direction: column !important;
  }
  
  .tournament-timer {
    font-size: 28px !important;
  }
  
  .tournament-notation {
    max-height: 200px !important;
  }
}

@media (max-width: 480px) {
  .tournament-layout {
    gap: 16px !important;
  }
  
  .tournament-sidebar {
    padding: 12px !important;
    gap: 10px !important;
  }
  
  .tournament-timer {
    font-size: 24px !important;
  }
  
  .tournament-notation-list {
    max-height: 150px !important;
  }
  
  .tournament-action-buttons {
    flex-direction: column !important;
    gap: 8px !important;
  }
  
  .tournament-mode-button {
    padding: 10px 16px !important;
    font-size: 13px !important;
  }
  
  .tournament-submit-button {
    padding: 12px 20px !important;
    font-size: 14px !important;
  }
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = responsiveStyles;
  if (!document.head.querySelector('style[data-responsive-styles]')) {
    styleSheet.setAttribute('data-responsive-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Add spin animation for loading spinner
const spinAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = spinAnimation;
  if (!document.head.querySelector('style[data-spin-animation]')) {
    styleSheet.setAttribute('data-spin-animation', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default TournamentPuzzle;
