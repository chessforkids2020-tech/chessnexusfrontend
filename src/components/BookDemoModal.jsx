import React, { useState, useEffect } from 'react';
import api from '../api';
import '../pages/EventRegistration.css';
import './BookDemoModal.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Two-hour windows (IST) the coach team runs demos in.
const TIME_SLOTS = [
  '10 AM – 12 PM',
  '12 – 2 PM',
  '2 – 4 PM',
  '4 – 6 PM',
  '6 – 8 PM',
  '8 – 10 PM',
];

const EMPTY_SLOT = { day: '', time: '' };

export default function BookDemoModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', academyName: '', country: '' });
  const [slots, setSlots] = useState([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Reset when reopened; lock body scroll while open.
  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', academyName: '', country: '' });
      setSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
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

  const setSlot = (i, patch) =>
    setSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())        return setError('Please enter your name');
    if (!form.email.trim())       return setError('Please enter your email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setError('Please enter a valid email address');
    if (!form.academyName.trim()) return setError('Please enter your academy name');
    if (!form.country.trim())     return setError('Please enter your country');

    const chosen = slots.filter(s => s.day && s.time);
    if (chosen.length < 3)
      return setError('Please choose 3 preferred day & time slots so we can find one that fits.');

    setSubmitting(true);
    try {
      await api.post('/api/public/event-submissions', {
        eventId: 'coach-demo-booking',
        eventName: 'Coach Free Demo Booking',
        name: form.name.trim(),
        email: form.email.trim(),
        academyName: form.academyName.trim(),
        country: form.country.trim(),
        preferredSlots: chosen,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bdm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bdm-modal" role="dialog" aria-modal="true" aria-label="Book a free demo">
        <button className="bdm-close" onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div className="bdm-success">
            <div className="bdm-success-icon">✅</div>
            <h2>Demo request received!</h2>
            <p>
              Thanks, <b>{form.name.trim()}</b>. Our team will review your preferred slots and
              email <b>{form.email.trim()}</b> with your <b>confirmed day, time and Zoom link</b>.
            </p>
            <button className="submit-button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="bdm-head">
              <div className="event-icon" style={{ margin: 0 }}>🎓</div>
              <div>
                <h1 className="bdm-title">Book your free demo</h1>
                <p className="bdm-subtitle">
                  Tell us about your academy and pick 3 slots that suit you. We'll email your
                  confirmed time and Zoom link.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="registration-form" style={{ marginTop: 0 }}>
              {error && <div className="error-message">⚠️ {error}</div>}

              <div className="form-group">
                <label htmlFor="bdm-name">Your name *</label>
                <input id="bdm-name" type="text" value={form.name} disabled={submitting}
                  placeholder="e.g. Priya Sharma"
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="bdm-email">Email *</label>
                <input id="bdm-email" type="email" value={form.email} disabled={submitting}
                  placeholder="you@example.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="bdm-academy">Academy name *</label>
                <input id="bdm-academy" type="text" value={form.academyName} disabled={submitting}
                  placeholder="e.g. Knight School Chess Academy"
                  onChange={(e) => setForm({ ...form, academyName: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="bdm-country">Country *</label>
                <input id="bdm-country" type="text" value={form.country} disabled={submitting}
                  placeholder="e.g. India, USA, UK…"
                  onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>

              <div className="bdm-slots">
                <div className="bdm-slots-label">
                  Choose <b>3 preferred slots</b> <span>(times shown in IST)</span>
                </div>
                {slots.map((slot, i) => (
                  <div className="bdm-slot-row" key={i}>
                    <span className="bdm-slot-n">{i + 1}</span>
                    <select className="bdm-select" value={slot.day} disabled={submitting}
                      onChange={(e) => setSlot(i, { day: e.target.value })}>
                      <option value="">Day…</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="bdm-select" value={slot.time} disabled={submitting}
                      onChange={(e) => setSlot(i, { time: e.target.value })}>
                      <option value="">Time…</option>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Sending…' : '🚀 Request my demo'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
