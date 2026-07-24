import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import { linkify } from '../../utils/linkify';
import './CoachChat.css';

// Format a message time as "5 Jul 2026, 2:30 PM" (date + month + year + time).
// Mirrors the Social Hub Chat.jsx formatter.
const fmtMsgTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

/**
 * Dedicated coach ↔ student messaging surface (1:1 + group).
 *
 * Reuses the existing chat engine (Chat/ChatMessage models, socket rooms) but
 * only shows threads tagged with `coachId` (fetched from /api/chat/coach/threads).
 *
 * Permission model is asymmetric and driven by the `mode` prop:
 *   • mode="coach"   → can start a new 1:1 with a student and create groups.
 *   • mode="student" → read + reply only. No create controls at all.
 *
 * Sending, reading, and real-time delivery use the same shared endpoints as the
 * Social Hub chat, so students can reply in a thread but can never open one.
 */
export default function CoachChat({ mode = 'student' }) {
  const isCoach = mode === 'coach';
  const { user, fetchUnreadCount } = useAuth();
  const myId = user?._id || user?.id;

  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Coach-only: student roster + "new chat / new group" modals.
  const [students, setStudents] = useState([]);
  const [showNew, setShowNew] = useState(false);        // new 1:1 picker
  const [showGroup, setShowGroup] = useState(false);    // new group modal
  const [groupName, setGroupName] = useState('');
  const [groupPicked, setGroupPicked] = useState([]);   // student ids
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const messagesRef = useRef(null);
  const composeRef = useRef(null); // textarea, to reset its auto-grown height after send
  // Scroll ONLY the messages container (not scrollIntoView, which would also
  // scroll ancestor containers and push the header/pane out of view).
  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* ── socket lifecycle ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    socket.connect();
    return () => { /* leave connection to app-level; don't hard-disconnect */ };
  }, [user]);

  /* ── load threads (and, for coaches, the roster) ──────────────────── */
  const loadThreads = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/coach/threads');
      setThreads(Array.isArray(res.data) ? res.data : []);
    } catch {
      setThreads([]);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    if (isCoach) {
      api.get('/api/coach/students')
        .then(res => setStudents(res.data?.students || []))
        .catch(() => setStudents([]));
    }
  }, [loadThreads, isCoach]);

  /* ── join socket rooms for every thread ───────────────────────────── */
  useEffect(() => {
    threads.forEach(t => socket.emit('join_chat', t._id));
  }, [threads]);

  /* ── incoming messages ────────────────────────────────────────────── */
  useEffect(() => {
    const onReceive = (message) => {
      const cur = selectedRef.current;
      if (cur && message.chatId === cur._id) {
        setMessages(prev => {
          const i = prev.findIndex(m =>
            m._id === message._id ||
            (m.isOptimistic && (m.sender._id || m.sender) === (message.sender._id || message.sender) && m.content === message.content)
          );
          if (i >= 0) { const u = [...prev]; u[i] = message; return u; }
          return [...prev, message];
        });
        scrollToBottom();
      }
      // Bubble the thread up + bump unread if it isn't the open one.
      setThreads(prev => {
        const senderId = message.sender?._id || message.sender;
        const fromOther = myId && senderId && String(senderId) !== String(myId);
        const exists = prev.some(t => t._id === message.chatId);
        if (!exists) { loadThreads(); return prev; }
        return prev
          .map(t => {
            if (t._id !== message.chatId) return t;
            const isOpen = cur && cur._id === t._id;
            const unread = fromOther && !isOpen ? (t.unreadCount || 0) + 1 : (t.unreadCount || 0);
            return { ...t, lastMessage: message, updatedAt: new Date(), unreadCount: unread };
          })
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    };

    const onNewChat = () => loadThreads();

    socket.on('receive_message', onReceive);
    socket.on('new_chat', onNewChat);
    return () => {
      socket.off('receive_message', onReceive);
      socket.off('new_chat', onNewChat);
    };
  }, [myId, loadThreads]);

  /* ── open a thread → load + mark read ─────────────────────────────── */
  const openThread = async (thread) => {
    setSelected(thread);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      await api.put(`/api/chat/${thread._id}/read`, {});
      fetchUnreadCount?.();
      setThreads(prev => prev.map(t => t._id === thread._id ? { ...t, unreadCount: 0 } : t));
      const res = await api.get(`/api/chat/${thread._id}/messages`);
      setMessages((res.data || []).filter(m => m && m.content));
      setTimeout(scrollToBottom, 0);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  /* ── send ─────────────────────────────────────────────────────────── */
  const send = async () => {
    const content = draft.trim();
    if (!content || !selected || sending) return;
    setSending(true);
    const optimistic = {
      _id: `tmp-${Date.now()}`,
      chatId: selected._id,
      content,
      sender: { _id: myId, displayName: user?.displayName || user?.username },
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    if (composeRef.current) composeRef.current.style.height = 'auto';
    scrollToBottom();
    try {
      await api.post(`/api/chat/${selected._id}/messages`, { content });
    } catch (e) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setErr(e.response?.data?.message || 'Could not send message.');
      setTimeout(() => setErr(''), 3000);
    } finally {
      setSending(false);
    }
  };

  /* ── coach: start 1:1 ─────────────────────────────────────────────── */
  const startWithStudent = async (studentId) => {
    setBusy(true); setErr('');
    try {
      const res = await api.post('/api/chat/coach/start', { studentId });
      setShowNew(false);
      await loadThreads();
      openThread(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start chat.');
    } finally {
      setBusy(false);
    }
  };

  /* ── coach: create group ──────────────────────────────────────────── */
  const createGroup = async () => {
    if (!groupName.trim() || groupPicked.length === 0) return;
    setBusy(true); setErr('');
    try {
      const res = await api.post('/api/chat/coach/group', {
        name: groupName.trim(),
        studentIds: groupPicked,
      });
      setShowGroup(false);
      setGroupName('');
      setGroupPicked([]);
      await loadThreads();
      openThread(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create group.');
    } finally {
      setBusy(false);
    }
  };

  /* ── helpers for display ──────────────────────────────────────────── */
  const threadLabel = (t) => {
    if (t.type === 'group') return t.name || 'Group';
    const other = (t.participants || []).find(p => String(p._id) !== String(myId));
    return other?.displayName || other?.username || 'Chat';
  };
  const studentName = (s) => s.studentId?.displayName || s.studentName || s.studentId?.username || 'Student';
  const studentUserId = (s) => s.studentId?._id;

  return (
    <div className="cchat">
      {/* ── Thread list ── */}
      <aside className="cchat-list">
        {isCoach && (
          <div className="cchat-list-head">
            <div className="cchat-actions">
              <button className="cchat-newbtn" onClick={() => { setShowNew(true); setErr(''); }} title="New message">✉️ New</button>
              <button className="cchat-newbtn" onClick={() => { setShowGroup(true); setErr(''); }} title="New group">👥 Group</button>
            </div>
          </div>
        )}

        {threads.length === 0 ? (
          <div className="cchat-empty-list">
            {isCoach
              ? 'No conversations yet. Start one with a student.'
              : 'No messages yet. Your coach will start a conversation with you here.'}
          </div>
        ) : threads.map(t => (
          <button
            key={t._id}
            className={`cchat-thread${selected?._id === t._id ? ' active' : ''}`}
            onClick={() => openThread(t)}
          >
            <div className="cchat-thread-icon">{t.type === 'group' ? '👥' : '👤'}</div>
            <div className="cchat-thread-body">
              <div className="cchat-thread-name">{threadLabel(t)}</div>
              <div className="cchat-thread-last">{t.lastMessage?.content || 'No messages yet'}</div>
            </div>
            {t.unreadCount > 0 && <span className="cchat-badge">{t.unreadCount}</span>}
          </button>
        ))}
      </aside>

      {/* ── Message pane ── */}
      <section className="cchat-pane">
        {!selected ? (
          <div className="cchat-empty-pane">Select a conversation</div>
        ) : (
          <>
            <div className="cchat-messages" ref={messagesRef}>
              {loadingMsgs ? (
                <div className="cchat-loading">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="cchat-loading">No messages yet. Say hello!</div>
              ) : messages.map(m => {
                const sid = m.sender?._id || m.sender;
                const mine = String(sid) === String(myId);
                return (
                  <div key={m._id} className={`cchat-msg${mine ? ' mine' : ''}`}>
                    {!mine && selected.type === 'group' && (
                      <div className="cchat-msg-sender">{m.sender?.displayName || m.sender?.username || ''}</div>
                    )}
                    <div className="cchat-bubble">{linkify(m.content)}</div>
                    <div className="cchat-msg-time">{fmtMsgTime(m.createdAt)}</div>
                  </div>
                );
              })}
            </div>

            {err && <div className="cchat-err">{err}</div>}

            <div className="cchat-compose">
              <textarea
                ref={composeRef}
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a message…"
                rows={1}
              />
              <button onClick={send} disabled={!draft.trim() || sending}>Send</button>
            </div>
          </>
        )}
      </section>

      {/* ── Coach: new 1:1 picker ── */}
      {isCoach && showNew && (
        <div className="cchat-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="cchat-modal">
            <div className="cchat-modal-head">New message<button onClick={() => setShowNew(false)}>✕</button></div>
            {err && <div className="cchat-err">{err}</div>}
            <div className="cchat-modal-list">
              {students.length === 0 ? (
                <div className="cchat-empty-list">No students on your roster yet.</div>
              ) : students.map(s => (
                <button key={s._id} className="cchat-pick" disabled={busy || !studentUserId(s)} onClick={() => startWithStudent(studentUserId(s))}>
                  <span className="cchat-thread-icon">👤</span>{studentName(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Coach: new group modal ── */}
      {isCoach && showGroup && (
        <div className="cchat-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowGroup(false); }}>
          <div className="cchat-modal">
            <div className="cchat-modal-head">New group<button onClick={() => setShowGroup(false)}>✕</button></div>
            {err && <div className="cchat-err">{err}</div>}
            <input
              className="cchat-group-name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name"
            />
            <div className="cchat-modal-list">
              {students.map(s => {
                const uid = studentUserId(s);
                if (!uid) return null;
                const picked = groupPicked.includes(uid);
                return (
                  <label key={s._id} className={`cchat-pick selectable${picked ? ' picked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => setGroupPicked(prev => picked ? prev.filter(x => x !== uid) : [...prev, uid])}
                    />
                    <span className="cchat-thread-icon">👤</span>{studentName(s)}
                  </label>
                );
              })}
            </div>
            <button className="cchat-create" disabled={busy || !groupName.trim() || groupPicked.length === 0} onClick={createGroup}>
              Create group ({groupPicked.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
