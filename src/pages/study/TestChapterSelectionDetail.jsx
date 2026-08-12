import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const TestChapterSelectionDetail = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch study details from testpuzzle endpoint
        const studyResponse = await api.get('/api/testpuzzle/studies');
        const foundStudy = studyResponse.data.find(s => s._id === studyId);
        if (foundStudy) {
          setStudy(foundStudy);
        }

        // Fetch test chapters from testpuzzle endpoint
        const chaptersResponse = await api.get(`/api/testpuzzle/studies/${studyId}/chapters`);
        setChapters(chaptersResponse.data);
      } catch (err) {
        setError('Failed to load chapters');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studyId]);

  const handleChapterClick = (chapter) => {
    if (study) {
      navigate(`/study/test/time?studyId=${study._id}&chapterId=${chapter._id}`);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      color: 'var(--color-text)',
    },
    backButton: {
      padding: '10px 20px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '25px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: '16px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
      marginBottom: '30px',
      fontStyle: 'italic',
    },
    chaptersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '20px',
    },
    chapterCard: {
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      textAlign: 'center',
      color: 'var(--color-text)',
    },
    chapterNumber: {
      fontSize: '13px',
      color: 'var(--color-accent)',
      fontWeight: '600',
      marginBottom: '10px',
    },
    chapterTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: '0',
    },
    loading: {
      textAlign: 'center',
      color: 'var(--color-text-muted)',
      fontSize: '16px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: 'var(--color-danger)',
      fontSize: '16px',
      padding: '40px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading chapters...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          style={styles.backButton}
          onClick={() => navigate('/study/test')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px var(--color-accent-a30)';
            e.currentTarget.style.borderColor = 'var(--color-accent-a20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--color-black-a35)';
            e.currentTarget.style.borderColor = 'var(--color-white-a10)';
          }}
        >
          ← Back to Studies
        </button>

        <h1 style={styles.title}>{study?.title} Test</h1>
        <p style={styles.subtitle}>Select a chapter to take a test</p>

        {chapters.length === 0 ? (
          <div style={styles.error}>No chapters available for this study.</div>
        ) : (
          <div style={styles.chaptersGrid}>
            {chapters.map((chapter) => (
              <div
                key={chapter._id}
                style={styles.chapterCard}
                onClick={() => handleChapterClick(chapter)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px var(--color-accent-a30)';
                  e.currentTarget.style.borderColor = 'var(--color-accent-a20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px var(--color-black-a50)';
                  e.currentTarget.style.borderColor = 'var(--color-white-a04)';
                }}
              >
                <div style={styles.chapterNumber}>Chapter {chapter.chapterNumber}</div>
                <h3 style={styles.chapterTitle}>{chapter.title}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestChapterSelectionDetail;