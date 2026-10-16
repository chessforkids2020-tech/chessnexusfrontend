// components/ResponsiveLayout.jsx
import { useState, useEffect } from 'react';
import './ResponsiveLayout.css';
import { t as tr } from '../i18n/LanguageContext';

export default function ResponsiveLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="responsive-container">
      {/* Responsive Navigation */}
      <nav className="responsive-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <img src="/logo.png" alt={tr("Chess Nexus Logo")} className="logo-image" />
            <span className="brand-text">{tr("Chess Puzzle Arena")}</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="desktop-nav">
            <NavLinks />
          </div>
          
          {/* Mobile Navigation */}
          <button 
            className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={tr("Toggle menu")}
          >
            <span className="menu-line"></span>
            <span className="menu-line"></span>
            <span className="menu-line"></span>
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMobile && isMenuOpen && (
          <div className="mobile-nav-dropdown">
            <NavLinks onClose={() => setIsMenuOpen(false)} />
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="responsive-main">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      
      {/* Responsive Footer */}
      <footer className="responsive-footer">
        <div className="footer-content">
          <p>{tr("© 2024 Chess Puzzle Arena. All rights reserved.")}</p>
          <div className="footer-links">
            <a href="/privacy">{tr("Privacy")}</a>
            <a href="/terms">{tr("Terms")}</a>
            <a href="/contact">{tr("Contact")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Reusable Navigation Links Component
function NavLinks({ onClose }) {
  const navItems = [
    { path: '/', label: tr('Dashboard') },
    { path: '/puzzles', label: tr('Puzzles') },
    { path: '/tournament', label: tr('Puzzle Tournament') },
    { path: '/arena-race', label: tr('Arena Race') },
    { path: '/team-race', label: tr('Team Race') },
    { path: '/individual-race', label: tr('Individual Race') },
    { path: '/study', label: tr('Study') },
    { path: '/profile', label: tr('Profile') },
  ];

  return (
    <>
      {navItems.map((item) => (
        <a 
          key={item.path}
          href={item.path}
          className="nav-link"
          onClick={onClose}
        >
          {item.label}
        </a>
      ))}
    </>
  );
}
