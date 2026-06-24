import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../../api';
import BookPositionPicker from './BookPositionPicker';

const API_BASE = import.meta.env.VITE_API_URL || '';
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Recursive ToC node in the admin editor: add-child / rename / delete at any depth,
// and select a node to edit its pages.
function AdminTocNode({ node, depth, selectedId, onSelect, onAddChild, onRename, onDelete }) {
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
        <span
          onClick={() => onSelect(node)}
          style={{
            cursor: 'pointer', fontWeight: selectedId === node._id ? 800 : 500,
            color: selectedId === node._id ? '#1a5f1a' : '#333',
            flex: 1,
          }}
        >
          {depth === 0 ? '📘 ' : '• '}{node.title}
          {(node.pages?.length > 0) && <span style={{ color: '#888', fontSize: 12 }}> ({node.pages.length}p)</span>}
        </span>
        <button title="Add sub-section" style={miniBtn} onClick={() => onAddChild(node)}>＋</button>
        <button title="Rename" style={miniBtn} onClick={() => onRename(node)}>✎</button>
        <button title="Delete" style={{ ...miniBtn, color: '#c62828' }} onClick={() => onDelete(node)}>🗑</button>
      </div>
      {(node.children || []).map(child => (
        <AdminTocNode key={child._id} node={child} depth={depth + 1}
          selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild}
          onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
}

const AdminBookManagement = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Book-level form
  const [form, setForm] = useState({ title: '', author: '', description: '' });
  const [editingBookId, setEditingBookId] = useState(null);
  // Cover chosen in the create form (only used when creating a NEW book).
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState(null);
  const newCoverInputRef = useRef(null);

  // Editing one book's tree
  const [openBook, setOpenBook] = useState(null); // full book object
  const [selectedNode, setSelectedNode] = useState(null);
  const coverRef = useRef(null);

  // Page editor state
  const [pageDraft, setPageDraft] = useState(null); // {_id?, contentHtml, fen, orientation, diagramLabel}

  const fetchBooks = async () => {
    try {
      const res = await api.get('/api/books/admin');
      setBooks(res.data);
    } catch { setError('Failed to load books'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchBooks(); }, []);

  const reloadOpenBook = async (id) => {
    const res = await api.get(`/api/books/admin/${id}`);
    setOpenBook(res.data);
    // keep selectedNode in sync by id
    if (selectedNode) {
      const found = findInTree(res.data.chapters, selectedNode._id);
      setSelectedNode(found || null);
    }
    return res.data;
  };

  // ── Book CRUD ──
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingBookId) {
        await api.put(`/api/books/admin/${editingBookId}`, form);
      } else {
        // Create the book, then upload the chosen cover (needs the new id).
        const res = await api.post('/api/books/admin', form);
        if (newCoverFile && res.data?._id) {
          await uploadCoverFor(res.data._id, newCoverFile, false);
        }
      }
      setForm({ title: '', author: '', description: '' });
      setEditingBookId(null);
      clearNewCover();
      fetchBooks();
    } catch { setError('Failed to save book'); }
  };

  const togglePublish = async (book) => {
    await api.put(`/api/books/admin/${book._id}`, { published: !book.published });
    fetchBooks();
  };

  const updateFreeChapters = async (book, n) => {
    await api.put(`/api/books/admin/${book._id}`, { freeChapters: n });
    fetchBooks();
  };

  const deleteBook = async (id) => {
    if (!confirm('Delete this book and all its content?')) return;
    await api.delete(`/api/books/admin/${id}`);
    if (openBook?._id === id) setOpenBook(null);
    fetchBooks();
  };

  // Upload a cover for a given book id. (refresh=false lets callers batch the refresh.)
  const uploadCoverFor = async (bookId, file, refresh = true) => {
    const fd = new FormData();
    fd.append('cover', file);
    await api.post(`/api/books/admin/${bookId}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (refresh) fetchBooks();
  };

  const onPickNewCover = (file) => {
    setNewCoverFile(file || null);
    setNewCoverPreview(prev => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null; });
  };

  const clearNewCover = () => {
    onPickNewCover(null);
    if (newCoverInputRef.current) newCoverInputRef.current.value = '';
  };

  // ── Node CRUD ──
  const addNode = async (parentNodeId) => {
    const title = prompt(parentNodeId ? 'Sub-section title:' : 'Chapter title:');
    if (!title || !title.trim()) return;
    await api.post(`/api/books/admin/${openBook._id}/nodes`, { parentNodeId: parentNodeId || null, title: title.trim() });
    reloadOpenBook(openBook._id);
  };
  const renameNode = async (node) => {
    const title = prompt('New title:', node.title);
    if (!title || !title.trim()) return;
    await api.put(`/api/books/admin/${openBook._id}/nodes/${node._id}`, { title: title.trim() });
    reloadOpenBook(openBook._id);
  };
  const deleteNode = async (node) => {
    if (!confirm(`Delete "${node.title}" and everything under it?`)) return;
    await api.delete(`/api/books/admin/${openBook._id}/nodes/${node._id}`);
    if (selectedNode?._id === node._id) setSelectedNode(null);
    reloadOpenBook(openBook._id);
  };

  // ── Page CRUD (a page = ordered list of blocks: text | board) ──
  const newPage = () => setPageDraft({ blocks: [{ type: 'text', contentHtml: '' }] });
  const editPage = (p) => setPageDraft({ _id: p._id, blocks: (p.blocks || []).map(b => ({ ...b })) });
  const savePage = async () => {
    const nodeId = selectedNode._id;
    const body = { blocks: pageDraft.blocks };
    if (pageDraft._id) {
      await api.put(`/api/books/admin/${openBook._id}/nodes/${nodeId}/pages/${pageDraft._id}`, body);
    } else {
      await api.post(`/api/books/admin/${openBook._id}/nodes/${nodeId}/pages`, body);
    }
    setPageDraft(null);
    const fresh = await reloadOpenBook(openBook._id);
    setSelectedNode(findInTree(fresh.chapters, nodeId));
  };

  // ── Block helpers (operate on pageDraft.blocks) ──
  const addBlock = (type) => setPageDraft(d => ({
    ...d,
    blocks: [...d.blocks, type === 'board'
      ? { type: 'board', fen: START_FEN, orientation: 'white', caption: '', diagramLabel: '' }
      : { type: 'text', contentHtml: '' }],
  }));
  const updateBlock = (idx, patch) => setPageDraft(d => ({
    ...d, blocks: d.blocks.map((b, i) => i === idx ? { ...b, ...patch } : b),
  }));
  const removeBlock = (idx) => setPageDraft(d => ({ ...d, blocks: d.blocks.filter((_, i) => i !== idx) }));
  const moveBlock = (idx, dir) => setPageDraft(d => {
    const j = idx + dir;
    if (j < 0 || j >= d.blocks.length) return d;
    const blocks = [...d.blocks];
    [blocks[idx], blocks[j]] = [blocks[j], blocks[idx]];
    return { ...d, blocks };
  });
  const deletePage = async (pid) => {
    if (!confirm('Delete this page?')) return;
    const nodeId = selectedNode._id;
    await api.delete(`/api/books/admin/${openBook._id}/nodes/${nodeId}/pages/${pid}`);
    const fresh = await reloadOpenBook(openBook._id);
    setSelectedNode(findInTree(fresh.chapters, nodeId));
  };
  const copyPage = async (pid) => {
    const nodeId = selectedNode._id;
    await api.post(`/api/books/admin/${openBook._id}/nodes/${nodeId}/pages/${pid}/copy`);
    const fresh = await reloadOpenBook(openBook._id);
    setSelectedNode(findInTree(fresh.chapters, nodeId));
  };

  if (loading) return <div style={styles.container}>Loading…</div>;

  // ── Tree editor view for one book ──
  if (openBook) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => { setOpenBook(null); setSelectedNode(null); setPageDraft(null); }}>← All books</button>
        <h1 style={styles.title}>📖 {openBook.title}</h1>
        <div style={{ color: '#666', marginBottom: 16 }}>by {openBook.author || '—'}</div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Tree */}
          <div style={{ ...styles.card, minWidth: 300, flex: '1 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, color: '#1a5f1a' }}>Contents</h3>
              <button style={styles.primaryButtonSm} onClick={() => addNode(null)}>＋ Chapter</button>
            </div>
            {(openBook.chapters || []).length === 0 && <div style={{ color: '#888' }}>No chapters yet.</div>}
            {(openBook.chapters || []).map(ch => (
              <AdminTocNode key={ch._id} node={ch} depth={0}
                selectedId={selectedNode?._id} onSelect={(n) => { setSelectedNode(n); setPageDraft(null); }}
                onAddChild={(n) => addNode(n._id)} onRename={renameNode} onDelete={deleteNode} />
            ))}
          </div>

          {/* Pages of selected node */}
          <div style={{ ...styles.card, flex: '2 1 640px', minWidth: 0 }}>
            {!selectedNode ? (
              <div style={{ color: '#888' }}>Select a section on the left to edit its pages.</div>
            ) : pageDraft ? (
              <div>
                <h3 style={{ marginTop: 0, color: '#1a5f1a' }}>{pageDraft._id ? 'Edit page' : 'New page'} — {selectedNode.title}</h3>
                <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>
                  Build the page top-to-bottom by stacking blocks — a heading/paragraph (Text), then a Board, then more text, another board… just like a book page.
                </p>

                {pageDraft.blocks.map((block, idx) => (
                  <div key={idx} style={styles.blockCard}>
                    <div style={styles.blockHeader}>
                      <span style={{ fontWeight: 700, color: '#1a5f1a' }}>
                        {block.type === 'board' ? '♟ Board' : '✍ Text'} #{idx + 1}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" style={miniBtn} onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>↑</button>
                        <button type="button" style={miniBtn} onClick={() => moveBlock(idx, +1)} disabled={idx === pageDraft.blocks.length - 1}>↓</button>
                        <button type="button" style={{ ...miniBtn, color: '#c62828' }} onClick={() => removeBlock(idx)}>🗑</button>
                      </div>
                    </div>

                    {block.type === 'text' ? (
                      <ReactQuill theme="snow" value={block.contentHtml}
                        onChange={(html) => updateBlock(idx, { contentHtml: html })}
                        style={{ background: '#fff' }} />
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ flex: '1 1 180px' }}>
                            <label style={styles.label}>Diagram label (above board)</label>
                            <input style={styles.input} value={block.diagramLabel || ''}
                              placeholder="e.g. Diagram 1"
                              onChange={(e) => updateBlock(idx, { diagramLabel: e.target.value })} />
                          </div>
                          <div style={{ flex: '0 0 160px' }}>
                            <label style={styles.label}>Orientation</label>
                            <select style={styles.input} value={block.orientation || 'white'}
                              onChange={(e) => updateBlock(idx, { orientation: e.target.value })}>
                              <option value="white">White at bottom</option>
                              <option value="black">Black at bottom</option>
                            </select>
                          </div>
                        </div>
                        <label style={styles.label}>Position</label>
                        <BookPositionPicker value={block.fen}
                          onChange={(fen) => updateBlock(idx, { fen })} />
                        <label style={{ ...styles.label, marginTop: 8 }}>Caption (under board)</label>
                        <input style={styles.input} value={block.caption || ''}
                          placeholder="e.g. Black's King is on the side of the board"
                          onChange={(e) => updateBlock(idx, { caption: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ ...styles.buttonGroup, marginTop: 10 }}>
                  <button type="button" style={styles.addBlockBtn} onClick={() => addBlock('text')}>＋ Text block</button>
                  <button type="button" style={styles.addBlockBtn} onClick={() => addBlock('board')}>＋ Board block</button>
                </div>

                <div style={{ ...styles.buttonGroup, marginTop: 16 }}>
                  <button style={styles.primaryButton} onClick={savePage}>Save page</button>
                  <button style={styles.cancelButton} onClick={() => setPageDraft(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: '#1a5f1a' }}>Pages — {selectedNode.title}</h3>
                  <button style={styles.primaryButtonSm} onClick={newPage}>＋ Page</button>
                </div>
                {(selectedNode.pages || []).length === 0 && <div style={{ color: '#888' }}>No pages yet. This is a section header.</div>}
                {(selectedNode.pages || []).map((p, i) => {
                  const blocks = p.blocks || [];
                  const boards = blocks.filter(b => b.type === 'board').length;
                  const firstText = blocks.find(b => b.type === 'text');
                  return (
                  <div key={p._id} style={styles.pageRow}>
                    <span style={{ flex: 1 }}>
                      Page {i + 1}
                      <span style={{ color: '#aaa', fontSize: 12 }}>
                        {' · '}{blocks.length} block{blocks.length !== 1 ? 's' : ''}{boards ? `, ${boards} board${boards !== 1 ? 's' : ''}` : ''}
                        {firstText ? ` · ${stripHtml(firstText.contentHtml).slice(0, 30)}` : ''}
                      </span>
                    </span>
                    <button style={{ ...styles.button, ...styles.editButton }} onClick={() => editPage(p)}>Edit</button>
                    <button style={{ ...styles.button, background: '#6f42c1', color: '#fff' }} onClick={() => copyPage(p._id)}>Copy</button>
                    <button style={{ ...styles.button, ...styles.deleteButton }} onClick={() => deletePage(p._id)}>Del</button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Book list view ──
  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/admin')}>← Back to Admin</button>
      <h1 style={styles.title}>📖 Manage Books</h1>
      <p style={{ color: '#666' }}>Author study books (chapters → topics → pages with text + boards). Chapter 1 is free; later chapters need supporter/coach/elite.</p>

      {error && <div style={styles.error}>{error}</div>}

      <form style={styles.form} onSubmit={handleBookSubmit}>
        <h3 style={{ marginTop: 0, color: '#1a5f1a' }}>{editingBookId ? 'Edit book' : 'New book'}</h3>
        <div style={styles.formGroup}><label style={styles.label}>Title *</label>
          <input style={styles.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Written by (author)</label>
          <input style={styles.input} value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Description</label>
          <textarea style={{ ...styles.input, minHeight: 60 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        {!editingBookId && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Cover image (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {newCoverPreview
                ? <img src={newCoverPreview} alt="cover preview" style={styles.coverThumb} />
                : <div style={styles.coverPlaceholder}>📖</div>}
              <div>
                <input ref={newCoverInputRef} type="file" accept="image/*"
                  onChange={(e) => onPickNewCover(e.target.files?.[0] || null)} />
                {newCoverFile && (
                  <button type="button" style={{ ...styles.button, ...styles.deleteButton, marginLeft: 8 }} onClick={clearNewCover}>Remove</button>
                )}
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>PNG/JPG/WebP/GIF, up to 5&nbsp;MB. You can change it later too.</div>
              </div>
            </div>
          </div>
        )}
        <div style={styles.buttonGroup}>
          <button type="submit" style={styles.primaryButton}>{editingBookId ? 'Save' : 'Create book'}</button>
          {editingBookId && <button type="button" style={styles.cancelButton} onClick={() => { setEditingBookId(null); setForm({ title: '', author: '', description: '' }); }}>Cancel</button>}
        </div>
      </form>

      <div style={styles.grid}>
        {books.map(book => (
          <div key={book._id} style={styles.card}>
            <div style={{ display: 'flex', gap: 12 }}>
              {book.coverImage
                ? <img src={`${API_BASE}/api/public/book-covers/${book.coverImage}`} alt="" style={styles.coverThumb} />
                : <div style={styles.coverPlaceholder}>📖</div>}
              <div style={{ flex: 1 }}>
                <h3 style={styles.cardTitle}>{book.title}</h3>
                <div style={{ color: '#666', fontSize: 14 }}>by {book.author || '—'}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{book.topLevelCount} chapters</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ ...styles.badge, background: book.published ? '#e6f4ea' : '#fff4e5', color: book.published ? '#1a7f37' : '#b26a00' }}>
                    {book.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#555' }}>
              Free chapters:
              <input type="number" min={0} value={book.freeChapters}
                style={{ width: 56, padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                onChange={(e) => updateFreeChapters(book, Math.max(0, +e.target.value))} />
            </div>
            <div style={{ ...styles.buttonGroup, marginTop: 10 }}>
              <button style={{ ...styles.button, ...styles.manageButton }} onClick={() => { reloadOpenBook(book._id); setSelectedNode(null); }}>Edit contents</button>
              <button style={{ ...styles.button, ...styles.editButton }} onClick={() => { setEditingBookId(book._id); setForm({ title: book.title, author: book.author, description: book.description || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Meta</button>
              <button style={{ ...styles.button, background: '#0d6efd', color: '#fff' }} onClick={() => { coverRef.current.dataset.bookId = book._id; coverRef.current.click(); }}>Cover</button>
              <button style={{ ...styles.button, background: book.published ? '#fd7e14' : '#198754', color: '#fff' }} onClick={() => togglePublish(book)}>{book.published ? 'Unpublish' : 'Publish'}</button>
              <button style={{ ...styles.button, ...styles.deleteButton }} onClick={() => deleteBook(book._id)}>Delete</button>
            </div>
          </div>
        ))}
        {books.length === 0 && <div style={{ color: '#888' }}>No books yet.</div>}
      </div>

      {/* Hidden cover file input shared across cards */}
      <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          const bookId = e.target.dataset.bookId;
          if (file && bookId) uploadCoverFor(bookId, file);
          e.target.value = '';
        }} />
    </div>
  );
};

// ── helpers ──
function findInTree(nodes, id) {
  for (const n of nodes || []) {
    if (String(n._id) === String(id)) return n;
    const deeper = findInTree(n.children, id);
    if (deeper) return deeper;
  }
  return null;
}
function stripHtml(html) { return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

const miniBtn = { background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 12, padding: '1px 6px' };
const styles = {
  container: { maxWidth: 1200, margin: '0 auto', padding: 24 },
  backButton: { background: 'none', border: 'none', color: '#1a5f1a', cursor: 'pointer', fontSize: 15, padding: 0, marginBottom: 8 },
  title: { fontSize: 28, color: '#1a5f1a', margin: '4px 0' },
  error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: 6, marginBottom: 16 },
  form: { background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 24 },
  formGroup: { marginBottom: 12 },
  label: { display: 'block', fontWeight: 600, marginBottom: 6, color: '#333' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 15, boxSizing: 'border-box' },
  buttonGroup: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryButton: { background: '#1a5f1a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 15 },
  primaryButtonSm: { background: '#1a5f1a', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  cancelButton: { background: '#6c757d', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 },
  card: { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a5f1a', margin: '0 0 2px' },
  coverThumb: { width: 70, height: 95, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' },
  coverPlaceholder: { width: 70, height: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: '#eef7ee', borderRadius: 6 },
  button: { padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  editButton: { background: '#007bff', color: '#fff' },
  deleteButton: { background: '#dc3545', color: '#fff' },
  manageButton: { background: '#28a745', color: '#fff' },
  badge: { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999 },
  pageRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #f0f0f0' },
  blockCard: { border: '1px solid #e3ebe3', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fbfdfb' },
  blockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addBlockBtn: { background: '#eef7ee', color: '#1a5f1a', border: '1px dashed #1a5f1a', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default AdminBookManagement;
