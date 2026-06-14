import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const typeColors = {
  basics:     { color: '#10b981', bg: 'rgba(16,185,129,0.15)', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  positional: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
};

const UserStudyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const basePath = location.pathname.startsWith('/my-studies') ? '/my-studies' : '/public-studies';

  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const isOwner = user && study && (user.id === study.userId || user._id === study.userId);
  const tc = typeColors[study?.studyType] || typeColors.basics;

  useEffect(() => {
    const fetchStudy = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/user-studies/${id}`);
        setStudy(res.data);
        setNewName(res.data.name);
      } catch (e) {
        setError(e.response?.status === 404 ? 'Study not found' : 'Failed to load study');
      } finally {
        setLoading(false);
      }
    };
    fetchStudy();
  }, [id]);

  const handleDeleteStudy = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/user-studies/${id}`);
      navigate(basePath);
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Delete this chapter and all its positions?')) return;
    try {
      await api.delete(`/api/user-studies/${id}/chapters/${chapterId}`);
      setStudy(prev => ({ ...prev, chapters: prev.chapters.filter(c => c._id !== chapterId) }));
    } catch {}
  };

  const handleTogglePublic = async () => {
    try {
      const res = await api.patch(`/api/user-studies/${id}`, { isPublic: !study.isPublic });
      setStudy(prev => ({ ...prev, isPublic: res.data.isPublic }));
    } catch {}
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === study.name) { setEditingName(false); return; }
    setSaving(true);
    setNameError('');
    try {
      const res = await api.patch(`/api/user-studies/${id}`, { name: newName.trim() });
      setStudy(prev => ({ ...prev, name: res.data.name }));
      setEditingName(false);
    } catch (e) {
      setNameError(e.response?.status === 409 ? 'That name is already taken' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };


  if (loading) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 16 }}>
      Loading study...
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 16, color: '#f87171' }}>{error}</div>
      <button onClick={() => navigate(basePath)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>← Back to Studies</button>
    </div>
  );

  const totalPositions = study.chapters?.reduce((sum, ch) => sum + (ch.puzzles?.length ?? 0), 0) ?? 0;
  const btnBase = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(circle at 30% 20%, ${tc.bg} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <button style={btnBase} onClick={() => navigate(basePath)}>← Back</button>

          {editingName && isOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: '#f1f5f9', fontSize: 17, fontWeight: 700, outline: 'none', flex: 1 }}
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button onClick={handleSaveName} disabled={saving} style={{ background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{saving ? '...' : 'Save'}</button>
              <button onClick={() => { setEditingName(false); setNameError(''); }} style={{ ...btnBase }}>Cancel</button>
              {nameError && <span style={{ fontSize: 12, color: '#f87171' }}>{nameError}</span>}
            </div>
          ) : (
            <div
              style={{ fontSize: 22, fontWeight: 800, flex: 1, cursor: isOwner ? 'pointer' : 'default', background: tc.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              title={isOwner ? 'Click to rename' : ''}
              onClick={() => isOwner && setEditingName(true)}
            >
              {study.name} {isOwner && <span style={{ fontSize: 13, WebkitTextFillColor: '#64748b' }}>✏️</span>}
            </div>
          )}

          <span style={{ padding: '4px 12px', borderRadius: 12, background: tc.bg, color: tc.color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{study.studyType}</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>by <strong style={{ color: '#94a3b8' }}>{study.username}</strong></span>
          {isOwner && (
            <>
              <button onClick={handleTogglePublic} style={{ ...btnBase, background: study.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', border: `1px solid ${study.isPublic ? '#10b981' : '#64748b'}`, color: study.isPublic ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                {study.isPublic ? '🌐 Public' : '🔒 Private'}
              </button>
              <button onClick={() => setDeleteConfirm(true)} style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 600 }}>🗑️ Delete Study</button>
            </>
          )}
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Chapters', value: study.chapters?.length ?? 0, icon: '📚' },
            { label: 'Total Positions', value: totalPositions, icon: '♟️' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 22 }}>{stat.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: tc.color, marginTop: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chapter cards */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Select a Chapter
        </div>

        {(!study.chapters || study.chapters.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 14 }}>
            No chapters yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {study.chapters.map((ch, i) => (
              <motion.div
                key={ch._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${tc.bg}` }}
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${tc.bg}`, borderRadius: 16, padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => navigate(`${basePath}/${id}/chapter/${ch._id}`)}
              >
                {/* Accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tc.gradient, borderRadius: '16px 16px 0 0' }} />

                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8, paddingRight: isOwner ? 24 : 0 }}>{ch.name}</div>
                <div style={{ fontSize: 13, color: tc.color, fontWeight: 600 }}>
                  {ch.puzzles?.length ?? 0} position{(ch.puzzles?.length ?? 0) !== 1 ? 's' : ''}
                </div>
                {ch.puzzles?.length > 0 ? (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Click to study →</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#334155', marginTop: 6, fontStyle: 'italic' }}>No positions yet</div>
                )}

                {isOwner && (
                  <button
                    style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: 0.6 }}
                    onClick={e => { e.stopPropagation(); handleDeleteChapter(ch._id); }}
                    title="Delete chapter"
                  >✕</button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete study confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 14, padding: 24, maxWidth: 360, width: '90%', textAlign: 'center' }} initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🗑️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Delete Study?</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                This will permanently delete "<strong>{study.name}</strong>" and all its chapters and positions.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteConfirm(false)} disabled={deleting} style={{ ...btnBase, padding: '8px 18px', fontSize: 13 }}>Cancel</button>
                <button onClick={handleDeleteStudy} disabled={deleting} style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 18px', fontSize: 13, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserStudyDetailPage;
