// PlayerName — renders a user's display name with a ☕ badge if they are an
// active coffee supporter. Works anywhere in the app: just pass the username.
// The badge is determined from the global SupporterContext (no extra API call).
//
// Usage:
//   <PlayerName displayName={player.displayName} username={player.username} />
//   <PlayerName displayName={user.displayName} username={user.username} inline />
import React from 'react';
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
  style,
  className,
}) {
  // Match on username OR displayName (or userId) so the badge shows everywhere,
  // regardless of which field a given list happens to render.
  const fromContext = useIsSupporter(username, displayName, userId);
  const showBadge = coffeeSupporter === true || (coffeeSupporter == null && fromContext);
  const name = displayName || username || '';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
      {name}
      {showBadge && <CoffeeBadge />}
    </span>
  );
}
