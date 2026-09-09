import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  COACH_VIDEO_GUIDES as GUIDES,
  coachVideoEmbedUrl as embedUrl,
  youtubeSubscribeUrl as subscribeUrl,
} from '../../data/coachVideoGuides';
import './CoachVideoGuides.css';

// pages/coach/CoachVideoGuides.jsx
//
// Walkthrough videos, played INSIDE Chess Nexus.
//
// Why embedded rather than a list of links: sending a coach to youtube.com in
// the middle of setting up their academy loses them to the sidebar of
// recommendations, and they may not come back to finish. Same reasoning the
// course player already uses for student video lessons — see
// components/StudentCourses.jsx.
//
// The guide list itself lives in data/coachVideoGuides.js, shared with the
// pre-onboarding prompt so the two screens cannot drift apart.

export default function CoachVideoGuides() {
  // Which guide is expanded. Only one plays at a time — two videos playing over
  // each other is the obvious failure of a page like this.
  const [openId, setOpenId] = useState(GUIDES.find(g => g.videoId)?.id || null);

  const anyReady = GUIDES.some(g => g.videoId);

  return (
    <div className="cvg-page">
      <div className="cvg-head">
        <div>
          <h1>🎬 Video guides</h1>
          <p className="cvg-sub">
            Short walkthroughs of how Chess Nexus works, played right here — no need
            to leave the app.
          </p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
      </div>

      {!anyReady && (
        <div className="cvg-empty">
          🎬 The walkthrough videos are being added. Check back shortly — in the
          meantime the <Link to="/help">Help Center</Link> answers most questions
          in writing.
        </div>
      )}

      <div className="cvg-list">
        {GUIDES.map((g, i) => {
          const isOpen = openId === g.id;
          const ready = !!g.videoId;
          return (
            <article className={`cvg-card ${isOpen && ready ? 'is-open' : ''}`} key={g.id}>
              <button
                type="button"
                className="cvg-card-head"
                onClick={() => ready && setOpenId(isOpen ? null : g.id)}
                aria-expanded={ready ? isOpen : undefined}
                disabled={!ready}
              >
                <span className="cvg-num">{i + 1}</span>
                <span className="cvg-card-text">
                  <span className="cvg-title">{g.title}</span>
                  <span className="cvg-blurb">{g.blurb}</span>
                  <span className="cvg-covers">
                    {g.covers.map(c => <span className="cvg-tag" key={c}>{c}</span>)}
                  </span>
                </span>
                <span className="cvg-action" aria-hidden="true">
                  {!ready ? 'Coming soon' : isOpen ? '▲' : '▶ Watch'}
                </span>
              </button>

              {ready && isOpen && (
                <div className="cvg-player">
                  <iframe
                    src={embedUrl(g.videoId)}
                    title={g.title}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Placed after the guides on purpose: ask someone to subscribe once they
          have actually watched something, not before. */}
      {subscribeUrl() && (
        <div className="cvg-subscribe">
          <div className="cvg-sub-text">
            <strong>More walkthroughs on YouTube</strong>
            <span>New guides land there first — subscribe and you will not miss them.</span>
          </div>
          <a
            className="cvg-sub-btn"
            href={subscribeUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ Subscribe
          </a>
        </div>
      )}

      <p className="cvg-foot">
        Still stuck after watching? Ask in <Link to="/help">the Help Center</Link>,
        or message the Nexus team in <Link to="/chat">your chat</Link> — we answer
        there.
      </p>
    </div>
  );
}
