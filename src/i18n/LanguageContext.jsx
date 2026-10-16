// i18n/LanguageContext.jsx
//
// App language (English / Spanish), chosen in Settings → Language.
//
// ── HOW TRANSLATION WORKS ────────────────────────────────────────────────────
// The ENGLISH TEXT IS THE KEY:
//     import { t } from '../i18n/LanguageContext';
//     <h1>{t('My Moments')}</h1>
//     <p>{t('{n} games analysed', { n: 12 })}</p>
// The Spanish dictionary (i18n/es/*.js) maps that exact English string to its
// Spanish version. Anything not in the dictionary is shown in English, so a
// missing translation never blanks out the UI — it just stays English.
//
// `t` is a PLAIN FUNCTION, not a hook, so it also works in lists defined at
// module level (`const LEVELS = [{ label: t('Easy') }]`). That only works
// because the language is fixed for the life of the page: it is read from
// storage when this module loads (before any page module evaluates), and
// changing it reloads the page. A language switch is a rare, deliberate act in
// Settings, so one reload is a fair price for every string being correct.
//
// Placeholders are {name} in both languages; values go in the 2nd argument.
// Keep the English string IDENTICAL to the dictionary key (spaces, punctuation
// and emoji included) or the lookup misses.
//
// Admin pages are deliberately not translated (they never call t()).
//
// Stored per USER in localStorage (`lang_<userId>`), like the other per-account
// display settings: coaches log into many student accounts on one browser, and
// one student's choice must not switch everyone else's. Before React knows the
// user, `lastUserId` (written by App.jsx for the theme script) says whose
// setting to read.
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import ES from './es';

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
];
const DICTS = { es: ES };
const VALID = new Set(LANGUAGES.map(l => l.code));

const storageKey = (userId) => (userId ? `lang_${userId}` : 'lang_guest');

function readLang(userId) {
  try {
    const v = localStorage.getItem(storageKey(userId));
    if (VALID.has(v)) return v;
    // A signed-in user with no choice yet inherits what was picked while
    // signed out on this device (e.g. on the login page).
    const guest = localStorage.getItem('lang_guest');
    if (VALID.has(guest)) return guest;
  } catch { /* private mode / prerender */ }
  return 'en';
}

function initialLang() {
  try {
    const hasToken = !!localStorage.getItem('authToken');
    const last = hasToken ? localStorage.getItem('lastUserId') : null;
    return readLang(last);
  } catch { return 'en'; }
}

// Fixed for the life of the page (see header).
const LANG = typeof window === 'undefined' ? 'en' : initialLang();
try {
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    html.lang = LANG;
    // The user CHOSE this language in Settings — stop the browser's own page
    // translation from undoing it. Chrome saw lang="es" on a browser set to
    // English, auto-translated the whole page back to English a second after
    // load and rewrote lang="en", while Settings still showed Spanish selected.
    // English pages stay translatable (a Hindi speaker can still use Chrome
    // Translate on them).
    if (LANG !== 'en') {
      html.setAttribute('translate', 'no');
      html.classList.add('notranslate');
      if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
        const m = document.createElement('meta');
        m.name = 'google'; m.content = 'notranslate';
        document.head.appendChild(m);
      }
    }
  }
} catch { /* prerender */ }

// Fill {name} placeholders.
function fill(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

/** Translate an English string into the page language. */
export function t(text, vars) {
  if (typeof text !== 'string') return text;
  const dict = DICTS[LANG];
  return fill((dict && dict[text]) || text, vars);
}

export function getLanguage() { return LANG; }

/** Save the choice for this user and reload so every string switches. */
export function setLanguage(code, userId) {
  if (!VALID.has(code)) return;
  try {
    localStorage.setItem(storageKey(userId), code);
    if (!userId) localStorage.setItem('lang_guest', code);
  } catch { /* ignore */ }
  if (code !== LANG) window.location.reload();
}

const LanguageContext = createContext({ lang: LANG, setLanguage: (c) => setLanguage(c, null), t });

export function LanguageProvider({ children, userId }) {
  // Another account signed in on this browser with a different language:
  // reload once so the page matches THEIR choice.
  //
  // Only for a signed-in user: while auth is still loading userId is empty,
  // and reacting to that would flip a signed-in Spanish user to the guest
  // setting. lastUserId is written HERE before reloading (App.jsx writes it
  // too, but a parent's effect runs after this child's) so the reloaded page
  // reads this user's setting — otherwise it would reload forever. The
  // sessionStorage stamp is a last-resort guard against any loop.
  useEffect(() => {
    if (!userId) return;
    const want = readLang(userId);
    if (want === LANG) return;
    try {
      localStorage.setItem('lastUserId', String(userId));
      const last = Number(sessionStorage.getItem('langReloadAt') || 0);
      if (Date.now() - last < 5000) return;
      sessionStorage.setItem('langReloadAt', String(Date.now()));
    } catch { return; }
    window.location.reload();
  }, [userId]);

  const value = useMemo(() => ({
    lang: LANG,
    setLanguage: (code) => setLanguage(code, userId),
    t,
  }), [userId]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Kept for components that prefer a hook; it is the same `t`. */
export function useT() {
  return t;
}
