import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import CoachSidebar from './CoachSidebar';
import AcademySidebar from './AcademySidebar';
import StudyPuzzleSidebar from './StudyPuzzleSidebar';
import Footer from './Footer';
import FeedbackPromptGate from './FeedbackPromptGate';
import './UserLayout.css';

// Pages that use the slim 60px icon rail instead of the 170px main sidebar,
// because they need the horizontal room (e.g. My Coach's nine tabs).
const NARROW_SIDEBAR_PATHS = ['/my-coach'];

// Pages that hide the sidebar entirely on desktop, because they lay out their own
// full-width workspace (e.g. the Healthy Mix board + side cards). The mobile
// hamburger still works, so the sidebar stays reachable at every size.
const HIDDEN_SIDEBAR_PATHS = ['/training/healthy-mix'];

export default function UserLayout({ children, showFooter = true }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Inside the coaching workspace, show the dedicated coach sidebar instead of
  // the main one. Onboarding is excluded — you're not a coach yet there.
  const inCoachArea = location.pathname.startsWith('/coach/') &&
    location.pathname !== '/coach/onboarding';

  // Academy workspace gets its own dedicated sidebar.
  const inAcademyArea = location.pathname.startsWith('/academy/');

  // NOTE: the "no-tools academy owner → academy" redirect used to live here, but
  // it raced with CoachDashboard's own redirect and made the page flip. It now
  // lives in CoachRoute (App.jsx), which resolves it once before rendering.

  // Slim icon rail on cramped pages. It renders its own fixed 60px bar (and its
  // own hamburger on mobile portrait), so it needs no onNavigate.
  const useNarrowSidebar = NARROW_SIDEBAR_PATHS.includes(location.pathname);

  // Hide the persistent sidebar on these pages (desktop + landscape). On mobile
  // portrait the hamburger + overlay below still render, so it stays accessible.
  const hideSidebar = HIDDEN_SIDEBAR_PATHS.includes(location.pathname);

  const renderSidebar = (onNavigate) =>
    useNarrowSidebar
      ? <StudyPuzzleSidebar />
      : inAcademyArea
        ? <AcademySidebar onNavigate={onNavigate} />
        : inCoachArea
          ? <CoachSidebar onNavigate={onNavigate} />
          : <Sidebar user={user} onNavigate={onNavigate} />;

  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 1024; // Increased to include tablets
      const landscape = window.innerHeight < window.innerWidth && window.innerWidth <= 1024;
      setIsMobile(mobile);
      setIsLandscape(landscape);
      // Auto-close sidebar on mobile when resizing to desktop
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, []);

  return (
    <div className="user-layout-container">
      <div className="user-content-wrapper">
        <>
          {/* The narrow rail renders itself at every size — including its own
              hamburger + overlay on mobile portrait — so it opts out of the
              layout's mobile chrome below. */}
          {useNarrowSidebar ? renderSidebar() : (
            <>
              {/* Desktop Sidebar or Landscape Mode Sidebar (always visible) */}
              {(!isMobile || isLandscape) && !hideSidebar && renderSidebar()}

              {/* Mobile Portrait Sidebar Overlay */}
              {isMobile && !isLandscape && isSidebarOpen && (
                <>
                  <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <div className="sidebar-mobile">
                    {renderSidebar(() => setIsSidebarOpen(false))}
                  </div>
                </>
              )}

              {/* Floating Hamburger Button - Only show when sidebar is closed */}
              {isMobile && !isLandscape && !isSidebarOpen && (
                <button className="floating-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                  ☰
                </button>
              )}
            </>
          )}

          <div className={`user-main-content ${hideSidebar ? 'no-sidebar' : 'with-sidebar'} ${useNarrowSidebar ? 'narrow-sidebar' : ''} ${isMobile ? 'mobile' : 'desktop'} ${isLandscape ? 'landscape' : ''}`}>
            {children}
          </div>
        </>
      </div>
      {showFooter !== false && <Footer />}
      {/* First-session feedback prompt (self-gating: shows once, ~3 min in, to new
          signups and guests). Mounted here so it can appear on any in-app page. */}
      <FeedbackPromptGate />
    </div>
  );
}