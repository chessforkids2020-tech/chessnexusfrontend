import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import ScheduleFloatingButton from "./components/ScheduleFloatingButton";
import LiveNoteBanner from "./components/LiveNoteBanner";
import "./index.css";
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
