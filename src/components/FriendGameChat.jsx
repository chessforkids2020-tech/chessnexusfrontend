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
 */
export default function FriendGameChat({ socket, roomCode, myName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };
    socket.on('friendChatMessage', onMessage);
    return () => socket.off('friendChatMessage', onMessage);
  }, [socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim().slice(0, 100);
    if (!text || !socket) return;
    socket.emit('friendChatMessage', { roomCode, message: text });
    setInput('');
  };

  return (
    <div className="fgc">
      <div className="fgc-header">💬 Chat</div>
      <div className="fgc-messages">
        {messages.length === 0 && (
          <p className="fgc-empty">Say hi to your friend 👋</p>
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
