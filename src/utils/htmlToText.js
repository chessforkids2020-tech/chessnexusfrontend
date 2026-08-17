// utils/htmlToText.js
//
// Turns coach-authored rich text into plain text for the places that show a
// PREVIEW rather than the formatted body.
//
// Coach bios and achievements are stored as sanitised HTML (see
// backend/helpers/coachRichText.js) so the coach's headings, bold and lists
// survive on their public page, where CoachProse renders them properly. But
// several other surfaces show a short extract as plain text — the directory
// card, the admin list, the SEO meta description — and those were written
// before rich text existed. They printed the markup verbatim, so a card read
// "<h3>I have been playing <strong>competitive </strong>chess…".
//
// This is NOT a sanitiser. It is only for producing readable text; anything
// that renders HTML must still go through the server-side sanitiser.

// Entities that actually turn up in this content. A full entity table is not
// worth it here: the sanitiser's allowlist is small, and an unknown entity is
// left as-is rather than mangled.
const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/**
 * Strip HTML to readable plain text.
 * Safe on plain-text input, so it can be applied to legacy bios written before
 * the rich-text editor without changing them.
 */
export function htmlToText(html) {
  if (!html) return '';
  let s = String(html);

  // Drop script/style CONTENT as well as their tags. Neither survives the
  // server sanitiser today, but stripping tags alone would turn a stray
  // <script>alert(1)</script> into the visible words "alert(1)".
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  // Block-level ends become spaces, so "…life.</p><p>As a coach…" does not
  // collapse into "life.As a coach". List items get a separator for the same
  // reason.
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, ' ');

  // Everything else: drop the tag, keep the text inside it.
  s = s.replace(/<[^>]+>/g, '');

  for (const [entity, char] of Object.entries(ENTITIES)) {
    s = s.split(entity).join(char);
  }
  // Numeric entities (&#8217; and friends) — common from pasted text.
  s = s.replace(/&#(\d+);/g, (_, n) => {
    const code = Number(n);
    return Number.isFinite(code) ? String.fromCodePoint(code) : '';
  });

  return s.replace(/\s+/g, ' ').trim();
}

export default htmlToText;
