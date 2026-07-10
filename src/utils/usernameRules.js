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
  return null;
}
