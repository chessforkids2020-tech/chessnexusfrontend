import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';

const typeColors = {
  basics:     { color: '#10b981', bg: 'rgba(16,185,129,0.15)', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  positional: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  other:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
};

export default function MyStudiesPage() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'private' | 'public'

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
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '24px 20px', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 20%, rgba(99,102,241,0.08) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#a5b4fc' }}>📚 My Studies</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Your private &amp; public position studies</div>
          </div>
          <button
            onClick={() => navigate('/create-position')}
            style={{ marginLeft: 'auto', padding: '12px 22px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, color: '#a5b4fc', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            + Add Position
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['all', '📋 All'], ['private', '🔒 Private'], ['public', '🌐 Public']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{ padding: '7px 18px', borderRadius: 20, border: `1px solid ${filter === val ? '#a5b4fc' : 'rgba(255,255,255,0.1)'}`, background: filter === val ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === val ? '#a5b4fc' : '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: filter === val ? 700 : 400 }}
            >{label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#4b5563', alignSelf: 'center' }}>{displayed.length} stud{displayed.length !== 1 ? 'ies' : 'y'}</span>
        </div>

        {error && <div style={{ color: '#f87171', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', ...cardStyle }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>
              {filter === 'all' ? 'No studies yet' : `No ${filter} studies`}
            </div>
            <div style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
              Create a position and save it to a Private or Public Study to organise and play through your positions.
            </div>
            <button onClick={() => navigate('/create-position')} style={{ padding: '14px 32px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, color: '#a5b4fc', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
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
                      <span style={{ padding: '2px 9px', background: tc.bg, borderRadius: 6, fontSize: 11, color: tc.color, fontWeight: 700, textTransform: 'capitalize' }}>
                        {study.studyType || 'study'}
                      </span>
                      <span style={{ padding: '2px 9px', background: study.isPublic ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.15)', borderRadius: 6, fontSize: 11, color: study.isPublic ? '#34d399' : '#9ca3af', fontWeight: 600 }}>
                        {study.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {study.name}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tc.color }}>{study.chapterCount || 0}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Chapters</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tc.color }}>{study.puzzleCount || 0}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Positions</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#4b5563' }}>
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
