import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import PieceSelector from '../../components/PositionEditor/PieceSelector';
import EditableBoard from '../../components/PositionEditor/EditableBoard';
import FenBar from '../../components/PositionEditor/FenBar';
import SetupControls from '../../components/PositionEditor/SetupControls';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

// Admin position picker for a book page. Reuses the existing PositionEditor
// sub-components (board + piece palette + FEN bar + side/castling controls)
// but WITHOUT the save-to-study modal that the top-level PositionEditor has.
// Emits the current FEN via onChange.
export default function BookPositionPicker({ value, onChange }) {
  const [chess, setChess] = useState(() => {
    try { return new Chess(value, { skipValidation: true }); } catch { return new Chess(); }
  });
  const [selectedPiece, setSelectedPiece] = useState(undefined); // undefined=drag, null=erase, str=place
  const chessRef = useRef(chess);
  chessRef.current = chess;

  // When the parent changes `value` (e.g. switching pages), reload the board.
  useEffect(() => {
    try {
      const c = new Chess(value, { skipValidation: true });
      if (c.fen() !== chessRef.current.fen()) setChess(c);
    } catch { /* ignore invalid */ }
  }, [value]);

  const pushFen = useCallback((fen) => {
    try {
      const c = new Chess(fen, { skipValidation: true });
      setChess(c);
      onChange?.(c.fen());
    } catch { /* ignore */ }
  }, [onChange]);

  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* LEFT: smaller board + FEN bar */}
      <div style={{ flex: '0 0 300px', maxWidth: 300 }}>
        <EditableBoard
          chess={chess}
          selectedPiece={selectedPiece}
          onFenChange={pushFen}
          orientation="white"
          boardWidth={300}
        />
        <FenBar fen={chess.fen()} onFenChange={pushFen} />
      </div>
      {/* RIGHT: piece palette + side/castling controls + clear/reset */}
      <div style={{ flex: '1 1 300px', minWidth: 280 }}>
        <PieceSelector selectedPiece={selectedPiece} onSelectPiece={setSelectedPiece} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => pushFen(EMPTY_FEN)}
            style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            🗑 Clear board
          </button>
          <button type="button" onClick={() => pushFen(START_FEN)}
            style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, color: '#0f9d63', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ↩ Start position
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <SetupControls chess={chess} onFenChange={pushFen} />
        </div>
      </div>
    </div>
  );
}
