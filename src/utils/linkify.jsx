// utils/linkify.jsx
// Turn URLs inside a plain chat/club message string into clickable links WITHOUT
// using dangerouslySetInnerHTML (so message text can never inject markup). Splits
// the text on URL matches and returns an array of strings + <a> elements.
//
// Usage:  <div className="message-content">{linkify(msg.content)}</div>
import React from 'react';

// Matches http(s):// URLs and bare www. URLs. Kept deliberately simple and safe:
// we only ever build an <a href> from a matched http/https/www token, never from
// arbitrary text. A trailing sentence punctuation char is trimmed off the link.
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

export function linkify(text) {
  if (text == null) return text;
  const str = String(text);
  if (!str) return str;

  const out = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(str)) !== null) {
    const raw = match[0];
    const start = match.index;

    // Push the plain text before this URL.
    if (start > lastIndex) out.push(str.slice(lastIndex, start));

    // Trim trailing punctuation that's almost certainly not part of the URL,
    // and keep it as plain text after the link.
    let url = raw;
    let trailing = '';
    const trailMatch = url.match(/[),.!?;:'"]+$/);
    if (trailMatch) {
      trailing = trailMatch[0];
      url = url.slice(0, url.length - trailing.length);
    }

    const href = url.startsWith('www.') ? `https://${url}` : url;
    out.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        style={{ color: '#38bdf8', textDecoration: 'underline', wordBreak: 'break-all' }}
      >
        {url}
      </a>
    );
    if (trailing) out.push(trailing);

    lastIndex = start + raw.length;
  }

  // Remaining tail after the last URL.
  if (lastIndex < str.length) out.push(str.slice(lastIndex));

  return out.length ? out : str;
}

export default linkify;
