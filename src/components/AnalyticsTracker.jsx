import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import usePageView from '../hooks/usePageView';
import { trackEvent } from '../lib/analytics';

const SCROLL_MILESTONES = [25, 50, 75, 100];

/**
 * Headless analytics component. Render once inside the Router (and AuthProvider).
 * Handles:
 *  - page views (via usePageView)
 *  - scroll-depth milestones (25/50/75/100%), reset per route
 *  - delegated button_click capture for any element marked with `data-track`
 *    e.g. <button data-track="play_now"> — value becomes the event label.
 */
export default function AnalyticsTracker() {
  usePageView();
  const location = useLocation();
  const firedRef = useRef(new Set());

  // Scroll-depth milestones, reset whenever the route changes.
  useEffect(() => {
    firedRef.current = new Set();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !firedRef.current.has(m)) {
          firedRef.current.add(m);
          trackEvent('scroll_depth', { depth: m });
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  // Delegated button_click capture for elements opted-in with data-track.
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target?.closest?.('[data-track]');
      if (!el) return;
      trackEvent('button_click', {
        label: el.getAttribute('data-track'),
        text: (el.innerText || '').trim().slice(0, 60) || null
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
