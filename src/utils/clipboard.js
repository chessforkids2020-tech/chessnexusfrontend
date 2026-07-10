/**
 * clipboard.js
 *
 * navigator.clipboard is undefined on non-secure origins — plain http:// over a
 * LAN IP, which is exactly how the app gets tested on a phone. Without a
 * fallback, a Copy button silently does nothing there.
 *
 * Returns true on success so callers can show "Copied" vs. a manual-copy hint
 * instead of lying about it.
 */
export async function copyText(text) {
  if (text == null) return false;
  const value = String(text);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through to the legacy path */ }

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
