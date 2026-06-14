import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import SEO from "../components/SEO";
import { useAuth } from "../contexts/AuthContext";
import "./ContactPage.css";

export default function ReportPage() {
  const { user } = useAuth();
  const isLoggedIn = !!user && user.role !== "guest";
  const displayName = user?.displayName || user?.username || "";

  const [form, setForm] = useState({ email: "", subject: "", details: "" });
  const [status, setStatus] = useState(""); // '' | 'ok' | 'error'
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);
    try {
      const payload = {
        subject: form.subject,
        details: form.details,
        // email is only needed/used for guests; backend ignores it when logged in
        ...(isLoggedIn ? {} : { email: form.email }),
      };
      const res = await api.post("/api/reports", payload);
      if (res.data && res.data.ok) {
        setStatus("ok");
        setForm({ email: "", subject: "", details: "" });
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page-container">
      <SEO
        title="Report a Problem — Chess Nexus"
        description="Report a bug, issue, or complaint to the Chess Nexus team. We review every report and reply directly to you."
        canonical="/report"
      />
      <div className="contact-page-content">
        <h1 className="contact-page-title">
          <span className="title-icon">🚩</span>
          Submit a Report
        </h1>
        <p style={{ textAlign: "center", color: "#9ca3af", marginTop: -8, marginBottom: 24 }}>
          Found a bug or want to report something? Tell us below — the Chess Nexus
          team reviews every report.
        </p>

        <div className="contact-admin-section">
          <div className="contact-grid">
            <div className="contact-form-box">
              {status === "ok" ? (
                <div style={{ textAlign: "center", padding: "12px 4px" }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <h3 className="form-box-title" style={{ marginTop: 8 }}>
                    Report received
                  </h3>
                  {isLoggedIn ? (
                    <>
                      <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                        Thanks, {displayName}! The Chess Nexus team will shortly
                        review your report and reply in your inbox.
                      </p>
                      <Link
                        to="/my-reports"
                        className="submit-btn"
                        style={{ display: "inline-flex", marginTop: 12, textDecoration: "none" }}
                      >
                        <span>View My Reports</span>
                        <span className="btn-arrow">→</span>
                      </Link>
                    </>
                  ) : (
                    <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                      Thanks! The Chess Nexus team will review your report and reply
                      to your email shortly.
                    </p>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="submit-btn"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)" }}
                      onClick={() => setStatus("")}
                    >
                      <span>Submit another</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="form-box-title">
                    {isLoggedIn ? "Tell us what happened" : "Report a problem"}
                  </h3>
                  <form className="contact-form" onSubmit={handleSubmit}>
                    {isLoggedIn ? (
                      <div className="form-group">
                        <label htmlFor="rep-username">Username</label>
                        <input
                          type="text"
                          id="rep-username"
                          value={displayName}
                          disabled
                          style={{ opacity: 0.8 }}
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label htmlFor="rep-email">Email</label>
                        <input
                          type="email"
                          id="rep-email"
                          placeholder="Enter your email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="rep-subject">Subject</label>
                      <input
                        type="text"
                        id="rep-subject"
                        placeholder="Briefly, what is this about?"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="rep-details">
                        {isLoggedIn ? "Details" : "Complaint"}
                      </label>
                      <textarea
                        id="rep-details"
                        placeholder="Describe the issue in as much detail as you can..."
                        value={form.details}
                        onChange={(e) => setForm({ ...form, details: e.target.value })}
                        rows="6"
                        required
                      ></textarea>
                    </div>

                    <button type="submit" className="submit-btn" disabled={submitting}>
                      <span>{submitting ? "Sending..." : isLoggedIn ? "Report Now" : "Submit Report"}</span>
                      <span className="btn-arrow">→</span>
                    </button>

                    {status === "error" && (
                      <p className="submit-message error">
                        Couldn't send your report. Please try again.
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
