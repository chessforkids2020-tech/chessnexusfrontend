// pages/academy/AcademySettings.jsx — /academy/settings
// Academy name, join link, and the "do you also teach" coaching-tools toggle.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import './AcademyDashboard.css';

export default function AcademySettings() {
  const [s, setS] = useState(null);
  const [name, setName] = useState('');
  const [usesCoachingTools, setUses] = useState(true);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/academy/settings').then(r => {
      setS(r.data); setName(r.data.name || ''); setUses(r.data.usesCoachingTools !== false);
    }).catch(e => setErr(e.response?.data?.message || 'Could not load settings.'));
  }, []);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      await api.post('/api/academy/settings', { name, usesCoachingTools });
      setMsg('✅ Settings saved.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <div className="acad-wrap"><div className="acad-empty">Loading…</div></div>;
  const joinLink = `${window.location.origin}/join-academy/${s.academyCode}`;

  return (
    <div className="acad-wrap" style={{ maxWidth: 640 }}>
      <h1 style={{ color: '#fff', marginBottom: 18 }}>⚙️ Academy settings</h1>
      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      {/* Current plan + coach capacity */}
      <div className="acad-plan-status">
        <div className="acad-plan-status-head">
          <span>📦 Current plan</span>
          <Link to="/academy/billing" className="acad-plan-status-link">Manage / change →</Link>
        </div>
        {s.plan && s.planStatus === 'active' ? (
          <>
            <div className="acad-plan-status-name">{s.planName}</div>
            <div className="acad-plan-status-grid">
              <div><strong>{s.coachCount}</strong><span>Coaches joined</span></div>
              <div><strong>{s.maxCoaches ?? '—'}</strong><span>Plan allows</span></div>
              <div><strong>{s.coachesRemaining ?? '—'}</strong><span>Seats left</span></div>
              <div><strong>{s.studentsPerCoach ?? '—'}</strong><span>Students / coach</span></div>
            </div>
            {s.coachesRemaining === 0 && (
              <div className="acad-plan-status-warn">
                You've filled all coach seats. Upgrade to a larger plan to add more coaches.
              </div>
            )}
            {s.currentPeriodEnd && (
              <div className="acad-plan-status-renew">Renews / expires {new Date(s.currentPeriodEnd).toLocaleDateString()}</div>
            )}
          </>
        ) : (
          <div className="acad-plan-status-none">
            <div>No academy plan yet. Your academy pays for its coaches — <strong>buy a plan before adding coaches</strong>.</div>
            <Link to="/academy/billing" className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>Choose a plan</Link>
            <div className="acad-muted" style={{ marginTop: 8 }}>
              {s.coachCount} coach{s.coachCount === 1 ? '' : 'es'} in your academy so far.
            </div>
          </div>
        )}
      </div>

      <div className="acad-set-field">
        <label>Academy name</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={120} />
      </div>

      <div className="acad-set-field">
        <label>Join link</label>
        <div className="acad-joinlink">
          <div className="acad-joinlink-url">{joinLink}</div>
          <button onClick={() => { navigator.clipboard?.writeText(joinLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="acad-set-field">
        <label>Do you also teach?</label>
        <label className="acad-toggle">
          <input type="checkbox" checked={usesCoachingTools} onChange={e => setUses(e.target.checked)} />
          <span>Show me the coaching tools (I coach too). Turn off to see only the academy.</span>
        </label>
      </div>

      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}
