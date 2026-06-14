// src/pages/SignupRequestForm.jsx
import React, { useState } from "react";
import api from '../api';
import { trackEvent } from '../lib/analytics';
import { useNavigate, useLocation } from "react-router-dom";
import "./SignupRequestForm.css";

const countries = [
  "United States", "Canada", "United Kingdom", "India", "Australia",
  "Germany", "France", "Spain", "Italy", "Japan", "China", "Brazil",
  "Mexico", "Russia", "South Africa", "Netherlands", "Sweden", "Norway",
  "Denmark", "Finland", "Poland", "Other"
];

function SignupRequestForm() {
  const nav = useNavigate();
  const location = useLocation();

  // Get referral code from URL
  const queryParams = new URLSearchParams(location.search);
  const referralCodeFromUrl = queryParams.get('ref') || "";

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",

    country: "",
    chessExperience: "Beginner",
    lichessUsername: "",
    chessComUsername: "",
    referralCode: referralCodeFromUrl
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

    if (!formData.username.trim()) newErrors.username = "Username is required";
    else if (formData.username.length < 3) newErrors.username = "Username must be at least 3 characters";
    else if (formData.username.length > 20) newErrors.username = "Username must be at most 20 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = "Username can only contain letters, numbers, and underscores";

    if (!formData.displayName.trim()) newErrors.displayName = "Display name is required";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    else {
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
      const domain = formData.email.split('@')[1]?.toLowerCase();
      if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) newErrors.email = "Please use a common email provider (Gmail, Yahoo, Hotmail, Outlook, iCloud, etc.)";
    }

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.country) newErrors.country = "Country is required";

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
      await api.post('/api/auth/register', formData);
      trackEvent('signup', { source: 'register_form' });
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
          <h1>Account Created Successfully!</h1>
          <p>
            Welcome to <strong>Chess Nexus</strong>,{' '}
            <strong style={{ color: '#818cf8' }}>{formData.username}</strong>!
            Your account is ready — you can log in now.
          </p>
          <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => nav("/login")}>
            Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-request-page">
      <div className="signup-form-container">
        <div className="form-header">
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Chess Nexus" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
            <span>Join Chess Nexus</span>
          </h1>
          <p>Request an account to start your chess journey!</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-section">
            <h3>Personal Information</h3>

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

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
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

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => nav("/")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupRequestForm;
