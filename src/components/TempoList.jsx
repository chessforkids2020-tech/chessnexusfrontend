// TempoList.jsx — the middlegame "lost tempo" moves of ONE player, shown inside
// the Game Report's Move quality card (GameReport.jsx). The detection rules live
// in utils/tempoAnalysis.js.
//
// Every flag shows its evidence in plain words — what skipping the turn, the
// played move and the better move were each worth — so a student or coach can
// judge it instead of taking it on trust.

import React from 'react';
import { t as tr } from '../i18n/LanguageContext';

const PIECE = {
  pawn: tr('pawn'), knight: tr('knight'), bishop: tr('bishop'),
  rook: tr('rook'), queen: tr('queen'), king: tr('king'),
};

const moveLabel = (ply, san) => `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${san}`;
const signed = (n) => (n > 0 ? `+${n}%` : `${n}%`);

const PHASE = { opening: tr('Opening'), middlegame: tr('Middlegame'), endgame: tr('Endgame') };

function reasonText(r) {
  const piece = PIECE[r.piece] || r.piece;
  switch (r.kind) {
    case 'backForth': return tr('The {piece} went back to {square} — two moves for nothing.', { piece, square: r.square });
    case 'samePiece': return tr('The same {piece} moved again, but {square} was no better.', { piece, square: r.square });
    case 'chased': return tr('The {piece} on {square} was chased by {by} — the opponent developed with tempo and you had to move it again.', { piece, square: r.square, by: r.by });
    case 'sameAgain': return tr('The {piece} moved again while {n} of your other minor pieces were still at home.', { piece, n: r.undeveloped });
    case 'flankPawn': return tr('The pawn move to {square} didn’t develop anything while {n} minor pieces were still at home.', { square: r.square, n: r.undeveloped });
    case 'lostOpposition': return tr('The king gave away the opposition — in king and pawn endings one tempo decides the result.');
    case 'pawnRace': return tr('In the pawn race, this move cost a tempo — your passed pawn on {square} should have run.', { square: r.square });
    default: return tr('This move changed almost nothing in the position.');
  }
}

function betterText(b) {
  if (!b) return null;
  if (b.kind === 'check') return tr('{san} would have given check, forcing a reply.', { san: b.san });
  if (b.kind === 'opposition') return tr('{san} kept the opposition.', { san: b.san });
  if (b.kind === 'pushPassed') return tr('{san} pushing the passed pawn was better.', { san: b.san });
  if (b.kind === 'engine') {
    if (b.castles) return tr('{san} — castling — was better.', { san: b.san });
    if (b.develops) return tr('{san} — developing a piece — was better.', { san: b.san });
    return tr('{san} was better.', { san: b.san });
  }
  const piece = PIECE[b.piece] || b.piece;
  return b.undefended
    ? tr('{san} would have attacked the undefended {piece} on {square}, forcing a reply.', { san: b.san, piece, square: b.square })
    : tr('{san} would have attacked the {piece} on {square}, forcing a reply.', { san: b.san, piece, square: b.square });
}

// The evidence: null-move flags show what skipping the turn / the move / the
// better move were worth; the others show what the engine says it cost.
function evidenceText(e) {
  if (e.turnValue != null) {
    return tr('Skipping the turn: ±0% · your move: {used} · {san}: {best}', {
      used: signed(e.used), san: e.better?.san, best: signed(e.turnValue),
    });
  }
  return tr('Engine: this cost {cost}% of your winning chances.', { cost: e.cost });
}

export default function TempoList({ events, onSeek }) {
  if (!events?.length) return null;
  return (
    <div className="tempo-block">
      <ul className="tempo-list">
        {events.map(e => (
          <li key={e.ply}>
            <button type="button" className="tempo-item" onClick={() => onSeek?.(e.ply)} title={tr("Show this move on the board")}>
              <div className="tempo-item-top">
                <b className="tempo-move">⏱ {moveLabel(e.ply, e.san)}</b>
                <span className="tempo-lost">{tr("≈ 1 tempo lost")}</span>
                {e.phase && <span className="tempo-phase">{PHASE[e.phase]}</span>}
                <span className={`tempo-conf tempo-conf--${e.confidence}`}>
                  {e.confidence === 'high' ? tr('clear') : tr('likely')}
                </span>
              </div>
              <div className="tempo-why">{reasonText(e.reason)}</div>
              {betterText(e.better) && <div className="tempo-better">{betterText(e.better)}</div>}
              {/* The evidence, so the flag can be checked rather than trusted. */}
              <div className="tempo-evidence">{evidenceText(e)}</div>
            </button>
          </li>
        ))}
      </ul>
      <p className="tempo-note">
        {tr("Every flag is confirmed by the engine — it cost winning chances. Opening theory is never flagged, a blunder keeps its ?? instead, and moving a piece again to improve it is never counted.")}
      </p>
    </div>
  );
}
