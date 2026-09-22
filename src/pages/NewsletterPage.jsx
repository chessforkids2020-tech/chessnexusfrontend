// pages/NewsletterPage.jsx
//
// THE NEWSLETTER — Chess Nexus news, read inside the app.
//
// Public: no login needed, so a shared link works for anyone. A signed-in
// reader additionally sees posts aimed at their account type (coach news for
// coaches, player news for students); a logged-out visitor sees general news.
//
// This is the LIST. One post's full text lives in NewsletterPostPage.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../api';
import SEO from '../components/SEO';
import './Newsletter.css';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function NewsletterPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/api/newsletter')
      .then(r => { if (alive) setPosts(r.data?.posts || []); })
      .catch(() => { if (alive) setErr('Could not load the newsletter.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const pinned = posts.filter(p => p.pinned);
  const rest = posts.filter(p => !p.pinned);

  return (
    <div className="nl-wrap">
      <SEO
        title="Newsletter — Chess Nexus news & new features"
        description="What's new on Chess Nexus: new features for coaches and players, tournaments, and product news."
      />

      <header className="nl-head">
        <h1 className="nl-h1">📰 Newsletter</h1>
        <p className="nl-lead">
          New features, tournaments and everything happening on Chess Nexus.
        </p>
      </header>

      {loading && <div className="nl-note">Loading…</div>}
      {err && <div className="nl-note nl-note-err">{err}</div>}

      {!loading && !err && posts.length === 0 && (
        <div className="nl-empty">
          <div className="nl-empty-icon">📭</div>
          <p>No posts yet — check back soon.</p>
        </div>
      )}

      {/* Pinned first: a major announcement stays at the top while it still
          matters rather than sinking under routine posts. */}
      {pinned.length > 0 && (
        <div className="nl-grid">
          {pinned.map(p => <PostCard key={p.id} post={p} pinned />)}
        </div>
      )}

      {rest.length > 0 && (
        <>
          {pinned.length > 0 && <h2 className="nl-section">Earlier posts</h2>}
          <div className="nl-grid">
            {rest.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        </>
      )}
    </div>
  );
}

function PostCard({ post, pinned }) {
  return (
    <Link to={`/newsletter/${post.id}`} className={`nl-card ${pinned ? 'is-pinned' : ''}`}>
      {post.coverImage
        ? <img className="nl-card-img" src={resolveApiAssetUrl(post.coverImage)} alt="" loading="lazy" />
        : <div className="nl-card-img nl-card-img-empty" aria-hidden="true">📰</div>}

      <div className="nl-card-body">
        <div className="nl-card-meta">
          <span className="nl-chip">{post.topic || 'News'}</span>
          {pinned && <span className="nl-chip nl-chip-pin">📌 Pinned</span>}
        </div>
        <h3 className="nl-card-title">{post.title}</h3>
        {post.summary && <p className="nl-card-sum">{post.summary}</p>}
        <div className="nl-card-foot">
          <span>{fmtDate(post.publishedAt)}</span>
          <span className="nl-card-stats">
            👁 {post.views || 0} · 👍 {post.likeCount || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
