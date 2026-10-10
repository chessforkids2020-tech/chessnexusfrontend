// solutionLine.js
// Helpers for study solutions recorded from the board.
//
// Saved moves are PGN move text with sidelines in brackets
// ("1. e4 e5 (1... c5 2. Nf3) 2. Nf3"), so a creator can still edit them by hand.

import { Chess } from 'chess.js';

const MOVE_NUM = /^(\d+)\.(\.\.)?$/;        // "1." or "4..."
const NUM_PREFIX = /^(\d+)\.(\.\.)?(.+)$/;  // "1.c5" or "4...Rxa2"

const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/;

// Parse saved moves played from `fen` — move numbers (glued or separate),
// !? marks, sidelines in PGN brackets and {comments} allowed. Returns
// { comment?, children: [{ san, comment?, children }] } (first child = mainline;
// a comment belongs to the move before it, or to the start position when it
// comes first), an empty root for empty text, or null when the text holds
// anything else — prose, an illegal move — so hand-written notes are never
// mistaken for a recording and overwritten.
export function parseSolutionTree(text, fen) {
  const root = { fen, children: [] };
  const trimmed = (text || '').trim();
  if (!trimmed) return root;
  try { new Chess(fen); } catch { return null; }
  const tokens = trimmed.match(/\{[^}]*\}|[(){}]|[^\s(){}]+/g) || [];
  let cur = root;      // position we are at
  let prev = null;     // position before the last move (where a sideline branches)
  const stack = [];
  for (const tok of tokens) {
    if (tok === '{' || tok === '}') return null;   // unclosed comment
    if (tok[0] === '{') {
      const c = tok.slice(1, -1).trim();
      if (c) cur.comment = cur.comment ? `${cur.comment} ${c}` : c;
      continue;
    }
    if (tok === '(') {
      if (!prev) return null;
      stack.push({ cur, prev });
      cur = prev; prev = null;
      continue;
    }
    if (tok === ')') {
      if (!stack.length) return null;
      ({ cur, prev } = stack.pop());
      continue;
    }
    if (MOVE_NUM.test(tok) || RESULT.test(tok)) continue;
    const glued = tok.match(NUM_PREFIX);
    const raw = (glued ? glued[3] : tok).replace(/[!?]+$/g, '');
    const game = new Chess(cur.fen);
    let applied = null;
    try { applied = game.move(raw); } catch { applied = null; }
    if (!applied) return null;
    let child = cur.children.find((c) => c.san === applied.san);
    if (!child) {
      child = { san: applied.san, fen: game.fen(), children: [] };
      cur.children.push(child);
    }
    prev = cur; cur = child;
  }
  return stack.length ? null : root;
}

// Serialise an analysis tree (useAnalysisTree shape) as PGN move text with
// sidelines in brackets and each node's comment in {braces} after its move.
// `keep(id)` limits it to some nodes (default: all).
export function formatSolutionTree(tree, keep = () => true) {
  const { nodes, rootId } = tree;
  const out = [];
  // Braces would end the comment early — swap them for brackets.
  const cm = (node) => {
    if (!node.comment) return false;
    out.push(`{${node.comment.replace(/[{}]/g, (b) => (b === '{' ? '(' : ')'))}}`);
    return true;
  };
  const num = (node, force) => {
    const parts = nodes[node.parentId].fen.split(' ');
    const full = parseInt(parts[5], 10) || 1;
    if (parts[1] === 'w') return `${full}. `;
    return force ? `${full}... ` : '';
  };
  const walk = (parentId, force) => {
    let p = nodes[parentId];
    for (;;) {
      const kids = p.children.filter(keep).map((id) => nodes[id]);
      if (!kids.length) return;
      const [main, ...alts] = kids;
      out.push(num(main, force) + main.san);
      const commented = cm(main);
      for (const v of alts) {
        out.push(`(${num(v, true)}${v.san}`);
        walk(v.id, cm(v));
        out[out.length - 1] += ')';
      }
      // After a comment or a sideline, a Black move needs its "N..." again.
      force = alts.length > 0 || commented;
      p = main;
    }
  };
  cm(nodes[rootId]);
  walk(rootId, true);
  return out.join(' ');
}
