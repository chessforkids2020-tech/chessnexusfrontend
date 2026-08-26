import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import './CoachOnboarding.css';

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Brazil', 'Argentina', 'Mexico',
  'Russia', 'Ukraine', 'Poland', 'Turkey', 'UAE', 'Singapore', 'Philippines',
  'Vietnam', 'Indonesia', 'Japan', 'South Korea', 'China', 'Other'
];

// Referral wallet figures — keep in step with backend/config/coachPlans.js
// (REFERRAL_REWARD_PCT = 0.25, REFERRAL_MAX_DISCOUNT_PCT = 0.50).
const REWARD_PCT = 25;
const MAX_DISCOUNT_PCT = 50;

export default function CoachOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser, isGuest } = useAuth();

  const [step, setStep] = useState('prompt'); // 'prompt' | 'form'
  const [form, setForm] = useState({
    coachName: user?.displayName || '',
    coachCountry: user?.country || '',
    coachType: 'individual',   // 'individual' | 'academy' (academy = you're the head)
    usesCoachingTools: true,   // academy owner: will they also teach (show coach tools)?
    academyName: '',
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
    // If already a coach, jump straight to their workspace. An academy OWNER goes
    // to the academy area (a "just manage" owner has no coach dashboard); everyone
    // else goes to the coach dashboard. Resolve academy membership FIRST so we
    // don't send a manager to /coach/dashboard only to be bounced out again.
    let alive = true;
    api.get('/api/coach/status').then(async (r) => {
      if (!alive || !r.data?.isCoach) return;
      let dest = '/coach/dashboard';
      try {
        const me = await api.get('/api/academy/me');
        if (me.data?.isOwner) dest = '/academy/overview'; // AcademyGate sends to billing if unpaid
      } catch { /* not an academy member → coach dashboard */ }
      if (alive) navigate(dest, { replace: true });
    }).catch(() => {});
    return () => { alive = false; };
  }, [navigate]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.coachName.trim()) return setError('Please enter your coach name.');
    if (!form.coachCountry) return setError('Please pick your country.');
    if (!form.academyName.trim()) return setError('Please enter your academy / brand name.');
    if (!agreedTerms) return setError('Please accept the coach terms to continue.');


    setSubmitting(true);
    try {
      await api.post('/api/coach/onboard', form);
      try { localStorage.removeItem('coachRefCode'); } catch {} // don't leak to next coach on shared browser
      if (refreshUser) await refreshUser();

      // Onboarded only in order to accept an academy invitation? Send them back
      // to it instead of the dashboard, where the invite would sit unanswered.
      if (form.coachType !== 'academy') {
        try {
          const inv = await api.get('/api/academy/my-invite');
          if (inv.data?.invite) { navigate('/academy/invite', { replace: true }); return; }
        } catch { /* no invite — fall through to the normal destination */ }
      }

      // A new academy must buy a plan before anything unlocks → straight to billing.
      navigate(form.coachType === 'academy' ? '/academy/billing' : '/coach/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  // A guest cannot become a coach: the account is ephemeral and unverified, and
  // coaches appear in a public directory parents choose from. Blocked here as
  // well as on the server so a guest is told BEFORE filling in the whole form
  // rather than after submitting it.
  if (isGuest) {
    return (
      <div className="coach-onboard-wrap">
        <div className="coach-onboard-card">
          <div className="coach-onboard-emoji">🎓</div>
          <h1 className="coach-onboard-title">Create an account to coach</h1>
          <p className="coach-onboard-sub">
            You are signed in as a guest. Coaching needs a real account — your
            students, classes and directory profile are all tied to it, and a
            guest account is temporary.
          </p>
          <div className="coach-onboard-actions">
            <button className="btn-primary" onClick={() => navigate('/signup-request')}>
              Create a free account
            </button>
            <button className="btn-ghost" onClick={() => navigate('/dashboard')}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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

            {/* Collab offer — streamers/bloggers get all coach features free on
                any plan by reaching out to the Nexus team. */}
            <div className="coach-onboard-collab">
              <div className="coach-onboard-collab-text">
                🤝 <strong>Streamers &amp; bloggers</strong> can collaborate
                with Nexus to access <strong>all coach features for free on any plan</strong>.
              </div>
              <Link to="/contact" className="coach-onboard-collab-link">
                Contact Nexus →
              </Link>
              <div className="coach-onboard-collab-note">
                The Nexus team will contact you shortly.
              </div>
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

            {/* Referral wallet — earn 25% as store credit for referring coaches.
                Figures mirror backend/config/coachPlans.js (REFERRAL_REWARD_PCT
                = 0.25, REFERRAL_MAX_DISCOUNT_PCT = 0.50). */}
            <div className="coach-onboard-wallet">
              <div className="coach-onboard-wallet-title">💰 Refer coaches, earn wallet credit</div>
              <div className="coach-onboard-wallet-note">
                Every coach gets a personal referral link. When a coach you invite takes
                their <strong>first paid subscription</strong>, you earn{' '}
                <strong>{REWARD_PCT}% of what they paid</strong> as credit in your referral
                wallet — in <strong>your own currency</strong>.
              </div>
              <div className="coach-onboard-wallet-note">
                That credit is spendable as a discount toward your own subscription (covers
                up to {MAX_DISCOUNT_PCT}% of a purchase). No cap on referrals, no cost to invite.
              </div>
            </div>

            <div className="coach-onboard-verify-note">
              🛡️ New coaches are verified by the Nexus team (usually within 12 hours) before adding students — this keeps the community safe for kids.
            </div>

            {/* Coach reference pages — open in a new tab so onboarding isn't lost. */}
            <div className="coach-onboard-refs">
              <div className="coach-onboard-refs-title">📚 Learn more before you start</div>
              <div className="coach-onboard-refs-links">
                <a href="/chess-coach-guide" target="_blank" rel="noopener noreferrer">Coach Guide</a>
                <a href="/chess-coach-referral" target="_blank" rel="noopener noreferrer">Referral &amp; Wallet</a>
                <a href="/chess-coach-pricing" target="_blank" rel="noopener noreferrer">Pricing</a>
                <a href="/chess-coaching-questions" target="_blank" rel="noopener noreferrer">Coach FAQ</a>
              </div>
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
                placeholder="e.g. Coach Queen"
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
              <>
                <div className="coach-onboard-social-hint">
                  You're setting up an academy — you'll be the head. After signup, share your
                  academy join link so coaches can join (you approve them), and your academy
                  can pay for their plans.
                </div>
                <div className="field">
                  <span>Will you also teach? *</span>
                  <div className="radio-row">
                    <label className={`radio-card ${form.usesCoachingTools ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="usesCoachingTools"
                        checked={form.usesCoachingTools === true}
                        onChange={() => update('usesCoachingTools', true)}
                      />
                      <span className="radio-icon">🎓</span>
                      <span className="radio-label">Yes, I coach too</span>
                      <span className="radio-hint">Full coaching tools + academy</span>
                    </label>
                    <label className={`radio-card ${!form.usesCoachingTools ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="usesCoachingTools"
                        checked={form.usesCoachingTools === false}
                        onChange={() => update('usesCoachingTools', false)}
                      />
                      <span className="radio-icon">🏛️</span>
                      <span className="radio-label">Just manage</span>
                      <span className="radio-hint">Only the academy dashboard</span>
                    </label>
                  </div>
                  <div className="coach-onboard-social-hint">
                    You can turn coaching tools on later from Academy settings.
                  </div>
                </div>
              </>
            )}

            <label className="field">
              <span>Academy / brand name *</span>
              <input
                type="text"
                value={form.academyName}
                onChange={e => update('academyName', e.target.value)}
                placeholder="e.g. Queen's Chess Academy"
                required
              />
            </label>

            {/* The "Social profile" field (Facebook / Instagram / Chess.com /
                Lichess) was removed. It existed so the Nexus team could verify a
                coach was real, but a throwaway account on any of those platforms
                takes two minutes to create — so it verified nothing while adding
                a required step to onboarding. */}

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
                If a coach referred you, add their code — they'll earn {REWARD_PCT}% wallet credit when you first subscribe.
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
