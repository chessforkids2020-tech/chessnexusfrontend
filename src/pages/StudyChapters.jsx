import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import useResponsiveBoardSize from '../hooks/useResponsiveBoardSize';
import api from '../api';
import Chessboard from '../components/Chessboard';
import { Chess } from 'chess.js';

const StudyChapters = () => {
  const { studyId } = useParams();

  // Responsive board size
  const boardRef = useRef(null);
  const boardSize = useResponsiveBoardSize(boardRef, 520, 400);

  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [chess, setChess] = useState(new Chess());
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await api.get(`/api/study/${studyId}/chapters`);
        setChapters(response.data || []);
        if ((response.data || []).length > 0) {
          loadChapter(response.data[0]);
        }
      } catch (err) {
        setError('Failed to load chapters');
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [studyId]);

  const loadChapter = (chapter) => {
    const newChess = new Chess(chapter.fen);
    setChess(newChess);
    setMoves([]);
  };

  const handleMove = async (sourceSquare, targetSquare, promotion) => {
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion || 'q'
      });

      if (move) {
        const newMoves = [...moves, move.san];
        setMoves(newMoves);

        // Save move to backend
        await api.post('/api/study/move', {
          studyId,
          chapterId: chapters[currentChapter]._id,
          moveNumber: newMoves.length,
          move: move.san
        });

        return true;
      }
    } catch (err) {
    }
    return false;
  };

  const selectChapter = (index) => {
    setCurrentChapter(index);
    loadChapter(chapters[index]);
  };

  const nextChapter = () => {
    if (currentChapter < chapters.length - 1) {
      selectChapter(currentChapter + 1);
    } else {
      alert('Study completed!');
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-accent-2) 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-2xl)',
      padding: '20px',
      boxShadow: '0 20px 40px var(--color-black-a20)',
      display: 'flex',
      gap: '20px',
      height: '80vh',
    },
    sidebar: {
      width: '250px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      overflowY: 'auto',
    },
    chapterItem: {
      padding: '12px',
      marginBottom: '8px',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      background: 'var(--color-surface)',
      border: '2px solid var(--color-surface-2)',
      transition: 'all 0.2s ease',
    },
    chapterItemActive: {
      background: 'var(--color-success)',
      color: 'var(--color-text)',
      borderColor: 'var(--color-success)',
    },
    center: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
    },
    chessboardContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    nextButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, var(--color-accent-2), var(--color-accent-2))',
      color: 'var(--color-text)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    rightPanel: {
      width: '300px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      overflowY: 'auto',
    },
    movesList: {
      maxHeight: '400px',
      overflowY: 'auto',
    },
    moveItem: {
      padding: '8px',
      marginBottom: '4px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'monospace',
    },
    loading: {
      textAlign: 'center',
      color: 'var(--color-text-faint)',
      fontSize: '18px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: 'var(--color-danger)',
      fontSize: '18px',
      padding: '40px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading study...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Left Sidebar - Chapters */}
        <div style={styles.sidebar}>
          <h3 style={{ marginTop: 0, color: 'var(--color-success)' }}>Chapters</h3>
          {chapters.map((chapter, index) => (
            <div
              key={chapter._id}
              style={{
                ...styles.chapterItem,
                ...(index === currentChapter ? styles.chapterItemActive : {})
              }}
              onClick={() => selectChapter(index)}
            >
              <div style={{ fontWeight: '600' }}>
                Chapter {chapter.chapterNumber}
              </div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>
                {chapter.title}
              </div>
              {chapter.description && (
                <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-text-faint)', lineHeight: '1.3' }}>
                  {chapter.description}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Center - Chessboard */}
        <div style={styles.center}>
          <div ref={boardRef} style={{ ...styles.chessboardContainer, width: '100%' }}>
            <Chessboard
              position={chess.fen()}
              onDrop={handleMove}
              boardWidth={boardSize}
              draggable={true}
            />
          </div>
          <button style={styles.nextButton} onClick={nextChapter}>
            {currentChapter < chapters.length - 1 ? 'Next Chapter' : 'Complete Study'}
          </button>
        </div>

        {/* Right Panel - Moves */}
        <div style={styles.rightPanel}>
          <h3 style={{ marginTop: 0, color: 'var(--color-success)' }}>Your Moves</h3>
          <div style={styles.movesList}>
            {moves.map((move, index) => (
              <div key={index} style={styles.moveItem}>
                {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyChapters;