// FloatingChatWidget — WhatsApp-style persistent chat bubble.
// Visible on every page (except /social/chat where the full chat is already shown).
// Stays open while navigating between pages.
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Chat from '../pages/Chat';
import './FloatingChatWidget.css';

export default function FloatingChatWidget() {
  const { user, unreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Don't show when not logged in or already on the full chat page
  if (!user) return null;
  if (location.pathname.startsWith('/social/chat')) return null;

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="fcw-root">
      {open && (
        <div className="fcw-panel">
          {/* Panel header with title + expand + close */}
          <div className="fcw-panel-header">
            <span className="fcw-panel-title">💬 Messages</span>
            <div className="fcw-panel-actions">
              <button
                className="fcw-action-btn"
                title="Open full chat"
                onClick={() => { setOpen(false); navigate('/social/chat'); }}
              >⛶</button>
              <button
                className="fcw-action-btn"
                title="Close"
                onClick={() => setOpen(false)}
              >✕</button>
            </div>
          </div>
          <div className="fcw-chat-wrap">
            <Chat />
          </div>
        </div>
      )}
      <button
        className="fcw-bubble"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Close chat' : 'Open chat'}
        aria-label="Toggle chat"
      >
        <span style={{ fontSize: open ? 18 : 24 }}>{open ? '✕' : '💬'}</span>
        {!open && unreadCount > 0 && (
          <span className="fcw-badge">{displayCount}</span>
        )}
      </button>
    </div>
  );
}
