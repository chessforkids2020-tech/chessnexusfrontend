// moveTree.js
//
// A recursive move-tree for the Master Games analysis explorer (Lichess-style).
// The main line and every variation are nodes; variations can nest arbitrarily
// deep (variation inside variation). Everything lives in memory only — nothing
// is persisted, so a page reload resets exploration to the original game.
//
// Node shape:
//   {
//     id,                 // unique string id
//     san,                // SAN of the move that produced this node (null for root)
//     fen,                // FEN of the position AFTER this move
//     parentId,
//     children: [nodeId], // children[0] is the "main" continuation; [1..] are variations
//     // optional annotation carried from the imported PGN (main-line nodes only):
//     classification,     // 'inaccuracy' | 'mistake' | 'blunder' | null
//     eval, mateIn, bestMove, bestLine, comment
//   }
//
// The root node (san === null) holds the starting position; children[0] of the
// chain down through firstborn children IS the original game's main line.

import { Chess } from 'chess.js';

// Per-tree unique ids. We seed the counter from the highest id already present in
// a tree (used when rehydrating from localStorage), so restored variations never
// collide with newly created ones.
let _idCounter = 0;
const newId = () => `n${++_idCounter}`;
function seedIdCounterFrom(nodes) {
  let max = 0;
  for (const id of Object.keys(nodes || {})) {
    const m = /^n(\d+)$/.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  if (max > _idCounter) _idCounter = max;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Build a tree from a flat SAN move list + optional per-ply analysis array.
// `analysis[i]` (if present) annotates the move at ply i+1.
export function buildTreeFromGame(moves, analysis, startFen = START_FEN) {
  const nodes = {};
  const rootId = newId();
  nodes[rootId] = { id: rootId, san: null, fen: startFen, parentId: null, children: [] };

  const chess = new Chess(startFen);
  let prevId = rootId;

  (moves || []).forEach((san, i) => {
    const mv = safeMove(chess, san);
    if (!mv) return; // bad SAN in source — stop the line gracefully
    const a = analysis && analysis[i] ? analysis[i] : {};
    const id = newId();
    nodes[id] = {
      id,
      san: mv.san,
      fen: chess.fen(),
      parentId: prevId,
      children: [],
      classification: a.classification ?? null,
      eval: a.eval ?? null,
      mateIn: a.mateIn ?? null,
      bestMove: a.bestMove ?? null,
      bestLine: a.bestLine ?? null,
      comment: a.comment ?? null
    };
    nodes[prevId].children.push(id);
    prevId = id;
  });

  return { nodes, rootId };
}

// Attempt a move (SAN or {from,to,promotion}) from a node. If a child with the
// same resulting move already exists, returns that child (so replaying the main
// line just continues it instead of creating a duplicate variation).
// Returns { tree, nodeId } or null if illegal.
export function applyMove(tree, fromNodeId, move) {
  const parent = tree.nodes[fromNodeId];
  if (!parent) return null;

  const chess = new Chess(parent.fen);
  const mv = safeMove(chess, move);
  if (!mv) return null; // illegal — blocked

  // Does a child already encode this exact move? If so, reuse it.
  const existing = parent.children
    .map(cid => tree.nodes[cid])
    .find(c => c && c.san === mv.san);
  if (existing) {
    return { tree, nodeId: existing.id };
  }

  const id = newId();
  const node = {
    id,
    san: mv.san,
    fen: chess.fen(),
    parentId: fromNodeId,
    children: [],
    classification: null,
    eval: null, mateIn: null, bestMove: null, bestLine: null, comment: null
  };
  const nodes = { ...tree.nodes, [id]: node, [fromNodeId]: { ...parent, children: [...parent.children, id] } };
  return { tree: { ...tree, nodes }, nodeId: id };
}

// Insert a SAN line (e.g. a stored bestLine) as a variation starting from a node.
// Returns { tree, nodeId } where nodeId is the LAST node of the inserted line
// (or null if nothing legal could be inserted).
export function insertLine(tree, fromNodeId, sanLine) {
  let working = tree;
  let cursor = fromNodeId;
  let lastNew = null;
  for (const san of (sanLine || [])) {
    const res = applyMove(working, cursor, san);
    if (!res) break;
    working = res.tree;
    cursor = res.nodeId;
    lastNew = res.nodeId;
  }
  return lastNew ? { tree: working, nodeId: lastNew } : null;
}

// Path of node ids from root to the given node (inclusive of node, excluding root).
export function pathToNode(tree, nodeId) {
  const path = [];
  let cur = nodeId;
  while (cur && tree.nodes[cur] && tree.nodes[cur].parentId !== null) {
    path.unshift(cur);
    cur = tree.nodes[cur].parentId;
  }
  return path;
}

// The "main line" = follow firstborn children from root.
export function mainLine(tree) {
  const line = [];
  let cur = tree.nodes[tree.rootId];
  while (cur && cur.children.length) {
    const next = tree.nodes[cur.children[0]];
    line.push(next);
    cur = next;
  }
  return line;
}

// Navigation helpers — return a node id or null.
export function firstNode(tree) {
  return tree.nodes[tree.rootId].children[0] || null;
}
export function nextNode(tree, nodeId) {
  const n = tree.nodes[nodeId];
  if (!n) return firstNode(tree);
  return n.children[0] || null;
}
export function prevNode(tree, nodeId) {
  const n = tree.nodes[nodeId];
  if (!n) return null;
  // null parent => we're going back to the start position (root)
  return n.parentId === tree.rootId ? null : n.parentId;
}
export function lastNode(tree, fromNodeId) {
  // Follow firstborn children to the end of the current line.
  let cur = fromNodeId ? tree.nodes[fromNodeId] : tree.nodes[tree.rootId];
  while (cur && cur.children.length) cur = tree.nodes[cur.children[0]];
  return cur ? (cur.id === tree.rootId ? null : cur.id) : null;
}

// FEN for the current node (root = start position when nodeId is null).
export function fenAt(tree, nodeId) {
  if (!nodeId) return tree.nodes[tree.rootId].fen;
  return tree.nodes[nodeId]?.fen || tree.nodes[tree.rootId].fen;
}

// last move {from,to} for highlight, given a node.
export function lastMoveAt(tree, nodeId) {
  const n = nodeId && tree.nodes[nodeId];
  if (!n || !n.san || n.parentId == null) return null;
  // Recompute from parent FEN since we only stored SAN.
  try {
    const chess = new Chess(tree.nodes[n.parentId].fen);
    const mv = chess.move(n.san);
    return mv ? { from: mv.from, to: mv.to } : null;
  } catch {
    return null;
  }
}

function safeMove(chess, move) {
  try {
    return chess.move(move);
  } catch {
    // chess.js throws when a `promotion` field is supplied on a NON-promotion
    // move (e.g. {from:'f1',to:'c4',promotion:'q'} for a bishop). Retry without
    // it so ordinary moves made on the board aren't rejected.
    if (move && typeof move === 'object' && move.promotion) {
      try {
        return chess.move({ from: move.from, to: move.to });
      } catch { return null; }
    }
    return null;
  }
}

// ── localStorage persistence (per game) ──────────────────────────────────────
// The tree is already a plain { nodes, rootId } object, so JSON round-trips it.
// We seed the id counter from a rehydrated tree so new variations get fresh ids.

export function rehydrateTree(serialized) {
  if (!serialized || !serialized.nodes || !serialized.rootId) return null;
  if (!serialized.nodes[serialized.rootId]) return null;
  seedIdCounterFrom(serialized.nodes);
  return { nodes: serialized.nodes, rootId: serialized.rootId };
}

// True when the user has added at least one variation beyond the original game
// (i.e. some node has more than one child, or a node has children not on the
// firstborn main line). Cheap check: any node with >1 child.
export function hasVariations(tree) {
  if (!tree) return false;
  return Object.values(tree.nodes).some(n => (n.children || []).length > 1);
}
