// src/pages/EventForm.jsx
import React, { useState, useEffect } from "react";
import api from '../api';
import { useNavigate, useLocation, useParams } from "react-router-dom";
import mockEvents from '../data/mockEvents';
import './EventForm.css';

function EventForm({ onClose }) {
  const nav = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();

  const event =
    location.state?.event ||
    mockEvents.find(e => e.id === eventId) ||
    { id: '', name: '' };

  const [formData, setFormData] = useState({
    eventId: event.id,
    eventName: event.name,
    name: '',
    age: '',
    lichessUsername: '',
    country: '',
    timeZone: '',
    email: ''
  });

  // if we navigated with event data or the URL param changes, update state
  useEffect(() => {
    if (event.id && (formData.eventId !== event.id || formData.eventName !== event.name)) {
      setFormData(prev => ({ ...prev, eventId: event.id, eventName: event.name }));
    }
  }, [event, formData.eventId, formData.eventName]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.age) newErrors.age = 'Age is required';
    else if (formData.age <= 0) newErrors.age = 'Age must be positive';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.timeZone.trim()) newErrors.timeZone = 'Time zone is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.post('/api/public/event-submissions', formData);
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="event-form-page">
        <div className="event-success">
          <div className="success-icon">✓</div>
          <h1>Thank you for submitting!</h1>
          <p>
            {formData.eventName
              ? `You are registered for ${formData.eventName}. `
              : ''}
            You will receive the Zoom link and other details via email shortly.
          </p>
          <button className="btn-primary" onClick={() => {
            setSubmitted(false);
            if (onClose) {
              onClose();
            } else {
              nav('/');
            }
          }}>
            {onClose ? 'Close' : 'Return to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-form-page">
      <div className="event-form-container">
        <h1>Event Registration</h1>
        {event.name && <h2 className="event-name-title">{event.name}</h2>}
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
              className={errors.name ? 'error' : ''} />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="age">Age *</label>
            <input type="number" id="age" name="age" value={formData.age} onChange={handleChange}
              className={errors.age ? 'error' : ''} />
            {errors.age && <span className="error-msg">{errors.age}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="lichessUsername">Lichess Username</label>
            <input type="text" id="lichessUsername" name="lichessUsername" value={formData.lichessUsername} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="country">Country *</label>
            <input type="text" id="country" name="country" value={formData.country} onChange={handleChange}
              className={errors.country ? 'error' : ''} />
            {errors.country && <span className="error-msg">{errors.country}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="timeZone">Time Zone *</label>
            <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange}
              className={errors.timeZone ? 'error' : ''} />
            {errors.timeZone && <span className="error-msg">{errors.timeZone}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
              className={errors.email ? 'error' : ''} />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>
          <div className="form-actions">
            <button className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
            {onClose ? (
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => nav('/')}>Cancel</button>
          )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;