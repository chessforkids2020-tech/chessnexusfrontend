import { useState, useEffect } from 'react';

/**
 * useResponsiveBoardSize
 *
 * Attaches a ResizeObserver to whatever container ref you pass in and returns
 * a board width (in px) that fills that container — capped at `maxSize`.
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
export default function useResponsiveBoardSize(containerRef, maxSize = 600, fallback = 400) {
  const [boardSize, setBoardSize] = useState(fallback);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setBoardSize(Math.min(Math.floor(w), maxSize));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, maxSize]);

  return boardSize;
}
