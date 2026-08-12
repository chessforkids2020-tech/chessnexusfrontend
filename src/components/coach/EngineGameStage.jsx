// src/components/coach/EngineGameStage.jsx
//
// "Everyone plays this position vs the computer" — the two stage views.
//
// The coach sets ONE position and the whole class plays it against Stockfish.
// Crucially the engine runs in each STUDENT's browser (see useClassEngineGame),
// so the coach here only watches: no boards to play, no clocks to run, and no
// engine on the server.
import React from 'react';
import { Chess } from 'chess.js';
import Chessboard, { gutterFor } from '../Chessboard';
import useClassEngineGame from '../../hooks/useClassEngineGame';

// ── COACH: every student's board at once, click one to spotlight it ──────────
export function EngineCoachStage({ game, boardWidth, onFocus, onEnd, onReview }) {
  const boards = game?.boards || [];
  const done = boards.filter(b => b.status === 'finished').length;

  // How wide each board may be.
  //
  // This used to be `Math.min(190, boardWidth / 4)` — always four columns and a
  // hard 190px ceiling, so a class of three on a 27" monitor got the same tiny
  // boards as a class of twelve on a laptop, and the coach could not read them.
  // The 190 cap also fought the grid, whose cells stretch to fill the row: the
  // board sat inside a much wider card and its coordinate gutter (drawn OUTSIDE
  // boardWidth) spilled over the edge, which is what made the boards look like
  // they were bleeding into each other.
  //
  // Instead: pick a column count from how many students are actually playing,
  // then size the board to its real share of the row, minus the card padding
  // and the gutter the board adds itself.
  const n = Math.max(1, boards.length);
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const CARD_PAD = 16 + 2;          // 8px padding each side + 1px border each side
  const GAP = 12;
  // Upper bound as well as a lower one. Without it a class of one would get a
  // ~1300px board that fills the screen — the coach is MONITORING here, not
  // playing, and a board bigger than this only pushes the other students out of
  // view. 380 stays comfortably readable at a glance across the room.
  const MAX_CELL = 380;
  const avail = Math.min(MAX_CELL, Math.max(120, (boardWidth - GAP * (cols - 1)) / cols - CARD_PAD));
  // Ask the board for its own gutter rather than guessing — the helper exists
  // because copies of that maths drift when the gutter changes.
  const cellBoard = Math.round(Math.max(120, avail - gutterFor(avail).left));
  const cellMin = Math.round(cellBoard + gutterFor(cellBoard).left + CARD_PAD);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.title}>♟️ Class vs Computer</span>
        <span style={S.meta}>
          {boards.length} playing · {done} finished · {game?.skill || 'medium'}
        </span>
        <button type="button" style={S.endBtn} onClick={onEnd}>End activity</button>
      </div>

      {/* Every board live. The coach is watching, not playing, so these are
          small and read-only — the point is spotting who is stuck. */}
      <div style={{ ...S.grid, gridTemplateColumns: `repeat(auto-fit, minmax(${cellMin}px, 1fr))` }}>
        {boards.map(b => (
          <div
            key={b.id}
            style={{
              ...S.cell,
              ...(game?.spotlightBoardId === b.id ? S.cellOn : {}),
            }}
          >
            {/* The board itself spotlights; Review is a separate action. A
                <button> inside a <button> is invalid HTML and the inner click
                never fires reliably, so the card is a div with its own hit
                areas rather than one big button. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onFocus?.(b.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus?.(b.id); } }}
              style={S.cellHit}
              title="Show this board to the class"
            >
              <Chessboard position={b.fen} boardWidth={cellBoard} draggable={false} />
              <div style={S.cellName}>
                {b.studentName}
                {b.status === 'finished' && (
                  <span style={S.cellDone}> · {b.result}</span>
                )}
              </div>
              <div style={S.cellMoves}>{b.moves?.length || 0} moves</div>
            </div>
            {/* Review needs moves to step through — a board with none has
                nothing to show, so the button only appears once there are. */}
            {onReview && (b.moves?.length || 0) > 0 && (
              <button
                type="button"
                style={S.reviewBtn}
                onClick={(e) => { e.stopPropagation(); onReview(b); }}
                title="Load this game on the teaching board to analyse with the class"
              >
                🔍 Review on board
              </button>
            )}
          </div>
        ))}
        {boards.length === 0 && <div style={S.empty}>No students joined.</div>}
      </div>
    </div>
  );
}

// ── STUDENT: play your own board against the engine ─────────────────────────
export function EngineStudentStage({ game, myBoard, socket, sessionId, boardWidth }) {
  const { playMove, thinking, isMyTurn } = useClassEngineGame({
    socket, sessionId, myBoard,
    skillLevel: game?.skillLevel,
    studentColor: game?.studentColor,
  });

  // A student who has FINISHED used to be stuck staring at their own dead board
  // until every other student finished too — they could not see the board the
  // coach was highlighting, which is the whole point of the activity. Once their
  // game is over they follow the coach's spotlight by default, and can flip back
  // to review their own game whenever they want.
  const iAmFinished = myBoard?.status === 'finished';
  const [reviewMine, setReviewMine] = React.useState(false);
  // Reset when a NEW game starts, so the choice does not leak between activities.
  React.useEffect(() => { setReviewMine(false); }, [game?.id]);

  const spotlight = (game?.boards || []).find(b => b.id === game?.spotlightBoardId);
  const spotlightIsMine = spotlight && myBoard && spotlight.id === myBoard.id;
  const followSpotlight = iAmFinished && !reviewMine && spotlight && !spotlightIsMine;

  if (followSpotlight) {
    return (
      <div style={S.wrap}>
        <div style={S.head}>
          <span style={S.title}>♟️ Class vs Computer</span>
          <span style={S.meta}>Your game: {myBoard.result}</span>
        </div>
        <Chessboard position={spotlight.fen} boardWidth={boardWidth} draggable={false} />
        <div style={S.watching}>Watching {spotlight.studentName}</div>
        <button type="button" style={S.switchBtn} onClick={() => setReviewMine(true)}>
          ← Review my game
        </button>
      </div>
    );
  }

  // Didn't join — watch the board the coach spotlighted.
  if (!myBoard) {
    return (
      <div style={S.wrap}>
        <div style={S.head}><span style={S.title}>♟️ Class vs Computer</span></div>
        {spotlight ? (
          <>
            <Chessboard position={spotlight.fen} boardWidth={boardWidth} draggable={false} />
            <div style={S.watching}>Watching {spotlight.studentName}</div>
          </>
        ) : <div style={S.empty}>Waiting for the coach…</div>}
      </div>
    );
  }

  const onDrop = (from, to) => {
    // A promotion always becomes a queen here — a child mid-lesson should not
    // have to answer a piece-choice dialog.
    if (!isMyTurn || myBoard.status !== 'active') return false;
    return playMove(from, to, 'q');
  };

  const finished = myBoard.status === 'finished';
  let inCheck = false;
  try { inCheck = new Chess(myBoard.fen).inCheck(); } catch { /* ignore */ }

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.title}>♟️ You vs Computer</span>
        <span style={S.meta}>
          {finished ? myBoard.result
            : thinking ? 'Computer is thinking…'
            : isMyTurn ? (inCheck ? 'Your move — you are in check!' : 'Your move')
            : 'Waiting…'}
        </span>
      </div>
      <Chessboard
        position={myBoard.fen}
        onDrop={onDrop}
        boardWidth={boardWidth}
        orientation={game?.studentColor === 'black' ? 'black' : 'white'}
        draggable={!finished && isMyTurn}
      />
      <div style={S.moves}>{(myBoard.moves || []).join('  ')}</div>
      {/* The way back to the class. Shown once their game is over and the coach
          is highlighting somebody else's board. */}
      {iAmFinished && spotlight && !spotlightIsMine && (
        <button type="button" style={S.switchBtn} onClick={() => setReviewMine(false)}>
          Back to class board →
        </button>
      )}
    </div>
  );
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' },
  head: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 800, color: '#f8fafc' },
  meta: { fontSize: 12.5, color: '#9ca3af' },
  endBtn: {
    background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)',
    color: '#fca5a5', borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: 12,
    fontWeight: 700, cursor: 'pointer',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12, width: '100%', maxHeight: '72vh', overflowY: 'auto', padding: 4,
  },
  cell: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-lg)', padding: 8, cursor: 'pointer', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 6, color: 'inherit',
  },
  cellOn: { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' },
  cellHit: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    cursor: 'pointer', width: '100%',
  },
  reviewBtn: {
    marginTop: 2, width: '100%', background: 'rgba(6,182,212,0.14)',
    border: '1px solid rgba(6,182,212,0.4)', color: '#67e8f9', borderRadius: 'var(--radius-md)',
    padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  cellName: { fontSize: 12, fontWeight: 700, color: '#e6edf3', textAlign: 'center' },
  cellDone: { color: '#34d399', fontWeight: 600 },
  cellMoves: { fontSize: 11, color: '#6b7280' },
  empty: { color: '#6b7280', fontSize: 13, padding: 30 },
  watching: { fontSize: 12.5, color: '#9ca3af' },
  switchBtn: {
    background: 'rgba(6,182,212,0.14)', border: '1px solid rgba(6,182,212,0.4)',
    color: '#67e8f9', borderRadius: 'var(--radius-md)', padding: '7px 15px', fontSize: 12.5,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  moves: {
    fontFamily: 'monospace', fontSize: 12, color: '#9ca3af',
    maxWidth: 520, textAlign: 'center', lineHeight: 1.6,
  },
};
