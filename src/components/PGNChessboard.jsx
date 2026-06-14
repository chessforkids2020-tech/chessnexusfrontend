// src/components/PGNChessboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';

const PGNChessboard = ({ pgn, boardWidth = 400, orientation = 'white', coordinateSides }) => {
  const [chess, setChess] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (pgn) {
      try {
        const newChess = new Chess();
        newChess.loadPgn(pgn);
        const moves = newChess.history({ verbose: true });
        
        // Build history of FENs
        const fens = [];
        const tempChess = new Chess();
        fens.push({ fen: tempChess.fen(), move: 'Start' });
        
        for (const move of moves) {
          tempChess.move(move);
          fens.push({ fen: tempChess.fen(), move: move.san });
        }
        
        setHistory(fens);
        setCurrentIndex(0); // Start at the beginning
        setChess(new Chess(fens[0].fen));
      } catch (err) {
        console.error('Failed to load PGN:', err);
      }
    }
  }, [pgn]);

  const goToMove = (index) => {
    if (index >= 0 && index < history.length) {
      setCurrentIndex(index);
      setChess(new Chess(history[index].fen));
    }
  };

  const nextMove = () => goToMove(currentIndex + 1);
  const prevMove = () => goToMove(currentIndex - 1);
  const firstMove = () => goToMove(0);
  const lastMove = () => goToMove(history.length - 1);

  const currentMove = useMemo(() => {
    if (currentIndex > 0 && history[currentIndex]) {
      // Find the previous FEN to determine the last move
      const prevFen = history[currentIndex - 1].fen;
      const currentFen = history[currentIndex].fen;
      
      const tempChess = new Chess(prevFen);
      const moves = tempChess.moves({ verbose: true });
      const foundMove = moves.find(m => {
        const t = new Chess(prevFen);
        t.move(m);
        return t.fen() === currentFen;
      });

      if (foundMove) {
        return { from: foundMove.from, to: foundMove.to };
      }
    }
    return null;
  }, [currentIndex, history]);

  return (
    <div className="pgn-chessboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <Chessboard 
        position={chess.fen()} 
        boardWidth={boardWidth} 
        orientation={orientation}
        draggable={false}
        lastMove={currentMove}
        coordinateSides={coordinateSides}
      />
      
      <div className="pgn-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={firstMove} 
          disabled={currentIndex <= 0}
          className="pgn-btn"
          title="First Move"
        >
          «
        </button>
        <button 
          onClick={prevMove} 
          disabled={currentIndex <= 0}
          className="pgn-btn"
          title="Previous Move"
        >
          ‹
        </button>
        
        <div className="pgn-move-info" style={{ minWidth: '100px', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>
          {currentIndex === 0 ? 'Starting Position' : 
           (currentIndex > 0 && history[currentIndex]) ? `Move ${currentIndex}: ${history[currentIndex].move}` : 
           'No PGN Loaded'}
        </div>
        
        <button 
          onClick={nextMove} 
          disabled={currentIndex >= history.length - 1}
          className="pgn-btn"
          title="Next Move"
        >
          ›
        </button>
        <button 
          onClick={lastMove} 
          disabled={currentIndex >= history.length - 1}
          className="pgn-btn"
          title="Last Move"
        >
          »
        </button>
      </div>

      <div className="pgn-history-list" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '5px', 
        maxHeight: '100px', 
        overflowY: 'auto', 
        padding: '10px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        width: '100%',
        justifyContent: 'center'
      }}>
        {history.map((h, i) => (
          <span 
            key={i} 
            onClick={() => goToMove(i)}
            style={{ 
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '13px',
              background: i === currentIndex ? '#06b6d4' : 'transparent',
              color: i === currentIndex ? '#000' : '#9ca3af',
              border: i === currentIndex ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {i === 0 ? 'Start' : h.move}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PGNChessboard;
