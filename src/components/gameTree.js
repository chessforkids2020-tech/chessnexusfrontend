// gameTree.js
// A nested variation tree for the game-analysis study board (Lichess/ChessBase
// style). The game's mainline is children[0] all the way down; user variations
// are additional children. Persisted per-game in localStorage (never the DB).
//
// Node shape:
//   { id, san, fen, from, to, children: [Node, ...] }
// The ROOT node has san=null and represents the starting position.
// A "path" is an array of node ids from the root's first move down to the
// current node (root itself is implicit / not included).

import { Chess } from 'chess.js';

let _idSeq = 1;
const newId = () => `n${_idSeq++}`;

// Build the root tree from a PGN. The mainline becomes the children[0] chain.
// Honours a [FEN] header so games from a custom start position work too.
export function buildTreeFromPgn(pgn) {
  const chess = new Chess();
  try { chess.loadPgn(pgn, { strict: false }); } catch { /* empty game */ }

  // Starting FEN (custom or standard).
  let startFen;
  try {
    const h = chess.header();
    startFen = h && h.FEN ? h.FEN : new Chess().fen();
  } catch {
    startFen = new Chess().fen();
  }

  const root = { id: 'root', san: null, fen: startFen, from: null, to: null, children: [] };

  const temp = new Chess(startFen);
  let cursor = root;
  for (const m of chess.history({ verbose: true })) {
    temp.move(m);
    const node = { id: newId(), san: m.san, fen: temp.fen(), from: m.from, to: m.to, children: [] };
    cursor.children.push(node);
    cursor = node;
  }
  return root;
}

// The mainline path: root → children[0] → children[0] …
export function getMainlinePath(root) {
  const path = [];
  let cur = root;
  while (cur.children.length > 0) {
    cur = cur.children[0];
    path.push(cur.id);
  }
  return path;
}

// Resolve a path (array of ids) to the node it points at. Returns root for [].
export function nodeAtPath(root, path) {
  let cur = root;
  for (const id of path) {
    const next = cur.children.find(c => c.id === id);
    if (!next) break;
    cur = next;
  }
  return cur;
}

// The node BEFORE the end of the path (parent of the current node).
export function parentNode(root, path) {
  return nodeAtPath(root, path.slice(0, -1));
}

// Add a move at the current path. If a child with the same SAN already exists,
// reuse it (so re-trying a known move just navigates). Otherwise create it.
// Returns { root, path } (root is mutated in place; returned for convenience).
export function addMove(root, path, { san, fen, from, to }) {
  const node = nodeAtPath(root, path);
  let child = node.children.find(c => c.san === san);
  if (!child) {
    child = { id: newId(), san, fen, from, to, children: [] };
    node.children.push(child);
  }
  return { root, path: [...path, child.id] };
}

// Delete the node at `path` (and its subtree). Returns the parent path.
export function deleteNode(root, path) {
  if (path.length === 0) return path;
  const parent = parentNode(root, path);
  const id = path[path.length - 1];
  parent.children = parent.children.filter(c => c.id !== id);
  return path.slice(0, -1);
}

// Whether the tree contains ANY user-added variation (any node with more than
// one child somewhere along the tree). Used to show/hide "delete all variations".
export function hasAnyVariations(root) {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (n.children.length > 1) return true;
    for (const c of n.children) stack.push(c);
  }
  return false;
}

// Strip every user-added variation, leaving only the mainline (children[0] chain).
// Mutates `root` in place and returns it.
export function clearAllVariations(root) {
  let cur = root;
  while (cur.children.length > 0) {
    cur.children = [cur.children[0]]; // keep only the mainline child
    cur = cur.children[0];
  }
  return root;
}

// Whether `path` lies entirely on the mainline (children[0] chain).
export function isMainlinePath(root, path) {
  let cur = root;
  for (const id of path) {
    if (!cur.children.length || cur.children[0].id !== id) return false;
    cur = cur.children[0];
  }
  return true;
}

// ── Persistence (localStorage, per game) ─────────────────────────────────────
// We strip nothing — fens are needed to render without recomputation. Keyed by a
// stable hash of the PGN so each game keeps its own tree.

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return String(h >>> 0);
}

export function treeStorageKey(pgn) {
  return `gaTree:${hashStr(pgn || '')}`;
}

// Save only the USER-ADDED variations (not the mainline chain) to keep storage
// small and let us re-merge onto a freshly-built mainline on load.
export function saveTree(pgn, root) {
  try {
    // Serialise variations: for each node, keep extra children beyond [0].
    const variations = collectVariations(root, []);
    localStorage.setItem(treeStorageKey(pgn), JSON.stringify({ v: 1, variations }));
  } catch { /* ignore quota / serialise errors */ }
}

// Walk the mainline; at each node record any sibling variations (children[1..])
// as { atPath, subtree }. atPath is the mainline path to the PARENT node.
function collectVariations(root, path) {
  const out = [];
  const walk = (node, p) => {
    node.children.forEach((child, idx) => {
      if (idx === 0) {
        walk(child, [...p, child.id]); // stay on mainline
      } else {
        out.push({ atPath: p, subtree: serializeSubtree(child) });
      }
    });
  };
  walk(root, path);
  return out;
}

function serializeSubtree(node) {
  return {
    san: node.san, fen: node.fen, from: node.from, to: node.to,
    children: node.children.map(serializeSubtree),
  };
}

function deserializeSubtree(obj) {
  return {
    id: newId(), san: obj.san, fen: obj.fen, from: obj.from, to: obj.to,
    children: (obj.children || []).map(deserializeSubtree),
  };
}

// Load saved variations and merge them onto a freshly-built mainline tree.
// `root` must be the mainline tree from buildTreeFromPgn(pgn).
export function loadTreeInto(pgn, root) {
  try {
    const raw = localStorage.getItem(treeStorageKey(pgn));
    if (!raw) return root;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.variations)) return root;
    for (const v of data.variations) {
      const parent = nodeAtPath(root, v.atPath || []);
      if (parent) parent.children.push(deserializeSubtree(v.subtree));
    }
  } catch { /* ignore */ }
  return root;
}
