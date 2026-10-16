import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './PiecesPicker.css';
import { t as tr } from '../i18n/LanguageContext';

// Compact a count: 124800 → "125k", 980 → "980".
const fmtCount = (n) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `${n}`;
};

// Bucket a piece count into a labelled group (for scannable sections).
const groupFor = (pieces) => {
  if (pieces <= 8) return { name: tr('Few pieces'), slug: 'few', hint: tr('Endgames & simple positions') };
  if (pieces <= 16) return { name: tr('Medium'), slug: 'mid', hint: tr('Middlegame-ish positions') };
  if (pieces <= 24) return { name: tr('Many pieces'), slug: 'many', hint: tr('Busy, complex boards') };
  return { name: tr('Full board'), slug: 'full', hint: tr('Near-opening positions') };
};

export default function PiecesPicker() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/api/public/healthymix/piece-counts')
      .then(res => { setCounts(res.data.pieceCounts || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Split the flat list into ordered groups (Few / Medium / Many / Full board).
  const groups = useMemo(() => {
    const order = [];
    const bySlug = {};
    for (const c of counts) {
      const g = groupFor(c.pieces);
      if (!bySlug[g.slug]) { bySlug[g.slug] = { ...g, items: [] }; order.push(g.slug); }
      bySlug[g.slug].items.push(c);
    }
    return order.map(slug => bySlug[slug]);
  }, [counts]);

  // Picking a count redirects to Healthy Mix, which serves ONLY puzzles with
  // exactly this many pieces, near the user's rating (±400, handled server-side).
  const pick = (pieces) => navigate(`/training/healthy-mix?pieces=${pieces}`);

  return (
    <div className="pp-page">
      <div className="pp-header">
        <div>
          <Link to="/training" className="pp-back">{tr("← Back to Training")}</Link>
          <h1 className="pp-title">{tr("Pick a Piece Count ♟️")}</h1>
          <p className="pp-subtitle">
            {tr("Choose how many pieces are on the board. You'll get puzzles with")}
            <strong> {tr("exactly that many pieces")}</strong>{tr(", around your current rating (±400).")}
            Fewer pieces = simpler positions.
          </p>
        </div>
      </div>

      {loading && <div className="pp-state">{tr("Loading…")}</div>}

      {error && !loading && (
        <div className="pp-state pp-error">{tr("Couldn't load piece counts. Please try again later.")}</div>
      )}

      {!loading && !error && counts.length === 0 && (
        <div className="pp-state">{tr("No puzzles available yet.")}</div>
      )}

      {!loading && !error && groups.map(group => (
        <section key={group.slug} className={`pp-group pp-g-${group.slug}`}>
          <div className="pp-group-head">
            <h2 className="pp-group-title">{group.name}</h2>
            <span className="pp-group-hint">{group.hint}</span>
          </div>
          <div className="pp-grid">
            {group.items.map(c => (
              <button
                key={c.pieces}
                type="button"
                className="pp-card"
                onClick={() => pick(c.pieces)}
              >
                <span className="pp-card-num">{c.pieces}</span>
                <span className="pp-card-text">
                  <span className="pp-card-label">{c.pieces} {tr("pieces")}</span>
                  <span className="pp-card-count">{fmtCount(c.count)} {tr("puzzles")}</span>
                </span>
                <span className="pp-card-arrow">›</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
