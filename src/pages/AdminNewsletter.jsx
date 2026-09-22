// pages/AdminNewsletter.jsx
//
// ADMIN — write and manage the newsletter.
//
// Two views in one page:
//   LIST   — every post, draft and published, with the numbers that matter:
//            views, likes, and DISLIKES. The dislike count exists nowhere else
//            in the product; readers never receive it. It is here because "did
//            this land?" is the question the whole reaction system answers, and
//            a public dislike number would drag down a feature that is fine.
//   EDITOR — title, summary, topic, audience, cover picture, and the body.
//            Pictures are inserted INSIDE the writing from the editor toolbar
//            (left / right / full width), not collected at the end.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { mediaUrl } from '../utils/mediaUrl';
import NewsletterRichText from '../components/NewsletterRichText';
import './AdminNewsletter.css';

const AUDIENCES = [
  { v: 'all', label: 'Everyone', hint: 'Coaches, players and logged-out visitors. Only these are shareable on social media.' },
  { v: 'coaches', label: 'Coaches only', hint: 'Only coach accounts see it. Not public.' },
  { v: 'students', label: 'Players only', hint: 'Only student accounts see it. Not public.' },
];

const TOPICS = ['New feature', 'Tournament', 'Announcement', 'Tip', 'Update', 'News'];

const BLANK = {
  title: '', summary: '', topic: 'New feature', audience: 'all',
  coverImage: '', body: '', images: [], pinned: false,
};

export default function AdminNewsletter() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // post id, 'new', or null
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const coverInput = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/newsletter/admin/all');
      setPosts(r.data?.posts || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load posts.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(BLANK); setEditing('new'); setMsg(''); setErr(''); };

  const openEdit = async (id) => {
    setErr(''); setMsg('');
    try {
      const r = await api.get(`/api/newsletter/admin/one/${id}`);
      const p = r.data.post;
      setForm({
        title: p.title || '', summary: p.summary || '', topic: p.topic || 'News',
        audience: p.audience || 'all', coverImage: p.coverImage || '',
        body: p.body || '', images: p.images || [], pinned: !!p.pinned,
      });
      setEditing(id);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not open that post.');
    }
  };

  // Uploads go up one at a time and return a served URL; the post stores the
  // URL, never the bytes.
  const upload = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const r = await api.post('/api/newsletter/admin/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data.url;
  };

  const pickCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';           // let the same file be picked again after a failure
    if (!file) return;
    setErr('');
    try { set('coverImage', await upload(file)); }
    catch (ex) { setErr(ex.response?.data?.message || 'Could not upload that image.'); }
  };

  const save = async () => {
    if (!form.title.trim()) { setErr('A title is required.'); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      if (editing === 'new') {
        const r = await api.post('/api/newsletter/admin', form);
        setEditing(r.data.post.id);
        setMsg('Draft saved. It is not visible to anyone until you publish it.');
      } else {
        await api.put(`/api/newsletter/admin/${editing}`, form);
        setMsg('Saved.');
      }
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const publish = async (id) => {
    if (!window.confirm('Publish this post? Everyone in the chosen audience gets a notification.')) return;
    try {
      const r = await api.post(`/api/newsletter/admin/${id}/publish`);
      setMsg(r.data.notified
        ? 'Published — a notification has gone out.'
        : 'Published again. No new notification was sent (that only happens the first time).');
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Could not publish.'); }
  };

  const unpublish = async (id) => {
    try { await api.post(`/api/newsletter/admin/${id}/unpublish`); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Could not unpublish.'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return;
    try { await api.delete(`/api/newsletter/admin/${id}`); setEditing(null); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Could not delete.'); }
  };

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (editing) {
    const current = posts.find(p => p.id === editing);
    return (
      <div className="anl">
        <div className="anl-bar">
          <button className="anl-btn" onClick={() => { setEditing(null); setMsg(''); setErr(''); }}>← Back</button>
          <div className="anl-bar-right">
            <button className="anl-btn anl-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {current && !current.published && (
              <button className="anl-btn anl-go" onClick={() => publish(current.id)}>Publish</button>
            )}
            {current?.published && (
              <button className="anl-btn" onClick={() => unpublish(current.id)}>Unpublish</button>
            )}
          </div>
        </div>

        {msg && <div className="anl-msg">{msg}</div>}
        {err && <div className="anl-msg anl-err">{err}</div>}

        <div className="anl-form">
          <label className="anl-f">
            <span>Title *</span>
            <input value={form.title} onChange={e => set('title', e.target.value)}
                   maxLength={200} placeholder="e.g. Trial classes are here" />
          </label>

          <label className="anl-f">
            <span>Summary</span>
            <textarea rows={2} value={form.summary} maxLength={400}
                      onChange={e => set('summary', e.target.value)}
                      placeholder="One line shown on the card and in the share preview." />
          </label>

          <div className="anl-row">
            <label className="anl-f">
              <span>Topic</span>
              <select value={form.topic} onChange={e => set('topic', e.target.value)}>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label className="anl-f">
              <span>Who sees it</span>
              <select value={form.audience} onChange={e => set('audience', e.target.value)}>
                {AUDIENCES.map(a => <option key={a.v} value={a.v}>{a.label}</option>)}
              </select>
            </label>

            <label className="anl-f anl-check">
              <input type="checkbox" checked={form.pinned}
                     onChange={e => set('pinned', e.target.checked)} />
              <span>📌 Pin to top</span>
            </label>
          </div>

          <div className="anl-hint">
            {AUDIENCES.find(a => a.v === form.audience)?.hint}
          </div>

          {/* COVER — the title picture, shown full-width at the top of the post
              and as the card thumbnail. It is also the social share image, so
              the aspect ratio matters. */}
          <div className="anl-f">
            <span>Title picture</span>
            {form.coverImage ? (
              <div className="anl-cover">
                <img src={mediaUrl(form.coverImage)} alt="" />
                <button className="anl-btn anl-danger" onClick={() => set('coverImage', '')}>Remove</button>
              </div>
            ) : (
              <button className="anl-btn" onClick={() => coverInput.current?.click()}>
                Upload title picture
              </button>
            )}
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={pickCover} />
            <div className="anl-hint">
              Best at <strong>1200×630</strong> — this is also the picture WhatsApp
              and Facebook show when someone shares the post. Max 4&nbsp;MB.
            </div>
          </div>

          <div className="anl-f">
            <span>The post</span>
            <NewsletterRichText
              value={form.body}
              onChange={v => set('body', v)}
              onUpload={upload}
              placeholder="Write the update here. Use the image button to drop a picture right where it belongs — it asks whether to put it left, right or full width."
            />
            <div className="anl-hint">
              🖼 <strong>Pictures go inside the writing.</strong> Put the cursor where you
              want one, press the image button in the toolbar, and choose{' '}
              <strong>right</strong>, <strong>left</strong> or <strong>full width</strong> —
              the text wraps around it. On a phone every picture becomes full width
              automatically.
            </div>
          </div>

          {current && (
            <div className="anl-danger-zone">
              <button className="anl-btn anl-danger" onClick={() => remove(current.id)}>
                Delete this post
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  return (
    <div className="anl">
      <div className="anl-bar">
        <h1 className="anl-h1">📰 Newsletter</h1>
        <button className="anl-btn anl-primary" onClick={openNew}>+ New post</button>
      </div>

      {msg && <div className="anl-msg">{msg}</div>}
      {err && <div className="anl-msg anl-err">{err}</div>}

      {loading ? <div className="anl-note">Loading…</div>
        : posts.length === 0 ? <div className="anl-note">No posts yet. Write the first one.</div>
        : (
          <div className="anl-list">
            {posts.map(p => (
              <div key={p.id} className="anl-item">
                {p.coverImage
                  ? <img className="anl-thumb" src={mediaUrl(p.coverImage)} alt="" />
                  : <div className="anl-thumb anl-thumb-empty">📰</div>}

                <div className="anl-item-body">
                  <div className="anl-item-top">
                    <strong className="anl-item-title">{p.title || '(untitled)'}</strong>
                    <span className={`anl-tag ${p.published ? 'is-live' : 'is-draft'}`}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                    {p.pinned && <span className="anl-tag is-pin">📌</span>}
                    <span className="anl-tag">{AUDIENCES.find(a => a.v === p.audience)?.label || p.audience}</span>
                  </div>

                  {/* The numbers. DISLIKES APPEAR ONLY HERE — no reader endpoint
                      ever returns them. A low like count with a high dislike
                      count is the signal worth acting on. */}
                  <div className="anl-stats">
                    <span>👁 {p.views || 0}</span>
                    <span className="anl-up">👍 {p.likeCount || 0}</span>
                    <span className="anl-down">👎 {p.dislikeCount || 0}</span>
                    {p.publishedAt && <span>· {new Date(p.publishedAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="anl-item-actions">
                  <button className="anl-btn" onClick={() => openEdit(p.id)}>Edit</button>
                  {p.published
                    ? <button className="anl-btn" onClick={() => unpublish(p.id)}>Unpublish</button>
                    : <button className="anl-btn anl-go" onClick={() => publish(p.id)}>Publish</button>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
