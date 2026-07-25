// Legal target squares for a SINGLE piece on an otherwise-EMPTY board. We compute this
// ourselves instead of chess.js because chess.js rejects any FEN missing a king, so a
// lone rook/bishop/… can't be validated by it. On an empty board there are no blockers
// or captures, so the rules are simple and exact. pieceLetter is a FEN letter
// (K Q R B N P); colour doesn't matter except for pawn direction (white = up).

const FILES = 'abcdefgh';
const sq = (f, r) => (f >= 0 && f < 8 && r >= 1 && r <= 8) ? FILES[f] + r : null;
const parse = (s) => [s.charCodeAt(0) - 97, parseInt(s[1], 10)]; // [file0..7, rank1..8]

// Slide along a set of (df,dr) directions until the board edge (empty board = no stop).
function rays(f, r, dirs) {
  const out = [];
  for (const [df, dr] of dirs) {
    let nf = f + df, nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) { out.push(sq(nf, nr)); nf += df; nr += dr; }
  }
  return out;
}

const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KING_STEPS = [...DIAG, ...ORTHO];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

// Returns the array of target squares for `letter` on `square`. `white` = pawn goes up.
export function pieceTargets(letter, square, white = true) {
  const [f, r] = parse(square);
  const L = letter.toUpperCase();
  switch (L) {
    case 'R': return rays(f, r, ORTHO);
    case 'B': return rays(f, r, DIAG);
    case 'Q': return rays(f, r, [...ORTHO, ...DIAG]);
    case 'K': return KING_STEPS.map(([df, dr]) => sq(f + df, r + dr)).filter(Boolean);
    case 'N': return KNIGHT.map(([df, dr]) => sq(f + df, r + dr)).filter(Boolean);
    case 'P': {
      const dir = white ? 1 : -1;
      const startRank = white ? 2 : 7;
      const out = [];
      const one = sq(f, r + dir); if (one) out.push(one);
      if (r === startRank) { const two = sq(f, r + 2 * dir); if (two) out.push(two); }
      return out; // empty board: no diagonal captures, no promotion handling (levels stay < rank 8)
    }
    default: return [];
  }
}
