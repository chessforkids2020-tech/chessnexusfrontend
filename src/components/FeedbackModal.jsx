import React, { useState, useEffect } from 'react';
import api from '../api';
import '../pages/EventRegistration.css';
import './BookDemoModal.css';
import './FeedbackModal.css';

/**
 * First-session feedback modal. Auto-opened once (from UserLayout) after a new
 * signup has been active ~10 minutes, asking what feels missing and which
 * feature would help their chess — so we catch feature demand before churn.
 *
 * Presentation mirrors BookDemoModal (overlay/Escape/scroll-lock/success state).
 * Both submit and dismiss are treated as "answered" by the caller so the prompt
 * never reappears for that account.
 */
export default function FeedbackModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState({ missing: '', wantedFeature: '', experience: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Reset when reopened; lock body scroll while open.
  useEffect(() => {
    if (open) {
      setForm({ missing: '', wantedFeature: '', experience: '' });
      setError('');
      setDone(false);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const missing = form.missing.trim();
    const wantedFeature = form.wantedFeature.trim();
    const experience = form.experience.trim();

    if (!missing && !wantedFeature) {
      return setError('Please answer at least one of the first two questions.');
    }

    setSubmitting(true);
    try {
      await api.post('/api/feedback', { missing, wantedFeature, experience });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bdm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bdm-modal" role="dialog" aria-modal="true" aria-label="Share your feedback">
        <button className="bdm-close" onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div className="bdm-success">
            <div className="bdm-success-icon">🙌</div>
            <h2>Thank you!</h2>
            <p>
              Your feedback goes straight to our team and helps shape what we build next.
              We're glad you're here.
            </p>
            <button className="submit-button" onClick={() => { onSubmitted && onSubmitted(); onClose(); }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="bdm-head">
              <div className="event-icon" style={{ margin: 0 }}>💡</div>
              <div>
                <h1 className="bdm-title">Help us improve ChessNexus</h1>
                <p className="bdm-subtitle">
                  You've been exploring for a bit — we'd love to hear from you. It takes 30 seconds
                  and genuinely shapes what we build.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="registration-form" style={{ marginTop: 0 }}>
              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-group">
                <label htmlFor="fb-missing">Is anything missing in ChessNexus for you?</label>
                <textarea
                  id="fb-missing"
                  className="fbm-textarea"
                  rows={3}
                  value={form.missing}
                  disabled={submitting}
                  maxLength={1000}
                  placeholder="e.g. I wish there were more openings training, a specific puzzle type…"
                  onChange={(e) => setForm({ ...form, missing: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fb-feature">What one feature would help you improve your games?</label>
                <textarea
                  id="fb-feature"
                  className="fbm-textarea"
                  rows={3}
                  value={form.wantedFeature}
                  disabled={submitting}
                  maxLength={1000}
                  placeholder="e.g. game analysis, a study plan, harder bots, coaching…"
                  onChange={(e) => setForm({ ...form, wantedFeature: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fb-experience">Anything else you'd like to share? <span className="fbm-optional">(optional)</span></label>
                <textarea
                  id="fb-experience"
                  className="fbm-textarea"
                  rows={2}
                  value={form.experience}
                  disabled={submitting}
                  maxLength={1000}
                  placeholder="Your overall experience so far…"
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                />
              </div>

              <div className="fbm-actions">
                <button type="button" className="fbm-skip" onClick={onClose} disabled={submitting}>
                  No thanks
                </button>
                <button type="submit" className="submit-button fbm-submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
