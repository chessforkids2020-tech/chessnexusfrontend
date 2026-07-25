import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AcademyStage from '../AcademyStage';
import StarBoard from './StarBoard';
import { useNarration } from '../useNarration';
import { usePieceTrainer } from './usePieceTrainer';
import { PIECES, PIECE_META, LESSONS, buildFen } from './pieceMovementData';
import { pieceTargets } from './pieceMoves';
import api from '../../../../api';
import '../beginners.css';

const ARROW_COLOR = 'rgba(34,211,238,0.9)';

// Board fills the left column: viewport width minus the 300px coach rail + gaps/padding,
// capped to a comfy range. Re-computed on resize.
function useBoardWidth() {
  const [w, setW] = useState(() => calc());
  function calc() {
    if (typeof window === 'undefined') return 480;
    const vw = window.innerWidth;
    if (vw <= 820) return Math.min(560, vw - 40);        // stacked layout
    return Math.max(360, Math.min(680, vw - 300 - 24 - 64)); // minus rail, gap, page padding
  }
  useEffect(() => {
    const on = () => setW(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

export default function PieceMovements({ progress, onBack, onLevelDone }) {
  const pieces = progress?.pieces || {};
  const [pieceId, setPieceId] = useState(null);
  const boardWidth = useBoardWidth();

  const unlockedIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < PIECES.length; i++) { if (pieces[PIECES[i]]?.completed) idx = i + 1; else break; }
    return idx;
  }, [pieces]);

  if (!pieceId) {
    return (
      <div>
        <button type="button" className="ba-back" onClick={onBack}>← Back to Academy</button>
        <h2 className="ba-title" style={{ fontSize: 22 }}>♟️ Piece Movements</h2>
        <p className="ba-sub">Learn each piece, one at a time. Finish one to unlock the next!</p>
        <div className="ba-pieces">
          {PIECES.map((id, i) => {
            const meta = PIECE_META[id];
            const done = pieces[id]?.completed;
            const locked = i > unlockedIdx;
            return (
              <div key={id} className={`ba-piece ${locked ? 'ba-locked' : ''}`}
                onClick={() => { if (!locked) setPieceId(id); }}>
                {done && <span className="ba-piece-done">🏅</span>}
                {locked && <span className="ba-piece-done">🔒</span>}
                <div className="ba-piece-glyph">{meta.glyph}</div>
                <div className="ba-piece-name">{meta.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <PieceLesson
      key={pieceId}
      pieceId={pieceId}
      boardWidth={boardWidth}
      alreadyDoneLevels={pieces[pieceId]?.lessonsDone || []}
      onBackToPieces={() => setPieceId(null)}
      onLevelDone={onLevelDone}
    />
  );
}

// A short "watch me catch the stars" demo: the piece hops onto each demo star in turn.
function useDemo(pieceId, letter, lesson, active) {
  const [demoSquare, setDemoSquare] = useState(lesson.start);
  const [demoStars, setDemoStars] = useState(lesson.demoStars || []);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const run = useCallback(() => {
    clear();
    setDemoSquare(lesson.start);
    setDemoStars(lesson.demoStars || []);
    // Build a path from start to each demo star using the same reachability the game uses.
    const path = buildDemoPath(letter, lesson.start, lesson.demoStars || []);
    let t = 700;
    path.forEach((sq) => {
      timers.current.push(setTimeout(() => {
        setDemoSquare(sq);
        setDemoStars((prev) => prev.filter((s) => s !== sq));
      }, t));
      t += 750;
    });
  }, [letter, lesson]);

  useEffect(() => { if (active) run(); return clear; }, [active, run]);
  return { demoSquare, demoStars, replayDemo: run };
}

// BFS a path that visits every demo star (empty board, single piece).
function buildDemoPath(letter, start, stars) {
  const need = new Set(stars);
  const key = (sq, set) => sq + '|' + [...set].sort().join(',');
  const startKey = key(start, need);
  const prev = new Map(); // stateKey -> { from, sq }
  const q = [[start, new Set(need)]];
  const seen = new Set([startKey]);
  while (q.length) {
    const [sq, set] = q.shift();
    if (set.size === 0) {
      // reconstruct
      const path = [];
      let k = key(sq, set);
      while (k !== startKey) { const p = prev.get(k); if (!p) break; path.unshift(p.sq); k = p.from; }
      return path;
    }
    for (const to of pieceTargets(letter, sq, true)) {
      const ns = new Set(set); if (ns.has(to)) ns.delete(to);
      const k = key(to, ns);
      if (!seen.has(k)) { seen.add(k); prev.set(k, { from: key(sq, set), sq: to }); q.push([to, ns]); }
    }
  }
  return [];
}

function PieceLesson({ pieceId, boardWidth, alreadyDoneLevels, onBackToPieces, onLevelDone }) {
  const meta = PIECE_META[pieceId];
  const lesson = LESSONS[pieceId];
  const narration = useNarration();
  const [phase, setPhase] = useState('teach'); // 'teach' | 'practice'
  const [level, setLevel] = useState(0);

  const [teachArrows, setTeachArrows] = useState([]);
  const demo = useDemo(pieceId, meta.letter, lesson, phase === 'teach');

  const levelData = lesson.levels[level];
  const trainer = usePieceTrainer(levelData, meta.letter);

  // TEACH narration (arrows sync to the spoken lines; last line kicks off the star demo).
  useEffect(() => {
    if (phase !== 'teach') return;
    setTeachArrows([]);
    const script = lesson.teach.map((step, i) => ({
      text: step.text,
      onStart: () => {
        setTeachArrows((step.arrows || []).map(a => ({ ...a, color: ARROW_COLOR })));
        if (i === lesson.teach.length - 1) demo.replayDemo(); // "watch me catch the stars"
      },
    }));
    narration.play(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pieceId]);

  useEffect(() => {
    if (phase !== 'practice') return;
    narration.play([{ text: level === 0
      ? `Now you try! Move the ${meta.name} to catch every star.`
      : `Level ${level + 1}. Catch all the stars with the ${meta.name}.` }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, level, pieceId]);

  const [savedLevels, setSavedLevels] = useState(() => new Set(alreadyDoneLevels));
  useEffect(() => {
    if (phase !== 'practice' || !trainer.done) return;
    const par = trainer.par ?? 99;
    const good = trainer.moves <= par;
    narration.play([{ text: good
      ? `Wow, you did it! ${trainer.moves} move${trainer.moves === 1 ? '' : 's'} — nicely done! 🌟`
      : `You caught them all! But you can do it in fewer moves — try to find the quickest path next time.` }]);
    const levelId = `${pieceId}-${level + 1}`;
    if (!savedLevels.has(levelId)) {
      setSavedLevels((s) => new Set(s).add(levelId));
      api.post(`/api/beginners-academy/piece/${pieceId}/level`, { level: level + 1, moves: trainer.moves })
        .then((r) => { onLevelDone && onLevelDone(r.data); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainer.done]);

  const onDrop = useCallback((from, to) => !!trainer.tryMove(from, to), [trainer]);
  const isLastLevel = level >= lesson.levels.length - 1;

  // ── TEACH view — board LEFT; title + coach + buttons RIGHT ──
  if (phase === 'teach') {
    return (
      <AcademyStage
        narration={narration}
        title={<>{meta.glyph} How the {meta.name} moves</>}
        actions={<>
          <button className="ba-ghost" onClick={() => demo.replayDemo()}>↻ Watch again</button>
          <button className="ba-primary" onClick={() => { narration.stop(); setPhase('practice'); setLevel(0); }}>
            I'm ready — let me try! ▶
          </button>
          <button className="ba-ghost" onClick={onBackToPieces}>← Pieces</button>
        </>}
      >
        <StarBoard
          position={buildFen(meta.letter, demo.demoSquare)}
          boardWidth={boardWidth}
          draggable={false}
          arrows={teachArrows}
          stars={demo.demoStars}
        />
      </AcademyStage>
    );
  }

  // ── PRACTICE view — board LEFT; title + coach + HUD/actions RIGHT ──
  return (
    <AcademyStage
      narration={narration}
      title={<>{meta.glyph} Catch the stars — Level {level + 1}</>}
      actions={<>
        <div className="ba-levels">
          {lesson.levels.map((_, i) => (
            <span key={i} className={`ba-level-dot ${i < level ? 'on' : ''} ${i === level ? 'cur' : ''}`}>{i + 1}</span>
          ))}
        </div>
        {!trainer.done ? (
          <>
            <div className="ba-hud">
              <span className="ba-hud-stars">⭐ {trainer.remainingStars.length} left</span>
              <span>👣 {trainer.moves} moves</span>
              <span>⏱ {trainer.seconds}s</span>
            </div>
            <button className="ba-ghost" onClick={trainer.reset}>↻ Restart</button>
            <button className="ba-ghost" onClick={() => { narration.stop(); setPhase('teach'); }}>← Watch again</button>
          </>
        ) : (
          <div className="ba-win">
            <div className="ba-win-emoji">🎉</div>
            <div className="ba-win-title">All stars caught!</div>
            <div className="ba-win-note">{trainer.moves} moves{trainer.par != null ? ` · target ${trainer.par}` : ''}</div>
            {isLastLevel
              ? <button className="ba-primary" onClick={onBackToPieces}>🏅 {meta.name} complete — back</button>
              : <button className="ba-primary" onClick={() => setLevel((l) => l + 1)}>Next level ▶</button>}
          </div>
        )}
      </>}
    >
      <StarBoard
        position={trainer.fen}
        boardWidth={boardWidth}
        draggable={!trainer.done}
        onDrop={onDrop}
        stars={trainer.remainingStars}
        dots={trainer.done ? [] : trainer.legalTargets}
      />
    </AcademyStage>
  );
}
