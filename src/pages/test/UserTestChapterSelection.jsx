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
      background: 'linear-gradient(135deg, var(--color-bg) 0%, #1a1a2e 100%)',
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
      color: 'var(--color-warning)',
      marginBottom: '10px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: 'var(--color-text)',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '15px',
      color: 'var(--color-text-muted)',
    },
    grid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    card: {
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)',
      padding: '25px',
      border: '1px solid var(--color-white-a10)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    cardHover: {
      transform: 'translateX(10px)',
      boxShadow: '0 10px 30px var(--color-warning-a12)',
      border: '1px solid var(--color-warning-a30)',
    },
    chapterNumber: {
      width: '50px',
      height: '50px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-danger) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: '700',
      color: 'var(--color-text)',
      flexShrink: 0,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-text)',
      marginBottom: '5px',
    },
    cardMeta: {
      fontSize: '14px',
      color: 'var(--color-text-muted)',
    },
    puzzleCount: {
      background: 'var(--color-warning-a20)',
      color: 'var(--color-warning)',
      padding: '6px 12px',
      borderRadius: 'var(--radius-2xl)',
      fontSize: '13px',
      fontWeight: '500',
    },
    backButton: {
      padding: '12px 24px',
      background: 'rgba(38, 38, 38, 0.8)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a20)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '30px',
    },
    loading: {
      textAlign: 'center',
      color: 'var(--color-text-muted)',
      padding: '60px',
      fontSize: '18px',
    },
    empty: {
      textAlign: 'center',
      color: 'var(--color-text-faint)',
      padding: '60px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-2xl)',
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
          <div style={{ ...styles.empty, color: 'var(--color-danger)', marginBottom: '20px' }}>
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
