import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BooksList = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/books');
        setBooks(res.data);
      } catch { setError('Failed to load books'); }
      finally { setLoading(false); }
    })();
  }, []);

  // Build the ordered list of sections to render. Only non-empty sections show.
  //  1. "Free Books"  — every freeForAll book (regardless of its category).
  //  2. one section per category that has at least one book, in CATEGORY_ORDER.
  //  3. "More Books"  — anything left without a category.
  // A free book can appear both under "Free Books" and under its own category.
  const CATEGORY_ORDER = ['Best for Beginners', 'Openings', 'Middlegame', 'Endgame', 'Strategic'];
  const buildSections = () => {
    const sections = [];
    const freeBooks = books.filter(b => b.freeForAll);
    if (freeBooks.length) sections.push({ key: 'free', label: '🆓 Free Books', books: freeBooks });

    for (const cat of CATEGORY_ORDER) {
      const inCat = books.filter(b => b.category === cat);
      if (inCat.length) sections.push({ key: cat, label: cat, books: inCat });
    }
    // Any other non-standard category an admin may have set.
    const known = new Set(CATEGORY_ORDER);
    const otherCats = [...new Set(books.map(b => b.category).filter(c => c && !known.has(c)))];
    for (const cat of otherCats) {
      sections.push({ key: cat, label: cat, books: books.filter(b => b.category === cat) });
    }

    const uncategorised = books.filter(b => !b.category);
    if (uncategorised.length) sections.push({ key: 'other', label: 'More Books', books: uncategorised });
    return sections;
  };

  const renderCard = (book) => (
    <div key={book._id} style={styles.card} onClick={() => navigate(`/study/books/${book._id}`)}>
      <div style={styles.coverWrap}>
        {book.freeForAll && <span style={styles.freeBadge}>FREE</span>}
        {book.coverImage
          ? <img src={`${API_BASE}/api/public/book-covers/${book.coverImage}`} alt="" style={styles.cover} draggable={false} />
          : <div style={styles.coverPlaceholder}>📖</div>}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{book.title}</h3>
        {book.author && <div style={styles.author}>by {book.author}</div>}
      </div>
    </div>
  );

  const sections = buildSections();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/study')}>← Back to Study</button>
        <h1 style={styles.title}>📚 Books</h1>
        <p style={styles.subtitle}>Read chess books. Chapter 1 is free for everyone; later chapters are for supporters & coaches.</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading ? <div style={{ color: '#a3a3a3' }}>Loading…</div>
        : books.length === 0 ? <div style={{ color: '#a3a3a3' }}>No books available yet.</div>
        : (
          <div>
            {sections.map(section => (
              <section key={section.key} style={styles.section}>
                <h2 style={styles.sectionTitle}>{section.label}</h2>
                <div style={styles.grid}>
                  {section.books.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  );
};

const styles = {
  container: { maxWidth: 1100, margin: '0 auto', padding: 24 },
  header: { marginBottom: 20 },
  backButton: { background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 15, padding: 0, marginBottom: 8 },
  title: { fontSize: 28, color: '#34d399', margin: '4px 0' },
  subtitle: { color: '#a3a3a3', margin: 0 },
  error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: 6, marginBottom: 16 },
  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 20, color: '#e5e7eb', margin: '0 0 14px', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 22 },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column' },
  coverWrap: { position: 'relative' },
  freeBadge: { position: 'absolute', top: 8, left: 8, zIndex: 1, background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
  cover: { width: '100%', height: 230, objectFit: 'cover', display: 'block', background: '#222' },
  coverPlaceholder: { width: '100%', height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, background: 'linear-gradient(135deg,#1f3a2f,#16302a)' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#e5e7eb', margin: '0 0 4px' },
  author: { color: '#9ca3af', fontSize: 13 },
};

export default BooksList;
