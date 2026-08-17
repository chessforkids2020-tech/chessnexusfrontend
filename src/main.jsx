// FIRST, before any other import: dependencies log while they initialise, so
// installing this later would let their first lines through. Production only —
// it no-ops in dev. Our own console.* calls are already dropped at build time
// (see vite.config.js); this covers pre-minified deps esbuild cannot reach.
import { silenceConsole } from "./lib/silenceConsole";
silenceConsole();

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import ScheduleFloatingButton from "./components/ScheduleFloatingButton";
import LiveNoteBanner from "./components/LiveNoteBanner";
// Design tokens FIRST, in this order — everything below them may reference the
// variables they declare.
//   layout  : sizes, spacing, radii, type. Shared by all six themes.
//   themes  : the six colour palettes, selected by <html data-theme="...">.
//   aliases : old token names (--primary-color, --obsidian-*) re-pointed at the
//             new ones, so existing call sites keep working.
import "./styles/tokens/layout.css";
import "./styles/tokens/themes.css";
import "./styles/tokens/aliases.css";
// Button GEOMETRY (padding/radius/size) for every existing button convention,
// pointed at the --btn-* tokens. Colour is left to each convention. Loaded
// before page CSS so a page that genuinely needs a different size still wins.
import "./styles/tokens/buttons.css";

import "./index.css";
// Repaints the inline-styled admin pages for dark themes. Scoped to
// html.admin-dark, which App.jsx toggles on /admin* routes — it can never
// affect a normal page.
import "./styles/admin-dark.css";
import "./components/layout.css";
import "./styles/breakpoints.css";

const rootEl = document.getElementById("root");

const app = (
  <HelmetProvider>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <ScheduleFloatingButton />
      <LiveNoteBanner />
      <App />
    </BrowserRouter>
  </HelmetProvider>
);

// Prerendered pages (see prerender.js) ship real HTML inside #root so crawlers
// and AI readers get the full content without running JS. That markup has done
// its job by the time this runs, so we do NOT hydrate into it — we replace it
// with a clean client render.
//
// Why not hydrate: hydrateRoot demands the first client render match the served
// HTML byte for byte. MarketingLayout deliberately omits the sidebar during
// prerender (window.__PRERENDER__ keeps `mounted` false), but in a real browser
// `mounted` is already true when React hydrates — so React rendered a <Sidebar>
// where the HTML had none, and every node after it shifted. That produced React
// #418/#423/#425 on EVERY prerendered page (4 errors on /features, 13 on the
// longer /chess-academy-pricing), which then flooded the analytics error feed.
// The pages still *looked* fine because React recovers by re-rendering — so the
// only visible symptom was the error noise and a wasted first paint.
//
// Clearing #root first makes that recovery explicit and free of errors. SEO is
// unaffected: crawlers read the prerendered HTML in the response, before any of
// this executes.
if (rootEl.hasChildNodes()) {
  rootEl.innerHTML = '';
}
ReactDOM.createRoot(rootEl).render(app);
