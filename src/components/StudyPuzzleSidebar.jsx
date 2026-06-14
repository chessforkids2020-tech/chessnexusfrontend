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
            background: 'rgba(10, 10, 10, 0.8)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#67e8f9',
            fontSize: '24px',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(10, 10, 10, 0.8)';
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
      background: 'rgba(10, 10, 10, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      zIndex: 1001,
      boxShadow: '2px 0 20px rgba(0,0,0,0.5)',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
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
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: isMobile && isExpanded ? 'block' : 'none',
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      color: '#ffffff',
      fontSize: '24px',
      width: '40px',
      height: '40px',
      borderRadius: '8px',
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
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: '#ffffff',
      fontSize: '22px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'relative',
      overflow: 'hidden',
    },
    sidebarIconHover: {
      background: 'rgba(6, 182, 212, 0.15)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      color: '#06b6d4',
      transform: 'scale(1.1)',
      boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
      borderLeft: '3px solid #10b981',
    },
    activeIcon: {
      background: 'rgba(6, 182, 212, 0.2)',
      borderColor: 'rgba(6, 182, 212, 0.4)',
      color: '#06b6d4',
      boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
    },
    tooltip: {
      position: 'absolute',
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(23, 23, 23, 0.95)',
      color: '#ffffff',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: 0,
      transition: 'opacity 0.2s ease',
      marginLeft: '10px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
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
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
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
          <img src="/logo.png" alt="Chess Nexus" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} />
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
