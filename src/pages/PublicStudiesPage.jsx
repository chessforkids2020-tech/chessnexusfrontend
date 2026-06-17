import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';

// Unified studies: positional filter removed. "all" already shows every study
// (basic + positional) merged into one list.
const STUDY_TYPES = ['all'];

const typeColors = {
  basics:     { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  positional: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
};

const PublicStudiesPage = () => {
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (selectedType !== 'all') params.set('type', selectedType);
      if (search) params.set('search', search);
      const res = await api.get(`/api/user-studies/public?${params}`);
      setStudies(res.data.studies || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (e) {
      setError('Failed to load public studies');
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, search]);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleTypeFilter = (t) => {
    setSelectedType(t);
    setPage(1);
  };

  const s = {
    page: {
      fontFamily: "'Segoe UI', sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: '24px 20px',
      color: '#e2e8f0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    backBtn: {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#e2e8f0',
      borderRadius: 8,
      padding: '8px 14px',
      cursor: 'pointer',
      fontSize: 14,
    },
    title: {
      fontSize: 26,
      fontWeight: 700,
      color: '#fff',
      margin: 0,
    },
    subtitle: {
      fontSize: 13,
      color: '#64748b',
      marginLeft: 'auto',
    },
    controls: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
      alignItems: 'center',
    },
    searchForm: {
      display: 'flex',
      gap: 8,
      flex: '1 1 260px',
    },
    searchInput: {
      flex: 1,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '8px 14px',
      color: '#e2e8f0',
      fontSize: 14,
      outline: 'none',
    },
    searchBtn: {
      background: '#3b82f6',
      border: 'none',
      borderRadius: 8,
      color: '#fff',
      padding: '8px 16px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: 14,
    },
    filterRow: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
    },
    filterChip: (active, type) => ({
      padding: '6px 14px',
      borderRadius: 20,
      border: `1px solid ${active
        ? (type !== 'all' ? typeColors[type]?.color || '#3b82f6' : '#3b82f6')
        : 'rgba(255,255,255,0.12)'}`,
      background: active
        ? (type !== 'all' ? typeColors[type]?.bg || 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.15)')
        : 'transparent',
      color: active
        ? (type !== 'all' ? typeColors[type]?.color || '#3b82f6' : '#3b82f6')
        : '#94a3b8',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      transition: 'all 0.2s',
      textTransform: 'capitalize',
    }),
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 20,
      cursor: 'pointer',
      transition: 'border-color 0.2s',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    cardName: {
      fontSize: 17,
      fontWeight: 700,
      color: '#f1f5f9',
      lineHeight: 1.25,
      flex: 1,
      marginRight: 8,
    },
    typeBadge: (type) => ({
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 10,
      background: typeColors[type]?.bg || 'rgba(148,163,184,0.15)',
      color: typeColors[type]?.color || '#94a3b8',
      textTransform: 'capitalize',
      flexShrink: 0,
    }),
    description: {
      fontSize: 13,
      color: '#94a3b8',
      marginBottom: 14,
      lineHeight: 1.5,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    cardMeta: {
      display: 'flex',
      gap: 16,
      fontSize: 12,
      color: '#64748b',
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    cardAuthor: {
      marginTop: 10,
      fontSize: 12,
      color: '#64748b',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 10,
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginTop: 32,
    },
    pageBtn: (active) => ({
      padding: '8px 14px',
      borderRadius: 8,
      border: `1px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
      background: active ? 'rgba(59,130,246,0.2)' : 'transparent',
      color: active ? '#3b82f6' : '#94a3b8',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
    }),
    empty: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#64748b',
    },
    errBox: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#f87171',
    },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>📚 Public Studies</h1>
        <span style={s.subtitle}>{total > 0 ? `${total} stud${total === 1 ? 'y' : 'ies'}` : ''}</span>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <form style={s.searchForm} onSubmit={handleSearch}>
          <input
            style={s.searchInput}
            placeholder="Search studies by name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" style={s.searchBtn}>Search</button>
        </form>
        <div style={s.filterRow}>
          {STUDY_TYPES.map(t => (
            <button
              key={t}
              style={s.filterChip(selectedType === t, t)}
              onClick={() => handleTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={s.empty}>Loading studies...</div>
      ) : error ? (
        <div style={s.errBox}>{error}</div>
      ) : studies.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <div style={{ fontSize: 16, marginBottom: 6 }}>No public studies yet</div>
          <div style={{ fontSize: 13 }}>Be the first to create one by saving a position!</div>
        </div>
      ) : (
        <>
          <div style={s.grid}>
            {studies.map((study, i) => {
              const chapterCount = study.chapterCount || (study.chapters?.length ?? 0);
              const puzzleCount = study.puzzleCount || 0;
              return (
                <motion.div
                  key={study._id}
                  style={s.card}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ borderColor: typeColors[study.studyType]?.color || '#3b82f6', scale: 1.01 }}
                  onClick={() => navigate(`/public-studies/${study._id}`)}
                >
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{study.name}</div>
                    <span style={s.typeBadge(study.studyType)}>{study.studyType || 'other'}</span>
                  </div>
                  {study.description && (
                    <div style={s.description}>{study.description}</div>
                  )}
                  <div style={s.cardMeta}>
                    <div style={s.metaItem}>📂 {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}</div>
                    <div style={s.metaItem}>♟️ {puzzleCount} position{puzzleCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={s.cardAuthor}>
                    by <strong style={{ color: '#cbd5e1' }}>{study.username || 'Unknown'}</strong>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={s.pageBtn(false)} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} style={s.pageBtn(p === page)} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button style={s.pageBtn(false)} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicStudiesPage;
