import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { motion } from 'framer-motion';

const StudyChapterSelection = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [studyTitle, setStudyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyType, setStudyType] = useState('basic');
  const [search, setSearch] = useState('');

  const studyTypeColors = {
    basic: {
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      accentColor: 'rgba(16, 185, 129, 0.15)'
    },
    positional: {
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      accentColor: 'rgba(6, 182, 212, 0.15)'
    },
    realtime: {
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      accentColor: 'rgba(239, 68, 68, 0.15)'
    },
    tournament: {
      color: '#fbbf24',
      gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      accentColor: 'rgba(251, 191, 36, 0.15)'
    }
  };

  const currentColor = studyTypeColors[studyType] || studyTypeColors.basic;

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const studyResponse = await api.get('/api/study/all');
        const study = studyResponse.data.find(s => s._id === studyId);
        if (study) {
          setStudyTitle(study.title);
          // Use the actual studyType from the database, default to 'basic'
          if (study.studyType === 'positional' || study.title.toLowerCase().includes('positional')) {
            setStudyType('positional');
          } else {
            setStudyType('basic');
          }
        }

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

  // Filter chapters by the search box (title / description / chapter number).
  const q = search.trim().toLowerCase();
  const filteredChapters = q
    ? chapters.filter((c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        String(c.chapterNumber || '').toLowerCase().includes(q))
    : chapters;

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
    searchWrap: {
      maxWidth: '520px',
      margin: '0 auto 8px',
      position: 'relative',
    },
    searchInput: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '14px 18px 14px 44px',
      background: 'rgba(15, 15, 15, 0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      color: '#ffffff',
      fontSize: '15px',
      outline: 'none',
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94a3b8',
      fontSize: '16px',
      pointerEvents: 'none',
    },
    chaptersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '24px',
      padding: '20px 0',
    },
    chapterCard: {
      position: 'relative',
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      color: '#ffffff',
      cursor: 'pointer',
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
      textAlign: 'center',
    },
    chapterNumber: {
      fontSize: '14px',
      color: currentColor.color,
      fontWeight: '700',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      opacity: 0.9,
    },
    chapterTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#ffffff',
      margin: '0 0 16px 0',
      letterSpacing: '-0.5px',
      lineHeight: '1.4',
    },
    chapterDescription: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: '1.6',
      marginBottom: '20px',
      minHeight: '60px',
    },
    difficultyBadge: {
      display: 'inline-block',
      padding: '6px 16px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${currentColor.color}40`,
      color: currentColor.color,
      marginTop: '12px',
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
    progressIndicator: {
      height: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      marginTop: '20px',
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      background: currentColor.gradient,
      borderRadius: '2px',
      transition: 'width 0.3s ease',
      width: '0%', // You can update this based on chapter progress
    },
    loading: {
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '18px',
      padding: '60px',
      fontStyle: 'italic',
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      fontSize: '18px',
      padding: '60px',
      fontWeight: '500',
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
    },
    emptyState: {
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '18px',
      padding: '60px',
      fontStyle: 'italic',
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
      gridColumn: '1 / -1',
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.background}></div>
        <div style={styles.gridPattern}></div>
        <div style={styles.container}>
          <div style={styles.loading}>Loading chapters...</div>
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
            onClick={() => navigate(`/study/learn?type=${studyType}`)}
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
            <span>←</span> Back to Studies
          </motion.button>

          <div style={styles.titleContainer}>
            <div style={styles.titleGlow}></div>
            <h1 style={styles.mainTitle}>{studyTitle}</h1>
            <p style={styles.subtitle}>
              Select a chapter to begin your learning journey. Chapters are organized from fundamental to advanced concepts.
            </p>
          </div>
        </div>

        {chapters.length > 0 && (
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search chapters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {chapters.length === 0 ? (
          <div style={styles.emptyState}>No chapters available for this study.</div>
        ) : filteredChapters.length === 0 ? (
          <div style={styles.emptyState}>No chapters match “{search}”.</div>
        ) : (
          <>
          <div style={styles.chaptersGrid}>
            {filteredChapters.map((chapter, index) => (
              <motion.div
                key={chapter._id}
                style={styles.chapterCard}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ 
                  y: -6,
                  scale: 1.02,
                  boxShadow: `0 20px 40px ${currentColor.accentColor}`,
                }}
                onClick={() => handleChapterClick(chapter._id)}
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
                  <div style={styles.chapterNumber}>
                    Chapter {chapter.chapterNumber}
                  </div>
                  <h3 style={styles.chapterTitle}>{chapter.title}</h3>
                  
                  {chapter.description && (
                    <p style={styles.chapterDescription}>{chapter.description}</p>
                  )}
                  
                  {chapter.difficulty && (
                    <div style={styles.difficultyBadge}>
                      {chapter.difficulty}
                    </div>
                  )}
                  
                  <div style={styles.progressIndicator}>
                    <div style={{ ...styles.progressBar, width: chapter.progress || '0%' }}></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          </>
        )}
      </div>
    </div>
  );
};

export default StudyChapterSelection;