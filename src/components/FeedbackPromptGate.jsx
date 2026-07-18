import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from './FeedbackModal';

// Show the first-session feedback prompt ONCE to NEW signups, after they've been
// actively in the app for ~10 minutes. Deliberately narrow so we never nag
// existing users or guests.
const ACTIVE_MS_BEFORE_PROMPT = 10 * 60 * 1000; // 10 minutes of session activity
const NEW_ACCOUNT_MAX_DAYS = 3;                  // only accounts created in the last N days

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

    // Only real members — never guests.
    if (user.role === 'guest' || user.isGuest) return clear;

    // Only brand-new accounts (targets first-timers, not long-time users).
    if (!user.memberSince) return clear;
    const ageDays = (Date.now() - new Date(user.memberSince).getTime()) / 86400000;
    if (!(ageDays >= 0 && ageDays <= NEW_ACCOUNT_MAX_DAYS)) return clear;

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
