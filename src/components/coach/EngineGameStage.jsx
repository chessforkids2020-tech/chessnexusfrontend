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
import Chessboard from '../Chessboard';
import useClassEngineGame from '../../hooks/useClassEngineGame';

// ── COACH: every student's board at once, click one to spotlight it ──────────
export function EngineCoachStage({ game, boardWidth, onFocus, onEnd }) {
  const boards = game?.boards || [];
  const done = boards.filter(b => b.status === 'finished').length;

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
      <div style={S.grid}>
        {boards.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => onFocus?.(b.id)}
            style={{
              ...S.cell,
              ...(game?.spotlightBoardId === b.id ? S.cellOn : {}),
            }}
            title="Show this board to the class"
          >
            <Chessboard position={b.fen} boardWidth={Math.max(120, Math.min(190, boardWidth / 4))} draggable={false} />
            <div style={S.cellName}>
              {b.studentName}
              {b.status === 'finished' && (
                <span style={S.cellDone}> · {b.result}</span>
              )}
            </div>
            <div style={S.cellMoves}>{b.moves?.length || 0} moves</div>
          </button>
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

  // Didn't join, or finished — watch the board the coach spotlighted.
  const spotlight = (game?.boards || []).find(b => b.id === game?.spotlightBoardId);
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
    color: '#fca5a5', borderRadius: 9, padding: '5px 12px', fontSize: 12,
    fontWeight: 700, cursor: 'pointer',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12, width: '100%', maxHeight: '72vh', overflowY: 'auto', padding: 4,
  },
  cell: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 8, cursor: 'pointer', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 6, color: 'inherit',
  },
  cellOn: { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' },
  cellName: { fontSize: 12, fontWeight: 700, color: '#e6edf3', textAlign: 'center' },
  cellDone: { color: '#34d399', fontWeight: 600 },
  cellMoves: { fontSize: 11, color: '#6b7280' },
  empty: { color: '#6b7280', fontSize: 13, padding: 30 },
  watching: { fontSize: 12.5, color: '#9ca3af' },
  moves: {
    fontFamily: 'monospace', fontSize: 12, color: '#9ca3af',
    maxWidth: 520, textAlign: 'center', lineHeight: 1.6,
  },
};
