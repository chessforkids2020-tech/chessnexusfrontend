import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState('prompt'); // 'prompt' | 'form'
  const [form, setForm] = useState({
    coachName: user?.displayName || '',
    coachCountry: user?.country || '',
    coachType: 'individual',   // 'individual' | 'academy' (academy = you're the head)
    academyName: '',
    socialPlatform: 'facebook', // 'facebook' | 'instagram'
    socialUsername: '',         // used by the Nexus team to verify the coach
    bio: '',
    specialization: '',
    referredByCoachCode: '',    // optional — another coach's code (referral)
  });

  // Prefill referral code from a shared link (?ref=CODE). Persist it so it
  // survives the login/signup redirect (ProtectedRoute drops the query when it
  // bounces a logged-out invitee to /login). Falls back to the stored value.
  useEffect(() => {
    const ref = searchParams.get('ref');
    const stored = (() => { try { return localStorage.getItem('coachRefCode') || ''; } catch { return ''; } })();
    const code = (ref || stored || '').trim().toUpperCase();
    if (ref) { try { localStorage.setItem('coachRefCode', code); } catch {} }
    if (code) setForm(prev => (prev.referredByCoachCode ? prev : { ...prev, referredByCoachCode: code }));
  }, [searchParams]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

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
    if (!form.academyName.trim()) return setError('Please enter your academy / brand name.');
    if (!form.socialUsername.trim()) return setError('Please add your Facebook or Instagram username — the Nexus team uses it to verify you.');
    if (!agreedTerms) return setError('Please accept the coach terms to continue.');

    // Normalise the social handle: drop a leading @ and any pasted profile URL,
    // keep just the username the Nexus team will look up.
    const socialUsername = form.socialUsername
      .trim()
      .replace(/^https?:\/\/(www\.)?(facebook|instagram|fb)\.com\//i, '')
      .replace(/^@/, '')
      .replace(/[/?#].*$/, '')
      .slice(0, 80);

    setSubmitting(true);
    try {
      await api.post('/api/coach/onboard', { ...form, socialUsername });
      try { localStorage.removeItem('coachRefCode'); } catch {} // don't leak to next coach on shared browser
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
              progress tracking, parent reports, attendance, class schedule, and more.
            </p>
            <div className="coach-onboard-perks">
              <div className="perk">✅ Free forever — no trial, no time limit</div>
              <div className="perk">✅ No card required</div>
            </div>

            {/* Everything a free coach already gets, grouped so each capability is
                legible instead of several features crammed into one line. */}
            <div className="coach-onboard-benefits">
              <div className="coach-onboard-benefits-title">🎁 Included free, always</div>

              <div className="benefit-group">
                <div className="benefit-head">🎥 Built-in live classroom</div>
                <div className="benefit">HD video, screen share &amp; a shared board — no Zoom needed</div>
                <div className="benefit">Give any student control of the board to play their move</div>
                <div className="benefit">Teach from studies, courses, endgames, puzzles &amp; master games</div>
                <div className="benefit">Raise hand, mute/camera controls &amp; a waiting room</div>
                <div className="benefit">Attendance marks itself as students join</div>
              </div>

              <div className="benefit-group">
                <div className="benefit-head">📝 Teaching &amp; content</div>
                <div className="benefit">Assignments — 7 types, from puzzles to full studies</div>
                <div className="benefit">Build courses &amp; keep a reusable coach library</div>
                <div className="benefit">Premium Endgame Mastery &amp; Opening Repertoire</div>
              </div>

              <div className="benefit-group">
                <div className="benefit-head">📊 Tracking &amp; parents</div>
                <div className="benefit">Student progress dashboards &amp; game analysis</div>
                <div className="benefit">One shareable parent report per student</div>
              </div>

              <div className="benefit-group">
                <div className="benefit-head">🗂 Running your academy</div>
                <div className="benefit">Batches, class schedule, attendance &amp; fee requests</div>
                <div className="benefit">Private Arena Races &amp; Tournaments for your students</div>
              </div>
            </div>

            <div className="coach-onboard-verify-note">
              🛡️ New coaches are verified by the Nexus team (usually within 12 hours) before adding students — this keeps the community safe for kids.
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
              <div className="coach-onboard-social-hint">
                You're setting up an academy — you'll be the head coach. After signup, share your
                academy join link (from the Academy dashboard) so your coaches can join, and you
                approve them. Your academy can then pay for their plans.
              </div>
            )}

            <label className="field">
              <span>Academy / brand name *</span>
              <input
                type="text"
                value={form.academyName}
                onChange={e => update('academyName', e.target.value)}
                placeholder="e.g. Saranya's Chess Academy"
                required
              />
            </label>

            <div className="field">
              <span>Social profile *</span>
              <div className="coach-onboard-social">
                <select
                  value={form.socialPlatform}
                  onChange={e => update('socialPlatform', e.target.value)}
                  className="coach-onboard-social-select"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
                <input
                  type="text"
                  value={form.socialUsername}
                  onChange={e => update('socialUsername', e.target.value)}
                  placeholder={form.socialPlatform === 'instagram' ? 'your instagram username' : 'your facebook username'}
                  required
                />
              </div>
              <div className="coach-onboard-social-hint">
                Nexus wants to keep one account per coach. Please give us your Facebook name — only to verify and make sure accounts are created in a fair way.
              </div>
            </div>

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

            <label className="field">
              <span>Referral code (optional)</span>
              <input
                type="text"
                value={form.referredByCoachCode}
                onChange={e => update('referredByCoachCode', e.target.value.toUpperCase())}
                placeholder="Were you invited by another coach? Enter their code"
                maxLength={20}
                autoCapitalize="characters"
              />
              <div className="coach-onboard-social-hint">
                If a coach referred you, add their code — they'll earn wallet credit when you first subscribe.
              </div>
            </label>

            <label className="coach-onboard-terms">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
              />
              <span>
                I agree to the ChessNexus coach terms. I confirm I will keep{' '}
                <strong>only one coach account</strong>. If the Nexus team finds a coach
                running multiple accounts, that coach may be <strong>removed</strong>.
              </span>
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="coach-onboard-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep('prompt')} disabled={submitting}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || !agreedTerms}>
                {submitting ? 'Creating…' : 'Create my free coach account →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
