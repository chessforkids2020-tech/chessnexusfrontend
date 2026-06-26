import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import api from '../../api';
import Chessboard from '../../components/Chessboard';

// One interactive board block: shows the authored position, lets the user play
// any legal move (free exploration); "Reset" restores the diagram. Each board
// on the page has its own independent state.
function BoardBlock({ block }) {
  const [chess, setChess] = useState(() => {
    try { return new Chess(block.fen); } catch { return new Chess(); }
  });
  const reset = useCallback(() => {
    try { setChess(new Chess(block.fen)); } catch { setChess(new Chess()); }
  }, [block.fen]);
  useEffect(() => { reset(); }, [reset]);

  const onMove = useCallback((from, to) => {
    try {
      const next = new Chess(chess.fen());
      const mv = next.move({ from, to, promotion: 'q' });
      if (!mv) return false;
      setChess(next);
      return true;
    } catch { return false; }
  }, [chess]);

  return (
    <div style={styles.boardBlock}>
      {block.diagramLabel && <div style={styles.diagramLabel}>{block.diagramLabel}</div>}
      <Chessboard
        position={chess.fen()}
        onDrop={onMove}
        boardWidth={340}
        draggable={true}
        showCoordinates={true}
        orientation={block.orientation || 'white'}
      />
      {block.caption && <div style={styles.caption}>{block.caption}</div>}
      <button style={styles.resetBtn} onClick={reset}>↺ Reset position</button>
    </div>
  );
}

// Reads one leaf node's pages, flipping Next/Prev. Each page is an ordered
// stack of blocks (text / board) rendered top-to-bottom, like a book page.
const BookReader = () => {
  const { id, nodeId } = useParams();
  const navigate = useNavigate();

  const [node, setNode] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/books/${id}/node/${nodeId}`);
        setNode(res.data);
        setPageIdx(0);
      } catch (err) {
        if (err.response?.status === 403) setLocked(true);
        else setError('Could not load this section');
      }
    })();
  }, [id, nodeId]);

  // Scroll to top when flipping pages.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [pageIdx]);

  const pages = node?.pages || [];
  const page = pages[pageIdx] || null;

  if (locked) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate(`/study/books/${id}`)}>← Contents</button>
        <div style={styles.paywall}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ color: '#34d399', margin: '12px 0 6px' }}>This chapter is locked</h2>
          <p style={{ color: '#cbd5e1', maxWidth: 460, textAlign: 'center' }}>
            Chapter 1 is free for everyone. To read the rest, <strong>unlock the whole book with your XP</strong>,
            or get it free as a supporter, verified coach, or elite member.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            <button style={styles.xpBtn} onClick={() => navigate(`/study/books/${id}`)}>👛 Unlock with XP</button>
            <button style={styles.supportBtn} onClick={() => navigate('/buy-coffee')}>☕ Become a supporter</button>
          </div>
        </div>
      </div>
    );
  }
  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>;
  if (!node) return <div style={styles.container}>Loading…</div>;

  if (pages.length === 0) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate(`/study/books/${id}`)}>← Contents</button>
        <h1 style={styles.title}>{node.title}</h1>
        <p style={{ color: '#9ca3af' }}>This section has sub-topics — open them from the contents page.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backButton} onClick={() => navigate(`/study/books/${id}`)}>← Contents</button>
        <div style={styles.nodeTitle}>{node.title}</div>
        <div style={styles.pageInfo}>Page {pageIdx + 1} / {pages.length}</div>
      </div>

      {/* The page: blocks rendered top-to-bottom, like a real book page. */}
      <div style={styles.page}>
        {(page.blocks || []).map((block) => (
          block.type === 'board'
            ? <BoardBlock key={block._id} block={block} />
            : <div key={block._id} style={styles.prose} dangerouslySetInnerHTML={{ __html: block.contentHtml }} />
        ))}
        {(page.blocks || []).length === 0 && <div style={{ color: '#9ca3af' }}>This page is empty.</div>}
      </div>

      <div style={styles.nav}>
        <button style={styles.navBtn} onClick={() => setPageIdx(i => Math.max(0, i - 1))} disabled={pageIdx <= 0}>← Previous</button>
        <span style={styles.pageInfo}>{pageIdx + 1} / {pages.length}</span>
        <button style={styles.navBtn} onClick={() => setPageIdx(i => Math.min(pages.length - 1, i + 1))} disabled={pageIdx >= pages.length - 1}>Next →</button>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: 760, margin: '0 auto', padding: 20 },
  topBar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  backButton: { background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 15, padding: 0 },
  nodeTitle: { flex: 1, fontWeight: 800, color: '#e5e7eb', fontSize: 18 },
  pageInfo: { color: '#9ca3af', fontSize: 14 },
  title: { fontSize: 26, color: '#e5e7eb' },
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  prose: { color: '#d1d5db', lineHeight: 1.7, fontSize: 16 },
  boardBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0' },
  diagramLabel: { color: '#34d399', fontWeight: 700 },
  caption: { color: '#cbd5e1', fontStyle: 'italic', fontSize: 14, textAlign: 'center' },
  resetBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  navBtn: { background: '#34d399', color: '#06281d', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  paywall: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 },
  supportBtn: { marginTop: 16, background: '#34d399', color: '#06281d', border: 'none', padding: '12px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16 },
  xpBtn: { marginTop: 16, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 16 },
  error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: 6 },
};

export default BookReader;
