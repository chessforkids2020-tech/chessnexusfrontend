// Data for the "Piece Movements" lesson: 6 pieces in the spec's teaching order, each
// with a teach-script (lines the Nexus Coach narrates while the board highlights the
// movement) and 5 hand-crafted "catch the stars" levels (single piece + star squares).
//
// Levels are hand-made (not random) so every star is reachable by that piece from the
// start and the layouts look nice. `par` is a friendly target move-count — beat it and
// the coach cheers; go over it and the coach nudges toward a shorter path. The unit
// test asserts each level is solvable.
//
// pieceLetter uses chess.js FEN letters (uppercase = white): K Q R B N P.

export const PIECES = ['king', 'rook', 'bishop', 'queen', 'knight', 'pawn'];

export const PIECE_META = {
  king:   { name: 'King',   glyph: '♔', letter: 'K' },
  rook:   { name: 'Rook',   glyph: '♖', letter: 'R' },
  bishop: { name: 'Bishop', glyph: '♗', letter: 'B' },
  queen:  { name: 'Queen',  glyph: '♕', letter: 'Q' },
  knight: { name: 'Knight', glyph: '♘', letter: 'N' },
  pawn:   { name: 'Pawn',   glyph: '♙', letter: 'P' },
};

// A single-piece FEN with `letter` on `square` (white to move, no castling/ep).
export function buildFen(letter, square) {
  const file = square.charCodeAt(0) - 97;      // a..h -> 0..7
  const rank = parseInt(square[1], 10);         // 1..8
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    if (r === rank) {
      const before = file;
      const after = 7 - file;
      let row = '';
      if (before) row += before;
      row += letter;
      if (after) row += after;
      rows.push(row);
    } else {
      rows.push('8');
    }
  }
  return `${rows.join('/')} w - - 0 1`;
}

// Teach scripts — each entry: { text, arrows?:[{from,to}], dots?:[squares] } so the
// board shows the movement as the coach says the line. `demo` = squares the piece hops
// through to catch stars in the "watch me" animation. `demoStars` = where stars sit.
export const LESSONS = {
  king: {
    teach: [
      { text: "Hi! Let's learn how the King moves. The King is the most important piece." },
      { text: "The King can move ONE square in any direction — up, down, left, right, or diagonally.",
        arrows: [{ from: 'e4', to: 'e5' }, { from: 'e4', to: 'e3' }, { from: 'e4', to: 'd4' }, { from: 'e4', to: 'f4' }, { from: 'e4', to: 'd5' }, { from: 'e4', to: 'f5' }, { from: 'e4', to: 'd3' }, { from: 'e4', to: 'f3' }] },
      { text: "Only ONE square at a time — the King is a slow but careful piece." },
      { text: "The King can catch a star by stepping onto it. Watch me catch these stars!" },
    ],
    start: 'e4', demoStars: ['e5', 'd6'],
    levels: [
      { start: 'd4', stars: ['d5'], par: 1 },
      { start: 'd4', stars: ['f4'], par: 2 },
      { start: 'c3', stars: ['e5'], par: 2 },
      { start: 'b2', stars: ['d2', 'd4'], par: 4 },
      { start: 'e1', stars: ['e4', 'h4'], par: 6 },
    ],
  },
  rook: {
    teach: [
      { text: "Now let's learn the Rook. The Rook looks like a little tower." },
      { text: "The Rook moves in straight lines — up, down, left and right, as far as it likes.",
        arrows: [{ from: 'd4', to: 'd8' }, { from: 'd4', to: 'd1' }, { from: 'd4', to: 'a4' }, { from: 'd4', to: 'h4' }] },
      { text: "But the Rook can NOT move diagonally — only straight." },
      { text: "Watch me slide the Rook to catch the stars!" },
    ],
    start: 'd4', demoStars: ['d7', 'g7'],
    levels: [
      { start: 'a1', stars: ['a5'], par: 1 },
      { start: 'a1', stars: ['h1'], par: 1 },
      { start: 'a1', stars: ['a5', 'e5'], par: 2 },
      { start: 'd4', stars: ['d8', 'h8'], par: 2 },
      { start: 'a1', stars: ['a4', 'd4', 'd1'], par: 3 },
    ],
  },
  bishop: {
    teach: [
      { text: "Time for the Bishop. The Bishop wears a tall pointy hat." },
      { text: "The Bishop moves ONLY on diagonals — the slanted lines — as far as it likes.",
        arrows: [{ from: 'd4', to: 'a1' }, { from: 'd4', to: 'h8' }, { from: 'd4', to: 'a7' }, { from: 'd4', to: 'g1' }] },
      { text: "A Bishop stays on ONE colour of square its whole life. It can't move straight." },
      { text: "Watch me glide the Bishop across the diagonals to catch the stars!" },
    ],
    start: 'd4', demoStars: ['f6', 'b6'],
    levels: [
      { start: 'c1', stars: ['h6'], par: 1 },
      { start: 'c1', stars: ['a3'], par: 1 },
      { start: 'a1', stars: ['h8'], par: 1 },
      { start: 'c1', stars: ['h6', 'a3'], par: 2 },
      // All stars on the SAME colour as f1 (a light-squared bishop can't switch colour).
      { start: 'f1', stars: ['a6', 'c4', 'h3'], par: 3 },
    ],
  },
  queen: {
    teach: [
      { text: "Meet the Queen — the strongest piece of all!" },
      { text: "The Queen moves like a Rook AND a Bishop: straight lines and diagonals.",
        arrows: [{ from: 'd4', to: 'd8' }, { from: 'd4', to: 'a4' }, { from: 'd4', to: 'h8' }, { from: 'd4', to: 'a1' }] },
      { text: "That means the Queen can go in all EIGHT directions, as far as she likes." },
      { text: "Watch the powerful Queen sweep across the board to catch the stars!" },
    ],
    start: 'd4', demoStars: ['d7', 'g7'],
    levels: [
      { start: 'd1', stars: ['d5'], par: 1 },
      { start: 'a1', stars: ['h8'], par: 1 },
      { start: 'd1', stars: ['h5', 'a4'], par: 2 },
      { start: 'd1', stars: ['d7', 'h3'], par: 2 },
      { start: 'a1', stars: ['a5', 'e5', 'h8'], par: 3 },
    ],
  },
  knight: {
    teach: [
      { text: "Here comes the Knight — the trickiest piece! It looks like a horse." },
      { text: "The Knight jumps in an L-shape: two squares one way, then one square to the side.",
        arrows: [{ from: 'e4', to: 'f6' }, { from: 'e4', to: 'g5' }, { from: 'e4', to: 'g3' }, { from: 'e4', to: 'f2' }, { from: 'e4', to: 'd2' }, { from: 'e4', to: 'c3' }, { from: 'e4', to: 'c5' }, { from: 'e4', to: 'd6' }] },
      { text: "The Knight is the only piece that can JUMP over others. Its move always lands on the opposite colour." },
      { text: "Watch me hop the Knight around to catch the stars!" },
    ],
    start: 'e4', demoStars: ['f6', 'd6'],
    levels: [
      { start: 'e4', stars: ['f6'], par: 1 },
      { start: 'e4', stars: ['c5'], par: 1 },
      { start: 'e4', stars: ['g5', 'c3'], par: 2 },
      { start: 'd4', stars: ['e6', 'c6'], par: 2 },
      { start: 'b1', stars: ['c3', 'e4', 'd6'], par: 3 },
    ],
  },
  pawn: {
    teach: [
      { text: "Last one — the Pawn! Pawns are small but mighty." },
      { text: "A Pawn moves straight forward, one square at a time.",
        arrows: [{ from: 'e2', to: 'e3' }] },
      { text: "On its very FIRST move, a Pawn may go forward TWO squares if it likes.",
        arrows: [{ from: 'e2', to: 'e4' }] },
      { text: "Pawns never move backward or sideways. Watch me push the Pawn to catch the stars!" },
    ],
    start: 'e2', demoStars: ['e4', 'e5'],
    levels: [
      { start: 'e2', stars: ['e3'], par: 1 },
      { start: 'e2', stars: ['e4'], par: 1 },
      { start: 'e2', stars: ['e4', 'e5'], par: 2 },
      { start: 'b2', stars: ['b4', 'b5'], par: 2 },
      { start: 'a2', stars: ['a3', 'a4', 'a5'], par: 3 },
    ],
  },
};
