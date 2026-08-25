import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard, { gutterFor } from '../../components/Chessboard';
import InlineBoardEditor from '../../components/PositionEditor/InlineBoardEditor';
import stockfishService from '../../services/stockfishService';
import './PlayWithStockfish.css';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Must match .pvs-game in PlayWithStockfish.css.
const SIDE_CARD_W = 320;
const COL_GAP = 16;

// A game in progress SURVIVES A RELOAD.
//
// phase/chess/clocks lived only in React state, so any remount — a flaky
// connection, an accidental refresh, the dev server hot-reloading — silently
// threw the game away and dumped the player back on the settings screen
// mid-game. The whole game is small, so we snapshot it after every move and
// restore it on mount.
//
// sessionStorage, not localStorage: a game belongs to this tab, and a stale
// game should not resurrect days later in a different session. It is also
// per-origin-per-tab, so a shared browser cannot leak one student's game into
// another's tab.
const SAVE_KEY = 'pvs:game:v1';

const loadSaved = () => {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.fen !== 'string') return null;
    return d;
  } catch { return null; }
};
const clearSaved = () => { try { sessionStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } };

// ── Time controls ────────────────────────────────────────────────────────────
// base = minutes, inc = increment seconds. `null` base means unlimited (no clock
// at all — the clock UI is not rendered and nothing can flag).
const TIME_CONTROLS = [
  { id: 'unlimited', label: 'Unlimited', base: null, inc: 0, group: 'unlimited' },
  { id: '1+0',   label: '1+0',   base: 1,  inc: 0,  group: 'Bullet' },
  { id: '3+0',   label: '3+0',   base: 3,  inc: 0,  group: 'Blitz' },
  { id: '3+2',   label: '3+2',   base: 3,  inc: 2,  group: 'Blitz' },
  { id: '5+0',   label: '5+0',   base: 5,  inc: 0,  group: 'Blitz' },
  { id: '10+0',  label: '10+0',  base: 10, inc: 0,  group: 'Rapid' },
  { id: '10+5',  label: '10+5',  base: 10, inc: 5,  group: 'Rapid' },
  { id: '15+10', label: '15+10', base: 15, inc: 10, group: 'Rapid' },
  { id: '30+0',  label: '30+0',  base: 30, inc: 0,  group: 'Classical' },
  { id: '30+10', label: '30+10', base: 30, inc: 10, group: 'Classical' },
];

// ── Difficulty ───────────────────────────────────────────────────────────────
// Two dials move together, because depth alone is a poor difficulty knob: a
// shallow search still plays near-perfectly in simple positions. `skill` is
// Stockfish's own Skill Level (0-20), which makes it choose humanly-imperfect
// moves; depth/movetime cap how far it looks. Levels 1-3 are genuinely gentle
// for beginners; 6 is full strength.
const LEVELS = [
  { id: 1, label: 'Depth 2',  depth: 2,  skill: 1,  moveTime: 200,  blurb: 'Beginner — blunders often' },
  { id: 2, label: 'Depth 3',  depth: 3,  skill: 3,  moveTime: 300,  blurb: 'Casual — misses tactics' },
  { id: 3, label: 'Depth 5',  depth: 5,  skill: 6,  moveTime: 500,  blurb: 'Club player' },
  { id: 4, label: 'Depth 8',  depth: 8,  skill: 10, moveTime: 800,  blurb: 'Strong club' },
  { id: 5, label: 'Depth 12', depth: 12, skill: 15, moveTime: 1200, blurb: 'Expert' },
  { id: 6, label: 'Depth 16', depth: 16, skill: 20, moveTime: 2000, blurb: 'Hardest — full strength' },
];

const fmtClock = (ms) => {
  if (ms == null) return '--:--';
  // FLOOR, not ceil. With ceil, a clock at 59.99s still rendered "1:00" for the
  // whole first second — the clock looked frozen at its starting value even
  // though it was counting down. Floor shows 0:59 as soon as any time is spent,
  // which is also how every chess clock behaves.
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  // Under ten seconds, tenths matter more than a tidy mm:ss.
  if (ms < 10000) return `${m}:${String(s).padStart(2, '0')}.${Math.floor((Math.max(0, ms) % 1000) / 100)}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Clickable move list in White/Black columns. `current` is the ply being
// viewed (moves.length = live); onSelect(ply) jumps the board to after that move.
function MoveList({ moves, current, onSelect }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ no: i / 2 + 1, w: moves[i], wPly: i + 1, b: moves[i + 1], bPly: i + 2 });
  }
  const endRef = useRef(null);
  // Keep the viewed move in sight as the game grows.
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [current, moves.length]);
  const cell = (san, ply) =>
    san ? (
      <button
        className={`pvs-move-san${current === ply ? ' active' : ''}`}
        onClick={() => onSelect(ply)}
      >{san}</button>
    ) : <span className="pvs-move-san" />;
  return (
    <div className="pvs-moves">
      {rows.length === 0 ? (
        <div className="pvs-moves-empty">No moves yet</div>
      ) : rows.map(r => (
        <div className="pvs-move-row" key={r.no}>
          <span className="pvs-move-no">{r.no}.</span>
          {cell(r.w, r.wPly)}
          {cell(r.b, r.bPly)}
          {(current === r.wPly || current === r.bPly) && <span ref={endRef} />}
        </div>
      ))}
    </div>
  );
}

export default function PlayWithStockfish() {
  const navigate = useNavigate();

  // Restored snapshot (if any). Read once, synchronously, so the very first
  // render is already the game — no flash of the settings screen on reload.
  const saved = useRef(loadSaved()).current;

  // 'setup' → choosing options; 'playing' → the game itself.
  const [phase, setPhase] = useState(saved ? 'playing' : 'setup');

  // ── Setup choices ──
  const [tcId, setTcId] = useState(saved?.tcId ?? '10+0');
  const [levelId, setLevelId] = useState(saved?.levelId ?? 3);
  const [side, setSide] = useState('white');           // 'white' | 'black' | 'random'
  const [startMode, setStartMode] = useState('standard'); // 'standard' | 'position'
  const [customFen, setCustomFen] = useState(START_FEN);
  const [showEditor, setShowEditor] = useState(false);

  const tc = TIME_CONTROLS.find(t => t.id === tcId) || TIME_CONTROLS[0];
  const level = LEVELS.find(l => l.id === levelId) || LEVELS[2];

  // ── Game state ──
  const boardRef = useRef(null);
  // Board size — same approach as the Play-with-a-Friend room.
  //
  // Two things matter. (1) The board draws its coordinate labels in a gutter
  // OUTSIDE boardWidth, so handing it the full container width overflows by the
  // gutter and slides under the move card; gutterFor() asks the board for its
  // real gutters instead of copying its internal maths. (2) The board is square,
  // so on a short window HEIGHT is the real limit — take whichever axis is
  // smaller so it always fits without the page scrolling.
  const [boardSize, setBoardSize] = useState(520);
  useEffect(() => {
    if (phase !== 'playing') return;
    const measure = () => {
      const el = boardRef.current;
      if (!el) return;
      // WIDTH: derived from the GRID's width, not the board column's.
      //
      // The board column is now `max-content` — it collapses onto the board —
      // so measuring it would be circular (the board would only ever keep its
      // current size). Measure the grid instead and subtract the fixed side
      // card + gap to get the space the board may occupy.
      const grid = el.parentElement;
      const gridW = grid ? Math.round(grid.getBoundingClientRect().width) : 0;
      const avail = Math.max(240, gridW - SIDE_CARD_W - COL_GAP);
      const g = gutterFor(avail);
      const byWidth = avail - g.left - g.right;
      // HEIGHT: from the board's top to the page's bottom padding. Nothing sits
      // above the board any more (the result is an overlay).
      const top = el.getBoundingClientRect().top;
      const byHeight = window.innerHeight - top - 12;
      const next = Math.max(240, Math.floor(Math.min(byWidth, byHeight)));
      // The observer watches the very element this resizes, so only commit a
      // real change — otherwise a 1px rounding wobble could ping-pong.
      setBoardSize(prev => (Math.abs(prev - next) > 1 ? next : prev));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    // Watch the GRID: the board's own column now resizes with the board, so
    // observing it would feed back into itself.
    if (ro && boardRef.current?.parentElement) ro.observe(boardRef.current.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [phase]);

  const [chess, setChess] = useState(() => {
    try { return new Chess(saved?.fen || undefined); } catch { return new Chess(); }
  });
  const [orientation, setOrientation] = useState(saved?.orientation ?? 'white');
  const [myColor, setMyColor] = useState(saved?.myColor ?? 'w');
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState(saved?.moves ?? []);
  const [lastMove, setLastMove] = useState(saved?.lastMove ?? null);
  const [result, setResult] = useState(saved?.result ?? null);   // { text, detail } | null
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState(null);
  // The game-over popup. Dismissable so the player can study the final
  // position; a restored finished game does not re-pop it.
  const [showResultPopup, setShowResultPopup] = useState(false);
  // Which ply the board is SHOWING. null = live position. Lets the player step
  // back through the game without affecting the game itself.
  const [viewPly, setViewPly] = useState(null);
  // The position the game began from — replay starts here, so custom start
  // positions rewind correctly rather than to the standard opening.
  const startFenRef = useRef(saved?.startFen || START_FEN);

  // Clocks in ms. null when the time control is unlimited.
  const [whiteMs, setWhiteMs] = useState(saved?.whiteMs ?? null);
  const [blackMs, setBlackMs] = useState(saved?.blackMs ?? null);
  // Which colours have played at least once. A colour's clock does NOT tick
  // until that colour has actually moved — the same rule the friend room uses
  // (see room.moved / startTicking in backend/socket/friendGameSocket.js). So
  // White's clock starts on White's 1st move, and Black's stays frozen until
  // Black replies, rather than starting the moment it becomes Black's turn.
  const movedRef = useRef(saved?.moved ?? { w: false, b: false });
  // Clock mirrors: let the snapshot read current values without taking the
  // clocks as dependencies (which would fire it on every 100ms tick).
  const whiteMsRef = useRef(saved?.whiteMs ?? null);
  const blackMsRef = useRef(saved?.blackMs ?? null);

  // Refs mirror state for the timer loop and async engine callbacks, which must
  // not close over a stale render.
  const chessRef = useRef(chess);
  const resultRef = useRef(saved?.result ?? null);
  const myColorRef = useRef(saved?.myColor ?? 'w');
  const levelRef = useRef(level);
  const tickRef = useRef(null);
  const lastTickRef = useRef(0);
  useEffect(() => { chessRef.current = chess; }, [chess]);
  useEffect(() => { resultRef.current = result; }, [result]);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { whiteMsRef.current = whiteMs; }, [whiteMs]);
  useEffect(() => { blackMsRef.current = blackMs; }, [blackMs]);
  // A new move snaps the view back to the live position — otherwise the board
  // would sit on an old ply while the game moved on without it.
  useEffect(() => { setViewPly(null); }, [moves.length]);

  // A GAME IN PROGRESS IS NOT ABANDONED BY ACCIDENT.
  //
  // The browser's own confirm dialog is the only thing that can intercept a tab
  // close or a hard refresh. It appears ONLY while a game is genuinely live —
  // never once the game is finished, so reviewing the final position or leaving
  // afterwards is completely free.
  const gameLive = phase === 'playing' && !result && moves.length > 0;
  useEffect(() => {
    if (!gameLive) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [gameLive]);

  // Snapshot the game so a reload can resume it.
  //
  // Deliberately NOT keyed on the clocks: those change every 100ms, so
  // including them made this run a synchronous JSON.stringify + sessionStorage
  // write TEN TIMES A SECOND for the whole game. It keys on real events (a
  // move, a result) and reads the current clocks at that moment; a separate
  // low-frequency timer keeps the stored clocks roughly fresh in between.
  const snapshot = useCallback(() => {
    if (phase !== 'playing') return;
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({
        fen: chessRef.current.fen(), moves, lastMove, result, moved: movedRef.current,
        startFen: startFenRef.current,
        whiteMs: whiteMsRef.current, blackMs: blackMsRef.current,
        myColor, orientation, tcId, levelId,
      }));
    } catch { /* storage full / disabled — the game still plays, just won't resume */ }
  }, [phase, moves, lastMove, result, myColor, orientation, tcId, levelId]);

  useEffect(() => { snapshot(); }, [snapshot]);

  // Keep the stored clocks fresh without writing on every tick.
  useEffect(() => {
    if (phase !== 'playing' || tc.base == null || result) return;
    const id = setInterval(snapshot, 5000);
    return () => clearInterval(id);
  }, [phase, tc.base, result, snapshot]);

  // Boot the engine once, on entering the game (not on the setup screen, so a
  // user only browsing options never pays the WASM download).
  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        if (!cancelled) setEngineReady(true);
      } catch (e) {
        if (!cancelled) setEngineError(e?.message || 'Engine failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, [phase]);

  const endGame = useCallback((text, detail) => {
    resultRef.current = { text, detail };
    setResult({ text, detail });
    setShowResultPopup(true);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // Read the game-over reason off a position.
  const gameOverResult = useCallback((game, humanColor) => {
    if (!game.isGameOver()) return null;
    if (game.isCheckmate()) {
      // The side to move is the one that got mated.
      const loser = game.turn();
      const youWon = loser !== humanColor;
      return { text: youWon ? 'You win!' : 'Stockfish wins', detail: 'Checkmate' };
    }
    if (game.isStalemate())            return { text: 'Draw', detail: 'Stalemate' };
    if (game.isThreefoldRepetition())  return { text: 'Draw', detail: 'Threefold repetition' };
    if (game.isInsufficientMaterial()) return { text: 'Draw', detail: 'Insufficient material' };
    if (game.isDraw())                 return { text: 'Draw', detail: '50-move rule' };
    return { text: 'Game over', detail: '' };
  }, []);

  // ── Clock ──────────────────────────────────────────────────────────────────
  // One interval for the whole game; it decrements whichever side is to move.
  // Unlimited games never start it, so there is genuinely no game time.
  useEffect(() => {
    if (phase !== 'playing' || tc.base == null) return;
    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (resultRef.current) return;

      const turn = chessRef.current.turn();
      // Frozen until this colour has made its first move.
      if (!movedRef.current[turn]) return;
      const setter = turn === 'w' ? setWhiteMs : setBlackMs;
      setter(prev => {
        if (prev == null) return prev;
        const next = prev - delta;
        if (next <= 0) {
          const humanFlagged = turn === myColorRef.current;
          endGame(humanFlagged ? 'Stockfish wins' : 'You win!', 'Time out');
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [phase, tc.base, endGame]);

  // Add the increment to whoever just moved.
  const applyIncrement = useCallback((moverColor) => {
    if (tc.base == null || !tc.inc) return;
    const add = tc.inc * 1000;
    if (moverColor === 'w') setWhiteMs(v => (v == null ? v : v + add));
    else setBlackMs(v => (v == null ? v : v + add));
  }, [tc.base, tc.inc]);

  // ── Engine move ────────────────────────────────────────────────────────────
  const playEngineMove = useCallback(async (fromFen) => {
    const lvl = levelRef.current;
    setThinking(true);
    try {
      const res = await stockfishService.getBestMove(fromFen, {
        depth: lvl.depth,
        moveTime: lvl.moveTime,
        skill: lvl.skill,
      });
      if (resultRef.current) return;            // game ended while thinking
      const uci = res?.bestMove;
      if (!uci) { endGame('Game over', 'Engine had no move'); return; }

      const game = new Chess(chessRef.current.fen());
      const mv = game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || 'q',
      });
      if (!mv) { endGame('Game over', 'Engine returned an illegal move'); return; }

      chessRef.current = game;
      setChess(game);
      setMoves(m => [...m, mv.san]);
      setLastMove({ from: mv.from, to: mv.to });
      movedRef.current[mv.color] = true;
      applyIncrement(mv.color);

      const over = gameOverResult(game, myColorRef.current);
      if (over) endGame(over.text, over.detail);
    } catch (e) {
      setEngineError(e?.message || 'Engine error');
    } finally {
      setThinking(false);
    }
  }, [applyIncrement, endGame, gameOverResult]);

  // If the engine is on move, kick it off once the engine is ready. Covers all
  // three cases: the user chose Black, a custom position with the engine to
  // move, and a RESTORED game that was reloaded while Stockfish was thinking
  // (its pending search died with the old page, so it must be re-issued).
  useEffect(() => {
    if (phase !== 'playing' || !engineReady || result) return;
    if (chessRef.current.turn() !== myColorRef.current && !thinking) {
      playEngineMove(chessRef.current.fen());
    }
    // Intentionally runs on readiness/turn changes only.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase, engineReady, result]);

  const handleDrop = (from, to) => {
    if (result || thinking) return false;
    const game = new Chess(chessRef.current.fen());
    if (game.turn() !== myColorRef.current) return false;
    let mv;
    try {
      const piece = game.get(from);
      const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
      mv = game.move({ from, to, promotion });
    } catch (e) { return false; }
    if (!mv) return false;

    chessRef.current = game;
    setChess(game);
    setMoves(m => [...m, mv.san]);
    setLastMove({ from: mv.from, to: mv.to });
    movedRef.current[mv.color] = true;
    applyIncrement(mv.color);

    const over = gameOverResult(game, myColorRef.current);
    if (over) { endGame(over.text, over.detail); return true; }

    playEngineMove(game.fen());
    return true;
  };

  // ── Start / restart ────────────────────────────────────────────────────────
  const startGame = () => {
    if (gameLive && !window.confirm('Abandon this game and start a new one?')) return;
    const colour = side === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : side;
    const startFen = startMode === 'position' ? customFen : START_FEN;

    let game;
    try { game = new Chess(startFen); }
    catch { game = new Chess(START_FEN); }

    chessRef.current = game;
    startFenRef.current = startFen;
    resultRef.current = null;
    myColorRef.current = colour === 'white' ? 'w' : 'b';

    setChess(game);
    setMyColor(colour === 'white' ? 'w' : 'b');
    setOrientation(colour);
    setMoves([]);
    setLastMove(null);
    movedRef.current = { w: false, b: false };
    setResult(null);
    setShowResultPopup(false);
    setThinking(false);
    setWhiteMs(tc.base == null ? null : tc.base * 60 * 1000);
    setBlackMs(tc.base == null ? null : tc.base * 60 * 1000);
    setPhase('playing');
  };

  const backToSetup = () => {
    // Mid-game this would throw the game away, which is exactly what used to
    // happen by accident. Finished games leave freely.
    if (gameLive && !window.confirm('Abandon this game and return to settings?')) return;
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    stockfishService.stop?.();
    clearSaved();
    setPhase('setup');
    setResult(null);
    setThinking(false);
  };

  const resign = () => {
    if (result) return;
    endGame('Stockfish wins', 'You resigned');
  };

  // Icon controls, shared by the side card and the game-over popup.
  // title/aria-label carry the meaning, since an icon has no accessible name.
  // No Flip button — the board flips with F once it has focus.
  const renderActions = (showResign) => (
    <div className="pvs-side-actions">
      {showResign && !result && (
        <button className="pvs-icon-btn" onClick={resign} title="Resign" aria-label="Resign">🏳</button>
      )}
      <button className="pvs-icon-btn" onClick={startGame} title="Rematch" aria-label="Rematch">↺</button>
      <button className="pvs-icon-btn" onClick={backToSetup} title="Game settings" aria-label="Game settings">⚙</button>
      <button
        className="pvs-icon-btn pvs-icon-btn--primary"
        title="Back to Play"
        aria-label="Back to Play"
        onClick={() => {
          if (gameLive && !window.confirm('Leave this game? Your progress will be lost.')) return;
          clearSaved();
          navigate('/games');
        }}
      >←</button>
    </div>
  );

  // ── Setup screen ───────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="pvs-page">
        <div className="pvs-setup">
          <div className="pvs-head">
            <h1>♟ Play vs Stockfish</h1>
            <p>Pick a time control, a strength, and where to start from.</p>
          </div>

          {/* TIME CONTROL */}
          <section className="pvs-section">
            <h2>Time control</h2>
            <div className="pvs-grid">
              {TIME_CONTROLS.map(t => (
                <button
                  key={t.id}
                  className={`pvs-chip${tcId === t.id ? ' is-on' : ''}${t.base == null ? ' pvs-chip--wide' : ''}`}
                  onClick={() => setTcId(t.id)}
                >
                  <span className="pvs-chip-label">{t.label}</span>
                  {t.group !== 'unlimited' && <span className="pvs-chip-sub">{t.group}</span>}
                  {t.base == null && <span className="pvs-chip-sub">No clock — take as long as you like</span>}
                </button>
              ))}
            </div>
          </section>

          {/* LEVEL */}
          <section className="pvs-section">
            <h2>Stockfish level</h2>
            <div className="pvs-grid pvs-grid--levels">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  className={`pvs-chip${levelId === l.id ? ' is-on' : ''}`}
                  onClick={() => setLevelId(l.id)}
                >
                  <span className="pvs-chip-label">{l.label}</span>
                  <span className="pvs-chip-sub">{l.blurb}</span>
                </button>
              ))}
            </div>
          </section>

          {/* SIDE */}
          <section className="pvs-section">
            <h2>You play</h2>
            <div className="pvs-grid pvs-grid--side">
              {[['white', '♔ White'], ['black', '♚ Black'], ['random', '🎲 Random']].map(([v, lab]) => (
                <button key={v} className={`pvs-chip${side === v ? ' is-on' : ''}`} onClick={() => setSide(v)}>
                  <span className="pvs-chip-label">{lab}</span>
                </button>
              ))}
            </div>
          </section>

          {/* START POSITION */}
          <section className="pvs-section">
            <h2>Starting position</h2>
            <div className="pvs-grid pvs-grid--side">
              <button className={`pvs-chip${startMode === 'standard' ? ' is-on' : ''}`} onClick={() => setStartMode('standard')}>
                <span className="pvs-chip-label">Standard game</span>
                <span className="pvs-chip-sub">Normal starting position</span>
              </button>
              <button className={`pvs-chip${startMode === 'position' ? ' is-on' : ''}`} onClick={() => setStartMode('position')}>
                <span className="pvs-chip-label">From a position</span>
                <span className="pvs-chip-sub">Set up a board, then play it out</span>
              </button>
            </div>

            {startMode === 'position' && (
              <div className="pvs-posrow">
                <button className="pvs-btn pvs-btn--ghost" onClick={() => setShowEditor(true)}>
                  ✏️ Set up the board
                </button>
                <code className="pvs-fen" title={customFen}>{customFen}</code>
              </div>
            )}
          </section>

          <div className="pvs-actions">
            <button className="pvs-btn pvs-btn--ghost" onClick={() => navigate('/games')}>← Back</button>
            <button className="pvs-btn pvs-btn--primary" onClick={startGame}>Start game →</button>
          </div>
        </div>

        {showEditor && (
          <div className="pvs-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}>
            <div className="pvs-modal">
              <InlineBoardEditor
                initialFen={customFen}
                onApply={(fen) => { setCustomFen(fen); setShowEditor(false); }}
                onCancel={() => setShowEditor(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Move navigation ────────────────────────────────────────────────────────
  const isLive = viewPly === null || viewPly >= moves.length;
  // What the board shows: the live position, or the replay at viewPly.
  const displayFen = (() => {
    if (isLive) return chess.fen();
    try {
      const c = new Chess(startFenRef.current);
      for (let i = 0; i < viewPly; i++) c.move(moves[i]);
      return c.fen();
    } catch (_) { return chess.fen(); }
  })();
  const gotoPly = (ply) => {
    const clamped = Math.max(0, Math.min(ply, moves.length));
    setViewPly(clamped >= moves.length ? null : clamped);
  };
  const navFirst = () => setViewPly(moves.length === 0 ? null : 0);
  const navPrev = () => gotoPly((viewPly === null ? moves.length : viewPly) - 1);
  const navNext = () => gotoPly((viewPly === null ? moves.length : viewPly) + 1);
  const navLast = () => setViewPly(null);

  // ── Game screen ────────────────────────────────────────────────────────────
  const turn = chess.turn();
  const topColor = orientation === 'white' ? 'b' : 'w';
  const topMs = topColor === 'w' ? whiteMs : blackMs;
  const bottomMs = topColor === 'w' ? blackMs : whiteMs;

  return (
    <div className="pvs-page pvs-page--game">
      <div className="pvs-game">
        {/* CENTER: board only — the player strips live in the right card,
            exactly like the Play-with-a-Friend room. */}
        <div className="pvs-board-col" ref={boardRef}>
          {/* The board, with the game-over popup laid over it. */}
          <div className="pvs-board-wrap" style={{ width: boardSize }}>
          <Chessboard
            position={displayFen}
            onDrop={handleDrop}
            orientation={orientation}
            boardWidth={boardSize}
            draggable={!result && isLive}
            lastMove={isLive ? lastMove : null}
            playerColor={orientation}
          />

          {result && showResultPopup && (
            <div className="pvs-result-overlay">
              <h3>{result.text}</h3>
              {result.detail && <p>{result.detail}</p>}
              <p className="pvs-result-line">
                {moves.length} move{moves.length === 1 ? '' : 's'} · {level.label}
                {tc.base != null ? ` · ${tc.label}` : ' · Unlimited'}
              </p>
              {renderActions(false)}
              <button className="pvs-result-dismiss" onClick={() => setShowResultPopup(false)}>
                Review the position
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="pvs-side">
          {/* Opponent strip on top, you on the bottom — the moves list sits
              between them, matching the friend game's right card. */}
          <div className={`pvs-player${turn === topColor && !result ? ' is-active' : ''}`}>
            <span className="pvs-player-name">🤖 Stockfish <em>({level.label})</em></span>
            {tc.base != null && <span className="pvs-player-clock">{fmtClock(topMs)}</span>}
          </div>

          {engineError && <div className="pvs-alert pvs-alert--bad">Engine problem: {engineError}</div>}
          {!engineReady && !engineError && <div className="pvs-alert">Loading engine…</div>}

          {thinking && !result && <div className="pvs-turn">Stockfish is thinking…</div>}

          {/* Clickable move list: click any move to see the position after it. */}
          <MoveList moves={moves} current={viewPly ?? moves.length} onSelect={gotoPly} />

          <div className="pvs-nav">
            <button className="pvs-nav-btn" onClick={navFirst} disabled={moves.length === 0} title="First move" aria-label="First move">⏮</button>
            <button className="pvs-nav-btn" onClick={navPrev} disabled={(viewPly ?? moves.length) <= 0} title="Previous move" aria-label="Previous move">◀</button>
            <button className="pvs-nav-btn" onClick={navNext} disabled={isLive} title="Next move" aria-label="Next move">▶</button>
            <button className="pvs-nav-btn" onClick={navLast} disabled={isLive} title="Latest position" aria-label="Latest position">⏭</button>
          </div>

          <div className={`pvs-player${turn !== topColor && !result ? ' is-active' : ''}`}>
            <span className="pvs-player-name">👤 You</span>
            {tc.base != null && <span className="pvs-player-clock">{fmtClock(bottomMs)}</span>}
          </div>

          {renderActions(true)}
        </div>
      </div>
    </div>
  );
}
