import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudyPuzzleSidebar() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 1024);
  const [isLandscape, setIsLandscape] = React.useState(window.innerHeight < window.innerWidth && window.innerWidth <= 1024);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      setIsLandscape(window.innerHeight < window.innerWidth && window.innerWidth <= 1024);
      if (!mobile) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isHidden = isMobile && !isLandscape && !isExpanded;

  if (isHidden) {
    return (
      <>
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1002,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-accent-a30)',
            color: 'var(--color-accent)',
            fontSize: '24px',
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px var(--color-black-a35)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'var(--color-accent-a15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'var(--color-bg)';
          }}
        >
          ☰
        </button>
      </>
    );
  }

  const styles = {
    sidebar: {
      position: 'fixed',
      left: isMobile && isExpanded ? '0' : (isMobile ? '-100%' : '0'),
      top: 0,
      width: isMobile ? '280px' : '60px',
      height: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      zIndex: 1001,
      boxShadow: '2px 0 20px var(--color-black-a50)',
      borderRight: '1px solid var(--color-white-a04)',
      backdropFilter: 'blur(10px)',
      fontFamily: "'Poppins', sans-serif",
      transition: 'left 0.3s ease',
    },
    mobileOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'var(--color-black-a50)',
      zIndex: 1000,
      display: isMobile && isExpanded ? 'block' : 'none',
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'var(--color-white-a10)',
      border: 'none',
      color: 'var(--color-text)',
      fontSize: '24px',
      width: '40px',
      height: '40px',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    sidebarIcon: {
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '6px',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'var(--color-text)',
      fontSize: '22px',
      background: 'var(--color-white-a04)',
      border: '1px solid var(--color-white-a10)',
      position: 'relative',
      overflow: 'hidden',
    },
    sidebarIconHover: {
      background: 'var(--color-accent-a15)',
      borderColor: 'var(--color-accent-a30)',
      color: 'var(--color-accent)',
      transform: 'scale(1.1)',
      boxShadow: '0 4px 12px var(--color-accent-a20)',
      borderLeft: '3px solid var(--color-success)',
    },
    activeIcon: {
      background: 'var(--color-accent-a20)',
      borderColor: 'var(--color-accent-a40)',
      color: 'var(--color-accent)',
      boxShadow: '0 4px 12px var(--color-accent-a30)',
    },
    tooltip: {
      position: 'absolute',
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: 0,
      transition: 'opacity 0.2s ease',
      marginLeft: '10px',
      border: '1px solid var(--color-accent-a20)',
      boxShadow: '0 4px 12px var(--color-black-a35)',
      backdropFilter: 'blur(10px)',
      zIndex: 1002,
    },
  };

  const handleMouseEnter = (e, title) => {
    Object.assign(e.currentTarget.style, styles.sidebarIconHover);
    const tooltip = e.currentTarget.querySelector('.tooltip');
    if (tooltip) {
      tooltip.style.opacity = '1';
      tooltip.textContent = title;
    }
  };

  const handleMouseLeave = (e) => {
    const baseStyle = { ...styles.sidebarIcon };
    Object.assign(e.currentTarget.style, baseStyle);
    const tooltip = e.currentTarget.querySelector('.tooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        style={styles.mobileOverlay} 
        onClick={() => setIsExpanded(false)}
      />

      <div style={styles.sidebar}>
        {/* Close button for mobile */}
        {isMobile && (
          <button
            style={styles.closeButton}
            onClick={() => setIsExpanded(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-white-a20)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-white-a10)';
            }}
          >
            ✕
          </button>
        )}

        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/')}
          title="Chess Nexus"
          onMouseEnter={(e) => handleMouseEnter(e, "Chess Nexus")}
          onMouseLeave={handleMouseLeave}
        >
          <img src="/logo.png" alt="Chess Nexus" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 'var(--radius-sm)' }} />
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/dashboard')}
          title="Dashboard"
          onMouseEnter={(e) => handleMouseEnter(e, "Dashboard")}
          onMouseLeave={handleMouseLeave}
        >
          🏠
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/puzzles-hub')}
          title="Puzzles Hub"
          onMouseEnter={(e) => handleMouseEnter(e, "Puzzles Hub")}
          onMouseLeave={handleMouseLeave}
        >
          🏛️
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/race')}
          title="Race Hub"
          onMouseEnter={(e) => handleMouseEnter(e, "Race Hub")}
          onMouseLeave={handleMouseLeave}
        >
          🏁
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/study')}
          title="Study"
          onMouseEnter={(e) => handleMouseEnter(e, "Study")}
          onMouseLeave={handleMouseLeave}
        >
          📚
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          style={styles.sidebarIcon} 
          onClick={() => handleNavigate('/games')}
          title="Games"
          onMouseEnter={(e) => handleMouseEnter(e, "Games")}
          onMouseLeave={handleMouseLeave}
        >
          🎮
          <div className="tooltip" style={styles.tooltip}></div>
        </div>
        <div 
          onClick={() => handleNavigate('/chat')}
          title="Chat"
          onMouseEnter={(e) => handleMouseEnter(e, "Chat")}
          onMouseLeave={handleMouseLeave}
        >
          💬
          <div className="tooltip" style={styles.tooltip}></div>
        </div>

      </div>
    </>
  );
}
