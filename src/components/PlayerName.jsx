// PlayerName — a player's name with their titles and supporter badge.
//
// Renders, in order:   [FIDE title] [Nexus title] Name [♞ or 👑]
//                          GM           NS        Hikaru
//
// WHY TITLES RATHER THAN A BADGE
// Supporters used to get a ☕ next to their name. A coffee cup is a generic
// creator-economy symbol that says nothing in chess. A TITLE before the name is
// the currency of identity here — every player reads "GM Hikaru" instantly — so
// supporting ChessNexus now grants one:
//
//   Black Coffee       ->  ♞ after the name, no letters
//   American Espresso  ->  NS   Nexus Supporter
//   Cafe Latte         ->  NX   Nexus Expert
//   Founding (first 100) -> 👑 permanent, survives expiry
//
// A FIDE title ALWAYS comes first and is never replaced: "GM NS Hikaru". One is
// earned and admin-verified, the other is bought, and they are styled
// differently so nobody can confuse the two.
//
// Titles come from the global SupporterContext (no extra API call), except when
// a caller passes `nexusTitle` explicitly — some payloads already carry it.
//
// Usage:
//   <PlayerName displayName={p.displayName} username={p.username} />
//   <PlayerName user={u} />                       // shorthand for a user object
import React from 'react';
import { Link } from 'react-router-dom';
import KnightBadge from './KnightBadge';
import FoundingBadge from './FoundingBadge';
import {
  useIsSupporter, useIsFoundingSupporter, useNexusTitle,
} from '../context/SupporterContext';
import { normalizeTitle, normalizeNexusTitle } from '../utils/playerName';

export default function PlayerName({
  // Either pass the fields individually…
  displayName,
  username,
  // optional: a user id — most reliable badge match when the list has it
  userId,
  // …or a whole user object, which also carries the FIDE title.
  user,
  // optional: force the badge on/off without the context (e.g. when the
  // backend already included coffeeSupporter in the payload)
  coffeeSupporter,
  // optional: the FIDE title (GM/IM/FM…). Read from `user.chessTitle` when a
  // user object is given.
  chessTitle,
  // optional: 'NS' | 'NX'. Overrides the context lookup — pass it when the
  // payload already resolved it server-side.
  nexusTitle,
  // opt-in: when true, the name links to the user's PUBLIC profile page
  // (/player/:displayName), like clicking a username on Lichess. Off by default
  // so existing usages (inside buttons, etc.) are unchanged.
  linkToProfile = false,
  style,
  className,
}) {
  const name = displayName || user?.displayName || username || user?.username || '';
  const uname = username || user?.username;
  const dname = displayName || user?.displayName;
  const uid = userId || user?.id || user?._id;

  // Match on username OR displayName (or userId) so the badge shows everywhere,
  // regardless of which field a given list happens to render.
  const fromContext = useIsSupporter(uname, dname, uid);
  const isFounder = useIsFoundingSupporter(uname, dname, uid);
  const titleFromContext = useNexusTitle(uname, dname, uid);

  const showBadge = coffeeSupporter === true || (coffeeSupporter == null && fromContext);

  // Bots never carry titles, matching backend/helpers/playerName.js.
  const isBot = user?.isBot;
  const fide = isBot ? null : normalizeTitle(chessTitle ?? user?.chessTitle);
  const nexus = isBot
    ? null
    : normalizeNexusTitle(nexusTitle ?? user?.nexusTitle ?? titleFromContext);

  const inner = (
    <>
      {/* Earned title first, in its own colour. A real trailing space, not a
          margin: it survives restyling and copy-paste. */}
      {fide && (
        <>
          <span className="chess-title" title={`FIDE title: ${fide}`}>{fide}</span>{' '}
        </>
      )}
      {/* Bought title second, themed rather than fixed gold so the two are never
          mistaken for each other. */}
      {nexus && (
        <>
          <span
            className="nexus-title"
            title={nexus === 'NX'
              ? 'Nexus Expert — supports ChessNexus'
              : 'Nexus Supporter — supports ChessNexus'}
          >
            {nexus}
          </span>{' '}
        </>
      )}
      {name}
      {/* A Founding Supporter's permanent 👑 replaces the ♞ — one badge, not
          two. Founders show even if their paid window has lapsed. The ♞ is the
          entry tier's mark; NS/NX supporters already have letters, so they do
          not also get an icon. */}
      {isFounder
        ? <FoundingBadge />
        : (showBadge && !nexus && <KnightBadge />)}
    </>
  );

  // Public profile is keyed by displayName; fall back to username.
  const profileKey = dname || uname;
  if (linkToProfile && profileKey) {
    return (
      <Link
        to={`/player/${encodeURIComponent(profileKey)}`}
        onClick={(e) => e.stopPropagation()}   // don't trigger a parent row's onClick
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', cursor: 'pointer', ...style }}
        title={`View ${name}'s profile`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
      {inner}
    </span>
  );
}
