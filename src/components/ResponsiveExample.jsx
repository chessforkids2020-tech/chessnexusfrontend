// Example Responsive Component
// This demonstrates how to use the responsive grid system
// You can copy this pattern to any page in your app

import React from 'react';
import '../components/ResponsiveGrid.css';
import './ResponsiveExample.css';
import { t as tr } from '../i18n/LanguageContext';

export default function ResponsiveExample() {
  const cards = [
    { id: 1, title: tr('Dashboard'), icon: '🏠', description: tr('View your stats') },
    { id: 2, title: tr('Puzzles'), icon: '🧩', description: tr('Solve chess puzzles') },
    { id: 3, title: tr('Arena'), icon: '🏟️', description: tr('Join arena battles') },
    { id: 4, title: tr('Study'), icon: '📚', description: tr('Learn techniques') },
    { id: 5, title: tr('Team Race'), icon: '👥', description: tr('Race with team') },
    { id: 6, title: tr('Profile'), icon: '👤', description: tr('Edit your profile') },
  ];

  return (
    <div className="responsive-example-container">
      <header className="example-header">
        <h1 className="example-title">{tr("Responsive Grid Example")}</h1>
        <p className="example-subtitle">
          {tr("This grid adapts to your screen size automatically")}
        </p>
      </header>

      {/* Using responsive-grid class */}
      <div className="responsive-grid">
        {cards.map((card) => (
          <div key={card.id} className="responsive-card">
            <div className="card-icon">{card.icon}</div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
            <button className="card-button">{tr("Open")}</button>
          </div>
        ))}
      </div>

      {/* Using auto-fit-grid for dynamic content */}
      <div className="section-divider"></div>
      
      <h2 className="section-title">{tr("Auto-Fit Grid Example")}</h2>
      <div className="auto-fit-grid">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="responsive-card auto-card">
            <h4>{tr("Card")} {item}</h4>
            <p>{tr("Auto-fits based on available space")}</p>
          </div>
        ))}
      </div>

      {/* Info section */}
      <div className="info-section">
        <h3>{tr("Current Breakpoint Info:")}</h3>
        <ul className="breakpoint-list">
          <li className="bp-mobile">{"📱 Mobile: 0-480px"}</li>
          <li className="bp-mobile-lg">{"📱 Large Mobile: 481-768px"}</li>
          <li className="bp-tablet">{"📱 Tablet: 769-1024px"}</li>
          <li className="bp-laptop">{"💻 Laptop: 1025-1280px"}</li>
          <li className="bp-desktop">{"🖥️ Desktop: 1281px+"}</li>
        </ul>
      </div>
    </div>
  );
}
