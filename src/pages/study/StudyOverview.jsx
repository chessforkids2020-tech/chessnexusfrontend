import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api';
import AboutFeatureCTA from '../../components/marketing/AboutFeatureCTA';

const StudyOverview = () => {
  const navigate = useNavigate();
  const [studyStats, setStudyStats] = useState({
    basic: { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Beginner' },
    positional: { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Advanced' }
  });
  // Whether the admin has published any public books. The Books card only shows
  // when at least one published book exists (GET /api/books returns published only).
  const [hasBooks, setHasBooks] = useState(false);

  // Fetch real statistics from your backend API
  useEffect(() => {
    const fetchStudyStats = async () => {
      try {
        const response = await api.get('/api/study/stats');
        const data = response.data;
        
        // Ensure data has the correct structure with fallbacks
        setStudyStats({
          basic: data?.basic || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Beginner' },
          positional: data?.positional || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Advanced' }
        });
      } catch (error) {
        // Keep default values on error
        console.error('Failed to fetch study stats:', error);
      }
    };

    fetchStudyStats();

    // Only surface the Books card if the admin has published at least one book.
    const fetchBooks = async () => {
      try {
        const res = await api.get('/api/books');
        setHasBooks(Array.isArray(res.data) && res.data.length > 0);
      } catch (error) {
        setHasBooks(false);
      }
    };
    fetchBooks();
  }, []);

  // Single unified "Study" card. Stats combine basic + positional so existing
  // positional studies/chapters/puzzles still get counted in the merged view.
  const basicStats = studyStats?.basic || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Beginner' };
  const positionalStats = studyStats?.positional || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Advanced' };
  const combinedStats = {
    studies: (basicStats.studies || 0) + (positionalStats.studies || 0),
    chapters: (basicStats.chapters || 0) + (positionalStats.chapters || 0),
    puzzles: (basicStats.puzzles || 0) + (positionalStats.puzzles || 0),
    difficulty: 'All Levels'
  };

  const studyTypes = [
    {
      type: 'basic',
      title: 'STUDY',
      description: 'Master chess concepts — tactics, opening principles, endgame patterns, strategic ideas, piece activity, weak squares, pawn structures, and more.',
      icon: '♟️',
      color: 'var(--color-success)',
      gradient: 'linear-gradient(135deg, var(--color-accent-2) 0%, var(--color-accent-2) 100%)',
      accentColor: 'var(--color-success-a12)',
      stats: combinedStats
    }
  ];

  const styles = {
    page: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'var(--color-bg)',
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
        radial-gradient(circle at 30% 20%, var(--color-accent-a15) 0%, transparent 50%),
        radial-gradient(circle at 70% 60%, var(--color-danger-a12) 0%, transparent 50%),
        radial-gradient(circle at 50% 90%, var(--color-accent-2-a12) 0%, transparent 50%)
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
        linear-gradient(var(--color-accent-a06) 1px, transparent 1px),
        linear-gradient(90deg, var(--color-accent-a06) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.5,
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    heroSection: {
      textAlign: 'center',
      marginBottom: '0px',
      position: 'relative',
    },
    mainTitle: {
      fontSize: '36px',
      fontWeight: '800',
      margin: '0 0 0px 0',
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #ff4757 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-2px',
      textShadow: '0 0 80px rgba(255, 107, 107, 0.3)',
      position: 'relative',
    },
    titleGlow: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse, rgba(255, 107, 107, 0.2) 0%, transparent 70%)',
      filter: 'blur(40px)',
      zIndex: -1,
    },
    subtitle: {
      fontSize: '18px',
      color: 'var(--color-text-muted)',
      fontWeight: '400',
      maxWidth: '600px',
      margin: '0 auto 40px',
      lineHeight: '1.8',
    },
    statsBar: {
      display: 'flex',
      justifyContent: 'center',
      gap: '40px',
      flexWrap: 'wrap',
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    statLabel: {
      fontSize: '13px',
      color: 'var(--color-text-faint)',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontWeight: '600',
    },
    studiesContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
      gap: '32px',
      padding: '20px 0',
    },
    studyCard: {
      position: 'relative',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-2xl)',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    cardBorderGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 'var(--radius-2xl)',
      padding: '1px',
      background: 'linear-gradient(135deg, transparent, currentColor, transparent)',
      WebkitMask: 'linear-gradient(var(--color-text) 0 0) content-box, linear-gradient(var(--color-text) 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
    },
    cardContent: {
      padding: '36px',
      position: 'relative',
      zIndex: 1,
    },
    cardTopBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '28px',
      paddingBottom: '20px',
      borderBottom: '1px solid var(--color-white-a04)',
    },
    cardIconSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    cardIconHex: {
      width: '72px',
      height: '72px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hexagon: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      background: 'var(--color-black-a35)',
      clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
      border: '2px solid var(--color-white-a10)',
      transition: 'all 0.4s ease',
    },
    cardIcon: {
      fontSize: '36px',
      position: 'relative',
      zIndex: 1,
      filter: 'drop-shadow(0 4px 12px var(--color-black-a50))',
    },
    cardTitleGroup: {
      flex: 1,
    },
    cardTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'var(--color-text)',
      margin: '0 0 4px 0',
      letterSpacing: '-0.5px',
    },
    difficultyBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: 'var(--color-white-a04)',
      border: '1px solid var(--color-white-a10)',
    },
    cardDescription: {
      fontSize: '15px',
      color: 'var(--color-text-muted)',
      lineHeight: '1.7',
      marginBottom: '28px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '28px',
    },
    statBox: {
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a04)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 12px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    statBoxValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'var(--color-text)',
      marginBottom: '4px',
    },
    statBoxLabel: {
      fontSize: '11px',
      color: 'var(--color-text-faint)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600',
    },
    actionsContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    },
    actionButton: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '20px 16px',
      background: 'var(--color-black-a35)',
      border: '1px solid var(--color-white-a07)',
      borderRadius: 'var(--radius-xl)',
      textDecoration: 'none',
      color: 'var(--color-text)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    },
    actionIconWrapper: {
      fontSize: '32px',
      filter: 'drop-shadow(0 4px 8px var(--color-black-a35))',
      transition: 'transform 0.3s ease',
    },
    actionLabel: {
      fontSize: '15px',
      fontWeight: '600',
      color: 'var(--color-text)',
      textAlign: 'center',
    },
    actionSubtext: {
      fontSize: '11px',
      color: 'var(--color-text-faint)',
      textAlign: 'center',
      lineHeight: '1.4',
    },
    shimmer: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(45deg, transparent 30%, var(--color-white-a10) 50%, transparent 70%)',
      transform: 'translateX(-100%)',
      transition: 'transform 0.6s ease',
    },
    cornerAccent: {
      position: 'absolute',
      width: '80px',
      height: '80px',
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
  };

  return (
    <div style={styles.page}>
      <div style={styles.background}></div>
      <div style={styles.gridPattern}></div>
      
      <div style={styles.container}>

        {/* Quick-access feature cards — top row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {/* Beginners Academy — for absolute newbies: how pieces move, square names, etc.
              Coming soon: card is shown but disabled until the module is ready. */}
          <motion.div
            style={{ position: 'relative', background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'default', opacity: 0.7 }}
          >
            <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#2dd4bf', background: 'rgba(45,212,191,0.14)', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>Coming Soon</div>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎓</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2dd4bf', marginBottom: 6 }}>Beginners Academy</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Brand new to chess? Learn how every piece moves, square names, captures and more — step by step with your Nexus Coach.</div>
          </motion.div>

          <motion.div
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid var(--color-warning-a20)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'var(--color-warning-a12)', boxShadow: '0 12px 40px var(--color-warning-a12)' }}
            onClick={() => navigate('/public-studies')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-warning)', marginBottom: 6 }}>Public Studies</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Browse community-created studies with chapters and positions. Create your own and share your knowledge.</div>
          </motion.div>

          {/* Books card — only shown when the admin has published at least one book. */}
          {hasBooks && (
            <motion.div
              style={{ background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a20)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
              whileHover={{ scale: 1.03, background: 'var(--color-success-a12)', boxShadow: '0 12px 40px var(--color-success-a12)' }}
              onClick={() => navigate('/study/books')}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📖</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-success)', marginBottom: 6 }}>Books</div>
              <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Read chess books chapter by chapter. Chapter 1 is free for everyone; unlock the rest with your XP.</div>
            </motion.div>
          )}

          <motion.div
            style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid var(--color-accent-a15)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'var(--color-accent-a15)', boxShadow: '0 12px 40px var(--color-accent-a15)' }}
            onClick={() => navigate('/study/endgames')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏁</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-accent)', marginBottom: 6 }}>Endgames</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Master endgames from real grandmaster games — rook, pawn, queen, minor-piece and more. Pick a type and play through how champions converted them.</div>
          </motion.div>
        </div>

        <div style={styles.studiesContainer}>
          {studyTypes.map((studyType, index) => (
            <motion.div
              key={studyType.type}
              style={styles.studyCard}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ 
                y: -8,
                scale: 1.02,
                boxShadow: `0 20px 60px ${studyType.accentColor}, 0 0 0 1px ${studyType.color}40`,
              }}
              onMouseEnter={(e) => {
                const glow = e.currentTarget.querySelector('.border-glow');
                const corners = e.currentTarget.querySelectorAll('.corner-accent');
                const hex = e.currentTarget.querySelector('.hexagon');
                
                if (glow) glow.style.opacity = '0.6';
                corners.forEach(corner => corner.style.opacity = '0.5');
                if (hex) {
                  hex.style.background = studyType.accentColor;
                  hex.style.borderColor = studyType.color;
                  hex.style.transform = 'scale(1.1) rotate(180deg)';
                }
              }}
              onMouseLeave={(e) => {
                const glow = e.currentTarget.querySelector('.border-glow');
                const corners = e.currentTarget.querySelectorAll('.corner-accent');
                const hex = e.currentTarget.querySelector('.hexagon');
                
                if (glow) glow.style.opacity = '0';
                corners.forEach(corner => corner.style.opacity = '0.3');
                if (hex) {
                  hex.style.background = 'var(--color-black-a35)';
                  hex.style.borderColor = 'var(--color-white-a10)';
                  hex.style.transform = 'scale(1) rotate(0deg)';
                }
              }}
            >
              <div 
                className="border-glow"
                style={{ ...styles.cardBorderGlow, color: studyType.color }}
              />
              
              <div 
                className="corner-accent"
                style={{ ...styles.cornerAccent, ...styles.cornerTopRight, color: studyType.color }}
              />
              <div 
                className="corner-accent"
                style={{ ...styles.cornerAccent, ...styles.cornerBottomLeft, color: studyType.color }}
              />

              <div style={styles.cardContent}>
                <div style={styles.cardTopBar}>
                  <div style={styles.cardIconSection}>
                    <div style={styles.cardIconHex}>
                      <div 
                        className="hexagon"
                        style={styles.hexagon}
                      />
                      <div style={styles.cardIcon}>{studyType.icon}</div>
                    </div>
                    <div style={styles.cardTitleGroup}>
                      <h2 style={styles.cardTitle}>{studyType.title}</h2>
                      <span style={{ 
                        ...styles.difficultyBadge, 
                        color: studyType.color,
                        borderColor: `${studyType.color}40`,
                      }}>
                        {studyType.stats.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={styles.cardDescription}>{studyType.description}</p>

                <div style={styles.statsGrid}>
                  <motion.div 
                    style={styles.statBox}
                    whileHover={{ 
                      y: -4,
                      background: studyType.accentColor,
                      borderColor: `${studyType.color}40`,
                    }}
                  >
                    <div style={{ ...styles.statBoxValue, color: studyType.color }}>
                      {studyType.stats.studies}
                    </div>
                    <div style={styles.statBoxLabel}>Studies</div>
                  </motion.div>
                  <motion.div 
                    style={styles.statBox}
                    whileHover={{ 
                      y: -4,
                      background: studyType.accentColor,
                      borderColor: `${studyType.color}40`,
                    }}
                  >
                    <div style={{ ...styles.statBoxValue, color: studyType.color }}>
                      {studyType.stats.chapters}
                    </div>
                    <div style={styles.statBoxLabel}>Chapter</div>
                  </motion.div>
                  <motion.div 
                    style={styles.statBox}
                    whileHover={{ 
                      y: -4,
                      background: studyType.accentColor,
                      borderColor: `${studyType.color}40`,
                    }}
                  >
                    <div style={{ ...styles.statBoxValue, color: studyType.color }}>
                      {studyType.stats.puzzles}
                    </div>
                    <div style={styles.statBoxLabel}>Positions</div>
                  </motion.div>
                </div>

                <div style={styles.actionsContainer}>
                  <Link
                    to={`/study/learn?type=${studyType.type}`}
                    style={{ ...styles.actionButton, gridColumn: '1 / -1' }}
                  >
                    <motion.div
                      whileHover={{ 
                        y: -6,
                        background: studyType.accentColor,
                        borderColor: `${studyType.color}50`,
                        boxShadow: `0 12px 32px ${studyType.accentColor}`,
                      }}
                      style={{
                        ...styles.actionButton,
                        margin: '-20px -16px',
                        padding: '20px 16px',
                      }}
                      onMouseEnter={(e) => {
                        const shimmer = e.currentTarget.querySelector('.shimmer');
                        const icon = e.currentTarget.querySelector('.action-icon');
                        if (shimmer) shimmer.style.transform = 'translateX(100%)';
                        if (icon) icon.style.transform = 'scale(1.2) rotate(10deg)';
                      }}
                      onMouseLeave={(e) => {
                        const shimmer = e.currentTarget.querySelector('.shimmer');
                        const icon = e.currentTarget.querySelector('.action-icon');
                        if (shimmer) shimmer.style.transform = 'translateX(-100%)';
                        if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
                      }}
                    >
                      <div className="shimmer" style={styles.shimmer}></div>
                      <div className="action-icon" style={styles.actionIconWrapper}>📘</div>
                      <div style={{ ...styles.actionLabel, color: studyType.color }}>
                        Study
                      </div>
                      <div style={styles.actionSubtext}>
                        Learn concepts
                      </div>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Master Games card — right side */}
          <motion.div
            style={styles.studyCard}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{
              y: -8,
              scale: 1.02,
              boxShadow: '0 20px 60px var(--color-warning-a12), 0 0 0 1px var(--color-warning-a20)',
            }}
            onMouseEnter={(e) => {
              const glow = e.currentTarget.querySelector('.border-glow');
              const corners = e.currentTarget.querySelectorAll('.corner-accent');
              const hex = e.currentTarget.querySelector('.hexagon');
              if (glow) glow.style.opacity = '0.6';
              corners.forEach(corner => corner.style.opacity = '0.5');
              if (hex) {
                hex.style.background = 'var(--color-warning-a12)';
                hex.style.borderColor = 'var(--color-warning)';
                hex.style.transform = 'scale(1.1) rotate(180deg)';
              }
            }}
            onMouseLeave={(e) => {
              const glow = e.currentTarget.querySelector('.border-glow');
              const corners = e.currentTarget.querySelectorAll('.corner-accent');
              const hex = e.currentTarget.querySelector('.hexagon');
              if (glow) glow.style.opacity = '0';
              corners.forEach(corner => corner.style.opacity = '0.3');
              if (hex) {
                hex.style.background = 'var(--color-black-a35)';
                hex.style.borderColor = 'var(--color-white-a10)';
                hex.style.transform = 'scale(1) rotate(0deg)';
              }
            }}
          >
            <div
              className="border-glow"
              style={{ ...styles.cardBorderGlow, color: 'var(--color-warning)' }}
            />
            <div
              className="corner-accent"
              style={{ ...styles.cornerAccent, ...styles.cornerTopRight, color: 'var(--color-warning)' }}
            />
            <div
              className="corner-accent"
              style={{ ...styles.cornerAccent, ...styles.cornerBottomLeft, color: 'var(--color-warning)' }}
            />

            <div style={styles.cardContent}>
              <div style={styles.cardTopBar}>
                <div style={styles.cardIconSection}>
                  <div style={styles.cardIconHex}>
                    <div className="hexagon" style={styles.hexagon} />
                    <div style={styles.cardIcon}>🏆</div>
                  </div>
                  <div style={styles.cardTitleGroup}>
                    <h2 style={styles.cardTitle}>MASTERS GAMES</h2>
                    <span style={{
                      ...styles.difficultyBadge,
                      color: 'var(--color-warning)',
                      borderColor: 'var(--color-warning-a20)',
                    }}>
                      Grandmasters
                    </span>
                  </div>
                </div>
              </div>

              <p style={styles.cardDescription}>
                Explore legendary games from world champions and grandmasters. Replay immortal classics and learn the ideas behind every move.
              </p>

              {/* Feature highlights — mirrors the Study card's stats grid for visual balance */}
              <div style={styles.statsGrid}>
                <Link to="/master-games/browse" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={styles.statBox}
                    whileHover={{ y: -4, background: 'var(--color-warning-a12)', borderColor: 'var(--color-warning-a20)' }}
                  >
                    <div style={{ ...styles.statBoxValue, color: 'var(--color-warning)' }}>♟</div>
                    <div style={styles.statBoxLabel}>Browse</div>
                  </motion.div>
                </Link>
                <Link to="/master-games/immortal" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={styles.statBox}
                    whileHover={{ y: -4, background: 'var(--color-warning-a12)', borderColor: 'var(--color-warning-a20)' }}
                  >
                    <div style={{ ...styles.statBoxValue, color: 'var(--color-warning)' }}>♛</div>
                    <div style={styles.statBoxLabel}>Immortal</div>
                  </motion.div>
                </Link>
                <Link to="/master-games/players" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={styles.statBox}
                    whileHover={{ y: -4, background: 'var(--color-warning-a12)', borderColor: 'var(--color-warning-a20)' }}
                  >
                    <div style={{ ...styles.statBoxValue, color: 'var(--color-warning)' }}>♚</div>
                    <div style={styles.statBoxLabel}>Players</div>
                  </motion.div>
                </Link>
              </div>

              <div style={styles.actionsContainer}>
                <Link
                  to="/master-games"
                  style={{ ...styles.actionButton, gridColumn: '1 / -1' }}
                >
                  <motion.div
                    whileHover={{
                      y: -6,
                      background: 'var(--color-warning-a12)',
                      borderColor: 'var(--color-warning-a30)',
                      boxShadow: '0 12px 32px var(--color-warning-a12)',
                    }}
                    style={{
                      ...styles.actionButton,
                      margin: '-20px -16px',
                      padding: '20px 16px',
                    }}
                    onMouseEnter={(e) => {
                      const shimmer = e.currentTarget.querySelector('.shimmer');
                      const icon = e.currentTarget.querySelector('.action-icon');
                      if (shimmer) shimmer.style.transform = 'translateX(100%)';
                      if (icon) icon.style.transform = 'scale(1.2) rotate(10deg)';
                    }}
                    onMouseLeave={(e) => {
                      const shimmer = e.currentTarget.querySelector('.shimmer');
                      const icon = e.currentTarget.querySelector('.action-icon');
                      if (shimmer) shimmer.style.transform = 'translateX(-100%)';
                      if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
                    }}
                  >
                    <div className="shimmer" style={styles.shimmer}></div>
                    <div className="action-icon" style={styles.actionIconWrapper}>♚</div>
                    <div style={{ ...styles.actionLabel, color: 'var(--color-warning)' }}>
                      Show Masters Games
                    </div>
                    <div style={styles.actionSubtext}>
                      Browse champion classics
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick-access feature cards — bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 32 }}>
          <motion.div
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'rgba(52,211,153,0.1)', boxShadow: '0 12px 40px rgba(52,211,153,0.12)' }}
            onClick={() => navigate('/my-studies')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-success)', marginBottom: 6 }}>My Studies</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>View and manage your studies — organised by chapters. Play through your saved positions.</div>
          </motion.div>

          <motion.div
            style={{ background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a20)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'var(--color-danger-a12)', boxShadow: '0 12px 40px var(--color-danger-a12)' }}
            onClick={() => navigate('/study/sparring/duel/create')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚔</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-danger)', marginBottom: 6 }}>Study Duel</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Challenge a classmate 1v1 in real time. Create a room and share the code. Best accuracy wins.</div>
          </motion.div>

          <motion.div
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid var(--color-danger-a12)', borderRadius: 'var(--radius-xl)', padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'var(--color-danger-a12)', boxShadow: '0 12px 40px var(--color-danger-a12)' }}
            onClick={() => navigate('/study/sparring/join')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-danger)', marginBottom: 6 }}>Join Duel / Coaching</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Got a room code? Enter it here to join a duel or coaching session your partner shared with you.</div>
          </motion.div>
        </div>

      </div>

      <AboutFeatureCTA
        links={[{ label: "About Chess Study", to: "/chess-study" }]}
      />
    </div>
  );
};

export default StudyOverview;
