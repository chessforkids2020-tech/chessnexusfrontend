import React, { useEffect, useRef, useState } from 'react';
import './FriendGameChat.css';

/**
 * Room-scoped chat for Play-with-a-Friend. Guest-friendly (no login required).
 * Ephemeral — messages live only for the session (server does not persist them).
 *
 * Props:
 *   socket   — the /friendgame namespace socket (shared with the game)
 *   roomCode — current room code
 *   myName   — this player's display name (to align own messages)
 *   event    — socket event to send/receive on. Players use 'friendChatMessage';
 *              watchers use 'spectatorChatMessage' (a separate chat the players
 *              never see, so watchers can't suggest moves).
 *   title / emptyText — header and empty-state copy
 *   initialMessages   — history to show on mount (watchers get the last few)
 */
export default function FriendGameChat({
  socket, roomCode, myName,
  event = 'friendChatMessage',
  title = '💬 Chat',
  emptyText = 'Say hi to your friend 👋',
  initialMessages,
}) {
  const [messages, setMessages] = useState(() => initialMessages || []);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  // History can arrive after mount (watch link opened before the socket answered).
  useEffect(() => {
    if (!initialMessages?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m._id));
      const older = initialMessages.filter((m) => !seen.has(m._id));
      return older.length ? [...older, ...prev] : prev;
    });
  }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };
    socket.on(event, onMessage);
    return () => socket.off(event, onMessage);
  }, [socket, event]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim().slice(0, 100);
    if (!text || !socket) return;
    socket.emit(event, { roomCode, message: text });
    setInput('');
  };

  return (
    <div className="fgc">
      <div className="fgc-header">{title}</div>
      <div className="fgc-messages">
        {messages.length === 0 && (
          <p className="fgc-empty">{emptyText}</p>
        )}
        {messages.map((m) => (
          <div key={m._id} className={`fgc-msg ${m.senderName === myName ? 'mine' : ''}`}>
            <span className="fgc-name">{m.senderName}</span>
            <span className="fgc-text">{m.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="fgc-input-row" onSubmit={send}>
        <input
          className="fgc-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={100}
          placeholder="Type a message…"
        />
        <button className="fgc-send" type="submit">Send</button>
      </form>
    </div>
  );
}
