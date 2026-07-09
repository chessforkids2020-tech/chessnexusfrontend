import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import './UserLayout.css';

/**
 * Layout for the PUBLIC, prerendered SEO/marketing pages.
 *
 * Why this exists (and why it isn't just UserLayout):
 * UserLayout's very first render branches on useAuth() `user`, on
 * window.innerWidth (isMobile), and on localStorage — all of which differ
 * between the build-time prerender (headless, no auth, aborted API) and a real
 * client. React then hydrates the prerendered #root against a DIFFERENT first
 * render and throws hydration errors #418/#423/#425 (which flooded analytics
 * with guest "error" events). AI crawlers that don't run JS (GPTBot, ClaudeBot,
 * PerplexityBot) depend on the prerendered HTML, so we must KEEP prerendering
 * these pages — we just have to make the first render deterministic.
 *
 * The rule: the FIRST render must be identical on server (prerender) and client
 * so hydration matches. We do that by rendering ONLY the page content + footer
 * initially — no auth/viewport-dependent sidebar. After mount (post-hydration)
 * we flip `mounted` and bring in the interactive Sidebar, so logged-in users
 * still get the full app chrome. Crawlers keep the fully-baked marketing HTML.
 */
export default function MarketingLayout({ children }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // During the build-time prerender we must capture the PRE-mount markup so
    // it matches every real client's first (mounted=false) render and hydration
    // never mismatches. prerender.js sets window.__PRERENDER__ = true, so skip
    // the interactive upgrade there. Real browsers upgrade normally.
    if (typeof window !== 'undefined' && window.__PRERENDER__) return;
    setMounted(true);
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 1024);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, []);

  // The FIRST render (both the build-time prerender snapshot AND the client's
  // very first paint) must be byte-identical so hydration never mismatches.
  // We therefore keep the wrapper markup 100% constant here — same elements,
  // same classNames — and only ADD the interactive sidebar/chrome AFTER mount,
  // driven by state changes (which React applies post-hydration, not during it).
  // Nothing that varies between prerender and client (auth `user`, window size)
  // touches the first render's output.
  const showSidebar = mounted && !isMobile;
  const showMobileChrome = mounted && isMobile;

  return (
    <div className="user-layout-container">
      <div className="user-content-wrapper">
        {showSidebar && <Sidebar user={user} />}

        {showMobileChrome && isSidebarOpen && (
          <>
            <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            <div className="sidebar-mobile">
              <Sidebar user={user} onNavigate={() => setIsSidebarOpen(false)} />
            </div>
          </>
        )}

        {showMobileChrome && !isSidebarOpen && (
          <button className="floating-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
        )}

        {/* Constant className — never depends on mounted/auth/viewport, so the
            first render matches the prerender exactly. The sidebar (added above
            post-mount) overlays via CSS; content stays put. */}
        <div className="user-main-content with-sidebar desktop">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
