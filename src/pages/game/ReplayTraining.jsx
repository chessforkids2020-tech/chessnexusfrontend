import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import Chessboard, { gutterFor } from '../../components/Chessboard';
import stockfishService from '../../services/stockfishService';
import EnginePanel from '../../components/EnginePanel';
import api from '../../api';
import {
  gradeMove, pointsFor, BASE_POINTS,
} from '../../lib/replayTraining';
import './ReplayTraining.css';

// Must match .rt-session in ReplayTraining.css, INCLUDING its wide-screen
// override — the board's width budget is derived from it, so a mismatch would
// size the board for a card that is not there.
const SIDE_CARD_W = 340;
const SIDE_CARD_W_WIDE = 400;
const WIDE_SCREEN_PX = 1600;
const sideCardWidth = () =>
  (typeof window !== 'undefined' && window.innerWidth >= WIDE_SCREEN_PX)
    ? SIDE_CARD_W_WIDE : SIDE_CARD_W;
const COL_GAP = 16;

// Analysis settings for the questions. Depth 14 with 3 lines is a good balance:
// deep enough that the ranking is trustworthy, quick enough that it finishes
// while the user is still looking at the position.
const DEPTH = 14;
const LINES = 3;

// Auto-play the first 10 FULL MOVES (20 plies), then start asking — so the
// first question is on move 11. The opening is memorised theory: quizzing it
// tests recall rather than calculation, and replaying it is what the student
// watches rather than plays.
const OPENING_MOVES = 10;
const DEFAULT_OPENING_PLIES = OPENING_MOVES * 2;

// ── Pacing ────────────────────────────────────────────────────────────────
// Slow enough to FOLLOW. The opening is not filler — the student needs to read
// the position they are about to be quizzed on, and at 260ms/move the pieces
// just flickered past.
const OPENING_MOVE_MS = 650;   // each auto-played opening move
const REPLY_MS        = 900;   // opponent's reply, mid-session

// A failed search is retried on the SAME position rather than skipped. Bounded
// so a dead engine ends the session instead of spinning.
const ENGINE_MAX_RETRIES = 6;

// Shallower than the question search: this runs once per candidate square, so
// depth is traded for responsiveness.
const SQUARE_EVAL_DEPTH = 12;


const uciOf = (mv) => mv.from + mv.to + (mv.promotion || '');

// A session SURVIVES A RELOAD.
//
// game/ply/points lived only in React state, so any remount — a flaky
// connection, an accidental refresh, the dev server hot-reloading — threw the
// session away and dumped the student back on the rating picker, losing the
// points they had already earned.
//
// sessionStorage, not localStorage: a session belongs to this tab, and a stale
// game should not resurrect days later. It is also per-tab, so the shared
// browsers coaches use cannot leak one student's session into another's.
const SAVE_KEY = 'rt:session:v1';

const loadSaved = () => {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // A session is only restorable if it has the game it was replaying.
    if (!d?.game?.moves?.length) return null;
    return d;
  } catch { return null; }
};
const clearSaved = () => { try { sessionStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } };

// Engine scores are relative to the SIDE TO MOVE — and the question is always
// asked on the student's turn, so a positive score already means "good for the
// student". No flipping is needed: flipping was wrong, because it turned the
// student's own advantage into their opponent's.
function scoreOf(line) {
  if (!line) return null;
  return {
    isMate: line.scoreType === 'mate' || line.type === 'mate',
    value: line.score ?? line.value ?? 0,
  };
}

/** "0.13" / "M4" — the number beside each move, from the STUDENT's side. */
function fmtEval(line) {
  const e = scoreOf(line);
  if (!e) return null;
  if (e.isMate) return `${e.value > 0 ? '' : '-'}M${Math.abs(e.value)}`;
  const pawns = e.value / 100;
  return `${pawns < 0 ? '-' : ''}${Math.abs(pawns).toFixed(2)}`;
}

/** The coloured banner: a plain-English reading of the evaluation. */
function verdictFor(line, youPlay) {
  const e = scoreOf(line);
  if (!e) return { text: 'Position unclear', tone: 'even' };
  const you = youPlay === 'black' ? 'Black' : 'White';
  const them = youPlay === 'black' ? 'White' : 'Black';
  if (e.isMate) {
    return e.value > 0
      ? { text: `${you} mates in ${Math.abs(e.value)}`, tone: 'good' }
      : { text: `${them} mates in ${Math.abs(e.value)}`, tone: 'bad' };
  }
  const cp = e.value;
  if (cp >= 300)  return { text: `${you} is winning`, tone: 'good' };
  if (cp >= 100)  return { text: `${you} is clearly better`, tone: 'good' };
  if (cp >= 40)   return { text: `${you} is slightly better`, tone: 'good' };
  if (cp > -40)   return { text: 'The position is equal', tone: 'even' };
  if (cp > -100)  return { text: `${them} is slightly better`, tone: 'bad' };
  if (cp > -300)  return { text: `${them} is clearly better`, tone: 'bad' };
  return { text: `${them} is winning`, tone: 'bad' };
}

export default function ReplayTraining() {

  // Read the saved session once, synchronously, so the first render is already
  // the game — no flash of the picker on reload.
  const saved = useRef(loadSaved()).current;

  const [phase, setPhase] = useState(saved ? 'playing' : 'list');
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(!saved);
  const [loadError, setLoadError] = useState(null);

  // ── Session state ──
  const [game, setGame] = useState(saved?.game ?? null);
  const [chess, setChess] = useState(() => {
    // Rebuild the position by replaying the moves already made, rather than
    // storing a FEN: the move list is the source of truth for the review panel
    // anyway, and the two can then never disagree.
    const c = new Chess();
    for (const san of (saved?.game?.moves || []).slice(0, saved?.ply || 0)) {
      try { if (!c.move(san, { sloppy: true })) break; } catch { break; }
    }
    return c;
  });
  const [ply, setPly] = useState(saved?.ply ?? 0);
  const [orientation, setOrientation] = useState(saved?.game?.youPlay ?? 'white');
  const [status, setStatus] = useState('');     // what the board is doing
  const [feedback, setFeedback] = useState(null); // { key, label, points }
  const [sessionPoints, setSessionPoints] = useState(saved?.sessionPoints ?? 0);
  const [asked, setAsked] = useState(saved?.asked ?? 0);
  const [awaiting, setAwaiting] = useState(false);  // true = user must move
  const [finished, setFinished] = useState(false);
  const [saveState, setSaveState] = useState(null);

  const chessRef = useRef(chess);
  const plyRef = useRef(saved?.ply ?? 0);
  const linesRef = useRef([]);        // engine lines for the current question
  const cancelRef = useRef(false);
  // Consecutive failed searches at the current position.
  const engineMissRef = useRef(0);
  // The game's real move for the position just graded, played when the
  // student presses Continue.
  const pendingMoveRef = useRef(null);
  // The FIRST position after the opening is always asked, whatever the engine
  // thinks of it. Without this the 50cp gate could skip several quiet moves in
  // a row and the first question landed on move 15, 20 or later — the student
  // was told the trainer starts at move 11 and then watched it play itself.
  const [engineTrouble, setEngineTrouble] = useState(false);
  // Post-game analysis: only offered once the game is over, so the engine can
  // never be used to answer a question that is still open.
  const [analysing, setAnalysing] = useState(false);
  // Free-play position and the moves made in it. Independent of the game's own
  // move list, so exploring never rewrites what actually happened.
  const [freeChess, setFreeChess] = useState(null);
  const [freeMoves, setFreeMoves] = useState([]);
  const [squareEvalsOn, setSquareEvalsOn] = useState(false);
  // Stockfish starts OFF. Analysis should begin with the student's own read of
  // the position; the engine is there when they want to check it. It also
  // stops a search running on every board change they are not reading.
  const [engineOn, setEngineOn] = useState(false);
  const [squareEvals, setSquareEvals] = useState({});
  const [selection, setSelection] = useState(null);
  const evalRunRef = useRef(0);
  // Mirrors the displayed FEN so the square-eval effect can read the position
  // without taking it as a dependency (which would restart on every review
  // click).
  const displayFenRef = useRef('');
  // The key handler is bound once; these keep it pointing at the latest nav
  // closures instead of the ones from first render.
  const navPrevRef = useRef(null);
  const navNextRef = useRef(null);
  // Which ply the board is SHOWING while reviewing. null = live position.
  // Bounded by `ply` (how much has actually been played), so stepping back can
  // never walk into moves the student has not seen yet.
  const [viewPly, setViewPly] = useState(null);
  useEffect(() => { chessRef.current = chess; }, [chess]);
  useEffect(() => { plyRef.current = ply; }, [ply]);
  // A new move snaps the view back to live, so the board never lags behind the
  // game while the student is being asked to move.
  useEffect(() => { setViewPly(null); }, [ply]);

  // Snapshot the session so a reload can resume it. Keyed on real events (a
  // move, a score) — small enough that writing it is free.
  useEffect(() => {
    if (phase !== 'playing' || !game || finished) return;
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({
        game, ply, sessionPoints, asked,
      }));
    } catch { /* storage full or disabled — the session still plays */ }
  }, [phase, game, ply, sessionPoints, asked, finished]);

  // ── Square evaluations (post-game analysis only) ──────────────────────────
  // Click a piece and every legal destination is labelled with the evaluation
  // after that move. Ported from the Admin Endgames board, including the sign
  // rule below, which is easy to get wrong.
  useEffect(() => {
    if (!analysing || !squareEvalsOn || !selection || !selection.targets?.length) {
      setSquareEvals({});
      return undefined;
    }
    const run = ++evalRunRef.current;
    let cancelled = false;

    // Mark every target pending so the click visibly does something.
    setSquareEvals(Object.fromEntries(selection.targets.map(sq => [sq, { pending: true }])));

    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (cancelled || run !== evalRunRef.current) return;

        for (const target of selection.targets) {
          if (cancelled || run !== evalRunRef.current) return;

          let afterFen = null;
          let mated = false;
          try {
            const probe = new Chess(displayFenRef.current);
            // promotion:'q' — a promotion square is otherwise an illegal move
            // and would silently get no number.
            const mv = probe.move({ from: selection.from, to: target, promotion: 'q' });
            if (!mv) continue;
            afterFen = probe.fen();
            mated = probe.isCheckmate();
          } catch { continue; }

          if (mated) {
            if (!cancelled && run === evalRunRef.current) {
              setSquareEvals(prev => ({ ...prev, [target]: { text: '#', score: 99 } }));
            }
            continue;
          }

          let res = null;
          try {
            res = await stockfishService.analyzePosition(afterFen, {
              depth: SQUARE_EVAL_DEPTH, multipv: 1,
            });
          } catch { /* leave this square unlabelled */ }
          if (cancelled || run !== evalRunRef.current) return;

          const line = res?.lines?.[0];
          if (!line) continue;

          // SIGN: the engine scores from the side to move, and after our
          // candidate move that is the OPPONENT. Negating gives the number from
          // the mover's point of view — without it, winning squares would be
          // labelled losing.
          let text, score;
          if (line.scoreType === 'mate') {
            const m = -line.score;
            text = (m > 0 ? '#' : '-#') + Math.abs(m);
            score = m > 0 ? 99 : -99;
          } else {
            score = -line.score / 100;
            text = (score > 0 ? '+' : '') + score.toFixed(1);
          }
          setSquareEvals(prev => ({ ...prev, [target]: { text, score } }));
        }
      } catch { /* analysis is optional; never break the page */ }
    })();

    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [analysing, squareEvalsOn, selection]);

  // ── Board sizing (mirrors Play vs Stockfish) ──
  const boardRef = useRef(null);
  const [boardSize, setBoardSize] = useState(480);
  useEffect(() => {
    if (phase !== 'playing') return;
    const measure = () => {
      const el = boardRef.current;
      if (!el) return;
      const grid = el.parentElement;
      const gridW = grid ? Math.round(grid.getBoundingClientRect().width) : 0;
      const avail = Math.max(240, gridW - sideCardWidth() - COL_GAP);
      const g = gutterFor(avail);
      const top = el.getBoundingClientRect().top;
      const next = Math.max(240, Math.floor(Math.min(
        avail - g.left - g.right,
        window.innerHeight - top - 12,
      )));
      setBoardSize(prev => (Math.abs(prev - next) > 1 ? next : prev));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && boardRef.current?.parentElement) ro.observe(boardRef.current.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [phase]);

  // ── Rating bands ──
  // The student picks a DIFFICULTY, not a specific game: with 600k games a
  // browsable catalogue would be noise, and the point is "give me a game at
  // this level".
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await api.get('/api/replay-training/bands');
        if (!dead) setBands(res.data?.bands || []);
      } catch (e) {
        if (!dead) setLoadError(e?.response?.data?.message || 'Could not load rating ranges');
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  // RESUME a restored session. Nothing else restarts the question loop after a
  // reload, so without this the board would sit frozen on the saved position.
  // Runs once, after the engine is up.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!saved || resumedRef.current) return;
    if (phase !== 'playing' || !game) return;
    resumedRef.current = true;
    let dead = false;
    (async () => {
      try {
        setStatus('Loading engine…');
        if (!stockfishService.isReady()) await stockfishService.init();
        if (dead || cancelRef.current) return;
        setLoading(false);
        advanceToQuestion(game);
      } catch (e) {
        if (!dead) { setEngineTrouble(true); setStatus(''); setLoading(false); }
      }
    })();
    return () => { dead = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase, game]);

  // Arrow keys step through the moves. Ignored while a text field has focus, and
  // ignored while a question is open — Left/Right there would silently move the
  // board out from under the answer.
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (awaiting && !finished) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navPrevRef.current?.(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navNextRef.current?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, awaiting, finished]);

  // Stop any in-flight engine work when leaving.
  useEffect(() => () => { cancelRef.current = true; stockfishService.stop?.(); }, []);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /** Play one move from the real game onto the board. */
  const playGameMove = useCallback((san) => {
    const next = new Chess(chessRef.current.fen());
    let mv;
    try { mv = next.move(san, { sloppy: true }); } catch (e) { return null; }
    if (!mv) return null;
    chessRef.current = next;
    plyRef.current += 1;
    setChess(next);
    setPly(plyRef.current);
    return mv;
  }, []);

  /**
   * Walk forward from the current position until the side we're training is to
   * move AND the position is genuinely a question (winning, with one clear best
   * move). Every move we pass through is played from the REAL GAME.
   */
  const advanceToQuestion = useCallback(async (rec) => {
    const mySide = rec.youPlay === 'white' ? 'w' : 'b';

    while (!cancelRef.current) {
      const moves = rec.moves;
      if (plyRef.current >= moves.length) { finishSession(); return; }

      const board = chessRef.current;

      // Opponent to move → play their real move, no question.
      if (board.turn() !== mySide) {
        setStatus('Opponent replies…');
        await sleep(REPLY_MS);
        if (cancelRef.current) return;
        if (!playGameMove(moves[plyRef.current])) { finishSession(); return; }
        continue;
      }

      // Our side to move. Is this a position worth asking about?
      setStatus('Looking at the position…');
      let lines = [];
      let engineFailed = false;
      try {
        const res = await stockfishService.analyzePosition(board.fen(), {
          depth: DEPTH, multipv: LINES,
        });
        lines = res?.lines || [];
        // No lines is not "no question" — it means the search produced nothing
        // (superseded, stopped, or the engine is busy). Treated as a normal
        // "skip this position" it made the trainer play the WHOLE GAME on its
        // own, one move per failed search, with no pause: exactly what pressing
        // Skip triggered, because that hands over while the engine is still
        // finishing the previous search.
        if (!lines.length) engineFailed = true;
      } catch (e) {
        engineFailed = true;
      }
      if (cancelRef.current) return;

      if (engineFailed) {
        // Give the engine a moment and retry the SAME position rather than
        // moving past it. Bounded, so a genuinely dead engine ends the session
        // instead of spinning forever.
        engineMissRef.current += 1;
        if (engineMissRef.current > ENGINE_MAX_RETRIES) {
          setStatus('');
          setEngineTrouble(true);
          finishSession();
          return;
        }
        setStatus('Waiting for the engine…');
        await sleep(600);
        continue;
      }
      engineMissRef.current = 0;

      // EVERY one of the student's moves is a question — no skipping.
      //
      // The engine's opinion of the position no longer decides whether to ask;
      // it is used only to GRADE the answer. Skipping "quiet" positions meant
      // the trainer auto-played the student's own moves, which read as the
      // computer playing the game for them. From move 11 the student now plays
      // their whole side of the game, and the opponent replies from the real
      // score.
      linesRef.current = lines;
      setStatus('');
      setAwaiting(true);
      return;                         // hand control to the user
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [playGameMove]);

  /**
   * Move on from a graded position: play the game's real move, then look for
   * the next question. Driven by the Continue button.
   */
  const continueSession = useCallback(() => {
    const san = pendingMoveRef.current;
    if (!san || !game) return;
    pendingMoveRef.current = null;
    setFeedback(null);
    if (!playGameMove(san)) { finishSession(); return; }
    advanceToQuestion(game);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [game, playGameMove, advanceToQuestion]);

  const finishSession = useCallback(async () => {
    setAwaiting(false);
    setFinished(true);
    setStatus('');
    // The game is over, so the board becomes a free analysis board — there is
    // nothing left to give away.
    setAnalysing(true);
    // A finished game must not resume on the next reload.
    clearSaved();
    // Persist whatever was earned. Zero is not worth a request.
    setSessionPoints(pts => {
      if (pts > 0) {
        setSaveState('saving');
        api.post('/api/replay-training/score', { points: pts })
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }
      return pts;
    });
  }, []);

  /** The user's answer. */
  const handleDrop = (from, to) => {
    // ── Analysis: a genuinely free board ──────────────────────────────────
    // Any legal move for either side, as many as you like — the same behaviour
    // as the study and puzzle boards. Kept separate from the game's move list
    // so exploring cannot rewrite the score being reviewed.
    if (analysing) {
      const base = freeChess || new Chess(displayFenRef.current);
      const next = new Chess(base.fen());
      let mv;
      try {
        const piece = next.get(from);
        const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
        mv = next.move({ from, to, promotion });
      } catch (e) { return false; }
      if (!mv) return false;
      setFreeChess(next);
      setFreeMoves(m => [...m, mv.san]);
      return true;
    }

    if (!awaiting || finished) return false;
    const board = new Chess(chessRef.current.fen());
    let mv;
    try {
      const piece = board.get(from);
      const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
      mv = board.move({ from, to, promotion });
    } catch (e) { return false; }
    if (!mv) return false;

    // Grade against the engine lines and the move actually played in the game.
    const playedSan = game.moves[plyRef.current];
    let playedUci = '';
    try {
      const probe = new Chess(chessRef.current.fen());
      const pm = probe.move(playedSan, { sloppy: true });
      if (pm) playedUci = uciOf(pm);
    } catch (e) { /* leave blank */ }

    const grade = gradeMove(uciOf(mv), linesRef.current, playedUci);
    const pts = pointsFor(grade.fraction, BASE_POINTS);

    // ChessBase-style readout: your move, the game's move and the engine's, each
    // with its evaluation, so the student can see WHY a move scored what it did
    // rather than just being told a number.
    const lines = linesRef.current || [];
    const best = lines[0];
    const bestUci = best?.move || best?.pv?.[0] || '';
    // Engine PV is UCI; convert to SAN from the position the question was asked
    // in, because "Nb5-c3" means something to a player and "b5c3" does not.
    let bestSan = '';
    try {
      const probe = new Chess(chessRef.current.fen());
      const bm = probe.move({
        from: bestUci.slice(0, 2),
        to: bestUci.slice(2, 4),
        promotion: bestUci[4] || undefined,
      });
      if (bm) bestSan = bm.san;
    } catch (_) { /* leave blank rather than showing raw UCI */ }

    // Eval of the line the user's move belongs to, when it was one of the top
    // three. Unknown otherwise — we only searched three lines.
    const matchedLine =
      grade.key === 'best' ? lines[0]
      : grade.key === 'second' ? lines[1]
      : grade.key === 'third' ? lines[2]
      : null;

    setFeedback({
      ...grade,
      points: pts,
      max: BASE_POINTS,
      played: playedSan,
      yourSan: mv.san,
      bestSan,
      bestEval: fmtEval(best),
      yourEval: matchedLine ? fmtEval(matchedLine) : null,
      depth: best?.depth ?? DEPTH,
      verdict: verdictFor(best, orientation),
    });
    setSessionPoints(p => p + pts);
    setAsked(a => a + 1);
    setAwaiting(false);

    // The student advances, not a timer. A fixed pause was either too short to
    // read the engine's line or too long once they had — and it took the
    // verdict away mid-thought. The Continue button below moves on.
    pendingMoveRef.current = playedSan;

    return true;
  };

  /**
   * Start a session at a difficulty: pull a random game from the band, auto-play
   * the opening, then find the first question.
   */
  const startBand = async (band) => {
    setPhase('playing');
    setLoading(true);
    setLoadError(null);
    cancelRef.current = false;
    try {
      const res = await api.get('/api/replay-training/random', {
        // An open-ended band ("2200+") has no max — omit it entirely rather
        // than sending null, which would arrive as the string "null".
        params: band.max == null
          ? { min: band.min }
          : { min: band.min, max: band.max },
      });
      const rec = res.data?.game;
      if (!rec) throw new Error('No game found in that range');

      const fresh = new Chess();
      chessRef.current = fresh;
      plyRef.current = 0;
      setChess(fresh);
      setPly(0);
      setViewPly(null);
      engineMissRef.current = 0;
      setEngineTrouble(false);
      setGame(rec);
      setOrientation(rec.youPlay);
      setSessionPoints(0);
      setAsked(0);
      setFeedback(null);
      setFinished(false);
      setSaveState(null);
      setLoading(false);

      setStatus('Loading engine…');
      if (!stockfishService.isReady()) await stockfishService.init();
      if (cancelRef.current) return;

      // Auto-play the opening.
      const openTo = Math.min(
        Number.isFinite(rec.openingPlies) ? rec.openingPlies : DEFAULT_OPENING_PLIES,
        rec.moves.length,
      );
      setStatus('Playing the opening…');
      for (let i = 0; i < openTo; i++) {
        if (cancelRef.current) return;
        playGameMove(rec.moves[i]);
        await sleep(OPENING_MOVE_MS);
      }
      if (cancelRef.current) return;
      advanceToQuestion(rec);
    } catch (e) {
      setLoadError(e?.response?.data?.message || e.message || 'Could not start');
      setLoading(false);
    }
  };

  /**
   * End the session now and open the analysis board. Used by Finish, and
   * entered automatically when the game runs out of moves.
   */
  const finishAndAnalyse = useCallback(() => {
    cancelRef.current = true;          // stop the question loop
    stockfishService.stop?.();
    setAwaiting(false);
    setFeedback(null);
    finishSession();
    setAnalysing(true);
    // The engine loop is cancelled, but analysis needs to run — re-arm it.
    cancelRef.current = false;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [finishSession]);

  const quit = () => {
    cancelRef.current = true;
    clearSaved();
    stockfishService.stop?.();
    // Leaving mid-game still BANKS the points earned so far — the questions
    // were answered, so they count.
    //
    // `finished` guards against double-saving what finishSession already sent,
    // and the counters are cleared here so pressing Exit twice (or exiting and
    // leaving the page) cannot post the same points again.
    if (sessionPoints > 0 && !finished) {
      api.post('/api/replay-training/score', { points: sessionPoints }).catch(() => {});
    }
    setSessionPoints(0);
    setAsked(0);
    setFeedback(null);
    setPhase('list');
    setGame(null);
    setFinished(false);
  };

  // ── Game picker ────────────────────────────────────────────────────────────
  if (phase === 'list') {
    return (
      <div className="rt-page">
        <div className="rt-list">
          <div className="rt-head">
            <h1>🎬 Replay Training</h1>
            <p>
              Replay a real game from the winning side. At the critical moments the
              board stops and asks you to find the best move.
            </p>
            <p className="rt-scoring">
              Best move <b>{pointsFor(1)}</b> · Played in the game <b>{pointsFor(0.85)}</b> ·
              Second best <b>{pointsFor(0.7)}</b> · Third best <b>{pointsFor(0.5)}</b>
            </p>
          </div>

          {loading && <div className="rt-note">Loading rating ranges…</div>}
          {loadError && <div className="rt-note rt-note--bad">{loadError}</div>}
          {!loading && !loadError && bands.length === 0 && (
            <div className="rt-note">No games loaded yet.</div>
          )}

          {!loading && bands.length > 0 && (
            <p className="rt-pick-hint">
              Pick a strength. You'll get a random game where at least one player
              is rated in that range.
            </p>
          )}

          <div className="rt-bands">
            {bands.map(b => (
              <button
                key={b.label}
                className={`rt-band${b.open ? ' rt-band--open' : ''}`}
                onClick={() => startBand(b)}
              >
                <span className="rt-band-range">{b.label}</span>
                <span className="rt-band-count">{b.count.toLocaleString()} games</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ── Move review ───────────────────────────────────────────────────────────
  // The moves ALREADY PLAYED, and nothing else. Slicing at `ply` is what keeps
  // the rest of the game hidden: game.moves holds the whole score (the trainer
  // needs it to play the opponent's real replies), and rendering it would hand
  // the student every answer before they were asked.
  // During the session: only what has been played, so the rest of the game is
  // never spoiled. In ANALYSIS the game is over, so the whole score is fair game
  // — that is the point of analysing it.
  const reviewLimit = analysing && game ? game.moves.length : ply;
  const shownMoves = game ? game.moves.slice(0, reviewLimit) : [];
  const isLive = viewPly === null || viewPly >= reviewLimit;
  const displayFen = (() => {
    // Free play wins: once the student has moved a piece in analysis, the board
    // shows THEIR position, not the game's.
    if (analysing && freeChess) return freeChess.fen();
    // In analysis, "live" means the END of the game, not the live session board.
    if (isLive && analysing && game) {
      try {
        const c = new Chess();
        for (const san of game.moves) c.move(san, { sloppy: true });
        return c.fen();
      } catch (_) { /* fall through */ }
    }
    if (isLive) return chess.fen();
    try {
      const c = new Chess();
      for (let i = 0; i < viewPly; i++) c.move(shownMoves[i], { sloppy: true });
      return c.fen();
    } catch (_) { return chess.fen(); }
  })();
  // Clamped to [0, ply]: there is deliberately no way to step PAST what has
  // been played — forward only ever returns to the live position.
  displayFenRef.current = displayFen;

  const gotoPly = (n) => {
    // Jumping to a move abandons the free-play line — otherwise the board would
    // show one position while the list highlighted another.
    if (freeChess) { setFreeChess(null); setFreeMoves([]); }
    const clamped = Math.max(0, Math.min(n, reviewLimit));
    setViewPly(clamped >= reviewLimit ? null : clamped);
  };

  // Step controls. All clamp through gotoPly, so none of them can walk past
  // what the student is allowed to see.
  const navFirst = () => gotoPly(0);
  const navPrev  = () => gotoPly((viewPly ?? reviewLimit) - 1);
  const navNext  = () => gotoPly((viewPly ?? reviewLimit) + 1);
  const navLast  = () => { if (freeChess) { setFreeChess(null); setFreeMoves([]); } setViewPly(null); };
  navPrevRef.current = navPrev;
  navNextRef.current = navNext;


  // ── Session ────────────────────────────────────────────────────────────────
  return (
    <div className="rt-page rt-page--game">
      <div className="rt-session">
        <div className="rt-board-col" ref={boardRef}>
          <Chessboard
            position={displayFen}
            onDrop={handleDrop}
            orientation={orientation}
            boardWidth={boardSize}
            /* Analysis: a fully free board. During the session: only when a
               question is open and we are on the live position. */
            draggable={analysing ? true : (awaiting && !finished && isLive)}
            playerColor={orientation}
            onSelectionChange={analysing && squareEvalsOn ? setSelection : undefined}
            squareEvals={analysing && squareEvalsOn ? squareEvals : undefined}
          />

        {finished && (
          // Below the board once the game is done: the score, the result, and
          // the free-play line if the student has been exploring.
          <div className="rt-results">
            <div className="rt-results-main">
              <span className="rt-results-score">{sessionPoints}</span>
              <span className="rt-results-of">
                of {asked * BASE_POINTS} points
                {asked > 0 && ` (${Math.round((sessionPoints / (asked * BASE_POINTS)) * 100)}%)`}
              </span>
              <span className="rt-results-sub">
                {asked} question{asked === 1 ? '' : 's'}
                {game ? ` · game result ${game.result}` : ''}
              </span>
            </div>
            {saveState === 'saving' && <span className="rt-save">Saving…</span>}
            {saveState === 'saved' && <span className="rt-save rt-save--ok">Saved to your Replay total</span>}
            {saveState === 'error' && <span className="rt-save rt-save--bad">Could not save</span>}
            {freeMoves.length > 0 && (
              <div className="rt-freeline">
                <span className="rt-freeline-lbl">Your line:</span>
                {freeMoves.join(' ')}
                <button
                  className="rt-freeline-reset"
                  onClick={() => { setFreeChess(null); setFreeMoves([]); }}
                >reset</button>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="rt-side">
          {game && (
            // Who played, and when. At the top of the card because it is the
            // context for everything below it.
            // Ratings are part of the context, not clutter: how strong the
            // players were is what makes "the move they played" meaningful.
            <div className="rt-gameinfo">
              <strong>
                {game.white}{game.whiteElo ? ` (${game.whiteElo})` : ''}
              </strong>
              <strong>
                {game.black}{game.blackElo ? ` (${game.blackElo})` : ''}
              </strong>
              {game.year ? <span>{game.year}</span> : null}
            </div>
          )}

          {/* The score sheet belongs to the SESSION. Once the game is over the
              results move below the board and this card is just moves + engine,
              so the analysis board has room to breathe. */}
          {!finished && (
            // ChessBase-style readout, ALWAYS PRESENT during the session. The
            // rows stay on screen with blank values while the student is
            // thinking, so the panel does not jump around as it fills in.
            <div className="rt-verdict-wrap">
              <div className={`rt-banner rt-banner--${feedback?.verdict?.tone || 'even'}`}>
                {feedback
                  ? <>
                      {feedback.verdict?.text || '—'}
                      {feedback.depth ? <span className="rt-depth"> (Depth={feedback.depth})</span> : null}
                    </>
                  : awaiting
                    ? `Playing ${orientation} — find the best move`
                    : (status || 'Working…')}
              </div>

              <div className="rt-sheet">
                <div className="rt-sheet-row">
                  <span className="rt-sheet-lbl">Your move</span>
                  <span className="rt-sheet-move">{feedback?.yourSan || ''}</span>
                  <span className="rt-sheet-pts">
                    {feedback ? `Points=${feedback.points}/${feedback.max}` : ''}
                  </span>
                  <span className="rt-sheet-eval">{feedback?.yourEval ?? ''}</span>
                </div>
                <div className="rt-sheet-row">
                  <span className="rt-sheet-lbl">Game move</span>
                  <span className="rt-sheet-move">{feedback?.played || ''}</span>
                  <span className="rt-sheet-pts" />
                  <span className="rt-sheet-eval" />
                </div>
                <div className="rt-sheet-row">
                  <span className="rt-sheet-lbl">Engine move</span>
                  <span className="rt-sheet-move">{feedback?.bestSan || ''}</span>
                  <span className="rt-sheet-pts" />
                  <span className="rt-sheet-eval">
                    {feedback?.bestEval != null
                      ? `${feedback.bestEval}${feedback.depth ? `/${feedback.depth}` : ''}`
                      : ''}
                  </span>
                </div>
                <div className="rt-sheet-total">
                  <span className="rt-sheet-lbl">Total score</span>
                  <span>
                    <b>{sessionPoints}</b> of {asked * BASE_POINTS}
                    {asked > 0 && ` (=${Math.round((sessionPoints / (asked * BASE_POINTS)) * 100)}%)`}
                    {feedback?.key === 'best' ? ' · Excellent!' : ''}
                  </span>
                </div>
              </div>

              {feedback && (
                <div className={`rt-graded ${feedback.key === 'wrong' ? 'is-bad' : 'is-good'}`}>
                  {feedback.key === 'wrong' ? '✗ ' : '✓ '}{feedback.label}
                </div>
              )}
            </div>
          )}

          {engineTrouble && (
            <div className="rt-prompt rt-prompt--done">
              <strong>Engine stopped responding</strong>
              <span>The session ended early. Your points are safe.</span>
            </div>
          )}

          {analysing && (
            // Post-game analysis: the live engine readout plus click-a-piece
            // square evaluations. Offered ONLY after the game is finished, so
            // it can never answer a question that is still open.
            <div className="rt-analysis">
              <label className="rt-toggle">
                <input
                  type="checkbox"
                  checked={squareEvalsOn}
                  onChange={e => { setSquareEvalsOn(e.target.checked); setSelection(null); }}
                />
                Square evaluations
              </label>
              {squareEvalsOn && (
                <p className="rt-toggle-hint">
                  Click a piece — every square it can reach is scored.
                </p>
              )}
              {/* onToggle makes EnginePanel render its own on/off switch. */}
              <EnginePanel
                fen={displayFen}
                numLines={3}
                enabled={engineOn}
                onToggle={() => setEngineOn(v => !v)}
              />
            </div>
          )}

          {/* Moves PLAYED SO FAR — click one to look back at it.
              Deliberately never shows the rest of the game: game.moves holds
              the full score, and rendering it would give away every answer
              before it is asked. There is no "next" beyond the live position
              for the same reason. */}
          <div className="rt-moves">
            {shownMoves.length === 0 ? (
              <div className="rt-moves-empty">No moves yet</div>
            ) : (
              Array.from({ length: Math.ceil(shownMoves.length / 2) }, (_, r) => {
                const wPly = r * 2 + 1;
                const bPly = r * 2 + 2;
                const cur = viewPly ?? ply;
                const cell = (san, p) => san ? (
                  <button
                    className={`rt-move-san${cur === p ? ' active' : ''}`}
                    onClick={() => gotoPly(p)}
                  >{san}</button>
                ) : <span className="rt-move-san" />;
                return (
                  <div className="rt-move-row" key={r}>
                    <span className="rt-move-no">{r + 1}.</span>
                    {cell(shownMoves[wPly - 1], wPly)}
                    {cell(shownMoves[bPly - 1], bPly)}
                  </div>
                );
              })
            )}
          </div>

          <div className="rt-nav">
            <button className="rt-nav-btn" onClick={navFirst}
              disabled={reviewLimit === 0} title="First move">⏮</button>
            <button className="rt-nav-btn" onClick={navPrev}
              disabled={(viewPly ?? reviewLimit) <= 0} title="Previous move">◀</button>
            <button className="rt-nav-btn" onClick={navNext}
              disabled={isLive} title="Next move">▶</button>
            <button className="rt-nav-btn" onClick={navLast}
              disabled={isLive} title="Latest position">⏭</button>
          </div>

          {!isLive && (
            <button className="rt-btn rt-back-live" onClick={() => setViewPly(null)}>
              ⏭ Back to the current position
            </button>
          )}

          <div className="rt-actions">
            <button className="rt-btn" onClick={quit}>
              {finished ? '← Exit' : '✕ Exit'}
            </button>
            {feedback && (
              // The student decides when to move on, so they can study the
              // engine's line for as long as they like.
              <button className="rt-btn rt-btn--go" onClick={continueSession}>
                Continue →
              </button>
            )}
            {!finished && (
              // Stop early and go straight to analysis. Points earned so far
              // are kept — finishSession saves them.
              <button className="rt-btn" onClick={finishAndAnalyse}>
                ■ Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
