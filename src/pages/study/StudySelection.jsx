import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL;

const StudySelection = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyType = searchParams.get('type') || 'basic';

  const studyTypeNames = {
    basic: 'BASIC STUDY',
    positional: 'POSITIONAL STUDY'
  };

  const studyTypeColors = {
    basic: {
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      accentColor: 'rgba(16, 185, 129, 0.15)'
    },
    positional: {
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      accentColor: 'rgba(6, 182, 212, 0.15)'
    }
  };

  const currentColor = studyTypeColors[studyType] || studyTypeColors.basic;

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
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 70% 60%, rgba(239, 68, 68, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 50% 90%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
      `,
      pointerEvents: 'none',
      zIndex: 0,
    },
    gridPattern: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.5,
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    headerSection: {
      marginBottom: '40px',
      textAlign: 'center',
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      padding: '12px 24px',
      background: 'rgba(15, 15, 15, 0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      textDecoration: 'none',
      zIndex: 2,
    },
    titleContainer: {
      position: 'relative',
      display: 'inline-block',
      padding: '0 60px',
    },
    mainTitle: {
      fontSize: '36px',
      fontWeight: '800',
      margin: '0 0 10px 0',
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #ff4757 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-1px',
      textShadow: '0 0 60px rgba(255, 107, 107, 0.3)',
    },
    titleGlow: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '120%',
      height: '120%',
      background: 'radial-gradient(ellipse, rgba(255, 107, 107, 0.2) 0%, transparent 70%)',
      filter: 'blur(30px)',
      zIndex: -1,
    },
    subtitle: {
      fontSize: '16px',
      color: '#94a3b8',
      fontWeight: '400',
      maxWidth: '600px',
      margin: '0 auto',
      lineHeight: '1.6',
    },
    studiesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px',
      padding: '20px 0',
    },
    studyCard: {
      position: 'relative',
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      color: '#ffffff',
    },
    cardBorderGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '20px',
      padding: '1px',
      background: `linear-gradient(135deg, transparent, ${currentColor.color}, transparent)`,
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
    },
    cardContent: {
      padding: '28px',
      position: 'relative',
      zIndex: 1,
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '20px',
      gap: '16px',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: currentColor.color,
      margin: '0 0 8px 0',
      letterSpacing: '-0.5px',
      flex: 1,
    },
    cardIcon: {
      fontSize: '28px',
      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
      opacity: 0.8,
    },
    cardDescription: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: '1.6',
      marginBottom: '24px',
      minHeight: '60px',
    },
    learnButton: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      width: '100%',
      padding: '16px 24px',
      background: 'rgba(0, 0, 0, 0.4)',
      border: `1px solid ${currentColor.color}40`,
      borderRadius: '14px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      color: '#ffffff',
      textDecoration: 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    },
    buttonShimmer: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
      transform: 'translateX(-100%)',
      transition: 'transform 0.6s ease',
    },
    cornerAccent: {
      position: 'absolute',
      width: '60px',
      height: '60px',
      opacity: 0.3,
      transition: 'all 0.4s ease',
    },
    cornerTopRight: {
      top: 0,
      right: 0,
      background: 'radial-gradient(circle at top right, currentColor 0%, transparent 70%)',
    },
    cornerBottomLeft: {
      bottom: 0,
      left: 0,
      background: 'radial-gradient(circle at bottom left, currentColor 0%, transparent 70%)',
    },
    loading: {
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '18px',
      padding: '60px',
      fontStyle: 'italic',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      fontSize: '18px',
      padding: '60px',
      fontWeight: '500',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.gridPattern}></div>
        <div style={styles.container}>
          <div style={styles.loading}>Loading studies...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.gridPattern}></div>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      <div style={styles.gridPattern}></div>
      
      <div style={styles.container}>
        <div style={styles.headerSection}>
          <motion.button
            style={styles.backButton}
            onClick={() => navigate('/study')}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            whileHover={{ 
              x: -4,
              background: currentColor.accentColor,
              borderColor: `${currentColor.color}40`,
              boxShadow: `0 8px 32px ${currentColor.accentColor}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <span>←</span> Back to Study Types
          </motion.button>

          <div style={styles.titleContainer}>
            <div style={styles.titleGlow}></div>
            <h1 style={styles.mainTitle}>{studyTypeNames[studyType]}</h1>
            <p style={styles.subtitle}>
              {studyType === 'positional' 
                ? 'Master strategic patterns — piece activity, weak squares, pawn structures, outposts, and exchanges.'
                : studyType === 'realtime'
                ? 'Analyze real games from grandmasters and learn practical decision-making under pressure.'
                : 'Study critical moments from championship games and tournament battles.'}
            </p>
          </div>
        </div>

        <div style={styles.studiesGrid}>
          {studies.map((study, index) => (
            <motion.div
              key={study._id}
              style={styles.studyCard}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                y: -6,
                scale: 1.02,
                boxShadow: `0 20px 40px ${currentColor.accentColor}`,
              }}
              onMouseEnter={(e) => {
                const glow = e.currentTarget.querySelector('.border-glow');
                const corners = e.currentTarget.querySelectorAll('.corner-accent');
                if (glow) glow.style.opacity = '0.6';
                corners.forEach(corner => corner.style.opacity = '0.5');
              }}
              onMouseLeave={(e) => {
                const glow = e.currentTarget.querySelector('.border-glow');
                const corners = e.currentTarget.querySelectorAll('.corner-accent');
                if (glow) glow.style.opacity = '0';
                corners.forEach(corner => corner.style.opacity = '0.3');
              }}
            >
              <div 
                className="border-glow"
                style={{ ...styles.cardBorderGlow, color: currentColor.color }}
              />
              
              <div 
                className="corner-accent"
                style={{ ...styles.cornerAccent, ...styles.cornerTopRight, color: currentColor.color }}
              />
              <div 
                className="corner-accent"
                style={{ ...styles.cornerAccent, ...styles.cornerBottomLeft, color: currentColor.color }}
              />

              <div style={styles.cardContent}>
                <div style={styles.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>{study.title}</h3>
                  </div>
                  <div style={styles.cardIcon}>
                    {studyType === 'positional' ? '♟️' : 
                     studyType === 'realtime' ? '⚡' : '🏆'}
                  </div>
                </div>

                <p style={styles.cardDescription}>{study.description}</p>

                <Link
                  to={`/study/learn/${study._id}`}
                  style={styles.learnButton}
                  onMouseEnter={(e) => {
                    const shimmer = e.currentTarget.querySelector('.button-shimmer');
                    if (shimmer) shimmer.style.transform = 'translateX(100%)';
                    e.currentTarget.style.background = currentColor.accentColor;
                    e.currentTarget.style.borderColor = `${currentColor.color}80`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px ${currentColor.accentColor}`;
                  }}
                  onMouseLeave={(e) => {
                    const shimmer = e.currentTarget.querySelector('.button-shimmer');
                    if (shimmer) shimmer.style.transform = 'translateX(-100%)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.borderColor = `${currentColor.color}40`;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="button-shimmer" style={styles.buttonShimmer}></div>
                  <span>📚</span>
                  Start Learning
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudySelection;