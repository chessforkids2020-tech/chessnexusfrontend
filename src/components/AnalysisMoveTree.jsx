// AnalysisMoveTree.jsx
// Renders a Lichess-style move tree: the mainline runs inline with move numbers,
// and variations (sidelines) are shown indented inside parentheses. Clicking any
// move jumps to that node.

import React from 'react';

// Move number label for a node given its ply and the side that started.
// ply 1 = first move played from the start position.
function moveNumber(ply, startWhite) {
  // White's move on odd plies when start side is white; mirrored otherwise.
  const isWhiteMove = startWhite ? (ply % 2 === 1) : (ply % 2 === 0);
  const fullMove = startWhite
    ? Math.ceil(ply / 2)
    : Math.ceil((ply + 1) / 2);
  return { isWhiteMove, fullMove };
}

export default function AnalysisMoveTree({ tree, currentId, accentColor = '#a5b4fc', onSelect }) {
  const { nodes, rootId } = tree;
  const root = nodes[rootId];
  const startWhite = (root.fen || '').includes(' w ');

  const moveBtn = (node, withNumber) => {
    const { isWhiteMove, fullMove } = moveNumber(node.ply, startWhite);
    const isCurrent = node.id === currentId;
    return (
      <span key={node.id} style={{ whiteSpace: 'nowrap' }}>
        {withNumber && (
          <span style={{ color: '#64748b', marginRight: 3 }}>
            {fullMove}{isWhiteMove ? '.' : '…'}
          </span>
        )}
        <button
          onClick={() => onSelect(node.id)}
          style={{
            background: isCurrent ? accentColor : 'transparent',
            color: isCurrent ? '#0a0a0a' : '#e5e7eb',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 13.5,
            fontWeight: isCurrent ? 700 : 500,
            padding: '1px 5px',
            margin: '0 1px',
          }}
        >
          {node.san}
        </button>
      </span>
    );
  };

  // Render a line starting at `node`, following first-children (the mainline of
  // this segment). At each step, any extra children (variations) are rendered
  // indented below, recursively.
  const renderLine = (node, depth) => {
    const out = [];
    let cur = node;
    let needNumber = true; // first move of a line always shows its number
    while (cur) {
      const { isWhiteMove } = moveNumber(cur.ply, startWhite);
      // Show a number before white moves, or whenever a number is "due" after a branch.
      const withNumber = needNumber || isWhiteMove;
      out.push(moveBtn(cur, withNumber));
      out.push(' ');
      needNumber = false;

      const [main, ...vars] = cur.children;

      // Render variations (extra children) as indented blocks before continuing mainline.
      if (vars.length > 0) {
        vars.forEach((vId) => {
          out.push(
            <div
              key={`var-${vId}`}
              style={{
                margin: '2px 0 2px 0',
                paddingLeft: 12 + depth * 10,
                borderLeft: '2px solid rgba(255,255,255,0.12)',
                color: '#9ca3af',
              }}
            >
              <span style={{ color: '#6b7280' }}>(</span>
              {renderLine(nodes[vId], depth + 1)}
              <span style={{ color: '#6b7280' }}>)</span>
            </div>
          );
        });
        // After a branch, the next mainline move needs its number again.
        needNumber = true;
      }

      cur = main ? nodes[main] : null;
    }
    return out;
  };

  if (root.children.length === 0) return null;

  return (
    <div style={{ lineHeight: 1.9, wordBreak: 'break-word' }}>
      {renderLine(nodes[root.children[0]], 0)}
    </div>
  );
}
