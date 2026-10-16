// Coach-picked side-whiteboard sizes (px). Deliberately modest — the panel sits
// BESIDE the teaching board and must not crowd it. S is 260, not smaller: below
// that the whiteboard toolbar can't fit on one row and clips Undo / Clear.
export const WB_PANEL_SIZES = { S: 260, M: 320, L: 380 };

// The panel's on-screen width for a size, capped so it never overflows a phone.
// The classroom page uses it to give the board back the room the panel takes.
export const wbPanelWidth = (size, vpW) =>
  Math.max(200, Math.min(WB_PANEL_SIZES[size] || WB_PANEL_SIZES.M, vpW - 32));
