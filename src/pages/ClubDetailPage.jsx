// src/pages/ClubDetailPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket-jwt';
import api, { resolveApiAssetUrl } from '../api';
// Club pictures are stored as a RELATIVE path by the upload route, which only
// resolves when the app and API share an origin (localhost). In production they
// are different hosts, so these must be resolved against the API base.
import UserAvatar from '../components/UserAvatar';
import PlayerName from '../components/PlayerName';
// Same rich-text pair the coach profile uses: CoachRichText to author, CoachProse
// to render. Reused rather than duplicated so the club "about" gets the identical
// link-stripping treatment (see backend/helpers/coachRichText.js).
import CoachRichText from '../components/CoachRichText';
import CoachProse from '../components/CoachProse';
import { linkify } from '../utils/linkify';
import './SocialHubPage.css';

// ─── helpers ─────────────────────────────────────────────────────────────────
// Club chats allow ONLY chessnexus.in / 3darena.chessnexus.in links. This mirrors
// the server rule (utils/chatModeration.js) so the user gets instant feedback.
const CLUB_ALLOWED_HOSTS = ['chessnexus.in', '3darena.chessnexus.in'];
const LINK_RE = /(?:https?:\/\/|www\.|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+(?:\/\S*)?)/gi;
function containsDisallowedClubLink(text) {
  if (!text) return false;
  const matches = text.match(LINK_RE);
  if (!matches) return false;
  return matches.some((tok) => {
    const host = tok.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0].toLowerCase();
    if (!host) return false; // scheme-only fragment (e.g. "https://") — ignore
    return !CLUB_ALLOWED_HOSTS.some((a) => host === a || host.endsWith('.' + a));
  });
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
    if (!text || sending || containsDisallowedClubLink(text)) return;
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

  const hasDisallowedLink = containsDisallowedClubLink(input);

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
                    <UserAvatar user={msg.sender} size={28} />
                  </div>
                )}
                <div className="sh-msg-bubble-wrap">
                  {showName && <div className="sh-msg-name">{senderName}</div>}
                  <div className={`sh-msg-bubble${isMe ? ' sh-msg-bubble-me' : ''}`}>
                    {linkify(msg.content)}
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
          disabled={!input.trim() || sending || hasDisallowedLink}
        >
          {sending ? '…' : '➤'}
        </button>
      </form>
      {hasDisallowedLink && (
        <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 6 }}>
          Only chessnexus.in links are allowed in club chats.
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
  // Members moved out of the left column into a strip above Featured Events,
  // with the full list behind a searchable modal (Facebook-group style).
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  // Owner's club-page editor.
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  // Club picture upload. Separate from the edit form's save button: the picture
  // is a file on the server and takes effect the moment it is chosen.
  const [picBusy, setPicBusy] = useState(false);
  const [picError, setPicError] = useState('');

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

  // The strip shows a row of faces; the rest live behind "Show all".
  const STRIP_LIMIT = 18;
  const stripMembers = members.slice(0, STRIP_LIMIT);

  // Search inside the modal — matches display name OR username, so a member is
  // findable by whichever one the viewer knows them by.
  const filteredMembers = (() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.displayName || '').toLowerCase().includes(q) ||
      (m.username || '').toLowerCase().includes(q));
  })();
  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / membersPerPage));
  const currentMemberPage = Math.min(memberPage, totalMemberPages);
  const pagedMembers = filteredMembers.slice(
    (currentMemberPage - 1) * membersPerPage, currentMemberPage * membersPerPage);

  const openEdit = () => {
    setEditForm({
      name: club?.name || '',
      description: club?.description || '',
      about: club?.about || '',
      imageUrl: club?.imageUrl || '',
      isPrivate: !!club?.isPrivate,
    });
    setEditError('');
    setEditing(true);
  };

  const CLUB_PIC_MAX_BYTES = 2 * 1024 * 1024;   // mirrors the server's limit

  const onPictureFile = async (e) => {
    const file = e.target.files?.[0];
    // Reset immediately so picking the SAME file twice still fires onChange.
    e.target.value = '';
    if (!file) return;

    setPicError('');
    // Checked here too, so an owner on a slow connection is told straight away
    // rather than after uploading a file the server will reject.
    if (file.size > CLUB_PIC_MAX_BYTES) {
      setPicError('That picture is over 2 MB. Please choose a smaller one.');
      return;
    }

    setPicBusy(true);
    try {
      const fd = new FormData();
      fd.append('picture', file);
      const res = await api.post(`/api/clubs/${clubId}/picture`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.imageUrl || '';
      setEditForm((f) => ({ ...f, imageUrl: url }));
      // Update the club too, so the page behind the modal shows it at once.
      setClub((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setPicError(err.response?.data?.message || 'Could not upload that picture.');
    } finally {
      setPicBusy(false);
    }
  };

  const removePicture = async () => {
    setPicError('');
    setPicBusy(true);
    try {
      await api.delete(`/api/clubs/${clubId}/picture`);
      setEditForm((f) => ({ ...f, imageUrl: '' }));
      setClub((prev) => ({ ...prev, imageUrl: '' }));
    } catch (err) {
      setPicError(err.response?.data?.message || 'Could not remove the picture.');
    } finally {
      setPicBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    setEditError('');
    try {
      // imageUrl is deliberately NOT sent: the picture is uploaded separately
      // and the server ignores it here. Sending it anyway would imply this save
      // controls the picture, which it does not.
      const { imageUrl: _ignored, ...payload } = editForm;
      const res = await api.patch(`/api/clubs/${clubId}`, payload);
      // Merge rather than replace: the PATCH response deliberately returns only
      // the club's own fields, not the enriched member list this page renders.
      setClub((prev) => ({ ...prev, ...(res.data?.club || {}) }));
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

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
          <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>👥 {club.memberCount} members</span>
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

      {/* Members strip — a row of faces above the events, Facebook-group style.
          The full, searchable list is behind "Show all" so a large club does not
          push the club's own content off the screen. */}
      {members.length > 0 && (
        <div className="sh-card sh-club-members-strip">
          <div className="sh-club-members-strip-head">
            <div className="sh-section-title" style={{ margin: 0 }}>
              Members ({club.memberCount})
            </div>
            <button
              type="button"
              className="sh-btn-secondary sh-club-members-showall"
              onClick={() => { setMemberSearch(''); setMemberPage(1); setShowMembers(true); }}
            >
              Show all
            </button>
          </div>

          <div className="sh-club-members-faces">
            {stripMembers.map((m) => (
              <button
                key={m.userId}
                type="button"
                className="sh-club-face"
                title={m.displayName || m.username}
                onClick={() => { setMemberSearch(''); setMemberPage(1); setShowMembers(true); }}
              >
                <UserAvatar user={m} size={40} />
              </button>
            ))}
            {members.length > STRIP_LIMIT && (
              <button
                type="button"
                className="sh-club-face sh-club-face-more"
                onClick={() => { setMemberSearch(''); setMemberPage(1); setShowMembers(true); }}
                title="Show all members"
              >
                +{members.length - STRIP_LIMIT}
              </button>
            )}
          </div>
        </div>
      )}

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
                  <p style={{ fontSize: 13, color: 'var(--color-text-faint)', margin: '0 0 14px', lineHeight: 1.6 }}>
                    This is a <strong style={{ color: 'var(--color-danger)' }}>private club</strong>. Share the invite link — only people with it can find and join.
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
                  <p style={{ fontSize: 13, color: 'var(--color-text-faint)', margin: '0 0 14px' }}>
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

          {/* About this club — the owner's own write-up, which replaced the
              members list here. Rendered as sanitised HTML: the server strips
              links and scripts, so this cannot inject anything. */}
          {(club.about || club.imageUrl || isOwner) && (
            <div className="sh-card sh-club-about-card">
              <div className="sh-club-about-head">
                <div className="sh-section-title" style={{ margin: 0 }}>About This Club</div>
                {isOwner && (
                  <button type="button" className="sh-btn-secondary" onClick={openEdit}>
                    ✏️ Edit
                  </button>
                )}
              </div>

              {club.imageUrl && (
                <img
                  src={resolveApiAssetUrl(club.imageUrl)}
                  alt={`${club.name} banner`}
                  className="sh-club-about-image"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}

              {club.about ? (
                /* CoachProse, not raw HTML: the content is sanitised on the way
                   in by the same helper coach bios use, and this component
                   carries the matching prose styling. */
                <CoachProse html={club.about} className="sh-club-about-body" />
              ) : (
                <div className="sh-club-activity-empty" style={{ marginTop: 4 }}>
                  {isOwner
                    ? 'Tell people what your club is about — add a picture, your meeting times, and who should join.'
                    : 'The club owner has not written anything yet.'}
                </div>
              )}
            </div>
          )}

          {/* Moved here from the right column so the chat can use that column's
              full height. It is a small static card, so it reads just as well
              beside the club's other information. */}
          {isMember && (
            <div className="sh-card">
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

        </div>

        {/* Right: chat ONLY.
            "Create Club Activity" used to sit above the chat here and took ~300px
            of a column capped at the viewport height, so the chat could never be
            more than the remainder — which is why raising its height did nothing.
            It is a small static card, so it now lives with the other club info on
            the left and the chat gets the whole column. */}
        <div className="sh-club-detail-right">
          {isMember && club.chatId ? (
            <ClubChat chatId={club.chatId} currentUser={user} />
          ) : !isMember && club.isPrivate ? (
            // Private club — non-member: show code entry
            <div className="sh-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Private Club</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 20, lineHeight: 1.6 }}>
                You need an invite link to join this club.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter invite code…"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1, background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a10)',
                    borderRadius: 'var(--radius-md)', padding: '9px 14px', color: 'var(--color-text)', fontSize: 13,
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
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Members Only Chat</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 20, lineHeight: 1.6 }}>
                Join the club to chat with its members.
              </div>
              <button className="sh-btn-primary" onClick={() => joinByCode()} disabled={joining}>
                {joining ? 'Joining…' : '+ Join Club'}
              </button>
            </div>
          ) : null}
        </div>

      </div>

      {/* ── All members, searchable ─────────────────────────────────────────
          Opened from the strip above the events. Scrolls internally so a club
          with hundreds of members never stretches the page. */}
      {showMembers && (
        <div
          className="sh-club-modal-backdrop"
          onClick={() => setShowMembers(false)}
          role="presentation"
        >
          <div
            className="sh-club-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Club members"
          >
            <div className="sh-club-modal-head">
              <div className="sh-section-title" style={{ margin: 0 }}>
                Members ({club.memberCount})
              </div>
              <button
                type="button"
                className="sh-club-modal-close"
                onClick={() => setShowMembers(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              className="sh-club-modal-search"
              placeholder="Search members…"
              value={memberSearch}
              onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
              autoFocus
            />

            <div className="sh-club-modal-body">
              {filteredMembers.length === 0 ? (
                <div className="sh-club-activity-empty" style={{ marginTop: 8 }}>
                  No members match “{memberSearch}”.
                </div>
              ) : pagedMembers.map((m) => (
                <div key={m.userId} className="sh-member-row">
                  <div className="sh-avatar">
                    <UserAvatar user={m} size={42} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      <PlayerName linkToProfile displayName={m.displayName} username={m.username} userId={m.userId} />
                    </div>
                  </div>
                  {m.role === 'owner' && <span className="sh-owner-badge">Owner</span>}
                  <span style={{ fontSize: 11, color: 'var(--color-white-a20)' }}>
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>

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
                <span className="sh-members-page-indicator">
                  Page {currentMemberPage} / {totalMemberPages}
                </span>
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
      )}

      {/* ── Owner edits the club page ───────────────────────────────────── */}
      {editing && editForm && (
        <div
          className="sh-club-modal-backdrop"
          onClick={() => !savingEdit && setEditing(false)}
          role="presentation"
        >
          <div
            className="sh-club-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit club"
          >
            <div className="sh-club-modal-head">
              <div className="sh-section-title" style={{ margin: 0 }}>Edit Club</div>
              <button
                type="button"
                className="sh-club-modal-close"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="sh-club-modal-body sh-club-edit-body">
              <label className="sh-club-edit-label">Club name</label>
              <input
                type="text"
                className="sh-club-edit-input"
                value={editForm.name}
                maxLength={50}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              />

              <label className="sh-club-edit-label">Short description</label>
              <div className="sh-club-edit-hint">Shown on the club card when people browse clubs.</div>
              <textarea
                className="sh-club-edit-input"
                rows={2}
                maxLength={300}
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              />

              {/* Upload, not a URL box: asking a club owner to host an image
                  somewhere and paste a link is not a realistic ask. Saved
                  immediately on pick — it is a file on the server, so making it
                  wait for "Save changes" would be misleading. */}
              <label className="sh-club-edit-label">Club picture</label>
              <div className="sh-club-edit-hint">
                A banner or logo shown at the top of your club page. PNG, JPG,
                WEBP or GIF, under 2 MB.
              </div>

              <div className="sh-club-pic-row">
                {editForm.imageUrl ? (
                  <img
                    src={resolveApiAssetUrl(editForm.imageUrl)}
                    alt="Club picture"
                    className="sh-club-pic-preview"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="sh-club-pic-empty">No picture yet</div>
                )}

                <div className="sh-club-pic-actions">
                  <label className={`sh-btn-secondary sh-club-pic-btn${picBusy ? ' is-busy' : ''}`}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onPictureFile}
                      disabled={picBusy}
                      hidden
                    />
                    {picBusy
                      ? 'Uploading…'
                      : (editForm.imageUrl ? 'Change picture' : 'Upload picture')}
                  </label>
                  {editForm.imageUrl && !picBusy && (
                    <button
                      type="button"
                      className="sh-club-pic-remove"
                      onClick={removePicture}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {picError && <div className="sh-club-edit-error">{picError}</div>}

              <label className="sh-club-edit-label">About this club</label>
              <div className="sh-club-edit-hint">
                Formatting is kept. Links are removed automatically — club pages are open to kids.
              </div>
              <CoachRichText
                value={editForm.about}
                onChange={(html) => setEditForm(f => ({ ...f, about: html }))}
                placeholder="Who is this club for? When do you play? Any rules?"
              />

              <label className="sh-club-edit-checkbox">
                <input
                  type="checkbox"
                  checked={editForm.isPrivate}
                  onChange={(e) => setEditForm(f => ({ ...f, isPrivate: e.target.checked }))}
                />
                <span>Private club — only people with the invite link can join</span>
              </label>

              {editError && <div className="sh-club-edit-error">{editError}</div>}
            </div>

            <div className="sh-club-edit-actions">
              <button
                type="button"
                className="sh-btn-secondary"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sh-btn-primary"
                onClick={saveEdit}
                disabled={savingEdit || !editForm.name.trim()}
              >
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
