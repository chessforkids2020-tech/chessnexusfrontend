// src/pages/BlunderHunt.jsx
//
// "Find the Blunder" — the admin blunder library, opened up to every player.
//
// The library (144 curated master games, 244 verified blunders) used to be
// coach-only: a coach copied a set into an assignment and only their students
// ever saw it. This page gives the same content to anyone, no coach required.
//
// Flow: pick a level → play a game → type the losing move(s) → submit → get
// graded → the board turns into a free analysis board with Stockfish, exactly
// like HealthyMix after a puzzle ends → Next game.
//
// The engine is deliberately NOT rendered until the game is graded, so it can
// never be used as a hint. Same rule HealthyMix follows.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import api from '../api';
import Chessboard from '../components/Chessboard';
import EnginePanel from '../components/EnginePanel';
import './BlunderHunt.css';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const LEVEL_ICON = {
  beginner: '🌱',
  adv_beginner: '🌿',
  intermediate: '🔥',
  advanced: '👑',
};

export default function BlunderHunt() {
  // ── Level picker ──
  const [levels, setLevels] = useState(null);
  const [level, setLevel] = useState(null);      // the chosen level row

  // ── Games for the chosen level ──
  const [games, setGames] = useState([]);
  const [gi, setGi] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ── Play state ──
  const [ply, setPly] = useState(0);
  const [answers, setAnswers] = useState([]);    // one string per blunder
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);    // { foundCount, findTarget, passed, blunders, xpAwarded }

  // ── Post-grading analysis ──
  // `line` holds moves the user plays on the board AFTER grading. The board is
  // read-only until then, so this stays empty during the hunt.
  const [line, setLine] = useState([]);
  const [engineOn, setEngineOn] = useState(false);

  // Board size follows the viewport so the board stays the anchor of the
  // layout without pushing the page into scroll. Purely presentational.
  const [boardWidth, setBoardWidth] = useState(560);
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Board is the anchor of the page, so give it as much room as the
      // viewport allows: ~440px reserved for the right column, and only 110px
      // of vertical chrome — the title bar moved into the right column, so the
      // left column is the board plus its playback bar and nothing else.
      const byWidth = w > 1080 ? Math.min(760, w - 440) : Math.min(620, w - 40);
      setBoardWidth(Math.max(300, Math.min(byWidth, h - 110)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const game = games[gi] || null;
  const graded = !!result;

  useEffect(() => {
    api.get('/api/blunder-library/public/levels')
      .then(r => setLevels(r.data?.levels || []))
      .catch(() => setLevels([]));
  }, []);

  const openLevel = useCallback((lv) => {
    setLevel(lv); setLoading(true); setErr('');
    api.get('/api/blunder-library/public/games', { params: { tag: lv.tag } })
      .then(r => {
        const list = r.data?.games || [];
        setGames(list);
        // Start on the first unsolved game so a returning player carries on
        // rather than replaying what they already finished.
        const firstUnsolved = list.findIndex(g => !g.solved);
        setGi(firstUnsolved >= 0 ? firstUnsolved : 0);
      })
      .catch(() => setErr('Could not load games.'))
      .finally(() => setLoading(false));
  }, []);

  // Reset everything when the game changes.
  useEffect(() => {
    setPly(0); setResult(null); setLine([]); setEngineOn(false);
    setAnswers(Array.from({ length: game?.blunderCount || 1 }, () => ''));
  }, [gi, game?.blunderCount, game?.setId]);

  // Parse the PGN into FENs + SAN, the same way the coach-assignment player does.
  const parsed = useMemo(() => {
    if (!game?.pgn) return { fens: [START_FEN], sans: [] };
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const history = chess.history();
      const replay = new Chess();
      const fens = [replay.fen()];
      const sans = [];
      for (const san of history) { replay.move(san); sans.push(san); fens.push(replay.fen()); }
      return { fens, sans };
    } catch { return { fens: [START_FEN], sans: [] }; }
  }, [game]);

  const maxPly = parsed.sans.length;
  // After grading the user can branch off; `line` holds that branch.
  const baseFen = parsed.fens[ply] || START_FEN;
  const displayFen = useMemo(() => {
    if (!line.length) return baseFen;
    try {
      const c = new Chess(baseFen);
      for (const m of line) c.move(m);
      return c.fen();
    } catch { return baseFen; }
  }, [baseFen, line]);

  // Which plies were blunders — known only after grading.
  const blunderPlies = useMemo(() => {
    if (!result?.blunders) return new Map();
    const map = new Map();
    for (const b of result.blunders) {
      const idx = parsed.sans.findIndex((san, i) => san === b.move && !map.has(i));
      if (idx >= 0) map.set(idx, b);
    }
    return map;
  }, [result, parsed.sans]);

  const goTo = useCallback((p) => {
    setPly(prev => {
      const next = typeof p === 'function' ? p(prev) : p;
      return Math.max(0, Math.min(maxPly, next));
    });
    setLine([]);
  }, [maxPly]);

  // Arrow keys step through the game — ← / → a move, ↑ / ↓ to the ends.
  // Ignored while the user is typing an answer, otherwise pressing ← to correct
  // a typo would jump the board instead of moving the text cursor.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); goTo(p => p - 1); break;
        case 'ArrowRight': e.preventDefault(); goTo(p => p + 1); break;
        case 'ArrowUp':    e.preventDefault(); goTo(0); break;
        case 'ArrowDown':  e.preventDefault(); goTo(maxPly); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, maxPly]);

  // Free analysis board — only once graded. Mirrors HealthyMix: any legal move
  // for either side is accepted so the player can explore what should have been
  // played instead.
  const onDrop = (from, to, promotion) => {
    if (!graded) return false;
    try {
      const c = new Chess(displayFen);
      const mv = c.move({ from, to, promotion: promotion || 'q' });
      if (!mv) return false;
      setLine(prev => [...prev, mv.san]);
      return true;
    } catch { return false; }
  };

  const submit = async () => {
    if (!game || submitting) return;
    setSubmitting(true); setErr('');
    try {
      const res = await api.post(
        `/api/blunder-library/public/${game.setId}/games/${game.gameIndex}/submit`,
        { moves: answers }
      );
      setResult(res.data);
      // Mark solved locally so the list badge updates without a refetch.
      if (res.data?.passed) {
        setGames(prev => prev.map((g, i) => (i === gi ? { ...g, solved: true } : g)));
      }
    } catch {
      setErr('Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextGame = () => { if (gi < games.length - 1) setGi(gi + 1); };

  // ── LEVEL PICKER ──
  if (!level) {
    return (
      <div className="bh-page">
        <div className="bh-header">
          <div className="bh-head-main">
          <h1 className="bh-title">🔎 Find the Blunder</h1>
          <p className="bh-sub">
            Real master games with real mistakes. Step through the game, spot the losing
            move, and see what should have been played instead.
          </p>
          </div>
        </div>

        {levels === null && <div className="bh-empty">Loading levels…</div>}
        {levels?.length === 0 && <div className="bh-empty">No games available yet.</div>}

        <div className="bh-levels">
          {(levels || []).map(lv => (
            <button key={lv.tag} type="button" className="bh-level" onClick={() => openLevel(lv)}>
              <span className="bh-level-icon">{LEVEL_ICON[lv.tag] || '♟️'}</span>
              <span className="bh-level-body">
                <span className="bh-level-name">{lv.label}</span>
                <span className="bh-level-meta">
                  {lv.games} game{lv.games === 1 ? '' : 's'} · {lv.blunders} blunder{lv.blunders === 1 ? '' : 's'}
                </span>
                {lv.solved > 0 && (
                  <span className="bh-level-progress">✓ {lv.solved} of {lv.games} solved</span>
                )}
              </span>
              <span className="bh-level-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── PLAYER ──
  return (
    <div className="bh-page">
      {/* Single-line bar. This used to be a tall card with the level on one row
          and "Game N of M · White vs Black" wrapped underneath, which took more
          vertical space than it earned and pushed the board down. Everything
          now sits on one row, with the game title free to shrink. */}
      {loading && <div className="bh-empty">Loading games…</div>}
      {/* The title bar (with its ← button) lives inside the right column, which
          only renders when there IS a game — so the empty state needs its own
          way back, or the user is stranded on this level. */}
      {!loading && !game && (
        <div className="bh-empty">
          No games in this level yet.
          <div style={{ marginTop: 14 }}>
            <button type="button" className="bh-back" onClick={() => { setLevel(null); setGames([]); }}>
              ← Back to levels
            </button>
          </div>
        </div>
      )}

      {game && (
        <div className="bh-body">
          {/* ── LEFT: board ── */}
          <div className="bh-left">
            {/* Pieces are locked until the game is graded — the board is for
                reading the game, not playing it, while the hunt is on. */}
            <div className="bh-board-wrap">
              <Chessboard
                position={displayFen}
                onDrop={onDrop}
                boardWidth={boardWidth}
                draggable={graded}
              />
            </div>

            <div className="bh-nav">
              <button type="button" onClick={() => goTo(0)} disabled={ply === 0}>⏮</button>
              <button type="button" onClick={() => goTo(ply - 1)} disabled={ply === 0}>◀</button>
              <span className="bh-ply">
                {line.length > 0
                  ? `analysis +${line.length}`
                  : `${ply} / ${maxPly}${ply > 0 ? ` · ${parsed.sans[ply - 1]}` : ''}`}
              </span>
              <button type="button" onClick={() => goTo(ply + 1)} disabled={ply >= maxPly}>▶</button>
              <button type="button" onClick={() => goTo(maxPly)} disabled={ply >= maxPly}>⏭</button>
              <span className="bh-keys" title="Arrow keys step through the game">← →</span>
            </div>

            {graded && (
              <div className="bh-hint">
                Free analysis — drag any piece to explore. Use ◀ ▶ to return to the game.
              </div>
            )}

            {/* Engine appears ONLY after grading, so it cannot be used as a hint. */}
            {graded && (
              <EnginePanel
                fen={displayFen}
                enabled={engineOn}
                onToggle={() => setEngineOn(v => !v)}
                numLines={3}
              />
            )}
          </div>

          {/* ── RIGHT: moves + answers ── */}
          <div className="bh-right">
            {/* Title bar lives in the RIGHT column, not spanning the page. The
                left column is now nothing but the board and its playback bar,
                so the board reads as the single focus of the page. */}
            <div className="bh-header bh-header--row">
              <button type="button" className="bh-back" onClick={() => { setLevel(null); setGames([]); }}>
                ←
              </button>
              <h1 className="bh-title">🔎 {level.label}</h1>
              <span className="bh-head-count">{gi + 1}/{games.length}</span>
              {game.title && <span className="bh-head-game">{game.title}</span>}
            </div>

            <div className="bh-moves">
              {parsed.sans.map((san, i) => {
                const b = blunderPlies.get(i);
                const isWhite = i % 2 === 0;
                return (
                  <React.Fragment key={i}>
                    {isWhite && <span className="bh-movenum">{Math.floor(i / 2) + 1}.</span>}
                    <button
                      type="button"
                      className={`bh-move${ply === i + 1 ? ' on' : ''}${b ? ' blunder' : ''}`}
                      onClick={() => goTo(i + 1)}
                      title={b ? `${b.move} → ${b.betterMove}` : undefined}
                    >
                      {san}{b ? ' ??' : ''}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {!graded ? (
              <div className="bh-answers">
                {/* Naming the side is the point of the side migration: every
                    game now records ONE player's blunders, so asking the
                    student to scan both was asking for work with no answer.
                    `side` is absent only on legacy rows, where the old wording
                    still applies. */}
                <div className="bh-answers-label">
                  {game.side ? (
                    <>
                      Find <strong>{game.side === 'w' ? "White's" : "Black's"}</strong>{' '}
                      {game.blunderCount} blunder{game.blunderCount === 1 ? '' : 's'} —
                      type the move{game.blunderCount === 1 ? '' : 's'} that threw the game away.
                    </>
                  ) : (
                    <>
                      Find {game.blunderCount} blunder{game.blunderCount === 1 ? '' : 's'} —
                      type the move{game.blunderCount === 1 ? '' : 's'} that threw the game away.
                    </>
                  )}
                </div>
                {/* Grid, not a stack. A move is 3-5 characters, so a full-width
                    box per answer wasted most of the row on desktop. The grid
                    packs 2-3 per row and collapses to one on phones. */}
                <div className="bh-inputs">
                  {answers.map((v, i) => (
                    <label key={i} className="bh-input-wrap">
                      <span className="bh-input-n">{i + 1}</span>
                      <input
                        className="bh-input"
                        value={v}
                        placeholder="Qh5"
                        maxLength={10}
                        onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    </label>
                  ))}
                </div>
                {err && <div className="bh-err">{err}</div>}
                <button
                  type="button"
                  className="bh-submit"
                  onClick={submit}
                  disabled={submitting || answers.every(a => !a.trim())}
                >
                  {submitting ? 'Checking…' : 'Submit'}
                </button>
              </div>
            ) : (
              <div className="bh-result">
                <div className={`bh-result-head ${result.passed ? 'ok' : 'no'}`}>
                  {result.passed ? '🎉 Correct!' : '🔍 Not quite'}
                  <span className="bh-result-score">
                    {result.foundCount} of {result.findTarget} found
                  </span>
                </div>
                {result.xpAwarded > 0 && (
                  <div className="bh-xp">+{result.xpAwarded} XP</div>
                )}
                <div className="bh-answers-label">The blunders</div>
                {result.blunders.map((b, i) => (
                  <div key={i} className="bh-reveal">
                    <span className="bh-reveal-move">{b.moveNumber}. {b.move}</span>
                    {b.betterMove && <span className="bh-reveal-better">→ {b.betterMove}</span>}
                    {b.explanation && <div className="bh-reveal-why">{b.explanation}</div>}
                  </div>
                ))}
                <button
                  type="button"
                  className="bh-submit"
                  onClick={nextGame}
                  disabled={gi >= games.length - 1}
                >
                  {gi >= games.length - 1 ? 'Last game in this level' : 'Next game →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
