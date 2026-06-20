import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import stockfishService from '../services/stockfishService';

// Map a Stockfish eval (cp or mate, side-to-move perspective) to a single
// comparable number so "mate in 1" > "mate in 4" > any normal advantage.
// (Same mapping Monthly Focus uses for engine-judged puzzles.)
function evalToCp(evaluation) {
  if (!evaluation) return 0;
  if (evaluation.type === 'mate') {
    const m = evaluation.value;
    const big = 100000 - Math.min(Math.abs(m), 50) * 1000;
    return m >= 0 ? big : -big;
  }
  return evaluation.value;
}
const MATE_THRESHOLD = 40000; // evals above this came from a forced-mate score

export default function HomepagePuzzle() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // The daily-puzzle "already attempted" flag must be PER ACCOUNT, not global —
  // otherwise on a shared browser (e.g. a coach logging into different students'
  // accounts) one student's solve would wrongly block the next student. The
  // puzzle CONTENT cache stays global (same puzzle for everyone); only the
  // attempt flag is scoped by user id (falls back to 'guest' when logged out).
  const attemptKey = useCallback(
    () => `homepagePuzzleAttempt_${(user && (user._id || user.id)) || 'guest'}`,
    [user]
  );
  const [chess, setChess] = useState(new Chess());
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Loading puzzle...');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [attemptedToday, setAttemptedToday] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [botThinking, setBotThinking] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Stockfish is used to accept ALTERNATIVE forced-mate lines: in a mate-in-N
  // there are often several first/intermediate moves that still force mate, but a
  // plain SAN-vs-solution check only accepts the one recorded line. The engine
  // judges whether the user's move preserves the forced mate.
  const engineReadyRef = useRef(false);
  const [judging, setJudging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth && window.innerWidth <= 1024);

  // Dynamic board size — measures the actual rendered container so the board
  // is always consistent regardless of screen resolution, DPI, or Windows scaling.
  const boardContainerRef = useRef(null);
  const [boardSize, setBoardSize] = useState(isMobile ? 300 : 380);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
      setIsLandscape(window.innerHeight < window.innerWidth && window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ResizeObserver: recalculate boardSize whenever the container's rendered
  // width changes (handles different screen sizes, DPI scaling, window resize).
  useEffect(() => {
    if (!boardContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        if (containerWidth > 0) {
          // Cap at 520px so it doesn't grow too large on ultra-wide screens
          setBoardSize(Math.min(Math.floor(containerWidth), 420));
        }
      }
    });
    observer.observe(boardContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Make bot move after delay
  const makeBotMove = useCallback((currentChess, solutionMoves, currentIndex) => {
    if (currentIndex >= solutionMoves.length) return;
    
    setBotThinking(true);
    setTimeout(() => {
      const botMove = solutionMoves[currentIndex];
      const newChess = new Chess(currentChess.fen());
      
      try {
        // Try the move as provided
        try {
          newChess.move(botMove);
        } catch (e) {
          // If it fails, try lowercase (for cases like QC8 -> Qc8)
          // Note: Standard SAN piece letters should be uppercase, but files lowercase.
          // We'll try a few common variations if the original fails.
          const moves = newChess.moves({ verbose: true });
          const matchedMove = moves.find(m => 
            m.san.toLowerCase().replace(/[+#]/g, '') === botMove.toLowerCase().replace(/[+#]/g, '')
          );
          if (matchedMove) {
            newChess.move(matchedMove);
          } else {
            throw e; // Re-throw if still no match
          }
        }
        setChess(newChess);
        setMoveIndex(currentIndex + 1);
        
        // Check if puzzle is complete
        if (currentIndex + 1 >= solutionMoves.length) {
          setStatus('Puzzle complete! 🎉');
          setShowLoginPrompt(true);
          const today = new Date().toDateString();
          localStorage.setItem(attemptKey(), today);
          setAttemptedToday(true);
        }
      } catch (error) {
      }
      setBotThinking(false);
    }, 600);
  }, [attemptKey]);

  // Fetch or load cached daily puzzle
  useEffect(() => {
    const loadDailyPuzzle = async () => {
      try {
        const today = new Date().toDateString();
        
        // Check if THIS account already attempted today's puzzle (per-user key).
        const lastAttempt = localStorage.getItem(attemptKey());
        if (lastAttempt === today) {
          setAttemptedToday(true);
          setStatus(user ? "You've already solved today's puzzle!" : "You've already solved today's puzzle! Login for more.");
          // We'll still continue to load the puzzle so they can see it
        } else {
          // Fresh account (e.g. coach switched students on a shared browser):
          // clear any "attempted" state carried over from the previous user.
          setAttemptedToday(false);
          setShowLoginPrompt(false);
          setWrongAttempts(0);
        }

        // Check if we have today's puzzle cached
        const cachedPuzzleData = localStorage.getItem('dailyPuzzle');
        const cachedDate = localStorage.getItem('dailyPuzzleDate');
        
        if (cachedDate === today && cachedPuzzleData) {
          // Use cached puzzle
          const puzzleData = JSON.parse(cachedPuzzleData);
          setPuzzle(puzzleData);
          const newChess = new Chess(puzzleData.fen);
          setChess(newChess);
          
          // Set orientation based on whose turn it is
          if (!puzzleData.orientation) {
            puzzleData.orientation = newChess.turn() === 'w' ? 'white' : 'black';
          }
          
          setStatus('Your turn! Find the best move.');
          setLoading(false);
        } else {
          // Fetch new daily puzzle
          const response = await api.get('/api/public/puzzles/daily');
          const puzzleData = response.data;

          if (puzzleData) {
            // Cache the puzzle for today
            localStorage.setItem('dailyPuzzle', JSON.stringify(puzzleData));
            localStorage.setItem('dailyPuzzleDate', today);
            
            setPuzzle(puzzleData);
            const newChess = new Chess(puzzleData.fen);
            setChess(newChess);
            
            // Set orientation based on whose turn it is if not specified
            if (!puzzleData.orientation) {
              puzzleData.orientation = newChess.turn() === 'w' ? 'white' : 'black';
            }
            
            setStatus('Your turn! Find the best move.');
          } else {
            setStatus('No puzzles available today.');
          }
          setLoading(false);
        }
      } catch (error) {
        setHasError(true);
        setStatus('Failed to load puzzle. Try again later.');
        setLoading(false);
      }
    };

    loadDailyPuzzle();
    // Re-run when the account changes (attemptKey changes with the user id), so a
    // shared browser re-evaluates "already attempted" for the newly active user.
  }, [isAuthenticated, attemptKey]);

  // Boot Stockfish in the background once a puzzle is on the board, so it's ready
  // to judge alternative mate lines. Non-blocking: if it fails to load, we simply
  // fall back to the strict solution check.
  useEffect(() => {
    if (!puzzle) return;
    let cancelled = false;
    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (!cancelled) engineReadyRef.current = true;
      } catch {
        if (!cancelled) engineReadyRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [puzzle]);

  // Ask Stockfish whether the user's move keeps the forced mate (or is otherwise
  // as good as the engine's best). Used only when the move doesn't match the
  // recorded solution and isn't an immediate mate — i.e. an alternative line.
  // Returns true if the move should be ACCEPTED.
  const engineAcceptsMove = useCallback(async (fenBefore, chessAfter) => {
    if (!engineReadyRef.current) return false;
    try {
      const depth = 12;
      const pre = await stockfishService.getBestMove(fenBefore, { depth, moveTime: 1200 });
      const bestCp = evalToCp(pre.evaluation);

      // Only judge positions that were a forced WIN for the mover; otherwise this
      // isn't a "multiple ways to mate" case and we keep the strict check.
      if (bestCp < MATE_THRESHOLD) return false;

      let userCpAfter;
      if (chessAfter.isCheckmate()) {
        return true; // delivered mate — always accept
      } else if (chessAfter.isGameOver()) {
        userCpAfter = chessAfter.isDraw() ? 0 : -bestCp; // stalemate/draw = threw it away
      } else {
        const post = await stockfishService.getBestMove(chessAfter.fen(), { depth, moveTime: 1200 });
        userCpAfter = -evalToCp(post.evaluation); // flip to the user's perspective
      }
      // Accept if the user's move still forces mate at least as fast (loss <= 0).
      return (bestCp - userCpAfter) <= 0;
    } catch {
      return false;
    }
  }, []);

  // Handle move - UPDATED with better state management
  const handleMove = useCallback((move) => {

    if (!puzzle || showLoginPrompt || botThinking || judging) {
      return false;
    }

    try {
      const fenBefore = chess.fen();
      const newChess = new Chess(fenBefore);
      const moveResult = newChess.move(move);

      if (moveResult) {
        // Check if move matches solution
        const solutionMoves = Array.isArray(puzzle.solution)
          ? puzzle.solution
          : puzzle.solution.split(' ').filter(m => m.trim());

        const expectedMove = solutionMoves[moveIndex];

        // Case-insensitive comparison and handling potential + or # symbols
        const userSan = moveResult.san.toLowerCase().replace(/[+#]/g, '');
        const targetSan = expectedMove.toLowerCase().replace(/[+#]/g, '');

        // Immediate checkmate is always correct (covers the FINAL move of any
        // mate line, incl. alternate mates).
        const isAltMate = newChess.isCheckmate();

        // ── Accept / reject closures ──────────────────────────────────────────
        const acceptMove = () => {
          setChess(newChess);
          setMoveIndex(moveIndex + 1);
          setStatus('Correct! ✓');
          // Checkmate ends the puzzle immediately, even if the recorded solution
          // had more moves queued.
          if (isAltMate || moveIndex + 1 >= solutionMoves.length) {
            setTimeout(() => {
              setStatus('Puzzle solved! 🎉');
              setShowLoginPrompt(true);
              const today = new Date().toDateString();
              localStorage.setItem(attemptKey(), today);
              setAttemptedToday(true);
            }, 800);
          } else {
            setTimeout(() => {
              makeBotMove(newChess, solutionMoves, moveIndex + 1);
            }, 800);
          }
        };

        const rejectMove = () => {
          const newWrongAttempts = wrongAttempts + 1;
          setWrongAttempts(newWrongAttempts);
          setStatus(`Incorrect! Try again. (${newWrongAttempts} attempts)`);
          setTimeout(() => {
            const resetChess = new Chess(puzzle.fen);
            for (let i = 0; i < moveIndex; i++) {
              resetChess.move(solutionMoves[i]);
            }
            setChess(resetChess);
            setStatus('Your turn! Find the best move.');
          }, 1500);
        };

        // ── Fast path: exact recorded move or an immediate mate — accept now ──
        if (userSan === targetSan || isAltMate) {
          acceptMove();
          return true;
        }

        // ── Alternative line: let Stockfish decide if it still forces mate. ──
        // Show the move on the board while the engine thinks, then resolve.
        setChess(newChess);
        setStatus('Checking your move…');
        setJudging(true);
        engineAcceptsMove(fenBefore, newChess)
          .then((accepted) => {
            setJudging(false);
            if (accepted) {
              acceptMove();
            } else {
              // Roll the board back to the pre-move position before showing the
              // retry, so the rejected move doesn't linger.
              setChess(new Chess(fenBefore));
              rejectMove();
            }
          })
          .catch(() => {
            setJudging(false);
            setChess(new Chess(fenBefore));
            rejectMove();
          });

        return true;
      }
    } catch (error) {
    }

    return false;
  }, [chess, puzzle, attemptedToday, showLoginPrompt, showSolution, wrongAttempts, moveIndex, botThinking, judging, makeBotMove, attemptKey, engineAcceptsMove]);

  const handleShowSolution = () => {
    setShowSolution(true);
    setStatus('Follow the solution moves below!');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const dismissPrompt = () => {
    setShowLoginPrompt(false);
  };

  if (loading) {
    return (
      <div className="homepage-puzzle-loading">
        <img src="/logo.png" alt="Chess Nexus" className="loading-logo-image" />
        <div className="loading-spinner"></div>
        <p>{status}</p>
      </div>
    );
  }

  return (
    <div className="homepage-puzzle-container">
      {status && !hasError && (
        <div className="puzzle-header">
          <p className="puzzle-status">{status}</p>
        </div>
      )}

      {showSolution && puzzle && (
        <div style={{ 
          textAlign: 'center', 
          color: '#2e7d32', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#e8f5e9',
          borderRadius: '6px',
          border: '1px solid #c8e6c9'
        }}>
          Solution: {Array.isArray(puzzle.solution) ? puzzle.solution.join(' ') : puzzle.solution}
        </div>
      )}

      {/* Show Solution Button - MOVED TO TOP with minimal padding */}
      {wrongAttempts >= 1 && !showSolution && !attemptedToday && (
        <div style={{ 
          marginBottom: '1px',  // Changed from marginTop to marginBottom
          textAlign: 'center',
          padding: '10px 20px', // Reduced padding
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '2px solid #ffc107',
          width: '100%' // Ensure it takes full width
        }}>
          <p style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#856404' }}>
            Having trouble? View the solution!
          </p>
          <button 
            onClick={handleShowSolution}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
          >
            💡 Show Solution
          </button>
        </div>
      )}

      <div
        className="puzzle-board-container"
        ref={boardContainerRef}
        style={{ marginTop: '1px', width: '100%', position: 'relative' }}
      >
        {hasError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,20,0.82)',
            backdropFilter: 'blur(6px)',
            borderRadius: '8px',
            zIndex: 10,
            gap: '10px',
          }}>
            <span style={{ fontSize: '48px', lineHeight: 1 }}>😞</span>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>Puzzle unavailable</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', margin: 0 }}>Try again later</p>
          </div>
        )}
        <Chessboard
          position={chess.fen()}
          onDrop={(sourceSquare, targetSquare, promotion) => {
            const move = { 
              from: sourceSquare, 
              to: targetSquare,
              promotion: promotion || 'q'
            };
            return handleMove(move);
          }}
          orientation={puzzle?.orientation || 'white'}
          boardWidth={boardSize}
          showCoordinates={false}
          draggable={!botThinking && !judging}
        />
      </div>


      {showLoginPrompt && (
        <div className="login-prompt-overlay">
          <div className="login-prompt-card">
            <div className="prompt-icon">🎉</div>
            <h4>Great Job!</h4>
            <p>You solved today's puzzle!</p>
            {!user ? (
              <>
                <p className="prompt-message">Login to access more puzzles and track your progress.</p>
                <div className="prompt-buttons">
                  <button className="login-btn" onClick={handleLogin}>
                    Login Now
                  </button>
                  <button className="dismiss-btn" onClick={dismissPrompt}>
                    Maybe Later
                  </button>
                </div>
              </>
            ) : (
              <div className="prompt-buttons">
                <button className="login-btn" onClick={dismissPrompt}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
