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
  // Unified study view: ignore any ?type filter and load ALL studies for testing.
  const studyType = 'basic';

  const studyTypeNames = {
    basic: 'Studies',
    positional: 'Studies'
  };

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        // Load ALL studies (no studyType filter) so basic + positional tests appear together
        const response = await api.get(`/api/testpuzzle/studies`);
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
      background: 'var(--color-bg)',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    },
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 'var(--radius-2xl)',
      padding: '30px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      color: 'var(--color-text)',
      position: 'relative',
      zIndex: '1',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '16px',
      color: 'var(--color-text-muted)',
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
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px',
      boxShadow: '0 8px 32px var(--color-black-a50)',
      border: '1px solid var(--color-white-a04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      color: 'var(--color-text)',
    },
    studyCardInner: {
      marginBottom: '15px',
    },
    backButton: {
      padding: '12px 24px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-white-a10)',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '25px',
      boxShadow: '0 4px 12px var(--color-black-a35)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    studyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-accent)',
      margin: '0 0 8px 0',
    },
    studyDescription: {
      fontSize: '13px',
      color: 'var(--color-text-muted)',
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
      borderRadius: 'var(--radius-md)',
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
      boxShadow: '0 4px 12px var(--color-black-a35)',
    },
    testButton: {
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      color: 'var(--color-text)',
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
            e.currentTarget.style.boxShadow = '0 6px 20px var(--color-accent-a30)';
            e.currentTarget.style.borderColor = 'var(--color-accent-a20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--color-black-a35)';
            e.currentTarget.style.borderColor = 'var(--color-white-a10)';
          }}
        >
          <span>←</span> Back to Study Types
        </button>
        <h1 style={styles.title}>Study Test</h1>
        <p style={styles.subtitle}>Select a study to take a test</p>

        <div style={styles.studiesGrid}>
          {studies.map((study) => (
            <div
              key={study._id}
              style={styles.studyCard}
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
                    e.currentTarget.style.boxShadow = '0 6px 20px var(--color-accent-a40)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--color-black-a35)';
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