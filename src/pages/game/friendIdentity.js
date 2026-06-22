// Shared identity helper for Play-with-a-Friend (works for guests and logged-in
// users). Mirrors the arcade guest pattern (sessionStorage guest id).

export function getFriendGuestId() {
  let gid = sessionStorage.getItem('friend_guest_id');
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem('friend_guest_id', gid);
  }
  return gid;
}

export function getFriendIdentity(user) {
  const guestId = user ? null : getFriendGuestId();
  const userId = user?._id || user?.id || guestId;
  const displayName =
    user?.displayName ||
    user?.username ||
    user?.name ||
    ('Guest_' + (guestId || '').slice(-5));
  const username = user?.username || displayName;
  const profilePhotoUrl = user?.profilePhotoUrl || null;
  const activeAvatar = user?.activeAvatar || null; // basic-avatar key (resolved to an imageUrl client-side)
  return { userId, displayName, username, profilePhotoUrl, activeAvatar, isGuest: !user };
}

// Time-control presets shown on the Create screen.
// Each value is { base: <minutes>, increment: <seconds> }.
export const TIME_CONTROL_PRESETS = [
  { label: '1+0', base: 1, increment: 0 },
  { label: '2+1', base: 2, increment: 1 },
  { label: '3+0', base: 3, increment: 0 },
  { label: '5+0', base: 5, increment: 0 },
  { label: '5+3', base: 5, increment: 3 },
  { label: '10+0', base: 10, increment: 0 },
  { label: '10+5', base: 10, increment: 5 },
  { label: '15+0', base: 15, increment: 0 },
];
