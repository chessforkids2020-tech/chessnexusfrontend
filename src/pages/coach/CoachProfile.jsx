// pages/coach/CoachProfile.jsx
// "All about the coach" — everything on coachProfile, plus plan/limits and a
// few live counts, with inline editing of the fields PUT /api/coach/profile
// already accepts. No new backend: GET /api/coach/status returns the whole
// coachProfile + coachSubscription + access, and /api/coach/dashboard has counts.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { copyText } from '../../utils/clipboard';
import './CoachDashboard.css';
import './CoachOnboarding.css'; // .btn-ghost / .btn-primary live here
import './CoachProfile.css';

// Only these are editable server-side (routes/coach.js `allowed`). Keep in sync.
const EDITABLE = ['coachName', 'coachCountry', 'hourlyRate', 'rateCurrency',
  'coachType', 'academyName', 'bio', 'specialization'];

const NOT_SET = <span className="cp-not-set">Not set</span>;

// Initials for the avatar (up to 2 letters).
function initials(name) {
  if (!name) return '🎓';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(w => w[0]?.toUpperCase() || '').join('') || '🎓';
}

function Row({ label, children }) {
  return (
    <div className="cp-row">
      <span className="cp-row-label">{label}</span>
      <span className="cp-row-value">{children}</span>
    </div>
  );
}

export default function CoachProfile() {
  const [status, setStatus] = useState(null);
  const [counts, setCounts] = useState(null);
  const [wallet, setWallet] = useState(null);   // { balances[], homeCurrency, maxDiscountPct }
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = async () => {
    try {
      const [s, d, w] = await Promise.all([
        api.get('/api/coach/status'),
        api.get('/api/coach/dashboard').catch(() => ({ data: null })), // needs access; may 403
        api.get('/api/coach-subscription/wallet').catch(() => ({ data: null })),
      ]);
      setStatus(s.data);
      setCounts(d.data);
      setWallet(w.data || null);
    } catch {
      setError('Could not load your profile.');
    }
  };
  useEffect(() => { load(); }, []);

  if (error && !status) return <div className="coach-dash"><div className="coach-error">⚠️ {error}</div></div>;
  if (!status) return <div className="coach-dash"><div className="coach-empty">Loading your profile…</div></div>;

  const p = status.coachProfile || {};
  const access = status.access || {};
  const isAcademy = p.coachType === 'academy';
  const rate = p.hourlyRate ? `${p.rateCurrency === 'USD' ? '$' : '₹'}${p.hourlyRate} / hour` : null;

  const startEdit = () => {
    const next = {};
    EDITABLE.forEach(k => { next[k] = p[k] ?? ''; });
    setForm(next);
    setError('');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { ...form, hourlyRate: Number(form.hourlyRate) || 0 };
      const res = await api.put('/api/coach/profile', body);
      setStatus(s => ({ ...s, coachProfile: res.data.coachProfile }));
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (await copyText(p.coachCode)) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    }
  };

  // Full shareable referral link — an invited coach lands on onboarding with the
  // code prefilled (?ref=CODE).
  const referralLink = p.coachCode ? `${window.location.origin}/coach/onboarding?ref=${p.coachCode}` : '';
  const copyReferralLink = async () => {
    if (await copyText(referralLink)) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="coach-dash">
      {/* ── Hero header ──────────────────────────── */}
      <div className="cp-hero">
        <div className="cp-avatar" aria-hidden="true">{initials(p.coachName)}</div>
        <div className="cp-hero-body">
          <h1 className="cp-hero-name">
            {p.coachName || 'Your profile'}
            {p.verified
              ? <span className="cp-chip verified">🎓 Verified Coach</span>
              : <span className="cp-chip pending">⏳ Awaiting verification</span>}
          </h1>
          <p className="cp-hero-meta">
            <b>{isAcademy ? (p.academyName || 'Academy') : 'Individual coach'}</b>
            {p.coachCountry ? ` · ${p.coachCountry}` : ''}
            {p.specialization ? ` · ${p.specialization}` : ''}
            {p.onboardedAt ? ` · Coaching since ${new Date(p.onboardedAt).toLocaleDateString()}` : ''}
          </p>
          <div className="cp-hero-chips">
            <span className="cp-chip" style={{ textTransform: 'capitalize' }}>⭐ {access.plan || 'free'} plan</span>
            {rate && <span className="cp-chip">💵 {rate}</span>}
            {p.coachCode && (
              <span className="cp-code">
                {p.coachCode}
                <button onClick={copyCode}>{codeCopied ? '✓ Copied' : 'Copy'}</button>
              </span>
            )}
          </div>
        </div>
        <div className="cp-hero-actions">
          {!editing && <button className="btn-primary" onClick={startEdit}>✏️ Edit profile</button>}
          <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
        </div>
      </div>

      {error && <div className="coach-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      {/* ── Live numbers ─────────────────────────── */}
      {counts && (
        <div className="coach-stat-row">
          <div className="coach-stat-card">
            <div className="stat-label">Students</div>
            <div className="stat-value">
              {counts.studentsCount ?? 0}
              <span className="stat-cap"> / {access.maxStudents ?? '—'}</span>
            </div>
            {access.maxStudents ? (
              <div className="stat-bar">
                <div style={{ width: `${Math.min(100, Math.round(((counts.studentsCount ?? 0) / access.maxStudents) * 100))}%` }} />
              </div>
            ) : null}
            <div className="stat-foot">{counts.studentsRemaining ?? 0} slots remaining</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">Active assignments</div>
            <div className="stat-value">{counts.assignmentsCount ?? 0}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">Activities</div>
            <div className="stat-value">{counts.activitiesCount ?? 0}</div>
          </div>
          <div className="coach-stat-card">
            <div className="stat-label">Plan</div>
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{access.plan || 'free'}</div>
          </div>
        </div>
      )}

      {/* ── Referral wallet ──────────────────────── */}
      {/* Always shown (even at 0) so new coaches discover they can earn credit. */}
      {(() => {
        const balances = (wallet?.balances || []).filter(b => b.amount > 0);
        const hasCredit = balances.length > 0;
        const rewardPct = Math.round((wallet?.rewardPct ?? 0.2) * 100);
        const maxPct = Math.round((wallet?.maxDiscountPct ?? 0.5) * 100);
        return (
          <div className="cp-card cp-wallet">
            <div className="cp-card-head">
              <span className="cp-card-ic" aria-hidden="true">💰</span>
              <h2>Referral wallet</h2>
            </div>

            {hasCredit ? (
              <>
                <div className="cp-wallet-balances">
                  {balances.map(b => {
                    const sym = b.currency === 'INR' ? '₹' : b.currency === 'USD' ? '$' : b.currency === 'EUR' ? '€' : b.currency === 'GBP' ? '£' : b.currency + ' ';
                    return (
                      <div key={b.currency} className="cp-wallet-amount">
                        {sym}{(b.amount / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span className="cp-wallet-cur">{b.currency}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="cp-wallet-note">
                  Store credit earned from coaches you referred. Spendable toward your own
                  subscription — covers up to {maxPct}% of a purchase.
                </p>
                <Link to="/coach/subscription" className="btn-ghost">Use credit →</Link>
              </>
            ) : (
              <>
                <div className="cp-wallet-zero">
                  <span className="cp-wallet-amount cp-wallet-amount--zero">₹0</span>
                  <span className="cp-wallet-zero-tag">No credit yet</span>
                </div>
                <p className="cp-wallet-note">
                  Invite another coach with your code below. When they make their first paid
                  subscription, you earn <strong>{rewardPct}%</strong> of what they pay as wallet
                  credit — spendable on your own plan (covers up to {maxPct}% of a purchase).
                </p>
                <div className="cp-wallet-share">
                  {p.coachCode && (
                    <div className="cp-wallet-code">
                      <span className="cp-wallet-code-label">Your referral link</span>
                      <span className="cp-wallet-link" title={referralLink}>{referralLink}</span>
                    </div>
                  )}
                  <div className="cp-wallet-actions">
                    {p.coachCode && (
                      <button type="button" className="btn-primary" onClick={copyReferralLink}>
                        {linkCopied ? '✓ Link copied' : '🔗 Copy referral link'}
                      </button>
                    )}
                    <Link to="/coach/subscription" className="btn-ghost">See referral details →</Link>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Profile details ──────────────────────── */}
      <div className="cp-card">
        <div className="cp-card-head">
          <span className="cp-card-ic" aria-hidden="true">👤</span>
          <h2>{editing ? 'Edit your details' : 'About you'}</h2>
        </div>

        {editing ? (
          <div className="cp-form">
            <div className="cp-form-grid">
              <div className="cp-field">
                <label>Name</label>
                <input className="cp-input" value={form.coachName} onChange={set('coachName')} />
              </div>
              <div className="cp-field">
                <label>Country</label>
                <input className="cp-input" value={form.coachCountry} onChange={set('coachCountry')} />
              </div>
              <div className="cp-field">
                <label>Coach type</label>
                <select value={form.coachType} onChange={set('coachType')}>
                  <option value="individual">Individual</option>
                  <option value="academy">Academy</option>
                </select>
              </div>
              {form.coachType === 'academy' && (
                <div className="cp-field">
                  <label>Academy name</label>
                  <input className="cp-input" value={form.academyName} onChange={set('academyName')} />
                </div>
              )}
              <div className="cp-field">
                <label>Hourly rate</label>
                <input className="cp-input" type="number" min="0" value={form.hourlyRate} onChange={set('hourlyRate')} />
              </div>
              <div className="cp-field">
                <label>Currency</label>
                <select value={form.rateCurrency} onChange={set('rateCurrency')}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="cp-field">
                <label>Specialization</label>
                <input className="cp-input" placeholder="e.g. Openings, endgames, kids" value={form.specialization} onChange={set('specialization')} />
              </div>
            </div>
            <div className="cp-field">
              <label>Bio <span style={{ fontWeight: 400 }}>({(form.bio || '').length}/600)</span></label>
              <textarea rows={4} maxLength={600}
                        value={form.bio} onChange={set('bio')} placeholder="Tell students about your coaching background." />
            </div>
            <div className="cp-form-actions">
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save changes'}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="cp-rows">
            <Row label="Name">{p.coachName || NOT_SET}</Row>
            <Row label="Country">{p.coachCountry || NOT_SET}</Row>
            <Row label="Coach type">{isAcademy ? 'Academy' : 'Individual'}</Row>
            {isAcademy && <Row label="Academy">{p.academyName || NOT_SET}</Row>}
            <Row label="Specialization">{p.specialization || NOT_SET}</Row>
            <Row label="Hourly rate">{rate || NOT_SET}</Row>
            <Row label="Bio">{p.bio || NOT_SET}</Row>
            <Row label="Coach code">
              {p.coachCode ? (
                <span className="cp-code">
                  {p.coachCode}
                  <button onClick={copyCode}>{codeCopied ? '✓ Copied' : 'Copy'}</button>
                </span>
              ) : NOT_SET}
            </Row>
            <Row label="Verification">
              {p.verified
                ? <span style={{ color: '#6ee7b7' }}>🎓 Verified by the Nexus team</span>
                : <span style={{ color: '#fcd34d' }}>⏳ Awaiting verification</span>}
            </Row>
            {p.socialUsername && (
              <Row label="Social">{p.socialPlatform} · @{p.socialUsername}</Row>
            )}
            {p.onboardedAt && (
              <Row label="Coaching since">{new Date(p.onboardedAt).toLocaleDateString()}</Row>
            )}
          </div>
        )}
      </div>

      {/* ── Plan ─────────────────────────────────── */}
      {!editing && (
        <div className="cp-card">
          <div className="cp-card-head">
            <span className="cp-card-ic" aria-hidden="true">⭐</span>
            <h2>Your plan</h2>
          </div>
          <div className="cp-rows">
            <Row label="Plan"><span style={{ textTransform: 'capitalize' }}>{access.plan || 'free'}</span></Row>
            <Row label="Student limit">{access.maxStudents ?? '—'}</Row>
            {counts && <Row label="Slots remaining">{counts.studentsRemaining ?? '—'}</Row>}
            {access.daysRemaining != null && <Row label="Days remaining">{access.daysRemaining}</Row>}
            {access.downgraded && (
              <Row label="Status">
                <span style={{ color: '#fcd34d' }}>Your paid plan lapsed — you're on the free tier.</span>
              </Row>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/coach/subscription" className="btn-primary">Manage subscription</Link>
          </div>
        </div>
      )}
    </div>
  );
}
