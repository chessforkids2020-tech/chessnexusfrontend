import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard, { coordinateGutter } from '../components/Chessboard';
import EnginePanel from '../components/EnginePanel';
import stockfishService from '../services/stockfishService';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { trackEvent } from '../lib/analytics';
import './HealthyMix.css';

// Depth for the per-square evaluations. Matches GameReplay: one search per
// candidate square, so this is deliberately shallower than the engine panel's.
const SQUARE_EVAL_DEPTH = 12;

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

  // Clear the seen list when the FILTER changes. The ids are only meaningful
  // within one theme / piece count: carrying them into another mode would
  // exclude puzzles the user has not seen there, shrinking the pool for no
  // reason. (It was never reset before, because only Pieces used it and a
  // change of count reloaded the page.)
  useEffect(() => {
    seenIdsRef.current = [];
  }, [theme, piecesParam, bandMin, bandMax]);

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

  // ── Per-square evaluations (same feature as Analyse my games) ──────────────
  // Click a piece and every square it can reach is labelled with the eval AFTER
  // moving there. One search per target square at SQUARE_EVAL_DEPTH, run
  // SEQUENTIALLY: stockfishService is a shared singleton with one worker, so
  // parallel calls would stop() each other and return nothing.
  // Shares the 'gaSquareEvals' key with GameReplay, so a student who turns the
  // feature on while reviewing a game finds it already on here.
  const [squareEvalsOn, setSquareEvalsOn] = useState(() => {
    try { return localStorage.getItem('gaSquareEvals') === 'true'; } catch { return false; }
  });
  const toggleSquareEvals = useCallback(() => {
    setSquareEvalsOn(prev => {
      const next = !prev;
      try { localStorage.setItem('gaSquareEvals', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const [selection, setSelection] = useState(null);   // { from, targets }
  const [squareEvals, setSquareEvals] = useState({});
  const [evalBusy, setEvalBusy] = useState(false);
  const evalRunRef = useRef(0);

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
  // Points are NOT known when a result is pushed: pushHistory runs synchronously
  // the moment the puzzle ends, while the score comes back from
  // /healthymix/submit a moment later. So the entry is added with points
  // undefined and patched in by submitResult when the server answers. The mark
  // shows a tick/cross until then and becomes +N / −N on arrival.
  const historyIdxRef = useRef(-1);
  const pushHistory = useCallback((correct) => {
    const p = puzzleRef.current;
    setSessionHistory(h => {
      historyIdxRef.current = h.length;
      return [...h, { correct, rating: p?.rating || null, topic: p?.topic || null, points: undefined }];
    });
  }, []);

  // Fill in the score for the entry pushed most recently.
  const setHistoryPoints = useCallback((points) => {
    const idx = historyIdxRef.current;
    if (idx < 0) return;
    setSessionHistory(h => (idx >= h.length ? h
      : h.map((e, i) => (i === idx ? { ...e, points } : e))));
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
      // Send WHICH puzzle and what was played, not just the outcome. Progress
      // used to be counts only, so a coach saw "7 of 10" with no way to review
      // the work. attemptsRef holds every move tried on this puzzle.
      const res = await api.post(`/api/coach/my-assignments/${assignmentId}/progress`, {
        solved,
        puzzleId: puzzleRef.current?._id || puzzleRef.current?.id,
        fen: puzzleRef.current?.fen,
        solution: Array.isArray(puzzleRef.current?.solution) ? puzzleRef.current.solution : [],
        attempts: attemptsRef.current,
        // How long this puzzle took, in seconds. Lets the coach see effort, not
        // just the verdict — a quick wrong answer and a four-minute wrong answer
        // are different problems to teach.
        timeTakenSec: elapsedSec(),
      });
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

  // EVERY move the user tried on this puzzle, correct or not, with the position
  // they played it from. `plies` only holds the accepted line — a wrong move is
  // flashed for 550ms and discarded — but the wrong move is exactly what makes
  // this useful for review, so it is logged separately and sent on submit.
  // A ref, not state: it must be readable inside submit without re-rendering.
  const attemptsRef = useRef([]);

  // When the current puzzle appeared on screen, so an assignment can report how
  // long it took. Reset everywhere attemptsRef is — the two belong to the same
  // "this is a fresh puzzle" moment, including a retry (which restarts the
  // clock: the coach wants time spent on the attempt they are reading).
  //
  // Client-measured, so it is honest-effort data rather than proof — a student
  // who wanders off inflates it. That is fine for the signal a coach actually
  // wants ("four minutes on this fork and still missed it"), and the server
  // clamps the value so a broken or edited clock cannot store nonsense.
  const puzzleStartRef = useRef(Date.now());
  const elapsedSec = () =>
    Math.max(0, Math.round((Date.now() - (puzzleStartRef.current || Date.now())) / 1000));

  const logAttempt = useCallback((san, correct, fen) => {
    if (!san) return;
    // Cap it: a user can retry indefinitely, and an unbounded array would grow
    // without limit on a puzzle someone brute-forces.
    if (attemptsRef.current.length >= 30) return;
    attemptsRef.current.push({ move: san, correct: !!correct, fen: fen || '' });
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
  // Only a sanity ceiling now. The real limits are the free width (which the
  // side cards yield to, down to their minimums) and the viewport height, so
  // 1100 was cutting fullscreen short on a wide monitor before either bound hit.
  const MAX_BOARD = 1400;
  // Vertical space reserved for whatever sits BELOW the board (the board-tools
  // row and the session strip) plus the page's bottom padding.
  //
  // This is the constraint that actually governs board size on a normal laptop:
  // the board is SQUARE, so it can never be taller than the window, and the
  // window is far shorter than the middle column is wide. A fixed guess was
  // wrong in both directions — too small once the tools row and session strip
  // appeared (the page scrolled), too large on a fresh puzzle when neither is
  // rendered (the board was needlessly shrunk). It is now MEASURED, so every
  // pixel not used below the board goes to the board.
  // Side-card widths. The cards sit at COMFORTABLE by default and only give up
  // width when the user drags the board bigger than the space already free.
  // Trimmed from 300/330 to give the board more width. Both still hold their
  // content: the left card's mode buttons need ~92px of text each, and the
  // right column's moves list reads fine at 300.
  const LEFT_COMFORT = 272,  LEFT_MIN = 232;
  const RIGHT_COMFORT = 300, RIGHT_MIN = 248;
  const COL_GAP = 22, PAGE_PAD = 32;

  // Just the page's bottom padding. Was 48; the page scrolls vertically, so a
  // generous reserve only cost the board height.
  const VERT_FALLBACK = 24;
  const refitRef = useRef(null);       // set by the sizing effect below
  // Bumped by each settle pass on mount. Anything that MEASURES the laid-out
  // page must depend on this, or it keeps first-paint numbers taken before the
  // fonts and the sidebar reached their final size.
  const [settleTick, setSettleTick] = useState(0);
  // Board auto-sizes to the screen. The old code hard-capped the board at `preferred`
  // (480px) on ANY desktop, so a 32" monitor showed the same tiny board as a laptop.
  // Now the board GROWS with the viewport (a share of the available width beside the
  // 320px sidebar), clamped to a sensible range — big screen → big board.
  const fitToViewport = (preferred) => {
    if (typeof window === 'undefined') return preferred;
    // innerWidth (full device width), matching .hm-board-col's 100dvw breakout:
    // the board should span the device exactly like the rating/moves cards do
    // and let the page scroll over it. clientWidth subtracts a classic
    // scrollbar and left the board one scrollbar narrower than those cards.
    const w = window.innerWidth;
    if (w <= 960) {
      // Single-column layout (phones AND tablets/iPad): the board goes edge to
      // edge — inset 0, and `preferred` deliberately NOT applied. It capped the
      // board at 480px, which is why an iPad showed a small board floating in a
      // wide column. .hm-board-col cancels the page gutters (see HealthyMix.css)
      // so the board spans the full viewport, not the padded content box.
      //
      // Height still matters: the board is square, so on a short landscape
      // tablet the WINDOW HEIGHT is the real limit, not the width. Without this
      // a 1024x768 iPad would ask for a 1024px board and get a page that
      // scrolls past the tools.
      const byHeightSingle = window.innerHeight - VERT_FALLBACK;
      return Math.max(MIN_BOARD, Math.min(w - FRAME_CHROME, byHeightSingle));
    }
    // Desktop 3-column layout. The side tracks are clamp()ed in .hm-layout so
    // they SHRINK on short/wide screens to give the board room; mirror the same
    // clamps here. This is only the first-paint estimate — the ResizeObserver
    // below measures the real column straight after and is authoritative.
    // Mirrors .hm-layout's fixed tracks. Only the first-paint estimate — the
    // ResizeObserver measures the real column immediately after and is
    // authoritative, so if the grid did squeeze the sides on a narrow window
    // the board picks up that extra width on the very next frame.
    const leftCol = 300, rightCol = 330, gap = 22;
    const pagePad = 16 * 2;   // UserLayout's gutter; .hm-page adds none
    const midColWidth = w - leftCol - rightCol - gap * 2 - pagePad;
    // Height matters as much as width: the board is square, so on a typical
    // laptop the WINDOW HEIGHT is what caps it, not the column.
    const byHeight = window.innerHeight - VERT_FALLBACK;
    return Math.max(MIN_BOARD, Math.min(MAX_BOARD, midColWidth - FRAME_CHROME, byHeight));
  };
  const [boardSize, setBoardSize] = useState(() => fitToViewport(480));
  // Phone-width flag, used for the smaller coordinate labels. Kept in state
  // (not read inline) so a rotate/resize re-renders the board with the right
  // label size instead of keeping first-paint's. Only PHONES get the smaller
  // labels — on a tablet-sized board the default size is already fine.
  const [isPhoneBoard, setIsPhoneBoard] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 480
  );
  useEffect(() => {
    const onResize = () => setIsPhoneBoard(window.innerWidth <= 480);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // How much the side cards have given up, in px, so the board can be bigger.
  // 0 = both cards at their comfortable width (the normal state).
  const [sideSqueeze, setSideSqueeze] = useState(0);
  // Set when the user drags the grip, so auto-fit stops overwriting their size.
  // CLEARED whenever the viewport itself changes size (entering or leaving
  // fullscreen, resizing the window): the layout the drag was made for no longer
  // exists, and keeping the old size is what left a fullscreen-sized board — and
  // squeezed side cards — behind after exiting fullscreen. A reload appeared to
  // "fix" it only because the ref started false again.
  const userSizedRef = useRef(false);


  // Ceiling for the drag grip: the board may grow until BOTH cards are at their
  // minimum, and no further. Computed FRESH on every call rather than held in a
  // render-scoped const — the const version read window.innerWidth once and did
  // not recompute on entering fullscreen (nothing re-rendered the page), so the
  // grip kept the old, smaller window's ceiling and the board could be dragged
  // past what the new layout allowed. That is the overlap.
  // NORMAL view: the board may grow only into space that is genuinely free —
  // the cards keep their comfortable width. Shrinking them here bought nothing,
  // because the board is already capped by window HEIGHT long before width runs
  // out; it just made the cards smaller for no gain.
  //
  // FULLSCREEN: the point is the biggest possible board, so the cards may give
  // way down to their minimums.
  // Ceiling for the drag grip: the free width plus everything the cards can give
  // up. Measured from the GRID, so UserLayout's 170px sidebar is already
  // accounted for — sizing this from window.innerWidth is what let the board be
  // dragged past the row and over the moves card.
  const computeMaxBoard = useCallback(() => {
    const grid = boardColRef.current?.parentElement;
    const gridW = grid
      ? grid.clientWidth
      : (typeof window !== 'undefined' ? window.innerWidth : 1920) - PAGE_PAD;
    // Only the right card yields (see the squeeze effect), so only its room
    // counts toward how far the board may be dragged.
    const room = RIGHT_COMFORT - RIGHT_MIN;
    const free = gridW - LEFT_COMFORT - RIGHT_COMFORT - COL_GAP * 2;
    // Deliberately NOT capped by height here. Chessboard clamps its own render
    // to viewport.h * 0.92, and capping the grip there too stopped the drag
    // below the width at which the board even meets the right card — the grip
    // then did nothing at all. The squeeze follows the rendered size instead
    // (see onBoardResize), so an over-long drag is simply ignored.
    return Math.max(MIN_BOARD, Math.min(MAX_BOARD, free + room));
  }, []);
  const [maxBoardWidth, setMaxBoardWidth] = useState(computeMaxBoard);

  // Drag handler. Works out how much the sides must yield for the requested
  // board width and applies exactly that. Both cards give way together (see the
  // effect below), so the layout stays balanced as the board grows.
  const onBoardResize = useCallback((next) => {
    userSizedRef.current = true;
    // Measure the grid, for the same reason fit() does: window.innerWidth does
    // not know about UserLayout's 170px sidebar, so sizing from it let the board
    // grow ~170px past what the row could hold.
    const grid = boardColRef.current?.parentElement;
    const gridW = grid ? grid.clientWidth : window.innerWidth - PAGE_PAD;
    const room = RIGHT_COMFORT - RIGHT_MIN;   // only the right card yields
    const freeAtComfort = gridW - LEFT_COMFORT - RIGHT_COMFORT - COL_GAP * 2;

    // The board renders at min(requested, viewport.h * 0.92) — Chessboard caps
    // itself by height. The SQUEEZE has to follow the RENDERED size, not the
    // requested one: driving it from the request kept shrinking the right card
    // after the board had already stopped growing, which slid the card
    // rightwards and opened a widening gap. Capping the DRAG at that height
    // instead was worse — it stopped the grip below the width where the board
    // even meets the card, so resizing appeared dead.
    const heightCap = Math.floor(window.innerHeight * 0.92);
    const cap = Math.max(MIN_BOARD, Math.min(MAX_BOARD, freeAtComfort + room));
    const want = Math.min(next, cap);
    const rendered = Math.min(want, heightCap);   // what will actually be drawn

    // Shrink the right card ONLY when the drawn board would genuinely reach it.
    setSideSqueeze(rendered > freeAtComfort
      ? Math.min(rendered - freeAtComfort, room)
      : 0);
    // Store what will actually be DRAWN, not what was asked for.
    //
    // The board caps itself at viewport.h * 0.92, so past that point `want`
    // keeps climbing while the board stands still. boardSize is what the card
    // widths are derived from, so storing the request meant a drag past the cap
    // kept widening the right card for a board that had stopped growing — the
    // card slid on its own. Storing `rendered` makes an over-long drag a no-op,
    // which is what it looks like on screen.
    setBoardSize(Math.floor(Math.max(MIN_BOARD, rendered)));
  }, []);

  // Publish the squeeze to CSS. The grid reads these, so the columns narrow in
  // the same frame the board grows — no overlap at any point in the drag.
  useEffect(() => {
    // ONLY THE RIGHT CARD YIELDS. Shrinking the left card moves the board's
    // LEFT EDGE, because the board sits immediately after it in the grid — so
    // once the board was capped (by height, or by MAX_BOARD) dragging further
    // did not grow it at all, it just slid the whole board leftwards. Taking the
    // width from the right card only means the board's left edge never moves and
    // it grows rightwards into the space, which is what "make the board bigger"
    // should look like.
    const rightGive = Math.min(sideSqueeze, RIGHT_COMFORT - RIGHT_MIN);
    const root = document.documentElement;

    // SIZE THE CARDS TO THE SPACE THE BOARD CANNOT USE.
    //
    // A chessboard is SQUARE, so on a wide window it is capped by HEIGHT and
    // physically cannot fill its column. Every previous attempt just chose where
    // to put the leftover width — beside the board (a corridor), split around it
    // (the board slid), or into a board-hugging column (the right card slid).
    //
    // There is no fourth place to put it, so instead the cards ABSORB it: make
    // them exactly wide enough that board + cards + gaps fill the row. Then
    // there is no leftover width at all, and nothing has to move to hide it.
    //
    // Clamped so the cards stay usable, and floored at their normal widths so a
    // tall window (where the board can nearly fill the row) never squeezes them.
    // The card widths come from the WINDOW, never from boardSize.
    //
    // Deriving them from the board meant the cards resized on every drag frame:
    // the left card sets the board's LEFT EDGE, so the board slid left, and the
    // right card slid right — the two things happening at once. Basing them on
    // the height the board can reach (a fixed property of the window) keeps them
    // still while the board is dragged, and still lets them absorb the space a
    // short-but-wide window leaves over.
    const grid = boardColRef.current?.parentElement;
    let leftW = LEFT_COMFORT;
    let rightW = RIGHT_COMFORT - rightGive;
    if (grid && window.innerWidth > 960) {
      const gridW = grid.clientWidth;
      // The largest board this WINDOW can show — height-capped, independent of
      // whatever the user has dragged the board to.
      const top = boardColRef.current?.getBoundingClientRect().top ?? 0;
      const maxBoardHere = Math.min(
        Math.floor(window.innerHeight * 0.92),
        window.innerHeight - top - VERT_FALLBACK - FRAME_CHROME,
      );
      const forCards = gridW - maxBoardHere - COL_GAP * 2;
      if (forCards > LEFT_COMFORT + RIGHT_COMFORT) {
        // Roughly 46/54 — the moves list benefits from the extra more than the
        // rating card does.
        leftW = Math.max(LEFT_COMFORT, Math.min(460, Math.floor(forCards * 0.46)));
        rightW = Math.max(RIGHT_COMFORT - rightGive, Math.min(520, forCards - leftW));
      }
    }
    root.style.setProperty('--hm-left-col', `${leftW}px`);
    root.style.setProperty('--hm-right-col', `${rightW}px`);
    return () => {
      root.style.removeProperty('--hm-left-col');
      root.style.removeProperty('--hm-right-col');
    };
    // NOT dependent on boardSize — that is the whole point: dragging the board
    // must not move a card.
    //
    // `settleTick` IS a dependency: this reads getBoundingClientRect().top, and
    // on first paint the page has not settled — fonts still loading, the
    // sidebar not at final width — so the card widths came out wrong and were
    // never recomputed. That is why the page looked different before and after
    // a reload. fit() already re-runs across several frames; this now follows
    // the same ticks.
  }, [sideSqueeze, settleTick]);

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
      // Once the user has dragged the grip their size wins; auto-fit would
      // otherwise recompute from the column and undo the drag immediately.
      if (userSizedRef.current) return;
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
        // Desktop: capped by the column AND by viewport height so a tall board
        // never scrolls off — and never wider than the column, or it draws over
        // the moves card. Math.floor because a fractional width rounds up when
        // painted, which is the sub-pixel that produced the overlap.
        //
        // The tools row and the session strip sit BELOW the board, so the board
        // only gets the height left after them. Measured rather than guessed:
        // a fresh puzzle shows neither and can use the full window, while one
        // mid-session must leave room for both — a fixed number would be wrong
        // in one direction or the other, and getting it wrong pushes the strips
        // off the bottom of the screen.
        // Reserve the TOOLS ROW only, not the session strip.
        //
        // The page scrolls vertically (.hm-page restricts overflow-x alone), so
        // not everything below the board has to fit without scrolling. Retry /
        // Copy FEN / Square evals are ACTIONS and must be reachable, so their
        // row is reserved. "This session" is a log you read after the fact —
        // reserving it as well cost the board ~76px of height for something the
        // student can simply scroll to.
        const toolsEl = el.querySelector('.hm-boardtools');
        let measured = 0;
        if (toolsEl) {
          const cs = window.getComputedStyle(toolsEl);
          measured = toolsEl.offsetHeight
            + parseFloat(cs.marginTop || 0)
            + parseFloat(cs.marginBottom || 0);
        }
        const below = VERT_FALLBACK + measured;
        const top = el.getBoundingClientRect().top;   // page chrome above the board

        // Measure the LAYOUT GRID, not the window.
        //
        // window.innerWidth ignores everything between it and the grid — most
        // importantly UserLayout's 170px sidebar — so the board came out ~170px
        // wider than the row could hold and drew over the moves card. The grid
        // element's own width already has the sidebar, the page gutter and any
        // scrollbar taken off it.
        //
        // Reading the GRID is safe where reading the board COLUMN was not: the
        // squeeze changes how the grid divides its width, never the grid's own
        // width, so this cannot feed back the way the column did.
        const grid = el.parentElement;   // .hm-layout
        const gridW = grid ? grid.clientWidth : window.innerWidth - PAGE_PAD;
        const availComfort = gridW - LEFT_COMFORT - RIGHT_COMFORT - COL_GAP * 2;
        const gutter = coordinateGutter(Math.max(MIN_BOARD, availComfort));
        const byHeight = window.innerHeight - top - below - FRAME_CHROME - gutter;

        // AUTO-FIT NEVER TOUCHES THE CARDS. It used to take width off them
        // whenever the height budget allowed a bigger board — so the cards
        // shrank on their own, with the board still fitting comfortably and
        // nothing overlapping. That is width taken for no reason. The board now
        // simply uses the space that is free, and the cards keep their full
        // width. Only a deliberate drag past the free width may shrink them
        // (see onBoardResize).
        setSideSqueeze(0);
        setBoardSize(Math.floor(Math.max(MIN_BOARD, Math.min(MAX_BOARD, availComfort, byHeight))));
      }
    };
    refitRef.current = fit;

    // A viewport change (fullscreen in/out, window resize) invalidates any
    // manual drag: the space available is different now, so the board re-fits
    // itself to the new layout and the side cards go back to comfortable. The
    // user can drag again from there if they want it bigger still.
    const fsTimers = [];
    const resetAndFit = () => {
      userSizedRef.current = false;
      setSideSqueeze(0);
      setMaxBoardWidth(computeMaxBoard());   // new viewport → new drag ceiling
      fit();
      // ENTERING OR LEAVING FULLSCREEN IS NOT ONE FRAME.
      //
      // fullscreenchange fires BEFORE the viewport has finished resizing, and
      // the browser then animates to the new size over several frames. Two
      // fit() passes both measured mid-transition, so the board kept a size
      // from the OLD viewport — too big for the new one, which is what pushed
      // it over the Moves card. Reloading looked like "the fix" only because
      // the mount path below settles four times plus a timer.
      //
      // Same treatment here: a few frames, then a couple of timers to catch the
      // end of the transition. Each pass is one measurement and a setState React
      // drops when the value has not changed.
      // AND BUMP settleTick.
      //
      // fit() only resizes the BOARD. The card column widths are set by a
      // separate effect keyed on [sideSqueeze, settleTick] — so calling fit()
      // alone left the cards at their pre-fullscreen widths while the board
      // changed size underneath them. That is the overlap on entering and the
      // gap on exiting. Reload "fixed" it because mount runs settle(), which
      // bumps the tick; nothing on the fullscreen path ever did.
      const settleNow = () => { fit(); setSettleTick(t => t + 1); };
      requestAnimationFrame(() => {
        settleNow();
        requestAnimationFrame(settleNow);
      });
      fsTimers.push(setTimeout(settleNow, 120));
      fsTimers.push(setTimeout(settleNow, 350));
    };

    // The observer watches the board column — the SAME element the desktop
    // branch resizes via the squeeze. Letting it re-enter fit() there is what
    // made the page shake, so it is now mobile-only: that branch reads the
    // column but never changes its width, so it cannot feed back. Desktop is
    // driven entirely by the window listeners below.
    const ro = new ResizeObserver(() => {
      if (window.innerWidth <= 960) fit();
    });
    ro.observe(el);
    // Height-only window changes don't resize the column, so also refit on
    // resize. Fullscreen fires both resize and fullscreenchange; listening to
    // both means the board re-fits the moment the window grows rather than on
    // the next incidental layout change.
    window.addEventListener('resize', resetAndFit);
    document.addEventListener('fullscreenchange', resetAndFit);

    // FIT MORE THAN ONCE ON MOUNT.
    //
    // A single fit() at mount measures a page that has not settled: web fonts
    // are still loading, the sidebar and left card have not reached their final
    // width, and the board column's top offset is not yet where it will end up.
    // The board was therefore sized from wrong numbers and never corrected —
    // which is why merely OPENING AND CLOSING DEVTOOLS fixed it. That fires a
    // resize, and the resize handler produced the right size immediately.
    //
    // Three passes: now, next frame, and after fonts finish. Each is cheap
    // (one measurement plus a possible setState with the same value, which
    // React drops), and together they cover every way a first paint can be
    // mid-settle.
    const settle = () => { fit(); setSettleTick(t => t + 1); };
    settle();
    const raf1 = requestAnimationFrame(() => {
      settle();
      requestAnimationFrame(settle);
    });
    const settleTimer = setTimeout(settle, 300);
    // Web fonts change text metrics, which moves the board column's top.
    if (document.fonts?.ready) document.fonts.ready.then(settle).catch(() => {});

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(settleTimer);
      fsTimers.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener('resize', resetAndFit);
      document.removeEventListener('fullscreenchange', resetAndFit);
      refitRef.current = null;
    };
  }, [computeMaxBoard]);

  // RE-FIT WHEN THE ROWS BELOW THE BOARD APPEAR OR CHANGE.
  //
  // fit() subtracts the measured height of the tools row and the session strip,
  // but on first paint neither exists — the puzzle is unsolved and the session
  // is empty — so the board was sized as if it had the whole window, then those
  // rows rendered underneath and pushed it out of shape. A reload "fixed" it
  // only because by then the session already had an entry, so the very first
  // measurement happened to be right.
  //
  // requestAnimationFrame so the measurement runs AFTER the browser has laid the
  // new rows out; measuring in the same tick reads a height of 0.
  useEffect(() => {
    const id = requestAnimationFrame(() => refitRef.current?.());
    return () => cancelAnimationFrame(id);
    // Depends on `status`, NOT the derived `puzzleOver` — that const is declared
    // far below this effect, and referencing it here threw "Cannot access
    // 'puzzleOver' before initialization" and blanked the page. `status` is
    // state declared at the top, and the tools row appears on exactly the two
    // values puzzleOver is derived from.
    //
    // Session length is NOT a dependency: the strip's height is no longer part
    // of the board's budget, so a new result must not resize the board.
  }, [status]);

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
    attemptsRef.current = [];   // new puzzle → fresh attempt log
    puzzleStartRef.current = Date.now();   // …and restart the solve clock
    setViewIdx(null);
    clearVariations();
    // Engine always starts off on a fresh puzzle / retry — the user opts in each time.
    setEngineOn(false);
    // Drop any square labels from the previous position — the selection they
    // described no longer exists on this board.
    setSelection(null);
    setSquareEvals({});
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
      if (hasPieces) params.pieces = piecesParam;
      // Send the puzzles already seen this session so the backend skips them.
      // This used to be Pieces-only, which is why a THEME re-served the same
      // positions: the server was never told what had already been shown, so
      // its random pick could return them again. Capped at the most recent 300
      // — enough to stop repeats in any realistic session, and short enough to
      // keep the query string sane.
      if ((hasPieces || hasTheme) && seenIdsRef.current.length) {
        params.seen = seenIdsRef.current.slice(-300).join(',');
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
      // Track this puzzle as seen (Pieces and Themes) so we don't show it again.
      if ((hasPieces || hasTheme) && p && (p._id || p.id)) {
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
    attemptsRef.current = [];   // new puzzle → fresh attempt log
    puzzleStartRef.current = Date.now();   // …and restart the solve clock
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
        selectedBandMax: hasBand ? bandMax : undefined,
        // Every move tried on this puzzle, right and wrong, so the student's
        // dashboard and their coach can see HOW it was solved or missed — not
        // just whether it was. Was previously thrown away.
        attempts: attemptsRef.current,
        // How long this puzzle took. The timer already existed for analytics but
        // was never sent here, so Score.timeTakenSec stayed 0 for every puzzle on
        // the main trainer — and solve time is what distinguishes a pattern
        // RECOGNISED from one CALCULATED.
        timeTakenSec: puzzleStartTimeRef.current
          ? Math.round((Date.now() - puzzleStartTimeRef.current) / 1000)
          : 0
      });
      setRating(res.data.newRating);
      setRatingDelta(res.data.pointsChange);
      // Stamp the score onto this attempt's session mark (Number(), not ||0, so
      // a genuine 0 stays 0 and is not mistaken for "not answered yet").
      setHistoryPoints(Number(res.data.pointsChange) || 0);
      tooEasyRef.current = !!res.data.tooEasy;
      // A correct-but-too-easy solve earns nothing (anti-farm). Tell the user
      // why, so a flat 0 doesn't look like a bug.
      if (solved && res.data.tooEasy) {
        setMessage('Correct — too easy for your level. Try harder.');
      }
      // If this is a coach assignment, count this attempt toward it.
      reportAssignmentAttempt(solved);
    } catch (_) { /* ignore network errors for UX */ }
  }, [puzzle, reportAssignmentAttempt, trainingMode, hasTheme, theme, hasPieces, piecesParam, hasBand, bandMin, bandMax, user, setHistoryPoints]);

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
      } else if (viewIdx !== null && plies[viewIdx]) {
        // The BROWSED ply, whichever it is — including the last one.
        //
        // This used to require `viewIdx < plies.length - 1` and otherwise fall
        // through to chessRef, on the assumption that being on the last ply
        // meant the live board was already there. After exploring a variation
        // it is not: chessRef sits at the end of that sideline. A move played
        // from the last mainline ply was then applied to the VARIATION's
        // position, which is the same confusion that made the board disagree
        // with the highlighted move.
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
        // Extending the mainline at its end. viewIdx must go back to null
        // ("follow the live position") or the board would stay pinned to the
        // ply that was being viewed when the move was played — now that
        // goToPly sets a real index for the last ply, that index no longer
        // moves on its own.
        pushPly(node.san, node.fen, node.from, node.to);
        setViewIdx(null);
      }
      return true;
    }

    if (st !== 'solving' || botThinking) return false;

    // Position the user played FROM — logged with the attempt so a reviewer can
    // set the board up exactly as the student saw it.
    const fenBeforeAttempt = chessRef.current.fen();
    const game = new Chess(fenBeforeAttempt);
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
      logAttempt(result.san, true, fenBeforeAttempt);
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
          setMessage('Success! Well played.');
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
    logAttempt(result.san, false, fenBeforeAttempt);
    playSound('wrong');
    // Briefly show the wrong move, then snap back so they can retry.
    setFen(game.fen());
    setLastMove({ from: result.from, to: result.to });
    setTimeout(() => {
      setFen(chessRef.current.fen());
      setLastMove(null);
    }, 550);
    return true;
  }, [botThinking, submitResult, playBotMove, setStatusSynced, pushPly, logAttempt, viewIdx, plies,
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
    attemptsRef.current = [];   // new puzzle → fresh attempt log
    puzzleStartRef.current = Date.now();   // …and restart the solve clock
    setViewIdx(null);
    clearVariations();
    setEngineOn(false);   // back to solving → engine hidden and off again
    setSelection(null);   // …and the square labels go with it
    setSquareEvals({});
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
  //
  // viewIdx is ALWAYS the real index now, including for the last ply.
  //
  // It used to collapse the last ply to null, meaning "show the live position",
  // on the assumption that the live position and the final ply are the same
  // board. They are not, once the user has explored a variation: the live board
  // (`fen`) sits at the end of whatever sideline they last played. So clicking
  // the final mainline move — "Qe6" in the report — said "go live", and live was
  // the variation's position after Qxf5. The move highlighted and the board
  // shown disagreed, and only ever for the LAST move, which is why it looked
  // intermittent.
  //
  // Every other ply already set a real index and behaved correctly; this makes
  // the last one behave the same way.
  const goToPly = useCallback((i) => {
    const clamped = Math.max(0, Math.min(plies.length - 1, i));
    setActiveVar(null);
    setVarViewIdx(null);
    setViewIdx(clamped);
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

  // Run one search per selected-piece target square, sequentially. Results are
  // written as they arrive so numbers fill in progressively rather than the
  // board sitting blank until the last square finishes. Gated on puzzleOver:
  // while the puzzle is still being solved this would be an engine hint.
  useEffect(() => {
    if (!squareEvalsOn || !puzzleOver || !selection || selection.targets.length === 0) {
      setSquareEvals({});
      setEvalBusy(false);
      return undefined;
    }

    const run = ++evalRunRef.current;
    let cancelled = false;

    // Mark every target pending immediately, so the click visibly does something.
    setSquareEvals(
      Object.fromEntries(selection.targets.map((sq) => [sq, { pending: true }]))
    );
    setEvalBusy(true);

    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (cancelled || run !== evalRunRef.current) return;

        for (const target of selection.targets) {
          if (cancelled || run !== evalRunRef.current) return;

          let afterFen = null;
          let mated = false;
          try {
            const probe = new Chess(displayFen);
            // promotion:'q' — a promotion square would otherwise be an illegal
            // move here and the square would silently get no number.
            const mv = probe.move({ from: selection.from, to: target, promotion: 'q' });
            if (!mv) continue;
            afterFen = probe.fen();
            mated = probe.isCheckmate();
          } catch { continue; }

          // Mate needs no search, and the engine reports it oddly anyway.
          if (mated) {
            if (!cancelled && run === evalRunRef.current) {
              setSquareEvals((prev) => ({ ...prev, [target]: { text: '#', score: 99 } }));
            }
            continue;
          }

          let res = null;
          try {
            res = await stockfishService.analyzePosition(afterFen, {
              depth: SQUARE_EVAL_DEPTH,
              multipv: 1,
            });
          } catch { /* leave this square unlabelled */ }

          if (cancelled || run !== evalRunRef.current) return;

          const line = res?.lines?.[0];
          if (!line) {
            setSquareEvals((prev) => {
              const next = { ...prev };
              delete next[target];
              return next;
            });
            continue;
          }

          // SIGN: the engine scores from the side to move, which after our
          // candidate move is the OPPONENT. Negating puts the number back into
          // the mover's point of view — without this, good squares read as bad.
          let text, score;
          if (line.scoreType === 'mate') {
            const m = -line.score;
            text = (m > 0 ? '#' : '-#') + Math.abs(m);
            score = m > 0 ? 99 : -99;
          } else {
            score = -line.score / 100;
            text = (score > 0 ? '+' : '') + score.toFixed(1);
          }

          setSquareEvals((prev) => ({ ...prev, [target]: { text, score } }));
        }
      } finally {
        if (!cancelled && run === evalRunRef.current) setEvalBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      // Only stop if a newer run has not already taken over the shared engine.
      // Reading .current AT CLEANUP TIME is the intent here, not a bug: a later
      // run bumping the counter is exactly the case we must not stop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (run === evalRunRef.current) stockfishService.stop();
    };
  }, [squareEvalsOn, puzzleOver, selection, displayFen]);

  return (
    <div className="hm-page">
      {/* Coach assignment progress banner - enhanced glass style */}
      {hasAssignment && (
        <div style={{
          // Follows the grid, not its own centred 1100px: with the outer
          // wrapper gone the cards run to the layout's full width, and a
          // centred banner floated visibly out of line above them.
          maxWidth: 2400, margin: '0 0 12px', padding: '10px 16px',
          background: 'rgba(139,92,246,0.08)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--color-accent-2-a15)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-accent-2)',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 4px 20px var(--color-black-a35)'
        }}>
          <span>📋 Coach assignment{assignTarget > 0 ? ` · ${assignProgress}/${assignTarget} puzzles` : ''}</span>
          {assignTarget > 0 && (
            <div style={{ flex: 1, maxWidth: 240, height: 8, background: 'var(--color-white-a07)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((assignProgress / assignTarget) * 100))}%`, height: '100%', background: 'linear-gradient(90deg,var(--color-accent-2),var(--color-accent))' }} />
            </div>
          )}
        </div>
      )}

      {/* Assignment finished popup - glass version */}
      {assignDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-black-a65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'rgba(20,22,30,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--color-accent-2-a30)', borderRadius: 'var(--radius-2xl)', padding: '32px 36px', textAlign: 'center', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px var(--color-black-a65)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: 'var(--color-text)', fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Assignment finished!</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 22px' }}>You completed all {assignTarget} puzzles your coach assigned.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ flex: 1, background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a20)', borderRadius: 'var(--radius-lg)', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-success)' }}>{assignDone.solved}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>SOLVED</div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a20)', borderRadius: 'var(--radius-lg)', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-danger)' }}>{assignDone.failed}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>FAILED</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(251,191,36,0.08)', border: '1px solid var(--color-warning-a20)', borderRadius: 'var(--radius-lg)', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-warning)' }}>🔥 {assignDone.maxStreak}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>BEST STREAK</div>
              </div>
            </div>
            <button
              onClick={submitAssignment}
              disabled={assignSubmitting}
              style={{ width: '100%', background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent-2))', color: 'var(--color-text)', border: 'none', borderRadius: 'var(--radius-lg)', padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: assignSubmitting ? 'wait' : 'pointer', boxShadow: '0 6px 24px var(--color-accent-a30)' }}
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
              onSelectionChange={squareEvalsOn && puzzleOver ? setSelection : undefined}
              squareEvals={squareEvalsOn && puzzleOver ? squareEvals : undefined}
              // Take ownership of the drag. Left to itself the board clamps the
              // grip only to a fixed maxBoardWidth (900) and to viewport HEIGHT
              // — never to the column it sits in — so dragging it wider simply
              // drew over the moves card. Owning the value lets the page shrink
              // the side cards first and cap the board at what is actually free.
              onResize={onBoardResize}
              maxBoardWidth={maxBoardWidth}
              // Smaller a-h / 1-8 labels on phones. The board draws them INSIDE
              // the squares at small sizes (squareSize * 0.3), which at a
              // full-width phone board is ~14px — large enough to crowd the
              // pieces. 0.72 brings that back to ~10px.
              coordinateScale={isPhoneBoard ? 0.72 : 1}
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
                      {redoSolved === redoTotal
                        ? 'You have finished all your mistakes — every one solved. Nothing left to redo.'
                        : good
                          ? 'Great improvement! You handled most of your earlier mistakes.'
                          : 'Some of these still need work — keep practicing these themes.'}
                    </p>
                    {/* Two ways on: back to the dashboard to see the mistake
                        count fall, or straight into ordinary training without
                        the round trip. Continue leaves redo mode by dropping
                        the ?redo=1 flag, and clears the queue so a later redo
                        starts fresh rather than replaying this finished set. */}
                    <div className="hm-exhausted-actions">
                      <button
                        className="hm-btn hm-btn-primary"
                        onClick={() => navigate('/puzzle-dashboard')}
                      >
                        Back to Puzzle Dashboard →
                      </button>
                      <button
                        className="hm-btn"
                        onClick={() => {
                          sessionStorage.removeItem('redoPuzzleIds');
                          redoQueueRef.current = null;
                          redoIdxRef.current = 0;
                          setRedoDone(false);
                          setRedoTotal(0);
                          setRedoSolved(0);
                          navigate('/training/healthy-mix', { replace: true });
                        }}
                      >
                        Continue training →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
            </div>
          </div>

          {/* Board tools — Retry · Copy FEN · Square evals, in one row directly
              under the board and above the session strip. They were split
              across two columns (the pill in the left sidebar, Retry/Copy FEN
              in the right controls); grouped here they read as one set of
              actions on the position you are looking at, and neither side
              column pays for them. Width-matched to the board so the rows line up
              with its edges.
              Width-matched to the board so the row lines up with it exactly. */}
          {puzzleOver && (
            <div className="hm-boardtools" style={{ width: boardSize }}>
              <button className="hm-boardtool" onClick={retry}>↻ Retry</button>
              <button className="hm-boardtool" onClick={copyFen}>
                {fenCopied ? '✓ Copied' : '📋 Copy FEN'}
              </button>
              <button
                type="button"
                className={`hm-boardtool hm-boardtool--eval${squareEvalsOn ? ' on' : ''}`}
                onClick={toggleSquareEvals}
                aria-pressed={squareEvalsOn}
                title="Click a piece and every square it can reach shows the eval after moving there."
              >
                🎯 Square evals
                <span className="hm-boardtool-state">
                  {squareEvalsOn ? (evalBusy ? '…' : 'On') : 'Off'}
                </span>
              </button>
            </div>
          )}

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
                {sessionHistory.map((h, i) => {
                  // Show the RATING CHANGE where there was one, and fall back to
                  // a plain tick/cross where there wasn't — a too-easy solve and
                  // an already-failed retry both score 0, and "+0" would read as
                  // a bug rather than as "no points this time".
                  //   points > 0  → +12   (green)
                  //   points < 0  → −12   (red)
                  //   points === 0 or not yet known → ✓ / ✗
                  const pts = h.points;
                  const scored = typeof pts === 'number' && pts !== 0;
                  const label = scored ? (pts > 0 ? `+${pts}` : `${pts}`) : (h.correct ? '✓' : '✗');
                  const outcome = h.correct ? 'solved' : 'failed';
                  const ptsNote = scored
                    ? ` · ${pts > 0 ? '+' : ''}${pts} rating`
                    : (pts === 0 ? ' · no rating change' : '');
                  return (
                    <span
                      key={i}
                      className={`hm-mark ${h.correct ? 'hm-mark-ok' : 'hm-mark-bad'}${scored ? ' hm-mark-pts' : ''}`}
                      title={`Puzzle ${i + 1}${h.rating ? ` · ${h.rating}` : ''}${h.topic && h.topic !== 'mixed' ? ` · ${h.topic}` : ''} — ${outcome}${ptsNote}`}
                    >
                      {label}
                    </span>
                  );
                })}
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
          {/* `enabled` also goes false while the square evaluations are running:
              stockfishService is ONE shared worker, so if the panel kept its own
              search going the two would stop() each other and both return
              nothing. The panel resumes the moment the squares finish. */}
          {puzzleOver && (
            <EnginePanel
              fen={displayFen}
              enabled={engineOn && !evalBusy}
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