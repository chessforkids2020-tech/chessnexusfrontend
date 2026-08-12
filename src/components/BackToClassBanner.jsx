// src/components/BackToClassBanner.jsx
//
// Shown on the arena race pages when the tab was opened FROM a live class.
//
// Why this exists: in a real class the coach pasted the race link into class
// chat. Chat links open with target="_blank" (see utils/linkify.jsx), so the
// class tab was still open and still connected the whole time — but young
// students did not know that. They could not tell the class was still there,
// and did not know that closing the tab would take them back to it. Older kids
// coped; small kids were stranded.
//
// So the fix is not to move the race into the classroom (ArenaRace.jsx is 1,243
// lines and owns its own routing) — it is to TELL the child the class is still
// waiting, and give them one obvious button to get back.
//
// window.opener is set by the browser on any target="_blank" navigation and is
// null for a normal visit, so the banner appears ONLY for students who arrived
// from a class and never bothers anyone else.
import React, { useEffect, useState } from 'react';

export default function BackToClassBanner() {
  const [cameFromClass, setCameFromClass] = useState(false);

  useEffect(() => {
    try {
      // opener exists => this tab was opened by another page. We deliberately do
      // NOT read opener.location (cross-origin reads throw); its mere presence
      // is enough, and the class is the only thing that opens race links in a
      // new tab from inside the app.
      if (window.opener && !window.opener.closed) setCameFromClass(true);
    } catch {
      /* opener inaccessible — treat as a normal visit */
    }
  }, []);

  if (!cameFromClass) return null;

  const goBack = () => {
    try {
      // Focus the class tab first so the child SEES it come forward, then close
      // this one. If close() is blocked (some browsers refuse), focusing the
      // opener still puts them back in the class.
      if (window.opener && !window.opener.closed) window.opener.focus();
    } catch { /* ignore */ }
    try { window.close(); } catch { /* ignore */ }
  };

  return (
    <div style={S.bar}>
      <span style={S.text}>
        <span style={S.dot} />
        Your class is still open in the other tab.
      </span>
      <button style={S.btn} onClick={goBack}>
        ← Back to class
      </button>
    </div>
  );
}

const S = {
  bar: {
    position: 'sticky', top: 0, zIndex: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 14, flexWrap: 'wrap',
    padding: '10px 16px',
    background: 'linear-gradient(135deg, var(--color-accent-a15), var(--color-accent-2-a12))',
    borderBottom: '1px solid rgba(52,211,153,0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  text: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#e6e8ee', fontSize: 14, fontWeight: 600 },
  dot: {
    width: 9, height: 9, borderRadius: '50%', background: 'var(--color-danger)', flex: 'none',
    boxShadow: '0 0 8px 1px rgba(239,68,68,0.8)',
  },
  btn: {
    padding: '8px 18px', borderRadius: 999, cursor: 'pointer',
    fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap',
    color: '#04211d', border: '1px solid transparent',
    background: 'linear-gradient(135deg,var(--color-accent) 0%,var(--color-accent-2) 100%)',
    boxShadow: '0 6px 18px rgba(52,211,153,0.35)',
  },
};
