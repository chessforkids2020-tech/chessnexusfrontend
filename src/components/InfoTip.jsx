import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './InfoTip.css';

// A small "?" next to a heading. The explanation shows on hover (desktop) or
// tap (touch), so pages can show the numbers and keep the prose out of the way.
export default function InfoTip({ children, label = 'What is this?' }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState('center'); // center | left | right
  const ref = useRef(null);
  const popRef = useRef(null);
  const pointerRef = useRef('mouse');
  const [shift, setShift] = useState(0);

  // After it opens, measure the real popover and nudge it inside the screen —
  // the alignment guess above cannot know its final width.
  useLayoutEffect(() => {
    if (!open) { setShift(0); return; }
    const b = popRef.current?.getBoundingClientRect();
    if (!b) return;
    const pad = 8;
    if (b.right > window.innerWidth - pad) setShift(s => s - (b.right - (window.innerWidth - pad)));
    else if (b.left < pad) setShift(s => s + (pad - b.left));
  }, [open, align]);

  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const half = 150; // half the popover's max width
    if (r.left + r.width / 2 - half < 8) setAlign('left');
    else if (r.left + r.width / 2 + half > window.innerWidth - 8) setAlign('right');
    else setAlign('center');
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`infotip${open ? ' is-open' : ''}`}
      // Hover only for a real mouse. Touch devices also fire enter events just
      // before a tap, which opened the tip and let the tap's click close it again.
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') { place(); setOpen(true); } }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
    >
      <button
        type="button"
        className="infotip-btn"
        aria-label={label}
        aria-expanded={open}
        onPointerDown={(e) => { pointerRef.current = e.pointerType || 'mouse'; }}
        onClick={(e) => {
          e.stopPropagation();
          place();
          // A mouse click on an already-hovered tip keeps it open; a tap toggles.
          if (pointerRef.current === 'mouse') setOpen(true); else setOpen(o => !o);
        }}
      >?</button>
      {open && (
        <span
          ref={popRef}
          className={`infotip-pop infotip-pop--${align}`}
          style={shift ? { marginLeft: shift } : undefined}
          role="tooltip"
        >{children}</span>
      )}
    </span>
  );
}
