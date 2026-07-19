import { useState, useEffect } from 'react';

/**
 * useResponsiveBoardSize
 *
 * Attaches a ResizeObserver to whatever container ref you pass in and returns
 * a board width (in px) that fills that container — capped at `maxSize`.
 *
 * The board is SQUARE, so on phones/tablets filling the full width can make it
 * taller than the screen (you'd only see half the board). To behave like the
 * Lichess/Chess.com mobile board — fill the device with ZERO overflow — on
 * mobile/tablet viewports (<= 1024px) we also clamp by the viewport HEIGHT:
 *
 *   size = min(containerWidth, viewportHeight * MOBILE_VH_FACTOR, maxSize)
 *
 * Desktop is untouched (width + maxSize only) so nothing that already works on
 * laptops/desktops changes.
 *
 * Why ResizeObserver instead of window.innerWidth breakpoints?
 *   - Works correctly regardless of Windows display scaling (125 %, 150 %…)
 *   - Works regardless of Chrome zoom level
 *   - Works regardless of monitor resolution (1366p → 4K)
 *   - Reacts to layout shifts (sidebars opening/closing) automatically
 *
 * Usage:
 *   const boardRef = useRef(null);
 *   const boardSize = useResponsiveBoardSize(boardRef, 560);
 *   ...
 *   <div ref={boardRef} style={{ width: '100%' }}>
 *     <Chessboard boardWidth={boardSize} ... />
 *   </div>
 *
 * @param {React.RefObject} containerRef  – ref attached to the wrapper <div>
 * @param {number}          maxSize       – hard cap in px          (default 600)
 * @param {number}          fallback      – initial size before DOM measures (default 400)
 */

// Mobile/tablet: the board may use at most this fraction of the viewport height,
// leaving room for the surrounding page chrome so the whole board stays visible.
const MOBILE_MAX_WIDTH = 1024;
const MOBILE_VH_FACTOR = 0.72;

export default function useResponsiveBoardSize(containerRef, maxSize = 600, fallback = 400) {
  const [boardSize, setBoardSize] = useState(fallback);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    // Clamp a measured container width into a final board size, applying the
    // viewport-height cap on mobile/tablet only.
    const clamp = (w) => {
      let size = Math.min(Math.floor(w), maxSize);
      if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH) {
        size = Math.min(size, Math.floor(window.innerHeight * MOBILE_VH_FACTOR));
      }
      return size;
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setBoardSize(clamp(w));
      }
    });

    observer.observe(el);

    // Also re-clamp on viewport resize/rotate (ResizeObserver fires on the
    // container, but a rotate can change viewport height without the container
    // width changing).
    const onResize = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setBoardSize(clamp(w));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [containerRef, maxSize]);

  return boardSize;
}
