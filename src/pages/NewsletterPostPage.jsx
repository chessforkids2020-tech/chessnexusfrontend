// pages/NewsletterPostPage.jsx
//
// ONE NEWSLETTER POST, laid out as asked:
//   cover picture → title → posted date / views / likes → react + share →
//   the body.
//
// React and share sit ABOVE the body deliberately: a reader who wants to pass
// a post on should not have to scroll a long article to find the button.
//
// Public: readable with no account. REACTING needs one (a vote has to belong to
// somebody), so the buttons prompt a logged-out reader to sign in rather than
// failing silently.
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import './Newsletter.css';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function NewsletterPostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/api/newsletter/${id}`)
      .then(r => { if (alive) setPost(r.data?.post || null); })
      .catch(e => { if (alive) setErr(e.response?.data?.message || 'Could not open that post.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // Reacting is a toggle: sending the reaction you already chose clears it, so
  // a mis-tap is undoable without hunting for an "undo".
  const react = useCallback(async (wanted) => {
    if (!user) return;
    setBusy(true);
    const next = post?.myReaction === wanted ? 'none' : wanted;
    try {
      const r = await api.post(`/api/newsletter/${id}/react`, { reaction: next });
      setPost(p => ({ ...p, likeCount: r.data.likeCount, myReaction: r.data.myReaction }));
    } catch { /* leave the UI as it was */ }
    finally { setBusy(false); }
  }, [id, post?.myReaction, user]);

  if (loading) return <div className="nl-wrap"><div className="nl-note">Loading…</div></div>;
  if (err || !post) {
    return (
      <div className="nl-wrap">
        <div className="nl-note nl-note-err">{err || 'Post not found.'}</div>
        <Link to="/newsletter" className="nl-back">← All posts</Link>
      </div>
    );
  }

  // Share links point at the API's /share/:id, NOT this page. That route serves
  // crawlers a real HTML card (title, description, cover image) and redirects
  // humans straight here — without it WhatsApp and Facebook show a bare, empty
  // preview, because they never run the JavaScript that writes our meta tags.
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const shareUrl = `${apiBase}/api/newsletter/share/${post.id}`;
  const shareText = `${post.title} — Chess Nexus`;
  const enc = encodeURIComponent;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link:', shareUrl);
    }
  };

  return (
    <div className="nl-wrap nl-post">
      <SEO
        title={`${post.title} — Chess Nexus Newsletter`}
        description={post.summary || post.title}
        ogImage={post.coverImage || undefined}
      />

      <Link to="/newsletter" className="nl-back">← All posts</Link>

      {/* 1. TITLE PICTURE, full width at the very top. */}
      {post.coverImage && (
        <img className="nl-cover" src={post.coverImage} alt="" />
      )}

      {/* 2. Title. */}
      <div className="nl-chip nl-chip-solo">{post.topic || 'News'}</div>
      <h1 className="nl-title">{post.title}</h1>

      {/* 3. Posted date, views, likes — the strip under the title. */}
      <div className="nl-stats">
        <span>🗓 {fmtDate(post.publishedAt)}</span>
        <span>👁 {post.views || 0} {post.views === 1 ? 'view' : 'views'}</span>
        <span>👍 {post.likeCount || 0} {post.likeCount === 1 ? 'like' : 'likes'}</span>
      </div>

      {post.summary && <p className="nl-summary">{post.summary}</p>}

      {/* 4. The body. Sanitised on the SERVER before storage (see
          helpers/newsletterHtml.js), so what arrives here is already safe —
          scripts, iframes, event handlers and javascript: hrefs are gone. */}
      {post.body && (
        <div className="nl-body" dangerouslySetInnerHTML={{ __html: post.body }} />
      )}

      {/* 5. Legacy trailing pictures.
          Images now live INSIDE the body, inserted at the cursor and floated
          left/right/full — a screenshot is only useful beside the sentence
          describing it. This block is kept so any post written before that
          change still shows its pictures instead of silently losing them; new
          posts leave `images` empty and it renders nothing. */}
      {(post.images || []).length > 0 && (
        <div className="nl-images">
          {post.images.map((im, i) => (
            <figure key={i} className="nl-figure">
              <img src={im.url} alt={im.caption || ''} loading="lazy" />
              {im.caption && <figcaption>{im.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {/* 6. React — at the FOOT, after the article. The LIKE count is public; the dislike count is never sent to
          a reader — only the admin sees it — so a feature that is fine is not
          publicly dragged down by a handful of dislikes. The reader still sees
          their OWN dislike highlighted, or the button feels broken. */}
      <div className="nl-react">
        <span className="nl-react-lead">Was this useful?</span>
        <button
          className={`nl-react-btn ${post.myReaction === 'like' ? 'is-on' : ''}`}
          onClick={() => react('like')}
          disabled={busy || !user}
          title={user ? 'Like this post' : 'Log in to react'}
        >
          👍 <span>{post.likeCount || 0}</span>
        </button>
        <button
          className={`nl-react-btn nl-react-down ${post.myReaction === 'dislike' ? 'is-on' : ''}`}
          onClick={() => react('dislike')}
          disabled={busy || !user}
          title={user ? 'Not useful' : 'Log in to react'}
        >
          👎
        </button>
        {!user && (
          <Link to="/login" className="nl-react-login">Log in to react</Link>
        )}
      </div>

      {/* 7. Share. WhatsApp leads deliberately — it is where coaches actually
          pass things on. */}
      <div className="nl-share">
        <span className="nl-share-lead">Share this</span>
        <div className="nl-share-btns">
          <a className="nl-share-btn is-wa"
             href={`https://wa.me/?text=${enc(`${shareText}\n${shareUrl}`)}`}
             target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="nl-share-btn is-x"
             href={`https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(shareUrl)}`}
             target="_blank" rel="noopener noreferrer">X</a>
          <a className="nl-share-btn is-fb"
             href={`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`}
             target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="nl-share-btn is-in"
             href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`}
             target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <button className={`nl-share-btn is-copy ${copied ? 'is-done' : ''}`} onClick={copyLink}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
