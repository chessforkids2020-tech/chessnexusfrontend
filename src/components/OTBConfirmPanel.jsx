import React, { useState } from 'react';
import Chessboard from './Chessboard';
import './OTBConfirmPanel.css';

// First N ambiguous moves in a cluster are shown WITH a chessboard
const BOARD_LIMIT = 2;
// Next M are shown as text-only quick-fix rows
const QUICK_LIMIT = 3;
// Moves whose sequential indices differ by more than this start a new cluster
const CLUSTER_GAP = 6;

/**
 * Groups the ambiguous moves array into clusters.
 * Moves close together in the game (index gap ≤ CLUSTER_GAP) form one cluster.
 * Each cluster is handled as a single "screen" so the user isn't asked about
 * every single move — only the next cluster of issues.
 */
function buildClusters(ambiguous) {
  if (!ambiguous.length) return [];
  const sorted = [...ambiguous].sort((a, b) => a.index - b.index);
  const clusters = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].index - sorted[i - 1].index <= CLUSTER_GAP) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);
  return clusters;
}

export default function OTBConfirmPanel({ scanResult, onConfirm, onCancel, submitting }) {
  const { ambiguous = [], confirmedMoves = 0, totalMoves = 0 } = scanResult || {};
  const [clusterIdx, setClusterIdx] = useState(0);
  const [resolved, setResolved]     = useState({});

  if (ambiguous.length === 0) return null;

  const clusters      = buildClusters(ambiguous);
  const cluster       = clusters[clusterIdx];
  const isLastCluster = clusterIdx === clusters.length - 1;
  const totalClusters = clusters.length;

  // Visible moves: first BOARD_LIMIT with chessboard, next QUICK_LIMIT text-only
  const shown       = cluster.slice(0, BOARD_LIMIT + QUICK_LIMIT);
  const withBoard   = shown.slice(0, BOARD_LIMIT);
  const withoutBoard = shown.slice(BOARD_LIMIT);

  function handleChange(index, value) {
    setResolved(prev => ({ ...prev, [index]: value }));
  }

  function getValue(m) {
    return resolved[m.index] ?? m.suspectedSan ?? '';
  }

  // All shown moves must have a non-empty value before proceeding
  const canProceed = shown.every(m => getValue(m).trim().length > 0);

  function handleContinue() {
    if (isLastCluster) {
      // Build final list; silently fall back to suspectedSan for any unseen moves
      const all = ambiguous
        .map(m => ({ index: m.index, san: (resolved[m.index] || m.suspectedSan || '').trim() }))
        .filter(r => r.san);
      onConfirm(all);
    } else {
      setClusterIdx(c => c + 1);
    }
  }

  function handleBack() {
    if (clusterIdx > 0) setClusterIdx(c => c - 1);
  }

  // Progress percentage across clusters
  const progressPct = ((clusterIdx + 1) / totalClusters) * 100;

  return (
    <div className="otb-confirm-card">
      {/* Progress bar */}
      <div className="otb-confirm-progress">
        <div className="otb-confirm-progress-bar">
          <div className="otb-confirm-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="otb-confirm-progress-label">
          {totalClusters === 1
            ? `${shown.length} unclear move${shown.length !== 1 ? 's' : ''} — please correct below`
            : `Issue group ${clusterIdx + 1} of ${totalClusters}`}
        </span>
      </div>

      {/* ── Moves shown WITH chessboard ── */}
      {withBoard.map((m, i) => (
        <div key={m.index} className="otb-confirm-block">
          <div className="otb-confirm-move-title">
            ⚠️ Move {m.moveNumber}{m.side === 'white' ? '.' : '...'}&nbsp;
            <span className="otb-confirm-side-badge">{m.side}</span>
            <span className="otb-confirm-scanned">
              {' '}— scanned as <code>{m.rawText || m.suspectedSan || '?'}</code>
            </span>
          </div>
          <div className="otb-confirm-row-body">
            {m.fenBefore && (
              <div className="otb-confirm-board">
                <Chessboard
                  position={m.fenBefore}
                  orientation={m.side === 'white' ? 'white' : 'black'}
                  draggable={false}
                  boardWidth={200}
                  showCoordinates={true}
                />
              </div>
            )}
            <div className="otb-confirm-controls">
              <label className="otb-confirm-label">
                {m.fenBefore ? 'Correct move for this position:' : 'Correct move (position unknown):'}
              </label>
              <input
                className="otb-confirm-input"
                type="text"
                placeholder="e.g. Nf3, exd5, O-O, O-O-O"
                value={getValue(m)}
                onChange={e => handleChange(m.index, e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoFocus={i === 0}
              />
              <div className="otb-confirm-hint">
                Standard notation. Captures: Bxe5. Castling: O-O or O-O-O.
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── Upcoming moves — text-only quick fix ── */}
      {withoutBoard.length > 0 && (
        <div className="otb-confirm-quick-section">
          <div className="otb-confirm-quick-label">Upcoming unclear moves — quick fix:</div>
          {withoutBoard.map(m => (
            <div key={m.index} className="otb-confirm-quick-row">
              <span className="otb-confirm-quick-num">
                {m.moveNumber}{m.side === 'white' ? '.' : '...'}
              </span>
              <span className="otb-confirm-quick-raw">
                <code>{m.rawText || m.suspectedSan || '?'}</code>
              </span>
              <input
                className="otb-confirm-quick-input"
                type="text"
                placeholder="correct move"
                value={getValue(m)}
                onChange={e => handleChange(m.index, e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="otb-confirm-actions">
        <button
          type="button"
          className="otb-confirm-cancel"
          onClick={clusterIdx === 0 ? onCancel : handleBack}
          disabled={submitting}
        >
          {clusterIdx === 0 ? 'Cancel' : '← Back'}
        </button>
        <button
          type="button"
          className="otb-confirm-submit"
          onClick={handleContinue}
          disabled={!canProceed || submitting}
        >
          {submitting
            ? 'Analysing…'
            : isLastCluster
              ? 'Analyse Game →'
              : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
