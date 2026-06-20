import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { trackEvent } from '../lib/analytics';
import './HealthyMix.css';

// Small WebAudio blips (same feel as the daily puzzles page)
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.2);
    }
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) { /* ignore */ }
};

// normalize a SAN string for comparison (strip + # and lowercase)
const normSan = (s) => (s || '').toLowerCase().replace(/[+#]/g, '').trim();

export default function HealthyMix() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Optional fixed rating band (from the Training "Rating" card). When present,
  // every puzzle served comes strictly from [bandMin, bandMax].
  const bandMin = searchParams.get('min');
  const bandMax = searchParams.get('max');
  const hasBand = bandMin != null && bandMax != null;

  // Optional theme filter (from the Training → Themes picker). When present,
  // every puzzle served carries this theme tag, near the user's rating (±100).
  const theme = searchParams.get('theme');
  const hasTheme = theme != null && theme !== '';
  // Pretty label for the theme tag, e.g. "mateIn1" → "Mate In 1".
  const themeLabel = hasTheme
    ? theme.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
    : '';

  // Optional piece-count filter (from the Training → Pieces picker). When
  // present, every puzzle served has exactly this many pieces on the board,
  // near the user's rating (±400, handled server-side).
  const piecesParam = searchParams.get('pieces');
  const hasPieces = piecesParam != null && piecesParam !== '';

  // Optional coach assignment. When present, every attempt is reported to the
  // assignment so the coach sees progress, and a finish popup shows at target.
  const assignmentId = searchParams.get('assignment');
  const hasAssignment = assignmentId != null && assignmentId !== '';

  // Which training mode this session is — used to tag analytics so the admin
  // Puzzle Analytics can break HealthyMix solves down by themes / rating / pieces.
  const trainingMode = hasTheme ? 'themes' : hasPieces ? 'pieces' : hasBand ? 'rating' : 'healthymix';
  const puzzleStartTimeRef = useRef(null);

  // Pieces mode: remember which puzzles we've shown so a sparse count (e.g. 3
  // pieces with only 8 puzzles) never repeats — and so we can show an
  // "exhausted, pick another" popup once they're all done.
  const seenIdsRef = useRef([]);
  const [exhausted, setExhausted] = useState(null); // { pieces, total } | null

  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fen, setFen] = useState('start');
  const [orientation, setOrientation] = useState('white');
  const [status, setStatus] = useState('loading'); // loading | solving | solved | failed
  const [message, setMessage] = useState('Loading…');
  const [botThinking, setBotThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null); // { from, to } for highlight

  // Rating + session stats
  // Session counters persist across page reloads via sessionStorage, and reset
  // when the tab/window closes — i.e. they last only while the user is here.
  // (Every solve/fail is also recorded server-side in the Score collection, so
  // the dashboard can compute lifetime totals separately.)
  const SESSION_KEY = 'healthyMixSession';
  const initSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { correct: 0, wrong: 0, streak: 0 };
  };
  const saved = initSession();

  const [rating, setRating] = useState(user?.liveRating ?? 1200);
  const [ratingDelta, setRatingDelta] = useState(null); // last change, for the +N / −N flash
  const [sessionCorrect, setSessionCorrect] = useState(saved.correct);
  const [sessionWrong, setSessionWrong] = useState(saved.wrong);
  const [streak, setStreak] = useState(saved.streak);

  // Coach-assignment tracking (only when ?assignment=<id> is present).
  const [assignProgress, setAssignProgress] = useState(0);
  const [assignTarget, setAssignTarget] = useState(0);
  const [assignDone, setAssignDone] = useState(null); // { solved, failed, maxStreak } when target reached
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const assignReachedRef = useRef(false);

  // Report one attempt to the coach assignment; trip the finish popup at target.
  const reportAssignmentAttempt = useCallback(async (solved) => {
    if (!hasAssignment || assignReachedRef.current) return;
    try {
      const res = await api.post(`/api/coach/my-assignments/${assignmentId}/progress`, { solved });
      const d = res.data || {};
      setAssignProgress(d.progress || 0);
      setAssignTarget(d.target || 0);
      if (d.reached && !assignReachedRef.current) {
        assignReachedRef.current = true;
        setAssignDone({ solved: d.solved || 0, failed: d.failed || 0, maxStreak: d.maxStreak || 0 });
      }
    } catch (_) { /* non-blocking */ }
  }, [hasAssignment, assignmentId]);

  const submitAssignment = async () => {
    setAssignSubmitting(true);
    try {
      await api.post(`/api/coach/my-assignments/${assignmentId}/submit`);
      navigate('/my-coach');
    } catch (_) {
      setAssignSubmitting(false);
    }
  };

  // Persist session stats whenever they change.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ correct: sessionCorrect, wrong: sessionWrong, streak })
      );
    } catch (_) { /* ignore */ }
  }, [sessionCorrect, sessionWrong, streak]);

  const chessRef = useRef(new Chess());
  const solutionRef = useRef([]);
  const moveIndexRef = useRef(0);
  const usedSolutionRef = useRef(false);
  const submittedRef = useRef(false);
  const failedRef = useRef(false);   // puzzle scored as a fail (wrong move or solution shown)
  const tooEasyRef = useRef(false);  // last solve earned 0 (puzzle far below user rating)
  const statusRef = useRef('loading'); // mirror of status for use inside callbacks

  // keep statusRef in sync so handlers can branch on the live status
  const setStatusSynced = useCallback((s) => { statusRef.current = s; setStatus(s); }, []);

  // Board sizing — drag-to-resize handle (Lichess-style corner grip)
  const boardWrapRef = useRef(null);
  const MIN_BOARD = 200;
  const MAX_BOARD = 720;
  // Default 480 on desktop, but never wider than fits the viewport (phones/tablets).
  const fitToViewport = (preferred) => {
    if (typeof window === 'undefined') return preferred;
    const w = window.innerWidth;
    if (w <= 860) {
      // Single-column layout: board can use almost the full width, minus page padding.
      return Math.max(MIN_BOARD, Math.min(preferred, w - 48));
    }
    return preferred;
  };
  const [boardSize, setBoardSize] = useState(() => fitToViewport(480));
  const userResizedRef = useRef(false); // once the user drags, stop auto-fitting
  const dragStart = useRef(null);

  // Re-fit the board when the viewport changes (rotation, resize), unless the
  // user has manually resized it.
  useEffect(() => {
    const onResize = () => {
      if (userResizedRef.current) return;
      setBoardSize(fitToViewport(480));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onResizeDragStart = (e) => {
    e.preventDefault();
    const startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: startX, y: startY, size: boardSize };

    const onMove = (ev) => {
      const cx = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - dragStart.current.x;
      const dy = cy - dragStart.current.y;
      const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
      const newSize = Math.min(MAX_BOARD, Math.max(MIN_BOARD, dragStart.current.size + delta));
      userResizedRef.current = true;
      setBoardSize(Math.round(newSize));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  };

  // ── Load current rating once ──
  useEffect(() => {
    api.get('/api/public/healthymix/rating')
      .then(res => setRating(res.data.rating))
      .catch(() => {});
  }, []);

  // ── Load a puzzle ──
  const loadPuzzle = useCallback(async (excludeId) => {
    setLoading(true);
    setStatusSynced('loading');
    setMessage('Loading…');
    setRatingDelta(null);
    setLastMove(null);
    try {
      const params = {};
      if (excludeId) params.exclude = excludeId;
      if (hasBand) { params.min = bandMin; params.max = bandMax; }
      if (hasTheme) { params.theme = theme; }
      if (hasPieces) {
        params.pieces = piecesParam;
        // Send the puzzles we've already seen so the backend skips them and can
        // detect when this (possibly sparse) piece count is fully exhausted.
        if (seenIdsRef.current.length) params.seen = seenIdsRef.current.join(',');
      }
      const res = await api.get('/api/public/healthymix/next', { params });
      if (res.data.userRating != null) setRating(res.data.userRating);

      // Pieces mode: the user has solved every puzzle at this piece count.
      if (res.data.exhausted) {
        setExhausted({ pieces: res.data.pieces, total: res.data.total });
        setStatusSynced('loading');
        setMessage('');
        setLoading(false);
        return;
      }

      const p = res.data.puzzle;
      // Track this puzzle as seen (Pieces mode) so we don't show it again.
      if (hasPieces && p && (p._id || p.id)) {
        const id = p._id || p.id;
        if (!seenIdsRef.current.includes(id)) seenIdsRef.current.push(id);
      }

      const game = new Chess(p.fen || 'start');
      chessRef.current = game;

      let sol = [];
      if (Array.isArray(p.solution)) sol = p.solution;
      else if (typeof p.solution === 'string') sol = p.solution.split(/[,\s]+/).filter(Boolean);
      solutionRef.current = sol;
      moveIndexRef.current = 0;
      usedSolutionRef.current = false;
      submittedRef.current = false;
      failedRef.current = false;
      tooEasyRef.current = false;

      // Analytics: count this as a puzzle attempt (feeds admin Puzzle Analytics).
      puzzleStartTimeRef.current = Date.now();
      trackEvent('puzzle_started', {
        puzzleId: p._id || p.id || null,
        mode: trainingMode,
        theme: hasTheme ? theme : undefined,
        pieces: hasPieces ? piecesParam : undefined,
        isGuest: !user
      });

      setPuzzle(p);
      setFen(game.fen());
      setOrientation(game.turn() === 'w' ? 'white' : 'black');
      setStatusSynced('solving');
      setMessage('Your turn — find the best move.');
      setLoading(false);
    } catch (err) {
      setStatusSynced('loading');
      setMessage(
        hasTheme ? `No ${themeLabel} puzzles available right now.`
        : hasPieces ? `No ${piecesParam}-piece puzzles available right now.`
        : hasBand ? `No puzzles in the ${bandMin}–${bandMax} range.`
        : 'No puzzles available. Try again later.');
      setLoading(false);
    }
  }, [setStatusSynced, hasBand, bandMin, bandMax, hasTheme, theme, themeLabel, hasPieces, piecesParam, trainingMode, user]);

  useEffect(() => { loadPuzzle(); }, [loadPuzzle]);

  // ── Submit result to backend (updates shared liveRating) ──
  const submitResult = useCallback(async (solved) => {
    if (submittedRef.current || !puzzle) return;
    submittedRef.current = true;
    // Analytics: count a solved puzzle (feeds admin Puzzle Analytics success rate).
    if (solved) {
      trackEvent('puzzle_solved', {
        mode: trainingMode,
        theme: hasTheme ? theme : undefined,
        pieces: hasPieces ? piecesParam : undefined,
        isGuest: !user,
        solveTimeMs: puzzleStartTimeRef.current ? Date.now() - puzzleStartTimeRef.current : 0
      });
    }
    try {
      const res = await api.post('/api/public/healthymix/submit', {
        puzzleId: puzzle._id || puzzle.id,
        solved,
        usedSolution: usedSolutionRef.current,
        // Tells the backend which surface served this puzzle. Only 'themes'
        // changes scoring (reduced solve reward); the rest score like classic
        // Healthy Mix.
        mode: trainingMode
      });
      setRating(res.data.newRating);
      setRatingDelta(res.data.pointsChange);
      tooEasyRef.current = !!res.data.tooEasy;
      // A correct-but-too-easy solve earns nothing (anti-farm). Tell the user
      // why, so a flat 0 doesn't look like a bug.
      if (solved && res.data.tooEasy) {
        setMessage('Correct — but too easy for your rating, so no points. Try harder puzzles to gain rating.');
      }
      // If this is a coach assignment, count this attempt toward it.
      reportAssignmentAttempt(solved);
    } catch (_) { /* ignore network errors for UX */ }
  }, [puzzle, reportAssignmentAttempt, trainingMode, hasTheme, theme, hasPieces, piecesParam, user]);

  // ── Play the opponent's reply move from the solution ──
  const playBotMove = useCallback((idx) => {
    const sol = solutionRef.current;
    if (idx >= sol.length) return;
    setBotThinking(true);
    setTimeout(() => {
      const game = new Chess(chessRef.current.fen());
      const san = sol[idx];
      try {
        let mv;
        try {
          mv = game.move(san);
        } catch (e) {
          const match = game.moves({ verbose: true })
            .find(m => normSan(m.san) === normSan(san));
          if (match) mv = game.move(match); else throw e;
        }
        chessRef.current = game;
        setFen(game.fen());
        if (mv) setLastMove({ from: mv.from, to: mv.to });
        moveIndexRef.current = idx + 1;
      } catch (_) { /* ignore */ }
      setBotThinking(false);
    }, 450);
  }, []);

  // ── Handle a user move ──
  const handleMove = useCallback((move) => {
    const st = statusRef.current;

    // After the puzzle is over (solved or failed), the board is a free analysis
    // board — accept any legal move for either side, like Lichess.
    if (st === 'solved' || st === 'failed') {
      const game = new Chess(chessRef.current.fen());
      let mv;
      try { mv = game.move(move); } catch (_) { return false; }
      if (!mv) return false;
      chessRef.current = game;
      setFen(game.fen());
      setLastMove({ from: mv.from, to: mv.to });
      return true;
    }

    if (st !== 'solving' || botThinking) return false;

    const game = new Chess(chessRef.current.fen());
    let result;
    try {
      result = game.move(move);
    } catch (_) {
      return false;
    }
    if (!result) return false;

    const sol = solutionRef.current;
    const idx = moveIndexRef.current;
    const expected = sol[idx];

    // Lichess rule: accept the stored move, OR any move that delivers immediate
    // checkmate (covers "multiple ways to mate" — alternate mates are valid).
    const matchesLine = normSan(result.san) === normSan(expected);
    const isAltMate = game.isCheckmate();

    if (matchesLine || isAltMate) {
      // Correct move
      chessRef.current = game;
      setFen(game.fen());
      setLastMove({ from: result.from, to: result.to });
      moveIndexRef.current = idx + 1;

      // An alternate mate ends the puzzle immediately, even mid-line.
      const isLast = isAltMate || idx + 1 >= sol.length;
      if (isLast) {
        // Puzzle complete. Only counts as a "solve" if it was never failed.
        setStatusSynced('solved');
        if (failedRef.current) {
          setMessage('Correct line. (No points — puzzle was failed.) Free play enabled.');
          playSound('complete');
        } else {
          setMessage('Success! Well played. Free play enabled.');
          playSound('correct');
          setSessionCorrect(c => c + 1);
          setStreak(s => s + 1);
          submitResult(true);
        }
      } else {
        setMessage(failedRef.current ? 'Right move — keep going.' : 'Best move! Keep going…');
        setTimeout(() => playBotMove(idx + 1), 350);
      }
      return true;
    }

    // ── Wrong move ──
    // Lichess: rating drops ONCE on the first wrong move, but you can retry.
    if (!failedRef.current) {
      failedRef.current = true;
      setSessionWrong(w => w + 1);
      setStreak(0);
      submitResult(false); // applies the penalty exactly once
      setMessage('That’s not the move. Try again — no points now.');
    } else {
      setMessage('Still not it. Try again, or view the solution.');
    }
    playSound('wrong');
    // Briefly show the wrong move, then snap back so they can retry.
    setFen(game.fen());
    setLastMove({ from: result.from, to: result.to });
    setTimeout(() => {
      setFen(chessRef.current.fen());
      setLastMove(null);
    }, 550);
    return true;
  }, [botThinking, submitResult, playBotMove, setStatusSynced]);

  // ── Reveal solution (after a fail or on demand) ──
  const showSolution = useCallback(() => {
    usedSolutionRef.current = true;
    // If still solving, this counts as a fail (penalty applied once).
    if (statusRef.current === 'solving') {
      if (!failedRef.current) {
        failedRef.current = true;
        submitResult(false);
        setSessionWrong(w => w + 1);
        setStreak(0);
      }
      setMessage('Solution revealed. Free play enabled.');
    }
    // Auto-play the remaining solution moves, then enter free-play.
    let game = new Chess(chessRef.current.fen());
    const sol = solutionRef.current;
    let i = moveIndexRef.current;
    const step = () => {
      if (i >= sol.length) {
        chessRef.current = game;
        moveIndexRef.current = i;
        setStatusSynced('failed'); // puzzle over → free analysis board
        return;
      }
      try {
        let mv;
        try { mv = game.move(sol[i]); }
        catch (e) {
          const m = game.moves({ verbose: true }).find(x => normSan(x.san) === normSan(sol[i]));
          if (m) mv = game.move(m); else throw e;
        }
        setFen(game.fen());
        if (mv) setLastMove({ from: mv.from, to: mv.to });
        chessRef.current = game;
      } catch (_) { /* ignore */ }
      i += 1;
      setTimeout(step, 500);
    };
    step();
  }, [submitResult, setStatusSynced]);

  const next = () => loadPuzzle(puzzle?._id || puzzle?.id);

  // Retry the SAME puzzle from the start (no rating change either way — it was
  // already scored on the first wrong move). Lets the user re-attempt the line.
  const retry = useCallback(() => {
    if (!puzzle) return;
    const game = new Chess(puzzle.fen || 'start');
    chessRef.current = game;
    moveIndexRef.current = 0;
    setFen(game.fen());
    setLastMove(null);
    setStatusSynced('solving');
    setMessage(failedRef.current ? 'Retry — find the right line (no points).' : 'Your turn — find the best move.');
  }, [puzzle, setStatusSynced]);

  // Board is interactive while solving, OR always once the puzzle is over (free play).
  const boardInteractive =
    (status === 'solving' && !botThinking) || status === 'solved' || status === 'failed';

  const toMoveLabel = orientation === 'white' ? 'White to move' : 'Black to move';

  return (
    <div className="hm-page">
      {/* Coach assignment progress banner */}
      {hasAssignment && (
        <div style={{
          maxWidth: 1100, margin: '0 auto 12px', padding: '10px 16px',
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 12, color: '#c4b5fd', fontWeight: 600, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>📋 Coach assignment{assignTarget > 0 ? ` · ${assignProgress}/${assignTarget} puzzles` : ''}</span>
          {assignTarget > 0 && (
            <div style={{ flex: 1, maxWidth: 240, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((assignProgress / assignTarget) * 100))}%`, height: '100%', background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />
            </div>
          )}
        </div>
      )}

      {/* Assignment finished popup */}
      {assignDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'rgba(23,23,23,0.97)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, padding: '32px 36px', textAlign: 'center', maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Assignment finished!</h2>
            <p style={{ color: '#9ca3af', margin: '0 0 22px' }}>You completed all {assignTarget} puzzles your coach assigned.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ flex: 1, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{assignDone.solved}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>SOLVED</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{assignDone.failed}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>FAILED</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>🔥 {assignDone.maxStreak}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>BEST STREAK</div>
              </div>
            </div>
            <button
              onClick={submitAssignment}
              disabled={assignSubmitting}
              style={{ width: '100%', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: assignSubmitting ? 'wait' : 'pointer' }}
            >
              {assignSubmitting ? 'Submitting…' : 'Submit to coach'}
            </button>
          </div>
        </div>
      )}

      <div className="hm-layout">

        {/* ── LEFT: rating + controls ── */}
        <aside className="hm-side">
          <div className="hm-brand">
            <span className="hm-brand-icon">🧩</span>
            <div>
              <div className="hm-brand-title">
                {hasTheme ? themeLabel
                  : hasPieces ? `${piecesParam} Pieces`
                  : 'Healthy Mix'}
              </div>
              <div className="hm-brand-sub">
                {hasTheme ? 'Themed training (±100 your rating)'
                  : hasPieces ? 'Pieces training (±400 your rating)'
                  : hasBand ? `Rating ${bandMin}–${bandMax}`
                  : 'Endless tactics'}
              </div>
            </div>
          </div>

          {hasTheme && (
            <div className="hm-band-badge">
              🎯 Theme: {themeLabel} only — near your rating
            </div>
          )}

          {!hasTheme && hasPieces && (
            <div className="hm-band-badge">
              ♟️ {piecesParam} pieces on the board — near your rating
            </div>
          )}

          {!hasTheme && !hasPieces && hasBand && (
            <div className="hm-band-badge">
              🎯 Filtered: {bandMin}–{bandMax} rated puzzles
            </div>
          )}

          {/* Rating card */}
          <div className="hm-rating-card">
            <div className="hm-rating-label">Your Puzzle Rating</div>
            <div className="hm-rating-value">
              {rating}
              {ratingDelta != null && ratingDelta !== 0 && (
                <span className={`hm-rating-delta ${ratingDelta > 0 ? 'up' : 'down'}`}>
                  {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta}
                </span>
              )}
            </div>
            <div className="hm-rating-note">Shared with your Daily Puzzles</div>
          </div>

          {/* Session stats */}
          <div className="hm-stats">
            <div className="hm-stat">
              <span className="hm-stat-num hm-green">{sessionCorrect}</span>
              <span className="hm-stat-label">Solved</span>
            </div>
            <div className="hm-stat">
              <span className="hm-stat-num hm-red">{sessionWrong}</span>
              <span className="hm-stat-label">Failed</span>
            </div>
            <div className="hm-stat">
              <span className="hm-stat-num hm-orange">{streak}</span>
              <span className="hm-stat-label">Streak</span>
            </div>
          </div>

          {/* Controls */}
          <div className="hm-controls">
            <div className="hm-message-inline">{message}</div>

            {/* While solving */}
            {status === 'solving' && failedRef.current && (
              <button className="hm-btn hm-btn-ghost" onClick={retry}>
                ↻ Retry from start
              </button>
            )}
            {status === 'solving' && (
              <button className="hm-btn hm-btn-ghost" onClick={showSolution}>
                View solution
              </button>
            )}

            {/* After the puzzle is over (solved or failed) */}
            {(status === 'solved' || status === 'failed') && (
              <>
                <button className="hm-btn hm-btn-primary" onClick={next}>
                  Next puzzle →
                </button>
                <button className="hm-btn hm-btn-ghost" onClick={retry}>
                  ↻ Retry this puzzle
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ── RIGHT: board ── */}
        <main className="hm-board-col">
          <div className="hm-board-wrap" ref={boardWrapRef} style={{ width: boardSize }}>
            <Chessboard
              position={fen}
              orientation={orientation}
              boardWidth={boardSize}
              draggable={boardInteractive}
              lastMove={lastMove}
              onDrop={(from, to, promotion) =>
                handleMove({ from, to, promotion: promotion || 'q' })
              }
            />
            <div
              className="hm-resize-handle"
              onMouseDown={onResizeDragStart}
              onTouchStart={onResizeDragStart}
              title="Drag to resize board"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="6" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Exhausted overlay — shown when every puzzle at this piece count
                has been solved this session (sparse counts like 3 pieces). */}
            {exhausted && (
              <div className="hm-exhausted-overlay">
                <div className="hm-exhausted-card">
                  <div className="hm-exhausted-icon">✅</div>
                  <h3 className="hm-exhausted-title">
                    All {exhausted.pieces}-piece puzzles done!
                  </h3>
                  <p className="hm-exhausted-text">
                    You've completed all {exhausted.total} puzzle{exhausted.total === 1 ? '' : 's'} with
                    {' '}{exhausted.pieces} pieces. Pick a different piece count to keep training.
                  </p>
                  <button
                    className="hm-btn hm-btn-primary"
                    onClick={() => navigate('/puzzles/pieces')}
                  >
                    Pick another piece count →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Puzzle meta — below the board */}
          {puzzle && (
            <div className="hm-meta hm-meta-below">
              <div className="hm-meta-row">
                <span>Puzzle rating</span>
                <strong>{puzzle.rating || '—'}</strong>
              </div>
              {puzzle.topic && puzzle.topic !== 'mixed' && (
                <div className="hm-meta-row">
                  <span>Theme</span>
                  <strong className="hm-cap">{puzzle.topic}</strong>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
