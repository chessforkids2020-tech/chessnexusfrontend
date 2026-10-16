// pages/academy/AcademySettings.jsx — /academy/settings
// Academy name, join link, and the "do you also teach" coaching-tools toggle.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../../api';
import './AcademyDashboard.css';
import { t as tr } from '../../i18n/LanguageContext';

export default function AcademySettings() {
  const [s, setS] = useState(null);
  const [name, setName] = useState('');
  const [usesCoachingTools, setUses] = useState(true);
  // Who may run an activity across EVERY coach's students. 'head' | 'any'.
  const [activityCreators, setActivityCreators] = useState('head');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  // Logo is uploaded on its own endpoint (multipart), not through Save — so it
  // has its own state and applies immediately rather than waiting for the form.
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/api/academy/settings').then(r => {
      setS(r.data); setName(r.data.name || ''); setUses(r.data.usesCoachingTools !== false);
      setActivityCreators(r.data.academyActivityCreators || 'head');
      setLogoUrl(r.data.branding?.logoUrl || '');
    }).catch(e => setErr(e.response?.data?.message || tr('Could not load settings.')));
  }, []);

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    // Clear the input so picking the SAME file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    setUploading(true); setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/api/academy/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(res.data?.logoUrl || '');
      setMsg(tr('✅ Logo updated.'));
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!window.confirm(tr('Remove the academy logo?'))) return;
    setUploading(true); setErr(''); setMsg('');
    try {
      await api.delete('/api/academy/logo');
      setLogoUrl('');
      setMsg(tr('Logo removed.'));
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not remove the logo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      await api.post('/api/academy/settings', { name, usesCoachingTools, academyActivityCreators: activityCreators });
      setMsg(tr('✅ Settings saved.'));
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <div className="acad-wrap"><div className="acad-empty">{tr("Loading…")}</div></div>;
  const joinLink = `${window.location.origin}/join-academy/${s.academyCode}`;

  return (
    <div className="acad-wrap" style={{ maxWidth: 640 }}>
      <h1 style={{ color: 'var(--color-text)', marginBottom: 18 }}>{tr("⚙️ Academy settings")}</h1>
      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      {/* Current plan + coach capacity */}
      <div className="acad-plan-status">
        <div className="acad-plan-status-head">
          <span>{tr("📦 Current plan")}</span>
          <Link to="/academy/billing" className="acad-plan-status-link">{tr("Manage / change →")}</Link>
        </div>
        {s.plan && s.planStatus === 'active' ? (
          <>
            <div className="acad-plan-status-name">{s.planName}</div>
            <div className="acad-plan-status-grid">
              <div><strong>{s.coachCount}</strong><span>{tr("Coaches joined")}</span></div>
              {/* -1 means UNLIMITED — the server sends it because JSON cannot
                  carry Infinity. Rendered raw it read as "-1 coaches". */}
              <div><strong>{s.maxCoaches === -1 ? '∞' : (s.maxCoaches ?? '—')}</strong><span>{tr("Plan allows")}</span></div>
              <div><strong>{s.coachesRemaining === -1 ? '∞' : (s.coachesRemaining ?? '—')}</strong><span>{tr("Seats left")}</span></div>
              <div><strong>{s.studentsPerCoach ?? '—'}</strong><span>{tr("Students / coach")}</span></div>
            </div>
            {s.coachesRemaining === 0 && (
              <div className="acad-plan-status-warn">
                {tr("You've filled all coach seats. Upgrade to a larger plan to add more coaches.")}
              </div>
            )}
            {s.currentPeriodEnd && (
              <div className="acad-plan-status-renew">{tr("Renews / expires")} {new Date(s.currentPeriodEnd).toLocaleDateString()}</div>
            )}
          </>
        ) : (
          <div className="acad-plan-status-none">
            <div>{tr("No academy plan yet. Your academy pays for its coaches —")} <strong>{tr("buy a plan before adding coaches")}</strong>.</div>
            <Link to="/academy/billing" className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>{tr("Choose a plan")}</Link>
            <div className="acad-muted" style={{ marginTop: 8 }}>
              {s.coachCount} {tr("coach")}{s.coachCount === 1 ? '' : 'es'} {tr("in your academy so far.")}
            </div>
          </div>
        )}
      </div>

      <div className="acad-set-field">
        <label>{tr("Academy name")}</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={120} />
      </div>

      {/* Academy logo — the academy's badge. It marks every academy-wide
          activity card so a student can tell an academy event from their own
          coach's, and watermarks the student's My Coach page. */}
      <div className="acad-set-field">
        <label>{tr("Academy logo")}</label>
        <div className="acad-logo-row">
          <div className="acad-logo-preview">
            {logoUrl
              ? <img src={resolveApiAssetUrl(logoUrl)} alt={tr("Academy logo")} />
              : <span className="acad-logo-empty">🏛️</span>}
          </div>
          <div className="acad-logo-actions">
            <label className="acad-logo-btn">
              {uploading ? tr('Uploading…') : (logoUrl ? tr('Replace logo') : tr('Upload logo'))}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                hidden
                disabled={uploading}
                onChange={uploadLogo}
              />
            </label>
            {logoUrl && (
              <button type="button" className="acad-logo-remove" onClick={removeLogo} disabled={uploading}>
                {tr("Remove")}
              </button>
            )}
            <p className="acad-set-hint">
              PNG, JPG, WEBP, GIF or SVG · up to 2 MB. Shown on academy activity
              cards and to your students.
            </p>
          </div>
        </div>
      </div>

      <div className="acad-set-field">
        <label>{tr("Join link")}</label>
        <div className="acad-joinlink">
          <div className="acad-joinlink-url">{joinLink}</div>
          <button onClick={() => { navigator.clipboard?.writeText(joinLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}>
            {copied ? tr('✓ Copied') : tr('Copy')}
          </button>
        </div>
      </div>

      <div className="acad-set-field">
        <label>{tr("Do you also teach?")}</label>
        <label className="acad-toggle">
          <input type="checkbox" checked={usesCoachingTools} onChange={e => setUses(e.target.checked)} />
          <span>{tr("Show me the coaching tools (I coach too). Turn off to see only the academy.")}</span>
        </label>
      </div>

      {/* Academy-wide activities. A coach can ALWAYS run races for their own
          students — this only governs the roster that spans every coach in the
          academy, which is why the default is head-only: five coaches each able
          to summon the whole academy is how you get clashing events. */}
      <div className="acad-set-field">
        <label>{tr("Who can run academy-wide activities?")}</label>
        <label className="acad-toggle">
          <input
            type="radio"
            name="activityCreators"
            checked={activityCreators === 'head'}
            onChange={() => setActivityCreators('head')}
          />
          <span><b>{tr("Only me (head)")}</b> {tr("— I set up races and tournaments for every student in the academy.")}</span>
        </label>
        <label className="acad-toggle">
          <input
            type="radio"
            name="activityCreators"
            checked={activityCreators === 'any'}
            onChange={() => setActivityCreators('any')}
          />
          <span><b>{tr("Any coach in the academy")}</b> {tr("— any of my coaches can run an activity for all academy students.")}</span>
        </label>
        <p className="acad-set-hint">
          {tr("Either way, every coach can still run activities for their own students.")}
        </p>
      </div>

      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}
