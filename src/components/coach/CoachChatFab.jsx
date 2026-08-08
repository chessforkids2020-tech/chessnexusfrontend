import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import CoachChat from './CoachChat';
import './CoachChatFab.css';

/**
 * Floating "Message" button for coach pages (dashboard / assignments / attendance).
 * Sits bottom-right, shows an unread badge, and opens the coach chat in a popup
 * so the coach can message students from anywhere without scrolling the page.
 *
 * Reuses <CoachChat mode="coach" />. Unread count comes from
 * GET /api/chat/coach/unread-count and is kept live via the socket + refreshed
 * when the popup closes (opening a thread marks it read).
 */
/**
 * Open the coach chat popup from anywhere on the page, optionally landing on a
 * specific thread.
 *
 * The FAB is a SIBLING of the things that want to open it (a request card on
 * the dashboard, for example), not an ancestor, so there is no prop path
 * between them. A window event keeps that one-way call simple without lifting
 * popup state into four different pages that each mount this component.
 */
export function openCoachChat(threadId = null) {
  window.dispatchEvent(new CustomEvent('coachchat:open', { detail: { threadId } }));
}

export default function CoachChatFab() {
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openThreadId, setOpenThreadId] = useState(null);
  const openRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);

  // Someone on the page asked us to open (see openCoachChat above).
  useEffect(() => {
    const onOpen = (e) => {
      setOpenThreadId(e.detail?.threadId || null);
      setOpen(true);
    };
    window.addEventListener('coachchat:open', onOpen);
    return () => window.removeEventListener('coachchat:open', onOpen);
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/coach/unread-count');
      setUnread(res.data?.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    socket.connect();
    refreshUnread();

    // Bump the badge live when a message arrives while the popup is closed.
    const onReceive = (message) => {
      const senderId = message?.sender?._id || message?.sender;
      const fromOther = myId && senderId && String(senderId) !== String(myId);
      if (fromOther && !openRef.current) refreshUnread();
    };
    socket.on('receive_message', onReceive);

    // Light polling as a fallback (covers reconnects / missed events).
    const poll = setInterval(() => { if (!openRef.current) refreshUnread(); }, 30000);

    return () => {
      socket.off('receive_message', onReceive);
      clearInterval(poll);
    };
  }, [user, myId, refreshUnread]);

  // When the popup closes, threads the coach opened are now read → refresh badge.
  const closePopup = () => {
    setOpen(false);
    // Forget the requested thread, so opening the FAB normally later does not
    // jump back to whoever we were last pointed at.
    setOpenThreadId(null);
    refreshUnread();
  };

  if (!user) return null;

  return (
    <>
      <button
        className="ccfab"
        onClick={() => { setOpenThreadId(null); setOpen(true); }}
        aria-label="Messages"
        title="Message students"
      >
        <span className="ccfab-icon">💬</span>
        <span className="ccfab-label">Message</span>
        {unread > 0 && <span className="ccfab-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="ccfab-overlay" onClick={e => { if (e.target === e.currentTarget) closePopup(); }}>
          <div className="ccfab-popup">
            <button className="ccfab-close" onClick={closePopup} aria-label="Close">✕</button>
            <div className="ccfab-popup-body">
              <CoachChat mode="coach" openThreadId={openThreadId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
