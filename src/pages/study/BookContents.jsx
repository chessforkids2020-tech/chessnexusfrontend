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
          color: locked ? 'var(--color-text-faint)' : (depth === 0 ? 'var(--color-text)' : 'var(--color-text-muted)'),
          fontWeight: depth === 0 ? 800 : (isReadable ? 500 : 700),
          fontSize: depth === 0 ? 18 : 15,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span>{node.title}</span>
        {locked && <span title="Supporters & coaches only">🔒</span>}
        {clickable && <span style={{ color: 'var(--color-success)', fontSize: 13 }}>›</span>}
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
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/api/books/${id}/toc`);
      setData(res.data);
    } catch { setError('Book not found'); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setUnlockErr('');
    try {
      await api.post(`/api/books/${id}/unlock`);
      await load();             // refresh: chapters now unlocked, wallet reduced
    } catch (e) {
      const d = e?.response?.data;
      if (d?.shortfall) setUnlockErr(`Not enough XP — you need ${d.shortfall} more.`);
      else setUnlockErr(d?.message || 'Could not unlock this book.');
    } finally {
      setUnlocking(false);
    }
  };

  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>;
  if (!data) return <div style={styles.container}>Loading…</div>;

  const anyLocked = data.toc.some(c => c.locked);
  const xpPrice = data.xpPrice || 0;
  const walletXp = data.walletXp || 0;
  // Offer the XP unlock when the book is XP-gated, the user hasn't unlocked it,
  // and isn't already privileged (admin/elite/coach/supporter).
  const canBuyWithXp = anyLocked && xpPrice > 0 && !data.unlocked && !data.privileged;
  const canAfford = walletXp >= xpPrice;

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/study/books')}>← All books</button>
      <h1 style={styles.title}>
        {data.title}
        {data.freeForAll && <span style={styles.freeBadge}>FREE</span>}
        {data.unlocked && <span style={styles.unlockedBadge}>👛 Unlocked</span>}
      </h1>
      {data.author && <div style={styles.author}>by {data.author}</div>}

      <div style={styles.toc}>
        <h2 style={styles.tocHeading}>Contents</h2>
        {data.toc.map(ch => (
          <TocNode key={ch._id} node={ch} depth={0} bookId={id} locked={ch.locked} navigate={navigate} />
        ))}
      </div>

      {anyLocked && (
        <div style={styles.upsell}>
          {canBuyWithXp ? (
            <>
              <div style={{ flex: '1 1 240px' }}>
                🔒 Unlock all chapters of this book.
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Spend <strong style={{ color: 'var(--color-accent-2)' }}>{xpPrice} XP</strong> from your wallet
                  {' '}(you have <strong style={{ color: canAfford ? 'var(--color-success)' : 'var(--color-danger)' }}>{walletXp} XP</strong>)
                  {' '}— or get it free as a supporter, coach, or elite member.
                </div>
                {unlockErr && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-danger)' }}>{unlockErr}</div>}
              </div>
              <button
                style={{ ...styles.xpBtn, ...(canAfford ? {} : styles.xpBtnDisabled) }}
                disabled={!canAfford || unlocking}
                onClick={handleUnlock}
              >
                {unlocking ? 'Unlocking…' : (canAfford ? `👛 Unlock for ${xpPrice} XP` : `Need ${xpPrice - walletXp} more XP`)}
              </button>
              <button style={styles.supportBtn} onClick={() => navigate('/buy-coffee')}>☕ Become a supporter</button>
            </>
          ) : (
            <>
              🔒 Some chapters are unlocked for <strong>supporters</strong>, <strong>verified coaches</strong>, and <strong>elite</strong> members.
              <button style={styles.supportBtn} onClick={() => navigate('/buy-coffee')}>☕ Become a supporter</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: 820, margin: '0 auto', padding: 24 },
  backButton: { background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', fontSize: 15, padding: 0, marginBottom: 8 },
  title: { fontSize: 30, color: 'var(--color-text)', margin: '4px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  freeBadge: { background: 'var(--color-success)', color: 'var(--color-text)', fontSize: 13, fontWeight: 800, letterSpacing: 0.5, padding: '3px 10px', borderRadius: 'var(--radius-sm)', verticalAlign: 'middle' },
  author: { color: 'var(--color-text-muted)', fontSize: 16, marginBottom: 20, fontStyle: 'italic' },
  toc: { background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)', borderRadius: 'var(--radius-lg)', padding: '20px 26px' },
  tocHeading: { color: 'var(--color-success)', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginTop: 0 },
  error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: 'var(--radius-sm)' },
  upsell: { marginTop: 20, padding: 16, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  supportBtn: { background: 'var(--color-success)', color: '#06281d', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 700 },
  xpBtn: { background: 'linear-gradient(135deg, var(--color-accent-2), var(--color-accent))', color: 'var(--color-text)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap' },
  xpBtnDisabled: { background: 'var(--color-border-strong)', color: 'var(--color-text-muted)', cursor: 'not-allowed' },
  unlockedBadge: { background: 'rgba(124,58,237,0.18)', color: 'var(--color-accent-2)', border: '1px solid rgba(124,58,237,0.4)', fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-sm)', verticalAlign: 'middle' },
};

export default BookContents;
