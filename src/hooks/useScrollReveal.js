import { useEffect } from 'react';

// Scroll-triggered entrances. Every [data-reveal] element inside `ref` gets a
// data-revealed attribute the first time it scrolls into view; CSS keeps its
// animations paused until then. A data attribute (not a class) so React
// re-renders never wipe it. Elements in a hidden tab never intersect, so they
// wait until the tab is opened. Runs once per element — no replay.
export default function useScrollReveal(ref, deps = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = [...root.querySelectorAll('[data-reveal]:not([data-revealed])')];
    if (root.matches('[data-reveal]:not([data-revealed])')) items.push(root);
    const show = (el) => el.setAttribute('data-revealed', '');

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      items.forEach(show);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
