// components/dashboard/GuideHub.jsx
//
// Dashboard → Guide tab. Two cards to choose from; picking one shows ONLY that
// tool (with a way back). The choice lives in the URL (?guide=nexus|report) so
// refresh and the browser Back button keep it, like the dock's ?view=.
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import GameInsightsPanel from '../GameInsightsPanel';
import WeaknessReportCard from './WeaknessReportCard';
import './GuideHub.css';
import { t as tr } from '../../i18n/LanguageContext';

const CARDS = [
  {
    id: 'nexus',
    icon: '🧭',
    title: tr('Nexus Guide'),
    text: tr('Find your mistakes in the games you played on Chess Nexus, then replay them until you get them right.'),
  },
  {
    id: 'report',
    icon: '🔍',
    title: tr('Your weakness report'),
    text: tr('A full report from your Chess Nexus, Lichess and Chess.com games — where you lose points and what to work on. Free once a week.'),
  },
];

export default function GuideHub() {
  const [params, setParams] = useSearchParams();
  const open = CARDS.some(c => c.id === params.get('guide')) ? params.get('guide') : null;

  const choose = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('guide', id); else next.delete('guide');
    setParams(next);
  };

  if (open) {
    return (
      <div className="gh-open">
        <button type="button" className="gh-back" onClick={() => choose(null)}>{tr("← All guides")}</button>
        {open === 'nexus' ? <GameInsightsPanel /> : <WeaknessReportCard />}
      </div>
    );
  }

  return (
    <div className="gh-grid" data-testid="guide-hub">
      {CARDS.map(c => (
        <button key={c.id} type="button" className="gh-card" onClick={() => choose(c.id)} data-testid={`guide-${c.id}`}>
          <span className="gh-icon" aria-hidden="true">{c.icon}</span>
          <span className="gh-title">{c.title}</span>
          <span className="gh-text">{c.text}</span>
          <span className="gh-go">{tr("Open →")}</span>
        </button>
      ))}
    </div>
  );
}
