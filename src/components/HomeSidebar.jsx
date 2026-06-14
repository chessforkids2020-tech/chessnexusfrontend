import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomeSidebar.css';

export default function HomeSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button 
          className="home-sidebar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      )}

      {/* Sidebar */}
      <div className={`home-sidebar ${isExpanded ? 'expanded' : ''} ${isMobile ? 'mobile' : ''}`}>
        <div className="home-sidebar-header">
          <h2 className="home-sidebar-title">Chess Nexus</h2>
        </div>

        <nav className="home-sidebar-nav">
          <button 
            className={`home-sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => handleNavigate('/')}
          >
            🏠 Home
          </button>

          <button 
            className="home-sidebar-link"
            onClick={() => scrollToSection('features')}
          >
            🎯 Features
          </button>

          <button 
            className="home-sidebar-link"
            onClick={() => scrollToSection('about')}
          >
            ℹ️ About
          </button>

          <button 
            className="home-sidebar-link"
            onClick={() => handleNavigate('/contest-rules')}
          >
            📋 Rules
          </button>

          <button 
            className="home-sidebar-link"
            onClick={() => handleNavigate('/contact')}
          >
            📞 Contact
          </button>

          <button 
            className="home-sidebar-link"
            onClick={() => handleNavigate('/event')}
          >
            🎫 Events
          </button>

          <button 
            className="home-sidebar-link login-link"
            onClick={() => handleNavigate('/login')}
          >
            🔐 Login
          </button>

          <button 
            className="home-sidebar-link signup-link"
            onClick={() => handleNavigate('/signup-request')}
          >
            📝 Sign Up
          </button>
        </nav>

        <div className="home-sidebar-footer">
          <p>Improve your chess skills!</p>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobile && isExpanded && (
        <div 
          className="home-sidebar-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}