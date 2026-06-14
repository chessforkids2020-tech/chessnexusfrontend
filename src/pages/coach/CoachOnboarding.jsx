import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import './CoachOnboarding.css';

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Brazil', 'Argentina', 'Mexico',
  'Russia', 'Ukraine', 'Poland', 'Turkey', 'UAE', 'Singapore', 'Philippines',
  'Vietnam', 'Indonesia', 'Japan', 'South Korea', 'China', 'Other'
];

export default function CoachOnboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState('prompt'); // 'prompt' | 'form'
  const [form, setForm] = useState({
    coachName: user?.displayName || '',
    coachCountry: user?.country || '',
    coachType: 'individual',
    academyName: '',
    bio: '',
    specialization: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already a coach, jump straight to dashboard
    api.get('/api/coach/status').then(r => {
      if (r.data?.isCoach) navigate('/coach/dashboard', { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.coachName.trim()) return setError('Please enter your coach name.');
    if (!form.coachCountry) return setError('Please pick your country.');
    if (form.coachType === 'academy' && !form.academyName.trim()) return setError('Academy name is required.');

    setSubmitting(true);
    try {
      await api.post('/api/coach/onboard', { ...form });
      if (refreshUser) await refreshUser();
      navigate('/coach/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="coach-onboard-wrap">
      <div className="coach-onboard-card">
        {step === 'prompt' && (
          <>
            <div className="coach-onboard-emoji">🎓</div>
            <h1 className="coach-onboard-title">Are you a chess coach?</h1>
            <p className="coach-onboard-sub">
              Turn your students into champions. Manage them in one place — assignments,
              progress tracking, reports, and more.
            </p>
            <div className="coach-onboard-perks">
              <div className="perk">✅ Start with a 30-day free trial</div>
              <div className="perk">✅ No card required</div>
              <div className="perk">✅ Up to 10 students during trial</div>
            </div>
            <div className="coach-onboard-actions">
              <button className="btn-primary" onClick={() => setStep('form')}>
                Yes — I'm a coach
              </button>
              <button className="btn-ghost" onClick={() => navigate('/dashboard')}>
                No, maybe later
              </button>
            </div>
          </>
        )}

        {step === 'form' && (
          <form className="coach-onboard-form" onSubmit={submit}>
            <h2 className="coach-onboard-title">Set up your coach profile</h2>
            <p className="coach-onboard-sub-small">Takes less than a minute.</p>

            <label className="field">
              <span>Coach name *</span>
              <input
                type="text"
                value={form.coachName}
                onChange={e => update('coachName', e.target.value)}
                placeholder="e.g. Coach Saranya"
                maxLength={100}
                required
              />
            </label>

            <label className="field">
              <span>Country *</span>
              <select
                value={form.coachCountry}
                onChange={e => update('coachCountry', e.target.value)}
                required
              >
                <option value="">— Select country —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div className="field">
              <span>You are *</span>
              <div className="radio-row">
                <label className={`radio-card ${form.coachType === 'individual' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="coachType"
                    value="individual"
                    checked={form.coachType === 'individual'}
                    onChange={() => update('coachType', 'individual')}
                  />
                  <span className="radio-icon">👤</span>
                  <span className="radio-label">Individual coach</span>
                </label>
                <label className={`radio-card ${form.coachType === 'academy' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="coachType"
                    value="academy"
                    checked={form.coachType === 'academy'}
                    onChange={() => update('coachType', 'academy')}
                  />
                  <span className="radio-icon">🏛️</span>
                  <span className="radio-label">Academy / institute</span>
                </label>
              </div>
            </div>

            {form.coachType === 'academy' && (
              <label className="field">
                <span>Academy name *</span>
                <input
                  type="text"
                  value={form.academyName}
                  onChange={e => update('academyName', e.target.value)}
                  placeholder="e.g. ChessNexus Academy"
                  required
                />
              </label>
            )}

            <label className="field">
              <span>Specialization (optional)</span>
              <input
                type="text"
                value={form.specialization}
                onChange={e => update('specialization', e.target.value)}
                placeholder="e.g. Openings, Endgame, Kids beginner"
                maxLength={100}
              />
            </label>

            <label className="field">
              <span>Short bio (optional)</span>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => update('bio', e.target.value)}
                placeholder="Tell students about your coaching style..."
                maxLength={600}
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="coach-onboard-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep('prompt')} disabled={submitting}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Starting trial…' : 'Start 30-day free trial →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
