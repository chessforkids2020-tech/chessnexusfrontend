// pages/coach/CoachProfile.jsx
// "All about the coach" — everything on coachProfile, plus plan/limits and a
// few live counts, with inline editing of the fields PUT /api/coach/profile
// already accepts. No new backend: GET /api/coach/status returns the whole
// coachProfile + coachSubscription + access, and /api/coach/dashboard has counts.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { copyText } from '../../utils/clipboard';
import CoachRichText from '../../components/CoachRichText';
import CoachProse from '../../components/CoachProse';
import './CoachDashboard.css';
import './CoachOnboarding.css'; // .btn-ghost / .btn-primary live here
import './CoachProfile.css';

// Only these are editable server-side (routes/coach.js `allowed`). Keep in sync.
const EDITABLE = ['coachName', 'coachCountry', 'hourlyRate', 'monthlyRate', 'rateCurrency',
  'coachType', 'academyName', 'bio', 'specialization',
  // Public profile — everything below appears on /coach/<code> and in the
  // /coaches directory. All optional; a coach who fills in none of it simply
  // has a sparser page.
  // No 'title': a chess title is claimed once per user in Settings → Profile
  // and granted only by an approved TitleClaim (admin checks an ID document).
  // The server ignores it here too — see routes/coach.js.
  'profilePhotoUrl', 'publicListed', 'acceptingStudents',
  'fideRating', 'lichessRating', 'chessComRating', 'experienceYears',
  'coachAchievements', 'languages', 'teaches'];
const LEVELS = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const NOT_SET = <span className="cp-not-set">Not set</span>;

// Gallery limits. Mirrored from routes/coach.js — the server enforces both;
// these exist so a coach is told before a doomed upload, not after it.
const GALLERY_MAX = 20;
const GALLERY_MAX_BYTES = 2 * 1024 * 1024;

// Pretty label for the verification-handle platform (stored as a short enum).
const SOCIAL_LABEL = { facebook: 'Facebook', instagram: 'Instagram', chesscom: 'Chess.com', lichess: 'Lichess' };

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
  // The VERIFIED chess title (User.chessTitle), not anything typed here. Same
  // source the Settings → Profile card uses.
  const [myTitle, setMyTitle] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [joinCopied, setJoinCopied] = useState(false);
  const [walletHelp, setWalletHelp] = useState(false); // wallet "?" explainer popup
  const [academyInfo, setAcademyInfo] = useState(null); // { academy, role } if a member
  // Gallery photos. Kept in their own state, not in `form`: they are files on
  // the server, saved the moment they are picked, so folding them into the
  // profile form would imply they need "Save changes" to take effect.
  const [gallery, setGallery] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState('');

  const load = async () => {
    try {
      const [s, d, w, am, t] = await Promise.all([
        api.get('/api/coach/status'),
        api.get('/api/coach/dashboard').catch(() => ({ data: null })), // needs access; may 403
        api.get('/api/coach-subscription/wallet').catch(() => ({ data: null })),
        api.get('/api/academy/me').catch(() => ({ data: null })),
        api.get('/api/title-claim/mine').catch(() => ({ data: null })),
      ]);
      setStatus(s.data);
      setCounts(d.data);
      setWallet(w.data || null);
      setAcademyInfo(am.data?.academy ? am.data : null);
      setMyTitle(t.data?.chessTitle || '');
      // Newest first, matching the order the public page renders.
      const g = Array.isArray(s.data?.coachProfile?.coachGallery)
        ? s.data.coachProfile.coachGallery
        : [];
      setGallery(
        g.slice()
         .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
         .map(x => ({ id: String(x._id), url: x.url, caption: x.caption || '' }))
      );
    } catch {
      setError('Could not load your profile.');
    }
  };

  // ── Gallery actions ───────────────────────────────────────────────────────
  const onGalleryFile = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input immediately so picking the SAME file twice still fires
    // onChange (the browser suppresses it otherwise).
    e.target.value = '';
    if (!file) return;

    setGalleryError('');
    // Checked client-side too so a coach on a slow connection is told straight
    // away rather than after a 2 MB upload the server will reject.
    if (file.size > GALLERY_MAX_BYTES) {
      setGalleryError('That image is over 2 MB. Please choose a smaller one.');
      return;
    }
    if (gallery.length >= GALLERY_MAX) {
      setGalleryError(`You can have at most ${GALLERY_MAX} photos.`);
      return;
    }

    setGalleryBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/api/coach/gallery', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const img = res.data?.image;
      if (img) {
        setGallery(prev => [{ id: String(img._id || img.id || img.url), url: img.url, caption: img.caption || '' }, ...prev]);
        // Re-read so the id is the real one Mongo assigned, which delete and
        // caption edits need.
        load();
      }
    } catch (err) {
      setGalleryError(err.response?.data?.message || 'Could not upload that image.');
    } finally {
      setGalleryBusy(false);
    }
  };

  const removeGalleryImage = async (id) => {
    if (!id) return;
    setGalleryError('');
    setGalleryBusy(true);
    try {
      await api.delete(`/api/coach/gallery/${id}`);
      setGallery(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setGalleryError(err.response?.data?.message || 'Could not remove that image.');
    } finally {
      setGalleryBusy(false);
    }
  };

  const saveGalleryCaption = async (id, caption) => {
    if (!id) return;
    const trimmed = String(caption || '').trim().slice(0, 120);
    const current = gallery.find(g => g.id === id);
    if (!current || current.caption === trimmed) return;   // nothing changed
    try {
      await api.patch(`/api/coach/gallery/${id}`, { caption: trimmed });
      setGallery(prev => prev.map(g => (g.id === id ? { ...g, caption: trimmed } : g)));
    } catch (err) {
      setGalleryError(err.response?.data?.message || 'Could not save that caption.');
    }
  };
  useEffect(() => { load(); }, []);

  const requestLeaveAcademy = async () => {
    if (!window.confirm('Ask your academy to release you as an individual coach? Your students and data stay with you. The academy will review and confirm.')) return;
    try {
      const r = await api.post('/api/academy/leave');
      setAcademyInfo(prev => prev ? { ...prev, leaveRequested: true } : prev);
      alert(r.data?.message || 'Request sent.');
    } catch (e) {
      alert(e.response?.data?.message || 'Could not send the request.');
    }
  };

  if (error && !status) return <div className="coach-dash"><div className="coach-error">⚠️ {error}</div></div>;
  if (!status) return <div className="coach-dash"><div className="coach-empty">Loading your profile…</div></div>;

  const p = status.coachProfile || {};
  const access = status.access || {};
  const isAcademy = p.coachType === 'academy';
  // Either rate, both, or neither. A coach who quotes only a monthly package
  // used to have nothing to show here, because the display only ever read
  // hourlyRate.
  const sym = p.rateCurrency === 'USD' ? '$' : '₹';
  const rateParts = [];
  if (p.hourlyRate) rateParts.push(`${sym}${p.hourlyRate} / hour`);
  if (p.monthlyRate) rateParts.push(`${sym}${p.monthlyRate} / month`);
  const rate = rateParts.length ? rateParts.join(' · ') : null;

  const startEdit = () => {
    const next = {};
    EDITABLE.forEach(k => { next[k] = p[k] ?? ''; });
    // `languages` is an array in the document and a comma-separated string in
    // the form. Converted here and back on save, so the coach types naturally.
    next.languages = Array.isArray(p.languages) ? p.languages.join(', ') : '';
    // `teaches` stays an array — it is checkboxes, not free text.
    next.teaches = Array.isArray(p.teaches) ? p.teaches : [];
    next.publicListed = !!p.publicListed;
    next.acceptingStudents = p.acceptingStudents !== false;
    setForm(next);
    setError('');
    setEditing(true);
  };

  // Toggle one teaching level on/off.
  const toggleLevel = (key) => setForm(f => {
    const cur = Array.isArray(f.teaches) ? f.teaches : [];
    return { ...f, teaches: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] };
  });

  // Read a chosen image as a data URL. The server validates format and size —
  // this only rejects the obvious cases early so the coach gets a fast answer.
  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setError('Use a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > 2_000_000) {
      setError('That image is over 2MB. Please use a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setError(''); setForm(f => ({ ...f, profilePhotoUrl: reader.result })); };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        hourlyRate: Number(form.hourlyRate) || 0,
        monthlyRate: Number(form.monthlyRate) || 0,
        // The form edits languages as a comma-separated string; the server
        // expects a list (it also accepts the string, but sending the real
        // shape keeps the contract honest).
        languages: String(form.languages || '').split(',').map(x => x.trim()).filter(Boolean),
        // Empty rating boxes mean "not stated", not zero — send null so the
        // server clears the field instead of publishing a rating of 0.
        fideRating: form.fideRating === '' ? null : form.fideRating,
        lichessRating: form.lichessRating === '' ? null : form.lichessRating,
        chessComRating: form.chessComRating === '' ? null : form.chessComRating,
        experienceYears: form.experienceYears === '' ? null : form.experienceYears,
      };
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

  // STUDENT invite link. Deliberately separate from the referral link below:
  // that one recruits other COACHES (and pays commission), this one invites a
  // STUDENT to join this coach's roster. They look alike and do opposite things,
  // so they get their own labelled rows rather than sitting side by side.
  const joinLink = p.coachCode ? `${window.location.origin}/join-coach/${p.coachCode}` : '';
  const copyJoinLink = async () => {
    if (await copyText(joinLink)) {
      setJoinCopied(true);
      setTimeout(() => setJoinCopied(false), 1800);
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
            {rate && <span className="cp-chip">💵 {rate}</span>}
            {p.coachCode && (
              <span className="cp-code">
                {p.coachCode}
                <button onClick={copyCode}>{codeCopied ? '✓ Copied' : 'Copy'}</button>
                <button onClick={copyReferralLink}>{linkCopied ? '✓ Copied' : '🔗 Copy referral link'}</button>
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
            <div className="stat-label">Plan</div>
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{access.plan || 'free'}</div>
          </div>
          {/* Wallet card with a "?" that pops the referral explainer. */}
          {(() => {
            const balances = (wallet?.balances || []).filter(b => b.amount > 0);
            const rewardPct = Math.round((wallet?.rewardPct ?? 0.25) * 100);
            const maxPct = Math.round((wallet?.maxDiscountPct ?? 0.5) * 100);
            const sym = (c) => c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : c + ' ';
            const display = balances.length > 0
              ? balances.map(b => `${sym(b.currency)}${(b.amount / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(' · ')
              : '₹0';
            return (
              <div className="coach-stat-card cp-wallet-stat">
                <div className="stat-label">
                  Wallet
                  <button
                    type="button"
                    className="cp-wallet-help-btn"
                    aria-label="How the referral wallet works"
                    onClick={() => setWalletHelp(v => !v)}
                  >?</button>
                  {walletHelp && (
                    <>
                      <div className="cp-wallet-help-backdrop" onClick={() => setWalletHelp(false)} />
                      <div className="cp-wallet-help-pop" role="dialog">
                        Invite another coach with your code. When they make their first paid
                        subscription, you earn <strong>{rewardPct}%</strong> of what they pay as
                        wallet credit — spendable on your own plan (covers up to {maxPct}% of a purchase).
                        <Link to="/coach/subscription" className="cp-wallet-help-link">Use credit →</Link>
                      </div>
                    </>
                  )}
                </div>
                <div className="stat-value">{display}</div>
                <div className="stat-foot">{balances.length > 0 ? 'referral credit' : 'No credit yet'}</div>
              </div>
            );
          })()}
        </div>
      )}

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
              {/* Two rates, both optional. Many coaches sell a monthly package
                  and only quote an hourly figure for one-off lessons; others do
                  the reverse. Leave one blank and only the other is shown. */}
              <div className="cp-field">
                <label>Hourly rate <span className="cp-optional">optional</span></label>
                <input className="cp-input" type="number" min="0" value={form.hourlyRate} onChange={set('hourlyRate')} />
              </div>
              <div className="cp-field">
                <label>Monthly rate <span className="cp-optional">optional</span></label>
                <input className="cp-input" type="number" min="0" value={form.monthlyRate} onChange={set('monthlyRate')} />
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
              <label>Bio</label>
              {/* Rich text so a coach can head sections and list things, rather
                  than one unbroken wall of prose. No link button — see
                  components/CoachRichText.jsx. */}
              <CoachRichText
                value={form.bio}
                onChange={(html) => setForm(f => ({ ...f, bio: html }))}
                placeholder="Tell students and parents about your coaching. How long you have taught, how a lesson runs, who you work best with. Write as much as you like — there is no limit." />
            </div>

            {/* ── PUBLIC PROFILE ──────────────────────────────────────────
                Everything below appears on the coach's public page and in the
                /coaches directory. Separated from the fields above because
                those are account settings, while these are published. */}
            <div className="cp-public">
              <div className="cp-public-head">
                <h3>Your public coach page</h3>
                <p>
                  This is what students and parents see at your own page and in
                  the coach directory. Everything here is optional.
                </p>
              </div>

              {/* Photo. Deliberately not the player avatar: that one is locked
                  behind invite milestones, and a coach needs a face on their
                  page from day one. */}
              <div className="cp-photo-row">
                <div className="cp-photo-prev">
                  {form.profilePhotoUrl
                    ? <img src={form.profilePhotoUrl} alt="" />
                    : <span>{initials(form.coachName)}</span>}
                </div>
                <div className="cp-photo-ctl">
                  <label className="cp-photo-btn">
                    📷 {form.profilePhotoUrl ? 'Change photo' : 'Add a photo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} hidden />
                  </label>
                  {form.profilePhotoUrl && (
                    <button type="button" className="cp-photo-clear"
                            onClick={() => setForm(f => ({ ...f, profilePhotoUrl: '' }))}>
                      Remove
                    </button>
                  )}
                  <span className="cp-photo-hint">PNG, JPG or WebP · up to 2MB</span>
                </div>
              </div>

              <div className="cp-form-grid">
                {/* Read-only. A title is claimed once per USER in Settings →
                    Profile and granted only after an admin checks an ID
                    document, so it is not something to re-type per coach
                    profile. Shown here so a coach can see what will appear. */}
                <div className="cp-field">
                  <label>FIDE title</label>
                  <div className="cp-static">
                    {myTitle
                      ? <span className="cp-title-badge">{myTitle}</span>
                      : <span className="cp-static-empty">No verified title</span>}
                  </div>
                  <span className="cp-hint">
                    {myTitle
                      ? 'Verified — this shows on your public page.'
                      : <>Claim your title in <Link to="/settings?tab=profile">Settings → Profile</Link>. It appears here once approved.</>}
                  </span>
                </div>
                <div className="cp-field">
                  <label>Years teaching</label>
                  <input className="cp-input" type="number" min="0" max="80" placeholder="e.g. 12"
                         value={form.experienceYears} onChange={set('experienceYears')} />
                </div>
                <div className="cp-field">
                  <label>FIDE rating</label>
                  <input className="cp-input" type="number" min="0" max="3000" placeholder="e.g. 2145"
                         value={form.fideRating} onChange={set('fideRating')} />
                </div>
                <div className="cp-field">
                  <label>Lichess rating</label>
                  <input className="cp-input" type="number" min="0" max="4000" placeholder="e.g. 2280"
                         value={form.lichessRating} onChange={set('lichessRating')} />
                </div>
                <div className="cp-field">
                  <label>Chess.com rating</label>
                  <input className="cp-input" type="number" min="0" max="4000" placeholder="e.g. 2190"
                         value={form.chessComRating} onChange={set('chessComRating')} />
                </div>
                <div className="cp-field">
                  <label>Teaching languages</label>
                  <input className="cp-input" placeholder="English, Tamil, Hindi"
                         value={form.languages} onChange={set('languages')} />
                  <span className="cp-hint">Separate with commas</span>
                </div>
              </div>

              <div className="cp-field">
                <label>Who you teach</label>
                <div className="cp-levels">
                  {LEVELS.map(l => (
                    <button key={l.key} type="button"
                            className={`cp-level ${(form.teaches || []).includes(l.key) ? 'on' : ''}`}
                            onClick={() => toggleLevel(l.key)}>
                      {(form.teaches || []).includes(l.key) ? '✓ ' : ''}{l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cp-field">
                <label>Achievements</label>
                <CoachRichText
                  value={form.coachAchievements}
                  onChange={(html) => setForm(f => ({ ...f, coachAchievements: html }))}
                  placeholder="Titles, tournament results, students you have coached to norms or national events. A bulleted list reads best." />
              </div>

              {/* ── Gallery ─────────────────────────────────────────────────
                  Photos for the public page: medals, class pictures, event
                  shots. Uploaded one at a time and saved immediately — they are
                  files on the server, not part of the profile form, so making
                  them wait for "Save changes" would be misleading. */}
              <div className="cp-field">
                <label>Gallery</label>
                <div className="cp-hint">
                  Up to {GALLERY_MAX} photos, each under 2 MB. Shown on your
                  public page — medals, classes, tournaments.
                </div>

                <div className="cp-gal-grid">
                  {gallery.map((img) => (
                    <div key={img.id || img.url} className="cp-gal-cell">
                      <img src={img.url} alt={img.caption || ''} loading="lazy" />
                      <button
                        type="button"
                        className="cp-gal-del"
                        onClick={() => removeGalleryImage(img.id)}
                        disabled={galleryBusy}
                        aria-label="Remove this photo"
                        title="Remove"
                      >✕</button>
                      <input
                        type="text"
                        className="cp-gal-caption"
                        placeholder="Add a caption…"
                        defaultValue={img.caption || ''}
                        maxLength={120}
                        onBlur={(e) => saveGalleryCaption(img.id, e.target.value)}
                      />
                    </div>
                  ))}

                  {gallery.length < GALLERY_MAX && (
                    <label className={`cp-gal-add${galleryBusy ? ' is-busy' : ''}`}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={onGalleryFile}
                        disabled={galleryBusy}
                        hidden
                      />
                      <span className="cp-gal-add-ic">{galleryBusy ? '…' : '+'}</span>
                      <span className="cp-gal-add-tx">
                        {galleryBusy ? 'Uploading…' : 'Add photo'}
                      </span>
                    </label>
                  )}
                </div>

                <div className="cp-gal-foot">
                  <span>{gallery.length} / {GALLERY_MAX} photos</span>
                  {galleryError && <span className="cp-gal-err">{galleryError}</span>}
                </div>
              </div>

              <div className="cp-toggles">
                <label className="cp-toggle">
                  <input type="checkbox" checked={!!form.acceptingStudents}
                         onChange={e => setForm(f => ({ ...f, acceptingStudents: e.target.checked }))} />
                  <span>
                    <strong>I am taking new students</strong>
                    <em>Shows an "open to students" badge. Turn it off when you are full.</em>
                  </span>
                </label>
                <label className="cp-toggle">
                  <input type="checkbox" checked={!!form.publicListed}
                         onChange={e => setForm(f => ({ ...f, publicListed: e.target.checked }))} />
                  <span>
                    <strong>List me in the public coach directory</strong>
                    <em>
                      Off by default. Your page only goes live once you are
                      verified by the Nexus team AND this is on.
                    </em>
                  </span>
                </label>
              </div>
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
            {/* "Rate", not "Hourly rate" — this line may now show an hourly
                figure, a monthly one, or both. */}
            <Row label="Rate">{rate || NOT_SET}</Row>
            <Row label="Bio">
              {p.bio
                ? <CoachProse html={p.bio} />
                : NOT_SET}
            </Row>
            {/* User.chessTitle — granted by an approved title claim, never
                typed on this page. */}
            <Row label="FIDE title">
              {myTitle
                ? <span className="cp-title-badge">{myTitle}</span>
                : <>{NOT_SET} · <Link to="/settings?tab=profile">claim your title</Link></>}
            </Row>
            <Row label="Ratings">
              {(p.fideRating || p.lichessRating || p.chessComRating)
                ? [
                    p.fideRating && `FIDE ${p.fideRating}`,
                    p.lichessRating && `Lichess ${p.lichessRating}`,
                    p.chessComRating && `Chess.com ${p.chessComRating}`,
                  ].filter(Boolean).join(' · ')
                : NOT_SET}
            </Row>
            <Row label="Years teaching">{p.experienceYears ?? NOT_SET}</Row>
            <Row label="Languages">
              {(p.languages || []).length ? p.languages.join(', ') : NOT_SET}
            </Row>
            <Row label="Teaches">
              {(p.teaches || []).length
                ? p.teaches.map(t => t[0].toUpperCase() + t.slice(1)).join(', ')
                : NOT_SET}
            </Row>
            <Row label="Achievements">
              {p.coachAchievements
                ? <CoachProse html={p.coachAchievements} />
                : NOT_SET}
            </Row>
            {/* Where the public page stands. Both gates are shown because a
                coach who ticked "list me" and is still unverified would
                otherwise wonder why their page 404s. */}
            <Row label="Public page">
              {!p.publicListed
                ? <span className="cp-not-set">Not listed — turn it on in Edit profile</span>
                : !p.verified
                  ? <span style={{ color: '#fcd34d' }}>Waiting for verification by the Nexus team</span>
                  : (
                    <span className="cp-joinlink">
                      <code>{`${window.location.origin}/coaches/${p.coachCode}`.replace(/^https?:\/\//, '')}</code>
                      <a href={`/coaches/${p.coachCode}`} target="_blank" rel="noreferrer">View</a>
                    </span>
                  )}
            </Row>
            <Row label="Coach code">
              {p.coachCode ? (
                <span className="cp-code">
                  {p.coachCode}
                  <button onClick={copyCode}>{codeCopied ? '✓ Copied' : 'Copy'}</button>
                </span>
              ) : NOT_SET}
            </Row>
            <Row label="Student invite link">
              {p.coachCode ? (
                <span className="cp-joinlink">
                  <code>{joinLink.replace(/^https?:\/\//, '')}</code>
                  <button onClick={copyJoinLink}>{joinCopied ? '✓ Copied' : '🔗 Copy'}</button>
                  <em>Send this to a student or parent. They ask to join, and you approve.</em>
                </span>
              ) : NOT_SET}
            </Row>
            <Row label="Verification">
              {p.verified
                ? <span style={{ color: '#6ee7b7' }}>🎓 Verified by the Nexus team</span>
                : <span style={{ color: '#fcd34d' }}>⏳ Awaiting verification</span>}
            </Row>
            {p.socialUsername && (
              <Row label="Social">{SOCIAL_LABEL[p.socialPlatform] || p.socialPlatform} · @{p.socialUsername}</Row>
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
            {status?.coachSubscription?.sponsoredByAcademy && academyInfo?.academy && (
              <Row label="Academy">
                <span style={{ color: '#67e8f9' }}>🏛️ Member of {academyInfo.academy.name}</span>
              </Row>
            )}
            {access.downgraded && !status?.coachSubscription?.sponsoredByAcademy && (
              <Row label="Status">
                <span style={{ color: '#fcd34d' }}>Your paid plan lapsed — you're on the free tier.</span>
              </Row>
            )}
          </div>
          {status?.coachSubscription?.sponsoredByAcademy && academyInfo?.academy ? (
            <div className="cp-academy-block">
              <div className="cp-academy-line">
                🏛️ You were added by <strong>{academyInfo.academy.name}</strong>
                {academyInfo.role && academyInfo.role !== 'coach' ? ` · ${academyInfo.role}` : ''}
              </div>
              {academyInfo.academy.planName && (
                <div className="cp-academy-line">
                  Plan bought for you: <strong style={{ color: '#67e8f9' }}>{academyInfo.academy.planName}</strong>
                  {academyInfo.academy.planStudentsPerCoach ? ` · up to ${academyInfo.academy.planStudentsPerCoach} students` : ''}
                </div>
              )}
              {academyInfo.academy.planFeatures?.length > 0 && (
                <ul className="cp-academy-feats">
                  {academyInfo.academy.planFeatures.map(f => <li key={f}>✓ {f}</li>)}
                </ul>
              )}
              <div className="cp-academy-note">
                Your academy pays for your subscription — you don't buy a plan yourself.
              </div>
              {/* Members (not the head) can ask to leave and go independent. */}
              {!academyInfo.isOwner && (
                academyInfo.leaveRequested ? (
                  <div className="cp-academy-pending">⏳ Your request to become an individual coach is pending with the academy.</div>
                ) : (
                  <button className="btn-ghost" style={{ marginTop: 12 }} onClick={requestLeaveAcademy}>
                    Become an individual coach
                  </button>
                )
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <Link to="/coach/subscription" className="btn-primary">Manage subscription</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
