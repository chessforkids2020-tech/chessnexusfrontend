// hooks/useSquareEvals.js
// Click a piece → every legal destination is labelled with the eval after that
// move (from the mover's point of view). Feed `selection` from the board's
// onSelectionChange and pass the returned evals to its `squareEvals` prop.
import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import stockfishService from '../services/stockfishService';

const SQUARE_EVAL_DEPTH = 12;

export default function useSquareEvals(fen, enabled) {
  const [selection, setSelection] = useState(null);
  const [squareEvals, setSquareEvals] = useState({});
  const runRef = useRef(0);
  const fenRef = useRef(fen);
  fenRef.current = fen;

  useEffect(() => { setSelection(null); }, [fen, enabled]);

  useEffect(() => {
    if (!enabled || !selection || !selection.targets?.length) {
      setSquareEvals({});
      return undefined;
    }
    const run = ++runRef.current;
    let cancelled = false;
    const live = () => !cancelled && run === runRef.current;
    setSquareEvals(Object.fromEntries(selection.targets.map(sq => [sq, { pending: true }])));

    (async () => {
      try {
        if (!stockfishService.isReady()) await stockfishService.init();
        for (const target of selection.targets) {
          if (!live()) return;
          let afterFen = null;
          let mated = false;
          try {
            const probe = new Chess(fenRef.current);
            const mv = probe.move({ from: selection.from, to: target, promotion: 'q' });
            if (!mv) continue;
            afterFen = probe.fen();
            mated = probe.isCheckmate();
          } catch { continue; }
          if (mated) {
            if (live()) setSquareEvals(prev => ({ ...prev, [target]: { text: '#', score: 99 } }));
            continue;
          }
          let res = null;
          try { res = await stockfishService.analyzePosition(afterFen, { depth: SQUARE_EVAL_DEPTH, multipv: 1 }); } catch { /* */ }
          if (!live()) return;
          const line = res?.lines?.[0];
          if (!line) continue;
          // The engine scores for the side to move — after our move that is the
          // opponent — so negate to get the mover's view.
          let text, score;
          if (line.scoreType === 'mate') {
            const m = -line.score;
            text = (m > 0 ? '#' : '-#') + Math.abs(m);
            score = m > 0 ? 99 : -99;
          } else {
            score = -line.score / 100;
            text = (score > 0 ? '+' : '') + score.toFixed(1);
          }
          setSquareEvals(prev => ({ ...prev, [target]: { text, score } }));
        }
      } catch { /* optional feature — never break the page */ }
    })();

    return () => { cancelled = true; };
  }, [enabled, selection]);

  return { squareEvals: enabled ? squareEvals : undefined, onSelectionChange: enabled ? setSelection : undefined };
}
