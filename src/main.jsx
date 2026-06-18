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

ReactDOM.createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <ScheduleFloatingButton />
      <LiveNoteBanner />
      <App />
    </BrowserRouter>
  </HelmetProvider>
);
