// components/CoachRichText.jsx
//
// The editor a coach writes their bio and achievements in.
//
// ── NO LINK BUTTON, AND NO CLEAR-FORMATTING BUTTON ───────────────────────────
//
// The toolbar is declared explicitly rather than using Quill's default, which
// ships both. Links are removed because a coach profile is a page people reach
// from search and from the directory, and outbound links there become a way to
// send students off-platform. The button being absent is only the visible half
// of that rule — backend/helpers/coachRichText.js strips <a> on save, which is
// what actually enforces it.
//
// A FIXED TOOLBAR ARRAY IS ALSO A SECURITY BOUNDARY. Quill's default includes
// image and video embeds; both would let a coach put a remote resource on a
// public page. Listing the controls means adding one is a deliberate act.
//
// `modules` is defined at module scope, NOT inline. A new object identity on
// every render makes ReactQuill tear down and rebuild the editor, which loses
// the cursor mid-sentence — the classic ReactQuill bug.
import React, { Suspense, lazy } from 'react';
import 'react-quill/dist/quill.snow.css';
import './CoachRichText.css';

// react-quill is ~370KB and only two pages use it (coach profile, club detail),
// but a static import put it in the FIRST load of every page. Lazy keeps it out
// until an editor is actually rendered.
const ReactQuill = lazy(() => import('react-quill'));

const MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],   // Normal / two heading sizes
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
  ],
  clipboard: {
    // Paste as plain-ish text: a CV pasted from Word arrives full of inline
    // styles and font tags that the sanitiser strips anyway, so matching
    // visual makes the editor show something the saved version will not.
    matchVisual: false,
  },
};

// Belt and braces with the sanitiser: Quill itself refuses to produce anything
// outside this list, so a paste cannot smuggle a format the toolbar lacks.
const FORMATS = ['header', 'bold', 'italic', 'underline', 'list', 'bullet'];

export default function CoachRichText({ value, onChange, placeholder }) {
  return (
    <div className="crt">
      {/* The fallback matches the editor's own height so the form does not jump
          while the chunk loads. */}
      <Suspense fallback={<div className="crt-loading" style={{ minHeight: 140 }} />}>
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={MODULES}
          formats={FORMATS}
          placeholder={placeholder}
        />
      </Suspense>
    </div>
  );
}
