/**
 * usernameRules.js
 *
 * Client-side mirror of backend/helpers/usernameRules.js. Keep the two in sync:
 * the backend is the real gate, this exists so the user sees the error before
 * submitting.
 *
 * Letters, numbers, underscores and hyphens. A separator may not start or end
 * the name, and may not repeat back-to-back.
 */
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 20;

export const USERNAME_REGEX = /^[a-zA-Z0-9](?:[_-]?[a-zA-Z0-9]+)*$/;

export const USERNAME_CHARS_MESSAGE =
  'Username can only contain letters, numbers, underscores and hyphens (not at the start or end)';
export const USERNAME_LENGTH_MESSAGE = `Username must be ${MIN_LENGTH}-${MAX_LENGTH} characters`;

export const USERNAME_HINT = `${MIN_LENGTH}-${MAX_LENGTH} characters — letters, numbers, underscores and hyphens`;

/** Returns null when valid, else the error message. */
export function validateUsername(username) {
  if (typeof username !== 'string' || !username) return USERNAME_LENGTH_MESSAGE;
  if (username.length < MIN_LENGTH || username.length > MAX_LENGTH) return USERNAME_LENGTH_MESSAGE;
  if (!USERNAME_REGEX.test(username)) return USERNAME_CHARS_MESSAGE;
  if (countLetters(username) < MIN_LETTERS) return `Username ${LETTER_COUNT_MESSAGE}`;
  return null;
}

// ── Two-letter rule ────────────────────────────────────────────────────────
// A name must contain at least two letters: "123456789" is not a name a coach
// can call out in class, and an all-digit handle is the classic shape of a
// throwaway account. Enforced at CREATION only — existing all-numeric accounts
// are deliberately left alone.
export const MIN_LETTERS = 2;
export const LETTER_COUNT_MESSAGE =
  `must contain at least ${MIN_LETTERS} letters — it cannot be only numbers`;

export function countLetters(value) {
  const m = String(value || '').match(/\p{L}/gu);
  return m ? m.length : 0;
}

export const DISPLAY_MIN = 2;
export const DISPLAY_MAX = 30;

/** Returns null when valid, else the error message. */
export function validateDisplayName(displayName) {
  const v = String(displayName || '').trim();
  if (!v) return 'Display name is required';
  if (v.length < DISPLAY_MIN || v.length > DISPLAY_MAX) {
    return `Display name must be ${DISPLAY_MIN}-${DISPLAY_MAX} characters`;
  }
  if (countLetters(v) < MIN_LETTERS) return `Display name ${LETTER_COUNT_MESSAGE}`;
  return null;
}
