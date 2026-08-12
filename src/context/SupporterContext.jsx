// SupporterContext — fetches the set of active coffee-supporter identifiers once
// on app mount and re-fetches every 5 minutes. Any component can call
// useIsSupporter(username, displayName) to check if a user currently has the ☕
// badge. Matching is done on username OR displayName (case-insensitive) plus
// userId, because different lists across the app render different fields.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const EMPTY = {
  keys: new Set(), ids: new Set(),
  // Founding Supporters (first 100 backers) — they get a permanent 👑.
  foundingKeys: new Set(), foundingIds: new Set(),
  // Nexus title per identifier: Map<lowercased username|displayName|userId,
  // 'NS' | 'NX'>. Only tiers that carry a title appear here — Black Coffee
  // supporters are in `keys` (so they get the ♞) but not in `titles`.
  titles: new Map(),
};

const SupporterContext = createContext({ ...EMPTY, refresh: () => {} });

const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase());

export function SupporterProvider({ children }) {
  const [supporters, setSupporters] = useState(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/api/coffee/active-usernames');
      const data = res.data || {};
      // Prefer the combined `keys` array (usernames + displayNames, lowercased)
      // returned by the backend; fall back to the legacy `usernames` field so an
      // older backend still lights up the badge by username.
      const rawKeys = Array.isArray(data.keys) && data.keys.length
        ? data.keys
        : [...(data.usernames || []), ...(data.displayNames || [])];
      const keys = new Set(rawKeys.map(norm).filter(Boolean));
      const ids = new Set((data.userIds || []).map(String));
      // Founder sets are absent on an older backend — the ☕ badge still works.
      const foundingKeys = new Set((data.foundingKeys || []).map(norm).filter(Boolean));
      const foundingIds = new Set((data.foundingUserIds || []).map(String));
      // Nexus titles. Absent on an older backend — the ♞ badge still works, so
      // this degrades to "supporter, no title" rather than breaking.
      const titles = new Map(
        Object.entries(data.titles || {}).map(([k, v]) => [norm(k), v])
      );
      setSupporters({ keys, ids, foundingKeys, foundingIds, titles });
    } catch (err) {
      // Badge is best-effort, but log so this doesn't fail invisibly again.
      console.warn('SupporterContext refresh failed:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <SupporterContext.Provider value={{ ...supporters, refresh }}>
      {children}
    </SupporterContext.Provider>
  );
}

/**
 * Returns true if the given player is an active coffee supporter.
 * Matches on username OR displayName (case-insensitive), or userId when provided.
 * Usage: useIsSupporter(username, displayName, userId) — all optional.
 */
export function useIsSupporter(username, displayName, userId) {
  const { keys, ids } = useContext(SupporterContext);
  if (userId && ids.has(String(userId))) return true;
  const u = norm(username);
  if (u && keys.has(u)) return true;
  const d = norm(displayName);
  if (d && keys.has(d)) return true;
  return false;
}

/**
 * Returns true if the given player is a FOUNDING supporter (one of the first 100),
 * whose 👑 badge is permanent and never expires. Same matching rules as
 * useIsSupporter. A founder is always also a supporter.
 */
export function useIsFoundingSupporter(username, displayName, userId) {
  const { foundingKeys, foundingIds } = useContext(SupporterContext);
  if (userId && foundingIds.has(String(userId))) return true;
  const u = norm(username);
  if (u && foundingKeys.has(u)) return true;
  const d = norm(displayName);
  if (d && foundingKeys.has(d)) return true;
  return false;
}

/**
 * The player's ChessNexus title — 'NS' (Nexus Supporter), 'NX' (Nexus Expert),
 * or null. Same matching rules as useIsSupporter.
 *
 * Null does NOT mean "not a supporter": the entry-level tier grants the ♞ badge
 * and no letters. Use useIsSupporter for that question.
 */
export function useNexusTitle(username, displayName, userId) {
  const { titles } = useContext(SupporterContext);
  if (!titles || titles.size === 0) return null;
  if (userId) {
    const byId = titles.get(norm(userId));
    if (byId) return byId;
  }
  const u = norm(username);
  if (u && titles.has(u)) return titles.get(u);
  const d = norm(displayName);
  if (d && titles.has(d)) return titles.get(d);
  return null;
}

/** Returns the refresh function to force-reload supporter badges. */
export function useSupporterRefresh() {
  const { refresh } = useContext(SupporterContext);
  return refresh;
}

export default SupporterContext;
