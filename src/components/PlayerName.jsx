// PlayerName — renders a user's display name with a ☕ badge if they are an
// active coffee supporter. Works anywhere in the app: just pass the username.
// The badge is determined from the global SupporterContext (no extra API call).
//
// Usage:
//   <PlayerName displayName={player.displayName} username={player.username} />
//   <PlayerName displayName={user.displayName} username={user.username} inline />
import React from 'react';
import { Link } from 'react-router-dom';
import CoffeeBadge from './CoffeeBadge';
import { useIsSupporter } from '../context/SupporterContext';

export default function PlayerName({
  displayName,
  username,
  // optional: a user id — most reliable badge match when the list has it
  userId,
  // optional: force the badge on/off without the context (e.g. when the
  // backend already included coffeeSupporter in the payload)
  coffeeSupporter,
  // opt-in: when true, the name links to the user's PUBLIC profile page
  // (/player/:displayName), like clicking a username on Lichess. Off by default
  // so existing usages (inside buttons, etc.) are unchanged.
  linkToProfile = false,
  style,
  className,
}) {
  // Match on username OR displayName (or userId) so the badge shows everywhere,
  // regardless of which field a given list happens to render.
  const fromContext = useIsSupporter(username, displayName, userId);
  const showBadge = coffeeSupporter === true || (coffeeSupporter == null && fromContext);
  const name = displayName || username || '';

  const inner = (
    <>
      {name}
      {showBadge && <CoffeeBadge />}
    </>
  );

  // Public profile is keyed by displayName; fall back to username.
  const profileKey = displayName || username;
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
