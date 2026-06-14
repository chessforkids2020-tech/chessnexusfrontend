// src/pages/ResendVerificationPage.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";

export default function ResendVerificationPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/resend-verification", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.logo}>♟️</div>
        <h1 style={s.title}>Chess Nexus</h1>

        {!sent ? (
          <>
            <h2 style={s.heading}>Resend Verification Email</h2>
            <p style={s.sub}>
              Enter the email address you signed up with and we'll send you a fresh verification link.
            </p>
            <form onSubmit={handleSubmit} style={s.form}>
              {error && <div style={s.error}>{error}</div>}
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                required
                autoFocus
              />
              <button type="submit" style={s.btn} disabled={loading}>
                {loading ? "Sending…" : "Send Verification Email"}
              </button>
            </form>
            <p style={{ ...s.sub, marginTop: 20 }}>
              Already verified?{" "}
              <Link to="/login" style={s.link}>Log in</Link>
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📬</div>
            <h2 style={{ ...s.heading, color: "#4ade80" }}>Email Sent!</h2>
            <p style={s.sub}>
              If an account exists for that email, a fresh verification link has been sent.
              Check your inbox (and spam folder).
            </p>
            <Link to="/login" style={s.btn}>Go to Login →</Link>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
    padding: 20,
    position: "relative",
    overflow: "hidden"
  },
  bg: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(circle at 30% 40%, rgba(109,40,217,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(79,70,229,0.1) 0%, transparent 50%)",
    pointerEvents: "none"
  },
  card: {
    position: "relative",
    zIndex: 1,
    maxWidth: 440,
    width: "100%",
    background: "rgba(23,23,23,0.85)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "48px 40px",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)"
  },
  logo: { fontSize: 48, marginBottom: 4 },
  title: {
    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 32px"
  },
  heading: { fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px" },
  sub: { color: "#94a3b8", fontSize: 14, lineHeight: 1.7, margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: 14, margin: "24px 0 0" },
  input: {
    padding: "12px 16px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box"
  },
  btn: {
    display: "inline-block",
    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(109,40,217,0.35)"
  },
  error: {
    padding: 12,
    background: "rgba(239,68,68,0.1)",
    color: "#ef4444",
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.2)",
    fontSize: 13
  },
  link: { color: "#8b5cf6", fontWeight: 600, textDecoration: "none" }
};
