import React from 'react';
import Chessboard from '../../../../components/Chessboard';

// A chessboard that draws real ⭐ STARS on given squares (as an overlay — the
// Chessboard's highlightSquares only tints a square border, which reads as a random
// orange box, not a "star to catch"). Also renders soft move-dots for legal targets.
// Everything is positioned from the square's file/rank so it lines up at any size.
const FILES = 'abcdefgh';

function squarePos(square, size, orientation = 'white') {
  const file = square.charCodeAt(0) - 97;   // 0..7
  const rank = parseInt(square[1], 10) - 1;  // 0..7
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  const cell = size / 8;
  return { left: col * cell, top: row * cell, cell };
}

export default function StarBoard({
  position, boardWidth = 480, orientation = 'white', draggable = false, onDrop,
  stars = [], dots = [], arrows = [], lastMove = null,
}) {
  const size = boardWidth;
  // Soft green dots for legal moves render via highlightSquares (a ring is fine here);
  // stars get a real glyph overlay so they clearly read as "catch me".
  const dotHi = {};
  for (const d of dots) dotHi[d] = 'rgba(34,197,94,0.5)';

  return (
    <div style={{ position: 'relative', width: size, height: size, lineHeight: 0 }}>
      <Chessboard
        position={position}
        boardWidth={size}
        orientation={orientation}
        draggable={draggable}
        onDrop={onDrop}
        arrows={arrows}
        lastMove={lastMove}
        highlightSquares={dotHi}
        resizable={false}
      />
      {/* Star overlay — non-interactive so drags pass through to the board. */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {stars.map((sq) => {
          const { left, top, cell } = squarePos(sq, size, orientation);
          return (
            <div key={sq} style={{
              position: 'absolute', left, top, width: cell, height: cell,
              display: 'grid', placeItems: 'center',
              fontSize: cell * 0.62, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
              animation: 'ba-star-pulse 1.1s ease-in-out infinite',
            }}>⭐</div>
          );
        })}
      </div>
    </div>
  );
}
