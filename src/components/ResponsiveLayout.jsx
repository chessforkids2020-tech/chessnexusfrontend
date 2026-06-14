// components/ResponsiveLayout.jsx
import { useState, useEffect } from 'react';
import './ResponsiveLayout.css';

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
            <img src="/logo.png" alt="Chess Nexus Logo" className="logo-image" />
            <span className="brand-text">Chess Puzzle Arena</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="desktop-nav">
            <NavLinks />
          </div>
          
          {/* Mobile Navigation */}
          <button 
            className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
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
          <p>© 2024 Chess Puzzle Arena. All rights reserved.</p>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Reusable Navigation Links Component
function NavLinks({ onClose }) {
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/puzzles', label: 'Puzzles' },
    { path: '/tournament', label: 'Puzzle Tournament' },
    { path: '/arena-race', label: 'Arena Race' },
    { path: '/team-race', label: 'Team Race' },
    { path: '/individual-race', label: 'Individual Race' },
    { path: '/study', label: 'Study' },
    { path: '/profile', label: 'Profile' },
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
