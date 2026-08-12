import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import GameReplay from '../../components/GameReplay';
import { viewOpenings, viewComparison } from '../../lib/streakReportView';
import UserAvatar from '../../components/UserAvatar';
import ArenaGameReplayModal from '../../components/ArenaGameReplayModal';
// Reuse the SAME detailed report cards the student's "Analyze My Games" page
// renders, so the coach sees an identical deep report (no drift).
import {
  PhaseCard, PeerComparisonCard, EndgameStats, GameBreakdownTable, TrendCharts
} from '../GameAnalysis';
import '../GameAnalysis.css';
import './CoachDashboard.css';
import './CoachOnboarding.css';
import './CoachStudentDetail.css';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
// Chess ratings are plain numbers — never thousands-separated (1200, not 1,200).
function fmtRating(n) { return n != null ? String(Math.round(Number(n))) : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'; }

// Race topic SLUG -> readable title.
//
// The stored value is a slug ('racer-tactics'), not a title. Showing it raw in a
// coach-facing table is the kind of thing that makes an app look unfinished, so
// map it — and fall back to the race's own NAME when the coach or admin gave it
// one, since that is more specific than the topic it was built from.
// Race topic id -> the title the topic is published under, copied from
// backend/seed-race-topics.js (the same rows the Topic collection is seeded
// from, and the same titles the student saw when they picked the race).
// These are NOT derivable from the id: no amount of tidying turns
// 'forkpinskewer' into 'Fork, Pin & Skewer' or 'mate123' into 'Mate in 1, 2, 3'.
const RACE_TOPIC_TITLES = {
  opening:       'Opening',
  middlegame:    'Middlegame',
  endgame:       'Endgame',
  pawnendgame:   'Pawn Endgame & Advanced Pawn',
  mate123:       'Mate in 1, 2, 3',
  forkpinskewer: 'Fork, Pin & Skewer',
  discovered:    'Discovered Attack, Double Check & Capture the Defender',
  checkmate:     'Checkmate',
  attraction:    'Attraction, Clearance & Deflection',
  hanging:       'Hanging Piece, Sacrifice & Trapped Piece',
  xray:          'X-Ray, Queen/Rook Endgame & Zugzwang',
  mixed:         'Mixed',
};
// One platform's rating curve, one line per time control.
//
// Colours follow Lichess's own convention, so a coach who already reads those
// graphs does not have to learn a second colour language.
const TC_COLOURS = {
  bullet:    '#f472b6',
  blitz:     '#fbbf24',
  rapid:     '#34d399',
  classical: '#60a5fa',
};
const TC_ORDER = ['bullet', 'blitz', 'rapid', 'classical'];

// Public profile URL for a handle on Lichess or Chess.com. encodeURIComponent
// because a username is user-supplied: a stray space or slash would otherwise
// build a broken (or wrong) link.
function profileUrl(platform, username) {
  const u = encodeURIComponent(String(username || '').trim());
  if (!u) return null;
  return /chess\.com/i.test(platform)
    ? `https://www.chess.com/member/${u}`
    : `https://lichess.org/@/${u}`;
}

function RatingChart({ title, accent, who, series }) {
  const keys = TC_ORDER.filter(k => series?.[k]?.length >= 3);
  if (!keys.length) return null;

  // One shared Y scale across every line, so the graph shows which time control
  // this student is actually stronger at — separate scales would hide that.
  const all = keys.flatMap(k => series[k].map(p => p.r));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  // Round the scale out to friendly numbers so the axis reads 800 / 900 / 1000
  // rather than 807 / 913 / 1019. A rating chart without a readable scale shows
  // that the line moved but not between WHAT — which is most of the value.
  const span = Math.max(40, hi - lo);
  const step = span > 600 ? 200 : span > 300 ? 100 : span > 120 ? 50 : 25;
  const yMin = Math.floor((lo - span * 0.12) / step) * step;
  const yMax = Math.ceil((hi + span * 0.12) / step) * step;

  // Gridline values, top to bottom. Capped so a wide range does not draw fifty
  // lines across a 110px chart.
  const ticks = [];
  for (let v = yMax; v >= yMin && ticks.length < 6; v -= step) ticks.push(v);

  // Shared X scale too: lines from the same period must line up in time.
  const allT = keys.flatMap(k => series[k].map(p => p.t));
  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);
  const xOf = (t) => (tMax === tMin ? 0 : ((t - tMin) / (tMax - tMin)) * 300);
  const yOf = (r) => 96 - ((r - yMin) / (yMax - yMin || 1)) * 92;

  return (
    <div className="csd-rating-card">
      <div className="csd-rating-head">
        <span className="csd-rating-title" style={{ color: accent }}>{title}</span>
        {/* The handle opens the student's profile on that site. A coach looking
            at a rating dip usually wants the games behind it, and those live on
            Lichess or Chess.com — retyping a username to get there is friction
            for something we already know. rel=noreferrer because this is a
            third-party site and it should not be handed our referrer. */}
        {who && (
          <a
            className="csd-rating-who is-link"
            href={profileUrl(title, who)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open @${who} on ${title}`}
          >
            @{who} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>

      {/* The axis labels live OUTSIDE the svg. The chart uses
          preserveAspectRatio="none" so its lines fill the width, and anything
          drawn inside — including text — gets stretched horizontally with it. */}
      <div className="csd-rating-plot">
        <div className="csd-rating-yaxis">
          {ticks.map(v => (
            <span key={v} style={{ top: `${((yMax - v) / (yMax - yMin)) * 100}%` }}>{v}</span>
          ))}
        </div>

        <svg className="csd-rating-svg" viewBox="0 0 300 100" preserveAspectRatio="none" role="img"
          aria-label={`${title} rating from ${yMin} to ${yMax} over recent games`}>
          {/* Gridlines at the same values as the labels beside them. */}
          {ticks.map(v => {
            const y = yOf(v);
            return (
              <line
                key={v}
                x1="0" y1={y} x2="300" y2={y}
                stroke="rgba(148,163,184,0.16)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {keys.map(k => (
            <polyline
              key={k}
              points={series[k].map(p => `${xOf(p.t)},${yOf(p.r)}`).join(' ')}
              fill="none"
              stroke={TC_COLOURS[k]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {/* Legend doubles as a summary: current rating and the change across the
          window, which is the number a coach actually wants. */}
      <div className="csd-rating-legend">
        {keys.map(k => {
          const pts = series[k];
          const first = pts[0].r;
          const last = pts[pts.length - 1].r;
          const diff = last - first;
          return (
            <span key={k} className="csd-rating-key">
              <i style={{ background: TC_COLOURS[k] }} />
              {k} <b>{last}</b>
              <em className={diff > 0 ? 'up' : diff < 0 ? 'down' : ''}>
                {diff > 0 ? `+${diff}` : diff < 0 ? diff : '±0'}
              </em>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Which phase is furthest behind, so the coach's eye lands on it first.
function weakestPhaseOf(phases) {
  const withAcc = ['opening', 'middlegame', 'endgame']
    .filter(p => phases?.[p]?.accuracy != null);
  if (withAcc.length < 2) return null;
  return withAcc.reduce((a, b) => (phases[a].accuracy <= phases[b].accuracy ? a : b));
}

// The Topic column answers "what did they practise?" — so it shows the puzzle
// TOPIC ('Mate in 1, 2, 3'), not the race's marketing name. A race called
// "Puzzle Storm Sprint" tells a coach nothing about the student's weakness;
// the topic is the whole reason the column exists.
function raceTopicLabel(r) {
  const slug = String(r?.topic || '').replace(/^racer-/, '');
  if (slug) {
    return RACE_TOPIC_TITLES[slug]
      // A topic seeded after this map was written: tidy the id rather than
      // print it raw ('back-rank' -> 'Back rank').
      || slug.replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase());
  }
  // Only when there is no topic at all (custom/one-off races) fall back to the
  // name, minus any trailing date the Date column already shows.
  const name = String(r?.raceName || '')
    .replace(/\s*[–—-]\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '')
    .replace(/\s*[–—-]\s*\d{4}-\d{2}-\d{2}\s*$/, '')
    .replace(/\s*\(\s*\d{1,2}\s+\w+\s+\d{4}\s*\)\s*$/, '')
    .trim();
  const dateOnly = /^\d{1,2}\s+\w+\s+\d{4}$/.test(name) || /^\d{4}-\d{2}-\d{2}$/.test(name);
  return (name && !dateOnly) ? name : '—';
}
function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Can render as a routed page (studentLinkId from the URL) OR embedded (pass
// `studentLinkId` + `onBack` + `embedded` props, e.g. inside the admin dashboard).
export default function CoachStudentDetail({ studentLinkId: propLinkId, onBack, embedded = false }) {
  const params = useParams();
  const studentLinkId = propLinkId || params.studentLinkId;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arenaGamePopup, setArenaGamePopup] = useState(null); // clicked arena game to replay
  const [activityTab, setActivityTab] = useState('races'); // races | arena | studies | assignments

  // ── Game analysis (deep Stockfish report on the student's last 25 games) ──
  const [analysis, setAnalysis] = useState(null);      // result object when done
  // The student's latest weekly practice report, if they have earned one.
  // Coach-scoped: the API resolves it through THIS coach's student link, so
  // another coach cannot reach it.
  const [streakReport, setStreakReport] = useState(null);
  // The full report, opened from the summary's "View full report" button. The
  // whole payload is already fetched above; this only decides whether to show it.
  const [showFullReport, setShowFullReport] = useState(false);
  // Lichess / Chess.com rating curves, one series per time control.
  const [ratings, setRatings] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);   // job running / polling
  const [analyzeErr, setAnalyzeErr] = useState('');
  const [analyzeProgress, setAnalyzeProgress] = useState(null); // { current, total, stage }
  const pollRef = useRef(null);

  // Private coach notes for this student.
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  useEffect(() => { setNotes(data?.link?.notes || ''); }, [data]);

  // Parent progress report sharing (copy the private link / open it in a new tab).
  const [shareMsg, setShareMsg] = useState('');
  const resolveReportUrl = async () => {
    const r = await api.get(`/api/coach/students/${studentLinkId}/report-token`);
    return `${window.location.origin}/progress/${r.data.token}`;
  };
  const copyReportLink = async () => {
    setShareMsg('Generating link…');
    try {
      const url = await resolveReportUrl();
      try {
        await navigator.clipboard.writeText(url);
        setShareMsg('✓ Link copied — send it to the parent');
      } catch {
        window.prompt('Copy this progress link and send it to the parent:', url);
        setShareMsg('');
      }
    } catch {
      setShareMsg('Could not generate link — try again');
    } finally {
      setTimeout(() => setShareMsg(''), 2600);
    }
  };
  const openReport = async () => {
    setShareMsg('Opening report…');
    // Open the tab synchronously (before the await) so popup blockers don't stop it.
    const tab = window.open('', '_blank');
    try {
      const url = await resolveReportUrl();
      if (tab) tab.location = url; else window.open(url, '_blank', 'noopener');
      setShareMsg('');
    } catch {
      if (tab) tab.close();
      setShareMsg('Could not open report — try again');
      setTimeout(() => setShareMsg(''), 2600);
    }
  };
  const saveNotes = async () => {
    setSavingNotes(true); setNotesSaved('');
    try {
      await api.patch(`/api/coach/students/${studentLinkId}/notes`, { notes });
      setNotesSaved('✓ Saved');
      setTimeout(() => setNotesSaved(''), 2000);
    } catch { setNotesSaved('Could not save'); }
    finally { setSavingNotes(false); }
  };

  // Group / batch tag for this student — editable so a coach can move a student
  // between groups after they were added (mirrors the notes edit above).
  const [groupTag, setGroupTag] = useState('');
  const [editingGroup, setEditingGroup] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  useEffect(() => { setGroupTag(data?.link?.groupTag || ''); }, [data]);
  const saveGroup = async () => {
    setSavingGroup(true);
    try {
      const r = await api.patch(`/api/coach/students/${studentLinkId}/group`, { groupTag });
      setGroupTag(r.data?.groupTag ?? groupTag);
      setEditingGroup(false);
    } catch { /* keep editing open on failure */ }
    finally { setSavingGroup(false); }
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/api/coach/students/${studentLinkId}/progress`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load student.'))
      .finally(() => setLoading(false));

    // The student's latest practice report. Absent for most students — they
    // have to earn it — so a failure here is not an error worth showing.
    setStreakReport(null);
    api.get(`/api/coach/students/${studentLinkId}/streak-report`)
      .then(r => setStreakReport(r.data?.report || null))
      .catch(() => {});

    // External rating curves. Absent unless the student linked an account, and
    // it calls two public APIs, so a failure is silent rather than an error.
    setRatings(null);
    api.get(`/api/coach/students/${studentLinkId}/rating-history`)
      .then(r => setRatings(r.data || null))
      .catch(() => {});
  }, [studentLinkId]);

  // Stop polling on unmount or when the student changes.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, [studentLinkId]);

  const pollStatus = (cacheId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/api/coach/students/${studentLinkId}/analyze/status/${cacheId}`);
        setAnalyzeProgress(r.data.progress || null);
        if (r.data.status === 'done') {
          clearInterval(pollRef.current);
          setAnalysis(r.data.result);
          setAnalyzing(false);
        } else if (r.data.status === 'error') {
          clearInterval(pollRef.current);
          setAnalyzeErr(r.data.error || 'Analysis failed.');
          setAnalyzing(false);
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setAnalyzeErr(e.response?.data?.message || 'Lost connection to the analysis job.');
        setAnalyzing(false);
      }
    }, 3000);
  };

  // Which platform the current analysis is for. A coach wants to see how their
  // student plays EVERYWHERE, not only in arena games here — and the three
  // results are separate reports, so the page remembers which one is showing.
  const [analyzePlatform, setAnalyzePlatform] = useState('chessnexus');

  const startAnalysis = async (force = false, platform = analyzePlatform) => {
    setAnalyzeErr('');
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzePlatform(platform);
    setAnalyzeProgress({ current: 0, total: 25, stage: 'Starting…' });
    try {
      const r = await api.post(`/api/coach/students/${studentLinkId}/analyze`, { force, platform });
      if (r.data.status === 'done') {
        setAnalysis(r.data.result);
        setAnalyzing(false);
      } else {
        pollStatus(r.data.cacheId);
      }
    } catch (e) {
      setAnalyzeErr(e.response?.data?.message || 'Could not start analysis.');
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="coach-loading">Loading student progress…</div>;
  if (error) return <div className="coach-error">⚠️ {error}</div>;
  if (!data) return null;

  const { student, link, gameRatings, activity = [], raceResults = [], testResults = [], arenaGames = [], assignments = [], totals = {} } = data;
  const maxSeconds = Math.max(1, ...activity.map(a => a.totalSeconds || 0));

  return (
    <div className="coach-dash">
      <div className="csd-back">
        <button onClick={() => (embedded && onBack ? onBack() : navigate(-1))} className="btn-ghost">← Back</button>
      </div>

      {/* ── Header ─────────────────── */}
      <div className="csd-header">
        <UserAvatar
          user={student}
          displayName={link?.studentName || student?.displayName || student?.username}
          size={64}
          className="csd-avatar"
        />
        <div className="csd-meta">
          <h1>{link?.studentName || student?.displayName || student?.username || 'Unnamed student'}</h1>
          <p>
            {student?.username && <>@{student.username} · </>}
            {student?.country || 'Unknown country'}
            {/* Also in the header, not only on the rating cards: those cards
                need enough games to draw a chart, so a student who has just
                linked an account would otherwise have no way through to it. */}
            {student?.lichessUsername && (
              <a
                className="csd-ext-link"
                href={profileUrl('Lichess', student.lichessUsername)}
                target="_blank" rel="noopener noreferrer"
                title={`Open @${student.lichessUsername} on Lichess`}
              >
                Lichess ↗
              </a>
            )}
            {student?.chessComUsername && (
              <a
                className="csd-ext-link"
                href={profileUrl('Chess.com', student.chessComUsername)}
                target="_blank" rel="noopener noreferrer"
                title={`Open @${student.chessComUsername} on Chess.com`}
              >
                Chess.com ↗
              </a>
            )}
            {!editingGroup && (
              <button
                type="button"
                className="tag"
                style={{ marginLeft: 8, cursor: 'pointer', border: 'none' }}
                title="Click to change this student's group / batch"
                onClick={() => setEditingGroup(true)}
              >
                {groupTag ? `🏷️ ${groupTag}` : '＋ Add group'} ✎
              </button>
            )}
            {editingGroup && (
              <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  value={groupTag}
                  autoFocus
                  placeholder="e.g. Batch A"
                  onChange={e => setGroupTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveGroup(); if (e.key === 'Escape') { setEditingGroup(false); setGroupTag(data?.link?.groupTag || ''); } }}
                  style={{ padding: '2px 8px', borderRadius: 6 }}
                />
                <button type="button" className="btn-ghost" onClick={saveGroup} disabled={savingGroup}>
                  {savingGroup ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setEditingGroup(false); setGroupTag(data?.link?.groupTag || ''); }}>
                  Cancel
                </button>
              </span>
            )}
          </p>

          {/* Share a private, read-only progress report with this student's parent.
              Two actions: copy the private link, or open the report in a new tab.
              The token is unguessable so the link can't be derived from a name. */}
          <div className="csd-share-row">
            <button
              type="button"
              className="csd-share-progress"
              title="Copy a private progress link to send to this student's parent"
              onClick={copyReportLink}
            >
              📋 Copy progress link
            </button>
            <button
              type="button"
              className="csd-share-progress csd-share-open"
              title="Open the parent's progress report in a new tab"
              onClick={openReport}
            >
              ↗ Open report
            </button>
          </div>
          {shareMsg && <div className="csd-share-msg">{shareMsg}</div>}
        </div>
        <div className="csd-rating">
          <span>Puzzle rating</span>
          <strong>{fmtRating(student?.liveRating)}</strong>
        </div>
      </div>

      {/* ── Private notes ─────────────── */}
      <div className="coach-section" style={{ marginTop: 12 }}>
        <div className="coach-section-head">
          <h2>📝 Notes</h2>
          <button className="btn-ghost" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving…' : 'Save'}{notesSaved && ` · ${notesSaved}`}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          placeholder="Private notes about this student (only you see these)…"
          style={{ width: '100%', minHeight: 70, resize: 'vertical', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#e7eaf0', fontSize: 14 }}
        />
      </div>

      {/* ── Game ratings (Bullet / Blitz / Rapid / Classical) ─────── */}
      {gameRatings && (
        <div className="coach-stat-row">
          <div className="coach-stat-card">
            <div className="stat-label">♟ Bullet</div>
            <div className="stat-value">{fmtRating(gameRatings.bullet)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">⚡ Blitz</div>
            <div className="stat-value">{fmtRating(gameRatings.blitz)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">⏱ Rapid</div>
            <div className="stat-value">{fmtRating(gameRatings.rapid)}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">♚ Classical</div>
            <div className="stat-value">{fmtRating(gameRatings.classical)}</div>
          </div>
        </div>
      )}

      {/* ── Summary stats ─────────── */}
      <div className="coach-stat-row">
        <div className="coach-stat-card">
          <div className="stat-label">Puzzles solved (30d)</div>
          <div className="stat-value">{fmt(totals.puzzlesSolved)}</div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Avg accuracy (30d)</div>
          <div className="stat-value">{totals.avgAccuracy != null ? Math.round(totals.avgAccuracy) + '%' : '—'}</div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Active days</div>
          <div className="stat-value">{totals.activeDays || 0}<span className="stat-cap">/ 30</span></div>
        </div>
        <div className="coach-stat-card">
          <div className="stat-label">Best race score</div>
          <div className="stat-value">{fmt(student?.highestArenaRaceScore)}</div>
        </div>
      </div>


      {/* ── Rating over recent games, per platform ─────
          Reconstructed from the ratings attached to each fetched game, so it
          covers roughly the last 100 games rather than a full career — said
          plainly under the charts rather than implied otherwise. */}
      {(ratings?.lichess || ratings?.chesscom) && (
        <div className="coach-section">
          <div className="coach-section-head">
            <h2>📈 Rating over recent games</h2>
          </div>
          <div className="csd-rating-grid">
            {ratings.lichess && (
              <RatingChart
                title="Lichess"
                accent="#a78bfa"
                who={ratings.lichessName}
                series={ratings.lichess}
              />
            )}
            {ratings.chesscom && (
              <RatingChart
                title="Chess.com"
                accent="#86efac"
                who={ratings.chesscomName}
                series={ratings.chesscom}
              />
            )}
          </div>
          <p className="csd-chart-desc" style={{ marginTop: 10 }}>
            Built from this student's most recent games on each site, so it shows the
            current trend rather than their whole history.
          </p>
        </div>
      )}

      {/* ── The student's weekly practice report ───────
          Everything the student earned by practising five days running, shown
          to their coach in one place: which phase is weakest, how they defend,
          and the study plan built from their own mistakes. */}
      {streakReport?.payload && (
        <div className="coach-section">
          <div className="coach-section-head">
            <h2>🔥 Practice report</h2>
            <span className="csd-muted" style={{ fontSize: 12.5 }}>
              {fmtDate(streakReport.periodStart)} – {fmtDate(streakReport.periodEnd)} ·
              {' '}{streakReport.milestoneDay}-day streak ·
              {' '}{streakReport.gamesAnalysed} games
            </span>
            {/* The summary below is a triage view — enough to see who needs
                attention before a lesson. The full report is the same payload
                the STUDENT sees, and a coach preparing for that lesson needs
                all of it: collapsed positions, endgames reached, openings,
                the clock, the missed motifs. It was already being fetched and
                then thrown away. */}
            <button
              type="button"
              className="csd-full-btn"
              onClick={() => setShowFullReport(true)}
            >
              View full report →
            </button>
          </div>

          {streakReport.payload.verdict?.text && (
            <p className="csd-verdict">🎯 {streakReport.payload.verdict.text}</p>
          )}

          {/* Accuracy by phase — the fastest read of where a student is losing. */}
          <div className="csd-phase-row">
            {['opening', 'middlegame', 'endgame'].map(k => {
              const ph = streakReport.payload.phases?.[k] || {};
              const weak = weakestPhaseOf(streakReport.payload.phases);
              return (
                <div key={k} className={`csd-phase${weak === k ? ' is-weak' : ''}`}>
                  <div className="csd-phase-name">{k}</div>
                  <div className="csd-phase-acc">{ph.accuracy != null ? `${ph.accuracy}%` : '—'}</div>
                  <div className="csd-phase-sub">
                    {ph.blunders || 0}b · {ph.mistakes || 0}m · {ph.inaccuracies || 0}i
                  </div>
                </div>
              );
            })}
          </div>

          {/* Defence and conversion — two things a coach can act on directly. */}
          <div className="csd-mini-stats">
            {streakReport.payload.defence?.opportunities > 0 && (
              <span>
                🛡 Held <b>{(streakReport.payload.defence.recovered || 0)
                  + (streakReport.payload.defence.turnedAround || 0)
                  + (streakReport.payload.defence.held || 0)}</b>
                {' '}of <b>{streakReport.payload.defence.opportunities}</b> bad positions
                {streakReport.payload.defence.defensiveScore != null
                  && ` (${streakReport.payload.defence.defensiveScore}%)`}
                {/* Collapses are the actionable half of defence: "held 19 of 24"
                    is a pass mark, "collapsed 5" is the lesson. Showing only the
                    held figure hid what the coach should teach. */}
                {streakReport.payload.defence.collapsed > 0 && (
                  <em className="csd-bad"> · collapsed {streakReport.payload.defence.collapsed}</em>
                )}
              </span>
            )}
            {streakReport.payload.conversion?.hadWinningPosition > 0 && (
              <span>
                🏁 Won <b>{streakReport.payload.conversion.converted}</b> of
                {' '}<b>{streakReport.payload.conversion.hadWinningPosition}</b> winning positions
              </span>
            )}
          </div>

          {/* Where their mistakes cluster. Falls back to the motif breakdown on
              payloads written before 'tactic' was categorisable, where the
              category counts were saved near-zero and this row would otherwise
              show a student with dozens of mistakes as having almost none. */}
          {(streakReport.payload.moments?.categories || []).some(c => c.count > 0) ? (
            <div className="csd-cats">
              {streakReport.payload.moments.categories.filter(c => c.count > 0).map(c => (
                <span key={c.key} className="csd-cat">
                  {c.icon} <b>{c.count}</b> {c.label}
                </span>
              ))}
            </div>
          ) : (streakReport.payload.momentThemes || []).length > 0 && (
            <div className="csd-cats">
              {streakReport.payload.momentThemes.slice(0, 6).map(t => (
                <span key={t.theme} className="csd-cat" style={{ textTransform: 'capitalize' }}>
                  <b>{t.count}</b> {String(t.theme).replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* The study plan the report built — what the student was told to do. */}
          {(streakReport.payload.suggestions || []).length > 0 && (
            <div className="csd-plan">
              <div className="csd-plan-head">Study plan given to this student</div>
              {streakReport.payload.suggestions.map(sg => (
                <div key={sg.key} className="csd-plan-row">
                  <span className="csd-plan-ic">{sg.icon}</span>
                  <span>
                    <b>{sg.title}</b>
                    <em>{sg.detail}</em>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Game analysis (deep Stockfish report) ───── */}
      <div className="coach-section">
        <div className="coach-section-head csd-analyze-head">
          <h2>🔎 Game analysis</h2>
          <div className="csd-analyze-actions">
            {/* One button per platform. Lichess and Chess.com only appear when
                the student has actually saved that username — offering a button
                that can only fail is worse than not offering it. */}
            <button
              className={analyzePlatform === 'chessnexus' && analysis ? 'btn-ghost' : 'btn-primary'}
              onClick={() => startAnalysis(analyzePlatform === 'chessnexus' && !!analysis, 'chessnexus')}
              disabled={analyzing}
            >
              {analyzing && analyzePlatform === 'chessnexus' ? 'Analyzing…' : '♟ Chess Nexus'}
            </button>
            {student?.lichessUsername && (
              <button
                className={analyzePlatform === 'lichess' && analysis ? 'btn-ghost' : 'btn-primary'}
                onClick={() => startAnalysis(analyzePlatform === 'lichess' && !!analysis, 'lichess')}
                disabled={analyzing}
              >
                {analyzing && analyzePlatform === 'lichess' ? 'Analyzing…' : '🔵 Lichess'}
              </button>
            )}
            {student?.chessComUsername && (
              <button
                className={analyzePlatform === 'chesscom' && analysis ? 'btn-ghost' : 'btn-primary'}
                onClick={() => startAnalysis(analyzePlatform === 'chesscom' && !!analysis, 'chesscom')}
                disabled={analyzing}
              >
                {analyzing && analyzePlatform === 'chesscom' ? 'Analyzing…' : '🟢 Chess.com'}
              </button>
            )}
          </div>
        </div>

        <p className="csd-analyze-hint">
          Runs a deep Stockfish review of {student?.displayName || student?.username || 'the student'}'s
          last 25 games on the platform you pick — accuracy by phase, blunders, playstyle and
          recurring patterns. Each platform is analysed separately; press the same button again to
          re-run. Results are cached for 24 hours.
          {!student?.lichessUsername && !student?.chessComUsername && (
            <> Lichess and Chess.com appear here once the student saves those usernames in their profile.</>
          )}
        </p>

        {analyzeErr && <div className="coach-error" style={{ marginTop: 8 }}>⚠️ {analyzeErr}</div>}

        {analyzing && (
          <div className="csd-analyze-progress">
            <div className="csd-analyze-stage">{analyzeProgress?.stage || 'Working…'}</div>
            <div className="stat-bar">
              <div style={{ width: `${analyzeProgress && analyzeProgress.total ? Math.round((analyzeProgress.current / analyzeProgress.total) * 100) : 5}%` }} />
            </div>
            <div className="csd-analyze-count">
              {analyzeProgress?.current || 0} / {analyzeProgress?.total || 25} games
            </div>
          </div>
        )}

        {analysis && !analyzing && <AnalysisReport result={analysis} />}

        {!analysis && !analyzing && !analyzeErr && (
          <div className="coach-empty">No analysis yet. Click <strong>Analyze last 25 games</strong> above.</div>
        )}
      </div>

      {/* ── Daily activity chart ───── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>⏱️ Time on app (last 30 days)</h2>
        </div>
        <p className="csd-chart-desc">Minutes {student?.displayName || student?.username || 'the student'} spent practising each day. Higher line = more time that day.</p>
        {activity.length === 0 ? (
          <div className="coach-empty">No activity recorded yet.</div>
        ) : (() => {
          const totalMins = Math.round(activity.reduce((s, a) => s + (a.totalSeconds || 0), 0) / 60);
          const activeDays = activity.filter(a => (a.totalSeconds || 0) > 0).length;
          const peakMins = Math.round(maxSeconds / 60);
          const first = activity[0]?.date;
          const mid = activity[Math.floor(activity.length / 2)]?.date;
          const last = activity[activity.length - 1]?.date;
          return (
            <>
              <div className="csd-chart-summary">
                <span><strong>{totalMins}</strong> min total</span>
                <span><strong>{activeDays}</strong> active day{activeDays === 1 ? '' : 's'}</span>
                <span>Best day: <strong>{peakMins}</strong> min</span>
              </div>
              <div className="csd-chart-plot">
                {/* Y-axis: peak value at top, 0 at bottom */}
                <div className="csd-chart-yaxis">
                  <span>{peakMins}m</span>
                  <span>0</span>
                </div>
                {/* Line rather than bars. Over 30 days the shape of the habit —
                    building, holding, dropping off — is the thing a coach reads,
                    and thirty separate bars make that harder to see, not easier. */}
                <svg
                  className="csd-line-chart"
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Practice minutes per day over the last ${activity.length} days`}
                >
                  <defs>
                    <linearGradient id="csdFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.34" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const n = activity.length;
                    const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 300);
                    // Invert: SVG y grows downward, and leave 4px of headroom so
                    // the peak is not clipped by the viewBox edge.
                    const y = (sec) => 96 - ((sec || 0) / (maxSeconds || 1)) * 92;
                    const pts = activity.map((a, i) => `${x(i)},${y(a.totalSeconds)}`).join(' ');
                    return (
                      <>
                        {/* Soft fill under the line, so a flat stretch still reads
                            as "little practice" rather than as a missing line. */}
                        <polygon points={`0,100 ${pts} 300,100`} fill="url(#csdFill)" />
                        <polyline
                          points={pts}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* A marker on each active day. Drawn as a zero-length
                            stroked line with a round cap rather than a <circle>:
                            preserveAspectRatio="none" stretches the viewBox to
                            fill the width, which squashes any circle into an
                            oval, whereas a non-scaling stroke stays round. */}
                        {activity.map((a, i) => ((a.totalSeconds || 0) > 0 ? (
                          <line
                            key={i}
                            x1={x(i)} y1={y(a.totalSeconds)}
                            x2={x(i)} y2={y(a.totalSeconds)}
                            stroke="#22d3ee"
                            strokeWidth="6"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          >
                            <title>{`${fmtDate(a.date)} · ${Math.round((a.totalSeconds || 0) / 60)} min`}</title>
                          </line>
                        ) : null))}
                      </>
                    );
                  })()}
                </svg>
              </div>
              {/* X-axis: date range */}
              <div className="csd-chart-xaxis">
                <span>{fmtDate(first)}</span>
                {activity.length > 4 && <span>{fmtDate(mid)}</span>}
                <span>{fmtDate(last)}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Activity (races / arena / studies / assignments) in TABS ── */}
      <div className="coach-section">
        <div className="csd-tabs">
          {[
            { id: 'races', label: '🏁 Races', n: raceResults.length },
            { id: 'arena', label: '♟ Arena games', n: arenaGames.length },
            { id: 'studies', label: '📚 Studies', n: testResults.length },
            { id: 'assignments', label: '📝 Assignments', n: assignments.length },
          ].map(t => (
            <button
              key={t.id}
              className={`csd-tab ${activityTab === t.id ? 'active' : ''}`}
              onClick={() => setActivityTab(t.id)}
            >
              {t.label}{t.n ? <span className="csd-tab-count">{t.n}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Race results ──────────── */}
        {activityTab === 'races' && (
          raceResults.length === 0 ? (
          <div className="coach-empty">No race results in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Time</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {raceResults.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.finishedAt)}</td>
                    <td className="cell-topic">{raceTopicLabel(r)}</td>
                    <td className="cell-good">{r.correctCount}</td>
                    <td className="cell-bad">{r.wrongCount}</td>
                    <td>{fmtTime(r.finishTime)}</td>
                    <td className="cell-score">{fmt(r.finalScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── Arena tournament games ─── */}
        {activityTab === 'arena' && (<>
          {arenaGames.length > 0 && (
            <div className="csd-tab-hint">Tap ▶ Watch to replay a game</div>
          )}
          {arenaGames.length === 0 ? (
          <div className="coach-empty">No arena games in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tournament</th>
                  <th>Color</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Time ctrl</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arenaGames.map((g, i) => {
                  const sid = String(student?._id);
                  const isWhite = String(g.whitePlayerId) === sid;
                  const opponent = isWhite
                    ? (g.blackPlayerDisplayName || g.blackPlayerUsername)
                    : (g.whitePlayerDisplayName || g.whitePlayerUsername);
                  let resultLabel = '—';
                  let resultClass = '';
                  if (g.result === 'white_won') { resultLabel = isWhite ? 'Win' : 'Loss'; resultClass = isWhite ? 'cell-good' : 'cell-bad'; }
                  else if (g.result === 'black_won') { resultLabel = isWhite ? 'Loss' : 'Win'; resultClass = isWhite ? 'cell-bad' : 'cell-good'; }
                  else if (g.result === 'draw') { resultLabel = 'Draw'; }
                  const tc = g.timeControl ? `${g.timeControl.minutes}+${g.timeControl.increment ?? 0}` : '—';
                  const watchGame = () => setArenaGamePopup({
                    moves: Array.isArray(g.moves) ? g.moves : [],
                    startFen: g.startFen,
                    finalFen: g.fen,
                    white: g.whitePlayerDisplayName || g.whitePlayerUsername || 'White',
                    black: g.blackPlayerDisplayName || g.blackPlayerUsername || 'Black',
                    result: g.result,
                    orientation: isWhite ? 'white' : 'black',
                  });
                  return (
                    <tr key={i}>
                      <td>{fmtDate(g.finishedAt)}</td>
                      <td>{g.tournamentId?.name || '—'}</td>
                      <td>{isWhite ? '⬜ White' : '⬛ Black'}</td>
                      <td>{opponent}</td>
                      <td className={resultClass}>{resultLabel}</td>
                      <td>{tc}</td>
                      <td>
                        <button className="csd-watch-btn" onClick={watchGame} title="Replay this game">
                          ▶ Watch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </>)}

        {/* ── Study / Test results ───── */}
        {activityTab === 'studies' && (
          testResults.length === 0 ? (
          <div className="coach-empty">No studies in the last 30 days.</div>
        ) : (
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Study</th>
                  <th>Chapter</th>
                  <th>Solved</th>
                  <th>Accuracy</th>
                  <th>Points</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((r, i) => {
                  const acc = r.puzzlesAttempted > 0 ? Math.round((r.puzzlesSolved / r.puzzlesAttempted) * 100) : null;
                  return (
                    <tr key={i}>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>{r.studyId?.title || '—'}</td>
                      <td>{r.chapterId?.title || '—'}</td>
                      <td>{r.puzzlesSolved}/{r.totalPuzzles}</td>
                      <td>
                        {acc != null ? (
                          <span className={`acc-pill ${acc >= 80 ? 'acc-high' : acc >= 50 ? 'acc-mid' : 'acc-low'}`}>
                            {acc}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>{r.totalPoints}/{r.maxPoints}</td>
                      <td>{fmtTime(r.totalTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── Assignments ────────────── */}
        {activityTab === 'assignments' && (<>
          {!embedded && (
            <div className="csd-tab-hint">
              <Link to="/coach/assignments" className="btn-ghost">＋ New assignment</Link>
            </div>
          )}
          {assignments.length === 0 ? (
          <div className="coach-empty">No assignments yet for this student.</div>
        ) : (
          <div className="coach-assignment-list">
            {assignments.map(a => {
              const mine = a.completions?.find(c => String(c.studentId) === String(student?._id));
              return (
                <div key={a._id} className="coach-assignment-row">
                  <div>
                    <div className="assign-title">{a.title}</div>
                    <div className="assign-meta">
                      {a.assignmentType.replace('_', ' ')}
                      {a.targetCount ? ` · ${a.targetCount} puzzles` : ''}
                      {a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="assign-status">
                    <span className={`pill pill-${mine?.status || 'assigned'}`}>
                      {mine?.status || 'assigned'}
                    </span>
                    {mine?.progress != null && <span className="prog">{Math.round(mine.progress)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>)}
      </div>

      {arenaGamePopup && (
        <ArenaGameReplayModal
          moves={arenaGamePopup.moves}
          startFen={arenaGamePopup.startFen}
          finalFen={arenaGamePopup.finalFen}
          white={arenaGamePopup.white}
          black={arenaGamePopup.black}
          result={arenaGamePopup.result}
          orientation={arenaGamePopup.orientation}
          onClose={() => setArenaGamePopup(null)}
        />
      )}

      {showFullReport && streakReport?.payload && (
        <FullReportModal
          report={streakReport}
          studentName={link?.studentName || student?.displayName || student?.username || 'this student'}
          onClose={() => setShowFullReport(false)}
        />
      )}
    </div>
  );
}

/**
 * The student's whole practice report, for the coach.
 *
 * The section above is a triage summary — enough to spot who needs attention.
 * This is everything the STUDENT sees, which is what a coach actually needs when
 * preparing a lesson: which endgames were reached and lost, the openings, the
 * clock, the motifs behind the mistakes, and the report-over-report table.
 * All of it was already in the payload and simply never rendered here.
 */
function FullReportModal({ report, studentName, onClose }) {
  const p = report.payload || {};
  const phases = p.phases || {};
  const games = p.games || {};
  // The SAME read-side repairs the student's own report page applies. Without
  // these the coach saw a different report from their student for any payload
  // written before the current builder: "Unknown" openings, one row per
  // variation, one-game openings, and no comparison table at all.
  const openings = viewOpenings(p);
  const comparison = viewComparison(report);
  const cols = comparison.columns || [];

  // Escape to close — a coach flicking through students should not have to aim.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const pct = (v) => (v == null ? '—' : `${v}%`);

  return (
    <div className="csd-modal-back" onClick={onClose} role="dialog" aria-modal="true">
      <div className="csd-modal" onClick={e => e.stopPropagation()}>
        <div className="csd-modal-head">
          <div>
            <h2>Practice report — {studentName}</h2>
            <span className="csd-muted">
              {fmtDate(report.periodStart)} – {fmtDate(report.periodEnd)} ·
              {' '}{report.gamesAnalysed} of {report.gamesFound} games analysed
            </span>
          </div>
          <button type="button" className="csd-modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="csd-modal-body">
          {p.verdict?.text && <p className="csd-verdict">🎯 {p.verdict.text}</p>}

          {/* Phases, in full: accuracy AND the error counts behind it. */}
          <h3 className="csd-modal-h3">Accuracy by phase</h3>
          <div className="csd-fr-phases">
            {['opening', 'middlegame', 'endgame'].map(k => {
              const ph = phases[k] || {};
              const weak = weakestPhaseOf(phases) === k;
              return (
                <div key={k} className={`csd-fr-phase${weak ? ' is-weak' : ''}`}>
                  <div className="csd-fr-phase-name">{k}</div>
                  <div className="csd-fr-phase-acc" style={{ color: accColor(ph.accuracy) }}>
                    {pct(ph.accuracy)}
                  </div>
                  <div className="csd-fr-phase-moves">{ph.moves || 0} moves</div>
                  <div className="csd-fr-err"><span>Blunders</span><b>{ph.blunders || 0}</b></div>
                  <div className="csd-fr-err"><span>Mistakes</span><b>{ph.mistakes || 0}</b></div>
                  <div className="csd-fr-err"><span>Inaccuracies</span><b>{ph.inaccuracies || 0}</b></div>
                  {weak && <div className="csd-fr-weak">Weakest phase</div>}
                </div>
              );
            })}
          </div>

          {/* Defence — including the collapses, which the summary omitted. */}
          {p.defence?.opportunities > 0 && (
            <>
              <h3 className="csd-modal-h3">How they defend</h3>
              <div className="csd-fr-stats">
                <Stat2 label="Difficult positions" v={p.defence.opportunities} />
                <Stat2 label="Saved or held" good
                  v={(p.defence.recovered || 0) + (p.defence.turnedAround || 0) + (p.defence.held || 0)} />
                <Stat2 label="Collapsed" bad v={p.defence.collapsed || 0} />
                <Stat2 label="Defensive score" v={pct(p.defence.defensiveScore)} />
                <Stat2 label="Avg. resistance"
                  v={p.defence.avgResistanceMoves != null ? `${p.defence.avgResistanceMoves} moves` : '—'} />
              </div>
            </>
          )}

          {(p.endgames || []).length > 0 && (
            <>
              <h3 className="csd-modal-h3">Endgames reached</h3>
              <div className="csd-fr-scroll">
                <table className="csd-fr-table">
                  <thead><tr><th>Endgame</th><th>Reached</th><th>W</th><th>D</th><th>L</th><th>Score</th></tr></thead>
                  <tbody>
                    {p.endgames.map((e, i) => (
                      <tr key={i}>
                        <th scope="row">{e.type}</th>
                        {/* `played`, not `reached` — endgameSummary() emits
                            played, so `reached` rendered an empty column. */}
                        <td>{e.played}</td><td>{e.wins}</td><td>{e.draws}</td><td>{e.losses}</td>
                        <td className={e.score < 40 ? 'csd-bad' : e.score > 60 ? 'csd-good' : ''}>{pct(e.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {openings.length > 0 && (
            <>
              <h3 className="csd-modal-h3">Openings played</h3>
              <div className="csd-fr-scroll">
                <table className="csd-fr-table">
                  <thead><tr><th>Opening</th><th>Side</th><th>Games</th><th>W</th><th>D</th><th>L</th><th>Score</th></tr></thead>
                  <tbody>
                    {openings.map((o, i) => (
                      <tr key={i}>
                        <th scope="row">{o.opening}</th>
                        <td>{o.side === 'white' ? 'White' : o.side === 'black' ? 'Black' : '—'}</td>
                        <td>{o.games}</td><td>{o.wins}</td><td>{o.draws}</td><td>{o.losses}</td>
                        <td className={o.score < 40 ? 'csd-bad' : o.score > 60 ? 'csd-good' : ''}>{pct(o.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {(p.momentThemes || []).length > 0 && (
            <>
              <h3 className="csd-modal-h3">Patterns they missed</h3>
              <div className="csd-fr-motifs">
                {p.momentThemes.slice(0, 10).map(t => (
                  <span key={t.theme} className="csd-fr-motif">
                    {String(t.theme).replace(/_/g, ' ')} <b>{t.count}</b>
                  </span>
                ))}
              </div>
            </>
          )}

          {p.timePressure?.hasClockData && (
            <>
              <h3 className="csd-modal-h3">The clock</h3>
              <div className="csd-fr-stats">
                <Stat2 label="Moves with time" v={p.timePressure.normalMoves} />
                <Stat2 label="Moves under a minute" v={p.timePressure.pressuredMoves} />
              </div>
              {p.timePressure.avgDropPressured > p.timePressure.avgDropNormal * 1.5 && (
                <p className="csd-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  Their play falls off sharply when the clock runs low — a time-management
                  problem rather than a chess one.
                </p>
              )}
            </>
          )}

          {/* The measures table. With more than one report it shows the trend;
              with one it is still the fullest set of figures on the page, so it
              renders either way rather than being hidden from any coach whose
              student has only earned their first. */}
          {cols.length > 0 && (
            <>
              <h3 className="csd-modal-h3">
                {cols.length > 1 ? 'Report over report' : 'All measures'}
              </h3>
              <div className="csd-fr-scroll">
                <table className="csd-fr-table">
                  <thead>
                    <tr>
                      <th>Measure</th>
                      {cols.map((c, i) => (
                        <th key={i}>{i === cols.length - 1 ? 'This report' : `Report ${i + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Same measures, in the same order, as the student's own
                        report — a coach and their student discussing "the
                        table" must be looking at the same rows. */}
                    {[
                      ['Puzzles solved', 'puzzles', ''],
                      ['Puzzle accuracy', 'puzzleAccuracy', '%'],
                      ['Best streak', 'bestStreak', ''],
                      ['Days practised', 'daysPractised', ''],
                      ['Games analysed', 'gamesAnalysed', ''],
                      ['Opening', 'opening', '%'],
                      ['Middlegame', 'middlegame', '%'],
                      ['Endgame', 'endgame', '%'],
                      ['Blunders per game', 'blundersPerGame', ''],
                      ['Defensive score', 'defensiveScore', '%'],
                      ['Mistakes found', 'momentsFound', ''],
                      ['Chess Nexus arena', 'arenaGames', ''],
                      ['Lichess + Chess.com', 'externalGames', ''],
                      ['Win rate', 'winRate', '%'],
                      ['Endgames played out', 'endgamesPlayed', ''],
                      ['Chapters completed', 'studies', ''],
                    ].filter(([, f]) => cols.some(c => c[f] != null)).map(([label, f, sfx]) => (
                      <tr key={f}>
                        <th scope="row">{label}</th>
                        {cols.map((c, i) => (
                          <td key={i}>{c[f] == null ? '—' : `${c[f]}${sfx}`}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {(p.suggestions || []).length > 0 && (
            <>
              <h3 className="csd-modal-h3">Study plan given to this student</h3>
              <div className="csd-plan">
                {p.suggestions.map(sg => (
                  <div key={sg.key} className="csd-plan-row">
                    <span className="csd-plan-ic">{sg.icon}</span>
                    <span><b>{sg.title}</b><em>{sg.detail}</em></span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="csd-muted" style={{ fontSize: 12, marginTop: 18 }}>
            This is the same report the student sees.
            {games.sampled && ` Analysed ${games.analysed} of ${games.found} games this period.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat2({ label, v, good, bad }) {
  return (
    <div className="csd-fr-stat">
      <div className={`csd-fr-stat-v${good ? ' csd-good' : ''}${bad ? ' csd-bad' : ''}`}>{v}</div>
      <div className="csd-fr-stat-l">{label}</div>
    </div>
  );
}

// ─── Compact game-analysis report for the coach ───────────────────────────────
// Surfaces the key fields from the shared analysis result (same engine as the
// student's own "Analyze My Games"), summarised for a coach at-a-glance.
function accColor(a) {
  if (a == null) return '#9ca3af';
  return a >= 85 ? '#10b981' : a >= 70 ? '#06b6d4' : a >= 50 ? '#f59e0b' : '#ef4444';
}

function AnalysisReport({ result }) {
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  if (!result) return null;
  const totalBlunders = (result.opening?.blunders || 0) + (result.middlegame?.blunders || 0) + (result.endgame?.blunders || 0);

  // Guard against degenerate / tiny samples. With only 1–2 games (especially
  // short ones that ended quickly), the engine sees too few real decisions, so
  // "0 cp loss → Master 2000+ / 100%" is an artefact, not a true rating. We show
  // the numbers but flag them as low-confidence and suppress the ELO claim.
  const gamesN = result.gamesAnalyzed || 0;
  const movesAnalyzed =
    (result.opening?.moveCount || 0) + (result.middlegame?.moveCount || 0) + (result.endgame?.moveCount || 0);
  const lowSample = gamesN < 3 || movesAnalyzed < 20;
  const cp = result.capsScore?.avgCpLoss;
  // Trust the ELO band only with enough data AND a non-degenerate cp-loss reading.
  const eloBandTrustworthy = result.capsScore?.eloBand?.display && !lowSample && !(cp === 0 && movesAnalyzed < 60);

  return (
    <div className="csd-analysis">
      {lowSample && (
        <div className="csd-lowsample">
          ⚠️ Only {gamesN} game{gamesN === 1 ? '' : 's'} ({movesAnalyzed} of this player's moves) could be analyzed —
          not enough to judge skill reliably. Treat accuracy, cp-loss and the playstyle below as rough indicators,
          not a true rating. Ask the student to play a few more arena games, then re-analyze.
        </div>
      )}

      {/* Top-line summary */}
      <div className="csd-analysis-top">
        <div className="csd-an-card">
          <span className="csd-an-label">Games analyzed</span>
          <span className="csd-an-val">{gamesN}<span className="csd-an-cap"> / 25 max</span></span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Overall accuracy</span>
          <span className="csd-an-val" style={{ color: accColor(result.overallAccuracy) }}>
            {result.overallAccuracy != null ? `${result.overallAccuracy}%` : '—'}
          </span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Record (W-D-L)</span>
          <span className="csd-an-val">
            <span className="cell-good">{result.wins ?? 0}</span>-
            {result.draws ?? 0}-
            <span className="cell-bad">{result.losses ?? 0}</span>
          </span>
        </div>
        <div className="csd-an-card">
          <span className="csd-an-label">Blunders</span>
          <span className="csd-an-val cell-bad">{totalBlunders}</span>
        </div>
        {result.capsScore?.avgCpLoss != null && (
          <div className="csd-an-card">
            <span className="csd-an-label">Avg cp lost / move</span>
            <span className="csd-an-val">{result.capsScore.avgCpLoss}</span>
          </div>
        )}
        {result.playstyle?.display && (
          <div className="csd-an-card">
            <span className="csd-an-label">Playstyle</span>
            <span className="csd-an-val csd-an-val-sm">{result.playstyle.display}</span>
          </div>
        )}
      </div>

      {eloBandTrustworthy && (
        <div className="csd-elo-band">
          Move quality is around <strong>{result.capsScore.eloBand.display}</strong> level
          {result.capsScore.eloBand.label ? ` (${result.capsScore.eloBand.label})` : ''}.
        </div>
      )}

      {/* ── Detailed report — same cards as the student's "Analyze My Games" ── */}

      {/* Game phase accuracy (doughnuts) */}
      <h3 className="ga-section-title">📊 Game Phase Accuracy</h3>
      <div className="ga-phase-cards">
        <PhaseCard phase="Opening"    data={result.opening}    icon="♟" />
        <PhaseCard phase="Middlegame" data={result.middlegame} icon="⚔" />
        <PhaseCard phase="Endgame"    data={result.endgame}    icon="👑" />
      </div>

      {/* Recurring patterns / coach takeaways */}
      {Array.isArray(result.patterns) && result.patterns.length > 0 && (
        <div className="csd-patterns">
          <div className="csd-patterns-title">🔬 Recurring patterns</div>
          <ul>
            {result.patterns.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Peer comparison */}
      {result.peerComparison && <PeerComparisonCard peerComparison={result.peerComparison} />}

      {/* Endgame type performance */}
      {result.endgameStats && result.endgameStats.length > 0 && (
        <div className="ga-endgame-section">
          <h3 className="ga-section-title">👑 Endgame Type Performance</h3>
          <EndgameStats endgameStats={result.endgameStats} />
        </div>
      )}

      {/* Performance trends across games */}
      {result.trends && result.trends.accuracyPerGame && result.trends.accuracyPerGame.length > 0 && (
        <>
          <h3 className="ga-section-title">📉 Performance Trends</h3>
          <TrendCharts trends={result.trends} />
        </>
      )}

      {/* Per-game breakdown + move-by-move replay */}
      {result.games && result.games.length > 0 && (
        <>
          <h3 className="ga-section-title">📋 Per-Game Breakdown</h3>
          <p className="ga-section-desc">Click a game to replay it move-by-move with full analysis.</p>
          <GameBreakdownTable games={result.games} />
          <div className="ga-game-btns">
            {result.games.map((g, i) => (
              <button
                key={i}
                className={`ga-game-btn${selectedGameIndex === i ? ' active' : ''}`}
                onClick={() => setSelectedGameIndex(i)}
              >
                Game {g.gameNumber}
              </button>
            ))}
          </div>
          {selectedGameIndex !== null && result.games[selectedGameIndex] && (
            <GameReplay
              game={result.games[selectedGameIndex]}
              totalGames={result.games.length}
              onClose={() => setSelectedGameIndex(null)}
              onNext={() => setSelectedGameIndex(prev => prev < result.games.length - 1 ? prev + 1 : prev)}
              onPrev={() => setSelectedGameIndex(prev => prev > 0 ? prev - 1 : prev)}
            />
          )}
        </>
      )}
    </div>
  );
}

