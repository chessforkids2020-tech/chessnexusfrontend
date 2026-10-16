// hooks/useMomentFreePlay.js
//
// Free play on a "moment" (My Moments / Nexus Guide) once it is answered —
// the same idea as Healthy Mix after a puzzle: the board stops being a quiz and
// becomes an analysis board.
//
//   • The solution line is the MAINLINE; the board opens on the solution move.
//   • If the student found a different accepted move, that move is a sideline
//     and the board opens on it instead.
//   • Any move played from any position becomes a sideline (useAnalysisTree),
//     so the solution is never overwritten.
//
// Only active once `done` (solved or revealed). The engine is offered then too —
// never before, so it can't be used as a hint on the student's own blunder.
import { useCallback, useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { useAnalysisTree } from './useAnalysisTree';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function useMomentFreePlay(active, done, playedMove) {
  const analysis = useAnalysisTree(active?.fen || START);
  const [engineOn, setEngineOn] = useState(false);
  const { tree, current, load, goTo, playMove, back, forward, toStart } = analysis;

  // Build the tree when the moment is answered (or a different moment opens).
  useEffect(() => {
    if (!active || !done) return;
    const sol = (active.solution || []).filter(Boolean);
    const nest = (list) => (list.length ? [{ san: list[0], children: nest(list.slice(1)) }] : []);
    const kids = nest(sol.length ? sol : [active.bestMove].filter(Boolean));
    if (playedMove && kids[0] && playedMove !== kids[0].san) kids.push({ san: playedMove, children: [] });
    const t = load(active.fen, { children: kids });
    const root = t.nodes[t.rootId];
    const target = (playedMove && root.children.find(id => t.nodes[id].san === playedMove)) || root.children[0];
    if (target) goTo(target);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [active?._id, done]);

  // A new moment starts with the engine off again.
  useEffect(() => { setEngineOn(false); }, [active?._id]);

  // Any legal move for EITHER side, from whatever position is on the board.
  const onDrop = useCallback((from, to) => {
    if (!done) return false;
    let promotion;
    try {
      const piece = new Chess(current.fen).get(from);
      if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = 'q';
    } catch { return false; }
    return !!playMove({ from, to, promotion });
  }, [done, current, playMove]);

  // End of the line the board is on (following first children).
  const toEnd = useCallback(() => {
    let n = tree.nodes[tree.currentId];
    while (n && n.children.length) n = tree.nodes[n.children[0]];
    if (n) goTo(n.id);
  }, [tree, goTo]);

  return {
    fen: current.fen,
    tree, currentId: tree.currentId,
    onDrop, goTo, back, forward, toStart, toEnd,
    engineOn, toggleEngine: () => setEngineOn(v => !v),
  };
}
