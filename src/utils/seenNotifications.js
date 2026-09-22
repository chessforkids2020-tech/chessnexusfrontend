// utils/seenNotifications.js
//
// Read state for the sidebar bell's app-wide notifications.
//
// The bell already tracks which notifications a user has seen, in localStorage
// keyed by notification id (see components/Sidebar.jsx). That state was only
// ever written by opening the bell itself — so a reader who clicked through to
// a newsletter post, read the whole thing and came back still had the bell
// showing an unread dot for the very post they had just read.
//
// This exposes the same store so a page can say "the user has now seen the
// notification that pointed here". Kept as a tiny module rather than lifted
// into context: the bell's state is local to the sidebar, and a shared store
// via localStorage is what the two already have in common.
//
// Every accessor is guarded — localStorage throws in private windows and when
// site data is blocked, and a bell that cannot remember reads is a far smaller
// problem than a page that will not render.
const KEY = 'seenNotificationIds';

export function getSeenIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

/**
 * Mark one or more notification ids as seen.
 *
 * Fires a `notifications:seen` event afterwards, because a sidebar that is
 * already mounted holds this set in React state and would otherwise keep its
 * stale copy until the next reload — the dot would linger exactly as before.
 */
export function markSeen(ids) {
  const add = (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean);
  if (!add.length) return;
  try {
    const next = [...new Set([...getSeenIds(), ...add])];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('notifications:seen', { detail: { ids: add } }));
  } catch { /* storage unavailable — the bell simply keeps its dot */ }
}

/**
 * Mark whatever notification points at `path` as seen.
 *
 * Matches on the notification's own `link`, so this needs the current list —
 * the caller passes it in rather than this module fetching, since the page that
 * knows it was opened is not the page that holds the notifications.
 */
export function markSeenByLink(notifications, path) {
  const hit = (notifications || [])
    .filter(n => n?.link && String(n.link) === String(path))
    .map(n => n.id);
  markSeen(hit);
}
