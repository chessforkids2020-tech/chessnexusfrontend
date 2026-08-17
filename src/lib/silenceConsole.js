// Keep the browser console clean for users in production.
//
// Our OWN console.* calls are already removed at build time by esbuild's
// `drop: ['console', 'debugger']` in vite.config.js — that is the real fix and
// it costs nothing at runtime. This file exists for what that cannot reach:
// dependencies that ship PRE-MINIFIED, so esbuild never transforms their source
// and their logging survives into the bundle. In practice that is
//
//   · KrispSDK (LiveKit noise suppression) — by far the loudest, and it names
//     the vendor in every line
//   · livekit-client
//   · the Stockfish WASM Emscripten glue
//
// Those write straight to the console during a normal class, which is both
// noise and an unnecessary disclosure of which services the app runs on.
//
// Deliberately NOT silenced:
//   · anything in dev — logs are how you debug, and this module no-ops there
//   · console.error and console.warn are still forwarded to a buffer so a real
//     fault is not lost; browser "Report a problem" flows and error handlers
//     can still read them. They just do not print.
//
// This replaces the console METHODS only. It does not touch window.onerror or
// unhandled rejections, so genuine uncaught exceptions still surface to the
// browser and to any monitoring, exactly as before.

// Kept small on purpose: a page that runs for an hour of live class must not
// grow a leak just because something logs in a loop.
const RECENT_LIMIT = 50;
const recent = [];

/** Most recent suppressed warnings/errors, newest last. For diagnostics. */
export function getRecentConsole() {
  return recent.slice();
}

export function silenceConsole() {
  // Vite statically replaces import.meta.env.PROD, so the whole body is
  // dropped from the dev bundle rather than being checked at runtime.
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !window.console) return;
  // Guard against double-installation (StrictMode, HMR, a second import).
  if (window.__consoleSilenced) return;
  window.__consoleSilenced = true;

  const noop = () => {};

  // Grab the real methods through a dynamic property lookup.
  //
  // `console.warn.bind(console)` would NOT survive: esbuild's `drop: ['console']`
  // rewrites any member expression on `console` — including inside this file —
  // so the captured reference compiled to `undefined` and __showLogs() threw
  // "t.warn is not a function". Reading via a variable key is not a literal
  // console member expression, so the drop leaves it alone.
  const c = window.console;
  const nativeOf = (name) =>
    typeof c[name] === 'function' ? c[name].bind(c) : noop;
  const native = { error: nativeOf('error'), warn: nativeOf('warn') };

  const remember = (level, args) => {
    try {
      recent.push({
        level,
        at: new Date().toISOString(),
        // Stringify defensively: an argument may be a circular object, a DOM
        // node, or a getter that throws. Losing a log line must never break the
        // page that produced it.
        text: args
          .map((a) => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return `${a.name}: ${a.message}`;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(' ')
          .slice(0, 500),
      });
      if (recent.length > RECENT_LIMIT) recent.shift();
    } catch {
      /* diagnostics must never throw */
    }
  };

  // All writes go through `c` (the console object held in a variable) rather
  // than the `console` identifier, for the same reason as above: a literal
  // `console.log = ...` is a member expression the build drops, which would
  // silently remove the very assignments that do the silencing.

  // Chatty methods: dropped outright.
  for (const m of ['log', 'info', 'debug', 'trace', 'dir', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count', 'assert']) {
    if (typeof c[m] === 'function') c[m] = noop;
  }

  // Faults: captured, not printed.
  c.error = (...args) => remember('error', args);
  c.warn = (...args) => remember('warn', args);

  // An escape hatch for support: ask a user to run __showLogs() in the console
  // and read back what a black tile or audio drop actually reported. Without
  // this, silencing would have removed the only evidence available from a
  // parent's machine mid-class.
  window.__showLogs = () => {
    native.warn('--- recent suppressed console output ---');
    for (const r of recent) native.warn(`[${r.at}] ${r.level}: ${r.text}`);
    return recent.length ? `${recent.length} entries` : 'nothing recorded';
  };
}
