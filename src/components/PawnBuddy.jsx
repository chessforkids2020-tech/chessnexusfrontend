import React from 'react';
import './PawnBuddy.css';

// A 2D cartoon pawn (thick outline, flat shading). Hops in, waves, then idles
// (bounces, blinks, glances). Pure SVG + CSS; the animation lives in
// PawnBuddy.css. Inside a [data-reveal] block it waits until that block
// scrolls into view.
export default function PawnBuddy({ className = '' }) {
  return (
    <span className={`pb ${className}`} aria-hidden="true">
      <span className="pb-mover">
        <svg className="pb-svg" viewBox="0 0 140 180">
          <defs>
            <clipPath id="pb-clip-head"><circle cx="70" cy="40" r="30" /></clipPath>
            <clipPath id="pb-clip-body"><path d="M52 84 C52 110 40 128 34 144 L106 144 C100 128 88 110 88 84 Z" /></clipPath>
            <clipPath id="pb-clip-base"><rect x="24" y="138" width="92" height="28" rx="13" /></clipPath>
          </defs>
          <ellipse className="pb-shadow" cx="70" cy="171" rx="40" ry="6" />

          <g className="pb-hop">
            <g className="pb-idle">
              {/* left arm, hand on hip */}
              <path className="pb-arm-out" d="M55 100 Q38 104 36 118" />
              <path className="pb-arm-in" d="M55 100 Q38 104 36 118" />
              <circle className="pb-hand" cx="36" cy="119" r="7" />

              {/* base */}
              <rect className="pb-shade" x="24" y="138" width="92" height="28" rx="13" />
              <g clipPath="url(#pb-clip-base)">
                <rect className="pb-gold" x="14" y="128" width="92" height="30" rx="13" />
              </g>
              <rect className="pb-outline" x="24" y="138" width="92" height="28" rx="13" />

              {/* body */}
              <path className="pb-shade" d="M52 84 C52 110 40 128 34 144 L106 144 C100 128 88 110 88 84 Z" />
              <g clipPath="url(#pb-clip-body)">
                <path className="pb-light" d="M42 84 C42 110 30 128 24 144 L92 144 C86 128 78 110 78 84 Z" />
              </g>
              <path className="pb-outline" d="M52 84 C52 110 40 128 34 144 L106 144 C100 128 88 110 88 84 Z" />

              {/* collar */}
              <rect className="pb-gold-shade" x="34" y="72" width="72" height="16" rx="8" />
              <rect className="pb-gold" x="34" y="72" width="60" height="11" rx="6" />
              <rect className="pb-outline" x="34" y="72" width="72" height="16" rx="8" />

              {/* head */}
              <circle className="pb-shade" cx="70" cy="40" r="30" />
              <g clipPath="url(#pb-clip-head)">
                <circle className="pb-light" cx="63" cy="33" r="31" />
              </g>
              <circle className="pb-outline" cx="70" cy="40" r="30" />
              <ellipse cx="55" cy="22" rx="8" ry="4.5" fill="#fff" opacity=".85" transform="rotate(-32 55 22)" />

              {/* face */}
              <path className="pb-brow" d="M52 24 Q58 20 64 24 M76 24 Q82 20 88 24" />
              <g className="pb-eyes">
                <ellipse className="pb-eye" cx="59" cy="38" rx="7.5" ry="9.5" />
                <ellipse className="pb-eye" cx="81" cy="38" rx="7.5" ry="9.5" />
                <g className="pb-pupils">
                  <ellipse cx="61.5" cy="40" rx="4.6" ry="6" fill="#2b1a10" />
                  <ellipse cx="83.5" cy="40" rx="4.6" ry="6" fill="#2b1a10" />
                  <circle cx="63.4" cy="37.2" r="1.9" fill="#fff" />
                  <circle cx="85.4" cy="37.2" r="1.9" fill="#fff" />
                </g>
              </g>
              <ellipse cx="50" cy="51" rx="5" ry="3.2" fill="#ff7f7f" opacity=".6" />
              <ellipse cx="90" cy="51" rx="5" ry="3.2" fill="#ff7f7f" opacity=".6" />
              <path className="pb-mouth" d="M62 53 Q70 64 78 53 Z" />
              <path d="M66 58.6 Q70 56.5 74 58.6 Q72 61.4 70 61.6 Q68 61.4 66 58.6 Z" fill="#ff8a8a" />

              {/* right arm, waving at the speech bubble */}
              <g className="pb-wave">
                <path className="pb-arm-out" d="M85 100 Q102 98 112 80" />
                <path className="pb-arm-in" d="M85 100 Q102 98 112 80" />
                <circle className="pb-hand" cx="113" cy="78" r="7.5" />
              </g>
            </g>
          </g>
        </svg>
      </span>
    </span>
  );
}
