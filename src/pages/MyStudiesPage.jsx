import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';

const typeColors = {
  basics:     { color: 'var(--color-success)', bg: 'var(--color-success-a12)', gradient: 'linear-gradient(135deg,var(--color-accent-2),var(--color-accent))' },
  positional: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', gradient: 'linear-gradient(135deg,#6366f1,var(--color-accent-2))' },
  other:      { color: 'var(--color-warning)', bg: 'var(--color-warning-a12)', gradient: 'linear-gradient(135deg,var(--color-warning),var(--color-danger))' },
};

export default function MyStudiesPage() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'private' | 'public'

  // ── Import a public Lichess study ──
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importName, setImportName] = useState('');
  // Lichess has two levels (study → chapter); we have three. A Lichess chapter
  // is one board with one line — a POSITION here — so the whole Lichess study
  // lands as ONE chapter and the coach names both.
  const [importChapter, setImportChapter] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState('');
  const [importOk, setImportOk] = useState('');

  const loadStudies = () => api.get('/api/user-studies/mine')
    .then(res => setStudies(res.data || []))
    .catch(() => setError('Failed to load your studies'))
    .finally(() => setLoading(false));

  const runImport = async () => {
    setImportErr(''); setImportOk(''); setImportBusy(true);
    try {
      const r = await api.post('/api/user-studies/import/lichess', {
        url: importUrl.trim(),
        name: importName.trim() || undefined,
        chapterName: importChapter.trim() || undefined,
      });
      setImportOk(`✓ Imported “${r.data.name}” — chapter “${r.data.chapter}” with ${r.data.positions} position(s).`);
      setImportUrl(''); setImportName(''); setImportChapter('');
      await loadStudies();
      // Jump into the freshly imported study after a beat so they see it.
      setTimeout(() => { setImportOpen(false); setImportOk(''); }, 1400);
    } catch (e) {
      setImportErr(e.response?.data?.error || 'Could not import that study.');
    } finally { setImportBusy(false); }
  };

  useEffect(() => {
    api.get('/api/user-studies/mine')
      .then(res => setStudies(res.data || []))
      .catch(() => setError('Failed to load your studies'))
      .finally(() => setLoading(false));
  }, []);

  const displayed = studies.filter(s => {
    if (filter === 'private') return !s.isPublic;
    if (filter === 'public') return s.isPublic;
    return true;
  });

  const cardStyle = {
    background: 'rgba(15,15,15,0.8)',
    border: '1px solid var(--color-white-a07)',
    borderRadius: 'var(--radius-xl)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
  };

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '24px 20px', fontFamily: "'Segoe UI', sans-serif", color: 'var(--color-text)' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 20%, rgba(99,102,241,0.08) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a10)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-accent-2)' }}>📚 My Studies</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-faint)', marginTop: 2 }}>Your private &amp; public position studies</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setImportOpen(true); setImportErr(''); setImportOk(''); }}
              style={{ padding: '12px 20px', background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.4)', borderRadius: 'var(--radius-lg)', color: '#5eead4', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              ♞ Import from Lichess
            </button>
            <button
              onClick={() => navigate('/create-position')}
              style={{ padding: '12px 22px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              + Add Position
            </button>
          </div>
        </div>

        {/* Import-from-Lichess modal */}
        {importOpen && (
          <div
            onClick={() => !importBusy && setImportOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,12,0.72)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 9500, padding: 16 }}
          >
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#0f1520', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 'var(--radius-xl)', padding: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#5eead4', marginBottom: 6 }}>♞ Import a Lichess study</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                Paste a <b>public</b> (or unlisted) Lichess study link. It becomes <b>one study with one chapter</b> here, and each Lichess chapter becomes a <b>position</b> inside it — ready to teach in the live classroom. Private studies won’t import — make it public/unlisted on Lichess first.
              </div>
              <input
                autoFocus
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://lichess.org/study/AbCdEfGh"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', fontSize: 14, marginBottom: 10 }}
              />
              <input
                value={importName}
                onChange={e => setImportName(e.target.value)}
                placeholder="Name for this study (optional)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', fontSize: 14, marginBottom: 10 }}
              />
              <input
                value={importChapter}
                onChange={e => setImportChapter(e.target.value)}
                placeholder="Name for the chapter (optional)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', fontSize: 14, marginBottom: 12 }}
              />
              {importErr && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 10 }}>{importErr}</div>}
              {importOk && <div style={{ color: 'var(--color-success)', fontSize: 13, marginBottom: 10 }}>{importOk}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={runImport}
                  disabled={importBusy || !importUrl.trim()}
                  style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent-2))', color: '#04211d', fontWeight: 800, fontSize: 14, cursor: importBusy ? 'default' : 'pointer', opacity: (importBusy || !importUrl.trim()) ? 0.6 : 1 }}
                >
                  {importBusy ? 'Importing…' : 'Import study'}
                </button>
                <button
                  onClick={() => !importBusy && setImportOpen(false)}
                  style={{ padding: '11px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['all', '📋 All'], ['private', '🔒 Private'], ['public', '🌐 Public']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{ padding: '7px 18px', borderRadius: 'var(--radius-2xl)', border: `1px solid ${filter === val ? 'var(--color-accent-2)' : 'var(--color-white-a10)'}`, background: filter === val ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === val ? 'var(--color-accent-2)' : 'var(--color-text-faint)', cursor: 'pointer', fontSize: 13, fontWeight: filter === val ? 700 : 400 }}
            >{label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-faint)', alignSelf: 'center' }}>{displayed.length} stud{displayed.length !== 1 ? 'ies' : 'y'}</span>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-faint)' }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', ...cardStyle }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-2)', marginBottom: 8 }}>
              {filter === 'all' ? 'No studies yet' : `No ${filter} studies`}
            </div>
            <div style={{ color: 'var(--color-text-faint)', marginBottom: 24, fontSize: 14 }}>
              Create a position and save it to a Private or Public Study to organise and play through your positions.
            </div>
            <button onClick={() => navigate('/create-position')} style={{ padding: '14px 32px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent-2)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              + Create Position
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {displayed.map((study, i) => {
              const tc = typeColors[study.studyType] || typeColors.other;
              return (
                <motion.div
                  key={study._id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4, boxShadow: `0 12px 40px ${tc.bg}` }}
                  onClick={() => navigate(`/my-studies/${study._id}`)}
                  style={{ ...cardStyle, cursor: 'pointer', position: 'relative' }}
                >
                  {/* Accent top bar */}
                  <div style={{ height: 4, background: tc.gradient }} />

                  <div style={{ padding: '18px 18px 16px' }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 9px', background: tc.bg, borderRadius: 'var(--radius-sm)', fontSize: 11, color: tc.color, fontWeight: 700, textTransform: 'capitalize' }}>
                        {study.studyType || 'study'}
                      </span>
                      <span style={{ padding: '2px 9px', background: study.isPublic ? 'var(--color-success-a12)' : 'rgba(107,114,128,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: study.isPublic ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                        {study.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {study.name}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tc.color }}>{study.chapterCount || 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Chapters</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tc.color }}>{study.puzzleCount || 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Positions</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                      {new Date(study.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Open caret */}
                  <div style={{ position: 'absolute', bottom: 16, right: 18, fontSize: 18, color: tc.color, opacity: 0.6 }}>→</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
