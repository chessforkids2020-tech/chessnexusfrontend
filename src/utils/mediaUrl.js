// utils/mediaUrl.js
//
// Turn a server-relative upload path into one the browser can actually fetch.
//
// WHY THIS IS NEEDED
// ──────────────────
// Upload routes return paths like "/api/public/newsletter/nl-123.png". In
// development that just works: the Vite dev server proxies /api to the backend,
// so the app and the API share an origin.
//
// PRODUCTION IS SPLIT ACROSS TWO HOSTS — the app on www.chessnexus.in, the API
// on api.chessnexus.in. A bare "/api/public/..." in an <img src> is resolved
// against the APP's origin, where nothing of the sort exists, so the picture
// silently 404s. That is why a newsletter cover uploaded fine but never
// appeared: the upload succeeded, the URL pointed at the wrong host.
//
// Anything already absolute (http://, https://, data:, blob:) is returned
// untouched, so this is safe to wrap around a value of unknown origin.
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function mediaUrl(path) {
  const p = String(path || '');
  if (!p) return '';
  // Already absolute, or an inline/object URL — nothing to do.
  if (/^(https?:)?\/\//i.test(p) || /^(data|blob):/i.test(p)) return p;
  // No API base configured (dev, where /api is proxied) — leave it relative.
  if (!API_BASE) return p;
  return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
}

export default mediaUrl;
