// components/ThemeScope.jsx
//
// Renders its children in SOMEONE ELSE'S theme.
//
// Used by the public profile: a player's profile is painted in the theme that
// player chose, whoever is looking at it. Cards, buttons, badges and stats all
// follow, because they read --color-* tokens rather than fixed colours.
//
// Scoped to a container rather than <html> on purpose. The viewer's own sidebar
// and navigation keep THEIR theme, so visiting a gold profile does not
// repaint the visitor's whole app gold and leave them unsure whether their own
// settings changed. Only the profile content adopts the owner's colours.
//
// HOW IT WORKS — the non-obvious part:
//
// Custom properties inherit, but they RESOLVE where they are declared. Setting
// data-theme on a div sets that div's raw keys (--bg, --accent-rgb) and nothing
// more; --color-accent was already computed against :root's palette and simply
// inherits down as a finished colour. So a nested data-theme alone changes
// NOTHING visible.
//
// The fix lives in styles/tokens/themes.css, where the derived-token block is
// declared for `:root, .theme-scope`. Both halves are required: `data-theme`
// selects the palette, `.theme-scope` re-derives every --color-* from it. This
// component just guarantees the two are always applied together.
import React from 'react';
import { UI_THEMES, DEFAULT_UI_THEME_ID } from '../contexts/UiThemeContext';

const VALID_IDS = new Set(UI_THEMES.map(t => t.id));

export default function ThemeScope({ themeId, children, style, className = '', ...rest }) {
  // An unknown id must fall through to the VIEWER's theme rather than forcing
  // the default. A profile whose owner never picked a theme, or whose stored id
  // is from an older build, should look normal — not snap to obsidian for
  // someone whose app is otherwise gold.
  const valid = themeId && VALID_IDS.has(themeId);
  if (!valid) return <>{children}</>;

  return (
    <div
      className={`theme-scope ${className}`.trim()}
      data-theme={themeId}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

// Re-exported so callers can label the theme in UI ("Gold Sovereign theme")
// without importing the context just to look up a name.
export function themeName(themeId) {
  return UI_THEMES.find(t => t.id === themeId)?.name || '';
}

export { DEFAULT_UI_THEME_ID };
