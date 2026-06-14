import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const StudyChapterSelection = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [studyTitle, setStudyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        // Fetch study details
        const studyResponse = await api.get('/api/study/all');
        const study = studyResponse.data.find(s => s._id === studyId);
        if (study) {
          setStudyTitle(study.title);
        }

        // Fetch chapters
        const chaptersResponse = await api.get(`/api/study/${studyId}/chapters`);
        setChapters(chaptersResponse.data);
      } catch (err) {
        setError('Failed to load chapters');
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [studyId]);

  const handleChapterClick = (chapterId) => {
    navigate(`/study/chapter/${studyId}/${chapterId}`);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
    backButton: {
      padding: '10px 20px',
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginBottom: '20px',
      fontSize: '16px',
    },
    title: {
      fontSize: '36px',
      fontWeight: '800',
      color: '#1a5f1a',
      textAlign: 'center',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '18px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '40px',
    },
    chaptersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
    },
    chapterCard: {
      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
      borderRadius: '16px',
      padding: '30px 24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
      border: '2px solid #e9ecef',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      textAlign: 'center',
    },
    chapterNumber: {
      fontSize: '14px',
      color: '#1a5f1a',
      fontWeight: '600',
      marginBottom: '12px',
    },
    chapterTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1a5f1a',
      margin: '0',
    },
    loading: {
      textAlign: 'center',
      color: '#666',
      fontSize: '18px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: '#dc2626',
      fontSize: '18px',
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
          onClick={() => navigate('/study/learn')}
        >
          ← Back to Studies
        </button>

        <h1 style={styles.title}>{studyTitle}</h1>
        <p style={styles.subtitle}>Select a chapter to begin studying</p>

        {chapters.length === 0 ? (
          <div style={styles.error}>No chapters available for this study.</div>
        ) : (
          <div style={styles.chaptersGrid}>
            {chapters.map((chapter) => (
              <div
                key={chapter._id}
                style={styles.chapterCard}
                onClick={() => handleChapterClick(chapter._id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
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

export default StudyChapterSelection;
