// SingleGameAnalysis.jsx — /game/:type/:id
//
// One saved game (arena / friend / vs Stockfish), Lichess-style: header card,
// eval graph, and the GameReplay viewer. The game is reviewed automatically on
// open: the browser engine runs over every move (analyzeGame) and the result
// goes to GameReplay in the same shape the server-side pgnAnalyzer produces for
// "Analyze my games".
//
// The analysis is cached on this device per game — a finished game never
// changes, so re-opening it shows the analysis instantly.

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import api from '../api';
import GameReplay from '../components/GameReplay';
import GameReport from '../components/GameReport';
import AskCoach from '../components/AskCoach';
import { useAuth } from '../contexts/AuthContext';
import { analyzeGame } from '../components/masterGames/analyzeGame';
import { StockfishService } from '../services/stockfishService';
import './GameAnalysis.css';
import './SingleGameAnalysis.css';

const ANALYSIS_DEPTH = 12;
const CACHE_PREFIX = 'sga:v1:';

const TYPE_LABEL = { arena: 'Arena', friend: 'vs Friend', stockfish: 'vs Stockfish' };

const REASON_LABEL = {
  checkmate: 'Checkmate', resignation: 'Resignation', resign: 'Resignation',
  timeout: 'Time out', time: 'Time out', stalemate: 'Stalemate', agreement: 'Draw agreed',
  repetition: 'Threefold repetition', insufficient: 'Insufficient material',
  fifty_moves: '50-move rule', abandoned: 'Abandoned',
};
const reasonText = (r) => (r ? (REASON_LABEL[String(r).toLowerCase()] || r) : '');

function tcText(tc) {
  if (!tc || tc.minutes == null) return 'Unlimited';
  return `${tc.minutes}+${tc.increment || 0}`;
}

function resultScore(result) {
  if (result === 'white_won') return '1-0';
  if (result === 'black_won') return '0-1';
  if (result === 'draw') return '½-½';
  return '*';
}

// Lichess move accuracy from the win % the mover gave away.
const moveAccuracy = (drop) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));

function buildPgn(game) {
  const headers = [
    `[White "${(game.white || 'White').replace(/"/g, '')}"]`,
    `[Black "${(game.black || 'Black').replace(/"/g, '')}"]`,
    `[Result "${resultScore(game.result).replace('½-½', '1/2-1/2')}"]`,
  ];
  if (game.startFen) headers.push('[SetUp "1"]', `[FEN "${game.startFen}"]`);
  const c = game.startFen ? new Chess(game.startFen) : new Chess();
  const firstNo = c.moveNumber();
  const blackFirst = c.turn() === 'b';
  const parts = [];
  game.moves.forEach((san, i) => {
    const ply = i + (blackFirst ? 1 : 0);
    const no = firstNo + Math.floor(ply / 2);
    if (ply % 2 === 0) parts.push(`${no}.`);
    else if (i === 0) parts.push(`${no}...`);
    parts.push(san);
  });
  return `${headers.join('\n')}\n\n${parts.join(' ')}`;
}

// analyzeGame rows (White-POV win %) -> GameReplay moveAnalysis (mover POV,
// integer %, SAN best move), same wording as the server pgnAnalyzer.
function toMoveAnalysis(rows, startFen) {
  const c = startFen ? new Chess(startFen) : new Chess();
  const firstNo = c.moveNumber();
  const blackFirst = c.turn() === 'b';
  return rows.map((r, i) => {
    const ply = i + (blackFirst ? 1 : 0);
    // The played move as UCI, to tell "the engine's own choice" (★) apart from
    // merely "good". Same rule as GameReport: a mate with no engine move counts.
    let playedUci = null;
    try {
      const mv = c.move(r.san);
      playedUci = mv.from + mv.to + (mv.promotion || '');
    } catch { /* keep going — the replay just loses the ★ marks */ }
    const isBest = !r.classification && (r.bestUci ? r.bestUci === playedUci : /#$/.test(r.san));
    const side = r.side === 'b' ? 'black' : 'white';
    const mover = (w) => Math.round(side === 'white' ? w : 100 - w);
    const before = mover(r.winBefore);
    const after = mover(r.winAfter);
    const drop = Math.round(r.drop || 0);
    let bestMove = null;
    if (r.classification && r.bestUci && r.fenBefore) {
      try {
        const m = new Chess(r.fenBefore).move({ from: r.bestUci.slice(0, 2), to: r.bestUci.slice(2, 4), promotion: r.bestUci[4] || undefined });
        if (m && m.san !== r.san) bestMove = m.san;
      } catch { /* engine move not legal here — leave it out */ }
    }
    const label = r.classification === 'blunder' ? 'Blunder!' : r.classification === 'mistake' ? 'Mistake.' : 'Inaccuracy.';
    const explanation = r.classification
      ? `${label} Win chance dropped from ${before}% to ${after}% (−${drop}%).${bestMove ? ` Better was ${bestMove}.` : ''}`
      : null;
    return {
      moveNumber: firstNo + Math.floor(ply / 2),
      move: r.san,
      side,
      classification: r.classification || 'good',
      isBest,
      bestMove,
      // engine move as UCI — "Learn from your mistakes" checks answers against it
      bestUci: r.bestUci || null,
      winChanceBefore: before,
      winChanceAfter: after,
      winChanceDrop: drop,
      winChanceGain: 0,
      explanation,
      // kept for the eval graph / accuracy
      whiteWin: r.winAfter,
      drop: r.drop || 0,
    };
  });
}

function sideStats(ma, side) {
  const mine = ma.filter(m => m.side === side);
  if (!mine.length) return null;
  const acc = mine.reduce((s, m) => s + moveAccuracy(m.drop), 0) / mine.length;
  const count = (cls) => mine.filter(m => m.classification === cls).length;
  return { accuracy: Math.round(acc), inaccuracy: count('inaccuracy'), mistake: count('mistake'), blunder: count('blunder') };
}

// ── Eval graph: White win % per ply, click to jump ─────────────────────────
function EvalGraph({ points, cursor, onSeek }) {
  const W = 600, H = 140;
  const n = points.length;
  if (!n) return null;
  const x = (i) => (n === 1 ? W / 2 : (i / n) * W);
  const y = (w) => H - (w / 100) * H;
  const pts = [[0, y(50)], ...points.map((p, i) => [x(i + 1), y(p.whiteWin)])];
  const area = `M0,${H} ` + pts.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join(' ') + ` L${W},${H} Z`;
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');

  const handle = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(n, Math.round(frac * n))));
  };

  return (
    <svg className="sga-graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onClick={handle} role="img" aria-label="Evaluation graph — click to jump to a move">
      <rect x="0" y="0" width={W} height={H} className="sga-graph-bg" />
      <path d={area} className="sga-graph-area" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="sga-graph-mid" />
      <path d={line} className="sga-graph-line" />
      {points.map((p, i) => (p.classification === 'blunder' || p.classification === 'mistake') && (
        <circle key={i} cx={x(i + 1)} cy={y(p.whiteWin)} r="3.5" className={`sga-graph-dot sga-dot-${p.classification}`} />
      ))}
      {cursor != null && <line x1={x(cursor)} x2={x(cursor)} y1="0" y2={H} className="sga-graph-cursor" />}
    </svg>
  );
}

export default function SingleGameAnalysis() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const pov = query.get('pov');
  // ?ply=N opens the game at that move (links sent by "Ask my coach").
  const startPly = parseInt(query.get('ply'), 10);

  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(null);           // analyzeGame output (cached)
  const [progress, setProgress] = useState(null);   // {done,total} while running
  const [analysisError, setAnalysisError] = useState('');
  const [seek, setSeek] = useState(() => (startPly > 0 ? { ply: startPly, nonce: 1 } : { ply: null, nonce: 0 }));
  const [ply, setPly] = useState(0);
  const runRef = useRef(0);
  // The review gets its OWN engine: the shared one belongs to the board's live
  // Stockfish panel, and two searches on one worker break each other.
  const engineRef = useRef(null);
  const cacheKey = `${CACHE_PREFIX}${type}:${id}`;

  useEffect(() => {
    let alive = true;
    setGame(null); setError(''); setRows(null); setProgress(null); setAnalysisError('');
    api.get(`/api/user-games/game/${encodeURIComponent(type)}/${encodeURIComponent(id)}`)
      .then(({ data }) => {
        if (!alive) return;
        setGame(data.game);
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (Array.isArray(cached) && cached.length === data.game.moves.length) setRows(cached);
        } catch { /* ignore */ }
      })
      .catch((e) => { if (alive) setError(e.response?.status === 404 ? 'Game not found.' : 'Could not load this game.'); });
    return () => {
      alive = false;
      runRef.current++;
      if (engineRef.current) { engineRef.current.quit(); engineRef.current = null; }
    };
  }, [type, id, cacheKey]);

  const dropEngine = () => {
    if (engineRef.current) { engineRef.current.quit(); engineRef.current = null; }
  };
  useEffect(() => dropEngine, []);

  const runAnalysis = useCallback(async () => {
    if (!game || !game.moves.length) return;
    const run = ++runRef.current;
    setAnalysisError('');
    setProgress({ done: 0, total: game.moves.length });
    dropEngine();
    const engine = new StockfishService();
    engineRef.current = engine;
    try {
      const { analysis } = await analyzeGame(game.moves, {
        depth: ANALYSIS_DEPTH,
        engine,
        startFen: game.startFen || undefined,
        isCancelled: () => run !== runRef.current,
        onProgress: (done, total) => { if (run === runRef.current) setProgress({ done, total }); },
      });
      if (run !== runRef.current) return;
      // Only what the page needs — keeps the cached entry small.
      const slim = analysis.map(r => ({
        san: r.san, side: r.side, classification: r.classification, bestUci: r.bestUci,
        fenBefore: r.fenBefore, winBefore: r.winBefore, winAfter: r.winAfter, drop: r.drop,
      }));
      try { localStorage.setItem(cacheKey, JSON.stringify(slim)); } catch { /* storage full — fine */ }
      setRows(slim);
    } catch (e) {
      if (run === runRef.current && e?.message !== 'cancelled') setAnalysisError('Analysis failed. Please try again.');
    } finally {
      if (run === runRef.current) { setProgress(null); dropEngine(); }
    }
  }, [game, cacheKey]);

  // Review the game as soon as it opens (unless this device already has it) —
  // there is no button for it.
  const autoRanFor = useRef(null);
  useEffect(() => {
    if (!game || rows || game.moves.length < 2 || autoRanFor.current === cacheKey) return;
    autoRanFor.current = cacheKey;
    runAnalysis();
  }, [game, rows, cacheKey, runAnalysis]);

  // The viewer's own side when they played this game; otherwise the ?pov= hint
  // (e.g. a coach opening a student's game), else White.
  const { user } = useAuth();
  const myId = user ? String(user._id || user.id || '') : '';
  const mySide = !game || !myId ? null
    : String(game.whiteId) === myId ? 'white'
      : String(game.blackId) === myId ? 'black' : null;
  const playerSide = mySide || (pov === 'black' || pov === 'white' ? pov : 'white');
  const moveAnalysis = useMemo(() => (rows && game ? toMoveAnalysis(rows, game.startFen) : []), [rows, game]);
  const stats = useMemo(() => (moveAnalysis.length
    ? { white: sideStats(moveAnalysis, 'white'), black: sideStats(moveAnalysis, 'black') }
    : null), [moveAnalysis]);

  const replayGame = useMemo(() => {
    if (!game) return null;
    const mine = stats?.[playerSide];
    return {
      pgn: buildPgn(game),
      playerSide,
      moveAnalysis,
      accuracy: mine ? mine.accuracy : undefined,
      totalBlunders: mine ? mine.blunder : undefined,
      gameThemes: [],
    };
  }, [game, playerSide, moveAnalysis, stats]);

  const onPlyChange = useCallback((p) => setPly(p), []);
  const seekTo = useCallback((p) => setSeek(s => ({ ply: p, nonce: s.nonce + 1 })), []);
  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  }, [navigate]);

  if (error) {
    return (
      <div className="ga-page sga-page">
        <div className="sga-empty">
          <p>{error}</p>
          <button className="sga-btn" onClick={goBack}>← Back</button>
        </div>
      </div>
    );
  }
  if (!game) {
    return <div className="ga-page sga-page"><div className="sga-empty">Loading game…</div></div>;
  }

  const date = game.finishedAt ? new Date(game.finishedAt) : null;
  const typeLabel = game.type === 'arena' && game.tournamentName ? `Arena · ${game.tournamentName}` : TYPE_LABEL[game.type];
  const playerLink = (name, uid) => (uid && name
    ? <Link to={`/player/${encodeURIComponent(name)}`} className="sga-player-name">{name}</Link>
    : <span className="sga-player-name">{name}</span>);
  const ratingBit = (rating, change) => (
    <>
      {rating != null && <span className="sga-rating">{rating}</span>}
      {change != null && change !== 0 && (
        <span className={`sga-rchange ${change > 0 ? 'up' : 'down'}`}>{change > 0 ? `+${change}` : change}</span>
      )}
    </>
  );
  const sideRow = (side) => {
    const s = stats?.[side];
    return (
      <div className="sga-side">
        <span className={`sga-dot sga-dot-${side}`} />
        {playerLink(game[side], game[`${side}Id`])}
        {ratingBit(game[`${side}Rating`], game[`${side}RatingChange`])}
        {s && (
          <span className="sga-side-stats">
            <b>{s.accuracy}%</b> accuracy
            {s.inaccuracy > 0 && <span className="sga-c-inacc"> · {s.inaccuracy} ?!</span>}
            {s.mistake > 0 && <span className="sga-c-mist"> · {s.mistake} ?</span>}
            {s.blunder > 0 && <span className="sga-c-blun"> · {s.blunder} ??</span>}
          </span>
        )}
      </div>
    );
  };

  // Game info card — sits in the right column, under the moves + commentary cards.
  const infoCard = (
    <div className="sga-card">
        <div className="sga-meta">
          <span className={`sga-type sga-type-${game.type}`}>{typeLabel}</span>
          <span>{tcText(game.timeControl)}</span>
          {game.rated && <span>Rated</span>}
          {game.chess960 && <span>Chess960</span>}
          {date && <span>{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
        <div className="sga-players">
          {sideRow('white')}
          {sideRow('black')}
        </div>
        <div className="sga-result">
          <b>{resultScore(game.result)}</b>
          {reasonText(game.resultReason) && <span> · {reasonText(game.resultReason)}</span>}
          <span> · {game.moves.length} plies</span>
        </div>

        {progress && (
          <div className="sga-progress">
            <div className="sga-progress-bar"><div style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
            <span>Reviewing every move for blunders… {progress.done}/{progress.total}</span>
          </div>
        )}
        {analysisError && (
          <div className="sga-error">
            {analysisError}{' '}
            <button className="sga-btn" onClick={runAnalysis}>Try again</button>
          </div>
        )}
      </div>
  );
  const showGraph = !progress && rows && moveAnalysis.length > 0;

  return (
    <div className="ga-page sga-page">
      {/* Stays mounted during the review: the review runs on its own engine, and
          the move marks / accuracy appear here when it finishes. */}
      <GameReplay
        game={replayGame}
        totalGames={1}
        onClose={goBack}
        backLabel="Back"
        hideHeader
        seekPly={seek.ply}
        seekNonce={seek.nonce}
        onPlyChange={onPlyChange}
        belowBoard={showGraph && (
          <div className="sga-graph-box">
            <div className="sga-graph-head">
              <span className="sga-graph-title">📈 Advantage Graph</span>
              <span className="sga-graph-legend">
                <span className="sga-key sga-key-white" /> White
                <span className="sga-key sga-key-black" /> Black
              </span>
            </div>
            <EvalGraph points={moveAnalysis} cursor={ply} onSeek={seekTo} />
            <div className="sga-graph-hint">
              More white = White is better · more dark = Black is better · 🔴 blunder · 🟠 mistake · tap to jump to a move
            </div>
          </div>
        )}
        belowMoves={<>
          {infoCard}
          {/* Only for the people who played it — a coach viewing a student's
              game has nobody to "ask". */}
          {mySide && (
            <AskCoach game={game} gameType={type} gameId={id} mySide={mySide} ply={ply} moveAnalysis={moveAnalysis} />
          )}
        </>}
        practiceEnabled={!!showGraph}
        belowAll={showGraph && (
          <GameReport
            key={`${cacheKey}:${playerSide}`}
            rows={rows}
            startFen={game.startFen || null}
            names={{ white: game.white, black: game.black }}
            mySide={playerSide}
            isMe={!!mySide}
          />
        )}
      />
    </div>
  );
}
