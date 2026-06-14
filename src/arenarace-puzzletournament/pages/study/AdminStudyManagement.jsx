import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AdminStudyManagement = () => {
  const navigate = useNavigate();
  const [managementType, setManagementType] = useState('study'); // 'study' or 'testPuzzle'
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudyForm, setShowStudyForm] = useState(false);
  const [editingStudy, setEditingStudy] = useState(null);
  const [studyForm, setStudyForm] = useState({ 
    title: '', 
    description: '', 
    studyType: 'basic' 
  });
  const [filterType, setFilterType] = useState('all'); // Filter for viewing studies

  // Chapter management
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({
    chapterNumber: '',
    title: ''
  });

  // Puzzle management
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const [showPuzzleForm, setShowPuzzleForm] = useState(false);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [viewingPuzzle, setViewingPuzzle] = useState(null);
  const [chapterInfo, setChapterInfo] = useState(null);
  const [puzzleForm, setPuzzleForm] = useState({
    name: '',
    puzzleFen: '',
    puzzleDescription: '',
    puzzleSolutions: [{ pgn: '', description: '' }]
  });

  // Test Puzzle Management States
  const [testStudies, setTestStudies] = useState([]);
  const [testStudyForm, setTestStudyForm] = useState({ 
    title: '', 
    description: '', 
    studyType: 'basics' 
  });
  const [showTestStudyForm, setShowTestStudyForm] = useState(false);
  const [editingTestStudy, setEditingTestStudy] = useState(null);

  useEffect(() => {
    if (managementType === 'study') {
      fetchStudies();
    } else if (managementType === 'testPuzzle') {
      fetchTestStudies();
    }
  }, [managementType]);

  useEffect(() => {
    // Initial load
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      const response = await api.get('/api/admin/studies');
      setStudies(response.data);
    } catch (err) {
      setError('Failed to load studies');
    } finally {
      setLoading(false);
    }
  };

  const handleStudySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudy) {
        await api.put(`/api/admin/studies/${editingStudy._id}`, studyForm);
      } else {
        await api.post('/api/admin/studies', studyForm);
      }
      setShowStudyForm(false);
      setEditingStudy(null);
      setStudyForm({ title: '', description: '', studyType: 'basic' });
      fetchStudies();
    } catch (err) {
      setError('Failed to save study');
    }
  };

  const handleDeleteStudy = async (studyId) => {
    if (!confirm('Are you sure you want to delete this study? This will also delete all chapters and puzzles.')) return;

    try {
      await api.delete(`/api/admin/studies/${studyId}`);
      fetchStudies();
    } catch (err) {
      setError('Failed to delete study');
    }
  };

  const fetchChapters = async (studyId) => {
    try {
      const response = await api.get(`/api/admin/studies/${studyId}/chapters`);
      setChapters(response.data);
      setSelectedStudy(studyId);
    } catch (err) {
      setError('Failed to load chapters');
    }
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiPrefix = managementType === 'testPuzzle' ? '/api/testpuzzle/admin' : '/api/admin';
      if (editingChapter) {
        await api.put(`${apiPrefix}/chapters/${editingChapter._id}`, chapterForm);
      } else {
        await api.post(`${apiPrefix}/studies/${selectedStudy}/chapters`, chapterForm);
      }
      setShowChapterForm(false);
      setEditingChapter(null);
      setChapterForm({ chapterNumber: '', title: '' });
      if (managementType === 'testPuzzle') {
        fetchTestChapters(selectedStudy);
      } else {
        fetchChapters(selectedStudy);
      }
    } catch (err) {
      setError('Failed to save chapter');
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm('Are you sure you want to delete this chapter? This will also delete all puzzles.')) return;

    try {
      const apiPrefix = managementType === 'testPuzzle' ? '/api/testpuzzle/admin' : '/api/admin';
      await api.delete(`${apiPrefix}/chapters/${chapterId}`);
      if (managementType === 'testPuzzle') {
        fetchTestChapters(selectedStudy);
      } else {
        fetchChapters(selectedStudy);
      }
    } catch (err) {
      setError('Failed to delete chapter');
    }
  };

  const fetchPuzzles = async (chapterId) => {
    try {
      const apiPrefix = managementType === 'testPuzzle' ? '/api/testpuzzle/admin' : '/api/admin';
      const response = await api.get(`${apiPrefix}/chapters/${chapterId}/puzzles`);
      setPuzzles(response.data);
      setSelectedChapter(chapterId);
      
      // Get the chapter and study info for display
      const currentChapter = chapters.find(ch => ch._id === chapterId);
      if (currentChapter) {
        const studiesData = managementType === 'testPuzzle' ? testStudies : studies;
        const currentStudy = studiesData.find(st => st._id.toString() === currentChapter.studyId.toString());
        // Store chapter and study info for table display
        setChapterInfo({
          chapter: currentChapter,
          study: currentStudy
        });
      }
    } catch (err) {
      setError('Failed to load puzzles');
    }
  };

  const handlePuzzleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiPrefix = managementType === 'testPuzzle' ? '/api/testpuzzle/admin' : '/api/admin';
      if (editingPuzzle) {
        await api.put(`${apiPrefix}/puzzles/${editingPuzzle._id}`, puzzleForm);
      } else {
        await api.post(`${apiPrefix}/chapters/${selectedChapter}/puzzles`, puzzleForm);
      }
      setShowPuzzleForm(false);
      setEditingPuzzle(null);
      setPuzzleForm({ name: '', puzzleFen: '', puzzleDescription: '', puzzleSolutions: [{ pgn: '', description: '' }] });
      fetchPuzzles(selectedChapter);
    } catch (err) {
      setError('Failed to save puzzle');
    }
  };

  const handleDeletePuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const apiPrefix = managementType === 'testPuzzle' ? '/api/testpuzzle/admin' : '/api/admin';
      await api.delete(`${apiPrefix}/puzzles/${puzzleId}`);
      fetchPuzzles(selectedChapter);
    } catch (err) {
      setError('Failed to delete puzzle');
    }
  };

  const addSolution = () => {
    setPuzzleForm({
      ...puzzleForm,
      puzzleSolutions: [...puzzleForm.puzzleSolutions, { pgn: '', description: '' }]
    });
  };

  const removeSolution = (index) => {
    const newSolutions = puzzleForm.puzzleSolutions.filter((_, i) => i !== index);
    setPuzzleForm({
      ...puzzleForm,
      puzzleSolutions: newSolutions
    });
  };

  const updateSolution = (index, field, value) => {
    const newSolutions = [...puzzleForm.puzzleSolutions];
    newSolutions[index][field] = value;
    setPuzzleForm({
      ...puzzleForm,
      puzzleSolutions: newSolutions
    });
  };

  // Test Puzzle Management Functions
  const fetchTestStudies = async () => {
    try {
      const response = await api.get('/api/testpuzzle/admin/studies');
      setTestStudies(response.data);
    } catch (err) {
      setError('Failed to load test studies');
    } finally {
      setLoading(false);
    }
  };

  const handleTestStudySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTestStudy) {
        await api.put(`/api/testpuzzle/admin/studies/${editingTestStudy._id}`, testStudyForm);
      } else {
        await api.post('/api/testpuzzle/admin/studies', testStudyForm);
      }
      setShowTestStudyForm(false);
      setEditingTestStudy(null);
      setTestStudyForm({ title: '', description: '', studyType: 'basics' });
      fetchTestStudies();
    } catch (err) {
      setError('Failed to save test study');
    }
  };

  const handleDeleteTestStudy = async (studyId) => {
    if (!confirm('Are you sure you want to delete this test study? This will also delete all chapters and puzzles.')) return;

    try {
      await api.delete(`/api/testpuzzle/admin/studies/${studyId}`);
      fetchTestStudies();
    } catch (err) {
      setError('Failed to delete test study');
    }
  };

  // Test Puzzle Chapter Management
  const fetchTestChapters = async (studyId) => {
    try {
      const response = await api.get(`/api/testpuzzle/admin/studies/${studyId}/chapters`);
      setChapters(response.data);
    } catch (err) {
      setError('Failed to load test chapters');
    }
  };

  // Management type switching
  const switchManagementType = (type) => {
    setManagementType(type);
    setError(null);
    if (type === 'testPuzzle') {
      fetchTestStudies();
    } else {
      fetchStudies();
    }
  };

  const styles = {
    page: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a5f1a',
      marginTop: '10px',
    },
    backToDashboardButton: {
      padding: '8px 16px',
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '10px',
    },
    managementSelector: {
      display: 'flex',
      gap: '15px',
      marginBottom: '25px',
      padding: '15px',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      borderRadius: '12px',
      border: '2px solid #1a5f1a',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    managementTab: {
      padding: '15px 30px',
      border: '2px solid #dee2e6',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    activeTab: {
      background: 'linear-gradient(135deg, #1a5f1a 0%, #2e7d32 100%)',
      color: '#fff',
      borderColor: '#1a5f1a',
      boxShadow: '0 4px 8px rgba(26, 95, 26, 0.3)',
      transform: 'scale(1.02)',
    },
    inactiveTab: {
      background: '#fff',
      color: '#495057',
      borderColor: '#dee2e6',
      ':hover': {
        background: '#f8f9fa',
      }
    },
    studyTypeBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      marginLeft: '8px',
    },
    basicsBadge: {
      background: '#28a745',
      color: '#fff',
    },
    positionalBadge: {
      background: '#007bff',
      color: '#fff',
    },
    addButton: {
      padding: '10px 20px',
      background: '#1a5f1a',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    card: {
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1a5f1a',
      marginBottom: '10px',
    },
    cardDescription: {
      color: '#666',
      marginBottom: '15px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    },
    button: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    editButton: {
      background: '#007bff',
      color: '#fff',
    },
    deleteButton: {
      background: '#dc3545',
      color: '#fff',
    },
    manageButton: {
      background: '#28a745',
      color: '#fff',
    },
    form: {
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    textarea: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      minHeight: '60px',
    },
    formButtons: {
      display: 'flex',
      gap: '10px',
    },
    cancelButton: {
      background: '#6c757d',
      color: '#fff',
    },
    backButton: {
      background: '#6c757d',
      color: '#fff',
      marginBottom: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      background: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    tableHeader: {
      background: '#1a5f1a',
      color: '#fff',
      textAlign: 'left',
    },
    th: {
      padding: '12px',
      fontWeight: 'bold',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef',
    },
    tableRow: {
      '&:hover': {
        background: '#f8f9fa',
      }
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: '#fff',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: '15px',
      right: '15px',
      background: '#dc3545',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      cursor: 'pointer',
      fontSize: '18px',
    },
    viewButton: {
      background: '#17a2b8',
      color: '#fff',
    },
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <button 
            style={styles.backToDashboardButton} 
            onClick={() => navigate('/admin')}
          >
            ← Back to Admin Dashboard
          </button>
          <h1 style={styles.title}>Study Management</h1>
        </div>
        {!selectedStudy && !selectedChapter && (
          <button 
            style={styles.addButton} 
            onClick={() => managementType === 'study' ? setShowStudyForm(true) : setShowTestStudyForm(true)}
          >
            {managementType === 'study' ? 'Add Study' : 'Add Test Study'}
          </button>
        )}
      </div>

      {/* Management Type Selector */}
      {!selectedStudy && !selectedChapter && (
        <div style={styles.managementSelector}>
          <div
            style={{
              ...styles.managementTab,
              ...(managementType === 'study' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => switchManagementType('study')}
          >
            📚 Study Management
          </div>
          <div
            style={{
              ...styles.managementTab,
              ...(managementType === 'testPuzzle' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => switchManagementType('testPuzzle')}
          >
            🧩 Test Puzzle Management
          </div>
        </div>
      )}

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      {/* Study Form */}
      {showStudyForm && (
        <form style={styles.form} onSubmit={handleStudySubmit}>
          <h3>{editingStudy ? 'Edit Study' : 'Add New Study'}</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Study Type</label>
            <select
              style={styles.input}
              value={studyForm.studyType}
              onChange={(e) => setStudyForm({ ...studyForm, studyType: e.target.value })}
              required
            >
              <option value="basic">Basic Study</option>
              <option value="positional">Positional Study</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              style={styles.input}
              type="text"
              value={studyForm.title}
              onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              value={studyForm.description}
              onChange={(e) => setStudyForm({ ...studyForm, description: e.target.value })}
              required
            />
          </div>
          <div style={styles.formButtons}>
            <button type="submit" style={styles.addButton}>
              {editingStudy ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              style={{ ...styles.button, ...styles.cancelButton }}
              onClick={() => {
                setShowStudyForm(false);
                setEditingStudy(null);
                setStudyForm({ title: '', description: '', studyType: 'basic' });
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Test Study Form */}
      {showTestStudyForm && (
        <form style={styles.form} onSubmit={handleTestStudySubmit}>
          <h3>{editingTestStudy ? 'Edit Test Study' : 'Add New Test Study'}</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Study Type</label>
            <select
              style={styles.input}
              value={testStudyForm.studyType}
              onChange={(e) => setTestStudyForm({ ...testStudyForm, studyType: e.target.value })}
              required
            >
              <option value="basics">Basics Study 📚</option>
              <option value="positional">Positional Study 🎯</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              style={styles.input}
              type="text"
              value={testStudyForm.title}
              onChange={(e) => setTestStudyForm({ ...testStudyForm, title: e.target.value })}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              value={testStudyForm.description}
              onChange={(e) => setTestStudyForm({ ...testStudyForm, description: e.target.value })}
              required
            />
          </div>
          <div style={styles.formButtons}>
            <button style={styles.addButton} type="submit">
              {editingTestStudy ? 'Update Test Study' : 'Create Test Study'}
            </button>
            <button
              style={{ ...styles.button, ...styles.cancelButton }}
              type="button"
              onClick={() => {
                setShowTestStudyForm(false);
                setEditingTestStudy(null);
                setTestStudyForm({ title: '', description: '', studyType: 'basics' });
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Studies List */}
      {!selectedStudy && !selectedChapter && managementType === 'study' && (
        <div>
          <div style={styles.header}>
            <h2 style={styles.title}>Studies</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                style={{ ...styles.input, width: '200px' }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="basic">Basic Study</option>
                <option value="positional">Positional Study</option>
              </select>
            </div>
          </div>
          <div style={styles.grid}>
            {studies
              .filter(study => filterType === 'all' || study.studyType === filterType)
              .map((study) => (
              <div key={study._id} style={styles.card}>
                <h3 style={styles.cardTitle}>{study.title}</h3>
                <p style={styles.cardDescription}>{study.description}</p>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  Type: {study.studyType === 'positional' ? 'Positional' : 'Basic'}
                </p>
                <p>Chapters: {study.chapters?.length || 0}</p>
                <div style={styles.buttonGroup}>
                  <button
                    style={{ ...styles.button, ...styles.manageButton }}
                    onClick={() => fetchChapters(study._id)}
                  >
                    Manage Chapters
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.editButton }}
                    onClick={() => {
                      setEditingStudy(study);
                      setStudyForm({ 
                        title: study.title, 
                        description: study.description,
                        studyType: study.studyType || 'basic'
                      });
                      setShowStudyForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.deleteButton }}
                    onClick={() => handleDeleteStudy(study._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Studies List */}
      {!selectedStudy && !selectedChapter && managementType === 'testPuzzle' && (
        <div>
          <div style={styles.header}>
            <h2 style={styles.title}>Test Studies</h2>
          </div>
          <div style={styles.grid}>
            {testStudies.map((study) => (
              <div key={study._id} style={styles.card}>
                <div style={styles.cardTitle}>
                  {study.title}
                  <span
                    style={{
                      ...styles.studyTypeBadge,
                      ...(study.studyType === 'basics' ? styles.basicsBadge : styles.positionalBadge)
                    }}
                  >
                    {study.studyType === 'basics' ? '📚 Basics' : '🎯 Positional'}
                  </span>
                </div>
                <div style={styles.cardDescription}>{study.description}</div>
                <div style={styles.buttonGroup}>
                  <button
                    style={{ ...styles.button, ...styles.manageButton }}
                    onClick={() => {
                      setSelectedStudy(study);
                      if (managementType === 'testPuzzle') {
                        fetchTestChapters(study._id);
                      } else {
                        fetchChapters(study._id);
                      }
                    }}
                  >
                    Manage
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.editButton }}
                    onClick={() => {
                      setEditingTestStudy(study);
                      setTestStudyForm({
                        title: study.title,
                        description: study.description,
                        studyType: study.studyType || 'basics'
                      });
                      setShowTestStudyForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.deleteButton }}
                    onClick={() => handleDeleteTestStudy(study._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters Management */}
      {selectedStudy && !selectedChapter && (
        <div>
          <button
            style={{ ...styles.button, ...styles.backButton }}
            onClick={() => {
              setSelectedStudy(null);
              setChapters([]);
            }}
          >
            ← Back to {managementType === 'testPuzzle' ? 'Test Studies' : 'Studies'}
          </button>
          <div style={styles.header}>
            <h2>{managementType === 'testPuzzle' ? 'Test Study' : 'Study'} Chapters</h2>
            <button style={styles.addButton} onClick={() => setShowChapterForm(true)}>
              Add Chapter
            </button>
          </div>

          {/* Chapter Form */}
          {showChapterForm && (
            <form style={styles.form} onSubmit={handleChapterSubmit}>
              <h3>{editingChapter ? 'Edit Chapter' : 'Add New Chapter'}</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Chapter Number</label>
                <input
                  style={styles.input}
                  type="number"
                  value={chapterForm.chapterNumber}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapterNumber: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title</label>
                <input
                  style={styles.input}
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.addButton}>
                  {editingChapter ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.cancelButton }}
                  onClick={() => {
                    setShowChapterForm(false);
                    setEditingChapter(null);
                    setChapterForm({ chapterNumber: '', title: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}          <div style={styles.grid}>
            {chapters.map((chapter) => (
              <div key={chapter._id} style={styles.card}>
                <h3 style={styles.cardTitle}>Chapter {chapter.chapterNumber}: {chapter.title}</h3>
                <p style={styles.cardDescription}>Manage puzzles for this chapter</p>
                <div style={styles.buttonGroup}>
                  <button
                    style={{ ...styles.button, ...styles.manageButton }}
                    onClick={() => fetchPuzzles(chapter._id)}
                  >
                    Manage Puzzles
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.editButton }}
                    onClick={() => {
                      setEditingChapter(chapter);
                      setChapterForm({
                        chapterNumber: chapter.chapterNumber,
                        title: chapter.title
                      });
                      setShowChapterForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.deleteButton }}
                    onClick={() => handleDeleteChapter(chapter._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Puzzles Management */}
      {selectedChapter && (
        <div>
          <button
            style={{ ...styles.button, ...styles.backButton }}
            onClick={() => {
              setSelectedChapter(null);
              setPuzzles([]);
              setChapterInfo(null);
            }}
          >
            ← Back to Chapters
          </button>
          
          {/* Display Study and Chapter Info */}
          {chapterInfo && (
            <div style={{ 
              background: '#f0f7f0', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '2px solid #1a5f1a'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1a5f1a' }}>
                📚 {chapterInfo.study?.title || 'Unknown Study'}
              </h3>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                <strong>Study Type:</strong> {
                  chapterInfo.study?.studyType === 'positional' ? 'Positional' : 
                  chapterInfo.study?.studyType === 'realtime' ? 'Real Time Game' : 
                  'Tournament'
                }
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>Current Chapter:</strong> Chapter {chapterInfo.chapter?.chapterNumber} - {chapterInfo.chapter?.title}
              </p>
            </div>
          )}
          
          <div style={styles.header}>
            <h2>Puzzles</h2>
            <button style={styles.addButton} onClick={() => setShowPuzzleForm(true)}>
              Add Puzzle
            </button>
          </div>

          {/* Puzzle Form */}
          {showPuzzleForm && (
            <form style={styles.form} onSubmit={handlePuzzleSubmit}>
              <h3>{editingPuzzle ? 'Edit Puzzle' : 'Add New Puzzle'}</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Puzzle Name</label>
                <input
                  style={styles.input}
                  type="text"
                  value={puzzleForm.name}
                  onChange={(e) => setPuzzleForm({ ...puzzleForm, name: e.target.value })}
                  placeholder="e.g., Fork Knight, Pin Tactic, Checkmate Pattern"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Puzzle FEN</label>
                <input
                  style={styles.input}
                  type="text"
                  value={puzzleForm.puzzleFen}
                  onChange={(e) => setPuzzleForm({ ...puzzleForm, puzzleFen: e.target.value })}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Puzzle Description (Shown to users)</label>
                <textarea
                  style={styles.textarea}
                  value={puzzleForm.puzzleDescription}
                  onChange={(e) => setPuzzleForm({ ...puzzleForm, puzzleDescription: e.target.value })}
                  placeholder="General description of the puzzle concept or strategy"
                  rows="3"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Solutions</label>
                {puzzleForm.puzzleSolutions.map((solution, index) => (
                  <div key={index} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Solution {index + 1}</strong>
                      {puzzleForm.puzzleSolutions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSolution(index)}
                          style={{ ...styles.button, ...styles.deleteButton, padding: '5px 10px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={styles.label}>PGN</label>
                      <textarea
                        style={styles.textarea}
                        value={solution.pgn}
                        onChange={(e) => updateSolution(index, 'pgn', e.target.value)}
                        placeholder="1. e4 e5 2. Nf3 Nc6"
                        required
                      />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={styles.label}>Description (Optional)</label>
                      <textarea
                        style={styles.textarea}
                        value={solution.description}
                        onChange={(e) => updateSolution(index, 'description', e.target.value)}
                        placeholder="Description of this solution"
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSolution}
                  style={{ ...styles.button, ...styles.addButton, marginTop: '10px' }}
                >
                  Add Another Solution
                </button>
              </div>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.addButton}>
                  {editingPuzzle ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.cancelButton }}
                  onClick={() => {
                    setShowPuzzleForm(false);
                    setEditingPuzzle(null);
                    setPuzzleForm({ name: '', puzzleFen: '', puzzleDescription: '', puzzleSolutions: [{ pgn: '', description: '' }] });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Puzzle Name</th>
                  <th style={styles.th}>FEN (Preview)</th>
                  <th style={styles.th}>Solutions</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {puzzles.map((puzzle, index) => (
                  <tr key={puzzle._id} style={styles.tableRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <strong>{puzzle.name || 'Untitled Puzzle'}</strong>
                      {puzzle.puzzleDescription && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                          {puzzle.puzzleDescription.substring(0, 60)}...
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <code style={{ fontSize: '11px', color: '#666' }}>
                        {puzzle.puzzleFen.substring(0, 30)}...
                      </code>
                    </td>
                    <td style={styles.td}>{puzzle.puzzleSolutions?.length || 0} solution(s)</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          style={{ ...styles.button, ...styles.viewButton }}
                          onClick={() => setViewingPuzzle(puzzle)}
                        >
                          View
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.editButton }}
                          onClick={() => {
                            setEditingPuzzle(puzzle);
                            setPuzzleForm({
                              name: puzzle.name || '',
                              puzzleFen: puzzle.puzzleFen,
                              puzzleDescription: puzzle.puzzleDescription || '',
                              puzzleSolutions: puzzle.puzzleSolutions.length > 0 ? puzzle.puzzleSolutions : [{ pgn: '', description: '' }]
                            });
                            setShowPuzzleForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.deleteButton }}
                          onClick={() => handleDeletePuzzle(puzzle._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {puzzles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                No puzzles yet. Click "Add Puzzle" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Puzzle Detail Modal */}
      {viewingPuzzle && (
        <div style={styles.modal} onClick={() => setViewingPuzzle(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setViewingPuzzle(null)}>×</button>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>{viewingPuzzle.name || 'Untitled Puzzle'}</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#1a5f1a' }}>FEN Position:</strong>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  marginTop: '8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  wordBreak: 'break-all'
                }}>
                  {viewingPuzzle.puzzleFen}
                </div>
              </div>

              {viewingPuzzle.puzzleDescription && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#1a5f1a' }}>Description:</strong>
                  <div style={{ 
                    background: '#f0f7f0', 
                    padding: '15px', 
                    borderRadius: '4px', 
                    marginTop: '8px',
                    lineHeight: '1.6'
                  }}>
                    {viewingPuzzle.puzzleDescription}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#1a5f1a' }}>Solutions ({viewingPuzzle.puzzleSolutions?.length || 0}):</strong>
                <div style={{ marginTop: '10px' }}>
                  {viewingPuzzle.puzzleSolutions?.map((sol, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: '#fff', 
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '15px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '10px',
                        paddingBottom: '10px',
                        borderBottom: '2px solid #1a5f1a'
                      }}>
                        <span style={{ 
                          background: '#1a5f1a', 
                          color: '#fff', 
                          padding: '4px 12px', 
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          Solution {idx + 1}
                        </span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px', color: '#666' }}>PGN:</strong>
                        <div style={{ 
                          background: '#f8f9fa', 
                          padding: '10px', 
                          borderRadius: '4px', 
                          marginTop: '5px',
                          fontFamily: 'monospace',
                          fontSize: '13px'
                        }}>
                          {sol.pgn}
                        </div>
                      </div>
                      {sol.description && (
                        <div>
                          <strong style={{ fontSize: '14px', color: '#666' }}>Description:</strong>
                          <div style={{ 
                            marginTop: '5px',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#333'
                          }}>
                            {sol.description}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                <button
                  style={{ ...styles.button, ...styles.editButton }}
                  onClick={() => {
                    setEditingPuzzle(viewingPuzzle);
                    setPuzzleForm({
                      name: viewingPuzzle.name || '',
                      puzzleFen: viewingPuzzle.puzzleFen,
                      puzzleDescription: viewingPuzzle.puzzleDescription || '',
                      puzzleSolutions: viewingPuzzle.puzzleSolutions.length > 0 ? viewingPuzzle.puzzleSolutions : [{ pgn: '', description: '' }]
                    });
                    setShowPuzzleForm(true);
                    setViewingPuzzle(null);
                  }}
                >
                  Edit This Puzzle
                </button>
                <button
                  style={{ ...styles.button, ...styles.cancelButton }}
                  onClick={() => setViewingPuzzle(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudyManagement;