// components/dashboard/GuideHub.jsx
//
// Dashboard → Guide tab. The Training Path comes first; right under its level /
// puzzle card sit the Calculation challenge, then "Learn from my mistakes" (a
// short pitch with tips behind a "?" and three tools to pick from), then
// "Play slow games". Picking a tool shows ONLY that tool (with a way back).
// The choice lives in the URL (?guide=nexus|report|weekly) so refresh and the
// browser Back button keep it, like the dock's ?view=.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api';
import useScrollReveal from '../../hooks/useScrollReveal';
import GameInsightsPanel from '../GameInsightsPanel';
import WeaknessReportCard from './WeaknessReportCard';
import WeeklyReportPanel from './WeeklyReportPanel';
import TrainingPathPanel from '../TrainingPathPanel';
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
    title: tr('Weakness report'),
    text: tr('Where you lose points in your Chess Nexus, Lichess and Chess.com games — and what to work on.'),
  },
  {
    id: 'weekly',
    icon: '📊',
    title: tr('Weekly report'),
    text: tr('Our most powerful report: your games from all three sites, your puzzle practice, and how you changed since your last report.'),
    star: true,
  },
];

// What the Guide sections need from the server, fetched once: the weakness
// report status (its price, and which chess sites the user has linked) and
// the weekly report price.
function useGuideData() {
  const [quick, setQuick] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [calc, setCalc] = useState(null);
  useEffect(() => {
    api.get('/api/streak-report/quick/status').then(r => setQuick(r.data || null)).catch(() => {});
    api.get('/api/streak-report/price').then(r => setWeekly(r.data || null)).catch(() => {});
    api.get('/api/calculation/status').then(r => setCalc(r.data || null)).catch(() => {});
  }, []);
  return { quick, weekly, calc };
}

// "Calculation challenge" — see the whole line, both sides, then play it on a
// clock. Shows the separate calculation strength % and the band being worked on.
function CalcChallenge({ calc }) {
  const ref = useRef(null);
  useScrollReveal(ref, []);
  const started = calc && (calc.solved + calc.failed) > 0;
  const strength = Number(calc?.strength || 0);
  return (
    <section className="cx" ref={ref} data-reveal data-testid="guide-calculation">
      <span className="cx-icon" aria-hidden="true"><span>🧠</span></span>
      <div className="cx-body">
        <div className="cx-tag">{tr('Challenge')}</div>
        <h2 className="cx-title">{tr('Calculation challenge')}</h2>
        <p className="cx-text">{tr('See the whole line — your moves and the replies — before you touch a piece. Then play it out before the clock runs out.')}</p>
        {calc && (
          <div className="cx-meta">
            {/* The level (puzzle range) is never shown — only that it goes up. */}
            {calc.streak > 0 && <span className="cx-band">🔥 {tr('Streak')} {calc.streak}</span>}
            {calc.today?.total > 0 && <span className="cx-today">{tr('Today: {c} of {t} right', { c: calc.today.correct, t: calc.today.total })}</span>}
          </div>
        )}
      </div>
      <div className="cx-side">
        <div className={`cx-strength${strength < 0 ? ' neg' : ''}`}>{`${strength > 0 ? '+' : ''}${strength.toFixed(1)}%`}</div>
        <div className="cx-strength-label">{tr('Calculation strength')}</div>
        <Link className="cx-go" to="/training/calculation">{started ? tr('Continue') : tr('Start')} →</Link>
      </div>
    </section>
  );
}

// The chip on each card, from the servers' own pricing so it never disagrees
// with what pressing Generate will do. Only when it tells the user something:
// the whole site is free, so a plain "Free" chip says nothing — no chip then.
function badgesFor({ quick: status, weekly }) {
  const quick = status?.cost || null;
  const report = !quick || quick.privileged || quick.freeLeft == null ? null
    : quick.freeLeft > 0 ? tr('{n} free left', { n: quick.freeLeft })
    : quick.free ? null
    : tr('{price} XP', { price: quick.price });
  const week = weekly && !weekly.free ? tr('5-day streak · {price} XP', { price: weekly.price }) : tr('5-day streak');
  return { nexus: null, report, weekly: week };
}

// "Learn from my mistakes" — the pitch, the tips and the three tools.
function MistakesHub({ onChoose, levelTitle, data }) {
  const [tips, setTips] = useState(false);
  const badges = badgesFor(data);
  const ref = useRef(null);
  useScrollReveal(ref, []);
  return (
    <section className="mh" ref={ref} data-reveal data-testid="guide-hub">
      <div className="mh-head">
        <h2 className="mh-title"><span className="mh-title-icon" aria-hidden="true">🎯</span>{tr('Learn from my mistakes')}</h2>
        <div className="mh-ask">
          <span>{tr('Want to improve your games seriously?')}</span>
          <button
            type="button" className={`mh-tip-btn${tips ? ' on' : ''}`} onClick={() => setTips(v => !v)}
            aria-expanded={tips} aria-label={tips ? tr('Hide tips') : tr('Show tips')} title={tr('Tips')}
          >?</button>
        </div>
      </div>

      {tips && (
        <ul className="mh-tips" data-testid="guide-tips">
          <li><span aria-hidden="true">💡</span>{tr("Improving your games isn't about learning a new opening every day.")}</li>
          <li>
            <span aria-hidden="true">🧩</span>
            {levelTitle
              ? tr('Your level right now is {level}. At every level — beginner, advancing beginner or beyond — the players who improve are the ones who stop repeating their own mistakes.', { level: tr(levelTitle) })
              : tr('Beginner, advancing beginner or beyond — the players who improve are the ones who stop repeating their own mistakes.')}
          </li>
          <li><span aria-hidden="true">🎯</span>{tr('All you need to change is your own mistakes. These three tools find them for you.')}</li>
        </ul>
      )}

      <div className="mh-grid">
        {CARDS.map((c, i) => (
          <button
            key={c.id} type="button" className={`mh-card mh-${c.id}`} onClick={() => onChoose(c.id)}
            data-reveal style={{ '--i': i }} data-testid={`guide-${c.id}`}
          >
            {c.star && <span className="mh-star">⭐ {tr('Most powerful')}</span>}
            <span className="mh-icon" aria-hidden="true"><span>{c.icon}</span></span>
            <span className="mh-name">{c.title}</span>
            <span className="mh-text">{c.text}</span>
            <span className="mh-foot">
              {badges[c.id] && <span className="mh-badge">{badges[c.id]}</span>}
              <span className="mh-go">{tr('Open')} <span className="mh-arrow">→</span></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Where a slow game can be started. Chess Nexus 1-on-1 pairing is switched off
// for now, so only the outside sites — and only the ones the user has linked.
const SLOW_SITES = [
  { id: 'lichess', name: 'Lichess', icon: '♞', href: 'https://lichess.org/' },
  { id: 'chesscom', name: 'Chess.com', icon: '♟', href: 'https://www.chess.com/play/online' },
];

// "Play slow games" — the habit that turns puzzle practice into better games.
function SlowGames({ linked }) {
  const ref = useRef(null);
  useScrollReveal(ref, []);
  const sites = SLOW_SITES.filter(s => linked?.[s.id]);
  return (
    <section className="sg" ref={ref} data-reveal data-testid="guide-slow-games">
      <span className="sg-icon" aria-hidden="true"><span>⏳</span></span>
      <div className="sg-body">
        <h2 className="sg-title">{tr('Play slow games')}</h2>
        <p className="sg-text">
          {tr('Play at least a few slow games every week. Slow games give you time to think, and that is where real improvement happens.')}
        </p>
        {sites.length > 0 && (
          <div className="sg-actions">
            {sites.map(s => (
              <a key={s.id} className={`sg-btn sg-${s.id}`} href={s.href} target="_blank" rel="noopener noreferrer">
                <span aria-hidden="true">{s.icon}</span>{tr('Play on {site}', { site: s.name })} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function GuideHub() {
  const data = useGuideData();
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
        {open === 'nexus' ? <GameInsightsPanel /> : open === 'report' ? <WeaknessReportCard /> : <WeeklyReportPanel />}
      </div>
    );
  }

  // The daily plan and the proof it works come first; the mistakes tools sit
  // right under the level / puzzle card (TrainingPathPanel places the slot).
  return (
    <TrainingPathPanel afterLevel={(levelTitle) => (
      <>
        <CalcChallenge calc={data.calc} />
        <MistakesHub onChoose={choose} levelTitle={levelTitle} data={data} />
        <SlowGames linked={data.quick?.linked} />
      </>
    )} />
  );
}
