import React, { useEffect, useRef } from 'react';
import './MomentFreePlay.css';
import { t as tr } from '../i18n/LanguageContext';

// The free-board extras on a "moment" panel, kept slim so the side panel does not
// grow tall: the played moves as one wrapping row of chips (instead of the big
// Moves card), and a small Stockfish switch that sits next to the panel title.

// Moves from the start of the line up to the current move, then on down the main
// line — what the Moves card showed, minus the table and its rows.
function lineNodes(tree, currentId) {
  const { nodes, rootId } = tree;
  const back = [];
  for (let n = nodes[currentId]; n && n.id !== rootId; n = nodes[n.parentId]) back.unshift(n);
  let n = nodes[currentId];
  while (n && n.children.length) { n = nodes[n.children[0]]; back.push(n); }
  return back;
}

export function MomentMoves({ tree, currentId, onSelect, onFirst, onPrev, onNext, onLast }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.querySelector('[data-on="1"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [currentId]);
  const list = lineNodes(tree, currentId);
  const { nodes, rootId } = tree;
  const atStart = currentId === rootId;
  const atEnd = !nodes[currentId]?.children.length;
  return (
    <div className="mmx-moves">
      <div className="mmx-row" ref={ref}>
        {list.length === 0 && <span className="mmx-empty">{tr("Play a move on the board.")}</span>}
        {list.map((node) => {
          const parts = nodes[node.parentId].fen.split(' ');
          const white = parts[1] === 'w';
          const full = parseInt(parts[5], 10) || 1;
          return (
            <React.Fragment key={node.id}>
              {white && <span className="mmx-no">{full}.</span>}
              <button
                className={`mmx-mv${node.id === currentId ? ' on' : ''}`}
                data-on={node.id === currentId ? '1' : undefined}
                onClick={() => onSelect(node.id)}
              >{node.san}</button>
            </React.Fragment>
          );
        })}
      </div>
      <div className="mmx-ctl">
        <button onClick={onFirst} disabled={atStart} aria-label={tr("First move")}>⏮</button>
        <button onClick={onPrev} disabled={atStart} aria-label={tr("Previous move")}>◀</button>
        <button onClick={onNext} disabled={atEnd} aria-label={tr("Next move")}>▶</button>
        <button onClick={onLast} disabled={atEnd} aria-label={tr("Last move")}>⏭</button>
      </div>
    </div>
  );
}

export function EngineSwitch({ on, onToggle }) {
  return (
    <button
      type="button"
      className={`mmx-engine${on ? ' on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
      title={on ? tr('Turn the engine off') : tr('Turn the engine on')}
    >🐟 Stockfish {on ? 'On' : 'Off'}</button>
  );
}
