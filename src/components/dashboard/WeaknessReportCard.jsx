// components/dashboard/WeaknessReportCard.jsx
//
// Dashboard Guide → "Your weakness report". Free once a week for every
// logged-in account: the user picks a window (7 or 14 days) and a time control,
// and the server analyses up to 30 of those games from Chess Nexus, Lichess and
// Chess.com. Same report page as the streak report, minus the Chess Nexus
// puzzle stats. Backend: /api/streak-report/quick/* (kind 'quick').
//
// Styled with the Nexus Guide panel's classes (GameInsightsPanel.css) so the
// two Guide cards read as one set.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import '../GameInsightsPanel.css';
import './WeaknessReportCard.css';
import { t as tr } from '../../i18n/LanguageContext';

const PERIODS = [
  { days: 7, label: tr('Last 7 days') },
  { days: 14, label: tr('Last 2 weeks') },
];
const TIME_CONTROLS = [
  { id: 'rapid', label: tr('Rapid') },
  { id: 'blitz', label: tr('Blitz') },
  { id: 'blitz_rapid', label: tr('Blitz + Rapid') },
  { id: 'classical', label: tr('Classical') },
];
const tcLabel = (id) => TIME_CONTROLS.find(t => t.id === id)?.label || '';
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function WeaknessReportCard() {
  const [st, setSt] = useState(null);
  const [days, setDays] = useState(7);
  const [tc, setTc] = useState('blitz_rapid');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pollRef = useRef(null);

  const load = useCallback(() => (
    api.get('/api/streak-report/quick/status')
      .then(r => { setSt(r.data); return r.data; })
      .catch(() => null)
  ), []);

  // Poll only while a job is queued/running.
  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, [load]);
  useEffect(() => {
    clearInterval(pollRef.current);
    if (st?.job) pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [st?.job, load]);

  const generate = async () => {
    setBusy(true); setErr('');
    try {
      await api.post('/api/streak-report/quick/generate', { days, timeControl: tc });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start your report. Please try again.');
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!st) return null;

  const job = st.job;
  const coolingDown = !!st.nextAvailableAt && !job;
  const noAccounts = !st.linked?.lichess && !st.linked?.chesscom;

  return (
    <section className="gip wrc" data-testid="weakness-report-card">
      <div className="wrc-head">
        <span className="wrc-icon" aria-hidden="true">🔍</span>
        <div>
          <h3 className="wrc-title">{tr("Your weakness report")}</h3>
          <p className="wrc-sub">
            We analyse your games from Chess Nexus, Lichess and Chess.com and show where you
            lose points — by phase, opening, endgame and the exact mistakes you made.
            Free once a week.
          </p>
        </div>
      </div>

      {job ? (
        <div className="wrc-progress" data-testid="wrc-progress">
          <div className="wrc-progress-text">
            {job.status === 'queued' || !job.progress?.total
              ? 'Collecting your games…'
              : tr("Analysing your games… {v0} of {total}", { v0: job.progress.current || 0, total: job.progress.total })}
            <span className="wrc-muted"> · {job.days === 14 ? 'Last 2 weeks' : 'Last 7 days'} · {tcLabel(job.timeControl)}</span>
          </div>
          <div className="wrc-bar">
            <div
              className="wrc-bar-fill"
              style={{ width: `${job.progress?.total ? Math.round(((job.progress.current || 0) / job.progress.total) * 100) : 5}%` }}
            />
          </div>
          <p className="wrc-muted">{tr("Usually a few minutes. You can leave — we'll send you a notification when it's ready.")}</p>
        </div>
      ) : coolingDown ? (
        <p className="wrc-note" data-testid="wrc-cooldown">
          {tr("Your next free report is available on")} <b>{fmtDay(st.nextAvailableAt)}</b>.
        </p>
      ) : (
        <>
          <div className="wrc-row">
            <span className="wrc-label">{tr("Period")}</span>
            <div className="gip-tc-select">
              {PERIODS.map(p => (
                <button
                  key={p.days} type="button"
                  className={`gip-tc-chip${days === p.days ? ' gip-tc-chip-active' : ''}`}
                  onClick={() => setDays(p.days)}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div className="wrc-row">
            <span className="wrc-label">{tr("Games")}</span>
            <div className="gip-tc-select">
              {TIME_CONTROLS.map(t => (
                <button
                  key={t.id} type="button"
                  className={`gip-tc-chip${tc === t.id ? ' gip-tc-chip-active' : ''}`}
                  onClick={() => setTc(t.id)}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {noAccounts && (
            <p className="wrc-note">
              {tr("Only your Chess Nexus games will be included.")}{' '}
              <Link to="/settings?tab=profile">{tr("Add your Lichess or Chess.com username")}</Link> {tr("to include those too.")}
            </p>
          )}
          {st.lastError && !err && <p className="wrc-error">{st.lastError}</p>}
          {err && <p className="wrc-error">{err}</p>}

          <button type="button" className="gip-analyze-btn" onClick={generate} disabled={busy} data-testid="wrc-generate">
            {busy ? tr('Starting…') : tr('Generate my report')}
          </button>
          <span className="wrc-muted wrc-cap"> {tr("Up to")} {st.maxGames || 30} {tr("games, losses first.")}</span>
        </>
      )}

      {st.latest && !job && (
        <div className="wrc-latest">
          <span>
            {tr("Last report:")} {fmtDay(st.latest.generatedAt)} · {st.latest.days === 14 ? '2 weeks' : '7 days'} · {tcLabel(st.latest.timeControl)}
          </span>
          <Link className="gip-train-btn" to={`/streak-report/${st.latest.id}`}>{tr("View report →")}</Link>
        </div>
      )}
    </section>
  );
}
