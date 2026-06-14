import React from 'react';

const PIECE_SVG_MAP = {
  'P': '/mpchess-pieces-main/svg/wP.svg',
  'R': '/mpchess-pieces-main/svg/wR.svg',
  'N': '/mpchess-pieces-main/svg/wN.svg',
  'B': '/mpchess-pieces-main/svg/wB.svg',
  'Q': '/mpchess-pieces-main/svg/wQ.svg',
  'K': '/mpchess-pieces-main/svg/wK.svg',
  'p': '/mpchess-pieces-main/svg/bP.svg',
  'r': '/mpchess-pieces-main/svg/bR.svg',
  'n': '/mpchess-pieces-main/svg/bN.svg',
  'b': '/mpchess-pieces-main/svg/bB.svg',
  'q': '/mpchess-pieces-main/svg/bQ.svg',
  'k': '/mpchess-pieces-main/svg/bK.svg',
};

const WHITE_PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];
const BLACK_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'];

export default function PieceSelector({ selectedPiece, onSelectPiece }) {
  const isEraser = selectedPiece === null;

  const pieceBtn = (piece) => {
    const isSelected = selectedPiece === piece;
    return (
      <button
        key={piece}
        title={piece}
        onClick={() => onSelectPiece(isSelected ? undefined : piece)}
        style={{
          width: 44,
          height: 44,
          padding: 4,
          background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
          border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        <img src={PIECE_SVG_MAP[piece]} alt={piece} style={{ width: 32, height: 32, userSelect: 'none' }} />
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* White pieces */}
      <div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>White</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {WHITE_PIECES.map(pieceBtn)}
        </div>
      </div>
      {/* Black pieces */}
      <div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Black</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {BLACK_PIECES.map(pieceBtn)}
        </div>
      </div>
      {/* Eraser */}
      <button
        onClick={() => onSelectPiece(null)}
        style={{
          padding: '8px 16px',
          background: isEraser ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
          border: isEraser ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: isEraser ? '#ef4444' : '#9ca3af',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          transition: 'all 0.15s',
        }}
      >
        🗑 Eraser Mode
      </button>
    </div>
  );
}

export { PIECE_SVG_MAP };
