import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Chessboard from '../components/Chessboard';
import { motion } from 'framer-motion';

export default function MyPuzzles() {
  const navigate = useNavigate();
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api.get('/api/user-puzzles/mine')
      .then(res => setPuzzles(res.data || []))
      .catch(() => setError('Failed to load your puzzles'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Delete this position?')) return;
    try {
      await api.delete(`/api/user-puzzles/${id}`);
      setPuzzles(prev => prev.filter(p => p._id !== id));
    } catch {
      setError('Failed to delete');
    }
  }

  async function toggleVisibility(puzzle) {
    try {
      const res = await api.patch(`/api/user-puzzles/${puzzle._id}/visibility`, { isPublic: !puzzle.isPublic });
      setPuzzles(prev => prev.map(p => p._id === puzzle._id ? { ...p, isPublic: res.data.isPublic } : p));
    } catch {
      setError('Failed to update visibility');
    }
  }

  function copyShareLink(shareCode) {
    const url = `${window.location.origin}/create-position?shareCode=${shareCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(shareCode);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const cardStyle = {
    background: 'rgba(15,15,15,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '24px 20px', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Back</button>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#a5b4fc' }}>🧩 My Positions</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Your saved custom positions and puzzles</div>
          </div>
          <button
            onClick={() => navigate('/create-position')}
            style={{ marginLeft: 'auto', padding: '12px 24px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, color: '#a5b4fc', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            + Create New
          </button>
          <button
            onClick={() => navigate('/my-studies')}
            style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 12, color: '#34d399', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            📚 My Studies
          </button>
        </div>

        {error && <div style={{ color: '#f87171', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading...</div>
        ) : puzzles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', ...cardStyle }}>
            <div style={{ fontSize: 48 }}>
                <img src="/logo.png" alt="logo" style={{ width: 72, height: 72, objectFit: 'contain', opacity: 0.7 }} />
              </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc', marginTop: 14 }}>No positions yet</div>
            <div style={{ color: '#6b7280', marginTop: 8, marginBottom: 24 }}>Create your first position using the editor</div>
            <button onClick={() => navigate('/create-position')} style={{ padding: '14px 32px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, color: '#a5b4fc', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              + Create Position
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {puzzles.map((puzzle, i) => (
              <motion.div
                key={puzzle._id}
                style={cardStyle}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(99,102,241,0.15)' }}
              >
                {/* Board preview – clickable to open full view */}
                <div
                  onClick={() => navigate('/create-position', { state: { customFen: puzzle.fen } })}
                  style={{ display: 'flex', justifyContent: 'center', padding: '16px 16px 8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer', position: 'relative' }}
                  title="Click to open full view"
                >
                  <Chessboard
                    position={puzzle.fen}
                    boardWidth={200}
                    draggable={false}
                    orientation={puzzle.sideToMove === 'b' ? 'black' : 'white'}
                  />
                  <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#a5b4fc', fontWeight: 700, pointerEvents: 'none' }}>⤢ Open</div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {puzzle.title || 'Untitled Position'}
                  </div>
                  {puzzle.description && (
                    <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {puzzle.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 11, color: '#9ca3af' }}>
                      {puzzle.sideToMove === 'w' ? '♔ White moves' : '♚ Black moves'}
                    </span>
                    <span style={{ padding: '2px 8px', background: puzzle.isPublic ? 'rgba(52,211,153,0.1)' : 'rgba(107,114,128,0.1)', borderRadius: 4, fontSize: 11, color: puzzle.isPublic ? '#34d399' : '#6b7280' }}>
                      {puzzle.isPublic ? '🌐 Public' : '🔒 Private'}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>

                    <button
                      onClick={() => navigate('/create-position', { state: { customFen: puzzle.fen } })}
                      style={{ flex: 1, minWidth: 60, padding: '7px 0', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ⤢ Open
                    </button>
                    <button
                      onClick={() => navigate('/create-position', { state: { customFen: puzzle.fen } })}
                      style={{ flex: 1, minWidth: 60, padding: '7px 0', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✏ Edit
                    </button>
                    <button
                      onClick={() => copyShareLink(puzzle.shareCode)}
                      style={{ flex: 1, minWidth: 70, padding: '7px 0', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, color: '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {copiedId === puzzle.shareCode ? '✓ Copied' : '🔗 Share'}
                    </button>
                    <button
                      onClick={() => toggleVisibility(puzzle)}
                      style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}
                      title={puzzle.isPublic ? 'Make private' : 'Make public'}
                    >
                      {puzzle.isPublic ? '🔒' : '🌐'}
                    </button>
                    <button
                      onClick={() => handleDelete(puzzle._id)}
                      style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer' }}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
