// useAnalysisTree.js
// A Lichess-style analysis move tree held entirely in memory (lost on unmount).
//
// Model: a tree of nodes. The root represents the starting position (no move).
// Each node: { id, move, san, from, to, fen, ply, parentId, children: [ids] }.
// - The FIRST child of a node is its mainline continuation; later children are
//   variations (sidelines) that branch at that point.
// - Playing the SAME move that already exists just advances into it (no dup).
// - Playing a DIFFERENT move creates a new child (a new variation).
// - Going back never deletes forward nodes — variations persist for the session.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

let _seq = 0;
const nextId = () => `n${++_seq}`;

export function useAnalysisTree(startFen) {
  // Build the initial single-node tree from the start FEN.
  const build = useCallback((fen) => {
    const rootId = nextId();
    const root = {
      id: rootId, move: null, san: null, from: null, to: null,
      fen, ply: 0, parentId: null, children: [],
    };
    return { nodes: { [rootId]: root }, rootId, currentId: rootId };
  }, []);

  const [tree, setTree] = useState(() => build(startFen));
  const treeRef = useRef(tree);
  treeRef.current = tree;

  // Replace the whole tree (e.g. when the puzzle changes).
  const reset = useCallback((fen) => {
    const t = build(fen);
    setTree(t);
    return t.nodes[t.rootId];
  }, [build]);

  const current = tree.nodes[tree.currentId];

  // Try to play a move from the current node. `move` is a chess.js move-ish
  // object ({ from, to, promotion }) or SAN string. Returns the resulting
  // node, or null if illegal.
  const playMove = useCallback((move) => {
    const t = treeRef.current;
    const cur = t.nodes[t.currentId];
    const game = new Chess(cur.fen);
    let applied;
    try { applied = game.move(move); } catch { applied = null; }
    if (!applied) return null;

    const fen = game.fen();

    // If a child already encodes this exact move, just advance into it.
    const existingId = cur.children.find((cid) => t.nodes[cid].san === applied.san);
    if (existingId) {
      setTree({ ...t, currentId: existingId });
      return t.nodes[existingId];
    }

    // Otherwise create a new child node (mainline if first, else variation).
    const id = nextId();
    const node = {
      id, move: { from: applied.from, to: applied.to, promotion: applied.promotion },
      san: applied.san, from: applied.from, to: applied.to,
      fen, ply: cur.ply + 1, parentId: cur.id, children: [],
    };
    setTree({
      ...t,
      nodes: {
        ...t.nodes,
        [id]: node,
        [cur.id]: { ...cur, children: [...cur.children, id] },
      },
      currentId: id,
    });
    return node;
  }, []);

  // Jump to any node by id.
  const goTo = useCallback((id) => {
    setTree((t) => (t.nodes[id] ? { ...t, currentId: id } : t));
  }, []);

  // Replay a SAN sequence from the root onto the tree (creating/advancing nodes
  // as needed), then make the last move the current node. Used by the clickable
  // solution lines. Returns the resulting current node, or null if a SAN was
  // illegal partway (it stops at the last legal move).
  const playLine = useCallback((sanList) => {
    setTree((t) => {
      let nodes = { ...t.nodes };
      let curId = t.rootId;
      for (const san of sanList) {
        const cur = nodes[curId];
        // Advance into an existing child with this SAN if present.
        const existing = cur.children.find((cid) => nodes[cid].san === san);
        if (existing) { curId = existing; continue; }
        // Otherwise validate + create a new node.
        const game = new Chess(cur.fen);
        let applied;
        try { applied = game.move(san, { sloppy: true }); } catch { applied = null; }
        if (!applied) break; // stop at the last legal move
        const id = nextId();
        nodes[id] = {
          id, move: { from: applied.from, to: applied.to, promotion: applied.promotion },
          san: applied.san, from: applied.from, to: applied.to,
          fen: game.fen(), ply: cur.ply + 1, parentId: cur.id, children: [],
        };
        nodes[cur.id] = { ...cur, children: [...cur.children, id] };
        curId = id;
      }
      return { ...t, nodes, currentId: curId };
    });
  }, []);

  // Replace the tree with a parsed line + sidelines ({ children: [{ san, children }] },
  // first child = mainline), positioned at the root. Returns the new tree so the
  // caller can see its node ids straight away.
  const load = useCallback((fen, parsed) => {
    const t = build(fen);
    const nodes = { ...t.nodes };
    const add = (parentId, kids) => {
      for (const k of kids || []) {
        const parent = nodes[parentId];
        const game = new Chess(parent.fen);
        let applied;
        try { applied = game.move(k.san); } catch { applied = null; }
        if (!applied) continue;
        const id = nextId();
        nodes[id] = {
          id, move: { from: applied.from, to: applied.to, promotion: applied.promotion },
          san: applied.san, from: applied.from, to: applied.to,
          fen: game.fen(), ply: parent.ply + 1, parentId, children: [],
          ...(k.comment ? { comment: k.comment } : {}),
        };
        nodes[parentId] = { ...nodes[parentId], children: [...nodes[parentId].children, id] };
        add(id, k.children);
      }
    };
    if (parsed?.comment) nodes[t.rootId] = { ...nodes[t.rootId], comment: parsed.comment };
    add(t.rootId, parsed?.children);
    const next = { ...t, nodes };
    setTree(next);
    return next;
  }, [build]);

  // Delete a node and everything after it; the board moves to its parent.
  // Returns the new tree (or null for the root, which can't be deleted).
  const deleteFrom = useCallback((id) => {
    const t = treeRef.current;
    const node = t.nodes[id];
    if (!node || !node.parentId) return null;
    const nodes = { ...t.nodes };
    const drop = (nid) => { nodes[nid].children.forEach(drop); delete nodes[nid]; };
    drop(id);
    const parent = nodes[node.parentId];
    nodes[parent.id] = { ...parent, children: parent.children.filter((c) => c !== id) };
    const next = { ...t, nodes, currentId: parent.id };
    setTree(next);
    return next;
  }, []);

  // Set (or, with empty text, remove) the comment shown after node `id`.
  // Returns the new tree.
  const setComment = useCallback((id, text) => {
    const t = treeRef.current;
    const node = t.nodes[id];
    if (!node) return null;
    const { comment: _old, ...rest } = node;
    const c = (text || '').trim();
    const next = { ...t, nodes: { ...t.nodes, [id]: c ? { ...rest, comment: c } : rest } };
    setTree(next);
    return next;
  }, []);

  // Step one move back along the current line (to the parent).
  const back = useCallback(() => {
    setTree((t) => {
      const cur = t.nodes[t.currentId];
      return cur.parentId ? { ...t, currentId: cur.parentId } : t;
    });
  }, []);

  // Step one move forward along the current line (into the first child / mainline).
  const forward = useCallback(() => {
    setTree((t) => {
      const cur = t.nodes[t.currentId];
      return cur.children.length ? { ...t, currentId: cur.children[0] } : t;
    });
  }, []);

  const toStart = useCallback(() => {
    setTree((t) => ({ ...t, currentId: t.rootId }));
  }, []);

  // The path of node ids from root to current (used for highlight/“is on current line”).
  const currentPath = useMemo(() => {
    const path = [];
    let n = tree.nodes[tree.currentId];
    while (n) { path.unshift(n.id); n = n.parentId ? tree.nodes[n.parentId] : null; }
    return path;
  }, [tree]);

  const hasMoves = tree.nodes[tree.rootId].children.length > 0;

  return {
    tree, current, currentPath, hasMoves,
    playMove, playLine, goTo, back, forward, toStart, reset, load, deleteFrom, setComment,
  };
}
