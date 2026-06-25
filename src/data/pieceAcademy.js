/**
 * Piece Academy — story/character-driven lesson content for absolute-beginner kids.
 *
 * Each entry is a friendly piece "character" with a short story and 3 bite-sized
 * lessons. A lesson only needs a FEN (single piece on an otherwise empty board)
 * plus the goal square(s). The lesson runner derives legal movement from chess.js,
 * so we never hand-list move rules — correctness comes for free.
 *
 * Lesson shape:
 *   {
 *     id:            unique lesson id (used as progress key, e.g. 'rook-1'),
 *     title:         short kid-friendly title,
 *     instruction:   one-line "do this" prompt,
 *     fen:           board position with exactly the one piece being taught,
 *     pieceSquare:   where that piece starts (for hint arrows + clarity),
 *     targetSquares: array of goal squares; landing on ANY finishes the step,
 *     capture:       (optional) true when the lesson teaches capturing,
 *   }
 *
 * Star rule: completing all 3 lessons of a piece earns 3 stars.
 *
 * Order is chosen for kids: straight-line pieces first, the tricky knight and
 * pawn last (knight = L-shape, pawn = first-move-two + diagonal-capture + no-back).
 */

const STAR_GOAL = 3; // lessons per piece

export const PIECE_ACADEMY = [
  {
    id: 'rook',
    name: 'Rooky the Rook',
    art: 'wR',
    color: '#3b82f6',
    tagline: 'I zoom in straight lines!',
    story: [
      'Hi! I am Rooky the castle tower. 🏰',
      'I love straight roads — up, down, left and right.',
      'But I NEVER walk slanty. Watch me go!',
    ],
    lessons: [
      {
        id: 'rook-1',
        title: 'Straight up!',
        instruction: 'Slide Rooky all the way up to the star ⭐',
        fen: '8/8/8/8/8/8/8/R7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['a8'],
      },
      {
        id: 'rook-2',
        title: 'Side to side',
        instruction: 'Slide Rooky across to the star ⭐',
        fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
        pieceSquare: 'd4',
        targetSquares: ['h4'],
      },
      {
        id: 'rook-3',
        title: 'Gobble it up!',
        instruction: 'Capture the lonely pawn! Slide Rooky onto it.',
        fen: '8/8/8/8/8/8/p7/R7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['a2'],
        capture: true,
      },
    ],
  },
  {
    id: 'bishop',
    name: 'Bishy the Bishop',
    art: 'wB',
    color: '#8b5cf6',
    tagline: 'I slide on slanty roads!',
    story: [
      'Hello, I am Bishy! 🎩',
      'I only travel on slanty diagonal roads.',
      'I stay on one colour my whole life. Neat, huh?',
    ],
    lessons: [
      {
        id: 'bishop-1',
        title: 'Slanty slide',
        instruction: 'Slide Bishy diagonally to the star ⭐',
        fen: '8/8/8/8/8/8/8/B7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['h8'],
      },
      {
        id: 'bishop-2',
        title: 'The other way',
        instruction: 'Slide Bishy the other slanty way to the star ⭐',
        fen: '8/8/8/8/8/8/8/7B w - - 0 1',
        pieceSquare: 'h1',
        targetSquares: ['a8'],
      },
      {
        id: 'bishop-3',
        title: 'Gobble it up!',
        instruction: 'Capture the pawn on the slanty road!',
        fen: '8/8/8/8/8/2p5/8/B7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['c3'], // a1 diagonal: b2, c3, d4, ...
        capture: true,
      },
    ],
  },
  {
    id: 'queen',
    name: 'Queenie the Queen',
    art: 'wQ',
    color: '#ec4899',
    tagline: 'I can go ANY way!',
    story: [
      'I am Queenie, the most powerful piece! 👑',
      'Straight roads? Yes! Slanty roads? Yes!',
      'I am Rooky and Bishy put together!',
    ],
    lessons: [
      {
        id: 'queen-1',
        title: 'Straight power',
        instruction: 'Send Queenie straight up to the star ⭐',
        fen: '8/8/8/8/8/8/8/Q7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['a8'],
      },
      {
        id: 'queen-2',
        title: 'Slanty power',
        instruction: 'Send Queenie diagonally to the star ⭐',
        fen: '8/8/8/8/8/8/8/Q7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['h8'],
      },
      {
        id: 'queen-3',
        title: 'Gobble it up!',
        instruction: 'Capture the pawn — any road works!',
        fen: '8/8/8/8/8/8/8/Q5p1 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['g1'],
        capture: true,
      },
    ],
  },
  {
    id: 'king',
    name: 'Kingsley the King',
    art: 'wK',
    color: '#f59e0b',
    tagline: 'I take baby steps!',
    story: [
      'I am Kingsley the King. 👑',
      'I can go any way... but only ONE little step.',
      'Slow and careful — that is the king way!',
    ],
    lessons: [
      {
        id: 'king-1',
        title: 'One step up',
        instruction: 'Take one baby step up to the star ⭐',
        fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
        pieceSquare: 'd4',
        targetSquares: ['d5'],
      },
      {
        id: 'king-2',
        title: 'One step slanty',
        instruction: 'Take one slanty baby step to the star ⭐',
        fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
        pieceSquare: 'd4',
        targetSquares: ['e5'],
      },
      {
        id: 'king-3',
        title: 'Gobble it up!',
        instruction: 'Capture the pawn right next door!',
        fen: '8/8/8/8/3Kp3/8/8/8 w - - 0 1',
        pieceSquare: 'd4',
        targetSquares: ['e4'],
        capture: true,
      },
    ],
  },
  {
    id: 'knight',
    name: 'Nimble the Knight',
    art: 'wN',
    color: '#10b981',
    tagline: 'I hop in an L!',
    story: [
      'Neigh! I am Nimble the horse. 🐴',
      'I jump in a funny "L" shape: two then one.',
      'And I can HOP right over other pieces!',
    ],
    lessons: [
      {
        id: 'knight-1',
        title: 'The L hop',
        instruction: 'Hop Nimble in an L to the star ⭐',
        fen: '8/8/8/8/8/8/8/N7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['b3', 'c2'],
      },
      {
        id: 'knight-2',
        title: 'Hop from the middle',
        instruction: 'Hop Nimble in an L to the star ⭐',
        fen: '8/8/8/8/3N4/8/8/8 w - - 0 1',
        pieceSquare: 'd4',
        targetSquares: ['e6', 'f5', 'f3', 'e2', 'c2', 'b3', 'b5', 'c6'],
      },
      {
        id: 'knight-3',
        title: 'Gobble it up!',
        instruction: 'Hop onto the pawn in an L shape!',
        fen: '8/8/8/8/8/1p6/8/N7 w - - 0 1',
        pieceSquare: 'a1',
        targetSquares: ['b3'], // a1 knight reaches b3, c2
        capture: true,
      },
    ],
  },
  {
    id: 'pawn',
    name: 'Penny the Pawn',
    art: 'wP',
    color: '#ef4444',
    tagline: 'Little but brave!',
    story: [
      'I am Penny, the little pawn. 🐣',
      'I march forward — never backward!',
      'My first step can be TWO squares. I capture slanty!',
    ],
    lessons: [
      {
        id: 'pawn-1',
        title: 'One step forward',
        instruction: 'March Penny one step up to the star ⭐',
        fen: '8/8/8/8/8/8/P7/8 w - - 0 1',
        pieceSquare: 'a2',
        targetSquares: ['a3'],
      },
      {
        id: 'pawn-2',
        title: 'Big first jump',
        instruction: 'On her first move Penny can jump TWO squares!',
        fen: '8/8/8/8/8/8/P7/8 w - - 0 1',
        pieceSquare: 'a2',
        targetSquares: ['a4'],
      },
      {
        id: 'pawn-3',
        title: 'Slanty gobble!',
        instruction: 'Penny captures the pawn on the slanty square!',
        fen: '8/8/8/8/8/1p6/P7/8 w - - 0 1',
        pieceSquare: 'a2',
        targetSquares: ['b3'],
        capture: true,
      },
    ],
  },
];

export { STAR_GOAL };

export function getPieceById(id) {
  return PIECE_ACADEMY.find((p) => p.id === id) || null;
}
