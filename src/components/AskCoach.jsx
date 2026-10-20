// AskCoach.jsx — "Ask my coach" on the single game analysis page.
//
// Sends the student's question, the game link and EVERY move they picked into
// their 1:1 coach thread — the same Messages thread as My Coach → 💬 Messages,
// so the coach answers where they already chat. Each picked move gets its own
// link that opens the game at exactly that move.
//
// Moves are picked from the whole game (not just the one on the board, which
// was all it could send before — and nothing at all if the student hadn't
// stepped to a move). Tapping a move also shows it on the board.
// Renders nothing for someone without an accepted coach.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import api from '../api';
import { t as tr } from '../i18n/LanguageContext';

const MAX_LEN = 500;
const MAX_MOVES = 10;      // keeps the message readable for the coach
const GLYPH = { inaccuracy: '?!', mistake: '?', blunder: '??' };
const QUICK = [
  'Where did I go wrong in this game?',
  'What should I have played here?',
  'How could I have converted my advantage?',
  'What plan should I follow in this opening?',
];

export default function AskCoach({ game, gameType, gameId, mySide, ply, moveAnalysis, onSeek }) {
  const [coaches, setCoaches] = useState([]);
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState('');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);          // move indices (0-based), kept sorted
  const [onlyMistakes, setOnlyMistakes] = useState(false);
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
          .map(l => ({ id: String(l.coachId._id), name: l.coachId.displayName || l.coachId.username || tr('Coach') }));
        // One link per coach, even if the student has several (e.g. two batches).
        const seen = new Set();
        const uniq = list.filter(c => (seen.has(c.id) ? false : seen.add(c.id)));
        setCoaches(uniq);
        if (uniq[0]) setCoachId(uniq[0].id);
      })
      .catch(() => { /* no coach → card stays hidden */ });
    return () => { alive = false; };
  }, []);

  // Every move of the game with its number, side and (once the review has run)
  // its ?! / ? / ?? mark. Built from game.moves so it works before analysis too.
  const moves = useMemo(() => {
    const list = [];
    let c;
    try { c = game?.startFen ? new Chess(game.startFen) : new Chess(); } catch { c = new Chess(); }
    (game?.moves || []).forEach((san, i) => {
      const side = c.turn() === 'w' ? 'white' : 'black';
      const no = c.moveNumber();
      try { c.move(san); } catch { /* keep the label even if replay fails */ }
      const cls = moveAnalysis?.[i]?.classification || null;
      list.push({ i, ply: i + 1, no, side, san, glyph: GLYPH[cls] || '', cls });
    });
    return list;
  }, [game, moveAnalysis]);

  if (!coaches.length) return null;

  const label = (mv) => `${mv.no}${mv.side === 'black' ? '…' : '.'} ${mv.san}${mv.glyph}`;
  const opponent = mySide === 'white' ? game.black : game.white;
  const current = ply > 0 ? moves[ply - 1] : null;
  const hasReview = moves.some(mv => mv.cls);
  const myMistakes = moves.filter(mv => mv.cls && mv.side === mySide);

  const toggle = (i) => {
    if (picked.includes(i)) { setError(''); setPicked(picked.filter(x => x !== i)); return; }
    if (picked.length >= MAX_MOVES) { setError(tr('You can pick up to {n} moves.', { n: MAX_MOVES })); return; }
    setError('');
    setPicked([...picked, i].sort((a, b) => a - b));
  };
  // Tap = pick/unpick it AND show it on the board, so the student sees what
  // they're asking about.
  const tapMove = (mv) => { toggle(mv.i); onSeek?.(mv.ply); };
  const pickMyMistakes = () => {
    setError('');
    setPicked(prev => [...new Set([...prev, ...myMistakes.map(mv => mv.i)])].sort((a, b) => a - b).slice(0, MAX_MOVES));
  };

  const openPanel = () => {
    // Start with the move on the board, if the student is on one.
    setPicked(current ? [current.i] : []);
    setOpen(true);
  };

  const shown = onlyMistakes ? moves.filter(mv => mv.cls) : moves;

  const send = async () => {
    const q = text.trim();
    if (!q || sending) return;
    setSending(true);
    setError('');
    try {
      const base = `${window.location.origin}/game/${encodeURIComponent(gameType)}/${encodeURIComponent(gameId)}?pov=${mySide}`;
      const chosen = picked.map(i => moves[i]).filter(Boolean);
      const content = [
        q,
        '',
        `♟ My game vs ${opponent || 'opponent'}:`,
        base,
        ...(chosen.length ? [
          '',
          chosen.length === 1 ? 'The move I\'m asking about:' : `The ${chosen.length} moves I'm asking about:`,
          // One line per move, each opening the game at exactly that move.
          ...chosen.map(mv => `• ${label(mv)} → ${base}&ply=${mv.ply}`),
        ] : []),
      ].join('\n');
      const { data: chat } = await api.post('/api/chat/coach/ask', { coachId });
      await api.post(`/api/chat/${chat._id}/messages`, { content });
      setSentTo(coaches.find(c => c.id === coachId)?.name || 'your coach');
      setText('');
      setPicked([]);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="sga-card sga-ask sga-ask--sent">
        <div>{tr("✓ Sent to")} <b>{sentTo}</b>{tr(". The reply comes in your coach messages.")}</div>
        <div className="sga-ask-row">
          <Link to="/my-coach?tab=messages" className="sga-ask-link">{tr("💬 Open messages")}</Link>
          <button type="button" className="sga-ask-ghost" onClick={() => { setSentTo(null); openPanel(); }}>{tr("Ask another question")}</button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="sga-card sga-ask sga-ask--cta" onClick={openPanel}>
        <span className="sga-ask-title">{tr("🎓 Ask my coach")}</span>
        <span className="sga-ask-sub">{tr("Send this game and your question to")} {coaches.length === 1 ? coaches[0].name : 'your coach'}</span>
      </button>
    );
  }

  return (
    <div className="sga-card sga-ask">
      <div className="sga-ask-head">
        <span className="sga-ask-title">{tr("🎓 Ask my coach")}</span>
        <button type="button" className="sga-ask-x" onClick={() => setOpen(false)} aria-label={tr("Close")}>✕</button>
      </div>

      {coaches.length > 1 && (
        <select className="sga-ask-select" value={coachId} onChange={e => setCoachId(e.target.value)}>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {/* Move picker — tap any moves the question is about (optional). */}
      <div className="sga-ask-pick">
        <div className="sga-ask-pick-head">
          <span className="sga-ask-pick-title">
            {picked.length
              ? tr('{n} of {max} moves picked', { n: picked.length, max: MAX_MOVES })
              : tr('Which moves? Tap to pick (optional)')}
          </span>
          {picked.length > 0 && (
            <button type="button" className="sga-ask-mini" onClick={() => { setPicked([]); setError(''); }}>{tr("Clear")}</button>
          )}
        </div>
        <div className="sga-ask-pick-tools">
          {current && !picked.includes(current.i) && (
            <button type="button" className="sga-ask-mini" onClick={() => toggle(current.i)}>
              {tr("+ Move on board")} ({label(current)})
            </button>
          )}
          {myMistakes.length > 0 && (
            <button type="button" className="sga-ask-mini" onClick={pickMyMistakes}>
              {tr("+ All my mistakes")} ({myMistakes.length})
            </button>
          )}
          {hasReview && (
            <label className="sga-ask-only">
              <input type="checkbox" checked={onlyMistakes} onChange={e => setOnlyMistakes(e.target.checked)} />
              {tr("Show only ?! ? ?? moves")}
            </label>
          )}
        </div>
        <div className="sga-ask-movelist" role="group" aria-label={tr("Moves of this game")}>
          {shown.length === 0 && <span className="sga-ask-tip">{tr("No marked moves in this game.")}</span>}
          {shown.map(mv => (
            <button
              key={mv.i}
              type="button"
              className={`sga-ask-mv${picked.includes(mv.i) ? ' is-on' : ''}${mv.cls ? ` is-${mv.cls}` : ''}${mv.side === mySide ? ' is-mine' : ''}`}
              onClick={() => tapMove(mv)}
              aria-pressed={picked.includes(mv.i)}
              title={mv.side === mySide ? tr('Your move') : tr('Opponent’s move')}
            >
              {mv.side === 'white' || mv.i === 0 || onlyMistakes ? <span className="sga-ask-mvno">{mv.no}{mv.side === 'white' ? '.' : '…'}</span> : null}
              {mv.san}{mv.glyph}
            </button>
          ))}
        </div>
      </div>

      <div className="sga-ask-chips">
        {QUICK.map(s => (
          <button key={s} type="button" className="sga-ask-chip" onClick={() => setText(s)}>{s}</button>
        ))}
      </div>

      <textarea
        className="sga-ask-text"
        rows={3}
        maxLength={MAX_LEN}
        placeholder={tr("Your question…")}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {error && <div className="sga-ask-err">{error}</div>}
      <div className="sga-ask-row">
        <span className="sga-ask-len">{text.length}/{MAX_LEN}</span>
        <button type="button" className="sga-btn sga-ask-send" disabled={!text.trim() || sending} onClick={send}>
          {sending ? tr('Sending…') : tr('Send to coach')}
        </button>
      </div>
    </div>
  );
}
