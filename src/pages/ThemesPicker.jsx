import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './ThemesPicker.css';

// Compact a count for the badge: 11186 → "11.2k", 980 → "980".
const fmtCount = (n) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
};

export default function ThemesPicker() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/api/public/healthymix/themes')
      .then(res => { setThemes(res.data.themes || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Preserve the catalog order from the backend, but split into groups so the
  // page reads like Lichess (Checkmates, Tactics, Attacks, Endgames…).
  const groups = useMemo(() => {
    const order = [];
    const byGroup = {};
    for (const t of themes) {
      const g = t.group || 'Other';
      if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
      byGroup[g].push(t);
    }
    return order.map(name => ({ name, themes: byGroup[name] }));
  }, [themes]);

  // Picking a theme redirects to Healthy Mix, which will only serve puzzles
  // from this theme near the user's rating (±100, handled server-side).
  const pickTheme = (key) => navigate(`/training/healthy-mix?theme=${encodeURIComponent(key)}`);

  return (
    <div className="tp-page">
      <div className="tp-header">
        <div>
          <Link to="/training" className="tp-back">← Back to Training</Link>
          <h1 className="tp-title">Pick a Theme 🧩</h1>
          <p className="tp-subtitle">
            Train a single pattern. You'll get puzzles <strong>only from the theme you
            pick</strong>, right around your current rating (±100).
          </p>
        </div>
      </div>

      {loading && (
        <div className="tp-state">Loading themes…</div>
      )}

      {error && !loading && (
        <div className="tp-state tp-error">
          Couldn't load themes. Please try again later.
        </div>
      )}

      {!loading && !error && themes.length === 0 && (
        <div className="tp-state">No themes available yet.</div>
      )}

      {!loading && !error && groups.map(group => {
        // Slug like "back-rank" → drives the per-group accent color in CSS.
        const slug = group.name.toLowerCase().replace(/\s+/g, '-');
        return (
        <section key={group.name} className={`tp-group tp-g-${slug}`}>
          <h2 className="tp-group-title">{group.name}</h2>
          <div className="tp-grid">
            {group.themes.map(t => (
              <button
                key={t.key}
                type="button"
                className="tp-card"
                onClick={() => pickTheme(t.key)}
              >
                <span className="tp-card-icon">{t.icon}</span>
                <span className="tp-card-text">
                  <span className="tp-card-top">
                    <span className="tp-card-label">{t.label}</span>
                    <span className="tp-card-count">{fmtCount(t.count)} puzzles</span>
                  </span>
                  {t.desc && <span className="tp-card-desc">{t.desc}</span>}
                </span>
                <span className="tp-card-arrow">›</span>
              </button>
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}
