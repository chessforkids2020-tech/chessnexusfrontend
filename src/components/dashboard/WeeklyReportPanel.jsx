// components/dashboard/WeeklyReportPanel.jsx
//
// Dashboard Guide → "Weekly report". The most complete report: earned with a
// 5-day practice streak, paid in XP. Until now it was only reachable from the
// milestone popup and the dashboard chip; this panel explains what it holds,
// shows the streak progress toward the next one, unlocks one that is due, and
// lists the earlier reports.
//
// Backend: /api/user/streak, /api/streak-report/price|status|generate|history/list.
// Styled with the weakness report card's classes so the Guide panels match.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import '../GameInsightsPanel.css';
import './WeaknessReportCard.css';
import { t as tr } from '../../i18n/LanguageContext';

const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const INSIDE = [
  { icon: '♟', text: tr('Your games from Chess Nexus, Lichess and Chess.com: the three phases, openings, endgames and how you defend.') },
  { icon: '🧩', text: tr('Your puzzle practice: the patterns you missed.') },
  { icon: '📈', text: tr('A side-by-side table of every report, so you see how your play changed.') },
  { icon: '🎯', text: tr('A study plan built from your own mistakes.') },
];

export default function WeeklyReportPanel() {
  const [streak, setStreak] = useState(null);
  const [cost, setCost] = useState(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [queued, setQueued] = useState(false);

  const load = useCallback(() => Promise.all([
    api.get('/api/user/streak').then(r => setStreak(r.data || {})).catch(() => setStreak({})),
    api.get('/api/streak-report/price').then(r => setCost(r.data || null)).catch(() => {}),
    api.get('/api/streak-report/status').then(r => setRunning(!!r.data?.job)).catch(() => {}),
    api.get('/api/streak-report/history/list').then(r => setHistory(r.data?.reports || [])).catch(() => {}),
  ]), []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/streak-report/generate');
      setQueued(true);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || tr('Could not start your report. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (!streak) return null;

  const goal = streak.milestone || 5;
  const toGo = streak.daysToNextReport || goal;
  const done = Math.max(0, Math.min(goal, goal - toGo));
  // The site is free; only an XP price is worth a label.
  const priceLabel = cost && !cost.free ? tr('{price} XP', { price: cost.price }) : null;

  return (
    <section className="gip wrc" data-testid="weekly-report-panel">
      <div className="wrc-head">
        <span className="wrc-icon" aria-hidden="true">📊</span>
        <div>
          <h3 className="wrc-title">
            {tr('Your weekly report')} <span className="wrp-tag">{tr('Most powerful')}</span>
          </h3>
          <p className="wrc-sub">
            {tr('Our most complete report. Earn it by practising 5 days in a row, then unlock it with XP.')}
          </p>
        </div>
      </div>

      <ul className="wrp-inside">
        {INSIDE.map(i => (
          <li key={i.icon}><span aria-hidden="true">{i.icon}</span>{i.text}</li>
        ))}
      </ul>

      {running || queued ? (
        <div className="wrc-progress" data-testid="wrp-running">
          <div className="wrc-progress-text">{tr('Your weekly report is being prepared.')}</div>
          <p className="wrc-muted">{tr("It takes a while. You can leave — we'll send you a notification when it's ready.")}</p>
        </div>
      ) : streak.reportDue ? (
        <div className="wrp-due">
          <p className="wrp-due-title">🎉 {tr('You earned a report! {n} days in a row.', { n: streak.milestoneDay || goal })}</p>
          {cost && !cost.free && (
            <p className={`wrc-note${cost.affordable ? '' : ' wrp-short'}`}>
              {tr('Costs {price} XP · you have {balance}', { price: cost.price, balance: cost.balance })}
              {!cost.affordable && <> — {tr('solve a few more puzzles to unlock it.')}</>}
            </p>
          )}
          {err && <p className="wrc-error">{err}</p>}
          <button
            type="button" className="gip-analyze-btn" onClick={generate}
            disabled={busy || (cost ? !cost.affordable : false)} data-testid="wrp-generate"
          >
            {busy ? tr('Starting…') : cost && !cost.free ? tr('Generate my report · {price} XP', { price: cost.price }) : tr('Generate my report')}
          </button>
        </div>
      ) : (
        <div className="wrp-streak">
          <div className="wrp-streak-head">
            <span>🔥 {tr('Practice streak')}</span>
            {priceLabel && <span className="wrc-muted">{priceLabel}</span>}
          </div>
          <div className="wrp-days" aria-label={tr('{done} of {goal} days', { done, goal })}>
            {Array.from({ length: goal }, (_, i) => (
              <span key={i} className={`wrp-day${i < done ? ' on' : ''}`}>{i < done ? '✓' : i + 1}</span>
            ))}
          </div>
          <p className="wrc-note">
            {toGo === 1
              ? tr('1 more day of practice to earn your next report.')
              : tr('{n} more days of practice to earn your next report.', { n: toGo })}
            {' '}{tr("Finish today's plan on the Home tab to keep the streak going.")}
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="wrp-history">
          <div className="wrc-label">{tr('Your weekly reports')}</div>
          {history.map(r => (
            <div key={r.id} className="wrc-latest">
              <span>{fmtDay(r.periodStart)} – {fmtDay(r.periodEnd)} · {tr('{n} games', { n: r.gamesAnalysed || 0 })}</span>
              <Link className="gip-train-btn" to={`/streak-report/${r.id}`}>{tr('View report →')}</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
