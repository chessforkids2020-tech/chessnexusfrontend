// pages/CoachHubPage.jsx
//
// /coach-hub — the public "Coach" destination in the sidebar.
//
// PUBLIC on purpose: visible to everyone, logged in or not. It is a page ABOUT
// coaching on Chess Nexus, NOT the coach's own dashboard (that is /coach/dashboard,
// reached from the coach-only shortcut in the sidebar footer).
//
// Placeholder shell. The content is still to be decided — see the note below.
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './CoachHubPage.css';

export default function CoachHubPage() {
  return (
    <div className="chub-page">
      <SEO
        title="Coaching on Chess Nexus"
        description="Learn with a coach on Chess Nexus — live classes, homework, and progress your parents can see."
        canonical="/coach-hub"
      />

      <div className="chub-card">
        <div className="chub-ic" aria-hidden="true">🎓</div>
        <h1 className="chub-title">Coaching on Chess Nexus</h1>
        <p className="chub-sub">
          This page is being built. It will show what learning with a coach here
          looks like.
        </p>

        <div className="chub-links">
          <Link to="/chess-coaching" className="chub-btn">How coaching works</Link>
          <Link to="/my-coach" className="chub-btn chub-btn-ghost">My coach</Link>
        </div>
      </div>
    </div>
  );
}
