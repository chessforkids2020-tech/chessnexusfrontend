// src/pages/VerifyEmailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

const STATUS = { LOADING: "loading", SUCCESS: "success", EXPIRED: "expired", ERROR: "error" };

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus(STATUS.ERROR); return; }
    api.get(`/api/auth/verify-email/${token}`)
      .then((res) => {
        setStatus(STATUS.SUCCESS);
        setMessage(res.data.message || "Email verified successfully!");
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Verification failed.";
        if (msg === "LINK_EXPIRED") {
          setStatus(STATUS.EXPIRED);
        } else {
          setStatus(STATUS.ERROR);
          setMessage(msg);
        }
      });
  }, [token]);

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.logo}><img src="/logo.png" alt="Chess Nexus" style={{ height: 48, width: 'auto', objectFit: 'contain' }} /></div>
        <h1 style={s.title}>Chess Nexus</h1>

        {status === STATUS.LOADING && (
          <>
            <div style={s.spinner} />
            <p style={s.sub}>Verifying your email…</p>
          </>
        )}

        {status === STATUS.SUCCESS && (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ ...s.heading, color: "#4ade80" }}>Email Verified!</h2>
            <p style={s.body}>{message}</p>
            <Link to="/login" style={s.btn}>Go to Login →</Link>
          </>
        )}

        {status === STATUS.EXPIRED && (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>⏰</div>
            <h2 style={{ ...s.heading, color: "#fbbf24" }}>Link Expired</h2>
            <p style={s.body}>
              This verification link has expired. Verification links are valid for 24 hours.
            </p>
            <Link to="/resend-verification" style={s.btn}>Request a New Link →</Link>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
            <h2 style={{ ...s.heading, color: "#f87171" }}>Verification Failed</h2>
            <p style={s.body}>{message}</p>
            <Link to="/resend-verification" style={s.btn}>Request a New Link →</Link>
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
  logo: { marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: {
    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 32px"
  },
  spinner: {
    width: 48,
    height: 48,
    border: "4px solid rgba(139,92,246,0.2)",
    borderTopColor: "#8b5cf6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 20px"
  },
  sub: { color: "#94a3b8", fontSize: 15 },
  heading: { fontSize: 22, fontWeight: 700, margin: "0 0 12px" },
  body: { color: "#94a3b8", fontSize: 15, lineHeight: 1.7, margin: "0 0 28px" },
  btn: {
    display: "inline-block",
    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
    boxShadow: "0 4px 16px rgba(109,40,217,0.35)"
  }
};
