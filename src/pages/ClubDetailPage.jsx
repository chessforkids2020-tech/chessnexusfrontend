// src/pages/ClubDetailPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket-jwt';
import api, { resolveApiAssetUrl } from '../api';
import './SocialHubPage.css';

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name) { return (name || '?')[0].toUpperCase(); }
function containsBlockedLink(text) {
  if (!text) return false;
  return /(?:https?:\/\/|www\.|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+(?:\/\S*)?)/i.test(text);
}
function avatarView(user) {
  const image = user?.profilePhotoUrl || user?.activeAvatarUrl;
  if (image) return { kind: 'image', src: resolveApiAssetUrl(image) };
  if (user?.activeLego) return { kind: 'emoji', value: '🧱' };
  if (user?.active3dModel) return { kind: 'emoji', value: '🌌' };
  return { kind: 'initial', value: initials(user?.displayName || user?.username) };
}
function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(target, nowMs) {
  if (!target) return '';
  const targetMs = new Date(target).getTime();
  const diff = targetMs - nowMs;
  if (diff <= 0) return '00:00:00';

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── ClubChat ────────────────────────────────────────────────────────────────
function ClubChat({ chatId, currentUser }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);
  const didInitialScroll          = useRef(false);

  const myId = currentUser?._id?.toString() || currentUser?.id?.toString();

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    didInitialScroll.current = false;
    setLoadingHistory(true);
    api.get(`/api/chat/${chatId}/messages?limit=60`)
      .then(r => setMessages(r.data))
      .catch(err => console.error('Club chat load error:', err))
      .finally(() => setLoadingHistory(false));
    api.put(`/api/chat/${chatId}/read`).catch(() => {});
  }, [chatId]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    if (!socket.connected) {
      socket.auth = { token: localStorage.getItem('authToken') };
      socket.connect();
    }
    socket.emit('join_chat', chatId);

    const handleMessage = (msg) => {
      if (msg.chatId?.toString() !== chatId.toString()) return;
      setMessages(prev => {
        if (prev.some(m => m._id?.toString() === msg._id?.toString())) return prev;
        return [...prev, msg];
      });
      api.put(`/api/chat/${chatId}/read`).catch(() => {});
    };

    socket.on('receive_message', handleMessage);
    return () => {
      socket.off('receive_message', handleMessage);
      socket.emit('leave_chat', chatId);
    };
  }, [chatId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  // First load (history): jump straight to the newest message — no visible
  // top-to-bottom scroll through the whole backlog. New incoming messages
  // animate smoothly.
  useEffect(() => {
    if (messages.length === 0) return;
    if (!didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      didInitialScroll.current = true;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || containsBlockedLink(text)) return;
    setSending(true);
    setInput('');
    try {
      await api.post(`/api/chat/${chatId}/messages`, { content: text });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const hasBlockedLink = containsBlockedLink(input);

  return (
    <div className="sh-club-chat">
      <div className="sh-club-chat-header">
        💬 Club Chat
        <span className="sh-club-chat-hint">members only · Enter to send</span>
      </div>

      <div className="sh-club-chat-messages">
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="sh-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="sh-club-chat-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div>No messages yet. Say hello!</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
            const isMe = senderId === myId;
            const senderName = msg.sender?.displayName || msg.sender?.username || 'Unknown';
            const prevSenderId = i > 0 ? (messages[i-1]?.sender?._id?.toString() || messages[i-1]?.sender?.toString()) : null;
            const showName = !isMe && senderId !== prevSenderId;
            return (
              <div key={msg._id || i} className={`sh-msg-row${isMe ? ' sh-msg-row-me' : ''}`}>
                {!isMe && (
                  <div className="sh-msg-avatar">
                    {avatarView(msg.sender).kind === 'image' ? (
                      <img src={avatarView(msg.sender).src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      avatarView(msg.sender).value
                    )}
                  </div>
                )}
                <div className="sh-msg-bubble-wrap">
                  {showName && <div className="sh-msg-name">{senderName}</div>}
                  <div className={`sh-msg-bubble${isMe ? ' sh-msg-bubble-me' : ''}`}>
                    {msg.content}
                  </div>
                  <div className={`sh-msg-time${isMe ? ' sh-msg-time-me' : ''}`}>
                    {fmtTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="sh-club-chat-input-row" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          type="text"
          className="sh-club-chat-input"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={1000}
          autoComplete="off"
        />
        <button
          type="submit"
          className="sh-club-chat-send"
          disabled={!input.trim() || sending || hasBlockedLink}
        >
          {sending ? '…' : '➤'}
        </button>
      </form>
      {hasBlockedLink && (
        <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
          Links are not allowed in chat messages.
        </div>
      )}
    </div>
  );
}

// ─── ClubDetailPage ───────────────────────────────────────────────────────────
export default function ClubDetailPage() {
  const { clubId }   = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const [club, setClub]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const featuredTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [memberPage, setMemberPage] = useState(1);

  const fetchClub = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/clubs/${clubId}`);
      setClub(res.data);
    } catch (err) {
      if (err.response?.status === 404) navigate('/clubs');
    } finally { setLoading(false); }
  }, [clubId, navigate]);

  useEffect(() => { fetchClub(); }, [fetchClub]);

  const fetchActivities = useCallback(async () => {
    if (!clubId) return;
    setActivitiesLoading(true);
    try {
      const res = await api.get(`/api/clubs/${clubId}/activities`);
      setActivities(Array.isArray(res.data?.activities) ? res.data.activities : []);
    } catch (err) {
      if (err.response?.status !== 403 && err.response?.status !== 404) {
        console.error('Load club activities error:', err);
      }
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!club?.isMember) {
      setActivities([]);
      return;
    }

    fetchActivities();
    const poll = setInterval(fetchActivities, 30000);
    return () => clearInterval(poll);
  }, [club?.isMember, fetchActivities]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setMemberPage(1);
  }, [club?.members?.length]);

  const updateFeaturedScrollState = useCallback(() => {
    const el = featuredTrackRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(updateFeaturedScrollState);
    const handleResize = () => updateFeaturedScrollState();
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activities, activitiesLoading, updateFeaturedScrollState]);

  const scrollFeatured = (direction) => {
    const el = featuredTrackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.floor(el.clientWidth * 0.7));
    const left = direction === 'left' ? el.scrollLeft - step : el.scrollLeft + step;
    el.scrollTo({ left, behavior: 'smooth' });
    window.setTimeout(updateFeaturedScrollState, 260);
  };

  const myId    = user?._id?.toString() || user?.id?.toString();
  const isMember = club?.isMember;
  const isOwner  = club?.members?.some(m => m.userId?.toString() === myId && m.role === 'owner');
  const members = Array.isArray(club?.members) ? club.members : [];
  const membersPerPage = 10;
  const totalMemberPages = Math.max(1, Math.ceil(members.length / membersPerPage));
  const currentMemberPage = Math.min(memberPage, totalMemberPages);
  const pagedMembers = members.slice((currentMemberPage - 1) * membersPerPage, currentMemberPage * membersPerPage);

  const joinByCode = async (overrideCode) => {
    const code = overrideCode || club?.joinCode;
    if (!code) return;
    setJoining(true);
    try { await api.post('/api/clubs/join', { joinCode: code }); await fetchClub(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to join'); }
    finally { setJoining(false); }
  };

  const leaveClub = async () => {
    if (!window.confirm('Leave this club?')) return;
    setLeaving(true);
    try { await api.post(`/api/clubs/${clubId}/leave`); navigate('/clubs'); }
    catch (err) { alert(err.response?.data?.message || 'Failed to leave'); }
    finally { setLeaving(false); }
  };

  const deleteClub = async () => {
    if (!window.confirm('Permanently delete this club? This cannot be undone.')) return;
    try { await api.delete(`/api/clubs/${clubId}`); navigate('/clubs'); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const copyCode = async () => {
    if (!club?.joinCode) return;
    await navigator.clipboard.writeText(club.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/clubs?code=${club.joinCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="sh-detail-page">
      <div className="sh-spinner" style={{ margin: '80px auto', display: 'block' }} />
    </div>
  );
  if (!club) return null;

  return (
    <div className="sh-detail-page">

      <button className="sh-back-btn" onClick={() => navigate('/clubs')}>
        ← Back to Clubs
      </button>

      {/* Header */}
      <div className="sh-detail-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 className="sh-detail-title" style={{ margin: 0 }}>🏰 {club.name}</h1>
            {club.isPrivate
              ? <span className="sh-privacy-badge sh-privacy-private">🔒 Private</span>
              : <span className="sh-privacy-badge sh-privacy-public">🌍 Public</span>}
          </div>
          {club.description && <p className="sh-detail-desc">{club.description}</p>}
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>👥 {club.memberCount} members</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {!isMember && !club.isPrivate && (
            <button className="sh-btn-primary" onClick={() => joinByCode()} disabled={joining}>
              {joining ? 'Joining…' : '+ Join Club'}
            </button>
          )}
          {isMember && !isOwner && (
            <button className="sh-btn-secondary" onClick={leaveClub} disabled={leaving}>
              {leaving ? 'Leaving…' : 'Leave Club'}
            </button>
          )}
          {isOwner && (
            <button className="sh-btn-danger" onClick={deleteClub}>🗑 Delete Club</button>
          )}
        </div>
      </div>

      {isMember && (
        <div className="sh-card sh-featured-activities-card sh-featured-activities-fullwidth">
          <div className="sh-section-title">Featured Club Events</div>

          {activitiesLoading ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div className="sh-spinner" style={{ margin: '10px auto', width: 28, height: 28, borderWidth: 3 }} />
            </div>
          ) : activities.length === 0 ? (
            <div className="sh-club-activity-empty" style={{ marginTop: 4 }}>
              No featured events yet.
            </div>
          ) : (
            <div className="sh-featured-rail-wrap">
              <button
                type="button"
                className="sh-featured-nav-btn sh-featured-nav-btn-left"
                onClick={() => scrollFeatured('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll featured events left"
              >
                ←
              </button>

              <div
                className="sh-featured-activities-track"
                ref={featuredTrackRef}
                onScroll={updateFeaturedScrollState}
              >
                {activities.map((activity) => {
                  const statusLabel = activity.status === 'active'
                    ? 'LIVE'
                    : activity.status === 'lobby'
                      ? 'OPEN'
                      : activity.status === 'scheduled'
                        ? 'SCHEDULED'
                        : 'WAITING';

                  const countdown = activity.countdownTarget
                    ? formatCountdown(activity.countdownTarget, nowMs)
                    : null;

                  const featuredCardClass = [
                    'sh-featured-activity-card',
                    activity.kind === 'arena_tournament' ? 'sh-featured-activity-tournament' : 'sh-featured-activity-race',
                    activity.status === 'active' ? 'sh-featured-activity-live' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <button
                      key={`featured-${activity.id}`}
                      type="button"
                      className={featuredCardClass}
                      onClick={() => navigate(activity.deepLink)}
                    >
                      <div className="sh-featured-activity-head">
                        <span className="sh-featured-activity-icon">
                          {activity.kind === 'arena_tournament' ? '🏆' : '⚡'}
                        </span>
                        <span className={`sh-club-activity-status sh-club-activity-status-${activity.status || 'waiting'}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="sh-featured-activity-title">{activity.title}</div>
                      <div className="sh-featured-activity-subtitle">{activity.subtitle}</div>

                      {countdown ? (
                        <div className="sh-featured-activity-countdown">
                          {activity.countdownType === 'starts_in' ? `Starts in ${countdown}` : `Ends in ${countdown}`}
                        </div>
                      ) : (
                        <div className="sh-featured-activity-time">{fmtTime(activity.createdAt)}</div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="sh-featured-nav-btn sh-featured-nav-btn-right"
                onClick={() => scrollFeatured('right')}
                disabled={!canScrollRight}
                aria-label="Scroll featured events right"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="sh-club-detail-cols">

        {/* Left: invite + members */}
        <div className="sh-club-detail-left">

          {isMember && (
            <div className="sh-card">
              <div className="sh-section-title">Invite Others</div>
              {club.isPrivate ? (
                // Private club: share invite link
                <>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 14px', lineHeight: 1.6 }}>
                    This is a <strong style={{ color: '#f87171' }}>private club</strong>. Share the invite link — only people with it can find and join.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {showCode ? (
                      <>
                        <span className="sh-code-display" style={{ fontSize: 11, letterSpacing: 0, userSelect: 'all' }}>
                          {`${window.location.origin}/clubs?code=${club.joinCode}`}
                        </span>
                        <button className="sh-btn-primary" onClick={copyInviteLink}>
                          {copied ? '✓ Copied!' : '🔗 Copy Link'}
                        </button>
                      </>
                    ) : (
                      <button className="sh-btn-secondary" onClick={() => setShowCode(true)}>
                        🔗 Get Invite Link
                      </button>
                    )}
                  </div>
                </>
              ) : (
                // Public club: share join code
                <>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 14px' }}>
                    Share this code — anyone with it can join.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {showCode ? (
                      <>
                        <span className="sh-code-display">{club.joinCode}</span>
                        <button className="sh-btn-primary" onClick={copyCode}>
                          {copied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                      </>
                    ) : (
                      <button className="sh-btn-secondary" onClick={() => setShowCode(true)}>
                        🔑 Reveal Join Code
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="sh-card">
            <div className="sh-section-title">Members ({club.memberCount})</div>
            {pagedMembers.map(m => (
              <div key={m.userId} className="sh-member-row">
                <div className="sh-avatar">
                  {avatarView(m).kind === 'image' ? (
                    <img src={avatarView(m).src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    avatarView(m).value
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
                    {m.displayName || m.username}
                  </div>
                </div>
                {m.role === 'owner' && <span className="sh-owner-badge">Owner</span>}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}

            {totalMemberPages > 1 && (
              <div className="sh-members-pagination">
                <button
                  type="button"
                  className="sh-members-page-btn"
                  disabled={currentMemberPage === 1}
                  onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="sh-members-page-indicator">Page {currentMemberPage} / {totalMemberPages}</span>
                <button
                  type="button"
                  className="sh-members-page-btn"
                  disabled={currentMemberPage === totalMemberPages}
                  onClick={() => setMemberPage((p) => Math.min(totalMemberPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right: chat */}
        <div className="sh-club-detail-right">
          {isMember && (
            <div className="sh-card" style={{ marginBottom: 14 }}>
              <div className="sh-section-title" style={{ marginBottom: 14 }}>⚡ Create Club Activity</div>

              <div className="sh-club-activity-actions">
                <button className="sh-btn-secondary" onClick={() => navigate(`/arena/create?clubId=${clubId}`)}>
                  + Create Arena Race
                </button>
                <button className="sh-btn-primary" onClick={() => navigate(`/arenatournament/create?clubId=${clubId}`)}>
                  + Create Arena Tournament
                </button>
              </div>

              <div className="sh-club-activity-empty" style={{ marginTop: 2 }}>
                Create a race or tournament for your club. Featured events are shown above.
              </div>
            </div>
          )}

          {isMember && club.chatId ? (
            <ClubChat chatId={club.chatId} currentUser={user} />
          ) : !isMember && club.isPrivate ? (
            // Private club — non-member: show code entry
            <div className="sh-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>Private Club</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 1.6 }}>
                You need an invite link to join this club.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter invite code…"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '9px 14px', color: '#fff', fontSize: 13,
                    fontFamily: 'monospace', letterSpacing: 2, outline: 'none'
                  }}
                  maxLength={12}
                />
                <button
                  className="sh-btn-primary"
                  onClick={() => joinByCode(codeInput.trim())}
                  disabled={!codeInput.trim() || joining}
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </div>
            </div>
          ) : !isMember ? (
            // Public club — non-member: locked chat
            <div className="sh-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>Members Only Chat</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 1.6 }}>
                Join the club to chat with its members.
              </div>
              <button className="sh-btn-primary" onClick={() => joinByCode()} disabled={joining}>
                {joining ? 'Joining…' : '+ Join Club'}
              </button>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
