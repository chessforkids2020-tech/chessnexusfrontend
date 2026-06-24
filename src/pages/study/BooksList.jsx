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
          <div style={styles.grid}>
            {books.map(book => (
              <div key={book._id} style={styles.card} onClick={() => navigate(`/study/books/${book._id}`)}>
                {book.coverImage
                  ? <img src={`${API_BASE}/api/public/book-covers/${book.coverImage}`} alt="" style={styles.cover} draggable={false} />
                  : <div style={styles.coverPlaceholder}>📖</div>}
                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{book.title}</h3>
                  {book.author && <div style={styles.author}>by {book.author}</div>}
                </div>
              </div>
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 22 },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column' },
  cover: { width: '100%', height: 230, objectFit: 'cover', display: 'block', background: '#222' },
  coverPlaceholder: { width: '100%', height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, background: 'linear-gradient(135deg,#1f3a2f,#16302a)' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#e5e7eb', margin: '0 0 4px' },
  author: { color: '#9ca3af', fontSize: 13 },
};

export default BooksList;
