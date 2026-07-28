import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import EnginePanel from '../components/EnginePanel';
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

// The opponent's move that produced this position, for the "last move" highlight.
// Preferred source is the stored `setupMove` (set by the importer / backfill).
// Fallback: if the fen carries an en-passant target square, the last move MUST have
// been the double pawn push that created it, so we can derive from/to exactly — this
// covers puzzles imported before setupMove existed, which is the case that matters
// most since en passant is impossible to spot without seeing the previous move.
// Any other move type leaves no trace in the fen, so it stays un-highlighted.
function setupHighlight(puzzle, fen) {
  const sm = puzzle?.setupMove;
  if (sm?.from && sm?.to) return { from: sm.from, to: sm.to };
  const ep = (fen || '').split(' ')[3];
  if (ep && ep !== '-' && ep.length === 2) {
    const file = ep[0];
    const rank = Number(ep[1]);
    // The ep target sits BEHIND the pawn that just advanced two squares:
    // rank 6 → black played f7→f5; rank 3 → white played f2→f4.
    if (rank === 6) return { from: `${file}7`, to: `${file}5` };
    if (rank === 3) return { from: `${file}2`, to: `${file}4` };
  }
  return null;
}

// Moves list + back/forward navigation. Rendered TWICE — right of the board on
// desktop (hidden on mobile) and below the controls on mobile (hidden on desktop) —
// via the `variant` class, so the same markup serves both placements.
function MovesPanel({ plies, shownPlyIdx, atLive, navFirst, navPrev, navNext, navLast,
                      goToPly, variant, variations = [], activeVar = null, varViewIdx = null,
                      goToVarPly, atStart }) {
  // Which move number / colour a mainline ply belongs to. Ply 1 is White's 1st move.
  const moveNoOf = (idx) => Math.ceil(idx / 2);
  const isWhitePly = (idx) => idx % 2 === 1;

  // A variation renders as an indented line under the mainline move it branches from,
  // e.g. "1... Nf6 2. c4" — so the original puzzle line is never overwritten.
  const renderVariation = (v, vIdx) => {
    const parts = [];
    v.moves.forEach((m, i) => {
      // The variation's first move continues from ply `startIdx`, so it is played by
      // the opposite side to that ply.
      const plyNo = v.startIdx + 1 + i;
      const white = isWhitePly(plyNo);
      const active = activeVar === vIdx &&
        (varViewIdx === null ? i === v.moves.length - 1 : varViewIdx === i);
      if (white || i === 0) {
        parts.push(
          <span key={`n${i}`} className="hm-var-no">
            {moveNoOf(plyNo)}{white ? '.' : '…'}
          </span>
        );
      }
      parts.push(
        <button
          key={`m${i}`}
          className={`hm-var-mv ${active ? 'on' : ''}`}
          onClick={() => goToVarPly && goToVarPly(vIdx, i)}
        >
          {m.san}
        </button>
      );
    });
    return <div key={`v${vIdx}`} className="hm-var">{parts}</div>;
  };

  // Dense 2-column notation (Lichess-style): numbered rows, white move | black move.
  // Variations are emitted directly after the row containing their branch point.
  const rows = [];
  for (let i = 1; i < plies.length; i += 2) {
    const wIdx = i, bIdx = i + 1;
    rows.push(
      <div key={i} className="hm-mrow">
        <span className="hm-mno">{Math.ceil(i / 2)}.</span>
        <button className={`hm-mv ${activeVar === null && shownPlyIdx === wIdx ? 'on' : ''}`} onClick={() => goToPly(wIdx)}>{plies[wIdx].san}</button>
        {plies[bIdx]
          ? <button className={`hm-mv ${activeVar === null && shownPlyIdx === bIdx ? 'on' : ''}`} onClick={() => goToPly(bIdx)}>{plies[bIdx].san}</button>
          : <span className="hm-mv" />}
      </div>
    );
    // Any variation branching from this row's white or black ply.
    variations.forEach((v, vIdx) => {
      if (v.startIdx === wIdx || v.startIdx === bIdx) rows.push(renderVariation(v, vIdx));
    });
  }
  // Variations branching from the start position (before any move) have no row above.
  variations.forEach((v, vIdx) => {
    if (v.startIdx === 0) rows.unshift(renderVariation(v, vIdx));
  });
  return (
    <div className={`hm-moves ${variant || ''}`}>
      <div className="hm-moves-head">
        <span className="hm-moves-title">Moves</span>
      </div>
      <div className="hm-moves-list">
        {rows.length ? rows : <span className="hm-moves-empty">No moves yet — make a move on the board.</span>}
      </div>
      <div className="hm-moves-foot">
        <span className="hm-moves-nav">
          <button className="hm-nav-btn" onClick={navFirst} disabled={atStart} title="Start">⏮</button>
          <button className="hm-nav-btn" onClick={navPrev} disabled={atStart} title="Previous move">◀</button>
          <button className="hm-nav-btn" onClick={navNext} disabled={atLive} title="Next move">▶</button>
          <button className="hm-nav-btn" onClick={navLast} disabled={atLive} title="Latest">⏭</button>
        </span>
      </div>
    </div>
  );
}

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

  // Redo mode (from the Puzzle Dashboard): replay the EXACT puzzles the user got
  // wrong, by id, on this same board. The id list is handed over via sessionStorage.
  const isRedo = searchParams.get('redo') === '1';
  const redoQueueRef = useRef(null);   // [{ _id, fen, solution, rating, ... }]
  const redoIdxRef = useRef(0);
  const [redoTotal, setRedoTotal] = useState(0);
  const [redoSolved, setRedoSolved] = useState(0);
  const [redoDone, setRedoDone] = useState(false);

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
  const puzzleRef = useRef(null);         // mirror of `puzzle` for stable callbacks
  const [loading, setLoading] = useState(true);
  const [fen, setFen] = useState('start');
  const [orientation, setOrientation] = useState('white');
  const [status, setStatus] = useState('loading'); // loading | solving | solved | failed
  const [message, setMessage] = useState('Loading…');
  const [botThinking, setBotThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null); // { from, to } for highlight

  // Post-puzzle Stockfish panel (top 3 lines). Only offered once the puzzle is over
  // — never while solving, or it would just hand the answer over. Starts OFF every
  // time (including on each new puzzle, see the reset in `renderPuzzle`) so the
  // engine costs nothing unless the user opts in.
  const [engineOn, setEngineOn] = useState(false);

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
    return { correct: 0, wrong: 0, streak: 0, history: [] };
  };
  const saved = initSession();

  const [rating, setRating] = useState(user?.liveRating ?? 1200);
  const [ratingDelta, setRatingDelta] = useState(null); // last change, for the +N / −N flash
  const [sessionCorrect, setSessionCorrect] = useState(saved.correct);
  const [sessionWrong, setSessionWrong] = useState(saved.wrong);
  const [streak, setStreak] = useState(saved.streak);
  // Per-session result strip shown below the board (like the daily puzzles page):
  // one ✓/✗ mark per puzzle attempted this session, newest last. Session-only.
  const [sessionHistory, setSessionHistory] = useState(Array.isArray(saved.history) ? saved.history : []);

  // Mode switcher (below the board): Healthy Mix / Themes / Pieces / Rating.
  // "Rating" opens an in-page band popup; the others navigate. Bands are prefetched
  // so the popup opens instantly.
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingBands, setRatingBands] = useState([]);
  useEffect(() => {
    api.get('/api/public/healthymix/rating-bands')
      .then(res => setRatingBands(res.data.bands || []))
      .catch(() => {});
  }, []);
  const chooseBand = (b) => {
    setShowRatingModal(false);
    navigate(`/training/healthy-mix?min=${b.min}&max=${b.max}`);
  };
  // Record one attempt result. Kept tiny (id + correctness + rating) so the strip
  // can show a tooltip without holding whole puzzle objects.
  const pushHistory = useCallback((correct) => {
    const p = puzzleRef.current;
    setSessionHistory(h => [...h, { correct, rating: p?.rating || null, topic: p?.topic || null }]);
  }, []);

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
        JSON.stringify({ correct: sessionCorrect, wrong: sessionWrong, streak, history: sessionHistory })
      );
    } catch (_) { /* ignore */ }
  }, [sessionCorrect, sessionWrong, streak, sessionHistory]);

  const chessRef = useRef(new Chess());
  const solutionRef = useRef([]);
  const moveIndexRef = useRef(0);

  // ── Move history (back/forward navigation + moves list) ──
  // Declared BEFORE the move callbacks below, which reference pushPly — a const can't
  // be used before its initialization (temporal dead zone). `plies[0]` is the start
  // position; later entries are played moves. `viewIdx` = ply being browsed (null = live).
  const [plies, setPlies] = useState([]);       // [{ san, fen, from, to }]
  const [viewIdx, setViewIdx] = useState(null); // null = live
  const pushPly = useCallback((san, fen, from, to) => {
    setPlies(prev => [...prev, { san, fen, from, to }]);
  }, []);

  // ── Analysis variations (free play after the puzzle is over) ──
  // The puzzle line stays in `plies` as the untouched mainline. Playing an
  // alternative move from a browsed position starts a VARIATION instead of
  // overwriting it, so the original line is never lost:
  //   { startIdx, moves: [{ san, fen, from, to }] }
  // `startIdx` is the mainline ply the variation branches from. `activeVar` is the
  // variation currently being played/browsed; `varViewIdx` is the ply within it.
  const [variations, setVariations] = useState([]);
  const [activeVar, setActiveVar] = useState(null);  // index into `variations`, or null
  const [varViewIdx, setVarViewIdx] = useState(null); // ply within the active variation
  // Analysis lines belong to one puzzle attempt — wipe them whenever the mainline is
  // rebuilt (new puzzle, redo, retry), or they'd point at plies that no longer exist.
  const clearVariations = useCallback(() => {
    setVariations([]);
    setActiveVar(null);
    setVarViewIdx(null);
  }, []);

  const usedSolutionRef = useRef(false);
  const submittedRef = useRef(false);
  const failedRef = useRef(false);   // puzzle scored as a fail (wrong move or solution shown)
  const tooEasyRef = useRef(false);  // last solve earned 0 (puzzle far below user rating)
  const statusRef = useRef('loading'); // mirror of status for use inside callbacks

  // keep statusRef in sync so handlers can branch on the live status
  const setStatusSynced = useCallback((s) => { statusRef.current = s; setStatus(s); }, []);

  // Board sizing — drag-to-resize handle (Lichess-style corner grip)
  const boardWrapRef = useRef(null);
  const boardColRef = useRef(null);
  const MIN_BOARD = 200;
  // Chrome that .hm-board-outer adds around the board. There is no container behind
  // the board any more, so this is 0 — kept as a named constant because the board
  // sizing math and the right column's height both derive from it.
  const FRAME_CHROME = 0;
  // Ceiling for big monitors. The board is still bounded by its measured column
  // (can't overflow the moves card) AND by viewport height below, so this is only
  // the upper cap, not the usual limit.
  const MAX_BOARD = 1100;
  // Vertical space reserved for chrome above/below the board (trimmed page padding
  // + the session strip). Kept small so tall screens actually get a tall board.
  const VERT_RESERVE = 74;
  // Board auto-sizes to the screen. The old code hard-capped the board at `preferred`
  // (480px) on ANY desktop, so a 32" monitor showed the same tiny board as a laptop.
  // Now the board GROWS with the viewport (a share of the available width beside the
  // 320px sidebar), clamped to a sensible range — big screen → big board.
  const fitToViewport = (preferred) => {
    if (typeof window === 'undefined') return preferred;
    const w = window.innerWidth;
    if (w <= 960) {
      // Single-column layout: board fills the width. On a phone we use the SAME
      // 16px total inset as the Daily Puzzles board (Puzzles.jsx) so both pages
      // show an identically sized board; wider single-column screens keep a
      // slightly roomier 48px gutter.
      const inset = w <= 480 ? 16 : 48;
      return Math.max(MIN_BOARD, Math.min(preferred, w - inset - FRAME_CHROME));
    }
    // Desktop 3-column layout. These MUST match the grid track widths and gap in
    // .hm-layout (HealthyMix.css) or the board will overflow into the moves card.
    const leftCol = 300, rightCol = 290, gaps = 22 * 2, pagePad = 24 * 2;
    const midColWidth = w - leftCol - rightCol - gaps - pagePad;
    return Math.max(MIN_BOARD, Math.min(MAX_BOARD, midColWidth - FRAME_CHROME));
  };
  const [boardSize, setBoardSize] = useState(() => fitToViewport(480));
  // Expose the board height to CSS so the moves card can match it exactly (they line
  // up bottom-to-bottom).
  useEffect(() => {
    // The framed board is the board plus .hm-board-outer's padding/border, so the
    // moves card must match THAT height to line up bottom-to-bottom.
    document.documentElement.style.setProperty('--hm-board-h', `${boardSize + FRAME_CHROME}px`);
    return () => document.documentElement.style.removeProperty('--hm-board-h');
  }, [boardSize]);

  // Re-fit the board to the ACTUAL width of its column (measured), so it can never
  // overflow into the moves card — the estimate-from-innerWidth approach was wrong on
  // some widths. A ResizeObserver on the board column keeps it correct on any resize.
  useEffect(() => {
    // Measure the COLUMN, not the board's own ancestors: .hm-board-stack and
    // .hm-board-outer are both sized by the board, so observing them would feed the
    // board's width back into itself. .hm-board-col is the real grid cell.
    const el = boardColRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      // Fallback: viewport estimate.
      const onResize = () => setBoardSize(fitToViewport(480));
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    const fit = () => {
      // The frame's padding/border live INSIDE the column, so the board gets whatever
      // is left after the chrome. This is exact — no percentage fudge factor.
      const avail = el.clientWidth - FRAME_CHROME;
      if (window.innerWidth <= 960) {
        // Single-column layout: fill the column, bounded by the viewport. Phones
        // use the same 16px inset as Daily Puzzles (see fitToViewport above), and
        // we take the LARGER of column/viewport-derived width so a narrow parent
        // column can't hold the board below full width.
        const inset = window.innerWidth <= 480 ? 16 : 48;
        const byViewport = window.innerWidth - inset - FRAME_CHROME;
        setBoardSize(Math.max(MIN_BOARD, Math.min(Math.max(avail, byViewport), byViewport)));
      } else {
        // Desktop: capped by the column AND by viewport height (leaving room for the
        // page chrome + session strip below) so a tall board never scrolls off.
        const byHeight = window.innerHeight - VERT_RESERVE - FRAME_CHROME;
        setBoardSize(Math.max(MIN_BOARD, Math.min(MAX_BOARD, avail, byHeight)));
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // Height-only window changes don't resize the column, so also refit on resize.
    window.addEventListener('resize', fit);
    fit();
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  // ── Load current rating once ──
  useEffect(() => {
    api.get('/api/public/healthymix/rating')
      .then(res => setRating(res.data.rating))
      .catch(() => {});
  }, []);

  // ── Load a puzzle ──
  // Render a puzzle object onto the board (shared by normal + redo flows).
  const renderPuzzle = useCallback((p) => {
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
    puzzleStartTimeRef.current = Date.now();
    setPuzzle(p);
    puzzleRef.current = p;
    setFen(game.fen());
    // Highlight the opponent's setup move that produced this position. The stored
    // fen is already AFTER that move, so without this the solver has no way to see
    // what was just played — which makes en passant in particular unfair to spot.
    setLastMove(setupHighlight(p, game.fen()));
    // Reset move history to just the starting position (ply 0).
    setPlies([{ san: null, fen: game.fen(), from: null, to: null }]);
    setViewIdx(null);
    clearVariations();
    // Engine always starts off on a fresh puzzle / retry — the user opts in each time.
    setEngineOn(false);
    setOrientation(game.turn() === 'w' ? 'white' : 'black');
    setStatusSynced('solving');
    setMessage('Your turn — find the best move.');
    setLoading(false);
  }, [setStatusSynced, clearVariations]);

  const loadPuzzle = useCallback(async (excludeId) => {
    setLoading(true);
    setStatusSynced('loading');
    setMessage('Loading…');
    setRatingDelta(null);
    setLastMove(null);

    // ── Redo mode: serve the exact failed puzzles, in order, from the queue. ──
    if (isRedo) {
      try {
        if (!redoQueueRef.current) {
          let ids = [];
          try { ids = JSON.parse(sessionStorage.getItem('redoPuzzleIds') || '[]'); } catch { ids = []; }
          if (!ids.length) { setMessage('No puzzles to redo.'); setLoading(false); return; }
          const res = await api.post('/api/public/healthymix/by-ids', { ids });
          redoQueueRef.current = res.data.puzzles || [];
          redoIdxRef.current = 0;
          setRedoTotal(redoQueueRef.current.length);
          setRedoSolved(0);
        }
        const queue = redoQueueRef.current;
        if (redoIdxRef.current >= queue.length) {
          setRedoDone(true);
          setStatusSynced('loading');
          setMessage('');
          setLoading(false);
          return;
        }
        renderPuzzle(queue[redoIdxRef.current]);
      } catch {
        setMessage('Could not load redo puzzles.');
        setLoading(false);
      }
      return;
    }

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
      puzzleRef.current = p;
      setFen(game.fen());
      // Reset the move history to just THIS puzzle's start (clears previous puzzle's
      // notation from the moves card). This path doesn't go through renderPuzzle, so
      // it must reset plies/viewIdx itself.
      setPlies([{ san: null, fen: game.fen(), from: null, to: null }]);
      setViewIdx(null);
      clearVariations();
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
  }, [setStatusSynced, hasBand, bandMin, bandMax, hasTheme, theme, themeLabel, hasPieces, piecesParam, trainingMode, user, isRedo, renderPuzzle]);

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
        mode: trainingMode,
        // What the user actually chose, so the Puzzle Dashboard labels "Recent
        // puzzles" by their selection (theme / rating band / piece count /
        // Healthy Mix) rather than the puzzle's incidental Lichess tags.
        selectedTheme: hasTheme ? theme : undefined,
        selectedPieces: hasPieces ? piecesParam : undefined,
        selectedBandMin: hasBand ? bandMin : undefined,
        selectedBandMax: hasBand ? bandMax : undefined
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
  }, [puzzle, reportAssignmentAttempt, trainingMode, hasTheme, theme, hasPieces, piecesParam, hasBand, bandMin, bandMax, user]);

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
        if (mv) { setLastMove({ from: mv.from, to: mv.to }); pushPly(mv.san, game.fen(), mv.from, mv.to); }
        moveIndexRef.current = idx + 1;
      } catch (_) { /* ignore */ }
      setBotThinking(false);
    }, 450);
  }, [pushPly]);

  // ── Handle a user move ──
  const handleMove = useCallback((move) => {
    const st = statusRef.current;

    // After the puzzle is over (solved or failed), the board is a free analysis
    // board — accept any legal move for either side, like Lichess.
    if (st === 'solved' || st === 'failed') {
      // Where are we playing from? Three cases, in priority order:
      //   1. inside a variation  -> extend it (or fork a new one from its middle)
      //   2. browsing the mainline -> start a NEW variation there (mainline kept)
      //   3. at the live end of the mainline -> just append to the mainline
      const inVar = activeVar !== null && variations[activeVar];
      let baseFen;
      if (inVar) {
        const vMoves = variations[activeVar].moves;
        const vAt = varViewIdx === null ? vMoves.length - 1 : varViewIdx;
        baseFen = vMoves[vAt] ? vMoves[vAt].fen : plies[variations[activeVar].startIdx].fen;
      } else if (viewIdx !== null && viewIdx < plies.length - 1) {
        baseFen = plies[viewIdx].fen;
      } else {
        baseFen = chessRef.current.fen();
      }

      const game = new Chess(baseFen);
      let mv;
      try { mv = game.move(move); } catch (_) { return false; }
      if (!mv) return false;
      const node = { san: mv.san, fen: game.fen(), from: mv.from, to: mv.to };
      chessRef.current = game;
      setFen(game.fen());
      setLastMove({ from: mv.from, to: mv.to });

      if (inVar) {
        // Extend the active variation, truncating anything after the browsed ply
        // (a variation is itself linear — nested sub-variations aren't supported).
        const vAt = varViewIdx === null ? variations[activeVar].moves.length - 1 : varViewIdx;
        setVariations(prev => prev.map((v, i) =>
          i === activeVar ? { ...v, moves: [...v.moves.slice(0, vAt + 1), node] } : v));
        setVarViewIdx(null);
      } else if (viewIdx !== null && viewIdx < plies.length - 1) {
        // Branch off the mainline — the mainline itself is left intact.
        setActiveVar(variations.length);
        setVariations(prev => [...prev, { startIdx: viewIdx, moves: [node] }]);
        setVarViewIdx(null);
        setViewIdx(null);
      } else {
        pushPly(node.san, node.fen, node.from, node.to);
      }
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
      pushPly(result.san, game.fen(), result.from, result.to);
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
          pushHistory(true);
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
      pushHistory(false);
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
  }, [botThinking, submitResult, playBotMove, setStatusSynced, pushPly, viewIdx, plies,
      activeVar, variations, varViewIdx]);

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
        pushHistory(false);
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
        if (mv) { setLastMove({ from: mv.from, to: mv.to }); pushPly(mv.san, game.fen(), mv.from, mv.to); }
        chessRef.current = game;
      } catch (_) { /* ignore */ }
      i += 1;
      setTimeout(step, 500);
    };
    step();
  }, [submitResult, setStatusSynced, pushPly]);

  const next = () => {
    if (isRedo) {
      // Count a solved redo (only if solved without revealing the solution).
      if (status === 'solved' && !usedSolutionRef.current) {
        setRedoSolved(n => n + 1);
      }
      redoIdxRef.current += 1;
      loadPuzzle();
      return;
    }
    loadPuzzle(puzzle?._id || puzzle?.id);
  };

  // Retry the SAME puzzle from the start (no rating change either way — it was
  // already scored on the first wrong move). Lets the user re-attempt the line.
  const retry = useCallback(() => {
    if (!puzzle) return;
    const game = new Chess(puzzle.fen || 'start');
    chessRef.current = game;
    moveIndexRef.current = 0;
    setFen(game.fen());
    // Back to the starting position → restore the setup-move highlight (not null,
    // or a retry would hide the very hint the first attempt had).
    setLastMove(setupHighlight(puzzle, game.fen()));
    // Retry replays from the start — clear the moves card back to the start position.
    setPlies([{ san: null, fen: game.fen(), from: null, to: null }]);
    setViewIdx(null);
    clearVariations();
    setEngineOn(false);   // back to solving → engine hidden and off again
    setStatusSynced('solving');
    setMessage(failedRef.current ? 'Retry — find the right line (no points).' : 'Your turn — find the best move.');
  }, [puzzle, setStatusSynced, clearVariations]);

  // Copy the puzzle's STARTING fen (puzzle.fen is the position at the beginning,
  // before the solution is played) with brief "Copied!" feedback.
  const [fenCopied, setFenCopied] = useState(false);
  const copyFen = useCallback(async () => {
    const startFen = puzzle?.fen;
    if (!startFen) return;
    try {
      await navigator.clipboard.writeText(startFen);
      setFenCopied(true);
      setTimeout(() => setFenCopied(false), 1500);
    } catch { /* clipboard blocked — ignore */ }
  }, [puzzle]);

  // ── Move navigation ──
  // Inside a variation the board follows the VARIATION's moves; otherwise it follows
  // the mainline. `curVar` is the active variation (or null when on the mainline).
  const curVar = activeVar !== null ? variations[activeVar] : null;
  const varAt = curVar
    ? (varViewIdx === null ? curVar.moves.length - 1 : varViewIdx)
    : -1;
  const curVarNode = curVar ? curVar.moves[varAt] : null;

  const atLive = curVar
    ? (varViewIdx === null || varViewIdx >= curVar.moves.length - 1)
    : (viewIdx === null || viewIdx >= plies.length - 1);
  const shownPlyIdx = viewIdx === null ? plies.length - 1 : viewIdx;
  // What the board actually displays: the active variation's ply, else the browsed
  // mainline ply, else the live position.
  const displayFen = curVarNode ? curVarNode.fen
    : (viewIdx !== null && plies[viewIdx]) ? plies[viewIdx].fen
    : fen;
  const displayLastMove = curVarNode ? { from: curVarNode.from, to: curVarNode.to }
    : (viewIdx !== null && plies[viewIdx] && plies[viewIdx].from)
      ? { from: plies[viewIdx].from, to: plies[viewIdx].to }
      : lastMove;

  // Jumping to a MAINLINE ply always leaves whatever variation was active.
  const goToPly = useCallback((i) => {
    const clamped = Math.max(0, Math.min(plies.length - 1, i));
    setActiveVar(null);
    setVarViewIdx(null);
    setViewIdx(clamped >= plies.length - 1 ? null : clamped); // last ply = back to live
  }, [plies.length]);

  // Jump to a ply inside a specific variation.
  const goToVarPly = useCallback((vIdx, i) => {
    setActiveVar(vIdx);
    setVarViewIdx(i);
    setViewIdx(null);
  }, []);
  const navFirst = useCallback(() => goToPly(0), [goToPly]);
  // Prev/next step INSIDE the active variation when there is one. Stepping back off
  // the front of a variation returns to the mainline ply it branched from.
  const navPrev = useCallback(() => {
    if (curVar) {
      const at = varViewIdx === null ? curVar.moves.length - 1 : varViewIdx;
      if (at > 0) { setVarViewIdx(at - 1); return; }
      goToPly(curVar.startIdx);
      return;
    }
    goToPly((viewIdx === null ? plies.length - 1 : viewIdx) - 1);
  }, [curVar, varViewIdx, goToPly, viewIdx, plies.length]);
  const navNext = useCallback(() => {
    if (curVar) {
      const at = varViewIdx === null ? curVar.moves.length - 1 : varViewIdx;
      if (at < curVar.moves.length - 1) setVarViewIdx(at + 1);
      return;
    }
    goToPly((viewIdx === null ? plies.length - 1 : viewIdx) + 1);
  }, [curVar, varViewIdx, goToPly, viewIdx, plies.length]);
  const navLast = useCallback(() => {
    if (curVar) { setVarViewIdx(null); return; }
    setViewIdx(null);
  }, [curVar]);

  // Keyboard move navigation (←/→ step, Home/End jump). The moves card buttons call
  // the same callbacks; this just adds the shortcut everyone expects from a board.
  // Bound to `window` so it works without clicking the moves list first — but it must
  // stay out of the way of typing and of the rating modal, hence the guards below.
  useEffect(() => {
    const handler = (e) => {
      // Never hijack an editable field, and let modifier combos (browser back, etc.)
      // through untouched.
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // While the rating picker is open the arrows belong to it, not the board.
      if (showRatingModal) return;

      if (e.key === 'ArrowLeft')       { e.preventDefault(); navPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navNext(); }
      else if (e.key === 'Home')       { e.preventDefault(); navFirst(); }
      else if (e.key === 'End')        { e.preventDefault(); navLast(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navPrev, navNext, navFirst, navLast, showRatingModal]);

  // Once the puzzle is over the board becomes a free analysis board: playable from
  // ANY position in the line, including a browsed-back one (moving there forks the
  // line from that point, like a study board). While still solving, moves are only
  // accepted at the live position.
  const puzzleOver = status === 'solved' || status === 'failed';
  const boardInteractive =
    puzzleOver || (atLive && status === 'solving' && !botThinking);
  // Back/start are dead only at the very start of the mainline — inside a variation
  // there is always somewhere to step back to.
  const atStart = !curVar && shownPlyIdx <= 0;

  const toMoveLabel = orientation === 'white' ? 'White to move' : 'Black to move';

  return (
    <div className="hm-page">
      {/* Coach assignment progress banner - enhanced glass style */}
      {hasAssignment && (
        <div style={{
          maxWidth: 1100, margin: '0 auto 16px', padding: '12px 20px',
          background: 'rgba(139,92,246,0.08)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 14,
          color: '#c4b5fd',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <span>📋 Coach assignment{assignTarget > 0 ? ` · ${assignProgress}/${assignTarget} puzzles` : ''}</span>
          {assignTarget > 0 && (
            <div style={{ flex: 1, maxWidth: 240, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((assignProgress / assignTarget) * 100))}%`, height: '100%', background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />
            </div>
          )}
        </div>
      )}

      {/* Assignment finished popup - glass version */}
      {assignDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'rgba(20,22,30,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '32px 36px', textAlign: 'center', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Assignment finished!</h2>
            <p style={{ color: '#9ca3af', margin: '0 0 22px' }}>You completed all {assignTarget} puzzles your coach assigned.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{assignDone.solved}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>SOLVED</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{assignDone.failed}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>FAILED</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>🔥 {assignDone.maxStreak}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>BEST STREAK</div>
              </div>
            </div>
            <button
              onClick={submitAssignment}
              disabled={assignSubmitting}
              style={{ width: '100%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: assignSubmitting ? 'wait' : 'pointer', boxShadow: '0 6px 24px rgba(6,182,212,0.3)' }}
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
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <button
              className="hm-back-btn"
              onClick={() => navigate('/training')}
              title="Back to Training"
              aria-label="Back to Training"
            >
              ← Back
            </button>
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
            <div className="hm-rating-note">{toMoveLabel}</div>
            {/* Straight to the user's OWN puzzle dashboard (auth-protected route —
                not the public /player/:displayName one, which shows someone else's). */}
            <button
              className="hm-dash-btn"
              onClick={() => navigate('/puzzle-dashboard')}
              title="Open your Puzzle Dashboard"
            >
              📊 My Puzzle Dashboard
            </button>
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

          {/* Training-mode switcher */}
          <div className="hm-modes-wrap">
            <div className="hm-modes-label">Training mode</div>
            <div className="hm-modes">
              <button className={`hm-mode-btn ${trainingMode === 'healthymix' ? 'hm-mode-on' : ''}`} onClick={() => navigate('/training/healthy-mix')}>🧩 Healthy Mix</button>
              <button className={`hm-mode-btn ${trainingMode === 'themes' ? 'hm-mode-on' : ''}`} onClick={() => navigate('/puzzles/themes')}>🎯 Themes</button>
              <button className={`hm-mode-btn ${trainingMode === 'pieces' ? 'hm-mode-on' : ''}`} onClick={() => navigate('/puzzles/pieces')}>♟️ Pieces</button>
              <button className={`hm-mode-btn ${trainingMode === 'rating' ? 'hm-mode-on' : ''}`} onClick={() => setShowRatingModal(true)}>📊 Rating</button>
            </div>
          </div>
        </aside>

        {/* ── MIDDLE: board ── */}
        <main className="hm-board-col" ref={boardColRef}>
          <div className="hm-board-outer" style={{ width: boardSize + FRAME_CHROME }}>
            <div className="hm-board-stack">
              <div className="hm-board-wrap" ref={boardWrapRef} style={{ width: boardSize }}>
            <Chessboard
              position={displayFen}
              orientation={orientation}
              boardWidth={boardSize}
              draggable={boardInteractive}
              lastMove={displayLastMove}
              onDrop={(from, to, promotion) =>
                handleMove({ from, to, promotion: promotion || 'q' })
              }
            />
            {/* Exhausted overlay */}
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

            {/* Redo complete overlay */}
            {redoDone && (() => {
              const pct = redoTotal ? Math.round((redoSolved / redoTotal) * 100) : 0;
              const good = pct >= 70;
              return (
                <div className="hm-exhausted-overlay">
                  <div className="hm-exhausted-card">
                    <div className="hm-exhausted-icon">{good ? '🎉' : '📈'}</div>
                    <h3 className="hm-exhausted-title">
                      Redo complete — {redoSolved}/{redoTotal} solved ({pct}%)
                    </h3>
                    <p className="hm-exhausted-text">
                      {good
                        ? 'Great improvement! You handled most of your earlier mistakes.'
                        : 'Some of these still need work — keep practicing these themes.'}
                    </p>
                    <button
                      className="hm-btn hm-btn-primary"
                      onClick={() => navigate('/puzzle-dashboard')}
                    >
                      Back to Puzzle Dashboard →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
            </div>
          </div>

          {/* Session result strip */}
          {sessionHistory.length > 0 && (
            <div className="hm-history" style={{ width: boardSize }}>
              <div className="hm-history-head">
                <span className="hm-history-title">This session</span>
                <span className="hm-history-count">
                  <span className="hm-green">{sessionCorrect} ✓</span>
                  {' · '}
                  <span className="hm-red">{sessionWrong} ✗</span>
                </span>
              </div>
              <div className="hm-history-marks">
                {sessionHistory.map((h, i) => (
                  <span
                    key={i}
                    className={`hm-mark ${h.correct ? 'hm-mark-ok' : 'hm-mark-bad'}`}
                    title={`Puzzle ${i + 1}${h.rating ? ` · ${h.rating}` : ''}${h.topic && h.topic !== 'mixed' ? ` · ${h.topic}` : ''} — ${h.correct ? 'solved' : 'failed'}`}
                  >
                    {h.correct ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT: moves card + controls ── */}
        <div className="hm-right-col">
          {/* Stockfish (top 3 lines) — only AFTER the puzzle is over, so it can't be
              used as a hint while solving. Default off; the panel's own switch turns
              it on. It follows `displayFen`, so browsing the line or a variation
              re-analyses that exact position. */}
          {puzzleOver && (
            <EnginePanel
              fen={displayFen}
              enabled={engineOn}
              onToggle={() => setEngineOn(v => !v)}
            />
          )}
          <MovesPanel {...{ plies, shownPlyIdx, atLive, atStart, navFirst, navPrev, navNext,
                            navLast, goToPly, variations, activeVar, varViewIdx, goToVarPly }} />
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
                <div className="hm-split-btn">
                  <button className="hm-split-seg" onClick={retry}>↻ Retry</button>
                  <span className="hm-split-divider" />
                  <button className="hm-split-seg" onClick={copyFen}>
                    {fenCopied ? '✓ Copied' : '📋 Copy FEN'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Rating band picker */}
      {showRatingModal && (
        <div className="hm-modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-head">
              <div>
                <h3 className="hm-modal-title">Choose a Rating Range</h3>
                <p className="hm-modal-sub">You'll only get puzzles from the range you pick.</p>
              </div>
              <button className="hm-modal-close" onClick={() => setShowRatingModal(false)}>×</button>
            </div>
            {ratingBands.length === 0 ? (
              <div className="hm-modal-loading">Loading ranges…</div>
            ) : (
              <div className="hm-band-grid">
                {ratingBands.map(b => (
                  <button
                    key={b.min}
                    className={`hm-band ${hasBand && Number(bandMin) === b.min && Number(bandMax) === b.max ? 'hm-band-on' : ''}`}
                    onClick={() => chooseBand(b)}
                  >
                    <span className="hm-band-range">{b.min}–{b.max}</span>
                    {typeof b.count === 'number' && (
                      <span className="hm-band-count">{b.count.toLocaleString()} puzzles</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}