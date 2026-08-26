import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HELP_SECTIONS, ALL_ARTICLES } from '../data/helpCenter';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  loadConversations, saveConversation, deleteConversation,
  conversationTitle, relativeDay, TTL_DAYS,
} from '../lib/helpHistory';
import { IMPROVE_POINTS, RATING_PROMPT, BANDS, FOLLOWUPS, bandForRating, isImproveQuestion, isModeratorRequest } from '../data/improvePlan';
import './HelpCenter.css';

// Nexus Help Center — a guided chat, the way Amazon's help works.
//
// WHY CHAT RATHER THAN A FAQ LIST
// A list makes you scan everything to find your one question. A chat asks who
// you are, offers the questions that fit, and answers one at a time — so the
// screen only ever holds what you are actually asking about.
//
// The suggestions are TAPPABLE rather than free-text-only: a person who does
// not know the vocabulary ("batch"? "arena"?) cannot search for it, but they
// can recognise it in a list. Typing still works and searches every answer.

const GREETING = "Hi! I'm the Nexus helper. What do you need help with?";

// Words that appear in almost every question, so matching them says nothing.
// Without this, "how to play stockfish" scored a generic "How do I play a game?"
// above the actual Stockfish answer, because "play" is everywhere.
const STOP = new Set([
  'how', 'the', 'and', 'for', 'you', 'your', 'can', 'does', 'did', 'what',
  'who', 'why', 'when', 'where', 'with', 'this', 'that', 'from', 'are', 'was',
  'get', 'got', 'use', 'using', 'about', 'chess', 'nexus', 'please', 'help',
]);

// Simple word-overlap scoring. Deliberately not fuzzy: a wrong-but-confident
// answer in a help centre is worse than saying "I don't have that one".
function searchArticles(text, live = []) {
  const raw = text.toLowerCase().split(/\W+/).filter(Boolean);
  // Keep short words that carry meaning here (xp, ai, nc) — dropping everything
  // under three characters lost "what is xp" entirely.
  const words = raw.filter(w => !STOP.has(w) && (w.length > 2 || /^(xp|ai|nc|ns|nx)$/.test(w)));
  if (!words.length) return [];
  // Admin-published answers first: a later duplicate loses on the dedupe below,
  // so an admin fix reliably wins over the built-in wording.
  const pool = [...live, ...ALL_ARTICLES];
  const seen = new Set();
  return pool
    .filter(a => {
      const k = a.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map(a => {
      const hay = `${a.q} ${a.a}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (!hay.includes(w)) continue;
        // A hit in the QUESTION counts double: that is what the user is asking,
        // whereas the answer body mentions many things in passing.
        score += a.q.toLowerCase().includes(w) ? 3 : 1;
      }
      return { a, score };
    })
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 4)
    // Carry the score through: the admin log stores it, so a confidently WRONG
    // match (high score, bad answer) can be told apart from a weak guess.
    .map(x => ({ ...x.a, _score: x.score }));
}

/**
 * Record a question so admins can see what people actually ask.
 *
 * Both routes are logged, tagged by `source`, because they answer different
 * questions: TYPED tells us what is MISSING from the bank (they had to write it
 * out), TAPPED tells us which existing answers are POPULAR. Pooling them would
 * hide both signals.
 *
 * Fire-and-forget on purpose: the user already has their answer on screen, and
 * a logging failure must never surface as an error in a help chat.
 */
function logQuestion(question, hit, audience, source = 'typed') {
  try {
    api.post('/api/help-queries', {
      question,
      answered: !!hit,
      matchedQ: hit?.q || '',
      matchedScore: hit?._score || 0,
      audience: audience || 'unknown',
      source,
    }).catch(() => {});
  } catch { /* never block the chat */ }
}

/**
 * Render **bold** segments. The plans use it for the subtitle above each list,
 * so the structure is visible at a glance instead of being a wall of text.
 *
 * Deliberately tiny: this handles bold and nothing else. A full markdown
 * renderer would be a dependency and an XSS surface for one piece of syntax we
 * control ourselves. Text is still rendered as text, never as HTML.
 */
function RichText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

export default function HelpCenter() {
  // turns: { from: 'bot'|'you', text, article?, chips? }
  const { user } = useAuth();
  const uid = user?.id || null;
  // One id per conversation, so saving upserts instead of appending copies.
  const [convoId, setConvoId] = useState(() => `c${Date.now()}`);
  const [history, setHistory] = useState([]);
  const [viewing, setViewing] = useState(null);   // an old chat opened read-only

  const [turns, setTurns] = useState([
    { from: 'bot', text: GREETING, chips: 'audience' },
  ]);
  const [input, setInput] = useState('');
  const [audience, setAudience] = useState(null);

  // Coaching-ask state. `elig` stays null for signed-out visitors and on any
  // error, which hides the panel entirely — better than showing a box that
  // fails on submit.
  const [elig, setElig]       = useState(null);
  const [ask, setAsk]         = useState('');
  const [askUser, setAskUser]     = useState('');
  const [askRating, setAskRating] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [askErr, setAskErr]   = useState('');
  // The bank answers first. Only when it has NO answer does the escalation
  // route appear — and then only behind a button, so nobody is invited to
  // message a moderator before the Help Center has tried.
  const [unanswered, setUnanswered] = useState(false);
  const [showAsk, setShowAsk]       = useState(false);

  const [mine, setMine] = useState([]);
  // Answers an admin wrote and published. Merged ahead of the built-in bank so
  // the help centre can be corrected without a deploy.
  const [live, setLive] = useState([]);

  useEffect(() => {
    api.get('/api/help-queries/live')
      .then(r => setLive(r.data?.items || []))
      .catch(() => setLive([]));   // fall back to the built-in bank
  }, []);

  useEffect(() => {
    api.get('/api/coaching-requests/eligibility')
      .then(r => setElig(r.data || null))
      .catch(() => setElig(null));   // signed out, or endpoint unavailable

    // Past questions and any moderator replies. Replies live HERE, in the app —
    // this is where the answer is read, so opening the page clears the unread
    // highlight and the bell.
    api.get('/api/coaching-requests/mine')
      .then(r => {
        const items = r.data?.items || [];
        setMine(items);
        if (items.some(i => i.reply && !i.readAt)) {
          api.post('/api/coaching-requests/mine/read').catch(() => {});
        }
      })
      .catch(() => setMine([]));
  }, []);

  const sendAsk = async () => {
    const text = ask.trim();
    if (!askUser.trim()) { setAskErr('Please add your Lichess username.'); return; }
    if (text.length < 20) { setAskErr('Please add a little more detail.'); return; }
    setSending(true); setAskErr('');
    try {
      const r = await api.post('/api/coaching-requests', {
        message: text,
        lichessUsername: askUser.trim(),
        lichessRating: askRating ? Number(askRating) : null,
      });
      setSent(true);
      setAsk('');
      setAskUser('');
      setAskRating('');
      // Reflect the spent message immediately so the count cannot look stale.
      setElig(e => (e ? { ...e, remaining: r.data?.remaining ?? Math.max(0, e.remaining - 1) } : e));
    } catch (err) {
      setAskErr(err.response?.data?.message || 'Could not send. Please try again.');
      if (err.response?.data?.eligibility) setElig(err.response.data.eligibility);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => { setHistory(loadConversations(uid)); }, [uid]);

  // Save after every exchange. Only for signed-in users: a shared browser must
  // not keep one person's conversation where the next person can open it.
  useEffect(() => {
    if (!uid || viewing) return;
    saveConversation(uid, { id: convoId, turns });
    setHistory(loadConversations(uid));
  }, [turns, uid, convoId, viewing]);

  // Keep the newest turn in view, the way a chat should.
  // A reply can be several bot turns in a row (an answer, then "People also
  // ask"). Find the START of that final run — that is what the reader wants at
  // the top of the screen.
  const firstOfLastReply = useMemo(() => {
    if (!turns.length) return -1;
    if (turns[turns.length - 1].from !== 'bot') return -1;
    let i = turns.length - 1;
    while (i > 0 && turns[i - 1].from === 'bot') i -= 1;
    return i;
  }, [turns]);

  // Scroll the THREAD only — never the page.
  //
  // scrollIntoView() walks up and scrolls every scrollable ancestor, including
  // the window, which yanked the whole page down on every reply. Setting
  // scrollTop on the thread container moves that element and nothing else, so
  // the page stays exactly where the user left it.
  const threadRef = useRef(null);
  // Marks the first bot turn of the newest reply, so the thread can scroll to
  // the START of an answer rather than the end of the conversation.
  const lastBotRef = useRef(null);
  useEffect(() => {
    const box = threadRef.current;
    if (!box) return;
    const el = firstOfLastReply >= 0 ? lastBotRef.current : null;
    // offsetTop is relative to the scroll container, so this needs no page
    // coordinates and cannot affect window scroll.
    const top = el ? el.offsetTop - 8 : box.scrollHeight;
    box.scrollTo({ top, behavior: 'smooth' });
  }, [turns, firstOfLastReply]);

  const topics = useMemo(
    () => HELP_SECTIONS.filter(s => !audience || s.audience === audience),
    [audience]
  );

  const say = (turn) => setTurns(t => [...t, turn]);

  /**
   * Two questions from the same topic as the one just answered.
   *
   * Same-section rather than keyword-similar: the sections are already grouped
   * by task, so a neighbour is reliably relevant, and it needs no scoring pass
   * that could surface something unrelated.
   */
  const relatedTo = (article) => {
    if (!article?.sectionId) return [];
    const section = HELP_SECTIONS.find(s => s.id === article.sectionId);
    return (section?.articles || []).filter(a => a.q !== article.q).slice(0, 2);
  };

  const pickAudience = (who, label) => {
    setAudience(who);
    say({ from: 'you', text: label });
    say({
      from: 'bot',
      text: who === 'coach'
        ? 'Great — here is what coaches usually ask about. Pick a topic, or type your question.'
        : 'Good — here is what players usually ask about. Pick a topic, or type your question.',
      chips: 'topics',
    });
  };

  const pickTopic = (section) => {
    logQuestion(`[topic] ${section.title}`, { q: section.title, _score: 0 }, audience, 'tapped');
    say({ from: 'you', text: section.title });
    // Some topics answer outright rather than offering another menu.
    if (section.directAnswer === 'improve') { startImprove(); return; }
    say({
      from: 'bot',
      text: `${section.blurb} Which one?`,
      chips: 'questions',
      sectionId: section.id,
    });
  };

  // Step 1: the universal advice, then ask how strong they are. The plan is
  // useless without that — the same words help a 1900 and mislead a 700.
  const startImprove = () => {
    say({ from: 'bot', text: IMPROVE_POINTS });
    say({ from: 'bot', text: RATING_PROMPT, chips: 'rating' });
  };

  // Step 2: the plan for their band, then the two questions people ask next.
  const givePlan = (band) => {
    logQuestion(`[level] ${band.label}`, { q: `Improvement plan ${band.label}`, _score: 0 }, audience, 'tapped');
    say({ from: 'you', text: band.label });
    say({ from: 'bot', text: band.plan });
    say({ from: 'bot', text: 'People also ask:', chips: 'followups' });
  };

  // A follow-up answer, with its own deep-links and the remaining follow-up
  // still offered — so the chain never dead-ends after one answer.
  const pickFollowup = (f) => {
    logQuestion(f.q, f, audience, 'tapped');
    say({ from: 'you', text: f.q });
    say({ from: 'bot', text: f.a, links: f.links });
    const rest = FOLLOWUPS.filter(x => x.id !== f.id);
    if (rest.length) {
      say({ from: 'bot', text: 'People also ask:', chips: 'followups', exclude: f.id });
    }
  };

  const pickQuestion = (article) => {
    logQuestion(article.q, article, audience, 'tapped');
    say({ from: 'you', text: article.q });
    say({ from: 'bot', text: article.a, article });
    // Every answer offers somewhere to go next, so the chat never dead-ends.
    const related = relatedTo(article);
    if (related.length) {
      say({ from: 'bot', text: 'People also ask:', chips: 'related', results: related });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    say({ from: 'you', text });

    // If the LAST bot turn asked for a rating, read this as the answer rather
    // than as a new question — "1400" is not a search term.
    const awaitingRating = turns[turns.length - 1]?.chips === 'rating';
    if (awaitingRating) {
      const band = bandForRating(text.replace(/[^0-9]/g, ''));
      if (band) { givePlan(band); return; }
      // Not a number: fall through and treat it as a normal question.
    }

    // An explicit "can I talk to a moderator?" opens the form straight away —
    // they are asking for the door, not for an article about the door.
    if (isModeratorRequest(text)) {
      logQuestion(text, { q: 'Message a moderator', _score: 99 }, audience);
      setUnanswered(true);
      setShowAsk(true);
      say({
        from: 'bot',
        text: 'Yes — you can message a Nexus moderator about improving your chess. Fill in the form below with your Lichess username, your current rating, and what you want help with. The reply comes back here in the Help Center.',
      });
      return;
    }

    // "How do I get better at chess?" deserves the guided plan, not a
    // one-paragraph article. Checked BEFORE the search for that reason.
    if (isImproveQuestion(text)) {
      logQuestion(text, { q: 'Improvement plan (guided)', _score: 99 }, audience);
      startImprove();
      return;
    }

    const hits = searchArticles(text, live);
    logQuestion(text, hits[0], audience);
    if (hits.length === 0) {
      setUnanswered(true);
      say({
        from: 'bot',
        text: "I don't have an answer for that one yet. Try different words, or pick a topic below.",
        chips: 'topics',
      });
      return;
    }
    // Best match answered outright; near misses offered rather than guessed at.
    say({ from: 'bot', text: hits[0].a, article: hits[0] });
    if (hits.length > 1) {
      say({ from: 'bot', text: 'Did you also mean one of these?', chips: 'results', results: hits.slice(1) });
    }
  };

  const restart = () => {
    setAudience(null);
    setViewing(null);
    // A NEW id, so the previous conversation stays in history rather than
    // being overwritten by the fresh one.
    setConvoId(`c${Date.now()}`);
    setTurns([{ from: 'bot', text: GREETING, chips: 'audience' }]);
    setHistory(loadConversations(uid));
  };

  // Open a saved conversation. Read-only: re-answering inside an old thread
  // would rewrite history that the person is looking at for reference.
  const openSaved = (c) => {
    setViewing(c.id);
    setTurns(c.turns);
  };

  const backToNew = () => {
    setViewing(null);
    setConvoId(`c${Date.now()}`);
    setTurns([{ from: 'bot', text: GREETING, chips: 'audience' }]);
  };

  const removeSaved = (id, e) => {
    e.stopPropagation();
    deleteConversation(uid, id);
    setHistory(loadConversations(uid));
    if (viewing === id) backToNew();
  };

  const renderChips = (turn) => {
    if (turn.chips === 'audience') {
      return (
        <div className="hc-chips">
          <button className="hc-chip" onClick={() => pickAudience('coach', "I'm a coach")}>🎓 I'm a coach</button>
          <button className="hc-chip" onClick={() => pickAudience('player', "I'm a player")}>♟ I'm a player</button>
        </div>
      );
    }
    if (turn.chips === 'topics') {
      return (
        <div className="hc-chips">
          {topics.map(s => (
            <button key={s.id} className="hc-chip" onClick={() => pickTopic(s)}>
              {s.icon} {s.title}
            </button>
          ))}
        </div>
      );
    }
    if (turn.chips === 'questions') {
      const s = HELP_SECTIONS.find(x => x.id === turn.sectionId);
      return (
        <div className="hc-chips hc-chips--stack">
          {s?.articles.map((a, i) => (
            <button key={i} className="hc-chip" onClick={() => pickQuestion(a)}>{a.q}</button>
          ))}
        </div>
      );
    }
    if (turn.chips === 'rating') {
      return (
        <div className="hc-chips">
          {BANDS.map(b => (
            <button key={b.id} className="hc-chip" onClick={() => givePlan(b)}>{b.label}</button>
          ))}
        </div>
      );
    }
    if (turn.chips === 'followups') {
      const shown = FOLLOWUPS.filter(f => f.id !== turn.exclude);
      return (
        <div className="hc-chips hc-chips--stack">
          {shown.map(f => (
            <button key={f.id} className="hc-chip" onClick={() => pickFollowup(f)}>{f.q}</button>
          ))}
        </div>
      );
    }
    if (turn.chips === 'related' || turn.chips === 'results') {
      return (
        <div className="hc-chips hc-chips--stack">
          {turn.results.map((a, i) => (
            <button key={i} className="hc-chip" onClick={() => pickQuestion(a)}>{a.q}</button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="hc-page">
      <div className="hc-chat">

        <header className="hc-bar">
          <div className="hc-bar-id">
            <span className="hc-bar-avatar">💡</span>
            <div>
              <strong>Nexus Help</strong>
              <span>Answers about coaching, playing and improving</span>
            </div>
          </div>
          <button className="hc-restart" onClick={restart}>Start over</button>
        </header>

        <div className="hc-thread" ref={threadRef}>
          {/* Moderator replies, above the chat: an answer the player is waiting
              for should not be below a scroll of chat they have already read. */}
          {mine.filter(m => m.reply).map(m => (
            <div key={m._id} className="hc-turn hc-turn--bot hc-turn--reply">
              <div className="hc-bubble hc-bubble--reply">
                <span className="hc-reply-tag">
                  {m.readAt ? 'Nexus moderator' : '✨ New reply from a Nexus moderator'}
                </span>
                <span className="hc-reply-q">You asked: {m.message}</span>
                <span className="hc-reply-body">{m.reply}</span>
              </div>
            </div>
          ))}

          {turns.map((t, i) => (
            <div
              key={i}
              // Mark the FIRST bot turn of the newest reply block, so scrolling
              // lands on the start of the answer rather than its last line.
              ref={i === firstOfLastReply ? lastBotRef : null}
              className={`hc-turn hc-turn--${t.from}`}
            >
              <div className="hc-bubble">
                <RichText text={t.text} />
                {t.article?.to && (
                  <Link className="hc-open" to={t.article.to}>Open it →</Link>
                )}
                {/* Deep-links for a follow-up answer: the tools it just named. */}
                {t.links?.length > 0 && (
                  <span className="hc-links">
                    {t.links.map(l => (
                      <Link key={l.to} className="hc-link-pill" to={l.to}>{l.label} →</Link>
                    ))}
                  </span>
                )}
              </div>
              {/* Chips are hidden in an archived chat: tapping one would append
                  a new turn to a conversation the person is reading back. */}
              {t.from === 'bot' && !viewing && renderChips(t)}
            </div>
          ))}

          {/* Escalation — shown ONLY after the bank has failed to answer
              something. The Help Center answers from what it knows first; a
              human is the last resort, not the first offer. Still one more tap
              behind a button, so nobody drifts into messaging a moderator. */}
          {unanswered && (
            <div className="hc-turn hc-turn--bot">
              <div className="hc-bubble hc-bubble--ask">
                Still not what you needed?
                <span className="hc-ask-note">
                  For your account, billing or a bug, <Link className="hc-open-inline" to="/contact">contact the Nexus team</Link>.
                  For advice on your chess, you can message a moderator.
                </span>

                {!showAsk && (
                  <button className="hc-ask-open" onClick={() => setShowAsk(true)}>
                    Message a moderator
                  </button>
                )}

                {/* Coaching ask. Rendered only once they have asked for it, and
                    only for signed-in players; eligibility decides usability. */}
                {showAsk && elig && (
                  elig.canAsk ? (
                    <>
                      <div className="hc-ask-divider" />
                      <strong>Want advice on improving your chess?</strong>
                      <span className="hc-ask-note">
                        Ask a Nexus moderator what to practise and how to use the app to get
                        better. {elig.remaining} of {elig.limit} message{elig.limit > 1 ? 's' : ''} left this month
                        {!elig.supporter && ' · supporters get 3'}.
                      </span>
                      {sent ? (
                        <span className="hc-ask-ok">
                          ✓ Sent. The reply appears here in the Help Center — you will get a
                          bell notification when it arrives, usually within a few days.
                        </span>
                      ) : (
                        <>
                          {/* Three fields, not one box: a moderator cannot give
                              useful advice without knowing WHO to look up and
                              HOW STRONG they are, and people leave those out of
                              free text. Asking explicitly gets both every time. */}
                          <label className="hc-field">
                            <span>Your Lichess username</span>
                            <input
                              value={askUser}
                              onChange={e => setAskUser(e.target.value)}
                              maxLength={50}
                              placeholder="e.g. magnus_fan_2011"
                            />
                          </label>
                          <label className="hc-field">
                            <span>Your current Lichess rating</span>
                            <input
                              value={askRating}
                              onChange={e => setAskRating(e.target.value.replace(/[^0-9]/g, ''))}
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="e.g. 1250"
                            />
                          </label>
                          <label className="hc-field">
                            <span>What do you want help with?</span>
                            <textarea
                              className="hc-ask-box"
                              value={ask}
                              onChange={e => setAsk(e.target.value)}
                              rows={4}
                              maxLength={2000}
                              placeholder="How you practise now, and what feels stuck. The more you say, the more useful the answer."
                            />
                          </label>
                          {askErr && <span className="hc-ask-err">{askErr}</span>}
                          <button
                            className="hc-ask-send"
                            disabled={sending || ask.trim().length < 20 || !askUser.trim()}
                            onClick={sendAsk}
                          >
                            {sending ? 'Sending…' : 'Send to a moderator'}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="hc-ask-divider" />
                      <span className="hc-ask-note">
                        {elig.reason === 'rating'
                          ? `Moderator coaching help is for players rated ${elig.minRating}+ on Chess Nexus, Lichess or Chess.com. Until then, the fastest way up is daily puzzles and My Moments — ask me about either.`
                          : `You have used your ${elig.limit} message${elig.limit > 1 ? 's' : ''} for this month.${elig.supporter ? '' : ' Supporters can send 3.'}`}
                      </span>
                    </>
                  )
                )}
              </div>
            </div>
          )}

        </div>

        {/* Reading an old conversation: no composer, just a way back. */}
        {viewing ? (
          <div className="hc-viewing-bar">
            <span>Viewing an earlier conversation</span>
            <button onClick={backToNew}>Start a new question →</button>
          </div>
        ) : (
        <form className="hc-composer" onSubmit={submit}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your question…"
            aria-label="Type your question"
          />
          <button type="submit" disabled={!input.trim()}>Send</button>
        </form>
        )}
      </div>

      {/* Earlier conversations — OUTSIDE the chat card, so the card's whole
          height belongs to the conversation itself. */}
      {history.length > 0 && (
        <div className="hc-history">
          <div className="hc-history-head">
            Earlier conversations <span>· kept {TTL_DAYS} days</span>
          </div>
          <div className="hc-history-list">
            {history.map(c => (
              <button
                key={c.id}
                className={`hc-history-card${viewing === c.id ? ' is-open' : ''}`}
                onClick={() => openSaved(c)}
              >
                <span className="hc-history-q">{conversationTitle(c)}</span>
                <span className="hc-history-meta">
                  {relativeDay(c.at)} · {c.turns.length} messages
                </span>
                <span
                  className="hc-history-x"
                  role="button"
                  tabIndex={0}
                  aria-label="Delete this conversation"
                  onClick={(e) => removeSaved(c.id, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter') removeSaved(c.id, e); }}
                >×</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
