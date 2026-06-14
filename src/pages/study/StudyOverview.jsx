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
  }, []);

  const studyTypes = [
    {
      type: 'basic',
      title: 'BASIC STUDY',
      description: 'Master fundamental chess concepts — basic tactics, opening principles, endgame patterns, and essential strategies.',
      icon: '♟️',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      accentColor: 'rgba(16, 185, 129, 0.15)',
      stats: studyStats?.basic || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Beginner' } // Use dynamic data with fallback
    },
    {
      type: 'positional',
      title: 'POSITIONAL STUDY',
      description: 'Master strategic patterns — piece activity, weak squares, pawn structures, outposts, and exchanges.',
      icon: '⚡',
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      accentColor: 'rgba(6, 182, 212, 0.15)',
      stats: studyStats?.positional || { studies: 0, chapters: 0, puzzles: 0, difficulty: 'Advanced' } // Use dynamic data with fallback
    }
  ];

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
      color: '#94a3b8',
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
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    statLabel: {
      fontSize: '13px',
      color: '#64748b',
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
      background: 'rgba(15, 15, 15, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
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
      borderRadius: '24px',
      padding: '1px',
      background: 'linear-gradient(135deg, transparent, currentColor, transparent)',
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
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
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
      background: 'rgba(0, 0, 0, 0.4)',
      clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      transition: 'all 0.4s ease',
    },
    cardIcon: {
      fontSize: '36px',
      position: 'relative',
      zIndex: 1,
      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
    },
    cardTitleGroup: {
      flex: 1,
    },
    cardTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      margin: '0 0 4px 0',
      letterSpacing: '-0.5px',
    },
    difficultyBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    cardDescription: {
      fontSize: '15px',
      color: '#94a3b8',
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
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '16px 12px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    statBoxValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '4px',
    },
    statBoxLabel: {
      fontSize: '11px',
      color: '#64748b',
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
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      textDecoration: 'none',
      color: '#ffffff',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    },
    actionIconWrapper: {
      fontSize: '32px',
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
      transition: 'transform 0.3s ease',
    },
    actionLabel: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#ffffff',
      textAlign: 'center',
    },
    actionSubtext: {
      fontSize: '11px',
      color: '#64748b',
      textAlign: 'center',
      lineHeight: '1.4',
    },
    shimmer: {
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
          <motion.div
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 18, padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'rgba(52,211,153,0.1)', boxShadow: '0 12px 40px rgba(52,211,153,0.12)' }}
            onClick={() => navigate('/my-puzzles')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🧩</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#34d399', marginBottom: 6 }}>My Positions</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>View and manage your saved custom positions. Share links with friends or play any saved position.</div>
          </motion.div>

          <motion.div
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 18, padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'rgba(251,191,36,0.1)', boxShadow: '0 12px 40px rgba(251,191,36,0.12)' }}
            onClick={() => navigate('/public-studies')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fbbf24', marginBottom: 6 }}>Public Studies</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Browse community-created studies with chapters and positions. Create your own and share your knowledge.</div>
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
                  hex.style.background = 'rgba(0, 0, 0, 0.4)';
                  hex.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
                    <div style={styles.statBoxLabel}>Puzzles</div>
                  </motion.div>
                </div>

                <div style={styles.actionsContainer}>
                  <Link
                    to={`/study/learn?type=${studyType.type}`}
                    style={styles.actionButton}
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

                  <Link
                    to={`/study/test?type=${studyType.type}`}
                    style={styles.actionButton}
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
                        if (icon) icon.style.transform = 'scale(1.2) rotate(-10deg)';
                      }}
                      onMouseLeave={(e) => {
                        const shimmer = e.currentTarget.querySelector('.shimmer');
                        const icon = e.currentTarget.querySelector('.action-icon');
                        if (shimmer) shimmer.style.transform = 'translateX(-100%)';
                        if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
                      }}
                    >
                      <div className="shimmer" style={styles.shimmer}></div>
                      <div className="action-icon" style={styles.actionIconWrapper}>🧠</div>
                      <div style={{ ...styles.actionLabel, color: studyType.color }}>
                        Test
                      </div>
                      <div style={styles.actionSubtext}>
                        Apply knowledge
                      </div>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick-access feature cards — bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 32 }}>
          <motion.div
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 18, padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'rgba(239,68,68,0.1)', boxShadow: '0 12px 40px rgba(239,68,68,0.12)' }}
            onClick={() => navigate('/study/sparring/duel/create')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚔</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f87171', marginBottom: 6 }}>Study Duel</div>
            <div style={{ fontSize: 13, color: '#a3a3a3', lineHeight: 1.6 }}>Challenge a classmate 1v1 in real time. Create a room and share the code. Best accuracy wins.</div>
          </motion.div>

          <motion.div
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 18, padding: '24px 22px', cursor: 'pointer' }}
            whileHover={{ scale: 1.03, background: 'rgba(239,68,68,0.08)', boxShadow: '0 12px 40px rgba(239,68,68,0.1)' }}
            onClick={() => navigate('/study/sparring/join')}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fca5a5', marginBottom: 6 }}>Join Duel / Coaching</div>
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
