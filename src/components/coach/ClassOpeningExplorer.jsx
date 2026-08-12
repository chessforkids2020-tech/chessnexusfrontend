// src/components/coach/ClassOpeningExplorer.jsx
//
// Opening explorer for the live classroom stage. Shows how masters continued
// from the position on the class board: each candidate next move with how often
// it was played and how it scored.
//
// COACH-ONLY, and off by default — same rule as the classroom's Stockfish panel.
// A coach asking "what would you play here?" does not want the answer sitting on
// every student's screen. This renders inside the host's own column, so it is
// never part of the shared board state that goes out over the socket.
//
// Data comes from the EXISTING GET /api/master-games/explorer, which takes the
// move prefix as SAN tokens and returns { total, moves[], games[] }. No new
// endpoint, and it queries your own master-games collection rather than an
// external service.
import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function ClassOpeningExplorer({ sanPrefix, enabled, onToggle, onPlayMove, canPlay }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refetch whenever the class board moves. The prefix is joined into a string
  // so the effect compares by value rather than array identity.
  const prefixKey = (sanPrefix || []).join(',');

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    setError('');
    api.get('/api/master-games/explorer', { params: { moves: prefixKey, limit: 12 } })
      .then(r => { if (alive) setData(r.data); })
      .catch(() => { if (alive) { setData(null); setError('Could not load the explorer.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [enabled, prefixKey]);

  const total = data?.total || 0;
  const moves = data?.moves || [];

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.title}>📖 Opening explorer</span>
        <button
          type="button"
          style={enabled ? S.toggleOn : S.toggle}
          onClick={onToggle}
          title={enabled ? 'Hide the explorer' : 'Show how masters continued from this position'}
        >
          {enabled ? '✓ On' : 'Off'}
        </button>
      </div>

      {!enabled ? (
        <div style={S.hint}>
          Only you see this. Turn it on to see how masters continued from the position
          on the board.
        </div>
      ) : loading && !data ? (
        <div style={S.hint}>Loading…</div>
      ) : error ? (
        <div style={S.hint}>{error}</div>
      ) : moves.length === 0 ? (
        <div style={S.hint}>
          No master games reached this position — you are out of the book.
        </div>
      ) : (
        <>
          <div style={S.total}>{total.toLocaleString()} master games</div>
          <div style={S.list}>
            {moves.map(m => {
              // The API returns the per-move total as `games` (verified against
              // routes/masterGames.js — it is NOT `count`). Turn it into a share
              // of the games that reached this position so the bar is comparable
              // move to move.
              const played = m.games || 0;
              const share = total > 0 ? Math.round((played / total) * 100) : 0;
              const w = m.white || 0, d = m.draw || 0, b = m.black || 0;
              const n = w + d + b || 1;
              return (
                <div key={m.san} style={S.row}>
                  <button
                    type="button"
                    style={{ ...S.san, cursor: canPlay ? 'pointer' : 'default' }}
                    onClick={() => canPlay && onPlayMove?.(m.san)}
                    title={canPlay ? `Play ${m.san} on the class board` : 'Take control of the board to play a move'}
                    disabled={!canPlay}
                  >
                    {m.san}
                  </button>
                  <span style={S.share}>{share}%</span>
                  {/* White / draw / black split for this move. */}
                  <span style={S.bar}>
                    <span style={{ ...S.seg, width: `${(w / n) * 100}%`, background: '#e8e8e8' }} />
                    <span style={{ ...S.seg, width: `${(d / n) * 100}%`, background: '#8b8b8b' }} />
                    <span style={{ ...S.seg, width: `${(b / n) * 100}%`, background: '#2f2f2f' }} />
                  </span>
                  <span style={S.count}>{played.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  wrap: {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-lg)',
    padding: '10px 12px',
    marginTop: 10,
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: 800, color: '#e6e8ee' },
  toggle: {
    padding: '4px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
  },
  toggleOn: {
    padding: '4px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
    border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.16)', color: '#6ee7b7',
  },
  hint: { fontSize: 11.5, lineHeight: 1.55, color: '#94a3b8' },
  total: { fontSize: 11, color: '#94a3b8', marginBottom: 6 },
  list: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  san: {
    flex: '0 0 58px', textAlign: 'left', padding: '3px 6px', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
    color: '#e6e8ee', fontSize: 12.5, fontWeight: 700, fontFamily: 'monospace',
  },
  share: { flex: '0 0 34px', fontSize: 11.5, fontWeight: 700, color: '#cbd5e1', textAlign: 'right' },
  bar: { flex: '1 1 auto', display: 'flex', height: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', minWidth: 40 },
  seg: { display: 'block', height: '100%' },
  count: { flex: '0 0 auto', fontSize: 10.5, color: '#64748b', minWidth: 42, textAlign: 'right' },
};
