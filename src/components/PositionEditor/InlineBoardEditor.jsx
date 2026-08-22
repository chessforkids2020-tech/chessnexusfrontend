import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import EditableBoard from './EditableBoard';
import SetupControls from './SetupControls';
import { PIECE_SVG_MAP } from './PieceSelector';

const WHITE_PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];
const BLACK_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'];

// A compact, embeddable board editor for building a FEN inside a form (e.g. the
// coach "Play vs Stockfish" assignment builder). Unlike the full PositionEditor,
// this has NO save-to-study modal and no navigation — it just lets the coach set
// up a position visually and hands the FEN back via onApply. Cheap to drop next
// to any FEN input.
//
// Layout: board on the LEFT, with black pieces above it and white pieces below;
// all other controls (setup + actions) on the RIGHT.

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const BOARD_WIDTH = 224; // compact board; 28px squares

function validatePosition(chess) {
  try {
    const board = chess.board();
    let wk = 0, bk = 0;
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.type === 'k' && sq.color === 'w') wk++;
        if (sq.type === 'k' && sq.color === 'b') bk++;
      }
    }
    if (wk !== 1) return 'White must have exactly 1 king';
    if (bk !== 1) return 'Black must have exactly 1 king';
    return null;
  } catch (e) {
    return e.message || 'Invalid position';
  }
}

const cardStyle = {
  background: 'rgba(15,15,15,0.7)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 12,
};

export default function InlineBoardEditor({ initialFen, onApply, onCancel }) {
  const [chess, setChess] = useState(() => {
    const seed = (initialFen || '').trim();
    try { return new Chess(seed || START_FEN, { skipValidation: true }); }
    catch { return new Chess(START_FEN); }
  });
  const [selectedPiece, setSelectedPiece] = useState(undefined); // undefined = drag, null = eraser, string = piece
  // Which way the board faces. EditableBoard already reversed its ranks and
  // files for this, but the value was hardcoded to 'white' — so building a
  // Black-to-move position meant placing every piece mentally inverted.
  const [orientation, setOrientation] = useState('white');
  // Once the user flips manually, stop auto-following the side to move — their
  // choice should not be undone the next time they touch the turn toggle.
  const orientationPinned = useRef(false);
  const flipBoard = useCallback(() => {
    orientationPinned.current = true;
    setOrientation(o => (o === 'white' ? 'black' : 'white'));
  }, []);

  // Face the side to move. Setting up a Black-to-move puzzle from White's view
  // means placing everything upside down, so the board follows the turn toggle
  // until the user overrides it with the Flip button.
  const turn = chess.fen().split(' ')[1] || 'w';
  useEffect(() => {
    if (orientationPinned.current) return;
    setOrientation(turn === 'b' ? 'black' : 'white');
  }, [turn]);

  const handleFenChange = useCallback((newFen) => {
    try { setChess(new Chess(newFen, { skipValidation: true })); } catch { /* ignore malformed intermediate FEN */ }
  }, []);

  const handleClear = () => { try { setChess(new Chess(EMPTY_FEN, { skipValidation: true })); } catch { /* ignore */ } };
  const handleReset = () => setChess(new Chess(START_FEN));

  const validationError = validatePosition(chess);
  const isEraser = selectedPiece === null;

  // A single selectable piece button for the strips above/below the board.
  const pieceBtn = (piece) => {
    const isSelected = selectedPiece === piece;
    return (
      <button
        key={piece}
        type="button"
        title={piece}
        onClick={() => setSelectedPiece(isSelected ? undefined : piece)}
        style={{
          width: 34,
          height: 34,
          padding: 3,
          background: isSelected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
          border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 7,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        <img src={PIECE_SVG_MAP[piece]} alt={piece} style={{ width: 24, height: 24, userSelect: 'none' }} />
      </button>
    );
  };

  const pieceStrip = (pieces) => (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', width: BOARD_WIDTH }}>
      {pieces.map(pieceBtn)}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-start',
        marginTop: 8,
        padding: 12,
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 12,
      }}
    >
      {/* LEFT: black pieces (above) → board → white pieces (below) → eraser */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto', alignItems: 'center' }}>
        {pieceStrip(BLACK_PIECES)}

        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center', padding: 4 }}>
          <EditableBoard
            chess={chess}
            selectedPiece={selectedPiece}
            onFenChange={handleFenChange}
            orientation={orientation}
            boardWidth={BOARD_WIDTH}
          />
        </div>

        {pieceStrip(WHITE_PIECES)}

        <button
          type="button"
          onClick={() => setSelectedPiece(null)}
          style={{
            padding: '7px 16px',
            background: isEraser ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
            border: isEraser ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: isEraser ? '#ef4444' : '#9ca3af',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          🗑 Eraser Mode
        </button>
      </div>

      {/* MIDDLE: Setup panel, directly to the right of the board */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto', minWidth: 190 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={flipBoard} title="Flip the board" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: '#e6e8ee', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>⇅ Flip</button>
          <button type="button" onClick={handleClear} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>🗑 Clear</button>
          <button type="button" onClick={handleReset} style={{ padding: '7px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>♟ Start Pos</button>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Setup</div>
          <SetupControls chess={chess} onFenChange={handleFenChange} />
        </div>
      </div>

      {/* RIGHT: FEN, validation, then actions below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 220px', minWidth: 220 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>FEN</div>
          <input
            value={chess.fen()}
            onChange={e => handleFenChange(e.target.value)}
            spellCheck={false}
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', padding: '7px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {validationError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12.5 }}>
            ⚠ {validationError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => { if (!validationError) onApply(chess.fen()); }}
            disabled={!!validationError}
            style={{ flex: 2, padding: '10px 8px', background: validationError ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.15)', border: `1px solid rgba(16,185,129,${validationError ? 0.1 : 0.4})`, borderRadius: 10, color: validationError ? '#4b5563' : '#34d399', cursor: validationError ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            ✓ Use this position
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: '10px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
