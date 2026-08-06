// components/coach/CoachHelpMenu.jsx
//
// "Help" beside the coach's Profile button. Three things a coach might need,
// and all three already existed — they were just buried where a coach would
// never find them mid-work:
//
//   1. Report a bug        → POST /api/reports (the existing support inbox;
//                            admin replies land in the user's bell)
//   2. Request a feature   → the same inbox, tagged so feature demand can be
//                            told apart from breakage
//   3. Book a call         → the existing BookDemoModal, unchanged
//
// Nothing new on the server. A coach who hits a wall at 9pm on a Sunday should
// not have to hunt through marketing pages to tell someone.
import React, { useEffect, useRef, useState } from 'react';
import api from '../../api';
import BookDemoModal from '../BookDemoModal';
import './CoachHelpMenu.css';

export default function CoachHelpMenu() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);      // 'bug' | 'feature' | null
  const [demo, setDemo] = useState(false);
  const wrapRef = useRef(null);

  // Close on an outside click or Escape — a dropdown that traps you is worse
  // than no dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openForm = (kind) => { setOpen(false); setForm(kind); };

  return (
    <div className="chm-wrap" ref={wrapRef}>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ❓ Help
      </button>

      {open && (
        <div className="chm-menu" role="menu">
          <button type="button" className="chm-item" role="menuitem" onClick={() => openForm('bug')}>
            <span className="chm-ic" aria-hidden="true">🐞</span>
            <span>
              <b>Report a problem</b>
              <em>Something is broken or behaving oddly</em>
            </span>
          </button>
          <button type="button" className="chm-item" role="menuitem" onClick={() => openForm('feature')}>
            <span className="chm-ic" aria-hidden="true">💡</span>
            <span>
              <b>Request a feature</b>
              <em>Tell us what would help your coaching</em>
            </span>
          </button>
          <button
            type="button"
            className="chm-item"
            role="menuitem"
            onClick={() => { setOpen(false); setDemo(true); }}
          >
            <span className="chm-ic" aria-hidden="true">📅</span>
            <span>
              <b>Talk to the team</b>
              <em>Book a call with Chess Nexus</em>
            </span>
          </button>
        </div>
      )}

      {form && <HelpForm kind={form} onClose={() => setForm(null)} />}
      {/* BookDemoModal is controlled by an `open` prop, not conditional
          rendering — it keeps its own form state and success screen. */}
      <BookDemoModal open={demo} onClose={() => setDemo(false)} />
    </div>
  );
}

// One form for both a bug report and a feature request. They differ only in
// wording and in the subject prefix, which is what lets the admin inbox tell
// "this is broken" apart from "I wish it did this".
function HelpForm({ kind, onClose }) {
  const isBug = kind === 'bug';
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (busy) return;
    if (!subject.trim() || !details.trim()) {
      setErr('Please fill in both fields.');
      return;
    }
    setBusy(true); setErr('');
    try {
      await api.post('/api/reports', {
        // Prefixed so the admin inbox can sort coach feedback at a glance
        // without a schema change.
        subject: `${isBug ? '[Coach bug]' : '[Coach feature]'} ${subject.trim()}`,
        details: details.trim(),
      });
      setSent(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not send that. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="chm-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="chm-x" onClick={onClose} aria-label="Close">×</button>

        {sent ? (
          <div className="chm-done">
            <div className="chm-done-ic" aria-hidden="true">✓</div>
            <h3>Thank you</h3>
            <p>
              {isBug
                ? 'We have got it. If we need more detail we will reply — you will see it in your notifications.'
                : 'Noted. Coach requests genuinely shape what gets built next.'}
            </p>
            <button type="button" className="chm-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h3>{isBug ? '🐞 Report a problem' : '💡 Request a feature'}</h3>
            <p className="chm-sub">
              {isBug
                ? 'Tell us what happened and where. The more specific, the faster we can fix it.'
                : 'What would make your coaching easier? We read every one of these.'}
            </p>

            <label className="chm-label">
              {isBug ? 'What went wrong?' : 'What would you like?'}
              <input
                className="chm-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isBug
                  ? 'e.g. Student video is black in the live class'
                  : 'e.g. Let me assign homework to a whole batch at once'}
                maxLength={140}
              />
            </label>

            <label className="chm-label">
              {isBug ? 'What were you doing at the time?' : 'How would you use it?'}
              <textarea
                className="chm-textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder={isBug
                  ? 'Which page, what you clicked, what you expected to happen. Browser and device help too.'
                  : 'A sentence or two about the problem it would solve for you.'}
                maxLength={2000}
              />
            </label>

            {err && <div className="chm-err">{err}</div>}

            <button type="button" className="chm-primary" onClick={submit} disabled={busy}>
              {busy ? 'Sending…' : isBug ? 'Send report' : 'Send request'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
