import React, { useState, useEffect } from 'react';
import api from '../../api';
import Chessboard from '../../components/Chessboard';
import { Chess } from 'chess.js';

const AdminTestManagement = () => {
  // Studies
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showStudyForm, setShowStudyForm] = useState(false);
  const [editingStudy, setEditingStudy] = useState(null);
  const [studyForm, setStudyForm] = useState({ title: '', description: '', order: 0, studyType: 'basics' });

  // Study type options
  const studyTypeOptions = [
    { value: 'basics', label: '📚 Basics Study' },
    { value: 'positional', label: '♟️ Positional Study' }
  ];

  // Chapters
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', chapterNumber: 1 });

  // Puzzles
  const [puzzles, setPuzzles] = useState([]);
  const [showPuzzleForm, setShowPuzzleForm] = useState(false);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [puzzleForm, setPuzzleForm] = useState({ 
    puzzleNumber: 1, 
    title: '', 
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
    solutionUCI: '', 
    description: '' 
  });
  const [previewChess, setPreviewChess] = useState(new Chess());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchStudies();
  }, []);

  useEffect(() => {
    if (puzzleForm.fen) {
      try {
        const chess = new Chess(puzzleForm.fen);
        setPreviewChess(chess);
      } catch (e) {
        // Invalid FEN
      }
    }
  }, [puzzleForm.fen]);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // ===== STUDY FUNCTIONS =====
  const fetchStudies = async () => {
    try {
      const response = await api.get('/api/testpuzzle/admin/studies');
      setStudies(response.data);
    } catch (err) {
      showMessage('Failed to load studies', true);
    } finally {
      setLoading(false);
    }
  };

  const handleStudySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudy) {
        await api.put(`/api/testpuzzle/admin/studies/${editingStudy._id}`, studyForm);
        showMessage('Study updated successfully');
      } else {
        await api.post('/api/testpuzzle/admin/studies', studyForm);
        showMessage('Study created successfully');
      }
      setShowStudyForm(false);
      setEditingStudy(null);
      setStudyForm({ title: '', description: '', order: 0, studyType: 'basics' });
      fetchStudies();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to save study', true);
    }
  };

  const handleDeleteStudy = async (studyId) => {
    if (!confirm('Delete this study? This will delete ALL chapters and puzzles in it.')) return;
    try {
      await api.delete(`/api/testpuzzle/admin/studies/${studyId}`);
      showMessage('Study deleted successfully');
      if (selectedStudy === studyId) {
        setSelectedStudy(null);
        setChapters([]);
        setSelectedChapter(null);
        setPuzzles([]);
      }
      fetchStudies();
    } catch (err) {
      showMessage('Failed to delete study', true);
    }
  };

  // ===== CHAPTER FUNCTIONS =====
  const fetchChapters = async (studyId) => {
    try {
      const response = await api.get(`/api/testpuzzle/admin/studies/${studyId}/chapters`);
      setChapters(response.data);
      setSelectedStudy(studyId);
      setSelectedChapter(null);
      setPuzzles([]);
    } catch (err) {
      showMessage('Failed to load chapters', true);
    }
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChapter) {
        await api.put(`/api/testpuzzle/admin/chapters/${editingChapter._id}`, chapterForm);
        showMessage('Chapter updated successfully');
      } else {
        await api.post(`/api/testpuzzle/admin/studies/${selectedStudy}/chapters`, chapterForm);
        showMessage('Chapter created successfully');
      }
      setShowChapterForm(false);
      setEditingChapter(null);
      setChapterForm({ title: '', description: '', chapterNumber: chapters.length + 1 });
      fetchChapters(selectedStudy);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to save chapter', true);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm('Delete this chapter? This will delete ALL puzzles in it.')) return;
    try {
      await api.delete(`/api/testpuzzle/admin/chapters/${chapterId}`);
      showMessage('Chapter deleted successfully');
      if (selectedChapter === chapterId) {
        setSelectedChapter(null);
        setPuzzles([]);
      }
      fetchChapters(selectedStudy);
    } catch (err) {
      showMessage('Failed to delete chapter', true);
    }
  };

  // ===== PUZZLE FUNCTIONS =====
  const fetchPuzzles = async (chapterId) => {
    try {
      const response = await api.get(`/api/testpuzzle/admin/chapters/${chapterId}/puzzles`);
      setPuzzles(response.data);
      setSelectedChapter(chapterId);
    } catch (err) {
      showMessage('Failed to load puzzles', true);
    }
  };

  const handlePuzzleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPuzzle) {
        await api.put(`/api/testpuzzle/admin/puzzles/${editingPuzzle._id}`, puzzleForm);
        showMessage('Puzzle updated successfully');
      } else {
        await api.post(`/api/testpuzzle/admin/chapters/${selectedChapter}/puzzles`, puzzleForm);
        showMessage('Puzzle created successfully');
      }
      setShowPuzzleForm(false);
      setEditingPuzzle(null);
      setPuzzleForm({ 
        puzzleNumber: puzzles.length + 1, 
        title: '', 
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
        solutionUCI: '', 
        description: '' 
      });
      fetchPuzzles(selectedChapter);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to save puzzle', true);
    }
  };

  const handleDeletePuzzle = async (puzzleId) => {
    if (!confirm('Delete this puzzle?')) return;
    try {
      await api.delete(`/api/testpuzzle/admin/puzzles/${puzzleId}`);
      showMessage('Puzzle deleted successfully');
      fetchPuzzles(selectedChapter);
    } catch (err) {
      showMessage('Failed to delete puzzle', true);
    }
  };

  // ===== STYLES =====
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1.5fr',
      gap: '20px',
    },
    panel: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    panelTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxHeight: '500px',
      overflowY: 'auto',
    },
    listItem: {
      background: 'rgba(38, 38, 38, 0.8)',
      borderRadius: '10px',
      padding: '12px 15px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent',
    },
    listItemActive: {
      background: 'rgba(245, 158, 11, 0.2)',
      border: '1px solid #f59e0b',
    },
    listItemTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#fff',
    },
    listItemMeta: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      color: '#fff',
    },
    secondaryBtn: {
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    dangerBtn: {
      background: '#ef4444',
      color: '#fff',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#9ca3af',
    },
    input: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      fontSize: '14px',
    },
    textarea: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: '#171717',
      borderRadius: '16px',
      padding: '25px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '20px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    },
    alert: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '15px',
      fontSize: '14px',
    },
    alertError: {
      background: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid #ef4444',
      color: '#fca5a5',
    },
    alertSuccess: {
      background: 'rgba(34, 197, 94, 0.2)',
      border: '1px solid #22c55e',
      color: '#86efac',
    },
    actions: {
      display: 'flex',
      gap: '8px',
      marginTop: '8px',
    },
    smallBtn: {
      padding: '4px 10px',
      fontSize: '12px',
      borderRadius: '6px',
    },
    chessboardContainer: {
      width: '200px',
      margin: '10px 0',
    },
    puzzleCard: {
      display: 'flex',
      gap: '15px',
      alignItems: 'flex-start',
    },
    puzzleInfo: {
      flex: 1,
    },
    uciCode: {
      fontFamily: 'monospace',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#f59e0b',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.container, textAlign: 'center', color: '#fff', paddingTop: '100px' }}>
          Loading...
        </div>
      </div>
    );
  }

  const currentStudy = studies.find(s => s._id === selectedStudy);
  const currentChapter = chapters.find(c => c._id === selectedChapter);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🧩 Test Puzzle Management</h1>
        </div>

        {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
        {success && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{success}</div>}

        <div style={styles.grid}>
          {/* Studies Panel */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              <span>📚 Studies</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>
                (from Study Management)
              </span>
            </div>
            <div style={styles.list}>
              {studies.map(study => (
                <div
                  key={study._id}
                  style={{
                    ...styles.listItem,
                    ...(selectedStudy === study._id ? styles.listItemActive : {})
                  }}
                  onClick={() => fetchChapters(study._id)}
                >
                  <div style={styles.listItemTitle}>{study.title}</div>
                  <div style={styles.listItemMeta}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      marginRight: '8px',
                      background: study.studyType === 'basics' ? '#10b98133' : '#3b82f633',
                      color: study.studyType === 'basics' ? '#10b981' : '#3b82f6'
                    }}>
                      {study.studyType?.toUpperCase() || 'BASICS'}
                    </span>
                    {study.description?.substring(0, 30) || 'No description'}
                  </div>
                </div>
              ))}
              {studies.length === 0 && (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  No studies yet. Create studies in Study Management tab first.
                </div>
              )}
            </div>
          </div>

          {/* Chapters Panel */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              <span>📖 Chapters {currentStudy ? `(${currentStudy.title})` : ''}</span>
              {selectedStudy && (
                <button 
                  style={{ ...styles.button, ...styles.primaryBtn, ...styles.smallBtn }}
                  onClick={() => {
                    setShowChapterForm(true);
                    setEditingChapter(null);
                    setChapterForm({ title: '', description: '', chapterNumber: chapters.length + 1 });
                  }}
                >
                  + Add
                </button>
              )}
            </div>
            <div style={styles.list}>
              {selectedStudy ? (
                chapters.length > 0 ? (
                  chapters.map(chapter => (
                    <div
                      key={chapter._id}
                      style={{
                        ...styles.listItem,
                        ...(selectedChapter === chapter._id ? styles.listItemActive : {})
                      }}
                      onClick={() => fetchPuzzles(chapter._id)}
                    >
                      <div style={styles.listItemTitle}>
                        Ch. {chapter.chapterNumber}: {chapter.title}
                      </div>
                      <div style={styles.listItemMeta}>
                        {chapter.puzzleCount || 0} puzzles
                      </div>
                      <div style={styles.actions}>
                        <button
                          style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChapter(chapter);
                            setChapterForm({ 
                              title: chapter.title, 
                              description: chapter.description, 
                              chapterNumber: chapter.chapterNumber 
                            });
                            setShowChapterForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(chapter._id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                    No chapters yet. Add one to this study.
                  </div>
                )
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  Select a study to view chapters.
                </div>
              )}
            </div>
          </div>

          {/* Puzzles Panel */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              <span>🧩 Puzzles {currentChapter ? `(${currentChapter.title})` : ''}</span>
              {selectedChapter && (
                <button 
                  style={{ ...styles.button, ...styles.primaryBtn, ...styles.smallBtn }}
                  onClick={() => {
                    setShowPuzzleForm(true);
                    setEditingPuzzle(null);
                    setPuzzleForm({ 
                      puzzleNumber: puzzles.length + 1, 
                      title: '', 
                      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
                      solutionUCI: '', 
                      description: '' 
                    });
                  }}
                >
                  + Add Puzzle
                </button>
              )}
            </div>
            <div style={styles.list}>
              {selectedChapter ? (
                puzzles.length > 0 ? (
                  puzzles.map(puzzle => (
                    <div key={puzzle._id} style={styles.listItem}>
                      <div style={styles.puzzleCard}>
                        <div style={styles.chessboardContainer}>
                          <Chessboard
                            position={puzzle.fen}
                            boardWidth={180}
                            arePiecesDraggable={false}
                          />
                        </div>
                        <div style={styles.puzzleInfo}>
                          <div style={styles.listItemTitle}>
                            #{puzzle.puzzleNumber} {puzzle.title || ''}
                          </div>
                          <div style={styles.listItemMeta}>
                            {puzzle.playerColor === 'white' ? '⚪ White' : '⚫ Black'} to play
                          </div>
                          <div style={styles.listItemMeta}>
                            Solution ({puzzle.solutionLength} moves):
                          </div>
                          <div style={styles.uciCode}>
                            {puzzle.solutionUCI}
                          </div>
                          <div style={styles.actions}>
                            <button
                              style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }}
                              onClick={() => {
                                setEditingPuzzle(puzzle);
                                setPuzzleForm({ 
                                  puzzleNumber: puzzle.puzzleNumber,
                                  title: puzzle.title, 
                                  fen: puzzle.fen,
                                  solutionUCI: puzzle.solutionUCI,
                                  description: puzzle.description 
                                });
                                setShowPuzzleForm(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                              onClick={() => handleDeletePuzzle(puzzle._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                    No puzzles yet. Add puzzles to this chapter.
                  </div>
                )
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  Select a chapter to view puzzles.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Study Form Modal - REMOVED: Studies are now managed via Study Management */}

        {/* Chapter Form Modal */}
        {showChapterForm && (
          <div style={styles.modal} onClick={() => setShowChapterForm(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
              </h2>
              <form style={styles.form} onSubmit={handleChapterSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Chapter Number *</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={chapterForm.chapterNumber}
                    onChange={e => setChapterForm({ ...chapterForm, chapterNumber: parseInt(e.target.value) || 1 })}
                    required
                    min="1"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Title *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={chapterForm.title}
                    onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })}
                    placeholder="e.g., Basic Forks"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    style={styles.textarea}
                    value={chapterForm.description}
                    onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })}
                    placeholder="Brief description of this chapter..."
                  />
                </div>
                <div style={styles.buttonGroup}>
                  <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>
                    {editingChapter ? 'Update' : 'Create'}
                  </button>
                  <button 
                    type="button" 
                    style={{ ...styles.button, ...styles.secondaryBtn }}
                    onClick={() => setShowChapterForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Puzzle Form Modal */}
        {showPuzzleForm && (
          <div style={styles.modal} onClick={() => setShowPuzzleForm(false)}>
            <div style={{ ...styles.modalContent, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {editingPuzzle ? 'Edit Puzzle' : 'Create Puzzle'}
              </h2>
              <form style={styles.form} onSubmit={handlePuzzleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Puzzle Number *</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={puzzleForm.puzzleNumber}
                        onChange={e => setPuzzleForm({ ...puzzleForm, puzzleNumber: parseInt(e.target.value) || 1 })}
                        required
                        min="1"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Title</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={puzzleForm.title}
                        onChange={e => setPuzzleForm({ ...puzzleForm, title: e.target.value })}
                        placeholder="e.g., Knight Fork"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>FEN Position *</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={puzzleForm.fen}
                        onChange={e => setPuzzleForm({ ...puzzleForm, fen: e.target.value })}
                        placeholder="FEN string"
                        required
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Solution (UCI format) *</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={puzzleForm.solutionUCI}
                        onChange={e => setPuzzleForm({ ...puzzleForm, solutionUCI: e.target.value })}
                        placeholder="e.g., e2e4 e7e5 g1f3"
                        required
                      />
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        Space-separated UCI moves (e.g., e2e4 d7d5 e4d5)
                      </span>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Description</label>
                      <textarea
                        style={styles.textarea}
                        value={puzzleForm.description}
                        onChange={e => setPuzzleForm({ ...puzzleForm, description: e.target.value })}
                        placeholder="Puzzle description or hint..."
                      />
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}>Preview</label>
                    <div style={{ marginTop: '8px' }}>
                      <Chessboard
                        position={puzzleForm.fen}
                        boardWidth={230}
                        arePiecesDraggable={false}
                      />
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#9ca3af' }}>
                      {previewChess.turn() === 'w' ? '⚪ White' : '⚫ Black'} to move
                    </div>
                  </div>
                </div>
                <div style={styles.buttonGroup}>
                  <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>
                    {editingPuzzle ? 'Update' : 'Create'}
                  </button>
                  <button 
                    type="button" 
                    style={{ ...styles.button, ...styles.secondaryBtn }}
                    onClick={() => setShowPuzzleForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTestManagement;
