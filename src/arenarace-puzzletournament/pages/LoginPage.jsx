/**
 * LoginPage - Simple JWT-based login
 * No browser-specific workarounds needed
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(username, password);
      
      // Redirect based on role
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
      background: "linear-gradient(to bottom, #FFE5B4 0%, #FFB6C1 30%, #FFA07A 60%, #FF6347 100%)",
      padding: "10px",
      boxSizing: "border-box",
      overflow: "hidden",
      position: "fixed",
      top: 0,
      left: 0
    },
    formCard: {
      maxWidth: "420px",
      width: "100%",
      maxHeight: "90vh",
      padding: "30px",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "20px",
      boxShadow: "0 20px 60px rgba(255, 99, 71, 0.3), 0 8px 25px rgba(255, 140, 0, 0.2)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.8)",
      overflow: "auto"
    },
    title: {
      textAlign: "center",
      background: "linear-gradient(135deg, #FF6347 0%, #FF8C00 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      fontSize: "32px",
      fontWeight: "900",
      marginBottom: "8px",
      letterSpacing: "-0.5px"
    },
    subtitle: {
      textAlign: "center",
      color: "#FF6347",
      fontSize: "13px",
      marginBottom: "24px",
      opacity: 0.8
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    },
    input: {
      padding: "14px 18px",
      fontSize: "16px",
      borderRadius: "12px",
      border: "2px solid #FFE5B4",
      backgroundColor: "#FFF9F0",
      color: "#333",
      transition: "all 0.3s ease",
      outline: "none"
    },
    button: {
      padding: "16px",
      fontSize: "16px",
      borderRadius: "12px",
      border: "none",
      background: "linear-gradient(135deg, #FF6347 0%, #FF8C00 100%)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: "700",
      transition: "all 0.3s ease",
      boxShadow: "0 6px 16px rgba(255, 99, 71, 0.3)"
    },
    error: {
      padding: "14px",
      backgroundColor: "#FFF0F0",
      color: "#FF6347",
      borderRadius: "12px",
      border: "2px solid #FFB6C1",
      textAlign: "center",
      fontWeight: "500"
    },
    signupLink: {
      marginTop: "20px",
      textAlign: "center",
      borderTop: "1px solid #FFE5B4",
      paddingTop: "16px"
    },
    signupText: {
      color: "#666",
      fontSize: "14px",
      margin: 0
    },
    link: {
      color: "#FF6347",
      textDecoration: "none",
      fontWeight: "700",
      cursor: "pointer"
    }
  };

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
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>Welcome Back</h2>
          <form onSubmit={handleLogin} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button 
              type="submit" 
              style={styles.button} 
              disabled={loading}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 10px 20px rgba(255, 99, 71, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 6px 16px rgba(255, 99, 71, 0.3)";
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


