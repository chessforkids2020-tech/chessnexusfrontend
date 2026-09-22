// components/NewsletterRichText.jsx
//
// The editor an ADMIN writes a newsletter post in.
//
// ── WHY NOT REUSE CoachRichText ──────────────────────────────────────────────
// That editor deliberately has NO link button: a coach profile is a public
// landing page, and outbound links there become a way to send students
// off-platform. Correct there, wrong here — the entire point of a "we built
// trial classes" post is a link that takes the reader to trial classes.
//
// ── IMAGES GO IN THE MIDDLE OF THE WRITING ───────────────────────────────────
// Pictures are inserted AT THE CURSOR, not collected at the end of the post: a
// screenshot is only useful beside the sentence that describes it. The admin
// picks a placement first — right, left or full width — and the editor writes a
// <figure> carrying that class. Text then wraps around the floated ones.
//
// The three class names here are mirrored in TWO other places and all three
// must agree:
//   • backend/helpers/newsletterHtml.js — allowedClasses (anything else is
//     stripped, and the figure falls back to full width)
//   • frontend/src/pages/Newsletter.css — the float rules themselves
//
// ── WHY A CUSTOM HANDLER RATHER THAN QUILL'S IMAGE BUTTON ────────────────────
// Quill's built-in image control base64-encodes the file straight into the HTML
// body. A few screenshots would then weigh several megabytes, stored in the
// document, re-sent on every read, and impossible to cache. This uploads first
// and inserts a URL.
import React, { Suspense, lazy, useCallback, useMemo, useRef } from 'react';
import { resolveApiAssetUrl } from '../api';
import 'react-quill/dist/quill.snow.css';
import './CoachRichText.css';

const ReactQuill = lazy(() => import('react-quill'));

const FORMATS = [
  'header', 'bold', 'italic', 'underline',
  'list', 'bullet', 'blockquote', 'link', 'image',
];

export default function NewsletterRichText({ value, onChange, placeholder, onUpload }) {
  const quillRef = useRef(null);
  const fileRef = useRef(null);
  const placementRef = useRef('nl-img-right');

  // Insert the picture at the cursor, carrying its placement in the ALT text.
  //
  // ── WHY ALT, OF ALL THINGS ──────────────────────────────────────────────
  // Two earlier attempts failed for the same underlying reason — Quill 1.3.7
  // discards anything its blots do not recognise:
  //   1. `<figure class="…"><img></figure>` — there is no figure blot, so the
  //      wrapper vanished and a bare, unstyled <img> was stored.
  //   2. `<img class="…">` — the Image blot's ATTRIBUTES list is exactly
  //      ['alt', 'height', 'width'] (node_modules/quill/formats/image.js), so
  //      `class` was stripped the moment the image was inserted. The class
  //      never reached the database, which is why every picture came out
  //      centred no matter which placement was chosen.
  //
  // `alt` IS on that list, so it survives. The placement is encoded as a
  // prefix there, and the server turns it back into a real class on save —
  // see backend/helpers/newsletterHtml.js. Hijacking alt is not elegant, but
  // the alternative is registering a custom blot, which means owning a
  // subclass of Quill's internals across upgrades for one attribute.
  // `url` arrives from the upload as a SERVER-RELATIVE path
  // ("/api/public/newsletter/x.jpg"). Quill puts it straight into an <img>, and
  // in production the browser then resolves it against the APP origin
  // (chessnexus.in) rather than the API — so the picture 404'd inside the
  // editor while the very same file served fine from api.chessnexus.in.
  //
  // Resolved to an absolute URL here so the admin SEES the image while writing.
  // What gets STORED is normalised back to a relative path on save (see
  // backend/helpers/newsletterHtml.js), so the post body stays host-agnostic.
  const insertImage = useCallback((relUrl, placement) => {
    const url = resolveApiAssetUrl(relUrl);
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    const range = editor.getSelection(true);
    const at = range ? range.index : editor.getLength();
    editor.clipboard.dangerouslyPasteHTML(
      at,
      `<p><img src="${url}" alt="[${placement}]" /></p><p><br></p>`,
      'user',
    );
    // Put the caret after what we just inserted so typing continues below the
    // picture rather than inside it.
    editor.setSelection(at + 1, 0, 'user');
  }, []);

  const pickFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';                 // allow re-picking the same file
    if (!file || !onUpload) return;
    try {
      const url = await onUpload(file);
      if (url) insertImage(url, placementRef.current);
    } catch { /* the page shows the upload error */ }
  }, [onUpload, insertImage]);

  // MODULES must be stable: a fresh object each render makes ReactQuill tear
  // down and rebuild the editor, losing the cursor mid-sentence (the classic
  // ReactQuill bug). useMemo with [] keeps one identity for the component's
  // life, and the handler reads refs so it never goes stale.
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link'],
        ['image'],
        ['clean'],
      ],
      handlers: {
        image: function imageHandler() {
          // Ask where it goes BEFORE the file dialog: once the picker is open
          // the answer is needed the moment it closes.
          const choice = window.prompt(
            'Where should this picture sit?\n\n'
            + 'r = right of the text (text wraps on the left)\n'
            + 'l = left of the text (text wraps on the right)\n'
            + 'f = full width',
            'r',
          );
          if (choice === null) return;                  // cancelled
          const c = String(choice).trim().toLowerCase();
          placementRef.current =
            c === 'l' ? 'nl-img-left' :
            c === 'f' ? 'nl-img-full' : 'nl-img-right';
          fileRef.current?.click();
        },
      },
    },
    clipboard: { matchVisual: false },
  }), []);

  return (
    <div className="crt">
      <Suspense fallback={<div className="crt-loading" style={{ minHeight: 220 }} />}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={FORMATS}
          placeholder={placeholder}
        />
      </Suspense>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" hidden onChange={pickFile} />
    </div>
  );
}
