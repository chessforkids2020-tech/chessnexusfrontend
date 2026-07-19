import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from './FeedbackModal';

// Show the first-session feedback prompt ONCE, ~3 minutes after the user has been
// active in the app. Targets NEW signups (accounts <= 3 days old) AND guest users —
// the freshest visitors whose first impression we most want to capture. Existing
// long-time members are never nagged.
const ACTIVE_MS_BEFORE_PROMPT = 3 * 60 * 1000; // 3 minutes of session activity
const NEW_ACCOUNT_MAX_DAYS = 3;                // members: only accounts created in the last N days

const uid = (user) => (user && (user._id || user.id)) || null;
const shownKey = (id) => `feedbackPromptShown_${id}`;
const startKey = (id) => `feedbackSessionStart_${id}`;

export default function FeedbackPromptGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any pending timer whenever the user changes / unmounts.
    const clear = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const id = uid(user);
    if (!id) return clear;

    const isGuest = user.role === 'guest' || user.isGuest;

    // Guests always qualify (they're the freshest visitors and have no memberSince).
    // Members qualify only if the account is brand-new (<= N days old), so we never
    // nag long-time users.
    if (!isGuest) {
      if (!user.memberSince) return clear;
      const ageDays = (Date.now() - new Date(user.memberSince).getTime()) / 86400000;
      if (!(ageDays >= 0 && ageDays <= NEW_ACCOUNT_MAX_DAYS)) return clear;
    }

    // Never re-prompt an account that has already answered or dismissed.
    try { if (localStorage.getItem(shownKey(id))) return clear; } catch { return clear; }

    // Anchor the session timer once per account (persists across page navigations
    // within the app). Elapsed time from that anchor drives the ~10-min trigger.
    let start;
    try {
      start = Number(localStorage.getItem(startKey(id)));
      if (!start || Number.isNaN(start)) {
        start = Date.now();
        localStorage.setItem(startKey(id), String(start));
      }
    } catch {
      start = Date.now();
    }

    const remaining = ACTIVE_MS_BEFORE_PROMPT - (Date.now() - start);
    if (remaining <= 0) {
      setOpen(true);
    } else {
      timerRef.current = setTimeout(() => setOpen(true), remaining);
    }

    return clear;
  }, [user]);

  // Both submit and dismiss mark the prompt as shown so it never reappears.
  const markShown = () => {
    const id = uid(user);
    if (!id) return;
    try { localStorage.setItem(shownKey(id), '1'); } catch { /* ignore */ }
  };

  const handleClose = () => { markShown(); setOpen(false); };
  const handleSubmitted = () => { markShown(); };

  return <FeedbackModal open={open} onClose={handleClose} onSubmitted={handleSubmitted} />;
}
