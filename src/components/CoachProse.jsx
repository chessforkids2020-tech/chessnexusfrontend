// components/CoachProse.jsx
//
// Renders the rich text a coach wrote (bio, achievements).
//
// ── WHY dangerouslySetInnerHTML IS CORRECT HERE ──────────────────────────────
//
// The content is sanitised on the way IN, by backend/helpers/coachRichText.js,
// on every write path — so what is stored is already reduced to a small set of
// formatting tags with no attributes that can execute, load a resource, or link
// anywhere. Sanitising at write time rather than at render time is deliberate:
// there are several places that display a coach bio (their own profile, the
// public page, the directory, the admin list) and only one that saves it. A
// render-time sanitiser would have to be remembered at every one of those, and
// the one that got forgotten would be the vulnerability.
//
// The corollary matters: DO NOT pass anything to this component that has not
// been through cleanCoachHtml. It is not a sanitiser.
//
// Legacy content is plain text with real newlines. That still renders correctly
// because .coach-prose sets `white-space: pre-wrap`, so a coach who has not
// re-edited since the switch keeps their line breaks.
import React from 'react';
import './CoachProse.css';

export default function CoachProse({ html, className = '' }) {
  if (!html) return null;
  return (
    <div
      className={`coach-prose ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
