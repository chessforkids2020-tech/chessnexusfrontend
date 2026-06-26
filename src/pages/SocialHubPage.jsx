// src/pages/SocialHubPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PlayerName from '../components/PlayerName';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import Chat from './Chat';
import BestRacers from '../components/BestRacers';
import AboutFeatureCTA from '../components/marketing/AboutFeatureCTA';
import UserAvatar from '../components/UserAvatar';
import './SocialHubPage.css';

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?')[0].toUpperCase();
}

const TIER_META = {
  none:       { label: 'No tier yet',       cls: 'sh-tier-none' },
  mentor:     { label: '⭐ Mentor',          cls: 'sh-tier-mentor' },
  ambassador: { label: '🌟 Ambassador',      cls: 'sh-tier-ambassador' },
};

const AVATAR_META = {
  none:   { label: 'No unlock yet',   color: 'rgba(255,255,255,0.4)' },
  basic:  { label: '🖼️ Basic Avatars', color: '#06b6d4' },
  custom: { label: '📷 Custom Photo',  color: '#10b981' },
  '3d':   { label: '🎭 3D Models',     color: '#a855f7' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ════════════════════════════════════════════════════════════════════════════
//  FEED SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function FeedEvent({ event, myId }) {
  const uid = event.user?._id?.toString?.() ?? event.user?._id ?? '';
  const isMe = uid === myId?.toString();
  const name = isMe ? 'You' : (event.user?.displayName || event.user?.username || 'Someone');
  const ago  = timeAgo(event.createdAt);

  if (event.type === 'race') {
    const medal    = event.rank === 1 ? '🥇' : event.rank === 2 ? '🥈' : event.rank === 3 ? '🥉' : '🏁';
    const rankText = event.rank <= 3 ? `ranked #${event.rank}` : `finished #${event.rank}`;
    return (
      <div className="sh-feed-event">
        <div className="sh-feed-icon">{medal}</div>
        <div className="sh-feed-body">
          <div className="sh-feed-text"><strong>{name}</strong> {rankText} in a Puzzle Race</div>
          <div className="sh-feed-meta">{event.finalScore}pts · {event.puzzlesSolved} solved · {event.accuracy}% acc · {ago}</div>
        </div>
      </div>
    );
  }
  if (event.type === 'timed_race') {
    return (
      <div className="sh-feed-event">
        <div className="sh-feed-icon">⏱️</div>
        <div className="sh-feed-body">
          <div className="sh-feed-text"><strong>{name}</strong> raced through <em>{event.topic}</em></div>
          <div className="sh-feed-meta">{event.finalScore}pts · {event.puzzlesSolved} solved · {event.accuracy}% acc · {ago}</div>
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
        {isLive  && <span className="sh-live-badge">🔴 LIVE</span>}
        {isLobby && <span className="sh-lobby-badge">🟡 Open</span>}
        {!isLive && !isLobby && startIn !== null && (
          <span className="sh-soon-badge">⏰ {startIn < 1 ? 'Starting…' : `in ${startIn}m`}</span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}> · {event.participantCount} players</span>
      </div>
      <button
        className="sh-btn-join"
        onClick={() => navigate('/arenatournament/join')}
      >
        {isLive || isLobby ? 'Join Now →' : 'View →'}
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
            🟢 Online Now
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>
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
                <span className="sh-online-name"><PlayerName displayName={f.displayName} username={f.username} /></span>
                <button
                  className="sh-btn-challenge"
                  title="Challenge to Puzzle Race"
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
              📰 Activity Stream
              {networkSize === 0 && (
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.3)', textTransform: 'none' }}>
                  (platform-wide · add friends to see their activity first)
                </span>
              )}
            </div>

            {events.length === 0 ? (
              <div className="sh-empty" style={{ padding: '32px 0' }}>
                <div className="sh-empty-icon">💤</div>
                <div className="sh-empty-text">
                  No activity yet.<br />
                  <button className="sh-btn-primary" style={{ marginTop: 14, fontSize: 13 }} onClick={() => navigate('/race')}>
                    Be the first — start a race!
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
                    Load more…
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
              <div className="sh-section-title" style={{ marginBottom: 14 }}>🎟️ Top Inviters</div>
              {topInviters.map((inv, i) => (
                <div key={inv._id} className="sh-lb-item">
                  <span className={`sh-lb-rank ${i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : ''}`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                  </span>
                  <span className="sh-lb-name">{inv.displayName || inv.username}</span>
                  <span className="sh-lb-score">{inv.inviteCount} {inv.inviteCount === 1 ? 'invite' : 'invites'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Live Events */}
          <div className="sh-card">
            <div className="sh-section-title" style={{ marginBottom: 14 }}>⚡ Live Events</div>
            {liveEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: '0 0 12px' }}>No live events right now.</p>
                <button className="sh-btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate('/arenatournament')}>
                  Browse Tournaments
                </button>
              </div>
            ) : (
              liveEvents.map(ev => <LiveEventCard key={ev._id} event={ev} />)
            )}
          </div>

          {/* Weekly leaderboard */}
          {weekLeaderboard.length > 0 && (
            <div className="sh-card">
              <div className="sh-section-title" style={{ marginBottom: 14 }}>🏆 Friends This Week</div>
              {weekLeaderboard.map((entry, i) => {
                const isMe = entry._id?.toString() === myId;
                return (
                  <div key={entry._id} className={`sh-lb-item${isMe ? ' sh-lb-me' : ''}`}>
                    <span className={`sh-lb-rank ${i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : ''}`}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </span>
                    <span className="sh-lb-name">{isMe ? 'You' : (entry.displayName || entry.username)}</span>
                    <span className="sh-lb-score">{entry.totalScore}pts</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nudge to add friends when none */}
          {networkSize === 0 && (
            <div className="sh-card" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>Add friends</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, lineHeight: 1.5 }}>
                See their races, challenge them, and compete on the weekly leaderboard.
              </div>
              <button className="sh-btn-primary" style={{ fontSize: 13 }} onClick={() => navigate('/friends')}>
                Find Friends →
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="sh-card">
            <div className="sh-section-title" style={{ marginBottom: 14 }}>🎯 Quick Start</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="sh-btn-primary"   onClick={() => navigate('/race')}>⚡ Puzzle Race</button>
              <button className="sh-btn-secondary" onClick={() => navigate('/timed-race')}>⏱️ Timed Race</button>
              <button className="sh-btn-secondary" onClick={() => navigate('/arenatournament/join')}>🏆 Join Tournament</button>
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

function LeaderRow({ rank, name, sub, score, scoreLabel, accent = 'cyan', showAvatar = true, user, avatarSize = 36 }) {
  return (
    <div className={`pl-row${rank === 1 ? ' pl-row-top' : ''}`}>
      <RankBadge rank={rank} />
      {showAvatar && <PlayerAvatar user={user} name={name} size={avatarSize} />}
      <div className="pl-row-info">
        <div className="pl-row-name" title={typeof name === 'string' ? name : undefined}>{name}</div>
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
          {live && <span className="pl-live">LIVE</span>}
        </div>
        {subtitle && <div className="pl-phead-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

function ArenaLeaderCol({ icon, title, rows, accent }) {
  return (
    <div className={`pl-arena pl-arena-${accent}`}>
      <div className="pl-arena-head">
        <span className="pl-arena-icon">{icon}</span>
        <span className="pl-arena-title">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="pl-empty">No tournaments this week</div>
      ) : (
        rows.map((r, i) => (
          <LeaderRow
            key={r._id || i}
            rank={i + 1}
            name={r.displayName || r.username || 'Player'}
            score={r.score}
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
  const [arena, setArena]     = useState({ standard: [], marathon: [], chess960: [] });
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
      api.get('/api/social/arena-weekly-leaders').then(r => r.data).catch(() => ({ standard: [], marathon: [], chess960: [] })),
    ]).then(([a, d, ar]) => {
      if (!alive) return;
      setActive(Array.isArray(a) ? a : []);
      setDaily(Array.isArray(d) ? d : []);
      setArena(ar || { standard: [], marathon: [], chess960: [] });
    }).finally(() => { if (alive) setLoading(false); });

    // Refresh daily-puzzle ratings every 20s for near real-time updates
    const id = setInterval(async () => {
      const d = await fetchDaily();
      if (alive && d) setDaily(d);
    }, 20000);

    return () => { alive = false; clearInterval(id); };
  }, [fetchDaily]);

  if (loading) return <div className="sh-empty"><div className="sh-spinner" /></div>;

  const { standard = [], marathon = [], chess960 = [] } = arena || {};

  return (
    <>
    {/* ── Player search ── */}
    <div className="pl-search-wrap">
      <input
        className="sh-search-input pl-search-input"
        type="text"
        placeholder="🔍 Search players by name or @username…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {search.trim().length >= 2 && (
        <div className="pl-search-results">
          {searching ? (
            <div className="pl-search-empty">Searching…</div>
          ) : results.length === 0 ? (
            <div className="pl-search-empty">No players found.</div>
          ) : (
            results.map(u => (
              <button key={u._id} className="pl-search-row" onClick={() => openProfile(u)}>
                <PlayerAvatar user={u} size={34} />
                <div className="pl-search-info">
                  <div className="pl-search-name" title={u.displayName || u.username}>
                    {u.displayName || u.username}
                  </div>
                  <div className="pl-search-handle">@{u.username}</div>
                </div>
                <span className="pl-search-go">View →</span>
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
            <div className="pl-phead-title">Most Active</div>
            <div className="pl-phead-sub">Busiest players this week</div>
          </div>
        </div>

        {active.length === 0 ? (
          <div className="pl-empty" style={{ padding: '28px 0' }}>No activity yet this week.</div>
        ) : (
          <div className="pl-active-list">
            {active.map((u, i) => (
              <div key={u._id || i} className={`pl-active-row${i === 0 ? ' pl-active-top' : ''}`}>
                <span className="pl-active-rank">{i + 1}</span>
                <PlayerAvatar user={u} size={40} online={u.isOnline} />
                <div className="pl-row-info">
                  <div className="pl-row-name" title={u.displayName || u.username || ''}>
                    <PlayerName displayName={u.displayName} username={u.username} />
                  </div>
                  <div className="pl-active-meta">
                    {u.isOnline
                      ? <span className="pl-online-tag">● online</span>
                      : <span>this week</span>}
                  </div>
                </div>
                <div className="pl-active-count">
                  <span className="pl-active-count-n">{u.activityCount}</span>
                  <span className="pl-active-count-l">actions</span>
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
            title="Top Puzzle Solvers"
            subtitle="Highest-rated real players · updates live"
            live
            accent="cyan"
          />
          {daily.length === 0 ? (
            <div className="pl-empty">No solvers yet.</div>
          ) : (
            <div className="pl-lb pl-lb-split">
              <div className="pl-lb-col">
                {daily.slice(0, 5).map((u, i) => (
                  <LeaderRow
                    key={u.username || i}
                    rank={u.rank || i + 1}
                    name={u.displayName || u.username}
                    sub={u.todayDelta ? `▲ +${u.todayDelta} today` : 'puzzle rating'}
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
                    sub={u.todayDelta ? `▲ +${u.todayDelta} today` : 'puzzle rating'}
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
          <PanelHead icon="🏁" title="Best Racers" subtitle="Top scores across race formats" accent="emerald" />
          <div className="pl-racers-wrap">
            <BestRacers compact />
          </div>
        </section>

        {/* Best Arena Players This Week */}
        <section className="pl-panel pl-panel-violet">
          <PanelHead
            icon="🏆"
            title="Best Arena Players — This Week"
            subtitle="Each player's single best tournament result in the last 7 days"
            accent="violet"
          />
          <div className="pl-arena-grid">
            <ArenaLeaderCol icon="⚔️" title="Standard Arena"        rows={standard} accent="cyan" />
            <ArenaLeaderCol icon="💥" title="Bullet Blitz Marathon" rows={marathon} accent="amber" />
            <ArenaLeaderCol icon="♟️" title="Chess 960"             rows={chess960} accent="violet" />
          </div>
        </section>

        <div className="pl-cta">
          <button className="pl-cta-btn" onClick={() => navigate('/arenatournament')}>🏆 Browse Tournaments</button>
          <button className="pl-cta-btn" onClick={() => navigate('/race')}>⚡ Start a Race</button>
        </div>

      </main>
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
          <div className="sh-lb-title">🏆 Top Inviters</div>
          {leaderboard.slice(0, 25).map((entry, i) => {
            const rankCls = i === 0 ? 'sh-lb-rank-gold' : i === 1 ? 'sh-lb-rank-silver' : i === 2 ? 'sh-lb-rank-bronze' : '';
            const isMe    = entry.username === user?.username;
            return (
              <div key={entry._id || i} className={`sh-lb-item${isMe ? ' sh-lb-me' : ''}`}>
                <span className={`sh-lb-rank ${rankCls}`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </span>
                <span className="sh-lb-name">
                  {entry.displayName || entry.username}{isMe ? ' (you)' : ''}
                </span>
                <span className="sh-lb-score">{entry.activeReferrals}</span>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', margin: 0 }}>
              No entries yet
            </p>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="sh-invite-main">

        {/* Referral Link */}
        <div className="sh-card">
          <div className="sh-section-title">Your Invite Link</div>
          <div className="sh-ref-box">
            <span className="sh-ref-link">{myData?.referralLink || '—'}</span>
            <button className="sh-btn-primary" onClick={copyLink}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Share this link — when someone signs up through it and becomes active, you earn rewards.
          </p>
        </div>

        {/* Stats */}
        <div className="sh-stat-grid">
          <div className="sh-stat-card">
            <div className="sh-stat-value">{total}</div>
            <div className="sh-stat-label">Total Invited</div>
          </div>
          <div className="sh-stat-card">
            <div className="sh-stat-value" style={{ color: '#10b981' }}>{active}</div>
            <div className="sh-stat-label">Active</div>
          </div>
          <div className="sh-stat-card">
            <div className="sh-stat-value" style={{ color: '#a855f7' }}>{quality}</div>
            <div className="sh-stat-label">Quality Score</div>
          </div>
        </div>

        {/* Mentor Tier */}
        <div className="sh-card">
          <div className="sh-section-title">Mentor Status</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className={`sh-tier-badge ${tierMeta.cls}`}>{tierMeta.label}</span>
            {nextMentorAt && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                {active} / {nextMentorAt} active
              </span>
            )}
          </div>
          {nextMentorAt ? (
            <div className="sh-progress-track">
              <div className="sh-progress-fill" style={{ width: `${mentorPct}%` }} />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#10b981', margin: 0 }}>Maximum tier reached! 🌟</p>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)', flexWrap: 'wrap' }}>
            <span>⭐ Mentor → 5 active invites</span>
            <span>🌟 Ambassador → 25 active invites</span>
          </div>
        </div>

        {/* Avatar Tier */}
        <div className="sh-card">
          <div className="sh-section-title">Avatar Unlocks</div>
          {/* Progress counter */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: avatarMeta.color }}>{avatarMeta.label}</span>
              {nextAvatarAt && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {total} / {nextAvatarAt} invited
                </span>
              )}
            </div>
            {nextAvatarAt ? (
              <div className="sh-progress-track">
                <div className="sh-progress-fill" style={{ width: `${avatarPct}%`, background: 'linear-gradient(90deg,#a855f7,#06b6d4)' }} />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#a855f7', margin: 0 }}>All avatar tiers unlocked! 🎭</p>
            )}
          </div>
          {/* Tier list */}
          {[
            { need: 0,  icon: '🔒', label: 'No unlock yet',   color: 'rgba(255,255,255,0.3)',  tier: 'none'   },
            { need: 5,  icon: '🖼️', label: 'Basic',           color: '#06b6d4',                tier: 'basic'  },
            { need: 15, icon: '📷', label: 'Custom Photo',    color: '#10b981',                tier: 'custom' },
            { need: 45, icon: '🎭', label: '3D Model',        color: '#a855f7',                tier: '3d'     },
          ].map(({ need, icon, label, color, tier }) => {
            const unlocked = tier === 'none' ? avatarTier === 'none' : total >= need;
            const isCurrent = avatarTier === tier;
            return (
              <div key={tier} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                background: isCurrent ? 'rgba(168,85,247,0.1)' : 'transparent',
                border: isCurrent ? '1px solid rgba(168,85,247,0.25)' : '1px solid transparent',
                opacity: (!unlocked && tier !== 'none') ? 0.45 : 1,
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: unlocked ? color : 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </div>
                  {need > 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                      {need} invited {unlocked && tier !== 'none' ? '✓' : ''}
                    </div>
                  )}
                </div>
                {isCurrent && <span style={{ fontSize: 11, color, fontWeight: 700 }}>Current</span>}
              </div>
            );
          })}
        </div>

        {/* Invited list */}
        <div className="sh-card">
          <div className="sh-section-title">People You Invited ({invites.length})</div>
          {invites.length === 0 ? (
            <div className="sh-empty" style={{ padding: '28px 0' }}>
              <div className="sh-empty-icon">📬</div>
              <div className="sh-empty-text">No one yet — share your link!</div>
            </div>
          ) : (
            invites.map((inv, i) => (
              <div key={inv.id || i} className="sh-invite-item">
                <div className="sh-avatar sh-avatar-sm">{initials(inv.user?.displayName || inv.user?.username || 'User')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{inv.user?.displayName || inv.user?.username || 'Deleted User'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{inv.user?.username || 'unknown'}</div>
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
          <div className="sh-section-title">How It Works</div>
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
    } catch (err) { alert(err.response?.data?.message || 'Failed to send request'); }
  };

  const acceptRequest = async (id) => {
    try { await api.post(`/api/friends/accept/${id}`); await fetchFriends(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const declineRequest = async (id) => {
    try { await api.post(`/api/friends/decline/${id}`); setRequests(p => p.filter(r => r.friendshipId !== id)); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const unfriend = async (id) => {
    if (!window.confirm('Remove this friend?')) return;
    try { await api.delete(`/api/friends/${id}`); setFriends(p => p.filter(f => f.friendshipId !== id)); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
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
            <div className="sh-empty-text">No friends yet.<br />Use "Find People" to add friends!</div>
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
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {f.user?.displayName || f.user?.username}
                    {isOnline && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 500 }}>● online</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{f.user?.username}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="sh-btn-challenge"
                    title="Play a private game with this friend"
                    onClick={() => navigate('/games?friend=1')}
                  >🔥 Play</button>
                  <button
                    className="sh-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    title="Open chat"
                    onClick={() => navigate(`/social/chat?userId=${f.user?._id}`)}
                  >💬 Chat</button>
                  <button className="sh-btn-danger" onClick={() => unfriend(f.friendshipId)}>Unfriend</button>
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
            <div className="sh-empty-text">No pending friend requests.</div>
          </div>
        ) : (
          requests.map(r => (
            <div key={r.friendshipId} className="sh-friend-item">
              <div className="sh-avatar">
                <UserAvatar user={r.user} size={42} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>{r.user?.displayName || r.user?.username}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{r.user?.username}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="sh-btn-accept"  onClick={() => acceptRequest(r.friendshipId)}>Accept</button>
                <button className="sh-btn-decline" onClick={() => declineRequest(r.friendshipId)}>Decline</button>
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
            placeholder="Search by username or display name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sh-search-input"
            style={{ marginBottom: 16 }}
            autoFocus
          />
          {search.trim().length > 0 && search.trim().length < 2 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 0 }}>Type at least 2 characters…</p>
          )}
          {results.map(u => {
            const st = statusMap[u._id];
            return (
              <div key={u._id} className="sh-friend-item">
                <div className="sh-avatar">
                  <UserAvatar user={u} size={42} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>{u.displayName || 'Player'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{u.friendCount || 0} friends</div>
                </div>
                {!st || st.status === 'none' ? (
                  <button className="sh-btn-primary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => sendRequest(u._id)}>+ Add</button>
                ) : st.status === 'accepted' ? (
                  <span className="sh-chip-friend">✓ Friends</span>
                ) : st.status === 'pending' ? (
                  <span className="sh-chip-pending">{st.iAmRequester ? 'Sent' : 'Respond ↑'}</span>
                ) : null}
              </div>
            );
          })}
          {search.trim().length >= 2 && results.length === 0 && (
            <div className="sh-empty" style={{ padding: '24px 0' }}>
              <div className="sh-empty-text">No users found.</div>
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
    } catch (err) { alert(err.response?.data?.message || 'Failed to create club'); }
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
    } catch (err) { alert(err.response?.data?.message || 'Invalid join code'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search clubs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sh-search-input"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button className="sh-btn-secondary" onClick={() => setShowJoin(true)}>🔑 Join with Code</button>
        <button className="sh-btn-primary"   onClick={() => setShowCreate(true)}>+ Create Club</button>
      </div>

      {/* My Clubs */}
      {myClubs.length > 0 && (
        <>
          <div className="sh-section-title" style={{ marginBottom: 14 }}>My Clubs</div>
          <div className="sh-clubs-grid" style={{ marginBottom: 30 }}>
            {myClubs.map(c => (
              <div key={c._id} className="sh-club-card sh-club-card-mine" onClick={() => navigate(`/clubs/${c._id}`)}>
                <div className="sh-club-name">{c.name}</div>
                <div className="sh-club-desc">{c.description || 'No description'}</div>
                <div className="sh-club-meta">👥 {c.memberCount} members</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Browse */}
      <div className="sh-section-title" style={{ marginBottom: 14 }}>
        Browse Clubs&nbsp;
        {total > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({total})</span>}
      </div>

      {loading ? (
        <div className="sh-empty"><div className="sh-spinner" /></div>
      ) : clubs.length === 0 ? (
        <div className="sh-empty">
          <div className="sh-empty-icon">🏰</div>
          <div className="sh-empty-text">
            No clubs found.<br />
            <button className="sh-btn-secondary" style={{ marginTop: 14, fontSize: 13 }} onClick={() => setShowCreate(true)}>
              Create the first one!
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
                  {c.isMember && <span className="sh-chip-member">✓ Member</span>}
                </div>
                <div className="sh-club-desc">{c.description || 'No description'}</div>
                <div className="sh-club-meta">👥 {c.memberCount} members</div>
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
            <div className="sh-modal-title">Create a Club</div>
            <div className="sh-modal-subtitle">Give your club a name and an optional description.</div>
            <form onSubmit={createClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Club name *"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="sh-input-field"
                required
                maxLength={50}
              />
              <textarea
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                className="sh-input-field"
                style={{ height: 90, resize: 'vertical' }}
                maxLength={300}
              />
              {/* Visibility */}
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Visibility</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: false }))}
                    style={{
                      padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: !createForm.isPrivate ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                      border: !createForm.isPrivate ? '2px solid rgba(34,197,94,0.45)' : '2px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>🌍</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: !createForm.isPrivate ? '#4ade80' : '#94a3b8' }}>Public</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.4 }}>Anyone can find &amp; join</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, isPrivate: true }))}
                    style={{
                      padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: createForm.isPrivate ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: createForm.isPrivate ? '2px solid rgba(139,92,246,0.45)' : '2px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: createForm.isPrivate ? '#a78bfa' : '#94a3b8' }}>Private</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, lineHeight: 1.4 }}>Invite link only</div>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="sh-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit"  className="sh-btn-primary"  disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Club'}
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
            <div className="sh-modal-title">Join with Code</div>
            <div className="sh-modal-subtitle">Enter the 8-character code shared by a club member.</div>
            <form onSubmit={joinClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="JOIN CODE"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="sh-input-field"
                style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                required
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="sh-btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit"  className="sh-btn-primary"  disabled={submitting}>
                  {submitting ? 'Joining…' : 'Join Club'}
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

  const activeTab = pathname.startsWith('/social/chat') ? 'chat'
                  : pathname.startsWith('/players')   ? 'players'
                  : pathname.startsWith('/friends')   ? 'friends'
                  : pathname.startsWith('/clubs')   ? 'clubs'
                  : pathname.startsWith('/invite')  ? 'invite'
                  : 'players'; // /social and default

  const TABS = [
    { id: 'players', label: '👤 Players',           path: '/players' },
    { id: 'invite',  label: '🔓 Invite to Unlock', path: '/invite'  },
    { id: 'friends', label: '👥 Friends',           path: '/friends' },
    { id: 'clubs',   label: '🏰 Clubs',             path: '/clubs'   },
  ];

  const subtitles = {
    chat:    'Read messages, reply fast, and keep conversations inside Social Hub',
    players: 'See who\'s most active and the best players across the app',
    friends: 'Add friends, accept requests, challenge them to races',
    clubs:   'Create and join clubs to connect with your group',
    invite:  'Invite players to unlock exclusive features and earn recognition',
  };

  if (isGuest) {
    return (
      <div className="sh-page">
        <div className="sh-header">
          <div>
            <h1 className="sh-title">Social Hub</h1>
            <p className="sh-subtitle">Connect, chat, and compete with friends</p>
          </div>
        </div>

        <div className="sh-guest-lock">
          <div className="sh-guest-lock-icon">🔒</div>
          <h2 className="sh-guest-lock-title">Login to Access Social Hub</h2>
          <p className="sh-guest-lock-desc">Create a free account to unlock all social features:</p>
          <div className="sh-guest-lock-features">
            <div className="sh-guest-lock-feature">
              <span className="sh-guest-lock-feature-icon">📩</span>
              <span>Invite friends &amp; earn rewards</span>
            </div>
            <div className="sh-guest-lock-feature">
              <span className="sh-guest-lock-feature-icon">👥</span>
              <span>Add friends &amp; challenge them to races</span>
            </div>
            <div className="sh-guest-lock-feature">
              <span className="sh-guest-lock-feature-icon">💬</span>
              <span>Chat with friends in real time</span>
            </div>
            <div className="sh-guest-lock-feature">
              <span className="sh-guest-lock-feature-icon">🏰</span>
              <span>Create and join clubs</span>
            </div>
          </div>
          <button
            className="sh-guest-lock-btn"
            onClick={() => navigate('/login', { state: { message: 'Please log in to access Social Hub.' } })}
          >
            Log In / Sign Up — It's Free
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-page">

      {/* Header */}
      <div className="sh-header">
        <div>
          <h1 className="sh-title">Social Hub</h1>
          <p className="sh-subtitle">{subtitles[activeTab]}</p>
        </div>
        <button
          type="button"
          className={`sh-chat-launch${activeTab === 'chat' ? ' sh-chat-launch-active' : ''}`}
          onClick={() => navigate('/social/chat')}
        >
          <span>💬 Chat</span>
          {unreadCount > 0 && <span className="sh-chat-launch-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Top-level Tabs */}
      <div className="sh-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sh-tab${activeTab === t.id ? ' sh-tab-active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'players' && <PlayersTab />}
      {activeTab === 'invite'  && <InviteTab  user={user} />}
      {activeTab === 'friends' && <FriendsTab />}
      {activeTab === 'clubs'   && <ClubsTab   />}
      {activeTab === 'chat'    && <Chat />}

      <AboutFeatureCTA
        links={[{ label: "About Social Hub", to: "/chess-community" }]}
      />
    </div>
  );
}
