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

// Only these are editable server-side (routes/coach.js `allowed`). Keep in sync.
const EDITABLE = ['coachName', 'coachCountry', 'hourlyRate', 'rateCurrency',
  'coachType', 'academyName', 'bio', 'specialization'];

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.28)',
  color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(226,232,240,0.6)', marginBottom: 5 };

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(226,232,240,0.55)', fontSize: 13.5 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 14 }}>{children}</span>
    </div>
  );
}

const NOT_SET = <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not set</span>;

export default function CoachProfile() {
  const [status, setStatus] = useState(null);
  const [counts, setCounts] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const load = async () => {
    try {
      const [s, d] = await Promise.all([
        api.get('/api/coach/status'),
        api.get('/api/coach/dashboard').catch(() => ({ data: null })), // needs access; may 403
      ]);
      setStatus(s.data);
      setCounts(d.data);
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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>
            {p.coachName || 'Your profile'}
            {p.verified && <span className="coach-verified-badge" title="Verified by the Nexus team">🎓 Verified Coach</span>}
          </h1>
          <p className="coach-dash-sub">
            {isAcademy ? (p.academyName || 'Academy') : 'Individual coach'}
            {p.coachCountry ? ` · ${p.coachCountry}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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

      {/* ── Profile details ──────────────────────── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>{editing ? 'Edit your details' : 'About you'}</h2></div>

        {editing ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={form.coachName} onChange={set('coachName')} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={inputStyle} value={form.coachCountry} onChange={set('coachCountry')} />
              </div>
              <div>
                <label style={labelStyle}>Coach type</label>
                <select style={inputStyle} value={form.coachType} onChange={set('coachType')}>
                  <option value="individual">Individual</option>
                  <option value="academy">Academy</option>
                </select>
              </div>
              {form.coachType === 'academy' && (
                <div>
                  <label style={labelStyle}>Academy name</label>
                  <input style={inputStyle} value={form.academyName} onChange={set('academyName')} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Hourly rate</label>
                <input style={inputStyle} type="number" min="0" value={form.hourlyRate} onChange={set('hourlyRate')} />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select style={inputStyle} value={form.rateCurrency} onChange={set('rateCurrency')}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Specialization</label>
                <input style={inputStyle} placeholder="e.g. Openings, endgames, kids" value={form.specialization} onChange={set('specialization')} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Bio <span style={{ fontWeight: 400 }}>({(form.bio || '').length}/600)</span></label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} maxLength={600}
                        value={form.bio} onChange={set('bio')} placeholder="Tell students about your coaching background." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save changes'}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <Row label="Name">{p.coachName || NOT_SET}</Row>
            <Row label="Country">{p.coachCountry || NOT_SET}</Row>
            <Row label="Coach type">{isAcademy ? 'Academy' : 'Individual'}</Row>
            {isAcademy && <Row label="Academy">{p.academyName || NOT_SET}</Row>}
            <Row label="Specialization">{p.specialization || NOT_SET}</Row>
            <Row label="Hourly rate">{rate || NOT_SET}</Row>
            <Row label="Bio">{p.bio || NOT_SET}</Row>
            <Row label="Coach code">
              {p.coachCode ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: 1.5,
                                 color: '#67e8f9', background: 'rgba(6,182,212,0.12)',
                                 border: '1px solid rgba(6,182,212,0.35)', borderRadius: 6, padding: '3px 10px' }}>
                    {p.coachCode}
                  </code>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={copyCode}>
                    {codeCopied ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <span style={{ color: '#64748b', fontSize: 12 }}>students use this to find you</span>
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
        <div className="coach-section">
          <div className="coach-section-head"><h2>Your plan</h2></div>
          <Row label="Plan">{access.plan || 'free'}</Row>
          <Row label="Student limit">{access.maxStudents ?? '—'}</Row>
          {counts && <Row label="Slots remaining">{counts.studentsRemaining ?? '—'}</Row>}
          {access.daysRemaining != null && <Row label="Days remaining">{access.daysRemaining}</Row>}
          {access.downgraded && (
            <Row label="Status">
              <span style={{ color: '#fcd34d' }}>Your paid plan lapsed — you're on the free tier.</span>
            </Row>
          )}
          <div style={{ marginTop: 14 }}>
            <Link to="/coach/subscription" className="btn-primary">Manage subscription</Link>
          </div>
        </div>
      )}
    </div>
  );
}
