// components/ArenaGameReplayModal.jsx
// A lightweight popup to replay a single arena tournament game move-by-move from
// its stored SAN moves[]. Reused by the coach's student progress page (click a
// game row in the arena-games table) and anywhere else that has a game's moves.
//
// Props: { moves:[san], startFen?, white, black, result, orientation?, onClose }
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';

const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Build the linear list of FENs (one per ply, index 0 = start) + SANs from moves.
function buildPositions(startFen, moves) {
  const fen0 = startFen || DEFAULT_START_FEN;
  const fens = [fen0];
  const sans = [];
  let chess;
  try { chess = new Chess(fen0); } catch { chess = new Chess(); }
  for (const san of (moves || [])) {
    let r;
    try { r = chess.move(san, { sloppy: true }); } catch { break; }
    if (!r) break;
    sans.push(r.san);
    fens.push(chess.fen());
  }
  return { fens, sans };
}

const resultLabel = (result) =>
  result === 'white_won' ? '1–0' : result === 'black_won' ? '0–1' : result === 'draw' ? '½–½' : '';

export default function ArenaGameReplayModal({ moves, startFen, finalFen, white, black, result, orientation = 'white', onClose }) {
  const { fens, sans } = useMemo(() => buildPositions(startFen, moves), [startFen, moves]);
  // ply = index into fens (0 = start, fens.length-1 = final position). Start at end.
  const [ply, setPly] = useState(Math.max(0, fens.length - 1));
  const [boardW, setBoardW] = useState(420);

  useEffect(() => {
    const fit = () => {
      // Modal is up to 820px wide; the board takes ~55% of it, leaving room for
      // the moves column on the right. Also bound by viewport height.
      const modalW = Math.min(window.innerWidth - 32, 820);
      const byWidth = Math.floor(modalW * 0.55);
      const byHeight = Math.floor(window.innerHeight * 0.68);
      setBoardW(Math.max(240, Math.min(byWidth, byHeight, 440)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const goStart = () => setPly(0);
  const goEnd = () => setPly(fens.length - 1);
  const goPrev = () => setPly(p => Math.max(0, p - 1));
  const goNext = () => setPly(p => Math.min(fens.length - 1, p + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'Home') goStart();
      else if (e.key === 'End') goEnd();
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fens.length]);

  const hasGame = sans.length > 0;

  // Portal to <body> so a transformed/overflow-hidden ancestor on the page can't
  // trap this fixed overlay in a lower stacking context (or clip it).
  // Build numbered rows [{ num, white, black }] for the right-hand move list.
  const rows = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ num: i / 2 + 1, whitePly: i + 1, white: sans[i], blackPly: i + 2, black: sans[i + 1] || null });
  }

  return createPortal(
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 15 }}>
            {white || 'White'} <span style={{ color: '#64748b' }}>vs</span> {black || 'Black'}
            {result ? <span style={{ marginLeft: 8, color: '#94a3b8', fontWeight: 700 }}>{resultLabel(result)}</span> : null}
          </div>
          <button onClick={onClose} style={S.closeBtn} title="Close (Esc)">✕</button>
        </div>

        {!hasGame ? (
          finalFen ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Chessboard position={finalFen} boardWidth={boardW} orientation={orientation} draggable={false} />
              </div>
              <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13 }}>
                Final position. Move-by-move replay isn’t available for this game.
              </div>
            </div>
          ) : (
            <div style={{ padding: '28px 8px', color: '#94a3b8', textAlign: 'center', fontSize: 14 }}>
              Moves aren’t available for this game.
            </div>
          )
        ) : (
          // Two columns: board on the LEFT, moves + controls on the RIGHT.
          <div style={S.body}>
            <div style={S.boardCol}>
              <Chessboard position={fens[ply]} boardWidth={boardW} orientation={orientation} draggable={false} />
              <div style={S.controls}>
                <button style={S.navBtn} onClick={goStart} disabled={ply === 0}>⏮</button>
                <button style={S.navBtn} onClick={goPrev} disabled={ply === 0}>◀</button>
                <button style={S.navBtn} onClick={goNext} disabled={ply >= fens.length - 1}>▶</button>
                <button style={S.navBtn} onClick={goEnd} disabled={ply >= fens.length - 1}>⏭</button>
              </div>
            </div>

            <div style={S.movesCol}>
              <div style={S.movesTitle}>Moves</div>
              <div style={S.movesScroll}>
                {rows.map((row) => (
                  <div key={row.num} style={S.moveRow}>
                    <span style={S.moveNum}>{row.num}.</span>
                    <span
                      onClick={() => setPly(row.whitePly)}
                      style={{ ...S.moveCell, ...(ply === row.whitePly ? S.moveCellActive : {}) }}
                    >
                      {row.white}
                    </span>
                    {row.black ? (
                      <span
                        onClick={() => setPly(row.blackPly)}
                        style={{ ...S.moveCell, ...(ply === row.blackPly ? S.moveCellActive : {}) }}
                      >
                        {row.black}
                      </span>
                    ) : <span style={S.moveCell} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto',
    background: 'rgba(17,20,32,0.98)', border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: 16, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' },
  // Two-column body: board (left) + moves (right). Wraps on narrow screens.
  body: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  boardCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: '0 0 auto' },
  movesCol: {
    flex: '1 1 200px', minWidth: 180, alignSelf: 'stretch',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    overflow: 'hidden',
  },
  movesTitle: {
    fontSize: 12, fontWeight: 800, color: '#94a3b8', padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)', letterSpacing: 0.4,
  },
  movesScroll: { overflowY: 'auto', padding: 6, maxHeight: 420 },
  moveRow: { display: 'grid', gridTemplateColumns: '28px 1fr 1fr', alignItems: 'center', gap: 4 },
  moveNum: { fontSize: 12, color: '#64748b', textAlign: 'right', paddingRight: 4 },
  moveCell: { fontSize: 13, color: '#cbd5e1', padding: '3px 7px', borderRadius: 6, cursor: 'pointer' },
  moveCellActive: { background: 'rgba(6,182,212,0.28)', color: '#67e8f9', fontWeight: 700 },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14,
  },
};
