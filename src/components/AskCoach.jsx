// AskCoach.jsx — "Ask my coach" on the single game analysis page.
//
// Sends the game link (opening at the move being asked about) plus the
// student's question into their 1:1 coach thread — the same Messages thread
// as My Coach → 💬 Messages, so the coach answers where they already chat.
// Renders nothing for someone without an accepted coach.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const MAX_LEN = 500;
const QUICK = [
  'Where did I go wrong in this game?',
  'What should I have played here?',
  'How could I have converted my advantage?',
  'What plan should I follow in this opening?',
];

export default function AskCoach({ game, gameType, gameId, mySide, ply, moveAnalysis }) {
  const [coaches, setCoaches] = useState([]);
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState('');
  const [text, setText] = useState('');
  const [aboutMove, setAboutMove] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/api/coach/my-coaches')
      .then(({ data }) => {
        if (!alive) return;
        const list = (data?.coaches || [])
          .filter(l => l.coachId && l.coachId._id)
          .map(l => ({ id: String(l.coachId._id), name: l.coachId.displayName || l.coachId.username || 'Coach' }));
        // One link per coach, even if the student has several (e.g. two batches).
        const seen = new Set();
        const uniq = list.filter(c => (seen.has(c.id) ? false : seen.add(c.id)));
        setCoaches(uniq);
        if (uniq[0]) setCoachId(uniq[0].id);
      })
      .catch(() => { /* no coach → card stays hidden */ });
    return () => { alive = false; };
  }, []);

  if (!coaches.length) return null;

  const m = ply > 0 ? moveAnalysis[ply - 1] : null;
  const glyph = m ? ({ inaccuracy: '?!', mistake: '?', blunder: '??' }[m.classification] || '') : '';
  const moveLabel = m ? `${m.moveNumber}${m.side === 'black' ? '…' : '.'} ${m.move}${glyph}` : null;
  const opponent = mySide === 'white' ? game.black : game.white;

  const send = async () => {
    const q = text.trim();
    if (!q || sending) return;
    setSending(true);
    setError('');
    try {
      const withMove = aboutMove && m;
      const url = `${window.location.origin}/game/${encodeURIComponent(gameType)}/${encodeURIComponent(gameId)}?pov=${mySide}${withMove ? `&ply=${ply}` : ''}`;
      const content = [
        q,
        '',
        `♟ My game vs ${opponent || 'opponent'}${withMove ? ` (move ${moveLabel})` : ''}:`,
        url,
      ].join('\n');
      const { data: chat } = await api.post('/api/chat/coach/ask', { coachId });
      await api.post(`/api/chat/${chat._id}/messages`, { content });
      setSentTo(coaches.find(c => c.id === coachId)?.name || 'your coach');
      setText('');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="sga-card sga-ask sga-ask--sent">
        <div>✓ Sent to <b>{sentTo}</b>. The reply comes in your coach messages.</div>
        <div className="sga-ask-row">
          <Link to="/my-coach?tab=messages" className="sga-ask-link">💬 Open messages</Link>
          <button type="button" className="sga-ask-ghost" onClick={() => { setSentTo(null); setOpen(true); }}>Ask another question</button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="sga-card sga-ask sga-ask--cta" onClick={() => setOpen(true)}>
        <span className="sga-ask-title">🎓 Ask my coach</span>
        <span className="sga-ask-sub">Send this game and your question to {coaches.length === 1 ? coaches[0].name : 'your coach'}</span>
      </button>
    );
  }

  return (
    <div className="sga-card sga-ask">
      <div className="sga-ask-head">
        <span className="sga-ask-title">🎓 Ask my coach</span>
        <button type="button" className="sga-ask-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>

      {coaches.length > 1 && (
        <select className="sga-ask-select" value={coachId} onChange={e => setCoachId(e.target.value)}>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {moveLabel ? (
        <label className="sga-ask-move">
          <input type="checkbox" checked={aboutMove} onChange={e => setAboutMove(e.target.checked)} />
          About move <b>{moveLabel}</b> <span>(the link opens there)</span>
        </label>
      ) : (
        <div className="sga-ask-tip">Tip: step to a move first to ask about that exact position.</div>
      )}

      <div className="sga-ask-chips">
        {QUICK.map(s => (
          <button key={s} type="button" className="sga-ask-chip" onClick={() => setText(s)}>{s}</button>
        ))}
      </div>

      <textarea
        className="sga-ask-text"
        rows={3}
        maxLength={MAX_LEN}
        placeholder="Your question…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {error && <div className="sga-ask-err">{error}</div>}
      <div className="sga-ask-row">
        <span className="sga-ask-len">{text.length}/{MAX_LEN}</span>
        <button type="button" className="sga-btn sga-ask-send" disabled={!text.trim() || sending} onClick={send}>
          {sending ? 'Sending…' : 'Send to coach'}
        </button>
      </div>
    </div>
  );
}
