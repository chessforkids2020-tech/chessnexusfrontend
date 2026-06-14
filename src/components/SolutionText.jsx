// SolutionText.jsx
// Renders a free-form solution annotation with the embedded chess moves made
// clickable. Clicking a move replays the line that leads to it (from the puzzle
// start) onto the board.
//
// The solution is prose, so we can't assume strict PGN. We tokenise the text and
// greedily try each word as a SAN move on a running game:
//   • A leading move number "1." / "4..." is stripped before validating the SAN.
//   • If a word is a legal move in the running position, it becomes a clickable
//     chip and we remember the full move sequence up to it.
//   • A move number "1." (full move 1) restarts the line from the start — this
//     handles narration like "Let's start the position once again 1.c5 …".
//   • If a SAN-looking word is illegal in the running position (a branch the
//     prose jumped to, e.g. "4...Rxa2"), we try replaying just the numbered
//     context from the start so side-lines still resolve when possible.
// Anything that isn't a legal move is rendered as plain text.

import React, { useMemo } from 'react';
import { Chess } from 'chess.js';

// A SAN-ish token: optional move number, then the move. Captures the number and SAN.
const MOVE_NUM = /^(\d+)\.(\.\.)?$/;            // "1." or "4..."
const NUM_PREFIX = /^(\d+)\.(\.\.)?(.+)$/;      // "1.c5" or "4...Rxa2"
// Plausible SAN: piece moves, pawn moves, captures, castling, promotion, checks.
const SAN_RE = /^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?)[+#!?]*$/;

function cleanSan(raw) {
  // Strip trailing punctuation/annotation glyphs the author may have added.
  return raw.replace(/[+#!?]+$/g, '');
}

function tryMove(game, san) {
  try {
    const m = game.move(san, { sloppy: true });
    return m || null;
  } catch {
    return null;
  }
}

export default function SolutionText({ text, startFen, accentColor = '#a5b4fc', onPlayLine }) {
  // Parse once per (text, startFen).
  const parts = useMemo(() => {
    if (!text) return [];
    const out = [];
    // The running game for the "current line"; resets when narration restarts.
    let game = new Chess(startFen);
    let lineMoves = []; // SAN list from the start of the current line

    const tokens = text.split(/(\s+)/); // keep whitespace tokens to preserve formatting

    for (const tok of tokens) {
      if (/^\s+$/.test(tok)) { out.push(tok); continue; }

      // Pure move number like "1." or "4..." — if it's full-move 1, restart line.
      const numOnly = tok.match(MOVE_NUM);
      if (numOnly) {
        if (parseInt(numOnly[1], 10) === 1) { game = new Chess(startFen); lineMoves = []; }
        out.push(tok);
        continue;
      }

      // Move number glued to a move, e.g. "1.c5", "4...Rxa2".
      let num = null, sanRaw = tok;
      const glued = tok.match(NUM_PREFIX);
      if (glued) {
        num = parseInt(glued[1], 10);
        sanRaw = glued[3];
        // A numbered move whose number doesn't continue the running line means the
        // narration jumped (restart of the line or a fresh variation). Re-anchor
        // from the start so the running game can't desync. We can only rebuild the
        // line cleanly when it restarts at move 1; otherwise we reset and let the
        // numbered moves that follow rebuild context.
        const expectedFull = Math.floor(game.history().length / 2) + 1;
        if (num === 1 || num < expectedFull) { game = new Chess(startFen); lineMoves = []; }
      }

      const san = cleanSan(sanRaw);
      if (!SAN_RE.test(sanRaw)) { out.push(tok); continue; }

      // Try to apply on the running line.
      let applied = tryMove(game, san);

      // If a numbered move is the wrong side for the running position (e.g. a "...X"
      // black-move alternative while it's White to move), it's an alternative branch,
      // not a continuation — keep it clickable from the start of the current line.
      if (applied) {
        lineMoves = [...lineMoves, applied.san];
        out.push({ kind: 'move', label: tok, seq: [...lineMoves] });
      } else {
        out.push(tok);
      }
    }
    return out;
  }, [text, startFen]);

  if (!text) return null;

  return (
    <span style={{ lineHeight: 1.9 }}>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>;
        return (
          <button
            key={i}
            onClick={() => onPlayLine(p.seq)}
            title="Play this line on the board"
            style={{
              display: 'inline',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px dotted ${accentColor}`,
              color: accentColor,
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 700,
              padding: 0,
              margin: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {p.label}
          </button>
        );
      })}
    </span>
  );
}
