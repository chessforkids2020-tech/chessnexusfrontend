// utils/istSchedule.js
// Helpers for coach class slots. Times are STORED IN UTC as a UTC day-of-week
// (0=Sun..6=Sat) + "HH:MM" UTC. Each viewer (coach or student) enters and sees
// times in THEIR OWN browser-local timezone; these helpers convert both ways.
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n) => String(n).padStart(2, '0');

// ── Local (browser) → UTC ────────────────────────────────────────────────
// A local weekday (0-6) + local "HH:MM" the coach picked → the equivalent UTC
// weekday + "HH:MM" for storage. Anchored to an actual upcoming date so the
// offset (and any date-line rollover) is applied correctly.
export function localToUtc(localDow, localTime) {
  if (localTime == null || !String(localTime).includes(':')) return null;
  const [hh, mm] = localTime.split(':').map(Number);
  const now = new Date();
  // Find a date within the next 7 days whose LOCAL weekday === localDow.
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm, 0, 0);
    if (d.getDay() === localDow) {
      return { day: d.getUTCDay(), time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
    }
  }
  return null;
}

// ── UTC → Local (browser) ────────────────────────────────────────────────
// Absolute Date for the next occurrence (from `fromMs`) of a UTC weekday+time.
export function nextOccurrence(utcDow, timeUTC, fromMs = Date.now()) {
  if (timeUTC == null || !String(timeUTC).includes(':')) return null;
  const [hh, mm] = timeUTC.split(':').map(Number);
  for (let i = 0; i <= 7; i++) {
    const probe = fromMs + i * 86400000;
    const p = new Date(probe);
    // Build the UTC timestamp for that UTC calendar day at hh:mm UTC.
    const occ = Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), hh, mm);
    if (new Date(occ).getUTCDay() === utcDow && occ >= fromMs - 60000) return new Date(occ);
  }
  return null;
}

// Viewer-local weekday index (0-6) for a stored UTC weekday+time.
export function localDow(utcDow, timeUTC) {
  const occ = nextOccurrence(utcDow, timeUTC);
  return occ ? occ.getDay() : utcDow;
}

// Viewer-local "HH:MM" (24h, for <input type=time>) for a stored UTC time.
export function localTimeValue(utcDow, timeUTC) {
  const occ = nextOccurrence(utcDow, timeUTC);
  if (!occ) return timeUTC || '';
  return `${pad(occ.getHours())}:${pad(occ.getMinutes())}`;
}

// Viewer-local "h:mm AM/PM" display for a stored UTC weekday+time.
export function localTimeLabel(utcDow, timeUTC) {
  const occ = nextOccurrence(utcDow, timeUTC);
  if (!occ) return timeUTC || '';
  return occ.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Viewer-local weekday short-name for a stored UTC weekday+time.
export function localDayLabel(utcDow, timeUTC) {
  const occ = nextOccurrence(utcDow, timeUTC);
  return occ ? DAY_NAMES[occ.getDay()] : (DAY_NAMES[utcDow] || '');
}

// Local occurrences of one class on a specific LOCAL calendar date.
// `date` is a Date at local midnight of the day in question. Returns an array of
// { at: Date, time: "h:mm AM/PM" } — usually 0 or 1 entries. Computed by scanning
// each stored UTC weekday's occurrence within that local day, so DST and the
// date-line are handled exactly.
export function classOccurrencesOnDate(cls, date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 86400000;
  const out = [];
  for (const utcDow of cls.days || []) {
    // The occurrence of this weekday nearest this date (start scan a day early).
    const occ = nextOccurrence(utcDow, cls.timeUTC, dayStart - 86400000);
    if (occ && occ.getTime() >= dayStart && occ.getTime() < dayEnd) {
      out.push({ at: occ, time: occ.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// All classes (with their local time) occurring on a given LOCAL calendar date.
// Returns [{ cls, time, at }]. Multiple coaches/batches can land on one day.
export function classesOnLocalDate(classes, date) {
  const items = [];
  for (const c of classes || []) {
    for (const occ of classOccurrencesOnDate(c, date)) {
      items.push({ cls: c, time: occ.time, at: occ.at });
    }
  }
  return items.sort((a, b) => a.at - b.at);
}

// The soonest upcoming class across a list of { days:[utcDow], timeUTC, ... }.
// Returns { item, when } or null.
export function soonestClass(classes, fromMs = Date.now()) {
  let best = null;
  for (const c of classes || []) {
    for (const dow of c.days || []) {
      const occ = nextOccurrence(dow, c.timeUTC, fromMs);
      if (occ && (!best || occ < best.when)) best = { item: c, when: occ };
    }
  }
  return best;
}
