// src/pages/SocialHubPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PlayerName from '../components/PlayerName';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import Chat from './Chat';
import BestRacers from '../components/BestRacers';
import MonthlyFocusLeaderboard from './monthlyFocus/MonthlyFocusLeaderboard';
import AboutFeatureCTA from '../components/marketing/AboutFeatureCTA';
import UserAvatar from '../components/UserAvatar';
import CoffeeCta from '../components/CoffeeCta';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import './SocialHubPage.css';
import { t as tr } from '../i18n/LanguageContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?')[0].toUpperCase();
}

const TIER_META = {
  none:       { label: tr('No tier yet'),       cls: 'sh-tier-none' },
  mentor:     { label: tr('⭐ Mentor'),          cls: 'sh-tier-mentor' },
  ambassador: { label: tr('🌟 Ambassador'),      cls: 'sh-tier-ambassador' },
};

const AVATAR_META = {
  none:   { label: tr('No unlock yet'),   color: 'var(--color-text-faint)' },
  basic:  { label: tr('🖼️ Basic Avatars'), color: 'var(--color-accent)' },
  custom: { label: tr('📷 Custom Photo'),  color: 'var(--color-success)' },
  '3d':   { label: tr('🎭 3D Models'),     color: 'var(--color-accent-2)' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return tr("{mins}m ago", { mins: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return tr("{hrs}h ago", { hrs: hrs });
  return tr("{v0}d ago", { v0: Math.floor(hrs / 24) });
}

// ════════════════════════════════════════════════════════════════════════════
//  FEED SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function FeedEvent({ event, myId }) {
  const uid = event.user?._id?.toString?.() ?? event.user?._id ?? '';
  const isMe = uid === myId?.toString();
  const name = isMe ? tr('You') : (event.user?.displayName || event.user?.username || tr('Someone'));
  const ago  = timeAgo(event.createdAt);

  if (event.type === 'race') {
    const medal    = event.rank === 1 ? '🥇' : event.rank === 2 ? '🥈' : event.rank === 3 ? '🥉' : '🏁';
    const rankText = event.rank <= 3 ? tr("ranked #{rank}", { rank: event.rank }) : tr("finished #{rank}", { rank: event.rank });
    return (
      <div className="sh-feed-event">
        <div className="sh-feed-icon">{medal}</div>
        <div className="sh-feed-body">
          <div className="sh-feed-text"><strong>{name}</strong> {rankText} {tr("in a Puzzle Race")}</div>
          <div className="sh-feed-meta">{event.finalScore}{tr("pts ·")} {event.puzzlesSolved} {tr("solved ·")} {event.accuracy}{tr("% acc ·")} {ago}</div>
        </div>
      </div>
    );
  }
  if (event.type === 'timed_race') {
    return (
      <div className="sh-feed-event">
        <div className="sh-feed-icon">⏱️</div>
        <div className="sh-feed-body">
          <div className="sh-feed-text"><strong>{name}</strong> {tr("raced through")} <em>{event.topic}</em></div>
          <div className="sh-feed-meta">{event.finalScore}{tr("pts ·")} {event.puzzlesSolved} {tr("solved ·")} {event.accuracy}{tr("% acc ·")} {ago}</div>
        </div>
      </div>
    );
  }
  return null;
}

function LiveEventCard({ event }) {
  const navigate = useNavigate();
  const isLive   = event.status === 'active';
  const isLobby  = event.status === 'lobby';
  const startIn  = event.scheduledStartTime
    ? Math.round((new Date(event.scheduledStartTime) - Date.now()) / 60000)
    : null;
  return (
    <div className="sh-live-event">
      <div className="sh-live-event-name">{event.name}</div>
      <div className="sh-live-event-meta">
        {isLive  && <span className="sh-live-badge">{tr("🔴 LIVE")}</span>}
        {isLobby && <span className="sh-lobby-badge">{tr("🟡 Open")}</span>}
        {!isLive && !isLobby && startIn !== null && (
          <span className="sh-soon-badge">⏰ {startIn < 1 ? 'Starting…' : tr("in {startIn}m", { startIn: startIn })}</span>
        )}
        <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--fs-small)' }}> · {event.participantCount} {tr("players")}</span>
      </div>
      <button
        className="sh-btn-join"
        onClick={() => navigate('/arenatournament/join')}
      >
        {isLive || isLobby ? tr('Join Now →') : tr('View →')}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FEED TAB
// ════════════════════════════════════════════════════════════════════════════
function FeedTab({ user }) {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [shown, setShown]   = useState(10);

  useEffect(() => {
    api.get('/api/social/feed')
      .then(r => setData(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sh-empty"><div className="sh-spinner" /></div>;

  const {
    onlineFriends   = [],
    events          = [],
    liveEvents      = [],
    topInviters     = [],
    weekLeaderboard = [],
    networkSize     = 0,
  } = data || {};

  const myId = user?._id?.toString();

  return (
    <div className="sh-feed-layout">

      {/* ── Online Now strip ─────────────────────────────────────────────── */}
      {onlineFriends.length > 0 && (
        <div className="sh-card sh-online-bar">
          <div className="sh-section-title" style={{ marginBottom: 14 }}>
            {tr("🟢 Online Now")}
            <span style={{ marginLeft: 10, fontSize: 'var(--fs-small)', fontWeight: 400, color: 'var(--color-text-faint)' }}>
              {onlineFriends.length} {onlineFriends.length === 1 ? 'friend' : 'friends'}
            </span>
          </div>
          <div className="sh-online-list">
            {onlineFriends.map(f => (
              <div key={f._id} className="sh-online-friend">
                <div className="sh-avatar sh-avatar-sm" style={{ position: 'relative' }}>
                  <UserAvatar user={f} size={34} />
                  <span className="sh-online-dot" />
                </div>
                <span className="sh-online-name"><PlayerName displayName={f.displayName} username={f.username} userId={f._id} /></span>
                <button
                  className="sh-btn-challenge"
                  title={tr("Challenge to Puzzle Race")}
                  onClick={() => navigate('/race')}
                >⚡</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sh-feed-cols">

        {/* ── Activity Stream ──────────────────────────────────────────────── */}
        <div className="sh-feed-main">
          <div className="sh-card">
            <div className="sh-section-title" style={{ marginBottom: 16 }}>
              {tr("📰 Activity Stream")}
              {networkSize === 0 && (
                <span style={{ marginLeft: 10, fontSize: 'var(--fs-small)', fontWeight: 400, color: 'var(--color-text-faint)', textTransform: 'none' }}>
                  {tr("(platform-wide · add friends to see their activity first)")}
                </span>
              )}
            </div>

            {events.length === 0 ? (
              <div className="sh-empty" style={{ padding: '32px 0' }}>
                <div className="sh-empty-icon">💤</div>
                <div className="sh-empty-text">
                  {tr("No activity yet.")}<br />
                  <button className="sh-btn-primary" style={{ marginTop: 14, fontSize: 'var(--fs-small)' }} onClick={() => navigate('/race')}>
                    {tr("Be the first — start a race!")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {events.slice(0, shown).map((ev, i) => (
                  <FeedEvent key={i} event={ev} myId={myId} />
                ))}
                {shown < events.length && (
                  <button
                    className="sh-btn-secondary"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => setShown(n => n + 15)}
                  >
                    {tr("Load more…")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────── */}
        <div className="sh-feed-side">

          {/* Top Inviters */}
          {topInviters.length > 0 && (
            <div className="sh-card">
              <div className="sh-section-title" style={{ marginBottom: 14 }}>{tr("🎟️ Top Inviters")}</div>
              {topInviters.map((inv, i) => (
                <div key={inv._id} className="sh-lb-item">
                  <span className={`sh-lb-rank ${i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : ''}`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                  </span>
                  <span className="sh-lb-name"><PlayerName displayName={inv.displayName} username={inv.username} userId={inv._id} /></span>
                  <span className="sh-lb-score">{inv.inviteCount} {inv.inviteCount === 1 ? 'invite' : 'invites'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Live Events */}
          <div className="sh-card">
            <div className="sh-section-title" style={{ marginBottom: 14 }}>{tr("⚡ Live Events")}</div>
            {liveEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ color: 'var(--color-white-a20)', fontSize: 'var(--fs-small)', margin: '0 0 12px' }}>{tr("No live events right now.")}</p>
                <button className="sh-btn-secondary" style={{ fontSize: 'var(--fs-small)' }} onClick={() => navigate('/arenatournament')}>
                  {tr("Browse Tournaments")}
                </button>
              </div>
            ) : (
              liveEvents.map(ev => <LiveEventCard key={ev._id} event={ev} />)
            )}
          </div>

          {/* Weekly leaderboard */}
          {weekLeaderboard.length > 0 && (
            <div className="sh-card">
              <div className="sh-section-title" style={{ marginBottom: 14 }}>{tr("🏆 Friends This Week")}</div>
              {weekLeaderboard.map((entry, i) => {
                const isMe = entry._id?.toString() === myId;
                return (
                  <div key={entry._id} className={`sh-lb-item${isMe ? ' sh-lb-me' : ''}`}>
                    <span className={`sh-lb-rank ${i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : ''}`}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </span>
                    <span className="sh-lb-name">{isMe ? 'You' : <PlayerName displayName={entry.displayName} username={entry.username} userId={entry._id} />}</span>
                    <span className="sh-lb-score">{entry.totalScore}{tr("pts")}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nudge to add friends when none */}
          {networkSize === 0 && (
            <div className="sh-card" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
              <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>{tr("Add friends")}</div>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)', marginBottom: 16, lineHeight: 1.5 }}>
                {tr("See their races, challenge them, and compete on the weekly leaderboard.")}
              </div>
              <button className="sh-btn-primary" style={{ fontSize: 'var(--fs-small)' }} onClick={() => navigate('/friends')}>
                {tr("Find Friends →")}
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="sh-card">
            <div className="sh-section-title" style={{ marginBottom: 14 }}>{tr("🎯 Quick Start")}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="sh-btn-primary"   onClick={() => navigate('/race')}>{tr("⚡ Puzzle Race")}</button>
              <button className="sh-btn-secondary" onClick={() => navigate('/timed-race')}>{tr("⏱️ Timed Race")}</button>
              <button className="sh-btn-secondary" onClick={() => navigate('/arenatournament/join')}>{tr("🏆 Join Tournament")}</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PLAYERS TAB
// ════════════════════════════════════════════════════════════════════════════
// Avatar — renders the shared UserAvatar (photo / basic / 3D / initials),
// keeping the online ring overlay. 3D models render as a still frame here.
function PlayerAvatar({ user, name, size = 40, online }) {
  return (
    <div className="pl-ava" style={{ width: size, height: size, position: 'relative' }}>
      <UserAvatar user={user} displayName={name} size={size} />
      {online && <span className="pl-online-ring" />}
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank <= 3) {
    return <div className={`pl-rank pl-rank-${rank}`}>{['🥇', '🥈', '🥉'][rank - 1]}</div>;
  }
  return <div className="pl-rank pl-rank-n">{rank}</div>;
}

function LeaderRow({ rank, name, sub, score, scoreLabel, accent = 'cyan', showAvatar = true, user, avatarSize = 36, username, displayName, userId }) {
  // When we have player identifiers, render through PlayerName so the ☕
  // supporter badge appears; otherwise fall back to the plain name.
  const canBadge = username != null || displayName != null || userId != null;
  return (
    <div className={`pl-row${rank === 1 ? ' pl-row-top' : ''}`}>
      <RankBadge rank={rank} />
      {showAvatar && <PlayerAvatar user={user} name={name} size={avatarSize} />}
      <div className="pl-row-info">
        <div className="pl-row-name" title={typeof name === 'string' ? name : undefined}>
          {canBadge
            ? <PlayerName linkToProfile displayName={displayName ?? (typeof name === 'string' ? name : undefined)} username={username} userId={userId} />
            : name}
        </div>
        {sub && <div className="pl-row-sub">{sub}</div>}
      </div>
      {score != null && (
        <div className={`pl-score pl-score-${accent}`}>
          {score}{scoreLabel && <span className="pl-score-lbl">{scoreLabel}</span>}
        </div>
      )}
    </div>
  );
}

function PanelHead({ icon, title, subtitle, live, accent = 'cyan' }) {
  return (
    <div className="pl-phead">
      <div className={`pl-phead-icon pl-icon-${accent}`}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pl-phead-title">
          {title}
          {live && <span className="pl-live">{tr("LIVE")}</span>}
        </div>
        {subtitle && <div className="pl-phead-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

function ArenaLeaderCol({ icon, title, rows, accent, showRating = false, startRank = 0 }) {
  return (
    <div className={`pl-arena pl-arena-${accent}`}>
      <div className="pl-arena-head">
        <span className="pl-arena-icon">{icon}</span>
        <span className="pl-arena-title">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="pl-empty">{tr("No tournaments this week")}</div>
      ) : (
        rows.map((r, i) => (
          <LeaderRow
            key={r._id || i}
            rank={startRank + i + 1}
            name={r.displayName || r.username || tr('Player')}
            displayName={r.displayName}
            username={r.username}
            userId={r._id || r.userId}
            // Rating-bearing cards show the player's category Elo under the name.
            sub={showRating ? `${r.rating ?? '—'}` : undefined}
            score={r.score}
            scoreLabel="pts"
            accent={accent}
            user={r}
            avatarSize={28}
          />
        ))
      )}
    </div>
  );
}

function PlayersTab() {
  const navigate = useNavigate();
  const [active, setActive]   = useState([]);
  const [daily, setDaily]     = useState([]);
  const [arena, setArena]     = useState({ bullet: [], blitz: [], rapid: [], teamBullet: [], teamBlitz: [], teamRapid: [], chess960: [], marathon: [] });
  const [arenaTab, setArenaTab] = useState('standard'); // best-arena card active tab
  const [adminFocusId, setAdminFocusId] = useState(null); // active admin Monthly Focus
  const [loading, setLoading] = useState(true);

  // ── Player search ──────────────────────────────────────────────────────────
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/friends/search?q=${encodeURIComponent(q)}`);
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openProfile = (u) => {
    navigate(`/player/${encodeURIComponent(u.displayName || u.username)}`);
  };

  // Lightweight poll just for the daily-puzzle ratings so they update in real time
  const fetchDaily = useCallback(async () => {
    try {
      const r = await api.get('/api/public/leaderboard/daily-puzzle');
      return Array.isArray(r.data) ? r.data : [];
    } catch { return null; }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/api/social/most-active').then(r => r.data).catch(() => []),
      fetchDaily(),
      api.get('/api/social/arena-weekly-leaders').then(r => r.data).catch(() => ({ bullet: [], blitz: [], rapid: [], teamBullet: [], teamBlitz: [], teamRapid: [], chess960: [], marathon: [] })),
      api.get('/api/public/monthly-focus/current').then(r => r.data).catch(() => null),
    ]).then(([a, d, ar, mf]) => {
      if (!alive) return;
      setActive(Array.isArray(a) ? a : []);
      setDaily(Array.isArray(d) ? d : []);
      setArena(ar || { bullet: [], blitz: [], rapid: [], teamBullet: [], teamBlitz: [], teamRapid: [], chess960: [], marathon: [] });
      // Pick the admin-run Monthly Focus (same logic as the old homepage card).
      const all = mf ? (mf.focuses || (mf.focus ? [mf.focus] : [])) : [];
      const adminFocus = all.find(f => f.createdBy?.role === 'admin' || !f.createdBy);
      if (adminFocus) setAdminFocusId(adminFocus._id);
    }).finally(() => { if (alive) setLoading(false); });

    // Refresh daily-puzzle ratings every 20s for near real-time updates
    const id = setInterval(async () => {
      const d = await fetchDaily();
      if (alive && d) setDaily(d);
    }, 20000);

    return () => { alive = false; clearInterval(id); };
  }, [fetchDaily]);

  if (loading) return <div className="sh-empty"><div className="sh-spinner" /></div>;

  const { bullet = [], blitz = [], rapid = [], teamBullet = [], teamBlitz = [], teamRapid = [], chess960 = [], marathon = [] } = arena || {};

  return (
    <>
    {/* ── Player search ── */}
    <div className="pl-search-wrap">
      <input
        className="sh-search-input pl-search-input"
        type="text"
        placeholder={tr("🔍 Search players by name or @username…")}
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {search.trim().length >= 2 && (
        <div className="pl-search-results">
          {searching ? (
            <div className="pl-search-empty">{tr("Searching…")}</div>
          ) : results.length === 0 ? (
            <div className="pl-search-empty">{tr("No players found.")}</div>
          ) : (
            results.map(u => (
              <button key={u._id} className="pl-search-row" onClick={() => openProfile(u)}>
                <PlayerAvatar user={u} size={34} />
                <div className="pl-search-info">
                  <div className="pl-search-name" title={u.displayName}>
                    <PlayerName displayName={u.displayName} username={u.username} userId={u._id} />
                  </div>
                  {/* Never the username (it is private): display name + friend count only. */}
                  <div className="pl-search-handle">{u.friendCount || 0} {u.friendCount === 1 ? tr("friend") : tr("friends")}</div>
                </div>
                <span className="pl-search-go">{tr("View →")}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>

    <div className="pl-grid">

      {/* ── LEFT 25% — Most Active Users ───────────────────────────────────── */}
      <aside className="pl-active">
        <div className="pl-phead">
          <div className="pl-phead-icon pl-icon-rose">🔥</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pl-phead-title">{tr("Most Active")}</div>
            <div className="pl-phead-sub">{tr("Busiest players this week")}</div>
          </div>
        </div>

        {active.length === 0 ? (
          <div className="pl-empty" style={{ padding: '28px 0' }}>{tr("No activity yet this week.")}</div>
        ) : (
          <div className="pl-active-list">
            {active.slice(0, 15).map((u, i) => (
              <div key={u._id || i} className={`pl-active-row${i === 0 ? ' pl-active-top' : ''}`}>
                <span className="pl-active-rank">{i + 1}</span>
                <PlayerAvatar user={u} size={40} online={u.isOnline} />
                <div className="pl-row-info">
                  <div className="pl-row-name" title={u.displayName || u.username || ''}>
                    <PlayerName linkToProfile displayName={u.displayName} username={u.username} userId={u._id} />
                  </div>
                  <div className="pl-active-meta">
                    {u.isOnline
                      ? <span className="pl-online-tag">{tr("● online")}</span>
                      : <span>{tr("this week")}</span>}
                  </div>
                </div>
                <div className="pl-active-count">
                  <span className="pl-active-count-n">{u.activityCount}</span>
                  <span className="pl-active-count-l">{tr("actions")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── RIGHT 75% — Best Players ────────────────────────────────────────── */}
      <main className="pl-best">

        {/* Top 10 Daily Puzzle Solvers — split into two columns */}
        <section className="pl-panel pl-panel-cyan">
          <PanelHead
            icon="🧩"
            title={tr("Top Puzzle Solvers")}
            subtitle={tr("Highest-rated real players · updates live")}
            live
            accent="cyan"
          />
          {daily.length === 0 ? (
            <div className="pl-empty">{tr("No solvers yet.")}</div>
          ) : (
            <div className="pl-lb pl-lb-split">
              <div className="pl-lb-col">
                {daily.slice(0, 5).map((u, i) => (
                  <LeaderRow
                    key={u.username || i}
                    rank={u.rank || i + 1}
                    name={u.displayName || u.username}
                    displayName={u.displayName}
                    username={u.username}
                    userId={u._id || u.userId}
                    sub={u.todayDelta ? tr("▲ +{todayDelta} today", { todayDelta: u.todayDelta }) : tr('puzzle rating')}
                    score={u.rating}
                    accent="cyan"
                    user={u}
                  />
                ))}
              </div>
              <div className="pl-lb-col">
                {daily.slice(5, 10).map((u, i) => (
                  <LeaderRow
                    key={u.username || (i + 5)}
                    rank={u.rank || i + 6}
                    name={u.displayName || u.username}
                    displayName={u.displayName}
                    username={u.username}
                    userId={u._id || u.userId}
                    sub={u.todayDelta ? tr("▲ +{todayDelta} today", { todayDelta: u.todayDelta }) : tr('puzzle rating')}
                    score={u.rating}
                    accent="cyan"
                    user={u}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Best Racers (existing component) */}
        <section className="pl-panel pl-panel-emerald">
          <PanelHead icon="🏁" title={tr("Best Racers")} subtitle={tr("Top scores across race formats")} accent="emerald" />
          <div className="pl-racers-wrap">
            <BestRacers compact />
          </div>
        </section>

        <div className="pl-cta">
          <button className="pl-cta-btn" onClick={() => navigate('/arenatournament')}>{tr("🏆 Browse Tournaments")}</button>
          <button className="pl-cta-btn" onClick={() => navigate('/race')}>{tr("⚡ Start a Race")}</button>
        </div>

      </main>

      {/* Monthly Focus — Top Players (full width) */}
      <section className="pl-panel pl-panel-amber pl-fullspan">
        <PanelHead icon="🏆" title={tr("Monthly Focus — Top Players")} subtitle={tr("This month's focus-challenge leaders")} accent="amber" />
        <div className="pl-racers-wrap">
          <MonthlyFocusLeaderboard compact limit={5} focusId={adminFocusId} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/monthly-focus/leaderboard" className="pl-cta-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {tr("View full leaderboard →")}
          </Link>
        </div>
      </section>

      {/* Best Arena Players This Week — full width, 4 tabs */}
      <section className="pl-panel pl-panel-violet pl-fullspan">
        <PanelHead
          icon="🏆"
          title={tr("Best Arena Players — This Week")}
          subtitle={tr("Top point-scorers in this week's tournaments")}
          accent="violet"
        />

        {(() => {
          const ARENA_TABS = [
            { id: 'standard', label: tr('Standard Arena'),        icon: '⚔️' },
            { id: 'team',     label: tr('Team Battle'),           icon: '🛡️' },
            { id: 'chess960', label: tr('Chess960'),              icon: '♟️' },
            { id: 'marathon', label: tr('Bullet Blitz Marathon'), icon: '💥' },
          ];
          return (
            <>
              <div className="pl-arena-tabs">
                {ARENA_TABS.map(t => (
                  <button
                    key={t.id}
                    className={`pl-arena-tab${arenaTab === t.id ? ' pl-arena-tab-active' : ''}`}
                    onClick={() => setArenaTab(t.id)}
                  >
                    <span className="pl-arena-tab-icon">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {arenaTab === 'standard' && (
                // Standard arena split into 3 time-control cards, each with its
                // own category rating (bullet / blitz / rapid).
                <div className="pl-arena-grid pl-arena-grid-3">
                  <ArenaLeaderCol icon="🚀" title={tr("Bullet Arena")} rows={bullet} accent="rose"    showRating />
                  <ArenaLeaderCol icon="⚡" title={tr("Blitz Arena")}  rows={blitz}  accent="cyan"    showRating />
                  <ArenaLeaderCol icon="⏱️" title={tr("Rapid Arena")}  rows={rapid}  accent="emerald" showRating />
                </div>
              )}
              {arenaTab === 'team' && (
                // Team Battle split into 3 time-control cards, like Standard Arena.
                <div className="pl-arena-grid pl-arena-grid-3">
                  <ArenaLeaderCol icon="🚀" title={tr("Bullet Team")} rows={teamBullet} accent="rose"    showRating />
                  <ArenaLeaderCol icon="⚡" title={tr("Blitz Team")}  rows={teamBlitz}  accent="cyan"    showRating />
                  <ArenaLeaderCol icon="⏱️" title={tr("Rapid Team")}  rows={teamRapid}  accent="emerald" showRating />
                </div>
              )}
              {arenaTab === 'chess960' && (
                // Top 15 (users + bots), 3 cards of 5, continuous ranks. No rating.
                <div className="pl-arena-grid pl-arena-grid-3">
                  <ArenaLeaderCol icon="♟️" title={tr("Top 1–5")}   rows={chess960.slice(0, 5)}   accent="violet" startRank={0} />
                  <ArenaLeaderCol icon="♟️" title={tr("Top 6–10")}  rows={chess960.slice(5, 10)}  accent="violet" startRank={5} />
                  <ArenaLeaderCol icon="♟️" title={tr("Top 11–15")} rows={chess960.slice(10, 15)} accent="violet" startRank={10} />
                </div>
              )}
              {arenaTab === 'marathon' && (
                // Top 15 (users + bots), split into 3 cards of 5 with continuous ranks.
                <div className="pl-arena-grid pl-arena-grid-3">
                  <ArenaLeaderCol icon="💥" title={tr("Top 1–5")}   rows={marathon.slice(0, 5)}   accent="amber" startRank={0} />
                  <ArenaLeaderCol icon="💥" title={tr("Top 6–10")}  rows={marathon.slice(5, 10)}  accent="amber" startRank={5} />
                  <ArenaLeaderCol icon="💥" title={tr("Top 11–15")} rows={marathon.slice(10, 15)} accent="amber" startRank={10} />
                </div>
              )}
            </>
          );
        })()}
      </section>
    </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  INVITE TAB
// ════════════════════════════════════════════════════════════════════════════
function InviteTab({ user }) {
  const [myData, setMyData]     = useState(null);
  const [leaderboard, setLb]    = useState([]);
  const [invites, setInvites]   = useState([]);
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [me, lb, inv] = await Promise.all([
        api.get('/api/referral/me'),
        api.get('/api/referral/leaderboard'),
        api.get('/api/referral/invites'),
      ]);
      setMyData(me.data);
      setLb(lb.data);
      setInvites(inv.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = async () => {
    if (!myData?.referralLink) return;
    await navigator.clipboard.writeText(myData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return <div className="sh-empty"><div className="sh-spinner" /></div>;

  const total       = myData?.totalReferrals   ?? 0;
  const active      = myData?.activeReferrals  ?? 0;
  const quality     = myData?.inviteQualityScore ?? 0;
  const mentorTier  = myData?.mentorTier        ?? 'none';
  const avatarTier  = myData?.unlockedAvatarTier ?? 'none';
  const tierMeta    = TIER_META[mentorTier]  || TIER_META.none;
  const avatarMeta  = AVATAR_META[avatarTier] || AVATAR_META.none;

  const nextMentorAt  = mentorTier === 'none' ? 5 : mentorTier === 'mentor' ? 25 : null;
  const mentorPct     = nextMentorAt ? Math.min((active / nextMentorAt) * 100, 100) : 100;
  const nextAvatarAt  = avatarTier === 'none' ? 5 : avatarTier === 'basic' ? 15 : avatarTier === 'custom' ? 45 : null;
  const avatarPct     = nextAvatarAt ? Math.min((total / nextAvatarAt) * 100, 100) : 100;

  return (
    <div className="sh-invite-layout">

      {/* ── Leaderboard Sidebar ── */}
      <aside className="sh-invite-sidebar">
        <div className="sh-card">
          <div className="sh-lb-title">{tr("🏆 Top Inviters")}</div>
          {leaderboard.slice(0, 25).map((entry, i) => {
            const rankCls = i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : '';
            const isMe    = entry.username === user?.username;
            return (
              <div key={entry._id || i} className={`sh-lb-item${isMe ? ' sh-lb-me' : ''}`}>
                <span className={`sh-lb-rank ${rankCls}`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </span>
                <span className="sh-lb-name">
                  <PlayerName displayName={entry.displayName} username={entry.username} userId={entry._id} />{isMe ? ' (you)' : ''}
                </span>
                <span className="sh-lb-score">{entry.activeReferrals}</span>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <p style={{ color: 'var(--color-white-a20)', fontSize: 'var(--fs-small)', textAlign: 'center', margin: 0 }}>
              {tr("No entries yet")}
            </p>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="sh-invite-main">

        {/* Referral Link */}
        <div className="sh-card">
          <div className="sh-section-title">{tr("Your Invite Link")}</div>
          <div className="sh-ref-box">
            <span className="sh-ref-link">{myData?.referralLink || '—'}</span>
            <button className="sh-btn-primary" onClick={copyLink}>
              {copied ? tr('✓ Copied!') : tr('📋 Copy')}
            </button>
          </div>
          <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)', margin: 0 }}>
            {tr("Share this link — when someone signs up through it and becomes active, you earn rewards.")}
          </p>
        </div>

        {/* Stats */}
        <div className="sh-stat-grid">
          <div className="sh-stat-card">
            <div className="sh-stat-value">{total}</div>
            <div className="sh-stat-label">{tr("Total Invited")}</div>
          </div>
          <div className="sh-stat-card">
            <div className="sh-stat-value" style={{ color: 'var(--color-success)' }}>{active}</div>
            <div className="sh-stat-label">{tr("Active")}</div>
          </div>
          <div className="sh-stat-card">
            <div className="sh-stat-value" style={{ color: 'var(--color-accent-2)' }}>{quality}</div>
            <div className="sh-stat-label">{tr("Quality Score")}</div>
          </div>
        </div>

        {/* Mentor Tier */}
        <div className="sh-card">
          <div className="sh-section-title">{tr("Mentor Status")}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className={`sh-tier-badge ${tierMeta.cls}`}>{tierMeta.label}</span>
            {nextMentorAt && (
              <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>
                {active} / {nextMentorAt} {tr("active")}
              </span>
            )}
          </div>
          {nextMentorAt ? (
            <div className="sh-progress-track">
              <div className="sh-progress-fill" style={{ width: `${mentorPct}%` }} />
            </div>
          ) : (
            <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-success)', margin: 0 }}>{tr("Maximum tier reached! 🌟")}</p>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)', flexWrap: 'wrap' }}>
            <span>{tr("⭐ Mentor → 5 active invites")}</span>
            <span>{tr("🌟 Ambassador → 25 active invites")}</span>
          </div>
        </div>

        {/* Avatar Tier */}
        <div className="sh-card">
          <div className="sh-section-title">{tr("Avatar Unlocks")}</div>
          {/* Progress counter */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: avatarMeta.color }}>{avatarMeta.label}</span>
              {nextAvatarAt && (
                <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>
                  {total} / {nextAvatarAt} {tr("invited")}
                </span>
              )}
            </div>
            {nextAvatarAt ? (
              <div className="sh-progress-track">
                <div className="sh-progress-fill" style={{ width: `${avatarPct}%`, background: 'linear-gradient(90deg,var(--color-accent-2),var(--color-accent))' }} />
              </div>
            ) : (
              <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-accent-2)', margin: 0 }}>{tr("All avatar tiers unlocked! 🎭")}</p>
            )}
          </div>
          {/* Tier list */}
          {[
            { need: 0,  icon: '🔒', label: tr('No unlock yet'),   color: 'var(--color-text-faint)',  tier: 'none'   },
            { need: 5,  icon: '🖼️', label: tr('Basic'),           color: 'var(--color-accent)',                tier: 'basic'  },
            { need: 15, icon: '📷', label: tr('Custom Photo'),    color: 'var(--color-success)',                tier: 'custom' },
            { need: 45, icon: '🎭', label: tr('3D Model'),        color: 'var(--color-accent-2)',                tier: '3d'     },
          ].map(({ need, icon, label, color, tier }) => {
            const unlocked = tier === 'none' ? avatarTier === 'none' : total >= need;
            const isCurrent = avatarTier === tier;
            return (
              <div key={tier} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 10px', borderRadius: 'var(--radius-md)', marginBottom: 4,
                background: isCurrent ? 'rgba(168,85,247,0.1)' : 'transparent',
                border: isCurrent ? '1px solid rgba(168,85,247,0.25)' : '1px solid transparent',
                opacity: (!unlocked && tier !== 'none') ? 0.45 : 1,
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--fs-small)', fontWeight: 600, color: unlocked ? color : 'var(--color-text-faint)' }}>
                    {label}
                  </div>
                  {need > 0 && (
                    <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-white-a20)', marginTop: 1 }}>
                      {need} {tr("invited")} {unlocked && tier !== 'none' ? '✓' : ''}
                    </div>
                  )}
                </div>
                {isCurrent && <span style={{ fontSize: 'var(--fs-caption)', color, fontWeight: 700 }}>{tr("Current")}</span>}
              </div>
            );
          })}
        </div>

        {/* Invited list */}
        <div className="sh-card">
          <div className="sh-section-title">{tr("People You Invited (")}{invites.length})</div>
          {invites.length === 0 ? (
            <div className="sh-empty" style={{ padding: '28px 0' }}>
              <div className="sh-empty-icon">📬</div>
              <div className="sh-empty-text">{tr("No one yet — share your link!")}</div>
            </div>
          ) : (
            invites.map((inv, i) => (
              <div key={inv.id || i} className="sh-invite-item">
                <div className="sh-avatar sh-avatar-sm">{initials(inv.user?.displayName || inv.user?.username || 'User')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--color-text)' }}>{inv.user ? <PlayerName displayName={inv.user.displayName} username={inv.user.username} userId={inv.user._id} /> : 'Deleted User'}</div>
                  <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>@{inv.user?.username || 'unknown'}</div>
                </div>
                <span className={inv.status === 'active' ? 'sh-chip-active' : (inv.status === 'request_pending' ? 'sh-chip-request' : 'sh-chip-pending')}>
                  {inv.status === 'active' ? '✓ Active' : (inv.status === 'request_pending' ? '📜 Requested' : '⏳ Pending')}
                </span>
              </div>
            ))
          )}
        </div>

        {/* How It Works */}
        <div className="sh-card">
          <div className="sh-section-title">{tr("How It Works")}</div>
          {[
            'Copy your unique invite link and share it with friends.',
            'They sign up using your link — you see them instantly in the list above.',
            'When they play 10+ games or solve 10+ puzzles they become Active.',
            '5 active invites = ⭐ Mentor tier. 25 active invites = 🌟 Ambassador.',
            'Invite milestones also unlock avatar customization tiers.',
          ].map((text, i) => (
            <div key={i} className="sh-step">
              <div className="sh-step-num">{i + 1}</div>
              <p className="sh-step-text">{text}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FRIENDS TAB
// ════════════════════════════════════════════════════════════════════════════
const FRIEND_TABS = ['My Friends', 'Requests', 'Find People'];
const ONLINE_MS = 5 * 60 * 1000; // 5 minutes = "online"

function FriendsTab() {
  const navigate = useNavigate();
  const [subTab, setSubTab]       = useState('My Friends');
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [search, setSearch]       = useState('');
  const [results, setResults]     = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [timer, setTimer]         = useState(null);

  const fetchFriends = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        api.get('/api/friends'),
        api.get('/api/friends/requests'),
      ]);
      setFriends(f.data);
      setRequests(r.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Debounced search
  useEffect(() => {
    if (timer) clearTimeout(timer);
    if (!search.trim() || search.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/friends/search?q=${encodeURIComponent(search.trim())}`);
        setResults(res.data);
        const map = {};
        await Promise.all(res.data.map(async u => {
          try { const s = await api.get(`/api/friends/status/${u._id}`); map[u._id] = s.data; } catch (_) {}
        }));
        setStatusMap(map);
      } catch (err) { console.error(err); }
    }, 350);
    setTimer(t);
  }, [search]); // eslint-disable-line

  const sendRequest = async (userId) => {
    try {
      const res = await api.post('/api/friends/request', { userId });
      setStatusMap(prev => ({ ...prev, [userId]: { status: 'pending', iAmRequester: true, friendshipId: res.data.friendshipId } }));
    } catch (err) { alert(err.response?.data?.message || tr('Failed to send request')); }
  };

  const acceptRequest = async (id) => {
    try { await api.post(`/api/friends/accept/${id}`); await fetchFriends(); }
    catch (err) { alert(err.response?.data?.message || tr('Failed')); }
  };

  const declineRequest = async (id) => {
    try { await api.post(`/api/friends/decline/${id}`); setRequests(p => p.filter(r => r.friendshipId !== id)); }
    catch (err) { alert(err.response?.data?.message || tr('Failed')); }
  };

  const unfriend = async (id) => {
    if (!window.confirm(tr('Remove this friend?'))) return;
    try { await api.delete(`/api/friends/${id}`); setFriends(p => p.filter(f => f.friendshipId !== id)); }
    catch (err) { alert(err.response?.data?.message || tr('Failed')); }
  };

  return (
    <div className="sh-card">

      {/* Sub-tabs */}
      <div className="sh-sub-tabs">
        {FRIEND_TABS.map(t => (
          <button key={t} className={`sh-sub-tab${subTab === t ? ' sh-sub-tab-active' : ''}`} onClick={() => setSubTab(t)}>
            {t}
            {t === 'Requests' && requests.length > 0 && <span className="sh-badge">{requests.length}</span>}
          </button>
        ))}
      </div>

      {/* My Friends */}
      {subTab === 'My Friends' && (
        friends.length === 0 ? (
          <div className="sh-empty">
            <div className="sh-empty-icon">👋</div>
            <div className="sh-empty-text">{tr("No friends yet.")}<br />{tr("Use \"Find People\" to add friends!")}</div>
          </div>
        ) : (
          friends.map(f => {
            const isOnline = f.user?.lastActivity && (Date.now() - new Date(f.user.lastActivity)) < ONLINE_MS;
            return (
              <div key={f.friendshipId} className="sh-friend-item">
                <div className="sh-avatar" style={{ position: 'relative' }}>
                  <UserAvatar user={f.user} size={42} />
                  {isOnline && <span className="sh-online-dot" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlayerName displayName={f.user?.displayName} username={f.user?.username} userId={f.user?._id} />
                    {isOnline && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-success)', fontWeight: 500 }}>{tr("● online")}</span>}
                  </div>
                  <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>@{f.user?.username}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="sh-btn-challenge"
                    title={tr("Play a private game with this friend")}
                    onClick={() => navigate('/games?friend=1')}
                  >{tr("🔥 Play")}</button>
                  <button
                    className="sh-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--fs-small)' }}
                    title={tr("Open chat")}
                    onClick={() => navigate(`/social/chat?userId=${f.user?._id}`)}
                  >{tr("💬 Chat")}</button>
                  <button className="sh-btn-danger" onClick={() => unfriend(f.friendshipId)}>{tr("Unfriend")}</button>
                </div>
              </div>
            );
          })
        )
      )}

      {/* Requests */}
      {subTab === 'Requests' && (
        requests.length === 0 ? (
          <div className="sh-empty">
            <div className="sh-empty-icon">📭</div>
            <div className="sh-empty-text">{tr("No pending friend requests.")}</div>
          </div>
        ) : (
          requests.map(r => (
            <div key={r.friendshipId} className="sh-friend-item">
              <div className="sh-avatar">
                <UserAvatar user={r.user} size={42} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--color-text)' }}><PlayerName displayName={r.user?.displayName} username={r.user?.username} userId={r.user?._id} /></div>
                <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>@{r.user?.username}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="sh-btn-accept"  onClick={() => acceptRequest(r.friendshipId)}>{tr("Accept")}</button>
                <button className="sh-btn-decline" onClick={() => declineRequest(r.friendshipId)}>{tr("Decline")}</button>
              </div>
            </div>
          ))
        )
      )}

      {/* Find People */}
      {subTab === 'Find People' && (
        <>
          <input
            type="text"
            placeholder={tr("Search by username or display name…")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sh-search-input"
            style={{ marginBottom: 16 }}
            autoFocus
          />
          {search.trim().length > 0 && search.trim().length < 2 && (
            <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--fs-small)', marginTop: 0 }}>{tr("Type at least 2 characters…")}</p>
          )}
          {results.map(u => {
            const st = statusMap[u._id];
            return (
              <div key={u._id} className="sh-friend-item">
                <div className="sh-avatar">
                  <UserAvatar user={u} size={42} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--color-text)' }}><PlayerName displayName={u.displayName} username={u.username} userId={u._id} /></div>
                  <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-faint)' }}>{u.friendCount || 0} {tr("friends")}</div>
                </div>
                {!st || st.status === 'none' ? (
                  <button className="sh-btn-primary" style={{ padding: '7px 14px', fontSize: 'var(--fs-small)' }} onClick={() => sendRequest(u._id)}>{tr("+ Add")}</button>
                ) : st.status === 'accepted' ? (
                  <span className="sh-chip-friend">{tr("✓ Friends")}</span>
                ) : st.status === 'pending' ? (
                  <span className="sh-chip-pending">{st.iAmRequester ? 'Sent' : 'Respond ↑'}</span>
                ) : null}
              </div>
            );
          })}
          {search.trim().length >= 2 && results.length === 0 && (
            <div className="sh-empty" style={{ padding: '24px 0' }}>
              <div className="sh-empty-text">{tr("No users found.")}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CLUBS TAB
// ════════════════════════════════════════════════════════════════════════════
function ClubsTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch]         = useState('');
  const [clubs, setClubs]           = useState([]);
  const [myClubs, setMyClubs]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', isPrivate: false });
  const [joinCode, setJoinCode]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-open join modal when invite link contains ?code=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      setShowJoin(true);
      // Remove ?code= from URL without reloading
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        api.get(`/api/clubs?search=${encodeURIComponent(search)}&page=${page}`),
        api.get('/api/clubs/mine'),
      ]);
      setClubs(all.data.clubs);
      setTotal(all.data.total);
      setPages(all.data.pages);
      setMyClubs(mine.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);
  useEffect(() => { setPage(1); }, [search]);

  const createClub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/clubs', createForm);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', isPrivate: false });
      navigate(`/clubs/${res.data.club._id}`);
    } catch (err) { alert(err.response?.data?.message || tr('Failed to create club')); }
    finally { setSubmitting(false); }
  };

  const joinClub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/clubs/join', { joinCode: joinCode.trim() });
      setShowJoin(false);
      setJoinCode('');
      navigate(`/clubs/${res.data.clubId}`);
    } catch (err) { alert(err.response?.data?.message || tr('Invalid join code')); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={tr("Search clubs…")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sh-search-input"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button className="sh-btn-secondary" onClick={() => setShowJoin(true)}>{tr("🔑 Join with Code")}</button>
        <button className="sh-btn-primary"   onClick={() => setShowCreate(true)}>{tr("+ Create Club")}</button>
      </div>

      {/* My Clubs */}
      {myClubs.length > 0 && (
        <>
          <div className="sh-section-title" style={{ marginBottom: 14 }}>{tr("My Clubs")}</div>
          <div className="sh-clubs-grid" style={{ marginBottom: 30 }}>
            {myClubs.map(c => (
              <div key={c._id} className="sh-club-card sh-club-card-mine" onClick={() => navigate(`/clubs/${c._id}`)}>
                <div className="sh-club-name">{c.name}</div>
                <div className="sh-club-desc">{c.description || 'No description'}</div>
                <div className="sh-club-meta">👥 {c.memberCount} {tr("members")}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Browse */}
      <div className="sh-section-title" style={{ marginBottom: 14 }}>
        Browse Clubs&nbsp;
        {total > 0 && <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--fs-small)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({total})</span>}
      </div>

      {loading ? (
        <div className="sh-empty"><div className="sh-spinner" /></div>
      ) : clubs.length === 0 ? (
        <div className="sh-empty">
          <div className="sh-empty-icon">🏰</div>
          <div className="sh-empty-text">
            {tr("No clubs found.")}<br />
            <button className="sh-btn-secondary" style={{ marginTop: 14, fontSize: 'var(--fs-small)' }} onClick={() => setShowCreate(true)}>
              {tr("Create the first one!")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sh-clubs-grid">
            {clubs.map(c => (
              <div key={c._id} className={`sh-club-card${c.isMember ? ' sh-club-card-mine' : ''}`} onClick={() => navigate(`/clubs/${c._id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div className="sh-club-name">{c.name}</div>
                  {c.isMember && <span className="sh-chip-member">{tr("✓ Member")}</span>}
                </div>
                <div className="sh-club-desc">{c.description || 'No description'}</div>
                <div className="sh-club-meta">👥 {c.memberCount} {tr("members")}</div>
              </div>
            ))}
          </div>
          {pages > 1 && (
            <div className="sh-pag">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`sh-pag-btn${p === page ? ' sh-pag-btn-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Club Modal */}
      {showCreate && (
        <div className="sh-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="sh-modal" onClick={e => e.stopPropagation()}>
            <div className="sh-modal-title">{tr("Create a Club")}</div>
            <div className="sh-modal-subtitle">{tr("Give your club a name and an optional description.")}</div>
            <form onSubmit={createClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder={tr("Club name *")}
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="sh-input-field"
                required
                maxLength={50}
              />
              <textarea
                placeholder={tr("Description (optional)")}
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                className="sh-input-field"
                style={{ height: 90, resize: 'vertical' }}
                maxLength={300}
              />
              {/* Visibility */}
              <div>
                <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-text-faint)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{tr("Visibility")}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: false }))}
                    style={{
                      padding: '12px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                      background: !createForm.isPrivate ? 'rgba(34,197,94,0.15)' : 'var(--color-white-a04)',
                      border: !createForm.isPrivate ? '2px solid rgba(34,197,94,0.45)' : '2px solid var(--color-white-a07)',
                      color: 'var(--color-text)', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>🌍</div>
                    <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: !createForm.isPrivate ? '#4ade80' : 'var(--color-text-muted)' }}>{tr("Public")}</div>
                    <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-text-faint)', marginTop: 2, lineHeight: 1.4 }}>Anyone can find &amp; join</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: true }))}
                    style={{
                      padding: '12px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                      background: createForm.isPrivate ? 'var(--color-accent-2-a15)' : 'var(--color-white-a04)',
                      border: createForm.isPrivate ? '2px solid rgba(139,92,246,0.45)' : '2px solid var(--color-white-a07)',
                      color: 'var(--color-text)', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
                    <div style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: createForm.isPrivate ? 'var(--color-accent-2)' : 'var(--color-text-muted)' }}>{tr("Private")}</div>
                    <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-text-faint)', marginTop: 2, lineHeight: 1.4 }}>{tr("Invite link only")}</div>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="sh-btn-secondary" onClick={() => setShowCreate(false)}>{tr("Cancel")}</button>
                <button type="submit"  className="sh-btn-primary"  disabled={submitting}>
                  {submitting ? tr('Creating…') : tr('Create Club')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="sh-modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="sh-modal" onClick={e => e.stopPropagation()}>
            <div className="sh-modal-title">{tr("Join with Code")}</div>
            <div className="sh-modal-subtitle">{tr("Enter the 8-character code shared by a club member.")}</div>
            <form onSubmit={joinClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder={tr("JOIN CODE")}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="sh-input-field"
                style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                required
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="sh-btn-secondary" onClick={() => setShowJoin(false)}>{tr("Cancel")}</button>
                <button type="submit"  className="sh-btn-primary"  disabled={submitting}>
                  {submitting ? tr('Joining…') : tr('Join Club')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN — Social Hub Page
// ════════════════════════════════════════════════════════════════════════════
export default function SocialHubPage() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { user, unreadCount } = useAuth();

  const isGuest = user?.role === 'guest';

  // Most-active club (for the header pill). /api/clubs/mine returns clubs sorted
  // most-active first (by their chat's last-activity time), so [0] is the winner.
  const [topClub, setTopClub] = useState(null);
  useEffect(() => {
    if (isGuest) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/clubs/mine');
        if (alive && Array.isArray(res.data) && res.data.length) setTopClub(res.data[0]);
      } catch { /* silent — pill just won't show */ }
    })();
    return () => { alive = false; };
  }, [isGuest]);

  const activeTab = pathname.startsWith('/social/chat') ? 'chat'
                  : pathname.startsWith('/players')   ? 'players'
                  : pathname.startsWith('/friends')   ? 'friends'
                  : pathname.startsWith('/clubs')   ? 'clubs'
                  : pathname.startsWith('/invite')  ? 'invite'
                  : 'players'; // /social and default

  const TABS = [
    { id: 'players', label: tr('👤 Players'),           path: '/players' },
    { id: 'invite',  label: tr('🔓 Invite to Unlock'), path: '/invite'  },
    { id: 'friends', label: tr('👥 Friends'),           path: '/friends' },
    { id: 'clubs',   label: tr('🏰 Clubs'),             path: '/clubs'   },
  ];

  const subtitles = {
    chat:    'Read messages, reply fast, and keep conversations inside Social Hub',
    players: 'See who\'s most active and the best players across the app',
    friends: 'Add friends, accept requests, challenge them to races',
    clubs:   'Create and join clubs to connect with your group',
    invite:  'Invite players to unlock exclusive features and earn recognition',
  };

  // Guests get a read-only look at the community — the Players tab, which
  // showcases the most active + best players (social proof). Interactive
  // features (Invite / Friends / Clubs / Chat) stay behind a login prompt.
  if (isGuest) {
    return (
      <div className="sh-page">

        {/* Header */}
        <PageHeader
          title={tr("Social Hub")}
          titleClassName="sh-title"
          subtitle={tr("See who's most active and the best players across the app")}
          actions={
            /* Newsletter is public (no login), so guests get the door too. */
            <button
              type="button"
              className="sh-chat-launch"
              title={tr("What's new in Chess Nexus")}
              onClick={() => navigate('/newsletter')}
            >
              <span>{tr("🆕 New Updates")}</span>
            </button>
          }
        />

        {/* Sign-up banner */}
        <div className="sh-guest-banner">
          <div className="sh-guest-banner-text">
            <span className="sh-guest-banner-icon">👋</span>
            <span>
              You're browsing as a guest. Create a free account to add friends,
              join clubs, chat, and climb these leaderboards yourself.
            </span>
          </div>
          <button
            className="sh-guest-banner-btn"
            onClick={() => navigate('/login', { state: { message: tr('Create a free account to join the community.') } })}
          >
            {tr("Log In / Sign Up — It's Free")}
          </button>
        </div>

        {/* Players (social proof) — same view logged-in users see */}
        <PlayersTab />

        <AboutFeatureCTA
          links={[{ label: tr("About Social Hub"), to: "/chess-community" }]}
        />
      </div>
    );
  }

  // On the Chat tab, show ONLY the chat box — hide the hub header, tabs and CTA.
  const chatOnly = activeTab === 'chat';

  return (
    <div className={`sh-page${chatOnly ? ' sh-page-chatonly' : ''}`}>

      {/* Header — hidden in chat-only mode */}
      {!chatOnly && (
      <PageHeader
        title={tr("Social Hub")}
        titleClassName="sh-title"
        titleExtra={<CoffeeCta variant="pill" style={{ padding: '5px 12px', fontSize: 'var(--fs-caption)' }} />}
        subtitle={subtitles[activeTab]}
        actions={<>
          {/* Most-active club shortcut — left of the Chat button */}
          {topClub && (
            <button
              type="button"
              className="sh-topclub-pill"
              title={`Jump to ${topClub.name} — your most active club this month${topClub.monthlyMessages ? ` (${topClub.monthlyMessages} messages)` : ''}`}
              onClick={() => navigate(`/clubs/${topClub._id}`)}
            >
              <span className="sh-topclub-trophy">🏆</span>
              <span className="sh-topclub-text">
                <span className="sh-topclub-label">{tr("Most active club")}</span>
                <span className="sh-topclub-name">{topClub.name}</span>
              </span>
            </button>
          )}
          {/* Newsletter — a way IN, not a preview. Product news lives on its
              own page; this is just the door, sitting beside Chat because both
              are "leave the hub and go somewhere" actions. */}
          <button
            type="button"
            className="sh-chat-launch"
            title={tr("What's new in Chess Nexus")}
            onClick={() => navigate('/newsletter')}
          >
            <span>{tr("🆕 New Updates")}</span>
          </button>
          <button
            type="button"
            className={`sh-chat-launch${activeTab === 'chat' ? ' sh-chat-launch-active' : ''}`}
            onClick={() => navigate('/social/chat')}
          >
            <span>{tr("💬 Chat")}</span>
            {unreadCount > 0 && <span className="sh-chat-launch-badge">{unreadCount}</span>}
          </button>
        </>}
      />
      )}

      {/* Top-level Tabs — hidden in chat-only mode */}
      {!chatOnly && (
      <Tabs
        fit
        items={TABS}
        active={activeTab}
        onChange={id => navigate(TABS.find(t => t.id === id).path)}
      />
      )}

      {/* Content */}
      {activeTab === 'players' && <PlayersTab />}
      {activeTab === 'invite'  && <InviteTab  user={user} />}
      {activeTab === 'friends' && <FriendsTab />}
      {activeTab === 'clubs'   && <ClubsTab   />}
      {activeTab === 'chat'    && <Chat />}

      {!chatOnly && (
      <AboutFeatureCTA
        links={[{ label: tr("About Social Hub"), to: "/chess-community" }]}
      />
      )}
    </div>
  );
}
