import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const UserTestChapterSelection = () => {
  const { studyId } = useParams();
  const [study, setStudy] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all studies to find the current one
        const studiesRes = await api.get('/api/testpuzzle/studies');
        const currentStudy = studiesRes.data.find(s => s._id === studyId);
        setStudy(currentStudy);

        // Get chapters for this study
        const chaptersRes = await api.get(`/api/testpuzzle/studies/${studyId}/chapters`);
        setChapters(chaptersRes.data);
      } catch (err) {
        setError('Failed to load chapters');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studyId]);

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '900px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    studyTitle: {
      fontSize: '16px',
      color: '#f59e0b',
      marginBottom: '10px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '15px',
      color: '#9ca3af',
    },
    grid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    card: {
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '16px',
      padding: '25px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    cardHover: {
      transform: 'translateX(10px)',
      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.4)',
    },
    chapterNumber: {
      width: '50px',
      height: '50px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '700',
      color: '#fff',
      flexShrink: 0,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#fff',
      marginBottom: '5px',
    },
    cardMeta: {
      fontSize: '14px',
      color: '#9ca3af',
    },
    puzzleCount: {
      background: 'rgba(245, 158, 11, 0.2)',
      color: '#f59e0b',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '500',
    },
    backButton: {
      padding: '12px 24px',
      background: 'rgba(38, 38, 38, 0.8)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '30px',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      padding: '60px',
      fontSize: '18px',
    },
    empty: {
      textAlign: 'center',
      color: '#6b7280',
      padding: '60px',
      background: 'rgba(23, 23, 23, 0.9)',
      borderRadius: '20px',
    },
  };

  const [hoveredCard, setHoveredCard] = useState(null);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading chapters...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate('/test')}>
          ← Back to Studies
        </button>

        <div style={styles.header}>
          <div style={styles.studyTitle}>📚 {study?.title || 'Study'}</div>
          <h1 style={styles.title}>Select a Chapter</h1>
          <p style={styles.subtitle}>
            Choose a chapter to start your test. Each solved puzzle earns 2 points!
          </p>
        </div>

        {error && (
          <div style={{ ...styles.empty, color: '#ef4444', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {chapters.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No chapters available</p>
            <p>This study doesn't have any chapters yet.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {chapters.map((chapter) => (
              <div
                key={chapter._id}
                style={{
                  ...styles.card,
                  ...(hoveredCard === chapter._id ? styles.cardHover : {}),
                  opacity: chapter.puzzleCount === 0 ? 0.5 : 1,
                  pointerEvents: chapter.puzzleCount === 0 ? 'none' : 'auto',
                }}
                onMouseEnter={() => setHoveredCard(chapter._id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(`/test/time/${studyId}/${chapter._id}`)}
              >
                <div style={styles.chapterNumber}>{chapter.chapterNumber}</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardTitle}>{chapter.title}</div>
                  <div style={styles.cardMeta}>
                    {chapter.description || 'Practice and improve your skills'}
                  </div>
                </div>
                <div style={styles.puzzleCount}>
                  {chapter.puzzleCount} {chapter.puzzleCount === 1 ? 'puzzle' : 'puzzles'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTestChapterSelection;
