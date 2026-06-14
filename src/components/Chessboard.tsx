import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import soundManager from '../utils/soundManager';
import { useBoardTheme } from '../contexts/BoardThemeContext';
import { usePieceTheme } from '../contexts/PieceThemeContext';

// Map a chess.js piece character to a two-char filename prefix understood by all piece sets.
// e.g. 'p' -> 'bP', 'K' -> 'wK'
function pieceToCode(piece: string): string {
  const isWhite = piece === piece.toUpperCase();
  return (isWhite ? 'w' : 'b') + piece.toUpperCase();
}

interface ChessboardProps {
  position: string;
  onDrop?: (sourceSquare: string, targetSquare: string, promotion?: string) => boolean | void;
  onSquareRightClick?: (square: string, event: React.MouseEvent) => void;
  orientation?: 'white' | 'black';
  boardStyle?: React.CSSProperties;
  boardWidth?: number;
  lightSquareStyle?: React.CSSProperties;
  darkSquareStyle?: React.CSSProperties;
  draggable?: boolean;
  transitionDuration?: number;
  showCoordinates?: boolean;
  coordinatesInside?: boolean;
  coordinateSides?: ('top' | 'bottom' | 'left' | 'right')[];
  lastMove?: { from: string; to: string } | null;
  mute?: boolean;
  allowMovePiece?: (piece: string, square: string) => boolean; // Custom piece movement validation
  arrows?: Array<{ from: string; to: string; color?: string }>;
  /** Enable premove: player can queue a move while it's opponent's turn */
  allowPremove?: boolean;
  /** Which color the local player is playing as (required for premove) */
  playerColor?: 'white' | 'black';
  /** Extra legal moves injected by the parent (e.g. Chess960 king→rook castling) */
  extraLegalMoves?: { from: string; to: string }[];
  /** Called whenever the queued premove changes (or is cleared). Used by parent for instant premove firing. */
  onPremoveChange?: (premove: { from: string; to: string; promotion?: string } | null) => void;
}

interface PieceInfo {
  piece: string;
  row: number;
  col: number;
}

interface MoveInfo {
  row: number;
  col: number;
}

interface MouseDownInfo {
  x: number;
  y: number;
  piece: PieceInfo;
}

const Chessboard: React.FC<ChessboardProps> = ({
  position,
  onDrop,
  onSquareRightClick,
  orientation = 'white',
  boardStyle = {},
  boardWidth = 440,
  lightSquareStyle,
  darkSquareStyle,
  draggable = true,
  transitionDuration = 400,
  showCoordinates = true,
  coordinatesInside = false,
  coordinateSides,
  lastMove = null,
  mute = false,
  allowMovePiece,
  arrows = [],
  allowPremove = false,
  playerColor,
  extraLegalMoves = [],
  onPremoveChange
}) => {
  // Pull active board theme so every board respects the user's colour preference.
  // Props can still override per-board if needed (e.g. a fixed-colour analysis view).
  const { theme: boardTheme } = useBoardTheme();
  // Pull active piece theme — provides getPieceSrc(code) -> URL
  const { getPieceSrc } = usePieceTheme();
  const effectiveLightStyle: React.CSSProperties =
    lightSquareStyle ?? { backgroundColor: boardTheme.light };
  const effectiveDarkStyle: React.CSSProperties =
    darkSquareStyle ?? { backgroundColor: boardTheme.dark };

  // Always show bottom and left sides only
  const effectiveCoordinateSides = coordinateSides || ['bottom', 'left'];
  const [localFlipped, setLocalFlipped] = useState(orientation === 'black');
  const [draggedPiece, setDraggedPiece] = useState<PieceInfo | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<PieceInfo | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<MoveInfo[]>([]);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<MouseDownInfo | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [promotionPopup, setPromotionPopup] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
  const promotionOpenTimeRef = useRef<number>(0);
  // User-drawn arrows
  const [localArrows, setLocalArrows] = useState<Array<{ from: string; to: string; color: string }>>([]);
  const [previewArrow, setPreviewArrow] = useState<{ from: string; to: string; color: string } | null>(null);
  const arrowDragRef = useRef<{ square: string; color: string } | null>(null);
  // User-highlighted squares
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, string>>({});
  // Premove: a move queued during opponent's turn, fired automatically when it becomes player's turn
  const [premove, setPremove] = useState<{ from: string; to: string; promotion?: string } | null>(null);
  // Flag to distinguish premove promotion from normal promotion inside handlePromotion
  const isPremovePromotionRef = useRef(false);
  // Keep a stable ref to onPremoveChange so closures inside effects don't go stale
  const onPremoveChangeRef = useRef(onPremoveChange);
  useLayoutEffect(() => { onPremoveChangeRef.current = onPremoveChange; });
  const setPremoveAndNotify = useCallback((p: { from: string; to: string; promotion?: string } | null) => {
    setPremove(p);
    onPremoveChangeRef.current?.(p);
  }, []);

  const playMoveSound = useCallback(() => {
    if (mute) return;
    soundManager.play('move');
  }, [mute]);

  const playCaptureSound = useCallback(() => {
    if (mute) return;
    soundManager.play('capture');
  }, [mute]);

  // Refs for FLIP animation
  const pieceRefs = useRef<Record<string, HTMLDivElement>>({}); // map square -> DOM node
  const prevPositions = useRef<{ positions?: Record<string, { left: number; top: number }>; board?: (string | null)[][] }>({}); // map square -> {left, top}
  const isFlippedRef = useRef(false);

  // Calculate square size early (needed for useEffect)
  const squareSize = (boardWidth - 4) / 8;
  const isSmallScreen = boardWidth < 400;
  const coordinateSize = isSmallScreen ? 20 : 32;

  // Parse FEN string to get piece positions (robust against invalid/empty FEN)
  const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  // Declare fenToUse early to avoid block-scoped variable issues
  const fenToUse = typeof position === 'string' && position ? position : defaultFen;
  
  const parseFEN = (fen: string): (string | null)[][] => {
    const safeFen = typeof fen === 'string' && fen ? fen : defaultFen;
    const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    try {
      const rows = safeFen.split(' ')[0].split('/');
      if (!rows || rows.length !== 8) return board;
      for (let row = 0; row < 8; row++) {
        let col = 0;
        for (const char of rows[row]) {
          if (isNaN(Number(char))) {
            board[row][col] = char;
            col++;
          } else {
            col += parseInt(char);
          }
        }
      }
    } catch (err) {
      // Log and return empty board to avoid app crash
    }
    return board;
  };
  const board = parseFEN(fenToUse);
  const isFlipped = localFlipped;

  // Detect which king square is in check (null when not in check)
  const checkSquare = useMemo((): string | null => {
    try {
      const game = new Chess(fenToUse);
      if (!game.inCheck()) return null;
      const kingPiece = game.turn() === 'w' ? 'K' : 'k';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === kingPiece) {
            return String.fromCharCode(97 + c) + (8 - r);
          }
        }
      }
    } catch {
      // invalid FEN — no check highlight
    }
    return null;
  }, [fenToUse, board]);

  // Sync localFlipped when orientation prop changes externally.
  // useLayoutEffect fires synchronously before the browser paints, so both the
  // new position AND the correct orientation are committed in the same visual frame.
  // Using plain useEffect here caused a two-frame glitch: the board first rendered
  // at the new puzzle position with the OLD orientation, then flipped — users saw
  // two rapid piece animations (the old "bot move repeat" bug in arena race).
  useLayoutEffect(() => {
    setLocalFlipped(orientation === 'black');
  }, [orientation]);

  // Keep isFlippedRef in sync for use in event handlers
  useEffect(() => {
    isFlippedRef.current = localFlipped;
  }, [localFlipped]);

  // Play sound when position changes externally (e.g. bot move)
  const prevPositionRef = useRef(fenToUse);
  useEffect(() => {
    if (prevPositionRef.current !== fenToUse) {
      // Basic heuristic to detect if it was a capture: 
      // check if piece count decreased or if 'x' would be in a move SAN
      // For simplicity, we compare the piece part of FEN
      const prevPieces = prevPositionRef.current.split(' ')[0];
      const newPieces = fenToUse.split(' ')[0];
      
      // If length decreased or different pieces, might be capture.
      // A better way is to check piece characters
      const getPieceCount = (fenPart: string) => {
        return fenPart.split('').filter(c => isNaN(parseInt(c))).length;
      };

      if (getPieceCount(newPieces) < getPieceCount(prevPieces)) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
      prevPositionRef.current = fenToUse;
    }
  }, [fenToUse, playMoveSound, playCaptureSound]);

  // Get current turn from FEN
  const getCurrentTurn = (): 'white' | 'black' => {
    const fenParts = fenToUse.split(' ');
    return fenParts[1] === 'w' ? 'white' : 'black';
  };

  const currentTurn = getCurrentTurn();

  // Helper: true when piece belongs to the local player but it is currently the opponent's turn (premove candidate)
  const isPremoveCandidate = useCallback((piece: string | null): boolean => {
    if (!allowPremove || !piece || !playerColor) return false;
    const isWhitePiece = piece === piece.toUpperCase();
    const isPlayerPiece = (playerColor === 'white') === isWhitePiece;
    const isPlayerTurn = currentTurn === playerColor;
    return isPlayerPiece && !isPlayerTurn;
  }, [allowPremove, playerColor, currentTurn]);

  // Check if a piece can be moved by current player (or queued as premove)
  const canMovePiece = useCallback((piece: string | null, row?: number, col?: number): boolean => {
    if (!piece) return false;
    
    // Use custom allowMovePiece logic if provided
    if (allowMovePiece && typeof row === 'number' && typeof col === 'number') {
      const square = String.fromCharCode(97 + col) + (8 - row);
      if (allowMovePiece(piece, square)) return true;
      // Premove: own piece on opponent's turn is still interactable
      return isPremoveCandidate(piece);
    }
    
    // Default logic: check piece color vs current turn
    const isWhitePiece = piece === piece.toUpperCase();
    const isWhiteTurn = currentTurn === 'white';
    if (isWhitePiece === isWhiteTurn) return true;
    // Premove candidate
    return isPremoveCandidate(piece);
  }, [currentTurn, allowMovePiece, orientation, draggable, isPremoveCandidate]);

  // Calculate possible moves for selected piece
  const calculatePossibleMoves = useCallback((piece: string, row: number, col: number): MoveInfo[] => {
    if (!piece) return [];

    try {
      const game = new Chess(fenToUse);
      const square = String.fromCharCode(97 + col) + (8 - row);
      const moves = game.moves({ square: square as Square, verbose: true }) as Move[];
      const targets = moves.map(move => ({
        row: 8 - parseInt(move.to[1]),
        col: move.to.charCodeAt(0) - 97
      }));

      // Include any extra legal moves injected by the parent (e.g. Chess960 castling)
      for (const extra of extraLegalMoves) {
        if (extra.from === square) {
          const toRow = 8 - parseInt(extra.to[1]);
          const toCol = extra.to.charCodeAt(0) - 97;
          if (!targets.some(t => t.row === toRow && t.col === toCol)) {
            targets.push({ row: toRow, col: toCol });
          }
        }
      }

      return targets;
    } catch {
      return [];
    }
  }, [fenToUse, extraLegalMoves]);

  // Convert board pixel coordinates to chess square notation
  const getSquareFromBoardCoords = useCallback((x: number, y: number): string | null => {
    const adjustedX = x - 2;
    const adjustedY = y - 2;
    if (adjustedX < 0 || adjustedX >= boardWidth - 4 || adjustedY < 0 || adjustedY >= boardWidth - 4) return null;
    const col = Math.floor(adjustedX / squareSize);
    const row = Math.floor(adjustedY / squareSize);
    const flipped = isFlippedRef.current;
    const actualRow = flipped ? 7 - row : row;
    const actualCol = flipped ? 7 - col : col;
    if (actualRow < 0 || actualRow >= 8 || actualCol < 0 || actualCol >= 8) return null;
    return String.fromCharCode(97 + actualCol) + (8 - actualRow);
  }, [boardWidth, squareSize]);

  const getSquareColor = (row: number, col: number): 'light' | 'dark' => {
    const actualRow = isFlipped ? 7 - row : row;
    const actualCol = isFlipped ? 7 - col : col;
    return (actualRow + actualCol) % 2 === 0 ? 'light' : 'dark';
  };

  const getSquareStyle = (row: number, col: number): React.CSSProperties => {
    const color = getSquareColor(row, col);
    const { backgroundColor: _unused, ...baseStyleRest } = color === 'light' ? effectiveLightStyle : effectiveDarkStyle;
    const baseColor = (color === 'light' ? effectiveLightStyle : effectiveDarkStyle).backgroundColor as string
      || (color === 'light' ? '#EEEED2' : '#769656');

    const isSelected = selectedPiece && selectedPiece.row === row && selectedPiece.col === col;
    const isPossibleMove = possibleMoves.some(move => move.row === row && move.col === col);
    const piece = board[row][col];
    const canMoveThisPiece = piece && canMovePiece(piece, row, col);

    const squareId = String.fromCharCode(97 + col) + (8 - row);

    // Check if this square is part of the last move
    const isLastMoveSquare = lastMove && (
      squareId === lastMove.from || squareId === lastMove.to
    );
    // Premove: highlight the from/to squares with a distinct amber/orange colour
    const isPremoveSquare = premove && (squareId === premove.from || squareId === premove.to);

    // Compute background — highlight rings are rendered as overlays, not background fills
    let background: string;
    if (squareId === checkSquare) {
      // Lichess-style: solid red fill on the king square
      background = '#e53935';
    } else if (isPremoveSquare) {
      // Amber premove highlight (both light and dark squares get a similar tone)
      background = color === 'light' ? '#f6c860' : '#d4952a';
    } else if (isLastMoveSquare) {
      background = '#eef078ff';
    } else if (isPossibleMove) {
      background = color === 'light' ? '#90EE90' : '#228B22';
    } else {
      background = baseColor;
    }

    return {
      ...baseStyleRest,
      width: `${squareSize}px`,
      height: `${squareSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: canMoveThisPiece ? 'pointer' : (piece ? 'not-allowed' : 'default'),
      userSelect: 'none',
      position: 'relative',
      border: isSelected ? '3px solid rgba(6, 182, 212, 0.5)' : 'none',
      boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.4)' : 'none',
      background,
      // Square highlight transitions should be near-instant for a snappy feel.
      // The transitionDuration prop controls piece move animation only (handled
      // via FLIP in the piece layer), not the square colour change.
      transition: 'background 80ms ease, border 80ms ease, box-shadow 80ms ease',
      zIndex: isSelected ? 10 : 'auto'
    };
  };

  const handleMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (e.button !== 0) return; // Only handle left clicks
    // Left click clears user-drawn arrows, highlights, and any pending premove
    setLocalArrows([]);
    setPreviewArrow(null);
    setHighlightedSquares({});
    setPremoveAndNotify(null);

    if (!draggable) {
      return;
    }

    const piece = board[row][col];

    // Check if the piece can be moved by current player
    if (piece && canMovePiece(piece, row, col)) {
      e.preventDefault();
      e.stopPropagation();

      const rect = boardRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Record mouse down position and piece info, but don't start dragging yet
      setMouseDownPos({ x, y, piece: { piece, row, col } });
    } else if (selectedPiece) {
      // Clicking on empty square when a piece is selected - make the move
      handlePieceMove(selectedPiece.row, selectedPiece.col, row, col);
      setSelectedPiece(null);
      setPossibleMoves([]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (!draggable) return;

    const piece = board[row][col];

    // Check if the piece can be moved by current player
    if (piece && canMovePiece(piece, row, col)) {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const rect = boardRef.current!.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Record touch start position and piece info
      setMouseDownPos({ x, y, piece: { piece, row, col } });
    } else if (selectedPiece) {
      // Tapping on empty square when a piece is selected - make the move
      handlePieceMove(selectedPiece.row, selectedPiece.col, row, col);
      setSelectedPiece(null);
      setPossibleMoves([]);
    }
  };

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!draggable) {
      return;
    }

    const piece = board[row][col];

    if (selectedPiece) {
      if (selectedPiece.row === row && selectedPiece.col === col) {
        // Clicking the same square — deselect (toggle off)
        setSelectedPiece(null);
        setPossibleMoves([]);
      } else if (piece && canMovePiece(piece, row, col)) {
        // If this square is already in possibleMoves (e.g. Chess960 king→rook castling),
        // execute the move rather than switching the selection.
        const isPossibleTarget = possibleMoves.some(m => m.row === row && m.col === col);
        if (isPossibleTarget) {
          handlePieceMove(selectedPiece.row, selectedPiece.col, row, col);
          setSelectedPiece(null);
          setPossibleMoves([]);
        } else {
          // Clicked a different movable piece — switch selection (Lichess behaviour)
          setSelectedPiece({ piece, row, col });
          const moves = calculatePossibleMoves(piece, row, col);
          setPossibleMoves(moves);
        }
      } else {
        // Clicked a target square — attempt move; if illegal, handlePieceMove
        // returns early but we keep the selection alive so the user can try again
        const isPossible = possibleMoves.some(m => m.row === row && m.col === col);
        if (isPossible) {
          handlePieceMove(selectedPiece.row, selectedPiece.col, row, col);
          setSelectedPiece(null);
          setPossibleMoves([]);
        }
        // if not a legal target: do nothing — piece stays selected
      }
    } else if (piece && canMovePiece(piece, row, col)) {
      // No piece selected, clicking on a movable piece — select it
      setSelectedPiece({ piece, row, col });
      const moves = calculatePossibleMoves(piece, row, col);
      setPossibleMoves(moves);
    }
  }, [draggable, board, selectedPiece, possibleMoves, canMovePiece, calculatePossibleMoves]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePieceMove = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const sourceSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
    const targetSquare = String.fromCharCode(97 + toCol) + (8 - toRow);
    if (sourceSquare === targetSquare) return;

    const piece = board[fromRow][fromCol];

    // ── PREMOVE PATH ────────────────────────────────────────────────────────
    // If it's opponent's turn and the piece belongs to the local player, queue
    // as a premove instead of sending to the backend immediately.
    if (isPremoveCandidate(piece)) {
      const isPawn = piece?.toLowerCase() === 'p';
      const toRank = parseInt(targetSquare[1]);
      const isPlayerWhite = playerColor === 'white';
      const isPromotionRank = (isPlayerWhite && toRank === 8) || (!isPlayerWhite && toRank === 1);

      if (isPawn && isPromotionRank) {
        // Show promotion popup — handlePromotion will store the premove
        isPremovePromotionRef.current = true;
        setPromotionPopup({ from: sourceSquare, to: targetSquare, color: isPlayerWhite ? 'w' : 'b' });
        return;
      }

      setPremoveAndNotify({ from: sourceSquare, to: targetSquare });
      return;
    }
    // ── NORMAL MOVE PATH ─────────────────────────────────────────────────────

    // Chess960: king dragged onto own rook → bypass chess.js (parent handles it)
    if (piece?.toLowerCase() === 'k') {
      const targetPiece = board[toRow][toCol];
      const isOwnRook = piece === 'K' ? targetPiece === 'R' : targetPiece === 'r';
      if (isOwnRook) {
        if (onDrop) onDrop(sourceSquare as Square, targetSquare as Square);
        return;
      }
    }

    const isPawn = piece?.toLowerCase() === 'p';
    // Use chess.js to confirm legality and detect promotion for the move
    try {
      const game = new Chess(fenToUse);
      const moves = game.moves({ square: sourceSquare as Square, verbose: true }) as Move[];
      const matchedMove = moves.find((m: Move) => m.to === targetSquare);
      const isLegal = !!matchedMove;
      const isPromotionByMove = !!(matchedMove && matchedMove.promotion);

      if (!isLegal) {
        setSelectedPiece(null);
        setPossibleMoves([]);
        return;
      }

      // If move is legal and is a promotion, show promotion popup and wait for selection
      if (isPromotionByMove) {
        isPremovePromotionRef.current = false;
        setPromotionPopup({ from: sourceSquare, to: targetSquare, color: piece === 'P' ? 'w' : 'b' });
        return;
      }

      // Play sound for normal move
      if (matchedMove.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    } catch (err) {
    }
    if (onDrop) {
      const result = onDrop(sourceSquare as Square, targetSquare as Square);
      if (result === false) return;
    }
  }, [onDrop, fenToUse, board, isPremoveCandidate, playerColor]);

  const handlePromotion = useCallback((piece: string) => {
    if (!promotionPopup) return;

    const { from, to } = promotionPopup;
    setPromotionPopup(null);
    promotionOpenTimeRef.current = 0;

    // Premove promotion: store the premove with chosen piece, don't fire yet
    if (isPremovePromotionRef.current) {
      isPremovePromotionRef.current = false;
      setPremoveAndNotify({ from, to, promotion: piece });
      return;
    }

    // Check if it's a capture for sound
    try {
      const game = new Chess(fenToUse);
      const move = game.move({ from, to, promotion: piece });
      if (move && move.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    } catch (e) {
      playMoveSound();
    }

    if (onDrop) {
      const result = onDrop(from, to, piece);
      if (result === false) {
        // Move was invalid
        return;
      }
    }
  }, [promotionPopup, onDrop]);

  // Track when promotion popup opens to prevent immediate dismissal
  useEffect(() => {
    if (promotionPopup) {
      promotionOpenTimeRef.current = Date.now();
    }
  }, [promotionPopup]);

  // ── Fire premove when the position changes and it becomes the player's turn ──
  // Runs only when the FEN changes (server confirms opponent's move).
  // The premove is validated locally against the new position; if illegal it is
  // silently discarded (standard premove behavior).
  useEffect(() => {
    if (!premove || !playerColor || !allowPremove) return;
    try {
      const game = new Chess(fenToUse);
      const turn = game.turn(); // 'w' | 'b'
      const isPlayerTurn =
        (playerColor === 'white' && turn === 'w') ||
        (playerColor === 'black' && turn === 'b');
      if (!isPlayerTurn) return; // still opponent's turn — keep waiting

      // It's our turn: validate the queued premove
      const { from, to, promotion } = premove;
      const legalMoves = game.moves({ square: from as Square, verbose: true }) as Move[];
      const match = legalMoves.find(
        (m: Move) => m.to === to && (!promotion || m.promotion === promotion)
      );

      setPremoveAndNotify(null); // clear regardless — don't re-fire

      if (!match) return; // premove turned out to be illegal — discard

      // Fire immediately (zero user-time consumed since move was pre-registered)
      if (onDrop) {
        onDrop(from, to, promotion || match.promotion || undefined);
      }
    } catch {
      setPremoveAndNotify(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fenToUse]); // deliberately exclude premove/onDrop from deps — only re-run when FEN updates

  // Right-click drag handlers for drawing arrows
  useEffect(() => {
    const handleRightMouseMove = (e: MouseEvent) => {
      if (!arrowDragRef.current || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const sq = getSquareFromBoardCoords(e.clientX - rect.left, e.clientY - rect.top);
      if (sq && sq !== arrowDragRef.current.square) {
        setPreviewArrow({ from: arrowDragRef.current.square, to: sq, color: arrowDragRef.current.color });
      } else {
        setPreviewArrow(null);
      }
    };

    const handleRightMouseUp = (e: MouseEvent) => {
      if (e.button !== 2 || !arrowDragRef.current) return;
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const sq = getSquareFromBoardCoords(e.clientX - rect.left, e.clientY - rect.top);
        if (sq && sq !== arrowDragRef.current.square) {
          // It was a drag: draw arrow
          const from = arrowDragRef.current.square;
          const to = sq;
          const color = arrowDragRef.current.color;
          setLocalArrows(prev => {
            const idx = prev.findIndex(a => a.from === from && a.to === to);
            if (idx >= 0) return prev.filter((_, i) => i !== idx);
            return [...prev, { from, to, color }];
          });
        } else if (sq && sq === arrowDragRef.current.square) {
          // It was a click (no drag): toggle square highlight
          const color = arrowDragRef.current.color;
          setHighlightedSquares(prev => {
            if (prev[sq] === color) {
              const next = { ...prev };
              delete next[sq];
              return next;
            }
            return { ...prev, [sq]: color };
          });
        }
      }
      setPreviewArrow(null);
      arrowDragRef.current = null;
    };

    document.addEventListener('mousemove', handleRightMouseMove);
    document.addEventListener('mouseup', handleRightMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleRightMouseMove);
      document.removeEventListener('mouseup', handleRightMouseUp);
    };
  }, [getSquareFromBoardCoords]);

  // Global mouse and touch event handlers to prevent piece sticking
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!mouseDownPos) return;

      const rect = boardRef.current!.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // Check if mouse has moved enough to start dragging
      const deltaX = Math.abs(currentX - mouseDownPos.x);
      const deltaY = Math.abs(currentY - mouseDownPos.y);
      const dragThreshold = 10; // pixels - increased for smoother interaction

      if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
        // Start dragging
        setIsDragging(true);
        setDraggedPiece(mouseDownPos.piece);
        setDragPosition({ x: currentX, y: currentY });
        // Clear selection when starting drag
        setSelectedPiece(null);
        setPossibleMoves([]);
      } else if (isDragging) {
        // Continue dragging
        setDragPosition({ x: currentX, y: currentY });
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!mouseDownPos) return;

      e.preventDefault();
      const touch = e.touches[0];
      const rect = boardRef.current!.getBoundingClientRect();
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;

      // Check if touch has moved enough to start dragging
      const deltaX = Math.abs(currentX - mouseDownPos.x);
      const deltaY = Math.abs(currentY - mouseDownPos.y);
      const dragThreshold = 8; // pixels - reduced for easier touch interaction on tablets

      if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
        // Start dragging
        setIsDragging(true);
        setDraggedPiece(mouseDownPos.piece);
        setDragPosition({ x: currentX, y: currentY });
        // Clear selection when starting drag
        setSelectedPiece(null);
        setPossibleMoves([]);
      } else if (isDragging) {
        // Continue dragging
        setDragPosition({ x: currentX, y: currentY });
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!mouseDownPos) return;

      const rect = boardRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging) {
        // Complete the drag
        // Adjust for border (2px)
        const adjustedX = x - 2;
        const adjustedY = y - 2;
        if (adjustedX >= 0 && adjustedX <= boardWidth && adjustedY >= 0 && adjustedY <= boardWidth) {
          const col = Math.floor(adjustedX / squareSize);
          const row = Math.floor(adjustedY / squareSize);

          // Adjust for flipped board
          const actualRow = isFlipped ? 7 - row : row;
          const actualCol = isFlipped ? 7 - col : col;

          if (actualRow >= 0 && actualRow < 8 && actualCol >= 0 && actualCol < 8) {
            handlePieceMove(draggedPiece!.row, draggedPiece!.col, actualRow, actualCol);
          }
        }
      } else {
        // This was a click/tap, not a drag - handle as selection
        // Adjust for border (2px)
        const adjustedX = mouseDownPos.x - 2;
        const adjustedY = mouseDownPos.y - 2;
        const col = Math.floor(adjustedX / squareSize);
        const row = Math.floor(adjustedY / squareSize);

        // Adjust for flipped board
        const actualRow = isFlipped ? 7 - row : row;
        const actualCol = isFlipped ? 7 - col : col;

        if (actualRow >= 0 && actualRow < 8 && actualCol >= 0 && actualCol < 8) {
          handleSquareClick(actualRow, actualCol);
        }
      }

      // Reset drag state
      setDraggedPiece(null);
      setIsDragging(false);
      setMouseDownPos(null);
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!mouseDownPos) return;

      e.preventDefault();

      if (isDragging) {
        // Complete the drag
        const touch = e.changedTouches[0];
        const rect = boardRef.current!.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (x >= 0 && x <= boardWidth && y >= 0 && y <= boardWidth) {
          const col = Math.floor(x / squareSize);
          const row = Math.floor(y / squareSize);

          // Adjust for flipped board
          const actualRow = isFlipped ? 7 - row : row;
          const actualCol = isFlipped ? 7 - col : col;

          if (actualRow >= 0 && actualRow < 8 && actualCol >= 0 && actualCol < 8) {
            handlePieceMove(draggedPiece!.row, draggedPiece!.col, actualRow, actualCol);
          }
        }
      } else {
        // This was a tap, not a drag - handle as selection
        const col = Math.floor(mouseDownPos.x / squareSize);
        const row = Math.floor(mouseDownPos.y / squareSize);

        // Adjust for flipped board
        const actualRow = isFlipped ? 7 - row : row;
        const actualCol = isFlipped ? 7 - col : col;

        if (actualRow >= 0 && actualRow < 8 && actualCol >= 0 && actualCol < 8) {
          handleSquareClick(actualRow, actualCol);
        }
      }

      // Reset drag state
      setDraggedPiece(null);
      setIsDragging(false);
      setMouseDownPos(null);
    };

    if (mouseDownPos) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [mouseDownPos, isDragging, draggedPiece, boardWidth, squareSize, handlePieceMove, handleSquareClick]);

  const handleMouseMove = () => {
    // Mouse move is now handled globally in useEffect
  };

  const handleMouseUp = () => {
    // Mouse up is now handled globally in useEffect
  };

  const renderSquare = (row: number, col: number) => {
    const piece = board[row][col];
    const isDraggedSquare = draggedPiece && draggedPiece.row === row && draggedPiece.col === col;
    const squareStyle = getSquareStyle(row, col);

    const squareId = String.fromCharCode(97 + col) + (8 - row);

    // For premove ghost: resolve the piece that is being premoved
    const premoveGhostPiece = (() => {
      if (!premove || premove.to !== squareId) return null;
      const fc = premove.from.charCodeAt(0) - 97;
      const fr = 8 - parseInt(premove.from[1]);
      return (board[fr] && board[fr][fc]) || null;
    })();
    const isPremoveFrom = premove?.from === squareId;

    return (
      <div
        key={`${row}-${col}`}
        data-square={squareId}
        style={squareStyle}
        onMouseDown={(e) => {
          if (e.button === 0) e.stopPropagation();
          handleMouseDown(e, row, col);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onSquareRightClick) {
            onSquareRightClick(squareId, e);
          }
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          handleTouchStart(e, row, col);
        }}
      >
        {!isDraggedSquare && piece && (
          <div
            ref={(el) => {
              if (el) pieceRefs.current[squareId] = el;
              else delete pieceRefs.current[squareId];
            }}
            style={{
              width: `${squareSize * 0.8}px`,
              height: `${squareSize * 0.8}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              transition: `transform ${transitionDuration || 600}ms cubic-bezier(0.33, 1, 0.68, 1)`,
              userSelect: 'none',
              // Dim the premove source piece to indicate it is "in transit"
              opacity: isPremoveFrom ? 0.45 : 1
            }}
          >
            <img
              src={getPieceSrc(pieceToCode(piece))}
              alt={`${piece} piece`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
              draggable={false}
            />
          </div>
        )}
        {/* Premove ghost piece: show the moving piece on the destination square */}
        {premoveGhostPiece && getPieceSrc(pieceToCode(premoveGhostPiece)) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 5,
              opacity: 0.7
            }}
          >
            <img
              src={getPieceSrc(pieceToCode(premoveGhostPiece))}
              alt="premove"
              style={{
                width: `${squareSize * 0.8}px`,
                height: `${squareSize * 0.8}px`,
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
              draggable={false}
            />
          </div>
        )}
        {/* Right-click highlight — inset ring so the square colour shows through */}
        {highlightedSquares[squareId] && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              border: `${Math.max(3, Math.round(squareSize / 13))}px solid ${highlightedSquares[squareId]}`,
              boxSizing: 'border-box',
              borderRadius: '1px',
              pointerEvents: 'none',
              zIndex: 6
            }}
          />
        )}
      </div>
    );
  };

  const renderCoordinates = () => {
    if (!showCoordinates) return null;

    const labelSize = squareSize * 0.3; // Size of coordinate labels
    const padding = coordinateSize; // Half of the extra space
    
    // Adjust logic if board is actually (boardWidth - 4) + 4 = boardWidth
    // The board div is centered.
    // Offset = (TotalWidth - BoardRealWidth) / 2
    // TotalWidth = boardWidth + coordinateSize * 2
    // BoardRealWidth = boardWidth
    // Offset = coordinateSize
    
    const boardOffset = coordinateSize;

    const labelStyle: React.CSSProperties = {
      position: 'absolute',
      fontSize: `${labelSize}px`,
      fontWeight: 'bold',
      color: '#8B4513',
      textAlign: 'center',
      userSelect: 'none',
      pointerEvents: 'none',
      zIndex: 10
    };

    const coordinates: JSX.Element[] = [];

    // File labels (a-h) - flip if black orientation
    const files = isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    files.forEach((file, col) => {
      // Bottom labels
      if (effectiveCoordinateSides.includes('bottom')) {
        coordinates.push(
          <div
            key={`bottom-${file}`}
            style={{
              ...labelStyle,
              bottom: coordinatesInside ? `${coordinateSize + 2}px` : '2px',
              left: `${boardOffset + col * squareSize + squareSize / 2 - labelSize / 2}px`,
              width: `${labelSize}px`,
              height: `${labelSize}px`,
              lineHeight: `${labelSize}px`
            }}
          >
            {file}
          </div>
        );
      }

      // Top labels
      if (effectiveCoordinateSides.includes('top')) {
        coordinates.push(
          <div
            key={`top-${file}`}
            style={{
              ...labelStyle,
              top: coordinatesInside ? `${coordinateSize + 2}px` : '2px',
              left: `${boardOffset + col * squareSize + squareSize / 2 - labelSize / 2}px`,
              width: `${labelSize}px`,
              height: `${labelSize}px`,
              lineHeight: `${labelSize}px`
            }}
          >
            {file}
          </div>
        );
      }
    });

    // Rank labels (1-8) - flip if black orientation
    const ranks = isFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
    ranks.forEach((rank, row) => {
      // Left labels
      if (effectiveCoordinateSides.includes('left')) {
        coordinates.push(
          <div
            key={`left-${rank}`}
            style={{
              ...labelStyle,
              left: coordinatesInside ? `${coordinateSize + 2}px` : '2px',
              top: `${boardOffset + row * squareSize + squareSize / 2 - labelSize / 2}px`,
              width: `${labelSize}px`,
              height: `${labelSize}px`,
              lineHeight: `${labelSize}px`
            }}
          >
            {rank}
          </div>
        );
      }

      // Right labels
      if (effectiveCoordinateSides.includes('right')) {
        coordinates.push(
          <div
            key={`right-${rank}`}
            style={{
              ...labelStyle,
              right: coordinatesInside ? `${coordinateSize + 2}px` : '2px',
              top: `${boardOffset + row * squareSize + squareSize / 2 - labelSize / 2}px`,
              width: `${labelSize}px`,
              height: `${labelSize}px`,
              lineHeight: `${labelSize}px`
            }}
          >
            {rank}
          </div>
        );
      }
    });

    return coordinates;
  };

  const renderBoard = () => {
    const squares: JSX.Element[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // If board is flipped (black orientation), render from black's perspective
        const displayRow = isFlipped ? 7 - row : row;
        const displayCol = isFlipped ? 7 - col : col;
        squares.push(renderSquare(displayRow, displayCol));
      }
    }
    return squares;
  };

  // FLIP animation: run after each render to animate pieces from previous to current positions
  useLayoutEffect(() => {
    // If transitionDuration is zero, skip FLIP animation entirely
    if (!transitionDuration || transitionDuration <= 0) {
      const currentPositions: Record<string, { left: number; top: number }> = {};
      Object.keys(pieceRefs.current).forEach(square => {
        const el = pieceRefs.current[square];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        currentPositions[square] = { left: rect.left, top: rect.top };
      });
      prevPositions.current.positions = currentPositions;
      prevPositions.current.board = board;
      return; // skip FLIP animation
    }
    // Capture current positions for all piece elements
    const currentPositions: Record<string, { left: number; top: number }> = {};
    Object.keys(pieceRefs.current).forEach(square => {
      const el = pieceRefs.current[square];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      currentPositions[square] = { left: rect.left, top: rect.top };
    });

    // Build maps of previous and current piece locations by piece type
    const prevBoard = prevPositions.current.board || [];
    const buildPieceMap = (boardArr: (string | null)[][]) => {
      const map: Record<string, string[]> = {};
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const pc = boardArr[r] && boardArr[r][c] ? boardArr[r][c] : null;
          if (!pc) continue;
          const square = String.fromCharCode(97 + c) + (8 - r);
          if (!map[pc]) map[pc] = [];
          map[pc].push(square);
        }
      }
      return map;
    };

    const prevPieceMap = buildPieceMap(prevBoard);
    const currPieceMap = buildPieceMap(board);

    // For each piece type, pair previous squares to current squares by index
    Object.keys(currPieceMap).forEach(pc => {
      const prevSquares = prevPieceMap[pc] || [];
      const currSquares = currPieceMap[pc] || [];
      const pairCount = Math.min(prevSquares.length, currSquares.length);
      for (let i = 0; i < pairCount; i++) {
        const from = prevSquares[i];
        const to = currSquares[i];
        if (from === to) continue; // didn't move

        const el = pieceRefs.current[to];
        const prevPos = (prevPositions.current.positions) ? prevPositions.current.positions[from] : null;
        const currPos = currentPositions[to];
        if (el && prevPos && currPos) {
          const dx = prevPos.left - currPos.left;
          const dy = prevPos.top - currPos.top;
          if (dx !== 0 || dy !== 0) {
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            el.offsetWidth;
            requestAnimationFrame(() => {

el.style.transition = `transform ${transitionDuration}ms cubic-bezier(0.33, 1, 0.68, 600)`;
              el.style.transform = '';
            });
          }
        }
      }
    });

    // Save current positions and board for next run
    prevPositions.current.positions = currentPositions;
    prevPositions.current.board = board;
  }, [position, transitionDuration]);

  const renderArrowShape = (arrow: { from: string; to: string; color?: string }, key: string | number, opacity: number) => {
    let fromCol = arrow.from.charCodeAt(0) - 97;
    let fromRow = 8 - parseInt(arrow.from[1]);
    let toCol = arrow.to.charCodeAt(0) - 97;
    let toRow = 8 - parseInt(arrow.to[1]);
    if (isFlipped) {
      fromCol = 7 - fromCol; fromRow = 7 - fromRow;
      toCol = 7 - toCol; toRow = 7 - toRow;
    }
    const fromX = (fromCol + 0.5) * squareSize;
    const fromY = (fromRow + 0.5) * squareSize;
    const toX = (toCol + 0.5) * squareSize;
    const toY = (toRow + 0.5) * squareSize;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const strokeW = squareSize * 0.14;
    const headLen = squareSize * 0.38;
    const headHalfAngle = Math.PI / 5;
    const startX = fromX + Math.cos(angle) * squareSize * 0.25;
    const startY = fromY + Math.sin(angle) * squareSize * 0.25;
    const endX = toX - Math.cos(angle) * headLen * 0.45;
    const endY = toY - Math.sin(angle) * headLen * 0.45;
    const bx = toX - headLen * Math.cos(angle - headHalfAngle);
    const by = toY - headLen * Math.sin(angle - headHalfAngle);
    const cx = toX - headLen * Math.cos(angle + headHalfAngle);
    const cy = toY - headLen * Math.sin(angle + headHalfAngle);
    const color = arrow.color || '#4caf50';
    return (
      <g key={key} opacity={opacity}>
        <line
          x1={startX} y1={startY}
          x2={endX} y2={endY}
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        <polygon
          points={`${toX},${toY} ${bx},${by} ${cx},${cy}`}
          fill={color}
        />
      </g>
    );
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          setLocalFlipped(prev => !prev);
        }
      }}
      style={{
        position: 'relative',
        width: showCoordinates ? `${boardWidth + coordinateSize * 2}px` : `${boardWidth}px`,
        height: showCoordinates ? `${boardWidth + coordinateSize * 2}px` : `${boardWidth}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px',
        overflow: 'hidden',
        outline: 'none'
      }}
    >
      <div
        ref={boardRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows: `repeat(8, ${squareSize}px)`,
          border: '2px solid #8B4513',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          width: `${boardWidth - 4}px`,
          height: `${boardWidth - 4}px`,
          touchAction: 'none',
          ...boardStyle
        }}
        // NOTE: intentionally NO onMouseLeave deselect.
        // Kids (and everyone) found it frustrating that a click-selected piece
        // got unselected the moment the cursor wandered off the board, forcing
        // them to re-click. A selected piece now stays selected until the user
        // clicks a destination, re-clicks the same piece (toggle off), or picks
        // another piece — matching Lichess/Chess.com behaviour.
        onMouseDown={(e) => {
          if (e.button === 2) {
            e.preventDefault();
            const rect = boardRef.current!.getBoundingClientRect();
            const sq = getSquareFromBoardCoords(e.clientX - rect.left, e.clientY - rect.top);
            if (sq) {
              const color = e.ctrlKey ? '#f44336' : e.altKey ? '#2196f3' : e.shiftKey ? '#ffeb3b' : '#4caf50';
              arrowDragRef.current = { square: sq, color };
            }
          }
        }}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
      >
        {renderBoard()}

        {/* Render dragged piece */}
        {draggedPiece && (
          <div
            style={{
              position: 'absolute',
              left: dragPosition.x - squareSize / 2, // Center the piece
              top: dragPosition.y - squareSize / 2,
              pointerEvents: 'none',
              zIndex: 1000,
              opacity: 0.8,
              width: `${squareSize}px`,
              height: `${squareSize}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
          >
            <img
              src={getPieceSrc(pieceToCode(draggedPiece.piece))}
              alt={`${draggedPiece.piece} piece`}
              style={{
                width: '80%',
                height: '80%',
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Render coordinate labels */}
      {renderCoordinates()}

      {/* Promotion popup */}
      {promotionPopup && (
        <>
          {/* Backdrop overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 999,
            }}
            onClick={() => {
              const timeSinceOpen = Date.now() - promotionOpenTimeRef.current;
              if (timeSinceOpen > 200) {
                setPromotionPopup(null);
              }
            }}
          />
          
          {/* Promotion selection — Lichess-style cascade anchored at the promotion square */}
          {(() => {
            // Map the promotion target square to its on-screen grid position,
            // accounting for board flip and coordinate gutter.
            const file = promotionPopup.to.charCodeAt(0) - 97; // a..h -> 0..7
            const rank = parseInt(promotionPopup.to[1], 10);   // 1..8
            const boardRow = 8 - rank;
            const boardCol = file;
            const screenCol = isFlipped ? 7 - boardCol : boardCol;
            const screenRow = isFlipped ? 7 - boardRow : boardRow;
            // Promotion squares sit on the edge ranks; cascade INTO the board.
            const goingDown = screenRow <= 3;
            const offset = showCoordinates ? coordinateSize : 0;
            const colLeft = offset + screenCol * squareSize;
            const startTop = offset + screenRow * squareSize;

            return ['q', 'r', 'b', 'n'].map((piece, i) => {
              const top = goingDown
                ? startTop + i * squareSize
                : startTop - i * squareSize;
              return (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePromotion(piece);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${colLeft}px`,
                    width: `${squareSize}px`,
                    height: `${squareSize}px`,
                    padding: 0,
                    margin: 0,
                    background: '#f7f7f7',
                    border: 'none',
                    borderRadius: '50%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.55)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.12s ease, background 0.12s ease',
                    zIndex: 1000,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.transform = 'scale(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f7f7f7';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={getPieceSrc(`${promotionPopup.color}${piece.toUpperCase()}`)}
                    alt={piece}
                    style={{
                      width: `${squareSize * 0.86}px`,
                      height: `${squareSize * 0.86}px`,
                      pointerEvents: 'none',
                    }}
                  />
                </button>
              );
            });
          })()}
        </>
      )}

      {/* Render arrows - external prop + user-drawn + preview */}
      <svg
        style={{
          position: 'absolute',
          top: showCoordinates ? coordinateSize : 0,
          left: showCoordinates ? coordinateSize : 0,
          width: boardWidth - 4,
          height: boardWidth - 4,
          pointerEvents: 'none',
          zIndex: 20
        }}
      >
        {arrows.map((arrow, i) => renderArrowShape(arrow, `ext-${i}`, 0.85))}
        {localArrows.map((arrow, i) => renderArrowShape(arrow, `local-${i}`, 0.85))}
        {previewArrow && renderArrowShape(previewArrow, 'preview', 0.45)}
      </svg>
    </div>
  );
};

export default Chessboard;
