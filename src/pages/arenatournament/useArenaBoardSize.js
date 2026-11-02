// Board size for the live arena page.
//
// The board lives in the MIDDLE column of a three-column grid (chat | board | clock
// and leaderboard). Two things used to go wrong:
//
//  1. It was too small on a desktop. It was capped at 74% of the window height to
//     leave room for the two player rows, which left the board well short of what
//     the column and the height could take.
//  2. Dragging the board's corner handle to enlarge it was not limited to the
//     column, so a bigger board slid UNDER the right-hand card.
//
// So: the default is bigger (82% of the height), the column's measured width is the
// hard ceiling for dragging, and a size the player has dragged to is KEPT (it is
// only ever trimmed down when the column gets narrower), instead of being reset
// every time the layout re-measures.
import { useCallback, useEffect, useRef, useState } from 'react';

const MOBILE_BP = 768;
const COLUMN_PAD = 24;      // keep clear of the column's own padding and border
const MIN_BOARD = 280;
const MAX_BOARD = 1200;     // was 900, which stopped the board short on 1440p / 4K monitors
const HEIGHT_SHARE = 0.84;  // share of the window height the DEFAULT board may take
// Desktop (>= 1025px) lichess layout — must match ArenaTournamentLive.css.
export const DESKTOP_BP = 1025;
const DESK_LEFT_MIN = 240;  // leaderboard column minimum
const DESK_RIGHT_MIN = 300; // game panel minimum
const DESK_GAP = 16;        // grid column gap
const BOARD_FRAME = 2;      // the 1px border of the board wrapper, both sides
const PAGE_PAD_BOTTOM = 20; // .at-live-page padding

// `ready`: pass false while the page shows its loading screen. The board column
// does not exist then, so the first measure fell back to 36% of the window and,
// with no column to observe, never re-measured — the board stayed small with
// wide empty bands beside it. The effect re-runs once the column is mounted.
export default function useArenaBoardSize(columnRef, ready = true) {
  const [boardWidth, setBoardWidth] = useState(560);
  const [maxBoard, setMaxBoard] = useState(MAX_BOARD);
  const [isMobileBoard, setIsMobileBoard] = useState(typeof window !== 'undefined' && window.innerWidth <= MOBILE_BP);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BP);
  const userSized = useRef(false);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobileBoard(width <= MOBILE_BP);
      setIsDesktop(width >= DESKTOP_BP);

      if (width <= MOBILE_BP) {
        // Phone: fill the width, but never taller than the screen allows.
        userSized.current = false;
        const byWidth = width - 24;
        const byHeight = Math.floor(height * 0.62);
        setBoardWidth(Math.max(260, Math.min(byWidth, byHeight)));
        setMaxBoard(MAX_BOARD);
        return;
      }

      const el = columnRef.current;

      if (width >= DESKTOP_BP && el && el.parentElement) {
        // DESKTOP (lichess layout): the board column is exactly the board, so it
        // can't be measured to size the board. Size from the GRID instead: its
        // width minus the two side panels' minimums and the gaps, and the
        // height from the column's top down to the page's bottom padding.
        const gridW = el.parentElement.clientWidth;
        const byWidth = gridW - DESK_LEFT_MIN - DESK_RIGHT_MIN - DESK_GAP * 2 - BOARD_FRAME;
        const top = el.getBoundingClientRect().top;
        const byHeight = Math.floor(height - top - PAGE_PAD_BOTTOM - BOARD_FRAME);
        const ceiling = Math.max(MIN_BOARD, Math.min(MAX_BOARD, byWidth, byHeight));
        setMaxBoard(ceiling);
        if (userSized.current) { setBoardWidth(w => Math.min(w, ceiling)); return; }
        setBoardWidth(ceiling);
        return;
      }

      const colWidth = el ? el.clientWidth - COLUMN_PAD : null;
      const available = colWidth && colWidth > 0 ? colWidth : Math.floor(width * 0.36);
      const ceiling = Math.max(MIN_BOARD, Math.min(MAX_BOARD, available));   // never wider than the column
      setMaxBoard(ceiling);

      if (userSized.current) {
        // The player chose a size: keep it, only trimming if the column shrank.
        setBoardWidth(w => Math.min(w, ceiling));
        return;
      }
      const byHeight = Math.floor(height * HEIGHT_SHARE);
      setBoardWidth(Math.max(MIN_BOARD, Math.min(ceiling, byHeight)));
    };

    update();
    window.addEventListener('resize', update);
    // The column can change width without the window changing (a panel growing, a
    // scrollbar appearing), which a resize listener alone misses.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && columnRef.current) {
      ro = new ResizeObserver(update);
      ro.observe(columnRef.current);
    }
    return () => {
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, [columnRef, ready]);

  // Called by the board's drag handle. Remember that the player chose this size.
  const onResize = useCallback((w) => {
    userSized.current = true;
    setBoardWidth(w);
  }, []);

  return { boardWidth, maxBoard, isMobileBoard, isDesktop, onResize, minBoard: MIN_BOARD };
}
