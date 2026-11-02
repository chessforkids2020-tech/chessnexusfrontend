// pages/CalculationChallenge.jsx
//
// The Calculation challenge (/training/calculation), opened from the Guide.
// Healthy Mix puzzles, played in a different style:
//
//   THINK  — the board is locked. Calculate the whole line, both sides, for as
//            long as you like, then press "I found it".
//   PLAY   — a clock starts (5 s per move). Play EVERY move of the line: yours
//            and the opponent's replies.
//            · Your own wrong move ends the puzzle (a different mate is fine).
//            · A different reply for the opponent is judged by the engine in
//              the browser: a reasonable defence is accepted and the line goes
//              on with the puzzle's own reply; a bad one is rejected and you
//              try again while the clock runs (paused while the engine thinks).
//   DONE   — right or wrong, the strength change, and the full line.
//
// Scoring is a separate "calculation strength" % — the puzzle rating is never
// touched. The server holds the solution and checks every move
// (backend/routes/calculation.js).
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard, { coordinateGutter } from '../components/Chessboard';
import EnginePanel from '../components/EnginePanel';
import FenCopyBar from '../components/FenCopyBar';
import useSquareEvals from '../hooks/useSquareEvals';
import stockfishService from '../services/stockfishService';
import soundManager from '../utils/soundManager';
import { introOf, holdThen, later, INTRO_MOVE_MS } from '../utils/puzzleIntro';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './CalculationChallenge.css';
import { t as tr } from '../i18n/LanguageContext';

const sound = (type) => { if (!soundManager.muted) soundManager.play(type); };
const fmtPct = (n) => `${n > 0 ? '+' : ''}${Number(n || 0).toFixed(1)}%`;

// How much worse for the defender an alternative reply may be than the
// puzzle's own reply and still count as a real defence: 1 pawn, or 20% of the
// advantage in already-won positions (a defender who is 7 pawns down is lost
// either way; a fixed half-pawn rule there just reads engine noise).
const slackFor = (savedScore) => Math.max(100, Math.abs(savedScore) * 0.2);

// Engine score from the side to move, as one comparable number (mate = huge;
// being mated sooner is worse).
function scoreOf(line) {
  if (!line) return null;
  if (line.scoreType === 'mate') return line.score > 0 ? 100000 - line.score * 100 : -100000 - line.score * 100;
  return line.score;
}

const uciOf = (m) => `${m.from}${m.to}${m.promotion || ''}`;

// Is the opponent's alternative reply a reasonable defence? Both replies are
// scored in ONE search from the position before the reply (searchmoves), from
// the defender's side, starting from a cleared engine memory (ucinewgame).
// Separate searches, or a hash left over from earlier ones, drift by up to a
// pawn between runs; this way the same reply always gets the same verdict.
// Returns { fine, best }: best is 'alt' or 'saved' (the stronger defence), or
// null when the engine gave no verdict.
async function altIsReasonable(beforeFen, alt, saved) {
  try {
    if (!stockfishService.isReady()) await stockfishService.init();
    const a = uciOf(alt), s = uciOf(saved);
    stockfishService.sendCommand('ucinewgame');
    const res = await stockfishService.analyzePosition(beforeFen, { depth: 12, multipv: 2, searchmoves: [a, s] });
    const lineFor = (u) => (res.lines || []).find(l => l.pv?.[0] === u);
    const altScore = scoreOf(lineFor(a));
    const savedScore = scoreOf(lineFor(s));
    if (altScore == null || savedScore == null) return { fine: true, best: null }; // no verdict: be fair to the player
    return { fine: altScore >= savedScore - slackFor(savedScore), best: altScore > savedScore ? 'alt' : 'saved' };
  } catch {
    return { fine: true, best: null };                        // engine unavailable: accept
  }
}

// Nothing sits above the board, and the board takes all the room there is:
//   desktop — the smaller of (page width − panel) and (screen height − the tool
//             strip under it); the a–h / 1–8 labels sit INSIDE the squares so no
//             outside strip eats into it; board + panel centred.
//   phones  — full width, edge to edge; everything else goes below it.
// Layout like Healthy Mix:
//   three — left stats card | board | right column (moves + controls), ≥1100px
//   two   — board | right column, with the stats card on top of it
//   stack — phones: board, then the controls and moves, then the stats
const layoutFor = (w) => (w <= 860 ? { mode: 'stack', left: 0, right: 0 }
  : w < 1100 ? { mode: 'two', left: 0, right: 300 }
  : { mode: 'three', left: w < 1600 ? 150 : 170, right: w < 1600 ? 280 : 320 });
const GAP = 16;
const MARGIN = 6;
// How narrow the side cards may get when the grip drags the board past the
// free width (like Healthy Mix: the right card gives way first, then the left).
const LEFT_MIN = 120;
const RIGHT_MIN = 240;
const MIN_BOARD = 240;
function useFitBoard(mainRef) {
  const [fit, setFit] = useState({ size: 400, gridW: 1000, touch: false, mode: 'three', left: 150, right: 280 });
  // Bumped when the window itself changes size (resize, fullscreen in/out):
  // the layout a grip drag was made for no longer exists.
  const [viewportTick, setViewportTick] = useState(0);
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const measure = () => {
      const lay = layoutFor(window.innerWidth);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const sides = lay.mode === 'three' ? lay.left + lay.right + GAP * 2 : lay.mode === 'two' ? lay.right + GAP : 0;
      const availW = el.clientWidth - sides;
      const availH = lay.mode === 'stack' ? Infinity : window.innerHeight - top - MARGIN;
      // Desktop: the a–h / 1–8 labels sit OUTSIDE the board (left and bottom),
      // so their strip comes off the room first. Touch screens draw them inside.
      const touch = window.matchMedia?.('(max-width: 1024px)').matches;
      // When the width runs out before the height (fullscreen on a laptop), the
      // side cards give way down to their minimums so the board can fill the
      // screen's height — the component narrows them to match.
      const sidesMin = lay.mode === 'three' ? LEFT_MIN + RIGHT_MIN + GAP * 2 : lay.mode === 'two' ? RIGHT_MIN + GAP : 0;
      let size = Math.min(availH > availW ? el.clientWidth - sidesMin : availW, availH);
      if (!touch) size -= coordinateGutter(size);
      size = Math.max(MIN_BOARD, Math.floor(size));
      setFit({ size, gridW: el.clientWidth, touch, ...lay });
    };
    // Entering or leaving fullscreen is not one frame: the browser animates to
    // the new size, and one measurement mid-way kept the old board size (the
    // same thing Healthy Mix ran into). Measure now, over the next two frames,
    // and twice more once the transition has ended.
    const timers = [];
    const onViewport = () => {
      setViewportTick(t => t + 1);
      measure();
      requestAnimationFrame(() => { measure(); requestAnimationFrame(measure); });
      timers.push(setTimeout(measure, 120), setTimeout(measure, 350));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', onViewport);
    document.addEventListener('fullscreenchange', onViewport);
    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onViewport);
      document.removeEventListener('fullscreenchange', onViewport);
    };
  }, [mainRef]);
  return { ...fit, viewportTick };
}

const REASON = {
  'wrong-move': tr("That move isn't the line."),
  timeout: tr('Time ran out.'),
  abandoned: tr('You left the puzzle after pressing "I found it".'),
  solved: '',
};

export default function CalculationChallenge() {
  const mainRef = useRef(null);
  const { size: fitSize, gridW, touch, mode: layoutMode, left: leftComfort, right: rightComfort, viewportTick } = useFitBoard(mainRef);
  // Desktop: the board fits the screen, and the corner grip (like Healthy Mix)
  // can make it bigger or smaller. Past the free width the side cards give way
  // down to their minimums. A window change (fullscreen in/out) drops the drag
  // and the board fits the new screen again.
  const [dragW, setDragW] = useState(null);
  useEffect(() => { setDragW(null); }, [viewportTick]);
  const sideMin = layoutMode === 'three' ? LEFT_MIN + RIGHT_MIN + GAP * 2 : layoutMode === 'two' ? RIGHT_MIN + GAP : 0;
  const roomMax = gridW - sideMin;
  const maxW = Math.max(fitSize, Math.floor(touch ? roomMax : roomMax - coordinateGutter(roomMax)));
  const boardSize = touch || !dragW ? fitSize : Math.max(MIN_BOARD, Math.min(dragW, maxW));
  const boardTotal = touch ? boardSize : boardSize + coordinateGutter(boardSize);
  // Width the cards must give up: the right card first, then the left.
  const sideComfort = layoutMode === 'three' ? leftComfort + rightComfort + GAP * 2 : layoutMode === 'two' ? rightComfort + GAP : 0;
  const squeeze = layoutMode === 'stack' ? 0 : Math.max(0, boardTotal - (gridW - sideComfort));
  const rightW = rightComfort - Math.min(squeeze, Math.max(0, rightComfort - RIGHT_MIN));
  const leftW = leftComfort - Math.max(0, Math.min(squeeze - (rightComfort - rightW), leftComfort - LEFT_MIN));

  const [progress, setProgress] = useState(null);
  const [puzzle, setPuzzle] = useState(null);       // { id, fen, setupMove, rating, moves, seconds }
  const [phase, setPhase] = useState('loading');    // loading | think | play | checking | done | error
  const [chess, setChess] = useState(null);         // the board as the line is played
  const [played, setPlayed] = useState([]);         // SANs played so far
  // Replies the player chose that the engine accepted, while the puzzle went on
  // with its own: [{ ply, alt: { san, from, to, promotion }, saved, best, beforeFen }]
  const [swaps, setSwaps] = useState([]);
  // True while the bot's opening move is being shown (see utils/puzzleIntro).
  const [introing, setIntroing] = useState(false);
  const introTimerRef = useRef(() => {});   // cancels the running intro step
  useEffect(() => () => introTimerRef.current(), []);
  const [lastMove, setLastMove] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [note, setNote] = useState(null);           // { kind: 'ok'|'bad', text }
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const deadlineRef = useRef(0);
  const pausedRef = useRef(null);                   // ms left while the engine thinks
  const timingOutRef = useRef(false);
  // "How to play": shown automatically only on a user's first visit. Keyed by
  // user id — coaches sign into many student accounts on one browser. Waits for
  // the user to load, and counts as seen as soon as it opens (closing it with
  // "?", the backdrop or by leaving the page must not bring it back).
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const key = `calcHelpSeen:${userId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* private mode: it shows again next time */ }
    setShowHelp(true);
  }, [userId]);
  const closeHelp = () => setShowHelp(false);

  // ── Free analysis after the puzzle (like Healthy Mix) ──────────────────────
  // One line of moves from the start position: the puzzle's solution to begin
  // with. Step through it, or play any move — a move that leaves the line
  // replaces the rest of it with your own; "Back to the puzzle line" restores it.
  const [line, setLine] = useState([]);            // [{ san, from, to, fen }]
  const [cursor, setCursor] = useState(0);         // 0 = start position
  const solLineRef = useRef([]);
  const [engineOn, setEngineOn] = useState(false); // starts off each puzzle: costs nothing unless wanted
  const [squaresOn, setSquaresOn] = useState(() => {
    try { return localStorage.getItem('gaSquareEvals') === 'true'; } catch { return false; }
  });
  const toggleSquares = () => setSquaresOn(v => {
    try { localStorage.setItem('gaSquareEvals', String(!v)); } catch { /* ignore */ }
    return !v;
  });
  const analysing = phase === 'done' && !!puzzle;
  const viewFen = analysing ? (cursor === 0 ? puzzle.fen : line[cursor - 1]?.fen || puzzle.fen) : null;
  const viewLast = analysing ? (cursor === 0 ? puzzle.setupMove : { from: line[cursor - 1].from, to: line[cursor - 1].to }) : null;
  const { squareEvals, onSelectionChange } = useSquareEvals(viewFen, analysing && squaresOn);
  // One shared engine worker: the lines panel waits while square evals run.
  const squaresBusy = Object.values(squareEvals || {}).some(v => v.pending);

  const load = useCallback(async () => {
    setPhase('loading'); setErr(''); setNote(null); setResult(null); setPlayed([]); setSwaps([]);
    try {
      const { data } = await api.get('/api/calculation/puzzle');
      setPuzzle(data);
      setProgress(data.progress);
      // The board opens on Lichess's position and plays the bot's move itself;
      // "I found it" waits until it has landed.
      introTimerRef.current();
      const intro = introOf(data);
      if (intro) {
        setIntroing(true);
        setChess(new Chess(intro.startFen));
        setLastMove(null);
        introTimerRef.current = holdThen(() => {
          setChess(new Chess(data.fen));
          setLastMove(data.setupMove);
          introTimerRef.current = later(() => setIntroing(false), INTRO_MOVE_MS);
        });
      } else {
        setIntroing(false);
        setChess(new Chess(data.fen));
        setLastMove(data.setupMove);
      }
      setTimeLeft(data.seconds);
      timingOutRef.current = false;
      if (data.previous) setNote({ kind: 'bad', text: tr('Your last puzzle counted as wrong: you left it after pressing "I found it".') });
      setPhase('think');
    } catch (e) {
      setErr(e.response?.data?.message || tr('Could not load a puzzle. Please try again.'));
      setPhase('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Puzzle over → the analysis board starts on the solution, at the point the
  // player got to (the end when solved; where they left the line otherwise).
  useEffect(() => {
    if (phase !== 'done' || !result || !puzzle) return;
    const c = new Chess(puzzle.fen);
    const sol = [];
    for (const san of result.solution || []) {
      let m = null;
      try { m = c.move(san); } catch { break; }
      if (!m) break;
      sol.push({ san: m.san, from: m.from, to: m.to, fen: c.fen() });
    }
    let reached = 0;
    while (reached < played.length && reached < sol.length && played[reached] === sol[reached].san) reached++;
    solLineRef.current = sol;
    setLine(sol);
    setCursor(result.result === 'correct' ? sol.length : reached);
    setEngineOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const navTo = useCallback((i) => setCursor(Math.max(0, Math.min(line.length, i))), [line.length]);
  useEffect(() => {
    if (!analysing) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navTo(cursor - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navTo(cursor + 1); }
      if (e.key === 'Home') { e.preventDefault(); navTo(0); }
      if (e.key === 'End') { e.preventDefault(); navTo(line.length); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [analysing, cursor, line.length, navTo]);

  // A move on the analysis board: follow the line if it matches, otherwise
  // branch off with the player's own move.
  const analysisMove = (from, to, promotion) => {
    const b = new Chess(viewFen);
    let m = null;
    try { m = b.move({ from, to, promotion: promotion || 'q' }); } catch { m = null; }
    if (!m) return false;
    const next = line[cursor];
    if (next && next.from === m.from && next.to === m.to && next.san === m.san) { setCursor(cursor + 1); return true; }
    setLine([...line.slice(0, cursor), { san: m.san, from: m.from, to: m.to, fen: b.fen() }]);
    setCursor(cursor + 1);
    return true;
  };
  const offLine = line.length !== solLineRef.current.length || line.some((p, i) => p.san !== solLineRef.current[i]?.san);

  const finish = useCallback((data) => {
    setResult(data);
    if (data?.progress) setProgress(data.progress);
    setPhase('done');
    sound(data?.result === 'correct' ? 'complete' : 'wrong');
  }, []);

  // The play clock. Paused (pausedRef) while the engine judges a reply.
  useEffect(() => {
    if (phase !== 'play' && phase !== 'checking') return undefined;
    const t = setInterval(() => {
      if (pausedRef.current != null) return;
      const left = Math.max(0, (deadlineRef.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0 && !timingOutRef.current) {
        timingOutRef.current = true;
        api.post('/api/calculation/timeout', { id: puzzle.id })
          .then(r => finish(r.data))
          .catch(() => finish({ result: 'wrong', reason: 'timeout', delta: 0, solution: [] }));
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, puzzle, finish]);

  const foundIt = async () => {
    if (busy || introing) return;
    setBusy(true);
    try {
      const { data } = await api.post('/api/calculation/start', { id: puzzle.id });
      deadlineRef.current = Date.now() + data.seconds * 1000;
      setTimeLeft(data.seconds);
      setNote(null);
      setPhase('play');
    } catch (e) {
      setErr(e.response?.data?.message || tr('Could not start. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Put a move on the local board (after the server agreed to it).
  const apply = (move) => {
    const next = new Chess(chess.fen());
    const m = next.move(move);
    setChess(next);
    setPlayed(p => [...p, m.san]);
    setLastMove({ from: m.from, to: m.to });
    return next;
  };

  const sendMove = async (move) => {
    const ply = played.length;
    const { data } = await api.post('/api/calculation/move', { id: puzzle.id, ply, ...move });
    return data;
  };

  const onDrop = (from, to, promotion) => {
    if (analysing) return analysisMove(from, to, promotion);
    if (phase !== 'play' || busy) return false;
    const test = new Chess(chess.fen());
    let legal = null;
    try { legal = test.move({ from, to, promotion: promotion || 'q' }); } catch { legal = null; }
    if (!legal) return false;
    const move = { from, to, promotion: legal.promotion || undefined };
    const ply = played.length;
    setBusy(true);
    (async () => {
      try {
        const data = await sendMove(move);
        if (data.alternative) {
          // Show their reply, pause the clock, let the engine judge it.
          setChess(new Chess(test.fen())); setLastMove({ from, to });
          pausedRef.current = deadlineRef.current - Date.now();
          setPhase('checking');
          const { fine, best } = await altIsReasonable(data.beforeFen, legal, data.saved);
          deadlineRef.current = Date.now() + pausedRef.current;
          pausedRef.current = null;
          setChess(new Chess(data.beforeFen));
          if (fine) {
            // Remember the swap so the moves card can show both moves.
            setSwaps(s => [...s, { ply, alt: { san: legal.san, from: legal.from, to: legal.to, promotion: legal.promotion }, saved: data.saved.san, best, beforeFen: data.beforeFen }]);
            setNote({ kind: 'ok', text: tr('{alt} is a good defence too. The puzzle continues with {saved}.', { alt: data.san, saved: data.saved.san }) });
            const again = await sendMove({ from: data.saved.from, to: data.saved.to, promotion: data.saved.promotion });
            const board = new Chess(data.beforeFen);
            const m = board.move(data.saved.san);
            setChess(board); setPlayed(p => [...p, m.san]); setLastMove({ from: m.from, to: m.to });
            setPhase('play');
            if (again.result) finish(again);
          } else {
            setNote({ kind: 'bad', text: tr('{alt} lets you win too easily. Find a stronger defence for the opponent.', { alt: data.san }) });
            setLastMove(played.length ? lastMove : puzzle.setupMove);
            sound('wrong');
            setPhase('play');
          }
          return;
        }
        if (data.ok || data.result) apply(move);
        if (data.result) { finish(data); return; }
        setNote(null);
      } catch (e) {
        setErr(e.response?.data?.message || tr('Connection problem. Please try again.'));
      } finally {
        setBusy(false);
      }
    })();
    return true;
  };

  if (phase === 'error') {
    return (
      <div className="cc-page">
        <div className="cc-error">{err}<button type="button" className="cc-btn" onClick={load}>{tr('Try again')}</button></div>
      </div>
    );
  }

  const solverWhite = puzzle ? puzzle.fen.split(' ')[1] === 'w' : true;
  const solverName = solverWhite ? tr('White') : tr('Black');
  const oppName = solverWhite ? tr('Black') : tr('White');
  const myTurn = played.length % 2 === 0;
  const pct = puzzle ? Math.max(0, Math.min(100, (timeLeft / puzzle.seconds) * 100)) : 0;

  // Moves card, like Healthy Mix: numbered rows, White | Black. While solving it
  // fills up with the moves played; afterwards it is the analysis line, clickable,
  // with the step buttons underneath.
  const items = analysing
    ? line.map((p, i) => ({ san: p.san, own: p.san !== solLineRef.current[i]?.san }))
    : played.map(san => ({ san, own: false }));
  const activeIdx = analysing ? cursor : items.length;            // 1-based ply shown
  const cells = solverWhite ? items : [null, ...items];           // Black to move: row 1 starts "1. …"
  const offset = solverWhite ? 0 : 1;
  const moveRows = [];
  for (let i = 0; i < cells.length; i += 2) {
    const cell = (c, k) => {
      if (!c) return <span className="cc-mv cc-mv-empty">{c === null ? '…' : ''}</span>;
      const ply = k - offset + 1;
      return (
        <button
          type="button" disabled={!analysing}
          className={`cc-mv${ply === activeIdx ? ' on' : ''}${c.own ? ' own' : ''}`}
          onClick={() => analysing && navTo(ply)}
        >{c.san}</button>
      );
    };
    moveRows.push(
      <div key={i} className="cc-mrow">
        <span className="cc-mno">{i / 2 + 1}.</span>
        {cell(cells[i], i)}
        {i + 1 < cells.length ? cell(cells[i + 1], i + 1) : <span className="cc-mv cc-mv-empty" />}
      </div>
    );
    // Under the row: a reply the player chose that the engine accepted, next to
    // the puzzle's own move — and which of the two was the better defence.
    // After the puzzle, the player's move can be clicked to look at it.
    for (const sw of swaps) {
      const k = sw.ply + offset;
      if (k !== i && k !== i + 1) continue;
      if ((analysing ? line[sw.ply]?.san : played[sw.ply]) !== sw.saved) continue;
      const tryAlt = () => {
        const b = new Chess(sw.beforeFen);
        const m = b.move({ from: sw.alt.from, to: sw.alt.to, promotion: sw.alt.promotion });
        setLine([...line.slice(0, sw.ply), { san: m.san, from: m.from, to: m.to, fen: b.fen() }]);
        setCursor(sw.ply + 1);
      };
      moveRows.push(
        <div key={`sw${sw.ply}`} className="cc-swap" data-testid="calc-swap">
          <span className="cc-swap-item">
            <span className="cc-swap-lbl">{tr('You played')}</span>
            {analysing
              ? <button type="button" className="cc-swap-mv mine" onClick={tryAlt} title={tr('Look at this move on the board')}>{sw.alt.san}</button>
              : <span className="cc-swap-mv mine">{sw.alt.san}</span>}
            {sw.best === 'alt' && <span className="cc-swap-best">★ {tr('Best')}</span>}
          </span>
          <span className="cc-swap-item">
            <span className="cc-swap-lbl">{tr('Puzzle move')}</span>
            <span className="cc-swap-mv">{sw.saved}</span>
            {sw.best === 'saved' && <span className="cc-swap-best">★ {tr('Best')}</span>}
          </span>
        </div>
      );
    }
  }
  const movesCard = (
    <div className="cc-moves">
      <div className="cc-moves-head">
        <span className="cc-moves-title">{tr('Moves')}</span>
        {analysing && (
          <button type="button" className={`cc-tool cc-sf${engineOn ? ' on' : ''}`} onClick={() => setEngineOn(v => !v)} aria-pressed={engineOn}>
            🐟 {tr('Stockfish')} {engineOn ? tr('On') : tr('Off')}
          </button>
        )}
      </div>
      <div className="cc-moves-list">
        {items.length ? moveRows : <span className="cc-moves-empty">{tr("No moves yet — make a move on the board.")}</span>}
      </div>
      <div className="cc-moves-foot">
        <button type="button" className="cc-nav-btn" onClick={() => navTo(0)} disabled={!analysing || cursor === 0} title={tr('Start')}>⏮</button>
        <button type="button" className="cc-nav-btn" onClick={() => navTo(cursor - 1)} disabled={!analysing || cursor === 0} title={tr('Previous move')}>◀</button>
        <button type="button" className="cc-nav-btn" onClick={() => navTo(cursor + 1)} disabled={!analysing || cursor >= line.length} title={tr('Next move')}>▶</button>
        <button type="button" className="cc-nav-btn" onClick={() => navTo(line.length)} disabled={!analysing || cursor >= line.length} title={tr('Latest')}>⏭</button>
      </div>
    </div>
  );

  return (
    <div className="cc-page">
      <div
        className={`cc-main cc-${layoutMode}`} ref={mainRef}
        style={{ '--cc-bw': `${boardTotal}px`, '--cc-bh': `${boardTotal}px`, '--cc-lw': `${leftW}px`, '--cc-rw': `${rightW}px` }}
      >
        {/* LEFT: back, help, points, and Solved / Failed / Streak — like Healthy Mix. */}
        <aside className="cc-panel cc-left">
          <div className="cc-head-row">
            <Link to="/dashboard?view=guide" className="cc-back">{tr('← Guide')}</Link>
            <span className="cc-head-tools">
              <button type="button" className={`cc-help-btn${showHelp ? ' on' : ''}`} onClick={() => setShowHelp(v => !v)} aria-expanded={showHelp} title={tr('How to play')}>?</button>
            </span>
          </div>

          {progress && (
            <>
              <div className="cc-points">
                <span className="cc-points-lbl">{tr('Points')}</span>
                <span className={`cc-points-val${progress.strength < 0 ? ' neg' : ' pos'}`}>{fmtPct(progress.strength)}</span>
              </div>
              <div className="cc-stats3">
                <div><span className="cc-s-num good">{progress.solved ?? 0}</span><span className="cc-s-lbl">{tr('Solved')}</span></div>
                <div><span className="cc-s-num bad">{progress.failed ?? 0}</span><span className="cc-s-lbl">{tr('Failed')}</span></div>
                <div><span className="cc-s-num warn">{progress.streak ?? 0}</span><span className="cc-s-lbl">{tr('Streak')}</span></div>
              </div>
            </>
          )}

          {analysing && (
            <button type="button" className={`cc-tool cc-sq${squaresOn ? ' on' : ''}`} onClick={toggleSquares} aria-pressed={squaresOn} title={tr('Click a piece to see the evaluation of every square it can go to')}>
              🎯 {tr('Square eval')} {squaresOn ? tr('On') : tr('Off')}
            </button>
          )}

        </aside>

        <div className="cc-boardcol">
          <div className="cc-board">
            {chess && (
              <Chessboard
                position={analysing ? viewFen : chess.fen()}
                orientation={solverWhite ? 'white' : 'black'}
                boardWidth={boardSize}
                maxBoardWidth={maxW}
                desktopHeightRatio={4}
                onResize={setDragW}
                draggable={analysing || (phase === 'play' && !busy)}
                lastMove={analysing ? viewLast : lastMove}
                onDrop={onDrop}
                squareEvals={analysing ? squareEvals : undefined}
                onSelectionChange={analysing ? onSelectionChange : undefined}
              />
            )}
            {phase === 'think' && !showHelp && <div className="cc-lock" aria-hidden="true">🔒</div>}

            {/* How to play — a popup over the board. Opens by itself only the
                first time; "?" brings it back. */}
            {showHelp && (
              <div className="cc-help-overlay" onClick={closeHelp}>
                <div className="cc-help" data-testid="calc-help" role="dialog" aria-label={tr('How to play')} onClick={e => e.stopPropagation()}>
                  <div className="cc-help-title">{tr('How to play')}</div>
                  <ol>
                    <li>{tr('Look at the position and work out the whole line in your head — your moves and the replies.')}</li>
                    <li>{tr('Press "I found it". A clock starts: 5 seconds for every move.')}</li>
                    <li>{tr('Play every move — for both sides — before the clock runs out.')}</li>
                  </ol>
                  <button type="button" className="cc-help-ok" onClick={closeHelp}>{tr('Got it')}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="cc-right">
          {/* Engine lines (analysis): above the moves card, which shrinks and scrolls. */}
          {analysing && engineOn && (
            <div className="cc-engine"><EnginePanel fen={viewFen} enabled={engineOn && !squaresBusy} onToggle={() => setEngineOn(v => !v)} /></div>
          )}
          {puzzle && phase !== 'loading' && movesCard}

          <div className="cc-panel cc-controls">
            {/* Moves to find — in view while solving; gone once the puzzle is over. */}
            {puzzle && phase !== 'loading' && phase !== 'done' && (
              <div className="cc-tofind">
                <span className="cc-tofind-num">{puzzle.moves}</span>
                <span className="cc-tofind-lbl">{tr('Moves to find')}</span>
              </div>
            )}

            {phase === 'loading' && <p className="cc-muted">{tr('Loading…')}</p>}

            {phase === 'think' && puzzle && (
              <>
                {note && <p className={`cc-note ${note.kind}`}>{note.text}</p>}
                <button type="button" className="cc-btn cc-found" onClick={foundIt} disabled={busy || introing}>✓ {tr('I found it')}</button>
              </>
            )}

            {(phase === 'play' || phase === 'checking') && puzzle && (
              <>
                <div className={`cc-clock${timeLeft <= 5 ? ' low' : ''}`}>
                  <span className="cc-clock-num">{Math.ceil(timeLeft)}</span>
                  <div className="cc-clock-bar"><div style={{ width: `${pct}%` }} /></div>
                </div>
                <p className="cc-prompt">
                  {phase === 'checking'
                    ? tr('Checking that reply…')
                    : myTurn ? tr('Your move ({side}).', { side: solverName }) : tr("Now play {side}'s reply.", { side: oppName })}
                </p>
                {note && <p className={`cc-note ${note.kind}`}>{note.text}</p>}
                {err && <p className="cc-note bad">{err}</p>}
              </>
            )}

            {phase === 'done' && result && (
              <>
                <div className={`cc-result ${result.result === 'correct' ? 'win' : 'lose'}`}>
                  <span className="cc-result-icon" aria-hidden="true">{result.result === 'correct' ? '✓' : '✗'}</span>
                  <div>
                    <div className="cc-result-title">{result.result === 'correct' ? tr('Correct') : tr('Not this time')}</div>
                    {REASON[result.reason] && <div className="cc-muted">{REASON[result.reason]}</div>}
                  </div>
                  <span className={`cc-delta ${result.delta >= 0 ? 'up' : 'down'}`}>{fmtPct(result.delta)}</span>
                </div>
                {/* Moving up a level is celebrated — without saying which level. */}
                {result.movedUp && (
                  <div className="cc-levelup" data-testid="calc-levelup">
                    <span aria-hidden="true">🎉</span>
                    <div>
                      <strong>{tr("Wow! You're improving!")}</strong>
                      <span>{tr('The puzzles get a little harder from now on.')}</span>
                    </div>
                  </div>
                )}
                {offLine && (
                  <button type="button" className="cc-link" onClick={() => { setLine(solLineRef.current); setCursor(Math.min(cursor, solLineRef.current.length)); }}>
                    ↺ {tr('Back to the puzzle line')}
                  </button>
                )}
                {/* One button, two parts: Copy FEN | Next puzzle. */}
                <div className="cc-split">
                  <FenCopyBar fen={viewFen} asButton buttonStyle={{ flex: 'none', padding: '0 14px', border: 'none', borderRight: '1px solid var(--color-white-a10)', borderRadius: 0, background: 'var(--color-white-a07)', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }} />
                  <button type="button" className="cc-split-next" onClick={load}>{tr('Next puzzle →')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
