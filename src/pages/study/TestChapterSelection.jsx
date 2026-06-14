import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';

const API = import.meta.env.VITE_API_URL;

const TestChapterSelection = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyType = searchParams.get('type') || 'positional';

  const studyTypeNames = {
    basic: 'Basic Studies',
    positional: 'Positional Studies'
  };

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const response = await api.get(`/api/testpuzzle/studies?studyType=${studyType}`);
        setStudies(response.data);
      } catch (err) {
        setError('Failed to load studies');
      } finally {
        setLoading(false);
      }
    };

    fetchStudies();
  }, [studyType]);

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      color: '#ffffff',
      position: 'relative',
      zIndex: '1',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      color: '#9ca3af',
      textAlign: 'center',
      marginBottom: '30px',
      fontStyle: 'italic',
    },
    studiesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
    },
    studyCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      color: '#ffffff',
    },
    studyCardInner: {
      marginBottom: '15px',
    },
    backButton: {
      padding: '12px 24px',
      background: 'rgba(23, 23, 23, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '25px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    studyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#67e8f9',
      margin: '0 0 8px 0',
    },
    studyDescription: {
      fontSize: '13px',
      color: '#9ca3af',
      lineHeight: '1.5',
      margin: '0',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px',
    },
    button: {
      flex: '1',
      padding: '10px 16px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    testButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#ffffff',
    },
    loading: {
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '16px',
      padding: '40px',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      fontSize: '16px',
      padding: '40px',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading studies...</div>
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
          onClick={() => navigate('/study')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <span>←</span> Back to Study Types
        </button>
        <h1 style={styles.title}>{studyTypeNames[studyType]} Test</h1>
        <p style={styles.subtitle}>Select a study to take a test</p>

        <div style={styles.studiesGrid}>
          {studies.map((study) => (
            <div
              key={study._id}
              style={styles.studyCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <div style={styles.studyCardInner}>
                <h3 style={styles.studyTitle}>{study.title}</h3>
                <p style={styles.studyDescription}>{study.description}</p>
              </div>
              <div style={styles.buttonGroup}>
                <Link
                  to={`/study/test/chapters/${study._id}`}
                  style={{ ...styles.button, ...styles.testButton }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <span>📝</span> Test
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestChapterSelection;