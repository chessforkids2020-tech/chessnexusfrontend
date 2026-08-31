// components/ChatToasts.jsx
// Desktop-only "someone messaged you" toasts, stacked in the top-right — the
// WhatsApp-desktop / dashboard pattern. A badge alone is easy to miss when the
// user is deep in a puzzle or a class, so this surfaces WHO messaged and WHAT
// they said without pulling them off the page they're on.
//
// Deliberate scope:
//   • DESKTOP ONLY (> 1024px, matching the app's existing mobile breakpoint).
//     Phones and tablets have too little room for a floating card, so they get
//     the sound and the sidebar badge instead.
//   • Auto-dismiss after 20s, and an × to dismiss by hand.
//   • Suppressed while the user is already reading that same chat, and while
//     they're in a live class — a toast mid-lesson is a distraction, not a help.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';
import soundManager from '../utils/soundManager';
import './ChatToasts.css';

const AUTO_DISMISS_MS = 20000; // 20s, per spec
const MAX_VISIBLE = 3;         // beyond this the corner becomes a wall of cards
const DESKTOP_MIN_WIDTH = 1025; // > 1024 — mirrors Sidebar/UserLayout's breakpoint

// Routes where a floating card would land on top of something the user must not
// lose sight of (their own board, the class stage). Sound still plays.
const SUPPRESSED_PREFIXES = ['/live-class', '/classroom', '/arena/', '/coach/arena'];

export default function ChatToasts() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  // Read live values inside the socket handler without re-subscribing on every
  // navigation — a re-subscribe mid-flight can drop an in-transit message.
  const locationRef = useRef(location.pathname);
  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const onUnread = (payload = {}) => {
      const path = locationRef.current || '';

      // Never toast a message the user is already looking at: if the Chat page
      // is open they can see it arrive, and a card would just cover it.
      if (path.startsWith('/chat')) return;
      // Sound is allowed everywhere, but the card is not — see SUPPRESSED_PREFIXES.
      const suppressed = SUPPRESSED_PREFIXES.some(p => path.startsWith(p));

      // Sound first: it's the part that reaches EVERY device, including the
      // phones and tablets that never render a toast at all.
      // Audio must never take down the notification path.
      try { soundManager.play('notification'); } catch { /* ignore */ }

      if (suppressed) return;
      // Desktop only. Checked at fire time rather than mount so a resized or
      // rotated window is judged by its CURRENT width.
      if (window.innerWidth < DESKTOP_MIN_WIDTH) return;

      const id = payload.messageId || `${payload.chatId}-${Date.now()}`;
      const toast = {
        id,
        chatId: payload.chatId,
        title: payload.isGroup && payload.chatName
          ? `${payload.senderName || 'New message'} · ${payload.chatName}`
          : (payload.senderName || 'New message'),
        preview: payload.preview || '',
        photo: payload.senderPhotoUrl || null,
        senderId: payload.senderId || null,
      };

      setToasts(prev => {
        if (prev.some(t => t.id === id)) return prev; // de-dupe re-emits
        return [...prev, toast].slice(-MAX_VISIBLE);  // keep the newest few
      });

      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    };

    socket.on('chat:unread', onUnread);
    return () => socket.off('chat:unread', onUnread);
  }, [isAuthenticated, user, dismiss]);

  // Clear every pending timer on unmount so a dismissed-by-navigation toast
  // can't fire setState after this component is gone.
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(t => clearTimeout(t)); timers.clear(); };
  }, []);

  const open = (toast) => {
    dismiss(toast.id);
    // Chat.jsx opens a thread from ?userId= (it resolves/creates the direct
    // chat); it has no ?chat= handler, so route through the sender.
    navigate(toast.senderId ? `/chat?userId=${toast.senderId}` : '/chat');
  };

  if (toasts.length === 0) return null;

  return (
    <div className="chat-toasts" role="region" aria-label="New message notifications">
      {toasts.map(t => (
        <div key={t.id} className="chat-toast" role="status">
          <button
            className="chat-toast-close"
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            ×
          </button>
          {/* The body is the click target, so the × above never opens the chat. */}
          <div
            className="chat-toast-body"
            onClick={() => open(t)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(t); } }}
          >
            <div className="chat-toast-avatar" aria-hidden="true">
              {t.photo
                ? <img src={t.photo} alt="" />
                : <span>{(t.title || '?').charAt(0).toUpperCase()}</span>}
            </div>
            <div className="chat-toast-text">
              <div className="chat-toast-title">{t.title}</div>
              {t.preview && <div className="chat-toast-preview">{t.preview}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
