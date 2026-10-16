// utils/newsletterMedia.js
// Newsletter bodies are STORED with server-relative image paths
// ("/api/public/newsletter/x.jpg") so a post isn't tied to one host. In
// production the app (www.chessnexus.in) and the API (api.chessnexus.in) are
// different origins, so a relative <img src> would load from the app and 404.
// Anything that renders a stored body — the reader page AND the admin editor
// when reopening a post — must prefix those paths with the API host first.
import { resolveApiAssetUrl } from '../api';

// Only touches paths the upload route produces, so nothing else in the markup
// can be rewritten by accident.
export function withNewsletterMediaHosts(html) {
  return String(html || '').replace(
    /(<img[^>]*src=")(\/api\/public\/newsletter\/[^"]+)(")/gi,
    (_m, pre, path, post) => `${pre}${resolveApiAssetUrl(path)}${post}`,
  );
}

// For REOPENING a post in the editor. The server stores an image's placement as
// class="nl-img-right" etc., but Quill strips `class` from images — so a saved
// post re-saved from the editor would lose every placement. Turn the class back
// into the alt marker the editor writes ("[nl-img-right]"), which Quill keeps
// and the server converts to a class again on save
// (backend/helpers/newsletterHtml.js).
export function newsletterBodyForEditor(html) {
  return withNewsletterMediaHosts(html).replace(/<img\b[^>]*>/gi, (tag) => {
    const cls = /\bclass="[^"]*\b(nl-img-(?:left|right|full))\b[^"]*"/i.exec(tag);
    if (!cls) return tag;
    const alt = /\balt="([^"]*)"/i.exec(tag);
    const marker = `[${cls[1]}]${alt ? alt[1] : ''}`;
    const noClass = tag.replace(cls[0], '');
    return alt
      ? noClass.replace(alt[0], `alt="${marker}"`)
      : noClass.replace(/<img\b/i, `<img alt="${marker}"`);
  });
}
