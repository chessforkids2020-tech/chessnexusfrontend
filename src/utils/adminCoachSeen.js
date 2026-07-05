// Per-admin "seen" sets for the admin dashboard nav pips (🎓 Coaches, ☕ Supporters).
//
// These pips count items that "need attention" (unverified coaches, pending
// supporters). By default the pip only clears when the admin acts on each item.
// The admin, however, only wants to be alerted to NEW ones — so once they open
// the relevant list, we mark the current ids "seen" and the pip clears. It
// re-appears only when a brand-new item shows up.
//
// Scoped by admin user id — coaches log into many accounts on one shared browser,
// so we must never use a global key.

// category: 'coaches' | 'supporters'
function seenKey(category, userId) {
  return `admin:seen:${category}:${userId || 'anon'}`;
}

export function getSeenIds(category, userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(category, userId)) || '[]'));
  } catch {
    return new Set();
  }
}

export function markIdsSeen(category, userId, ids) {
  const merged = new Set([...getSeenIds(category, userId), ...(ids || []).map(String)]);
  localStorage.setItem(seenKey(category, userId), JSON.stringify([...merged]));
}

// Count of ids not yet dismissed by this admin — what the nav pip should show.
export function unseenCount(category, userId, ids) {
  const seen = getSeenIds(category, userId);
  return (ids || []).filter(id => !seen.has(String(id))).length;
}

// ── Back-compat named helpers (coaches were wired first) ──────────────────────
export const getSeenCoachIds = (userId) => getSeenIds('coaches', userId);
export const markCoachIdsSeen = (userId, ids) => markIdsSeen('coaches', userId, ids);
