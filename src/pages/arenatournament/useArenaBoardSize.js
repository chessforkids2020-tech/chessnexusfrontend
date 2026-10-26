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
const MAX_BOARD = 900;
const HEIGHT_SHARE = 0.82;  // share of the window height the DEFAULT board may take

export default function useArenaBoardSize(columnRef) {
  const [boardWidth, setBoardWidth] = useState(560);
  const [maxBoard, setMaxBoard] = useState(MAX_BOARD);
  const [isMobileBoard, setIsMobileBoard] = useState(typeof window !== 'undefined' && window.innerWidth <= MOBILE_BP);
  const userSized = useRef(false);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobileBoard(width <= MOBILE_BP);

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
  }, [columnRef]);

  // Called by the board's drag handle. Remember that the player chose this size.
  const onResize = useCallback((w) => {
    userSized.current = true;
    setBoardWidth(w);
  }, []);

  return { boardWidth, maxBoard, isMobileBoard, onResize, minBoard: MIN_BOARD };
}
