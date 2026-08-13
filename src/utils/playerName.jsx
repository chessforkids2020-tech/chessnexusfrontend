/**
 * playerName.jsx
 *
 * Single source of truth for showing a player's name WITH their chess title.
 * Mirrors backend/helpers/playerName.js.
 *
 * Titles live on user.chessTitle, never inside username/displayName. Any API
 * response that carries a name should also carry chessTitle; render it through
 * <PlayerName> (or formatPlayerName for plain strings) so a CM->GM upgrade
 * shows up everywhere at once, including old leaderboards and chat.
 *
 * Bots never carry a title.
 */
const TITLES = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM'];
const TITLE_SET = new Set(TITLES);

export function normalizeTitle(title) {
  if (typeof title !== 'string') return null;
  const t = title.trim().toUpperCase();
  return TITLE_SET.has(t) ? t : null;
}

/* ── Nexus titles ──────────────────────────────────────────────────────────
 * ChessNexus-only titles granted by supporting the site. Mirrors
 * backend/helpers/playerName.js.
 *
 *   NS  Nexus Supporter   (American Espresso tier)
 *   NX  Nexus Expert      (Cafe Latte tier)
 *
 * Rendered AFTER any FIDE title and before the name: "GM NS Hikaru". Unlike
 * chessTitle these are not stored on the User — they are derived per request
 * from the active supporter record, so they lapse on their own.
 */
const NEXUS_TITLES = ['NS', 'NX', 'NC'];
const NEXUS_SET = new Set(NEXUS_TITLES);

export function normalizeNexusTitle(title) {
  if (typeof title !== 'string') return null;
  const t = title.trim().toUpperCase();
  return NEXUS_SET.has(t) ? t : null;
}

/** The Nexus title to show for a user, or null. Bots are always untitled. */
export function nexusTitleOf(user) {
  if (!user || user.isBot) return null;
  return normalizeNexusTitle(user.nexusTitle);
}

/** The title to show for a user, or null. Bots are always untitled. */
export function titleOf(user) {
  if (!user || user.isBot) return null;
  return normalizeTitle(user.chessTitle);
}

export function baseNameOf(user) {
  if (!user) return '';
  return user.displayName || user.username || '';
}

/** Plain string, e.g. "GM Hikaru". Use where JSX isn't possible. */
export function formatPlayerName(user) {
  const name = baseNameOf(user);
  const title = titleOf(user);
  return title ? `${title} ${name}` : name;
}

/**
 * <PlayerName user={u} />  ->  <span><span class="chess-title">GM</span> Hikaru</span>
 *
 * The title renders as its own span so it can be styled independently (both
 * Lichess and Chess.com show it bold/coloured rather than run into the name).
 */
export function PlayerName({ user, className, titleClassName, style }) {
  const title = titleOf(user);
  const name = baseNameOf(user);
  return (
    <span className={className} style={style}>
      {title && (
        <>
          <span
            className={titleClassName || 'chess-title'}
            style={{ fontWeight: 700, color: '#b45309' }}
            title={`FIDE title: ${title}`}
          >
            {title}
          </span>
          {/* A real space, not just margin: survives restyling and copy-paste. */}
          {' '}
        </>
      )}
      {name}
    </span>
  );
}

export { TITLES };
