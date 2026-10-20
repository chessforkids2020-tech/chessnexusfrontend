// AdminPuzzleBoardEditor — build a study puzzle on the board instead of typing it.
//
// Same workflow a user gets when creating positions in their own study:
//   1. Position — set it up with the board editor (or paste a FEN).
//   2. Moves    — play the solution on a real board. Going back and playing a
//                 different move adds a sideline; click a move to add a comment,
//                 which sits right after that move.
//
// The result is saved as ONE solution in the text format the student view
// already reads (utils/solutionLine): "1. e4 {comment} e5 (1... c5 2. Nf3)".
// Nothing changes on the student side or the backend.
//
// Controlled by the parent form: `onChange({ puzzleFen, pgn })` fires whenever
// the position or the moves change.

import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import EditableBoard from '../../components/PositionEditor/EditableBoard';
import PieceSelector from '../../components/PositionEditor/PieceSelector';
import SetupControls from '../../components/PositionEditor/SetupControls';
import FenBar from '../../components/PositionEditor/FenBar';
import StudyMovesCard from '../../components/StudyMovesCard';
import { useAnalysisTree } from '../../hooks/useAnalysisTree';
import { formatSolutionTree, parseSolutionsForBoard } from '../../utils/solutionLine';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

// Exactly one king each and chess.js accepts it as a playable position.
function positionError(fen) {
  let c;
  try { c = new Chess(fen, { skipValidation: true }); } catch { return 'Invalid FEN'; }
  let wk = 0, bk = 0;
  for (const row of c.board()) for (const sq of row) {
    if (sq?.type === 'k') (sq.color === 'w' ? wk++ : bk++);
  }
  if (wk !== 1) return 'White must have exactly 1 king';
  if (bk !== 1) return 'Black must have exactly 1 king';
  try { new Chess(fen); } catch (e) { return `Not a legal position: ${e.message}`; }
  return null;
}

const card = {
  background: 'var(--color-black-a20)', border: '1px solid var(--color-white-a07)',
  borderRadius: 'var(--radius-lg)', padding: 16,
};
const smallBtn = (primary) => ({
  padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  border: primary ? '1px solid var(--color-accent)' : '1px solid var(--color-white-a13)',
  background: primary ? 'var(--color-accent-a20)' : 'var(--color-white-a04)',
  color: primary ? 'var(--color-accent)' : 'var(--color-text-muted)',
});

export default function AdminPuzzleBoardEditor({ initialFen, initialSolutions, onChange }) {
  const startFen = initialFen && !positionError(initialFen) ? new Chess(initialFen).fen() : START_FEN;
  const hasSavedMoves = (initialSolutions || []).some(s => (s?.pgn || '').trim());

  // Editing a puzzle that already has a position + moves opens on the moves.
  const [step, setStep] = useState(initialFen && hasSavedMoves ? 'moves' : 'position');
  const [editorChess, setEditorChess] = useState(() => new Chess(startFen, { skipValidation: true }));
  const [selectedPiece, setSelectedPiece] = useState(undefined);
  const [orientation, setOrientation] = useState(() => (startFen.split(' ')[1] === 'b' ? 'black' : 'white'));
  const [puzzleFen, setPuzzleFen] = useState(startFen);
  const [commentFor, setCommentFor] = useState(null);
  const [commentText, setCommentText] = useState('');

  const analysis = useAnalysisTree(startFen);

  // Load the saved moves once.
  useEffect(() => {
    analysis.load(startFen, parseSolutionsForBoard(startFen, initialSolutions) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Report the current position + moves to the parent form.
  const pgn = useMemo(() => formatSolutionTree(analysis.tree).trim(), [analysis.tree]);
  useEffect(() => { onChange?.({ puzzleFen, pgn }); }, [puzzleFen, pgn]); // eslint-disable-line react-hooks/exhaustive-deps

  const editorFen = editorChess.fen();
  const editorErr = positionError(editorFen);

  const setEditorFen = (fen) => {
    try { setEditorChess(new Chess(fen, { skipValidation: true })); } catch { /* ignore bad FEN while typing */ }
  };

  const goToMoves = () => {
    if (editorErr) return;
    const fen = new Chess(editorFen).fen();
    if (fen !== puzzleFen) {
      if (analysis.hasMoves && !window.confirm('The position changed — the recorded moves will be cleared. Continue?')) return;
      analysis.load(fen, null);
      setPuzzleFen(fen);
    }
    setOrientation(fen.split(' ')[1] === 'b' ? 'black' : 'white');
    setCommentFor(null);
    setStep('moves');
  };

  const backToPosition = () => {
    setEditorFen(puzzleFen);
    setCommentFor(null);
    setStep('position');
  };

  const handleMove = (from, to, promotion) =>
    !!analysis.playMove({ from, to, promotion: promotion || 'q' });

  const moveToEnd = () => {
    let id = analysis.tree.currentId;
    while (analysis.tree.nodes[id]?.children?.length) id = analysis.tree.nodes[id].children[0];
    analysis.goTo(id);
  };

  const moveLabel = (nid) => {
    const n = analysis.tree.nodes[nid];
    if (!n?.parentId) return 'the start';
    const parts = analysis.tree.nodes[n.parentId].fen.split(' ');
    return `${parseInt(parts[5], 10) || 1}${parts[1] === 'w' ? '.' : '…'} ${n.san}`;
  };
  const startComment = (nid = analysis.tree.currentId) => {
    if (nid !== analysis.tree.currentId) analysis.goTo(nid);
    setCommentFor(nid);
    setCommentText(analysis.tree.nodes[nid]?.comment || '');
  };
  const saveComment = () => {
    analysis.setComment(commentFor, commentText);
    setCommentFor(null);
  };
  const deleteFromHere = () => {
    const nid = analysis.tree.currentId;
    if (nid === analysis.tree.rootId) return;
    if (!window.confirm('Delete this move and everything after it?')) return;
    analysis.deleteFrom(nid);
  };
  const clearAll = () => {
    if (!window.confirm('Delete all recorded moves?')) return;
    analysis.load(puzzleFen, null);
    setCommentFor(null);
  };

  // Keyboard ← → to step through the moves (not while typing).
  useEffect(() => {
    if (step !== 'moves') return undefined;
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); analysis.back(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); analysis.forward(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, analysis]);

  const boardW = Math.min(420, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 60);
  const stepPill = (id, label) => (
    <span style={{
      padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700,
      background: step === id ? 'var(--color-accent-a20)' : 'transparent',
      color: step === id ? 'var(--color-accent)' : 'var(--color-text-faint)',
      border: `1px solid ${step === id ? 'var(--color-accent-a40)' : 'var(--color-white-a07)'}`,
    }}>{label}</span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="admin-puzzle-board-editor">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {stepPill('position', '1 · Set up position')}
        <span style={{ color: 'var(--color-text-faint)' }}>→</span>
        {stepPill('moves', '2 · Play the solution')}
      </div>

      {step === 'position' ? (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <EditableBoard chess={editorChess} selectedPiece={selectedPiece} onFenChange={setEditorFen}
              orientation={orientation} boardWidth={boardW} />
            <FenBar fen={editorFen} onFenChange={setEditorFen} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={{ ...smallBtn(false), flex: 1 }} onClick={() => setEditorFen(START_FEN)}>Start</button>
              <button type="button" style={{ ...smallBtn(false), flex: 1 }} onClick={() => setEditorFen(EMPTY_FEN)}>Empty</button>
              <button type="button" style={{ ...smallBtn(false), flex: 1 }} onClick={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))}>⇅ Flip</button>
            </div>
          </div>
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <PieceSelector selectedPiece={selectedPiece} onSelectPiece={setSelectedPiece} />
            <SetupControls chess={editorChess} onFenChange={setEditorFen} orientation={orientation}
              onFlipOrientation={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))} />
            <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
              Pick a piece and click squares to place it, or paste a FEN in the box under the board.
              Set whose turn it is above.
            </div>
            {editorErr && <div style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>⚠️ {editorErr}</div>}
            <button type="button" style={{ ...smallBtn(true), alignSelf: 'flex-start', padding: '10px 18px', opacity: editorErr ? 0.5 : 1, cursor: editorErr ? 'not-allowed' : 'pointer' }}
              disabled={!!editorErr} onClick={goToMoves}>
              Next: play the solution ▶
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <Chessboard position={analysis.current?.fen || puzzleFen} onDrop={handleMove} boardWidth={boardW}
              draggable orientation={orientation}
              lastMove={analysis.current?.from ? { from: analysis.current.from, to: analysis.current.to } : null} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={{ ...smallBtn(false), flex: 1 }} onClick={backToPosition}>◀ Edit position</button>
              <button type="button" style={{ ...smallBtn(false), flex: 1 }} onClick={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))}>⇅ Flip</button>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <StudyMovesCard
              tree={analysis.tree}
              currentId={analysis.tree.currentId}
              accentColor="var(--color-accent)"
              onSelect={(nid) => analysis.goTo(nid)}
              onComment={startComment}
              onFirst={() => analysis.toStart()}
              onPrev={() => analysis.back()}
              onNext={() => analysis.forward()}
              onLast={moveToEnd}
              emptyText="Play the solution on the board. Go back and play a different move to add a sideline."
              footExtra={analysis.hasMoves ? (
                <span style={{ display: 'flex', gap: 8 }}>
                  {analysis.tree.currentId !== analysis.tree.rootId && (
                    <button type="button" style={{ ...smallBtn(false), padding: '3px 10px', fontSize: 11 }} onClick={deleteFromHere}>Delete from here</button>
                  )}
                  <button type="button" style={{ ...smallBtn(false), padding: '3px 10px', fontSize: 11 }} onClick={clearAll}>Clear all</button>
                </span>
              ) : null}
            />

            {/* Comment on the selected move — shown right after that move. */}
            <div style={card} data-testid="admin-comment-box">
              {commentFor && analysis.tree.nodes[commentFor] ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 6 }}>
                    Comment after <strong style={{ color: 'var(--color-text-muted)' }}>{moveLabel(commentFor)}</strong>
                  </div>
                  <textarea autoFocus rows={3} value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveComment(); } }}
                    placeholder="e.g. The knight forks king and queen."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-black-a35)', border: '1px solid var(--color-white-a13)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" style={smallBtn(true)} onClick={saveComment}>✓ Save comment</button>
                    <button type="button" style={smallBtn(false)} onClick={() => setCommentFor(null)}>Cancel</button>
                  </div>
                </>
              ) : analysis.tree.currentId === analysis.tree.rootId ? (
                <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
                  💬 To add a comment, click a move in the list (or play one) — the comment appears right after that move.
                </div>
              ) : (
                <button type="button" style={smallBtn(false)} onClick={() => startComment()}>
                  💬 {analysis.current?.comment ? 'Edit comment' : 'Comment'} on {moveLabel(analysis.tree.currentId)}
                </button>
              )}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', fontFamily: 'monospace', wordBreak: 'break-word' }}
              title="What will be saved" data-testid="admin-pgn-preview">
              {pgn || '— no moves yet —'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
