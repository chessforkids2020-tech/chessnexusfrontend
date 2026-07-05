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

// Prerendered pages (see prerender.js) ship real HTML inside #root — hydrate
// into it so React reuses the markup crawlers already saw. Non-prerendered
// routes get an empty #root, so fall back to a fresh client render.
if (rootEl.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootEl, app);
} else {
  ReactDOM.createRoot(rootEl).render(app);
}
