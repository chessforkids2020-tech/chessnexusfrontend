import React from "react";
import './arcade.css';

// Shared theme, layout helpers, and constants for arcade pages
const T = {
  bg: "#0a0a0a",
  bgRadial: "radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
  glass: "rgba(23, 23, 23, 0.7)",
  glassBorder: "rgba(255, 255, 255, 0.05)",
  glassShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  blur: "blur(10px)",
  blurHeavy: "blur(12px)",
  accent1: "#06b6d4",
  accent2: "#10b981",
  accentGrad: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
  accentGlow: "0 4px 16px rgba(6, 182, 212, 0.4)",
  text: "#ffffff",
  textMuted: "#9ca3af",
  textDim: "#6b7280",
  p1: "#f59e0b",
  p2: "#06b6d4",
  correct: "#10b981",
  wrong: "#ef4444",
  font: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

// API base: use full backend URL in production, relative path in dev
const _BACKEND = import.meta.env.VITE_API_URL || "";
const API_BASE = `${_BACKEND}/api/arcade`;
// prefer explicit env var; fall back to API URL or window origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : window.location.origin);

// no client-side fallback puzzles/themes – all content must come from the database
const FALLBACK_PUZZLES = [];
const FALLBACK_THEMES = [];

// sidebar occupies fixed width in Layout (same as Sidebar.styles.sidebar.width)
const SIDEBAR_WIDTH = 170;
const SIDEBAR_GUTTER = 16; // extra spacing between sidebar and page
const SIDEBAR_OFFSET = SIDEBAR_WIDTH + SIDEBAR_GUTTER;

// Small UI helpers using inline styles

function PageWrap({ children, maxWidth = 1000 }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, background: T.bgRadial, pointerEvents: "none" }} />
      <div style={{ maxWidth, margin: "0 auto", position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function GlassCard({ children, style = {}, hover = false, onClick, className }) {
  const base = {
    background: T.glass,
    border: `1px solid ${T.glassBorder}`,
    borderRadius: 16,
    boxShadow: T.glassShadow,
    padding: 16,
  };
  return (
    <div className={className} onClick={onClick} style={{ ...base, ...(hover ? { transition: "all 0.18s", cursor: "pointer" } : {}), ...style }}>{children}</div>
  );
}

function GradHeading({ children, size = 28, style = {} }) {
  return <div style={{ fontSize: size, fontWeight: 700, margin: 0, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...style }}>{children}</div>;
}

function Btn({ children, onClick, primary, ghost, full, style = {} }) {
  const base = { border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: T.font };
  const primaryStyle = primary ? { background: T.accentGrad, color: "#fff", boxShadow: T.accentGlow } : {};
  const ghostStyle = ghost ? { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: T.textMuted } : {};
  const fullStyle = full ? { width: "100%" } : {};
  return (
    <button onClick={onClick} style={{ ...base, ...primaryStyle, ...ghostStyle, ...fullStyle, ...style }}>{children}</button>
  );
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{ background: `${T.wrong}15`, border: `1px solid ${T.wrong}40`, borderRadius: 10, padding: "10px 14px", color: T.wrong, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>{message}</div>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.wrong, cursor: 'pointer' }}>×</button>}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}

const BOARD_SIZES = [
  { s: 3, label: '3 × 3', tag: 'Quick', color: T.p1 },
  { s: 4, label: '4 × 4', tag: 'Balanced', color: T.p2 },
  { s: 5, label: '5 × 5', tag: 'Full', color: T.wrong },
];

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'); } catch { return null; }
}

function OnlineDot({ connected, username }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: 10, background: connected ? T.correct : T.wrong }} />
      <div style={{ color: connected ? T.correct : T.wrong, fontSize: 12 }}>{connected ? `Connected as ${username}` : 'Connecting...'}</div>
    </div>
  );
}

export {
  T, PageWrap, GlassCard, GradHeading, Btn, ErrorBanner, SectionLabel,
  BOARD_SIZES, SOCKET_URL, API_BASE,
  SIDEBAR_WIDTH, SIDEBAR_GUTTER, SIDEBAR_OFFSET,
  getUser, OnlineDot,
};
