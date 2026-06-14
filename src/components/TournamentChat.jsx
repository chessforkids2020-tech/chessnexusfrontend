import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket-jwt';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import './TournamentChat.css';

export default function TournamentChat({ tournamentId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const auth = useAuth();
  const currentUserId = auth?.user?.id || auth?.user?._id;

  const loadMessages = async () => {
    try {
      const response = await api.get(`/api/arenatournament/${tournamentId}/chat`);
      if (response.data?.messages) {
        // Merge API messages with any already received via socket (dedup by _id)
        setMessages(prev => {
          const apiMessages = response.data.messages;
          const apiIds = new Set(apiMessages.map(m => String(m._id)));
          // Keep any socket-received messages not yet in the API response
          const socketOnly = prev.filter(m => !apiIds.has(String(m._id)));
          return [...apiMessages, ...socketOnly].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
        });
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  };

  // Load persisted chat messages on mount
  useEffect(() => {
    loadMessages();
  }, [tournamentId]);

  useEffect(() => {
    
    const handleChatMessage = (chatMessage) => {
      setMessages(prev => {
        // Avoid duplicate messages
        if (prev.some(m => String(m._id) === String(chatMessage._id))) return prev;
        return [...prev, chatMessage];
      });
    };

    // Reload messages from API on socket reconnect to catch any missed during disconnection
    const handleReconnect = () => loadMessages();

    socket.on('arenaTournamentChatMessage', handleChatMessage);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('arenaTournamentChatMessage', handleChatMessage);
      socket.off('connect', handleReconnect);
    };
  }, [tournamentId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const isGuest = auth?.user?.role === 'guest';

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket.connected) return;
    socket.emit('sendArenaTournamentChatMessage', { tournamentId, message: inputMessage });
    setInputMessage('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)'
    }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(16, 185, 129, 0.15))',
        color: '#67e8f9',
        fontWeight: '700',
        fontSize: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        Tournament Chat
      </div>

      <div
        ref={messagesContainerRef}
        className="tournament-chat-messages"
      >
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            padding: '40px 20px',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={String(msg._id) || idx}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                color: '#d1d5db',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <span style={{
                fontWeight: '600',
                color: msg.userId === currentUserId ? '#67e8f9' : '#06b6d4',
                marginRight: '6px'
              }}>
                {msg.displayName || msg.username || 'Anonymous'}:
              </span>
              <span style={{ color: '#ffffff' }}>
                {msg.message}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2
      }}>
        {isGuest ? (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '12px',
            color: '#c4b5fd',
            fontSize: '13px',
          }}>
            🔒 <strong>Log in</strong> to send messages
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={100}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#06b6d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                style={{
                  padding: '12px 24px',
                  background: inputMessage.trim()
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(107, 114, 128, 0.3)',
                  color: inputMessage.trim() ? '#06b6d4' : '#9ca3af',
                  border: inputMessage.trim()
                    ? '1px solid rgba(6, 182, 212, 0.3)'
                    : '1px solid rgba(107, 114, 128, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim()) {
                    e.target.style.background = 'rgba(6, 182, 212, 0.25)';
                    e.target.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.3)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputMessage.trim()) {
                    e.target.style.background = 'rgba(6, 182, 212, 0.15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                Send
              </button>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '8px',
              textAlign: 'right',
              fontStyle: 'italic'
            }}>
              {inputMessage.length}/100 characters
            </div>
          </>
        )}
      </form>
    </div>
  );
}
