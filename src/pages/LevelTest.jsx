import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import api from '../api';
import { usePieceTheme } from '../contexts/PieceThemeContext';
import './LevelTest.css';
import { t as tr } from '../i18n/LanguageContext';

// "Find your level" — the Nexus Guide's placement test.
//
// 20 puzzles, one per topic, topic NOT shown (knowing "it's a mate in 1" makes it
// easy — that is exactly what this test must not measure). The server picks each
// puzzle harder or easier from the answers so far, places the player on one of
// 8 levels, and remembers their weak topics. One try per puzzle, no hints; the
// puzzle rating is not touched.

const normSan = (s) => (s || '').toLowerCase().replace(/[+#]/g, '').trim();

// Side panel width on wide screens; below SIDE_BREAK the panel drops under the board.
const SIDE_W = 320;
const SIDE_BREAK = 860;

// Board as big as the space allows: on wide screens the page height and the room
// left of the side panel; on phones the FULL screen width, edge to edge.
// Returns [width, wide].
function useBoardWidth(wrapRef, phase) {
  const [size, setSize] = useState([360, true]);
  useEffect(() => {
    const calc = () => {
      const wide = window.innerWidth >= SIDE_BREAK;
      // clientWidth, not innerWidth: excludes a scrollbar, so no sideways scroll.
      if (!wide) { setSize([document.documentElement.clientWidth, false]); return; }
      // clientWidth includes the page's 16px side padding.
      const avail = wrapRef.current ? wrapRef.current.clientWidth - 32 : window.innerWidth - 32;
      const byWidth = avail - SIDE_W - 24;
      const byHeight = window.innerHeight - 90;
      setSize([Math.round(Math.max(260, Math.min(byWidth, byHeight, 900))), true]);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', calc);
    return () => { ro.disconnect(); window.removeEventListener('resize', calc); };
  }, [wrapRef, phase]);   // the test screen (and its ref) only exists in the 'test' phase
  return size;
}

// Find a SAN move from the stored line among the legal moves (stored SAN can be loosely formatted).
function playSan(game, san) {
  const m = game.moves({ verbose: true }).find(x => normSan(x.san) === normSan(san));
  return m ? game.move(m) : null;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts from 0 up to `target` (ease-out), once.
function useCountUp(target, ms = 1100, delay = 300) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) { setV(target); return undefined; }
    let raf; let start;
    const tick = (t) => {
      if (start == null) start = t;
      const k = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const to = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [target, ms, delay]);
  return v;
}

// Time the pawn takes per rank, and the pause before it sets off.
const HOP_MS = 600;
const CLIMB_DELAY = 700;

// The 8 levels as the 8 ranks of one file. The pawn starts on rank 1 and climbs
// to the player's rank, lighting the ranks it passes; on the last rank it
// promotes to a queen. Vertical (rank 8 on top) on wide screens, a row on phones.
function RankFile({ levels, current }) {
  const { getPieceSrc } = usePieceTheme();
  const top = levels.length;
  const still = reducedMotion();
  const [rank, setRank] = useState(still ? current : 1);
  const [arrived, setArrived] = useState(still);
  useEffect(() => {
    if (still) return undefined;
    const go = setTimeout(() => setRank(current), CLIMB_DELAY);
    const land = setTimeout(() => setArrived(true), CLIMB_DELAY + (current - 1) * HOP_MS + 60);
    return () => { clearTimeout(go); clearTimeout(land); };
  }, [current, still]);
  const promoted = arrived && current === top;
  return (
    <ol
      className={`lt-file${arrived ? ' arrived' : ''}`}
      style={{ '--hop': `${HOP_MS}ms`, '--climb-delay': `${CLIMB_DELAY}ms` }}
      aria-label={tr("Level {n} of {of}", { n: current, of: top })}
    >
      {[...levels].reverse().map(l => {
        const state = l.n === current ? 'here' : l.n < current ? 'passed' : 'ahead';
        return (
          <li key={l.n} className={`lt-rank ${state}`} style={{ '--k': l.n - 1 }}>
            <span className={`lt-sq ${l.n % 2 ? 'dark' : 'light'}`}>
              <span className="lt-sq-n">{l.n}</span>
              {state === 'passed' && <span className="lt-sq-dot" />}
            </span>
            <span className="lt-rank-name">
              {tr(l.title)}
              {state === 'here' && <em>{tr("You are here")}</em>}
            </span>
          </li>
        );
      })}
      <li
        className="lt-walker" aria-hidden
        style={{ '--r': rank, '--top': top, transitionDuration: `${(current - 1) * HOP_MS}ms` }}
      >
        <img key={promoted ? 'q' : 'p'} className={promoted ? 'promoted' : ''} src={getPieceSrc(promoted ? 'wQ' : 'wP')} alt="" />
      </li>
    </ol>
  );
}

// "12 of 20" as a ring that fills up.
function ScoreRing({ correct, total }) {
  const shown = useCountUp(correct);
  const pct = total ? (shown / total) * 100 : 0;
  return (
    <div className="lt-ring" style={{ '--pct': pct }}>
      <div className="lt-ring-in">
        <strong>{shown}</strong><span>/{total}</span>
      </div>
    </div>
  );
}

function CountUp({ value }) {
  return useCountUp(value, 1300);
}

function WeakSpot({ w }) {
  const reasons = [];
  if (w.testMissed) reasons.push(tr("You missed it in the test, on a puzzle at your level."));
  if (w.histTried >= 5 && w.histWrong / w.histTried >= 0.4) {
    reasons.push(tr("In your past puzzles you got {wrong} of {tried} wrong.", { wrong: w.histWrong, tried: w.histTried }));
  }
  return (
    <div className="lt-weak">
      <div className="lt-weak-head">
        <strong>{tr(w.label)}</strong>
        <Link className="lt-btn lt-btn-sm" to={`/training/healthy-mix?theme=${encodeURIComponent(w.theme)}`}>{tr("Practise")} ›</Link>
      </div>
      {reasons.map((r, i) => <div key={i} className="lt-weak-why">{r}</div>)}
      {w.tip && <div className="lt-weak-tip"><span aria-hidden>💡</span>{tr(w.tip)}</div>}
    </div>
  );
}

function Result({ result }) {
  const lv = result.level;
  const nextLevel = result.levels.find(l => l.n === lv.n + 1);
  // Where the player stands between this level and the next.
  const span = lv.to != null ? lv.to - lv.from : 0;
  const toNext = span > 0 ? Math.max(4, Math.min(100, Math.round(((result.estimate - lv.from) / span) * 100))) : 100;
  return (
    <div className="lt-result">
      <section className="lt-hero">
        <div className="lt-hero-main">
          <div className="lt-hero-kicker lt-in" style={{ '--d': '0ms' }}>🧭 {tr("Nexus Guide · your starting level")}</div>
          <div className="lt-hero-level lt-in" style={{ '--d': '80ms' }}>{tr("Level {n} of {of}", { n: lv.n, of: result.of })}</div>
          <h1 className="lt-hero-title lt-in" style={{ '--d': '160ms' }}>{tr(lv.title)}</h1>
          <p className="lt-hero-blurb lt-in" style={{ '--d': '240ms' }}>{tr(lv.blurb)}</p>

          <div className="lt-stats lt-in" style={{ '--d': '320ms' }}>
            <div className="lt-stat">
              <ScoreRing correct={result.correct} total={result.total} />
              <span className="lt-stat-label">{tr("Puzzles right")}</span>
            </div>
            <div className="lt-stat">
              <strong className="lt-stat-big"><CountUp value={result.estimate} /></strong>
              <span className="lt-stat-label">{tr("Puzzle strength")}</span>
            </div>
          </div>

          {nextLevel && lv.to != null && (
            <div className="lt-climb lt-in" style={{ '--d': '400ms' }}>
              <div className="lt-climb-head">
                <span>{tr("Next: {title}", { title: tr(nextLevel.title) })}</span>
                <span className="lt-climb-at">{lv.to}</span>
              </div>
              <div className="lt-climb-bar"><div style={{ width: `${toNext}%` }} /></div>
            </div>
          )}
        </div>
        <RankFile levels={result.levels} current={lv.n} />
      </section>

      <div className="lt-grid">
        <section className="lt-card lt-focus lt-in" style={{ '--d': '550ms' }}>
          <h2 className="lt-h2">🎯 {tr("Where to focus")}</h2>
          <div className="lt-focus-range">
            <span className="lt-focus-num">{result.focus.min}–{result.focus.max}</span>
            <span className="lt-focus-mode">{tr("Healthy Mix rating range")}</span>
          </div>
          <p>{tr("Just under and just above your level: easy enough to keep going, hard enough to grow. Mixed topics, so you must find the idea yourself — like in a real game.")}</p>
          <Link className="lt-btn" to={`/training/healthy-mix?min=${result.focus.min}&max=${result.focus.max}`}>{tr("Practise in this range")} ›</Link>
          {result.strong.length > 0 && (
            <div className="lt-strong">
              <span className="lt-strong-label">{tr("You did well on:")}</span>
              <div className="lt-chips">
                {result.strong.map(s => <span key={s.theme} className="lt-chip">✓ {tr(s.label)}</span>)}
              </div>
            </div>
          )}
        </section>

        <section className="lt-card lt-weaks lt-in" style={{ '--d': '650ms' }}>
          <h2 className="lt-h2">🩹 {tr("Your weak spots")}</h2>
          {result.weak.length ? (
            <>
              <p className="lt-muted">{tr("Fix these first. Your Training Path gives you a few of these puzzles every day.")}</p>
              {result.weak.map(w => <WeakSpot key={w.theme} w={w} />)}
            </>
          ) : (
            <p className="lt-muted">{tr("No clear weak topic — great. Keep practising mixed puzzles in your range.")}</p>
          )}
        </section>
      </div>

      <section className="lt-after lt-in" style={{ '--d': '750ms' }}>
        <div className="lt-after-text">
          <strong>{tr("Now follow your Training Path every day.")}</strong>
          <span>{tr("It is in your dashboard, under Guide. It shows what to do today and how your games are changing.")}</span>
          <span className="lt-after-note">
            {tr("This test happens only once. From now on your level moves up by itself from your daily Healthy Mix puzzles — there the topic is hidden, just like here.")}
          </span>
        </div>
        <Link className="lt-btn lt-btn-big" to="/dashboard?view=guide">{tr("Open my Training Path")} ›</Link>
      </section>
    </div>
  );
}

function Intro({ inProgress, onStart, starting, error }) {
  return (
    <div className="lt-card lt-intro">
      <div className="lt-hero-kicker">🧭 {tr("Nexus Guide")}</div>
      <h1 className="lt-intro-title">{tr("Let's find your level")}</h1>
      <p>{tr("Before the Nexus Guide gives you a plan, it needs to know where you are. You will solve 20 puzzles on 20 different topics.")}</p>
      <ul className="lt-list">
        <li>{tr("The topic is not shown — find the idea yourself, like in a real game.")}</li>
        <li>{tr("Solve one and the next gets harder. Miss one and the next gets easier.")}</li>
        <li>{tr("One try per puzzle, no hints, no clock. Take your time.")}</li>
        <li>{tr("Not sure? Press “I don't know” — guessing makes your level less accurate.")}</li>
        <li>{tr("Your puzzle rating does not change.")}</li>
      </ul>
      <p className="lt-muted">{tr("At the end you get your level (1 to 8), your weak topics, and a daily plan made for you. About 10 minutes.")}</p>
      {error && <div className="lt-error">{error}</div>}
      <button type="button" className="lt-btn lt-btn-big" onClick={onStart} disabled={starting}>
        {inProgress
          ? tr("Continue the test ({a}/{t})", { a: inProgress.answered, t: inProgress.total })
          : tr("Start the test")} ›
      </button>
    </div>
  );
}

export default function LevelTest() {
  const [info, setInfo] = useState(null);          // GET result
  const [phase, setPhase] = useState('loading');   // loading | intro | test | result
  const wrapRef = useRef(null);
  const [boardWidth, wide] = useBoardWidth(wrapRef, phase);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  // Test state
  const [q, setQ] = useState(null);                // { index, total, puzzle }
  const [fen, setFen] = useState('start');
  const [orientation, setOrientation] = useState('white');
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('solving'); // solving | right | wrong
  const [reveal, setReveal] = useState('');
  const [busy, setBusy] = useState(false);
  const chessRef = useRef(null);
  const idxRef = useRef(0);
  const startRef = useRef(0);
  const nextRef = useRef(null);                    // server reply to the answer
  const sentRef = useRef(false);

  const load = useCallback(() => {
    api.get('/api/training-assessment')
      .then((r) => { setInfo(r.data); setPhase(r.data.result ? 'result' : 'intro'); })
      .catch(() => { setError(tr('Could not load the level test. Please try again.')); setPhase('intro'); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const showPuzzle = useCallback((data) => {
    const g = new Chess(data.puzzle.fen);
    chessRef.current = g;
    idxRef.current = 0;
    nextRef.current = null;
    sentRef.current = false;
    setQ(data);
    setFen(g.fen());
    setOrientation(g.turn() === 'w' ? 'white' : 'black');
    const sm = data.puzzle.setupMove;
    setLastMove(sm && sm.from && sm.to ? { from: sm.from, to: sm.to } : null);
    setStatus('solving');
    setReveal('');
    setBusy(false);
    startRef.current = Date.now();
    setPhase('test');
  }, []);

  const start = async () => {
    setStarting(true); setError('');
    try {
      const r = await api.post('/api/training-assessment/start');
      showPuzzle(r.data);
    } catch (e) {
      // 409 = already done (e.g. finished in another tab): show the result.
      if (e?.response?.status === 409) load();
      else setError(tr('Could not start the test. Please try again.'));
    } finally { setStarting(false); }
  };

  // Record the answer straight away (so a reload cannot give a second try).
  const finish = useCallback(async (correct) => {
    if (sentRef.current || !q) return;
    sentRef.current = true;
    setStatus(correct ? 'right' : 'wrong');
    if (!correct) {
      const g = new Chess(chessRef.current.fen());
      const m = playSan(g, q.puzzle.solution[idxRef.current]);
      setReveal(m ? m.san : '');
    }
    try {
      const r = await api.post('/api/training-assessment/answer', {
        puzzleId: q.puzzle._id, correct, seconds: Math.round((Date.now() - startRef.current) / 1000),
      });
      nextRef.current = r.data;
    } catch {
      nextRef.current = { error: true };
    }
    setBusy(false);
  }, [q]);

  const onDrop = (from, to, promotion) => {
    if (status !== 'solving' || busy || !q) return false;
    const g = new Chess(chessRef.current.fen());
    let mv;
    try { mv = g.move({ from, to, promotion: promotion || 'q' }); } catch { return false; }
    if (!mv) return false;
    const sol = q.puzzle.solution || [];
    const i = idxRef.current;
    const good = normSan(mv.san) === normSan(sol[i]) || g.isCheckmate();
    chessRef.current = good ? g : chessRef.current;
    setFen(g.fen());
    setLastMove({ from: mv.from, to: mv.to });
    if (!good) { setBusy(true); finish(false); return true; }
    if (g.isCheckmate() || i + 1 >= sol.length) { setBusy(true); finish(true); return true; }
    // Opponent's reply from the line, then the player's turn again.
    setBusy(true);
    setTimeout(() => {
      const g2 = new Chess(chessRef.current.fen());
      const reply = playSan(g2, sol[i + 1]);
      if (!reply) { finish(true); return; }
      chessRef.current = g2;
      idxRef.current = i + 2;
      setFen(g2.fen());
      setLastMove({ from: reply.from, to: reply.to });
      if (i + 2 >= sol.length) finish(true); else setBusy(false);
    }, 450);
    return true;
  };

  const next = () => {
    const r = nextRef.current;
    if (!r || r.error) { setError(tr('Could not save your answer. Please try again.')); setPhase('intro'); load(); return; }
    if (r.done) {
      setInfo({ result: r.result, inProgress: null });
      setPhase('result');
      window.scrollTo(0, 0);
      return;
    }
    showPuzzle(r);
  };

  if (phase === 'loading') return <div className="lt-page"><div className="lt-muted">{tr("Loading…")}</div></div>;

  if (phase === 'result' && info?.result) {
    return (
      <div className="lt-page">
        <Result result={info.result} />
      </div>
    );
  }

  if (phase === 'intro' || !q) {
    return <div className="lt-page"><Intro inProgress={info?.inProgress} onStart={start} starting={starting} error={error} /></div>;
  }

  const pct = Math.round(((q.index - 1) / q.total) * 100);
  const side = orientation === 'white' ? tr('White') : tr('Black');
  const progress = (
    <div className="lt-progress">
      <span>{tr("Puzzle {i} of {t}", { i: q.index, t: q.total })}</span>
      <div className="lt-bar"><div className="lt-bar-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
  return (
    <div className="lt-page lt-test" ref={wrapRef}>
      {/* Phones: progress above the board; wide screens: in the side panel. */}
      {!wide && progress}
      <div className="lt-board" style={{ width: boardWidth }}>
        <Chessboard
          position={fen}
          orientation={orientation}
          boardWidth={boardWidth}
          resizable={false}
          draggable={status === 'solving' && !busy}
          lastMove={lastMove}
          onDrop={onDrop}
        />
      </div>
      <aside className="lt-side">
        {wide && <div className="lt-hero-kicker">🧭 {tr("Nexus Guide")}</div>}
        {wide && progress}
        <div className="lt-card lt-panel">
          {status === 'solving' && (
            <>
              <div className="lt-turn">
                <span className={`lt-turn-dot ${orientation}`} />
                {tr("{side} to move — find the best move.", { side })}
              </div>
              <button type="button" className="lt-btn lt-btn-ghost" onClick={() => { setBusy(true); finish(false); }} disabled={busy}>
                {tr("I don't know")}
              </button>
            </>
          )}
          {status === 'right' && <div className="lt-feedback good">✓ {tr("Correct!")}</div>}
          {status === 'wrong' && (
            <div className="lt-feedback bad">
              ✗ {tr("Not this time.")} {reveal && tr("The move was {m}.", { m: reveal })}
            </div>
          )}
          {status !== 'solving' && (
            <button type="button" className="lt-btn" onClick={next} disabled={busy}>
              {q.index >= q.total ? tr("See my level") : tr("Next puzzle")} ›
            </button>
          )}
        </div>
        <ul className="lt-rules">
          <li>{tr("One try per puzzle, no hints, no clock. Take your time.")}</li>
          <li>{tr("The topic is not shown — find the idea yourself, like in a real game.")}</li>
          <li>{tr("Your puzzle rating does not change.")}</li>
        </ul>
      </aside>
    </div>
  );
}
