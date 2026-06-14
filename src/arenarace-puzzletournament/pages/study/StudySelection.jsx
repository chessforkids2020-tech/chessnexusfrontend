import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';

const API = import.meta.env.VITE_API_URL;

const StudySelection = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyType = searchParams.get('type') || 'positional';

  const studyTypeNames = {
    positional: 'Positional Studies',
    realtime: 'Real Time Game Studies',
    tournament: 'Tournament Studies'
  };

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const response = await api.get(`/api/study/all?studyType=${studyType}`);
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
    studiesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
    },
    studyCard: {
      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
      border: '2px solid #e9ecef',
      transition: 'all 0.3s ease',
    },
    studyCardInner: {
      marginBottom: '15px',
    },
    backButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '700',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    studyTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#1a5f1a',
      margin: '0 0 12px 0',
    },
    studyDescription: {
      fontSize: '14px',
      color: '#6c757d',
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
      padding: '12px 16px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: 'translateY(0)',
    },
    learnButton: {
      background: 'linear-gradient(135deg, #1a5f1a 0%, #2e7d32 100%)',
      color: '#fff',
    },
    testButton: {
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      color: '#fff',
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
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,117,125,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <span>←</span> Back to Study Types
        </button>
        <h1 style={styles.title}>{studyTypeNames[studyType]}</h1>
        <p style={styles.subtitle}>Select a study to begin learning</p>

        <div style={styles.studiesGrid}>
          {studies.map((study) => (
            <div
              key={study._id}
              style={styles.studyCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
              }}
            >
              <div style={styles.studyCardInner}>
                <h3 style={styles.studyTitle}>{study.title}</h3>
                <p style={styles.studyDescription}>{study.description}</p>
              </div>
              <div style={styles.buttonGroup}>
                <Link
                  to={`/study/learn/${study._id}`}
                  style={{ ...styles.button, ...styles.learnButton }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,95,26,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                >
                  <span>📚</span> Learn
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudySelection;