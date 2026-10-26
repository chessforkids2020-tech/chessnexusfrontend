// Layout math for the live classroom's DETACHED video panel (the floating box).
//
// The coach picks how many COLUMNS of tiles they want (1, 2, 3, 4) or "Auto" (0, the
// old area-maximising grid). With N columns the tiles share the box's width, so
// making the box bigger makes every picture bigger; more students simply add rows
// (the box scrolls). A one-column strip alone could never do that: a wider box only
// made one very tall column.

export const FLOAT_PAD = 8;     // padding inside the box body (each side)
export const FLOAT_GAP = 6;     // gap between tiles
const SCROLLBAR = 14;           // room kept for the vertical scrollbar so the last column never wraps
export const COLS_CHOICES = [0, 1, 2, 3, 4];   // 0 = Auto

// Width of one tile when the box is `boxW` px wide and shows `cols` columns.
export function floatTileWidth(cols, boxW) {
  const c = Math.max(1, Math.min(4, Math.floor(cols) || 1));
  const inner = boxW - FLOAT_PAD * 2 - SCROLLBAR;
  return Math.max(60, Math.floor((inner - FLOAT_GAP * (c - 1)) / c));
}

// A sensible box size to snap to when the coach picks a column count. The coach can
// still drag the box to any size afterwards.
export function boxFor(cols, winW, winH) {
  const tallH = Math.max(260, winH - 140);
  if (cols === 0) return { w: 300, h: 250 };                       // Auto: the old rectangle
  if (cols === 1) return { w: 220, h: tallH };                     // one narrow column
  const w = Math.min(winW - 60, cols * 190 + FLOAT_PAD * 2 + SCROLLBAR + FLOAT_GAP * (cols - 1));
  return { w: Math.max(240, w), h: tallH };
}

// Saved preference: the new key, else migrate the old strip/grid toggle.
export function readSavedCols(storage) {
  try {
    const c = storage.getItem('lc_video_cols');
    if (c !== null && /^[0-4]$/.test(c)) return Number(c);
    return storage.getItem('lc_video_layout') === 'grid' ? 0 : 1;
  } catch { return 1; }
}
