import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import { useAuth } from '../../../contexts/AuthContext';
import { ACADEMY_CARDS, moodEmoji } from './academyCards';
import PieceMovements from './lessons/PieceMovements';
import './beginners.css';
import { t as tr } from '../../../i18n/LanguageContext';

// A card may carry a `titleKey` when its English title is ambiguous out of context
// ("Check" the chess move vs "Check" = verify). English still shows the plain title.
const cardTitle = (card) => {
  if (!card.titleKey) return tr(card.title);
  const translated = tr(card.titleKey);
  return translated === card.titleKey ? card.title : translated;
};

// The Beginners Academy in Study: a grid of 10 locked lesson cards unlocked one by one,
// with reward points (xpWallet) + a mood emoji up top. Phase 1 has the Piece Movements
// lesson built; other cards open a friendly "coming soon". Progress + unlock come from
// GET /api/beginners-academy (server is the source of truth).

export default function BeginnersAcademyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [open, setOpen] = useState(null);   // open lesson card id, or null (grid)
  const [points, setPoints] = useState(user?.xpWallet?.total ?? 0);

  const load = useCallback(async () => {
    try { const r = await api.get('/api/beginners-academy'); setProgress(r.data); } catch { /* */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const completedCount = progress
    ? ACADEMY_CARDS.filter(c => progress.cards?.[c.id]?.completed).length : 0;

  // When a lesson reports a completed level, refresh progress + points.
  const onLevelDone = useCallback((res) => {
    load();
    if (res?.awardedXp) setPoints((p) => p + res.awardedXp);
  }, [load]);

  // ── Coming Soon gate ──
  // Placed AFTER every hook above (Rules of Hooks: hooks must run in the same
  // order on every render, so this can't be an early return at the top).
  // ── Lesson open ──
  if (open === 'piece-movements') {
    return (
      <div className="ba-wrap">
        <PieceMovements progress={progress} onBack={() => { setOpen(null); load(); }} onLevelDone={onLevelDone} />
      </div>
    );
  }
  if (open) {
    // A not-yet-built card.
    const card = ACADEMY_CARDS.find(c => c.id === open);
    return (
      <div className="ba-wrap">
        <button type="button" className="ba-back" onClick={() => setOpen(null)}>{tr("← Back to Academy")}</button>
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 54 }}>{card?.emoji}</div>
          <h2 className="ba-title" style={{ fontSize: 24 }}>{card ? cardTitle(card) : ''}</h2>
          <p className="ba-sub">{tr("This lesson is coming soon! Finish the earlier lessons while you wait. 🙂")}</p>
        </div>
      </div>
    );
  }

  // ── Card grid ──
  return (
    <div className="ba-wrap">
      <div className="ba-head">
        <div>
          <div className="ba-title">{tr("🎓 Beginners Academy")}</div>
          <div className="ba-sub">{tr("Brand new to chess? Learn everything, step by step, with your Nexus Coach.")}</div>
        </div>
        <div className="ba-stats">
          <span className="ba-mood" title={tr("Your progress")}>{moodEmoji(completedCount, ACADEMY_CARDS.length)}</span>
          <div className="ba-points">
            <span className="ba-points-val">{points} {tr("XP")}</span>
            <span className="ba-points-lbl">{tr("Reward points")}</span>
          </div>
        </div>
      </div>

      <div className="ba-grid">
        {ACADEMY_CARDS.map((card, i) => {
          const st = progress?.cards?.[card.id] || {};
          // First card always open; others open once the server unlocked them.
          const unlocked = card.id === 'piece-movements' ? true : !!st.unlocked;
          const completed = !!st.completed;
          return (
            <div key={card.id}
              className={`ba-card ${unlocked ? '' : 'ba-locked'}`}
              style={unlocked ? { borderColor: `${card.color}55` } : undefined}
              onClick={() => { if (unlocked) setOpen(card.id); }}>
              {!unlocked && <span className="ba-lock">🔒</span>}
              {completed && <span className="ba-check">✅</span>}
              <div className="ba-card-emoji">{card.emoji}</div>
              <div className="ba-card-title" style={{ color: unlocked ? card.color : undefined }}>{cardTitle(card)}</div>
              {completed && <div className="ba-card-badge">{st.badge || '🏅'} Finished!</div>}
              <div className="ba-card-desc">{tr(card.desc)}</div>
              {unlocked && !card.ready && <div className="ba-card-soon">{tr("Coming soon")}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
