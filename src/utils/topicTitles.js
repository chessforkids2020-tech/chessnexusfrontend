// Map of topic IDs to human-readable display titles
// Must match the id field in the Topic collection
export const TOPIC_TITLES = {
  queenrookendgame: 'Queen and Rook Endgame',
  pawnendgame: 'Pawn Endgame',
  mate34f: 'Mate in 3 and 4',
  mate12: 'Mate in 1 and 2',
  forkpin: 'Fork and Pin',
  discovereddouble: 'Discovered Attack and Double Check',
  checkmate: 'Checkmate',
  capturingskewer: 'Capture the Defender and Skewer',
  attackingbackrank: 'Back Rank Mate and Attacking f2 or f7',
  // legacy / alternate IDs kept for safety
  mate34: 'Mate in 3 and 4',
  checkmate34: 'Mate in 3 and 4',
  forkandpin: 'Fork and Pin',
  discoveredattack: 'Discovered Attack and Double Check',
  skewerandcapturethedefender: 'Capture the Defender and Skewer',
  backrankf2f7: 'Back Rank Mate and Attacking f2 or f7',
  mixed: 'Mixed Puzzles',
};

/** Returns the human-readable title for a topic ID, or the ID itself as fallback */
export function getTopicTitle(topicId) {
  if (!topicId) return '';
  return TOPIC_TITLES[topicId] || topicId;
}
