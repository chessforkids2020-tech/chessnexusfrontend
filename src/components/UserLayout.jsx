import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import CoachSidebar from './CoachSidebar';
import Footer from './Footer';
import './UserLayout.css';

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
  const renderSidebar = (onNavigate) =>
    inCoachArea
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
          {/* Desktop Sidebar or Landscape Mode Sidebar (always visible) */}
          {(!isMobile || isLandscape) && renderSidebar()}

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
          
          <div className={`user-main-content with-sidebar ${isMobile ? 'mobile' : 'desktop'} ${isLandscape ? 'landscape' : ''}`}>
            {children}
          </div>
        </>
      </div>
      {showFooter !== false && <Footer />}
    </div>
  );
}