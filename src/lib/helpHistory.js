// Saved Help Center conversations.
//
// WHY THIS EXISTS
// The chat lived only in React state, so a reload wiped it — including the
// question someone had just asked a moderator. That is exactly the moment they
// come back to check for a reply, and finding an empty screen makes it look
// like the message was never sent.
//
// SCOPED PER USER ACCOUNT
// Coaches log into many student accounts from one browser, so a global key
// would show one student another student's conversation. Every key carries the
// user id. Signed-out visitors get no history at all rather than a shared
// "guest" bucket that leaks between people on a shared machine.
//
// TEN DAYS
// Long enough to come back for a moderator reply, short enough that a browser
// does not accumulate months of chat. Expiry is checked on read, so it applies
// even if the user never opens the page during the window.

const PREFIX = 'help:convos';
const TTL_DAYS = 10;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_CONVOS = 20;      // newest kept; older ones drop off
const MAX_TURNS = 60;       // per conversation, so one session cannot bloat storage

const keyFor = (uid) => `${PREFIX}:${uid}`;

/** All non-expired conversations for this user, newest first. */
export function loadConversations(uid) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const all = JSON.parse(raw);
    if (!Array.isArray(all)) return [];

    const cutoff = Date.now() - TTL_MS;
    const live = all.filter(c => c && typeof c.at === 'number' && c.at >= cutoff);

    // Write back only when something actually expired, so a plain read does
    // not churn storage on every page load.
    if (live.length !== all.length) {
      localStorage.setItem(keyFor(uid), JSON.stringify(live));
    }
    return live.sort((a, b) => b.at - a.at);
  } catch {
    // Private mode, quota, or corrupt JSON — history is a convenience, never
    // a reason for the Help Center to fail.
    return [];
  }
}

/**
 * Insert or update one conversation.
 *
 * Upsert by id rather than append: the live conversation saves on every turn,
 * and appending would leave a trail of partial copies of the same chat.
 */
export function saveConversation(uid, convo) {
  if (!uid || !convo?.id || !Array.isArray(convo.turns)) return;
  // A greeting with no exchange is not worth keeping.
  if (convo.turns.length < 2) return;
  try {
    const all = loadConversations(uid).filter(c => c.id !== convo.id);
    const trimmed = {
      ...convo,
      at: Date.now(),
      turns: convo.turns.slice(-MAX_TURNS),
    };
    const next = [trimmed, ...all].slice(0, MAX_CONVOS);
    localStorage.setItem(keyFor(uid), JSON.stringify(next));
  } catch {
    // Out of quota: drop the oldest and try once more before giving up.
    try {
      const all = loadConversations(uid).filter(c => c.id !== convo.id).slice(0, 5);
      localStorage.setItem(keyFor(uid), JSON.stringify([{ ...convo, at: Date.now() }, ...all]));
    } catch { /* give up quietly */ }
  }
}

export function deleteConversation(uid, id) {
  if (!uid) return;
  try {
    const left = loadConversations(uid).filter(c => c.id !== id);
    localStorage.setItem(keyFor(uid), JSON.stringify(left));
  } catch { /* nothing to do */ }
}

export function clearConversations(uid) {
  if (!uid) return;
  try { localStorage.removeItem(keyFor(uid)); } catch { /* nothing to do */ }
}

/**
 * A short label for the history card: the first thing the person actually
 * asked, rather than the bot's greeting.
 */
export function conversationTitle(convo) {
  const firstUser = convo.turns?.find(t => t.from === 'you');
  const text = firstUser?.text || 'Help conversation';
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** "today" / "3 days ago" — friendlier than a date in a list this short-lived. */
export function relativeDay(ts) {
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export { TTL_DAYS };
