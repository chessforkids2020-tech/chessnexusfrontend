/**
 * Lightweight client-side analytics tracker.
 *
 * Works for guests AND logged-in users (identified by a persistent sessionId).
 * Events are queued in memory and flushed in batches to /api/analytics/batch on
 * a short debounce and when the page is hidden/unloaded (via sendBeacon).
 *
 * Intentionally dependency-free: it uses fetch/sendBeacon directly (NOT the
 * axios `api` client) so that `api.js` can import this module to report
 * api_failure events without creating a circular import, and so analytics'
 * own network calls never re-trigger the axios error interceptor.
 *
 * Fire-and-forget: failures are swallowed so tracking never affects the user.
 */

const API_URL = import.meta.env.VITE_API_URL || '';
const BATCH_URL = `${API_URL}/api/analytics/batch`;
const SESSION_KEY = 'analyticsSessionId';
const FLUSH_DELAY = 4000; // ms debounce for normal flushes
const MAX_QUEUE = 50;

let queue = [];
let flushTimer = null;

/** Read or lazily create a persistent session id (works in guest mode too). */
export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ||
        `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('authToken');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore */ }
  return headers;
}

function detectDevice() {
  if (typeof navigator === 'undefined') return null;
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
    ? 'mobile'
    : 'desktop';
}

function buildEvent(eventType, metadata, page) {
  return {
    eventType,
    page: page ?? (typeof window !== 'undefined' ? window.location.pathname : null),
    sessionId: getSessionId(),
    device: detectDevice(),
    metadata: metadata || {},
    ts: Date.now()
  };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_DELAY);
}

/** Flush the queue via fetch (normal path). */
export function flush() {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  try {
    fetch(BATCH_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ events }),
      keepalive: true
    }).catch(() => { /* swallow — tracking must never surface to the user */ });
  } catch {
    /* ignore */
  }
}

/**
 * Flush synchronously on unload using sendBeacon (fetch won't reliably send
 * during pagehide). Beacon body is a JSON Blob so express.json() can parse it.
 */
function flushBeacon() {
  if (!queue.length) return;
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    flush();
    return;
  }
  const events = queue;
  queue = [];
  try {
    const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
    navigator.sendBeacon(BATCH_URL, blob);
  } catch {
    /* ignore */
  }
}

/** Queue a generic event. */
export function trackEvent(eventType, metadata = {}, page = undefined) {
  if (!eventType) return;
  queue.push(buildEvent(eventType, metadata, page));
  if (queue.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}

/** Queue a page view. */
export function trackPageView(page, metadata = {}) {
  trackEvent('pageview', metadata, page);
}

// ---- Global listeners: flush-on-leave + uncaught errors ----
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacon();
  });
  window.addEventListener('pagehide', flushBeacon);

  // Uncaught runtime errors
  window.addEventListener('error', (e) => {
    trackEvent('error', {
      message: String(e.message || '').slice(0, 300),
      source: e.filename || null,
      line: e.lineno || null
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    trackEvent('error', {
      message: String(reason?.message || reason || 'unhandledrejection').slice(0, 300),
      kind: 'unhandledrejection'
    });
  });
}
