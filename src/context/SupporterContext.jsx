// SupporterContext — fetches the set of active coffee-supporter usernames once
// on app mount and re-fetches every 5 minutes. Any component can call
// useIsSupporter(username) to check if a user currently has the ☕ badge.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const SupporterContext = createContext({ set: new Set(), refresh: () => {} });

export function SupporterProvider({ children }) {
  const [supporterSet, setSupporterSet] = useState(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/api/coffee/active-usernames');
      setSupporterSet(new Set(res.data.usernames || []));
    } catch {
      // silently ignore — badge is best-effort
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <SupporterContext.Provider value={{ set: supporterSet, refresh }}>
      {children}
    </SupporterContext.Provider>
  );
}

/** Returns true if the given username is an active coffee supporter. */
export function useIsSupporter(username) {
  const { set } = useContext(SupporterContext);
  return username ? set.has(username) : false;
}

/** Returns the refresh function to force-reload supporter badges. */
export function useSupporterRefresh() {
  const { refresh } = useContext(SupporterContext);
  return refresh;
}

export default SupporterContext;
