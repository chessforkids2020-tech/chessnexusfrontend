import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';
import { linkify } from '../utils/linkify';

// Floating chat for the Live Classroom. Messages are TRANSIENT — relayed live over
// socket only, never persisted, and gone when the meeting ends. A floating button
// bottom-right opens the panel; unread count shows on the button while it's closed.
export default function LiveClassChat({ sessionId, isHost }) {
  const { user } = useAuth();
  const myId = user && (user.id || user._id);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [blocked, setBlocked] = useState(false); // host disabled student chat
  const endRef = useRef(null);
  const inputRef = useRef(null); // textarea, to reset its auto-grown height after send
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const onMsg = (m) => {
      setMessages(prev => [...prev, m]);
      if (!openRef.current) setUnread(u => u + 1);
    };
    const onBlock = ({ blocked: b }) => setBlocked(!!b);
    socket.on('liveclass:chat', onMsg);
    socket.on('liveclass:chat-block', onBlock);
    return () => { socket.off('liveclass:chat', onMsg); socket.off('liveclass:chat-block', onBlock); };
  }, []);

  useEffect(() => { if (open) { setUnread(0); endRef.current?.scrollIntoView({ block: 'end' }); } }, [open, messages]);

  // Students can't post while blocked; the host always can.
  const canPost = isHost || !blocked;

  const send = useCallback((e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !sessionId) return;
    socket.emit('liveclass:chat', { sessionId, message: text });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, [input, sessionId]);

  const toggleBlock = () => {
    if (!isHost) return;
    socket.emit('liveclass:chat-block', { sessionId, blocked: !blocked });
  };

  return (
    <>
      {/* Floating button — inline SVG so it renders crisply everywhere (no emoji). */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...s.fab, ...(open ? s.fabOpen : {}) }}
        title="Class chat"
        aria-label="Class chat"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.9 8.4 9.5 9.5 0 0 1-4.2-1L3 20l1.1-4.9A8.38 8.38 0 0 1 12.6 3 8.5 8.5 0 0 1 21 11.5z" />
          </svg>
        )}
        {!open && unread > 0 && <span style={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.head}>
            <span>Class chat{blocked && ' 🔒'}</span>
            {isHost && (
              <button
                onClick={toggleBlock}
                style={{ ...s.blockBtn, ...(blocked ? s.blockBtnOn : {}) }}
                title={blocked ? 'Let students chat again' : 'Block students from chatting'}
              >{blocked ? '🔓 Unblock chat' : '🔒 Block chat'}</button>
            )}
          </div>
          <div style={s.body}>
            {messages.length === 0
              ? <div style={s.empty}>No messages yet. Say hello! 👋</div>
              : messages.map((m, i) => {
                  const mine = String(m.userId) === String(myId);
                  return (
                    <div key={i} style={{ ...s.msg, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ ...s.bubble, ...(mine ? s.bubbleMine : {}) }}>
                        {!mine && <div style={s.who}>{m.name || 'Student'}</div>}
                        {/* Links (e.g. a coach's activity link) render clickable and
                            open in a NEW TAB — so a student joining an activity keeps
                            the live class running in this tab. */}
                        <div>{linkify(m.message)}</div>
                      </div>
                    </div>
                  );
                })}
            <div ref={endRef} />
          </div>
          {canPost ? (
            <form onSubmit={send} style={s.inputRow}>
              <textarea
                ref={inputRef}
                style={s.input}
                value={input}
                maxLength={300}
                rows={1}
                placeholder={isHost && blocked ? 'Chat is blocked for students…' : 'Type a message…'}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
              />
              <button type="submit" disabled={!input.trim()} style={{ ...s.sendBtn, ...(input.trim() ? {} : s.sendOff) }}>Send</button>
            </form>
          ) : (
            <div style={s.disabledRow}>🔒 The coach has turned off chat for now.</div>
          )}
        </div>
      )}
    </>
  );
}

const s = {
  fab: { position: 'fixed', right: 20, bottom: 20, width: 56, height: 56, borderRadius: '50%',
    border: 'none', background: 'linear-gradient(135deg,var(--color-accent),var(--color-success))', color: '#04211d',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 9000, boxShadow: '0 8px 24px var(--color-black-a50)' },
  fabOpen: { background: 'rgba(30,41,59,0.95)', color: 'var(--color-text)' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 999,
    background: 'var(--color-danger)', color: 'var(--color-text)', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center',
    padding: '0 5px', border: '2px solid var(--color-bg)' },
  panel: { position: 'fixed', right: 20, bottom: 86, width: 340, maxWidth: 'calc(100vw - 40px)', height: 460, maxHeight: '70vh',
    display: 'flex', flexDirection: 'column', background: 'rgba(15,20,28,0.98)', border: '1px solid var(--color-white-a10)',
    borderRadius: 16, overflow: 'hidden', zIndex: 9000, boxShadow: '0 20px 60px var(--color-black-a65)',
    fontFamily: "'Poppins',sans-serif" },
  head: { padding: '10px 12px 10px 14px', fontWeight: 800, color: 'var(--color-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    background: 'linear-gradient(135deg,var(--color-accent-a15),var(--color-success-a12))', borderBottom: '1px solid var(--color-white-a07)' },
  blockBtn: { padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a07)', color: 'var(--color-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  blockBtnOn: { background: 'var(--color-danger-a20)', border: '1px solid var(--color-danger-a30)', color: 'var(--color-danger)' },
  disabledRow: { padding: '14px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, borderTop: '1px solid var(--color-white-a07)' },
  body: { flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: 'var(--color-text-faint)', fontSize: 13, textAlign: 'center', margin: 'auto' },
  msg: { maxWidth: '85%', display: 'flex' },
  bubble: { background: 'var(--color-white-a07)', color: 'var(--color-text)', padding: '7px 11px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
  bubbleMine: { background: 'var(--color-accent-a20)', color: '#e0f7ff' },
  who: { fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 2 },
  inputRow: { display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--color-white-a07)', alignItems: 'flex-end' },
  input: { flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-white-a13)',
    background: 'var(--color-white-a04)', color: 'var(--color-text)', fontSize: 13.5, outline: 'none',
    resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  sendBtn: { padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--color-accent-a20)', color: 'var(--color-accent)', fontWeight: 700, cursor: 'pointer' },
  sendOff: { opacity: 0.5, cursor: 'not-allowed' },
};
