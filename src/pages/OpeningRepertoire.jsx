// pages/OpeningRepertoire.jsx
// Dedicated full page for the premium Opening Repertoire Trainer (route: /repertoire).
// The whole feature is premium-gated inside RepertoireTab (free / XP-unlock / supporter /
// coach). Reached from the "Build your opening repertoire" banner on the Master Games home.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import RepertoireTab from '../components/masterGames/RepertoireTab';

export default function OpeningRepertoire() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fde9b8' }}>⭐ Opening Repertoire Trainer</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 620 }}>
            Build your own opening lines, get drilled on them with spaced repetition, and see exactly
            where you left your prep in real games.
          </p>
        </div>
        <button
          onClick={() => navigate('/master-games')}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0 }}
        >
          ← Master Games
        </button>
      </div>
      <RepertoireTab />
    </div>
  );
}
