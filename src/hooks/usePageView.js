import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

/**
 * Fires a `pageview` event on every route change and attaches the time spent on
 * the PREVIOUS page (durationMs) so the dashboard can compute avg time per page.
 * Mount once, high in the tree (inside the Router).
 */
export default function usePageView() {
  const location = useLocation();
  const prev = useRef({ path: null, since: Date.now() });

  useEffect(() => {
    const now = Date.now();
    const { path, since } = prev.current;

    trackPageView(location.pathname, {
      from: path,
      durationMs: path ? now - since : 0
    });

    prev.current = { path: location.pathname, since: now };
  }, [location.pathname]);
}
