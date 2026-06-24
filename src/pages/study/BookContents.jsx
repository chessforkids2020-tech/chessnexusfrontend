import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

// Recursive ToC entry, rendered like a real book's table of contents.
// A node with pages is a clickable readable leaf; a node with only children
// is a section header. Locked subtrees show a 🔒 and are not clickable.
function TocNode({ node, depth, bookId, locked, navigate }) {
  const isReadable = node.hasPages;
  const clickable = isReadable && !locked;
  return (
    <div style={{ marginLeft: depth * 22 }}>
      <div
        onClick={clickable ? () => navigate(`/study/books/${bookId}/node/${node._id}`) : undefined}
        style={{
          padding: '6px 0',
          cursor: clickable ? 'pointer' : 'default',
          color: locked ? '#6b7280' : (depth === 0 ? '#e5e7eb' : '#cbd5e1'),
          fontWeight: depth === 0 ? 800 : (isReadable ? 500 : 700),
          fontSize: depth === 0 ? 18 : 15,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span>{node.title}</span>
        {locked && <span title="Supporters & coaches only">🔒</span>}
        {clickable && <span style={{ color: '#34d399', fontSize: 13 }}>›</span>}
      </div>
      {(node.children || []).map(child => (
        <TocNode key={child._id} node={child} depth={depth + 1} bookId={bookId} locked={locked} navigate={navigate} />
      ))}
    </div>
  );
}

const BookContents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/books/${id}/toc`);
        setData(res.data);
      } catch { setError('Book not found'); }
    })();
  }, [id]);

  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>;
  if (!data) return <div style={styles.container}>Loading…</div>;

  const anyLocked = data.toc.some(c => c.locked);

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/study/books')}>← All books</button>
      <h1 style={styles.title}>{data.title}</h1>
      {data.author && <div style={styles.author}>by {data.author}</div>}

      <div style={styles.toc}>
        <h2 style={styles.tocHeading}>Contents</h2>
        {data.toc.map(ch => (
          <TocNode key={ch._id} node={ch} depth={0} bookId={id} locked={ch.locked} navigate={navigate} />
        ))}
      </div>

      {anyLocked && (
        <div style={styles.upsell}>
          🔒 Some chapters are unlocked for <strong>supporters</strong>, <strong>verified coaches</strong>, and <strong>elite</strong> members.
          <button style={styles.supportBtn} onClick={() => navigate('/buy-coffee')}>☕ Become a supporter</button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: 820, margin: '0 auto', padding: 24 },
  backButton: { background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 15, padding: 0, marginBottom: 8 },
  title: { fontSize: 30, color: '#e5e7eb', margin: '4px 0' },
  author: { color: '#9ca3af', fontSize: 16, marginBottom: 20, fontStyle: 'italic' },
  toc: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 26px' },
  tocHeading: { color: '#34d399', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginTop: 0 },
  error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: 6 },
  upsell: { marginTop: 20, padding: 16, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  supportBtn: { background: '#34d399', color: '#06281d', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
};

export default BookContents;
