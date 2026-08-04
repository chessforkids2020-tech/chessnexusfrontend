// src/components/coach/AssignmentReview.jsx
//
// "Show assignment" — the board view a coach needs to actually review work.
//
// The results table already told a coach WHETHER a student finished (1✓, 100%),
// but not WHICH position it was or WHAT the student played. Every one of those
// facts was already stored (fenTask.positions, pgnTask.games,
// completions[].fenResults[].moves, completions[].submissionHistory) — it was
// simply never rendered. So this is a display over existing data, not new
// capture.
//
// Layout, as asked: board on the LEFT, students on the RIGHT, the assigned
// positions/games listed under the board. Clicking a student shows their answer
// for the selected position, with every attempt.
//
// Only for the two types where a board means anything — 'fen_solution' (Play vs
// Stockfish, which class homework also uses) and 'custom' (find the blunders).
import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../Chessboard';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function AssignmentReview({ assignment, onClose }) {
  const a = assignment;
  const isBlunder = a?.assignmentType === 'custom';
  const isFen = a?.assignmentType === 'fen_solution';
  // Puzzle assignments: the items are whatever puzzles the STUDENT was served,
  // so unlike the other two types the list depends on which student is selected.
  const isPuzzle = a?.assignmentType === 'puzzle_topic';

  const [itemIdx, setItemIdx] = useState(0);
  const [studentId, setStudentId] = useState(null);
  // Ply the board is showing while stepping through a student's answer.
  const [ply, setPly] = useState(0);

  const completions = a?.completions || [];
  const student = completions.find(c => String(c.studentId) === String(studentId)) || null;

  // The items a coach assigned: FEN positions, or whole games for blunder hunts.
  // For PUZZLE assignments there is no fixed list — each student is served
  // different puzzles — so the items come from the selected student's results.
  const items = useMemo(() => {
    if (isFen) return (a.fenTask?.positions || []).map((p, i) => ({
      kind: 'fen', idx: i, fen: p.fen, tag: p.tag,
      label: p.tag || `Position ${i + 1}`,
      moveCount: p.userMoveCount,
    }));
    if (isBlunder) return (a.pgnTask?.games || []).map((g, i) => ({
      kind: 'game', idx: i, pgn: g.pgn, blunders: g.blunders || [],
      label: g.title || `Game ${i + 1}`,
    }));
    if (isPuzzle) return (student?.puzzleResults || []).map((r, i) => ({
      kind: 'puzzle', idx: i, fen: r.fen,
      label: `${r.solved ? '✅' : '❌'} Puzzle ${i + 1}`,
      attempts: r.attempts || [],
      solution: r.solution || [],
      solved: !!r.solved,
    }));
    return [];
  }, [a, isFen, isBlunder, isPuzzle, student]);

  const item = items[itemIdx] || null;

  useEffect(() => { setPly(0); }, [itemIdx, studentId]);

  // The move list to replay: the student's answer for this position, or (with no
  // student picked) the game itself for a blunder hunt.
  const line = useMemo(() => {
    if (!item) return [];
    if (item.kind === 'fen') {
      const r = student?.fenResults?.[item.idx];
      return r?.moves || [];
    }
    // Blunder game: replay the PGN so the coach can see the position in question.
    try {
      const c = new Chess();
      c.loadPgn(item.pgn);
      return c.history();
    } catch { return []; }
  }, [item, student]);

  // Walk the line to the current ply and hand the FEN to the board.
  //
  // IMPORTANT for Play-vs-Stockfish: fenResults[].moves holds ONLY the student's
  // moves — the engine's replies in between were never stored. So a move after
  // the first is illegal from the resulting position and a naive replay silently
  // stalls on move 1. Instead, each student move is shown FROM THE STARTING
  // POSITION: "here is the position, here is the move they chose". That is what a
  // coach is actually judging, and it is honest about the data we have.
  const { fen, lastSan, replayable } = useMemo(() => {
    if (item?.kind === 'puzzle') {
      // Puzzle items are a single position — no line to step through.
      return { fen: item.fen || START_FEN, lastSan: '', replayable: false };
    }
    if (item?.kind === 'fen') {
      const base = item.fen || START_FEN;
      if (ply === 0) return { fen: base, lastSan: '', replayable: false };
      let c;
      try { c = new Chess(base); } catch { return { fen: START_FEN, lastSan: '', replayable: false }; }
      let san = '';
      try { const m = c.move(line[ply - 1], { sloppy: true }); san = m ? m.san : ''; }
      catch { /* not legal from the start — show the start position */ }
      return { fen: san ? c.fen() : base, lastSan: san, replayable: false };
    }
    // Blunder games ARE a full legal line, so they replay properly.
    let c;
    try { c = new Chess(START_FEN); } catch { return { fen: START_FEN, lastSan: '', replayable: true }; }
    let san = '';
    for (let i = 0; i < ply && i < line.length; i++) {
      try { const m = c.move(line[i], { sloppy: true }); san = m ? m.san : san; }
      catch { break; }
    }
    return { fen: c.fen(), lastSan: san, replayable: true };
  }, [item, line, ply]);

  if (!a) return null;

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <div style={{ minWidth: 0 }}>
            <div style={S.title}>{a.title}</div>
            <div style={S.sub}>
              {isFen ? '♟️ Play vs Stockfish' : isPuzzle ? '🧩 Puzzles' : '🔎 Find the blunders'}
              {' · '}{items.length}{' '}
              {isFen ? 'position(s)' : isPuzzle ? 'puzzle(s)' : 'game(s)'}
            </div>
          </div>
          <button style={S.close} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={S.body}>
          {/* ── LEFT: board + the assigned items ── */}
          <div style={S.left}>
            <Chessboard position={fen} boardWidth={360} />

            {/* Replay controls — only meaningful once there are moves to step. */}
            {line.length > 0 && (
              <div style={S.nav}>
                <button style={S.navBtn} onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
                <button style={S.navBtn} onClick={() => setPly(p => Math.max(0, p - 1))} disabled={ply === 0}>◀</button>
                <span style={S.navInfo}>
                  {ply === 0
                    ? (replayable ? 'Start' : 'Position')
                    : `${replayable ? '' : 'Move '}${ply}. ${lastSan}`}
                  <span style={{ opacity: .5 }}> / {line.length}</span>
                </span>
                <button style={S.navBtn} onClick={() => setPly(p => Math.min(line.length, p + 1))} disabled={ply >= line.length}>▶</button>
                <button style={S.navBtn} onClick={() => setPly(line.length)} disabled={ply >= line.length}>⏭</button>
              </div>
            )}

            {!replayable && line.length > 1 && (
              <div style={{ ...S.muted, textAlign: 'center', marginTop: 6, fontSize: 11 }}>
                Each move is shown from the starting position — the engine's replies
                in between aren't recorded.
              </div>
            )}

            {/* What the coach assigned — the second thing that was missing. */}
            <div style={S.itemsWrap}>
              <div style={S.itemsHead}>What you assigned</div>
              <div style={S.items}>
                {items.map((it, i) => (
                  <button
                    key={i}
                    style={{ ...S.item, ...(i === itemIdx ? S.itemOn : {}) }}
                    onClick={() => setItemIdx(i)}
                  >
                    {it.label}
                    {it.kind === 'fen' && it.moveCount === 0 && <span style={S.itemHint}> · play to the end</span>}
                    {it.kind === 'game' && <span style={S.itemHint}> · {it.blunders.length} blunder(s)</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: students, and the picked student's answer ── */}
          <div style={S.right}>
            <div style={S.itemsHead}>Students</div>
            <div style={S.students}>
              {completions.map(c => {
                const done = c.status === 'completed';
                const on = String(c.studentId) === String(studentId);
                return (
                  <button
                    key={c.studentId}
                    style={{ ...S.student, ...(on ? S.studentOn : {}) }}
                    onClick={() => setStudentId(on ? null : c.studentId)}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.studentName || 'Student'}
                    </span>
                    <span style={{ color: done ? '#6ee7b7' : '#94a3b8', fontSize: 11, flex: '0 0 auto' }}>
                      {done ? '✓' : '·'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={S.answer}>
              {!student ? (
                <div style={S.muted}>Pick a student to see what they played.</div>
              ) : isPuzzle ? (
                <PuzzleAnswer item={item} />
              ) : isFen ? (
                <FenAnswer student={student} item={item} onJump={setPly} ply={ply} />
              ) : (
                <BlunderAnswer student={student} item={item} allItems={items} gameIndex={itemIdx} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Play vs Stockfish: the moves this student played on THIS position ────────
function FenAnswer({ student, item, onJump, ply }) {
  if (!item) return null;
  const r = student.fenResults?.[item.idx];
  if (!r) return <div style={S.muted}>{student.studentName} hasn't attempted this position yet.</div>;
  const moves = r.moves || [];
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={r.passed ? S.pillOk : S.pillNo}>{r.passed ? '✓ Solved' : '✗ Missed'}</span>
        {!r.passed && r.engineBestMove && (
          <span style={S.muted}> · engine wanted <b style={{ color: '#e6e8ee' }}>{r.engineBestMove}</b></span>
        )}
      </div>
      {moves.length === 0 ? (
        <div style={S.muted}>No moves recorded.</div>
      ) : (
        <>
          <div style={S.answerHead}>Their moves — click to jump</div>
          <div style={S.moveRow}>
            {moves.map((m, i) => (
              <button key={i} style={{ ...S.move, ...(ply === i + 1 ? S.moveOn : {}) }} onClick={() => onJump(i + 1)}>
                {i + 1}. {m}
              </button>
            ))}
          </div>
        </>
      )}
      <div style={{ ...S.muted, marginTop: 10 }}>
        Runs: {student.fenRuns || 1} · overall {student.fenSolved || 0}/{student.fenTotal || 0}
      </div>
    </div>
  );
}

// ── Find the blunders: every attempt this student made ───────────────────────
//
// Two things here have to match the backend (routes/coach.js submit handler) or
// the coach sees colours that contradict the score the student was given:
//
//  1. SCOPE. The backend pools the correct answers across EVERY game in the
//     assignment and scores one submission against that pool — submissionHistory
//     is assignment-wide, not per-game. So a right answer from game 2 must not be
//     painted red just because the coach is looking at game 1.
//  2. NORMALIZATION. The backend strips + # ! ? and lowercases before comparing.
//     Matching with === here would mark "Qxh7+" wrong against a stored "Qxh7"
//     even though the student was credited for it.
const normalizeMove = (m) => String(m || '').toLowerCase().replace(/[+#!?\s]/g, '');

// ── Puzzle assignment: what the student played on ONE puzzle ────────────────
// Coaches previously saw only a tally ("7 of 10, 70%"). This shows the actual
// moves, with the engine line beside them so the coach can see how close the
// student was — a near-miss and a wild guess look identical in a percentage.
function PuzzleAnswer({ item }) {
  if (!item) return <div style={S.muted}>Pick a puzzle on the left.</div>;
  const attempts = item.attempts || [];
  return (
    <div>
      <div style={S.answerHead}>{item.solved ? '✅ Solved' : '❌ Not solved'}</div>

      <div style={{ ...S.answerHead, marginTop: 12 }}>They played</div>
      <div style={S.moveRow}>
        {attempts.length === 0
          ? <span style={S.muted}>No moves recorded.</span>
          : attempts.map((x, i) => (
              <span key={i} style={x.correct ? S.moveOkChip : S.moveNoChip}>{x.move}</span>
            ))}
      </div>

      <div style={{ ...S.answerHead, marginTop: 12 }}>Engine line</div>
      <div style={S.moveRow}>
        {(item.solution || []).length === 0
          ? <span style={S.muted}>—</span>
          : item.solution.map((m, i) => <span key={i} style={S.answerChip}>{m}</span>)}
      </div>
    </div>
  );
}

function BlunderAnswer({ student, item, allItems, gameIndex = 0 }) {
  const history = student.submissionHistory || [];
  const answers = item?.blunders || [];
  // Every acceptable answer in the assignment, for colouring attempts.
  const allKeys = useMemo(() => {
    const s = new Set();
    for (const g of allItems || []) {
      for (const b of g.blunders || []) if (b.move) s.add(normalizeMove(b.move));
    }
    return s;
  }, [allItems]);
  return (
    <div>
      <div style={S.answerHead}>The answers</div>
      <div style={S.moveRow}>
        {answers.map((b, i) => (
          <span key={i} style={S.answerChip} title={b.explanation || ''}>
            {b.moveNumber}. {b.move}
            {b.betterMove ? ` → ${b.betterMove}` : ''}
          </span>
        ))}
      </div>

      <div style={{ ...S.answerHead, marginTop: 12 }}>
        Their attempts ({history.length || (student.attempts || 0)})
      </div>
      {history.length === 0 ? (
        <div style={S.muted}>
          {(student.submittedMoves || []).length
            ? <>Last try: {(student.submittedMoves || []).join(', ')}</>
            : 'No attempts yet.'}
        </div>
      ) : (
        history.map((h, i) => {
          // Show THIS game's answers when the submission recorded them per game.
          // Older records only have the flat list across all games, so fall back
          // to that rather than showing nothing — but say which it is, so a coach
          // is never misled about who answered what.
          const hasPerGame = Array.isArray(h.perGame) && h.perGame.length > 0;
          const moves = hasPerGame
            ? (h.perGame[gameIndex] || [])
            : (h.submittedMoves || []);
          return (
            <div key={i} style={S.try}>
              <span style={h.passed ? S.pillOk : S.pillNo}>Try {i + 1}</span>
              <span style={{ marginLeft: 8 }}>
                {moves.length
                  ? moves.map((m, j) => {
                      const right = allKeys.has(normalizeMove(m));
                      return <span key={j} style={right ? S.moveOkChip : S.moveNoChip}>{m}</span>;
                    })
                  : <span style={S.muted}>nothing submitted</span>}
              </span>
              <span style={{ ...S.muted, marginLeft: 6 }}>
                {hasPerGame ? `found ${h.foundCount || 0} overall` : `found ${h.foundCount || 0} (all games)`}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

const S = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(2,6,12,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' },
  modal: { width: '100%', maxWidth: 940, maxHeight: '94vh', overflowY: 'auto', background: '#0b111a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 18 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: 800, color: '#e6e8ee' },
  sub: { fontSize: 12.5, color: '#94a3b8', marginTop: 3 },
  close: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 26, lineHeight: 1, cursor: 'pointer' },
  body: { display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' },
  left: { flex: '0 0 auto', width: 360 },
  right: { flex: '1 1 300px', minWidth: 260 },
  nav: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'center' },
  navBtn: { padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12 },
  navInfo: { fontSize: 12, color: '#cbd5e1', minWidth: 92, textAlign: 'center' },
  itemsWrap: { marginTop: 14 },
  itemsHead: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: 'rgba(226,232,240,0.45)', marginBottom: 6 },
  items: { display: 'flex', flexDirection: 'column', gap: 5 },
  item: { textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12.5 },
  itemOn: { borderColor: 'rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.14)', color: '#6ee7b7', fontWeight: 700 },
  itemHint: { color: '#64748b', fontSize: 11 },
  students: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 190, overflowY: 'auto', marginBottom: 12 },
  student: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12.5 },
  studentOn: { borderColor: 'rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.14)', color: '#67e8f9', fontWeight: 700 },
  answer: { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 },
  answerHead: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: 'rgba(226,232,240,0.45)', marginBottom: 6 },
  moveRow: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  move: { padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e6e8ee', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' },
  moveOn: { borderColor: 'rgba(6,182,212,0.6)', background: 'rgba(6,182,212,0.18)', color: '#67e8f9' },
  answerChip: { padding: '3px 9px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#6ee7b7', fontSize: 12, fontFamily: 'monospace' },
  moveOkChip: { padding: '2px 7px', marginRight: 4, borderRadius: 5, background: 'rgba(16,185,129,0.14)', color: '#6ee7b7', fontSize: 11.5, fontFamily: 'monospace' },
  moveNoChip: { padding: '2px 7px', marginRight: 4, borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 11.5, fontFamily: 'monospace' },
  try: { padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 },
  pillOk: { padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.16)', color: '#6ee7b7', fontSize: 11, fontWeight: 700 },
  pillNo: { padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.14)', color: '#fca5a5', fontSize: 11, fontWeight: 700 },
  muted: { color: '#94a3b8', fontSize: 12 },
};
