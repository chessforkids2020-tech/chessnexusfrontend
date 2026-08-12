/**
 * LoginPage - Simple JWT-based login
 * Obsidian Glass Theme
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api";

// Build a cross-app redirect URL with the JWT appended as ?token=...
function buildCrossAppRedirect(redirectUrl, token) {
  return redirectUrl + (redirectUrl.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token);
}

// Only allow redirecting back to known external apps (prevents open-redirect abuse).
function isAllowedRedirect(url) {
  try {
    const u = new URL(url);
    const allowed = [
      "3darena.chessnexus.in",
      "localhost",
      "127.0.0.1",
    ];
    return allowed.some(host => u.hostname === host || u.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location  = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  // Message passed via navigate state (e.g. from noGuest redirect)
  const stateMessage = location.state?.message || "";

  // Read ?redirect= from the URL (used for cross-app SSO from 3darena.chessnexus.in)
  const redirectParam = new URLSearchParams(window.location.search).get("redirect");

  // If user is already logged in, skip the login page entirely
  useEffect(() => {
    if (authLoading) return; // wait for auth check to finish before deciding

    if (isAuthenticated) {
      if (redirectParam && isAllowedRedirect(redirectParam)) {
        // Already logged in + came from 3D Arena: get a fresh arena token and bounce back
        setRedirecting(true);
        api.get("/api/auth/arena-token")
          .then(res => {
            window.location.href = buildCrossAppRedirect(redirectParam, res.data.token);
          })
          .catch(() => {
            // Fallback to main token if arena-token endpoint fails
            const token = localStorage.getItem("authToken");
            if (token) window.location.href = buildCrossAppRedirect(redirectParam, token);
          });
      } else {
        // A student who opened a coach invite link while logged out was sent
        // here; JoinCoachPage stashed the code. Return them to the invite
        // instead of the dashboard, so the link still works end to end (this
        // also covers signing UP from the link rather than logging in).
        let invite = null;
        try {
          invite = sessionStorage.getItem("pendingCoachInvite");
          if (invite) sessionStorage.removeItem("pendingCoachInvite");
        } catch { /* private mode — fall through to the dashboard */ }
        navigate(invite ? `/join-coach/${invite}` : "/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, redirectParam]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(username, password);

      // Cross-app SSO: fetch a dedicated arena token and bounce back
      if (redirectParam && isAllowedRedirect(redirectParam)) {
        setRedirecting(true);
        try {
          const res = await api.get("/api/auth/arena-token");
          window.location.href = buildCrossAppRedirect(redirectParam, res.data.token);
        } catch {
          const token = localStorage.getItem("authToken");
          window.location.href = buildCrossAppRedirect(redirectParam, token);
        }
        return;
      }

      // Default: in-app redirect based on role
      const redirectUrl = user.role === "admin" ? "/admin" : "/dashboard";
      navigate(redirectUrl);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "20px",
      boxSizing: "border-box",
      overflow: "hidden",
      position: "fixed",
      top: 0,
      left: 0
    },
    backgroundEffect: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "radial-gradient(circle at 20% 50%, var(--color-accent-2-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)",
      pointerEvents: "none",
      zIndex: 0
    },
    formCard: {
      maxWidth: "420px",
      width: "100%",
      maxHeight: "90vh",
      padding: "40px",
      background: "var(--color-surface)",
      borderRadius: "20px",
      boxShadow: "0 8px 32px var(--color-black-a50)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      border: "1px solid var(--color-white-a04)",
      overflow: "auto",
      position: "relative",
      zIndex: 1,
      animation: "slideIn 0.4s ease-out"
    },
    title: {
      textAlign: "center",
      background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      fontSize: "36px",
      fontWeight: "700",
      marginBottom: "8px",
      letterSpacing: "-0.5px"
    },
    subtitle: {
      textAlign: "center",
      color: "var(--color-text-muted)",
      fontSize: "14px",
      marginBottom: "32px",
      fontStyle: "italic"
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    },
    label: {
      color: "var(--color-text)",
      fontSize: "14px",
      fontWeight: "600"
    },
    input: {
      padding: "12px 16px",
      fontSize: "14px",
      borderRadius: "12px",
      border: "1px solid var(--color-white-a10)",
      backgroundColor: "var(--color-black-a35)",
      color: "var(--color-text)",
      transition: "all 0.3s ease",
      outline: "none",
      boxSizing: "border-box"
    },
    button: {
      padding: "14px",
      fontSize: "16px",
      borderRadius: "12px",
      border: "none",
      background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)",
      color: "var(--color-text)",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 16px var(--color-accent-a40)",
      marginTop: "8px"
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed"
    },
    error: {
      padding: "14px",
      backgroundColor: "var(--color-danger-a12)",
      color: "var(--color-danger)",
      borderRadius: "12px",
      border: "1px solid var(--color-danger-a20)",
      textAlign: "center",
      fontWeight: "500",
      fontSize: "14px"
    },
    signupLink: {
      marginTop: "24px",
      textAlign: "center",
      borderTop: "1px solid var(--color-white-a04)",
      paddingTop: "20px"
    },
    signupText: {
      color: "var(--color-text-muted)",
      fontSize: "14px",
      margin: 0
    },
    link: {
      color: "var(--color-accent)",
      textDecoration: "none",
      fontWeight: "600",
      cursor: "pointer",
      transition: "color 0.3s ease"
    }
  };

  // Don't render the login form while we're checking auth or performing a redirect.
  // This prevents the "flash of login page" for already-authenticated users.
  if (authLoading || redirecting) {
    return (
      <div style={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", color: "var(--color-accent-2)", fontSize: "1.1rem", fontFamily: "sans-serif" }}>
        Redirecting…
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          input::placeholder {
            color: var(--color-text-faint);
          }

          input:focus {
            border-color: var(--color-accent) !important;
            box-shadow: 0 0 0 3px var(--color-accent-a20) !important;
            background: var(--color-black-a35) !important;
          }

          input:hover:not(:focus) {
            border-color: var(--color-accent-a30) !important;
          }

          a:hover {
            color: var(--color-accent) !important;
          }

          @media (max-width: 768px) {
            .formCard {
              padding: 24px !important;
            }
            .title {
              font-size: 28px !important;
            }
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.backgroundEffect}></div>
        <div style={styles.formCard} className="formCard">
          <h2 style={{ ...styles.title, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} className="title">
            <img src="/logo.png" alt="Chess Nexus" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span>Welcome Back</span>
          </h2>
          <p style={styles.subtitle}>Sign in to continue your chess journey</p>
          {stateMessage && (
            <div style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, color: '#d8b4fe', fontSize: 13 }}>
              🔒 {stateMessage}
            </div>
          )}
          <form onSubmit={handleLogin} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                style={styles.input}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button 
              type="submit" 
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {})
              }}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 24px var(--color-accent-a40)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 16px var(--color-accent-a40)";
                }
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          
          <div style={styles.signupLink}>
            <p style={styles.signupText}>
              Don't have an account?{' '}
              <Link to="/signup-request" style={styles.link}>
                Request Signup
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}