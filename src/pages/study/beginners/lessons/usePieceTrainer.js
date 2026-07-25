import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { buildFen } from './pieceMovementData';
import { pieceTargets } from './pieceMoves';

// "Catch the stars" game for a single piece. Given { pieceLetter, start, stars, par }
// it builds a one-piece position and lets the player move ONLY that piece's legal moves
// (chess.js validates). Landing on a star collects it + bumps the move count; collect
// them all → done. Exposes the current fen, the legal target squares (for move dots),
// the remaining stars, moves, elapsed seconds, and tryMove/reset.

export function usePieceTrainer(level, pieceLetter) {
  const [square, setSquare] = useState(level?.start || 'e4');
  const [remaining, setRemaining] = useState(() => new Set(level?.stars || []));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  // Reset whenever the level changes.
  const reset = useCallback(() => {
    setSquare(level?.start || 'e4');
    setRemaining(new Set(level?.stars || []));
    setMoves(0);
    setSeconds(0);
    setDone(false);
    startedRef.current = false;
  }, [level]);
  useEffect(() => { reset(); }, [reset]);

  // Timer ticks once the first move is made, stops when done.
  useEffect(() => {
    if (done || !startedRef.current) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [done, moves]);

  const fen = useMemo(() => buildFen(pieceLetter, square), [pieceLetter, square]);

  // Legal target squares for the piece on its current (empty-board) square. Computed
  // directly (chess.js rejects king-less FENs), which also keeps the board clean.
  const legalTargets = useMemo(() => pieceTargets(pieceLetter, square, true), [pieceLetter, square]);

  // Attempt a move from the piece's square to `to`. Returns true if it was legal.
  const tryMove = useCallback((from, to) => {
    if (done) return false;
    if (from !== square) return false;         // only the one piece moves
    if (!legalTargets.includes(to)) return false;
    startedRef.current = true;
    setSquare(to);
    setMoves((m) => m + 1);
    setRemaining((prev) => {
      if (!prev.has(to)) return prev;
      const next = new Set(prev);
      next.delete(to);
      if (next.size === 0) setDone(true);
      return next;
    });
    return true;
  }, [done, square, legalTargets]);

  return {
    fen,
    square,
    legalTargets,
    remainingStars: [...remaining],
    moves,
    seconds,
    done,
    par: level?.par ?? null,
    tryMove,
    reset,
  };
}
