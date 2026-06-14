// src/pages/SignupRequestForm.jsx
import React, { useState } from "react";
import api from '../api';
import { useNavigate } from "react-router-dom";
import "./SignupRequestForm.css";

const countries = [
  "United States", "Canada", "United Kingdom", "India", "Australia",
  "Germany", "France", "Spain", "Italy", "Japan", "China", "Brazil",
  "Mexico", "Russia", "South Africa", "Netherlands", "Sweden", "Norway",
  "Denmark", "Finland", "Poland", "Other"
];

function SignupRequestForm() {
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    realName: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    country: "",
    chessExperience: "Beginner",
    lichessUsername: "",
    chessComUsername: "",
    parentEmail: "",
    parentName: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.realName.trim()) newErrors.realName = "Real name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    else if (formData.username.length < 3) newErrors.username = "Username must be at least 3 characters";
    else if (formData.username.length > 20) newErrors.username = "Username must be at most 20 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = "Username can only contain letters, numbers, and underscores";

    if (!formData.displayName.trim()) newErrors.displayName = "Display name is required";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.country) newErrors.country = "Country is required";
    const ALLOWED_EMAIL_DOMAINS = [
      'gmail.com', 'googlemail.com',
      'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.com.au', 'yahoo.ca', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it',
      'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.es', 'hotmail.it',
      'outlook.com', 'outlook.in', 'outlook.co.uk',
      'live.com', 'live.co.uk', 'live.in',
      'msn.com',
      'icloud.com', 'me.com', 'mac.com',
      'protonmail.com', 'proton.me',
      'zoho.com',
      'aol.com',
      'rediffmail.com',
      'tutanota.com',
      'mail.com'
    ];
    if (!formData.parentEmail.trim()) newErrors.parentEmail = "Parent/guardian email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) newErrors.parentEmail = "Invalid email format";
    else {
      const domain = formData.parentEmail.split('@')[1]?.toLowerCase();
      if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) newErrors.parentEmail = "Please use a common email provider (Gmail, Yahoo, Hotmail, Outlook, iCloud, etc.)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/signup-request', formData);
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit signup request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="signup-request-page">
        <div className="signup-success">
          <div className="success-icon">✓</div>
          <h1>Request Submitted Successfully!</h1>
          <p>
            Thank you for requesting to join Chess Nexus. Your signup request has been submitted
            and is awaiting admin approval.
          </p>
          <p>
            <strong>⏱️ Review Time:</strong> We typically review requests within <strong>24-48 hours</strong>.
          </p>
          <p>
            <strong>📧 Email Confirmation:</strong> Once your account is approved, we will send a confirmation email with login credentials to{' '}
            <strong>{formData.parentEmail}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '16px' }}>
            Please check your spam/junk folder if you don't see the email in your inbox.
          </p>
          <button className="btn-primary" onClick={() => nav("/")}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-request-page">
      <div className="signup-form-container">
        <div className="form-header">
          <h1>♟️ Join Chess Nexus</h1>
          <p>Request an account to start your chess journey!</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-section">
            <h3>Personal Information</h3>

            <div className="form-group">
              <label htmlFor="realName">Real Name *</label>
              <input
                type="text"
                id="realName"
                name="realName"
                value={formData.realName}
                onChange={handleChange}
                placeholder="Your full name"
                className={errors.realName ? "error" : ""}
              />
              {errors.realName && <span className="error-msg">{errors.realName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                  className={errors.username ? "error" : ""}
                />
                {errors.username && <span className="error-msg">{errors.username}</span>}
                <small>3-20 characters, letters, numbers, and underscores only</small>
              </div>

              <div className="form-group">
                <label htmlFor="displayName">Display Name *</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Name shown to others"
                  className={errors.displayName ? "error" : ""}
                />
                {errors.displayName && <span className="error-msg">{errors.displayName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={errors.password ? "error" : ""}
                />
                {errors.password && <span className="error-msg">{errors.password}</span>}
                <small>Minimum 8 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={errors.confirmPassword ? "error" : ""}
                />
                {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="country">Country *</label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={errors.country ? "error" : ""}
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.country && <span className="error-msg">{errors.country}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Chess Experience</h3>

            <div className="form-group">
              <label htmlFor="chessExperience">Experience Level *</label>
              <select
                id="chessExperience"
                name="chessExperience"
                value={formData.chessExperience}
                onChange={handleChange}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lichessUsername">Lichess Username (Optional)</label>
                <input
                  type="text"
                  id="lichessUsername"
                  name="lichessUsername"
                  value={formData.lichessUsername}
                  onChange={handleChange}
                  placeholder="Your Lichess username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chessComUsername">Chess.com Username (Optional)</label>
                <input
                  type="text"
                  id="chessComUsername"
                  name="chessComUsername"
                  value={formData.chessComUsername}
                  onChange={handleChange}
                  placeholder="Your Chess.com username"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Parent/Guardian Information</h3>

            <div className="form-group">
              <label htmlFor="parentName">Parent/Guardian Name (Optional)</label>
              <input
                type="text"
                id="parentName"
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                placeholder="Parent or guardian's name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="parentEmail">Parent/Guardian Email *</label>
              <input
                type="email"
                id="parentEmail"
                name="parentEmail"
                value={formData.parentEmail}
                onChange={handleChange}
                placeholder="parent@example.com"
                className={errors.parentEmail ? "error" : ""}
              />
              {errors.parentEmail && <span className="error-msg">{errors.parentEmail}</span>}
              <small>We will send approval notifications to this email</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => nav("/")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupRequestForm;
