import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const typeColors = {
  basics:     { color: 'var(--color-success)', bg: 'var(--color-success-a12)', gradient: 'linear-gradient(135deg,var(--color-success),var(--color-accent))' },
  positional: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', gradient: 'linear-gradient(135deg,#6366f1,var(--color-accent-2))' },
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
  const [addingChapter, setAddingChapter] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterError, setChapterError] = useState('');

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

  const handleAddChapter = async () => {
    if (!chapterName.trim()) { setChapterError('Chapter name is required'); return; }
    setChapterSaving(true);
    setChapterError('');
    try {
      const res = await api.post(`/api/user-studies/${id}/chapters`, { name: chapterName.trim() });
      setStudy(prev => ({ ...prev, chapters: [...(prev.chapters || []), res.data.chapter] }));
      setChapterName('');
      setAddingChapter(false);
    } catch (e) {
      setChapterError(e.response?.data?.error || 'Failed to add chapter');
    } finally {
      setChapterSaving(false);
    }
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
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 16 }}>
      Loading study...
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 16, color: 'var(--color-danger)' }}>{error}</div>
      <button onClick={() => navigate(basePath)} style={{ background: 'var(--color-white-a07)', border: '1px solid var(--color-white-a13)', color: 'var(--color-text)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>← Back to Studies</button>
    </div>
  );

  const totalPositions = study.chapters?.reduce((sum, ch) => sum + (ch.puzzles?.length ?? 0), 0) ?? 0;
  const btnBase = { background: 'var(--color-white-a07)', border: '1px solid var(--color-white-a13)', color: 'var(--color-text)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: 'var(--color-bg)', minHeight: '100vh', color: 'var(--color-text)' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(circle at 30% 20%, ${tc.bg} 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <button style={btnBase} onClick={() => navigate(basePath)}>← Back</button>

          {editingName && isOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                style={{ background: 'var(--color-white-a07)', border: '1px solid var(--color-white-a20)', borderRadius: 8, padding: '6px 12px', color: 'var(--color-text)', fontSize: 17, fontWeight: 700, outline: 'none', flex: 1 }}
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button onClick={handleSaveName} disabled={saving} style={{ background: 'var(--color-accent-2)', border: 'none', borderRadius: 8, color: 'var(--color-text)', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{saving ? '...' : 'Save'}</button>
              <button onClick={() => { setEditingName(false); setNameError(''); }} style={{ ...btnBase }}>Cancel</button>
              {nameError && <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>{nameError}</span>}
            </div>
          ) : (
            <div
              style={{ fontSize: 22, fontWeight: 800, flex: 1, cursor: isOwner ? 'pointer' : 'default', background: tc.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              title={isOwner ? 'Click to rename' : ''}
              onClick={() => isOwner && setEditingName(true)}
            >
              {study.name} {isOwner && <span style={{ fontSize: 13, WebkitTextFillColor: 'var(--color-text-faint)' }}>✏️</span>}
            </div>
          )}

          <span style={{ padding: '4px 12px', borderRadius: 12, background: tc.bg, color: tc.color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{study.studyType}</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>by <strong style={{ color: 'var(--color-text-muted)' }}>{study.username}</strong></span>
          {isOwner && (
            <>
              <button onClick={handleTogglePublic} style={{ ...btnBase, background: study.isPublic ? 'var(--color-success-a12)' : 'rgba(100,116,139,0.15)', border: `1px solid ${study.isPublic ? 'var(--color-success)' : 'var(--color-text-faint)'}`, color: study.isPublic ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                {study.isPublic ? '🌐 Public' : '🔒 Private'}
              </button>
              <button onClick={() => setDeleteConfirm(true)} style={{ ...btnBase, background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a30)', color: 'var(--color-danger)', fontWeight: 600 }}>🗑️ Delete Study</button>
            </>
          )}
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Chapters', value: study.chapters?.length ?? 0, icon: '📚' },
            { label: 'Total Positions', value: totalPositions, icon: '♟️' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 22 }}>{stat.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: tc.color, marginTop: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chapter cards */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Select a Chapter
          </div>
          {isOwner && !addingChapter && (
            <button
              onClick={() => { setAddingChapter(true); setChapterError(''); }}
              style={{ ...btnBase, background: tc.bg, border: `1px solid ${tc.color}`, color: tc.color, fontWeight: 600 }}
            >➕ Add Chapter</button>
          )}
        </div>

        {isOwner && addingChapter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              value={chapterName}
              onChange={e => { setChapterName(e.target.value); setChapterError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddChapter(); if (e.key === 'Escape') { setAddingChapter(false); setChapterName(''); setChapterError(''); } }}
              placeholder={`New chapter name (e.g. Chapter ${(study.chapters?.length ?? 0) + 1})`}
              autoFocus
              style={{ flex: 1, minWidth: 220, background: 'var(--color-white-a07)', border: '1px solid var(--color-white-a20)', borderRadius: 8, padding: '8px 12px', color: 'var(--color-text)', fontSize: 14, outline: 'none' }}
            />
            <button onClick={handleAddChapter} disabled={chapterSaving} style={{ background: 'var(--color-accent-2)', border: 'none', borderRadius: 8, color: 'var(--color-text)', padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: chapterSaving ? 0.6 : 1 }}>{chapterSaving ? '...' : 'Add'}</button>
            <button onClick={() => { setAddingChapter(false); setChapterName(''); setChapterError(''); }} style={{ ...btnBase }}>Cancel</button>
            {chapterError && <span style={{ fontSize: 12, color: 'var(--color-danger)', width: '100%' }}>{chapterError}</span>}
          </div>
        )}

        {(!study.chapters || study.chapters.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)', fontSize: 14 }}>
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
                style={{ background: 'var(--color-white-a04)', border: `1px solid ${tc.bg}`, borderRadius: 16, padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => navigate(`${basePath}/${id}/chapter/${ch._id}`)}
              >
                {/* Accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tc.gradient, borderRadius: '16px 16px 0 0' }} />

                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, paddingRight: isOwner ? 24 : 0 }}>{ch.name}</div>
                <div style={{ fontSize: 13, color: tc.color, fontWeight: 600 }}>
                  {ch.puzzles?.length ?? 0} position{(ch.puzzles?.length ?? 0) !== 1 ? 's' : ''}
                </div>
                {ch.puzzles?.length > 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 6 }}>Click to study →</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#334155', marginTop: 6, fontStyle: 'italic' }}>No positions yet</div>
                )}

                {isOwner && (
                  <button
                    style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: 0.6 }}
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
          <motion.div style={{ position: 'fixed', inset: 0, background: 'var(--color-black-a65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-danger-a30)', borderRadius: 14, padding: 24, maxWidth: 360, width: '90%', textAlign: 'center' }} initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🗑️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Delete Study?</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                This will permanently delete "<strong>{study.name}</strong>" and all its chapters and positions.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteConfirm(false)} disabled={deleting} style={{ ...btnBase, padding: '8px 18px', fontSize: 13 }}>Cancel</button>
                <button onClick={handleDeleteStudy} disabled={deleting} style={{ ...btnBase, background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a30)', color: 'var(--color-danger)', padding: '8px 18px', fontSize: 13, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserStudyDetailPage;
