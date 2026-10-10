// StudyMovesCard.jsx
// The study board's moves list, laid out like the Healthy Mix moves card:
// numbered two-column rows for the mainline, sidelines as indented lines under
// the row they branch from (nested sidelines indent again), nav buttons below.
// Reads a useAnalysisTree tree; the first child of a node is its mainline.

import React, { useEffect, useRef } from 'react';
import './StudyMovesCard.css';

// "N." before a White move; "N…" before a Black move when forced (line start,
// or straight after a sideline).
const numberOf = (nodes, node) => {
  const parts = nodes[node.parentId].fen.split(' ');
  return { white: parts[1] === 'w', full: parseInt(parts[5], 10) || 1 };
};

export default function StudyMovesCard({
  tree, currentId, accentColor, onSelect, onComment,
  onFirst, onPrev, onNext, onLast,
  headExtra, footExtra, emptyText,
}) {
  const { nodes, rootId } = tree;
  const listRef = useRef(null);

  // Keep the current move in view while stepping through a long line.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-on="1"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [currentId]);

  const moveBtn = (node, cls) => (
    <button
      key={node.id}
      className={`${cls} ${node.id === currentId ? 'on' : ''}`}
      data-on={node.id === currentId ? '1' : undefined}
      onClick={() => onSelect(node.id)}
      onDoubleClick={onComment ? () => onComment(node.id) : undefined}
      title={onComment ? 'Double-click to comment' : undefined}
    >
      {node.san}
    </button>
  );

  // A sideline starting with `first`: an inline, wrapping run of moves. Its own
  // sidelines break onto their own indented block, then the run carries on.
  const renderLine = (first) => {
    const parts = [];
    let node = first;
    let force = true;
    while (node) {
      const { white, full } = numberOf(nodes, node);
      if (white || force) {
        parts.push(<span key={`n${node.id}`} className="sm-var-no">{full}{white ? '.' : '…'}</span>);
      }
      parts.push(moveBtn(node, 'sm-var-mv'));
      if (node.comment) {
        parts.push(<span key={`c${node.id}`} className="sm-var-cm">{node.comment}</span>);
      }
      const alts = nodes[node.parentId].children.slice(1);
      // Only the mainline node of this run owns its siblings' sidelines; the
      // first move of the run IS one of those siblings, so skip it there.
      if (node !== first) {
        alts.forEach((id) => parts.push(renderVar(nodes[id])));
      }
      force = (node !== first && alts.length > 0) || !!node.comment;
      node = node.children.length ? nodes[node.children[0]] : null;
    }
    return parts;
  };

  const renderVar = (first) => (
    <div key={`v${first.id}`} className="sm-var">{renderLine(first)}</div>
  );

  // A mainline move's comment: its own line under the row (click = go to move).
  const commentLine = (n) => (
    <div key={`c${n.id}`} className="sm-cm" onClick={() => onSelect(n.id)}>{n.comment}</div>
  );

  // Mainline rows: [N.] [white] [black]; comments and sidelines of either move
  // follow the row. A comment on White's move ends the row there, so the
  // comment sits right after the move it is about (Black continues "N. …").
  const rows = [];
  if (nodes[rootId].comment) {
    rows.push(<div key="c-root" className="sm-cm sm-cm-root">{nodes[rootId].comment}</div>);
  }
  let row = null;
  let pendingVars = [];
  const flush = () => {
    if (!row) return;
    rows.push(
      <div key={`r${row.key}`} className="sm-mrow">
        <span className="sm-mno">{row.full}.</span>
        {row.w ? moveBtn(row.w, 'sm-mv') : <span className="sm-mv sm-dots">…</span>}
        {row.b ? moveBtn(row.b, 'sm-mv') : <span className="sm-mv" />}
      </div>
    );
    rows.push(...pendingVars);
    row = null; pendingVars = [];
  };
  let node = nodes[rootId].children.length ? nodes[nodes[rootId].children[0]] : null;
  while (node) {
    const { white, full } = numberOf(nodes, node);
    const alts = nodes[node.parentId].children.slice(1).map((id) => nodes[id]);
    if (white) {
      flush();
      row = { key: node.id, full, w: node, b: null };
    } else if (row && !row.b) {
      row.b = node;
    } else {
      flush();
      row = { key: node.id, full, w: null, b: node };
    }
    if (node.comment) pendingVars.push(commentLine(node));
    alts.forEach((v) => pendingVars.push(renderVar(v)));
    if (white && node.comment) flush();
    node = node.children.length ? nodes[node.children[0]] : null;
  }
  flush();

  const atStart = currentId === rootId;
  const atEnd = !nodes[currentId]?.children.length;

  return (
    <div className="sm-moves" style={{ '--sm-accent': accentColor }}>
      <div className="sm-moves-head">
        <span className="sm-moves-title">Moves</span>
        {headExtra}
      </div>
      <div className="sm-moves-list" ref={listRef}>
        {rows.length ? rows : <span className="sm-moves-empty">{emptyText}</span>}
      </div>
      <div className="sm-moves-foot">
        <span className="sm-moves-nav">
          <button className="sm-nav-btn" onClick={onFirst} disabled={atStart} title="Start">⏮</button>
          <button className="sm-nav-btn" onClick={onPrev} disabled={atStart} title="Previous move">◀</button>
          <button className="sm-nav-btn" onClick={onNext} disabled={atEnd} title="Next move">▶</button>
          <button className="sm-nav-btn" onClick={onLast} disabled={atEnd} title="End of line">⏭</button>
        </span>
        {footExtra}
      </div>
    </div>
  );
}
