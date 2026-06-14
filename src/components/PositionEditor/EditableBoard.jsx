import React, { useState } from 'react';
import { PIECE_SVG_MAP } from './PieceSelector';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

function toSquare(col, row) {
  return FILES[col] + RANKS[row];
}

function isLight(col, row) {
  return (col + row) % 2 === 0;
}

export default function EditableBoard({ chess, selectedPiece, onFenChange, orientation = 'white', boardWidth = 440 }) {
  const [draggingFrom, setDraggingFrom] = useState(null);
  const [dragOverSquare, setDragOverSquare] = useState(null);

  const squareSize = Math.floor(boardWidth / 8);
  const displayRanks = orientation === 'white' ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();

  function getPiece(square) {
    try {
      const p = chess.get(square);
      return p ? (p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase()) : null;
    } catch { return null; }
  }

  function handleSquareClick(square) {
    if (selectedPiece === undefined) {
      // No tool — do nothing in click mode (only drag)
      return;
    }
    if (selectedPiece === null) {
      // Eraser
      chess.remove(square);
    } else {
      // Place piece
      const color = selectedPiece === selectedPiece.toUpperCase() ? 'w' : 'b';
      const type = selectedPiece.toLowerCase();
      chess.remove(square);
      chess.put({ type, color }, square);
    }
    onFenChange(chess.fen());
  }

  function handleDragStart(square, e) {
    const piece = getPiece(square);
    if (!piece) { e.preventDefault(); return; }
    setDraggingFrom(square);
    // Set drag image
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', square);
  }

  function handleDragOver(square, e) {
    e.preventDefault();
    setDragOverSquare(square);
  }

  function handleDrop(toSquare, e) {
    e.preventDefault();
    setDragOverSquare(null);
    if (!draggingFrom || draggingFrom === toSquare) { setDraggingFrom(null); return; }

    const piece = getPiece(draggingFrom);
    if (!piece) { setDraggingFrom(null); return; }

    chess.remove(draggingFrom);
    chess.remove(toSquare);
    const color = piece === piece.toUpperCase() ? 'w' : 'b';
    chess.put({ type: piece.toLowerCase(), color }, toSquare);
    setDraggingFrom(null);
    onFenChange(chess.fen());
  }

  function handlePaletteDropOnBoard(square, e) {
    // Drop from PieceSelector palette via HTML5 drag (not implemented with dataTransfer from palette)
    // Handled through square click; palette drag intentionally uses click flow.
    handleDrop(square, e);
  }

  const squareElements = [];

  displayRanks.forEach((rank, rowIdx) => {
    displayFiles.forEach((file, colIdx) => {
      const sq = file + rank;
      const col = FILES.indexOf(file);
      const row = RANKS.indexOf(rank);
      const light = isLight(col, row);
      const piece = getPiece(sq);
      const isDragOver = dragOverSquare === sq;

      squareElements.push(
        <div
          key={sq}
          onClick={() => handleSquareClick(sq)}
          onDragOver={(e) => handleDragOver(sq, e)}
          onDrop={(e) => handlePaletteDropOnBoard(sq, e)}
          style={{
            width: squareSize,
            height: squareSize,
            background: isDragOver
              ? 'rgba(99, 102, 241, 0.5)'
              : light ? '#EEEED2' : '#769656',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: selectedPiece !== undefined ? 'pointer' : piece ? 'grab' : 'default',
            boxSizing: 'border-box',
            transition: 'background 0.1s',
          }}
        >
          {/* Coordinates */}
          {colIdx === 0 && (
            <span style={{
              position: 'absolute', top: 2, left: 3,
              fontSize: Math.max(9, squareSize * 0.18),
              color: light ? '#769656' : '#EEEED2',
              fontWeight: 700, lineHeight: 1, userSelect: 'none', pointerEvents: 'none'
            }}>{rank}</span>
          )}
          {rowIdx === 7 && (
            <span style={{
              position: 'absolute', bottom: 2, right: 4,
              fontSize: Math.max(9, squareSize * 0.18),
              color: light ? '#769656' : '#EEEED2',
              fontWeight: 700, lineHeight: 1, userSelect: 'none', pointerEvents: 'none'
            }}>{file}</span>
          )}

          {piece && (
            <img
              src={PIECE_SVG_MAP[piece]}
              alt={piece}
              draggable
              onDragStart={(e) => handleDragStart(sq, e)}
              onDragEnd={() => setDraggingFrom(null)}
              style={{
                width: squareSize * 0.85,
                height: squareSize * 0.85,
                userSelect: 'none',
                opacity: draggingFrom === sq ? 0.4 : 1,
                cursor: 'grab',
                pointerEvents: selectedPiece !== undefined ? 'none' : 'auto',
              }}
            />
          )}
        </div>
      );
    });
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(8, ${squareSize}px)`,
        gridTemplateRows: `repeat(8, ${squareSize}px)`,
        width: squareSize * 8,
        height: squareSize * 8,
        border: '2px solid rgba(255,255,255,0.15)',
        borderRadius: 4,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {squareElements}
    </div>
  );
}
